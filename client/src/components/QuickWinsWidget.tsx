import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { TrendingDown, Clock, ArrowRight, Zap, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

interface QuickWin {
  id: string;
  type: "timing" | "negotiation" | "consolidation" | "stockout_risk";
  title: string;
  description: string;
  urgency: "high" | "medium" | "low";
  actionLabel: string;
}

export function QuickWinsWidget() {
  const [, setLocation] = useLocation();
  const { data: regime } = useQuery<{ regime: string; fdr: number; signals?: any; intelligence?: any }>({
    queryKey: ["/api/economics/regime"],
  });

  const { data: materials = [] } = useQuery<any[]>({
    queryKey: ["/api/materials"],
  });

  const { data: allocations = [] } = useQuery<any[]>({
    queryKey: ["/api/allocations"],
  });

  const handleQuickWinClick = (win: QuickWin) => {
    switch (win.type) {
      case "timing":
        setLocation("/rfq-generation");
        break;
      case "stockout_risk":
        setLocation("/inventory");
        break;
      case "consolidation":
        setLocation("/multi-tier-mapping");
        break;
      case "negotiation":
        setLocation("/multi-tier-mapping");
        break;
      default:
        setLocation("/procurement");
    }
  };

  const generateQuickWins = (): QuickWin[] => {
    const wins: QuickWin[] = [];
    const currentRegime = regime?.regime || "HEALTHY_EXPANSION";
    const fdr = regime?.fdr || 1.0;

    if (currentRegime === "REAL_ECONOMY_LEAD" || fdr < 0.8) {
      wins.push({
        id: "timing-1",
        type: "timing",
        title: "Buyer's market — accelerate planned purchases now",
        description: `Real economy outpacing financial markets (FDR ${fdr.toFixed(2)}). Suppliers are under pressure and open to better terms. Every week of delay surrenders negotiating leverage as conditions improve.`,
        urgency: "high",
        actionLabel: "Open procurement queue",
      });
    }

    if (currentRegime === "ASSET_LED_GROWTH" && fdr >= 1.2) {
      wins.push({
        id: "timing-alg",
        type: "timing",
        title: "Lock in contracts before input costs rise",
        description: `Asset-Led Growth detected (FDR ${fdr.toFixed(2)}). This regime historically precedes 8–12% material cost increases. Pre-purchasing now protects your cost structure for the next 1–2 quarters.`,
        urgency: "high",
        actionLabel: "Lock in supplier contracts",
      });
    }

    if (currentRegime === "IMBALANCED_EXCESS" || fdr > 1.5) {
      wins.push({
        id: "timing-2",
        type: "timing",
        title: "Pause discretionary spend — market correction likely",
        description: `FDR at ${fdr.toFixed(2)} signals an unsustainable gap between financial markets and real output. Defer non-critical purchase orders and renegotiate expiring contracts before a correction forces supplier price reductions.`,
        urgency: "medium",
        actionLabel: "Review pending purchase orders",
      });
    }

    const lowStockMaterials = materials.filter((m: any) => m.onHand < 50);
    if (lowStockMaterials.length > 0) {
      wins.push({
        id: "stockout-1",
        type: "stockout_risk",
        title: `${lowStockMaterials.length} material${lowStockMaterials.length !== 1 ? 's' : ''} below reorder point`,
        description: `${lowStockMaterials.length > 1 ? 'These materials are' : 'This material is'} at risk of stockout before the next scheduled delivery. At current consumption rates, a production line stop is possible without immediate action.`,
        urgency: "high",
        actionLabel: "View at-risk materials",
      });
    }

    if (materials.length > 10) {
      wins.push({
        id: "consolidation-1",
        type: "consolidation",
        title: "Supplier consolidation opportunity",
        description: `${materials.length} materials across your supplier network. Consolidating orders with top suppliers typically reduces unit cost 3–7% and shortens average lead time through volume commitment.`,
        urgency: "low",
        actionLabel: "Analyze supplier network",
      });
    }

    if (allocations.length > 0) {
      const latestAllocation = allocations[0];
      if (latestAllocation?.budget && latestAllocation.budget > 50000) {
        wins.push({
          id: "negotiation-1",
          type: "negotiation",
          title: "Renegotiation window — volume leverage available",
          description: `Current allocation budget qualifies for preferred pricing tiers with most suppliers. Renegotiating now locks in volume discounts before the next contract renewal cycle.`,
          urgency: "medium",
          actionLabel: "Review supplier terms",
        });
      }
    }

    return wins.slice(0, 3);
  };

  const quickWins = generateQuickWins();

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high": return "bg-red-500/10 text-red-600 border-red-500/20";
      case "medium": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      default: return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "timing": return Clock;
      case "negotiation": return TrendingDown;
      case "stockout_risk": return AlertTriangle;
      default: return Zap;
    }
  };

  if (!regime) {
    return (
      <Card data-testid="card-quick-wins">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (quickWins.length === 0) {
    return (
      <Card data-testid="card-quick-wins">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Quick Wins
          </CardTitle>
          <CardDescription>Top savings opportunities based on current conditions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No immediate opportunities detected. Check back as market conditions change.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-quick-wins">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Quick Wins
            </CardTitle>
            <CardDescription>Opportunities based on current conditions</CardDescription>
          </div>
          <Badge variant="secondary">
            {quickWins.length} active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {quickWins.map((win) => {
          const Icon = getTypeIcon(win.type);
          return (
            <div
              key={win.id}
              className="p-3 rounded-lg border hover-elevate cursor-pointer transition-colors"
              onClick={() => handleQuickWinClick(win)}
              data-testid={`quick-win-${win.id}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">{win.title}</span>
                    <Badge variant="outline" className={`text-xs ${getUrgencyColor(win.urgency)}`}>
                      {win.urgency}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{win.description}</p>
                  <div className="flex items-center justify-end mt-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-xs gap-1 px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickWinClick(win);
                      }}
                    >
                      {win.actionLabel}
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
