import { db } from "../db";
import { eq, and, sql, desc } from "drizzle-orm";
import {
  decisionRecommendations,
  decisionOverrides,
  materials,
  suppliers,
  supplierMaterials,
  materialConstraints,
  leadTimeDistributions,
  dataQualityScores,
  type DecisionRecommendation,
  type DecisionOverride,
} from "@shared/schema";
import { classifyRegimeFromFDR } from "./regimeConstants";

const POLICY_VERSION = "1.0.0";

export interface PolicyInputs {
  regime: string;
  fdr: number;
  forecastUncertainty: number;
  materialId: string;
  currentOnHand: number;
  avgDemand: number;
  leadTimeDays: number;
  moq?: number;
  packSize?: number;
  maxCapacity?: number;
  dataQualityScore?: number;
}

export interface PolicyRecommendation {
  recommendedQuantity: number;
  recommendedTiming: string;
  preferredSupplierId?: string;
  confidence: number;
  reasoning: string;
}

export interface WhatIfScenario {
  name: string;
  quantity: number;
  timing: string;
  supplierId?: string;
}

export interface WhatIfResult {
  scenario: WhatIfScenario;
  projectedServiceLevel: number;
  stockoutRisk: number;
  cashImpact: number;
  leadTimeRisk: number;
  reasoning: string;
}

export function computePolicyRecommendation(inputs: PolicyInputs): PolicyRecommendation {
  const { regime, forecastUncertainty, currentOnHand, avgDemand, leadTimeDays, moq, packSize, dataQualityScore } = inputs;

  let safetyMultiplier = 1.5;
  if (regime === "DEFLATIONARY") safetyMultiplier = 1.2;
  else if (regime === "INFLATIONARY") safetyMultiplier = 2.0;
  else if (regime === "CRISIS") safetyMultiplier = 2.5;

  if (forecastUncertainty > 0.3) safetyMultiplier *= 1.2;

  const safetyStock = avgDemand * leadTimeDays * (safetyMultiplier - 1);
  const reorderPoint = avgDemand * leadTimeDays + safetyStock;
  let rawQuantity = Math.max(0, reorderPoint - currentOnHand + avgDemand * leadTimeDays);

  if (moq && rawQuantity > 0 && rawQuantity < moq) rawQuantity = moq;
  if (packSize && rawQuantity > 0) rawQuantity = Math.ceil(rawQuantity / packSize) * packSize;

  let timing = "standard";
  if (regime === "DEFLATIONARY") timing = "delay_if_possible";
  else if (regime === "INFLATIONARY") timing = "accelerate";
  else if (regime === "CRISIS") timing = "immediate";

  if (currentOnHand > reorderPoint * 1.5) timing = "defer";

  let confidence = 0.7;
  if (dataQualityScore !== undefined) {
    confidence *= Math.max(0.3, dataQualityScore);
  }
  if (forecastUncertainty > 0.4) confidence *= 0.7;

  const reasoning = `Regime=${regime}, safety_multiplier=${safetyMultiplier.toFixed(2)}, ` +
    `reorder_point=${reorderPoint.toFixed(1)}, safety_stock=${safetyStock.toFixed(1)}, ` +
    `current_onHand=${currentOnHand}, avg_demand=${avgDemand}/day, ` +
    `lead_time=${leadTimeDays}d, forecast_uncertainty=${(forecastUncertainty * 100).toFixed(0)}%`;

  return {
    recommendedQuantity: Math.round(rawQuantity),
    recommendedTiming: timing,
    confidence: Math.max(0.1, Math.min(0.95, confidence)),
    reasoning,
  };
}

export async function generateRecommendation(
  companyId: string,
  materialId: string,
  regime: string,
  fdr: number,
  forecastUncertainty: number,
): Promise<DecisionRecommendation> {
  const [mat] = await db.select().from(materials)
    .where(and(eq(materials.id, materialId), eq(materials.companyId, companyId)));
  if (!mat) throw new Error(`Material ${materialId} not found for company ${companyId}`);

  const smRows = await db.select().from(supplierMaterials).where(eq(supplierMaterials.materialId, materialId));
  const leadTime = smRows.length > 0 ? smRows[0].leadTimeDays : 14;
  const preferredSupplier = smRows.length > 0 ? smRows[0].supplierId : undefined;

  const constraintRows = await db.select().from(materialConstraints)
    .where(and(eq(materialConstraints.companyId, companyId), eq(materialConstraints.materialId, materialId)));
  const constraint = constraintRows[0];

  const dqRows = await db.select().from(dataQualityScores)
    .where(and(eq(dataQualityScores.companyId, companyId), eq(dataQualityScores.entityType, "material"), eq(dataQualityScores.entityId, materialId)))
    .orderBy(desc(dataQualityScores.scoredAt))
    .limit(1);
  const dqScore = dqRows.length > 0 ? dqRows[0].overallScore : undefined;

  const policy = computePolicyRecommendation({
    regime, fdr, forecastUncertainty, materialId,
    currentOnHand: mat.onHand,
    avgDemand: mat.onHand > 0 ? mat.onHand * 0.1 : 5,
    leadTimeDays: leadTime,
    moq: constraint?.moq ?? undefined,
    packSize: constraint?.packSize ?? undefined,
    maxCapacity: constraint?.maxCapacityPerPeriod ?? undefined,
    dataQualityScore: dqScore ?? undefined,
  });

  const [rec] = await db.insert(decisionRecommendations).values({
    companyId,
    recommendationType: "procurement",
    materialId,
    supplierId: preferredSupplier,
    regime,
    recommendedQuantity: policy.recommendedQuantity,
    recommendedTiming: policy.recommendedTiming,
    confidence: policy.confidence,
    reasoning: policy.reasoning,
    inputs: { fdr, forecastUncertainty, onHand: mat.onHand, leadTimeDays: leadTime } as any,
    policyVersion: POLICY_VERSION,
  }).returning();

  return rec;
}

export function computeWhatIf(
  scenario: WhatIfScenario,
  inputs: PolicyInputs,
): WhatIfResult {
  const { currentOnHand, avgDemand, leadTimeDays, regime } = inputs;
  const futureOnHand = currentOnHand + scenario.quantity;
  const demandDuringLead = avgDemand * leadTimeDays;
  const safetyStock = avgDemand * leadTimeDays * 0.5;

  const serviceLevel = Math.min(1.0, futureOnHand / (demandDuringLead + safetyStock));
  const stockoutRisk = Math.max(0, 1 - serviceLevel);

  const smRows: any[] = [];
  const unitCost = smRows.length > 0 ? smRows[0].unitCost : 10;
  const cashImpact = scenario.quantity * unitCost;

  let leadTimeRisk = 0.1;
  if (scenario.timing === "immediate") leadTimeRisk = 0.3;
  else if (scenario.timing === "accelerate") leadTimeRisk = 0.2;
  else if (scenario.timing === "defer") leadTimeRisk = 0.05;

  if (regime === "CRISIS") leadTimeRisk *= 2;

  return {
    scenario,
    projectedServiceLevel: serviceLevel,
    stockoutRisk,
    cashImpact,
    leadTimeRisk: Math.min(1, leadTimeRisk),
    reasoning: `Ordering ${scenario.quantity} units (${scenario.timing}): service_level=${(serviceLevel * 100).toFixed(1)}%, ` +
      `stockout_risk=${(stockoutRisk * 100).toFixed(1)}%, cash_impact=$${cashImpact.toFixed(2)}, ` +
      `lead_time_risk=${(leadTimeRisk * 100).toFixed(1)}%`,
  };
}

export async function logOverride(
  companyId: string,
  userId: string,
  recommendationId: number | null,
  field: string,
  originalValue: string,
  newValue: string,
  reason: string,
  context?: { regime?: string; forecastUncertainty?: number; dataQualityScore?: number },
): Promise<DecisionOverride> {
  const [override] = await db.insert(decisionOverrides).values({
    companyId,
    recommendationId,
    userId,
    overriddenField: field,
    originalValue,
    newValue,
    reason,
    regime: context?.regime,
    forecastUncertainty: context?.forecastUncertainty,
    dataQualityScore: context?.dataQualityScore,
  }).returning();

  return override;
}

export async function getRecommendations(companyId: string, limit: number = 20): Promise<DecisionRecommendation[]> {
  return db.select().from(decisionRecommendations)
    .where(eq(decisionRecommendations.companyId, companyId))
    .orderBy(desc(decisionRecommendations.createdAt))
    .limit(limit);
}

export async function getOverrides(companyId: string, limit: number = 50): Promise<DecisionOverride[]> {
  return db.select().from(decisionOverrides)
    .where(eq(decisionOverrides.companyId, companyId))
    .orderBy(desc(decisionOverrides.createdAt))
    .limit(limit);
}
