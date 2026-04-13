/**
 * Variant C: "Ultra-minimal" — maximum whitespace, almost no visual flourishes.
 * Text-forward, Notion/Basecamp-style simplicity.
 * Focuses entirely on clarity and readability.
 */
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Eye, Mail
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SEOHead } from "@/components/SEOHead";
import { useLocation } from "wouter";

export default function LandingPageVariantC() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Prescient Labs — Manufacturing Intelligence Platform"
        description="Manufacturing intelligence tools for demand forecasting, procurement timing, production optimization, and supply chain visibility."
      />

      {/* Navigation — barely there */}
      <nav className="max-w-3xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <span className="font-semibold text-sm">Prescient Labs</span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a href="/signin" className="text-sm text-muted-foreground hover:text-foreground">Sign in</a>
          </div>
        </div>
      </nav>

      {/* Hero — text only, maximum breathing room */}
      <section className="pt-16 sm:pt-24 pb-20">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-snug mb-6">
            Manufacturing intelligence that connects demand, supply, procurement, and production in one place.
          </h1>
          <p className="text-muted-foreground leading-relaxed mb-8 max-w-xl">
            Prescient Labs helps manufacturers forecast demand, time purchases, optimize production,
            and monitor supply chain risk — with data, not guesswork.
          </p>
          <Button className="h-10 px-6" asChild>
            <a href="/signup">
              Start free trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <p className="text-xs text-muted-foreground/60 mt-3">30 days free. No credit card.</p>
        </div>
      </section>

      {/* Capabilities — simple text list */}
      <section className="pb-20">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="border-t pt-12 space-y-10">
            {[
              {
                title: "Demand Forecasting",
                text: "Upload your sales history and get 30/60/90-day forecasts that adjust as new data arrives. Review weekly to keep production schedules aligned with actual demand.",
              },
              {
                title: "Market Intelligence",
                text: "Get clear buy, hold, or wait signals based on economic indicators and commodity price data. The platform monitors conditions so you can time purchases for better prices.",
              },
              {
                title: "Smart Allocation",
                text: "When materials are limited, set your priorities and constraints and get recommendations on what to produce first. Maximize revenue from what you have.",
              },
              {
                title: "Supply Chain Visibility",
                text: "Map your supplier network, track reliability scores, and get alerts about potential disruptions. Know where your vulnerabilities are before they become crises.",
              },
            ].map((item, idx) => (
              <div key={idx}>
                <h3 className="font-medium mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform overview — single paragraph */}
      <section className="pb-20">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="border-t pt-12">
            <h2 className="font-medium mb-3">The platform</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mb-4">
              Six integrated modules that share data: Demand Planning, Material Allocation,
              Procurement Timing, Supply Chain Mapping, Production Analytics, and Digital Twin.
              Changes in one area automatically inform recommendations across the others.
            </p>
            <Button variant="ghost" size="sm" className="text-muted-foreground px-0 hover:text-foreground" onClick={() => setLocation("/how-it-works")}>
              How it works
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing — minimal text */}
      <section className="pb-20">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="border-t pt-12">
            <h2 className="font-medium mb-3">Pricing</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mb-6">
              Plans start at $299/month for up to 500 SKUs. We also offer usage-based
              and performance-based pricing where you pay a percentage of verified savings.
              Every plan starts with a 30-day free trial.
            </p>
            <Button variant="ghost" size="sm" className="text-muted-foreground px-0 hover:text-foreground" onClick={() => setLocation("/pricing")}>
              View pricing details
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </div>
      </section>

      {/* Get help */}
      <section className="pb-20">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="border-t pt-12">
            <h2 className="font-medium mb-3">Get help</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Questions about Prescient? Email{" "}
              <a href="mailto:info@prescient-labs.com" className="text-foreground hover:underline">info@prescient-labs.com</a>
            </p>
          </div>
        </div>
      </section>

      {/* Footer — absolute minimum */}
      <footer className="pb-12">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="border-t pt-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <p className="text-xs text-muted-foreground">&copy; 2026 Prescient Labs</p>
            <div className="flex gap-5 text-xs text-muted-foreground">
              <a href="/privacy" className="hover:text-foreground">Privacy</a>
              <a href="/terms" className="hover:text-foreground">Terms</a>
              <a href="/security" className="hover:text-foreground">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
