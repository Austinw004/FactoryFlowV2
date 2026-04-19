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
            <button onClick={handleTalkToSales} className="btn-ghost text-sm px-5 py-3" data-testid="button-contact-us-hero">Contact Us</button>
          </div>
        </div>
        <div className="mt-6 text-xs mono text-muted">No credit card required · Cancel anytime · Reply within one business day</div>
      </div>

      <div className="divider relative z-10"></div>

      {/* Capabilities */}
      <div id="platform" className="max-w-7xl mx-auto px-10 py-28 relative z-10">
        <div className="eyebrow mb-16">Platform</div>

        <div className="grid grid-cols-12 gap-10 mb-20">
          <div className="col-span-12 md:col-span-2 mono text-4xl display text-muted">01</div>
          <div className="col-span-12 md:col-span-10 md:pl-10 border-l hair">
            <h3 className="text-4xl display mb-5">Demand &amp; forecast.</h3>
            <p className="text-soft max-w-2xl leading-relaxed mb-6">
              Probabilistic SKU-level forecasts across 30, 60, 90, and 180-day horizons — with explicit confidence bands, reconciled against live order flow and shipment telemetry.
            </p>
            <ul className="text-sm text-muted space-y-2 max-w-2xl leading-relaxed">
              <li>— Multi-horizon forecasts with regime-aware model selection</li>
              <li>— Forecast accuracy scorecards by SKU, region, and season</li>
              <li>— Demand signal repository unifying orders, shipments, POS, and leading indicators</li>
              <li>— S&amp;OP workspace with consensus forecasts and reconciliation</li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-10 mb-20">
          <div className="col-span-12 md:col-span-2 mono text-4xl display text-muted">02</div>
          <div className="col-span-12 md:col-span-10 md:pl-10 border-l hair">
            <h3 className="text-4xl display mb-5">Supplier &amp; commodity.</h3>
            <p className="text-soft max-w-2xl leading-relaxed mb-6">
              30/60/90-day commodity price forecasts with named drivers (regime, inflation, tariffs, geopolitics) and forward-buy guidance. Counterparty risk scored from your own payment history and on-time delivery record.
            </p>
            <ul className="text-sm text-muted space-y-2 max-w-2xl leading-relaxed">
              <li>— Multi-tier supplier mapping — know who your suppliers' suppliers are</li>
              <li>— Geopolitical risk monitoring with regional exposure scoring</li>
              <li>— Supply chain traceability with chain-of-custody for regulated inputs</li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-10">
          <div className="col-span-12 md:col-span-2 mono text-4xl display text-muted">03</div>
          <div className="col-span-12 md:col-span-10 md:pl-10 border-l hair">
            <h3 className="text-4xl display mb-5">Procurement &amp; automation.</h3>
            <p className="text-soft max-w-2xl leading-relaxed mb-6">
              The action layer. Forecasts and risk signals feed agents that draft POs, generate RFQs, rebalance inventory, and escalate exceptions — under guardrails you set, with every action logged and reversible.
            </p>
            <ul className="text-sm text-muted space-y-2 max-w-2xl leading-relaxed">
              <li>— Automated purchase orders with configurable approval thresholds</li>
              <li>— RFQ generation with multi-supplier scoring and award recommendations</li>
              <li>— Action playbooks that codify your ops team's best moves</li>
              <li>— Allocation engine for multi-plant, multi-SKU decisions under constraint</li>
            </ul>
          </div>
        </div>

        {/* Also in the platform — compact strip of additional real capabilities */}
        <div className="mt-20 pt-16 border-t hair">
          <div className="eyebrow mb-10">Also in the platform</div>
          <div className="grid md:grid-cols-3 gap-px bg-line" data-testid="section-capabilities-strip">
            <div className="bg-ink p-8">
              <div className="mono text-xs text-muted mb-3">04 · Agentic AI</div>
              <div className="text-lg text-bone leading-tight mb-2">Four autonomy tiers, one audit trail.</div>
              <div className="text-xs text-soft leading-relaxed">Agents start in suggest-only mode and graduate at your pace — first to auto-draft, then to execute-with-approval, and finally to full autonomy if you want it. Every tier respects per-agent guardrails, dollar caps, and approval workflows. Every action cites the data it used, and every action can be reversed.</div>
            </div>
            <div className="bg-ink p-8">
              <div className="mono text-xs text-muted mb-3">05 · Operations &amp; maintenance</div>
              <div className="text-lg text-bone leading-tight mb-2">Predictive, not reactive.</div>
              <div className="text-xs text-soft leading-relaxed">Monitor machinery health, flag predictive-maintenance windows before they become breakdowns, track production KPIs, and schedule the workforce. Operators on the line get a shop-floor mode built for the way they actually work.</div>
            </div>
            <div className="bg-ink p-8">
              <div className="mono text-xs text-muted mb-3">06 · Inventory &amp; network</div>
              <div className="text-lg text-bone leading-tight mb-2">Multi-echelon, multi-node.</div>
              <div className="text-xs text-soft leading-relaxed">Optimize safety stock across every location and see your full distribution network in one view. ERP templates for NetSuite, SAP, Oracle, and QuickBooks get you started quickly, and traceability follows every unit from raw material to finished good.</div>
            </div>
            <div className="bg-ink p-8">
              <div className="mono text-xs text-muted mb-3">07 · Strategy &amp; scenarios</div>
              <div className="text-lg text-bone leading-tight mb-2">Model the decision before you make it.</div>
              <div className="text-xs text-soft leading-relaxed">Run a digital twin of your operation and simulate capex decisions, outsourcing moves, and tariff shocks before you commit. Screen M&amp;A targets and benchmark your results against anonymized industry peers.</div>
            </div>
            <div className="bg-ink p-8">
              <div className="mono text-xs text-muted mb-3">08 · Audit &amp; compliance</div>
              <div className="text-lg text-bone leading-tight mb-2">Audit-grade by default.</div>
              <div className="text-xs text-soft leading-relaxed">Every mutation writes an immutable, insert-only audit log. A controlled-document SOP workspace ships built in, and the platform is designed for FDA, ISO 9001, and ITAR-adjacent environments.</div>
            </div>
            <div className="bg-ink p-8">
              <div className="mono text-xs text-muted mb-3">09 · ROI &amp; impact</div>
              <div className="text-lg text-bone leading-tight mb-2">Show the money.</div>
              <div className="text-xs text-soft leading-relaxed">Every recommendation carries a verified-savings number. Your CFO gets an ROI dashboard, and your board or grant program gets an impact report. Proof before you renew — not just claims.</div>
            </div>
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
            Connectors across ERP, e-commerce, shipping, CRM, finance, support, and analytics. Depth varies by integration — ask us what's production-ready today.
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
            <p className="text-soft text-sm leading-relaxed">Hosted cloud — fastest onboarding. Security posture documented on the Trust page.</p>
          </div>
          <div className="bg-ink p-10">
            <div className="mono text-xs text-muted mb-8">02</div>
            <div className="text-2xl display mb-4">Tenant VPC</div>
            <p className="text-soft text-sm leading-relaxed">Dedicated infrastructure in your own cloud account. On the roadmap for design-partner customers — talk to us about timing.</p>
          </div>
          <div className="bg-ink p-10">
            <div className="mono text-xs text-muted mb-8">03</div>
            <div className="text-2xl display mb-4">Air-gapped</div>
            <p className="text-soft text-sm leading-relaxed">On-prem appliance for ITAR-adjacent environments. On the roadmap — talk to us about timing.</p>
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
            <button onClick={handleTalkToSales} className="btn-ghost text-sm px-6 py-3" data-testid="button-contact-us-final">Contact Us</button>
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
            <a href="/trust" className="hover:text-bone transition">Trust</a>
            <a href="/status" className="hover:text-bone transition">Status</a>
            <a href="/contact" className="hover:text-bone transition">Contact</a>
            <a href="/terms" className="hover:text-bone transition">Terms</a>
            <a href="/privacy" className="hover:text-bone transition">Privacy</a>
            <a
              href="mailto:info@prescient-labs.com"
              className="hover:text-bone transition"
            >
              info@prescient-labs.com
            </a>
          </nav>
          <div className="mono text-xs">© 2026 Prescient Labs, Inc.</div>
        </div>
      </footer>
    </div>
  );
}
