import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
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
  ExternalLink,
  Minimize2,
  Maximize2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";

interface AIAction {
  id: string;
  type: "simulation" | "rfq" | "analysis" | "forecast" | "alert";
  label: string;
  description: string;
  params?: Record<string, unknown>;
  confidence: number;
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
  type: "regime_change" | "event" | "forecast_degradation" | "price_change" | "risk";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  recommendation: string;
  timestamp: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: AIAction[];
  insights?: AIInsight[];
  timestamp: Date;
}

interface ChatResponse {
  message: string;
  actions?: AIAction[];
  insights?: AIInsight[];
}

interface AlertsResponse {
  alerts: ProactiveAlert[];
}

const impactColors = {
  positive: "text-green-600 dark:text-green-400",
  negative: "text-red-600 dark:text-red-400",
  neutral: "text-muted-foreground"
};

const severityStyles = {
  info: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  warning: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  critical: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30"
};

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId] = useState(`conv_${Date.now()}`);
  const [showAlerts, setShowAlerts] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [, setLocation] = useLocation();

  const { data: alertsData, refetch: refetchAlerts } = useQuery<AlertsResponse>({
    queryKey: ["/api/ai/alerts"],
    enabled: isOpen,
    refetchInterval: 5 * 60 * 1000,
  });

  const alerts = alertsData?.alerts || [];
  const hasAlerts = alerts.length > 0;
  const criticalAlerts = alerts.filter(a => a.severity === "critical");

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/ai/chat", {
        message,
        conversationId
      });
      return res.json() as Promise<ChatResponse>;
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        id: `msg_${Date.now()}`,
        role: "assistant",
        content: data.message,
        actions: data.actions,
        insights: data.insights,
        timestamp: new Date()
      }]);
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
    actionMutation.mutate(action);
  };

  const suggestedQuestions = [
    "What's my biggest supply chain risk right now?",
    "Should I buy materials this month?",
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
          {criticalAlerts.length > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white">
              {criticalAlerts.length}
            </span>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed z-50 ${isExpanded ? 'inset-4' : 'bottom-6 right-6 w-96 h-[600px]'} transition-all duration-200`}>
      <Card className="h-full flex flex-col shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">AI Assistant</CardTitle>
              <p className="text-xs text-muted-foreground">Powered by Prescient Labs</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {hasAlerts && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowAlerts(!showAlerts)}
                className="relative"
                data-testid="button-toggle-alerts"
              >
                <Bell className="h-4 w-4" />
                {alerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-yellow-500 rounded-full flex items-center justify-center text-[10px] text-white">
                    {alerts.length}
                  </span>
                )}
              </Button>
            )}
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
          {showAlerts && alerts.length > 0 ? (
            <div className="flex-1 overflow-auto p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Proactive Alerts</h3>
                <Button variant="ghost" size="sm" onClick={() => refetchAlerts()}>
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
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
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 p-4">
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
                          <Lightbulb className="h-3 w-3 mr-2 flex-shrink-0 text-yellow-500" />
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
                                      <TrendingUp className="h-3 w-3 text-green-500" />
                                    ) : insight.impact === "negative" ? (
                                      <TrendingDown className="h-3 w-3 text-red-500" />
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
              </ScrollArea>
              
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AIAssistant;
