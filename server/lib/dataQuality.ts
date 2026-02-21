import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";
import {
  dataQualityScores,
  materials,
  suppliers,
  supplierMaterials,
  skus,
  demandHistory,
  type DataQualityScore,
} from "@shared/schema";

export interface DataQualityReport {
  companyId: string;
  overallScore: number;
  entityScores: EntityScore[];
  automationAllowed: boolean;
  blockReasons: string[];
  scoredAt: string;
}

export interface EntityScore {
  entityType: string;
  entityId: string | null;
  missingness: number;
  staleness: number;
  outlierScore: number;
  overallScore: number;
  details: Record<string, any>;
}

const AUTOMATION_QUALITY_THRESHOLD = 0.4;
const STALE_HOURS_THRESHOLD = 168; // 7 days

function computeMissingness(record: Record<string, any>, requiredFields: string[]): number {
  if (requiredFields.length === 0) return 0;
  const missing = requiredFields.filter(f => record[f] === null || record[f] === undefined || record[f] === "");
  return missing.length / requiredFields.length;
}

function computeStaleness(updatedAt: Date | string | null, thresholdHours: number = STALE_HOURS_THRESHOLD): number {
  if (!updatedAt) return 1.0;
  const updated = new Date(updatedAt);
  const hoursAgo = (Date.now() - updated.getTime()) / (1000 * 60 * 60);
  if (hoursAgo <= 1) return 0;
  if (hoursAgo >= thresholdHours) return 1.0;
  return Math.min(1.0, hoursAgo / thresholdHours);
}

function computeOutlierScore(values: number[]): number {
  if (values.length < 3) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  if (iqr === 0) return 0;
  const outliers = values.filter(v => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr);
  return outliers.length / values.length;
}

export async function scoreCompanyDataQuality(companyId: string): Promise<DataQualityReport> {
  const entityScores: EntityScore[] = [];

  const companyMaterials = await db.select().from(materials).where(eq(materials.companyId, companyId));
  const materialRequiredFields = ["code", "name", "unit", "onHand"];
  for (const mat of companyMaterials) {
    const miss = computeMissingness(mat as any, materialRequiredFields);
    const stale = computeStaleness(mat.createdAt);
    const overall = 1 - (miss * 0.5 + stale * 0.5);
    entityScores.push({
      entityType: "material", entityId: mat.id,
      missingness: miss, staleness: stale, outlierScore: 0,
      overallScore: Math.max(0, overall),
      details: { fieldsChecked: materialRequiredFields, missingCount: Math.round(miss * materialRequiredFields.length) },
    });
  }

  const companySuppliers = await db.select().from(suppliers).where(eq(suppliers.companyId, companyId));
  const supplierRequiredFields = ["name", "contactEmail"];
  for (const sup of companySuppliers) {
    const miss = computeMissingness(sup as any, supplierRequiredFields);
    const stale = computeStaleness(sup.createdAt);
    const overall = 1 - (miss * 0.4 + stale * 0.6);
    entityScores.push({
      entityType: "supplier", entityId: sup.id,
      missingness: miss, staleness: stale, outlierScore: 0,
      overallScore: Math.max(0, overall),
      details: { fieldsChecked: supplierRequiredFields },
    });
  }

  const companySkus = await db.select().from(skus).where(eq(skus.companyId, companyId));
  for (const sku of companySkus) {
    const history = await db.select().from(demandHistory).where(eq(demandHistory.skuId, sku.id));
    const demandValues = history.map(h => h.units);
    const outlier = computeOutlierScore(demandValues);
    const miss = history.length === 0 ? 1.0 : 0;
    const stale = history.length > 0
      ? computeStaleness(history[history.length - 1].createdAt)
      : 1.0;
    const overall = 1 - (miss * 0.4 + stale * 0.3 + outlier * 0.3);
    entityScores.push({
      entityType: "sku_demand", entityId: sku.id,
      missingness: miss, staleness: stale, outlierScore: outlier,
      overallScore: Math.max(0, overall),
      details: { historyRecords: history.length, outlierRatio: outlier },
    });
  }

  const totalScore = entityScores.length > 0
    ? entityScores.reduce((acc, s) => acc + s.overallScore, 0) / entityScores.length
    : 0;

  const blockReasons: string[] = [];
  if (totalScore < AUTOMATION_QUALITY_THRESHOLD) {
    blockReasons.push(`Overall data quality score ${totalScore.toFixed(2)} is below automation threshold ${AUTOMATION_QUALITY_THRESHOLD}`);
  }
  const criticalMissing = entityScores.filter(s => s.missingness > 0.5 && s.entityType === "material");
  if (criticalMissing.length > 0) {
    blockReasons.push(`${criticalMissing.length} materials have >50% missing required fields`);
  }

  for (const score of entityScores) {
    await db.insert(dataQualityScores).values({
      companyId,
      entityType: score.entityType,
      entityId: score.entityId,
      missingness: score.missingness,
      staleness: score.staleness,
      outlierScore: score.outlierScore,
      overallScore: score.overallScore,
      details: score.details,
    });
  }

  return {
    companyId,
    overallScore: totalScore,
    entityScores,
    automationAllowed: blockReasons.length === 0,
    blockReasons,
    scoredAt: new Date().toISOString(),
  };
}

export async function getLatestDataQuality(companyId: string): Promise<DataQualityReport | null> {
  const rows = await db.select().from(dataQualityScores)
    .where(eq(dataQualityScores.companyId, companyId))
    .orderBy(sql`scored_at DESC`)
    .limit(50);

  if (rows.length === 0) return null;

  const entityScores: EntityScore[] = rows.map(r => ({
    entityType: r.entityType,
    entityId: r.entityId,
    missingness: r.missingness,
    staleness: r.staleness,
    outlierScore: r.outlierScore,
    overallScore: r.overallScore,
    details: (r.details as Record<string, any>) || {},
  }));

  const totalScore = entityScores.reduce((acc, s) => acc + s.overallScore, 0) / entityScores.length;
  const blockReasons: string[] = [];
  if (totalScore < AUTOMATION_QUALITY_THRESHOLD) {
    blockReasons.push(`Overall data quality score ${totalScore.toFixed(2)} is below automation threshold ${AUTOMATION_QUALITY_THRESHOLD}`);
  }

  return {
    companyId,
    overallScore: totalScore,
    entityScores,
    automationAllowed: blockReasons.length === 0,
    blockReasons,
    scoredAt: rows[0].scoredAt?.toISOString() || new Date().toISOString(),
  };
}

export function shouldBlockAutomation(qualityReport: DataQualityReport | null): { blocked: boolean; reasons: string[] } {
  if (!qualityReport) return { blocked: true, reasons: ["No data quality assessment available"] };
  return { blocked: !qualityReport.automationAllowed, reasons: qualityReport.blockReasons };
}
