/**
 * Variant A: "Dark Hero" — dark hero section with light body.
 * Bold, confident feel. Dark header/hero with a single strong CTA.
 * Clean white content sections below.
 */
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowRight, Eye, Brain, Target, Network, Mail,
  LineChart, Boxes, DollarSign, Truck, Gauge, Layers
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SEOHead } from "@/components/SEOHead";
import { useLocation } from "wouter";

export default function LandingPageVariantA() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen">
      <SEOHead
        title="Prescient Labs — Manufacturing Intelligence Platform"
        description="Manufacturing intelligence tools for demand forecasting, procurement timing, production optimization, and supply chain visibility."
      />

      {/* Dark hero section */}
      <div className="bg-foreground text-background">
        {/* Navigation */}
        <nav className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-background rounded-lg flex items-center justify-center">
                <Eye className="h-4 w-4 text-foreground" />
              </div>
              <span className="font-semibold text-base tracking-tight">Prescient Labs</span>
            </div>
            <div className="flex items-center gap-3">
              <a href="/signin" className="text-sm text-background/70 hover:text-background transition-colors">Sign In</a>
              <Button size="sm" variant="secondary" asChild>
                <a href="/signup">Get Started</a>
              </Button>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="pt-20 pb-24 sm:pt-28 sm:pb-32">
          <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.08] mb-6">
              Plan ahead with manufacturing intelligence
            </h1>
            <p className="text-lg text-background/60 max-w-xl mx-auto leading-relaxed mb-10">
              Demand forecasting, procurement timing, production optimization, and supply chain visibility — connected in one platform.
            </p>
            <Button size="lg" variant="secondary" className="h-12 px-8" asChild>
              <a href="/signup">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <p className="text-sm text-background/40 mt-4">30 days free. No credit card required.</p>
          </div>
        </section>
      </div>

      {/* Light content sections */}
      <div className="bg-background">
        {/* Capabilities — two-column with numbers */}
        <section className="py-24">
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            <div className="grid sm:grid-cols-2 gap-x-16 gap-y-12">
              {[
                { num: "01", icon: Eye, title: "Demand Forecasting", description: "Generate 30/60/90-day demand forecasts from your sales data and economic indicators." },
                { num: "02", icon: Brain, title: "Market Intelligence", description: "Procurement timing signals based on real economic data and commodity price trends." },
                { num: "03", icon: Target, title: "Smart Allocation", description: "Optimize what to produce and when, especially during material shortages." },
                { num: "04", icon: Network, title: "Supply Chain Visibility", description: "Map supplier dependencies, score risk, and get disruption alerts." },
              ].map((item, idx) => (
                <div key={idx} className="flex gap-5">
                  <span className="text-3xl font-light text-muted-foreground/30 tabular-nums">{item.num}</span>
                  <div>
                    <h3 className="font-medium mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Modules strip */}
        <section className="py-16 border-t border-b bg-muted/20">
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-6 text-center">
              {[
                { icon: LineChart, name: "Demand Planning" },
                { icon: Boxes, name: "Allocation" },
                { icon: DollarSign, name: "Procurement" },
                { icon: Truck, name: "Supply Chain" },
                { icon: Gauge, name: "Analytics" },
                { icon: Layers, name: "Digital Twin" },
              ].map((m, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2">
                  <m.icon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">{m.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-24">
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            <h2 className="text-2xl font-semibold tracking-tight mb-10">Pricing</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { name: "Starter", price: "$299/mo", note: "Up to 500 SKUs" },
                { name: "Growth", price: "$799/mo", note: "Up to 5,000 SKUs" },
                { name: "Usage-Based", price: "$199/mo+", note: "Metered usage" },
                { name: "Performance", price: "$100/mo+", note: "15% of savings" },
              ].map((plan, idx) => (
                <Card key={idx} className="p-5">
                  <p className="text-sm font-medium">{plan.name}</p>
                  <p className="text-xl font-semibold mt-2">{plan.price}</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">{plan.note}</p>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <a href="/signup">Start Trial</a>
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Get Help */}
        <section className="py-16 border-t">
          <div className="max-w-5xl mx-auto px-6 lg:px-8 flex items-center gap-4">
            <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">Need help? Reach us at</p>
              <a href="mailto:info@prescient-labs.com" className="font-medium hover:underline">info@prescient-labs.com</a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t py-8">
          <div className="max-w-5xl mx-auto px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <span className="text-xs text-muted-foreground">&copy; 2026 Prescient Labs</span>
            <div className="flex gap-6 text-xs text-muted-foreground">
              <a href="/how-it-works" className="hover:text-foreground">How It Works</a>
              <a href="/pricing" className="hover:text-foreground">Pricing</a>
              <a href="/privacy" className="hover:text-foreground">Privacy</a>
              <a href="/terms" className="hover:text-foreground">Terms</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
