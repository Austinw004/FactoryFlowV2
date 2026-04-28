import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  MessageSquare,
  Send,
  X,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Bell,
  RefreshCw,
  Lightbulb,
  Zap,
  Minimize2,
  Maximize2,
  Bot,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Settings,
  Activity,
  ShoppingCart,
  Boxes,
  Building,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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

interface AIInsight {
  category: string;
  title: string;
  description: string;
  impact: "positive" | "negative" | "neutral";
  confidence: number;
  source: string;
}

interface ProactiveAlert {
  id: string;
  type: "regime_change" | "event" | "forecast_degradation" | "price_change" | "risk" | "agentic_action";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  recommendation: string;
  timestamp: string;
  actionable?: boolean;
  actionType?: string;
}

interface PendingAction {
  id: string;
  agentId: string;
  agentName: string;
  actionType: string;
  actionPayload: any;
  status: string;
  estimatedImpact: any;
  economicRegime: string;
  approvalDeadline: string;
  createdAt: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: AIAction[];
  insights?: AIInsight[];
  suggestedActions?: AIAction[];
  timestamp: Date;
  isAgentic?: boolean;
}

interface ChatResponse {
  message: string;
  actions?: AIAction[];
  insights?: AIInsight[];
}

interface AgenticChatResponse {
  response: string;
  suggestedActions: AIAction[];
  canAutoExecute: boolean;
  context: {
    regime: string;
    fdr: number;
    timestamp: string;
  };
}

interface AlertsResponse {
  alerts: ProactiveAlert[];
}

const impactColors = {
  positive: "text-green-600",
  negative: "text-red-600",
  neutral: "text-muted-foreground"
};

const severityStyles = {
  info: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  warning: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  critical: "bg-red-500/15 text-red-700 border-red-500/30"
};

const actionTypeIcons: Record<string, typeof ShoppingCart> = {
  create_po: ShoppingCart,
  rebalance_inventory: Boxes,
  adjust_safety_stock: Boxes,
  assess_supplier_risk: Building,
};

export function AIAssistant() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId] = useState(`conv_${Date.now()}`);
  const [activeTab, setActiveTab] = useState<"chat" | "actions" | "alerts">("chat");
  const [agenticMode, setAgenticMode] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [, setLocation] = useLocation();

  const { data: alertsData, refetch: refetchAlerts } = useQuery<AlertsResponse>({
    queryKey: ["/api/ai/alerts"],
    enabled: isOpen,
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: pendingActions, refetch: refetchPendingActions } = useQuery<PendingAction[]>({
    queryKey: ["/api/agentic/actions/pending"],
    enabled: isOpen && activeTab === "actions",
    refetchInterval: 30 * 1000,
  });

  const { data: agenticStats } = useQuery<{ completedToday: number; totalSavings: number }>({
    queryKey: ["/api/agentic/stats"],
    enabled: isOpen,
  });

  const alerts = alertsData?.alerts || [];
  const hasAlerts = alerts.length > 0;
  const criticalAlerts = alerts.filter(a => a.severity === "critical");
  const pendingCount = pendingActions?.length || 0;

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      if (agenticMode) {
        const res = await apiRequest("POST", "/api/agentic/assistant/chat", {
          message,
          conversationId
        });
        return res.json() as Promise<AgenticChatResponse>;
      } else {
        const res = await apiRequest("POST", "/api/ai/chat", {
          message,
          conversationId
        });
        return res.json() as Promise<ChatResponse>;
      }
    },
    onSuccess: (data) => {
      if ('response' in data) {
        setMessages(prev => [...prev, {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: data.response,
          suggestedActions: data.suggestedActions,
          timestamp: new Date(),
          isAgentic: true
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: data.message,
          actions: data.actions,
          insights: data.insights,
          timestamp: new Date()
        }]);
      }
    }
  });

  const actionMutation = useMutation({
    mutationFn: async (action: AIAction) => {
      const res = await apiRequest("POST", "/api/ai/action", { action });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.redirect) {
        setLocation(data.redirect);
        setIsOpen(false);
      }
    }
  });

  const executeAgenticAction = useMutation({
    mutationFn: async ({ actionType, parameters }: { actionType: string; parameters?: any }) => {
      const res = await apiRequest("POST", "/api/agentic/assistant/execute", {
        actionType,
        parameters
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Action Executed",
        description: data.message || "Action completed successfully",
      });
      setMessages(prev => [...prev, {
        id: `msg_${Date.now()}`,
        role: "assistant",
        content: `Action completed: ${data.result?.message || 'Success'}`,
        timestamp: new Date(),
        isAgentic: true
      }]);
    }
  });

  const approveActionMutation = useMutation({
    mutationFn: async (actionId: string) => {
      const res = await apiRequest("POST", `/api/agentic/actions/${actionId}/approve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agentic/actions/pending"] });
      toast({ title: "Action Approved", description: "The action has been approved and queued for execution." });
    }
  });

  const rejectActionMutation = useMutation({
    mutationFn: async (actionId: string) => {
      const res = await apiRequest("POST", `/api/agentic/actions/${actionId}/reject`, { reason: "Rejected via assistant" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agentic/actions/pending"] });
      toast({ title: "Action Rejected", description: "The action has been rejected." });
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return;
    
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    chatMutation.mutate(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (action: AIAction) => {
    if (action.type === "create_po" || action.type === "rebalance_inventory" || action.type === "adjust_safety_stock" || action.type === "assess_supplier_risk") {
      executeAgenticAction.mutate({ actionType: action.type, parameters: action.params });
    } else {
      actionMutation.mutate(action);
    }
  };

  const suggestedQuestions = agenticMode ? [
    "Create a purchase order for low-stock materials",
    "Rebalance inventory across warehouses",
    "Adjust safety stock based on current regime",
    "Optimize procurement timing for current market conditions",
    "Identify supplier risk and suggest alternatives",
    "What autonomous actions are pending?"
  ] : [
    "What's my biggest supply chain risk right now?",
    "Should I buy materials this month?",
    "Which materials should I reorder now?",
    "Analyze procurement cost trends",
    "Which SKUs need attention?",
    "Run a tariff simulation"
  ];

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg relative"
          onClick={() => setIsOpen(true)}
          data-testid="button-ai-assistant-open"
        >
          <Sparkles className="h-6 w-6" />
          {(criticalAlerts.length > 0 || pendingCount > 0) && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-bad rounded-full flex items-center justify-center text-xs text-white">
              {criticalAlerts.length + pendingCount}
            </span>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed z-50 ${isExpanded ? 'inset-4' : 'bottom-6 right-6 w-[420px] h-[650px]'} transition-all duration-200`}>
      <Card className="h-full flex flex-col shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3 border-b">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${agenticMode ? 'bg-purple-500/20' : 'bg-primary/10'}`}>
              {agenticMode ? <Bot className="h-5 w-5 text-purple-500" /> : <Sparkles className="h-5 w-5 text-primary" />}
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {agenticMode ? "Agentic AI" : "AI Assistant"}
                {agenticMode && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Autonomous
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {agenticMode ? "Takes action on your behalf" : "Powered by Prescient Labs"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant={agenticMode ? "default" : "ghost"}
              size="sm"
              onClick={() => setAgenticMode(!agenticMode)}
              className="h-7 text-xs"
              data-testid="button-toggle-agentic"
            >
              <Bot className="h-3 w-3 mr-1" />
              {agenticMode ? "Agentic" : "Basic"}
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              data-testid="button-expand"
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsOpen(false)}
              data-testid="button-close-ai"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          {agenticMode && (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid grid-cols-3 m-2 mb-0">
                <TabsTrigger value="chat" className="text-xs" data-testid="ai-assistant-tab-chat">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="actions" className="text-xs relative" data-testid="ai-assistant-tab-actions">
                  <Zap className="h-3 w-3 mr-1" />
                  Actions
                  {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-signal rounded-full flex items-center justify-center text-[10px] text-white">
                      {pendingCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="alerts" className="text-xs relative" data-testid="ai-assistant-tab-alerts">
                  <Bell className="h-3 w-3 mr-1" />
                  Alerts
                  {hasAlerts && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-bad rounded-full flex items-center justify-center text-[10px] text-white">
                      {alerts.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="flex-1 flex flex-col m-0 overflow-hidden min-h-0">
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <div className="p-4">
                  {messages.length === 0 ? (
                    <div className="space-y-4">
                      <div className="text-center py-4">
                        <div className="mx-auto w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-3">
                          <Bot className="h-6 w-6 text-purple-500" />
                        </div>
                        <h3 className="font-medium mb-1">Agentic AI Ready</h3>
                        <p className="text-sm text-muted-foreground">
                          I can take autonomous actions for you
                        </p>
                      </div>

                      {agenticStats && (
                        <div className="grid grid-cols-2 gap-2 text-center">
                          <div className="p-2 bg-muted rounded-lg">
                            <p className="text-lg font-bold text-green-600">{agenticStats?.completedToday || 0}</p>
                            <p className="text-[10px] text-muted-foreground">Actions Today</p>
                          </div>
                          <div className="p-2 bg-muted rounded-lg">
                            <p className="text-lg font-bold">${(agenticStats?.totalSavings || 0).toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground">Savings This Month</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground px-1">I can help with:</p>
                        {suggestedQuestions.map((q, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            className="w-full justify-start text-left h-auto py-2 px-3 text-sm"
                            onClick={() => {
                              setInput(q);
                              textareaRef.current?.focus();
                            }}
                            data-testid={`button-suggested-${idx}`}
                          >
                            <Zap className="h-3 w-3 mr-2 flex-shrink-0 text-purple-500" />
                            <span className="line-clamp-1">{q}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[85%] ${msg.role === "user" ? "bg-primary text-primary-foreground" : msg.isAgentic ? "bg-purple-500/10 border border-purple-500/20" : "bg-muted"} rounded-lg p-3`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            
                            {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-foreground/10 space-y-2">
                                <p className="text-xs font-medium flex items-center gap-1">
                                  <Bot className="h-3 w-3" /> Suggested Actions
                                </p>
                                {msg.suggestedActions.map((action, idx) => {
                                  const ActionIcon = actionTypeIcons[action.type] || Zap;
                                  return (
                                    <Button
                                      key={idx}
                                      variant="secondary"
                                      size="sm"
                                      className="w-full justify-between h-auto py-2"
                                      onClick={() => handleQuickAction(action)}
                                      disabled={executeAgenticAction.isPending}
                                      data-testid={`button-action-${action.type}`}
                                    >
                                      <span className="text-left flex items-center gap-2">
                                        <ActionIcon className="h-4 w-4 text-purple-500" />
                                        <span>
                                          <span className="block text-xs font-medium">{action.label}</span>
                                          <span className="block text-[10px] text-muted-foreground">{action.description}</span>
                                        </span>
                                      </span>
                                      <div className="flex items-center gap-1">
                                        {action.requiresApproval ? (
                                          <Badge variant="outline" className="text-[10px]">Approval</Badge>
                                        ) : (
                                          <Badge className="text-[10px] bg-green-500">Auto</Badge>
                                        )}
                                        <Play className="h-3 w-3" />
                                      </div>
                                    </Button>
                                  );
                                })}
                              </div>
                            )}
                            
                            {msg.actions && msg.actions.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-foreground/10 space-y-2">
                                <p className="text-xs font-medium flex items-center gap-1">
                                  <Zap className="h-3 w-3" /> Quick Actions
                                </p>
                                {msg.actions.map((action) => (
                                  <Button
                                    key={action.id}
                                    variant="secondary"
                                    size="sm"
                                    className="w-full justify-between h-auto py-2"
                                    onClick={() => handleQuickAction(action)}
                                    data-testid={`button-action-${action.type}`}
                                  >
                                    <span className="text-left">
                                      <span className="block text-xs font-medium">{action.label}</span>
                                      <span className="block text-[10px] text-muted-foreground">{action.description}</span>
                                    </span>
                                    <ChevronRight className="h-4 w-4 flex-shrink-0" />
                                  </Button>
                                ))}
                              </div>
                            )}
                            
                            {msg.insights && msg.insights.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-foreground/10 space-y-2">
                                <p className="text-xs font-medium">Insights</p>
                                {msg.insights.map((insight, idx) => (
                                  <div key={idx} className="bg-background/50 rounded p-2">
                                    <div className="flex items-center gap-2">
                                      {insight.impact === "positive" ? (
                                        <TrendingUp className="h-3 w-3 text-good" />
                                      ) : insight.impact === "negative" ? (
                                        <TrendingDown className="h-3 w-3 text-bad" />
                                      ) : null}
                                      <span className={`text-xs font-medium ${impactColors[insight.impact]}`}>
                                        {insight.title}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1">{insight.description}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            <p className="text-[10px] text-muted-foreground mt-2">
                              {formatDistanceToNow(msg.timestamp, { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                      {chatMutation.isPending && (
                        <div className="flex justify-start">
                          <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/20">
                            <div className="flex items-center gap-2">
                              <RefreshCw className="h-4 w-4 animate-spin text-purple-500" />
                              <span className="text-sm">Analyzing...</span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                  </div>
                </div>
                
                <div className="p-3 border-t">
                  <div className="flex gap-2">
                    <Textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={agenticMode ? "Ask me to take action..." : "Ask about forecasts, risks, timing..."}
                      className="resize-none min-h-[44px] max-h-32"
                      rows={1}
                      data-testid="input-ai-message"
                    />
                    <Button 
                      size="icon"
                      onClick={handleSend}
                      disabled={!input.trim() || chatMutation.isPending}
                      data-testid="button-send-message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="actions" className="flex-1 m-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-sm">Pending Actions</h3>
                    <Button variant="ghost" size="sm" onClick={() => refetchPendingActions()}>
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {!pendingActions || pendingActions.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-10 w-10 text-good mx-auto mb-3" />
                      <p className="text-sm font-medium">All caught up!</p>
                      <p className="text-xs text-muted-foreground">No actions awaiting approval</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingActions.map((action) => {
                        const ActionIcon = actionTypeIcons[action.actionType] || Zap;
                        return (
                          <Card key={action.id} className="p-3 border-l-4 border-l-yellow-500">
                            <div className="flex items-start gap-2 mb-2">
                              <div className="p-1.5 bg-yellow-500/20 rounded">
                                <ActionIcon className="h-4 w-4 text-signal" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{action.agentName}</p>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {action.actionPayload?.materialName || action.actionPayload?.totalTransfers + " transfers"}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-[10px]">
                                <Clock className="h-2 w-2 mr-1" />
                                {formatDistanceToNow(new Date(action.approvalDeadline))}
                              </Badge>
                            </div>
                            
                            {action.estimatedImpact && (
                              <div className="flex items-center gap-2 text-xs text-green-600 mb-2">
                                <TrendingUp className="h-3 w-3" />
                                <span>${action.estimatedImpact.costSavings?.toLocaleString()} savings</span>
                                <span className="text-muted-foreground">
                                  ({(action.estimatedImpact.confidence * 100).toFixed(0)}% confidence)
                                </span>
                              </div>
                            )}
                            
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="flex-1 h-7 text-xs"
                                onClick={() => rejectActionMutation.mutate(action.id)}
                                disabled={rejectActionMutation.isPending}
                                data-testid={`button-reject-${action.id}`}
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Reject
                              </Button>
                              <Button 
                                size="sm" 
                                className="flex-1 h-7 text-xs"
                                onClick={() => approveActionMutation.mutate(action.id)}
                                disabled={approveActionMutation.isPending}
                                data-testid={`button-approve-${action.id}`}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approve
                              </Button>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                  
                  <div className="mt-4 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      className="w-full text-xs"
                      onClick={() => setLocation("/agentic-ai")}
                      data-testid="button-open-agentic-settings"
                    >
                      <Settings className="h-3 w-3 mr-2" />
                      Configure Agentic AI Settings
                      <ChevronRight className="h-3 w-3 ml-auto" />
                    </Button>
                  </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="alerts" className="flex-1 m-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-sm">Proactive Alerts</h3>
                    <Button variant="ghost" size="sm" onClick={() => refetchAlerts()}>
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {alerts.length === 0 ? (
                    <div className="text-center py-8">
                      <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-sm font-medium">No alerts</p>
                      <p className="text-xs text-muted-foreground">We'll notify you of important events</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {alerts.map((alert) => (
                        <div 
                          key={alert.id}
                          className={`p-3 rounded-lg border ${severityStyles[alert.severity]}`}
                        >
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{alert.title}</p>
                              <p className="text-xs mt-1 opacity-90">{alert.description}</p>
                              <p className="text-xs mt-2 font-medium">
                                Recommendation: {alert.recommendation}
                              </p>
                              <p className="text-[10px] mt-2 opacity-60">
                                {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
          
          {!agenticMode && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="p-4">
                {messages.length === 0 ? (
                  <div className="space-y-4">
                    <div className="text-center py-6">
                      <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <MessageSquare className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-medium mb-1">How can I help?</h3>
                      <p className="text-sm text-muted-foreground">
                        Ask me about forecasts, risks, or market timing
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground px-1">Try asking:</p>
                      {suggestedQuestions.map((q, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          className="w-full justify-start text-left h-auto py-2 px-3 text-sm"
                          onClick={() => {
                            setInput(q);
                            textareaRef.current?.focus();
                          }}
                          data-testid={`button-suggested-${idx}`}
                        >
                          <Lightbulb className="h-3 w-3 mr-2 flex-shrink-0 text-signal" />
                          <span className="line-clamp-1">{q}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"} rounded-lg p-3`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          
                          {msg.actions && msg.actions.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-foreground/10 space-y-2">
                              <p className="text-xs font-medium flex items-center gap-1">
                                <Zap className="h-3 w-3" /> Quick Actions
                              </p>
                              {msg.actions.map((action) => (
                                <Button
                                  key={action.id}
                                  variant="secondary"
                                  size="sm"
                                  className="w-full justify-between h-auto py-2"
                                  onClick={() => handleQuickAction(action)}
                                  data-testid={`button-action-${action.type}`}
                                >
                                  <span className="text-left">
                                    <span className="block text-xs font-medium">{action.label}</span>
                                    <span className="block text-[10px] text-muted-foreground">{action.description}</span>
                                  </span>
                                  <ChevronRight className="h-4 w-4 flex-shrink-0" />
                                </Button>
                              ))}
                            </div>
                          )}
                          
                          {msg.insights && msg.insights.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-foreground/10 space-y-2">
                              <p className="text-xs font-medium">Insights</p>
                              {msg.insights.map((insight, idx) => (
                                <div key={idx} className="bg-background/50 rounded p-2">
                                  <div className="flex items-center gap-2">
                                    {insight.impact === "positive" ? (
                                      <TrendingUp className="h-3 w-3 text-good" />
                                    ) : insight.impact === "negative" ? (
                                      <TrendingDown className="h-3 w-3 text-bad" />
                                    ) : null}
                                    <span className={`text-xs font-medium ${impactColors[insight.impact]}`}>
                                      {insight.title}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground mt-1">{insight.description}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <p className="text-[10px] text-muted-foreground mt-2">
                            {formatDistanceToNow(msg.timestamp, { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                    {chatMutation.isPending && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
                </div>
              </div>
              
              <div className="p-3 border-t">
                <div className="flex gap-2">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about forecasts, risks, timing..."
                    className="resize-none min-h-[44px] max-h-32"
                    rows={1}
                    data-testid="input-ai-message"
                  />
                  <Button 
                    size="icon"
                    onClick={handleSend}
                    disabled={!input.trim() || chatMutation.isPending}
                    data-testid="button-send-message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AIAssistant;
