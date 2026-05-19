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
  reason: string;
  inventoryLevel: number; // percentage
}

// What the operator should DO with at-risk materials in each regime. The same
// "low inventory" status implies different actions depending on whether costs
// are rising (lock contracts) or falling (defer). Keyed to the regime model
// so the widget is never just a static stock-out warning.
const regimeAdvisory: Record<string, { headline: string; primaryLabel: string; primaryRoute: (id: string) => string }> = {
  HEALTHY_EXPANSION: {
    headline: "Stable regime — top up to standard reorder points. Use this window to qualify second sources on critical items.",
    primaryLabel: "Schedule procurement",
    primaryRoute: (id) => `/rfq-generation?materialId=${id}`,
  },
  ASSET_LED_GROWTH: {
    headline: "Asset-led inflation expected — lock pricing on these materials before the next cycle. Pre-purchase long-lead items now.",
    primaryLabel: "Lock contract pricing",
    primaryRoute: (id) => `/rfq-generation?materialId=${id}`,
  },
  IMBALANCED_EXCESS: {
    headline: "Market is decoupling — defer non-critical buys, draw down stock first. Build buffer only on items with no alternate source.",
    primaryLabel: "Review alternatives",
    primaryRoute: (id) => `/supplier-risk?materialId=${id}`,
  },
  REAL_ECONOMY_LEAD: {
    headline: "Counter-cyclical buying window — these materials are likely at cyclical-low pricing. Lock long-dated supply now.",
    primaryLabel: "Issue long-term RFQ",
    primaryRoute: (id) => `/rfq-generation?materialId=${id}`,
  },
};

interface MaterialsAtRiskWidgetProps {
  regime?: string;
}

export function MaterialsAtRiskWidget({ regime }: MaterialsAtRiskWidgetProps = {}) {
  const [, setLocation] = useLocation();
  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ['/api/materials'],
  });

  // Fall back to fetching the regime locally if the parent didn't pass one in,
  // so the widget keeps its regime-aware framing even when used standalone.
  const { data: regimeData } = useQuery<{ regime?: string }>({
    queryKey: ['/api/economics/regime'],
    enabled: !regime,
    staleTime: 60_000,
  });
  const activeRegime = regime || regimeData?.regime || "HEALTHY_EXPANSION";
  const advisory = regimeAdvisory[activeRegime] || regimeAdvisory.HEALTHY_EXPANSION;

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
        reason = "Zero inventory — production stoppage imminent";
      } else if (total < 100) {
        riskScore = 80;
        reason = "Critically low stock";
      } else if (total < 500) {
        riskScore = 50;
        reason = "Low inventory";
      } else if (inbound === 0 && onHand < 1000) {
        riskScore = 30;
        reason = "No inbound orders scheduled";
      }

      const inventoryLevel = Math.min(100, (total / 1000) * 100); // Assume 1000 is full stock

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
            <Package className="h-5 w-5 text-good" />
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
              {materialsAtRisk.length} material{materialsAtRisk.length === 1 ? '' : 's'} requiring attention
            </CardDescription>
          </div>
          <Badge variant="destructive">{materialsAtRisk.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Regime-aware advisory: tells the operator HOW to treat the list
            below given the current economic regime — same data, different
            action depending on whether costs are rising or falling. */}
        <div
          className="text-xs leading-relaxed text-muted-foreground border-l-2 border-primary/40 pl-3 mb-4"
          data-testid="text-materials-regime-advisory"
        >
          {advisory.headline}
        </div>

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
                  <p className="text-xs text-muted-foreground font-mono truncate">
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

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">On hand</span>
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

              <div className="flex items-center gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setLocation(advisory.primaryRoute(item.material.id))}
                  data-testid={`button-procure-${item.material.id}`}
                >
                  <TrendingDown className="h-3 w-3 mr-1" />
                  {advisory.primaryLabel}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setLocation(`/supplier-risk?materialId=${item.material.id}`)}
                  data-testid={`button-alternatives-${item.material.id}`}
                  title="See alternative suppliers for this material"
                >
                  Alternatives
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
