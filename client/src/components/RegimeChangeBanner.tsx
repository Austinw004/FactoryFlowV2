import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowRight, X, Zap } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";

interface RegimeNotification {
  id: string;
  fromRegime: string;
  toRegime: string;
  fdrAtChange: number;
  timestamp: string;
  acknowledged: number;
}

const regimeLabels: Record<string, string> = {
  HEALTHY_EXPANSION: "Healthy Expansion",
  ASSET_LED_GROWTH: "Asset-Led Growth",
  IMBALANCED_EXCESS: "Imbalanced Excess",
  REAL_ECONOMY_LEAD: "Real Economy Lead",
};

// What the operator should DO when each regime becomes active. Mirrors the
// canonical posture language used on the Dashboard hero so the banner reads
// as the same voice the customer sees throughout the product.
const regimeImpact: Record<string, string> = {
  HEALTHY_EXPANSION:
    "Window to negotiate long-term contracts at standard pricing. Maintain normal procurement pace.",
  ASSET_LED_GROWTH:
    "Input costs likely to rise 8-12% over the next quarter. Lock in supplier contracts on critical materials now.",
  IMBALANCED_EXCESS:
    "Defer non-critical purchases. Renegotiate expiring contracts. Build safety stock only on materials with no alternatives.",
  REAL_ECONOMY_LEAD:
    "Counter-cyclical window. Suppliers are open to favorable terms — lock in long-dated agreements while asset markets correct.",
};

const regimeAccent: Record<string, string> = {
  HEALTHY_EXPANSION: "border-emerald-500/40 bg-emerald-500/5",
  ASSET_LED_GROWTH: "border-amber-500/40 bg-amber-500/5",
  IMBALANCED_EXCESS: "border-red-500/40 bg-red-500/5",
  REAL_ECONOMY_LEAD: "border-blue-500/40 bg-blue-500/5",
};

function formatWhen(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "recently";
  const ageMs = Date.now() - d.getTime();
  const hours = Math.floor(ageMs / 3_600_000);
  if (hours < 1) return "in the last hour";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export function RegimeChangeBanner() {
  const [, setLocation] = useLocation();
  const { data: notifications = [] } = useQuery<RegimeNotification[]>({
    queryKey: ["/api/regime-notifications"],
    refetchInterval: 60_000,
  });

  // Surface the single most recent unacknowledged shift. Stacking multiple
  // banners would compete with the hero — only the latest transition needs
  // to be a top-of-page event. Older shifts are surfaced via the Activity Feed.
  const latest = notifications
    .filter((n) => n.acknowledged === 0)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  const acknowledge = useMutation({
    mutationFn: (id: string) =>
      apiRequest("POST", `/api/regime-notifications/${id}/acknowledge`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/regime-notifications"] });
    },
  });

  if (!latest) return null;

  const fromLabel = regimeLabels[latest.fromRegime] || latest.fromRegime;
  const toLabel = regimeLabels[latest.toRegime] || latest.toRegime;
  const impact = regimeImpact[latest.toRegime] ||
    "Procurement posture has shifted. Review the new regime guidance below.";
  const accent = regimeAccent[latest.toRegime] || "border-primary/40 bg-primary/5";

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-4 mb-6 ${accent}`}
      data-testid="banner-regime-change"
      role="status"
    >
      <Zap className="h-5 w-5 mt-0.5 shrink-0 text-foreground" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug">
          Economic regime shifted from {fromLabel} to {toLabel}{" "}
          <span className="text-muted-foreground font-normal">
            · {formatWhen(latest.timestamp)} · FDR {latest.fdrAtChange.toFixed(2)}
          </span>
        </p>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{impact}</p>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Button
            size="sm"
            variant="default"
            onClick={() => setLocation("/action-playbooks")}
            data-testid="button-regime-banner-playbook"
          >
            Open regime playbook
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setLocation("/historical-backtesting")}
            data-testid="button-regime-banner-impact"
          >
            View impact analysis
          </Button>
        </div>
      </div>
      <button
        type="button"
        onClick={() => acknowledge.mutate(latest.id)}
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
        aria-label="Dismiss regime change notification"
        data-testid="button-regime-banner-dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
