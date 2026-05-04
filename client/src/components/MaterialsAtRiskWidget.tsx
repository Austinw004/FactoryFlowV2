import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Package, TrendingDown, Building2 } from "lucide-react";
import { useLocation } from "wouter";
import type { Material } from "@shared/schema";

interface MaterialRisk {
  material: Material;
  riskScore: number;
  reason: string;
  recommendation: string;
  exposureUsd: number;
  inventoryLevel: number; // percentage
}

// Convert a material's price + on-hand position into an estimated exposure
// in dollars. This is what lets us rank by *business* impact rather than
// alphabetically — a $500K single-source material outranks a $2K commodity
// every time.
function estimateExposureUsd(material: Material): number {
  const unitCost = Number((material as any).unitCost ?? (material as any).standardCost ?? 0);
  const onHand = Number(material.onHand ?? 0);
  const inbound = Number(material.inbound ?? 0);
  if (!Number.isFinite(unitCost) || unitCost <= 0) return 0;
  // Exposure = the value of the position the customer is betting on this
  // material continuing to flow. We use on-hand + inbound as the working
  // dollar position.
  return Math.round(unitCost * (onHand + inbound));
}

function formatUsd(amount: number): string {
  if (!amount) return "—";
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

export function MaterialsAtRiskWidget() {
  const [, setLocation] = useLocation();
  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ['/api/materials'],
  });

  // Calculate risk for each material — every signal gets a *recommended
  // action* the customer can act on, not just a label.
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
        reason = "Zero inventory";
        recommendation = "Place emergency PO today; expedite from primary supplier.";
      } else if (total < 100) {
        riskScore = 80;
        reason = "Critically low stock";
        recommendation = "Issue PO this week; consider air freight to compress lead time.";
      } else if (total < 500) {
        riskScore = 50;
        reason = "Low inventory";
        recommendation = "Schedule replenishment; verify safety stock target is current.";
      } else if (inbound === 0 && onHand < 1000) {
        riskScore = 30;
        reason = "No inbound orders";
        recommendation = "Open replenishment PO before stock falls below reorder point.";
      }

      const inventoryLevel = Math.min(100, (total / 1000) * 100); // Assume 1000 is full stock
      const exposureUsd = estimateExposureUsd(material);

      return {
        material,
        riskScore,
        reason,
        recommendation,
        exposureUsd,
        inventoryLevel,
      };
    })
    .filter(m => m.riskScore > 0)
    // Rank by business impact (dollars) when available, falling back to
    // raw risk score. A $500K exposure beats a $2K exposure even if their
    // raw inventory percentages are similar.
    .sort((a, b) => {
      const aImpact = a.riskScore * (1 + Math.log10(Math.max(1, a.exposureUsd)));
      const bImpact = b.riskScore * (1 + Math.log10(Math.max(1, b.exposureUsd)));
      return bImpact - aImpact;
    })
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
  
  const totalExposure = materialsAtRisk.reduce((sum, m) => sum + m.exposureUsd, 0);

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
              {totalExposure > 0 && ` · ${formatUsd(totalExposure)} exposure`}
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
              <div className="flex items-start justify-between mb-2 gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.material.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {item.material.code}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
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
                  {item.exposureUsd > 0 && (
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {formatUsd(item.exposureUsd)} at risk
                    </span>
                  )}
                </div>
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

              {item.recommendation && (
                <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                  <span className="font-medium text-foreground/80">Recommended:</span>{" "}
                  {item.recommendation}
                </p>
              )}

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
                  className="text-xs"
                  onClick={() => setLocation(`/supplier-risk?materialId=${item.material.id}`)}
                  data-testid={`button-find-alt-${item.material.id}`}
                >
                  <Building2 className="h-3 w-3 mr-1" />
                  Alternatives
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
