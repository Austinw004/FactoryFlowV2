import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, CreditCard, Settings, LogOut, Bell, RefreshCw } from "lucide-react";
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

// Each route maps to {section, title}. The section drives the breadcrumb
// (Overview / Intelligence / Operations / Settings) so the topbar matches
// the design's "Section · Page" pattern. When a route doesn't have an
// explicit mapping the section falls back to "Workspace".
const routeMeta: Record<string, { section: string; title: string }> = {
  "/dashboard":             { section: "Overview",     title: "Dashboard" },
  "/pilot-revenue":         { section: "Overview",     title: "Pilot Revenue" },
  "/impact":                { section: "Overview",     title: "Impact" },
  "/operations-hub":        { section: "Overview",     title: "Operations Hub" },
  "/demand":                { section: "Overview",     title: "Demand Hub" },
  "/agentic-ai":            { section: "Intelligence", title: "AI Advisor" },
  "/strategy":              { section: "Intelligence", title: "Strategy & Insights" },
  "/event-monitoring":      { section: "Intelligence", title: "Event Monitoring" },
  "/demand-signals":        { section: "Intelligence", title: "Demand Signals" },
  "/ma-intelligence":       { section: "Intelligence", title: "M&A Intelligence" },
  "/geopolitical-risk":     { section: "Intelligence", title: "Geopolitical Risk" },
  "/peer-benchmarking":     { section: "Intelligence", title: "Peer Benchmarking" },
  "/forecasting":           { section: "Intelligence", title: "Forecasting" },
  "/multi-horizon":         { section: "Intelligence", title: "Multi-Horizon Forecasts" },
  "/forecast-accuracy":     { section: "Intelligence", title: "Forecast Accuracy" },
  "/commodity-forecasts":   { section: "Intelligence", title: "Commodity Forecasts" },
  "/historical-backtesting":{ section: "Intelligence", title: "Historical Backtesting" },
  "/bulk-test":             { section: "Intelligence", title: "Bulk Test" },
  "/supply-chain":          { section: "Operations",   title: "Supply Chain" },
  "/procurement":           { section: "Operations",   title: "Procurement" },
  "/operations":            { section: "Operations",   title: "Operations" },
  "/automated-po":          { section: "Operations",   title: "Automated PO" },
  "/allocation":            { section: "Operations",   title: "Allocation" },
  "/inventory":             { section: "Operations",   title: "Inventory" },
  "/inventory-optimization":{ section: "Operations",   title: "Inventory Optimization" },
  "/multi-tier-suppliers":  { section: "Operations",   title: "Multi-Tier Suppliers" },
  "/machinery":             { section: "Operations",   title: "Machinery" },
  "/predictive-maintenance":{ section: "Operations",   title: "Predictive Maintenance" },
  "/digital-twin":          { section: "Operations",   title: "Digital Twin" },
  "/sop-workflows":         { section: "Operations",   title: "S&OP Workflows" },
  "/shop-floor":            { section: "Operations",   title: "Shop Floor" },
  "/automations":           { section: "Agents",       title: "Automations" },
  "/action-playbooks":      { section: "Agents",       title: "Action Playbooks" },
  "/integrations":          { section: "Settings",     title: "Integrations" },
  "/integration-checklist": { section: "Settings",     title: "Integration Checklist" },
  "/webhook-integrations":  { section: "Settings",     title: "Webhooks" },
  "/configuration":         { section: "Settings",     title: "Configuration" },
  "/notification-settings": { section: "Settings",     title: "Notifications" },
  "/settings":              { section: "Settings",     title: "Settings" },
  "/profile":               { section: "Settings",     title: "Profile" },
  "/billing":               { section: "Settings",     title: "Billing" },
  "/api-documentation":     { section: "Settings",     title: "API Documentation" },
  "/audit-trail":           { section: "Settings",     title: "Audit Trail" },
  "/compliance":            { section: "Settings",     title: "Compliance" },
  "/how-it-works":          { section: "Workspace",    title: "How It Works" },
  "/platform-analytics":    { section: "Admin",        title: "Platform Analytics" },
  "/leads":                 { section: "Admin",        title: "Leads" },
};

function getCurrentMeta(location: string): { section: string; title: string } {
  const matchedKey = Object.keys(routeMeta)
    .filter((key) => location === key || location.startsWith(key + "/"))
    .sort((a, b) => b.length - a.length)[0];
  return matchedKey ? routeMeta[matchedKey] : { section: "Overview", title: "Dashboard" };
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
  const queryClient = useQueryClient();
  // The Refresh button in the topbar invalidates *all* React Query caches —
  // simpler than the previous per-page refresh affordances and matches the
  // design's "single-button refresh" pattern. Spinning state lasts ~600ms
  // so the click feels acknowledged even when the data is already cached.
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = () => {
    setRefreshing(true);
    queryClient.invalidateQueries();
    setTimeout(() => setRefreshing(false), 600);
  };

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
  const meta = getCurrentMeta(location);

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
      {/* Left rail: hamburger (mobile only) + Section / Page breadcrumb.
          The breadcrumb pattern matches the design — section in muted
          color, " / ", then the page title in foreground weight. */}
      <div className="flex items-center gap-4 min-w-0">
        <SidebarTrigger className="lg:hidden" />
        <nav aria-label="Page" className="flex items-center gap-2 text-sm min-w-0" data-testid="header-breadcrumb">
          <span className="text-muted-foreground hidden sm:inline">{meta.section}</span>
          <span className="text-muted-foreground/60 hidden sm:inline">/</span>
          <span className="font-medium truncate">{meta.title}</span>
        </nav>
      </div>

      {/* Right rail: live indicator + clock + single refresh + bell + avatar.
          The pulsing green dot signals "live data flowing" and the
          timestamp sits right next to it; together they replace the
          previous standalone date/time text. */}
      <div className="flex items-center gap-2">
        <div
          className="hidden md:flex items-center gap-2 text-xs text-muted-foreground mr-1"
          data-testid="header-live"
          aria-label="Live"
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-good animate-pulse"
            aria-hidden="true"
          />
          <span className="font-medium text-foreground/80">Live</span>
          <span className="text-muted-foreground/60">·</span>
          <span className="font-mono tabular-nums">{dateLabel} {timeLabel}</span>
        </div>

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
          onClick={handleRefresh}
          aria-label="Refresh"
          data-testid="header-refresh"
          title="Refresh all data"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>

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
