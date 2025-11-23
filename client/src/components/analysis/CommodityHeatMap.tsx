import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CommodityImpact {
  materialCode: string;
  materialName: string;
  priceChange: number;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  currentPrice?: number;
  projectedPrice?: number;
}

interface CommodityHeatMapProps {
  commodities: CommodityImpact[];
  title?: string;
  description?: string;
}

export function CommodityHeatMap({ 
  commodities, 
  title = "Commodity Price Impact Analysis",
  description = "Price changes and their impact on production costs"
}: CommodityHeatMapProps) {
  const getImpactColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500/20 border-red-500/50 text-red-700 dark:text-red-300';
      case 'high': return 'bg-orange-500/20 border-orange-500/50 text-orange-700 dark:text-orange-300';
      case 'medium': return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-700 dark:text-yellow-300';
      case 'low': return 'bg-green-500/20 border-green-500/50 text-green-700 dark:text-green-300';
      default: return 'bg-muted';
    }
  };

  const getChangeColor = (change: number) => {
    if (change > 10) return 'text-red-600 dark:text-red-400';
    if (change > 5) return 'text-orange-600 dark:text-orange-400';
    if (change < -5) return 'text-green-600 dark:text-green-400';
    return 'text-muted-foreground';
  };

  const sortedCommodities = [...commodities].sort((a, b) => {
    const impactOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return impactOrder[a.impactLevel] - impactOrder[b.impactLevel];
  });

  return (
    <Card data-testid="card-commodity-heatmap">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedCommodities.map((commodity) => (
            <div
              key={commodity.materialCode}
              className={`p-4 rounded-md border transition-all hover-elevate ${getImpactColor(commodity.impactLevel)}`}
              data-testid={`commodity-${commodity.materialCode}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" data-testid={`text-material-name-${commodity.materialCode}`}>
                    {commodity.materialName}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid={`text-material-code-${commodity.materialCode}`}>
                    {commodity.materialCode}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0" data-testid={`badge-impact-${commodity.materialCode}`}>
                  {commodity.impactLevel}
                </Badge>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">Price Change:</span>
                  <span 
                    className={`text-sm font-semibold ${getChangeColor(commodity.priceChange)}`}
                    data-testid={`text-price-change-${commodity.materialCode}`}
                  >
                    {commodity.priceChange > 0 ? '+' : ''}{commodity.priceChange.toFixed(1)}%
                  </span>
                </div>
                
                {commodity.currentPrice !== undefined && commodity.projectedPrice !== undefined && (
                  <div className="text-xs space-y-0.5 pt-1 border-t border-current/20">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current:</span>
                      <span data-testid={`text-current-price-${commodity.materialCode}`}>
                        ${commodity.currentPrice.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Projected:</span>
                      <span data-testid={`text-projected-price-${commodity.materialCode}`}>
                        ${commodity.projectedPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {commodities.length === 0 && (
          <div className="text-center py-8 text-muted-foreground" data-testid="text-no-commodities">
            <p>No commodity impacts to display</p>
            <p className="text-sm mt-1">Run a scenario analysis to see commodity price impacts</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
