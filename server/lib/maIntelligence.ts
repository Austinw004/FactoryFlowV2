import type { IStorage } from '../storage';

export interface MAScoring {
  strategicFit: number; // 0-100
  timingScore: number; // 0-100
  fdrAdjustedValue: number;
  recommendation: 'buy_now' | 'wait' | 'sell_now' | 'explore';
  rationale: string;
}

export class MAIntelligenceEngine {
  constructor(private storage: IStorage) {}

  /**
   * Calculate FDR-adjusted valuation for M&A target
   */
  calculateFDRAdjustedValuation(
    baseValue: number,
    currentFDR: number,
    currentRegime: string,
    targetType: 'acquisition' | 'divestiture' | 'joint_venture'
  ): number {
    let adjustment = 1.0;

    // Adjust based on regime and target type
    if (targetType === 'acquisition') {
      if (currentRegime === 'Imbalanced Excess') {
        adjustment = 0.85; // Buy cheaper during bubble
      } else if (currentRegime === 'Real Economy Lead') {
        adjustment = 0.90; // Good buying opportunity
      } else if (currentRegime === 'Asset-Led Growth') {
        adjustment = 1.15; // Assets more expensive
      }
    } else if (targetType === 'divestiture') {
      if (currentRegime === 'Asset-Led Growth') {
        adjustment = 1.20; // Sell at premium during asset boom
      } else if (currentRegime === 'Imbalanced Excess') {
        adjustment = 1.10; // Good time to exit
      }
    }

    return baseValue * adjustment;
  }

  /**
   * Score M&A timing based on current FDR and regime
   */
  scoreMAiming(
    fdr: number,
    regime: string,
    targetType: 'acquisition' | 'divestiture' | 'joint_venture'
  ): { score: number; rationale: string; optimalRegime: string } {
    let score = 50;
    let rationale = '';
    let optimalRegime = '';

    if (targetType === 'acquisition') {
      if (regime === 'Imbalanced Excess') {
        score = 85;
        rationale = 'Asset prices inflated - wait for correction or negotiate hard';
        optimalRegime = 'Real Economy Lead';
      } else if (regime === 'Real Economy Lead') {
        score = 95;
        rationale = 'Excellent timing - real economy strong, asset prices reasonable';
        optimalRegime = 'Real Economy Lead';
      } else if (regime === 'Asset-Led Growth') {
        score = 60;
        rationale = 'Asset prices rising - act quickly if strategic fit is strong';
        optimalRegime = 'Real Economy Lead';
      } else {
        score = 75;
        rationale = 'Balanced conditions - good time for strategic acquisitions';
        optimalRegime = 'Healthy Expansion';
      }
    } else if (targetType === 'divestiture') {
      if (regime === 'Asset-Led Growth') {
        score = 95;
        rationale = 'Peak selling conditions - asset prices at premium';
        optimalRegime = 'Asset-Led Growth';
      } else if (regime === 'Imbalanced Excess') {
        score = 85;
        rationale = 'Good exit window before bubble bursts';
        optimalRegime = 'Asset-Led Growth';
      } else if (regime === 'Real Economy Lead') {
        score = 50;
        rationale = 'Hold for better valuations';
        optimalRegime = 'Asset-Led Growth';
      }
    }

    return { score, rationale, optimalRegime };
  }

  /**
   * Generate M&A recommendation
   */
  generateRecommendation(
    target: {
      targetType: 'acquisition' | 'divestiture' | 'joint_venture';
      estimatedValue: number;
      strategicFitScore?: number;
    },
    currentFDR: number,
    currentRegime: string
  ): MAScoring {
    const timing = this.scoreMAiming(currentFDR, currentRegime, target.targetType);
    const fdrAdjustedValue = this.calculateFDRAdjustedValuation(
      target.estimatedValue,
      currentFDR,
      currentRegime,
      target.targetType
    );

    const strategicFit = target.strategicFitScore || 50;

    // Determine recommendation
    let recommendation: MAScoring['recommendation'] = 'explore';
    if (timing.score >= 85 && strategicFit >= 70) {
      recommendation = target.targetType === 'acquisition' ? 'buy_now' : 'sell_now';
    } else if (timing.score < 60) {
      recommendation = 'wait';
    }

    return {
      strategicFit,
      timingScore: timing.score,
      fdrAdjustedValue,
      recommendation,
      rationale: timing.rationale,
    };
  }
}
