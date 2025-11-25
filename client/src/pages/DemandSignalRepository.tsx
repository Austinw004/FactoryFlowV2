import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { 
  Radio, 
  Database, 
  Activity, 
  Plus, 
  Trash2, 
  Edit, 
  RefreshCw,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  Clock,
  AlertCircle,
  Layers
} from "lucide-react";

interface DemandSignalSource {
  id: string;
  companyId: string;
  name: string;
  sourceType: string;
  description: string | null;
  endpoint: string | null;
  credentials: any;
  refreshIntervalMinutes: number | null;
  isActive: boolean;
  lastSyncAt: Date | null;
  lastSyncStatus: string | null;
  signalMappings: any;
  createdAt: Date;
  updatedAt: Date;
}

interface DemandSignal {
  id: string;
  companyId: string;
  sourceId: string | null;
  signalType: string;
  skuId: string | null;
  materialId: string | null;
  quantity: number | null;
  unit: string | null;
  signalDate: Date;
  confidenceScore: number | null;
  metadata: any;
  channel: string | null;
  region: string | null;
  customerSegment: string | null;
  isProcessed: boolean;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Analytics {
  summary: {
    totalSources: number;
    activeSources: number;
    totalSignals: number;
    unprocessedSignals: number;
    avgConfidence: number;
    totalQuantity: number;
  };
  bySignalType: Record<string, number>;
  bySource: Record<string, number>;
  sources: Array<{
    id: string;
    name: string;
    sourceType: string;
    isActive: boolean;
    signalCount: number;
  }>;
}

interface Sku {
  id: string;
  name: string;
}

const SIGNAL_TYPES = [
  "order",
  "forecast",
  "pos_sale",
  "inventory_adjustment",
  "return",
  "promotion",
  "seasonal_trend",
  "market_research",
  "customer_feedback",
  "external_data"
];

const SOURCE_TYPES = [
  "erp",
  "crm",
  "ecommerce",
  "pos",
  "manual",
  "api",
  "file_upload",
  "edi",
  "marketplace",
  "iot_sensor"
];

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function DemandSignalRepository() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [signalTypeFilter, setSignalTypeFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [showAddSourceDialog, setShowAddSourceDialog] = useState(false);
  const [showAddSignalDialog, setShowAddSignalDialog] = useState(false);
  const [newSource, setNewSource] = useState({
    name: "",
    sourceType: "manual",
    description: "",
    isActive: true,
  });
  const [newSignal, setNewSignal] = useState({
    signalType: "order",
    skuId: "",
    quantity: "",
    confidenceScore: "85",
    channel: "",
    region: "",
    sourceId: "",
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<Analytics>({
    queryKey: ["/api/demand-signals/analytics"],
  });

  const { data: sources, isLoading: sourcesLoading } = useQuery<DemandSignalSource[]>({
    queryKey: ["/api/demand-signals/sources"],
  });

  const { data: signals, isLoading: signalsLoading } = useQuery<DemandSignal[]>({
    queryKey: ["/api/demand-signals", { signalType: signalTypeFilter !== "all" ? signalTypeFilter : undefined, sourceId: sourceFilter !== "all" ? sourceFilter : undefined, limit: 100 }],
  });

  const { data: skus } = useQuery<Sku[]>({
    queryKey: ["/api/skus"],
  });

  const createSourceMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/demand-signals/sources", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demand-signals/sources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/demand-signals/analytics"] });
      setShowAddSourceDialog(false);
      setNewSource({ name: "", sourceType: "manual", description: "", isActive: true });
      toast({ title: "Source created", description: "Demand signal source added successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteSourceMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/demand-signals/sources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demand-signals/sources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/demand-signals/analytics"] });
      toast({ title: "Source deleted", description: "Demand signal source removed." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createSignalMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/demand-signals", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demand-signals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/demand-signals/analytics"] });
      setShowAddSignalDialog(false);
      setNewSignal({ signalType: "order", skuId: "", quantity: "", confidenceScore: "85", channel: "", region: "", sourceId: "" });
      toast({ title: "Signal created", description: "Demand signal recorded successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const processSignalsMutation = useMutation({
    mutationFn: async (signalIds: string[]) => {
      const res = await apiRequest("POST", "/api/demand-signals/process", { signalIds });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/demand-signals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/demand-signals/analytics"] });
      toast({ title: "Signals processed", description: `${data.processed} signals marked as processed.` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateSource = () => {
    if (!newSource.name) {
      toast({ title: "Validation error", description: "Source name is required.", variant: "destructive" });
      return;
    }
    createSourceMutation.mutate(newSource);
  };

  const handleCreateSignal = () => {
    if (!newSignal.signalType) {
      toast({ title: "Validation error", description: "Signal type is required.", variant: "destructive" });
      return;
    }
    createSignalMutation.mutate({
      ...newSignal,
      quantity: newSignal.quantity ? parseFloat(newSignal.quantity) : null,
      confidenceScore: newSignal.confidenceScore ? parseFloat(newSignal.confidenceScore) : null,
      signalDate: new Date(),
      sourceId: newSignal.sourceId || null,
      skuId: newSignal.skuId || null,
    });
  };

  const handleProcessUnprocessed = () => {
    const unprocessedIds = signals?.filter(s => !s.isProcessed).map(s => s.id) || [];
    if (unprocessedIds.length === 0) {
      toast({ title: "No signals to process", description: "All signals are already processed." });
      return;
    }
    processSignalsMutation.mutate(unprocessedIds);
  };

  const signalTypeData = analytics?.bySignalType 
    ? Object.entries(analytics.bySignalType).map(([name, value], idx) => ({
        name,
        value,
        color: CHART_COLORS[idx % CHART_COLORS.length],
      }))
    : [];

  const sourcePerformanceData = analytics?.sources?.map(s => ({
    name: s.name,
    signals: s.signalCount,
    active: s.isActive ? 1 : 0,
  })) || [];

  if (analyticsLoading && sourcesLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Demand Signal Repository</h1>
          <p className="text-muted-foreground">
            Centralized hub for multi-source demand signals and analytics
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={showAddSourceDialog} onOpenChange={setShowAddSourceDialog}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-source">
                <Plus className="h-4 w-4 mr-2" />
                Add Source
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Demand Signal Source</DialogTitle>
                <DialogDescription>
                  Configure a new source for demand signals (ERP, CRM, E-commerce, etc.)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="source-name">Source Name</Label>
                  <Input
                    id="source-name"
                    data-testid="input-source-name"
                    value={newSource.name}
                    onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                    placeholder="e.g., SAP ERP, Shopify Store"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source-type">Source Type</Label>
                  <Select
                    value={newSource.sourceType}
                    onValueChange={(v) => setNewSource({ ...newSource, sourceType: v })}
                  >
                    <SelectTrigger data-testid="select-source-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source-description">Description</Label>
                  <Textarea
                    id="source-description"
                    data-testid="input-source-description"
                    value={newSource.description}
                    onChange={(e) => setNewSource({ ...newSource, description: e.target.value })}
                    placeholder="Optional description..."
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="source-active"
                    data-testid="switch-source-active"
                    checked={newSource.isActive}
                    onCheckedChange={(checked) => setNewSource({ ...newSource, isActive: checked })}
                  />
                  <Label htmlFor="source-active">Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddSourceDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateSource} 
                  disabled={createSourceMutation.isPending}
                  data-testid="button-submit-source"
                >
                  {createSourceMutation.isPending ? "Creating..." : "Create Source"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showAddSignalDialog} onOpenChange={setShowAddSignalDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-add-signal">
                <Activity className="h-4 w-4 mr-2" />
                Add Signal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Demand Signal</DialogTitle>
                <DialogDescription>
                  Manually record a demand signal from any source
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signal-type">Signal Type</Label>
                  <Select
                    value={newSignal.signalType}
                    onValueChange={(v) => setNewSignal({ ...newSignal, signalType: v })}
                  >
                    <SelectTrigger data-testid="select-signal-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SIGNAL_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signal-source">Source (Optional)</Label>
                  <Select
                    value={newSignal.sourceId}
                    onValueChange={(v) => setNewSignal({ ...newSignal, sourceId: v })}
                  >
                    <SelectTrigger data-testid="select-signal-source">
                      <SelectValue placeholder="Select source..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No specific source</SelectItem>
                      {sources?.map((source) => (
                        <SelectItem key={source.id} value={source.id}>
                          {source.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signal-sku">SKU (Optional)</Label>
                  <Select
                    value={newSignal.skuId}
                    onValueChange={(v) => setNewSignal({ ...newSignal, skuId: v })}
                  >
                    <SelectTrigger data-testid="select-signal-sku">
                      <SelectValue placeholder="Select SKU..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No specific SKU</SelectItem>
                      {skus?.map((sku) => (
                        <SelectItem key={sku.id} value={sku.id}>
                          {sku.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signal-quantity">Quantity</Label>
                    <Input
                      id="signal-quantity"
                      type="number"
                      data-testid="input-signal-quantity"
                      value={newSignal.quantity}
                      onChange={(e) => setNewSignal({ ...newSignal, quantity: e.target.value })}
                      placeholder="e.g., 100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signal-confidence">Confidence %</Label>
                    <Input
                      id="signal-confidence"
                      type="number"
                      min="0"
                      max="100"
                      data-testid="input-signal-confidence"
                      value={newSignal.confidenceScore}
                      onChange={(e) => setNewSignal({ ...newSignal, confidenceScore: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signal-channel">Channel</Label>
                    <Input
                      id="signal-channel"
                      data-testid="input-signal-channel"
                      value={newSignal.channel}
                      onChange={(e) => setNewSignal({ ...newSignal, channel: e.target.value })}
                      placeholder="e.g., online, retail"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signal-region">Region</Label>
                    <Input
                      id="signal-region"
                      data-testid="input-signal-region"
                      value={newSignal.region}
                      onChange={(e) => setNewSignal({ ...newSignal, region: e.target.value })}
                      placeholder="e.g., North America"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddSignalDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateSignal} 
                  disabled={createSignalMutation.isPending}
                  data-testid="button-submit-signal"
                >
                  {createSignalMutation.isPending ? "Recording..." : "Record Signal"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Signal Sources</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-sources">
              {analytics?.summary.totalSources || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics?.summary.activeSources || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Signals</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-signals">
              {analytics?.summary.totalSignals || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics?.summary.unprocessedSignals || 0} pending processing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-confidence">
              {analytics?.summary.avgConfidence 
                ? `${analytics.summary.avgConfidence.toFixed(1)}%`
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all signals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-quantity">
              {analytics?.summary.totalQuantity?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Units signaled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="sources" data-testid="tab-sources">
            <Database className="h-4 w-4 mr-2" />
            Sources
          </TabsTrigger>
          <TabsTrigger value="signals" data-testid="tab-signals">
            <Radio className="h-4 w-4 mr-2" />
            Signals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Signals by Type</CardTitle>
                <CardDescription>Distribution of demand signal types</CardDescription>
              </CardHeader>
              <CardContent>
                {signalTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={signalTypeData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {signalTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    No signal data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Source Performance</CardTitle>
                <CardDescription>Signals received per source</CardDescription>
              </CardHeader>
              <CardContent>
                {sourcePerformanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={sourcePerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="signals" fill="hsl(var(--chart-1))" name="Signals" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    No source data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configured Sources</CardTitle>
              <CardDescription>
                Manage integrations with ERP, CRM, e-commerce, and other systems
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sourcesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : sources && sources.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Signals</TableHead>
                      <TableHead>Last Sync</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sources.map((source) => (
                      <TableRow key={source.id} data-testid={`row-source-${source.id}`}>
                        <TableCell className="font-medium">{source.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {source.sourceType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {source.isActive ? (
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Clock className="h-3 w-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {analytics?.sources?.find(s => s.id === source.id)?.signalCount || 0}
                        </TableCell>
                        <TableCell>
                          {source.lastSyncAt 
                            ? format(new Date(source.lastSyncAt), "MMM d, HH:mm")
                            : "Never"
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteSourceMutation.mutate(source.id)}
                            disabled={deleteSourceMutation.isPending}
                            data-testid={`button-delete-source-${source.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Database className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Sources Configured</h3>
                  <p className="text-muted-foreground mb-4">
                    Add your first demand signal source to start collecting data
                  </p>
                  <Button onClick={() => setShowAddSourceDialog(true)} data-testid="button-empty-add-source">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Source
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signals" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle>Demand Signals</CardTitle>
                  <CardDescription>
                    View and manage incoming demand signals
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={signalTypeFilter} onValueChange={setSignalTypeFilter}>
                    <SelectTrigger className="w-40" data-testid="filter-signal-type">
                      <SelectValue placeholder="Signal Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {SIGNAL_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="w-40" data-testid="filter-source">
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      {sources?.map((source) => (
                        <SelectItem key={source.id} value={source.id}>
                          {source.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    onClick={handleProcessUnprocessed}
                    disabled={processSignalsMutation.isPending || !signals?.some(s => !s.isProcessed)}
                    data-testid="button-process-signals"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${processSignalsMutation.isPending ? 'animate-spin' : ''}`} />
                    Process Pending
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {signalsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : signals && signals.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Confidence</TableHead>
                        <TableHead>Channel</TableHead>
                        <TableHead>Region</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {signals.map((signal) => (
                        <TableRow key={signal.id} data-testid={`row-signal-${signal.id}`}>
                          <TableCell>
                            <Badge variant="outline">
                              {signal.signalType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {sources?.find(s => s.id === signal.sourceId)?.name || "-"}
                          </TableCell>
                          <TableCell>
                            {skus?.find(s => s.id === signal.skuId)?.name || "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {signal.quantity?.toLocaleString() || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {signal.confidenceScore !== null ? (
                              <Badge 
                                variant={signal.confidenceScore >= 80 ? "default" : signal.confidenceScore >= 60 ? "secondary" : "outline"}
                              >
                                {signal.confidenceScore}%
                              </Badge>
                            ) : "-"}
                          </TableCell>
                          <TableCell>{signal.channel || "-"}</TableCell>
                          <TableCell>{signal.region || "-"}</TableCell>
                          <TableCell>
                            {signal.isProcessed ? (
                              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Processed
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(signal.signalDate), "MMM d, HH:mm")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Radio className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Signals Recorded</h3>
                  <p className="text-muted-foreground mb-4">
                    Start recording demand signals from your configured sources
                  </p>
                  <Button onClick={() => setShowAddSignalDialog(true)} data-testid="button-empty-add-signal">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Signal
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
