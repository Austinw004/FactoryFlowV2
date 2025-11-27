import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/LandingPage";
import Dashboard from "@/pages/Dashboard";
import DemandHub from "@/pages/DemandHub";
import ProcurementHub from "@/pages/ProcurementHub";
import OperationsHub from "@/pages/OperationsHub";
import SupplyChainHub from "@/pages/SupplyChainHub";
import Reports from "@/pages/Reports";
import Configuration from "@/pages/Configuration";
import HowItWorks from "@/pages/HowItWorks";
import RoiDashboard from "@/pages/RoiDashboard";
import ErpTemplates from "@/pages/ErpTemplates";
import ActionPlaybooks from "@/pages/ActionPlaybooks";
import ScenarioSimulation from "@/pages/ScenarioSimulation";
import SupplierRisk from "@/pages/SupplierRisk";
import { useAuth } from "@/hooks/useAuth";

const DemandPlanningRoute = () => <DemandHub initialTab="planning" />;
const DemandAccuracyRoute = () => <DemandHub initialTab="accuracy" />;
const DemandHorizonsRoute = () => <DemandHub initialTab="horizons" />;
const DemandSignalsRoute = () => <DemandHub initialTab="signals" />;
const DemandSopRoute = () => <DemandHub initialTab="sop" />;

const ProcurementPurchasingRoute = () => <ProcurementHub initialTab="purchasing" />;
const ProcurementAutoPoRoute = () => <ProcurementHub initialTab="automated-po" />;
const ProcurementRfqRoute = () => <ProcurementHub initialTab="rfq" />;

const OperationsMachineryRoute = () => <OperationsHub initialTab="machinery" />;
const OperationsProductionRoute = () => <OperationsHub initialTab="production" />;
const OperationsMaintenanceRoute = () => <OperationsHub initialTab="maintenance" />;
const OperationsWorkforceRoute = () => <OperationsHub initialTab="workforce" />;
const OperationsComplianceRoute = () => <OperationsHub initialTab="compliance" />;

const SupplyChainInventoryRoute = () => <SupplyChainHub initialTab="inventory" />;
const SupplyChainNetworkRoute = () => <SupplyChainHub initialTab="network" />;
const SupplyChainConsortiumRoute = () => <SupplyChainHub initialTab="consortium" />;
const SupplyChainBenchmarkingRoute = () => <SupplyChainHub initialTab="benchmarking" />;
const SupplyChainMaRoute = () => <SupplyChainHub initialTab="ma" />;
const SupplyChainStrategicRoute = () => <SupplyChainHub initialTab="strategic" />;

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

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
        <Route component={LandingPage} />
      </Switch>
    );
  }

  return (
    <Switch>
      {/* Main routes */}
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/demand" component={DemandPlanningRoute} />
      <Route path="/procurement" component={ProcurementPurchasingRoute} />
      <Route path="/operations" component={OperationsMachineryRoute} />
      <Route path="/supply-chain" component={SupplyChainInventoryRoute} />
      <Route path="/reports" component={Reports} />
      <Route path="/roi-dashboard" component={RoiDashboard} />
      <Route path="/erp-templates" component={ErpTemplates} />
      <Route path="/action-playbooks" component={ActionPlaybooks} />
      <Route path="/scenario-simulation" component={ScenarioSimulation} />
      <Route path="/supplier-risk" component={SupplierRisk} />
      <Route path="/configuration" component={Configuration} />
      <Route path="/how-it-works" component={HowItWorks} />

      {/* Legacy routes - Demand & Forecasting */}
      <Route path="/forecasting" component={DemandPlanningRoute} />
      <Route path="/forecast-accuracy" component={DemandAccuracyRoute} />
      <Route path="/multi-horizon-forecasts" component={DemandHorizonsRoute} />
      <Route path="/demand-signal-repository" component={DemandSignalsRoute} />
      <Route path="/sop-workspace" component={DemandSopRoute} />
      <Route path="/allocation" component={DemandPlanningRoute} />

      {/* Legacy routes - Procurement */}
      <Route path="/automated-po" component={ProcurementAutoPoRoute} />
      <Route path="/rfq-generation" component={ProcurementRfqRoute} />

      {/* Legacy routes - Operations */}
      <Route path="/machinery" component={OperationsMachineryRoute} />
      <Route path="/production-kpis" component={OperationsProductionRoute} />
      <Route path="/predictive-maintenance" component={OperationsMaintenanceRoute} />
      <Route path="/workforce" component={OperationsWorkforceRoute} />
      <Route path="/compliance" component={OperationsComplianceRoute} />

      {/* Legacy routes - Supply Chain */}
      <Route path="/inventory" component={SupplyChainInventoryRoute} />
      <Route path="/inventory-optimization" component={SupplyChainInventoryRoute} />
      <Route path="/traceability" component={SupplyChainNetworkRoute} />
      <Route path="/supply-chain-network" component={SupplyChainNetworkRoute} />
      <Route path="/industry-consortium" component={SupplyChainConsortiumRoute} />
      <Route path="/peer-benchmarking" component={SupplyChainBenchmarkingRoute} />
      <Route path="/ma-intelligence" component={SupplyChainMaRoute} />
      <Route path="/strategic-analysis" component={SupplyChainStrategicRoute} />

      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const style = {
    "--sidebar-width": "15rem",
  };

  if (isLoading || !isAuthenticated) {
    return <Router />;
  }

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">
            <Router />
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
