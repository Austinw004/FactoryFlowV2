import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Activity, ShieldCheck, AlertTriangle, TrendingUp, TrendingDown, Minus, ArrowRight, Info } from "lucide-react";
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
  procurementGuidance: string;
  implication: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  accentClass: string;
  badgeClass: string;
  ctaLabel: string;
  ctaPath: string;
}> = {
  HEALTHY_EXPANSION: {
    label: "Healthy Expansion",
    description: "Balanced growth. Standard procurement pace.",
    thresholdRange: "FDR < 1.2",
    procurementGuidance: "Market conditions are stable — standard procurement pace is appropriate. This is a good window to negotiate long-term contracts, as suppliers are not under pricing pressure.",
    implication: "No urgent procurement action needed. Optimize for cost efficiency and supplier terms.",
    variant: "default",
    accentClass: "border-emerald-500/20 bg-emerald-500/5",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    ctaLabel: "Review Contracts",
    ctaPath: "/supplier-risk",
  },
  ASSET_LED_GROWTH: {
    label: "Asset-Led Growth",
    description: "Assets outpacing real economy. Consider accelerating procurement.",
    thresholdRange: "FDR 1.2–1.8",
    procurementGuidance: "Asset prices are outpacing the real economy. Input costs are likely to rise 8–12% this quarter. Lock in supplier contracts before the next pricing cycle, especially for metals, energy-adjacent, and imported materials.",
    implication: "Pre-purchase critical materials now. Qualify backup suppliers for single-source dependencies.",
    variant: "secondary",
    accentClass: "border-amber-500/20 bg-amber-500/5",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    ctaLabel: "View Exposed Materials",
    ctaPath: "/supply-chain",
  },
  IMBALANCED_EXCESS: {
    label: "Imbalanced Excess",
    description: "Significant asset-real economy gap. Defer non-critical purchases.",
    thresholdRange: "FDR 1.8–2.5",
    procurementGuidance: "Significant market decoupling detected. Procurement risk is elevated. Defer non-critical purchases to avoid locking in at peak prices. Renegotiate expiring contracts immediately — market uncertainty gives you leverage.",
    implication: "Build safety stock only on truly critical materials where stockout risk outweighs elevated cost.",
    variant: "destructive",
    accentClass: "border-red-500/20 bg-red-500/5",
    badgeClass: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
    ctaLabel: "Review At-Risk Materials",
    ctaPath: "/inventory",
  },
  REAL_ECONOMY_LEAD: {
    label: "Real Economy Lead",
    description: "Counter-cyclical opportunity. Lock in favorable pricing.",
    thresholdRange: "FDR > 2.5",
    procurementGuidance: "Counter-cyclical window is open. The real economy is leading asset markets, meaning supplier pricing power is low. Lock in multi-year agreements and accelerate planned purchases while these conditions hold.",
    implication: "This is the most favorable procurement environment. Renegotiate your top 3 supplier contracts now.",
    variant: "default",
    accentClass: "border-blue-500/20 bg-blue-500/5",
    badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    ctaLabel: "Start Negotiations",
    ctaPath: "/supplier-risk",
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

  const transitionProbability = intelligence?.transitionPrediction?.transitionProbability ?? 0;

  return (
    <Card className="p-6" data-testid="card-regime-status">
      <div className="space-y-4">
        {/* Header */}
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

        {/* Procurement guidance — the "so what" for this regime */}
        <div className={`rounded-md border p-3.5 ${config.accentClass}`} data-testid="regime-procurement-guidance">
          <p className="text-sm font-medium text-foreground mb-1">{config.procurementGuidance}</p>
          <p className="text-xs text-muted-foreground mb-3">{config.implication}</p>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => setLocation(config.ctaPath)}
            data-testid="regime-status-cta"
          >
            {config.ctaLabel}
            <ArrowRight className="h-3 w-3 ml-1.5" />
          </Button>
        </div>

        {/* Metrics grid */}
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
                <span className="font-mono text-xs tabular-nums" data-testid="text-distance-threshold">
                  {Number.isFinite(regimeEvidence.distanceToNextThreshold) ? regimeEvidence.distanceToNextThreshold.toFixed(2) : '—'}
                </span>
              </div>
            )}

            {regimeEvidence && regimeEvidence.regimeDurationDays > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Regime Duration</span>
                <span className="font-mono text-xs tabular-nums" data-testid="text-regime-duration">{regimeEvidence.regimeDurationDays}d</span>
              </div>
            )}
          </div>

          <div className="space-y-2 pl-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Signal Confidence</p>
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
          <div className="flex items-center gap-2 text-xs p-2 rounded-md bg-amber-500/10 border border-amber-500/20" data-testid="alert-transition-risk">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">Regime transition risk: </span>
              {Math.round(transitionProbability * 100)}% probability of shifting to{' '}
              <span className="font-medium">{intelligence.transitionPrediction.predictedRegime.replace(/_/g, ' ')}</span>
              {' '}— review your procurement commitments.
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
