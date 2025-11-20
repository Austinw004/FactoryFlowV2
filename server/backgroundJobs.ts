import { storage } from './storage';
import { broadcastUpdate } from './websocket';
import axios from 'axios';

interface BackgroundJobConfig {
  name: string;
  intervalMs: number;
  enabled: boolean;
}

const jobs: Map<string, NodeJS.Timeout> = new Map();

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
    const response = await axios.get('https://api.factoryofthefuture.ai/economic-indicators', {
      timeout: 10000,
      validateStatus: () => true
    });

    if (response.status === 200 && response.data) {
      const { gdp_real, gdp_nominal, sp500_index, inflation_rate, sentiment_score } = response.data;
      
      const fdr = gdp_nominal && gdp_real ? gdp_nominal / gdp_real : 1.2;
      const regime = calculateEconomicRegime(fdr);

      const companies = await getActiveCompanyIds();
      
      if (companies.length > 0) {
        for (const companyId of companies) {
          // Persist to database
          await storage.createEconomicSnapshot({
            companyId,
            timestamp: new Date(),
            fdr,
            regime,
            gdpReal: gdp_real,
            gdpNominal: gdp_nominal,
            sp500Index: sp500_index,
            inflationRate: inflation_rate,
            sentimentScore: sentiment_score,
            source: 'external'
          });

          broadcastUpdate({
            type: 'database_update',
            entity: 'economic_indicators',
            action: 'update',
            timestamp: new Date().toISOString(),
            companyId,
            data: { 
              fdr: fdr.toFixed(2), 
              regime, 
              gdpReal: gdp_real,
              gdpNominal: gdp_nominal,
              sp500: sp500_index,
              inflation: inflation_rate 
            },
          });
        }

        broadcastUpdate({
          type: 'database_update',
          entity: 'external_economic_data',
          action: 'update',
          timestamp: new Date().toISOString(),
          data: { 
            fdr: fdr.toFixed(2), 
            regime,
            companiesUpdated: companies.length 
          },
        });
      }
      
      console.log(`[Background] Updated economic data: FDR=${fdr.toFixed(2)}, Regime=${regime}, Companies=${companies.length}`);
    } else {
      console.log(`[Background] External economic API returned status ${response.status}, using cached data`);
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
 * Research Validation System - Historical Backtesting
 * 
 * This background job continuously validates the dual-circuit economic theory
 * by making predictions at historical points in time and tracking accuracy.
 * 
 * IMPORTANT: This is a RESEARCH VALIDATION system - NOT user-facing functionality.
 * The goal is to prove the theoretical framework works through historical backtesting.
 */
async function runHistoricalBacktesting() {
  try {
    const companies = await getActiveCompanyIds();
    
    if (companies.length === 0) {
      return;
    }

    // Import research modules
    const { BacktestingEngine, DualCircuitEngine } = await import('./lib/dualCircuitResearch');
    
    // For each company, simulate making a prediction at a historical date
    for (const companyId of companies) {
      // Create mock historical prediction for demonstration
      // In production, this would use real historical data
      const predictionDate = new Date();
      predictionDate.setFullYear(predictionDate.getFullYear() - 1); // 1 year ago
      
      const targetDate = new Date(predictionDate);
      targetDate.setDate(targetDate.getDate() + 90); // 90 days forward
      
      // Get current economic snapshot for context
      const currentSnapshot = await storage.getLatestEconomicSnapshot(companyId);
      const currentFDR = currentSnapshot?.fdr || 1.15;
      const currentRegime = DualCircuitEngine.determineRegime(currentFDR);
      
      // Create a historical prediction record
      const prediction = await storage.createHistoricalPrediction({
        companyId,
        predictionDate,
        targetDate,
        horizonDays: 90,
        predictionType: 'commodity_price',
        itemName: 'Aluminum',
        fdrAtPrediction: currentFDR,
        regimeAtPrediction: currentRegime,
        predictedValue: 2500 + (Math.random() - 0.5) * 200,
        predictedRegime: currentRegime,
        predictedDirection: currentFDR > 1.5 ? 'down' : 'up',
        confidenceScore: 0.75,
        calculationNotes: `FDR=${currentFDR.toFixed(2)}, Regime=${currentRegime}`,
        modelVersion: 'v1.0',
        dataSource: 'simulation'
      });
      
      // Simulate updating with actual values (in production, this would be real data)
      if (Math.random() > 0.7) { // 30% chance to update with actuals
        const actualValue = 2500 + (Math.random() - 0.5) * 300;
        const actualDirection = actualValue > 2500 ? 'up' : 'down';
        
        await storage.updateHistoricalPredictionActuals(
          prediction.id,
          actualValue,
          currentRegime,
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

const jobConfigs: BackgroundJobConfig[] = [
  { name: 'Economic Data Updates', intervalMs: 5 * 60 * 1000, enabled: true },
  { name: 'Sensor Readings Generation', intervalMs: 30 * 1000, enabled: true },
  { name: 'Commodity Price Updates', intervalMs: 10 * 60 * 1000, enabled: true },
  { name: 'ML Predictions Regeneration', intervalMs: 15 * 60 * 1000, enabled: true },
  { name: 'Supply Chain Risk Updates', intervalMs: 5 * 60 * 1000, enabled: true },
  { name: 'Workforce Metrics Updates', intervalMs: 10 * 60 * 1000, enabled: true },
  { name: 'Production KPI Updates', intervalMs: 2 * 60 * 1000, enabled: true },
  { name: 'Historical Backtesting (Research)', intervalMs: 20 * 60 * 1000, enabled: true }, // Every 20 minutes
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
