import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Package, ArrowRight, Building2 } from "lucide-react";
import { useLocation } from "wouter";
import type { Material } from "@shared/schema";
import { formatCurrencyCompact } from "@/lib/utils";
import { getRegimeGuidance } from "@/lib/regimeGuidance";

interface MaterialRisk {
  material: Material;
  riskScore: number;
  reason: string;
  inventoryLevel: number; // percentage
  /** Estimated dollar exposure: lowest known unit cost × short quantity */
  exposureUsd: number | null;
  /** Best-known supplier for this material (lowest unitCost row) */
  supplier: { id: string; name: string } | null;
  /** Number of distinct suppliers we have on file (single-source = 1) */
  supplierCount: number;
}

interface SupplierMaterialLink {
  id: string;
  supplierId: string;
  materialId: string;
  unitCost: number;
  leadTimeDays: number;
  supplierName: string | null;
  materialCode: string | null;
  materialName: string | null;
  materialUnit: string | null;
}

const TARGET_COVER_UNITS = 1000; // policy minimum used by the existing widget

export function MaterialsAtRiskWidget() {
  const [, setLocation] = useLocation();
  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ['/api/materials'],
  });
  const { data: links = [] } = useQuery<SupplierMaterialLink[]>({
    queryKey: ['/api/supplier-materials'],
  });
  const { data: regime } = useQuery<{ regime: string; fdr: number }>({
    queryKey: ['/api/economics/regime'],
  });

  const guidance = getRegimeGuidance(regime?.regime);

  // Build supplier-by-material lookup once. For each material we keep:
  //   - the cheapest supplier (used as "primary")
  //   - the count of suppliers on file (single-source = 1)
  //   - the cheapest unit cost (used to estimate $ exposure)
  const supplierIndex = new Map<
    string,
    { primary: SupplierMaterialLink; count: number }
  >();
  for (const link of links) {
    const existing = supplierIndex.get(link.materialId);
    if (!existing) {
      supplierIndex.set(link.materialId, { primary: link, count: 1 });
    } else {
      const newCount = existing.count + 1;
      const newPrimary = link.unitCost < existing.primary.unitCost ? link : existing.primary;
      supplierIndex.set(link.materialId, { primary: newPrimary, count: newCount });
    }
  }

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
      } else if (inbound === 0 && onHand < TARGET_COVER_UNITS) {
        riskScore = 30;
        reason = "No inbound orders";
      }

      const inventoryLevel = Math.min(100, (total / TARGET_COVER_UNITS) * 100);
      const supplierEntry = supplierIndex.get(material.id);
      const unitCost = supplierEntry?.primary.unitCost ?? null;
      const shortUnits = Math.max(0, TARGET_COVER_UNITS - total);
      const exposureUsd = unitCost != null ? unitCost * shortUnits : null;
      const supplier = supplierEntry
        ? { id: supplierEntry.primary.supplierId, name: supplierEntry.primary.supplierName ?? "Unnamed supplier" }
        : null;
      const supplierCount = supplierEntry?.count ?? 0;

      // Single-source amplifies risk: a critical material from one supplier
      // is materially worse than the same material from three. Bump the
      // risk score so the ranking puts single-source items on top.
      const adjustedRisk = riskScore + (supplierCount === 1 && riskScore > 0 ? 10 : 0);

      return {
        material,
        riskScore: adjustedRisk,
        reason,
        inventoryLevel,
        exposureUsd,
        supplier,
        supplierCount,
      };
    })
    .filter((m) => m.riskScore > 0)
    // Rank by dollar exposure first, then by raw risk score. Customers
    // told us the #1 question is "how much money is at stake" — sorting
    // by it surfaces the biggest hits, not the loudest ones.
    .sort((a, b) => {
      const aDollar = a.exposureUsd ?? 0;
      const bDollar = b.exposureUsd ?? 0;
      if (aDollar !== bDollar) return bDollar - aDollar;
      return b.riskScore - a.riskScore;
    })
    .slice(0, 5);

  const totalExposure = materialsAtRisk.reduce((sum, m) => sum + (m.exposureUsd ?? 0), 0);

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
              {totalExposure > 0
                ? `${formatCurrencyCompact(totalExposure)} estimated exposure across ${materialsAtRisk.length} material${materialsAtRisk.length === 1 ? '' : 's'}`
                : `${materialsAtRisk.length} material${materialsAtRisk.length === 1 ? '' : 's'} requiring attention`}
            </CardDescription>
          </div>
          <Badge variant="destructive">{materialsAtRisk.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {materialsAtRisk.map((item) => {
            const isSingleSource = item.supplierCount === 1;
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
                  <div className="flex flex-col items-end gap-1 shrink-0">
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
                    {item.exposureUsd != null && item.exposureUsd > 0 && (
                      <span className="text-xs font-mono font-semibold text-bone tabular-nums">
                        {formatCurrencyCompact(item.exposureUsd)} at risk
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Inventory level</span>
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

                {item.supplier && (
                  <button
                    type="button"
                    onClick={() => setLocation(`/multi-tier-mapping?supplierId=${item.supplier!.id}`)}
                    className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition w-full text-left"
                    data-testid={`link-supplier-${item.supplier.id}`}
                  >
                    <Building2 className="h-3 w-3" />
                    <span>
                      Supplied by <span className="text-foreground font-medium">{item.supplier.name}</span>
                    </span>
                    {isSingleSource && (
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 ml-1 border-destructive/40 text-destructive">
                        Single source
                      </Badge>
                    )}
                    <ArrowRight className="h-3 w-3 ml-auto" />
                  </button>
                )}

                {/* Prescriptive action — pulled from regime guidance so the
                    same material gets a different recommendation depending
                    on whether the FDR regime is heating up, cooling down,
                    or volatile. Single-source materials get an explicit
                    "qualify backup" prompt that overrides the generic. */}
                <div className="mt-3 pt-3 border-t text-xs text-muted-foreground leading-relaxed">
                  <span className="font-medium uppercase tracking-wider text-[10px] text-foreground">
                    Recommended ·{" "}
                  </span>
                  {isSingleSource
                    ? "Qualify a backup supplier before stockout — single-source dependency amplifies disruption risk."
                    : guidance.inventoryDirective}
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setLocation(`/rfq-generation?materialId=${item.material.id}`)}
                    data-testid={`button-procure-${item.material.id}`}
                  >
                    Generate RFQ
                  </Button>
                  {isSingleSource && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => setLocation(`/multi-tier-mapping?materialId=${item.material.id}`)}
                      data-testid={`button-find-alts-${item.material.id}`}
                    >
                      Find alternatives
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
