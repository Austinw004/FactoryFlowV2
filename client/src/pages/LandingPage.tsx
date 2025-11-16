import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Boxes, ShoppingCart, Activity, ArrowRight, Check } from "lucide-react";
import heroImage from "@assets/generated_images/Manufacturing_dashboard_hero_image_d747dc5e.png";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LandingPage() {
  const features = [
    {
      icon: TrendingUp,
      title: "Demand Forecasting",
      description: "AI-powered predictions using dual-circuit economic intelligence and regime-aware adjustments.",
    },
    {
      icon: Boxes,
      title: "Smart Allocation",
      description: "Optimize raw material allocation across SKUs with constraint-based planning and priority weighting.",
    },
    {
      icon: ShoppingCart,
      title: "Counter-Cyclical Procurement",
      description: "Policy signals guide procurement decisions based on economic regime changes and FDR metrics.",
    },
  ];

  const steps = [
    { title: "Connect Your Data", description: "Import SKU history, BOMs, and supplier terms" },
    { title: "AI Generates Forecasts", description: "Cycle-aware demand predictions with regime adjustments" },
    { title: "Optimize Allocation", description: "Material allocation plans with budget constraints" },
  ];

  const plans = [
    {
      name: "Starter",
      price: "$299",
      period: "/month",
      features: ["Up to 50 SKUs", "Basic forecasting", "Email support", "Monthly reports"],
    },
    {
      name: "Professional",
      price: "$799",
      period: "/month",
      features: ["Up to 500 SKUs", "Advanced forecasting", "Priority support", "Real-time FDR", "API access"],
      highlighted: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      features: ["Unlimited SKUs", "Custom integrations", "Dedicated support", "White-label option", "SLA guarantee"],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                <Boxes className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg">Manufacturing AI</span>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Button variant="ghost" asChild data-testid="link-signin">
                <a href="/api/login">Sign In</a>
              </Button>
              <Button asChild data-testid="button-get-started">
                <a href="/api/login">Get Started</a>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <Badge className="mb-4">Powered by Dual-Circuit Economics</Badge>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
                Manufacturing Intelligence That Adapts to Economic Cycles
              </h1>
              <p className="text-lg text-muted-foreground">
                Maximize efficiency with AI-driven demand forecasting, smart material allocation, 
                and counter-cyclical procurement strategies based on real-time economic regime analysis.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" asChild data-testid="button-start-free-trial">
                  <a href="/api/login">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" data-testid="button-watch-demo">
                  Watch Demo
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="relative rounded-lg overflow-hidden border shadow-xl">
                <img 
                  src={heroImage} 
                  alt="Manufacturing dashboard" 
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Intelligent Features for Modern Manufacturing</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Leverage dual-circuit economic intelligence to optimize every aspect of your operations
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <Card key={idx} className="p-6 hover-elevate" data-testid={`card-feature-${idx}`}>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground">Three simple steps to transform your operations</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, idx) => (
              <div key={idx} className="relative" data-testid={`step-${idx}`}>
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-xl flex items-center justify-center mb-4">
                    {idx + 1}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
                {idx < steps.length - 1 && (
                  <ArrowRight className="hidden md:block absolute top-6 -right-4 h-6 w-6 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4">
              <Activity className="h-3 w-3 mr-1" />
              FDR-Powered Intelligence
            </Badge>
            <h2 className="text-3xl font-bold mb-4">Dual-Circuit Economic Framework</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Our proprietary Financial Decoupling Ratio (FDR) monitors the relationship between 
              asset markets and the real economy, providing actionable signals for inventory, 
              procurement, and capital allocation decisions.
            </p>
          </div>
          
          <Card className="p-8 max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-lg mb-4">Economic Regimes</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-chart-2 mt-0.5" />
                    <div>
                      <span className="font-medium">Healthy Expansion:</span>
                      <span className="text-sm text-muted-foreground ml-1">Balanced growth signals</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-chart-4 mt-0.5" />
                    <div>
                      <span className="font-medium">Asset-Led Growth:</span>
                      <span className="text-sm text-muted-foreground ml-1">Moderate caution advised</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-destructive mt-0.5" />
                    <div>
                      <span className="font-medium">Imbalanced Excess:</span>
                      <span className="text-sm text-muted-foreground ml-1">Risk mitigation mode</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-chart-1 mt-0.5" />
                    <div>
                      <span className="font-medium">Real Economy Lead:</span>
                      <span className="text-sm text-muted-foreground ml-1">Counter-cyclical opportunity</span>
                    </div>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-4">Policy Signals</h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-chart-1" />
                    Inventory buffer adjustments
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-chart-2" />
                    Credit term optimization
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-chart-3" />
                    Capital expenditure timing
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-chart-4" />
                    Procurement strategy shifts
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-chart-5" />
                    Supplier relationship management
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-muted-foreground">Choose the plan that fits your needs</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, idx) => (
              <Card 
                key={idx} 
                className={`p-6 ${plan.highlighted ? 'border-primary shadow-lg' : ''}`}
                data-testid={`card-plan-${plan.name.toLowerCase()}`}
              >
                {plan.highlighted && (
                  <Badge className="mb-4">Most Popular</Badge>
                )}
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold font-mono">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, featureIdx) => (
                    <li key={featureIdx} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full" 
                  variant={plan.highlighted ? "default" : "outline"}
                  data-testid={`button-select-${plan.name.toLowerCase()}`}
                >
                  {plan.name === "Enterprise" ? "Contact Sales" : "Start Trial"}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Features</a></li>
                <li><a href="#" className="hover:text-foreground">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">About</a></li>
                <li><a href="#" className="hover:text-foreground">Careers</a></li>
                <li><a href="#" className="hover:text-foreground">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Documentation</a></li>
                <li><a href="#" className="hover:text-foreground">Blog</a></li>
                <li><a href="#" className="hover:text-foreground">Case Studies</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground">Terms</a></li>
                <li><a href="#" className="hover:text-foreground">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>&copy; 2025 Manufacturing AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
