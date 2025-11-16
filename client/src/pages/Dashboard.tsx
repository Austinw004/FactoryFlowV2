import { KPICard } from "@/components/KPICard";
import { RegimeStatus } from "@/components/RegimeStatus";
import { PolicySignals } from "@/components/PolicySignals";
import { AllocationTable } from "@/components/AllocationTable";
import { ForecastChart } from "@/components/ForecastChart";
import { BudgetGauge } from "@/components/BudgetGauge";
import { TrendingUp, DollarSign, Package, AlertCircle, Plus, Upload, GitCompare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: regime, isLoading: regimeLoading } = useQuery({
    queryKey: ["/api/economics/regime"],
  });

  const { data: allocations = [], isLoading: allocationsLoading } = useQuery({
    queryKey: ["/api/allocations"],
  });

  const { data: skus = [], isLoading: skusLoading } = useQuery({
    queryKey: ["/api/skus"],
  });

  const latestAllocation = Array.isArray(allocations) && allocations.length > 0 
    ? allocations[0] 
    : null;

  const { data: allocationDetails } = useQuery<{ results: any[] }>({
    queryKey: ["/api/allocations", latestAllocation?.id],
    enabled: !!latestAllocation?.id,
  });

  const seedMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/seed"),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Sample data has been loaded successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/allocations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/skus"] });
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Calculate all derived data (must be before conditional returns)
  const hasData = Array.isArray(skus) && skus.length > 0;
  
  const allocationData = allocationDetails?.results
    ? allocationDetails.results.slice(0, 5).map((r: any) => ({
        sku: r.skuCode || r.skuId?.substring(0, 8) || 'SKU',
        plannedUnits: r.plannedUnits || 0,
        allocatedUnits: r.allocatedUnits || 0,
        fillRate: Math.round((r.fillRate || 0) * 100),
        priority: r.priority || 0,
      }))
    : [];

  const avgFillRate = allocationDetails?.results && allocationDetails.results.length > 0
    ? (allocationDetails.results.reduce((sum: number, r: any) => sum + (r.fillRate || 0), 0) / allocationDetails.results.length * 100).toFixed(1)
    : "0.0";

  const regimeData = regime as any || {};
  const policySignals = regimeData.policySignals || [];
  const regimeType = regimeData.regime || "UNKNOWN";
  const fdr = regimeData.fdr || 0;
  const intensity = regimeData.intensity || 50;

  // Show loading state
  if (skusLoading || regimeLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show empty state
  if (!hasData) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Manufacturing allocation intelligence overview
            </p>
          </div>
        </div>
        <Card className="p-12">
          <div className="text-center space-y-4">
            <Package className="h-16 w-16 mx-auto text-muted-foreground" />
            <div>
              <h2 className="text-2xl font-semibold mb-2">No Data Available</h2>
              <p className="text-muted-foreground mb-6">
                Load sample data to get started with the platform
              </p>
            </div>
            <Button 
              onClick={() => seedMutation.mutate()} 
              disabled={seedMutation.isPending}
              size="lg"
              data-testid="button-load-sample-data"
            >
              {seedMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading Sample Data...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Load Sample Data
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Main dashboard content
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manufacturing allocation intelligence overview
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => seedMutation.mutate()} 
            disabled={seedMutation.isPending}
            data-testid="button-import-data"
          >
            <Upload className="h-4 w-4 mr-2" />
            Reload Sample Data
          </Button>
          <Button variant="outline" data-testid="button-run-scenario">
            <GitCompare className="h-4 w-4 mr-2" />
            Run Scenario
          </Button>
          <Button data-testid="button-new-allocation">
            <Plus className="h-4 w-4 mr-2" />
            New Allocation
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={TrendingUp}
          label="FDR Score"
          value={fdr.toFixed(2)}
          subtitle={regimeType.replace(/_/g, ' ')}
          trend={{ value: "Live", positive: true }}
        />
        <KPICard
          icon={DollarSign}
          label="Total SKUs"
          value={(Array.isArray(skus) ? skus.length : 0).toString()}
          subtitle="Active products"
        />
        <KPICard
          icon={Package}
          label="Avg Fill Rate"
          value={`${avgFillRate}%`}
          trend={{ value: "Current", positive: Number(avgFillRate) > 90 }}
        />
        <KPICard
          icon={AlertCircle}
          label="Active Signals"
          value={policySignals.length.toString()}
          subtitle="Policy alerts"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RegimeStatus 
            regime={regimeType} 
            fdr={fdr} 
            intensity={intensity} 
          />
        </div>
        <BudgetGauge total={750000} spent={547500} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Allocations</h2>
              <Button variant="ghost" size="sm" data-testid="button-view-all">
                View All
              </Button>
            </div>
            {allocationsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : allocationData.length > 0 ? (
              <AllocationTable allocations={allocationData} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No allocations yet. Run an allocation to see results here.
              </div>
            )}
          </Card>
        </div>
        <PolicySignals signals={policySignals} />
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Demand Trend Analysis</h2>
        <p className="text-sm text-muted-foreground">
          Connect demand history data to view forecasting trends
        </p>
      </Card>
    </div>
  );
}
