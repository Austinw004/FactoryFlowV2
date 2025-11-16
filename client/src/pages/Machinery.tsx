import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Wrench, TrendingDown, AlertTriangle, DollarSign, Calendar, ExternalLink, Clock } from "lucide-react";
import { format, formatDistance } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function Machinery() {
  const [selectedMachine, setSelectedMachine] = useState<any | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);
  const { toast } = useToast();

  const { data: machinery = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/machinery"],
  });

  const handleAddMachine = async (machine: any) => {
    setShowAddDialog(false);
    toast({
      title: "Machine added successfully",
      description: `${machine.name} has been added to your inventory.`,
    });
  };

  const handleViewDetails = (machine: any) => {
    setSelectedMachine(machine);
    setShowDetailsDialog(true);
  };

  const handleAddMaintenance = (machine: any) => {
    setSelectedMachine(machine);
    setShowMaintenanceDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading machinery...</div>
      </div>
    );
  }

  const operationalCount = machinery.filter((m: any) => m.status === "operational").length;
  const maintenanceCount = machinery.filter((m: any) => m.status === "maintenance").length;
  const downCount = machinery.filter((m: any) => m.status === "down").length;
  const totalValue = machinery.reduce((sum: number, m: any) => sum + (m.currentValue || m.purchaseCost), 0);

  return (
    <div className="h-full overflow-auto">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-machinery-title">Machinery Management</h1>
            <p className="text-muted-foreground">
              Track equipment value, depreciation, maintenance, and lifecycle management
            </p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-machine">
                <Plus className="h-4 w-4 mr-2" />
                Add Machine
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <AddMachineForm onSuccess={handleAddMachine} onCancel={() => setShowAddDialog(false)} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Machinery</CardDescription>
              <CardTitle className="text-3xl" data-testid="text-total-machines">{machinery.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Operational</CardDescription>
              <CardTitle className="text-3xl text-green-600" data-testid="text-operational-count">{operationalCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>In Maintenance</CardDescription>
              <CardTitle className="text-3xl text-yellow-600" data-testid="text-maintenance-count">{maintenanceCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Value</CardDescription>
              <CardTitle className="text-3xl" data-testid="text-total-value">${totalValue.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Machinery List */}
        <Card>
          <CardHeader>
            <CardTitle>Equipment Inventory</CardTitle>
            <CardDescription>View and manage your manufacturing equipment</CardDescription>
          </CardHeader>
          <CardContent>
            {machinery.length === 0 ? (
              <div className="text-center py-12">
                <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No machinery yet</h3>
                <p className="text-muted-foreground mb-4">Start tracking your equipment to optimize lifecycle management</p>
                <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-first-machine">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Machine
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {machinery.map((machine: any) => (
                  <MachineryCard
                    key={machine.id}
                    machine={machine}
                    onViewDetails={handleViewDetails}
                    onAddMaintenance={handleAddMaintenance}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Machine Details Dialog */}
        {selectedMachine && (
          <>
            <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <MachineDetailsView machine={selectedMachine} onClose={() => setShowDetailsDialog(false)} />
              </DialogContent>
            </Dialog>

            <Dialog open={showMaintenanceDialog} onOpenChange={setShowMaintenanceDialog}>
              <DialogContent className="max-w-2xl">
                <AddMaintenanceForm
                  machine={selectedMachine}
                  onSuccess={() => {
                    setShowMaintenanceDialog(false);
                    toast({ title: "Maintenance record added" });
                  }}
                  onCancel={() => setShowMaintenanceDialog(false)}
                />
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
}

function MachineryCard({ machine, onViewDetails, onAddMaintenance }: any) {
  const statusColors = {
    operational: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    maintenance: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    down: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    retired: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  };

  const needsMaintenanceSoon = machine.nextMaintenanceDate &&
    new Date(machine.nextMaintenanceDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  
  const maintenanceOverdue = machine.nextMaintenanceDate &&
    new Date(machine.nextMaintenanceDate) < new Date();

  return (
    <Card className="hover-elevate" data-testid={`card-machine-${machine.id}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold" data-testid={`text-machine-name-${machine.id}`}>{machine.name}</h3>
              <Badge className={statusColors[machine.status as keyof typeof statusColors]}>
                {machine.status}
              </Badge>
              {maintenanceOverdue && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Overdue
                </Badge>
              )}
              {needsMaintenanceSoon && !maintenanceOverdue && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  Maintenance Soon
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Manufacturer</p>
                <p className="font-medium">{machine.manufacturer || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Model</p>
                <p className="font-medium">{machine.model || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Category</p>
                <p className="font-medium">{machine.category}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Current Value</p>
                <p className="font-medium">${(machine.currentValue || machine.purchaseCost).toLocaleString()}</p>
              </div>
            </div>
            {machine.productUrl && (
              <a
                href={machine.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline mt-2 inline-flex items-center gap-1"
                data-testid={`link-product-url-${machine.id}`}
              >
                <ExternalLink className="h-3 w-3" />
                View Product Page
              </a>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onAddMaintenance(machine)} data-testid={`button-add-maintenance-${machine.id}`}>
              <Wrench className="h-4 w-4 mr-2" />
              Maintenance
            </Button>
            <Button variant="outline" size="sm" onClick={() => onViewDetails(machine)} data-testid={`button-view-details-${machine.id}`}>
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AddMachineForm({ onSuccess, onCancel }: any) {
  const [formData, setFormData] = useState({
    name: "",
    manufacturer: "",
    model: "",
    serialNumber: "",
    category: "",
    purchaseDate: "",
    purchaseCost: "",
    salvageValue: "",
    usefulLifeYears: "10",
    depreciationMethod: "straight-line",
    location: "",
    productUrl: "",
    notes: "",
    maintenanceIntervalDays: "90",
  });

  const createMachine = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/machinery", "POST", data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/machinery"] });
      onSuccess(data);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMachine.mutate({
      ...formData,
      purchaseCost: parseFloat(formData.purchaseCost),
      salvageValue: parseFloat(formData.salvageValue) || 0,
      usefulLifeYears: parseInt(formData.usefulLifeYears),
      maintenanceIntervalDays: parseInt(formData.maintenanceIntervalDays),
      purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate).toISOString() : null,
    });
  };

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Add New Machine</DialogTitle>
        <DialogDescription>Enter the details of your equipment for lifecycle tracking</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="name">Machine Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              data-testid="input-machine-name"
              placeholder="e.g., CNC Mill #3"
            />
          </div>
          <div>
            <Label htmlFor="manufacturer">Manufacturer</Label>
            <Input
              id="manufacturer"
              value={formData.manufacturer}
              onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
              data-testid="input-manufacturer"
              placeholder="e.g., Haas Automation"
            />
          </div>
          <div>
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              data-testid="input-model"
              placeholder="e.g., VF-2SS"
            />
          </div>
          <div>
            <Label htmlFor="serialNumber">Serial Number</Label>
            <Input
              id="serialNumber"
              value={formData.serialNumber}
              onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              data-testid="input-serial-number"
            />
          </div>
          <div>
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
              <SelectTrigger data-testid="select-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CNC Machine">CNC Machine</SelectItem>
                <SelectItem value="Injection Molding">Injection Molding</SelectItem>
                <SelectItem value="Assembly Robot">Assembly Robot</SelectItem>
                <SelectItem value="3D Printer">3D Printer</SelectItem>
                <SelectItem value="Lathe">Lathe</SelectItem>
                <SelectItem value="Press">Press</SelectItem>
                <SelectItem value="Conveyor System">Conveyor System</SelectItem>
                <SelectItem value="Packaging Equipment">Packaging Equipment</SelectItem>
                <SelectItem value="Quality Control">Quality Control</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="purchaseDate">Purchase Date</Label>
            <Input
              id="purchaseDate"
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              data-testid="input-purchase-date"
            />
          </div>
          <div>
            <Label htmlFor="purchaseCost">Purchase Cost * ($)</Label>
            <Input
              id="purchaseCost"
              type="number"
              step="0.01"
              value={formData.purchaseCost}
              onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}
              required
              data-testid="input-purchase-cost"
            />
          </div>
          <div>
            <Label htmlFor="salvageValue">Salvage Value ($)</Label>
            <Input
              id="salvageValue"
              type="number"
              step="0.01"
              value={formData.salvageValue}
              onChange={(e) => setFormData({ ...formData, salvageValue: e.target.value })}
              data-testid="input-salvage-value"
            />
          </div>
          <div>
            <Label htmlFor="usefulLifeYears">Useful Life (years)</Label>
            <Input
              id="usefulLifeYears"
              type="number"
              value={formData.usefulLifeYears}
              onChange={(e) => setFormData({ ...formData, usefulLifeYears: e.target.value })}
              data-testid="input-useful-life"
            />
          </div>
          <div>
            <Label htmlFor="depreciationMethod">Depreciation Method</Label>
            <Select value={formData.depreciationMethod} onValueChange={(v) => setFormData({ ...formData, depreciationMethod: v })}>
              <SelectTrigger data-testid="select-depreciation-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="straight-line">Straight-Line</SelectItem>
                <SelectItem value="declining-balance">Declining Balance</SelectItem>
                <SelectItem value="units-of-production">Units of Production</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="maintenanceIntervalDays">Maintenance Interval (days)</Label>
            <Input
              id="maintenanceIntervalDays"
              type="number"
              value={formData.maintenanceIntervalDays}
              onChange={(e) => setFormData({ ...formData, maintenanceIntervalDays: e.target.value })}
              data-testid="input-maintenance-interval"
            />
          </div>
          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              data-testid="input-location"
              placeholder="e.g., Factory Floor A, Bay 3"
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="productUrl">Product URL (optional)</Label>
            <Input
              id="productUrl"
              type="url"
              value={formData.productUrl}
              onChange={(e) => setFormData({ ...formData, productUrl: e.target.value })}
              data-testid="input-product-url"
              placeholder="https://manufacturer.com/product-page"
            />
            <p className="text-xs text-muted-foreground mt-1">Link to manufacturer's product page for specifications</p>
          </div>
          <div className="col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              data-testid="input-notes"
              rows={3}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-add">
            Cancel
          </Button>
          <Button type="submit" disabled={createMachine.isPending} data-testid="button-submit-add">
            {createMachine.isPending ? "Adding..." : "Add Machine"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function MachineDetailsView({ machine, onClose }: any) {
  const { data: depreciation } = useQuery<any>({
    queryKey: ["/api/machinery", machine.id, "depreciation"],
  });

  const { data: maintenanceRecords = [] } = useQuery<any[]>({
    queryKey: ["/api/machinery", machine.id, "maintenance"],
  });

  return (
    <div>
      <DialogHeader>
        <DialogTitle>{machine.name}</DialogTitle>
        <DialogDescription>Complete equipment details and lifecycle information</DialogDescription>
      </DialogHeader>
      <Tabs defaultValue="overview" className="mt-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="depreciation" data-testid="tab-depreciation">Depreciation</TabsTrigger>
          <TabsTrigger value="maintenance" data-testid="tab-maintenance">Maintenance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label>Manufacturer</Label>
              <p className="text-foreground font-medium">{machine.manufacturer || "—"}</p>
            </div>
            <div>
              <Label>Model</Label>
              <p className="text-foreground font-medium">{machine.model || "—"}</p>
            </div>
            <div>
              <Label>Serial Number</Label>
              <p className="text-foreground font-medium">{machine.serialNumber || "—"}</p>
            </div>
            <div>
              <Label>Category</Label>
              <p className="text-foreground font-medium">{machine.category}</p>
            </div>
            <div>
              <Label>Location</Label>
              <p className="text-foreground font-medium">{machine.location || "—"}</p>
            </div>
            <div>
              <Label>Status</Label>
              <p className="text-foreground font-medium capitalize">{machine.status}</p>
            </div>
            <div>
              <Label>Purchase Date</Label>
              <p className="text-foreground font-medium">
                {machine.purchaseDate ? format(new Date(machine.purchaseDate), "MMM d, yyyy") : "—"}
              </p>
            </div>
            <div>
              <Label>Purchase Cost</Label>
              <p className="text-foreground font-medium">${machine.purchaseCost.toLocaleString()}</p>
            </div>
          </div>
          {machine.notes && (
            <div>
              <Label>Notes</Label>
              <p className="text-sm mt-1">{machine.notes}</p>
            </div>
          )}
          {machine.productUrl && (
            <a
              href={machine.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              View Manufacturer Page
            </a>
          )}
        </TabsContent>

        <TabsContent value="depreciation" className="space-y-4">
          {depreciation && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Current Value</CardDescription>
                    <CardTitle className="text-2xl text-green-600">
                      ${depreciation.currentValue.toLocaleString()}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Total Depreciation</CardDescription>
                    <CardTitle className="text-2xl text-red-600">
                      ${depreciation.totalDepreciation.toLocaleString()}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Years Elapsed</CardDescription>
                    <CardTitle className="text-2xl">
                      {depreciation.yearsElapsed.toFixed(1)} years
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Years Remaining</CardDescription>
                    <CardTitle className="text-2xl">
                      {depreciation.yearsRemaining.toFixed(1)} years
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Depreciation Schedule ({machine.depreciationMethod})</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">Year</th>
                        <th className="p-2 text-right">Beginning Value</th>
                        <th className="p-2 text-right">Depreciation</th>
                        <th className="p-2 text-right">Ending Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {depreciation.schedule.slice(0, 10).map((row: any) => (
                        <tr key={row.year} className="border-t">
                          <td className="p-2">Year {row.year}</td>
                          <td className="p-2 text-right">${row.beginningValue.toLocaleString()}</td>
                          <td className="p-2 text-right text-red-600">-${row.depreciation.toLocaleString()}</td>
                          <td className="p-2 text-right">${row.endingValue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          {maintenanceRecords && maintenanceRecords.length > 0 ? (
            <div className="space-y-3">
              {maintenanceRecords.map((record: any) => (
                <Card key={record.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{record.maintenanceType}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(record.performedDate), "MMM d, yyyy")}
                          </span>
                        </div>
                        <p className="text-sm mb-2">{record.description}</p>
                        {record.performedBy && (
                          <p className="text-xs text-muted-foreground">Performed by: {record.performedBy}</p>
                        )}
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-semibold">${record.cost.toLocaleString()}</p>
                        {record.downTimeHours > 0 && (
                          <p className="text-muted-foreground">{record.downTimeHours}h downtime</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No maintenance records yet</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AddMaintenanceForm({ machine, onSuccess, onCancel }: any) {
  const [formData, setFormData] = useState({
    maintenanceType: "preventive",
    description: "",
    cost: "",
    performedDate: new Date().toISOString().split("T")[0],
    performedBy: "",
    downTimeHours: "",
  });

  const addMaintenance = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/machinery/${machine.id}/maintenance`, "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/machinery", machine.id, "maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/machinery"] });
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const maintenanceIntervalDays = machine.maintenanceIntervalDays || 90;
    const nextDate = new Date(formData.performedDate);
    nextDate.setDate(nextDate.getDate() + maintenanceIntervalDays);
    
    addMaintenance.mutate({
      ...formData,
      cost: parseFloat(formData.cost) || 0,
      downTimeHours: parseFloat(formData.downTimeHours) || 0,
      performedDate: new Date(formData.performedDate).toISOString(),
      nextScheduledDate: nextDate.toISOString(),
    });
  };

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Add Maintenance Record</DialogTitle>
        <DialogDescription>Record maintenance performed on {machine.name}</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div>
          <Label htmlFor="maintenanceType">Maintenance Type</Label>
          <Select value={formData.maintenanceType} onValueChange={(v) => setFormData({ ...formData, maintenanceType: v })}>
            <SelectTrigger data-testid="select-maintenance-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="preventive">Preventive</SelectItem>
              <SelectItem value="corrective">Corrective</SelectItem>
              <SelectItem value="predictive">Predictive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            data-testid="input-maintenance-description"
            rows={3}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="cost">Cost ($)</Label>
            <Input
              id="cost"
              type="number"
              step="0.01"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              data-testid="input-maintenance-cost"
            />
          </div>
          <div>
            <Label htmlFor="downTimeHours">Downtime (hours)</Label>
            <Input
              id="downTimeHours"
              type="number"
              step="0.1"
              value={formData.downTimeHours}
              onChange={(e) => setFormData({ ...formData, downTimeHours: e.target.value })}
              data-testid="input-downtime-hours"
            />
          </div>
          <div>
            <Label htmlFor="performedDate">Date Performed</Label>
            <Input
              id="performedDate"
              type="date"
              value={formData.performedDate}
              onChange={(e) => setFormData({ ...formData, performedDate: e.target.value })}
              data-testid="input-performed-date"
            />
          </div>
          <div>
            <Label htmlFor="performedBy">Performed By</Label>
            <Input
              id="performedBy"
              value={formData.performedBy}
              onChange={(e) => setFormData({ ...formData, performedBy: e.target.value })}
              data-testid="input-performed-by"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-maintenance">
            Cancel
          </Button>
          <Button type="submit" disabled={addMaintenance.isPending} data-testid="button-submit-maintenance">
            {addMaintenance.isPending ? "Adding..." : "Add Record"}
          </Button>
        </div>
      </form>
    </div>
  );
}
