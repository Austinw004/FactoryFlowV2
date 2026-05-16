import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Anchor, Activity, Shield } from "lucide-react";

interface RegimePostureBannerProps {
  // Which workspace the banner is being rendered on, so we can pick the
  // sub-message most relevant to the page (procurement / inventory / supplier).
  context: "procurement" | "inventory" | "supplier" | "forecasting";
  className?: string;
}

// Compact, one-line guidance strip. Designed to live just under the page
// title on workspace pages so the FDR model influences decisions across the
// product, not just on the dashboard.
const guidance: Record<string, Record<string, { headline: string; detail: string; icon: any }>> = {
  HEALTHY_EXPANSION: {
    procurement: {
      headline: "Healthy Expansion — negotiating window is open.",
      detail: "Vendor leverage is balanced. Good time to extend 12–18 month agreements at current pricing.",
      icon: Activity,
    },
    inventory: {
      headline: "Healthy Expansion — hold safety stock at policy.",
      detail: "Demand and lead times are predictable. No need to overbuild — focus on cycle-count accuracy.",
      icon: Activity,
    },
    supplier: {
      headline: "Healthy Expansion — qualify backups while leverage is yours.",
      detail: "Use this window to onboard alternates and document second-source qualifications.",
      icon: Activity,
    },
    forecasting: {
      headline: "Healthy Expansion — baseline forecast assumptions hold.",
      detail: "Model error should track recent history. Watch for divergence from the FDR signal as an early warning.",
      icon: Activity,
    },
  },
  ASSET_LED_GROWTH: {
    procurement: {
      headline: "Asset-Led Growth — lock in contracts before suppliers reprice.",
      detail: "Forward prices are anchored to today's real-economy levels. Expect 8–12% increases in the next 30–60 days.",
      icon: TrendingUp,
    },
    inventory: {
      headline: "Asset-Led Growth — build selective safety stock on critical SKUs.",
      detail: "Input costs are about to step up. Pull critical-path materials forward; hold non-critical at policy.",
      icon: TrendingUp,
    },
    supplier: {
      headline: "Asset-Led Growth — review supplier concentration risk.",
      detail: "Single-source materials are the most exposed when the macro reprices. Audit dependencies now.",
      icon: TrendingUp,
    },
    forecasting: {
      headline: "Asset-Led Growth — assume input-cost lift in the next quarter.",
      detail: "Adjust cost-side assumptions in your model. Demand may also pull forward as buyers anticipate the move.",
      icon: TrendingUp,
    },
  },
  IMBALANCED_EXCESS: {
    procurement: {
      headline: "Imbalanced Excess — defer non-critical buys, renegotiate expiring contracts.",
      detail: "Suppliers' order books are softening. Use that leverage to push prices and payment terms.",
      icon: TrendingDown,
    },
    inventory: {
      headline: "Imbalanced Excess — draw down inflated inventory.",
      detail: "Carrying inflated stock through the correction destroys margin. Consume before replenishing.",
      icon: TrendingDown,
    },
    supplier: {
      headline: "Imbalanced Excess — stress-test supplier financial health.",
      detail: "Some vendors will not survive a correction. Identify exposure now and pre-qualify replacements.",
      icon: TrendingDown,
    },
    forecasting: {
      headline: "Imbalanced Excess — widen confidence intervals.",
      detail: "Demand volatility is elevated. Expect under-forecast on essentials, over-forecast on discretionary.",
      icon: TrendingDown,
    },
  },
  REAL_ECONOMY_LEAD: {
    procurement: {
      headline: "Real Economy Lead — counter-cyclical buying window.",
      detail: "Vendors are price-takers. This is the moment for 12–24 month agreements and pre-buys on critical commodities.",
      icon: Anchor,
    },
    inventory: {
      headline: "Real Economy Lead — push safety stock to upper band.",
      detail: "Build on critical commodities while spot prices are at cyclical lows.",
      icon: Anchor,
    },
    supplier: {
      headline: "Real Economy Lead — competitors are bidding for capacity.",
      detail: "Lock in volume commitments with primary suppliers before financial markets re-rate.",
      icon: Anchor,
    },
    forecasting: {
      headline: "Real Economy Lead — demand model bias to the upside.",
      detail: "Real demand is leading. Forward-buys on critical materials should reflect higher run rates.",
      icon: Anchor,
    },
  },
};

const fallback = {
  headline: "Analyzing market regime",
  detail: "The FDR model is computing. Regime-specific guidance will appear here as data settles.",
  icon: Shield,
};

export function RegimePostureBanner({ context, className = "" }: RegimePostureBannerProps) {
  const { data: regime } = useQuery<any>({
    queryKey: ["/api/economics/regime"],
  });

  const regimeKey = regime?.regime || "";
  const fdr = Number.isFinite(Number(regime?.fdr)) ? Number(regime?.fdr) : null;
  const message = guidance[regimeKey]?.[context] || fallback;
  const Icon = message.icon;

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-md border border-line bg-panel/60 ${className}`}
      data-testid={`regime-posture-banner-${context}`}
    >
      <Icon className="h-4 w-4 text-signal flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground">{message.headline}</div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{message.detail}</p>
      </div>
      {fdr !== null && (
        <div className="text-right flex-shrink-0">
          <div className="eyebrow text-[10px]">FDR</div>
          <div className="mono text-sm text-foreground">{fdr.toFixed(2)}</div>
        </div>
      )}
    </div>
  );
}
