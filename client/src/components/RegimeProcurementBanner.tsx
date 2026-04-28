import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, TrendingDown, ShieldCheck, AlertTriangle, Lightbulb } from "lucide-react";
import { useLocation } from "wouter";

type Regime =
  | "HEALTHY_EXPANSION"
  | "ASSET_LED_GROWTH"
  | "IMBALANCED_EXCESS"
  | "REAL_ECONOMY_LEAD"
  | "UNKNOWN"
  | string;

interface RegimeAction {
  label: string;
  path: string;
  testId: string;
}

interface RegimeNarrative {
  // Plain manufacturing-language headline ("Asset markets are outpacing the
  // real economy.") — what the regime MEANS, not its technical name.
  headline: string;
  // The procurement implication in one sentence — what the customer should
  // be doing differently this week.
  guidance: string;
  // Why this recommendation, in one sentence — the reasoning that earns
  // trust. ("Historically, this regime precedes 8–12% input cost increases.")
  reasoning: string;
  // Two action paths — the #1 and #2 things to do right now.
  primaryAction: RegimeAction;
  secondaryAction: RegimeAction;
  // Tone: drives the accent stripe color. We stay inside the brand palette
  // (signal / good / bad) — no new colors.
  tone: "calm" | "warm" | "tension" | "opportunity";
  Icon: typeof TrendingUp;
}

const NARRATIVES: Record<string, RegimeNarrative> = {
  HEALTHY_EXPANSION: {
    headline: "Market conditions are stable. Standard procurement pace.",
    guidance:
      "Good window to negotiate long-term supplier contracts and qualify backup sources before the next regime shift.",
    reasoning:
      "Asset and real-economy circuits are in equilibrium — input costs typically move within ±2% in this regime.",
    primaryAction: { label: "Review supplier contracts", path: "/procurement", testId: "regime-action-primary" },
    secondaryAction: { label: "Run forecast", path: "/forecasting", testId: "regime-action-secondary" },
    tone: "calm",
    Icon: ShieldCheck,
  },
  ASSET_LED_GROWTH: {
    headline: "Asset markets are outpacing the real economy.",
    guidance:
      "Lock in supplier contracts on critical materials before the next pricing cycle. Build modest safety stock on single-source items.",
    reasoning:
      "Historically, this regime precedes 8–12% input cost increases over the following quarter — pricing windows close fast.",
    primaryAction: { label: "View materials at risk", path: "/inventory-management", testId: "regime-action-primary" },
    secondaryAction: { label: "Start contract review", path: "/procurement", testId: "regime-action-secondary" },
    tone: "warm",
    Icon: TrendingUp,
  },
  IMBALANCED_EXCESS: {
    headline: "Significant decoupling between asset and real economy detected.",
    guidance:
      "Defer non-critical purchases. Renegotiate any contracts expiring in the next 90 days. Build safety stock only on critical, single-source materials.",
    reasoning:
      "FDR at this level signals a pricing peak — historically, prices correct 10–18% within two quarters as the asset-real gap closes.",
    primaryAction: { label: "Review expiring contracts", path: "/procurement", testId: "regime-action-primary" },
    secondaryAction: { label: "Identify single-source risk", path: "/supplier-risk", testId: "regime-action-secondary" },
    tone: "tension",
    Icon: AlertTriangle,
  },
  REAL_ECONOMY_LEAD: {
    headline: "Counter-cyclical window is open.",
    guidance:
      "Favorable supplier terms available. Lock in long-term agreements while asset markets correct, and pre-purchase critical materials at cyclical lows.",
    reasoning:
      "Real-economy fundamentals leading asset markets is rare — buyers hold pricing power for a limited window before the cycle resets.",
    primaryAction: { label: "Negotiate long-term deals", path: "/procurement", testId: "regime-action-primary" },
    secondaryAction: { label: "Plan strategic buys", path: "/inventory-optimization", testId: "regime-action-secondary" },
    tone: "opportunity",
    Icon: TrendingDown,
  },
  UNKNOWN: {
    headline: "Analyzing market conditions.",
    guidance:
      "The regime model is gathering data from external sources. Standard procurement guidance applies until classification stabilizes.",
    reasoning:
      "FDR (Financial-Real Decoupling) requires recent macro data — once it loads, the dashboard will recommend specific procurement actions.",
    primaryAction: { label: "Review supplier list", path: "/procurement", testId: "regime-action-primary" },
    secondaryAction: { label: "Run forecast", path: "/forecasting", testId: "regime-action-secondary" },
    tone: "calm",
    Icon: Lightbulb,
  },
};

// Tone → accent classes. Stays inside the brand palette: signal (warm),
// good (calm/opportunity), bad (tension). No new colors introduced.
const TONE_STYLES: Record<RegimeNarrative["tone"], { stripe: string; iconText: string; eyebrow: string }> = {
  calm:        { stripe: "bg-good",   iconText: "text-good",   eyebrow: "text-good" },
  warm:        { stripe: "bg-signal", iconText: "text-signal", eyebrow: "text-signal" },
  tension:     { stripe: "bg-bad",    iconText: "text-bad",    eyebrow: "text-bad" },
  opportunity: { stripe: "bg-good",   iconText: "text-good",   eyebrow: "text-good" },
};

interface RegimeProcurementBannerProps {
  regime: Regime;
  fdr: number;
  confidencePct?: number;
  exposureCount?: number;
}

export function RegimeProcurementBanner({
  regime,
  fdr,
  confidencePct,
  exposureCount,
}: RegimeProcurementBannerProps) {
  const [, setLocation] = useLocation();
  const narrative = NARRATIVES[regime] ?? NARRATIVES.UNKNOWN;
  const tone = TONE_STYLES[narrative.tone];
  const fdrSafe = Number.isFinite(fdr) ? fdr : 1.0;
  const friendlyRegime = regime.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div
      className="relative border border-line bg-panel"
      data-testid="regime-procurement-banner"
      data-regime={regime}
    >
      {/* Tone stripe — left edge color shifts as regime shifts. This is the
          subtle visual cue that the dashboard is actively reading market
          conditions. */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${tone.stripe}`} aria-hidden />

      <div className="pl-8 pr-6 py-6 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="flex-1 min-w-0">
          <div className={`eyebrow mb-3 flex items-center gap-2 ${tone.eyebrow}`}>
            <narrative.Icon className={`h-3.5 w-3.5 ${tone.iconText}`} />
            <span data-testid="regime-banner-eyebrow">
              {friendlyRegime} · FDR {fdrSafe.toFixed(2)}
              {typeof confidencePct === "number" && ` · ${confidencePct}% confidence`}
            </span>
          </div>

          <h2 className="text-2xl lg:text-3xl text-bone font-semibold leading-snug mb-3" data-testid="regime-banner-headline">
            {narrative.headline}
          </h2>

          <p className="text-soft leading-relaxed max-w-3xl mb-3" data-testid="regime-banner-guidance">
            {narrative.guidance}
          </p>

          <p className="text-xs text-muted leading-relaxed max-w-3xl" data-testid="regime-banner-reasoning">
            <span className="uppercase tracking-wider mr-2">Why:</span>
            {narrative.reasoning}
            {typeof exposureCount === "number" && exposureCount > 0 && (
              <>
                {" "}
                <span className={tone.iconText}>
                  Currently tracking {exposureCount} material{exposureCount === 1 ? "" : "s"} flagged for attention.
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:min-w-[14rem] lg:items-stretch shrink-0">
          <Button
            size="sm"
            onClick={() => setLocation(narrative.primaryAction.path)}
            data-testid={narrative.primaryAction.testId}
            className="justify-between"
          >
            {narrative.primaryAction.label}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setLocation(narrative.secondaryAction.path)}
            data-testid={narrative.secondaryAction.testId}
            className="justify-between"
          >
            {narrative.secondaryAction.label}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
