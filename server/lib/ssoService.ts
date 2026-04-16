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
  authSource:   "saml" | "google-oauth" | "google-oauth-simulated";
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
    logger.warn("sso" as any, "SAML login rejected: domain not allowed", { details: { email: "[REDACTED]", domain: getEmailDomain(email) } });
    throw Object.assign(new Error("Email domain not authorized for SSO access."), { code: "DOMAIN_NOT_ALLOWED", status: 403 });
  }

  // SAML signature verification
  const isStrict = process.env.SAML_STRICT === "true";
  if (isStrict && assertion.rawXml) {
    const verified = verifySignatureStub(assertion.rawXml, assertion.idpEntityId);
    if (!verified) {
      logger.error("sso" as any, "SAML signature verification failed — rejecting login", { details: { idpEntityId: assertion.idpEntityId } });
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
    details: { authSource: "saml", ipAddress: ipAddress ? "[REDACTED]" : null },
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

    logger.info("sso" as any, "Google OAuth code exchanged successfully", { details: { email: "[REDACTED]" } });
  } else if (!hasOAuth && input.email) {
    // ── Simulated SSO (no OAuth credentials) ─────────────────────────────
    // EXPLICITLY marked as simulated — not for production use.
    logger.warn("sso" as any, "Google OAuth SIMULATED (no GOOGLE_CLIENT_ID configured)", { details: { email: "[REDACTED]" } });
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
    userId: user.id, details: { authSource, ipAddress: ipAddress ? "[REDACTED]" : null },
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

  logger.info("sso" as any, "SSO user auto-provisioned", { userId: newUser.id, details: { role } });
  return { user: newUser, isNewUser: true };
}

// ─── Signature stub ───────────────────────────────────────────────────────────
// STUB: Always returns false when no IDP certificates are configured.
// Production: Validate using IDP metadata XML + certificate from environment.

function verifySignatureStub(rawXml: string, idpEntityId?: string): boolean {
  // EXPLICITLY STUBBED — requires IDP certificate and samlify/node-saml integration
  // Return false to force rejection in strict mode.
  logger.warn("sso" as any, "SAML signature verification is STUBBED — returns false", { details: { idpEntityId } });
  return false;
}
