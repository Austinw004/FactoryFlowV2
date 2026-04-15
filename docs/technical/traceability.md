# Traceability & Chain of Custody

## Intent

Provide defense-industrial-base-grade visibility into the history of every
finished good, work order, material lot, and quality record — from raw
material receipt through finished goods — as a signed, tamper-evident
document.

Target review programs: DoD ManTech, DLA CDL, NIST MEP.

## Schema foundation

Every state change in the platform is captured in the immutable `audit_logs`
table (see [`shared/schema.ts:973`](../../shared/schema.ts)):

```
audit_logs {
  id          uuid primary key
  company_id  references companies
  user_id     references users (on delete set null)
  action      text                -- create | update | delete | login | …
  entity_type text                -- sku | material | supplier | work_order | …
  entity_id   varchar             -- ID of the affected entity
  changes     jsonb               -- before/after values
  ip_address  text
  user_agent  text
  timestamp   timestamp (default now)
}
```

Indexes on `(company_id)`, `(user_id)`, `(entity_type, entity_id)`, and
`(timestamp)` keep provenance queries fast at 100k+ logs per tenant.

## Exporter

`server/lib/traceabilityExporter.ts` exposes:

```ts
exportTraceabilityChain(companyId, { entity, entityId })
  → TraceabilityReport
```

The exporter walks backward from the requested entity through `audit_logs`,
following link fields in the `changes` payload (`materialLotId`,
`workOrderId`, `qualityRecordId`) to build a directed acyclic provenance
tree. Cycle detection is enforced.

## Signature scheme

The exporter emits a `TraceabilityReport` containing:

- `reportId` — UUID v4.
- `issuedAt` — ISO-8601 timestamp.
- `companyId`, `requested` — who asked, for what.
- `chain` — the provenance DAG.
- `canonicalHash` — SHA-256 over the RFC 8785 canonical JSON of the envelope
  (content integrity check anyone can recompute).
- `signature` — HMAC-SHA256 over the canonical JSON, keyed with
  `TRACEABILITY_SIGNING_SECRET` (tamper-evidence requiring the secret to
  forge).
- `signatureAlgorithm` — always `"HMAC-SHA256"`.

## API surface

```
GET  /api/traceability/{entity}/{entityId}     (isAuthenticated, company-scoped)
POST /api/traceability/verify                   (isAuthenticated, verifies a report)
```

Allowed entity types: `finished_good`, `work_order`, `material_lot`,
`quality_record`. All requests are tenant-isolated — a company can only
request provenance for its own records.

## Verification

Any external party (a federal reviewer, a customer's auditor, a prime
contractor) can verify a report by:

1. Canonicalizing the report's `{reportId, issuedAt, companyId, requested, chain}`
   using RFC 8785.
2. Computing HMAC-SHA256 over the canonical string with the shared signing
   secret.
3. Confirming the result matches `report.signature`.

`verifyTraceabilityReport()` is exposed for server-side verification and
`POST /api/traceability/verify` is available for webhook-style verification
from external systems.

## CMMC / NIST 800-171 alignment

This capability directly implements controls `AU.L2-3.3.1` (create audit
records), `AU.L2-3.3.2` (ensure user accountability), and supports `SC.L2-3.13.11`
(FIPS-validated cryptography when paired with an FIPS-mode HMAC
implementation — see SECURITY.md for HSM wiring).
