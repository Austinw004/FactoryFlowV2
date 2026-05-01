/**
 * Enterprise Authentication & Payments Routes
 *
 * Auth:
 *   POST   /api/auth/signup
 *   POST   /api/auth/login
 *   POST   /api/auth/logout
 *   POST   /api/auth/refresh
 *   POST   /api/auth/forgot-password
 *   POST   /api/auth/reset-password
 *   POST   /api/auth/forgot-username
 *   POST   /api/auth/google
 *   POST   /api/auth/saml/callback
 *
 * Billing:
 *   GET    /api/billing/plans
 *   POST   /api/billing/subscribe
 *   POST   /api/billing/usage
 *   GET    /api/billing/invoices
 *   GET    /api/billing/invoices/:id/download
 *
 * Payments:
 *   POST   /api/webhooks/stripe
 *   POST   /api/payments/create-intent
 *   POST   /api/payments/confirm
 *   POST   /api/payouts/send
 *
 * Auth flows: JWT Bearer (API/mobile) + HTTP-only refresh cookie (browser).
 * Replit Auth (OpenID Connect) remains intact for the web dashboard.
 */
import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { parse as parseCookies } from "cookie";
import { z } from "zod";
import {
  signup, login, logout, forgotPassword, resetPassword,
  forgotUsername, refreshAccessToken,
  changePassword, updateProfile,
  signupSchema, loginSchema, forgotPasswordSchema,
  resetPasswordSchema, forgotUsernameSchema,
} from "./lib/emailAuthService";
import { jwtMiddleware, requireJwt, getAuthUser } from "./lib/jwtAuth";
import { checkTrialExpiry } from "./middleware/trialCheck";
import { handleStripeWebhook } from "./lib/stripeWebhookHandler";
import {
  handleGoogleAuth, handleSamlCallback, handleAppleAuth,
  googleOAuthConfigured, appleOAuthConfigured,
  googleAuthorizeUrl, appleAuthorizeUrl,
} from "./lib/ssoService";
import crypto from "crypto";
import {
  getPlans, createSubscription, recordUsageEvent,
  generateInvoice, getUserSubscription,
  computePlatformFee, type PlanId,
} from "./lib/billingService";
import { checkFraud, linkFraudEventToTransaction } from "./lib/fraudDetection";
import {
  computePerformanceFee, checkBillability, isDuplicateBilling,
  validateTrustScore, createPerformanceBillingRecord,
  computeMonthlyBill, getPerformanceSummary, listPerformanceBillingRecords,
  PERFORMANCE_BASE_FEE, PERFORMANCE_FEE_DEFAULT,
} from "./lib/performanceBillingService";
import {
  approveAndExecuteRecommendation, approveRecommendationOnly,
  getPendingRecommendations, getPurchaseIntents,
  getBillingProfile, upsertBillingProfile,
  validateRecommendationForExecution,
} from "./lib/procurementExecutionService";
import {
  listCompanyPaymentMethods,
  addCompanyPaymentMethod,
  setDefaultPaymentMethod,
  removeCompanyPaymentMethod,
  createOrUpdateSubscription,
  executeSupplierPayment,
} from "./lib/paymentMethodsService";
import { logAudit } from "./lib/auditLogger";
import { rateLimiters } from "./lib/securityHardening";
import { getUncachableStripeClient } from "./stripeClient";
import { db } from "./db";
import {
  payments, supplierPayouts, transactions, invoices, subscriptions,
  savingsEvidenceRecords, performanceBilling,
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

// ─── Cookie config for HTTP-only refresh token (browser clients) ───────────────
const REFRESH_COOKIE = "prescient_refresh";
const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
  path:     "/api/auth",
};

// ─── Helper: extract client context ───────────────────────────────────────────
function clientContext(req: Request) {
  return {
    ipAddress:         req.ip ?? req.socket.remoteAddress ?? undefined,
    userAgent:         req.headers["user-agent"] ?? undefined,
    deviceFingerprint: req.headers["x-device-fingerprint"] as string | undefined,
  };
}

// ─── Helper: typed error response ─────────────────────────────────────────────
function apiError(res: Response, status: number, code: string, message: string) {
  res.status(status).json({ error: code, message });
}

// ─── Async error wrapper ───────────────────────────────────────────────────────
function handle(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response) => {
    fn(req, res).catch((err: any) => {
      const status  = err.status  ?? 500;
      const code    = err.code    ?? "INTERNAL_ERROR";
      const message = err.message ?? "An unexpected error occurred.";
      apiError(res, status, code, message);
    });
  };
}

// ─── Cookie parser ────────────────────────────────────────────────────────────
// Express doesn't populate req.cookies by default. We use the `cookie` package
// (already in deps; transitively via express-session) to parse the Cookie
// header once per request so both the refresh-token cookie and the OAuth state
// cookie are available via req.cookies[name].
function parseCookieHeaderMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (!(req as any).cookies) {
    const header = req.headers.cookie;
    (req as any).cookies = header ? parseCookies(header) : {};
  }
  next();
}

export function registerAuthPaymentRoutes(app: Express): void {
  // Populate req.cookies from the Cookie header
  app.use(parseCookieHeaderMiddleware);

  // JWT middleware (non-blocking, reads Bearer header)
  app.use(jwtMiddleware);

  // Trial expiry check on all authenticated routes
  app.use(checkTrialExpiry);

  // ─── STRIPE WEBHOOK — must be before express.json() ───────────────────────
  app.post(
    "/api/webhooks/stripe",
    express.raw({ type: "application/json" }),
    handle(async (req, res) => { await handleStripeWebhook(req, res); }),
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH ROUTES
  // ═══════════════════════════════════════════════════════════════════════════

  /** POST /api/auth/signup */
  app.post("/api/auth/signup", rateLimiters.auth, handle(async (req, res) => {
    const ctx = clientContext(req);
    const result = await signup(req.body, ctx);
    // Set HTTP-only refresh cookie for browser clients
    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTS);
    res.status(201).json({
      accessToken: result.accessToken,
      expiresIn:   result.expiresIn,
      user:        result.user,
    });
  }));

  /** POST /api/auth/login */
  app.post("/api/auth/login", rateLimiters.auth, handle(async (req, res) => {
    const ctx = clientContext(req);
    const result = await login(req.body, ctx);
    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTS);
    res.json({
      accessToken: result.accessToken,
      expiresIn:   result.expiresIn,
      user:        result.user,
      // Return refreshToken in body for API/mobile clients
      refreshToken: result.refreshToken,
    });
  }));

  /** POST /api/auth/logout */
  app.post("/api/auth/logout", handle(async (req, res) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;
    if (refreshToken) await logout(refreshToken);
    res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
    res.json({ message: "Logged out successfully." });
  }));

  /** POST /api/auth/refresh — supports both cookie and body */
  app.post("/api/auth/refresh", rateLimiters.auth, handle(async (req, res) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;
    if (!refreshToken) { apiError(res, 400, "MISSING_TOKEN", "Refresh token required."); return; }
    const result = await refreshAccessToken(refreshToken);
    if (result.refreshToken) res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTS);
    res.json(result);
  }));

  /** POST /api/auth/forgot-password */
  app.post("/api/auth/forgot-password", rateLimiters.sensitive, handle(async (req, res) => {
    const result = await forgotPassword(req.body);
    res.json(result);
  }));

  /** POST /api/auth/reset-password */
  app.post("/api/auth/reset-password", rateLimiters.sensitive, handle(async (req, res) => {
    const result = await resetPassword(req.body);
    res.json(result);
  }));

  /** POST /api/auth/forgot-username */
  app.post("/api/auth/forgot-username", handle(async (req, res) => {
    const result = await forgotUsername(req.body);
    res.json(result);
  }));

  /** POST /api/auth/google — OAuth code exchange or simulation fallback */
  app.post("/api/auth/google", handle(async (req, res) => {
    const ctx = clientContext(req);
    const result = await handleGoogleAuth(req.body, ctx.ipAddress);
    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTS);
    res.json({
      accessToken:  result.accessToken,
      refreshToken: result.refreshToken,
      user:         result.user,
      authSource:   result.authSource,
    });
  }));

  // ─── Browser-redirect OAuth flow (Google + Apple) ──────────────────────────
  // These endpoints are hit directly by the user's browser when they click the
  // "Continue with Google" / "Continue with Apple" buttons on the sign-in page.
  // They redirect to the provider, then the provider bounces back to the
  // callback route where we exchange the code, mint JWTs, set the refresh
  // cookie, and redirect to /auth/callback#accessToken=... on the SPA side.

  const OAUTH_STATE_COOKIE = "prescient_oauth_state";
  const OAUTH_STATE_OPTS = {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax" as const, // lax so it survives the top-level redirect back
    maxAge:   10 * 60 * 1000, // 10 minutes
    path:     "/api/auth",
  };

  function buildCallbackRedirect(result: Awaited<ReturnType<typeof handleGoogleAuth>>): string {
    const params = new URLSearchParams({
      accessToken: result.accessToken,
      new:         result.user.isNewUser ? "1" : "0",
    });
    // Use hash fragment so the token is never sent to the server in referer / logs.
    return `/auth/callback#${params.toString()}`;
  }

  function buildErrorRedirect(message: string): string {
    const params = new URLSearchParams({ error: message });
    return `/signin?${params.toString()}`;
  }

  /** GET /api/auth/google/start — redirect to Google's OAuth consent screen. */
  app.get("/api/auth/google/start", handle(async (req, res) => {
    if (!googleOAuthConfigured()) {
      res.redirect(buildErrorRedirect("Google Sign-In is not configured on this deployment."));
      return;
    }
    const state = crypto.randomBytes(24).toString("hex");
    res.cookie(OAUTH_STATE_COOKIE, `g:${state}`, OAUTH_STATE_OPTS);
    res.redirect(googleAuthorizeUrl(state));
  }));

  /** GET /api/auth/google/callback — exchange code, set cookie, redirect to SPA. */
  app.get("/api/auth/google/callback", handle(async (req, res) => {
    const ctx = clientContext(req);
    const code        = req.query.code        as string | undefined;
    const stateQuery  = req.query.state       as string | undefined;
    const errorQuery  = req.query.error       as string | undefined;
    const cookieState = req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined;

    // Clear the state cookie no matter what — it's single-use.
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/api/auth" });

    if (errorQuery) {
      res.redirect(buildErrorRedirect(`Google sign-in was cancelled (${errorQuery}).`));
      return;
    }
    if (!code) {
      res.redirect(buildErrorRedirect("Google sign-in returned no authorization code."));
      return;
    }
    if (!cookieState || !cookieState.startsWith("g:") || cookieState.slice(2) !== stateQuery) {
      res.redirect(buildErrorRedirect("Google sign-in failed state check. Please try again."));
      return;
    }

    try {
      const result = await handleGoogleAuth({ code }, ctx.ipAddress);
      res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTS);
      res.redirect(buildCallbackRedirect(result));
    } catch (err: any) {
      const message = err?.message ?? "Google sign-in failed.";
      res.redirect(buildErrorRedirect(message));
    }
  }));

  /** GET /api/auth/apple/start — redirect to Apple's OAuth consent screen. */
  app.get("/api/auth/apple/start", handle(async (req, res) => {
    if (!appleOAuthConfigured()) {
      res.redirect(buildErrorRedirect("Apple Sign-In is not configured on this deployment."));
      return;
    }
    const state = crypto.randomBytes(24).toString("hex");
    res.cookie(OAUTH_STATE_COOKIE, `a:${state}`, OAUTH_STATE_OPTS);
    res.redirect(appleAuthorizeUrl(state));
  }));

  /**
   * POST /api/auth/apple/callback — Apple posts the auth code back as a form.
   * Because the callback comes from Apple (cross-site), the sameSite=lax cookie
   * WILL be omitted. Apple signs the state back to us so we still verify it via
   * the form body; the cookie is checked only as a best-effort second factor.
   */
  app.post("/api/auth/apple/callback",
    express.urlencoded({ extended: false }),
    handle(async (req, res) => {
      const ctx = clientContext(req);
      const code       = req.body.code       as string | undefined;
      const stateBody  = req.body.state      as string | undefined;
      const rawUser    = req.body.user       as string | undefined;
      const errorBody  = req.body.error      as string | undefined;
      const cookieState = req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined;

      res.clearCookie(OAUTH_STATE_COOKIE, { path: "/api/auth" });

      if (errorBody) {
        res.redirect(buildErrorRedirect(`Apple sign-in was cancelled (${errorBody}).`));
        return;
      }
      if (!code) {
        res.redirect(buildErrorRedirect("Apple sign-in returned no authorization code."));
        return;
      }
      if (!stateBody) {
        res.redirect(buildErrorRedirect("Apple sign-in missing state parameter."));
        return;
      }
      // Cookie is a soft check (SameSite=Lax + cross-site POST may drop it).
      if (cookieState && (!cookieState.startsWith("a:") || cookieState.slice(2) !== stateBody)) {
        res.redirect(buildErrorRedirect("Apple sign-in failed state check. Please try again."));
        return;
      }

      try {
        const result = await handleAppleAuth({ code, rawUser }, ctx.ipAddress);
        res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTS);
        res.redirect(buildCallbackRedirect(result));
      } catch (err: any) {
        const message = err?.message ?? "Apple sign-in failed.";
        res.redirect(buildErrorRedirect(message));
      }
    }),
  );

  /** POST /api/auth/saml/callback — SAML 2.0 assertion handler */
  app.post("/api/auth/saml/callback", handle(async (req, res) => {
    const ctx = clientContext(req);
    // Extract SAML assertion from POST body (base64 encoded SAMLResponse or parsed object)
    const assertion = {
      email:       req.body.email ?? req.body.Email,
      firstName:   req.body.firstName ?? req.body.FirstName,
      lastName:    req.body.lastName  ?? req.body.LastName,
      groups:      req.body.groups,
      rawXml:      req.body.SAMLResponse ? Buffer.from(req.body.SAMLResponse, "base64").toString("utf8") : undefined,
      idpEntityId: req.body.idpEntityId,
    };
    const result = await handleSamlCallback(assertion, ctx.ipAddress, ctx.userAgent);
    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTS);
    res.json({
      accessToken:  result.accessToken,
      refreshToken: result.refreshToken,
      user:         result.user,
      authSource:   result.authSource,
    });
  }));

  /** GET /api/auth/me — returns authenticated user + trial status */
  app.get("/api/auth/me", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
      apiError(res, 401, "UNAUTHORIZED", "Authentication required.");
      return;
    }

    const { users: usersSchema, companies: companiesSchema } = await import("@shared/schema");
    const [user] = await db
      .select()
      .from(usersSchema)
      .where(eq(usersSchema.id, authUser.id))
      .limit(1);

    if (!user) {
      apiError(res, 404, "NOT_FOUND", "User not found.");
      return;
    }

    // Get company info
    let company = null;
    if (user.companyId) {
      const [comp] = await db
        .select()
        .from(companiesSchema)
        .where(eq(companiesSchema.id, user.companyId))
        .limit(1);
      company = comp;
    }

    // Calculate trial status
    const trialInfo = (() => {
      if (!user.trialEndsAt) {
        return { status: "none", ends_at: null, days_remaining: null };
      }
      const now = new Date();
      const trialEnd = new Date(user.trialEndsAt);
      const msRemaining = trialEnd.getTime() - now.getTime();
      const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
      return {
        status: msRemaining > 0 ? "active" : "expired",
        ends_at: user.trialEndsAt.toISOString(),
        days_remaining: Math.max(0, daysRemaining),
      };
    })();

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        jobTitle: user.jobTitle,
        department: user.department,
        phone: user.phone,
        username: user.username,
        role: user.role,
        companyId: user.companyId,
      },
      company: company ? { id: company.id, name: company.name } : null,
      trial: trialInfo,
    });
  }));

  /** GET /api/user/profile — authenticated user's editable profile */
  app.get("/api/user/profile", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }

    const { users: usersSchema } = await import("@shared/schema");
    const [user] = await db
      .select({
        id: usersSchema.id,
        email: usersSchema.email,
        name: usersSchema.name,
        firstName: usersSchema.firstName,
        lastName: usersSchema.lastName,
        nickname: usersSchema.nickname,
        username: usersSchema.username,
        jobTitle: usersSchema.jobTitle,
        department: usersSchema.department,
        phone: usersSchema.phone,
        role: usersSchema.role,
        companyId: usersSchema.companyId,
      })
      .from(usersSchema)
      .where(eq(usersSchema.id, authUser.id))
      .limit(1);

    if (!user) { apiError(res, 404, "NOT_FOUND", "User not found."); return; }
    res.json({ user });
  }));

  /** PUT /api/user/profile — update display-name, job title, etc. */
  app.put("/api/user/profile", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }

    const result = await updateProfile(authUser.id, req.body);
    await logAudit({
      req,
      action: "update",
      entityType: "user",
      entityId: authUser.id,
      changes: { fields: Object.keys(req.body ?? {}) },
      notes: "profile updated by user",
    }).catch((err) => console.error("[Audit] profile update log failed:", err?.message || err));
    res.json(result);
  }));

  /**
   * GET /api/user/data-preferences — read consent toggles from
   * Settings → Data & Personalization. Returns the stored prefs object
   * (may be null for users who haven't visited the tab yet — the client
   * merges with its own DEFAULT_PREFS).
   */
  app.get("/api/user/data-preferences", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }

    const { users: usersSchema } = await import("@shared/schema");
    const [row] = await db
      .select({ preferences: usersSchema.dataPreferences })
      .from(usersSchema)
      .where(eq(usersSchema.id, authUser.id))
      .limit(1);

    res.json({ preferences: row?.preferences ?? {} });
  }));

  /**
   * PATCH /api/user/data-preferences — atomically merge new toggles into
   * the stored prefs object. Stamps a `<key>At` ISO timestamp on every
   * key that flips on (and clears it on flip-off) for legally-relevant
   * consent items so we can prove when consent was given.
   */
  app.patch("/api/user/data-preferences", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }

    const incoming = (req.body?.preferences ?? {}) as Record<string, boolean>;
    if (typeof incoming !== "object" || Array.isArray(incoming)) {
      apiError(res, 400, "BAD_REQUEST", "preferences must be an object");
      return;
    }

    // Allowlist of legally-relevant keys that get a consent timestamp.
    // Mirror the `legalRelevant: true` set in client/src/pages/SettingsPage.tsx.
    const TRACKED = new Set([
      "aiTraining",
      "peerBenchmarking",
      "productUpdates",
      "shareWithSalesEngineer",
    ]);

    const { users: usersSchema } = await import("@shared/schema");
    const [existing] = await db
      .select({ preferences: usersSchema.dataPreferences })
      .from(usersSchema)
      .where(eq(usersSchema.id, authUser.id))
      .limit(1);

    const prev = (existing?.preferences ?? {}) as Record<string, unknown>;
    const merged: Record<string, unknown> = { ...prev };
    const now = new Date().toISOString();
    const flipped: string[] = [];

    for (const [k, vRaw] of Object.entries(incoming)) {
      const v = !!vRaw;
      const wasOn = !!prev[k];
      merged[k] = v;
      if (TRACKED.has(k) && v !== wasOn) {
        merged[`${k}At`] = v ? now : null;
        flipped.push(`${k}=${v}`);
      }
    }

    await db
      .update(usersSchema)
      .set({ dataPreferences: merged as any, updatedAt: new Date() })
      .where(eq(usersSchema.id, authUser.id));

    if (flipped.length > 0) {
      await logAudit({
        req,
        action: "update",
        entityType: "user",
        entityId: authUser.id,
        changes: { dataPreferences: flipped },
        notes: "data-preference consent toggle",
      }).catch((err) => console.error("[Audit] data-preference consent log failed:", err?.message || err));
    }

    res.json({ preferences: merged, success: true });
  }));

  /** POST /api/user/password — change password while signed in */
  app.post("/api/user/password", requireJwt, rateLimiters.sensitive, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }

    const result = await changePassword(authUser.id, req.body);
    await logAudit({
      req,
      action: "update",
      entityType: "user",
      entityId: authUser.id,
      notes: "password changed by user",
    }).catch((err) => console.error("[Audit] password change log failed:", err?.message || err));
    res.json(result);
  }));

  // ═══════════════════════════════════════════════════════════════════════════
  // BILLING ROUTES
  // ═══════════════════════════════════════════════════════════════════════════

  /** GET /api/billing/plans — public, no auth required */
  app.get("/api/billing/plans", handle(async (_req, res) => {
    res.json({ plans: getPlans() });
  }));

  /** POST /api/billing/subscribe */
  app.post("/api/billing/subscribe", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }

    const { planId, paymentMethodId, stripePriceId, trialDays } = z.object({
      planId:          z.string().min(1),
      paymentMethodId: z.string().optional(),
      stripePriceId:   z.string().optional(),
      trialDays:       z.number().int().min(0).max(90).optional(),
    }).parse(req.body);

    const sub = await createSubscription({
      userId:          authUser.id,
      companyId:       authUser.companyId,
      planId:          planId as PlanId,
      email:           authUser.email,
      paymentMethodId,
      stripePriceId,
      trialDays,
    });

    res.status(201).json({ subscription: sub });
  }));

  /** POST /api/billing/usage — record a usage event */
  app.post("/api/billing/usage", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }

    const { subscriptionId, metricType, quantity, metadata } = z.object({
      subscriptionId: z.string().min(1),
      metricType:     z.enum(["units_processed", "procurement_spend"]),
      quantity:       z.number().positive(),
      metadata:       z.record(z.unknown()).optional(),
    }).parse(req.body);

    const event = await recordUsageEvent({
      userId: authUser.id, companyId: authUser.companyId, subscriptionId, metricType, quantity, metadata,
    });

    res.status(201).json({ event });
  }));

  /** GET /api/billing/invoices */
  app.get("/api/billing/invoices", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }

    const rows = await db.select().from(invoices).where(eq(invoices.userId, authUser.id));
    res.json({ invoices: rows });
  }));

  /** GET /api/billing/invoices/:id/download — returns invoice JSON (PDF generation stub) */
  app.get("/api/billing/invoices/:id/download", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }

    const [inv] = await db.select().from(invoices)
      .where(eq(invoices.id, req.params.id)).limit(1);

    if (!inv || inv.userId !== authUser.id) {
      apiError(res, 404, "NOT_FOUND", "Invoice not found."); return;
    }

    // PDF generation: explicitly stubbed — requires pdf generation library (e.g. PDFKit, Puppeteer)
    // Returns structured JSON that can be rendered to PDF by the client or a future PDF service.
    res.json({
      _note: "PDF generation is stubbed. Install PDFKit or Puppeteer to generate actual PDFs.",
      invoice: {
        id:            inv.id,
        status:        inv.status,
        total:         inv.total,
        subtotal:      inv.subtotal,
        taxAmount:     inv.taxAmount,
        currency:      inv.currency,
        lineItems:     inv.lineItems,
        usageBreakdown: inv.usageBreakdown,
        periodStart:   inv.periodStart,
        periodEnd:     inv.periodEnd,
        paidAt:        inv.paidAt,
        createdAt:     inv.createdAt,
      },
    });
  }));

  /** GET /api/billing/subscription */
  app.get("/api/billing/subscription", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }
    const sub = await getUserSubscription(authUser.id);
    res.json({ subscription: sub });
  }));

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYMENT ROUTES (with fraud detection)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /api/payments/create-intent
   * Runs fraud check → creates Stripe PaymentIntent → persists transaction record.
   */
  app.post("/api/payments/create-intent", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }

    const { amount, currency = "usd", description, supplierId } = z.object({
      amount:      z.number().int().positive("Amount must be a positive integer (cents)"),
      currency:    z.string().length(3).optional(),
      description: z.string().max(500).optional(),
      supplierId:  z.string().optional(),
    }).parse(req.body);

    const ctx = clientContext(req);

    // ── Fraud detection ────────────────────────────────────────────────────
    const fraud = await checkFraud({
      userId:            authUser.id,
      companyId:         authUser.companyId,
      amount,
      currency,
      ipAddress:         ctx.ipAddress,
      userAgent:         ctx.userAgent,
      deviceFingerprint: ctx.deviceFingerprint,
    });

    if (fraud.blocked) {
      apiError(res, 403, "TRANSACTION_BLOCKED", `Transaction blocked by fraud detection. Score: ${fraud.score.toFixed(2)}`);
      return;
    }

    const fee       = computePlatformFee(amount);
    const netAmount = amount - fee;

    const stripe = await getUncachableStripeClient();
    const pi = await stripe.paymentIntents.create({
      amount,
      currency,
      description,
      metadata: {
        userId:    authUser.id,
        companyId: authUser.companyId ?? "",
        supplierId: supplierId ?? "",
        fraudScore: fraud.score.toFixed(4),
      },
    });

    // Persist transaction record with fraud info
    const [txRow] = await db.insert(transactions).values({
      userId:               authUser.id,
      companyId:            authUser.companyId,
      supplierId:           supplierId ?? null,
      amount,
      fee,
      netAmount,
      currency,
      status:               fraud.requiresApproval ? "pending" : "pending",
      stripePaymentIntentId: pi.id,
      description,
      fraudScore:           fraud.score.toFixed(4),
      fraudFlags:           fraud.flags,
      requiresApproval:     fraud.requiresApproval ? 1 : 0,
    }).returning();

    await linkFraudEventToTransaction(authUser.id, txRow.id);

    res.status(201).json({
      clientSecret:      pi.client_secret,
      paymentIntentId:   pi.id,
      transactionId:     txRow.id,
      platformFee:       fee,
      netAmount,
      fraudScore:        fraud.score,
      requiresApproval:  fraud.requiresApproval,
      fraudFlags:        fraud.flags.map(f => ({ rule: f.rule, detail: f.detail })),
    });
  }));

  /**
   * POST /api/payments/confirm — server-side verification, never trusts client status.
   */
  app.post("/api/payments/confirm", requireJwt, handle(async (req, res) => {
    const { paymentIntentId } = z.object({ paymentIntentId: z.string().min(1) }).parse(req.body);

    const stripe = await getUncachableStripeClient();
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    const status = pi.status === "succeeded" ? "succeeded" :
                   pi.status === "canceled"  ? "failed" : "pending";

    await db.update(transactions)
      .set({ status, stripeChargeId: (pi.latest_charge as string) ?? null, updatedAt: new Date() })
      .where(eq(transactions.stripePaymentIntentId, paymentIntentId));

    res.json({ status, paymentIntentId, stripeStatus: pi.status });
  }));

  // ─── Performance Billing Routes ────────────────────────────────────────────────

  /**
   * GET /api/billing/performance/summary
   * Returns estimated vs measured vs billable vs fees charged — strictly separated.
   */
  app.get("/api/billing/performance/summary", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }
    if (!authUser.companyId) { apiError(res, 400, "NO_COMPANY", "Company ID required for performance billing."); return; }

    const summary = await getPerformanceSummary(authUser.companyId);
    res.json({ summary, plan: { baseFee: PERFORMANCE_BASE_FEE, feePercentage: PERFORMANCE_FEE_DEFAULT } });
  }));

  /**
   * GET /api/billing/performance/records
   * Lists all performance billing records for the company.
   */
  app.get("/api/billing/performance/records", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }
    if (!authUser.companyId) { apiError(res, 400, "NO_COMPANY", "Company ID required."); return; }

    const records = await listPerformanceBillingRecords(authUser.companyId);
    res.json({ records });
  }));

  /**
   * POST /api/billing/performance/compute
   * Computes the monthly performance bill for the current period.
   * Returns full line-item breakdown: $100 base + verified performance fees.
   */
  app.post("/api/billing/performance/compute", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }
    if (!authUser.companyId) { apiError(res, 400, "NO_COMPANY", "Company ID required."); return; }

    const { periodStart, periodEnd } = z.object({
      periodStart: z.string().optional(),
      periodEnd:   z.string().optional(),
    }).parse(req.body);

    const now = new Date();
    const start = periodStart ? new Date(periodStart) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end   = periodEnd   ? new Date(periodEnd)   : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const bill = await computeMonthlyBill(authUser.companyId, start, end);
    res.json({ bill });
  }));

  /**
   * POST /api/billing/performance/bill-record
   * Creates a performance billing record for a specific verified savings record.
   * Enforces all guards: billability, dedup, trust score, anomaly detection.
   */
  app.post("/api/billing/performance/bill-record", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }
    if (!authUser.companyId) { apiError(res, 400, "NO_COMPANY", "Company ID required."); return; }

    const { savingsRecordId, feePercentage, trustScore, notes } = z.object({
      savingsRecordId: z.number().int().positive(),
      feePercentage:   z.number().min(0.10).max(0.20).optional(),
      trustScore:      z.number().min(0).max(1).optional(),
      notes:           z.string().max(500).optional(),
    }).parse(req.body);

    const result = await createPerformanceBillingRecord({
      companyId:      authUser.companyId,
      savingsRecordId,
      feePercentage,
      trustScore,
      notes,
    });

    if (!result.success) {
      const statusCode = result.blocked ? 403 : 422;
      apiError(res, statusCode,
        result.blocked ? "BILLING_BLOCKED" : "NOT_BILLABLE",
        result.error ?? result.nonBillableReasons?.join("; ") ?? "Cannot create billing record"
      );
      return;
    }

    res.status(201).json({
      record: result.record,
      requiresApproval: result.requiresApproval,
      anomalyFlagged: result.anomalyFlagged,
    });
  }));

  // ─── Billing Profile Routes ────────────────────────────────────────────────────

  /**
   * GET /api/billing/profile
   * Returns the company billing profile (redacted — no raw payment tokens).
   */
  app.get("/api/billing/profile", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }
    if (!authUser.companyId) { apiError(res, 400, "NO_COMPANY", "Company required."); return; }

    const profile = await getBillingProfile(authUser.companyId);
    if (!profile) { res.json({ profile: null }); return; }

    // Redact sensitive fields — never return raw payment method IDs
    res.json({
      profile: {
        id: profile.id,
        companyId: profile.companyId,
        billingEmail: profile.billingEmail,
        companyName: profile.companyName,
        address: profile.address,
        taxId: profile.taxId ? "***" + profile.taxId.slice(-4) : null,
        paymentMethodLast4: profile.paymentMethodLast4,
        paymentMethodBrand: profile.paymentMethodBrand,
        preferredPaymentMethod: profile.preferredPaymentMethod,
        hasStripeCustomer: !!profile.stripeCustomerId,
        hasPaymentMethod: !!profile.defaultPaymentMethodId,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    });
  }));

  /**
   * POST /api/billing/setup
   * Create or update the billing profile for a company.
   * Optionally attaches a Stripe SetupIntent payment method.
   */
  app.post("/api/billing/setup", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }
    if (!authUser.companyId) { apiError(res, 400, "NO_COMPANY", "Company required."); return; }

    const {
      billingEmail, companyName, address, taxId,
      paymentMethodId, preferredPaymentMethod,
    } = z.object({
      billingEmail:            z.string().email(),
      companyName:             z.string().min(1).max(200),
      address:                 z.object({
        street:  z.string().optional(),
        city:    z.string().optional(),
        state:   z.string().optional(),
        zip:     z.string().optional(),
        country: z.string().optional(),
      }).optional(),
      taxId:                   z.string().max(50).optional(),
      paymentMethodId:         z.string().optional(), // Stripe PaymentMethod ID from Elements
      preferredPaymentMethod:  z.enum(["card", "ach", "invoice"]).optional(),
    }).parse(req.body);

    // If a payment method is provided, attach to Stripe customer
    let stripeCustomerId: string | undefined;
    let resolvedPmId: string | undefined;
    let last4: string | undefined;
    let brand: string | undefined;

    if (paymentMethodId) {
      const stripe = await getUncachableStripeClient();
      const user = authUser;

      // Create or retrieve Stripe customer
      const existing = await getBillingProfile(authUser.companyId);
      if (existing?.stripeCustomerId) {
        stripeCustomerId = existing.stripeCustomerId;
      } else {
        const customer = await stripe.customers.create({
          email: billingEmail,
          name: companyName,
          metadata: { companyId: authUser.companyId, userId: authUser.id },
        });
        stripeCustomerId = customer.id;
      }

      // Attach payment method
      await stripe.paymentMethods.attach(paymentMethodId, { customer: stripeCustomerId });
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });

      const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
      resolvedPmId = pm.id;
      last4 = pm.card?.last4;
      brand = pm.card?.brand;
    }

    const profile = await upsertBillingProfile({
      companyId: authUser.companyId,
      billingEmail,
      companyName,
      address: address as Record<string, string> | undefined,
      taxId,
      stripeCustomerId,
      defaultPaymentMethodId: resolvedPmId,
      paymentMethodLast4: last4,
      paymentMethodBrand: brand,
      preferredPaymentMethod,
    });

    res.json({
      profile: {
        id: profile.id,
        billingEmail: profile.billingEmail,
        companyName: profile.companyName,
        paymentMethodLast4: profile.paymentMethodLast4,
        paymentMethodBrand: profile.paymentMethodBrand,
        hasPaymentMethod: !!profile.defaultPaymentMethodId,
        preferredPaymentMethod: profile.preferredPaymentMethod,
      },
    });
  }));

  // ─── Payment Method Management Routes ─────────────────────────────────────────

  /** GET /api/billing/publishable-key — returns Stripe publishable key for frontend */
  app.get("/api/billing/publishable-key", requireJwt, handle(async (_req, res) => {
    res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "" });
  }));

  /**
   * POST /api/billing/create-customer
   * Explicitly create a Stripe customer if one doesn't exist yet.
   * RBAC: operator or admin
   */
  app.post("/api/billing/create-customer", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }
    if (!authUser.companyId) { apiError(res, 400, "NO_COMPANY", "Company context required."); return; }
    if (!["operator", "admin"].includes(authUser.role || "")) {
      apiError(res, 403, "FORBIDDEN", "Operator or admin role required."); return;
    }

    const profile = await getBillingProfile(authUser.companyId);
    if (profile?.stripeCustomerId) {
      res.json({ customerId: profile.stripeCustomerId, created: false });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const customer = await stripe.customers.create({
      email:    req.body.email  || profile?.billingEmail  || undefined,
      name:     req.body.name   || profile?.companyName   || undefined,
      metadata: { companyId: authUser.companyId },
    });

    await upsertBillingProfile({
      companyId: authUser.companyId,
      stripeCustomerId: customer.id,
    });

    res.json({ customerId: customer.id, created: true });
  }));

  /**
   * POST /api/billing/setup-intent
   * Creates a Stripe SetupIntent and returns the client_secret for Stripe Elements.
   * RBAC: operator or admin
   */
  app.post("/api/billing/setup-intent", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }
    if (!authUser.companyId) { apiError(res, 400, "NO_COMPANY", "Company context required."); return; }
    if (!["operator", "admin"].includes(authUser.role || "")) {
      apiError(res, 403, "FORBIDDEN", "Operator or admin role required."); return;
    }

    const profile = await getBillingProfile(authUser.companyId);
    let stripeCustomerId = profile?.stripeCustomerId;

    if (!stripeCustomerId) {
      const stripe = await getUncachableStripeClient();
      const customer = await stripe.customers.create({
        email:    profile?.billingEmail  || undefined,
        name:     profile?.companyName   || undefined,
        metadata: { companyId: authUser.companyId },
      });
      stripeCustomerId = customer.id;
      await upsertBillingProfile({ companyId: authUser.companyId, stripeCustomerId });
    }

    const stripe = await getUncachableStripeClient();
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
    });

    res.json({ clientSecret: setupIntent.client_secret });
  }));

  /**
   * POST /api/billing/attach-payment-method
   * Attaches a Stripe PaymentMethod to the customer and saves it in DB.
   * RBAC: operator or admin
   */
  app.post("/api/billing/attach-payment-method", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }
    if (!authUser.companyId) { apiError(res, 400, "NO_COMPANY", "Company context required."); return; }
    if (!["operator", "admin"].includes(authUser.role || "")) {
      apiError(res, 403, "FORBIDDEN", "Operator or admin role required."); return;
    }

    const { paymentMethodId, setAsDefault = false } = req.body;
    if (!paymentMethodId) { apiError(res, 400, "MISSING_FIELD", "paymentMethodId is required."); return; }

    const profile = await getBillingProfile(authUser.companyId);
    if (!profile?.stripeCustomerId) {
      apiError(res, 400, "NO_CUSTOMER", "No Stripe customer found. Call create-customer first."); return;
    }

    const stripe = await getUncachableStripeClient();

    // Attach PM to the customer
    await stripe.paymentMethods.attach(paymentMethodId, { customer: profile.stripeCustomerId });

    // Retrieve card details
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    const card = pm.card;
    if (!card) { apiError(res, 400, "INVALID_PM", "Only card payment methods are supported."); return; }

    const isFirstCard = (await listCompanyPaymentMethods(authUser.companyId)).length === 0;
    const makeDefault = setAsDefault || isFirstCard;

    const saved = await addCompanyPaymentMethod({
      companyId:             authUser.companyId,
      stripePaymentMethodId: paymentMethodId,
      brand:                 card.brand,
      last4:                 card.last4,
      expMonth:              card.exp_month,
      expYear:               card.exp_year,
      isDefault:             makeDefault,
    });

    if (makeDefault) {
      // Set default on Stripe customer and mirror to billing profile
      await stripe.customers.update(profile.stripeCustomerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
      await upsertBillingProfile({
        companyId:             authUser.companyId,
        defaultPaymentMethodId: paymentMethodId,
        paymentMethodLast4:    card.last4,
        paymentMethodBrand:    card.brand,
      });
    }

    await logAudit({
      action:     "create",
      entityType: "payment_method",
      entityId:   saved.id,
      notes:      `Added ${card.brand} ending ${card.last4}`,
      req,
    });

    res.json({ paymentMethod: saved });
  }));

  /**
   * GET /api/billing/payment-methods
   * Returns all saved payment methods for the authenticated company.
   */
  app.get("/api/billing/payment-methods", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }
    if (!authUser.companyId) { apiError(res, 400, "NO_COMPANY", "Company context required."); return; }

    const methods = await listCompanyPaymentMethods(authUser.companyId);
    res.json({ paymentMethods: methods });
  }));

  /**
   * POST /api/billing/payment-methods/:id/set-default
   * Marks a saved card as the default.
   * RBAC: operator or admin
   */
  app.post("/api/billing/payment-methods/:id/set-default", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }
    if (!authUser.companyId) { apiError(res, 400, "NO_COMPANY", "Company context required."); return; }
    if (!["operator", "admin"].includes(authUser.role || "")) {
      apiError(res, 403, "FORBIDDEN", "Operator or admin role required."); return;
    }

    const updated = await setDefaultPaymentMethod(authUser.companyId, req.params.id);

    // Mirror default to Stripe customer
    const profile = await getBillingProfile(authUser.companyId);
    if (profile?.stripeCustomerId) {
      const stripe = await getUncachableStripeClient();
      await stripe.customers.update(profile.stripeCustomerId, {
        invoice_settings: { default_payment_method: updated.stripePaymentMethodId },
      });
    }

    await logAudit({
      action:     "update",
      entityType: "payment_method",
      entityId:   req.params.id,
      notes:      "Set as default payment method",
      req,
    });

    res.json({ paymentMethod: updated });
  }));

  /**
   * DELETE /api/billing/payment-methods/:id
   * Removes a saved card from DB and detaches it from Stripe.
   * RBAC: operator or admin
   */
  app.delete("/api/billing/payment-methods/:id", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }
    if (!authUser.companyId) { apiError(res, 400, "NO_COMPANY", "Company context required."); return; }
    if (!["operator", "admin"].includes(authUser.role || "")) {
      apiError(res, 403, "FORBIDDEN", "Operator or admin role required."); return;
    }

    await removeCompanyPaymentMethod(authUser.companyId, req.params.id);

    await logAudit({
      action:     "delete",
      entityType: "payment_method",
      entityId:   req.params.id,
      notes:      "Payment method removed",
      req,
    });

    res.json({ success: true });
  }));

  /**
   * POST /api/billing/create-subscription
   * Creates or upgrades a Stripe subscription for the authenticated company.
   * RBAC: operator or admin
   */
  app.post("/api/billing/create-subscription", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }
    if (!authUser.companyId) { apiError(res, 400, "NO_COMPANY", "Company context required."); return; }
    if (!["operator", "admin"].includes(authUser.role || "")) {
      apiError(res, 403, "FORBIDDEN", "Operator or admin role required."); return;
    }

    const { planId } = req.body;
    if (!planId) { apiError(res, 400, "MISSING_FIELD", "planId is required."); return; }

    const profile = await getBillingProfile(authUser.companyId);
    if (!profile?.stripeCustomerId) {
      apiError(res, 400, "NO_CUSTOMER", "Set up billing profile first."); return;
    }

    const result = await createOrUpdateSubscription(planId, profile.stripeCustomerId);

    await logAudit({
      action:     "create",
      entityType: "subscription",
      entityId:   result.subscriptionId,
      notes:      `Plan: ${planId} — status: ${result.status}`,
      req,
    });

    res.json(result);
  }));

  /**
   * POST /api/billing/execute-payment/:intentId
   * Executes a supplier payment for an approved purchase intent.
   * RBAC: operator or admin
   */
  app.post("/api/billing/execute-payment/:intentId", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }
    if (!authUser.companyId) { apiError(res, 400, "NO_COMPANY", "Company context required."); return; }
    if (!["operator", "admin"].includes(authUser.role || "")) {
      apiError(res, 403, "FORBIDDEN", "Operator or admin role required."); return;
    }

    const result = await executeSupplierPayment(req.params.intentId, authUser.companyId);

    if (result.success) {
      await logAudit({
        action:     "execute",
        entityType: "purchase_transaction",
        entityId:   result.transactionId,
        notes:      `PaymentIntent: ${result.stripePaymentIntentId}`,
        req,
      });
    }

    if (!result.success) {
      apiError(res, 422, "PAYMENT_FAILED", result.error || "Payment failed"); return;
    }

    res.json(result);
  }));

  // ─── Procurement Execution Routes ─────────────────────────────────────────────

  /**
   * GET /api/procurement/recommendations/pending
   * Lists pending purchase recommendations awaiting user action.
   */
  app.get("/api/procurement/recommendations/pending", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }
    if (!authUser.companyId) { apiError(res, 400, "NO_COMPANY", "Company required."); return; }

    const recommendations = await getPendingRecommendations(authUser.companyId);
    res.json({ recommendations });
  }));

  /**
   * POST /api/procurement/recommendations/:id/validate
   * Pre-flight validation — check if a recommendation is ready to execute.
   */
  app.post("/api/procurement/recommendations/:id/validate", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }
    if (!authUser.companyId) { apiError(res, 400, "NO_COMPANY", "Company required."); return; }

    const result = await validateRecommendationForExecution(req.params.id, authUser.companyId);
    res.json(result);
  }));

  /**
   * POST /api/procurement/recommendations/:id/approve
   * Approve a recommendation (status → user_approved) without executing payment.
   */
  app.post("/api/procurement/recommendations/:id/approve", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }
    if (!authUser.companyId) { apiError(res, 400, "NO_COMPANY", "Company required."); return; }

    const result = await approveRecommendationOnly(req.params.id, authUser.id, authUser.companyId);

    if (!result.success) {
      apiError(res, 422, "VALIDATION_FAILED", result.error ?? "Approval failed");
      return;
    }
    res.json({ success: true, message: "Recommendation approved" });
  }));

  /**
   * POST /api/procurement/recommendations/:id/execute
   * Approve + execute a recommendation (Stripe payment or PO fallback).
   * Enforces: trustScore >= 0.6, fraud check, billing profile, full audit.
   */
  app.post("/api/procurement/recommendations/:id/execute", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }
    if (!authUser.companyId) { apiError(res, 400, "NO_COMPANY", "Company required."); return; }

    const { paymentMethod } = z.object({
      paymentMethod: z.enum(["card", "ach", "invoice"]).optional().default("card"),
    }).parse(req.body);

    const result = await approveAndExecuteRecommendation(
      req.params.id,
      authUser.id,
      authUser.companyId,
      paymentMethod as "card" | "ach" | "invoice",
    );

    if (!result.success && result.blocked) {
      apiError(res, 403, "EXECUTION_BLOCKED", result.error ?? "Execution blocked");
      return;
    }
    if (!result.success) {
      apiError(res, 422, "EXECUTION_FAILED", result.error ?? "Execution failed");
      return;
    }

    res.status(201).json(result);
  }));

  /**
   * GET /api/procurement/intents
   * Lists purchase intents for the authenticated company.
   */
  app.get("/api/procurement/intents", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }
    if (!authUser.companyId) { apiError(res, 400, "NO_COMPANY", "Company required."); return; }

    const intents = await getPurchaseIntents(authUser.companyId);
    res.json({ intents });
  }));

  /**
   * POST /api/payouts/send — Stripe Connect supplier transfer.
   */
  app.post("/api/payouts/send", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }

    const { supplierId, connectedAccountId, amount, currency = "usd", description } = z.object({
      supplierId:          z.string().min(1),
      connectedAccountId:  z.string().min(1),
      amount:              z.number().int().positive(),
      currency:            z.string().length(3).optional(),
      description:         z.string().max(500).optional(),
    }).parse(req.body);

    const stripe = await getUncachableStripeClient();
    const transfer = await stripe.transfers.create({
      amount, currency, destination: connectedAccountId, description,
      metadata: { supplierId, companyId: authUser.companyId ?? "", requestedBy: authUser.id },
    });

    const [payoutRow] = await db.insert(supplierPayouts).values({
      supplierId, companyId: authUser.companyId, amount, currency, status: "sent",
      stripeTransferId: transfer.id, stripeConnectedAccountId: connectedAccountId, description,
    }).returning();

    res.status(201).json({
      transferId: transfer.id, payoutDbId: payoutRow.id, status: "sent", amount, currency,
    });
  }));
}
