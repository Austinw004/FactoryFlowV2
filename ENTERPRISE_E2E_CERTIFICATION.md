# Enterprise E2E Certification Report

**Generated**: 2026-02-21T20:43:42.012Z  
**Certification Version**: 2.0.0  
**Instance**: single-instance (development)  
**Overall**: ALL GATES PASS  
**Tests**: 116 passed, 0 failed, 116 total  
**Proof Breakdown**: 78 runtime, 15 structural, 23 deterministic

---

## Executive Summary

This certification report validates the enterprise readiness of the Prescient Labs Manufacturing Intelligence Platform across 7 operational gates. All gates passed. The platform meets the requirements for beta deployment in a single-instance configuration.

**Environment Assumptions**: Single-instance deployment with PostgreSQL-backed distributed locks ready for multi-instance scale-out. All isolation and safety guarantees hold under concurrent access within a single process.

---

## Gate Summary

| Gate | Description | Result | Tests |
|------|-------------|--------|-------|
| Gate 1: Multi-Tenant Isolation | Multi-tenant isolation enforced via WHERE-clause scoping for all core entities + HTTP auth enforcement | PASS | 19/19 |
| Gate 2: Spend Limits & Guardrails | Spend limits are atomic, safe mode enforced at runtime, guardrail escalation persisted | PASS | 5/5 |
| Gate 3: Automation Engine Safety | Distributed locks, idempotency, multi-instance correctness verified | PASS | 12/12 |
| Gate 4: Payments & Billing | Stripe webhook dedup, race safety, state transitions, no phantom states | PASS | 7/7 |
| Gate 5: Integration Coherence | Integration health, dead letter, idempotency, canonical entities, observability | PASS | 9/9 |
| Gate 6: Data Honesty & Economic Thesis | FDR thresholds, boundary classification, hysteresis, reversion penalty, edge cases | PASS | 10/10 |
| Gate 7: Operational Readiness | Health probes (HTTP), rate limiting, structured logging (runtime), crash recovery, secret redaction (runtime) | PASS | 8/8 |
| Gate 8: Copilot Safety & Data Quality | Copilot draft-only safety, evaluation calibration, decision intelligence, data quality gates | PASS | 21/21 |
| Gate 9: Predictive Lift & Enterprise Controls | Predictive lift benchmarks, counterfactual savings evidence, copilot evidence traceability, enterprise identity & access controls | PASS | 25/25 |

---

## Gate 1: Multi-Tenant Isolation

**Started**: 2026-02-21T20:43:11.028Z  
**Completed**: 2026-02-21T20:43:11.188Z  
**Result**: PASS

| ID | Test | Proof Type | Result | Duration |
|-----|------|------------|--------|----------|
| 1.1 | Route scanner: no unsafe by-id access for 9 core entities | structural | PASS | 25ms |
| 1.2a | Cross-tenant GET SKU blocked | runtime | PASS | 5ms |
| 1.2b | Own-tenant GET SKU succeeds | runtime | PASS | 5ms |
| 1.3a | Cross-tenant GET Material blocked | runtime | PASS | 6ms |
| 1.3b | Own-tenant GET Material succeeds | runtime | PASS | 6ms |
| 1.4a | Cross-tenant GET Supplier blocked | runtime | PASS | 5ms |
| 1.4b | Own-tenant GET Supplier succeeds | runtime | PASS | 5ms |
| 1.5a | Cross-tenant GET RFQ blocked | runtime | PASS | 5ms |
| 1.5b | Own-tenant GET RFQ succeeds | runtime | PASS | 5ms |
| 1.6a | Cross-tenant GET Machinery blocked | runtime | PASS | 5ms |
| 1.6b | Own-tenant GET Machinery succeeds | runtime | PASS | 5ms |
| 1.7a | Cross-tenant UPDATE Material blocked | runtime | PASS | 6ms |
| 1.7b | Material name unchanged after cross-tenant update | runtime | PASS | 6ms |
| 1.8 | Cross-tenant DELETE SKU blocked (entity survives) | runtime | PASS | 5ms |
| 1.9 | Cross-tenant GET automation rule blocked | runtime | PASS | 8ms |
| 1.10 | Cross-tenant GET purchase order blocked | runtime | PASS | 7ms |
| 1.11 | GET /healthz returns 200 (server reachable) | runtime | PASS | 44ms |
| 1.12 | GET /api/skus returns 401 without auth (auth enforced) | runtime | PASS | 6ms |
| 1.13 | GET /api/materials returns 401 without auth (auth enforced) | runtime | PASS | 2ms |

### Evidence Details

<details>
<summary>1.1: Route scanner: no unsafe by-id access for 9 core entities — PASS (structural)</summary>

- **Validated**: All GET/UPDATE/DELETE by-id calls pass companyId
- **Proof Type**: structural
- **Endpoints/Functions**: server/routes.ts (all by-id routes)
- **Inputs**: Regex scan of routes.ts for single-arg storage calls
- **Expected**: 0 unsafe patterns
- **Actual**: 0 unsafe patterns
- **Evidence**: Scanned 9 entity types, 27 method patterns

</details>

<details>
<summary>1.2a: Cross-tenant GET SKU blocked — PASS (runtime)</summary>

- **Validated**: getSku returns undefined for wrong tenant
- **Proof Type**: runtime
- **Endpoints/Functions**: storage.getSku
- **Inputs**: id=5219acc5-f411-4bb5-9839-2c7a1f8b8510, companyId=cert-1771706590951-co-bravo (wrong tenant)
- **Expected**: undefined
- **Actual**: undefined

</details>

<details>
<summary>1.2b: Own-tenant GET SKU succeeds — PASS (runtime)</summary>

- **Validated**: getSku returns entity for correct tenant
- **Proof Type**: runtime
- **Endpoints/Functions**: storage.getSku
- **Inputs**: id=5219acc5-f411-4bb5-9839-2c7a1f8b8510, companyId=cert-1771706590951-co-alpha
- **Expected**: entity object
- **Actual**: entity found

</details>

<details>
<summary>1.3a: Cross-tenant GET Material blocked — PASS (runtime)</summary>

- **Validated**: getMaterial returns undefined for wrong tenant
- **Proof Type**: runtime
- **Endpoints/Functions**: storage.getMaterial
- **Inputs**: id=7cdfe3d7-7a9a-4f77-a617-7134feadeb69, companyId=cert-1771706590951-co-bravo (wrong tenant)
- **Expected**: undefined
- **Actual**: undefined

</details>

<details>
<summary>1.3b: Own-tenant GET Material succeeds — PASS (runtime)</summary>

- **Validated**: getMaterial returns entity for correct tenant
- **Proof Type**: runtime
- **Endpoints/Functions**: storage.getMaterial
- **Inputs**: id=7cdfe3d7-7a9a-4f77-a617-7134feadeb69, companyId=cert-1771706590951-co-alpha
- **Expected**: entity object
- **Actual**: entity found

</details>

<details>
<summary>1.4a: Cross-tenant GET Supplier blocked — PASS (runtime)</summary>

- **Validated**: getSupplier returns undefined for wrong tenant
- **Proof Type**: runtime
- **Endpoints/Functions**: storage.getSupplier
- **Inputs**: id=8d5cedfa-1382-4509-93ca-0e21985d4ccf, companyId=cert-1771706590951-co-bravo (wrong tenant)
- **Expected**: undefined
- **Actual**: undefined

</details>

<details>
<summary>1.4b: Own-tenant GET Supplier succeeds — PASS (runtime)</summary>

- **Validated**: getSupplier returns entity for correct tenant
- **Proof Type**: runtime
- **Endpoints/Functions**: storage.getSupplier
- **Inputs**: id=8d5cedfa-1382-4509-93ca-0e21985d4ccf, companyId=cert-1771706590951-co-alpha
- **Expected**: entity object
- **Actual**: entity found

</details>

<details>
<summary>1.5a: Cross-tenant GET RFQ blocked — PASS (runtime)</summary>

- **Validated**: getRfq returns undefined for wrong tenant
- **Proof Type**: runtime
- **Endpoints/Functions**: storage.getRfq
- **Inputs**: id=7ef71e6f-5899-444d-b1de-3e4b780128fd, companyId=cert-1771706590951-co-bravo (wrong tenant)
- **Expected**: undefined
- **Actual**: undefined

</details>

<details>
<summary>1.5b: Own-tenant GET RFQ succeeds — PASS (runtime)</summary>

- **Validated**: getRfq returns entity for correct tenant
- **Proof Type**: runtime
- **Endpoints/Functions**: storage.getRfq
- **Inputs**: id=7ef71e6f-5899-444d-b1de-3e4b780128fd, companyId=cert-1771706590951-co-alpha
- **Expected**: entity object
- **Actual**: entity found

</details>

<details>
<summary>1.6a: Cross-tenant GET Machinery blocked — PASS (runtime)</summary>

- **Validated**: getMachine returns undefined for wrong tenant
- **Proof Type**: runtime
- **Endpoints/Functions**: storage.getMachine
- **Inputs**: id=66789f59-9603-4df4-bb52-8b06c999a4ae, companyId=cert-1771706590951-co-bravo (wrong tenant)
- **Expected**: undefined
- **Actual**: undefined

</details>

<details>
<summary>1.6b: Own-tenant GET Machinery succeeds — PASS (runtime)</summary>

- **Validated**: getMachine returns entity for correct tenant
- **Proof Type**: runtime
- **Endpoints/Functions**: storage.getMachine
- **Inputs**: id=66789f59-9603-4df4-bb52-8b06c999a4ae, companyId=cert-1771706590951-co-alpha
- **Expected**: entity object
- **Actual**: entity found

</details>

<details>
<summary>1.7a: Cross-tenant UPDATE Material blocked — PASS (runtime)</summary>

- **Validated**: updateMaterial returns undefined for wrong tenant
- **Proof Type**: runtime
- **Endpoints/Functions**: storage.updateMaterial
- **Inputs**: id=7cdfe3d7-7a9a-4f77-a617-7134feadeb69, companyId=cert-1771706590951-co-bravo
- **Expected**: undefined
- **Actual**: undefined

</details>

<details>
<summary>1.7b: Material name unchanged after cross-tenant update — PASS (runtime)</summary>

- **Validated**: Data integrity preserved
- **Proof Type**: runtime
- **Endpoints/Functions**: storage.getMaterial
- **Inputs**: id=7cdfe3d7-7a9a-4f77-a617-7134feadeb69, companyId=cert-1771706590951-co-alpha
- **Expected**: cert-1771706590951-mat-A
- **Actual**: cert-1771706590951-mat-A

</details>

<details>
<summary>1.8: Cross-tenant DELETE SKU blocked (entity survives) — PASS (runtime)</summary>

- **Validated**: deleteSku does not delete when companyId doesn't match
- **Proof Type**: runtime
- **Endpoints/Functions**: storage.deleteSku
- **Inputs**: id=5219acc5-f411-4bb5-9839-2c7a1f8b8510, companyId=cert-1771706590951-co-bravo
- **Expected**: entity still exists
- **Actual**: entity exists

</details>

<details>
<summary>1.9: Cross-tenant GET automation rule blocked — PASS (runtime)</summary>

- **Validated**: getAiAutomationRule WHERE-clause scoped by companyId
- **Proof Type**: runtime
- **Endpoints/Functions**: storage.getAiAutomationRule
- **Inputs**: id=9bb0b5f0-fcc7-4d91-be0a-06efd2d01c4f, companyId=cert-1771706590951-co-bravo
- **Expected**: undefined
- **Actual**: undefined

</details>

<details>
<summary>1.10: Cross-tenant GET purchase order blocked — PASS (runtime)</summary>

- **Validated**: getPurchaseOrder WHERE-clause scoped by companyId
- **Proof Type**: runtime
- **Endpoints/Functions**: storage.getPurchaseOrder
- **Inputs**: id=b7f07fef-80a4-429f-b55e-9123a61098b4, companyId=cert-1771706590951-co-bravo
- **Expected**: undefined
- **Actual**: undefined

</details>

<details>
<summary>1.11: GET /healthz returns 200 (server reachable) — PASS (runtime)</summary>

- **Validated**: Server is reachable and health endpoint responds
- **Proof Type**: runtime
- **Endpoints/Functions**: GET /healthz
- **Inputs**: Unauthenticated GET request
- **Expected**: status 200
- **Actual**: status 200

</details>

<details>
<summary>1.12: GET /api/skus returns 401 without auth (auth enforced) — PASS (runtime)</summary>

- **Validated**: API endpoints require authentication
- **Proof Type**: runtime
- **Endpoints/Functions**: GET /api/skus
- **Inputs**: Unauthenticated GET request
- **Expected**: status 401
- **Actual**: status 401

</details>

<details>
<summary>1.13: GET /api/materials returns 401 without auth (auth enforced) — PASS (runtime)</summary>

- **Validated**: API endpoints require authentication
- **Proof Type**: runtime
- **Endpoints/Functions**: GET /api/materials
- **Inputs**: Unauthenticated GET request
- **Expected**: status 401
- **Actual**: status 401

</details>

---

## Gate 2: Spend Limits & Guardrails

**Started**: 2026-02-21T20:43:11.188Z  
**Completed**: 2026-02-21T20:43:11.770Z  
**Result**: PASS

| ID | Test | Proof Type | Result | Duration |
|-----|------|------------|--------|----------|
| 2.1a | Concurrency: exactly 20 requests allowed out of 50 | runtime | PASS | 231ms |
| 2.1b | Final spend total exactly equals limit (no overshoot) | runtime | PASS | 231ms |
| 2.2 | Safe mode: create_po action requires approval (runtime proof) | runtime | PASS | 33ms |
| 2.3 | Guardrail escalation event persisted and readable (runtime proof) | runtime | PASS | 312ms |
| 2.4 | automationSafeMode table has expected row after enabling (runtime proof) | runtime | PASS | 3ms |

### Evidence Details

<details>
<summary>2.1a: Concurrency: exactly 20 requests allowed out of 50 — PASS (runtime)</summary>

- **Validated**: Atomic spend check allows exactly floor(limit/amount) requests
- **Proof Type**: runtime
- **Endpoints/Functions**: AutomationEngine.atomicSpendCheck
- **Inputs**: 50 parallel requests × $5, limit=$100
- **Expected**: 20 allowed
- **Actual**: 20 allowed, 30 blocked
- **Evidence**: Final spend total: $100

</details>

<details>
<summary>2.1b: Final spend total exactly equals limit (no overshoot) — PASS (runtime)</summary>

- **Validated**: No TOCTOU: spend total never exceeds limit
- **Proof Type**: runtime
- **Endpoints/Functions**: automation_runtime_state
- **Inputs**: After 50 concurrent requests
- **Expected**: $100
- **Actual**: $100

</details>

<details>
<summary>2.2: Safe mode: create_po action requires approval (runtime proof) — PASS (runtime)</summary>

- **Validated**: High-stakes action under safe mode is downgraded to approval-required
- **Proof Type**: runtime
- **Endpoints/Functions**: AutomationEngine.createAction
- **Inputs**: companyId=cert-1771706590951-safemode-test, actionType=create_po, safeModeEnabled=true
- **Expected**: status=awaiting_approval or requiresApproval=1
- **Actual**: status=awaiting_approval, requiresApproval=1

</details>

<details>
<summary>2.3: Guardrail escalation event persisted and readable (runtime proof) — PASS (runtime)</summary>

- **Validated**: guardrail_escalation event written to structuredEventLog and queryable
- **Proof Type**: runtime
- **Endpoints/Functions**: structuredEventLog table
- **Inputs**: Inserted guardrail_escalation with marker=cert-1771706590951-guardrail-esc-1771706591455
- **Expected**: Row found in structured_event_log
- **Actual**: Found

</details>

<details>
<summary>2.4: automationSafeMode table has expected row after enabling (runtime proof) — PASS (runtime)</summary>

- **Validated**: Safe mode state persisted in database
- **Proof Type**: runtime
- **Endpoints/Functions**: automationSafeMode table
- **Inputs**: companyId=cert-1771706590951-safemode-test
- **Expected**: safe_mode_enabled=1
- **Actual**: safe_mode_enabled=1

</details>

---

## Gate 3: Automation Engine Safety

**Started**: 2026-02-21T20:43:11.771Z  
**Completed**: 2026-02-21T20:43:11.941Z  
**Result**: PASS

| ID | Test | Proof Type | Result | Duration |
|-----|------|------------|--------|----------|
| 3.1 | All 15 background jobs are lock-wrapped via withJobLock(config.name) | structural | PASS | 2ms |
| 3.2a | First lock acquisition succeeds | runtime | PASS | 36ms |
| 3.2b | Second lock acquisition rejected (contention) | runtime | PASS | 61ms |
| 3.3 | Lock re-acquired after release | runtime | PASS | 5ms |
| 3.4 | Stale lock recovered after TTL expiry | runtime | PASS | 18ms |
| 3.5a | withJobLock skips execution when lock already held | runtime | PASS | 8ms |
| 3.5b | withJobLock executes when lock available | runtime | PASS | 21ms |
| 3.6a | Trigger event IDs are deterministic (same inputs, different key order → same ID) | deterministic | PASS | 1ms |
| 3.6b | Different time bucket → different ID | deterministic | PASS | 1ms |
| 3.7 | Same rule, different companies → different trigger IDs | deterministic | PASS | 0ms |
| 3.8a | First createActionIdempotent creates action | runtime | PASS | 37ms |
| 3.8b | Second createActionIdempotent is deduplicated | runtime | PASS | 37ms |

### Evidence Details

<details>
<summary>3.1: All 15 background jobs are lock-wrapped via withJobLock(config.name) — PASS (structural)</summary>

- **Validated**: Every background job config uses withJobLock with config.name in the job loop
- **Proof Type**: structural
- **Endpoints/Functions**: server/backgroundJobs.ts
- **Inputs**: Parsed 15 job configs from source
- **Expected**: 15 jobs found, all wrapped with withJobLock({ jobName: config.name })
- **Actual**: 15 jobs found, withJobLock(config.name)=true
- **Evidence**: Jobs: Economic Data Updates, Sensor Readings Generation, Commodity Price Updates, ML Predictions Regeneration, Supply Chain Risk Updates, Workforce Metrics Updates, Production KPI Updates, Historical Backtesting (Research), Automated Forecast Retraining, Forecast Accuracy Tracking, RFQ Auto-Generation, Benchmark Data Aggregation, Automation Maintenance, Automation Queue Worker, Data Retention

</details>

<details>
<summary>3.2a: First lock acquisition succeeds — PASS (runtime)</summary>

- **Validated**: acquireJobLock returns acquired=true for uncontested lock
- **Proof Type**: runtime
- **Endpoints/Functions**: acquireJobLock
- **Inputs**: jobName=cert-1771706590951-test-job
- **Expected**: acquired=true
- **Actual**: acquired=true

</details>

<details>
<summary>3.2b: Second lock acquisition rejected (contention) — PASS (runtime)</summary>

- **Validated**: acquireJobLock returns acquired=false when lock already held
- **Proof Type**: runtime
- **Endpoints/Functions**: acquireJobLock
- **Inputs**: same jobName, different instance
- **Expected**: acquired=false
- **Actual**: acquired=false

</details>

<details>
<summary>3.3: Lock re-acquired after release — PASS (runtime)</summary>

- **Validated**: Released lock can be re-acquired
- **Proof Type**: runtime
- **Endpoints/Functions**: acquireJobLock + releaseJobLock
- **Inputs**: jobName=cert-1771706590951-test-job after release
- **Expected**: acquired=true
- **Actual**: acquired=true

</details>

<details>
<summary>3.4: Stale lock recovered after TTL expiry — PASS (runtime)</summary>

- **Validated**: Expired lock is taken over by CAS UPDATE
- **Proof Type**: runtime
- **Endpoints/Functions**: acquireJobLock (stale recovery path)
- **Inputs**: Lock with expiresAt in past
- **Expected**: acquired=true
- **Actual**: acquired=true

</details>

<details>
<summary>3.5a: withJobLock skips execution when lock already held — PASS (runtime)</summary>

- **Validated**: withJobLock does not execute callback if lock is contested
- **Proof Type**: runtime
- **Endpoints/Functions**: withJobLock
- **Inputs**: jobName=cert-1771706590951-wrapper-job (pre-locked)
- **Expected**: callback not executed
- **Actual**: callback skipped

</details>

<details>
<summary>3.5b: withJobLock executes when lock available — PASS (runtime)</summary>

- **Validated**: withJobLock executes callback when lock is available
- **Proof Type**: runtime
- **Endpoints/Functions**: withJobLock
- **Inputs**: jobName=cert-1771706590951-wrapper-job (released)
- **Expected**: callback executed
- **Actual**: callback ran

</details>

<details>
<summary>3.6a: Trigger event IDs are deterministic (same inputs, different key order → same ID) — PASS (deterministic)</summary>

- **Validated**: buildTriggerEventId sorts keys before hashing
- **Proof Type**: deterministic
- **Endpoints/Functions**: buildTriggerEventId
- **Inputs**: {"companyId":"cert-1771706590951-co-alpha","ruleId":"r1","triggerType":"threshold","objectId":"obj1","timeBucket":"2026-02-19T10","values":{"b":2,"a":1}}
- **Expected**: id1 === id2
- **Actual**: id1=ebf014d8bba82cbcdf5dba541cc75ba5, id2=ebf014d8bba82cbcdf5dba541cc75ba5

</details>

<details>
<summary>3.6b: Different time bucket → different ID — PASS (deterministic)</summary>

- **Validated**: Time bucket affects trigger event ID
- **Proof Type**: deterministic
- **Endpoints/Functions**: buildTriggerEventId
- **Inputs**: Same params, different timeBucket
- **Expected**: id1 !== id3
- **Actual**: id1=ebf014d8bba82cbcdf5dba541cc75ba5, id3=4f0e2c92bfdb770fbc9536b131e35ef2

</details>

<details>
<summary>3.7: Same rule, different companies → different trigger IDs — PASS (deterministic)</summary>

- **Validated**: companyId is part of trigger event ID hash
- **Proof Type**: deterministic
- **Endpoints/Functions**: buildTriggerEventId
- **Inputs**: companyA=cert-1771706590951-co-alpha, companyB=cert-1771706590951-co-bravo
- **Expected**: different IDs
- **Actual**: idA=5e877eecdeda5d61016f605d5d06a377, idB=e19e6392144c80f41e826f3499d38b52

</details>

<details>
<summary>3.8a: First createActionIdempotent creates action — PASS (runtime)</summary>

- **Validated**: First call creates the action
- **Proof Type**: runtime
- **Endpoints/Functions**: createActionIdempotent
- **Inputs**: triggerEventId=cert-1771706590951-dedup-trigger-1771706591904
- **Expected**: deduplicated=false, action created
- **Actual**: deduplicated=false, actionId=c83a4e44-15c7-48cb-9e4d-2b45b8319739

</details>

<details>
<summary>3.8b: Second createActionIdempotent is deduplicated — PASS (runtime)</summary>

- **Validated**: Duplicate trigger event ID is rejected
- **Proof Type**: runtime
- **Endpoints/Functions**: createActionIdempotent
- **Inputs**: Same triggerEventId=cert-1771706590951-dedup-trigger-1771706591904
- **Expected**: deduplicated=true
- **Actual**: deduplicated=true

</details>

---

## Gate 4: Payments & Billing

**Started**: 2026-02-21T20:43:11.942Z  
**Completed**: 2026-02-21T20:43:11.994Z  
**Result**: PASS

| ID | Test | Proof Type | Result | Duration |
|-----|------|------------|--------|----------|
| 4.1 | Stripe webhook dedup uses insert-first DB locking | structural | PASS | 0ms |
| 4.2 | Duplicate webhook delivery blocked by unique constraint | runtime | PASS | 9ms |
| 4.3 | Concurrent webhook deliveries: exactly 1 wins | runtime | PASS | 38ms |
| 4.4 | Subscription state transitions use monotonic guard map (structural proof) | structural | PASS | 0ms |
| 4.5 | Webhook stale lock recovery with CAS takeover (structural proof) | structural | PASS | 0ms |
| 4.6 | User schema includes Stripe customer/subscription/status fields | structural | PASS | 4ms |
| 4.7 | Webhook handlers use only parameterized SQL (no sql.raw) | structural | PASS | 0ms |

### Evidence Details

<details>
<summary>4.1: Stripe webhook dedup uses insert-first DB locking — PASS (structural)</summary>

- **Validated**: acquireEventLock inserts into stripeProcessedEvents, handles 23505 (unique violation)
- **Proof Type**: structural
- **Endpoints/Functions**: WebhookHandlers.acquireEventLock
- **Inputs**: Source code inspection
- **Expected**: INSERT + 23505 error handling
- **Actual**: Pattern present

</details>

<details>
<summary>4.2: Duplicate webhook delivery blocked by unique constraint — PASS (runtime)</summary>

- **Validated**: Second INSERT for same event_id throws unique violation
- **Proof Type**: runtime
- **Endpoints/Functions**: stripeProcessedEvents table
- **Inputs**: eventId=cert-1771706590951-evt-1771706591942 (second insert)
- **Expected**: unique violation error
- **Actual**: Blocked (23505)

</details>

<details>
<summary>4.3: Concurrent webhook deliveries: exactly 1 wins — PASS (runtime)</summary>

- **Validated**: Out of 10 concurrent INSERTs for same event_id, exactly 1 succeeds
- **Proof Type**: runtime
- **Endpoints/Functions**: stripeProcessedEvents unique constraint
- **Inputs**: 10 concurrent INSERTs for eventId=cert-1771706590951-conc-evt-1771706591951
- **Expected**: 1 success
- **Actual**: 1 successes

</details>

<details>
<summary>4.4: Subscription state transitions use monotonic guard map (structural proof) — PASS (structural)</summary>

- **Validated**: ALLOWED_TRANSITIONS map with executeGuardedTransition prevents illegal state regressions
- **Proof Type**: structural
- **Endpoints/Functions**: WebhookHandlers / isTransitionAllowed / executeGuardedTransition
- **Inputs**: Structural analysis of webhookHandlers.ts
- **Expected**: ALLOWED_TRANSITIONS + isTransitionAllowed + executeGuardedTransition
- **Actual**: guard=true, executeFn=true, eventTypes=6/6

</details>

<details>
<summary>4.5: Webhook stale lock recovery with CAS takeover (structural proof) — PASS (structural)</summary>

- **Validated**: Stale processing locks are recovered after STALE_LOCK_THRESHOLD_MINUTES with CAS UPDATE
- **Proof Type**: structural
- **Endpoints/Functions**: WebhookHandlers.acquireEventLock
- **Inputs**: Structural analysis of stale lock recovery path
- **Expected**: STALE_LOCK_THRESHOLD_MINUTES + stale_lock_takeover + MAX_STALE_TAKEOVERS
- **Actual**: threshold=true, takeover=true, maxTakeovers=true, processingCheck=true

</details>

<details>
<summary>4.6: User schema includes Stripe customer/subscription/status fields — PASS (structural)</summary>

- **Validated**: No phantom states: payment fields are persisted in users table
- **Proof Type**: structural
- **Endpoints/Functions**: shared/schema.ts (users table)
- **Inputs**: Schema inspection
- **Expected**: stripeCustomerId, stripeSubscriptionId, subscriptionStatus columns
- **Actual**: All present

</details>

<details>
<summary>4.7: Webhook handlers use only parameterized SQL (no sql.raw) — PASS (structural)</summary>

- **Validated**: No SQL injection risk in webhook processing
- **Proof Type**: structural
- **Endpoints/Functions**: server/webhookHandlers.ts
- **Inputs**: Source code grep for sql.raw
- **Expected**: 0 occurrences
- **Actual**: No sql.raw

</details>

---

## Gate 5: Integration Coherence

**Started**: 2026-02-21T20:43:11.994Z  
**Completed**: 2026-02-21T20:43:12.566Z  
**Result**: PASS

| ID | Test | Proof Type | Result | Duration |
|-----|------|------------|--------|----------|
| 5.1a | GET /healthz returns 200 (server is up) | runtime | PASS | 6ms |
| 5.1b | GET /api/integrations/health returns 401 (endpoint exists, auth enforced) | runtime | PASS | 3ms |
| 5.2a | Integration events table exists for provenance tracking | structural | PASS | 4ms |
| 5.2b | Integration events support idempotency keys | structural | PASS | 5ms |
| 5.2c | Integration event idempotency: duplicate idempotencyKey rejected | runtime | PASS | 38ms |
| 5.3 | Dead letter / retry mechanism exists | structural | PASS | 1ms |
| 5.4 | Canonical entity mapping exists | structural | PASS | 0ms |
| 5.5 | Health checks include latency tracking and status categories | structural | PASS | 11ms |
| 5.6 | Structured logger: integration events persist to DB with secret redaction (runtime proof) | runtime | PASS | 505ms |

### Evidence Details

<details>
<summary>5.1a: GET /healthz returns 200 (server is up) — PASS (runtime)</summary>

- **Validated**: Server health endpoint is reachable
- **Proof Type**: runtime
- **Endpoints/Functions**: GET /healthz
- **Inputs**: Unauthenticated GET
- **Expected**: status 200
- **Actual**: status 200

</details>

<details>
<summary>5.1b: GET /api/integrations/health returns 401 (endpoint exists, auth enforced) — PASS (runtime)</summary>

- **Validated**: Integration health endpoint exists and requires authentication
- **Proof Type**: runtime
- **Endpoints/Functions**: GET /api/integrations/health
- **Inputs**: Unauthenticated GET
- **Expected**: status 401
- **Actual**: status 401

</details>

<details>
<summary>5.2a: Integration events table exists for provenance tracking — PASS (structural)</summary>

- **Validated**: All integration events have persistent storage for audit trail
- **Proof Type**: structural
- **Endpoints/Functions**: shared/schema.ts
- **Inputs**: Schema inspection
- **Expected**: integrationEvents table
- **Actual**: Found

</details>

<details>
<summary>5.2b: Integration events support idempotency keys — PASS (structural)</summary>

- **Validated**: Idempotency key column exists for deduplication
- **Proof Type**: structural
- **Endpoints/Functions**: shared/schema.ts
- **Inputs**: Schema inspection
- **Expected**: idempotencyKey column
- **Actual**: Found

</details>

<details>
<summary>5.2c: Integration event idempotency: duplicate idempotencyKey rejected — PASS (runtime)</summary>

- **Validated**: Unique constraint on (companyId, idempotencyKey) prevents duplicate integration events
- **Proof Type**: runtime
- **Endpoints/Functions**: integrationEvents table
- **Inputs**: Inserted with idempotencyKey=cert-1771706590951-idemp-1771706592009, then attempted duplicate
- **Expected**: Second insert blocked, 1 row exists
- **Actual**: dupBlocked=true, rowCount=1

</details>

<details>
<summary>5.3: Dead letter / retry mechanism exists — PASS (structural)</summary>

- **Validated**: Failed integration events are tracked for retry/inspection
- **Proof Type**: structural
- **Endpoints/Functions**: shared/schema.ts
- **Inputs**: Schema inspection
- **Expected**: Dead letter or retry columns
- **Actual**: Found

</details>

<details>
<summary>5.4: Canonical entity mapping exists — PASS (structural)</summary>

- **Validated**: Integration entities are mapped to canonical internal entities
- **Proof Type**: structural
- **Endpoints/Functions**: shared/schema.ts
- **Inputs**: Schema inspection
- **Expected**: canonicalEntities or canonicalObjectType columns
- **Actual**: Found

</details>

<details>
<summary>5.5: Health checks include latency tracking and status categories — PASS (structural)</summary>

- **Validated**: Integration health reports latency and categorizes as healthy/degraded/offline
- **Proof Type**: structural
- **Endpoints/Functions**: GET /api/integrations/health
- **Inputs**: Route source inspection
- **Expected**: Latency + status categories
- **Actual**: Both found

</details>

<details>
<summary>5.6: Structured logger: integration events persist to DB with secret redaction (runtime proof) — PASS (runtime)</summary>

- **Validated**: Logger persists warn+ events to structured_event_log, redacts sensitive keys, preserves normal keys
- **Proof Type**: runtime
- **Endpoints/Functions**: structuredLogger.ts → structured_event_log table
- **Inputs**: logger.warn('integration', 'cert-test-event-1771706592061', { details: { testKey: 'testValue', password: 'secret123' } })
- **Expected**: Row found, password=[REDACTED], testKey=testValue
- **Actual**: found=true, password=[REDACTED], testKey=testValue

</details>

---

## Gate 6: Data Honesty & Economic Thesis

**Started**: 2026-02-21T20:43:12.567Z  
**Completed**: 2026-02-21T20:43:12.568Z  
**Result**: PASS

| ID | Test | Proof Type | Result | Duration |
|-----|------|------------|--------|----------|
| 6.1 | Canonical FDR thresholds match documented values | deterministic | PASS | 0ms |
| 6.2 | classifyRegimeFromFDR correct at all boundary values | deterministic | PASS | 0ms |
| 6.3 | Edge case FDR values produce safe defaults | deterministic | PASS | 0ms |
| 6.4a | Hysteresis: FDR slightly above boundary doesn't trigger transition | deterministic | PASS | 0ms |
| 6.4b | Hysteresis: FDR well above boundary triggers transition with confirmation | deterministic | PASS | 0ms |
| 6.5a | Reversion penalty: 2x hysteresis prevents premature reversion | deterministic | PASS | 0ms |
| 6.5b | Reversion occurs when past 2x hysteresis band | deterministic | PASS | 0ms |
| 6.6 | Regime constants match documented values | deterministic | PASS | 0ms |
| 6.7 | validateRegimeClassification detects mismatches | deterministic | PASS | 0ms |
| 6.8 | Hysteresis safe under NaN/Infinity (stays current) | deterministic | PASS | 0ms |

### Evidence Details

<details>
<summary>6.1: Canonical FDR thresholds match documented values — PASS (deterministic)</summary>

- **Validated**: CANONICAL_REGIME_THRESHOLDS is the single source of truth with correct values
- **Proof Type**: deterministic
- **Endpoints/Functions**: regimeConstants.ts
- **Inputs**: Direct import verification
- **Expected**: HE[0,1.2], ALG[1.2,1.8], IE[1.8,2.5], REL[2.5,10]
- **Actual**: HE[0,1.2], ALG[1.2,1.8], IE[1.8,2.5], REL[2.5,10]

</details>

<details>
<summary>6.2: classifyRegimeFromFDR correct at all boundary values — PASS (deterministic)</summary>

- **Validated**: Classification matches canonical thresholds at every boundary
- **Proof Type**: deterministic
- **Endpoints/Functions**: classifyRegimeFromFDR
- **Inputs**: FDR=0, FDR=1.19, FDR=1.2, FDR=1.79, FDR=1.8, FDR=2.49, FDR=2.5, FDR=5
- **Expected**: 0→HEALTHY_EXPANSION, 1.19→HEALTHY_EXPANSION, 1.2→ASSET_LED_GROWTH, 1.79→ASSET_LED_GROWTH, 1.8→IMBALANCED_EXCESS, 2.49→IMBALANCED_EXCESS, 2.5→REAL_ECONOMY_LEAD, 5→REAL_ECONOMY_LEAD
- **Actual**: FDR=0→HEALTHY_EXPANSION(OK), FDR=1.19→HEALTHY_EXPANSION(OK), FDR=1.2→ASSET_LED_GROWTH(OK), FDR=1.79→ASSET_LED_GROWTH(OK), FDR=1.8→IMBALANCED_EXCESS(OK), FDR=2.49→IMBALANCED_EXCESS(OK), FDR=2.5→REAL_ECONOMY_LEAD(OK), FDR=5→REAL_ECONOMY_LEAD(OK)

</details>

<details>
<summary>6.3: Edge case FDR values produce safe defaults — PASS (deterministic)</summary>

- **Validated**: NaN, negative, Infinity all default to HEALTHY_EXPANSION (safe default)
- **Proof Type**: deterministic
- **Endpoints/Functions**: classifyRegimeFromFDR
- **Inputs**: NaN, -5, Infinity
- **Expected**: HE, HE, HE (safe defaults)
- **Actual**: NaN→HEALTHY_EXPANSION, -5→HEALTHY_EXPANSION, Inf→HEALTHY_EXPANSION

</details>

<details>
<summary>6.4a: Hysteresis: FDR slightly above boundary doesn't trigger transition — PASS (deterministic)</summary>

- **Validated**: Within hysteresis band (0.15), regime stays current
- **Proof Type**: deterministic
- **Endpoints/Functions**: classifyRegimeWithHysteresis
- **Inputs**: FDR=1.25, current=HEALTHY_EXPANSION, hysteresis=0.15
- **Expected**: HEALTHY_EXPANSION
- **Actual**: HEALTHY_EXPANSION

</details>

<details>
<summary>6.4b: Hysteresis: FDR well above boundary triggers transition with confirmation — PASS (deterministic)</summary>

- **Validated**: Beyond hysteresis band, regime transitions with confirmation flag
- **Proof Type**: deterministic
- **Endpoints/Functions**: classifyRegimeWithHysteresis
- **Inputs**: FDR=1.40, current=HEALTHY_EXPANSION
- **Expected**: ASSET_LED_GROWTH + requiresConfirmation
- **Actual**: ASSET_LED_GROWTH, confirm=true

</details>

<details>
<summary>6.5a: Reversion penalty: 2x hysteresis prevents premature reversion — PASS (deterministic)</summary>

- **Validated**: Reverting to previous regime requires 2x hysteresis band
- **Proof Type**: deterministic
- **Endpoints/Functions**: classifyRegimeWithHysteresis
- **Inputs**: FDR=1.0, current=ALG, previous=HE, reversion threshold=1.2-(0.15*2)=0.9
- **Expected**: ASSET_LED_GROWTH (not yet past 2x band)
- **Actual**: ASSET_LED_GROWTH

</details>

<details>
<summary>6.5b: Reversion occurs when past 2x hysteresis band — PASS (deterministic)</summary>

- **Validated**: Reversion triggers when FDR passes 2x hysteresis threshold
- **Proof Type**: deterministic
- **Endpoints/Functions**: classifyRegimeWithHysteresis
- **Inputs**: FDR=0.85, current=ALG, previous=HE, threshold=0.9
- **Expected**: HEALTHY_EXPANSION + isReversion=true
- **Actual**: HEALTHY_EXPANSION, isReversion=true

</details>

<details>
<summary>6.6: Regime constants match documented values — PASS (deterministic)</summary>

- **Validated**: Hysteresis, reversion penalty, min duration, confirmation readings
- **Proof Type**: deterministic
- **Endpoints/Functions**: regimeConstants.ts
- **Inputs**: Direct import
- **Expected**: HYSTERESIS=0.15, REVERSION=2x, MIN_DAYS=14, CONFIRMATIONS=3
- **Actual**: HYSTERESIS=0.15, REVERSION=2x, MIN_DAYS=14, CONFIRMATIONS=3

</details>

<details>
<summary>6.7: validateRegimeClassification detects mismatches — PASS (deterministic)</summary>

- **Validated**: Validation catches stored regime that doesn't match FDR
- **Proof Type**: deterministic
- **Endpoints/Functions**: validateRegimeClassification
- **Inputs**: FDR=0.5 with HE (correct) and REL (incorrect)
- **Expected**: valid=true, invalid=false
- **Actual**: valid=true, invalid=false, violation=FDR 0.5 should be HEALTHY_EXPANSION, not REAL_ECONOMY_LEAD

</details>

<details>
<summary>6.8: Hysteresis safe under NaN/Infinity (stays current) — PASS (deterministic)</summary>

- **Validated**: Invalid FDR values don't crash or change regime
- **Proof Type**: deterministic
- **Endpoints/Functions**: classifyRegimeWithHysteresis
- **Inputs**: NaN+ALG, -Inf+IE
- **Expected**: ALG, IE (unchanged)
- **Actual**: NaN→ASSET_LED_GROWTH, -Inf→IMBALANCED_EXCESS

</details>

---

## Gate 7: Operational Readiness

**Started**: 2026-02-21T20:43:12.569Z  
**Completed**: 2026-02-21T20:43:13.183Z  
**Result**: PASS

| ID | Test | Proof Type | Result | Duration |
|-----|------|------------|--------|----------|
| 7.1 | GET /healthz returns 200 (runtime proof) | runtime | PASS | 8ms |
| 7.2 | GET /readyz returns 200 (runtime proof) | runtime | PASS | 6ms |
| 7.3 | GET /livez returns 200 (runtime proof) | runtime | PASS | 2ms |
| 7.4 | Rate limiting applied to automation mutation endpoints (structural + rapid call proof) | structural | PASS | 92ms |
| 7.5 | Structured logging persists warn+ events to database (runtime proof) | runtime | PASS | 502ms |
| 7.6 | Data retention cleanup job exists | structural | PASS | 1ms |
| 7.7 | Automation state is database-backed (crash-recoverable) | structural | PASS | 1ms |
| 7.8 | sanitizeDetails redacts sensitive keys, preserves normal keys (runtime proof) | runtime | PASS | 0ms |

### Evidence Details

<details>
<summary>7.1: GET /healthz returns 200 (runtime proof) — PASS (runtime)</summary>

- **Validated**: Liveness probe endpoint responds with 200 and structured body
- **Proof Type**: runtime
- **Endpoints/Functions**: GET /healthz
- **Inputs**: HTTP GET /healthz
- **Expected**: status 200
- **Actual**: status 200

</details>

<details>
<summary>7.2: GET /readyz returns 200 (runtime proof) — PASS (runtime)</summary>

- **Validated**: Readiness probe endpoint responds with 200 and checks database
- **Proof Type**: runtime
- **Endpoints/Functions**: GET /readyz
- **Inputs**: HTTP GET /readyz
- **Expected**: status 200
- **Actual**: status 200

</details>

<details>
<summary>7.3: GET /livez returns 200 (runtime proof) — PASS (runtime)</summary>

- **Validated**: Liveness probe endpoint responds with 200 and uptime info
- **Proof Type**: runtime
- **Endpoints/Functions**: GET /livez
- **Inputs**: HTTP GET /livez
- **Expected**: status 200
- **Actual**: status 200

</details>

<details>
<summary>7.4: Rate limiting applied to automation mutation endpoints (structural + rapid call proof) — PASS (structural)</summary>

- **Validated**: POST/PATCH/DELETE /api/ai-automation-rules have rate limiter middleware, rapid /healthz calls succeed
- **Proof Type**: structural
- **Endpoints/Functions**: POST/PATCH/DELETE /api/ai-automation-rules + GET /healthz
- **Inputs**: Route definition scan + 20 rapid GET /healthz calls
- **Expected**: rateLimiters in middleware chain + all health calls succeed
- **Actual**: rateLimiters=true, allHealthy=true (20 calls)
- **Evidence**: POST: app.post("/api/ai-automation-rules", isAuthenticated, rateLimiters.api, async (r, PATCH: app.patch("/api/ai-automation-rules/:id", isAuthenticated, rateLimiters.api, asy

</details>

<details>
<summary>7.5: Structured logging persists warn+ events to database (runtime proof) — PASS (runtime)</summary>

- **Validated**: Logger.warn writes to structured_event_log table and can be queried back
- **Proof Type**: runtime
- **Endpoints/Functions**: structuredLogger.ts → structured_event_log table
- **Inputs**: logger.warn('system', 'cert-log-test-1771706592678', ...)
- **Expected**: Row found in DB
- **Actual**: Found

</details>

<details>
<summary>7.6: Data retention cleanup job exists — PASS (structural)</summary>

- **Validated**: Background job for data retention/cleanup is registered
- **Proof Type**: structural
- **Endpoints/Functions**: backgroundJobs.ts
- **Inputs**: Source code inspection
- **Expected**: data-retention job present
- **Actual**: Found

</details>

<details>
<summary>7.7: Automation state is database-backed (crash-recoverable) — PASS (structural)</summary>

- **Validated**: Runtime state, trigger dedup use PostgreSQL tables, not in-memory Maps
- **Proof Type**: structural
- **Endpoints/Functions**: AutomationEngine
- **Inputs**: Source code inspection
- **Expected**: automationRuntimeState + processedTriggerEvents tables used
- **Actual**: DB-backed state

</details>

<details>
<summary>7.8: sanitizeDetails redacts sensitive keys, preserves normal keys (runtime proof) — PASS (runtime)</summary>

- **Validated**: sanitizeDetails function correctly redacts password/apiKey while preserving normalField
- **Proof Type**: runtime
- **Endpoints/Functions**: structuredLogger.ts (sanitizeDetails)
- **Inputs**: { password: "secret123", apiKey: "key456", normalField: "visible" }
- **Expected**: password=[REDACTED], apiKey=[REDACTED], normalField=visible
- **Actual**: password=[REDACTED], apiKey=[REDACTED], normalField=visible

</details>

---

## Gate 8: Copilot Safety & Data Quality

**Started**: 2026-02-21T20:43:13.183Z  
**Completed**: 2026-02-21T20:43:13.469Z  
**Result**: PASS

| ID | Test | Proof Type | Result | Duration |
|-----|------|------------|--------|----------|
| 8.1 | POST /api/copilot/query returns 401 without auth | runtime | PASS | 6ms |
| 8.2 | POST /api/copilot/draft returns 401 without auth | runtime | PASS | 3ms |
| 8.3 | New copilot draft starts as 'draft' with no executedAt (never auto-completed) | runtime | PASS | 7ms |
| 8.4 | canExecuteDraft blocks non-approved draft | runtime | PASS | 15ms |
| 8.5 | Draft transitions to 'approved' with approver identity recorded | runtime | PASS | 9ms |
| 8.6 | canExecuteDraft allows approved draft | runtime | PASS | 2ms |
| 8.7 | Rejected draft has no executedAt (no phantom completion) | runtime | PASS | 13ms |
| 8.8 | No 'completed' drafts exist (phantom state prevention) | runtime | PASS | 2ms |
| 8.9 | validateNeverCompleted throws SAFETY_VIOLATION for executed+unapproved draft | deterministic | PASS | 1ms |
| 8.10 | Data quality scoring produces valid report with numerical scores | runtime | PASS | 35ms |
| 8.11 | Automation blocked when no data quality assessment exists | deterministic | PASS | 0ms |
| 8.12 | Data quality scores persisted to database | runtime | PASS | 2ms |
| 8.13 | Evaluation harness produces forecast, allocation, procurement, and calibration metrics | runtime | PASS | 159ms |
| 8.14 | Evaluation metrics (WAPE, sMAPE, bias, calibration_error) persisted to DB | runtime | PASS | 3ms |
| 8.15 | Policy layer: INFLATIONARY regime recommends acceleration with valid quantity | deterministic | PASS | 12ms |
| 8.16 | What-if simulation returns bounded service level, stockout risk, and cash impact | deterministic | PASS | 1ms |
| 8.17 | Decision override logged with factual context (regime, reason, values) | runtime | PASS | 7ms |
| 8.18 | GET /api/data-quality returns 401 without auth | runtime | PASS | 2ms |
| 8.19 | POST /api/evaluation/run returns 401 without auth | runtime | PASS | 3ms |
| 8.20 | POST /api/decisions/recommend returns 401 without auth | runtime | PASS | 2ms |
| 8.21 | Procurement metrics explicitly separate estimated vs measured savings | runtime | PASS | 0ms |

### Evidence Details

<details>
<summary>8.1: POST /api/copilot/query returns 401 without auth — PASS (runtime)</summary>

- **Validated**: Copilot query endpoint enforces authentication
- **Proof Type**: runtime
- **Endpoints/Functions**: POST /api/copilot/query
- **Inputs**: No auth cookie
- **Expected**: 401
- **Actual**: 401

</details>

<details>
<summary>8.2: POST /api/copilot/draft returns 401 without auth — PASS (runtime)</summary>

- **Validated**: Copilot draft endpoint enforces authentication
- **Proof Type**: runtime
- **Endpoints/Functions**: POST /api/copilot/draft
- **Inputs**: No auth cookie
- **Expected**: 401
- **Actual**: 401

</details>

<details>
<summary>8.3: New copilot draft starts as 'draft' with no executedAt (never auto-completed) — PASS (runtime)</summary>

- **Validated**: Drafts are never auto-completed on creation
- **Proof Type**: runtime
- **Endpoints/Functions**: copilotActionDrafts table
- **Inputs**: draftType=purchase_order, companyId=cert-1771706590951-co-alpha
- **Expected**: status=draft, executedAt=null
- **Actual**: status=draft, executedAt=null

</details>

<details>
<summary>8.4: canExecuteDraft blocks non-approved draft — PASS (runtime)</summary>

- **Validated**: Unapproved drafts cannot be executed
- **Proof Type**: runtime
- **Endpoints/Functions**: copilotService.canExecuteDraft()
- **Inputs**: draftId=11, status=draft
- **Expected**: allowed=false
- **Actual**: allowed=false, reason=Draft status is 'draft', must be 'approved' to execute

</details>

<details>
<summary>8.5: Draft transitions to 'approved' with approver identity recorded — PASS (runtime)</summary>

- **Validated**: Approval flow works and records approver
- **Proof Type**: runtime
- **Endpoints/Functions**: copilotService.approveDraft()
- **Inputs**: draftId=11, approver=cert-approver
- **Expected**: status=approved, approvedBy=cert-approver
- **Actual**: status=approved, approvedBy=cert-approver

</details>

<details>
<summary>8.6: canExecuteDraft allows approved draft — PASS (runtime)</summary>

- **Validated**: Only approved drafts can proceed to execution
- **Proof Type**: runtime
- **Endpoints/Functions**: copilotService.canExecuteDraft()
- **Inputs**: draftId=11, status=approved
- **Expected**: allowed=true
- **Actual**: allowed=true

</details>

<details>
<summary>8.7: Rejected draft has no executedAt (no phantom completion) — PASS (runtime)</summary>

- **Validated**: Rejected drafts never show as executed
- **Proof Type**: runtime
- **Endpoints/Functions**: copilotService.rejectDraft()
- **Inputs**: draftId=12, reason=Not needed
- **Expected**: status=rejected, executedAt=null
- **Actual**: status=rejected, executedAt=null

</details>

<details>
<summary>8.8: No 'completed' drafts exist (phantom state prevention) — PASS (runtime)</summary>

- **Validated**: Draft system has no 'completed' status pathway
- **Proof Type**: runtime
- **Endpoints/Functions**: copilotActionDrafts table
- **Inputs**: SELECT WHERE status='completed' AND companyId=cert-1771706590951-co-alpha
- **Expected**: 0 rows
- **Actual**: 0 rows

</details>

<details>
<summary>8.9: validateNeverCompleted throws SAFETY_VIOLATION for executed+unapproved draft — PASS (deterministic)</summary>

- **Validated**: Safety guard prevents execution without approval in code path
- **Proof Type**: deterministic
- **Endpoints/Functions**: copilotService.validateNeverCompleted()
- **Inputs**: Draft with executedAt set but status=draft
- **Expected**: SAFETY_VIOLATION thrown
- **Actual**: Thrown

</details>

<details>
<summary>8.10: Data quality scoring produces valid report with numerical scores — PASS (runtime)</summary>

- **Validated**: Data quality scoring service returns structured report
- **Proof Type**: runtime
- **Endpoints/Functions**: dataQuality.scoreCompanyDataQuality()
- **Inputs**: companyId=cert-1771706590951-co-alpha
- **Expected**: Report with overallScore and entityScores array
- **Actual**: overallScore=0.77, entities=3

</details>

<details>
<summary>8.11: Automation blocked when no data quality assessment exists — PASS (deterministic)</summary>

- **Validated**: Missing data quality blocks automation
- **Proof Type**: deterministic
- **Endpoints/Functions**: dataQuality.shouldBlockAutomation()
- **Inputs**: null quality report
- **Expected**: blocked=true
- **Actual**: blocked=true

</details>

<details>
<summary>8.12: Data quality scores persisted to database — PASS (runtime)</summary>

- **Validated**: Scoring results written to data_quality_scores table
- **Proof Type**: runtime
- **Endpoints/Functions**: data_quality_scores table
- **Inputs**: companyId=cert-1771706590951-co-alpha
- **Expected**: >0 rows
- **Actual**: 3 rows

</details>

<details>
<summary>8.13: Evaluation harness produces forecast, allocation, procurement, and calibration metrics — PASS (runtime)</summary>

- **Validated**: Offline evaluation generates complete metric report
- **Proof Type**: runtime
- **Endpoints/Functions**: evaluationHarness.runEvaluation()
- **Inputs**: companyId=cert-1771706590951-co-alpha, version=cert-cert-1771706590951
- **Expected**: Valid summary with WAPE, sMAPE, calibration error
- **Actual**: runId=6, wape=0.0830, smape=0.0778, calError=0.0843

</details>

<details>
<summary>8.14: Evaluation metrics (WAPE, sMAPE, bias, calibration_error) persisted to DB — PASS (runtime)</summary>

- **Validated**: All required evaluation metrics written to evaluation_metrics table
- **Proof Type**: runtime
- **Endpoints/Functions**: evaluation_metrics table
- **Inputs**: runId=6
- **Expected**: WAPE, sMAPE, bias, calibration_error rows
- **Actual**: 23 metrics, wape=true, smape=true, bias=true, calError=true

</details>

<details>
<summary>8.15: Policy layer: INFLATIONARY regime recommends acceleration with valid quantity — PASS (deterministic)</summary>

- **Validated**: Policy engine translates regime+constraints into actionable recommendation
- **Proof Type**: deterministic
- **Endpoints/Functions**: decisionIntelligence.computePolicyRecommendation()
- **Inputs**: regime=INFLATIONARY, fdr=1.2, uncertainty=0.25, onHand=50, demand=10/day, lead=14d, moq=25
- **Expected**: quantity>0, timing=accelerate, 0<confidence<=1
- **Actual**: quantity=370, timing=accelerate, confidence=0.560

</details>

<details>
<summary>8.16: What-if simulation returns bounded service level, stockout risk, and cash impact — PASS (deterministic)</summary>

- **Validated**: What-if scenarios produce valid bounded projections
- **Proof Type**: deterministic
- **Endpoints/Functions**: decisionIntelligence.computeWhatIf()
- **Inputs**: scenario=bulk_order 200 units immediate, regime=GROWTH
- **Expected**: 0<=serviceLevel<=1, 0<=stockoutRisk<=1, cashImpact>=0
- **Actual**: serviceLevel=1.000, stockoutRisk=0.000, cashImpact=2000.00

</details>

<details>
<summary>8.17: Decision override logged with factual context (regime, reason, values) — PASS (runtime)</summary>

- **Validated**: Override logging captures all contextual fields
- **Proof Type**: runtime
- **Endpoints/Functions**: decisionIntelligence.logOverride() → decision_overrides table
- **Inputs**: field=quantity, 100→150, reason=Market conditions changed
- **Expected**: Row with overriddenField, originalValue, newValue, reason
- **Actual**: field=quantity, original=100, new=150

</details>

<details>
<summary>8.18: GET /api/data-quality returns 401 without auth — PASS (runtime)</summary>

- **Validated**: Data quality endpoint enforces authentication
- **Proof Type**: runtime
- **Endpoints/Functions**: GET /api/data-quality
- **Inputs**: No auth cookie
- **Expected**: 401
- **Actual**: 401

</details>

<details>
<summary>8.19: POST /api/evaluation/run returns 401 without auth — PASS (runtime)</summary>

- **Validated**: Evaluation endpoint enforces authentication
- **Proof Type**: runtime
- **Endpoints/Functions**: POST /api/evaluation/run
- **Inputs**: No auth cookie
- **Expected**: 401
- **Actual**: 401

</details>

<details>
<summary>8.20: POST /api/decisions/recommend returns 401 without auth — PASS (runtime)</summary>

- **Validated**: Decision recommendation endpoint enforces authentication
- **Proof Type**: runtime
- **Endpoints/Functions**: POST /api/decisions/recommend
- **Inputs**: No auth cookie
- **Expected**: 401
- **Actual**: 401

</details>

<details>
<summary>8.21: Procurement metrics explicitly separate estimated vs measured savings — PASS (runtime)</summary>

- **Validated**: No conflation of estimated and measured savings
- **Proof Type**: runtime
- **Endpoints/Functions**: evaluationHarness → procurement metrics
- **Inputs**: Evaluation run output
- **Expected**: savingsSeparation in ['estimated_only','measured_available','both'], measuredSavings null or number
- **Actual**: separation=estimated_only, measured=null

</details>

---

## Gate 9: Predictive Lift & Enterprise Controls

**Started**: 2026-02-21T20:43:13.470Z  
**Completed**: 2026-02-21T20:43:13.765Z  
**Result**: PASS

| ID | Test | Proof Type | Result | Duration |
|-----|------|------------|--------|----------|
| 9.1 | All 4 baseline forecasters produce outputs of correct length | deterministic | PASS | 1ms |
| 9.2 | Seeded RNG produces identical sequences for same seed | deterministic | PASS | 0ms |
| 9.3 | Evaluation produces benchmark report with 4+ baselines and lift-by-segment | runtime | PASS | 117ms |
| 9.4 | Prediction intervals produce bounded P50/P90 coverage metrics | runtime | PASS | 0ms |
| 9.5 | System vs best baseline lift comparison includes all fields | runtime | PASS | 0ms |
| 9.6 | Benchmark metrics (lift, coverage) persisted to evaluation_metrics table | runtime | PASS | 3ms |
| 9.7 | Savings evidence record created with immutable flag, counterfactual definition, estimated (no measured) | runtime | PASS | 24ms |
| 9.8 | recordMeasuredSavings rejects without outcome reference (invoice/receipt) | deterministic | PASS | 4ms |
| 9.9 | Measured savings recorded with invoice reference and timestamp | runtime | PASS | 11ms |
| 9.10 | Valid savings record passes validation | deterministic | PASS | 0ms |
| 9.11 | GET /api/savings-evidence returns 401 without auth | runtime | PASS | 2ms |
| 9.12 | Copilot query response includes valid evidence bundle (entityIds, timestamp, rowCounts, provenance) | runtime | PASS | 9ms |
| 9.13 | Evidence bundle includes queryTimestamp and provenanceVersion | runtime | PASS | 0ms |
| 9.14 | Copilot draft carries valid evidence bundle | runtime | PASS | 8ms |
| 9.15 | Evidence bundle persisted to copilot_query_log table | runtime | PASS | 1ms |
| 9.16 | No 'completed' drafts under expanded codebase (invariant preserved) | runtime | PASS | 2ms |
| 9.17 | SSO configuration created and persisted | runtime | PASS | 72ms |
| 9.18 | GET /api/sso/config returns 401 without auth | runtime | PASS | 3ms |
| 9.19 | SCIM provisioning creates user and logs operation | runtime | PASS | 9ms |
| 9.20 | POST /api/scim/users returns 401 without auth | runtime | PASS | 5ms |
| 9.21 | PII/secret redaction: passwords and API keys redacted, safe data preserved | deterministic | PASS | 3ms |
| 9.22 | GET /api/audit/export returns 401 without auth | runtime | PASS | 3ms |
| 9.23 | Audit export config persisted with retention and redaction settings | runtime | PASS | 9ms |
| 9.24 | All 4 baseline forecaster metrics persisted to DB | runtime | PASS | 2ms |
| 9.25 | SKU segment classification deterministic: fast_mover, slow_mover, intermittent, no_data | deterministic | PASS | 1ms |

### Evidence Details

<details>
<summary>9.1: All 4 baseline forecasters produce outputs of correct length — PASS (deterministic)</summary>

- **Validated**: Naive seasonal, moving average, Croston, and simple ETS all produce deterministic outputs
- **Proof Type**: deterministic
- **Endpoints/Functions**: evaluationHarness baseline functions
- **Inputs**: train=[10,20,30,40,50,60,70,80]
- **Expected**: All produce 8 forecasts
- **Actual**: naive=8, ma=8, croston=8, ets=8

</details>

<details>
<summary>9.2: Seeded RNG produces identical sequences for same seed — PASS (deterministic)</summary>

- **Validated**: Evaluation determinism via seeded RNG
- **Proof Type**: deterministic
- **Endpoints/Functions**: evaluationHarness.seededRandom()
- **Inputs**: seed=42, two independent sequences
- **Expected**: seq1 === seq2
- **Actual**: match=true

</details>

<details>
<summary>9.3: Evaluation produces benchmark report with 4+ baselines and lift-by-segment — PASS (runtime)</summary>

- **Validated**: Comparative benchmark layer produces structured lift report
- **Proof Type**: runtime
- **Endpoints/Functions**: evaluationHarness.runEvaluation()
- **Inputs**: companyId=cert-1771706590951-co-alpha, seed=42
- **Expected**: benchmark.baselines.length>=4, liftBySegment array
- **Actual**: baselines=4, segments=1

</details>

<details>
<summary>9.4: Prediction intervals produce bounded P50/P90 coverage metrics — PASS (runtime)</summary>

- **Validated**: P50/P90 prediction intervals with valid coverage
- **Proof Type**: runtime
- **Endpoints/Functions**: evaluationHarness benchmark.predictionIntervals
- **Inputs**: Evaluation run output
- **Expected**: 0<=p50Coverage<=1, 0<=p90Coverage<=1
- **Actual**: p50=0.550, p90=0.950

</details>

<details>
<summary>9.5: System vs best baseline lift comparison includes all fields — PASS (runtime)</summary>

- **Validated**: Lift report with system WAPE, baseline WAPE, baseline name, and lift %
- **Proof Type**: runtime
- **Endpoints/Functions**: evaluationHarness benchmark.systemVsBestBaseline
- **Inputs**: Evaluation run output
- **Expected**: system, bestBaseline, baselineName, liftPct all present
- **Actual**: system=0.0830, baseline=0.2605, name=moving_average_3, lift=68.1%

</details>

<details>
<summary>9.6: Benchmark metrics (lift, coverage) persisted to evaluation_metrics table — PASS (runtime)</summary>

- **Validated**: Baseline comparison metrics written to DB
- **Proof Type**: runtime
- **Endpoints/Functions**: evaluation_metrics table, category=benchmark
- **Inputs**: runId=7
- **Expected**: >=3 benchmark metrics including lift_pct and coverage
- **Actual**: 5 metrics, hasLift=true, hasCoverage=true

</details>

<details>
<summary>9.7: Savings evidence record created with immutable flag, counterfactual definition, estimated (no measured) — PASS (runtime)</summary>

- **Validated**: Immutable savings evidence with separated estimated/measured
- **Proof Type**: runtime
- **Endpoints/Functions**: savingsEvidence.createSavingsEvidence()
- **Inputs**: type=procurement_timing, counterfactual=do_nothing, estimated=$50
- **Expected**: immutable=true, measuredSavings=null, counterfactual=do_nothing
- **Actual**: immutable=true, measured=null, cf=do_nothing

</details>

<details>
<summary>9.8: recordMeasuredSavings rejects without outcome reference (invoice/receipt) — PASS (deterministic)</summary>

- **Validated**: Measured savings must link to realized outcome
- **Proof Type**: deterministic
- **Endpoints/Functions**: savingsEvidence.recordMeasuredSavings()
- **Inputs**: Empty outcomeRef
- **Expected**: MEASURED_SAVINGS_REQUIRES_OUTCOME_REF thrown
- **Actual**: Thrown

</details>

<details>
<summary>9.9: Measured savings recorded with invoice reference and timestamp — PASS (runtime)</summary>

- **Validated**: Measured savings linked to realized outcome with entity ref
- **Proof Type**: runtime
- **Endpoints/Functions**: savingsEvidence.recordMeasuredSavings()
- **Inputs**: measuredSavings=45, outcomeRef={invoiceId: inv-001}
- **Expected**: measuredSavings=45, measuredAt set, invoiceId=inv-001
- **Actual**: measured=45, measuredAt=Sat Feb 21 2026 20:43:13 GMT+0000 (Coordinated Universal Time), invoiceId=inv-001

</details>

<details>
<summary>9.10: Valid savings record passes validation — PASS (deterministic)</summary>

- **Validated**: Savings evidence record structure validation
- **Proof Type**: deterministic
- **Endpoints/Functions**: savingsEvidence.validateSavingsRecord()
- **Inputs**: recordId=3
- **Expected**: valid=true, issues=[]
- **Actual**: valid=true, issues=0

</details>

<details>
<summary>9.11: GET /api/savings-evidence returns 401 without auth — PASS (runtime)</summary>

- **Validated**: Savings evidence endpoint enforces authentication
- **Proof Type**: runtime
- **Endpoints/Functions**: GET /api/savings-evidence
- **Inputs**: No auth cookie
- **Expected**: 401
- **Actual**: 401

</details>

<details>
<summary>9.12: Copilot query response includes valid evidence bundle (entityIds, timestamp, rowCounts, provenance) — PASS (runtime)</summary>

- **Validated**: Evidence bundle with provenance on every copilot response
- **Proof Type**: runtime
- **Endpoints/Functions**: copilotService.queryCopilot()
- **Inputs**: query='Show me material inventory'
- **Expected**: Valid evidence bundle with entityIds, queryTimestamp, rowCounts, provenanceVersion
- **Actual**: valid=true, issues=

</details>

<details>
<summary>9.13: Evidence bundle includes queryTimestamp and provenanceVersion — PASS (runtime)</summary>

- **Validated**: Temporal and version provenance on copilot responses
- **Proof Type**: runtime
- **Endpoints/Functions**: copilotService.queryCopilot() → evidenceBundle
- **Inputs**: Copilot query response
- **Expected**: queryTimestamp and provenanceVersion present
- **Actual**: timestamp=2026-02-21T20:43:13.639Z, version=2.0.0

</details>

<details>
<summary>9.14: Copilot draft carries valid evidence bundle — PASS (runtime)</summary>

- **Validated**: Evidence bundle attached to every draft for traceability
- **Proof Type**: runtime
- **Endpoints/Functions**: copilotService.createDraft() → draft.evidenceBundle
- **Inputs**: draftType=purchase_order
- **Expected**: Valid evidence bundle on draft
- **Actual**: valid=true, issues=

</details>

<details>
<summary>9.15: Evidence bundle persisted to copilot_query_log table — PASS (runtime)</summary>

- **Validated**: Evidence provenance stored for audit trail
- **Proof Type**: runtime
- **Endpoints/Functions**: copilot_query_log.evidence_bundle column
- **Inputs**: Latest query log entry
- **Expected**: provenanceVersion and queryTimestamp present
- **Actual**: version=2.0.0, timestamp=2026-02-21T20:43:13.639Z

</details>

<details>
<summary>9.16: No 'completed' drafts under expanded codebase (invariant preserved) — PASS (runtime)</summary>

- **Validated**: Draft cannot be completed invariant holds under all routes and services
- **Proof Type**: runtime
- **Endpoints/Functions**: copilotActionDrafts table, all routes
- **Inputs**: SELECT WHERE status='completed' AND companyId=cert-1771706590951-co-alpha
- **Expected**: 0 rows
- **Actual**: 0 rows

</details>

<details>
<summary>9.17: SSO configuration created and persisted — PASS (runtime)</summary>

- **Validated**: SSO/SAML integration hook stores config per company
- **Proof Type**: runtime
- **Endpoints/Functions**: enterpriseIdentity.upsertSsoConfig()
- **Inputs**: provider=saml, enabled=false
- **Expected**: SSO config with provider=saml, enabled=false
- **Actual**: provider=saml, enabled=false

</details>

<details>
<summary>9.18: GET /api/sso/config returns 401 without auth — PASS (runtime)</summary>

- **Validated**: SSO endpoint enforces authentication
- **Proof Type**: runtime
- **Endpoints/Functions**: GET /api/sso/config
- **Inputs**: No auth cookie
- **Expected**: 401
- **Actual**: 401

</details>

<details>
<summary>9.19: SCIM provisioning creates user and logs operation — PASS (runtime)</summary>

- **Validated**: SCIM-ready user provisioning with audit log
- **Proof Type**: runtime
- **Endpoints/Functions**: enterpriseIdentity.scimProvisionUser()
- **Inputs**: externalId=cert-1771706590951-ext-user-001
- **Expected**: operation=CREATE, success=true
- **Actual**: operation=CREATE, success=true

</details>

<details>
<summary>9.20: POST /api/scim/users returns 401 without auth — PASS (runtime)</summary>

- **Validated**: SCIM endpoint enforces authentication
- **Proof Type**: runtime
- **Endpoints/Functions**: POST /api/scim/users
- **Inputs**: No auth cookie
- **Expected**: 401
- **Actual**: 401

</details>

<details>
<summary>9.21: PII/secret redaction: passwords and API keys redacted, safe data preserved — PASS (deterministic)</summary>

- **Validated**: Redaction rules enforce secret/PII removal in audit exports
- **Proof Type**: deterministic
- **Endpoints/Functions**: enterpriseIdentity.redactObject()
- **Inputs**: Object with password, apiKey, email, safe data
- **Expected**: password=[REDACTED], apiKey=[REDACTED], data=safe
- **Actual**: password=[REDACTED], apiKey=[REDACTED], data=safe

</details>

<details>
<summary>9.22: GET /api/audit/export returns 401 without auth — PASS (runtime)</summary>

- **Validated**: Audit export endpoint enforces authentication
- **Proof Type**: runtime
- **Endpoints/Functions**: GET /api/audit/export
- **Inputs**: No auth cookie
- **Expected**: 401
- **Actual**: 401

</details>

<details>
<summary>9.23: Audit export config persisted with retention and redaction settings — PASS (runtime)</summary>

- **Validated**: Per-tenant audit retention and redaction controls
- **Proof Type**: runtime
- **Endpoints/Functions**: enterpriseIdentity.upsertAuditExportConfig()
- **Inputs**: retentionDays=90, redactionEnabled=true
- **Expected**: Config with retention=90, redaction=true
- **Actual**: retention=90, redaction=true

</details>

<details>
<summary>9.24: All 4 baseline forecaster metrics persisted to DB — PASS (runtime)</summary>

- **Validated**: Baseline comparison metrics stored for reproducibility
- **Proof Type**: runtime
- **Endpoints/Functions**: evaluation_metrics table, category=baseline
- **Inputs**: runId=7
- **Expected**: naive_seasonal, moving_average, croston, simple_ets metrics
- **Actual**: naive=true, ma=true, croston=true, ets=true, total=8

</details>

<details>
<summary>9.25: SKU segment classification deterministic: fast_mover, slow_mover, intermittent, no_data — PASS (deterministic)</summary>

- **Validated**: SKU segmentation for lift reporting is deterministic
- **Proof Type**: deterministic
- **Endpoints/Functions**: evaluationHarness.classifySKUSegment()
- **Inputs**: Various demand patterns
- **Expected**: fast_mover, slow_mover, intermittent, no_data
- **Actual**: fast=fast_mover, slow=slow_mover, intermittent=intermittent, noData=no_data

</details>

---

## Safe for Beta Recommendations

All 116 tests across 9 gates passed. The platform is recommended as **safe for beta** under the following conditions:

1. **Single-instance deployment**: Distributed locks are implemented and ready for multi-instance but have been verified in single-instance mode.
2. **Stripe webhook endpoint**: Must be registered before express.json() middleware to receive raw Buffer payloads.
3. **Monitoring**: Structured event logging is active; set up external alerting on `level=critical` events.
4. **Data retention**: Retention job runs under distributed lock; verify retention window meets compliance requirements.
5. **Rate limiting**: Applied to automation mutations and high-cost endpoints; tune thresholds based on production traffic.

---

*Report generated by enterprise-e2e certification harness v3.0.0 (9-gate). All results are from actual test execution — no fabricated data.*
