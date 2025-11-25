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
import Forecasting from "@/pages/Forecasting";
import Allocation from "@/pages/Allocation";
import Procurement from "@/pages/Procurement";
import Reports from "@/pages/Reports";
import Configuration from "@/pages/Configuration";
import HowItWorks from "@/pages/HowItWorks";
import Machinery from "@/pages/Machinery";
import Compliance from "@/pages/Compliance";
import ProductionKPIs from "@/pages/ProductionKPIs";
import PredictiveMaintenance from "@/pages/PredictiveMaintenance";
import InventoryOptimization from "@/pages/InventoryOptimization";
import SupplyChainTraceability from "@/pages/SupplyChainTraceability";
import WorkforceScheduling from "@/pages/WorkforceScheduling";
import InventoryManagement from "@/pages/InventoryManagement";
import SupplyChainNetwork from "@/pages/SupplyChainNetwork";
import SupplyChain from "@/pages/SupplyChain";
import AutomatedPO from "@/pages/AutomatedPO";
import IndustryConsortium from "@/pages/IndustryConsortium";
import MAIntelligence from "@/pages/MAIntelligence";
import StrategicAnalysis from "@/pages/StrategicAnalysis";
import SopWorkspace from "@/pages/SopWorkspace";
import ForecastAccuracy from "@/pages/ForecastAccuracy";
import MultiHorizonForecasts from "@/pages/MultiHorizonForecasts";
import DemandSignalRepository from "@/pages/DemandSignalRepository";
import RfqDashboard from "@/pages/rfq-dashboard";
import PeerBenchmarking from "@/pages/peer-benchmarking";
import { useAuth } from "@/hooks/useAuth";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={LandingPage} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/forecasting" component={Forecasting} />
          <Route path="/allocation" component={Allocation} />
          <Route path="/procurement" component={Procurement} />
          <Route path="/machinery" component={Machinery} />
          <Route path="/compliance" component={Compliance} />
          <Route path="/production-kpis" component={ProductionKPIs} />
          <Route path="/predictive-maintenance" component={PredictiveMaintenance} />
          <Route path="/inventory-optimization" component={InventoryOptimization} />
          <Route path="/supply-chain" component={SupplyChain} />
          <Route path="/traceability" component={SupplyChainTraceability} />
          <Route path="/supply-chain-network" component={SupplyChainNetwork} />
          <Route path="/workforce" component={WorkforceScheduling} />
          <Route path="/inventory" component={InventoryManagement} />
          <Route path="/automated-po" component={AutomatedPO} />
          <Route path="/rfq-generation" component={RfqDashboard} />
          <Route path="/peer-benchmarking" component={PeerBenchmarking} />
          <Route path="/industry-consortium" component={IndustryConsortium} />
          <Route path="/ma-intelligence" component={MAIntelligence} />
          <Route path="/strategic-analysis" component={StrategicAnalysis} />
          <Route path="/sop-workspace" component={SopWorkspace} />
          <Route path="/forecast-accuracy" component={ForecastAccuracy} />
          <Route path="/multi-horizon-forecasts" component={MultiHorizonForecasts} />
          <Route path="/demand-signal-repository" component={DemandSignalRepository} />
          <Route path="/reports" component={Reports} />
          <Route path="/configuration" component={Configuration} />
          <Route path="/how-it-works" component={HowItWorks} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const style = {
    "--sidebar-width": "16rem",
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
