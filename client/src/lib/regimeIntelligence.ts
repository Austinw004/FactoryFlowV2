// Single source of truth for how the FDR (Financial-Real Decoupling) regime
// model translates into procurement guidance the customer can act on.
//
// The regime model is the product's competitive moat, so this module keeps the
// plain-language meaning, the prescriptive action, and the visual tone in one
// place. Tone classes are deliberately drawn from the restrained brand palette
// (signal / good / bad) — no new colors — so the dashboard shifts mood with the
// regime without turning into a rainbow status console.

export type RegimeKey =
  | "HEALTHY_EXPANSION"
  | "ASSET_LED_GROWTH"
  | "IMBALANCED_EXCESS"
  | "REAL_ECONOMY_LEAD"
  | "UNKNOWN";

export interface RegimeAction {
  label: string;
  route: string;
}

export interface RegimeIntelligence {
  key: RegimeKey;
  label: string;
  // One sentence a plant director understands in 3 seconds.
  meaning: string;
  // The prescriptive "what to do about it" — never just a description.
  guidance: string;
  // Why the model is making this call (transparency, Principle 10).
  reasoning: string;
  primaryAction: RegimeAction;
  secondaryAction: RegimeAction;
  // Tailwind tone classes from the brand palette only.
  tone: {
    border: string;
    text: string;
    dot: string;
  };
  // Severity drives prioritization, not decoration.
  severity: "info" | "watch" | "act";
}

const INTELLIGENCE: Record<RegimeKey, RegimeIntelligence> = {
  HEALTHY_EXPANSION: {
    key: "HEALTHY_EXPANSION",
    label: "Healthy Expansion",
    meaning:
      "Asset markets and the real economy are moving together. Conditions are stable.",
    guidance:
      "Hold standard procurement pace. This is a good window to negotiate long-term supplier contracts at today's terms.",
    reasoning:
      "FDR is below 1.2, so financial markets are not running ahead of real output — input-cost shocks are unlikely this quarter.",
    primaryAction: { label: "Review supplier contracts", route: "/procurement" },
    secondaryAction: { label: "Check supplier risk", route: "/supplier-risk" },
    tone: { border: "border-line", text: "text-soft", dot: "bg-good" },
    severity: "info",
  },
  ASSET_LED_GROWTH: {
    key: "ASSET_LED_GROWTH",
    label: "Asset-Led Growth",
    meaning:
      "Asset prices are outpacing the real economy. Material costs are likely to rise this quarter.",
    guidance:
      "Lock in contracts before the next pricing cycle and pre-purchase your most exposed critical materials.",
    reasoning:
      "FDR sits in the 1.2–1.8 band. Historically this regime precedes input-cost increases of roughly 8–12% before the real economy catches up.",
    primaryAction: { label: "Lock in exposed materials", route: "/procurement" },
    secondaryAction: { label: "View exposed suppliers", route: "/supplier-risk" },
    tone: { border: "border-signal/50", text: "text-signal", dot: "bg-signal" },
    severity: "watch",
  },
  IMBALANCED_EXCESS: {
    key: "IMBALANCED_EXCESS",
    label: "Imbalanced Excess",
    meaning:
      "Significant decoupling between asset markets and the real economy. Prices are stretched and unstable.",
    guidance:
      "Defer non-critical purchases and renegotiate expiring contracts. Build safety stock on critical, single-source materials only.",
    reasoning:
      "FDR has reached the 1.8–2.5 band. Buying at peak pricing risks locking in inflated costs that are likely to correct.",
    primaryAction: { label: "Review safety stock", route: "/inventory-optimization" },
    secondaryAction: { label: "Find at-risk materials", route: "/supply-chain" },
    tone: { border: "border-bad/60", text: "text-bad", dot: "bg-bad" },
    severity: "act",
  },
  REAL_ECONOMY_LEAD: {
    key: "REAL_ECONOMY_LEAD",
    label: "Real Economy Lead",
    meaning:
      "Counter-cyclical window. The real economy is leading while asset markets correct — favorable terms are available.",
    guidance:
      "Secure supply ahead of the next price move. Lock in longer-term supplier agreements and capacity while pricing is low.",
    reasoning:
      "FDR is above 2.5. Suppliers are competing for orders, so negotiating leverage sits with the buyer.",
    primaryAction: { label: "Start contract negotiations", route: "/procurement" },
    secondaryAction: { label: "Plan strategic buys", route: "/forecasting" },
    tone: { border: "border-good/60", text: "text-good", dot: "bg-good" },
    severity: "watch",
  },
  UNKNOWN: {
    key: "UNKNOWN",
    label: "Analyzing",
    meaning: "Regime signals are still stabilizing.",
    guidance:
      "Hold current procurement plans. Regime-specific guidance appears once the FDR analysis stabilizes.",
    reasoning: "Not enough confirmed economic data to classify the current regime.",
    primaryAction: { label: "View market tracker", route: "/procurement" },
    secondaryAction: { label: "Check supplier risk", route: "/supplier-risk" },
    tone: { border: "border-line", text: "text-muted", dot: "bg-muted" },
    severity: "info",
  },
};

export function getRegimeIntelligence(regime: string | null | undefined): RegimeIntelligence {
  const key = (regime || "UNKNOWN") as RegimeKey;
  return INTELLIGENCE[key] || INTELLIGENCE.UNKNOWN;
}

export const REGIME_LABELS: Record<string, string> = {
  HEALTHY_EXPANSION: "Healthy Expansion",
  ASSET_LED_GROWTH: "Asset-Led Growth",
  IMBALANCED_EXCESS: "Imbalanced Excess",
  REAL_ECONOMY_LEAD: "Real Economy Lead",
  UNKNOWN: "Analyzing",
};
