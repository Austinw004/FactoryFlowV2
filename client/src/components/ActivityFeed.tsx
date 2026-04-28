import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  TrendingUp,
  Package,
  Box,
  FileText,
  Settings,
  Users,
  Upload,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
} from "lucide-react";

interface ActivityLogEntry {
  id: string;
  activityType: string;
  title: string;
  description?: string;
  category: string;
  severity: string;
  createdAt: string;
  entityType?: string;
  metadata?: Record<string, unknown>;
}

const activityIcons: Record<string, typeof Activity> = {
  forecast_run: TrendingUp,
  allocation_created: Package,
  sku_added: Box,
  material_updated: Package,
  regime_change: Zap,
  rfq_generated: FileText,
  report_exported: FileText,
  settings_changed: Settings,
  user_invited: Users,
  data_imported: Upload,
  default: Activity,
};

const severityColors: Record<string, string> = {
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  success: "bg-green-500/10 text-green-600",
  warning: "bg-yellow-500/10 text-yellow-600",
  error: "bg-red-500/10 text-red-600",
};

const severityIcons: Record<string, typeof CheckCircle> = {
  info: Clock,
  success: CheckCircle,
  warning: AlertCircle,
  error: AlertCircle,
};

export function ActivityFeed({ limit = 10 }: { limit?: number }) {
  const { data: activities, isLoading, error } = useQuery<ActivityLogEntry[]>({
    queryKey: ['/api/activity-logs', limit],
  });

  if (isLoading) {
    return (
      <Card data-testid="card-activity-feed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card data-testid="card-activity-feed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            Unable to load activity feed
          </div>
        </CardContent>
      </Card>
    );
  }

  const activityList = activities || [];

  return (
    <Card data-testid="card-activity-feed">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {activityList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No recent activity</p>
            <p className="text-xs mt-1">Actions you take will appear here</p>
          </div>
        ) : (
          <ScrollArea className="h-[350px] pr-4">
            <div className="space-y-4">
              {activityList.map((activity) => {
                const Icon = activityIcons[activity.activityType] || activityIcons.default;
                const SeverityIcon = severityIcons[activity.severity] || Clock;
                const severityClass = severityColors[activity.severity] || severityColors.info;

                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 group"
                    data-testid={`activity-item-${activity.id}`}
                  >
                    <div className={`p-2 rounded-full ${severityClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{activity.title}</p>
                        <Badge variant="outline" className="text-xs capitalize">
                          {activity.category}
                        </Badge>
                      </div>
                      {activity.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {activity.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                        <SeverityIcon className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
