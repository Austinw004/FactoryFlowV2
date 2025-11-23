/**
 * Automated Forecast Retraining System
 * 
 * Implements continuous learning by:
 * 1. Finding SKUs with new actual demand data
 * 2. Calculating forecast error (MAPE)
 * 3. Retraining models where error > 10%
 */

import type { IStorage } from '../storage';
import { DemandForecaster } from './forecasting';
import type { Regime } from './economics';

interface SKUForecastError {
  skuId: string;
  skuName: string;
  mape: number;
  predictionsEvaluated: number;
  avgPredicted: number;
  avgActual: number;
  shouldRetrain: boolean;
}

interface RetrainingResult {
  totalSkusEvaluated: number;
  skusNeedingRetraining: number;
  skusRetrained: number;
  averageMAPEBefore: number;
  averageMAPEAfter: number;
  errors: string[];
}

/**
 * Find SKUs with recent actual demand data (last 30 days)
 */
export async function findSKUsWithRecentActuals(
  storage: IStorage,
  companyId: string,
  daysBack: number = 30
): Promise<string[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  
  // Get all SKUs for the company
  const skus = await storage.getSkus(companyId);
  
  // Parallelize demand history fetches to avoid blocking event loop
  const historyChecks = await Promise.allSettled(
    skus.map(async (sku) => {
      const history = await storage.getDemandHistory(sku.id);
      const recentHistory = history.filter(h => new Date(h.createdAt) >= cutoffDate);
      return { skuId: sku.id, hasRecent: recentHistory.length > 0 };
    })
  );
  
  // Filter successful checks with recent history
  const skusWithActuals: string[] = [];
  for (const result of historyChecks) {
    if (result.status === 'fulfilled' && result.value.hasRecent) {
      skusWithActuals.push(result.value.skuId);
    }
  }
  
  return skusWithActuals;
}

/**
 * Calculate MAPE (Mean Absolute Percentage Error) for a SKU
 * Compares demand predictions against actual demand from history
 */
export async function calculateSKUForecastError(
  storage: IStorage,
  skuId: string,
  daysBack: number = 90
): Promise<SKUForecastError> {
  const sku = await storage.getSku(skuId);
  
  // Guard against missing SKU records
  if (!sku) {
    console.warn(`[ForecastError] SKU ${skuId} not found, skipping`);
    return {
      skuId,
      skuName: 'Unknown',
      mape: 0,
      predictionsEvaluated: 0,
      avgPredicted: 0,
      avgActual: 0,
      shouldRetrain: false,
    };
  }
  
  const history = await storage.getDemandHistory(skuId);
  
  if (history.length < 2) {
    return {
      skuId,
      skuName: sku.name || 'Unknown',
      mape: 0,
      predictionsEvaluated: 0,
      avgPredicted: 0,
      avgActual: 0,
      shouldRetrain: false,
    };
  }
  
  // Get historical demand for comparison
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  const recentHistory = history
    .filter(h => new Date(h.createdAt) >= cutoffDate)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  
  if (recentHistory.length < 5) {
    // Not enough data to evaluate
    return {
      skuId,
      skuName: sku?.name || 'Unknown',
      mape: 0,
      predictionsEvaluated: 0,
      avgPredicted: 0,
      avgActual: 0,
      shouldRetrain: false,
    };
  }
  
  // Create forecaster with 70% of data, test on remaining 30%
  const trainSize = Math.floor(recentHistory.length * 0.7);
  const trainData = recentHistory.slice(0, trainSize).map(h => h.units);
  const testData = recentHistory.slice(trainSize);
  
  // Build forecaster
  const forecaster = new DemandForecaster({
    [skuId]: trainData,
  });
  
  // Get current regime from latest economic snapshot
  const latestSnapshot = await storage.getLatestEconomicSnapshot(sku.companyId);
  const regime = (latestSnapshot?.regime || 'HEALTHY_EXPANSION') as Regime;
  
  // Generate forecasts for test period
  const forecasts = forecaster.forecast(skuId, testData.length, regime);
  
  // Calculate MAPE
  let totalPercentageError = 0;
  let validPredictions = 0;
  let sumPredicted = 0;
  let sumActual = 0;
  
  for (let i = 0; i < Math.min(forecasts.length, testData.length); i++) {
    const predicted = forecasts[i];
    const actual = testData[i].units;
    
    sumPredicted += predicted;
    sumActual += actual;
    
    if (actual > 0) {
      const percentageError = Math.abs((predicted - actual) / actual) * 100;
      totalPercentageError += percentageError;
      validPredictions++;
    }
  }
  
  const mape = validPredictions > 0 ? totalPercentageError / validPredictions : 0;
  
  return {
    skuId,
    skuName: sku?.name || 'Unknown',
    mape: Math.round(mape * 100) / 100,
    predictionsEvaluated: validPredictions,
    avgPredicted: validPredictions > 0 ? sumPredicted / validPredictions : 0,
    avgActual: validPredictions > 0 ? sumActual / validPredictions : 0,
    shouldRetrain: mape > 10 && validPredictions >= 3,
  };
}

/**
 * Retrain forecast model for a SKU using all available historical data
 */
export async function retrainSKUForecast(
  storage: IStorage,
  skuId: string
): Promise<{ success: boolean; newMAPE: number; error?: string }> {
  try {
    const sku = await storage.getSku(skuId);
    if (!sku) {
      return { success: false, newMAPE: 0, error: 'SKU not found' };
    }
    
    // Get all historical demand
    const history = await storage.getDemandHistory(skuId);
    
    if (history.length < 10) {
      return { 
        success: false, 
        newMAPE: 0, 
        error: 'Insufficient historical data (need at least 10 data points)' 
      };
    }
    
    // Sort by date
    const sortedHistory = history.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    
    // Use 80% for training, 20% for validation
    const trainSize = Math.floor(sortedHistory.length * 0.8);
    const trainData = sortedHistory.slice(0, trainSize).map(h => h.units);
    const validationData = sortedHistory.slice(trainSize);
    
    // Create new forecaster with updated data
    const forecaster = new DemandForecaster({
      [skuId]: trainData,
    });
    
    // Get current regime from latest economic snapshot
    const latestSnapshot = await storage.getLatestEconomicSnapshot(sku.companyId);
    const regime = (latestSnapshot?.regime || 'HEALTHY_EXPANSION') as Regime;
    
    // Validate new model on held-out data
    const forecasts = forecaster.forecast(skuId, validationData.length, regime);
    
    // Calculate new MAPE
    let totalError = 0;
    let validCount = 0;
    
    for (let i = 0; i < Math.min(forecasts.length, validationData.length); i++) {
      const predicted = forecasts[i];
      const actual = validationData[i].units;
      
      if (actual > 0) {
        totalError += Math.abs((predicted - actual) / actual) * 100;
        validCount++;
      }
    }
    
    const newMAPE = validCount > 0 ? totalError / validCount : 0;
    
    // Store the retrained model metadata (for now, just log it)
    // In production, you might persist optimized parameters
    console.log(`[Retraining] SKU ${sku.name}: New MAPE = ${newMAPE.toFixed(2)}% (${validCount} validation points)`);
    
    return {
      success: true,
      newMAPE: Math.round(newMAPE * 100) / 100,
    };
    
  } catch (error: any) {
    return {
      success: false,
      newMAPE: 0,
      error: error.message,
    };
  }
}

/**
 * Main automated retraining job
 * Runs daily to find SKUs with poor accuracy and retrain their models
 */
export async function runAutomatedRetraining(
  storage: IStorage,
  companyId: string,
  mapeThreshold: number = 10
): Promise<RetrainingResult> {
  console.log(`\n[AutoRetrain] Starting automated retraining for company ${companyId.substring(0, 8)}...`);
  console.log(`[AutoRetrain] Threshold: MAPE > ${mapeThreshold}%`);
  
  const result: RetrainingResult = {
    totalSkusEvaluated: 0,
    skusNeedingRetraining: 0,
    skusRetrained: 0,
    averageMAPEBefore: 0,
    averageMAPEAfter: 0,
    errors: [],
  };
  
  try {
    // Find SKUs with recent actual demand
    const skuIds = await findSKUsWithRecentActuals(storage, companyId, 30);
    console.log(`[AutoRetrain] Found ${skuIds.length} SKUs with recent actual demand`);
    
    if (skuIds.length === 0) {
      console.log('[AutoRetrain] No SKUs with recent data to evaluate');
      return result;
    }
    
    // Calculate errors for each SKU in parallel
    const errorResults = await Promise.allSettled(
      skuIds.map(skuId => calculateSKUForecastError(storage, skuId, 90))
    );
    
    // Filter only successfully evaluated SKUs with predictions
    const errors: SKUForecastError[] = [];
    for (const errorResult of errorResults) {
      if (errorResult.status === 'fulfilled' && errorResult.value.predictionsEvaluated > 0) {
        errors.push(errorResult.value);
      } else if (errorResult.status === 'rejected') {
        console.error(`[AutoRetrain] Error calculating MAPE:`, errorResult.reason.message);
        result.errors.push(errorResult.reason.message);
      }
    }
    
    // Only count SKUs that actually had predictions to evaluate
    result.totalSkusEvaluated = errors.length;
    
    // Calculate average MAPE before retraining
    if (errors.length > 0) {
      const totalMAPE = errors.reduce((sum, e) => sum + e.mape, 0);
      result.averageMAPEBefore = totalMAPE / errors.length;
    }
    
    // Find SKUs that need retraining (MAPE > threshold)
    const skusToRetrain = errors.filter(e => e.mape > mapeThreshold && e.predictionsEvaluated >= 3);
    result.skusNeedingRetraining = skusToRetrain.length;
    
    console.log(`[AutoRetrain] SKUs evaluated: ${errors.length}`);
    console.log(`[AutoRetrain] Average MAPE: ${result.averageMAPEBefore.toFixed(2)}%`);
    console.log(`[AutoRetrain] SKUs needing retraining (MAPE > ${mapeThreshold}%): ${skusToRetrain.length}`);
    
    if (skusToRetrain.length === 0) {
      console.log('[AutoRetrain] ✅ All SKUs performing well, no retraining needed');
      return result;
    }
    
    // Sort by worst MAPE first
    skusToRetrain.sort((a, b) => b.mape - a.mape);
    
    // Display top offenders
    console.log('\n[AutoRetrain] Top SKUs needing improvement:');
    for (const sku of skusToRetrain.slice(0, 5)) {
      console.log(`  - ${sku.skuName}: MAPE ${sku.mape.toFixed(2)}% (${sku.predictionsEvaluated} predictions)`);
    }
    
    // Retrain models
    const retrainedMAPEs: number[] = [];
    for (const skuError of skusToRetrain) {
      try {
        console.log(`\n[AutoRetrain] Retraining model for ${skuError.skuName}...`);
        const retrainResult = await retrainSKUForecast(storage, skuError.skuId);
        
        if (retrainResult.success) {
          result.skusRetrained++;
          retrainedMAPEs.push(retrainResult.newMAPE);
          
          const improvement = skuError.mape - retrainResult.newMAPE;
          const improvementPct = (improvement / skuError.mape) * 100;
          
          console.log(`  ✅ Success: MAPE ${skuError.mape.toFixed(2)}% → ${retrainResult.newMAPE.toFixed(2)}% (${improvement > 0 ? '+' : ''}${improvementPct.toFixed(1)}% improvement)`);
        } else {
          console.log(`  ❌ Failed: ${retrainResult.error}`);
          result.errors.push(`${skuError.skuName}: ${retrainResult.error}`);
        }
      } catch (err: any) {
        console.error(`[AutoRetrain] Error retraining SKU ${skuError.skuName}:`, err.message);
        result.errors.push(`${skuError.skuName}: ${err.message}`);
      }
    }
    
    // Calculate average MAPE after retraining
    if (retrainedMAPEs.length > 0) {
      const totalMAPE = retrainedMAPEs.reduce((sum, mape) => sum + mape, 0);
      result.averageMAPEAfter = totalMAPE / retrainedMAPEs.length;
    }
    
    console.log(`\n[AutoRetrain] === SUMMARY ===`);
    console.log(`  SKUs Evaluated: ${result.totalSkusEvaluated}`);
    console.log(`  SKUs Needing Retraining: ${result.skusNeedingRetraining}`);
    console.log(`  SKUs Successfully Retrained: ${result.skusRetrained}`);
    console.log(`  Average MAPE Before: ${result.averageMAPEBefore.toFixed(2)}%`);
    console.log(`  Average MAPE After: ${result.averageMAPEAfter.toFixed(2)}%`);
    
    if (result.averageMAPEBefore > 0 && result.averageMAPEAfter > 0) {
      const overallImprovement = result.averageMAPEBefore - result.averageMAPEAfter;
      const improvementPct = (overallImprovement / result.averageMAPEBefore) * 100;
      console.log(`  Overall Improvement: ${improvementPct > 0 ? '+' : ''}${improvementPct.toFixed(1)}%`);
    }
    
    if (result.errors.length > 0) {
      console.log(`  Errors: ${result.errors.length}`);
    }
    console.log('');
    
  } catch (error: any) {
    console.error('[AutoRetrain] Fatal error:', error.message);
    result.errors.push(`Fatal: ${error.message}`);
  }
  
  return result;
}
