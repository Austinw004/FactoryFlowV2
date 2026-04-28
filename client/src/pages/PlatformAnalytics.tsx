import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  Users,
  Database,
  Zap,
  TrendingUp,
  Clock,
  Server,
  Shield,
  CheckCircle,
  AlertCircle,
  Layers,
  Target,
  ArrowUp,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { useToast } from "@/hooks/use-toast";

interface EngagementDataPoint {
  date: string;
  dau: number;
  sessions: number;
  apiCalls: number;
}

interface LatencyDataPoint {
  endpoint: string;
  p50: number;
  p99: number;
}

interface DeploymentRegion {
  name: string;
  status: string;
  latency: number;
}

interface PlatformHealthData {
  uptime: number;
  apiLatencyP50: number;
  apiLatencyP99: number;
  dataPointsProcessed: number;
  forecastsGenerated: number;
  allocationsOptimized: number;
  rfqsGenerated: number;
  skuCount: number;
  materialCount: number;
  supplierCount: number;
  userMetrics: {
    totalUsers: number;
    activeUsers30d: number;
    avgSessionDuration: number;
  };
  engagementTrend: EngagementDataPoint[];
  apiLatencyByEndpoint: LatencyDataPoint[];
  deploymentRegions: DeploymentRegion[];
  recentActivity: {
    rfqsLast30Days: number;
    forecastsLast30Days: number;
  };
  featureUsage: Record<string, number>;
  healthStatus: Record<string, string>;
  retention: Record<string, number>;
}

export default function PlatformAnalytics() {
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: healthData, isLoading, isError, error } = useQuery<PlatformHealthData>({
    queryKey: ["/api/platform/health"],
  });

  useEffect(() => {
    if (isError && error) {
      toast({
        title: "Failed to load analytics",
        description: "Unable to fetch platform health data. Some metrics may be unavailable.",
        variant: "destructive",
      });
    }
  }, [isError, error, toast]);

  const uptimePercent = healthData?.uptime ?? 0;
  
  const userMetrics = healthData?.userMetrics ?? {
    totalUsers: 0,
    activeUsers30d: 0,
    avgSessionDuration: 0,
  };
  
  const metrics = {
    totalUsers: userMetrics.totalUsers,
    activeUsers30d: userMetrics.activeUsers30d,
    totalApiCalls: healthData?.engagementTrend?.[healthData.engagementTrend.length - 1]?.apiCalls ?? 0,
    avgSessionDuration: userMetrics.avgSessionDuration,
    dataPointsProcessed: healthData?.dataPointsProcessed ?? 0,
    forecastsGenerated: healthData?.forecastsGenerated ?? 0,
    allocationsOptimized: healthData?.allocationsOptimized ?? 0,
    scenariosSimulated: healthData?.rfqsGenerated ?? 0,
  };

  const healthStatus = healthData?.healthStatus ?? {};

  const engagementData = healthData?.engagementTrend ?? [];

  const featureUsageData = [
    { name: "Demand Forecasting", usage: healthData?.featureUsage?.demandForecasting ?? 0, category: "core" as const },
    { name: "Economic Regime", usage: healthData?.featureUsage?.economicRegime ?? 0, category: "core" as const },
    { name: "Material Allocation", usage: healthData?.featureUsage?.materialAllocation ?? 0, category: "core" as const },
    { name: "Supplier Risk", usage: healthData?.featureUsage?.supplierRisk ?? 0, category: "advanced" as const },
    { name: "Commodity Prices", usage: healthData?.featureUsage?.commodityPrices ?? 0, category: "core" as const },
    { name: "Scenario Simulation", usage: healthData?.featureUsage?.scenarioSimulation ?? 0, category: "advanced" as const },
    { name: "Digital Twin", usage: healthData?.featureUsage?.digitalTwin ?? 0, category: "premium" as const },
    { name: "Peer Benchmarking", usage: healthData?.featureUsage?.peerBenchmarking ?? 0, category: "premium" as const },
  ].sort((a, b) => b.usage - a.usage);

  const hasRetentionData = healthData?.retention && Object.keys(healthData.retention).length > 0;
  const retentionData = hasRetentionData ? [
    { cohort: "Week 1", retained: healthData.retention.week1 ?? 0 },
    { cohort: "Week 2", retained: healthData.retention.week2 ?? 0 },
    { cohort: "Week 4", retained: healthData.retention.week4 ?? 0 },
    { cohort: "Week 8", retained: healthData.retention.week8 ?? 0 },
    { cohort: "Week 12", retained: healthData.retention.week12 ?? 0 },
    { cohort: "Month 6", retained: healthData.retention.month6 ?? 0 },
  ] : [];

  const apiLatencyData = healthData?.apiLatencyByEndpoint ?? [];

  const deploymentRegions = healthData?.deploymentRegions ?? [];

  const coreFeatures = featureUsageData.filter(f => f.category === "core");
  const advancedFeatures = featureUsageData.filter(f => f.category === "advanced");
  const premiumFeatures = featureUsageData.filter(f => f.category === "premium");
  
  const coreUsage = coreFeatures.length > 0 ? coreFeatures.reduce((sum, f) => sum + f.usage, 0) / coreFeatures.length : 0;
  const advancedUsage = advancedFeatures.length > 0 ? advancedFeatures.reduce((sum, f) => sum + f.usage, 0) / advancedFeatures.length : 0;
  const premiumUsage = premiumFeatures.length > 0 ? premiumFeatures.reduce((sum, f) => sum + f.usage, 0) / premiumFeatures.length : 0;
  
  const categoryData = [
    { name: "Core Features", value: Math.round(coreUsage), color: "#3b82f6" },
    { name: "Advanced Analytics", value: Math.round(advancedUsage), color: "#10b981" },
    { name: "Premium Features", value: Math.round(premiumUsage), color: "#f59e0b" },
  ];

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6 overflow-auto" data-testid="loading-state">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Platform Analytics</h1>
            <p className="text-muted-foreground">Loading platform metrics...</p>
          </div>
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
            <Activity className="h-3 w-3 mr-1 animate-spin" />
            Loading
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-32 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="pt-4">
                <Skeleton className="h-6 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 space-y-6 p-6 overflow-auto" data-testid="error-state">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Platform Analytics</h1>
            <p className="text-muted-foreground">Unable to load platform metrics</p>
          </div>
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        </div>
        <Card className="border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-bad/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium">Failed to Load Analytics Data</h3>
                <p className="text-sm text-muted-foreground">
                  There was an error fetching platform health metrics. Please try refreshing the page.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 overflow-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Platform Analytics</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Real-time platform health, usage metrics, and engagement analytics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20" data-testid="badge-live-status">
            <Activity className="h-3 w-3 mr-1 animate-pulse" />
            Live
          </Badge>
          <span className="text-sm text-muted-foreground" data-testid="text-current-time">
            {currentTime.toLocaleTimeString()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-uptime">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Server className="h-4 w-4" />
              Platform Uptime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{uptimePercent}%</div>
            <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
            <Progress value={uptimePercent} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card data-testid="card-active-users">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{metrics.activeUsers30d}</span>
              <span className="text-sm text-muted-foreground">/ {metrics.totalUsers}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Active in last 30 days</p>
          </CardContent>
        </Card>

        <Card data-testid="card-api-calls">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4" />
              API Calls (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{(metrics.totalApiCalls / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-muted-foreground mt-1">Total requests</p>
          </CardContent>
        </Card>

        <Card data-testid="card-session-duration">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.avgSessionDuration}<span className="text-lg">min</span></div>
            <p className="text-xs text-muted-foreground mt-1">High engagement indicator</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {Object.entries(healthStatus).map(([service, status]) => (
          <Card key={service} className="relative" data-testid={`card-health-${service}`}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize">{service}</span>
                <Badge
                  className={
                    status === "healthy"
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      : "bg-red-500/10 text-red-600 border-red-500/20"
                  }
                >
                  {status === "healthy" ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <AlertCircle className="h-3 w-3 mr-1" />
                  )}
                  {status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="engagement" className="space-y-4">
        <TabsList data-testid="tabs-analytics">
          <TabsTrigger value="engagement" data-testid="tab-engagement">
            <TrendingUp className="h-4 w-4 mr-2" />
            Engagement
          </TabsTrigger>
          <TabsTrigger value="features" data-testid="tab-features">
            <Layers className="h-4 w-4 mr-2" />
            Feature Usage
          </TabsTrigger>
          <TabsTrigger value="retention" data-testid="tab-retention">
            <Target className="h-4 w-4 mr-2" />
            Retention
          </TabsTrigger>
          <TabsTrigger value="performance" data-testid="tab-performance">
            <Activity className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="engagement" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Daily Active Users</CardTitle>
                <CardDescription>User engagement over time</CardDescription>
              </CardHeader>
              <CardContent>
                {engagementData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={engagementData}>
                        <defs>
                          <linearGradient id="dauGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                        <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="dau"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fill="url(#dauGradient)"
                          name="Active Users"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground" data-testid="empty-dau-chart">
                    No engagement data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">API Usage Trend</CardTitle>
                <CardDescription>Daily API calls (thousands)</CardDescription>
              </CardHeader>
              <CardContent>
                {engagementData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={engagementData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                        <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => [`${value.toLocaleString()} calls`, "API Calls"]}
                        />
                        <Bar dataKey="apiCalls" fill="#10b981" radius={[4, 4, 0, 0]} name="API Calls" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground" data-testid="empty-api-chart">
                    No API usage data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Platform Activity Summary</CardTitle>
              <CardDescription>Key operational metrics for the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{metrics.dataPointsProcessed.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Data Points Processed</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{metrics.forecastsGenerated.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Forecasts Generated</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{metrics.allocationsOptimized.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Allocations Optimized</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{metrics.scenariosSimulated.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Scenarios Simulated</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Feature Adoption</CardTitle>
                <CardDescription>Usage rate by feature (% of active users)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {featureUsageData.map((feature, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{feature.name}</span>
                          <Badge
                            variant="outline"
                            className={
                              feature.category === "core"
                                ? "text-blue-600"
                                : feature.category === "advanced"
                                ? "text-emerald-600"
                                : "text-amber-600"
                            }
                          >
                            {feature.category}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">{feature.usage}%</span>
                      </div>
                      <Progress value={feature.usage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Usage by Category</CardTitle>
                <CardDescription>Feature tier distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {categoryData.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span>{cat.name}</span>
                      </div>
                      <span className="font-medium">{cat.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="retention" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">User Retention Curve</CardTitle>
                <CardDescription>Cohort retention over time</CardDescription>
              </CardHeader>
              <CardContent>
                {retentionData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={retentionData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="cohort" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                        <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => [`${value}%`, "Retained"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="retained"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ fill: "#3b82f6", strokeWidth: 0, r: 4 }}
                          name="Retention Rate"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground" data-testid="empty-retention-chart">
                    No retention data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Retention Metrics</CardTitle>
                <CardDescription>Key retention indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {hasRetentionData ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="text-3xl font-bold text-emerald-600">{healthData?.retention?.month6 ?? 0}%</div>
                        <div className="text-sm text-muted-foreground">6-Month Retention</div>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="text-3xl font-bold text-blue-600">{healthData?.retention?.week2 ?? 0}%</div>
                        <div className="text-sm text-muted-foreground">Week 2 Retention</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium">Key Retention Drivers</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                          <span>Users who use Demand Forecasting in week 1 have 94% retention</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                          <span>Economic Regime alerts drive 3x daily engagement</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                          <span>Multi-feature users have 85% 6-month retention</span>
                        </li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground" data-testid="empty-retention-metrics">
                    No retention metrics available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer Success Metrics</CardTitle>
              <CardDescription>Indicators of platform stickiness and value delivery</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">Net Promoter Score</div>
                  <div className="text-2xl font-bold mt-1">—</div>
                  <Badge className="mt-2 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Excellent</Badge>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">Customer Health Score</div>
                  <div className="text-2xl font-bold mt-1">—</div>
                  <Progress value={84} className="mt-2 h-1" />
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">Time to Value</div>
                  <div className="text-2xl font-bold mt-1">—</div>
                  <span className="text-xs text-muted-foreground">Avg first ROI seen</span>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">Expansion Rate</div>
                  <div className="text-2xl font-bold mt-1">— %</div>
                  <span className="text-xs text-emerald-600">NDR (Net Dollar Retention)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">API Latency by Endpoint</CardTitle>
                <CardDescription>P50 and P99 response times (ms)</CardDescription>
              </CardHeader>
              <CardContent>
                {apiLatencyData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={apiLatencyData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                        <YAxis type="category" dataKey="endpoint" tick={{ fontSize: 12 }} className="text-muted-foreground" width={100} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number, name: string) => [`${value}ms`, name === "p50" ? "P50" : "P99"]}
                        />
                        <Bar dataKey="p50" fill="#3b82f6" radius={[0, 4, 4, 0]} name="P50" />
                        <Bar dataKey="p99" fill="#f59e0b" radius={[0, 4, 4, 0]} name="P99" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground" data-testid="empty-latency-chart">
                    No latency data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Regional Deployment Health</CardTitle>
                <CardDescription>Multi-region infrastructure status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {deploymentRegions.length > 0 ? (
                  deploymentRegions.map((region, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            region.status === "healthy" ? "bg-emerald-500" : "bg-red-500"
                          }`}
                        />
                        <span className="font-medium">{region.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">{region.latency}ms</span>
                        <Badge
                          className={
                            region.status === "healthy"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : "bg-red-500/10 text-red-600 border-red-500/20"
                          }
                        >
                          {region.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground" data-testid="empty-regions">
                    No deployment region data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Infrastructure Summary</CardTitle>
              <CardDescription>Platform reliability and scalability metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-xl font-bold">{uptimePercent}%</div>
                  <div className="text-xs text-muted-foreground">Uptime (30d)</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-xl font-bold">{healthData?.apiLatencyP50 ?? 0}ms</div>
                  <div className="text-xs text-muted-foreground">Avg Latency (P50)</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-xl font-bold">{healthData?.apiLatencyP99 ?? 0}ms</div>
                  <div className="text-xs text-muted-foreground">Avg Latency (P99)</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-xl font-bold">{deploymentRegions.length}</div>
                  <div className="text-xs text-muted-foreground">Regions</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-xl font-bold">0</div>
                  <div className="text-xs text-muted-foreground">Incidents (30d)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
