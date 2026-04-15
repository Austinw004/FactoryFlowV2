# Financial–Real Decoupling Regime Model

## Intent

Classify the current macroeconomic environment into one of four operational
regimes so that downstream procurement, inventory, and production decisions can
be conditioned on the underlying state of the real economy versus asset markets.

## Inputs

| Series | Source | Frequency | Minimum history |
|---|---|---|---|
| Consumer Price Index (CPI) | BLS | Monthly | 36 months |
| Federal Funds Effective Rate | FRED `DFF` | Daily | 36 months |
| 10-Year Treasury Yield | FRED `DGS10` | Daily | 36 months |
| S&P 500 Total Return | FRED `SP500` | Daily | 36 months |
| Industrial Production Index | FRED `INDPRO` | Monthly | 36 months |
| PPI Final Demand | BLS | Monthly | 36 months |
| M2 Money Supply | FRED `M2SL` | Monthly | 36 months |
| ISM Manufacturing PMI | ISM | Monthly | 36 months |

Ingestion is handled by `server/lib/economicDataIngestion.ts`. Every input is
persisted to `external_economic_data` with an immutable timestamp so historical
regime assignments are reproducible.

## Algorithm: Financial–Real Decoupling Ratio (FDR)

We compute a dimensionless scalar that measures how far financial-market returns
have pulled away from real-economy output growth over the trailing 12-month
window:

```
FDR_t = Z_t(asset_returns) / Z_t(real_growth_proxy)
```

Where:

- `Z_t(asset_returns)` is the z-score of the trailing-12-month S&P 500 total
  return against its 10-year distribution.
- `Z_t(real_growth_proxy)` is the z-score of a composite real-economy indicator
  equal to the equally-weighted average of (Industrial Production YoY, PMI
  centered at 50, CPI-deflated PPI YoY) against its 10-year distribution.
- When the denominator's absolute value is less than 0.25 we clamp it to 0.25 to
  avoid numerical blow-up during balanced periods.

### Regime boundaries

| Regime | FDR range | Operational meaning |
|---|---|---|
| `HEALTHY_EXPANSION` | `FDR < 1.2` | Asset and real economy in equilibrium. Standard procurement pace. |
| `ASSET_LED_GROWTH` | `1.2 ≤ FDR < 1.8` | Asset circuit outpacing real. Accelerate procurement of critical materials. |
| `IMBALANCED_EXCESS` | `1.8 ≤ FDR < 2.5` | Significant decoupling. Defer non-critical purchases, renegotiate contracts. |
| `REAL_ECONOMY_LEAD` | `FDR ≥ 2.5` | Counter-cyclical opportunity. Lock in favorable supplier terms. |

Thresholds were calibrated against 1990–2024 US data so each regime occupies
roughly 20–35% of observed months, giving operators enough regime-stable windows
to plan against.

### Regime-change broadcast

When `FDR_t` crosses a boundary we emit a `regime_change` event via WebSocket
(`server/websocket.ts`) with payload `{ from, to, fdr }`. The client invalidates
all regime-sensitive queries via `useWebSocket`'s invalidation map.

## Outputs

- `GET /api/economics/regime` — current regime + raw FDR.
- `GET /api/economics/indicators` — time series of every input series and the
  resulting FDR.
- Client widgets: `RegimeStatus`, `FDRTrendChart`, `RegimeActionCards`.

## Validation

- `server/tests/live-validation-harness.ts` runs a 34-year backtest and asserts:
  - FDR values land inside the declared range for each regime.
  - Regime transitions match known macroeconomic inflection points (2000 dot-com
    peak, 2007 housing peak, 2020 COVID disruption, 2022 inflation peak) within
    ±1 month.
- Results are committed to `artifacts/validation/fdr_backtest.json` and
  summarized in `DUAL_CIRCUIT_RESEARCH_VALIDATION.md` at the repo root.

## Novelty

Published macro-regime classifiers (Chauvet 1998, Hamilton 1989) operate on
hidden-Markov models trained on GDP + unemployment. Our contribution is (a) the
asset/real-economy ratio framing rather than absolute regime probabilities, and
(b) direct operational bindings — each regime label maps to a concrete
procurement playbook in the product. The framing is intentionally simple so
procurement operators, not quantitative economists, can act on it.

## References

- Chauvet, M. (1998). "An Econometric Characterization of Business Cycle Dynamics
  with Factor Structure and Regime Switching." *International Economic Review*.
- Hamilton, J. D. (1989). "A New Approach to the Economic Analysis of
  Nonstationary Time Series and the Business Cycle." *Econometrica*.
- Borio, C. (2014). "The financial cycle and macroeconomics: What have we
  learnt?" *Journal of Banking & Finance*.
