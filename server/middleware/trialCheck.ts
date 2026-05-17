/**
 * Trial Expiry Check Middleware
 *
 * On every authenticated request, checks if user's trial has expired.
 * If trial expired AND no active Stripe subscription, returns 402 Payment Required.
 *
 * Rules:
 * - If user.trialEndsAt is NULL, treat as no trial (early adopter, grandfathered)
 * - If trialEndsAt > NOW(), trial is active — continue
 * - If trialEndsAt <= NOW() AND (no subscription OR subscription.status != 'active'), return 402
 * - If subscription is active (paid), allow through regardless of trial
 */
import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { users, subscriptions } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";

/**
 * Path allowlist that bypasses trial-check. Without this, a user whose
 * 90-day trial expired without an active subscription got 402 on
 * EVERY endpoint — including /api/billing/* and /api/auth/*, the very
 * endpoints they needed to upgrade their plan. Chicken-and-egg.
 *
 * Round-14 audit caught this. Allowlist covers:
 *   - All auth flows (login, logout, refresh, forgot-password, signup,
 *     etc.) so users can sign out, recover access, refresh their token
 *   - All billing flows (subscribe, setup-intent, create-customer,
 *     payment-methods, plans, etc.) so users can actually upgrade
 *   - Email integration diag for ops debugging
 *   - Stripe webhooks (must always be reachable for Stripe to call us)
 */
const TRIAL_CHECK_EXEMPT_PREFIXES = [
  "/api/auth/",
  "/api/billing/",
  "/api/payments/",
  "/api/webhooks/",
  "/api/integrations/email/diag",
  "/api/user/profile", // viewing your own profile shouldn't require active trial
];

export async function checkTrialExpiry(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Path-based bypass — see TRIAL_CHECK_EXEMPT_PREFIXES.
  if (TRIAL_CHECK_EXEMPT_PREFIXES.some(p => req.path.startsWith(p))) {
    return next();
  }

  const authUser = (req as any).jwtUser || (req as any).user;

  // Not authenticated — skip (let auth middleware handle it)
  if (!authUser) {
    return next();
  }

  const userId = authUser.sub || authUser.claims?.sub || authUser.id;

  try {
    // Get user with trial info
    const [user] = await db
      .select({ id: users.id, trialEndsAt: users.trialEndsAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      // User not found — auth middleware will catch this elsewhere
      return next();
    }

    // No trial set (grandfathered user or early adopter) — allow
    if (!user.trialEndsAt) {
      return next();
    }

    const now = new Date();
    const trialEndsAt = new Date(user.trialEndsAt);

    // Trial still active — allow
    if (trialEndsAt > now) {
      return next();
    }

    // Trial expired — check for any subscription status that counts as
    // valid paid access. "active" means Stripe is charging successfully.
    // "trialing" is a sales-issued trial extension (createSubscription
    // sets this when trialDays > 0). Both unlock access. "pending_setup",
    // "incomplete", "past_due", and "cancelled" do NOT.
    const [validSub] = await db
      .select({ id: subscriptions.id, status: subscriptions.status })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          inArray(subscriptions.status, ["active", "trialing"]),
        ),
      )
      .limit(1);

    // Has valid subscription — allow
    if (validSub) {
      return next();
    }

    // Trial expired AND no active subscription — reject with 402
    res.status(402).json({
      error: "PAYMENT_REQUIRED",
      message: "Your trial has ended. Please upgrade to a paid plan to continue.",
      trialEndsAt: trialEndsAt.toISOString(),
      upgradeUrl: `${process.env.APP_URL ?? ""}/billing/upgrade`,
    });
  } catch (err) {
    console.error("[TrialCheck] Error checking trial status:", err);
    // Non-fatal — log but don't block (default to allowing access)
    next();
  }
}
