import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, User, CreditCard, Settings, LogOut, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const [, setLocation] = useLocation();
  
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

  return (
    <header className="flex items-center justify-between p-4 border-b bg-background">
      <div className="flex items-center gap-2">
        <SidebarTrigger data-testid="button-sidebar-toggle" />
      </div>
      
      <div className="flex items-center gap-2">
        {/* Upgrade CTA for non-subscribers */}
        {!hasSubscription && (
          <Button 
            size="sm" 
            onClick={() => setLocation("/pricing")}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            data-testid="button-upgrade-cta"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Start Free Trial
          </Button>
        )}
        
        {/* Trial badge */}
        {isTrialing && (
          <Badge 
            variant="secondary" 
            className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 cursor-pointer"
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
            className="cursor-pointer"
            onClick={() => setLocation("/billing")}
            data-testid="badge-tier"
          >
            {tier?.charAt(0).toUpperCase() + tier?.slice(1)}
          </Badge>
        )}
        
        <Button variant="ghost" size="icon" data-testid="button-notifications">
          <Bell className="h-5 w-5" />
        </Button>
        
        <ThemeToggle />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="button-user-menu">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
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
            <DropdownMenuItem asChild data-testid="menu-logout">
              <a href="/api/logout">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
