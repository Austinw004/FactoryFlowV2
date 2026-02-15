import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  ChevronLeft,
  Sparkles,
  BarChart3,
  Network,
  Gauge,
  MessageSquare,
  Check,
  ChevronDown,
  ChevronUp,
  Bot,
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  ShoppingCart,
  Wrench,
  Plug,
  Settings,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  highlight?: string;
}

const tourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Prescient Labs",
    description: "Your manufacturing intelligence platform. This tour walks through each section so you know where to find everything.",
    icon: Sparkles,
  },
  {
    id: "dashboard",
    title: "Dashboard",
    description: "Your command center. See the current economic regime, KPI summaries, recent allocations, ROI tracking, and data freshness indicators all in one place.",
    icon: Gauge,
    highlight: "dashboard",
  },
  {
    id: "agentic-ai",
    title: "Agentic AI",
    description: "A conversational AI assistant that answers questions about your data, surfaces proactive alerts, and can trigger actions like generating RFQs or running allocations.",
    icon: Bot,
    highlight: "agentic-ai",
  },
  {
    id: "strategy",
    title: "Strategy & Insights",
    description: "Strategic analysis, scenario simulation, digital twin, M&A intelligence, peer benchmarking, and event monitoring. Plan ahead with data-driven foresight.",
    icon: Lightbulb,
    highlight: "strategy",
  },
  {
    id: "event-monitoring",
    title: "Event Monitoring",
    description: "Track geopolitical events, supply disruptions, and market shifts that could impact your supply chain. Get real-time risk assessments and recommended actions.",
    icon: AlertTriangle,
    highlight: "event-monitoring",
  },
  {
    id: "demand",
    title: "Demand & Forecasting",
    description: "Regime-aware demand predictions across multiple horizons, forecast accuracy tracking, demand signal repository, and collaborative S&OP workspace.",
    icon: TrendingUp,
    highlight: "demand",
  },
  {
    id: "supply-chain",
    title: "Supply Chain",
    description: "Inventory optimization, supplier risk scoring, multi-tier network mapping, traceability, ERP integration templates, and industry consortium benchmarking.",
    icon: Network,
    highlight: "supply-chain",
  },
  {
    id: "procurement",
    title: "Procurement",
    description: "Counter-cyclical procurement timing, automated purchase orders, RFQ generation, commodity price forecasts, and action playbooks tied to economic signals.",
    icon: ShoppingCart,
    highlight: "procurement",
  },
  {
    id: "operations",
    title: "Operations",
    description: "Machinery lifecycle management, production KPIs with OEE tracking, predictive maintenance, workforce metrics, compliance monitoring, and shop floor mode.",
    icon: Wrench,
    highlight: "operations",
  },
  {
    id: "integrations",
    title: "Integrations & Webhooks",
    description: "Connect 60+ external systems across ERP, CRM, e-commerce, and more. Monitor sync health, manage credentials, and configure webhook automations.",
    icon: Plug,
    highlight: "integrations",
  },
  {
    id: "settings",
    title: "Settings",
    description: "Configure alerts, notification preferences, team management, billing, and platform customization. Fine-tune the platform to fit your workflow.",
    icon: Settings,
    highlight: "configuration",
  },
  {
    id: "complete",
    title: "You're All Set!",
    description: "Explore each section at your own pace. The Agentic AI assistant is always available if you need help or want to ask questions about your data.",
    icon: Check,
  },
];

const TOUR_STORAGE_PREFIX = "prescient_tour_completed_";
const TOUR_COLLAPSED_PREFIX = "prescient_tour_collapsed_";

export function SidebarTour() {
  const { user, isLoading } = useAuth();
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTour, setHasSeenTour] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const storageKey = user?.id ? `${TOUR_STORAGE_PREFIX}${user.id}` : null;
  const collapsedKey = user?.id ? `${TOUR_COLLAPSED_PREFIX}${user.id}` : null;

  useEffect(() => {
    if (isLoading || !storageKey || !collapsedKey) return;
    
    const tourCompleted = localStorage.getItem(storageKey);
    const isCollapsed = localStorage.getItem(collapsedKey);
    
    if (!tourCompleted) {
      setHasSeenTour(false);
      setIsExpanded(isCollapsed !== "true");
    } else {
      setHasSeenTour(true);
    }
    setIsInitialized(true);
  }, [storageKey, collapsedKey, isLoading]);

  const handleComplete = () => {
    if (storageKey) {
      localStorage.setItem(storageKey, "true");
    }
    setHasSeenTour(true);
  };

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleToggleExpand = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    if (collapsedKey) {
      localStorage.setItem(collapsedKey, newExpanded ? "false" : "true");
    }
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setHasSeenTour(false);
    setIsExpanded(true);
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
    if (collapsedKey) {
      localStorage.removeItem(collapsedKey);
    }
  };

  if (!isInitialized || isLoading) {
    return null;
  }

  if (hasSeenTour) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={handleRestart}
          data-testid="button-restart-tour"
        >
          <Sparkles className="h-4 w-4" />
          <span>Take a Tour</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  const step = tourSteps[currentStep];
  const Icon = step.icon;

  return (
    <SidebarMenuItem data-testid="sidebar-tour">
      <Collapsible open={isExpanded} onOpenChange={handleToggleExpand}>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton data-testid="button-toggle-tour">
            <Sparkles className="h-4 w-4" />
            <span className="flex-1">Platform Tour</span>
            <Badge variant="secondary" className="text-xs px-1.5 py-0 mr-1">
              {currentStep + 1}/{tourSteps.length}
            </Badge>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-2 py-3 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-medium leading-tight">{step.title}</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="h-7 px-2"
                data-testid="button-tour-prev"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              
              <div className="flex gap-1">
                {tourSteps.map((_, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-colors",
                      idx === currentStep ? "bg-primary" : "bg-muted"
                    )}
                  />
                ))}
              </div>
              
              <Button
                size="sm"
                onClick={handleNext}
                className="h-7 px-3"
                data-testid="button-tour-next"
              >
                {currentStep === tourSteps.length - 1 ? "Done" : "Next"}
                {currentStep < tourSteps.length - 1 && <ChevronRight className="h-3 w-3 ml-1" />}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

export function GuidedTour() {
  return null;
}
