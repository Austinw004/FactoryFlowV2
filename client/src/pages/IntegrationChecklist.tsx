import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Check, ArrowLeft, Database, Cloud, Shield, Clock, 
  FileText, Users, Settings, Zap, Server, Link2
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLocation } from "wouter";

export default function IntegrationChecklist() {
  const [, setLocation] = useLocation();

  const integrationTiers = [
    {
      tier: "Tier 1",
      name: "Quick Start",
      timeline: "1-2 weeks",
      description: "Manual data upload, immediate value",
      effort: "Low",
      features: [
        "CSV/Excel data import",
        "Manual SKU and material entry",
        "Basic demand forecasting",
        "Regime intelligence dashboard",
        "AI assistant access",
      ],
      requirements: [
        "Historical sales data (12+ months recommended)",
        "Material cost data",
        "Supplier list with basic info",
      ],
      bestFor: "Proof of concept, small operations, quick evaluation",
    },
    {
      tier: "Tier 2",
      name: "API Integration",
      timeline: "4-6 weeks",
      description: "Automated data sync via REST APIs",
      effort: "Medium",
      features: [
        "Everything in Tier 1",
        "REST API data synchronization",
        "Automated forecast updates",
        "Webhook notifications",
        "Procurement signal automation",
        "Real-time inventory sync",
      ],
      requirements: [
        "Developer resources (or we provide)",
        "API access to your ERP/MRP system",
        "Secure credential management",
      ],
      bestFor: "Mid-size operations, companies with IT resources",
    },
    {
      tier: "Tier 3",
      name: "Enterprise ERP",
      timeline: "8-12 weeks",
      description: "Deep bi-directional ERP integration",
      effort: "High",
      features: [
        "Everything in Tier 2",
        "Native ERP connectors (SAP, Oracle, NetSuite, Dynamics)",
        "Bi-directional data flow",
        "Automated PO generation in ERP",
        "Real-time production data ingestion",
        "Multi-plant synchronization",
        "Custom workflow automation",
      ],
      requirements: [
        "ERP admin access",
        "IT project sponsor",
        "Change management plan",
        "Security review completion",
      ],
      bestFor: "Large enterprises, multi-site operations, full automation",
    },
  ];

  const erpSupport = [
    { name: "SAP S/4HANA", status: "Native Connector", statusColor: "bg-green-500" },
    { name: "Oracle NetSuite", status: "Native Connector", statusColor: "bg-green-500" },
    { name: "Microsoft Dynamics 365", status: "Native Connector", statusColor: "bg-green-500" },
    { name: "Sage X3", status: "API Template", statusColor: "bg-yellow-500" },
    { name: "Infor CloudSuite", status: "API Template", statusColor: "bg-yellow-500" },
    { name: "Epicor", status: "API Template", statusColor: "bg-yellow-500" },
    { name: "Custom/Legacy", status: "Custom Development", statusColor: "bg-blue-500" },
  ];

  const dataRequirements = [
    {
      category: "Sales & Demand",
      required: true,
      items: [
        "Historical order data (12-24 months)",
        "SKU catalog with descriptions",
        "Customer segments (optional)",
        "Seasonal patterns documentation",
      ],
    },
    {
      category: "Materials & Inventory",
      required: true,
      items: [
        "Bill of materials (BOM)",
        "Current inventory levels",
        "Material cost history",
        "Lead times by supplier",
      ],
    },
    {
      category: "Suppliers",
      required: true,
      items: [
        "Supplier master list",
        "Primary/secondary supplier mapping",
        "Contract terms and pricing",
        "Geographic locations",
      ],
    },
    {
      category: "Production (Optional)",
      required: false,
      items: [
        "Machine catalog and capacities",
        "Production schedules",
        "Downtime/maintenance logs",
        "Quality metrics",
      ],
    },
  ];

  const securityChecklist = [
    { item: "Data encrypted in transit (TLS 1.3)", included: true },
    { item: "Data encrypted at rest (AES-256)", included: true },
    { item: "SOC 2 Type II audit", included: "Not yet" },
    { item: "GDPR-aligned DPA (self-attested)", included: true },
    { item: "Role-based access control (RBAC)", included: true },
    { item: "Single Sign-On (SSO / SAML / OIDC)", included: "On roadmap" },
    { item: "Audit logging", included: true },
    { item: "Multi-region data residency", included: "On roadmap" },
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
          <Badge className="mb-4">Integration Guide</Badge>
          <h1 className="text-4xl font-bold mb-4">Integration Checklist</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Three flexible integration paths to get you up and running - from quick CSV uploads to full enterprise ERP connectivity.
          </p>
        </div>
      </section>

      {/* Integration Tiers */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 text-center">Choose Your Integration Path</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {integrationTiers.map((tier, idx) => (
              <Card key={idx} className={`p-6 ${idx === 1 ? 'ring-2 ring-primary' : ''}`} data-testid={`card-tier-${idx}`}>
                <div className="flex items-center justify-between mb-4">
                  <Badge variant={idx === 1 ? "default" : "secondary"}>{tier.tier}</Badge>
                  <Badge variant="outline">{tier.effort} Effort</Badge>
                </div>
                <h3 className="text-xl font-semibold mb-2">{tier.name}</h3>
                <p className="text-muted-foreground text-sm mb-4">{tier.description}</p>
                <div className="flex items-center gap-2 mb-6">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{tier.timeline}</span>
                </div>
                
                <div className="mb-6">
                  <h4 className="font-medium mb-2 text-sm">Includes:</h4>
                  <ul className="space-y-2">
                    {tier.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-good shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mb-6">
                  <h4 className="font-medium mb-2 text-sm">Requirements:</h4>
                  <ul className="space-y-2">
                    {tier.requirements.map((req, rIdx) => (
                      <li key={rIdx} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    <strong>Best for:</strong> {tier.bestFor}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ERP Support */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 text-center">Supported ERP Systems</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {erpSupport.map((erp, idx) => (
              <Card key={idx} className="p-4" data-testid={`card-erp-${idx}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${erp.statusColor}`} />
                  <div>
                    <div className="font-medium text-sm">{erp.name}</div>
                    <div className="text-xs text-muted-foreground">{erp.status}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't see your ERP? Contact us - we can build custom connectors for any system with API access.
          </p>
        </div>
      </section>

      {/* Data Requirements */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 text-center">Data Requirements</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {dataRequirements.map((category, idx) => (
              <Card key={idx} className="p-6" data-testid={`card-data-${idx}`}>
                <div className="flex items-center gap-2 mb-4">
                  <Database className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">{category.category}</h3>
                  {category.required ? (
                    <Badge variant="default" className="ml-auto">Required</Badge>
                  ) : (
                    <Badge variant="secondary" className="ml-auto">Optional</Badge>
                  )}
                </div>
                <ul className="space-y-2">
                  {category.items.map((item, iIdx) => (
                    <li key={iIdx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 text-center">Security & Compliance</h2>
          <Card className="p-8 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="h-6 w-6 text-primary" />
              <h3 className="text-lg font-semibold">Enterprise-Grade Security</h3>
            </div>
            <ul className="space-y-3">
              {securityChecklist.map((item, idx) => (
                <li key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm">{item.item}</span>
                  {item.included === true ? (
                    <Badge variant="default" className="bg-green-600">Included</Badge>
                  ) : (
                    <Badge variant="outline">{item.included}</Badge>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Schedule a technical call to discuss your specific integration needs and timeline.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" onClick={() => setLocation("/pilot-program")} data-testid="button-view-pilot">
              View Pilot Program
            </Button>
            <Button size="lg" variant="outline" onClick={() => setLocation("/contact")} data-testid="button-contact-sales">
              Contact Sales
            </Button>
          </div>
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
