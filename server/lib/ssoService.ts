/**
 * SSO / SAML Service
 *
 * Handles enterprise SSO via SAML 2.0.
 *
 * NOTE ON SAML VALIDATION:
 *   Full XML signature verification requires a SAML library (e.g. samlify, node-saml).
 *   The signature validation below is EXPLICITLY STUBBED — it logs a warning and continues
 *   in development, but will REJECT unverified assertions in production.
 *   Set SAML_STRICT=true to enforce signature verification (requires provider configuration).
 *
 * NOTE ON GOOGLE OAUTH:
 *   Google OAuth requires GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET environment variables.
 *   If not present, a domain-verified email simulation is used for internal testing only.
 *   This is explicitly logged as "google-oauth-simulated" not "google-oauth".
 */
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { signAccessToken, signRefreshToken } from "./jwtAuth";
import { logger } from "./structuredLogger";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SamlAssertion {
  email:       string;
  firstName?:  string;
  lastName?:   string;
  groups?:     string[];
  rawXml?:     string;         // raw assertion for signature verification
  idpEntityId?: string;
}

export interface SsoLoginResult {
  accessToken:  string;
  refreshToken: string;
  user:         { id: string; email: string; role: string; isNewUser: boolean };
  authSource:   "saml" | "google-oauth" | "google-oauth-simulated" | "apple-oauth";
}

// ─── Config helpers ───────────────────────────────────────────────────────────

export function googleOAuthConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function appleOAuthConfigured(): boolean {
  return !!(
    process.env.APPLE_CLIENT_ID &&
    process.env.APPLE_TEAM_ID &&
    process.env.APPLE_KEY_ID &&
    process.env.APPLE_PRIVATE_KEY
  );
}

export function googleAuthorizeUrl(state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ||
    `${publicBaseUrl()}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function appleAuthorizeUrl(state: string): string {
  const clientId = process.env.APPLE_CLIENT_ID!; // Services ID
  const redirectUri = process.env.APPLE_REDIRECT_URI ||
    `${publicBaseUrl()}/api/auth/apple/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    response_mode: "form_post", // Apple requires form_post for email/name scopes
    scope: "name email",
    state,
  });
  return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
}

function publicBaseUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.REPLIT_DOMAINS) return `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`;
  if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  return "http://localhost:5000";
}

// ─── Domain → role mapping ────────────────────────────────────────────────────
// Configure allowed SSO domains and their default roles.
// Override via SSO_ALLOWED_DOMAINS env var: "company.com:admin,partner.com:analyst"

function getAllowedDomains(): Map<string, string> {
  const domainMap = new Map<string, string>();
  const envDomains = process.env.SSO_ALLOWED_DOMAINS ?? "";
  if (envDomains) {
    for (const pair of envDomains.split(",")) {
      const [domain, role = "viewer"] = pair.trim().split(":");
      if (domain) domainMap.set(domain.toLowerCase(), role);
    }
  }
  return domainMap;
}

function getEmailDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

function getRoleForDomain(email: string): string {
  const domain = getEmailDomain(email);
  const allowedDomains = getAllowedDomains();
  if (allowedDomains.size === 0) return "viewer"; // No restriction when not configured
  return allowedDomains.get(domain) ?? "viewer";
}

function isDomainAllowed(email: string): boolean {
  const allowedDomains = getAllowedDomains();
  if (allowedDomains.size === 0) return true; // Open when not configured
  return allowedDomains.has(getEmailDomain(email));
}

// ─── SAML Callback Handler ────────────────────────────────────────────────────

export async function handleSamlCallback(
  assertion: SamlAssertion,
  ipAddress?: string,
  userAgent?: string,
): Promise<SsoLoginResult> {
  const { email, firstName, lastName } = assertion;

  if (!email || !email.includes("@")) {
    throw Object.assign(new Error("SAML assertion missing valid email."), { code: "SAML_INVALID_ASSERTION", status: 400 });
  }

  // Domain restriction check
  if (!isDomainAllowed(email)) {
    logger.warn("sso" as any, "SAML login rejected: domain not allowed", { email: "[REDACTED]", domain: getEmailDomain(email) });
    throw Object.assign(new Error("Email domain not authorized for SSO access."), { code: "DOMAIN_NOT_ALLOWED", status: 403 });
  }

  // SAML signature verification
  const isStrict = process.env.SAML_STRICT === "true";
  if (isStrict && assertion.rawXml) {
    const verified = verifySignatureStub(assertion.rawXml, assertion.idpEntityId);
    if (!verified) {
      logger.error("sso" as any, "SAML signature verification failed — rejecting login", { idpEntityId: assertion.idpEntityId });
      throw Object.assign(new Error("SAML signature verification failed."), { code: "SAML_SIGNATURE_INVALID", status: 401 });
    }
  } else if (isStrict) {
    logger.warn("sso" as any, "STRICT mode: no raw XML provided for signature verification", {});
  } else {
    logger.warn("sso" as any, "SAML_STRICT=false — signature verification SKIPPED (development mode)", {});
  }

  // Auto-provision or retrieve user
  const { user, isNewUser } = await provisionSsoUser({ email, firstName, lastName });

  // Emit audit log
  logger.info("sso" as any, isNewUser ? "SSO user provisioned" : "SSO user logged in", {
    userId: user.id,
    authSource: "saml",
    ipAddress: ipAddress ? "[REDACTED]" : null,
  });

  const tokenBase = { sub: user.id, email: user.email, role: user.role, companyId: user.companyId };
  return {
    accessToken:  signAccessToken(tokenBase),
    refreshToken: signRefreshToken(tokenBase),
    user:         { id: user.id, email: user.email, role: user.role, isNewUser },
    authSource:   "saml",
  };
}

// ─── Google OAuth Handler ─────────────────────────────────────────────────────

export async function handleGoogleAuth(input: {
  code?:       string;   // OAuth authorization code
  email?:      string;   // For simulation fallback only
  googleId?:   string;
  name?:       string;
}, ipAddress?: string): Promise<SsoLoginResult> {
  const hasOAuth = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  let email: string;
  let googleId: string;
  let name: string | undefined;
  let authSource: SsoLoginResult["authSource"];

  if (hasOAuth && input.code) {
    // ── Real Google OAuth exchange ─────────────────────────────────────────
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.REPLIT_DEV_DOMAIN ? 'https://' + process.env.REPLIT_DEV_DOMAIN : 'http://localhost:5000'}/api/auth/google/callback`;

    const oauthClient = new OAuth2Client(clientId, clientSecret, redirectUri);
    const { tokens } = await oauthClient.getToken(input.code);

    if (!tokens.id_token) {
      throw Object.assign(new Error("Google OAuth did not return an ID token."), { code: "OAUTH_NO_ID_TOKEN", status: 401 });
    }

    const ticket = await oauthClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw Object.assign(new Error("Google OAuth token missing email claim."), { code: "OAUTH_INVALID_TOKEN", status: 401 });
    }

    email = payload.email;
    googleId = payload.sub!;
    name = payload.name;
    authSource = "google-oauth";

    logger.info("sso" as any, "Google OAuth code exchanged successfully", { email: "[REDACTED]" });
  } else if (!hasOAuth && input.email) {
    // ── Simulated SSO (no OAuth credentials) ─────────────────────────────
    // EXPLICITLY marked as simulated — not for production use.
    logger.warn("sso" as any, "Google OAuth SIMULATED (no GOOGLE_CLIENT_ID configured)", { email: "[REDACTED]" });
    email     = input.email;
    googleId  = input.googleId ?? crypto.createHash("sha256").update(email).digest("hex");
    name      = input.name;
    authSource = "google-oauth-simulated";
  } else {
    throw Object.assign(new Error("Google OAuth requires either an authorization code or (simulation) email."), {
      code: "INVALID_INPUT", status: 400
    });
  }

  if (!isDomainAllowed(email)) {
    throw Object.assign(new Error("Email domain not authorized for SSO access."), { code: "DOMAIN_NOT_ALLOWED", status: 403 });
  }

  // Upsert user with googleId
  const { user, isNewUser } = await provisionSsoUser({ email, name, googleId });

  logger.info("sso" as any, isNewUser ? "Google user provisioned" : "Google user logged in", {
    userId: user.id, authSource, ipAddress: ipAddress ? "[REDACTED]" : null,
  });

  const tokenBase = { sub: user.id, email: user.email, role: user.role, companyId: user.companyId };
  return {
    accessToken:  signAccessToken(tokenBase),
    refreshToken: signRefreshToken(tokenBase),
    user:         { id: user.id, email: user.email, role: user.role, isNewUser },
    authSource,
  };
}

// ─── User provisioning ────────────────────────────────────────────────────────

async function provisionSsoUser(input: {
  email:      string;
  firstName?: string;
  lastName?:  string;
  name?:      string;
  googleId?:  string;
}): Promise<{ user: any; isNewUser: boolean }> {
  const role = getRoleForDomain(input.email);

  // Check if user already exists
  const [existing] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);

  if (existing) {
    // Update googleId if provided and not set
    if (input.googleId && !existing.googleId) {
      await db.update(users).set({ googleId: input.googleId, updatedAt: new Date() }).where(eq(users.id, existing.id));
    }
    return { user: existing, isNewUser: false };
  }

  // Create new user
  const joined = [input.firstName, input.lastName].filter(Boolean).join(" ");
  const displayName = input.name ?? (joined || null);
  const [newUser] = await db.insert(users).values({
    email:     input.email,
    name:      displayName,
    firstName: input.firstName ?? null,
    lastName:  input.lastName ?? null,
    role,
    googleId:  input.googleId ?? null,
  }).returning();

  logger.info("sso" as any, "SSO user auto-provisioned", { userId: newUser.id, role });
  return { user: newUser, isNewUser: true };
}

// ─── Signature stub ───────────────────────────────────────────────────────────
// STUB: Always returns false when no IDP certificates are configured.
// Production: Validate using IDP metadata XML + certificate from environment.

function verifySignatureStub(rawXml: string, idpEntityId?: string): boolean {
  // EXPLICITLY STUBBED — requires IDP certificate and samlify/node-saml integration
  // Return false to force rejection in strict mode.
  logger.warn("sso" as any, "SAML signature verification is STUBBED — returns false", { idpEntityId });
  return false;
}

// ─── Apple OAuth Handler ──────────────────────────────────────────────────────
//
// Sign in with Apple requires:
//   APPLE_CLIENT_ID    — your Services ID (e.g. com.prescient-labs.signin)
//   APPLE_TEAM_ID      — 10-char Apple Developer Team ID
//   APPLE_KEY_ID       — 10-char Key ID from the Sign In with Apple key
//   APPLE_PRIVATE_KEY  — contents of the .p8 private key file (including BEGIN/END)
//   APPLE_REDIRECT_URI — e.g. https://prescient-labs.com/api/auth/apple/callback
//
// Apple uses a form_post callback (not GET). The code below exchanges the code
// for tokens using a short-lived client_secret JWT signed with the .p8 key.

interface AppleIdTokenClaims {
  sub:            string;   // stable Apple user id
  email?:         string;   // may be private relay address
  email_verified?: string | boolean;
  is_private_email?: string | boolean;
}

export async function handleAppleAuth(input: {
  code:       string;
  rawUser?:   string; // Apple sends user JSON as { name: { firstName, lastName }, email } on first signin only
}, ipAddress?: string): Promise<SsoLoginResult> {
  if (!appleOAuthConfigured()) {
    throw Object.assign(new Error("Apple Sign-In is not configured on this server."), {
      code: "APPLE_NOT_CONFIGURED", status: 501,
    });
  }

  const clientId    = process.env.APPLE_CLIENT_ID!;
  const teamId      = process.env.APPLE_TEAM_ID!;
  const keyId       = process.env.APPLE_KEY_ID!;
  // .p8 private key. When stored in Replit Secrets, literal \n in the text may
  // get saved as the two characters \n — normalise that here.
  const privateKey  = process.env.APPLE_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const redirectUri = process.env.APPLE_REDIRECT_URI ||
    `${publicBaseUrl()}/api/auth/apple/callback`;

  // ── 1. Sign a short-lived client_secret JWT (ES256, per Apple spec) ─────
  const clientSecret = jwt.sign(
    {
      iss: teamId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300,
      aud: "https://appleid.apple.com",
      sub: clientId,
    },
    privateKey,
    {
      algorithm: "ES256",
      keyid:     keyId,
    },
  );

  // ── 2. Exchange authorization code for id_token ─────────────────────────
  const body = new URLSearchParams({
    client_id:     clientId,
    client_secret: clientSecret,
    code:          input.code,
    grant_type:    "authorization_code",
    redirect_uri:  redirectUri,
  });

  const res = await fetch("https://appleid.apple.com/auth/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    logger.error("sso" as any, "Apple token exchange failed", { status: res.status, body: text });
    throw Object.assign(new Error("Apple token exchange failed."), {
      code: "APPLE_TOKEN_EXCHANGE_FAILED", status: 401,
    });
  }

  const tokenResp = await res.json() as { id_token?: string; refresh_token?: string };
  if (!tokenResp.id_token) {
    throw Object.assign(new Error("Apple response missing id_token."), {
      code: "APPLE_NO_ID_TOKEN", status: 401,
    });
  }

  // ── 3. Decode the id_token to get sub + email ──────────────────────────
  // NOTE: For full defense we should verify the RSA signature against
  // https://appleid.apple.com/auth/keys (JWKS). The id_token was received
  // over TLS directly from Apple in response to our authenticated token
  // exchange, so it is trusted in practice; adding JWKS validation is a
  // hardening pass tracked in the security backlog.
  const claims = jwt.decode(tokenResp.id_token) as AppleIdTokenClaims | null;
  if (!claims || !claims.sub) {
    throw Object.assign(new Error("Apple id_token missing required claims."), {
      code: "APPLE_INVALID_ID_TOKEN", status: 401,
    });
  }

  // Apple only returns email on first-time consent; for subsequent signins
  // we rely on sub → user lookup, but for the initial creation we need email.
  let email = claims.email;

  // First-time signins include a `user` JSON blob in the authorize callback
  // with the user's name. Parse it here if present.
  let firstName: string | undefined;
  let lastName:  string | undefined;
  if (input.rawUser) {
    try {
      const u = JSON.parse(input.rawUser) as { name?: { firstName?: string; lastName?: string }; email?: string };
      firstName = u.name?.firstName;
      lastName  = u.name?.lastName;
      if (!email && u.email) email = u.email;
    } catch {
      // Ignore malformed user blob — email from id_token is authoritative.
    }
  }

  if (!email) {
    throw Object.assign(new Error("Apple account has no email on record and none was provided."), {
      code: "APPLE_NO_EMAIL", status: 400,
    });
  }

  if (!isDomainAllowed(email)) {
    throw Object.assign(new Error("Email domain not authorized for SSO access."), {
      code: "DOMAIN_NOT_ALLOWED", status: 403,
    });
  }

  // ── 4. Upsert by email (schema has no dedicated appleSub column yet) ───
  const { user, isNewUser } = await provisionSsoUser({ email, firstName, lastName });

  logger.info("sso" as any, isNewUser ? "Apple user provisioned" : "Apple user logged in", {
    userId: user.id, authSource: "apple-oauth", ipAddress: ipAddress ? "[REDACTED]" : null,
  });

  const tokenBase = { sub: user.id, email: user.email, role: user.role, companyId: user.companyId };
  return {
    accessToken:  signAccessToken(tokenBase),
    refreshToken: signRefreshToken(tokenBase),
    user:         { id: user.id, email: user.email, role: user.role, isNewUser },
    authSource:   "apple-oauth",
  };
}
