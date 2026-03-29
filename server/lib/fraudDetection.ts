/**
 * Fraud Detection Service
 *
 * Computes a real-time fraud risk score (0.0 – 1.0) for transactions.
 * Risk score thresholds:
 *   >= 0.9 → BLOCKED (transaction rejected)
 *   >= 0.7 → REQUIRES_APPROVAL (manual review)
 *   <  0.7 → ALLOWED
 *
 * All fraud events are logged immutably in the fraud_events table.
 */
import { db } from "../db";
import { transactions, fraudEvents, type Transaction } from "@shared/schema";
import { eq, gte, and, sql } from "drizzle-orm";
import { logger } from "./structuredLogger";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FraudCheckInput {
  userId:       string;
  companyId?:   string | null;
  amount:       number;          // in cents
  currency?:    string;
  ipAddress?:   string;
  userAgent?:   string;
  deviceFingerprint?: string;
  metadata?:    Record<string, unknown>;
}

export interface FraudFlag {
  rule:   string;
  detail: string;
  weight: number;   // additive contribution to fraud score
}

export interface FraudCheckResult {
  score:            number;      // 0.0 – 1.0
  outcome:          "allowed" | "requires_approval" | "blocked";
  flags:            FraudFlag[];
  requiresApproval: boolean;
  blocked:          boolean;
}

// ─── Fraud rule engine ────────────────────────────────────────────────────────

const BLOCK_THRESHOLD    = 0.9;
const APPROVAL_THRESHOLD = 0.7;

// Look-back window for historical average and rapid retries
const HISTORICAL_WINDOW_DAYS = 30;
const RAPID_RETRY_WINDOW_MS  = 5 * 60 * 1000;  // 5 minutes
const RAPID_RETRY_MAX        = 5;               // > 5 payments in window = suspicious

export async function checkFraud(input: FraudCheckInput): Promise<FraudCheckResult> {
  const flags: FraudFlag[] = [];
  let score = 0;

  // ── Rule 1: Transaction > 3x historical average ───────────────────────────
  try {
    const since = new Date(Date.now() - HISTORICAL_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const result = await db.execute(
      sql`SELECT AVG(amount)::float AS avg_amount, COUNT(*) AS tx_count
          FROM transactions
          WHERE user_id = ${input.userId}
            AND created_at >= ${since}
            AND status != 'blocked'`
    );
    const row = (result.rows as any[])[0];
    const avgAmount: number = row?.avg_amount ?? 0;
    const txCount: number   = Number(row?.tx_count ?? 0);

    if (txCount >= 3 && avgAmount > 0 && input.amount > avgAmount * 3) {
      const multiplier = input.amount / avgAmount;
      const weight = Math.min(0.4, 0.2 + (multiplier - 3) * 0.05);
      flags.push({
        rule:   "AMOUNT_EXCEEDS_3X_AVERAGE",
        detail: `Amount $${(input.amount / 100).toFixed(2)} is ${multiplier.toFixed(1)}x the ${HISTORICAL_WINDOW_DAYS}-day average of $${(avgAmount / 100).toFixed(2)}`,
        weight,
      });
      score += weight;
    }
  } catch (err: any) {
    logger.warn("fraud" as any, "Rule 1 check failed", { error: err.message });
  }

  // ── Rule 2: New device + large transaction ────────────────────────────────
  if (input.deviceFingerprint && input.amount > 50000) { // > $500
    try {
      const knownDevice = await db.execute(
        sql`SELECT COUNT(*) AS cnt FROM auth_sessions
            WHERE user_id = ${input.userId}
              AND device_fingerprint = ${input.deviceFingerprint}
              AND created_at < NOW() - INTERVAL '24 hours'`
      );
      const cnt = Number((knownDevice.rows as any[])[0]?.cnt ?? 0);
      if (cnt === 0) {
        const weight = 0.3;
        flags.push({
          rule:   "NEW_DEVICE_LARGE_TRANSACTION",
          detail: `Unrecognized device fingerprint for transaction of $${(input.amount / 100).toFixed(2)}`,
          weight,
        });
        score += weight;
      }
    } catch (err: any) {
      logger.warn("fraud" as any, "Rule 2 check failed", { error: err.message });
    }
  }

  // ── Rule 3: Rapid repeated payment attempts ───────────────────────────────
  try {
    const rapidSince = new Date(Date.now() - RAPID_RETRY_WINDOW_MS);
    const recentResult = await db.execute(
      sql`SELECT COUNT(*) AS cnt FROM transactions
          WHERE user_id = ${input.userId}
            AND created_at >= ${rapidSince}`
    );
    const recentCount = Number((recentResult.rows as any[])[0]?.cnt ?? 0);
    if (recentCount > RAPID_RETRY_MAX) {
      const weight = Math.min(0.5, 0.2 + (recentCount - RAPID_RETRY_MAX) * 0.05);
      flags.push({
        rule:   "RAPID_PAYMENT_ATTEMPTS",
        detail: `${recentCount} payment attempts in the last ${RAPID_RETRY_WINDOW_MS / 60000} minutes (threshold: ${RAPID_RETRY_MAX})`,
        weight,
      });
      score += weight;
    }
  } catch (err: any) {
    logger.warn("fraud" as any, "Rule 3 check failed", { error: err.message });
  }

  // ── Rule 4: Very large single transaction (absolute threshold) ────────────
  if (input.amount > 1_000_000) { // > $10,000
    const weight = 0.2;
    flags.push({
      rule:   "HIGH_VALUE_TRANSACTION",
      detail: `Transaction of $${(input.amount / 100).toFixed(2)} exceeds $10,000 threshold`,
      weight,
    });
    score += weight;
  }

  // ── Rule 5: IP mismatch across multiple regions (stub — requires GeoIP) ──
  // EXPLICITLY STUBBED: Would require GeoIP database integration
  // When integrated: flag if input.ipAddress resolves to different country than usual

  // Clamp score to [0, 1]
  score = Math.min(1, score);

  const outcome: FraudCheckResult["outcome"] =
    score >= BLOCK_THRESHOLD    ? "blocked" :
    score >= APPROVAL_THRESHOLD ? "requires_approval" : "allowed";

  const result: FraudCheckResult = {
    score,
    outcome,
    flags,
    requiresApproval: outcome === "requires_approval",
    blocked:          outcome === "blocked",
  };

  // Log all fraud events (immutable audit record)
  await logFraudEvent(input, result);

  return result;
}

// ─── Immutable fraud event logger ─────────────────────────────────────────────

async function logFraudEvent(input: FraudCheckInput, result: FraudCheckResult): Promise<void> {
  try {
    await db.insert(fraudEvents).values({
      userId:      input.userId,
      companyId:   input.companyId ?? null,
      fraudScore:  result.score.toFixed(4),
      outcome:     result.outcome,
      flags:       result.flags,
      ipAddress:   input.ipAddress ?? null,
      userAgent:   input.userAgent ?? null,
      metadata:    input.metadata ?? null,
    });
  } catch (err: any) {
    // Never let fraud logging block a transaction — log but don't throw
    logger.error("fraud" as any, "Failed to log fraud event", { error: err.message });
  }
}

// ─── Mark transaction fraud event with transactionId ──────────────────────────

export async function linkFraudEventToTransaction(userId: string, transactionId: string): Promise<void> {
  try {
    await db.execute(
      sql`UPDATE fraud_events
          SET transaction_id = ${transactionId}
          WHERE user_id = ${userId}
            AND transaction_id IS NULL
          ORDER BY created_at DESC
          LIMIT 1`
    );
  } catch {
    // Non-fatal
  }
}
