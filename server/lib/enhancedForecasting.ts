/**
 * Enhanced Forecasting Module
 * 
 * Implements 6 accuracy improvements that reinforce the FDR thesis:
 * 1. Regime-Specific Model Tuning - separate sub-models per regime
 * 2. Granular Regime Signals - FDR velocity, acceleration, transition probability
 * 3. Historical Lookback by Regime - weight data by regime similarity
 * 4. Demand Volatility Weighting - adjust confidence based on product stability
 * 5. Lead Indicators - PMI and leading signals for transition prediction
 * 6. Customer Regime Sensitivity - customer-level cycle sensitivity
 */

import type { Regime } from "./economics";
import { getCompanyRegimeIntelligence } from "./regimeIntelligence";

export interface DemandDataPoint {
  units: number;
  date: Date;
  regime?: Regime;
  customerId?: string;
}

export interface RegimeModelParameters {
  regime: Regime;
  baseFactor: number;
  seasonalityWeight: number;
  volatilityAdjustment: number;
  dampingFactor: number;
  trainingSamples: number;
  lastUpdated: Date;
  mapeScore: number;
}

export interface VolatilityProfile {
  skuId: string;
  volatilityScore: number;
  volatilityTier: 'stable' | 'moderate' | 'volatile' | 'highly_volatile';
  coefficientOfVariation: number;
  demandRange: { min: number; max: number };
  recommendedConfidenceMultiplier: number;
}

export interface CustomerRegimeSensitivity {
  customerId: string;
  sensitivityScore: number;
  sensitivityTier: 'low' | 'moderate' | 'high' | 'very_high';
  historicalVariance: number;
  preferredRegimes: Regime[];
}

export interface LeadIndicator {
  name: string;
  value: number;
  trend: 'rising' | 'falling' | 'stable';
  leadTimeDays: number;
  correlationToRegime: number;
  timestamp: Date;
}

export interface EnhancedForecastResult {
  forecasts: number[];
  lowerBounds: number[];
  upperBounds: number[];
  confidence: number;
  regimeFactor: number;
  volatilityAdjustment: number;
  modelUsed: string;
  enhancements: {
    regimeSpecificTuning: boolean;
    granularSignals: boolean;
    historicalLookback: boolean;
    volatilityWeighting: boolean;
    leadIndicators: boolean;
    customerSensitivity: boolean;
  };
  accuracy: {
    expectedMAPE: number;
    confidenceInterval: number;
    dataQuality: number;
  };
}

const DEFAULT_REGIME_MODELS: Record<Regime, RegimeModelParameters> = {
  HEALTHY_EXPANSION: {
    regime: 'HEALTHY_EXPANSION',
    baseFactor: 1.0,
    seasonalityWeight: 1.0,
    volatilityAdjustment: 1.0,
    dampingFactor: 0.06,
    trainingSamples: 0,
    lastUpdated: new Date(),
    mapeScore: 15,
  },
  ASSET_LED_GROWTH: {
    regime: 'ASSET_LED_GROWTH',
    baseFactor: 0.96,
    seasonalityWeight: 0.9,
    volatilityAdjustment: 1.1,
    dampingFactor: 0.08,
    trainingSamples: 0,
    lastUpdated: new Date(),
    mapeScore: 15,
  },
  IMBALANCED_EXCESS: {
    regime: 'IMBALANCED_EXCESS',
    baseFactor: 0.92,
    seasonalityWeight: 0.8,
    volatilityAdjustment: 1.25,
    dampingFactor: 0.10,
    trainingSamples: 0,
    lastUpdated: new Date(),
    mapeScore: 18,
  },
  REAL_ECONOMY_LEAD: {
    regime: 'REAL_ECONOMY_LEAD',
    baseFactor: 1.05,
    seasonalityWeight: 1.1,
    volatilityAdjustment: 1.15,
    dampingFactor: 0.05,
    trainingSamples: 0,
    lastUpdated: new Date(),
    mapeScore: 16,
  },
};

const REGIME_SIMILARITY_MATRIX: Record<Regime, Record<Regime, number>> = {
  HEALTHY_EXPANSION: {
    HEALTHY_EXPANSION: 1.0,
    ASSET_LED_GROWTH: 0.7,
    IMBALANCED_EXCESS: 0.3,
    REAL_ECONOMY_LEAD: 0.5,
  },
  ASSET_LED_GROWTH: {
    HEALTHY_EXPANSION: 0.7,
    ASSET_LED_GROWTH: 1.0,
    IMBALANCED_EXCESS: 0.6,
    REAL_ECONOMY_LEAD: 0.4,
  },
  IMBALANCED_EXCESS: {
    HEALTHY_EXPANSION: 0.3,
    ASSET_LED_GROWTH: 0.6,
    IMBALANCED_EXCESS: 1.0,
    REAL_ECONOMY_LEAD: 0.5,
  },
  REAL_ECONOMY_LEAD: {
    HEALTHY_EXPANSION: 0.5,
    ASSET_LED_GROWTH: 0.4,
    IMBALANCED_EXCESS: 0.5,
    REAL_ECONOMY_LEAD: 1.0,
  },
};

export class EnhancedDemandForecaster {
  private companyId: string;
  private historyBySku: Record<string, DemandDataPoint[]>;
  private regimeModels: Record<Regime, RegimeModelParameters>;
  private volatilityProfiles: Record<string, VolatilityProfile>;
  private customerSensitivity: Record<string, CustomerRegimeSensitivity>;
  private leadIndicators: LeadIndicator[];

  constructor(
    companyId: string,
    historyBySku: Record<string, DemandDataPoint[]> = {}
  ) {
    this.companyId = companyId;
    this.historyBySku = historyBySku;
    this.regimeModels = { ...DEFAULT_REGIME_MODELS };
    this.volatilityProfiles = {};
    this.customerSensitivity = {};
    this.leadIndicators = [];
  }

  /**
   * Enhancement 1: Train regime-specific sub-models
   */
  trainRegimeSpecificModels(): void {
    console.log(`[EnhancedForecasting] Training regime-specific models for company ${this.companyId}`);
    
    for (const regime of Object.keys(DEFAULT_REGIME_MODELS) as Regime[]) {
      const regimeData = this.getDataForRegime(regime);
      
      if (regimeData.length < 10) {
        console.log(`[EnhancedForecasting] Insufficient data for ${regime} (${regimeData.length} samples)`);
        continue;
      }

      const volatility = this.calculateVolatility(regimeData.map(d => d.units));
      const seasonality = this.detectSeasonality(regimeData.map(d => d.units));
      
      const baseModel = DEFAULT_REGIME_MODELS[regime];
      const optimizedFactor = this.optimizeBaseFactor(regimeData, baseModel.baseFactor);
      
      this.regimeModels[regime] = {
        ...baseModel,
        baseFactor: optimizedFactor,
        volatilityAdjustment: 1 + (volatility * 0.1),
        seasonalityWeight: seasonality,
        trainingSamples: regimeData.length,
        lastUpdated: new Date(),
      };
      
      console.log(`[EnhancedForecasting] ${regime}: factor=${optimizedFactor.toFixed(3)}, samples=${regimeData.length}`);
    }
  }

  private getDataForRegime(regime: Regime): DemandDataPoint[] {
    const allData: DemandDataPoint[] = [];
    for (const skuData of Object.values(this.historyBySku)) {
      allData.push(...skuData.filter(d => d.regime === regime));
    }
    return allData;
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return mean > 0 ? Math.sqrt(variance) / mean : 0;
  }

  private detectSeasonality(values: number[]): number {
    if (values.length < 12) return 1.0;
    
    const monthlyAvg: number[] = [];
    for (let i = 0; i < 12; i++) {
      const monthValues = values.filter((_, idx) => idx % 12 === i);
      monthlyAvg.push(monthValues.length > 0 
        ? monthValues.reduce((a, b) => a + b, 0) / monthValues.length 
        : 0);
    }
    
    const overallMean = values.reduce((a, b) => a + b, 0) / values.length;
    const seasonalVariance = monthlyAvg.reduce((sum, m) => sum + Math.pow(m - overallMean, 2), 0) / 12;
    const seasonalStrength = overallMean > 0 ? Math.sqrt(seasonalVariance) / overallMean : 0;
    
    return 1 + (seasonalStrength * 0.5);
  }

  private optimizeBaseFactor(data: DemandDataPoint[], initialFactor: number): number {
    if (data.length < 5) return initialFactor;
    
    const trainSize = Math.floor(data.length * 0.7);
    const trainData = data.slice(0, trainSize);
    const testData = data.slice(trainSize);
    
    let bestFactor = initialFactor;
    let bestMAPE = Infinity;
    
    for (let factor = 0.8; factor <= 1.2; factor += 0.02) {
      const predictions = this.simpleForecast(trainData, testData.length, factor);
      const mape = this.calculateMAPE(predictions, testData.map(d => d.units));
      
      if (mape < bestMAPE) {
        bestMAPE = mape;
        bestFactor = factor;
      }
    }
    
    return bestFactor;
  }

  private simpleForecast(trainData: DemandDataPoint[], periods: number, factor: number): number[] {
    const values = trainData.map(d => d.units);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return Array(periods).fill(mean * factor);
  }

  private calculateMAPE(predicted: number[], actual: number[]): number {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < Math.min(predicted.length, actual.length); i++) {
      if (actual[i] > 0) {
        sum += Math.abs((predicted[i] - actual[i]) / actual[i]) * 100;
        count++;
      }
    }
    return count > 0 ? sum / count : 100;
  }

  /**
   * Enhancement 3: Historical lookback weighted by regime similarity
   */
  getRegimeWeightedHistory(sku: string, currentRegime: Regime): number[] {
    const history = this.historyBySku[sku] || [];
    if (history.length === 0) return [];

    const weightedValues: number[] = [];
    const similarities = REGIME_SIMILARITY_MATRIX[currentRegime];

    for (const dataPoint of history) {
      const regime = dataPoint.regime || 'HEALTHY_EXPANSION';
      const similarity = similarities[regime as Regime] || 0.5;
      for (let i = 0; i < Math.ceil(similarity * 2); i++) {
        weightedValues.push(dataPoint.units);
      }
    }

    return weightedValues;
  }

  /**
   * Enhancement 4: Calculate volatility profile for SKU
   */
  calculateVolatilityProfile(skuId: string): VolatilityProfile {
    const history = this.historyBySku[skuId] || [];
    const values = history.map(d => d.units);

    if (values.length < 3) {
      return {
        skuId,
        volatilityScore: 0.5,
        volatilityTier: 'moderate',
        coefficientOfVariation: 0,
        demandRange: { min: 0, max: 0 },
        recommendedConfidenceMultiplier: 1.0,
      };
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 0;

    let tier: VolatilityProfile['volatilityTier'];
    let multiplier: number;

    if (cv < 0.15) {
      tier = 'stable';
      multiplier = 0.8;
    } else if (cv < 0.30) {
      tier = 'moderate';
      multiplier = 1.0;
    } else if (cv < 0.50) {
      tier = 'volatile';
      multiplier = 1.3;
    } else {
      tier = 'highly_volatile';
      multiplier = 1.6;
    }

    const profile: VolatilityProfile = {
      skuId,
      volatilityScore: Math.min(1, cv),
      volatilityTier: tier,
      coefficientOfVariation: cv,
      demandRange: { min: Math.min(...values), max: Math.max(...values) },
      recommendedConfidenceMultiplier: multiplier,
    };

    this.volatilityProfiles[skuId] = profile;
    return profile;
  }

  /**
   * Enhancement 5: Incorporate lead indicators
   */
  setLeadIndicators(indicators: LeadIndicator[]): void {
    this.leadIndicators = indicators;
  }

  getLeadIndicatorAdjustment(): number {
    if (this.leadIndicators.length === 0) return 1.0;

    let adjustment = 0;
    let totalWeight = 0;

    for (const indicator of this.leadIndicators) {
      const weight = indicator.correlationToRegime;
      
      let indicatorEffect = 0;
      if (indicator.trend === 'rising') {
        indicatorEffect = 0.02 * indicator.correlationToRegime;
      } else if (indicator.trend === 'falling') {
        indicatorEffect = -0.03 * indicator.correlationToRegime;
      }

      adjustment += indicatorEffect * weight;
      totalWeight += weight;
    }

    return 1 + (totalWeight > 0 ? adjustment / totalWeight : 0);
  }

  /**
   * Enhancement 6: Customer regime sensitivity
   */
  setCustomerSensitivity(customerId: string, sensitivity: CustomerRegimeSensitivity): void {
    this.customerSensitivity[customerId] = sensitivity;
  }

  calculateCustomerSensitivity(customerId: string, demandHistory: DemandDataPoint[]): CustomerRegimeSensitivity {
    const regimeVariances: Record<Regime, number[]> = {
      HEALTHY_EXPANSION: [],
      ASSET_LED_GROWTH: [],
      IMBALANCED_EXCESS: [],
      REAL_ECONOMY_LEAD: [],
    };

    for (const dp of demandHistory) {
      if (dp.regime && dp.customerId === customerId) {
        regimeVariances[dp.regime].push(dp.units);
      }
    }

    let totalVariance = 0;
    let regimeCount = 0;

    for (const [regime, values] of Object.entries(regimeVariances)) {
      if (values.length >= 3) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        totalVariance += Math.sqrt(variance) / mean;
        regimeCount++;
      }
    }

    const avgVariance = regimeCount > 0 ? totalVariance / regimeCount : 0.3;
    
    let tier: CustomerRegimeSensitivity['sensitivityTier'];
    if (avgVariance < 0.15) {
      tier = 'low';
    } else if (avgVariance < 0.30) {
      tier = 'moderate';
    } else if (avgVariance < 0.50) {
      tier = 'high';
    } else {
      tier = 'very_high';
    }

    const preferredRegimes: Regime[] = [];
    for (const [regime, values] of Object.entries(regimeVariances)) {
      if (values.length >= 3) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        if (mean > 0) {
          preferredRegimes.push(regime as Regime);
        }
      }
    }

    const sensitivity: CustomerRegimeSensitivity = {
      customerId,
      sensitivityScore: Math.min(1, avgVariance),
      sensitivityTier: tier,
      historicalVariance: avgVariance,
      preferredRegimes,
    };

    this.customerSensitivity[customerId] = sensitivity;
    return sensitivity;
  }

  /**
   * Main enhanced forecast method - combines all 6 enhancements
   */
  enhancedForecast(
    sku: string,
    monthsAhead: number = 3,
    regime: Regime = 'HEALTHY_EXPANSION',
    customerId?: string
  ): EnhancedForecastResult {
    const intelligence = getCompanyRegimeIntelligence(this.companyId);
    const regimeModel = this.regimeModels[regime];
    
    const volatilityProfile = this.volatilityProfiles[sku] || this.calculateVolatilityProfile(sku);
    const leadAdjustment = this.getLeadIndicatorAdjustment();
    const weightedHistory = this.getRegimeWeightedHistory(sku, regime);
    
    let customerAdjustment = 1.0;
    if (customerId && this.customerSensitivity[customerId]) {
      const sensitivity = this.customerSensitivity[customerId];
      if (regime === 'IMBALANCED_EXCESS' && sensitivity.sensitivityTier === 'very_high') {
        customerAdjustment = 0.85;
      } else if (regime === 'REAL_ECONOMY_LEAD' && sensitivity.sensitivityTier === 'low') {
        customerAdjustment = 1.05;
      }
    }

    const rawValues = weightedHistory.length > 0 ? weightedHistory : (this.historyBySku[sku]?.map(d => d.units) || []);
    
    const base = this.exponentialSmoothing(rawValues, 0.45);
    const combinedFactor = regimeModel.baseFactor * leadAdjustment * customerAdjustment;
    
    const seasonality = this.movingAverage(rawValues, 12);
    let seasonFactor = 1.0;
    if (seasonality > 0) {
      seasonFactor = Math.max(0.85, Math.min(1.15, base / seasonality));
    }
    seasonFactor *= regimeModel.seasonalityWeight;

    const level = base * combinedFactor * seasonFactor;
    const forecasts: number[] = [];

    for (let h = 1; h <= monthsAhead; h++) {
      const damp = 1.0 - regimeModel.dampingFactor * (h - 1);
      forecasts.push(Math.max(0, level * damp));
    }

    const confidence = intelligence.calculateRegimeConfidence();
    const uncertaintyMultiplier = volatilityProfile.recommendedConfidenceMultiplier * (1 + (1 - confidence.overall) * 0.2);

    const baseMargin = 0.10 + (volatilityProfile.volatilityScore * 0.15);
    const lowerBounds = forecasts.map(f => f * (1 - baseMargin * uncertaintyMultiplier));
    const upperBounds = forecasts.map(f => f * (1 + baseMargin * uncertaintyMultiplier));

    const expectedMAPE = Math.max(5, regimeModel.mapeScore - (regimeModel.trainingSamples > 50 ? 3 : 0));

    return {
      forecasts,
      lowerBounds,
      upperBounds,
      confidence: confidence.overall,
      regimeFactor: combinedFactor,
      volatilityAdjustment: volatilityProfile.recommendedConfidenceMultiplier,
      modelUsed: `regime_specific_${regime}`,
      enhancements: {
        regimeSpecificTuning: regimeModel.trainingSamples > 10,
        granularSignals: intelligence.isInitialized(),
        historicalLookback: weightedHistory.length !== (this.historyBySku[sku]?.length || 0),
        volatilityWeighting: true,
        leadIndicators: this.leadIndicators.length > 0,
        customerSensitivity: customerId !== undefined && this.customerSensitivity[customerId] !== undefined,
      },
      accuracy: {
        expectedMAPE,
        confidenceInterval: baseMargin * uncertaintyMultiplier * 100,
        dataQuality: Math.min(1, rawValues.length / 30),
      },
    };
  }

  private movingAverage(series: number[], window: number): number {
    if (window <= 0 || !series.length) return 0;
    const w = Math.min(window, series.length);
    return series.slice(-w).reduce((sum, val) => sum + val, 0) / w;
  }

  private exponentialSmoothing(series: number[], alpha: number = 0.4): number {
    if (!series.length) return 0;
    let s = series[0];
    for (let i = 1; i < series.length; i++) {
      s = alpha * series[i] + (1 - alpha) * s;
    }
    return s;
  }

  /**
   * Run comprehensive accuracy test comparing baseline vs enhanced forecasting
   */
  runAccuracyComparison(testData: Record<string, DemandDataPoint[]>): {
    baselineMAPE: number;
    enhancedMAPE: number;
    improvement: number;
    byRegime: Record<Regime, { baseline: number; enhanced: number; improvement: number }>;
    sampleSize: number;
  } {
    const regimeResults: Record<Regime, { baselineErrors: number[]; enhancedErrors: number[] }> = {
      HEALTHY_EXPANSION: { baselineErrors: [], enhancedErrors: [] },
      ASSET_LED_GROWTH: { baselineErrors: [], enhancedErrors: [] },
      IMBALANCED_EXCESS: { baselineErrors: [], enhancedErrors: [] },
      REAL_ECONOMY_LEAD: { baselineErrors: [], enhancedErrors: [] },
    };

    let totalBaseline = 0;
    let totalEnhanced = 0;
    let count = 0;

    for (const [skuId, history] of Object.entries(testData)) {
      if (history.length < 10) continue;

      const trainSize = Math.floor(history.length * 0.7);
      const trainData = history.slice(0, trainSize);
      const testDataSlice = history.slice(trainSize);

      this.historyBySku[skuId] = trainData;
      this.trainRegimeSpecificModels();

      for (let i = 0; i < testDataSlice.length; i++) {
        const actual = testDataSlice[i].units;
        const regime = testDataSlice[i].regime || 'HEALTHY_EXPANSION';

        if (actual <= 0) continue;

        const baselinePred = this.exponentialSmoothing(trainData.map(d => d.units)) * 0.96;
        const baselineError = Math.abs((baselinePred - actual) / actual) * 100;

        const enhanced = this.enhancedForecast(skuId, 1, regime);
        const enhancedPred = enhanced.forecasts[0];
        const enhancedError = Math.abs((enhancedPred - actual) / actual) * 100;

        totalBaseline += baselineError;
        totalEnhanced += enhancedError;
        count++;

        regimeResults[regime].baselineErrors.push(baselineError);
        regimeResults[regime].enhancedErrors.push(enhancedError);
      }
    }

    const baselineMAPE = count > 0 ? totalBaseline / count : 0;
    const enhancedMAPE = count > 0 ? totalEnhanced / count : 0;
    const improvement = baselineMAPE > 0 ? ((baselineMAPE - enhancedMAPE) / baselineMAPE) * 100 : 0;

    const byRegime: Record<Regime, { baseline: number; enhanced: number; improvement: number }> = {} as any;
    for (const regime of Object.keys(regimeResults) as Regime[]) {
      const { baselineErrors, enhancedErrors } = regimeResults[regime];
      const baseAvg = baselineErrors.length > 0 ? baselineErrors.reduce((a, b) => a + b, 0) / baselineErrors.length : 0;
      const enhAvg = enhancedErrors.length > 0 ? enhancedErrors.reduce((a, b) => a + b, 0) / enhancedErrors.length : 0;
      byRegime[regime] = {
        baseline: Math.round(baseAvg * 100) / 100,
        enhanced: Math.round(enhAvg * 100) / 100,
        improvement: baseAvg > 0 ? Math.round(((baseAvg - enhAvg) / baseAvg) * 10000) / 100 : 0,
      };
    }

    return {
      baselineMAPE: Math.round(baselineMAPE * 100) / 100,
      enhancedMAPE: Math.round(enhancedMAPE * 100) / 100,
      improvement: Math.round(improvement * 100) / 100,
      byRegime,
      sampleSize: count,
    };
  }
}

/**
 * Lead Indicator Service - Enhancement 5
 */
export class LeadIndicatorService {
  private indicators: LeadIndicator[] = [];

  addPMIIndicator(value: number, previousValue: number): void {
    const trend = value > previousValue + 1 ? 'rising' : value < previousValue - 1 ? 'falling' : 'stable';
    this.indicators.push({
      name: 'PMI',
      value,
      trend,
      leadTimeDays: 30,
      correlationToRegime: 0.7,
      timestamp: new Date(),
    });
  }

  addNewOrdersIndicator(value: number, previousValue: number): void {
    const trend = value > previousValue * 1.02 ? 'rising' : value < previousValue * 0.98 ? 'falling' : 'stable';
    this.indicators.push({
      name: 'NewOrders',
      value,
      trend,
      leadTimeDays: 45,
      correlationToRegime: 0.65,
      timestamp: new Date(),
    });
  }

  addInventoryIndicator(value: number, previousValue: number): void {
    const trend = value > previousValue * 1.05 ? 'rising' : value < previousValue * 0.95 ? 'falling' : 'stable';
    this.indicators.push({
      name: 'Inventories',
      value,
      trend,
      leadTimeDays: 60,
      correlationToRegime: 0.5,
      timestamp: new Date(),
    });
  }

  getIndicators(): LeadIndicator[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    return this.indicators.filter(i => i.timestamp >= cutoff);
  }

  getAggregateSignal(): { direction: 'expansion' | 'contraction' | 'neutral'; strength: number } {
    const recent = this.getIndicators();
    if (recent.length === 0) return { direction: 'neutral', strength: 0 };

    let expansionScore = 0;
    let totalWeight = 0;

    for (const indicator of recent) {
      const weight = indicator.correlationToRegime;
      if (indicator.trend === 'rising') {
        expansionScore += weight;
      } else if (indicator.trend === 'falling') {
        expansionScore -= weight;
      }
      totalWeight += weight;
    }

    const normalizedScore = totalWeight > 0 ? expansionScore / totalWeight : 0;
    
    return {
      direction: normalizedScore > 0.2 ? 'expansion' : normalizedScore < -0.2 ? 'contraction' : 'neutral',
      strength: Math.abs(normalizedScore),
    };
  }
}

export const leadIndicatorService = new LeadIndicatorService();
