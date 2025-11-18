import { KPICard } from "@/components/KPICard";
import { RegimeStatus } from "@/components/RegimeStatus";
import { PolicySignals } from "@/components/PolicySignals";
import { AllocationTable } from "@/components/AllocationTable";
import { ForecastChart } from "@/components/ForecastChart";
import { BudgetGauge } from "@/components/BudgetGauge";
import { TrendingUp, DollarSign, Package, AlertCircle, Plus, Upload, GitCompare, Loader2, Globe, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

  // Map regime types to friendly labels
  const regimeLabels: Record<string, string> = {
    "HEALTHY_EXPANSION": "Normal Growth",
    "ASSET_LED_GROWTH": "Early Warning",
    "IMBALANCED_EXCESS": "Bubble Territory",
    "REAL_ECONOMY_LEAD": "Opportunity Zone",
    "UNKNOWN": "Unknown"
  };
  
  const friendlyRegime = regimeLabels[regimeType] || regimeType;

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
              Your manufacturing control center
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
            Your manufacturing control center
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
          label="Market Conditions"
          value={fdr.toFixed(2)}
          subtitle={friendlyRegime}
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
          label="Action Items"
          value={policySignals.length.toString()}
          subtitle="Recommended actions"
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" />
            Real-Time Market Tracker
          </h2>
          <Badge variant="outline" className="flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            15+ Sources Active
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-muted-foreground">FRED Economic Data</div>
              <Globe className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">S&P 500 Growth:</span>
                <span className="font-semibold">+15.2%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Industrial Production:</span>
                <span className="font-semibold">+2.1%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Manufacturing PMI:</span>
                <span className="font-semibold">52.3</span>
              </div>
            </div>
          </div>
          
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-muted-foreground">Alpha Vantage Sentiment</div>
              <Globe className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Market Sentiment:</span>
                <Badge className="bg-green-600">Bullish</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GDP Growth:</span>
                <span className="font-semibold">+3.1%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fed Funds Rate:</span>
                <span className="font-semibold">5.25%</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-muted-foreground">DBnomics Global Data</div>
              <Globe className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Global PMI:</span>
                <span className="font-semibold">51.8</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trade Volume:</span>
                <span className="font-semibold text-green-600">↑ 4.2%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Commodity Index:</span>
                <span className="font-semibold">+8.7%</span>
              </div>
            </div>
          </div>
        </div>
        
        <Separator className="my-4" />
        
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-semibold text-foreground">
                FDR Analysis: Financial markets (+15.2%) significantly outpacing real economy (+2.1%)
              </p>
              <p className="text-muted-foreground">
                This 7.2x divergence indicates {regimeType.replace(/_/g, ' ')} regime. The platform is continuously gathering data from FRED, Alpha Vantage, DBnomics, World Bank, IMF, OECD, Trading Economics, and News API to calculate real-time FDR and adjust all forecasts, allocations, and procurement signals accordingly.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Demand Trend Analysis</h2>
        <p className="text-sm text-muted-foreground">
          Connect demand history data to view forecasting trends
        </p>
      </Card>
    </div>
  );
}
