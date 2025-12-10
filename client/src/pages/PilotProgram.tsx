import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Check, ArrowLeft, Calendar, Target, Users, Zap,
  BarChart3, Shield, Clock, ArrowRight, Sparkles, DollarSign,
  TrendingUp, FileCheck, Handshake, Video, ClipboardCheck, X,
  CheckCircle2, AlertCircle
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
      metric: "Projected Procurement Savings",
      target: "$50K - $500K+",
      description: "Estimated counter-cyclical buying opportunities (varies by spend volume)",
    },
    {
      metric: "Projected Accuracy Improvement",
      target: "15-35% MAPE reduction",
      description: "Estimated improvement vs. baseline (results vary by data quality)",
    },
    {
      metric: "Target Time to Insight",
      target: "< 24 hours",
      description: "Goal for market event to actionable recommendation",
    },
    {
      metric: "Target User Adoption",
      target: "> 80%",
      description: "Goal for active usage among provisioned users",
    },
  ];

  const successFeeModel = {
    headline: "Pay Only When You Save",
    subheadline: "Zero upfront costs. We only get paid when you realize verified savings.",
    tiers: [
      { range: "First $250K", percentage: "25%", description: "Of verified procurement savings" },
      { range: "$250K - $500K", percentage: "20%", description: "Reduced rate on additional savings" },
      { range: "Above $500K", percentage: "15%", description: "Best rate for largest outcomes" },
    ],
    included: [
      "Full platform access during pilot",
      "Unlimited SKUs and users",
      "Dedicated success manager",
      "ERP integration support",
      "Weekly optimization reviews",
      "AI assistant capabilities",
      "Quarterly savings attestation",
      "Independent audit rights",
    ],
    verification: [
      "Baseline established from prior 12-month normalized spend",
      "Adjustments for volume, mix, and commodity indices",
      "Monthly tracking with quarterly settlements",
      "Joint sign-off on documented savings",
      "Auditable data from your ERP/procurement systems",
    ],
  };

  const whyPilot = [
    {
      icon: Shield,
      title: "Zero Financial Risk",
      description: "No upfront investment required. You only pay when verified savings are realized.",
    },
    {
      icon: Target,
      title: "Aligned Incentives",
      description: "We earn only a percentage of your savings. Our success depends on your success.",
    },
    {
      icon: Users,
      title: "Full Transparency",
      description: "Joint verification of all savings claims. Independent audit rights included.",
    },
    {
      icon: Zap,
      title: "Fast Time-to-Value",
      description: "Expect first insights within 2 weeks and savings opportunities within 4 weeks.",
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
          <Badge className="mb-4">100% Performance-Based</Badge>
          <h1 className="text-4xl font-bold mb-4">Zero Risk. We Only Win When You Win.</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            No upfront fees. No monthly subscriptions. You pay a percentage of the verified savings we help you achieve — nothing more.
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
          <h2 className="text-2xl font-bold mb-8 text-center">Projected Outcomes</h2>
          <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
            These are estimated results based on typical customer profiles. Actual outcomes vary based on spend volume, data quality, and market conditions.
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

      {/* ROI-Based Pricing */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4" variant="outline">
              <Handshake className="h-3 w-3 mr-1" />
              Performance-Based Partnership
            </Badge>
            <h2 className="text-3xl font-bold mb-4">{successFeeModel.headline}</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {successFeeModel.subheadline}
            </p>
          </div>

          {/* Success Fee Tiers */}
          <Card className="p-8 max-w-4xl mx-auto mb-8" data-testid="card-pricing-tiers">
            <div className="flex items-center gap-2 mb-6">
              <DollarSign className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Tiered Success Fees</h3>
            </div>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {successFeeModel.tiers.map((tier, idx) => (
                <div 
                  key={idx} 
                  className="text-center p-6 rounded-lg bg-muted/50 border"
                  data-testid={`tier-${idx}`}
                >
                  <div className="text-3xl font-bold text-primary mb-2">{tier.percentage}</div>
                  <div className="font-medium mb-1">{tier.range}</div>
                  <div className="text-sm text-muted-foreground">{tier.description}</div>
                </div>
              ))}
            </div>
            <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm">
                <strong>Example:</strong> If we help you save $400K annually, our fee would be{" "}
                <span className="font-semibold text-primary">$92,500</span>{" "}
                (25% of $250K = $62,500 + 20% of $150K = $30,000) — you keep <span className="font-semibold text-green-600">$307,500</span>.
              </p>
            </div>
          </Card>

          {/* What's Included & Verification */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="p-6" data-testid="card-included">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">What's Included</h3>
              </div>
              <ul className="space-y-2">
                {successFeeModel.included.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-6" data-testid="card-verification">
              <div className="flex items-center gap-2 mb-4">
                <FileCheck className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Savings Verification</h3>
              </div>
              <ul className="space-y-2">
                {successFeeModel.verification.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Trust Statement */}
          <div className="text-center mt-8 max-w-2xl mx-auto">
            <p className="text-sm text-muted-foreground">
              <Shield className="h-4 w-4 inline-block mr-1 text-primary" />
              <strong>Our commitment:</strong> If we don't deliver measurable savings, you pay nothing. 
              We succeed only when you succeed.
            </p>
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

      {/* Pilot Readiness Checklist */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4" variant="outline">
              <ClipboardCheck className="h-3 w-3 mr-1" />
              Self-Assessment
            </Badge>
            <h2 className="text-2xl font-bold mb-4">Are You Pilot-Ready?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Check if your organization is positioned to maximize value from a pilot. Most manufacturers who meet these criteria see results within 4 weeks.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Card className="p-8" data-testid="card-readiness-checklist">
              <div className="space-y-6">
                {[
                  {
                    question: "Do you have 12+ months of procurement or purchase order data?",
                    why: "Historical data enables accurate baseline measurement and savings verification.",
                    ideal: true,
                  },
                  {
                    question: "Is your annual procurement spend $1M or more?",
                    why: "Higher spend volumes mean larger absolute savings opportunities.",
                    ideal: true,
                  },
                  {
                    question: "Do you manage at least 100 SKUs or material types?",
                    why: "More SKUs provide better forecasting accuracy and optimization potential.",
                    ideal: true,
                  },
                  {
                    question: "Do you have a dedicated procurement or supply chain team?",
                    why: "A designated point of contact ensures smooth pilot execution.",
                    ideal: true,
                  },
                  {
                    question: "Are you currently experiencing forecast inaccuracies or stockouts?",
                    why: "Existing pain points indicate high improvement potential.",
                    ideal: true,
                  },
                  {
                    question: "Can you export data from your ERP or procurement system?",
                    why: "Data access is essential for integration and baseline establishment.",
                    ideal: true,
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4" data-testid={`readiness-item-${idx}`}>
                    <div className="shrink-0 mt-1">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary">{idx + 1}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium mb-1">{item.question}</p>
                      <p className="text-sm text-muted-foreground">{item.why}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-400">4+ Yes answers?</p>
                    <p className="text-sm text-green-700 dark:text-green-500">
                      You're an excellent candidate for a pilot. Let's discuss your specific situation.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 mt-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-400">Fewer than 4?</p>
                    <p className="text-sm text-amber-700 dark:text-amber-500">
                      We may still be able to help. Book a call to explore options tailored to your situation.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-80" />
          <h2 className="text-2xl font-bold mb-4">Start Saving With Zero Risk</h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Schedule a discovery call to discuss your procurement spend and estimated savings potential. No commitment required.
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
