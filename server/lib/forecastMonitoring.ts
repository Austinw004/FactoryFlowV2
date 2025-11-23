import { db } from "@db";
import { sql, and, eq, asc, desc, gte } from "drizzle-orm";
import type { IStorage } from "../storage";
import type { InsertForecastAccuracyTracking, InsertForecastDegradationAlert } from "@shared/schema";
import { multiHorizonForecasts, forecastAccuracyTracking, forecastDegradationAlerts, skus } from "@shared/schema";

export interface MAPEMetrics {
  mape: number;
  mae: number;
  rmse: number;
  predictionsEvaluated: number;
  averageDemand: number;
  demandVolatility: number;
}

export interface DegradationCheck {
  hasDegradation: boolean;
  severity?: "low" | "medium" | "high" | "critical";
  degradationPercent?: number;
  recommendedAction?: string;
  details?: any;
}

export async function calculateMAPEForSKU(
  companyId: string,
  skuId: string,
  evaluationPeriodDays: number = 30
): Promise<MAPEMetrics | null> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - evaluationPeriodDays);

  const forecastsWithActuals = await db
    .select()
    .from(multiHorizonForecasts)
    .where(
      and(
        eq(multiHorizonForecasts.companyId, companyId),
        eq(multiHorizonForecasts.skuId, skuId),
        gte(multiHorizonForecasts.createdAt, cutoffDate),
        sql`${multiHorizonForecasts.actualDemand} IS NOT NULL AND ${multiHorizonForecasts.actualDemand} > 0`
      )
    );

  if (forecastsWithActuals.length === 0) {
    return null;
  }

  let sumAbsError = 0;
  let sumAbsPercentError = 0;
  let sumSquaredError = 0;
  let sumActual = 0;
  const actuals: number[] = [];

  for (const forecast of forecastsWithActuals) {
    const actual = forecast.actualDemand!;
    const predicted = forecast.predictedDemand;
    
    const absError = Math.abs(actual - predicted);
    const percentError = (absError / actual) * 100;
    
    sumAbsError += absError;
    sumAbsPercentError += percentError;
    sumSquaredError += Math.pow(actual - predicted, 2);
    sumActual += actual;
    actuals.push(actual);
  }

  const count = forecastsWithActuals.length;
  const mape = sumAbsPercentError / count;
  const mae = sumAbsError / count;
  const rmse = Math.sqrt(sumSquaredError / count);
  const averageDemand = sumActual / count;

  const stdDev = Math.sqrt(
    actuals.reduce((sum, val) => sum + Math.pow(val - averageDemand, 2), 0) / count
  );
  const demandVolatility = averageDemand > 0 ? (stdDev / averageDemand) * 100 : 0;

  return {
    mape,
    mae,
    rmse,
    predictionsEvaluated: count,
    averageDemand,
    demandVolatility
  };
}

export async function checkForDegradation(
  companyId: string,
  skuId: string,
  currentMAPE: number
): Promise<DegradationCheck> {
  const allTracking = await db
    .select()
    .from(forecastAccuracyTracking)
    .where(
      and(
        eq(forecastAccuracyTracking.companyId, companyId),
        eq(forecastAccuracyTracking.skuId, skuId)
      )
    )
    .orderBy(asc(forecastAccuracyTracking.measurementDate));

  if (allTracking.length === 0) {
    return { hasDegradation: false };
  }

  const baselineRecord = allTracking[0];
  const previousRecord = allTracking[allTracking.length - 1];
  
  const baselineMAPE = baselineRecord.mape;
  const previousMAPE = previousRecord.mape;
  
  if (!baselineMAPE || baselineMAPE === 0 || !previousMAPE || previousMAPE === 0) {
    return { hasDegradation: false };
  }

  const longTermDegradation = ((currentMAPE - baselineMAPE) / baselineMAPE) * 100;
  const shortTermDegradation = ((currentMAPE - previousMAPE) / previousMAPE) * 100;

  const degradationPercent = Math.max(longTermDegradation, shortTermDegradation);

  if (degradationPercent <= 10) {
    return { hasDegradation: false };
  }

  let severity: "low" | "medium" | "high" | "critical";
  let recommendedAction: string;

  if (degradationPercent > 50) {
    severity = "critical";
    recommendedAction = "retrain";
  } else if (degradationPercent > 30) {
    severity = "high";
    recommendedAction = "retrain";
  } else if (degradationPercent > 20) {
    severity = "medium";
    recommendedAction = "recalibrate";
  } else {
    severity = "low";
    recommendedAction = "monitor";
  }

  console.log(`[Degradation Check] SKU ${skuId}: Current=${currentMAPE.toFixed(2)}%, Baseline=${baselineMAPE.toFixed(2)}%, Previous=${previousMAPE.toFixed(2)}%, LongTerm=${longTermDegradation.toFixed(1)}%, ShortTerm=${shortTermDegradation.toFixed(1)}%`);

  return {
    hasDegradation: true,
    degradationPercent,
    severity,
    recommendedAction,
    details: {
      currentMAPE,
      previousMAPE,
      baselineMAPE,
      longTermDegradation,
      shortTermDegradation
    }
  };
}

export async function trackMAPEForSKU(
  storage: IStorage,
  companyId: string,
  skuId: string,
  evaluationPeriodDays: number = 30
): Promise<void> {
  const metrics = await calculateMAPEForSKU(companyId, skuId, evaluationPeriodDays);
  
  if (!metrics) {
    return;
  }

  const currentSnapshot = await storage.getLatestEconomicSnapshot(companyId);
  const latestTracking = await storage.getLatestForecastAccuracyBySKU(companyId, skuId);
  
  const baselineMAPE = latestTracking?.baselineMAPE || metrics.mape;
  const previousMAPE = latestTracking?.mape;
  
  let mapeTrend: "improving" | "degrading" | "stable" = "stable";
  let trendChangePercent = 0;
  let improvementVsBaseline = 0;

  if (previousMAPE) {
    trendChangePercent = ((metrics.mape - previousMAPE) / previousMAPE) * 100;
    if (trendChangePercent < -5) {
      mapeTrend = "improving";
    } else if (trendChangePercent > 5) {
      mapeTrend = "degrading";
    }
  }

  if (baselineMAPE) {
    improvementVsBaseline = ((baselineMAPE - metrics.mape) / baselineMAPE) * 100;
  }

  const degradationCheck = await checkForDegradation(companyId, skuId, metrics.mape);

  if (degradationCheck.hasDegradation) {
    await createDegradationAlert(storage, companyId, skuId, metrics.mape, degradationCheck, baselineMAPE, previousMAPE);
  }

  const trackingData: InsertForecastAccuracyTracking = {
    companyId,
    skuId,
    evaluationPeriodDays,
    mape: metrics.mape,
    mae: metrics.mae,
    rmse: metrics.rmse,
    predictionsEvaluated: metrics.predictionsEvaluated,
    mapeTrend,
    trendChangePercent,
    baselineMAPE,
    improvementVsBaseline,
    economicRegime: currentSnapshot?.regime || null,
    averageDemand: metrics.averageDemand,
    demandVolatility: metrics.demandVolatility
  };

  await storage.createForecastAccuracyTracking(trackingData);
}

async function createDegradationAlert(
  storage: IStorage,
  companyId: string,
  skuId: string,
  currentMAPE: number,
  degradationCheck: DegradationCheck,
  baselineMAPE?: number | null,
  previousMAPE?: number | null
): Promise<void> {
  const existingAlerts = await storage.getForecastDegradationAlerts(companyId, {
    skuId,
    resolved: false
  });

  const sku = await storage.getSku(skuId);
  const alertMessage = `Forecast accuracy for "${sku?.name}" has degraded by ${degradationCheck.degradationPercent?.toFixed(1)}%. Current MAPE: ${currentMAPE.toFixed(2)}%`;

  let alert;
  
  if (existingAlerts.length > 0) {
    const existingAlert = existingAlerts[0];
    alert = await storage.updateForecastAlert(existingAlert.id, {
      severity: degradationCheck.severity!,
      currentMAPE,
      degradationPercent: degradationCheck.degradationPercent || null,
      recommendedAction: degradationCheck.recommendedAction!,
      message: alertMessage,
      details: degradationCheck.details
    });
    console.log(`[Forecast Alert] Updated ${degradationCheck.severity} alert for SKU ${skuId}: ${alertMessage}`);
  } else {
    const alertData: InsertForecastDegradationAlert = {
      companyId,
      skuId,
      alertType: "degradation",
      severity: degradationCheck.severity!,
      currentMAPE,
      previousMAPE: previousMAPE || null,
      baselineMAPE: baselineMAPE || null,
      degradationPercent: degradationCheck.degradationPercent || null,
      thresholdType: "relative",
      thresholdValue: 20,
      recommendedAction: degradationCheck.recommendedAction!,
      message: alertMessage,
      details: degradationCheck.details
    };

    alert = await storage.createForecastDegradationAlert(alertData);
    console.log(`[Forecast Alert] Created ${degradationCheck.severity} alert for SKU ${skuId}: ${alertMessage}`);
  }
  
  if (degradationCheck.severity === 'high' || degradationCheck.severity === 'critical') {
    console.log(`[Auto Recalibration] Triggering automatic retraining for SKU ${skuId} due to ${degradationCheck.severity} degradation`);
    
    const { runAutomatedRetraining } = await import('./forecastRetraining');
    try {
      await runAutomatedRetraining(storage, companyId, 1, skuId);
      
      const newMetrics = await calculateMAPEForSKU(companyId, skuId, 30);
      if (newMetrics && newMetrics.mape < currentMAPE) {
        await storage.resolveForecastAlert(alert.id, 'retrained', 'system');
        console.log(`[Auto Recalibration] Successfully retrained SKU ${skuId} - MAPE improved: ${currentMAPE.toFixed(2)}% → ${newMetrics.mape.toFixed(2)}%`);
      } else {
        console.log(`[Auto Recalibration] Retraining completed for SKU ${skuId} but MAPE did not improve - alert remains open`);
      }
    } catch (error) {
      console.error(`[Auto Recalibration] Failed to retrain SKU ${skuId}:`, error);
    }
  }
}

export async function trackAllSKUs(storage: IStorage, companyId: string): Promise<void> {
  const allSKUs = await storage.getSkus(companyId);
  
  console.log(`[Forecast Monitoring] Tracking MAPE for ${allSKUs.length} SKUs in company ${companyId}`);
  
  const results = await Promise.allSettled(
    allSKUs.map(sku => trackMAPEForSKU(storage, companyId, sku.id))
  );

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  console.log(`[Forecast Monitoring] Completed: ${succeeded} succeeded, ${failed} failed`);
}

export async function triggerAutoRecalibration(
  storage: IStorage,
  companyId: string,
  skuId: string
): Promise<void> {
  console.log(`[Auto Recalibration] Triggering recalibration for SKU ${skuId}`);
  
  await trackMAPEForSKU(storage, companyId, skuId, 30);
}
