import { KPICard } from "@/components/KPICard";
import { RegimeStatus } from "@/components/RegimeStatus";
import { PolicySignals } from "@/components/PolicySignals";
import { AllocationTable } from "@/components/AllocationTable";
import { ForecastChart } from "@/components/ForecastChart";
import { TrendingUp, DollarSign, Package, AlertCircle, Plus, Upload, GitCompare, Loader2, Globe, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Enable WebSocket for real-time updates
  const { isConnected } = useWebSocket();

  const { data: regime, isLoading: regimeLoading } = useQuery({
    queryKey: ["/api/economics/regime"],
    refetchInterval: 30000, // Refetch every 30 seconds as fallback
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
  const policySignals = regimeData.signals || regimeData.policySignals || [];
  const regimeType = regimeData.regime || "UNKNOWN";
  const fdr = regimeData.fdr || 1.0;
  const intensity = regimeData.intensity || 50;
  const economicData = regimeData.data || {};
  const dataSource = regimeData.source || 'unknown';
  
  // Fallback values for economic data
  const sp500 = economicData.sp500Index || economicData.sp500 || null;
  const inflation = economicData.inflationRate || economicData.inflation || null;
  const gdpNominal = economicData.gdpNominal || null;
  const gdpReal = economicData.gdpReal || null;
  const sentiment = economicData.sentimentScore !== undefined ? economicData.sentimentScore : null;

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
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "default" : "outline"} className="gap-1.5">
              <Radio className={`h-3 w-3 ${isConnected ? 'animate-pulse' : ''}`} />
              {isConnected ? 'Live Updates' : 'Connecting...'}
            </Badge>
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
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "outline"} className="gap-1.5" data-testid="badge-connection-status">
            <Radio className={`h-3 w-3 ${isConnected ? 'animate-pulse' : ''}`} />
            {isConnected ? 'Live Updates' : 'Connecting...'}
          </Badge>
          <Button 
            variant="outline" 
            onClick={() => seedMutation.mutate()} 
            disabled={seedMutation.isPending}
            data-testid="button-import-data"
          >
            <Upload className="h-4 w-4 mr-2" />
            Reload Sample Data
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setLocation('/forecasting')}
            data-testid="button-run-scenario"
          >
            <GitCompare className="h-4 w-4 mr-2" />
            Run Forecast
          </Button>
          <Button 
            onClick={() => setLocation('/allocation')}
            data-testid="button-new-allocation"
          >
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

      <div className="grid grid-cols-1 gap-4">
        <RegimeStatus 
          regime={regimeType} 
          fdr={fdr} 
          intensity={intensity} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Allocations</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLocation('/allocation')}
                data-testid="button-view-all"
              >
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
              <div className="text-sm font-medium text-muted-foreground">Financial Markets</div>
              <Globe className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">S&P 500:</span>
                <span className="font-semibold">
                  {sp500 ? sp500.toLocaleString() : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Inflation Rate:</span>
                <span className="font-semibold">
                  {inflation !== null ? `${(inflation * 100).toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">FDR Ratio:</span>
                <span className="font-semibold">{fdr.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-muted-foreground">Real Economy</div>
              <Globe className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">GDP (Nominal):</span>
                <span className="font-semibold">
                  {gdpNominal ? `$${(gdpNominal / 1e12).toFixed(1)}T` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GDP (Real):</span>
                <span className="font-semibold">
                  {gdpReal ? `$${(gdpReal / 1e12).toFixed(1)}T` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sentiment:</span>
                {sentiment !== null ? (
                  <Badge className={sentiment > 0.5 ? "bg-green-600" : sentiment < -0.5 ? "bg-red-600" : "bg-yellow-600"}>
                    {sentiment > 0.5 ? 'Bullish' : sentiment < -0.5 ? 'Bearish' : 'Neutral'}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-muted-foreground">Data Source</div>
              <Globe className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source:</span>
                <Badge variant={dataSource === 'external' ? 'default' : 'secondary'}>
                  {dataSource === 'external' ? 'Live APIs' : dataSource === 'fallback' ? 'Mock Data' : 'Balance Sheet'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Economic Regime:</span>
                <span className="font-semibold text-xs">{friendlyRegime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated:</span>
                <span className="font-semibold text-xs">
                  {regimeData.timestamp ? new Date(regimeData.timestamp).toLocaleTimeString() : 'Live'}
                </span>
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
                FDR Analysis: {fdr >= 1.5 ? 'Financial markets significantly outpacing real economy' : fdr >= 1.0 ? 'Moderate financial-real divergence detected' : 'Real economy leading financial markets'}
              </p>
              <p className="text-muted-foreground">
                Current FDR ratio of {fdr.toFixed(2)} indicates <strong>{friendlyRegime}</strong> regime. 
                {dataSource === 'external' && ' The platform is gathering data from 15+ external APIs including FRED, Alpha Vantage, DBnomics, World Bank, IMF, OECD, and Trading Economics to calculate real-time FDR.'}
                {dataSource === 'fallback' && ' Using simulated economic data while external APIs are unavailable.'}
                {dataSource === 'balance_sheet' && ' Calculated from internal balance sheet and income statement data.'}
                {' '}All forecasts, allocations, and procurement signals are automatically adjusted based on the current economic regime.
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
