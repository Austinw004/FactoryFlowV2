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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Wrench, AlertTriangle, ExternalLink, Clock } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Machinery, InsertMachinery, MaintenanceRecord, InsertMaintenanceRecord } from "@shared/schema";
import { insertMachinerySchema, insertMaintenanceRecordSchema } from "@shared/schema";
import { z } from "zod";

type DepreciationSchedule = {
  currentValue: number;
  totalDepreciation: number;
  yearsElapsed: number;
  yearsRemaining: number;
  schedule: Array<{
    year: number;
    beginningValue: number;
    depreciation: number;
    endingValue: number;
  }>;
};

const machineryFormSchema = insertMachinerySchema.omit({ companyId: true }).extend({
  purchaseCost: z.coerce.number().min(0, "Purchase cost must be positive"),
  salvageValue: z.coerce.number().min(0, "Salvage value must be positive").default(0),
  usefulLifeYears: z.coerce.number().int().min(1, "Useful life must be at least 1 year").default(10),
  maintenanceIntervalDays: z.coerce.number().int().min(1, "Maintenance interval must be at least 1 day").default(90),
  purchaseDate: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  location: z.string().optional(),
  productUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  notes: z.string().optional(),
});

const maintenanceFormSchema = insertMaintenanceRecordSchema.omit({ machineryId: true, partsReplaced: true, nextScheduledDate: true }).extend({
  cost: z.coerce.number().min(0, "Cost must be positive").default(0),
  downTimeHours: z.coerce.number().min(0, "Downtime must be positive").default(0),
  performedDate: z.string(),
  performedBy: z.string().optional(),
});

export default function Machinery() {
  const [selectedMachine, setSelectedMachine] = useState<Machinery | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);
  const { toast } = useToast();

  const { data: machinery = [], isLoading } = useQuery<Machinery[]>({
    queryKey: ["/api/machinery"],
  });

  const handleAddMachine = (machine: Machinery) => {
    setShowAddDialog(false);
    toast({
      title: "Machine added successfully",
      description: `${machine.name} has been added to your inventory.`,
    });
  };

  const handleViewDetails = (machine: Machinery) => {
    setSelectedMachine(machine);
    setShowDetailsDialog(true);
  };

  const handleAddMaintenance = (machine: Machinery) => {
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

  const operationalCount = machinery.filter((m) => m.status === "operational").length;
  const maintenanceCount = machinery.filter((m) => m.status === "maintenance").length;
  const totalValue = machinery.reduce((sum, m) => sum + (m.currentValue || m.purchaseCost), 0);

  return (
    <div className="container mx-auto p-6 space-y-6 pb-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-machinery-title">Machinery Management</h1>
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
                {machinery.map((machine) => (
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
  );
}

function MachineryCard({ machine, onViewDetails, onAddMaintenance }: {
  machine: Machinery;
  onViewDetails: (machine: Machinery) => void;
  onAddMaintenance: (machine: Machinery) => void;
}) {
  const statusColors = {
    operational: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    maintenance: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    down: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    retired: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  };

  const nextMaintenanceDate = machine.nextMaintenanceDate ? new Date(machine.nextMaintenanceDate) : null;
  const needsMaintenanceSoon = nextMaintenanceDate &&
    !isNaN(nextMaintenanceDate.getTime()) &&
    nextMaintenanceDate <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  
  const maintenanceOverdue = nextMaintenanceDate &&
    !isNaN(nextMaintenanceDate.getTime()) &&
    nextMaintenanceDate < new Date();

  return (
    <Card className="hover-elevate" data-testid={`card-machine-${machine.id}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold" data-testid={`text-machine-name-${machine.id}`}>{machine.name}</h3>
              <Badge className={statusColors[machine.status as keyof typeof statusColors] || statusColors.operational}>
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

function AddMachineForm({ onSuccess, onCancel }: {
  onSuccess: (machine: Machinery) => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof machineryFormSchema>>({
    resolver: zodResolver(machineryFormSchema),
    defaultValues: {
      name: "",
      manufacturer: "",
      model: "",
      serialNumber: "",
      category: "",
      purchaseDate: "",
      purchaseCost: 0,
      salvageValue: 0,
      usefulLifeYears: 10,
      depreciationMethod: "straight-line",
      location: "",
      productUrl: "",
      notes: "",
      maintenanceIntervalDays: 90,
    },
  });

  const createMachine = useMutation({
    mutationFn: async (data: z.infer<typeof machineryFormSchema>) => {
      const payload = {
        name: data.name,
        manufacturer: data.manufacturer || null,
        model: data.model || null,
        serialNumber: data.serialNumber || null,
        category: data.category,
        purchaseDate: data.purchaseDate || null,
        purchaseCost: data.purchaseCost,
        salvageValue: data.salvageValue,
        usefulLifeYears: data.usefulLifeYears,
        depreciationMethod: data.depreciationMethod,
        location: data.location || null,
        productUrl: data.productUrl || null,
        notes: data.notes || null,
        maintenanceIntervalDays: data.maintenanceIntervalDays,
        status: "operational" as const,
      };
      return await apiRequest("POST", "/api/machinery", payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/machinery"] });
      onSuccess(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add machine",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: z.infer<typeof machineryFormSchema>) => {
    createMachine.mutate(data);
  };

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Add New Machine</DialogTitle>
        <DialogDescription>Enter the details of your equipment for lifecycle tracking</DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Machine Name *</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-machine-name" placeholder="e.g., CNC Mill #3" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="manufacturer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Manufacturer</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-manufacturer" placeholder="e.g., Haas Automation" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-model" placeholder="e.g., VF-2SS" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="serialNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serial Number</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-serial-number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
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
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="purchaseDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purchase Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-purchase-date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="purchaseCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purchase Cost * ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} data-testid="input-purchase-cost" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="salvageValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Salvage Value ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} data-testid="input-salvage-value" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="usefulLifeYears"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Useful Life (years)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} data-testid="input-useful-life" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="depreciationMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Depreciation Method</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-depreciation-method">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="straight-line">Straight-Line</SelectItem>
                      <SelectItem value="declining-balance">Declining Balance</SelectItem>
                      <SelectItem value="units-of-production">Units of Production</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="maintenanceIntervalDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maintenance Interval (days)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} data-testid="input-maintenance-interval" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-location" placeholder="e.g., Factory Floor A, Bay 3" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="productUrl"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Product URL (optional)</FormLabel>
                  <FormControl>
                    <Input type="url" {...field} data-testid="input-product-url" placeholder="https://manufacturer.com/product-page" />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">Link to manufacturer's product page for specifications</p>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} data-testid="input-notes" rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
      </Form>
    </div>
  );
}

function MachineDetailsView({ machine, onClose }: {
  machine: Machinery;
  onClose: () => void;
}) {
  const { data: depreciation } = useQuery<DepreciationSchedule>({
    queryKey: ["/api/machinery", machine.id, "depreciation"],
  });

  const { data: maintenanceRecords = [] } = useQuery<MaintenanceRecord[]>({
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
                      {depreciation.schedule.slice(0, 10).map((row) => (
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
          {maintenanceRecords.length > 0 ? (
            <div className="space-y-3">
              {maintenanceRecords.map((record) => (
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
                        {record.downTimeHours && record.downTimeHours > 0 && (
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

function AddMaintenanceForm({ machine, onSuccess, onCancel }: {
  machine: Machinery;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof maintenanceFormSchema>>({
    resolver: zodResolver(maintenanceFormSchema),
    defaultValues: {
      maintenanceType: "preventive",
      description: "",
      cost: 0,
      performedDate: new Date().toISOString().split("T")[0],
      performedBy: "",
      downTimeHours: 0,
    },
  });

  const addMaintenance = useMutation({
    mutationFn: async (data: z.infer<typeof maintenanceFormSchema>) => {
      const maintenanceIntervalDays = machine.maintenanceIntervalDays || 90;
      const performedDate = new Date(data.performedDate);
      const nextDate = new Date(performedDate);
      nextDate.setDate(nextDate.getDate() + maintenanceIntervalDays);
      
      const payload = {
        machineryId: machine.id,
        maintenanceType: data.maintenanceType,
        description: data.description,
        cost: data.cost,
        downTimeHours: data.downTimeHours,
        performedDate: performedDate.toISOString(),
        performedBy: data.performedBy || null,
        nextScheduledDate: nextDate.toISOString(),
        partsReplaced: null,
      };
      
      return await apiRequest("POST", `/api/machinery/${machine.id}/maintenance`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/machinery", machine.id, "maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/machinery"] });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add maintenance record",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: z.infer<typeof maintenanceFormSchema>) => {
    addMaintenance.mutate(data);
  };

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Add Maintenance Record</DialogTitle>
        <DialogDescription>Record maintenance performed on {machine.name}</DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-4">
          <FormField
            control={form.control}
            name="maintenanceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maintenance Type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger data-testid="select-maintenance-type">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="preventive">Preventive</SelectItem>
                    <SelectItem value="corrective">Corrective</SelectItem>
                    <SelectItem value="predictive">Predictive</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description *</FormLabel>
                <FormControl>
                  <Textarea {...field} data-testid="input-maintenance-description" rows={3} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} data-testid="input-maintenance-cost" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="downTimeHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Downtime (hours)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" {...field} data-testid="input-downtime-hours" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="performedDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date Performed</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-performed-date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="performedBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Performed By</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-performed-by" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
      </Form>
    </div>
  );
}
