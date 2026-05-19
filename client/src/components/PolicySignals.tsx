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

// Each entry is: human-readable label, icon, color, the WHY the signal fired
// (so the operator understands what the model saw), and the concrete page the
// operator should go to in order to act on it. Without all four pieces, a
// "recommended action" is just a status label — see Principle 3.
const signalConfig: Record<
  string,
  {
    label: string;
    icon: any;
    color: string;
    reason: string;
    cta: { label: string; route: string };
  }
> = {
  "procurement:normal": {
    label: "Standard procurement",
    icon: Target,
    color: "text-blue-600",
    reason: "FDR is in equilibrium; no acceleration or deferral is justified by the macro signal.",
    cta: { label: "Open procurement queue", route: "/procurement" },
  },
  "procurement:strategic_buy": {
    label: "Strategic purchasing window",
    icon: TrendingUp,
    color: "text-green-600",
    reason: "Asset markets are leading the real economy; locking in pricing now protects margin against the typical 8-12% input cost rise in this regime.",
    cta: { label: "Lock in contracts", route: "/rfq-generation" },
  },
  "procurement:reduce": {
    label: "Reduce procurement",
    icon: TrendingDown,
    color: "text-yellow-600",
    reason: "FDR is elevated; deferring non-critical buys avoids purchasing at the top of an asset-led cycle.",
    cta: { label: "Defer open orders", route: "/automated-po" },
  },
  "procurement:aggressive_buy": {
    label: "Aggressive buying window",
    icon: DollarSign,
    color: "text-green-700",
    reason: "Real economy leading asset markets — historically the cheapest window of the cycle. Lock in long-dated agreements.",
    cta: { label: "Issue RFQs", route: "/rfq-generation" },
  },
  "inventory:maintain": {
    label: "Maintain inventory",
    icon: Package,
    color: "text-blue-600",
    reason: "Demand and supply signals are stable; current reorder points remain valid.",
    cta: { label: "Review inventory", route: "/inventory" },
  },
  "inventory:build": {
    label: "Build inventory",
    icon: TrendingUp,
    color: "text-green-600",
    reason: "Regime points to rising lead times or prices ahead; building 4-6 weeks of buffer on critical materials reduces exposure.",
    cta: { label: "Increase safety stock", route: "/inventory-optimization" },
  },
  "inventory:drawdown": {
    label: "Draw down stock",
    icon: TrendingDown,
    color: "text-yellow-600",
    reason: "Asset prices likely peaking; carrying excess inventory at these costs depresses margin.",
    cta: { label: "Plan drawdown", route: "/inventory-optimization" },
  },
  "inventory:maximize": {
    label: "Maximize inventory",
    icon: Maximize2,
    color: "text-green-700",
    reason: "Counter-cyclical buying window — building 6-12 months of buffer captures cyclical-low pricing.",
    cta: { label: "Build buffer stock", route: "/inventory-optimization" },
  },
  "production:normal": {
    label: "Maintain production",
    icon: Activity,
    color: "text-blue-600",
    reason: "No macro signal to alter cycle time or shift pattern.",
    cta: { label: "View operations", route: "/operations" },
  },
  "production:increase": {
    label: "Increase production",
    icon: TrendingUp,
    color: "text-green-600",
    reason: "Demand-side signals strengthening into a healthy expansion; capacity expansion is justified.",
    cta: { label: "Plan capacity", route: "/operations" },
  },
  "production:decrease": {
    label: "Scale back production",
    icon: TrendingDown,
    color: "text-yellow-600",
    reason: "Regime suggests softening end-demand ahead — reduce overtime before WIP accumulates.",
    cta: { label: "Adjust schedule", route: "/operations" },
  },
  "production:maximize": {
    label: "Maximize production",
    icon: Maximize2,
    color: "text-green-700",
    reason: "Real economy leading — capturing this window before competitors recalibrate is high-value.",
    cta: { label: "Push capacity", route: "/operations" },
  },
};

export function PolicySignals({ signals }: PolicySignalsProps) {
  const [, setLocation] = useLocation();

  // Empty state still answers "so what?" — directs the operator to the
  // strategic recommendations playbook instead of a dead "no data" line.
  if (!Array.isArray(signals) || signals.length === 0) {
    return (
      <Card className="p-6" data-testid="card-policy-signals">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Recommended Actions</h3>
            <Badge variant="secondary" data-testid="badge-signal-count">0</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            No procurement signals require action right now. The regime is stable.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setLocation("/action-playbooks")}
            data-testid="button-empty-signals-playbook"
          >
            Open regime playbook
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
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
              label: `${signal.type}: ${signal.action.replace(/_/g, " ")}`,
              icon: AlertTriangle,
              color: "text-muted-foreground",
              reason: "Signal generated from current regime model output.",
              cta: { label: "View details", route: "/action-playbooks" },
            };
            const Icon = config.icon;

            return (
              <div
                key={idx}
                className="p-3 rounded-md border bg-card/50 hover-elevate space-y-3"
                data-testid={`signal-${signal.action}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`mt-0.5 ${config.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="font-medium text-sm">{config.label}</div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {signal.description}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs whitespace-nowrap shrink-0">
                    {signal.type}
                  </Badge>
                </div>

                {/* Trust-through-transparency: every signal exposes WHY it
                    fired so the operator never reads a recommendation
                    without the reasoning. See Principle 10. */}
                <div className="text-xs leading-relaxed pl-8 -mt-1">
                  <span className="text-muted-foreground">Why: </span>
                  <span className="text-foreground/80">{config.reason}</span>
                </div>

                <div className="pl-8">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setLocation(config.cta.route)}
                    data-testid={`button-signal-action-${signal.action}`}
                  >
                    {config.cta.label}
                    <ArrowRight className="h-3 w-3 ml-1.5" />
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
