import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lightbulb, ShoppingCart, TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from "lucide-react";

interface RegimeActionCardsProps {
  regime: string;
  fdr: number;
}

const actionRecommendations: Record<string, {
  title: string;
  description: string;
  actions: Array<{
    icon: any;
    label: string;
    description: string;
    priority: "high" | "medium" | "low";
  }>;
}> = {
  HEALTHY_EXPANSION: {
    title: "Healthy Expansion",
    description: "FDR < 1.2. Balanced growth between asset and real economy circuits.",
    actions: [
      {
        icon: CheckCircle2,
        label: "Maintain Standard Operations",
        description: "Continue regular procurement cycles and inventory management",
        priority: "high",
      },
      {
        icon: ShoppingCart,
        label: "Regular Purchasing",
        description: "Follow normal purchasing schedules for materials",
        priority: "medium",
      },
    ],
  },
  ASSET_LED_GROWTH: {
    title: "Asset-Led Growth",
    description: "FDR 1.2-1.8. Asset circuit outpacing real economy.",
    actions: [
      {
        icon: AlertCircle,
        label: "Monitor Price Trends",
        description: "Watch commodity prices closely for acceleration",
        priority: "high",
      },
      {
        icon: TrendingUp,
        label: "Lock in Contracts",
        description: "Consider locking in long-term supplier contracts before prices spike",
        priority: "high",
      },
      {
        icon: ShoppingCart,
        label: "Moderate Stocking",
        description: "Build inventory for critical materials without over-committing",
        priority: "medium",
      },
    ],
  },
  IMBALANCED_EXCESS: {
    title: "Imbalanced Excess",
    description: "FDR 1.8-2.5. Significant asset-real economy decoupling.",
    actions: [
      {
        icon: TrendingDown,
        label: "Delay Major Purchases",
        description: "Postpone large procurement orders - prices likely to fall soon",
        priority: "high",
      },
      {
        icon: AlertCircle,
        label: "Reduce Inventory Builds",
        description: "Avoid building excess inventory at peak prices",
        priority: "high",
      },
      {
        icon: CheckCircle2,
        label: "Use Existing Stock",
        description: "Draw down current inventory instead of buying at inflated prices",
        priority: "medium",
      },
    ],
  },
  REAL_ECONOMY_LEAD: {
    title: "Real Economy Lead",
    description: "FDR > 2.5. Counter-cyclical opportunity window.",
    actions: [
      {
        icon: ShoppingCart,
        label: "Aggressive Procurement",
        description: "Buy materials in bulk while prices are at cyclical lows",
        priority: "high",
      },
      {
        icon: TrendingUp,
        label: "Stock Up Strategically",
        description: "Build inventory for 6-12 months to capture value",
        priority: "high",
      },
      {
        icon: Lightbulb,
        label: "Negotiate Long-Term Deals",
        description: "Lock in favorable pricing with suppliers before recovery accelerates",
        priority: "medium",
      },
    ],
  },
};

export function RegimeActionCards({ regime, fdr }: RegimeActionCardsProps) {
  const recommendations = actionRecommendations[regime] || actionRecommendations.HEALTHY_EXPANSION;
  
  return (
    <Card data-testid="card-regime-actions">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-signal" />
              Strategic Recommendations
            </CardTitle>
            <CardDescription>{recommendations.description}</CardDescription>
          </div>
          <Badge variant="secondary">{recommendations.title}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recommendations.actions.map((action, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-md border hover-elevate ${
                action.priority === "high"
                  ? "border-primary/50 bg-primary/5"
                  : action.priority === "medium"
                  ? "border-yellow-500/30 bg-yellow-500/5"
                  : "border-border"
              }`}
              data-testid={`action-${idx}`}
            >
              <div className="flex items-start gap-3">
                <action.icon
                  className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                    action.priority === "high"
                      ? "text-primary"
                      : action.priority === "medium"
                      ? "text-yellow-600"
                      : "text-muted-foreground"
                  }`}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm">{action.label}</p>
                    <Badge
                      variant={action.priority === "high" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {action.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            <strong>Current FDR: {Number.isFinite(fdr) ? fdr.toFixed(2) : '—'}</strong> · These recommendations are automatically adjusted based on the dual-circuit economic model and real-time FDR analysis.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
