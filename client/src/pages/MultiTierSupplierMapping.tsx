import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Network, 
  AlertTriangle, 
  Link2, 
  MapPin, 
  Shield, 
  TrendingDown,
  CheckCircle2,
  XCircle,
  Filter,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  Plus,
  GitBranch,
  Globe,
  ChevronRight
} from "lucide-react";

interface NetworkNode {
  id: string;
  name: string;
  contactEmail: string;
  tier: number;
  tierLabel: string;
  region?: string;
  country?: string;
  coordinates?: string;
  riskRegion: number;
  regionRiskLevel: string;
  regionRiskScore: number;
  spendShare: number;
  dependencyWeight: number;
  alternativesCount: number;
  dataConfidence: number;
}

interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  volumeShare: number;
  isCriticalPath: boolean;
  isSingleSource: boolean;
  riskScore: number;
  leadTimeDays: number;
  qualityScore: number;
}

interface NetworkAnalysis {
  summary: {
    totalSuppliers: number;
    totalTiers: number;
    totalRelationships: number;
    singleSourceCount: number;
    highRiskRegionCount: number;
    activeAlerts: number;
  };
  singleSourceDependencies: Array<{
    supplierId: string;
    supplierName: string;
    parentSupplierId: string;
    tier: number;
    volumeShare: number;
    riskScore: number;
  }>;
  countryConcentration: Array<{
    country: string;
    count: number;
    totalSpend: number;
    suppliers: string[];
    concentrationRisk: string;
  }>;
  highRiskRegionSuppliers: Array<{
    supplierId: string;
    supplierName: string;
    tier: number;
    country: string;
    region: string;
    riskLevel: string;
    riskScore: number;
    riskFactors: any;
  }>;
  tierDistribution: Array<{ tier: number; count: number }>;
  criticalPaths: number;
  recommendations: Array<{
    priority: string;
    type: string;
    message: string;
  }>;
}

interface SupplierTierAlert {
  id: string;
  alertType: string;
  severity: string;
  title: string;
  description: string;
  supplierId: string;
  tier: number;
  status: string;
  createdAt: string;
}

const tierFormSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  tier: z.number().min(1).max(10),
  tierLabel: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  spendShare: z.number().min(0).max(100).optional(),
  dependencyWeight: z.number().min(0).max(100).optional(),
  alternativesCount: z.number().min(0).optional(),
});

const relationshipFormSchema = z.object({
  parentSupplierId: z.string().min(1, "Parent supplier is required"),
  childSupplierId: z.string().min(1, "Child supplier is required"),
  relationshipType: z.string().min(1),
  volumeShare: z.number().min(0).max(100).optional(),
  isCriticalPath: z.boolean().optional(),
  isSingleSource: z.boolean().optional(),
  leadTimeDays: z.number().min(0).optional(),
  qualityScore: z.number().min(0).max(100).optional(),
});

export default function MultiTierSupplierMapping() {
  const [activeTab, setActiveTab] = useState("network");
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [tierFilter, setTierFilter] = useState<number | null>(null);
  const [showAddTierDialog, setShowAddTierDialog] = useState(false);
  const [showAddRelationshipDialog, setShowAddRelationshipDialog] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: networkData, isLoading: networkLoading, refetch: refetchNetwork } = useQuery<{ nodes: NetworkNode[]; edges: NetworkEdge[] }>({
    queryKey: ["/api/supplier-network/graph"],
  });

  const { data: analysisData, isLoading: analysisLoading, refetch: refetchAnalysis } = useQuery<NetworkAnalysis>({
    queryKey: ["/api/supplier-network/analysis"],
  });

  const { data: alerts, refetch: refetchAlerts } = useQuery<SupplierTierAlert[]>({
    queryKey: ["/api/supplier-tier-alerts"],
  });

  const { data: suppliers } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/suppliers"],
  });

  const tierForm = useForm({
    resolver: zodResolver(tierFormSchema),
    defaultValues: {
      supplierId: "",
      tier: 1,
      tierLabel: "",
      region: "",
      country: "",
      spendShare: 0,
      dependencyWeight: 0,
      alternativesCount: 0,
    },
  });

  const relationshipForm = useForm({
    resolver: zodResolver(relationshipFormSchema),
    defaultValues: {
      parentSupplierId: "",
      childSupplierId: "",
      relationshipType: "tier_supplier",
      volumeShare: 0,
      isCriticalPath: false,
      isSingleSource: false,
      leadTimeDays: 0,
      qualityScore: 100,
    },
  });

  const createTierMutation = useMutation({
    mutationFn: (data: z.infer<typeof tierFormSchema>) => apiRequest("POST", "/api/supplier-tiers", data),
    onSuccess: () => {
      toast({ title: "Supplier tier configured successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-network/graph"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-network/analysis"] });
      setShowAddTierDialog(false);
      tierForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Failed to configure tier", description: error.message, variant: "destructive" });
    },
  });

  const createRelationshipMutation = useMutation({
    mutationFn: (data: z.infer<typeof relationshipFormSchema>) => apiRequest("POST", "/api/supplier-relationships", data),
    onSuccess: () => {
      toast({ title: "Relationship created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-network/graph"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-network/analysis"] });
      setShowAddRelationshipDialog(false);
      relationshipForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Failed to create relationship", description: error.message, variant: "destructive" });
    },
  });

  const acknowledgeAlertMutation = useMutation({
    mutationFn: (alertId: string) => apiRequest("POST", `/api/supplier-tier-alerts/${alertId}/acknowledge`),
    onSuccess: () => {
      toast({ title: "Alert acknowledged" });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-tier-alerts"] });
    },
  });

  const resolveAlertMutation = useMutation({
    mutationFn: ({ alertId, resolution }: { alertId: string; resolution: string }) => 
      apiRequest("POST", `/api/supplier-tier-alerts/${alertId}/resolve`, { resolution }),
    onSuccess: () => {
      toast({ title: "Alert resolved" });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-tier-alerts"] });
    },
  });

  const filteredNodes = networkData?.nodes?.filter(n => tierFilter === null || n.tier === tierFilter) || [];
  const filteredEdges = networkData?.edges?.filter(e => 
    filteredNodes.some(n => n.id === e.source) && filteredNodes.some(n => n.id === e.target)
  ) || [];

  const getTierColor = (tier: number) => {
    const colors = [
      "hsl(var(--primary))",
      "hsl(var(--accent))",
      "hsl(200 80% 50%)",
      "hsl(280 80% 50%)",
      "hsl(30 80% 50%)",
    ];
    return colors[(tier - 1) % colors.length];
  };

  const getRiskBadgeVariant = (risk: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (risk) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "medium": return "secondary";
      default: return "outline";
    }
  };

  const handleRefresh = () => {
    refetchNetwork();
    refetchAnalysis();
    refetchAlerts();
  };

  return (
    <div className="h-full flex flex-col p-6 gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" data-testid="heading-multitier-mapping">Multi-Tier Supplier Mapping</h2>
          <p className="text-sm text-muted-foreground">Visualize and analyze your complete supplier network across all tiers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} data-testid="button-refresh-network">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={showAddTierDialog} onOpenChange={setShowAddTierDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-add-tier">
                <Plus className="h-4 w-4 mr-2" />
                Add Tier
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configure Supplier Tier</DialogTitle>
              </DialogHeader>
              <Form {...tierForm}>
                <form onSubmit={tierForm.handleSubmit((data) => createTierMutation.mutate(data))} className="space-y-4">
                  <FormField control={tierForm.control} name="supplierId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-supplier-tier">
                            <SelectValue placeholder="Select supplier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {suppliers?.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={tierForm.control} name="tier" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tier Level</FormLabel>
                        <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger data-testid="select-tier-level">
                              <SelectValue placeholder="Select tier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((t) => (
                              <SelectItem key={t} value={t.toString()}>Tier {t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={tierForm.control} name="tierLabel" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tier Label</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Raw Materials" data-testid="input-tier-label" />
                        </FormControl>
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={tierForm.control} name="country" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., China" data-testid="input-country" />
                        </FormControl>
                      </FormItem>
                    )} />
                    <FormField control={tierForm.control} name="region" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Region</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Asia-Pacific" data-testid="input-region" />
                        </FormControl>
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={tierForm.control} name="spendShare" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Spend Share (%)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value))} data-testid="input-spend-share" />
                        </FormControl>
                      </FormItem>
                    )} />
                    <FormField control={tierForm.control} name="alternativesCount" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alternative Suppliers</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} data-testid="input-alternatives" />
                        </FormControl>
                      </FormItem>
                    )} />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createTierMutation.isPending} data-testid="button-save-tier">
                      {createTierMutation.isPending ? "Saving..." : "Save Tier"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          <Dialog open={showAddRelationshipDialog} onOpenChange={setShowAddRelationshipDialog}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-relationship">
                <Link2 className="h-4 w-4 mr-2" />
                Add Relationship
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Supplier Relationship</DialogTitle>
              </DialogHeader>
              <Form {...relationshipForm}>
                <form onSubmit={relationshipForm.handleSubmit((data) => createRelationshipMutation.mutate(data))} className="space-y-4">
                  <FormField control={relationshipForm.control} name="parentSupplierId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Supplier (Tier N)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-parent-supplier">
                            <SelectValue placeholder="Select parent supplier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {suppliers?.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={relationshipForm.control} name="childSupplierId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Child Supplier (Tier N+1)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-child-supplier">
                            <SelectValue placeholder="Select child supplier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {suppliers?.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={relationshipForm.control} name="relationshipType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-relationship-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="tier_supplier">Tier Supplier</SelectItem>
                          <SelectItem value="subcontractor">Subcontractor</SelectItem>
                          <SelectItem value="raw_material">Raw Material Provider</SelectItem>
                          <SelectItem value="component">Component Supplier</SelectItem>
                          <SelectItem value="logistics">Logistics Partner</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={relationshipForm.control} name="volumeShare" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Volume Share (%)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value))} data-testid="input-volume-share" />
                        </FormControl>
                      </FormItem>
                    )} />
                    <FormField control={relationshipForm.control} name="leadTimeDays" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lead Time (days)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} data-testid="input-lead-time" />
                        </FormControl>
                      </FormItem>
                    )} />
                  </div>
                  <div className="flex gap-4">
                    <FormField control={relationshipForm.control} name="isCriticalPath" render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormLabel className="text-sm">Critical Path</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-critical-path" />
                        </FormControl>
                      </FormItem>
                    )} />
                    <FormField control={relationshipForm.control} name="isSingleSource" render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormLabel className="text-sm">Single Source</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-single-source" />
                        </FormControl>
                      </FormItem>
                    )} />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createRelationshipMutation.isPending} data-testid="button-save-relationship">
                      {createRelationshipMutation.isPending ? "Saving..." : "Create Relationship"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Network className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Suppliers</span>
            </div>
            <div className="text-2xl font-bold" data-testid="stat-total-suppliers">
              {analysisLoading ? <Skeleton className="h-8 w-16" /> : analysisData?.summary.totalSuppliers || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Max Tiers</span>
            </div>
            <div className="text-2xl font-bold" data-testid="stat-max-tiers">
              {analysisLoading ? <Skeleton className="h-8 w-16" /> : analysisData?.summary.totalTiers || 1}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Single Source</span>
            </div>
            <div className="text-2xl font-bold text-orange-500" data-testid="stat-single-source">
              {analysisLoading ? <Skeleton className="h-8 w-16" /> : analysisData?.summary.singleSourceCount || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">High-Risk Region</span>
            </div>
            <div className="text-2xl font-bold text-red-500" data-testid="stat-high-risk-region">
              {analysisLoading ? <Skeleton className="h-8 w-16" /> : analysisData?.summary.highRiskRegionCount || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Active Alerts</span>
            </div>
            <div className="text-2xl font-bold" data-testid="stat-active-alerts">
              {analysisLoading ? <Skeleton className="h-8 w-16" /> : analysisData?.summary.activeAlerts || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList>
          <TabsTrigger value="network" data-testid="tab-network-graph">
            <Network className="h-4 w-4 mr-2" />
            Network Graph
          </TabsTrigger>
          <TabsTrigger value="dependencies" data-testid="tab-dependencies">
            <Link2 className="h-4 w-4 mr-2" />
            Dependencies
          </TabsTrigger>
          <TabsTrigger value="regions" data-testid="tab-regions">
            <Globe className="h-4 w-4 mr-2" />
            Regional Risks
          </TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-alerts">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Alerts
            {alerts && alerts.filter(a => a.status === "active").length > 0 && (
              <Badge variant="destructive" className="ml-2">{alerts.filter(a => a.status === "active").length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="network" className="flex-1 mt-4">
          <div className="grid grid-cols-3 gap-4 h-full">
            <Card className="col-span-2">
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-base">Supplier Network Visualization</CardTitle>
                <div className="flex gap-2">
                  <Select value={tierFilter?.toString() || "all"} onValueChange={(v) => setTierFilter(v === "all" ? null : parseInt(v))}>
                    <SelectTrigger className="w-32" data-testid="filter-tier">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      {[1, 2, 3, 4, 5].map(t => (
                        <SelectItem key={t} value={t.toString()}>Tier {t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={() => setZoomLevel(z => Math.min(z + 0.2, 2))} data-testid="button-zoom-in">
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setZoomLevel(z => Math.max(z - 0.2, 0.5))} data-testid="button-zoom-out">
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="h-[400px] relative overflow-hidden" ref={canvasRef}>
                {networkLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : filteredNodes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Network className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">No supplier network data</p>
                    <p className="text-sm">Add suppliers and configure tier relationships to visualize your network</p>
                  </div>
                ) : (
                  <svg width="100%" height="100%" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}>
                    <defs>
                      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--muted-foreground))" />
                      </marker>
                      <marker id="arrowhead-critical" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--primary))" />
                      </marker>
                    </defs>
                    {filteredEdges.map((edge) => {
                      const sourceNode = filteredNodes.find(n => n.id === edge.source);
                      const targetNode = filteredNodes.find(n => n.id === edge.target);
                      if (!sourceNode || !targetNode) return null;
                      
                      const sourceX = 100 + (sourceNode.tier - 1) * 200;
                      const targetX = 100 + (targetNode.tier - 1) * 200;
                      const sourceY = 50 + filteredNodes.filter(n => n.tier === sourceNode.tier).indexOf(sourceNode) * 80;
                      const targetY = 50 + filteredNodes.filter(n => n.tier === targetNode.tier).indexOf(targetNode) * 80;
                      
                      return (
                        <line
                          key={edge.id}
                          x1={sourceX + 30}
                          y1={sourceY}
                          x2={targetX - 30}
                          y2={targetY}
                          stroke={edge.isCriticalPath ? "hsl(var(--primary))" : edge.isSingleSource ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))"}
                          strokeWidth={edge.isCriticalPath ? 3 : 1.5}
                          strokeDasharray={edge.isSingleSource ? "5,5" : "none"}
                          markerEnd={edge.isCriticalPath ? "url(#arrowhead-critical)" : "url(#arrowhead)"}
                          className="transition-all duration-200"
                        />
                      );
                    })}
                    {filteredNodes.map((node) => {
                      const tierNodes = filteredNodes.filter(n => n.tier === node.tier);
                      const nodeIndex = tierNodes.indexOf(node);
                      const x = 100 + (node.tier - 1) * 200;
                      const y = 50 + nodeIndex * 80;
                      
                      return (
                        <g
                          key={node.id}
                          className="cursor-pointer"
                          onClick={() => setSelectedNode(node)}
                          onMouseEnter={() => setHoveredNode(node.id)}
                          onMouseLeave={() => setHoveredNode(null)}
                        >
                          <circle
                            cx={x}
                            cy={y}
                            r={hoveredNode === node.id ? 28 : 24}
                            fill={getTierColor(node.tier)}
                            opacity={node.regionRiskLevel === "high" || node.regionRiskLevel === "critical" ? 0.9 : 0.7}
                            stroke={selectedNode?.id === node.id ? "hsl(var(--foreground))" : node.regionRiskLevel === "high" || node.regionRiskLevel === "critical" ? "hsl(var(--destructive))" : "none"}
                            strokeWidth={selectedNode?.id === node.id ? 3 : 2}
                            className="transition-all duration-200"
                          />
                          <text
                            x={x}
                            y={y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="white"
                            fontSize="10"
                            fontWeight="500"
                            className="pointer-events-none"
                          >
                            T{node.tier}
                          </text>
                          <text
                            x={x}
                            y={y + 40}
                            textAnchor="middle"
                            fill="hsl(var(--foreground))"
                            fontSize="11"
                            className="pointer-events-none"
                          >
                            {node.name.length > 15 ? node.name.slice(0, 15) + "..." : node.name}
                          </text>
                          {(node.regionRiskLevel === "high" || node.regionRiskLevel === "critical") && (
                            <g transform={`translate(${x + 18}, ${y - 18})`}>
                              <circle r="8" fill="hsl(var(--destructive))" />
                              <text x="0" y="4" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">!</text>
                            </g>
                          )}
                        </g>
                      );
                    })}
                    {[1, 2, 3, 4, 5].filter(t => filteredNodes.some(n => n.tier === t)).map(tier => (
                      <text
                        key={tier}
                        x={100 + (tier - 1) * 200}
                        y={20}
                        textAnchor="middle"
                        fill="hsl(var(--muted-foreground))"
                        fontSize="12"
                        fontWeight="500"
                      >
                        Tier {tier}
                      </text>
                    ))}
                  </svg>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">
                  {selectedNode ? "Supplier Details" : "Select a Supplier"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedNode ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-lg font-medium">{selectedNode.name}</div>
                      <Badge variant="outline" className="mt-1" style={{ borderColor: getTierColor(selectedNode.tier), color: getTierColor(selectedNode.tier) }}>
                        Tier {selectedNode.tier} - {selectedNode.tierLabel || "Supplier"}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Country</span>
                        <span>{selectedNode.country || "Not specified"}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Region</span>
                        <span>{selectedNode.region || "Not specified"}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Region Risk</span>
                        <Badge variant={getRiskBadgeVariant(selectedNode.regionRiskLevel)}>
                          {selectedNode.regionRiskLevel}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Spend Share</span>
                        <span>{selectedNode.spendShare}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Alternatives</span>
                        <span>{selectedNode.alternativesCount} suppliers</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Data Confidence</span>
                        <span>{selectedNode.dataConfidence}%</span>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t">
                      <div className="text-sm font-medium mb-2">Relationships</div>
                      <div className="space-y-1">
                        {filteredEdges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).map(edge => {
                          const otherNode = filteredNodes.find(n => n.id === (edge.source === selectedNode.id ? edge.target : edge.source));
                          return (
                            <div key={edge.id} className="flex items-center justify-between text-sm bg-muted/50 rounded px-2 py-1">
                              <div className="flex items-center gap-1">
                                <ChevronRight className="h-3 w-3" />
                                <span>{otherNode?.name || "Unknown"}</span>
                              </div>
                              <div className="flex gap-1">
                                {edge.isCriticalPath && <Badge variant="default" className="text-xs">Critical</Badge>}
                                {edge.isSingleSource && <Badge variant="destructive" className="text-xs">Single</Badge>}
                              </div>
                            </div>
                          );
                        })}
                        {filteredEdges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).length === 0 && (
                          <p className="text-sm text-muted-foreground">No relationships defined</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                    <Eye className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">Click on a node to view details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="dependencies" className="flex-1 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Single-Source Dependencies
                </CardTitle>
                <CardDescription>Suppliers with no alternatives in the supply chain</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {analysisLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                    </div>
                  ) : analysisData?.singleSourceDependencies.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                      <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
                      <p>No single-source dependencies detected</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(analysisData?.singleSourceDependencies ?? []).map((dep) => (
                        <div key={dep.supplierId} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{dep.supplierName}</div>
                              <div className="text-sm text-muted-foreground">Tier {dep.tier} • Volume: {dep.volumeShare}%</div>
                            </div>
                            <Badge variant="destructive">Single Source</Badge>
                          </div>
                          <div className="mt-2 text-sm text-muted-foreground">
                            Risk Score: <span className="text-foreground font-medium">{dep.riskScore}/100</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-blue-500" />
                  Tier Distribution
                </CardTitle>
                <CardDescription>Supplier count by tier level</CardDescription>
              </CardHeader>
              <CardContent>
                {analysisLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <div className="space-y-4">
                    {(analysisData?.tierDistribution ?? []).map((td) => (
                      <div key={td.tier}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Tier {td.tier}</span>
                          <span className="font-medium">{td.count} suppliers</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full transition-all duration-500"
                            style={{ 
                              width: `${(td.count / (analysisData?.summary.totalSuppliers || 1)) * 100}%`,
                              backgroundColor: getTierColor(td.tier)
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    
                    <div className="pt-4 border-t mt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Critical Paths</span>
                        <span className="font-medium">{analysisData?.criticalPaths || 0}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-muted-foreground">Total Relationships</span>
                        <span className="font-medium">{analysisData?.summary.totalRelationships || 0}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {analysisData?.recommendations && analysisData.recommendations.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {analysisData.recommendations.map((rec, idx) => (
                    <div key={idx} className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={rec.priority === "high" ? "destructive" : "secondary"}>
                          {rec.priority}
                        </Badge>
                        <span className="text-sm font-medium capitalize">{rec.type.replace(/_/g, " ")}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{rec.message}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="regions" className="flex-1 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-red-500" />
                  High-Risk Region Suppliers
                </CardTitle>
                <CardDescription>Suppliers located in regions with elevated risk</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[350px]">
                  {analysisLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                    </div>
                  ) : analysisData?.highRiskRegionSuppliers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                      <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
                      <p>No suppliers in high-risk regions</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(analysisData?.highRiskRegionSuppliers ?? []).map((supplier) => (
                        <div key={supplier.supplierId} className="p-3 border rounded-lg border-destructive/30 bg-destructive/5">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium">{supplier.supplierName}</div>
                            <Badge variant={getRiskBadgeVariant(supplier.riskLevel)}>
                              {supplier.riskLevel}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Tier {supplier.tier}</span>
                            <span>{supplier.country}</span>
                            <span>{supplier.region}</span>
                          </div>
                          <div className="mt-2 text-sm">
                            Risk Score: <span className="text-destructive font-medium">{supplier.riskScore}/100</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-500" />
                  Geographic Concentration
                </CardTitle>
                <CardDescription>Supplier distribution by country</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[350px]">
                  {analysisLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                    </div>
                  ) : analysisData?.countryConcentration.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                      <Globe className="h-8 w-8 opacity-50 mb-2" />
                      <p>No geographic data available</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(analysisData?.countryConcentration ?? []).map((cc) => (
                        <div key={cc.country} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium">{cc.country}</div>
                            <Badge variant={getRiskBadgeVariant(cc.concentrationRisk)}>
                              {cc.concentrationRisk} concentration
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{cc.count} suppliers</span>
                            <span>{cc.totalSpend.toFixed(1)}% spend</span>
                          </div>
                          <div className="mt-2">
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary transition-all duration-500"
                                style={{ width: `${Math.min(cc.totalSpend, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="flex-1 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Supplier Network Alerts
              </CardTitle>
              <CardDescription>Active and recent alerts for your supplier network</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {!alerts || alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                    <p className="text-lg font-medium">No Active Alerts</p>
                    <p className="text-sm">Your supplier network is healthy</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <div 
                        key={alert.id} 
                        className={`p-4 border rounded-lg ${
                          alert.status === "active" ? "border-destructive/50 bg-destructive/5" : 
                          alert.status === "acknowledged" ? "border-orange-500/50 bg-orange-50/5" : 
                          "border-muted"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant={getRiskBadgeVariant(alert.severity)}>
                                {alert.severity}
                              </Badge>
                              <Badge variant="outline">{alert.alertType}</Badge>
                              <Badge variant={alert.status === "active" ? "destructive" : alert.status === "acknowledged" ? "secondary" : "outline"}>
                                {alert.status}
                              </Badge>
                            </div>
                            <div className="font-medium mt-2">{alert.title}</div>
                            <div className="text-sm text-muted-foreground mt-1">{alert.description}</div>
                            <div className="text-xs text-muted-foreground mt-2">
                              Tier {alert.tier} • {new Date(alert.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          {alert.status !== "resolved" && (
                            <div className="flex gap-2">
                              {alert.status === "active" && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => acknowledgeAlertMutation.mutate(alert.id)}
                                  disabled={acknowledgeAlertMutation.isPending}
                                  data-testid={`button-acknowledge-alert-${alert.id}`}
                                >
                                  Acknowledge
                                </Button>
                              )}
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => resolveAlertMutation.mutate({ alertId: alert.id, resolution: "Resolved by user" })}
                                disabled={resolveAlertMutation.isPending}
                                data-testid={`button-resolve-alert-${alert.id}`}
                              >
                                Resolve
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
