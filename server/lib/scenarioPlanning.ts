import type { IStorage } from '../storage';

export interface ScenarioInput {
  scenarioName: string;
  description?: string;
  
  // Macro shocks
  fdrDelta: number; // Change in FDR ratio (e.g., +0.2 or -0.3)
  newRegime?: string; // Target regime or null for calculated
  
  // Commodity price shocks
  commodityPriceChange: number; // % change (e.g., +15 or -20)
  affectedCommodities?: string[]; // Specific materials or null for all
  
  // Demand shocks
  demandChange: number; // % change (e.g., +10 or -25)
  affectedSKUs?: string[]; // Specific SKUs or null for all
  
  // Time horizon
  durationMonths: number; // How long shock persists
}

export interface ScenarioOutput {
  scenarioName: string;
  confidence: number; // 0-100
  
  // Financial impacts
  revenueImpact: number; // $ change
  revenueImpactPercent: number; // % change
  costImpact: number; // $ change
  costImpactPercent: number; // % change
  marginImpact: number; // Percentage point change
  
  // Operational impacts
  productionVolumeChange: number; // % change
  inventoryRequirement: number; // $ change
  cashFlowImpact: number; // $ change
  
  // Regime implications
  newFDR: number;
  newRegime: string;
  regimeStability: 'stable' | 'transitioning' | 'volatile';
  
  // Recommendations
  recommendations: Array<{
    category: 'procurement' | 'production' | 'inventory' | 'finance' | 'hr';
    action: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    impact: string;
    timeline: string;
  }>;
  
  // Risk factors
  risks: Array<{
    factor: string;
    probability: number; // 0-100
    impact: number; // $ or %
    mitigation: string;
  }>;
}

export class ScenarioPlanningEngine {
  constructor(private storage: IStorage) {}

  /**
   * Calculate new regime based on FDR delta
   */
  private calculateNewRegime(currentFDR: number, fdrDelta: number): { fdr: number; regime: string } {
    const newFDR = currentFDR + fdrDelta;
    
    let regime = 'Healthy Expansion';
    if (newFDR > 1.3) {
      regime = 'Imbalanced Excess';
    } else if (newFDR > 1.15) {
      regime = 'Asset-Led Growth';
    } else if (newFDR < 0.85) {
      regime = 'Real Economy Lead';
    }
    
    return { fdr: newFDR, regime };
  }

  /**
   * Determine regime stability
   */
  private assessRegimeStability(
    currentRegime: string,
    newRegime: string,
    fdrVolatility: number
  ): 'stable' | 'transitioning' | 'volatile' {
    if (currentRegime === newRegime && fdrVolatility < 0.1) {
      return 'stable';
    } else if (currentRegime !== newRegime) {
      return 'transitioning';
    } else {
      return 'volatile';
    }
  }

  /**
   * Run scenario simulation
   */
  async runScenario(
    input: ScenarioInput,
    currentContext: {
      currentFDR: number;
      currentRegime: string;
      baseRevenue: number;
      baseCosts: number;
      baseMargin: number;
    }
  ): Promise<ScenarioOutput> {
    // Calculate new economic regime
    const { fdr: newFDR, regime: newRegime } = input.newRegime 
      ? { fdr: currentContext.currentFDR + input.fdrDelta, regime: input.newRegime }
      : this.calculateNewRegime(currentContext.currentFDR, input.fdrDelta);

    // Assess regime stability
    const regimeStability = this.assessRegimeStability(
      currentContext.currentRegime,
      newRegime,
      Math.abs(input.fdrDelta)
    );

    // Calculate demand impact
    const demandMultiplier = 1 + (input.demandChange / 100);
    const revenueImpact = currentContext.baseRevenue * (demandMultiplier - 1);
    const revenueImpactPercent = input.demandChange;

    // Calculate cost impact (commodity prices)
    const commodityMultiplier = 1 + (input.commodityPriceChange / 100);
    const costImpact = currentContext.baseCosts * (commodityMultiplier - 1);
    const costImpactPercent = input.commodityPriceChange;

    // Calculate margin impact
    const newRevenue = currentContext.baseRevenue * demandMultiplier;
    const newCosts = currentContext.baseCosts * commodityMultiplier;
    const newMargin = ((newRevenue - newCosts) / newRevenue) * 100;
    const marginImpact = newMargin - currentContext.baseMargin;

    // Production volume change (follows demand)
    const productionVolumeChange = input.demandChange;

    // Inventory requirement (higher in volatile regimes)
    const inventoryMultiplier = regimeStability === 'volatile' ? 1.3 : regimeStability === 'transitioning' ? 1.15 : 1.0;
    const inventoryRequirement = currentContext.baseCosts * 0.25 * (inventoryMultiplier - 1);

    // Cash flow impact
    const cashFlowImpact = revenueImpact - costImpact - inventoryRequirement;

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      input,
      newRegime,
      regimeStability,
      { revenueImpact, costImpact, marginImpact, cashFlowImpact }
    );

    // Identify risks
    const risks = this.identifyRisks(input, newRegime, regimeStability);

    // Calculate confidence
    const confidence = this.calculateConfidence(input, regimeStability);

    return {
      scenarioName: input.scenarioName,
      confidence,
      revenueImpact,
      revenueImpactPercent,
      costImpact,
      costImpactPercent,
      marginImpact,
      productionVolumeChange,
      inventoryRequirement,
      cashFlowImpact,
      newFDR,
      newRegime,
      regimeStability,
      recommendations,
      risks,
    };
  }

  /**
   * Generate regime-aware recommendations
   */
  private generateRecommendations(
    input: ScenarioInput,
    newRegime: string,
    stability: string,
    impacts: { revenueImpact: number; costImpact: number; marginImpact: number; cashFlowImpact: number }
  ): ScenarioOutput['recommendations'] {
    const recommendations: ScenarioOutput['recommendations'] = [];

    // Procurement recommendations
    if (newRegime === 'Imbalanced Excess' || newRegime === 'Asset-Led Growth') {
      recommendations.push({
        category: 'procurement',
        action: 'Delay non-critical material purchases - asset prices inflated',
        priority: 'high',
        impact: 'Avoid 10-15% premium on commodity purchases',
        timeline: 'Next 3-6 months',
      });
    } else if (newRegime === 'Real Economy Lead') {
      recommendations.push({
        category: 'procurement',
        action: 'Accelerate strategic material purchases - favorable pricing window',
        priority: 'critical',
        impact: 'Capture 10-20% discount vs future prices',
        timeline: 'Next 30-60 days',
      });
    }

    // Production recommendations
    if (input.demandChange > 15) {
      recommendations.push({
        category: 'production',
        action: 'Increase production capacity - add shifts or equipment',
        priority: 'high',
        impact: `Meet ${input.demandChange}% demand increase`,
        timeline: `Within ${Math.ceil(input.durationMonths / 2)} months`,
      });
    } else if (input.demandChange < -15) {
      recommendations.push({
        category: 'production',
        action: 'Reduce production - optimize utilization',
        priority: 'medium',
        impact: 'Avoid inventory buildup and waste',
        timeline: 'Next 30 days',
      });
    }

    // Inventory recommendations
    if (stability === 'volatile' || stability === 'transitioning') {
      recommendations.push({
        category: 'inventory',
        action: 'Build safety stock - regime uncertainty ahead',
        priority: 'high',
        impact: 'Buffer against 20-30% supply/demand swings',
        timeline: 'Next 60-90 days',
      });
    }

    // Financial recommendations
    if (impacts.cashFlowImpact < -100000) {
      recommendations.push({
        category: 'finance',
        action: 'Secure credit line or defer capex - negative cash impact',
        priority: 'critical',
        impact: `Offset $${Math.abs(impacts.cashFlowImpact).toLocaleString()} cash shortfall`,
        timeline: 'Immediate',
      });
    }

    // HR recommendations
    if (Math.abs(input.demandChange) > 20) {
      const action = input.demandChange > 0 ? 'Hire and train workers' : 'Implement flexible staffing';
      recommendations.push({
        category: 'hr',
        action,
        priority: 'medium',
        impact: `Align workforce with ${input.demandChange > 0 ? 'growth' : 'contraction'}`,
        timeline: `${Math.ceil(input.durationMonths / 3)}-${input.durationMonths} months`,
      });
    }

    return recommendations;
  }

  /**
   * Identify scenario risks
   */
  private identifyRisks(
    input: ScenarioInput,
    newRegime: string,
    stability: string
  ): ScenarioOutput['risks'] {
    const risks: ScenarioOutput['risks'] = [];

    // Regime transition risk
    if (stability === 'transitioning') {
      risks.push({
        factor: 'Regime Transition Turbulence',
        probability: 75,
        impact: 10, // % revenue volatility
        mitigation: 'Diversify suppliers, build inventory buffers, hedge commodity exposure',
      });
    }

    // Commodity price volatility
    if (Math.abs(input.commodityPriceChange) > 20) {
      risks.push({
        factor: 'Commodity Price Shock',
        probability: 60,
        impact: Math.abs(input.commodityPriceChange),
        mitigation: 'Lock in contracts, explore substitutes, pass costs to customers',
      });
    }

    // Demand volatility
    if (Math.abs(input.demandChange) > 25) {
      risks.push({
        factor: 'Demand Whipsaw Effect',
        probability: 55,
        impact: Math.abs(input.demandChange * 0.5), // Reversal could be 50% of initial shock
        mitigation: 'Flexible manufacturing, postponement strategies, variable cost structure',
      });
    }

    // Bubble burst risk (Imbalanced Excess)
    if (newRegime === 'Imbalanced Excess') {
      risks.push({
        factor: 'Asset Bubble Correction',
        probability: 80,
        impact: 30, // % asset value decline
        mitigation: 'Minimize asset acquisitions, increase liquidity, stress-test balance sheet',
      });
    }

    return risks;
  }

  /**
   * Calculate confidence in scenario
   */
  private calculateConfidence(input: ScenarioInput, stability: string): number {
    let confidence = 70; // Base confidence

    // Reduce confidence for extreme shocks
    if (Math.abs(input.fdrDelta) > 0.4) confidence -= 15;
    if (Math.abs(input.commodityPriceChange) > 30) confidence -= 10;
    if (Math.abs(input.demandChange) > 30) confidence -= 10;

    // Reduce confidence for long horizons
    if (input.durationMonths > 24) confidence -= 15;

    // Reduce confidence in volatile regimes
    if (stability === 'volatile') confidence -= 10;

    return Math.max(40, Math.min(95, confidence));
  }

  /**
   * Compare multiple scenarios
   */
  async compareScenarios(
    scenarios: ScenarioOutput[]
  ): Promise<{
    bestCase: ScenarioOutput;
    worstCase: ScenarioOutput;
    mostLikely: ScenarioOutput;
    riskAdjustedBest: ScenarioOutput;
  }> {
    // Best case: highest cash flow impact
    const bestCase = scenarios.reduce((best, curr) => 
      curr.cashFlowImpact > best.cashFlowImpact ? curr : best
    );

    // Worst case: lowest cash flow impact
    const worstCase = scenarios.reduce((worst, curr) => 
      curr.cashFlowImpact < worst.cashFlowImpact ? curr : worst
    );

    // Most likely: highest confidence
    const mostLikely = scenarios.reduce((likely, curr) => 
      curr.confidence > likely.confidence ? curr : likely
    );

    // Risk-adjusted best: balance impact and confidence
    const riskAdjustedBest = scenarios.reduce((best, curr) => {
      const currScore = curr.cashFlowImpact * (curr.confidence / 100);
      const bestScore = best.cashFlowImpact * (best.confidence / 100);
      return currScore > bestScore ? curr : best;
    });

    return { bestCase, worstCase, mostLikely, riskAdjustedBest };
  }
}
