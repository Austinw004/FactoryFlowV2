/**
 * Machinery Performance Validation
 * 
 * Tests dual-circuit FDR theory on equipment performance:
 * - High FDR (bubble) → Defer capital expenditure, defer maintenance, reduce investment
 * - Low FDR (real economy lead) → Invest in equipment, proactive maintenance, upgrades
 * - Imbalanced Excess → Equipment stress, rush purchases, quality issues
 * - Healthy Expansion → Optimal equipment utilization, scheduled maintenance
 */

import type { InsertMachineryPrediction } from '@shared/schema';

export interface MachineryContext {
  fdr: number;
  regime: 'HEALTHY_EXPANSION' | 'ASSET_LED_GROWTH' | 'IMBALANCED_EXCESS' | 'REAL_ECONOMY_LEAD';
  machineryAge: number; // Years
  currentOEE: number;
  currentMaintenanceCost: number;
  currentDowntimeHours: number;
  utilizationRate: number; // % of capacity
}

/**
 * Dual-Circuit Equipment Performance Model
 * 
 * THESIS: Equipment performance correlates with economic regimes:
 * - Real Economy Lead (FDR < 1.2): Strong fundamentals → invest in equipment → better OEE
 * - Healthy Expansion (1.2 < FDR < 1.5): Balanced growth → normal maintenance → stable OEE
 * - Asset-Led Growth (1.5 < FDR < 1.8): Asset focus → defer maintenance → OEE decline
 * - Imbalanced Excess (FDR > 1.8): Bubble → capex cuts → equipment degradation
 */
export class DualCircuitMachineryModel {
  /**
   * Predict OEE based on dual-circuit economic regime
   */
  predictOEE(context: MachineryContext): number {
    let baseOEE = context.currentOEE;
    
    // Dual-circuit adjustments
    if (context.regime === 'REAL_ECONOMY_LEAD') {
      // Low FDR: Companies invest in equipment, proactive maintenance
      baseOEE = Math.min(95, baseOEE * 1.08); // +8% improvement
    } else if (context.regime === 'HEALTHY_EXPANSION') {
      // Balanced: Normal operations
      baseOEE = baseOEE * 1.02; // +2% slight improvement
    } else if (context.regime === 'ASSET_LED_GROWTH') {
      // Rising FDR: Deferred maintenance starts showing
      baseOEE = baseOEE * 0.96; // -4% degradation
    } else if (context.regime === 'IMBALANCED_EXCESS') {
      // High FDR (bubble): Severe underinvestment in equipment
      baseOEE = baseOEE * 0.88; // -12% significant degradation
    }
    
    // Age factor (older equipment degrades faster in bad regimes)
    if (context.machineryAge > 10 && context.fdr > 1.6) {
      baseOEE *= 0.93; // Additional -7% for old equipment in bubble
    }
    
    return Math.max(30, Math.min(98, baseOEE)); // Realistic bounds
  }
  
  /**
   * Predict maintenance costs based on dual-circuit regime
   */
  predictMaintenanceCost(context: MachineryContext): number {
    let baseCost = context.currentMaintenanceCost;
    
    // Dual-circuit thesis
    if (context.regime === 'REAL_ECONOMY_LEAD') {
      // Low FDR: Proactive maintenance = lower long-term costs
      baseCost = baseCost * 0.85; // -15% through preventive care
    } else if (context.regime === 'HEALTHY_EXPANSION') {
      // Normal maintenance
      baseCost = baseCost * 1.03; // +3% inflation-adjusted
    } else if (context.regime === 'ASSET_LED_GROWTH') {
      // Deferred maintenance → reactive fixes cost more
      baseCost = baseCost * 1.25; // +25% reactive maintenance premium
    } else if (context.regime === 'IMBALANCED_EXCESS') {
      // Bubble: Emergency repairs, rush orders, premium costs
      baseCost = baseCost * 1.60; // +60% emergency premium
    }
    
    // High utilization in bad regimes = worse
    if (context.utilizationRate > 0.85 && context.fdr > 1.7) {
      baseCost *= 1.30; // Pushing equipment hard during bubble
    }
    
    return Math.max(baseCost * 0.5, baseCost);
  }
  
  /**
   * Predict downtime hours based on regime
   */
  predictDowntime(context: MachineryContext): number {
    let baseDowntime = context.currentDowntimeHours;
    
    if (context.regime === 'REAL_ECONOMY_LEAD') {
      baseDowntime = baseDowntime * 0.70; // -30% through investment
    } else if (context.regime === 'HEALTHY_EXPANSION') {
      baseDowntime = baseDowntime * 0.95; // -5%
    } else if (context.regime === 'ASSET_LED_GROWTH') {
      baseDowntime = baseDowntime * 1.35; // +35% more breakdowns
    } else if (context.regime === 'IMBALANCED_EXCESS') {
      baseDowntime = baseDowntime * 1.75; // +75% severe issues
    }
    
    return Math.max(0, baseDowntime);
  }
  
  /**
   * Predict replacement need (binary: should replace?)
   * Using canonical FDR thresholds: HEALTHY_EXPANSION [0, 1.2), ASSET_LED_GROWTH [1.2, 1.8), 
   * IMBALANCED_EXCESS [1.8, 2.5), REAL_ECONOMY_LEAD [2.5+]
   * REAL_ECONOMY_LEAD at HIGH FDR = asset markets overheated, counter-cyclical opportunity to invest
   */
  predictReplacementNeed(context: MachineryContext): number {
    if (context.machineryAge > 15) {
      // Very old equipment
      if (context.fdr >= 2.5) {
        return 1; // Counter-cyclical opportunity - invest in real assets
      } else if (context.fdr >= 1.8) {
        return 0; // IMBALANCED_EXCESS - defer, preserve capital
      } else if (context.fdr < 1.2) {
        return 1; // HEALTHY_EXPANSION - good time for capex
      } else {
        return context.currentOEE < 60 ? 1 : 0; // Performance-based in ASSET_LED_GROWTH
      }
    } else if (context.machineryAge > 10) {
      // Aging equipment
      if (context.fdr >= 2.5 && context.currentOEE < 70) {
        return 1; // Counter-cyclical investment opportunity
      } else if (context.fdr < 1.2 && context.currentOEE < 70) {
        return 1; // HEALTHY_EXPANSION - invest
      } else {
        return 0; // Keep running
      }
    } else {
      return 0; // Still relatively new
    }
  }
  
  /**
   * Generate full prediction with hypothesis
   */
  predict(context: MachineryContext): {
    predictedOEE: number;
    predictedMaintenanceCost: number;
    predictedDowntimeHours: number;
    predictedReplacementNeed: number;
    hypothesis: string;
  } {
    const predictedOEE = this.predictOEE(context);
    const predictedMaintenanceCost = this.predictMaintenanceCost(context);
    const predictedDowntimeHours = this.predictDowntime(context);
    const predictedReplacementNeed = this.predictReplacementNeed(context);
    
    // Formulate hypothesis using canonical FDR thresholds from regimeConstants.ts
    // HEALTHY_EXPANSION [0, 1.2), ASSET_LED_GROWTH [1.2, 1.8), IMBALANCED_EXCESS [1.8, 2.5), REAL_ECONOMY_LEAD [2.5+]
    let hypothesis = '';
    if (context.fdr >= 2.5) {
      hypothesis = 'REAL_ECONOMY_LEAD: Counter-cyclical opportunity - invest in equipment, improved OEE expected';
    } else if (context.fdr >= 1.8) {
      hypothesis = 'IMBALANCED_EXCESS: Predict equipment degradation due to deferred capex/maintenance';
    } else if (context.fdr >= 1.2) {
      hypothesis = 'ASSET_LED_GROWTH: Predict rising maintenance costs and declining OEE';
    } else {
      hypothesis = 'HEALTHY_EXPANSION: Predict stable equipment performance with balanced investment';
    }
    
    return {
      predictedOEE,
      predictedMaintenanceCost,
      predictedDowntimeHours,
      predictedReplacementNeed,
      hypothesis,
    };
  }
}

/**
 * Calculate prediction accuracy after actual data is available
 */
export function calculateMachineryAccuracy(
  predicted: { predictedOEE: number; predictedMaintenanceCost: number; predictedDowntimeHours: number; predictedReplacementNeed: number },
  actual: { actualOEE: number; actualMaintenanceCost: number; actualDowntimeHours: number; actualReplacementNeed: number }
): {
  oeeMAPE: number;
  maintenanceCostMAPE: number;
  downtimeMAPE: number;
  replacementCorrect: number;
} {
  const oeeMAPE = Math.abs(predicted.predictedOEE - actual.actualOEE) / actual.actualOEE;
  const maintenanceCostMAPE = Math.abs(predicted.predictedMaintenanceCost - actual.actualMaintenanceCost) / actual.actualMaintenanceCost;
  const downtimeMAPE = actual.actualDowntimeHours > 0 
    ? Math.abs(predicted.predictedDowntimeHours - actual.actualDowntimeHours) / actual.actualDowntimeHours 
    : 0;
  const replacementCorrect = predicted.predictedReplacementNeed === actual.actualReplacementNeed ? 1 : 0;
  
  return {
    oeeMAPE,
    maintenanceCostMAPE,
    downtimeMAPE,
    replacementCorrect,
  };
}
