import { db } from "../db";
import { productionRuns, productionMetrics, downtimeEvents, productionBottlenecks, machinery, economicSnapshots } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import type { IStorage } from "../storage";
import { calculateOEE, generateProductionMetric, detectBottlenecks, generateProductionRecommendations } from "./productionKPIs";

/**
 * Production Metrics Population Service
 * 
 * Generates OEE calculations, production metrics, and bottleneck analysis
 */

interface ProductionMetricsResult {
  machineryProcessed: number;
  metricsCreated: number;
  avgOEE: number;
  bottlenecksIdentified: number;
  regime: string;
  recommendations: string[];
}

export class ProductionMetricsPopulationService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  async generateProductionMetrics(companyId: string): Promise<ProductionMetricsResult> {
    console.log(`[ProductionKPI] Generating production metrics for company ${companyId}`);

    const companyMachinery = await db
      .select()
      .from(machinery)
      .where(eq(machinery.companyId, companyId));

    if (companyMachinery.length === 0) {
      console.log("[ProductionKPI] No machinery found, generating synthetic data");
      return this.generateSyntheticMetrics(companyId);
    }

    const latestSnapshot = await db
      .select()
      .from(economicSnapshots)
      .where(eq(economicSnapshots.companyId, companyId))
      .orderBy(desc(economicSnapshots.createdAt))
      .limit(1);

    const currentRegime = latestSnapshot[0]?.regime || "HEALTHY_EXPANSION";
    const currentFdr = latestSnapshot[0]?.fdr || 1.0;

    let metricsCreated = 0;
    let totalOEE = 0;
    let bottlenecksFound = 0;

    for (const machine of companyMachinery) {
      const runs = await db
        .select()
        .from(productionRuns)
        .where(eq(productionRuns.machineryId, machine.id))
        .orderBy(desc(productionRuns.createdAt))
        .limit(10);

      if (runs.length === 0) {
        // Create synthetic metrics directly without foreign key constraint
        const oee = 70 + Math.random() * 20;
        const availability = 85 + Math.random() * 12;
        const performance = 80 + Math.random() * 15;
        const quality = 92 + Math.random() * 8;
        const periodStart = new Date(Date.now() - 8 * 60 * 60 * 1000);
        
        try {
          await db.insert(productionMetrics).values({
            companyId,
            machineryId: machine.id,
            periodStart,
            periodEnd: new Date(),
            availability,
            performance,
            quality,
            oee,
            plannedProductionTime: 480,
            actualOperatingTime: 480 * (availability / 100),
            downtimeMinutes: 480 * (1 - availability / 100),
            idealCycleTime: 30,
            actualCycleTime: 30 / (performance / 100),
            totalUnitsProduced: Math.round(Math.random() * 500 + 200),
            goodUnitsProduced: Math.round(Math.random() * 450 + 180),
            defectiveUnits: Math.round(Math.random() * 30),
            unitsPerHour: Math.round(Math.random() * 80 + 40),
            utilizationRate: availability,
            economicRegime: currentRegime,
            fdrAtPeriod: currentFdr,
            metadata: { synthetic: true, machineName: machine.name },
          });
          metricsCreated++;
          totalOEE += oee;
        } catch (error) {
          console.error("[ProductionKPI] Error inserting synthetic metric:", error);
        }
        continue;
      }

      for (const run of runs) {
        const metric = generateProductionMetric(run, companyId, currentRegime, currentFdr);
        
        try {
          await db.insert(productionMetrics).values(metric);
          metricsCreated++;
          totalOEE += metric.oee || 0;
        } catch (error) {
          console.error("[ProductionKPI] Error inserting production metric:", error);
        }
      }

      const events = await db
        .select()
        .from(downtimeEvents)
        .where(eq(downtimeEvents.machineryId, machine.id))
        .limit(20);

      if (events.length > 3) {
        const bottlenecks = detectBottlenecks(events, runs);
        for (const bottleneck of bottlenecks) {
          try {
            await db.insert(productionBottlenecks).values(bottleneck);
            bottlenecksFound++;
          } catch (error) {
            console.error("[ProductionKPI] Error inserting bottleneck:", error);
          }
        }
      }
    }

    const avgOEE = metricsCreated > 0 ? totalOEE / metricsCreated : 0;
    const recommendations = generateProductionRecommendations(currentRegime, avgOEE, []);

    console.log(`[ProductionKPI] Created ${metricsCreated} metrics, ${bottlenecksFound} bottlenecks. Avg OEE: ${avgOEE.toFixed(1)}%`);

    return {
      machineryProcessed: companyMachinery.length,
      metricsCreated,
      avgOEE: Math.round(avgOEE * 100) / 100,
      bottlenecksIdentified: bottlenecksFound,
      regime: currentRegime,
      recommendations,
    };
  }

  private async generateSyntheticMetrics(companyId: string): Promise<ProductionMetricsResult> {
    const latestSnapshot = await db
      .select()
      .from(economicSnapshots)
      .where(eq(economicSnapshots.companyId, companyId))
      .orderBy(desc(economicSnapshots.createdAt))
      .limit(1);

    const currentRegime = latestSnapshot[0]?.regime || "HEALTHY_EXPANSION";
    const currentFdr = latestSnapshot[0]?.fdr || 1.0;

    const syntheticMachinery = [
      { name: "CNC Machine A", type: "cnc" },
      { name: "Assembly Line 1", type: "assembly" },
      { name: "Quality Station", type: "inspection" },
    ];

    let metricsCreated = 0;
    let totalOEE = 0;

    for (const machine of syntheticMachinery) {
      const oee = 70 + Math.random() * 20;
      const availability = 85 + Math.random() * 12;
      const performance = 80 + Math.random() * 15;
      const quality = 92 + Math.random() * 8;

      const periodStart = new Date();
      periodStart.setHours(periodStart.getHours() - 8);

      try {
        await db.insert(productionMetrics).values({
          companyId,
          periodStart,
          periodEnd: new Date(),
          availability,
          performance,
          quality,
          oee,
          plannedProductionTime: 480,
          actualOperatingTime: 480 * (availability / 100),
          downtimeMinutes: 480 * (1 - availability / 100),
          idealCycleTime: 30,
          actualCycleTime: 30 / (performance / 100),
          totalUnitsProduced: Math.round(Math.random() * 500 + 200),
          goodUnitsProduced: Math.round(Math.random() * 450 + 180),
          defectiveUnits: Math.round(Math.random() * 30),
          unitsPerHour: Math.round(Math.random() * 80 + 40),
          utilizationRate: availability,
          economicRegime: currentRegime,
          fdrAtPeriod: currentFdr,
          metadata: { synthetic: true, machineName: machine.name, machineType: machine.type },
        });
        metricsCreated++;
        totalOEE += oee;
      } catch (error) {
        console.error("[ProductionKPI] Error inserting synthetic production metric:", error);
      }
    }

    const avgOEE = metricsCreated > 0 ? totalOEE / metricsCreated : 0;
    const recommendations = generateProductionRecommendations(currentRegime, avgOEE, []);

    return {
      machineryProcessed: syntheticMachinery.length,
      metricsCreated,
      avgOEE: Math.round(avgOEE * 100) / 100,
      bottlenecksIdentified: 0,
      regime: currentRegime,
      recommendations,
    };
  }

  private createSyntheticProductionRun(machine: any): any {
    const plannedDuration = 480;
    const downtime = Math.random() * 60;
    const producedUnits = Math.round(Math.random() * 500 + 200);
    const defectRate = 0.02 + Math.random() * 0.03;
    
    return {
      id: `synthetic-${machine.id}`,
      machineryId: machine.id,
      plannedDuration,
      actualDuration: plannedDuration - downtime * 0.5,
      downtime,
      targetCycleTime: 30,
      cycleTime: 30 + Math.random() * 5,
      producedUnits,
      plannedUnits: producedUnits * 1.1,
      goodUnits: Math.round(producedUnits * (1 - defectRate)),
      defectiveUnits: Math.round(producedUnits * defectRate),
      startTime: new Date(Date.now() - 8 * 60 * 60 * 1000),
      endTime: new Date(),
    };
  }
}

export function createProductionMetricsService(storage: IStorage): ProductionMetricsPopulationService {
  return new ProductionMetricsPopulationService(storage);
}
