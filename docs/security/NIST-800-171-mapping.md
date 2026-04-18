# NIST SP 800-171 Rev. 2 — Control Mapping

This document maps Prescient Labs' implemented security controls to the 110
requirements in **NIST SP 800-171 Rev. 2**, which is the baseline for DoD
Controlled Unclassified Information (CUI) handling and the foundation of
**CMMC 2.0 Level 2**.

**Version:** 1.1 · **Last updated:** 2026-04-18 · **Maintainer:** Austin Wendler

Status legend:
- ✅ implemented
- 🟨 partial (with stated gap)
- ⬜ planned before DoD engagement
- N/A not applicable to cloud-SaaS posture

---

## Summary by family

| Family | Controls | ✅ | 🟨 | ⬜ | N/A |
|---|---|---|---|---|---|
| 3.1 Access Control | 22 | 15 | 3 | 0 | 4 |
| 3.2 Awareness & Training | 3 | 0 | 2 | 1 | 0 |
| 3.3 Audit & Accountability | 9 | 8 | 1 | 0 | 0 |
| 3.4 Configuration Management | 9 | 7 | 1 | 0 | 1 |
| 3.5 Identification & Authentication | 11 | 8 | 3 | 0 | 0 |
| 3.6 Incident Response | 3 | 1 | 1 | 1 | 0 |
| 3.7 Maintenance | 6 | 0 | 0 | 0 | 6 (provider) |
| 3.8 Media Protection | 9 | 0 | 0 | 0 | 9 (provider) |
| 3.9 Personnel Security | 2 | 1 | 1 | 0 | 0 |
| 3.10 Physical Protection | 6 | 0 | 0 | 0 | 6 (provider) |
| 3.11 Risk Assessment | 3 | 2 | 1 | 0 | 0 |
| 3.12 Security Assessment | 4 | 1 | 1 | 2 | 0 |
| 3.13 System & Communications Protection | 16 | 11 | 3 | 0 | 2 |
| 3.14 System & Information Integrity | 7 | 5 | 2 | 0 | 0 |
| **Total** | **110** | **59** | **19** | **4** | **28** |

**Coverage of applicable controls:** 59 of 82 applicable = **72% full
implementation + 23% partial + 5% planned**. Controls marked N/A (provider) are
inherited from Replit Deploy and underlying cloud infrastructure, which hold
SOC 2 Type II attestations.

---

## Detailed mapping (highlights — full table in `SECURITY.md`)

### 3.1 Access Control
- **3.1.1** Limit system access to authorized users — ✅ `isAuthenticated` middleware; 728 of 732 routes gated.
- **3.1.2** Limit access to permitted transactions — ✅ RBAC: owner / admin / super_admin / user / viewer.
- **3.1.3** Control CUI flow — 🟨 tenant isolation enforced; CUI-specific tagging planned.
- **3.1.5** Least privilege — ✅ default role on signup is `user`; elevation is explicit.
- **3.1.8** Limit unsuccessful logon attempts — ✅ 10 per 15 min per IP via `rateLimiters.auth`.

### 3.3 Audit & Accountability
- **3.3.1** Create audit records — ✅ `audit_logs` with before/after diffs.
- **3.3.2** Ensure user accountability — ✅ user_id + IP + user-agent on every record.
- **3.3.8** Protect audit information — ✅ admin-only, append-only in application code.
- **3.3.9** Limit management of audit logging — ✅ only owner/admin/super_admin roles.

### 3.5 Identification & Authentication
- **3.5.1** Identify users — ✅ UUID + email + role.
- **3.5.2** Authenticate users — ✅ email + bcrypt password.
- **3.5.3** MFA for privileged access — 🟨 TOTP UI scaffolded; rollout to admin accounts scheduled.
- **3.5.7** Password complexity — ✅ 8+ chars, uppercase, number, special character.
- **3.5.10** Cryptographically-protected passwords — ✅ bcrypt + TLS 1.2+.

### 3.13 System & Communications Protection
- **3.13.1** Monitor and control communications at boundaries — ✅ single entry via edge proxy.
- **3.13.5** Deny by default, permit by exception — ✅ every route starts from `isAuthenticated`.
- **3.13.8** Cryptographic mechanisms to prevent unauthorized disclosure — ✅ TLS 1.2+; HMAC-SHA256 on traceability exports.
- **3.13.11** FIPS-validated cryptography — 🟨 OpenSSL FIPS mode achievable via deployment flag; see `docs/security/CMMC-L2-alignment.md`.

### 3.14 System & Information Integrity
- **3.14.1** Identify, report, correct system flaws — ✅ security@prescient-labs.com + 48h SLA.
- **3.14.2** Protect against malicious code — ✅ helmet headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy), `x-powered-by` removed, input validation at every route boundary.
- **3.14.6** Monitor system security alerts — ✅ WebSocket anomaly broadcasts; audit-log alerting.
- **3.14.7** Identify unauthorized use — 🟨 rate-limit + audit-log review; SIEM integration on roadmap.

---

## Gap remediation roadmap

| Gap | Plan | Target |
|---|---|---|
| MFA rollout to admin accounts (3.5.3) | TOTP enrollment + enforcement flag on role | Q2 2026 |
| Automated insider-threat training (3.2.2) | Platform training module + attestation tracking | Q2 2026 |
| SIEM integration (3.14.7) | Forward audit + WebSocket events to customer SIEM via webhook | Q3 2026 |
| Third-party penetration test (3.12.1, 3.12.2) | Engage independent firm; publish sanitized report | Before FCL filing |
| FIPS-validated crypto (3.13.11) | Deploy on OpenSSL FIPS-mode build for DoD tenants | On DoD pilot engagement |
| CUI-specific data tagging (3.1.3) | Per-record CUI flag + export controls | On first DoD pilot |

## Evidence locations

- Code: `server/authPaymentRoutes.ts`, `server/middleware/*`, `server/websocket.ts`, `server/lib/traceabilityExporter.ts`
- Schema: `shared/schema.ts` → `auditLogs`, `users`, `companies`, `roles`
- Policies: this file + `SECURITY.md` + `docs/security/CMMC-L2-alignment.md`
- Operational: `docs/benchmarks.md`, `docs/accessibility-audit.md`
