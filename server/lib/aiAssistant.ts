import { storage } from "../storage";
import { NewsMonitoringService } from "./newsMonitoring";
import { calculateMAPEForSKU, checkForDegradation } from "./forecastMonitoring";
import { fetchAllCommodityPrices, CommodityPrice } from "./commodityPricing";
import { calculateSupplierRiskScore } from "./supplyChainRisk";
import { calculateOEE, detectBottlenecks } from "./productionKPIs";
import { fetchExternalVariables } from "./externalAPIs";
import { getAISystemPromptEnhancements, getIndustryConfig } from "./industryPersonalization";

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
    }>;
    multiTierRisks: Array<{
      supplierId: string;
      supplierName: string;
      tier: number;
      affectedMaterials: number;
      riskFactors: string[];
    }>;
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
  
  // Natural language supply chain queries
  if (lowerMessage.includes("supplier") && (lowerMessage.includes("port") || lowerMessage.includes("asian") || lowerMessage.includes("exposure"))) {
    return "To identify suppliers with port exposure, I recommend checking the Supply Chain section under Multi-Tier Supplier Mapping. This shows supplier locations, regional dependencies, and logistics risk factors. You can filter by region to see which suppliers have Asian port dependencies.";
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
  
  return "I'm here to help with your manufacturing intelligence needs. You can ask about demand forecasts, supply chain risks, market timing, or procurement strategies. How can I assist you today?";
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

      // Fetch company industry for personalized context
      let industryContext = undefined;
      try {
        const company = await storage.getCompany(companyId);
        if (company?.industry) {
          const config = getIndustryConfig(company.industry);
          industryContext = {
            name: config.industry,
            relevantCommodities: config.relevantCommodities,
            keyMaterials: config.keyMaterials,
            typicalKPIs: config.typicalKPIs,
            riskFactors: config.riskFactors,
            procurementFocus: config.procurementFocus,
            aiContextHints: config.aiContextHints,
          };
        }
      } catch (e) {
        console.log("[AI Assistant] Could not fetch company industry");
      }

      const context: PlatformContext = {
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
          multiTierRisks: supplierContext.multiTierRisks
        },
        production: productionContext,
        sop: sopContext,
        externalVariables: externalVarsContext
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
    riskDetails: Array<{ name: string; riskLevel: string; score: number; tier?: number; cascadingImpact?: string }>;
    multiTierRisks: Array<{ supplierId: string; supplierName: string; tier: number; affectedMaterials: number; riskFactors: string[] }>;
  } {
    const snapshotMap = new Map(riskSnapshots.map(s => [s.supplierId, s]));
    
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

      return {
        name: supplier.name,
        riskLevel: assessment.riskLevel,
        score: Math.round(assessment.overallRiskScore),
        tier: snapshot?.tier || supplier.tier || 1,
        cascadingImpact
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

    return { riskDetails, multiTierRisks };
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
      suppliers: { totalSuppliers: 0, atRiskSuppliers: 0, riskDetails: [], multiTierRisks: [] },
      production: { averageOEE: 0, availability: 0, performance: 0, quality: 0, totalDowntimeMinutes: 0, activeBottlenecks: 0, bottleneckDetails: [], recentRuns: 0, unitsProducedToday: 0 },
      sop: { activeScenarios: 0, pendingApprovals: 0, openActionItems: 0, overdueActionItems: 0, upcomingMeetings: 0, criticalGaps: 0, scenarioDetails: [], actionItemDetails: [] }
    };
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

    return `You are an expert manufacturing operations copilot for Prescient Labs.${context.industry ? ` You are specialized in the ${context.industry.name} industry.` : ''} You have deep expertise in supply chain management, procurement strategy, demand forecasting, production optimization, and economic cycle analysis. You provide actionable, data-driven guidance to manufacturing professionals.

You excel at answering NATURAL LANGUAGE QUERIES about supply chain data. Users may ask questions in plain English like:
- "Which suppliers have exposure to Asian ports?"
- "Show SKUs at risk of stockout"
- "What materials are impacted by hurricane season?"
- "List suppliers in regions with high geopolitical risk"
- "Which commodities should we buy now?"

CURRENT PLATFORM STATE:${industrySection}

ECONOMIC CONTEXT:
- Regime: ${context.regime.regime} (FDR: ${context.regime.fdr.toFixed(2)})
- Market Signal: ${context.regime.signal.toUpperCase()}
- Confidence: ${(context.regime.confidence * 100).toFixed(0)}%${externalVarsSection}

DEMAND FORECASTING:
- Total SKUs: ${context.forecasts.totalSkus}
- Average MAPE: ${context.forecasts.averageMape.toFixed(1)}%${forecastTrend}${forecastDetails}${retrainingInfo}

COMMODITY INTELLIGENCE:
- Tracking: ${context.commodities.totalTracked} commodities${commodityTrends}${commodityDetails}${buySignals}${context.commodities.sellSignals.length > 0 ? `\n  - Sell signals (prices may drop): ${context.commodities.sellSignals.join(', ')}` : ''}
- Rising commodities are candidates to increase in value; falling commodities may present buying opportunities

SUPPLY CHAIN:
- Total suppliers: ${context.suppliers.totalSuppliers} (${context.suppliers.atRiskSuppliers} at elevated risk)${supplierDetails}${multiTierRisks}
- Active alerts: ${context.events.totalAlerts} (${context.events.criticalAlerts} critical)
- Event categories: ${context.events.topCategories.join(', ') || 'None'}

INVENTORY:
- Low stock items: ${context.inventory.lowStockItems}
- Total value: $${context.inventory.totalValue.toLocaleString()}${inventoryDetails}

PRODUCTION PERFORMANCE:${productionDetails || '\n  - No recent production data'}${downtimeInfo}${bottleneckInfo}
- Units produced today: ${context.production.unitsProducedToday}

S&OP WORKFLOWS:${sopDetails}${actionItemInfo}${criticalGapInfo}
- Upcoming meetings: ${context.sop.upcomingMeetings}

REGIME-SPECIFIC GUIDANCE:
${this.getRegimeGuidance(context.regime.regime)}

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
- For natural language queries, lead with the direct answer then provide context`;
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
