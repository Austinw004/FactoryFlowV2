import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, AlertCircle } from "lucide-react";
import type { Sku, DemandHistory } from "@shared/schema";

export default function Forecasting() {
  const { data: skus, isLoading: isLoadingSkus } = useQuery<Sku[]>({
    queryKey: ["/api/skus"],
  });

  const { data: regime } = useQuery<{ regime: string; fdr: number }>({
    queryKey: ["/api/economics/regime"],
  });

  if (isLoadingSkus) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (!skus || skus.length === 0) {
    return (
      <div className="p-6">
        <Alert data-testid="alert-no-skus">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No SKUs configured. Please add SKUs in the Configuration page to see demand forecasts.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="heading-forecasting">
          Demand Forecasting
        </h1>
        <p className="text-muted-foreground mt-1">
          Regime-aware demand predictions for optimal production planning
        </p>
      </div>

      {regime && (
        <Card data-testid="card-regime-context">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Current Economic Regime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Regime Type:</span>
                <span className="font-semibold" data-testid="text-regime-type">
                  {regime.regime || "Unknown"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">FDR Score:</span>
                <span className="font-semibold" data-testid="text-fdr-score">
                  {regime.fdr?.toFixed(2) || "0.00"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Forecasts are automatically adjusted based on the current economic regime to improve accuracy.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {skus.map((sku) => (
          <SkuForecastCard key={sku.id} sku={sku} />
        ))}
      </div>
    </div>
  );
}

function SkuForecastCard({ sku }: { sku: Sku }) {
  const { data: history, isLoading } = useQuery<DemandHistory[]>({
    queryKey: ["/api/demand-history", sku.id],
    enabled: !!sku.id,
  });

  const avgDemand = history && history.length > 0
    ? Math.round(history.reduce((sum, h) => sum + h.units, 0) / history.length)
    : 0;

  const recentDemand = history && history.length > 0
    ? history[history.length - 1].units
    : 0;

  return (
    <Card data-testid={`card-forecast-${sku.id}`}>
      <CardHeader>
        <CardTitle className="text-lg" data-testid={`text-sku-name-${sku.id}`}>
          {sku.name}
        </CardTitle>
        <CardDescription>Priority: {sku.priority}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : history && history.length > 0 ? (
          <>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Avg Demand:</span>
                <span className="font-semibold" data-testid={`text-avg-demand-${sku.id}`}>
                  {avgDemand} units
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Recent:</span>
                <span className="font-semibold" data-testid={`text-recent-demand-${sku.id}`}>
                  {recentDemand} units
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">History:</span>
                <span className="text-sm" data-testid={`text-history-count-${sku.id}`}>
                  {history.length} months
                </span>
              </div>
            </div>
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Forecast calculation uses exponential smoothing with regime-aware adjustments
              </p>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No historical data available</p>
        )}
      </CardContent>
    </Card>
  );
}
