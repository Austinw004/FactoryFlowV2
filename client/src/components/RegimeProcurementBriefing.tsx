import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import {
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Lock,
  Pause,
  ShoppingCart,
  FileText,
} from "lucide-react";

interface RegimeProcurementBriefingProps {
  regime: string;
  fdr: number;
  confidence?: number;
}

interface Briefing {
  tone: "stable" | "warming" | "tense" | "opportunity";
  headline: string;
  whatItMeans: string;
  primaryAction: { label: string; route: string; icon: any };
  supportingActions: { label: string; route: string; icon: any }[];
  expectedImpact: string;
}

const briefings: Record<string, Briefing> = {
  HEALTHY_EXPANSION: {
    tone: "stable",
    headline: "Stable conditions. Standard procurement pace.",
    whatItMeans:
      "Asset and real economy circuits are balanced. Input cost volatility is muted, supplier capacity is steady, and pricing pressure is normal. This is the right window to negotiate longer-term contracts at today's prices and qualify backup suppliers while you have leverage.",
    primaryAction: {
      label: "Lock in long-term supplier contracts",
      route: "/procurement",
      icon: Lock,
    },
    supportingActions: [
      { label: "Qualify backup suppliers", route: "/supplier-risk", icon: ShieldCheck },
      { label: "Review forecast accuracy", route: "/forecast-accuracy", icon: TrendingUp },
    ],
    expectedImpact: "Historically, regimes like this last 60-180 days. Use the calm to harden your supply base.",
  },
  ASSET_LED_GROWTH: {
    tone: "warming",
    headline: "Asset markets outpacing real output. Input costs likely to rise.",
    whatItMeans:
      "Financial circuits are running ahead of the real economy. Historically, this regime precedes 8-12% input cost increases over 1-2 quarters as the real side catches up. Lock contracts before the next pricing cycle and pre-buy critical materials with price-volatile profiles.",
    primaryAction: {
      label: "Lock in contracts before next pricing cycle",
      route: "/procurement",
      icon: Lock,
    },
    supportingActions: [
      { label: "View materials with rising exposure", route: "/inventory", icon: AlertTriangle },
      { label: "Run forward-buy scenario", route: "/scenario-simulation", icon: TrendingUp },
    ],
    expectedImpact: "Action window: ~30-60 days before pricing pressure becomes visible in supplier quotes.",
  },
  IMBALANCED_EXCESS: {
    tone: "tense",
    headline: "Significant decoupling. Defensive posture recommended.",
    whatItMeans:
      "The gap between financial activity and real economic output is wide enough that a correction becomes increasingly likely. Defer non-critical purchases, renegotiate expiring contracts on shorter terms, and stress-test your supplier base for downturn risk. Build safety stock only on materials that would halt production.",
    primaryAction: {
      label: "Defer non-critical purchase orders",
      route: "/procurement",
      icon: Pause,
    },
    supportingActions: [
      { label: "Stress-test supplier risk", route: "/supplier-risk", icon: AlertTriangle },
      { label: "Renegotiate expiring contracts", route: "/procurement", icon: FileText },
    ],
    expectedImpact: "Preserve cash and flexibility. The correction window typically opens within 1-2 quarters.",
  },
  REAL_ECONOMY_LEAD: {
    tone: "opportunity",
    headline: "Counter-cyclical window. Favorable supplier terms available.",
    whatItMeans:
      "Real output is leading financial markets — supplier capacity is underutilized and pricing leverage has shifted to buyers. This is the highest-ROI window for locking in 12-24 month contracts, pre-buying commodity-priced materials, and qualifying new suppliers at favorable terms.",
    primaryAction: {
      label: "Lock in 12-24 month supplier agreements",
      route: "/procurement",
      icon: Lock,
    },
    supportingActions: [
      { label: "Pre-buy commodity materials", route: "/inventory", icon: ShoppingCart },
      { label: "Renegotiate active contracts", route: "/procurement", icon: FileText },
    ],
    expectedImpact: "Counter-cyclical windows close fast — typically 1-2 quarters before competitors crowd the trade.",
  },
};

const toneStyles: Record<Briefing["tone"], { accent: string; chip: string; chipText: string; iconColor: string }> = {
  stable: {
    accent: "border-l-4 border-l-good",
    chip: "bg-good/10",
    chipText: "text-good",
    iconColor: "text-good",
  },
  warming: {
    accent: "border-l-4 border-l-amber-500",
    chip: "bg-amber-500/10",
    chipText: "text-amber-600 dark:text-amber-400",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  tense: {
    accent: "border-l-4 border-l-bad",
    chip: "bg-bad/10",
    chipText: "text-bad",
    iconColor: "text-bad",
  },
  opportunity: {
    accent: "border-l-4 border-l-signal",
    chip: "bg-signal/10",
    chipText: "text-signal",
    iconColor: "text-signal",
  },
};

const regimeLabels: Record<string, string> = {
  HEALTHY_EXPANSION: "Healthy Expansion",
  ASSET_LED_GROWTH: "Asset-Led Growth",
  IMBALANCED_EXCESS: "Imbalanced Excess",
  REAL_ECONOMY_LEAD: "Real Economy Lead",
};

export function RegimeProcurementBriefing({ regime, fdr, confidence }: RegimeProcurementBriefingProps) {
  const [, setLocation] = useLocation();
  const briefing = briefings[regime] || briefings.HEALTHY_EXPANSION;
  const tone = toneStyles[briefing.tone];
  const PrimaryIcon = briefing.primaryAction.icon;
  const regimeLabel = regimeLabels[regime] || "Analyzing";
  const confidencePct = confidence != null && Number.isFinite(confidence) ? Math.round(confidence * 100) : null;

  return (
    <Card
      className={`p-6 ${tone.accent}`}
      data-testid="card-regime-procurement-briefing"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Procurement briefing
            </span>
            <Badge variant="outline" className={`text-xs ${tone.chipText}`}>
              {regimeLabel}
            </Badge>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              FDR {fdr.toFixed(2)}
              {confidencePct != null && ` · ${confidencePct}% confidence`}
            </span>
          </div>
          <h2 className="text-xl font-semibold leading-snug" data-testid="text-briefing-headline">
            {briefing.headline}
          </h2>
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-3xl">
        {briefing.whatItMeans}
      </p>

      <div className="flex items-center gap-3 flex-wrap mb-4">
        <Button
          size="default"
          onClick={() => setLocation(briefing.primaryAction.route)}
          data-testid="button-briefing-primary-action"
          className="gap-2"
        >
          <PrimaryIcon className="h-4 w-4" />
          {briefing.primaryAction.label}
          <ArrowRight className="h-4 w-4" />
        </Button>
        {briefing.supportingActions.map((action, idx) => {
          const Icon = action.icon;
          return (
            <Button
              key={idx}
              variant="ghost"
              size="default"
              onClick={() => setLocation(action.route)}
              data-testid={`button-briefing-support-${idx}`}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <Icon className="h-4 w-4" />
              {action.label}
            </Button>
          );
        })}
      </div>

      <div className={`flex items-start gap-2 rounded-md ${tone.chip} p-3 text-xs`}>
        <TrendingDown className={`h-4 w-4 ${tone.iconColor} shrink-0 mt-0.5`} />
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground">Why this matters: </span>
          {briefing.expectedImpact}
        </span>
      </div>
    </Card>
  );
}
