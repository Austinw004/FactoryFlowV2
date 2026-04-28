import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { humanizeError } from "@/lib/humanizeError";
import { formatRegimeName } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, CheckCircle, XCircle, Settings, TrendingUp, 
  AlertCircle, Clock, Zap, Link as LinkIcon, PlayCircle, Loader2,
  Package, BarChart3, Activity, Calendar, ArrowRight, ArrowLeft,
  Sparkles, ShieldCheck, Info, DollarSign, ShoppingCart, AlertTriangle,
  FileText, Shield
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { 
  PoRule, NegotiationPlaybook, ErpConnection
} from "@shared/schema";

interface ERPStatus {
  connected: boolean;
  system?: string;
  capabilities: {
    canReadPOs: boolean;
    canCreatePOs: boolean;
    canUpdatePOs: boolean;
    canReadInventory: boolean;
  };
  lastSync?: string;
  error?: string;
}

export default function AutomatedPO() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [confirmExec, setConfirmExec] = useState<{ id: string; name: string; supplier: string; amount: number; paymentMethod: "card" | "ach" | "invoice" } | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [showPlaybookDialog, setShowPlaybookDialog] = useState(false);
  const [showErpDialog, setShowErpDialog] = useState(false);
  const [ruleWizardStep, setRuleWizardStep] = useState(1);

  const [ruleForm, setRuleForm] = useState({
    name: "",
    description: "",
    priority: 50,
    triggerType: "inventory_low",
    fdrRange: { min: 0, max: 5 },
    regimeFilter: "",
    minQuantity: 100,
    maxQuantity: 10000,
    approvalRequired: true,
    useTemplate: ""
  });

  const ruleTemplates = [
    {
      id: "low_stock_reorder",
      name: "Low Stock Auto-Reorder",
      description: "Automatically create POs when inventory falls below reorder point",
      icon: Package,
      triggerType: "inventory_low",
      priority: 80,
      approvalRequired: false,
      color: "text-orange-600 bg-orange-100 dark:bg-orange-900/30"
    },
    {
      id: "forecast_driven",
      name: "Forecast-Driven Ordering",
      description: "Order based on demand forecasts to stay ahead of requirements",
      icon: BarChart3,
      triggerType: "forecast_demand",
      priority: 70,
      approvalRequired: true,
      color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30"
    },
    {
      id: "regime_opportunistic",
      name: "Regime-Opportunistic Buying",
      description: "Trigger bulk purchases during favorable economic conditions",
      icon: Activity,
      triggerType: "fdr_threshold",
      priority: 60,
      approvalRequired: true,
      color: "text-green-600 bg-green-100 dark:bg-green-900/30"
    },
    {
      id: "scheduled_replenishment",
      name: "Scheduled Replenishment",
      description: "Create recurring POs on a fixed schedule",
      icon: Calendar,
      triggerType: "scheduled",
      priority: 50,
      approvalRequired: false,
      color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30"
    }
  ];

  const triggerTypeInfo: Record<string, { label: string; description: string; icon: typeof Package }> = {
    inventory_low: { 
      label: "Inventory Low", 
      description: "Triggers when stock falls below the reorder point",
      icon: Package
    },
    forecast_demand: { 
      label: "Forecast Demand", 
      description: "Triggers based on predicted future demand",
      icon: BarChart3
    },
    fdr_threshold: { 
      label: "FDR Threshold", 
      description: "Triggers when economic indicator crosses a threshold",
      icon: Activity
    },
    regime_change: { 
      label: "Regime Change", 
      description: "Triggers when economic regime transitions",
      icon: TrendingUp
    },
    scheduled: { 
      label: "Scheduled", 
      description: "Triggers on a recurring schedule",
      icon: Calendar
    }
  };

  const [playbookForm, setPlaybookForm] = useState({
    name: "",
    description: "",
    triggerRegime: "",
    fdrMin: 0,
    fdrMax: 5,
    strategy: "conservative",
    discountTarget: 5,
    paymentTermsDays: 30
  });

  const [erpForm, setErpForm] = useState({
    name: "",
    erpType: "sap_s4hana",
    environment: "production",
    connectionUrl: "",
    authType: "oauth2"
  });

  const resetRuleForm = () => {
    setRuleForm({ name: "", description: "", priority: 50, triggerType: "inventory_low", fdrRange: { min: 0, max: 5 }, regimeFilter: "", minQuantity: 100, maxQuantity: 10000, approvalRequired: true, useTemplate: "" });
    setRuleWizardStep(1);
  };

  const applyTemplate = (templateId: string) => {
    const template = ruleTemplates.find(t => t.id === templateId);
    if (template) {
      setRuleForm(prev => ({
        ...prev,
        name: template.name,
        description: template.description,
        triggerType: template.triggerType,
        priority: template.priority,
        approvalRequired: template.approvalRequired,
        useTemplate: templateId
      }));
      setRuleWizardStep(2);
    }
  };

  const canProceedToNextStep = () => {
    if (ruleWizardStep === 1) return true;
    if (ruleWizardStep === 2) return ruleForm.name.trim() !== "" && ruleForm.triggerType !== "";
    return true;
  };
  const resetPlaybookForm = () => setPlaybookForm({ name: "", description: "", triggerRegime: "", fdrMin: 0, fdrMax: 5, strategy: "conservative", discountTarget: 5, paymentTermsDays: 30 });
  const resetErpForm = () => setErpForm({ name: "", erpType: "sap_s4hana", environment: "production", connectionUrl: "", authType: "oauth2" });

  // Fetch PO Rules
  const { data: rules = [], isLoading: rulesLoading } = useQuery<PoRule[]>({
    queryKey: ["/api/po-rules"],
  });

  // Fetch Negotiation Playbooks
  const { data: playbooks = [], isLoading: playbooksLoading } = useQuery<NegotiationPlaybook[]>({
    queryKey: ["/api/negotiation-playbooks"],
  });

  // Fetch ERP Connections
  const { data: erpConnections = [], isLoading: erpLoading } = useQuery<ErpConnection[]>({
    queryKey: ["/api/erp-connections"],
  });

  // Fetch ERP Status
  const { data: erpStatus } = useQuery<ERPStatus>({
    queryKey: ["/api/erp/status"],
  });

  // Fetch pending procurement recommendations
  const { data: pendingRecs = [], isLoading: recsLoading } = useQuery<any[]>({
    queryKey: ["/api/procurement/recommendations/pending"],
    refetchInterval: 30000,
  });

  // Fetch purchase intents
  const { data: intentsData } = useQuery<{ intents: any[] }>({
    queryKey: ["/api/procurement/intents"],
    refetchInterval: 30000,
  });
  const purchaseIntents = intentsData?.intents ?? [];

  // Approve recommendation only
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/procurement/recommendations/${id}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/recommendations/pending"] });
      toast({ title: "Recommendation approved", description: "Queued for manual PO processing." });
    },
    onError: (err: unknown) => {
      toast({ ...humanizeError(err, "Approval failed"), variant: "destructive" });
    },
  });

  // Execute recommendation (Stripe or PO fallback)
  const executeMutation = useMutation({
    mutationFn: async ({ id, paymentMethod }: { id: string; paymentMethod: "card" | "ach" | "invoice" }) => {
      return await apiRequest("POST", `/api/procurement/recommendations/${id}/execute`, { paymentMethod });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/recommendations/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/intents"] });
      setConfirmExec(null);
      setExecutingId(null);
      if (data.method === "po_fallback") {
        toast({ title: "Purchase Order created", description: `PO ${data.poNumber} generated for net-30 payment.` });
      } else {
        toast({ title: "Payment executed", description: `Transaction confirmed. Amount: $${(data.amountCharged / 100).toLocaleString()}` });
      }
    },
    onError: (err: unknown) => {
      setExecutingId(null);
      setConfirmExec(null);
      toast({ ...humanizeError(err, "Execution failed"), variant: "destructive" });
    },
  });

  // Toggle PO Rule
  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: number }) => {
      return await apiRequest("PATCH", `/api/po-rules/${id}`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/po-rules"] });
      toast({ title: "Rule updated successfully" });
    },
    onError: (error: unknown) => {
      toast({ ...humanizeError(error, "Error updating rule"), variant: "destructive" });
    },
  });

  // Delete PO Rule
  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/po-rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/po-rules"] });
      toast({ title: "Rule deleted successfully" });
    },
    onError: (error: unknown) => {
      toast({ ...humanizeError(error, "Error deleting rule"), variant: "destructive" });
    },
  });

  // Create PO Rule
  const createRuleMutation = useMutation({
    mutationFn: async (data: typeof ruleForm) => {
      return await apiRequest("POST", "/api/po-rules", {
        name: data.name,
        description: data.description,
        priority: data.priority,
        triggerType: data.triggerType,
        fdrRange: data.fdrRange,
        regimeFilter: data.regimeFilter || null,
        conditions: { minQuantity: data.minQuantity, maxQuantity: data.maxQuantity },
        approvalRequired: data.approvalRequired ? 1 : 0,
        enabled: 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/po-rules"] });
      toast({ title: "Rule created", description: "Your PO automation rule is now active." });
      setShowRuleDialog(false);
      resetRuleForm();
    },
    onError: (error: unknown) => {
      toast({ ...humanizeError(error, "Error creating rule"), variant: "destructive" });
    }
  });

  // Create Negotiation Playbook
  const createPlaybookMutation = useMutation({
    mutationFn: async (data: typeof playbookForm) => {
      return await apiRequest("POST", "/api/negotiation-playbooks", {
        name: data.name,
        description: data.description,
        triggerRegime: data.triggerRegime || null,
        fdrRange: { min: data.fdrMin, max: data.fdrMax },
        strategies: [{ type: data.strategy, discountTarget: data.discountTarget, paymentTermsDays: data.paymentTermsDays }],
        enabled: 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/negotiation-playbooks"] });
      toast({ title: "Playbook created", description: "Your negotiation playbook is now ready." });
      setShowPlaybookDialog(false);
      resetPlaybookForm();
    },
    onError: (error: unknown) => {
      toast({ ...humanizeError(error, "Error creating playbook"), variant: "destructive" });
    }
  });

  // Create ERP Connection
  const createErpConnectionMutation = useMutation({
    mutationFn: async (data: typeof erpForm) => {
      return await apiRequest("POST", "/api/erp-connections", {
        name: data.name,
        erpType: data.erpType,
        environment: data.environment,
        connectionConfig: { url: data.connectionUrl, authType: data.authType },
        status: "pending",
        enabled: 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/erp-connections"] });
      toast({ title: "Connection created", description: "Your ERP connection has been configured. It will be verified automatically." });
      setShowErpDialog(false);
      resetErpForm();
    },
    onError: (error: unknown) => {
      toast({ ...humanizeError(error, "Error creating connection"), variant: "destructive" });
    }
  });

  const enabledRules = rules.filter(r => r.enabled === 1);
  const totalRules = rules.length;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
<p className="text-muted-foreground" data-testid="text-page-description">
          Smart purchase order generation with FDR-aware triggers, approval workflows, and ERP integration
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-active-rules">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-rules-count">
              {enabledRules.length}/{totalRules}
            </div>
            <p className="text-xs text-muted-foreground">
              Rules actively monitoring
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-erp-status">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ERP Integration</CardTitle>
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {erpStatus?.connected ? (
                <Badge variant="default" className="gap-1" data-testid="badge-erp-connected">
                  <CheckCircle className="h-3 w-3" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1" data-testid="badge-erp-disconnected">
                  <XCircle className="h-3 w-3" />
                  Not Connected
                </Badge>
              )}
            </div>
            {erpStatus?.system && (
              <p className="text-xs text-muted-foreground mt-2" data-testid="text-erp-system">
                System: {erpStatus.system.toUpperCase()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-playbooks">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Negotiation Playbooks</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-playbooks-count">
              {playbooks.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Ready to deploy
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-automation-status">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Automation Status</CardTitle>
            <PlayCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {enabledRules.length > 0 ? (
                <Badge variant="default" className="gap-1" data-testid="badge-automation-active">
                  <CheckCircle className="h-3 w-3" />
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1" data-testid="badge-automation-inactive">
                  <Clock className="h-3 w-3" />
                  Inactive
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {enabledRules.length > 0 ? "Monitoring conditions" : "No active rules"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-main-navigation">
          <TabsTrigger value="pending" data-testid="tab-pending">
            <span className="flex items-center gap-1.5">
              <ShoppingCart className="h-3.5 w-3.5" />
              Pending Actions
              {pendingRecs.length > 0 && (
                <Badge className="ml-1 h-5 min-w-5 rounded-full px-1.5 text-xs" data-testid="badge-pending-count">
                  {pendingRecs.length}
                </Badge>
              )}
            </span>
          </TabsTrigger>
          <TabsTrigger value="rules" data-testid="tab-rules">
            PO Rules ({rules.length})
          </TabsTrigger>
          <TabsTrigger value="playbooks" data-testid="tab-playbooks">
            Playbooks ({playbooks.length})
          </TabsTrigger>
          <TabsTrigger value="erp" data-testid="tab-erp">
            ERP Integration
          </TabsTrigger>
        </TabsList>

        {/* Pending Actions Tab */}
        <TabsContent value="pending" className="space-y-4">
          {/* Summary row */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-muted p-2"><ShoppingCart className="h-4 w-4 text-muted-foreground" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-semibold" data-testid="text-pending-count">{pendingRecs.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-muted p-2"><CheckCircle className="h-4 w-4 text-muted-foreground" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Executed (total)</p>
                    <p className="text-2xl font-semibold" data-testid="text-executed-count">
                      {purchaseIntents.filter((i: any) => i.status === "completed").length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-muted p-2"><DollarSign className="h-4 w-4 text-muted-foreground" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Committed</p>
                    <p className="text-2xl font-semibold" data-testid="text-committed-total">
                      ${purchaseIntents
                        .filter((i: any) => i.status === "completed")
                        .reduce((sum: number, i: any) => sum + (i.amountCents ?? 0), 0)
                        .toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations list */}
          {recsLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground" data-testid="loading-pending">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading recommendations…
            </div>
          ) : pendingRecs.length === 0 ? (
            <Card>
              <CardContent className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
                <CheckCircle className="h-8 w-8" />
                <p className="font-medium">No pending actions</p>
                <p className="text-sm text-center max-w-xs">
                  All recommendations have been actioned. New recommendations from the AI engine will appear here automatically.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingRecs.map((rec: any) => (
                <Card key={rec.id} data-testid={`card-recommendation-${rec.id}`}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm" data-testid={`text-rec-material-${rec.id}`}>
                            {rec.materialName ?? rec.materialId}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {rec.recommendationType?.replace(/_/g, " ")}
                          </Badge>
                          {rec.trustScore != null && (
                            <Badge
                              variant={rec.trustScore >= 0.7 ? "default" : "secondary"}
                              className="text-xs"
                              data-testid={`badge-trust-${rec.id}`}
                            >
                              <Shield className="h-3 w-3 mr-1" />
                              Trust {Math.round(rec.trustScore * 100)}%
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          <span data-testid={`text-rec-supplier-${rec.id}`}>
                            Supplier: <span className="text-foreground">{rec.supplierName ?? rec.supplierId ?? "—"}</span>
                          </span>
                          <span data-testid={`text-rec-qty-${rec.id}`}>
                            Qty: <span className="text-foreground">{rec.recommendedQuantity?.toLocaleString()} {rec.unit ?? ""}</span>
                          </span>
                          <span data-testid={`text-rec-price-${rec.id}`}>
                            Unit price: <span className="text-foreground">${Number(rec.unitPrice ?? 0).toFixed(2)}</span>
                          </span>
                          <span className="font-medium text-foreground" data-testid={`text-rec-total-${rec.id}`}>
                            Total: ${((rec.recommendedQuantity ?? 0) * Number(rec.unitPrice ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        {rec.rationale && (
                          <p className="text-xs text-muted-foreground line-clamp-2" data-testid={`text-rec-rationale-${rec.id}`}>{rec.rationale}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => approveMutation.mutate(rec.id)}
                              disabled={approveMutation.isPending && approveMutation.variables === rec.id}
                              data-testid={`button-approve-${rec.id}`}
                            >
                              {approveMutation.isPending && approveMutation.variables === rec.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle className="h-3.5 w-3.5" />
                              )}
                              <span className="ml-1.5">Approve</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Approve for manual PO (no payment)</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              onClick={() => setConfirmExec({
                                id: rec.id,
                                name: rec.materialName ?? rec.materialId,
                                supplier: rec.supplierName ?? rec.supplierId ?? "Unknown",
                                amount: (rec.recommendedQuantity ?? 0) * Number(rec.unitPrice ?? 0),
                                paymentMethod: "card",
                              })}
                              disabled={executeMutation.isPending && executingId === rec.id}
                              data-testid={`button-execute-${rec.id}`}
                            >
                              {executeMutation.isPending && executingId === rec.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Zap className="h-3.5 w-3.5" />
                              )}
                              <span className="ml-1.5">Execute</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Approve + execute payment via Stripe or PO</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Recent Purchase Intents */}
          {purchaseIntents.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Recent Transactions</h3>
              {purchaseIntents.slice(0, 5).map((intent: any) => (
                <Card key={intent.id} data-testid={`card-intent-${intent.id}`}>
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        {intent.executionMethod === "po_fallback" ? (
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-medium" data-testid={`text-intent-ref-${intent.id}`}>
                            {intent.poNumber ?? intent.stripePaymentIntentId ?? intent.id.slice(0, 8)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {intent.executionMethod === "po_fallback" ? "Purchase Order (net-30)" : "Stripe payment"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium" data-testid={`text-intent-amount-${intent.id}`}>
                          ${((intent.amountCents ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <Badge
                          variant={intent.status === "completed" ? "default" : intent.status === "failed" ? "destructive" : "secondary"}
                          data-testid={`badge-intent-status-${intent.id}`}
                        >
                          {intent.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* PO Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Purchase Order Rules</h3>
              <p className="text-sm text-muted-foreground">
                Configure smart PO generation rules with FDR triggers and approval thresholds
              </p>
            </div>
            <Button 
              onClick={() => setShowRuleDialog(true)}
              data-testid="button-create-rule"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          </div>

          {rulesLoading ? (
            <div className="flex justify-center p-8">
              <div className="text-muted-foreground">Loading rules...</div>
            </div>
          ) : rules.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No PO rules configured</h3>
                <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                  Create your first rule to automate purchase order generation based on inventory levels, FDR thresholds, and economic regimes.
                </p>
                <Button 
                  onClick={() => setShowRuleDialog(true)}
                  data-testid="button-create-first-rule"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Rule
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {rules.map((rule) => (
                <Card key={rule.id} data-testid={`card-rule-${rule.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-base" data-testid={`text-rule-name-${rule.id}`}>
                            {rule.name}
                          </CardTitle>
                          {rule.enabled === 1 ? (
                            <Badge variant="default" className="gap-1" data-testid={`badge-rule-enabled-${rule.id}`}>
                              <CheckCircle className="h-3 w-3" />
                              Enabled
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1" data-testid={`badge-rule-disabled-${rule.id}`}>
                              <XCircle className="h-3 w-3" />
                              Disabled
                            </Badge>
                          )}
                          {rule.priority > 5 && (
                            <Badge variant="outline" data-testid={`badge-rule-priority-${rule.id}`}>
                              High Priority
                            </Badge>
                          )}
                        </div>
                        {rule.description && (
                          <CardDescription data-testid={`text-rule-description-${rule.id}`}>
                            {rule.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.enabled === 1}
                          onCheckedChange={(checked) => 
                            toggleRuleMutation.mutate({ id: rule.id, enabled: checked ? 1 : 0 })
                          }
                          data-testid={`switch-toggle-rule-${rule.id}`}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRuleMutation.mutate(rule.id)}
                          data-testid={`button-delete-rule-${rule.id}`}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {rule.fdrMin !== null && (
                        <div>
                          <span className="text-muted-foreground">FDR Min:</span>
                          <span className="ml-2 font-medium">{rule.fdrMin.toFixed(2)}</span>
                        </div>
                      )}
                      {rule.fdrMax !== null && (
                        <div>
                          <span className="text-muted-foreground">FDR Max:</span>
                          <span className="ml-2 font-medium">{rule.fdrMax.toFixed(2)}</span>
                        </div>
                      )}
                      {rule.regime && (
                        <div>
                          <span className="text-muted-foreground">Regime:</span>
                          <span className="ml-2 font-medium">{formatRegimeName(rule.regime)}</span>
                        </div>
                      )}
                      {rule.inventoryMin !== null && (
                        <div>
                          <span className="text-muted-foreground">Inv Min:</span>
                          <span className="ml-2 font-medium">{rule.inventoryMin}</span>
                        </div>
                      )}
                      {rule.orderQuantity !== null && (
                        <div>
                          <span className="text-muted-foreground">Order Qty:</span>
                          <span className="ml-2 font-medium">{rule.orderQuantity}</span>
                        </div>
                      )}
                      {rule.requiresApproval === 1 && (
                        <div>
                          <span className="text-muted-foreground">Requires Approval</span>
                          {rule.approvalThreshold !== null && (
                            <span className="ml-2 font-medium">(${rule.approvalThreshold.toLocaleString()})</span>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Negotiation Playbooks Tab */}
        <TabsContent value="playbooks" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Negotiation Playbooks</h3>
              <p className="text-sm text-muted-foreground">
                Regime-aware negotiation strategies and script templates
              </p>
            </div>
            <Button 
              onClick={() => setShowPlaybookDialog(true)}
              data-testid="button-create-playbook"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Playbook
            </Button>
          </div>

          {playbooksLoading ? (
            <div className="flex justify-center p-8">
              <div className="text-muted-foreground">Loading playbooks...</div>
            </div>
          ) : playbooks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8">
                <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No playbooks configured</h3>
                <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                  Create negotiation playbooks tailored to different economic regimes and FDR ranges.
                </p>
                <Button 
                  onClick={() => setShowPlaybookDialog(true)}
                  data-testid="button-create-first-playbook"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Playbook
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {playbooks.map((playbook) => (
                <Card key={playbook.id} data-testid={`card-playbook-${playbook.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-base" data-testid={`text-playbook-name-${playbook.id}`}>
                            {playbook.name}
                          </CardTitle>
                          {playbook.regime && (
                            <Badge variant="outline" data-testid={`badge-playbook-regime-${playbook.id}`}>
                              {formatRegimeName(playbook.regime)}
                            </Badge>
                          )}
                          {playbook.strategy && (
                            <Badge variant="secondary" data-testid={`badge-playbook-strategy-${playbook.id}`}>
                              {playbook.strategy.replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </div>
                        {playbook.description && (
                          <CardDescription data-testid={`text-playbook-description-${playbook.id}`}>
                            {playbook.description}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {playbook.targetDiscount !== null && (
                        <div>
                          <span className="text-muted-foreground">Target Discount:</span>
                          <span className="ml-2 font-medium">{playbook.targetDiscount}%</span>
                        </div>
                      )}
                      {playbook.paymentTerms && (
                        <div>
                          <span className="text-muted-foreground">Payment Terms:</span>
                          <span className="ml-2 font-medium">{playbook.paymentTerms}</span>
                        </div>
                      )}
                      {playbook.usageCount !== null && (
                        <div>
                          <span className="text-muted-foreground">Times Used:</span>
                          <span className="ml-2 font-medium">{playbook.usageCount}</span>
                        </div>
                      )}
                      {playbook.avgSavings !== null && (
                        <div>
                          <span className="text-muted-foreground">Avg Savings:</span>
                          <span className="ml-2 font-medium text-good">{playbook.avgSavings.toFixed(1)}%</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ERP Integration Tab */}
        <TabsContent value="erp" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">ERP Integration</h3>
              <p className="text-sm text-muted-foreground">
                Connect to SAP, Oracle, Dynamics, or other ERP systems
              </p>
            </div>
            <Button 
              onClick={() => setShowErpDialog(true)}
              data-testid="button-create-erp-connection"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Connection
            </Button>
          </div>

          {/* ERP Status Card */}
          {erpStatus && (
            <Card data-testid="card-erp-status-details">
              <CardHeader>
                <CardTitle>Connection Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <span className="text-sm text-muted-foreground">Status:</span>
                    </div>
                    <div>
                      {erpStatus.connected ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Not Connected
                        </Badge>
                      )}
                    </div>
                  </div>

                  {erpStatus.system && (
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <span className="text-sm text-muted-foreground">System:</span>
                      </div>
                      <div className="font-medium">{erpStatus.system.toUpperCase()}</div>
                    </div>
                  )}

                  {erpStatus.lastSync && (
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <span className="text-sm text-muted-foreground">Last Sync:</span>
                      </div>
                      <div className="font-medium">
                        {new Date(erpStatus.lastSync).toLocaleString()}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">Capabilities:</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2">
                        {erpStatus.capabilities.canReadPOs ? (
                          <CheckCircle className="h-4 w-4 text-good" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm">Read POs</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {erpStatus.capabilities.canCreatePOs ? (
                          <CheckCircle className="h-4 w-4 text-good" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm">Create POs</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {erpStatus.capabilities.canUpdatePOs ? (
                          <CheckCircle className="h-4 w-4 text-good" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm">Update POs</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {erpStatus.capabilities.canReadInventory ? (
                          <CheckCircle className="h-4 w-4 text-good" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm">Read Inventory</span>
                      </div>
                    </div>
                  </div>

                  {erpStatus.error && (
                    <div className="p-4 border border-destructive rounded-md bg-destructive/10">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                        <div>
                          <h4 className="font-medium text-destructive">Connection Error</h4>
                          <p className="text-sm text-destructive/90 mt-1">{erpStatus.error}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ERP Connections List */}
          {erpLoading ? (
            <div className="flex justify-center p-8">
              <div className="text-muted-foreground">Loading connections...</div>
            </div>
          ) : erpConnections.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8">
                <LinkIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No ERP connections</h3>
                <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                  Connect to your ERP system to enable automatic PO creation and synchronization.
                </p>
                <Button 
                  onClick={() => setShowErpDialog(true)}
                  data-testid="button-create-first-erp-connection"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Connection
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {erpConnections.map((connection) => (
                <Card key={connection.id} data-testid={`card-erp-connection-${connection.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-base" data-testid={`text-erp-system-${connection.id}`}>
                            {connection.erpSystem.toUpperCase()}
                          </CardTitle>
                          {connection.status === 'active' ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              {connection.status}
                            </Badge>
                          )}
                        </div>
                        {connection.erpVersion && (
                          <CardDescription>Version: {connection.erpVersion}</CardDescription>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" data-testid={`button-edit-erp-${connection.id}`}>
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Auth Method:</span>
                        <span className="ml-2 font-medium">{connection.authMethod || 'N/A'}</span>
                      </div>
                      {connection.lastSync && (
                        <div>
                          <span className="text-muted-foreground">Last Sync:</span>
                          <span className="ml-2 font-medium">
                            {new Date(connection.lastSync).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Execute Confirmation Dialog */}
      <Dialog open={!!confirmExec} onOpenChange={(open) => { if (!open) setConfirmExec(null); }}>
        <DialogContent data-testid="dialog-confirm-execute">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-signal" />
              Confirm Purchase Execution
            </DialogTitle>
            <DialogDescription>
              This will execute a real payment or create a binding Purchase Order. Review carefully before confirming.
            </DialogDescription>
          </DialogHeader>
          {confirmExec && (
            <div className="space-y-4">
              <div className="rounded-md border p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Material</span>
                  <span className="font-medium" data-testid="text-confirm-material">{confirmExec.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Supplier</span>
                  <span className="font-medium" data-testid="text-confirm-supplier">{confirmExec.supplier}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-medium">
                  <span>Total Amount</span>
                  <span data-testid="text-confirm-amount">${confirmExec.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={confirmExec.paymentMethod}
                  onValueChange={(v) => setConfirmExec(prev => prev ? { ...prev, paymentMethod: v as "card" | "ach" | "invoice" } : null)}
                >
                  <SelectTrigger data-testid="select-payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card">Card (Stripe)</SelectItem>
                    <SelectItem value="ach">ACH (Stripe)</SelectItem>
                    <SelectItem value="invoice">Invoice / Net-30 PO</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  If no billing profile or card is on file, execution will automatically fall back to a Purchase Order.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmExec(null)} data-testid="button-cancel-execute">Cancel</Button>
            <Button
              onClick={() => {
                if (!confirmExec) return;
                setExecutingId(confirmExec.id);
                executeMutation.mutate({ id: confirmExec.id, paymentMethod: confirmExec.paymentMethod });
              }}
              disabled={executeMutation.isPending}
              data-testid="button-confirm-execute"
            >
              {executeMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Executing…</>
              ) : (
                <><Zap className="h-4 w-4 mr-2" />Execute Purchase</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Rule Dialog - Multi-step Wizard */}
      <Dialog open={showRuleDialog} onOpenChange={(open) => { setShowRuleDialog(open); if (!open) resetRuleForm(); }}>
        <DialogContent className="max-w-2xl" data-testid="dialog-create-rule">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Create PO Automation Rule
            </DialogTitle>
            <DialogDescription>
              Set up intelligent purchasing automation in 3 easy steps
            </DialogDescription>
          </DialogHeader>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2 py-2">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center gap-2">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    ruleWizardStep === step 
                      ? "bg-primary text-primary-foreground" 
                      : ruleWizardStep > step 
                        ? "bg-green-600 text-white" 
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {ruleWizardStep > step ? <CheckCircle className="h-4 w-4" /> : step}
                </div>
                <span className={`text-sm hidden sm:inline ${ruleWizardStep === step ? "font-medium" : "text-muted-foreground"}`}>
                  {step === 1 ? "Choose Template" : step === 2 ? "Configure Rule" : "Review & Create"}
                </span>
                {step < 3 && <ArrowRight className="h-4 w-4 text-muted-foreground mx-2" />}
              </div>
            ))}
          </div>

          <Separator />

          {/* Step 1: Choose Template */}
          {ruleWizardStep === 1 && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h3 className="font-semibold">Start with a template or create from scratch</h3>
                <p className="text-sm text-muted-foreground">Templates provide pre-configured settings to get you started quickly</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ruleTemplates.map((template) => {
                  const IconComponent = template.icon;
                  return (
                    <Card 
                      key={template.id}
                      className={`cursor-pointer transition-all hover-elevate ${ruleForm.useTemplate === template.id ? "ring-2 ring-primary" : ""}`}
                      onClick={() => applyTemplate(template.id)}
                      data-testid={`template-${template.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${template.color}`}>
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm">{template.name}</h4>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="text-center">
                <Button 
                  variant="ghost" 
                  onClick={() => setRuleWizardStep(2)}
                  className="text-muted-foreground"
                >
                  Skip templates, create from scratch
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Configure Rule */}
          {ruleWizardStep === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label className="flex items-center gap-2">
                    Rule Name
                    <Badge variant="outline" className="text-xs">Required</Badge>
                  </Label>
                  <Input 
                    placeholder="e.g., Low Stock Auto-Reorder"
                    value={ruleForm.name}
                    onChange={(e) => setRuleForm(prev => ({ ...prev, name: e.target.value }))}
                    data-testid="input-rule-name"
                    className="text-base"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Description (optional)</Label>
                  <Textarea 
                    placeholder="Describe what this rule does and when it should trigger..."
                    value={ruleForm.description}
                    onChange={(e) => setRuleForm(prev => ({ ...prev, description: e.target.value }))}
                    data-testid="input-rule-description"
                    rows={2}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  What should trigger this rule?
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Select the condition that will automatically generate a purchase order</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {Object.entries(triggerTypeInfo).map(([key, info]) => {
                    const IconComponent = info.icon;
                    return (
                      <Card 
                        key={key}
                        className={`cursor-pointer transition-all p-3 ${ruleForm.triggerType === key ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"}`}
                        onClick={() => setRuleForm(prev => ({ ...prev, triggerType: key }))}
                        data-testid={`trigger-${key}`}
                      >
                        <div className="flex items-center gap-2">
                          <IconComponent className={`h-4 w-4 ${ruleForm.triggerType === key ? "text-primary" : "text-muted-foreground"}`} />
                          <div>
                            <p className="text-sm font-medium">{info.label}</p>
                            <p className="text-xs text-muted-foreground">{info.description}</p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    Priority Level
                    <Badge variant="secondary" className="text-xs">{ruleForm.priority}</Badge>
                  </Label>
                  <Slider 
                    value={[ruleForm.priority]} 
                    onValueChange={(value) => setRuleForm(prev => ({ ...prev, priority: value[0] }))}
                    min={1}
                    max={100}
                    step={1}
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Low priority</span>
                    <span>High priority</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    Order Quantity Range
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      placeholder="Min"
                      value={ruleForm.minQuantity}
                      onChange={(e) => setRuleForm(prev => ({ ...prev, minQuantity: parseInt(e.target.value) || 0 }))}
                      className="w-24"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input 
                      type="number" 
                      placeholder="Max"
                      value={ruleForm.maxQuantity}
                      onChange={(e) => setRuleForm(prev => ({ ...prev, maxQuantity: parseInt(e.target.value) || 0 }))}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">units</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review & Create */}
          {ruleWizardStep === 3 && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <ShieldCheck className="h-12 w-12 mx-auto text-good" />
                <h3 className="font-semibold">Review Your Rule</h3>
                <p className="text-sm text-muted-foreground">Confirm the settings before activating</p>
              </div>

              <Card className="bg-muted/30">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Rule Name</span>
                    <span className="font-medium">{ruleForm.name || "Untitled Rule"}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Trigger</span>
                    <Badge variant="outline">{triggerTypeInfo[ruleForm.triggerType]?.label || ruleForm.triggerType}</Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Priority</span>
                    <span className="font-medium">{ruleForm.priority}/100</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Quantity Range</span>
                    <span className="font-medium">{ruleForm.minQuantity.toLocaleString()} - {ruleForm.maxQuantity.toLocaleString()} units</span>
                  </div>
                  {ruleForm.description && (
                    <>
                      <Separator />
                      <div>
                        <span className="text-sm text-muted-foreground">Description</span>
                        <p className="text-sm mt-1">{ruleForm.description}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <Label className="font-medium">Require Manual Approval</Label>
                  <p className="text-xs text-muted-foreground">When enabled, POs wait for your approval before execution</p>
                </div>
                <Switch 
                  checked={ruleForm.approvalRequired}
                  onCheckedChange={(checked) => setRuleForm(prev => ({ ...prev, approvalRequired: checked }))}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {ruleWizardStep > 1 && (
              <Button 
                variant="ghost" 
                onClick={() => setRuleWizardStep(prev => prev - 1)}
                className="order-2 sm:order-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setShowRuleDialog(false)} className="order-3 sm:order-2">
              Cancel
            </Button>
            {ruleWizardStep < 3 ? (
              <Button 
                onClick={() => setRuleWizardStep(prev => prev + 1)}
                disabled={!canProceedToNextStep()}
                className="order-1 sm:order-3"
                data-testid="button-next-step"
              >
                Next Step
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={() => createRuleMutation.mutate(ruleForm)}
                disabled={createRuleMutation.isPending || ruleForm.name.trim() === ""}
                className="order-1 sm:order-3"
                data-testid="button-save-rule"
              >
                {createRuleMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Create Rule
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Playbook Dialog */}
      <Dialog open={showPlaybookDialog} onOpenChange={(open) => { setShowPlaybookDialog(open); if (!open) resetPlaybookForm(); }}>
        <DialogContent className="max-w-lg" data-testid="dialog-create-playbook">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Create Negotiation Playbook
            </DialogTitle>
            <DialogDescription>
              Configure regime-aware negotiation strategies for better procurement outcomes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Playbook Name</Label>
              <Input 
                placeholder="e.g., Recession Negotiation Tactics"
                value={playbookForm.name}
                onChange={(e) => setPlaybookForm(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-playbook-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                placeholder="Describe this playbook's approach..."
                value={playbookForm.description}
                onChange={(e) => setPlaybookForm(prev => ({ ...prev, description: e.target.value }))}
                data-testid="input-playbook-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trigger Regime</Label>
                <Select 
                  value={playbookForm.triggerRegime}
                  onValueChange={(value) => setPlaybookForm(prev => ({ ...prev, triggerRegime: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select regime" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="healthy_expansion">Healthy Expansion</SelectItem>
                    <SelectItem value="asset_led_growth">Asset Led Growth</SelectItem>
                    <SelectItem value="imbalanced_excess">Imbalanced Excess</SelectItem>
                    <SelectItem value="debt_correction">Debt Correction</SelectItem>
                    <SelectItem value="healthy_deleveraging">Healthy Deleveraging</SelectItem>
                    <SelectItem value="unhealthy_deflation">Unhealthy Deflation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Strategy</Label>
                <Select 
                  value={playbookForm.strategy}
                  onValueChange={(value) => setPlaybookForm(prev => ({ ...prev, strategy: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Conservative</SelectItem>
                    <SelectItem value="aggressive">Aggressive</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="opportunistic">Opportunistic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Discount (%)</Label>
                <Input 
                  type="number" 
                  min={0} 
                  max={50}
                  value={playbookForm.discountTarget}
                  onChange={(e) => setPlaybookForm(prev => ({ ...prev, discountTarget: parseInt(e.target.value) || 5 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Terms (Days)</Label>
                <Input 
                  type="number" 
                  min={0} 
                  max={120}
                  value={playbookForm.paymentTermsDays}
                  onChange={(e) => setPlaybookForm(prev => ({ ...prev, paymentTermsDays: parseInt(e.target.value) || 30 }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlaybookDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => createPlaybookMutation.mutate(playbookForm)}
              disabled={createPlaybookMutation.isPending || playbookForm.name.trim() === ""}
              data-testid="button-save-playbook"
            >
              {createPlaybookMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Create Playbook
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add ERP Connection Dialog */}
      <Dialog open={showErpDialog} onOpenChange={(open) => { setShowErpDialog(open); if (!open) resetErpForm(); }}>
        <DialogContent className="max-w-lg" data-testid="dialog-create-erp-connection">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Add ERP Connection
            </DialogTitle>
            <DialogDescription>
              Connect to your enterprise resource planning system for automated PO synchronization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Connection Name</Label>
              <Input 
                placeholder="e.g., Production SAP Instance"
                value={erpForm.name}
                onChange={(e) => setErpForm(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-erp-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ERP System</Label>
                <Select 
                  value={erpForm.erpType}
                  onValueChange={(value) => setErpForm(prev => ({ ...prev, erpType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sap_s4hana">SAP S/4HANA</SelectItem>
                    <SelectItem value="sap_ecc">SAP ECC</SelectItem>
                    <SelectItem value="oracle_erp_cloud">Oracle ERP Cloud</SelectItem>
                    <SelectItem value="oracle_ebs">Oracle E-Business Suite</SelectItem>
                    <SelectItem value="dynamics_365">Microsoft Dynamics 365</SelectItem>
                    <SelectItem value="netsuite">NetSuite</SelectItem>
                    <SelectItem value="infor">Infor</SelectItem>
                    <SelectItem value="custom">Custom/Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Environment</Label>
                <Select 
                  value={erpForm.environment}
                  onValueChange={(value) => setErpForm(prev => ({ ...prev, environment: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="development">Development</SelectItem>
                    <SelectItem value="sandbox">Sandbox</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Connection URL</Label>
              <Input 
                placeholder="https://your-erp-instance.example.com/api"
                value={erpForm.connectionUrl}
                onChange={(e) => setErpForm(prev => ({ ...prev, connectionUrl: e.target.value }))}
                data-testid="input-erp-url"
              />
            </div>
            <div className="space-y-2">
              <Label>Authentication Method</Label>
              <Select 
                value={erpForm.authType}
                onValueChange={(value) => setErpForm(prev => ({ ...prev, authType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                  <SelectItem value="api_key">API Key</SelectItem>
                  <SelectItem value="basic">Basic Auth</SelectItem>
                  <SelectItem value="saml">SAML</SelectItem>
                  <SelectItem value="certificate">Client Certificate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowErpDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => createErpConnectionMutation.mutate(erpForm)}
              disabled={createErpConnectionMutation.isPending || erpForm.name.trim() === ""}
              data-testid="button-save-erp-connection"
            >
              {createErpConnectionMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Add Connection
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
