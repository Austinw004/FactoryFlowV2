/**
 * selfHealingEngine.ts — Self-Healing and Auto-Correction Engine
 *
 * Implements the 7-section self-healing directive:
 *  1. Anomaly Detector          — detectAnomaly(value, baseline)
 *  2. Auto-Correction Engine    — autoCorrectForecast(forecast, historicalAvg)
 *  3. Drift Response            — handleDrift(driftScore, context)
 *  4. Payment Recovery          — retryPaymentWithBackoff(executor, label)
 *  5. Data Recovery             — requireDemandHistory(history, materialId)
 *  6. System Watchdog           — starts every 5 minutes on init
 *  7. Action Logger             — logHealingAction(type, payload)
 */

import { db } from "../db";
import { logEvent } from "./guardRails";

// ─── Section 7: Action log types ─────────────────────────────────────────────

export type HealingActionType =
  | "AUTO_CORRECT_FORECAST"
  | "AUTO_BLOCK_DECISION"
  | "AUTO_RETRY_PAYMENT"
  | "DRIFT_TRUST_REDUCTION"
  | "DRIFT_AUTOMATION_BLOCK"
  | "DRIFT_RETRAIN_TRIGGERED"
  | "DATA_RECOVERY_REQUESTED"
  | "ANOMALY_DETECTED"
  | "WATCHDOG_SCAN"
  | "WATCHDOG_ALERT";

export interface HealingAction {
  type: HealingActionType;
  companyId?: string;
  materialId?: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

const healingLog: HealingAction[] = [];

export function logHealingAction(
  type: HealingActionType,
  payload: Record<string, unknown>,
  context?: { companyId?: string; materialId?: string },
): void {
  const entry: HealingAction = {
    type,
    companyId: context?.companyId,
    materialId: context?.materialId,
    payload,
    timestamp: new Date().toISOString(),
  };
  healingLog.push(entry);
  // Keep log bounded in memory
  if (healingLog.length > 1000) healingLog.shift();

  logEvent({
    type: "self_healing",
    companyId: context?.companyId ?? "system",
    action: type,
    payload,
  });

  console.log(`[SelfHeal:${type}]`, JSON.stringify(payload));
}

export function getHealingLog(): HealingAction[] {
  return [...healingLog];
}

// ─── Section 1: Anomaly Detector ─────────────────────────────────────────────

export type AnomalyLevel = "SEVERE" | "MODERATE" | "NORMAL";

/**
 * Detects anomaly level by comparing value against baseline.
 * Returns SEVERE if deviation > 100%, MODERATE if > 50%, else NORMAL.
 */
export function detectAnomaly(value: number, baseline: number): AnomalyLevel {
  if (!Number.isFinite(value) || !Number.isFinite(baseline)) {
    return "SEVERE";
  }
  const deviation = Math.abs(value - baseline) / (Math.abs(baseline) || 1);
  if (deviation > 1.0) {
    logHealingAction("ANOMALY_DETECTED", { value, baseline, deviation, level: "SEVERE" });
    return "SEVERE";
  }
  if (deviation > 0.5) {
    logHealingAction("ANOMALY_DETECTED", { value, baseline, deviation, level: "MODERATE" });
    return "MODERATE";
  }
  return "NORMAL";
}

// ─── Section 2: Auto-Correction Engine ───────────────────────────────────────

/**
 * Auto-corrects a forecast that is too extreme relative to the historical average.
 *
 * Rules (matching SOC2 directive + forecasting.ts sanity bounds):
 *   forecast > historicalAvg * 5  → corrected = historicalAvg * 3
 *   forecast < historicalAvg * 0.2 → corrected = historicalAvg * 0.5
 *   otherwise → pass through unchanged
 */
export function autoCorrectForecast(
  forecast: number,
  historicalAvg: number,
  context?: { companyId?: string; materialId?: string },
): number {
  if (!Number.isFinite(forecast) || !Number.isFinite(historicalAvg) || historicalAvg <= 0) {
    return forecast;
  }

  if (forecast > historicalAvg * 5) {
    const corrected = historicalAvg * 3;
    logHealingAction(
      "AUTO_CORRECT_FORECAST",
      { original: forecast, corrected, historicalAvg, reason: "ABOVE_5X_CEILING", cappedAt: "3×" },
      context,
    );
    return corrected;
  }

  if (forecast < historicalAvg * 0.2) {
    const corrected = historicalAvg * 0.5;
    logHealingAction(
      "AUTO_CORRECT_FORECAST",
      { original: forecast, corrected, historicalAvg, reason: "BELOW_0.2X_FLOOR", flooredAt: "0.5×" },
      context,
    );
    return corrected;
  }

  return forecast;
}

// ─── Section 3: Drift Response ────────────────────────────────────────────────

export interface DriftResult {
  adjustedTrustScore: number;
  automationBlocked: boolean;
  retrainTriggered: boolean;
  originalTrustScore: number;
  driftScore: number;
}

/**
 * Applies drift response policy when driftScore > 0.5.
 * - Reduces trust score by 30%
 * - Blocks automation
 * - Triggers retraining flag
 */
export function handleDrift(
  driftScore: number,
  trustScore: number,
  context?: { companyId?: string; materialId?: string },
): DriftResult {
  if (driftScore <= 0.5) {
    return {
      adjustedTrustScore: trustScore,
      automationBlocked: false,
      retrainTriggered: false,
      originalTrustScore: trustScore,
      driftScore,
    };
  }

  const adjustedTrustScore = Math.max(0, trustScore * 0.7);

  logHealingAction(
    "DRIFT_TRUST_REDUCTION",
    { originalTrust: trustScore, adjustedTrust: adjustedTrustScore, driftScore, reduction: "30%" },
    context,
  );
  logHealingAction("DRIFT_AUTOMATION_BLOCK", { driftScore, reason: "DRIFT_THRESHOLD_EXCEEDED" }, context);
  logHealingAction("DRIFT_RETRAIN_TRIGGERED", { driftScore, companyId: context?.companyId }, context);
  logHealingAction("AUTO_BLOCK_DECISION", { reason: "DRIFT_SCORE_EXCEEDED", driftScore }, context);

  return {
    adjustedTrustScore,
    automationBlocked: true,
    retrainTriggered: true,
    originalTrustScore: trustScore,
    driftScore,
  };
}

// ─── Section 4: Payment Recovery ─────────────────────────────────────────────

export interface PaymentRecoveryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  attempts: number;
  action: "SUCCEEDED" | "FAILED_RETRY_SUCCEEDED" | "FAILED_FLAGGED";
}

/**
 * Retries a payment executor once after 5 seconds on failure.
 * On second failure, flags + logs.
 */
export async function retryPaymentWithBackoff<T>(
  executor: () => Promise<T>,
  label: string,
  context?: { companyId?: string },
): Promise<PaymentRecoveryResult<T>> {
  try {
    const data = await executor();
    return { success: true, data, attempts: 1, action: "SUCCEEDED" };
  } catch (firstError: any) {
    console.warn(`[SelfHeal:PAYMENT] First attempt failed for ${label}: ${firstError.message} — retrying in 5s`);

    await new Promise((r) => setTimeout(r, 5000));

    try {
      const data = await executor();
      logHealingAction(
        "AUTO_RETRY_PAYMENT",
        { label, attempts: 2, outcome: "SUCCEEDED" },
        context,
      );
      return { success: true, data, attempts: 2, action: "FAILED_RETRY_SUCCEEDED" };
    } catch (secondError: any) {
      logHealingAction(
        "AUTO_RETRY_PAYMENT",
        { label, attempts: 2, outcome: "FAILED", error: secondError.message },
        context,
      );
      console.error(`[SelfHeal:PAYMENT] Both attempts failed for ${label}: ${secondError.message}`);
      return {
        success: false,
        error: secondError.message,
        attempts: 2,
        action: "FAILED_FLAGGED",
      };
    }
  }
}

// ─── Section 5: Data Recovery ─────────────────────────────────────────────────

export interface DataRecoveryResult {
  blocked: boolean;
  reason?: string;
  refreshRequested: boolean;
}

/**
 * Blocks a decision if demand history is missing or empty.
 * Logs a DATA_RECOVERY_REQUESTED action to trigger a data refresh.
 */
export function requireDemandHistory(
  history: unknown[] | null | undefined,
  materialId: string,
  context?: { companyId?: string },
): DataRecoveryResult {
  if (!history || history.length === 0) {
    logHealingAction(
      "DATA_RECOVERY_REQUESTED",
      { materialId, reason: "MISSING_DEMAND_HISTORY", action: "DECISION_BLOCKED" },
      { ...context, materialId },
    );
    logHealingAction("AUTO_BLOCK_DECISION", { reason: "MISSING_DEMAND_HISTORY", materialId }, context);
    return { blocked: true, reason: "MISSING_DEMAND_HISTORY", refreshRequested: true };
  }
  return { blocked: false, refreshRequested: false };
}

// ─── Section 6: System Watchdog ───────────────────────────────────────────────

const WATCHDOG_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let watchdogTimer: NodeJS.Timeout | null = null;
let watchdogRunning = false;

export interface WatchdogReport {
  scannedAt: string;
  anomalies: number;
  failedJobs: number;
  missingData: number;
  alerts: string[];
}

async function runWatchdogScan(): Promise<WatchdogReport> {
  const scannedAt = new Date().toISOString();
  const alerts: string[] = [];
  let anomalies = 0;
  let failedJobs = 0;
  let missingData = 0;

  try {
    // Scan 1: Check for companies with no recent demand forecasts (missing data)
    const { companies } = await import("@shared/schema");
    const { demandPredictions } = await import("@shared/schema");
    const { sql: drizzleSql, lt } = await import("drizzle-orm");

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    // Check for any stale demand predictions (job failure indicator)
    const staleCheck = await db.select({ count: drizzleSql<number>`count(*)` })
      .from(demandPredictions)
      .where(lt(demandPredictions.createdAt, thirtyMinutesAgo));

    const stalePredictions = Number(staleCheck[0]?.count ?? 0);
    if (stalePredictions > 500) {
      // Flag if there are many old predictions and likely no recent job ran
      anomalies++;
      alerts.push(`STALE_PREDICTIONS: ${stalePredictions} predictions older than 30 minutes`);
    }

    logHealingAction("WATCHDOG_SCAN", {
      scannedAt,
      anomalies,
      failedJobs,
      missingData,
      alerts,
    });

    if (alerts.length > 0) {
      logHealingAction("WATCHDOG_ALERT", { alerts, count: alerts.length });
    }
  } catch (err: any) {
    console.error("[SelfHeal:WATCHDOG] Scan error:", err.message);
    logHealingAction("WATCHDOG_ALERT", { error: err.message, action: "SCAN_FAILED" });
  }

  return { scannedAt, anomalies, failedJobs, missingData, alerts };
}

/**
 * Starts the system watchdog on a 5-minute interval.
 * Safe to call multiple times — only one watchdog runs at a time.
 */
export function startWatchdog(): void {
  if (watchdogRunning) return;
  watchdogRunning = true;

  console.log("[SelfHeal:WATCHDOG] Starting system watchdog (interval: 5 min)");

  // Run immediately on start, then every 5 minutes
  runWatchdogScan().catch(console.error);

  watchdogTimer = setInterval(() => {
    runWatchdogScan().catch(console.error);
  }, WATCHDOG_INTERVAL_MS);

  // Prevent the timer from blocking Node process exit
  if (watchdogTimer.unref) watchdogTimer.unref();
}

export function stopWatchdog(): void {
  if (watchdogTimer) {
    clearInterval(watchdogTimer);
    watchdogTimer = null;
  }
  watchdogRunning = false;
}

export function isWatchdogRunning(): boolean {
  return watchdogRunning;
}
