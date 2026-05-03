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
import { getRegimeGuidance } from "@/lib/regimeGuidance";

interface Signal {
  type: string;      // "procurement", "inventory", "production"
  action: string;    // "COUNTER_CYCLICAL_BUY", "REDUCE_INVENTORY", etc.
  description: string;
}

interface PolicySignalsProps {
  signals: Signal[];
}

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
  // Pull current regime so we can append a "Why these recommendations"
  // footer that explains the macro reasoning. Customers asked us to
  // never show a recommendation without showing our work.
  const { data: regime } = useQuery<{ regime: string }>({
    queryKey: ["/api/economics/regime"],
  });
  const guidance = getRegimeGuidance(regime?.regime);

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

        {regime?.regime && (
          <div
            className="pt-4 border-t text-xs text-muted-foreground leading-relaxed"
            data-testid="policy-signals-reasoning"
          >
            <span className="font-medium uppercase tracking-wider text-[10px] text-foreground">
              Why ·{" "}
            </span>
            {guidance.reasoning}
          </div>
        )}
      </div>
    </Card>
  );
}
