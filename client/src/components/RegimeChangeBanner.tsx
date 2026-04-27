import { Button } from "@/components/ui/button";
import { ArrowRight, X, Zap } from "lucide-react";
import { useLocation } from "wouter";

interface RegimeChange {
  from: string;
  to: string;
  fdr: number | string;
  changedAt: number;
  severity?: "low" | "medium" | "high";
}

interface RegimeChangeBannerProps {
  change: RegimeChange;
  onDismiss: () => void;
}

const labels: Record<string, string> = {
  HEALTHY_EXPANSION: "Healthy Expansion",
  ASSET_LED_GROWTH: "Asset-Led Growth",
  IMBALANCED_EXCESS: "Imbalanced Excess",
  REAL_ECONOMY_LEAD: "Real Economy Lead",
};

const impacts: Record<string, string> = {
  HEALTHY_EXPANSION:
    "Procurement risk has eased. Standard pace recommended; this is a good window to negotiate longer-term contracts.",
  ASSET_LED_GROWTH:
    "Input costs likely to rise 8–12% over the next quarter. Pull forward POs on long-lead materials and lock in supplier pricing now.",
  IMBALANCED_EXCESS:
    "Correction risk is elevated. Defer non-critical purchases, renegotiate expiring contracts, and build safety stock only on single-source materials.",
  REAL_ECONOMY_LEAD:
    "Counter-cyclical opportunity. Suppliers are typically more flexible on price and terms — re-open negotiations on expiring agreements.",
};

export function RegimeChangeBanner({ change, onDismiss }: RegimeChangeBannerProps) {
  const [, setLocation] = useLocation();
  const fromLabel = labels[change.from] || change.from;
  const toLabel = labels[change.to] || change.to;
  const fdrNum = Number(change.fdr);
  const fdr = Number.isFinite(fdrNum) ? fdrNum.toFixed(2) : "—";
  const impact = impacts[change.to] || "Procurement strategy should be reviewed.";

  const timeAgo = (() => {
    const mins = Math.floor((Date.now() - change.changedAt) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  })();

  return (
    <div
      className="relative rounded-xl border border-amber-500/40 bg-amber-500/[0.06] p-5"
      data-testid="regime-change-banner"
      role="status"
      aria-live="polite"
    >
      <button
        onClick={onDismiss}
        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss regime change banner"
        data-testid="regime-change-dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="rounded-lg p-2 bg-background/60 border border-amber-500/30">
          <Zap className="h-4 w-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-[0.14em] text-amber-700 dark:text-amber-400 mb-1">
            Economic regime shifted · {timeAgo}
          </div>
          <h3 className="font-semibold text-base leading-tight">
            {fromLabel} → {toLabel} <span className="text-muted-foreground font-mono text-sm">(FDR {fdr})</span>
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mt-1.5">{impact}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              size="sm"
              onClick={() => setLocation("/inventory")}
              data-testid="regime-change-action-impact"
            >
              View impact analysis
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLocation("/supplier-risk")}
              data-testid="regime-change-action-contracts"
            >
              Review contracts
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
