import { storage } from "../storage";
import { NewsMonitoringService } from "./newsMonitoring";

const newsMonitoringService = new NewsMonitoringService(storage);

export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIResponse {
  message: string;
  actions?: AIAction[];
  insights?: AIInsight[];
  alerts?: ProactiveAlert[];
}

export interface AIAction {
  id: string;
  type: "simulation" | "rfq" | "analysis" | "forecast" | "alert";
  label: string;
  description: string;
  params?: Record<string, unknown>;
  confidence: number;
}

export interface AIInsight {
  category: string;
  title: string;
  description: string;
  impact: "positive" | "negative" | "neutral";
  confidence: number;
  source: string;
}

export interface ProactiveAlert {
  id: string;
  type: "regime_change" | "event" | "forecast_degradation" | "price_change" | "risk";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  recommendation: string;
  timestamp: string;
}

export interface PlatformContext {
  regime: {
    fdr: number;
    regime: string;
    signal: string;
    confidence: number;
  };
  forecasts: {
    totalSkus: number;
    averageMape: number;
    degradedSkus: number;
  };
  events: {
    totalAlerts: number;
    criticalAlerts: number;
    topCategories: string[];
  };
  commodities: {
    totalTracked: number;
    significantChanges: Array<{ name: string; change: number }>;
  };
  inventory: {
    lowStockItems: number;
    totalValue: number;
  };
  suppliers: {
    totalSuppliers: number;
    atRiskSuppliers: number;
  };
}

async function callOpenAI(messages: Array<{ role: string; content: string }>): Promise<string> {
  const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

  if (!baseUrl || !apiKey) {
    console.warn("[AI Assistant] OpenAI credentials not configured, using fallback response");
    return generateFallbackResponse(messages[messages.length - 1]?.content || "");
  }

  try {
    const url = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages,
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[AI Assistant] OpenAI API error:", response.status, errorText);
      return generateFallbackResponse(messages[messages.length - 1]?.content || "");
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "I apologize, I couldn't process that request.";
  } catch (error) {
    console.error("[AI Assistant] OpenAI call failed:", error);
    return generateFallbackResponse(messages[messages.length - 1]?.content || "");
  }
}

function generateFallbackResponse(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes("risk") || lowerMessage.includes("alert")) {
    return "Based on current platform data, I can see your supply chain risk indicators. To get the most accurate analysis, please check the Event Monitoring tab in Strategy Hub for real-time alerts and risk assessments.";
  }
  
  if (lowerMessage.includes("forecast") || lowerMessage.includes("demand")) {
    return "Your demand forecasting system is actively tracking SKU performance. Visit the Demand Hub to see detailed forecast accuracy metrics and predictions.";
  }
  
  if (lowerMessage.includes("buy") || lowerMessage.includes("purchase") || lowerMessage.includes("regime")) {
    return "Market timing recommendations depend on the current economic regime. Check the Strategic Analysis page for FDR-based procurement guidance tailored to current conditions.";
  }
  
  if (lowerMessage.includes("simulation") || lowerMessage.includes("scenario")) {
    return "You can run what-if scenarios in the Strategy Hub under the Scenarios tab. This lets you model different economic conditions and see their impact on your supply chain.";
  }
  
  if (lowerMessage.includes("rfq") || lowerMessage.includes("quote")) {
    return "The automated RFQ system monitors your inventory levels. Navigate to Procurement Hub to see pending RFQs and generate new ones based on current stock levels.";
  }
  
  return "I'm here to help with your manufacturing intelligence needs. You can ask about demand forecasts, supply chain risks, market timing, or procurement strategies. How can I assist you today?";
}

class AIAssistantService {
  private conversationHistory: Map<string, AIMessage[]> = new Map();
  private alertCache: Map<string, ProactiveAlert[]> = new Map();
  private lastAlertCheck: Map<string, number> = new Map();

  async getContext(companyId: string): Promise<PlatformContext> {
    try {
      const [
        skus,
        materials,
        suppliers,
        newsAlerts,
        economicData
      ] = await Promise.all([
        storage.getSkus(companyId).catch(() => []),
        storage.getMaterials(companyId).catch(() => []),
        storage.getSuppliers(companyId).catch(() => []),
        newsMonitoringService.fetchSupplyChainNews(1.0).catch(() => []),
        this.fetchEconomicData().catch(() => null)
      ]);

      const fdr = economicData?.fdr || 1.0;
      const regime = this.getRegimeFromFDR(fdr);

      const lowStockMaterials = materials.filter(m => (m.onHand || 0) <= 10);

      const criticalAlerts = newsAlerts.filter(
        a => a.severity === "critical" || a.severity === "high"
      );

      const categoryCount: Record<string, number> = {};
      newsAlerts.forEach(a => {
        categoryCount[a.category] = (categoryCount[a.category] || 0) + 1;
      });
      const topCategories = Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat]) => cat);

      return {
        regime: {
          fdr,
          regime,
          signal: this.getSignalFromFDR(fdr),
          confidence: 0.85
        },
        forecasts: {
          totalSkus: skus.length,
          averageMape: 0,
          degradedSkus: 0
        },
        events: {
          totalAlerts: newsAlerts.length,
          criticalAlerts: criticalAlerts.length,
          topCategories
        },
        commodities: {
          totalTracked: 0,
          significantChanges: []
        },
        inventory: {
          lowStockItems: lowStockMaterials.length,
          totalValue: materials.reduce((sum, m) => sum + (m.onHand || 0), 0)
        },
        suppliers: {
          totalSuppliers: suppliers.length,
          atRiskSuppliers: 0
        }
      };
    } catch (error) {
      console.error("[AI Assistant] Error getting context:", error);
      return {
        regime: { fdr: 1.0, regime: "Healthy Expansion", signal: "neutral", confidence: 0.5 },
        forecasts: { totalSkus: 0, averageMape: 0, degradedSkus: 0 },
        events: { totalAlerts: 0, criticalAlerts: 0, topCategories: [] },
        commodities: { totalTracked: 0, significantChanges: [] },
        inventory: { lowStockItems: 0, totalValue: 0 },
        suppliers: { totalSuppliers: 0, atRiskSuppliers: 0 }
      };
    }
  }

  private async fetchEconomicData(): Promise<{ fdr: number } | null> {
    try {
      const response = await fetch("https://api.factoryofthefuture.ai/economic-indicators");
      if (response.ok) {
        const data = await response.json();
        return { fdr: data.fdr || 1.0 };
      }
    } catch (error) {
      console.error("[AI Assistant] Failed to fetch economic data:", error);
    }
    return null;
  }

  private getRegimeFromFDR(fdr: number): string {
    if (fdr >= 1.3) return "Bubble Territory";
    if (fdr >= 1.1) return "Overheating";
    if (fdr >= 0.9) return "Healthy Expansion";
    if (fdr >= 0.7) return "Cooling";
    return "Contraction";
  }

  private getSignalFromFDR(fdr: number): string {
    if (fdr >= 1.3) return "sell";
    if (fdr >= 1.1) return "caution";
    if (fdr >= 0.9) return "hold";
    if (fdr >= 0.7) return "accumulate";
    return "buy";
  }

  async chat(
    companyId: string,
    userMessage: string,
    conversationId?: string
  ): Promise<AIResponse> {
    const convId = conversationId || `conv_${Date.now()}`;
    
    if (!this.conversationHistory.has(convId)) {
      this.conversationHistory.set(convId, []);
    }

    const context = await this.getContext(companyId);
    const history = this.conversationHistory.get(convId) || [];

    const systemPrompt = this.buildSystemPrompt(context);

    history.push({ role: "user", content: userMessage });

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content }))
    ];

    const assistantMessage = await callOpenAI(messages);

    history.push({ role: "assistant", content: assistantMessage });
    this.conversationHistory.set(convId, history.slice(-20));

    const actions = this.extractActions(userMessage, context);
    const insights = this.generateInsights(context);

    return {
      message: assistantMessage,
      actions: actions.length > 0 ? actions : undefined,
      insights: insights.length > 0 ? insights : undefined
    };
  }

  private buildSystemPrompt(context: PlatformContext): string {
    return `You are an intelligent manufacturing assistant for Prescient Labs, a supply chain intelligence platform. You help procurement managers and operations teams make smarter decisions.

CURRENT PLATFORM STATE:
- Economic Regime: ${context.regime.regime} (FDR: ${context.regime.fdr.toFixed(2)})
- Market Signal: ${context.regime.signal.toUpperCase()}
- Total SKUs: ${context.forecasts.totalSkus}
- Active supply chain alerts: ${context.events.totalAlerts} (${context.events.criticalAlerts} critical)
- Top event categories: ${context.events.topCategories.join(', ') || 'None'}
- Low stock items: ${context.inventory.lowStockItems}
- Total suppliers: ${context.suppliers.totalSuppliers}

REGIME-SPECIFIC GUIDANCE:
${this.getRegimeGuidance(context.regime.regime)}

CAPABILITIES:
- Answer questions about forecasts, inventory, suppliers, and market conditions
- Recommend procurement timing based on FDR regime
- Analyze supply chain risks and suggest mitigations
- Help with scenario planning and what-if analysis
- Generate RFQ suggestions for low-stock items
- Explain economic indicators and their manufacturing impact

Keep responses concise and actionable. Focus on data-driven recommendations. When uncertain, acknowledge limitations and suggest where to find more information in the platform.`;
  }

  private getRegimeGuidance(regime: string): string {
    const guidance: Record<string, string> = {
      "Bubble Territory": "CAUTION: Market is overheated. Recommend reducing inventory positions, locking in current supplier contracts, and delaying large purchases. Focus on cash preservation.",
      "Overheating": "ALERT: Growth is unsustainable. Consider accelerating critical purchases before prices rise further. Review supplier capacity for potential bottlenecks.",
      "Healthy Expansion": "STABLE: Good time for strategic investments. Optimize inventory levels and negotiate favorable long-term contracts. Monitor for regime changes.",
      "Cooling": "OPPORTUNITY: Prices may be softening. Good time to negotiate better terms. Consider building strategic inventory for critical materials.",
      "Contraction": "AGGRESSIVE BUY: Counter-cyclical opportunity. Lock in low prices on key materials. Strengthen supplier relationships for long-term advantage."
    };
    return guidance[regime] || "Monitor conditions and adjust procurement strategy accordingly.";
  }

  private extractActions(message: string, context: PlatformContext): AIAction[] {
    const actions: AIAction[] = [];
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("simulation") || lowerMessage.includes("what if") || lowerMessage.includes("scenario")) {
      actions.push({
        id: `action_sim_${Date.now()}`,
        type: "simulation",
        label: "Run Scenario Simulation",
        description: "Model the impact of different economic conditions on your supply chain",
        confidence: 0.9
      });
    }

    if (lowerMessage.includes("rfq") || lowerMessage.includes("quote") || lowerMessage.includes("purchase") || 
        (lowerMessage.includes("buy") && (lowerMessage.includes("material") || lowerMessage.includes("stock")))) {
      actions.push({
        id: `action_rfq_${Date.now()}`,
        type: "rfq",
        label: "Generate RFQs",
        description: `Create RFQs for ${context.inventory.lowStockItems} low-stock items`,
        params: { lowStockCount: context.inventory.lowStockItems },
        confidence: 0.85
      });
    }

    if (lowerMessage.includes("forecast") || lowerMessage.includes("demand") || lowerMessage.includes("predict")) {
      actions.push({
        id: `action_forecast_${Date.now()}`,
        type: "forecast",
        label: "View Demand Forecasts",
        description: "See AI-powered demand predictions for your SKUs",
        confidence: 0.85
      });
    }

    if (lowerMessage.includes("risk") || lowerMessage.includes("supplier") || lowerMessage.includes("alert")) {
      actions.push({
        id: `action_analysis_${Date.now()}`,
        type: "analysis",
        label: "Analyze Supply Chain Risks",
        description: `Review ${context.suppliers.atRiskSuppliers} at-risk suppliers and ${context.events.criticalAlerts} critical alerts`,
        confidence: 0.8
      });
    }

    return actions;
  }

  private generateInsights(context: PlatformContext): AIInsight[] {
    const insights: AIInsight[] = [];

    if (context.regime.fdr >= 1.2) {
      insights.push({
        category: "Market Timing",
        title: "Overheated Market Detected",
        description: `FDR at ${context.regime.fdr.toFixed(2)} suggests prices are elevated. Consider delaying non-critical purchases.`,
        impact: "negative",
        confidence: 0.9,
        source: "FDR Model"
      });
    } else if (context.regime.fdr <= 0.8) {
      insights.push({
        category: "Market Timing",
        title: "Counter-Cyclical Opportunity",
        description: `FDR at ${context.regime.fdr.toFixed(2)} indicates favorable buying conditions. Lock in prices on strategic materials.`,
        impact: "positive",
        confidence: 0.9,
        source: "FDR Model"
      });
    }

    if (context.events.criticalAlerts > 0) {
      insights.push({
        category: "Supply Chain Risk",
        title: `${context.events.criticalAlerts} Critical Alerts Active`,
        description: `Supply chain disruptions detected in: ${context.events.topCategories.join(', ')}. Review event monitoring for details.`,
        impact: "negative",
        confidence: 0.85,
        source: "Event Monitoring"
      });
    }

    if (context.inventory.lowStockItems > 0) {
      insights.push({
        category: "Inventory",
        title: `${context.inventory.lowStockItems} Items Below Reorder Point`,
        description: "Materials need replenishment. Consider generating RFQs based on current market conditions.",
        impact: "negative",
        confidence: 0.95,
        source: "Inventory System"
      });
    }

    return insights;
  }

  async checkProactiveAlerts(companyId: string): Promise<ProactiveAlert[]> {
    const now = Date.now();
    const lastCheck = this.lastAlertCheck.get(companyId) || 0;
    
    if (now - lastCheck < 5 * 60 * 1000) {
      return this.alertCache.get(companyId) || [];
    }

    this.lastAlertCheck.set(companyId, now);

    const context = await this.getContext(companyId);
    const alerts: ProactiveAlert[] = [];

    if (context.regime.fdr >= 1.25) {
      alerts.push({
        id: `alert_regime_${now}`,
        type: "regime_change",
        severity: "warning",
        title: "Market Overheating Detected",
        description: `FDR has reached ${context.regime.fdr.toFixed(2)}, indicating bubble territory conditions.`,
        recommendation: "Review procurement strategy. Consider delaying large purchases and locking in existing contracts.",
        timestamp: new Date().toISOString()
      });
    }

    if (context.regime.fdr <= 0.75) {
      alerts.push({
        id: `alert_opportunity_${now}`,
        type: "regime_change",
        severity: "info",
        title: "Counter-Cyclical Buying Opportunity",
        description: `FDR at ${context.regime.fdr.toFixed(2)} suggests favorable market conditions for procurement.`,
        recommendation: "Consider accelerating strategic purchases to lock in favorable pricing.",
        timestamp: new Date().toISOString()
      });
    }

    if (context.events.criticalAlerts >= 3) {
      alerts.push({
        id: `alert_events_${now}`,
        type: "event",
        severity: "critical",
        title: "Multiple Critical Supply Chain Events",
        description: `${context.events.criticalAlerts} critical alerts detected across your supply chain network.`,
        recommendation: "Review Event Monitoring immediately and assess supplier contingency plans.",
        timestamp: new Date().toISOString()
      });
    }

    if (context.inventory.lowStockItems >= 5) {
      alerts.push({
        id: `alert_inventory_${now}`,
        type: "risk",
        severity: "warning",
        title: "Multiple Low Stock Items",
        description: `${context.inventory.lowStockItems} materials are below reorder point.`,
        recommendation: "Navigate to Procurement Hub to generate RFQs for replenishment.",
        timestamp: new Date().toISOString()
      });
    }

    this.alertCache.set(companyId, alerts);
    return alerts;
  }

  async executeAction(companyId: string, action: AIAction): Promise<{ success: boolean; message: string; data?: unknown }> {
    try {
      switch (action.type) {
        case "simulation":
          return {
            success: true,
            message: "Navigate to Strategy Hub > Scenarios to run your simulation.",
            data: { redirect: "/strategy?tab=scenarios" }
          };

        case "rfq":
          const materials = await storage.getMaterials(companyId);
          const lowStock = materials.filter(m => (m.onHand || 0) <= 10);
          return {
            success: true,
            message: `Found ${lowStock.length} materials with low stock. Navigate to Procurement to generate RFQs.`,
            data: { 
              redirect: "/procurement",
              materials: lowStock.slice(0, 5).map(m => ({ 
                id: m.id, 
                name: m.name, 
                onHand: m.onHand 
              }))
            }
          };

        case "forecast":
          return {
            success: true,
            message: "Navigate to the Demand Hub to view demand predictions.",
            data: { redirect: "/demand" }
          };

        case "analysis":
          return {
            success: true,
            message: "Navigate to Event Monitoring for risk analysis.",
            data: { redirect: "/strategy?tab=events" }
          };

        default:
          return {
            success: false,
            message: "Unknown action type"
          };
      }
    } catch (error) {
      console.error("[AI Assistant] Action execution error:", error);
      return {
        success: false,
        message: "Failed to execute action. Please try again."
      };
    }
  }

  clearConversation(conversationId: string): void {
    this.conversationHistory.delete(conversationId);
  }
}

export const aiAssistantService = new AIAssistantService();
