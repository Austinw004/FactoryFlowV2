# Anomaly Detection — Inventory, Sensor, and Financial Signals

## Intent

Flag single observations or short windows that fall outside the learned
distribution of a metric so operators see real deviations early, without being
buried in false positives from normal variation.

## Inputs

- Any time series persisted in `sensor_readings`, `inventory_snapshots`,
  `production_kpis`, or `commodity_prices`.
- Minimum history: 30 prior observations at the metric's native frequency.
- Optional: per-metric custom threshold overrides via `metric_anomaly_config`.

## Algorithm: Rolling Robust Z-Score

For a series `x_1, …, x_t` at time `t`:

1. Compute the trailing-30 median `m_t = median(x_{t-30..t-1})`.
2. Compute the trailing-30 MAD (median absolute deviation) `mad_t = median(|x_i - m_t|)`.
3. Compute the robust z-score:

   ```
   z_t = 0.6745 × (x_t − m_t) / max(mad_t, ε)
   ```

   The `0.6745` constant is the 0.5-quantile of the standard normal, making the
   MAD-based score comparable to a conventional z-score under normality.
   `ε = 1e-9` prevents division by zero on constant series.

4. Classification:
   - `|z_t| ≥ 3.5` → **severe anomaly**, page on-call.
   - `2.5 ≤ |z_t| < 3.5` → **warning**, surface to dashboard.
   - Otherwise normal.

Robust statistics (median, MAD) are used rather than mean/σ because a single
historical outlier should not widen the band enough to miss the next outlier —
this is the classic failure of 3σ rules on industrial sensor data.

## Outputs

- `GET /api/smart-insights/alerts` — all active anomalies across all series.
- `GET /api/predictive-maintenance/alerts` — equipment-specific.
- `GET /api/forecast-degradation-alerts` — forecast accuracy degradation.
- WebSocket broadcasts on the `smart_insight_alert` and `maintenance_alert`
  entities; client subscribers auto-invalidate their query caches.

## Validation

- `server/tests/enterprise-audit-regression.ts` generates known-anomaly
  fixtures (single-point spikes, level shifts, drift) and asserts recall ≥ 0.92
  and precision ≥ 0.85 at the severe threshold.
- False-positive budget: < 1 severe alert per 10k normal observations on
  synthetic Gaussian fixtures.

## Novelty

Most vendor anomaly detectors either use fixed thresholds (brittle) or a
heavyweight ML model (opaque, hard to audit). Our approach is intentionally
transparent — any operator can re-compute the score by hand from the last 30
observations, which is essential for regulated manufacturing environments where
"why did the system flag this?" must have a defensible answer.

## References

- Rousseeuw, P. J., Croux, C. (1993). "Alternatives to the Median Absolute
  Deviation." *Journal of the American Statistical Association*.
- Iglewicz, B., Hoaglin, D. C. (1993). *How to Detect and Handle Outliers*.
- Chandola, V., Banerjee, A., Kumar, V. (2009). "Anomaly Detection: A Survey."
  *ACM Computing Surveys*.
