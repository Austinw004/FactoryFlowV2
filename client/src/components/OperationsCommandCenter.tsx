import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertTriangle, 
  Wrench, 
  Radio, 
  Users, 
  FileText, 
  ChevronRight,
  Activity,
  CheckCircle,
  Clock
} from "lucide-react";
import { Link } from "wouter";

interface AttentionItem {
  id: string;
  type: "machinery" | "sensor" | "workforce" | "compliance" | "production";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  link: string;
  count?: number;
}

interface OperationsAttentionData {
  items: AttentionItem[];
  summary: {
    critical: number;
    warning: number;
    info: number;
    total: number;
  };
}

const typeIcons = {
  machinery: Wrench,
  sensor: Radio,
  workforce: Users,
  compliance: FileText,
  production: Activity,
};

const severityStyles = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-800",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800",
};

const severityBadgeStyles = {
  critical: "bg-red-600",
  warning: "bg-yellow-600",
  info: "bg-blue-600",
};

export function OperationsCommandCenter() {
  const { data, isLoading } = useQuery<OperationsAttentionData>({
    queryKey: ["/api/operations/attention"],
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const items = data?.items || [];
  const summary = data?.summary || { critical: 0, warning: 0, info: 0, total: 0 };

  if (summary.total === 0) {
    return (
      <Card className="mb-6 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">All Clear</p>
              <p className="text-sm text-green-600 dark:text-green-400">No items need attention right now</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6" data-testid="card-operations-command-center">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            What Needs Attention Today
          </CardTitle>
          <div className="flex gap-2">
            {summary.critical > 0 && (
              <Badge className="bg-red-600">{summary.critical} Critical</Badge>
            )}
            {summary.warning > 0 && (
              <Badge className="bg-yellow-600">{summary.warning} Warning</Badge>
            )}
            {summary.info > 0 && (
              <Badge className="bg-blue-600">{summary.info} Info</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.slice(0, 6).map((item) => {
            const Icon = typeIcons[item.type];
            return (
              <Link key={item.id} href={item.link}>
                <div
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover-elevate ${severityStyles[item.severity]}`}
                  data-testid={`attention-item-${item.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{item.title}</p>
                        {item.count && item.count > 1 && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">
                            {item.count}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs mt-0.5 opacity-80 line-clamp-2">{item.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        {items.length > 6 && (
          <div className="mt-3 text-center">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/operations">
                View All {items.length} Items
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
