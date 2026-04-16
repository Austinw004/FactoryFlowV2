import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Activity, ShieldCheck, AlertTriangle, TrendingUp, TrendingDown, Minus, ArrowRight, Lock, TrendingDown as DeferIcon, ShieldOff, Handshake } from "lucide-react";
import { InfoTooltip } from "@/components/InfoTooltip";
import { useLocation } from "wouter";

type Regime = "HEALTHY_EXPANSION" | "ASSET_LED_GROWTH" | "IMBALANCED_EXCESS" | "REAL_ECONOMY_LEAD";

interface RegimeEvidence {
  fdr: number;
  regime: string;
  thresholds: { min: number; max: number };
  confidence: {
    overall: number;
    fdrStability: number;
    regimeMaturity: number;
    transitionRisk: number;
    dataQuality: number;
  };
  distanceToNextThreshold: number;
  regimeDurationDays: number;
  dataSource: string;
  timestamp: string;
}

interface RegimeStatusProps {
  regime: Regime;
  fdr: number;
  intensity: number;
  regimeEvidence?: RegimeEvidence;
  intelligence?: {
    fdrTrend?: {
      trendDirection?: string;
      velocity?: number;
    };
    transitionPrediction?: {
      transitionProbability?: number;
      predictedRegime?: string;
    };
    confidence?: {
      overall?: number;
      fdrStability?: number;
      regimeMaturity?: number;
      transitionRisk?: number;
      dataQuality?: number;
    };
  };
}

const regimeConfig: Record<Regime, {
  label: string;
  description: string;
  thresholdRange: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  procurementAction: {
    title: string;
    bullets: string[];
    actionLabel: string;
    actionPath: string;
    Icon: any;
    accentClass: string;
  };
}> = {
  HEALTHY_EXPANSION: {
    label: "Healthy Expansion",
    description: "Balanced growth. Standard procurement pace.",
    thresholdRange: "FDR < 1.2",
    variant: "default",
    procurementAction: {
      title: "Negotiation window: establish long-term contracts now.",
      bullets: [
        "Market equilibrium reduces supplier leverage — push for fixed-price agreements",
        "Extend contract terms (12–24 months) before conditions tighten",
        "Standard reorder cadence is appropriate — no urgency to pre-buy",
      ],
      actionLabel: "Review Supplier Contracts",
      actionPath: "/multi-tier-mapping",
      Icon: Handshake,
      accentClass: "border-green-500/20 bg-green-500/5 text-green-700 dark:text-green-400",
    },
  },
  ASSET_LED_GROWTH: {
    label: "Asset-Led Growth",
    description: "Assets outpacing real economy. Lock in contracts before prices climb.",
    thresholdRange: "FDR 1.2 - 1.8",
    variant: "secondary",
    procurementAction: {
      title: "Action required: lock in contracts before Q3 pricing cycle.",
      bullets: [
        "Input costs historically rise 8–12% during this regime — buy ahead",
        "Pre-purchase critical materials with 3–6 month supply buffer",
        "Accelerate any pending RFQs — delay costs more each week",
      ],
      actionLabel: "Start Contract Negotiations",
      actionPath: "/rfq-generation",
      Icon: Lock,
      accentClass: "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400",
    },
  },
  IMBALANCED_EXCESS: {
    label: "Imbalanced Excess",
    description: "Significant decoupling detected. Defer purchases. Renegotiate contracts.",
    thresholdRange: "FDR 1.8 - 2.5",
    variant: "destructive",
    procurementAction: {
      title: "Defer non-critical purchases. Every dollar spent now is overpaying.",
      bullets: [
        "Hold all non-critical purchase orders pending market correction",
        "Build safety stock on business-critical materials only",
        "Renegotiate any contracts expiring in the next 90 days",
      ],
      actionLabel: "Review Pending Orders",
      actionPath: "/procurement",
      Icon: DeferIcon,
      accentClass: "border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-400",
    },
  },
  REAL_ECONOMY_LEAD: {
    label: "Real Economy Lead",
    description: "Counter-cyclical window open. Favorable terms available now.",
    thresholdRange: "FDR > 2.5",
    variant: "default",
    procurementAction: {
      title: "Buyer's market: lock in long-term agreements while leverage is yours.",
      bullets: [
        "Suppliers are under pricing pressure — renegotiate rates aggressively",
        "Extend contract durations while you have favorable positioning",
        "Consider increasing safety stock at current favorable prices",
      ],
      actionLabel: "Lock In Supplier Terms",
      actionPath: "/rfq-generation",
      Icon: TrendingUp,
      accentClass: "border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-400",
    },
  },
};

function ConfidenceBar({ label, value, testId, tooltip }: { label: string; value: number; testId?: string; tooltip?: string }) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const pct = Math.round(safeValue * 100);
  return (
    <div className="space-y-1" data-testid={testId}>
      <div className="flex justify-between items-center text-xs">
        <span className="text-muted-foreground flex items-center gap-1">
          {label}
          {tooltip && <InfoTooltip term={tooltip} />}
        </span>
        <span className="font-mono tabular-nums">{pct}%</span>
      </div>
      <Progress value={pct} className="h-1" />
    </div>
  );
}

export function RegimeStatus({ regime, fdr: fdrProp, intensity, regimeEvidence, intelligence }: RegimeStatusProps) {
  const [, setLocation] = useLocation();
  const fdr = Number.isFinite(Number(fdrProp)) ? Number(fdrProp) : 1.0;
  const config = regimeConfig[regime] || regimeConfig.HEALTHY_EXPANSION;
  const confidence = intelligence?.confidence || regimeEvidence?.confidence;
  const overallConfidence = confidence?.overall ?? 0.5;
  const confidencePct = Math.round(Number.isFinite(overallConfidence) ? overallConfidence * 100 : 50);

  const trendDirection = intelligence?.fdrTrend?.trendDirection;
  const TrendIcon = trendDirection === 'rising' ? TrendingUp : trendDirection === 'falling' ? TrendingDown : Minus;

  const transitionRisk = confidence?.transitionRisk ?? 0;
  const transitionProbability = intelligence?.transitionPrediction?.transitionProbability ?? 0;

  return (
    <Card className="p-6" data-testid="card-regime-status">
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-lg">Economic Regime</h3>
            <InfoTooltip term="regime" />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={config.variant} data-testid="badge-regime-type">
              {config.label}
            </Badge>
            <Badge variant="outline" className="font-mono tabular-nums gap-1" data-testid="badge-confidence-level">
              {confidencePct < 50 ? <AlertTriangle className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
              {confidencePct}% conf.
            </Badge>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                FDR Score
                <InfoTooltip term="fdr" />
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-semibold tabular-nums" data-testid="text-fdr-score">{fdr.toFixed(2)}</span>
                <TrendIcon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Threshold Range</span>
              <span className="font-mono text-xs tabular-nums" data-testid="text-threshold-range">{config.thresholdRange}</span>
            </div>

            {regimeEvidence && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Distance to Next</span>
                <span className="font-mono text-xs tabular-nums" data-testid="text-distance-threshold">{Number.isFinite(regimeEvidence.distanceToNextThreshold) ? regimeEvidence.distanceToNextThreshold.toFixed(2) : '—'}</span>
              </div>
            )}

            {regimeEvidence && regimeEvidence.regimeDurationDays > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Regime Duration</span>
                <span className="font-mono text-xs tabular-nums" data-testid="text-regime-duration">{regimeEvidence.regimeDurationDays}d</span>
              </div>
            )}

            <p className="text-xs text-muted-foreground pt-1">{config.description}</p>
          </div>

          <div className="space-y-2 pl-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Confidence Components</p>
            {confidence && (
              <>
                <ConfidenceBar label="FDR Stability" value={confidence.fdrStability ?? 0.5} testId="bar-fdr-stability" />
                <ConfidenceBar label="Regime Maturity" value={confidence.regimeMaturity ?? 0.5} testId="bar-regime-maturity" />
                <ConfidenceBar label="Regime Stability" value={1 - (confidence.transitionRisk ?? 0.5)} testId="bar-regime-stability" />
                <ConfidenceBar label="Data Quality" value={confidence.dataQuality ?? 0.5} testId="bar-data-quality" />
              </>
            )}
            {!confidence && (
              <p className="text-xs text-muted-foreground">Confidence data unavailable</p>
            )}
          </div>
        </div>

        {transitionProbability > 0.3 && intelligence?.transitionPrediction?.predictedRegime && (
          <div className="flex items-center gap-2 text-xs p-2 rounded-md bg-muted/50 border" data-testid="alert-transition-risk">
            <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">
              Transition probability to <span className="font-medium">{intelligence.transitionPrediction.predictedRegime}</span>: {Math.round(transitionProbability * 100)}%
            </span>
          </div>
        )}

        {/* Procurement Action Section — what to DO given this regime */}
        {(() => {
          const pa = config.procurementAction;
          const ActionIcon = pa.Icon;
          return (
            <div className={`mt-2 p-4 rounded-md border ${pa.accentClass}`} data-testid="card-regime-procurement-action">
              <div className="flex items-start gap-3">
                <ActionIcon className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold">{pa.title}</p>
                  <ul className="space-y-1">
                    {pa.bullets.map((bullet, i) => (
                      <li key={i} className="text-xs flex items-start gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-current mt-1.5 shrink-0 opacity-60" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1 -ml-2 mt-1"
                    onClick={() => setLocation(pa.actionPath)}
                    data-testid="button-regime-procurement-action"
                  >
                    {pa.actionLabel}
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </Card>
  );
}
