import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Package, ShoppingCart, RotateCcw, Clock, Settings2 } from "lucide-react";
import { useLocation } from "wouter";
import type { Material } from "@shared/schema";

type RiskReason = "zero_inventory" | "critically_low" | "low_inventory" | "no_inbound";

interface MaterialRisk {
  material: Material;
  riskScore: number;
  reason: RiskReason;
  inventoryLevel: number; // percentage
}

const riskConfig: Record<RiskReason, {
  label: string;
  impact: string;
  action: string;
  actionPath: (id: string) => string;
  icon: any;
  severity: "destructive" | "secondary" | "outline";
}> = {
  zero_inventory: {
    label: "Zero Stock",
    impact: "Production stoppage risk. Any dependent work orders are blocked right now.",
    action: "Emergency Procurement",
    actionPath: (id) => `/rfq-generation?materialId=${id}&priority=urgent`,
    icon: ShoppingCart,
    severity: "destructive",
  },
  critically_low: {
    label: "Critically Low",
    impact: "Stock covers less than 1 week of typical usage. Order within 48 hours.",
    action: "Create Urgent Purchase Order",
    actionPath: (id) => `/rfq-generation?materialId=${id}&priority=high`,
    icon: Clock,
    severity: "destructive",
  },
  low_inventory: {
    label: "Low Stock",
    impact: "Will reach critical level in 2–3 weeks at current usage rate.",
    action: "Schedule Reorder",
    actionPath: (id) => `/rfq-generation?materialId=${id}`,
    icon: RotateCcw,
    severity: "secondary",
  },
  no_inbound: {
    label: "No Replenishment",
    impact: "No incoming orders on record. Review reorder point settings.",
    action: "Review Reorder Settings",
    actionPath: (_id) => `/inventory`,
    icon: Settings2,
    severity: "outline",
  },
};

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
      let reason: RiskReason = "no_inbound";

      if (total === 0) {
        riskScore = 100;
        reason = "zero_inventory";
      } else if (total < 100) {
        riskScore = 80;
        reason = "critically_low";
      } else if (total < 500) {
        riskScore = 50;
        reason = "low_inventory";
      } else if (inbound === 0 && onHand < 1000) {
        riskScore = 30;
        reason = "no_inbound";
      }

      const inventoryLevel = Math.min(100, (total / 1000) * 100);

      return {
        material,
        riskScore,
        reason,
        inventoryLevel,
      };
    })
    .filter(m => m.riskScore > 0)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 5);
  
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
            No materials at risk. Inventory levels are healthy.
          </p>
        </CardContent>
      </Card>
    );
  }

  const criticalCount = materialsAtRisk.filter(m => m.riskScore >= 80).length;

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
              {criticalCount > 0
                ? `${criticalCount} critical · ${materialsAtRisk.length - criticalCount} need attention`
                : `${materialsAtRisk.length} materials need attention`}
            </CardDescription>
          </div>
          <Badge variant={criticalCount > 0 ? "destructive" : "secondary"}>{materialsAtRisk.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {materialsAtRisk.map((item) => {
            const cfg = riskConfig[item.reason];
            const ActionIcon = cfg.icon;
            return (
              <div
                key={item.material.id}
                className="p-3 rounded-md border hover-elevate"
                data-testid={`material-risk-${item.material.id}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.material.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{item.material.code}</p>
                  </div>
                  <Badge variant={cfg.severity} className="text-xs shrink-0 ml-2">
                    {cfg.label}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{cfg.impact}</p>

                <div className="space-y-1 mb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">On Hand</span>
                    <span className="font-mono font-medium">
                      {item.material.onHand ?? 0} {item.material.unit}
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

                <Button
                  variant={item.riskScore >= 80 ? "default" : "outline"}
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => setLocation(cfg.actionPath(item.material.id))}
                  data-testid={`button-procure-${item.material.id}`}
                >
                  <ActionIcon className="h-3 w-3 mr-1.5" />
                  {cfg.action}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
