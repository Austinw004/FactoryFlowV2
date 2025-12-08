import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Target, BarChart3, AlertCircle } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { InfoTooltip } from "@/components/InfoTooltip";

interface ForecastMetrics {
  overallMape: number | null;
  bias: number | null;
  totalPredictions: number;
  predictionsWithActuals: number;
  avgPredicted: number | null;
  avgActual: number | null;
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
        <h1 className="text-3xl font-bold" data-testid="heading-page-title">Forecast Accuracy Dashboard</h1>
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
