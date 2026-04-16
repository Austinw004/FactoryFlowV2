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
  ArrowRight,
} from "lucide-react";

interface Signal {
  type: string;      // "procurement", "inventory", "production"
  action: string;    // "COUNTER_CYCLICAL_BUY", "REDUCE_INVENTORY", etc.
  description: string;
}

interface PolicySignalsProps {
  signals: Signal[];
}

// Type-aware signal configuration using composite keys: type:action
const signalConfig: Record<string, {
  label: string;
  icon: any;
  color: string;
  why: string;
  actionLabel: string;
  actionPath: string;
}> = {
  // Procurement actions
  "procurement:normal": {
    label: "Standard Procurement Pace",
    icon: Target,
    color: "text-blue-600",
    why: "FDR is within equilibrium range — no reason to accelerate or defer purchases.",
    actionLabel: "Review purchase orders",
    actionPath: "/inventory",
  },
  "procurement:strategic_buy": {
    label: "Strategic Purchasing Window",
    icon: TrendingUp,
    color: "text-emerald-600",
    why: "Counter-cyclical conditions favor buyers. Locking in now protects against future price increases.",
    actionLabel: "Start negotiation",
    actionPath: "/supplier-risk",
  },
  "procurement:reduce": {
    label: "Reduce Non-Critical Procurement",
    icon: TrendingDown,
    color: "text-amber-600",
    why: "Asset markets are outpacing real economy. Deferring non-critical buys avoids overpaying at cycle peak.",
    actionLabel: "Review pending orders",
    actionPath: "/inventory",
  },
  "procurement:aggressive_buy": {
    label: "Accelerate Critical Purchases",
    icon: DollarSign,
    color: "text-emerald-700",
    why: "Real economy leading means supplier pricing pressure is low. Lock in volume now before conditions shift.",
    actionLabel: "View critical materials",
    actionPath: "/supply-chain",
  },

  // Inventory actions
  "inventory:maintain": {
    label: "Maintain Current Safety Stock",
    icon: Package,
    color: "text-blue-600",
    why: "Inventory levels are appropriate for current demand and supply conditions.",
    actionLabel: "View inventory",
    actionPath: "/inventory",
  },
  "inventory:build": {
    label: "Build Safety Stock Now",
    icon: TrendingUp,
    color: "text-emerald-600",
    why: "Lead times are likely to increase as the regime shifts. Building stock now prevents future stockouts.",
    actionLabel: "Identify which materials",
    actionPath: "/inventory",
  },
  "inventory:drawdown": {
    label: "Draw Down Excess Stock",
    icon: TrendingDown,
    color: "text-amber-600",
    why: "Carrying costs are increasing and demand signals are softening. Reduce inventory to free working capital.",
    actionLabel: "Review excess stock",
    actionPath: "/inventory",
  },
  "inventory:maximize": {
    label: "Maximize Inventory Levels",
    icon: Maximize2,
    color: "text-emerald-700",
    why: "Supply disruption risk is elevated. Maximum safety stock on critical materials reduces production stoppage risk.",
    actionLabel: "Set safety stock targets",
    actionPath: "/inventory",
  },

  // Production actions
  "production:normal": {
    label: "Maintain Production Schedule",
    icon: Activity,
    color: "text-blue-600",
    why: "Demand signals and supply conditions support standard production rates.",
    actionLabel: "View production plan",
    actionPath: "/production-kpis",
  },
  "production:increase": {
    label: "Increase Production Output",
    icon: TrendingUp,
    color: "text-emerald-600",
    why: "Favorable regime and demand signals support accelerating production before input costs rise.",
    actionLabel: "Review capacity",
    actionPath: "/production-kpis",
  },
  "production:decrease": {
    label: "Scale Back Production",
    icon: TrendingDown,
    color: "text-amber-600",
    why: "Demand softening and elevated input costs reduce margin on incremental production.",
    actionLabel: "Review work orders",
    actionPath: "/production-kpis",
  },
  "production:maximize": {
    label: "Maximize Production Run",
    icon: Maximize2,
    color: "text-emerald-700",
    why: "Counter-cyclical conditions make this an optimal window to build finished goods inventory at low input cost.",
    actionLabel: "Review capacity",
    actionPath: "/production-kpis",
  },
};

export function PolicySignals({ signals }: PolicySignalsProps) {
  const [, setLocation] = useLocation();

  if (!Array.isArray(signals) || signals.length === 0) {
    return (
      <Card className="p-6" data-testid="card-policy-signals">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Procurement Signals</h3>
            <Badge variant="secondary" data-testid="badge-signal-count">0</Badge>
          </div>
          <p className="text-sm text-muted-foreground">No active regime signals. Conditions are stable.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6" data-testid="card-policy-signals">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Procurement Signals</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Driven by current FDR regime</p>
          </div>
          <Badge variant="secondary" data-testid="badge-signal-count">{signals.length}</Badge>
        </div>

        <div className="space-y-3">
          {signals.map((signal, idx) => {
            if (!signal?.action || !signal?.description || !signal?.type) return null;

            const compositeKey = `${signal.type}:${signal.action}`;
            const config = signalConfig[compositeKey] || {
              label: `${signal.type}: ${signal.action.replace(/_/g, ' ')}`,
              icon: AlertTriangle,
              color: "text-muted-foreground",
              why: signal.description,
              actionLabel: "View details",
              actionPath: "/supply-chain",
            };
            const Icon = config.icon;

            return (
              <div
                key={idx}
                className="p-3 rounded-md border bg-card/50 hover-elevate space-y-2"
                data-testid={`signal-${signal.action}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 shrink-0 ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="font-medium text-sm leading-tight">{config.label}</span>
                      <Badge variant="outline" className="text-xs whitespace-nowrap shrink-0">
                        {signal.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{signal.description}</p>
                  </div>
                </div>

                {/* Why this recommendation — transparency builds trust */}
                <div className="pl-7">
                  <p className="text-xs text-muted-foreground/80 bg-muted/30 rounded p-2 leading-relaxed">
                    <span className="font-semibold text-foreground">Why: </span>
                    {config.why}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2 mt-1.5 -ml-0.5 text-muted-foreground hover:text-foreground"
                    onClick={() => setLocation(config.actionPath)}
                    data-testid={`signal-action-${signal.action}`}
                  >
                    {config.actionLabel}
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
