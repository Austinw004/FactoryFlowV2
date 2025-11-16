import type { Machinery } from "@shared/schema";

export interface DepreciationSchedule {
  year: number;
  beginningValue: number;
  depreciation: number;
  accumulatedDepreciation: number;
  endingValue: number;
}

export interface DepreciationData {
  method: string;
  currentValue: number;
  totalDepreciation: number;
  remainingValue: number;
  yearsElapsed: number;
  yearsRemaining: number;
  schedule: DepreciationSchedule[];
}

/**
 * Calculate depreciation for machinery using various methods
 */
export function calculateDepreciation(machine: Machinery): DepreciationData {
  const purchaseDate = machine.purchaseDate ? new Date(machine.purchaseDate) : new Date();
  const now = new Date();
  const yearsElapsed = (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  const yearsRemaining = Math.max(0, machine.usefulLifeYears - yearsElapsed);
  
  let schedule: DepreciationSchedule[] = [];
  let currentValue = machine.purchaseCost;
  let totalDepreciation = 0;
  
  switch (machine.depreciationMethod) {
    case "straight-line":
      ({ schedule, currentValue, totalDepreciation } = calculateStraightLine(
        machine.purchaseCost,
        machine.salvageValue,
        machine.usefulLifeYears,
        yearsElapsed
      ));
      break;
      
    case "declining-balance":
      ({ schedule, currentValue, totalDepreciation } = calculateDecliningBalance(
        machine.purchaseCost,
        machine.salvageValue,
        machine.usefulLifeYears,
        yearsElapsed
      ));
      break;
      
    case "units-of-production":
      ({ schedule, currentValue, totalDepreciation } = calculateUnitsOfProduction(
        machine.purchaseCost,
        machine.salvageValue,
        machine.unitsProduced || 0,
        yearsElapsed,
        machine.usefulLifeYears
      ));
      break;
      
    default:
      ({ schedule, currentValue, totalDepreciation } = calculateStraightLine(
        machine.purchaseCost,
        machine.salvageValue,
        machine.usefulLifeYears,
        yearsElapsed
      ));
  }
  
  return {
    method: machine.depreciationMethod,
    currentValue: Math.max(currentValue, machine.salvageValue),
    totalDepreciation,
    remainingValue: Math.max(currentValue, machine.salvageValue),
    yearsElapsed: Math.min(yearsElapsed, machine.usefulLifeYears),
    yearsRemaining,
    schedule,
  };
}

/**
 * Straight-line depreciation: (Cost - Salvage) / Useful Life
 */
function calculateStraightLine(
  cost: number,
  salvage: number,
  usefulLife: number,
  yearsElapsed: number
): { schedule: DepreciationSchedule[]; currentValue: number; totalDepreciation: number } {
  const annualDepreciation = (cost - salvage) / usefulLife;
  const schedule: DepreciationSchedule[] = [];
  let accumulatedDepreciation = 0;
  
  for (let year = 1; year <= usefulLife; year++) {
    const beginningValue = cost - accumulatedDepreciation;
    const depreciation = Math.min(annualDepreciation, beginningValue - salvage);
    accumulatedDepreciation += depreciation;
    const endingValue = cost - accumulatedDepreciation;
    
    schedule.push({
      year,
      beginningValue,
      depreciation,
      accumulatedDepreciation,
      endingValue: Math.max(endingValue, salvage),
    });
  }
  
  const totalDepreciation = Math.min(annualDepreciation * yearsElapsed, cost - salvage);
  const currentValue = cost - totalDepreciation;
  
  return { schedule, currentValue, totalDepreciation };
}

/**
 * Double Declining Balance: 2 × (1 / Useful Life) × Book Value
 */
function calculateDecliningBalance(
  cost: number,
  salvage: number,
  usefulLife: number,
  yearsElapsed: number
): { schedule: DepreciationSchedule[]; currentValue: number; totalDepreciation: number } {
  const depreciationRate = 2 / usefulLife;
  const schedule: DepreciationSchedule[] = [];
  let accumulatedDepreciation = 0;
  let bookValue = cost;
  
  for (let year = 1; year <= usefulLife; year++) {
    const beginningValue = bookValue;
    const depreciation = Math.min(bookValue * depreciationRate, bookValue - salvage);
    accumulatedDepreciation += depreciation;
    bookValue -= depreciation;
    
    schedule.push({
      year,
      beginningValue,
      depreciation,
      accumulatedDepreciation,
      endingValue: Math.max(bookValue, salvage),
    });
  }
  
  // Calculate current value based on years elapsed
  let currentValue = cost;
  for (let i = 0; i < Math.floor(yearsElapsed) && i < usefulLife; i++) {
    const depreciation = Math.min(currentValue * depreciationRate, currentValue - salvage);
    currentValue -= depreciation;
  }
  
  // Handle partial year
  const partialYear = yearsElapsed - Math.floor(yearsElapsed);
  if (partialYear > 0 && Math.floor(yearsElapsed) < usefulLife) {
    const depreciation = Math.min(currentValue * depreciationRate * partialYear, currentValue - salvage);
    currentValue -= depreciation;
  }
  
  const totalDepreciation = cost - currentValue;
  
  return { schedule, currentValue: Math.max(currentValue, salvage), totalDepreciation };
}

/**
 * Units of Production: (Cost - Salvage) × (Units Produced / Total Expected Units)
 * For machinery without units tracking, falls back to straight-line
 */
function calculateUnitsOfProduction(
  cost: number,
  salvage: number,
  unitsProduced: number,
  yearsElapsed: number,
  usefulLife: number
): { schedule: DepreciationSchedule[]; currentValue: number; totalDepreciation: number } {
  // If no units data, fall back to straight-line
  if (unitsProduced === 0) {
    return calculateStraightLine(cost, salvage, usefulLife, yearsElapsed);
  }
  
  // Estimate total expected units based on years and current production rate
  const productionRate = unitsProduced / Math.max(yearsElapsed, 1);
  const totalExpectedUnits = productionRate * usefulLife;
  
  const depreciationPerUnit = (cost - salvage) / totalExpectedUnits;
  const totalDepreciation = Math.min(depreciationPerUnit * unitsProduced, cost - salvage);
  const currentValue = cost - totalDepreciation;
  
  // Generate schedule based on estimated annual production
  const schedule: DepreciationSchedule[] = [];
  let accumulatedDepreciation = 0;
  
  for (let year = 1; year <= usefulLife; year++) {
    const beginningValue = cost - accumulatedDepreciation;
    const estimatedUnits = productionRate;
    const depreciation = Math.min(depreciationPerUnit * estimatedUnits, beginningValue - salvage);
    accumulatedDepreciation += depreciation;
    const endingValue = cost - accumulatedDepreciation;
    
    schedule.push({
      year,
      beginningValue,
      depreciation,
      accumulatedDepreciation,
      endingValue: Math.max(endingValue, salvage),
    });
  }
  
  return { schedule, currentValue: Math.max(currentValue, salvage), totalDepreciation };
}

/**
 * Check if machine needs maintenance soon
 */
export function needsMaintenanceSoon(machine: Machinery, daysThreshold: number = 30): boolean {
  if (!machine.nextMaintenanceDate) return false;
  
  const nextMaintenance = new Date(machine.nextMaintenanceDate);
  const now = new Date();
  const daysUntilMaintenance = (nextMaintenance.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  
  return daysUntilMaintenance <= daysThreshold && daysUntilMaintenance > 0;
}

/**
 * Check if machine is overdue for maintenance
 */
export function isMaintenanceOverdue(machine: Machinery): boolean {
  if (!machine.nextMaintenanceDate) return false;
  
  const nextMaintenance = new Date(machine.nextMaintenanceDate);
  const now = new Date();
  
  return now > nextMaintenance;
}

/**
 * Calculate total maintenance cost for a machine
 */
export function calculateTotalMaintenanceCost(records: any[]): number {
  return records.reduce((total, record) => total + (record.cost || 0), 0);
}

/**
 * Calculate total downtime hours
 */
export function calculateTotalDowntime(records: any[]): number {
  return records.reduce((total, record) => total + (record.downTimeHours || 0), 0);
}
