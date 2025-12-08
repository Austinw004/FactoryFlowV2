import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TrendingUp, TrendingDown, AlertCircle, DollarSign, ChevronDown, ChevronUp, Plus, BarChart3 } from "lucide-react";
import type { Sku, DemandHistory } from "@shared/schema";
import { InfoTooltip } from "@/components/InfoTooltip";

interface CommodityPrice {
  material: string;
  price: number;
  unit: string;
  currency: string;
  timestamp: string;
  change24h?: number;
  changePercent24h?: number;
}

export default function Forecasting() {
  const [isAllCommoditiesOpen, setIsAllCommoditiesOpen] = useState(false);

  const { data: skus, isLoading: isLoadingSkus } = useQuery<Sku[]>({
    queryKey: ["/api/skus"],
  });

  const { data: regime } = useQuery<{ regime: string; fdr: number }>({
    queryKey: ["/api/economics/regime"],
  });

  const { data: commodityPrices, isLoading: isLoadingPrices } = useQuery<CommodityPrice[]>({
    queryKey: ["/api/commodities/prices"],
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // Sort commodities: top 5 gainers, top 5 losers, then rest
  const sortedCommodities = commodityPrices ? (() => {
    const withChange = commodityPrices.filter(p => p.changePercent24h !== undefined);
    const withoutChange = commodityPrices.filter(p => p.changePercent24h === undefined);
    
    const sorted = [...withChange].sort((a, b) => (b.changePercent24h || 0) - (a.changePercent24h || 0));
    const topGainers = sorted.slice(0, 5);
    const topLosers = sorted.slice(-5).reverse();
    const remaining = sorted.slice(5, -5);
    
    return { topGainers, topLosers, remaining: [...remaining, ...withoutChange] };
  })() : null;

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

  const [, navigate] = useLocation();

  if (!skus || skus.length === 0) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Demand Forecasting</h1>
          <p className="text-muted-foreground mt-1">
            Regime-aware demand predictions for optimal production planning
          </p>
        </div>
        <Card className="border-dashed" data-testid="card-no-skus">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-xl mb-2">Start Forecasting Demand</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              Add your products (SKUs) to see AI-powered demand forecasts that automatically adjust based on economic conditions.
            </p>
            <Button size="lg" onClick={() => navigate("/configuration")} data-testid="button-add-first-sku">
              <Plus className="h-5 w-5 mr-2" />
              Add Your First Product
            </Button>
          </CardContent>
        </Card>
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
              <InfoTooltip term="regime" />
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
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  FDR Score
                  <InfoTooltip term="fdr" />
                </span>
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

      <Card data-testid="card-commodity-prices" className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Real-time Material Pricing
          </CardTitle>
          <CardDescription>Updates every 5 minutes - Critical for demand planning and cost forecasting</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoadingPrices ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : !commodityPrices || commodityPrices.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Commodity prices unavailable. Ensure materials are configured and pricing API is accessible.
              </AlertDescription>
            </Alert>
          ) : sortedCommodities ? (
            <>
              {/* Top 5 Gainers */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <h3 className="font-semibold text-sm">Top 5 Gainers (24h)</h3>
                </div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {sortedCommodities.topGainers.map((price) => {
                    return (
                      <div
                        key={price.material}
                        className="p-3 border rounded-lg space-y-1.5 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                        data-testid={`commodity-price-${price.material}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="font-medium text-sm">{price.material}</div>
                          {price.changePercent24h !== undefined && (
                            <Badge variant="default" className="text-xs bg-green-600">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              +{price.changePercent24h.toFixed(2)}%
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold" data-testid={`price-${price.material}`}>
                            ${price.price.toLocaleString()}
                          </span>
                          <span className="text-xs text-muted-foreground">/{price.unit}</span>
                        </div>
                        {price.change24h !== undefined && (
                          <div className="text-xs text-muted-foreground">
                            24h: +${price.change24h.toFixed(2)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top 5 Losers */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <h3 className="font-semibold text-sm">Top 5 Losers (24h)</h3>
                </div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {sortedCommodities.topLosers.map((price) => {
                    return (
                      <div
                        key={price.material}
                        className="p-3 border rounded-lg space-y-1.5 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                        data-testid={`commodity-price-${price.material}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="font-medium text-sm">{price.material}</div>
                          {price.changePercent24h !== undefined && (
                            <Badge variant="destructive" className="text-xs">
                              <TrendingDown className="h-3 w-3 mr-1" />
                              {price.changePercent24h.toFixed(2)}%
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold" data-testid={`price-${price.material}`}>
                            ${price.price.toLocaleString()}
                          </span>
                          <span className="text-xs text-muted-foreground">/{price.unit}</span>
                        </div>
                        {price.change24h !== undefined && (
                          <div className="text-xs text-muted-foreground">
                            24h: ${price.change24h.toFixed(2)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* All Other Commodities - Collapsible */}
              <Collapsible open={isAllCommoditiesOpen} onOpenChange={setIsAllCommoditiesOpen}>
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    data-testid="button-toggle-all-commodities"
                  >
                    {isAllCommoditiesOpen ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-2" />
                        Hide All {sortedCommodities.remaining.length} Other Materials
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Show All {sortedCommodities.remaining.length} Other Materials
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {sortedCommodities.remaining.map((price) => {
                      const isPositive = (price.changePercent24h || 0) >= 0;
                      return (
                        <div
                          key={price.material}
                          className="p-3 border rounded-lg space-y-1.5"
                          data-testid={`commodity-price-${price.material}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="font-medium text-sm">{price.material}</div>
                            {price.changePercent24h !== undefined && (
                              <Badge variant={isPositive ? "default" : "destructive"} className="text-xs">
                                {isPositive ? (
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                ) : (
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                )}
                                {isPositive ? '+' : ''}{price.changePercent24h.toFixed(2)}%
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold" data-testid={`price-${price.material}`}>
                              ${price.price.toLocaleString()}
                            </span>
                            <span className="text-xs text-muted-foreground">/{price.unit}</span>
                          </div>
                          {price.change24h !== undefined && (
                            <div className="text-xs text-muted-foreground">
                              24h: {isPositive ? '+' : ''}${price.change24h.toFixed(2)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          ) : null}
        </CardContent>
      </Card>

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
