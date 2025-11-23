import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ChevronRight, X, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  link: string;
  icon?: React.ReactNode;
}

interface OnboardingChecklistProps {
  steps: OnboardingStep[];
  onDismiss?: () => void;
  showDismissButton?: boolean;
  compact?: boolean;
}

// Note: onDismiss should only be provided when all steps are complete

export function OnboardingChecklist({ 
  steps, 
  onDismiss, 
  showDismissButton = true,
  compact = false 
}: OnboardingChecklistProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  
  const completedCount = steps.filter(s => s.completed).length;
  const totalCount = steps.length;
  const progressPercentage = (completedCount / totalCount) * 100;
  const isFullyCompleted = completedCount === totalCount;

  if (isMinimized && !compact) {
    return (
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10" data-testid="card-onboarding-minimized">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Getting Started</p>
                <p className="text-xs text-muted-foreground">
                  {completedCount} of {totalCount} steps completed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={progressPercentage} className="w-24 h-2" data-testid="progress-onboarding" />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsMinimized(false)}
                data-testid="button-expand-checklist"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={`border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 ${
        isFullyCompleted ? 'border-green-500/30 from-green-500/5 to-green-500/10' : ''
      }`}
      data-testid="card-onboarding-checklist"
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Sparkles className={`h-6 w-6 mt-1 flex-shrink-0 ${isFullyCompleted ? 'text-green-500' : 'text-primary'}`} />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl">
                {isFullyCompleted ? 'Setup Complete!' : 'Getting Started'}
              </CardTitle>
              <CardDescription>
                {isFullyCompleted 
                  ? 'Great job! Your platform is ready to optimize your manufacturing.'
                  : 'Complete these steps to unlock the full power of your platform'
                }
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!compact && showDismissButton && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsMinimized(true)}
                data-testid="button-minimize-checklist"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
              </Button>
            )}
            {showDismissButton && onDismiss && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss}
                data-testid="button-dismiss-checklist"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="space-y-2 mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {completedCount} / {totalCount} completed
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" data-testid="progress-onboarding-full" />
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {steps.map((step, index) => (
          <Link key={step.id} href={step.link}>
            <div
              className={`p-3 rounded-lg border transition-all hover-elevate active-elevate-2 cursor-pointer ${
                step.completed 
                  ? 'bg-green-500/5 border-green-500/20' 
                  : 'bg-card border-border'
              }`}
              data-testid={`checklist-item-${step.id}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {step.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" data-testid={`icon-completed-${step.id}`} />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" data-testid={`icon-pending-${step.id}`} />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium truncate ${
                      step.completed ? 'text-green-700 dark:text-green-400' : 'text-foreground'
                    }`}>
                      {step.title}
                    </p>
                    {step.completed && (
                      <span className="text-xs text-green-600 dark:text-green-500 font-medium flex-shrink-0">
                        ✓ Done
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {step.description}
                  </p>
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
            </div>
          </Link>
        ))}

        {isFullyCompleted && (
          <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20">
            <p className="text-sm font-medium mb-2">Next Steps</p>
            <p className="text-xs text-muted-foreground mb-3">
              Learn how the dual-circuit economic model powers your manufacturing intelligence
            </p>
            <Link href="/how-it-works">
              <Button size="sm" variant="default" className="w-full" data-testid="button-learn-more">
                Learn How It Works <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
