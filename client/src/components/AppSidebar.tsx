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
  ChevronRight,
  Zap,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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

const overviewItems = [
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
];

const intelligenceItems = [
  {
    title: "Agentic AI",
    url: "/agentic-ai",
    icon: Bot,
    testId: "sidebar-agentic-ai",
    landingMode: true,
  },
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
];

const operationsItems = [
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

const bottomMenuItems = [
  {
    title: "Automations",
    url: "/automations",
    icon: Zap,
    testId: "sidebar-automations",
  },
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
            className="ml-auto h-5 min-w-5 px-1.5 text-[10px] font-medium"
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
          className="ml-auto h-5 min-w-5 px-1.5 text-[10px] font-medium bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20"
          data-testid="badge-procurement-commodities"
        >
          {commodities.rising}
        </Badge>
      );
    }

    return null;
  };

  const renderMenuSection = (items: typeof overviewItems) => (
    <SidebarMenu>
      {items
        .filter(item => !isLandingMode || item.landingMode)
        .map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              asChild
              isActive={isActive(item.url)}
              data-testid={item.testId}
              className="h-9 rounded-lg transition-all duration-150"
            >
              <Link href={item.url}>
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{item.title}</span>
                {getAlertBadge(item.url)}
                {isActive(item.url) && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
    </SidebarMenu>
  );

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-sm">
            <Eye className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-sm tracking-tight leading-none">Prescient Labs</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5 tracking-wide uppercase">Manufacturing Intelligence</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex flex-col px-2 pt-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 px-3 mb-1">
            Overview
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {renderMenuSection(overviewItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-1">
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 px-3 mb-1">
            Intelligence
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {renderMenuSection(intelligenceItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {!isLandingMode && (
          <SidebarGroup className="mt-1">
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 px-3 mb-1">
              Operations
            </SidebarGroupLabel>
            <SidebarGroupContent>
              {renderMenuSection(operationsItems)}
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-2 py-2">
        <SidebarMenu>
          <SidebarTour />
          {bottomMenuItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.url)}
                data-testid={item.testId}
                className="h-8 text-muted-foreground hover:text-foreground rounded-lg transition-all duration-150"
              >
                <Link href={item.url}>
                  <item.icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-[13px]">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
