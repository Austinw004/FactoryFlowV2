import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  GitBranch,
  RefreshCw,
  Shield,
  XCircle,
  Zap,
  ArrowRight,
  RotateCcw,
  Eye,
  Wifi,
  WifiOff,
  Timer,
  Inbox,
} from "lucide-react";

interface OrchestratorConnection {
  integrationId: string;
  displayName: string;
  category: string;
  capabilities: {
    canImport: boolean;
    canExport: boolean;
    canWebhook: boolean;
    canBatch: boolean;
    canRealTime: boolean;
    supportedObjects: string[];
    dataFlowDirection: string;
  };
  requiresCredentials: boolean;
  regimeAware: boolean;
  paymentCritical: boolean;
  connection: {
    id: string;
    status: string;
    lastSyncAt: string | null;
    lastSuccessfulSyncAt: string | null;
    lastSyncStatus: string | null;
    lastErrorMessage: string | null;
    totalSyncs: number;
    totalErrors: number;
    totalObjectsSynced: number;
    isVerified: boolean;
    syncFrequencyMinutes: number;
    dataFreshness: string;
  } | null;
}

interface OrchestratorEvent {
  id: string;
  integrationId: string;
  eventType: string;
  direction: string;
  status: string;
  createdAt: string;
  payload: string;
}

interface DeadLetterEvent {
  id: string;
  integrationId: string;
  eventType: string;
  errorMessage: string;
  errorCategory: string;
  retryCount: number;
  maxRetries: number;
  isResolved: number;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolution: string | null;
}

interface ReadinessReport {
  summary: {
    totalConnectors: number;
    connectedCount: number;
    healthyCount: number;
    degradedCount: number;
    failedCount: number;
    readinessScore: number;
    coverageByCategory: Record<string, { total: number; connected: number }>;
  };
  dependencyGraph: {
    objectType: string;
    providers: string[];
    consumers: string[];
    hasProvider: boolean;
  }[];
}

function freshnessColor(freshness: string) {
  switch (freshness) {
    case "fresh": return "text-green-500";
    case "recent": return "text-blue-500";
    case "stale": return "text-amber-500";
    case "outdated": return "text-red-500";
    default: return "text-muted-foreground";
  }
}

function freshnessLabel(freshness: string) {
  switch (freshness) {
    case "fresh": return "< 5 min ago";
    case "recent": return "< 1 hr ago";
    case "stale": return "< 24 hrs ago";
    case "outdated": return "> 24 hrs ago";
    default: return "Never synced";
  }
}

function statusIcon(status: string) {
  switch (status) {
    case "healthy": return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "connected": return <Wifi className="w-4 h-4 text-blue-500" />;
    case "syncing": return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
    case "degraded": return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case "failed": return <XCircle className="w-4 h-4 text-red-500" />;
    case "disabled": return <WifiOff className="w-4 h-4 text-muted-foreground" />;
    default: return <Clock className="w-4 h-4 text-muted-foreground" />;
  }
}

function statusBadgeVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "healthy": return "default";
    case "connected": return "secondary";
    case "degraded": return "outline";
    case "failed": return "destructive";
    default: return "outline";
  }
}

export function IntegrationOrchestratorPanel() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("status");

  const { data: connections = [], isLoading: connectionsLoading } = useQuery<OrchestratorConnection[]>({
    queryKey: ["/api/orchestrator/connections"],
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery<OrchestratorEvent[]>({
    queryKey: ["/api/orchestrator/events"],
  });

  const { data: deadLetters = [], isLoading: dlLoading } = useQuery<DeadLetterEvent[]>({
    queryKey: ["/api/orchestrator/dead-letter"],
  });

  const { data: readiness, isLoading: readinessLoading } = useQuery<ReadinessReport>({
    queryKey: ["/api/orchestrator/readiness-report"],
  });

  const syncMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      return apiRequest("POST", `/api/orchestrator/connections/${integrationId}/sync`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orchestrator/connections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orchestrator/events"] });
      toast({ title: "Sync triggered", description: "Integration sync has been started." });
    },
    onError: () => {
      toast({ title: "Sync failed", description: "Could not start sync. Check credentials.", variant: "destructive" });
    },
  });

  const replayMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/orchestrator/dead-letter/${id}/replay`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orchestrator/dead-letter"] });
      toast({ title: "Event replayed", description: "Dead letter event has been re-queued." });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/orchestrator/dead-letter/${id}/resolve`, { resolution: "Manually resolved" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orchestrator/dead-letter"] });
      toast({ title: "Event resolved", description: "Dead letter event marked as resolved." });
    },
  });

  const connectedIntegrations = connections.filter(c => c.connection !== null);
  const notConfigured = connections.filter(c => c.connection === null);
  const healthyCount = connectedIntegrations.filter(c => c.connection?.status === "healthy" || c.connection?.status === "connected").length;
  const degradedCount = connectedIntegrations.filter(c => c.connection?.status === "degraded").length;
  const failedCount = connectedIntegrations.filter(c => c.connection?.status === "failed").length;
  const unresolvedDeadLetters = deadLetters.filter(d => d.isResolved === 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Wifi className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xl font-bold" data-testid="text-orch-connected">{connectedIntegrations.length}</p>
              <p className="text-xs text-muted-foreground">Connected</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xl font-bold" data-testid="text-orch-healthy">{healthyCount}</p>
              <p className="text-xs text-muted-foreground">Healthy</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xl font-bold" data-testid="text-orch-degraded">{degradedCount}</p>
              <p className="text-xs text-muted-foreground">Degraded</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-xl font-bold" data-testid="text-orch-failed">{failedCount}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Database className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xl font-bold" data-testid="text-orch-total">{connections.length}</p>
              <p className="text-xs text-muted-foreground">Registered</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {readiness && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Platform Readiness
              </CardTitle>
              <Badge variant={readiness.summary.readinessScore >= 80 ? "default" : readiness.summary.readinessScore >= 50 ? "secondary" : "outline"}>
                {readiness.summary.readinessScore}% Ready
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={readiness.summary.readinessScore} className="h-2 mb-4" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {Object.entries(readiness.summary.coverageByCategory).map(([category, data]) => (
                <div key={category} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                  <span className="text-muted-foreground capitalize">{category}</span>
                  <span className={data.connected > 0 ? "text-green-600 font-medium" : "text-muted-foreground"}>
                    {data.connected}/{data.total}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="status" data-testid="tab-orch-status">
            <Wifi className="w-4 h-4 mr-1" /> Live Status
          </TabsTrigger>
          <TabsTrigger value="events" data-testid="tab-orch-events">
            <Zap className="w-4 h-4 mr-1" /> Event Log
          </TabsTrigger>
          <TabsTrigger value="dead-letter" data-testid="tab-orch-deadletter">
            <Inbox className="w-4 h-4 mr-1" /> Dead Letters
            {unresolvedDeadLetters.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">{unresolvedDeadLetters.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="dependencies" data-testid="tab-orch-deps">
            <GitBranch className="w-4 h-4 mr-1" /> Dependencies
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="mt-4">
          {connectionsLoading ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Loading orchestrator status...</CardContent></Card>
          ) : connectedIntegrations.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <WifiOff className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Active Connections</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect integrations from the catalog to see live status here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {connectedIntegrations.map(conn => (
                <Card key={conn.integrationId} data-testid={`card-orch-status-${conn.integrationId}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        {statusIcon(conn.connection!.status)}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-medium">{conn.displayName}</h4>
                            <Badge variant={statusBadgeVariant(conn.connection!.status)} className="text-xs">
                              {conn.connection!.status}
                            </Badge>
                            {conn.paymentCritical && (
                              <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                                <Shield className="w-3 h-3 mr-1" /> Payment-Critical
                              </Badge>
                            )}
                            {conn.regimeAware && (
                              <Badge variant="outline" className="text-xs">
                                <Shield className="w-3 h-3 mr-1" /> Regime-Aware
                              </Badge>
                            )}
                            {conn.connection!.isVerified && (
                              <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                                <CheckCircle className="w-3 h-3 mr-1" /> Verified
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Timer className="w-3 h-3" />
                              <span className={freshnessColor(conn.connection!.dataFreshness)}>
                                {freshnessLabel(conn.connection!.dataFreshness)}
                              </span>
                            </span>
                            <span>{conn.connection!.totalSyncs} syncs</span>
                            <span>{conn.connection!.totalObjectsSynced} objects</span>
                            {conn.connection!.totalErrors > 0 && (
                              <span className="text-red-500">{conn.connection!.totalErrors} errors</span>
                            )}
                          </div>
                          {conn.connection!.lastErrorMessage && (
                            <p className="text-xs text-red-500 mt-1 truncate max-w-md">{conn.connection!.lastErrorMessage}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => syncMutation.mutate(conn.integrationId)}
                          disabled={syncMutation.isPending}
                          data-testid={`button-sync-${conn.integrationId}`}
                        >
                          <RefreshCw className={`w-4 h-4 mr-1 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                          Sync
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          {eventsLoading ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Loading events...</CardContent></Card>
          ) : events.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Events Yet</h3>
                <p className="text-sm text-muted-foreground">
                  Integration events will appear here as data flows through the system.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {events.slice(0, 50).map(event => (
                <Card key={event.id} data-testid={`card-event-${event.id}`}>
                  <CardContent className="p-3 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full ${event.status === "processed" ? "bg-green-500" : event.status === "failed" ? "bg-red-500" : "bg-amber-500"}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{event.eventType}</span>
                          <Badge variant="outline" className="text-xs">{event.integrationId}</Badge>
                          <Badge variant="secondary" className="text-xs">{event.direction}</Badge>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(event.createdAt).toLocaleString()}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="dead-letter" className="mt-4">
          {dlLoading ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Loading dead letter queue...</CardContent></Card>
          ) : unresolvedDeadLetters.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                <h3 className="font-semibold mb-2">Queue Clear</h3>
                <p className="text-sm text-muted-foreground">
                  No unresolved dead letter events. All event processing is healthy.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {unresolvedDeadLetters.map(dl => (
                <Card key={dl.id} className="border-red-500/20" data-testid={`card-deadletter-${dl.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                          <span className="font-medium text-sm">{dl.eventType}</span>
                          <Badge variant="outline" className="text-xs">{dl.integrationId}</Badge>
                          <Badge variant="secondary" className="text-xs">
                            Retry {dl.retryCount}/{dl.maxRetries}
                          </Badge>
                        </div>
                        <p className="text-xs text-red-500 mt-1">{dl.errorMessage}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(dl.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => replayMutation.mutate(dl.id)}
                          disabled={replayMutation.isPending}
                          data-testid={`button-replay-${dl.id}`}
                        >
                          <RotateCcw className="w-4 h-4 mr-1" /> Replay
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolveMutation.mutate(dl.id)}
                          disabled={resolveMutation.isPending}
                          data-testid={`button-resolve-${dl.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" /> Resolve
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="dependencies" className="mt-4">
          {readinessLoading ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Loading dependency graph...</CardContent></Card>
          ) : !readiness?.dependencyGraph ? (
            <Card>
              <CardContent className="p-8 text-center">
                <GitBranch className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Dependency Data</h3>
                <p className="text-sm text-muted-foreground">
                  Connect integrations to see the data dependency graph.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Data Object Dependencies</CardTitle>
                  <CardDescription className="text-xs">
                    Shows which integrations provide each data type and which platform modules consume them.
                    Objects without a provider represent gaps in your integration coverage.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {readiness.dependencyGraph.map(dep => (
                      <div
                        key={dep.objectType}
                        className={`flex items-center justify-between p-3 rounded-md ${dep.hasProvider ? "bg-muted/30" : "bg-red-500/5 border border-red-500/20"}`}
                        data-testid={`dep-row-${dep.objectType}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {dep.hasProvider ? (
                            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <span className="text-sm font-medium capitalize">{dep.objectType.replace(/_/g, " ")}</span>
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              {dep.providers.length > 0 ? (
                                dep.providers.slice(0, 3).map(p => (
                                  <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                                ))
                              ) : (
                                <span className="text-xs text-red-500">No provider connected</span>
                              )}
                              {dep.providers.length > 3 && (
                                <span className="text-xs text-muted-foreground">+{dep.providers.length - 3} more</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap justify-end">
                          {dep.consumers.slice(0, 2).map(c => (
                            <Badge key={c} variant="secondary" className="text-xs">
                              <ArrowRight className="w-3 h-3 mr-1" /> {c}
                            </Badge>
                          ))}
                          {dep.consumers.length > 2 && (
                            <span className="text-xs text-muted-foreground">+{dep.consumers.length - 2}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}