import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Package, TrendingDown, Building2, GitCompare } from "lucide-react";
import { useLocation } from "wouter";
import type { Material, Supplier, SupplierMaterial } from "@shared/schema";

interface MaterialRisk {
  material: Material;
  riskScore: number;
  reason: string;
  inventoryLevel: number; // percentage
  primarySupplier: Supplier | null;
  alternativeCount: number; // # of other qualified suppliers for the same material
  dollarExposure: number;   // onHand * unitCost, in $ — sorts the list by impact, not just risk
}

export function MaterialsAtRiskWidget() {
  const [, setLocation] = useLocation();
  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ['/api/materials'],
  });
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
  });
  const { data: supplierMaterials = [] } = useQuery<SupplierMaterial[]>({
    queryKey: ['/api/supplier-materials'],
  });

  // Group supplier-materials by materialId so we can answer "who supplies
  // this material, and is there a backup?" in O(1) per row. Pick the
  // primary supplier as the one with the shortest lead time (proxy for
  // preferred / on-contract) — if leadTime ties, fall back to lowest cost.
  const supplierLookup = new Map<string, Supplier>();
  for (const s of suppliers) supplierLookup.set(s.id, s);

  const supplierMaterialsByMaterialId = new Map<string, SupplierMaterial[]>();
  for (const sm of supplierMaterials) {
    const list = supplierMaterialsByMaterialId.get(sm.materialId) || [];
    list.push(sm);
    supplierMaterialsByMaterialId.set(sm.materialId, list);
  }
  
  // Calculate risk for each material
  const materialsAtRisk: MaterialRisk[] = materials
    .map(material => {
      const onHand = material.onHand || 0;
      const inbound = material.inbound || 0;
      const total = onHand + inbound;

      // Simple risk calculation (in production, would factor in demand, lead time, etc.)
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

      const inventoryLevel = Math.min(100, (total / 1000) * 100); // Assume 1000 is full stock

      const sms = supplierMaterialsByMaterialId.get(material.id) || [];
      // Primary = shortest lead time, ties broken by lowest unit cost.
      const sortedSms = [...sms].sort((a, b) => {
        const leadDiff = (a.leadTimeDays ?? 9999) - (b.leadTimeDays ?? 9999);
        if (leadDiff !== 0) return leadDiff;
        return (a.unitCost ?? Infinity) - (b.unitCost ?? Infinity);
      });
      const primarySm = sortedSms[0];
      const primarySupplier = primarySm ? supplierLookup.get(primarySm.supplierId) || null : null;
      const alternativeCount = Math.max(0, sms.length - 1);
      const dollarExposure = primarySm ? onHand * (primarySm.unitCost ?? 0) : 0;

      // Single-source dependency bumps risk — a material with only one
      // qualified supplier is fundamentally more exposed than the same
      // inventory position with three alternatives.
      let adjustedRisk = riskScore;
      if (sms.length === 1 && riskScore > 0) adjustedRisk = Math.min(100, riskScore + 15);
      if (sms.length === 0 && riskScore > 0) adjustedRisk = Math.min(100, riskScore + 25);

      return {
        material,
        riskScore: adjustedRisk,
        reason,
        inventoryLevel,
        primarySupplier,
        alternativeCount,
        dollarExposure,
      };
    })
    .filter(m => m.riskScore > 0)
    // Rank by dollar exposure first, then risk score. A $500K single-source
    // exposure outranks a $2K commodity at the same risk level — see
    // Principle 5 (prioritize by business impact, not type).
    .sort((a, b) => {
      const dollarDiff = b.dollarExposure - a.dollarExposure;
      if (Math.abs(dollarDiff) > 1000) return dollarDiff;
      return b.riskScore - a.riskScore;
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
          {materialsAtRisk.map((item) => {
            const isSingleSource = item.alternativeCount === 0 && item.primarySupplier !== null;
            const isUnsourced = item.primarySupplier === null;
            return (
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
                  className="text-xs ml-2"
                >
                  {item.reason}
                </Badge>
              </div>

              {/* Supplier + sourcing context — the "who supplies this and
                  do we have a backup?" answer the customer needs to
                  decide between Procure-Now vs Find-Alternatives. */}
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1 flex-wrap">
                <Building2 className="h-3 w-3 shrink-0" />
                {item.primarySupplier ? (
                  <>
                    <span>From <span className="text-foreground font-medium">{item.primarySupplier.name}</span></span>
                    {isSingleSource && (
                      <span className="text-bad font-medium">· single source</span>
                    )}
                    {item.alternativeCount > 0 && (
                      <span>· {item.alternativeCount} alternative{item.alternativeCount === 1 ? '' : 's'} qualified</span>
                    )}
                  </>
                ) : (
                  <span className="text-bad font-medium">No qualified supplier on file</span>
                )}
                {item.dollarExposure > 0 && (
                  <span className="ml-auto font-mono text-foreground">
                    ${item.dollarExposure >= 1000 ? `${Math.round(item.dollarExposure / 1000)}K` : Math.round(item.dollarExposure).toLocaleString()} on hand
                  </span>
                )}
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

              {/* Recommended action — single-source materials get
                  "Find Alternatives" as the primary CTA because adding
                  a backup supplier is the durable fix; reorder-now just
                  papers over the dependency. */}
              <div className="flex items-center gap-2 mt-3">
                {(isSingleSource || isUnsourced) ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => setLocation(`/multi-tier-supplier-mapping?materialId=${item.material.id}`)}
                      data-testid={`button-find-alternatives-${item.material.id}`}
                    >
                      <GitCompare className="h-3 w-3 mr-1" />
                      {isUnsourced ? 'Qualify Supplier' : 'Find Alternatives'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => setLocation(`/rfq-generation?materialId=${item.material.id}`)}
                      data-testid={`button-procure-${item.material.id}`}
                    >
                      Reorder
                    </Button>
                  </>
                ) : (
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
                )}
              </div>
            </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
