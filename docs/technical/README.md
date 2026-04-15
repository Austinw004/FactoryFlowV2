# Technical Methodology — Prescient Labs

This directory documents the statistical, econometric, and machine-learning methods
that power Prescient Labs' intelligent features. It is organized for independent
technical review by federal grant program managers (NSF, DoD, NIST, DoL) and by
peer engineers performing due-diligence audits.

Each methodology document follows the same structure:

1. **Intent** — what business question the method answers.
2. **Inputs** — data sources, sampling frequency, minimum history required.
3. **Algorithm** — precise mathematical formulation with references.
4. **Outputs** — the quantitative result surfaced to the user.
5. **Validation** — how we measure accuracy, the test harness, and published
   results.
6. **Novelty** — where we depart from published techniques and why.

## Index

| File | Feature in product | Mathematical family |
|---|---|---|
| [`fdr-regime-model.md`](./fdr-regime-model.md) | Financial-real Decoupling Regime | Dual-circuit macroeconomic indicator / threshold classifier |
| [`demand-forecasting.md`](./demand-forecasting.md) | SKU-level demand forecasting | Multi-horizon exponential smoothing w/ regime conditioning |
| [`anomaly-detection.md`](./anomaly-detection.md) | Inventory + sensor anomaly detection | Robust median absolute deviation + rolling z-score |
| [`quick-wins-recommender.md`](./quick-wins-recommender.md) | Quick Wins procurement recommendations | Expected-value ranking under regime-conditioned price elasticity |
| [`materials-at-risk.md`](./materials-at-risk.md) | Materials at Risk ranking | Volatility-adjusted coverage-gap score |
| [`auto-purchase-recommender.md`](./auto-purchase-recommender.md) | Auto Purchase Recommendations | Newsvendor model with regime-adjusted holding cost |
| [`predictive-maintenance.md`](./predictive-maintenance.md) | Predictive maintenance alerts | Sensor-drift detection + remaining-useful-life regression |

## Reproducibility

Every methodology below can be re-run against our bundled fixture data via
`npx tsx server/tests/live-validation-harness.ts`. Results are written to
`artifacts/validation/` with deterministic seeds so independent engineers get
byte-identical outputs.

## Contact for review

Austin Wendler, CEO — austinwendler44@gmail.com
