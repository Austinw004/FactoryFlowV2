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
} from "lucide-react";

interface Signal {
  type: string;      // "procurement", "inventory", "production"
  action: string;    // "strategic_buy", "drawdown", etc.
  description: string;
}

interface PolicySignalsProps {
  signals: Signal[];
  regime?: string;
  fdr?: number;
}

// Type-aware signal configuration using composite keys: type:action
const signalConfig: Record<string, { label: string; icon: any; color: string }> = {
  // Procurement actions
  "procurement:normal": { label: "Standard Procurement", icon: Target, color: "text-blue-600" },
  "procurement:strategic_buy": { label: "Strategic Purchasing", icon: TrendingUp, color: "text-green-600" },
  "procurement:reduce": { label: "Reduce Procurement", icon: TrendingDown, color: "text-yellow-600" },
  "procurement:aggressive_buy": { label: "Aggressive Buying", icon: DollarSign, color: "text-green-700" },

  // Inventory actions
  "inventory:maintain": { label: "Maintain Inventory", icon: Package, color: "text-blue-600" },
  "inventory:build": { label: "Build Inventory", icon: TrendingUp, color: "text-green-600" },
  "inventory:drawdown": { label: "Draw Down Stock", icon: TrendingDown, color: "text-yellow-600" },
  "inventory:maximize": { label: "Maximize Inventory", icon: Maximize2, color: "text-green-700" },

  // Production actions
  "production:normal": { label: "Maintain Production", icon: Activity, color: "text-blue-600" },
  "production:increase": { label: "Increase Production", icon: TrendingUp, color: "text-green-600" },
  "production:decrease": { label: "Scale Back Production", icon: TrendingDown, color: "text-yellow-600" },
  "production:maximize": { label: "Maximize Production", icon: Maximize2, color: "text-green-700" },
};

// "Why" reasoning per signal — translates the macro regime read into the
// specific causal chain that produced this recommendation. This is the
// transparency layer (Principle 10): customer never sees a recommendation
// without seeing why we made it.
const signalReasoning: Record<string, string> = {
  "procurement:normal":
    "FDR is in the balanced band — input prices typically move within ±2% in this regime, so standard cadence is the cost-optimal play.",
  "procurement:strategic_buy":
    "Asset markets outpacing the real economy historically precede 8–12% input cost increases — locking pricing now beats spot purchases later.",
  "procurement:reduce":
    "Asset-real decoupling at this level signals a pricing peak — orders placed today carry inflated cost vs. a likely correction.",
  "procurement:aggressive_buy":
    "Real-economy fundamentals leading asset markets is a rare buyer's window — pricing power favors procurement until the cycle resets.",

  "inventory:maintain":
    "Demand and price volatility are both contained — extra safety stock would tie up working capital with no upside.",
  "inventory:build":
    "Lead-time risk rises with the regime — adding cover on critical materials protects production if supplier slips compound.",
  "inventory:drawdown":
    "Carrying cost on inventory bought at peak prices compounds as the correction lands — drawing down realizes value before write-downs.",
  "inventory:maximize":
    "Cyclical lows on input pricing won't last — building cover now captures unit economics that disappear as the recovery accelerates.",

  "production:normal":
    "Demand signal is steady and inputs are stable — current schedule is the throughput-optimal point.",
  "production:increase":
    "Forward demand indicators and input availability both support a controlled ramp — stretching capacity now captures share.",
  "production:decrease":
    "Demand softness leads asset-market peaks — reducing run rate ahead of the order book tail keeps yield up and finished-goods inventory lean.",
  "production:maximize":
    "Counter-cyclical input cost + recovering demand creates the highest-margin production window in the cycle.",
};

const REGIME_LABELS: Record<string, string> = {
  HEALTHY_EXPANSION: "Healthy Expansion",
  ASSET_LED_GROWTH: "Asset-Led Growth",
  IMBALANCED_EXCESS: "Imbalanced Excess",
  REAL_ECONOMY_LEAD: "Real Economy Lead",
};

export function PolicySignals({ signals, regime, fdr }: PolicySignalsProps) {
  const friendlyRegime = regime ? REGIME_LABELS[regime] || regime.replace(/_/g, " ") : null;
  const fdrLabel = typeof fdr === "number" && Number.isFinite(fdr) ? fdr.toFixed(2) : null;

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

        {friendlyRegime && (
          <p className="text-xs text-muted-foreground leading-relaxed" data-testid="signals-regime-context">
            Tuned to <span className="text-soft font-medium">{friendlyRegime}</span>
            {fdrLabel && <> · FDR <span className="font-mono">{fdrLabel}</span></>}. Each
            recommendation below is the highest-leverage move for this regime.
          </p>
        )}

        <div className="space-y-3">
          {signals.map((signal, idx) => {
            if (!signal?.action || !signal?.description || !signal?.type) {
              return null;
            }

            const compositeKey = `${signal.type}:${signal.action}`;
            const config = signalConfig[compositeKey] || {
              label: `${signal.type}: ${signal.action.replace(/_/g, ' ')}`.toUpperCase(),
              icon: AlertTriangle,
              color: "text-muted-foreground",
            };
            const Icon = config.icon;
            const why = signalReasoning[compositeKey];

            return (
              <div
                key={idx}
                className="p-3 rounded-md border bg-card/50 hover-elevate"
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
                      {why && (
                        <p className="text-xs text-muted leading-relaxed pt-1" data-testid={`signal-why-${signal.action}`}>
                          <span className="uppercase tracking-wider mr-1.5">Why:</span>
                          {why}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs whitespace-nowrap shrink-0">
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
