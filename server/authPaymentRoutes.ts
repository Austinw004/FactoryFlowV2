/**
 * Enterprise Authentication & Payments Routes
 *
 * Auth routes (email/password, JWT):
 *   POST /api/auth/signup
 *   POST /api/auth/login
 *   POST /api/auth/refresh
 *   POST /api/auth/forgot-password
 *   POST /api/auth/reset-password
 *   POST /api/auth/forgot-username
 *
 * Payment / billing routes:
 *   POST /api/webhooks/stripe   (raw body — webhook signature verified)
 *   POST /api/payments/create-intent
 *   POST /api/payments/confirm
 *   POST /api/payouts/send
 *
 * These routes complement (and do not replace) the existing Replit Auth + Stripe checkout flow.
 */
import type { Express, Request, Response } from "express";
import express from "express";
import { z } from "zod";
import {
  signup,
  login,
  forgotPassword,
  resetPassword,
  forgotUsername,
  refreshAccessToken,
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  forgotUsernameSchema,
} from "./lib/emailAuthService";
import { jwtMiddleware, requireJwt, getAuthUser } from "./lib/jwtAuth";
import { handleStripeWebhook } from "./lib/stripeWebhookHandler";
import { getUncachableStripeClient } from "./stripeClient";
import { db } from "./db";
import { payments, supplierPayouts, users } from "@shared/schema";
import { eq } from "drizzle-orm";

// ─── Helper: send a typed error response ──────────────────────────────────────
function apiError(res: Response, status: number, code: string, message: string) {
  res.status(status).json({ error: code, message });
}

// ─── Route handler wrapper — catches async errors ────────────────────────────
function handle(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response) => {
    fn(req, res).catch((err: any) => {
      const status  = err.status ?? 500;
      const code    = err.code ?? "INTERNAL_ERROR";
      const message = err.message ?? "An unexpected error occurred.";
      apiError(res, status, code, message);
    });
  };
}

export function registerAuthPaymentRoutes(app: Express): void {
  // Apply JWT middleware globally (non-blocking, reads Bearer header)
  app.use(jwtMiddleware);

  // ─── STRIPE WEBHOOK — must be BEFORE express.json() ────────────────────────
  // Uses raw body for signature verification. Registered as a special route.
  app.post(
    "/api/webhooks/stripe",
    express.raw({ type: "application/json" }),
    handle(async (req, res) => {
      await handleStripeWebhook(req, res);
    }),
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // AUTH ROUTES
  // ─────────────────────────────────────────────────────────────────────────────

  /** POST /api/auth/signup — create account with email + password */
  app.post("/api/auth/signup", handle(async (req, res) => {
    const result = await signup(req.body);
    res.status(201).json(result);
  }));

  /** POST /api/auth/login — email or username + password → JWT pair */
  app.post("/api/auth/login", handle(async (req, res) => {
    const result = await login(req.body);
    res.json(result);
  }));

  /** POST /api/auth/refresh — exchange refresh token for new access token */
  app.post("/api/auth/refresh", handle(async (req, res) => {
    const { refreshToken } = z.object({ refreshToken: z.string().min(1) }).parse(req.body);
    const result = await refreshAccessToken(refreshToken);
    res.json(result);
  }));

  /** POST /api/auth/forgot-password — generate hashed reset token (15 min TTL) */
  app.post("/api/auth/forgot-password", handle(async (req, res) => {
    const result = await forgotPassword(req.body);
    res.json(result);
  }));

  /** POST /api/auth/reset-password — validate token + set new hashed password */
  app.post("/api/auth/reset-password", handle(async (req, res) => {
    const result = await resetPassword(req.body);
    res.json(result);
  }));

  /** POST /api/auth/forgot-username — return masked username for an email */
  app.post("/api/auth/forgot-username", handle(async (req, res) => {
    const result = await forgotUsername(req.body);
    res.json(result);
  }));

  // ─────────────────────────────────────────────────────────────────────────────
  // PAYMENT ROUTES (require JWT or Replit session)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * POST /api/payments/create-intent
   * Body: { amount: number (cents), currency?: string, description?: string }
   * Returns: { clientSecret, paymentIntentId, paymentDbId }
   */
  app.post("/api/payments/create-intent", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }

    const { amount, currency = "usd", description } = z.object({
      amount:      z.number().int().positive("Amount must be a positive integer (cents)"),
      currency:    z.string().length(3).optional(),
      description: z.string().max(500).optional(),
    }).parse(req.body);

    // Validate amount server-side — never trust client totals
    if (amount <= 0) { apiError(res, 400, "INVALID_AMOUNT", "Amount must be > 0."); return; }

    const stripe = await getUncachableStripeClient();
    const pi = await stripe.paymentIntents.create({
      amount,
      currency,
      description,
      metadata: { userId: authUser.id, companyId: authUser.companyId ?? "" },
    });

    // Persist pending record
    const [paymentRow] = await db.insert(payments).values({
      userId:                authUser.id,
      companyId:             authUser.companyId,
      amount,
      currency,
      status:                "pending",
      stripePaymentIntentId: pi.id,
      description,
    }).returning();

    res.status(201).json({
      clientSecret:    pi.client_secret,
      paymentIntentId: pi.id,
      paymentDbId:     paymentRow.id,
    });
  }));

  /**
   * POST /api/payments/confirm
   * Body: { paymentIntentId: string }
   * Verifies payment status from Stripe (never trusts client claim), updates DB.
   */
  app.post("/api/payments/confirm", requireJwt, handle(async (req, res) => {
    const { paymentIntentId } = z.object({ paymentIntentId: z.string().min(1) }).parse(req.body);

    const stripe = await getUncachableStripeClient();
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Never mark succeeded based on client input — only on Stripe confirmation
    const status = pi.status === "succeeded" ? "succeeded" :
                   pi.status === "canceled"  ? "failed" : "pending";

    await db
      .update(payments)
      .set({ status, stripeChargeId: (pi.latest_charge as string) ?? null, updatedAt: new Date() })
      .where(eq(payments.stripePaymentIntentId, paymentIntentId));

    res.json({ status, paymentIntentId, stripeStatus: pi.status });
  }));

  /**
   * POST /api/payouts/send
   * Body: { supplierId, connectedAccountId, amount (cents), currency?, description? }
   * Initiates a Stripe Connect transfer and records it.
   */
  app.post("/api/payouts/send", requireJwt, handle(async (req, res) => {
    const authUser = getAuthUser(req);
    if (!authUser) { apiError(res, 401, "UNAUTHORIZED", "Authentication required."); return; }

    const { supplierId, connectedAccountId, amount, currency = "usd", description } = z.object({
      supplierId:           z.string().min(1),
      connectedAccountId:   z.string().min(1),
      amount:               z.number().int().positive(),
      currency:             z.string().length(3).optional(),
      description:          z.string().max(500).optional(),
    }).parse(req.body);

    if (amount <= 0) { apiError(res, 400, "INVALID_AMOUNT", "Amount must be > 0."); return; }

    const stripe = await getUncachableStripeClient();
    const transfer = await stripe.transfers.create({
      amount,
      currency,
      destination:  connectedAccountId,
      description,
      metadata:     { supplierId, companyId: authUser.companyId ?? "", requestedBy: authUser.id },
    });

    const [payoutRow] = await db.insert(supplierPayouts).values({
      supplierId,
      companyId:                  authUser.companyId,
      amount,
      currency,
      status:                     "sent",
      stripeTransferId:           transfer.id,
      stripeConnectedAccountId:   connectedAccountId,
      description,
    }).returning();

    res.status(201).json({
      transferId:  transfer.id,
      payoutDbId:  payoutRow.id,
      status:      "sent",
      amount,
      currency,
    });
  }));
}
