# Prescient Labs - Technical Architecture Report

**Date**: February 15, 2026
**Scope**: Complete implementation audit of the Prescient Labs manufacturing intelligence platform
**Audience**: Technical reviewers, investment diligence teams

---

## 1. Backend Architecture

### 1.1 Language, Framework, and Runtime

The backend is a Node.js application written in TypeScript, running on the Express.js framework (v4). The runtime is hosted on Replit's managed infrastructure. The application binds to a single port (5000) which serves both the Express API and the Vite-bundled React frontend through a unified HTTP server.

### 1.2 Structural Organization

The application is a **monolith**. All backend logic resides in a single Express process. There is no microservice decomposition, no message queue, and no service mesh. Internal module communication is via direct function imports within the same Node.js process.

The backend is organized as follows:

| Path | Purpose | Lines |
|------|---------|-------|
| `server/index.ts` | Application entry point. Initializes Stripe schema, registers webhook handler, applies middleware, starts HTTP server, launches background jobs. | 172 |
| `server/routes.ts` | All 653 API endpoint registrations. Contains route handlers, request validation, response formatting, and some inline business logic. | 20,058 |
| `server/storage.ts` | Data access layer. Implements `IStorage` interface with Drizzle ORM queries. All database reads/writes pass through this layer. | 4,774 |
| `server/backgroundJobs.ts` | 12 scheduled background tasks using `setInterval`. Economic data polling, forecast retraining, RFQ generation, benchmark aggregation, sensor simulation, etc. | 1,145 |
| `server/lib/` | 100+ domain modules. Each module encapsulates specific business logic (economic regime, forecasting, integrations, security, etc.). | 38,645 (total) |
| `server/middleware/rbac.ts` | RBAC enforcement middleware. | 148 |
| `server/webhookHandlers.ts` | Stripe webhook processing with idempotency deduplication. | 224 |
| `server/websocket.ts` | WebSocket server for real-time dashboard updates with server-side session authentication and tenant isolation. | 198 |
| `shared/schema.ts` | Drizzle ORM schema definitions, Zod insert schemas, and TypeScript types shared between frontend and backend. | 8,471 |

### 1.3 Business Logic Location

Business logic is **not uniformly separated** from the presentation layer. The architecture has two patterns:

1. **Properly separated modules** in `server/lib/`: Economic regime logic (`regimeConstants.ts`, `regimeIntelligence.ts`, `economics.ts`), forecasting (`enhancedForecasting.ts`, `forecastRetraining.ts`, `forecastMonitoring.ts`), allocation (`allocation.ts`), RFQ generation (`rfqGeneration.ts`), and integrations are implemented as standalone modules with defined interfaces.

2. **Inline route handler logic**: The 20,058-line `routes.ts` file contains significant business logic mixed with HTTP concerns. The agentic AI automation engine (agents, rules, guardrails, action execution) is implemented entirely within `routes.ts` starting at approximately line 14,550, using in-memory `Map<string, any[]>` structures declared as route-scoped closures.

### 1.4 Economic Regime Logic (FDR)

The Dual-Circuit FDR (Financial-to-Domestic-Product Ratio) model is the core intellectual property. Its implementation is distributed across:

- **`server/lib/regimeConstants.ts`** (161 lines): Canonical source of truth. Defines the four economic regimes with FDR thresholds:
  - HEALTHY_EXPANSION: FDR 0.0 - 1.2
  - ASSET_LED_GROWTH: FDR 1.2 - 1.8
  - IMBALANCED_EXCESS: FDR 1.8 - 2.5
  - REAL_ECONOMY_LEAD: FDR 2.5 - 10.0
  - Hysteresis band: 0.15
  - Reversion penalty multiplier: 2.0x
  - Minimum regime duration: 14 days
  - Confirmation readings required: 3

- **`server/backgroundJobs.ts`** (lines 35-164): FDR calculation from FRED API data (S&P 500 growth / average of GDP + Industrial Production growth). Persistence enforcement function applies hysteresis, duration filter, and confirmation count before confirming regime transitions. Regime state is stored per-company in the `regimeState` database table.

- **`server/lib/regimeIntelligence.ts`** (640 lines): Higher-order regime analysis including transition probability estimation, procurement timing signals, and regime-aware recommendations.

- **`server/lib/fdrOptimization.ts`** (535 lines): FDR optimization algorithms and stress testing.

FDR calculations happen in the background job loop (every 5 minutes). The flow is: fetch FRED data -> calculate growth rates -> compute FDR ratio -> clamp to [0.2, 5.0] -> classify raw regime -> apply persistence enforcement (hysteresis + duration + confirmation) -> persist snapshot + broadcast WebSocket update.

### 1.5 Automation Rule Execution

The agentic AI automation system is implemented as **in-memory state within `routes.ts`**:

```
const companyAgents: Map<string, any[]> = new Map();
const companyRules: Map<string, any[]> = new Map();
const companyGuardrails: Map<string, any[]> = new Map();
const companyPendingActions: Map<string, any[]> = new Map();
const companyActionHistory: Map<string, any[]> = new Map();
```

This means:
- Agent definitions, automation rules, guardrails, pending actions, and action history are stored in process memory only.
- All agentic AI state is lost on process restart.
- There are corresponding database tables (`aiAgents`, `aiAutomationRules`, `aiGuardrails`, etc.) defined in the schema and used by some CRUD endpoints, but the runtime execution engine (guardrail evaluation, action prerequisite validation, spending limit enforcement) operates against the in-memory Maps.

Guardrail evaluation includes: spending limits (daily aggregate across all actions), time restrictions (allowed hours/days for high-value actions), regime restrictions (hard-block on UNKNOWN/degraded regime, require-approval on caution regimes), and supplier rating restrictions.

### 1.6 Internal Module Communication

All internal module communication is synchronous function calls within a single process. There are no RPC calls, no event buses between services, and no queue-based decoupling. The `IntegrationEventBus` class in `integrationOrchestrator.ts` provides an in-process pub/sub for integration events, but it is not a distributed message bus.

---

## 2. Database Analysis

### 2.1 Database System

**PostgreSQL**, hosted on **Neon Serverless PostgreSQL**. The connection is established via `@neondatabase/serverless` with WebSocket support (`ws` package as the WebSocket constructor). This is a persistent, production-grade managed database with automatic failover and point-in-time recovery provided by Neon.

Connection setup (`server/db.ts`):
```typescript
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });
```

The connection uses a single `Pool` instance. There is no explicit pool size configuration; it relies on the `@neondatabase/serverless` driver defaults.

### 2.2 Schema Overview

The schema contains **191 tables** defined in `shared/schema.ts` (8,471 lines).

Major table categories:

| Category | Tables | Examples |
|----------|--------|----------|
| Core entities | ~20 | `companies`, `users`, `skus`, `materials`, `suppliers`, `boms` |
| Economic/Regime | ~8 | `economicSnapshots`, `regimeState`, `regimeTransitions`, `regionalFdrSnapshots`, `fdrAlerts` |
| Forecasting | ~8 | `demandPredictions`, `multiHorizonForecasts`, `forecastAccuracyTracking`, `forecastDegradationAlerts`, `historicalPredictions`, `predictionOutcomes` |
| Supply chain | ~12 | `supplierChainLinks`, `supplierTiers`, `supplierRegionRisks`, `supplierRiskSnapshots`, `supplierHealthMetrics` |
| Production | ~10 | `productionRuns`, `productionMetrics`, `downtimeEvents`, `productionBottlenecks`, `equipmentSensors`, `sensorReadings` |
| Procurement | ~8 | `purchaseOrders`, `rfqs`, `rfqQuotes`, `procurementSchedules`, `autoPurchaseRecommendations`, `poApprovals` |
| Compliance | ~8 | `complianceDocuments`, `complianceRegulations`, `complianceAudits`, `auditFindings`, `auditChecklistTemplates` |
| Workforce | ~12 | `employees`, `workShifts`, `employeePayroll`, `employeeBenefits`, `employeePerformanceReviews` |
| AI/Agentic | ~10 | `aiAgents`, `aiAutomationRules`, `aiGuardrails`, `aiActions`, `aiExecutionQueue`, `aiApprovalWorkflows` |
| Integrations | ~12 | `integrationConnections`, `integrationEvents`, `syncJobs`, `deadLetterEvents`, `externalIdentities`, `integrationHealthSnapshots` |
| S&OP | ~10 | `sopMeetings`, `sopApprovalChains`, `sopApprovalRequests`, `sopReconciliationItems`, `sopGapAnalysis` |
| Digital Twin | ~6 | `digitalTwinSnapshots`, `digitalTwinMetrics`, `digitalTwinQueries`, `digitalTwinSimulations` |
| Behavioral | ~5 | `behavioralUserActions`, `behavioralPatternAggregates`, `behavioralRegimeSnapshots`, `behavioralSignalExposures` |
| Platform analytics | ~5 | `platformAnalyticsSnapshots`, `platformBehavioralAnalytics`, `platformMaterialTrends` |
| Sessions/Auth | 3 | `sessions`, `users`, `teamInvitations` |
| RBAC | 4 | `permissions`, `roles`, `rolePermissions`, `userRoleAssignments` |
| Audit | 2 | `auditLogs`, `integrationAuditLogs` |
| Scenarios | ~8 | `scenarios`, `scenarioSimulations`, `scenarioVariables`, `scenarioOutputs`, `savedScenarios` |

### 2.3 Foreign Keys and Referential Integrity

- **366 foreign key references** defined via `.references()` in the schema.
- **237 cascade delete rules** (`onDelete: "cascade"`).
- **268 `companyId` columns** across the schema, all referencing `companies.id`.
- Foreign keys are enforced at the database level by PostgreSQL. Drizzle ORM generates the DDL with `REFERENCES` constraints.

### 2.4 Indexing Strategy

- **350 indexes and unique indexes** defined in the schema.
- Pattern: Most tables have at minimum a `companyId` index. Many have composite unique constraints (e.g., `uniqueIndex("roles_company_name_unique").on(table.companyId, table.name)`).
- The `sessions` table has a dedicated expiry index: `index("IDX_session_expire").on(table.expire)`.
- Integration tables have indexes on `companyId`, `integrationId`, and composite unique constraints on `(companyId, integrationId)`.

### 2.5 Multi-Tenant Isolation (Database Level)

Tenant isolation is enforced through a **shared-schema, shared-database** model with `companyId` filtering:

1. Every data table includes a `companyId` column with a foreign key to `companies.id`.
2. The storage layer (`server/storage.ts`) includes `companyId` in all query WHERE clauses.
3. API route handlers extract `companyId` from the authenticated user's session and pass it to the storage layer.
4. There is **no row-level security (RLS)** at the PostgreSQL level. Isolation depends entirely on application-layer enforcement.

This means a bug in the storage layer or a direct database query that omits the `companyId` filter could expose cross-tenant data. The application currently has 653 API endpoints, all of which must correctly propagate the `companyId` filter.

---

## 3. Environment Configuration and Secret Management

### 3.1 Environment Variables

Environment variables are managed through Replit's secrets system. The following secrets are configured:

| Secret | Purpose |
|--------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string (auto-provisioned by Replit) |
| `SESSION_SECRET` | Express session signing key |
| `ENCRYPTION_KEY` | AES-256-CBC key for `EncryptionService` (64 hex characters) |
| `CREDENTIAL_ENCRYPTION_KEY` | AES-256-GCM key for integration credential encryption |
| `ALPHA_VANTAGE_API_KEY` | Market data API |
| `FRED_API_KEY` | Federal Reserve economic data API |
| `NEWS_API_KEY` | News monitoring API |
| `TRADING_ECONOMICS_API_KEY` | Commodity pricing data |
| `STRIPE_SECRET_KEY` | Stripe payment processing |
| `STRIPE_PUBLISHABLE_KEY` | Stripe client-side key |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | SMS alerts |
| `SENDPULSE_API_USER_ID`, `SENDPULSE_API_SECRET` | Email service |
| `REPL_ID` | Replit platform identifier (auto-set) |
| `REPLIT_DOMAINS` | Replit deployment domains (auto-set) |

### 3.2 Hardcoded Secrets

No API keys or secrets are hardcoded in source code. The `ENCRYPTION_KEY` environment variable is **required at startup** -- the `securityHardening.ts` module calls `process.exit(1)` if it is not set. The `CREDENTIAL_ENCRYPTION_KEY` has a fallback behavior: if not set, it generates an ephemeral random key with a logged warning that credentials will be lost on restart.

The `SESSION_SECRET` is required and set via environment variable. Session cookies are signed using this secret, and the WebSocket authentication layer verifies signatures against it.

### 3.3 Environment Separation

Development and production share the same database instance. The application detects environment via `process.env.NODE_ENV`:
- **Development**: Vite dev server with HMR, 5000 req/min global rate limit, cookies not restricted to HTTPS.
- **Production**: Static file serving, 1000 req/min global rate limit, HSTS headers enabled, secure cookies.

There is no separate staging environment. API keys are not scoped per-tenant; all tenants share the same FRED, Alpha Vantage, and other API keys configured at the platform level.

---

## 4. Payment System

### 4.1 Payment Provider

**Stripe**, integrated via the `stripe-replit-sync` library for schema management and webhook handling, plus the native `stripe` Node.js SDK for API calls.

### 4.2 Stripe Schema

Stripe data is stored in a dedicated `stripe` PostgreSQL schema (separate from the application's `public` schema). The `stripe-replit-sync` library manages migrations for this schema and handles backfill syncing of Stripe products, prices, subscriptions, and customers.

### 4.3 Webhook Processing

Webhooks are received at `/api/stripe/webhook/:uuid`. The UUID is dynamically generated by `stripe-replit-sync`'s `findOrCreateManagedWebhook()` function.

Processing flow:
1. Raw body preserved as `Buffer` (webhook route registered **before** `express.json()` middleware).
2. Stripe signature verified via `stripe-replit-sync`'s `processWebhook()` method.
3. After sync processing, custom subscription event handling runs.

### 4.4 Idempotency

Webhook event deduplication uses an **in-memory `Set<string>`** (`processedEventIds`):
- Maximum size: 10,000 events.
- When exceeded, the oldest 50% of entries are pruned.
- Duplicate event IDs are logged and skipped.

**Limitation**: This idempotency mechanism is in-memory. On process restart, the deduplication set is empty, and previously-processed events could theoretically be reprocessed if Stripe retries them. The `stripe-replit-sync` library provides its own layer of idempotency for the schema sync operations, but the custom subscription event handlers (`handleCheckoutComplete`, `handleSubscriptionUpdate`, etc.) rely on the in-memory set.

### 4.5 Handled Webhook Events

| Event | Behavior |
|-------|----------|
| `checkout.session.completed` | Updates user's `stripe_subscription_id` and sets status to `active` |
| `customer.subscription.created/updated` | Syncs subscription status, extracts tier from product metadata, updates trial end date |
| `customer.subscription.deleted` | Sets subscription status to `canceled` |
| `invoice.paid` | Reactivates subscriptions from `past_due`/`incomplete` to `active` |
| `invoice.payment_failed` | Sets subscription status to `past_due` |
| `charge.refunded` | Logs refund details (full/partial), no status change |

### 4.6 Duplicate Charge Prevention

Stripe handles payment idempotency natively via its APIs. The application does not implement its own payment idempotency keys for checkout session creation. Duplicate subscription activation is prevented by the webhook handler updating users by `stripe_customer_id` (which is unique per Stripe customer).

### 4.7 Financial State Reconciliation

The `stripe-replit-sync` library performs background sync (`syncBackfill()`) at startup to reconcile the local `stripe` schema with Stripe's source of truth. Subscription status is updated both via webhooks (real-time) and this backfill process (at startup).

---

## 5. Automation Rules Engine

### 5.1 Architecture

The automation engine is implemented as a set of in-memory data structures within `server/routes.ts`:

- **Agents** (`companyAgents: Map<string, any[]>`): Define autonomous procurement agents with capabilities, operating regime, and approval requirements.
- **Rules** (`companyRules: Map<string, any[]>`): Define trigger conditions, actions, and execution parameters.
- **Guardrails** (`companyGuardrails: Map<string, any[]>`): Define spending limits, time restrictions, regime restrictions, and supplier restrictions.
- **Pending Actions** (`companyPendingActions: Map<string, any[]>`): Actions awaiting approval or execution.
- **Action History** (`companyActionHistory: Map<string, any[]>`): Log of executed actions.

### 5.2 Persistence

**Agents and rules persist to the database** via CRUD endpoints that write to `aiAgents` and `aiAutomationRules` tables. However, the **runtime execution state** (guardrails, pending actions, action history, spending totals) exists only in memory. On restart:
- Agent and rule definitions survive (stored in PostgreSQL).
- Guardrail configurations, pending action queues, execution history, and daily spending counters are lost.
- Default guardrails are regenerated from code on first access.

### 5.3 Execution Logging

Automation events are logged to the `auditLogs` table via the `logAutomationEvent()` function, which calls `storage.createAuditLog()`. These audit entries persist in the database and survive restarts.

### 5.4 Concurrency

There is **no concurrency control** for automation rule execution. The system runs in a single Node.js process, so concurrent execution is limited to overlapping async operations within the event loop. There are no database locks, optimistic concurrency tokens, or distributed locks.

### 5.5 Guardrail Enforcement

Guardrails are evaluated synchronously before action execution. The evaluation is **not transactional** -- it checks spending limits against the in-memory action history, not against a database-backed ledger. The sequence is:
1. Validate action prerequisites (material ID, supplier ID, quantity, cost).
2. Evaluate all active guardrails against the action.
3. If any guardrail returns `enforcement: "block"`, the action is rejected.
4. If guardrail returns `enforcement: "require_approval"`, the action moves to pending.
5. If all guardrails pass, the action is executed.

Regime restriction guardrails **hard-block** on UNKNOWN or empty regime values, preventing any automated actions during data outages.

### 5.6 Duplicate Trigger Risk

Because rules and execution state are in-memory, and there is no deduplication mechanism for rule triggers, a rapid sequence of matching events (e.g., multiple WebSocket updates) could theoretically trigger the same rule multiple times. The spending limit guardrail provides a partial mitigation by capping total daily spend, but it does not prevent duplicate actions below the spending cap.

---

## 6. Integration Architecture

### 6.1 Supported Integrations

The platform supports 60+ external systems organized into categories:

| Category | Systems |
|----------|---------|
| ERP | SAP, Oracle/NetSuite, QuickBooks, Xero |
| CRM | Salesforce, HubSpot |
| E-commerce | Shopify, WooCommerce, BigCommerce, Amazon Seller |
| Shipping | FedEx, UPS, DHL |
| Payments | Stripe, PayPal, Braintree, Square |
| Collaboration | Slack, Microsoft Teams, Jira, Asana, Monday, Linear, Trello |
| Email | SendGrid, Mailchimp, ActiveCampaign, Drip, Klaviyo |
| Analytics | Mixpanel, Segment, Power BI |
| Support | Zendesk, Freshdesk, Intercom |
| Calendar | Google Calendar |
| Storage | Google Sheets, Airtable, Notion |
| Legal | DocuSign |
| Weather | Weather API |

### 6.2 Integration Patterns

Two distinct integration architectures coexist:

**Pattern A: BaseIntegration class** (`server/lib/baseIntegration.ts`, 187 lines)
- Abstract class with `companyId`, encrypted `credentials`, and Axios `client`.
- Built-in rate limiting (`rateLimitMs`, default 100ms between requests).
- Retry with exponential backoff (`requestWithRetry`, up to 3 retries, backoff starting at 1s).
- Retries on HTTP 429 and 5xx responses.
- Individual integration classes (e.g., `shopifyIntegration.ts`, `hubspotService.ts`) extend this.

**Pattern B: IntegrationOrchestrator** (`server/lib/integrationOrchestrator.ts`, 750 lines)
- `BaseConnector` abstract class with `pull`, `push`, `healthCheck`, and `validateCredentials` methods.
- Canonical object types for cross-integration data normalization.
- `IntegrationEventBus` for in-process event pub/sub.
- Idempotency key generation via SHA-256 hash of `integrationId:externalId:objectType:version`.
- Dead letter queue (`deadLetterEvents` table) for failed events.
- External identity mapping (`externalIdentities` table) to prevent duplicate entity creation.

### 6.3 Credential Storage

Integration credentials are encrypted before database storage using **AES-256-GCM** (`server/lib/credentialEncryption.ts`):
- Key derivation: PBKDF2 with 100,000 iterations, SHA-256, from `CREDENTIAL_ENCRYPTION_KEY` environment variable.
- Format: Base64-encoded concatenation of IV (16 bytes) + Auth Tag (16 bytes) + Encrypted Data.
- If `CREDENTIAL_ENCRYPTION_KEY` is not set, an ephemeral random key is generated per server session (logged as a security warning).

### 6.4 Webhook Handling

Integration webhooks use the `WebhookService` class (`server/lib/webhookService.ts`) which:
- Stores webhook registrations in `webhookIntegrations` table.
- Fires events to registered webhook URLs.
- Logs delivery attempts in `webhookEventLogs` table.
- Idempotency for integration events is enforced via the `idempotencyKey` column on the `integrationEvents` table with duplicate detection before insert.

### 6.5 Integration Health Monitoring

Health checks are performed via `GET /api/integrations/health` which runs parallel health checks against all 18 configured integration categories. Results include latency, status (healthy/degraded/offline/not_configured), and are stored in `integrationHealthSnapshots`.

### 6.6 Failure Handling

- Failed integration events are routed to the `deadLetterEvents` table with error details, retry count, and original payload.
- The BaseIntegration pattern retries on transient errors (429, 5xx) with exponential backoff.
- Permanent failures (401, 403, 404) are not retried and are logged.

---

## 7. Logging and Monitoring

### 7.1 Log Output

All logging goes to **stdout/stderr** via `console.log`, `console.warn`, and `console.error`. There is no structured logging library (e.g., Winston, Pino). Log lines are plain text with prefix tags:

```
[Security] Applying SOC2-lite security hardening...
[WebSocket] Client authenticated for company: abc123
[Background] REGIME CHANGE for company xyz: HEALTHY_EXPANSION -> ASSET_LED_GROWTH
[Audit] CREATE sku (sku_123) by user_456
```

### 7.2 Request Logging

The Express middleware in `server/index.ts` logs all `/api` requests with method, path, status code, and duration. Response bodies are captured and included (truncated to 79 characters):

```
POST /api/skus 201 in 45ms :: {"id":"sku_123","name":"Widget A"}
```

### 7.3 Audit Trail

The `auditLogs` table captures:
- `companyId`, `userId` (who performed the action)
- `action` (create, update, delete, export, import, login, logout, assign, remove, generate, aggregate, calculate, run, execute, view)
- `entityType` and `entityId` (what was affected)
- `changes` (JSON of the mutation payload)
- `ipAddress` and `userAgent`
- `createdAt` (timestamp)

The `logAudit()` function is called from route handlers and background jobs. The `auditMiddleware()` function can be applied as Express middleware to automatically log successful mutations. System/background operations can be excluded via the `systemContext` flag.

### 7.4 Security Monitoring

The `SecurityMonitor` class (`server/lib/securityHardening.ts`) stores up to 1,000 security events **in memory**:
- Event types: `rate_limit`, `sql_injection`, `xss_attempt`, `auth_failure`, `suspicious_activity`
- Severity levels: `low`, `medium`, `high`, `critical`
- Includes `getSummary()` for dashboard display with 24-hour rollups.

Security events are lost on restart.

### 7.5 Audit Trail Completeness

The audit system can reconstruct:
- **Automation decisions**: Logged via `logAutomationEvent()` to `auditLogs` with action type `automation.*`.
- **Regime transitions**: Logged to `regimeTransitions` table with full context (previous regime, new regime, FDR value, confirmation count, duration, hysteresis applied).
- **Payments**: Stripe webhook events are logged via `console.log` with event type and customer ID. Stripe's own dashboard provides the authoritative audit trail. The application does not maintain a separate financial audit log table.
- **Data imports**: Audit entries are created for import operations with `action: "import"`.

### 7.6 Error Monitoring

There is no external error monitoring service (Sentry, Datadog, etc.). Errors are caught in try-catch blocks and logged to stderr. The `wss.on('error')` handler catches WebSocket errors. Background job errors are caught per-job and logged but do not halt the job scheduler.

There is no uptime monitoring. Health can be assessed via `GET /api/integrations/health` for integration status.

---

## 8. Security Architecture

### 8.1 Authentication

Authentication uses **Replit Auth (OpenID Connect)**:
- OIDC discovery from `https://replit.com/oidc` (or custom `ISSUER_URL`).
- Passport.js strategy with `openid-client`.
- Session-based authentication stored in PostgreSQL via `connect-pg-simple`.
- Session cookies: `httpOnly: true`, `secure: true`, 7-day TTL, rolling refresh.
- Token refresh: If the access token is expired, the middleware attempts a silent refresh using the stored refresh token before returning 401.

### 8.2 API-Layer Tenant Isolation

All 653 API endpoints behind the global middleware chain at line 522 of `routes.ts`:

```typescript
app.use('/api', isAuthenticated, attachRbacUser);
```

This applies to all `/api` routes registered after this line. Routes registered before (Stripe webhook, public Stripe config/products) bypass authentication intentionally.

The `attachRbacUser` middleware:
1. Extracts `userId` from the Passport session.
2. Looks up the user in the database to get their `companyId`.
3. Attaches `{ id, email, companyId }` to `req.rbacUser`.

Route handlers then extract `companyId` from `req.rbacUser` and pass it to storage methods. Cross-tenant access is prevented by the storage layer filtering all queries by `companyId`.

### 8.3 WebSocket Tenant Isolation

WebSocket connections are authenticated server-side:
1. Extract `connect.sid` cookie from the upgrade request.
2. Verify the cookie signature using `SESSION_SECRET` via `cookie-signature.unsign()`.
3. Look up the session in the database.
4. Extract user ID, look up user, get `companyId`.
5. Only authenticated clients with a valid `companyId` are added to the client set.
6. Broadcast messages are filtered by `companyId` -- clients only receive messages for their own company.
7. Unauthenticated clients are closed with code 1008.

### 8.4 Role-Based Access Control

RBAC is implemented across 4 tables and 2 code modules:

- **26 permissions** across 8 categories (Forecasting, Procurement, Materials, Production, Allocations, Financials, Administration, Data).
- **5 default roles**: Admin (all permissions), Executive (view-only), Procurement Manager, Production Planner, Analyst.
- Roles are scoped to `companyId` with a unique constraint on `(companyId, name)`.
- The `requirePermission()` middleware checks user permissions before allowing access.
- `requireAnyPermission()` (OR logic) and `requireAllPermissions()` (AND logic) variants exist.
- RBAC is applied selectively -- some endpoints use `requirePermission('manage_users')`, but many endpoints rely only on the global `isAuthenticated` + `attachRbacUser` middleware without per-endpoint permission checks.

### 8.5 Rate Limiting

Rate limiting uses an **in-memory** token bucket per user (or per IP for unauthenticated requests):

| Tier | Limit | Window |
|------|-------|--------|
| Global (dev) | 5,000 req | 1 minute |
| Global (prod) | 1,000 req | 1 minute |
| Auth endpoints | 30 req | 1 minute |
| API endpoints | 300 req | 1 minute |
| Read-only endpoints | 300 req | 1 minute |
| Sensitive operations | 3 req | 1 minute |

Rate limit keys include `userId` and `companyId` to prevent one tenant's abuse from affecting others. Rate limit state is in-memory and cleaned up every 60 seconds.

### 8.6 Security Headers

Applied via `securityHeadersMiddleware`:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; ...`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (production only)
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`

### 8.7 Input Validation

Primary defense is **Zod schema validation** via `drizzle-zod`. The input sanitization and SQL injection prevention middlewares are intentionally disabled (passthrough) -- Drizzle ORM's parameterized queries provide SQL injection protection, and Zod handles type/format validation.

---

## 9. Deployment Architecture

### 9.1 Hosting

Production is hosted on **Replit**. The application runs as a single process on Replit's managed infrastructure. Replit handles TLS termination, domain routing, and process management.

### 9.2 Horizontal Scalability

The application is **not horizontally scalable** in its current form:
- In-memory state (rate limit stores, security events, agentic AI state, company ID cache, processed webhook event IDs) is per-process and cannot be shared across instances.
- Background jobs use `setInterval` with no distributed locking. Running multiple instances would result in duplicate job execution.
- WebSocket connections are maintained in a per-process `Set`. There is no Redis pub/sub or similar mechanism for cross-instance broadcast.

### 9.3 Database Connection Pooling

The `@neondatabase/serverless` driver uses a single `Pool` instance with default connection pool settings. There is no explicit `max`, `min`, or `idleTimeoutMillis` configuration. Neon serverless handles connection management on the server side.

### 9.4 Environment Separation

There is **no staging environment**. The development and production builds share the same database and use the same API keys. Environment-specific behavior is controlled by `NODE_ENV`:
- Development: Vite HMR, permissive rate limits, non-secure cookies.
- Production: Static serving, strict rate limits, HSTS, secure cookies.

### 9.5 Zero-Downtime Deployment

Replit handles deployments. When a new version is deployed, the existing process is terminated (SIGTERM) and a new one starts. The application registers SIGTERM/SIGINT handlers that call `stopBackgroundJobs()` to clear intervals before exiting. There is a brief downtime window between process shutdown and new process startup. WebSocket clients will disconnect and need to reconnect.

---

## 10. Data Integrity and Recovery

### 10.1 In-Memory State at Risk

The following data exists **only in process memory** and is lost on crash or restart:

| Data | Location | Impact of Loss |
|------|----------|----------------|
| Rate limit counters | `RateLimiter.store` | Temporary over-permissive access until counters rebuild |
| Security event log | `SecurityMonitor.events` (max 1,000) | Loss of recent security event history |
| Webhook dedup set | `processedEventIds` (max 10,000) | Possible duplicate webhook processing |
| Agentic AI state | `companyAgents`, `companyRules`, `companyGuardrails`, `companyPendingActions`, `companyActionHistory` Maps | Loss of pending actions, guardrail violation counts, daily spending totals, action history. Agent and rule definitions survive (in DB). |
| Company ID cache | `companyIds` array in backgroundJobs.ts | Re-fetched from database on next background job cycle |
| Previous regime cache | `previousRegimes` Map | Re-derived from database `regimeState` table |
| Cache | `globalCache` | Re-populated from external APIs on next poll cycle |
| WebSocket clients | `clients` Set | Clients reconnect automatically |

### 10.2 Persistent Data

All core business data (companies, users, SKUs, materials, suppliers, economic snapshots, regime state, regime transitions, forecasts, allocations, RFQs, purchase orders, audit logs, compliance records, production metrics) is stored in Neon PostgreSQL and survives restarts.

### 10.3 Backup and Recovery

Neon Serverless PostgreSQL provides:
- **Point-in-time recovery (PITR)**: Can restore to any second within the retention period.
- **Automatic backups**: Managed by Neon.
- **Branching**: Database branching for schema changes.

The application does not implement its own backup mechanism. Replit provides checkpoint-based rollback for code and database state.

### 10.4 Data Corruption Prevention

- Drizzle ORM uses parameterized queries, preventing SQL injection.
- Foreign key constraints with cascade deletes prevent orphaned records.
- Schema validation via Zod prevents malformed data from reaching the database.
- The regime classification functions guard against NaN, negative, and infinite FDR values, defaulting to safe behavior (`HEALTHY_EXPANSION`).

### 10.5 Crash Recovery Behavior

On crash/restart:
1. Background jobs restart with initial runs after 5-second delay.
2. Economic data re-fetches from FRED API and recalculates FDR.
3. Regime state is loaded from `regimeState` table (persisted).
4. Stripe sync runs `syncBackfill()` to reconcile subscription state.
5. WebSocket clients reconnect and re-authenticate.
6. Agentic AI state reinitializes to empty Maps; default guardrails regenerate on first access.
7. Rate limit counters start at zero.

---

## 11. Codebase Statistics

| Metric | Value |
|--------|-------|
| Total backend + shared code | ~73,000 lines |
| Total frontend pages | 66 React pages (~44,000 lines) |
| Total codebase (measured files) | ~118,000 lines |
| Database tables | 191 |
| API endpoints | 653 |
| Foreign key references | 366 |
| Database indexes | 350 |
| Cascade delete rules | 237 |
| CompanyId columns | 268 |
| Integration modules | 100+ files in `server/lib/` |
| Background jobs | 12 scheduled tasks |
| RBAC permissions | 26 |
| Default roles | 5 |

---

*This report describes the system as implemented at the time of review. No recommendations or aspirational statements are included.*
