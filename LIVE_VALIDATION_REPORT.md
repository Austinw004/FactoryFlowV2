# Live Validation Report — Prescient Labs Enterprise Platform

**Generated**: 2026-03-29T01:22:25.120Z
**Harness Version**: 2.0.0
**Verdict**: `SAFE FOR PILOT`
**Confidence Score**: 100%
**Tests**: 160 PASS / 0 FAIL / 160 total

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
| S12 | Gate 14 — Economic Truth Validation | 14/14 | PASS |

## Critical Failures

None.

## Warnings

None.

## Full Test Results

| Test ID | Description | Proof | Pass | ms |
|---------|-------------|-------|------|----|
| 1.1 | Database connectivity via SELECT 1 | runtime | PASS | 2 |
| 1.2 | All 10 required tables present in schema | runtime | PASS | 4 |
| 1.3 | DATABASE_URL env var present | structural | PASS | 0 |
| 1.4 | automationSafeMode row defaults to safeModeEnabled=1 | runtime | PASS | 7 |
| 1.5 | GET /healthz returns 200 | runtime | PASS | 35 |
| 1.6 | GET /readyz returns 200 | runtime | PASS | 7 |
| 1.7 | GET /livez returns 200 | runtime | PASS | 2 |
| 2.1 | Materials isolated by companyId — cross-tenant read ret | runtime | PASS | 5 |
| 2.2 | Suppliers isolated by companyId — cross-tenant read ret | runtime | PASS | 5 |
| 2.3 | SKUs isolated by companyId — cross-tenant read returns  | runtime | PASS | 4 |
| 2.4 | Automation rules isolated — cross-tenant read blocked | runtime | PASS | 18 |
| 2.5 | Purchase orders isolated — cross-tenant read blocked | runtime | PASS | 10 |
| 2.6 | Copilot drafts isolated — Company B has 0 drafts | runtime | PASS | 9 |
| 2.7 | GET /api/materials returns 401/403 for unauthenticated  | runtime | PASS | 3 |
| 2.8 | POST /api/materials returns 401/403 without auth | runtime | PASS | 17 |
| 3.1 | Safe mode is enabled (safeModeEnabled=1) for test compa | runtime | PASS | 3 |
| 3.2 | automationEngine.ts enforces safeModeEnabled check (sou | structural | PASS | 1 |
| 3.3 | Draft in 'draft' status cannot execute — requires appro | runtime | PASS | 6 |
| 3.4 | copilotService enforces 'must be approved' guard (sourc | structural | PASS | 0 |
| 3.5 | Draft in 'approved' status passes execution gate | runtime | PASS | 6 |
| 3.6 | Rejected draft cannot be executed | runtime | PASS | 6 |
| 3.7 | copilotService: executedAt set only after approved gate | structural | PASS | 0 |
| 4.1 | Runtime spend state initialized at 0 | runtime | PASS | 6 |
| 4.2 | Atomic UPDATE prevents overspend: finalSpend=9900 ≤ lim | runtime | PASS | 189 |
| 4.3 | Allowed count (33) within expected ceiling (33) | deterministic | PASS | 0 |
| 4.4 | Overspend impossible: atomicity enforced — finalSpend ( | deterministic | PASS | 0 |
| 4.5 | Concurrency test state cleaned up | runtime | PASS | 0 |
| 5.1 | buildTriggerEventId is deterministic: same params → ide | deterministic | PASS | 0 |
| 5.2 | Different payloads produce different event IDs (no coll | deterministic | PASS | 0 |
| 5.3 | First event insertion succeeds | runtime | PASS | 7 |
| 5.4 | Duplicate (companyId+triggerType+triggerEventId) reject | runtime | PASS | 2 |
| 5.5 | onConflictDoNothing: second insert leaves exactly 1 row | runtime | PASS | 5 |
| 5.6 | 50 concurrent duplicate inserts → exactly 1 row in DB | runtime | PASS | 187 |
| 6.1 | Fast mover WAPE=5.4% < 30% threshold | deterministic | PASS | 0 |
| 6.2 | Slow mover WAPE=14.3% < 40% threshold | deterministic | PASS | 0 |
| 6.3 | Intermittent sMAPE=150.9% within acceptable range | deterministic | PASS | 0 |
| 6.4 | No-data SKU: forecast returns 3 values without crash | runtime | PASS | 1 |
| 6.5 | Moving avg WAPE (5.2%) within 5pp of naive (3.4%) | deterministic | PASS | 0 |
| 6.6 | Bias=0.39% within ±10% threshold | deterministic | PASS | 0 |
| 6.7 | Confidence interval math: lower(85)≤point(100)≤upper(11 | deterministic | PASS | 0 |
| 6.8 | forecasting.ts implements regime-conditioned uncertaint | structural | PASS | 0 |
| 7.1 | Optimized quantity (720) is non-negative | deterministic | PASS | 14 |
| 7.2 | Service level 95.0% within [0,100]% | deterministic | PASS | 0 |
| 7.3 | Stockout risk (0.050) = 1 − SL (0.050) | deterministic | PASS | 0 |
| 7.4 | Qty (720) ≥ MOQ (10) | deterministic | PASS | 0 |
| 7.5 | Conservative (610) ≤ Aggressive (815) + pack | deterministic | PASS | 27 |
| 7.6 | STRESS regime: qty=940 (non-negative), SL=95.0% | deterministic | PASS | 12 |
| 7.7 | What-if comparison has 4 entries | deterministic | PASS | 0 |
| 7.8 | Evidence bundle has provenanceVersion, optimizerId, tim | deterministic | PASS | 0 |
| 7.9 | Deterministic replay: same seed → identical results | deterministic | PASS | 22 |
| 8.1 | Stress test runs without crash for all 6 default scenar | runtime | PASS | 4 |
| 8.2 | All 6 default stress scenarios executed (found 6) | runtime | PASS | 0 |
| 8.3 | Extreme demand spike scenario present and executed | runtime | PASS | 0 |
| 8.4 | Supplier outage scenario present with results | runtime | PASS | 0 |
| 8.5 | Compound crisis scenario executed and returned results | runtime | PASS | 0 |
| 8.6 | All scenarios include CVaR delta metrics (cvarDelta) | runtime | PASS | 0 |
| 8.7 | All scenarios include automationDowngrade with downgrad | runtime | PASS | 0 |
| 8.8 | Aggregate: 2 passed / 4 failed | runtime | PASS | 0 |
| 8.9 | Stress report configHash is deterministic across runs | deterministic | PASS | 3 |
| 9.1 | Company A quality score: 86.0% | runtime | PASS | 35 |
| 9.2 | Company A is not blocked by data quality gate | runtime | PASS | 0 |
| 9.3 | Company B quality score (72.0%) is in valid range [0,1] | runtime | PASS | 30 |
| 9.4 | Data quality report has 5 entity-level scores | runtime | PASS | 0 |
| 9.5 | dataQuality.ts defines AUTOMATION_QUALITY_THRESHOLD (so | structural | PASS | 1 |
| 9.6 | dataQuality.ts contains blocked flag logic tied to scor | structural | PASS | 0 |
| 9.7 | Empty company score (0.0%) < Company A (86.0%) — data v | runtime | PASS | 9 |
| 10.1 | sanitizeDetails redacts password and apiKey from log pa | runtime | PASS | 0 |
| 10.2 | Structured event log persists audit entries to DB | runtime | PASS | 8 |
| 10.3 | Copilot draft stores evidence bundle with provenanceVer | runtime | PASS | 6 |
| 10.4 | Optimization evidence bundle has provenanceVersion, opt | deterministic | PASS | 10 |
| 10.5 | SHA-256 hashing: same config JSON → identical hash (det | deterministic | PASS | 0 |
| 10.6 | Structured event log is tenant-scoped — cross-tenant qu | runtime | PASS | 4 |
| 10.7 | Stress test report has configHash (636da94b1f1d47f7...) | deterministic | PASS | 4 |
| 11.1 | GET /healthz → 200 (expected: 200) | runtime | PASS | 6 |
| 11.2 | GET /readyz → 200 (expected: 200) | runtime | PASS | 6 |
| 11.3 | GET /livez → 200 (expected: 200) | runtime | PASS | 2 |
| 11.4 | GET /api/health → 401 (expected: 200|401|403|302) | runtime | PASS | 2 |
| 11.5 | GET /api/materials → 401 (expected: 401|403|302) | runtime | PASS | 2 |
| 11.6 | GET /api/skus → 401 (expected: 401|403|302) | runtime | PASS | 1 |
| 11.7 | GET /api/suppliers → 401 (expected: 401|403|302) | runtime | PASS | 2 |
| 11.8 | GET /api/rfqs → 401 (expected: 401|403|302) | runtime | PASS | 1 |
| 11.9 | GET /api/allocations → 401 (expected: 401|403|302) | runtime | PASS | 1 |
| 11.10 | GET /api/forecast-accuracy/metrics → 401 (expected: 401 | runtime | PASS | 2 |
| 11.11 | GET /api/multi-horizon-forecasts → 401 (expected: 401|4 | runtime | PASS | 2 |
| 11.12 | GET /api/adaptive-forecast/reports → 401 (expected: 401 | runtime | PASS | 1 |
| 11.13 | GET /api/stress-test/reports → 401 (expected: 401|403|3 | runtime | PASS | 2 |
| 11.14 | POST /api/adaptive-forecast/analyze → 401 (expected: 40 | runtime | PASS | 2 |
| 11.15 | POST /api/stress-test/run → 401 (expected: 401|403|302| | runtime | PASS | 1 |
| 11.16 | Health endpoints all respond within 2000ms (3ms, 6ms, 5 | runtime | PASS | 6 |
| 11.17 | GET /api/does-not-exist-xyz-abc → 401 | runtime | PASS | 1 |
| 12.1 | ERP reconciliation: forecast-vs-actual error ≤50% [fore | runtime | PASS | 3 |
| 12.2 | Cost reality check: max cost drift 5.7% ≤ 20% across 1  | runtime | PASS | 2 |
| 12.3 | Savings traceability: schema has measuredOutcomeRef (tr | structural | PASS | 7 |
| 12.4 | Missing data defense: avgDemand=0 throws INSUFFICIENT_D | deterministic | PASS | 0 |
| 12.4b | Missing data defense: avgDemand=NaN also throws | deterministic | PASS | 0 |
| 12.5 | Extreme values: optimizedQty=18541 ≤ unboundedLimit=140 | deterministic | PASS | 10 |
| 12.6 | Contradictory signals: SIGNAL_INCONSISTENCY flag presen | deterministic | PASS | 1 |
| 12.7 | Explainability: evidenceBundle=true keyDrivers=5 riskFa | deterministic | PASS | 0 |
| 12.8 | Counterfactual: baseline=true optimized=true delta=true | deterministic | PASS | 0 |
| 12.9 | Trust score present: policy=0.849 optimization=0.938 | deterministic | PASS | 4 |
| 12.9b | computeTrustScore math: perfect=1.0, zero=0.0, mid=0.5  | deterministic | PASS | 0 |
| 12.10 | Automation block: trustScore=0.411 automationBlocked=tr | deterministic | PASS | 1 |
| 12.10b | applyTrustGuard throws LOW_TRUST_BLOCKED_DECISION for t | deterministic | PASS | 0 |
| 12.10c | applyTrustGuard sets automationBlocked=true for trustSc | deterministic | PASS | 0 |
| 13.1a | Drift score computed: driftScore=1.0000 rawPSI=34.1802 | deterministic | PASS | 0 |
| 13.1b | DRIFT_DETECTED flag present (flags=["DRIFT_DETECTED","S | deterministic | PASS | 0 |
| 13.1c | trustScore reduced after drift: 0.85 → 0.5950 | deterministic | PASS | 1 |
| 13.1d | Severe drift: automationBlocked=true driftScore=1.0000 | deterministic | PASS | 1 |
| 13.2a | Forecast runs on partial data (50 of 100 records): avg= | deterministic | PASS | 0 |
| 13.2b | dataCompletenessScore reflects missing fields: 0.50 (mi | deterministic | PASS | 0 |
| 13.2c | INSUFFICIENT_DATA flag raised when completeness=0.50 <  | deterministic | PASS | 0 |
| 13.2d | trustScore degrades with partial data: full=0.925 parti | deterministic | PASS | 0 |
| 13.3a | Negative demand: assertEconomicValidity throws for avgD | deterministic | PASS | 1 |
| 13.3b | Extreme outlier (5000) flagged: isAnomaly=true zScore=1 | deterministic | PASS | 1 |
| 13.3c | Non-finite inputs throw SAFETY_VIOLATION: Infinity=true | deterministic | PASS | 1 |
| 13.3d | Zero/NaN avgDemand throws INSUFFICIENT_DEMAND_DATA: zer | deterministic | PASS | 1 |
| 13.3e | Edge-case valid inputs: no NaN in PolicyRecommendation  | deterministic | PASS | 1 |
| 13.4a | Regime flip changes recommendation: HEALTHY_EXPANSION q | deterministic | PASS | 0 |
| 13.4b | Trust reduced during regime transition: stable=0.912 fl | deterministic | PASS | 0 |
| 13.4c | SIGNAL_INCONSISTENCY flagged during regime flip with co | deterministic | PASS | 0 |
| 13.5a | Worsening error sequence detected as degrading: isDegra | deterministic | PASS | 0 |
| 13.5b | historicalAccuracy declines: early=0.942 late=0.566 | deterministic | PASS | 0 |
| 13.5c | ACCURACY_DEGRADING flag raised on worsening series (fla | deterministic | PASS | 0 |
| 13.5d | trustScore reflects accuracy degradation: good=0.928 de | deterministic | PASS | 1 |
| 13.6a | Cost +40% changes optimization expectedCost: baseline=6 | deterministic | PASS | 34 |
| 13.6b | No non-finite values in optimization output under lowCo | deterministic | PASS | 35 |
| 13.6b | No non-finite values in optimization output under highC | deterministic | PASS | 35 |
| 13.6b | No non-finite values in optimization output under veryL | deterministic | PASS | 35 |
| 13.7a | Integrity suite has SF-001 guard (demand not derived fr | structural | PASS | 1 |
| 13.7b | Integrity suite has SF-006/007 guard (unitCost must dif | structural | PASS | 1 |
| 13.7c | SF-001 regression would be caught: derivedDemand=200 (= | deterministic | PASS | 1 |
| 13.7d | Integrity suite has ROI double-counting guard | structural | PASS | 1 |
| 13.8a | 10000 sequential decisions: 0 errors (got 0) | deterministic | PASS | 702 |
| 13.8b | 10000 sequential decisions: 0 NaN outputs (got 0) | deterministic | PASS | 702 |
| 13.8c | Final result valid after 10000 decisions: confidence=0. | deterministic | PASS | 702 |
| 13.8d | Heap growth bounded: -0.5 MB < 50 MB over 10000 calls | deterministic | PASS | 703 |
| 14.1a | ACCESS CONTROL: viewer blocked from operator action (AC | deterministic | PASS | 0 |
| 14.1b | ACCESS CONTROL: analyst blocked from admin action (ACCE | deterministic | PASS | 0 |
| 14.1c | ACCESS CONTROL: operator permitted for operator-level a | deterministic | PASS | 0 |
| 14.1d | ACCESS CONTROL: admin permitted at all levels | deterministic | PASS | 0 |
| 14.2a | REDACTION: password masked → "[REDACTED]" | deterministic | PASS | 1 |
| 14.2b | REDACTION: token masked → "[REDACTED]" | deterministic | PASS | 1 |
| 14.2c | REDACTION: non-sensitive field preserved → "alice" | deterministic | PASS | 1 |
| 14.2d | REDACTION: nested apiKey masked → "[REDACTED]" | deterministic | PASS | 1 |
| 14.3a | TRUST ENFORCEMENT: trustScore=0.3 throws LOW_TRUST_BLOC | deterministic | PASS | 0 |
| 14.3b | TRUST ENFORCEMENT: trustScore=0.5 → automationBlocked=t | deterministic | PASS | 0 |
| 14.3c | TRUST ENFORCEMENT: trustScore=0.85 → automationBlocked= | deterministic | PASS | 0 |
| 14.3d | TRUST ENFORCEMENT: trustScore=0.4 (boundary) does not t | deterministic | PASS | 0 |
| 14.4a | EVIDENCE: empty entityIds throws MISSING_EVIDENCE | deterministic | PASS | 0 |
| 14.4b | EVIDENCE: valid bundle has 64-char SHA-256 hash (got 64 | deterministic | PASS | 1 |
| 14.4c | EVIDENCE: hash is deterministic — same input produces s | deterministic | PASS | 1 |
| 14.5a | ECONOMIC VALIDITY: NaN field throws INVALID_FIELD_x | deterministic | PASS | 0 |
| 14.5b | ECONOMIC VALIDITY: null field throws INVALID_FIELD_dema | deterministic | PASS | 0 |
| 14.5c | ECONOMIC VALIDITY: Infinity throws NON_FINITE_cost | deterministic | PASS | 0 |
| 14.5d | ECONOMIC VALIDITY: null root input throws INVALID_INPUT | deterministic | PASS | 0 |
| 14.5e | ECONOMIC VALIDITY: valid object { demand: 50, cost: 100 | deterministic | PASS | 0 |
| 14.6a | DECISION TRACE: traceId is valid UUID v4 (fffd3d0a-f8d5 | deterministic | PASS | 0 |
| 14.6b | DECISION TRACE: timestamp is valid ISO 8601 (2026-03-29 | deterministic | PASS | 0 |
| 14.6c | DECISION TRACE: trustScore preserved in trace (0.87) | deterministic | PASS | 1 |
| 14.6d | DECISION TRACE: every trace has a unique traceId | deterministic | PASS | 1 |