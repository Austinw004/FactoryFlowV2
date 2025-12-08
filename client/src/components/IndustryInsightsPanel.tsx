import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useIndustryPersonalization, DashboardInsight } from "@/hooks/useIndustryPersonalization";
import { 
  TrendingUp, AlertTriangle, Lightbulb, Target, 
  ChevronRight, Loader2, Factory, BarChart3
} from "lucide-react";
import { useLocation } from "wouter";

const insightIcons: Record<string, typeof TrendingUp> = {
  kpi: BarChart3,
  risk: AlertTriangle,
  opportunity: Target,
  tip: Lightbulb,
};

const insightColors: Record<string, string> = {
  kpi: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  risk: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  opportunity: "bg-green-500/10 text-green-600 dark:text-green-400",
  tip: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

interface IndustryInsightsPanelProps {
  maxItems?: number;
  showHeader?: boolean;
}

export function IndustryInsightsPanel({ maxItems = 4, showHeader = true }: IndustryInsightsPanelProps) {
  const [, setLocation] = useLocation();
  const { 
    industry, 
    dashboardInsights, 
    quickActions, 
    isLoading,
    config
  } = useIndustryPersonalization();
  
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }
  
  const displayInsights = dashboardInsights.slice(0, maxItems);
  
  return (
    <Card className="p-6">
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Factory className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Industry Insights</h2>
          </div>
          <Badge variant="outline" data-testid="badge-industry">
            {industry}
          </Badge>
        </div>
      )}
      
      {displayInsights.length > 0 ? (
        <div className="space-y-3">
          {displayInsights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-muted-foreground">
          <p>No insights available. Set your industry in company settings.</p>
        </div>
      )}
      
      {config?.typicalKPIs && config.typicalKPIs.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <div className="text-sm font-medium mb-2">Key KPIs for {industry}</div>
          <div className="flex flex-wrap gap-2">
            {config.typicalKPIs.slice(0, 5).map((kpi, idx) => (
              <Badge 
                key={idx} 
                variant="secondary" 
                className="text-xs"
                data-testid={`badge-kpi-${idx}`}
              >
                {kpi}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {quickActions.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <div className="text-sm font-medium mb-2">Recommended Actions</div>
          <div className="flex flex-wrap gap-2">
            {quickActions.slice(0, 3).map((action) => (
              <Button
                key={action.id}
                variant="outline"
                size="sm"
                onClick={() => {
                  if (action.action === "setup-watchlist") {
                    setLocation("/commodities");
                  } else if (action.action === "view-regime") {
                    setLocation("/economics");
                  }
                }}
                data-testid={`button-action-${action.id}`}
              >
                {action.label}
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function InsightCard({ insight }: { insight: DashboardInsight }) {
  const Icon = insightIcons[insight.type] || Lightbulb;
  const colorClass = insightColors[insight.type] || insightColors.tip;
  
  return (
    <div 
      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover-elevate"
      data-testid={`card-insight-${insight.id}`}
    >
      <div className={`p-2 rounded-lg ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{insight.title}</div>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {insight.description}
        </p>
      </div>
    </div>
  );
}

export function IndustryKPIBadges() {
  const { config, isLoading } = useIndustryPersonalization();
  
  if (isLoading || !config?.typicalKPIs) {
    return null;
  }
  
  return (
    <div className="flex flex-wrap gap-1">
      {config.typicalKPIs.slice(0, 3).map((kpi, idx) => (
        <Badge 
          key={idx} 
          variant="outline" 
          className="text-xs"
          data-testid={`badge-top-kpi-${idx}`}
        >
          {kpi}
        </Badge>
      ))}
    </div>
  );
}

export function IndustryBanner() {
  const { industry, config, isLoading } = useIndustryPersonalization();
  
  if (isLoading || !config) {
    return null;
  }
  
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Factory className="h-4 w-4" />
      <span>{industry}</span>
      {config.relevantCommodities.length > 0 && (
        <>
          <span className="text-muted-foreground/50">|</span>
          <span>Tracking {config.relevantCommodities.length} commodities</span>
        </>
      )}
    </div>
  );
}
