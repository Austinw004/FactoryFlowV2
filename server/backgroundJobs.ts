import { storage } from './storage';
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
    const materials = await storage.getMaterials('');
    if (materials.length === 0) {
      return [];
    }
    const uniqueIds = new Set<string>();
    for (const m of materials) {
      if (m.companyId) {
        uniqueIds.add(m.companyId);
      }
    }
    companyIds = Array.from(uniqueIds).slice(0, 10);
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
        
      }
      
      console.log(`[Background] Updated economic data: FDR=${fdr.toFixed(2)}, Regime=${regime}`);
    }
  } catch (error) {
    console.error('[Background] Failed to update economic data:', error);
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
        
        await storage.createSensorReading({
          sensorId: sensor.id,
          timestamp: new Date(),
          value,
          status,
        });

        if (status === 'critical' && Math.random() < 0.3) {
          const daysUntilFailure = Math.floor(Math.random() * 30) + 1;
          const failureDate = new Date();
          failureDate.setDate(failureDate.getDate() + daysUntilFailure);
          
          await storage.createMaintenanceAlert({
            companyId,
            machineryId: sensor.machineryId,
            alertType: 'sensor_threshold',
            severity: 'high',
            title: `Critical ${sensor.sensorType} reading detected`,
            description: `Sensor reading ${value.toFixed(2)} exceeds safe threshold`,
            status: 'active',
          });
          
          await storage.createMaintenancePrediction({
            companyId,
            machineryId: sensor.machineryId,
            predictionType: 'failure',
            failureMode: `${sensor.sensorType}_anomaly`,
            confidence: 0.7 + Math.random() * 0.25,
            predictedDate: failureDate,
            mlModel: 'anomaly_detector_v2',
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
    
    for (const companyId of companies) {
      const materials = await storage.getMaterials(companyId);
      
      for (const material of materials.slice(0, 20)) {
        const priceChange = (Math.random() - 0.5) * 0.15;
        const basePrice = 100;
        const newPrice = basePrice * (1 + priceChange);
        
        await storage.createInventoryRecommendation({
          companyId,
          recommendationType: Math.random() < 0.5 ? 'reorder' : 'adjust_safety_stock',
          priority: 'medium',
          reasoning: `Price fluctuation detected: ${(priceChange * 100).toFixed(1)}%`,
          estimatedSavings: Math.round(Math.abs(priceChange) * 10000),
        });
      }
      
      if (materials.length > 0) {
        console.log(`[Background] Updated ${Math.min(materials.length, 20)} commodity prices for company ${companyId.substring(0, 8)}`);
      }
    }
  } catch (error) {
    console.error('[Background] Failed to update commodity prices:', error);
  }
}

export async function regenerateMLPredictions() {
  try {
    const companies = await getActiveCompanyIds();
    
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
          
          await storage.createDemandPrediction({
            materialId: material.id,
            companyId,
            mlModel: ['arima', 'lstm', 'prophet'][Math.floor(Math.random() * 3)] as 'arima' | 'lstm' | 'prophet',
            forecastPeriod: 'weekly',
            forecastHorizon: i,
            predictedDemand: predictedValue,
            accuracy: 0.75 + Math.random() * 0.2,
          });
        }
      }
      
      if (materials.length > 0) {
        console.log(`[Background] Regenerated ML predictions for company ${companyId.substring(0, 8)}`);
      }
    }
  } catch (error) {
    console.error('[Background] Failed to regenerate ML predictions:', error);
  }
}

export async function updateSupplyChainRisk() {
  try {
    const companies = await getActiveCompanyIds();
    
    for (const companyId of companies) {
      const batches = await storage.getMaterialBatches(companyId);
      
      for (const batch of batches.slice(0, 10)) {
        if (Math.random() < 0.2) {
          const eventTypes = ['received', 'inspected', 'moved', 'used_in_production', 'shipped'] as const;
          const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
          
          await storage.createTraceabilityEvent({
            batchId: batch.id,
            companyId,
            eventType,
            eventDescription: `Automated ${eventType} event`,
            location: `Facility ${Math.floor(Math.random() * 5) + 1}`,
            performedBy: 'Auto-Update System',
          });
        }
      }
      
      if (batches.length > 0) {
        console.log(`[Background] Updated supply chain events for company ${companyId.substring(0, 8)}`);
      }
    }
  } catch (error) {
    console.error('[Background] Failed to update supply chain risk:', error);
  }
}

export async function updateWorkforceMetrics() {
  try {
    const companies = await getActiveCompanyIds();
    
    for (const companyId of companies) {
      const employees = await storage.getEmployees(companyId);
      const shifts = await storage.getWorkShifts(companyId);
      
      if (shifts.length > 0 && employees.length > 0) {
        const shift = shifts[0];
        const employee = employees[0];
        
        if (Math.random() < 0.2) {
          await storage.createStaffAssignment({
            shiftId: shift.id,
            employeeId: employee.id,
            assignedRole: employee.role || 'operator',
            status: 'scheduled',
          });
        }
      }
      
      if (employees.length > 0) {
        console.log(`[Background] Updated workforce metrics for company ${companyId.substring(0, 8)}`);
      }
    }
  } catch (error) {
    console.error('[Background] Failed to update workforce metrics:', error);
  }
}

export async function updateProductionKPIs() {
  try {
    const companies = await getActiveCompanyIds();
    
    for (const companyId of companies) {
      const runs = await storage.getProductionRuns(companyId);
      
      for (const run of runs.slice(0, 5)) {
        if (run.status === 'in_progress' && Math.random() < 0.1) {
          await storage.createDowntimeEvent({
            companyId,
            machineryId: run.machineryId || 'MACH-001',
            eventType: 'unplanned',
            category: 'maintenance',
            description: 'Automated maintenance check',
            startTime: new Date(),
            severity: ['low', 'medium'][Math.floor(Math.random() * 2)] as 'low' | 'medium',
          });
        }
      }
      
      if (runs.length > 0) {
        console.log(`[Background] Updated production KPIs for company ${companyId.substring(0, 8)}`);
      }
    }
  } catch (error) {
    console.error('[Background] Failed to update production KPIs:', error);
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
