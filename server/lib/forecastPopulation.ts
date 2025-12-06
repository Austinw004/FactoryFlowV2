import { db } from "../db";
import { multiHorizonForecasts, economicSnapshots, demandHistory } from "@shared/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import type { IStorage } from "../storage";
import { DemandForecaster } from "./forecasting";
import type { Regime } from "./economics";

/**
 * Multi-Horizon Forecast Population Service
 * 
 * Generates short (7-day), medium (30-day), and long (90-day) term forecasts
 * for all SKUs, incorporating economic regime factors
 */

interface ForecastPopulationResult {
  skusProcessed: number;
  forecastsCreated: number;
  horizonsGenerated: number[];
  regime: string;
  avgConfidence: number;
}

const FORECAST_HORIZONS = [7, 14, 30, 60, 90]; // Days ahead

export class ForecastPopulationService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Generate multi-horizon forecasts for all SKUs of a company
   */
  async populateForecasts(companyId: string): Promise<ForecastPopulationResult> {
    console.log(`[Forecasts] Generating multi-horizon forecasts for company ${companyId}`);

    const skus = await this.storage.getSkus(companyId);
    
    if (skus.length === 0) {
      console.log("[Forecasts] No SKUs found for company");
      return {
        skusProcessed: 0,
        forecastsCreated: 0,
        horizonsGenerated: [],
        regime: "UNKNOWN",
        avgConfidence: 0,
      };
    }

    const latestSnapshot = await db
      .select()
      .from(economicSnapshots)
      .where(eq(economicSnapshots.companyId, companyId))
      .orderBy(desc(economicSnapshots.createdAt))
      .limit(1);

    const currentRegime = (latestSnapshot[0]?.regime || "HEALTHY_EXPANSION") as Regime;
    const currentFdr = latestSnapshot[0]?.fdr || 1.0;

    console.log(`[Forecasts] Current regime: ${currentRegime}, FDR: ${currentFdr}`);

    const historyBySku: Record<string, number[]> = {};
    for (const sku of skus) {
      const history = await this.storage.getDemandHistory(sku.id);
      if (history.length > 0) {
        historyBySku[sku.id] = history.slice(-90).map(h => h.units);
      } else {
        historyBySku[sku.id] = this.generateSyntheticHistory(100);
      }
    }

    const forecaster = new DemandForecaster(historyBySku);

    let totalForecasts = 0;
    let totalConfidence = 0;
    const now = new Date();

    for (const sku of skus) {
      for (const horizonDays of FORECAST_HORIZONS) {
        const forecastMonths = Math.ceil(horizonDays / 30);
        const forecastResult = forecaster.forecastWithConfidence(sku.id, forecastMonths, currentRegime);
        
        const forecastDate = new Date(now);
        forecastDate.setDate(forecastDate.getDate() + horizonDays);
        
        const predictedDemand = forecastResult.forecasts[0] || 100;
        const lowerBound = forecastResult.lowerBounds[0] || predictedDemand * 0.85;
        const upperBound = forecastResult.upperBounds[0] || predictedDemand * 1.15;
        const confidence = forecastResult.confidence || 0.85;

        const signalStrength = confidence > 0.85 ? "strong" : confidence > 0.7 ? "moderate" : "weak";
        const volatility = this.calculateVolatility(historyBySku[sku.id] || []);
        const trend = this.calculateTrend(historyBySku[sku.id] || []);
        const seasonality = this.detectSeasonality(historyBySku[sku.id] || []);

        try {
          await db.insert(multiHorizonForecasts).values({
            companyId,
            skuId: sku.id,
            forecastDate: forecastDate.toISOString(),
            horizonDays,
            predictedDemand: Math.round(predictedDemand),
            lowerBound: Math.round(lowerBound),
            upperBound: Math.round(upperBound),
            confidence,
            mlModel: "exponential_smoothing_regime_aware",
            economicRegime: currentRegime,
            fdrAtForecast: currentFdr,
            signalStrength,
            volatility,
            seasonality,
            trend,
            externalFactors: {
              regime: currentRegime,
              fdr: currentFdr,
              regimeFactor: forecastResult.regimeFactor,
            },
          });
          totalForecasts++;
          totalConfidence += confidence;
        } catch (error) {
        }
      }
    }

    const avgConfidence = totalForecasts > 0 ? totalConfidence / totalForecasts : 0;

    console.log(`[Forecasts] Generated ${totalForecasts} forecasts for ${skus.length} SKUs`);

    return {
      skusProcessed: skus.length,
      forecastsCreated: totalForecasts,
      horizonsGenerated: FORECAST_HORIZONS,
      regime: currentRegime,
      avgConfidence,
    };
  }

  private generateSyntheticHistory(baseDemand: number): number[] {
    const history: number[] = [];
    for (let i = 0; i < 90; i++) {
      const seasonalFactor = 1 + 0.1 * Math.sin((i / 30) * Math.PI);
      const noise = (Math.random() - 0.5) * 0.2;
      const trend = 1 + (i / 180) * 0.1;
      history.push(Math.round(baseDemand * seasonalFactor * trend * (1 + noise)));
    }
    return history;
  }

  private calculateVolatility(history: number[]): number {
    if (history.length < 2) return 0;
    const mean = history.reduce((a, b) => a + b, 0) / history.length;
    const variance = history.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / history.length;
    const stdDev = Math.sqrt(variance);
    return Math.round((stdDev / mean) * 100 * 10) / 10;
  }

  private calculateTrend(history: number[]): number {
    if (history.length < 2) return 0;
    const firstHalf = history.slice(0, Math.floor(history.length / 2));
    const secondHalf = history.slice(Math.floor(history.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    if (firstAvg === 0) return 0;
    return Math.round(((secondAvg - firstAvg) / firstAvg) * 100 * 10) / 10;
  }

  private detectSeasonality(history: number[]): number {
    if (history.length < 7) return 0;
    
    const weekly = [];
    for (let i = 0; i < Math.min(4, Math.floor(history.length / 7)); i++) {
      const weekData = history.slice(i * 7, (i + 1) * 7);
      weekly.push(weekData.reduce((a, b) => a + b, 0) / weekData.length);
    }
    
    if (weekly.length < 2) return 0;
    
    const weeklyMean = weekly.reduce((a, b) => a + b, 0) / weekly.length;
    const weeklyVariance = weekly.reduce((sum, val) => sum + Math.pow(val - weeklyMean, 2), 0) / weekly.length;
    const seasonalityScore = Math.sqrt(weeklyVariance) / weeklyMean;
    
    return Math.round(Math.min(1, seasonalityScore * 5) * 100) / 100;
  }
}

export function createForecastPopulationService(storage: IStorage): ForecastPopulationService {
  return new ForecastPopulationService(storage);
}
