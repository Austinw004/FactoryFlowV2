// Regime guidance — translates the FDR regime classifier into the
// procurement actions a Plant Director or VP of Supply Chain should take
// THIS WEEK. The point of the FDR model is not to label the macro
// environment; it is to tell operations leaders WHEN to lock in
// contracts, defer purchases, build safety stock, or renegotiate.
//
// Keep this file close to the surface — every dashboard widget,
// recommendation card, and alert should be able to ask "what does this
// regime mean for me?" without re-deriving the answer.

export type Regime =
  | "HEALTHY_EXPANSION"
  | "ASSET_LED_GROWTH"
  | "IMBALANCED_EXCESS"
  | "REAL_ECONOMY_LEAD"
  | "UNKNOWN";

export type RegimePosture = "stable" | "heating" | "tense" | "opportunity" | "analyzing";

export interface RegimeGuidance {
  label: string;
  posture: RegimePosture;
  // One sentence the customer reads at the top of the dashboard.
  // Plain manufacturing language. No jargon.
  headline: string;
  // What this regime MEANS for procurement. The mechanism. The "why".
  mechanism: string;
  // The single most important action this week.
  topAction: string;
  // 3 procurement actions, ranked by impact.
  actions: string[];
  // Short ribbon shown next to the regime label across the product.
  shortGuidance: string;
  // Tailwind classes for the subtle accent on the dashboard hero. Tuned
  // to match the existing dark "panel/bone/signal" theme rather than
  // introducing new brand colors.
  accentClass: string;
  borderClass: string;
  dotClass: string;
  // Inventory-widget guidance — surfaced when this regime is active.
  inventoryGuidance: string;
  // Supplier-widget guidance — surfaced when this regime is active.
  supplierGuidance: string;
  // Forecasting-widget guidance — surfaced when this regime is active.
  forecastingGuidance: string;
}

const guidanceMap: Record<Regime, RegimeGuidance> = {
  HEALTHY_EXPANSION: {
    label: "Healthy Expansion",
    posture: "stable",
    headline: "Market conditions are stable. Standard procurement pace.",
    mechanism:
      "Asset markets and the real economy are moving together. Input cost pressure is muted, lead times are typical, and supplier capacity is available.",
    topAction: "Lock in long-term contracts on critical materials while terms are favorable.",
    actions: [
      "Negotiate 12–24 month agreements on your top 10 spend materials.",
      "Maintain standard safety stock levels — no need to overbuild.",
      "Run RFQs on commodity items to capture competitive pricing.",
    ],
    shortGuidance: "Stable — negotiate long-term contracts.",
    accentClass: "bg-good/5",
    borderClass: "border-good/30",
    dotClass: "bg-good",
    inventoryGuidance: "Inventory levels are appropriate. No need to overbuild safety stock.",
    supplierGuidance: "Good window to consolidate vendors and negotiate volume tiers.",
    forecastingGuidance: "Forecasts can rely on standard demand patterns. Minimal macro adjustment.",
  },
  ASSET_LED_GROWTH: {
    label: "Asset-Led Growth",
    posture: "heating",
    headline:
      "Asset prices are outpacing the real economy. Input costs typically rise 8–12% over the next quarter.",
    mechanism:
      "Capital is concentrating in financial assets ahead of physical output. Suppliers will pass through commodity, freight, and labor cost increases as their own input costs climb.",
    topAction: "Lock in supplier contracts before the next pricing cycle.",
    actions: [
      "Pre-purchase 60–90 days of critical materials at current prices.",
      "Convert spot-buy materials to fixed-price contracts now.",
      "Flag exposure to single-source suppliers — qualify a backup before lead times stretch.",
    ],
    shortGuidance: "Heating up — lock in contracts before prices rise.",
    accentClass: "bg-amber-500/5",
    borderClass: "border-amber-500/30",
    dotClass: "bg-amber-500",
    inventoryGuidance: "Pre-build safety stock on critical materials before input costs rise.",
    supplierGuidance: "Lock in pricing on expiring contracts. Avoid spot purchases on key materials.",
    forecastingGuidance: "Cost forecasts should assume 8–12% input inflation over the next quarter.",
  },
  IMBALANCED_EXCESS: {
    label: "Imbalanced Excess",
    posture: "tense",
    headline:
      "Significant decoupling between asset markets and the real economy. Demand and supply visibility are deteriorating.",
    mechanism:
      "Asset prices have run far ahead of underlying production. Historically, this regime precedes either a price correction or a real-economy slowdown — both compress operating margins. Cash and optionality are more valuable than inventory right now.",
    topAction: "Defer non-critical purchases. Renegotiate expiring contracts on softer terms.",
    actions: [
      "Pause discretionary capex and non-critical material buys.",
      "Re-open negotiations on contracts expiring in the next 90 days — the leverage has shifted.",
      "Increase safety stock ONLY on production-critical, single-sourced materials.",
    ],
    shortGuidance: "Tense — defer non-critical buys, renegotiate.",
    accentClass: "bg-bad/5",
    borderClass: "border-bad/40",
    dotClass: "bg-bad",
    inventoryGuidance: "Build safety stock only on production-critical materials. Trim slow movers.",
    supplierGuidance: "Renegotiate expiring contracts — pricing leverage has shifted to the buyer.",
    forecastingGuidance: "Widen forecast confidence intervals. Demand volatility is elevated.",
  },
  REAL_ECONOMY_LEAD: {
    label: "Real Economy Lead",
    posture: "opportunity",
    headline:
      "Counter-cyclical window. Supplier capacity is available and pricing power has shifted to buyers.",
    mechanism:
      "The real economy is leading asset markets — manufacturers have spare capacity, suppliers are competing for share, and commodity prices have softened. Procurement leverage is at its highest point of the cycle.",
    topAction: "Renegotiate supplier agreements and lock in multi-year terms while leverage is yours.",
    actions: [
      "Re-bid your top 20% of spend — most categories will see price improvement.",
      "Extend payment terms and add price-protection clauses to new contracts.",
      "Qualify backup suppliers cheaply — onboarding costs are lowest in this regime.",
    ],
    shortGuidance: "Buyer's market — renegotiate and extend terms.",
    accentClass: "bg-blue-500/5",
    borderClass: "border-blue-500/30",
    dotClass: "bg-blue-500",
    inventoryGuidance: "Trim safety stock — replenishment is reliable and cheap.",
    supplierGuidance: "Run aggressive RFQs. Add price-protection clauses to new contracts.",
    forecastingGuidance: "Cost forecasts can assume flat or declining input prices for 1–2 quarters.",
  },
  UNKNOWN: {
    label: "Analyzing",
    posture: "analyzing",
    headline: "Gathering market signal. Procurement guidance will appear once the regime is classified.",
    mechanism:
      "The platform is still ingesting macro data. The FDR (Financial-Real Decoupling) score compares asset-market activity against real-economy output to detect when the two circuits diverge.",
    topAction: "Continue with current procurement plan — no regime-driven action needed yet.",
    actions: [
      "Connect economic data sources to accelerate classification.",
      "Review your top spend materials so guidance is ready when the regime resolves.",
    ],
    shortGuidance: "Analyzing — guidance arriving shortly.",
    accentClass: "bg-muted/20",
    borderClass: "border-muted/40",
    dotClass: "bg-muted-foreground",
    inventoryGuidance: "Maintain current inventory plan until the regime is classified.",
    supplierGuidance: "Maintain current supplier plan until the regime is classified.",
    forecastingGuidance: "Forecasts will adopt regime-aware adjustments once classification completes.",
  },
};

export function getRegimeGuidance(regime: string | undefined | null): RegimeGuidance {
  if (!regime) return guidanceMap.UNKNOWN;
  return guidanceMap[regime as Regime] ?? guidanceMap.UNKNOWN;
}

// Format the FDR score with the right decimal precision and a "what
// this means" suffix.  Used inline in copy.
export function describeFdr(fdr: number | null | undefined): string {
  if (fdr == null || !Number.isFinite(Number(fdr))) return "FDR unavailable";
  const value = Number(fdr).toFixed(2);
  if (Number(fdr) < 1.2) return `FDR ${value} · in equilibrium`;
  if (Number(fdr) < 1.8) return `FDR ${value} · asset markets pulling ahead`;
  if (Number(fdr) < 2.5) return `FDR ${value} · significant decoupling`;
  return `FDR ${value} · counter-cyclical window`;
}
