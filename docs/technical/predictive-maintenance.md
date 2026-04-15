# Predictive Maintenance — Sensor Drift & Remaining Useful Life

## Intent

Flag equipment where sensor signals indicate degradation before an unplanned
failure, and estimate remaining useful life (RUL) so maintenance can be
scheduled instead of reactive.

## Inputs

- `sensor_readings` — time-series telemetry per `machinery.id`.
- `maintenance_events` — historical maintenance actions with outcomes.
- `machinery.expected_life_hours` — manufacturer spec.

## Algorithm

Two layers running in parallel per machine:

### 1. Sensor drift detection (same primitive as anomaly-detection.md)

Each sensor series is monitored with a rolling robust z-score. A sensor emits a
`drift_start` event when `|z_t| ≥ 2.5` for ≥ 3 consecutive observations. These
events are persisted to `maintenance_alerts` with severity `warning`.

### 2. Remaining Useful Life (RUL) regression

When ≥ 5 drift events exist for a machine, a simple linear regression of
cumulative drift severity against historical time-to-failure fits on the
machine's installed class (same `manufacturer + model`). RUL prediction:

```
RUL = max(0, intercept + slope · cumulative_drift_severity)
```

Confidence is reported as the R² of the fit. RUL predictions with R² < 0.4 are
suppressed from the operator UI and labeled "insufficient data."

## Outputs

- `GET /api/predictive-maintenance/alerts` — active drift events.
- `GET /api/predictive-maintenance/predictions` — RUL forecast per machine.
- `PredictiveMaintenance.tsx` page visualizes both with drill-down into the
  contributing sensor series.

## Validation

- `server/tests/live-validation-harness.ts` includes synthetic degradation
  fixtures (linear drift, step change, intermittent spikes) and asserts recall
  ≥ 0.9 on drift-start detection.
- RUL accuracy is reported as median absolute deviation of prediction vs.
  realized time-to-failure on pilot fixtures.

## Novelty

Published RUL methods (particle filters, deep LSTMs) require per-machine
training data that small and mid-sized manufacturers do not have. Our approach
pools across same-model machines to bootstrap a usable, auditable prediction
from the moment the second machine of a given model is installed — which is
the realistic floor for most customers.

## References

- Si, X.-S., Wang, W., Hu, C.-H., Zhou, D.-H. (2011). "Remaining useful life
  estimation — A review on the statistical data driven approaches." *European
  Journal of Operational Research*.
- Heimes, F. O. (2008). "Recurrent neural networks for remaining useful life
  estimation." *Proc. PHM*.
