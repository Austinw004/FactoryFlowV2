import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingDown, Clock, ArrowRight, Zap, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface QuickWin {
  id: string;
  type: "timing" | "negotiation" | "consolidation" | "stockout_risk";
  title: string;
  description: string;
  estimatedSavings: number;
  urgency: "high" | "medium" | "low";
  actionLabel: string;
}

export function QuickWinsWidget() {
  const { data: regime } = useQuery<{ regime: string; fdr: number; signals?: any; intelligence?: any }>({
    queryKey: ["/api/economics/regime"],
  });

  const { data: materials = [] } = useQuery<any[]>({
    queryKey: ["/api/materials"],
  });

  const { data: allocations = [] } = useQuery<any[]>({
    queryKey: ["/api/allocations"],
  });

  const generateQuickWins = (): QuickWin[] => {
    const wins: QuickWin[] = [];
    const currentRegime = regime?.regime || "HEALTHY_EXPANSION";
    const fdr = regime?.fdr || 1.0;

    if (currentRegime === "REAL_ECONOMY_LEAD" || fdr < 0.8) {
      wins.push({
        id: "timing-1",
        type: "timing",
        title: "Lock in favorable pricing",
        description: "Current market conditions favor buyers. Consider accelerating planned purchases.",
        estimatedSavings: 15000,
        urgency: "high",
        actionLabel: "Review procurement queue",
      });
    }

    if (currentRegime === "IMBALANCED_EXCESS" || fdr > 1.5) {
      wins.push({
        id: "timing-2",
        type: "timing",
        title: "Defer non-critical purchases",
        description: "Market prices are elevated. Consider delaying discretionary orders.",
        estimatedSavings: 12000,
        urgency: "medium",
        actionLabel: "Review pending orders",
      });
    }

    const lowStockMaterials = materials.filter((m: any) => m.onHand < 50);
    if (lowStockMaterials.length > 0) {
      wins.push({
        id: "stockout-1",
        type: "stockout_risk",
        title: `${lowStockMaterials.length} materials at low stock`,
        description: "Proactive reordering can prevent production delays and rush shipping costs.",
        estimatedSavings: lowStockMaterials.length * 500,
        urgency: "high",
        actionLabel: "View at-risk materials",
      });
    }

    if (materials.length > 10) {
      wins.push({
        id: "consolidation-1",
        type: "consolidation",
        title: "Consolidate supplier orders",
        description: "Combining orders to fewer suppliers can unlock volume discounts.",
        estimatedSavings: 8000,
        urgency: "low",
        actionLabel: "Analyze suppliers",
      });
    }

    if (allocations.length > 0) {
      const latestAllocation = allocations[0];
      if (latestAllocation?.budget && latestAllocation.budget > 50000) {
        wins.push({
          id: "negotiation-1",
          type: "negotiation",
          title: "Renegotiate top contracts",
          description: "Your volume justifies better terms. Target top 3 suppliers for renegotiation.",
          estimatedSavings: Math.round(latestAllocation.budget * 0.05),
          urgency: "medium",
          actionLabel: "View supplier terms",
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

  const totalSavings = quickWins.reduce((sum, win) => sum + win.estimatedSavings, 0);

  return (
    <Card data-testid="card-quick-wins">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Quick Wins
            </CardTitle>
            <CardDescription>Top savings opportunities</CardDescription>
          </div>
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <DollarSign className="h-3 w-3 mr-1" />
            ${totalSavings.toLocaleString()} estimated
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
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-medium text-green-600">
                      ~${win.estimatedSavings.toLocaleString()} savings
                    </span>
                    <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 px-2">
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
