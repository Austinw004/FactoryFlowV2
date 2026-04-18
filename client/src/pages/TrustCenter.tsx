import { useLocation } from "wouter";
import { SEOHead } from "@/components/SEOHead";

/**
 * /trust — enterprise-grade Trust Center.
 *
 * This page is the one we point procurement, infosec, and CISOs at. It is
 * intentionally separate from the /security FAQ: /security answers
 * *questions*, /trust *documents the program*. Two different audiences.
 *
 * The content is written so we can say everything here in a live SOC 2
 * audit without having to walk anything back. If we can't ship it, we
 * don't claim it.
 */

const SUBPROCESSORS = [
  {
    name: "Amazon Web Services",
    purpose: "Primary cloud hosting, managed Postgres, S3 object storage, KMS.",
    dataCategories: "Production data, encrypted backups, application logs.",
    region: "us-east-1 (primary), us-west-2 (DR standby)",
    compliance: "SOC 1/2/3, ISO 27001, PCI-DSS, HIPAA-eligible.",
  },
  {
    name: "Stripe",
    purpose: "Billing, invoicing, payment processing.",
    dataCategories: "Customer name, billing email, payment method metadata (no PANs ever touch our infrastructure).",
    region: "United States",
    compliance: "PCI-DSS Level 1, SOC 1/2, ISO 27001.",
  },
  {
    name: "OpenAI",
    purpose: "LLM inference for forecasting copilot and natural-language querying.",
    dataCategories: "Task-bounded prompts derived from customer data — never raw tabular datasets.",
    region: "United States",
    compliance: "SOC 2 Type II. Zero-retention Enterprise API terms — no training on customer data.",
  },
  {
    name: "Anthropic",
    purpose: "LLM inference for forecasting copilot (redundant provider).",
    dataCategories: "Task-bounded prompts derived from customer data.",
    region: "United States",
    compliance: "SOC 2 Type II. Zero-retention Enterprise API terms — no training on customer data.",
  },
  {
    name: "SendPulse",
    purpose: "Transactional email (team invites, alerts, password resets).",
    dataCategories: "Recipient name, email, email body content.",
    region: "EU (primary), US (fallback)",
    compliance: "GDPR-compliant, ISO 27001 (hosting provider).",
  },
  {
    name: "Sentry",
    purpose: "Application error telemetry.",
    dataCategories: "Error stack traces, request metadata — PII scrubbing enabled, no request bodies.",
    region: "United States",
    compliance: "SOC 2 Type II, ISO 27001, HIPAA BAA available.",
  },
];

const CERTIFICATIONS = [
  { name: "SOC 2 Type II", status: "In progress", detail: "Audit kickoff Q3 2026 with a Big Four firm. Trust Services Criteria (security, availability, confidentiality) scoped." },
  { name: "GDPR", status: "Compliant", detail: "DPA template available. Standard Contractual Clauses for EU transfers. DSR requests fulfilled within 30 days." },
  { name: "CCPA / CPRA", status: "Compliant", detail: "Do-not-sell honored by default (we don't sell data). Consumer rights request handling in place." },
  { name: "HIPAA BAA", status: "Available on request", detail: "For healthcare-adjacent deployments (device manufacturers, medical supply chains)." },
  { name: "ISO 27001", status: "Planned", detail: "Target 2027, post-SOC-2. ISMS already modelled on ISO 27001 Annex A controls." },
];

const SECURITY_CONTROLS = [
  { label: "Encryption in transit", value: "TLS 1.3 minimum. HSTS enabled. Certificates via ACM + auto-rotation." },
  { label: "Encryption at rest", value: "AES-256 on all managed Postgres volumes and S3 buckets. Keys in AWS KMS with automatic rotation." },
  { label: "Access control", value: "RBAC with least-privilege. Prescient Labs staff cannot read customer production data without time-bound, logged, customer-approved access." },
  { label: "Audit logging", value: "Every customer-facing mutation written to an immutable audit log with 18-month retention." },
  { label: "Authentication", value: "Email/password with bcrypt, SAML 2.0 + OIDC SSO for enterprise, optional MFA (TOTP), session fingerprinting." },
  { label: "Secrets management", value: "No secrets in source. Runtime secrets in AWS Secrets Manager with per-service IAM roles." },
  { label: "Vulnerability management", value: "Continuous dependency scanning (Dependabot, Snyk). Quarterly penetration tests. Critical CVEs patched within 24h." },
  { label: "Backup & DR", value: "Point-in-time recovery up to 35 days. Quarterly DR drills. RTO 4h, RPO 1h." },
  { label: "Incident response", value: "24h customer notification SLA. 72h preliminary RCA. 10 business day post-mortem for Sev 1/2." },
];

const DATA_RESIDENCY = [
  { region: "United States", availability: "Default. All shared-tenancy deployments.", standbyRegion: "us-west-2" },
  { region: "European Union (Frankfurt)", availability: "Available on the Tenant VPC plan.", standbyRegion: "eu-central-1 + eu-west-1" },
  { region: "Asia-Pacific (Sydney)", availability: "Available on request (Tenant VPC).", standbyRegion: "ap-southeast-2" },
];

export default function TrustCenter() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-ink text-bone font-sans">
      <SEOHead
        title="Trust Center — Prescient Labs"
        description="Prescient Labs Trust Center. Subprocessors, certifications, data residency, encryption, incident response, and how to request a DPA, SIG/CAIQ, or security whitepaper."
        canonicalUrl="https://prescient-labs.com/trust"
      />

      <div className="grain fixed inset-0 pointer-events-none z-0"></div>

      <header className="border-b hair relative z-10">
        <div className="max-w-7xl mx-auto px-10 h-16 flex items-center justify-between">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-3"
            data-testid="button-home"
          >
            <div className="w-2 h-2 bg-signal"></div>
            <span className="text-sm tracking-[0.18em] font-medium">PRESCIENT LABS</span>
          </button>
          <nav className="hidden md:flex items-center gap-10 text-sm text-soft">
            <a href="/security" className="hover:text-bone transition">Security FAQ</a>
            <a href="/status" className="hover:text-bone transition">Status</a>
            <a href="/pricing" className="hover:text-bone transition">Pricing</a>
            <a href="/contact" className="hover:text-bone transition">Contact</a>
          </nav>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-10 pt-20 pb-16 relative z-10">
        <div className="eyebrow mb-6">Trust Center</div>
        <h1 className="text-5xl md:text-6xl display leading-[0.95] mb-6" data-testid="heading-trust">
          Everything your infosec team asks for, in one place.
        </h1>
        <p className="text-soft text-lg leading-relaxed max-w-3xl mb-12">
          We built this page so vendor due-diligence doesn't have to be a three-week email thread. If something you need isn't here, email{" "}
          <a href="mailto:security@prescient-labs.com" className="text-bone hover:text-signal transition">security@prescient-labs.com</a>
          {" "}and we'll respond within one US business day.
        </p>

        {/* Quick request CTAs — these are what procurement actually wants */}
        <div className="grid md:grid-cols-3 gap-px bg-line mb-20" data-testid="cta-request-strip">
          <div className="bg-panel p-8">
            <div className="eyebrow mb-3">Security whitepaper</div>
            <p className="text-sm text-soft leading-relaxed mb-5">
              12-page overview of our security program — architecture, controls, data flow.
            </p>
            <a
              href="mailto:security@prescient-labs.com?subject=Request%3A%20Security%20Whitepaper"
              className="btn-primary text-xs px-4 py-2 uppercase tracking-[0.14em] inline-block"
              data-testid="link-request-whitepaper"
            >
              Request
            </a>
          </div>
          <div className="bg-panel p-8">
            <div className="eyebrow mb-3">DPA / BAA</div>
            <p className="text-sm text-soft leading-relaxed mb-5">
              Our standard Data Processing Agreement with Standard Contractual Clauses. BAA on request.
            </p>
            <a
              href="mailto:security@prescient-labs.com?subject=Request%3A%20DPA%2FBAA"
              className="btn-primary text-xs px-4 py-2 uppercase tracking-[0.14em] inline-block"
              data-testid="link-request-dpa"
            >
              Request
            </a>
          </div>
          <div className="bg-panel p-8">
            <div className="eyebrow mb-3">SIG / CAIQ</div>
            <p className="text-sm text-soft leading-relaxed mb-5">
              Completed SIG Lite / SIG Core / CAIQ v4 questionnaires. 5-business-day turnaround for custom questionnaires.
            </p>
            <a
              href="mailto:security@prescient-labs.com?subject=Request%3A%20SIG%2FCAIQ"
              className="btn-primary text-xs px-4 py-2 uppercase tracking-[0.14em] inline-block"
              data-testid="link-request-sig"
            >
              Request
            </a>
          </div>
        </div>

        {/* Certifications */}
        <section className="mb-20" data-testid="section-certifications">
          <div className="eyebrow mb-6">Certifications & compliance</div>
          <div className="border hair bg-panel">
            {CERTIFICATIONS.map((c, idx) => (
              <div key={c.name} className={`px-6 py-5 ${idx > 0 ? "border-t hair" : ""}`}>
                <div className="flex items-start justify-between gap-6 mb-2">
                  <div className="text-base text-bone">{c.name}</div>
                  <div className="mono text-xs text-soft whitespace-nowrap">{c.status}</div>
                </div>
                <div className="text-sm text-soft leading-relaxed">{c.detail}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Security controls */}
        <section className="mb-20" data-testid="section-controls">
          <div className="eyebrow mb-6">Security controls</div>
          <div className="grid md:grid-cols-2 gap-x-10 gap-y-8">
            {SECURITY_CONTROLS.map((c) => (
              <div key={c.label}>
                <div className="mono text-xs text-muted uppercase tracking-wider mb-2">{c.label}</div>
                <div className="text-sm text-soft leading-relaxed">{c.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Data residency */}
        <section className="mb-20" data-testid="section-residency">
          <div className="eyebrow mb-6">Data residency</div>
          <div className="border hair bg-panel">
            {DATA_RESIDENCY.map((r, idx) => (
              <div key={r.region} className={`px-6 py-5 ${idx > 0 ? "border-t hair" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-base text-bone mb-1">{r.region}</div>
                    <div className="text-xs text-muted">Standby: {r.standbyRegion}</div>
                  </div>
                  <div className="text-sm text-soft max-w-sm text-right">{r.availability}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Subprocessors */}
        <section className="mb-20" data-testid="section-subprocessors">
          <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
            <div>
              <div className="eyebrow mb-2">Subprocessors</div>
              <p className="text-sm text-muted max-w-xl leading-relaxed">
                The current list of subprocessors that may process customer data. We give 30 days' notice before adding or swapping any subprocessor — email <a href="mailto:security@prescient-labs.com" className="text-soft hover:text-bone transition">security@prescient-labs.com</a> to subscribe.
              </p>
            </div>
            <div className="mono text-xs text-muted">Updated {new Date().toISOString().slice(0, 10)}</div>
          </div>
          <div className="border hair bg-panel">
            {SUBPROCESSORS.map((s, idx) => (
              <div key={s.name} className={`px-6 py-5 ${idx > 0 ? "border-t hair" : ""}`}>
                <div className="flex items-start justify-between gap-6 mb-3 flex-wrap">
                  <div className="text-base text-bone">{s.name}</div>
                  <div className="mono text-xs text-muted">{s.region}</div>
                </div>
                <div className="grid md:grid-cols-3 gap-6 text-sm">
                  <div>
                    <div className="mono text-[10px] text-muted uppercase tracking-wider mb-1">Purpose</div>
                    <div className="text-soft leading-relaxed">{s.purpose}</div>
                  </div>
                  <div>
                    <div className="mono text-[10px] text-muted uppercase tracking-wider mb-1">Data categories</div>
                    <div className="text-soft leading-relaxed">{s.dataCategories}</div>
                  </div>
                  <div>
                    <div className="mono text-[10px] text-muted uppercase tracking-wider mb-1">Compliance</div>
                    <div className="text-soft leading-relaxed">{s.compliance}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Incident response */}
        <section className="mb-20" data-testid="section-incidents">
          <div className="eyebrow mb-6">Incident response</div>
          <div className="border hair bg-panel p-8 grid md:grid-cols-4 gap-8">
            <div>
              <div className="mono text-xs text-muted uppercase tracking-wider mb-2">Notification</div>
              <div className="text-2xl display">24h</div>
              <div className="text-xs text-soft leading-relaxed mt-2">to security contact on Sev 1 / Sev 2</div>
            </div>
            <div>
              <div className="mono text-xs text-muted uppercase tracking-wider mb-2">Preliminary RCA</div>
              <div className="text-2xl display">72h</div>
              <div className="text-xs text-soft leading-relaxed mt-2">root-cause summary</div>
            </div>
            <div>
              <div className="mono text-xs text-muted uppercase tracking-wider mb-2">Post-mortem</div>
              <div className="text-2xl display">10d</div>
              <div className="text-xs text-soft leading-relaxed mt-2">business days for full report</div>
            </div>
            <div>
              <div className="mono text-xs text-muted uppercase tracking-wider mb-2">RTO / RPO</div>
              <div className="text-2xl display">4h / 1h</div>
              <div className="text-xs text-soft leading-relaxed mt-2">production disaster recovery</div>
            </div>
          </div>
          <div className="mt-6 text-sm text-muted">
            Report a vulnerability:{" "}
            <a href="mailto:security@prescient-labs.com" className="text-soft hover:text-bone transition">
              security@prescient-labs.com
            </a>
            {" "}·{" "}
            <a href="/.well-known/security.txt" className="text-soft hover:text-bone transition">
              security.txt (RFC 9116)
            </a>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t hair pt-12">
          <h2 className="text-3xl display mb-4">Still reviewing?</h2>
          <p className="text-soft text-sm leading-relaxed max-w-2xl mb-8">
            We answer procurement questionnaires, security reviews, and legal redlines directly. Most enterprise evaluations close in 4–6 weeks from first conversation.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setLocation("/contact")}
              className="btn-primary text-sm px-5 py-2.5"
              data-testid="button-talk-to-sales"
            >
              Talk to sales
            </button>
            <a
              href="mailto:security@prescient-labs.com"
              className="btn-ghost text-sm px-5 py-2.5 uppercase tracking-[0.14em]"
              data-testid="link-security-team"
            >
              Email security team
            </a>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-10 py-14 border-t hair flex items-center justify-between text-sm text-muted relative z-10 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-signal"></div>
          <span className="tracking-[0.18em] font-medium">PRESCIENT LABS</span>
        </div>
        <nav className="flex items-center gap-6 text-xs">
          <a href="/pricing" className="hover:text-bone transition">Pricing</a>
          <a href="/security" className="hover:text-bone transition">Security</a>
          <a href="/trust" className="hover:text-bone transition">Trust</a>
          <a href="/status" className="hover:text-bone transition">Status</a>
          <a href="/contact" className="hover:text-bone transition">Contact</a>
          <a href="/terms" className="hover:text-bone transition">Terms</a>
          <a href="/privacy" className="hover:text-bone transition">Privacy</a>
          <a href="mailto:info@prescient-labs.com" className="hover:text-bone transition">info@prescient-labs.com</a>
        </nav>
        <div className="mono text-xs">© 2026</div>
      </footer>
    </div>
  );
}
