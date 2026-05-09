import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Package, TrendingDown, ShieldCheck, Search } from "lucide-react";
import { useLocation } from "wouter";
import type { Material } from "@shared/schema";

interface MaterialRisk {
  material: Material;
  riskScore: number;
  reason: string;          // short label (badge)
  why: string;             // sentence-level reasoning
  recommendedAction: string;
  inventoryLevel: number;  // percentage
}

// Regime-aware framing for the recommended action. The procurement playbook
// changes depending on whether we're in a tightening (ASSET_LED_GROWTH /
// IMBALANCED_EXCESS) or loosening (REAL_ECONOMY_LEAD) regime.
const regimeActionFraming: Record<string, string> = {
  HEALTHY_EXPANSION: "Standard pace — qualify a backup supplier and right-size safety stock.",
  ASSET_LED_GROWTH: "Pricing pressure rising — accelerate next PO and lock in a backup supplier this cycle.",
  IMBALANCED_EXCESS: "Volatile window — build a buffer only on this critical SKU; defer non-critical buys.",
  REAL_ECONOMY_LEAD: "Buyer's market — solicit competing quotes before placing the next PO.",
};

export function MaterialsAtRiskWidget() {
  const [, setLocation] = useLocation();
  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ['/api/materials'],
  });

  // Pull current regime so the recommended action reflects today's macro
  // window, not just the inventory state. This is the FDR thesis at the
  // widget level.
  const { data: regime } = useQuery<{ regime?: string; fdr?: number }>({
    queryKey: ["/api/economics/regime"],
  });
  const regimeKey = regime?.regime || "HEALTHY_EXPANSION";
  const regimeAction = regimeActionFraming[regimeKey] || regimeActionFraming.HEALTHY_EXPANSION;

  // Calculate risk for each material
  const materialsAtRisk: MaterialRisk[] = materials
    .map(material => {
      const onHand = material.onHand || 0;
      const inbound = material.inbound || 0;
      const total = onHand + inbound;
      const unit = material.unit || "units";

      let riskScore = 0;
      let reason = "";
      let why = "";
      let recommendedAction = "";

      if (total === 0) {
        riskScore = 100;
        reason = "Zero inventory";
        why = `On-hand and inbound are both zero. Any production drawing on ${material.name} will halt until receipt.`;
        recommendedAction = `Place an emergency PO today. ${regimeAction}`;
      } else if (total < 100) {
        riskScore = 80;
        reason = "Critically low";
        why = `Only ${total.toLocaleString()} ${unit} between on-hand and inbound — typical run-rates exhaust this within days.`;
        recommendedAction = `Expedite next PO and qualify a backup supplier. ${regimeAction}`;
      } else if (total < 500) {
        riskScore = 50;
        reason = "Low inventory";
        why = `${total.toLocaleString()} ${unit} available. Below the buffer needed to absorb a typical lead-time slip.`;
        recommendedAction = `Increase safety stock and review reorder point. ${regimeAction}`;
      } else if (inbound === 0 && onHand < 1000) {
        riskScore = 30;
        reason = "No inbound";
        why = `${onHand.toLocaleString()} ${unit} on hand with no replenishment in transit.`;
        recommendedAction = `Schedule the next PO now to avoid a stock-out window. ${regimeAction}`;
      }

      const inventoryLevel = Math.min(100, (total / 1000) * 100); // Assume 1000 is full stock

      return {
        material,
        riskScore,
        reason,
        why,
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

              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                <span className="uppercase tracking-wider mr-1 text-[10px]">Why</span>
                {item.why}
              </p>
              <p className="text-xs mt-1.5 leading-relaxed">
                <span className="uppercase tracking-wider mr-1 text-[10px] text-primary">Do</span>
                {item.recommendedAction}
              </p>

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
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
                  onClick={() => setLocation(`/supply-chain?materialId=${item.material.id}`)}
                  data-testid={`button-find-alternatives-${item.material.id}`}
                >
                  <Search className="h-3 w-3 mr-1" />
                  Find alternatives
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setLocation(`/inventory-optimization?materialId=${item.material.id}`)}
                  data-testid={`button-adjust-safety-stock-${item.material.id}`}
                >
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Adjust safety stock
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
