import { getRegimeBadge } from "@/components/RegimeBadge";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatRegimeName } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Package2, 
  MapPin, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  Network,
  ShieldAlert,
  Globe,
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import type { SupplierNode, SupplierRiskAlert } from "@shared/schema";

export default function SupplyChain() {
  const { toast } = useToast();
  const [openBatchDialog, setOpenBatchDialog] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<SupplierNode | null>(null);

  // Traceability Queries
  const { data: batches = [] as any[], isLoading: batchesLoading } = useQuery<any[]>({
    queryKey: ["/api/traceability/batches"],
  });

  const { data: events = [] as any[], isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ["/api/traceability/events"],
  });

  const { data: chainLinks = [] as any[], isLoading: linksLoading } = useQuery<any[]>({
    queryKey: ["/api/traceability/chain-links"],
  });

  const { data: materials = [] as any[] } = useQuery<any[]>({
    queryKey: ["/api/materials"],
  });

  const { data: suppliers = [] as any[] } = useQuery<any[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: regime } = useQuery<any>({
    queryKey: ["/api/economics/regime"],
  });

  // Network Intelligence Queries
  const { data: nodes = [], isLoading: nodesLoading } = useQuery<SupplierNode[]>({
    queryKey: ['/api/supply-chain/nodes'],
  });

  const { data: criticalNodes = [] } = useQuery<SupplierNode[]>({
    queryKey: ['/api/supply-chain/nodes/critical'],
  });

  const { data: activeAlerts = [] } = useQuery<SupplierRiskAlert[]>({
    queryKey: ['/api/supply-chain/alerts'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/supply-chain/alerts?active=true');
      return await response.json();
    },
  });

  // Mutations
  const createBatchMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/traceability/batches", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/traceability/batches"] });
      toast({ title: "Batch created successfully" });
      setOpenBatchDialog(false);
    },
    onError: () => {
      toast({ 
        title: "Failed to create batch", 
        variant: "destructive" 
      });
    },
  });

  const acknowledgeAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const response = await apiRequest('PUT', `/api/supply-chain/alerts/${alertId}/acknowledge`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supply-chain/alerts'] });
    },
  });

  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const response = await apiRequest('PUT', `/api/supply-chain/alerts/${alertId}/resolve`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supply-chain/alerts'] });
    },
  });

  const handleCreateBatch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createBatchMutation.mutate({
      materialId: formData.get("materialId"),
      batchNumber: formData.get("batchNumber"),
      supplierId: formData.get("supplierId"),
      quantity: parseFloat(formData.get("quantity") as string),
      unit: formData.get("unit"),
      receivedDate: new Date(formData.get("receivedDate") as string).toISOString(),
      countryOfOrigin: formData.get("countryOfOrigin"),
      lotNumber: formData.get("lotNumber"),
      poNumber: formData.get("poNumber"),
      currentLocation: formData.get("currentLocation"),
    });
  };

  // Helper functions
  const getQualityBadge = (status: string) => {
    const config = {
      approved: { variant: "default" as const, className: "bg-green-600", label: "Approved" },
      pending: { variant: "default" as const, className: "bg-yellow-600", label: "Pending" },
      rejected: { variant: "destructive" as const, className: "", label: "Rejected" },
      quarantine: { variant: "destructive" as const, className: "bg-orange-600", label: "Quarantine" },
    };
    const c = config[status as keyof typeof config] || config.pending;
    return <Badge variant={c.variant} className={c.className}>{c.label}</Badge>;
  };

  const getRiskBadge = (risk: string) => {
    const config = {
      low: { variant: "default" as const, className: "bg-green-600", label: "Low Risk" },
      medium: { variant: "default" as const, className: "bg-yellow-600", label: "Medium Risk" },
      high: { variant: "destructive" as const, className: "bg-orange-600", label: "High Risk" },
      critical: { variant: "destructive" as const, className: "", label: "Critical Risk" },
    };
    const c = config[risk as keyof typeof config] || config.medium;
    return <Badge variant={c.variant} className={c.className}>{c.label}</Badge>;
  };

  // Regime badge logic moved to @/components/RegimeBadge — single source
  // of truth across the app, palette-aligned.

  const getCriticalityColor = (criticality: string) => {
    const colors = {
      low: 'bg-blue-500',
      medium: 'bg-yellow-500',
      high: 'bg-orange-500',
      critical: 'bg-red-500',
    };
    return colors[criticality as keyof typeof colors] || 'bg-gray-500';
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30',
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/30',
    };
    return colors[severity as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getHealthIcon = (score?: number | null) => {
    if (!score) return <Activity className="w-4 h-4 text-gray-400" data-testid="icon-health-unknown" />;
    if (score >= 80) return <TrendingUp className="w-4 h-4 text-good" data-testid="icon-health-good" />;
    if (score >= 50) return <Activity className="w-4 h-4 text-signal" data-testid="icon-health-moderate" />;
    return <TrendingDown className="w-4 h-4 text-bad" data-testid="icon-health-poor" />;
  };

  // Calculations
  const activeBatches = batches.filter((b: any) => b.status === "in_stock").length;
  const qualityIssues = batches.filter((b: any) => 
    b.qualityStatus === "rejected" || b.qualityStatus === "quarantine"
  ).length;
  const avgRiskScore = chainLinks.length > 0
    ? chainLinks.reduce((acc: number, l: any) => {
        const riskMap: Record<string, number> = { low: 25, medium: 50, high: 75, critical: 100 };
        return acc + (riskMap[l.riskLevel] || 50);
      }, 0) / chainLinks.length
    : 0;

  const filteredEvents = selectedBatchId
    ? events.filter((e: any) => e.batchId === selectedBatchId)
    : events;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
<p className="text-muted-foreground mt-1">
            End-to-end material traceability and FDR-aware supplier network monitoring
          </p>
        </div>
        {regime && typeof regime.fdr === 'number' && regime.regime && (
          <Card className="w-fit">
            <CardContent className="pt-6 px-4 pb-4">
              <div className="text-sm text-muted-foreground">Current Regime</div>
              <div className="mt-1">{getRegimeBadge(regime.regime)}</div>
              <div className="text-2xl font-bold mt-1" data-testid="text-fdr">FDR: {regime.fdr.toFixed(2)}</div>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="traceability" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="traceability" data-testid="tab-traceability">
            <Package2 className="h-4 w-4 mr-2" />
            Material Traceability
          </TabsTrigger>
          <TabsTrigger value="network" data-testid="tab-network">
            <Network className="h-4 w-4 mr-2" />
            Supplier Network
          </TabsTrigger>
        </TabsList>

        {/* MATERIAL TRACEABILITY TAB */}
        <TabsContent value="traceability" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Active Batches</CardDescription>
                <CardTitle className="text-3xl" data-testid="text-active-batches">
                  {activeBatches}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {batches.length} total batches tracked
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Quality Issues (30d)</CardDescription>
                <CardTitle className="text-3xl" data-testid="text-quality-issues">
                  {qualityIssues}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {((qualityIssues / Math.max(batches.length, 1)) * 100).toFixed(1)}% of batches
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Supply Chain Risk Score</CardDescription>
                <CardTitle className="text-3xl" data-testid="text-risk-score">
                  {avgRiskScore.toFixed(0)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {chainLinks.length} supplier relationships monitored
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="batches" className="space-y-4">
            <TabsList>
              <TabsTrigger value="batches" data-testid="tab-batches">
                <Package2 className="h-4 w-4 mr-2" />
                Batches
              </TabsTrigger>
              <TabsTrigger value="events" data-testid="tab-events">
                <Clock className="h-4 w-4 mr-2" />
                Events
              </TabsTrigger>
              <TabsTrigger value="chain-analysis" data-testid="tab-chain-analysis">
                <Globe className="h-4 w-4 mr-2" />
                Chain Analysis
              </TabsTrigger>
            </TabsList>

            <TabsContent value="batches" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Material Batches</h2>
                <Dialog open={openBatchDialog} onOpenChange={setOpenBatchDialog}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-batch">
                      <Package2 className="h-4 w-4 mr-2" />
                      Add Batch
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create Material Batch</DialogTitle>
                      <DialogDescription>
                        Register a new material batch for tracking and traceability
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateBatch}>
                      <div className="grid grid-cols-2 gap-4 py-4">
                        <div>
                          <Label htmlFor="materialId">Material</Label>
                          <Select name="materialId" required>
                            <SelectTrigger data-testid="select-material">
                              <SelectValue placeholder="Select material" />
                            </SelectTrigger>
                            <SelectContent>
                              {materials.map((m: any) => (
                                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="supplierId">Supplier</Label>
                          <Select name="supplierId" required>
                            <SelectTrigger data-testid="select-supplier">
                              <SelectValue placeholder="Select supplier" />
                            </SelectTrigger>
                            <SelectContent>
                              {suppliers.map((s: any) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="batchNumber">Batch Number</Label>
                          <Input id="batchNumber" name="batchNumber" placeholder="BATCH-001" required data-testid="input-batch-number" />
                        </div>
                        <div>
                          <Label htmlFor="lotNumber">Lot Number</Label>
                          <Input id="lotNumber" name="lotNumber" placeholder="LOT-001" data-testid="input-lot-number" />
                        </div>
                        <div>
                          <Label htmlFor="quantity">Quantity</Label>
                          <Input id="quantity" name="quantity" type="number" step="0.01" required data-testid="input-quantity" />
                        </div>
                        <div>
                          <Label htmlFor="unit">Unit</Label>
                          <Input id="unit" name="unit" placeholder="kg" required data-testid="input-unit" />
                        </div>
                        <div>
                          <Label htmlFor="receivedDate">Received Date</Label>
                          <Input id="receivedDate" name="receivedDate" type="datetime-local" required data-testid="input-received-date" />
                        </div>
                        <div>
                          <Label htmlFor="poNumber">PO Number</Label>
                          <Input id="poNumber" name="poNumber" placeholder="PO-12345" data-testid="input-po-number" />
                        </div>
                        <div>
                          <Label htmlFor="countryOfOrigin">Country of Origin</Label>
                          <Input id="countryOfOrigin" name="countryOfOrigin" placeholder="USA" data-testid="input-country" />
                        </div>
                        <div>
                          <Label htmlFor="currentLocation">Current Location</Label>
                          <Input id="currentLocation" name="currentLocation" placeholder="Warehouse A" required data-testid="input-location" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" data-testid="button-submit-batch">Create Batch</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch Number</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Quality Status</TableHead>
                      <TableHead>Certifications</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchesLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                      </TableRow>
                    ) : batches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No batches found. Create your first batch to start tracking materials.
                        </TableCell>
                      </TableRow>
                    ) : (
                      batches.map((batch: any) => {
                        const material = materials.find((m: any) => m.id === batch.materialId);
                        const supplier = suppliers.find((s: any) => s.id === batch.supplierId);
                        return (
                          <TableRow key={batch.id} data-testid={`row-batch-${batch.id}`}>
                            <TableCell className="font-mono">{batch.batchNumber}</TableCell>
                            <TableCell>{material?.name || 'Unknown'}</TableCell>
                            <TableCell>{supplier?.name || 'Unknown'}</TableCell>
                            <TableCell>{batch.quantity} {batch.unit}</TableCell>
                            <TableCell>{getQualityBadge(batch.qualityStatus)}</TableCell>
                            <TableCell>
                              {batch.certifications?.length > 0 ? (
                                <div className="flex gap-1">
                                  {batch.certifications.map((cert: string, idx: number) => (
                                    <Badge key={idx} variant="outline" className="text-xs">{cert}</Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">None</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setSelectedBatchId(batch.id);
                                  document.querySelector('[data-testid="tab-events"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                                }}
                                data-testid={`button-track-${batch.id}`}
                              >
                                Track
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="events" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Traceability Timeline</h2>
                {selectedBatchId && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setSelectedBatchId(null)}
                    data-testid="button-clear-filter"
                  >
                    Show All Events
                  </Button>
                )}
              </div>

              {eventsLoading ? (
                <Card><CardContent className="p-6">Loading events...</CardContent></Card>
              ) : filteredEvents.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No traceability events recorded yet.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredEvents.map((event: any) => {
                    const batch = batches.find((b: any) => b.id === event.batchId);
                    return (
                      <Card key={event.id} data-testid={`card-event-${event.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="capitalize">
                                  {event.eventType.replace(/_/g, ' ')}
                                </Badge>
                                {batch && (
                                  <span className="text-sm font-mono text-muted-foreground">{batch.batchNumber}</span>
                                )}
                              </div>
                              <p className="text-sm">{event.eventDescription}</p>
                              {event.location && (
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {event.location}
                                </p>
                              )}
                            </div>
                            <div className="text-right text-sm text-muted-foreground">
                              {format(new Date(event.timestamp), "PPp")}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="chain-analysis" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Supplier Chain Analysis</h2>
              </div>

              {linksLoading ? (
                <Card><CardContent className="p-6">Loading supply chain data...</CardContent></Card>
              ) : chainLinks.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No supply chain links configured yet.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {chainLinks.map((link: any) => {
                    const material = materials.find((m: any) => m.id === link.materialId);
                    const primarySupplier = suppliers.find((s: any) => s.id === link.primarySupplierId);
                    return (
                      <Card key={link.id} data-testid={`card-chain-link-${link.id}`}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{material?.name || 'Material'}</CardTitle>
                              <CardDescription>Primary: {primarySupplier?.name || 'Unknown'}</CardDescription>
                            </div>
                            <div className="flex gap-2">
                              {getRiskBadge(link.riskLevel)}
                              {link.singleSourceRisk === 1 && (
                                <Badge variant="destructive" className="flex items-center gap-1">
                                  <ShieldAlert className="h-3 w-3" />
                                  Single Source
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">Geographic Diversification</div>
                              <div className="font-medium capitalize">{link.geographicDiversification || 'Unknown'}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Lead Time Reliability</div>
                              <div className="font-medium">{link.leadTimeReliability?.toFixed(0)}%</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Quality Score</div>
                              <div className="font-medium">{link.qualityScore?.toFixed(0)}/100</div>
                            </div>
                          </div>

                          {link.alternativeSuppliers && link.alternativeSuppliers.length > 0 && (
                            <div>
                              <div className="text-sm font-medium mb-2">Alternative Suppliers:</div>
                              <div className="flex gap-2">
                                {link.alternativeSuppliers.map((suppId: string, idx: number) => {
                                  const altSupp = suppliers.find((s: any) => s.id === suppId);
                                  return (
                                    <Badge key={idx} variant="outline">{altSupp?.name || suppId}</Badge>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {link.contingencyPlan && (
                            <div className="p-3 bg-muted rounded-md">
                              <div className="text-sm font-medium mb-1">Contingency Plan</div>
                              <p className="text-xs">{link.contingencyPlan}</p>
                            </div>
                          )}

                          {link.lastDisruptionDate && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <AlertTriangle className="h-4 w-4" />
                              Last disruption: {format(new Date(link.lastDisruptionDate), "PPP")}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* SUPPLIER NETWORK TAB */}
        <TabsContent value="network" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
                <Network className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-total-suppliers">{nodes.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Critical Suppliers</CardTitle>
                <Shield className="w-4 h-4 text-bad" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-critical-suppliers">{criticalNodes.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                <AlertTriangle className="w-4 h-4 text-signal" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-active-alerts">{activeAlerts.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Health Score</CardTitle>
                <Activity className="w-4 h-4 text-good" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-avg-health">
                  {nodes.length > 0
                    ? Math.round(nodes.reduce((sum, n) => sum + (n.financialHealthScore || 50), 0) / nodes.length)
                    : 0}
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="suppliers" className="space-y-4">
            <TabsList>
              <TabsTrigger value="suppliers" data-testid="tab-suppliers">Suppliers</TabsTrigger>
              <TabsTrigger value="alerts" data-testid="tab-alerts">
                Risk Alerts {activeAlerts.length > 0 && `(${activeAlerts.length})`}
              </TabsTrigger>
              <TabsTrigger value="critical" data-testid="tab-critical">Critical Suppliers</TabsTrigger>
            </TabsList>

            <TabsContent value="suppliers" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Supplier Network</CardTitle>
                  <CardDescription>All suppliers with health and risk metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  {nodesLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading suppliers...</div>
                  ) : nodes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No supplier nodes found</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Supplier</TableHead>
                            <TableHead>Tier</TableHead>
                            <TableHead>Criticality</TableHead>
                            <TableHead>Health Score</TableHead>
                            <TableHead>Bankruptcy Risk</TableHead>
                            <TableHead>On-Time %</TableHead>
                            <TableHead>Quality</TableHead>
                            <TableHead>Region</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {nodes.map((node) => (
                            <TableRow 
                              key={node.id} 
                              className="cursor-pointer hover-elevate"
                              onClick={() => setSelectedNode(node)}
                              data-testid={`row-supplier-${node.id}`}
                            >
                              <TableCell className="font-medium" data-testid={`text-supplier-name-${node.id}`}>
                                <div className="flex items-center gap-2">
                                  {getHealthIcon(node.financialHealthScore)}
                                  <span>Supplier {node.supplierId.slice(0, 8)}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" data-testid={`badge-tier-${node.id}`}>Tier {node.tier}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${getCriticalityColor(node.criticality)}`} />
                                  <span className="capitalize" data-testid={`text-criticality-${node.id}`}>{node.criticality}</span>
                                </div>
                              </TableCell>
                              <TableCell data-testid={`text-health-score-${node.id}`}>
                                {node.financialHealthScore?.toFixed(0) || 'N/A'}
                              </TableCell>
                              <TableCell data-testid={`text-bankruptcy-risk-${node.id}`}>
                                <Badge variant={node.bankruptcyRisk && node.bankruptcyRisk > 50 ? "destructive" : "secondary"}>
                                  {node.bankruptcyRisk?.toFixed(0) || 'N/A'}%
                                </Badge>
                              </TableCell>
                              <TableCell data-testid={`text-delivery-rate-${node.id}`}>
                                {node.onTimeDeliveryRate?.toFixed(0) || 'N/A'}%
                              </TableCell>
                              <TableCell data-testid={`text-quality-score-${node.id}`}>
                                {node.qualityScore?.toFixed(0) || 'N/A'}
                              </TableCell>
                              <TableCell data-testid={`text-region-${node.id}`}>
                                {node.region || 'Unknown'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-4">
              {activeAlerts.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-12 h-12 mx-auto text-good mb-4" />
                      <h3 className="text-lg font-semibold">No Active Alerts</h3>
                      <p className="text-muted-foreground">All suppliers are operating within normal parameters</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {activeAlerts.map((alert) => (
                    <Card key={alert.id} data-testid={`card-alert-${alert.id}`}>
                      <CardHeader>
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle className="w-5 h-5 text-signal flex-shrink-0" />
                              <CardTitle className="text-lg" data-testid={`text-alert-title-${alert.id}`}>{alert.title}</CardTitle>
                            </div>
                            <Badge className={getSeverityColor(alert.severity)} data-testid={`badge-severity-${alert.id}`}>
                              {alert.severity.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="ml-2" data-testid={`badge-type-${alert.id}`}>
                              {alert.alertType.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            {!alert.acknowledgedAt && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => acknowledgeAlert.mutate(alert.id)}
                                disabled={acknowledgeAlert.isPending}
                                data-testid={`button-acknowledge-${alert.id}`}
                              >
                                Acknowledge
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => resolveAlert.mutate(alert.id)}
                              disabled={resolveAlert.isPending}
                              data-testid={`button-resolve-${alert.id}`}
                            >
                              Resolve
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground" data-testid={`text-description-${alert.id}`}>{alert.description}</p>
                        
                        {alert.recommendedAction && (
                          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                            <h4 className="text-sm font-semibold mb-2">Recommended Action</h4>
                            <p className="text-sm" data-testid={`text-action-${alert.id}`}>{alert.recommendedAction}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          {alert.fdr && (
                            <div>
                              <span className="text-muted-foreground">FDR:</span>
                              <span className="ml-2 font-medium" data-testid={`text-fdr-${alert.id}`}>{alert.fdr.toFixed(2)}</span>
                            </div>
                          )}
                          {alert.regime && (
                            <div>
                              <span className="text-muted-foreground">Regime:</span>
                              <span className="ml-2 font-medium" data-testid={`text-regime-${alert.id}`}>{formatRegimeName(alert.regime)}</span>
                            </div>
                          )}
                          {alert.riskScore && (
                            <div>
                              <span className="text-muted-foreground">Risk Score:</span>
                              <span className="ml-2 font-medium" data-testid={`text-risk-score-${alert.id}`}>{alert.riskScore.toFixed(0)}</span>
                            </div>
                          )}
                          {alert.downstreamRisk && (
                            <div>
                              <span className="text-muted-foreground">Downstream Risk:</span>
                              <span className="ml-2 font-medium" data-testid={`text-downstream-${alert.id}`}>{alert.downstreamRisk.toFixed(0)}%</span>
                            </div>
                          )}
                        </div>

                        {alert.estimatedImpact && (
                          <div className="pt-2 border-t">
                            <span className="text-sm text-muted-foreground">Estimated Impact: </span>
                            <span className="text-sm font-semibold text-red-600" data-testid={`text-impact-${alert.id}`}>
                              ${alert.estimatedImpact.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="critical" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Critical Suppliers</CardTitle>
                  <CardDescription>High and critical priority suppliers requiring close monitoring</CardDescription>
                </CardHeader>
                <CardContent>
                  {criticalNodes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No critical suppliers found</div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {criticalNodes.map((node) => (
                        <Card key={node.id} className="hover-elevate cursor-pointer" onClick={() => setSelectedNode(node)} data-testid={`card-critical-${node.id}`}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-base" data-testid={`text-critical-name-${node.id}`}>
                                  Supplier {node.supplierId.slice(0, 8)}
                                </CardTitle>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline">Tier {node.tier}</Badge>
                                  <Badge className={getCriticalityColor(node.criticality) + ' text-white'}>
                                    {node.criticality}
                                  </Badge>
                                </div>
                              </div>
                              {getHealthIcon(node.financialHealthScore)}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Health:</span>
                              <span className="font-medium">{node.financialHealthScore?.toFixed(0) || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Bankruptcy Risk:</span>
                              <span className="font-medium text-red-600">{node.bankruptcyRisk?.toFixed(0) || 'N/A'}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Delivery:</span>
                              <span className="font-medium">{node.onTimeDeliveryRate?.toFixed(0) || 'N/A'}%</span>
                            </div>
                            {node.region && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Region:</span>
                                <span className="font-medium">{node.region}</span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
