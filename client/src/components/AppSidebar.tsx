import {
  LayoutDashboard,
  TrendingUp,
  Boxes,
  ShoppingCart,
  Settings,
  FileText,
  BookOpen,
  Wrench,
  Shield,
  Activity,
  Radio,
  Package,
  Network,
  Users,
  AlertTriangle,
  Zap,
  BarChart3,
  Building2,
  Target,
  Clipboard,
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
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";

const menuSections = [
  {
    label: "Planning & Purchasing",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Demand Planning",
        url: "/forecasting",
        icon: TrendingUp,
      },
      {
        title: "Forecast Accuracy",
        url: "/forecast-accuracy",
        icon: Target,
        testId: "sidebar-forecast-accuracy",
      },
      {
        title: "Multi-Horizon Forecasts",
        url: "/multi-horizon-forecasts",
        icon: BarChart3,
        testId: "sidebar-multi-horizon",
      },
      {
        title: "Material Planning",
        url: "/allocation",
        icon: Boxes,
      },
      {
        title: "S&OP Workspace",
        url: "/sop-workspace",
        icon: Clipboard,
        testId: "sidebar-sop-workspace",
      },
      {
        title: "Purchasing",
        url: "/procurement",
        icon: ShoppingCart,
      },
      {
        title: "Automated PO Execution",
        url: "/automated-po",
        icon: Zap,
      },
      {
        title: "RFQ Generation",
        url: "/rfq-generation",
        icon: FileText,
        testId: "sidebar-rfq-generation",
      },
    ],
  },
  {
    label: "Operations & Equipment",
    items: [
      {
        title: "Machinery",
        url: "/machinery",
        icon: Wrench,
      },
      {
        title: "Production Tracking",
        url: "/production-kpis",
        icon: Activity,
      },
      {
        title: "Equipment Maintenance",
        url: "/predictive-maintenance",
        icon: Radio,
      },
    ],
  },
  {
    label: "Inventory & Supply Chain",
    items: [
      {
        title: "Inventory Management",
        url: "/inventory",
        icon: Package,
      },
      {
        title: "Supply Chain Intelligence",
        url: "/supply-chain",
        icon: Network,
        testId: "sidebar-supply-chain",
      },
      {
        title: "Industry Consortium",
        url: "/industry-consortium",
        icon: BarChart3,
      },
      {
        title: "M&A Intelligence",
        url: "/ma-intelligence",
        icon: Building2,
      },
      {
        title: "Strategic Analysis",
        url: "/strategic-analysis",
        icon: Target,
        testId: "sidebar-strategic-analysis",
      },
    ],
  },
  {
    label: "Quality & People",
    items: [
      {
        title: "Compliance",
        url: "/compliance",
        icon: Shield,
      },
      {
        title: "Workforce",
        url: "/workforce",
        icon: Users,
      },
    ],
  },
  {
    label: "Settings & Help",
    items: [
      {
        title: "Reports",
        url: "/reports",
        icon: FileText,
      },
      {
        title: "Settings",
        url: "/configuration",
        icon: Settings,
      },
      {
        title: "How It Works",
        url: "/how-it-works",
        icon: BookOpen,
      },
    ],
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  
  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <Boxes className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Manufacturing AI</h2>
            <p className="text-xs text-muted-foreground">Smart Planning</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {menuSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item: any) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={location === item.url}
                      data-testid={item.testId || `link-sidebar-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
