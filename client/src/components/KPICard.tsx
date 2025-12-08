import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/InfoTooltip";

interface KPICardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  trend?: {
    value: string;
    positive: boolean;
  };
  subtitle?: string;
  tooltipTerm?: string;
}

export function KPICard({ icon: Icon, label, value, trend, subtitle, tooltipTerm }: KPICardProps) {
  return (
    <Card className="p-6" data-testid={`card-kpi-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{label}</p>
            {tooltipTerm && <InfoTooltip term={tooltipTerm} />}
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-mono font-semibold" data-testid={`text-kpi-value-${label.toLowerCase().replace(/\s+/g, '-')}`}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        {trend && (
          <Badge
            variant={trend.positive ? "default" : "destructive"}
            className="text-xs"
            data-testid={`badge-trend-${label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {trend.positive ? "+" : ""}{trend.value}
          </Badge>
        )}
      </div>
    </Card>
  );
}
