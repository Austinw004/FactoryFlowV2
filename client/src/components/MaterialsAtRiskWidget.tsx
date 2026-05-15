import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Package, TrendingDown, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import type { Material } from "@shared/schema";

interface MaterialRisk {
  material: Material;
  riskScore: number;
  reason: string;          // Short tag (badge text)
  rationale: string;       // The "why" — what's driving the risk
  recommendedAction: string; // What to DO about it
  inventoryLevel: number;  // percentage
}

export function MaterialsAtRiskWidget() {
  const [, setLocation] = useLocation();
  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ['/api/materials'],
  });

  // Calculate risk for each material. Each risk tier gets a plain-language
  // rationale (the WHY) and a specific recommended action (the SO WHAT) so
  // the customer never reads a warning without knowing what to do about it.
  const materialsAtRisk: MaterialRisk[] = materials
    .map(material => {
      const onHand = material.onHand || 0;
      const inbound = material.inbound || 0;
      const total = onHand + inbound;
      const unit = material.unit || 'units';

      let riskScore = 0;
      let reason = "";
      let rationale = "";
      let recommendedAction = "";

      if (total === 0) {
        riskScore = 100;
        reason = "Stockout";
        rationale = "No on-hand inventory and nothing inbound. Production lines that depend on this material will stop.";
        recommendedAction = "Issue emergency PO or activate backup supplier today.";
      } else if (total < 100) {
        riskScore = 80;
        reason = "Critical low";
        rationale = `Only ${total.toLocaleString()} ${unit} on hand or inbound — below safe operating buffer.`;
        recommendedAction = "Expedite inbound shipment or place urgent PO this week.";
      } else if (total < 500) {
        riskScore = 50;
        reason = "Below buffer";
        rationale = `${total.toLocaleString()} ${unit} coverage is thin against typical demand variance.`;
        recommendedAction = "Schedule next PO now to restore safety stock.";
      } else if (inbound === 0 && onHand < 1000) {
        riskScore = 30;
        reason = "No inbound";
        rationale = `${onHand.toLocaleString()} ${unit} on hand with no inbound orders — coverage will erode.`;
        recommendedAction = "Confirm next reorder timing with supplier.";
      }

      const inventoryLevel = Math.min(100, (total / 1000) * 100);

      return {
        material,
        riskScore,
        reason,
        rationale,
        recommendedAction,
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
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.material.name}</p>
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
                  className="text-xs shrink-0"
                >
                  {item.reason}
                </Badge>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">On-hand coverage</span>
                  <span className="font-mono font-medium">
                    {item.material.onHand.toLocaleString()} {item.material.unit}
                    {item.material.inbound > 0 && ` (+${item.material.inbound.toLocaleString()} inbound)`}
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

              <div className="mt-3 text-xs space-y-1.5 leading-relaxed">
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Why:</span> {item.rationale}
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Recommended:</span> {item.recommendedAction}
                </p>
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
                  Generate RFQ
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setLocation(`/inventory-management?materialId=${item.material.id}`)}
                  data-testid={`button-view-material-${item.material.id}`}
                  title="Open material detail and supplier alternatives"
                >
                  View
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
