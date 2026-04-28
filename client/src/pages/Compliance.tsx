import { getSeverityBadge } from "@/components/SeverityBadge";
import { getRegimeBadge } from "@/components/RegimeBadge";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  FileText, 
  Upload, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Shield,
  TrendingUp,
  Download,
  Eye,
  AlertTriangle,
  ClipboardList,
  GraduationCap,
  Target,
  Users,
  RefreshCw,
  Plus,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, differenceInDays } from "date-fns";

export default function Compliance() {
  const { toast } = useToast();
  const [openDocDialog, setOpenDocDialog] = useState(false);
  const [openAuditDialog, setOpenAuditDialog] = useState(false);
  const [openFindingDialog, setOpenFindingDialog] = useState(false);
  const [openTrainingDialog, setOpenTrainingDialog] = useState(false);
  
  // Controlled state for Select components in Document dialog
  const [docType, setDocType] = useState("");
  const [docRegType, setDocRegType] = useState("quality");
  
  // Controlled state for Select components in Audit dialog
  const [auditType, setAuditType] = useState("");
  
  // Controlled state for Select components in Finding dialog
  const [findingSeverity, setFindingSeverity] = useState("");
  const [findingCategory, setFindingCategory] = useState("");
  
  // Controlled state for Select components in Training dialog
  const [trainingType, setTrainingType] = useState("");

  // Fetch compliance documents
  const { data: documents = [], isLoading: docsLoading } = useQuery<any[]>({
    queryKey: ["/api/compliance/documents"],
  });

  // Fetch compliance audits
  const { data: audits = [], isLoading: auditsLoading } = useQuery<any[]>({
    queryKey: ["/api/compliance/audits"],
  });

  // Fetch current regime
  const { data: regime } = useQuery<{ fdr: number; regime: string }>({
    queryKey: ["/api/economics/regime"],
  });

  // Fetch compliance score
  const { data: complianceScore, isLoading: scoreLoading, refetch: refetchScore } = useQuery<{
    score: number;
    breakdown: { documentation: number; audits: number; training: number; findings: number };
    alerts: { 
      expiringDocs: number; 
      expiringDocuments: number;
      overdueAudits: number; 
      upcomingDeadlines: number;
      criticalFindings: number;
      openFindings: number;
      expiredTraining: number;
    };
    expiringDocuments: any[];
  }>({
    queryKey: ["/api/compliance/score"],
  });

  // Fetch audit findings
  const { data: findings = [], isLoading: findingsLoading } = useQuery<any[]>({
    queryKey: ["/api/compliance/findings"],
  });

  // Fetch calendar events
  const { data: calendarEvents = [], isLoading: calendarLoading } = useQuery<any[]>({
    queryKey: ["/api/compliance/calendar"],
  });

  // Fetch checklist templates
  const { data: checklists = [], isLoading: checklistsLoading } = useQuery<any[]>({
    queryKey: ["/api/compliance/checklists"],
  });

  // Fetch training records
  const { data: trainingRecords = [], isLoading: trainingLoading } = useQuery<any[]>({
    queryKey: ["/api/compliance/training"],
  });

  // Create document mutation
  const createDocMutation = useMutation({
    mutationFn: async (data: any) => 
      apiRequest("POST", "/api/compliance/documents", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/compliance/score"] });
      toast({ title: "Document created successfully" });
      setOpenDocDialog(false);
    },
    onError: () => {
      toast({ title: "Failed to create document", variant: "destructive" });
    },
  });

  // Create audit mutation
  const createAuditMutation = useMutation({
    mutationFn: async (data: any) => 
      apiRequest("POST", "/api/compliance/audits", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance/audits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/compliance/score"] });
      toast({ title: "Audit scheduled successfully" });
      setOpenAuditDialog(false);
    },
    onError: () => {
      toast({ title: "Failed to schedule audit", variant: "destructive" });
    },
  });

  // Create finding mutation
  const createFindingMutation = useMutation({
    mutationFn: async (data: any) => 
      apiRequest("POST", "/api/compliance/findings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance/findings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/compliance/score"] });
      toast({ title: "Finding logged successfully" });
      setOpenFindingDialog(false);
    },
    onError: () => {
      toast({ title: "Failed to log finding", variant: "destructive" });
    },
  });

  // Create training record mutation
  const createTrainingMutation = useMutation({
    mutationFn: async (data: any) => 
      apiRequest("POST", "/api/compliance/training", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance/training"] });
      queryClient.invalidateQueries({ queryKey: ["/api/compliance/score"] });
      toast({ title: "Training record created successfully" });
      setOpenTrainingDialog(false);
    },
    onError: () => {
      toast({ title: "Failed to create training record", variant: "destructive" });
    },
  });

  // Seed calendar defaults
  const seedCalendarMutation = useMutation({
    mutationFn: async () => 
      apiRequest("POST", "/api/compliance/calendar/seed-defaults"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance/calendar"] });
      toast({ title: "Manufacturing compliance deadlines added" });
    },
    onError: () => {
      toast({ title: "Failed to seed calendar", variant: "destructive" });
    },
  });

  // Seed checklist templates
  const seedChecklistsMutation = useMutation({
    mutationFn: async () => 
      apiRequest("POST", "/api/compliance/checklists/seed-system"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance/checklists"] });
      toast({ title: "Audit checklist templates added" });
    },
    onError: () => {
      toast({ title: "Failed to seed checklists", variant: "destructive" });
    },
  });

  const handleCreateDocument = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (!docType) {
      toast({ title: "Please select a document type", variant: "destructive" });
      return;
    }
    createDocMutation.mutate({
      title: formData.get("title"),
      documentType: docType,
      regulationType: docRegType,
      description: formData.get("description"),
      version: parseInt(formData.get("version") as string) || 1,
      status: "draft",
      fileUrl: formData.get("fileUrl") || null,
      expirationDate: formData.get("expirationDate") || null,
    });
    setDocType("");
    setDocRegType("quality");
  };

  const handleScheduleAudit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (!auditType) {
      toast({ title: "Please select an audit type", variant: "destructive" });
      return;
    }
    createAuditMutation.mutate({
      auditName: formData.get("auditName"),
      auditType: auditType,
      scheduledDate: formData.get("scheduledDate"),
      auditor: formData.get("auditor"),
      scope: formData.get("scope"),
      status: "scheduled",
      fdrAtAudit: regime?.fdr || 0,
      regimeAtAudit: regime?.regime || "UNKNOWN",
    });
    setAuditType("");
  };

  const handleCreateFinding = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (!findingSeverity || !findingCategory) {
      toast({ title: "Please select severity and category", variant: "destructive" });
      return;
    }
    createFindingMutation.mutate({
      findingNumber: `F-${Date.now().toString(36).toUpperCase()}`,
      title: formData.get("title"),
      description: formData.get("description"),
      severity: findingSeverity,
      category: findingCategory,
      assignedToName: formData.get("assignedTo"),
      dueDate: formData.get("dueDate") || null,
      status: "open",
    });
    setFindingSeverity("");
    setFindingCategory("");
  };

  const handleCreateTraining = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (!trainingType) {
      toast({ title: "Please select a training type", variant: "destructive" });
      return;
    }
    createTrainingMutation.mutate({
      employeeName: formData.get("employeeName"),
      trainingType: trainingType,
      trainingName: formData.get("trainingName"),
      provider: formData.get("provider"),
      hoursRequired: parseFloat(formData.get("hoursRequired") as string) || null,
      expirationDate: formData.get("expirationDate") || null,
      status: "not_started",
    });
    setTrainingType("");
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "secondary" | "default" | "destructive" | "outline", label: string, className?: string }> = {
      draft: { variant: "secondary", label: "Draft" },
      under_review: { variant: "default", label: "Under Review" },
      approved: { variant: "default", label: "Approved", className: "bg-green-600" },
      active: { variant: "default", label: "Active", className: "bg-green-600" },
      rejected: { variant: "destructive", label: "Rejected" },
      archived: { variant: "outline", label: "Archived" },
      expired: { variant: "destructive", label: "Expired" },
      scheduled: { variant: "default", label: "Scheduled", className: "bg-blue-600" },
      in_progress: { variant: "default", label: "In Progress", className: "bg-yellow-600" },
      completed: { variant: "default", label: "Completed", className: "bg-green-600" },
      failed: { variant: "destructive", label: "Failed" },
      open: { variant: "destructive", label: "Open" },
      resolved: { variant: "default", label: "Resolved", className: "bg-green-600" },
      closed: { variant: "outline", label: "Closed" },
      overdue: { variant: "destructive", label: "Overdue" },
      not_started: { variant: "secondary", label: "Not Started" },
      upcoming: { variant: "default", label: "Upcoming", className: "bg-blue-600" },
    };
    const config = statusConfig[status] || statusConfig.draft;
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  // Severity badge logic moved to @/components/SeverityBadge — supports
  // both the critical/high/medium/low and critical/major/minor/observation
  // schemes via shared palette tones.

  // Regime badge logic moved to @/components/RegimeBadge — single source
  // of truth across the app, palette-aligned.

  // Score-color now uses palette tokens (good / signal / bad) instead of
  // the rainbow text-green-600 / text-yellow-600 / text-red-600 — keeps
  // the same red/yellow/green semantics the operator expects, but the
  // tones come from the design palette rather than raw Tailwind.
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-good";
    if (score >= 60) return "text-signal";
    return "text-bad";
  };

  const getScoreProgressColor = (score: number) => {
    if (score >= 80) return "bg-green-600";
    if (score >= 60) return "bg-yellow-600";
    return "bg-red-600";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
<p className="text-muted-foreground mt-1">
            Proactive compliance tracking with regime-aware intelligence
          </p>
        </div>
        {regime && (
          <Card className="w-fit">
            <CardContent className="pt-6 px-4 pb-4">
              <div className="text-sm text-muted-foreground">Current Regime</div>
              <div className="mt-1">{getRegimeBadge(regime.regime)}</div>
              <div className="text-2xl font-bold mt-1">FDR: {regime.fdr?.toFixed(2) || "N/A"}</div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Compliance Score Card */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Compliance Health Score
              </span>
              <Button variant="ghost" size="icon" onClick={() => refetchScore()} data-testid="button-refresh-score">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scoreLoading ? (
              <div className="text-muted-foreground">Calculating...</div>
            ) : complianceScore ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className={`text-5xl font-bold ${getScoreColor(complianceScore.score)}`} data-testid="text-compliance-score">
                    {complianceScore.score}%
                  </div>
                  <div className="flex-1">
                    <Progress value={complianceScore.score} className={`h-3 ${getScoreProgressColor(complianceScore.score)}`} />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div className="text-center">
                    <div className="font-semibold">{complianceScore.breakdown?.documentation || 0}%</div>
                    <div className="text-muted-foreground">Documents</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{complianceScore.breakdown?.audits || 0}%</div>
                    <div className="text-muted-foreground">Audits</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{complianceScore.breakdown?.findings || 0}%</div>
                    <div className="text-muted-foreground">Findings</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{complianceScore.breakdown?.training || 0}%</div>
                    <div className="text-muted-foreground">Training</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground" data-testid="empty-compliance-score">
                Compliance score pending — log at least three documents (certifications, inspections, or training records) to unlock your posture score and category breakdown.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expiration Countdown Alert */}
        <Card className={`md:col-span-2 ${(complianceScore?.alerts?.expiringDocuments ?? 0) > 0 ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' : ''}`}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${(complianceScore?.alerts?.expiringDocuments ?? 0) > 0 ? 'text-yellow-600' : 'text-muted-foreground'}`} />
              30-Day Expiration Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scoreLoading ? (
              <div className="text-muted-foreground">Loading...</div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-background">
                    <div className={`text-2xl font-bold ${(complianceScore?.alerts?.expiringDocuments || 0) > 0 ? 'text-yellow-600' : 'text-green-600'}`} data-testid="text-expiring-docs">
                      {complianceScore?.alerts?.expiringDocuments || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Documents Expiring</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-background">
                    <div className={`text-2xl font-bold ${(complianceScore?.alerts?.upcomingDeadlines || 0) > 0 ? 'text-blue-600' : 'text-green-600'}`} data-testid="text-upcoming-deadlines">
                      {complianceScore?.alerts?.upcomingDeadlines || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Upcoming Deadlines</div>
                  </div>
                </div>
                {(complianceScore?.expiringDocuments?.length ?? 0) > 0 && (
                  <div className="text-sm space-y-1">
                    {complianceScore?.expiringDocuments?.slice(0, 3).map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between text-signal">
                        <span className="truncate">{doc.title}</span>
                        <span className="text-xs">
                          {differenceInDays(new Date(doc.expirationDate), new Date())} days
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <AlertCircle className={`h-8 w-8 ${(complianceScore?.alerts?.openFindings || 0) > 0 ? 'text-red-500' : 'text-green-500'}`} />
              <div>
                <div className="text-2xl font-bold" data-testid="text-open-findings">{complianceScore?.alerts?.openFindings || 0}</div>
                <div className="text-sm text-muted-foreground">Open Findings</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <AlertTriangle className={`h-8 w-8 ${(complianceScore?.alerts?.criticalFindings || 0) > 0 ? 'text-red-600' : 'text-green-500'}`} />
              <div>
                <div className="text-2xl font-bold" data-testid="text-critical-findings">{complianceScore?.alerts?.criticalFindings || 0}</div>
                <div className="text-sm text-muted-foreground">Critical Issues</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <GraduationCap className={`h-8 w-8 ${(complianceScore?.alerts?.expiredTraining || 0) > 0 ? 'text-orange-500' : 'text-green-500'}`} />
              <div>
                <div className="text-2xl font-bold" data-testid="text-expired-training">{complianceScore?.alerts?.expiredTraining || 0}</div>
                <div className="text-sm text-muted-foreground">Expired Training</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <CheckCircle2 className="h-8 w-8 text-good" />
              <div>
                <div className="text-2xl font-bold">{documents.filter((d: any) => d.status === "approved" || d.status === "active").length}</div>
                <div className="text-sm text-muted-foreground">Active Documents</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="documents" data-testid="tab-documents">
            <FileText className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="calendar" data-testid="tab-calendar">
            <Calendar className="h-4 w-4 mr-2" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="audits" data-testid="tab-audits">
            <ClipboardList className="h-4 w-4 mr-2" />
            Audits
          </TabsTrigger>
          <TabsTrigger value="findings" data-testid="tab-findings">
            <AlertCircle className="h-4 w-4 mr-2" />
            Findings
          </TabsTrigger>
          <TabsTrigger value="checklists" data-testid="tab-checklists">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Checklists
          </TabsTrigger>
          <TabsTrigger value="training" data-testid="tab-training">
            <GraduationCap className="h-4 w-4 mr-2" />
            Training
          </TabsTrigger>
          <TabsTrigger value="insights" data-testid="tab-insights">
            <TrendingUp className="h-4 w-4 mr-2" />
            Insights
          </TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-xl font-semibold">Compliance Documents</h2>
            <Dialog open={openDocDialog} onOpenChange={setOpenDocDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-document">
                  <Upload className="h-4 w-4 mr-2" />
                  Add Document
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Compliance Document</DialogTitle>
                  <DialogDescription>
                    Add a new document to your compliance repository
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateDocument}>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="title">Document Title</Label>
                      <Input id="title" name="title" placeholder="ISO 9001 Quality Manual" required data-testid="input-doc-title" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="documentType">Document Type</Label>
                        <Select value={docType} onValueChange={setDocType}>
                          <SelectTrigger data-testid="select-doc-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="policy">Policy</SelectItem>
                            <SelectItem value="procedure">Procedure</SelectItem>
                            <SelectItem value="certificate">Certificate</SelectItem>
                            <SelectItem value="permit">Permit</SelectItem>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="report">Report</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="regulationType">Regulation Type</Label>
                        <Select value={docRegType} onValueChange={setDocRegType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="quality">Quality</SelectItem>
                            <SelectItem value="safety">Safety</SelectItem>
                            <SelectItem value="environmental">Environmental</SelectItem>
                            <SelectItem value="labor">Labor</SelectItem>
                            <SelectItem value="financial">Financial</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="version">Version</Label>
                        <Input id="version" name="version" type="number" placeholder="1" defaultValue="1" data-testid="input-doc-version" />
                      </div>
                      <div>
                        <Label htmlFor="expirationDate">Expiration Date</Label>
                        <Input id="expirationDate" name="expirationDate" type="date" data-testid="input-doc-expiration" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" name="description" placeholder="Document description" data-testid="input-doc-description" />
                    </div>
                    <div>
                      <Label htmlFor="fileUrl">File URL (optional)</Label>
                      <Input id="fileUrl" name="fileUrl" type="url" placeholder="https://example.com/document.pdf" data-testid="input-doc-url" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createDocMutation.isPending} data-testid="button-submit-document">
                      {createDocMutation.isPending ? "Creating..." : "Create Document"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {docsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading documents...</div>
          ) : documents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
                <p className="text-muted-foreground mb-4">Create your first compliance document to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc: any) => {
                const isExpiringSoon = doc.expirationDate && 
                  differenceInDays(new Date(doc.expirationDate), new Date()) <= 30 &&
                  differenceInDays(new Date(doc.expirationDate), new Date()) > 0;
                const isExpired = doc.expirationDate && new Date(doc.expirationDate) < new Date();
                
                return (
                  <Card key={doc.id} className={`hover-elevate ${isExpiringSoon ? 'border-yellow-500' : ''} ${isExpired ? 'border-red-500' : ''}`} data-testid={`card-document-${doc.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <FileText className="h-8 w-8 text-primary shrink-0" />
                        <div className="flex gap-1 flex-wrap">
                          {getStatusBadge(doc.status)}
                          {isExpiringSoon && <Badge className="bg-yellow-600">Expiring Soon</Badge>}
                          {isExpired && <Badge variant="destructive">Expired</Badge>}
                        </div>
                      </div>
                      <CardTitle className="text-lg mt-2">{doc.title}</CardTitle>
                      <CardDescription>
                        {doc.documentType} • v{doc.version}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{doc.description}</p>
                      )}
                      {doc.expirationDate && (
                        <div className="text-sm mb-3">
                          <span className="text-muted-foreground">Expires: </span>
                          <span className={isExpired ? 'text-red-600 font-semibold' : isExpiringSoon ? 'text-yellow-600 font-semibold' : ''}>
                            {format(new Date(doc.expirationDate), "MMM d, yyyy")}
                            {isExpiringSoon && ` (${differenceInDays(new Date(doc.expirationDate), new Date())} days)`}
                          </span>
                        </div>
                      )}
                      <div className="flex gap-2">
                        {doc.fileUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </a>
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-xl font-semibold">Compliance Calendar</h2>
            <div className="flex gap-2">
              {calendarEvents.length === 0 && (
                <Button variant="outline" onClick={() => seedCalendarMutation.mutate()} disabled={seedCalendarMutation.isPending} data-testid="button-seed-calendar">
                  <Plus className="h-4 w-4 mr-2" />
                  {seedCalendarMutation.isPending ? "Adding..." : "Load Manufacturing Deadlines"}
                </Button>
              )}
            </div>
          </div>

          {calendarLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading calendar...</div>
          ) : calendarEvents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No calendar events yet</h3>
                <p className="text-muted-foreground mb-4">
                  Load pre-populated manufacturing compliance deadlines (OSHA, EPA, ISO) to get started
                </p>
                <Button onClick={() => seedCalendarMutation.mutate()} disabled={seedCalendarMutation.isPending}>
                  <Plus className="h-4 w-4 mr-2" />
                  Load Manufacturing Deadlines
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Upcoming Events */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {calendarEvents
                  .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                  .map((event: any) => {
                    const daysUntil = differenceInDays(new Date(event.dueDate), new Date());
                    const isOverdue = daysUntil < 0;
                    const isSoon = daysUntil >= 0 && daysUntil <= 30;
                    
                    return (
                      <Card key={event.id} className={`hover-elevate ${isOverdue ? 'border-red-500' : isSoon ? 'border-yellow-500' : ''}`}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <Badge variant="outline">{event.regulatoryBody}</Badge>
                            {getStatusBadge(isOverdue ? 'overdue' : event.status)}
                          </div>
                          <CardTitle className="text-lg mt-2">{event.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className={isOverdue ? 'text-red-600 font-semibold' : isSoon ? 'text-yellow-600 font-semibold' : ''}>
                                {format(new Date(event.dueDate), "MMM d, yyyy")}
                                {isOverdue && ` (${Math.abs(daysUntil)} days overdue)`}
                                {isSoon && !isOverdue && ` (${daysUntil} days)`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{event.eventType}</span>
                              {event.isRecurring && <Badge variant="secondary" className="text-xs">Recurring</Badge>}
                            </div>
                            {event.description && (
                              <p className="text-muted-foreground line-clamp-2 mt-2">{event.description}</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Audits Tab */}
        <TabsContent value="audits" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-xl font-semibold">Audit Schedule & Tracking</h2>
            <Dialog open={openAuditDialog} onOpenChange={setOpenAuditDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-schedule-audit">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Audit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Schedule Compliance Audit</DialogTitle>
                  <DialogDescription>
                    Plan a compliance audit with automatic regime tracking
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleScheduleAudit}>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="auditName">Audit Name</Label>
                      <Input id="auditName" name="auditName" placeholder="Q1 2025 ISO 9001 Audit" required data-testid="input-audit-name" />
                    </div>
                    <div>
                      <Label htmlFor="auditType">Audit Type</Label>
                      <Select value={auditType} onValueChange={setAuditType}>
                        <SelectTrigger data-testid="select-audit-type">
                          <SelectValue placeholder="Select audit type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="internal">Internal Audit</SelectItem>
                          <SelectItem value="external">External Audit</SelectItem>
                          <SelectItem value="certification">Certification Audit</SelectItem>
                          <SelectItem value="surveillance">Surveillance Audit</SelectItem>
                          <SelectItem value="regulatory">Regulatory Audit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="scheduledDate">Scheduled Date</Label>
                      <Input id="scheduledDate" name="scheduledDate" type="date" required data-testid="input-audit-date" />
                    </div>
                    <div>
                      <Label htmlFor="auditor">Auditor Name</Label>
                      <Input id="auditor" name="auditor" placeholder="Jane Smith, Lead Auditor" required data-testid="input-auditor-name" />
                    </div>
                    <div>
                      <Label htmlFor="scope">Audit Scope</Label>
                      <Textarea id="scope" name="scope" placeholder="ISO 9001:2015 Clauses 4-10" required data-testid="input-audit-scope" />
                    </div>
                    {regime && (
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="text-sm font-medium mb-1">Economic Context</div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Current Regime:</span>
                          {getRegimeBadge(regime.regime)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          FDR: {regime.fdr?.toFixed(2) || "N/A"} (will be recorded with this audit)
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createAuditMutation.isPending} data-testid="button-submit-audit">
                      {createAuditMutation.isPending ? "Scheduling..." : "Schedule Audit"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {auditsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading audits...</div>
          ) : audits.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No audits scheduled</h3>
                <p className="text-muted-foreground mb-4">Schedule your first compliance audit to begin tracking</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {audits.map((audit: any) => (
                <Card key={audit.id} className="hover-elevate" data-testid={`card-audit-${audit.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <ClipboardList className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg">{audit.auditName || audit.auditType}</CardTitle>
                          {getStatusBadge(audit.status)}
                        </div>
                        <CardDescription>Auditor: {audit.auditor}</CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Scheduled</div>
                        <div className="font-semibold">
                          {audit.scheduledDate ? format(new Date(audit.scheduledDate), "MMM d, yyyy") : "TBD"}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="text-sm font-medium mb-1">Scope</div>
                      <p className="text-sm text-muted-foreground">{audit.scope}</p>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground mb-1">Economic Regime</div>
                        <div>{getRegimeBadge(audit.economicRegime || audit.regimeAtAudit || "UNKNOWN")}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">FDR at Audit</div>
                        <div className="font-semibold">{audit.fdrAtAudit ? audit.fdrAtAudit.toFixed(2) : "N/A"}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Findings Tab */}
        <TabsContent value="findings" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-xl font-semibold">Audit Findings Tracker</h2>
            <Dialog open={openFindingDialog} onOpenChange={setOpenFindingDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-finding">
                  <Plus className="h-4 w-4 mr-2" />
                  Log Finding
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Log Audit Finding</DialogTitle>
                  <DialogDescription>
                    Record a finding from an audit with owner assignment
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateFinding}>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="title">Finding Title</Label>
                      <Input id="title" name="title" placeholder="Missing calibration records" required data-testid="input-finding-title" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="severity">Severity</Label>
                        <Select value={findingSeverity} onValueChange={setFindingSeverity}>
                          <SelectTrigger data-testid="select-finding-severity">
                            <SelectValue placeholder="Select severity" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="critical">Critical</SelectItem>
                            <SelectItem value="major">Major</SelectItem>
                            <SelectItem value="minor">Minor</SelectItem>
                            <SelectItem value="observation">Observation</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Select value={findingCategory} onValueChange={setFindingCategory}>
                          <SelectTrigger data-testid="select-finding-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="safety">Safety</SelectItem>
                            <SelectItem value="environmental">Environmental</SelectItem>
                            <SelectItem value="quality">Quality</SelectItem>
                            <SelectItem value="documentation">Documentation</SelectItem>
                            <SelectItem value="process">Process</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" name="description" placeholder="Detailed description of the finding" required data-testid="input-finding-description" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="assignedTo">Assigned To</Label>
                        <Input id="assignedTo" name="assignedTo" placeholder="John Smith" data-testid="input-finding-assigned" />
                      </div>
                      <div>
                        <Label htmlFor="dueDate">Due Date</Label>
                        <Input id="dueDate" name="dueDate" type="date" data-testid="input-finding-due" />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createFindingMutation.isPending} data-testid="button-submit-finding">
                      {createFindingMutation.isPending ? "Logging..." : "Log Finding"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {findingsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading findings...</div>
          ) : findings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No findings logged</h3>
                <p className="text-muted-foreground mb-4">Log audit findings to track corrective actions</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {findings.map((finding: any) => {
                const isOverdue = finding.dueDate && new Date(finding.dueDate) < new Date() && finding.status === 'open';
                return (
                  <Card key={finding.id} className={`hover-elevate ${isOverdue ? 'border-red-500' : ''}`} data-testid={`card-finding-${finding.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{finding.findingNumber}</Badge>
                          {getSeverityBadge(finding.severity)}
                          {getStatusBadge(isOverdue ? 'overdue' : finding.status)}
                        </div>
                        <Badge variant="secondary">{finding.category}</Badge>
                      </div>
                      <CardTitle className="text-lg mt-2">{finding.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">{finding.description}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Assigned To</div>
                          <div className="font-medium flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {finding.assignedToName || "Unassigned"}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Due Date</div>
                          <div className={`font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                            {finding.dueDate ? format(new Date(finding.dueDate), "MMM d, yyyy") : "Not set"}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Created</div>
                          <div className="font-medium">
                            {finding.createdAt ? format(new Date(finding.createdAt), "MMM d, yyyy") : "N/A"}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Root Cause</div>
                          <div className="font-medium">{finding.rootCause || "Pending analysis"}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Checklists Tab */}
        <TabsContent value="checklists" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-xl font-semibold">Audit Checklist Templates</h2>
            {checklists.length === 0 && (
              <Button variant="outline" onClick={() => seedChecklistsMutation.mutate()} disabled={seedChecklistsMutation.isPending} data-testid="button-seed-checklists">
                <Plus className="h-4 w-4 mr-2" />
                {seedChecklistsMutation.isPending ? "Loading..." : "Load Standard Templates"}
              </Button>
            )}
          </div>

          {checklistsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading checklists...</div>
          ) : checklists.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No checklist templates</h3>
                <p className="text-muted-foreground mb-4">
                  Load pre-built checklists for ISO 9001, OSHA Safety, and EPA Environmental audits
                </p>
                <Button onClick={() => seedChecklistsMutation.mutate()} disabled={seedChecklistsMutation.isPending}>
                  <Plus className="h-4 w-4 mr-2" />
                  Load Standard Templates
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {checklists.map((checklist: any) => (
                <Card key={checklist.id} className="hover-elevate" data-testid={`card-checklist-${checklist.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CheckCircle2 className="h-8 w-8 text-primary shrink-0" />
                      <Badge variant={checklist.isSystemTemplate ? "default" : "secondary"}>
                        {checklist.isSystemTemplate ? "Standard" : "Custom"}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg mt-2">{checklist.name}</CardTitle>
                    <CardDescription>
                      {checklist.standard} • v{checklist.version}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {checklist.description && (
                      <p className="text-sm text-muted-foreground mb-3">{checklist.description}</p>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {(checklist.checklistItems as any[])?.length || 0} items
                      </span>
                      <Button variant="ghost" size="sm">
                        <ChevronRight className="h-4 w-4" />
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Training Tab */}
        <TabsContent value="training" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-xl font-semibold">Employee Training Records</h2>
            <Dialog open={openTrainingDialog} onOpenChange={setOpenTrainingDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-training">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Training Record
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Training Record</DialogTitle>
                  <DialogDescription>
                    Track employee safety training completion
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateTraining}>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="employeeName">Employee Name</Label>
                      <Input id="employeeName" name="employeeName" placeholder="John Smith" required data-testid="input-training-employee" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="trainingType">Training Type</Label>
                        <Select value={trainingType} onValueChange={setTrainingType}>
                          <SelectTrigger data-testid="select-training-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="safety">Safety</SelectItem>
                            <SelectItem value="hazmat">Hazmat</SelectItem>
                            <SelectItem value="equipment">Equipment</SelectItem>
                            <SelectItem value="emergency">Emergency</SelectItem>
                            <SelectItem value="quality">Quality</SelectItem>
                            <SelectItem value="environmental">Environmental</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="hoursRequired">Hours Required</Label>
                        <Input id="hoursRequired" name="hoursRequired" type="number" step="0.5" placeholder="8" data-testid="input-training-hours" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="trainingName">Training Course Name</Label>
                      <Input id="trainingName" name="trainingName" placeholder="OSHA 10-Hour General Industry" required data-testid="input-training-name" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="provider">Training Provider</Label>
                        <Input id="provider" name="provider" placeholder="Safety Training Inc." data-testid="input-training-provider" />
                      </div>
                      <div>
                        <Label htmlFor="expirationDate">Certification Expires</Label>
                        <Input id="expirationDate" name="expirationDate" type="date" data-testid="input-training-expiration" />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createTrainingMutation.isPending} data-testid="button-submit-training">
                      {createTrainingMutation.isPending ? "Adding..." : "Add Training"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {trainingLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading training records...</div>
          ) : trainingRecords.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No training records</h3>
                <p className="text-muted-foreground mb-4">Add employee training records to track safety certifications</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {trainingRecords.map((record: any) => {
                const isExpired = record.expirationDate && new Date(record.expirationDate) < new Date();
                const isExpiringSoon = record.expirationDate && 
                  differenceInDays(new Date(record.expirationDate), new Date()) <= 30 &&
                  differenceInDays(new Date(record.expirationDate), new Date()) > 0;
                
                return (
                  <Card key={record.id} className={`hover-elevate ${isExpired ? 'border-red-500' : isExpiringSoon ? 'border-yellow-500' : ''}`} data-testid={`card-training-${record.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-5 w-5 text-primary" />
                          <Badge variant="outline">{record.trainingType}</Badge>
                          {getStatusBadge(isExpired ? 'expired' : record.status)}
                        </div>
                        {isExpiringSoon && <Badge className="bg-yellow-600">Expiring Soon</Badge>}
                      </div>
                      <CardTitle className="text-lg mt-2">{record.employeeName}</CardTitle>
                      <CardDescription>{record.trainingName}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Provider</div>
                          <div className="font-medium">{record.provider || "N/A"}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Hours</div>
                          <div className="font-medium">{record.hoursCompleted || 0} / {record.hoursRequired || "N/A"}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Completed</div>
                          <div className="font-medium">
                            {record.completionDate ? format(new Date(record.completionDate), "MMM d, yyyy") : "Not yet"}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Expires</div>
                          <div className={`font-medium ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-yellow-600' : ''}`}>
                            {record.expirationDate ? format(new Date(record.expirationDate), "MMM d, yyyy") : "N/A"}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <h2 className="text-xl font-semibold">Regime-Aware Compliance Insights</h2>
          
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Current Regime Impact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {regime && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Economic Regime:</span>
                      {getRegimeBadge(regime.regime)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">FDR Score:</span>
                      <span className="text-xl font-bold">{regime.fdr?.toFixed(2) || "N/A"}</span>
                    </div>
                    <Separator />
                    <div className="space-y-2 text-sm">
                      <p className="font-medium">Compliance Recommendations:</p>
                      {regime.regime === "IMBALANCED_EXCESS" && (
                        <div className="bg-bad/15 dark:bg-red-950 p-3 rounded-lg border border-bad/30 dark:border-bad/30">
                          <p className="text-red-900 dark:text-red-100">
                            <strong>High Enforcement Risk:</strong> During bubble periods, regulatory enforcement typically intensifies. Ensure all documentation is current and audit-ready.
                          </p>
                        </div>
                      )}
                      {regime.regime === "REAL_ECONOMY_LEAD" && (
                        <div className="bg-muted/15 dark:bg-blue-950 p-3 rounded-lg border border-muted/30 dark:border-muted/30">
                          <p className="text-blue-900 dark:text-blue-100">
                            <strong>Growth Focus:</strong> Regulators may prioritize economic recovery. Good time to streamline compliance processes.
                          </p>
                        </div>
                      )}
                      {regime.regime === "HEALTHY_EXPANSION" && (
                        <div className="bg-good/15 dark:bg-green-950 p-3 rounded-lg border border-good/30 dark:border-good/30">
                          <p className="text-green-900 dark:text-green-100">
                            <strong>Balanced Approach:</strong> Normal compliance environment. Maintain standard procedures and document quality.
                          </p>
                        </div>
                      )}
                      {regime.regime === "ASSET_LED_GROWTH" && (
                        <div className="bg-signal/15 dark:bg-orange-950 p-3 rounded-lg border border-signal/30 dark:border-signal/30">
                          <p className="text-orange-900 dark:text-orange-100">
                            <strong>Prepare for Shift:</strong> Financial markets pulling ahead signals potential regulatory tightening. Review compliance frameworks now.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Compliance Status Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Total Documents</span>
                    <Badge variant="outline">{documents.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Active Documents</span>
                    <Badge className="bg-green-600">
                      {documents.filter((d: any) => d.status === "approved" || d.status === "active").length}
                    </Badge>
                  </div>
                </div>
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Total Audits</span>
                    <Badge variant="outline">{audits.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Completed Audits</span>
                    <Badge className="bg-green-600">
                      {audits.filter((a: any) => a.status === "completed").length}
                    </Badge>
                  </div>
                </div>
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Open Findings</span>
                    <Badge variant="destructive">
                      {findings.filter((f: any) => f.status === "open").length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Training Records</span>
                    <Badge variant="outline">{trainingRecords.length}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
