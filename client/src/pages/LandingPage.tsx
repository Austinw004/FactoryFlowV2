import { useState } from "react";
import { useLocation } from "wouter";
import { SEOHead } from "@/components/SEOHead";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  // All 40 integrations from the codebase
  const integrationsByCategory = {
    "ERP & Finance": [
      "NetSuite", "QuickBooks", "Xero", "Stripe", "PayPal", "Braintree"
    ],
    "E-commerce": [
      "Shopify", "WooCommerce", "BigCommerce", "Amazon Seller", "Square"
    ],
    "Shipping & logistics": [
      "FedEx", "UPS", "DHL"
    ],
    "CRM & Sales": [
      "Salesforce"
    ],
    "Work management": [
      "Asana", "Jira", "Linear", "Monday", "Trello", "Notion"
    ],
    "Marketing": [
      "Mailchimp", "Klaviyo", "SendGrid", "SendPulse", "ActiveCampaign", "Drip"
    ],
    "Support": [
      "Zendesk", "Zendesk Chat", "Intercom", "Freshdesk"
    ],
    "Analytics & BI": [
      "Power BI", "Mixpanel", "Segment", "Google Sheets"
    ],
    "Productivity & data": [
      "Microsoft Teams", "Google Calendar", "Airtable", "DocuSign", "Weather"
    ],
  };

  const handleStartTrial = () => {
    setLocation("/signup");
  };

  const handleTalkToSales = () => {
    setLocation("/contact");
  };

  const handleSeeProduct = () => {
    const element = document.querySelector('[data-testid="product-screen"]');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-ink text-bone font-sans">
      <SEOHead
        title="Prescient Labs — Software for the industrial floor"
        description="Prescient Labs unifies demand, supply, commodities, and production into a single operational system. Built for operators running the physical economy."
      />

      {/* Grain texture overlay */}
      <div className="grain fixed inset-0 pointer-events-none z-0"></div>

      {/* Header */}
      <header className="border-b hair relative z-10">
        <div className="max-w-7xl mx-auto px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-signal"></div>
            <span className="text-sm tracking-[0.18em] font-medium">PRESCIENT LABS</span>
          </div>
          <nav className="hidden md:flex items-center gap-10 text-sm text-soft">
            <a href="#platform" className="hover:text-bone transition">Platform</a>
            <a href="#integrations" className="hover:text-bone transition">Integrations</a>
            <a href="#deployment" className="hover:text-bone transition">Deployments</a>
            <a href="#pricing" className="hover:text-bone transition">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <a href="/signin" className="text-sm text-soft hover:text-bone transition">Sign in</a>
            <button onClick={handleTalkToSales} className="btn-ghost text-xs px-4 py-2 uppercase tracking-[0.14em]" data-testid="button-talk-to-sales-nav">Talk to sales</button>
            <button onClick={handleStartTrial} className="btn-primary text-sm" data-testid="button-start-trial-nav">Start free trial</button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-10 pt-40 pb-20 relative z-10">
        <div className="eyebrow mb-10">Prescient Labs · Industrial intelligence</div>
        <h1 className="hero text-8xl md:text-9xl leading-[0.95] max-w-6xl mb-14">
          Software<br/>
          for the<br/>
          industrial&nbsp;floor.
        </h1>
        <div className="mt-14 flex items-start justify-between gap-10 flex-wrap">
          <p className="text-soft text-lg max-w-xl leading-relaxed">
            Prescient Labs unifies demand, supply, commodities, and production into a single operational system. Built for operators running the physical economy.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={handleStartTrial} className="btn-primary text-sm px-5 py-3" data-testid="button-start-trial-hero">Start 90-day free trial</button>
            <button onClick={handleTalkToSales} className="btn-ghost text-sm px-5 py-3 uppercase tracking-[0.14em]" data-testid="button-talk-to-sales-hero">Talk to sales</button>
          </div>
        </div>
        <div className="mt-6 text-xs mono text-muted">No credit card required · Cancel anytime · Reply within one business day</div>
      </div>

      {/* Product screen */}
      <div className="max-w-7xl mx-auto px-10 pb-32 relative z-10">
        <div className="border hair bg-panel" data-testid="product-screen">
          <div className="h-10 border-b hair px-4 flex items-center gap-2">
            <span className="dot bg-muted"></span>
            <span className="dot bg-muted"></span>
            <span className="dot bg-muted"></span>
            <span className="mono text-xs text-muted ml-4">prescient-labs.prescient-labs.com / overview</span>
          </div>
          <div className="p-10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="eyebrow mb-2">State of operations</div>
                <div className="text-2xl display">Everything is nominal.</div>
              </div>
              <span className="mono text-xs text-muted">14:22 UTC · live</span>
            </div>
            <div className="grid grid-cols-4 gap-px bg-line mb-10">
              <div className="bg-panel p-5"><div className="eyebrow mb-3">Forecast acc.</div><div className="text-2xl display">94.2%</div></div>
              <div className="bg-panel p-5"><div className="eyebrow mb-3">Active SKUs</div><div className="text-2xl display">1,284</div></div>
              <div className="bg-panel p-5"><div className="eyebrow mb-3">Exposure</div><div className="text-2xl display">$2.4M</div></div>
              <div className="bg-panel p-5"><div className="eyebrow mb-3">Signals</div><div className="text-2xl display">3</div></div>
            </div>
            <svg viewBox="0 0 800 160" className="w-full h-40">
              <line x1="0" y1="140" x2="800" y2="140" stroke="#1A1B1E"/>
              <line x1="0" y1="90"  x2="800" y2="90"  stroke="#1A1B1E" strokeDasharray="2 4"/>
              <line x1="0" y1="40"  x2="800" y2="40"  stroke="#1A1B1E" strokeDasharray="2 4"/>
              <path d="M0,100 C80,80 160,65 240,70 C320,75 400,50 480,40 C560,30 640,45 720,50 L800,55 L800,90 C720,85 640,80 560,70 C480,60 400,85 320,100 C240,110 160,105 80,115 L0,130 Z" fill="#D9B56B" opacity="0.07"/>
              <polyline points="0,120 100,100 200,85 300,70 400,55 500,45 600,50 700,48 800,52" fill="none" stroke="#D9B56B" strokeWidth="1.5" strokeDasharray="4 4"/>
              <polyline points="0,130 100,115 200,95 300,80 400,65 500,58 600,62 700,58" fill="none" stroke="#F2F2F2" strokeWidth="1.5"/>
              <circle cx="700" cy="58" r="3" fill="#F2F2F2"/>
            </svg>
          </div>
        </div>
      </div>

      <div className="divider relative z-10"></div>

      {/* Design partners — honest descriptors, not fake logos */}
      <div className="max-w-7xl mx-auto px-10 py-20 relative z-10" data-testid="section-design-partners">
        <div className="eyebrow mb-10">Design partners</div>
        <div className="grid md:grid-cols-4 gap-px bg-line">
          <div className="bg-ink p-8">
            <div className="mono text-xs text-muted mb-4">01 · Automotive</div>
            <div className="text-lg text-bone leading-tight">Tier-1 automotive supplier, $400M revenue</div>
            <div className="text-xs text-soft mt-3 leading-relaxed">Stamping, injection molding, ~800 SKUs. Piloting commodity forecasting + allocation.</div>
          </div>
          <div className="bg-ink p-8">
            <div className="mono text-xs text-muted mb-4">02 · Food &amp; beverage</div>
            <div className="text-lg text-bone leading-tight">Contract manufacturer, $120M revenue</div>
            <div className="text-xs text-soft mt-3 leading-relaxed">Dry goods + cold chain. Piloting demand sensing and supplier risk.</div>
          </div>
          <div className="bg-ink p-8">
            <div className="mono text-xs text-muted mb-4">03 · Industrial equipment</div>
            <div className="text-lg text-bone leading-tight">OEM, $250M revenue</div>
            <div className="text-xs text-soft mt-3 leading-relaxed">Low-volume / high-mix, 11-week lead times. Piloting regime-aware reorder.</div>
          </div>
          <div className="bg-ink p-8">
            <div className="mono text-xs text-muted mb-4">04 · Medical devices</div>
            <div className="text-lg text-bone leading-tight">Class II device manufacturer, $80M revenue</div>
            <div className="text-xs text-soft mt-3 leading-relaxed">FDA-regulated. Piloting audit-grade forecasting and supplier traceability.</div>
          </div>
        </div>
        <div className="mt-8 mono text-xs text-muted">Under NDA. Named references available during evaluation.</div>
      </div>

      <div className="divider relative z-10"></div>

      {/* Capabilities */}
      <div id="platform" className="max-w-7xl mx-auto px-10 py-28 relative z-10">
        <div className="eyebrow mb-16">Platform</div>

        <div className="grid grid-cols-12 gap-10 mb-20">
          <div className="col-span-12 md:col-span-2 mono text-4xl display text-muted">01</div>
          <div className="col-span-12 md:col-span-10 md:pl-10 border-l hair">
            <h3 className="text-4xl display mb-5">Demand &amp; forecast.</h3>
            <p className="text-soft max-w-2xl leading-relaxed">
              Probabilistic forecasts with confidence bands, reconciled against live order flow and shipment telemetry.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-10 mb-20">
          <div className="col-span-12 md:col-span-2 mono text-4xl display text-muted">02</div>
          <div className="col-span-12 md:col-span-10 md:pl-10 border-l hair">
            <h3 className="text-4xl display mb-5">Supplier &amp; commodity.</h3>
            <p className="text-soft max-w-2xl leading-relaxed">
              Counterparty risk scoring and commodity hedging signals drawn from market feeds and your own payment history.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-10">
          <div className="col-span-12 md:col-span-2 mono text-4xl display text-muted">03</div>
          <div className="col-span-12 md:col-span-10 md:pl-10 border-l hair">
            <h3 className="text-4xl display mb-5">AI Advisor.</h3>
            <p className="text-soft max-w-2xl leading-relaxed">
              A model-in-the-loop copilot that cites its sources. Every recommendation is auditable and reversible.
            </p>
          </div>
        </div>
      </div>

      <div className="divider relative z-10"></div>

      {/* Integrations */}
      <div id="integrations" className="max-w-7xl mx-auto px-10 py-28 relative z-10">
        <div className="flex items-end justify-between mb-14 flex-wrap gap-4">
          <div>
            <div className="eyebrow mb-4">Integrations</div>
            <h3 className="text-4xl display">Connect your stack.</h3>
          </div>
          <p className="text-soft text-sm max-w-sm leading-relaxed">
            40+ native integrations across ERP, e-commerce, shipping, CRM, finance, support, and analytics.
          </p>
        </div>

        {Object.entries(integrationsByCategory).map(([category, integrations]) => (
          <div key={category} className="mb-10">
            <div className="eyebrow mb-5">{category}</div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-px bg-line">
              {integrations.map((name) => (
                <div key={name} className="integration-tile bg-ink">{name}</div>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-10 mono text-xs text-muted">Plus webhook and REST API for anything custom.</div>
      </div>

      <div className="divider relative z-10"></div>

      {/* Deployment */}
      <div id="deployment" className="max-w-7xl mx-auto px-10 py-28 relative z-10">
        <div className="eyebrow mb-16">Deployment</div>
        <div className="grid md:grid-cols-3 gap-px bg-line">
          <div className="bg-ink p-10">
            <div className="mono text-xs text-muted mb-8">01</div>
            <div className="text-2xl display mb-4">Managed cloud</div>
            <p className="text-soft text-sm leading-relaxed">SOC 2 Type II. Fastest onboarding.</p>
          </div>
          <div className="bg-ink p-10">
            <div className="mono text-xs text-muted mb-8">02</div>
            <div className="text-2xl display mb-4">Tenant VPC</div>
            <p className="text-soft text-sm leading-relaxed">Dedicated infrastructure inside your cloud account.</p>
          </div>
          <div className="bg-ink p-10">
            <div className="mono text-xs text-muted mb-8">03</div>
            <div className="text-2xl display mb-4">Air-gapped</div>
            <p className="text-soft text-sm leading-relaxed">On-prem appliance for ITAR-controlled environments.</p>
          </div>
        </div>
      </div>

      <div className="divider relative z-10"></div>

      {/* Pricing */}
      <div id="pricing" className="max-w-7xl mx-auto px-10 py-28 relative z-10">
        <div className="flex items-end justify-between mb-14 flex-wrap gap-4">
          <div>
            <div className="eyebrow mb-4">Pricing</div>
            <h3 className="text-4xl display">90 days free. Then pick a plan.</h3>
          </div>
          <div className="billing-toggle" style={{display:'inline-flex', border:'1px solid #1A1B1E', padding:'3px'}}>
            <button
              style={{padding:'6px 16px', fontSize:'12px', color:billingPeriod==='monthly'?'#000':'#6A6E76', background:billingPeriod==='monthly'?'#F2F2F2':'transparent', fontWeight: billingPeriod==='monthly'?'500':'400'}}
              onClick={() => setBillingPeriod('monthly')}
            >Monthly</button>
            <button
              style={{padding:'6px 16px', fontSize:'12px', color:billingPeriod==='annual'?'#000':'#6A6E76', background:billingPeriod==='annual'?'#F2F2F2':'transparent', fontWeight: billingPeriod==='annual'?'500':'400'}}
              onClick={() => setBillingPeriod('annual')}
            >Annual · save ~17%</button>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-px bg-line">
          <div className="bg-ink p-10">
            <div className="text-sm text-soft mb-10">Starter</div>
            <div className="text-4xl display mb-1">
              {billingPeriod === 'monthly' ? '$299' : '$2,990'}
              <span className="text-base text-muted">{billingPeriod === 'monthly' ? '/mo' : '/yr'}</span>
            </div>
            {billingPeriod === 'annual' && <div className="mono text-xs text-muted mt-3">$249/mo billed annually</div>}
            {billingPeriod === 'monthly' && <div className="mono text-xs text-muted mt-3">Billed monthly</div>}
            <button onClick={handleStartTrial} className="btn-ghost text-xs px-4 py-2 inline-block mt-8 uppercase tracking-[0.14em]">Start trial</button>
          </div>
          <div className="bg-ink p-10">
            <div className="text-sm text-soft mb-10">Growth</div>
            <div className="text-4xl display mb-1">
              {billingPeriod === 'monthly' ? '$799' : '$7,990'}
              <span className="text-base text-muted">{billingPeriod === 'monthly' ? '/mo' : '/yr'}</span>
            </div>
            {billingPeriod === 'annual' && <div className="mono text-xs text-muted mt-3">$666/mo billed annually</div>}
            {billingPeriod === 'monthly' && <div className="mono text-xs text-muted mt-3">Billed monthly</div>}
            <button onClick={handleStartTrial} className="btn-ghost text-xs px-4 py-2 inline-block mt-8 uppercase tracking-[0.14em]">Start trial</button>
          </div>
          <div className="bg-ink p-10">
            <div className="text-sm text-soft mb-10">Usage-based</div>
            <div className="text-4xl display mb-1">$199<span className="text-base text-muted">/mo</span></div>
            <div className="mono text-xs text-muted mt-3">+ metered usage</div>
            <button onClick={handleStartTrial} className="btn-ghost text-xs px-4 py-2 inline-block mt-8 uppercase tracking-[0.14em]">Start trial</button>
          </div>
          <div className="bg-ink p-10 border-l" style={{borderLeftColor:'rgba(217, 181, 107, 0.3)'}}>
            <div className="text-sm text-signal mb-10">Performance</div>
            <div className="text-4xl display mb-1">15<span className="text-base text-muted">%</span></div>
            <div className="mono text-xs text-muted mt-3">of verified savings</div>
            <button onClick={handleStartTrial} className="btn-ghost text-xs px-4 py-2 inline-block mt-8 uppercase tracking-[0.14em]">Start trial</button>
          </div>
        </div>

        <div className="mt-8 mono text-xs text-muted">All plans include the 90-day free trial. No credit card required to start.</div>
      </div>

      <div className="divider relative z-10"></div>

      {/* Final CTA */}
      <div className="max-w-7xl mx-auto px-10 py-32 relative z-10">
        <div className="grid grid-cols-12 gap-10">
          <div className="col-span-12 md:col-span-8">
            <h3 className="hero text-5xl md:text-6xl leading-[0.95]">Built for the<br/>operators who run it.</h3>
            <p className="text-soft mt-6 text-sm">90 days free. No credit card. Cancel anytime.</p>
          </div>
          <div className="col-span-12 md:col-span-4 flex md:justify-end items-end gap-3 flex-wrap">
            <button onClick={handleTalkToSales} className="btn-ghost text-sm px-6 py-3 uppercase tracking-[0.14em]" data-testid="button-talk-to-sales-final">Talk to sales</button>
            <button onClick={handleStartTrial} className="btn-primary text-sm px-6 py-3" data-testid="button-start-trial-final">Start 90-day free trial</button>
          </div>
        </div>
      </div>

      <div className="divider relative z-10"></div>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-10 py-14 relative z-10">
        <div className="flex items-center justify-between text-sm text-muted flex-wrap gap-6">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-signal"></div>
            <span className="tracking-[0.18em] font-medium">PRESCIENT LABS</span>
          </div>
          <nav className="flex items-center gap-6 text-xs flex-wrap">
            <a href="/pricing" className="hover:text-bone transition">Pricing</a>
            <a href="/how-it-works" className="hover:text-bone transition">How it works</a>
            <a href="/security" className="hover:text-bone transition">Security</a>
            <a href="/status" className="hover:text-bone transition">Status</a>
            <a href="/contact" className="hover:text-bone transition">Contact</a>
            <a href="/terms" className="hover:text-bone transition">Terms</a>
            <a href="/privacy" className="hover:text-bone transition">Privacy</a>
          </nav>
          <div className="mono text-xs">© 2026 · SOC 2 in progress</div>
        </div>
      </footer>
    </div>
  );
}
