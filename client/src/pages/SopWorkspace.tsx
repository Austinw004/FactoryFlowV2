import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SopScenario, SopGapAnalysis, SopMeetingNotes, SopActionItem } from "@shared/schema";
import { Plus, Calendar, TrendingUp, FileText, CheckCircle2, AlertCircle, Clock, Users } from "lucide-react";
import { format } from "date-fns";

export default function SopWorkspace() {
  const [activeTab, setActiveTab] = useState("scenarios");
  const { toast } = useToast();

  // Fetch all S&OP data
  const { data: scenarios, isLoading: scenariosLoading } = useQuery<SopScenario[]>({
    queryKey: ["/api/sop/scenarios"],
  });

  const { data: gapAnalyses, isLoading: gapsLoading } = useQuery<SopGapAnalysis[]>({
    queryKey: ["/api/sop/gap-analysis"],
  });

  const { data: meetings, isLoading: meetingsLoading } = useQuery<SopMeetingNotes[]>({
    queryKey: ["/api/sop/meetings"],
  });

  const { data: actionItems, isLoading: actionItemsLoading } = useQuery<SopActionItem[]>({
    queryKey: ["/api/sop/action-items"],
  });

  // Approve scenario mutation
  const approveScenarioMutation = useMutation({
    mutationFn: async (scenarioId: string) => {
      return await apiRequest(`/api/sop/scenarios/${scenarioId}/approve`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sop/scenarios"] });
      toast({ title: "Scenario approved successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to approve scenario", description: error.message, variant: "destructive" });
    },
  });

  // Complete action item mutation
  const completeActionMutation = useMutation({
    mutationFn: async (actionId: string) => {
      return await apiRequest(`/api/sop/action-items/${actionId}/complete`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sop/action-items"] });
      toast({ title: "Action item completed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to complete action item", description: error.message, variant: "destructive" });
    },
  });

  const getScenarioBadgeVariant = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "draft": return "secondary";
      case "archived": return "outline";
      default: return "secondary";
    }
  };

  const getGapCategoryBadge = (category: string) => {
    switch (category) {
      case "shortage_critical": return <Badge variant="destructive" data-testid={`badge-gap-${category}`}>Critical Shortage</Badge>;
      case "shortage_minor": return <Badge variant="outline" className="border-orange-500 text-orange-500" data-testid={`badge-gap-${category}`}>Minor Shortage</Badge>;
      case "balanced": return <Badge variant="default" data-testid={`badge-gap-${category}`}>Balanced</Badge>;
      case "surplus": return <Badge variant="secondary" data-testid={`badge-gap-${category}`}>Surplus</Badge>;
      default: return <Badge variant="outline" data-testid={`badge-gap-${category}`}>{category}</Badge>;
    }
  };

  const getActionStatusBadge = (status: string) => {
    switch (status) {
      case "completed": return <Badge variant="default" data-testid={`badge-status-${status}`}><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
      case "in_progress": return <Badge variant="secondary" data-testid={`badge-status-${status}`}><Clock className="w-3 h-3 mr-1" />In Progress</Badge>;
      case "blocked": return <Badge variant="destructive" data-testid={`badge-status-${status}`}><AlertCircle className="w-3 h-3 mr-1" />Blocked</Badge>;
      case "open": return <Badge variant="outline" data-testid={`badge-status-${status}`}>Open</Badge>;
      default: return <Badge variant="outline" data-testid={`badge-status-${status}`}>{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "critical": return <Badge variant="destructive" data-testid={`badge-priority-${priority}`}>Critical</Badge>;
      case "high": return <Badge variant="outline" className="border-red-500 text-red-500" data-testid={`badge-priority-${priority}`}>High</Badge>;
      case "medium": return <Badge variant="secondary" data-testid={`badge-priority-${priority}`}>Medium</Badge>;
      case "low": return <Badge variant="outline" data-testid={`badge-priority-${priority}`}>Low</Badge>;
      default: return <Badge variant="outline" data-testid={`badge-priority-${priority}`}>{priority}</Badge>;
    }
  };

  return (
    <div className="min-h-screen p-6" data-testid="page-sop-workspace">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">S&OP Workspace</h1>
            <p className="text-muted-foreground" data-testid="text-page-description">
              Sales & Operations Planning for integrated demand, supply, and financial planning
            </p>
          </div>
          <Button data-testid="button-new-scenario">
            <Plus className="w-4 h-4 mr-2" />
            New Scenario
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card data-testid="card-scenarios-count">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Scenarios</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-scenarios-count">
                {scenarios?.filter(s => s.status === "active").length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {scenarios?.filter(s => s.status === "draft").length || 0} in draft
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-gap-analyses-count">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gap Analyses</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-gap-analyses-count">
                {gapAnalyses?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {gapAnalyses?.filter(g => g.gapCategory?.includes("shortage")).length || 0} shortages identified
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-meetings-count">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meetings Held</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-meetings-count">
                {meetings?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Next: {meetings?.[0] ? format(new Date(meetings[0].nextMeetingDate || new Date()), "MMM d") : "Not scheduled"}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-action-items-count">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Action Items</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-open-action-items-count">
                {actionItems?.filter(a => a.status !== "completed" && a.status !== "cancelled").length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {actionItems?.filter(a => a.status === "completed").length || 0} completed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList data-testid="tabs-list-sop">
            <TabsTrigger value="scenarios" data-testid="tab-trigger-scenarios">
              <TrendingUp className="w-4 h-4 mr-2" />
              Scenarios
            </TabsTrigger>
            <TabsTrigger value="gaps" data-testid="tab-trigger-gaps">
              <AlertCircle className="w-4 h-4 mr-2" />
              Gap Analysis
            </TabsTrigger>
            <TabsTrigger value="meetings" data-testid="tab-trigger-meetings">
              <Users className="w-4 h-4 mr-2" />
              Meetings
            </TabsTrigger>
            <TabsTrigger value="actions" data-testid="tab-trigger-actions">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Action Items
            </TabsTrigger>
          </TabsList>

          {/* Scenarios Tab */}
          <TabsContent value="scenarios" className="space-y-4">
            <Card data-testid="card-scenarios-list">
              <CardHeader>
                <CardTitle>Planning Scenarios</CardTitle>
                <CardDescription>
                  Create and manage different demand/supply planning scenarios for what-if analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                {scenariosLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                  </div>
                ) : scenarios && scenarios.length > 0 ? (
                  <div className="space-y-3">
                    {scenarios.map((scenario) => (
                      <Card key={scenario.id} className="hover-elevate" data-testid={`card-scenario-${scenario.id}`}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <CardTitle className="text-lg" data-testid={`text-scenario-name-${scenario.id}`}>
                                {scenario.name}
                              </CardTitle>
                              <div className="flex items-center gap-2">
                                <Badge variant={getScenarioBadgeVariant(scenario.status)} data-testid={`badge-scenario-status-${scenario.id}`}>
                                  {scenario.status}
                                </Badge>
                                <Badge variant="outline" data-testid={`badge-scenario-type-${scenario.id}`}>
                                  {scenario.scenarioType}
                                </Badge>
                                <span className="text-sm text-muted-foreground" data-testid={`text-scenario-period-${scenario.id}`}>
                                  {format(new Date(scenario.startDate), "MMM d, yyyy")} - {format(new Date(scenario.endDate), "MMM d, yyyy")}
                                </span>
                              </div>
                            </div>
                            {scenario.status === "draft" && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => approveScenarioMutation.mutate(scenario.id)}
                                disabled={approveScenarioMutation.isPending}
                                data-testid={`button-approve-scenario-${scenario.id}`}
                              >
                                Approve Scenario
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        {scenario.notes && (
                          <CardContent>
                            <p className="text-sm text-muted-foreground" data-testid={`text-scenario-notes-${scenario.id}`}>
                              {scenario.notes}
                            </p>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12" data-testid="empty-state-scenarios">
                    <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No scenarios yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Create your first planning scenario to start S&OP planning
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gap Analysis Tab */}
          <TabsContent value="gaps" className="space-y-4">
            <Card data-testid="card-gap-analysis-list">
              <CardHeader>
                <CardTitle>Demand vs Supply Gap Analysis</CardTitle>
                <CardDescription>
                  Track and analyze gaps between forecasted demand and planned supply capacity
                </CardDescription>
              </CardHeader>
              <CardContent>
                {gapsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : gapAnalyses && gapAnalyses.length > 0 ? (
                  <div className="space-y-3">
                    {gapAnalyses.map((gap) => (
                      <Card key={gap.id} className="hover-elevate" data-testid={`card-gap-${gap.id}`}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                {getGapCategoryBadge(gap.gapCategory)}
                                <span className="text-sm font-medium" data-testid={`text-gap-period-${gap.id}`}>
                                  {format(new Date(gap.periodStart), "MMM d")} - {format(new Date(gap.periodEnd), "MMM d, yyyy")}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span data-testid={`text-gap-demand-${gap.id}`}>Demand: {gap.forecastedDemand.toLocaleString()} units</span>
                                <span data-testid={`text-gap-supply-${gap.id}`}>Supply: {gap.plannedProduction.toLocaleString()} units</span>
                                <span className="font-medium" data-testid={`text-gap-quantity-${gap.id}`}>
                                  Gap: {gap.gapQuantity > 0 ? "+" : ""}{gap.gapQuantity.toLocaleString()} units ({gap.gapPercentage?.toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                          </div>
                          {gap.recommendedAction && (
                            <p className="mt-3 text-sm" data-testid={`text-gap-action-${gap.id}`}>
                              <strong>Recommended Action:</strong> {gap.recommendedAction}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12" data-testid="empty-state-gaps">
                    <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No gap analyses yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Run gap analysis to identify demand vs supply constraints
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Meetings Tab */}
          <TabsContent value="meetings" className="space-y-4">
            <Card data-testid="card-meetings-list">
              <CardHeader>
                <CardTitle>S&OP Meeting Notes</CardTitle>
                <CardDescription>
                  Monthly S&OP meeting records, decisions, and follow-up actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {meetingsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map(i => <Skeleton key={i} className="h-24 w-full" />)}
                  </div>
                ) : meetings && meetings.length > 0 ? (
                  <div className="space-y-3">
                    {meetings.map((meeting) => (
                      <Card key={meeting.id} className="hover-elevate" data-testid={`card-meeting-${meeting.id}`}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <CardTitle className="text-lg" data-testid={`text-meeting-date-${meeting.id}`}>
                                {format(new Date(meeting.meetingDate), "MMMM d, yyyy")}
                              </CardTitle>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" data-testid={`badge-meeting-type-${meeting.id}`}>
                                  {meeting.meetingType}
                                </Badge>
                                {meeting.nextMeetingDate && (
                                  <span className="text-sm text-muted-foreground" data-testid={`text-meeting-next-${meeting.id}`}>
                                    <Calendar className="inline w-3 h-3 mr-1" />
                                    Next: {format(new Date(meeting.nextMeetingDate), "MMM d, yyyy")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        {meeting.keyDecisions && (
                          <CardContent>
                            <h4 className="text-sm font-semibold mb-2">Key Decisions:</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid={`text-meeting-decisions-${meeting.id}`}>
                              {meeting.keyDecisions}
                            </p>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12" data-testid="empty-state-meetings">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No meeting notes yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Document your first S&OP meeting to track decisions and follow-ups
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Action Items Tab */}
          <TabsContent value="actions" className="space-y-4">
            <Card data-testid="card-action-items-list">
              <CardHeader>
                <CardTitle>Action Items</CardTitle>
                <CardDescription>
                  Track and manage action items from S&OP meetings and gap analyses
                </CardDescription>
              </CardHeader>
              <CardContent>
                {actionItemsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                  </div>
                ) : actionItems && actionItems.length > 0 ? (
                  <div className="space-y-3">
                    {actionItems.map((item) => (
                      <Card key={item.id} className="hover-elevate" data-testid={`card-action-${item.id}`}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="space-y-1 flex-1">
                              <CardTitle className="text-base" data-testid={`text-action-title-${item.id}`}>
                                {item.title}
                              </CardTitle>
                              <div className="flex items-center gap-2 flex-wrap">
                                {getActionStatusBadge(item.status)}
                                {getPriorityBadge(item.priority)}
                                <Badge variant="outline" data-testid={`badge-action-category-${item.id}`}>
                                  {item.category}
                                </Badge>
                                {item.dueDate && (
                                  <span className="text-sm text-muted-foreground" data-testid={`text-action-due-${item.id}`}>
                                    <Clock className="inline w-3 h-3 mr-1" />
                                    Due: {format(new Date(item.dueDate), "MMM d, yyyy")}
                                  </span>
                                )}
                                {item.progress !== null && item.progress !== undefined && (
                                  <span className="text-sm text-muted-foreground" data-testid={`text-action-progress-${item.id}`}>
                                    {item.progress}% complete
                                  </span>
                                )}
                              </div>
                            </div>
                            {item.status !== "completed" && item.status !== "cancelled" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => completeActionMutation.mutate(item.id)}
                                disabled={completeActionMutation.isPending}
                                data-testid={`button-complete-action-${item.id}`}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Complete
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        {item.description && (
                          <CardContent>
                            <p className="text-sm text-muted-foreground" data-testid={`text-action-description-${item.id}`}>
                              {item.description}
                            </p>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12" data-testid="empty-state-actions">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No action items yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Create action items to track follow-ups from meetings and gap analyses
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
