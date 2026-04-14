import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { LiveAnalysisIndicator } from "./LiveAnalysisIndicator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bell, User, CreditCard, Settings, LogOut, Search, ChevronRight, Keyboard } from "lucide-react";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { InsightBadge } from "@/components/InsightPanel";
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
  "/agentic-ai": "AI Advisor",
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
    <header className="flex items-center justify-between h-16 px-12 border-b border-line bg-ink">
      <div className="flex items-center gap-6 min-w-0">
        <h2 className="text-sm font-medium">{breadcrumb.current}</h2>
        <span className="mono text-xs text-muted">
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · 14:22 UTC
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span className="mono text-xs text-muted flex items-center gap-2">
          <span className="dot bg-good"></span> Live
        </span>
        <button className="btn-ghost text-xs tracking-[0.16em] px-3 py-2 uppercase">Export</button>
      </div>
    </header>
  );
}
