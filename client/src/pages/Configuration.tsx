import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Settings, AlertCircle, Package, Layers, TrendingUp, TrendingDown, DollarSign, ChevronDown, ChevronUp } from "lucide-react";
import type { Sku, Material } from "@shared/schema";

interface CommodityPrice {
  material: string;
  price: number;
  unit: string;
  currency: string;
  timestamp: string;
  change24h?: number;
  changePercent24h?: number;
}

export default function Configuration() {
  const [isAllCommoditiesOpen, setIsAllCommoditiesOpen] = useState(false);

  const { data: skus, isLoading: isLoadingSkus } = useQuery<Sku[]>({
    queryKey: ["/api/skus"],
  });

  const { data: materials, isLoading: isLoadingMaterials } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
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

  if (isLoadingSkus || isLoadingMaterials || isLoadingPrices) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="heading-configuration">
          Configuration
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage SKUs, materials, and system settings
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="card-sku-config">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              SKU Configuration
            </CardTitle>
            <CardDescription>Product SKUs and their priorities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!skus || skus.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No SKUs configured. Use the seed data button on the dashboard to get started.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {skus.map((sku) => (
                  <div
                    key={sku.id}
                    className="flex items-center justify-between p-3 border rounded-md"
                    data-testid={`sku-item-${sku.id}`}
                  >
                    <div>
                      <div className="font-medium" data-testid={`text-sku-name-${sku.id}`}>
                        {sku.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Priority: {sku.priority}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-material-config">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Material Configuration
            </CardTitle>
            <CardDescription>Raw materials and inventory</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!materials || materials.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No materials configured. Use the seed data button on the dashboard to get started.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {materials.map((material) => (
                  <div
                    key={material.id}
                    className="flex items-center justify-between p-3 border rounded-md"
                    data-testid={`material-item-${material.id}`}
                  >
                    <div>
                      <div className="font-medium" data-testid={`text-material-name-${material.id}`}>
                        {material.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        On Hand: {material.onHand} {material.unit}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        Code: {material.code}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-commodity-prices" className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Real-time Material Pricing
          </CardTitle>
          <CardDescription>Updates every 5 minutes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!commodityPrices || commodityPrices.length === 0 ? (
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
                    const isPositive = (price.changePercent24h || 0) >= 0;
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

      <Card data-testid="card-system-info">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Information
          </CardTitle>
          <CardDescription>Platform configuration and status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total SKUs:</span>
            <span className="font-semibold" data-testid="text-total-skus">
              {skus?.length || 0}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Materials:</span>
            <span className="font-semibold" data-testid="text-total-materials">
              {materials?.length || 0}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Tradeable Commodities:</span>
            <span className="font-semibold" data-testid="text-total-commodities">
              {commodityPrices?.length || 0}
            </span>
          </div>
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              This platform uses dual-circuit economic intelligence to optimize manufacturing allocation decisions.
              Commodity trading capabilities enabled with real-time pricing for 110+ materials.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
