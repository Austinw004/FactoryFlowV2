import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Package, TrendingDown, ShieldAlert } from "lucide-react";
import { useLocation } from "wouter";
import type { Material } from "@shared/schema";

interface MaterialRisk {
  material: Material;
  riskScore: number;
  reason: string;
  recommendation: string;
  inventoryLevel: number; // percentage
}

export function MaterialsAtRiskWidget() {
  const [, setLocation] = useLocation();
  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ['/api/materials'],
  });
  
  // Calculate risk for each material
  const materialsAtRisk: MaterialRisk[] = materials
    .map(material => {
      const onHand = material.onHand || 0;
      const inbound = material.inbound || 0;
      const total = onHand + inbound;

      let riskScore = 0;
      let reason = "";
      let recommendation = "";

      if (total === 0) {
        riskScore = 100;
        reason = "Zero inventory — production stoppage risk";
        recommendation = "Issue emergency PO immediately. Qualify backup supplier if sole-sourced.";
      } else if (total < 100) {
        riskScore = 80;
        reason = "Critically low stock — days of supply < 1 week";
        recommendation = "Schedule procurement now. Check if expedited shipping can reduce lead time.";
      } else if (total < 500) {
        riskScore = 50;
        reason = "Low inventory — below safety stock threshold";
        recommendation = "Increase next PO quantity by 30–50% or add a second supplier to reduce reorder risk.";
      } else if (inbound === 0 && onHand < 1000) {
        riskScore = 30;
        reason = "No inbound orders — replenishment gap detected";
        recommendation = "Confirm open PO status with supplier. Create a new PO if replenishment is overdue.";
      }

      const inventoryLevel = Math.min(100, (total / 1000) * 100);

      return {
        material,
        riskScore,
        reason,
        recommendation,
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
            <Package className="h-5 w-5 text-green-600" />
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
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Materials at Risk
            </CardTitle>
            <CardDescription>
              {materialsAtRisk.length} material{materialsAtRisk.length !== 1 ? 's' : ''} need{materialsAtRisk.length === 1 ? 's' : ''} action — ranked by severity
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
                  className="text-xs shrink-0 ml-2"
                >
                  {item.riskScore >= 80 ? "Critical" : item.riskScore >= 50 ? "High" : "Medium"}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground mb-2">{item.reason}</p>

              <div className="space-y-1 mb-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">On Hand</span>
                  <span className="font-mono font-medium">
                    {item.material.onHand} {item.material.unit}
                    {item.material.inbound > 0 && ` (+${item.material.inbound} inbound)`}
                  </span>
                </div>
                <Progress
                  value={item.inventoryLevel}
                  className={`h-1.5 ${
                    item.riskScore >= 80
                      ? "[&>div]:bg-destructive"
                      : item.riskScore >= 50
                      ? "[&>div]:bg-yellow-600"
                      : "[&>div]:bg-orange-600"
                  }`}
                />
              </div>

              <div className="flex items-start gap-1.5 mb-3 p-2 rounded bg-muted/40">
                <ShieldAlert className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">{item.recommendation}</p>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => setLocation(`/rfq-generation?materialId=${item.material.id}`)}
                data-testid={`button-procure-${item.material.id}`}
              >
                <TrendingDown className="h-3 w-3 mr-1" />
                Create Procurement Request
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
