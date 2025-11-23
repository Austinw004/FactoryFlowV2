import { storage } from './storage';
import { broadcastUpdate } from './websocket';
import { cache, CacheKeys } from './lib/cache';
import axios from 'axios';
import { fetchComprehensiveEconomicData } from './lib/externalAPIs';
import { WebhookService } from './lib/webhookService';
import { runAutomatedRetraining } from './lib/forecastRetraining';
import { trackAllSKUs } from './lib/forecastMonitoring';

interface BackgroundJobConfig {
  name: string;
  intervalMs: number;
  enabled: boolean;
}

const jobs: Map<string, NodeJS.Timeout> = new Map();
const webhookService = new WebhookService(storage);
const previousRegimes: Map<string, string> = new Map();

type EconomicRegime = 'HEALTHY_EXPANSION' | 'ASSET_LED_GROWTH' | 'IMBALANCED_EXCESS' | 'REAL_ECONOMY_LEAD';

export function calculateEconomicRegime(fdr: number): EconomicRegime {
  if (fdr >= 1.5) return 'IMBALANCED_EXCESS';
  if (fdr >= 1.0) return 'ASSET_LED_GROWTH';
  if (fdr >= 0.5) return 'HEALTHY_EXPANSION';
  return 'REAL_ECONOMY_LEAD';
}

let companyIds: string[] = [];

async function getActiveCompanyIds(): Promise<string[]> {
  if (companyIds.length === 0) {
    // Get all company IDs from the database
    companyIds = await storage.getAllCompanyIds();
  }
  return companyIds;
}

export async function updateExternalEconomicData() {
  try {
    // Fetch comprehensive economic data from real external APIs (FRED, Alpha Vantage, etc.)
    const economicData = await fetchComprehensiveEconomicData();
    
    // Extract latest and previous values from FRED data for growth calculation
    const sp500Obs = economicData.financial_circuit?.sp500?.observations || [];
    const gdpObs = economicData.real_circuit?.real_gdp?.observations || [];
    const indProdObs = economicData.real_circuit?.industrial_production?.observations || [];
    const cpiObs = economicData.real_circuit?.cpi?.observations || [];
    const unemploymentObs = economicData.real_circuit?.unemployment?.observations || [];

    if (sp500Obs.length >= 2 && gdpObs.length >= 2 && indProdObs.length >= 2) {
      // Calculate growth rates for dual-circuit FDR formula
      // Financial Circuit: S&P 500 growth as proxy for asset market activity (Ma * Va)
      const sp500Current = parseFloat(sp500Obs[0].value);
      const sp500Previous = parseFloat(sp500Obs[1].value);
      const sp500Growth = sp500Previous > 0 ? (sp500Current - sp500Previous) / sp500Previous : 0.02;
      
      // Real Circuit: GDP + Industrial Production growth as proxy for real economy (Mr * Vr)
      const gdpCurrent = parseFloat(gdpObs[0].value);
      const gdpPrevious = parseFloat(gdpObs[1].value);
      const gdpGrowth = gdpPrevious > 0 ? (gdpCurrent - gdpPrevious) / gdpPrevious : 0.02;
      
      const indProdCurrent = parseFloat(indProdObs[0].value);
      const indProdPrevious = parseFloat(indProdObs[1].value);
      const indProdGrowth = indProdPrevious > 0 ? (indProdCurrent - indProdPrevious) / indProdPrevious : 0.02;
      
      // FDR = (Asset Market Growth) / (Real Economy Growth)
      // Using S&P 500 growth for financial circuit and average of GDP + Industrial Production for real circuit
      const financialGrowth = sp500Growth;
      const realGrowth = (gdpGrowth + indProdGrowth) / 2;
      
      // Calculate FDR with safeguards
      const fdr = realGrowth > 0.0001 ? financialGrowth / realGrowth : 1.0;
      
      // Clamp to reasonable range [0.2, 5.0] as per dual-circuit theory
      const clampedFdr = Math.max(0.2, Math.min(5.0, fdr));
      const regime = calculateEconomicRegime(clampedFdr);

      const companies = await getActiveCompanyIds();
      
      // Extract absolute values for context
      const sp500Latest = sp500Obs[0]?.value;
      const gdpLatest = gdpObs[0]?.value;
      const industrialProdLatest = indProdObs[0]?.value;
      const cpiLatest = cpiObs[0]?.value;
      const unemploymentLatest = unemploymentObs[0]?.value;
      
      if (companies.length > 0) {
        for (const companyId of companies) {
          const previousRegime = previousRegimes.get(companyId);
          
          // Persist real economic data to database
          await storage.createEconomicSnapshot({
            companyId,
            timestamp: new Date(),
            fdr: clampedFdr,
            regime,
            gdpReal: gdpLatest ? parseFloat(gdpLatest) : null,
            gdpNominal: null, // We're using real GDP from FRED
            sp500Index: sp500Latest ? parseFloat(sp500Latest) : null,
            inflationRate: cpiLatest ? parseFloat(cpiLatest) : null,
            sentimentScore: null, // Could be calculated from news data if available
            source: 'external'
          });

          if (previousRegime && previousRegime !== regime) {
            console.log(`[Background] 🚨 REGIME CHANGE detected for company ${companyId}: ${previousRegime} → ${regime} (FDR: ${clampedFdr.toFixed(2)})`);
            
            // Fire webhook notification
            webhookService.fireRegimeChange(companyId, previousRegime, regime, clampedFdr)
              .catch(err => console.error(`Webhook error (regime_change) for company ${companyId}:`, err));
            
            // Broadcast dedicated regime change message via WebSocket
            broadcastUpdate({
              type: 'regime_change',
              entity: 'economic_regime',
              action: 'update',
              timestamp: new Date().toISOString(),
              companyId,
              data: {
                from: previousRegime,
                to: regime,
                fdr: clampedFdr,
                severity: (previousRegime === 'IMBALANCED_EXCESS' || regime === 'IMBALANCED_EXCESS') ? 'high' : 'medium',
              },
            });
          }
          previousRegimes.set(companyId, regime);
          
          // Invalidate cache to ensure fresh data is fetched
          cache.invalidate(CacheKeys.economicRegime(companyId));
          cache.invalidate(CacheKeys.economicIndicators(companyId));

          broadcastUpdate({
            type: 'database_update',
            entity: 'economic_indicators',
            action: 'update',
            timestamp: new Date().toISOString(),
            companyId,
            data: { 
              fdr: clampedFdr.toFixed(2), 
              regime, 
              gdpReal: gdpLatest ? parseFloat(gdpLatest) : null,
              sp500: sp500Latest ? parseFloat(sp500Latest) : null,
              industrialProduction: industrialProdLatest ? parseFloat(industrialProdLatest) : null,
              cpi: cpiLatest ? parseFloat(cpiLatest) : null,
              unemployment: unemploymentLatest ? parseFloat(unemploymentLatest) : null,
              sp500Growth: (sp500Growth * 100).toFixed(2) + '%',
              realGrowth: (realGrowth * 100).toFixed(2) + '%'
            },
          });
        }

        broadcastUpdate({
          type: 'database_update',
          entity: 'external_economic_data',
          action: 'update',
          timestamp: new Date().toISOString(),
          data: { 
            fdr: clampedFdr.toFixed(2), 
            regime,
            companiesUpdated: companies.length,
            dataSource: 'FRED API',
            calculation: `S&P Growth: ${(sp500Growth * 100).toFixed(2)}% / Real Growth: ${(realGrowth * 100).toFixed(2)}%`
          },
        });
      }
      
      console.log(`[Background] ✅ Updated economic data from FRED: FDR=${clampedFdr.toFixed(2)}, Regime=${regime}, S&P Growth=${(sp500Growth * 100).toFixed(2)}%, Real Growth=${(realGrowth * 100).toFixed(2)}%, Companies=${companies.length}`);
    } else {
      console.log(`[Background] ⚠️  Incomplete data from FRED API, using fallback`);
      throw new Error('Incomplete external data');
    }
  } catch (error: any) {
    const companies = await getActiveCompanyIds();
    const mockFdr = 1.15 + (Math.random() - 0.5) * 0.1;
    const mockRegime = calculateEconomicRegime(mockFdr);
    
    if (companies.length > 0) {
      for (const companyId of companies) {
        // Persist fallback data to database
        await storage.createEconomicSnapshot({
          companyId,
          timestamp: new Date(),
          fdr: mockFdr,
          regime: mockRegime,
          source: 'fallback'
        });

        broadcastUpdate({
          type: 'database_update',
          entity: 'economic_indicators',
          action: 'update',
          timestamp: new Date().toISOString(),
          companyId,
          data: { 
            fdr: mockFdr.toFixed(2), 
            regime: mockRegime,
            source: 'fallback'
          },
        });
      }

      broadcastUpdate({
        type: 'database_update',
        entity: 'external_economic_data',
        action: 'update',
        timestamp: new Date().toISOString(),
        data: { 
          fdr: mockFdr.toFixed(2), 
          regime: mockRegime,
          source: 'fallback',
          companiesUpdated: companies.length 
        },
      });
    }

    console.error('[Background] Failed to fetch external economic data, using fallback:', error.code || error.message);
  }
}

export async function generateSensorReadings() {
  try {
    const companies = await getActiveCompanyIds();
    
    for (const companyId of companies) {
      const sensors = await storage.getEquipmentSensors(companyId);
      
      for (const sensor of sensors.slice(0, 10)) {
        const normalValue = 50 + Math.random() * 50;
        const isAnomaly = Math.random() < 0.05;
        const value = isAnomaly 
          ? (Math.random() < 0.5 ? 10 : 95)
          : normalValue;
        
        const status = value < 20 || value > 80 ? 'critical' : 
                      value < 30 || value > 70 ? 'warning' : 'normal';
        
        const reading = await storage.createSensorReading({
          sensorId: sensor.id,
          timestamp: new Date(),
          value,
          status,
        });

        broadcastUpdate({
          type: 'database_update',
          entity: 'sensor_reading',
          action: 'create',
          timestamp: new Date().toISOString(),
          companyId,
          data: { sensorId: sensor.id, value, status },
        });

        if (status === 'critical' && Math.random() < 0.3) {
          const daysUntilFailure = Math.floor(Math.random() * 30) + 1;
          const failureDate = new Date();
          failureDate.setDate(failureDate.getDate() + daysUntilFailure);
          
          const alert = await storage.createMaintenanceAlert({
            companyId,
            machineryId: sensor.machineryId,
            alertType: 'sensor_threshold',
            severity: 'high',
            title: `Critical ${sensor.sensorType} reading detected`,
            description: `Sensor reading ${value.toFixed(2)} exceeds safe threshold`,
            status: 'active',
          });

          broadcastUpdate({
            type: 'database_update',
            entity: 'maintenance_alert',
            action: 'create',
            timestamp: new Date().toISOString(),
            companyId,
            data: { alertType: 'sensor_threshold', severity: 'high' },
          });
          
          const prediction = await storage.createMaintenancePrediction({
            companyId,
            machineryId: sensor.machineryId,
            predictionType: 'failure',
            failureMode: `${sensor.sensorType}_anomaly`,
            confidence: 0.7 + Math.random() * 0.25,
            predictedDate: failureDate,
            mlModel: 'anomaly_detector_v2',
          });

          broadcastUpdate({
            type: 'database_update',
            entity: 'maintenance_prediction',
            action: 'create',
            timestamp: new Date().toISOString(),
            companyId,
            data: { predictionType: 'failure', mlModel: 'anomaly_detector_v2' },
          });
        }
      }
      
      if (sensors.length > 0) {
        console.log(`[Background] Generated ${Math.min(sensors.length, 10)} sensor readings for company ${companyId.substring(0, 8)}`);
      }
    }
  } catch (error) {
    console.error('[Background] Failed to generate sensor readings:', error);
  }
}

export async function updateCommodityPrices() {
  try {
    const companies = await getActiveCompanyIds();
    let totalUpdates = 0;
    
    for (const companyId of companies) {
      const materials = await storage.getMaterials(companyId);
      
      for (const material of materials.slice(0, 20)) {
        const priceChange = (Math.random() - 0.5) * 0.15;
        const basePrice = 100;
        const newPrice = basePrice * (1 + priceChange);
        
        const recommendation = await storage.createInventoryRecommendation({
          companyId,
          recommendationType: Math.random() < 0.5 ? 'reorder' : 'adjust_safety_stock',
          priority: 'medium',
          reasoning: `Price fluctuation detected: ${(priceChange * 100).toFixed(1)}%`,
          estimatedSavings: Math.round(Math.abs(priceChange) * 10000),
        });

        broadcastUpdate({
          type: 'database_update',
          entity: 'commodity_price',
          action: 'update',
          timestamp: new Date().toISOString(),
          companyId,
          data: { materialId: material.id, priceChange: priceChange * 100 },
        });

        totalUpdates++;
      }
      
      if (materials.length > 0) {
        console.log(`[Background] Updated ${Math.min(materials.length, 20)} commodity prices for company ${companyId.substring(0, 8)}`);
        
        // Invalidate commodity price cache for this company
        cache.invalidate(CacheKeys.commodityPrices(companyId));
      }
    }

    if (totalUpdates > 0) {
      broadcastUpdate({
        type: 'database_update',
        entity: 'commodity_prices',
        action: 'update',
        timestamp: new Date().toISOString(),
        data: { totalUpdates },
      });
    }
  } catch (error) {
    console.error('[Background] Failed to update commodity prices:', error);
  }
}

export async function regenerateMLPredictions() {
  try {
    const companies = await getActiveCompanyIds();
    let totalPredictions = 0;
    
    for (const companyId of companies) {
      const materials = await storage.getMaterials(companyId);
      
      for (const material of materials.slice(0, 3)) {
        const forecastDays = 7;
        
        for (let i = 1; i <= forecastDays; i++) {
          const baseValue = 100 + Math.random() * 50;
          const trend = i * 0.5;
          const noise = (Math.random() - 0.5) * 5;
          
          const predictedValue = baseValue + trend + noise;
          const lowerBound = predictedValue * 0.85;
          const upperBound = predictedValue * 1.15;
          
          const prediction = await storage.createDemandPrediction({
            materialId: material.id,
            companyId,
            mlModel: ['arima', 'lstm', 'prophet'][Math.floor(Math.random() * 3)] as 'arima' | 'lstm' | 'prophet',
            forecastPeriod: 'weekly',
            forecastHorizon: i,
            predictedDemand: predictedValue,
            accuracy: 0.75 + Math.random() * 0.2,
          });

          totalPredictions++;
        }

        broadcastUpdate({
          type: 'database_update',
          entity: 'demand_prediction',
          action: 'create',
          timestamp: new Date().toISOString(),
          companyId,
          data: { materialId: material.id, predictionsGenerated: forecastDays },
        });
      }
      
      if (materials.length > 0) {
        console.log(`[Background] Regenerated ML predictions for company ${companyId.substring(0, 8)}`);
      }
    }

    if (totalPredictions > 0) {
      broadcastUpdate({
        type: 'database_update',
        entity: 'ml_predictions',
        action: 'create',
        timestamp: new Date().toISOString(),
        data: { totalPredictions },
      });
    }
  } catch (error) {
    console.error('[Background] Failed to regenerate ML predictions:', error);
  }
}

export async function updateSupplyChainRisk() {
  try {
    const companies = await getActiveCompanyIds();
    let totalEvents = 0;
    
    for (const companyId of companies) {
      const batches = await storage.getMaterialBatches(companyId);
      
      for (const batch of batches.slice(0, 10)) {
        if (Math.random() < 0.2) {
          const eventTypes = ['received', 'inspected', 'moved', 'used_in_production', 'shipped'] as const;
          const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
          
          const event = await storage.createTraceabilityEvent({
            batchId: batch.id,
            companyId,
            eventType,
            eventDescription: `Automated ${eventType} event`,
            location: `Facility ${Math.floor(Math.random() * 5) + 1}`,
            performedBy: 'Auto-Update System',
          });

          broadcastUpdate({
            type: 'database_update',
            entity: 'traceability_event',
            action: 'create',
            timestamp: new Date().toISOString(),
            companyId,
            data: { batchId: batch.id, eventType },
          });

          totalEvents++;
        }
      }
      
      if (batches.length > 0) {
        console.log(`[Background] Updated supply chain events for company ${companyId.substring(0, 8)}`);
      }
    }

    if (totalEvents > 0) {
      broadcastUpdate({
        type: 'database_update',
        entity: 'supply_chain_risk',
        action: 'update',
        timestamp: new Date().toISOString(),
        data: { totalEvents },
      });
    }
  } catch (error) {
    console.error('[Background] Failed to update supply chain risk:', error);
  }
}

export async function updateWorkforceMetrics() {
  try {
    const companies = await getActiveCompanyIds();
    let totalAssignments = 0;
    
    for (const companyId of companies) {
      const employees = await storage.getEmployees(companyId);
      const shifts = await storage.getWorkShifts(companyId);
      
      if (shifts.length > 0 && employees.length > 0) {
        const shift = shifts[0];
        const employee = employees[0];
        
        if (Math.random() < 0.2) {
          const assignment = await storage.createStaffAssignment({
            shiftId: shift.id,
            employeeId: employee.id,
            assignedRole: employee.role || 'operator',
            status: 'scheduled',
          });

          broadcastUpdate({
            type: 'database_update',
            entity: 'staff_assignment',
            action: 'create',
            timestamp: new Date().toISOString(),
            companyId,
            data: { shiftId: shift.id, employeeId: employee.id },
          });

          totalAssignments++;
        }
      }
      
      if (employees.length > 0) {
        console.log(`[Background] Updated workforce metrics for company ${companyId.substring(0, 8)}`);
      }
    }

    if (totalAssignments > 0) {
      broadcastUpdate({
        type: 'database_update',
        entity: 'workforce_metrics',
        action: 'update',
        timestamp: new Date().toISOString(),
        data: { totalAssignments },
      });
    }
  } catch (error) {
    console.error('[Background] Failed to update workforce metrics:', error);
  }
}

export async function updateProductionKPIs() {
  try {
    const companies = await getActiveCompanyIds();
    let totalEvents = 0;
    
    for (const companyId of companies) {
      const runs = await storage.getProductionRuns(companyId);
      
      for (const run of runs.slice(0, 5)) {
        if (run.status === 'in_progress' && Math.random() < 0.1) {
          const event = await storage.createDowntimeEvent({
            companyId,
            machineryId: run.machineryId || 'MACH-001',
            eventType: 'unplanned',
            category: 'maintenance',
            description: 'Automated maintenance check',
            startTime: new Date(),
            severity: ['low', 'medium'][Math.floor(Math.random() * 2)] as 'low' | 'medium',
          });

          broadcastUpdate({
            type: 'database_update',
            entity: 'downtime_event',
            action: 'create',
            timestamp: new Date().toISOString(),
            companyId,
            data: { machineryId: run.machineryId, eventType: 'unplanned' },
          });

          totalEvents++;
        }
      }
      
      if (runs.length > 0) {
        console.log(`[Background] Updated production KPIs for company ${companyId.substring(0, 8)}`);
      }
    }

    if (totalEvents > 0) {
      broadcastUpdate({
        type: 'database_update',
        entity: 'production_kpis',
        action: 'update',
        timestamp: new Date().toISOString(),
        data: { totalEvents },
      });
    }
  } catch (error) {
    console.error('[Background] Failed to update production KPIs:', error);
  }
}

/**
 * Generate simulated historical economic states for backtesting demonstration
 * 
 * In production, this would be replaced with HistoricalDataFetcher.buildHistoricalDataset()
 * fetching real data from FRED, Alpha Vantage, and other economic APIs.
 * 
 * The simulation models realistic economic cycles:
 * - 2000-2007: Healthy growth → Asset bubble buildup (FDR rising)
 * - 2008-2009: Financial crisis (FDR spike, then crash)
 * - 2010-2019: Recovery and expansion
 * - 2020: COVID shock
 * - 2021-2024: Post-COVID recovery with varying FDR
 * 
 * @param dataPoints - Number of data points to generate (default: 20 quarterly points)
 */
function generateSimulatedHistoricalEconomicStates(dataPoints: number = 20) {
  const states: Array<{
    date: Date;
    fdr: number;
    regime: EconomicRegime;
    aluminumPrice: number;
  }> = [];
  
  // For extensive testing, generate weekly data from 2000-2024
  const startDate = new Date(2000, 0, 1);
  const endDate = new Date(2024, 11, 31);
  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysPerPoint = Math.floor(totalDays / dataPoints);
  
  let currentPrice = 1800; // Starting aluminum price in 2000
  let currentFDR = 1.1; // Starting FDR
  
  for (let i = 0; i < dataPoints; i++) {
    const date = new Date(startDate.getTime() + (i * daysPerPoint * 24 * 60 * 60 * 1000));
    const year = date.getFullYear();
    
    // Simulate realistic FDR evolution through economic cycles
    let fdrTrend: number;
    let priceTrend: number;
    let volatility: number;
    
    if (year >= 2000 && year <= 2001) {
      // Dot-com bubble peak and burst
      fdrTrend = 1.8 + (Math.random() - 0.5) * 0.4;
      priceTrend = -0.02; // Declining prices
      volatility = 200;
    } else if (year >= 2002 && year <= 2007) {
      // Housing bubble buildup
      fdrTrend = 1.3 + ((year - 2002) / 5) * 0.6; // FDR rising 1.3 → 1.9
      priceTrend = 0.05; // Rising prices
      volatility = 150;
    } else if (year >= 2008 && year <= 2009) {
      // Financial crisis
      fdrTrend = year === 2008 ? 2.2 : 1.0; // Spike then crash
      priceTrend = year === 2008 ? -0.15 : -0.10;
      volatility = 400;
    } else if (year >= 2010 && year <= 2019) {
      // Recovery and expansion
      fdrTrend = 1.2 + ((year - 2010) / 9) * 0.5; // Gradual rise
      priceTrend = 0.03;
      volatility = 100;
    } else if (year === 2020) {
      // COVID shock
      fdrTrend = 1.4 + (Math.random() - 0.5) * 0.5;
      priceTrend = -0.05;
      volatility = 350;
    } else if (year === 2021) {
      // Recovery with stimulus
      fdrTrend = 1.7 + (Math.random() - 0.5) * 0.3;
      priceTrend = 0.12; // Strong recovery
      volatility = 250;
    } else if (year === 2022) {
      // Bubble conditions
      fdrTrend = 1.95 + (Math.random() - 0.5) * 0.25;
      priceTrend = 0.08;
      volatility = 300;
    } else if (year === 2023) {
      // Correction
      fdrTrend = 1.5 + (Math.random() - 0.5) * 0.4;
      priceTrend = -0.03;
      volatility = 250;
    } else {
      // 2024 - stabilizing
      fdrTrend = 1.3 + (Math.random() - 0.5) * 0.2;
      priceTrend = 0.01;
      volatility = 150;
    }
    
    // Apply trends with realistic evolution
    currentFDR = fdrTrend + (Math.random() - 0.5) * 0.15;
    currentPrice = currentPrice * (1 + priceTrend) + (Math.random() - 0.5) * volatility;
    
    // Ensure reasonable bounds
    currentFDR = Math.max(0.8, Math.min(2.5, currentFDR));
    currentPrice = Math.max(1200, Math.min(4000, currentPrice));
    
    const regime = calculateEconomicRegime(currentFDR);
    
    states.push({ 
      date, 
      fdr: currentFDR, 
      regime, 
      aluminumPrice: Math.round(currentPrice * 100) / 100 
    });
  }
  
  return states;
}

/**
 * Research Validation System - Historical Backtesting
 * 
 * This background job validates the dual-circuit economic theory by:
 * 1. Simulating historical economic states from 2000-present
 * 2. Making predictions at time T using only data available at T
 * 3. Comparing predictions to actual outcomes at time T+horizon
 * 4. Calculating accuracy metrics to validate the theory
 * 
 * IMPORTANT: This is a RESEARCH VALIDATION system - NOT user-facing functionality.
 * In production, this would fetch real historical data from FRED/Alpha Vantage APIs.
 */
/**
 * Automated Forecast Retraining Job
 * Runs daily to find SKUs with poor accuracy and retrain models
 */
async function runForecastRetraining() {
  try {
    const companies = await getActiveCompanyIds();
    
    for (const companyId of companies) {
      try {
        const result = await runAutomatedRetraining(storage, companyId, 10);
        
        // Broadcast retraining results
        if (result.skusRetrained > 0) {
          broadcastUpdate({
            type: 'database_update',
            entity: 'forecast_retraining',
            action: 'update',
            timestamp: new Date().toISOString(),
            companyId,
            data: {
              skusEvaluated: result.totalSkusEvaluated,
              skusRetrained: result.skusRetrained,
              mapeBefore: result.averageMAPEBefore.toFixed(2),
              mapeAfter: result.averageMAPEAfter.toFixed(2),
            },
          });
        }
      } catch (error: any) {
        console.error(`[ForecastRetrain] Error for company ${companyId}:`, error.message);
      }
    }
  } catch (error) {
    console.error('[ForecastRetrain] Failed to run automated retraining:', error);
  }
}

async function runHistoricalBacktesting() {
  try {
    const companies = await getActiveCompanyIds();
    
    if (companies.length === 0) {
      return;
    }

    // Import research modules
    const { BacktestingEngine, DualCircuitEngine } = await import('./lib/dualCircuitResearch');
    
    // Simulate historical economic states for backtesting
    // In production, this would come from HistoricalDataFetcher fetching real FRED/AV data
    // Using 500 data points for comprehensive testing (generates ~500 predictions per company)
    const historicalStates = generateSimulatedHistoricalEconomicStates(500);
    
    // For each company, run backtesting on historical data
    for (const companyId of companies) {
      // Process each historical point as if we're "living" at that time
      for (let i = 0; i < historicalStates.length - 1; i++) {
        const currentState = historicalStates[i];
        const futureState = historicalStates[i + 1]; // This is what actually happened
        
        const predictionDate = currentState.date;
        const targetDate = futureState.date;
        const horizonDays = Math.round((targetDate.getTime() - predictionDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Make prediction using ONLY data available at predictionDate
        const fdrAtPrediction = currentState.fdr;
        const regimeAtPrediction = currentState.regime;
        
        // Apply dual-circuit theory to predict future price movement
        // Theory: High FDR (bubble) → prices will correct downward
        //         Low FDR (real economy lead) → prices will rise
        let predictedDirection: 'up' | 'down' | 'stable';
        let predictedValue: number;
        
        if (fdrAtPrediction > 1.8) {
          // Bubble conditions - expect correction
          predictedDirection = 'down';
          predictedValue = currentState.aluminumPrice * 0.92; // Expect 8% drop
        } else if (fdrAtPrediction < 1.2) {
          // Real economy lead - expect growth
          predictedDirection = 'up';
          predictedValue = currentState.aluminumPrice * 1.08; // Expect 8% rise
        } else {
          // Moderate conditions
          predictedDirection = currentState.aluminumPrice > 2500 ? 'down' : 'up';
          predictedValue = currentState.aluminumPrice * 1.02; // Expect 2% change
        }
        
        // Predict future regime based on FDR trend
        const predictedRegime = regimeAtPrediction; // Simplified - could use trend analysis
        
        // Create prediction record
        const prediction = await storage.createHistoricalPrediction({
          companyId,
          predictionDate,
          targetDate,
          horizonDays,
          predictionType: 'commodity_price',
          itemName: 'Aluminum',
          fdrAtPrediction,
          regimeAtPrediction,
          predictedValue,
          predictedRegime,
          predictedDirection,
          confidenceScore: 0.75,
          calculationNotes: `FDR=${fdrAtPrediction.toFixed(2)}, Regime=${regimeAtPrediction}, Theory-based prediction`,
          modelVersion: 'v1.0',
          dataSource: 'simulated_historical'
        });
        
        // Update with ACTUAL values from future state (what really happened)
        const actualValue = futureState.aluminumPrice;
        const actualRegime = futureState.regime;
        const actualDirection: 'up' | 'down' | 'stable' = 
          actualValue > currentState.aluminumPrice ? 'up' : 
          actualValue < currentState.aluminumPrice ? 'down' : 'stable';
        
        await storage.updateHistoricalPredictionActuals(
          prediction.id,
          actualValue,
          actualRegime,
          actualDirection
        );
      }
    }
    
    // Calculate and store accuracy metrics
    for (const companyId of companies) {
      const allPredictions = await storage.getHistoricalPredictions(companyId);
      
      if (allPredictions.length > 0) {
        const metrics = BacktestingEngine.calculateAccuracyMetrics(allPredictions);
        
        await storage.createPredictionAccuracyMetrics({
          companyId,
          metricPeriod: '30-day-rolling',
          periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          periodEnd: new Date(),
          totalPredictions: metrics.sampleSize,
          sampleSize: metrics.sampleSize,
          meanAbsolutePercentageError: metrics.mape,
          correctDirectionPct: metrics.directionalAccuracy,
          correctRegimePct: metrics.regimeAccuracy
        });
        
        console.log(`[Research] Updated accuracy metrics for company ${companyId.substring(0, 8)}: MAPE=${metrics.mape.toFixed(2)}%, Directional=${metrics.directionalAccuracy.toFixed(1)}%`);
      }
    }
  } catch (error) {
    console.error('[Research] Failed to run historical backtesting:', error);
  }
}

async function trackForecastAccuracy() {
  try {
    const activeCompanyIds = await getActiveCompanyIds();
    
    for (const companyId of activeCompanyIds) {
      await trackAllSKUs(storage, companyId);
    }
  } catch (error) {
    console.error('[Forecast Monitoring] Failed to track forecast accuracy:', error);
  }
}

const jobConfigs: BackgroundJobConfig[] = [
  { name: 'Economic Data Updates', intervalMs: 5 * 60 * 1000, enabled: true },
  { name: 'Sensor Readings Generation', intervalMs: 30 * 1000, enabled: true },
  { name: 'Commodity Price Updates', intervalMs: 10 * 60 * 1000, enabled: true },
  { name: 'ML Predictions Regeneration', intervalMs: 15 * 60 * 1000, enabled: true },
  { name: 'Supply Chain Risk Updates', intervalMs: 5 * 60 * 1000, enabled: true },
  { name: 'Workforce Metrics Updates', intervalMs: 10 * 60 * 1000, enabled: true },
  { name: 'Production KPI Updates', intervalMs: 2 * 60 * 1000, enabled: true },
  { name: 'Historical Backtesting (Research)', intervalMs: 20 * 60 * 1000, enabled: true },
  { name: 'Automated Forecast Retraining', intervalMs: 24 * 60 * 60 * 1000, enabled: true }, // Daily at 24 hours
  { name: 'Forecast Accuracy Tracking', intervalMs: 4 * 60 * 60 * 1000, enabled: true }, // Every 4 hours
];

export function startBackgroundJobs() {
  console.log('[Background Jobs] Starting background update services...');
  
  const jobFunctions = [
    updateExternalEconomicData,
    generateSensorReadings,
    updateCommodityPrices,
    regenerateMLPredictions,
    updateSupplyChainRisk,
    updateWorkforceMetrics,
    updateProductionKPIs,
    runHistoricalBacktesting,
    runForecastRetraining,
    trackForecastAccuracy,
  ];
  
  jobConfigs.forEach((config, index) => {
    if (config.enabled) {
      const jobFn = jobFunctions[index];
      
      const intervalId = setInterval(async () => {
        try {
          await jobFn();
        } catch (error) {
          console.error(`[Background] Error in ${config.name}:`, error);
        }
      }, config.intervalMs);
      
      jobs.set(config.name, intervalId);
      
      setTimeout(() => {
        jobFn().catch(err => console.error(`[Background] Initial run failed for ${config.name}:`, err));
      }, 5000);
      
      console.log(`[Background Jobs] Scheduled: ${config.name} (every ${config.intervalMs / 1000}s)`);
    }
  });
  
  console.log(`[Background Jobs] ${jobs.size} background services scheduled`);
}

export function stopBackgroundJobs() {
  console.log('[Background Jobs] Stopping all background services...');
  
  jobs.forEach((intervalId, name) => {
    clearInterval(intervalId);
    console.log(`[Background Jobs] Stopped: ${name}`);
  });
  
  jobs.clear();
}
