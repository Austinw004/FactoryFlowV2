import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Package,
  ShoppingCart,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { useLocation } from "wouter";
import type { Material } from "@shared/schema";

interface MaterialRisk {
  material: Material;
  riskScore: number;
  reason: string;
  inventoryLevel: number; // percentage
  rationale: string;
}

interface RegimeResponse {
  regime?: string;
  fdr?: number;
}

const regimeRisk: Record<
  string,
  { tag: string; nuance: string }
> = {
  HEALTHY_EXPANSION: {
    tag: "Stable regime",
    nuance: "Standard replenishment is enough — no regime-driven escalation.",
  },
  ASSET_LED_GROWTH: {
    tag: "Rising input costs",
    nuance:
      "Asset-Led Growth typically pushes lead times and prices up — close gaps now while supply is still flexible.",
  },
  IMBALANCED_EXCESS: {
    tag: "Avoid peak-price buys",
    nuance:
      "Imbalanced Excess regime usually precedes a price correction — only top up genuinely critical materials, defer the rest.",
  },
  REAL_ECONOMY_LEAD: {
    tag: "Buyer's window",
    nuance:
      "Real Economy Lead means suppliers are competing for volume — use this gap as leverage on terms, not just quantity.",
  },
  UNKNOWN: {
    tag: "Regime calibrating",
    nuance: "Treat current conditions as neutral until the FDR engine stabilizes.",
  },
};

export function MaterialsAtRiskWidget() {
  const [, setLocation] = useLocation();
  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });
  const { data: regime } = useQuery<RegimeResponse>({
    queryKey: ["/api/economics/regime"],
  });

  const regimeKey = (regime?.regime || "UNKNOWN") as keyof typeof regimeRisk;
  const regimeContext = regimeRisk[regimeKey] || regimeRisk.UNKNOWN;

  // Calculate risk for each material — preserves the existing thresholds while
  // attaching a prescriptive rationale so customers never read a warning
  // without knowing what to do about it.
  const materialsAtRisk: MaterialRisk[] = materials
    .map((material) => {
      const onHand = material.onHand || 0;
      const inbound = material.inbound || 0;
      const total = onHand + inbound;

      let riskScore = 0;
      let reason = "";
      let rationale = "";

      if (total === 0) {
        riskScore = 100;
        reason = "Zero inventory";
        rationale =
          "Production lines using this material will stop on the next consumption event. Issue an emergency RFQ.";
      } else if (total < 100) {
        riskScore = 80;
        reason = "Critically low stock";
        rationale =
          "Days of supply below the typical lead-time buffer. Place a replenishment order or pull from an alternate supplier.";
      } else if (total < 500) {
        riskScore = 50;
        reason = "Low inventory";
        rationale =
          "Coverage is thinning. Raise the reorder point or trigger the next PO ahead of schedule.";
      } else if (inbound === 0 && onHand < 1000) {
        riskScore = 30;
        reason = "No inbound orders";
        rationale =
          "On-hand stock looks healthy but nothing is in transit. A lead-time spike here would cause a stockout.";
      }

      // Asset-Led Growth amplifies lead-time risk; nudge the rationale.
      if (regimeKey === "ASSET_LED_GROWTH" && riskScore >= 30) {
        rationale +=
          " The current Asset-Led Growth regime is also pushing supplier lead times up — act sooner than the standard rule would suggest.";
      }

      const inventoryLevel = Math.min(100, (total / 1000) * 100);

      return {
        material,
        riskScore,
        reason,
        inventoryLevel,
        rationale,
      };
    })
    .filter((m) => m.riskScore > 0)
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
            <Package className="h-5 w-5 text-emerald-600" />
            Materials at Risk
          </CardTitle>
          <CardDescription>No materials are below the action threshold today.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-2">
            <span className="font-medium text-foreground">
              {regimeContext.tag}.
            </span>{" "}
            {regimeContext.nuance}
          </p>
        </CardContent>
      </Card>
    );
  }

  const criticalCount = materialsAtRisk.filter((m) => m.riskScore >= 80).length;

  return (
    <Card data-testid="card-materials-at-risk">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Materials at Risk
            </CardTitle>
            <CardDescription>
              {materialsAtRisk.length} material
              {materialsAtRisk.length === 1 ? "" : "s"} need attention
              {criticalCount > 0 ? `, ${criticalCount} critical` : ""}.{" "}
              <span className="text-foreground/70">{regimeContext.tag}.</span>
            </CardDescription>
          </div>
          <Badge variant={criticalCount > 0 ? "destructive" : "secondary"}>
            {criticalCount > 0 ? `${criticalCount} critical` : "Monitor"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          {regimeContext.nuance}
        </p>
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
                  <span className="text-muted-foreground">Inventory level</span>
                  <span className="font-mono font-medium">
                    {item.material.onHand} {item.material.unit}
                    {item.material.inbound > 0 &&
                      ` (+${item.material.inbound} inbound)`}
                  </span>
                </div>
                <Progress
                  value={item.inventoryLevel}
                  className={`h-2 ${
                    item.riskScore >= 80
                      ? "[&>div]:bg-destructive"
                      : item.riskScore >= 50
                        ? "[&>div]:bg-amber-600"
                        : "[&>div]:bg-orange-600"
                  }`}
                />
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed mt-3">
                <span className="font-medium text-foreground/70">Why this matters:</span>{" "}
                {item.rationale}
              </p>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <Button
                  variant="default"
                  size="sm"
                  className="text-xs"
                  onClick={() =>
                    setLocation(`/rfq-generation?materialId=${item.material.id}`)
                  }
                  data-testid={`button-procure-${item.material.id}`}
                >
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  Issue RFQ
                  <ArrowRight className="h-3 w-3 ml-1 opacity-70" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() =>
                    setLocation(
                      `/inventory-optimization?materialId=${item.material.id}`,
                    )
                  }
                  data-testid={`button-safety-stock-${item.material.id}`}
                >
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Safety stock
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
