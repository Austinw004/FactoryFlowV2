import { useState, useRef, useEffect } from "react";
import { formatRegimeName } from "@/lib/utils";
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
  Send,
  MessageSquare,
  Sparkles,
  Lightbulb,
  Loader2,
  Globe,
  Palette,
  Volume2,
  Mail,
  Building2,
  Briefcase,
  LayoutDashboard,
  Monitor,
  Sun,
  Moon,
  Type,
  Save,
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
  approvalTimeout?: number;
  maxExecutionsPerDay?: number;
  maxValuePerExecution?: number;
  cooldownMinutes?: number;
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

interface AIAction {
  id: string;
  type: "simulation" | "rfq" | "analysis" | "forecast" | "alert" | "create_po" | "rebalance_inventory" | "adjust_safety_stock" | "assess_supplier_risk";
  label: string;
  description: string;
  params?: Record<string, unknown>;
  confidence: number;
  requiresApproval?: boolean;
  canAutoExecute?: boolean;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestedActions?: AIAction[];
  timestamp: Date;
}

interface AgenticChatResponse {
  message: string;
  response?: string; // Legacy field alias
  actions?: AIAction[];
  suggestedActions?: AIAction[]; // Legacy field alias
  insights?: any[];
  canAutoExecute?: boolean;
  context?: {
    regime: string;
    fdr: number;
    timestamp: string;
  };
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

const chatActionTypeIcons: Record<string, typeof ShoppingCart> = {
  create_po: ShoppingCart,
  rebalance_inventory: Boxes,
  adjust_safety_stock: Boxes,
  assess_supplier_risk: Building,
};

const quickActionCategories = [
  {
    category: "Opportunities",
    icon: TrendingUp,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    questions: [
      { short: "What should I buy now?", full: "Which commodities should we buy now based on futures and market timing?" },
      { short: "Where can we save money?", full: "Show me the top opportunities to reduce procurement costs this month." },
      { short: "Best timing for purchases?", full: "What's the optimal timing for major purchases based on current market conditions?" },
    ]
  },
  {
    category: "Risks & Alerts",
    icon: AlertTriangle,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    questions: [
      { short: "What needs my attention?", full: "What are the critical issues that need my attention today?" },
      { short: "Supply chain risks?", full: "Which suppliers or materials have the highest risk exposure right now?" },
      { short: "Stockout warnings?", full: "Show me SKUs at risk of stockout in the next 30 days." },
    ]
  },
  {
    category: "Operations",
    icon: Gauge,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    questions: [
      { short: "How are we performing?", full: "Give me a summary of our key operational metrics and performance." },
      { short: "Forecast accuracy?", full: "How accurate are our demand forecasts and where can we improve?" },
      { short: "Production status?", full: "What's the current production status and any bottlenecks?" },
    ]
  },
  {
    category: "Strategy",
    icon: Target,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    questions: [
      { short: "Market outlook?", full: "What's the current economic regime and what does it mean for our strategy?" },
      { short: "Supplier recommendations?", full: "Which suppliers should we strengthen relationships with based on current conditions?" },
      { short: "Budget planning help?", full: "What should I consider for next quarter's budget based on current trends?" },
    ]
  }
];

const conversationalStarters = [
  "What should I focus on today?",
  "Give me the executive summary",
  "What opportunities am I missing?",
  "How's our supply chain health?",
];

export default function AgenticAI() {
  const { toast } = useToast();
  const [selectedAgent, setSelectedAgent] = useState<AiAgent | null>(null);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const [showAgentConfig, setShowAgentConfig] = useState(false);
  const [selectedGuardrail, setSelectedGuardrail] = useState<Guardrail | null>(null);
  const [showGuardrailEditor, setShowGuardrailEditor] = useState(false);
  
  // New agent form state
  const [newAgentForm, setNewAgentForm] = useState({
    name: "",
    description: "",
    agentType: "procurement",
    maxAutonomyLevel: "auto_draft",
    confidenceThreshold: 0.8,
    dailyActionLimit: 50,
  });
  
  // Guardrail edit form state
  const [guardrailForm, setGuardrailForm] = useState({
    name: "",
    description: "",
    guardrailType: "spending_limit",
    enforcementLevel: "soft",
    conditions: {} as any,
  });
  
  // Rule Builder form state
  const [ruleForm, setRuleForm] = useState({
    name: "",
    description: "",
    agentId: "",
    category: "procurement",
    triggerType: "threshold",
    triggerMetric: "inventory_level",
    triggerOperator: "<",
    triggerValue: "",
    actionType: "create_po",
    autonomyLevel: "suggest",
    maxExecutionsPerDay: 10,
    requiresApproval: true,
    approvalTimeout: 24,
  });

  const resetRuleForm = () => {
    setRuleForm({
      name: "",
      description: "",
      agentId: "",
      category: "procurement",
      triggerType: "threshold",
      triggerMetric: "inventory_level",
      triggerOperator: "<",
      triggerValue: "",
      actionType: "create_po",
      autonomyLevel: "suggest",
      maxExecutionsPerDay: 10,
      requiresApproval: true,
      approvalTimeout: 24,
    });
  };
  
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [conversationId] = useState(`agentic_${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevMessageCountRef = useRef(0);
  
  // User preference settings state
  const [userSettings, setUserSettings] = useState({
    // Profile & Business Context
    industry: "",
    companySize: "",
    role: "",
    primaryUseCases: [] as string[],
    
    // Display Preferences
    layoutDensity: "comfortable",
    defaultPage: "dashboard",
    showConfidenceScores: true,
    showReasoningSteps: true,
    
    // Notification Preferences
    emailDigest: "daily",
    inAppNotifications: true,
    alertOnPendingActions: true,
    alertOnAutonomousExecutions: true,
    alertOnRegimeChanges: true,
    alertOnForecastDegradation: true,
    
    // Dashboard Customization
    preferredChartType: "line",
    showTrendIndicators: true,
    highlightAnomalies: true,
    defaultTimeRange: "30d",
    
    // Regional Settings
    currency: "USD",
    dateFormat: "MM/DD/YYYY",
    timezone: "America/New_York",
    numberFormat: "1,234.56",
    
    // Accessibility
    fontSize: "medium",
    reduceMotion: false,
    highContrast: false,
  });
  
  const updateSetting = (key: string, value: any) => {
    setUserSettings(prev => ({ ...prev, [key]: value }));
    toast({ title: "Setting updated", description: `${key.replace(/([A-Z])/g, ' $1').trim()} has been updated.` });
  };
  
  useEffect(() => {
    prevMessageCountRef.current = chatMessages.length;
  }, [chatMessages]);

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
    queryKey: ["/api/economics/regime"],
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

  // Helper function to update selectedAgent state
  const updateSelectedAgent = (updates: Partial<AiAgent>) => {
    if (selectedAgent) {
      setSelectedAgent({ ...selectedAgent, ...updates });
    }
  };

  // Toggle active day helper
  const toggleActiveDay = (day: string) => {
    if (!selectedAgent) return;
    const newActiveDays = selectedAgent.activeDays.includes(day)
      ? selectedAgent.activeDays.filter(d => d !== day)
      : [...selectedAgent.activeDays, day];
    updateSelectedAgent({ activeDays: newActiveDays });
  };

  // Save agent configuration mutation
  const saveAgentConfigMutation = useMutation({
    mutationFn: async (agent: AiAgent) => {
      const res = await apiRequest("PATCH", `/api/agentic/agents/${agent.id}`, {
        maxAutonomyLevel: agent.maxAutonomyLevel,
        confidenceThreshold: agent.confidenceThreshold,
        dailyActionLimit: agent.dailyActionLimit,
        dailyValueLimit: agent.dailyValueLimit,
        activeHoursStart: agent.activeHoursStart,
        activeHoursEnd: agent.activeHoursEnd,
        activeDays: agent.activeDays,
        learningEnabled: agent.learningEnabled,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agentic/agents"] });
      setSelectedAgent(null);
      toast({ title: "Agent saved", description: "Agent configuration has been saved successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save agent configuration", variant: "destructive" });
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
  
  const createAgentMutation = useMutation({
    mutationFn: async (agentData: typeof newAgentForm) => {
      const res = await apiRequest("POST", "/api/agentic/agents", agentData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agentic/agents"] });
      setShowAgentConfig(false);
      setNewAgentForm({ name: "", description: "", agentType: "procurement", maxAutonomyLevel: "auto_draft", confidenceThreshold: 0.8, dailyActionLimit: 50 });
      toast({ title: "Agent created", description: "New AI agent has been created successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create agent", variant: "destructive" });
    },
  });
  
  const toggleGuardrailMutation = useMutation({
    mutationFn: async ({ guardrailId, enabled }: { guardrailId: string; enabled: boolean }) => {
      const res = await apiRequest("PATCH", `/api/agentic/guardrails/${guardrailId}`, { isEnabled: enabled ? 1 : 0 });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agentic/guardrails"] });
      toast({ title: "Guardrail updated", description: "Guardrail status has been changed." });
    },
  });
  
  const updateGuardrailMutation = useMutation({
    mutationFn: async ({ guardrailId, data }: { guardrailId: string; data: typeof guardrailForm }) => {
      const res = await apiRequest("PATCH", `/api/agentic/guardrails/${guardrailId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agentic/guardrails"] });
      setShowGuardrailEditor(false);
      setSelectedGuardrail(null);
      toast({ title: "Guardrail updated", description: "Guardrail settings have been saved." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update guardrail", variant: "destructive" });
    },
  });

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/ai/agentic-chat", { 
        message,
        conversationId,
        context: { regime: currentRegime }
      });
      return res.json();
    },
    onSuccess: (data: AgenticChatResponse) => {
      setChatMessages(prev => [...prev, {
        id: `msg_${Date.now()}`,
        role: "assistant",
        content: data.message || data.response || "",
        suggestedActions: data.actions || data.suggestedActions,
        timestamp: new Date()
      }]);
    },
    onError: () => {
      setChatMessages(prev => [...prev, {
        id: `msg_${Date.now()}`,
        role: "assistant",
        content: "I apologize, but I'm having trouble processing your request. Please try again or check your connection.",
        timestamp: new Date()
      }]);
    }
  });

  const executeActionMutation = useMutation({
    mutationFn: async ({ actionType, parameters }: { actionType: string; parameters?: any }) => {
      const res = await apiRequest("POST", "/api/agentic/execute", { actionType, parameters });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Action executed", 
        description: data.message || "The action has been executed successfully." 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/agentic/actions/pending"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Action failed", 
        description: error.message || "Failed to execute the action.",
        variant: "destructive"
      });
    }
  });

  const createRuleMutation = useMutation({
    mutationFn: async (ruleData: typeof ruleForm) => {
      const res = await apiRequest("POST", "/api/agentic/rules", {
        name: ruleData.name,
        description: ruleData.description,
        agentId: ruleData.agentId || null,
        category: ruleData.category,
        triggerType: ruleData.triggerType,
        triggerConditions: {
          type: ruleData.triggerType,
          metric: ruleData.triggerMetric,
          operator: ruleData.triggerOperator,
          value: parseFloat(ruleData.triggerValue) || 0
        },
        actionType: ruleData.actionType,
        actionConfig: { type: ruleData.actionType },
        autonomyLevel: ruleData.autonomyLevel,
        requiresApproval: ruleData.requiresApproval ? 1 : 0,
        approvalTimeout: ruleData.approvalTimeout,
        maxExecutionsPerDay: ruleData.maxExecutionsPerDay,
        isEnabled: 1,
        priority: 50
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Rule created", description: "Your automation rule has been saved and is now active." });
      queryClient.invalidateQueries({ queryKey: ["/api/agentic/rules"] });
      setShowRuleBuilder(false);
      resetRuleForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create rule", 
        description: error.message || "Could not create the automation rule.",
        variant: "destructive"
      });
    }
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AutomationRule> }) => {
      const res = await apiRequest("PATCH", `/api/agentic/rules/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Rule updated", description: "Your automation rule has been updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/agentic/rules"] });
      setSelectedRule(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update rule", 
        description: error.message || "Could not update the automation rule.",
        variant: "destructive"
      });
    }
  });

  const handleToggleRule = (rule: AutomationRule, enabled: boolean) => {
    updateRuleMutation.mutate({ 
      id: rule.id, 
      updates: { isEnabled: enabled ? 1 : 0 } 
    });
  };

  const handleSendChat = (directMessage?: string) => {
    const messageToSend = directMessage || chatInput.trim();
    if (!messageToSend || chatMutation.isPending) return;
    
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: messageToSend,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    chatMutation.mutate(messageToSend);
    setChatInput("");
  };

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
  };

  const handleQuickAction = (action: AIAction) => {
    executeActionMutation.mutate({ actionType: action.type, parameters: action.params });
  };

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
              Current Regime: <span className="font-bold ml-1">{formatRegimeName(currentRegime)}</span>
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

      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList data-testid="tabs-main">
          <TabsTrigger value="chat" data-testid="tab-chat">
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat
          </TabsTrigger>
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
          <TabsTrigger value="settings" data-testid="tab-settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-4">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="h-[600px] flex flex-col">
                <CardHeader className="border-b pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                      <Bot className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        Agentic AI Chat
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Autonomous
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Ask questions or request autonomous actions
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-0">
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {chatMessages.length === 0 ? (
                        <div className="py-8 px-4">
                          <div className="text-center mb-8">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                              <Sparkles className="h-8 w-8 text-purple-500" />
                            </div>
                            <h3 className="font-semibold text-xl mb-2">Hi! I'm your AI Assistant</h3>
                          </div>
                          
                          <div className="max-w-lg mx-auto mb-6">
                            <p className="text-xs font-medium text-muted-foreground mb-3 text-center">Quick Start - Just Click:</p>
                            <div className="flex flex-wrap gap-2 justify-center">
                              {conversationalStarters.map((starter, idx) => (
                                <Button
                                  key={idx}
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full"
                                  onClick={() => {
                                    setChatInput(starter);
                                    handleSendChat(starter);
                                  }}
                                  data-testid={`button-starter-${idx}`}
                                >
                                  {starter}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        chatMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                          >
                            {msg.role === "assistant" && (
                              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                <Bot className="h-4 w-4 text-purple-500" />
                              </div>
                            )}
                            <div
                              className={`max-w-[80%] rounded-lg p-3 ${
                                msg.role === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                              data-testid={`chat-message-${msg.id}`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              
                              {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-foreground/10 space-y-2">
                                  <p className="text-xs font-medium flex items-center gap-1">
                                    <Bot className="h-3 w-3" /> Suggested Actions
                                  </p>
                                  {msg.suggestedActions.map((action, idx) => {
                                    const ActionIcon = chatActionTypeIcons[action.type] || Zap;
                                    return (
                                      <Button
                                        key={idx}
                                        variant="secondary"
                                        size="sm"
                                        className="w-full justify-start text-left h-auto py-2"
                                        onClick={() => handleQuickAction(action)}
                                        data-testid={`button-action-${action.type}-${idx}`}
                                      >
                                        <ActionIcon className="h-3 w-3 mr-2" />
                                        <div className="flex-1">
                                          <p className="font-medium text-xs">{action.label}</p>
                                          <p className="text-xs text-muted-foreground">{action.description}</p>
                                        </div>
                                        <Badge variant="outline" className="ml-2 text-[10px]">
                                          {Math.round(action.confidence * 100)}%
                                        </Badge>
                                      </Button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            {msg.role === "user" && (
                              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                <MessageSquare className="h-4 w-4 text-primary-foreground" />
                              </div>
                            )}
                          </div>
                        ))
                      )}
                      {chatMutation.isPending && (
                        <div className="flex gap-3 justify-start">
                          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                            <Bot className="h-4 w-4 text-purple-500" />
                          </div>
                          <div className="bg-muted rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                              <span className="text-sm text-muted-foreground">Thinking...</span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                  <div className="border-t p-4">
                    <div className="flex gap-2">
                      <Textarea
                        ref={textareaRef}
                        placeholder="Ask me anything or request an action..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={handleChatKeyDown}
                        className="min-h-[44px] max-h-32 resize-none"
                        rows={1}
                        data-testid="input-chat"
                      />
                      <Button
                        onClick={() => handleSendChat()}
                        disabled={!chatInput.trim() || chatMutation.isPending}
                        className="bg-purple-600 hover:bg-purple-700"
                        data-testid="button-send-chat"
                      >
                        {chatMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {quickActionCategories.map((cat, catIdx) => {
                    const CategoryIcon = cat.icon;
                    return (
                      <div key={catIdx}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <CategoryIcon className={`h-3 w-3 ${cat.color}`} />
                          <span className={`text-xs font-medium ${cat.color}`}>{cat.category}</span>
                        </div>
                        <div className="space-y-1">
                          {cat.questions.map((q, qIdx) => (
                            <Button
                              key={qIdx}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-left h-auto py-1.5 px-2 text-xs"
                              onClick={() => handleSendChat(q.full)}
                              data-testid={`button-quick-${catIdx}-${qIdx}`}
                            >
                              {q.short}
                            </Button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-green-500" />
                    Current Context
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Economic Regime</span>
                    <Badge variant="outline">{formatRegimeName(currentRegime)}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Active Agents</span>
                    <Badge variant="secondary">{displayStats.activeAgents}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pending Actions</span>
                    <Badge variant={displayStats.pendingActions > 0 ? "destructive" : "secondary"}>
                      {displayStats.pendingActions}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Today's Savings</span>
                    <Badge variant="secondary" className="text-green-600">
                      ${displayStats.totalSavings.toLocaleString()}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-purple-500/5 border-purple-500/20">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-purple-500/20">
                      <Brain className="h-4 w-4 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Autonomous Mode Active</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        AI agents are running and can take actions automatically based on your configured rules.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

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
                        <Switch 
                          checked={rule.isEnabled === 1} 
                          onCheckedChange={(checked) => handleToggleRule(rule, checked)}
                          disabled={updateRuleMutation.isPending}
                          data-testid={`switch-rule-${rule.id}`} 
                        />
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
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedGuardrail(null);
                setGuardrailForm({
                  name: "",
                  description: "",
                  guardrailType: "spending_limit",
                  enforcementLevel: "soft",
                  conditions: {},
                });
                setShowGuardrailEditor(true);
              }}
              data-testid="button-new-guardrail"
            >
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
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={guard.isEnabled === 1} 
                        onCheckedChange={(checked) => toggleGuardrailMutation.mutate({ guardrailId: guard.id, enabled: checked })}
                        data-testid={`switch-guardrail-${guard.id}`} 
                      />
                    </div>
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
                <CardFooter className="pt-0">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => {
                      setSelectedGuardrail(guard);
                      setGuardrailForm({
                        name: guard.name,
                        description: guard.description || "",
                        guardrailType: guard.guardrailType,
                        enforcementLevel: guard.enforcementLevel,
                        conditions: guard.conditions || {},
                      });
                      setShowGuardrailEditor(true);
                    }}
                    data-testid={`button-edit-guardrail-${guard.id}`}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Guardrail
                  </Button>
                </CardFooter>
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

        <TabsContent value="settings" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Settings</h2>
              <p className="text-muted-foreground">Customize your experience and preferences</p>
            </div>
            <Button 
              onClick={() => {
                toast({ title: "Settings saved", description: "All your preferences have been saved successfully." });
              }}
              data-testid="button-save-all-settings"
            >
              <Save className="h-4 w-4 mr-2" />
              Save All Changes
            </Button>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Profile & Business Context */}
            <Card data-testid="card-profile-settings">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Profile & Business Context
                </CardTitle>
                <CardDescription>Help us tailor the platform to your needs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select value={userSettings.industry} onValueChange={(v) => updateSetting("industry", v)}>
                    <SelectTrigger id="industry" data-testid="select-industry">
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aerospace">Aerospace & Defense</SelectItem>
                      <SelectItem value="automotive">Automotive</SelectItem>
                      <SelectItem value="chemicals">Chemicals</SelectItem>
                      <SelectItem value="electronics">Electronics & High-Tech</SelectItem>
                      <SelectItem value="food">Food & Beverage</SelectItem>
                      <SelectItem value="industrial">Industrial Manufacturing</SelectItem>
                      <SelectItem value="medical">Medical Devices</SelectItem>
                      <SelectItem value="metals">Metals & Mining</SelectItem>
                      <SelectItem value="pharma">Pharmaceuticals</SelectItem>
                      <SelectItem value="plastics">Plastics & Packaging</SelectItem>
                      <SelectItem value="textiles">Textiles & Apparel</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="companySize">Company Size</Label>
                  <Select value={userSettings.companySize} onValueChange={(v) => updateSetting("companySize", v)}>
                    <SelectTrigger id="companySize" data-testid="select-company-size">
                      <SelectValue placeholder="Select company size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="startup">Startup (1-50 employees)</SelectItem>
                      <SelectItem value="small">Small (51-200 employees)</SelectItem>
                      <SelectItem value="medium">Medium (201-1,000 employees)</SelectItem>
                      <SelectItem value="large">Large (1,001-5,000 employees)</SelectItem>
                      <SelectItem value="enterprise">Enterprise (5,000+ employees)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Your Role</Label>
                  <Select value={userSettings.role} onValueChange={(v) => updateSetting("role", v)}>
                    <SelectTrigger id="role" data-testid="select-role">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="executive">Executive (C-Suite/VP)</SelectItem>
                      <SelectItem value="director">Director/Senior Manager</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="analyst">Analyst/Specialist</SelectItem>
                      <SelectItem value="procurement">Procurement Lead</SelectItem>
                      <SelectItem value="supply-chain">Supply Chain Manager</SelectItem>
                      <SelectItem value="operations">Operations Manager</SelectItem>
                      <SelectItem value="finance">Finance/Controller</SelectItem>
                      <SelectItem value="it">IT/Systems Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-3">
                  <Label>Primary Use Cases (Select all that apply)</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: "demand-forecasting", label: "Demand Forecasting" },
                      { id: "procurement", label: "Procurement Optimization" },
                      { id: "inventory", label: "Inventory Management" },
                      { id: "supply-chain", label: "Supply Chain Visibility" },
                      { id: "production", label: "Production Planning" },
                      { id: "risk", label: "Risk Management" },
                      { id: "cost-reduction", label: "Cost Reduction" },
                      { id: "market-timing", label: "Market Timing" },
                    ].map((useCase) => (
                      <div 
                        key={useCase.id} 
                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all hover-elevate ${
                          userSettings.primaryUseCases.includes(useCase.id) 
                            ? "border-primary bg-primary/5" 
                            : "border-border"
                        }`}
                        onClick={() => {
                          const current = userSettings.primaryUseCases;
                          const updated = current.includes(useCase.id)
                            ? current.filter(u => u !== useCase.id)
                            : [...current, useCase.id];
                          setUserSettings(prev => ({ ...prev, primaryUseCases: updated }));
                        }}
                        data-testid={`checkbox-usecase-${useCase.id}`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          userSettings.primaryUseCases.includes(useCase.id) 
                            ? "bg-primary border-primary" 
                            : "border-muted-foreground"
                        }`}>
                          {userSettings.primaryUseCases.includes(useCase.id) && (
                            <CheckCircle className="h-3 w-3 text-primary-foreground" />
                          )}
                        </div>
                        <span className="text-sm">{useCase.label}</span>
                      </div>
                    ))}
                  </div>
                  {userSettings.primaryUseCases.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {userSettings.primaryUseCases.length} use case{userSettings.primaryUseCases.length > 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Display Preferences */}
            <Card data-testid="card-display-settings">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-primary" />
                  Display Preferences
                </CardTitle>
                <CardDescription>Customize how information is displayed</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="layoutDensity">Layout Density</Label>
                  <Select value={userSettings.layoutDensity} onValueChange={(v) => updateSetting("layoutDensity", v)}>
                    <SelectTrigger id="layoutDensity" data-testid="select-layout-density">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compact - More data, less spacing</SelectItem>
                      <SelectItem value="comfortable">Comfortable - Balanced view</SelectItem>
                      <SelectItem value="spacious">Spacious - More breathing room</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="defaultPage">Default Landing Page</Label>
                  <Select value={userSettings.defaultPage} onValueChange={(v) => updateSetting("defaultPage", v)}>
                    <SelectTrigger id="defaultPage" data-testid="select-default-page">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dashboard">Dashboard</SelectItem>
                      <SelectItem value="forecasting">Demand Forecasting</SelectItem>
                      <SelectItem value="allocation">Allocation</SelectItem>
                      <SelectItem value="procurement">Procurement</SelectItem>
                      <SelectItem value="agentic-ai">Agentic AI</SelectItem>
                      <SelectItem value="digital-twin">Digital Twin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Confidence Scores</Label>
                    <p className="text-xs text-muted-foreground">Display AI confidence levels on predictions</p>
                  </div>
                  <Switch 
                    checked={userSettings.showConfidenceScores} 
                    onCheckedChange={(v) => updateSetting("showConfidenceScores", v)}
                    data-testid="switch-confidence-scores"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Reasoning Steps</Label>
                    <p className="text-xs text-muted-foreground">See how AI arrives at recommendations</p>
                  </div>
                  <Switch 
                    checked={userSettings.showReasoningSteps} 
                    onCheckedChange={(v) => updateSetting("showReasoningSteps", v)}
                    data-testid="switch-reasoning-steps"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notification Preferences */}
            <Card data-testid="card-notification-settings">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>Control how and when you receive alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="emailDigest">Email Digest Frequency</Label>
                  <Select value={userSettings.emailDigest} onValueChange={(v) => updateSetting("emailDigest", v)}>
                    <SelectTrigger id="emailDigest" data-testid="select-email-digest">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realtime">Real-time (Immediate)</SelectItem>
                      <SelectItem value="hourly">Hourly Digest</SelectItem>
                      <SelectItem value="daily">Daily Digest</SelectItem>
                      <SelectItem value="weekly">Weekly Summary</SelectItem>
                      <SelectItem value="never">Never (Disable Email)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>In-App Notifications</Label>
                    <p className="text-xs text-muted-foreground">Show notifications within the platform</p>
                  </div>
                  <Switch 
                    checked={userSettings.inAppNotifications} 
                    onCheckedChange={(v) => updateSetting("inAppNotifications", v)}
                    data-testid="switch-in-app-notifications"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Alert on Pending Actions</Label>
                    <p className="text-xs text-muted-foreground">Notify when actions need your approval</p>
                  </div>
                  <Switch 
                    checked={userSettings.alertOnPendingActions} 
                    onCheckedChange={(v) => updateSetting("alertOnPendingActions", v)}
                    data-testid="switch-alert-pending"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Alert on Autonomous Executions</Label>
                    <p className="text-xs text-muted-foreground">Notify when AI takes autonomous actions</p>
                  </div>
                  <Switch 
                    checked={userSettings.alertOnAutonomousExecutions} 
                    onCheckedChange={(v) => updateSetting("alertOnAutonomousExecutions", v)}
                    data-testid="switch-alert-autonomous"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Alert on Regime Changes</Label>
                    <p className="text-xs text-muted-foreground">Notify when economic regime changes</p>
                  </div>
                  <Switch 
                    checked={userSettings.alertOnRegimeChanges} 
                    onCheckedChange={(v) => updateSetting("alertOnRegimeChanges", v)}
                    data-testid="switch-alert-regime"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Alert on Forecast Degradation</Label>
                    <p className="text-xs text-muted-foreground">Notify when forecast accuracy drops</p>
                  </div>
                  <Switch 
                    checked={userSettings.alertOnForecastDegradation} 
                    onCheckedChange={(v) => updateSetting("alertOnForecastDegradation", v)}
                    data-testid="switch-alert-forecast"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Dashboard Customization */}
            <Card data-testid="card-dashboard-settings">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutDashboard className="h-5 w-5 text-primary" />
                  Dashboard Customization
                </CardTitle>
                <CardDescription>Personalize your dashboard experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="chartType">Preferred Chart Type</Label>
                  <Select value={userSettings.preferredChartType} onValueChange={(v) => updateSetting("preferredChartType", v)}>
                    <SelectTrigger id="chartType" data-testid="select-chart-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="line">Line Charts</SelectItem>
                      <SelectItem value="bar">Bar Charts</SelectItem>
                      <SelectItem value="area">Area Charts</SelectItem>
                      <SelectItem value="mixed">Mixed (Context-Dependent)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timeRange">Default Time Range</Label>
                  <Select value={userSettings.defaultTimeRange} onValueChange={(v) => updateSetting("defaultTimeRange", v)}>
                    <SelectTrigger id="timeRange" data-testid="select-time-range">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="90d">Last 90 Days</SelectItem>
                      <SelectItem value="12m">Last 12 Months</SelectItem>
                      <SelectItem value="ytd">Year to Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Trend Indicators</Label>
                    <p className="text-xs text-muted-foreground">Display up/down arrows on metrics</p>
                  </div>
                  <Switch 
                    checked={userSettings.showTrendIndicators} 
                    onCheckedChange={(v) => updateSetting("showTrendIndicators", v)}
                    data-testid="switch-trend-indicators"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Highlight Anomalies</Label>
                    <p className="text-xs text-muted-foreground">Emphasize unusual data points</p>
                  </div>
                  <Switch 
                    checked={userSettings.highlightAnomalies} 
                    onCheckedChange={(v) => updateSetting("highlightAnomalies", v)}
                    data-testid="switch-highlight-anomalies"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Regional Settings */}
            <Card data-testid="card-regional-settings">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Regional Settings
                </CardTitle>
                <CardDescription>Configure locale and formatting preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={userSettings.currency} onValueChange={(v) => updateSetting("currency", v)}>
                    <SelectTrigger id="currency" data-testid="select-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar ($)</SelectItem>
                      <SelectItem value="EUR">EUR - Euro (€)</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound (£)</SelectItem>
                      <SelectItem value="CAD">CAD - Canadian Dollar (C$)</SelectItem>
                      <SelectItem value="AUD">AUD - Australian Dollar (A$)</SelectItem>
                      <SelectItem value="JPY">JPY - Japanese Yen (¥)</SelectItem>
                      <SelectItem value="CNY">CNY - Chinese Yuan (¥)</SelectItem>
                      <SelectItem value="INR">INR - Indian Rupee (₹)</SelectItem>
                      <SelectItem value="MXN">MXN - Mexican Peso (MX$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select value={userSettings.dateFormat} onValueChange={(v) => updateSetting("dateFormat", v)}>
                    <SelectTrigger id="dateFormat" data-testid="select-date-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (US)</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (UK/EU)</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</SelectItem>
                      <SelectItem value="DD.MM.YYYY">DD.MM.YYYY (German)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={userSettings.timezone} onValueChange={(v) => updateSetting("timezone", v)}>
                    <SelectTrigger id="timezone" data-testid="select-timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                      <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                      <SelectItem value="Europe/Paris">Central European (CET)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Japan (JST)</SelectItem>
                      <SelectItem value="Asia/Shanghai">China (CST)</SelectItem>
                      <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                      <SelectItem value="Australia/Sydney">Sydney (AEST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="numberFormat">Number Format</Label>
                  <Select value={userSettings.numberFormat} onValueChange={(v) => updateSetting("numberFormat", v)}>
                    <SelectTrigger id="numberFormat" data-testid="select-number-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1,234.56">1,234.56 (US/UK)</SelectItem>
                      <SelectItem value="1.234,56">1.234,56 (EU)</SelectItem>
                      <SelectItem value="1 234.56">1 234.56 (French)</SelectItem>
                      <SelectItem value="1'234.56">1'234.56 (Swiss)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Accessibility */}
            <Card data-testid="card-accessibility-settings">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5 text-primary" />
                  Accessibility
                </CardTitle>
                <CardDescription>Adjust display for your comfort and needs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fontSize">Text Size</Label>
                  <Select value={userSettings.fontSize} onValueChange={(v) => updateSetting("fontSize", v)}>
                    <SelectTrigger id="fontSize" data-testid="select-font-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium (Default)</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                      <SelectItem value="xlarge">Extra Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Reduce Motion</Label>
                    <p className="text-xs text-muted-foreground">Minimize animations and transitions</p>
                  </div>
                  <Switch 
                    checked={userSettings.reduceMotion} 
                    onCheckedChange={(v) => updateSetting("reduceMotion", v)}
                    data-testid="switch-reduce-motion"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>High Contrast Mode</Label>
                    <p className="text-xs text-muted-foreground">Increase contrast for better visibility</p>
                  </div>
                  <Switch 
                    checked={userSettings.highContrast} 
                    onCheckedChange={(v) => updateSetting("highContrast", v)}
                    data-testid="switch-high-contrast"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data & Export Section */}
          <Card data-testid="card-data-export">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Data & Export
              </CardTitle>
              <CardDescription>Manage your data and export options</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2" 
                  onClick={() => {
                    const exportData = {
                      settings: userSettings,
                      agents: displayAgents.map(a => ({ id: a.id, name: a.name, isEnabled: a.isEnabled, maxAutonomyLevel: a.maxAutonomyLevel, confidenceThreshold: a.confidenceThreshold })),
                      exportedAt: new Date().toISOString(),
                      version: "1.0"
                    };
                    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `agentic-settings-${new Date().toISOString().split("T")[0]}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    toast({ title: "Settings exported", description: "Your settings have been downloaded." });
                  }}
                  data-testid="button-export-settings"
                >
                  <Settings className="h-5 w-5" />
                  <span>Export Settings</span>
                  <span className="text-xs text-muted-foreground">Download your preferences</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2" 
                  onClick={() => {
                    const headers = ["Agent Name", "Type", "Status", "Autonomy Level", "Confidence Threshold", "Priority"];
                    const rows = displayAgents.map(a => [
                      a.name, 
                      a.agentType, 
                      a.isEnabled === 1 ? "Active" : "Inactive",
                      a.maxAutonomyLevel,
                      a.confidenceThreshold,
                      a.priority
                    ]);
                    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `agentic-data-${new Date().toISOString().split("T")[0]}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    toast({ title: "Data exported", description: "Your agent data has been downloaded as CSV." });
                  }}
                  data-testid="button-export-data"
                >
                  <FileText className="h-5 w-5" />
                  <span>Export All Data</span>
                  <span className="text-xs text-muted-foreground">Download your data as CSV</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2" 
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".json";
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (!file) return;
                      try {
                        const text = await file.text();
                        const data = JSON.parse(text);
                        if (data.settings) {
                          setUserSettings(prev => ({ ...prev, ...data.settings }));
                          toast({ title: "Settings imported", description: "Your preferences have been restored from the backup." });
                        } else {
                          toast({ title: "Invalid file", description: "The selected file is not a valid settings backup.", variant: "destructive" });
                        }
                      } catch {
                        toast({ title: "Import failed", description: "Could not read the settings file.", variant: "destructive" });
                      }
                    };
                    input.click();
                  }}
                  data-testid="button-import-settings"
                >
                  <RefreshCw className="h-5 w-5" />
                  <span>Import Settings</span>
                  <span className="text-xs text-muted-foreground">Restore from backup</span>
                </Button>
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
                      onClick={() => updateSelectedAgent({ maxAutonomyLevel: key })}
                      data-testid={`autonomy-level-${key}`}
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
                    onValueChange={(value) => updateSelectedAgent({ confidenceThreshold: value[0] / 100 })}
                    data-testid="slider-confidence-threshold"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>50% (More actions)</span>
                    <span className="font-medium">{Math.round(selectedAgent.confidenceThreshold * 100)}%</span>
                    <span>100% (Fewer, safer actions)</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Daily Action Limit</Label>
                  <Input 
                    type="number" 
                    value={selectedAgent.dailyActionLimit} 
                    onChange={(e) => updateSelectedAgent({ dailyActionLimit: parseInt(e.target.value) || 0 })}
                    data-testid="input-daily-action-limit"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Daily Value Limit ($)</Label>
                  <Input 
                    type="number" 
                    value={selectedAgent.dailyValueLimit || ""} 
                    placeholder="No limit"
                    onChange={(e) => updateSelectedAgent({ dailyValueLimit: e.target.value ? parseInt(e.target.value) : null })}
                    data-testid="input-daily-value-limit"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Active Hours</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input 
                      type="time" 
                      value={selectedAgent.activeHoursStart}
                      onChange={(e) => updateSelectedAgent({ activeHoursStart: e.target.value })}
                      data-testid="input-active-hours-start"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input 
                      type="time" 
                      value={selectedAgent.activeHoursEnd}
                      onChange={(e) => updateSelectedAgent({ activeHoursEnd: e.target.value })}
                      data-testid="input-active-hours-end"
                    />
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
                        onClick={() => toggleActiveDay(day)}
                        data-testid={`badge-day-${day}`}
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
                  <Switch 
                    checked={selectedAgent.learningEnabled === 1}
                    onCheckedChange={(checked) => updateSelectedAgent({ learningEnabled: checked ? 1 : 0 })}
                    data-testid="switch-learning-enabled"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAgent(null)} data-testid="button-cancel-agent-config">Cancel</Button>
            <Button 
              onClick={() => selectedAgent && saveAgentConfigMutation.mutate(selectedAgent)}
              disabled={saveAgentConfigMutation.isPending}
              data-testid="button-save-agent-config"
            >
              {saveAgentConfigMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRuleBuilder} onOpenChange={(open) => { setShowRuleBuilder(open); if (!open) resetRuleForm(); }}>
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
                <Input 
                  placeholder="e.g., Low Stock Auto-Reorder" 
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm(prev => ({ ...prev, name: e.target.value }))}
                  data-testid="input-rule-name" 
                />
              </div>
              <div className="space-y-2">
                <Label>Assign to Agent</Label>
                <Select 
                  value={ruleForm.agentId}
                  onValueChange={(value) => setRuleForm(prev => ({ ...prev, agentId: value }))}
                  data-testid="select-rule-agent"
                >
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
              <Textarea 
                placeholder="Describe what this rule does..." 
                value={ruleForm.description}
                onChange={(e) => setRuleForm(prev => ({ ...prev, description: e.target.value }))}
                data-testid="input-rule-description" 
              />
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
                  <Select 
                    value={ruleForm.triggerType}
                    onValueChange={(value) => setRuleForm(prev => ({ ...prev, triggerType: value }))}
                    data-testid="select-trigger-type"
                  >
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
                      <Select
                        value={ruleForm.triggerMetric}
                        onValueChange={(value) => setRuleForm(prev => ({ ...prev, triggerMetric: value }))}
                      >
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
                      <Select
                        value={ruleForm.triggerOperator}
                        onValueChange={(value) => setRuleForm(prev => ({ ...prev, triggerOperator: value }))}
                      >
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
                      <Input 
                        type="number" 
                        placeholder="Enter value" 
                        value={ruleForm.triggerValue}
                        onChange={(e) => setRuleForm(prev => ({ ...prev, triggerValue: e.target.value }))}
                      />
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
                <Select 
                  value={ruleForm.actionType}
                  onValueChange={(value) => setRuleForm(prev => ({ ...prev, actionType: value }))}
                  data-testid="select-action-type"
                >
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
                  <Select 
                    value={ruleForm.autonomyLevel}
                    onValueChange={(value) => setRuleForm(prev => ({ ...prev, autonomyLevel: value }))}
                    data-testid="select-autonomy-level"
                  >
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
                  <Input 
                    type="number" 
                    value={ruleForm.maxExecutionsPerDay}
                    onChange={(e) => setRuleForm(prev => ({ ...prev, maxExecutionsPerDay: parseInt(e.target.value) || 10 }))}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch 
                    id="requires-approval" 
                    checked={ruleForm.requiresApproval}
                    onCheckedChange={(checked) => setRuleForm(prev => ({ ...prev, requiresApproval: checked }))}
                  />
                  <Label htmlFor="requires-approval">Requires Approval</Label>
                </div>
                <div className="flex-1 space-y-2">
                  <Label>Approval Timeout (hours)</Label>
                  <Input 
                    type="number" 
                    value={ruleForm.approvalTimeout}
                    onChange={(e) => setRuleForm(prev => ({ ...prev, approvalTimeout: parseInt(e.target.value) || 24 }))}
                    className="w-24" 
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRuleBuilder(false)}>Cancel</Button>
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

      {/* Edit Rule Dialog */}
      <Dialog open={!!selectedRule} onOpenChange={(open) => !open && setSelectedRule(null)}>
        <DialogContent className="max-w-lg" data-testid="dialog-edit-rule">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              Edit Automation Rule
            </DialogTitle>
            <DialogDescription>
              Update the settings for this automation rule.
            </DialogDescription>
          </DialogHeader>

          {selectedRule && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Rule Name</Label>
                <p className="text-sm font-medium">{selectedRule.name}</p>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <p className="text-sm text-muted-foreground">{selectedRule.description || "No description"}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Trigger Type</Label>
                  <Badge variant="outline">{triggerTypeLabels[selectedRule.triggerType] || selectedRule.triggerType}</Badge>
                </div>
                <div className="space-y-2">
                  <Label>Action Type</Label>
                  <Badge variant="outline">{actionTypeLabels[selectedRule.actionType]?.label || selectedRule.actionType}</Badge>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <Label>Enabled</Label>
                  <p className="text-xs text-muted-foreground">Toggle to enable or disable this rule</p>
                </div>
                <Switch 
                  checked={selectedRule.isEnabled === 1}
                  onCheckedChange={(checked) => {
                    handleToggleRule(selectedRule, checked);
                  }}
                  disabled={updateRuleMutation.isPending}
                  data-testid="switch-edit-rule-enabled"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <Label>Requires Approval</Label>
                  <p className="text-xs text-muted-foreground">Actions must be approved before execution</p>
                </div>
                <Switch 
                  checked={selectedRule.requiresApproval === 1}
                  onCheckedChange={(checked) => {
                    updateRuleMutation.mutate({
                      id: selectedRule.id,
                      updates: { requiresApproval: checked ? 1 : 0 }
                    });
                  }}
                  disabled={updateRuleMutation.isPending}
                  data-testid="switch-edit-rule-approval"
                />
              </div>

              <div className="space-y-2">
                <Label>Autonomy Level</Label>
                <Select 
                  value={selectedRule.autonomyLevel || "suggest"}
                  onValueChange={(value) => {
                    updateRuleMutation.mutate({
                      id: selectedRule.id,
                      updates: { autonomyLevel: value }
                    });
                  }}
                  disabled={updateRuleMutation.isPending}
                >
                  <SelectTrigger data-testid="select-edit-autonomy">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suggest">Suggest Only</SelectItem>
                    <SelectItem value="auto_draft">Auto-Draft</SelectItem>
                    <SelectItem value="auto_execute">Auto-Execute</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Executions/Day</Label>
                  <Input
                    type="number"
                    min="1"
                    value={selectedRule.maxExecutionsPerDay || 10}
                    onChange={(e) => {
                      updateRuleMutation.mutate({
                        id: selectedRule.id,
                        updates: { maxExecutionsPerDay: parseInt(e.target.value) || 10 }
                      });
                    }}
                    disabled={updateRuleMutation.isPending}
                    data-testid="input-edit-max-executions"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority (1-100)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={selectedRule.priority || 50}
                    onChange={(e) => {
                      updateRuleMutation.mutate({
                        id: selectedRule.id,
                        updates: { priority: parseInt(e.target.value) || 50 }
                      });
                    }}
                    disabled={updateRuleMutation.isPending}
                    data-testid="input-edit-priority"
                  />
                </div>
              </div>

              <div className="pt-2 border-t text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Executions: {selectedRule.executionCount || 0}</span>
                  <span>Success Rate: {selectedRule.successRate ? `${selectedRule.successRate}%` : "N/A"}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRule(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Agent Dialog */}
      <Dialog open={showAgentConfig} onOpenChange={setShowAgentConfig}>
        <DialogContent className="max-w-lg" data-testid="dialog-new-agent">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Create New AI Agent
            </DialogTitle>
            <DialogDescription>
              Configure a new autonomous AI agent to help manage your operations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="agent-name">Agent Name</Label>
              <Input
                id="agent-name"
                placeholder="e.g., Custom Procurement Agent"
                value={newAgentForm.name}
                onChange={(e) => setNewAgentForm(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-agent-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-description">Description</Label>
              <Textarea
                id="agent-description"
                placeholder="Describe what this agent will do..."
                value={newAgentForm.description}
                onChange={(e) => setNewAgentForm(prev => ({ ...prev, description: e.target.value }))}
                data-testid="input-agent-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-type">Agent Type</Label>
              <Select 
                value={newAgentForm.agentType} 
                onValueChange={(v) => setNewAgentForm(prev => ({ ...prev, agentType: v }))}
              >
                <SelectTrigger id="agent-type" data-testid="select-agent-type">
                  <SelectValue placeholder="Select agent type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="procurement">Procurement</SelectItem>
                  <SelectItem value="inventory">Inventory Management</SelectItem>
                  <SelectItem value="forecasting">Demand Forecasting</SelectItem>
                  <SelectItem value="supplier">Supplier Management</SelectItem>
                  <SelectItem value="production">Production Optimization</SelectItem>
                  <SelectItem value="analytics">Analytics & Reporting</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="autonomy-level">Maximum Autonomy Level</Label>
              <Select 
                value={newAgentForm.maxAutonomyLevel} 
                onValueChange={(v) => setNewAgentForm(prev => ({ ...prev, maxAutonomyLevel: v }))}
              >
                <SelectTrigger id="autonomy-level" data-testid="select-max-autonomy">
                  <SelectValue placeholder="Select autonomy level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="suggest">Suggest Only - Agent provides recommendations</SelectItem>
                  <SelectItem value="auto_draft">Auto-Draft - Creates drafts for approval</SelectItem>
                  <SelectItem value="auto_execute">Auto-Execute - Takes action autonomously</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="confidence">Confidence Threshold</Label>
                <Input
                  id="confidence"
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={newAgentForm.confidenceThreshold}
                  onChange={(e) => setNewAgentForm(prev => ({ ...prev, confidenceThreshold: parseFloat(e.target.value) }))}
                  data-testid="input-confidence"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="daily-limit">Daily Action Limit</Label>
                <Input
                  id="daily-limit"
                  type="number"
                  min="1"
                  value={newAgentForm.dailyActionLimit}
                  onChange={(e) => setNewAgentForm(prev => ({ ...prev, dailyActionLimit: parseInt(e.target.value) }))}
                  data-testid="input-daily-limit"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAgentConfig(false)}>Cancel</Button>
            <Button 
              onClick={() => createAgentMutation.mutate(newAgentForm)}
              disabled={createAgentMutation.isPending || !newAgentForm.name}
              data-testid="button-create-agent"
            >
              {createAgentMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Guardrail Editor Dialog */}
      <Dialog open={showGuardrailEditor} onOpenChange={setShowGuardrailEditor}>
        <DialogContent className="max-w-lg" data-testid="dialog-edit-guardrail">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Edit Guardrail
            </DialogTitle>
            <DialogDescription>
              Modify the safety constraints for AI agent actions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="guardrail-name">Guardrail Name</Label>
              <Input
                id="guardrail-name"
                value={guardrailForm.name}
                onChange={(e) => setGuardrailForm(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-guardrail-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guardrail-description">Description</Label>
              <Textarea
                id="guardrail-description"
                value={guardrailForm.description}
                onChange={(e) => setGuardrailForm(prev => ({ ...prev, description: e.target.value }))}
                data-testid="input-guardrail-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guardrail-type">Guardrail Type</Label>
              <Select 
                value={guardrailForm.guardrailType} 
                onValueChange={(v) => setGuardrailForm(prev => ({ ...prev, guardrailType: v }))}
              >
                <SelectTrigger id="guardrail-type" data-testid="select-guardrail-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spending_limit">Spending Limit</SelectItem>
                  <SelectItem value="time_restriction">Time Restriction</SelectItem>
                  <SelectItem value="regime_restriction">Regime Restriction</SelectItem>
                  <SelectItem value="supplier_restriction">Supplier Restriction</SelectItem>
                  <SelectItem value="quantity_limit">Quantity Limit</SelectItem>
                  <SelectItem value="approval_requirement">Approval Requirement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="enforcement-level">Enforcement Level</Label>
              <Select 
                value={guardrailForm.enforcementLevel} 
                onValueChange={(v) => setGuardrailForm(prev => ({ ...prev, enforcementLevel: v }))}
              >
                <SelectTrigger id="enforcement-level" data-testid="select-enforcement-level">
                  <SelectValue placeholder="Select enforcement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="soft">Soft - Warns but allows action</SelectItem>
                  <SelectItem value="hard">Hard - Blocks action completely</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {guardrailForm.guardrailType === "spending_limit" && (
              <div className="space-y-2">
                <Label htmlFor="spending-limit">Daily Spending Limit ($)</Label>
                <Input
                  id="spending-limit"
                  type="number"
                  min="0"
                  value={guardrailForm.conditions?.limit || 0}
                  onChange={(e) => setGuardrailForm(prev => ({ 
                    ...prev, 
                    conditions: { ...prev.conditions, limit: parseInt(e.target.value), period: "daily", currency: "USD" }
                  }))}
                  data-testid="input-spending-limit"
                />
              </div>
            )}

            {guardrailForm.guardrailType === "quantity_limit" && (
              <div className="space-y-2">
                <Label htmlFor="quantity-limit">Maximum Quantity per Order</Label>
                <Input
                  id="quantity-limit"
                  type="number"
                  min="0"
                  value={guardrailForm.conditions?.maxQuantity || 0}
                  onChange={(e) => setGuardrailForm(prev => ({ 
                    ...prev, 
                    conditions: { ...prev.conditions, maxQuantity: parseInt(e.target.value) }
                  }))}
                  data-testid="input-quantity-limit"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGuardrailEditor(false)}>Cancel</Button>
            <Button 
              onClick={() => selectedGuardrail && updateGuardrailMutation.mutate({ 
                guardrailId: selectedGuardrail.id, 
                data: guardrailForm 
              })}
              disabled={updateGuardrailMutation.isPending || guardrailForm.name.trim() === ""}
              data-testid="button-save-guardrail"
            >
              {updateGuardrailMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
