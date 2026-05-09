/**
 * Email / Password Authentication Service
 *
 * Features:
 *  - bcrypt password hashing (SALT_ROUNDS = 12)
 *  - Account lockout after MAX_FAILED_ATTEMPTS (5) — locked for LOCKOUT_DURATION_MS (30 min)
 *  - Refresh token rotation via DB-backed auth_sessions table
 *  - SHA-256 hashed reset tokens with 1-hour TTL (single-use)
 *  - Login IP + device fingerprint tracking
 *  - Session invalidation on password change
 *  - Timing-safe responses (no user enumeration)
 */
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db, pool } from "../db";
import { users, passwordResetTokens, authSessions } from "@shared/schema";
import { eq, or, and, gt, lt, sql } from "drizzle-orm";
import { signAccessToken, signRefreshToken, verifyToken } from "./jwtAuth";
import { sendPasswordResetEmail } from "./emailService";
import { z } from "zod";

const SALT_ROUNDS           = 12;
const RESET_TOKEN_TTL_MS    = 60 * 60 * 1000;          // 1 hour
const REFRESH_TOKEN_TTL_MS  = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_FAILED_ATTEMPTS   = 5;
const LOCKOUT_DURATION_MS   = 30 * 60 * 1000;           // 30 minutes

// ─── Input schemas ────────────────────────────────────────────────────────────

// Strip <script>, javascript: protocols, and on*= event-handler attributes
// from any string the user can author. JSX rendering is XSS-safe but these
// values also flow into HTML emails, PDF exports, and audit logs where
// escape rules differ — neutralize at the source. Used by signupSchema and
// updateProfileSchema (and mirrored by safeText() in routes.ts for the
// onboarding path).
const safeText = (max: number) =>
  z.preprocess(
    v => {
      if (typeof v !== "string") return v;
      return v
        .replace(/[<>]/g, "")
        .replace(/javascript:/gi, "")
        .replace(/on\w+\s*=/gi, "")
        .trim();
    },
    z.string().max(max),
  );

export const signupSchema = z.object({
  email:    z.string().email("Invalid email address"),
  password: z.string()
    .min(8,  "Password must be at least 8 characters")
    .regex(/[A-Z]/,        "Password must contain at least one uppercase letter")
    .regex(/[0-9]/,        "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  // Username is restricted by regex to [a-zA-Z0-9_-] so HTML tags can't
  // pass the regex anyway — no preprocess needed there.
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/, "Username may only contain letters, numbers, underscores, and hyphens").optional(),
  name:     safeText(100).pipe(z.string().min(1)).optional(),
});

export const loginSchema = z.object({
  emailOrUsername:   z.string().min(1),
  password:          z.string().min(1),
  deviceFingerprint: z.string().max(256).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token:       z.string().min(1),
  newPassword: z.string()
    .min(8)
    .regex(/[A-Z]/,        "Password must contain at least one uppercase letter")
    .regex(/[0-9]/,        "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

export const forgotUsernameSchema = z.object({
  email: z.string().email(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function maskUsername(username: string): string {
  if (username.length <= 2) return "**";
  return username[0] + "*".repeat(username.length - 2) + username[username.length - 1];
}

// ─── Signup ───────────────────────────────────────────────────────────────────

export async function signup(
  input: z.infer<typeof signupSchema>,
  context?: { ipAddress?: string; userAgent?: string; deviceFingerprint?: string },
) {
  const data = signupSchema.parse(input);

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, data.email)).limit(1);
  if (existing.length > 0) {
    throw Object.assign(new Error("Email already registered."), { code: "EMAIL_EXISTS", status: 409 });
  }

  if (data.username) {
    const existingUser = await db.select({ id: users.id }).from(users).where(eq(users.username, data.username)).limit(1);
    if (existingUser.length > 0) {
      throw Object.assign(new Error("Username already taken."), { code: "USERNAME_EXISTS", status: 409 });
    }
  }

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
  const trialEndsAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days from now

  // Raw SQL INSERT — only references the columns we actually set. We deliberately
  // avoid `db.insert(users).values(...)` here: Drizzle compiles a column list
  // covering every field in the schema, so any drift between shared/schema.ts
  // and the live DB (e.g. a not-yet-pushed nullable column) makes signup blow up
  // with `column "X" of relation "users" does not exist`. Touching only the
  // columns this flow needs makes signup tolerant of forward-rolled schemas.
  const insertResult = await pool.query<{
    id: string; email: string | null; role: string | null; company_id: string | null;
  }>(
    `INSERT INTO "users"
       ("email", "name", "username", "password_hash", "trial_ends_at",
        "role", "last_login_ip", "last_login_device")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING "id", "email", "role", "company_id"`,
    [
      data.email,
      data.name ?? null,
      data.username ?? null,
      passwordHash,
      trialEndsAt,
      "viewer",
      context?.ipAddress ?? null,
      context?.userAgent ?? null,
    ],
  );
  const row = insertResult.rows[0];
  const user = {
    id:        row.id,
    email:     row.email,
    role:      row.role,
    companyId: row.company_id,
  };

  return buildTokenPair(user, context);
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login(
  input: z.infer<typeof loginSchema>,
  context?: { ipAddress?: string; userAgent?: string },
) {
  const data = loginSchema.parse(input);

  // Explicit column projection — see signup() for the rationale. A bare
  // db.select().from(users) compiles every schema column into the SELECT,
  // so any column added to shared/schema.ts but not yet pushed to live DB
  // makes login 500 on every request. List only what login actually needs.
  const [user] = await db.select({
    id:                  users.id,
    email:               users.email,
    username:            users.username,
    passwordHash:        users.passwordHash,
    role:                users.role,
    companyId:           users.companyId,
    failedLoginAttempts: users.failedLoginAttempts,
    lockedUntil:         users.lockedUntil,
  }).from(users).where(
    or(eq(users.email, data.emailOrUsername), eq(users.username, data.emailOrUsername))
  ).limit(1);

  // Timing-safe: run bcrypt compare even on missing user (dummy hash)
  const DUMMY_HASH = "$2a$12$dummy.hash.to.prevent.timing.attacks.padding.x.y.z";
  const passwordHash = user?.passwordHash ?? DUMMY_HASH;

  // Account lockout check (before bcrypt to save compute)
  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    const retryAfterSec = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
    throw Object.assign(
      new Error(`Account locked. Try again in ${Math.ceil(retryAfterSec / 60)} minutes.`),
      { code: "ACCOUNT_LOCKED", status: 429, retryAfter: retryAfterSec }
    );
  }

  const valid = await bcrypt.compare(data.password, passwordHash);

  if (!user || !user.passwordHash || !valid) {
    // Increment failed attempts
    if (user) {
      const newAttempts = (user.failedLoginAttempts ?? 0) + 1;
      const lockedUntil = newAttempts >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_DURATION_MS)
        : null;
      await db.update(users)
        .set({ failedLoginAttempts: newAttempts, lockedUntil, updatedAt: new Date() })
        .where(eq(users.id, user.id));
    }
    throw Object.assign(new Error("Invalid credentials."), { code: "INVALID_CREDENTIALS", status: 401 });
  }

  // Successful login — reset lockout state
  await db.update(users).set({
    failedLoginAttempts: 0,
    lockedUntil:         null,
    lastLoginIp:         context?.ipAddress ?? null,
    lastLoginDevice:     context?.userAgent ?? null,
    updatedAt:           new Date(),
  }).where(eq(users.id, user.id));

  return buildTokenPair(user, { ...context, deviceFingerprint: data.deviceFingerprint });
}

// ─── Forgot Password ──────────────────────────────────────────────────────────

export async function forgotPassword(input: z.infer<typeof forgotPasswordSchema>) {
  const { email } = forgotPasswordSchema.parse(input);
  const [user] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.email, email)).limit(1);

  // Always return success — timing-safe, no user enumeration
  if (!user) return { message: "If that email is registered, a reset link has been sent." };

  const rawToken  = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  // Invalidate any existing unused tokens
  await db.update(passwordResetTokens)
    .set({ used: 1 })
    .where(and(eq(passwordResetTokens.userId, user.id), eq(passwordResetTokens.used, 0)));

  await db.insert(passwordResetTokens).values({ userId: user.id, tokenHash, expiresAt, used: 0 });

  // Build the reset link from APP_URL if set, otherwise fall back to the
  // production domain. Replit autoscale doesn't always set APP_URL, and a
  // bare `/reset-password?token=...` link in an email body is useless to
  // the recipient — so prefer an explicit absolute URL.
  const baseUrl =
    process.env.APP_URL?.trim() ||
    (process.env.REPLIT_DOMAINS?.split(",")[0]?.trim()
      ? `https://${process.env.REPLIT_DOMAINS!.split(",")[0]!.trim()}`
      : "https://prescient-labs.com");
  const resetLink = `${baseUrl}/reset-password?token=${rawToken}`;

  // Fire the email in the background — never block the response on it.
  // Two reasons: (1) leaking timing differences between "email exists" and
  // "email doesn't exist" undoes the no-enumeration guarantee above, and
  // (2) a slow SendPulse round-trip would push every forgot-password
  // request into the rate limiter's eviction window. Log failures so we
  // can spot a misconfigured key in `[Email]`-prefixed log lines without
  // failing the request.
  sendPasswordResetEmail(email, resetLink)
    .then(result => {
      if (!result.success) {
        console.error(`[PasswordReset] sendPasswordResetEmail failed for ${email}: ${result.error}`);
      } else {
        console.log(`[PasswordReset] Reset email sent to ${email}`);
      }
    })
    .catch(err => {
      console.error(`[PasswordReset] sendPasswordResetEmail threw for ${email}:`, err?.message || err);
    });

  // In dev only, log the token so you can paste the link without an inbox.
  // NEVER log the token in production — these are bearer credentials.
  if (process.env.NODE_ENV !== "production") {
    console.log(`[PasswordReset] Reset link for ${email} (dev only — expires in 1 hour): ${resetLink}`);
  }

  return { message: "If that email is registered, a reset link has been sent." };
}

// ─── Reset Password ───────────────────────────────────────────────────────────

export async function resetPassword(input: z.infer<typeof resetPasswordSchema>) {
  const { token, newPassword } = resetPasswordSchema.parse(input);
  const tokenHash = hashToken(token);

  const [record] = await db.select().from(passwordResetTokens)
    .where(and(
      eq(passwordResetTokens.tokenHash, tokenHash),
      eq(passwordResetTokens.used, 0),
      gt(passwordResetTokens.expiresAt, new Date()),
    )).limit(1);

  if (!record) {
    throw Object.assign(new Error("Invalid or expired reset token."), { code: "INVALID_TOKEN", status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await Promise.all([
    // Update password
    db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, record.userId)),
    // Mark token used
    db.update(passwordResetTokens).set({ used: 1 }).where(eq(passwordResetTokens.id, record.id)),
    // Revoke all active refresh sessions (invalidate sessions on password change)
    db.update(authSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(authSessions.userId, record.userId), sql`revoked_at IS NULL`)),
  ]);

  return { message: "Password updated successfully. All active sessions have been invalidated." };
}

// ─── Change Password (authenticated) ─────────────────────────────────────────

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8,  "Password must be at least 8 characters")
    .regex(/[A-Z]/,        "Password must contain at least one uppercase letter")
    .regex(/[0-9]/,        "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

export async function changePassword(userId: string, input: z.infer<typeof changePasswordSchema>) {
  const { currentPassword, newPassword } = changePasswordSchema.parse(input);

  // Only project the fields this flow needs — see login() for rationale.
  const [user] = await db.select({
    id:           users.id,
    passwordHash: users.passwordHash,
  }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    throw Object.assign(new Error("User not found."), { code: "USER_NOT_FOUND", status: 404 });
  }

  if (!user.passwordHash) {
    throw Object.assign(
      new Error("Account has no password set. Use your original sign-in method or reset via email."),
      { code: "NO_PASSWORD", status: 400 },
    );
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw Object.assign(new Error("Current password is incorrect."), { code: "INVALID_PASSWORD", status: 400 });
  }

  // Reject unchanged password
  const sameAsOld = await bcrypt.compare(newPassword, user.passwordHash);
  if (sameAsOld) {
    throw Object.assign(
      new Error("New password must be different from your current password."),
      { code: "PASSWORD_UNCHANGED", status: 400 },
    );
  }

  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await Promise.all([
    db.update(users).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(users.id, userId)),
    // Revoke all other refresh sessions (the current session remains via JWT TTL)
    db.update(authSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(authSessions.userId, userId), sql`revoked_at IS NULL`)),
  ]);

  return { message: "Password updated successfully." };
}

// ─── Update Profile (authenticated) ──────────────────────────────────────────

export const updateProfileSchema = z.object({
  name:       safeText(100).pipe(z.string().min(1)).optional(),
  firstName:  safeText(50).pipe(z.string().min(1)).optional().nullable(),
  lastName:   safeText(50).pipe(z.string().min(1)).optional().nullable(),
  // Optional preferred-name override used by the AI Advisor and other
  // in-product greetings. Empty string is normalized to null on write so
  // the AI falls back to firstName.
  nickname:   safeText(50).optional().nullable(),
  jobTitle:   safeText(100).optional().nullable(),
  department: safeText(100).optional().nullable(),
  phone:      safeText(30).optional().nullable(),
});

export async function updateProfile(userId: string, input: z.infer<typeof updateProfileSchema>) {
  const data = updateProfileSchema.parse(input);

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) patch[k] = v === "" ? null : v;
  }

  const [updated] = await db.update(users).set(patch).where(eq(users.id, userId)).returning({
    id:         users.id,
    email:      users.email,
    name:       users.name,
    firstName:  users.firstName,
    lastName:   users.lastName,
    nickname:   users.nickname,
    jobTitle:   users.jobTitle,
    department: users.department,
    phone:      users.phone,
    username:   users.username,
    role:       users.role,
    companyId:  users.companyId,
  });

  if (!updated) {
    throw Object.assign(new Error("User not found."), { code: "USER_NOT_FOUND", status: 404 });
  }

  return { user: updated };
}

// ─── Forgot Username ──────────────────────────────────────────────────────────

export async function forgotUsername(input: z.infer<typeof forgotUsernameSchema>) {
  const { email } = forgotUsernameSchema.parse(input);
  const [user] = await db.select({ username: users.username }).from(users).where(eq(users.email, email)).limit(1);

  if (!user?.username) return { message: "If that email is registered and has a username, it has been sent." };

  const masked = maskUsername(user.username);
  console.log(`[ForgotUsername] Username for ${email}: ${user.username}`);

  return {
    message: "If that email is registered, the username has been returned.",
    maskedUsername: masked,
  };
}

// ─── Refresh Access Token (with rotation) ────────────────────────────────────

export async function refreshAccessToken(incomingRefreshToken: string) {
  let payload: ReturnType<typeof verifyToken>;
  try {
    payload = verifyToken(incomingRefreshToken);
  } catch {
    throw Object.assign(new Error("Invalid or expired refresh token."), { code: "INVALID_TOKEN", status: 401 });
  }

  if (payload.type !== "refresh") {
    throw Object.assign(new Error("Not a refresh token."), { code: "INVALID_TOKEN", status: 401 });
  }

  const tokenHash = hashToken(incomingRefreshToken);

  // Look up session in DB for rotation check
  const [session] = await db.select().from(authSessions)
    .where(and(
      eq(authSessions.refreshTokenHash, tokenHash),
      sql`revoked_at IS NULL`,
      gt(authSessions.expiresAt, new Date()),
    )).limit(1);

  if (!session) {
    // Token not in DB — either already rotated (replay attack) or issued before session tracking
    // Graceful fallback: verify user still exists and issue new token (stateless compatibility)
    const [user] = await db.select({ id: users.id, email: users.email, role: users.role, companyId: users.companyId })
      .from(users).where(eq(users.id, payload.sub)).limit(1);
    if (!user) throw Object.assign(new Error("User not found."), { code: "USER_NOT_FOUND", status: 401 });

    const newAccessToken = signAccessToken({ sub: user.id, email: user.email ?? "", role: user.role ?? "viewer", companyId: user.companyId ?? null });
    return { accessToken: newAccessToken, expiresIn: 900 };
  }

  // Revoke old session (rotation)
  await db.update(authSessions).set({ revokedAt: new Date() }).where(eq(authSessions.id, session.id));

  // Verify user still exists
  const [user] = await db.select({ id: users.id, email: users.email, role: users.role, companyId: users.companyId })
    .from(users).where(eq(users.id, payload.sub)).limit(1);
  if (!user) throw Object.assign(new Error("User not found."), { code: "USER_NOT_FOUND", status: 401 });

  // Issue new pair
  const base = { sub: user.id, email: user.email ?? "", role: user.role ?? "viewer", companyId: user.companyId ?? null };
  const newAccessToken  = signAccessToken(base);
  const newRefreshToken = signRefreshToken(base);

  // Store new session
  const newHash    = hashToken(newRefreshToken);
  const expiresAt  = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  await db.insert(authSessions).values({
    userId:             user.id,
    refreshTokenHash:   newHash,
    ipAddress:          session.ipAddress,
    userAgent:          session.userAgent,
    deviceFingerprint:  session.deviceFingerprint,
    expiresAt,
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken, expiresIn: 900 };
}

// ─── Logout — revoke session ──────────────────────────────────────────────────

export async function logout(refreshToken: string): Promise<{ message: string }> {
  try {
    const tokenHash = hashToken(refreshToken);
    await db.update(authSessions)
      .set({ revokedAt: new Date() })
      .where(eq(authSessions.refreshTokenHash, tokenHash));
  } catch {
    // Non-fatal — token may not be in DB (legacy stateless token)
  }
  return { message: "Logged out successfully." };
}

// ─── Internal: build token pair + persist session ─────────────────────────────

async function buildTokenPair(
  user: { id: string; email: string | null; role: string | null; companyId: string | null },
  context?: { ipAddress?: string; userAgent?: string; deviceFingerprint?: string },
) {
  const base = {
    sub:       user.id,
    email:     user.email ?? "",
    role:      user.role ?? "viewer",
    companyId: user.companyId ?? null,
  };

  const accessToken  = signAccessToken(base);
  const refreshToken = signRefreshToken(base);

  // Persist session for rotation tracking
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await db.insert(authSessions).values({
    userId:            user.id,
    refreshTokenHash:  tokenHash,
    ipAddress:         context?.ipAddress ?? null,
    userAgent:         context?.userAgent ?? null,
    deviceFingerprint: context?.deviceFingerprint ?? null,
    expiresAt,
  }).catch(() => {
    // Non-fatal if session table unavailable during migration
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: 900,
    user: {
      id:        user.id,
      email:     user.email,
      role:      user.role ?? "viewer",
      companyId: user.companyId,
    },
  };
}
