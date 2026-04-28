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
  Shield,
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link, useLocation } from "wouter";
import { SidebarTour } from "@/components/GuidedTour";
import { useUnifiedData } from "@/contexts/UnifiedDataContext";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { PrescientMark } from "@/components/PrescientMark";

const overviewItems = [
  {
    title: "Dashboard",
    description: "Your manufacturing control center",
    url: "/dashboard",
    icon: LayoutDashboard,
    testId: "sidebar-dashboard",
    landingMode: true,
  },
  {
    title: "Pilot Revenue",
    description: "Track pilot program performance and revenue",
    url: "/pilot-revenue",
    icon: BarChart3,
    testId: "sidebar-pilot-revenue",
    landingMode: true,
  },
];

const intelligenceItems = [
  {
    title: "AI Advisor",
    description: "AI-powered recommendations and optimization",
    url: "/agentic-ai",
    icon: Bot,
    testId: "sidebar-agentic-ai",
    landingMode: true,
  },
  {
    title: "Strategy & Insights",
    description: "Scenario planning, digital twin, and benchmarking",
    url: "/strategy",
    icon: Lightbulb,
    testId: "sidebar-strategy",
    landingMode: false,
  },
  {
    title: "Event Monitoring",
    description: "Track supplier disruptions and market changes",
    url: "/event-monitoring",
    icon: AlertTriangle,
    testId: "sidebar-event-monitoring",
    landingMode: false,
  },
];

const operationsItems = [
  {
    title: "Demand & Forecasting",
    description: "Predict demand and plan production schedules",
    url: "/demand",
    icon: TrendingUp,
    testId: "sidebar-demand",
    landingMode: false,
  },
  {
    title: "Supply Chain",
    description: "Inventory, supplier risk, and network visibility",
    url: "/supply-chain",
    icon: Network,
    testId: "sidebar-supply-chain",
    landingMode: false,
  },
  {
    title: "Procurement",
    description: "Purchase orders, RFQs, and commodity tracking",
    url: "/procurement",
    icon: ShoppingCart,
    testId: "sidebar-procurement",
    landingMode: false,
  },
  {
    title: "Operations",
    description: "Machinery, production, maintenance, and workforce",
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
    title: "Audit Trail",
    url: "/audit-trail",
    icon: Shield,
    testId: "sidebar-audit-trail",
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
  const { user } = useAuth();

  const operatorName = (() => {
    if (!user) return "—";
    // Honor the nickname override (Settings → Profile) the same way the AI
    // greeting does. When the user has not set one, fall back to a tighter
    // "F. Lastname" format that matches the design's footer treatment.
    const nickname = user.nickname?.trim();
    if (nickname) return nickname;
    const first = user.firstName?.trim();
    const last = user.lastName?.trim();
    if (first && last) return `${first.charAt(0)}. ${last}`;
    if (first) return first;
    if (last) return last;
    if (user.email) return user.email.split("@")[0];
    return "Operator";
  })();

  // Company name shown beneath the operator. Falls back to "Prescient Labs"
  // when the user hasn't completed the company-onboarding step. We pull
  // from /api/user/profile rather than baking the value into useAuth so the
  // sidebar reflects mid-session company changes.
  const { data: profile } = useQuery<{ user?: { companyName?: string | null } }>({
    queryKey: ["/api/user/profile"],
  });
  const companyName = profile?.user?.companyName?.trim() || "Prescient Labs";

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
          className="ml-auto h-5 min-w-5 px-1.5 text-[10px] font-medium bg-yellow-500/15 text-signal border border-yellow-500/20"
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
          <SidebarMenuItem key={item.title} className="relative">
            {isActive(item.url) && (
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-3.5 bg-signal rounded-r" style={{width: '2px'}}></div>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(item.url)}
                  data-testid={item.testId}
                  className={`h-9 rounded-sm transition-all duration-150 pl-6 text-sm mono ${isActive(item.url) ? 'text-bone' : 'text-soft'}`}
                >
                  <Link href={item.url} className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{item.title}</span>
                    {getAlertBadge(item.url)}
                  </Link>
                </SidebarMenuButton>
              </TooltipTrigger>
              {"description" in item && item.description && (
                <TooltipContent side="right" className="text-xs max-w-48">
                  {item.description}
                </TooltipContent>
              )}
            </Tooltip>
          </SidebarMenuItem>
        ))}
    </SidebarMenu>
  );

  return (
    <Sidebar className="bg-ink border-r border-line">
      <SidebarHeader className="px-6 py-5 border-b border-line h-16 flex items-center">
        {/* Brand block: animated globe mark + wordmark. The mark
            communicates "live telemetry" and replaces the previous
            placeholder 2x2 square. The wordmark uses the same letter-
            spacing as on the marketing site for cross-surface
            consistency. */}
        <Link href="/" className="flex items-center gap-3 w-full" data-testid="sidebar-brand-link">
          <PrescientMark size={20} className="shrink-0 text-bone" />
          <span className="text-sm tracking-[0.18em] font-medium">PRESCIENT LABS</span>
        </Link>
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

      <SidebarFooter className="border-t border-line px-6 py-5">
        {/* Operator block — matches the design's footer treatment.
            The eyebrow is small and tracked; the name is regular weight,
            slightly larger; the company sits below in muted color. */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Operator
          </div>
          <div className="text-sm truncate" data-testid="sidebar-operator-name">
            {operatorName}
          </div>
          <div className="text-xs text-muted-foreground truncate" data-testid="sidebar-operator-company">
            {companyName}
          </div>
        </div>
      </SidebarFooter>

      <div className="px-2 py-2 border-t border-line">
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
      </div>
    </Sidebar>
  );
}
