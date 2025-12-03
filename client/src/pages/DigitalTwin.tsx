import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import {
  Activity,
  Layers,
  FlaskConical,
  AlertTriangle,
  Database,
  RefreshCw,
  Play,
  Trash2,
  Eye,
  TrendingUp,
  TrendingDown,
  Package,
  Factory,
  Truck,
  DollarSign,
  Loader2,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  BarChart3,
} from "lucide-react";
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";

interface DashboardData {
  lastUpdated: string | null;
  state: {
    inventoryValue: number;
    inventoryUnits: number;
    activeSkus: number;
    activeMaterials: number;
    activeSuppliers: number;
    activeMachinery: number;
    oee: number;
  };
  alerts: {
    total: number;
    critical: number;
    byCategory: Record<string, number>;
  };
  dataFeeds: {
    total: number;
    active: number;
    errors: number;
  };
  regime: {
    current: string;
    fdr: number;
  };
  recentSimulations: any[];
  recentQueries: any[];
}

interface DigitalTwinQuery {
  id: string;
  queryText: string;
  queryType: string;
  responseText: string;
  responseData: any;
  responseType: string;
  processingTime: number;
  confidence: number;
  createdAt: string;
}

interface Simulation {
  id: string;
  name: string;
  description: string;
  simulationType: string;
  status: string;
  scenarioParams: any;
  results: any;
  totalCostImpact: number;
  riskScore: number;
  keyFindings: string[];
  recommendations: any[];
  createdAt: string;
}

interface DTAlert {
  id: string;
  alertType: string;
  severity: string;
  category: string;
  title: string;
  description: string;
  entityType: string;
  entityName: string;
  status: string;
  detectedAt: string;
  estimatedImpact: number;
}

const REGIME_COLORS: Record<string, string> = {
  HEALTHY_EXPANSION: "bg-green-500",
  ASSET_LED_GROWTH: "bg-amber-500",
  IMBALANCED_EXCESS: "bg-red-500",
  REAL_ECONOMY_LEAD: "bg-blue-500",
  UNKNOWN: "bg-gray-500",
};

const REGIME_LABELS: Record<string, string> = {
  HEALTHY_EXPANSION: "Normal Growth",
  ASSET_LED_GROWTH: "Early Warning",
  IMBALANCED_EXCESS: "Bubble Territory",
  REAL_ECONOMY_LEAD: "Opportunity Zone",
  UNKNOWN: "Unknown",
};

const SEVERITY_COLORS: Record<string, string> = {
  info: "bg-blue-500",
  warning: "bg-amber-500",
  critical: "bg-orange-500",
  emergency: "bg-red-500",
};

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export default function DigitalTwin() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [queryInput, setQueryInput] = useState("");
  const [showCreateSimulation, setShowCreateSimulation] = useState(false);
  const [newSimulation, setNewSimulation] = useState({
    name: "",
    description: "",
    simulationType: "demand_shock",
    scenarioParams: {},
    horizonDays: 90,
  });
  const [selectedSimulation, setSelectedSimulation] = useState<Simulation | null>(null);

  const { data: dashboard, isLoading: dashboardLoading } = useQuery<DashboardData>({
    queryKey: ["/api/digital-twin/dashboard"],
    refetchInterval: 30000,
  });

  const { data: queries = [], isLoading: queriesLoading } = useQuery<DigitalTwinQuery[]>({
    queryKey: ["/api/digital-twin/queries"],
  });

  const { data: simulations = [], isLoading: simulationsLoading } = useQuery<Simulation[]>({
    queryKey: ["/api/digital-twin/simulations"],
  });

  const { data: alerts = [], isLoading: alertsLoading } = useQuery<DTAlert[]>({
    queryKey: ["/api/digital-twin/alerts"],
  });

  const captureMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/digital-twin/snapshots/capture", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/digital-twin/dashboard"] });
      toast({ title: "Snapshot captured", description: "Digital twin state has been updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const queryMutation = useMutation({
    mutationFn: (queryText: string) => apiRequest("POST", "/api/digital-twin/queries", { queryText }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/digital-twin/queries"] });
      setQueryInput("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createSimulationMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/digital-twin/simulations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/digital-twin/simulations"] });
      setShowCreateSimulation(false);
      setNewSimulation({ name: "", description: "", simulationType: "demand_shock", scenarioParams: {}, horizonDays: 90 });
      toast({ title: "Simulation created" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const runSimulationMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/digital-twin/simulations/${id}/run`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/digital-twin/simulations"] });
      toast({ title: "Simulation completed" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteSimulationMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/digital-twin/simulations/${id}`, undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/digital-twin/simulations"] });
      toast({ title: "Simulation deleted" });
    },
  });

  const updateAlertMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      apiRequest("PATCH", `/api/digital-twin/alerts/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/digital-twin/alerts"] });
    },
  });

  const handleSubmitQuery = () => {
    if (!queryInput.trim()) return;
    queryMutation.mutate(queryInput);
  };

  const handleCreateSimulation = () => {
    const params = buildScenarioParams(newSimulation.simulationType);
    createSimulationMutation.mutate({
      ...newSimulation,
      scenarioParams: params,
    });
  };

  const buildScenarioParams = (type: string) => {
    switch (type) {
      case "demand_shock":
        return { demandChange: { percentage: 25 } };
      case "supply_disruption":
        return { supplyDisruption: { delayDays: 14 } };
      case "price_change":
        return { priceChange: { priceChangePercent: 15 } };
      case "regime_shift":
        return { regimeShift: { targetRegime: "IMBALANCED_EXCESS" } };
      default:
        return {};
    }
  };

  if (dashboardLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="heading-digital-twin">
            <Layers className="h-8 w-8 text-primary" />
            Real-Time Digital Twin
          </h1>
          <p className="text-muted-foreground mt-1">
            Live supply chain mirror with AI-powered insights and simulations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            className={`${REGIME_COLORS[dashboard?.regime?.current || "UNKNOWN"]} text-white gap-1`}
            data-testid="badge-regime"
          >
            <Activity className="h-3 w-3" />
            {REGIME_LABELS[dashboard?.regime?.current || "UNKNOWN"]}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => captureMutation.mutate()}
            disabled={captureMutation.isPending}
            data-testid="button-refresh-snapshot"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${captureMutation.isPending ? "animate-spin" : ""}`} />
            Refresh State
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="gap-2" data-testid="tab-overview">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="simulations" className="gap-2" data-testid="tab-simulations">
            <FlaskConical className="h-4 w-4" />
            Simulations
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2" data-testid="tab-alerts">
            <AlertTriangle className="h-4 w-4" />
            Alerts
            {(dashboard?.alerts?.critical || 0) > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1">
                {dashboard?.alerts?.critical}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="feeds" className="gap-2" data-testid="tab-feeds">
            <Database className="h-4 w-4" />
            Data Feeds
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card data-testid="card-inventory-value">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-inventory-value">
                  {formatCurrency(dashboard?.state?.inventoryValue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {(dashboard?.state?.inventoryUnits || 0).toLocaleString()} units
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-production-oee">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Production OEE</CardTitle>
                <Factory className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-oee">
                  {(dashboard?.state?.oee || 0).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {dashboard?.state?.activeMachinery || 0} active machines
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-supply-network">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Supply Network</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-suppliers">
                  {dashboard?.state?.activeSuppliers || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active suppliers
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-fdr">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">FDR Ratio</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-fdr">
                  {(dashboard?.regime?.fdr || 1.0).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Financial-to-Real Divergence
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Quick Insights
                </CardTitle>
                <CardDescription>AI-generated observations from your digital twin</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <Package className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{dashboard?.state?.activeMaterials || 0}</strong> materials tracked across{" "}
                      <strong>{dashboard?.state?.activeSkus || 0}</strong> SKUs
                    </AlertDescription>
                  </Alert>
                  <Alert>
                    <Factory className="h-4 w-4" />
                    <AlertDescription>
                      Production efficiency at <strong>{(dashboard?.state?.oee || 0).toFixed(1)}%</strong> OEE
                    </AlertDescription>
                  </Alert>
                  <Alert>
                    <Activity className="h-4 w-4" />
                    <AlertDescription>
                      Economic regime: <strong>{REGIME_LABELS[dashboard?.regime?.current || "UNKNOWN"]}</strong>
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Alert Summary
                </CardTitle>
                <CardDescription>Active alerts by category</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboard?.alerts && (
                  <div className="space-y-3">
                    {Object.entries(dashboard.alerts.byCategory).map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="capitalize text-sm">{category}</span>
                        <Badge variant={count > 0 ? "secondary" : "outline"}>{count}</Badge>
                      </div>
                    ))}
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Total Active</span>
                        <Badge variant={dashboard.alerts.total > 0 ? "destructive" : "secondary"}>
                          {dashboard.alerts.total}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System State Summary</CardTitle>
              <CardDescription>
                Last updated: {dashboard?.lastUpdated ? format(new Date(dashboard.lastUpdated), "PPpp") : "Never"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={[
                    { subject: "Inventory", value: Math.min(100, (dashboard?.state?.activeMaterials || 0) / 2) },
                    { subject: "Production", value: dashboard?.state?.oee || 0 },
                    { subject: "Suppliers", value: Math.min(100, (dashboard?.state?.activeSuppliers || 0) * 10) },
                    { subject: "SKUs", value: Math.min(100, (dashboard?.state?.activeSkus || 0) / 2) },
                    { subject: "Machines", value: Math.min(100, (dashboard?.state?.activeMachinery || 0) * 10) },
                  ]}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis domain={[0, 100]} />
                    <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulations" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">What-If Simulations</h2>
              <p className="text-sm text-muted-foreground">
                Model different scenarios and see their projected impact
              </p>
            </div>
            <Button onClick={() => setShowCreateSimulation(true)} data-testid="button-create-simulation">
              <FlaskConical className="h-4 w-4 mr-2" />
              New Simulation
            </Button>
          </div>

          {simulationsLoading ? (
            <Skeleton className="h-48" />
          ) : simulations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FlaskConical className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Simulations Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first what-if simulation to model potential scenarios
                </p>
                <Button onClick={() => setShowCreateSimulation(true)}>
                  Create Simulation
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {simulations.map((sim) => (
                <Card key={sim.id} data-testid={`card-simulation-${sim.id}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{sim.name}</CardTitle>
                      <Badge
                        variant={sim.status === "completed" ? "default" : sim.status === "running" ? "secondary" : "outline"}
                      >
                        {sim.status}
                      </Badge>
                    </div>
                    <CardDescription>{sim.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>Type</span>
                        <Badge variant="outline" className="capitalize">
                          {sim.simulationType?.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      
                      {sim.status === "completed" && sim.results && (
                        <>
                          <div className="flex items-center justify-between text-sm">
                            <span>Cost Impact</span>
                            <span className={sim.totalCostImpact > 0 ? "text-red-500" : "text-green-500"}>
                              {formatCurrency(Math.abs(sim.totalCostImpact || 0))}
                              {sim.totalCostImpact > 0 ? " increase" : " savings"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>Risk Score</span>
                            <Badge variant={sim.riskScore > 70 ? "destructive" : sim.riskScore > 40 ? "secondary" : "outline"}>
                              {sim.riskScore}/100
                            </Badge>
                          </div>
                          {sim.keyFindings?.slice(0, 2).map((finding, i) => (
                            <Alert key={i} className="py-2">
                              <AlertDescription className="text-xs">{finding}</AlertDescription>
                            </Alert>
                          ))}
                        </>
                      )}
                      
                      <div className="flex gap-2 pt-2">
                        {sim.status === "draft" && (
                          <Button
                            size="sm"
                            onClick={() => runSimulationMutation.mutate(sim.id)}
                            disabled={runSimulationMutation.isPending}
                            data-testid={`button-run-simulation-${sim.id}`}
                          >
                            {runSimulationMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4 mr-2" />
                            )}
                            Run
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedSimulation(sim)}
                          data-testid={`button-view-simulation-${sim.id}`}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteSimulationMutation.mutate(sim.id)}
                          data-testid={`button-delete-simulation-${sim.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
              <CardDescription>
                Real-time anomalies and issues detected in your supply chain
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <Skeleton className="h-48" />
              ) : alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No active alerts. Your supply chain is running smoothly.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <Alert key={alert.id} data-testid={`alert-${alert.id}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-full ${SEVERITY_COLORS[alert.severity]}`}>
                            <AlertTriangle className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium">{alert.title}</p>
                            <p className="text-sm text-muted-foreground">{alert.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs capitalize">{alert.category}</Badge>
                              <Badge variant="outline" className="text-xs capitalize">{alert.severity}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(alert.detectedAt), "PPp")}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {alert.status === "active" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateAlertMutation.mutate({ id: alert.id, status: "acknowledged" })}
                              >
                                Acknowledge
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => updateAlertMutation.mutate({ id: alert.id, status: "resolved" })}
                              >
                                Resolve
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feeds" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Feed Status
              </CardTitle>
              <CardDescription>
                Real-time data sources feeding your digital twin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Active Feeds</span>
                  </div>
                  <p className="text-2xl font-bold">{dashboard?.dataFeeds?.active || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">Total Feeds</span>
                  </div>
                  <p className="text-2xl font-bold">{dashboard?.dataFeeds?.total || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="font-medium">Errors</span>
                  </div>
                  <p className="text-2xl font-bold">{dashboard?.dataFeeds?.errors || 0}</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { name: "Inventory System", type: "internal", status: "active", lastSync: "2 min ago" },
                  { name: "Production MES", type: "internal", status: "active", lastSync: "5 min ago" },
                  { name: "Supplier Portal", type: "api", status: "active", lastSync: "10 min ago" },
                  { name: "Economic Indicators", type: "api", status: "active", lastSync: "1 hour ago" },
                ].map((feed, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${feed.status === "active" ? "bg-green-500" : "bg-red-500"}`} />
                      <div>
                        <p className="font-medium">{feed.name}</p>
                        <p className="text-xs text-muted-foreground">{feed.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">{feed.lastSync}</span>
                      <Badge variant="outline">{feed.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showCreateSimulation} onOpenChange={setShowCreateSimulation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create What-If Simulation</DialogTitle>
            <DialogDescription>
              Model a scenario to see its projected impact on your supply chain
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Simulation Name</Label>
              <Input
                value={newSimulation.name}
                onChange={(e) => setNewSimulation({ ...newSimulation, name: e.target.value })}
                placeholder="e.g., Q1 Demand Surge Analysis"
                data-testid="input-simulation-name"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newSimulation.description}
                onChange={(e) => setNewSimulation({ ...newSimulation, description: e.target.value })}
                placeholder="Describe the scenario you want to simulate"
                data-testid="input-simulation-description"
              />
            </div>
            <div>
              <Label>Scenario Type</Label>
              <Select
                value={newSimulation.simulationType}
                onValueChange={(v) => setNewSimulation({ ...newSimulation, simulationType: v })}
              >
                <SelectTrigger data-testid="select-simulation-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="demand_shock">Demand Shock (+/- 25%)</SelectItem>
                  <SelectItem value="supply_disruption">Supply Disruption (14-day delay)</SelectItem>
                  <SelectItem value="price_change">Price Change (+15%)</SelectItem>
                  <SelectItem value="regime_shift">Economic Regime Shift</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Simulation Horizon (Days)</Label>
              <Input
                type="number"
                value={newSimulation.horizonDays}
                onChange={(e) => setNewSimulation({ ...newSimulation, horizonDays: parseInt(e.target.value) || 90 })}
                data-testid="input-simulation-horizon"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateSimulation(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateSimulation}
              disabled={!newSimulation.name || createSimulationMutation.isPending}
              data-testid="button-confirm-create-simulation"
            >
              {createSimulationMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FlaskConical className="h-4 w-4 mr-2" />
              )}
              Create Simulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedSimulation} onOpenChange={() => setSelectedSimulation(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedSimulation?.name}</DialogTitle>
            <DialogDescription>{selectedSimulation?.description}</DialogDescription>
          </DialogHeader>
          {selectedSimulation?.status === "completed" && selectedSimulation?.results && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <DollarSign className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-2xl font-bold">
                        {formatCurrency(Math.abs(selectedSimulation.totalCostImpact || 0))}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedSimulation.totalCostImpact || 0) > 0 ? "Cost Increase" : "Potential Savings"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-2xl font-bold">{selectedSimulation.riskScore || 0}</p>
                      <p className="text-sm text-muted-foreground">Risk Score</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-2xl font-bold">
                        {Math.round((selectedSimulation.results?.confidence || 0.85) * 100)}%
                      </p>
                      <p className="text-sm text-muted-foreground">Confidence</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {selectedSimulation.results.timeline && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Impact Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={selectedSimulation.results.timeline}>
                          <XAxis dataKey="day" fontSize={10} />
                          <YAxis fontSize={10} />
                          <Tooltip />
                          <Line type="monotone" dataKey="cumulativeImpact" stroke="hsl(var(--primary))" name="Impact" />
                          <Line type="monotone" dataKey="riskLevel" stroke="hsl(var(--destructive))" name="Risk" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedSimulation.keyFindings && selectedSimulation.keyFindings.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Key Findings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {selectedSimulation.keyFindings.map((finding, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                          <span className="text-sm">{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {selectedSimulation.recommendations && selectedSimulation.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedSimulation.recommendations.map((rec: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/50">
                          <span className="text-sm">{rec.action}</span>
                          <Badge variant={rec.priority === "critical" || rec.priority === "high" ? "destructive" : "secondary"}>
                            {rec.priority}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          {selectedSimulation?.status !== "completed" && (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p>This simulation has not been run yet.</p>
              <Button 
                className="mt-4"
                onClick={() => {
                  runSimulationMutation.mutate(selectedSimulation!.id);
                  setSelectedSimulation(null);
                }}
              >
                Run Simulation
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
