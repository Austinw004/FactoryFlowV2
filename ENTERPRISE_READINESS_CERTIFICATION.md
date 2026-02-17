# Prescient Labs — Enterprise Readiness Certification

**Date:** 2026-02-17  
**Auditor:** Automated Adversarial Certification Engine  
**Application:** Prescient Labs Manufacturing Intelligence Platform  
**Methodology:** Six-gate decision tree with evidence-backed pass/fail determination

---

## Gate-by-Gate Certification

### GATE 1 — MONEY CORRECTNESS (Financial Integrity)

**Verdict: CONDITIONAL PASS (Stripe PASS, Automation Spend FAIL)**

#### Stripe Subscription Lifecycle — PASS

| Path | Idempotent? | Evidence |
|---|---|---|
| `checkout.session.completed` | YES | `webhookHandlers.ts:126` — INSERT-first lock on `stripeProcessedEvents` with `eventId` as PRIMARY KEY (`schema.ts:7222`). Duplicate `23505` errors are caught and skipped (`webhookHandlers.ts:134-136`). |
| `customer.subscription.created` | YES | Same INSERT-first lock. State transitions use CAS via `WHERE subscription_status = ${currentStatus}` (`webhookHandlers.ts:296`). Lost races return `transitioned: false` without side effects (`webhookHandlers.ts:387-390`). |
| `customer.subscription.updated` | YES | Monotonic `ALLOWED_TRANSITIONS` map (`webhookHandlers.ts:10-21`) prevents illegal regressions (e.g., `active→incomplete`). `isTransitionAllowed` blocks undefined transitions (`webhookHandlers.ts:24-34`). |
| `customer.subscription.deleted` | YES | Guarded transition to `canceled` from any active state (`webhookHandlers.ts:19`). |
| `invoice.paid` | YES | CAS update + transition guard. No-op logged when already active (`webhookHandlers.ts:494-505`). |
| `invoice.payment_failed` | YES | Guarded transition to `past_due` only from `active` or `trialing` (`webhookHandlers.ts:21`). |
| `charge.refunded` | YES | Read-only logging, no state mutation (`webhookHandlers.ts:527-569`). Full refund alert logged without status change. |

**Concurrency safety:** All webhook processing wraps event handling + status update in `db.transaction()` (`webhookHandlers.ts:79-87`). Stale lock recovery uses CAS (`WHERE status = 'processing'`) with 5-minute threshold (`webhookHandlers.ts:168-176`). Parameterized SQL throughout — no `sql.raw` detected.

**Replay safety:** `stripeProcessedEvents.eventId` is a VARCHAR PRIMARY KEY (`schema.ts:7222`). Replay of a `processed` event returns immediately (`webhookHandlers.ts:150-155`). Replay of a `failed` event triggers controlled retry (`webhookHandlers.ts:189-206`).

**Process restart safety:** If the process crashes during `status = 'processing'`, the stale lock threshold (5 minutes) allows another worker to take over via CAS update (`webhookHandlers.ts:168-176`).

#### Automation Spend Control — FAIL

| Issue | Evidence | Impact |
|---|---|---|
| Non-transactional rollback | `automationEngine.ts:948-974` — `atomicSpendCheck` issues two separate SQL statements (increment, then conditional rollback). No `db.transaction()` wrapper. See code excerpt below. | Process crash between increment and rollback permanently consumes spend budget. |
| Concurrent bypass window | Two simultaneous requests both increment, both check, both pass if each individual increment stays under limit but combined exceeds it. | Daily spend limit exceeded by up to 2x the per-action maximum. |
| Phantom spend on crash | `automationEngine.ts:880-891` — Failed action rollback uses `GREATEST(0, daily_spend_total - ${cost})` which is correct, BUT only fires if `action._spendReserved` is set AND the catch block executes. Process crash before catch = permanent phantom reservation. | Gradual daily limit exhaustion without any actions executing. |

**Code excerpt — `atomicSpendCheck` (automationEngine.ts:941-974):**
```typescript
async atomicSpendCheck(companyId, proposedAmount, spendLimit) {
  const today = new Date().toISOString().slice(0, 10);
  // STATEMENT 1: Atomically increment spend
  const result = await db.execute(sql`
    INSERT INTO automation_runtime_state (company_id, state_date, daily_spend_total, daily_action_count)
    VALUES (${companyId}, ${today}, ${proposedAmount}, 1)
    ON CONFLICT (company_id, state_date)
    DO UPDATE SET
      daily_spend_total = automation_runtime_state.daily_spend_total + ${proposedAmount},
      daily_action_count = automation_runtime_state.daily_action_count + 1,
      last_updated_at = NOW()
    RETURNING daily_spend_total, daily_action_count
  `);
  const newSpend = Number(rows[0]?.daily_spend_total || proposedAmount);
  // <<<< CRASH WINDOW: spend is reserved but may never be used >>>>
  if (newSpend > spendLimit) {
    // STATEMENT 2: Non-transactional rollback — separate SQL, no db.transaction()
    await db.execute(sql`
      UPDATE automation_runtime_state
      SET daily_spend_total = daily_spend_total - ${proposedAmount},
          daily_action_count = daily_action_count - 1, last_updated_at = NOW()
      WHERE company_id = ${companyId} AND state_date = ${today}
    `);
    return { allowed: false, currentSpend, newSpend: currentSpend };
  }
  return { allowed: true, currentSpend, newSpend };
}
```

#### AI Assistant Execute Route — FAIL

| Issue | Evidence | Impact |
|---|---|---|
| Bypasses guardrails entirely | `routes.ts:14961-15008` — `POST /api/agentic/assistant/execute` creates an action and returns a hardcoded success result WITHOUT calling `evaluateGuardrails`, `atomicSpendCheck`, or `validateActionPrerequisites`. | Any authenticated user can trigger `create_po` actions with no spend check, no guardrail evaluation, no safe mode check. Returns fake `poId: PO-${Date.now()}` without creating an actual PO. |
| Hardcoded fabricated results | `routes.ts:14984-14985` — Returns `{ success: true, poId: "PO-..." }` regardless of whether any real action occurred. | User sees "Purchase order created successfully" when no PO was created. Misleading financial representation. |

**Gate 1 Overall: FAIL** — Stripe webhook processing passes with enterprise-grade hardening. However, the automation spend check is non-transactional (financial risk under concurrency), and the AI assistant execute endpoint bypasses ALL financial safety controls.

---

### GATE 2 — TENANT ISOLATION (Cross-tenant safety)

**Verdict: FAIL**

#### Where companyId IS enforced (evidence of correct patterns):

| Layer | Pattern | Evidence |
|---|---|---|
| Route handlers (majority) | `companyId` derived from authenticated session via `user.companyId`, never from request params | `routes.ts:2361,2487,2631,6221` — All create operations inject `companyId: user.companyId` |
| Storage layer | `WHERE companyId = ?` on every query | `storage.ts:1006-1007,3828-3831` — `getUsersByCompany`, `getRole` both filter by companyId |
| WebSocket auth | Server-side session validation; companyId from DB, not client | `websocket.ts:39-98` — Cookie signature verified, user looked up from session store |
| WebSocket broadcast | Filter by `message.companyId !== client.companyId` | `websocket.ts:164` — Correctly skips mismatched companies |
| Cross-tenant write guard | `req.body.companyId !== user.companyId` check | `routes.ts:6244,6461,6579` — Explicit cross-tenant write prevention on PO, schedule, recommendation updates |

#### Where companyId IS NOT enforced (tenant isolation failures):

| Endpoint | Evidence | Severity |
|---|---|---|
| `GET /api/po-rules/:id` | `routes.ts:7227-7236` — Calls `storage.getPoRule(req.params.id)` with NO companyId check. Any authenticated user can read any company's PO rules by guessing UUIDs. | HIGH — Leaks procurement logic cross-tenant |
| `PATCH /api/po-rules/:id` | `routes.ts:7256-7265` — Calls `storage.updatePoRule(req.params.id, req.body)` with NO companyId check. Any authenticated user can modify another company's PO automation rules. | CRITICAL — Cross-tenant mutation of financial rules |
| `DELETE /api/po-rules/:id` | `routes.ts:7268-7274` — Calls `storage.deletePoRule(req.params.id)` with NO companyId check. Any authenticated user can delete another company's PO rules. | CRITICAL — Cross-tenant deletion |
| `storage.updatePoRule` | `storage.ts:2901-2906` — `WHERE eq(poRules.id, id)` with no companyId filter. | Storage layer has no guardrail for this entity. |
| `storage.deletePoRule` | `storage.ts:2909-2911` — `WHERE eq(poRules.id, id)` with no companyId filter. | Storage layer has no guardrail for this entity. |

#### WebSocket broadcast leakage:

| Broadcast | Evidence | Data Leaked |
|---|---|---|
| `external_economic_data` | `backgroundJobs.ts:300-312` — No `companyId` in message, `companiesUpdated: companies.length` included | Platform tenant count |
| `benchmark_aggregate` | `backgroundJobs.ts:1066-1072` — No `companyId`, raw `results` object broadcast | Cross-company aggregate data |

#### No database-level enforcement:

| Finding | Evidence |
|---|---|
| No RLS (Row-Level Security) | Grep for `RLS`, `row_level_security`, `ENABLE ROW`, `CREATE POLICY` — zero results across entire server directory. |
| No middleware-enforced scoping | Tenant isolation relies entirely on application discipline (each route manually deriving `user.companyId`). No centralized middleware validates that query results match the requesting tenant. |

**Gate 2 Overall: FAIL** — Three PO rule endpoints have zero tenant isolation, allowing cross-tenant read/write/delete. No database-level RLS exists as a compensating control. WebSocket broadcasts leak platform-level data to all tenants.

---

### GATE 3 — AUTOMATION SAFETY (Guardrails, concurrency, runaway prevention)

**Verdict: FAIL**

#### What works correctly:

| Mechanism | Evidence | Assessment |
|---|---|---|
| Trigger deduplication | `automationEngine.ts:982-1046` — `claimTriggerLock` uses INSERT-first with unique constraint on `processedTriggerEvents`. Duplicate `23505` caught and returns `acquired: false`. | PASS — Correctly prevents duplicate trigger processing. |
| Queue claiming | `automationEngine.ts:630-648` — `FOR UPDATE SKIP LOCKED` prevents double-claiming of queue items across workers. | PASS — PostgreSQL-level concurrency control. |
| Stale claim recovery | `automationEngine.ts:614-628` — Stuck `processing` items older than 5 minutes reset to `queued`. | PASS — Prevents permanent queue stalls. |
| Cooldown enforcement | `automationEngine.ts:1410-1429` — `canExecuteRule` checks `lastExecutedAt` against `cooldownMinutes`. Time-based, not race-prone for single instance. | PASS (single instance only) |
| Max executions per day | `automationEngine.ts:1421-1425` — Checks `executionCount >= maxExecutionsPerDay` per ISO date. | PASS (single instance only) |
| Approval workflow | `routes.ts:14712-14767` — Approve endpoint re-evaluates guardrails before executing. `validateActionPrerequisites` + `evaluateGuardrails` called inline. | PASS — Guardrails re-checked at execution time. |
| Dead letter queue | `backgroundJobs.ts:1114-1116` — After `maxAttempts` exceeded, item marked `failed` with dead letter message. | PASS — Prevents infinite retry loops. |

#### What fails:

| Issue | Evidence | Impact |
|---|---|---|
| Spend check non-atomic | `automationEngine.ts:948-974` — See Gate 1. Two separate SQL statements. | Under concurrent triggers, daily spend limit can be exceeded. |
| Guardrail violation count race | `automationEngine.ts:1226-1231,1249-1256,1265-1272,1289-1296,1304-1312` — All use `violationCount: (guard.violationCount || 0) + 1` (read-modify-write from stale object). Not an atomic SQL increment. | Two concurrent violations read count=5, both write 6. One violation lost. |
| Safe mode TOCTOU | `backgroundJobs.ts:1086-1104` — Safe mode checked BEFORE queue claiming (line 1086-1087), but queue items are claimed AFTER (line 1089). Between check and execution (line 1107), safe mode could be toggled. | High-stakes action executes despite safe mode being re-enabled. |
| Safe mode not RBAC-gated | `routes.ts:15028-15069` — `PATCH /api/agentic/safe-mode` requires only `isAuthenticated`. No `requirePermission('MANAGE_SAFE_MODE')` check. Any authenticated user in the company can disable safe mode. | Junior user disables safe mode; automation auto-executes `create_po`. |
| AI assistant bypasses ALL checks | `routes.ts:14961-15008` — No guardrails, no spend check, no safe mode, no prerequisite validation. | Complete safety bypass for assistant-initiated actions. |
| Job lock release no ownership check | `automationEngine.ts:1568-1579` — `releaseJobLock` deletes by `(jobName, companyId)` without checking `lockedBy`. Any worker can release another's lock. | Stale recovery + release race can cause duplicate job execution. |

**Gate 3 Overall: FAIL** — Trigger deduplication and queue claiming are sound. However, spend checks are non-atomic, guardrail counters have read-modify-write races, safe mode has a TOCTOU gap and no RBAC enforcement, and the AI assistant endpoint bypasses all automation safety controls.

---

### GATE 4 — OBSERVABILITY & FORENSICS (Auditability)

**Verdict: CONDITIONAL PASS**

#### Durable audit trail coverage:

| Event Category | Durably Logged? | Evidence |
|---|---|---|
| Action created | YES | `automationEngine.ts:468-479` — `structuredEventLog` INSERT with companyId, actionType, agentId, triggeredBy |
| Action approved | YES | `automationEngine.ts:506-523` — Logs userId, actionId, actionType to `structuredEventLog` |
| Action rejected | YES | `automationEngine.ts:545-558` — Logs userId, reason, actionId |
| Action expired | YES | `automationEngine.ts:584-596` — Logs expired action IDs and deadline |
| Guardrail violations | YES | `automationEngine.ts:1331-1366` — All violations logged with guardrailId, enforcement, reason. Blocking violations get separate `guardrail_escalation` event. |
| Queue claimed | YES | `automationEngine.ts:653-665` — Logs workerId and claimed item IDs |
| Queue requeued | YES | `automationEngine.ts:728-741` — Logs backoff schedule, attempt count, error |
| Stale lock recovery | YES | `automationEngine.ts:1549-1559` — `stale_job_lock_recovered` event logged |
| Safe mode update | YES | `routes.ts:15058-15062` — `logger.automation("safe_mode_updated")` with details |
| Webhook processed | YES | `webhookHandlers.ts:89-91` — `logger.webhook("event_processed")` with eventId, type, customer, subscription |
| Webhook failed | YES | `webhookHandlers.ts:111-114` — Error logged with full stack trace |
| Transition blocked | YES | `webhookHandlers.ts:275-279` — `logger.error("webhook", "transition_blocked")` with current/new status |
| Data retention | YES | `automationEngine.ts:1631-1643` — Retention run itself is logged |

#### Regime context at action time:

| Reconstructable? | Evidence |
|---|---|
| PARTIAL | `routes.ts:14722-14723` — Approve endpoint fetches current regime (`economics.regime`) and passes it to `evaluateGuardrails` as context. However, the regime value is NOT persisted in the `structuredEventLog` details for the `action_approved` event. The guardrail violation log includes the regime reason text but not the raw FDR value. |
| Action table stores regime? | NO — `aiActions` schema does not include a `regimeAtExecution` column. Regime is used for evaluation but not stored with the action record. |

#### Gaps:

| Gap | Evidence | Impact |
|---|---|---|
| Regime not persisted with action | `aiActions` schema (`schema.ts`) — no `regime` or `fdr` column | Cannot reconstruct what regime was active when action executed. Must cross-reference `structured_event_log` timestamps with regime update timestamps. |
| AI assistant actions not audited to `structuredEventLog` | `routes.ts:14997` — Uses `logger.automation()` (structured logger) but the assistant execute path creates actions with hardcoded results, making audit entries misleading. | Forensic trail shows "action executed" for actions that never actually ran. |
| No retention enforcement | `automationEngine.ts:1602-1646` — `runDataRetention` exists but is NOT called from any scheduled background job (`backgroundJobs.ts:1178-1193` — not in jobFunctions list). | `structuredEventLog` grows unboundedly. |

**Gate 4 Overall: CONDITIONAL PASS** — The platform has extensive durable audit logging via `structuredEventLog` (18 distinct INSERT points in automationEngine.ts alone). Webhook processing, action lifecycle, guardrail violations, and safe mode changes are all durably logged. However, the raw regime/FDR is not stored with action records, retention is not scheduled, and assistant actions log misleading success events.

---

### GATE 5 — DATA HONESTY (No fabricated claims, provenance required)

**Verdict: CONDITIONAL PASS**

#### Savings/Performance metrics:

| Metric | Provenance | Evidence |
|---|---|---|
| `measuredSavings` | Derived from `actualImpact.costSavings` on completed actions | `automationEngine.ts:1448-1456` — Filters for `actual.costSavings > 0`. Only counts actions with populated `actualImpact`. |
| `estimatedSavings` | Derived from `estimatedImpact.costSavings` | `automationEngine.ts:1458-1461` — Separate field from measured. |
| `estimatedSavingsLabel` | Explicit label: `"estimated (unverified)"` | `automationEngine.ts:1495` — Hardcoded label. |
| Separation of measured vs estimated | YES | `routes.ts:14848-14852` — API returns both `measuredSavings` and `estimatedSavings` with `measuredSavingsCount` and `estimatedSavingsLabel` as distinct fields. |
| Enterprise readiness checker validates this | YES | `enterpriseReadinessChecker.ts:224-240` — Checks for presence of label and measured field separation. |

**Assessment:** The stats API correctly separates measured from estimated savings and labels estimates as "unverified". No inflated claims found in the API layer.

#### UI claims:

| Finding | Evidence | Assessment |
|---|---|---|
| ROI Calculator disclaimer | `RoiCalculator.tsx:288` — "These are projected estimates based on counter-cyclical procurement research, not guaranteed results." | PASS — Honest framing. |
| Pilot Program verification | `PilotProgram.tsx:132` — "Joint verification of all savings claims. Independent audit rights included." | PASS — No unilateral claims. |
| Event Monitoring disclaimer | `EventMonitoring.tsx:325` — "No fabricated or simulated data is shown." | PASS — Explicit anti-fabrication statement. |
| AI Assistant savings language | `aiAssistant.ts:500` — "Results vary based on your specific situation - all savings are jointly verified before any success fees apply." | PASS — Qualified language. |
| Allocation page | `Allocation.tsx:58` — Comment: "Calculate measured inventory status (no fabricated capacity metrics)" | PASS — Code-level anti-fabrication discipline. |

#### AI Assistant Execute fabrication:

| Finding | Evidence | Assessment |
|---|---|---|
| Hardcoded fake PO results | `routes.ts:14984-14985` — `result = { success: true, poId: "PO-${Date.now()}" }` returned when NO actual PO is created. | FAIL — The assistant tells the user a PO was created when it was not. This is fabricated output presented as real. |
| Hardcoded fake rebalance | `routes.ts:14987-14988` — `{ success: true, transferCount: 3 }` — fabricated transfer count. | FAIL — Fixed number "3" regardless of actual inventory. |

#### News articles:

| Requirement | Met? | Evidence |
|---|---|---|
| Real publisher name | YES | `newsMonitoring.ts:405` — `source: article.source.name` from NewsAPI response |
| Real URL | YES | `newsMonitoring.ts:406` — `sourceUrl: article.url` |
| Publish timestamp | YES | `newsMonitoring.ts:407` — `publishedAt: new Date(article.publishedAt)` |
| Deduplication | YES | `newsMonitoring.ts:552-559` — Title-based dedup (first 50 chars). Weak but present. |
| Unverified label for failed fetch? | NO | If NewsAPI is unavailable, fallback behavior not verified. No "unverified" label mechanism for individual articles. |

**Gate 5 Overall: CONDITIONAL PASS** — The platform demonstrates strong data honesty discipline with explicit estimated/measured separation, disclaimers on projections, and real news provenance. However, the AI assistant execute endpoint returns fabricated PO/rebalance results, which is a data honesty violation. This specific endpoint should be disabled or reworked.

---

### GATE 6 — RESTART / SCALING BEHAVIOR

**Verdict: FAIL (Enterprise-ready); PASS (Single-instance beta)**

#### In-memory state that breaks under multi-instance:

| State | Location | Impact Under Scaling |
|---|---|---|
| `previousRegimes: Map<string, string>` | `backgroundJobs.ts:32` | Each instance maintains independent regime history. Instance B may re-fire regime change alerts that Instance A already processed. Duplicate webhook fires, duplicate alerts. |
| `jobs: Map<string, NodeJS.Timeout>` | `backgroundJobs.ts:30` | Each instance runs all 14 background jobs independently. No distributed lock wraps the `setInterval` registration. ALL jobs duplicate across instances. |
| `globalCache` (in-memory) | `backgroundJobs.ts:8`, `routes.ts:16` | Cache invalidation on Instance A doesn't propagate to Instance B. Stale reads for up to TTL duration. |
| `clients: Set<AuthenticatedClient>` | `websocket.ts:16` | WebSocket connections are per-instance. Broadcasts only reach clients connected to the same instance. |
| `rateLimiters` | `securityHardening.ts` (referenced `routes.ts:25`) | In-memory rate limit counters. Attacker can spread requests across instances to bypass limits. |
| Singleton `AutomationEngine` | `automationEngine.ts:17-26` | Single process singleton. Safe for single instance, but under multi-instance each has its own engine state. |

#### What IS correctly durable:

| Mechanism | Evidence | Assessment |
|---|---|---|
| Trigger deduplication | `processedTriggerEvents` table with unique constraint | PASS — Survives restart. |
| Queue claiming | `FOR UPDATE SKIP LOCKED` on `ai_execution_queue` | PASS — Database-level, multi-instance safe. |
| Job locks | `backgroundJobLocks` table with `uniqueIndex("bjl_job_company_unique")` | PASS — Designed for distributed locking, but NOT used to wrap `setInterval` job registration. Only used within individual job functions. |
| Stripe event dedup | `stripeProcessedEvents` with PK on `eventId` | PASS — Survives restart. |
| Safe mode | `automationSafeMode` table | PASS — Durable, database-backed. |

#### Background job duplication analysis:

| Job | Interval | Duplicate Impact |
|---|---|---|
| `updateExternalEconomicData` | 5 min | Duplicate API calls, duplicate regime change alerts |
| `updateCommodityPrices` | 30 sec | Excessive API calls, rate limit risk |
| `automationQueueWorkerJob` | 30 sec | `claimQueuedActions` uses `SKIP LOCKED` — safe for multi-instance |
| `automationMaintenanceJob` | 60 sec | Duplicate stale approval expiry runs — functionally safe but wasteful |
| `runForecastRetraining` | 24 hr | Duplicate retraining runs — wasteful but safe |
| `aggregateBenchmarkDataJob` | Monthly | Duplicate aggregation — may produce incorrect aggregates if run simultaneously |

**Note:** The `acquireJobLock` method EXISTS (`automationEngine.ts:1509-1566`) with proper INSERT-first locking, but it is NOT used to gate any of the `setInterval` background jobs. It is only used within individual automation operations. The infrastructure for distributed job locking is built but not applied to the job scheduler.

**Gate 6 Overall: FAIL for enterprise-ready (multi-instance breaks regime detection, duplicates all 14 background jobs, breaks rate limiting). PASS for single-instance beta deployment.**

---

## Final Certification Verdict

### VERDICT: **GO (Beta Only — Single Instance, Insight-Only Mode)**

### Justification:

| Gate | Result | Implication |
|---|---|---|
| Gate 1 (Money) | FAIL (automation spend) | Enterprise automation execution is **NO GO**. Stripe subscription lifecycle is safe. |
| Gate 2 (Tenant) | FAIL (PO rule endpoints) | Public multi-tenant launch is **NO GO** until PO rule endpoints are patched. |
| Gate 3 (Automation) | FAIL (spend race, safe mode TOCTOU, assistant bypass) | Automation execution must be disabled or approval-only. |
| Gate 4 (Observability) | CONDITIONAL PASS | Forensic reconstruction is possible but regime context is missing from action records. |
| Gate 5 (Data Honesty) | CONDITIONAL PASS | Metrics are honest. AI assistant execute returns fabricated results — must be disabled. |
| Gate 6 (Scaling) | FAIL enterprise / PASS single | Single-instance beta is viable. Multi-instance requires distributed job locking. |

**Why not NO GO:** The core platform — regime analysis, demand forecasting, material allocation, commodity pricing, supply chain visualization, and the Stripe billing lifecycle — is functionally sound. The data honesty discipline is strong. The Stripe webhook hardening is enterprise-grade. The issues are concentrated in the automation execution layer and three specific PO rule endpoints.

**Why not GO (enterprise-ready):** Three cross-tenant mutation endpoints exist with zero isolation. Automation spend limits are bypassable. The AI assistant execute endpoint bypasses all safety controls and returns fabricated results. Multi-instance deployment would break regime detection and duplicate all background jobs.

---

## Prioritized Remediation List (Top 10)

### 1. CRITICAL — Fix PO Rule Tenant Isolation (Gate 2)
**File:** `server/routes.ts` lines 7227-7274  
**Change:** Add companyId validation to GET/:id, PATCH/:id, DELETE/:id for PO rules.  
**File:** `server/storage.ts` lines 2901-2911  
**Change:** Add `eq(poRules.companyId, companyId)` to `updatePoRule` and `deletePoRule` WHERE clauses.  
**Pattern:**
```typescript
// routes.ts GET /api/po-rules/:id
const user = await storage.getUser(req.user.claims.sub);
if (!user?.companyId) return res.status(400)...
const rule = await storage.getPoRule(req.params.id);
if (!rule || rule.companyId !== user.companyId) return res.status(404)...
```

### 2. CRITICAL — Make atomicSpendCheck Truly Atomic (Gate 1, Gate 3)
**File:** `server/lib/automationEngine.ts` lines 941-975  
**Change:** Replace two-statement reserve-then-check with single atomic SQL:
```sql
UPDATE automation_runtime_state
SET daily_spend_total = CASE
  WHEN daily_spend_total + $amount <= $limit THEN daily_spend_total + $amount
  ELSE daily_spend_total
END,
daily_action_count = CASE
  WHEN daily_spend_total + $amount <= $limit THEN daily_action_count + 1
  ELSE daily_action_count
END
WHERE company_id = $companyId AND state_date = $today
RETURNING daily_spend_total,
  (daily_spend_total != daily_spend_total - $amount) as was_incremented;
```

### 3. CRITICAL — Disable or Rework AI Assistant Execute (Gate 3, Gate 5)
**File:** `server/routes.ts` lines 14961-15008  
**Change:** Either:
- (a) Remove the endpoint entirely, OR
- (b) Route through the same guardrail+spend+safe-mode pipeline as the approve endpoint (lines 14712-14767), OR
- (c) Change to only create `pending` actions that require approval, never return fabricated results.

### 4. HIGH — Fix Guardrail Violation Count Race (Gate 3)
**File:** `server/lib/automationEngine.ts` lines 1226-1231 (and 4 other identical patterns)  
**Change:** Replace `violationCount: (guard.violationCount || 0) + 1` with atomic SQL:
```sql
UPDATE ai_guardrails
SET violation_count = violation_count + 1,
    last_violation_at = NOW(),
    updated_at = NOW()
WHERE id = $guardId
RETURNING violation_count;
```

### 5. HIGH — Fix Safe Mode TOCTOU (Gate 3)
**File:** `server/backgroundJobs.ts` lines 1086-1107  
**Change:** Move safe mode check INSIDE the claimed item loop, immediately before `executeAction`. Re-query safe mode for each item:
```typescript
for (const item of claimed) {
  const currentSafeMode = await engine.getSafeMode(companyId);
  if (currentSafeMode?.isEnabled && highStakesTypes.includes(action.actionType)) {
    await engine.markQueueOutcome(item.id, companyId, "failed", "Blocked by safe mode");
    continue;
  }
  // ... execute
}
```

### 6. HIGH — Add RBAC to Safe Mode Toggle (Gate 3)
**File:** `server/routes.ts` line 15028  
**Change:** Add `requirePermission('MANAGE_SAFE_MODE')` middleware:
```typescript
app.patch("/api/agentic/safe-mode", isAuthenticated, requirePermission('MANAGE_SAFE_MODE'), async (...) => {
```

### 7. HIGH — Fix WebSocket Broadcast Tenant Leakage (Gate 2)
**File:** `server/websocket.ts` lines 156-178  
**Change:** Invert filter default — reject messages without companyId unless explicitly marked global:
```typescript
if (!message.companyId) {
  return; // Do not broadcast unscoped messages
}
```
Also add `companyId` to all broadcast calls in `backgroundJobs.ts` that carry tenant-specific data.

### 8. MEDIUM — Fix Job Lock Release Ownership (Gate 3, Gate 6)
**File:** `server/lib/automationEngine.ts` lines 1568-1579  
**Change:** Add `lockedBy` check to DELETE WHERE clause:
```typescript
.where(and(
  eq(backgroundJobLocks.jobName, jobName),
  eq(backgroundJobLocks.companyId, companyId),
  eq(backgroundJobLocks.lockedBy, workerLabel)
))
```

### 9. MEDIUM — Store Regime Context with Actions (Gate 4)
**File:** `shared/schema.ts` — `aiActions` table  
**Change:** Add `regimeAtCreation` and `fdrAtCreation` columns.  
**File:** `server/lib/automationEngine.ts` `createAction` method  
**Change:** Populate regime/FDR from current economic state when creating action.

### 10. MEDIUM — Schedule Data Retention Job (Gate 4)
**File:** `server/backgroundJobs.ts`  
**Change:** Add `runDataRetention` to the jobFunctions array and jobConfigs with a daily interval. Also modify `runDataRetention` to use count-only deletes instead of `.returning()` for bulk operations.

---

## Publish Mode Recommendation

### Recommended: **(a) Insight-Only Mode** — with path to (b)

**Justification:**

| Mode | Viable? | Reason |
|---|---|---|
| **(c) Full auto-execute** | NO | Gate 1 FAIL (non-atomic spend), Gate 3 FAIL (safe mode TOCTOU, assistant bypass), Gate 2 FAIL (cross-tenant PO rule mutation). Auto-execution of `create_po` could generate real financial obligations with no spend cap enforcement. |
| **(b) Automation with approvals only** | NOT YET | Approve endpoint (lines 14712-14767) correctly re-evaluates guardrails, but the spend check it relies on is non-atomic. The assistant execute endpoint bypasses approvals entirely. Safe mode has no RBAC. Fix items 1-6 first, then (b) becomes viable. |
| **(a) Insight-only mode** | YES | Disable all automation execution endpoints. The regime analysis, forecasting, allocation, commodity pricing, supply chain visualization, and dashboard features do not have the identified financial/safety issues. Stripe billing lifecycle is enterprise-grade. News monitoring has real provenance. Data honesty is demonstrated. |

**Path from (a) to (b):**
1. Apply fixes 1-6 from remediation list
2. Disable the AI assistant execute endpoint
3. Verify safe mode defaults to ON for new companies (already true: `automationSafeMode.safeModeEnabled` defaults to 1 — `schema.ts:7246`)
4. Add RBAC gating to safe mode toggle
5. Then enable approval-only automation

**Path from (b) to (c):**
1. Apply fixes 7-10
2. Implement distributed job locking for background jobs
3. Move `previousRegimes` and `globalCache` to shared storage (Redis or PostgreSQL)
4. Add integration tests for concurrent spend checks
5. Conduct penetration testing on tenant isolation

---

## Appendix: Evidence File Index

| File | Lines | What Was Examined |
|---|---|---|
| `server/webhookHandlers.ts` | 1-572 | Full Stripe webhook lifecycle |
| `server/lib/automationEngine.ts` | 1-1650 | Spend checks, guardrails, queue claiming, job locks, data retention |
| `server/backgroundJobs.ts` | 1-1230 | Background job registration, regime tracking, queue worker, broadcasts |
| `server/websocket.ts` | 1-199 | WebSocket auth, tenant-scoped broadcast |
| `server/routes.ts` | 7214-7290, 14695-15070 | PO rule endpoints, automation approve/reject/execute, safe mode |
| `server/storage.ts` | 2901-2911 | PO rule storage (missing companyId) |
| `shared/schema.ts` | 7219-7318 | Stripe events, safe mode, event log, job locks schemas |
| `server/lib/newsMonitoring.ts` | 1-560 | News article provenance and dedup |
| `client/src/pages/*.tsx` | Various | UI claims and disclaimers |
