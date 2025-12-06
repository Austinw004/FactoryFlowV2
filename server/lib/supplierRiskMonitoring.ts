import { db } from "../db";
import { suppliers, supplierRiskSnapshots, supplierNodes, economicSnapshots } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import type { IStorage } from "../storage";
import { calculateSupplierRiskScore, getFDRRiskMultiplier, generateRegimeAwareActions, type RiskScoreInputs } from "./supplyChainRisk";

/**
 * Supplier Risk Monitoring Service
 * 
 * Continuously monitors supplier risk levels and creates snapshots
 * for historical tracking and trend analysis
 */

interface RiskMonitoringResult {
  suppliersEvaluated: number;
  snapshotsCreated: number;
  criticalRisks: number;
  highRisks: number;
  mediumRisks: number;
  lowRisks: number;
  regime: string;
  fdr: number;
  recommendations: string[];
}

export class SupplierRiskMonitoringService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Generate risk snapshots for all suppliers of a company
   */
  async generateRiskSnapshots(companyId: string): Promise<RiskMonitoringResult> {
    console.log(`[RiskMonitor] Generating supplier risk snapshots for company ${companyId}`);

    const companySuppliersData = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.companyId, companyId));

    if (companySuppliersData.length === 0) {
      return {
        suppliersEvaluated: 0,
        snapshotsCreated: 0,
        criticalRisks: 0,
        highRisks: 0,
        mediumRisks: 0,
        lowRisks: 0,
        regime: "UNKNOWN",
        fdr: 1.0,
        recommendations: [],
      };
    }

    const latestSnapshot = await db
      .select()
      .from(economicSnapshots)
      .where(eq(economicSnapshots.companyId, companyId))
      .orderBy(desc(economicSnapshots.createdAt))
      .limit(1);

    const currentRegime = latestSnapshot[0]?.regime || "HEALTHY_EXPANSION";
    const currentFdr = latestSnapshot[0]?.fdr || 1.0;

    console.log(`[RiskMonitor] Current regime: ${currentRegime}, FDR: ${currentFdr}`);

    const supplierNodesData = await db
      .select()
      .from(supplierNodes)
      .where(eq(supplierNodes.companyId, companyId));

    const nodesBySupplier = new Map<string, typeof supplierNodesData[0]>();
    for (const node of supplierNodesData) {
      if (node.supplierId) {
        nodesBySupplier.set(node.supplierId, node);
      }
    }

    let snapshotsCreated = 0;
    let criticalRisks = 0;
    let highRisks = 0;
    let mediumRisks = 0;
    let lowRisks = 0;
    const allRecommendations: string[] = [];

    for (const supplier of companySuppliersData) {
      const node = nodesBySupplier.get(supplier.id);

      const riskInputs: RiskScoreInputs = {
        financialHealthScore: node?.financialHealthScore || this.generateSyntheticFinancialHealth(),
        bankruptcyRisk: node?.bankruptcyRisk || Math.random() * 10,
        onTimeDeliveryRate: node?.onTimeDeliveryRate || 85 + Math.random() * 15,
        qualityScore: node?.qualityScore || 80 + Math.random() * 20,
        capacityUtilization: node?.capacityUtilization || 60 + Math.random() * 30,
        currentFDR: currentFdr,
        tier: node?.tier || 1,
        criticality: (node?.criticality || "medium") as "low" | "medium" | "high" | "critical",
      };

      const assessment = calculateSupplierRiskScore(riskInputs);
      const fdrMultiplier = getFDRRiskMultiplier(currentFdr, currentRegime);
      const adjustedScore = Math.min(100, assessment.overallRiskScore * fdrMultiplier);
      const adjustedRiskLevel = this.getRiskLevelFromScore(adjustedScore);

      switch (adjustedRiskLevel) {
        case "critical": criticalRisks++; break;
        case "high": highRisks++; break;
        case "medium": mediumRisks++; break;
        case "low": lowRisks++; break;
      }

      try {
        await db.insert(supplierRiskSnapshots).values({
          companyId,
          supplierId: supplier.id,
          regime: currentRegime,
          fdrValue: currentFdr,
          fdrSignalStrength: this.calculateFdrSignalStrength(currentFdr),
          baseScore: assessment.overallRiskScore,
          adjustedScore,
          riskTier: adjustedRiskLevel,
          riskFactors: assessment.riskFactors as any,
          recommendations: assessment.recommendations,
        });
        snapshotsCreated++;
      } catch (error) {
      }

      if (adjustedRiskLevel === "critical" || adjustedRiskLevel === "high") {
        const actions = generateRegimeAwareActions(currentRegime, currentFdr, adjustedRiskLevel);
        actions.forEach(a => {
          if (!allRecommendations.includes(a)) {
            allRecommendations.push(a);
          }
        });
      }
    }

    console.log(`[RiskMonitor] Created ${snapshotsCreated} snapshots. Critical: ${criticalRisks}, High: ${highRisks}`);

    return {
      suppliersEvaluated: companySuppliersData.length,
      snapshotsCreated,
      criticalRisks,
      highRisks,
      mediumRisks,
      lowRisks,
      regime: currentRegime,
      fdr: currentFdr,
      recommendations: allRecommendations.slice(0, 10),
    };
  }

  /**
   * Get risk trend for a supplier over time
   */
  async getSupplierRiskTrend(supplierId: string, days: number = 30): Promise<any[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const snapshots = await db
      .select()
      .from(supplierRiskSnapshots)
      .where(
        and(
          eq(supplierRiskSnapshots.supplierId, supplierId),
          sql`evaluated_at >= ${cutoffDate.toISOString()}`
        )
      )
      .orderBy(sql`evaluated_at ASC`);

    return snapshots.map(s => ({
      date: s.evaluatedAt,
      baseScore: s.baseScore,
      adjustedScore: s.adjustedScore,
      riskTier: s.riskTier,
      regime: s.regime,
      fdr: s.fdrValue,
    }));
  }

  private generateSyntheticFinancialHealth(): number {
    return 60 + Math.random() * 35;
  }

  private calculateFdrSignalStrength(fdr: number): number {
    const deviation = Math.abs(fdr - 1.0);
    return Math.min(1.0, deviation * 2);
  }

  private getRiskLevelFromScore(score: number): "low" | "medium" | "high" | "critical" {
    if (score < 25) return "low";
    if (score < 50) return "medium";
    if (score < 75) return "high";
    return "critical";
  }
}

export function createSupplierRiskMonitoringService(storage: IStorage): SupplierRiskMonitoringService {
  return new SupplierRiskMonitoringService(storage);
}
