import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { ArrowRight, ShieldCheck, Flame, AlertOctagon, Sparkles } from "lucide-react";

type Regime =
  | "HEALTHY_EXPANSION"
  | "ASSET_LED_GROWTH"
  | "IMBALANCED_EXCESS"
  | "REAL_ECONOMY_LEAD"
  | "UNKNOWN";

interface ActionLink {
  label: string;
  to: string;
}

interface RegimePlaybook {
  posture: string; // short headline framing the recommended posture
  guidance: string; // full prescriptive guidance — what to do, why
  toneClass: string; // tailwind classes for the accent treatment
  badgeClass: string;
  Icon: React.ComponentType<{ className?: string }>;
  actions: ActionLink[];
}

const playbooks: Record<Regime, RegimePlaybook> = {
  HEALTHY_EXPANSION: {
    posture: "Standard procurement pace. Negotiate long-term contracts.",
    guidance:
      "Asset and real-economy circuits are in equilibrium. Material costs are unlikely to spike near term — this is a good window to lock in 12–24 month supplier agreements at current pricing and consolidate spend with your strongest suppliers.",
    toneClass: "border-emerald-500/30 bg-emerald-500/[0.04]",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    Icon: ShieldCheck,
    actions: [
      { label: "Review supplier risk", to: "/supplier-risk" },
      { label: "Run baseline forecast", to: "/forecasting" },
    ],
  },
  ASSET_LED_GROWTH: {
    posture: "Lock in contracts before the next pricing cycle.",
    guidance:
      "Asset markets are running ahead of the real economy. In prior cycles this regime preceded 8–12% input-cost increases over the following quarter. Lock in supplier pricing on critical materials now, pull forward POs on long-lead items, and avoid open-ended index-priced contracts.",
    toneClass: "border-amber-500/40 bg-amber-500/[0.05]",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    Icon: Flame,
    actions: [
      { label: "View exposed materials", to: "/inventory" },
      { label: "Start contract renewals", to: "/supplier-risk" },
    ],
  },
  IMBALANCED_EXCESS: {
    posture: "Defer non-critical purchases. Build safety stock on critical SKUs.",
    guidance:
      "Significant decoupling between financial and real-economy activity raises the odds of a correction. Defer discretionary purchases, renegotiate any contracts expiring in the next 90 days, and use any short-term cash freed up to build safety stock on single-source or tariff-exposed materials only.",
    toneClass: "border-rose-500/40 bg-rose-500/[0.05]",
    badgeClass: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
    Icon: AlertOctagon,
    actions: [
      { label: "Review at-risk materials", to: "/inventory" },
      { label: "Run scenario simulation", to: "/scenario-simulation" },
    ],
  },
  REAL_ECONOMY_LEAD: {
    posture: "Counter-cyclical window. Renegotiate while suppliers need volume.",
    guidance:
      "Real economic output is leading financial markets — a counter-cyclical opportunity. Suppliers are typically more flexible on price and terms in this regime. Renegotiate expiring agreements, consolidate spend to win volume discounts, and lock in extended payment terms.",
    toneClass: "border-sky-500/30 bg-sky-500/[0.05]",
    badgeClass: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
    Icon: Sparkles,
    actions: [
      { label: "Open contract negotiations", to: "/supplier-risk" },
      { label: "Optimize allocation", to: "/allocation" },
    ],
  },
  UNKNOWN: {
    posture: "Analyzing market conditions.",
    guidance:
      "We're calibrating the FDR (Financial-Real Decoupling) signal against the latest macro data. Procurement guidance will appear here as soon as the regime is confirmed.",
    toneClass: "border-border bg-muted/20",
    badgeClass: "bg-muted text-muted-foreground border-border",
    Icon: ShieldCheck,
    actions: [],
  },
};

const regimeLabels: Record<Regime, string> = {
  HEALTHY_EXPANSION: "Healthy Expansion",
  ASSET_LED_GROWTH: "Asset-Led Growth",
  IMBALANCED_EXCESS: "Imbalanced Excess",
  REAL_ECONOMY_LEAD: "Real Economy Lead",
  UNKNOWN: "Analyzing",
};

interface RegimeProcurementGuidanceProps {
  regime: string;
  fdr: number;
  confidencePct?: number;
}

export function RegimeProcurementGuidance({
  regime,
  fdr,
  confidencePct,
}: RegimeProcurementGuidanceProps) {
  const key = (regime as Regime) in playbooks ? (regime as Regime) : "UNKNOWN";
  const book = playbooks[key];
  const [, setLocation] = useLocation();
  const Icon = book.Icon;

  return (
    <div
      className={`rounded-xl border ${book.toneClass} p-6`}
      data-testid="regime-procurement-guidance"
    >
      <div className="flex items-start gap-4">
        <div className="rounded-lg p-2 bg-background/60 border border-border/60">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Recommended posture
            </span>
            <Badge variant="outline" className={`text-[10px] ${book.badgeClass}`}>
              {regimeLabels[key]} · FDR {Number.isFinite(fdr) ? fdr.toFixed(2) : "—"}
            </Badge>
            {typeof confidencePct === "number" && confidencePct > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {confidencePct}% confidence
              </Badge>
            )}
          </div>
          <h2 className="text-xl font-semibold leading-tight mb-2" data-testid="regime-posture">
            {book.posture}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed" data-testid="regime-guidance">
            {book.guidance}
          </p>
          {book.actions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {book.actions.map((a, i) => (
                <Button
                  key={a.to}
                  size="sm"
                  variant={i === 0 ? "default" : "outline"}
                  onClick={() => setLocation(a.to)}
                  data-testid={`regime-action-${i}`}
                >
                  {a.label}
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              ))}
            </div>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground/80 leading-relaxed">
            <strong>Why this guidance:</strong> the FDR (Financial–Real Decoupling) score
            measures the gap between asset-market activity and real economic output. A
            higher FDR means the financial circuit is running ahead of the real economy —
            historically a leading indicator for input-cost volatility and supplier risk.
          </p>
        </div>
      </div>
    </div>
  );
}
