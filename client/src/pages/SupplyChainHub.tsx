import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Network, BarChart3, Users, Building2, Target, ShieldAlert, Database, Layers } from "lucide-react";
import InventoryManagement from "./InventoryManagement";
import SupplyChain from "./SupplyChain";
import IndustryConsortium from "./IndustryConsortium";
import PeerBenchmarking from "./peer-benchmarking";
import MAIntelligence from "./MAIntelligence";
import StrategicAnalysis from "./StrategicAnalysis";
import SupplierRisk from "./SupplierRisk";
import ErpTemplates from "./ErpTemplates";
import DigitalTwin from "./DigitalTwin";

const tabs = [
  { id: "digital-twin", label: "Digital Twin", icon: Layers, component: DigitalTwin },
  { id: "inventory", label: "Inventory", icon: Package, component: InventoryManagement },
  { id: "network", label: "Network", icon: Network, component: SupplyChain },
  { id: "supplier-risk", label: "Supplier Risk", icon: ShieldAlert, component: SupplierRisk },
  { id: "consortium", label: "Consortium", icon: BarChart3, component: IndustryConsortium },
  { id: "benchmarking", label: "Benchmarking", icon: Users, component: PeerBenchmarking },
  { id: "erp", label: "ERP Integration", icon: Database, component: ErpTemplates },
  { id: "ma", label: "M&A", icon: Building2, component: MAIntelligence },
  { id: "strategic", label: "Strategy", icon: Target, component: StrategicAnalysis },
];

interface SupplyChainHubProps {
  initialTab?: string;
}

export default function SupplyChainHub({ initialTab = "inventory" }: SupplyChainHubProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 pt-4 pb-0">
          <h1 className="text-2xl font-bold" data-testid="heading-supply-chain-hub">
            Supply Chain & Strategy
          </h1>
          <p className="text-sm text-muted-foreground mb-3">
            Manage inventory, suppliers, risk, benchmarking, and strategic analysis
          </p>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-auto p-1 bg-muted/50 flex-wrap">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2 px-3 py-2 data-[state=active]:bg-background"
                  data-testid={`tab-${tab.id}`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden md:inline">{tab.label}</span>
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
