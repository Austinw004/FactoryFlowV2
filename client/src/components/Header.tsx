import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, CreditCard, Settings, LogOut, Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/pilot-revenue": "Pilot Revenue",
  "/agentic-ai": "AI Advisor",
  "/strategy": "Strategy & Insights",
  "/event-monitoring": "Event Monitoring",
  "/demand": "Demand & Forecasting",
  "/supply-chain": "Supply Chain",
  "/procurement": "Procurement",
  "/operations": "Operations",
  "/integrations": "Integrations",
  "/webhook-integrations": "Webhooks",
  "/configuration": "Configuration",
  "/how-it-works": "How It Works",
  "/billing": "Billing",
  "/pricing": "Pricing",
  "/notification-settings": "Notifications",
  "/settings": "Settings",
  "/profile": "Profile",
  "/allocation": "Allocation",
  "/sop-workflows": "S&OP Workflows",
  "/commodity-forecasts": "Commodity Forecasts",
  "/api-documentation": "API Documentation",
  "/platform-analytics": "Platform Analytics",
  "/shop-floor": "Shop Floor",
};

function getCurrentTitle(location: string): string {
  const matchedKey = Object.keys(routeTitles)
    .filter((key) => location === key || location.startsWith(key + "/"))
    .sort((a, b) => b.length - a.length)[0];
  return matchedKey ? routeTitles[matchedKey] : "Dashboard";
}

function getInitials(user?: { firstName?: string | null; lastName?: string | null; email?: string | null }) {
  if (!user) return "U";
  const first = user.firstName?.trim()?.[0];
  const last = user.lastName?.trim()?.[0];
  if (first || last) return `${first ?? ""}${last ?? ""}`.toUpperCase();
  return (user.email?.[0] ?? "U").toUpperCase();
}

export function Header() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  // Live clock updates every minute — shown in the local timezone.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

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
  const title = getCurrentTitle(location);

  const dateLabel = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeLabel = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  async function handleSignOut() {
    try {
      await apiRequest("POST", "/api/auth/logout", {}).catch(() => {});
    } finally {
      localStorage.removeItem("prescient_token");
      window.location.assign("/");
    }
  }

  return (
    <header className="flex items-center justify-between h-16 px-6 lg:px-12 border-b border-border bg-background">
      <div className="flex items-center gap-4 min-w-0">
        <SidebarTrigger className="lg:hidden" />
        <h2 className="text-sm font-medium truncate">{title}</h2>
        <span className="text-xs text-muted-foreground hidden md:inline">
          {dateLabel} · {timeLabel}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {isTrialing && (
          <Badge variant="secondary" className="hidden sm:inline-flex">
            Trial
          </Badge>
        )}
        {tier && !isTrialing && status === "active" && (
          <Badge variant="outline" className="capitalize hidden sm:inline-flex">
            {tier}
          </Badge>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/notification-settings")}
          aria-label="Notifications"
          data-testid="header-notifications"
        >
          <Bell className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 px-2"
              data-testid="header-user-menu"
            >
              <span className="h-7 w-7 rounded-full bg-foreground text-background text-xs font-medium flex items-center justify-center">
                {getInitials(user ?? undefined)}
              </span>
              <span className="hidden md:inline text-sm max-w-[160px] truncate">
                {user?.firstName || user?.email || "Account"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {user?.email ?? "Signed in"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setLocation("/settings")} data-testid="menu-profile">
              <User className="h-4 w-4 mr-2" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocation("/settings/security")} data-testid="menu-security">
              <Settings className="h-4 w-4 mr-2" /> Security
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocation("/billing")} data-testid="menu-billing">
              <CreditCard className="h-4 w-4 mr-2" /> Billing
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} data-testid="menu-signout">
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
