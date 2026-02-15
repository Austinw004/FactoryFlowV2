/**
 * FDR Optimization Module - Incremental, Auditable, Reversible
 * 
 * STRUCTURAL ASSUMPTIONS (IMMUTABLE):
 * - Two-circuit monetary framework: Real Economy (Mr×Vr) vs Asset Market (Ma×Va)
 * - FDR = Asset-side growth metrics / Real-side growth metrics
 * - Four economic regimes derived from FDR thresholds
 * 
 * OPTIMIZATION SCOPE (PERMITTED):
 * - Threshold level adjustments
 * - Lag handling improvements
 * - Regime transition detection
 * - Confidence scoring
 * - Proxy selection within existing categories
 * 
 * NOT PERMITTED:
 * - New macro theories
 * - Unrelated indicators
 * - Market timing beyond regime detection
 * - Redefinition of "real" vs "asset" credit
 * 
 * VERSION: 1.0.0
 * LAST_MODIFIED: 2025-01-09
 */

import type { Regime } from './economics';
import { CANONICAL_REGIME_THRESHOLDS } from './regimeConstants';

// ============================================================================
// VERSIONED CONFIGURATION - ALL CHANGES TRACKED
// ============================================================================

export interface ThresholdConfig {
  version: string;
  effectiveDate: string;
  thresholds: {
    HEALTHY_EXPANSION: { min: number; max: number };
    ASSET_LED_GROWTH: { min: number; max: number };
    IMBALANCED_EXCESS: { min: number; max: number };
    REAL_ECONOMY_LEAD: { min: number; max: number };
  };
  changeLog: string;
}

export interface LagConfig {
  version: string;
  optimalLagMonths: number;
  lagWeights: number[];
  changeLog: string;
}

export interface ConfidenceConfig {
  version: string;
  fdrStabilityWeight: number;
  regimeMaturityWeight: number;
  transitionRiskWeight: number;
  dataQualityWeight: number;
  changeLog: string;
}

// ============================================================================
// CANONICAL THRESHOLD CONFIGURATION
// Resolves inconsistency: economics.ts had 1.5/2.0, regimeIntelligence.ts had 1.2/1.8/2.5
// Decision: Use regimeIntelligence.ts thresholds as they provide better granularity
// ============================================================================

const THRESHOLD_HISTORY: ThresholdConfig[] = [
  {
    version: '1.0.0',
    effectiveDate: '2025-01-09',
    thresholds: {
      HEALTHY_EXPANSION: { min: CANONICAL_REGIME_THRESHOLDS.HEALTHY_EXPANSION.min, max: CANONICAL_REGIME_THRESHOLDS.HEALTHY_EXPANSION.max },
      ASSET_LED_GROWTH: { min: CANONICAL_REGIME_THRESHOLDS.ASSET_LED_GROWTH.min, max: CANONICAL_REGIME_THRESHOLDS.ASSET_LED_GROWTH.max },
      IMBALANCED_EXCESS: { min: CANONICAL_REGIME_THRESHOLDS.IMBALANCED_EXCESS.min, max: CANONICAL_REGIME_THRESHOLDS.IMBALANCED_EXCESS.max },
      REAL_ECONOMY_LEAD: { min: CANONICAL_REGIME_THRESHOLDS.REAL_ECONOMY_LEAD.min, max: CANONICAL_REGIME_THRESHOLDS.REAL_ECONOMY_LEAD.max },
    },
    changeLog: 'Initial canonical thresholds from regimeConstants.ts. REAL_ECONOMY_LEAD now correctly triggers at HIGH FDR (asset dominance creating counter-cyclical opportunity when it reverts).',
  },
];

// ACTIVE CONFIGURATION
export const CANONICAL_THRESHOLDS = THRESHOLD_HISTORY[THRESHOLD_HISTORY.length - 1];

// ============================================================================
// LAG OPTIMIZATION - Based on stress test finding (3-6 month optimal)
// ============================================================================

const LAG_HISTORY: LagConfig[] = [
  {
    version: '1.0.0',
    optimalLagMonths: 4, // Midpoint of 3-6 month optimal range
    lagWeights: [0.1, 0.2, 0.3, 0.25, 0.15], // Weights for months 0-4
    changeLog: 'Initial lag config. Based on stress test: 3-6 month lag shows 88.8%-90.3% predictive power vs 0.8% at 0-month lag.',
  },
];

export const CANONICAL_LAG_CONFIG = LAG_HISTORY[LAG_HISTORY.length - 1];

// ============================================================================
// CONFIDENCE SCORING - Multi-factor regime confidence
// ============================================================================

const CONFIDENCE_HISTORY: ConfidenceConfig[] = [
  {
    version: '1.0.0',
    fdrStabilityWeight: 0.35,
    regimeMaturityWeight: 0.25,
    transitionRiskWeight: 0.25,
    dataQualityWeight: 0.15,
    changeLog: 'Initial confidence weights. FDR stability prioritized as primary signal quality indicator.',
  },
];

export const CANONICAL_CONFIDENCE_CONFIG = CONFIDENCE_HISTORY[CONFIDENCE_HISTORY.length - 1];

// ============================================================================
// REGIME DETECTION FUNCTION - Uses canonical thresholds
// ============================================================================

export function detectRegimeCanonical(fdr: number): Regime {
  const t = CANONICAL_THRESHOLDS.thresholds;
  
  if (fdr >= t.REAL_ECONOMY_LEAD.min) {
    return 'REAL_ECONOMY_LEAD';
  } else if (fdr >= t.IMBALANCED_EXCESS.min) {
    return 'IMBALANCED_EXCESS';
  } else if (fdr >= t.ASSET_LED_GROWTH.min) {
    return 'ASSET_LED_GROWTH';
  } else {
    return 'HEALTHY_EXPANSION';
  }
}

// ============================================================================
// TRANSITION DETECTION - Improved with velocity and buffer zones
// ============================================================================

export interface TransitionPrediction {
  currentRegime: Regime;
  predictedRegime: Regime | null;
  probability: number;
  confidence: number;
  timeToTransition: number; // Days
  bufferZone: boolean;
  reasoning: string;
}

export function predictRegimeTransition(
  currentFdr: number,
  fdrVelocity: number,
  fdrAcceleration: number,
  daysInCurrentRegime: number
): TransitionPrediction {
  const t = CANONICAL_THRESHOLDS.thresholds;
  const currentRegime = detectRegimeCanonical(currentFdr);
  
  // Buffer zone detection (within 10% of threshold)
  let nearestThreshold = Infinity;
  let bufferZone = false;
  
  const thresholdValues = [
    CANONICAL_REGIME_THRESHOLDS.ASSET_LED_GROWTH.min,
    CANONICAL_REGIME_THRESHOLDS.IMBALANCED_EXCESS.min,
    CANONICAL_REGIME_THRESHOLDS.REAL_ECONOMY_LEAD.min,
  ];
  for (const threshold of thresholdValues) {
    const distance = Math.abs(currentFdr - threshold);
    if (distance < nearestThreshold) {
      nearestThreshold = distance;
    }
    if (distance / threshold < 0.1) {
      bufferZone = true;
    }
  }
  
  // Predict next regime based on velocity
  let predictedRegime: Regime | null = null;
  let probability = 0;
  let timeToTransition = Infinity;
  let reasoning = '';
  
  if (Math.abs(fdrVelocity) < 0.001) {
    // Stable - no transition expected
    predictedRegime = null;
    probability = 0;
    reasoning = 'FDR stable, no transition predicted';
  } else if (fdrVelocity > 0) {
    // Rising FDR - moving toward higher regimes
    const nextThreshold = thresholdValues.find(th => th > currentFdr);
    if (nextThreshold) {
      const distance = nextThreshold - currentFdr;
      timeToTransition = Math.ceil((distance / fdrVelocity) * 30); // Convert to days
      
      // Higher probability if accelerating toward threshold
      probability = Math.min(0.9, 0.4 + (fdrAcceleration > 0 ? 0.3 : 0) + (bufferZone ? 0.2 : 0));
      
      predictedRegime = detectRegimeCanonical(nextThreshold + 0.01);
      reasoning = `FDR rising at ${(fdrVelocity * 100).toFixed(1)}%/month toward ${predictedRegime}`;
    }
  } else {
    // Falling FDR - moving toward lower regimes
    const nextThreshold = [...thresholdValues].reverse().find(th => th < currentFdr);
    if (nextThreshold) {
      const distance = currentFdr - nextThreshold;
      timeToTransition = Math.ceil((distance / Math.abs(fdrVelocity)) * 30);
      
      probability = Math.min(0.9, 0.4 + (fdrAcceleration < 0 ? 0.3 : 0) + (bufferZone ? 0.2 : 0));
      
      predictedRegime = detectRegimeCanonical(nextThreshold - 0.01);
      reasoning = `FDR falling at ${(Math.abs(fdrVelocity) * 100).toFixed(1)}%/month toward ${predictedRegime}`;
    } else if (currentFdr > 0.5 && fdrVelocity < -0.02) {
      // Moving toward healthy expansion
      predictedRegime = 'HEALTHY_EXPANSION';
      probability = 0.6;
      timeToTransition = Math.ceil((currentFdr - 0.8) / Math.abs(fdrVelocity) * 30);
      reasoning = 'FDR normalizing toward healthy expansion';
    }
  }
  
  // Confidence based on regime maturity and velocity consistency
  let confidence = 0.5;
  if (daysInCurrentRegime > 90) confidence += 0.15; // Mature regime
  if (Math.abs(fdrVelocity) > 0.02) confidence += 0.1; // Strong velocity
  if (fdrAcceleration * fdrVelocity > 0) confidence += 0.15; // Accelerating in direction
  if (bufferZone) confidence -= 0.1; // Uncertainty near thresholds
  confidence = Math.max(0.2, Math.min(0.95, confidence));
  
  return {
    currentRegime,
    predictedRegime,
    probability,
    confidence,
    timeToTransition: timeToTransition === Infinity ? -1 : timeToTransition,
    bufferZone,
    reasoning,
  };
}

// ============================================================================
// CONFIDENCE SCORING - Multi-factor with auditable components
// ============================================================================

export interface ConfidenceScore {
  overall: number;
  components: {
    fdrStability: number;
    regimeMaturity: number;
    transitionRisk: number;
    dataQuality: number;
  };
  interpretation: 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW';
  flags: string[];
}

export function calculateConfidenceScore(
  fdrHistory: Array<{ fdr: number; timestamp: Date }>,
  currentRegime: Regime,
  regimeStartDate: Date,
  dataFreshness: number // Hours since last update
): ConfidenceScore {
  const cfg = CANONICAL_CONFIDENCE_CONFIG;
  const flags: string[] = [];
  
  // 1. FDR Stability (coefficient of variation over last 30 days)
  let fdrStability = 1.0;
  if (fdrHistory.length >= 5) {
    const recentFdr = fdrHistory.slice(-30).map(h => h.fdr);
    const mean = recentFdr.reduce((a, b) => a + b, 0) / recentFdr.length;
    const variance = recentFdr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / recentFdr.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
    fdrStability = Math.max(0, 1 - (cv * 5)); // CV > 0.2 = low stability
    if (cv > 0.15) flags.push('HIGH_FDR_VOLATILITY');
  } else {
    fdrStability = 0.5;
    flags.push('INSUFFICIENT_HISTORY');
  }
  
  // 2. Regime Maturity (days in current regime vs typical)
  const daysInRegime = Math.floor((Date.now() - regimeStartDate.getTime()) / (1000 * 60 * 60 * 24));
  const typicalDays: Record<Regime, number> = {
    HEALTHY_EXPANSION: 540,
    ASSET_LED_GROWTH: 270,
    IMBALANCED_EXCESS: 180,
    REAL_ECONOMY_LEAD: 120,
  };
  const maturityRatio = daysInRegime / typicalDays[currentRegime];
  let regimeMaturity = Math.min(1.0, maturityRatio * 1.5); // Caps at 1.0 when 2/3 through
  if (maturityRatio > 1.5) {
    regimeMaturity = Math.max(0.5, 1 - (maturityRatio - 1.5) * 0.2); // Decay for extended regimes
    flags.push('EXTENDED_REGIME');
  }
  
  // 3. Transition Risk (proximity to thresholds)
  let transitionRisk = 1.0;
  if (fdrHistory.length > 0) {
    const currentFdr = fdrHistory[fdrHistory.length - 1].fdr;
    const thresholds = [
      CANONICAL_REGIME_THRESHOLDS.ASSET_LED_GROWTH.min,
      CANONICAL_REGIME_THRESHOLDS.IMBALANCED_EXCESS.min,
      CANONICAL_REGIME_THRESHOLDS.REAL_ECONOMY_LEAD.min,
    ];
    const minDistance = Math.min(...thresholds.map(t => Math.abs(currentFdr - t)));
    transitionRisk = Math.min(1.0, minDistance / 0.3); // Full confidence if > 0.3 from threshold
    if (minDistance < 0.1) flags.push('NEAR_THRESHOLD');
  }
  
  // 4. Data Quality (freshness)
  let dataQuality = 1.0;
  if (dataFreshness > 24) {
    dataQuality = Math.max(0.3, 1 - (dataFreshness - 24) / 72); // Decays over 3 days
    if (dataFreshness > 48) flags.push('STALE_DATA');
  }
  
  // Weighted overall score
  const overall = 
    fdrStability * cfg.fdrStabilityWeight +
    regimeMaturity * cfg.regimeMaturityWeight +
    transitionRisk * cfg.transitionRiskWeight +
    dataQuality * cfg.dataQualityWeight;
  
  // Interpretation
  let interpretation: ConfidenceScore['interpretation'] = 'HIGH';
  if (overall < 0.4) interpretation = 'VERY_LOW';
  else if (overall < 0.6) interpretation = 'LOW';
  else if (overall < 0.75) interpretation = 'MEDIUM';
  
  return {
    overall,
    components: {
      fdrStability,
      regimeMaturity,
      transitionRisk,
      dataQuality,
    },
    interpretation,
    flags,
  };
}

// ============================================================================
// LAG-ADJUSTED FDR CALCULATION
// ============================================================================

export function calculateLagAdjustedFDR(
  fdrHistory: Array<{ fdr: number; timestamp: Date }>
): { adjustedFdr: number; rawFdr: number; lagMonths: number } {
  const cfg = CANONICAL_LAG_CONFIG;
  
  if (fdrHistory.length === 0) {
    return { adjustedFdr: 1.0, rawFdr: 1.0, lagMonths: 0 };
  }
  
  const rawFdr = fdrHistory[fdrHistory.length - 1].fdr;
  
  if (fdrHistory.length < cfg.optimalLagMonths) {
    // Not enough history for lag adjustment
    return { adjustedFdr: rawFdr, rawFdr, lagMonths: 0 };
  }
  
  // Calculate weighted average using lag weights
  let weightedSum = 0;
  let weightSum = 0;
  
  for (let i = 0; i < cfg.lagWeights.length && i < fdrHistory.length; i++) {
    const index = fdrHistory.length - 1 - i;
    if (index >= 0) {
      weightedSum += fdrHistory[index].fdr * cfg.lagWeights[i];
      weightSum += cfg.lagWeights[i];
    }
  }
  
  const adjustedFdr = weightSum > 0 ? weightedSum / weightSum : rawFdr;
  
  return { adjustedFdr, rawFdr, lagMonths: cfg.optimalLagMonths };
}

// ============================================================================
// BINARY DECISION OUTPUT - No intermediate ambiguity
// ============================================================================

export type BinaryDecision = 'PRESERVE_CAPITAL' | 'DEPLOY_CAPITAL';

export interface BinarySignal {
  decision: BinaryDecision;
  confidence: number;
  irreducibleUncertainty: boolean;
  reasoning: string;
  actionableTimeframe: string;
}

export function generateBinarySignal(
  fdr: number,
  regime: Regime,
  fdrVelocity: number,
  confidence: ConfidenceScore
): BinarySignal {
  const t = CANONICAL_THRESHOLDS.thresholds;
  
  // Clear PRESERVE_CAPITAL cases
  if (regime === 'IMBALANCED_EXCESS' && fdrVelocity >= 0) {
    return {
      decision: 'PRESERVE_CAPITAL',
      confidence: Math.min(0.9, confidence.overall + 0.15),
      irreducibleUncertainty: false,
      reasoning: 'FDR in excess zone with rising or stable velocity - elevated risk',
      actionableTimeframe: 'Immediate to 3 months',
    };
  }
  
  if (regime === 'IMBALANCED_EXCESS' && fdrVelocity < -0.02) {
    // Excess regime but FDR falling rapidly - transitioning
    return {
      decision: 'PRESERVE_CAPITAL',
      confidence: 0.65,
      irreducibleUncertainty: true,
      reasoning: 'Excess zone but normalizing - maintain caution until transition confirmed',
      actionableTimeframe: '1-3 months pending transition',
    };
  }
  
  // Clear DEPLOY_CAPITAL cases
  if (regime === 'REAL_ECONOMY_LEAD') {
    return {
      decision: 'DEPLOY_CAPITAL',
      confidence: Math.min(0.85, confidence.overall + 0.1),
      irreducibleUncertainty: false,
      reasoning: 'Counter-cyclical opportunity - asset markets have overshot',
      actionableTimeframe: '3-6 months',
    };
  }
  
  // HEALTHY_EXPANSION (FDR < threshold, see regimeConstants.ts) with stable or rising FDR - favorable for deployment
  if (regime === 'HEALTHY_EXPANSION' && fdr < CANONICAL_REGIME_THRESHOLDS.ASSET_LED_GROWTH.min && fdrVelocity >= 0) {
    return {
      decision: 'DEPLOY_CAPITAL',
      confidence: Math.min(0.8, confidence.overall),
      irreducibleUncertainty: false,
      reasoning: 'Healthy expansion with balanced circuits - favorable deployment window',
      actionableTimeframe: '3-12 months',
    };
  }
  
  if (regime === 'HEALTHY_EXPANSION' && fdrVelocity < -0.01) {
    return {
      decision: 'DEPLOY_CAPITAL',
      confidence: 0.7,
      irreducibleUncertainty: false,
      reasoning: 'FDR normalizing toward healthy range - deploy with monitoring',
      actionableTimeframe: '3-6 months',
    };
  }
  
  // ASSET_LED_GROWTH - Irreducible uncertainty zone
  if (regime === 'ASSET_LED_GROWTH') {
    if (fdrVelocity > 0.015) {
      return {
        decision: 'PRESERVE_CAPITAL',
        confidence: 0.55,
        irreducibleUncertainty: true,
        reasoning: 'Asset-led growth with rising FDR - caution warranted but not extreme',
        actionableTimeframe: '1-3 months with reassessment',
      };
    } else if (fdrVelocity < -0.01) {
      return {
        decision: 'DEPLOY_CAPITAL',
        confidence: 0.55,
        irreducibleUncertainty: true,
        reasoning: 'Asset-led growth with falling FDR - moderate deployment acceptable',
        actionableTimeframe: '3-6 months with monitoring',
      };
    } else {
      // Stable asset-led - true ambiguity
      return {
        decision: 'PRESERVE_CAPITAL', // Default to caution
        confidence: 0.5,
        irreducibleUncertainty: true,
        reasoning: 'Asset-led with stable FDR - insufficient signal for deployment bias',
        actionableTimeframe: 'Reassess monthly',
      };
    }
  }
  
  // Default fallback
  return {
    decision: 'PRESERVE_CAPITAL',
    confidence: 0.5,
    irreducibleUncertainty: true,
    reasoning: 'Insufficient signal clarity - default to capital preservation',
    actionableTimeframe: 'Reassess when more data available',
  };
}

// ============================================================================
// AUDIT TRAIL - All configuration changes logged
// ============================================================================

export function getAuditTrail(): {
  thresholds: ThresholdConfig[];
  lag: LagConfig[];
  confidence: ConfidenceConfig[];
} {
  return {
    thresholds: THRESHOLD_HISTORY,
    lag: LAG_HISTORY,
    confidence: CONFIDENCE_HISTORY,
  };
}

export function getCurrentConfiguration(): {
  thresholds: ThresholdConfig;
  lag: LagConfig;
  confidence: ConfidenceConfig;
} {
  return {
    thresholds: CANONICAL_THRESHOLDS,
    lag: CANONICAL_LAG_CONFIG,
    confidence: CANONICAL_CONFIDENCE_CONFIG,
  };
}

// ============================================================================
// ROLLBACK CAPABILITY
// ============================================================================

export function getConfigurationVersion(version: string): {
  thresholds: ThresholdConfig | null;
  lag: LagConfig | null;
  confidence: ConfidenceConfig | null;
} {
  return {
    thresholds: THRESHOLD_HISTORY.find(t => t.version === version) || null,
    lag: LAG_HISTORY.find(l => l.version === version) || null,
    confidence: CONFIDENCE_HISTORY.find(c => c.version === version) || null,
  };
}
