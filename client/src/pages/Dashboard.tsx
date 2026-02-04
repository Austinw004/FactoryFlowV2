import { KPICard } from "@/components/KPICard";
import { RegimeStatus } from "@/components/RegimeStatus";
import { PolicySignals } from "@/components/PolicySignals";
import { AllocationTable } from "@/components/AllocationTable";
import { ForecastChart } from "@/components/ForecastChart";
import { EditableBudgetGauge } from "@/components/EditableBudgetGauge";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { CreateSKUDialog } from "@/components/CreateSKUDialog";
import { CreateMaterialDialog } from "@/components/CreateMaterialDialog";
import { CreateSupplierDialog } from "@/components/CreateSupplierDialog";
import { FDRTrendChart } from "@/components/FDRTrendChart";
import { MaterialsAtRiskWidget } from "@/components/MaterialsAtRiskWidget";
import { QuickWinsWidget } from "@/components/QuickWinsWidget";
import { RegimeActionCards } from "@/components/RegimeActionCards";
import { IndustryInsightsPanel, IndustryBanner } from "@/components/IndustryInsightsPanel";
import { InfoTooltip } from "@/components/InfoTooltip";
import { ActivityFeed } from "@/components/ActivityFeed";
import { SmartInsightsCompact } from "@/components/SmartInsightsPanel";
import { generateDashboardPDF } from "@/lib/pdfExport";
import { TrendingUp, DollarSign, Package, AlertCircle, Plus, Upload, GitCompare, Loader2, Globe, Radio, Package2, Building2, Box, FileDown, Clock, RefreshCw } from "lucide-react";
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
import { useOnboardingSteps } from "@/hooks/useOnboardingSteps";
import React from "react";
import { useState, useEffect, useCallback } from "react";

const regimeDescriptions: Record<string, string> = {
  HEALTHY_EXPANSION: "Balanced and healthy market conditions. Standard procurement pace recommended.",
  ASSET_LED_GROWTH: "Market heating up - prices starting to rise. Consider accelerating key purchases.",
  IMBALANCED_EXCESS: "Bubble territory - prices too high. Defer non-critical purchases, renegotiate contracts.",
  REAL_ECONOMY_LEAD: "Opportunity zone - best time to buy. Lock in favorable pricing now.",
};

function getRegimeDescription(regime: string): string {
  return regimeDescriptions[regime] || "Economic conditions are being analyzed.";
}

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Enable WebSocket for real-time updates with regime change notifications
  const { isConnected } = useWebSocket((message) => {
    if (message.type === 'regime_change' && message.data) {
      const severity = message.data.severity === 'high' ? 'destructive' : 'default';
      
      toast({
        title: "Economic Regime Changed",
        description: `The economic regime has shifted from ${message.data.from} to ${message.data.to}. FDR: ${message.data.fdr?.toFixed(2)}`,
        variant: severity as 'default' | 'destructive',
        duration: 10000, // Show for 10 seconds
      });
    }
  });
  
  // Creation dialog states
  const [showCreateSKU, setShowCreateSKU] = useState(false);
  const [showCreateMaterial, setShowCreateMaterial] = useState(false);
  const [showCreateSupplier, setShowCreateSupplier] = useState(false);

  // Onboarding checklist
  const { steps, isFullyCompleted, isLoading: onboardingLoading } = useOnboardingSteps();
  
  const { data: companySettings } = useQuery<{ onboardingCompleted?: number; showOnboardingHints?: number }>({
    queryKey: ['/api/company/settings'],
  });
  
  const completeOnboardingMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/onboarding/complete'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/status'] });
      toast({
        title: "Checklist dismissed",
        description: "You can find the checklist in the How It Works section anytime.",
      });
    },
  });

  // Data freshness tracking
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: regime, isLoading: regimeLoading, dataUpdatedAt: regimeUpdatedAt } = useQuery({
    queryKey: ["/api/economics/regime"],
    refetchInterval: 30000, // Refetch every 30 seconds as fallback
    enabled: !!user,
  });

  const { data: allocations = [], isLoading: allocationsLoading, dataUpdatedAt: allocationsUpdatedAt } = useQuery({
    queryKey: ["/api/allocations"],
    enabled: !!user,
  });

  const { data: skus = [], isLoading: skusLoading, dataUpdatedAt: skusUpdatedAt } = useQuery({
    queryKey: ["/api/skus"],
    enabled: !!user,
  });

  // Calculate data freshness
  const getDataAge = useCallback((updatedAt: number | undefined) => {
    if (!updatedAt) return 'Unknown';
    const ageMs = Date.now() - updatedAt;
    const seconds = Math.floor(ageMs / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }, []);

  const getDataFreshnessStatus = useCallback((updatedAt: number | undefined) => {
    if (!updatedAt) return 'stale';
    const ageMs = Date.now() - updatedAt;
    if (ageMs < 60000) return 'fresh'; // < 1 minute
    if (ageMs < 300000) return 'recent'; // < 5 minutes
    return 'stale'; // > 5 minutes
  }, []);

  // Refresh all data
  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/economics/regime"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/allocations"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/skus"] }),
    ]);
    setLastRefreshTime(new Date());
    setIsRefreshing(false);
    toast({
      title: "Data Refreshed",
      description: "All dashboard data has been updated.",
    });
  };

  const latestAllocation = Array.isArray(allocations) && allocations.length > 0 
    ? allocations[0] 
    : null;

  const { data: allocationDetails } = useQuery<{ results: any[] }>({
    queryKey: ["/api/allocations", latestAllocation?.id],
    enabled: !!latestAllocation?.id,
  });

  const seedMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/seed"),
    onSuccess: async () => {
      toast({
        title: "Success",
        description: "Sample data has been loaded successfully!",
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/allocations"], refetchType: 'all' });
      await queryClient.invalidateQueries({ queryKey: ["/api/skus"], refetchType: 'all' });
      await queryClient.invalidateQueries({ queryKey: ["/api/materials"], refetchType: 'all' });
      await queryClient.invalidateQueries({ queryKey: ["/api/suppliers"], refetchType: 'all' });
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

  // Show loading state (wait for auth first, then data)
  if (authLoading || (user && (skusLoading || regimeLoading))) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show empty state
  if (!hasData) {
    return (
      <>
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
            <div className="text-center space-y-6">
              <Package className="h-16 w-16 mx-auto text-muted-foreground" />
              <div>
                <h2 className="text-2xl font-semibold mb-2">Get Started</h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Add your products, materials, and suppliers to start using the platform. 
                  Or explore with sample data first.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={() => setShowCreateSKU(true)}
                  size="lg"
                  data-testid="button-add-first-product"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Product
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => seedMutation.mutate()} 
                  disabled={seedMutation.isPending}
                  size="lg"
                  data-testid="button-load-sample-data"
                >
                  {seedMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Load Sample Data
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
        <CreateSKUDialog open={showCreateSKU} onOpenChange={setShowCreateSKU} />
      </>
    );
  }

  // Main dashboard content
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-muted-foreground">
              Your manufacturing control center
            </p>
            <IndustryBanner />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Data Freshness Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-muted/30" data-testid="data-freshness-indicator">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className={`h-1.5 w-1.5 rounded-full ${getDataFreshnessStatus(regimeUpdatedAt) === 'fresh' ? 'bg-green-500' : getDataFreshnessStatus(regimeUpdatedAt) === 'recent' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                <span className="text-muted-foreground">Regime:</span>
                <span className="font-medium">{getDataAge(regimeUpdatedAt)}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className={`h-1.5 w-1.5 rounded-full ${getDataFreshnessStatus(allocationsUpdatedAt) === 'fresh' ? 'bg-green-500' : getDataFreshnessStatus(allocationsUpdatedAt) === 'recent' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                <span className="text-muted-foreground">Allocations:</span>
                <span className="font-medium">{getDataAge(allocationsUpdatedAt)}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className={`h-1.5 w-1.5 rounded-full ${getDataFreshnessStatus(skusUpdatedAt) === 'fresh' ? 'bg-green-500' : getDataFreshnessStatus(skusUpdatedAt) === 'recent' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                <span className="text-muted-foreground">SKUs:</span>
                <span className="font-medium">{getDataAge(skusUpdatedAt)}</span>
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 ml-1"
              onClick={handleRefreshAll}
              disabled={isRefreshing}
              data-testid="button-refresh-all-data"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <Separator orientation="vertical" className="h-8" />
          <Badge variant={isConnected ? "default" : "outline"} className="gap-1.5" data-testid="badge-connection-status">
            <Radio className={`h-3 w-3 ${isConnected ? 'animate-pulse' : ''}`} />
            {isConnected ? 'Live Updates' : 'Connecting...'}
          </Badge>
          <Separator orientation="vertical" className="h-8" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateSKU(true)}
            data-testid="button-quick-create-sku"
          >
            <Box className="h-4 w-4 mr-2" />
            New SKU
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateMaterial(true)}
            data-testid="button-quick-create-material"
          >
            <Package2 className="h-4 w-4 mr-2" />
            New Material
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateSupplier(true)}
            data-testid="button-quick-create-supplier"
          >
            <Building2 className="h-4 w-4 mr-2" />
            New Supplier
          </Button>
          <Separator orientation="vertical" className="h-8" />
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setLocation('/demand-signal-repository')}
            data-testid="button-import-data"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Data
          </Button>
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setLocation('/forecasting')}
            data-testid="button-run-scenario"
          >
            <GitCompare className="h-4 w-4 mr-2" />
            Run Forecast
          </Button>
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setLocation('/allocation')}
            data-testid="button-new-allocation"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Allocation
          </Button>
          <Separator orientation="vertical" className="h-8" />
          <Button 
            variant="outline"
            size="sm"
            onClick={() => {
              const success = generateDashboardPDF({
                companyName: user?.firstName ? `${user.firstName}'s Company` : 'Prescient Labs',
                exportDate: new Date().toLocaleDateString(),
                fdr,
                regime: friendlyRegime,
                regimeDescription: getRegimeDescription(regimeType),
                totalSKUs: Array.isArray(skus) ? skus.length : 0,
                avgFillRate,
                actionItems: policySignals.length,
                allocations: allocationData.slice(0, 10).map((a: any) => ({
                  skuName: a.sku || 'Unknown',
                  materialName: 'Allocated Material',
                  quantity: a.allocatedUnits || 0,
                  priority: a.priority?.toString() || 'Normal',
                })),
                policySignals: policySignals.slice(0, 5).map((s: any) => ({
                  title: s.title,
                  description: s.description,
                  urgency: s.urgency,
                })),
              });
              if (success) {
                toast({
                  title: "Report exported",
                  description: "Your dashboard report has been downloaded as a PDF.",
                });
              } else {
                toast({
                  title: "Export failed",
                  description: "There was an error generating the PDF. Please try again.",
                  variant: "destructive",
                });
              }
            }}
            data-testid="button-export-pdf"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export PDF
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
          tooltipTerm="fdr"
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
          tooltipTerm="allocation"
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
        <EditableBudgetGauge />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <SmartInsightsCompact />
          <IndustryInsightsPanel maxItems={4} />
        </div>
        <div className="space-y-4">
          <QuickWinsWidget />
          <MaterialsAtRiskWidget />
        </div>
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
      
      {/* Activity Feed */}
      <ActivityFeed limit={10} />
      
      {/* Creation Dialogs */}
      <CreateSKUDialog open={showCreateSKU} onOpenChange={setShowCreateSKU} />
      <CreateMaterialDialog open={showCreateMaterial} onOpenChange={setShowCreateMaterial} />
      <CreateSupplierDialog open={showCreateSupplier} onOpenChange={setShowCreateSupplier} />
    </div>
  );
}
