import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wrench, Activity, Radio, Users, Shield } from "lucide-react";
import Machinery from "./Machinery";
import ProductionKPIs from "./ProductionKPIs";
import PredictiveMaintenance from "./PredictiveMaintenance";
import WorkforceScheduling from "./WorkforceScheduling";
import Compliance from "./Compliance";

const tabs = [
  { id: "machinery", label: "Machinery", icon: Wrench, component: Machinery },
  { id: "production", label: "Production", icon: Activity, component: ProductionKPIs },
  { id: "maintenance", label: "Maintenance", icon: Radio, component: PredictiveMaintenance },
  { id: "workforce", label: "Workforce", icon: Users, component: WorkforceScheduling },
  { id: "compliance", label: "Compliance", icon: Shield, component: Compliance },
];

export default function OperationsHub() {
  const [activeTab, setActiveTab] = useState("machinery");

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 pt-4 pb-0">
          <h1 className="text-2xl font-bold" data-testid="heading-operations-hub">
            Operations
          </h1>
          <p className="text-sm text-muted-foreground mb-3">
            Manage equipment, production, maintenance, and workforce
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
          activeTab === tab.id && <tab.component key={tab.id} />
        ))}
      </div>
    </div>
  );
}
