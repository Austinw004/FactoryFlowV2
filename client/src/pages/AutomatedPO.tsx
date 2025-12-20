import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatRegimeName } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, CheckCircle, XCircle, Settings, TrendingUp, 
  AlertCircle, Clock, Zap, Link as LinkIcon, PlayCircle 
} from "lucide-react";
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
            <Button data-testid="button-create-rule">
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
                <Button data-testid="button-create-first-rule">
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
            <Button data-testid="button-create-playbook">
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
                <Button data-testid="button-create-first-playbook">
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
            <Button data-testid="button-create-erp-connection">
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
                <Button data-testid="button-create-first-erp-connection">
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
    </div>
  );
}
