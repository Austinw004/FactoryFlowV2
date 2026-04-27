import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Target,
  Package,
  Activity,
  Maximize2,
  ArrowRight
} from "lucide-react";

interface Signal {
  type: string;      // "procurement", "inventory", "production"
  action: string;    // "COUNTER_CYCLICAL_BUY", "REDUCE_INVENTORY", etc.
  description: string;
}

interface PolicySignalsProps {
  signals: Signal[];
}

// Map each signal to a single, opinionated next step so the customer never
// reads a recommendation without knowing where to act on it. Routes are kept
// to ones that exist in the app router.
const actionRoutes: Record<string, { label: string; to: string }> = {
  procurement: { label: "Open procurement", to: "/procurement" },
  inventory: { label: "Open inventory", to: "/inventory" },
  production: { label: "Open production", to: "/production-kpis" },
};

// One-line "why" for each (type:action) pair. This is the reasoning a plant
// director would expect to read before acting on the signal.
const reasoningMap: Record<string, string> = {
  "procurement:strategic_buy":
    "Input prices are trending up faster than your demand growth — buying ahead protects margin.",
  "procurement:aggressive_buy":
    "Asset–real economy decoupling typically precedes input-cost spikes; pre-purchasing locks in current pricing.",
  "procurement:reduce":
    "Decoupling raises correction risk — tying up working capital in non-critical inventory is unfavorable here.",
  "procurement:normal":
    "Macro conditions are balanced; standard procurement cadence minimizes carrying cost.",
  "inventory:build":
    "Lead-time variance is rising relative to demand; safety stock buffers production against late deliveries.",
  "inventory:maximize":
    "Counter-cyclical window — buying coverage now is cheaper than buying it after the regime shifts.",
  "inventory:drawdown":
    "Demand is softening relative to on-hand stock; running down inventory frees cash and reduces obsolescence risk.",
  "inventory:maintain":
    "Coverage is aligned with forecasted demand; no rebalancing needed.",
  "production:increase":
    "Demand signal is outpacing planned output — adding shifts now avoids late fulfillment penalties.",
  "production:decrease":
    "Forecasted demand has eased; trimming output controls finished-goods carrying cost.",
  "production:maximize":
    "Throughput is the constraint, not demand — every additional unit ships at full margin.",
  "production:normal":
    "Demand and capacity are balanced; current schedule is optimal.",
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
  const [, setLocation] = useLocation();

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
            const reasoning = reasoningMap[compositeKey];
            const route = actionRoutes[signal.type];

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
                    <div className="flex-1 space-y-1.5">
                      <div className="font-medium text-sm">{config.label}</div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {signal.description}
                      </p>
                      {reasoning && (
                        <p className="text-[11px] text-muted-foreground/80 leading-relaxed pt-1 border-t border-border/40 mt-2">
                          <span className="font-medium text-foreground/70">Why:</span> {reasoning}
                        </p>
                      )}
                      {route && (
                        <div className="pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => setLocation(route.to)}
                            data-testid={`signal-action-${signal.action}`}
                          >
                            {route.label}
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      )}
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
