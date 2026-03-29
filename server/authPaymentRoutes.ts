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
import type { Express, Request, Response } from "express";
import express from "express";
import { z } from "zod";
import {
  signup, login, logout, forgotPassword, resetPassword,
  forgotUsername, refreshAccessToken,
  signupSchema, loginSchema, forgotPasswordSchema,
  resetPasswordSchema, forgotUsernameSchema,
} from "./lib/emailAuthService";
import { jwtMiddleware, requireJwt, getAuthUser } from "./lib/jwtAuth";
import { handleStripeWebhook } from "./lib/stripeWebhookHandler";
import { handleGoogleAuth, handleSamlCallback } from "./lib/ssoService";
import {
  getPlans, createSubscription, recordUsageEvent,
  generateInvoice, getUserSubscription,
  computePlatformFee, type PlanId,
} from "./lib/billingService";
import { checkFraud, linkFraudEventToTransaction } from "./lib/fraudDetection";
import { getUncachableStripeClient } from "./stripeClient";
import { db } from "./db";
import { payments, supplierPayouts, transactions, invoices, subscriptions } from "@shared/schema";
import { eq } from "drizzle-orm";

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

export function registerAuthPaymentRoutes(app: Express): void {
  // JWT middleware (non-blocking, reads Bearer header)
  app.use(jwtMiddleware);

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
  app.post("/api/auth/signup", handle(async (req, res) => {
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
  app.post("/api/auth/login", handle(async (req, res) => {
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
  app.post("/api/auth/refresh", handle(async (req, res) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;
    if (!refreshToken) { apiError(res, 400, "MISSING_TOKEN", "Refresh token required."); return; }
    const result = await refreshAccessToken(refreshToken);
    if (result.refreshToken) res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTS);
    res.json(result);
  }));

  /** POST /api/auth/forgot-password */
  app.post("/api/auth/forgot-password", handle(async (req, res) => {
    const result = await forgotPassword(req.body);
    res.json(result);
  }));

  /** POST /api/auth/reset-password */
  app.post("/api/auth/reset-password", handle(async (req, res) => {
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
