import { useState, useEffect, lazy } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Network, ShieldAlert, Database, BarChart3, GitBranch } from "lucide-react";
import { SafeTabContent } from "@/components/HubErrorBoundary";

const InventoryManagement = lazy(() => import("./InventoryManagement"));
const SupplyChain = lazy(() => import("./SupplyChain"));
const SupplierRisk = lazy(() => import("./SupplierRisk"));
const ErpTemplates = lazy(() => import("./ErpTemplates"));
const IndustryConsortium = lazy(() => import("./IndustryConsortium"));
const MultiTierSupplierMapping = lazy(() => import("./MultiTierSupplierMapping"));

const tabs = [
  { id: "inventory", label: "Inventory", icon: Package, Component: InventoryManagement },
  { id: "network", label: "Network", icon: Network, Component: SupplyChain },
  { id: "multi-tier", label: "Multi-Tier Map", icon: GitBranch, Component: MultiTierSupplierMapping },
  { id: "supplier-risk", label: "Supplier Risk", icon: ShieldAlert, Component: SupplierRisk },
  { id: "erp", label: "ERP Integration", icon: Database, Component: ErpTemplates },
  { id: "consortium", label: "Consortium", icon: BarChart3, Component: IndustryConsortium },
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
            Supply Chain
          </h1>
          <p className="text-sm text-muted-foreground mb-3">
            Manage inventory, supplier network, risk assessment, and integrations
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
