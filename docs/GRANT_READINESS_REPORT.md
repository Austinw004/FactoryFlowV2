# Grant Readiness Report — Prescient Labs

**Date:** 2026-04-14
**Author:** Austin Wendler, CEO
**Purpose:** Internal assessment of how well FactoryFlowV2 (public product:
prescient-labs.com) is positioned against specific federal funding programs,
with gap remediation plans and target application dates.

---

## Executive summary

| Program | Readiness | Target application |
|---|---|---|
| **NSF SBIR Phase I** | ✅ **Ready to file.** Scientific novelty, documented methodology, working product, reproducibility story all in place. | Q3 2026 |
| **DoD ManTech SBIR** | 🟨 **Mostly ready.** CMMC L2 alignment 72% complete; MFA rollout and third-party pentest required before filing. | Q4 2026 |
| **NIST MEP partnership** | ✅ **Ready to engage.** MEP centers can onboard today; Impact Dashboard gives them reportable outcomes. | Q2–Q3 2026 |
| **MxD membership** | ✅ **Ready to apply.** Real-time architecture, traceability, and training module align with MxD's four pillars. | Q3 2026 |
| **DoL Workforce grants** | 🟨 **Ready with minor additions.** Training module live; certification reporting API needs completion. | Q4 2026 |

---

## 1. NSF SBIR Phase I — Readiness ✅

**Program focus:** Technology innovation with commercialization potential.

**What we have:**

- Documented novelty in the FDR regime model, regime-conditioned
  demand-forecasting ensemble, and regime-adjusted newsvendor (see
  [`docs/technical/`](./technical/)).
- Validation harness (`server/tests/live-validation-harness.ts`) with
  publishable accuracy targets.
- Working commercial product with paying design-partner prospects.
- Academic-quality documentation (methodology + citations) in the repo.
- Full reproducibility — anyone with the repo and npm can rebuild.

**What reviewers will probe:**

- Is the innovation defensible versus prior art? → Every methodology doc
  cites the nearest published technique and states what we add.
- Is there a viable commercialization path? → Paying pilots, tiered pricing,
  clear unit economics.

**Gap before filing:** None material. Accuracy validation results need a
final clean artifact run prior to submission. Estimated 2 days.

## 2. DoD ManTech SBIR — Readiness 🟨

**Program focus:** Defense industrial base modernization + CUI-compliant
platforms.

**What we have:**

- Chain-of-custody / traceability exporter with HMAC-SHA256 signatures.
- CMMC L2 control mapping (`docs/security/CMMC-L2-alignment.md`) with
  59 / 82 applicable controls fully implemented, 19 partial, 4 planned.
- Immutable audit log with provenance walk-back capability.
- Tenant isolation enforced at every query.
- TLS 1.2+, bcrypt, JWT, rate-limited auth, helmet security headers.

**Gaps to close before filing:**

1. **MFA enforcement on admin accounts** (control 3.5.3). TOTP UI is
   scaffolded; enforcement policy flag needed. ~1 sprint.
2. **Third-party penetration test** (control 3.12.1) + sanitized public
   report. Engage independent firm; typical 4–6 weeks.
3. **CUI-flow labeling** (control 3.1.3). Per-record CUI flag + export
   guardrails. Triggered by first DoD pilot engagement.
4. **Formal Incident Response playbook** + annual tabletop exercise.

**Path:** Close gaps 1 and 2 in Q2 2026, then file Q4 2026. Gap 3 can be
triggered in parallel with the pilot kickoff.

## 3. NIST MEP Partnership — Readiness ✅

**Program focus:** Extension to small-and-midsize manufacturers via
regional MEP centers.

**What we have:**

- Product designed for operators without analytics skill — every
  recommendation comes with a plain-English rationale.
- Impact Dashboard at `/impact` gives MEP centers a pre-built measurable
  outcomes story for each client engagement.
- Training & Certification module at `/training` supports MEP's
  workforce-education mandate.
- Reproducible methodology documentation that MEP center engineers can
  review and explain to their clients.

**Gap before engagement:** None material. We can begin outreach to MEP
centers today.

## 4. MxD (Manufacturing x Digital) Membership — Readiness ✅

**Program focus:** Digital manufacturing with emphasis on real-time
operations, cybersecurity, workforce, and interoperability.

**MxD's four pillars mapped to our platform:**

- **Real-time operations:** WebSocket + heartbeat + 18-entity query
  invalidation. Live updates on inventory, work orders, alerts.
- **Cybersecurity:** CMMC L2 alignment, NIST 800-171 control mapping,
  tamper-evident traceability.
- **Workforce:** Training & Certification module, accessibility-audited
  interface.
- **Interoperability:** OpenAPI 3.0 spec, inbound/outbound webhooks,
  roadmap includes ISA-95 / B2MML.

**Gap before filing:** Draft ISA-95 mapping for the top-10 product entities.
~1 sprint.

## 5. DoL Workforce Grants — Readiness 🟨

**Program focus:** Upskilling frontline workers; measurable proficiency
gains; badges and certifications.

**What we have:**

- Six-module certification track at `/training` with prerequisite gating.
- Per-user progress persistence.
- Badge issuance surface (localStorage-backed; server-side ledger planned).

**Gap to close:**

- Server-side training ledger + reporting API so employers can export
  certification data for grant reporting. ~1 sprint.

---

## Cross-program strengths

Regardless of which program evaluates us first, the following are
consistently strongest in the codebase:

1. **Audit immutability + traceability.** The `audit_logs` schema + signed
   provenance exporter is unusually mature for a platform our size. It
   directly satisfies AU controls in NIST 800-171, gives DoD the
   industrial-base visibility they fund, and gives NSF defensible IP.
2. **Regime-conditioned operations as a coherent technical thesis.** Every
   intelligent feature routes through the FDR regime model — this is a
   single, audit-friendly architectural pattern that makes our methodology
   documents tractable to review.
3. **Clean dependency posture.** Zero critical / zero high CVEs in
   production; quick remediation of identified issues; public
   acknowledgment channel at security@prescient-labs.com.
4. **Honest measurement.** Impact Dashboard confidence tiers
   (strong/directional/baseline) avoid overclaiming — reviewers will notice
   that we decline to report numbers we cannot yet measure.
5. **Reproducibility.** Every algorithm, every benchmark, every audit
   finding ships with a reproduction command. The repository is
   self-contained for external review.

---

## Commitments

Upon engaging any of the above programs, Prescient Labs commits to:

- Publishing a sanitized post-remediation security report.
- Making the methodology documents available for peer review.
- Providing reproducibility artifacts (seed data, benchmark outputs) to
  reviewers on request.
- Maintaining a public changelog of any material security, performance, or
  methodology change.

---

## Appendix — Document index

| Document | Purpose |
|---|---|
| [`docs/GRANT_README.md`](./GRANT_README.md) | 15-minute primer for reviewers. |
| [`docs/technical/README.md`](./technical/README.md) | Methodology index. |
| [`docs/technical/fdr-regime-model.md`](./technical/fdr-regime-model.md) | FDR regime classifier. |
| [`docs/technical/demand-forecasting.md`](./technical/demand-forecasting.md) | Demand forecasting ensemble. |
| [`docs/technical/anomaly-detection.md`](./technical/anomaly-detection.md) | Robust z-score method. |
| [`docs/technical/quick-wins-recommender.md`](./technical/quick-wins-recommender.md) | Expected-value procurement ranking. |
| [`docs/technical/materials-at-risk.md`](./technical/materials-at-risk.md) | Composite risk score. |
| [`docs/technical/auto-purchase-recommender.md`](./technical/auto-purchase-recommender.md) | Regime-adjusted newsvendor. |
| [`docs/technical/predictive-maintenance.md`](./technical/predictive-maintenance.md) | Sensor drift + RUL. |
| [`docs/technical/traceability.md`](./technical/traceability.md) | Chain-of-custody scheme. |
| [`docs/security/NIST-800-171-mapping.md`](./security/NIST-800-171-mapping.md) | Control-by-control mapping. |
| [`docs/security/CMMC-L2-alignment.md`](./security/CMMC-L2-alignment.md) | CMMC Level 2 alignment. |
| [`docs/benchmarks.md`](./benchmarks.md) | Performance evidence. |
| [`docs/accessibility-audit.md`](./accessibility-audit.md) | WCAG 2.1 AA audit. |
| [`docs/api-spec.yaml`](./api-spec.yaml) | OpenAPI 3.0 core spec. |
| [`SECURITY.md`](../SECURITY.md) | Full security documentation. |
