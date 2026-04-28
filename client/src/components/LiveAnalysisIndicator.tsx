import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity, Brain, TrendingUp, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

interface AnalysisStatus {
  regimeAnalysis: { status: string; lastUpdate: string };
  demandForecasting: { status: string; activeModels: number };
  supplyChainMonitoring: { status: string; alertCount: number };
  priceTracking: { status: string; commoditiesTracked: number };
}

export function LiveAnalysisIndicator() {
  const { data: healthData } = useQuery<{ status: string; services?: any }>({
    queryKey: ['/api/health'],
    refetchInterval: 30000,
  });

  const { data: insightsData } = useQuery<{ insights: any[] }>({
    queryKey: ['/api/smart-insights'],
    refetchInterval: 60000,
  });

  const { data: alertsData } = useQuery<{ alerts: any[] }>({
    queryKey: ['/api/smart-insights/alerts'],
    refetchInterval: 60000,
  });

  const isAnalyzing = healthData?.status === 'healthy';
  const insightCount = insightsData?.insights?.length || 0;
  const alertCount = alertsData?.alerts?.length || 0;
  const criticalAlerts = alertsData?.alerts?.filter(a => a.severity === 'critical')?.length || 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border cursor-default" data-testid="live-analysis-indicator">
          <div className="flex items-center gap-1.5">
            {isAnalyzing ? (
              <div className="relative">
                <Brain className="h-4 w-4 text-primary" />
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-good rounded-full animate-pulse" />
              </div>
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            <span className="text-xs font-medium hidden sm:inline">
              {isAnalyzing ? "Analyzing" : "Connecting..."}
            </span>
          </div>
          
          {insightCount > 0 && (
            <Badge variant="secondary" className="h-5 text-xs px-1.5" data-testid="badge-insights-count">
              <TrendingUp className="h-3 w-3 mr-0.5" />
              {insightCount}
            </Badge>
          )}
          
          {alertCount > 0 && (
            <Badge 
              variant={criticalAlerts > 0 ? "destructive" : "outline"} 
              className="h-5 text-xs px-1.5"
              data-testid="badge-alerts-count"
            >
              <AlertTriangle className="h-3 w-3 mr-0.5" />
              {alertCount}
            </Badge>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="font-medium">Cross-Module Analysis Active</span>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-good" />
              Economic regime monitoring
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-good" />
              Demand pattern analysis
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-good" />
              Supply chain risk tracking
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-good" />
              Commodity price updates
            </div>
          </div>
          {insightCount > 0 && (
            <div className="text-xs border-t pt-2 mt-2">
              <span className="font-medium">{insightCount} active insights</span>
              {alertCount > 0 && (
                <span className="text-muted-foreground"> | {alertCount} alerts</span>
              )}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function CompactAnalysisStatus({ context }: { context?: string }) {
  const { data: insightsData } = useQuery<{ insights: any[] }>({
    queryKey: ['/api/smart-insights'],
    refetchInterval: 60000,
  });

  const { data: alertsData } = useQuery<{ alerts: any[] }>({
    queryKey: ['/api/smart-insights/alerts'],
    refetchInterval: 60000,
  });

  const insights = insightsData?.insights || [];
  const alerts = alertsData?.alerts || [];

  const contextInsights = context 
    ? insights.filter(i => {
        const linkLower = (i.actionLink || '').toLowerCase();
        const contextLower = context.toLowerCase();
        return linkLower.includes(contextLower) || 
               i.dataPoints?.some((dp: string) => dp.toLowerCase().includes(contextLower));
      })
    : insights;

  const contextAlerts = context
    ? alerts.filter(a => 
        a.relatedData?.some((rd: any) => rd.link?.toLowerCase().includes(context.toLowerCase()))
      )
    : alerts;

  if (contextInsights.length === 0 && contextAlerts.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm" data-testid="compact-analysis-status">
      <Brain className="h-4 w-4 text-primary animate-pulse" />
      <span className="text-muted-foreground">
        {contextInsights.length > 0 && `${contextInsights.length} insight${contextInsights.length !== 1 ? 's' : ''}`}
        {contextInsights.length > 0 && contextAlerts.length > 0 && ' | '}
        {contextAlerts.length > 0 && `${contextAlerts.length} alert${contextAlerts.length !== 1 ? 's' : ''}`}
      </span>
    </div>
  );
}
