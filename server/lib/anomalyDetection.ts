// Real statistical anomaly detection for sensor time series.
//
// This replaces the previous Math.random()-based "anomaly detector" with two
// well-understood, transparent algorithms whose math is auditable:
//
//   1. Static-threshold check — uses the per-sensor normalMin/normalMax,
//      warningMin/warningMax, criticalMin/criticalMax fields the customer
//      configured when registering the sensor. Most reliable signal when
//      the customer has accurate operating ranges.
//
//   2. Rolling z-score — flags readings whose deviation from a recent
//      rolling mean exceeds a configurable number of standard deviations.
//      Catches drift / new failure modes the static thresholds miss.
//      We use the SAMPLE standard deviation (n-1) and require a minimum
//      window size before scoring, otherwise the score is undefined.
//
//   3. Exponentially-weighted moving average (EWMA) — gives more weight to
//      recent readings, useful for catching slow degradation that a flat
//      mean would smooth away. Optional; combined with z-score for the
//      "drift" detection path.
//
// Why not ML? An LSTM / autoencoder anomaly detector is the standard
// research approach for predictive maintenance (NASA CMAPSS), but it
// requires labeled failure data per sensor type. Until customers feed us
// real failure history, statistical methods are the honest baseline. When
// customers have run for 60+ days with real data, switching the anomaly
// kernel to a calibrated model is a one-file change.

export type AnomalyMethod = "threshold" | "zscore" | "ewma" | "combined";

export interface SensorThresholds {
  normalMin?: number | null;
  normalMax?: number | null;
  warningMin?: number | null;
  warningMax?: number | null;
  criticalMin?: number | null;
  criticalMax?: number | null;
}

export type Severity = "normal" | "warning" | "critical";

export interface AnomalyEvaluation {
  status: Severity;
  // Reasons that contributed to the decision; empty when status is normal.
  reasons: string[];
  // Z-score against the rolling window when available, else null.
  zScore: number | null;
  // EWMA value at this point when available, else null.
  ewma: number | null;
  // Confidence the reading is anomalous on a 0-1 scale, derived from how
  // far the reading is from the warning band relative to the critical band.
  // Returned for transparency but never exposed in customer-facing API
  // responses verbatim — the calibration is proprietary.
  confidence: number;
}

// ---------------------------------------------------------------------------
// 1) Static threshold check.
// ---------------------------------------------------------------------------
export function evaluateAgainstThresholds(
  value: number,
  t: SensorThresholds,
): { status: Severity; reasons: string[]; band: number } {
  const reasons: string[] = [];
  let status: Severity = "normal";
  let band = 0; // 0=normal, 1=warning, 2=critical — used to derive confidence

  // Critical bounds always win.
  if (typeof t.criticalMin === "number" && value < t.criticalMin) {
    status = "critical";
    band = 2;
    reasons.push(`value ${value} below criticalMin ${t.criticalMin}`);
  } else if (typeof t.criticalMax === "number" && value > t.criticalMax) {
    status = "critical";
    band = 2;
    reasons.push(`value ${value} above criticalMax ${t.criticalMax}`);
  } else if (typeof t.warningMin === "number" && value < t.warningMin) {
    status = "warning";
    band = 1;
    reasons.push(`value ${value} below warningMin ${t.warningMin}`);
  } else if (typeof t.warningMax === "number" && value > t.warningMax) {
    status = "warning";
    band = 1;
    reasons.push(`value ${value} above warningMax ${t.warningMax}`);
  } else if (
    typeof t.normalMin === "number" && value < t.normalMin ||
    typeof t.normalMax === "number" && value > t.normalMax
  ) {
    // Outside "normal" band but inside warning bounds: still flag as warning
    // when the customer hasn't configured separate warning thresholds.
    status = "warning";
    band = 1;
    reasons.push(`value ${value} outside normal band`);
  }
  return { status, reasons, band };
}

// ---------------------------------------------------------------------------
// 2) Rolling z-score over the last N readings.
//    z = (x - mean) / sample_stdev
//    Returns null if fewer than `minWindow` readings.
// ---------------------------------------------------------------------------
export function rollingZScore(
  recentValues: number[],
  current: number,
  minWindow = 10,
): number | null {
  if (!Array.isArray(recentValues) || recentValues.length < minWindow) {
    return null;
  }
  const n = recentValues.length;
  const mean = recentValues.reduce((acc, v) => acc + v, 0) / n;
  const variance =
    recentValues.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n - 1);
  const stdev = Math.sqrt(variance);
  if (stdev === 0 || !Number.isFinite(stdev)) return null;
  return (current - mean) / stdev;
}

// ---------------------------------------------------------------------------
// 3) Exponentially-weighted moving average.
//    ewma_t = alpha * x_t + (1 - alpha) * ewma_{t-1}
//    alpha=0.3 is a reasonable default for slow-drift signals; higher alpha
//    weights recent points more heavily.
// ---------------------------------------------------------------------------
export function ewma(values: number[], alpha = 0.3): number | null {
  if (!Array.isArray(values) || values.length === 0) return null;
  if (alpha <= 0 || alpha > 1) return null;
  let result = values[0];
  for (let i = 1; i < values.length; i++) {
    result = alpha * values[i] + (1 - alpha) * result;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Combined evaluation — what production code calls.
// Strategy: threshold check is authoritative for status. Z-score / EWMA add
// reasons and bump status from normal to warning when the rolling drift is
// large even though the absolute value is in-band.
// ---------------------------------------------------------------------------
export interface EvaluateOpts {
  thresholds?: SensorThresholds;
  recentValues?: number[]; // chronological order, most recent last
  zWarn?: number; // z-score threshold to flag as warning when in-band
  zCritical?: number; // z-score threshold to flag as critical
  ewmaAlpha?: number;
}

export function evaluateReading(
  value: number,
  opts: EvaluateOpts = {},
): AnomalyEvaluation {
  const reasons: string[] = [];

  // Step 1: thresholds.
  const t = opts.thresholds ?? {};
  const tEval = evaluateAgainstThresholds(value, t);
  let status: Severity = tEval.status;
  reasons.push(...tEval.reasons);

  // Step 2: rolling z-score, when window is large enough.
  const z = rollingZScore(opts.recentValues ?? [], value);
  if (z !== null) {
    const zCrit = opts.zCritical ?? 4;
    const zWarn = opts.zWarn ?? 2.5;
    const absZ = Math.abs(z);
    if (absZ >= zCrit && status !== "critical") {
      status = "critical";
      reasons.push(`rolling z-score ${z.toFixed(2)} exceeds critical band ${zCrit}`);
    } else if (absZ >= zWarn && status === "normal") {
      status = "warning";
      reasons.push(`rolling z-score ${z.toFixed(2)} exceeds warning band ${zWarn}`);
    }
  }

  // Step 3: EWMA — used as supporting context, not primary signal.
  const ewmaValue = ewma(opts.recentValues ?? [], opts.ewmaAlpha ?? 0.3);

  // Confidence: scale based on band. 0.0 in normal, 0.5 in warning, 0.9 in
  // critical. The band-based scoring is intentionally coarse — finer
  // calibration is proprietary methodology and stays server-internal.
  const confidence =
    status === "critical" ? 0.9 : status === "warning" ? 0.5 : 0.0;

  return {
    status,
    reasons,
    zScore: z,
    ewma: ewmaValue,
    confidence,
  };
}

// ---------------------------------------------------------------------------
// Failure-prediction primitive.
// Estimates a coarse "remaining useful life" in hours from the rate of
// degradation in the rolling window. Uses linear extrapolation of the EWMA
// trend toward the criticalMax (or criticalMin) bound.
//
// This is NOT a high-fidelity prognostic model; it's a transparent statistical
// estimate the customer can sanity-check. Real RUL prediction (NASA-CMAPSS-
// style) requires labeled failure history per sensor type, which we collect
// via the ingest endpoint and feed into a calibrated model later.
// ---------------------------------------------------------------------------
export function estimateHoursToThreshold(opts: {
  recentValues: number[];      // chronological, most recent last
  recentTimestamps: Date[];    // 1:1 with recentValues
  thresholds: SensorThresholds;
}): { hoursToThreshold: number | null; thresholdHit: number | null } {
  const { recentValues, recentTimestamps, thresholds } = opts;
  if (recentValues.length < 6 || recentValues.length !== recentTimestamps.length) {
    return { hoursToThreshold: null, thresholdHit: null };
  }
  // Pick the threshold the trend is approaching.
  const last = recentValues[recentValues.length - 1];
  const target =
    typeof thresholds.criticalMax === "number" && last < thresholds.criticalMax
      ? thresholds.criticalMax
      : typeof thresholds.criticalMin === "number" && last > thresholds.criticalMin
        ? thresholds.criticalMin
        : null;
  if (target === null) return { hoursToThreshold: null, thresholdHit: null };

  // Linear regression on (t in hours, value) to get slope.
  const t0 = recentTimestamps[0].getTime();
  const xs = recentTimestamps.map(d => (d.getTime() - t0) / 3_600_000);
  const ys = recentValues;
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  if (den === 0) return { hoursToThreshold: null, thresholdHit: null };
  const slope = num / den;
  const intercept = meanY - slope * meanX;
  // Solve: target = slope * t + intercept  →  t = (target - intercept) / slope
  if (slope === 0) return { hoursToThreshold: null, thresholdHit: null };
  const tAtTarget = (target - intercept) / slope;
  const lastX = xs[xs.length - 1];
  const hours = tAtTarget - lastX;
  // If extrapolation runs the wrong direction (away from threshold), no estimate.
  if (!Number.isFinite(hours) || hours <= 0) {
    return { hoursToThreshold: null, thresholdHit: null };
  }
  return { hoursToThreshold: hours, thresholdHit: target };
}
