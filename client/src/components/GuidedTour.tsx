import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, ChevronRight, ChevronLeft, Sparkles, BarChart3, Network, Gauge, MessageSquare, Check, Minimize2, Maximize2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

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

export function GuidedTour() {
  const { user, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTour, setHasSeenTour] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const storageKey = user?.id ? `${TOUR_STORAGE_PREFIX}${user.id}` : null;

  useEffect(() => {
    if (isLoading || !storageKey) return;
    
    const tourCompleted = localStorage.getItem(storageKey);
    if (!tourCompleted) {
      setHasSeenTour(false);
      const timer = setTimeout(() => {
        setIsOpen(true);
        setIsInitialized(true);
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setHasSeenTour(true);
      setIsInitialized(true);
    }
  }, [storageKey, isLoading]);

  const handleComplete = () => {
    if (storageKey) {
      localStorage.setItem(storageKey, "true");
    }
    setIsOpen(false);
    setIsMinimized(false);
    setHasSeenTour(true);
  };

  const handleSkip = () => {
    if (storageKey) {
      localStorage.setItem(storageKey, "true");
    }
    setIsOpen(false);
    setIsMinimized(false);
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

  const handleRestart = () => {
    setCurrentStep(0);
    setIsOpen(true);
    setIsMinimized(false);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleExpand = () => {
    setIsMinimized(false);
  };

  if (!isInitialized || isLoading) {
    return null;
  }

  if (!isOpen) {
    if (!hasSeenTour) return null;
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleRestart}
        className="gap-2"
        data-testid="button-restart-tour"
      >
        <Sparkles className="h-4 w-4" />
        Tour
      </Button>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50" data-testid="guided-tour-minimized">
        <Button 
          onClick={handleExpand}
          className="gap-2 shadow-lg"
          data-testid="button-expand-tour"
        >
          <Sparkles className="h-4 w-4" />
          Continue Tour ({currentStep + 1}/{tourSteps.length})
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const step = tourSteps[currentStep];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" data-testid="guided-tour-modal">
      <Card className="max-w-md w-full mx-4 animate-in fade-in zoom-in duration-200">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{step.title}</CardTitle>
                <Badge variant="outline" className="mt-1">
                  Step {currentStep + 1} of {tourSteps.length}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleMinimize} 
                title="Minimize tour"
                data-testid="button-minimize-tour"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleSkip} 
                title="Skip tour"
                data-testid="button-skip-tour"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-base">{step.description}</CardDescription>
        </CardContent>
        <CardFooter className="flex justify-between gap-2">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="gap-1"
            data-testid="button-tour-prev"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-1">
            {tourSteps.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
          <Button onClick={handleNext} className="gap-1" data-testid="button-tour-next">
            {currentStep === tourSteps.length - 1 ? "Get Started" : "Next"}
            {currentStep < tourSteps.length - 1 && <ChevronRight className="h-4 w-4" />}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
