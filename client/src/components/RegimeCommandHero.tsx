import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, AlertTriangle, TrendingUp, Anchor, Shield, Activity } from "lucide-react";
import { useLocation } from "wouter";

interface RegimeCommandHeroProps {
  regime: string;
  fdr: number;
  source?: string;
  timestamp?: string;
  skuCount: number;
  signalCount: number;
}

// Each regime is a procurement posture, not a status. The customer must
// leave this hero knowing the ONE thing to do this week and where to do it.
const playbooks: Record<string, {
  label: string;
  headline: string;
  meaning: string;
  topAction: { title: string; reasoning: string };
  ctaPrimary: { label: string; path: string };
  ctaSecondary: { label: string; path: string };
  accent: string;
  accentDot: string;
  icon: any;
  postureTag: string;
}> = {
  HEALTHY_EXPANSION: {
    label: "Healthy Expansion",
    headline: "Stable conditions. Standard procurement pace.",
    meaning: "Asset markets and the real economy are tracking together. Pricing is predictable through the next cycle.",
    topAction: {
      title: "Negotiate long-term supplier contracts",
      reasoning: "Vendor leverage is balanced and forward prices are reliable — this is the window for 12–18 month agreements before the next regime shift.",
    },
    ctaPrimary: { label: "Review supplier contracts", path: "/procurement" },
    ctaSecondary: { label: "Run rolling forecast", path: "/forecasting" },
    accent: "border-l-[color:#7FB09A]",
    accentDot: "bg-good",
    icon: Activity,
    postureTag: "Posture: standard",
  },
  ASSET_LED_GROWTH: {
    label: "Asset-Led Growth",
    headline: "Asset markets are pulling ahead. Lock in pricing now.",
    meaning: "Financial markets are outpacing real-economy demand. Input costs historically rise 8–12% in the following quarter as the gap closes.",
    topAction: {
      title: "Lock in contracts on critical materials",
      reasoning: "Forward prices are still anchored to today's real-economy levels. Suppliers will reprice within 30–60 days as the financial signal propagates through their cost base.",
    },
    ctaPrimary: { label: "View exposed materials", path: "/inventory-management" },
    ctaSecondary: { label: "Start contract negotiation", path: "/procurement" },
    accent: "border-l-[color:#CC785C]",
    accentDot: "bg-signal",
    icon: TrendingUp,
    postureTag: "Posture: defensive procurement",
  },
  IMBALANCED_EXCESS: {
    label: "Imbalanced Excess",
    headline: "Significant decoupling detected. Defer, renegotiate, build safety stock only on critical.",
    meaning: "Asset markets are sharply detached from the real economy. Historical pattern: a correction in 60–120 days, with spot prices falling on non-critical materials before contracts reprice.",
    topAction: {
      title: "Defer non-critical purchases, renegotiate expiring contracts",
      reasoning: "Buying at today's prices on non-critical SKUs locks in peak cost. Suppliers will accept renegotiation as their order books soften — but only critical-path materials warrant safety-stock builds right now.",
    },
    ctaPrimary: { label: "Audit open purchase orders", path: "/procurement" },
    ctaSecondary: { label: "Identify critical materials", path: "/inventory-management" },
    accent: "border-l-[color:#C47A6E]",
    accentDot: "bg-bad",
    icon: AlertTriangle,
    postureTag: "Posture: defensive, selective",
  },
  REAL_ECONOMY_LEAD: {
    label: "Real Economy Lead",
    headline: "Counter-cyclical window. Lock in favorable supplier terms.",
    meaning: "Real-economy strength is outrunning asset markets. Suppliers are price-takers right now; this window typically closes when financial markets catch up over the next 1–2 quarters.",
    topAction: {
      title: "Renegotiate expiring agreements and pre-buy critical commodities",
      reasoning: "Vendors are competing for visible demand — your leverage on price, payment terms, and minimum quantities is at its cyclical maximum.",
    },
    ctaPrimary: { label: "Renegotiate supplier terms", path: "/procurement" },
    ctaSecondary: { label: "Pre-buy commodity forecast", path: "/commodity-forecasts" },
    accent: "border-l-[color:#7FB09A]",
    accentDot: "bg-good",
    icon: Anchor,
    postureTag: "Posture: opportunistic",
  },
};

const fallback = {
  label: "Analyzing",
  headline: "Calibrating the FDR model against incoming economic data.",
  meaning: "The platform is computing the Financial-Real Decoupling ratio from market and macro feeds. Recommendations will sharpen as data settles.",
  topAction: {
    title: "Connect ERP or load sample data",
    reasoning: "Regime-aware recommendations get more specific once the platform can map your SKUs and suppliers against the macro signal.",
  },
  ctaPrimary: { label: "Open Operations Hub", path: "/operations-hub" },
  ctaSecondary: { label: "Configure data sources", path: "/integrations" },
  accent: "border-l-line",
  accentDot: "bg-muted",
  icon: Shield,
  postureTag: "Posture: calibrating",
};

function fdrInterpretation(fdr: number, regime: string): string {
  if (!Number.isFinite(fdr)) return "FDR unavailable";
  if (regime === "ASSET_LED_GROWTH") return `${fdr.toFixed(2)} — asset circuit running hot`;
  if (regime === "IMBALANCED_EXCESS") return `${fdr.toFixed(2)} — correction risk elevated`;
  if (regime === "REAL_ECONOMY_LEAD") return `${fdr.toFixed(2)} — real economy in lead`;
  if (regime === "HEALTHY_EXPANSION") return `${fdr.toFixed(2)} — circuits aligned`;
  return fdr.toFixed(2);
}

export function RegimeCommandHero({
  regime,
  fdr,
  source,
  timestamp,
  skuCount,
  signalCount,
}: RegimeCommandHeroProps) {
  const [, setLocation] = useLocation();
  const book = playbooks[regime] || fallback;
  const Icon = book.icon;
  const sourceLabel =
    source === "external" ? "Live macro feeds" : source === "balance_sheet" ? "Internal balance sheet" : source === "fallback" ? "Fallback model" : "—";
  const updated = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "live";

  return (
    <Card
      className={`p-8 mb-8 border-l-4 ${book.accent} bg-panel border-line`}
      data-testid="regime-command-hero"
    >
      <div className="flex items-start gap-6">
        <div className="hidden md:flex flex-col items-center gap-2 pt-1 min-w-[44px]">
          <div className={`h-2 w-2 rounded-full ${book.accentDot}`} />
          <Icon className="h-5 w-5 text-soft" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="eyebrow">FDR Regime</div>
            <span className="text-xs text-muted">·</span>
            <span className="mono text-xs text-soft" data-testid="regime-fdr-readout">
              {fdrInterpretation(fdr, regime)}
            </span>
            <span className="text-xs text-muted">·</span>
            <span className="mono text-xs text-muted">{sourceLabel} · {updated}</span>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider ml-auto">
              {book.postureTag}
            </Badge>
          </div>

          <h1 className="hero text-3xl md:text-4xl text-bone leading-tight">
            {book.headline}
          </h1>

          <p className="text-soft mt-4 max-w-2xl leading-relaxed">
            {book.meaning}
          </p>

          <div className="mt-6 pt-6 border-t border-line">
            <div className="flex items-start gap-3">
              <ArrowRight className="h-4 w-4 text-signal flex-shrink-0 mt-1" />
              <div className="flex-1">
                <div className="text-xs uppercase tracking-[0.18em] text-muted mb-1">
                  Top action this week
                </div>
                <div className="text-bone font-medium text-base md:text-lg">
                  {book.topAction.title}
                </div>
                <p className="text-soft text-sm mt-2 max-w-2xl leading-relaxed">
                  <span className="text-muted">Why: </span>{book.topAction.reasoning}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button
                onClick={() => setLocation(book.ctaPrimary.path)}
                data-testid="hero-cta-primary"
                className="bg-signal text-ink hover:bg-bone border-signal"
              >
                {book.ctaPrimary.label}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation(book.ctaSecondary.path)}
                data-testid="hero-cta-secondary"
              >
                {book.ctaSecondary.label}
              </Button>
              <div className="ml-auto text-xs text-muted mono">
                {skuCount.toLocaleString()} SKU{skuCount === 1 ? "" : "s"} tracked ·{" "}
                {signalCount} recommended action{signalCount === 1 ? "" : "s"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
