# Pilot Experiment Report: texas-pilot-zero-mu-pilot

## Experiment Configuration
- **Experiment ID**: texas-pilot-zeromu-exp-001
- **Company**: texas-pilot-company-alpha
- **Window**: 4 weeks
- **Regime**: HEALTHY_EXPANSION (FDR=0.45)
- **Target Service Level**: 95.0%
- **Seed**: 42
- **Config Hash**: 0063f0fac34d5b34623e6db0ebc16417167d3911ee9bb0579d648fc3c02cb9cc
- **Materials**: 1

## Baseline Policy Results
| Metric | Value |
|--------|-------|
| Service Level | 100.00% |
| Stockout Rate | 0.00% |
| Expedite Spend | $0.00 |
| Avg Working Capital | $35548.94 |

## Optimized Policy Results
| Metric | Value |
|--------|-------|
| Service Level | 100.00% |
| Stockout Rate | 0.00% |
| Expedite Spend | $0.00 |
| Avg Working Capital | $13473.94 |
| Estimated Savings | $35320.00 |

## Comparison Summary
| Metric | Delta | Winner |
|--------|-------|--------|
| Service Level | 0.00pp | Tie |
| Stockout Rate | 0.00pp | Tie |
| Expedite Spend | $0.00 | Tie |
| Working Capital | $-22075.00 | Optimized |

## Recommendation: **RECOMMEND_OPTIMIZED**
- Confidence: 52%
- Optimized wins: working_capital, estimated_savings
- Baseline wins: none

## Savings Separation
- Estimated savings: $35320.00
- Measured savings: Not yet available (requires post-pilot measurement)

## Production Safety
- Production mutations: 0
- All results are simulation-only
- Experiment is fully replayable with seed=42

---
*Generated at 2026-02-22T21:04:13.852Z by Prescient Labs Pilot Evaluation Engine v1.0.0*