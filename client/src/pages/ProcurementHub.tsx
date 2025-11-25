import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Zap, FileText } from "lucide-react";
import Procurement from "./Procurement";
import AutomatedPO from "./AutomatedPO";
import RfqDashboard from "./rfq-dashboard";

const tabs = [
  { id: "purchasing", label: "Purchasing", icon: ShoppingCart, component: Procurement },
  { id: "automated-po", label: "Auto PO", icon: Zap, component: AutomatedPO },
  { id: "rfq", label: "RFQ Generation", icon: FileText, component: RfqDashboard },
];

interface ProcurementHubProps {
  initialTab?: string;
}

export default function ProcurementHub({ initialTab = "purchasing" }: ProcurementHubProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 pt-4 pb-0">
          <h1 className="text-2xl font-bold" data-testid="heading-procurement-hub">
            Procurement
          </h1>
          <p className="text-sm text-muted-foreground mb-3">
            Manage suppliers, automate purchase orders, and generate RFQs
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
