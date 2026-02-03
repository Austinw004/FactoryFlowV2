import { useState, useEffect, lazy } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, Target, FlaskConical, Building2, Users, Globe } from "lucide-react";
import { SafeTabContent } from "@/components/HubErrorBoundary";

const DigitalTwin = lazy(() => import("./DigitalTwin"));
const StrategicAnalysis = lazy(() => import("./StrategicAnalysis"));
const ScenarioSimulation = lazy(() => import("./ScenarioSimulation"));
const MAIntelligence = lazy(() => import("./MAIntelligence"));
const PeerBenchmarking = lazy(() => import("./peer-benchmarking"));
const EventMonitoring = lazy(() => import("./EventMonitoring"));

const tabs = [
  { id: "digital-twin", label: "Digital Twin", icon: Layers, Component: DigitalTwin },
  { id: "events", label: "Event Monitoring", icon: Globe, Component: EventMonitoring },
  { id: "strategic", label: "Strategic Analysis", icon: Target, Component: StrategicAnalysis },
  { id: "scenarios", label: "Scenarios", icon: FlaskConical, Component: ScenarioSimulation },
  { id: "ma", label: "M&A Intelligence", icon: Building2, Component: MAIntelligence },
  { id: "benchmarking", label: "Benchmarking", icon: Users, Component: PeerBenchmarking },
];

interface StrategyHubProps {
  initialTab?: string;
}

export default function StrategyHub({ initialTab = "digital-twin" }: StrategyHubProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-background">
        <div className="px-6 pt-4 pb-0">
          <h1 className="text-2xl font-bold" data-testid="heading-strategy-hub">
            Strategy & Insights
          </h1>
          <p className="text-sm text-muted-foreground mb-3">
            Digital twin, strategic analysis, scenario modeling, and competitive intelligence
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
