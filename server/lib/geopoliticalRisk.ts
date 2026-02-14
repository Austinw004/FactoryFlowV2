import type { IStorage } from '../storage';

export interface GeopoliticalEvent {
  id?: string;
  eventType: 'trade_war' | 'sanctions' | 'currency_crisis' | 'political_instability' | 'natural_disaster';
  region: string; // e.g., "China", "Europe", "Middle East"
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  startDate: Date;
  endDate?: Date;
  commoditiesAffected: string[];
  suppliersAffected: string[];
}

export interface RiskAssessment {
  region: string;
  eventType: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  fdrImpact: number; // Expected FDR change
  supplyChainImpact: string;
  procurementImpact: string;
  recommendations: Array<{
    action: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    timeline: string;
    fdrContext: string;
  }>;
  exposureScore: number; // 0-100
  mitigationCost: number; // Estimated $ cost to mitigate
  confidence: number; // 0-100
}

export interface RegionalFDR {
  region: string;
  fdr: number;
  regime: string;
  divergenceFromGlobal: number; // How much this region differs from global FDR
  trend: 'improving' | 'stable' | 'deteriorating';
}

export class GeopoliticalRiskEngine {
  constructor(private storage: IStorage) {}

  /**
   * Assess geopolitical risk for specific event
   */
  async assessRisk(event: GeopoliticalEvent, currentFDR: number): Promise<RiskAssessment> {
    const { eventType, region, severity } = event;

    // Calculate FDR impact based on event type and severity
    const fdrImpact = this.calculateFDRImpact(eventType, severity);

    // Determine risk level
    const riskLevel = this.determineRiskLevel(severity, fdrImpact);

    // Calculate exposure score (how much we're affected)
    const exposureScore = this.calculateExposureScore(event);

    // Generate impact assessments
    const supplyChainImpact = this.assessSupplyChainImpact(eventType, region, severity);
    const procurementImpact = this.assessProcurementImpact(eventType, severity, currentFDR);

    // Generate recommendations
    const recommendations = this.generateRecommendations(event, currentFDR, riskLevel);

    // Estimate mitigation cost
    const mitigationCost = this.estimateMitigationCost(exposureScore, severity);

    // Calculate confidence
    const confidence = this.calculateConfidence(eventType, region);

    return {
      region,
      eventType,
      riskLevel,
      fdrImpact,
      supplyChainImpact,
      procurementImpact,
      recommendations,
      exposureScore,
      mitigationCost,
      confidence,
    };
  }

  /**
   * Calculate FDR impact from geopolitical event
   */
  private calculateFDRImpact(eventType: string, severity: string): number {
    const baseImpacts = {
      trade_war: 0.15,
      sanctions: 0.12,
      currency_crisis: 0.20,
      political_instability: 0.08,
      natural_disaster: 0.05,
    };

    const severityMultipliers = {
      low: 0.5,
      medium: 1.0,
      high: 1.5,
      critical: 2.0,
    };

    const base = baseImpacts[eventType as keyof typeof baseImpacts] || 0.10;
    const multiplier = severityMultipliers[severity as keyof typeof severityMultipliers] || 1.0;

    return base * multiplier;
  }

  /**
   * Determine overall risk level
   */
  private determineRiskLevel(
    severity: string,
    fdrImpact: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (severity === 'critical' || fdrImpact > 0.25) {
      return 'critical';
    } else if (severity === 'high' || fdrImpact > 0.15) {
      return 'high';
    } else if (severity === 'medium' || fdrImpact > 0.08) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Calculate exposure score (how much company is affected)
   */
  private calculateExposureScore(event: GeopoliticalEvent): number {
    let score = 50; // Base score

    // Increase score based on commodities affected
    if (event.commoditiesAffected && event.commoditiesAffected.length > 0) {
      score += Math.min(30, event.commoditiesAffected.length * 5);
    }

    // Increase score based on suppliers affected
    if (event.suppliersAffected && event.suppliersAffected.length > 0) {
      score += Math.min(20, event.suppliersAffected.length * 10);
    }

    return Math.min(100, score);
  }

  /**
   * Assess supply chain impact
   */
  private assessSupplyChainImpact(eventType: string, region: string, severity: string): string {
    const impacts = {
      trade_war: `${severity === 'critical' ? 'Severe' : 'Significant'} delays and tariff costs for ${region} suppliers. Expect 2-4 week lead time extensions.`,
      sanctions: `Complete disruption of ${region} supply routes. Immediate alternative sourcing required.`,
      currency_crisis: `${region} supplier costs volatile. Expect 20-40% price fluctuations over next 6 months.`,
      political_instability: `Intermittent disruptions in ${region}. Build 30-45 day safety stock.`,
      natural_disaster: `Temporary ${region} supply interruption. Recovery expected in 4-8 weeks.`,
    };

    return impacts[eventType as keyof typeof impacts] || `Monitor ${region} situation closely`;
  }

  /**
   * Assess procurement impact
   */
  private assessProcurementImpact(eventType: string, severity: string, currentFDR: number): string {
    if (eventType === 'trade_war') {
      return currentFDR >= 1.8
        ? 'Trade tensions combined with market imbalance - extreme procurement caution. Lock in alternatives now.'
        : currentFDR >= 1.2
        ? 'Trade tensions with asset-led dynamics - review procurement timing carefully.'
        : 'Trade tensions + healthy FDR - opportunity to negotiate hard and diversify.';
    } else if (eventType === 'sanctions') {
      return 'Immediate sourcing pivot required. Leverage FDR-favorable regimes for alternative suppliers.';
    } else if (eventType === 'currency_crisis') {
      return severity === 'critical'
        ? 'Currency collapse creates buying opportunity if cash-rich. Consider strategic stockpiling.'
        : 'Currency weakness offers procurement discount. Accelerate purchases if FDR favorable.';
    }

    return 'Monitor and adjust procurement strategy based on FDR regime evolution.';
  }

  /**
   * Generate FDR-aware recommendations
   */
  private generateRecommendations(
    event: GeopoliticalEvent,
    currentFDR: number,
    riskLevel: string
  ): RiskAssessment['recommendations'] {
    const recommendations: RiskAssessment['recommendations'] = [];

    // Diversification recommendation
    if (event.eventType === 'trade_war' || event.eventType === 'sanctions') {
      recommendations.push({
        action: `Diversify ${event.region} suppliers to at least 3 alternative regions`,
        priority: riskLevel === 'critical' ? 'critical' : 'high',
        timeline: 'Within 60-90 days',
        fdrContext: currentFDR >= 1.8
          ? 'Market imbalance creates urgency - alternatives may become expensive'
          : currentFDR >= 1.2
          ? 'Asset-led growth dynamics - diversify while conditions are manageable'
          : 'Favorable FDR environment for establishing new supplier relationships',
      });
    }

    // Inventory buffering
    if (riskLevel === 'high' || riskLevel === 'critical') {
      recommendations.push({
        action: 'Build 45-60 day safety stock for critical materials',
        priority: 'high',
        timeline: 'Immediate - next 30 days',
        fdrContext: currentFDR < 1.0
          ? 'Real economy strength supports inventory investment'
          : 'Balance safety stock against cash preservation in uncertain regime',
      });
    }

    // Alternative sourcing
    recommendations.push({
      action: `Qualify 2-3 backup suppliers outside ${event.region}`,
      priority: riskLevel === 'critical' ? 'critical' : 'medium',
      timeline: 'Next 90-120 days',
      fdrContext: 'Dual-circuit analysis suggests geographic diversification reduces regime-dependent risk',
    });

    // Financial hedging
    if (event.eventType === 'currency_crisis') {
      recommendations.push({
        action: 'Implement currency hedging for exposed supply contracts',
        priority: 'high',
        timeline: 'Within 14-30 days',
        fdrContext: 'Currency volatility amplifies FDR regime transitions - hedge to stabilize',
      });
    }

    return recommendations;
  }

  /**
   * Estimate mitigation cost
   */
  private estimateMitigationCost(exposureScore: number, severity: string): number {
    const baseCost = 50000; // Base mitigation cost
    const exposureMultiplier = exposureScore / 50; // 0.2x to 2x
    
    const severityMultipliers = {
      low: 0.5,
      medium: 1.0,
      high: 2.0,
      critical: 3.0,
    };

    const severityMult = severityMultipliers[severity as keyof typeof severityMultipliers] || 1.0;

    return baseCost * exposureMultiplier * severityMult;
  }

  /**
   * Calculate confidence in risk assessment
   */
  private calculateConfidence(eventType: string, region: string): number {
    // Base confidence varies by event predictability
    const baseConfidence = {
      trade_war: 75, // Relatively predictable
      sanctions: 65, // Medium predictability
      currency_crisis: 60, // Hard to predict timing
      political_instability: 50, // Very uncertain
      natural_disaster: 40, // Unpredictable
    };

    let confidence = baseConfidence[eventType as keyof typeof baseConfidence] || 60;

    // Adjust for data quality (some regions better monitored)
    const wellMonitoredRegions = ['China', 'Europe', 'North America', 'United States'];
    if (wellMonitoredRegions.some(r => region.includes(r))) {
      confidence += 10;
    }

    return Math.min(95, confidence);
  }

  /**
   * Analyze regional FDR divergence
   */
  analyzeRegionalFDR(regions: RegionalFDR[], globalFDR: number): {
    mostDiverged: RegionalFDR[];
    arbitrageOpportunities: Array<{
      region: string;
      opportunity: string;
      rationale: string;
    }>;
  } {
    // Find regions with largest divergence
    const mostDiverged = regions
      .map(r => ({
        ...r,
        divergenceFromGlobal: Math.abs(r.fdr - globalFDR),
      }))
      .sort((a, b) => b.divergenceFromGlobal - a.divergenceFromGlobal)
      .slice(0, 5);

    // Identify arbitrage opportunities
    const arbitrageOpportunities = regions
      .filter(r => Math.abs(r.fdr - globalFDR) > 0.15)
      .map(r => {
        if (r.fdr < globalFDR - 0.15) {
          return {
            region: r.region,
            opportunity: 'Procurement Advantage',
            rationale: `${r.region} FDR (${r.fdr.toFixed(2)}) significantly below global (${globalFDR.toFixed(2)}) - asset prices more reasonable`,
          };
        } else {
          return {
            region: r.region,
            opportunity: 'Sell/Exit Opportunity',
            rationale: `${r.region} FDR (${r.fdr.toFixed(2)}) elevated vs global (${globalFDR.toFixed(2)}) - good time to divest assets`,
          };
        }
      });

    return { mostDiverged, arbitrageOpportunities };
  }
}
