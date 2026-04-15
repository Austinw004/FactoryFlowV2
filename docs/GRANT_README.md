# Prescient Labs — Grant Reviewer Primer

**Reading time: 15 minutes.** Everything a federal grant reviewer (NSF SBIR,
DoD ManTech, NIST MEP, MxD, DoL) needs to evaluate our platform against their
program criteria. Hyperlinks throughout point to the canonical code, schema,
or longer companion document.

**Company:** Prescient Labs · **Platform:** [prescient-labs.com](https://prescient-labs.com) · **Founder:** Austin Wendler · **Contact:** austinwendler44@gmail.com

---

## 1. The platform in one paragraph

Prescient Labs is a vertically-integrated manufacturing intelligence platform
for small-to-midsize industrial operators. It unifies demand forecasting,
supply-chain risk, commodity price dynamics, and production telemetry into
one operational system. Its defining innovation is **regime-conditioned
operations** — every recommendation (what to buy, when to lock a contract,
how much to produce) is adjusted by a Financial–Real Decoupling (FDR) macro
regime classifier we developed in-house. Operators do not need to learn
econometrics; the product translates macro regime into concrete procurement
playbooks at the SKU and material level.

## 2. What is in the repository

- **235 PostgreSQL tables** (`shared/schema.ts`) covering materials, SKUs,
  suppliers, machinery, work orders, quality records, purchase orders,
  financials, audit logs, automation rules, and 200+ more.
- **728 HTTP API endpoints** (`server/routes.ts`) for tenant-scoped
  operations.
- **74 React pages** including Dashboard, Allocation, Forecasts, Automations,
  Audit Trail, Traceability, Training, and the new **Impact Dashboard**.
- **WebSocket real-time layer** (`server/websocket.ts`, `client/src/hooks/useWebSocket.ts`)
  with heartbeat, automatic reconnection with jitter, and 18-entity query
  invalidation.
- **Signed chain-of-custody exporter** (`server/lib/traceabilityExporter.ts`)
  producing HMAC-SHA256-signed provenance reports — novel for a platform our
  size and directly relevant to DoD industrial-base visibility.

## 3. Scientific rigor and IP claims

See [`docs/technical/`](./technical/) for the full set. Each document
follows the same structure: Intent / Inputs / Algorithm / Outputs / Validation / Novelty / References.

| Feature | Method family | Novelty |
|---|---|---|
| FDR Regime Model | Dual-circuit macro classifier | Asset-vs-real ratio framing with operational bindings (regime → procurement playbook). |
| Demand Forecasting | Holt–Winters + regime-naive + commodity-linked regression ensemble | Regime-conditioned ensemble weight so smoothing doesn't lag at regime transitions. |
| Anomaly Detection | Rolling robust z-score (MAD-based) | Deliberately auditable — any operator can recompute the score by hand from the last 30 observations. |
| Quick-Wins Recommender | Expected-value ranking under regime-conditioned price elasticity | Regime-specific fire probabilities drawn from empirical history, not vendor constants. |
| Materials at Risk | Volatility × supplier concentration × coverage-gap composite | Matches the way procurement leaders triage rather than single-metric sort. |
| Auto-Purchase Recommender | Regime-adjusted newsvendor + EOQ | `c_o` adjustment by macro regime — a contribution on top of the textbook model. |
| Predictive Maintenance | Sensor drift + pooled RUL regression | Pools across same-model machines so RUL is usable from the second machine onward. |

## 4. Supply-chain traceability (DoD-relevant)

Every state change in the platform is captured in `audit_logs` with
before/after diffs, user identity, IP, and user-agent. The traceability
exporter (`server/lib/traceabilityExporter.ts`) walks backward from a
finished good, work order, material lot, or quality record to produce a
**signed, tamper-evident chain-of-custody report** — canonicalized per RFC
8785, keyed with `TRACEABILITY_SIGNING_SECRET`, verifiable by any external
party using the companion endpoint `POST /api/traceability/verify`.

See [`docs/technical/traceability.md`](./technical/traceability.md).

## 5. Cybersecurity posture (CMMC Level 2 alignment)

Full control-by-control mapping in
[`docs/security/NIST-800-171-mapping.md`](./security/NIST-800-171-mapping.md)
and [`docs/security/CMMC-L2-alignment.md`](./security/CMMC-L2-alignment.md).

- 110 NIST 800-171 Rev. 2 controls evaluated; 59 fully implemented, 19
  partial, 4 planned, 28 inherited (cloud provider).
- `helmet` security headers, TLS 1.2+ only, bcrypt password hashing, JWT +
  session cookies, rate limiting on all auth endpoints, RBAC with admin-only
  audit access.
- `npm audit` as of 2026-04-14: **0 critical, 0 high** in production
  dependencies. 5 moderate in dev-only tooling.
- HMAC-SHA256-signed provenance exports for tamper-evident records.

## 6. Performance evidence

Full numbers in [`docs/benchmarks.md`](./benchmarks.md).

- Initial JS payload: **~149 kB gzip**.
- API p95 under 250 ms on all dashboard-critical endpoints at production
  tenant sizes.
- Lighthouse public pages: all ≥ 90.
- Load behavior verified with `server/scripts/seed-load-test.ts` at 100k
  audit_logs, 10k materials, 5k purchase orders per tenant.

## 7. Accessibility (Section 508 / WCAG 2.1 AA)

[`docs/accessibility-audit.md`](./accessibility-audit.md) documents a
92/100 audit score with a published remediation list that would raise the
score to 98 before any federal filing.

## 8. Interoperability and data portability

- OpenAPI 3.0 spec at [`docs/api-spec.yaml`](./api-spec.yaml) covering the
  core public API surface.
- Every entity type has a JSON export endpoint and a CSV export at
  `/api/audit/export/download` for audit logs.
- Outbound webhooks + inbound webhooks with HMAC signing.
- ISA-95 / B2MML mapping on roadmap for DoD / MxD engagements.

## 9. Impact measurement

Customer-facing Impact Dashboard at `/impact` quantifies:

- Operator hours saved (weekly).
- Defect rate shift (ppm).
- Inventory turn improvement.
- On-time delivery improvement.
- Energy cost per unit.

Each metric is labeled `strong`, `directional`, or `baseline` based on
confidence so reviewers see an honest picture instead of a dashboard full of
fabricated hockey sticks.

## 10. Workforce development

`/training` hosts a six-module certification track (Orientation,
Procurement, Inventory & Traceability, Production, Strategy, Security) with
prerequisite gating, progress tracking, and badge issuance. Directly aligned
with DoL Workforce Innovation Fund expectations and with the "skill
development" criteria NSF and MxD use to score a platform's adoption story.

## 11. What each grant program will find strongest

- **NSF SBIR Phase I:** The FDR regime model (novel), the regime-conditioned
  newsvendor (novel), and the signed traceability exporter (novel combination
  of RFC 8785 + HMAC at our platform's price point).
- **DoD ManTech SBIR:** Chain-of-custody reports, CMMC L2 alignment
  documentation, and the audit-log immutability that maps to AU control
  family.
- **NIST MEP:** Compatibility with MEP's lean-manufacturing focus, plus a
  turnkey Impact Dashboard that gives MEP centers a measurable outcomes
  story.
- **MxD (Manufacturing x Digital):** Full real-time layer, per-company tenant
  isolation, WebSocket-powered digital-twin view, and the Training module
  that supports MxD's workforce angle.
- **DoL / workforce grants:** The Training & Certification module with
  progress tracking and badge issuance directly demonstrates workforce
  upskilling.

## 12. Where to look next

- [`docs/GRANT_READINESS_REPORT.md`](./GRANT_READINESS_REPORT.md) —
  categorical readiness grades by program.
- [`docs/technical/README.md`](./technical/README.md) — index of all
  methodology documents.
- [`docs/benchmarks.md`](./benchmarks.md) — performance numbers with
  reproduction commands.
- [`SECURITY.md`](../SECURITY.md) — full security documentation.
- [`docs/api-spec.yaml`](./api-spec.yaml) — OpenAPI 3.0.

## 13. Reproducibility

```bash
git clone https://github.com/Austinw004/FactoryFlowV2.git
cd FactoryFlowV2
npm install
npm run build     # produces dist/public + dist/index.js
npm test          # (planned, CI-gated)
```

Every algorithm document includes a command to re-run the validation
harness. Every benchmark includes a reproduction command. Every cited
measurement is committed as a file in `artifacts/`.

---

Thank you for reviewing. We welcome technical scrutiny and will respond
within 48 hours to any questions at austinwendler44@gmail.com.
