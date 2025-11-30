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
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-10">
              {tabs.map((tab) => (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id}
                  className="gap-2"
                  data-testid={`tab-${tab.id}`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
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
