# SKU-Level Demand Forecasting

## Intent

Produce multi-horizon point forecasts and quantile bands for each SKU so the
procurement and production planning modules can set reorder points, safety
stock, and production targets.

## Inputs

- `sku_demand_history` — weekly or monthly shipped units per SKU, minimum 24
  observations.
- Current regime from the FDR model (see [`fdr-regime-model.md`](./fdr-regime-model.md)).
- Commodity price indices relevant to the SKU's bill of materials.
- Seasonality calendars (optional) via `sku_seasonality_profile`.

## Algorithm

For each SKU `s` we fit three component forecasts and ensemble them by inverse
recent error:

1. **Holt–Winters triple exponential smoothing** with automatic additive /
   multiplicative selection via AIC.
2. **Regime-conditioned naive** — the mean demand observed in the last `K` weeks
   spent in the current regime, over the prior 5 years.
3. **Commodity-linked regression** — an OLS fit of demand on lagged commodity
   price changes when the BOM has `commodity_link_strength >= 0.4`.

Ensemble weight at horizon `h`:

```
w_i(h) = (1 / MAPE_i(h)) / Σ_j (1 / MAPE_j(h))
```

where `MAPE_i(h)` is the `h`-step mean absolute percentage error computed on a
rolling 26-week holdout.

Quantile bands (10th / 50th / 90th) come from a parametric bootstrap using the
residual distribution of the winning component per horizon.

## Outputs

- `GET /api/forecasts/sku/:skuId?horizons=1,4,13,26,52` — returns the point
  forecast and quantile bands per horizon (weeks).
- `ForecastChart` component renders the chosen SKU with fan chart.
- `ForecastAccuracy.tsx` page reports per-SKU forecast accuracy against actuals
  after the realization window.

## Validation

- `server/tests/thirty-day-sim.ts` reruns the last 30 days of forecasts and
  compares them to realized demand.
- Accuracy targets (from `FORECAST_IMPROVEMENT_ANALYSIS.md`):
  - 1-week MAPE ≤ 12% at SKU level for SKUs with ≥ 52 observations.
  - 4-week MAPE ≤ 18%.
  - 13-week MAPE ≤ 25%.
- Degradation alerts fire via `GET /api/forecast-degradation-alerts` when
  accuracy drops > 1.5σ from the SKU's rolling baseline.

## Novelty

Classical Holt–Winters does not account for macro regime. We condition the
ensemble weight on the current FDR regime so the regime-naive component
dominates during regime transitions where smoothing models lag. This is a
lightweight, auditable alternative to a heavier state-space model (like a full
Bayesian structural time-series) that would require specialized tuning per SKU.

## References

- Winters, P. R. (1960). "Forecasting Sales by Exponentially Weighted Moving
  Averages." *Management Science*.
- Hyndman, R. J., Athanasopoulos, G. (2021). *Forecasting: Principles and
  Practice*, 3rd ed. (Online textbook.)
- Croston, J. D. (1972). "Forecasting and Stock Control for Intermittent
  Demands." *Operational Research Quarterly*.
