import type { Regime } from "./economics";
import { regimeIntelligence } from "./regimeIntelligence";

function movingAverage(series: number[], window: number): number {
  if (window <= 0 || !series.length) return 0.0;
  const w = Math.min(window, series.length);
  return series.slice(-w).reduce((sum, val) => sum + val, 0) / w;
}

function exponentialSmoothing(series: number[], alpha: number = 0.4): number {
  if (!series.length) return 0.0;
  let s = series[0];
  for (let i = 1; i < series.length; i++) {
    s = alpha * series[i] + (1 - alpha) * s;
  }
  return s;
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
   * Get regime factor - uses optimized data-driven factor if available
   * Falls back to default static factors if not enough data
   */
  private getRegimeFactor(regime: Regime): number {
    if (this.useOptimizedFactors) {
      return regimeIntelligence.getOptimizedRegimeFactor(regime);
    }
    return DEFAULT_REGIME_FACTORS[regime] || 1.0;
  }

  /**
   * Calculate confidence-adjusted forecast
   * Uses regime confidence to adjust forecast bounds
   */
  forecastWithConfidence(sku: string, monthsAhead: number = 3, regime: Regime = "HEALTHY_EXPANSION"): {
    forecasts: number[];
    lowerBounds: number[];
    upperBounds: number[];
    confidence: number;
    regimeFactor: number;
  } {
    const confidence = regimeIntelligence.calculateRegimeConfidence();
    const forecasts = this.forecast(sku, monthsAhead, regime);
    const regimeFactor = this.getRegimeFactor(regime);
    
    // Adjust bounds based on regime confidence
    const uncertaintyMultiplier = 1 + (1 - confidence.overall) * 0.3;
    
    const lowerBounds = forecasts.map(f => f * (1 - 0.15 * uncertaintyMultiplier));
    const upperBounds = forecasts.map(f => f * (1 + 0.15 * uncertaintyMultiplier));
    
    return {
      forecasts,
      lowerBounds,
      upperBounds,
      confidence: confidence.overall,
      regimeFactor,
    };
  }

  forecast(sku: string, monthsAhead: number = 3, regime: Regime = "HEALTHY_EXPANSION"): number[] {
    const history = this.historyBySku[sku] || [];
    const base = exponentialSmoothing(history, 0.45);
    
    // Use optimized or default regime factor
    const factor = this.getRegimeFactor(regime);
    
    const seasonality = movingAverage(history, 12);
    let seasonFactor = 1.0;
    if (seasonality > 0) {
      seasonFactor = clamp(base / seasonality, 0.85, 1.15);
    }
    
    const forecasts: number[] = [];
    const level = base * factor * seasonFactor;
    
    for (let h = 1; h <= monthsAhead; h++) {
      const damp = 1.0 - 0.06 * (h - 1);
      forecasts.push(Math.max(0.0, level * damp));
    }
    
    return forecasts;
  }

  /**
   * Record actual vs predicted for regime factor optimization
   * Called when actual demand becomes known
   */
  recordActualDemand(sku: string, predicted: number, actual: number, regime: Regime): void {
    regimeIntelligence.updateRegimeFactorFromAccuracy(regime, predicted, actual);
  }
}
