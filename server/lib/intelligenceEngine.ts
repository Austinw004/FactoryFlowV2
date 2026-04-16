/**
 * Contextual Intelligence Engine
 *
 * Analyzes data across the platform to surface:
 * - Anomaly detection on inputs (unusual values, outliers)
 * - Proactive alerts (low inventory, efficiency drops, quality spikes)
 * - Inline suggestions from historical data
 * - Trend analysis and predictions
 */

import { db } from "../db";
import {
  materials, suppliers, machinery, productionMetrics,
  sensorReadings, inventoryOptimizations, maintenanceAlerts,
  demandPredictions, auditLogs
} from "../../shared/schema";
import { eq, desc, gte, lte, and, sql, count } from "drizzle-orm";

// ── Types ──────────────────────────────────────────────────────────────────
export interface Insight {
  id: string;
  type: "anomaly" | "alert" | "suggestion" | "trend";
  severity: "critical" | "warning" | "info";
  category: "inventory" | "production" | "quality" | "maintenance" | "supply_chain" | "efficiency" | "cost";
  title: string;
  description: string;
  metric?: string;
  currentValue?: number;
  expectedValue?: number;
  deviation?: number;
  recommendation?: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  timestamp: string;
  expiresAt?: string;
}

// ── Statistical helpers ────────────────────────────────────────────────────
function calculateStats(values: number[]): { mean: number; stdDev: number; min: number; max: number; median: number } {
  if (values.length === 0) return { mean: 0, stdDev: 0, min: 0, max: 0, median: 0 };

  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const median = sorted[Math.floor(sorted.length / 2)];

  return { mean, stdDev, min: sorted[0], max: sorted[sorted.length - 1], median };
}

function isAnomaly(value: number, mean: number, stdDev: number, threshold: number = 2): boolean {
  if (stdDev === 0) return false;
  return Math.abs(value - mean) > threshold * stdDev;
}

function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

// ── Intelligence generators ────────────────────────────────────────────────

export async function generateInsights(companyId: string): Promise<Insight[]> {
  const insights: Insight[] = [];
  const now = new Date();

  try {
    // 1. Inventory anomalies & low stock alerts
    const inventoryInsights = await analyzeInventory(companyId);
    insights.push(...inventoryInsights);

    // 2. Production efficiency analysis
    const productionInsights = await analyzeProduction(companyId);
    insights.push(...productionInsights);

    // 3. Equipment health & maintenance predictions
    const maintenanceInsights = await analyzeMaintenance(companyId);
    insights.push(...maintenanceInsights);

    // 4. Supplier performance trends
    const supplierInsights = await analyzeSuppliers(companyId);
    insights.push(...supplierInsights);

  } catch (error) {
    console.error("[Intelligence] Error generating insights:", error);
  }

  // Sort by severity then recency
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  insights.sort((a, b) => {
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return insights.slice(0, 25); // Cap at 25 insights
}

async function analyzeInventory(companyId: string): Promise<Insight[]> {
  const insights: Insight[] = [];
  const now = new Date().toISOString();

  try {
    const materialList = await db.select().from(materials)
      .where(eq(materials.companyId, companyId))
      .limit(200);

    for (const mat of materialList as any[]) {
      const qty = Number(mat.currentStock ?? mat.onHand) || 0;
      const reorder = Number(mat.reorderPoint) || 0;
      const safetyStock = Number(mat.safetyStock) || 0;

      // Critical: below safety stock
      if (safetyStock > 0 && qty <= safetyStock) {
        insights.push({
          id: `inv-critical-${mat.id}`,
          type: "alert",
          severity: "critical",
          category: "inventory",
          title: `${mat.name || mat.materialName || "Material"} below safety stock`,
          description: `Current stock (${qty}) is at or below safety stock level (${safetyStock}). Risk of production disruption.`,
          metric: "stock_level",
          currentValue: qty,
          expectedValue: safetyStock,
          deviation: safetyStock > 0 ? ((safetyStock - qty) / safetyStock) * 100 : 0,
          recommendation: `Expedite procurement for ${mat.name || "this material"}. Consider emergency sourcing if lead time exceeds 3 days.`,
          entityType: "material",
          entityId: mat.id,
          entityName: mat.name || mat.materialName || undefined,
          timestamp: now,
        });
      }
      // Warning: below reorder point
      else if (reorder > 0 && qty <= reorder && qty > safetyStock) {
        insights.push({
          id: `inv-reorder-${mat.id}`,
          type: "alert",
          severity: "warning",
          category: "inventory",
          title: `${mat.name || mat.materialName || "Material"} at reorder point`,
          description: `Current stock (${qty}) has reached the reorder point (${reorder}). Standard replenishment should be initiated.`,
          metric: "stock_level",
          currentValue: qty,
          expectedValue: reorder,
          recommendation: `Place standard replenishment order. Estimated ${Math.ceil((reorder - qty) / (reorder * 0.1))} days until safety stock is reached.`,
          entityType: "material",
          entityId: mat.id,
          entityName: mat.name || mat.materialName || undefined,
          timestamp: now,
        });
      }

      // Overstock detection
      const maxStock = Number(mat.maxStock) || 0;
      if (maxStock > 0 && qty > maxStock * 1.2) {
        insights.push({
          id: `inv-overstock-${mat.id}`,
          type: "anomaly",
          severity: "info",
          category: "inventory",
          title: `${mat.name || mat.materialName || "Material"} overstocked`,
          description: `Current stock (${qty}) exceeds maximum level (${maxStock}) by ${Math.round(((qty - maxStock) / maxStock) * 100)}%.`,
          metric: "stock_level",
          currentValue: qty,
          expectedValue: maxStock,
          recommendation: `Review demand forecasts. Consider reducing next order quantity or exploring spot-sale opportunities.`,
          entityType: "material",
          entityId: mat.id,
          entityName: mat.name || mat.materialName || undefined,
          timestamp: now,
        });
      }
    }
  } catch (error) {
    console.error("[Intelligence] Inventory analysis error:", error);
  }

  return insights;
}

async function analyzeProduction(companyId: string): Promise<Insight[]> {
  const insights: Insight[] = [];
  const now = new Date().toISOString();

  try {
    const recentMetrics = await db.select().from(productionMetrics)
      .where(eq(productionMetrics.companyId, companyId))
      .orderBy(desc((productionMetrics as any).recordedAt ?? productionMetrics.createdAt))
      .limit(100);

    if (recentMetrics.length < 5) return insights;

    // OEE analysis
    const oeeValues = recentMetrics
      .map(m => Number(m.oee) || 0)
      .filter(v => v > 0);

    if (oeeValues.length >= 5) {
      const stats = calculateStats(oeeValues);
      const latestOEE = oeeValues[0];

      if (latestOEE < 65) {
        insights.push({
          id: `prod-oee-critical`,
          type: "alert",
          severity: "critical",
          category: "efficiency",
          title: "OEE below acceptable threshold",
          description: `Current OEE is ${latestOEE.toFixed(1)}%, well below the world-class benchmark of 85%. Historical average: ${stats.mean.toFixed(1)}%.`,
          metric: "oee",
          currentValue: latestOEE,
          expectedValue: 85,
          deviation: percentChange(latestOEE, 85),
          recommendation: "Investigate the biggest losses: availability (unplanned downtime), performance (slow cycles), or quality (defects). Focus on the largest contributor first.",
          timestamp: now,
        });
      } else if (isAnomaly(latestOEE, stats.mean, stats.stdDev)) {
        const direction = latestOEE < stats.mean ? "drop" : "spike";
        insights.push({
          id: `prod-oee-anomaly`,
          type: "anomaly",
          severity: direction === "drop" ? "warning" : "info",
          category: "efficiency",
          title: `Unusual OEE ${direction} detected`,
          description: `Current OEE (${latestOEE.toFixed(1)}%) deviates ${Math.abs(latestOEE - stats.mean).toFixed(1)} points from the average (${stats.mean.toFixed(1)}%).`,
          metric: "oee",
          currentValue: latestOEE,
          expectedValue: stats.mean,
          deviation: percentChange(latestOEE, stats.mean),
          recommendation: direction === "drop"
            ? "Check for recent changeovers, new operator assignments, or material quality issues."
            : "Identify what drove this improvement and standardize the process.",
          timestamp: now,
        });
      }
    }

    // Defect rate analysis
    const defectRates = recentMetrics
      .map(m => Number((m as any).defectRate) || 0)
      .filter(v => v >= 0);

    if (defectRates.length >= 5) {
      const stats = calculateStats(defectRates);
      const latest = defectRates[0];

      if (latest > 0 && isAnomaly(latest, stats.mean, stats.stdDev, 1.5)) {
        insights.push({
          id: `prod-defect-anomaly`,
          type: "anomaly",
          severity: latest > stats.mean ? "warning" : "info",
          category: "quality",
          title: latest > stats.mean ? "Quality defect rate spike" : "Quality improvement detected",
          description: `Defect rate (${(latest * 100).toFixed(2)}%) vs average (${(stats.mean * 100).toFixed(2)}%).`,
          metric: "defect_rate",
          currentValue: latest,
          expectedValue: stats.mean,
          deviation: percentChange(latest, stats.mean),
          recommendation: latest > stats.mean
            ? "Conduct root cause analysis. Check raw material batch quality, equipment calibration, and recent process changes."
            : "Document current process parameters. This may represent a best practice to standardize.",
          timestamp: now,
        });
      }
    }
  } catch (error) {
    console.error("[Intelligence] Production analysis error:", error);
  }

  return insights;
}

async function analyzeMaintenance(companyId: string): Promise<Insight[]> {
  const insights: Insight[] = [];
  const now = new Date().toISOString();

  try {
    // Check for machinery with health issues
    const machineList = await db.select().from(machinery)
      .where(eq(machinery.companyId, companyId))
      .limit(100);

    for (const machine of machineList as any[]) {
      const health = Number(machine.healthScore) || 100;
      const status = machine.status;

      if (health < 50) {
        insights.push({
          id: `maint-health-${machine.id}`,
          type: "alert",
          severity: health < 30 ? "critical" : "warning",
          category: "maintenance",
          title: `${machine.name || "Equipment"} health score critical: ${health}%`,
          description: `Health score has degraded to ${health}%. Status: ${status}. Risk of unplanned downtime is elevated.`,
          metric: "health_score",
          currentValue: health,
          expectedValue: 80,
          deviation: percentChange(health, 80),
          recommendation: health < 30
            ? "Schedule immediate inspection. Consider preventive shutdown to avoid catastrophic failure."
            : "Plan maintenance within the next maintenance window. Monitor vibration and temperature sensors.",
          entityType: "machinery",
          entityId: machine.id,
          entityName: machine.name || undefined,
          timestamp: now,
        });
      }

      // Check for overdue maintenance
      if (machine.nextMaintenanceDate) {
        const nextMaint = new Date(machine.nextMaintenanceDate);
        const daysOverdue = Math.floor((Date.now() - nextMaint.getTime()) / (1000 * 60 * 60 * 24));

        if (daysOverdue > 0) {
          insights.push({
            id: `maint-overdue-${machine.id}`,
            type: "alert",
            severity: daysOverdue > 14 ? "critical" : "warning",
            category: "maintenance",
            title: `${machine.name || "Equipment"} maintenance overdue by ${daysOverdue} days`,
            description: `Scheduled maintenance was due ${nextMaint.toLocaleDateString()}. ${daysOverdue} days overdue.`,
            recommendation: "Schedule maintenance immediately to prevent equipment degradation and warranty issues.",
            entityType: "machinery",
            entityId: machine.id,
            entityName: machine.name || undefined,
            timestamp: now,
          });
        }
      }
    }

    // Check for active maintenance alerts
    const activeAlerts = await db.select().from(maintenanceAlerts)
      .where(and(
        eq(maintenanceAlerts.companyId, companyId),
        eq(maintenanceAlerts.status, "active")
      ))
      .limit(50);

    if (activeAlerts.length > 5) {
      insights.push({
        id: `maint-alert-volume`,
        type: "trend",
        severity: "warning",
        category: "maintenance",
        title: `${activeAlerts.length} active maintenance alerts`,
        description: `There are ${activeAlerts.length} unresolved maintenance alerts. This volume may indicate a systemic issue.`,
        recommendation: "Review and prioritize alerts. Consider whether a common root cause (e.g., power quality, environmental) is driving multiple alerts.",
        timestamp: now,
      });
    }
  } catch (error) {
    console.error("[Intelligence] Maintenance analysis error:", error);
  }

  return insights;
}

async function analyzeSuppliers(companyId: string): Promise<Insight[]> {
  const insights: Insight[] = [];
  const now = new Date().toISOString();

  try {
    const supplierList = await db.select().from(suppliers)
      .where(eq(suppliers.companyId, companyId))
      .limit(100);

    for (const supplier of supplierList as any[]) {
      const reliability = Number(supplier.reliabilityScore) || 0;
      const riskLevel = supplier.riskLevel;

      if (reliability > 0 && reliability < 70) {
        insights.push({
          id: `sup-reliability-${supplier.id}`,
          type: "alert",
          severity: reliability < 50 ? "critical" : "warning",
          category: "supply_chain",
          title: `${supplier.name || "Supplier"} reliability score: ${reliability}%`,
          description: `Supplier reliability has dropped to ${reliability}%. This increases risk of delayed deliveries and production disruptions.`,
          metric: "reliability_score",
          currentValue: reliability,
          expectedValue: 85,
          recommendation: reliability < 50
            ? "Begin sourcing alternative suppliers. Place buffer stock orders to mitigate risk."
            : "Schedule a supplier review meeting. Establish improvement milestones with consequences.",
          entityType: "supplier",
          entityId: supplier.id,
          entityName: supplier.name || undefined,
          timestamp: now,
        });
      }

      if (riskLevel === "high" || riskLevel === "critical") {
        insights.push({
          id: `sup-risk-${supplier.id}`,
          type: "alert",
          severity: riskLevel === "critical" ? "critical" : "warning",
          category: "supply_chain",
          title: `${supplier.name || "Supplier"} flagged as ${riskLevel} risk`,
          description: `This supplier has been classified as ${riskLevel} risk. Review sourcing strategy and contingency plans.`,
          recommendation: "Ensure backup suppliers are qualified. Review contract terms and force majeure clauses.",
          entityType: "supplier",
          entityId: supplier.id,
          entityName: supplier.name || undefined,
          timestamp: now,
        });
      }
    }

    // Single-source risk
    // This would need supplier-material joins for full analysis
    // Simplified version: flag if supplier count is very low
    if (supplierList.length > 0 && supplierList.length < 3) {
      insights.push({
        id: `sup-concentration-risk`,
        type: "suggestion",
        severity: "warning",
        category: "supply_chain",
        title: `Supply base concentration risk`,
        description: `Only ${supplierList.length} supplier(s) in the system. Single-source dependencies create significant supply chain risk.`,
        recommendation: "Develop a supplier diversification strategy. Identify and qualify alternative sources for critical materials.",
        timestamp: now,
      });
    }
  } catch (error) {
    console.error("[Intelligence] Supplier analysis error:", error);
  }

  return insights;
}

// ── API route handler ──────────────────────────────────────────────────────
export async function getInsightsForCompany(companyId: string): Promise<Insight[]> {
  return generateInsights(companyId);
}
