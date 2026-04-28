import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "wouter";
import { 
  Lightbulb, 
  AlertTriangle, 
  TrendingUp, 
  ArrowRight,
  Target,
  ChevronRight,
  Zap,
  Activity
} from "lucide-react";

interface SmartInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'action' | 'trend';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  dataPoints: string[];
  actionLink?: string;
  actionLabel?: string;
  metrics?: Record<string, string | number>;
  timestamp: Date;
}

interface CrossReferencedAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: string;
  title: string;
  message: string;
  relatedData: {
    type: string;
    name: string;
    value: string | number;
    link?: string;
  }[];
  suggestedAction?: string;
  createdAt: Date;
}

const typeIcons = {
  opportunity: Lightbulb,
  risk: AlertTriangle,
  action: Target,
  trend: TrendingUp,
};

const typeColors = {
  opportunity: 'text-green-600',
  risk: 'text-red-600',
  action: 'text-blue-600 dark:text-blue-400',
  trend: 'text-purple-600 dark:text-purple-400',
};

const priorityBadgeVariants: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  high: 'destructive',
  medium: 'default',
  low: 'secondary',
};

const severityColors = {
  critical: 'border-l-red-500 bg-red-50 dark:bg-red-950/30',
  warning: 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/30',
  info: 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/30',
};

export function SmartInsightsPanel({ compact = false }: { compact?: boolean }) {
  const { data: insightsData, isLoading: insightsLoading } = useQuery<{ insights: SmartInsight[] }>({
    queryKey: ['/api/smart-insights'],
    refetchInterval: 60000,
  });

  const { data: alertsData, isLoading: alertsLoading } = useQuery<{ alerts: CrossReferencedAlert[] }>({
    queryKey: ['/api/smart-insights/alerts'],
    refetchInterval: 60000,
  });

  const insights = insightsData?.insights || [];
  const alerts = alertsData?.alerts || [];

  if (insightsLoading || alertsLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5" />
            Smart Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayInsights = compact ? insights.slice(0, 3) : insights;
  const displayAlerts = compact ? alerts.slice(0, 2) : alerts;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-lg">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Smart Insights
          </div>
          {insights.length > 0 && (
            <Badge variant="secondary" className="font-normal">
              {insights.length} active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayAlerts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Activity className="h-4 w-4" />
              Cross-Referenced Alerts
            </div>
            <div className="space-y-2">
              {displayAlerts.map(alert => (
                <div
                  key={alert.id}
                  className={`border-l-4 rounded-r-md p-3 ${severityColors[alert.severity]}`}
                  data-testid={`alert-${alert.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{alert.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {alert.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{alert.message}</p>
                      {alert.relatedData.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {alert.relatedData.map((data, idx) => (
                            data.link ? (
                              <Link key={idx} href={data.link}>
                                <Badge
                                  variant="secondary"
                                  className="text-xs cursor-pointer hover-elevate"
                                  data-testid={`alert-link-${alert.id}-${idx}`}
                                >
                                  {data.name}: {data.value}
                                  <ChevronRight className="h-3 w-3 ml-1" />
                                </Badge>
                              </Link>
                            ) : (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {data.name}: {data.value}
                              </Badge>
                            )
                          ))}
                        </div>
                      )}
                      {alert.suggestedAction && (
                        <p className="text-xs font-medium text-primary mt-1">
                          {alert.suggestedAction}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {displayInsights.length > 0 && (
          <ScrollArea className={compact ? "max-h-[280px]" : "max-h-[400px]"}>
            <div className="space-y-3 pr-2">
              {displayInsights.map(insight => {
                const Icon = typeIcons[insight.type];
                return (
                  <div
                    key={insight.id}
                    className="p-3 rounded-lg border bg-card hover-elevate transition-all"
                    data-testid={`insight-${insight.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 ${typeColors[insight.type]}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm leading-tight">
                            {insight.title}
                          </span>
                          <Badge variant={priorityBadgeVariants[insight.priority]} className="text-xs shrink-0">
                            {insight.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {insight.description}
                        </p>
                        {insight.dataPoints.length > 0 && (
                          <ul className="text-xs text-muted-foreground space-y-0.5">
                            {insight.dataPoints.slice(0, 3).map((point, idx) => (
                              <li key={idx} className="flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                                {point}
                              </li>
                            ))}
                          </ul>
                        )}
                        {insight.actionLink && (
                          <Link href={insight.actionLink}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs mt-1"
                              data-testid={`insight-action-${insight.id}`}
                            >
                              {insight.actionLabel || 'View Details'}
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {displayInsights.length === 0 && displayAlerts.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No insights available</p>
            <p className="text-xs">Add more data to unlock intelligent recommendations</p>
          </div>
        )}

        {compact && insights.length > 3 && (
          <Link href="/strategy">
            <Button variant="outline" size="sm" className="w-full" data-testid="view-all-insights">
              View All {insights.length} Insights
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

export function SmartInsightsCompact() {
  return <SmartInsightsPanel compact />;
}
