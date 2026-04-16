import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  insertSopScenarioSchema,
  insertSopGapAnalysisSchema,
  insertSopActionItemSchema,
  type SopScenario,
  type SopGapAnalysis,
  type SopMeeting,
  type SopActionItem,
  type InsertSopScenario,
  type InsertSopGapAnalysis,
  type InsertSopActionItem,
} from "@shared/schema";
import { Plus, Calendar, TrendingUp, FileText, CheckCircle2, AlertCircle, Clock, Users, Mail, Bell, X, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

// Helper function to safely format dates
function safeFormatDate(dateValue: Date | string | null | undefined, formatString: string, fallback: string = "TBD"): string {
  if (!dateValue) return fallback;
  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    if (isNaN(date.getTime())) return fallback;
    return format(date, formatString);
  } catch {
    return fallback;
  }
}

// Create scenario form schema - omit server-injected fields first
const createScenarioFormSchema = insertSopScenarioSchema
  .omit({ companyId: true, createdBy: true, approvedAt: true, approvedBy: true })
  .extend({
    startDate: z.string(),
    endDate: z.string(),
    nextReviewDate: z.string().optional(),
  });

// Create gap analysis form schema - omit server-injected fields
const createGapFormSchema = insertSopGapAnalysisSchema
  .omit({ companyId: true })
  .extend({
    periodStart: z.string(),
    periodEnd: z.string(),
    forecastedDemand: z.coerce.number().min(0),
    plannedProduction: z.coerce.number().min(0),
    gapQuantity: z.coerce.number(),
    gapPercentage: z.coerce.number().optional(),
  });

// Create meeting form schema - uses fields from the database schema plus UI-specific fields
const createMeetingFormSchema = z.object({
  meetingDate: z.string(),
  meetingTime: z.string().optional(),
  meetingType: z.string().default("monthly_sop"),
  title: z.string().optional(),
  agenda: z.string().optional(),
  keyDecisions: z.string().optional(),
  nextMeetingDate: z.string().optional(),
});

// Create action item form schema - use explicit fields for UI
const createActionFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.string().default("process_improvement"),
  priority: z.string().default("medium"),
  status: z.string().default("open"),
  dueDate: z.string(),
  assignedTo: z.string().optional(),
  progress: z.coerce.number().min(0).max(100).optional(),
  expectedImpact: z.string().optional(),
});

export default function SopWorkspace() {
  const [activeTab, setActiveTab] = useState("scenarios");
  const [scenarioDialogOpen, setScenarioDialogOpen] = useState(false);
  const [gapDialogOpen, setGapDialogOpen] = useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const { toast } = useToast();
  
  // Meeting invite state
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [externalEmails, setExternalEmails] = useState<string[]>([]);
  const [newExternalEmail, setNewExternalEmail] = useState("");
  const [sendEmailInvites, setSendEmailInvites] = useState(true);
  const [sendInAppAlerts, setSendInAppAlerts] = useState(true);

  // Fetch team members for attendees selection
  const { data: teamMembers } = useQuery<TeamMember[]>({
    queryKey: ["/api/users"],
  });

  // Fetch all S&OP data
  const { data: scenarios, isLoading: scenariosLoading } = useQuery<SopScenario[]>({
    queryKey: ["/api/sop/scenarios"],
  });

  const { data: gapAnalyses, isLoading: gapsLoading } = useQuery<SopGapAnalysis[]>({
    queryKey: ["/api/sop/gap-analysis"],
  });

  const { data: meetings, isLoading: meetingsLoading } = useQuery<SopMeeting[]>({
    queryKey: ["/api/sop/meetings"],
  });

  const { data: actionItems, isLoading: actionItemsLoading } = useQuery<SopActionItem[]>({
    queryKey: ["/api/sop/action-items"],
  });

  // Create scenario form
  const scenarioForm = useForm<z.infer<typeof createScenarioFormSchema>>({
    resolver: zodResolver(createScenarioFormSchema),
    defaultValues: {
      name: "",
      scenarioType: "baseline",
      planningPeriod: "quarterly",
      status: "draft",
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
      notes: "",
    },
  });

  // Create gap analysis form
  const gapForm = useForm<z.infer<typeof createGapFormSchema>>({
    resolver: zodResolver(createGapFormSchema),
    defaultValues: {
      periodStart: format(new Date(), "yyyy-MM-dd"),
      periodEnd: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
      forecastedDemand: 0,
      plannedProduction: 0,
      gapQuantity: 0,
      gapCategory: "balanced",
    },
  });

  // Create meeting notes form
  const meetingForm = useForm<z.infer<typeof createMeetingFormSchema>>({
    resolver: zodResolver(createMeetingFormSchema),
    defaultValues: {
      meetingDate: format(new Date(), "yyyy-MM-dd"),
      meetingTime: "09:00",
      meetingType: "monthly_sop",
      title: "",
      agenda: "",
    },
  });
  
  // Helper to add external email
  const addExternalEmail = () => {
    const email = newExternalEmail.trim();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !externalEmails.includes(email)) {
      setExternalEmails([...externalEmails, email]);
      setNewExternalEmail("");
    }
  };
  
  // Helper to remove external email
  const removeExternalEmail = (email: string) => {
    setExternalEmails(externalEmails.filter(e => e !== email));
  };
  
  // Toggle team member selection
  const toggleAttendee = (userId: string) => {
    if (selectedAttendees.includes(userId)) {
      setSelectedAttendees(selectedAttendees.filter(id => id !== userId));
    } else {
      setSelectedAttendees([...selectedAttendees, userId]);
    }
  };
  
  // Reset meeting form and state
  const resetMeetingForm = () => {
    meetingForm.reset();
    setSelectedAttendees([]);
    setExternalEmails([]);
    setNewExternalEmail("");
    setSendEmailInvites(true);
    setSendInAppAlerts(true);
  };

  // Create action item form
  const actionForm = useForm<z.infer<typeof createActionFormSchema>>({
    resolver: zodResolver(createActionFormSchema),
    defaultValues: {
      title: "",
      category: "demand_planning",
      priority: "medium",
      status: "open",
      dueDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
      progress: 0,
    },
  });

  // Create scenario mutation
  const createScenarioMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createScenarioFormSchema>) => {
      const payload = {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        nextReviewDate: data.nextReviewDate ? new Date(data.nextReviewDate) : undefined,
      };
      return await apiRequest("POST", "/api/sop/scenarios", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sop/scenarios"] });
      toast({ title: "Scenario created successfully" });
      setScenarioDialogOpen(false);
      scenarioForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create scenario", description: error.message, variant: "destructive" });
    },
  });

  // Create gap analysis mutation
  const createGapMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createGapFormSchema>) => {
      const payload = {
        ...data,
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd),
      };
      return await apiRequest("POST", "/api/sop/gap-analysis", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sop/gap-analysis"] });
      toast({ title: "Gap analysis created successfully" });
      setGapDialogOpen(false);
      gapForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create gap analysis", description: error.message, variant: "destructive" });
    },
  });

  // Create meeting notes mutation
  const createMeetingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createMeetingFormSchema>) => {
      // Build attendees array from selected team members
      const attendeesData = selectedAttendees.map(userId => {
        const member = teamMembers?.find(m => m.id === userId);
        return member ? {
          userId: member.id,
          name: `${member.firstName} ${member.lastName}`,
          email: member.email,
          role: member.role
        } : null;
      }).filter(Boolean);
      
      const payload = {
        ...data,
        meetingDate: new Date(data.meetingDate),
        nextMeetingDate: data.nextMeetingDate ? new Date(data.nextMeetingDate) : undefined,
        attendees: attendeesData,
        // Include invite options
        sendEmailInvites,
        sendInAppAlerts,
        externalEmails,
      };
      return await apiRequest("POST", "/api/sop/meetings", payload);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sop/meetings"] });
      const invitesSent = sendEmailInvites && (selectedAttendees.length > 0 || externalEmails.length > 0);
      toast({ 
        title: "Meeting scheduled successfully",
        description: invitesSent 
          ? `Invitations sent to ${selectedAttendees.length + externalEmails.length} attendees` 
          : undefined
      });
      setMeetingDialogOpen(false);
      resetMeetingForm();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create meeting", description: error.message, variant: "destructive" });
    },
  });

  // Create action item mutation
  const createActionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createActionFormSchema>) => {
      const payload = {
        ...data,
        dueDate: new Date(data.dueDate),
      };
      return await apiRequest("POST", "/api/sop/action-items", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sop/action-items"] });
      toast({ title: "Action item created successfully" });
      setActionDialogOpen(false);
      actionForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create action item", description: error.message, variant: "destructive" });
    },
  });

  // Approve scenario mutation
  const approveScenarioMutation = useMutation({
    mutationFn: async (scenarioId: string) => {
      return await apiRequest("POST", `/api/sop/scenarios/${scenarioId}/approve`);
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
      return await apiRequest("POST", `/api/sop/action-items/${actionId}/complete`);
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
          <Dialog open={scenarioDialogOpen} onOpenChange={setScenarioDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-scenario">
                <Plus className="w-4 h-4 mr-2" />
                New Scenario
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="dialog-create-scenario">
              <DialogHeader>
                <DialogTitle>Create Planning Scenario</DialogTitle>
                <DialogDescription>
                  Create a new S&OP planning scenario (baseline, optimistic, or pessimistic)
                </DialogDescription>
              </DialogHeader>
              <Form {...scenarioForm}>
                <form onSubmit={scenarioForm.handleSubmit((data) => createScenarioMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={scenarioForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Scenario Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Q1 2024 Plan" {...field} data-testid="input-scenario-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={scenarioForm.control}
                    name="scenarioType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Scenario Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-scenario-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="baseline">Baseline</SelectItem>
                            <SelectItem value="optimistic">Optimistic</SelectItem>
                            <SelectItem value="pessimistic">Pessimistic</SelectItem>
                            <SelectItem value="worst_case">Worst Case</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={scenarioForm.control}
                    name="planningPeriod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Planning Period</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-planning-period">
                              <SelectValue placeholder="Select period" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="annual">Annual</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={scenarioForm.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-scenario-start-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={scenarioForm.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-scenario-end-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={scenarioForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Description or assumptions..." {...field} value={field.value || ""} data-testid="textarea-scenario-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={createScenarioMutation.isPending} data-testid="button-submit-scenario">
                    {createScenarioMutation.isPending ? "Creating..." : "Create Scenario"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
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
                Next: {meetings?.[0] ? format(new Date((meetings[0] as any).nextMeetingDate || new Date()), "MMM d") : "Not scheduled"}
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
                              <div className="flex items-center gap-2 flex-wrap">
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
                    <p className="text-sm text-muted-foreground mb-4">
                      Create your first planning scenario to start S&OP planning
                    </p>
                    <Dialog open={scenarioDialogOpen} onOpenChange={setScenarioDialogOpen}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-create-first-scenario">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Scenario
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gap Analysis Tab */}
          <TabsContent value="gaps" className="space-y-4">
            <div className="flex items-center justify-between">
              <div></div>
              <Dialog open={gapDialogOpen} onOpenChange={setGapDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-new-gap-analysis">
                    <Plus className="w-4 h-4 mr-2" />
                    New Gap Analysis
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="dialog-create-gap">
                  <DialogHeader>
                    <DialogTitle>Create Gap Analysis</DialogTitle>
                    <DialogDescription>
                      Analyze the gap between forecasted demand and planned production capacity
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...gapForm}>
                    <form onSubmit={gapForm.handleSubmit((data) => createGapMutation.mutate(data))} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={gapForm.control}
                          name="periodStart"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Period Start</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} data-testid="input-gap-period-start" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={gapForm.control}
                          name="periodEnd"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Period End</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} data-testid="input-gap-period-end" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={gapForm.control}
                        name="forecastedDemand"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Forecasted Demand (units)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} data-testid="input-gap-demand" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={gapForm.control}
                        name="plannedProduction"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Planned Production (units)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} data-testid="input-gap-production" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={gapForm.control}
                        name="gapQuantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gap Quantity (units)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} data-testid="input-gap-quantity" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={gapForm.control}
                        name="gapCategory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gap Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-gap-category">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="shortage_critical">Critical Shortage</SelectItem>
                                <SelectItem value="shortage_minor">Minor Shortage</SelectItem>
                                <SelectItem value="balanced">Balanced</SelectItem>
                                <SelectItem value="surplus">Surplus</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={gapForm.control}
                        name="recommendedAction"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recommended Action</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Recommended actions to address this gap..." {...field} value={field.value || ""} data-testid="textarea-gap-action" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={createGapMutation.isPending} data-testid="button-submit-gap">
                        {createGapMutation.isPending ? "Creating..." : "Create Gap Analysis"}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
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
                              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
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
                    <p className="text-sm text-muted-foreground mb-4">
                      Run gap analysis to identify demand vs supply constraints
                    </p>
                    <Dialog open={gapDialogOpen} onOpenChange={setGapDialogOpen}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-create-first-gap">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Gap Analysis
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Meetings Tab */}
          <TabsContent value="meetings" className="space-y-4">
            <div className="flex items-center justify-between">
              <div></div>
              <Dialog open={meetingDialogOpen} onOpenChange={setMeetingDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-new-meeting">
                    <Plus className="w-4 h-4 mr-2" />
                    New Meeting
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-meeting">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      Schedule S&OP Meeting
                    </DialogTitle>
                    <DialogDescription>
                      Create a meeting, invite team members, and send notifications
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...meetingForm}>
                    <form onSubmit={meetingForm.handleSubmit((data) => createMeetingMutation.mutate(data))} className="space-y-6">
                      
                      {/* Meeting Details Section */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Meeting Details</h4>
                        
                        <FormField
                          control={meetingForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Meeting Title</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Q1 S&OP Planning Session" {...field} value={field.value || ""} data-testid="input-meeting-title" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={meetingForm.control}
                            name="meetingDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Date</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} data-testid="input-meeting-date" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={meetingForm.control}
                            name="meetingTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Time</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} value={field.value || ""} data-testid="input-meeting-time" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={meetingForm.control}
                          name="meetingType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Meeting Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-meeting-type">
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="monthly_sop">Monthly S&OP</SelectItem>
                                  <SelectItem value="demand_review">Demand Review</SelectItem>
                                  <SelectItem value="supply_review">Supply Review</SelectItem>
                                  <SelectItem value="financial_review">Financial Review</SelectItem>
                                  <SelectItem value="executive_review">Executive Review</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={meetingForm.control}
                          name="agenda"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Agenda (optional)</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="1. Review demand forecast&#10;2. Supply capacity update&#10;3. Inventory position&#10;4. Action items review" 
                                  {...field} 
                                  value={field.value || ""} 
                                  className="min-h-[80px]"
                                  data-testid="textarea-meeting-agenda" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <Separator />
                      
                      {/* Attendees Section */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Attendees
                        </h4>
                        
                        {/* Team Members */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Team Members</label>
                          {teamMembers && teamMembers.length > 0 ? (
                            <ScrollArea className="h-[120px] rounded-md border p-2">
                              <div className="space-y-2">
                                {teamMembers.map((member) => (
                                  <div 
                                    key={member.id} 
                                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                                    onClick={() => toggleAttendee(member.id)}
                                    data-testid={`checkbox-attendee-${member.id}`}
                                  >
                                    <Checkbox 
                                      checked={selectedAttendees.includes(member.id)}
                                      onCheckedChange={() => toggleAttendee(member.id)}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{member.firstName} {member.lastName}</p>
                                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                                    </div>
                                    <Badge variant="outline" className="text-xs shrink-0">{member.role}</Badge>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          ) : (
                            <p className="text-sm text-muted-foreground">No team members found. Invite people to your company first.</p>
                          )}
                          {selectedAttendees.length > 0 && (
                            <p className="text-xs text-muted-foreground">{selectedAttendees.length} team member(s) selected</p>
                          )}
                        </div>
                        
                        {/* External Email Invites */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium flex items-center gap-2">
                            <UserPlus className="h-4 w-4" />
                            Invite External Guests
                          </label>
                          <div className="flex gap-2">
                            <Input
                              type="email"
                              placeholder="guest@example.com"
                              value={newExternalEmail}
                              onChange={(e) => setNewExternalEmail(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addExternalEmail();
                                }
                              }}
                              data-testid="input-external-email"
                            />
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={addExternalEmail}
                              data-testid="button-add-external-email"
                            >
                              Add
                            </Button>
                          </div>
                          {externalEmails.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {externalEmails.map((email) => (
                                <Badge key={email} variant="secondary" className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {email}
                                  <button
                                    type="button"
                                    onClick={() => removeExternalEmail(email)}
                                    className="ml-1 hover:text-destructive"
                                    data-testid={`button-remove-email-${email}`}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Separator />
                      
                      {/* Notification Options */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                          <Bell className="h-4 w-4" />
                          Notifications
                        </h4>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex items-center gap-3">
                              <Mail className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">Email Invitations</p>
                                <p className="text-xs text-muted-foreground">Send calendar invite via email to all attendees</p>
                              </div>
                            </div>
                            <Checkbox
                              checked={sendEmailInvites}
                              onCheckedChange={(checked) => setSendEmailInvites(checked as boolean)}
                              data-testid="checkbox-send-email"
                            />
                          </div>
                          
                          <div className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex items-center gap-3">
                              <Bell className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">In-App Alerts</p>
                                <p className="text-xs text-muted-foreground">Notify team members within the platform</p>
                              </div>
                            </div>
                            <Checkbox
                              checked={sendInAppAlerts}
                              onCheckedChange={(checked) => setSendInAppAlerts(checked as boolean)}
                              data-testid="checkbox-send-alert"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      {/* Additional Info */}
                      <div className="space-y-4">
                        <FormField
                          control={meetingForm.control}
                          name="keyDecisions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pre-Meeting Notes (optional)</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Any notes or context for attendees..." 
                                  {...field} 
                                  value={field.value || ""} 
                                  data-testid="textarea-meeting-notes" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={meetingForm.control}
                          name="nextMeetingDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Schedule Recurring Meeting (optional)</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} value={field.value || ""} data-testid="input-next-meeting-date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {/* Summary */}
                      {(selectedAttendees.length > 0 || externalEmails.length > 0) && (
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-sm">
                            <span className="font-medium">Ready to send:</span>{" "}
                            {selectedAttendees.length + externalEmails.length} invitation(s)
                            {sendEmailInvites && " via email"}
                            {sendEmailInvites && sendInAppAlerts && " and"}
                            {sendInAppAlerts && " as in-app alerts"}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex gap-3 pt-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => {
                            setMeetingDialogOpen(false);
                            resetMeetingForm();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          className="flex-1"
                          disabled={createMeetingMutation.isPending} 
                          data-testid="button-submit-meeting"
                        >
                          {createMeetingMutation.isPending ? "Scheduling..." : "Schedule Meeting"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
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
                                {meeting.title || safeFormatDate(meeting.scheduledStart, "MMMM d, yyyy", "S&OP Meeting")}
                              </CardTitle>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" data-testid={`badge-meeting-type-${meeting.id}`}>
                                  {meeting.meetingType}
                                </Badge>
                                {meeting.scheduledStart && (
                                  <span className="text-sm text-muted-foreground" data-testid={`text-meeting-start-${meeting.id}`}>
                                    <Clock className="inline w-3 h-3 mr-1" />
                                    {safeFormatDate(meeting.scheduledStart, "MMM d, yyyy 'at' h:mm a")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        {(meeting.notes || (meeting as any).decisions) && (
                          <CardContent>
                            {meeting.notes && (
                              <>
                                <h4 className="text-sm font-semibold mb-2">Notes:</h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-3" data-testid={`text-meeting-notes-${meeting.id}`}>
                                  {meeting.notes}
                                </p>
                              </>
                            )}
                            {(meeting as any).decisions && Array.isArray((meeting as any).decisions) && (meeting as any).decisions.length > 0 && (
                              <>
                                <h4 className="text-sm font-semibold mb-2">Decisions:</h4>
                                <ul className="text-sm text-muted-foreground list-disc list-inside" data-testid={`text-meeting-decisions-${meeting.id}`}>
                                  {(meeting as any).decisions.map((d: any, i: number) => (
                                    <li key={i}>{d.decision || d.text || JSON.stringify(d)}</li>
                                  ))}
                                </ul>
                              </>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12" data-testid="empty-state-meetings">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No meeting notes yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Document your first S&OP meeting to track decisions and follow-ups
                    </p>
                    <Dialog open={meetingDialogOpen} onOpenChange={setMeetingDialogOpen}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-create-first-meeting">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Meeting Notes
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Action Items Tab */}
          <TabsContent value="actions" className="space-y-4">
            <div className="flex items-center justify-between">
              <div></div>
              <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-new-action">
                    <Plus className="w-4 h-4 mr-2" />
                    New Action Item
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="dialog-create-action">
                  <DialogHeader>
                    <DialogTitle>Create Action Item</DialogTitle>
                    <DialogDescription>
                      Track follow-up actions from meetings and gap analyses
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...actionForm}>
                    <form onSubmit={actionForm.handleSubmit((data) => createActionMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={actionForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Increase raw material inventory..." {...field} data-testid="input-action-title" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={actionForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-action-category">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="demand_planning">Demand Planning</SelectItem>
                                <SelectItem value="supply_planning">Supply Planning</SelectItem>
                                <SelectItem value="capacity_planning">Capacity Planning</SelectItem>
                                <SelectItem value="inventory_management">Inventory Management</SelectItem>
                                <SelectItem value="financial_planning">Financial Planning</SelectItem>
                                <SelectItem value="risk_mitigation">Risk Mitigation</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={actionForm.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-action-priority">
                                  <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="critical">Critical</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={actionForm.control}
                        name="dueDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Due Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} data-testid="input-action-due-date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={actionForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Detailed description of the action..." {...field} value={field.value || ""} data-testid="textarea-action-description" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={createActionMutation.isPending} data-testid="button-submit-action">
                        {createActionMutation.isPending ? "Creating..." : "Create Action Item"}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
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
                    <p className="text-sm text-muted-foreground mb-4">
                      Create action items to track follow-ups from meetings and gap analyses
                    </p>
                    <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-create-first-action">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Action Item
                        </Button>
                      </DialogTrigger>
                    </Dialog>
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
