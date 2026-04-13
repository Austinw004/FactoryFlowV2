import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Zap, Plus, Play, Pause, Trash2, Clock, CheckCircle, XCircle,
  AlertTriangle, Settings, Activity, ChevronRight, MoreHorizontal,
  Package, Truck, Factory, Users, TrendingDown, Shield, Bell,
  FileText, Webhook, Edit3,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TRIGGER_TYPES = [
  { value: "entity_change", label: "Entity Change", description: "When a record is created, updated, or deleted", icon: Activity },
  { value: "threshold", label: "Threshold Breach", description: "When a metric crosses a threshold", icon: AlertTriangle },
  { value: "schedule", label: "Schedule", description: "On a recurring schedule", icon: Clock },
];

const ENTITIES = [
  { value: "material", label: "Material", icon: Package },
  { value: "supplier", label: "Supplier", icon: Truck },
  { value: "machinery", label: "Equipment", icon: Factory },
  { value: "employee", label: "Employee", icon: Users },
  { value: "purchase_order", label: "Purchase Order", icon: FileText },
  { value: "production_run", label: "Production Run", icon: Activity },
  { value: "inventory", label: "Inventory", icon: Package },
];

const EVENTS = [
  { value: "any", label: "Any change" },
  { value: "create", label: "Created" },
  { value: "update", label: "Updated" },
  { value: "delete", label: "Deleted" },
];

const OPERATORS = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "does not equal" },
  { value: "gt", label: "is greater than" },
  { value: "gte", label: "is at least" },
  { value: "lt", label: "is less than" },
  { value: "lte", label: "is at most" },
  { value: "contains", label: "contains" },
  { value: "changed_to", label: "changed to" },
  { value: "changed_from", label: "changed from" },
];

const ACTION_TYPES = [
  { value: "send_notification", label: "Send Notification", icon: Bell },
  { value: "create_audit_log", label: "Create Audit Log", icon: FileText },
  { value: "create_alert", label: "Create Alert", icon: AlertTriangle },
  { value: "log_message", label: "Log Message", icon: Edit3 },
];

interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  triggerType: string;
  triggerEntity?: string;
  triggerEvent?: string;
  conditions: any[];
  actions: any[];
  executionCount: number;
  lastExecutedAt?: string;
  createdAt: string;
}

function RuleCard({ rule, onToggle, onDelete }: { rule: AutomationRule; onToggle: () => void; onDelete: () => void }) {
  const triggerInfo = TRIGGER_TYPES.find((t) => t.value === rule.triggerType);
  const entityInfo = ENTITIES.find((e) => e.value === rule.triggerEntity);
  const TriggerIcon = triggerInfo?.icon || Activity;
  const EntityIcon = entityInfo?.icon || Package;

  return (
    <Card className={`transition-all ${rule.enabled ? "" : "opacity-60"}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-lg ${rule.enabled ? "bg-primary/10" : "bg-muted"}`}>
            <Zap className={`h-5 w-5 ${rule.enabled ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-sm truncate">{rule.name}</h3>
              <Badge variant={rule.enabled ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                {rule.enabled ? "Active" : "Paused"}
              </Badge>
            </div>
            {rule.description && (
              <p className="text-xs text-muted-foreground mb-2">{rule.description}</p>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <TriggerIcon className="h-3 w-3" />
                <span>{triggerInfo?.label || rule.triggerType}</span>
              </div>
              {entityInfo && (
                <>
                  <ChevronRight className="h-3 w-3" />
                  <div className="flex items-center gap-1">
                    <EntityIcon className="h-3 w-3" />
                    <span>{entityInfo.label}</span>
                  </div>
                </>
              )}
              <ChevronRight className="h-3 w-3" />
              <span>{(rule.actions as any[])?.length || 0} action(s)</span>
            </div>
            <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Play className="h-3 w-3" />
                {rule.executionCount} runs
              </span>
              {rule.lastExecutedAt && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last: {new Date(rule.lastExecutedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={rule.enabled} onCheckedChange={onToggle} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Automations() {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState("entity_change");
  const [triggerEntity, setTriggerEntity] = useState("");
  const [triggerEvent, setTriggerEvent] = useState("any");
  const [conditions, setConditions] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);

  const { data: rules = [], isLoading } = useQuery<AutomationRule[]>({
    queryKey: ["/api/automations"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/automations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      setShowCreate(false);
      resetForm();
      toast({ title: "Automation created", description: "Your automation rule is now active." });
    },
    onError: () => toast({ title: "Error", description: "Failed to create automation", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      apiRequest("PUT", `/api/automations/${id}`, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/automations"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/automations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      toast({ title: "Automation deleted" });
    },
  });

  function resetForm() {
    setName("");
    setDescription("");
    setTriggerType("entity_change");
    setTriggerEntity("");
    setTriggerEvent("any");
    setConditions([]);
    setActions([]);
  }

  function addCondition() {
    setConditions([...conditions, { field: "", operator: "eq", value: "" }]);
  }

  function addAction() {
    setActions([...actions, { type: "send_notification", params: { title: "", message: "" } }]);
  }

  function handleCreate() {
    if (!name.trim()) return;
    createMutation.mutate({
      name,
      description,
      triggerType,
      triggerEntity: triggerEntity || null,
      triggerEvent,
      conditions,
      actions,
    });
  }

  const activeRules = (rules || []).filter((r) => r.enabled);
  const pausedRules = (rules || []).filter((r) => !r.enabled);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Workflow Automations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create rules to automate actions when events occur across your platform
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Automation
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{(rules || []).length}</p>
              <p className="text-xs text-muted-foreground">Total Rules</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeRules.length}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Activity className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {(rules || []).reduce((sum, r) => sum + (r.executionCount || 0), 0)}
              </p>
              <p className="text-xs text-muted-foreground">Total Executions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : (rules || []).length === 0 ? (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <Zap className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h3 className="text-lg font-medium">No automations yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Create your first automation rule to trigger actions when events happen.
              For example: notify when inventory drops below safety stock, or log when a supplier's reliability changes.
            </p>
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Automation
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {activeRules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onToggle={() => toggleMutation.mutate({ id: rule.id, enabled: false })}
              onDelete={() => deleteMutation.mutate(rule.id)}
            />
          ))}
          {pausedRules.length > 0 && (
            <>
              <div className="flex items-center gap-2 pt-4">
                <Pause className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Paused ({pausedRules.length})</span>
              </div>
              {pausedRules.map((rule) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  onToggle={() => toggleMutation.mutate({ id: rule.id, enabled: true })}
                  onDelete={() => deleteMutation.mutate(rule.id)}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              New Automation Rule
            </DialogTitle>
            <DialogDescription>
              Define when this rule triggers and what actions it performs.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Low inventory alert" />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this automation do?" />
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-semibold">Trigger</Label>
                <Select value={triggerType} onValueChange={setTriggerType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {triggerType === "entity_change" && (
                <>
                  <div>
                    <Label>Entity</Label>
                    <Select value={triggerEntity} onValueChange={setTriggerEntity}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select entity..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ENTITIES.map((e) => (
                          <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Event</Label>
                    <Select value={triggerEvent} onValueChange={setTriggerEvent}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EVENTS.map((e) => (
                          <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">Conditions</Label>
                  <Button variant="outline" size="sm" onClick={addCondition} className="h-7 text-xs gap-1">
                    <Plus className="h-3 w-3" />
                    Add Condition
                  </Button>
                </div>
                {conditions.length === 0 && (
                  <p className="text-xs text-muted-foreground">No conditions — rule triggers on every matching event.</p>
                )}
                {conditions.map((cond, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <Input
                      placeholder="Field"
                      value={cond.field}
                      onChange={(e) => {
                        const updated = [...conditions];
                        updated[i] = { ...cond, field: e.target.value };
                        setConditions(updated);
                      }}
                      className="flex-1"
                    />
                    <Select
                      value={cond.operator}
                      onValueChange={(v) => {
                        const updated = [...conditions];
                        updated[i] = { ...cond, operator: v };
                        setConditions(updated);
                      }}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATORS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Value"
                      value={cond.value}
                      onChange={(e) => {
                        const updated = [...conditions];
                        updated[i] = { ...cond, value: e.target.value };
                        setConditions(updated);
                      }}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => setConditions(conditions.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">Actions</Label>
                  <Button variant="outline" size="sm" onClick={addAction} className="h-7 text-xs gap-1">
                    <Plus className="h-3 w-3" />
                    Add Action
                  </Button>
                </div>
                {actions.map((action, i) => (
                  <div key={i} className="border rounded-lg p-3 mb-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <Select
                        value={action.type}
                        onValueChange={(v) => {
                          const updated = [...actions];
                          updated[i] = { ...action, type: v };
                          setActions(updated);
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTION_TYPES.map((a) => (
                            <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => setActions(actions.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Title"
                      value={action.params?.title || ""}
                      onChange={(e) => {
                        const updated = [...actions];
                        updated[i] = { ...action, params: { ...action.params, title: e.target.value } };
                        setActions(updated);
                      }}
                    />
                    <Input
                      placeholder="Message"
                      value={action.params?.message || ""}
                      onChange={(e) => {
                        const updated = [...actions];
                        updated[i] = { ...action, params: { ...action.params, message: e.target.value } };
                        setActions(updated);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Automation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
