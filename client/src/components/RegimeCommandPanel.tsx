import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import {
  ArrowRight,
  Lock,
  TrendingUp,
  Pause,
  ShoppingCart,
  Activity,
} from "lucide-react";

type RegimePlaybook = {
  headline: string;
  meaning: string;
  directive: string;
  reasoning: string;
  primaryAction: { label: string; href: string };
  secondaryAction: { label: string; href: string };
  tone: "calm" | "warm" | "tense" | "opportunity";
  icon: typeof Lock;
};

const playbooks: Record<string, RegimePlaybook> = {
  HEALTHY_EXPANSION: {
    headline: "Standard procurement pace.",
    meaning:
      "Asset markets and the real economy are aligned. No unusual pressure on input costs or supplier capacity.",
    directive: "Negotiate long-term contracts now while pricing is stable.",
    reasoning:
      "Stable FDR is the rare window where suppliers will commit to fixed pricing without volatility premiums. Lock in 12-24 month terms before the next regime shift.",
    primaryAction: { label: "Review supplier contracts", href: "/suppliers" },
    secondaryAction: { label: "View materials", href: "/materials" },
    tone: "calm",
    icon: Activity,
  },
  ASSET_LED_GROWTH: {
    headline: "Lock in supplier contracts before Q3 pricing cycle.",
    meaning:
      "Asset prices are outpacing the real economy. Material costs historically rise 8-12% during this regime.",
    directive: "Pre-purchase critical materials and lock in fixed-price contracts now.",
    reasoning:
      "Suppliers will raise prices within 30-60 days as commodity inputs reprice. Every week of delay compounds the cost penalty on your next PO cycle.",
    primaryAction: { label: "View exposed materials", href: "/materials-at-risk" },
    secondaryAction: { label: "Start contract negotiations", href: "/suppliers" },
    tone: "warm",
    icon: Lock,
  },
  IMBALANCED_EXCESS: {
    headline: "Defer non-critical purchases. Renegotiate contracts.",
    meaning:
      "Significant decoupling between financial markets and the real economy. Prices are at cyclical highs and likely to correct.",
    directive: "Build safety stock only on critical materials. Defer everything else.",
    reasoning:
      "Buying at peak inflates carrying cost AND locks you into above-market pricing. Wait 60-90 days for the correction, then rebuild inventory at lower cost.",
    primaryAction: { label: "Review at-risk materials", href: "/materials-at-risk" },
    secondaryAction: { label: "Adjust safety stock", href: "/inventory-optimization" },
    tone: "tense",
    icon: Pause,
  },
  REAL_ECONOMY_LEAD: {
    headline: "Counter-cyclical window. Buy and lock in now.",
    meaning:
      "The real economy is leading recovery while asset markets correct. Suppliers are competing for orders at favorable terms.",
    directive: "Renegotiate expiring agreements and stock up on long-lead-time materials.",
    reasoning:
      "Supplier negotiating leverage flips in your favor for 4-6 weeks during this regime. After the asset-side recovers, you'll lose this pricing power.",
    primaryAction: { label: "Find supplier opportunities", href: "/suppliers" },
    secondaryAction: { label: "Review contracts expiring", href: "/contract-management" },
    tone: "opportunity",
    icon: ShoppingCart,
  },
};

const toneStyles: Record<RegimePlaybook["tone"], { accent: string; chip: string; iconClass: string }> = {
  calm: {
    accent: "border-l-4 border-l-good",
    chip: "bg-good/10 text-good border-good/30",
    iconClass: "text-good",
  },
  warm: {
    accent: "border-l-4 border-l-amber-500",
    chip: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    iconClass: "text-amber-500",
  },
  tense: {
    accent: "border-l-4 border-l-destructive",
    chip: "bg-destructive/10 text-destructive border-destructive/30",
    iconClass: "text-destructive",
  },
  opportunity: {
    accent: "border-l-4 border-l-signal",
    chip: "bg-signal/10 text-signal border-signal/30",
    iconClass: "text-signal",
  },
};

interface RegimeCommandPanelProps {
  regime: string;
  fdr: number;
  friendlyRegime: string;
  isLive: boolean;
}

export function RegimeCommandPanel({
  regime,
  fdr,
  friendlyRegime,
  isLive,
}: RegimeCommandPanelProps) {
  const [, setLocation] = useLocation();
  const playbook = playbooks[regime] || playbooks.HEALTHY_EXPANSION;
  const styles = toneStyles[playbook.tone];
  const Icon = playbook.icon;

  return (
    <Card
      className={`p-6 mb-12 ${styles.accent}`}
      data-testid="regime-command-panel"
    >
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 mt-1 ${styles.iconClass}`}>
          <Icon className="h-6 w-6" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="eyebrow">Right now</span>
            <Badge variant="outline" className={`text-xs ${styles.chip}`}>
              {friendlyRegime} · FDR {Number.isFinite(fdr) ? fdr.toFixed(2) : "—"}
            </Badge>
            {isLive && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-good opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-good" />
                </span>
                Live
              </span>
            )}
          </div>

          <h2 className="text-xl font-semibold leading-tight mb-2">
            {playbook.headline}
          </h2>

          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            <span className="text-foreground font-medium">{playbook.directive}</span>{" "}
            {playbook.meaning}
          </p>

          <details className="text-xs text-muted-foreground mb-4 group">
            <summary className="cursor-pointer hover:text-foreground transition-colors inline-flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Why this recommendation?
            </summary>
            <p className="mt-2 pl-4 border-l border-border leading-relaxed">
              {playbook.reasoning}
            </p>
          </details>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => setLocation(playbook.primaryAction.href)}
              data-testid="button-regime-primary-action"
            >
              {playbook.primaryAction.label}
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLocation(playbook.secondaryAction.href)}
              data-testid="button-regime-secondary-action"
            >
              {playbook.secondaryAction.label}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
