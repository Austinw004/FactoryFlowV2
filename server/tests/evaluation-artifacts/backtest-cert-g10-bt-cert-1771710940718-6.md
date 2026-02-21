# Regime Stability Backtest Report

**Version**: cert-g10-bt-cert-1771710940718
**Report ID**: 6
**Company**: cert-1771710940718-co-alpha
**Generated**: 2026-02-21T21:55:44.486Z
**Total Readings**: 100

---

## Key Metrics

| Metric | Value |
|--------|-------|
| Transitions Analyzed | 5 |
| Avg Detection Lag (readings) | 3 |
| Avg Stability Duration (readings) | 16.67 |
| False Transition Rate | 16.67% |
| Regime Accuracy | 100.00% |
| Hysteresis Effectiveness | 16.67% |

## Regime Distribution

| Regime | Count | Percentage |
|--------|-------|------------|
| HEALTHY_EXPANSION | 42 | 42.0% |
| ASSET_LED_GROWTH | 22 | 22.0% |
| IMBALANCED_EXCESS | 23 | 23.0% |
| REAL_ECONOMY_LEAD | 13 | 13.0% |

## Transition Events

| # | From | To | FDR | Detection Lag | Reversion |
|---|------|----|-----|---------------|-----------|
| 1 | HEALTHY_EXPANSION | ASSET_LED_GROWTH | 1.365 | 3 | No |
| 2 | ASSET_LED_GROWTH | IMBALANCED_EXCESS | 2.008 | 3 | Yes |
| 3 | IMBALANCED_EXCESS | REAL_ECONOMY_LEAD | 2.672 | 6 | No |
| 4 | REAL_ECONOMY_LEAD | IMBALANCED_EXCESS | 2.121 | 2 | Yes |
| 5 | IMBALANCED_EXCESS | ASSET_LED_GROWTH | 1.576 | 1 | No |

## Stability Windows

| Regime | Start | End | Duration | Avg FDR | Variance | Stable |
|--------|-------|-----|----------|---------|----------|--------|
| HEALTHY_EXPANSION | 0 | 41 | 42 | 0.8 | 0.0398 | Yes |
| ASSET_LED_GROWTH | 42 | 56 | 15 | 1.649 | 0.0288 | Yes |
| IMBALANCED_EXCESS | 57 | 73 | 17 | 2.338 | 0.0465 | Yes |
| REAL_ECONOMY_LEAD | 74 | 86 | 13 | 2.693 | 0.0414 | Yes |
| IMBALANCED_EXCESS | 87 | 92 | 6 | 1.944 | 0.0196 | Yes |
| ASSET_LED_GROWTH | 93 | 99 | 7 | 1.335 | 0.0283 | Yes |

## Detection Timing by Regime

| Regime | Avg Detection Lag | Transition Count |
|--------|-------------------|-----------------|
| ASSET_LED_GROWTH | 2 readings | 2 |
| IMBALANCED_EXCESS | 2.5 readings | 2 |
| REAL_ECONOMY_LEAD | 6 readings | 1 |

---
*Report generated deterministically from FDR series with seeded RNG. No mock data used.*