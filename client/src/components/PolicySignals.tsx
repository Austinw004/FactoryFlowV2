import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, TrendingUp, DollarSign } from "lucide-react";

interface Signal {
  signal: string;
  intensity: number;
}

interface PolicySignalsProps {
  signals: Signal[];
}

const signalConfig: Record<string, { label: string; icon: any; description: string }> = {
  REDUCE_INVENTORY: {
    label: "Reduce Inventory",
    icon: TrendingDown,
    description: "Cut inventory buffers to prepare for downturn",
  },
  TIGHTEN_CREDIT_TERMS: {
    label: "Tighten Credit",
    icon: DollarSign,
    description: "Strengthen credit terms with customers",
  },
  DEFER_EXPANSION_CAPEX: {
    label: "Defer Expansion",
    icon: AlertTriangle,
    description: "Postpone major capital expenditures",
  },
  COUNTER_CYCLICAL_BUY: {
    label: "Counter-Cyclical Buy",
    icon: TrendingUp,
    description: "Opportunistic procurement at favorable prices",
  },
  OPTIMIZE_TURNOVER: {
    label: "Optimize Turnover",
    icon: TrendingUp,
    description: "Focus on inventory efficiency",
  },
};

export function PolicySignals({ signals }: PolicySignalsProps) {
  return (
    <Card className="p-6" data-testid="card-policy-signals">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Active Policy Signals</h3>
          <Badge variant="secondary" data-testid="badge-signal-count">{signals.length}</Badge>
        </div>
        
        <div className="space-y-3">
          {signals.map((signal, idx) => {
            const config = signalConfig[signal.signal] || {
              label: signal.signal,
              icon: AlertTriangle,
              description: "",
            };
            const Icon = config.icon;
            
            return (
              <div key={idx} className="space-y-2" data-testid={`signal-${signal.signal}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{config.label}</span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    {Math.round(signal.intensity * 100)}%
                  </span>
                </div>
                <Progress value={signal.intensity * 100} className="h-1.5" />
                {config.description && (
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
