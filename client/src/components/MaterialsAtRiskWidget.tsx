import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Package, TrendingDown, GitBranch } from "lucide-react";
import { useLocation } from "wouter";
import type { Material } from "@shared/schema";

interface MaterialRisk {
  material: Material;
  riskScore: number;
  reason: string;
  inventoryLevel: number; // percentage
  recommendedAction: string;
  rationale: string;
}

// Regime context shifts the recommended action: in tightening regimes we
// push toward dual-sourcing and pre-buys; in counter-cyclical windows we
// push toward renegotiation. The customer always sees both the action and
// the reason, never a black-box "at risk" badge.
function buildRecommendation(
  riskScore: number,
  reason: string,
  regime: string,
): { action: string; rationale: string } {
  const tighteningRegime =
    regime === "ASSET_LED_GROWTH" || regime === "IMBALANCED_EXCESS";

  if (riskScore >= 80) {
    return {
      action: tighteningRegime
        ? "Issue an emergency PO and qualify a backup supplier this week."
        : "Issue a PO immediately and confirm lead time with current supplier.",
      rationale: tighteningRegime
        ? `${reason}. Current regime is tightening — input costs are likely to rise. Locking volume now protects margin and continuity.`
        : `${reason}. Stock is below operating threshold; production lines using this material are at imminent risk.`,
    };
  }
  if (riskScore >= 50) {
    return {
      action: tighteningRegime
        ? "Pre-buy 30–60 days of cover and negotiate a fixed-price window."
        : "Schedule a replenishment PO in the next 2 weeks.",
      rationale: tighteningRegime
        ? `${reason}. Asset-market signals point to rising input prices — pre-buying converts uncertainty into a known cost.`
        : `${reason}. Cover is thin enough that a normal lead-time delay would create a stockout.`,
    };
  }
  return {
    action: "Add to next planned procurement cycle and review reorder point.",
    rationale: `${reason}. Not yet critical, but trending toward a reorder trigger — worth scheduling rather than reacting.`,
  };
}

export function MaterialsAtRiskWidget() {
  const [, setLocation] = useLocation();
  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ['/api/materials'],
  });
  const { data: regimeData } = useQuery<{ regime?: string }>({
    queryKey: ["/api/economics/regime"],
  });
  const currentRegime = regimeData?.regime || "HEALTHY_EXPANSION";

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

      const { action, rationale } = buildRecommendation(riskScore, reason, currentRegime);

      return {
        material,
        riskScore,
        reason,
        inventoryLevel,
        recommendedAction: action,
        rationale,
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
              {materialsAtRisk.length} materials requiring attention
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
              
              <div className="mt-3 p-2 rounded-md bg-muted/40 border border-line/40">
                <div className="text-xs font-medium text-foreground" data-testid={`recommended-action-${item.material.id}`}>
                  Recommended: {item.recommendedAction}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  Why: {item.rationale}
                </div>
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
                  Schedule Procurement
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setLocation(`/multi-tier-mapping?materialId=${item.material.id}`)}
                  data-testid={`button-alternatives-${item.material.id}`}
                >
                  <GitBranch className="h-3 w-3 mr-1" />
                  Find Alternatives
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
