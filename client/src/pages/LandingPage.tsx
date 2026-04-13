import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowRight, Eye, Brain, Target, Network, Mail,
  LineChart, Boxes, DollarSign, Truck, Gauge, Layers
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SEOHead } from "@/components/SEOHead";
import { useLocation } from "wouter";

export default function LandingPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Prescient Labs — Manufacturing Intelligence Platform"
        description="Manufacturing intelligence tools for demand forecasting, procurement timing, production optimization, and supply chain visibility."
      />

      {/* Navigation — clean, minimal */}
      <nav className="border-b border-border/40 sticky top-0 bg-background/80 backdrop-blur-xl z-50">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-foreground rounded-lg flex items-center justify-center">
                <Eye className="h-4 w-4 text-background" />
              </div>
              <span className="font-semibold text-base tracking-tight">Prescient Labs</span>
            </div>
            <div className="flex items-center gap-3">
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
      </nav>

      {/* Hero — clean, lots of whitespace */}
      <section className="pt-24 sm:pt-32 pb-20 sm:pb-28">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-semibold tracking-tight leading-[1.1] mb-6">
            Manufacturing intelligence{" "}
            <span className="text-muted-foreground">that helps you plan ahead</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed mb-10">
            Demand forecasting, procurement timing, production optimization, and
            supply chain visibility — in one platform built for manufacturers.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button size="lg" className="h-11 px-7" asChild>
              <a href="/signup">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="h-11 px-7" onClick={() => setLocation("/how-it-works")}>
              How It Works
            </Button>
          </div>
          <p className="text-sm text-muted-foreground/60 mt-4">30-day free trial. No credit card required.</p>
        </div>
      </section>

      {/* What Prescient Does — honest, clear */}
      <section className="py-20 border-t">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="max-w-2xl mb-16">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-4">
              What Prescient does
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Four connected tools that give manufacturers better visibility into demand,
              supply, procurement, and production — so you can make decisions with data
              instead of guesswork.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-8">
            {[
              {
                icon: Eye,
                title: "Demand Forecasting",
                description: "Generate 30/60/90-day demand forecasts from your sales history and current economic indicators. Review forecasts weekly to adjust production schedules.",
              },
              {
                icon: Brain,
                title: "Market Intelligence",
                description: "Receive procurement timing signals based on economic data and commodity price trends. Signals update as market conditions change to help you time purchases.",
              },
              {
                icon: Target,
                title: "Smart Allocation",
                description: "Set your product priorities and constraints, then get recommendations on what to produce and when — especially useful during material shortages.",
              },
              {
                icon: Network,
                title: "Supply Chain Visibility",
                description: "Map your supplier dependencies, score supplier risk, and get alerts about potential disruptions before they impact your production.",
              },
            ].map((item, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <item.icon className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <h3 className="font-medium mb-1.5">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Modules */}
      <section className="py-20 border-t bg-muted/30">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="max-w-2xl mb-16">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-4">
              Platform overview
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Six integrated modules that share data across your operation.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: LineChart, name: "Demand Planning", description: "Multi-horizon forecasting with 30/60/90-day views" },
              { icon: Boxes, name: "Material Allocation", description: "Constraint-based optimization across your product mix" },
              { icon: DollarSign, name: "Procurement Timing", description: "Buy/hold/wait signals based on market conditions" },
              { icon: Truck, name: "Supply Chain Mapping", description: "Multi-tier supplier visibility with risk scoring" },
              { icon: Gauge, name: "Production Analytics", description: "OEE tracking, bottleneck detection, and efficiency metrics" },
              { icon: Layers, name: "Digital Twin", description: "Operational snapshot with what-if scenario simulations" },
            ].map((module, idx) => (
              <Card key={idx} className="p-5">
                <div className="flex items-center gap-3 mb-2.5">
                  <module.icon className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">{module.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{module.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Prescient — honest differentiators */}
      <section className="py-20 border-t">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="max-w-2xl mb-16">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-4">
              Why manufacturers choose Prescient
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-10">
            {[
              {
                title: "Forward-looking signals",
                description: "The platform analyzes economic indicators and commodity data to generate timing signals before price movements become apparent in spot markets.",
              },
              {
                title: "One source of truth",
                description: "Demand, supply, production, and procurement data in one platform. Replace disconnected spreadsheets with unified operational visibility.",
              },
              {
                title: "Built for manufacturers",
                description: "Purpose-built for manufacturing operations — not a generic analytics tool adapted to the factory floor.",
              },
            ].map((item, idx) => (
              <div key={idx}>
                <h3 className="font-medium mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing — simple, honest */}
      <section className="py-20 border-t bg-muted/30">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-4">
              Simple pricing
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Start with a 30-day free trial. Choose the plan that fits when you're ready.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl">
            {[
              { name: "Starter", price: "$299", period: "/mo", note: "Up to 500 SKUs" },
              { name: "Growth", price: "$799", period: "/mo", note: "Up to 5,000 SKUs" },
              { name: "Usage-Based", price: "$199", period: "/mo + metered", note: "Pay for what you use" },
              { name: "Performance", price: "$100", period: "/mo + 15% of savings", note: "Pay on results" },
            ].map((plan, idx) => (
              <Card key={idx} className="p-5">
                <p className="text-sm font-medium mb-3">{plan.name}</p>
                <div className="mb-1">
                  <span className="text-2xl font-semibold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">{plan.note}</p>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a href="/signup">Start Trial</a>
                </Button>
              </Card>
            ))}
          </div>

          <div className="mt-6">
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setLocation("/pricing")}>
              View full pricing details
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </div>
      </section>

      {/* Get Help */}
      <section className="py-20 border-t">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="max-w-xl">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-4">
              Get help
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Have questions about Prescient, need help getting started, or want to
              talk about how the platform fits your operation? Reach out — we're here to help.
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Mail className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email us at</p>
                <a href="mailto:info@prescient-labs.com" className="font-medium hover:underline">
                  info@prescient-labs.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer — minimal */}
      <footer className="border-t py-10">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-foreground rounded-md flex items-center justify-center">
                <Eye className="h-3.5 w-3.5 text-background" />
              </div>
              <span className="font-medium text-sm">Prescient Labs</span>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              <a href="/how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
              <a href="/pricing" className="hover:text-foreground transition-colors">Pricing</a>
              <a href="/security" className="hover:text-foreground transition-colors">Security</a>
              <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
              <a href="mailto:info@prescient-labs.com" className="hover:text-foreground transition-colors">Contact</a>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-border/40">
            <p className="text-xs text-muted-foreground">&copy; 2026 Prescient Labs. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
