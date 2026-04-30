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

interface SignalRoute {
  label: string;
  route: string;
}

// Type-aware signal configuration using composite keys: type:action.
// Each signal carries (a) display chrome, and (b) a "next step" button so
// the customer can act on the recommendation without hunting for the page.
const signalConfig: Record<string, {
  label: string;
  icon: any;
  color: string;
  nextStep: SignalRoute;
}> = {
  // Procurement actions
  "procurement:normal": {
    label: "Standard Procurement",
    icon: Target,
    color: "text-blue-600",
    nextStep: { label: "Open procurement queue", route: "/procurement" },
  },
  "procurement:strategic_buy": {
    label: "Strategic Purchasing",
    icon: TrendingUp,
    color: "text-green-600",
    nextStep: { label: "Lock in supplier contracts", route: "/procurement" },
  },
  "procurement:reduce": {
    label: "Reduce Procurement",
    icon: TrendingDown,
    color: "text-yellow-600",
    nextStep: { label: "Review pending POs", route: "/procurement" },
  },
  "procurement:aggressive_buy": {
    label: "Aggressive Buying",
    icon: DollarSign,
    color: "text-green-700",
    nextStep: { label: "Pre-buy critical materials", route: "/procurement" },
  },

  // Inventory actions
  "inventory:maintain": {
    label: "Maintain Inventory",
    icon: Package,
    color: "text-blue-600",
    nextStep: { label: "Check inventory health", route: "/inventory" },
  },
  "inventory:build": {
    label: "Build Inventory",
    icon: TrendingUp,
    color: "text-green-600",
    nextStep: { label: "Increase safety stock", route: "/inventory" },
  },
  "inventory:drawdown": {
    label: "Draw Down Stock",
    icon: TrendingDown,
    color: "text-yellow-600",
    nextStep: { label: "Identify slow movers", route: "/inventory" },
  },
  "inventory:maximize": {
    label: "Maximize Inventory",
    icon: Maximize2,
    color: "text-green-700",
    nextStep: { label: "Forward-buy commodities", route: "/inventory" },
  },

  // Production actions
  "production:normal": {
    label: "Maintain Production",
    icon: Activity,
    color: "text-blue-600",
    nextStep: { label: "Review production KPIs", route: "/production-kpis" },
  },
  "production:increase": {
    label: "Increase Production",
    icon: TrendingUp,
    color: "text-green-600",
    nextStep: { label: "Plan capacity ramp", route: "/production-kpis" },
  },
  "production:decrease": {
    label: "Scale Back Production",
    icon: TrendingDown,
    color: "text-yellow-600",
    nextStep: { label: "Review run schedule", route: "/production-kpis" },
  },
  "production:maximize": {
    label: "Maximize Production",
    icon: Maximize2,
    color: "text-green-700",
    nextStep: { label: "Maximize line throughput", route: "/production-kpis" },
  },
};

// Pages where each signal type can be acted on if no specific deep link
// is configured. Keeps fallback links useful instead of dead-ending.
const typeFallback: Record<string, SignalRoute> = {
  procurement: { label: "Open procurement", route: "/procurement" },
  inventory: { label: "Open inventory", route: "/inventory" },
  production: { label: "Open production", route: "/production-kpis" },
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
          <p className="text-sm text-muted-foreground">
            The platform will surface regime-driven actions here as conditions shift —
            things like "lock in supplier contracts" or "draw down slow-moving stock" with
            one-click links into the right workflow.
          </p>
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
            const config = signalConfig[compositeKey];
            const fallback = typeFallback[signal.type] || { label: "View details", route: "/dashboard" };
            const Icon = config?.icon || AlertTriangle;
            const colorClass = config?.color || "text-muted-foreground";
            const label = config?.label || `${signal.type}: ${signal.action.replace(/_/g, ' ')}`.toUpperCase();
            const nextStep = config?.nextStep || fallback;

            return (
              <div
                key={idx}
                className="p-3 rounded-md border bg-card/50 hover-elevate"
                data-testid={`signal-${signal.action}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`mt-0.5 ${colorClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="font-medium text-sm">{label}</div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {signal.description}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                    {signal.type}
                  </Badge>
                </div>
                <div className="mt-2 pl-8">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1.5"
                    onClick={() => setLocation(nextStep.route)}
                    data-testid={`button-signal-action-${idx}`}
                  >
                    {nextStep.label}
                    <ArrowRight className="h-3 w-3" />
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
