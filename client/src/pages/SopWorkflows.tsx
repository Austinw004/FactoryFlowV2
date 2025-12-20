import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { formatRegimeName } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  CalendarDays,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  Users,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Package,
  Target,
  ArrowRight,
  ChevronRight,
  Activity,
  GitMerge,
  FileCheck,
  Pause,
  XCircle,
  LayoutDashboard,
  Settings,
  Calendar,
  Scale,
} from "lucide-react";
import { format } from "date-fns";

interface SopDashboard {
  meetings: {
    upcoming: number;
    inProgress: number;
    thisWeek: number;
    nextMeeting: any | null;
  };
  reconciliation: {
    openItems: number;
    criticalGaps: number;
    byPriority: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  approvals: {
    pending: number;
    urgent: number;
  };
  regime: {
    current: string;
    fdr: number;
  };
}

interface SopMeetingTemplate {
  id: string;
  meetingType: string;
  name: string;
  description?: string;
  defaultDurationMinutes: number;
  defaultAgenda?: string[];
  requiredRoles?: string[];
  isActive: number;
}

interface SopMeeting {
  id: string;
  templateId?: string;
  meetingType: string;
  title: string;
  description?: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  status: string;
  organizerId: string;
  agenda?: string[];
  notes?: string;
  decisions?: string[];
  actionItems?: any[];
  regimeAtMeeting?: string;
  fdrAtMeeting?: number;
}

interface SopReconciliationItem {
  id: string;
  itemType: string;
  itemId: string;
  itemName: string;
  periodStart: string;
  periodEnd: string;
  demandQuantity: number;
  supplyQuantity: number;
  gapQuantity: number;
  gapPercentage: number;
  resolution?: string;
  resolutionNotes?: string;
  status: string;
  priority: string;
  regime?: string;
  fdrValue?: number;
}

interface SopApprovalRequest {
  id: string;
  chainId: string;
  entityType: string;
  entityId: string;
  title: string;
  description?: string;
  amount?: number;
  status: string;
  priority: string;
  currentStepOrder?: number;
}

const MEETING_TYPES: Record<string, { label: string; icon: any; color: string }> = {
  demand_review: { label: "Demand Review", icon: TrendingUp, color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" },
  supply_review: { label: "Supply Review", icon: Package, color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
  pre_sop: { label: "Pre-S&OP", icon: GitMerge, color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100" },
  executive_sop: { label: "Executive S&OP", icon: Users, color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100" },
  financial_integration: { label: "Financial Integration", icon: DollarSign, color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100" },
  new_product_review: { label: "New Product Review", icon: Target, color: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-100" },
};

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  scheduled: { label: "Scheduled", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "default" },
  completed: { label: "Completed", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  open: { label: "Open", variant: "secondary" },
  resolved: { label: "Resolved", variant: "outline" },
  pending: { label: "Pending", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  low: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100",
};

const REGIME_COLORS: Record<string, string> = {
  balanced: "bg-gray-600",
  HEALTHY_EXPANSION: "bg-green-600",
  ASSET_LED_GROWTH: "bg-yellow-600",
  IMBALANCED_EXCESS: "bg-red-600",
  REAL_ECONOMY_LEAD: "bg-blue-600",
};

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function DashboardCards({ dashboard }: { dashboard: SopDashboard }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-sm font-medium">Upcoming Meetings</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-upcoming-meetings">{dashboard.meetings.upcoming}</div>
          <p className="text-xs text-muted-foreground">
            {dashboard.meetings.thisWeek} this week
          </p>
          {dashboard.meetings.inProgress > 0 && (
            <Badge variant="default" className="mt-2" data-testid="badge-in-progress">
              {dashboard.meetings.inProgress} in progress
            </Badge>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-sm font-medium">Demand/Supply Gaps</CardTitle>
          <Scale className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-open-gaps">{dashboard.reconciliation.openItems}</div>
          {dashboard.reconciliation.criticalGaps > 0 && (
            <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <AlertCircle className="h-3 w-3" />
              <span className="text-xs">{dashboard.reconciliation.criticalGaps} critical</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
          <FileCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-pending-approvals">{dashboard.approvals.pending}</div>
          {dashboard.approvals.urgent > 0 && (
            <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
              <AlertCircle className="h-3 w-3" />
              <span className="text-xs">{dashboard.approvals.urgent} urgent</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-sm font-medium">Economic Regime</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${REGIME_COLORS[dashboard.regime.current] || 'bg-gray-600'}`} />
            <span className="text-sm font-medium" data-testid="text-current-regime">
              {formatRegimeName(dashboard.regime.current)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            FDR: {dashboard.regime.fdr.toFixed(2)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function CreateMeetingDialog({ 
  open, 
  onOpenChange, 
  templates 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  templates: SopMeetingTemplate[];
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingType, setMeetingType] = useState("demand_review");
  
  // Calculate default start time (next business day at 10 AM local time)
  const getDefaultStartTime = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    // Format as local datetime string for datetime-local input (YYYY-MM-DDTHH:MM)
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    const hours = String(tomorrow.getHours()).padStart(2, '0');
    const minutes = String(tomorrow.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  
  const [scheduledStart, setScheduledStart] = useState(getDefaultStartTime);
  const [duration, setDuration] = useState(60);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/sop/meetings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sop/meetings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sop/dashboard"] });
      toast({
        title: "Meeting Created",
        description: "Your S&OP meeting has been scheduled.",
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create meeting",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setMeetingType("demand_review");
    setScheduledStart(getDefaultStartTime());
    setDuration(60);
  };

  const handleSubmit = () => {
    if (!title.trim() || !scheduledStart) {
      toast({
        title: "Validation Error",
        description: "Please provide a title and scheduled start time",
        variant: "destructive",
      });
      return;
    }

    const startDate = new Date(scheduledStart);
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

    createMutation.mutate({
      title,
      description,
      meetingType,
      scheduledStart: startDate.toISOString(),
      scheduledEnd: endDate.toISOString(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Schedule S&OP Meeting</DialogTitle>
          <DialogDescription>
            Create a new cross-functional planning meeting
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="meetingType">Meeting Type</Label>
            <Select value={meetingType} onValueChange={setMeetingType}>
              <SelectTrigger data-testid="select-meeting-type">
                <SelectValue placeholder="Select meeting type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MEETING_TYPES).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Meeting Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Q1 Demand Review Meeting"
              data-testid="input-meeting-title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Meeting objectives and key discussion points"
              data-testid="input-meeting-description"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduledStart">Start Date & Time</Label>
              <Input
                id="scheduledStart"
                type="datetime-local"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
                data-testid="input-meeting-start"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                min={15}
                max={480}
                data-testid="input-meeting-duration"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={createMutation.isPending}
            data-testid="button-create-meeting-submit"
          >
            {createMutation.isPending ? "Creating..." : "Schedule Meeting"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MeetingCard({ meeting, onStart, onEnd }: { 
  meeting: SopMeeting; 
  onStart: () => void;
  onEnd: () => void;
}) {
  const typeInfo = MEETING_TYPES[meeting.meetingType] || MEETING_TYPES.demand_review;
  const Icon = typeInfo.icon;
  const statusInfo = STATUS_BADGES[meeting.status] || STATUS_BADGES.scheduled;

  return (
    <Card className="hover-elevate" data-testid={`card-meeting-${meeting.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${typeInfo.color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">{meeting.title}</CardTitle>
              <CardDescription>{typeInfo.label}</CardDescription>
            </div>
          </div>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            {format(new Date(meeting.scheduledStart), "MMM d, yyyy h:mm a")}
          </span>
        </div>
        {meeting.regimeAtMeeting && (
          <div className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Regime:</span>
            <Badge variant="outline" className="font-mono text-xs">
              {formatRegimeName(meeting.regimeAtMeeting)}
            </Badge>
          </div>
        )}
        {meeting.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {meeting.description}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          {meeting.status === "scheduled" && (
            <Button size="sm" onClick={onStart} data-testid={`button-start-meeting-${meeting.id}`}>
              <Play className="h-4 w-4 mr-1" />
              Start Meeting
            </Button>
          )}
          {meeting.status === "in_progress" && (
            <Button size="sm" variant="secondary" onClick={onEnd} data-testid={`button-end-meeting-${meeting.id}`}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              End Meeting
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MeetingsTab() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  const { data: meetings = [], isLoading } = useQuery<SopMeeting[]>({
    queryKey: ["/api/sop/meetings"],
  });

  const { data: templates = [] } = useQuery<SopMeetingTemplate[]>({
    queryKey: ["/api/sop/templates"],
  });

  const startMutation = useMutation({
    mutationFn: async (meetingId: string) => {
      return apiRequest("POST", `/api/sop/meetings/${meetingId}/start`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sop/meetings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sop/dashboard"] });
      toast({
        title: "Meeting Started",
        description: "The meeting is now in progress.",
      });
    },
  });

  const endMutation = useMutation({
    mutationFn: async (meetingId: string) => {
      return apiRequest("POST", `/api/sop/meetings/${meetingId}/end`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sop/meetings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sop/dashboard"] });
      toast({
        title: "Meeting Completed",
        description: "The meeting has been marked as completed.",
      });
    },
  });

  const scheduledMeetings = meetings.filter(m => m.status === "scheduled");
  const inProgressMeetings = meetings.filter(m => m.status === "in_progress");
  const completedMeetings = meetings.filter(m => m.status === "completed");

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">S&OP Meetings</h3>
          <p className="text-sm text-muted-foreground">
            Schedule and manage cross-functional planning meetings
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} data-testid="button-schedule-meeting">
          <Plus className="h-4 w-4 mr-2" />
          Schedule Meeting
        </Button>
      </div>

      {inProgressMeetings.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-2">
            <Play className="h-4 w-4" />
            In Progress
          </h4>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {inProgressMeetings.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                onStart={() => startMutation.mutate(meeting.id)}
                onEnd={() => endMutation.mutate(meeting.id)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Scheduled ({scheduledMeetings.length})
        </h4>
        {scheduledMeetings.length === 0 ? (
          <Card className="p-8 text-center">
            <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Upcoming Meetings</h3>
            <p className="text-muted-foreground mb-4">
              Schedule your first S&OP meeting to align demand, supply, and financial plans.
            </p>
            <Button onClick={() => setShowCreateDialog(true)} data-testid="button-schedule-first-meeting">
              <Plus className="h-4 w-4 mr-2" />
              Schedule Meeting
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {scheduledMeetings.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                onStart={() => startMutation.mutate(meeting.id)}
                onEnd={() => endMutation.mutate(meeting.id)}
              />
            ))}
          </div>
        )}
      </div>

      {completedMeetings.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Completed ({completedMeetings.length})
          </h4>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completedMeetings.slice(0, 6).map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                onStart={() => startMutation.mutate(meeting.id)}
                onEnd={() => endMutation.mutate(meeting.id)}
              />
            ))}
          </div>
        </div>
      )}

      <CreateMeetingDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        templates={templates}
      />
    </div>
  );
}

function ReconciliationItemCard({ item }: { item: SopReconciliationItem }) {
  const statusInfo = STATUS_BADGES[item.status] || STATUS_BADGES.open;
  const gapIsNegative = item.gapQuantity > 0;

  return (
    <Card className="hover-elevate" data-testid={`card-reconciliation-${item.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{item.itemName}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={PRIORITY_COLORS[item.priority]}>{item.priority}</Badge>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
        </div>
        <CardDescription className="capitalize">{item.itemType}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Demand</span>
            <div className="font-medium">{item.demandQuantity.toLocaleString()}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Supply</span>
            <div className="font-medium">{item.supplyQuantity.toLocaleString()}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Gap</span>
            <div className={`font-medium ${gapIsNegative ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {gapIsNegative ? '-' : '+'}{Math.abs(item.gapQuantity).toLocaleString()}
            </div>
          </div>
        </div>
        <Progress 
          value={Math.min(100, (item.supplyQuantity / item.demandQuantity) * 100)} 
          className="h-2"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Supply covers {((item.supplyQuantity / item.demandQuantity) * 100).toFixed(1)}% of demand</span>
          <span>{item.gapPercentage.toFixed(1)}% gap</span>
        </div>
        {item.regime && (
          <div className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline" className="font-mono text-xs">
              {formatRegimeName(item.regime)}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReconciliationTab() {
  const { toast } = useToast();

  const { data: items = [], isLoading } = useQuery<SopReconciliationItem[]>({
    queryKey: ["/api/sop/reconciliation"],
  });

  const detectGapsMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const periodStart = now.toISOString();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      return apiRequest("POST", "/api/sop/reconciliation/detect-gaps", {
        periodStart,
        periodEnd,
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sop/reconciliation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sop/dashboard"] });
      toast({
        title: "Gap Detection Complete",
        description: `Detected ${data.detected} demand/supply gaps.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to detect gaps",
        variant: "destructive",
      });
    },
  });

  const openItems = items.filter(i => i.status === "open");
  const resolvedItems = items.filter(i => i.status === "resolved");
  
  const criticalItems = openItems.filter(i => i.priority === "critical");
  const highItems = openItems.filter(i => i.priority === "high");

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Demand/Supply Reconciliation</h3>
          <p className="text-sm text-muted-foreground">
            Identify and resolve gaps between demand forecasts and supply capacity
          </p>
        </div>
        <Button 
          onClick={() => detectGapsMutation.mutate()} 
          disabled={detectGapsMutation.isPending}
          data-testid="button-detect-gaps"
        >
          <Target className="h-4 w-4 mr-2" />
          {detectGapsMutation.isPending ? "Detecting..." : "Detect Gaps"}
        </Button>
      </div>

      {openItems.length === 0 ? (
        <Card className="p-8 text-center">
          <Scale className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Open Gaps</h3>
          <p className="text-muted-foreground mb-4">
            Run gap detection to identify mismatches between demand forecasts and supply availability.
          </p>
          <Button 
            onClick={() => detectGapsMutation.mutate()} 
            disabled={detectGapsMutation.isPending}
            data-testid="button-detect-first-gaps"
          >
            <Target className="h-4 w-4 mr-2" />
            Detect Gaps
          </Button>
        </Card>
      ) : (
        <>
          {(criticalItems.length > 0 || highItems.length > 0) && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Critical & High Priority ({criticalItems.length + highItems.length})
              </h4>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...criticalItems, ...highItems].map((item) => (
                  <ReconciliationItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Scale className="h-4 w-4" />
              All Open Items ({openItems.length})
            </h4>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {openItems.map((item) => (
                <ReconciliationItemCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </>
      )}

      {resolvedItems.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Resolved ({resolvedItems.length})
          </h4>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {resolvedItems.slice(0, 6).map((item) => (
              <ReconciliationItemCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ApprovalRequestCard({ request }: { request: SopApprovalRequest }) {
  const { toast } = useToast();
  const statusInfo = STATUS_BADGES[request.status] || STATUS_BADGES.pending;

  const actionMutation = useMutation({
    mutationFn: async ({ action, comments }: { action: string; comments?: string }) => {
      return apiRequest("POST", `/api/sop/approvals/${request.id}/action`, { action, comments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sop/approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sop/dashboard"] });
      toast({
        title: "Action Completed",
        description: "The approval request has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process action",
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="hover-elevate" data-testid={`card-approval-${request.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{request.title}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={PRIORITY_COLORS[request.priority]}>{request.priority}</Badge>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
        </div>
        <CardDescription className="capitalize">{request.entityType.replace(/_/g, ' ')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {request.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {request.description}
          </p>
        )}
        {request.amount && (
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">${request.amount.toLocaleString()}</span>
          </div>
        )}
        {request.currentStepOrder && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowRight className="h-4 w-4" />
            <span>Step {request.currentStepOrder} in approval chain</span>
          </div>
        )}
        {request.status === "pending" && (
          <div className="flex justify-end gap-2 pt-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => actionMutation.mutate({ action: "rejected", comments: "Rejected" })}
              disabled={actionMutation.isPending}
              data-testid={`button-reject-${request.id}`}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
            <Button 
              size="sm"
              onClick={() => actionMutation.mutate({ action: "approved" })}
              disabled={actionMutation.isPending}
              data-testid={`button-approve-${request.id}`}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Approve
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ApprovalsTab() {
  const { data: requests = [], isLoading } = useQuery<SopApprovalRequest[]>({
    queryKey: ["/api/sop/approvals"],
  });

  const pendingRequests = requests.filter(r => r.status === "pending");
  const completedRequests = requests.filter(r => r.status === "approved" || r.status === "rejected");

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Approval Workflows</h3>
        <p className="text-sm text-muted-foreground">
          Review and approve procurement decisions aligned with S&OP plans
        </p>
      </div>

      {pendingRequests.length === 0 ? (
        <Card className="p-8 text-center">
          <FileCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Pending Approvals</h3>
          <p className="text-muted-foreground">
            Approval requests will appear here when procurement decisions require sign-off.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-orange-600 dark:text-orange-400 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Approval ({pendingRequests.length})
          </h4>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingRequests.map((request) => (
              <ApprovalRequestCard key={request.id} request={request} />
            ))}
          </div>
        </div>
      )}

      {completedRequests.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Completed ({completedRequests.length})
          </h4>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completedRequests.slice(0, 6).map((request) => (
              <ApprovalRequestCard key={request.id} request={request} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SopWorkflows() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const { data: dashboard, isLoading: isDashboardLoading } = useQuery<SopDashboard>({
    queryKey: ["/api/sop/dashboard"],
  });

  if (isDashboardLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
            S&OP Workflows
          </h1>
          <p className="text-muted-foreground">
            Collaborative Sales & Operations Planning with regime-aware decision support
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="meetings" data-testid="tab-meetings">
            <CalendarDays className="h-4 w-4 mr-2" />
            Meetings
          </TabsTrigger>
          <TabsTrigger value="reconciliation" data-testid="tab-reconciliation">
            <Scale className="h-4 w-4 mr-2" />
            Reconciliation
          </TabsTrigger>
          <TabsTrigger value="approvals" data-testid="tab-approvals">
            <FileCheck className="h-4 w-4 mr-2" />
            Approvals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {dashboard && <DashboardCards dashboard={dashboard} />}
          
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Next Meeting</CardTitle>
                <CardDescription>Upcoming S&OP meeting</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboard?.meetings.nextMeeting ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${MEETING_TYPES[dashboard.meetings.nextMeeting.meetingType]?.color || 'bg-gray-100'}`}>
                        {(() => {
                          const Icon = MEETING_TYPES[dashboard.meetings.nextMeeting.meetingType]?.icon || CalendarDays;
                          return <Icon className="h-4 w-4" />;
                        })()}
                      </div>
                      <div>
                        <div className="font-medium">{dashboard.meetings.nextMeeting.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(dashboard.meetings.nextMeeting.scheduledStart), "MMM d, yyyy h:mm a")}
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setActiveTab("meetings")}
                      data-testid="button-view-meetings"
                    >
                      View All Meetings
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No upcoming meetings scheduled</p>
                    <Button 
                      variant="ghost" 
                      onClick={() => setActiveTab("meetings")}
                      data-testid="button-schedule-from-dashboard"
                    >
                      Schedule a meeting
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Gap Summary</CardTitle>
                <CardDescription>Demand vs supply reconciliation status</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboard && dashboard.reconciliation.openItems > 0 ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950">
                        <div className="font-medium text-red-600 dark:text-red-400">Critical</div>
                        <div className="text-2xl font-bold">{dashboard.reconciliation.byPriority.critical}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950">
                        <div className="font-medium text-orange-600 dark:text-orange-400">High</div>
                        <div className="text-2xl font-bold">{dashboard.reconciliation.byPriority.high}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950">
                        <div className="font-medium text-yellow-600 dark:text-yellow-400">Medium</div>
                        <div className="text-2xl font-bold">{dashboard.reconciliation.byPriority.medium}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                        <div className="font-medium text-gray-600 dark:text-gray-400">Low</div>
                        <div className="text-2xl font-bold">{dashboard.reconciliation.byPriority.low}</div>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setActiveTab("reconciliation")}
                      data-testid="button-view-reconciliation"
                    >
                      View Reconciliation
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Scale className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No open gaps detected</p>
                    <Button 
                      variant="ghost" 
                      onClick={() => setActiveTab("reconciliation")}
                      data-testid="button-detect-gaps-dashboard"
                    >
                      Run gap detection
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="meetings">
          <MeetingsTab />
        </TabsContent>

        <TabsContent value="reconciliation">
          <ReconciliationTab />
        </TabsContent>

        <TabsContent value="approvals">
          <ApprovalsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
