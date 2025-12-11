import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronLeft, Sparkles, BarChart3, Network, Gauge, MessageSquare, Check, ChevronDown, ChevronUp } from "lucide-react";
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
    description: "Let's take a quick tour of your manufacturing intelligence platform. We'll show you the key features that help you make smarter decisions.",
    icon: Sparkles,
  },
  {
    id: "dashboard",
    title: "Your Command Center",
    description: "The Dashboard shows your current economic regime, key metrics, and recent allocations. Check here daily for actionable insights.",
    icon: Gauge,
    highlight: "dashboard",
  },
  {
    id: "forecasting",
    title: "Demand Forecasting",
    description: "View AI-powered demand predictions for all your SKUs. The system learns from your historical data and market conditions.",
    icon: BarChart3,
    highlight: "demand",
  },
  {
    id: "procurement",
    title: "Smart Procurement",
    description: "Get timing signals for when to buy, hold, or accelerate purchases based on economic conditions.",
    icon: Network,
    highlight: "procurement",
  },
  {
    id: "ai-assistant",
    title: "AI Assistant",
    description: "Ask questions about your data, get recommendations, and automate actions using natural language.",
    icon: MessageSquare,
    highlight: "ai",
  },
  {
    id: "complete",
    title: "You're All Set!",
    description: "Explore the platform at your own pace. Check the Configuration page to customize alerts and settings. Need help? The AI Assistant is always available.",
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
