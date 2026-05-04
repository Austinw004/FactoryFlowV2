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
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface Signal {
  type: string;      // "procurement", "inventory", "production"
  action: string;    // "COUNTER_CYCLICAL_BUY", "REDUCE_INVENTORY", etc.
  description: string;
}

interface PolicySignalsProps {
  signals: Signal[];
}

// Each signal type:action gets a concrete recommended-action route + a
// "why this matters" plain-English explanation. The customer never reads
// a signal here without seeing what to do and why.
const signalGuidance: Record<string, { rationale: string; cta: { label: string; href: string } }> = {
  "procurement:normal": {
    rationale: "Markets are balanced; no urgency to accelerate or defer.",
    cta: { label: "Open procurement", href: "/procurement" },
  },
  "procurement:strategic_buy": {
    rationale: "Input costs trending up — pulling forward critical POs locks in current pricing.",
    cta: { label: "Plan strategic POs", href: "/procurement" },
  },
  "procurement:reduce": {
    rationale: "Asset/real decoupling signals weakening demand — avoid building unproductive inventory.",
    cta: { label: "Review open POs", href: "/automated-po" },
  },
  "procurement:aggressive_buy": {
    rationale: "Sharp price acceleration expected — pre-purchase critical materials before next pricing cycle.",
    cta: { label: "Lock in contracts", href: "/procurement" },
  },
  "inventory:maintain": {
    rationale: "Current days-of-supply align with demand and lead-time profile.",
    cta: { label: "View inventory", href: "/inventory-management" },
  },
  "inventory:build": {
    rationale: "Lead-time risk is rising — increase safety stock on single-sourced and critical SKUs.",
    cta: { label: "Adjust safety stock", href: "/inventory-optimization" },
  },
  "inventory:drawdown": {
    rationale: "Carrying cost outweighs disruption risk — work down excess on commoditized items.",
    cta: { label: "Identify excess", href: "/inventory-optimization" },
  },
  "inventory:maximize": {
    rationale: "Severe disruption risk — protect production with maximum safety coverage on critical inputs.",
    cta: { label: "Build safety stock", href: "/inventory-optimization" },
  },
  "production:normal": {
    rationale: "Demand signal stable; current run rate is appropriate.",
    cta: { label: "Open production plan", href: "/production-kpis" },
  },
  "production:increase": {
    rationale: "Forecast demand outpacing planned output — capture margin while pricing power holds.",
    cta: { label: "Adjust schedule", href: "/workforce-scheduling" },
  },
  "production:decrease": {
    rationale: "Demand softening ahead of asset/real correction — avoid building finished-goods overhang.",
    cta: { label: "Review production plan", href: "/production-kpis" },
  },
  "production:maximize": {
    rationale: "Counter-cyclical window — capture share while competitors hesitate.",
    cta: { label: "Maximize throughput", href: "/production-kpis" },
  },
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
          <p className="text-sm text-muted-foreground">
            No regime-driven actions right now. Conditions are stable — proceed with standard procurement cadence.
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
            };
            const guidance = signalGuidance[compositeKey];
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
                      {guidance?.rationale && (
                        <p className="text-[11px] text-muted-foreground/80 leading-relaxed pt-1">
                          <span className="font-medium text-foreground/80">Why:</span> {guidance.rationale}
                        </p>
                      )}
                      {guidance?.cta && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 mt-1 text-xs"
                          onClick={() => setLocation(guidance.cta.href)}
                          data-testid={`button-action-${signal.action}`}
                        >
                          {guidance.cta.label}
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs whitespace-nowrap capitalize">
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
