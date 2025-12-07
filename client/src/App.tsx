import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/LandingPage";
import DashboardHub from "@/pages/DashboardHub";
import DemandHub from "@/pages/DemandHub";
import ProcurementHub from "@/pages/ProcurementHub";
import OperationsHub from "@/pages/OperationsHub";
import SupplyChainHub from "@/pages/SupplyChainHub";
import StrategyHub from "@/pages/StrategyHub";
import Configuration from "@/pages/Configuration";
import HowItWorks from "@/pages/HowItWorks";
import SopWorkflows from "@/pages/SopWorkflows";
import Pricing from "@/pages/Pricing";
import Billing from "@/pages/Billing";
import CommodityForecasts from "@/pages/CommodityForecasts";
import ApiDocumentation from "@/pages/ApiDocumentation";
import PlatformAnalytics from "@/pages/PlatformAnalytics";
import AgenticAI from "@/pages/AgenticAI";
import { useAuth } from "@/hooks/useAuth";
import Onboarding from "@/pages/Onboarding";
import TermsOfService from "@/pages/TermsOfService";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import IntegrationChecklist from "@/pages/IntegrationChecklist";
import PilotProgram from "@/pages/PilotProgram";
import RoiCalculator from "@/pages/RoiCalculator";
import SecurityFaq from "@/pages/SecurityFaq";

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
        <Route component={LandingPage} />
      </Switch>
    );
  }

  if (needsOnboarding) {
    return (
      <Switch>
        <Route path="/onboarding" component={Onboarding} />
        <Route component={Onboarding} />
      </Switch>
    );
  }

  return (
    <Switch>
      {/* Main hub routes - Dashboard is default for new users to see Get Started */}
      <Route path="/" component={DashboardOverviewRoute} />
      <Route path="/dashboard" component={DashboardOverviewRoute} />
      <Route path="/demand" component={DemandPlanningRoute} />
      <Route path="/supply-chain" component={SupplyChainInventoryRoute} />
      <Route path="/procurement" component={ProcurementPurchasingRoute} />
      <Route path="/operations" component={OperationsMachineryRoute} />
      <Route path="/strategy" component={StrategyDigitalTwinRoute} />
      <Route path="/configuration" component={Configuration} />
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
      <Route path="/allocation" component={DemandPlanningRoute} />

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

      {/* Billing & Subscription routes */}
      <Route path="/pricing" component={Pricing} />
      <Route path="/billing" component={Billing} />

      {/* Developer & Integration routes */}
      <Route path="/api-docs" component={ApiDocumentation} />
      <Route path="/platform-analytics" component={PlatformAnalytics} />
      
      {/* Agentic AI route */}
      <Route path="/agentic-ai" component={AgenticAI} />

      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  const { isAuthenticated, isLoading, needsOnboarding } = useAuth();
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
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppLayout />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
