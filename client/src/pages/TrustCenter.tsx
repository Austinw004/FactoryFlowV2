import { useLocation } from "wouter";
import { SEOHead } from "@/components/SEOHead";

/**
 * /trust — Trust Center.
 *
 * This page is the one we point procurement, infosec, and CISOs at. It is
 * intentionally separate from the /security FAQ: /security answers
 * *questions*, /trust *documents the program*.
 *
 * Ground rule for every line on this page: if we can't back it up in a
 * live audit today, we don't claim it. Aspirational items are labelled
 * "Not yet", "Planned", or "On the roadmap" — never "Compliant" or
 * "Available" unless we can actually deliver it to a customer this week.
 */

// Everything on this page describes controls that are actually in place today.
// Anything aspirational is labeled "Planned" or "On request" — never "Available"
// or "Compliant" unless we can back it up in a live audit.

const SUBPROCESSORS = [
  {
    name: "Amazon Web Services (via Replit)",
    purpose: "Application hosting, managed Postgres, object storage, KMS. Replit Autoscale runs on AWS.",
    dataCategories: "Production data, encrypted backups, application logs.",
    region: "United States",
    compliance: "AWS: SOC 1/2/3, ISO 27001, PCI-DSS, HIPAA-eligible. Replit: SOC 2 Type II.",
  },
  {
    name: "Stripe",
    purpose: "Billing, invoicing, payment processing.",
    dataCategories: "Customer name, billing email, payment method metadata (no card numbers touch our infrastructure).",
    region: "United States",
    compliance: "PCI-DSS Level 1, SOC 1/2, ISO 27001.",
  },
  {
    name: "OpenAI",
    purpose: "LLM inference for AI copilot and natural-language querying.",
    dataCategories: "Task-bounded prompts derived from customer data — never raw tabular datasets.",
    region: "United States",
    compliance: "SOC 2 Type II. Operated under zero-retention API terms — no training on customer data.",
  },
  {
    name: "Anthropic",
    purpose: "LLM inference for AI copilot (alternate provider).",
    dataCategories: "Task-bounded prompts derived from customer data.",
    region: "United States",
    compliance: "SOC 2 Type II. Operated under zero-retention API terms — no training on customer data.",
  },
  {
    name: "SendPulse",
    purpose: "Transactional email (team invites, alerts, password resets).",
    dataCategories: "Recipient name, email, email body content.",
    region: "EU (primary), US (fallback)",
    compliance: "GDPR-compliant, ISO 27001 (hosting provider).",
  },
];

const CERTIFICATIONS = [
  { name: "SOC 2 Type II", status: "Not yet", detail: "We have not started a SOC 2 audit. Planning to engage a CPA firm once we have design partners live in production. We will update this page when we kick off." },
  { name: "GDPR", status: "Self-attested", detail: "We can sign a Data Processing Agreement modeled on GDPR Article 28 with Standard Contractual Clauses. We are not audited against GDPR — no third party has certified this." },
  { name: "CCPA / CPRA", status: "Self-attested", detail: "We do not sell customer data. We will handle consumer rights requests (access, deletion, correction) received at info@prescient-labs.com." },
  { name: "HIPAA BAA", status: "Not offered yet", detail: "We do not currently sign BAAs. If your use case is healthcare-adjacent, email us and we'll tell you honestly whether we're the right fit today." },
  { name: "ISO 27001", status: "Not planned for now", detail: "ISO 27001 is on the long-term roadmap, after SOC 2. We will not claim it until we have it." },
];

const SECURITY_CONTROLS = [
  { label: "Encryption in transit", value: "TLS 1.3 on all public endpoints. HSTS enabled. Certificates managed and auto-rotated by our hosting provider." },
  { label: "Encryption at rest", value: "AES-256 on managed Postgres and object storage provided by our hosting platform. Tenant-supplied integration credentials are encrypted with AES-256-GCM using a master key held only in runtime secrets." },
  { label: "Access control", value: "Role-based access inside the application. Prescient Labs staff do not have routine access to customer production data. Any access for troubleshooting requires the customer's explicit approval and is logged in the application audit trail." },
  { label: "Audit logging", value: "Authentication events and customer-facing mutations are written to an application audit log. Retention is bounded by the database backup policy (currently 30 days); longer retention is on the roadmap." },
  { label: "Authentication", value: "Email/password with bcrypt hashing, optional TOTP MFA, and session revocation on password change. SAML 2.0 / OIDC SSO is on the roadmap for enterprise customers — not yet shipped." },
  { label: "Secrets management", value: "No secrets in source control. Runtime secrets live in the hosting platform's secrets manager, injected as environment variables at process start." },
  { label: "Vulnerability management", value: "Automated dependency scanning via Dependabot with auto-merge for low-risk patch updates. We have not yet commissioned a third-party penetration test; we plan to before SOC 2 audit kickoff." },
  { label: "Backup & DR", value: "Managed Postgres with point-in-time recovery (provider default, 7 days). We have not run a formal DR drill. RTO / RPO will be measured and published once we do." },
  { label: "Incident response", value: "We will notify affected customers within 72 hours of confirming any incident that involves their data, and publish a written post-mortem. Small team — a single on-call rotation, not a 24x7 SOC." },
];

const DATA_RESIDENCY = [
  { region: "United States", availability: "All deployments run in the US today.", standbyRegion: "Managed by our hosting provider" },
  { region: "European Union", availability: "Not available today. EU residency is on the roadmap for Tenant VPC customers — ask us about timing.", standbyRegion: "—" },
  { region: "Asia-Pacific", availability: "Not available today.", standbyRegion: "—" },
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
          <a href="mailto:info@prescient-labs.com" className="text-bone hover:text-signal transition">info@prescient-labs.com</a>
          {" "}and we'll respond within one US business day.
        </p>

        {/* Quick request CTAs — honest about what we can actually turn around today */}
        <div className="grid md:grid-cols-3 gap-px bg-line mb-20" data-testid="cta-request-strip">
          <div className="bg-panel p-8">
            <div className="eyebrow mb-3">Security summary</div>
            <p className="text-sm text-soft leading-relaxed mb-5">
              One-page summary of the controls on this page, suitable for forwarding to your security team. Written on request, turnaround 2 business days.
            </p>
            <a
              href="mailto:info@prescient-labs.com?subject=Request%3A%20Security%20Summary"
              className="btn-primary text-xs px-4 py-2 uppercase tracking-[0.14em] inline-block"
              data-testid="link-request-whitepaper"
            >
              Request
            </a>
          </div>
          <div className="bg-panel p-8">
            <div className="eyebrow mb-3">DPA</div>
            <p className="text-sm text-soft leading-relaxed mb-5">
              Standard Data Processing Agreement with Standard Contractual Clauses for EU transfers. We can sign today.
            </p>
            <a
              href="mailto:info@prescient-labs.com?subject=Request%3A%20DPA"
              className="btn-primary text-xs px-4 py-2 uppercase tracking-[0.14em] inline-block"
              data-testid="link-request-dpa"
            >
              Request
            </a>
          </div>
          <div className="bg-panel p-8">
            <div className="eyebrow mb-3">Security questionnaire</div>
            <p className="text-sm text-soft leading-relaxed mb-5">
              Send us your SIG, CAIQ, or custom questionnaire. We answer honestly — which includes saying "not yet" where applicable. Turnaround typically 5 business days.
            </p>
            <a
              href="mailto:info@prescient-labs.com?subject=Request%3A%20Security%20Questionnaire"
              className="btn-primary text-xs px-4 py-2 uppercase tracking-[0.14em] inline-block"
              data-testid="link-request-sig"
            >
              Send questionnaire
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
                The current list of subprocessors that may process customer data. We give 30 days' notice before adding or swapping any subprocessor — email <a href="mailto:info@prescient-labs.com" className="text-soft hover:text-bone transition">info@prescient-labs.com</a> to subscribe.
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

        {/* Incident response — written commitments, not contractually-audited SLAs. */}
        <section className="mb-20" data-testid="section-incidents">
          <div className="eyebrow mb-6">Incident response</div>
          <div className="border hair bg-panel p-8 grid md:grid-cols-3 gap-8">
            <div>
              <div className="mono text-xs text-muted uppercase tracking-wider mb-2">Notification</div>
              <div className="text-2xl display">72h</div>
              <div className="text-xs text-soft leading-relaxed mt-2">
                Affected customers notified within 72 hours of confirming any incident involving their data.
              </div>
            </div>
            <div>
              <div className="mono text-xs text-muted uppercase tracking-wider mb-2">Post-mortem</div>
              <div className="text-2xl display">10d</div>
              <div className="text-xs text-soft leading-relaxed mt-2">
                Written post-mortem for Sev 1 / Sev 2 incidents within 10 business days of resolution.
              </div>
            </div>
            <div>
              <div className="mono text-xs text-muted uppercase tracking-wider mb-2">RTO / RPO</div>
              <div className="text-2xl display">TBD</div>
              <div className="text-xs text-soft leading-relaxed mt-2">
                We have not run a formal DR exercise yet. Target values will be published after the first drill.
              </div>
            </div>
          </div>
          <div className="mt-6 text-sm text-muted">
            Report a vulnerability:{" "}
            <a href="mailto:info@prescient-labs.com" className="text-soft hover:text-bone transition">
              info@prescient-labs.com
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
            We answer procurement questionnaires, security reviews, and legal redlines directly — one of the founders, not a canned reply. Reply within one US business day.
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
              href="mailto:info@prescient-labs.com"
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
