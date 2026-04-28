import { useState, useEffect, lazy } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Network, ShieldAlert, Database, BarChart3, GitBranch, AlertTriangle, PackageX, Building2 } from "lucide-react";
import { SafeTabContent } from "@/components/HubErrorBoundary";
import { SmartInsightsCompact } from "@/components/SmartInsightsPanel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

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

  const { data: skusData } = useQuery<any[]>({
    queryKey: ['/api/skus'],
  });

  const { data: suppliersData } = useQuery<any[]>({
    queryKey: ['/api/suppliers'],
  });

  const lowStockItems = (skusData || []).filter((s: any) => {
    const current = Number(s.currentStock) || 0;
    const safety = Number(s.safetyStock) || 0;
    return current <= safety * 1.2;
  });

  const atRiskSuppliers = (suppliersData || []).filter((s: any) => {
    const riskScore = Number(s.riskScore) || 0;
    return riskScore > 60;
  });

  const hasAlerts = lowStockItems.length > 0 || atRiskSuppliers.length > 0;

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-background">
        <div className="px-6 pt-4 pb-0">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-supply-chain-hub">
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
        <div className="px-6 pt-4 space-y-4">
          {hasAlerts && (
            <Card className="border-destructive/50 bg-destructive/5" data-testid="card-supply-chain-alerts">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-destructive">Active Alerts</h3>
                      <Badge variant="destructive" data-testid="badge-total-alerts">
                        {lowStockItems.length + atRiskSuppliers.length} issue{lowStockItems.length + atRiskSuppliers.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    
                    {lowStockItems.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <PackageX className="h-4 w-4 text-signal" />
                          <span>Low Stock Items ({lowStockItems.length})</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-xs ml-auto"
                            onClick={() => setActiveTab("inventory")}
                            data-testid="button-view-inventory"
                          >
                            View Inventory
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {lowStockItems.slice(0, 6).map((item: any) => (
                            <div 
                              key={item.id} 
                              className="flex items-center justify-between text-sm bg-background rounded-md px-3 py-2 border"
                              data-testid={`alert-low-stock-${item.id}`}
                            >
                              <span className="truncate font-medium">{item.name || item.skuCode || 'Unknown SKU'}</span>
                              <span className="text-muted-foreground text-xs ml-2 whitespace-nowrap">
                                {item.currentStock || 0} / {item.safetyStock || 0}
                              </span>
                            </div>
                          ))}
                          {lowStockItems.length > 6 && (
                            <div className="text-sm text-muted-foreground px-3 py-2">
                              +{lowStockItems.length - 6} more...
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {atRiskSuppliers.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Building2 className="h-4 w-4 text-bad" />
                          <span>At-Risk Suppliers ({atRiskSuppliers.length})</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-xs ml-auto"
                            onClick={() => setActiveTab("supplier-risk")}
                            data-testid="button-view-supplier-risk"
                          >
                            View Supplier Risk
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {atRiskSuppliers.slice(0, 6).map((supplier: any) => (
                            <div 
                              key={supplier.id} 
                              className="flex items-center justify-between text-sm bg-background rounded-md px-3 py-2 border"
                              data-testid={`alert-at-risk-${supplier.id}`}
                            >
                              <span className="truncate font-medium">{supplier.name || 'Unknown Supplier'}</span>
                              <Badge variant="destructive" className="ml-2 text-xs">
                                Risk: {supplier.riskScore || 0}
                              </Badge>
                            </div>
                          ))}
                          {atRiskSuppliers.length > 6 && (
                            <div className="text-sm text-muted-foreground px-3 py-2">
                              +{atRiskSuppliers.length - 6} more...
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          <SmartInsightsCompact />
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
