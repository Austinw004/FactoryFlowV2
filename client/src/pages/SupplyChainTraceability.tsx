import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  Globe
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

export default function SupplyChainTraceability() {
  const { toast } = useToast();
  const [openBatchDialog, setOpenBatchDialog] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const { data: batches = [], isLoading: batchesLoading } = useQuery({
    queryKey: ["/api/traceability/batches"],
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/traceability/events"],
  });

  const { data: chainLinks = [], isLoading: linksLoading } = useQuery({
    queryKey: ["/api/traceability/chain-links"],
  });

  const { data: materials = [] } = useQuery({
    queryKey: ["/api/materials"],
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["/api/suppliers"],
  });

  const { data: regime } = useQuery({
    queryKey: ["/api/economics/regime"],
  });

  const createBatchMutation = useMutation({
    mutationFn: async (data: any) => 
      apiRequest("/api/traceability/batches", {
        method: "POST",
        body: JSON.stringify(data),
      }),
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

  const getQualityBadge = (status: string) => {
    const config = {
      approved: { variant: "default" as const, className: "bg-green-600", label: "Approved" },
      pending: { variant: "default" as const, className: "bg-yellow-600", label: "Pending" },
      rejected: { variant: "destructive" as const, label: "Rejected" },
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
      critical: { variant: "destructive" as const, label: "Critical Risk" },
    };
    const c = config[risk as keyof typeof config] || config.medium;
    return <Badge variant={c.variant} className={c.className}>{c.label}</Badge>;
  };

  const getRegimeBadge = (regimeName: string) => {
    const regimeConfig = {
      HEALTHY_EXPANSION: { className: "bg-green-600", label: "Healthy Expansion" },
      ASSET_LED_GROWTH: { className: "bg-orange-600", label: "Asset-Led Growth" },
      IMBALANCED_EXCESS: { className: "bg-red-600", label: "Imbalanced Excess" },
      REAL_ECONOMY_LEAD: { className: "bg-blue-600", label: "Real Economy Lead" },
    };
    const config = regimeConfig[regimeName as keyof typeof regimeConfig] || { className: "", label: regimeName };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

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
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2" data-testid="heading-supply-chain-traceability">
            <Network className="h-8 w-8" />
            Supply Chain Traceability
          </h1>
          <p className="text-muted-foreground mt-1">
            End-to-end material tracking, batch traceability, and supplier chain risk analysis
          </p>
        </div>
        {regime && (
          <Card className="w-fit">
            <CardContent className="pt-6 px-4 pb-4">
              <div className="text-sm text-muted-foreground">Current Regime</div>
              <div className="mt-1">{getRegimeBadge(regime.regime)}</div>
              <div className="text-2xl font-bold mt-1" data-testid="text-fdr">FDR: {regime.fdr.toFixed(2)}</div>
            </CardContent>
          </Card>
        )}
      </div>

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
    </div>
  );
}
