/**
 * Variant B: "Split Layout" — left-aligned hero with feature grid.
 * Asymmetric, editorial feel. Content breathes.
 * Inspired by Linear/Stripe's landing page style.
 */
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowRight, Eye, Brain, Target, Network, Mail,
  LineChart, Boxes, DollarSign, Truck, Gauge, Layers, Check
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SEOHead } from "@/components/SEOHead";
import { useLocation } from "wouter";

export default function LandingPageVariantB() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Prescient Labs — Manufacturing Intelligence Platform"
        description="Manufacturing intelligence tools for demand forecasting, procurement timing, production optimization, and supply chain visibility."
      />

      {/* Navigation */}
      <nav className="border-b border-border/40 sticky top-0 bg-background/80 backdrop-blur-xl z-50">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-foreground rounded-md flex items-center justify-center">
                <Eye className="h-3.5 w-3.5 text-background" />
              </div>
              <span className="font-semibold text-sm tracking-tight">Prescient Labs</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="/how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">How It Works</a>
              <a href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">Pricing</a>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button variant="ghost" size="sm" asChild>
                  <a href="/signin">Sign In</a>
                </Button>
                <Button size="sm" asChild>
                  <a href="/signup">Get Started</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero — left-aligned */}
      <section className="pt-20 sm:pt-28 pb-20">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-muted-foreground mb-4">Manufacturing Intelligence Platform</p>
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1] mb-5">
              See what's coming. Act before it arrives.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              Prescient connects demand forecasting, procurement timing, production
              optimization, and supply chain visibility into a single platform built
              for manufacturing teams.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="h-11 px-7" asChild>
                <a href="/signup">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="ghost" className="h-11 px-7 text-muted-foreground" onClick={() => setLocation("/how-it-works")}>
                Learn more
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid — 2x2 with detailed cards */}
      <section className="py-20 border-t">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 gap-px bg-border rounded-xl overflow-hidden">
            {[
              {
                icon: Eye,
                title: "Demand Forecasting",
                description: "30/60/90-day demand forecasts from your sales history and economic indicators. Forecasts update as new data arrives.",
                points: ["Upload sales data, get forecasts automatically", "Review weekly to adjust production schedules", "Accuracy tracking over time"],
              },
              {
                icon: Brain,
                title: "Market Intelligence",
                description: "Timing signals based on economic data and commodity trends. Know when to buy aggressively and when to wait.",
                points: ["Daily buy/hold/wait signals", "Based on real economic indicators", "Signals adjust to market shifts"],
              },
              {
                icon: Target,
                title: "Smart Allocation",
                description: "When materials are limited, get clear recommendations on what to produce first for maximum revenue.",
                points: ["Set priorities and constraints", "Run optimizer before each production cycle", "Clear production recommendations"],
              },
              {
                icon: Network,
                title: "Supply Chain Visibility",
                description: "Map your entire supplier network, score risk by supplier, and get alerts before disruptions reach you.",
                points: ["Multi-tier supplier mapping", "Automated risk scoring", "Disruption alerts before impact"],
              },
            ].map((item, idx) => (
              <div key={idx} className="bg-background p-8 lg:p-10">
                <item.icon className="h-5 w-5 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">{item.description}</p>
                <ul className="space-y-2">
                  {item.points.map((point, pidx) => (
                    <li key={pidx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-foreground shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules list */}
      <section className="py-20 border-t bg-muted/20">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <h2 className="text-2xl font-semibold tracking-tight mb-3">Six integrated modules</h2>
            <p className="text-muted-foreground">Everything shares data. Changes in one area automatically flow into recommendations across the platform.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: LineChart, name: "Demand Planning", desc: "Multi-horizon forecasting" },
              { icon: Boxes, name: "Material Allocation", desc: "Constraint-based optimization" },
              { icon: DollarSign, name: "Procurement Timing", desc: "Buy/hold/wait signals" },
              { icon: Truck, name: "Supply Chain Mapping", desc: "Supplier risk visibility" },
              { icon: Gauge, name: "Production Analytics", desc: "OEE and bottleneck tracking" },
              { icon: Layers, name: "Digital Twin", desc: "What-if simulations" },
            ].map((m, idx) => (
              <div key={idx} className="flex items-center gap-3 p-4 rounded-lg border bg-background">
                <m.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Simple pricing row */}
      <section className="py-20 border-t">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight mb-3">Simple, transparent pricing</h2>
          <p className="text-muted-foreground mb-10">Start with a 30-day free trial. Choose a plan when you're ready.</p>
          <div className="grid sm:grid-cols-4 gap-4">
            {[
              { name: "Starter", price: "$299", period: "/mo", note: "500 SKUs" },
              { name: "Growth", price: "$799", period: "/mo", note: "5,000 SKUs" },
              { name: "Usage", price: "$199", period: "/mo+", note: "Metered" },
              { name: "Performance", price: "$100", period: "/mo+", note: "15% savings" },
            ].map((p, idx) => (
              <Card key={idx} className="p-5 flex flex-col">
                <p className="text-sm font-medium mb-2">{p.name}</p>
                <p className="text-2xl font-semibold">{p.price}<span className="text-sm font-normal text-muted-foreground">{p.period}</span></p>
                <p className="text-xs text-muted-foreground mt-1 mb-auto">{p.note}</p>
                <Button variant="outline" size="sm" className="w-full mt-4" asChild>
                  <a href="/signup">Start Trial</a>
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Get help + CTA */}
      <section className="py-20 border-t bg-muted/20">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight mb-2">Ready to get started?</h2>
              <p className="text-muted-foreground">
                Questions? Email us at{" "}
                <a href="mailto:info@prescient-labs.com" className="font-medium text-foreground hover:underline">info@prescient-labs.com</a>
              </p>
            </div>
            <Button size="lg" asChild>
              <a href="/signup">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-foreground rounded flex items-center justify-center">
              <Eye className="h-3 w-3 text-background" />
            </div>
            <span className="text-xs text-muted-foreground">&copy; 2026 Prescient Labs</span>
          </div>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <a href="/how-it-works" className="hover:text-foreground">How It Works</a>
            <a href="/security" className="hover:text-foreground">Security</a>
            <a href="/privacy" className="hover:text-foreground">Privacy</a>
            <a href="/terms" className="hover:text-foreground">Terms</a>
            <a href="mailto:info@prescient-labs.com" className="hover:text-foreground">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
