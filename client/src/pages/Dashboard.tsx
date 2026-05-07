import { KPICard } from "@/components/KPICard";
import { RegimeStatus } from "@/components/RegimeStatus";
import { PolicySignals } from "@/components/PolicySignals";
import { AllocationTable } from "@/components/AllocationTable";
import { EditableBudgetGauge } from "@/components/EditableBudgetGauge";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { InfoTooltip } from "@/components/InfoTooltip";

// Below-the-fold and dialog-gated widgets are lazy-loaded so the initial
// Dashboard paint only pays for what the user actually sees before scrolling.
// Each of these groups >20kB of JS that was previously inlined into the
// Dashboard entry chunk.
const CreateSKUDialog = lazy(() =>
  import("@/components/CreateSKUDialog").then((m) => ({ default: m.CreateSKUDialog })),
);
const CreateMaterialDialog = lazy(() =>
  import("@/components/CreateMaterialDialog").then((m) => ({ default: m.CreateMaterialDialog })),
);
const CreateSupplierDialog = lazy(() =>
  import("@/components/CreateSupplierDialog").then((m) => ({ default: m.CreateSupplierDialog })),
);
const MaterialsAtRiskWidget = lazy(() =>
  import("@/components/MaterialsAtRiskWidget").then((m) => ({ default: m.MaterialsAtRiskWidget })),
);
const QuickWinsWidget = lazy(() =>
  import("@/components/QuickWinsWidget").then((m) => ({ default: m.QuickWinsWidget })),
);
const IndustryInsightsPanel = lazy(() =>
  import("@/components/IndustryInsightsPanel").then((m) => ({ default: m.IndustryInsightsPanel })),
);
const ActivityFeed = lazy(() =>
  import("@/components/ActivityFeed").then((m) => ({ default: m.ActivityFeed })),
);
const SmartInsightsCompact = lazy(() =>
  import("@/components/SmartInsightsPanel").then((m) => ({ default: m.SmartInsightsCompact })),
);
const InsightPanel = lazy(() =>
  import("@/components/InsightPanel").then((m) => ({ default: m.InsightPanel })),
);
import { TrendingUp, DollarSign, Package, AlertCircle, Plus, Upload, GitCompare, Loader2, Globe, Radio, Package2, Building2, Box, FileDown } from "lucide-react";
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
import { useState, useEffect, useCallback, lazy, Suspense } from "react";

const regimeDescriptions: Record<string, string> = {
  HEALTHY_EXPANSION: "Balanced growth. FDR < 1.2 indicates equilibrium between asset and real economy circuits. Standard procurement pace.",
  ASSET_LED_GROWTH: "Asset circuit outpacing real economy. FDR 1.2-1.8. Consider accelerating procurement of critical materials.",
  IMBALANCED_EXCESS: "Significant asset-real economy decoupling. FDR 1.8-2.5. Defer non-critical purchases, renegotiate contracts.",
  REAL_ECONOMY_LEAD: "Counter-cyclical opportunity. FDR > 2.5. Lock in favorable supplier terms while asset markets correct.",
};

function getRegimeDescription(regime: string): string {
  return regimeDescriptions[regime] || "Economic conditions are being analyzed.";
}

// Regime-aware procurement posture: prescriptive guidance translating the
// FDR regime into explicit actions a Plant Director or VP of Supply Chain
// can take this week. Each entry pairs a plain-language headline ("what this
// means for procurement") with the reasoning ("why") and the single most
// important next action ("now").
const regimePosture: Record<string, {
  headline: string;
  meaning: string;
  why: string;
  action: { label: string; href: string };
  tone: "calm" | "warm" | "tense" | "opportunity";
}> = {
  HEALTHY_EXPANSION: {
    headline: "Stable conditions — negotiate from a position of strength.",
    meaning: "Asset and real-economy circuits are in balance. Input costs are unlikely to spike or collapse this quarter, so this is a window to lock in long-term contracts on favorable terms rather than react to volatility.",
    why: "When FDR sits below 1.2 historically, supplier negotiating leverage is roughly symmetrical and quoted lead times tend to hold. Use the calm to revisit expiring agreements.",
    action: { label: "Review expiring contracts", href: "/suppliers" },
    tone: "calm",
  },
  ASSET_LED_GROWTH: {
    headline: "Cost pressure building — lock in critical materials now.",
    meaning: "Financial markets are running ahead of the real economy. Input costs typically rise 8–12% over the next quarter under this regime, and lead times begin to lengthen as competitors hedge. Pre-buy critical SKUs and freeze pricing on multi-quarter agreements before suppliers re-quote.",
    why: "FDR between 1.2 and 1.8 has historically preceded broad commodity repricing within 60–90 days. Acting before the next pricing cycle preserves margin you cannot recover later.",
    action: { label: "View materials exposed to price risk", href: "/inventory-management" },
    tone: "warm",
  },
  IMBALANCED_EXCESS: {
    headline: "Decoupling detected — defer non-critical buys, renegotiate.",
    meaning: "Asset prices are significantly disconnected from real demand. Expect a correction in input costs over the next one to two quarters. Defer non-critical purchases, draw down existing safety stock on commoditized items, and reopen negotiation on any contract expiring in 90 days.",
    why: "FDR above 1.8 has historically resolved through input-cost declines as financial conditions tighten. Buying at peak locks in margin compression; waiting captures the correction.",
    action: { label: "Identify deferrable purchase orders", href: "/automated-po" },
    tone: "tense",
  },
  REAL_ECONOMY_LEAD: {
    headline: "Counter-cyclical window — buy ahead, lock multi-year terms.",
    meaning: "The real economy is leading and asset markets are correcting. Suppliers are motivated, capacity is available, and pricing is at a cyclical low. This is the moment to build strategic stock on critical SKUs and lock multi-year supply agreements before the cycle turns.",
    why: "FDR above 2.5 marks the bottom of the input-cost cycle in historical analogues. Forward-buying here typically delivers 6–15% cost advantage versus average-cycle procurement.",
    action: { label: "Plan strategic buy & contract lock-in", href: "/suppliers" },
    tone: "opportunity",
  },
};

function getRegimePosture(regime: string) {
  return regimePosture[regime] || {
    headline: "Analyzing market conditions.",
    meaning: "The platform is gathering economic data to determine the active regime and the procurement posture it implies. Recommendations will sharpen as data flows in.",
    why: "FDR is calculated from 15+ macro indicators. A confident regime call typically requires a few hours of live data after first connect.",
    action: { label: "Review market data sources", href: "/integrations" },
    tone: "calm" as const,
  };
}

// Regime tone mapping → subtle accent classes that visually shift the
// dashboard hero based on the active regime. Calm = neutral. Warm = amber
// (cost pressure rising). Tense = red (decoupling, defer). Opportunity =
// green (favorable conditions). Kept subtle on purpose — the dashboard
// must remain readable, not alarmist.
const regimeToneClasses: Record<string, { accent: string; dot: string; label: string }> = {
  calm: { accent: "border-l-2 border-l-muted-foreground/40", dot: "bg-muted-foreground", label: "Stable" },
  warm: { accent: "border-l-2 border-l-amber-500/70", dot: "bg-amber-500", label: "Cost pressure" },
  tense: { accent: "border-l-2 border-l-red-500/70", dot: "bg-red-500", label: "Decoupling" },
  opportunity: { accent: "border-l-2 border-l-emerald-500/70", dot: "bg-emerald-500", label: "Favorable" },
};

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
        description: `The economic regime has shifted from ${message.data.from} to ${message.data.to}. FDR: ${Number.isFinite(Number(message.data.fdr)) ? Number(message.data.fdr).toFixed(2) : '—'}`,
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

  const { data: subscriptionData } = useQuery<{
    subscription: any;
    status: string;
    tier: string | null;
    trialEndsAt: string | null;
  }>({
    queryKey: ["/api/stripe/subscription"],
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

  const { data: regime, isLoading: regimeLoading, dataUpdatedAt: regimeUpdatedAt } = useQuery<any>({
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

  const regimeData = (regime as any) ?? {};
  const policySignals = regimeData?.signals || regimeData?.policySignals || [];
  const regimeType = regimeData?.regime || "UNKNOWN";
  const fdrRaw = regimeData?.fdr ?? 1.0;
  const fdr = Number.isFinite(Number(fdrRaw)) ? Number(fdrRaw) : 1.0;
  const intensity = regimeData?.intensity ?? 50;
  const economicData = regimeData?.data ?? {};
  const dataSource = regimeData?.source || 'unknown';
  const regimeEvidence = regimeData?.regimeEvidence ?? null;
  const regimeIntelligence = regimeData?.intelligence ?? null;
  
  const sp500Raw = economicData.sp500Index || economicData.sp500 || null;
  const sp500 = sp500Raw != null && Number.isFinite(Number(sp500Raw)) ? Number(sp500Raw) : null;
  const inflationRaw = economicData.inflationRate ?? economicData.inflation ?? null;
  const inflation = inflationRaw != null && Number.isFinite(Number(inflationRaw)) ? Number(inflationRaw) : null;
  const gdpNominalRaw = economicData.gdpNominal || null;
  const gdpNominal = gdpNominalRaw != null && Number.isFinite(Number(gdpNominalRaw)) ? Number(gdpNominalRaw) : null;
  const gdpRealRaw = economicData.gdpReal || null;
  const gdpReal = gdpRealRaw != null && Number.isFinite(Number(gdpRealRaw)) ? Number(gdpRealRaw) : null;
  const sentimentRaw = economicData.sentimentScore;
  const sentiment = sentimentRaw !== undefined && sentimentRaw !== null && Number.isFinite(Number(sentimentRaw)) ? Number(sentimentRaw) : null;

  const regimeLabels: Record<string, string> = {
    "HEALTHY_EXPANSION": "Healthy Expansion",
    "ASSET_LED_GROWTH": "Asset-Led Growth",
    "IMBALANCED_EXCESS": "Imbalanced Excess",
    "REAL_ECONOMY_LEAD": "Real Economy Lead",
    "UNKNOWN": "Analyzing"
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-3xl font-semibold">Dashboard</h1>
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
        <Suspense fallback={null}>
          <CreateSKUDialog open={showCreateSKU} onOpenChange={setShowCreateSKU} />
        </Suspense>
      </>
    );
  }

  // Main dashboard content
  return (
    <div className="p-12 max-w-5xl">
      {/* Trial banner */}
      {subscriptionData?.status === 'trialing' && (
        <div className="trial-banner px-6 py-4 mb-12 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="dot bg-signal"></span>
            <span className="text-sm">Free trial — <span className="text-bone">{subscriptionData?.trialEndsAt ? `${Math.max(0, Math.ceil((new Date(subscriptionData.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days remaining` : 'Active'}</span>. Add billing anytime.</span>
          </div>
          <a href="#/billing" className="text-xs uppercase tracking-[0.14em] text-signal hover:text-bone transition">Choose a plan →</a>
        </div>
      )}

      {(() => {
        const posture = getRegimePosture(regimeType);
        const tone = regimeToneClasses[posture.tone] ?? regimeToneClasses.calm;
        const fdrLabel = Number.isFinite(fdr) ? fdr.toFixed(2) : "—";
        const confidencePct = regimeIntelligence?.confidence?.overall != null
          ? Math.round(Number(regimeIntelligence.confidence.overall) * 100)
          : null;
        return (
          <div className="mb-16">
            <div className="eyebrow mb-4 flex items-center gap-2">
              <span className={`dot ${tone.dot}`} />
              <span>Procurement posture · {tone.label}</span>
              <span className="text-muted/60">·</span>
              <span className="mono normal-case tracking-normal text-[11px]">FDR {fdrLabel}</span>
              {confidencePct !== null && (
                <>
                  <span className="text-muted/60">·</span>
                  <span className="mono normal-case tracking-normal text-[11px]">{confidencePct}% confidence</span>
                </>
              )}
            </div>
            <h1 className="hero text-5xl">{posture.headline}</h1>
            <div className={`mt-6 pl-6 ${tone.accent} max-w-3xl space-y-4`}>
              <p className="text-base leading-relaxed text-foreground/90">
                {posture.meaning}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                <span className="eyebrow mr-2">Why</span>
                {posture.why}
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  size="sm"
                  onClick={() => setLocation(posture.action.href)}
                  data-testid="button-regime-primary-action"
                >
                  {posture.action.label} →
                </Button>
                <span className="text-xs text-muted-foreground">
                  Tracking {Array.isArray(skus) ? skus.length.toLocaleString() : 0} SKU{skus && (skus as any[]).length === 1 ? '' : 's'}
                  {policySignals.length > 0 && ` · ${policySignals.length} action${policySignals.length === 1 ? '' : 's'} recommended this week`}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-4 gap-px bg-line mb-20">
        <div className="bg-panel p-6">
          <div className="eyebrow mb-4">Regime</div>
          <div className="text-3xl display">{regime?.regime ? regime.regime.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()).split(' ').slice(0, 2).join(' ') : '—'}</div>
          <div className="mono text-xs text-muted mt-3">{regime?.fdr != null ? `FDR: ${Number(regime.fdr).toFixed(2)}` : 'Awaiting data'}</div>
        </div>
        <div className="bg-panel p-6">
          <div className="eyebrow mb-4">Active SKUs</div>
          <div className="text-3xl display">{Array.isArray(skus) ? skus.length.toLocaleString() : '—'}</div>
          <div className="mono text-xs text-muted mt-3">{Array.isArray(skus) && skus.length > 0 ? 'Tracked' : 'None yet'}</div>
        </div>
        <div className="bg-panel p-6">
          <div className="eyebrow mb-4">Allocations</div>
          <div className="text-3xl display">{Array.isArray(allocations) ? allocations.length.toLocaleString() : '—'}</div>
          <div className="mono text-xs text-muted mt-3">{Array.isArray(allocations) && allocations.length > 0 ? 'Active' : 'None yet'}</div>
        </div>
        <div className="bg-panel p-6">
          <div className="eyebrow mb-4">Connection</div>
          <div className="text-3xl display">{isConnected ? 'Live' : 'Offline'}</div>
          <div className={`mono text-xs mt-3 ${isConnected ? 'text-good' : 'text-bad'}`}>{isConnected ? 'Real-time active' : 'Reconnecting...'}</div>
        </div>
      </div>

      {/* The previous "Dashboard" h1 + per-source data-freshness indicator
          + per-page Refresh button + Live Updates badge that lived here
          have been removed: the global topbar now owns the breadcrumb,
          the Live indicator, the timestamp, and the single Refresh
          control. Keeping the freshness widgets duplicated here
          competed visually with the new chrome and made the page feel
          busy. The action-button strip (New SKU / Material / Supplier,
          Import, Forecast, Allocation, Export PDF) remains — those are
          page-specific shortcuts that the topbar can't surface. */}
      <div className="flex items-center gap-2 flex-wrap">
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
            onClick={async () => {
              const { generateDashboardPDF } = await import("@/lib/pdfExport");
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

      {regimeData.degraded && (
        <div className="flex items-center gap-2 p-3 rounded-md border bg-muted/50 text-sm" data-testid="alert-data-degraded">
          <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">
            {regimeData.degradedReason || "Economic data temporarily unavailable. Displaying baseline defaults with minimal confidence."}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={TrendingUp}
          label="Market Health"
          value={fdr.toFixed(2)}
          subtitle={friendlyRegime}
          trend={{ value: regimeIntelligence?.confidence?.overall ? `${Math.round(regimeIntelligence.confidence.overall * 100)}% confidence` : "Live", positive: true }}
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
            regimeEvidence={regimeEvidence}
            intelligence={regimeIntelligence}
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
          <Suspense fallback={<div className="h-32 rounded-md bg-muted/20 animate-pulse" />}>
            <SmartInsightsCompact />
            <IndustryInsightsPanel maxItems={4} />
          </Suspense>
        </div>
        <div className="space-y-4">
          <Suspense fallback={<div className="h-32 rounded-md bg-muted/20 animate-pulse" />}>
            <InsightPanel compact />
            <QuickWinsWidget />
            <MaterialsAtRiskWidget regime={regimeType} />
          </Suspense>
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
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-good opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-good"></span>
            </span>
            Live Data
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
                  {dataSource === 'external' ? 'Live APIs' : dataSource === 'fallback' ? 'Fallback (APIs Unavailable)' : 'Balance Sheet'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Market Conditions:</span>
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
                Market Insight: {fdr >= 1.5 ? 'Financial markets are outpacing the real economy — consider deferring major purchases' : fdr >= 1.0 ? 'Moderate market divergence detected — standard procurement pace recommended' : 'Real economy is strong — favorable conditions for locking in supplier terms'}
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
      
      {/* Activity Feed (below the fold — lazy-loaded) */}
      <Suspense fallback={<div className="h-40 rounded-md bg-muted/20 animate-pulse" />}>
        <ActivityFeed limit={10} />
      </Suspense>
      
      {/* Creation Dialogs (lazy-loaded — no render until `open` is true) */}
      <Suspense fallback={null}>
        <CreateSKUDialog open={showCreateSKU} onOpenChange={setShowCreateSKU} />
        <CreateMaterialDialog open={showCreateMaterial} onOpenChange={setShowCreateMaterial} />
        <CreateSupplierDialog open={showCreateSupplier} onOpenChange={setShowCreateSupplier} />
      </Suspense>
    </div>
  );
}
