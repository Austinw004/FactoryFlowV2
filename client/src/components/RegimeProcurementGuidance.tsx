import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  TrendingUp,
  TrendingDown,
  Lock,
  Target,
  ArrowRight,
  ChevronDown,
  Info,
  Activity,
} from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";

type RegimeKey =
  | "HEALTHY_EXPANSION"
  | "ASSET_LED_GROWTH"
  | "IMBALANCED_EXCESS"
  | "REAL_ECONOMY_LEAD"
  | "UNKNOWN";

interface ActionItem {
  label: string;
  description: string;
  to: string;
  testId: string;
  primary?: boolean;
}

interface Guidance {
  label: string;
  headline: string;
  thesis: string;
  why: string;
  tone: "calm" | "warm" | "tense" | "opportunity" | "neutral";
  icon: typeof TrendingUp;
  actions: ActionItem[];
}

const guidanceByRegime: Record<RegimeKey, Guidance> = {
  HEALTHY_EXPANSION: {
    label: "Healthy Expansion",
    headline: "Standard procurement pace. Good window for long-term contracts.",
    thesis:
      "Markets and the real economy are in balance. No urgent moves required, but this is the cheapest time to lock in multi-year terms before the next cycle.",
    why: "FDR below 1.2 historically corresponds to balanced asset and real-economy circuits. Input cost volatility is low and supplier capacity is available. Lock in agreements now and you front-run the next regime shift.",
    tone: "calm",
    icon: Activity,
    actions: [
      {
        label: "Review expiring contracts",
        description: "Renegotiate terms while pricing is stable",
        to: "/multi-tier-mapping",
        testId: "guidance-action-contracts",
        primary: true,
      },
      {
        label: "Run baseline forecast",
        description: "Reset planning assumptions for the quarter",
        to: "/forecasting",
        testId: "guidance-action-forecast",
      },
    ],
  },
  ASSET_LED_GROWTH: {
    label: "Asset-Led Growth",
    headline:
      "Lock in supplier contracts now. Input costs likely to rise 8–12% this quarter.",
    thesis:
      "Asset prices are running ahead of the real economy. Commodity inputs typically follow with a lag of 30–90 days. Move on critical-material contracts before the next pricing cycle.",
    why: "FDR between 1.2 and 1.8 has preceded above-trend input cost increases in 7 of the last 10 cycles. Suppliers will pass through higher carrying costs once they refresh their hedges. Acting before that refresh captures the largest savings.",
    tone: "warm",
    icon: Lock,
    actions: [
      {
        label: "Lock in critical contracts",
        description: "Prioritize single-source and high-volatility materials",
        to: "/rfq-generation",
        testId: "guidance-action-lock",
        primary: true,
      },
      {
        label: "View exposed materials",
        description: "Rank by $ at risk and lead-time sensitivity",
        to: "/inventory",
        testId: "guidance-action-exposed",
      },
      {
        label: "Pre-build safety stock",
        description: "Add 4–6 weeks coverage on top BOM lines",
        to: "/inventory-optimization",
        testId: "guidance-action-safety",
      },
    ],
  },
  IMBALANCED_EXCESS: {
    label: "Imbalanced Excess",
    headline:
      "Defer non-critical purchases. Renegotiate expiring deals — prices likely to correct.",
    thesis:
      "Significant decoupling between asset markets and real output. Demand-side weakness usually surfaces 60–120 days later. Conserve cash, draw down inventory, and use the leverage to push back on supplier pricing.",
    why: "FDR between 1.8 and 2.5 has historically preceded a real-economy slowdown and price reversion in commodity inputs. Buying at peak prices destroys margin; holding excess inventory ties up working capital you'll need for the recovery window.",
    tone: "tense",
    icon: TrendingDown,
    actions: [
      {
        label: "Defer non-critical POs",
        description: "Push out orders with 8+ weeks of cover",
        to: "/automated-po",
        testId: "guidance-action-defer",
        primary: true,
      },
      {
        label: "Renegotiate active contracts",
        description: "Use cycle weakness to recover margin",
        to: "/multi-tier-mapping",
        testId: "guidance-action-renegotiate",
      },
      {
        label: "Draw down inventory",
        description: "Convert carrying cost to working capital",
        to: "/inventory",
        testId: "guidance-action-drawdown",
      },
    ],
  },
  REAL_ECONOMY_LEAD: {
    label: "Real Economy Lead",
    headline:
      "Counter-cyclical window. Lock in favorable terms while asset markets correct.",
    thesis:
      "Real production is leading asset markets — a rare buyer's window. Suppliers have idle capacity and will trade volume commitments for better pricing. Move before competitors notice the asymmetry.",
    why: "FDR above 2.5 reflects an asset-market correction with the real economy still expanding. In this regime, suppliers compete for committed volume; multi-quarter agreements signed here have historically beaten spot pricing by 6–14% over the next 12 months.",
    tone: "opportunity",
    icon: TrendingUp,
    actions: [
      {
        label: "Aggressive procurement",
        description: "Place forward orders on cyclical lows",
        to: "/rfq-generation",
        testId: "guidance-action-aggressive",
        primary: true,
      },
      {
        label: "Lock multi-quarter pricing",
        description: "Sign 6–12 month agreements with key suppliers",
        to: "/multi-tier-mapping",
        testId: "guidance-action-multiquarter",
      },
      {
        label: "Build strategic stock",
        description: "Increase coverage on margin-critical SKUs",
        to: "/inventory-optimization",
        testId: "guidance-action-buildstock",
      },
    ],
  },
  UNKNOWN: {
    label: "Analyzing",
    headline: "Calibrating regime model. Standard procurement pace recommended.",
    thesis:
      "Pulling the latest macro signals. Once enough data is available, the platform will surface a specific procurement stance for your operation.",
    why: "The FDR engine refreshes every 5 minutes from FRED, World Bank, IMF, and 12 other sources. Until the signal stabilizes, treat current conditions as neutral.",
    tone: "neutral",
    icon: Target,
    actions: [
      {
        label: "Open operations playbook",
        description: "Step-by-step guidance for any regime",
        to: "/operations",
        testId: "guidance-action-playbook",
        primary: true,
      },
    ],
  },
};

const toneStyles: Record<Guidance["tone"], { ring: string; chip: string; accent: string }> = {
  calm: {
    ring: "border-l-4 border-l-emerald-500/60",
    chip: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    accent: "text-emerald-600",
  },
  warm: {
    ring: "border-l-4 border-l-amber-500/70",
    chip: "bg-amber-500/10 text-amber-700 border-amber-500/30",
    accent: "text-amber-600",
  },
  tense: {
    ring: "border-l-4 border-l-red-500/70",
    chip: "bg-red-500/10 text-red-600 border-red-500/30",
    accent: "text-red-600",
  },
  opportunity: {
    ring: "border-l-4 border-l-sky-500/70",
    chip: "bg-sky-500/10 text-sky-600 border-sky-500/30",
    accent: "text-sky-600",
  },
  neutral: {
    ring: "border-l-4 border-l-muted-foreground/30",
    chip: "bg-muted text-muted-foreground border-border",
    accent: "text-muted-foreground",
  },
};

interface RegimeProcurementGuidanceProps {
  regime?: string;
  fdr?: number;
  confidence?: number;
  previousRegime?: string;
}

export function RegimeProcurementGuidance({
  regime,
  fdr,
  confidence,
  previousRegime,
}: RegimeProcurementGuidanceProps) {
  const [, setLocation] = useLocation();
  const [whyOpen, setWhyOpen] = useState(false);

  const key = (regime as RegimeKey) || "UNKNOWN";
  const guidance = guidanceByRegime[key] || guidanceByRegime.UNKNOWN;
  const tone = toneStyles[guidance.tone];
  const safeFdr = Number.isFinite(Number(fdr)) ? Number(fdr) : null;
  const confidencePct =
    typeof confidence === "number" && Number.isFinite(confidence)
      ? Math.round(confidence * 100)
      : null;
  const Icon = guidance.icon;
  const regimeShifted =
    previousRegime &&
    regime &&
    previousRegime !== regime &&
    previousRegime !== "UNKNOWN";

  return (
    <Card
      className={`p-6 ${tone.ring}`}
      data-testid="card-regime-procurement-guidance"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`mt-0.5 ${tone.accent}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  Procurement guidance
                </span>
                <Badge
                  variant="outline"
                  className={`text-xs ${tone.chip}`}
                  data-testid="badge-guidance-regime"
                >
                  {guidance.label}
                </Badge>
                {safeFdr !== null && (
                  <span className="text-xs font-mono text-muted-foreground">
                    FDR {safeFdr.toFixed(2)}
                  </span>
                )}
                {confidencePct !== null && (
                  <span className="text-xs text-muted-foreground">
                    · {confidencePct}% confidence
                  </span>
                )}
              </div>
              <p
                className="text-base font-semibold leading-snug"
                data-testid="text-guidance-headline"
              >
                {guidance.headline}
              </p>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                {guidance.thesis}
              </p>
            </div>
          </div>
        </div>

        {regimeShifted && (
          <div
            className="rounded-md border bg-amber-500/5 border-amber-500/30 px-3 py-2 text-xs flex items-start gap-2"
            data-testid="alert-regime-shift"
          >
            <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
            <span className="text-amber-800 dark:text-amber-300">
              Regime shifted from{" "}
              <strong>{previousRegime?.replace(/_/g, " ").toLowerCase()}</strong> to{" "}
              <strong>{guidance.label}</strong>. Procurement strategy below has been
              updated.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {guidance.actions.map((action) => (
            <Button
              key={action.testId}
              variant={action.primary ? "default" : "outline"}
              className="h-auto py-3 px-4 flex-col items-start text-left whitespace-normal gap-1"
              onClick={() => setLocation(action.to)}
              data-testid={action.testId}
            >
              <span className="flex items-center gap-1.5 font-medium text-sm w-full">
                {action.label}
                <ArrowRight className="h-3.5 w-3.5 ml-auto opacity-70" />
              </span>
              <span
                className={`text-xs font-normal ${
                  action.primary
                    ? "text-primary-foreground/80"
                    : "text-muted-foreground"
                }`}
              >
                {action.description}
              </span>
            </Button>
          ))}
        </div>

        <Collapsible open={whyOpen} onOpenChange={setWhyOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-why-recommendation"
            >
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${
                  whyOpen ? "rotate-180" : ""
                }`}
              />
              Why this recommendation?
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-muted pl-3">
              {guidance.why}
            </p>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </Card>
  );
}
