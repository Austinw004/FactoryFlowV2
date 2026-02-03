import { LayoutDashboard, PieChart, FileText } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, Suspense, lazy } from "react";
import { SafeTabContent } from "@/components/HubErrorBoundary";

const Dashboard = lazy(() => import("./Dashboard"));
const RoiDashboard = lazy(() => import("./RoiDashboard"));
const Reports = lazy(() => import("./Reports"));

const tabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, Component: Dashboard },
  { id: "roi", label: "ROI Analytics", icon: PieChart, Component: RoiDashboard },
  { id: "reports", label: "Reports", icon: FileText, Component: Reports },
];

interface DashboardHubProps {
  initialTab?: string;
}

export default function DashboardHub({ initialTab = "overview" }: DashboardHubProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-background">
        <div className="px-6 pt-4 pb-0">
          <h1 className="text-2xl font-bold" data-testid="heading-dashboard-hub">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mb-3">
            Manufacturing control center with performance insights and reporting
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
      
      <div className="flex-1 overflow-y-auto bg-background">
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
