import type { Regime } from "./economics";

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

export class DemandForecaster {
  private historyBySku: Record<string, number[]>;

  constructor(historyBySku: Record<string, number[]>) {
    this.historyBySku = historyBySku || {};
  }

  forecast(sku: string, monthsAhead: number = 3, regime: Regime = "HEALTHY_EXPANSION"): number[] {
    const history = this.historyBySku[sku] || [];
    const base = exponentialSmoothing(history, 0.45);
    
    const regimeFactor: Record<Regime, number> = {
      IMBALANCED_EXCESS: 0.92,
      ASSET_LED_GROWTH: 0.96,
      HEALTHY_EXPANSION: 1.00,
      REAL_ECONOMY_LEAD: 1.05,
    };
    
    const factor = regimeFactor[regime] || 1.0;
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
}
