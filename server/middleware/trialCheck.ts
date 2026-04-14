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
import { eq, and } from "drizzle-orm";

export async function checkTrialExpiry(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    // Trial expired — check for active Stripe subscription
    const [activeSub] = await db
      .select({ id: subscriptions.id, status: subscriptions.status })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, "active")
        )
      )
      .limit(1);

    // Has active subscription — allow
    if (activeSub) {
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
