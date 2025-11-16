import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, AlertCircle, Activity } from "lucide-react";
import type { Allocation, Sku, Material } from "@shared/schema";

export default function Reports() {
  const { data: allocations, isLoading: isLoadingAllocations } = useQuery<Allocation[]>({
    queryKey: ["/api/allocations"],
  });

  const { data: skus, isLoading: isLoadingSkus } = useQuery<Sku[]>({
    queryKey: ["/api/skus"],
  });

  const { data: materials, isLoading: isLoadingMaterials } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  const { data: regime } = useQuery<{ regime: string; fdr: number }>({
    queryKey: ["/api/economics/regime"],
  });

  if (isLoadingAllocations || isLoadingSkus || isLoadingMaterials) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const totalBudget = allocations?.reduce((sum, a) => sum + a.budget, 0) || 0;
  const avgBudget = allocations?.length ? totalBudget / allocations.length : 0;
  const totalMaterialValue = materials?.reduce((sum, m) => sum + m.onHand, 0) || 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="heading-reports">
          Reports & Analytics
        </h1>
        <p className="text-muted-foreground mt-1">
          Performance metrics and allocation history
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-allocations">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Allocations</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-allocations">
              {allocations?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Allocation runs executed</p>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-budget">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Budget</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-budget">
              ${avgBudget.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">Per allocation run</p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-skus">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active SKUs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-skus">
              {skus?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Product configurations</p>
          </CardContent>
        </Card>

        <Card data-testid="card-material-inventory">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Material Units</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-material-units">
              {totalMaterialValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">Total units on hand</p>
          </CardContent>
        </Card>
      </div>

      {regime && (
        <Card data-testid="card-current-regime">
          <CardHeader>
            <CardTitle>Current Economic Context</CardTitle>
            <CardDescription>Real-time economic indicators influencing decisions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-muted-foreground">Regime Type</div>
                <div className="text-lg font-semibold" data-testid="text-regime-type">
                  {regime.regime || "Unknown"}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">FDR Score</div>
                <div className="text-lg font-semibold" data-testid="text-fdr-score">
                  {regime.fdr?.toFixed(2) || "0.00"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-4">Allocation History</h2>
        {!allocations || allocations.length === 0 ? (
          <Alert data-testid="alert-no-allocations">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No allocation history yet. Run allocations to see performance data.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {allocations.map((allocation) => (
              <Card key={allocation.id} data-testid={`card-allocation-history-${allocation.id}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {allocation.name || "Unnamed Allocation"}
                      </CardTitle>
                      <CardDescription>
                        {new Date(allocation.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Budget</div>
                      <div className="text-lg font-semibold">
                        ${allocation.budget.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
