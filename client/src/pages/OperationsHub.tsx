import { useState, useEffect, lazy } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Wrench, Activity, Radio, Users, Shield, Factory } from "lucide-react";
import { SafeTabContent } from "@/components/HubErrorBoundary";
import { OperationsCommandCenter } from "@/components/OperationsCommandCenter";
import { RegimeOperationsPlaybook } from "@/components/RegimeOperationsPlaybook";
import { SmartInsightsCompact } from "@/components/SmartInsightsPanel";
import { Link } from "wouter";

const Machinery = lazy(() => import("./Machinery"));
const ProductionKPIs = lazy(() => import("./ProductionKPIs"));
const PredictiveMaintenance = lazy(() => import("./PredictiveMaintenance"));
const WorkforceScheduling = lazy(() => import("./WorkforceScheduling"));
const Compliance = lazy(() => import("./Compliance"));

const tabs = [
  { id: "machinery", label: "Machinery", icon: Wrench, Component: Machinery },
  { id: "production", label: "Production", icon: Activity, Component: ProductionKPIs },
  { id: "maintenance", label: "Maintenance", icon: Radio, Component: PredictiveMaintenance },
  { id: "workforce", label: "Workforce", icon: Users, Component: WorkforceScheduling },
  { id: "compliance", label: "Compliance", icon: Shield, Component: Compliance },
];

interface OperationsHubProps {
  initialTab?: string;
}

export default function OperationsHub({ initialTab = "machinery" }: OperationsHubProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showPlaybook, setShowPlaybook] = useState(false);
  
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-background">
        <div className="px-6 pt-4 pb-0">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-operations-hub">
                Operations
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage equipment, production, maintenance, and workforce
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowPlaybook(!showPlaybook)}
                data-testid="button-toggle-playbook"
              >
                {showPlaybook ? "Hide Playbook" : "Regime Playbook"}
              </Button>
              <Link href="/shop-floor">
                <Button size="sm" data-testid="button-shop-floor">
                  <Factory className="h-4 w-4 mr-2" />
                  Shop Floor Mode
                </Button>
              </Link>
            </div>
          </div>
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
        <div className="p-6 space-y-6">
          <SmartInsightsCompact />
          <OperationsCommandCenter />
          
          {showPlaybook && (
            <RegimeOperationsPlaybook />
          )}
        </div>
        
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
