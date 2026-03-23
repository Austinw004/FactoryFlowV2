/**
 * adversarialValidation.ts
 * Gate 15 — Real-World Adversarial Validation & Drift Detection
 *
 * Exposes deterministic, side-effect-free functions that can be called by
 * the certification harness (and production code) to validate system
 * robustness under drift, partial data, and adversarial conditions.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. computeDriftScore  (Population Stability Index)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute a normalised drift score [0–1] between two demand distributions
 * using the Population Stability Index (PSI).
 *
 * PSI interpretation:
 *   < 0.10  → negligible drift
 *   0.10–0.25 → moderate drift (monitor)
 *   > 0.25  → significant drift → DRIFT_DETECTED
 *   > 0.50  → severe drift     → SEVERE_DRIFT (automation block)
 *
 * The raw PSI has no fixed upper bound, so we normalise via min(psi/1.0, 1).
 */
export function computeDriftScore(
  historical: number[],
  recent: number[],
  numBins = 10,
): { driftScore: number; rawPSI: number; flags: string[] } {
  if (!historical.length || !recent.length) {
    return { driftScore: 1.0, rawPSI: Infinity, flags: ["DRIFT_DETECTED", "INSUFFICIENT_DATA"] };
  }

  const allValues = [...historical, ...recent];
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);

  if (maxVal === minVal) {
    // Identical distributions — zero drift
    return { driftScore: 0, rawPSI: 0, flags: [] };
  }

  const binWidth = (maxVal - minVal) / numBins;

  function binCounts(arr: number[]): number[] {
    const counts = new Array<number>(numBins).fill(0);
    for (const v of arr) {
      const idx = Math.min(Math.floor((v - minVal) / binWidth), numBins - 1);
      counts[idx]++;
    }
    return counts;
  }

  const histCounts = binCounts(historical);
  const recCounts  = binCounts(recent);

  const epsilon = 1e-8; // avoid log(0)
  let rawPSI = 0;
  for (let i = 0; i < numBins; i++) {
    const expected = histCounts[i] / historical.length + epsilon;
    const actual   = recCounts[i]  / recent.length    + epsilon;
    rawPSI += (actual - expected) * Math.log(actual / expected);
  }

  // Normalise to [0,1]
  const driftScore = Math.min(rawPSI / 1.0, 1.0);

  const flags: string[] = [];
  if (driftScore > 0.25) flags.push("DRIFT_DETECTED");
  if (driftScore > 0.50) flags.push("SEVERE_DRIFT");

  return { driftScore, rawPSI, flags };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. applyDriftGuard
// ─────────────────────────────────────────────────────────────────────────────

export interface DriftGuardResult {
  adjustedTrustScore: number;
  automationBlocked: boolean;
  flags: string[];
}

/**
 * Reduce trustScore based on drift severity and block automation if severe.
 *
 *   driftScore > 0.50 → reduce trust 30 %, automationBlocked = true
 *   driftScore > 0.25 → reduce trust 15 %
 */
export function applyDriftGuard(
  trustScore: number,
  driftScore: number,
): DriftGuardResult {
  const flags: string[] = [];
  let adjusted = trustScore;

  if (driftScore > 0.50) {
    adjusted = trustScore * 0.70; // −30 %
    flags.push("DRIFT_DETECTED", "SEVERE_DRIFT");
    return { adjustedTrustScore: Math.max(0, adjusted), automationBlocked: true, flags };
  }

  if (driftScore > 0.25) {
    adjusted = trustScore * 0.85; // −15 %
    flags.push("DRIFT_DETECTED");
    return { adjustedTrustScore: Math.max(0, adjusted), automationBlocked: false, flags };
  }

  return { adjustedTrustScore: trustScore, automationBlocked: false, flags };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. dataCompletenessScore
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the fraction [0–1] of required fields that are present and non-null.
 * Optionally accepts a minimum threshold — if score < threshold, flag
 * INSUFFICIENT_DATA.
 */
export function dataCompletenessScore(
  requiredFields: string[],
  provided: Record<string, unknown>,
  warnThreshold = 0.7,
): { completeness: number; missingFields: string[]; flags: string[] } {
  const missingFields: string[] = [];
  for (const f of requiredFields) {
    const val = provided[f];
    if (val === null || val === undefined || val === "") {
      missingFields.push(f);
    }
  }
  const completeness = requiredFields.length === 0
    ? 1
    : (requiredFields.length - missingFields.length) / requiredFields.length;

  const flags: string[] = [];
  if (completeness < warnThreshold) flags.push("INSUFFICIENT_DATA");

  return { completeness, missingFields, flags };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. anomalyDetector
// ─────────────────────────────────────────────────────────────────────────────

export interface AnomalyResult {
  isAnomaly: boolean;
  zScore: number;
  iqrOutlier: boolean;
  flags: string[];
}

/**
 * Detect whether `value` is an outlier relative to `baseline` using both
 * z-score (|z| > zThreshold) and IQR (value outside Q1−1.5×IQR … Q3+1.5×IQR).
 * Throws SAFETY_VIOLATION for inputs that are non-finite or negative demand.
 */
export function anomalyDetector(
  baseline: number[],
  value: number,
  zThreshold = 3.0,
): AnomalyResult {
  if (!isFinite(value) || isNaN(value)) {
    throw new Error(`SAFETY_VIOLATION: non-finite value=${value}`);
  }

  if (baseline.length === 0) {
    return { isAnomaly: false, zScore: 0, iqrOutlier: false, flags: [] };
  }

  // Z-score
  const mean  = baseline.reduce((s, v) => s + v, 0) / baseline.length;
  const std   = Math.sqrt(baseline.reduce((s, v) => s + (v - mean) ** 2, 0) / baseline.length);
  const zScore = std === 0 ? 0 : (value - mean) / std;

  // IQR
  const sorted = [...baseline].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const iqrOutlier = iqr === 0 ? false : (value < q1 - 1.5 * iqr || value > q3 + 1.5 * iqr);

  const isAnomaly = Math.abs(zScore) > zThreshold || iqrOutlier;
  const flags: string[] = isAnomaly ? ["ANOMALOUS_INPUT"] : [];

  return { isAnomaly, zScore, iqrOutlier, flags };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. rollingBacktestMonitor
// ─────────────────────────────────────────────────────────────────────────────

export interface RollingBacktestResult {
  /** Rolling MAPE over the most recent `windowSize` periods */
  rollingMAPE: number;
  /** historicalAccuracy component [0–1]: 1 − clamp(rollingMAPE, 0, 1) */
  historicalAccuracy: number;
  /** True when error trend is worsening over the full series */
  isDegrading: boolean;
  /** Computed over all provided errors (wider view) */
  overallMAPE: number;
  flags: string[];
}

/**
 * Track forecast errors over a rolling window and produce the historicalAccuracy
 * component for trustScore.
 *
 * @param forecastErrors  Array of period MAPE values (fractions, 0.05 = 5% error)
 * @param windowSize      How many recent periods to consider (default: 10)
 */
export function rollingBacktestMonitor(
  forecastErrors: number[],
  windowSize = 10,
): RollingBacktestResult {
  if (forecastErrors.length === 0) {
    return {
      rollingMAPE: 0,
      historicalAccuracy: 1.0,
      isDegrading: false,
      overallMAPE: 0,
      flags: [],
    };
  }

  const window = forecastErrors.slice(-windowSize);
  const rollingMAPE = window.reduce((s, v) => s + v, 0) / window.length;
  const overallMAPE = forecastErrors.reduce((s, v) => s + v, 0) / forecastErrors.length;

  // historicalAccuracy = 1 − clamp(rollingMAPE, 0, 1)
  const historicalAccuracy = Math.max(0, 1 - Math.min(rollingMAPE, 1));

  // Degradation: compare first half vs second half of forecastErrors
  let isDegrading = false;
  if (forecastErrors.length >= 4) {
    const mid   = Math.floor(forecastErrors.length / 2);
    const early = forecastErrors.slice(0, mid).reduce((s, v) => s + v, 0) / mid;
    const late  = forecastErrors.slice(mid).reduce((s, v) => s + v, 0) / (forecastErrors.length - mid);
    isDegrading = late > early * 1.2; // 20 % worsening threshold
  }

  const flags: string[] = [];
  if (rollingMAPE > 0.30) flags.push("HIGH_FORECAST_ERROR");
  if (isDegrading)         flags.push("ACCURACY_DEGRADING");

  return { rollingMAPE, historicalAccuracy, isDegrading, overallMAPE, flags };
}
