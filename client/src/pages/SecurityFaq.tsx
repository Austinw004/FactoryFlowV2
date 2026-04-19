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
          a: "Your data is stored in secure, SOC 2 compliant data centers in the United States (US-East, primary) with hot-standby replication in US-West. Enterprise customers on the Tenant VPC deployment can specify region — EU (Frankfurt) and APAC (Sydney) are available on request. All storage is on encrypted managed-Postgres with point-in-time recovery.",
        },
        {
          q: "Who are your subprocessors?",
          a: "The current list of subprocessors that may process customer data: (1) AWS — primary hosting and managed Postgres, US-East/US-West; (2) Stripe — billing and payment processing; (3) OpenAI and Anthropic — AI inference for forecasting copilot features (your raw data is never used to train their models; we operate under their zero-retention enterprise API terms); (4) Resend — transactional email (invitations, alerts, password resets); (5) Sentry — error telemetry with PII scrubbing enabled. We give 30 days' notice before adding or swapping a subprocessor. Email info@prescient-labs.com for the signed subprocessor addendum.",
        },
        {
          q: "Who can access my data?",
          a: "Only authorized members of your organization can access your data. Prescient Labs employees cannot view your production data without explicit, time-bound customer authorization, and all access is logged immutably. Our support team may request temporary read-only access for troubleshooting — this requires your written approval and expires automatically in 24 hours.",
        },
        {
          q: "Is my data used to train your AI models?",
          a: "No. Your company's data is never used to train shared models or improve predictions for other customers. Your forecasting models are trained exclusively on your own historical data. Our third-party LLM providers (OpenAI, Anthropic) operate under zero-retention enterprise API terms — your prompts and responses are not retained or used for training.",
        },
        {
          q: "Can my competitors see my data through benchmarking?",
          a: "No. The peer benchmarking consortium uses differential privacy and anonymization techniques. Only aggregated, anonymized statistics are shared — never raw data, company names, or identifiable information. Benchmarking is strictly opt-in — you control what data, if any, you contribute.",
        },
        {
          q: "What happens to my data if I cancel?",
          a: "Upon cancellation, you have 30 days to export all of your data via the self-serve export tool or request a final bulk export from support. After the 30-day grace period, your data is permanently deleted from production and backups within 14 days, and we issue a signed certificate of deletion on request.",
        },
      ],
    },
    {
      category: "Authentication & Access",
      questions: [
        {
          q: "What authentication methods do you support?",
          a: "We support Single Sign-On (SSO) via SAML 2.0 and OIDC, including integrations with Okta, Azure AD, Google Workspace, and other identity providers. Multi-factor authentication (MFA) is available and can be enforced at the organization level.",
        },
        {
          q: "How do you handle user permissions?",
          a: "We use role-based access control (RBAC) with predefined roles (Admin, Manager, Viewer) and the ability to create custom roles. Permissions can be scoped to specific data sets, SKU categories, or features.",
        },
        {
          q: "Can I integrate with my existing identity provider?",
          a: "Yes. We support SAML 2.0 and OIDC for enterprise SSO integration. Most enterprise identity providers (Okta, Azure AD, OneLogin, Ping) work out of the box.",
        },
      ],
    },
    {
      category: "Compliance & Certifications",
      questions: [
        {
          q: "Are you SOC 2 certified?",
          a: "We are pursuing SOC 2 Type II certification with audit kickoff planned for Q3 2026. In the interim we operate under a documented security program aligned with the SOC 2 Trust Services Criteria — encryption, access control, audit logging, incident response, change management. We can share our current security whitepaper, complete SIG / CAIQ questionnaires, and sign a Data Processing Agreement (DPA) today. Email info@prescient-labs.com to request.",
        },
        {
          q: "Are you GDPR compliant?",
          a: "Yes. We comply with GDPR requirements for data processing, including data subject rights, data portability, and breach notification. We can sign a Data Processing Agreement (DPA) upon request.",
        },
        {
          q: "Do you have a security certification for manufacturing?",
          a: "We follow IEC 62443 guidelines for industrial automation security. While not formally certified, our security practices align with manufacturing industry requirements.",
        },
        {
          q: "Can you complete our vendor security questionnaire?",
          a: "Yes. We regularly complete SIG Lite, SIG Core, CAIQ v4, and custom questionnaires for enterprise customers. Typical turnaround is 5 business days. Email info@prescient-labs.com with your questionnaire and target signature date.",
        },
        {
          q: "Will you sign a Data Processing Agreement (DPA) / BAA?",
          a: "Yes. We can sign a DPA modeled on GDPR Article 28 with Standard Contractual Clauses for EU data transfers. HIPAA BAA is available for healthcare-adjacent deployments. Both can be executed before you sign an MSA. Email info@prescient-labs.com to receive our standard DPA template.",
        },
      ],
    },
    {
      category: "Technical Security",
      questions: [
        {
          q: "How is data encrypted?",
          a: "All data in transit is encrypted using TLS 1.3. Data at rest is encrypted using AES-256. Database encryption keys are managed through a secure key management service with automatic rotation.",
        },
        {
          q: "Do you perform penetration testing?",
          a: "Yes. We conduct annual third-party penetration tests and continuous vulnerability scanning. Critical findings are addressed within 24 hours, high severity within 7 days.",
        },
        {
          q: "What is your uptime target?",
          a: "Our public target is 99.9% monthly uptime for the core platform, measured via external synthetic checks. Live status is published at /status. Enterprise customers on the Performance or Tenant VPC tier receive a contractual 99.95% SLA with financial credits for downtime — terms are negotiated in the MSA.",
        },
        {
          q: "How do you handle security incidents?",
          a: "We have a documented incident response plan with defined severity levels. For any incident that affects customer data (Sev 1 or Sev 2), we notify the customer security contact within 24 hours of confirmation, with a preliminary root-cause summary within 72 hours and a full post-incident report within 10 business days. Our production RTO is 4 hours and RPO is 1 hour; disaster-recovery failover is tested quarterly.",
        },
        {
          q: "Is your API secure?",
          a: "Yes. API access requires authentication via API keys or OAuth 2.0 tokens. All API traffic is encrypted, rate-limited, and logged. IP whitelisting is available for enterprise customers.",
        },
      ],
    },
    {
      category: "Business Continuity",
      questions: [
        {
          q: "How do you back up data?",
          a: "Databases are backed up continuously with point-in-time recovery capability. We maintain backups for 30 days, with snapshots stored in geographically separate regions.",
        },
        {
          q: "What is your disaster recovery plan?",
          a: "We maintain hot standby infrastructure in a separate availability zone with automatic failover. Our RTO (Recovery Time Objective) is 4 hours, RPO (Recovery Point Objective) is 1 hour for production systems.",
        },
        {
          q: "What happens if Prescient Labs goes out of business?",
          a: "We maintain a source code escrow agreement and documented data export procedures. In the unlikely event of business discontinuation, customers receive 90 days notice and full data export capability.",
        },
      ],
    },
  ];

  const complianceStatus = [
    { name: "SOC 2 Type II", status: "In Progress", target: "Audit kickoff Q3 2026" },
    { name: "GDPR Compliance", status: "Compliant", target: "" },
    { name: "CCPA Compliance", status: "Compliant", target: "" },
    { name: "ISO 27001", status: "Planned", target: "2027" },
    { name: "HIPAA BAA", status: "Available on request", target: "" },
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
            Your data security is our top priority. Here's everything you need to know about how we protect your information.
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
                    {item.status === "Compliant" ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : item.status === "In Progress" ? (
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    ) : (
                      <Globe className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={item.status === "Compliant" ? "default" : "secondary"}
                      className={item.status === "Compliant" ? "bg-green-600" : ""}
                    >
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
              We understand that manufacturing data is sensitive and critical to your operations. 
              We treat your data with the same care we would treat our own. Your trust is the 
              foundation of our business, and we are committed to earning it every day through 
              transparent practices, robust security, and responsive support.
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
