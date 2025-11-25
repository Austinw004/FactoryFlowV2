import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Network, BarChart3, Users, Building2, Target } from "lucide-react";
import InventoryManagement from "./InventoryManagement";
import SupplyChain from "./SupplyChain";
import IndustryConsortium from "./IndustryConsortium";
import PeerBenchmarking from "./peer-benchmarking";
import MAIntelligence from "./MAIntelligence";
import StrategicAnalysis from "./StrategicAnalysis";

const tabs = [
  { id: "inventory", label: "Inventory", icon: Package, component: InventoryManagement },
  { id: "network", label: "Network", icon: Network, component: SupplyChain },
  { id: "consortium", label: "Consortium", icon: BarChart3, component: IndustryConsortium },
  { id: "benchmarking", label: "Benchmarking", icon: Users, component: PeerBenchmarking },
  { id: "ma", label: "M&A", icon: Building2, component: MAIntelligence },
  { id: "strategic", label: "Strategy", icon: Target, component: StrategicAnalysis },
];

export default function SupplyChainHub() {
  const [activeTab, setActiveTab] = useState("inventory");

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 pt-4 pb-0">
          <h1 className="text-2xl font-bold" data-testid="heading-supply-chain-hub">
            Supply Chain & Strategy
          </h1>
          <p className="text-sm text-muted-foreground mb-3">
            Manage inventory, suppliers, benchmarking, and strategic analysis
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
