import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Package, TrendingDown, ArrowRight, ShieldAlert } from "lucide-react";
import { useLocation } from "wouter";
import type { Material } from "@shared/schema";

interface MaterialRisk {
  material: Material;
  riskScore: number;
  reason: string;
  recommendedAction: string;
  inventoryLevel: number; // percentage
}

function getRiskRecommendation(reason: string, regime: string): string {
  if (reason === "Zero inventory") {
    return regime === "IMBALANCED_EXCESS"
      ? "Emergency procurement needed. Issue RFQ immediately — even at elevated prices, stockout risk outweighs cost."
      : "Issue an emergency purchase order. Contact your primary supplier today.";
  }
  if (reason === "Critically low stock") {
    return regime === "ASSET_LED_GROWTH"
      ? "Replenish now before price increases hit. Consider a larger-than-usual order to build buffer."
      : "Increase reorder point and place a replenishment order within 48 hours.";
  }
  if (reason === "Low inventory") {
    return regime === "REAL_ECONOMY_LEAD"
      ? "Favorable buying window — good time to build safety stock while terms are competitive."
      : "Schedule procurement within the week. Review minimum order quantity with supplier.";
  }
  if (reason === "No inbound orders") {
    return "No inbound supply on order. Create a procurement schedule or qualify an alternate supplier.";
  }
  return "Review procurement schedule and confirm next delivery is on track.";
}

export function MaterialsAtRiskWidget() {
  const [, setLocation] = useLocation();

  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ['/api/materials'],
  });

  const { data: regime } = useQuery<{ regime: string; fdr: number }>({
    queryKey: ['/api/economics/regime'],
  });

  const currentRegime = (regime as any)?.regime || "HEALTHY_EXPANSION";

  // Calculate risk for each material
  const materialsAtRisk: MaterialRisk[] = materials
    .map(material => {
      const onHand = material.onHand || 0;
      const inbound = material.inbound || 0;
      const total = onHand + inbound;

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

      // Regime amplifies risk scoring
      if (currentRegime === "ASSET_LED_GROWTH" && riskScore >= 50) riskScore = Math.min(100, riskScore + 10);
      if (currentRegime === "IMBALANCED_EXCESS" && riskScore >= 30) riskScore = Math.min(100, riskScore + 15);

      const inventoryLevel = Math.min(100, (total / 1000) * 100);

      return {
        material,
        riskScore,
        reason,
        recommendedAction: getRiskRecommendation(reason, currentRegime),
        inventoryLevel,
      };
    })
    .filter(m => m.riskScore > 0)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 5);

  const regimeContext: Record<string, string> = {
    ASSET_LED_GROWTH:  "Input costs are rising. Prioritize replenishment for these materials before the next pricing cycle.",
    IMBALANCED_EXCESS: "Market prices are elevated. Build safety stock only on critical materials — defer the rest.",
    REAL_ECONOMY_LEAD: "Favorable buying window. Consider increasing safety stock on high-risk items while costs are competitive.",
    HEALTHY_EXPANSION: "Conditions are stable. Address these shortfalls at standard procurement pace.",
  };

  if (isLoading) {
    return (
      <Card data-testid="card-materials-at-risk">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Materials at Risk
          </CardTitle>
          <CardDescription>Checking inventory levels...</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (materialsAtRisk.length === 0) {
    return (
      <Card data-testid="card-materials-at-risk">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-emerald-600" />
            Materials at Risk
          </CardTitle>
          <CardDescription>All materials have healthy inventory levels</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            No materials at risk. Inventory levels are healthy.
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
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              Materials at Risk
            </CardTitle>
            <CardDescription>
              {materialsAtRisk.length} material{materialsAtRisk.length > 1 ? 's' : ''} requiring attention — ranked by exposure
            </CardDescription>
          </div>
          <Badge variant="destructive">{materialsAtRisk.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Regime context banner */}
        {regimeContext[currentRegime] && (
          <p className="text-xs text-muted-foreground mb-4 p-2.5 rounded-md bg-muted/40 border">
            <span className="font-semibold text-foreground">Current regime: </span>
            {regimeContext[currentRegime]}
          </p>
        )}

        <div className="space-y-4">
          {materialsAtRisk.map((item, index) => (
            <div
              key={item.material.id}
              className={`p-3 rounded-md border hover-elevate ${
                item.riskScore >= 80 ? 'border-red-500/30 bg-red-500/5' :
                item.riskScore >= 50 ? 'border-amber-500/30 bg-amber-500/5' :
                ''
              }`}
              data-testid={`material-risk-${item.material.id}`}
            >
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <span className="text-xs font-mono text-muted-foreground/60 mt-0.5 shrink-0">#{index + 1}</span>
                  <div>
                    <p className="font-medium text-sm leading-tight">{item.material.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{item.material.code}</p>
                  </div>
                </div>
                <Badge
                  variant={item.riskScore >= 80 ? "destructive" : item.riskScore >= 50 ? "secondary" : "outline"}
                  className="text-xs shrink-0"
                >
                  {item.reason}
                </Badge>
              </div>

              <div className="space-y-1 mb-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Inventory on hand</span>
                  <span className="font-mono font-medium">
                    {item.material.onHand} {item.material.unit}
                    {item.material.inbound > 0 && (
                      <span className="text-emerald-600"> (+{item.material.inbound} inbound)</span>
                    )}
                  </span>
                </div>
                <Progress
                  value={item.inventoryLevel}
                  className={`h-1.5 ${
                    item.riskScore >= 80
                      ? "[&>div]:bg-red-500"
                      : item.riskScore >= 50
                      ? "[&>div]:bg-amber-500"
                      : "[&>div]:bg-orange-500"
                  }`}
                />
              </div>

              {/* Recommended action — the "so what" */}
              <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2 mb-2 leading-relaxed">
                <span className="font-semibold text-foreground">Action: </span>
                {item.recommendedAction}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-7"
                onClick={() => setLocation(`/rfq-generation?materialId=${item.material.id}`)}
                data-testid={`button-procure-${item.material.id}`}
              >
                <TrendingDown className="h-3 w-3 mr-1.5" />
                Create Purchase Order
                <ArrowRight className="h-3 w-3 ml-auto" />
              </Button>
            </div>
          ))}
        </div>

        {materialsAtRisk.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3 text-xs"
            onClick={() => setLocation('/inventory')}
          >
            View all inventory →
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
