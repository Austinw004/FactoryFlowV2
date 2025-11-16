import {
  LayoutDashboard,
  TrendingUp,
  Boxes,
  ShoppingCart,
  Settings,
  FileText,
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

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Forecasting",
    url: "/forecasting",
    icon: TrendingUp,
  },
  {
    title: "Allocation",
    url: "/allocation",
    icon: Boxes,
  },
  {
    title: "Procurement",
    url: "/procurement",
    icon: ShoppingCart,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: FileText,
  },
  {
    title: "Configuration",
    url: "/configuration",
    icon: Settings,
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
            <p className="text-xs text-muted-foreground">Allocation Intelligence</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                    data-testid={`link-sidebar-${item.title.toLowerCase()}`}
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
      </SidebarContent>
    </Sidebar>
  );
}
