import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Package, TrendingDown, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import type { Material } from "@shared/schema";

interface MaterialRisk {
  material: Material;
  riskScore: number;
  reason: string;
  recommendation: string;
  why: string;
  inventoryLevel: number; // percentage
  daysOfSupply: number | null;
}

// Convert risk shape to plain-English guidance the customer can act on.
function buildGuidance(onHand: number, inbound: number): {
  riskScore: number;
  reason: string;
  recommendation: string;
  why: string;
  daysOfSupply: number | null;
} | null {
  const total = onHand + inbound;

  // Heuristic days-of-supply assuming ~33 units/day average draw —
  // real implementations override this with BOM × demand forecast.
  const daysOfSupply = total > 0 ? Math.round(total / 33) : 0;

  if (total === 0) {
    return {
      riskScore: 100,
      reason: "Stockout",
      recommendation: "Issue emergency PO today",
      why: "On-hand and inbound are both zero. Any production run consuming this material will halt until replenished.",
      daysOfSupply,
    };
  }
  if (total < 100) {
    return {
      riskScore: 85,
      reason: "Critically low",
      recommendation: "Expedite PO + qualify backup supplier",
      why: `Only ~${daysOfSupply} day${daysOfSupply === 1 ? "" : "s"} of supply remain. Lead-time slippage from a single supplier would create a stockout.`,
      daysOfSupply,
    };
  }
  if (total < 500) {
    return {
      riskScore: 55,
      reason: "Low — replenish soon",
      recommendation: "Schedule procurement within 5 days",
      why: `~${daysOfSupply} days of cover. Below typical reorder point for medium-velocity materials.`,
      daysOfSupply,
    };
  }
  if (inbound === 0 && onHand < 1000) {
    return {
      riskScore: 30,
      reason: "No inbound orders",
      recommendation: "Place next PO this week",
      why: `${daysOfSupply} days of cover but zero inbound. Without an open PO, lead times will eat into safety stock.`,
      daysOfSupply,
    };
  }
  return null;
}

export function MaterialsAtRiskWidget() {
  const [, setLocation] = useLocation();
  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ['/api/materials'],
  });

  const materialsAtRisk: MaterialRisk[] = materials
    .map(material => {
      const onHand = material.onHand || 0;
      const inbound = material.inbound || 0;
      const guidance = buildGuidance(onHand, inbound);
      if (!guidance) return null;

      const inventoryLevel = Math.min(100, ((onHand + inbound) / 1000) * 100);

      return {
        material,
        ...guidance,
        inventoryLevel,
      } as MaterialRisk;
    })
    .filter((m): m is MaterialRisk => m !== null)
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
            <ShieldCheck className="h-5 w-5 text-good" />
            Materials at Risk
          </CardTitle>
          <CardDescription>No materials currently breaching reorder thresholds</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-2">
            Inventory levels are healthy across all tracked materials. The platform will surface
            replenishment alerts here when on-hand cover falls below reorder thresholds or inbound
            orders dry up.
          </p>
        </CardContent>
      </Card>
    );
  }

  const criticalCount = materialsAtRisk.filter(m => m.riskScore >= 80).length;
  const headerSubtitle = criticalCount > 0
    ? `${criticalCount} critical, ${materialsAtRisk.length - criticalCount} need action`
    : `${materialsAtRisk.length} need action`;

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
              {headerSubtitle} — ranked by stockout severity
            </CardDescription>
          </div>
          <Badge variant={criticalCount > 0 ? "destructive" : "secondary"}>
            {materialsAtRisk.length}
          </Badge>
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
                  className="text-xs whitespace-nowrap"
                >
                  {item.reason}
                </Badge>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {item.daysOfSupply != null ? `~${item.daysOfSupply} days of cover` : "Inventory level"}
                  </span>
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

              <div className="mt-3 rounded-md bg-muted/40 p-2.5 space-y-1.5">
                <div className="flex items-start gap-1.5">
                  <span className="text-xs font-medium text-foreground shrink-0">Recommended:</span>
                  <span className="text-xs text-foreground">{item.recommendation}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0 mt-0.5">Why</span>
                  <span className="text-xs text-muted-foreground leading-relaxed">{item.why}</span>
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
                  Procure Now
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setLocation(`/supplier-risk?materialId=${item.material.id}`)}
                  data-testid={`button-alternatives-${item.material.id}`}
                >
                  Find alternatives
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
