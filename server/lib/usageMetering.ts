/**
 * Usage-Based Metering Service
 *
 * Handles recording and reporting metered usage to Stripe for billing.
 * For Usage-Based plan: $199/mo base + $2 per SKU over 100 (capped at $799)
 *
 * Daily job:
 * 1. For each company with Usage-Based subscription
 * 2. Count active SKUs (distinct SKUs created before today)
 * 3. Submit to Stripe via billing.meterEvents.create()
 * 4. Log for audit trail
 */

import { getUncachableStripeClient } from "../stripeClient";
import { db } from "../db";
import { usageEvents, subscriptions, skus, companies } from "@shared/schema";
import { eq, and, isNotNull, count, lt, desc } from "drizzle-orm";
import { retryWithBackoff } from "./retryWithBackoff";
import { logger } from "./structuredLogger";

// ── Constants ────────────────────────────────────────────────────────────

export const SKU_METERING_METER_ID = "meter_active_skus_monthly";
export const SKU_METERING_PRICE_ID = "price_1PqLmhPwb9yK6c3pE3c4d5e6"; // Placeholder; will be set to actual price

// Usage-based plan constants
export const USAGE_PLAN_ID = "usage_based";
export const BASE_SKU_THRESHOLD = 100;  // First 100 SKUs included
export const OVERAGE_RATE_CENTS = 200;  // $2.00 per additional SKU
export const MONTHLY_CAP_CENTS = 79900; // $799.00 cap

// ── Interfaces ──────────────────────────────────────────────────────────

export interface DailySkuCountSnapshot {
  companyId: string;
  countDate: Date;
  activeSkuCount: number;
  stripeMeterEventId?: string;
}

export interface MeteringResult {
  companyId: string;
  skuCount: number;
  submitted: boolean;
  stripeEventId?: string;
  error?: string;
  timestamp: Date;
}

// ── Core Metering Functions ─────────────────────────────────────────────

/**
 * Count active SKUs for a company as of the given date (exclusive).
 * "Active" means created before the date (included in billing period).
 */
export async function countActiveSKUs(
  companyId: string,
  asOfDate: Date = new Date(),
): Promise<number> {
  try {
    const result = await db
      .select({ count: count() })
      .from(skus)
      .where(
        and(
          eq(skus.companyId, companyId),
          lt(skus.createdAt, asOfDate),
        ),
      );

    const skuCount = result[0]?.count || 0;
    logger.info("sku_count", "skus_counted", {
      companyId,
      skuCount,
      asOfDate: asOfDate.toISOString(),
    });

    return skuCount;
  } catch (error) {
    logger.error("sku_count", "failed_to_count_skus", {
      companyId,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Record a usage event in the database (for audit trail).
 * This is separate from Stripe submission.
 */
export async function recordUsageEvent(
  companyId: string,
  eventType: string,
  quantity: number,
  metadata?: Record<string, any>,
): Promise<string> {
  try {
    const [result] = await db
      .insert(usageEvents)
      .values({
        companyId,
        metricType: eventType,
        quantity: String(quantity),
        valueCents: null, // Not applicable for SKU count
        reportedToStripe: 0,
        metadata: metadata ? JSON.stringify(metadata) : null,
      })
      .returning({ id: usageEvents.id });

    logger.info("usage_event", "recorded", {
      companyId,
      eventType,
      quantity,
      eventId: result.id,
    });

    return result.id;
  } catch (error) {
    logger.error("usage_event", "failed_to_record", {
      companyId,
      eventType,
      quantity,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Submit metering data to Stripe billing.meterEvents API.
 * Uses idempotency key to ensure no double-counting on retry.
 */
export async function submitToStripe(
  companyId: string,
  skuCount: number,
  eventDate: Date = new Date(),
): Promise<{ eventId: string; success: boolean }> {
  const stripe = await getUncachableStripeClient();

  // Idempotency key: {companyId}-{dateISO}
  // Ensures if submission retries, Stripe doesn't double-count
  const dateStr = eventDate.toISOString().split("T")[0];
  const idempotencyKey = `sku-count-${companyId}-${dateStr}`;

  const eventPayload = {
    event_name: "active_skus",
    timestamp: Math.floor(eventDate.getTime() / 1000), // UNIX timestamp
    value: String(skuCount),
    identifier: companyId, // Stripe uses this to group events per customer
  };

  try {
    const response = await retryWithBackoff(
      async () => {
        // Stripe API for meter events
        // POST /v1/billing/meter_events
        return await stripe.billing.meterEvents.create(
          eventPayload as any,
          {
            idempotencyKey,
          } as any,
        );
      },
      {
        attempts: 3,
        initialDelayMs: 500,
        maxDelayMs: 5000,
        onRetry: (error, attempt, nextDelay) => {
          logger.warn("stripe_meter_event", "retry", {
            companyId,
            attempt,
            nextDelayMs: nextDelay,
            errorMessage: error instanceof Error ? error.message : String(error),
          });
        },
      },
    );

    logger.info("stripe_meter_event", "submitted", {
      companyId,
      skuCount,
      eventId: (response as any)?.id,
      idempotencyKey,
    });

    return {
      eventId: (response as any)?.id || idempotencyKey,
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error("stripe_meter_event", "submission_failed", {
      companyId,
      skuCount,
      idempotencyKey,
      errorMessage,
      errorStack: error instanceof Error ? error.stack : undefined,
    });

    throw error;
  }
}

/**
 * Mark a usage event as reported to Stripe.
 */
export async function markEventReported(
  eventId: string,
  stripeEventId: string,
): Promise<void> {
  try {
    await db
      .update(usageEvents)
      .set({
        reportedToStripe: 1,
        stripeUsageRecordId: stripeEventId,
      })
      .where(eq(usageEvents.id, eventId));

    logger.info("usage_event", "marked_reported", {
      eventId,
      stripeEventId,
    });
  } catch (error) {
    logger.error("usage_event", "failed_to_mark_reported", {
      eventId,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
}

// ── Daily Job: Count SKUs for All Usage-Based Companies ──────────────────

/**
 * Daily metering job: run at midnight UTC.
 * For each Usage-Based company, count active SKUs and submit to Stripe.
 *
 * Called from a scheduled task or cron job.
 */
export async function runDailySkuMeteringJob(
  runDate: Date = new Date(),
): Promise<MeteringResult[]> {
  logger.info("metering_job", "started", {
    runDate: runDate.toISOString(),
  });

  try {
    // Find all companies with Usage-Based active subscriptions
    const usageBasedCompanies = await db
      .select({
        companyId: companies.id,
        companyName: companies.name,
        stripeSubscriptionId: subscriptions.stripeSubscriptionId,
      })
      .from(companies)
      .innerJoin(
        subscriptions,
        and(
          eq(subscriptions.companyId, companies.id),
          eq(subscriptions.planId, USAGE_PLAN_ID),
          eq(subscriptions.status, "active"),
        ),
      );

    logger.info("metering_job", "companies_found", {
      count: usageBasedCompanies.length,
    });

    const results: MeteringResult[] = [];

    for (const company of usageBasedCompanies) {
      try {
        // Count SKUs created before today (i.e., in billing period before today)
        const skuCount = await countActiveSKUs(company.companyId, runDate);

        // Record in usage_events table (audit trail)
        const eventId = await recordUsageEvent(
          company.companyId,
          "active_skus",
          skuCount,
          {
            submittedAt: runDate.toISOString(),
            subscription: company.stripeSubscriptionId,
          },
        );

        // Submit to Stripe
        const { eventId: stripeEventId } = await submitToStripe(
          company.companyId,
          skuCount,
          runDate,
        );

        // Mark event as reported
        await markEventReported(eventId, stripeEventId);

        results.push({
          companyId: company.companyId,
          skuCount,
          submitted: true,
          stripeEventId,
          timestamp: new Date(),
        });

        logger.info("metering_job", "company_processed", {
          companyId: company.companyId,
          companyName: company.companyName,
          skuCount,
          stripeEventId,
        });
      } catch (companyError) {
        const errorMessage =
          companyError instanceof Error
            ? companyError.message
            : String(companyError);

        results.push({
          companyId: company.companyId,
          skuCount: 0,
          submitted: false,
          error: errorMessage,
          timestamp: new Date(),
        });

        logger.error("metering_job", "company_processing_failed", {
          companyId: company.companyId,
          companyName: company.companyName,
          errorMessage,
        });

        // Don't throw; continue processing other companies
      }
    }

    logger.info("metering_job", "completed", {
      totalCompanies: usageBasedCompanies.length,
      successful: results.filter((r) => r.submitted).length,
      failed: results.filter((r) => !r.submitted).length,
    });

    return results;
  } catch (jobError) {
    logger.error("metering_job", "fatal_error", {
      errorMessage: jobError instanceof Error ? jobError.message : String(jobError),
      errorStack:
        jobError instanceof Error ? jobError.stack : undefined,
    });
    throw jobError;
  }
}

// ── Backfill: For companies with existing SKUs ──────────────────────────

/**
 * Backfill metering for a company: count existing SKUs and submit as of a date.
 * Used when a company switches to Usage-Based plan mid-month.
 */
export async function backfillSkuMetering(
  companyId: string,
  asOfDate: Date = new Date(),
): Promise<MeteringResult> {
  logger.info("metering_backfill", "started", {
    companyId,
    asOfDate: asOfDate.toISOString(),
  });

  try {
    // Count SKUs
    const skuCount = await countActiveSKUs(companyId, asOfDate);

    // Record event
    const eventId = await recordUsageEvent(
      companyId,
      "active_skus_backfill",
      skuCount,
      {
        backfilledAt: new Date().toISOString(),
      },
    );

    // Submit to Stripe
    const { eventId: stripeEventId } = await submitToStripe(
      companyId,
      skuCount,
      asOfDate,
    );

    // Mark reported
    await markEventReported(eventId, stripeEventId);

    const result: MeteringResult = {
      companyId,
      skuCount,
      submitted: true,
      stripeEventId,
      timestamp: new Date(),
    };

    logger.info("metering_backfill", "completed", {
      companyId,
      skuCount,
      stripeEventId,
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error("metering_backfill", "failed", {
      companyId,
      errorMessage,
    });

    throw error;
  }
}

// ── Metering Price Calculation (for reference/testing) ────────────────────

/**
 * Calculate the monthly metering cost for a given SKU count.
 * Returns cost in USD cents.
 *
 * Formula:
 *   Base fee: $199.00 (covers 100 SKUs)
 *   Overage: min(skuCount - 100, 0) * $2.00
 *   Capped at $799.00
 */
export function calculateMeteringCost(skuCount: number): number {
  const baseFee = 19900; // $199.00
  const threshold = 100;
  const overage = Math.max(0, skuCount - threshold);
  const overageCost = overage * OVERAGE_RATE_CENTS;
  const totalCost = baseFee + overageCost;

  // Cap at $799.00
  return Math.min(totalCost, MONTHLY_CAP_CENTS);
}

/**
 * Format metering cost for display.
 */
export function formatMeteringCost(costCents: number): string {
  return `$${(costCents / 100).toFixed(2)}`;
}

// Export types
export type { DailySkuCountSnapshot, MeteringResult };
