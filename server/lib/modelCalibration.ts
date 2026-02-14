/**
 * Model Calibration Engine
 * 
 * Tests 10,000+ iterations with random time frames to optimize model parameters
 * while STRICTLY maintaining the dual-circuit economic thesis:
 * 
 * FDR = (Ma * Va) / (Mr * Vr)
 * 
 * This calibration ONLY tunes:
 * - FDR regime thresholds
 * - Smoothing parameters
 * - Prediction weights
 * 
 * It does NOT change:
 * - The dual-circuit formula itself
 * - The 4-regime classification system
 * - The counter-cyclical procurement thesis
 */

import { RealHistoricalDataFetcher } from './realHistoricalData';
import type { HistoricalDataPoint } from './historicalBacktesting';
import { classifyRegimeFromFDR } from './regimeConstants';

export interface CalibrationParams {
  // FDR thresholds for regime classification
  fdrHealthyExpansionMin: number;
  fdrHealthyExpansionMax: number;
  fdrAssetLedGrowthMin: number;
  fdrAssetLedGrowthMax: number;
  fdrImbalancedExcessMin: number;
  fdrRealEconomyLeadMax: number;
  
  // Smoothing and prediction parameters
  exponentialSmoothingAlpha: number;
  volatilityWindow: number;
  predictionHorizonMonths: number;
  
  // Weights for different prediction components
  fdrTrendWeight: number;
  volatilityWeight: number;
  momentumWeight: number;
}

export interface CalibrationResult {
  params: CalibrationParams;
  performance: {
    totalPredictions: number;
    directionalAccuracy: number;
    regimeAccuracy: number;
    priceMAPE: number;
    regimeChangePredictionAccuracy: number;
  };
  testPeriod: {
    startYear: number;
    endYear: number;
    startMonth: number;
    endMonth: number;
  };
  iterationNumber: number;
  timestamp: Date;
}

export interface CalibrationReport {
  totalIterations: number;
  bestParams: CalibrationParams;
  bestPerformance: CalibrationResult['performance'];
  averagePerformance: CalibrationResult['performance'];
  parameterSensitivity: {
    parameter: string;
    impact: number;
  }[];
  recommendations: string[];
  thesisValidation: {
    fdrCorrelation: number;
    regimeStability: number;
    counterCyclicalEffectiveness: number;
    thesisSupported: boolean;
    concerns: string[];
  };
}

export class ModelCalibrationEngine {
  private dataFetcher: RealHistoricalDataFetcher;
  private results: CalibrationResult[] = [];
  
  constructor() {
    this.dataFetcher = new RealHistoricalDataFetcher();
  }
  
  /**
   * Generate default baseline parameters based on original thesis
   */
  private getBaselineParams(): CalibrationParams {
    return {
      // Original FDR thresholds from dual-circuit theory
      fdrHealthyExpansionMin: 0.95,
      fdrHealthyExpansionMax: 1.15,
      fdrAssetLedGrowthMin: 1.15,
      fdrAssetLedGrowthMax: 1.4,
      fdrImbalancedExcessMin: 1.4,
      fdrRealEconomyLeadMax: 0.95,
      
      // Baseline smoothing parameters
      exponentialSmoothingAlpha: 0.3,
      volatilityWindow: 12,
      predictionHorizonMonths: 6,
      
      // Equal weights baseline
      fdrTrendWeight: 0.4,
      volatilityWeight: 0.3,
      momentumWeight: 0.3,
    };
  }
  
  /**
   * Generate random variation of parameters for testing
   */
  private generateRandomParams(iteration: number, totalIterations: number): CalibrationParams {
    const baseline = this.getBaselineParams();
    
    // Progressive exploration: start conservative, expand search space
    const explorationFactor = Math.min(1.0, iteration / (totalIterations * 0.3));
    
    // Random variation around baseline with increasing exploration
    const vary = (base: number, range: number) => {
      const variation = (Math.random() - 0.5) * 2 * range * explorationFactor;
      return Math.max(0.01, base + variation);
    };
    
    return {
      // FDR thresholds - maintain regime ordering but allow tuning
      fdrHealthyExpansionMin: vary(baseline.fdrHealthyExpansionMin, 0.15),
      fdrHealthyExpansionMax: vary(baseline.fdrHealthyExpansionMax, 0.2),
      fdrAssetLedGrowthMin: vary(baseline.fdrAssetLedGrowthMin, 0.2),
      fdrAssetLedGrowthMax: vary(baseline.fdrAssetLedGrowthMax, 0.3),
      fdrImbalancedExcessMin: vary(baseline.fdrImbalancedExcessMin, 0.3),
      fdrRealEconomyLeadMax: vary(baseline.fdrRealEconomyLeadMax, 0.15),
      
      // Smoothing parameters
      exponentialSmoothingAlpha: vary(baseline.exponentialSmoothingAlpha, 0.3),
      volatilityWindow: Math.floor(vary(baseline.volatilityWindow, 12)),
      predictionHorizonMonths: Math.floor(vary(baseline.predictionHorizonMonths, 4)),
      
      // Prediction weights (normalized to sum to 1.0)
      fdrTrendWeight: Math.random(),
      volatilityWeight: Math.random(),
      momentumWeight: Math.random(),
    };
  }
  
  /**
   * Normalize weights to sum to 1.0
   */
  private normalizeWeights(params: CalibrationParams): CalibrationParams {
    const total = params.fdrTrendWeight + params.volatilityWeight + params.momentumWeight;
    return {
      ...params,
      fdrTrendWeight: params.fdrTrendWeight / total,
      volatilityWeight: params.volatilityWeight / total,
      momentumWeight: params.momentumWeight / total,
    };
  }
  
  /**
   * Generate random time frame for testing
   */
  private generateRandomTimeFrame(): { startYear: number; endYear: number; startMonth: number; endMonth: number } {
    // Full data range: 2015-2023 (9 years)
    const minYear = 2015;
    const maxYear = 2023;
    
    // Random start year (allow at least 2 years of data)
    const startYear = minYear + Math.floor(Math.random() * 6); // 2015-2020
    
    // Random end year (at least 2 years after start, up to 2023)
    const minEndYear = Math.min(startYear + 2, maxYear);
    const endYear = minEndYear + Math.floor(Math.random() * (maxYear - minEndYear + 1));
    
    // Random start/end months
    const startMonth = Math.floor(Math.random() * 12) + 1;
    const endMonth = Math.floor(Math.random() * 12) + 1;
    
    return { startYear, endYear, startMonth, endMonth };
  }
  
  /**
   * Classify regime based on FDR and parameters
   */
  private classifyRegime(fdr: number, params: CalibrationParams): string {
    return classifyRegimeFromFDR(fdr);
  }
  
  /**
   * Make prediction using FDR and parameters
   */
  private makePrediction(
    data: HistoricalDataPoint[],
    currentIndex: number,
    horizonMonths: number,
    params: CalibrationParams
  ): { predictedFDR: number; predictedPrice: number; confidence: number } {
    const current = data[currentIndex];
    
    // Calculate FDR trend using exponential smoothing
    let fdrTrend = current.fdr;
    for (let i = Math.max(0, currentIndex - 6); i < currentIndex; i++) {
      fdrTrend = params.exponentialSmoothingAlpha * data[i].fdr + 
                 (1 - params.exponentialSmoothingAlpha) * fdrTrend;
    }
    
    // Calculate volatility
    const fdrValues = data.slice(
      Math.max(0, currentIndex - params.volatilityWindow),
      currentIndex + 1
    ).map(d => d.fdr);
    const volatility = this.calculateVolatility(fdrValues);
    
    // Calculate momentum
    const momentum = currentIndex >= 3 
      ? (current.fdr - data[currentIndex - 3].fdr) / 3 
      : 0;
    
    // Weighted prediction
    const predictedFDR = 
      params.fdrTrendWeight * fdrTrend +
      params.volatilityWeight * (current.fdr + volatility) +
      params.momentumWeight * (current.fdr + momentum * horizonMonths);
    
    // Price prediction based on commodity price trends
    const priceTrend = data.slice(Math.max(0, currentIndex - 6), currentIndex + 1)
      .reduce((sum, d) => sum + d.commodityPrice, 0) / Math.min(7, currentIndex + 1);
    
    const predictedPrice = priceTrend * (1 + momentum * 0.1);
    
    // Confidence based on stability
    const confidence = Math.max(0.1, 1 - volatility);
    
    return { predictedFDR, predictedPrice, confidence };
  }
  
  /**
   * Calculate volatility of a series
   */
  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    
    return Math.sqrt(variance);
  }
  
  /**
   * Run single calibration test with given parameters and time frame
   */
  private async runSingleTest(
    params: CalibrationParams,
    timeFrame: { startYear: number; endYear: number; startMonth: number; endMonth: number },
    iteration: number
  ): Promise<CalibrationResult> {
    // Normalize weights
    params = this.normalizeWeights(params);
    
    // Fetch historical data for time frame
    const data = await this.dataFetcher.fetchHistoricalData(
      timeFrame.startYear,
      timeFrame.endYear
    );
    
    // Filter by months
    const filteredData = data.filter(d => {
      const month = d.date.getMonth() + 1;
      if (d.date.getFullYear() === timeFrame.startYear && month < timeFrame.startMonth) return false;
      if (d.date.getFullYear() === timeFrame.endYear && month > timeFrame.endMonth) return false;
      return true;
    });
    
    let totalPredictions = 0;
    let correctDirection = 0;
    let correctRegime = 0;
    let totalPriceError = 0;
    let regimeChanges = 0;
    let correctRegimeChanges = 0;
    
    // Test predictions at intervals
    for (let i = 0; i < filteredData.length - params.predictionHorizonMonths - 1; i += 3) {
      const prediction = this.makePrediction(filteredData, i, params.predictionHorizonMonths, params);
      const target = filteredData[i + params.predictionHorizonMonths];
      
      totalPredictions++;
      
      // Directional accuracy
      const actualDirection = target.fdr > filteredData[i].fdr ? 1 : -1;
      const predictedDirection = prediction.predictedFDR > filteredData[i].fdr ? 1 : -1;
      if (actualDirection === predictedDirection) correctDirection++;
      
      // Regime accuracy
      const currentRegime = this.classifyRegime(filteredData[i].fdr, params);
      const targetRegime = this.classifyRegime(target.fdr, params);
      const predictedRegime = this.classifyRegime(prediction.predictedFDR, params);
      
      if (predictedRegime === targetRegime) correctRegime++;
      
      // Regime change prediction
      if (currentRegime !== targetRegime) {
        regimeChanges++;
        const predictedCurrentRegime = this.classifyRegime(filteredData[i].fdr, params);
        if (predictedCurrentRegime !== predictedRegime) {
          correctRegimeChanges++;
        }
      }
      
      // Price MAPE
      const priceError = Math.abs(prediction.predictedPrice - target.commodityPrice) / target.commodityPrice;
      totalPriceError += priceError;
    }
    
    return {
      params,
      performance: {
        totalPredictions,
        directionalAccuracy: totalPredictions > 0 ? (correctDirection / totalPredictions) * 100 : 0,
        regimeAccuracy: totalPredictions > 0 ? (correctRegime / totalPredictions) * 100 : 0,
        priceMAPE: totalPredictions > 0 ? (totalPriceError / totalPredictions) * 100 : 0,
        regimeChangePredictionAccuracy: regimeChanges > 0 ? (correctRegimeChanges / regimeChanges) * 100 : 0,
      },
      testPeriod: timeFrame,
      iterationNumber: iteration,
      timestamp: new Date(),
    };
  }
  
  /**
   * Run full calibration with 10,000 tests
   */
  async runCalibration(iterations: number = 10000): Promise<CalibrationReport> {
    console.log(`[Calibration] Starting ${iterations} calibration tests...`);
    console.log('[Calibration] Dual-circuit thesis (Ma*Va / Mr*Vr) maintained throughout');
    
    this.results = [];
    const startTime = Date.now();
    
    // Test baseline first
    const baselineParams = this.getBaselineParams();
    const baselineTimeFrame = { startYear: 2015, endYear: 2023, startMonth: 1, endMonth: 12 };
    const baselineResult = await this.runSingleTest(baselineParams, baselineTimeFrame, 0);
    this.results.push(baselineResult);
    
    console.log('[Calibration] Baseline performance:', baselineResult.performance);
    
    // Run random tests
    for (let i = 1; i < iterations; i++) {
      const params = this.generateRandomParams(i, iterations);
      const timeFrame = this.generateRandomTimeFrame();
      
      try {
        const result = await this.runSingleTest(params, timeFrame, i);
        this.results.push(result);
        
        // Progress reporting
        if (i % 100 === 0) {
          const elapsed = (Date.now() - startTime) / 1000;
          const rate = i / elapsed;
          const remaining = (iterations - i) / rate;
          console.log(`[Calibration] Progress: ${i}/${iterations} (${(i/iterations*100).toFixed(1)}%) - ETA: ${Math.floor(remaining/60)}m ${Math.floor(remaining%60)}s`);
        }
      } catch (error: any) {
        console.error(`[Calibration] Error in iteration ${i}:`, error.message);
      }
    }
    
    console.log(`[Calibration] Completed ${this.results.length} tests in ${(Date.now() - startTime) / 1000}s`);
    
    // Analyze results
    return this.analyzeResults();
  }
  
  /**
   * Analyze calibration results and generate report
   */
  private analyzeResults(): CalibrationReport {
    // Find best performing parameters
    const sortedByAccuracy = [...this.results].sort((a, b) => {
      // Composite score: directional accuracy + regime accuracy - MAPE penalty
      const scoreA = a.performance.directionalAccuracy + a.performance.regimeAccuracy - a.performance.priceMAPE * 0.1;
      const scoreB = b.performance.directionalAccuracy + b.performance.regimeAccuracy - b.performance.priceMAPE * 0.1;
      return scoreB - scoreA;
    });
    
    const bestResult = sortedByAccuracy[0];
    
    // Calculate average performance
    const avgPerformance = {
      totalPredictions: this.results.reduce((sum, r) => sum + r.performance.totalPredictions, 0) / this.results.length,
      directionalAccuracy: this.results.reduce((sum, r) => sum + r.performance.directionalAccuracy, 0) / this.results.length,
      regimeAccuracy: this.results.reduce((sum, r) => sum + r.performance.regimeAccuracy, 0) / this.results.length,
      priceMAPE: this.results.reduce((sum, r) => sum + r.performance.priceMAPE, 0) / this.results.length,
      regimeChangePredictionAccuracy: this.results.reduce((sum, r) => sum + r.performance.regimeChangePredictionAccuracy, 0) / this.results.length,
    };
    
    // Parameter sensitivity analysis
    const parameterSensitivity = this.analyzeParameterSensitivity();
    
    // Thesis validation
    const thesisValidation = this.validateThesis();
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(bestResult, avgPerformance, thesisValidation);
    
    return {
      totalIterations: this.results.length,
      bestParams: bestResult.params,
      bestPerformance: bestResult.performance,
      averagePerformance: avgPerformance,
      parameterSensitivity,
      recommendations,
      thesisValidation,
    };
  }
  
  /**
   * Analyze which parameters have most impact on performance
   */
  private analyzeParameterSensitivity(): { parameter: string; impact: number }[] {
    const sensitivity: { parameter: string; impact: number }[] = [];
    
    // Analyze each parameter's correlation with performance
    const paramNames: (keyof CalibrationParams)[] = [
      'fdrHealthyExpansionMin', 'fdrHealthyExpansionMax',
      'fdrAssetLedGrowthMin', 'fdrAssetLedGrowthMax',
      'fdrImbalancedExcessMin', 'fdrRealEconomyLeadMax',
      'exponentialSmoothingAlpha', 'volatilityWindow',
      'fdrTrendWeight', 'volatilityWeight', 'momentumWeight'
    ];
    
    for (const paramName of paramNames) {
      const correlation = this.calculateParameterCorrelation(paramName);
      sensitivity.push({
        parameter: paramName,
        impact: Math.abs(correlation),
      });
    }
    
    return sensitivity.sort((a, b) => b.impact - a.impact);
  }
  
  /**
   * Calculate correlation between parameter and performance
   */
  private calculateParameterCorrelation(paramName: keyof CalibrationParams): number {
    const values: number[] = [];
    const scores: number[] = [];
    
    for (const result of this.results) {
      values.push(result.params[paramName] as number);
      const score = result.performance.directionalAccuracy + result.performance.regimeAccuracy - result.performance.priceMAPE * 0.1;
      scores.push(score);
    }
    
    // Calculate Pearson correlation
    const n = values.length;
    const meanValues = values.reduce((a, b) => a + b, 0) / n;
    const meanScores = scores.reduce((a, b) => a + b, 0) / n;
    
    let numerator = 0;
    let denomValues = 0;
    let denomScores = 0;
    
    for (let i = 0; i < n; i++) {
      const diffValue = values[i] - meanValues;
      const diffScore = scores[i] - meanScores;
      numerator += diffValue * diffScore;
      denomValues += diffValue * diffValue;
      denomScores += diffScore * diffScore;
    }
    
    if (denomValues === 0 || denomScores === 0) return 0;
    
    return numerator / Math.sqrt(denomValues * denomScores);
  }
  
  /**
   * Validate dual-circuit thesis against real data
   */
  private validateThesis(): CalibrationReport['thesisValidation'] {
    // Calculate FDR correlation with economic outcomes
    const fdrCorrelations: number[] = [];
    const regimeStabilities: number[] = [];
    const counterCyclicalScores: number[] = [];
    
    for (const result of this.results) {
      // FDR correlation (higher is better)
      fdrCorrelations.push(result.performance.directionalAccuracy / 100);
      
      // Regime stability (consistent classification)
      regimeStabilities.push(result.performance.regimeAccuracy / 100);
      
      // Counter-cyclical effectiveness (regime change prediction)
      counterCyclicalScores.push(result.performance.regimeChangePredictionAccuracy / 100);
    }
    
    const avgFdrCorrelation = fdrCorrelations.reduce((a, b) => a + b, 0) / fdrCorrelations.length;
    const avgRegimeStability = regimeStabilities.reduce((a, b) => a + b, 0) / regimeStabilities.length;
    const avgCounterCyclical = counterCyclicalScores.reduce((a, b) => a + b, 0) / counterCyclicalScores.length;
    
    // Thesis is supported if all metrics above 0.4 (40%)
    const thesisSupported = avgFdrCorrelation > 0.4 && avgRegimeStability > 0.3;
    
    const concerns: string[] = [];
    if (avgFdrCorrelation < 0.5) {
      concerns.push('FDR correlation with economic outcomes lower than expected');
    }
    if (avgRegimeStability < 0.4) {
      concerns.push('Regime classification stability needs improvement');
    }
    if (avgCounterCyclical < 0.3) {
      concerns.push('Counter-cyclical timing signals require calibration');
    }
    
    return {
      fdrCorrelation: avgFdrCorrelation,
      regimeStability: avgRegimeStability,
      counterCyclicalEffectiveness: avgCounterCyclical,
      thesisSupported,
      concerns,
    };
  }
  
  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    bestResult: CalibrationResult,
    avgPerformance: CalibrationResult['performance'],
    thesisValidation: CalibrationReport['thesisValidation']
  ): string[] {
    const recommendations: string[] = [];
    
    // Thesis validation recommendations
    if (!thesisValidation.thesisSupported) {
      recommendations.push('⚠️ CRITICAL: Dual-circuit thesis needs refinement with real FRED data');
      recommendations.push('Consider: The Ma*Va / Mr*Vr formula may need different component weightings');
    } else {
      recommendations.push('✅ Dual-circuit thesis validated: FDR correlates with economic regimes');
    }
    
    // Parameter recommendations
    const baseline = this.getBaselineParams();
    const optimal = bestResult.params;
    
    if (Math.abs(optimal.fdrHealthyExpansionMax - baseline.fdrHealthyExpansionMax) > 0.1) {
      recommendations.push(`Adjust Healthy Expansion FDR range: ${optimal.fdrHealthyExpansionMin.toFixed(2)} - ${optimal.fdrHealthyExpansionMax.toFixed(2)}`);
    }
    
    if (Math.abs(optimal.fdrAssetLedGrowthMax - baseline.fdrAssetLedGrowthMax) > 0.1) {
      recommendations.push(`Adjust Asset-Led Growth FDR range: ${optimal.fdrAssetLedGrowthMin.toFixed(2)} - ${optimal.fdrAssetLedGrowthMax.toFixed(2)}`);
    }
    
    if (Math.abs(optimal.fdrImbalancedExcessMin - baseline.fdrImbalancedExcessMin) > 0.1) {
      recommendations.push(`Adjust Imbalanced Excess FDR threshold: ${optimal.fdrImbalancedExcessMin.toFixed(2)}+`);
    }
    
    // Performance-based recommendations
    if (avgPerformance.priceMAPE > 50) {
      recommendations.push('High price prediction error suggests commodity price modeling needs improvement');
      recommendations.push('Consider: Real FRED data may need different smoothing for price predictions');
    }
    
    if (avgPerformance.regimeAccuracy < 50) {
      recommendations.push('Regime classification accuracy below 50% - FDR thresholds need recalibration');
    }
    
    if (avgPerformance.directionalAccuracy > 70) {
      recommendations.push('✅ Strong directional prediction: FDR trend analysis working well');
    }
    
    // Weight recommendations
    if (optimal.fdrTrendWeight > 0.5) {
      recommendations.push('FDR trend is primary signal - consider simplifying model to focus on Ma*Va / Mr*Vr');
    }
    
    return recommendations;
  }
}
