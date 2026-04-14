/**
 * Variant A: Dark Palantir design with bold hero section
 */
import { ArrowRight, Brain, Target, Network, LineChart, Boxes, DollarSign, Truck } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { useLocation } from "wouter";

export default function LandingPageVariantA() {
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
        <header className="border-b hair">
          <div className="max-w-7xl mx-auto px-10 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-signal"></div>
              <span className="text-sm tracking-[0.18em] font-medium">FACTORYFLOW</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="/signin" className="text-xs text-soft hover:text-bone transition-colors">Sign in</a>
              <button onClick={handleStartTrial} className="btn-primary text-xs px-4 py-2">
                Start free trial
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-10 py-32 grid grid-cols-12 gap-10 items-center">
          <div className="col-span-12 md:col-span-7">
            <div className="eyebrow mb-8">Prescient Labs · Industrial intelligence</div>
            <h1 className="hero text-6xl md:text-7xl leading-[0.95] mb-8">
              Plan ahead with manufacturing intelligence
            </h1>
            <p className="text-soft text-base leading-relaxed mb-10 max-w-lg">
              Demand forecasting, procurement timing, production optimization, and supply chain visibility — connected in one platform.
            </p>
            <div className="flex items-center gap-4">
              <button onClick={handleStartTrial} className="btn-primary text-sm px-6 py-3">
                Start 90-day free trial
              </button>
              <button className="btn-ghost text-sm px-6 py-3">
                See the product
              </button>
            </div>
            <p className="mono text-xs text-muted mt-6">No credit card required.</p>
          </div>
        </section>

        <div className="divider"></div>

        {/* Capabilities */}
        <section className="max-w-7xl mx-auto px-10 py-28">
          <div className="grid md:grid-cols-2 gap-12">
            {[
              { num: "01", icon: LineChart, title: "Demand Forecasting", description: "Generate 30/60/90-day demand forecasts from your sales data and economic indicators." },
              { num: "02", icon: Brain, title: "Market Intelligence", description: "Procurement timing signals based on real economic data and commodity price trends." },
              { num: "03", icon: Target, title: "Smart Allocation", description: "Optimize what to produce and when, especially during material shortages." },
              { num: "04", icon: Network, title: "Supply Chain Visibility", description: "Map supplier dependencies, score risk, and get disruption alerts." },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="border-l border-signal pl-8 py-2">
                  <div className="mono text-xs text-muted mb-3">{item.num}</div>
                  <div className="flex items-start gap-4 mb-4">
                    <Icon className="w-6 h-6 text-signal shrink-0" />
                    <div>
                      <h3 className="text-xl display mb-2">{item.title}</h3>
                      <p className="text-soft text-sm leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="divider"></div>

        {/* Modules */}
        <section className="max-w-7xl mx-auto px-10 py-28">
          <div className="eyebrow mb-12">Capabilities</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line">
            {[
              { icon: LineChart, name: "Demand Planning" },
              { icon: Boxes, name: "Allocation" },
              { icon: DollarSign, name: "Procurement" },
              { icon: Truck, name: "Supply Chain" },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="bg-ink p-6 flex flex-col items-center text-center">
                  <Icon className="w-8 h-8 text-signal mb-3" />
                  <div className="text-sm text-soft">{item.name}</div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="divider"></div>

        {/* CTA Section */}
        <section className="max-w-7xl mx-auto px-10 py-32">
          <div className="grid grid-cols-12 gap-10">
            <div className="col-span-12 md:col-span-8">
              <h2 className="hero text-5xl md:text-6xl leading-tight">
                Built for the<br/>operators who run it.
              </h2>
              <p className="text-soft mt-6 text-base">90 days free. No credit card. Cancel anytime.</p>
            </div>
            <div className="col-span-12 md:col-span-4 flex md:justify-end items-end">
              <button onClick={handleStartTrial} className="btn-primary text-sm px-6 py-3">
                Start 90-day free trial
              </button>
            </div>
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
