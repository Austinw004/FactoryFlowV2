import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Boxes, PlayCircle, AlertCircle, Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Allocation, AllocationResult } from "@shared/schema";

export default function Allocation() {
  const [budget, setBudget] = useState("50000");
  const [budgetDurationValue, setBudgetDurationValue] = useState("");
  const [budgetDurationUnit, setBudgetDurationUnit] = useState<string>("month");
  const { toast } = useToast();

  const { data: allocations, isLoading } = useQuery<Allocation[]>({
    queryKey: ["/api/allocations"],
  });

  const runAllocationMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        budget: parseFloat(budget),
        name: `Allocation ${new Date().toLocaleDateString()}`,
      };
      
      if (budgetDurationValue && parseFloat(budgetDurationValue) > 0) {
        payload.budgetDurationValue = parseInt(budgetDurationValue);
        payload.budgetDurationUnit = budgetDurationUnit;
      }
      
      return apiRequest("POST", "/api/allocations/run", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/allocations"] });
      toast({
        title: "Allocation Complete",
        description: "Material allocation has been successfully calculated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Allocation Failed",
        description: error.message,
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
        <h1 className="text-3xl font-bold" data-testid="heading-allocation">
          Material Allocation
        </h1>
        <p className="text-muted-foreground mt-1">
          Optimize material distribution across SKUs based on demand and constraints
        </p>
      </div>

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
          </div>
          
          <Button
            onClick={handleRunAllocation}
            disabled={runAllocationMutation.isPending}
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

  return (
    <Card data-testid={`card-allocation-${allocation.id}`}>
      <CardHeader>
        <CardTitle className="text-lg">{allocation.name || "Unnamed Allocation"}</CardTitle>
        <CardDescription>
          {new Date(allocation.createdAt).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
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
            {allocation.regime || "Unknown"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
