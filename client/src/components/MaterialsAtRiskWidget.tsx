import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Package, TrendingDown } from "lucide-react";
import { useLocation } from "wouter";
import type { Material } from "@shared/schema";

interface MaterialRisk {
  material: Material;
  riskScore: number;
  reason: string;
  inventoryLevel: number; // percentage
}

// Regime-aware guidance translates a stockout risk into a specific
// procurement posture. The same low-stock material warrants very different
// action depending on whether the FDR model says prices are about to spike
// (Asset-Led Growth → buy now, lock contracts) versus fall (Imbalanced
// Excess → draw down, defer). Without this, a "Schedule Procurement" button
// is generic — with it, the widget tells the customer what to actually do.
const regimeRiskAdvice: Record<string, { headline: string; cta: string }> = {
  HEALTHY_EXPANSION: {
    headline: "Standard reorder cadence. Replenish to target safety stock; pricing is stable.",
    cta: "Schedule reorder",
  },
  ASSET_LED_GROWTH: {
    headline: "Prices likely to rise. Pull forward purchases on critical items and lock supplier contracts.",
    cta: "Lock in pricing",
  },
  IMBALANCED_EXCESS: {
    headline: "Defer non-critical buys; renegotiate. Build buffer only on production-critical materials.",
    cta: "Review alternatives",
  },
  REAL_ECONOMY_LEAD: {
    headline: "Favorable buying window. Negotiate longer-term contracts before recovery tightens supply.",
    cta: "Negotiate contract",
  },
  UNKNOWN: {
    headline: "Regime signals loading. Default action: schedule replenishment.",
    cta: "Schedule procurement",
  },
};

export function MaterialsAtRiskWidget() {
  const [, setLocation] = useLocation();
  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ['/api/materials'],
  });
  const { data: regime } = useQuery<{ regime?: string; fdr?: number }>({
    queryKey: ['/api/economics/regime'],
  });
  const regimeType = regime?.regime || 'UNKNOWN';
  const advice = regimeRiskAdvice[regimeType] || regimeRiskAdvice.UNKNOWN;
  
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
              {materialsAtRisk.length} material{materialsAtRisk.length === 1 ? '' : 's'} requiring attention — ranked by stockout risk
            </CardDescription>
          </div>
          <Badge variant="destructive">{materialsAtRisk.length}</Badge>
        </div>
        {/* Regime-aware procurement guidance — the same risk warrants
            different action depending on the FDR-detected regime. */}
        <div
          className="mt-3 text-xs text-muted-foreground leading-relaxed border-l-2 border-signal/50 pl-3"
          data-testid="text-risk-regime-guidance"
        >
          <span className="font-medium text-foreground">Posture: </span>
          {advice.headline}
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
              
              <div className="flex items-center gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setLocation(`/rfq-generation?materialId=${item.material.id}`)}
                  data-testid={`button-procure-${item.material.id}`}
                >
                  <TrendingDown className="h-3 w-3 mr-1" />
                  {advice.cta}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
