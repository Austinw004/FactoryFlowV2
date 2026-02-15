import { db } from "../db";
import { 
  skus, materials, suppliers, rfqs, economicSnapshots, 
  forecastAccuracyTracking, demandHistory 
} from "@shared/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { type RegimeEvidence, CANONICAL_REGIME_THRESHOLDS } from "./regimeConstants";

export interface SmartInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'action' | 'trend';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  dataPoints: string[];
  actionLink?: string;
  actionLabel?: string;
  metrics?: Record<string, string | number>;
  regimeBasis?: {
    fdr: number;
    regime: string;
    confidenceLevel: number;
    derivedFrom: string;
  };
  timestamp: Date;
}

export interface CrossReferencedAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: string;
  title: string;
  message: string;
  relatedData: {
    type: string;
    name: string;
    value: string | number;
    link?: string;
  }[];
  suggestedAction?: string;
  createdAt: Date;
}

export class SmartInsightsService {
  
  async generateInsights(companyId: string): Promise<SmartInsight[]> {
    const insights: SmartInsight[] = [];
    
    try {
      const [regime, skuData, supplierData, commodities, recentRfqs] = await Promise.all([
        this.getCurrentRegime(companyId),
        this.getSkuInsights(companyId),
        this.getSupplierInsights(companyId),
        this.getCommodityInsights(companyId),
        this.getRfqInsights(companyId),
      ]);
      
      if (regime) {
        insights.push(...this.generateRegimeInsights(regime, skuData, commodities));
      }
      
      if (skuData.lowStock.length > 0) {
        insights.push(this.generateLowStockInsight(skuData.lowStock, regime));
      }
      
      if (skuData.highDemand.length > 0) {
        insights.push(this.generateDemandTrendInsight(skuData.highDemand, regime));
      }
      
      if (supplierData.atRisk.length > 0) {
        insights.push(this.generateSupplierRiskInsight(supplierData.atRisk, skuData.all));
      }
      
      if (commodities.rising.length > 0) {
        insights.push(this.generateCommodityInsight(commodities.rising, commodities.falling, regime));
      }
      
      if (recentRfqs.pending > 0) {
        insights.push(this.generateProcurementInsight(recentRfqs, regime));
      }
      
      insights.push(...this.generateCrossReferencedOpportunities(regime, skuData, supplierData, commodities));
      
    } catch (error) {
      console.error('[SmartInsights] Error generating insights:', error);
    }
    
    return insights.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }).slice(0, 10);
  }
  
  async generateCrossReferencedAlerts(companyId: string): Promise<CrossReferencedAlert[]> {
    const alerts: CrossReferencedAlert[] = [];
    
    try {
      const [regime, skuData, supplierData, commodities] = await Promise.all([
        this.getCurrentRegime(companyId),
        this.getSkuInsights(companyId),
        this.getSupplierInsights(companyId),
        this.getCommodityInsights(companyId),
      ]);
      
      if (skuData.lowStock.length > 0 && supplierData.atRisk.length > 0) {
        const affectedSkus = skuData.lowStock.filter(sku => 
          supplierData.atRisk.some(s => s.id === sku.primarySupplierId)
        );
        
        if (affectedSkus.length > 0) {
          alerts.push({
            id: `compound-risk-${Date.now()}`,
            severity: 'critical',
            category: 'Supply Chain',
            title: 'Compound Supply Risk Detected',
            message: `${affectedSkus.length} low-stock items depend on at-risk suppliers`,
            relatedData: [
              { type: 'SKUs', name: 'Low Stock Items', value: affectedSkus.length, link: '/demand' },
              { type: 'Suppliers', name: 'At-Risk Suppliers', value: supplierData.atRisk.length, link: '/supply-chain' },
            ],
            suggestedAction: 'Review alternative suppliers for critical materials',
            createdAt: new Date(),
          });
        }
      }
      
      if (regime && regime.regime === 'CONTRACTION' && commodities.rising.length > 3) {
        alerts.push({
          id: `regime-commodity-${Date.now()}`,
          severity: 'warning',
          category: 'Market Conditions',
          title: 'Counter-Cyclical Opportunity',
          message: 'Economic contraction with rising commodity prices - review procurement timing',
          relatedData: [
            { type: 'Regime', name: 'Current State', value: regime.regime, link: '/strategy' },
            { type: 'Commodities', name: 'Rising Prices', value: commodities.rising.length, link: '/forecasting' },
            { type: 'FDR', name: 'Score', value: regime.fdr?.toFixed(2) || 'N/A' },
          ],
          suggestedAction: 'Consider deferring non-critical purchases',
          createdAt: new Date(),
        });
      }
      
      if (skuData.forecastDegrading.length > 0) {
        alerts.push({
          id: `forecast-accuracy-${Date.now()}`,
          severity: 'warning',
          category: 'Forecasting',
          title: 'Forecast Accuracy Degrading',
          message: `${skuData.forecastDegrading.length} SKUs showing increased forecast error`,
          relatedData: [
            { type: 'SKUs', name: 'Affected Products', value: skuData.forecastDegrading.length, link: '/demand' },
          ],
          suggestedAction: 'Review demand patterns and consider retraining models',
          createdAt: new Date(),
        });
      }
      
    } catch (error) {
      console.error('[SmartInsights] Error generating alerts:', error);
    }
    
    return alerts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }
  
  private async getCurrentRegime(companyId: string) {
    try {
      const [snapshot] = await db.select()
        .from(economicSnapshots)
        .where(eq(economicSnapshots.companyId, companyId))
        .orderBy(desc(economicSnapshots.createdAt))
        .limit(1);
      return snapshot;
    } catch {
      return null;
    }
  }
  
  private async getSkuInsights(companyId: string) {
    try {
      const allSkus = await db.select().from(skus).where(eq(skus.companyId, companyId));
      
      const lowStock = allSkus.filter(s => {
        const current = Number(s.currentStock) || 0;
        const safety = Number(s.safetyStock) || 0;
        return current <= safety * 1.2;
      });
      
      const highDemand = allSkus.filter(s => {
        const avgDemand = Number(s.averageMonthlyDemand) || 0;
        return avgDemand > 1000;
      });
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentAccuracyTracking = await db.select()
        .from(forecastAccuracyTracking)
        .where(and(
          eq(forecastAccuracyTracking.companyId, companyId),
          gte(forecastAccuracyTracking.calculatedAt, thirtyDaysAgo)
        ));
      
      const forecastDegrading = recentAccuracyTracking.filter(p => {
        const mape = Number(p.mape) || 0;
        return mape > 15;
      });
      
      return { all: allSkus, lowStock, highDemand, forecastDegrading };
    } catch {
      return { all: [], lowStock: [], highDemand: [], forecastDegrading: [] };
    }
  }
  
  private async getSupplierInsights(companyId: string) {
    try {
      const allSuppliers = await db.select().from(suppliers).where(eq(suppliers.companyId, companyId));
      
      const atRisk = allSuppliers.filter(s => {
        const riskScore = Number(s.riskScore) || 0;
        return riskScore > 60;
      });
      
      const preferred = allSuppliers.filter(s => s.status === 'preferred');
      
      return { all: allSuppliers, atRisk, preferred };
    } catch {
      return { all: [], atRisk: [], preferred: [] };
    }
  }
  
  private async getCommodityInsights(companyId: string) {
    try {
      const allMaterials = await db.select()
        .from(materials)
        .where(eq(materials.companyId, companyId));
      
      const rising: any[] = [];
      const falling: any[] = [];
      
      return { all: allMaterials, rising, falling };
    } catch {
      return { all: [], rising: [], falling: [] };
    }
  }
  
  private async getRfqInsights(companyId: string) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentRfqs = await db.select()
        .from(rfqs)
        .where(and(
          eq(rfqs.companyId, companyId),
          gte(rfqs.createdAt, thirtyDaysAgo)
        ));
      
      const pending = recentRfqs.filter(r => r.status === 'pending' || r.status === 'sent').length;
      const approved = recentRfqs.filter(r => r.status === 'approved').length;
      const total = recentRfqs.length;
      
      return { pending, approved, total };
    } catch {
      return { pending: 0, approved: 0, total: 0 };
    }
  }
  
  private generateRegimeInsights(regime: any, skuData: any, commodities: any): SmartInsight[] {
    const insights: SmartInsight[] = [];
    const regimeName = regime.regime || 'Unknown';
    const fdr = regime.fdr || 1.0;
    
    const regimeBasis = {
      fdr,
      regime: regimeName,
      confidenceLevel: regime.confidence?.overall || 0.5,
      derivedFrom: 'dual_circuit_fdr_model',
    };

    if (regimeName === 'REAL_ECONOMY_LEAD' && fdr >= CANONICAL_REGIME_THRESHOLDS.REAL_ECONOMY_LEAD.min) {
      insights.push({
        id: `regime-opportunity-${Date.now()}`,
        type: 'opportunity',
        priority: 'high',
        title: 'Counter-Cyclical Procurement Window',
        description: `FDR at ${fdr.toFixed(2)} indicates asset-real economy decoupling. Canonical threshold: 2.5. Lock in supplier terms while real economy leads.`,
        dataPoints: [
          `FDR: ${fdr.toFixed(2)} (threshold: 2.5)`,
          `Regime: ${regimeName}`,
          `${commodities.falling.length} commodities trending down`,
        ],
        actionLink: '/procurement',
        actionLabel: 'Review Procurement',
        metrics: { fdr, fallingCommodities: commodities.falling.length },
        regimeBasis,
        timestamp: new Date(),
      });
    }
    
    if (regimeName === 'ASSET_LED_GROWTH' && fdr >= 1.65) {
      insights.push({
        id: `regime-caution-${Date.now()}`,
        type: 'risk',
        priority: 'medium',
        title: 'Approaching Imbalanced Excess Threshold',
        description: `FDR at ${fdr.toFixed(2)} approaching IMBALANCED_EXCESS boundary (1.8). Consider securing supply agreements before regime transition.`,
        dataPoints: [
          `FDR: ${fdr.toFixed(2)} (next threshold: 1.8)`,
          `Distance to transition: ${(1.8 - fdr).toFixed(2)}`,
          `${skuData.lowStock.length} items at low stock`,
        ],
        actionLink: '/supply-chain',
        actionLabel: 'Review Supply Chain',
        regimeBasis,
        timestamp: new Date(),
      });
    }
    
    return insights;
  }
  
  private generateLowStockInsight(lowStockSkus: any[], regime: any): SmartInsight {
    const urgency = regime?.regime === 'CONTRACTION' ? 'medium' : 'high';
    
    return {
      id: `low-stock-${Date.now()}`,
      type: 'action',
      priority: urgency,
      title: `${lowStockSkus.length} Products Need Attention`,
      description: 'Inventory levels approaching safety stock thresholds',
      dataPoints: lowStockSkus.slice(0, 3).map(s => `${s.name}: ${s.currentStock} units`),
      actionLink: '/demand',
      actionLabel: 'View Inventory',
      metrics: { count: lowStockSkus.length },
      timestamp: new Date(),
    };
  }
  
  private generateDemandTrendInsight(highDemandSkus: any[], regime: any): SmartInsight {
    return {
      id: `demand-trend-${Date.now()}`,
      type: 'trend',
      priority: 'medium',
      title: 'High-Demand Products',
      description: `${highDemandSkus.length} products showing strong demand patterns`,
      dataPoints: highDemandSkus.slice(0, 3).map(s => `${s.name}: ${s.averageMonthlyDemand}/month`),
      actionLink: '/forecasting',
      actionLabel: 'View Forecasts',
      timestamp: new Date(),
    };
  }
  
  private generateSupplierRiskInsight(atRiskSuppliers: any[], allSkus: any[]): SmartInsight {
    const affectedSkuCount = allSkus.filter(sku => 
      atRiskSuppliers.some(s => s.id === sku.primarySupplierId)
    ).length;
    
    return {
      id: `supplier-risk-${Date.now()}`,
      type: 'risk',
      priority: 'high',
      title: 'Supplier Risk Alert',
      description: `${atRiskSuppliers.length} suppliers showing elevated risk scores`,
      dataPoints: [
        ...atRiskSuppliers.slice(0, 2).map(s => `${s.name}: Risk ${s.riskScore}`),
        `${affectedSkuCount} products potentially affected`,
      ],
      actionLink: '/supply-chain',
      actionLabel: 'Review Suppliers',
      metrics: { suppliers: atRiskSuppliers.length, affectedSkus: affectedSkuCount },
      timestamp: new Date(),
    };
  }
  
  private generateCommodityInsight(rising: any[], falling: any[], regime: any): SmartInsight {
    const type = falling.length > rising.length ? 'opportunity' : 'risk';
    
    return {
      id: `commodity-${Date.now()}`,
      type,
      priority: 'medium',
      title: 'Material Price Movements',
      description: `${rising.length} commodities rising, ${falling.length} falling in last 24h`,
      dataPoints: [
        ...rising.slice(0, 2).map(c => `${c.material}: +${c.changePercent24h?.toFixed(1)}%`),
        ...falling.slice(0, 2).map(c => `${c.material}: ${c.changePercent24h?.toFixed(1)}%`),
      ],
      actionLink: '/forecasting',
      actionLabel: 'View Prices',
      timestamp: new Date(),
    };
  }
  
  private generateProcurementInsight(rfqData: any, regime: any): SmartInsight {
    return {
      id: `procurement-${Date.now()}`,
      type: 'action',
      priority: rfqData.pending > 5 ? 'high' : 'low',
      title: 'Pending Procurement Actions',
      description: `${rfqData.pending} RFQs awaiting review`,
      dataPoints: [
        `Pending: ${rfqData.pending}`,
        `Approved this month: ${rfqData.approved}`,
        `Total activity: ${rfqData.total}`,
      ],
      actionLink: '/procurement',
      actionLabel: 'Review RFQs',
      timestamp: new Date(),
    };
  }
  
  private generateCrossReferencedOpportunities(
    regime: any, 
    skuData: any, 
    supplierData: any, 
    commodities: any
  ): SmartInsight[] {
    const insights: SmartInsight[] = [];
    
    if (commodities.falling.length > 3 && skuData.lowStock.length > 0) {
      insights.push({
        id: `cross-buy-signal-${Date.now()}`,
        type: 'opportunity',
        priority: 'high',
        title: 'Strategic Buying Window',
        description: 'Multiple commodities declining while inventory needs replenishment',
        dataPoints: [
          `${commodities.falling.length} commodities trending down`,
          `${skuData.lowStock.length} items need restocking`,
          regime ? `Current regime: ${regime.regime}` : 'Check market conditions',
        ],
        actionLink: '/procurement',
        actionLabel: 'Plan Purchases',
        timestamp: new Date(),
      });
    }
    
    if (supplierData.preferred.length > 0 && skuData.highDemand.length > 0) {
      insights.push({
        id: `supplier-demand-${Date.now()}`,
        type: 'trend',
        priority: 'low',
        title: 'Supplier-Demand Alignment',
        description: 'High-demand products aligned with preferred suppliers',
        dataPoints: [
          `${supplierData.preferred.length} preferred suppliers`,
          `${skuData.highDemand.length} high-demand products`,
        ],
        actionLink: '/supply-chain',
        actionLabel: 'View Network',
        timestamp: new Date(),
      });
    }
    
    return insights;
  }
}

export const smartInsightsService = new SmartInsightsService();
