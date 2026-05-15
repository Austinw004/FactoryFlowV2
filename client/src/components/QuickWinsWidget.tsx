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
  rationale: string;        // The "why this recommendation" — connects the dot to data
  urgency: "high" | "medium" | "low";
  actionLabel: string;
}

const regimeFriendly: Record<string, string> = {
  HEALTHY_EXPANSION: "Healthy Expansion",
  ASSET_LED_GROWTH: "Asset-Led Growth",
  IMBALANCED_EXCESS: "Imbalanced Excess",
  REAL_ECONOMY_LEAD: "Real Economy Lead",
};

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
    const regimeName = regimeFriendly[currentRegime] || currentRegime;

    if (currentRegime === "ASSET_LED_GROWTH" || (fdr >= 1.2 && fdr < 1.8)) {
      wins.push({
        id: "timing-asset-led",
        type: "timing",
        title: "Lock in pricing before next cycle",
        description: "Asset markets are running ahead of real production. Convert exposed contracts to fixed pricing on critical inputs.",
        rationale: `${regimeName} regime (FDR ${fdr.toFixed(2)}) historically precedes 8–12% input cost increases over one quarter.`,
        urgency: "high",
        actionLabel: "Start contract negotiations",
      });
    }

    if (currentRegime === "REAL_ECONOMY_LEAD" || fdr < 0.8) {
      wins.push({
        id: "timing-real-lead",
        type: "timing",
        title: "Favorable buying window is open",
        description: "Renegotiate expiring agreements and extend coverage on strategic inputs while leverage favors buyers.",
        rationale: `${regimeName} regime (FDR ${fdr.toFixed(2)}) — suppliers are competing on terms, lead times are stable.`,
        urgency: "high",
        actionLabel: "Review expiring contracts",
      });
    }

    if (currentRegime === "IMBALANCED_EXCESS" || fdr >= 1.8) {
      wins.push({
        id: "timing-excess",
        type: "timing",
        title: "Defer non-critical purchases",
        description: "Push discretionary spend out 30–60 days. Preserve cash and optionality for the correction.",
        rationale: `${regimeName} regime (FDR ${fdr.toFixed(2)}) — corrections from this regime typically include supplier distress and short-notice price resets.`,
        urgency: "medium",
        actionLabel: "Review pending POs",
      });
    }

    const lowStockMaterials = materials.filter((m: any) => (m.onHand || 0) + (m.inbound || 0) < 100);
    if (lowStockMaterials.length > 0) {
      const top = lowStockMaterials.slice(0, 3).map((m: any) => m.name).filter(Boolean);
      const previewNames = top.length ? ` (${top.join(", ")}${lowStockMaterials.length > top.length ? "…" : ""})` : "";
      wins.push({
        id: "stockout-1",
        type: "stockout_risk",
        title: `${lowStockMaterials.length} material${lowStockMaterials.length === 1 ? "" : "s"} below safe coverage`,
        description: `Coverage is thin on ${lowStockMaterials.length} input${lowStockMaterials.length === 1 ? "" : "s"}${previewNames}. Expedite or place urgent POs to restore safety stock.`,
        rationale: "Each of these inputs has under 100 units of total on-hand + inbound — below typical operating buffer.",
        urgency: "high",
        actionLabel: "View at-risk materials",
      });
    }

    if (materials.length > 10) {
      wins.push({
        id: "consolidation-1",
        type: "consolidation",
        title: "Map multi-tier supplier dependencies",
        description: "With this many materials in play, consolidation typically yields 3–7% spend savings and reduces tier-2 hidden risk.",
        rationale: `Tracking ${materials.length} materials — multi-tier mapping reveals which suppliers share Tier-2 dependencies and where consolidation creates leverage.`,
        urgency: "low",
        actionLabel: "Open multi-tier mapping",
      });
    }

    if (allocations.length > 0) {
      const latestAllocation = allocations[0];
      const budget = latestAllocation?.budget;
      if (budget && budget > 50000) {
        wins.push({
          id: "negotiation-1",
          type: "negotiation",
          title: "Use allocation scale as negotiation leverage",
          description: "Volume on this allocation supports renegotiation with key suppliers. Press for term extensions or volume rebates.",
          rationale: `Latest allocation budget of $${(budget / 1000).toFixed(0)}K is above the typical threshold (~$50K) where suppliers will entertain volume terms.`,
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
                  <p className="text-xs text-muted-foreground">{win.description}</p>
                  {win.rationale && (
                    <p className="text-[11px] text-muted-foreground/80 mt-1.5 italic leading-relaxed">
                      <span className="font-medium not-italic text-foreground/80">Why: </span>
                      {win.rationale}
                    </p>
                  )}
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
