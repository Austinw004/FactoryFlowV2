import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Package, TrendingDown, Building2, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import type { Material, Supplier } from "@shared/schema";

interface MaterialRisk {
  material: Material;
  riskScore: number;
  reason: string;
  inventoryLevel: number; // percentage
  supplierName?: string;
  supplierId?: string;
}

const regimeAdvice: Record<string, string> = {
  HEALTHY_EXPANSION:
    "Stable pricing — replenish at standard pace and lock supplier terms.",
  ASSET_LED_GROWTH:
    "Costs rising — accelerate this PO before the next pricing cycle.",
  IMBALANCED_EXCESS:
    "Prices at peak — defer if non-critical; otherwise buy minimum needed.",
  REAL_ECONOMY_LEAD:
    "Favorable window — bulk-buy and renegotiate supplier terms.",
};

export function MaterialsAtRiskWidget() {
  const [, setLocation] = useLocation();
  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ['/api/materials'],
  });
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
  });
  const { data: regime } = useQuery<{ regime?: string }>({
    queryKey: ['/api/economics/regime'],
  });

  const supplierByCategory = new Map<string, Supplier>();
  suppliers.forEach((s) => {
    (s.materialCategories || []).forEach((cat) => {
      if (!supplierByCategory.has(cat.toLowerCase())) {
        supplierByCategory.set(cat.toLowerCase(), s);
      }
    });
  });

  const findSupplierFor = (m: Material): Supplier | undefined => {
    const name = m.name.toLowerCase();
    for (const [cat, supplier] of Array.from(supplierByCategory.entries())) {
      if (name.includes(cat) || cat.includes(name)) return supplier;
    }
    return suppliers[0];
  };

  // Calculate risk for each material
  const materialsAtRisk: MaterialRisk[] = materials
    .map((material) => {
      const onHand = material.onHand || 0;
      const inbound = material.inbound || 0;
      const total = onHand + inbound;

      let riskScore = 0;
      let reason = "";

      if (total === 0) {
        riskScore = 100;
        reason = "Zero inventory";
      } else if (total < 100) {
        riskScore = 80;
        reason = "Critically low stock";
      } else if (total < 500) {
        riskScore = 50;
        reason = "Low inventory";
      } else if (inbound === 0 && onHand < 1000) {
        riskScore = 30;
        reason = "No inbound orders";
      }

      const inventoryLevel = Math.min(100, (total / 1000) * 100);
      const supplier = findSupplierFor(material);

      return {
        material,
        riskScore,
        reason,
        inventoryLevel,
        supplierName: supplier?.name,
        supplierId: supplier?.id,
      };
    })
    .filter((m) => m.riskScore > 0)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 5);

  const regimeKey = regime?.regime || "HEALTHY_EXPANSION";
  const advice = regimeAdvice[regimeKey] || regimeAdvice.HEALTHY_EXPANSION;
  
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
              Ranked by stock-out severity · {advice}
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
                  className="text-xs ml-2 flex-shrink-0"
                >
                  {item.reason}
                </Badge>
              </div>

              {item.supplierName && (
                <button
                  type="button"
                  onClick={() => setLocation(`/suppliers`)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
                  data-testid={`link-supplier-${item.material.id}`}
                >
                  <Building2 className="h-3 w-3" />
                  Supplied by {item.supplierName}
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Days of supply</span>
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
                  onClick={() => setLocation(`/rfq-generation?materialId=${item.material.id}`)}
                  data-testid={`button-procure-${item.material.id}`}
                >
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Schedule Procurement
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
