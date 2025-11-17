/**
 * Production KPI Calculation Engine
 * Calculates OEE (Overall Equipment Effectiveness), cycle times, bottlenecks
 * Integrates with dual-circuit economic theory for regime-aware analysis
 */

import type {
  ProductionRun,
  ProductionMetric,
  DowntimeEvent,
  ProductionBottleneck,
  InsertProductionMetric,
  InsertProductionBottleneck,
} from "@shared/schema";

/**
 * OEE Calculation
 * OEE = Availability × Performance × Quality
 * 
 * Availability = (Operating Time / Planned Production Time) × 100
 * Performance = (Actual Production / Theoretical Max Production) × 100
 * Quality = (Good Units / Total Units) × 100
 */
export interface OEECalculation {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  details: {
    plannedProductionTime: number;
    actualOperatingTime: number;
    downtimeMinutes: number;
    idealCycleTime: number;
    actualCycleTime: number;
    totalUnitsProduced: number;
    goodUnitsProduced: number;
    defectiveUnits: number;
  };
}

export function calculateOEE(productionRun: ProductionRun): OEECalculation {
  // Extract values with defaults
  const plannedDuration = productionRun.plannedDuration || 0;
  const actualDuration = productionRun.actualDuration || 0;
  const downtime = productionRun.downtime || 0;
  const targetCycleTime = productionRun.targetCycleTime || 1;
  const cycleTime = productionRun.cycleTime || targetCycleTime;
  const producedUnits = productionRun.producedUnits || 0;
  const goodUnits = productionRun.goodUnits || 0;
  const defectiveUnits = productionRun.defectiveUnits || 0;
  const plannedUnits = productionRun.plannedUnits || producedUnits;

  // 1. AVAILABILITY: (Operating Time / Planned Production Time) × 100
  const actualOperatingTime = actualDuration - downtime;
  const availability = plannedDuration > 0
    ? (actualOperatingTime / plannedDuration) * 100
    : 0;

  // 2. PERFORMANCE: (Actual Production / Theoretical Max Production) × 100
  // Assuming targetCycleTime is in seconds, actualOperatingTime is in minutes
  const theoreticalMaxProduction = targetCycleTime > 0
    ? (actualOperatingTime * 60) / targetCycleTime  // Convert minutes to seconds, then divide by cycle time
    : producedUnits;
  const performance = theoreticalMaxProduction > 0
    ? (producedUnits / theoreticalMaxProduction) * 100
    : 0;

  // 3. QUALITY: (Good Units / Total Units) × 100
  const quality = producedUnits > 0
    ? (goodUnits / producedUnits) * 100
    : 0;

  // OVERALL OEE
  const oee = (availability / 100) * (performance / 100) * (quality / 100) * 100;

  return {
    availability: Math.round(availability * 100) / 100,
    performance: Math.round(performance * 100) / 100,
    quality: Math.round(quality * 100) / 100,
    oee: Math.round(oee * 100) / 100,
    details: {
      plannedProductionTime: plannedDuration,
      actualOperatingTime: actualOperatingTime,
      downtimeMinutes: downtime,
      idealCycleTime: targetCycleTime,
      actualCycleTime: cycleTime,
      totalUnitsProduced: producedUnits,
      goodUnitsProduced: goodUnits,
      defectiveUnits: defectiveUnits,
    },
  };
}

/**
 * Generate production metric from production run
 */
export function generateProductionMetric(
  productionRun: ProductionRun,
  companyId: string,
  economicRegime?: string,
  fdrAtPeriod?: number
): InsertProductionMetric {
  const oeeCalc = calculateOEE(productionRun);

  return {
    companyId,
    productionRunId: productionRun.id,
    machineryId: productionRun.machineryId,
    periodStart: productionRun.startTime,
    periodEnd: productionRun.endTime || new Date(),
    availability: oeeCalc.availability,
    performance: oeeCalc.performance,
    quality: oeeCalc.quality,
    oee: oeeCalc.oee,
    plannedProductionTime: oeeCalc.details.plannedProductionTime,
    actualOperatingTime: oeeCalc.details.actualOperatingTime,
    downtimeMinutes: oeeCalc.details.downtimeMinutes,
    idealCycleTime: oeeCalc.details.idealCycleTime,
    actualCycleTime: oeeCalc.details.actualCycleTime,
    totalUnitsProduced: oeeCalc.details.totalUnitsProduced,
    goodUnitsProduced: oeeCalc.details.goodUnitsProduced,
    defectiveUnits: oeeCalc.details.defectiveUnits,
    unitsPerHour: oeeCalc.details.actualOperatingTime > 0
      ? (oeeCalc.details.totalUnitsProduced / oeeCalc.details.actualOperatingTime) * 60
      : 0,
    utilizationRate: productionRun.plannedDuration && productionRun.actualDuration
      ? (productionRun.actualDuration / productionRun.plannedDuration) * 100
      : 0,
    economicRegime,
    fdrAtPeriod,
  };
}

/**
 * Detect production bottlenecks from downtime events
 */
export function detectBottlenecks(
  downtimeEvents: DowntimeEvent[],
  productionRuns: ProductionRun[]
): InsertProductionBottleneck[] {
  const bottlenecks: InsertProductionBottleneck[] = [];

  // Group downtime by machinery
  const downtimeByMachinery = new Map<string, DowntimeEvent[]>();
  downtimeEvents.forEach(event => {
    const existing = downtimeByMachinery.get(event.machineryId) || [];
    existing.push(event);
    downtimeByMachinery.set(event.machineryId, existing);
  });

  // Analyze each machinery's downtime pattern
  downtimeByMachinery.forEach((events, machineryId) => {
    const totalDowntime = events.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);
    const criticalEvents = events.filter(e => e.severity === "critical");
    const unplannedEvents = events.filter(e => e.category === "unplanned");

    // Detect if this machinery is a bottleneck
    if (totalDowntime > 480 || criticalEvents.length >= 2 || unplannedEvents.length >= 3) {
      const impactLevel = criticalEvents.length >= 2 ? "critical" :
                         totalDowntime > 960 ? "high" :
                         totalDowntime > 480 ? "medium" : "low";

      // Estimate throughput loss
      const relatedRuns = productionRuns.filter(r => r.machineryId === machineryId);
      const avgThroughput = relatedRuns.length > 0
        ? relatedRuns.reduce((sum, r) => sum + (r.producedUnits || 0), 0) / relatedRuns.length
        : 0;
      
      const throughputLoss = avgThroughput > 0
        ? (totalDowntime / (24 * 60)) * 100  // % of day lost
        : 0;

      bottlenecks.push({
        companyId: events[0].companyId,
        bottleneckType: "machinery",
        location: `Machinery ID: ${machineryId}`,
        machineryId,
        description: `High downtime detected: ${totalDowntime} minutes total. ` +
                    `${criticalEvents.length} critical events, ${unplannedEvents.length} unplanned events.`,
        impactLevel,
        throughputLoss: Math.round(throughputLoss * 100) / 100,
        estimatedDailyCost: totalDowntime * 50, // Rough estimate: $50/minute
        recommendedActions: [
          {
            action: "Preventative Maintenance Review",
            priority: "high",
            description: "Review maintenance schedule and increase frequency",
          },
          {
            action: "Root Cause Analysis",
            priority: "critical",
            description: `Investigate ${criticalEvents.length} critical downtime events`,
          },
        ],
        status: "active",
      });
    }
  });

  return bottlenecks;
}

/**
 * Calculate cycle time statistics
 */
export interface CycleTimeStats {
  average: number;
  min: number;
  max: number;
  variance: number;
  efficiency: number; // % of target cycle time
}

export function calculateCycleTimeStats(
  productionRuns: ProductionRun[]
): CycleTimeStats {
  const cycleTimes = productionRuns
    .map(r => r.cycleTime)
    .filter(ct => ct != null) as number[];

  if (cycleTimes.length === 0) {
    return {
      average: 0,
      min: 0,
      max: 0,
      variance: 0,
      efficiency: 0,
    };
  }

  const average = cycleTimes.reduce((sum, ct) => sum + ct, 0) / cycleTimes.length;
  const min = Math.min(...cycleTimes);
  const max = Math.max(...cycleTimes);
  
  const variance = cycleTimes.reduce((sum, ct) => {
    return sum + Math.pow(ct - average, 2);
  }, 0) / cycleTimes.length;

  // Calculate efficiency vs target
  const targetsProvided = productionRuns.filter(r => r.targetCycleTime != null);
  const efficiency = targetsProvided.length > 0
    ? targetsProvided.reduce((sum, r) => {
        const eff = r.targetCycleTime && r.cycleTime
          ? (r.targetCycleTime / r.cycleTime) * 100
          : 100;
        return sum + eff;
      }, 0) / targetsProvided.length
    : 100;

  return {
    average: Math.round(average * 100) / 100,
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
    variance: Math.round(variance * 100) / 100,
    efficiency: Math.round(efficiency * 100) / 100,
  };
}

/**
 * Generate regime-aware production recommendations
 * Aligns with dual-circuit economic theory
 */
export function generateProductionRecommendations(
  economicRegime: string,
  oeeScore: number,
  downtimeEvents: DowntimeEvent[]
): string[] {
  const recommendations: string[] = [];

  // OEE-based recommendations
  if (oeeScore < 60) {
    recommendations.push("CRITICAL: OEE below 60% - immediate intervention required");
    recommendations.push("Conduct comprehensive equipment audit");
    recommendations.push("Review operator training and procedures");
  } else if (oeeScore < 75) {
    recommendations.push("ATTENTION: OEE below industry standard (75%) - improvement needed");
    recommendations.push("Focus on reducing downtime and quality defects");
  } else if (oeeScore >= 85) {
    recommendations.push("EXCELLENT: OEE at world-class level (>85%)");
    recommendations.push("Maintain current practices and consider capacity expansion");
  }

  // Economic regime-based recommendations
  switch (economicRegime) {
    case "HEALTHY_EXPANSION":
      recommendations.push("REGIME: Healthy Expansion - Optimize for growth");
      recommendations.push("Invest in capacity expansion and automation");
      recommendations.push("Hire and train additional production staff");
      break;
    
    case "ASSET_LED_GROWTH":
      recommendations.push("REGIME: Asset-Led Growth - Balance expansion with efficiency");
      recommendations.push("Focus on productivity improvements over capacity additions");
      recommendations.push("Monitor asset utilization carefully");
      break;
    
    case "IMBALANCED_EXCESS":
      recommendations.push("REGIME: Imbalanced Excess - Prepare for correction");
      recommendations.push("URGENT: Reduce production costs and improve margins");
      recommendations.push("Delay non-critical capital expenditures");
      recommendations.push("Build cash reserves and reduce inventory");
      break;
    
    case "REAL_ECONOMY_LEAD":
      recommendations.push("REGIME: Real Economy Lead - Capitalize on real growth");
      recommendations.push("Increase production capacity to meet demand");
      recommendations.push("Lock in favorable supplier contracts");
      break;
  }

  // Downtime pattern recommendations
  const criticalDowntime = downtimeEvents.filter(e => e.severity === "critical");
  if (criticalDowntime.length > 0) {
    recommendations.push(`ADDRESS: ${criticalDowntime.length} critical downtime events require immediate attention`);
  }

  return recommendations;
}
