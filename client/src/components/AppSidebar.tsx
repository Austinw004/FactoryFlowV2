import {
  LayoutDashboard,
  TrendingUp,
  ShoppingCart,
  Settings,
  BookOpen,
  Wrench,
  Network,
  Lightbulb,
  Eye,
  Bot,
  Plug,
  Webhook,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { SidebarTour } from "@/components/GuidedTour";
import { useUnifiedData } from "@/contexts/UnifiedDataContext";
import { useQuery } from "@tanstack/react-query";

const roiFocusedItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    testId: "sidebar-dashboard",
    landingMode: true,
  },
  {
    title: "Pilot Revenue",
    url: "/pilot-revenue",
    icon: BarChart3,
    testId: "sidebar-pilot-revenue",
    landingMode: true,
  },
  {
    title: "Agentic AI",
    url: "/agentic-ai",
    icon: Bot,
    testId: "sidebar-agentic-ai",
    landingMode: true,
  },
];

const advancedItems = [
  {
    title: "Strategy & Insights",
    url: "/strategy",
    icon: Lightbulb,
    testId: "sidebar-strategy",
    landingMode: false,
  },
  {
    title: "Event Monitoring",
    url: "/event-monitoring",
    icon: AlertTriangle,
    testId: "sidebar-event-monitoring",
    landingMode: false,
  },
  {
    title: "Demand & Forecasting",
    url: "/demand",
    icon: TrendingUp,
    testId: "sidebar-demand",
    landingMode: false,
  },
  {
    title: "Supply Chain",
    url: "/supply-chain",
    icon: Network,
    testId: "sidebar-supply-chain",
    landingMode: false,
  },
  {
    title: "Procurement",
    url: "/procurement",
    icon: ShoppingCart,
    testId: "sidebar-procurement",
    landingMode: false,
  },
  {
    title: "Operations",
    url: "/operations",
    icon: Wrench,
    testId: "sidebar-operations",
    landingMode: false,
  },
];

const mainMenuItems = [...roiFocusedItems, ...advancedItems];

const bottomMenuItems = [
  {
    title: "Integrations",
    url: "/integrations",
    icon: Plug,
    testId: "sidebar-integrations",
  },
  {
    title: "Webhooks",
    url: "/webhook-integrations",
    icon: Webhook,
    testId: "sidebar-webhooks",
  },
  {
    title: "Settings",
    url: "/configuration",
    icon: Settings,
    testId: "sidebar-settings",
  },
  {
    title: "How It Works",
    url: "/how-it-works",
    icon: BookOpen,
    testId: "sidebar-how-it-works",
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { inventory, suppliers, commodities, isLoading } = useUnifiedData();

  const { data: landingMode } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/landing-mode"],
  });
  const isLandingMode = landingMode?.enabled ?? false;

  const visibleMenuItems = isLandingMode
    ? roiFocusedItems
    : mainMenuItems;

  const agenticRoutes = ["/agentic-ai"];
  const strategyRoutes = ["/strategy", "/digital-twin", "/strategic-analysis", "/scenario-simulation", "/ma-intelligence", "/peer-benchmarking"];
  const dashboardRoutes = ["/", "/dashboard", "/roi-dashboard", "/reports", "/pilot-revenue"];
  
  const isActive = (url: string) => {
    if (url === "/agentic-ai") return agenticRoutes.includes(location) || location.startsWith("/agentic-ai");
    if (url === "/strategy") return strategyRoutes.includes(location) || location.startsWith("/strategy");
    if (url === "/dashboard") return dashboardRoutes.includes(location) || location.startsWith("/dashboard");
    return location.startsWith(url);
  };

  const getAlertBadge = (url: string) => {
    if (isLoading) return null;
    
    if (url === "/supply-chain") {
      const alerts = inventory.lowStockCount + suppliers.atRiskCount;
      if (alerts > 0) {
        return (
          <Badge 
            variant="destructive" 
            className="ml-auto h-5 min-w-5 px-1.5 text-[10px]"
            data-testid="badge-supply-chain-alerts"
          >
            {alerts > 9 ? "9+" : alerts}
          </Badge>
        );
      }
    }
    
    if (url === "/procurement" && commodities.rising > 2) {
      return (
        <Badge 
          className="ml-auto h-5 min-w-5 px-1.5 text-[10px] bg-yellow-500 text-yellow-950"
          data-testid="badge-procurement-commodities"
        >
          {commodities.rising}
        </Badge>
      );
    }
    
    return null;
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
            <Eye className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Prescient Labs</h2>
            <p className="text-xs text-muted-foreground">Manufacturing Intelligence</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="flex flex-col">
        <SidebarGroup className="flex-1">
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={item.testId}
                    className="h-10"
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1">{item.title}</span>
                      {getAlertBadge(item.url)}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          <SidebarTour />
          {bottomMenuItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.url)}
                data-testid={item.testId}
              >
                <Link href={item.url}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
