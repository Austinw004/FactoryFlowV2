/**
 * Regime Guidance — single source of truth for translating an FDR regime
 * into procurement language a Plant Director / VP Supply Chain can act on.
 *
 * The dashboard hero, materials-at-risk widget, recommendation widgets, and
 * regime banner all read from this module so the product speaks with one
 * voice. Update guidance here and it propagates everywhere.
 */
export type RegimeKey =
  | "HEALTHY_EXPANSION"
  | "ASSET_LED_GROWTH"
  | "IMBALANCED_EXCESS"
  | "REAL_ECONOMY_LEAD"
  | "UNKNOWN";

export type RegimeTone = "stable" | "warming" | "tense" | "opportunity" | "neutral";

export interface RegimeGuidance {
  /** Customer-facing label, e.g. "Asset-Led Growth" */
  label: string;
  /** Hero-line procurement directive in <8 words */
  headline: string;
  /** One-sentence "what this means for your procurement decisions" */
  meaning: string;
  /** Imperatives ranked by leverage. First = top priority for the next 30 days. */
  actions: string[];
  /** Plain-language reasoning for why these actions, in customer terms */
  reasoning: string;
  /** Quantitative expectation ("8-12% input cost increase") if known */
  expectation: string;
  /** Visual tone driving accent colors / banner severity */
  tone: RegimeTone;
  /** Inventory-specific imperative for at-risk materials widget */
  inventoryDirective: string;
  /** Supplier-specific imperative for supplier widgets */
  supplierDirective: string;
}

export const REGIME_GUIDANCE: Record<RegimeKey, RegimeGuidance> = {
  HEALTHY_EXPANSION: {
    label: "Healthy Expansion",
    headline: "Stable conditions. Standard procurement pace.",
    meaning:
      "Asset markets and the real economy are in balance. Input costs and lead times should track historical norms.",
    actions: [
      "Negotiate long-term contracts at current pricing",
      "Hold safety stock at policy minimums",
      "Run standard reorder cadence",
    ],
    reasoning:
      "FDR within balanced range — no decoupling pressure pushing input costs up or down. The window favors locking in steady-state terms rather than tactical stockpiling.",
    expectation: "Expect input costs flat to ±2% over the next quarter.",
    tone: "stable",
    inventoryDirective:
      "Standard reorder. No need to build buffer stock above policy.",
    supplierDirective:
      "Good window to renegotiate annual contracts at predictable terms.",
  },
  ASSET_LED_GROWTH: {
    label: "Asset-Led Growth",
    headline: "Costs are heating up. Lock in contracts now.",
    meaning:
      "Asset markets are pulling ahead of real-economy fundamentals. Input cost pressure typically arrives 1-2 quarters later.",
    actions: [
      "Lock in supplier contracts before next pricing cycle",
      "Pre-purchase critical, single-source materials",
      "Pause discretionary RFQs that don't expire in 30 days",
    ],
    reasoning:
      "FDR rising into asset-led territory. Historically, this regime precedes 8-12% input cost increases over the following quarter as commodity and logistics costs catch up to financial markets.",
    expectation: "Expect 8-12% input cost increase over the next quarter.",
    tone: "warming",
    inventoryDirective:
      "Build safety stock on critical, hard-to-substitute materials before pricing resets.",
    supplierDirective:
      "Lock in contracts before suppliers reprice. Prioritize fixed-price terms over volume rebates.",
  },
  IMBALANCED_EXCESS: {
    label: "Imbalanced Excess",
    headline: "Significant decoupling. Defer non-critical buys.",
    meaning:
      "Asset markets and real economy are sharply out of sync. Both upside and downside risk to input costs is elevated; volatility is the dominant risk.",
    actions: [
      "Defer non-critical purchases past current cycle",
      "Renegotiate expiring contracts with shorter terms + price caps",
      "Build safety stock only on production-critical, single-source items",
    ],
    reasoning:
      "FDR has crossed into imbalanced territory — historically a leading indicator of supply disruptions, supplier financial stress, and input cost reversals. Optionality (shorter terms, multiple sources) outperforms commitment in this regime.",
    expectation: "Expect 5-15% price volatility and rising supplier credit risk.",
    tone: "tense",
    inventoryDirective:
      "Build buffer only on production-critical, single-source materials. Draw down everything else.",
    supplierDirective:
      "Shorten contract terms. Add price caps. Qualify backups for any single-source supplier.",
  },
  REAL_ECONOMY_LEAD: {
    label: "Real Economy Lead",
    headline: "Counter-cyclical window. Lock in favorable terms.",
    meaning:
      "Real-economy fundamentals are leading asset markets — favorable pricing window before financial markets catch up.",
    actions: [
      "Lock in 12-24 month supplier agreements at current pricing",
      "Renegotiate expiring contracts now while you have leverage",
      "Pull forward critical-material purchases planned for next quarter",
    ],
    reasoning:
      "FDR has dropped into counter-cyclical territory. Suppliers are typically more flexible on terms during this regime as financial conditions tighten. Price floors are more reliable than at any other point in the cycle.",
    expectation: "Expect favorable supplier terms; window typically 60-120 days.",
    tone: "opportunity",
    inventoryDirective:
      "Pull forward planned purchases. Build 1-2 quarters of cover on critical materials.",
    supplierDirective:
      "Renegotiate every expiring contract. Push for longer terms at current pricing.",
  },
  UNKNOWN: {
    label: "Analyzing",
    headline: "Analyzing market conditions.",
    meaning:
      "FDR regime classification is in progress. Use historical reorder cadence until conditions clear.",
    actions: ["Maintain current procurement cadence"],
    reasoning: "Awaiting sufficient signal to classify the current regime.",
    expectation: "—",
    tone: "neutral",
    inventoryDirective: "Maintain current safety stock policy.",
    supplierDirective: "Maintain existing supplier cadence.",
  },
};

export function getRegimeGuidance(regime: string | undefined | null): RegimeGuidance {
  if (!regime) return REGIME_GUIDANCE.UNKNOWN;
  const key = regime.toUpperCase() as RegimeKey;
  return REGIME_GUIDANCE[key] ?? REGIME_GUIDANCE.UNKNOWN;
}

/**
 * Tone class for ambient regime accent. Applied as a wrapper class so the
 * dashboard takes on a subtle visual character that matches the regime
 * without overwhelming the existing palette.
 */
export function getRegimeToneClass(regime: string | undefined | null): string {
  return `regime-tone-${getRegimeGuidance(regime).tone}`;
}
