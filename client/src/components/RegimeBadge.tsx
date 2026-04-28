// Shared regime badge — single source of truth for how the four economic
// regimes render across the app. Replaces the inline `getRegimeBadge`
// helpers that were duplicated in ProductionKPIs, Compliance,
// PredictiveMaintenance, SupplyChain, and elsewhere — each with its own
// rainbow palette (bg-green-600 / bg-orange-600 / bg-red-600 /
// bg-blue-600), which violated the "no rainbow" rule of the redesign.
//
// New treatment uses only the palette tokens defined in
// tailwind.config.ts and index.css:
//
//   HEALTHY_EXPANSION   → good   (muted green; equilibrium)
//   ASSET_LED_GROWTH    → signal (Anthropic burnt-orange; "watch this")
//   IMBALANCED_EXCESS   → bad    (muted red; primary alarm regime)
//   REAL_ECONOMY_LEAD   → bone   (neutral on dark; counter-cyclical)
//   UNKNOWN             → muted  (greyed out)
//
// The badge is presentation-only; it never renders FDR thresholds or any
// classifier internals (those would leak proprietary methodology — see
// the IP-leak audit).

import { Badge } from "@/components/ui/badge";

export type RegimeName =
  | "HEALTHY_EXPANSION"
  | "ASSET_LED_GROWTH"
  | "IMBALANCED_EXCESS"
  | "REAL_ECONOMY_LEAD"
  | string;

interface RegimeBadgeProps {
  regime: RegimeName;
  className?: string;
  testId?: string;
}

const REGIME_LABELS: Record<string, string> = {
  HEALTHY_EXPANSION: "Healthy Expansion",
  ASSET_LED_GROWTH: "Asset-Led Growth",
  IMBALANCED_EXCESS: "Imbalanced Excess",
  REAL_ECONOMY_LEAD: "Real Economy Lead",
};

// Each entry is a Tailwind className applied to the Badge. We use the
// /20 alpha background + matching foreground text + 1px border in the
// same hue to land the design's "muted, not loud" status treatment.
const REGIME_TONE: Record<string, string> = {
  HEALTHY_EXPANSION: "bg-good/20 text-good border-good/30",
  ASSET_LED_GROWTH:  "bg-signal/20 text-signal border-signal/30",
  IMBALANCED_EXCESS: "bg-bad/20 text-bad border-bad/30",
  REAL_ECONOMY_LEAD: "bg-bone/10 text-bone border-bone/20",
};

export function RegimeBadge({ regime, className, testId }: RegimeBadgeProps) {
  const label = REGIME_LABELS[regime] ?? regime;
  const tone =
    REGIME_TONE[regime] ?? "bg-muted/20 text-muted-foreground border-muted/30";

  return (
    <Badge
      variant="outline"
      className={`${tone} ${className ?? ""}`.trim()}
      data-testid={testId ?? `badge-regime-${regime.toLowerCase().replace(/_/g, "-")}`}
    >
      {label}
    </Badge>
  );
}

// Convenience for places that previously used the local `getRegimeBadge`
// function pattern. Drop-in replacement.
export function getRegimeBadge(regime: RegimeName) {
  return <RegimeBadge regime={regime} />;
}
