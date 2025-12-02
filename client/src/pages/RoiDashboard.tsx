import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Target
} from "lucide-react";
import PlatformValueScore from "@/components/PlatformValueScore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format } from "date-fns";

interface RoiMetric {
  id: string;
  metricType: string;
  periodStart: string;
  periodEnd: string;
  value: number;
  unit: string;
  baselineValue?: number;
  improvement?: number;
  improvementPercent?: number;
  economicRegime?: string;
  fdrAtPeriod?: number;
  source?: string;
  details?: Record<string, any>;
  createdAt: string;
}

interface RoiDashboardData {
  totals: {
    procurementSavings: number;
    forecastAccuracyImprovement: number;
    timeSaved: number;
    inventoryOptimization: number;
  };
  byMetricType: Record<string, { total: number; count: number; recent: number[] }>;
  bySource: Record<string, number>;
  recentMetrics: RoiMetric[];
  metricsCount: number;
}

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function formatNumber(value: number, unit: string): string {
  if (unit === "dollars") {
    return formatCurrency(value);
  } else if (unit === "percent") {
    return `${value.toFixed(1)}%`;
  } else if (unit === "hours") {
    return `${value.toFixed(0)}h`;
  } else if (unit === "units") {
    return `${value.toFixed(0)} units`;
  }
  return value.toFixed(1);
}

function MetricCard({ 
  title, 
  value, 
  unit, 
  trend, 
  trendLabel,
  icon: Icon,
  description 
}: { 
  title: string; 
  value: number; 
  unit: string;
  trend?: number;
  trendLabel?: string;
  icon: any;
  description?: string;
}) {
  const isPositive = trend !== undefined && trend >= 0;
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;
  
  return (
    <Card data-testid={`card-roi-${title.toLowerCase().replace(/\s/g, '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`value-roi-${title.toLowerCase().replace(/\s/g, '-')}`}>
          {formatNumber(value, unit)}
        </div>
        {trend !== undefined && (
          <p className={`text-xs flex items-center gap-1 ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            <TrendIcon className="h-3 w-3" />
            {Math.abs(trend).toFixed(1)}% {trendLabel || 'from baseline'}
          </p>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-6">
      <div className="text-center py-12">
        <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No ROI Data Yet</h3>
        <p className="text-muted-foreground max-w-sm mx-auto">
          ROI metrics are automatically tracked as you use the platform. 
          Run allocations, generate forecasts, and optimize procurement to see your savings here.
        </p>
      </div>
    </div>
  );
}

export default function RoiDashboard() {
  const { data, isLoading, error } = useQuery<RoiDashboardData>({
    queryKey: ["/api/roi/dashboard"],
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="p-6">
            <p className="text-destructive">Failed to load ROI dashboard data. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data || data.metricsCount === 0) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="heading-roi-dashboard">ROI Dashboard</h1>
          <p className="text-muted-foreground">
            Track your platform savings, forecast accuracy improvements, and operational efficiency gains
          </p>
        </div>
        <PlatformValueScore />
        <EmptyState />
      </div>
    );
  }

  const { totals, byMetricType, bySource, recentMetrics } = data;

  const savingsTrend = byMetricType["procurement_savings"]?.recent.length > 1
    ? ((byMetricType["procurement_savings"].recent[0] - byMetricType["procurement_savings"].recent[byMetricType["procurement_savings"].recent.length - 1]) / byMetricType["procurement_savings"].recent[byMetricType["procurement_savings"].recent.length - 1]) * 100
    : undefined;

  const sourceChartData = Object.entries(bySource).map(([name, value]) => ({
    name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: value,
  }));

  const recentTrendData = recentMetrics
    .filter(m => m.metricType === "procurement_savings")
    .slice(0, 10)
    .reverse()
    .map((m) => ({
      date: format(new Date(m.periodStart), "MMM d"),
      value: m.value,
      regime: m.economicRegime || "Unknown",
    }));

  const metricTypeData = Object.entries(byMetricType).map(([type, data]) => ({
    name: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    total: data.total,
    count: data.count,
    average: data.count > 0 ? data.total / data.count : 0,
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="heading-roi-dashboard">ROI Dashboard</h1>
          <p className="text-muted-foreground">
            Track your platform savings, forecast accuracy improvements, and operational efficiency gains
          </p>
        </div>
        <Badge variant="secondary" data-testid="badge-metrics-count">
          {data.metricsCount} metrics tracked
        </Badge>
      </div>

      <PlatformValueScore />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Procurement Savings"
          value={totals.procurementSavings}
          unit="dollars"
          trend={savingsTrend}
          trendLabel="recent trend"
          icon={DollarSign}
          description="Total savings from regime-aware procurement"
        />
        <MetricCard
          title="Forecast Accuracy"
          value={totals.forecastAccuracyImprovement}
          unit="percent"
          icon={Target}
          description="Average improvement in MAPE"
        />
        <MetricCard
          title="Time Saved"
          value={totals.timeSaved}
          unit="hours"
          icon={Clock}
          description="Hours saved through automation"
        />
        <MetricCard
          title="Inventory Optimization"
          value={totals.inventoryOptimization}
          unit="dollars"
          icon={Package}
          description="Value from reduced carrying costs"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Savings Trend</CardTitle>
            <CardDescription>Procurement savings over time</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={recentTrendData}>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tickFormatter={(v) => formatCurrency(v)}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), "Savings"]}
                    labelFormatter={(label) => `Date: ${label}`}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No savings data to display yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Savings by Source</CardTitle>
            <CardDescription>Where your ROI is coming from</CardDescription>
          </CardHeader>
          <CardContent>
            {sourceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={sourceChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {sourceChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), "Value"]}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No source data to display yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Metrics by Category</CardTitle>
          <CardDescription>Breakdown of tracked metrics</CardDescription>
        </CardHeader>
        <CardContent>
          {metricTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metricTypeData} layout="vertical">
                <XAxis 
                  type="number" 
                  tickFormatter={(v) => formatCurrency(v)}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={150}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), "Total"]}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="total" 
                  fill="hsl(var(--primary))" 
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No metrics data to display yet
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Metrics</CardTitle>
          <CardDescription>Latest tracked ROI events</CardDescription>
        </CardHeader>
        <CardContent>
          {recentMetrics.length > 0 ? (
            <div className="space-y-3">
              {recentMetrics.slice(0, 10).map((metric) => (
                <div 
                  key={metric.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  data-testid={`row-metric-${metric.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      {metric.metricType === "procurement_savings" && <DollarSign className="h-4 w-4 text-primary" />}
                      {metric.metricType === "forecast_accuracy" && <Target className="h-4 w-4 text-primary" />}
                      {metric.metricType === "time_saved" && <Clock className="h-4 w-4 text-primary" />}
                      {metric.metricType === "inventory_optimization" && <Package className="h-4 w-4 text-primary" />}
                      {!["procurement_savings", "forecast_accuracy", "time_saved", "inventory_optimization"].includes(metric.metricType) && <Activity className="h-4 w-4 text-primary" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {metric.metricType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(metric.periodStart), "MMM d, yyyy")}
                        {metric.economicRegime && ` • ${metric.economicRegime.replace(/_/g, ' ')}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatNumber(metric.value, metric.unit)}</p>
                    {metric.improvementPercent && (
                      <p className={`text-xs ${metric.improvementPercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {metric.improvementPercent >= 0 ? '+' : ''}{metric.improvementPercent.toFixed(1)}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No recent metrics to display
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
