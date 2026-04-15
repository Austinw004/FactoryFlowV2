# Materials at Risk

## Intent

Produce a single ranked list of raw materials whose combination of price
volatility, supplier concentration, and on-hand coverage gap make them the
highest-impact targets for procurement attention this week.

## Inputs

- `materials.priceVolatility` (rolling 90-day standard deviation of price).
- Supplier concentration: Herfindahl–Hirschman index over approved suppliers.
- Coverage gap: `target_coverage_days − current_coverage_days`, clipped at 0.
- Current regime — amplifies weight on volatility during imbalanced regimes.

## Algorithm

Composite risk score:

```
risk = w_v · Z(priceVolatility)
     + w_s · Z(HHI_supplier)
     + w_g · Z(coverageGapDays)
     + w_r · regime_multiplier
```

Where `Z(x)` is the cross-material z-score of `x`, `w_v + w_s + w_g + w_r = 1`,
and the default weights are `(0.35, 0.25, 0.30, 0.10)` with `w_v` increasing to
`0.50` in `IMBALANCED_EXCESS` and `REAL_ECONOMY_LEAD` regimes.

Output is the top-N materials by `risk`, each annotated with the dominant
driver so the operator can see *why* each material made the list.

## Outputs

- `GET /api/materials/at-risk?limit=20` — JSON list.
- `MaterialsAtRiskWidget` renders inline on the Dashboard.

## Validation

- Back-test: for each materials-at-risk score computed on historical data,
  measure realized price impact 30 and 60 days forward. Correlation target
  `> 0.35`. Results in `artifacts/validation/materials_at_risk_backtest.json`.

## Novelty

Most platforms rank by volatility alone, which is noisy. By combining
volatility with supplier concentration and coverage, we match the way
procurement leaders actually triage — which supplier is single-sourced, which
material is about to run out, and which regime amplifies which signal.
