# CMMC 2.0 Level 2 — Alignment

CMMC Level 2 requires implementation of the 110 NIST SP 800-171 Rev. 2
requirements plus 20 CMMC-specific practices. This document summarizes
Prescient Labs' position against Level 2 and flags the remediation needed
before formal assessment.

**Basis:** see [`NIST-800-171-mapping.md`](./NIST-800-171-mapping.md) for the
underlying 110-control status.

## Level 2 readiness summary

| Domain | Level 2 posture |
|---|---|
| Access Control (AC) | **Substantially compliant.** RBAC, least privilege, session management, remote-access controls all implemented. Gap: CUI-specific flow tagging. |
| Audit & Accountability (AU) | **Fully compliant.** Immutable audit log, user accountability, indexed review, protected retention. |
| Configuration Management (CM) | **Compliant.** Git-backed baseline, least functionality, no non-essential production services. |
| Identification & Authentication (IA) | **Substantially compliant.** JWT + bcrypt + session cookies + rate limiting. Gap: MFA enforcement for privileged roles (scaffolded, rollout pending). |
| Incident Response (IR) | **Partial.** Vulnerability reporting channel and 48h SLA; formal IR playbook + tabletop exercises on roadmap. |
| Maintenance (MA) | **Inherited.** Cloud SaaS — physical maintenance handled by Replit / cloud infra (SOC 2 Type II). |
| Media Protection (MP) | **Inherited.** Same as MA. |
| Personnel Security (PS) | **Partial.** Standard employment; formal background + training attestation pre-FCL. |
| Physical Protection (PE) | **Inherited.** Cloud provider. |
| Risk Assessment (RA) | **Substantially compliant.** Documented threat model; quarterly review cadence. |
| Security Assessment (CA) | **Partial.** Self-assessment complete; third-party pentest and POA&M in progress. |
| System & Communications Protection (SC) | **Substantially compliant.** TLS everywhere, helmet, deny-by-default, HMAC-signed provenance exports. Gap: FIPS-validated crypto mode. |
| System & Information Integrity (SI) | **Compliant.** Input validation, dependency scanning, anomaly detection. |

## CMMC Level 2 practices mapped to product capabilities

| Practice | Evidence |
|---|---|
| AC.L2-3.1.1 Limit access | `isAuthenticated` middleware (server/middleware). |
| AC.L2-3.1.2 Permitted transactions | RBAC enforcement at route layer. |
| AU.L2-3.3.1 Audit records | `audit_logs` table with 4 indexes. |
| AU.L2-3.3.2 User accountability | Every audit row carries user_id + IP + UA. |
| AU.L2-3.3.5 Correlation | Indexes on `(entity_type, entity_id)` + `(user_id)`. |
| AU.L2-3.3.6 Report generation | `/api/audit/export/download` CSV; `/api/traceability/*` signed reports. |
| AU.L2-3.3.8 Audit protection | Admin-only routes + append-only policy. |
| CM.L2-3.4.6 Least functionality | `x-powered-by` disabled; dev-only plugins gated. |
| IA.L2-3.5.2 Authenticate users | bcrypt + JWT + session signing. |
| IA.L2-3.5.3 MFA for privileged | TOTP UI scaffolded (gap). |
| IA.L2-3.5.7 Password complexity | 8+ chars, uppercase, number, special. |
| IA.L2-3.5.10 Cryptographic protection | bcrypt at rest + TLS in transit. |
| SC.L2-3.13.1 Monitor comms at boundaries | Single edge ingress; helmet. |
| SC.L2-3.13.5 Deny by default | `isAuthenticated` default posture. |
| SC.L2-3.13.8 Cryptographic disclosure protection | TLS 1.2+; HMAC-SHA256 on traceability. |
| SC.L2-3.13.11 FIPS-validated crypto | Planned — OpenSSL FIPS on DoD pilot. |
| SI.L2-3.14.1 Flaw remediation | security@ channel; 48h acknowledgment. |
| SI.L2-3.14.2 Malicious code protection | Input validation; helmet; no `dangerouslySetInnerHTML` with user input. |
| SI.L2-3.14.6 Security monitoring | Anomaly-detection broadcasts. |
| SI.L2-3.14.7 Unauthorized-use detection | Rate limiting + audit-log review. |

## What a CMMC L2 assessor would find strongest

1. **Audit immutability and indexability.** Every row carries sufficient
   identity + timestamping + change payload for forensic reconstruction; query
   performance is validated for 100k+ rows per tenant.
2. **Tamper-evident provenance.** The HMAC-SHA256-signed traceability report
   is unusually strong for a small-business SaaS; it directly answers
   industrial-base supply-chain scrutiny.
3. **Clean dependency posture.** 0 critical / 0 high CVEs in production
   bundles after the 2026-04-14 audit pass.
4. **Deny-by-default architecture.** Public endpoints are enumerated and
   justified; every other route demands authentication.

## What requires remediation before filing for L2 certification

1. MFA enforcement on privileged accounts (gap).
2. Formal third-party pentest + sanitized report (in progress).
3. IR playbook + annual tabletop (gap).
4. FIPS-validated crypto mode for DoD tenants (gap).
5. CUI flow labeling + export controls (gap, triggered by first DoD pilot).

## Sponsoring documents

- `SECURITY.md` (root, detailed technical controls).
- `docs/security/NIST-800-171-mapping.md` (full control table).
- `docs/technical/traceability.md` (chain-of-custody implementation).
