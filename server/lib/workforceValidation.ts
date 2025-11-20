/**
 * Workforce Economics Validation
 * 
 * Tests dual-circuit FDR theory on labor markets:
 * - High FDR (bubble) → Wage stagnation, layoffs, rising unemployment, productivity pressure
 * - Low FDR (real economy lead) → Wage growth, hiring, falling unemployment, productivity gains
 * - Asset-Led Growth → Wage-price disconnect, turnover, skill mismatches
 * - Healthy Expansion → Balanced labor market, moderate wage growth
 * 
 * Validates across MANY data points: wages, unemployment, hiring, turnover, overtime, productivity
 */

import type { InsertWorkforcePrediction } from '@shared/schema';

export interface WorkforceContext {
  fdr: number;
  regime: 'HEALTHY_EXPANSION' | 'ASSET_LED_GROWTH' | 'IMBALANCED_EXCESS' | 'REAL_ECONOMY_LEAD';
  currentAverageWage: number;
  currentHeadcount: number;
  currentTurnoverRate: number; // % annual
  currentUnemploymentRate: number; // Industry/local %
  currentHiringRate: number; // Hires per month
  currentOvertimeHours: number; // Avg hours per worker
  currentProductivity: number; // Output per worker
  industryGrowth: number; // % industry growth
}

/**
 * Dual-Circuit Workforce Model
 * 
 * THESIS: Labor economics follows dual-circuit dynamics:
 * 
 * Real Economy Lead (FDR < 1.2):
 * - Strong fundamentals → hiring → wage growth → low unemployment
 * - Companies invest in people, not just assets
 * - Productivity gains from better tools/training
 * 
 * Healthy Expansion (1.2 < FDR < 1.5):
 * - Balanced growth → moderate hiring → steady wages
 * - Normal labor dynamics
 * 
 * Asset-Led Growth (1.5 < FDR < 1.8):
 * - Asset focus → wage stagnation → turnover rises
 * - Financial gains don't reach workers
 * - Productivity pressure without investment
 * 
 * Imbalanced Excess (FDR > 1.8):
 * - Bubble → layoffs → unemployment spikes
 * - Wage cuts or freezes
 * - High turnover, low morale
 */
export class DualCircuitWorkforceModel {
  /**
   * Predict average wage based on dual-circuit regime
   */
  predictAverageWage(context: WorkforceContext): number {
    let baseWage = context.currentAverageWage;
    
    // Dual-circuit wage dynamics
    if (context.regime === 'REAL_ECONOMY_LEAD') {
      // Low FDR: Real economy strength → labor power → wage growth
      baseWage = baseWage * 1.06; // +6% annual wage growth (strong)
    } else if (context.regime === 'HEALTHY_EXPANSION') {
      // Balanced: Normal wage growth
      baseWage = baseWage * 1.03; // +3% typical inflation + productivity
    } else if (context.regime === 'ASSET_LED_GROWTH') {
      // Rising FDR: Profits to assets, not labor
      baseWage = baseWage * 1.01; // +1% wage stagnation
    } else if (context.regime === 'IMBALANCED_EXCESS') {
      // Bubble: Wage freezes or cuts
      baseWage = baseWage * 0.98; // -2% real wage decline
    }
    
    return baseWage;
  }
  
  /**
   * Predict headcount based on regime
   */
  predictHeadcount(context: WorkforceContext): number {
    let baseHeadcount = context.currentHeadcount;
    
    if (context.regime === 'REAL_ECONOMY_LEAD') {
      // Strong fundamentals → hiring
      const growthRate = 1 + (context.industryGrowth * 0.8); // 80% of industry growth
      baseHeadcount = Math.round(baseHeadcount * growthRate);
    } else if (context.regime === 'HEALTHY_EXPANSION') {
      // Normal hiring
      baseHeadcount = Math.round(baseHeadcount * 1.02); // +2%
    } else if (context.regime === 'ASSET_LED_GROWTH') {
      // Productivity squeeze, minimal hiring
      baseHeadcount = Math.round(baseHeadcount * 0.98); // -2%
    } else if (context.regime === 'IMBALANCED_EXCESS') {
      // Layoffs during bubble
      baseHeadcount = Math.round(baseHeadcount * 0.90); // -10% layoffs
    }
    
    return Math.max(1, baseHeadcount);
  }
  
  /**
   * Predict turnover rate
   */
  predictTurnoverRate(context: WorkforceContext): number {
    let baseTurnover = context.currentTurnoverRate;
    
    if (context.regime === 'REAL_ECONOMY_LEAD') {
      // Good jobs, employees stay
      baseTurnover = baseTurnover * 0.70; // -30% turnover
    } else if (context.regime === 'HEALTHY_EXPANSION') {
      // Normal churn
      baseTurnover = baseTurnover * 0.95; // -5%
    } else if (context.regime === 'ASSET_LED_GROWTH') {
      // Dissatisfaction → quit for better opportunities
      baseTurnover = baseTurnover * 1.35; // +35% turnover
    } else if (context.regime === 'IMBALANCED_EXCESS') {
      // Forced turnover (layoffs) + voluntary (fear)
      baseTurnover = baseTurnover * 1.60; // +60% turnover spike
    }
    
    return Math.min(100, baseTurnover); // Cap at 100%
  }
  
  /**
   * Predict unemployment rate (local/industry)
   */
  predictUnemploymentRate(context: WorkforceContext): number {
    let baseUnemployment = context.currentUnemploymentRate;
    
    if (context.regime === 'REAL_ECONOMY_LEAD') {
      // Strong real economy → jobs created
      baseUnemployment = baseUnemployment * 0.65; // -35% unemployment falls
    } else if (context.regime === 'HEALTHY_EXPANSION') {
      // Moderate job creation
      baseUnemployment = baseUnemployment * 0.90; // -10%
    } else if (context.regime === 'ASSET_LED_GROWTH') {
      // Jobless recovery (assets up, jobs flat)
      baseUnemployment = baseUnemployment * 1.10; // +10% slight rise
    } else if (context.regime === 'IMBALANCED_EXCESS') {
      // Bubble bursting → mass layoffs
      baseUnemployment = baseUnemployment * 1.75; // +75% unemployment spike
    }
    
    return Math.min(25, Math.max(2, baseUnemployment)); // Realistic bounds
  }
  
  /**
   * Predict hiring rate (new hires per month)
   */
  predictHiringRate(context: WorkforceContext): number {
    let baseHiring = context.currentHiringRate;
    
    if (context.regime === 'REAL_ECONOMY_LEAD') {
      // Aggressive hiring in strong economy
      baseHiring = baseHiring * 2.2; // +120% hiring surge
    } else if (context.regime === 'HEALTHY_EXPANSION') {
      // Normal hiring
      baseHiring = baseHiring * 1.15; // +15%
    } else if (context.regime === 'ASSET_LED_GROWTH') {
      // Hiring freeze
      baseHiring = baseHiring * 0.50; // -50% reduced hiring
    } else if (context.regime === 'IMBALANCED_EXCESS') {
      // No hiring, only backfills
      baseHiring = baseHiring * 0.20; // -80% hiring collapse
    }
    
    return Math.max(0, baseHiring);
  }
  
  /**
   * Predict overtime hours
   */
  predictOvertimeHours(context: WorkforceContext): number {
    let baseOvertime = context.currentOvertimeHours;
    
    if (context.regime === 'REAL_ECONOMY_LEAD') {
      // Healthy demand, hire instead of overwork
      baseOvertime = baseOvertime * 0.75; // -25% less overtime
    } else if (context.regime === 'HEALTHY_EXPANSION') {
      // Normal overtime
      baseOvertime = baseOvertime * 1.05; // +5%
    } else if (context.regime === 'ASSET_LED_GROWTH') {
      // Squeeze workers without hiring
      baseOvertime = baseOvertime * 1.40; // +40% forced overtime
    } else if (context.regime === 'IMBALANCED_EXCESS') {
      // Layoffs → survivors work more
      baseOvertime = baseOvertime * 1.70; // +70% extreme overtime
    }
    
    return Math.max(0, baseOvertime);
  }
  
  /**
   * Predict labor productivity
   */
  predictLaborProductivity(context: WorkforceContext): number {
    let baseProductivity = context.currentProductivity;
    
    if (context.regime === 'REAL_ECONOMY_LEAD') {
      // Investment in tools, training → productivity gains
      baseProductivity = baseProductivity * 1.12; // +12% strong gains
    } else if (context.regime === 'HEALTHY_EXPANSION') {
      // Normal improvements
      baseProductivity = baseProductivity * 1.04; // +4%
    } else if (context.regime === 'ASSET_LED_GROWTH') {
      // Squeeze productivity without investment (diminishing returns)
      baseProductivity = baseProductivity * 0.97; // -3% burnout
    } else if (context.regime === 'IMBALANCED_EXCESS') {
      // Morale collapse, tool degradation
      baseProductivity = baseProductivity * 0.88; // -12% productivity crash
    }
    
    return baseProductivity;
  }
  
  /**
   * Generate full workforce prediction
   */
  predict(context: WorkforceContext): {
    predictedAverageWage: number;
    predictedHeadcount: number;
    predictedTurnoverRate: number;
    predictedUnemploymentRate: number;
    predictedHiringRate: number;
    predictedOvertimeHours: number;
    predictedLaborProductivity: number;
    hypothesis: string;
  } {
    const predictedAverageWage = this.predictAverageWage(context);
    const predictedHeadcount = this.predictHeadcount(context);
    const predictedTurnoverRate = this.predictTurnoverRate(context);
    const predictedUnemploymentRate = this.predictUnemploymentRate(context);
    const predictedHiringRate = this.predictHiringRate(context);
    const predictedOvertimeHours = this.predictOvertimeHours(context);
    const predictedLaborProductivity = this.predictLaborProductivity(context);
    
    // Formulate hypothesis
    let hypothesis = '';
    if (context.fdr > 1.8) {
      hypothesis = 'IMBALANCED_EXCESS: Predict layoffs, wage freezes, unemployment spike, productivity collapse';
    } else if (context.fdr > 1.5) {
      hypothesis = 'ASSET_LED_GROWTH: Predict wage stagnation, hiring freeze, rising turnover, forced overtime';
    } else if (context.fdr < 1.2) {
      hypothesis = 'REAL_ECONOMY_LEAD: Predict wage growth, hiring surge, falling unemployment, productivity gains';
    } else {
      hypothesis = 'HEALTHY_EXPANSION: Predict balanced labor market with moderate growth';
    }
    
    return {
      predictedAverageWage,
      predictedHeadcount,
      predictedTurnoverRate,
      predictedUnemploymentRate,
      predictedHiringRate,
      predictedOvertimeHours,
      predictedLaborProductivity,
      hypothesis,
    };
  }
}

/**
 * Calculate workforce prediction accuracy
 */
export function calculateWorkforceAccuracy(
  predicted: {
    predictedAverageWage: number;
    predictedHeadcount: number;
    predictedTurnoverRate: number;
    predictedUnemploymentRate: number;
    predictedHiringRate: number;
    predictedOvertimeHours: number;
    predictedLaborProductivity: number;
  },
  actual: {
    actualAverageWage: number;
    actualHeadcount: number;
    actualTurnoverRate: number;
    actualUnemploymentRate: number;
    actualHiringRate: number;
    actualOvertimeHours: number;
    actualLaborProductivity: number;
  }
): {
  wageMAPE: number;
  headcountMAPE: number;
  turnoverMAPE: number;
  unemploymentMAPE: number;
  hiringMAPE: number;
  overtimeMAPE: number;
  productivityMAPE: number;
} {
  const wageMAPE = Math.abs(predicted.predictedAverageWage - actual.actualAverageWage) / actual.actualAverageWage;
  const headcountMAPE = Math.abs(predicted.predictedHeadcount - actual.actualHeadcount) / actual.actualHeadcount;
  const turnoverMAPE = actual.actualTurnoverRate > 0 
    ? Math.abs(predicted.predictedTurnoverRate - actual.actualTurnoverRate) / actual.actualTurnoverRate 
    : 0;
  const unemploymentMAPE = actual.actualUnemploymentRate > 0
    ? Math.abs(predicted.predictedUnemploymentRate - actual.actualUnemploymentRate) / actual.actualUnemploymentRate
    : 0;
  const hiringMAPE = actual.actualHiringRate > 0
    ? Math.abs(predicted.predictedHiringRate - actual.actualHiringRate) / actual.actualHiringRate
    : 0;
  const overtimeMAPE = actual.actualOvertimeHours > 0
    ? Math.abs(predicted.predictedOvertimeHours - actual.actualOvertimeHours) / actual.actualOvertimeHours
    : 0;
  const productivityMAPE = Math.abs(predicted.predictedLaborProductivity - actual.actualLaborProductivity) / actual.actualLaborProductivity;
  
  return {
    wageMAPE,
    headcountMAPE,
    turnoverMAPE,
    unemploymentMAPE,
    hiringMAPE,
    overtimeMAPE,
    productivityMAPE,
  };
}
