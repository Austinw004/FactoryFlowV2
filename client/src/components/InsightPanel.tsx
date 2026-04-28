import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Lightbulb,
  Activity,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Zap,
  Shield,
  Package,
  Factory,
  Truck,
  Gauge,
  X,
} from "lucide-react";

interface Insight {
  id: string;
  type: "anomaly" | "alert" | "suggestion" | "trend";
  severity: "critical" | "warning" | "info";
  category: string;
  title: string;
  description: string;
  metric?: string;
  currentValue?: number;
  expectedValue?: number;
  deviation?: number;
  recommendation?: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  timestamp: string;
}

const SEVERITY_STYLES = {
  critical: {
    border: "border-red-500/30",
    bg: "bg-red-500/5",
    badge: "bg-red-500/10 text-red-600 border-red-500/20",
    icon: "text-red-500",
  },
  warning: {
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
    badge: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    icon: "text-amber-500",
  },
  info: {
    border: "border-blue-500/30",
    bg: "bg-blue-500/5",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    icon: "text-blue-500",
  },
};

const TYPE_ICONS = {
  anomaly: Activity,
  alert: AlertTriangle,
  suggestion: Lightbulb,
  trend: TrendingUp,
};

const CATEGORY_ICONS: Record<string, any> = {
  inventory: Package,
  production: Factory,
  quality: Shield,
  maintenance: Gauge,
  supply_chain: Truck,
  efficiency: Zap,
  cost: TrendingDown,
};

function InsightCard({ insight, compact = false }: { insight: Insight; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const styles = SEVERITY_STYLES[insight.severity];
  const TypeIcon = TYPE_ICONS[insight.type] || Activity;
  const CategoryIcon = CATEGORY_ICONS[insight.category] || Activity;

  return (
    <div
      className={`rounded-lg border ${styles.border} ${styles.bg} p-3 transition-all hover:shadow-sm cursor-pointer`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${styles.icon}`}>
          <TypeIcon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium truncate">{insight.title}</span>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${styles.badge}`}>
              {insight.severity}
            </Badge>
          </div>
          {(!compact || expanded) && (
            <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
          )}
          {expanded && insight.recommendation && (
            <div className="mt-2 p-2 rounded-md bg-background/80 border border-border/50">
              <div className="flex items-center gap-1.5 mb-1">
                <Lightbulb className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-medium text-primary uppercase tracking-wider">Recommendation</span>
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed">{insight.recommendation}</p>
            </div>
          )}
          {expanded && insight.currentValue !== undefined && insight.expectedValue !== undefined && (
            <div className="mt-2 flex items-center gap-4 text-xs">
              <span className="text-muted-foreground">
                Current: <span className="font-medium text-foreground">{typeof insight.currentValue === 'number' && insight.currentValue < 1 ? (insight.currentValue * 100).toFixed(1) + '%' : insight.currentValue?.toFixed?.(1) || insight.currentValue}</span>
              </span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                Expected: <span className="font-medium text-foreground">{typeof insight.expectedValue === 'number' && insight.expectedValue < 1 ? (insight.expectedValue * 100).toFixed(1) + '%' : insight.expectedValue?.toFixed?.(1) || insight.expectedValue}</span>
              </span>
              {insight.deviation !== undefined && (
                <Badge variant="outline" className="text-[10px]">
                  {insight.deviation > 0 ? "+" : ""}{insight.deviation.toFixed(1)}%
                </Badge>
              )}
            </div>
          )}
        </div>
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

export function InsightPanel({ compact = false }: { compact?: boolean }) {
  const [filter, setFilter] = useState<string>("all");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { data: insights = [], isLoading } = useQuery<Insight[]>({
    queryKey: ["/api/intelligence/insights"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  });

  const activeInsights = (insights || []).filter((i) => !dismissed.has(i.id));
  const filtered = filter === "all" ? activeInsights : activeInsights.filter((i) => i.severity === filter);

  const criticalCount = activeInsights.filter((i) => i.severity === "critical").length;
  const warningCount = activeInsights.filter((i) => i.severity === "warning").length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activeInsights.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">All systems operating normally</p>
            <p className="text-xs mt-1">No anomalies or alerts detected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Intelligence
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                {criticalCount} critical
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/10 text-signal border-amber-500/20">
                {warningCount} warnings
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            {["all", "critical", "warning", "info"].map((f) => (
              <Button
                key={f}
                variant={filter === f ? "secondary" : "ghost"}
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className={compact ? "h-[300px]" : "h-[500px]"}>
          <div className="space-y-2">
            {filtered.map((insight) => (
              <InsightCard key={insight.id} insight={insight} compact={compact} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Compact version for sidebar/header use
export function InsightBadge() {
  const { data: insights = [] } = useQuery<Insight[]>({
    queryKey: ["/api/intelligence/insights"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const criticalCount = (insights || []).filter((i) => i.severity === "critical").length;
  const totalCount = (insights || []).length;

  if (totalCount === 0) return null;

  return (
    <Badge
      variant={criticalCount > 0 ? "destructive" : "secondary"}
      className="text-[10px] px-1.5 py-0 h-4 cursor-pointer"
    >
      {criticalCount > 0 ? `${criticalCount} critical` : `${totalCount} insights`}
    </Badge>
  );
}
