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

type SignalRoute = { label: string; path: string };

// Type-aware signal configuration using composite keys: type:action.
// Each entry includes (1) a customer-language label, (2) a "Why this matters"
// explanation tied to the FDR regime, and (3) a destination so the customer
// can act on the signal without searching the nav.
const signalConfig: Record<string, {
  label: string;
  icon: any;
  color: string;
  why: string;
  route: SignalRoute;
}> = {
  // Procurement actions
  "procurement:normal": {
    label: "Standard Procurement",
    icon: Target,
    color: "text-soft",
    why: "Vendor leverage is balanced. Run normal release cadence and reorder triggers.",
    route: { label: "Open procurement workspace", path: "/procurement" },
  },
  "procurement:strategic_buy": {
    label: "Strategic Purchasing",
    icon: TrendingUp,
    color: "text-good",
    why: "Forward prices favor the buyer. Move incremental volume forward of plan on critical-path materials.",
    route: { label: "Plan strategic buy", path: "/procurement" },
  },
  "procurement:reduce": {
    label: "Reduce Procurement",
    icon: TrendingDown,
    color: "text-signal",
    why: "Prices are at cyclical highs. Cut discretionary release quantities and review open POs.",
    route: { label: "Audit open POs", path: "/procurement" },
  },
  "procurement:aggressive_buy": {
    label: "Aggressive Buying",
    icon: DollarSign,
    color: "text-good",
    why: "Counter-cyclical window: spot prices are at lows while real-economy demand remains strong.",
    route: { label: "Generate RFQs", path: "/rfq-dashboard" },
  },

  // Inventory actions
  "inventory:maintain": {
    label: "Maintain Inventory",
    icon: Package,
    color: "text-soft",
    why: "Demand and lead times are stable. Hold safety stock at current policy.",
    route: { label: "Review inventory", path: "/inventory-management" },
  },
  "inventory:build": {
    label: "Build Inventory",
    icon: TrendingUp,
    color: "text-good",
    why: "Inputs trending up. Lift safety stock on critical SKUs to absorb the next leg.",
    route: { label: "Adjust safety stock", path: "/inventory-optimization" },
  },
  "inventory:drawdown": {
    label: "Draw Down Stock",
    icon: TrendingDown,
    color: "text-signal",
    why: "Carrying cost on inflated inventory is rising. Consume existing stock before replenishing.",
    route: { label: "Open inventory plan", path: "/inventory-management" },
  },
  "inventory:maximize": {
    label: "Maximize Inventory",
    icon: Maximize2,
    color: "text-good",
    why: "Pricing window is open. Push safety stock to upper band on critical commodities.",
    route: { label: "Set max-build policy", path: "/inventory-optimization" },
  },

  // Production actions
  "production:normal": {
    label: "Maintain Production",
    icon: Activity,
    color: "text-soft",
    why: "Demand signal is in band. Hold current run rate and shift pattern.",
    route: { label: "Open production plan", path: "/production-kpis" },
  },
  "production:increase": {
    label: "Increase Production",
    icon: TrendingUp,
    color: "text-good",
    why: "Demand is accelerating. Add capacity ahead of competitors while inputs and labor are available.",
    route: { label: "Plan added capacity", path: "/production-kpis" },
  },
  "production:decrease": {
    label: "Scale Back Production",
    icon: TrendingDown,
    color: "text-signal",
    why: "Demand is softening. Trim non-critical runs to avoid inventory build at peak input cost.",
    route: { label: "Re-plan runs", path: "/production-kpis" },
  },
  "production:maximize": {
    label: "Maximize Production",
    icon: Maximize2,
    color: "text-good",
    why: "Counter-cyclical demand. Run full capacity to take share before financial markets re-rate inputs.",
    route: { label: "Open capacity plan", path: "/production-kpis" },
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
          <p className="text-sm text-muted-foreground">
            No recommended actions from the FDR model right now — conditions are stable. New signals appear here automatically when the regime shifts.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6" data-testid="card-policy-signals">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Recommended Actions</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Driven by current FDR regime · ranked by procurement impact
            </p>
          </div>
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
              why: "The FDR model flagged this action based on the current regime. Open the workspace to see specific affected materials and suppliers.",
              route: { label: "Open workspace", path: `/${signal.type}` },
            };
            const Icon = config.icon;

            return (
              <div
                key={idx}
                className="p-4 rounded-md border bg-card/50 hover-elevate"
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
                      <p className="text-xs leading-relaxed">
                        <span className="text-muted-foreground">Why: </span>
                        <span className="text-foreground/80">{config.why}</span>
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs whitespace-nowrap capitalize">
                    {signal.type}
                  </Badge>
                </div>

                <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setLocation(config.route.path)}
                    data-testid={`signal-action-${signal.action}`}
                  >
                    {config.route.label}
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
