/**
 * Regime Intelligence Module
 * 
 * Thesis-aligned improvements for the FDR/Dual-Circuit model:
 * 1. FDR velocity and acceleration tracking for transition prediction
 * 2. Regime duration modeling with historical cycle tracking
 * 3. Dynamic regime-specific confidence scoring
 * 4. Data-driven regime factor optimization
 * 5. Procurement timing signals based on FDR trends
 * 
 * Core Thesis: Economic regime understanding → foresight → actionable timing signals
 */

import { 
  type Regime, 
  CANONICAL_REGIME_THRESHOLDS, 
  TYPICAL_REGIME_DURATIONS as CANONICAL_TYPICAL_DURATIONS,
  classifyRegimeFromFDR 
} from "./regimeConstants";

export interface FDRSnapshot {
  timestamp: Date;
  fdr: number;
  regime: Regime;
  mrGrowth: number;
  maGrowth: number;
}

export interface FDRTrend {
  currentFDR: number;
  velocity: number;
  acceleration: number;
  trendDirection: 'rising' | 'falling' | 'stable';
  momentum: number;
}

export interface RegimeTransitionSignal {
  currentRegime: Regime;
  predictedRegime: Regime;
  transitionProbability: number;
  estimatedTimeToTransition: number;
  fdrDistanceToThreshold: number;
  confidence: number;
  signal: string;
}

export interface RegimeDuration {
  regime: Regime;
  startDate: Date;
  daysInRegime: number;
  typicalDurationDays: number;
  isExtended: boolean;
  confidenceDecay: number;
}

export interface ProcurementTimingSignal {
  action: 'BUY_NOW' | 'WAIT' | 'LOCK_PRICES' | 'DEFER' | 'COUNTER_CYCLICAL_OPPORTUNITY';
  intensity: number;
  reasoning: string;
  windowRemaining: number;
  fdrContext: string;
}

export interface RegimeConfidence {
  overall: number;
  fdrStability: number;
  regimeMaturity: number;
  transitionRisk: number;
  dataQuality: number;
}

const REGIME_THRESHOLDS = CANONICAL_REGIME_THRESHOLDS;

const TYPICAL_REGIME_DURATIONS = CANONICAL_TYPICAL_DURATIONS;

const REGIME_PROCUREMENT_GUIDANCE: Record<Regime, { action: ProcurementTimingSignal['action']; baseIntensity: number }> = {
  HEALTHY_EXPANSION: { action: 'BUY_NOW', baseIntensity: 0.6 },
  ASSET_LED_GROWTH: { action: 'LOCK_PRICES', baseIntensity: 0.7 },
  IMBALANCED_EXCESS: { action: 'DEFER', baseIntensity: 0.8 },
  REAL_ECONOMY_LEAD: { action: 'COUNTER_CYCLICAL_OPPORTUNITY', baseIntensity: 0.9 },
};

// Company-scoped intelligence instances
const companyIntelligenceCache: Map<string, RegimeIntelligence> = new Map();

/** Section 11 — 6-hour TTL for regime intelligence cache. */
export const REGIME_INTELLIGENCE_TTL_MS = 6 * 60 * 60 * 1000;

export class RegimeIntelligence {
  private companyId: string;
  private fdrHistory: FDRSnapshot[] = [];
  private regimeStartDate: Date = new Date();
  private currentRegime: Regime = 'HEALTHY_EXPANSION';
  private _initialized: boolean = false;
  private _lastInitializedAt: number = 0;
  private historicalRegimeAccuracy: Record<Regime, { predictions: number; correct: number; factor: number }> = {
    HEALTHY_EXPANSION: { predictions: 0, correct: 0, factor: 1.0 },
    ASSET_LED_GROWTH: { predictions: 0, correct: 0, factor: 0.96 },
    IMBALANCED_EXCESS: { predictions: 0, correct: 0, factor: 0.92 },
    REAL_ECONOMY_LEAD: { predictions: 0, correct: 0, factor: 1.05 },
  };

  constructor(companyId: string = 'default') {
    this.companyId = companyId;
    this.fdrHistory = [];
    this._initialized = false;
  }

  /**
   * Get or create company-scoped intelligence instance
   */
  static forCompany(companyId: string): RegimeIntelligence {
    if (!companyIntelligenceCache.has(companyId)) {
      companyIntelligenceCache.set(companyId, new RegimeIntelligence(companyId));
    }
    return companyIntelligenceCache.get(companyId)!;
  }

  /**
   * Clear company cache (for testing or cleanup)
   */
  static clearCompanyCache(companyId?: string): void {
    if (companyId) {
      companyIntelligenceCache.delete(companyId);
    } else {
      companyIntelligenceCache.clear();
    }
  }

  getCompanyId(): string {
    return this.companyId;
  }

  /**
   * Initialize from stored economic snapshots
   * Loads historical FDR data from company's economic snapshots for accurate intelligence
   */
  initializeFromSnapshots(snapshots: Array<{
    fdr: number;
    regime: Regime;
    timestamp: Date;
    gdpReal?: number;
    gdpNominal?: number;
  }>): void {
    // Mark as initialized even if empty to prevent repeated DB reads
    this._initialized = true;
    this._lastInitializedAt = Date.now();
    if (snapshots.length === 0) return;

    // Sort by timestamp ascending
    const sorted = [...snapshots].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Clear existing history and rebuild from stored data
    this.fdrHistory = [];
    
    for (const snap of sorted) {
      // Calculate MR/MA growth rates from GDP data if available
      let mrGrowth = 0;
      let maGrowth = 0;
      
      // Simple approximation from FDR changes
      const prevSnap = this.fdrHistory[this.fdrHistory.length - 1];
      if (prevSnap && prevSnap.fdr > 0) {
        const fdrChange = (snap.fdr - prevSnap.fdr) / prevSnap.fdr;
        mrGrowth = fdrChange > 0 ? fdrChange * 100 : 0;
        maGrowth = fdrChange < 0 ? Math.abs(fdrChange) * 100 : 0;
      }

      this.fdrHistory.push({
        timestamp: new Date(snap.timestamp),
        fdr: snap.fdr,
        regime: snap.regime,
        mrGrowth,
        maGrowth,
      });
    }

    // Set current regime from most recent snapshot
    const latest = sorted[sorted.length - 1];
    this.currentRegime = latest.regime;
    
    // Find when current regime started
    for (let i = sorted.length - 2; i >= 0; i--) {
      if (sorted[i].regime !== latest.regime) {
        this.regimeStartDate = new Date(sorted[i + 1].timestamp);
        break;
      }
    }
    
    // Mark as initialized to prevent repeated DB loads
    this._initialized = true;
    this._lastInitializedAt = Date.now();
    console.log(`[RegimeIntelligence] Initialized company ${this.companyId} with ${this.fdrHistory.length} snapshots, current regime: ${this.currentRegime}`);
  }

  /**
   * Check if intelligence has been initialized with historical data
   * Uses explicit flag to avoid repeated DB loads
   */
  isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Section 11 — Returns true if the intelligence data is older than REGIME_INTELLIGENCE_TTL_MS
   * (6 hours). Callers should force re-initialization from DB when stale.
   */
  isStale(): boolean {
    if (!this._initialized || this._lastInitializedAt === 0) return true;
    return Date.now() - this._lastInitializedAt > REGIME_INTELLIGENCE_TTL_MS;
  }
  
  /**
   * Get current regime from company-specific data (not global economics)
   */
  getCurrentRegime(): Regime {
    return this.currentRegime;
  }
  
  /**
   * Get current FDR from company-specific history (not global economics)
   */
  getCurrentFDR(): number {
    if (this.fdrHistory.length === 0) return 1.0;
    return this.fdrHistory[this.fdrHistory.length - 1].fdr;
  }

  recordFDRSnapshot(fdr: number, regime: Regime, mrGrowth: number = 0, maGrowth: number = 0): void {
    const snapshot: FDRSnapshot = {
      timestamp: new Date(),
      fdr,
      regime,
      mrGrowth,
      maGrowth,
    };

    this.fdrHistory.push(snapshot);

    if (this.fdrHistory.length > 365) {
      this.fdrHistory = this.fdrHistory.slice(-365);
    }

    if (regime !== this.currentRegime) {
      this.regimeStartDate = new Date();
      this.currentRegime = regime;
    }
  }

  /**
   * Calculate FDR velocity (rate of change) and acceleration
   * Key for predicting regime transitions before they happen
   */
  calculateFDRTrend(): FDRTrend {
    if (this.fdrHistory.length < 3) {
      return {
        currentFDR: this.fdrHistory[this.fdrHistory.length - 1]?.fdr || 1.0,
        velocity: 0,
        acceleration: 0,
        trendDirection: 'stable',
        momentum: 0,
      };
    }

    const recent = this.fdrHistory.slice(-30);
    const currentFDR = recent[recent.length - 1].fdr;

    const velocities: number[] = [];
    for (let i = 1; i < recent.length; i++) {
      const timeDelta = (recent[i].timestamp.getTime() - recent[i - 1].timestamp.getTime()) / (1000 * 60 * 60 * 24);
      if (timeDelta > 0) {
        velocities.push((recent[i].fdr - recent[i - 1].fdr) / timeDelta);
      }
    }

    const velocity = velocities.length > 0 
      ? velocities.reduce((a, b) => a + b, 0) / velocities.length 
      : 0;

    let acceleration = 0;
    if (velocities.length >= 2) {
      const recentVelocity = velocities.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, velocities.length);
      const olderVelocity = velocities.slice(0, 5).reduce((a, b) => a + b, 0) / Math.min(5, velocities.length);
      acceleration = recentVelocity - olderVelocity;
    }

    let trendDirection: 'rising' | 'falling' | 'stable' = 'stable';
    if (velocity > 0.01) {
      trendDirection = 'rising';
    } else if (velocity < -0.01) {
      trendDirection = 'falling';
    }

    const momentum = Math.abs(velocity) * (1 + Math.abs(acceleration));

    return {
      currentFDR,
      velocity,
      acceleration,
      trendDirection,
      momentum,
    };
  }

  /**
   * Predict regime transition based on FDR trajectory
   * "See Ahead" - anticipate regime changes before they happen
   */
  predictRegimeTransition(): RegimeTransitionSignal {
    const trend = this.calculateFDRTrend();
    const currentThresholds = REGIME_THRESHOLDS[this.currentRegime];

    let nearestThreshold = 0;
    let predictedRegime: Regime = this.currentRegime;
    let transitionProbability = 0;

    if (trend.trendDirection === 'rising') {
      nearestThreshold = currentThresholds.max;
      const distance = nearestThreshold - trend.currentFDR;

      if (distance > 0 && trend.velocity > 0) {
        const daysToThreshold = distance / trend.velocity;
        transitionProbability = Math.min(0.95, Math.max(0, 1 - (daysToThreshold / 90)));

        if (this.currentRegime === 'HEALTHY_EXPANSION') {
          predictedRegime = 'ASSET_LED_GROWTH';
        } else if (this.currentRegime === 'ASSET_LED_GROWTH') {
          predictedRegime = 'IMBALANCED_EXCESS';
        } else if (this.currentRegime === 'IMBALANCED_EXCESS') {
          predictedRegime = 'REAL_ECONOMY_LEAD';
        }
      }
    } else if (trend.trendDirection === 'falling') {
      nearestThreshold = currentThresholds.min;
      const distance = trend.currentFDR - nearestThreshold;

      if (distance > 0 && trend.velocity < 0) {
        const daysToThreshold = distance / Math.abs(trend.velocity);
        transitionProbability = Math.min(0.95, Math.max(0, 1 - (daysToThreshold / 90)));

        if (this.currentRegime === 'REAL_ECONOMY_LEAD') {
          predictedRegime = 'IMBALANCED_EXCESS';
        } else if (this.currentRegime === 'IMBALANCED_EXCESS') {
          predictedRegime = 'ASSET_LED_GROWTH';
        } else if (this.currentRegime === 'ASSET_LED_GROWTH') {
          predictedRegime = 'HEALTHY_EXPANSION';
        }
      }
    }

    const fdrDistanceToThreshold = trend.trendDirection === 'rising' 
      ? currentThresholds.max - trend.currentFDR 
      : trend.currentFDR - currentThresholds.min;

    const estimatedTimeToTransition = trend.velocity !== 0 
      ? Math.round(fdrDistanceToThreshold / Math.abs(trend.velocity)) 
      : 999;

    const confidence = this.calculateTransitionConfidence(trend, transitionProbability);

    let signal = '';
    if (transitionProbability > 0.7) {
      signal = `HIGH PROBABILITY: Transition to ${predictedRegime} likely within ${estimatedTimeToTransition} days`;
    } else if (transitionProbability > 0.4) {
      signal = `MODERATE: FDR trending toward ${predictedRegime} threshold`;
    } else {
      signal = `STABLE: Current ${this.currentRegime} regime expected to continue`;
    }

    return {
      currentRegime: this.currentRegime,
      predictedRegime,
      transitionProbability,
      estimatedTimeToTransition,
      fdrDistanceToThreshold,
      confidence,
      signal,
    };
  }

  private calculateTransitionConfidence(trend: FDRTrend, transitionProbability: number): number {
    let confidence = 0.5;

    if (trend.velocity !== 0 && Math.sign(trend.velocity) === Math.sign(trend.acceleration)) {
      confidence += 0.15;
    }

    if (trend.momentum > 0.05) {
      confidence += 0.1;
    }

    const historyWeight = Math.min(this.fdrHistory.length / 90, 1) * 0.15;
    confidence += historyWeight;

    confidence = Math.min(0.95, Math.max(0.1, confidence));

    return confidence;
  }

  /**
   * Get regime duration information
   * "Act First" - know when current window is closing
   */
  getRegimeDuration(): RegimeDuration {
    const daysInRegime = Math.floor(
      (new Date().getTime() - this.regimeStartDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const typicalDuration = TYPICAL_REGIME_DURATIONS[this.currentRegime];
    const isExtended = daysInRegime > typicalDuration;

    let confidenceDecay = 1.0;
    if (isExtended) {
      const overExtension = (daysInRegime - typicalDuration) / typicalDuration;
      confidenceDecay = Math.max(0.5, 1 - (overExtension * 0.3));
    }

    return {
      regime: this.currentRegime,
      startDate: this.regimeStartDate,
      daysInRegime,
      typicalDurationDays: typicalDuration,
      isExtended,
      confidenceDecay,
    };
  }

  /**
   * Calculate dynamic confidence score
   * Higher confidence when FDR is stable within regime
   */
  calculateRegimeConfidence(): RegimeConfidence {
    const trend = this.calculateFDRTrend();
    const duration = this.getRegimeDuration();
    const thresholds = REGIME_THRESHOLDS[this.currentRegime];

    const distanceFromLower = trend.currentFDR - thresholds.min;
    const distanceFromUpper = thresholds.max - trend.currentFDR;
    const rangeSize = thresholds.max - thresholds.min;
    const minDistance = Math.min(distanceFromLower, distanceFromUpper);
    const fdrStability = Math.min(1, (minDistance / (rangeSize * 0.3)));

    let regimeMaturity = 0.5;
    if (duration.daysInRegime > 30 && duration.daysInRegime < duration.typicalDurationDays * 0.8) {
      regimeMaturity = 0.9;
    } else if (duration.daysInRegime < 30) {
      regimeMaturity = 0.3 + (duration.daysInRegime / 30) * 0.4;
    } else {
      regimeMaturity = duration.confidenceDecay * 0.7;
    }

    const transitionRisk = 1 - fdrStability;

    const dataQuality = Math.min(1, this.fdrHistory.length / 60);

    const overall = (fdrStability * 0.3) + (regimeMaturity * 0.3) + ((1 - transitionRisk) * 0.25) + (dataQuality * 0.15);

    return {
      overall: Math.round(overall * 100) / 100,
      fdrStability: Math.round(fdrStability * 100) / 100,
      regimeMaturity: Math.round(regimeMaturity * 100) / 100,
      transitionRisk: Math.round(transitionRisk * 100) / 100,
      dataQuality: Math.round(dataQuality * 100) / 100,
    };
  }

  /**
   * Get optimized regime factor for forecasting
   * Data-driven rather than static
   */
  getOptimizedRegimeFactor(regime: Regime): number {
    const historicalData = this.historicalRegimeAccuracy[regime];

    if (historicalData.predictions < 10) {
      const defaultFactors: Record<Regime, number> = {
        HEALTHY_EXPANSION: 1.0,
        ASSET_LED_GROWTH: 0.96,
        IMBALANCED_EXCESS: 0.92,
        REAL_ECONOMY_LEAD: 1.05,
      };
      return defaultFactors[regime];
    }

    return historicalData.factor;
  }

  /**
   * Update regime factor based on prediction accuracy
   * Learn from historical performance
   * 
   * QUARANTINE NOTE (2026-01-11): Factor adjustment is currently FROZEN.
   * Per behavioral mechanism audit, this creates an implicit learning loop
   * that could compound over time. Counts are tracked but factor remains static.
   * To enable learning, set ENABLE_REGIME_FACTOR_LEARNING=true in environment.
   */
  updateRegimeFactorFromAccuracy(regime: Regime, predicted: number, actual: number): void {
    const data = this.historicalRegimeAccuracy[regime];
    data.predictions++;

    const error = (predicted - actual) / actual;
    if (Math.abs(error) < 0.1) {
      data.correct++;
    }

    // Learning enabled by default; can be overridden with ENABLE_REGIME_FACTOR_LEARNING=false
    const enableLearning = process.env.ENABLE_REGIME_FACTOR_LEARNING !== 'false';
    const TARGET_ACCURACY = 0.90;

    if (enableLearning && data.predictions > 10) {
      const oldFactor = data.factor;
      const accuracy = data.predictions > 0 ? data.correct / data.predictions : 0;
      // Directive formula: newFactor = oldFactor * (1 + (accuracy - targetAccuracy) * 0.1)
      const newFactor = oldFactor * (1 + (accuracy - TARGET_ACCURACY) * 0.1);
      data.factor = Math.max(0.8, Math.min(1.2, newFactor));

      if (Math.abs(data.factor - oldFactor) > 0.0001) {
        console.log(
          `[RegimeIntelligence:AUDIT] FACTOR_UPDATED regime=${regime} ` +
          `${oldFactor.toFixed(4)} → ${data.factor.toFixed(4)} ` +
          `accuracy=${(accuracy * 100).toFixed(1)}% targetAccuracy=${(TARGET_ACCURACY * 100).toFixed(0)}% ` +
          `predictions=${data.predictions}`
        );
      }
    }
  }

  /**
   * Generate procurement timing signal
   * Direct actionable advice based on regime and FDR trends
   */
  getProcurementTimingSignal(): ProcurementTimingSignal {
    const trend = this.calculateFDRTrend();
    const transition = this.predictRegimeTransition();
    const duration = this.getRegimeDuration();
    const confidence = this.calculateRegimeConfidence();

    const baseGuidance = REGIME_PROCUREMENT_GUIDANCE[this.currentRegime];
    let action = baseGuidance.action;
    let intensity = baseGuidance.baseIntensity;
    let reasoning = '';
    let windowRemaining = 0;

    if (this.currentRegime === 'HEALTHY_EXPANSION') {
      reasoning = 'Balanced growth conditions - normal procurement timing appropriate';
      windowRemaining = duration.typicalDurationDays - duration.daysInRegime;

      if (trend.trendDirection === 'rising' && trend.velocity > 0.02) {
        action = 'LOCK_PRICES';
        intensity = 0.75;
        reasoning = 'FDR rising toward Asset-Led Growth - consider locking in current prices';
      }
    } else if (this.currentRegime === 'ASSET_LED_GROWTH') {
      reasoning = 'Asset prices inflating - lock in prices before further increases';
      windowRemaining = Math.max(0, (duration.typicalDurationDays - duration.daysInRegime));

      if (trend.trendDirection === 'rising') {
        intensity = 0.85;
        reasoning = 'FDR accelerating - urgency to lock prices increasing';
      } else if (trend.trendDirection === 'falling') {
        action = 'WAIT';
        intensity = 0.5;
        reasoning = 'FDR declining - prices may stabilize, consider waiting';
      }
    } else if (this.currentRegime === 'IMBALANCED_EXCESS') {
      reasoning = 'Bubble conditions - defer non-essential purchases, expect price corrections';
      windowRemaining = transition.estimatedTimeToTransition;

      if (trend.trendDirection === 'falling') {
        action = 'WAIT';
        intensity = 0.9;
        reasoning = 'FDR declining from peak - correction incoming, defer purchases';
      }
    } else if (this.currentRegime === 'REAL_ECONOMY_LEAD') {
      reasoning = 'Counter-cyclical opportunity - prices depressed, optimal buying window';
      windowRemaining = duration.typicalDurationDays - duration.daysInRegime;
      intensity = 0.95;

      if (trend.trendDirection === 'rising') {
        reasoning = 'Window closing - FDR rising, buy now before prices recover';
        intensity = 1.0;
      }
    }

    if (duration.isExtended) {
      intensity *= duration.confidenceDecay;
      reasoning += ` (Note: ${this.currentRegime} regime extended beyond typical duration)`;
    }

    let fdrContext = `FDR: ${trend.currentFDR.toFixed(2)}`;
    if (trend.trendDirection !== 'stable') {
      fdrContext += ` (${trend.trendDirection}, velocity: ${(trend.velocity * 100).toFixed(1)}%/day)`;
    }

    return {
      action,
      intensity: Math.round(intensity * 100) / 100,
      reasoning,
      windowRemaining: Math.max(0, Math.round(windowRemaining)),
      fdrContext,
    };
  }

  /**
   * Get comprehensive regime intelligence summary
   */
  getIntelligenceSummary() {
    const trend = this.calculateFDRTrend();
    const transition = this.predictRegimeTransition();
    const duration = this.getRegimeDuration();
    const confidence = this.calculateRegimeConfidence();
    const procurement = this.getProcurementTimingSignal();

    return {
      currentState: {
        regime: this.currentRegime,
        fdr: trend.currentFDR,
        fdrTrend: trend.trendDirection,
        daysInRegime: duration.daysInRegime,
      },
      fdrAnalysis: trend,
      transitionPrediction: transition,
      regimeDuration: duration,
      confidenceScoring: confidence,
      procurementSignal: procurement,
      optimizedFactors: {
        HEALTHY_EXPANSION: this.getOptimizedRegimeFactor('HEALTHY_EXPANSION'),
        ASSET_LED_GROWTH: this.getOptimizedRegimeFactor('ASSET_LED_GROWTH'),
        IMBALANCED_EXCESS: this.getOptimizedRegimeFactor('IMBALANCED_EXCESS'),
        REAL_ECONOMY_LEAD: this.getOptimizedRegimeFactor('REAL_ECONOMY_LEAD'),
      },
    };
  }

  /**
   * Initialize from historical FDR data
   */
  initializeFromHistory(history: FDRSnapshot[]): void {
    this.fdrHistory = history.slice(-365);

    if (this.fdrHistory.length > 0) {
      const mostRecent = this.fdrHistory[this.fdrHistory.length - 1];
      this.currentRegime = mostRecent.regime;

      for (let i = this.fdrHistory.length - 1; i >= 0; i--) {
        if (this.fdrHistory[i].regime !== this.currentRegime) {
          this.regimeStartDate = this.fdrHistory[i + 1]?.timestamp || new Date();
          break;
        }
      }
    }
  }
}

// Default singleton for backward compatibility (use RegimeIntelligence.forCompany for multi-tenant)
export const regimeIntelligence = new RegimeIntelligence('default');

// Helper to get company-scoped intelligence
export function getCompanyRegimeIntelligence(companyId: string): RegimeIntelligence {
  return RegimeIntelligence.forCompany(companyId);
}
