# Prescient Labs - Enterprise Adversarial Audit Report

**Date:** 2026-02-17  
**Scope:** Financial integrity, multi-tenant isolation, automation concurrency, integration durability, observability, safe mode enforcement, horizontal scaling  
**Severity Scale:** CRITICAL / HIGH / MEDIUM / LOW

---

## Executive Summary

This audit identified **12 enterprise-grade vulnerabilities** across 7 dimensions. Three are CRITICAL (financial loss, data leakage, or scaling failure), four are HIGH severity (race conditions, unsafe state transitions), and five are MEDIUM (operational gaps that degrade reliability under load).

The Stripe webhook handler (`webhookHandlers.ts`) is exceptionally well-hardened with atomic insert-first locking, monotonic state transition guards, and CAS-based stale lock recovery. The automation engine (`automationEngine.ts`) demonstrates strong database-backed durability with INSERT-first trigger deduplication. However, several concurrency and isolation gaps remain that would manifest under production traffic or multi-instance deployment.

---

## CRITICAL Vulnerabilities

### CVE-PL-001: Atomic Spend Check Has Non-Transactional Rollback Window

**File:** `server/lib/automationEngine.ts` lines 941-975  
**Dimension:** Financial Integrity  
**Severity:** CRITICAL

**Description:**  
The `atomicSpendCheck` method implements a reserve-then-check pattern: it atomically increments `daily_spend_total` via `INSERT...ON CONFLICT DO UPDATE`, then checks if the new total exceeds the limit. If it exceeds, a *separate* `UPDATE` statement rolls back the increment. These two operations are NOT within a database transaction.

**Attack Vector:**  
If the process crashes, the network drops, or the Node.js event loop blocks between the increment (line 948-957) and the rollback (line 964-970), the spend reservation is permanently consumed without any action being executed. Over time, this phantom spend accumulates and gradually exhausts daily limits.

**Concurrent bypass:** Two requests arriving simultaneously both execute the increment. Both read `newSpend` as exceeding the limit. Both execute the rollback. But the original `currentSpend` was below the limit, meaning neither request is allowed even though one should have been. This is a *denial* race. Conversely, if `currentSpend` is just below the limit, two concurrent requests each reading `newSpend <= limit` could both succeed, bypassing the spend cap.

```typescript
// Lines 948-974 - Two separate, non-atomic SQL statements
const result = await db.execute(sql`
  INSERT INTO automation_runtime_state ...
  ON CONFLICT ... DO UPDATE SET
    daily_spend_total = automation_runtime_state.daily_spend_total + ${proposedAmount}
  RETURNING daily_spend_total
`);
// <-- CRASH WINDOW: spend is reserved but not used
if (newSpend > spendLimit) {
  await db.execute(sql`
    UPDATE automation_runtime_state
    SET daily_spend_total = daily_spend_total - ${proposedAmount} ...
  `); // <-- Second non-atomic statement
}
```

**Financial Impact:** Unbounded procurement spend if concurrent requests bypass the limit; phantom spend exhaustion if rollback fails.

**Remediation:**  
Wrap in a PostgreSQL advisory lock or use a single atomic SQL statement:
```sql
UPDATE automation_runtime_state
SET daily_spend_total = CASE
  WHEN daily_spend_total + $amount <= $limit THEN daily_spend_total + $amount
  ELSE daily_spend_total
END
WHERE company_id = $companyId AND state_date = $today
RETURNING daily_spend_total,
  (daily_spend_total = daily_spend_total + $amount) as was_allowed;
```

---

### CVE-PL-002: WebSocket Broadcasts Without companyId Leak Data Cross-Tenant

**File:** `server/backgroundJobs.ts` line 300-312; `server/websocket.ts` line 164  
**Dimension:** Multi-Tenant Isolation  
**Severity:** CRITICAL

**Description:**  
The `broadcastUpdate` function in `websocket.ts` only filters by `companyId` when `message.companyId` is present (line 164: `if (message.companyId && message.companyId !== client.companyId)`). Several broadcast calls in `backgroundJobs.ts` omit `companyId`:

1. **Line 300-312:** `external_economic_data` broadcast includes `companiesUpdated: companies.length`, `fdr`, and `regime` — operational intelligence about how many tenants are active and their economic regime.
2. **Line 1066-1072:** `benchmark_aggregate` broadcast includes raw aggregation `results` across all companies.

When `message.companyId` is undefined, the filter condition `message.companyId && ...` short-circuits to `false`, so the message is sent to ALL authenticated clients regardless of company.

**Attack Vector:**  
Any authenticated user with a WebSocket connection receives:
- The number of active companies on the platform (competitive intelligence)
- Aggregate benchmark data across all companies (anonymization bypass)
- System-level automation queue status

**Data Exposed:** Platform operational metrics, cross-company aggregate data, system internals.

**Remediation:**  
Invert the filter logic: messages without `companyId` should only be sent if explicitly marked as `global: true`:
```typescript
if (!message.companyId && !message.global) {
  return; // Never broadcast tenant-scoped data without explicit companyId
}
```

---

### CVE-PL-003: In-Memory previousRegimes Map Breaks Regime Detection Under Horizontal Scaling

**File:** `server/backgroundJobs.ts` line 32  
**Dimension:** Horizontal Scaling  
**Severity:** CRITICAL

**Description:**  
```typescript
const previousRegimes: Map<string, string> = new Map();
```
This in-memory `Map` stores the last-known economic regime per company. It is used to detect regime transitions (line 248-275). In a multi-instance deployment:
- Instance A detects regime change BALANCED -> IMBALANCED_EXCESS, fires webhooks and alerts
- Instance B has never seen this company, so its `previousRegimes` map is empty
- Instance B detects the same data, treats it as a new regime (previous = undefined), and fires duplicate webhooks and alerts

**Impact:**
- Duplicate regime change notifications to customers
- Duplicate webhook fires to external systems (Slack, Teams, etc.)
- False transition alerts that erode trust in the platform

Additionally, the `jobs: Map<string, NodeJS.Timeout>` (line 30) and `globalCache` are also in-memory, meaning cache invalidation on one instance doesn't propagate to others.

**Remediation:**  
Store `previousRegimes` in the database (e.g., in `automation_runtime_state` or a dedicated table). The existing `acquireJobLock` pattern demonstrates the correct approach — use INSERT-first with unique constraints.

---

## HIGH Severity Vulnerabilities

### CVE-PL-004: Safe Mode Check in Queue Worker Is Not Atomic

**File:** `server/lib/automationEngine.ts` lines ~580-640 (processQueueItem)  
**Dimension:** Safe Mode Enforcement  
**Severity:** HIGH

**Description:**  
The queue worker checks safe mode status, then separately executes the action. Between the check and the execution, safe mode could be toggled off by an admin, or another concurrent worker could process the same action.

The safe mode check reads from `automationSafeMode` table, but the subsequent action execution does not re-verify within the same transaction. This creates a TOCTOU (Time-Of-Check-Time-Of-Use) window.

**Attack Vector:**  
A malicious or impatient admin disables safe mode during the window between check and execution. High-stakes actions (`create_po`, `pause_orders`) that should require approval execute without it.

**Remediation:**  
Use `SELECT ... FOR UPDATE` on the safe mode row within the same transaction as the action execution, or use a serializable isolation level for the combined check-and-execute operation.

---

### CVE-PL-005: Guardrail Violation Counter Has Read-Modify-Write Race

**File:** `server/lib/automationEngine.ts` lines 1226-1231 (and repeated at 1249-1256, 1265-1272, 1289-1296, 1304-1312)  
**Dimension:** Automation Concurrency  
**Severity:** HIGH

**Description:**  
Every guardrail violation check follows this pattern:
```typescript
violationCount: (guard.violationCount || 0) + 1,
```
This reads `violationCount` from the previously-fetched `guard` object, adds 1, and writes it back. Two concurrent violation checks for the same guardrail will both read the same count (e.g., 5), both write 6, and one increment is lost.

**Impact:** Violation counts undercount under concurrent load. If violation thresholds trigger escalations or lockouts (e.g., "block after 10 violations"), this undercounting delays safety responses.

**Remediation:**  
Use an atomic SQL increment:
```sql
UPDATE ai_guardrails
SET violation_count = violation_count + 1, ...
WHERE id = $guardId
```

---

### CVE-PL-006: Stale Lock Takeover in Webhook Processing Has No CAS Guard on Status

**File:** `server/webhookHandlers.ts` lines 168-176  
**Dimension:** Integration Durability  
**Severity:** HIGH

**Description:**  
The stale lock takeover uses:
```sql
UPDATE stripe_processed_events
SET status = 'processing', created_at = NOW() ...
WHERE event_id = $eventId AND status = 'processing'
```
Two workers could simultaneously detect a stale lock (both check `ageMs >= thresholdMs`), and both attempt the CAS takeover. PostgreSQL serializes these UPDATEs, so only one succeeds (the other gets 0 rows returned), which is correct.

However, the `created_at = NOW()` reset means the winning worker's lock appears "fresh" — if it then crashes, the next stale detection won't fire for another 5 minutes. During this window, the event is stuck in `processing` state.

**Impact:** Webhook events can be stuck for up to 10 minutes total (original 5-minute stale threshold + 5-minute reset) before recovery, during which subscription state changes are delayed.

**Remediation:**  
Add a `retry_count` column. After N retries, move the event to a dead-letter state rather than repeatedly resetting the timer.

---

### CVE-PL-007: releaseJobLock Deletes Without Verifying Lock Ownership

**File:** `server/lib/automationEngine.ts` lines 1568-1579  
**Dimension:** Automation Concurrency  
**Severity:** HIGH

**Description:**  
```typescript
async releaseJobLock(jobName: string, companyId: string): Promise<boolean> {
  const deleted = await db
    .delete(backgroundJobLocks)
    .where(and(
      eq(backgroundJobLocks.jobName, jobName),
      eq(backgroundJobLocks.companyId, companyId)
    ))
    .returning();
  return deleted.length > 0;
}
```
The lock release does not check `lockedBy` — any worker can release any other worker's lock. If Worker A holds a lock and Worker B (after a stale recovery) also tries to release it, Worker B could delete Worker A's legitimately-held lock.

**Remediation:**  
Add `eq(backgroundJobLocks.lockedBy, workerLabel)` to the WHERE clause.

---

## MEDIUM Severity Vulnerabilities

### CVE-PL-008: No Circuit Breaker on External API Calls in Background Jobs

**File:** `server/backgroundJobs.ts`  
**Dimension:** Integration Durability  
**Severity:** MEDIUM

**Description:**  
Background jobs make HTTP calls to FRED, Alpha Vantage, Trading Economics, Metals.Dev, and other external APIs without circuit breaker logic. If an API is down, every polling cycle (as frequent as every 30 seconds for some jobs) will attempt the call, accumulate timeouts, and potentially exhaust connection pools.

The current error handling is try/catch with console.error, which provides no backoff, no failure counting, and no circuit-open state.

**Impact:** Connection pool exhaustion under external API outages; increased latency for all database operations sharing the same pool.

**Remediation:**  
Implement a simple circuit breaker: after N consecutive failures, skip the API call for an exponentially increasing cooldown period.

---

### CVE-PL-009: Missing Rate Limiting on Automation Action Endpoints

**File:** `server/routes.ts`  
**Dimension:** Safe Mode Enforcement / Financial Integrity  
**Severity:** MEDIUM

**Description:**  
While RFQ and forecast endpoints use `rateLimiters.api`, the automation action endpoints (approve action, execute action, create rule, update guardrails) do not appear to have dedicated rate limiting. A compromised session could rapidly approve and execute queued actions.

**Impact:** Rapid-fire automation execution could bypass spend limits through volume (many small actions) before the daily reset.

**Remediation:**  
Apply a stricter rate limiter (e.g., 10 requests/minute) to automation mutation endpoints.

---

### CVE-PL-010: Benchmark Aggregate Broadcast Leaks Cross-Company Analytics

**File:** `server/backgroundJobs.ts` lines 1066-1072  
**Dimension:** Multi-Tenant Isolation  
**Severity:** MEDIUM

**Description:**  
The benchmark aggregation job broadcasts raw `results` (processed submissions count, aggregate count) to all connected WebSocket clients without `companyId`:
```typescript
broadcastUpdate({
  type: 'database_update',
  entity: 'benchmark_aggregate',
  action: 'create',
  timestamp: new Date().toISOString(),
  data: results, // Contains cross-company aggregate data
});
```

While the data is aggregated, it reveals platform-level statistics that individual tenants should not see (e.g., how many companies submitted benchmarks, industry-level aggregates before they're published).

**Remediation:**  
Either add `companyId` to scope the broadcast, or mark it as `global: true` and strip sensitive aggregate counts.

---

### CVE-PL-011: Structured Event Log Lacks Enforced Retention at Database Level

**File:** `server/lib/automationEngine.ts` lines 1602-1646  
**Dimension:** Observability  
**Severity:** MEDIUM

**Description:**  
The `runDataRetention` method exists but is only invoked on-demand — there is no scheduled background job that calls it. The `structuredEventLog` table will grow unboundedly in production, degrading query performance over time.

Additionally, the retention method uses `.returning()` on delete operations, which loads all deleted rows into memory. For large retention runs (millions of rows), this could cause OOM crashes.

**Remediation:**  
1. Add a scheduled background job (e.g., daily) that calls `runDataRetention` for each company.
2. Replace `.returning()` with a count-only approach for bulk deletes:
```sql
WITH deleted AS (
  DELETE FROM structured_event_log
  WHERE company_id = $1 AND timestamp < $2
  RETURNING 1
) SELECT count(*) FROM deleted;
```

---

### CVE-PL-012: globalCache Is Process-Local, Serves Stale Data Under Multi-Instance

**File:** `server/lib/caching.ts` (referenced in `backgroundJobs.ts` line 8 and `routes.ts` line 16)  
**Dimension:** Horizontal Scaling  
**Severity:** MEDIUM

**Description:**  
The `globalCache` is an in-memory cache with TTL-based expiration. In a multi-instance deployment:
- Instance A invalidates cache for `masterData:skus:company1` after a write
- Instance B still serves the stale cached version until its own TTL expires

This affects economic regime data, commodity prices, master data (SKUs, materials, suppliers), and allocation results.

**Impact:** Users on different instances see inconsistent data; writes on one instance take up to the full TTL to propagate to reads on another.

**Remediation:**  
For multi-instance deployment, either:
1. Use Redis as a shared cache layer
2. Implement cache invalidation via PostgreSQL LISTEN/NOTIFY
3. Reduce TTLs to acceptable staleness windows and document the consistency model

---

## Positive Findings (Well-Hardened Areas)

### Stripe Webhook Processing
The `webhookHandlers.ts` implementation is enterprise-grade:
- Atomic INSERT-first locking via `stripeProcessedEvents` table
- Monotonic state transition guards (`ALLOWED_TRANSITIONS` map)
- CAS-based stale lock recovery with race-safe `WHERE status = 'processing'`
- Full transaction wrapping for event processing
- Parameterized SQL throughout (no `sql.raw`)
- Comprehensive audit logging for every transition

### Automation Trigger Deduplication
The `claimTriggerLock` method (line 982-1046) uses INSERT-first with unique constraints, providing correct distributed deduplication.

### WebSocket Authentication
Server-side session validation with cookie signature verification (`unsign`) prevents unauthenticated access. The `companyId` is derived from the server session, not from client input.

### Tenant Isolation in Routes
Routes consistently derive `companyId` from the authenticated session (`user.companyId`) rather than accepting it from request parameters. The three places where `req.body.companyId` appears (lines 6244, 6461, 6579) explicitly check that it matches `user.companyId`, preventing cross-tenant writes.

### Guardrail Escalation Events
When guardrails fire with `enforcement=block`, a separate `guardrail_escalation` event is written (lines 1349-1366), providing an independent audit trail for monitoring.

---

## Risk Matrix

| ID | Dimension | Severity | Exploitability | Impact | Fix Complexity |
|---|---|---|---|---|---|
| CVE-PL-001 | Financial Integrity | CRITICAL | High (concurrent requests) | Spend limit bypass | Low (single SQL) |
| CVE-PL-002 | Tenant Isolation | CRITICAL | Low (requires WebSocket) | Cross-tenant data leak | Low (filter logic) |
| CVE-PL-003 | Horizontal Scaling | CRITICAL | Automatic (multi-instance) | Duplicate alerts/actions | Medium (DB migration) |
| CVE-PL-004 | Safe Mode | HIGH | Medium (timing) | Unauthorized execution | Medium (transaction) |
| CVE-PL-005 | Concurrency | HIGH | High (concurrent triggers) | Undercount violations | Low (atomic SQL) |
| CVE-PL-006 | Integration | HIGH | Low (crash during recovery) | Stuck webhooks | Low (retry counter) |
| CVE-PL-007 | Concurrency | HIGH | Medium (multi-worker) | Lock theft | Low (WHERE clause) |
| CVE-PL-008 | Integration | MEDIUM | Automatic (API outage) | Connection exhaustion | Medium (circuit breaker) |
| CVE-PL-009 | Financial | MEDIUM | Medium (compromised session) | Rapid-fire execution | Low (middleware) |
| CVE-PL-010 | Tenant Isolation | MEDIUM | Low (requires WebSocket) | Analytics leakage | Low (filter logic) |
| CVE-PL-011 | Observability | MEDIUM | Automatic (time) | Performance degradation | Low (scheduled job) |
| CVE-PL-012 | Horizontal Scaling | MEDIUM | Automatic (multi-instance) | Stale data reads | Medium (Redis/NOTIFY) |

---

## Recommended Remediation Priority

**Immediate (Week 1):**
1. CVE-PL-001 — Atomic spend check (single SQL statement)
2. CVE-PL-002 — WebSocket broadcast filtering (invert default)
3. CVE-PL-005 — Guardrail violation counter (atomic increment)
4. CVE-PL-007 — Job lock release ownership check

**Short-term (Week 2-3):**
5. CVE-PL-004 — Safe mode transactional enforcement
6. CVE-PL-006 — Webhook retry counter and dead-letter
7. CVE-PL-009 — Rate limiting on automation endpoints
8. CVE-PL-011 — Scheduled retention job

**Pre-scaling (Before multi-instance deployment):**
9. CVE-PL-003 — Database-backed regime tracking
10. CVE-PL-008 — Circuit breaker on external APIs
11. CVE-PL-010 — Benchmark broadcast scoping
12. CVE-PL-012 — Shared cache layer (Redis)
