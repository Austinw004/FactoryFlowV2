import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, Shield, Lock, Server, Eye, Users, 
  FileText, CheckCircle, AlertTriangle, Globe, Key, Database
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLocation } from "wouter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function SecurityFaq() {
  const [, setLocation] = useLocation();

  const securityFeatures = [
    {
      icon: Lock,
      title: "Encryption",
      description: "All data encrypted in transit (TLS 1.3) and at rest (AES-256)",
    },
    {
      icon: Users,
      title: "Access Control",
      description: "Role-based permissions with SSO support",
    },
    {
      icon: Eye,
      title: "Audit Logging",
      description: "Complete audit trail of all system access and changes",
    },
    {
      icon: Server,
      title: "Infrastructure",
      description: "Hosted on enterprise-grade cloud infrastructure",
    },
  ];

  const faqs = [
    {
      category: "Data Privacy",
      questions: [
        {
          q: "Where is my data stored?",
          a: "Your data is stored on managed Postgres inside our hosting platform, running in a US AWS region. Multi-region deployment (EU, APAC) is on the roadmap for Tenant VPC customers but is not available today. Storage is encrypted at rest and backed up with point-in-time recovery (currently 7 days by hosting provider default).",
        },
        {
          q: "Who are your subprocessors?",
          a: "The current list of subprocessors that may process customer data: (1) Replit / AWS — application hosting and managed Postgres; (2) Stripe — billing and payment processing; (3) OpenAI and Anthropic — LLM inference for AI copilot features, operated under their zero-retention API terms so your prompts are not used for training; (4) SendPulse — transactional email (invitations, alerts, password resets). We will give 30 days' notice before adding or swapping a subprocessor. Email info@prescient-labs.com to subscribe to the notification list or request a signed subprocessor addendum.",
        },
        {
          q: "Who can access my data?",
          a: "Only authorized members of your organization can access your data through the application. Prescient Labs is a small team; no staff member has routine access to customer production data. For troubleshooting, any access requires the customer's explicit written approval and is logged in the application audit trail.",
        },
        {
          q: "Is my data used to train your AI models?",
          a: "No. Your company's data is never used to train shared models or improve predictions for other customers. Our third-party LLM providers (OpenAI, Anthropic) are operated under zero-retention API terms — your prompts and responses are not retained or used for training by them either.",
        },
        {
          q: "Is peer benchmarking available?",
          a: "Peer benchmarking is a roadmap feature. It is not available today. When we ship it, it will be strictly opt-in, aggregated, and anonymized — you will control what data, if any, you contribute.",
        },
        {
          q: "What happens to my data if I cancel?",
          a: "Upon cancellation, you have 30 days to export all of your data via the self-serve export tool or by requesting a final export from support. After the 30-day grace period, your data is removed from production. Full deletion from backups follows the backup retention window (7 days today). We will provide written confirmation of deletion on request.",
        },
      ],
    },
    {
      category: "Authentication & Access",
      questions: [
        {
          q: "What authentication methods do you support today?",
          a: "Email/password with bcrypt hashing, optional TOTP-based multi-factor authentication, and session revocation on password change. SAML 2.0 / OIDC single sign-on is on the roadmap for enterprise customers — it is not shipped today.",
        },
        {
          q: "How do you handle user permissions?",
          a: "We use role-based access control (RBAC) with predefined roles (Admin, Manager, Viewer). Custom roles and per-resource permissions are on the roadmap.",
        },
        {
          q: "Can I integrate with my existing identity provider?",
          a: "Not yet. SSO via SAML 2.0 and OIDC is on the roadmap and a priority for enterprise contracts. If SSO is a must-have for you today, tell us during evaluation — it helps us prioritize.",
        },
      ],
    },
    {
      category: "Compliance & Certifications",
      questions: [
        {
          q: "Are you SOC 2 certified?",
          a: "No. We have not started a SOC 2 audit. We plan to engage a CPA firm to begin the readiness assessment once we have design partners live in production. Until we complete an audit, we will not claim SOC 2 status. In the interim, we can describe our controls honestly and answer any security questionnaire you send us. Email info@prescient-labs.com.",
        },
        {
          q: "Are you GDPR compliant?",
          a: "We can sign a Data Processing Agreement modeled on GDPR Article 28 with Standard Contractual Clauses. This is a self-attestation — we have not been audited for GDPR by a third party, and no third party has certified us. If that distinction matters for your procurement process, please tell us early.",
        },
        {
          q: "Can you complete our vendor security questionnaire?",
          a: "Yes. Send us your SIG, CAIQ, or custom questionnaire and we will answer it directly and honestly, including \"not yet\" on items we haven't shipped. Typical turnaround is 5 business days. Email info@prescient-labs.com.",
        },
        {
          q: "Will you sign a Data Processing Agreement (DPA) / BAA?",
          a: "DPA: yes, we can sign a DPA modeled on GDPR Article 28 with Standard Contractual Clauses. BAA: not today. We do not currently sign Business Associate Agreements. If your use case is healthcare-adjacent, talk to us before evaluating further.",
        },
      ],
    },
    {
      category: "Technical Security",
      questions: [
        {
          q: "How is data encrypted?",
          a: "All data in transit uses TLS 1.3. Data at rest is encrypted with AES-256 via the managed Postgres and object storage provided by our hosting platform. Tenant-supplied integration credentials (ERP passwords, API keys you enter into the platform) are additionally encrypted with AES-256-GCM using a master key held only in runtime secrets.",
        },
        {
          q: "Do you perform penetration testing?",
          a: "Not yet. We run automated dependency scanning (Dependabot) and practice secure-by-default development, but we have not yet commissioned a third-party penetration test. We plan to before we initiate a SOC 2 audit.",
        },
        {
          q: "What is your uptime target?",
          a: "We target 99.9% monthly uptime for the core platform and publish live status at /status. We do not offer a contractual financial-credit SLA today. If you need one for procurement, tell us — we will negotiate terms in the MSA.",
        },
        {
          q: "How do you handle security incidents?",
          a: "We will notify affected customers within 72 hours of confirming any incident that involves their data and publish a written post-mortem for Sev 1 / Sev 2 incidents within 10 business days of resolution. Prescient Labs is a small team, so incident response is a single on-call rotation rather than a 24x7 SOC; we will be explicit about that in any security review.",
        },
        {
          q: "Is your API secure?",
          a: "API access requires authenticated session tokens. All API traffic is encrypted in transit, rate-limited, and logged. OAuth 2.0 for third-party integrations and IP allowlisting are on the roadmap.",
        },
      ],
    },
    {
      category: "Business Continuity",
      questions: [
        {
          q: "How do you back up data?",
          a: "The managed Postgres provided by our hosting platform performs continuous backups with point-in-time recovery (currently 7 days by default). Longer retention and geographically separated backup regions are on the roadmap.",
        },
        {
          q: "What is your disaster recovery plan?",
          a: "We have a written DR runbook but have not yet executed a formal DR drill. Measured RTO (Recovery Time Objective) and RPO (Recovery Point Objective) values will be published on the Trust Center once we complete our first drill.",
        },
        {
          q: "What happens if Prescient Labs goes out of business?",
          a: "We do not have a source code escrow agreement today. In the event of business discontinuation, customers will receive written notice and a full data export in standard formats (CSV, JSON). If escrow is a contract requirement for you, tell us early — we can arrange it.",
        },
      ],
    },
  ];

  const complianceStatus = [
    { name: "SOC 2 Type II", status: "Not yet", target: "Audit not yet initiated" },
    { name: "GDPR (DPA available)", status: "Self-attested", target: "DPA can be signed today" },
    { name: "CCPA / CPRA", status: "Self-attested", target: "We do not sell data" },
    { name: "ISO 27001", status: "Planned", target: "After SOC 2" },
    { name: "HIPAA BAA", status: "Not offered today", target: "—" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Button 
              variant="ghost" 
              onClick={() => setLocation("/")}
              data-testid="button-back-home"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-16 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-4">Security & Compliance</Badge>
          <h1 className="text-4xl font-bold mb-4">Security FAQ</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            How we protect your manufacturing data.
          </p>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {securityFeatures.map((feature, idx) => (
              <Card key={idx} className="p-6 text-center" data-testid={`card-security-${idx}`}>
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance Status */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 text-center">Compliance Status</h2>
          <Card className="p-6">
            <div className="space-y-4">
              {complianceStatus.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    {item.status === "Self-attested" ? (
                      <CheckCircle className="h-5 w-5 text-muted-foreground" />
                    ) : item.status === "Planned" ? (
                      <AlertTriangle className="h-5 w-5 text-signal" />
                    ) : (
                      <Globe className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {item.status}
                    </Badge>
                    {item.target && (
                      <span className="text-sm text-muted-foreground">{item.target}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
          
          {faqs.map((category, catIdx) => (
            <div key={catIdx} className="mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                {category.category}
              </h3>
              <Card>
                <Accordion type="single" collapsible>
                  {category.questions.map((faq, faqIdx) => (
                    <AccordionItem key={faqIdx} value={`${catIdx}-${faqIdx}`}>
                      <AccordionTrigger className="px-6 text-left" data-testid={`faq-${catIdx}-${faqIdx}`}>
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4 text-muted-foreground">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Card>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Security */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Key className="h-12 w-12 mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-bold mb-4">Have Security Questions?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Our security team is available to answer additional questions, complete vendor questionnaires, or discuss your specific requirements.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" asChild data-testid="link-contact-security">
              <a href="mailto:info@prescient-labs.com">Email info@prescient-labs.com</a>
            </Button>
            <Button size="lg" variant="outline" onClick={() => setLocation("/trust")} data-testid="button-trust-center">
              Trust Center
            </Button>
            <Button size="lg" variant="outline" onClick={() => setLocation("/contact")} data-testid="button-contact-sales">
              Talk to Sales
            </Button>
          </div>
        </div>
      </section>

      {/* Trust Statement */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="p-8 text-center">
            <Database className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-4">Our Commitment to You</h3>
            <p className="text-muted-foreground">
              We protect manufacturing data with the same rigor we apply to our own operations. See our controls and certifications above, and reach out if you need anything else.
            </p>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Prescient Labs. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
