import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Calendar, Target, BarChart3 } from "lucide-react";

interface MultiHorizonForecast {
  id: string;
  companyId: string;
  skuId: string;
  createdAt: string;
  forecastDate: string;
  horizonDays: number;
  predictedDemand: number;
  lowerBound: number | null;
  upperBound: number | null;
  confidence: number | null;
  mlModel: string;
  externalFactors: any;
  economicRegime: string | null;
  fdrAtForecast: number | null;
  actualDemand: number | null;
  accuracy: number | null;
  signalStrength: string | null;
  volatility: number | null;
  seasonality: number | null;
  trend: number | null;
}

interface Sku {
  id: string;
  name: string;
  description: string | null;
}

interface HorizonComparison {
  horizonDays: number;
  avgPredictedDemand: number | null;
  avgActualDemand: number | null;
  avgAccuracy: number | null;
  forecastCount: number;
}

const HORIZON_LABELS: Record<number, string> = {
  1: "1 Day",
  7: "1 Week",
  14: "2 Weeks",
  30: "1 Month",
  60: "2 Months",
  90: "3 Months",
  180: "6 Months",
  365: "1 Year",
};

export default function MultiHorizonForecasts() {
  const [selectedSkuId, setSelectedSkuId] = useState<string>("");

  const { data: skus, isLoading: skusLoading } = useQuery<Sku[]>({
    queryKey: ["/api/skus"],
  });

  const { data: forecasts, isLoading: forecastsLoading } = useQuery<MultiHorizonForecast[]>({
    queryKey: ["/api/multi-horizon-forecasts", selectedSkuId],
    enabled: !!selectedSkuId,
  });

  const { data: comparison, isLoading: comparisonLoading } = useQuery<HorizonComparison[]>({
    queryKey: ["/api/multi-horizon-forecasts/comparison", selectedSkuId],
    enabled: !!selectedSkuId,
  });

  const selectedSku = skus?.find(s => s.id === selectedSkuId);

  // Group forecasts by horizon
  const forecastsByHorizon = forecasts?.reduce((acc, forecast) => {
    if (!acc[forecast.horizonDays]) {
      acc[forecast.horizonDays] = [];
    }
    acc[forecast.horizonDays].push(forecast);
    return acc;
  }, {} as Record<number, MultiHorizonForecast[]>) || {};

  // Calculate statistics
  const totalForecasts = forecasts?.length || 0;
  const forecastsWithActuals = forecasts?.filter(f => f.actualDemand !== null).length || 0;
  const avgAccuracy = forecastsWithActuals > 0
    ? (forecasts?.filter(f => f.accuracy !== null).reduce((sum, f) => sum + (f.accuracy || 0), 0) || 0) / forecastsWithActuals
    : null;
  const horizonsTracked = Object.keys(forecastsByHorizon).length;

  // Prepare chart data for horizon comparison
  const horizonChartData = comparison?.map(item => ({
    horizon: HORIZON_LABELS[item.horizonDays] || `${item.horizonDays} days`,
    horizonDays: item.horizonDays,
    predicted: item.avgPredictedDemand || 0,
    actual: item.avgActualDemand || 0,
    accuracy: item.avgAccuracy || 0,
    count: item.forecastCount,
  })) || [];

  // Prepare accuracy trend data
  const accuracyTrendData = comparison
    ?.filter(item => item.avgAccuracy !== null)
    .map(item => ({
      horizon: HORIZON_LABELS[item.horizonDays] || `${item.horizonDays} days`,
      horizonDays: item.horizonDays,
      mape: item.avgAccuracy || 0,
    })) || [];

  const getSignalBadgeVariant = (strength: string | null) => {
    if (!strength) return "secondary";
    switch (strength.toLowerCase()) {
      case "strong": return "default";
      case "moderate": return "secondary";
      case "weak": return "outline";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-multi-horizon">Multi-Horizon Forecasting</h1>
          <p className="text-muted-foreground">
            Track demand forecasts across multiple time horizons
          </p>
        </div>
      </div>

      {/* SKU Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select SKU</CardTitle>
          <CardDescription>Choose a SKU to view its multi-horizon forecasts</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedSkuId} onValueChange={setSelectedSkuId}>
            <SelectTrigger data-testid="select-sku">
              <SelectValue placeholder="Select a SKU..." />
            </SelectTrigger>
            <SelectContent>
              {skusLoading ? (
                <div className="p-2">Loading SKUs...</div>
              ) : skus && skus.length > 0 ? (
                skus.map((sku) => (
                  <SelectItem key={sku.id} value={sku.id} data-testid={`select-item-sku-${sku.id}`}>
                    {sku.name} {sku.description ? `- ${sku.description}` : ""}
                  </SelectItem>
                ))
              ) : (
                <div className="p-2 text-muted-foreground">No SKUs available</div>
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {!selectedSkuId ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Select a SKU to view multi-horizon forecasts</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Forecasts</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {forecastsLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold" data-testid="text-total-forecasts">{totalForecasts}</div>
                )}
                <p className="text-xs text-muted-foreground">
                  {forecastsWithActuals} with actuals
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Horizons Tracked</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {forecastsLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold" data-testid="text-horizons-tracked">{horizonsTracked}</div>
                )}
                <p className="text-xs text-muted-foreground">
                  Different time horizons
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Accuracy (MAPE)</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {forecastsLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold" data-testid="text-avg-accuracy">
                    {avgAccuracy !== null ? `${avgAccuracy.toFixed(1)}%` : "N/A"}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Lower is better
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Selected SKU</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {skusLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold truncate" data-testid="text-selected-sku">
                    {selectedSku?.name || "Unknown"}
                  </div>
                )}
                <p className="text-xs text-muted-foreground truncate">
                  {selectedSku?.description || "No description"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Horizon Comparison Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Horizon Comparison</CardTitle>
                <CardDescription>Average predicted vs actual demand by horizon</CardDescription>
              </CardHeader>
              <CardContent>
                {comparisonLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : horizonChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={horizonChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="horizon" 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--foreground))' }}
                      />
                      <YAxis 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--foreground))' }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="predicted" fill="hsl(var(--primary))" name="Predicted" />
                      <Bar dataKey="actual" fill="hsl(var(--chart-2))" name="Actual" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                    No comparison data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Accuracy by Horizon Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Accuracy by Horizon</CardTitle>
                <CardDescription>MAPE across different forecast horizons</CardDescription>
              </CardHeader>
              <CardContent>
                {comparisonLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : accuracyTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={accuracyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="horizon" 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--foreground))' }}
                      />
                      <YAxis 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--foreground))' }}
                        label={{ value: 'MAPE (%)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--foreground))' }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="mape" 
                        stroke="hsl(var(--destructive))" 
                        name="MAPE"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                    No accuracy data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Forecasts Table */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Forecasts</CardTitle>
              <CardDescription>All multi-horizon forecasts for {selectedSku?.name}</CardDescription>
            </CardHeader>
            <CardContent>
              {forecastsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : forecasts && forecasts.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Forecast Date</TableHead>
                        <TableHead>Horizon</TableHead>
                        <TableHead className="text-right">Predicted</TableHead>
                        <TableHead className="text-right">Actual</TableHead>
                        <TableHead className="text-right">Accuracy</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>Signal</TableHead>
                        <TableHead>Model</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {forecasts.slice(0, 50).map((forecast) => (
                        <TableRow key={forecast.id} data-testid={`row-forecast-${forecast.id}`}>
                          <TableCell>{new Date(forecast.forecastDate).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline" data-testid={`badge-horizon-${forecast.id}`}>
                              {HORIZON_LABELS[forecast.horizonDays] || `${forecast.horizonDays}d`}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium" data-testid={`text-predicted-${forecast.id}`}>
                            {forecast.predictedDemand.toFixed(0)}
                          </TableCell>
                          <TableCell className="text-right" data-testid={`text-actual-${forecast.id}`}>
                            {forecast.actualDemand !== null ? forecast.actualDemand.toFixed(0) : "—"}
                          </TableCell>
                          <TableCell className="text-right" data-testid={`text-accuracy-${forecast.id}`}>
                            {forecast.accuracy !== null ? `${forecast.accuracy.toFixed(1)}%` : "—"}
                          </TableCell>
                          <TableCell>
                            {forecast.confidence !== null ? (
                              <Badge variant="secondary">{forecast.confidence.toFixed(0)}%</Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            {forecast.signalStrength ? (
                              <Badge variant={getSignalBadgeVariant(forecast.signalStrength)}>
                                {forecast.signalStrength}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{forecast.mlModel}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
                  <p>No forecasts found for this SKU</p>
                  <p className="text-sm">Create forecasts to start tracking demand across multiple horizons</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
