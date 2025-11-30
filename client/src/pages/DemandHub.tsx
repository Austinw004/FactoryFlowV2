import { useState, useEffect, lazy } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Target, BarChart3, Radio, Clipboard } from "lucide-react";
import { SafeTabContent } from "@/components/HubErrorBoundary";

const Forecasting = lazy(() => import("./Forecasting"));
const ForecastAccuracy = lazy(() => import("./ForecastAccuracy"));
const MultiHorizonForecasts = lazy(() => import("./MultiHorizonForecasts"));
const DemandSignalRepository = lazy(() => import("./DemandSignalRepository"));
const SopWorkspace = lazy(() => import("./SopWorkspace"));

const tabs = [
  { id: "planning", label: "Demand Planning", icon: TrendingUp, Component: Forecasting },
  { id: "accuracy", label: "Accuracy", icon: Target, Component: ForecastAccuracy },
  { id: "horizons", label: "Multi-Horizon", icon: BarChart3, Component: MultiHorizonForecasts },
  { id: "signals", label: "Demand Signals", icon: Radio, Component: DemandSignalRepository },
  { id: "sop", label: "S&OP", icon: Clipboard, Component: SopWorkspace },
];

interface DemandHubProps {
  initialTab?: string;
}

export default function DemandHub({ initialTab = "planning" }: DemandHubProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 pt-4 pb-0">
          <h1 className="text-2xl font-bold" data-testid="heading-demand-hub">
            Demand & Forecasting
          </h1>
          <p className="text-sm text-muted-foreground mb-3">
            Forecast demand, track accuracy, and align sales & operations
          </p>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-auto p-1 bg-muted/50">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-background"
                  data-testid={`tab-${tab.id}`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        {tabs.map((tab) => (
          activeTab === tab.id && (
            <SafeTabContent key={tab.id} tabName={tab.label}>
              <tab.Component />
            </SafeTabContent>
          )
        ))}
      </div>
    </div>
  );
}
