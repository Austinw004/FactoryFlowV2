import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp, Boxes, ShoppingCart, BarChart3, ArrowRight, Check, Factory,
  Shield, Clock, DollarSign, Zap, Building2, Rocket, LineChart, Truck,
  Eye, Brain, Gauge, Network, AlertTriangle, Sparkles, Target, Layers,
  CreditCard, Percent, Mail
} from "lucide-react";
import heroImage from "@assets/Screenshot_2025-12-06_at_2.06.49_pm_1765051647586.png";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SEOHead } from "@/components/SEOHead";
import { useLocation } from "wouter";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [pricingModel, setPricingModel] = useState<"subscription" | "performance">("performance");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  const coreCapabilities = [
    {
      icon: Eye,
      title: "See What's Coming",
      subtitle: "Demand Forecasting",
      description: "Generate demand forecasts based on your sales history and current economic indicators.",
      howToUse: "Upload your sales history, add your products, and the platform automatically generates 30/60/90-day forecasts. Review weekly to adjust production schedules.",
      keyBenefit: "Demand visibility to inform production and inventory decisions",
    },
    {
      icon: Brain,
      title: "Know When to Act",
      subtitle: "Market Intelligence",
      description: "Receive buying signals based on economic data and commodity price trends. Signals update as market conditions change.",
      howToUse: "Check your dashboard daily for the current market signal. Green means buy aggressively, yellow means proceed normally, red means preserve cash and wait.",
      keyBenefit: "Data-driven timing signals for procurement decisions",
    },
    {
      icon: Target,
      title: "Optimize Every Decision",
      subtitle: "Smart Allocation",
      description: "Determine what to make, when to make it, and how to allocate limited materials across priorities.",
      howToUse: "Set your product priorities and constraints, then run the optimizer before each production cycle. Get clear recommendations on what to produce first.",
      keyBenefit: "Maximize revenue from limited materials during supply constraints",
    },
    {
      icon: Network,
      title: "Protect Your Supply Chain",
      subtitle: "Supplier Intelligence",
      description: "Score supplier risk, map dependencies, and get alerts before disruptions hit. Full visibility from raw materials to delivery.",
      howToUse: "Add your suppliers with location and material data. The platform monitors risks and alerts you to potential disruptions before they impact production.",
      keyBenefit: "Identify supply chain vulnerabilities before they become crises",
    },
  ];

  const platformModules = [
    {
      icon: LineChart,
      name: "Demand Planning",
      description: "Multi-horizon forecasting with model accuracy tracking",
      details: "30/60/90-day forecasts that improve as you add more sales data",
    },
    {
      icon: Boxes,
      name: "Material Allocation",
      description: "Constraint-based optimization across your product mix",
      details: "Input your priorities and constraints, get optimal production recommendations",
    },
    {
      icon: DollarSign,
      name: "Procurement Timing",
      description: "Counter-cyclical buying signals to reduce material costs",
      details: "Clear buy/hold/wait signals based on market conditions and your inventory",
    },
    {
      icon: Truck,
      name: "Supply Chain Mapping",
      description: "Multi-tier supplier visibility with risk scoring",
      details: "Visual network map showing all supplier dependencies and risk hotspots",
    },
    {
      icon: Gauge,
      name: "Production Analytics",
      description: "Real-time OEE, bottleneck detection, and efficiency tracking",
      details: "Monitor availability, performance, and quality with automatic alerts",
    },
    {
      icon: Layers,
      name: "Digital Twin",
      description: "Live operational snapshot with what-if simulations",
      details: "Ask questions in plain English and run scenarios without affecting real data",
    },
  ];

  const differentiators = [
    {
      title: "Forward-Looking Signals",
      description: "The platform analyzes economic indicators and market data to generate procurement timing signals before price movements become apparent in spot markets.",
    },
    {
      title: "Unified Operations View",
      description: "Demand, supply, production, and procurement data in one platform. Replace disconnected spreadsheets with a single source of operational data.",
    },
    {
      title: "Built for Manufacturers",
      description: "Purpose-built for manufacturing operations — not a generic analytics tool adapted to the factory floor. Every feature is designed for how manufacturers work.",
    },
  ];

  const subscriptionPlans = [
    {
      name: "Starter",
      monthlyPrice: "$299",
      annualPrice: "$2,990",
      monthlyPeriod: "/month",
      annualPeriod: "/year",
      annualNote: "$249/mo",
      skus: "Up to 500 SKUs",
      description: "Demand forecasting and procurement optimization for growing manufacturers",
      highlighted: false,
      icon: Rocket,
    },
    {
      name: "Growth",
      monthlyPrice: "$799",
      annualPrice: "$7,990",
      monthlyPeriod: "/month",
      annualPeriod: "/year",
      annualNote: "$666/mo",
      skus: "Up to 5,000 SKUs",
      description: "Full platform access with advanced supply chain intelligence",
      highlighted: true,
      icon: Building2,
    },
  ];

  const performancePlans = [
    {
      name: "Usage-Based",
      price: "$199",
      period: "/month + metered",
      description: "Start low and scale — pay for exactly what you consume",
      highlighted: false,
      icon: Zap,
    },
    {
      name: "Performance",
      price: "$100",
      period: "/month + 15% of savings",
      description: "Pay only on verified, measured savings — never on estimates",
      highlighted: true,
      icon: DollarSign,
    },
  ];


  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Prescient Labs — Manufacturing Intelligence Platform"
        description="Manufacturing intelligence tools for demand forecasting, procurement timing, production optimization, and supply chain visibility."
      />
      {/* Navigation */}
      <nav className="border-b border-border/40 sticky top-0 bg-background/80 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                <Eye className="h-4.5 w-4.5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg tracking-tight">Prescient Labs</span>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button variant="ghost" size="sm" asChild data-testid="link-signin">
                <a href="/signin">Sign In</a>
              </Button>
              <Button size="sm" className="shadow-sm" asChild data-testid="button-get-started">
                <a href="/signup">Start Free Trial</a>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 sm:pt-28 pb-16 sm:pb-24">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* Text content centered */}
          <div className="max-w-3xl mx-auto text-center space-y-6 mb-16">
            <Badge variant="secondary" className="text-xs font-medium tracking-wide px-3 py-1">Manufacturing Intelligence Platform</Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
              See Ahead. <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Act First.</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Manufacturing intelligence tools for demand forecasting,
              procurement timing, production optimization, and supply chain visibility.
            </p>
            <div className="flex flex-wrap gap-3 justify-center pt-4">
              <Button size="lg" className="h-12 px-8 shadow-md" asChild data-testid="button-start-free-trial">
                <a href="/signup">
                  Start 30-Day Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8" onClick={() => setLocation("/how-it-works")} data-testid="button-how-it-works">
                See How It Works
              </Button>
            </div>
            <p className="text-sm text-muted-foreground/70">No credit card required. Full platform access.</p>
          </div>

          {/* Hero image below text content */}
          <div className="relative max-w-5xl mx-auto mb-16">
            {/* Marketing-style presentation with gradient background */}
            <div className="absolute -inset-6 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent rounded-3xl blur-3xl opacity-60" />
            <div className="relative">
              {/* Clean app screenshot with professional framing */}
              <div className="rounded-2xl overflow-hidden border border-border/60 shadow-2xl ring-1 ring-black/5 dark:ring-white/5">
                <img
                  src={heroImage}
                  alt="Prescient Labs AI Assistant - Manufacturing intelligence platform"
                  className="w-full h-auto"
                  data-testid="img-hero-screenshot"
                />
              </div>
            </div>
          </div>

          {/* Pricing Options below Hero Image */}
          <div id="pricing" className="w-full max-w-5xl mx-auto text-center">
            <Tabs value={pricingModel} onValueChange={(v) => setPricingModel(v as "subscription" | "performance")} className="w-full">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
                <TabsTrigger value="subscription" className="flex items-center gap-2" data-testid="tab-hero-subscription">
                  <CreditCard className="h-4 w-4" />
                  Fixed Subscription
                </TabsTrigger>
                <TabsTrigger value="performance" className="flex items-center gap-2" data-testid="tab-hero-performance">
                  <Percent className="h-4 w-4" />
                  Performance-Based
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Subscription Plans */}
            {pricingModel === "subscription" && (
              <>
                <div className="flex items-center justify-center gap-3 mb-5">
                  <span className={`text-sm ${billingPeriod === "monthly" ? "font-semibold" : "text-muted-foreground"}`}>Monthly</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={billingPeriod === "annual"}
                    onClick={() => setBillingPeriod(billingPeriod === "monthly" ? "annual" : "monthly")}
                    data-testid="toggle-billing-period"
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${billingPeriod === "annual" ? "bg-primary" : "bg-muted"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${billingPeriod === "annual" ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                  <span className={`text-sm ${billingPeriod === "annual" ? "font-semibold" : "text-muted-foreground"}`}>
                    Annual
                  </span>
                </div>
                <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                  {subscriptionPlans.map((plan, idx) => (
                    <Card
                      key={idx}
                      className={`p-5 flex flex-col text-left ${plan.highlighted ? 'border-primary shadow-lg ring-2 ring-primary/20' : ''}`}
                      data-testid={`card-hero-plan-${plan.name.toLowerCase()}`}
                    >
                      {plan.highlighted && (
                        <Badge className="mb-3 self-start">Most Popular</Badge>
                      )}
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                          <plan.icon className="h-4 w-4 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold">{plan.name}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{plan.description}</p>
                      <div className="mb-1">
                        <span className="text-3xl font-bold">{billingPeriod === "annual" ? plan.annualPrice : plan.monthlyPrice}</span>
                        <span className="text-muted-foreground text-sm">{billingPeriod === "annual" ? plan.annualPeriod : plan.monthlyPeriod}</span>
                      </div>
                      {billingPeriod === "annual" && (
                        <p className="text-xs text-muted-foreground mb-4">{plan.annualNote}</p>
                      )}
                      {billingPeriod === "monthly" && <div className="mb-4" />}
                      <p className="flex items-center gap-2 text-sm font-medium mb-4 flex-1">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        {plan.skus}
                      </p>
                      <Button
                        className="w-full"
                        size="sm"
                        variant={plan.highlighted ? "default" : "outline"}
                        asChild
                        data-testid={`button-hero-select-${plan.name.toLowerCase()}`}
                      >
                        <a href="/signup">Start Free Trial</a>
                      </Button>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {/* Performance-Based Plans */}
            {pricingModel === "performance" && (
              <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                {performancePlans.map((plan, idx) => (
                  <Card
                    key={idx}
                    className={`p-5 flex flex-col text-left ${plan.highlighted ? 'border-primary shadow-lg ring-2 ring-primary/20' : ''}`}
                    data-testid={`card-hero-plan-${plan.name.toLowerCase().replace(" ", "-")}`}
                  >
                    {plan.highlighted && (
                      <Badge className="mb-3 self-start">Best Value</Badge>
                    )}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                        <plan.icon className="h-4 w-4 text-primary" />
                      </div>
                      <h3 className="text-xl font-bold">{plan.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{plan.description}</p>
                    <div className="mb-4">
                      <span className="text-3xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    </div>
                    <div className="flex-1" />
                    <Button
                      className="w-full"
                      size="sm"
                      variant={plan.highlighted ? "default" : "outline"}
                      asChild
                      data-testid={`button-hero-select-${plan.name.toLowerCase().replace(" ", "-")}`}
                    >
                      <a href="/signup">Start Free Trial</a>
                    </Button>
                  </Card>
                ))}
              </div>
            )}

            <div className="mt-4 text-center">
              <Button variant="ghost" onClick={() => setLocation("/pricing")} className="text-primary text-sm">
                See full pricing details & savings calculator
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section id="capabilities" className="pt-20 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <Badge variant="secondary" className="mb-4 text-xs font-medium tracking-wide px-3 py-1">Core Capabilities</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight">Intelligence Across Your Entire Operation</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Four interconnected pillars that transform how you plan, procure, produce, and protect your manufacturing business
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {coreCapabilities.map((capability, idx) => (
              <Card key={idx} className="p-6 hover-elevate" data-testid={`card-capability-${idx}`}>
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <capability.icon className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-primary font-medium mb-1">{capability.subtitle}</div>
                    <h3 className="text-xl font-semibold mb-2">{capability.title}</h3>
                    <p className="text-muted-foreground mb-4">{capability.description}</p>
                    <div className="space-y-3 pt-3 border-t">
                      <div>
                        <p className="text-xs font-medium text-primary uppercase tracking-wide mb-1">How to Use</p>
                        <p className="text-sm text-muted-foreground">{capability.howToUse}</p>
                      </div>
                      <div className="flex items-center gap-2 bg-primary/5 rounded-lg p-3">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <p className="text-sm font-medium">{capability.keyBenefit}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiators */}
      <section className="py-20 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight">Why Manufacturers Choose Prescient</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              A fundamentally different approach to manufacturing intelligence.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {differentiators.map((diff, idx) => (
              <div key={idx} className="text-center px-2">
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-primary/8 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{diff.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{diff.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Modules */}
      <section id="platform" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <Badge variant="secondary" className="mb-4 text-xs font-medium tracking-wide px-3 py-1">Complete Platform</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight">Everything You Need, Connected</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
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
                <p className="text-sm text-muted-foreground mb-3">{module.description}</p>
                <p className="text-xs text-primary/80 border-t pt-3">{module.details}</p>
              </Card>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Button variant="outline" onClick={() => setLocation("/how-it-works")}>
              Explore All Features
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">The Intelligence Gap</h2>
            <p className="text-lg text-muted-foreground">
              Most manufacturers operate with fragmented data, reactive decisions, and limited visibility.
              Prescient closes that gap.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
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
      <section className="py-14 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Enterprise-Grade Security</h3>
                <p className="text-sm text-muted-foreground">
                  Your data is encrypted at rest and in transit. Role-based access controls included.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                <Clock className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Fast Onboarding</h3>
                <p className="text-sm text-muted-foreground">
                  Self-service setup with guided onboarding. Import your data and get started quickly.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900 flex items-center justify-center shrink-0">
                <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Designed for ROI</h3>
                <p className="text-sm text-muted-foreground">
                  Built to deliver measurable procurement savings through better timing decisions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Get Help Section */}
      <section className="py-16 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-3 tracking-tight">Need Help?</h2>
            <p className="text-muted-foreground mb-6">
              Have questions about Prescient, need help getting started, or want to talk about how the platform fits your operation? Reach out — we're here to help.
            </p>
            <div className="inline-flex items-center gap-3 bg-background rounded-xl border px-6 py-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-xs text-muted-foreground">Email us at</p>
                <a href="mailto:info@prescient-labs.com" className="font-semibold text-primary hover:underline">
                  info@prescient-labs.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-primary/[0.02] pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight">Ready to See What's Coming?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
            Start making procurement decisions informed by real economic data.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" className="h-12 px-8 shadow-md" asChild>
              <a href="/signup">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8" asChild>
              <a href="mailto:info@prescient-labs.com">
                Talk to Us
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12 bg-muted/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-semibold text-sm mb-3">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#capabilities" className="hover:text-foreground">Capabilities</a></li>
                <li><a href="#platform" className="hover:text-foreground">Modules</a></li>
                <li><a href="#pricing" className="hover:text-foreground">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/pilot-program" className="hover:text-foreground" data-testid="link-pilot">Pilot Program</a></li>
                <li><a href="/roi-calculator" className="hover:text-foreground" data-testid="link-roi">ROI Calculator</a></li>
                <li><a href="mailto:info@prescient-labs.com" className="hover:text-foreground">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/how-it-works" className="hover:text-foreground">How It Works</a></li>
                <li><a href="/security" className="hover:text-foreground" data-testid="link-security-faq">Security FAQ</a></li>
                <li><a href="/pricing" className="hover:text-foreground">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/privacy" className="hover:text-foreground" data-testid="link-privacy">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-foreground" data-testid="link-terms">Terms of Service</a></li>
                <li><a href="/security" className="hover:text-foreground">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-border/40 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                <Eye className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sm">Prescient Labs</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; 2026 Prescient Labs. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
