import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Package, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import type { Material } from "@shared/schema";

interface MaterialRisk {
  material: Material;
  riskScore: number;
  reason: string;
  why: string;
  inventoryLevel: number; // percentage
}

// Regime-specific recommended action for an at-risk material. The action
// changes meaningfully with the FDR regime — the same low-stock material
// gets a different play during Asset-Led Growth (lock in price now) vs.
// Imbalanced Excess (defer, draw down). This is the FDR model driving an
// individual procurement decision, not just sitting in a corner badge.
function regimeActionForMaterial(regime: string, riskScore: number): { label: string; helper: string } {
  if (riskScore >= 80) {
    // Critical stock-out risk overrides regime — must replenish.
    return {
      label: "Schedule emergency procurement",
      helper: "Production line exposure outweighs price timing — replenish now.",
    };
  }
  switch (regime) {
    case "ASSET_LED_GROWTH":
      return {
        label: "Lock in supplier contract",
        helper: "Asset-led regime — input prices likely rising. Convert spot order into a fixed-price agreement before next cycle.",
      };
    case "IMBALANCED_EXCESS":
      return {
        label: "Defer non-critical order",
        helper: "Imbalanced regime — prices likely to correct down. Draw down current stock and delay rebuy if production cover allows.",
      };
    case "REAL_ECONOMY_LEAD":
      return {
        label: "Negotiate long-term deal",
        helper: "Counter-cyclical window — pricing leverage favors the buyer. Lock in 6–12 month terms while suppliers want volume.",
      };
    case "HEALTHY_EXPANSION":
    default:
      return {
        label: "Schedule procurement",
        helper: "Stable conditions — replenish on standard cadence and qualify a backup supplier if single-sourced.",
      };
  }
}

export function MaterialsAtRiskWidget() {
  const [, setLocation] = useLocation();
  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ['/api/materials'],
  });

  // Reuse the dashboard's regime query — react-query dedupes by key, so
  // this widget pays no extra network cost.
  const { data: regimeData } = useQuery<any>({
    queryKey: ["/api/economics/regime"],
  });
  const regime: string = regimeData?.regime ?? "UNKNOWN";

  // Calculate risk for each material
  const materialsAtRisk: MaterialRisk[] = materials
    .map(material => {
      const onHand = material.onHand || 0;
      const inbound = material.inbound || 0;
      const total = onHand + inbound;

      let riskScore = 0;
      let reason = "";
      let why = "";

      if (total === 0) {
        riskScore = 100;
        reason = "Stock-out";
        why = "Zero on-hand and zero inbound. Production lines using this material will stop on next consumption.";
      } else if (total < 100) {
        riskScore = 80;
        reason = "Critically low";
        why = "Combined on-hand + inbound is below the floor most factories run for buffer stock. Single demand spike will trigger a stock-out.";
      } else if (total < 500) {
        riskScore = 50;
        reason = "Low cover";
        why = "Cover is thin relative to typical lead times — a 1–2 week supplier slip would push this into critical territory.";
      } else if (inbound === 0 && onHand < 1000) {
        riskScore = 30;
        reason = "No inbound";
        why = "On-hand is acceptable but no replenishment is in flight. Material is exposed to any unplanned demand pull.";
      }

      const inventoryLevel = Math.min(100, (total / 1000) * 100);

      return {
        material,
        riskScore,
        reason,
        why,
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
            <Package className="h-5 w-5 text-good" />
            Materials at Risk
          </CardTitle>
          <CardDescription>All materials have healthy inventory levels</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No materials at risk. Inventory cover is healthy across the catalog.
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
              {materialsAtRisk.length} material{materialsAtRisk.length === 1 ? '' : 's'} requiring attention · Recommendations adjusted for current regime
            </CardDescription>
          </div>
          <Badge variant="destructive">{materialsAtRisk.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {materialsAtRisk.map((item) => {
            const action = regimeActionForMaterial(regime, item.riskScore);
            return (
              <div
                key={item.material.id}
                className="p-3 rounded-md border hover-elevate"
                data-testid={`material-risk-${item.material.id}`}
              >
                <div className="flex items-start justify-between mb-2 gap-2">
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
                    <span className="text-muted-foreground">Inventory cover</span>
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

                <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                  <span className="uppercase tracking-wider mr-1.5 text-muted">Why:</span>
                  {item.why}
                </p>

                <div className="mt-3 pt-3 border-t border-border/60">
                  <p className="text-xs text-soft mb-2">
                    <span className="uppercase tracking-wider mr-1.5 text-muted">Recommended:</span>
                    {action.helper}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs justify-between"
                    onClick={() => setLocation(`/rfq-generation?materialId=${item.material.id}`)}
                    data-testid={`button-procure-${item.material.id}`}
                  >
                    {action.label}
                    <ArrowRight className="h-3 w-3 ml-2" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
