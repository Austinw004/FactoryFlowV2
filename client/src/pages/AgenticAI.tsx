import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Bot,
  Zap,
  Shield,
  Settings,
  Play,
  Pause,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Package,
  ShoppingCart,
  RefreshCw,
  FileText,
  Bell,
  Lock,
  Unlock,
  Activity,
  Brain,
  Target,
  Gauge,
  Calendar,
  DollarSign,
  Layers,
  ChevronRight,
  BarChart3,
  ArrowRight,
  Eye,
  ThumbsUp,
  ThumbsDown,
  History,
  Users,
  Building,
  Boxes,
  CircleDot,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

interface AiAgent {
  id: string;
  name: string;
  description: string;
  agentType: string;
  avatar: string;
  capabilities: string[];
  maxAutonomyLevel: string;
  isEnabled: number;
  priority: number;
  learningEnabled: number;
  confidenceThreshold: number;
  dailyActionLimit: number;
  dailyValueLimit: number | null;
  activeHoursStart: string;
  activeHoursEnd: string;
  activeDays: string[];
  actionsToday?: number;
  valueToday?: number;
  successRate?: number;
}

interface AutomationRule {
  id: string;
  agentId: string;
  name: string;
  description: string;
  category: string;
  triggerType: string;
  triggerConditions: any;
  actionType: string;
  actionConfig: any;
  autonomyLevel: string;
  requiresApproval: number;
  isEnabled: number;
  priority: number;
  executionCount: number;
  lastExecutedAt: string | null;
  successRate: number | null;
  avgSavings: number | null;
}

interface PendingAction {
  id: string;
  agentId: string;
  agentName: string;
  ruleId: string;
  ruleName: string;
  actionType: string;
  actionPayload: any;
  status: string;
  estimatedImpact: any;
  economicRegime: string;
  approvalDeadline: string;
  createdAt: string;
}

interface Guardrail {
  id: string;
  name: string;
  description: string;
  guardrailType: string;
  conditions: any;
  enforcementLevel: string;
  isEnabled: number;
  violationCount: number;
}

interface AgenticStats {
  totalAgents: number;
  activeAgents: number;
  totalRules: number;
  activeRules: number;
  pendingActions: number;
  completedToday: number;
  totalSavings: number;
  avgSuccessRate: number;
}

const agentTypeIcons: Record<string, typeof Bot> = {
  procurement: ShoppingCart,
  inventory: Boxes,
  forecasting: TrendingUp,
  supplier: Building,
  production: Layers,
  custom: Bot,
};

const agentTypeColors: Record<string, string> = {
  procurement: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  inventory: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
  forecasting: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
  supplier: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  production: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30",
  custom: "bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/30",
};

const autonomyLevelLabels: Record<string, { label: string; description: string; color: string }> = {
  suggest: { label: "Suggest Only", description: "AI suggests actions, humans decide", color: "bg-blue-500" },
  auto_draft: { label: "Auto-Draft", description: "AI creates drafts, humans approve", color: "bg-yellow-500" },
  auto_execute: { label: "Auto-Execute", description: "AI executes with notifications", color: "bg-orange-500" },
  full_autonomous: { label: "Full Autonomous", description: "AI acts independently", color: "bg-red-500" },
};

const actionTypeLabels: Record<string, { label: string; icon: typeof ShoppingCart }> = {
  create_po: { label: "Create Purchase Order", icon: ShoppingCart },
  adjust_safety_stock: { label: "Adjust Safety Stock", icon: Package },
  rebalance_inventory: { label: "Rebalance Inventory", icon: RefreshCw },
  generate_rfq: { label: "Generate RFQ", icon: FileText },
  send_alert: { label: "Send Alert", icon: Bell },
  pause_orders: { label: "Pause Orders", icon: Pause },
  escalate: { label: "Escalate Issue", icon: AlertTriangle },
};

const triggerTypeLabels: Record<string, string> = {
  threshold: "Threshold Trigger",
  schedule: "Scheduled Trigger",
  event: "Event-Based Trigger",
  regime_change: "Regime Change Trigger",
  forecast: "Forecast-Based Trigger",
  compound: "Compound Trigger",
};

export default function AgenticAI() {
  const { toast } = useToast();
  const [selectedAgent, setSelectedAgent] = useState<AiAgent | null>(null);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const [showAgentConfig, setShowAgentConfig] = useState(false);

  const { data: stats } = useQuery<AgenticStats>({
    queryKey: ["/api/agentic/stats"],
  });

  const { data: agents, isLoading: agentsLoading } = useQuery<AiAgent[]>({
    queryKey: ["/api/agentic/agents"],
  });

  const { data: rules } = useQuery<AutomationRule[]>({
    queryKey: ["/api/agentic/rules"],
  });

  const { data: pendingActions } = useQuery<PendingAction[]>({
    queryKey: ["/api/agentic/actions/pending"],
  });

  const { data: guardrails } = useQuery<Guardrail[]>({
    queryKey: ["/api/agentic/guardrails"],
  });

  const { data: economicData } = useQuery({
    queryKey: ["/api/economic-indicators"],
  });

  const currentRegime = (economicData as any)?.regime || "UNKNOWN";

  const toggleAgentMutation = useMutation({
    mutationFn: async ({ agentId, enabled }: { agentId: string; enabled: boolean }) => {
      const res = await apiRequest("PATCH", `/api/agentic/agents/${agentId}`, { isEnabled: enabled ? 1 : 0 });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agentic/agents"] });
      toast({ title: "Agent updated", description: "Agent status has been changed." });
    },
  });

  const approveActionMutation = useMutation({
    mutationFn: async (actionId: string) => {
      const res = await apiRequest("POST", `/api/agentic/actions/${actionId}/approve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agentic/actions/pending"] });
      toast({ title: "Action approved", description: "The action has been approved and queued for execution." });
    },
  });

  const rejectActionMutation = useMutation({
    mutationFn: async ({ actionId, reason }: { actionId: string; reason: string }) => {
      const res = await apiRequest("POST", `/api/agentic/actions/${actionId}/reject`, { reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agentic/actions/pending"] });
      toast({ title: "Action rejected", description: "The action has been rejected." });
    },
  });

  const defaultAgents: AiAgent[] = [
    {
      id: "agent_procurement",
      name: "Procurement Agent",
      description: "Automates purchase orders, supplier selection, and order timing based on economic signals",
      agentType: "procurement",
      avatar: "shopping-cart",
      capabilities: ["create_po", "generate_rfq", "supplier_selection", "order_timing"],
      maxAutonomyLevel: "auto_draft",
      isEnabled: 1,
      priority: 90,
      learningEnabled: 1,
      confidenceThreshold: 0.8,
      dailyActionLimit: 50,
      dailyValueLimit: 100000,
      activeHoursStart: "08:00",
      activeHoursEnd: "18:00",
      activeDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      actionsToday: 12,
      valueToday: 45000,
      successRate: 94,
    },
    {
      id: "agent_inventory",
      name: "Inventory Agent",
      description: "Manages inventory levels, rebalancing across locations, and safety stock optimization",
      agentType: "inventory",
      avatar: "boxes",
      capabilities: ["rebalance_inventory", "adjust_safety_stock", "stockout_prevention"],
      maxAutonomyLevel: "auto_execute",
      isEnabled: 1,
      priority: 85,
      learningEnabled: 1,
      confidenceThreshold: 0.75,
      dailyActionLimit: 100,
      dailyValueLimit: null,
      activeHoursStart: "00:00",
      activeHoursEnd: "23:59",
      activeDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
      actionsToday: 28,
      valueToday: 0,
      successRate: 97,
    },
    {
      id: "agent_forecasting",
      name: "Forecasting Agent",
      description: "Continuously monitors forecast accuracy and triggers retraining when needed",
      agentType: "forecasting",
      avatar: "trending-up",
      capabilities: ["trigger_retraining", "forecast_adjustment", "demand_signal_processing"],
      maxAutonomyLevel: "full_autonomous",
      isEnabled: 1,
      priority: 95,
      learningEnabled: 1,
      confidenceThreshold: 0.7,
      dailyActionLimit: 200,
      dailyValueLimit: null,
      activeHoursStart: "00:00",
      activeHoursEnd: "23:59",
      activeDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
      actionsToday: 45,
      valueToday: 0,
      successRate: 99,
    },
    {
      id: "agent_supplier",
      name: "Supplier Agent",
      description: "Monitors supplier risk, performance, and automatically escalates issues",
      agentType: "supplier",
      avatar: "building",
      capabilities: ["risk_monitoring", "performance_tracking", "escalation", "alternative_sourcing"],
      maxAutonomyLevel: "suggest",
      isEnabled: 1,
      priority: 80,
      learningEnabled: 1,
      confidenceThreshold: 0.85,
      dailyActionLimit: 30,
      dailyValueLimit: 50000,
      activeHoursStart: "06:00",
      activeHoursEnd: "20:00",
      activeDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      actionsToday: 5,
      valueToday: 15000,
      successRate: 88,
    },
  ];

  const defaultRules: AutomationRule[] = [
    {
      id: "rule_low_stock_po",
      agentId: "agent_procurement",
      name: "Low Stock Auto-PO",
      description: "Automatically creates purchase orders when inventory falls below reorder point",
      category: "procurement",
      triggerType: "threshold",
      triggerConditions: { metric: "inventory_level", operator: "<", valueType: "reorder_point" },
      actionType: "create_po",
      actionConfig: { quantity: "economic_order_quantity", supplier: "preferred", urgency: "normal" },
      autonomyLevel: "auto_draft",
      requiresApproval: 1,
      isEnabled: 1,
      priority: 90,
      executionCount: 234,
      lastExecutedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      successRate: 96,
      avgSavings: 1250,
    },
    {
      id: "rule_regime_safety",
      agentId: "agent_inventory",
      name: "Regime-Based Safety Stock",
      description: "Adjusts safety stock levels based on economic regime changes",
      category: "inventory",
      triggerType: "regime_change",
      triggerConditions: { fromRegime: "any", monitorAllRegimes: true },
      actionType: "adjust_safety_stock",
      actionConfig: { 
        regimeMultipliers: {
          BUBBLE: 1.5,
          IMBALANCED_EXCESS: 1.3,
          HEALTHY: 1.0,
          IMBALANCED_DEFICIT: 0.8,
          DEPRESSED: 0.7
        }
      },
      autonomyLevel: "auto_execute",
      requiresApproval: 0,
      isEnabled: 1,
      priority: 95,
      executionCount: 18,
      lastExecutedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      successRate: 100,
      avgSavings: 8500,
    },
    {
      id: "rule_rebalance",
      agentId: "agent_inventory",
      name: "Weekly Inventory Rebalance",
      description: "Automatically rebalances inventory across locations every Monday",
      category: "inventory",
      triggerType: "schedule",
      triggerConditions: { cron: "0 6 * * MON", timezone: "America/New_York" },
      actionType: "rebalance_inventory",
      actionConfig: { strategy: "demand_weighted", minimizeTransportCost: true },
      autonomyLevel: "auto_draft",
      requiresApproval: 1,
      isEnabled: 1,
      priority: 70,
      executionCount: 52,
      lastExecutedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      successRate: 92,
      avgSavings: 3200,
    },
    {
      id: "rule_price_spike",
      agentId: "agent_procurement",
      name: "Price Spike Response",
      description: "Pauses orders and alerts when commodity prices spike unexpectedly",
      category: "procurement",
      triggerType: "event",
      triggerConditions: { eventType: "price_spike", threshold: 0.15, lookbackHours: 24 },
      actionType: "pause_orders",
      actionConfig: { duration: "until_review", notifyRoles: ["procurement_manager"] },
      autonomyLevel: "auto_execute",
      requiresApproval: 0,
      isEnabled: 1,
      priority: 100,
      executionCount: 7,
      lastExecutedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      successRate: 100,
      avgSavings: 25000,
    },
    {
      id: "rule_forecast_accuracy",
      agentId: "agent_forecasting",
      name: "Forecast Degradation Alert",
      description: "Triggers model retraining when MAPE exceeds threshold",
      category: "forecasting",
      triggerType: "threshold",
      triggerConditions: { metric: "forecast_mape", operator: ">", value: 15 },
      actionType: "send_alert",
      actionConfig: { 
        channels: ["in_app", "email"],
        priority: "high",
        suggestAction: "retrain_model"
      },
      autonomyLevel: "full_autonomous",
      requiresApproval: 0,
      isEnabled: 1,
      priority: 85,
      executionCount: 12,
      lastExecutedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      successRate: 100,
      avgSavings: 0,
    },
  ];

  const defaultPendingActions: PendingAction[] = [
    {
      id: "action_1",
      agentId: "agent_procurement",
      agentName: "Procurement Agent",
      ruleId: "rule_low_stock_po",
      ruleName: "Low Stock Auto-PO",
      actionType: "create_po",
      actionPayload: {
        materialId: "MAT-2847",
        materialName: "Steel Alloy Grade 304",
        quantity: 5000,
        unit: "kg",
        supplierId: "SUP-125",
        supplierName: "Global Steel Corp",
        estimatedCost: 47500,
        deliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
      status: "awaiting_approval",
      estimatedImpact: {
        costSavings: 2400,
        stockoutRiskReduction: 0.85,
        confidence: 0.92,
      },
      economicRegime: "HEALTHY",
      approvalDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "action_2",
      agentId: "agent_inventory",
      agentName: "Inventory Agent",
      ruleId: "rule_rebalance",
      ruleName: "Weekly Inventory Rebalance",
      actionType: "rebalance_inventory",
      actionPayload: {
        transfers: [
          { from: "Warehouse A", to: "Warehouse C", material: "Aluminum Sheets", quantity: 200 },
          { from: "Warehouse B", to: "Warehouse A", material: "Copper Wire", quantity: 150 },
        ],
        totalTransfers: 2,
        estimatedTransportCost: 1200,
      },
      status: "awaiting_approval",
      estimatedImpact: {
        costSavings: 3800,
        efficiencyGain: 0.12,
        confidence: 0.88,
      },
      economicRegime: "HEALTHY",
      approvalDeadline: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const defaultGuardrails: Guardrail[] = [
    {
      id: "guard_spending",
      name: "Daily Spending Limit",
      description: "Prevents AI from spending more than $100,000 per day",
      guardrailType: "spending_limit",
      conditions: { period: "daily", limit: 100000 },
      enforcementLevel: "hard",
      isEnabled: 1,
      violationCount: 3,
    },
    {
      id: "guard_hours",
      name: "Business Hours Only",
      description: "High-value actions only during business hours",
      guardrailType: "time_restriction",
      conditions: { 
        minValue: 10000,
        allowedHours: ["08:00-18:00"],
        allowedDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      },
      enforcementLevel: "hard",
      isEnabled: 1,
      violationCount: 0,
    },
    {
      id: "guard_regime",
      name: "Regime-Based Caution",
      description: "Extra approval required during volatile regimes",
      guardrailType: "regime_restriction",
      conditions: { 
        cautionRegimes: ["BUBBLE", "IMBALANCED_DEFICIT"],
        requiresExtraApproval: true,
      },
      enforcementLevel: "escalate",
      isEnabled: 1,
      violationCount: 5,
    },
    {
      id: "guard_supplier",
      name: "Approved Suppliers Only",
      description: "AI can only create POs with pre-approved suppliers",
      guardrailType: "supplier_restriction",
      conditions: { 
        onlyApproved: true,
        minRating: 4.0,
      },
      enforcementLevel: "hard",
      isEnabled: 1,
      violationCount: 1,
    },
  ];

  const displayAgents = agents || defaultAgents;
  const displayRules = rules || defaultRules;
  const displayPendingActions = pendingActions || defaultPendingActions;
  const displayGuardrails = guardrails || defaultGuardrails;
  const displayStats = stats || {
    totalAgents: 4,
    activeAgents: 4,
    totalRules: 5,
    activeRules: 5,
    pendingActions: 2,
    completedToday: 85,
    totalSavings: 127500,
    avgSuccessRate: 95.2,
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="text-page-title">
              <Bot className="h-8 w-8 text-primary" />
              Agentic AI Control Center
            </h1>
            <p className="text-muted-foreground" data-testid="text-page-description">
              Configure autonomous AI agents that take intelligent actions on your behalf
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1">
              <Activity className="h-3 w-3 mr-1" />
              Current Regime: <span className="font-bold ml-1">{currentRegime}</span>
            </Badge>
            <Button variant="outline" onClick={() => setShowAgentConfig(true)} data-testid="button-new-agent">
              <Plus className="h-4 w-4 mr-2" />
              New Agent
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-active-agents">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayStats.activeAgents}/{displayStats.totalAgents}</div>
            <p className="text-xs text-muted-foreground">AI agents running</p>
          </CardContent>
        </Card>

        <Card data-testid="card-pending-actions">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{displayStats.pendingActions}</div>
            <p className="text-xs text-muted-foreground">Awaiting your approval</p>
          </CardContent>
        </Card>

        <Card data-testid="card-completed-today">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{displayStats.completedToday}</div>
            <p className="text-xs text-muted-foreground">Autonomous actions</p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-savings">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${displayStats.totalSavings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">This month from AI actions</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList data-testid="tabs-main">
          <TabsTrigger value="agents" data-testid="tab-agents">
            <Bot className="h-4 w-4 mr-2" />
            AI Agents
          </TabsTrigger>
          <TabsTrigger value="rules" data-testid="tab-rules">
            <Zap className="h-4 w-4 mr-2" />
            Automation Rules
          </TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending">
            <Clock className="h-4 w-4 mr-2" />
            Pending Actions
            {displayStats.pendingActions > 0 && (
              <Badge variant="destructive" className="ml-2">{displayStats.pendingActions}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="guardrails" data-testid="tab-guardrails">
            <Shield className="h-4 w-4 mr-2" />
            Guardrails
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            <History className="h-4 w-4 mr-2" />
            Action History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {displayAgents.map((agent) => {
              const IconComponent = agentTypeIcons[agent.agentType] || Bot;
              const colorClass = agentTypeColors[agent.agentType] || agentTypeColors.custom;
              const autonomyInfo = autonomyLevelLabels[agent.maxAutonomyLevel] || autonomyLevelLabels.suggest;
              
              return (
                <Card key={agent.id} className="hover-elevate" data-testid={`card-agent-${agent.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`p-3 rounded-lg ${colorClass}`}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{agent.name}</CardTitle>
                          <CardDescription className="mt-1">{agent.description}</CardDescription>
                        </div>
                      </div>
                      <Switch
                        checked={agent.isEnabled === 1}
                        onCheckedChange={(checked) => toggleAgentMutation.mutate({ agentId: agent.id, enabled: checked })}
                        data-testid={`switch-agent-${agent.id}`}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {agent.capabilities.slice(0, 4).map((cap) => (
                        <Badge key={cap} variant="secondary" className="text-xs">
                          {cap.replace(/_/g, " ")}
                        </Badge>
                      ))}
                      {agent.capabilities.length > 4 && (
                        <Badge variant="secondary" className="text-xs">+{agent.capabilities.length - 4} more</Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-2 bg-muted rounded-lg">
                        <p className="text-lg font-bold">{agent.actionsToday}</p>
                        <p className="text-xs text-muted-foreground">Actions Today</p>
                      </div>
                      <div className="p-2 bg-muted rounded-lg">
                        <p className="text-lg font-bold">{agent.successRate}%</p>
                        <p className="text-xs text-muted-foreground">Success Rate</p>
                      </div>
                      <div className="p-2 bg-muted rounded-lg">
                        <p className="text-lg font-bold">{agent.confidenceThreshold * 100}%</p>
                        <p className="text-xs text-muted-foreground">Confidence</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Autonomy Level</span>
                        <Badge className={autonomyInfo.color}>{autonomyInfo.label}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Daily Limit</span>
                        <span>{agent.dailyActionLimit} actions</span>
                      </div>
                      {agent.dailyValueLimit && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Value Limit</span>
                          <span>${agent.dailyValueLimit.toLocaleString()}/day</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Active Hours</span>
                        <span>{agent.activeHoursStart} - {agent.activeHoursEnd}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between border-t pt-4">
                    <Button variant="outline" size="sm" onClick={() => setSelectedAgent(agent)} data-testid={`button-configure-${agent.id}`}>
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                    <Button variant="ghost" size="sm" data-testid={`button-view-rules-${agent.id}`}>
                      View Rules
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Automation Rules</h3>
              <p className="text-sm text-muted-foreground">Define when and how AI agents take action</p>
            </div>
            <Button onClick={() => setShowRuleBuilder(true)} data-testid="button-new-rule">
              <Plus className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          </div>

          <div className="space-y-3">
            {displayRules.map((rule) => {
              const actionInfo = actionTypeLabels[rule.actionType] || { label: rule.actionType, icon: Zap };
              const ActionIcon = actionInfo.icon;
              
              return (
                <Card key={rule.id} className="hover-elevate" data-testid={`card-rule-${rule.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <ActionIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{rule.name}</h4>
                            <Badge variant="outline" className="text-xs">{triggerTypeLabels[rule.triggerType]}</Badge>
                            {rule.requiresApproval === 1 && (
                              <Badge variant="secondary" className="text-xs">
                                <Lock className="h-3 w-3 mr-1" />
                                Approval Required
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{rule.description}</p>
                          
                          <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Activity className="h-3 w-3" />
                              {rule.executionCount} executions
                            </span>
                            {rule.successRate && (
                              <span className="flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                {rule.successRate}% success
                              </span>
                            )}
                            {rule.avgSavings && rule.avgSavings > 0 && (
                              <span className="flex items-center gap-1 text-green-600">
                                <TrendingUp className="h-3 w-3" />
                                ${rule.avgSavings.toLocaleString()} avg savings
                              </span>
                            )}
                            {rule.lastExecutedAt && (
                              <span>Last run: {formatDistanceToNow(new Date(rule.lastExecutedAt), { addSuffix: true })}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Switch checked={rule.isEnabled === 1} data-testid={`switch-rule-${rule.id}`} />
                        <Button variant="ghost" size="icon" onClick={() => setSelectedRule(rule)} data-testid={`button-edit-rule-${rule.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Pending Actions</h3>
              <p className="text-sm text-muted-foreground">Review and approve AI-recommended actions</p>
            </div>
          </div>

          {displayPendingActions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium">All caught up!</h3>
                <p className="text-muted-foreground">No pending actions require your approval</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {displayPendingActions.map((action) => {
                const actionInfo = actionTypeLabels[action.actionType] || { label: action.actionType, icon: Zap };
                const ActionIcon = actionInfo.icon;
                
                return (
                  <Card key={action.id} className="border-l-4 border-l-yellow-500" data-testid={`card-pending-${action.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-yellow-500/10 rounded-lg">
                            <ActionIcon className="h-5 w-5 text-yellow-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <CardTitle className="text-lg">{actionInfo.label}</CardTitle>
                              <Badge variant="outline">{action.agentName}</Badge>
                            </div>
                            <CardDescription>Triggered by: {action.ruleName}</CardDescription>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="mb-1">
                            <Clock className="h-3 w-3 mr-1" />
                            Deadline: {formatDistanceToNow(new Date(action.approvalDeadline), { addSuffix: true })}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            Created {formatDistanceToNow(new Date(action.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <h4 className="text-sm font-medium mb-3">Action Details</h4>
                        {action.actionType === "create_po" && action.actionPayload && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Material</p>
                              <p className="font-medium">{action.actionPayload.materialName}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Quantity</p>
                              <p className="font-medium">{action.actionPayload.quantity?.toLocaleString()} {action.actionPayload.unit}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Supplier</p>
                              <p className="font-medium">{action.actionPayload.supplierName}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Est. Cost</p>
                              <p className="font-medium">${action.actionPayload.estimatedCost?.toLocaleString()}</p>
                            </div>
                          </div>
                        )}
                        {action.actionType === "rebalance_inventory" && action.actionPayload && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Total Transfers</span>
                              <span className="font-medium">{action.actionPayload.totalTransfers}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Transport Cost</span>
                              <span className="font-medium">${action.actionPayload.estimatedTransportCost?.toLocaleString()}</span>
                            </div>
                            {action.actionPayload.transfers?.map((t: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 text-sm p-2 bg-background rounded">
                                <span>{t.from}</span>
                                <ArrowRight className="h-4 w-4" />
                                <span>{t.to}</span>
                                <span className="text-muted-foreground ml-auto">{t.quantity} {t.material}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 p-3 bg-green-500/10 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Estimated Impact</p>
                          <div className="flex flex-wrap gap-4 mt-1 text-sm">
                            {action.estimatedImpact?.costSavings && (
                              <span className="text-green-600">
                                ${action.estimatedImpact.costSavings.toLocaleString()} savings
                              </span>
                            )}
                            {action.estimatedImpact?.stockoutRiskReduction && (
                              <span>
                                {(action.estimatedImpact.stockoutRiskReduction * 100).toFixed(0)}% risk reduction
                              </span>
                            )}
                            {action.estimatedImpact?.efficiencyGain && (
                              <span>
                                {(action.estimatedImpact.efficiencyGain * 100).toFixed(0)}% efficiency gain
                              </span>
                            )}
                            <span className="text-muted-foreground">
                              Confidence: {(action.estimatedImpact?.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t pt-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          Regime: {action.economicRegime}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => rejectActionMutation.mutate({ actionId: action.id, reason: "Manual rejection" })}
                          disabled={rejectActionMutation.isPending}
                          data-testid={`button-reject-${action.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                        <Button
                          onClick={() => approveActionMutation.mutate(action.id)}
                          disabled={approveActionMutation.isPending}
                          data-testid={`button-approve-${action.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="guardrails" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Safety Guardrails</h3>
              <p className="text-sm text-muted-foreground">Define limits and constraints for AI actions</p>
            </div>
            <Button variant="outline" data-testid="button-new-guardrail">
              <Plus className="h-4 w-4 mr-2" />
              Add Guardrail
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayGuardrails.map((guard) => (
              <Card key={guard.id} data-testid={`card-guardrail-${guard.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Shield className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{guard.name}</CardTitle>
                        <CardDescription className="mt-1">{guard.description}</CardDescription>
                      </div>
                    </div>
                    <Switch checked={guard.isEnabled === 1} data-testid={`switch-guardrail-${guard.id}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Type</span>
                      <Badge variant="outline">{guard.guardrailType.replace(/_/g, " ")}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Enforcement</span>
                      <Badge variant={guard.enforcementLevel === "hard" ? "destructive" : "secondary"}>
                        {guard.enforcementLevel === "hard" ? <Lock className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                        {guard.enforcementLevel}
                      </Badge>
                    </div>
                    {guard.violationCount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Violations</span>
                        <span className="text-red-600">{guard.violationCount} blocked</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Action History</CardTitle>
              <CardDescription>Complete log of all AI agent actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Action history will appear here as agents take actions.</p>
                <p className="text-sm">View completed, rejected, and failed actions with full audit trail.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedAgent} onOpenChange={(open) => !open && setSelectedAgent(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Configure {selectedAgent?.name}
            </DialogTitle>
            <DialogDescription>
              Customize agent behavior, limits, and permissions
            </DialogDescription>
          </DialogHeader>
          
          {selectedAgent && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Autonomy Level</h4>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(autonomyLevelLabels).map(([key, info]) => (
                    <div
                      key={key}
                      className={`p-3 border rounded-lg cursor-pointer hover-elevate ${
                        selectedAgent.maxAutonomyLevel === key ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-3 h-3 rounded-full ${info.color}`} />
                        <span className="font-medium text-sm">{info.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{info.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Confidence Threshold</h4>
                <div className="space-y-2">
                  <Slider
                    value={[selectedAgent.confidenceThreshold * 100]}
                    max={100}
                    min={50}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>50% (More actions)</span>
                    <span className="font-medium">{selectedAgent.confidenceThreshold * 100}%</span>
                    <span>100% (Fewer, safer actions)</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Daily Action Limit</Label>
                  <Input type="number" value={selectedAgent.dailyActionLimit} />
                </div>
                <div className="space-y-2">
                  <Label>Daily Value Limit ($)</Label>
                  <Input type="number" value={selectedAgent.dailyValueLimit || ""} placeholder="No limit" />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Active Hours</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input type="time" value={selectedAgent.activeHoursStart} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input type="time" value={selectedAgent.activeHoursEnd} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Active Days</Label>
                  <div className="flex flex-wrap gap-2">
                    {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => (
                      <Badge
                        key={day}
                        variant={selectedAgent.activeDays.includes(day) ? "default" : "outline"}
                        className="cursor-pointer"
                      >
                        {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Learning Enabled</h4>
                    <p className="text-sm text-muted-foreground">Allow agent to learn from feedback</p>
                  </div>
                  <Switch checked={selectedAgent.learningEnabled === 1} />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAgent(null)}>Cancel</Button>
            <Button>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRuleBuilder} onOpenChange={setShowRuleBuilder}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Create Automation Rule
            </DialogTitle>
            <DialogDescription>
              Define triggers, conditions, and actions for autonomous behavior
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rule Name</Label>
                <Input placeholder="e.g., Low Stock Auto-Reorder" data-testid="input-rule-name" />
              </div>
              <div className="space-y-2">
                <Label>Assign to Agent</Label>
                <Select data-testid="select-rule-agent">
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {displayAgents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Describe what this rule does..." data-testid="input-rule-description" />
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Trigger Conditions
              </h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Trigger Type</Label>
                  <Select data-testid="select-trigger-type">
                    <SelectTrigger>
                      <SelectValue placeholder="Select trigger type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="threshold">Threshold (when metric crosses value)</SelectItem>
                      <SelectItem value="schedule">Schedule (run at specific times)</SelectItem>
                      <SelectItem value="event">Event (react to specific events)</SelectItem>
                      <SelectItem value="regime_change">Regime Change (economic shifts)</SelectItem>
                      <SelectItem value="forecast">Forecast (based on predictions)</SelectItem>
                      <SelectItem value="compound">Compound (multiple conditions)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Card className="p-4 bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-3">Configure trigger conditions based on selected type</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Metric</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select metric" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inventory_level">Inventory Level</SelectItem>
                          <SelectItem value="reorder_point">Reorder Point</SelectItem>
                          <SelectItem value="days_of_supply">Days of Supply</SelectItem>
                          <SelectItem value="forecast_mape">Forecast MAPE</SelectItem>
                          <SelectItem value="commodity_price">Commodity Price</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Operator</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="<">Less than</SelectItem>
                          <SelectItem value="<=">Less than or equal</SelectItem>
                          <SelectItem value="=">Equal to</SelectItem>
                          <SelectItem value=">=">Greater than or equal</SelectItem>
                          <SelectItem value=">">Greater than</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Value</Label>
                      <Input type="number" placeholder="Enter value" />
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Action to Take
              </h4>
              <div className="space-y-2">
                <Label>Action Type</Label>
                <Select data-testid="select-action-type">
                  <SelectTrigger>
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="create_po">Create Purchase Order</SelectItem>
                    <SelectItem value="adjust_safety_stock">Adjust Safety Stock</SelectItem>
                    <SelectItem value="rebalance_inventory">Rebalance Inventory</SelectItem>
                    <SelectItem value="generate_rfq">Generate RFQ</SelectItem>
                    <SelectItem value="send_alert">Send Alert</SelectItem>
                    <SelectItem value="pause_orders">Pause Orders</SelectItem>
                    <SelectItem value="escalate">Escalate to Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Execution Settings
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Autonomy Level</Label>
                  <Select data-testid="select-autonomy-level">
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="suggest">Suggest Only</SelectItem>
                      <SelectItem value="auto_draft">Auto-Draft (needs approval)</SelectItem>
                      <SelectItem value="auto_execute">Auto-Execute</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Max Executions/Day</Label>
                  <Input type="number" defaultValue={10} />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch id="requires-approval" defaultChecked />
                  <Label htmlFor="requires-approval">Requires Approval</Label>
                </div>
                <div className="flex-1 space-y-2">
                  <Label>Approval Timeout (hours)</Label>
                  <Input type="number" defaultValue={24} className="w-24" />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRuleBuilder(false)}>Cancel</Button>
            <Button data-testid="button-save-rule">
              <CheckCircle className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
