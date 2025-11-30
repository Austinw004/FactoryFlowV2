import { storage } from "../storage";
import { NewsMonitoringService } from "./newsMonitoring";
import { calculateMAPEForSKU, checkForDegradation } from "./forecastMonitoring";
import { fetchAllCommodityPrices, CommodityPrice } from "./commodityPricing";
import { calculateSupplierRiskScore } from "./supplyChainRisk";
import { calculateOEE, detectBottlenecks } from "./productionKPIs";

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

      const lowStockMaterials = materials.filter(m => (m.onHand || 0) <= (m.reorderPoint || 10));

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

      const context: PlatformContext = {
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
          totalValue: materials.reduce((sum, m) => sum + ((m.onHand || 0) * (m.unitCost || 0)), 0),
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
        sop: sopContext
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
        region: snapshot?.region || supplier.region || 'US',
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
      
      const validMapes = trackingRecords.filter(r => r !== null && r.mape && r.mape > 0);
      
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
          region: supplier.region || 'US',
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

    return `You are an intelligent manufacturing operations copilot for Prescient Labs, an advanced supply chain intelligence platform. You provide data-driven guidance to procurement managers, operations teams, and executives.

CURRENT PLATFORM STATE:

ECONOMIC CONTEXT:
- Regime: ${context.regime.regime} (FDR: ${context.regime.fdr.toFixed(2)})
- Market Signal: ${context.regime.signal.toUpperCase()}
- Confidence: ${(context.regime.confidence * 100).toFixed(0)}%

DEMAND FORECASTING:
- Total SKUs: ${context.forecasts.totalSkus}
- Average MAPE: ${context.forecasts.averageMape.toFixed(1)}%${forecastTrend}${forecastDetails}${retrainingInfo}

COMMODITY INTELLIGENCE:
- Tracking: ${context.commodities.totalTracked} commodities${commodityTrends}${commodityDetails}${buySignals}

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

CAPABILITIES:
- Answer questions about forecasts, inventory, suppliers, production, and market conditions
- Recommend procurement timing based on FDR regime and commodity trends
- Analyze supply chain risks including multi-tier supplier dependencies
- Provide production performance insights (OEE, bottlenecks, downtime)
- Help with S&OP scenario planning and action item tracking
- Generate RFQ suggestions based on inventory levels and market timing
- Identify forecast models needing retraining
- Explain economic indicators and their manufacturing impact

Keep responses concise and actionable. Focus on data-driven recommendations with specific numbers. Prioritize critical issues first. When suggesting actions, reference specific platform features.`;
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
          const lowStock = materials.filter(m => (m.onHand || 0) <= (m.reorderPoint || 10));
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
