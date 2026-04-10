import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  DollarSign,
  PackageX,
  Truck,
  Wallet,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface RevenueDashboardMetrics {
  experimentId: string;
  experimentName: string;
  status: string;
  window: { weeks: number; lockedAt: string | null; completedAt: string | null };
  serviceLevelImprovement: {
    baselinePercent: number;
    optimizedPercent: number;
    deltaPercent: number;
    deltaPercentagePoints: number;
  };
  stockoutReduction: {
    baselinePercent: number;
    optimizedPercent: number;
    deltaPercent: number;
    deltaPercentagePoints: number;
  };
  expediteSpendReduction: {
    baselineDollars: number;
    optimizedDollars: number;
    deltaDollars: number;
    deltaPercent: number;
  };
  workingCapitalImpact: {
    baselineDollars: number;
    optimizedDollars: number;
    deltaDollars: number;
    deltaPercent: number;
  };
  realizedSavings: {
    estimatedDollars: number;
    estimatedLabel: string;
    measuredDollars: number | null;
    measuredLabel: string;
    hasMeasuredData: boolean;
  };
  configHash: string;
  productionMutations: number;
  evidenceBundlePresent: boolean;
}

function MetricDelta({ value, suffix = "", inverted = false }: { value: number; suffix?: string; inverted?: boolean }) {
  const positive = inverted ? value < 0 : value > 0;
  const negative = inverted ? value > 0 : value < 0;
  if (Math.abs(value) < 0.01) {
    return (
      <span className="flex items-center gap-1 text-muted-foreground text-sm">
        <Minus className="h-3 w-3" /> No change
      </span>
    );
  }
  return (
    <span className={`flex items-center gap-1 text-sm font-medium ${positive ? "text-green-600 dark:text-green-400" : negative ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
      {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {value > 0 ? "+" : ""}{value.toFixed(2)}{suffix}
    </span>
  );
}

function MetricCard({
  title,
  icon: Icon,
  baseline,
  optimized,
  delta,
  deltaSuffix,
  format,
  inverted,
  testIdPrefix,
}: {
  title: string;
  icon: any;
  baseline: number;
  optimized: number;
  delta: number;
  deltaSuffix?: string;
  format: "percent" | "dollar";
  inverted?: boolean;
  testIdPrefix: string;
}) {
  const fmt = (v: number) =>
    format === "dollar" ? `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${v.toFixed(2)}%`;
  return (
    <Card data-testid={`card-${testIdPrefix}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`value-${testIdPrefix}-optimized`}>{fmt(optimized)}</div>
        <MetricDelta value={delta} suffix={deltaSuffix} inverted={inverted} />
        <div className="text-xs text-muted-foreground mt-1" data-testid={`value-${testIdPrefix}-baseline`}>
          Baseline: {fmt(baseline)}
        </div>
      </CardContent>
    </Card>
  );
}

function ExperimentDashboard({ metrics }: { metrics: RevenueDashboardMetrics }) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const generateReport = useMutation({
    mutationFn: async () => {
      setGenerating(true);
      const res = await apiRequest("POST", "/api/pilot/generate-executive-report", {
        experimentId: metrics.experimentId,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setGenerating(false);
      toast({
        title: "Executive report generated",
        description: `Report ID: ${data.reportId}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pilot/executive-reports"] });
    },
    onError: (err: any) => {
      setGenerating(false);
      toast({
        title: "Failed to generate report",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-4" data-testid={`experiment-dashboard-${metrics.experimentId}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold" data-testid={`text-experiment-name-${metrics.experimentId}`}>
            {metrics.experimentName}
          </h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant={metrics.status === "completed" ? "default" : "secondary"} data-testid={`badge-status-${metrics.experimentId}`}>
              {metrics.status}
            </Badge>
            <span className="text-xs text-muted-foreground">{metrics.window.weeks}-week window</span>
            {metrics.productionMutations === 0 && (
              <Badge variant="outline" className="text-xs">
                <ShieldCheck className="h-3 w-3 mr-1" /> Zero mutations
              </Badge>
            )}
          </div>
        </div>
        <Button
          onClick={() => generateReport.mutate()}
          disabled={generating || metrics.status !== "completed"}
          data-testid={`button-generate-report-${metrics.experimentId}`}
        >
          <FileText className="h-4 w-4 mr-2" />
          Generate Executive Report
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <MetricCard
          title="Service Level"
          icon={TrendingUp}
          baseline={metrics.serviceLevelImprovement.baselinePercent}
          optimized={metrics.serviceLevelImprovement.optimizedPercent}
          delta={metrics.serviceLevelImprovement.deltaPercentagePoints}
          deltaSuffix=" pp"
          format="percent"
          testIdPrefix="service-level"
        />
        <MetricCard
          title="Stockout Rate"
          icon={PackageX}
          baseline={metrics.stockoutReduction.baselinePercent}
          optimized={metrics.stockoutReduction.optimizedPercent}
          delta={-metrics.stockoutReduction.deltaPercentagePoints}
          deltaSuffix=" pp"
          format="percent"
          inverted
          testIdPrefix="stockout-rate"
        />
        <MetricCard
          title="Expedite Spend"
          icon={Truck}
          baseline={metrics.expediteSpendReduction.baselineDollars}
          optimized={metrics.expediteSpendReduction.optimizedDollars}
          delta={-metrics.expediteSpendReduction.deltaDollars}
          deltaSuffix=""
          format="dollar"
          inverted
          testIdPrefix="expedite-spend"
        />
        <MetricCard
          title="Working Capital"
          icon={Wallet}
          baseline={metrics.workingCapitalImpact.baselineDollars}
          optimized={metrics.workingCapitalImpact.optimizedDollars}
          delta={metrics.workingCapitalImpact.deltaDollars}
          format="dollar"
          testIdPrefix="working-capital"
        />
        <Card data-testid="card-realized-savings">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Realized Savings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold" data-testid="value-estimated-savings">
                    ${metrics.realizedSavings.estimatedDollars.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs mt-1" data-testid="badge-estimated-label">
                  {metrics.realizedSavings.estimatedLabel}
                </Badge>
              </div>
              {metrics.realizedSavings.hasMeasuredData ? (
                <div>
                  <span className="text-lg font-semibold text-green-600 dark:text-green-400" data-testid="value-measured-savings">
                    ${metrics.realizedSavings.measuredDollars?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                  <Badge variant="default" className="text-xs ml-2" data-testid="badge-measured-label">
                    measured
                  </Badge>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-muted-foreground" data-testid="text-no-measured">
                  <AlertCircle className="h-3 w-3" />
                  Measured savings: requires invoice verification
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PilotRevenueDashboard() {
  const { data: metrics, isLoading } = useQuery<RevenueDashboardMetrics[]>({
    queryKey: ["/api/pilot/revenue-dashboard"],
  });

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Pilot Revenue Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Track pilot experiment ROI with clear, measurable outcomes
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : metrics && metrics.length > 0 ? (
        <div className="space-y-8">
          {metrics.map((m) => (
            <ExperimentDashboard key={m.experimentId} metrics={m} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No pilot experiments yet</h3>
            <p className="text-muted-foreground text-sm text-center max-w-md">
              Run a pilot experiment to see your ROI metrics here. Use the API or the Pilot Program page to get started.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
