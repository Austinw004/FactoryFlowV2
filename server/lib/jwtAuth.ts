/**
 * JWT Authentication Library
 * Issues, verifies, and refreshes access + refresh tokens.
 * Works alongside the existing Replit Auth (OpenID Connect) layer.
 */
import jwt from "jsonwebtoken";
import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET;
if (!JWT_SECRET) { console.error("CRITICAL: JWT_SECRET environment variable is required"); process.exit(1); }
const JWT_ACCESS_EXPIRES  = "15m";
const JWT_REFRESH_EXPIRES = "7d";

export interface JwtPayload {
  sub: string;          // userId
  email: string;
  role: string;
  companyId: string | null;
  type: "access" | "refresh";
  jti?: string;         // unique token ID (prevents hash collision within same second)
}

export function signAccessToken(payload: Omit<JwtPayload, "type">): string {
  return (jwt as any).sign({ ...payload, type: "access", jti: crypto.randomBytes(8).toString("hex") }, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRES });
}

export function signRefreshToken(payload: Omit<JwtPayload, "type">): string {
  return (jwt as any).sign({ ...payload, type: "refresh", jti: crypto.randomBytes(16).toString("hex") }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES });
}

export function verifyToken(token: string): JwtPayload {
  return (jwt as any).verify(token, JWT_SECRET) as JwtPayload;
}

/**
 * Express middleware — attaches decoded JWT payload to req.jwtUser when a
 * Bearer token is present in the Authorization header.
 * Non-blocking: if no token present, passes through (Replit Auth takes over).
 */
export function jwtMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    try {
      const token = auth.slice(7);
      const payload = verifyToken(token);
      if (payload.type !== "access") throw new Error("Not an access token");
      (req as any).jwtUser = payload;
    } catch {
      // Invalid token — fall through to Replit Auth or let route reject
    }
  }
  next();
}

/**
 * Middleware that requires a valid JWT (does not fall through to Replit Auth).
 * Use on routes that can be called from mobile/API clients without cookies.
 *
 * Side-effect (round-13 audit): refreshes companyId from the DB when the
 * JWT has none. JWTs are issued at signup time, when the user typically
 * has no company yet. They live for 15 minutes. If the user auto-creates
 * a company mid-session, their DB user.companyId updates but the JWT
 * keeps companyId: null — and every downstream handler reading
 * jwtUser.companyId (15+ billing endpoints, settings, RBAC checks) sees
 * stale null and returns NO_COMPANY. Even though the user IS in a
 * company.
 *
 * The mutation here patches the in-flight `req.jwtUser.companyId` so
 * downstream handlers see the fresh value without needing async-aware
 * helpers. Cost: one extra DB query per request, ONLY when the JWT
 * actually lacks companyId. Happy path (token already has company) is
 * zero overhead.
 */
export async function requireJwt(req: Request, res: Response, next: NextFunction): Promise<void> {
  const jwtUser = (req as any).jwtUser;
  if (!jwtUser) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "Valid Bearer token required." });
    return;
  }

  if (!jwtUser.companyId && jwtUser.sub) {
    try {
      const { storage } = await import("../storage");
      const dbUser = await storage.getUser(jwtUser.sub);
      if (dbUser?.companyId) {
        jwtUser.companyId = dbUser.companyId;
      }
    } catch (err) {
      console.warn("[requireJwt] companyId refresh failed:", err);
      // Non-fatal — handler will surface NO_COMPANY if it needs the field
    }
  }

  next();
}

/**
 * Combined auth check — accepts either JWT or Replit session.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const hasJwt    = !!(req as any).jwtUser;
  const hasSession = !!(req as any).user;
  if (!hasJwt && !hasSession) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "Authentication required." });
    return;
  }
  next();
}

/** Derive a unified user context from JWT or Replit session, whichever is present. */
export function getAuthUser(req: Request): { id: string; email: string; role: string; companyId: string | null } | null {
  const jwtUser = (req as any).jwtUser as JwtPayload | undefined;
  if (jwtUser) {
    return { id: jwtUser.sub, email: jwtUser.email, role: jwtUser.role, companyId: jwtUser.companyId };
  }
  const sessionUser = (req as any).user;
  if (sessionUser) {
    return { id: sessionUser.claims?.sub ?? sessionUser.id, email: sessionUser.claims?.email ?? sessionUser.email, role: sessionUser.role ?? "viewer", companyId: sessionUser.companyId ?? null };
  }
  return null;
}

/**
 * Async variant that falls back to a DB lookup when the JWT's companyId
 * is stale. Use this in handlers that GATE on companyId (billing,
 * settings, anything writing to per-company tables) so a user who
 * just had a company auto-created mid-session doesn't get false
 * NO_COMPANY errors for the remaining 15 minutes their JWT lives.
 *
 * Round-13 audit caught this: fresh signup → JWT issued with
 * companyId: null → /api/onboarding/status auto-creates company → DB
 * user.companyId is now set, but the JWT they're carrying is unchanged.
 * Every subsequent billing call (create-customer, setup-intent,
 * payment-methods) returned 400 NO_COMPANY because getAuthUser only
 * read the JWT. Customer could browse plans but never reach the card-
 * capture screen.
 *
 * Costs one extra DB roundtrip when JWT.companyId is null. Skipped
 * entirely on the happy path (JWT already has companyId).
 */
export async function getAuthUserWithFreshCompany(
  req: Request,
): Promise<{ id: string; email: string; role: string; companyId: string | null } | null> {
  const baseline = getAuthUser(req);
  if (!baseline) return null;
  if (baseline.companyId) return baseline;

  // JWT/session says no company — check the DB before failing the request.
  try {
    const { storage } = await import("../storage");
    const dbUser = await storage.getUser(baseline.id);
    if (dbUser?.companyId) {
      return { ...baseline, companyId: dbUser.companyId };
    }
  } catch (err) {
    console.warn("[jwtAuth] getAuthUserWithFreshCompany DB lookup failed:", err);
    // Fall through — return the stale baseline; caller will surface NO_COMPANY.
  }
  return baseline;
}
