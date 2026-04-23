import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  urgency?: string;  // "high", "medium", "low"
}

interface PolicySignalsProps {
  signals: Signal[];
}

// Urgency determines visual priority in the list
const urgencyStyle: Record<string, { dot: string; label: string }> = {
  high:   { dot: "bg-red-500",    label: "Act Now" },
  medium: { dot: "bg-amber-500",  label: "This Week" },
  low:    { dot: "bg-blue-500",   label: "Informational" },
};

// Type-aware signal configuration using composite keys: type:action
const signalConfig: Record<string, { label: string; icon: any; color: string; urgency: string }> = {
  // Procurement actions
  "procurement:normal": {
    label: "Standard Procurement",
    icon: Target,
    color: "text-blue-600",
    urgency: "low",
  },
  "procurement:strategic_buy": {
    label: "Strategic Purchasing — Lock In Contracts",
    icon: TrendingUp,
    color: "text-green-600",
    urgency: "medium",
  },
  "procurement:reduce": {
    label: "Reduce Procurement — Defer Non-Critical POs",
    icon: TrendingDown,
    color: "text-yellow-600",
    urgency: "medium",
  },
  "procurement:aggressive_buy": {
    label: "Aggressive Buying — Pre-Purchase Critical Materials",
    icon: DollarSign,
    color: "text-green-700",
    urgency: "high",
  },

  // Inventory actions
  "inventory:maintain": {
    label: "Maintain Inventory Levels",
    icon: Package,
    color: "text-blue-600",
    urgency: "low",
  },
  "inventory:build": {
    label: "Build Inventory — Increase Safety Stock",
    icon: TrendingUp,
    color: "text-green-600",
    urgency: "medium",
  },
  "inventory:drawdown": {
    label: "Draw Down Stock — Reduce Carrying Costs",
    icon: TrendingDown,
    color: "text-yellow-600",
    urgency: "medium",
  },
  "inventory:maximize": {
    label: "Maximize Inventory — Build Strategic Buffer",
    icon: Maximize2,
    color: "text-green-700",
    urgency: "high",
  },

  // Production actions
  "production:normal": {
    label: "Maintain Production Schedule",
    icon: Activity,
    color: "text-blue-600",
    urgency: "low",
  },
  "production:increase": {
    label: "Increase Production — Meet Forward Demand",
    icon: TrendingUp,
    color: "text-green-600",
    urgency: "medium",
  },
  "production:decrease": {
    label: "Scale Back Production — Reduce Inventory Build",
    icon: TrendingDown,
    color: "text-yellow-600",
    urgency: "medium",
  },
  "production:maximize": {
    label: "Maximize Production — Capitalize on Conditions",
    icon: Maximize2,
    color: "text-green-700",
    urgency: "high",
  },
};

export function PolicySignals({ signals }: PolicySignalsProps) {
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

  // Sort signals: high urgency first
  const urgencyOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const sortedSignals = [...signals].sort((a, b) => {
    const compositeA = `${a.type}:${a.action}`;
    const compositeB = `${b.type}:${b.action}`;
    const urgA = signalConfig[compositeA]?.urgency || a.urgency || "low";
    const urgB = signalConfig[compositeB]?.urgency || b.urgency || "low";
    return (urgencyOrder[urgA] ?? 2) - (urgencyOrder[urgB] ?? 2);
  });

  const highCount = sortedSignals.filter(s => {
    const key = `${s.type}:${s.action}`;
    return (signalConfig[key]?.urgency || s.urgency || "low") === "high";
  }).length;

  return (
    <Card className="p-6" data-testid="card-policy-signals">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Regime-Driven Actions</h3>
            {highCount > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">{highCount} action{highCount !== 1 ? 's' : ''} need immediate attention</p>
            )}
          </div>
          <Badge variant={highCount > 0 ? "destructive" : "secondary"} data-testid="badge-signal-count">
            {signals.length}
          </Badge>
        </div>

        <div className="space-y-3">
          {sortedSignals.map((signal, idx) => {
            if (!signal?.action || !signal?.description || !signal?.type) {
              return null;
            }

            const compositeKey = `${signal.type}:${signal.action}`;
            const config = signalConfig[compositeKey] || {
              label: `${signal.action.replace(/_/g, ' ')}`,
              icon: AlertTriangle,
              color: "text-muted-foreground",
              urgency: signal.urgency || "low",
            };
            const Icon = config.icon;
            const urg = config.urgency;
            const urgStyle = urgencyStyle[urg] || urgencyStyle.low;

            return (
              <div
                key={idx}
                className="p-3 rounded-md border bg-card/50 hover-elevate"
                data-testid={`signal-${signal.action}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-1 ${config.color} shrink-0`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{config.label}</span>
                      <span className="flex items-center gap-1 shrink-0">
                        <span className={`h-1.5 w-1.5 rounded-full ${urgStyle.dot}`} />
                        <span className="text-[10px] text-muted-foreground">{urgStyle.label}</span>
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {signal.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
