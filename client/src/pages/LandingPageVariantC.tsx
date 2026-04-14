/**
 * Variant C: Ultra-minimal, text-forward design
 * Maximum whitespace, Notion/Basecamp-style simplicity
 */
import { ArrowRight } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { useLocation } from "wouter";

export default function LandingPageVariantC() {
  const [, setLocation] = useLocation();

  const handleStartTrial = () => {
    setLocation("/signup");
  };

  return (
    <div className="min-h-screen bg-ink text-bone font-sans">
      <SEOHead
        title="FactoryFlow — Manufacturing Intelligence Platform"
        description="Manufacturing intelligence tools for demand forecasting, procurement timing, production optimization, and supply chain visibility."
      />

      {/* Grain texture overlay */}
      <div className="grain fixed inset-0 pointer-events-none z-0"></div>

      <div className="relative z-10">
        {/* Minimal header */}
        <header className="max-w-4xl mx-auto px-10 py-8 flex items-center justify-between">
          <span className="text-sm tracking-[0.18em] font-medium">FACTORYFLOW</span>
          <div className="flex items-center gap-6">
            <a href="/signin" className="text-xs text-soft hover:text-bone transition-colors">Sign in</a>
            <button onClick={handleStartTrial} className="btn-primary text-xs px-4 py-2">
              Start trial
            </button>
          </div>
        </header>

        {/* Hero — text only */}
        <section className="max-w-4xl mx-auto px-10 py-24">
          <h1 className="hero text-5xl md:text-6xl leading-[0.95] mb-12">
            Manufacturing intelligence that connects demand, supply, procurement, and production in one place.
          </h1>
          <p className="text-soft text-base leading-relaxed mb-10 max-w-2xl">
            Prescient Labs helps manufacturers forecast demand, time purchases, optimize production, and monitor supply chain risk — with data, not guesswork.
          </p>
          <button onClick={handleStartTrial} className="btn-primary text-sm px-6 py-3 flex items-center gap-2">
            Start free trial
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="mono text-xs text-muted mt-6">90 days. No credit card.</p>
        </section>

        <div className="divider"></div>

        {/* Features — simple list */}
        <section className="max-w-4xl mx-auto px-10 py-20">
          <div className="space-y-12">
            {[
              {
                title: "Demand forecasting",
                desc: "Generate accurate 30/60/90-day demand forecasts from your sales data, economic indicators, and market signals. Reduce stockouts and overstock.",
              },
              {
                title: "Procurement timing",
                desc: "Know when to buy. Real-time commodity prices, supplier lead times, and market intelligence tell you the optimal moment to place orders.",
              },
              {
                title: "Production optimization",
                description: "Smart allocation of materials and resources across SKUs. Maximize throughput while minimizing waste during shortages.",
              },
              {
                title: "Supply chain visibility",
                desc: "Map your entire supplier network. Score risk. Get alerts on disruptions. Know your dependencies before they become problems.",
              },
            ].map((item, idx) => (
              <div key={idx}>
                <h2 className="text-2xl display mb-4">{item.title}</h2>
                <p className="text-soft leading-relaxed">{item.desc || item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="divider"></div>

        {/* Pricing — minimal */}
        <section className="max-w-4xl mx-auto px-10 py-20">
          <h2 className="text-3xl display mb-12">Pricing</h2>
          <div className="space-y-8">
            {[
              { name: "Starter", price: "$299/mo", desc: "Everything you need to get started" },
              { name: "Growth", price: "$799/mo", desc: "For teams managing complex supply chains" },
              { name: "Usage-Based", price: "$199/mo + metered", desc: "Pay for what you use" },
              { name: "Enterprise", price: "Custom", desc: "Contact sales for dedicated support" },
            ].map((plan, idx) => (
              <div key={idx} className="flex items-start justify-between pb-8 border-b border-line">
                <div>
                  <div className="font-medium mb-2">{plan.name}</div>
                  <p className="text-sm text-soft">{plan.desc}</p>
                </div>
                <div className="text-right mono text-sm text-signal shrink-0">{plan.price}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="divider"></div>

        {/* Final CTA */}
        <section className="max-w-4xl mx-auto px-10 py-24 text-center">
          <h2 className="hero text-4xl md:text-5xl leading-tight mb-8">
            Built for the operators who run it.
          </h2>
          <p className="text-soft text-base mb-10 max-w-2xl mx-auto">
            Manufacturing isn't theoretical. It's real. Raw. Demanding. Your software should be too.
          </p>
          <button onClick={handleStartTrial} className="btn-primary text-sm px-6 py-3">
            Start 90-day free trial
          </button>
        </section>

        <div className="divider"></div>

        {/* Footer */}
        <footer className="max-w-4xl mx-auto px-10 py-12 text-center text-sm text-muted">
          <div className="mono text-xs">© 2026 Prescient Labs · SOC 2 · ISO 27001</div>
        </footer>
      </div>
    </div>
  );
}
