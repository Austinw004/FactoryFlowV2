import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity } from "lucide-react";

type Regime = "HEALTHY_EXPANSION" | "ASSET_LED_GROWTH" | "IMBALANCED_EXCESS" | "REAL_ECONOMY_LEAD";

interface RegimeStatusProps {
  regime: Regime;
  fdr: number;
  intensity: number;
}

const regimeConfig = {
  HEALTHY_EXPANSION: {
    label: "Healthy Expansion",
    description: "Balanced growth across real economy and asset markets",
    color: "bg-chart-2",
    variant: "default" as const,
  },
  ASSET_LED_GROWTH: {
    label: "Asset-Led Growth",
    description: "Asset markets growing faster than real economy",
    color: "bg-chart-4",
    variant: "secondary" as const,
  },
  IMBALANCED_EXCESS: {
    label: "Imbalanced Excess",
    description: "Bubble risk - asset markets significantly decoupled",
    color: "bg-destructive",
    variant: "destructive" as const,
  },
  REAL_ECONOMY_LEAD: {
    label: "Real Economy Lead",
    description: "Counter-cyclical opportunity - real economy stronger",
    color: "bg-chart-1",
    variant: "default" as const,
  },
};

export function RegimeStatus({ regime, fdr, intensity }: RegimeStatusProps) {
  const config = regimeConfig[regime];
  
  return (
    <Card className="p-6" data-testid="card-regime-status">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-lg">Economic Regime</h3>
          </div>
          <Badge variant={config.variant} data-testid="badge-regime-type">
            {config.label}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">FDR Score</span>
            <span className="font-mono font-semibold" data-testid="text-fdr-score">{fdr.toFixed(2)}</span>
          </div>
          <Progress value={intensity} className="h-2" data-testid="progress-intensity" />
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </div>
      </div>
    </Card>
  );
}
