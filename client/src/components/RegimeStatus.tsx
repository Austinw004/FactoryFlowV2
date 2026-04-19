import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, ShieldCheck, AlertTriangle, TrendingUp, TrendingDown, Minus, CheckCircle2, XCircle, Eye } from "lucide-react";
import { InfoTooltip } from "@/components/InfoTooltip";

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

const regimeConfig: Record<Regime, { label: string; description: string; thresholdRange: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  HEALTHY_EXPANSION: {
    label: "Healthy Expansion",
    description: "Balanced growth. Standard procurement pace.",
    thresholdRange: "FDR < 1.2",
    variant: "default",
  },
  ASSET_LED_GROWTH: {
    label: "Asset-Led Growth",
    description: "Assets outpacing real economy. Consider accelerating procurement.",
    thresholdRange: "FDR 1.2 - 1.8",
    variant: "secondary",
  },
  IMBALANCED_EXCESS: {
    label: "Imbalanced Excess",
    description: "Significant asset-real economy gap. Defer non-critical purchases.",
    thresholdRange: "FDR 1.8 - 2.5",
    variant: "destructive",
  },
  REAL_ECONOMY_LEAD: {
    label: "Real Economy Lead",
    description: "Counter-cyclical opportunity. Lock in favorable pricing.",
    thresholdRange: "FDR > 2.5",
    variant: "default",
  },
};

type ActionItem = { type: "do" | "watch" | "avoid"; text: string };

const regimeActions: Record<Regime, ActionItem[]> = {
  HEALTHY_EXPANSION: [
    { type: "do", text: "Negotiate long-term supplier contracts — stable conditions favor buyers" },
    { type: "do", text: "Maintain standard safety stock levels — no need to over-build" },
    { type: "watch", text: "Monitor FDR for movement toward 1.2 — that signals regime shift" },
    { type: "avoid", text: "Don't rush procurement — pricing is stable and timing is not urgent" },
  ],
  ASSET_LED_GROWTH: [
    { type: "do", text: "Lock in contracts for critical materials before the next pricing cycle" },
    { type: "do", text: "Pre-purchase 8–12 weeks of high-exposure materials now" },
    { type: "watch", text: "Monitor single-source suppliers — they will raise prices first" },
    { type: "avoid", text: "Avoid deferring procurement — input costs are trending higher" },
  ],
  IMBALANCED_EXCESS: [
    { type: "do", text: "Renegotiate all contracts expiring within 90 days" },
    { type: "do", text: "Build safety stock on critical-path materials only" },
    { type: "watch", text: "Watch for FDR stabilization — that's your signal to resume normal pace" },
    { type: "avoid", text: "Defer spot purchases on non-essential materials until regime stabilizes" },
  ],
  REAL_ECONOMY_LEAD: [
    { type: "do", text: "Lock in multi-year supplier agreements — this window typically lasts 4–8 weeks" },
    { type: "do", text: "Accelerate procurement of capital materials at current favorable terms" },
    { type: "watch", text: "Watch for FDR rising above 1.2 — counter-cyclical windows close fast" },
    { type: "avoid", text: "Don't wait for better terms — current conditions are already favorable" },
  ],
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

        {/* Operational action steps for current regime */}
        {regimeActions[regime] && (
          <div className="pt-2 border-t space-y-2" data-testid="regime-action-steps">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">This week: what to do</p>
            {regimeActions[regime].map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                {item.type === "do" && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />}
                {item.type === "watch" && <Eye className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />}
                {item.type === "avoid" && <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />}
                <span className={item.type === "avoid" ? "text-muted-foreground" : "text-foreground/80"}>{item.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
