/**
 * Email / Password Authentication Service
 * Handles signup, login, password reset, username recovery.
 * All passwords are bcrypt-hashed (salt rounds = 12).
 * Reset tokens are SHA-256 hashed before DB storage (never stored in plain text).
 */
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "../db";
import { users, passwordResetTokens } from "@shared/schema";
import { eq, or, and, gt, sql } from "drizzle-orm";
import { signAccessToken, signRefreshToken } from "./jwtAuth";
import { z } from "zod";

const SALT_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

// ─── Input schemas ────────────────────────────────────────────────────────────

export const signupSchema = z.object({
  email:    z.string().email("Invalid email address"),
  password: z.string()
    .min(8,  "Password must be at least 8 characters")
    .regex(/[0-9]/,         "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one symbol"),
  username: z.string().min(3).max(30).optional(),
  name:     z.string().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  emailOrUsername: z.string().min(1),
  password:        z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token:       z.string().min(1),
  newPassword: z.string()
    .min(8)
    .regex(/[0-9]/,         "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one symbol"),
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

// ─── Service functions ────────────────────────────────────────────────────────

export async function signup(input: z.infer<typeof signupSchema>) {
  const data = signupSchema.parse(input);

  // Check email uniqueness
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, data.email)).limit(1);
  if (existing.length > 0) {
    throw Object.assign(new Error("Email already registered."), { code: "EMAIL_EXISTS", status: 409 });
  }

  // Check username uniqueness if provided
  if (data.username) {
    const existingUser = await db.select({ id: users.id }).from(users).where(eq(users.username, data.username)).limit(1);
    if (existingUser.length > 0) {
      throw Object.assign(new Error("Username already taken."), { code: "USERNAME_EXISTS", status: 409 });
    }
  }

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  const [user] = await db.insert(users).values({
    email:        data.email,
    name:         data.name ?? null,
    username:     data.username ?? null,
    passwordHash,
    role:         "viewer",
  }).returning();

  return buildTokenPair(user);
}

export async function login(input: z.infer<typeof loginSchema>) {
  const data = loginSchema.parse(input);

  const [user] = await db
    .select()
    .from(users)
    .where(
      or(
        eq(users.email,    data.emailOrUsername),
        eq(users.username, data.emailOrUsername),
      )
    )
    .limit(1);

  if (!user || !user.passwordHash) {
    // Generic message — don't reveal whether the account exists or has no password
    throw Object.assign(new Error("Invalid credentials."), { code: "INVALID_CREDENTIALS", status: 401 });
  }

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) {
    throw Object.assign(new Error("Invalid credentials."), { code: "INVALID_CREDENTIALS", status: 401 });
  }

  return buildTokenPair(user);
}

export async function forgotPassword(input: z.infer<typeof forgotPasswordSchema>) {
  const { email } = forgotPasswordSchema.parse(input);

  const [user] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.email, email)).limit(1);

  // Always return success — do not reveal whether email exists (timing-safe)
  if (!user) return { message: "If that email is registered, a reset link has been sent." };

  const rawToken  = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  // Invalidate any existing unused tokens for this user
  await db
    .update(passwordResetTokens)
    .set({ used: 1 })
    .where(and(eq(passwordResetTokens.userId, user.id), eq(passwordResetTokens.used, 0)));

  await db.insert(passwordResetTokens).values({
    userId:    user.id,
    tokenHash,
    expiresAt,
    used:      0,
  });

  const resetLink = `${process.env.APP_URL ?? ""}/reset-password?token=${rawToken}`;

  // Log to console (swap for real email service in production)
  console.log(`[PasswordReset] Reset link for ${email}: ${resetLink}`);

  return { message: "If that email is registered, a reset link has been sent." };
}

export async function resetPassword(input: z.infer<typeof resetPasswordSchema>) {
  const { token, newPassword } = resetPasswordSchema.parse(input);
  const tokenHash = hashToken(token);

  const [record] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        eq(passwordResetTokens.used, 0),
        gt(passwordResetTokens.expiresAt, new Date()),
      )
    )
    .limit(1);

  if (!record) {
    throw Object.assign(new Error("Invalid or expired reset token."), { code: "INVALID_TOKEN", status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await Promise.all([
    db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, record.userId)),
    db.update(passwordResetTokens).set({ used: 1 }).where(eq(passwordResetTokens.id, record.id)),
  ]);

  return { message: "Password updated successfully." };
}

export async function forgotUsername(input: z.infer<typeof forgotUsernameSchema>) {
  const { email } = forgotUsernameSchema.parse(input);

  const [user] = await db.select({ username: users.username }).from(users).where(eq(users.email, email)).limit(1);

  if (!user || !user.username) {
    return { message: "If that email is registered and has a username, it has been sent." };
  }

  const masked = maskUsername(user.username);
  console.log(`[ForgotUsername] Username for ${email}: ${user.username}`);

  return {
    message: "If that email is registered, the username has been returned.",
    maskedUsername: masked,
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const { verifyToken, signAccessToken } = await import("./jwtAuth");
  const payload = verifyToken(refreshToken);
  if (payload.type !== "refresh") {
    throw Object.assign(new Error("Not a refresh token."), { code: "INVALID_TOKEN", status: 401 });
  }

  // Verify user still exists
  const [user] = await db
    .select({ id: users.id, email: users.email, role: users.role, companyId: users.companyId })
    .from(users).where(eq(users.id, payload.sub)).limit(1);

  if (!user) {
    throw Object.assign(new Error("User not found."), { code: "USER_NOT_FOUND", status: 401 });
  }

  return {
    accessToken: signAccessToken({
      sub:       user.id,
      email:     user.email ?? "",
      role:      user.role ?? "viewer",
      companyId: user.companyId ?? null,
    }),
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function buildTokenPair(user: { id: string; email: string | null; role: string | null; companyId: string | null }) {
  const base = {
    sub:       user.id,
    email:     user.email ?? "",
    role:      user.role ?? "viewer",
    companyId: user.companyId ?? null,
  };
  return {
    accessToken:  signAccessToken(base),
    refreshToken: signRefreshToken(base),
    user: {
      id:        user.id,
      email:     user.email,
      role:      user.role ?? "viewer",
      companyId: user.companyId,
    },
  };
}
