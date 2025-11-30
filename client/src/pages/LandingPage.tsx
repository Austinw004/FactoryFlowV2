import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Boxes, ShoppingCart, BarChart3, ArrowRight, Check, Factory, Shield, Clock, DollarSign, Zap, Building2, Rocket, LineChart, Truck } from "lucide-react";
import heroImage from "@assets/generated_images/Manufacturing_dashboard_hero_image_d747dc5e.png";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLocation } from "wouter";

export default function LandingPage() {
  const [, setLocation] = useLocation();

  const features = [
    {
      icon: LineChart,
      title: "Intelligent Demand Forecasting",
      description: "Predict future demand with market-aware adjustments that account for economic conditions your competitors miss.",
    },
    {
      icon: Boxes,
      title: "Smart Material Allocation",
      description: "Automatically optimize which products to make based on material availability, priorities, and constraints.",
    },
    {
      icon: DollarSign,
      title: "Counter-Cyclical Procurement",
      description: "Buy materials when prices are low, not when everyone else is buying. Save 15-30% on procurement costs.",
    },
    {
      icon: Truck,
      title: "Supply Chain Intelligence",
      description: "Full visibility into your supplier network with risk scoring, lead times, and automated RFQ generation.",
    },
  ];

  const benefits = [
    { stat: "15-30%", label: "Lower material costs" },
    { stat: "40%", label: "Fewer stockouts" },
    { stat: "2-3x", label: "Faster planning cycles" },
    { stat: "98%", label: "Customer uptime" },
  ];

  const steps = [
    { 
      title: "Connect Your Data", 
      description: "Import your product catalog, bills of materials, and supplier information in minutes" 
    },
    { 
      title: "Get Market Intelligence", 
      description: "Our system analyzes economic conditions to tell you when to buy, hold, or accelerate" 
    },
    { 
      title: "Optimize Operations", 
      description: "Receive actionable recommendations for procurement, production, and inventory" 
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
      features: ["Up to 1,000 SKUs", "25 Users", "Advanced forecasting", "Priority support", "Real-time market signals", "ERP integration", "Supplier risk scoring"],
      highlighted: true,
      icon: Rocket,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "For large-scale operations",
      features: ["Unlimited SKUs", "Unlimited Users", "Custom integrations", "Dedicated support", "On-premise option", "SLA guarantee", "Custom reporting"],
      icon: Building2,
    },
  ];

  const testimonials = [
    {
      quote: "We reduced our material costs by 22% in the first quarter by timing our purchases based on market signals.",
      author: "Operations Director",
      company: "Industrial Components Manufacturer",
    },
    {
      quote: "The demand forecasting accuracy improved our fill rates from 78% to 94%. Game changer for customer satisfaction.",
      author: "Supply Chain Manager",
      company: "Precision Parts Supplier",
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
                <Factory className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg">AllocationIQ</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
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
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <Badge className="mb-4">Trusted by 200+ Manufacturers</Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
                Buy Materials at the <span className="text-primary">Right Time</span>, Not the Wrong Price
              </h1>
              <p className="text-xl text-muted-foreground">
                Most manufacturers buy when prices are high and cut back when they should be stocking up. 
                Our AI-powered platform helps you time your procurement, forecast demand, and allocate materials smarter than your competition.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" asChild data-testid="button-start-free-trial">
                  <a href="/api/login">
                    Start 14-Day Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" onClick={() => setLocation("/pricing")} data-testid="button-view-pricing">
                  View Pricing
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">No credit card required. Full access to all features.</p>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-lg" />
              <div className="relative rounded-lg overflow-hidden border shadow-2xl">
                <img 
                  src={heroImage} 
                  alt="Manufacturing intelligence dashboard" 
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {benefits.map((benefit, idx) => (
              <div key={idx} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">{benefit.stat}</div>
                <div className="text-sm text-muted-foreground">{benefit.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Stop Losing Money on Poor Timing</h2>
            <p className="text-lg text-muted-foreground">
              Traditional procurement follows the herd. When demand is high, everyone buys - driving up prices. 
              When markets slow, companies cut back - missing the best buying opportunities. 
              Our platform analyzes market conditions to help you act before your competitors.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="p-6 border-destructive/30 bg-destructive/5">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
                  <span className="text-destructive font-bold">X</span>
                </div>
                The Old Way
              </h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-destructive">-</span>
                  Buy materials when everyone else is buying (high prices)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive">-</span>
                  React to demand changes after they happen
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive">-</span>
                  Manual allocation decisions based on gut feel
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive">-</span>
                  Stockouts during high demand, excess during slow periods
                </li>
              </ul>
            </Card>
            
            <Card className="p-6 border-primary/30 bg-primary/5">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Check className="h-4 w-4 text-primary" />
                </div>
                The AllocationIQ Way
              </h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-1 shrink-0" />
                  Buy when market conditions favor lower prices
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-1 shrink-0" />
                  Predict demand shifts before they materialize
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-1 shrink-0" />
                  Automated allocation based on priorities and constraints
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-1 shrink-0" />
                  Optimized inventory levels across all conditions
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4">Platform Capabilities</Badge>
            <h2 className="text-3xl font-bold mb-4">Everything You Need to Optimize Manufacturing</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From demand forecasting to supplier management, one platform covers your entire planning process
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <Card key={idx} className="p-6 hover-elevate" data-testid={`card-feature-${idx}`}>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Simple to Get Started</h2>
            <p className="text-lg text-muted-foreground">Three steps to smarter manufacturing operations</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((step, idx) => (
              <div key={idx} className="relative" data-testid={`step-${idx}`}>
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground font-bold text-xl flex items-center justify-center mb-4 shadow-lg">
                    {idx + 1}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
                {idx < steps.length - 1 && (
                  <ArrowRight className="hidden md:block absolute top-7 -right-4 h-6 w-6 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Trusted by Manufacturing Leaders</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {testimonials.map((testimonial, idx) => (
              <Card key={idx} className="p-6">
                <blockquote className="text-lg mb-4">"{testimonial.quote}"</blockquote>
                <div className="text-sm">
                  <div className="font-semibold">{testimonial.author}</div>
                  <div className="text-muted-foreground">{testimonial.company}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
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
                  <a href={plan.name === "Enterprise" ? "mailto:sales@allocationiq.com" : "/api/login"}>
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

      {/* Trust Indicators */}
      <section className="py-16 border-t bg-muted/30">
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

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Optimize Your Manufacturing?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join 200+ manufacturers already saving on procurement and improving their operations.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" asChild>
              <a href="/api/login">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="mailto:sales@allocationiq.com">
                Talk to Sales
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground">Integrations</a></li>
                <li><a href="#" className="hover:text-foreground">Security</a></li>
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
          <div className="mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                <Factory className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">AllocationIQ</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; 2025 AllocationIQ. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
