import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRightCircle,
  CheckCircle2,
  Clock,
  Target,
  ShieldAlert,
  BarChart3,
  Zap,
  BookOpen,
  Activity
} from "lucide-react";
import { useState, useRef } from "react";
import { useLocation } from "wouter";

interface ActionPlaybook {
  id: string;
  name: string;
  description?: string;
  triggerType: string;
  fromRegime?: string;
  toRegime?: string;
  fdrThreshold?: number;
  fdrDirection?: string;
  priority: string;
  applicableIndustries?: string[];
  actions: Array<{
    order: number;
    category: string;
    action: string;
    rationale: string;
    timeframe: string;
    priority: string;
    automatable: boolean;
  }>;
  expectedOutcomes?: string[];
  isSystemDefault?: boolean;
  isActive?: boolean;
  createdAt: string;
}

const REGIME_COLORS: Record<string, string> = {
  "HEALTHY_EXPANSION": "bg-green-600",
  "ASSET_LED_GROWTH": "bg-yellow-600",
  "IMBALANCED_EXCESS": "bg-red-600",
  "REAL_ECONOMY_LEAD": "bg-blue-600",
  "UNKNOWN": "bg-gray-600",
};

const REGIME_LABELS: Record<string, string> = {
  "HEALTHY_EXPANSION": "Healthy Expansion",
  "ASSET_LED_GROWTH": "Asset-Led Growth",
  "IMBALANCED_EXCESS": "Imbalanced Excess",
  "REAL_ECONOMY_LEAD": "Real Economy Lead",
};

const PRIORITY_COLORS: Record<string, string> = {
  "critical": "bg-red-600",
  "high": "bg-orange-600",
  "medium": "bg-yellow-600",
  "low": "bg-green-600",
};

const CATEGORY_ICONS: Record<string, any> = {
  "procurement": ShieldAlert,
  "inventory": BarChart3,
  "forecasting": TrendingUp,
  "supplier": Target,
  "budget": Activity,
};

function ActionCard({ action, index }: { action: any; index: number }) {
  const Icon = CATEGORY_ICONS[action.category] || Zap;
  
  return (
    <div 
      className="flex gap-4 p-4 rounded-lg bg-muted/50 hover-elevate"
      data-testid={`action-${index}`}
    >
      <div className="flex-shrink-0">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-sm font-bold text-primary">{action.order}</span>
        </div>
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium text-sm">{action.action}</h4>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={PRIORITY_COLORS[action.priority] || "bg-gray-600"}>
              {action.priority}
            </Badge>
            {action.automatable && (
              <Badge variant="outline" className="gap-1">
                <Zap className="h-3 w-3" />
                Automatable
              </Badge>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{action.rationale}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{action.timeframe}</span>
          <span className="text-muted-foreground/50">|</span>
          <span className="capitalize">{action.category}</span>
        </div>
      </div>
    </div>
  );
}

function PlaybookCard({ playbook }: { playbook: ActionPlaybook }) {
  const [expanded, setExpanded] = useState(false);
  const targetRegime = playbook.toRegime || playbook.fromRegime || "UNKNOWN";
  const regimeColor = REGIME_COLORS[targetRegime] || "bg-gray-600";
  const regimeLabel = REGIME_LABELS[targetRegime] || targetRegime;
  
  const actions = Array.isArray(playbook.actions) ? playbook.actions : [];
  const criticalActions = actions.filter(a => a.priority === "critical").length;
  const automatedActions = actions.filter(a => a.automatable).length;
  
  return (
    <Card data-testid={`playbook-${playbook.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className={regimeColor}>{regimeLabel}</Badge>
              {playbook.isSystemDefault && (
                <Badge variant="secondary">System Default</Badge>
              )}
              {playbook.isActive && (
                <Badge variant="outline" className="border-green-600 text-green-600">
                  Active
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg">{playbook.name}</CardTitle>
            <CardDescription>{playbook.description}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Collapse" : "View Actions"}
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
          <div className="flex items-center gap-2 text-sm">
            <ArrowRightCircle className="h-4 w-4 text-muted-foreground" />
            <span>{actions.length} actions</span>
          </div>
          {criticalActions > 0 && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span>{criticalActions} critical</span>
            </div>
          )}
          {automatedActions > 0 && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <Zap className="h-4 w-4" />
              <span>{automatedActions} automated</span>
            </div>
          )}
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Trigger Conditions
            </h4>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="p-3 rounded bg-muted/50 text-sm">
                <span className="text-muted-foreground">Trigger Type:</span>{" "}
                <span className="font-medium capitalize">{playbook.triggerType.replace(/_/g, ' ')}</span>
              </div>
              {playbook.fdrThreshold && (
                <div className="p-3 rounded bg-muted/50 text-sm">
                  <span className="text-muted-foreground">FDR Threshold:</span>{" "}
                  <span className="font-medium">{playbook.fdrThreshold}</span>
                  {playbook.fdrDirection && (
                    <span className="text-muted-foreground"> ({playbook.fdrDirection})</span>
                  )}
                </div>
              )}
              {playbook.fromRegime && (
                <div className="p-3 rounded bg-muted/50 text-sm">
                  <span className="text-muted-foreground">From Regime:</span>{" "}
                  <span className="font-medium">{REGIME_LABELS[playbook.fromRegime] || playbook.fromRegime}</span>
                </div>
              )}
              {playbook.toRegime && (
                <div className="p-3 rounded bg-muted/50 text-sm">
                  <span className="text-muted-foreground">To Regime:</span>{" "}
                  <span className="font-medium">{REGIME_LABELS[playbook.toRegime] || playbook.toRegime}</span>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <ArrowRightCircle className="h-4 w-4" />
              Recommended Actions
            </h4>
            <div className="space-y-3">
              {actions
                .sort((a, b) => a.order - b.order)
                .map((action, index) => (
                  <ActionCard key={index} action={action} index={index} />
                ))}
            </div>
          </div>
          
          {playbook.expectedOutcomes && playbook.expectedOutcomes.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Expected Outcomes
              </h4>
              <ul className="space-y-2">
                {playbook.expectedOutcomes.map((outcome, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-good mt-0.5" />
                    {outcome}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

interface CurrentRegimeCardProps {
  regime: any;
  onViewPlaybook: () => void;
  onScenarioAnalysis: () => void;
}

function CurrentRegimeCard({ regime, onViewPlaybook, onScenarioAnalysis }: CurrentRegimeCardProps) {
  const regimeType = regime?.regime || "UNKNOWN";
  const regimeColor = REGIME_COLORS[regimeType] || "bg-gray-600";
  const regimeLabel = REGIME_LABELS[regimeType] || regimeType;
  const fdr = regime?.fdr || 1.0;
  
  let recommendation = "";
  let icon = Activity;
  
  if (regimeType === "HEALTHY_EXPANSION") {
    recommendation = "Normal operations recommended. Focus on maintaining efficiency and monitoring for changes.";
    icon = TrendingUp;
  } else if (regimeType === "ASSET_LED_GROWTH") {
    recommendation = "Early warning signals detected. Consider building inventory buffers and locking in favorable supplier terms.";
    icon = AlertTriangle;
  } else if (regimeType === "IMBALANCED_EXCESS") {
    recommendation = "High risk environment. Prioritize cash preservation, delay non-essential purchases, and reduce inventory commitments.";
    icon = TrendingDown;
  } else if (regimeType === "REAL_ECONOMY_LEAD") {
    recommendation = "Opportunity window. Consider forward purchasing at favorable rates and expanding capacity prudently.";
    icon = Zap;
  }
  
  const Icon = icon;
  
  return (
    <Card className="border-2" style={{ borderColor: `hsl(var(--${regimeType === "HEALTHY_EXPANSION" ? "primary" : regimeType === "IMBALANCED_EXCESS" ? "destructive" : "warning"}))` }}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-lg ${regimeColor} flex items-center justify-center`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle>Current Economic Regime</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Badge className={regimeColor}>{regimeLabel}</Badge>
                <span>FDR: {fdr.toFixed(2)}</span>
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{recommendation}</p>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="default" 
            size="sm" 
            data-testid="button-view-playbook"
            onClick={onViewPlaybook}
          >
            <BookOpen className="h-4 w-4 mr-2" />
            View Recommended Playbook
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            data-testid="button-run-scenario"
            onClick={onScenarioAnalysis}
          >
            Run Scenario Analysis
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-12 w-full mb-4" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-36" />
          </div>
        </CardContent>
      </Card>
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-full" />
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

export default function ActionPlaybooks() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [, setLocation] = useLocation();
  const playbooksSectionRef = useRef<HTMLDivElement>(null);
  
  const { data: playbooks, isLoading: playbooksLoading } = useQuery<ActionPlaybook[]>({
    queryKey: ["/api/playbooks"],
  });
  
  const { data: regime } = useQuery({
    queryKey: ["/api/economics/regime"],
  });
  
  const handleViewPlaybook = () => {
    playbooksSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleScenarioAnalysis = () => {
    setLocation('/scenario-simulation');
  };
  
  if (playbooksLoading) {
    return <LoadingSkeleton />;
  }
  
  const activePlaybooks = playbooks?.filter(p => p.isActive) || [];
  const inactivePlaybooks = playbooks?.filter(p => !p.isActive) || [];
  
  const currentRegime = (regime as any)?.regime || "UNKNOWN";
  const relevantPlaybooks = activePlaybooks.filter(p => (p.toRegime || p.fromRegime) === currentRegime);
  
  const regimeGroups = activePlaybooks.reduce((acc, playbook) => {
    const targetRegime = playbook.toRegime || playbook.fromRegime || "UNKNOWN";
    if (!acc[targetRegime]) acc[targetRegime] = [];
    acc[targetRegime].push(playbook);
    return acc;
  }, {} as Record<string, ActionPlaybook[]>);
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-action-playbooks">
            Prescriptive Action Playbooks
          </h1>
          <p className="text-muted-foreground">
            Specific recommended actions when economic regimes change
          </p>
        </div>
        <Badge variant="secondary">
          {activePlaybooks.length} playbooks available
        </Badge>
      </div>
      
      <CurrentRegimeCard 
        regime={regime} 
        onViewPlaybook={handleViewPlaybook}
        onScenarioAnalysis={handleScenarioAnalysis}
      />
      
      {relevantPlaybooks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-signal" />
            <h2 className="text-lg font-semibold">Playbooks for Current Regime</h2>
          </div>
          <div className="space-y-4">
            {relevantPlaybooks.map((playbook) => (
              <PlaybookCard key={playbook.id} playbook={playbook} />
            ))}
          </div>
        </div>
      )}
      
      <div ref={playbooksSectionRef}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Playbooks</TabsTrigger>
            {Object.keys(regimeGroups).map((regime) => (
              <TabsTrigger key={regime} value={regime}>
                {REGIME_LABELS[regime] || regime} ({regimeGroups[regime].length})
              </TabsTrigger>
            ))}
          </TabsList>
          
          <TabsContent value="all" className="space-y-4 mt-4">
            {activePlaybooks.length > 0 ? (
              activePlaybooks.map((playbook) => (
                <PlaybookCard key={playbook.id} playbook={playbook} />
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Playbooks Available</h3>
                  <p className="text-muted-foreground">
                    Action playbooks will be created based on your economic regime patterns.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {Object.entries(regimeGroups).map(([regime, groupPlaybooks]) => (
            <TabsContent key={regime} value={regime} className="space-y-4 mt-4">
              {groupPlaybooks.map((playbook) => (
                <PlaybookCard key={playbook.id} playbook={playbook} />
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </div>
      
      {inactivePlaybooks.length > 0 && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="inactive">
            <AccordionTrigger className="text-lg font-semibold">
              Inactive Playbooks ({inactivePlaybooks.length})
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              {inactivePlaybooks.map((playbook) => (
                <PlaybookCard key={playbook.id} playbook={playbook} />
              ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
