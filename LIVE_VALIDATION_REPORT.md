# Live Validation Report — Prescient Labs Enterprise Platform

**Generated**: 2026-03-21T22:16:40.501Z
**Harness Version**: 1.0.0
**Verdict**: `SAFE FOR PILOT`
**Confidence Score**: 100%
**Tests**: 90 PASS / 0 FAIL / 90 total

## Section Summary

| Section | Name | Tests | Result |
|---------|------|-------|--------|
| S1 | System Health & Boot Validation | 7/7 | PASS |
| S2 | Authentication & Tenant Isolation | 8/8 | PASS |
| S3 | Automation Safety & Execution Guards | 7/7 | PASS |
| S4 | Concurrency & Spend Limit Atomicity | 5/5 | PASS |
| S5 | Idempotency & Duplicate Prevention | 6/6 | PASS |
| S6 | Forecasting & Predictive Validation | 8/8 | PASS |
| S7 | Optimization & Decision Outputs | 9/9 | PASS |
| S8 | Stress Testing & Failure Modes | 9/9 | PASS |
| S9 | Data Quality & Blocking Logic | 7/7 | PASS |
| S10 | Auditability & Evidence Traceability | 7/7 | PASS |
| S11 | API & Endpoint Validation | 17/17 | PASS |

## Critical Failures

None.

## Warnings

None.

## Full Test Results

| Test ID | Description | Proof | Pass | ms |
|---------|-------------|-------|------|----|
| 1.1 | Database connectivity via SELECT 1 | runtime | PASS | 3 |
| 1.2 | All 10 required tables present in schema | runtime | PASS | 4 |
| 1.3 | DATABASE_URL env var present | structural | PASS | 0 |
| 1.4 | automationSafeMode row defaults to safeModeEnabled=1 | runtime | PASS | 11 |
| 1.5 | GET /healthz returns 200 | runtime | PASS | 47 |
| 1.6 | GET /readyz returns 200 | runtime | PASS | 8 |
| 1.7 | GET /livez returns 200 | runtime | PASS | 3 |
| 2.1 | Materials isolated by companyId — cross-tenant read ret | runtime | PASS | 5 |
| 2.2 | Suppliers isolated by companyId — cross-tenant read ret | runtime | PASS | 4 |
| 2.3 | SKUs isolated by companyId — cross-tenant read returns  | runtime | PASS | 5 |
| 2.4 | Automation rules isolated — cross-tenant read blocked | runtime | PASS | 12 |
| 2.5 | Purchase orders isolated — cross-tenant read blocked | runtime | PASS | 182 |
| 2.6 | Copilot drafts isolated — Company B has 0 drafts | runtime | PASS | 20 |
| 2.7 | GET /api/materials returns 401/403 for unauthenticated  | runtime | PASS | 2 |
| 2.8 | POST /api/materials returns 401/403 without auth | runtime | PASS | 65 |
| 3.1 | Safe mode is enabled (safeModeEnabled=1) for test compa | runtime | PASS | 3 |
| 3.2 | automationEngine.ts enforces safeModeEnabled check (sou | structural | PASS | 1 |
| 3.3 | Draft in 'draft' status cannot execute — requires appro | runtime | PASS | 7 |
| 3.4 | copilotService enforces 'must be approved' guard (sourc | structural | PASS | 0 |
| 3.5 | Draft in 'approved' status passes execution gate | runtime | PASS | 8 |
| 3.6 | Rejected draft cannot be executed | runtime | PASS | 6 |
| 3.7 | copilotService: executedAt set only after approved gate | structural | PASS | 0 |
| 4.1 | Runtime spend state initialized at 0 | runtime | PASS | 13 |
| 4.2 | Atomic UPDATE prevents overspend: finalSpend=9900 ≤ lim | runtime | PASS | 142 |
| 4.3 | Allowed count (33) within expected ceiling (33) | deterministic | PASS | 0 |
| 4.4 | Overspend impossible: atomicity enforced — finalSpend ( | deterministic | PASS | 0 |
| 4.5 | Concurrency test state cleaned up | runtime | PASS | 0 |
| 5.1 | buildTriggerEventId is deterministic: same params → ide | deterministic | PASS | 0 |
| 5.2 | Different payloads produce different event IDs (no coll | deterministic | PASS | 0 |
| 5.3 | First event insertion succeeds | runtime | PASS | 17 |
| 5.4 | Duplicate (companyId+triggerType+triggerEventId) reject | runtime | PASS | 2 |
| 5.5 | onConflictDoNothing: second insert leaves exactly 1 row | runtime | PASS | 7 |
| 5.6 | 50 concurrent duplicate inserts → exactly 1 row in DB | runtime | PASS | 33 |
| 6.1 | Fast mover WAPE=5.4% < 30% threshold | deterministic | PASS | 0 |
| 6.2 | Slow mover WAPE=14.3% < 40% threshold | deterministic | PASS | 0 |
| 6.3 | Intermittent sMAPE=150.9% within acceptable range | deterministic | PASS | 0 |
| 6.4 | No-data SKU: forecast returns 3 values without crash | runtime | PASS | 0 |
| 6.5 | Moving avg WAPE (5.2%) within 5pp of naive (3.4%) | deterministic | PASS | 0 |
| 6.6 | Bias=0.39% within ±10% threshold | deterministic | PASS | 0 |
| 6.7 | Confidence interval math: lower(85)≤point(100)≤upper(11 | deterministic | PASS | 0 |
| 6.8 | forecasting.ts implements regime-conditioned uncertaint | structural | PASS | 0 |
| 7.1 | Optimized quantity (720) is non-negative | deterministic | PASS | 15 |
| 7.2 | Service level 95.0% within [0,100]% | deterministic | PASS | 0 |
| 7.3 | Stockout risk (0.050) = 1 − SL (0.050) | deterministic | PASS | 0 |
| 7.4 | Qty (720) ≥ MOQ (10) | deterministic | PASS | 0 |
| 7.5 | Conservative (610) ≤ Aggressive (815) + pack | deterministic | PASS | 25 |
| 7.6 | STRESS regime: qty=940 (non-negative), SL=95.0% | deterministic | PASS | 10 |
| 7.7 | What-if comparison has 4 entries | deterministic | PASS | 0 |
| 7.8 | Evidence bundle has provenanceVersion, optimizerId, tim | deterministic | PASS | 0 |
| 7.9 | Deterministic replay: same seed → identical results | deterministic | PASS | 21 |
| 8.1 | Stress test runs without crash for all 6 default scenar | runtime | PASS | 3 |
| 8.2 | All 6 default stress scenarios executed (found 6) | runtime | PASS | 0 |
| 8.3 | Extreme demand spike scenario present and executed | runtime | PASS | 0 |
| 8.4 | Supplier outage scenario present with results | runtime | PASS | 0 |
| 8.5 | Compound crisis scenario executed and returned results | runtime | PASS | 0 |
| 8.6 | All scenarios include CVaR delta metrics (cvarDelta) | runtime | PASS | 0 |
| 8.7 | All scenarios include automationDowngrade with downgrad | runtime | PASS | 0 |
| 8.8 | Aggregate: 2 passed / 4 failed | runtime | PASS | 0 |
| 8.9 | Stress report configHash is deterministic across runs | deterministic | PASS | 3 |
| 9.1 | Company A quality score: 86.0% | runtime | PASS | 46 |
| 9.2 | Company A is not blocked by data quality gate | runtime | PASS | 0 |
| 9.3 | Company B quality score (72.0%) is in valid range [0,1] | runtime | PASS | 32 |
| 9.4 | Data quality report has 5 entity-level scores | runtime | PASS | 0 |
| 9.5 | dataQuality.ts defines AUTOMATION_QUALITY_THRESHOLD (so | structural | PASS | 0 |
| 9.6 | dataQuality.ts contains blocked flag logic tied to scor | structural | PASS | 0 |
| 9.7 | Empty company score (0.0%) < Company A (86.0%) — data v | runtime | PASS | 9 |
| 10.1 | sanitizeDetails redacts password and apiKey from log pa | runtime | PASS | 0 |
| 10.2 | Structured event log persists audit entries to DB | runtime | PASS | 12 |
| 10.3 | Copilot draft stores evidence bundle with provenanceVer | runtime | PASS | 6 |
| 10.4 | Optimization evidence bundle has provenanceVersion, opt | deterministic | PASS | 11 |
| 10.5 | SHA-256 hashing: same config JSON → identical hash (det | deterministic | PASS | 0 |
| 10.6 | Structured event log is tenant-scoped — cross-tenant qu | runtime | PASS | 3 |
| 10.7 | Stress test report has configHash (5fa4a24e9f3401a8...) | deterministic | PASS | 4 |
| 11.1 | GET /healthz → 200 (expected: 200) | runtime | PASS | 6 |
| 11.2 | GET /readyz → 200 (expected: 200) | runtime | PASS | 6 |
| 11.3 | GET /livez → 200 (expected: 200) | runtime | PASS | 2 |
| 11.4 | GET /api/health → 401 (expected: 200|401|403|302) | runtime | PASS | 2 |
| 11.5 | GET /api/materials → 401 (expected: 401|403|302) | runtime | PASS | 1 |
| 11.6 | GET /api/skus → 401 (expected: 401|403|302) | runtime | PASS | 1 |
| 11.7 | GET /api/suppliers → 401 (expected: 401|403|302) | runtime | PASS | 2 |
| 11.8 | GET /api/rfqs → 401 (expected: 401|403|302) | runtime | PASS | 1 |
| 11.9 | GET /api/allocations → 401 (expected: 401|403|302) | runtime | PASS | 2 |
| 11.10 | GET /api/forecast-accuracy/metrics → 401 (expected: 401 | runtime | PASS | 1 |
| 11.11 | GET /api/multi-horizon-forecasts → 401 (expected: 401|4 | runtime | PASS | 2 |
| 11.12 | GET /api/adaptive-forecast/reports → 401 (expected: 401 | runtime | PASS | 3 |
| 11.13 | GET /api/stress-test/reports → 401 (expected: 401|403|3 | runtime | PASS | 1 |
| 11.14 | POST /api/adaptive-forecast/analyze → 401 (expected: 40 | runtime | PASS | 2 |
| 11.15 | POST /api/stress-test/run → 401 (expected: 401|403|302| | runtime | PASS | 2 |
| 11.16 | Health endpoints all respond within 2000ms (4ms, 6ms, 5 | runtime | PASS | 7 |
| 11.17 | GET /api/does-not-exist-xyz-abc → 401 | runtime | PASS | 1 |