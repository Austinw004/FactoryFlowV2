import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Package, TrendingDown, Search, ShieldAlert } from "lucide-react";
import { useLocation } from "wouter";
import type { Material } from "@shared/schema";

interface MaterialRisk {
  material: Material;
  riskScore: number;
  reason: string;
  recommendation: string;
  why: string;
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
      let why = "";

      if (total === 0) {
        riskScore = 100;
        reason = "Zero inventory";
        why = "No stock on hand and no inbound orders. Any demand will cause an immediate stockout.";
        recommendation = "Place emergency purchase order. Contact supplier for expedited lead time.";
      } else if (total < 100) {
        riskScore = 80;
        reason = "Critically low stock";
        why = `Only ${total} ${material.unit || 'units'} remaining. ${inbound > 0 ? `${inbound} inbound, but may not arrive in time.` : 'No inbound orders scheduled.'}`;
        recommendation = "Increase reorder quantity immediately. Qualify a backup supplier to prevent production disruption.";
      } else if (total < 500) {
        riskScore = 50;
        reason = "Low inventory";
        why = `${onHand} ${material.unit || 'units'} on hand${inbound > 0 ? ` + ${inbound} inbound` : ', no inbound orders'}. Below recommended safety stock threshold.`;
        recommendation = "Review reorder point. Schedule procurement to build buffer stock above safety threshold.";
      } else if (inbound === 0 && onHand < 1000) {
        riskScore = 30;
        reason = "No inbound orders";
        why = `${onHand} ${material.unit || 'units'} on hand with no replenishment scheduled. Passive depletion risk.`;
        recommendation = "Schedule next purchase order to maintain continuous supply coverage.";
      }

      const inventoryLevel = Math.min(100, (total / 1000) * 100);

      return {
        material,
        riskScore,
        reason,
        recommendation,
        why,
        inventoryLevel,
      };
    })
    .filter(m => m.riskScore > 0)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 5); // Top 5 at-risk materials, ranked by severity
  
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
              {materialsAtRisk.length} {materialsAtRisk.length === 1 ? 'material' : 'materials'} requiring attention — ranked by severity
            </CardDescription>
          </div>
          <Badge variant="destructive">{materialsAtRisk.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {materialsAtRisk.map((item, index) => (
            <div
              key={item.material.id}
              className={`p-3 rounded-md border hover-elevate ${
                item.riskScore >= 80 ? 'border-red-500/30 bg-red-500/5' :
                item.riskScore >= 50 ? 'border-yellow-500/30 bg-yellow-500/5' :
                'border-orange-500/20 bg-orange-500/5'
              }`}
              data-testid={`material-risk-${item.material.id}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    {index === 0 && <ShieldAlert className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                    <p className="font-medium text-sm">{item.material.name}</p>
                  </div>
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
                  {item.reason}
                </Badge>
              </div>

              <div className="space-y-1 mb-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Stock Level</span>
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

              {/* Why this matters + recommendation */}
              {item.why && (
                <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                  <span className="font-medium">Why: </span>{item.why}
                </p>
              )}
              {item.recommendation && (
                <p className="text-xs font-medium text-primary mb-3 leading-relaxed">
                  → {item.recommendation}
                </p>
              )}

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs h-7"
                  onClick={() => setLocation(`/rfq-generation?materialId=${item.material.id}`)}
                  data-testid={`button-procure-${item.material.id}`}
                >
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Schedule Procurement
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 px-2"
                  onClick={() => setLocation(`/procurement`)}
                  data-testid={`button-find-supplier-${item.material.id}`}
                >
                  <Search className="h-3 w-3 mr-1" />
                  Find Supplier
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
