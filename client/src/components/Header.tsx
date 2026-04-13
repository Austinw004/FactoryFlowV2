import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { LiveAnalysisIndicator } from "./LiveAnalysisIndicator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bell, User, CreditCard, Settings, LogOut, Search, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/pilot-revenue": "Pilot Revenue",
  "/agentic-ai": "Agentic AI",
  "/strategy": "Strategy & Insights",
  "/event-monitoring": "Event Monitoring",
  "/demand": "Demand & Forecasting",
  "/supply-chain": "Supply Chain",
  "/procurement": "Procurement",
  "/operations": "Operations",
  "/integrations": "Integrations",
  "/webhook-integrations": "Webhooks",
  "/configuration": "Settings",
  "/how-it-works": "How It Works",
  "/billing": "Billing",
  "/pricing": "Pricing",
  "/notification-settings": "Notifications",
  "/allocation": "Allocation",
  "/sop-workflows": "S&OP Workflows",
  "/commodity-forecasts": "Commodity Forecasts",
  "/api-documentation": "API Documentation",
  "/platform-analytics": "Platform Analytics",
  "/shop-floor": "Shop Floor",
};

const routeParents: Record<string, string> = {
  "/pilot-revenue": "Overview",
  "/agentic-ai": "Intelligence",
  "/strategy": "Intelligence",
  "/event-monitoring": "Intelligence",
  "/demand": "Operations",
  "/supply-chain": "Operations",
  "/procurement": "Operations",
  "/operations": "Operations",
  "/integrations": "Configuration",
  "/webhook-integrations": "Configuration",
  "/configuration": "Configuration",
  "/billing": "Account",
  "/pricing": "Account",
};

function getBreadcrumb(location: string): { parent?: string; current: string } {
  const matchedKey = Object.keys(routeTitles)
    .filter(key => location.startsWith(key))
    .sort((a, b) => b.length - a.length)[0];

  const current = matchedKey ? routeTitles[matchedKey] : "Dashboard";
  const parent = matchedKey ? routeParents[matchedKey] : undefined;
  return { parent, current };
}

export function Header() {
  const [location, setLocation] = useLocation();

  const { data: subscriptionData } = useQuery<{
    subscription: any;
    status: string;
    tier: string | null;
    trialEndsAt: string | null;
  }>({
    queryKey: ["/api/stripe/subscription"],
  });

  const tier = subscriptionData?.tier;
  const status = subscriptionData?.status;
  const isTrialing = status === "trialing";
  const hasSubscription = tier && status !== "none" && status !== "canceled";
  const breadcrumb = getBreadcrumb(location);

  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-border/60 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-3 min-w-0">
        <SidebarTrigger data-testid="button-sidebar-toggle" className="shrink-0" />
        <Separator orientation="vertical" className="h-5 hidden sm:block" />

        {/* Breadcrumb */}
        <nav className="hidden sm:flex items-center gap-1 text-sm min-w-0">
          {breadcrumb.parent && (
            <>
              <span className="text-muted-foreground/60 text-xs font-medium">{breadcrumb.parent}</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
            </>
          )}
          <span className="font-medium text-foreground truncate">{breadcrumb.current}</span>
        </nav>

        <div className="ml-2">
          <LiveAnalysisIndicator />
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Quick search trigger */}
        <Button
          variant="outline"
          size="sm"
          className="hidden md:flex items-center gap-2 text-muted-foreground h-8 px-3 rounded-lg border-border/60"
          onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))}
          data-testid="button-search"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="text-xs">Search...</span>
          <kbd className="pointer-events-none ml-2 hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border border-border/60 bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </Button>

        <Separator orientation="vertical" className="h-5 mx-1 hidden md:block" />

        {/* Upgrade CTA for non-subscribers */}
        {!hasSubscription && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/pricing")}
            className="h-8 text-xs"
            data-testid="button-upgrade-cta"
          >
            Upgrade
          </Button>
        )}

        {/* Trial badge */}
        {isTrialing && (
          <Badge
            variant="secondary"
            className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 cursor-pointer text-xs"
            onClick={() => setLocation("/billing")}
            data-testid="badge-trial"
          >
            Trial Active
          </Badge>
        )}

        {/* Subscription tier badge */}
        {hasSubscription && !isTrialing && (
          <Badge
            variant="secondary"
            className="cursor-pointer text-xs"
            onClick={() => setLocation("/billing")}
            data-testid="badge-tier"
          >
            {tier?.charAt(0).toUpperCase() + tier?.slice(1)}
          </Badge>
        )}

        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" data-testid="button-notifications">
          <Bell className="h-4 w-4" />
        </Button>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" data-testid="button-user-menu">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setLocation("/billing")}
              data-testid="menu-billing"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Billing
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setLocation("/configuration")}
              data-testid="menu-settings"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                localStorage.removeItem("prescient_token");
                window.location.href = "/";
              }}
              data-testid="menu-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
