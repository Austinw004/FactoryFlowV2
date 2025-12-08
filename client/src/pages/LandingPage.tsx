import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, Boxes, ShoppingCart, BarChart3, ArrowRight, Check, Factory, 
  Shield, Clock, DollarSign, Zap, Building2, Rocket, LineChart, Truck,
  Eye, Brain, Gauge, Network, AlertTriangle, Sparkles, Target, Layers
} from "lucide-react";
import heroImage from "@assets/Screenshot_2025-12-06_at_2.06.49_pm_1765051647586.png";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLocation } from "wouter";

export default function LandingPage() {
  const [, setLocation] = useLocation();

  const coreCapabilities = [
    {
      icon: Eye,
      title: "See What's Coming",
      subtitle: "Demand Forecasting",
      description: "Predict future demand before it materializes. Our system learns your patterns and adjusts for market conditions your competitors don't see.",
    },
    {
      icon: Brain,
      title: "Know When to Act",
      subtitle: "Market Intelligence",
      description: "Real-time signals tell you when to buy, hold, or accelerate. Stop reacting to markets - start anticipating them.",
    },
    {
      icon: Target,
      title: "Optimize Every Decision",
      subtitle: "Smart Allocation",
      description: "Automatically determine what to make, when to make it, and how to allocate limited materials across priorities.",
    },
    {
      icon: Network,
      title: "Protect Your Supply Chain",
      subtitle: "Supplier Intelligence",
      description: "Score supplier risk, map dependencies, and get alerts before disruptions hit. Full visibility from raw materials to delivery.",
    },
  ];

  const platformModules = [
    {
      icon: LineChart,
      name: "Demand Planning",
      description: "Multi-horizon forecasting with automated model retraining",
    },
    {
      icon: Boxes,
      name: "Material Allocation",
      description: "Constraint-based optimization across your product mix",
    },
    {
      icon: DollarSign,
      name: "Procurement Timing",
      description: "Counter-cyclical buying signals to reduce material costs",
    },
    {
      icon: Truck,
      name: "Supply Chain Mapping",
      description: "Multi-tier supplier visibility with risk scoring",
    },
    {
      icon: Gauge,
      name: "Production Analytics",
      description: "Real-time OEE, bottleneck detection, and efficiency tracking",
    },
    {
      icon: Layers,
      name: "Digital Twin",
      description: "Live operational snapshot with what-if simulations",
    },
  ];

  const platformStats = [
    { stat: "110+", label: "Commodity prices tracked" },
    { stat: "4", label: "Economic regimes detected" },
    { stat: "Multi-horizon", label: "Demand forecasting" },
    { stat: "Real-time", label: "Market intelligence" },
  ];

  const differentiators = [
    {
      title: "Proactive, Not Reactive",
      description: "While others scramble to respond to market changes, you're already positioned. Our intelligence engine spots opportunities and risks before they're obvious.",
    },
    {
      title: "Unified Operations View",
      description: "Demand, supply, production, and procurement - all connected. No more siloed spreadsheets or disconnected systems. One platform, one truth.",
    },
    {
      title: "Continuous Learning",
      description: "Our models don't just run once. They continuously retrain on your data, improving accuracy over time and adapting to your business rhythms.",
    },
  ];

  const plans = [
    {
      name: "Starter",
      price: "$299",
      period: "/month",
      description: "For growing manufacturers",
      features: ["Up to 100 SKUs", "5 Users", "Core forecasting", "Email support", "Monthly market reports"],
      icon: Zap,
    },
    {
      name: "Professional",
      price: "$799",
      period: "/month",
      description: "For established operations",
      features: ["Up to 1,000 SKUs", "25 Users", "Advanced forecasting", "Priority support", "Real-time signals", "ERP integration", "Supplier risk scoring"],
      highlighted: true,
      icon: Rocket,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "For large-scale operations",
      features: ["Unlimited SKUs", "Unlimited Users", "Custom integrations", "Dedicated support", "On-premise option", "SLA guarantee", "Digital twin"],
      icon: Building2,
    },
  ];

  
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                <Eye className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg">Prescient Labs</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#capabilities" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Capabilities</a>
              <a href="#platform" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Platform</a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Button variant="ghost" asChild data-testid="link-signin">
                <a href="/api/login">Sign In</a>
              </Button>
              <Button asChild data-testid="button-get-started">
                <a href="/api/login">Start Free Trial</a>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Text content centered */}
          <div className="max-w-3xl mx-auto text-center space-y-8 mb-16">
            <Badge className="mb-4">Manufacturing Intelligence Platform</Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              See Ahead. <span className="text-primary">Act First.</span> Dominate.
            </h1>
            <p className="text-xl text-muted-foreground">
              Prescient Labs gives manufacturers the foresight to make smarter decisions - 
              from predicting demand and timing purchases to optimizing production and protecting supply chains.
              Stop reacting to the market. Start anticipating it.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" asChild data-testid="button-start-free-trial">
                <a href="/api/login">
                  Start 14-Day Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" onClick={() => setLocation("/how-it-works")} data-testid="button-how-it-works">
                See How It Works
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">No credit card required. Full platform access.</p>
          </div>
          
          {/* Hero image below text content */}
          <div className="relative max-w-5xl mx-auto">
            {/* Marketing-style presentation with gradient background */}
            <div className="absolute -inset-4 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent rounded-3xl blur-2xl" />
            <div className="relative">
              {/* Clean app screenshot with professional framing */}
              <div className="rounded-xl overflow-hidden border-2 border-border/50 shadow-2xl">
                <img 
                  src={heroImage} 
                  alt="Prescient Labs AI Assistant - Autonomous manufacturing intelligence" 
                  className="w-full h-auto"
                  data-testid="img-hero-screenshot"
                />
              </div>
              {/* Floating badge */}
              <div className="absolute -bottom-4 -right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
                <Sparkles className="h-4 w-4 inline mr-2" />
                AI-Powered
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {platformStats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">{stat.stat}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section id="capabilities" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4">Core Capabilities</Badge>
            <h2 className="text-3xl font-bold mb-4">Intelligence Across Your Entire Operation</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Four interconnected pillars that transform how you plan, procure, produce, and protect your manufacturing business
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {coreCapabilities.map((capability, idx) => (
              <Card key={idx} className="p-8 hover-elevate" data-testid={`card-capability-${idx}`}>
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <capability.icon className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-primary font-medium mb-1">{capability.subtitle}</div>
                    <h3 className="text-xl font-semibold mb-2">{capability.title}</h3>
                    <p className="text-muted-foreground">{capability.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiators */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Why Manufacturers Choose Prescient</h2>
            <p className="text-lg text-muted-foreground">
              It's not just another dashboard. It's a fundamentally different approach to manufacturing intelligence.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {differentiators.map((diff, idx) => (
              <div key={idx} className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{diff.title}</h3>
                <p className="text-muted-foreground">{diff.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Modules */}
      <section id="platform" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4">Complete Platform</Badge>
            <h2 className="text-3xl font-bold mb-4">Everything You Need, Connected</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Six integrated modules that share data and insights, giving you unprecedented visibility and control
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {platformModules.map((module, idx) => (
              <Card key={idx} className="p-6 hover-elevate" data-testid={`card-module-${idx}`}>
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <module.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">{module.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{module.description}</p>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button variant="outline" onClick={() => setLocation("/how-it-works")}>
              Explore All Features
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">The Intelligence Gap</h2>
            <p className="text-lg text-muted-foreground">
              Most manufacturers operate with fragmented data, reactive decisions, and limited visibility. 
              Prescient closes that gap.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="p-6 border-destructive/30 bg-destructive/5">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                Operating Blind
              </h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-destructive">-</span>
                  Forecasts based on last year's numbers, ignoring market shifts
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive">-</span>
                  Buying materials when prices are already high
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive">-</span>
                  Supply chain surprises that halt production
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive">-</span>
                  Decisions spread across disconnected spreadsheets
                </li>
              </ul>
            </Card>
            
            <Card className="p-6 border-primary/30 bg-primary/5">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Eye className="h-4 w-4 text-primary" />
                </div>
                Operating with Foresight
              </h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-1 shrink-0" />
                  Forecasts that adapt to current market conditions
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-1 shrink-0" />
                  Timing signals that tell you when to buy
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-1 shrink-0" />
                  Supplier risks identified before they impact you
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-1 shrink-0" />
                  One unified platform for all planning decisions
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-16 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Enterprise Security</h3>
                <p className="text-sm text-muted-foreground">
                  SOC 2 Type II compliant. Your data is encrypted at rest and in transit.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                <Clock className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Quick Setup</h3>
                <p className="text-sm text-muted-foreground">
                  Get started in under 30 minutes. Import data from any ERP system.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900 flex items-center justify-center shrink-0">
                <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Proven Results</h3>
                <p className="text-sm text-muted-foreground">
                  Average customer sees ROI within 90 days of implementation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-muted-foreground">Start with a 14-day free trial. No credit card required.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, idx) => (
              <Card 
                key={idx} 
                className={`p-6 flex flex-col ${plan.highlighted ? 'border-primary shadow-lg ring-2 ring-primary/20' : ''}`}
                data-testid={`card-plan-${plan.name.toLowerCase()}`}
              >
                {plan.highlighted && (
                  <Badge className="mb-4 self-start">Most Popular</Badge>
                )}
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <plan.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-6 flex-1">
                  {plan.features.map((feature, featureIdx) => (
                    <li key={featureIdx} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full" 
                  variant={plan.highlighted ? "default" : "outline"}
                  asChild
                  data-testid={`button-select-${plan.name.toLowerCase()}`}
                >
                  <a href={plan.name === "Enterprise" ? "mailto:sales@prescientlabs.ai" : "/api/login"}>
                    {plan.name === "Enterprise" ? "Contact Sales" : "Start Free Trial"}
                  </a>
                </Button>
              </Card>
            ))}
          </div>
          
          <div className="mt-12 text-center">
            <Button variant="ghost" onClick={() => setLocation("/pricing")} className="text-primary">
              Compare all features in detail
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to See What's Coming?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join the manufacturers who've stopped guessing and started knowing.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" asChild>
              <a href="/api/login">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="mailto:sales@prescientlabs.ai">
                Talk to Sales
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#capabilities" className="hover:text-foreground">Capabilities</a></li>
                <li><a href="#platform" className="hover:text-foreground">Modules</a></li>
                <li><a href="#pricing" className="hover:text-foreground">Pricing</a></li>
                <li><a href="/integration-checklist" className="hover:text-foreground" data-testid="link-integrations">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Sales</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/pilot-program" className="hover:text-foreground" data-testid="link-pilot">Pilot Program</a></li>
                <li><a href="/roi-calculator" className="hover:text-foreground" data-testid="link-roi">ROI Calculator</a></li>
                <li><a href="mailto:sales@prescientlabs.ai" className="hover:text-foreground">Contact Sales</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/how-it-works" className="hover:text-foreground">How It Works</a></li>
                <li><a href="/security" className="hover:text-foreground" data-testid="link-security-faq">Security FAQ</a></li>
                <li><a href="/pricing" className="hover:text-foreground">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/privacy" className="hover:text-foreground" data-testid="link-privacy">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-foreground" data-testid="link-terms">Terms of Service</a></li>
                <li><a href="/security" className="hover:text-foreground">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                <Eye className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">Prescient Labs</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; 2025 Prescient Labs. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
