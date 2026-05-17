import { db } from "../db";
import {
  maintenanceAlerts,
  forecastDegradationAlerts,
  forecastAccuracyTracking,
  alertTriggers,
  economicSnapshots,
} from "@shared/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import type { IStorage } from "../storage";
import { CANONICAL_REGIME_THRESHOLDS } from "./regimeConstants";
import { isDemoMode } from "./demoMode";

/**
 * Alert Generation Service
 * 
 * Generates alerts for:
 * 1. Maintenance needs - Predicted maintenance requirements
 * 2. Forecast degradation - When forecast accuracy drops
 * 3. Regime alerts via alertTriggers table - Economic regime transitions
 */

export interface AlertGenerationResult {
  maintenanceAlerts: number;
  forecastAlerts: number;
  regimeAlerts: number;
  totalAlerts: number;
}

export class AlertGenerationService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Generate maintenance alerts for machinery needing attention
   */
  async generateMaintenanceAlerts(companyId: string): Promise<number> {
    try {
      const companyMachinery = await this.storage.getMachinery(companyId);
      let alertsCreated = 0;

      const latestSnapshot = await db
        .select()
        .from(economicSnapshots)
        .where(eq(economicSnapshots.companyId, companyId))
        .orderBy(desc(economicSnapshots.createdAt))
        .limit(1);

      const currentRegime = latestSnapshot[0]?.regime || "HEALTHY_EXPANSION";
      const currentFdr = latestSnapshot[0]?.fdr || 1.0;

      for (const machine of companyMachinery) {
        const nextMaintenance = machine.nextMaintenanceDate 
          ? new Date(machine.nextMaintenanceDate) 
          : null;
        
        if (!nextMaintenance) continue;

        const now = new Date();
        const daysUntilMaintenance = (nextMaintenance.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        
        let alertType: string | null = null;
        let severity: string = "low";
        let confidence = 0.7;
        let title = "";
        let description = "";

        if (daysUntilMaintenance < 0) {
          alertType = "overdue";
          severity = "critical";
          confidence = 0.95;
          title = `OVERDUE: ${machine.name} maintenance`;
          description = `Maintenance is ${Math.abs(Math.round(daysUntilMaintenance))} days overdue`;
        } else if (daysUntilMaintenance < 7) {
          alertType = "imminent";
          severity = "high";
          confidence = 0.9;
          title = `URGENT: ${machine.name} needs maintenance`;
          description = `Maintenance due in ${Math.round(daysUntilMaintenance)} days`;
        } else if (daysUntilMaintenance < 30) {
          alertType = "upcoming";
          severity = "medium";
          confidence = 0.8;
          title = `Upcoming: ${machine.name} maintenance`;
          description = `Schedule maintenance within ${Math.round(daysUntilMaintenance)} days`;
        } else if (daysUntilMaintenance < 60 && currentRegime === "REAL_ECONOMY_LEAD") {
          alertType = "optimal_timing";
          severity = "low";
          confidence = 0.75;
          title = `Optimal timing: ${machine.name}`;
          description = `Economic conditions favorable for maintenance scheduling`;
        }

        if (alertType) {
          try {
            await db.insert(maintenanceAlerts).values({
              companyId,
              machineryId: machine.id,
              alertType,
              severity,
              title,
              description,
              predictedFailureDate: nextMaintenance,
              confidence,
              status: "active",
              economicRegime: currentRegime,
              fdrAtAlert: currentFdr,
            });
            alertsCreated++;
          } catch (error) {
            // Likely duplicate, skip
          }
        }
      }

      return alertsCreated;

    } catch (error) {
      console.error("[Alerts] Error generating maintenance alerts:", error);
      return 0;
    }
  }

  /**
   * Generate forecast degradation alerts from REAL MAPE measurements.
   *
   * Reads the latest forecast_accuracy_tracking row per SKU (populated
   * by server/lib/mapeBacktest.ts) and emits an alert when MAPE has
   * degraded materially against the baseline. Closes F2-FILED-013.
   *
   * Heuristic for "degraded":
   *   - Severity-critical: MAPE > 2.5× baseline AND absolute MAPE > 25%
   *   - Severity-high:     MAPE > 2.0× baseline AND absolute MAPE > 15%
   *   - Severity-medium:   MAPE > 1.5× baseline AND absolute MAPE > 8%
   *
   * Demo mode (DEMO_MODE=1) keeps the legacy synthetic alert generator
   * for sales walkthroughs where tenants don't yet have enough forecast
   * history for the real backtest to produce alerts.
   */
  async generateForecastAlerts(companyId: string): Promise<number> {
    try {
      // Demo-mode legacy path — synthetic alerts so demo tenants have a
      // populated alerts inbox during sales walkthroughs.
      if (isDemoMode()) {
        return await this.generateForecastAlertsDemo(companyId);
      }

      // Real path — read latest measurement per SKU from the backtest output.
      // We do this with a window function via raw SQL for atomicity (one
      // query instead of N per-SKU lookups).
      const rows = await db.execute<{
        sku_id: string;
        mape: number;
        baseline_mape: number | null;
        bias: number | null;
        directional_accuracy: number | null;
        predictions_evaluated: number;
        measurement_date: Date;
      }>(sql`
        SELECT DISTINCT ON (sku_id)
          sku_id, mape, baseline_mape, bias, directional_accuracy,
          predictions_evaluated, measurement_date
        FROM forecast_accuracy_tracking
        WHERE company_id = ${companyId}
        ORDER BY sku_id, measurement_date DESC
      `);

      const measurements = (rows as any).rows ?? rows;
      if (!measurements || measurements.length === 0) {
        console.log(`[Alerts] No forecast_accuracy_tracking rows for company=${companyId} — run mapeBacktest first`);
        return 0;
      }

      let alertsCreated = 0;
      const now = new Date();

      for (const m of measurements as any[]) {
        const currentMape = Number(m.mape);
        const baseline = m.baseline_mape ? Number(m.baseline_mape) : currentMape;
        const ratio = baseline > 0 ? currentMape / baseline : 1;
        const degradationPercent = baseline > 0
          ? ((currentMape - baseline) / baseline) * 100
          : 0;

        // Tier the alert
        let severity: "critical" | "high" | "medium" | null = null;
        if (ratio > 2.5 && currentMape > 25) severity = "critical";
        else if (ratio > 2.0 && currentMape > 15) severity = "high";
        else if (ratio > 1.5 && currentMape > 8) severity = "medium";
        if (!severity) continue;

        // Only emit if the measurement has enough evidence — a 100% MAPE
        // off a single forecast is noise, not signal.
        if (Number(m.predictions_evaluated) < 5) continue;

        // Dedupe — don't emit a second alert for the same SKU + severity
        // within the last 24h. Otherwise the cron would spam every run.
        const recentCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const [recent] = await db
          .select({ id: forecastDegradationAlerts.id })
          .from(forecastDegradationAlerts)
          .where(
            and(
              eq(forecastDegradationAlerts.companyId, companyId),
              eq(forecastDegradationAlerts.skuId, m.sku_id),
              eq(forecastDegradationAlerts.severity, severity),
              sql`${forecastDegradationAlerts.triggeredAt} >= ${recentCutoff}`,
            ),
          )
          .limit(1);
        if (recent) continue;

        try {
          await db.insert(forecastDegradationAlerts).values({
            companyId,
            skuId: m.sku_id,
            alertType: "accuracy_drop",
            currentMAPE: currentMape,
            baselineMAPE: baseline,
            previousMAPE: baseline, // For now; could pull the second-most-recent measurement.
            degradationPercent,
            severity,
            thresholdType: "ratio_vs_baseline",
            thresholdValue: severity === "critical" ? 2.5 : severity === "high" ? 2.0 : 1.5,
            triggeredAt: now,
            acknowledged: 0,
            resolved: 0,
            recommendedAction: severity === "critical" || severity === "high"
              ? "retrain"
              : "recalibrate",
            message: `Forecast accuracy degraded: MAPE ${currentMape.toFixed(1)}% (${(ratio).toFixed(1)}× baseline ${baseline.toFixed(1)}%, ${m.predictions_evaluated} predictions evaluated)`,
          });
          alertsCreated++;
        } catch (error) {
          console.error("[Alerts] Error inserting forecast alert:", error);
        }
      }

      console.log(`[Alerts] Generated ${alertsCreated} real forecast-degradation alerts from ${measurements.length} SKU measurements (company=${companyId})`);
      return alertsCreated;
    } catch (error) {
      console.error("[Alerts] Error generating forecast alerts:", error);
      return 0;
    }
  }

  /**
   * Legacy synthetic alert path — only reachable in DEMO_MODE=1.
   * Preserved so sales walkthroughs in demo tenants still have a
   * populated alerts inbox. Production runs the real path above.
   */
  private async generateForecastAlertsDemo(companyId: string): Promise<number> {
    const companySkus = await this.storage.getSkus(companyId);
    let alertsCreated = 0;
    const baselineMape = 4.0;
    const mapeThreshold = 8.0;

    for (let i = 0; i < Math.min(companySkus.length, 10); i++) {
      const sku = companySkus[i];
      const skuMape = i % 2 === 0
        ? baselineMape + (Math.random() * 5) + 6
        : baselineMape + (Math.random() * 3);

      if (skuMape > mapeThreshold) {
        const degradationPercent = ((skuMape - baselineMape) / baselineMape) * 100;
        let severity: string;
        if (skuMape > 20) severity = "critical";
        else if (skuMape > 15) severity = "high";
        else severity = "medium";

        try {
          await db.insert(forecastDegradationAlerts).values({
            companyId,
            skuId: sku.id,
            alertType: "accuracy_drop",
            currentMAPE: skuMape,
            baselineMAPE: baselineMape,
            previousMAPE: baselineMape + 1,
            degradationPercent,
            severity,
            thresholdType: "absolute",
            thresholdValue: mapeThreshold,
            triggeredAt: new Date(),
            acknowledged: 0,
            resolved: 0,
            recommendedAction: skuMape > 15 ? "retrain" : "recalibrate",
            message: `Forecast accuracy degraded: MAPE at ${skuMape.toFixed(1)}% vs baseline ${baselineMape}% (demo)`,
          });
          alertsCreated++;
        } catch (error) {
          console.log("[Alerts] Error inserting demo forecast alert:", error);
        }
      }
    }
    return alertsCreated;
  }

  /**
   * Generate regime change alerts using alertTriggers table
   */
  async generateRegimeAlerts(companyId: string): Promise<number> {
    try {
      const snapshots = await db
        .select()
        .from(economicSnapshots)
        .where(eq(economicSnapshots.companyId, companyId))
        .orderBy(desc(economicSnapshots.createdAt))
        .limit(10);

      if (snapshots.length < 2) return 0;

      const current = snapshots[0];
      const previous = snapshots[1];
      let alertsCreated = 0;

      // Create regime change alert
      if (current.regime !== previous.regime) {
        try {
          await db.insert(alertTriggers).values({
            companyId,
            alertType: "regime_change",
            alertId: current.id,
            currentValue: current.fdr,
            thresholdValue: previous.fdr,
            message: `Regime transition: ${previous.regime} → ${current.regime}. Review procurement strategies.`,
            triggeredAt: new Date(),
            acknowledged: 0,
          });
          alertsCreated++;
        } catch (error) {
          // Likely duplicate, skip
        }
      }

      // FDR threshold alerts
      const fdrChange = Math.abs(current.fdr - previous.fdr);
      if (fdrChange > 0.2) {
        const direction = current.fdr > previous.fdr ? "rising" : "falling";
        try {
          await db.insert(alertTriggers).values({
            companyId,
            alertType: "fdr_threshold",
            alertId: current.id,
            currentValue: current.fdr,
            thresholdValue: previous.fdr,
            message: `FDR ${direction} significantly: ${previous.fdr.toFixed(2)} → ${current.fdr.toFixed(2)} (${(fdrChange * 100).toFixed(1)}% change)`,
            triggeredAt: new Date(),
            acknowledged: 0,
          });
          alertsCreated++;
        } catch (error) {
          // Likely duplicate, skip
        }
      }

      // Counter-cyclical opportunity alert (REAL_ECONOMY_LEAD at high FDR ≥ 2.5 = asset markets overheated, buy real assets)
      if (current.regime === "REAL_ECONOMY_LEAD" && current.fdr >= CANONICAL_REGIME_THRESHOLDS.REAL_ECONOMY_LEAD.min) {
        try {
          await db.insert(alertTriggers).values({
            companyId,
            alertType: "opportunity",
            alertId: current.id,
            currentValue: current.fdr,
            thresholdValue: 2.5,
            message: `Counter-cyclical buying opportunity: FDR ${current.fdr.toFixed(2)} in ${current.regime} - asset markets overheated, favor real economy investments`,
            triggeredAt: new Date(),
            acknowledged: 0,
          });
          alertsCreated++;
        } catch (error) {
          // Likely duplicate, skip
        }
      }

      return alertsCreated;

    } catch (error) {
      console.error("[Alerts] Error generating regime alerts:", error);
      return 0;
    }
  }

  /**
   * Generate all alert types for a company
   */
  async generateAllAlerts(companyId: string): Promise<AlertGenerationResult> {
    console.log(`[Alerts] Generating alerts for company ${companyId}`);

    const [
      maintenanceAlerts,
      forecastAlerts,
      regimeAlerts,
    ] = await Promise.all([
      this.generateMaintenanceAlerts(companyId),
      this.generateForecastAlerts(companyId),
      this.generateRegimeAlerts(companyId),
    ]);

    const totalAlerts = maintenanceAlerts + forecastAlerts + regimeAlerts;
    
    console.log(`[Alerts] Generated ${totalAlerts} alerts: ${maintenanceAlerts} maintenance, ${forecastAlerts} forecast, ${regimeAlerts} regime`);

    return {
      maintenanceAlerts,
      forecastAlerts,
      regimeAlerts,
      totalAlerts,
    };
  }
}

let alertServiceInstance: AlertGenerationService | null = null;

export function getAlertGenerationService(storage: IStorage): AlertGenerationService {
  if (!alertServiceInstance) {
    alertServiceInstance = new AlertGenerationService(storage);
  }
  return alertServiceInstance;
}
