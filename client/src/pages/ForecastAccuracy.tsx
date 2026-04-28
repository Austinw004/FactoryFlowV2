import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Target, BarChart3, AlertCircle, Activity, CheckCircle2, Compass, Gauge, ArrowUpRight, Info } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { InfoTooltip } from "@/components/InfoTooltip";

interface ForecastMetrics {
  overallMape: number | null;
  bias: number | null;
  totalPredictions: number;
  predictionsWithActuals: number;
  avgPredicted: number | null;
  avgActual: number | null;
  // Enhanced metrics
  trackingSignal: number | null;
  theilsU: number | null;
  directionalAccuracy: number | null;
  confidenceHitRate: number | null;
  mae: number | null;
  rmse: number | null;
  // Date range for transparency
  earliestPrediction: string | null;
  latestPrediction: string | null;
}

interface PeriodAccuracy {
  period: string;
  mape: number | null;
  bias: number | null;
  totalPredicted: number | null;
  totalActual: number | null;
  count: number;
}

interface SkuAccuracy {
  skuId: string | null;
  skuName: string | null;
  mape: number | null;
  bias: number | null;
  totalPredicted: number | null;
  totalActual: number | null;
  count: number;
}

interface Prediction {
  skuName: string;
  forecastDate: string;
  predictedDemand: number;
  actualDemand: number;
  mape: number;
}

interface AggregatedPeriod {
  period: string;
  totalPredicted: number;
  totalActual: number;
  count: number;
}

export default function ForecastAccuracy() {
  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useQuery<ForecastMetrics>({
    queryKey: ["/api/forecast-accuracy/metrics"],
  });

  const { data: byPeriod, isLoading: byPeriodLoading, error: byPeriodError } = useQuery<PeriodAccuracy[]>({
    queryKey: ["/api/forecast-accuracy/by-period"],
  });

  const { data: bySku, isLoading: bySkuLoading, error: bySkuError } = useQuery<SkuAccuracy[]>({
    queryKey: ["/api/forecast-accuracy/by-sku"],
  });

  const { data: predictions, isLoading: predictionsLoading, error: predictionsError } = useQuery<Prediction[]>({
    queryKey: ["/api/forecast-accuracy/predictions"],
  });

  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return "N/A";
    return num.toLocaleString(undefined, { maximumFractionDigits: 1 });
  };

  const formatPercentage = (num: number | null | undefined) => {
    if (num === null || num === undefined) return "N/A";
    return `${num.toFixed(1)}%`;
  };

  // Aggregate predictions by period for the predicted vs actual chart
  const predictionsByPeriod: AggregatedPeriod[] = predictions ? 
    Object.values(
      predictions.reduce((acc: Record<string, AggregatedPeriod>, pred: Prediction) => {
        const period = pred.forecastDate;
        if (!acc[period]) {
          acc[period] = {
            period,
            totalPredicted: 0,
            totalActual: 0,
            count: 0
          };
        }
        // Guard against null values to prevent NaN
        const predicted = pred.predictedDemand ?? 0;
        const actual = pred.actualDemand ?? 0;
        acc[period].totalPredicted += predicted;
        acc[period].totalActual += actual;
        acc[period].count += 1;
        return acc;
      }, {})
    ).sort((a, b) => a.period.localeCompare(b.period))
    : [];

  const getBiasLabel = (bias: number | null | undefined) => {
    if (bias === null || bias === undefined) return { label: "N/A", variant: "secondary" as const };
    if (Math.abs(bias) < 5) return { label: "Balanced", variant: "secondary" as const };
    if (bias > 0) return { label: "Over-forecasting", variant: "destructive" as const };
    return { label: "Under-forecasting", variant: "default" as const };
  };

  const getAccuracyColor = (mape: number | null | undefined) => {
    if (mape === null || mape === undefined) return "text-muted-foreground";
    if (mape < 10) return "text-green-600 dark:text-green-400";
    if (mape < 20) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const hasError = metricsError || byPeriodError || bySkuError || predictionsError;

  return (
    <div className="p-6 space-y-6">
      <div>
<p className="text-muted-foreground">
          Track prediction accuracy with MAPE metrics, bias analysis, and performance by SKU
        </p>
      </div>

      {hasError && (
        <Card className="border-destructive" data-testid="error-banner">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">Failed to load forecast accuracy data</p>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {predictionsError && "Unable to load predictions data for the comparison chart. "}
              {metricsError && "Unable to load overall metrics. "}
              {byPeriodError && "Unable to load period accuracy data. "}
              {bySkuError && "Unable to load SKU accuracy data. "}
              Please try refreshing the page.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-overall-mape">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              Overall MAPE
              <InfoTooltip term="mape" />
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : metricsError ? (
              <div className="text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Failed to load
              </div>
            ) : (
              <>
                <div className={`text-2xl font-bold ${getAccuracyColor(metrics?.overallMape)}`} data-testid="text-overall-mape">
                  {formatPercentage(metrics?.overallMape)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Mean Absolute Percentage Error
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-forecast-bias">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Forecast Bias</CardTitle>
            {metrics?.bias && metrics.bias > 0 ? (
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-forecast-bias">
                  {formatNumber(metrics?.bias)}
                </div>
                <div className="mt-1">
                  <Badge variant={getBiasLabel(metrics?.bias).variant} data-testid="badge-bias-label">
                    {getBiasLabel(metrics?.bias).label}
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-predictions-count">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Predictions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-total-predictions">
                  {formatNumber(metrics?.totalPredictions)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatNumber(metrics?.predictionsWithActuals)} with actual data
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-avg-demand">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Demand</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-avg-predicted">
                  {formatNumber(metrics?.avgPredicted)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Actual: {formatNumber(metrics?.avgActual)}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Metrics Section */}
      <Card data-testid="card-enhanced-metrics">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Advanced Accuracy Metrics
          </CardTitle>
          <CardDescription>
            Industry-standard forecasting quality indicators beyond MAPE
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Tracking Signal */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-2" data-testid="metric-tracking-signal">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Compass className="h-4 w-4" />
                Tracking Signal
                <InfoTooltip term="tracking-signal" />
              </div>
              {metricsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className={`text-2xl font-bold ${
                    metrics?.trackingSignal === null || metrics?.trackingSignal === undefined ? 'text-muted-foreground' :
                    Math.abs(metrics.trackingSignal) <= 4 ? 'text-green-600 dark:text-green-400' :
                    Math.abs(metrics.trackingSignal) <= 6 ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-600 dark:text-red-400'
                  }`} data-testid="text-tracking-signal">
                    {metrics?.trackingSignal !== null && metrics?.trackingSignal !== undefined 
                      ? metrics.trackingSignal.toFixed(2) 
                      : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Target: -4 to +4 (detects drift)
                  </p>
                  {metrics?.trackingSignal !== null && metrics?.trackingSignal !== undefined && (
                    <Badge 
                      variant={Math.abs(metrics.trackingSignal) <= 4 ? "secondary" : "destructive"}
                      className="mt-1"
                    >
                      {Math.abs(metrics.trackingSignal) <= 4 ? "Normal" : "Drift Detected"}
                    </Badge>
                  )}
                </>
              )}
            </div>

            {/* Theil's U */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-2" data-testid="metric-theils-u">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Gauge className="h-4 w-4" />
                Theil's U Statistic
                <InfoTooltip term="theils-u" />
              </div>
              {metricsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className={`text-2xl font-bold ${
                    metrics?.theilsU === null || metrics?.theilsU === undefined ? 'text-muted-foreground' :
                    metrics.theilsU < 0.8 ? 'text-green-600 dark:text-green-400' :
                    metrics.theilsU < 1.0 ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-600 dark:text-red-400'
                  }`} data-testid="text-theils-u">
                    {metrics?.theilsU !== null && metrics?.theilsU !== undefined 
                      ? metrics.theilsU.toFixed(3) 
                      : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    &lt;1.0 = Better than naive forecast
                  </p>
                  {metrics?.theilsU !== null && metrics?.theilsU !== undefined && (
                    <Badge 
                      variant={metrics.theilsU < 1.0 ? "secondary" : "destructive"}
                      className="mt-1"
                    >
                      {metrics.theilsU < 0.8 ? "Excellent" : 
                       metrics.theilsU < 1.0 ? "Good" : "Below Naive"}
                    </Badge>
                  )}
                </>
              )}
            </div>

            {/* Directional Accuracy */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-2" data-testid="metric-directional-accuracy">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <ArrowUpRight className="h-4 w-4" />
                Directional Accuracy
              </div>
              {metricsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className={`text-2xl font-bold ${
                    metrics?.directionalAccuracy === null || metrics?.directionalAccuracy === undefined ? 'text-muted-foreground' :
                    metrics.directionalAccuracy >= 70 ? 'text-green-600 dark:text-green-400' :
                    metrics.directionalAccuracy >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-600 dark:text-red-400'
                  }`} data-testid="text-directional-accuracy">
                    {metrics?.directionalAccuracy !== null && metrics?.directionalAccuracy !== undefined 
                      ? `${metrics.directionalAccuracy.toFixed(1)}%` 
                      : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Correct up/down predictions
                  </p>
                  {metrics?.directionalAccuracy !== null && metrics?.directionalAccuracy !== undefined && (
                    <Badge 
                      variant={metrics.directionalAccuracy >= 50 ? "secondary" : "destructive"}
                      className="mt-1"
                    >
                      {metrics.directionalAccuracy >= 70 ? "Strong" : 
                       metrics.directionalAccuracy >= 50 ? "Moderate" : "Weak"}
                    </Badge>
                  )}
                </>
              )}
            </div>

            {/* Confidence Hit Rate */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-2" data-testid="metric-confidence-hit-rate">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                Confidence Hit Rate
              </div>
              {metricsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className={`text-2xl font-bold ${
                    metrics?.confidenceHitRate === null || metrics?.confidenceHitRate === undefined ? 'text-muted-foreground' :
                    metrics.confidenceHitRate >= 80 ? 'text-green-600 dark:text-green-400' :
                    metrics.confidenceHitRate >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-600 dark:text-red-400'
                  }`} data-testid="text-confidence-hit-rate">
                    {metrics?.confidenceHitRate !== null && metrics?.confidenceHitRate !== undefined 
                      ? `${metrics.confidenceHitRate.toFixed(1)}%` 
                      : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Actuals within confidence bounds
                  </p>
                  {metrics?.confidenceHitRate !== null && metrics?.confidenceHitRate !== undefined && (
                    <Badge 
                      variant={metrics.confidenceHitRate >= 60 ? "secondary" : "destructive"}
                      className="mt-1"
                    >
                      {metrics.confidenceHitRate >= 80 ? "Reliable" : 
                       metrics.confidenceHitRate >= 60 ? "Acceptable" : "Needs Review"}
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>

          {/* MAE and RMSE supplementary metrics */}
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="text-sm font-medium">Mean Absolute Error (MAE)</p>
                <p className="text-xs text-muted-foreground">Average absolute deviation in units</p>
              </div>
              <div className="text-lg font-bold" data-testid="text-mae">
                {metrics?.mae !== null && metrics?.mae !== undefined 
                  ? formatNumber(metrics.mae) 
                  : 'N/A'}
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="text-sm font-medium">Root Mean Square Error (RMSE)</p>
                <p className="text-xs text-muted-foreground">Penalizes large errors more heavily</p>
              </div>
              <div className="text-lg font-bold" data-testid="text-rmse">
                {metrics?.rmse !== null && metrics?.rmse !== undefined 
                  ? formatNumber(metrics.rmse) 
                  : 'N/A'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="card-accuracy-by-period">
          <CardHeader>
            <CardTitle>Accuracy by Period</CardTitle>
            <CardDescription>MAPE trends over time</CardDescription>
          </CardHeader>
          <CardContent>
            {byPeriodLoading ? (
              <Skeleton className="h-80 w-full" />
            ) : byPeriod && byPeriod.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={byPeriod}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis label={{ value: 'MAPE (%)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                  <Legend />
                  <Line type="monotone" dataKey="mape" name="MAPE" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-80 text-muted-foreground">
                No period data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-predicted-vs-actual">
          <CardHeader>
            <CardTitle>Predicted vs Actual by Period</CardTitle>
            <CardDescription>Demand comparison from predictions</CardDescription>
          </CardHeader>
          <CardContent>
            {predictionsLoading ? (
              <Skeleton className="h-80 w-full" />
            ) : predictionsByPeriod && predictionsByPeriod.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={predictionsByPeriod}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis label={{ value: 'Units', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value: number) => formatNumber(value)} />
                  <Legend />
                  <Bar dataKey="totalPredicted" name="Predicted" fill="hsl(var(--primary))" />
                  <Bar dataKey="totalActual" name="Actual" fill="hsl(var(--accent))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-80 text-muted-foreground">
                No predictions with actuals available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-accuracy-by-sku">
        <CardHeader>
          <CardTitle>Accuracy by SKU</CardTitle>
          <CardDescription>Forecast performance for each product (sorted by worst MAPE first)</CardDescription>
        </CardHeader>
        <CardContent>
          {bySkuLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : bySku && bySku.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead data-testid="header-sku-name">SKU Name</TableHead>
                  <TableHead className="text-right" data-testid="header-mape">MAPE</TableHead>
                  <TableHead className="text-right" data-testid="header-bias">Bias</TableHead>
                  <TableHead className="text-right" data-testid="header-predicted">Total Predicted</TableHead>
                  <TableHead className="text-right" data-testid="header-actual">Total Actual</TableHead>
                  <TableHead className="text-right" data-testid="header-count">Forecasts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bySku.map((sku, idx) => (
                  <TableRow key={idx} data-testid={`row-sku-${idx}`}>
                    <TableCell className="font-medium" data-testid={`text-sku-name-${idx}`}>
                      {sku.skuName || "Unknown SKU"}
                    </TableCell>
                    <TableCell className={`text-right ${getAccuracyColor(sku.mape)}`} data-testid={`text-mape-${idx}`}>
                      {formatPercentage(sku.mape)}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-bias-${idx}`}>
                      <Badge variant={getBiasLabel(sku.bias).variant}>
                        {formatNumber(sku.bias)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-predicted-${idx}`}>
                      {formatNumber(sku.totalPredicted)}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-actual-${idx}`}>
                      {formatNumber(sku.totalActual)}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-count-${idx}`}>
                      {sku.count}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              No SKU accuracy data available. Predictions with actual demand will appear here.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
