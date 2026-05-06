import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Package, TrendingDown, Search } from "lucide-react";
import { useLocation } from "wouter";
import type { Material } from "@shared/schema";
import { getRegimeGuidance } from "@/lib/regimeGuidance";

interface MaterialRisk {
  material: Material;
  riskScore: number;
  reason: string;          // The label on the badge — short
  why: string;             // The mechanism — one line
  recommendation: string;  // Regime-aware procurement action
  inventoryLevel: number;  // percentage
}

export function MaterialsAtRiskWidget() {
  const [, setLocation] = useLocation();
  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ['/api/materials'],
  });
  const { data: regime } = useQuery<{ regime?: string }>({
    queryKey: ['/api/economics/regime'],
  });
  const guidance = getRegimeGuidance(regime?.regime);
  
  // Calculate risk for each material
  const materialsAtRisk: MaterialRisk[] = materials
    .map(material => {
      const onHand = material.onHand || 0;
      const inbound = material.inbound || 0;
      const total = onHand + inbound;
      
      // Simple risk calculation (in production, would factor in demand, lead time, etc.)
      let riskScore = 0;
      let reason = "";
      let why = "";
      let recommendation = "";

      if (total === 0) {
        riskScore = 100;
        reason = "Stockout";
        why = "Zero on-hand and zero inbound. Production lines that consume this material will halt at next run.";
        recommendation = guidance.posture === 'tense'
          ? "Issue an emergency PO from your fastest-lead-time supplier. Defer non-critical buys to free working capital."
          : "Issue an emergency PO and qualify a backup supplier immediately.";
      } else if (total < 100) {
        riskScore = 80;
        reason = "Critically low stock";
        why = `Only ${total.toFixed(0)} ${material.unit} between on-hand and inbound. Below typical 1-week buffer.`;
        recommendation = guidance.posture === 'heating'
          ? "Lock in an immediate PO at current pricing — input costs are rising 8–12% this quarter."
          : "Place a replenishment PO this week and review safety stock targets.";
      } else if (total < 500) {
        riskScore = 50;
        reason = "Low inventory";
        why = "Below typical safety stock. Lead time variability could produce a stockout.";
        recommendation = guidance.posture === 'heating'
          ? "Pre-purchase an additional 60–90 days of cover before the next pricing cycle."
          : "Schedule replenishment within the standard reorder window.";
      } else if (inbound === 0 && onHand < 1000) {
        riskScore = 30;
        reason = "No inbound orders";
        why = "Inventory is adequate today, but no replenishment is in flight. Demand spike or supplier delay leaves no buffer.";
        recommendation = guidance.posture === 'opportunity'
          ? "Run an RFQ now — the buyer's market means you can lock in better terms before placing the next PO."
          : "Open a PO to maintain pipeline coverage.";
      }

      const inventoryLevel = Math.min(100, (total / 1000) * 100); // Assume 1000 is full stock

      return {
        material,
        riskScore,
        reason,
        why,
        recommendation,
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
              {materialsAtRisk.length} material{materialsAtRisk.length === 1 ? '' : 's'} requiring attention · ranked by stockout severity
            </CardDescription>
          </div>
          <Badge variant="destructive">{materialsAtRisk.length}</Badge>
        </div>
        {regime?.regime && guidance.posture !== 'analyzing' && (
          <p className="text-xs text-muted-foreground mt-2 italic" data-testid="text-regime-inventory-guidance">
            {guidance.label} regime · {guidance.inventoryGuidance}
          </p>
        )}
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

              {item.why && (
                <p className="text-xs text-muted-foreground mt-3 leading-snug" data-testid={`text-why-${item.material.id}`}>
                  <span className="font-medium text-foreground/80">Why: </span>
                  {item.why}
                </p>
              )}

              {item.recommendation && (
                <div className="mt-2 p-2 rounded-sm bg-muted/40 border-l-2 border-primary/50" data-testid={`text-recommendation-${item.material.id}`}>
                  <p className="text-xs leading-snug">
                    <span className="font-medium uppercase tracking-wider text-[10px] text-primary mr-1.5">Recommended</span>
                    {item.recommendation}
                  </p>
                </div>
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
                  data-testid={`button-find-alternatives-${item.material.id}`}
                >
                  <Search className="h-3 w-3 mr-1" />
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
