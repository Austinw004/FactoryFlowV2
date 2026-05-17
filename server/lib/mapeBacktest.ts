/**
 * Forecast Accuracy Back-fill (the missing piece of F2-FILED-013)
 *
 * server/lib/forecastMonitoring.ts already has a complete per-SKU MAPE
 * pipeline (`trackMAPEForSKU` → `createDegradationAlert`), and the
 * `trackForecastAccuracy` background job runs it every 4 hours. The
 * pipeline however depends on `multi_horizon_forecasts.actualDemand`
 * being populated — and nothing ever populates it. The accuracy
 * calculation filters `actualDemand IS NOT NULL AND > 0`, so in
 * production it always returns null and the alerts/tracking never fire.
 *
 * This module fills that gap by back-filling `actualDemand` (and the
 * derived per-row `accuracy`) from `demand_history` for any forecast
 * whose `forecastDate` has passed. After it runs, the existing
 * `trackAllSKUs` flow produces real metrics + real degradation alerts.
 *
 * Two callers wire it in:
 *   - `backgroundJobs.ts → trackForecastAccuracy` runs back-fill
 *     before `trackAllSKUs` on every 4h tick.
 *   - `POST /api/forecasts/backtest` exposes a manual trigger for
 *     admins / sales demos to populate accuracy on demand.
 *
 * Period alignment: `multi_horizon_forecasts.forecastDate` is text
 * "YYYY-MM-DD"; `demand_history.period` has no strict format across
 * the codebase. We try exact equality first, then fall back to summing
 * actuals whose `period` starts with the same YYYY-MM month bucket.
 */

import { db } from "../db";
import { multiHorizonForecasts, demandHistory } from "@shared/schema";
import { and, eq, isNull, sql } from "drizzle-orm";

export interface BackfillResult {
  companyId: string;
  candidatesScanned: number;
  forecastsBackfilled: number;
  durationMs: number;
}

/**
 * Best-effort lookup of actual demand for a forecast's target date.
 * Returns the units number if exactly resolvable, else null (caller
 * should skip — partial data is worse than a null gap in MAPE).
 */
async function resolveActualForForecast(
  skuId: string,
  forecastDate: string,
): Promise<number | null> {
  // Exact date match
  const exact = await db
    .select({ units: demandHistory.units })
    .from(demandHistory)
    .where(and(eq(demandHistory.skuId, skuId), eq(demandHistory.period, forecastDate)))
    .limit(1);
  if (exact[0]) return Number(exact[0].units);

  // Monthly bucket fallback
  const yyyymm = forecastDate.slice(0, 7);
  if (yyyymm.length !== 7) return null;

  const monthly = await db
    .select({ totalUnits: sql<number>`COALESCE(SUM(${demandHistory.units}), 0)` })
    .from(demandHistory)
    .where(and(eq(demandHistory.skuId, skuId), sql`${demandHistory.period} LIKE ${`${yyyymm}%`}`));

  const total = Number(monthly[0]?.totalUnits ?? 0);
  return total > 0 ? total : null;
}

/**
 * Back-fill `actualDemand` + `accuracy` on past forecasts. Idempotent:
 * only touches rows where `actualDemand IS NULL` and `forecastDate <=
 * today`. Hard-capped at 2000 rows per call so latency is bounded —
 * subsequent runs catch the tail.
 */
export async function backfillForecastActuals(companyId: string): Promise<BackfillResult> {
  const t0 = Date.now();
  const today = new Date().toISOString().slice(0, 10);

  const pending = await db
    .select({
      id: multiHorizonForecasts.id,
      skuId: multiHorizonForecasts.skuId,
      forecastDate: multiHorizonForecasts.forecastDate,
      predictedDemand: multiHorizonForecasts.predictedDemand,
    })
    .from(multiHorizonForecasts)
    .where(
      and(
        eq(multiHorizonForecasts.companyId, companyId),
        isNull(multiHorizonForecasts.actualDemand),
        sql`${multiHorizonForecasts.forecastDate} <= ${today}`,
      ),
    )
    .limit(2000);

  let backfilled = 0;
  for (const row of pending) {
    const actual = await resolveActualForForecast(row.skuId, row.forecastDate);
    if (actual === null || actual === 0) continue;
    const predicted = Number(row.predictedDemand);
    const mapePoint = Math.abs(actual - predicted) / Math.abs(actual) * 100;

    await db.update(multiHorizonForecasts)
      .set({ actualDemand: actual, accuracy: mapePoint })
      .where(eq(multiHorizonForecasts.id, row.id));
    backfilled++;
  }

  const durationMs = Date.now() - t0;
  console.log(`[MapeBackfill] company=${companyId} scanned=${pending.length} backfilled=${backfilled} took=${durationMs}ms`);

  return {
    companyId,
    candidatesScanned: pending.length,
    forecastsBackfilled: backfilled,
    durationMs,
  };
}
