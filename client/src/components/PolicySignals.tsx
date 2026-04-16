import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Target,
  Package,
  Activity,
  Maximize2,
  ArrowRight,
} from "lucide-react";
import { useLocation } from "wouter";

interface Signal {
  type: string;      // "procurement", "inventory", "production"
  action: string;    // "COUNTER_CYCLICAL_BUY", "REDUCE_INVENTORY", etc.
  description: string;
}

interface PolicySignalsProps {
  signals: Signal[];
}

// Type-aware signal configuration using composite keys: type:action
const signalConfig: Record<string, { label: string; icon: any; color: string; actionLabel: string; actionPath: string }> = {
  // Procurement actions
  "procurement:normal": {
    label: "Standard Procurement",
    icon: Target,
    color: "text-blue-600",
    actionLabel: "View Materials",
    actionPath: "/procurement",
  },
  "procurement:strategic_buy": {
    label: "Strategic Purchasing",
    icon: TrendingUp,
    color: "text-green-600",
    actionLabel: "Start RFQ",
    actionPath: "/rfq-generation",
  },
  "procurement:reduce": {
    label: "Reduce Procurement",
    icon: TrendingDown,
    color: "text-yellow-600",
    actionLabel: "Review Pending Orders",
    actionPath: "/automated-po",
  },
  "procurement:aggressive_buy": {
    label: "Aggressive Buying",
    icon: DollarSign,
    color: "text-green-700",
    actionLabel: "Start RFQ",
    actionPath: "/rfq-generation",
  },

  // Inventory actions
  "inventory:maintain": {
    label: "Maintain Inventory",
    icon: Package,
    color: "text-blue-600",
    actionLabel: "View Inventory",
    actionPath: "/inventory",
  },
  "inventory:build": {
    label: "Build Safety Stock",
    icon: TrendingUp,
    color: "text-green-600",
    actionLabel: "Schedule Procurement",
    actionPath: "/rfq-generation",
  },
  "inventory:drawdown": {
    label: "Draw Down Stock",
    icon: TrendingDown,
    color: "text-yellow-600",
    actionLabel: "View Allocations",
    actionPath: "/allocation",
  },
  "inventory:maximize": {
    label: "Maximize Safety Stock",
    icon: Maximize2,
    color: "text-green-700",
    actionLabel: "Schedule Procurement",
    actionPath: "/rfq-generation",
  },

  // Production actions
  "production:normal": {
    label: "Maintain Production",
    icon: Activity,
    color: "text-blue-600",
    actionLabel: "View Forecasts",
    actionPath: "/forecasting",
  },
  "production:increase": {
    label: "Increase Production",
    icon: TrendingUp,
    color: "text-green-600",
    actionLabel: "Run Allocation",
    actionPath: "/allocation",
  },
  "production:decrease": {
    label: "Scale Back Production",
    icon: TrendingDown,
    color: "text-yellow-600",
    actionLabel: "Review Allocations",
    actionPath: "/allocation",
  },
  "production:maximize": {
    label: "Maximize Production",
    icon: Maximize2,
    color: "text-green-700",
    actionLabel: "Run Allocation",
    actionPath: "/allocation",
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
            if (!signal?.action || !signal?.description || !signal?.type) {
              return null;
            }

            const compositeKey = `${signal.type}:${signal.action}`;
            const config = signalConfig[compositeKey] || {
              label: `${signal.action.replace(/_/g, ' ')}`,
              icon: AlertTriangle,
              color: "text-muted-foreground",
              actionLabel: "View Details",
              actionPath: "/procurement",
            };
            const Icon = config.icon;

            return (
              <div
                key={idx}
                className="p-3 rounded-md border bg-card/50 hover-elevate"
                data-testid={`signal-${signal.action}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${config.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-sm">{config.label}</div>
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {signal.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {signal.description}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1 text-xs gap-1 -ml-1 mt-1"
                      onClick={() => setLocation(config.actionPath)}
                      data-testid={`button-signal-action-${signal.action}`}
                    >
                      {config.actionLabel}
                      <ArrowRight className="h-3 w-3" />
                    </Button>
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
