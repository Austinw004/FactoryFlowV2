/**
 * Database-Powered Validation Engine
 * 
 * Uses existing database historical_predictions to run calibration
 * without relying on blocked FRED API.
 * 
 * PRIVATE SaaS Company Use Only - Do Not Publish Results
 */

import { db } from "../db";
import { historicalPredictions, predictionAccuracyMetrics, economicSnapshots } from "@shared/schema";
import { sql, and, gte, lte, isNotNull } from "drizzle-orm";

export interface DatabaseValidationResult {
  totalPredictions: number;
  dateRange: {
    earliest: Date;
    latest: Date;
  };
  overallMetrics: {
    mape: number;
    directionalAccuracy: number;
    regimeAccuracy: number;
  };
  byYear: {
    year: number;
    predictions: number;
    mape: number;
  }[];
  byRegime: {
    regime: string;
    predictions: number;
    mape: number;
    correctPredictions: number;
  }[];
  calibrationRecommendations: string[];
}

export interface ParameterTestResult {
  params: any;
  performance: {
    mape: number;
    directionalAccuracy: number;
    regimeAccuracy: number;
  };
  testCount: number;
}

export class DatabaseValidationEngine {
  
  /**
   * Analyze existing database predictions
   */
  async analyzeExistingData(): Promise<DatabaseValidationResult> {
    console.log('[DatabaseValidation] Analyzing existing prediction data...');
    
    // Get overall statistics
    const overallStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        MIN(prediction_date) as earliest,
        MAX(prediction_date) as latest,
        AVG(CASE WHEN actual_value IS NOT NULL THEN 
          ABS((predicted_value - actual_value) / NULLIF(actual_value, 0)) * 100 
        END) as avg_mape,
        COUNT(CASE WHEN actual_value IS NOT NULL AND 
          SIGN(predicted_value - (SELECT AVG(actual_value) FROM historical_predictions WHERE actual_value IS NOT NULL)) = 
          SIGN(actual_value - (SELECT AVG(actual_value) FROM historical_predictions WHERE actual_value IS NOT NULL))
        THEN 1 END) * 100.0 / NULLIF(COUNT(CASE WHEN actual_value IS NOT NULL THEN 1 END), 0) as directional_acc
      FROM historical_predictions
      WHERE actual_value IS NOT NULL
    `);
    
    // Get by-year breakdown
    const byYearStats = await db.execute(sql`
      SELECT 
        EXTRACT(YEAR FROM prediction_date) as year,
        COUNT(*) as predictions,
        AVG(CASE WHEN actual_value IS NOT NULL THEN 
          ABS((predicted_value - actual_value) / NULLIF(actual_value, 0)) * 100 
        END) as avg_mape
      FROM historical_predictions
      WHERE actual_value IS NOT NULL
      GROUP BY EXTRACT(YEAR FROM prediction_date)
      ORDER BY year DESC
    `);
    
    // Get by-regime breakdown
    const byRegimeStats = await db.execute(sql`
      SELECT 
        regime_at_prediction as regime,
        COUNT(*) as predictions,
        AVG(CASE WHEN actual_value IS NOT NULL THEN 
          ABS((predicted_value - actual_value) / NULLIF(actual_value, 0)) * 100 
        END) as avg_mape,
        COUNT(CASE WHEN actual_value IS NOT NULL AND 
          ABS((predicted_value - actual_value) / NULLIF(actual_value, 0)) < 0.10 
        THEN 1 END) as correct_predictions
      FROM historical_predictions
      WHERE actual_value IS NOT NULL
      GROUP BY regime_at_prediction
      ORDER BY regime
    `);
    
    const overall = overallStats.rows[0] as any;
    
    // Get current accuracy metrics
    const recentMetrics = await db.query.predictionAccuracyMetrics.findFirst({
      orderBy: (metrics, { desc }) => [desc(metrics.periodEnd)],
    });
    
    const result: DatabaseValidationResult = {
      totalPredictions: parseInt(overall.total),
      dateRange: {
        earliest: new Date(overall.earliest),
        latest: new Date(overall.latest),
      },
      overallMetrics: {
        mape: parseFloat(overall.avg_mape || '0'),
        directionalAccuracy: parseFloat(overall.directional_acc || '0'),
        regimeAccuracy: recentMetrics?.correctRegimePct || 0,
      },
      byYear: byYearStats.rows.map((row: any) => ({
        year: parseInt(row.year),
        predictions: parseInt(row.predictions),
        mape: parseFloat(row.avg_mape || '0'),
      })),
      byRegime: byRegimeStats.rows.map((row: any) => ({
        regime: row.regime,
        predictions: parseInt(row.predictions),
        mape: parseFloat(row.avg_mape || '0'),
        correctPredictions: parseInt(row.correct_predictions || '0'),
      })),
      calibrationRecommendations: [],
    };
    
    // Generate recommendations
    result.calibrationRecommendations = this.generateRecommendations(result);
    
    return result;
  }
  
  /**
   * Run calibration using database predictions
   * Tests different parameter combinations
   */
  async runDatabaseCalibration(iterations: number = 10000): Promise<{
    bestParams: any;
    bestPerformance: any;
    allResults: ParameterTestResult[];
    improvement: {
      baselineMAPE: number;
      bestMAPE: number;
      improvementPct: number;
    };
  }> {
    console.log(`[DatabaseValidation] Running ${iterations} calibration tests using database data...`);
    
    // Get baseline performance
    const baseline = await this.analyzeExistingData();
    
    const results: ParameterTestResult[] = [];
    let bestResult: ParameterTestResult | null = null;
    
    for (let i = 0; i < iterations; i++) {
      // Generate random parameters (similar to ModelCalibrationEngine)
      const params = this.generateRandomParameters(i, iterations);
      
      // Test these parameters against database data
      const performance = await this.testParametersAgainstDatabase(params);
      
      const result: ParameterTestResult = {
        params,
        performance,
        testCount: performance.mape > 0 ? 100 : 0, // Sample size
      };
      
      results.push(result);
      
      // Track best
      if (!bestResult || performance.mape < bestResult.performance.mape) {
        bestResult = result;
      }
      
      if ((i + 1) % 1000 === 0) {
        console.log(`[DatabaseValidation] Progress: ${i + 1}/${iterations} tests complete`);
        console.log(`  Best MAPE so far: ${bestResult?.performance.mape.toFixed(2)}%`);
        console.log(`  Best Directional Accuracy: ${bestResult?.performance.directionalAccuracy.toFixed(2)}%`);
      }
    }
    
    const improvement = {
      baselineMAPE: baseline.overallMetrics.mape,
      bestMAPE: bestResult?.performance.mape || 0,
      improvementPct: ((baseline.overallMetrics.mape - (bestResult?.performance.mape || 0)) / baseline.overallMetrics.mape) * 100,
    };
    
    return {
      bestParams: bestResult?.params || {},
      bestPerformance: bestResult?.performance || {},
      allResults: results,
      improvement,
    };
  }
  
  /**
   * Generate random parameters for testing
   */
  private generateRandomParameters(iteration: number, totalIterations: number): any {
    // Progressive exploration: conservative → moderate → aggressive
    const progress = iteration / totalIterations;
    const explorationRange = 0.1 + (progress * 0.4); // 0.1 → 0.5
    
    return {
      // FDR thresholds (vary by ±30%)
      fdrHealthyExpansionMin: 0.95 + (Math.random() - 0.5) * 0.3,
      fdrHealthyExpansionMax: 1.15 + (Math.random() - 0.5) * 0.3,
      fdrAssetLedGrowthMin: 1.15 + (Math.random() - 0.5) * 0.3,
      fdrAssetLedGrowthMax: 1.4 + (Math.random() - 0.5) * 0.3,
      fdrImbalancedExcessMin: 1.4 + (Math.random() - 0.5) * 0.3,
      fdrRealEconomyLeadMax: 0.95 + (Math.random() - 0.5) * 0.3,
      
      // Smoothing parameters
      exponentialSmoothingAlpha: 0.1 + Math.random() * 0.5, // 0.1-0.6
      volatilityWindow: Math.floor(6 + Math.random() * 18), // 6-24 months
      predictionHorizon: Math.floor(3 + Math.random() * 9), // 3-12 months
      
      // Prediction weights
      fdrTrendWeight: 0.3 + Math.random() * 0.4, // 0.3-0.7
      volatilityWeight: 0.1 + Math.random() * 0.3, // 0.1-0.4
      momentumWeight: 0.1 + Math.random() * 0.3, // 0.1-0.4
    };
  }
  
  /**
   * Test parameters against database predictions
   * Simulates recalculating predictions with new parameters
   */
  private async testParametersAgainstDatabase(params: any): Promise<{
    mape: number;
    directionalAccuracy: number;
    regimeAccuracy: number;
  }> {
    // Sample predictions to test against
    const sampleSize = 1000;
    const predictions = await db.execute(sql`
      SELECT 
        prediction_date,
        target_date,
        fdr_at_prediction,
        regime_at_prediction,
        predicted_value,
        actual_value,
        mr_growth_rate,
        ma_growth_rate
      FROM historical_predictions
      WHERE actual_value IS NOT NULL
      ORDER BY RANDOM()
      LIMIT ${sampleSize}
    `);
    
    let totalError = 0;
    let correctDirection = 0;
    let correctRegime = 0;
    let validPredictions = 0;
    
    for (const pred of predictions.rows as any[]) {
      // Recalculate prediction using new parameters
      const adjustedPrediction = this.recalculatePrediction(pred, params);
      
      if (adjustedPrediction !== null && pred.actual_value) {
        const error = Math.abs((adjustedPrediction - pred.actual_value) / pred.actual_value) * 100;
        totalError += error;
        
        // Check direction
        const avgValue = pred.actual_value * 0.95; // Baseline
        if (Math.sign(adjustedPrediction - avgValue) === Math.sign(pred.actual_value - avgValue)) {
          correctDirection++;
        }
        
        // Check regime (recalculate with new FDR thresholds)
        const recalculatedRegime = this.determineRegime(pred.fdr_at_prediction, params);
        if (recalculatedRegime === pred.regime_at_prediction) {
          correctRegime++;
        }
        
        validPredictions++;
      }
    }
    
    return {
      mape: validPredictions > 0 ? totalError / validPredictions : 999,
      directionalAccuracy: validPredictions > 0 ? (correctDirection / validPredictions) * 100 : 0,
      regimeAccuracy: validPredictions > 0 ? (correctRegime / validPredictions) * 100 : 0,
    };
  }
  
  /**
   * Recalculate prediction with new parameters
   */
  private recalculatePrediction(prediction: any, params: any): number | null {
    if (!prediction.predicted_value) return null;
    
    // Apply parameter adjustments
    let adjusted = prediction.predicted_value;
    
    // Adjust based on FDR trend weight
    const fdrEffect = (prediction.fdr_at_prediction - 1.0) * params.fdrTrendWeight * 100;
    adjusted *= (1 + fdrEffect / 100);
    
    // Adjust based on growth rates if available
    if (prediction.ma_growth_rate && prediction.mr_growth_rate) {
      const growthDelta = prediction.ma_growth_rate - prediction.mr_growth_rate;
      adjusted *= (1 + growthDelta * params.momentumWeight);
    }
    
    // Apply smoothing
    adjusted = prediction.predicted_value * (1 - params.exponentialSmoothingAlpha) + 
               adjusted * params.exponentialSmoothingAlpha;
    
    return adjusted;
  }
  
  /**
   * Determine regime based on FDR and parameters
   */
  private determineRegime(fdr: number, params: any): string {
    if (fdr < params.fdrRealEconomyLeadMax) {
      return 'REAL_ECONOMY_LEAD';
    } else if (fdr >= params.fdrHealthyExpansionMin && fdr < params.fdrHealthyExpansionMax) {
      return 'HEALTHY_EXPANSION';
    } else if (fdr >= params.fdrAssetLedGrowthMin && fdr < params.fdrAssetLedGrowthMax) {
      return 'ASSET_LED_GROWTH';
    } else if (fdr >= params.fdrImbalancedExcessMin) {
      return 'IMBALANCED_EXCESS';
    }
    return 'HEALTHY_EXPANSION'; // default
  }
  
  /**
   * Generate calibration recommendations
   */
  private generateRecommendations(result: DatabaseValidationResult): string[] {
    const recommendations: string[] = [];
    
    if (result.overallMetrics.mape > 5) {
      recommendations.push('High MAPE (>5%) suggests parameter recalibration needed');
    } else if (result.overallMetrics.mape < 3) {
      recommendations.push('Excellent MAPE (<3%) - current parameters are well-calibrated');
    }
    
    if (result.overallMetrics.directionalAccuracy < 50) {
      recommendations.push('⚠️ CRITICAL: Directional accuracy below 50% - worse than random guess');
      recommendations.push('Recommend: Increase FDR trend weight and momentum weight');
    } else if (result.overallMetrics.directionalAccuracy > 70) {
      recommendations.push('Strong directional accuracy (>70%) - trend analysis working well');
    }
    
    if (result.overallMetrics.regimeAccuracy > 80) {
      recommendations.push('✅ Excellent regime accuracy (>80%) - FDR thresholds well-calibrated');
    } else if (result.overallMetrics.regimeAccuracy < 60) {
      recommendations.push('⚠️ Poor regime accuracy - FDR thresholds may need adjustment');
    }
    
    // Check for regime-specific issues
    const poorRegimes = result.byRegime.filter(r => r.mape > 10);
    if (poorRegimes.length > 0) {
      recommendations.push(`Specific regime calibration needed: ${poorRegimes.map(r => r.regime).join(', ')}`);
    }
    
    return recommendations;
  }
}
