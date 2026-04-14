/**
 * Variant B: Split layout with asymmetric design
 * Inspired by Linear/Stripe style but in dark Palantir design
 */
import { ArrowRight, Brain, Target, Network, LineChart, Boxes, DollarSign, Truck, Check } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { useLocation } from "wouter";

export default function LandingPageVariantB() {
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
        {/* Header */}
        <header className="border-b hair sticky top-0 bg-ink/95 backdrop-blur z-50">
          <div className="max-w-7xl mx-auto px-10 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-signal"></div>
              <span className="text-sm tracking-[0.18em] font-medium">FACTORYFLOW</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="/pricing" className="text-xs text-soft hover:text-bone transition-colors">Pricing</a>
              <a href="/signin" className="text-xs text-soft hover:text-bone transition-colors">Sign in</a>
              <button onClick={handleStartTrial} className="btn-primary text-xs px-4 py-2">
                Start free trial
              </button>
            </div>
          </div>
        </header>

        {/* Split Hero Section */}
        <section className="max-w-7xl mx-auto px-10 py-20">
          <div className="grid grid-cols-12 gap-14">
            {/* Left: Text content */}
            <div className="col-span-12 md:col-span-6 flex flex-col justify-center">
              <div className="eyebrow mb-6">Industrial intelligence</div>
              <h1 className="hero text-6xl leading-[0.95] mb-10">
                Plan ahead. Optimize operations. Build resilience.
              </h1>
              <p className="text-soft text-base leading-relaxed mb-8 max-w-lg">
                Demand forecasting, procurement timing, production optimization, and supply chain visibility — all in one platform.
              </p>
              <div className="flex flex-col gap-4">
                {[
                  "Real-time demand sensing",
                  "Supplier risk scoring",
                  "Automated procurement",
                  "Production optimization",
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-signal shrink-0" />
                    <span className="text-sm text-soft">{feature}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-10">
                <button onClick={handleStartTrial} className="btn-primary text-sm px-6 py-3">
                  Start 90-day free trial
                </button>
                <button className="btn-ghost text-sm px-6 py-3 flex items-center gap-2">
                  Schedule demo <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Right: Feature cards grid */}
            <div className="col-span-12 md:col-span-6">
              <div className="grid grid-cols-2 gap-px bg-line h-full">
                {[
                  { icon: LineChart, title: "Demand Planning", desc: "Forecast with confidence" },
                  { icon: Brain, title: "Market Intelligence", desc: "Procurement timing signals" },
                  { icon: Target, title: "Smart Allocation", desc: "Optimize production mix" },
                  { icon: Network, title: "Supply Chain", desc: "End-to-end visibility" },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="bg-panel p-6 flex flex-col">
                      <Icon className="w-6 h-6 text-signal mb-4" />
                      <div className="text-sm font-medium mb-2">{item.title}</div>
                      <p className="text-xs text-soft">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <div className="divider"></div>

        {/* Features Section */}
        <section className="max-w-7xl mx-auto px-10 py-28">
          <div className="eyebrow mb-12">Why FactoryFlow</div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Built for operators",
                description: "Designed by and for the people running manufacturing operations. Simple, powerful, no complexity.",
              },
              {
                title: "Real-time intelligence",
                description: "React instantly to market changes, supplier disruptions, and demand shifts with AI-powered insights.",
              },
              {
                title: "Enterprise ready",
                description: "SOC 2 certified. Supports complex supply chains. Integrates with your existing ERP and systems.",
              },
            ].map((item, idx) => (
              <div key={idx} className="border-l border-signal pl-6">
                <h3 className="text-xl display mb-3">{item.title}</h3>
                <p className="text-soft text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="divider"></div>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-10 py-32">
          <div className="text-center">
            <h2 className="hero text-5xl md:text-6xl leading-tight mb-6 max-w-3xl mx-auto">
              Ready to optimize your operations?
            </h2>
            <p className="text-soft text-base mb-10 max-w-2xl mx-auto">
              Start your free trial today. No credit card required. 90 days full access.
            </p>
            <button onClick={handleStartTrial} className="btn-primary text-sm px-6 py-3">
              Start 90-day free trial
            </button>
          </div>
        </section>

        <div className="divider"></div>

        {/* Footer */}
        <footer className="max-w-7xl mx-auto px-10 py-14 flex items-center justify-between text-sm text-muted">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-signal"></div>
            <span className="tracking-[0.18em] font-medium">PRESCIENT LABS</span>
          </div>
          <div className="mono text-xs">© 2026 · SOC 2 · ISO 27001</div>
        </footer>
      </div>
    </div>
  );
}
