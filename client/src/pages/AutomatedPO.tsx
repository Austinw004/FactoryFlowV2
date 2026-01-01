import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
  Sparkles, ShieldCheck, Info
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
  const [activeTab, setActiveTab] = useState("rules");
  const [showRuleDialog, setShowRuleDialog] = useState(false);
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

  // Toggle PO Rule
  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: number }) => {
      return await apiRequest("PATCH", `/api/po-rules/${id}`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/po-rules"] });
      toast({ title: "Rule updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error updating rule", description: error.message, variant: "destructive" });
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
    onError: (error: Error) => {
      toast({ title: "Error deleting rule", description: error.message, variant: "destructive" });
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
    onError: (error: Error) => {
      toast({ title: "Error creating rule", description: error.message, variant: "destructive" });
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
    onError: (error: Error) => {
      toast({ title: "Error creating playbook", description: error.message, variant: "destructive" });
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
    onError: (error: Error) => {
      toast({ title: "Error creating connection", description: error.message, variant: "destructive" });
    }
  });

  const enabledRules = rules.filter(r => r.enabled === 1);
  const totalRules = rules.length;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          Automated PO Execution
        </h1>
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
                          <span className="ml-2 font-medium text-green-600">{playbook.avgSavings.toFixed(1)}%</span>
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
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm">Read POs</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {erpStatus.capabilities.canCreatePOs ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm">Create POs</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {erpStatus.capabilities.canUpdatePOs ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm">Update POs</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {erpStatus.capabilities.canReadInventory ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
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

      {/* Create Rule Dialog */}
      <Dialog open={showRuleDialog} onOpenChange={(open) => { setShowRuleDialog(open); if (!open) resetRuleForm(); }}>
        <DialogContent className="max-w-lg" data-testid="dialog-create-rule">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Create PO Automation Rule
            </DialogTitle>
            <DialogDescription>
              Configure automated purchase order generation based on inventory and economic conditions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rule Name</Label>
              <Input 
                placeholder="e.g., Low Stock Auto-Reorder"
                value={ruleForm.name}
                onChange={(e) => setRuleForm(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-rule-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                placeholder="Describe what this rule does..."
                value={ruleForm.description}
                onChange={(e) => setRuleForm(prev => ({ ...prev, description: e.target.value }))}
                data-testid="input-rule-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trigger Type</Label>
                <Select 
                  value={ruleForm.triggerType}
                  onValueChange={(value) => setRuleForm(prev => ({ ...prev, triggerType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inventory_low">Inventory Low</SelectItem>
                    <SelectItem value="forecast_demand">Forecast Demand</SelectItem>
                    <SelectItem value="fdr_threshold">FDR Threshold</SelectItem>
                    <SelectItem value="regime_change">Regime Change</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Input 
                  type="number" 
                  min={1} 
                  max={100}
                  value={ruleForm.priority}
                  onChange={(e) => setRuleForm(prev => ({ ...prev, priority: parseInt(e.target.value) || 50 }))}
                />
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Requires Approval</Label>
                <p className="text-xs text-muted-foreground">POs will wait for manual approval</p>
              </div>
              <Switch 
                checked={ruleForm.approvalRequired}
                onCheckedChange={(checked) => setRuleForm(prev => ({ ...prev, approvalRequired: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRuleDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => createRuleMutation.mutate(ruleForm)}
              disabled={createRuleMutation.isPending || ruleForm.name.trim() === ""}
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
