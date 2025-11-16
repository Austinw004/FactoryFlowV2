import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Boxes, PlayCircle, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Allocation, AllocationResult } from "@shared/schema";

export default function Allocation() {
  const [budget, setBudget] = useState("50000");
  const { toast } = useToast();

  const { data: allocations, isLoading } = useQuery<Allocation[]>({
    queryKey: ["/api/allocations"],
  });

  const runAllocationMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/allocations/run", {
        budget: parseFloat(budget),
        name: `Allocation ${new Date().toLocaleDateString()}`,
      });
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
          <Button
            onClick={handleRunAllocation}
            disabled={runAllocationMutation.isPending}
            data-testid="button-run-allocation"
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
