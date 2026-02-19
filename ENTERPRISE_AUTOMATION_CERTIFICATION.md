# Enterprise Automation Certification

**Platform**: Prescient Labs Manufacturing Intelligence  
**Date**: 2026-02-19  
**Scope**: Distributed locks, idempotency expansion, authorization sweep

---

## How to Run Proof Scripts

### Original Critical Safety Tests (5 tests)
```bash
npx tsx server/tests/critical-evidence-test.ts
```
Expected: `OVERALL: ALL PASS` (exit code 0)

### Enterprise Hardening Proof (32 tests)
```bash
npx tsx server/tests/enterprise-hardening-proof.ts
```
Expected: `OVERALL: ALL PASS` (exit code 0)

---

## Workstream 1: Distributed Locks for Background Jobs

### What Changed

**New file**: `server/lib/distributedLock.ts`
- `acquireJobLock(opts)`: INSERT...ON CONFLICT DO NOTHING into `background_job_locks` table. Returns `{ acquired: true }` if this instance wins the lock; `{ acquired: false }` if another instance holds it.
- `releaseJobLock(lockId)`: DELETE where `id = lockId AND locked_by = thisInstance`.
- `renewJobLock(lockId, ttlMs)`: UPDATE expiresAt + heartbeatAt for lease extension.
- `withJobLock(opts, fn)`: Acquires lock, runs fn with heartbeat renewal at TTL/3 intervals, releases lock on completion.
- Stale lock recovery: if expiresAt < now, CAS update to claim the lock.
- Instance identity: `instance-{uuid}-{pid}` for lock ownership.

**Modified file**: `server/backgroundJobs.ts`
- All 15 background jobs wrapped with `withJobLock` before execution.
- Lock TTL = max(intervalMs * 2, 60s) per job.
- Skipped jobs log: `"Skipped {name}: another instance holds the lock"`.

**Database**: `background_job_locks` table with unique index `bjl_job_company_unique ON (job_name, company_id) NULLS NOT DISTINCT`.

### Jobs Protected (15)
1. Economic Data Updates (5min)
2. Sensor Readings Generation (30s)
3. Commodity Price Updates (10min)
4. ML Predictions Regeneration (15min)
5. Supply Chain Risk Updates (5min)
6. Workforce Metrics Updates (10min)
7. Production KPI Updates (2min)
8. Historical Backtesting (20min)
9. Automated Forecast Retraining (24h)
10. Forecast Accuracy Tracking (4h)
11. RFQ Auto-Generation (15min)
12. Benchmark Data Aggregation (24h)
13. Automation Maintenance (1h)
14. Automation Queue Worker (30s)
15. Data Retention (24h)

### Test Evidence (Tests 1.1-1.6)
- Lock acquisition: single instance acquires, second is rejected
- Lock release + re-acquisition works
- Stale lock recovery after TTL expiry
- withJobLock skips execution when lock already held
- All 15 jobs verified to use withJobLock wrapper

---

## Workstream 2: Idempotency Expansion Beyond Stripe

### What Changed

**Modified file**: `server/lib/automationEngine.ts`

**`buildTriggerEventId(params)`**: Deterministic SHA-256 hash of `{companyId, ruleId, triggerType, objectId, timeBucket, values}`. Time bucket defaults to hour-granularity (`YYYY-MM-DDTHH`). Same semantic event always produces the same ID.

**`createActionIdempotent(companyId, data, triggerEventId, triggerType, ruleId?)`**: Wraps `createAction` with `claimTriggerLock` / `markTriggerOutcome`. If the trigger was already processed, returns `{ deduplicated: true, action: null }` without creating a duplicate action. On failure, marks trigger as "failed".

**Existing infrastructure leveraged**:
- `processedTriggerEvents` table with unique index on `(company_id, trigger_type, trigger_event_id)`.
- `claimTriggerLock`: INSERT-first locking with stale lock recovery (5min timeout).
- `markTriggerOutcome`: Updates status to "processed" or "failed" with completion timestamp.
- Stripe webhook deduplication via `stripeProcessedEvents` table (unchanged, already hardened).

### Test Evidence (Tests 2.1-2.4)
- Same inputs produce identical trigger event IDs (deterministic)
- Different time buckets produce different IDs
- First `createActionIdempotent` creates action; second is deduplicated (no duplicate)
- 5 trigger types (threshold, schedule, event, regime_change, compound) all produce unique IDs
- Cross-tenant: same rule + different companies produce different trigger IDs

---

## Workstream 3: Authorization Sweep + Regression Guard

### What Changed

**Modified file**: `server/storage.ts` (18 methods)

All 7 core entity GET/UPDATE/DELETE methods now accept optional `companyId` parameter:

| Method | Entity | WHERE clause when companyId provided |
|--------|--------|--------------------------------------|
| getSku | skus | `id = $1 AND company_id = $2` |
| getMaterial | materials | `id = $1 AND company_id = $2` |
| getSupplier | suppliers | `id = $1 AND company_id = $2` |
| getMachine | machinery | `id = $1 AND company_id = $2` |
| getRfq | rfqs | `id = $1 AND company_id = $2` |
| getAllocation | allocations | `id = $1 AND company_id = $2` |
| getPriceAlert | priceAlerts | `id = $1 AND company_id = $2` |
| updateSku | skus | `id = $1 AND company_id = $2` |
| updateMaterial | materials | `id = $1 AND company_id = $2` |
| updateMachine | machinery | `id = $1 AND company_id = $2` |
| updateRfq | rfqs | `id = $1 AND company_id = $2` |
| updatePriceAlert | priceAlerts | `id = $1 AND company_id = $2` |
| deleteSku | skus | `id = $1 AND company_id = $2` |
| deleteMaterial | materials | `id = $1 AND company_id = $2` |
| deleteSupplier | suppliers | `id = $1 AND company_id = $2` |
| deleteMachine | machinery | `id = $1 AND company_id = $2` |
| deleteRfq | rfqs | `id = $1 AND company_id = $2` |
| deletePriceAlert | priceAlerts | `id = $1 AND company_id = $2` |

**Modified file**: `server/routes.ts` (30+ call sites)

All primary CRUD routes for 7 entity types now pass `user.companyId` to storage calls. Redundant manual ownership checks removed (the WHERE clause handles it).

### Regression Guard

The proof script scans `server/routes.ts` for unsafe by-id access patterns:
- Searches for calls like `storage.getSku(req.params.id)` without `companyId`
- Searches for calls like `storage.deleteSku(req.params.id)` without `companyId`
- Reports line numbers of any violations found
- Currently: **0 violations** for all 7 core entity types

### Test Evidence (Tests 3.1-3.7)
- Cross-tenant getSku, getMaterial, getSupplier, getRfq all return undefined
- Own-tenant access works correctly for all entities
- Cross-tenant deleteSku does not delete (entity survives)
- Cross-tenant updateMaterial returns undefined, data unchanged
- Regression guard: 0 unsafe GET calls, 0 unsafe DELETE calls

---

## PASS/FAIL Checklist

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | Distributed locks for all 15 background jobs | PASS | Tests 1.1-1.6, distributedLock.ts |
| 2 | Lock contention: second instance rejected | PASS | Test 1.2 |
| 3 | Stale lock recovery after TTL | PASS | Test 1.4 |
| 4 | withJobLock prevents dual execution | PASS | Test 1.5 |
| 5 | Stable triggerEventId (deterministic hash) | PASS | Test 2.1 |
| 6 | createActionIdempotent deduplicates | PASS | Test 2.2 |
| 7 | Trigger types produce unique IDs | PASS | Test 2.3 |
| 8 | Cross-tenant trigger ID isolation | PASS | Test 2.4 |
| 9 | Cross-tenant GET blocked (SKU, Material, Supplier, RFQ) | PASS | Tests 3.1-3.4 |
| 10 | Cross-tenant DELETE blocked | PASS | Test 3.5 |
| 11 | Cross-tenant UPDATE blocked | PASS | Test 3.6 |
| 12 | Regression guard: 0 unsafe patterns | PASS | Test 3.7 |

---

## Previously Verified (not regressed)

| # | Item | Status | Evidence |
|---|------|--------|----------|
| C1 | Cross-tenant IDOR on automation rules | PASS | critical-evidence-test.ts |
| C2 | Spend limit atomicity (50 concurrent) | PASS | critical-evidence-test.ts |
| C3 | AI execute safety (env+safe+spend) | PASS | critical-evidence-test.ts |
| C4 | WebSocket tenant isolation | PASS | critical-evidence-test.ts |
| C5 | Cross-tenant on purchase orders | PASS | critical-evidence-test.ts |

---

## Non-Regressed Constraints

- Economic thesis and canonical regime thresholds: untouched (regimeConstants.ts, FDR thresholds unchanged)
- Stripe webhook deduplication: untouched (stripeProcessedEvents, webhookHandlers.ts)
- Safe mode enforcement: untouched (automationEngine.ts HIGH_STAKES_ACTIONS)
- WebSocket tenant isolation: untouched (websocket.ts broadcastUpdate guard)

---

## Remaining Hardening (Lower Priority)

1. **Authorization sweep for secondary entities**: ~40 additional by-id endpoints for compliance findings, workforce records, SOP items, ERP connections, M&A targets, scenario bookmarks, etc. These follow the same pattern and can be converted systematically.
2. **Integration outbound idempotency**: Slack, Twilio, HubSpot connectors should generate idempotency keys for outbound calls (Stripe already does).
3. **RBAC on automation endpoints**: Automation-related endpoints should enforce RBAC permissions (VIEW_AUTOMATION, EDIT_AUTOMATION, APPROVE_AUTOMATION).
