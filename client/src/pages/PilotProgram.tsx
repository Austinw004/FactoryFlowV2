import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Check, ArrowLeft, Calendar, Target, Users, Zap,
  BarChart3, Shield, Clock, ArrowRight, Sparkles
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLocation } from "wouter";

export default function PilotProgram() {
  const [, setLocation] = useLocation();

  const pilotPhases = [
    {
      week: "Week 1-2",
      name: "Discovery & Setup",
      activities: [
        "Kickoff call with executive sponsor",
        "Data requirements gathering",
        "Initial data ingestion",
        "Platform configuration",
        "User account provisioning",
      ],
      deliverable: "Configured platform with your data",
    },
    {
      week: "Week 3-4",
      name: "Intelligence Activation",
      activities: [
        "Economic regime analysis",
        "Demand forecast calibration",
        "Supplier risk baseline",
        "Procurement signal tuning",
        "Team training session",
      ],
      deliverable: "First regime-aware forecasts",
    },
    {
      week: "Week 5-8",
      name: "Value Demonstration",
      activities: [
        "Live procurement signals",
        "AI assistant deployment",
        "Counter-cyclical opportunities identified",
        "Weekly optimization reviews",
        "ROI tracking and documentation",
      ],
      deliverable: "Documented savings opportunities",
    },
    {
      week: "Week 9-12",
      name: "Scale & Transition",
      activities: [
        "Full user rollout",
        "Integration deepening (if applicable)",
        "Success metrics review",
        "Go/no-go decision",
        "Production deployment planning",
      ],
      deliverable: "Business case for full deployment",
    },
  ];

  const successMetrics = [
    {
      metric: "Procurement Savings Identified",
      target: "$50K - $500K+",
      description: "Counter-cyclical buying opportunities surfaced during pilot",
    },
    {
      metric: "Forecast Accuracy Improvement",
      target: "15-35% MAPE reduction",
      description: "Compared to your current forecasting methods",
    },
    {
      metric: "Time to Insight",
      target: "< 24 hours",
      description: "From market event to actionable recommendation",
    },
    {
      metric: "User Adoption",
      target: "> 80%",
      description: "Active usage among provisioned users",
    },
  ];

  const investmentOptions = [
    {
      name: "Standard Pilot",
      price: "$15,000",
      duration: "8 weeks",
      features: [
        "Up to 500 SKUs",
        "5 user licenses",
        "Weekly check-ins",
        "Email support",
        "Basic integration (CSV/API)",
        "Standard onboarding",
      ],
      bestFor: "Small to mid-size manufacturers",
    },
    {
      name: "Enterprise Pilot",
      price: "$30,000",
      duration: "12 weeks",
      features: [
        "Unlimited SKUs",
        "15 user licenses",
        "Bi-weekly executive reviews",
        "Priority support",
        "ERP integration included",
        "Concierge onboarding",
        "Custom success metrics",
        "Dedicated success manager",
      ],
      bestFor: "Large manufacturers, multi-site operations",
      highlighted: true,
    },
    {
      name: "Success-Based",
      price: "Custom",
      duration: "Negotiated",
      features: [
        "Lower upfront investment",
        "Performance-based fees",
        "Tied to documented savings",
        "Mutual skin in the game",
        "Flexible scope",
        "Partnership approach",
      ],
      bestFor: "Risk-averse organizations, strategic partnerships",
    },
  ];

  const whyPilot = [
    {
      icon: Shield,
      title: "Low Risk",
      description: "Limited commitment before full investment. Prove value with your own data.",
    },
    {
      icon: Target,
      title: "Measurable Outcomes",
      description: "Clear success metrics agreed upfront. No ambiguity about results.",
    },
    {
      icon: Users,
      title: "Executive Alignment",
      description: "Weekly reviews ensure leadership stays informed and engaged.",
    },
    {
      icon: Zap,
      title: "Fast Time-to-Value",
      description: "See first insights within 2 weeks. Savings opportunities within 4 weeks.",
    },
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
          <Badge className="mb-4">Pilot Program</Badge>
          <h1 className="text-4xl font-bold mb-4">Prove the Value Before You Commit</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A structured 8-12 week program to demonstrate measurable ROI with your own data, your own team, and your own use cases.
          </p>
        </div>
      </section>

      {/* Why Pilot */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 text-center">Why Start With a Pilot?</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyPilot.map((item, idx) => (
              <Card key={idx} className="p-6 text-center" data-testid={`card-why-${idx}`}>
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 text-center">Pilot Timeline</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pilotPhases.map((phase, idx) => (
              <Card key={idx} className="p-6" data-testid={`card-phase-${idx}`}>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="h-5 w-5 text-primary" />
                  <Badge variant="outline">{phase.week}</Badge>
                </div>
                <h3 className="font-semibold mb-3">{phase.name}</h3>
                <ul className="space-y-2 mb-4">
                  {phase.activities.map((activity, aIdx) => (
                    <li key={aIdx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      <span>{activity}</span>
                    </li>
                  ))}
                </ul>
                <div className="pt-4 border-t">
                  <p className="text-xs">
                    <strong>Deliverable:</strong>{" "}
                    <span className="text-muted-foreground">{phase.deliverable}</span>
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Success Metrics */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 text-center">Success Metrics</h2>
          <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
            We agree on measurable outcomes before the pilot begins. No ambiguity about what success looks like.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {successMetrics.map((metric, idx) => (
              <Card key={idx} className="p-6 text-center" data-testid={`card-metric-${idx}`}>
                <div className="text-2xl font-bold text-primary mb-2">{metric.target}</div>
                <h3 className="font-medium mb-2">{metric.metric}</h3>
                <p className="text-xs text-muted-foreground">{metric.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Investment Options */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 text-center">Investment Options</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {investmentOptions.map((option, idx) => (
              <Card 
                key={idx} 
                className={`p-6 ${option.highlighted ? 'ring-2 ring-primary' : ''}`}
                data-testid={`card-option-${idx}`}
              >
                {option.highlighted && (
                  <Badge className="mb-4">Most Popular</Badge>
                )}
                <h3 className="text-xl font-semibold mb-2">{option.name}</h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold">{option.price}</span>
                  <span className="text-muted-foreground">/ {option.duration}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">{option.bestFor}</p>
                <ul className="space-y-2">
                  {option.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 text-center">What's Included in Every Pilot</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              "Dedicated onboarding specialist",
              "Weekly progress reviews",
              "Full platform access",
              "AI assistant capabilities",
              "Economic regime intelligence",
              "Demand forecasting",
              "Procurement timing signals",
              "Supplier risk scoring",
              "ROI documentation",
              "Executive summary report",
              "Go-live planning support",
              "30-day post-pilot support",
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-80" />
          <h2 className="text-2xl font-bold mb-4">Ready to See What's Possible?</h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Schedule a discovery call to discuss your specific challenges and how a pilot could address them.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild data-testid="link-schedule-call">
              <a href="mailto:pilots@prescientlabs.ai">
                Schedule Discovery Call
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setLocation("/integration-checklist")}
              data-testid="button-view-integrations"
            >
              View Integration Options
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
