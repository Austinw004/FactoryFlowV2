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
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

export default function Compliance() {
  const { toast } = useToast();
  const [openDocDialog, setOpenDocDialog] = useState(false);
  const [openAuditDialog, setOpenAuditDialog] = useState(false);

  // Fetch compliance documents
  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ["/api/compliance/documents"],
  });

  // Fetch compliance audits
  const { data: audits = [], isLoading: auditsLoading } = useQuery({
    queryKey: ["/api/compliance/audits"],
  });

  // Fetch current regime
  const { data: regime } = useQuery({
    queryKey: ["/api/economics/regime"],
  });

  // Create document mutation
  const createDocMutation = useMutation({
    mutationFn: async (data: any) => 
      apiRequest("/api/compliance/documents", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance/documents"] });
      toast({ title: "Document created successfully" });
      setOpenDocDialog(false);
    },
    onError: () => {
      toast({ 
        title: "Failed to create document", 
        variant: "destructive" 
      });
    },
  });

  // Create audit mutation
  const createAuditMutation = useMutation({
    mutationFn: async (data: any) => 
      apiRequest("/api/compliance/audits", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance/audits"] });
      toast({ title: "Audit scheduled successfully" });
      setOpenAuditDialog(false);
    },
    onError: () => {
      toast({ 
        title: "Failed to schedule audit", 
        variant: "destructive" 
      });
    },
  });

  const handleCreateDocument = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createDocMutation.mutate({
      title: formData.get("title"),
      documentType: formData.get("documentType"),
      description: formData.get("description"),
      version: formData.get("version"),
      status: "draft",
      fileUrl: formData.get("fileUrl") || null,
    });
  };

  const handleScheduleAudit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createAuditMutation.mutate({
      auditType: formData.get("auditType"),
      scheduledDate: formData.get("scheduledDate"),
      auditor: formData.get("auditor"),
      scope: formData.get("scope"),
      status: "scheduled",
      fdrAtAudit: regime?.fdr || 0,
      regimeAtAudit: regime?.regime || "UNKNOWN",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: "secondary" as const, label: "Draft" },
      under_review: { variant: "default" as const, label: "Under Review" },
      approved: { variant: "default" as const, label: "Approved", className: "bg-green-600" },
      rejected: { variant: "destructive" as const, label: "Rejected" },
      archived: { variant: "outline" as const, label: "Archived" },
      scheduled: { variant: "default" as const, label: "Scheduled", className: "bg-blue-600" },
      in_progress: { variant: "default" as const, label: "In Progress", className: "bg-yellow-600" },
      completed: { variant: "default" as const, label: "Completed", className: "bg-green-600" },
      failed: { variant: "destructive" as const, label: "Failed" },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const getRegimeBadge = (regimeName: string) => {
    const regimeConfig = {
      HEALTHY_EXPANSION: { className: "bg-green-600", label: "Healthy Expansion" },
      ASSET_LED_GROWTH: { className: "bg-orange-600", label: "Asset-Led Growth" },
      IMBALANCED_EXCESS: { className: "bg-red-600", label: "Imbalanced Excess" },
      REAL_ECONOMY_LEAD: { className: "bg-blue-600", label: "Real Economy Lead" },
    };
    const config = regimeConfig[regimeName as keyof typeof regimeConfig] || { className: "", label: regimeName };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="heading-compliance">
            <Shield className="h-8 w-8" />
            Regulatory Compliance Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Track documents, schedule audits, and maintain compliance with regime-aware intelligence
          </p>
        </div>
        {regime && (
          <Card className="w-fit">
            <CardContent className="pt-6 px-4 pb-4">
              <div className="text-sm text-muted-foreground">Current Regime</div>
              <div className="mt-1">{getRegimeBadge(regime.regime)}</div>
              <div className="text-2xl font-bold mt-1">FDR: {regime.fdr.toFixed(2)}</div>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="documents" data-testid="tab-documents">
            <FileText className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="audits" data-testid="tab-audits">
            <Calendar className="h-4 w-4 mr-2" />
            Audits
          </TabsTrigger>
          <TabsTrigger value="insights" data-testid="tab-insights">
            <TrendingUp className="h-4 w-4 mr-2" />
            Regime Insights
          </TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <div className="flex justify-between items-center">
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
                    Add a new document to your compliance repository with version control
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateDocument}>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="title">Document Title</Label>
                      <Input 
                        id="title" 
                        name="title" 
                        placeholder="ISO 9001 Quality Manual" 
                        required 
                        data-testid="input-doc-title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="documentType">Document Type</Label>
                      <Select name="documentType" required>
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
                      <Label htmlFor="version">Version</Label>
                      <Input 
                        id="version" 
                        name="version" 
                        placeholder="1.0" 
                        defaultValue="1.0"
                        required 
                        data-testid="input-doc-version"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea 
                        id="description" 
                        name="description" 
                        placeholder="Document description and purpose"
                        data-testid="input-doc-description"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fileUrl">File URL (optional)</Label>
                      <Input 
                        id="fileUrl" 
                        name="fileUrl" 
                        type="url"
                        placeholder="https://example.com/document.pdf"
                        data-testid="input-doc-url"
                      />
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
                <p className="text-muted-foreground mb-4">
                  Create your first compliance document to get started
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc: any) => (
                <Card key={doc.id} className="hover-elevate" data-testid={`card-document-${doc.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <FileText className="h-8 w-8 text-primary" />
                      {getStatusBadge(doc.status)}
                    </div>
                    <CardTitle className="text-lg mt-2">{doc.title}</CardTitle>
                    <CardDescription>
                      {doc.documentType} • v{doc.version}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {doc.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {doc.description}
                      </p>
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
                    <Separator className="my-3" />
                    <div className="text-xs text-muted-foreground">
                      Created: {doc.createdAt ? format(new Date(doc.createdAt), "MMM d, yyyy") : "Unknown"}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Audits Tab */}
        <TabsContent value="audits" className="space-y-4">
          <div className="flex justify-between items-center">
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
                      <Label htmlFor="auditType">Audit Type</Label>
                      <Select name="auditType" required>
                        <SelectTrigger data-testid="select-audit-type">
                          <SelectValue placeholder="Select audit type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="internal">Internal Audit</SelectItem>
                          <SelectItem value="external">External Audit</SelectItem>
                          <SelectItem value="certification">Certification Audit</SelectItem>
                          <SelectItem value="surveillance">Surveillance Audit</SelectItem>
                          <SelectItem value="special">Special Investigation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="scheduledDate">Scheduled Date</Label>
                      <Input 
                        id="scheduledDate" 
                        name="scheduledDate" 
                        type="date"
                        required 
                        data-testid="input-audit-date"
                      />
                    </div>
                    <div>
                      <Label htmlFor="auditor">Auditor Name</Label>
                      <Input 
                        id="auditor" 
                        name="auditor" 
                        placeholder="Jane Smith, Lead Auditor"
                        required 
                        data-testid="input-auditor-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="scope">Audit Scope</Label>
                      <Textarea 
                        id="scope" 
                        name="scope" 
                        placeholder="ISO 9001:2015 Clauses 4-10, Manufacturing Quality Systems"
                        required
                        data-testid="input-audit-scope"
                      />
                    </div>
                    {regime && (
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="text-sm font-medium mb-1">Economic Context</div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Current Regime:</span>
                          {getRegimeBadge(regime.regime)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          FDR: {regime.fdr.toFixed(2)} (will be recorded with this audit)
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
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No audits scheduled</h3>
                <p className="text-muted-foreground mb-4">
                  Schedule your first compliance audit to begin tracking
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {audits.map((audit: any) => (
                <Card key={audit.id} className="hover-elevate" data-testid={`card-audit-${audit.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg">{audit.auditType}</CardTitle>
                          {getStatusBadge(audit.status)}
                        </div>
                        <CardDescription>
                          Auditor: {audit.auditor}
                        </CardDescription>
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
                    
                    {audit.findings && (
                      <div>
                        <div className="text-sm font-medium mb-1">Findings</div>
                        <p className="text-sm text-muted-foreground">{audit.findings}</p>
                      </div>
                    )}

                    <Separator />
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground mb-1">Economic Regime</div>
                        <div>{getRegimeBadge(audit.regimeAtAudit || "UNKNOWN")}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">FDR at Audit</div>
                        <div className="font-semibold">
                          {audit.fdrAtAudit ? audit.fdrAtAudit.toFixed(2) : "N/A"}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Regime Insights Tab */}
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
                      <span className="text-xl font-bold">{regime.fdr.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="space-y-2 text-sm">
                      <p className="font-medium">Compliance Recommendations:</p>
                      {regime.regime === "IMBALANCED_EXCESS" && (
                        <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg border border-red-200 dark:border-red-800">
                          <p className="text-red-900 dark:text-red-100">
                            <strong>High Enforcement Risk:</strong> During bubble periods, regulatory enforcement typically intensifies as governments seek revenue. Ensure all documentation is current and audit-ready.
                          </p>
                        </div>
                      )}
                      {regime.regime === "REAL_ECONOMY_LEAD" && (
                        <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-blue-900 dark:text-blue-100">
                            <strong>Growth Focus:</strong> Regulators may prioritize economic recovery over strict enforcement. Good time to streamline compliance processes and prepare for expansion.
                          </p>
                        </div>
                      )}
                      {regime.regime === "HEALTHY_EXPANSION" && (
                        <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-200 dark:border-green-800">
                          <p className="text-green-900 dark:text-green-100">
                            <strong>Balanced Approach:</strong> Normal compliance environment. Maintain standard procedures and document quality.
                          </p>
                        </div>
                      )}
                      {regime.regime === "ASSET_LED_GROWTH" && (
                        <div className="bg-orange-50 dark:bg-orange-950 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                          <p className="text-orange-900 dark:text-orange-100">
                            <strong>Prepare for Shift:</strong> Financial markets pulling ahead signals potential regulatory tightening ahead. Review and strengthen compliance frameworks now.
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
                    <span className="text-sm font-medium">Approved Documents</span>
                    <Badge className="bg-green-600">
                      {documents.filter((d: any) => d.status === "approved").length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Under Review</span>
                    <Badge variant="secondary">
                      {documents.filter((d: any) => d.status === "under_review").length}
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
                    <span className="text-sm font-medium">Upcoming Audits</span>
                    <Badge className="bg-blue-600">
                      {audits.filter((a: any) => a.status === "scheduled" || a.status === "in_progress").length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Completed Audits</span>
                    <Badge className="bg-green-600">
                      {audits.filter((a: any) => a.status === "completed").length}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Understanding Compliance & Economic Regimes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Why track economic regimes in compliance?</strong> Regulatory enforcement patterns shift with economic cycles. During financial bubbles (Imbalanced Excess), governments often intensify compliance enforcement to generate revenue. During recoveries (Real Economy Lead), regulators may soften enforcement to support growth.
              </p>
              <p>
                By tracking the FDR ratio alongside your audits and documents, you can:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Anticipate regulatory tightening before it happens</li>
                <li>Prepare documentation during favorable periods</li>
                <li>Understand historical compliance costs across different economic regimes</li>
                <li>Make data-driven decisions about compliance investments</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
