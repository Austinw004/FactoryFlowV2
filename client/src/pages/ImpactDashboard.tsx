import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Clock,
  ShieldCheck,
  PackageCheck,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ImpactMetric {
  id: string;
  label: string;
  description: string;
  baseline: number | string;
  current: number | string;
  delta: number | null;
  deltaUnit?: string;
  valueUnit?: string;
  direction: "up-good" | "down-good";
  confidence: "strong" | "directional" | "baseline";
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  hours_saved: Clock,
  defect_rate: ShieldCheck,
  inventory_turns: PackageCheck,
  otd: TrendingUp,
  energy_cost: Zap,
};

function formatDelta(d: number | null, unit?: string) {
  if (d == null) return "—";
  const sign = d >= 0 ? "+" : "";
  const value = Math.abs(d) >= 10 ? Math.round(d) : Math.round(d * 10) / 10;
  return `${sign}${value}${unit ?? ""}`;
}

function MetricCard({ m }: { m: ImpactMetric }) {
  const Icon = ICONS[m.id] ?? TrendingUp;
  const deltaIsPositive = m.delta != null && m.delta >= 0;
  const isGood =
    (m.direction === "up-good" && deltaIsPositive) ||
    (m.direction === "down-good" && !deltaIsPositive);

  return (
    <Card data-testid={`impact-card-${m.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">{m.label}</CardTitle>
          </div>
          <Badge variant={m.confidence === "strong" ? "default" : "secondary"} className="text-[10px]">
            {m.confidence}
          </Badge>
        </div>
        <CardDescription className="text-xs mt-1">{m.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold">
            {m.current}
            {m.valueUnit && <span className="text-lg text-muted-foreground ml-1">{m.valueUnit}</span>}
          </span>
          {m.delta != null && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-xs font-medium",
                isGood ? "text-emerald-600" : "text-amber-600",
              )}
            >
              {deltaIsPositive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {formatDelta(m.delta, m.deltaUnit)}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Baseline: {m.baseline}
          {m.valueUnit && ` ${m.valueUnit}`}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Impact Dashboard — quantifies value delivered by Prescient Labs for the
 * current tenant. Serves three audiences:
 *   (1) the customer, to justify continued investment,
 *   (2) grant reviewers, to demonstrate measurable program outcomes,
 *   (3) the platform team, to hold itself accountable to impact claims.
 *
 * Data source: /api/impact/metrics (planned) — until that endpoint is fully
 * populated we show the five canonical metric families with whatever data is
 * available, falling back to "baseline only" state so the dashboard is still
 * honest and useful from day 1.
 */
export default function ImpactDashboard() {
  const { data, isLoading } = useQuery<{ metrics: ImpactMetric[]; asOf?: string }>({
    queryKey: ["/api/impact/metrics"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const defaults: ImpactMetric[] = [
    {
      id: "hours_saved",
      label: "Operator hours saved",
      description: "Weekly hours returned to the procurement + planning teams.",
      baseline: 0,
      current: 0,
      delta: null,
      valueUnit: "hrs/wk",
      direction: "up-good",
      confidence: "baseline",
    },
    {
      id: "defect_rate",
      label: "Defect rate",
      description: "Parts-per-million defects at final inspection.",
      baseline: "—",
      current: "—",
      delta: null,
      valueUnit: "ppm",
      direction: "down-good",
      confidence: "baseline",
    },
    {
      id: "inventory_turns",
      label: "Inventory turn improvement",
      description: "Annualized inventory turns vs. 90-day baseline.",
      baseline: "—",
      current: "—",
      delta: null,
      valueUnit: "turns",
      direction: "up-good",
      confidence: "baseline",
    },
    {
      id: "otd",
      label: "On-time delivery",
      description: "Share of shipments arriving on or before commit date.",
      baseline: "—",
      current: "—",
      delta: null,
      valueUnit: "%",
      direction: "up-good",
      confidence: "baseline",
    },
    {
      id: "energy_cost",
      label: "Energy cost per unit",
      description: "kWh-equivalent spend per produced unit.",
      baseline: "—",
      current: "—",
      delta: null,
      direction: "down-good",
      confidence: "baseline",
    },
  ];

  const metrics = (data?.metrics && data.metrics.length > 0 ? data.metrics : defaults).slice(0, 10);

  return (
    <div className="p-6 space-y-6" data-testid="impact-dashboard">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Impact Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Quantified value delivered by Prescient Labs on your operations —
            hours returned to the floor, defect rate shifts, inventory turn
            gains, and on-time delivery improvements. Metrics update as more of
            your historical data flows through the platform.
          </p>
        </div>
        {data?.asOf && (
          <Badge variant="outline" className="text-xs">
            As of {new Date(data.asOf).toLocaleDateString()}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading impact metrics…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {metrics.map((m) => (
            <MetricCard key={m.id} m={m} />
          ))}
        </div>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">Methodology</CardTitle>
          <CardDescription className="text-xs">
            Every metric here is derived from your data — no synthetic or modeled
            numbers. Each card is annotated with its confidence level:
            <span className="font-medium"> strong</span> (measured directly from
            platform telemetry),
            <span className="font-medium"> directional</span> (derived from
            partial data; trend reliable but absolute level provisional), or
            <span className="font-medium"> baseline</span> (not yet computed —
            we need more history to report).
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
