import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { GuidedTour } from "@/components/GuidedTour";
import { CommandPalette } from "@/components/CommandPalette";
import { RealtimeProvider } from "@/contexts/RealtimeContext";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { KeyboardShortcutsHelp } from "@/components/KeyboardShortcutsHelp";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useState, lazy, Suspense } from "react";
import { UnifiedDataProvider } from "@/contexts/UnifiedDataContext";
import { useAuth } from "@/hooks/useAuth";

// Core pages — loaded eagerly for instant navigation for instant navigation
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/LandingPage";
import DashboardHub from "@/pages/DashboardHub";
import Onboarding from "@/pages/Onboarding";
import SignUpPage from "@/pages/SignUpPage";
import SignInPage from "@/pages/SignInPage";
import Pricing from "@/pages/Pricing";

// Lazy-loaded pages — split into separate chunks for faster initial load
const DemandHub = lazy(() => import("@/pages/DemandHub"));
const ProcurementHub = lazy(() => import("@/pages/ProcurementHub"));
const OperationsHub = lazy(() => import("@/pages/OperationsHub"));
const SupplyChainHub = lazy(() => import("@/pages/SupplyChainHub"));
const StrategyHub = lazy(() => import("@/pages/StrategyHub"));
const Configuration = lazy(() => import("@/pages/Configuration"));
const HowItWorks = lazy(() => import("@/pages/HowItWorks"));
const SopWorkflows = lazy(() => import("@/pages/SopWorkflows"));
const Billing = lazy(() => import("@/pages/Billing"));
const CommodityForecasts = lazy(() => import("@/pages/CommodityForecasts"));
const ApiDocumentation = lazy(() => import("@/pages/ApiDocumentation"));
const PlatformAnalytics = lazy(() => import("@/pages/PlatformAnalytics"));
const PlatformOwnerAnalytics = lazy(() => import("@/pages/PlatformOwnerAnalytics"));
const AgenticAI = lazy(() => import("@/pages/AgenticAI"));
const TermsOfService = lazy(() => import("@/pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const IntegrationChecklist = lazy(() => import("@/pages/IntegrationChecklist"));
const PilotProgram = lazy(() => import("@/pages/PilotProgram"));
const RoiCalculator = lazy(() => import("@/pages/RoiCalculator"));
const SecurityFaq = lazy(() => import("@/pages/SecurityFaq"));
const TrustCenter = lazy(() => import("@/pages/TrustCenter"));
const Contact = lazy(() => import("@/pages/Contact"));
const Status = lazy(() => import("@/pages/Status"));
const LandingPageVariantA = lazy(() => import("@/pages/LandingPageVariantA"));
const LandingPageVariantB = lazy(() => import("@/pages/LandingPageVariantB"));
const LandingPageVariantC = lazy(() => import("@/pages/LandingPageVariantC"));
const NotificationSettings = lazy(() => import("@/pages/NotificationSettings"));
const ShopFloorMode = lazy(() => import("@/pages/ShopFloorMode"));
const Integrations = lazy(() => import("@/pages/Integrations"));
const WebhookIntegrations = lazy(() => import("@/pages/WebhookIntegrations"));
const Automations = lazy(() => import("@/pages/Automations"));
const AuditTrail = lazy(() => import("@/pages/AuditTrail"));
const Allocation = lazy(() => import("@/pages/Allocation"));
const EventMonitoring = lazy(() => import("@/pages/EventMonitoring"));
const PilotRevenueDashboard = lazy(() => import("@/pages/PilotRevenueDashboard"));
const ImpactDashboard = lazy(() => import("@/pages/ImpactDashboard"));
const Training = lazy(() => import("@/pages/Training"));

// Loading fallback for lazy-loaded routes
function PageLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    </div>
  );
}

// Dashboard Hub routes
const DashboardOverviewRoute = () => <DashboardHub initialTab="overview" />;
const DashboardRoiRoute = () => <DashboardHub initialTab="roi" />;
const DashboardReportsRoute = () => <DashboardHub initialTab="reports" />;

// Demand Hub routes
const DemandPlanningRoute = () => <DemandHub initialTab="planning" />;
const DemandAccuracyRoute = () => <DemandHub initialTab="accuracy" />;
const DemandHorizonsRoute = () => <DemandHub initialTab="horizons" />;
const DemandSignalsRoute = () => <DemandHub initialTab="signals" />;
const DemandSopRoute = () => <DemandHub initialTab="sop" />;

// Procurement Hub routes
const ProcurementPurchasingRoute = () => <ProcurementHub initialTab="purchasing" />;
const ProcurementAutoPoRoute = () => <ProcurementHub initialTab="automated-po" />;
const ProcurementRfqRoute = () => <ProcurementHub initialTab="rfq" />;
const ProcurementPlaybooksRoute = () => <ProcurementHub initialTab="playbooks" />;

// Operations Hub routes
const OperationsMachineryRoute = () => <OperationsHub initialTab="machinery" />;
const OperationsProductionRoute = () => <OperationsHub initialTab="production" />;
const OperationsMaintenanceRoute = () => <OperationsHub initialTab="maintenance" />;
const OperationsWorkforceRoute = () => <OperationsHub initialTab="workforce" />;
const OperationsComplianceRoute = () => <OperationsHub initialTab="compliance" />;

// Supply Chain Hub routes
const SupplyChainInventoryRoute = () => <SupplyChainHub initialTab="inventory" />;
const SupplyChainNetworkRoute = () => <SupplyChainHub initialTab="network" />;
const SupplyChainSupplierRiskRoute = () => <SupplyChainHub initialTab="supplier-risk" />;
const SupplyChainErpRoute = () => <SupplyChainHub initialTab="erp" />;
const SupplyChainConsortiumRoute = () => <SupplyChainHub initialTab="consortium" />;

// Strategy Hub routes
const StrategyDigitalTwinRoute = () => <StrategyHub initialTab="digital-twin" />;
const StrategyAnalysisRoute = () => <StrategyHub initialTab="strategic" />;
const StrategyScenariosRoute = () => <StrategyHub initialTab="scenarios" />;
const StrategyMaRoute = () => <StrategyHub initialTab="ma" />;
const StrategyBenchmarkingRoute = () => <StrategyHub initialTab="benchmarking" />;

function Router() {
  const { isAuthenticated, isLoading, needsOnboarding } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/terms" component={TermsOfService} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/how-it-works" component={HowItWorks} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/integration-checklist" component={IntegrationChecklist} />
        <Route path="/pilot-program" component={PilotProgram} />
        <Route path="/roi-calculator" component={RoiCalculator} />
        <Route path="/security" component={SecurityFaq} />
        <Route path="/trust" component={TrustCenter} />
        <Route path="/contact" component={Contact} />
        <Route path="/status" component={Status} />
        <Route path="/signup" component={SignUpPage} />
        <Route path="/signin" component={SignInPage} />
        <Route path="/preview/variant-a" component={LandingPageVariantA} />
        <Route path="/preview/variant-b" component={LandingPageVariantB} />
        <Route path="/preview/variant-c" component={LandingPageVariantC} />
        <Route component={LandingPage} />
      </Switch>
    );
  }

  const bypassOnboardingRoutes = ["/internal/poa"];
  const shouldBypassOnboarding = bypassOnboardingRoutes.includes(location);

  if (needsOnboarding && !shouldBypassOnboarding) {
    return (
      <Switch>
        <Route path="/onboarding" component={Onboarding} />
        <Route component={Onboarding} />
      </Switch>
    );
  }

  return (
    <Suspense fallback={<PageLoadingFallback />}>
    <Switch>
      {/* Main hub routes - Dashboard is default landing for authenticated users */}
      <Route path="/" component={DashboardOverviewRoute} />
      <Route path="/dashboard" component={DashboardOverviewRoute} />
      <Route path="/demand" component={DemandPlanningRoute} />
      <Route path="/supply-chain" component={SupplyChainInventoryRoute} />
      <Route path="/procurement" component={ProcurementPurchasingRoute} />
      <Route path="/operations" component={OperationsMachineryRoute} />
      <Route path="/strategy" component={StrategyDigitalTwinRoute} />
      <Route path="/configuration" component={Configuration} />
      <Route path="/notification-settings" component={NotificationSettings} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route path="/sop-workflows" component={SopWorkflows} />

      {/* Dashboard Hub routes */}
      <Route path="/roi-dashboard" component={DashboardRoiRoute} />
      <Route path="/reports" component={DashboardReportsRoute} />

      {/* Demand & Forecasting routes */}
      <Route path="/forecasting" component={DemandPlanningRoute} />
      <Route path="/forecast-accuracy" component={DemandAccuracyRoute} />
      <Route path="/multi-horizon-forecasts" component={DemandHorizonsRoute} />
      <Route path="/demand-signal-repository" component={DemandSignalsRoute} />
      <Route path="/sop-workspace" component={DemandSopRoute} />
      <Route path="/allocation" component={Allocation} />

      {/* Procurement routes */}
      <Route path="/automated-po" component={ProcurementAutoPoRoute} />
      <Route path="/rfq-generation" component={ProcurementRfqRoute} />
      <Route path="/action-playbooks" component={ProcurementPlaybooksRoute} />
      <Route path="/commodity-forecasts" component={CommodityForecasts} />

      {/* Operations routes */}
      <Route path="/machinery" component={OperationsMachineryRoute} />
      <Route path="/production-kpis" component={OperationsProductionRoute} />
      <Route path="/predictive-maintenance" component={OperationsMaintenanceRoute} />
      <Route path="/workforce" component={OperationsWorkforceRoute} />
      <Route path="/compliance" component={OperationsComplianceRoute} />
      <Route path="/shop-floor" component={ShopFloorMode} />
      <Route path="/operations/machinery" component={OperationsMachineryRoute} />
      <Route path="/operations/production" component={OperationsProductionRoute} />
      <Route path="/operations/maintenance" component={OperationsMaintenanceRoute} />
      <Route path="/operations/workforce" component={OperationsWorkforceRoute} />
      <Route path="/operations/compliance" component={OperationsComplianceRoute} />

      {/* Supply Chain routes */}
      <Route path="/inventory" component={SupplyChainInventoryRoute} />
      <Route path="/inventory-optimization" component={SupplyChainInventoryRoute} />
      <Route path="/traceability" component={SupplyChainNetworkRoute} />
      <Route path="/supply-chain-network" component={SupplyChainNetworkRoute} />
      <Route path="/supplier-risk" component={SupplyChainSupplierRiskRoute} />
      <Route path="/erp-templates" component={SupplyChainErpRoute} />
      <Route path="/industry-consortium" component={SupplyChainConsortiumRoute} />

      {/* Strategy & Insights routes */}
      <Route path="/digital-twin" component={StrategyDigitalTwinRoute} />
      <Route path="/strategic-analysis" component={StrategyAnalysisRoute} />
      <Route path="/scenario-simulation" component={StrategyScenariosRoute} />
      <Route path="/ma-intelligence" component={StrategyMaRoute} />
      <Route path="/peer-benchmarking" component={StrategyBenchmarkingRoute} />
      <Route path="/event-monitoring" component={EventMonitoring} />

      {/* Billing & Subscription routes */}
      <Route path="/pricing" component={Pricing} />
      <Route path="/billing" component={Billing} />

      {/* Developer & Integration routes */}
      <Route path="/api-docs" component={ApiDocumentation} />
      <Route path="/platform-analytics" component={PlatformAnalytics} />
      <Route path="/internal/poa" component={PlatformOwnerAnalytics} />
      <Route path="/integrations" component={Integrations} />
      <Route path="/webhook-integrations" component={WebhookIntegrations} />
      <Route path="/automations" component={Automations} />
      <Route path="/audit-trail" component={AuditTrail} />
      
      {/* Pilot Revenue Dashboard */}
      <Route path="/pilot-revenue" component={PilotRevenueDashboard} />
      
      {/* Agentic AI route */}
      <Route path="/agentic-ai" component={AgenticAI} />

      {/* Federal grant-readiness surfaces */}
      <Route path="/impact" component={ImpactDashboard} />
      <Route path="/training" component={Training} />

      <Route component={NotFound} />
    </Switch>
    </Suspense>
  );
}

function AppLayout() {
  const { isAuthenticated, isLoading, needsOnboarding } = useAuth();
  const [showShortcuts, setShowShortcuts] = useState(false);
  useKeyboardShortcuts(() => setShowShortcuts(true));
  const style = {
    "--sidebar-width": "15rem",
  };

  if (isLoading || !isAuthenticated || needsOnboarding) {
    return <Router />;
  }

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">
            <ErrorBoundary>
              <Router />
            </ErrorBoundary>
          </main>
        </div>
      </div>
      <GuidedTour />
      <CommandPalette />
      <KeyboardShortcutsHelp open={showShortcuts} onOpenChange={setShowShortcuts} />
    </SidebarProvider>
  );
}

function App() {
  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <RealtimeProvider>
            <UnifiedDataProvider>
              <AppLayout />
            </UnifiedDataProvider>
          </RealtimeProvider>
          <Toaster />
          <OfflineIndicator />
        </TooltipProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}

export default App;
