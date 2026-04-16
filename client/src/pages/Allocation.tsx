import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatRegimeName } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { useToast } from "@/hooks/use-toast";
import { Boxes, PlayCircle, AlertCircle, Clock, Plus, X, Package, WarehouseIcon, Info, CheckCircle2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { humanizeError } from "@/lib/humanizeError";
import type { Allocation, AllocationResult, Material } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MaterialRequirement {
  materialId: string;
  quantity: string;
}

interface CatalogMaterial {
  code: string;
  name: string;
  unit: string;
  category: string;
  estimatedPrice?: number;
}

export default function Allocation() {
  const [budget, setBudget] = useState("");
  const [budgetDurationValue, setBudgetDurationValue] = useState("");
  const [budgetDurationUnit, setBudgetDurationUnit] = useState<string>("month");
  const [horizonStart, setHorizonStart] = useState("");
  const [useDirectMaterials, setUseDirectMaterials] = useState(false);
  const [materialRequirements, setMaterialRequirements] = useState<MaterialRequirement[]>([
    { materialId: "", quantity: "" }
  ]);
  const [lowStockAcknowledged, setLowStockAcknowledged] = useState(false);
  const { toast } = useToast();

  const { data: catalogData } = useQuery<{ materials: CatalogMaterial[]; categories: string[] }>({
    queryKey: ["/api/materials/catalog"],
  });

  const { data: allocations, isLoading } = useQuery<Allocation[]>({
    queryKey: ["/api/allocations"],
  });

  // Fetch materials for inventory capacity check
  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  // Calculate measured inventory status (no fabricated capacity metrics)
  const inventoryCapacityCheck = useMemo(() => {
    if (!materials.length) return null;
    
    const totalOnHand = materials.reduce((sum, m) => sum + (m.onHand || 0), 0);
    const totalInbound = materials.reduce((sum, m) => sum + (m.inbound || 0), 0);
    
    // Identify materials with low stock (<10 units on hand) - based on actual measured data
    const materialsLowStock = materials.filter(m => {
      const onHand = m.onHand || 0;
      return onHand < 10;
    });

    return {
      totalOnHand,
      totalInbound,
      materialsLowStock
    };
  }, [materials]);

  const addMaterialRequirement = () => {
    setMaterialRequirements([...materialRequirements, { materialId: "", quantity: "" }]);
  };

  const removeMaterialRequirement = (index: number) => {
    setMaterialRequirements(materialRequirements.filter((_, i) => i !== index));
  };

  const updateMaterialRequirement = (index: number, field: 'materialId' | 'quantity', value: string) => {
    const updated = [...materialRequirements];
    updated[index][field] = value;
    setMaterialRequirements(updated);
  };

  const runAllocationMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        budget: parseFloat(budget),
        name: `Allocation ${new Date().toLocaleDateString()}`,
      };
      
      if (budgetDurationValue && parseFloat(budgetDurationValue) > 0) {
        payload.budgetDurationValue = parseInt(budgetDurationValue);
        payload.budgetDurationUnit = budgetDurationUnit;
        if (horizonStart) {
          payload.horizonStart = horizonStart;
        }
      }

      if (useDirectMaterials) {
        const validRequirements = materialRequirements
          .filter(req => req.materialId && req.quantity && parseFloat(req.quantity) > 0)
          .map(req => ({
            materialId: req.materialId,
            quantity: parseFloat(req.quantity),
          }));
        
        if (validRequirements.length === 0) {
          throw new Error("Please add at least one material with a valid quantity");
        }
        
        payload.directMaterialRequirements = validRequirements;
      }
      
      return apiRequest("POST", "/api/allocations/run", payload);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/allocations"] });
      
      // Show warnings if budget is insufficient
      if (data.warnings && data.warnings.length > 0) {
        toast({
          title: "Budget Duration Warning",
          description: data.warnings[0],
          variant: "destructive",
        });
      } else if (data.coverageAnalysis) {
        if (data.coverageAnalysis.isSufficient && data.coverageAnalysis.budgetCoverageDays) {
          toast({
            title: "Allocation Complete",
            description: `Your budget will cover ${data.coverageAnalysis.budgetCoverageDays.toFixed(0)} days of operations.`,
          });
        } else if (!data.coverageAnalysis.isSufficient) {
          toast({
            title: "Allocation Complete",
            description: "Budget coverage calculated. Check allocation details for warnings.",
          });
        } else {
          toast({
            title: "Allocation Complete",
            description: "Material allocation has been successfully calculated.",
          });
        }
      } else {
        toast({
          title: "Allocation Complete",
          description: "Material allocation has been successfully calculated.",
        });
      }
    },
    onError: (error: unknown) => {
      toast({
        ...humanizeError(error, "Allocation Failed"),
        variant: "destructive",
      });
    },
  });

  const handleRunAllocation = () => {
    const budgetValue = parseFloat(budget);
    if (isNaN(budgetValue) || budgetValue <= 0) {
      toast({
        title: "Invalid Budget",
        description: "Please enter a valid budget amount.",
        variant: "destructive",
      });
      return;
    }
    runAllocationMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-allocation">
          Material Allocation
        </h1>
        <p className="text-muted-foreground mt-1">
          Optimize material distribution across SKUs based on demand and constraints
        </p>
      </div>

      {/* Inventory Status Check */}
      {inventoryCapacityCheck && (
        <Card className="border-muted" data-testid="card-inventory-status">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <WarehouseIcon className="h-4 w-4" />
              Inventory Status
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Shows current measured inventory levels. Low stock alerts indicate materials below 10 units on hand.</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Measured inventory levels - actual data */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground block">Total On Hand (measured)</span>
                <span className="font-semibold" data-testid="text-on-hand">{inventoryCapacityCheck.totalOnHand.toLocaleString()} units</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Total Inbound (measured)</span>
                <span className="font-semibold" data-testid="text-inbound">{inventoryCapacityCheck.totalInbound.toLocaleString()} units</span>
              </div>
            </div>

            {/* Low stock warnings - based on actual data */}
            {inventoryCapacityCheck.materialsLowStock.length > 0 && (
              <Alert className="py-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20" data-testid="alert-low-stock">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="space-y-2">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    <strong>{inventoryCapacityCheck.materialsLowStock.length} material(s) with low stock (&lt;10 units):</strong>{' '}
                    {inventoryCapacityCheck.materialsLowStock.slice(0, 3).map(m => m.name || m.code).join(', ')}
                    {inventoryCapacityCheck.materialsLowStock.length > 3 && ` (+${inventoryCapacityCheck.materialsLowStock.length - 3} more)`}
                  </p>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="acknowledge-low-stock"
                      checked={lowStockAcknowledged}
                      onCheckedChange={(checked) => setLowStockAcknowledged(checked === true)}
                      data-testid="checkbox-acknowledge-low-stock"
                    />
                    <Label htmlFor="acknowledge-low-stock" className="text-sm text-yellow-700 dark:text-yellow-300 cursor-pointer">
                      I acknowledge low stock and want to proceed with allocation
                    </Label>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* All clear message */}
            {inventoryCapacityCheck.materialsLowStock.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300" data-testid="text-inventory-healthy">
                <CheckCircle2 className="h-4 w-4" />
                All materials have adequate stock levels for allocation.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-run-allocation">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5" />
            Run Allocation
          </CardTitle>
          <CardDescription>
            Calculate optimal material allocation for current demand forecasts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="budget">Budget ($)</Label>
            <Input
              id="budget"
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="50000"
              data-testid="input-budget"
            />
          </div>
          
          <div className="space-y-2 p-4 rounded-md bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4" />
              <Label className="text-sm font-medium">Budget Duration (Optional)</Label>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Specify how long you want this budget to last. The system will calculate burn rate and alert you if the budget won't cover the desired period.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="duration-value" className="text-sm">Duration</Label>
                <Input
                  id="duration-value"
                  type="number"
                  value={budgetDurationValue}
                  onChange={(e) => setBudgetDurationValue(e.target.value)}
                  placeholder="3"
                  min="1"
                  data-testid="input-duration-value"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="duration-unit" className="text-sm">Period</Label>
                <Select
                  value={budgetDurationUnit}
                  onValueChange={setBudgetDurationUnit}
                >
                  <SelectTrigger id="duration-unit" data-testid="select-duration-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Days</SelectItem>
                    <SelectItem value="week">Weeks</SelectItem>
                    <SelectItem value="month">Months</SelectItem>
                    <SelectItem value="quarter">Quarters</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {budgetDurationValue && (
              <div className="grid gap-2 mt-2">
                <Label htmlFor="horizon-start" className="text-sm">Start Date (Optional)</Label>
                <Input
                  id="horizon-start"
                  type="date"
                  value={horizonStart}
                  onChange={(e) => setHorizonStart(e.target.value)}
                  data-testid="input-horizon-start"
                />
              </div>
            )}
          </div>

          <div className="space-y-3 p-4 rounded-md bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <Label className="text-sm font-medium">Direct Material Requirements (Optional)</Label>
              </div>
              <Button
                type="button"
                variant={useDirectMaterials ? "default" : "outline"}
                size="sm"
                onClick={() => setUseDirectMaterials(!useDirectMaterials)}
                data-testid="button-toggle-direct-materials"
              >
                {useDirectMaterials ? "Enabled" : "Disabled"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {useDirectMaterials 
                ? "Specify exactly what materials and quantities you need. The system will calculate costs and coverage based on your requirements."
                : "Toggle to directly specify material requirements instead of using SKU-based allocation."
              }
            </p>

            {useDirectMaterials && (
              <div className="space-y-3 mt-3">
                {materialRequirements.map((req, index) => {
                  const materialOptions = catalogData?.materials.map((material) => ({
                    value: material.code,
                    label: `${material.name} (${material.unit})`,
                    category: material.category,
                  })) || [];
                  
                  const selectedMaterial = catalogData?.materials.find(m => m.code === req.materialId);
                  
                  return (
                    <div key={index} className="grid grid-cols-[1fr,auto,auto] gap-2 items-end">
                      <div className="grid gap-2">
                        <Label className="text-xs">Material (Type to search)</Label>
                        <Combobox
                          options={materialOptions}
                          value={req.materialId}
                          onValueChange={(value) => updateMaterialRequirement(index, 'materialId', value)}
                          placeholder="Type to search materials..."
                          searchPlaceholder="Search 110+ materials..."
                          emptyMessage="No material found."
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          value={req.quantity}
                          onChange={(e) => updateMaterialRequirement(index, 'quantity', e.target.value)}
                          placeholder="0"
                          min="0"
                          step="0.01"
                          className="w-24"
                          data-testid={`input-material-quantity-${index}`}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMaterialRequirement(index)}
                        disabled={materialRequirements.length === 1}
                        data-testid={`button-remove-material-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMaterialRequirement}
                  className="w-full"
                  data-testid="button-add-material"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Material
                </Button>
              </div>
            )}
          </div>
          
          {/* Pre-run warning if low stock and not acknowledged */}
          {inventoryCapacityCheck && inventoryCapacityCheck.materialsLowStock.length > 0 && !lowStockAcknowledged && (
            <Alert className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20" data-testid="alert-acknowledge-required">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-sm text-yellow-700 dark:text-yellow-300">
                Please acknowledge the low stock warning above before running allocation.
              </AlertDescription>
            </Alert>
          )}
          <Button
            onClick={handleRunAllocation}
            disabled={runAllocationMutation.isPending || ((inventoryCapacityCheck?.materialsLowStock?.length ?? 0) > 0 && !lowStockAcknowledged)}
            data-testid="button-run-allocation"
            className="w-full"
          >
            {runAllocationMutation.isPending ? "Running..." : "Run Allocation"}
          </Button>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Allocations</h2>
        {!allocations || allocations.length === 0 ? (
          <Alert data-testid="alert-no-allocations">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No allocations yet. Run your first allocation above to get started.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allocations.map((allocation) => (
              <AllocationCard key={allocation.id} allocation={allocation} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AllocationCard({ allocation }: { allocation: Allocation }) {
  const { data: details } = useQuery<{ results: AllocationResult[]; allocation: Allocation }>({
    queryKey: ["/api/allocations", allocation.id],
    enabled: !!allocation.id,
  });

  const totalAllocated = details?.results.reduce((sum, r) => sum + r.allocatedUnits, 0) || 0;
  const avgFillRate = details?.results.length
    ? (details.results.reduce((sum, r) => sum + r.fillRate, 0) / details.results.length) * 100
    : 0;

  const avgDaysOfInventory = details?.results.length
    ? details.results.reduce((sum, r) => sum + (r.daysOfInventory || 0), 0) / details.results.length
    : null;

  const hasDuration = allocation.budgetDurationValue && allocation.budgetDurationUnit;
  const durationText = hasDuration 
    ? `${allocation.budgetDurationValue} ${allocation.budgetDurationUnit}${(allocation.budgetDurationValue || 0) > 1 ? 's' : ''}`
    : null;

  // Get coverage data from KPIs
  const kpis = allocation.kpis as any;
  const coverage = kpis?.coverage;
  const hasWarnings = coverage?.warnings && coverage.warnings.length > 0;
  const hasDirectMaterials = (allocation as any).directMaterialRequirements;
  const materialBreakdown = coverage?.materialBreakdown;

  return (
    <Card data-testid={`card-allocation-${allocation.id}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <span>{allocation.name || "Unnamed Allocation"}</span>
          {hasDirectMaterials && (
            <span className="text-xs font-normal px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100">
              Direct Materials
            </span>
          )}
        </CardTitle>
        <CardDescription>
          {new Date(allocation.createdAt).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {hasWarnings && (
          <Alert variant="destructive" data-testid={`alert-coverage-warning-${allocation.id}`}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Budget covers {coverage.budgetCoverageDays?.toFixed(0)} of {coverage.requestedDays} days
            </AlertDescription>
          </Alert>
        )}

        {materialBreakdown && materialBreakdown.length > 0 && (
          <div className="p-2 rounded-md bg-muted/50 text-xs space-y-1">
            <div className="font-medium mb-1">Material Requirements:</div>
            {materialBreakdown.map((item: any, i: number) => (
              <div key={i} className="flex justify-between">
                <span className="text-muted-foreground">{item.materialName}:</span>
                <span>{item.quantity} @ ${item.unitCost}/unit</span>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Budget:</span>
          <span className="font-semibold" data-testid={`text-budget-${allocation.id}`}>
            ${allocation.budget.toLocaleString()}
          </span>
        </div>
        
        {hasDuration && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Duration:</span>
            <span className="font-semibold text-sm" data-testid={`text-duration-${allocation.id}`}>
              {durationText}
            </span>
          </div>
        )}
        
        {coverage && coverage.isSufficient && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Coverage:</span>
            <span className="font-semibold text-sm text-green-600 dark:text-green-400" data-testid={`text-coverage-${allocation.id}`}>
              ✓ {coverage.budgetCoverageDays?.toFixed(0)} days
            </span>
          </div>
        )}
        
        {avgDaysOfInventory !== null && avgDaysOfInventory > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Avg Inventory:</span>
            <span className="font-semibold text-sm" data-testid={`text-inventory-days-${allocation.id}`}>
              {avgDaysOfInventory.toFixed(0)} days
            </span>
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total Units:</span>
          <span className="font-semibold" data-testid={`text-total-units-${allocation.id}`}>
            {totalAllocated.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Avg Fill Rate:</span>
          <span className="font-semibold" data-testid={`text-fill-rate-${allocation.id}`}>
            {avgFillRate.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Regime:</span>
          <span className="text-sm" data-testid={`text-regime-${allocation.id}`}>
            {formatRegimeName(allocation.regime || "") || "Unknown"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
