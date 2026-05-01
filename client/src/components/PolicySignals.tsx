import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Target,
  Package,
  Activity,
  Maximize2
} from "lucide-react";

interface Signal {
  type: string;      // "procurement", "inventory", "production"
  action: string;    // "COUNTER_CYCLICAL_BUY", "REDUCE_INVENTORY", etc.
  description: string;
}

interface PolicySignalsProps {
  signals: Signal[];
}

const regimeRationale: Record<string, string> = {
  HEALTHY_EXPANSION:
    "FDR is in equilibrium — input costs are stable and supplier capacity is not constrained.",
  ASSET_LED_GROWTH:
    "Asset markets are outpacing real output (FDR rising) — this regime historically precedes 8–12% input cost increases.",
  IMBALANCED_EXCESS:
    "Significant decoupling between asset markets and the real economy — expect commodity volatility and supplier credit stress.",
  REAL_ECONOMY_LEAD:
    "Real economy is leading; asset markets correcting — suppliers are more willing to concede on price and terms.",
  UNKNOWN: "Regime is being analyzed — guidance will sharpen as data flows in.",
};

// Type-aware signal configuration using composite keys: type:action
const signalConfig: Record<string, { label: string; icon: any; color: string }> = {
  // Procurement actions
  "procurement:normal": {
    label: "Standard Procurement",
    icon: Target,
    color: "text-blue-600",
  },
  "procurement:strategic_buy": {
    label: "Strategic Purchasing",
    icon: TrendingUp,
    color: "text-green-600",
  },
  "procurement:reduce": {
    label: "Reduce Procurement",
    icon: TrendingDown,
    color: "text-yellow-600",
  },
  "procurement:aggressive_buy": {
    label: "Aggressive Buying",
    icon: DollarSign,
    color: "text-green-700",
  },
  
  // Inventory actions
  "inventory:maintain": {
    label: "Maintain Inventory",
    icon: Package,
    color: "text-blue-600",
  },
  "inventory:build": {
    label: "Build Inventory",
    icon: TrendingUp,
    color: "text-green-600",
  },
  "inventory:drawdown": {
    label: "Draw Down Stock",
    icon: TrendingDown,
    color: "text-yellow-600",
  },
  "inventory:maximize": {
    label: "Maximize Inventory",
    icon: Maximize2,
    color: "text-green-700",
  },
  
  // Production actions
  "production:normal": {
    label: "Maintain Production",
    icon: Activity,
    color: "text-blue-600",
  },
  "production:increase": {
    label: "Increase Production",
    icon: TrendingUp,
    color: "text-green-600",
  },
  "production:decrease": {
    label: "Scale Back Production",
    icon: TrendingDown,
    color: "text-yellow-600",
  },
  "production:maximize": {
    label: "Maximize Production",
    icon: Maximize2,
    color: "text-green-700",
  },
};

export function PolicySignals({ signals }: PolicySignalsProps) {
  const { data: regimeData } = useQuery<{ regime?: string; fdr?: number }>({
    queryKey: ["/api/economics/regime"],
  });
  const regimeKey = regimeData?.regime || "UNKNOWN";
  const fdr = Number.isFinite(Number(regimeData?.fdr)) ? Number(regimeData?.fdr) : null;
  const whyNow = regimeRationale[regimeKey] || regimeRationale.UNKNOWN;

  // Guard against invalid data
  if (!Array.isArray(signals) || signals.length === 0) {
    return (
      <Card className="p-6" data-testid="card-policy-signals">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Recommended Actions</h3>
            <Badge variant="secondary" data-testid="badge-signal-count">0</Badge>
          </div>
          <p className="text-sm text-muted-foreground">No policy signals available</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6" data-testid="card-policy-signals">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Recommended Actions</h3>
          <Badge variant="secondary" data-testid="badge-signal-count">{signals.length}</Badge>
        </div>

        <div className="text-xs text-muted-foreground leading-relaxed pb-2 border-b border-line/40">
          <span className="font-medium text-foreground">Why these actions: </span>
          {whyNow}
          {fdr != null && <span className="mono"> (FDR {fdr.toFixed(2)})</span>}
        </div>
        
        <div className="space-y-3">
          {signals.map((signal, idx) => {
            // Ensure signal has required properties
            if (!signal?.action || !signal?.description || !signal?.type) {
              return null;
            }

            // Use composite key: type:action for type-aware lookup
            const compositeKey = `${signal.type}:${signal.action}`;
            const config = signalConfig[compositeKey] || {
              label: `${signal.type}: ${signal.action.replace(/_/g, ' ')}`.toUpperCase(),
              icon: AlertTriangle,
              color: "text-muted-foreground",
            };
            const Icon = config.icon;
            
            return (
              <div 
                key={idx} 
                className="p-3 rounded-md border bg-card/50 hover-elevate" 
                data-testid={`signal-${signal.action}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`mt-0.5 ${config.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="font-medium text-sm">{config.label}</div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {signal.description}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                    {signal.type}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
