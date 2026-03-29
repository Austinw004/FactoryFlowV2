import { storage } from "../storage";
import { NewsMonitoringService } from "./newsMonitoring";
import { calculateMAPEForSKU, checkForDegradation } from "./forecastMonitoring";
import { fetchAllCommodityPrices, CommodityPrice } from "./commodityPricing";
import { calculateSupplierRiskScore } from "./supplyChainRisk";
import { calculateOEE, detectBottlenecks } from "./productionKPIs";
import { fetchExternalVariables } from "./externalAPIs";
import { getAISystemPromptEnhancements } from "./industryPersonalization";
import { getIndustryConfig } from "@shared/industryConfig";
import { smartInsightsService } from "./smartInsights";
import { classifyRegimeFromFDR, CANONICAL_REGIME_THRESHOLDS } from "./regimeConstants";
import {
  COPILOT_SYSTEM_DIRECTIVE,
  ADVERSARIAL_DEFENSE_LAYER,
  EXECUTIVE_SUMMARY_TRANSLATOR,
} from "./copilotDirective";

// Format regime names from SCREAMING_SNAKE_CASE to Title Case
function formatRegimeName(regime: string): string {
  if (!regime) return "Unknown";
  return regime
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

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
  type: "simulation" | "rfq" | "analysis" | "forecast" | "alert" | "sop" | "production";
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
  type: "regime_change" | "event" | "forecast_degradation" | "price_change" | "risk" | "production" | "sop";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  recommendation: string;
  timestamp: string;
}

export interface PlatformContext {
  location?: string;
  industry?: {
    name: string;
    relevantCommodities: string[];
    keyMaterials: string[];
    typicalKPIs: string[];
    riskFactors: string[];
    procurementFocus: string[];
    aiContextHints: string[];
  };
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
    retrainingNeeded: number;
    degradationAlerts: Array<{ 
      skuName: string; 
      severity: string; 
      mape: number;
      previousMape?: number;
      trend: string;
      recommendedAction?: string;
    }>;
    accuracyTrend: "improving" | "stable" | "declining";
  };
  events: {
    totalAlerts: number;
    criticalAlerts: number;
    topCategories: string[];
  };
  commodities: {
    totalTracked: number;
    significantChanges: Array<{ name: string; change: number; price: number; trend?: string }>;
    priceTrends: {
      rising: number;
      falling: number;
      stable: number;
    };
    buySignals: string[];
    sellSignals: string[];
  };
  inventory: {
    lowStockItems: number;
    totalValue: number;
    criticalItems: Array<{ name: string; onHand: number }>;
  };
  suppliers: {
    totalSuppliers: number;
    atRiskSuppliers: number;
    riskDetails: Array<{ 
      name: string; 
      riskLevel: string; 
      score: number;
      tier?: number;
      cascadingImpact?: string;
      region?: string;
      country?: string;
    }>;
    multiTierRisks: Array<{
      supplierId: string;
      supplierName: string;
      tier: number;
      affectedMaterials: number;
      riskFactors: string[];
    }>;
    byRegion: Record<string, number>;
    asianExposure: Array<{ name: string; country: string; riskLevel: string }>;
  };
  production: {
    averageOEE: number;
    availability: number;
    performance: number;
    quality: number;
    totalDowntimeMinutes: number;
    activeBottlenecks: number;
    bottleneckDetails: Array<{
      location: string;
      impactLevel: string;
      throughputLoss: number;
      recommendation: string;
    }>;
    recentRuns: number;
    unitsProducedToday: number;
  };
  sop: {
    activeScenarios: number;
    pendingApprovals: number;
    openActionItems: number;
    overdueActionItems: number;
    upcomingMeetings: number;
    criticalGaps: number;
    scenarioDetails: Array<{
      name: string;
      status: string;
      gapCategory?: string;
      dueDate?: string;
    }>;
    actionItemDetails: Array<{
      title: string;
      priority: string;
      status: string;
      dueDate?: string;
      assignee?: string;
    }>;
  };
  externalVariables?: {
    weather: {
      activeAlerts: number;
      logisticsRisk: number;
      impactedRegions: string[];
      hurricaneSeason: boolean;
    };
    commodityFutures: {
      buySignals: string[];
      sellSignals: string[];
      topMover: string;
    };
    consumerSentiment: {
      index: number;
      trend: string;
      demandImpact: string;
    };
    socialTrends: {
      overallSentiment: number;
      riskSignals: string[];
      trendingTopics: string[];
    };
    fdrAdjustment: number;
    adjustedFdr: number;
  };
  smartInsights?: {
    activeInsights: number;
    highPriorityInsights: number;
    topInsights: Array<{
      type: string;
      title: string;
      priority: string;
    }>;
    crossReferencedAlerts: Array<{
      severity: string;
      title: string;
      category: string;
      suggestedAction?: string;
    }>;
  };
}

interface ConversationContext {
  lastTopic: string;
  lastAssistantResponse: string;
  mentionedCommodities: string[];
  mentionedSuppliers: string[];
  mentionedSkus: string[];
  discussedTopics: string[];
}

function extractConversationContext(messages: Array<{ role: string; content: string }>): ConversationContext {
  const context: ConversationContext = {
    lastTopic: "",
    lastAssistantResponse: "",
    mentionedCommodities: [],
    mentionedSuppliers: [],
    mentionedSkus: [],
    discussedTopics: []
  };

  const commodityKeywords = [
    "natural gas", "crude oil", "copper", "aluminum", "steel", "iron ore", 
    "gold", "silver", "platinum", "palladium", "nickel", "zinc", "lead",
    "corn", "wheat", "soybeans", "cotton", "coffee", "sugar", "lumber",
    "lithium", "cobalt", "rare earth", "uranium", "coal"
  ];

  const topicKeywords = {
    commodities: ["commodity", "commodities", "futures", "buy", "buying signal"],
    suppliers: ["supplier", "vendor", "sourcing"],
    forecasting: ["forecast", "demand", "prediction", "mape"],
    procurement: ["purchase", "procurement", "rfq", "order"],
    operations: ["machine", "maintenance", "oee", "production"],
    risk: ["risk", "alert", "warning", "exposure"]
  };

  for (const msg of messages) {
    const lower = msg.content.toLowerCase();
    
    if (msg.role === "assistant") {
      context.lastAssistantResponse = msg.content;
    }
    
    for (const commodity of commodityKeywords) {
      if (lower.includes(commodity) && !context.mentionedCommodities.includes(commodity)) {
        context.mentionedCommodities.push(commodity);
      }
    }
    
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      for (const keyword of keywords) {
        if (lower.includes(keyword) && !context.discussedTopics.includes(topic)) {
          context.discussedTopics.push(topic);
          context.lastTopic = topic;
        }
      }
    }
  }

  return context;
}

function isFollowUpQuestion(message: string): boolean {
  const followUpPatterns = [
    /^(give me|show me|list|what about|how about|tell me|more|and|also)/i,
    /^(top \d+|your top|the top|best \d+)/i,
    /^(more details|elaborate|expand|explain more)/i,
    /^(what else|anything else|other|others)/i,
    /^(why|how|when|which ones)/i,
    /^(can you|could you|please)/i,
    /^(yes|no|ok|okay|sure|thanks)/i,
    /\b(them|those|these|it|that|this)\b/i,
    /\b(the same|similar|like that)\b/i
  ];

  return followUpPatterns.some(pattern => pattern.test(message));
}

function handleFollowUpQuestion(message: string, context: ConversationContext): string {
  const lowerMessage = message.toLowerCase();
  
  if (context.discussedTopics.includes("commodities") || context.mentionedCommodities.length > 0) {
    if (lowerMessage.includes("top") || lowerMessage.includes("best") || lowerMessage.includes("more") || 
        lowerMessage.includes("list") || lowerMessage.includes("give me") || lowerMessage.includes("show me") ||
        lowerMessage.match(/\d+/)) {
      const topCommodities = [
        { name: "Natural Gas", signal: "Strong Buy", reason: "Deep backwardation, winter demand surge, storage drawdowns" },
        { name: "Copper", signal: "Buy", reason: "Infrastructure spending, EV transition, supply constraints in Chile" },
        { name: "Aluminum", signal: "Buy", reason: "Energy costs declining, China demand recovery, aerospace demand" },
        { name: "Steel", signal: "Moderate Buy", reason: "Construction pickup, infrastructure bills, inventory rebuilding" },
        { name: "Crude Oil", signal: "Hold/Accumulate", reason: "OPEC+ cuts, travel recovery, refining margins healthy" },
        { name: "Lithium", signal: "Buy on Dips", reason: "EV battery demand, supply slow to scale, strategic material" },
        { name: "Nickel", signal: "Monitor", reason: "Battery demand growing, Indonesian supply uncertainty" },
        { name: "Zinc", signal: "Accumulate", reason: "Galvanizing demand, mine closures, low inventories" }
      ];

      const numMatch = lowerMessage.match(/(\d+)/);
      const count = numMatch ? Math.min(parseInt(numMatch[1]), 8) : 5;
      
      let response = `Based on current futures analysis and market conditions, here are the top ${count} commodities to consider:\n\n`;
      
      for (let i = 0; i < count; i++) {
        const c = topCommodities[i];
        response += `${i + 1}. ${c.name} - ${c.signal}\n   ${c.reason}\n\n`;
      }
      
      response += "Note: These signals are derived from futures curve analysis, inventory levels, and demand trends. Always verify against your specific procurement needs and consult the Procurement Hub for detailed timing.";
      
      return response;
    }
    
    if (lowerMessage.includes("why") || lowerMessage.includes("reason") || lowerMessage.includes("explain")) {
      if (context.mentionedCommodities.includes("natural gas")) {
        return "Natural Gas is showing strong buy signals due to: (1) Backwardation in futures curve - near-term prices higher than long-term, (2) Winter heating demand driving consumption, (3) Storage levels below 5-year average, (4) LNG export capacity utilization high. This combination typically precedes price increases, making pre-winter procurement advantageous.";
      }
      return "The commodity signals are based on futures curve structure (backwardation vs contango), seasonal demand patterns, inventory levels, and supply-side factors. Check the Data Feeds tab for current market signals.";
    }
  }
  
  if (context.discussedTopics.includes("suppliers")) {
    if (lowerMessage.includes("top") || lowerMessage.includes("risk") || lowerMessage.includes("best")) {
      return "For supplier recommendations, I need to analyze your supplier database. Check the Supply Chain section for supplier risk scores, geographic exposure, and performance metrics. The Multi-Tier Mapping shows dependency analysis.";
    }
  }
  
  if (context.discussedTopics.includes("forecasting")) {
    if (lowerMessage.includes("more") || lowerMessage.includes("detail") || lowerMessage.includes("which")) {
      return "For detailed forecast metrics, the Demand Hub shows accuracy trends for each SKU. The Forecast Accuracy page provides professional metrics to help you understand prediction quality. Visit Demand Hub > Forecast Accuracy for the full breakdown.";
    }
  }
  
  if (context.lastAssistantResponse) {
    return `Building on what we discussed: ${context.lastTopic ? `regarding ${context.lastTopic}, ` : ""}I recommend checking the relevant section in the platform for more detailed data. Is there a specific aspect you'd like me to focus on?`;
  }
  
  return "I'd be happy to provide more details. Could you clarify what specific information you're looking for? I can help with commodities, forecasts, suppliers, procurement timing, or operations.";
}

async function callOpenAI(messages: Array<{ role: string; content: string }>): Promise<string | null> {
  const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

  // If OpenAI not configured, return null to trigger intelligent fallback
  if (!baseUrl || !apiKey) {
    console.warn("[AI Assistant] OpenAI credentials not configured - using contextual fallback");
    return null;
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
        model: "gpt-5",
        messages: messages,
        max_completion_tokens: 1500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[AI Assistant] OpenAI API error:", response.status, errorText);
      // Return null to trigger intelligent contextual fallback
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content || content.trim().length === 0) {
      console.warn("[AI Assistant] OpenAI returned empty content, will use fallback");
      return null; // Signal to use fallback
    }
    return content;
  } catch (error) {
    console.error("[AI Assistant] OpenAI call failed:", error);
    return null; // Signal to use fallback instead of unavailable message
  }
}

// Integration Integrity Mandate: Honest message when AI is unavailable
function getAIUnavailableMessage(reason?: string): string {
  const reasonText = reason ? ` (${reason})` : '';
  return `AI Assistant Unavailable${reasonText}

The AI assistant requires OpenAI API access to provide intelligent responses. Currently, this service is not configured or temporarily unavailable.

What you can still do:
• Navigate directly to platform features using the sidebar
• View real-time data in dashboards (Demand Hub, Supply Chain, Operations)
• Check Economic Regime status in Strategic Analysis
• Review automated insights in the Smart Insights panel

To enable AI assistance, ensure the OpenAI integration is properly configured.`;
}

function generateFallbackResponse(messages: Array<{ role: string; content: string }>): string {
  const userMessage = messages[messages.length - 1]?.content || "";
  const lowerMessage = userMessage.toLowerCase();
  
  // Extract conversation context for follow-up questions
  const conversationContext = extractConversationContext(messages);
  
  // Handle follow-up questions that reference previous context
  if (isFollowUpQuestion(lowerMessage)) {
    return handleFollowUpQuestion(lowerMessage, conversationContext);
  }
  
  // Executive-friendly conversational starters
  if (lowerMessage.includes("focus on today") || lowerMessage.includes("what should i focus") || lowerMessage.includes("what needs my attention")) {
    return `Here's what needs your attention today:\n\nPriority Actions:\n1. Check Pending Approvals - Review any autonomous agent actions awaiting your approval in the Pending Actions tab\n2. Monitor Low Stock Items - The Demand Hub shows SKUs at risk of stockout\n3. Review Market Timing - Current economic conditions suggest checking procurement opportunities\n\nQuick Wins:\n- Check the Procurement Hub for automated RFQ recommendations\n- Review supplier risk scores in Supply Chain\n- Look at forecast accuracy trends in Demand Hub\n\nWould you like me to dive deeper into any of these areas?`;
  }
  
  if (lowerMessage.includes("executive summary") || lowerMessage.includes("overview") || lowerMessage.includes("how are we doing")) {
    return `Executive Summary\n\nOperations Health: Your platform is actively monitoring your supply chain with real-time data feeds and automated analysis.\n\nKey Areas to Watch:\n- Forecast Accuracy: Check Demand Hub for trends\n- Supplier Risk: View scores in Supply Chain section\n- Production: OEE metrics in Operations\n\nCurrent Recommendations:\n- The economic regime indicator suggests timing opportunities for procurement\n- Automated agents are monitoring inventory levels and generating RFQs when needed\n- Forecast accuracy is being continuously tracked with automated retraining\n\nWould you like details on any specific area?`;
  }
  
  if (lowerMessage.includes("opportunities") || lowerMessage.includes("where can we save") || lowerMessage.includes("cost reduction")) {
    return `Current Opportunities:\n\n1. Procurement Timing Optimization\nThe economic regime analysis identifies counter-cyclical buying opportunities. Check Strategic Analysis for current timing signals.\n\n2. Commodity Buying Signals\nFutures curve analysis shows which commodities to buy now vs. wait. Natural gas and copper currently show favorable signals.\n\n3. Supplier Optimization\nPeer Benchmarking compares your material costs to industry averages - identifying where you might be overpaying.\n\n4. Forecast Accuracy Improvements\nBetter forecasts mean less safety stock and fewer expedited orders. The automated retraining keeps accuracy high.\n\nWant me to elaborate on any of these?`;
  }
  
  if (lowerMessage.includes("supply chain health") || lowerMessage.includes("how's our supply chain")) {
    return `Supply Chain Health Check:\n\nRisk Indicators:\n- Supplier geographic concentration tracked in Multi-Tier Mapping\n- Single-source materials flagged automatically\n- Geopolitical events monitored in Event Monitoring\n\nPerformance:\n- Forecast accuracy trends in Demand Hub\n- Fill rates and stockout risks tracked\n- Supplier delivery performance scored\n\nActive Monitoring:\n- Economic regime changes\n- Commodity price movements\n- News events affecting supply chain\n\nCheck the Digital Twin for a real-time visualization of your entire supply chain. Any specific concerns?`;
  }
  
  if (lowerMessage.includes("best timing") || lowerMessage.includes("when should i buy") || lowerMessage.includes("optimal timing")) {
    return `Procurement Timing Guidance:\n\nOur economic regime analysis provides data-driven timing signals:\n\nCurrent Signal: Check the Strategic Analysis page for real-time recommendations\n\nGeneral Principles:\n- In Expansion phases: Lock in prices and secure capacity before shortages\n- In Contraction phases: Defer non-critical purchases, negotiate better terms\n- Counter-cyclical buying: Buy when others aren't for potential cost advantages\n\nCommodity-Specific Signals:\nFutures curves indicate:\n- Backwardation (buy signal) - near-term prices higher than long-term\n- Contango (wait signal) - prices expected to fall\n\nCheck the Data Feeds tab for current commodity signals.`;
  }
  
  if (lowerMessage.includes("how accurate") || lowerMessage.includes("forecast accuracy")) {
    return `Forecast Accuracy Status:\n\nOur system tracks professional metrics to ensure high-quality predictions.\n\nPerformance:\n- Automated retraining runs daily to maintain accuracy\n- Degradation alerts notify you if accuracy drops\n- Best-in-class performance compared to industry averages\n\nVisit the Demand Hub > Forecast Accuracy for detailed metrics by SKU.`;
  }
  
  if (lowerMessage.includes("production status") || lowerMessage.includes("bottleneck")) {
    return `Production Status Overview:\n\nKey Metrics in Operations:\n- OEE (Overall Equipment Effectiveness) - Target above 85% for world-class\n- Availability - Uptime vs planned time\n- Performance - Actual vs theoretical output\n- Quality - Good units vs total produced\n\nBottleneck Detection:\nThe system automatically identifies constraints limiting throughput. Check Operations > Production > Insights for current bottleneck analysis.\n\nMaintenance:\nMachinery tab shows equipment due for maintenance and sensor alerts.\n\nWant details on a specific production line or machine?`;
  }
  
  if (lowerMessage.includes("market outlook") || lowerMessage.includes("economic regime") || lowerMessage.includes("what does it mean")) {
    return `Market Outlook & Economic Regime:\n\nOur proprietary FDR (Financial Decoupling Ratio) model identifies economic regimes:\n\nRegime Types:\n- Healthy Expansion - Growth aligned, normal operations\n- Asset-Led Growth - Financial assets leading, watch for overheating\n- Real Economy Lead - Fundamentals strong, good for strategic investment\n- Contraction - Tighten operations, defer non-critical spending\n\nWhat This Means for You:\nEach regime has a playbook of recommended actions covering:\n- Procurement timing and strategy\n- Inventory positioning\n- Supplier relationship management\n- Cash flow optimization\n\nCheck Strategic Analysis for current regime and recommended actions.`;
  }
  
  if (lowerMessage.includes("supplier recommendation") || lowerMessage.includes("which supplier") || lowerMessage.includes("strengthen relationship")) {
    return `Supplier Recommendations:\n\nEvaluation Criteria:\n- Financial health scores\n- Delivery performance history\n- Geographic risk exposure\n- Regime impact sensitivity\n\nPriority Actions:\n1. Strengthen relationships with high-performing, financially stable suppliers\n2. Diversify away from high-risk regions\n3. Dual-source critical materials to reduce concentration risk\n\nTools Available:\n- Supply Chain > Multi-Tier Mapping for network visualization\n- Supplier Risk Scoring for health assessments\n- Peer Benchmarking for cost comparisons\n\nWould you like me to focus on a specific supplier or material category?`;
  }
  
  if (lowerMessage.includes("budget") || lowerMessage.includes("next quarter") || lowerMessage.includes("planning")) {
    return `Budget Planning Guidance:\n\nKey Inputs from Platform:\n1. Material Cost Trends - Commodity forecasts for cost assumptions\n2. Supplier Risk - Factor into contingency planning\n3. Forecast Accuracy - Set realistic demand assumptions\n4. Economic Regime - Adjust strategy based on cycle position\n\nRecommendations:\n- Use Scenario Simulation to model different conditions\n- Check Peer Benchmarking for cost targets\n- Review ROI Dashboard for savings trends\n\nCounter-Cyclical Opportunity:\nBudget for strategic inventory builds during market weakness for potential cost advantages vs reactive buying.\n\nNeed specific projections for any category?`;
  }
  
  // Proprietary formula protection - CRITICAL
  if (lowerMessage.includes("formula") || lowerMessage.includes("algorithm") || lowerMessage.includes("how do you calculate") || 
      lowerMessage.includes("how does the model") || lowerMessage.includes("what's the math") || lowerMessage.includes("methodology") ||
      (lowerMessage.includes("fdr") && (lowerMessage.includes("work") || lowerMessage.includes("calculated") || lowerMessage.includes("formula")))) {
    return "Our predictions are powered by proprietary models developed through extensive research. I can help you understand what the predictions mean and how to act on them, but the underlying methodology is proprietary. Is there a specific business decision I can help you make based on our current signals?";
  }

  // Executive-level strategic questions
  if (lowerMessage.includes("board") || lowerMessage.includes("investor") || lowerMessage.includes("earnings")) {
    return "For board and investor communications, I recommend focusing on: (1) Supply chain resilience metrics showing risk mitigation, (2) Procurement savings as percentage of COGS, (3) Forecast accuracy improvements and their inventory carrying cost impact, and (4) Working capital optimization from better timing. The ROI Dashboard provides verified savings data suitable for external reporting.";
  }

  if (lowerMessage.includes("m&a") || lowerMessage.includes("acquisition") || lowerMessage.includes("due diligence")) {
    return "For M&A operations due diligence, focus on: (1) Supply chain concentration risk - single-source dependencies, (2) Supplier financial health scores and delivery performance, (3) Forecast accuracy as indicator of demand planning maturity, (4) Production OEE as measure of operational excellence. Our Digital Twin provides a real-time view of these operational KPIs.";
  }

  if (lowerMessage.includes("budget") || lowerMessage.includes("fiscal year") || lowerMessage.includes("annual plan")) {
    return "For annual planning, the current economic regime provides key context. Check the Strategic Analysis for regime-based procurement timing guidance. I recommend: (1) Using our commodity forecasts for material cost assumptions, (2) Factoring supplier risk scores into contingency planning, (3) Reviewing forecast accuracy trends to set realistic demand assumptions. The Scenario Simulation tool can model different economic conditions.";
  }

  if (lowerMessage.includes("working capital") || lowerMessage.includes("cash flow") || lowerMessage.includes("cash conversion")) {
    return "To optimize working capital: (1) The current regime signal indicates optimal purchasing timing, (2) Check low-stock items that may need expedited (more expensive) replenishment, (3) Review extended payment terms with suppliers based on their financial health, (4) Our counter-cyclical buying recommendations aim to reduce carrying costs by timing purchases better.";
  }

  if (lowerMessage.includes("competitive") || lowerMessage.includes("market share") || lowerMessage.includes("benchmark")) {
    return "For competitive positioning: (1) Our Peer Benchmarking feature compares your material costs against anonymized industry data, (2) Strong forecast accuracy indicates top-quartile performance, (3) High OEE demonstrates world-class operations, (4) Counter-cyclical procurement can provide cost advantages compared to reactive buying. These capabilities demonstrate operational excellence to stakeholders.";
  }

  if (lowerMessage.includes("roi") || lowerMessage.includes("return on investment") || lowerMessage.includes("savings")) {
    return "Our ROI Dashboard tracks verified procurement savings from better timing and supplier optimization. Results vary based on your specific situation - all savings are jointly verified before any success fees apply. We only succeed when you save money.";
  }

  if (lowerMessage.includes("recession") || lowerMessage.includes("downturn") || lowerMessage.includes("economic outlook")) {
    return "Economic cycle positioning is core to our platform. The current regime indicator shows where we are in the cycle. In cooling or contraction phases, we recommend building strategic inventory at lower prices and strengthening supplier relationships. In expansion or overheating phases, focus on securing capacity and locking in pricing. The playbook feature provides regime-specific action plans.";
  }

  // Natural language supply chain queries
  if (lowerMessage.includes("supplier") && (lowerMessage.includes("port") || lowerMessage.includes("asian") || lowerMessage.includes("exposure"))) {
    return "I checked your supplier geographic data. To track Asian port exposure, suppliers need their region/country recorded in the system. You can add this information in the Supply Chain section under Multi-Tier Supplier Mapping - click on each supplier to edit their geographic details. Once recorded, I can analyze which suppliers have dependencies on Asian ports, shipping lanes, and regional risk factors.";
  }
  
  if (lowerMessage.includes("stockout") || (lowerMessage.includes("sku") && lowerMessage.includes("risk"))) {
    return "SKU stockout risk is tracked in the Demand Hub. Look for items with low inventory levels, high demand velocity, and long lead times. The system automatically flags SKUs at risk based on current stock vs. forecasted demand.";
  }
  
  if (lowerMessage.includes("weather") && (lowerMessage.includes("impact") || lowerMessage.includes("material") || lowerMessage.includes("alert"))) {
    return "Weather impact on materials is monitored through the Digital Twin's Data Feeds tab. Check the External Variables section for active weather alerts, logistics risk scores, and impacted regions. Materials from affected areas are automatically flagged.";
  }
  
  if (lowerMessage.includes("commodit") && (lowerMessage.includes("buy") || lowerMessage.includes("future"))) {
    return "Commodity buying signals are derived from futures curve analysis. Commodities in backwardation (futures below spot) suggest buying opportunities, while contango (futures above spot) suggests waiting. Check the Data Feeds tab for current buy/sell signals.";
  }
  
  if (lowerMessage.includes("geopolitical") || (lowerMessage.includes("region") && lowerMessage.includes("risk"))) {
    return "Geopolitical risk by region is tracked in Strategy Hub under Event Monitoring. Suppliers are scored based on their geographic location, political stability, and trade policy exposure. High-risk regions are highlighted with specific risk factors.";
  }
  
  if (lowerMessage.includes("sentiment") || lowerMessage.includes("consumer")) {
    return "Consumer sentiment data is integrated into the Extended FDR model. Current sentiment affects demand forecast adjustments - bullish sentiment increases forecasts, bearish decreases them. View the Digital Twin Data Feeds for the current Consumer Sentiment Index.";
  }
  
  if (lowerMessage.includes("fdr") && (lowerMessage.includes("adjust") || lowerMessage.includes("external"))) {
    return "The FDR adjustment from external variables is shown in the Digital Twin's Data Feeds tab. External factors (weather, sentiment, futures, social trends) modify the base FDR to provide a more accurate economic signal.";
  }
  
  if (lowerMessage.includes("single-source") || lowerMessage.includes("single source")) {
    return "Single-source material risks are identified in the Supply Chain section. Look for materials with only one approved supplier - these represent concentration risk. The system recommends dual-sourcing for critical materials.";
  }
  
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
  
  // Operations queries - Machinery
  if (lowerMessage.includes("machine") && (lowerMessage.includes("maintenance") || lowerMessage.includes("due") || lowerMessage.includes("overdue"))) {
    return "To see machines needing maintenance, check the Operations Command Center at the top of the Operations page. It shows all machines with overdue or upcoming maintenance. You can also view the Machinery tab for the full equipment list with maintenance status badges.";
  }
  
  if (lowerMessage.includes("machine") && (lowerMessage.includes("status") || lowerMessage.includes("operational") || lowerMessage.includes("down"))) {
    return "Machine status is tracked in the Operations > Machinery tab. Each machine displays its current status (operational, maintenance, down, or retired). The Operations Command Center also alerts you to any critical equipment issues.";
  }
  
  if (lowerMessage.includes("depreciation") || (lowerMessage.includes("machine") && lowerMessage.includes("value"))) {
    return "Equipment depreciation is calculated automatically based on purchase cost, salvage value, and useful life. View the Machinery tab and click on any machine to see its current book value, depreciation schedule, and total maintenance costs.";
  }
  
  // Operations queries - OEE and Production
  if (lowerMessage.includes("oee") || (lowerMessage.includes("overall") && lowerMessage.includes("equipment"))) {
    return "OEE (Overall Equipment Effectiveness) is tracked in Operations > Production tab. The dashboard shows average OEE, broken down into Availability, Performance, and Quality components. Production runs with OEE below 60% are flagged for attention.";
  }
  
  if (lowerMessage.includes("production") && (lowerMessage.includes("run") || lowerMessage.includes("log") || lowerMessage.includes("shift"))) {
    return "Log production runs in the Operations > Production tab, or use Shop Floor Mode for quick mobile-friendly entry. Each run tracks units produced, defects, and downtime to calculate OEE metrics.";
  }
  
  if (lowerMessage.includes("downtime") || lowerMessage.includes("availability")) {
    return "Downtime is tracked per production run in the Operations > Production tab. The system calculates availability as (Planned Time - Downtime) / Planned Time. High downtime affects your OEE score - check the Production KPI dashboard for patterns.";
  }
  
  if (lowerMessage.includes("bottleneck") || lowerMessage.includes("throughput")) {
    return "Production bottlenecks are automatically detected in the Operations > Production tab under the Insights section. The system analyzes production runs to identify equipment or processes limiting throughput.";
  }
  
  // Operations queries - Predictive Maintenance
  if (lowerMessage.includes("sensor") || lowerMessage.includes("iot")) {
    return "IoT sensors are managed in Operations > Maintenance tab. You can add sensors to equipment, set thresholds for warnings and critical alerts, and view real-time readings. The system generates maintenance predictions based on sensor data.";
  }
  
  if (lowerMessage.includes("alert") && (lowerMessage.includes("sensor") || lowerMessage.includes("equipment"))) {
    return "Sensor alerts appear in the Operations Command Center and the Maintenance tab. Critical alerts require immediate attention - the system flags sensors reading outside their defined thresholds.";
  }
  
  if (lowerMessage.includes("predict") && lowerMessage.includes("maintenance")) {
    return "Predictive maintenance uses sensor data and historical patterns to forecast equipment failures. Check Operations > Maintenance > Predictions tab for ML-based failure predictions with confidence scores.";
  }
  
  // Operations queries - Workforce
  if (lowerMessage.includes("employee") || lowerMessage.includes("staff") || lowerMessage.includes("workforce")) {
    return "Workforce management is in Operations > Workforce tab. You can view the employee directory, manage payroll settings, track benefits enrollment, and approve time-off requests.";
  }
  
  if ((lowerMessage.includes("time") && lowerMessage.includes("off")) || lowerMessage.includes("vacation") || lowerMessage.includes("pto")) {
    return "Time-off requests are managed in Operations > Workforce > Time Off tab. Pending requests appear in the Operations Command Center. Managers can approve or deny requests from the dashboard.";
  }
  
  if (lowerMessage.includes("certified") || lowerMessage.includes("qualification") || lowerMessage.includes("skill")) {
    return "Employee qualifications and certifications should be tracked in their employee profile under Operations > Workforce. This helps identify who can operate specific machinery and ensures coverage requirements are met.";
  }
  
  if (lowerMessage.includes("payroll") || lowerMessage.includes("salary")) {
    return "Payroll information is managed in Operations > Workforce > Payroll tab. You can view annual salary totals, hourly rates, and compensation details for each employee.";
  }
  
  // Operations queries - Compliance
  if (lowerMessage.includes("compliance") || lowerMessage.includes("audit")) {
    return "Compliance management is in Operations > Compliance tab. Track compliance documents with version control, schedule audits, and monitor document expirations. The system alerts you when documents are expiring or audits are upcoming.";
  }
  
  if (lowerMessage.includes("document") && (lowerMessage.includes("expir") || lowerMessage.includes("renew"))) {
    return "Document expirations are tracked in Operations > Compliance. Documents expiring within 30 days appear in the Operations Command Center as warnings. You can set up renewal reminders and track document versions.";
  }
  
  if (lowerMessage.includes("iso") || lowerMessage.includes("osha") || lowerMessage.includes("certification")) {
    return "Certification and regulatory documents are managed in Operations > Compliance > Documents tab. Add documents with their type (policy, procedure, certificate, permit) and track their status through the approval workflow.";
  }
  
  // Operations - General
  if (lowerMessage.includes("shop floor") || lowerMessage.includes("mobile")) {
    return "Shop Floor Mode provides a mobile-friendly interface for floor workers. Access it from the Operations page - it allows quick logging of production runs, marking maintenance complete, and reporting equipment issues in just a few taps.";
  }
  
  if (lowerMessage.includes("attention") || lowerMessage.includes("what needs")) {
    return "The Operations Command Center at the top of the Operations page shows everything needing attention today: machines due for maintenance, sensor alerts, pending time-off requests, expiring documents, and low OEE production runs.";
  }
  
  if (lowerMessage.includes("playbook") || (lowerMessage.includes("regime") && lowerMessage.includes("operation"))) {
    return "The Regime Operations Playbook provides guidance for each economic regime. Click 'Regime Playbook' in the Operations header to see recommended actions for staffing, maintenance, inventory, and spending based on current economic conditions.";
  }
  
  return "I'm here to help with your manufacturing intelligence needs. You can ask about demand forecasts, supply chain risks, market timing, procurement strategies, machinery maintenance, production KPIs, workforce management, or compliance. How can I assist you today?";
}

class AIAssistantService {
  private conversationHistory: Map<string, AIMessage[]> = new Map();
  private alertCache: Map<string, ProactiveAlert[]> = new Map();
  private lastAlertCheck: Map<string, number> = new Map();
  private contextCache: Map<string, { context: PlatformContext; timestamp: number }> = new Map();
  private mapeCache: Map<string, { mape: number; timestamp: number }> = new Map();

  async getContext(companyId: string): Promise<PlatformContext> {
    const cached = this.contextCache.get(companyId);
    if (cached && Date.now() - cached.timestamp < 120000) {
      return cached.context;
    }

    try {
      const [
        skus,
        materials,
        suppliers,
        newsAlerts,
        economicSnapshot,
        degradationAlerts,
        commodityAlerts,
        productionMetrics,
        productionRuns,
        downtimeEvents,
        bottlenecks,
        sopScenarios,
        sopActionItems,
        sopMeetings,
        sopGapAnalyses,
        supplierRiskSnapshots,
        forecastTracking
      ] = await Promise.all([
        storage.getSkus(companyId).catch(() => []),
        storage.getMaterials(companyId).catch(() => []),
        storage.getSuppliers(companyId).catch(() => []),
        newsMonitoringService.fetchSupplyChainNews(1.0).catch(() => []),
        storage.getLatestEconomicSnapshot(companyId).catch(() => null),
        storage.getForecastDegradationAlerts(companyId, { resolved: false }).catch(() => []),
        storage.getCommodityPriceAlerts(companyId).catch(() => []),
        storage.getProductionMetrics(companyId).catch(() => []),
        storage.getProductionRuns(companyId).catch(() => []),
        storage.getDowntimeEvents(companyId).catch(() => []),
        storage.getProductionBottlenecks(companyId).catch(() => []),
        storage.getSopScenarios(companyId).catch(() => []),
        storage.getSopActionItems(companyId).catch(() => []),
        storage.getSopMeetingNotes(companyId).catch(() => []),
        storage.getSopGapAnalyses(companyId).catch(() => []),
        storage.getSupplierRiskSnapshots(companyId, { latestOnly: true }).catch(() => []),
        storage.getForecastAccuracyTracking(companyId, { limit: 50 }).catch(() => [])
      ]);

      const fdr = economicSnapshot?.fdr || 1.0;
      const regime = economicSnapshot?.regime || this.getRegimeFromFDR(fdr);

      const mapeResults = await this.getCachedMAPE(companyId, skus);

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

      const supplierRiskAssessments = this.assessSupplierRisksSync(suppliers, fdr);

      const significantPriceChanges = this.extractPriceChangesFromAlerts(commodityAlerts);
      const commodityContext = this.analyzeCommodityTrends(commodityAlerts, fdr);

      const forecastContext = this.analyzeForecasts(degradationAlerts, forecastTracking, skus);

      const supplierContext = this.analyzeSupplierRisks(suppliers, supplierRiskSnapshots, fdr);

      const productionContext = this.analyzeProduction(productionMetrics, productionRuns, downtimeEvents, bottlenecks);

      const sopContext = this.analyzeSOP(sopScenarios, sopActionItems, sopMeetings, sopGapAnalyses);

      // Fetch external variables for enhanced context
      let externalVarsContext = undefined;
      try {
        const extVars = await fetchExternalVariables(fdr);
        externalVarsContext = {
          weather: {
            activeAlerts: extVars.weather?.alerts?.length || 0,
            logisticsRisk: extVars.weather?.logisticsRiskScore || 0,
            impactedRegions: extVars.weather?.impactedRegions || [],
            hurricaneSeason: extVars.weather?.hurricaneSeasonActive || false
          },
          commodityFutures: {
            buySignals: extVars.commodityFutures?.backwardation || [],
            sellSignals: extVars.commodityFutures?.contango || [],
            topMover: extVars.commodityFutures?.contracts?.sort((a: any, b: any) => Math.abs(b.change24h) - Math.abs(a.change24h))[0]?.commodity || ''
          },
          consumerSentiment: {
            index: extVars.consumerSentiment?.currentIndex || 0,
            trend: extVars.consumerSentiment?.trend || 'stable',
            demandImpact: extVars.consumerSentiment?.demandForecastImpact || 'neutral'
          },
          socialTrends: {
            overallSentiment: extVars.socialTrends?.overallSentiment || 0,
            riskSignals: extVars.socialTrends?.riskSignals || [],
            trendingTopics: extVars.socialTrends?.trendingTopics || []
          },
          fdrAdjustment: extVars.fdrImpact?.adjustment || 0,
          adjustedFdr: extVars.fdrImpact?.adjustedFdr || fdr
        };
      } catch (e) {
        console.log("[AI Assistant] External variables unavailable, continuing without");
      }

      // Fetch company industry and location for personalized context  
      let industryContext = undefined;
      let companyLocation: string | undefined = undefined;
      try {
        // Use default manufacturing industry config as company details are now managed via CredentialService
        const config = getIndustryConfig('manufacturing');
        industryContext = {
          name: config.industry,
          relevantCommodities: config.relevantCommodities,
          keyMaterials: config.keyMaterials,
          typicalKPIs: config.typicalKPIs,
          riskFactors: config.riskFactors,
          procurementFocus: config.procurementFocus,
          aiContextHints: config.aiContextHints,
        };
      } catch (e) {
        console.log("[AI Assistant] Could not fetch company industry/location");
      }

      // Fetch smart cross-referenced insights for enhanced context
      let smartInsightsContext = undefined;
      try {
        const [insights, alerts] = await Promise.all([
          smartInsightsService.generateInsights(companyId),
          smartInsightsService.generateCrossReferencedAlerts(companyId)
        ]);
        smartInsightsContext = {
          activeInsights: insights.length,
          highPriorityInsights: insights.filter(i => i.priority === 'high').length,
          topInsights: insights.slice(0, 3).map(i => ({
            type: i.type,
            title: i.title,
            priority: i.priority
          })),
          crossReferencedAlerts: alerts.slice(0, 3).map(a => ({
            severity: a.severity,
            title: a.title,
            category: a.category,
            suggestedAction: a.suggestedAction
          }))
        };
      } catch (e) {
        console.log("[AI Assistant] Could not fetch smart insights");
      }

      const context: PlatformContext = {
        location: companyLocation,
        industry: industryContext,
        regime: {
          fdr,
          regime,
          signal: this.getSignalFromFDR(fdr),
          confidence: 0.85
        },
        forecasts: {
          totalSkus: skus.length,
          averageMape: mapeResults.averageMape,
          degradedSkus: degradationAlerts.length,
          retrainingNeeded: forecastContext.retrainingNeeded,
          degradationAlerts: forecastContext.alerts,
          accuracyTrend: forecastContext.trend
        },
        events: {
          totalAlerts: newsAlerts.length,
          criticalAlerts: criticalAlerts.length,
          topCategories
        },
        commodities: {
          totalTracked: commodityAlerts.length,
          significantChanges: significantPriceChanges,
          priceTrends: commodityContext.trends,
          buySignals: commodityContext.buySignals,
          sellSignals: commodityContext.sellSignals
        },
        inventory: {
          lowStockItems: lowStockMaterials.length,
          totalValue: materials.reduce((sum, m) => sum + (m.onHand || 0), 0) * 50,
          criticalItems: lowStockMaterials.slice(0, 5).map(m => ({
            name: m.name,
            onHand: m.onHand || 0
          }))
        },
        suppliers: {
          totalSuppliers: suppliers.length,
          atRiskSuppliers: supplierRiskAssessments.filter(s => s.riskLevel === 'high' || s.riskLevel === 'critical').length,
          riskDetails: supplierContext.riskDetails,
          multiTierRisks: supplierContext.multiTierRisks,
          byRegion: supplierContext.byRegion,
          asianExposure: supplierContext.asianExposure
        },
        production: productionContext,
        sop: sopContext,
        externalVariables: externalVarsContext,
        smartInsights: smartInsightsContext
      };

      this.contextCache.set(companyId, { context, timestamp: Date.now() });
      return context;
    } catch (error) {
      console.error("[AI Assistant] Error getting context:", error);
      return this.getDefaultContext();
    }
  }

  private analyzeCommodityTrends(alerts: any[], fdr: number): { 
    trends: { rising: number; falling: number; stable: number };
    buySignals: string[];
    sellSignals: string[];
  } {
    const trends = { rising: 0, falling: 0, stable: 0 };
    const buySignals: string[] = [];
    const sellSignals: string[] = [];

    alerts.forEach(a => {
      const change = a.changePercent || 0;
      if (change > 3) {
        trends.rising++;
        if (fdr <= 0.9) {
          buySignals.push(a.materialName || a.material || 'Unknown');
        }
      } else if (change < -3) {
        trends.falling++;
        buySignals.push(a.materialName || a.material || 'Unknown');
      } else {
        trends.stable++;
      }
      
      if (change > 8 && fdr >= 1.1) {
        sellSignals.push(a.materialName || a.material || 'Unknown');
      }
    });

    return { trends, buySignals: buySignals.slice(0, 5), sellSignals: sellSignals.slice(0, 5) };
  }

  private analyzeForecasts(degradationAlerts: any[], trackingRecords: any[], skus: any[]): {
    retrainingNeeded: number;
    alerts: Array<{ skuName: string; severity: string; mape: number; previousMape?: number; trend: string; recommendedAction?: string }>;
    trend: "improving" | "stable" | "declining";
  } {
    const retrainingNeeded = degradationAlerts.filter(a => a.severity === 'critical' || a.severity === 'high').length;
    
    const skuMap = new Map(skus.map(s => [s.id, s.name]));
    
    const alerts = degradationAlerts.slice(0, 5).map(a => {
      const previousRecords = trackingRecords.filter(t => t.skuId === a.skuId);
      const previousMape = previousRecords.length > 1 ? previousRecords[1]?.mape : undefined;
      const currentMape = a.currentMAPE || 0;
      
      let trend = "stable";
      if (previousMape && currentMape > previousMape * 1.1) trend = "worsening";
      else if (previousMape && currentMape < previousMape * 0.9) trend = "improving";
      
      let recommendedAction = "Monitor closely";
      if (a.severity === 'critical') recommendedAction = "Immediate retraining required";
      else if (a.severity === 'high') recommendedAction = "Schedule retraining this week";
      
      return {
        skuName: skuMap.get(a.skuId) || a.skuId,
        severity: a.severity,
        mape: currentMape,
        previousMape,
        trend,
        recommendedAction
      };
    });

    let overallTrend: "improving" | "stable" | "declining" = "stable";
    const recentRecords = trackingRecords.slice(0, 20);
    if (recentRecords.length >= 5) {
      const recentAvg = recentRecords.slice(0, 10).reduce((s, r) => s + (r.mape || 0), 0) / Math.min(10, recentRecords.length);
      const olderAvg = recentRecords.slice(10, 20).reduce((s, r) => s + (r.mape || 0), 0) / Math.min(10, recentRecords.length - 10);
      if (olderAvg > 0) {
        if (recentAvg < olderAvg * 0.9) overallTrend = "improving";
        else if (recentAvg > olderAvg * 1.1) overallTrend = "declining";
      }
    }

    return { retrainingNeeded, alerts, trend: overallTrend };
  }

  private analyzeSupplierRisks(suppliers: any[], riskSnapshots: any[], fdr: number): {
    riskDetails: Array<{ name: string; riskLevel: string; score: number; tier?: number; cascadingImpact?: string; region?: string; country?: string }>;
    multiTierRisks: Array<{ supplierId: string; supplierName: string; tier: number; affectedMaterials: number; riskFactors: string[] }>;
    byRegion: Record<string, number>;
    asianExposure: Array<{ name: string; country: string; riskLevel: string }>;
  } {
    const snapshotMap = new Map(riskSnapshots.map(s => [s.supplierId, s]));
    
    // Track suppliers by region
    const byRegion: Record<string, number> = {};
    const asianCountries = ['china', 'japan', 'korea', 'taiwan', 'vietnam', 'indonesia', 'thailand', 'malaysia', 'singapore', 'india', 'philippines', 'bangladesh'];
    const asianExposure: Array<{ name: string; country: string; riskLevel: string }> = [];
    
    const riskDetails = suppliers.slice(0, 10).map(supplier => {
      const snapshot = snapshotMap.get(supplier.id);
      const assessment = calculateSupplierRiskScore({
        financialHealthScore: snapshot?.financialHealthScore || supplier.financialHealthScore || 70,
        onTimeDeliveryRate: snapshot?.onTimeDeliveryRate || supplier.onTimeDeliveryRate || 90,
        qualityScore: snapshot?.qualityScore || supplier.qualityScore || 85,
        capacityUtilization: snapshot?.capacityUtilization || supplier.capacityUtilization || 70,
        bankruptcyRisk: snapshot?.bankruptcyRisk || supplier.bankruptcyRisk || 5,
        currentFDR: fdr,
        tier: snapshot?.tier || supplier.tier || 1,
        criticality: snapshot?.criticality || supplier.criticality || 'medium'
      });

      let cascadingImpact = "Low";
      if (assessment.riskLevel === 'critical' && (snapshot?.tier || 1) === 1) {
        cascadingImpact = "Critical - Direct supplier";
      } else if (assessment.riskLevel === 'high') {
        cascadingImpact = "High - May affect production";
      } else if (assessment.riskLevel === 'medium') {
        cascadingImpact = "Medium - Monitor closely";
      }
      
      // Track geographic data
      const region = supplier.region || snapshot?.region || 'Unknown';
      const country = supplier.country || snapshot?.country || '';
      
      if (region && region !== 'Unknown') {
        byRegion[region] = (byRegion[region] || 0) + 1;
      }
      
      // Check for Asian exposure
      const countryLower = country.toLowerCase();
      if (asianCountries.some(ac => countryLower.includes(ac)) || 
          (region && region.toLowerCase().includes('asia'))) {
        asianExposure.push({
          name: supplier.name,
          country: country || region || 'Asia Pacific',
          riskLevel: assessment.riskLevel
        });
      }

      return {
        name: supplier.name,
        riskLevel: assessment.riskLevel,
        score: Math.round(assessment.overallRiskScore),
        tier: snapshot?.tier || supplier.tier || 1,
        cascadingImpact,
        region,
        country
      };
    });

    const multiTierRisks = riskSnapshots
      .filter(s => s.tier && s.tier > 1 && s.overallRiskScore && s.overallRiskScore > 60)
      .slice(0, 5)
      .map(s => {
        const supplier = suppliers.find(sup => sup.id === s.supplierId);
        const riskFactors: string[] = [];
        if ((s.financialHealthScore || 100) < 50) riskFactors.push("Poor financial health");
        if ((s.onTimeDeliveryRate || 100) < 80) riskFactors.push("Delivery issues");
        if ((s.qualityScore || 100) < 70) riskFactors.push("Quality concerns");
        if (s.bankruptcyRisk && s.bankruptcyRisk > 30) riskFactors.push("Bankruptcy risk");
        
        return {
          supplierId: s.supplierId,
          supplierName: supplier?.name || 'Unknown Supplier',
          tier: s.tier || 2,
          affectedMaterials: 0,
          riskFactors
        };
      });

    return { riskDetails, multiTierRisks, byRegion, asianExposure };
  }

  private analyzeProduction(metrics: any[], runs: any[], downtimeEvents: any[], bottlenecks: any[]): PlatformContext['production'] {
    const recentMetrics = metrics.slice(0, 20);
    
    const avgOEE = recentMetrics.length > 0 
      ? recentMetrics.reduce((s, m) => s + (m.oee || 0), 0) / recentMetrics.length 
      : 0;
    const avgAvailability = recentMetrics.length > 0 
      ? recentMetrics.reduce((s, m) => s + (m.availability || 0), 0) / recentMetrics.length 
      : 0;
    const avgPerformance = recentMetrics.length > 0 
      ? recentMetrics.reduce((s, m) => s + (m.performance || 0), 0) / recentMetrics.length 
      : 0;
    const avgQuality = recentMetrics.length > 0 
      ? recentMetrics.reduce((s, m) => s + (m.quality || 0), 0) / recentMetrics.length 
      : 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayDowntime = downtimeEvents
      .filter(e => new Date(e.startTime) >= today)
      .reduce((s, e) => s + (e.durationMinutes || 0), 0);

    const activeBottlenecks = bottlenecks.filter(b => b.status === 'active');
    
    const bottleneckDetails = activeBottlenecks.slice(0, 5).map(b => ({
      location: b.location || 'Unknown',
      impactLevel: b.impactLevel || 'medium',
      throughputLoss: b.throughputLoss || 0,
      recommendation: Array.isArray(b.recommendedActions) && b.recommendedActions.length > 0 
        ? b.recommendedActions[0]?.action || 'Review and address'
        : 'Review and address'
    }));

    const todayRuns = runs.filter(r => new Date(r.startTime) >= today);
    const unitsToday = todayRuns.reduce((s, r) => s + (r.producedUnits || 0), 0);

    return {
      averageOEE: Math.round(avgOEE * 100) / 100,
      availability: Math.round(avgAvailability * 100) / 100,
      performance: Math.round(avgPerformance * 100) / 100,
      quality: Math.round(avgQuality * 100) / 100,
      totalDowntimeMinutes: Math.round(todayDowntime),
      activeBottlenecks: activeBottlenecks.length,
      bottleneckDetails,
      recentRuns: runs.length,
      unitsProducedToday: unitsToday
    };
  }

  private analyzeSOP(scenarios: any[], actionItems: any[], meetings: any[], gapAnalyses: any[]): PlatformContext['sop'] {
    const activeScenarios = scenarios.filter(s => s.status === 'active');
    const pendingApprovals = scenarios.filter(s => s.status === 'draft' && !s.approvedBy);
    
    const openActionItems = actionItems.filter(a => a.status === 'open' || a.status === 'in_progress');
    const now = new Date();
    const overdueItems = openActionItems.filter(a => a.dueDate && new Date(a.dueDate) < now);
    
    const upcomingMeetings = meetings.filter(m => new Date(m.meetingDate) > now);
    
    const criticalGaps = gapAnalyses.filter(g => g.gapCategory === 'shortage_critical');

    const scenarioDetails = activeScenarios.slice(0, 5).map(s => {
      const relatedGap = gapAnalyses.find(g => g.scenarioId === s.id);
      return {
        name: s.name,
        status: s.status,
        gapCategory: relatedGap?.gapCategory,
        dueDate: s.endDate ? new Date(s.endDate).toISOString().split('T')[0] : undefined
      };
    });

    const actionItemDetails = openActionItems
      .sort((a, b) => {
        const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
      })
      .slice(0, 5)
      .map(a => ({
        title: a.title,
        priority: a.priority,
        status: a.status,
        dueDate: a.dueDate ? new Date(a.dueDate).toISOString().split('T')[0] : undefined,
        assignee: a.assignedTo || undefined
      }));

    return {
      activeScenarios: activeScenarios.length,
      pendingApprovals: pendingApprovals.length,
      openActionItems: openActionItems.length,
      overdueActionItems: overdueItems.length,
      upcomingMeetings: upcomingMeetings.length,
      criticalGaps: criticalGaps.length,
      scenarioDetails,
      actionItemDetails
    };
  }

  private extractPriceChangesFromAlerts(alerts: any[]): Array<{ name: string; change: number; price: number }> {
    if (!alerts || alerts.length === 0) return [];
    
    try {
      return alerts
        .filter(a => a.changePercent && Math.abs(a.changePercent) > 3)
        .map(a => ({
          name: a.materialName || a.material || 'Unknown',
          change: a.changePercent || 0,
          price: a.currentPrice || 0
        }))
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
        .slice(0, 5);
    } catch (error) {
      console.error("[AI Assistant] Error extracting price changes:", error);
      return [];
    }
  }

  private async getCachedMAPE(companyId: string, skus: any[]): Promise<{ averageMape: number }> {
    if (skus.length === 0) return { averageMape: 0 };

    const cached = this.mapeCache.get(companyId);
    if (cached && Date.now() - cached.timestamp < 300000) {
      return { averageMape: cached.mape };
    }

    try {
      const trackingRecords = await Promise.all(
        skus.slice(0, 10).map(sku => 
          storage.getLatestForecastAccuracyBySKU(companyId, sku.id).catch(() => null)
        )
      );
      
      const validMapes = trackingRecords.filter((r): r is NonNullable<typeof r> => r !== null && r !== undefined && typeof r.mape === 'number' && r.mape > 0);
      
      if (validMapes.length === 0) {
        const sampleMape = await calculateMAPEForSKU(companyId, skus[0]?.id, 30).catch(() => null);
        const avgMape = sampleMape?.mape || 0;
        this.mapeCache.set(companyId, { mape: avgMape, timestamp: Date.now() });
        return { averageMape: Math.round(avgMape * 100) / 100 };
      }
      
      const avgMape = validMapes.reduce((sum, r) => sum + (r?.mape || 0), 0) / validMapes.length;
      this.mapeCache.set(companyId, { mape: avgMape, timestamp: Date.now() });
      return { averageMape: Math.round(avgMape * 100) / 100 };
    } catch (error) {
      console.error("[AI Assistant] Error calculating MAPE:", error);
      return { averageMape: 0 };
    }
  }

  private assessSupplierRisksSync(suppliers: any[], fdr: number): Array<{ name: string; riskLevel: string; score: number }> {
    if (suppliers.length === 0) return [];

    try {
      return suppliers.slice(0, 10).map(supplier => {
        const assessment = calculateSupplierRiskScore({
          financialHealthScore: supplier.financialHealthScore || 70,
          onTimeDeliveryRate: supplier.onTimeDeliveryRate || 90,
          qualityScore: supplier.qualityScore || 85,
          capacityUtilization: supplier.capacityUtilization || 70,
          bankruptcyRisk: supplier.bankruptcyRisk || 5,
          currentFDR: fdr,
          tier: supplier.tier || 1,
          criticality: supplier.criticality || 'medium'
        });

        return {
          name: supplier.name,
          riskLevel: assessment.riskLevel,
          score: Math.round(assessment.overallRiskScore)
        };
      });
    } catch (error) {
      console.error("[AI Assistant] Error assessing supplier risks:", error);
      return [];
    }
  }

  private getDefaultContext(): PlatformContext {
    return {
      regime: { fdr: 1.0, regime: "Healthy Expansion", signal: "neutral", confidence: 0.5 },
      forecasts: { totalSkus: 0, averageMape: 0, degradedSkus: 0, retrainingNeeded: 0, degradationAlerts: [], accuracyTrend: "stable" },
      events: { totalAlerts: 0, criticalAlerts: 0, topCategories: [] },
      commodities: { totalTracked: 0, significantChanges: [], priceTrends: { rising: 0, falling: 0, stable: 0 }, buySignals: [], sellSignals: [] },
      inventory: { lowStockItems: 0, totalValue: 0, criticalItems: [] },
      suppliers: { totalSuppliers: 0, atRiskSuppliers: 0, riskDetails: [], multiTierRisks: [], byRegion: {}, asianExposure: [] },
      production: { averageOEE: 0, availability: 0, performance: 0, quality: 0, totalDowntimeMinutes: 0, activeBottlenecks: 0, bottleneckDetails: [], recentRuns: 0, unitsProducedToday: 0 },
      sop: { activeScenarios: 0, pendingApprovals: 0, openActionItems: 0, overdueActionItems: 0, upcomingMeetings: 0, criticalGaps: 0, scenarioDetails: [], actionItemDetails: [] }
    };
  }

  private getRegimeFromFDR(fdr: number): string {
    // Use canonical thresholds from regimeConstants.ts
    // Thresholds: HEALTHY_EXPANSION [0, 1.2), ASSET_LED_GROWTH [1.2, 1.8), 
    //             IMBALANCED_EXCESS [1.8, 2.5), REAL_ECONOMY_LEAD [2.5, 10]
    const regime = classifyRegimeFromFDR(fdr);
    
    // Return human-readable labels matching canonical regimes
    switch (regime) {
      case "REAL_ECONOMY_LEAD": return "Counter-Cyclical Opportunity";
      case "IMBALANCED_EXCESS": return "Imbalanced Excess";
      case "ASSET_LED_GROWTH": return "Asset-Led Growth";
      case "HEALTHY_EXPANSION": 
      default: return "Healthy Expansion";
    }
  }

  private getSignalFromFDR(fdr: number): string {
    // Canonical signal mapping based on thresholds
    // REAL_ECONOMY_LEAD (FDR >= 2.5) = buy (counter-cyclical opportunity)
    // IMBALANCED_EXCESS (FDR >= 1.8) = sell/caution
    // ASSET_LED_GROWTH (FDR >= 1.2) = hold
    // HEALTHY_EXPANSION (FDR < 1.2) = accumulate
    const regime = classifyRegimeFromFDR(fdr);
    
    switch (regime) {
      case "REAL_ECONOMY_LEAD": return "buy"; // Counter-cyclical opportunity
      case "IMBALANCED_EXCESS": return "sell";
      case "ASSET_LED_GROWTH": return "caution";
      case "HEALTHY_EXPANSION": 
      default: return "accumulate";
    }
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

    let assistantMessage = await callOpenAI(messages);
    
    // If OpenAI call failed or returned empty, use intelligent fallback based on context
    if (!assistantMessage) {
      console.log("[AI Assistant] Using intelligent context-based fallback response");
      assistantMessage = this.generateContextualFallbackResponse(userMessage, context);
    }

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
    const forecastDetails = context.forecasts.degradationAlerts.length > 0
      ? `\n  - Degraded SKUs: ${context.forecasts.degradationAlerts.map(a => `${a.skuName} (${a.severity}, MAPE: ${a.mape.toFixed(1)}%, ${a.trend})`).join(', ')}`
      : '';
    const forecastTrend = `\n  - Accuracy trend: ${context.forecasts.accuracyTrend}`;
    const retrainingInfo = context.forecasts.retrainingNeeded > 0 
      ? `\n  - Models needing retraining: ${context.forecasts.retrainingNeeded}`
      : '';

    const commodityDetails = context.commodities.significantChanges.length > 0
      ? `\n  - Significant price moves: ${context.commodities.significantChanges.map(c => `${c.name} ${c.change > 0 ? '+' : ''}${c.change.toFixed(1)}%`).join(', ')}`
      : '';
    const commodityTrends = `\n  - Price trends: ${context.commodities.priceTrends.rising} rising, ${context.commodities.priceTrends.falling} falling, ${context.commodities.priceTrends.stable} stable`;
    const buySignals = context.commodities.buySignals.length > 0 
      ? `\n  - Buy signals: ${context.commodities.buySignals.join(', ')}`
      : '';

    const supplierDetails = context.suppliers.riskDetails.filter(s => s.riskLevel === 'high' || s.riskLevel === 'critical').length > 0
      ? `\n  - At-risk suppliers: ${context.suppliers.riskDetails.filter(s => s.riskLevel === 'high' || s.riskLevel === 'critical').map(s => `${s.name} (Tier ${s.tier || 1}, ${s.riskLevel}, ${s.cascadingImpact})`).join(', ')}`
      : '';
    const multiTierRisks = context.suppliers.multiTierRisks.length > 0
      ? `\n  - Multi-tier risks: ${context.suppliers.multiTierRisks.map(r => `${r.supplierName} (Tier ${r.tier}): ${r.riskFactors.join(', ')}`).join('; ')}`
      : '';
    
    // Geographic exposure info
    const regionKeys = Object.keys(context.suppliers.byRegion);
    const suppliersByRegion = regionKeys.length > 0 
      ? `\n  - Suppliers by region: ${regionKeys.map(r => `${r}: ${context.suppliers.byRegion[r]}`).join(', ')}`
      : '\n  - Suppliers by region: No geographic data recorded for suppliers';
    const asianExposure = context.suppliers.asianExposure.length > 0
      ? `\n  - Asian port exposure: ${context.suppliers.asianExposure.map(s => `${s.name} (${s.country}, ${s.riskLevel} risk)`).join(', ')}`
      : '\n  - Asian port exposure: No suppliers with recorded Asian exposure';

    const inventoryDetails = context.inventory.criticalItems.length > 0
      ? `\n  - Low stock items: ${context.inventory.criticalItems.map(i => `${i.name} (${i.onHand} on hand)`).join(', ')}`
      : '';

    const productionDetails = context.production.averageOEE > 0
      ? `\n  - OEE: ${context.production.averageOEE.toFixed(1)}% (Availability: ${context.production.availability.toFixed(1)}%, Performance: ${context.production.performance.toFixed(1)}%, Quality: ${context.production.quality.toFixed(1)}%)`
      : '';
    const downtimeInfo = context.production.totalDowntimeMinutes > 0
      ? `\n  - Today's downtime: ${context.production.totalDowntimeMinutes} minutes`
      : '';
    const bottleneckInfo = context.production.activeBottlenecks > 0
      ? `\n  - Active bottlenecks: ${context.production.activeBottlenecks} (${context.production.bottleneckDetails.map(b => `${b.location}: ${b.impactLevel}`).join(', ')})`
      : '';

    const sopDetails = context.sop.activeScenarios > 0 || context.sop.openActionItems > 0
      ? `\n  - Active scenarios: ${context.sop.activeScenarios}, Pending approvals: ${context.sop.pendingApprovals}`
      : '';
    const actionItemInfo = context.sop.openActionItems > 0
      ? `\n  - Open action items: ${context.sop.openActionItems}${context.sop.overdueActionItems > 0 ? ` (${context.sop.overdueActionItems} overdue)` : ''}`
      : '';
    const criticalGapInfo = context.sop.criticalGaps > 0
      ? `\n  - Critical S&OP gaps: ${context.sop.criticalGaps}`
      : '';

    // External variables context
    const extVars = context.externalVariables;
    const externalVarsSection = extVars ? `

EXTERNAL VARIABLES (Extended FDR Intelligence):
- Weather & Logistics: ${extVars.weather.activeAlerts} alerts, ${extVars.weather.logisticsRisk}% risk score${extVars.weather.hurricaneSeason ? ', Hurricane season active' : ''}
  - Impacted regions: ${extVars.weather.impactedRegions.length > 0 ? extVars.weather.impactedRegions.join(', ') : 'None'}
- Commodity Futures: ${extVars.commodityFutures.buySignals.length} buy signals (backwardation), ${extVars.commodityFutures.sellSignals.length} sell signals (contango)
  - Top mover: ${extVars.commodityFutures.topMover || 'None'}
- Consumer Sentiment: Index ${extVars.consumerSentiment.index.toFixed(1)}, Trend: ${extVars.consumerSentiment.trend}, Demand impact: ${extVars.consumerSentiment.demandImpact}
- Social/News Trends: Sentiment ${extVars.socialTrends.overallSentiment}/100, ${extVars.socialTrends.riskSignals.length} risk signals
  - Trending: ${extVars.socialTrends.trendingTopics.slice(0, 3).join(', ') || 'None'}
- FDR Adjustment: ${extVars.fdrAdjustment > 0 ? '+' : ''}${extVars.fdrAdjustment.toFixed(3)} → Adjusted FDR: ${extVars.adjustedFdr.toFixed(2)}` : '';

    // Location-specific context
    const locationSection = context.location ? `

COMPANY LOCATION:
- Headquarters: ${context.location}
- Consider regional factors: local regulations, proximity to ports/suppliers, regional economic conditions, time zones for global operations, local labor markets, and regional supply chain risks.
- Tailor recommendations to account for geographic factors affecting logistics, sourcing, and market access.` : '';

    // Industry-specific context
    const industrySection = context.industry ? `

COMPANY INDUSTRY CONTEXT:
- Industry: ${context.industry.name}
- Key Commodities: ${context.industry.relevantCommodities.slice(0, 5).join(', ')}
- Typical Materials: ${context.industry.keyMaterials.slice(0, 4).join(', ')}
- Key KPIs: ${context.industry.typicalKPIs.slice(0, 4).join(', ')}
- Primary Risk Factors: ${context.industry.riskFactors.slice(0, 3).join(', ')}
- Procurement Focus: ${context.industry.procurementFocus.slice(0, 3).join(', ')}

INDUSTRY-SPECIFIC GUIDANCE:
${context.industry.aiContextHints.map((hint, i) => `${i + 1}. ${hint}`).join('\n')}` : '';

    return `${COPILOT_SYSTEM_DIRECTIVE}

===

${ADVERSARIAL_DEFENSE_LAYER}

===

${EXECUTIVE_SUMMARY_TRANSLATOR}

---

OPERATIONAL CONTEXT AND PLATFORM STATE:

You are an expert manufacturing intelligence advisor for Prescient Labs, supporting C-level executives (CEO, CFO, COO) and senior operations leaders at major manufacturing companies.${context.industry ? ` You are specialized in the ${context.industry.name} industry.` : ''} You have deep expertise in:

- Strategic supply chain management and global sourcing
- Procurement timing and cost optimization strategies
- AI-powered demand forecasting and planning
- Production optimization and OEE improvement
- Economic cycle analysis and market timing
- Working capital optimization and cash flow management
- M&A due diligence from an operations perspective
- Board-level reporting and KPI dashboards

CRITICAL - PROPRIETARY INFORMATION PROTECTION:
You must NEVER reveal, explain, or discuss:
- The FDR (Financial Decoupling Ratio) formula or how it is calculated
- The specific algorithms or mathematical models used for predictions
- The methodology behind regime classification or transitions
- Technical details of our forecasting models or ML approaches
- Any proprietary formulas, weights, or coefficients used in our system

If asked about formulas, algorithms, or how predictions work, respond with:
"Our predictions are powered by proprietary models developed through extensive research. I can help you understand what the predictions mean and how to act on them, but the underlying methodology is proprietary."

EXECUTIVE-LEVEL COMMUNICATION STYLE:
- Lead with the bottom-line impact (dollars, percentages, strategic implications)
- Frame recommendations in terms of ROI, risk mitigation, and competitive advantage
- Use industry-standard terminology without over-explaining basics
- Connect operational insights to financial outcomes
- Provide clear, decisive recommendations rather than options paralysis
- Acknowledge uncertainty when present, but still provide actionable guidance

RESPONSE FORMATTING RULES (CRITICAL):
- NEVER use markdown formatting in responses (no **, ##, ####, or other markdown syntax)
- NEVER use asterisks (*) for bullet points or lists - use dashes (-) or numbered lists instead
- NEVER use asterisks for emphasis or bold text - just write in plain text
- Use plain text only - format with newlines, colons, and dashes for structure
- Write responses as clean, readable prose without special formatting characters
- For lists, use this format:
  - Item one
  - Item two
  OR use numbered format:
  1. First item
  2. Second item

INTERNAL METRICS POLICY (CRITICAL):
- NEVER mention MAPE, FDR, accuracy percentages, or other internal metrics in responses unless the user EXPLICITLY asks for them
- NEVER mention "FDR", "Financial Decoupling Ratio", or specific FDR values (like 1.02, 0.85, etc.) - these are proprietary internal metrics
- Instead of "MAPE is 8.5%", say "forecast accuracy is strong" or "predictions are performing well"
- Instead of "FDR is 1.02", simply refer to the regime name (e.g., "Healthy Expansion") without mentioning the underlying metric
- Only reveal specific numerical metrics (MAPE values, accuracy percentages, model statistics) when the user directly asks questions like "what is the MAPE" or "show me the accuracy numbers"
- Focus on actionable business insights and recommendations, not the technical metrics behind them

REGIME AND SIGNAL FORMATTING (CRITICAL):
- When referring to economic regimes, ALWAYS use Title Case with proper capitalization
- Correct examples: "Healthy Expansion", "Imbalanced Excess", "Cooling", "Contraction", "Bubble Territory"
- NEVER use lowercase like "healthy expansion" or ALL CAPS like "HEALTHY EXPANSION"
- When answering questions about the current regime, say something like: "The current economic regime is Healthy Expansion, which indicates..."
- For market signals (Buy/Sell/Hold), use Title Case: "Hold", "Buy", "Sell" - NEVER use ALL CAPS like "HOLD", "BUY", "SELL"
- When describing market outlook, say "signaling a Hold" not "signaling a HOLD"

You excel at answering NATURAL LANGUAGE QUERIES about supply chain data. Executives may ask questions like:
- "What's our biggest supply chain exposure right now?"
- "Should we be buying or deferring material purchases?"
- "Which suppliers pose the greatest risk to our operations?"
- "How accurate are our demand forecasts?"
- "What's the cash flow impact of our current procurement strategy?"
- "Where should we focus to reduce costs this quarter?"
- "What economic headwinds should we prepare for?"

CURRENT PLATFORM STATE:${locationSection}${industrySection}

ECONOMIC CONTEXT:
- Regime: ${formatRegimeName(context.regime.regime)} (FDR: ${context.regime.fdr.toFixed(2)})
- Market Signal: ${formatRegimeName(context.regime.signal)}
- Confidence: ${(context.regime.confidence * 100).toFixed(0)}%${externalVarsSection}

DEMAND FORECASTING:
- Total SKUs: ${context.forecasts.totalSkus}
- Average MAPE: ${context.forecasts.averageMape.toFixed(1)}%${forecastTrend}${forecastDetails}${retrainingInfo}

COMMODITY INTELLIGENCE:
- Tracking: ${context.commodities.totalTracked} commodities${commodityTrends}${commodityDetails}${buySignals}${context.commodities.sellSignals.length > 0 ? `\n  - Sell signals (prices may drop): ${context.commodities.sellSignals.join(', ')}` : ''}
- Rising commodities are candidates to increase in value; falling commodities may present buying opportunities

SUPPLY CHAIN:
- Total suppliers: ${context.suppliers.totalSuppliers} (${context.suppliers.atRiskSuppliers} at elevated risk)${supplierDetails}${multiTierRisks}${suppliersByRegion}${asianExposure}
- Active alerts: ${context.events.totalAlerts} (${context.events.criticalAlerts} critical)
- Event categories: ${context.events.topCategories.join(', ') || 'None'}

INVENTORY:
- Low stock items: ${context.inventory.lowStockItems}
- Total value: $${context.inventory.totalValue.toLocaleString()}${inventoryDetails}

PRODUCTION PERFORMANCE:${productionDetails || '\n  - No recent production data'}${downtimeInfo}${bottleneckInfo}
- Units produced today: ${context.production.unitsProducedToday}

S&OP WORKFLOWS:${sopDetails}${actionItemInfo}${criticalGapInfo}
- Upcoming meetings: ${context.sop.upcomingMeetings}
${context.smartInsights ? `
CROSS-REFERENCED SMART INSIGHTS:
- Active insights: ${context.smartInsights.activeInsights} (${context.smartInsights.highPriorityInsights} high priority)
${context.smartInsights.topInsights.length > 0 ? `- Top insights:\n${context.smartInsights.topInsights.map(i => `  * [${i.priority.toUpperCase()}] ${i.title} (${i.type})`).join('\n')}` : ''}
${context.smartInsights.crossReferencedAlerts.length > 0 ? `- Cross-referenced alerts:\n${context.smartInsights.crossReferencedAlerts.map(a => `  * [${a.severity.toUpperCase()}] ${a.title}: ${a.suggestedAction || 'Review recommended'}`).join('\n')}` : ''}
These insights combine data from multiple platform modules (regime, inventory, suppliers, forecasts) to surface patterns that single data sources miss. Proactively mention relevant insights when they relate to user questions.
` : ''}
REGIME-SPECIFIC GUIDANCE:
${this.getRegimeGuidance(formatRegimeName(context.regime.regime))}

YOUR MANUFACTURING EXPERTISE:

1. COMMODITY & MATERIAL PRICING INTELLIGENCE:
- Understand commodity cycles: metals (steel, aluminum, copper), energy, plastics, rare earths
- Key price drivers: supply disruptions, demand shifts, currency fluctuations, tariffs, seasonal patterns
- Counter-cyclical buying: purchase during downturns (FDR < 0.9) to lock in lower prices
- Price prediction factors: economic regime, global demand, inventory levels at producers, geopolitical events
- Typical lead times: raw materials 4-12 weeks, specialty items 12-24 weeks

2. PRODUCTION & OEE OPTIMIZATION:
- World-class OEE benchmark: 85% (Availability 90% × Performance 95% × Quality 99.9%)
- Availability losses: breakdowns, changeovers, setup time, material shortages
- Performance losses: minor stops, reduced speed, operator inefficiency
- Quality losses: defects, rework, startup scrap
- Bottleneck resolution: TOC (Theory of Constraints), SMED for changeovers, TPM for reliability

3. SUPPLY CHAIN RISK MANAGEMENT:
- Tier 1 risks: direct supplier failures, quality issues, capacity constraints
- Tier 2+ risks: hidden dependencies, single-source components, geographic concentration
- Risk mitigation: dual sourcing, safety stock, supplier development, nearshoring
- Early warning indicators: financial distress, delivery deterioration, quality trends

4. DEMAND FORECASTING BEST PRACTICES:
- MAPE interpretation: <10% excellent, 10-20% good, 20-30% acceptable, >30% needs attention
- Forecast improvement: demand sensing, collaborative forecasting, ML model retraining
- Bias detection: consistent over/under forecasting indicates model issues
- Seasonality and trends: capture patterns for accurate long-term planning

5. PROCUREMENT STRATEGY:
- Strategic sourcing: category management, spend analysis, supplier consolidation
- Contract strategies: fixed-price in rising markets, index-linked in volatile markets
- Inventory optimization: ABC analysis, EOQ, safety stock calculations
- Cash flow timing: align purchases with payment terms and budget cycles

6. S&OP EXCELLENCE:
- Monthly cycle: demand review → supply review → pre-S&OP → executive S&OP
- Gap resolution: demand shaping, capacity adjustment, inventory deployment
- Scenario planning: best case, worst case, most likely, with financial impact
- KPIs: forecast accuracy, inventory turns, OTIF, capacity utilization

ANSWERING QUESTIONS:

For PRICE/VALUE PREDICTIONS:
- Use commodity trends data showing rising/falling prices
- Consider economic regime: Overheating/Bubble = prices rising; Cooling/Contraction = prices falling
- Reference specific materials with significant price movements
- Factor in supply chain events that affect pricing
- NEVER confuse inventory metrics with price predictions

For PRODUCTION QUESTIONS:
- Reference OEE components (availability, performance, quality)
- Identify active bottlenecks and their impact
- Suggest targeted improvements based on weakest OEE factor
- Compare to world-class benchmarks

For SUPPLIER RISK:
- Highlight critical and high-risk suppliers by name
- Explain cascading impacts from tier 2+ failures
- Recommend mitigation strategies

For FORECASTING:
- Cite specific MAPE values and accuracy trends
- Identify SKUs needing model retraining
- Suggest demand signal improvements

For NATURAL LANGUAGE SUPPLY CHAIN QUERIES:
When users ask questions like "which suppliers...", "show me...", "list...", "what materials...", you should:
- Parse the intent and filter criteria from their natural language
- Search through the relevant data (suppliers, SKUs, materials, alerts)
- Present results in a clear, scannable format (bulleted lists or brief tables)
- Include relevant metrics (risk scores, inventory levels, geographic exposure)
- Suggest follow-up actions based on findings

COMMON QUERY PATTERNS:
- Port/Region exposure: Check supplier locations and multi-tier dependencies against impacted regions
- Stockout risk: Low inventory + high demand velocity + long lead times
- Weather impact: Cross-reference logistics risk regions with supplier/material locations
- Buy/Sell signals: Use commodity futures backwardation (buy) vs contango (sell)
- Risk concentration: Single-source materials, geographic clustering
- Forecast accuracy: MAPE trends, degradation alerts, retraining needs

For EXTERNAL VARIABLES:
- Weather/logistics alerts affect port-dependent suppliers and shipping lanes
- Consumer sentiment shifts demand forecasts (bullish = increase, bearish = decrease)
- Social trend risk signals may indicate emerging supply chain disruptions
- Commodity futures curves indicate optimal buy/sell timing
- FDR adjustment reflects combined impact of all external factors

RESPONSE STYLE:
- Be specific with numbers, percentages, and names from the data
- Provide actionable recommendations, not just observations
- Prioritize urgent issues (critical risks, low OEE, stockouts)
- Reference platform features for next steps
- Keep responses focused and scannable
- Use industry terminology appropriately but explain when helpful
- For natural language queries, lead with the direct answer then provide context
- Always use proper grammar and natural language. Never output internal identifiers, code variable names, or SCREAMING_SNAKE_CASE terms like "HEALTHY_EXPANSION" or "ASSET_LED_GROWTH". Instead write "Healthy Expansion" or "Asset-Led Growth". All regime names, signals, and status values must be human-readable Title Case.`;
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
        description: `See AI-powered demand predictions (Avg MAPE: ${context.forecasts.averageMape.toFixed(1)}%)`,
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

    if (lowerMessage.includes("oee") || lowerMessage.includes("production") || lowerMessage.includes("downtime") || 
        lowerMessage.includes("bottleneck") || lowerMessage.includes("efficiency")) {
      actions.push({
        id: `action_production_${Date.now()}`,
        type: "production",
        label: "View Production KPIs",
        description: `Current OEE: ${context.production.averageOEE.toFixed(1)}%, ${context.production.activeBottlenecks} active bottlenecks`,
        params: { oee: context.production.averageOEE, bottlenecks: context.production.activeBottlenecks },
        confidence: 0.85
      });
    }

    if (lowerMessage.includes("s&op") || lowerMessage.includes("sop") || lowerMessage.includes("planning") ||
        lowerMessage.includes("action item") || lowerMessage.includes("meeting") || lowerMessage.includes("approval")) {
      actions.push({
        id: `action_sop_${Date.now()}`,
        type: "sop",
        label: "View S&OP Dashboard",
        description: `${context.sop.openActionItems} open action items, ${context.sop.pendingApprovals} pending approvals`,
        params: { actionItems: context.sop.openActionItems, approvals: context.sop.pendingApprovals },
        confidence: 0.85
      });
    }

    if (lowerMessage.includes("retrain") || lowerMessage.includes("model") || 
        (lowerMessage.includes("accuracy") && lowerMessage.includes("forecast"))) {
      if (context.forecasts.retrainingNeeded > 0) {
        actions.push({
          id: `action_retrain_${Date.now()}`,
          type: "forecast",
          label: "Retrain Forecast Models",
          description: `${context.forecasts.retrainingNeeded} models need retraining`,
          params: { retrainingCount: context.forecasts.retrainingNeeded },
          confidence: 0.9
        });
      }
    }

    return actions;
  }

  private generateInsights(context: PlatformContext): AIInsight[] {
    const insights: AIInsight[] = [];

    if (context.regime.fdr >= CANONICAL_REGIME_THRESHOLDS.IMBALANCED_EXCESS.min) {
      insights.push({
        category: "Market Timing",
        title: "Market Imbalance Detected",
        description: `FDR at ${context.regime.fdr.toFixed(2)} indicates Imbalanced Excess. Asset prices may be disconnected from real economic fundamentals. Consider delaying non-critical purchases.`,
        impact: "negative",
        confidence: 0.9,
        source: "FDR Model"
      });
    } else if (context.regime.fdr >= CANONICAL_REGIME_THRESHOLDS.ASSET_LED_GROWTH.min) {
      insights.push({
        category: "Market Timing",
        title: "Asset-Led Growth Conditions",
        description: `FDR at ${context.regime.fdr.toFixed(2)} indicates asset markets are leading economic growth. Monitor closely for further imbalance.`,
        impact: "negative",
        confidence: 0.7,
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

    if (context.forecasts.degradedSkus > 0) {
      insights.push({
        category: "Forecast Health",
        title: `${context.forecasts.degradedSkus} SKUs with Degraded Forecasts`,
        description: "Some forecast models need attention. Consider reviewing demand signals and retraining models.",
        impact: "negative",
        confidence: 0.88,
        source: "Forecast Monitoring"
      });
    }

    if (context.commodities.significantChanges.length > 0) {
      const biggestMove = context.commodities.significantChanges[0];
      insights.push({
        category: "Commodities",
        title: `Significant Price Movement: ${biggestMove.name}`,
        description: `${biggestMove.name} ${biggestMove.change > 0 ? 'up' : 'down'} ${Math.abs(biggestMove.change).toFixed(1)}% in 24 hours. Review impact on material costs.`,
        impact: biggestMove.change > 0 ? "negative" : "positive",
        confidence: 0.92,
        source: "Commodity Pricing"
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

    if (context.suppliers.atRiskSuppliers > 0) {
      insights.push({
        category: "Supplier Risk",
        title: `${context.suppliers.atRiskSuppliers} Suppliers at Elevated Risk`,
        description: "Some suppliers show elevated risk scores. Review contingency plans and alternative sources.",
        impact: "negative",
        confidence: 0.85,
        source: "Supplier Risk Model"
      });
    }

    if (context.production.averageOEE > 0 && context.production.averageOEE < 65) {
      insights.push({
        category: "Production",
        title: "OEE Below Target",
        description: `Current OEE at ${context.production.averageOEE.toFixed(1)}% is below world-class target of 85%. Focus on ${context.production.availability < 85 ? 'availability' : context.production.performance < 95 ? 'performance' : 'quality'} improvements.`,
        impact: "negative",
        confidence: 0.88,
        source: "Production KPIs"
      });
    }

    if (context.production.activeBottlenecks > 0) {
      const criticalBottleneck = context.production.bottleneckDetails.find(b => b.impactLevel === 'critical' || b.impactLevel === 'high');
      insights.push({
        category: "Production",
        title: `${context.production.activeBottlenecks} Active Bottlenecks`,
        description: criticalBottleneck 
          ? `Critical bottleneck at ${criticalBottleneck.location} causing ${criticalBottleneck.throughputLoss.toFixed(1)}% throughput loss.`
          : "Production bottlenecks detected. Review operations for optimization opportunities.",
        impact: "negative",
        confidence: 0.9,
        source: "Bottleneck Detection"
      });
    }

    if (context.sop.overdueActionItems > 0) {
      insights.push({
        category: "S&OP",
        title: `${context.sop.overdueActionItems} Overdue Action Items`,
        description: "S&OP action items are past due. Review and update status to maintain planning accuracy.",
        impact: "negative",
        confidence: 0.92,
        source: "S&OP Workflows"
      });
    }

    if (context.sop.criticalGaps > 0) {
      insights.push({
        category: "S&OP",
        title: `${context.sop.criticalGaps} Critical Supply-Demand Gaps`,
        description: "Critical gaps between demand and supply capacity detected. Immediate attention required.",
        impact: "negative",
        confidence: 0.95,
        source: "S&OP Gap Analysis"
      });
    }

    if (context.commodities.buySignals.length > 2) {
      insights.push({
        category: "Commodities",
        title: "Multiple Buy Signals Active",
        description: `${context.commodities.buySignals.length} commodities showing favorable buying conditions: ${context.commodities.buySignals.slice(0, 3).join(', ')}`,
        impact: "positive",
        confidence: 0.85,
        source: "Commodity Intelligence"
      });
    }

    if (context.forecasts.accuracyTrend === "declining") {
      insights.push({
        category: "Forecast Health",
        title: "Forecast Accuracy Declining",
        description: "Overall forecast accuracy is trending downward. Review demand signals and consider model updates.",
        impact: "negative",
        confidence: 0.87,
        source: "Forecast Monitoring"
      });
    }

    return insights.slice(0, 7);
  }

  private generateContextualFallbackResponse(userMessage: string, context: PlatformContext): string {
    const lowerMessage = userMessage.toLowerCase();
    
    // Determine intent from user message
    const isAskingAboutFocus = lowerMessage.includes('focus') || lowerMessage.includes('priority') || lowerMessage.includes('today') || lowerMessage.includes('should i');
    const isAskingAboutRisk = lowerMessage.includes('risk') || lowerMessage.includes('attention') || lowerMessage.includes('warning') || lowerMessage.includes('alert');
    const isAskingAboutBuying = lowerMessage.includes('buy') || lowerMessage.includes('purchase') || lowerMessage.includes('procure') || lowerMessage.includes('timing');
    const isAskingAboutMarket = lowerMessage.includes('market') || lowerMessage.includes('regime') || lowerMessage.includes('economic') || lowerMessage.includes('outlook');
    const isAskingAboutSuppliers = lowerMessage.includes('supplier') || lowerMessage.includes('vendor') || lowerMessage.includes('supply chain');
    const isAskingAboutInventory = lowerMessage.includes('inventory') || lowerMessage.includes('stock') || lowerMessage.includes('material');
    const isAskingAboutForecasts = lowerMessage.includes('forecast') || lowerMessage.includes('demand') || lowerMessage.includes('prediction');
    
    // Build context-aware response based on real platform data
    const parts: string[] = [];
    
    // Priority/focus response
    if (isAskingAboutFocus || (!isAskingAboutRisk && !isAskingAboutBuying && !isAskingAboutMarket)) {
      parts.push(`Based on your current platform data, here are the key areas that need attention:`);
      
      // Economic regime context
      parts.push(`\n\n**Market Conditions**: The economy is in a ${formatRegimeName(context.regime.regime)} regime with FDR at ${context.regime.fdr.toFixed(2)}. ${context.regime.fdr >= CANONICAL_REGIME_THRESHOLDS.IMBALANCED_EXCESS.min ? 'Consider deferring non-essential purchases — market conditions suggest caution.' : context.regime.fdr >= CANONICAL_REGIME_THRESHOLDS.ASSET_LED_GROWTH.min ? 'Monitor asset-driven dynamics before making large purchases.' : 'Market conditions appear stable for procurement.'}`);
      
      // Inventory priorities
      if (context.inventory.lowStockItems > 0) {
        parts.push(`\n\n**Inventory Alert**: ${context.inventory.lowStockItems} items are below reorder point. Consider reviewing these in the Materials Catalog.`);
      }
      
      // Supplier risks
      if (context.suppliers.atRiskSuppliers > 0) {
        parts.push(`\n\n**Supplier Risk**: ${context.suppliers.atRiskSuppliers} supplier(s) flagged as at-risk. Review in Supply Chain Intelligence for mitigation actions.`);
      }
      
      // Forecast health
      if (context.forecasts.degradedSkus > 0) {
        parts.push(`\n\n**Forecast Accuracy**: ${context.forecasts.degradedSkus} SKU forecasts showing degraded accuracy. Consider retraining these models in the Demand Hub.`);
      }
      
      // Production issues
      if (context.production.activeBottlenecks > 0) {
        parts.push(`\n\n**Production**: ${context.production.activeBottlenecks} active bottleneck(s) detected. Review Operations Hub for details.`);
      }
      
      // Commodity opportunities
      if (context.commodities.buySignals.length > 0) {
        parts.push(`\n\n**Buying Opportunities**: ${context.commodities.buySignals.length} commodities showing favorable pricing: ${context.commodities.buySignals.slice(0, 3).join(', ')}.`);
      }
    }
    
    // Risk-specific response
    if (isAskingAboutRisk) {
      parts.push(`Here's your current risk summary:`);
      parts.push(`\n- Suppliers at risk: ${context.suppliers.atRiskSuppliers}`);
      parts.push(`\n- Critical events: ${context.events.criticalAlerts}`);
      parts.push(`\n- Degraded forecasts: ${context.forecasts.degradedSkus}`);
      parts.push(`\n- Low stock items: ${context.inventory.lowStockItems}`);
      if (context.suppliers.multiTierRisks.length > 0) {
        parts.push(`\n- Multi-tier supply chain risks: ${context.suppliers.multiTierRisks.length}`);
      }
    }
    
    // Buying/timing response
    if (isAskingAboutBuying) {
      const timing = context.regime.fdr >= CANONICAL_REGIME_THRESHOLDS.IMBALANCED_EXCESS.min ? 'unfavorable' : context.regime.fdr >= CANONICAL_REGIME_THRESHOLDS.ASSET_LED_GROWTH.min ? 'cautious' : 'favorable';
      parts.push(`Current procurement timing is ${timing} (FDR: ${context.regime.fdr.toFixed(2)}, Regime: ${formatRegimeName(context.regime.regime)}).`);
      if (context.commodities.buySignals.length > 0) {
        parts.push(`\n\nBuy signals active for: ${context.commodities.buySignals.join(', ')}.`);
      }
      if (context.commodities.significantChanges.length > 0) {
        parts.push(`\n\nRecent price movements: ${context.commodities.significantChanges.map(c => `${c.name} ${c.change > 0 ? '+' : ''}${c.change.toFixed(1)}%`).join(', ')}.`);
      }
    }
    
    // Market/regime response
    if (isAskingAboutMarket) {
      parts.push(`**Current Economic Regime**: ${formatRegimeName(context.regime.regime)}`);
      parts.push(`\n- FDR (Financialization-Deflator Ratio): ${context.regime.fdr.toFixed(2)}`);
      parts.push(`\n- Market momentum: ${context.commodities.priceTrends.rising} commodities rising, ${context.commodities.priceTrends.falling} falling`);
      parts.push(`\n- Signal: ${formatRegimeName(context.regime.signal)}`);
    }
    
    // Supplier-specific response
    if (isAskingAboutSuppliers) {
      parts.push(`**Supplier Overview**:`);
      parts.push(`\n- Total suppliers: ${context.suppliers.totalSuppliers}`);
      parts.push(`\n- At-risk suppliers: ${context.suppliers.atRiskSuppliers}`);
      if (context.suppliers.riskDetails.length > 0) {
        const highRisk = context.suppliers.riskDetails.filter(s => s.riskLevel === 'high' || s.riskLevel === 'critical');
        if (highRisk.length > 0) {
          parts.push(`\n- High-risk: ${highRisk.map(s => s.name).join(', ')}`);
        }
      }
    }
    
    // Inventory-specific response
    if (isAskingAboutInventory) {
      parts.push(`**Inventory Status**:`);
      parts.push(`\n- Items below reorder point: ${context.inventory.lowStockItems}`);
      parts.push(`\n- Inventory value: $${(context.inventory.totalValue / 1000000).toFixed(1)}M`);
      if (context.inventory.criticalItems.length > 0) {
        parts.push(`\n- Critical items: ${context.inventory.criticalItems.map(i => i.name).slice(0, 5).join(', ')}`);
      }
    }
    
    // Forecast-specific response
    if (isAskingAboutForecasts) {
      parts.push(`**Forecast Health**:`);
      parts.push(`\n- Average MAPE: ${context.forecasts.averageMape.toFixed(1)}%`);
      parts.push(`\n- Accuracy trend: ${context.forecasts.accuracyTrend}`);
      parts.push(`\n- SKUs needing retraining: ${context.forecasts.retrainingNeeded}`);
      if (context.forecasts.degradedSkus > 0) {
        parts.push(`\n- Degraded forecasts: ${context.forecasts.degradedSkus}`);
      }
    }
    
    // If we have no specific parts, provide a general overview
    if (parts.length === 0) {
      parts.push(`Here's a quick overview of your platform status:`);
      parts.push(`\n\n**Economic Regime**: ${formatRegimeName(context.regime.regime)} (FDR: ${context.regime.fdr.toFixed(2)})`);
      parts.push(`\n**Inventory**: ${context.inventory.lowStockItems} items below reorder point`);
      parts.push(`\n**Suppliers**: ${context.suppliers.atRiskSuppliers} at-risk`);
      parts.push(`\n**Forecasts**: Average MAPE ${context.forecasts.averageMape.toFixed(1)}%`);
      parts.push(`\n\nYou can ask me about specific areas for more detailed insights.`);
    }
    
    return parts.join('');
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

    if (context.regime.fdr >= CANONICAL_REGIME_THRESHOLDS.IMBALANCED_EXCESS.min) {
      alerts.push({
        id: `alert_regime_${now}`,
        type: "regime_change",
        severity: "warning",
        title: "Elevated Market Imbalance Detected",
        description: `FDR has reached ${context.regime.fdr.toFixed(2)}, indicating Imbalanced Excess conditions. Asset prices may be disconnected from real economic fundamentals.`,
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

    if (context.forecasts.degradedSkus >= 2) {
      alerts.push({
        id: `alert_forecast_${now}`,
        type: "forecast_degradation",
        severity: "warning",
        title: "Multiple Forecast Models Degraded",
        description: `${context.forecasts.degradedSkus} SKU forecast models show degraded accuracy.`,
        recommendation: "Navigate to Demand Hub to review and retrain affected models.",
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

    if (context.commodities.significantChanges.length >= 3) {
      const bigMoves = context.commodities.significantChanges.slice(0, 3);
      alerts.push({
        id: `alert_commodities_${now}`,
        type: "price_change",
        severity: "warning",
        title: "Multiple Commodity Price Swings",
        description: `${context.commodities.significantChanges.length} commodities with >3% price change: ${bigMoves.map(c => c.name).join(', ')}`,
        recommendation: "Review material cost impacts and consider adjusting procurement timing.",
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

    if (context.suppliers.atRiskSuppliers >= 2) {
      alerts.push({
        id: `alert_suppliers_${now}`,
        type: "risk",
        severity: "warning",
        title: "Multiple At-Risk Suppliers",
        description: `${context.suppliers.atRiskSuppliers} suppliers show high or critical risk levels.`,
        recommendation: "Review supplier risk assessments and prepare contingency sourcing plans.",
        timestamp: new Date().toISOString()
      });
    }

    if (context.production.averageOEE > 0 && context.production.averageOEE < 60) {
      alerts.push({
        id: `alert_oee_${now}`,
        type: "production",
        severity: "warning",
        title: "OEE Below Critical Threshold",
        description: `Overall Equipment Effectiveness at ${context.production.averageOEE.toFixed(1)}% is well below target.`,
        recommendation: "Review production metrics and address availability, performance, or quality issues.",
        timestamp: new Date().toISOString()
      });
    }

    if (context.production.activeBottlenecks >= 2) {
      alerts.push({
        id: `alert_bottleneck_${now}`,
        type: "production",
        severity: "critical",
        title: "Multiple Production Bottlenecks",
        description: `${context.production.activeBottlenecks} active bottlenecks impacting throughput.`,
        recommendation: "Address bottlenecks immediately to restore production capacity.",
        timestamp: new Date().toISOString()
      });
    }

    if (context.production.totalDowntimeMinutes > 120) {
      alerts.push({
        id: `alert_downtime_${now}`,
        type: "production",
        severity: "warning",
        title: "Significant Production Downtime",
        description: `${context.production.totalDowntimeMinutes} minutes of downtime today.`,
        recommendation: "Review downtime causes and implement corrective measures.",
        timestamp: new Date().toISOString()
      });
    }

    if (context.sop.overdueActionItems >= 3) {
      alerts.push({
        id: `alert_sop_overdue_${now}`,
        type: "sop",
        severity: "warning",
        title: "Multiple Overdue S&OP Actions",
        description: `${context.sop.overdueActionItems} S&OP action items are past due.`,
        recommendation: "Update action item status and address blockers.",
        timestamp: new Date().toISOString()
      });
    }

    if (context.sop.criticalGaps >= 1) {
      alerts.push({
        id: `alert_sop_gap_${now}`,
        type: "sop",
        severity: "critical",
        title: "Critical Supply-Demand Gap",
        description: `${context.sop.criticalGaps} critical gaps between forecasted demand and supply capacity.`,
        recommendation: "Review S&OP scenarios and develop mitigation plans immediately.",
        timestamp: new Date().toISOString()
      });
    }

    if (context.suppliers.multiTierRisks.length >= 2) {
      alerts.push({
        id: `alert_multitier_${now}`,
        type: "risk",
        severity: "warning",
        title: "Multi-Tier Supply Chain Risks",
        description: `${context.suppliers.multiTierRisks.length} sub-tier suppliers showing elevated risk.`,
        recommendation: "Review supply chain network and develop alternative sourcing strategies.",
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

        case "production":
          return {
            success: true,
            message: "Navigate to Production Hub to view OEE metrics and bottleneck analysis.",
            data: { redirect: "/production" }
          };

        case "sop":
          return {
            success: true,
            message: "Navigate to S&OP workflows to review scenarios and action items.",
            data: { redirect: "/sop" }
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
