import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Package, TrendingDown, Search } from "lucide-react";
import { useLocation } from "wouter";
import type { Material } from "@shared/schema";

interface MaterialRisk {
  material: Material;
  riskScore: number;
  reason: string;
  inventoryLevel: number; // percentage
}

interface MaterialsAtRiskWidgetProps {
  /** Current FDR regime — used to translate inventory risk into the
   * appropriate procurement recommendation (lock-in vs draw-down). */
  regime?: string;
}

// Regime-aware "why now" framing. The same low-inventory material has a
// different recommended response depending on whether input costs are
// rising (lock in supply) or correcting (draw down before re-buying).
const regimeRiskFraming: Record<string, { tag: string; recommendation: (reason: string) => string }> = {
  ASSET_LED_GROWTH: {
    tag: "Cost pressure rising",
    recommendation: (reason) =>
      `${reason}. Input costs trending up — lock in supply now before next pricing cycle.`,
  },
  IMBALANCED_EXCESS: {
    tag: "Decoupling — defer if possible",
    recommendation: (reason) =>
      `${reason}. Markets decoupling — buy minimum to cover, defer larger orders, expect correction.`,
  },
  REAL_ECONOMY_LEAD: {
    tag: "Counter-cyclical buy window",
    recommendation: (reason) =>
      `${reason}. Pricing at cyclical low — replenish and consider building strategic stock.`,
  },
  HEALTHY_EXPANSION: {
    tag: "Stable conditions",
    recommendation: (reason) =>
      `${reason}. Standard procurement pace — qualify a backup supplier if single-sourced.`,
  },
};

export function MaterialsAtRiskWidget({ regime }: MaterialsAtRiskWidgetProps = {}) {
  const [, setLocation] = useLocation();
  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ['/api/materials'],
  });
  const framing = (regime && regimeRiskFraming[regime]) || regimeRiskFraming.HEALTHY_EXPANSION;
  
  // Calculate risk for each material
  const materialsAtRisk: MaterialRisk[] = materials
    .map(material => {
      const onHand = material.onHand || 0;
      const inbound = material.inbound || 0;
      const total = onHand + inbound;
      
      // Simple risk calculation (in production, would factor in demand, lead time, etc.)
      let riskScore = 0;
      let reason = "";
      
      if (total === 0) {
        riskScore = 100;
        reason = "Zero inventory";
      } else if (total < 100) {
        riskScore = 80;
        reason = "Critically low stock";
      } else if (total < 500) {
        riskScore = 50;
        reason = "Low inventory";
      } else if (inbound === 0 && onHand < 1000) {
        riskScore = 30;
        reason = "No inbound orders";
      }
      
      const inventoryLevel = Math.min(100, (total / 1000) * 100); // Assume 1000 is full stock
      
      return {
        material,
        riskScore,
        reason,
        inventoryLevel,
      };
    })
    .filter(m => m.riskScore > 0)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 5); // Top 5 at-risk materials
  
  if (isLoading) {
    return (
      <Card data-testid="card-materials-at-risk">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Materials at Risk
          </CardTitle>
          <CardDescription>Materials requiring immediate attention</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Loading materials data...
          </p>
        </CardContent>
      </Card>
    );
  }
  
  if (materialsAtRisk.length === 0) {
    return (
      <Card data-testid="card-materials-at-risk">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-good" />
            Materials at Risk
          </CardTitle>
          <CardDescription>All materials have healthy inventory levels</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No materials at risk. Inventory levels are healthy!
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card data-testid="card-materials-at-risk">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-signal" />
              Materials at Risk
            </CardTitle>
            <CardDescription>
              {materialsAtRisk.length} requiring attention · {framing.tag}
            </CardDescription>
          </div>
          <Badge variant="destructive">{materialsAtRisk.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {materialsAtRisk.map((item) => (
            <div
              key={item.material.id}
              className="p-3 rounded-md border hover-elevate"
              data-testid={`material-risk-${item.material.id}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.material.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {item.material.code}
                  </p>
                </div>
                <Badge
                  variant={
                    item.riskScore >= 80
                      ? "destructive"
                      : item.riskScore >= 50
                      ? "secondary"
                      : "outline"
                  }
                  className="text-xs"
                >
                  {item.reason}
                </Badge>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Inventory Level</span>
                  <span className="font-mono font-medium">
                    {item.material.onHand} {item.material.unit}
                    {item.material.inbound > 0 && ` (+${item.material.inbound} inbound)`}
                  </span>
                </div>
                <Progress
                  value={item.inventoryLevel}
                  className={`h-2 ${
                    item.riskScore >= 80
                      ? "[&>div]:bg-destructive"
                      : item.riskScore >= 50
                      ? "[&>div]:bg-yellow-600"
                      : "[&>div]:bg-orange-600"
                  }`}
                />
              </div>

              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                <span className="font-medium text-foreground/80">Why:</span> {framing.recommendation(item.reason)}
              </p>

              <div className="flex items-center gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setLocation(`/rfq-generation?materialId=${item.material.id}`)}
                  data-testid={`button-procure-${item.material.id}`}
                >
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Schedule Procurement
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setLocation(`/multi-tier-supplier-mapping?materialId=${item.material.id}`)}
                  data-testid={`button-alternatives-${item.material.id}`}
                >
                  <Search className="h-3 w-3 mr-1" />
                  Alternatives
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
