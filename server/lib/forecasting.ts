import type { Regime } from "./economics";
import { regimeIntelligence } from "./regimeIntelligence";
import { db } from "../db";
import { demandHistory, predictionAccuracyMetrics } from "@shared/schema";
import { eq, desc, avg } from "drizzle-orm";

function movingAverage(series: number[], window: number): number {
  if (window <= 0 || !series.length) return 0.0;
  const w = Math.min(window, series.length);
  return series.slice(-w).reduce((sum, val) => sum + val, 0) / w;
}

function exponentialSmoothing(series: number[], alpha: number = 0.4): number {
  if (!series.length) return 0.0;
  // Initialize at median to reduce first-observation bias (SF-004)
  const sorted = [...series].sort((a, b) => a - b);
  let s = sorted[Math.floor(sorted.length / 2)];
  for (let i = 0; i < series.length; i++) {
    s = alpha * series[i] + (1 - alpha) * s;
  }
  return s;
}

export function calculateMAPE(actuals: number[], forecasts: number[]): number {
  const pairs = actuals
    .map((a, i) => ({ actual: a, forecast: forecasts[i] }))
    .filter(p => p.forecast !== undefined && p.actual > 0);
  if (pairs.length === 0) return 0.15;
  const mape = pairs.reduce((sum, p) => sum + Math.abs(p.actual - p.forecast) / p.actual, 0) / pairs.length;
  return Math.max(0.05, Math.min(1.0, mape));
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

// Default regime factors (fallback when no learned factors available)
const DEFAULT_REGIME_FACTORS: Record<Regime, number> = {
  IMBALANCED_EXCESS: 0.92,
  ASSET_LED_GROWTH: 0.96,
  HEALTHY_EXPANSION: 1.00,
  REAL_ECONOMY_LEAD: 1.05,
};

export class DemandForecaster {
  private historyBySku: Record<string, number[]>;
  private useOptimizedFactors: boolean;

  constructor(historyBySku: Record<string, number[]>, useOptimizedFactors: boolean = true) {
    this.historyBySku = historyBySku || {};
    this.useOptimizedFactors = useOptimizedFactors;
  }

  /**
   * FIX 1 (SF-001): Fetch real demand history for a material/SKU from the database.
   * Queries demandHistory by skuId (materialId used as identifier).
   * Returns an array of unit demand values sorted ascending by period.
   */
  static async getDemandHistory(materialId: string): Promise<number[]> {
    try {
      const rows = await db
        .select()
        .from(demandHistory)
        .where(eq(demandHistory.skuId, materialId))
        .orderBy(demandHistory.period);
      if (rows.length > 0) {
        return rows.map(r => Number(r.units)).filter(u => isFinite(u) && u >= 0);
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * FIX 1 (SF-001): Calculate average daily demand from a demand history array.
   * Throws if history is insufficient — callers must handle gracefully.
   */
  static calculateAverageDemand(history: number[]): number {
    if (!history || history.length === 0) {
      throw new Error("INSUFFICIENT_DEMAND_DATA: history array is empty");
    }
    const sum = history.reduce((a, b) => a + b, 0);
    const mean = sum / history.length;
    if (!isFinite(mean) || mean < 0) {
      throw new Error("INSUFFICIENT_DEMAND_DATA: computed mean is invalid");
    }
    return mean;
  }

  /**
   * FIX 6 (SF-003): Fetch historical MAPE for a company from predictionAccuracyMetrics.
   * Returns the mean MAPE across all recorded prediction accuracy rows.
   * Falls back to 0.15 (15%) when no records exist, with explicit logging.
   */
  static async getHistoricalMAPE(companyId: string): Promise<number> {
    try {
      const rows = await db
        .select({ avgMape: avg(predictionAccuracyMetrics.meanAbsolutePercentageError) })
        .from(predictionAccuracyMetrics)
        .where(eq(predictionAccuracyMetrics.companyId, companyId));
      const mape = rows[0]?.avgMape ? Number(rows[0].avgMape) : null;
      if (mape !== null && isFinite(mape) && mape > 0) {
        return Math.max(0.05, Math.min(1.0, mape / 100));
      }
      console.log(`[Forecasting:AUDIT] No MAPE records for company ${companyId} — using fallback 0.15 (15%)`);
      return 0.15;
    } catch {
      console.log(`[Forecasting:AUDIT] MAPE lookup failed — using fallback 0.15`);
      return 0.15;
    }
  }

  private getRegimeFactor(regime: Regime): number {
    if (this.useOptimizedFactors) {
      return regimeIntelligence.getOptimizedRegimeFactor(regime);
    }
    return DEFAULT_REGIME_FACTORS[regime] || 1.0;
  }

  /**
   * FIX 6 (SF-003): Confidence-adjusted forecast with MAPE-derived bounds.
   * Accepts an optional historicalMape (0–1 fraction); falls back to 0.15 if not provided.
   * Seasonality cap raised from ±15% to ±40% to allow real seasonal amplitude (SF-005 partial fix).
   */
  forecastWithConfidence(
    sku: string,
    monthsAhead: number = 3,
    regime: Regime = "HEALTHY_EXPANSION",
    historicalMape: number = 0.15,
  ): {
    forecasts: number[];
    lowerBounds: number[];
    upperBounds: number[];
    confidence: number;
    regimeFactor: number;
    mapeSource: string;
  } {
    const confidence = regimeIntelligence.calculateRegimeConfidence();
    const forecasts = this.forecast(sku, monthsAhead, regime);
    const regimeFactor = this.getRegimeFactor(regime);

    // FIX 6: errorFactor derived from actual MAPE, not hardcoded ±15%
    const errorFactor = Math.max(historicalMape, 0.05);
    const uncertaintyMultiplier = 1 + (1 - confidence.overall) * 0.3;
    const adjustedError = errorFactor * uncertaintyMultiplier;

    const lowerBounds = forecasts.map(f => Math.max(0, f * (1 - adjustedError)));
    const upperBounds = forecasts.map(f => f * (1 + adjustedError));

    const mapeSource = historicalMape === 0.15 ? "fallback_0.15" : `measured_${(historicalMape * 100).toFixed(1)}pct`;
    console.log(`[Forecasting:AUDIT] sku=${sku} regime=${regime} mapeSource=${mapeSource} errorFactor=${adjustedError.toFixed(4)}`);

    return {
      forecasts,
      lowerBounds,
      upperBounds,
      confidence: confidence.overall,
      regimeFactor,
      mapeSource,
    };
  }

  forecast(sku: string, monthsAhead: number = 3, regime: Regime = "HEALTHY_EXPANSION"): number[] {
    const history = this.historyBySku[sku] || [];
    const base = exponentialSmoothing(history, 0.45);

    const factor = this.getRegimeFactor(regime);

    const seasonality = movingAverage(history, 12);
    let seasonFactor = 1.0;
    if (seasonality > 0) {
      // FIX (SF-005): raised cap from ±15% to ±40% to allow real seasonal amplitude
      seasonFactor = clamp(base / seasonality, 0.60, 1.40);
    }

    const forecasts: number[] = [];
    const level = base * factor * seasonFactor;

    for (let h = 1; h <= monthsAhead; h++) {
      const damp = 1.0 - 0.06 * (h - 1);
      forecasts.push(Math.max(0.0, level * damp));
    }

    return forecasts;
  }

  recordActualDemand(sku: string, predicted: number, actual: number, regime: Regime): void {
    regimeIntelligence.updateRegimeFactorFromAccuracy(regime, predicted, actual);
  }
}
