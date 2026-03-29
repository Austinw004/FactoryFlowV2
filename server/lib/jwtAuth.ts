/**
 * JWT Authentication Library
 * Issues, verifies, and refreshes access + refresh tokens.
 * Works alongside the existing Replit Auth (OpenID Connect) layer.
 */
import jwt from "jsonwebtoken";
import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "prescient-labs-jwt-fallback";
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
  return jwt.sign({ ...payload, type: "access", jti: crypto.randomBytes(8).toString("hex") }, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRES });
}

export function signRefreshToken(payload: Omit<JwtPayload, "type">): string {
  return jwt.sign({ ...payload, type: "refresh", jti: crypto.randomBytes(16).toString("hex") }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
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
 */
export function requireJwt(req: Request, res: Response, next: NextFunction): void {
  const jwtUser = (req as any).jwtUser;
  if (!jwtUser) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "Valid Bearer token required." });
    return;
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
