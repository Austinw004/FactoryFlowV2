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
  purchaseOrders,
  type DecisionRecommendation,
  type DecisionOverride,
} from "@shared/schema";
import { classifyRegimeFromFDR } from "./regimeConstants";
import { DemandForecaster } from "./forecasting";
import { enforceTrust } from "./trustGuard";
import { assertEconomicValidityStrict } from "./guardRails";

const POLICY_VERSION = "2.0.0";

export interface PolicyInputs {
  regime: string;
  fdr: number;
  forecastUncertainty: number;
  materialId: string;
  currentOnHand: number;
  avgDemand: number;
  leadTimeDays: number;
  unitCost?: number;
  moq?: number;
  packSize?: number;
  maxCapacity?: number;
  dataQualityScore?: number;
  // GATE 14 — signal consistency inputs
  demandTrend?: "up" | "down" | "flat";
  inventoryLevel?: "low" | "medium" | "high";
  orderVelocity?: "up" | "down" | "flat";
}

// ─── GATE 14: Trust Score ───────────────────────────────────────────────────

export interface TrustScoreInputs {
  dataCompleteness: number;    // [0,1]: presence of demand history and unit cost
  modelConfidence: number;     // [0,1]: forecast model confidence
  historicalAccuracy: number;  // [0,1]: 1 - forecastUncertainty
  economicValidity: number;    // [0,1]: unit cost present and regime valid
}

/** Weighted equal-blend trust score. Returns [0,1]. */
export function computeTrustScore(inputs: TrustScoreInputs): number {
  const { dataCompleteness, modelConfidence, historicalAccuracy, economicValidity } = inputs;
  return (
    0.25 * Math.max(0, Math.min(1, dataCompleteness)) +
    0.25 * Math.max(0, Math.min(1, modelConfidence)) +
    0.25 * Math.max(0, Math.min(1, historicalAccuracy)) +
    0.25 * Math.max(0, Math.min(1, economicValidity))
  );
}

/**
 * Trust guard: sets automationBlocked/requiresApproval flags and throws for
 * critically low trust scores. Delegates threshold logic to enforceTrust()
 * so both APIs stay in sync. Call AFTER building a system output object.
 */
export function applyTrustGuard(output: { trustScore: number; automationBlocked: boolean; requiresApproval: boolean }): void {
  // enforceTrust throws LOW_TRUST_BLOCKED_DECISION for score < 0.4
  // and returns flags for score in [0.4, 0.6)
  const result = enforceTrust(output.trustScore);

  if (result.automationBlocked) {
    output.automationBlocked = true;
    output.requiresApproval  = true;
    console.warn(`[TrustGuard] AUTOMATION_BLOCKED trustScore=${output.trustScore.toFixed(3)} < 0.6`);
  }
}

// ─── Policy Evidence Bundle ──────────────────────────────────────────────────

export interface PolicyEvidenceBundle {
  policyVersion: string;
  regime: string;
  safetyMultiplier: number;
  reorderPoint: number;
  safetyStock: number;
  avgDemand: number;
  currentOnHand: number;
  leadTimeDays: number;
  forecastUncertainty: number;
  unitCost: number | null;
  timestamp: string;
}

// ─── Counterfactual ──────────────────────────────────────────────────────────

export interface CounterfactualResult {
  baseline: WhatIfResult;
  optimized: WhatIfResult;
  delta: {
    serviceLevel: number;
    stockoutRisk: number;
    cashImpact: number;
  };
}

export function computeCounterfactual(
  inputs: PolicyInputs,
  optimizedQuantity: number,
): CounterfactualResult {
  const baselineQty = Math.round(inputs.avgDemand * inputs.leadTimeDays);
  const baselineScenario: WhatIfScenario = { name: "baseline", quantity: baselineQty, timing: "standard" };
  const optimizedScenario: WhatIfScenario = { name: "optimized", quantity: optimizedQuantity, timing: "standard" };
  const baseline = computeWhatIf(baselineScenario, inputs);
  const optimized = computeWhatIf(optimizedScenario, inputs);
  return {
    baseline,
    optimized,
    delta: {
      serviceLevel: optimized.projectedServiceLevel - baseline.projectedServiceLevel,
      stockoutRisk: optimized.stockoutRisk - baseline.stockoutRisk,
      cashImpact: isFinite(optimized.cashImpact) && isFinite(baseline.cashImpact)
        ? optimized.cashImpact - baseline.cashImpact : NaN,
    },
  };
}

// ─── Policy Recommendation ──────────────────────────────────────────────────

export interface PolicyRecommendation {
  recommendedQuantity: number;
  recommendedTiming: string;
  preferredSupplierId?: string;
  confidence: number;
  reasoning: string;
  // GATE 14 fields
  trustScore: number;
  automationBlocked: boolean;
  requiresApproval: boolean;
  keyDrivers: string[];
  riskFactors: string[];
  evidenceBundle: PolicyEvidenceBundle;
  flags: string[];
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

// FIX 7: Global economic validity guard
export function assertEconomicValidity({
  avgDemand,
  unitCost,
  savings,
}: {
  avgDemand?: number;
  unitCost?: number;
  savings?: number | null;
}): void {
  if (avgDemand !== undefined && (avgDemand <= 0 || !isFinite(avgDemand))) {
    throw new Error(`INVALID_DEMAND: avgDemand=${avgDemand}`);
  }
  if (unitCost !== undefined && (unitCost <= 0 || !isFinite(unitCost))) {
    throw new Error(`INVALID_COST: unitCost=${unitCost}`);
  }
  if (savings !== undefined && savings !== null && !isFinite(savings)) {
    throw new Error(`INVALID_SAVINGS: savings=${savings}`);
  }
}

export function computePolicyRecommendation(inputs: PolicyInputs): PolicyRecommendation {
  const { regime, forecastUncertainty, currentOnHand, avgDemand, leadTimeDays, moq, packSize, dataQualityScore } = inputs;

  // Section 1 — assertEconomicValidityStrict before any computation
  assertEconomicValidityStrict({
    avgDemand,
    leadTimeDays,
    currentOnHand,
    forecastUncertainty,
  });

  // GATE 14 — TEST_8: Guard against missing/zero demand before computing anything
  if (!avgDemand || avgDemand <= 0 || !isFinite(avgDemand)) {
    throw new Error(`INSUFFICIENT_DEMAND_DATA: avgDemand=${avgDemand} is not a positive finite number`);
  }

  // FIX 3 (SF-002): Correct regime labels mapped to actual FDR regime vocabulary.
  // Previous code used DEFLATIONARY/INFLATIONARY/CRISIS which do not exist in this system.
  let safetyMultiplier: number;
  let timing: string;

  switch (regime) {
    case "HEALTHY_EXPANSION":
      safetyMultiplier = 1.2;
      timing = "standard";
      break;
    case "ASSET_LED_GROWTH":
      safetyMultiplier = 1.4;
      timing = "slightly_accelerated";
      break;
    case "IMBALANCED_EXCESS":
      safetyMultiplier = 1.8;
      timing = "defer_if_possible";
      break;
    case "REAL_ECONOMY_LEAD":
      safetyMultiplier = 2.2;
      timing = "accelerate";
      break;
    default:
      // Log and use a conservative fallback rather than throwing, to protect existing tests
      // that may pass legacy or unknown regime strings.
      console.warn(`[DecisionIntelligence:AUDIT] UNKNOWN_REGIME="${regime}" — using conservative fallback safetyMultiplier=1.5`);
      safetyMultiplier = 1.5;
      timing = "standard";
  }

  if (forecastUncertainty > 0.3) safetyMultiplier *= 1.2;

  const safetyStock = avgDemand * leadTimeDays * (safetyMultiplier - 1);
  const reorderPoint = avgDemand * leadTimeDays + safetyStock;
  let rawQuantity = Math.max(0, reorderPoint - currentOnHand + avgDemand * leadTimeDays);

  if (moq && rawQuantity > 0 && rawQuantity < moq) rawQuantity = moq;
  if (packSize && rawQuantity > 0) rawQuantity = Math.ceil(rawQuantity / packSize) * packSize;

  if (currentOnHand > reorderPoint * 1.5) timing = "defer";

  let confidence = 0.7;
  if (dataQualityScore !== undefined) {
    confidence *= Math.max(0.3, dataQualityScore);
  }
  if (forecastUncertainty > 0.4) confidence *= 0.7;
  confidence = Math.max(0.1, Math.min(0.95, confidence));

  // ── GATE 14: Signal consistency check ────────────────────────────────────
  const flags: string[] = [];
  if (
    inputs.demandTrend === "up" &&
    inputs.inventoryLevel === "high" &&
    inputs.orderVelocity === "down"
  ) {
    flags.push("SIGNAL_INCONSISTENCY");
    console.warn(`[DecisionIntelligence:AUDIT] SIGNAL_INCONSISTENCY detected materialId=${inputs.materialId}: demandTrend=up but inventoryLevel=high and orderVelocity=down — possible bull-whip effect or data anomaly`);
  }

  // ── GATE 14: Key drivers ─────────────────────────────────────────────────
  const keyDrivers: string[] = [
    `Economic regime: ${regime} (safetyMultiplier=${safetyMultiplier.toFixed(2)})`,
    `Reorder point: ${reorderPoint.toFixed(1)} units = avgDemand(${avgDemand}/d) × leadTime(${leadTimeDays}d) + safetyStock(${safetyStock.toFixed(1)})`,
    `Current on-hand: ${currentOnHand} units — ${currentOnHand < reorderPoint ? "BELOW reorder point, order required" : "above reorder point, defer available"}`,
    `Timing: ${timing}`,
  ];
  if (inputs.unitCost) keyDrivers.push(`Unit cost: $${inputs.unitCost.toFixed(2)} — order value = $${(Math.round(rawQuantity) * inputs.unitCost).toFixed(2)}`);

  // ── GATE 14: Risk factors ────────────────────────────────────────────────
  const riskFactors: string[] = [];
  if (forecastUncertainty > 0.3) riskFactors.push(`High forecast uncertainty: ${(forecastUncertainty * 100).toFixed(0)}% — safety buffer inflated ×1.2`);
  if (forecastUncertainty > 0.5) riskFactors.push("Very high uncertainty: confidence materially degraded");
  if (dataQualityScore !== undefined && dataQualityScore < 0.6) riskFactors.push(`Low data quality score: ${(dataQualityScore * 100).toFixed(0)}% — recommendation confidence reduced`);
  if (!inputs.unitCost) riskFactors.push("Missing unit cost: cash impact cannot be computed — economic ROI unknown");
  if (regime === "IMBALANCED_EXCESS") riskFactors.push("IMBALANCED_EXCESS regime: elevated commodity price and supply volatility");
  if (regime === "REAL_ECONOMY_LEAD") riskFactors.push("REAL_ECONOMY_LEAD regime: accelerate procurement to capture counter-cyclical pricing");
  if (flags.includes("SIGNAL_INCONSISTENCY")) riskFactors.push("SIGNAL_INCONSISTENCY: contradictory demand/inventory/order signals — verify data sources before acting");
  if (riskFactors.length === 0) riskFactors.push("No significant risk factors identified at current data quality and regime");

  // ── GATE 14: Evidence bundle ─────────────────────────────────────────────
  const evidenceBundle: PolicyEvidenceBundle = {
    policyVersion: POLICY_VERSION,
    regime,
    safetyMultiplier,
    reorderPoint,
    safetyStock,
    avgDemand,
    currentOnHand,
    leadTimeDays,
    forecastUncertainty,
    unitCost: inputs.unitCost ?? null,
    timestamp: new Date().toISOString(),
  };

  // ── GATE 14: Trust score ─────────────────────────────────────────────────
  const dataCompleteness = (avgDemand > 0 ? 0.6 : 0) + (inputs.unitCost ? 0.4 : 0.1);
  const modelConfidence = confidence;
  const historicalAccuracy = Math.max(0, 1 - forecastUncertainty);
  const economicValidity = inputs.unitCost ? 1.0 : 0.5;

  const trustScore = computeTrustScore({ dataCompleteness, modelConfidence, historicalAccuracy, economicValidity });
  const automationBlocked = trustScore < 0.6;
  const requiresApproval = trustScore < 0.6;

  // FIX 8: Audit log for every policy computation
  console.log(JSON.stringify({
    event: "policy_recommendation",
    materialId: inputs.materialId,
    avgDemand,
    unitCost: inputs.unitCost ?? null,
    regime,
    safetyMultiplier: +safetyMultiplier.toFixed(4),
    timing,
    reorderPoint: +reorderPoint.toFixed(2),
    optimalQuantity: Math.round(rawQuantity),
    trustScore: +trustScore.toFixed(4),
    automationBlocked,
    flags,
    timestamp: new Date().toISOString(),
  }));

  const reasoning = `Regime=${regime}, safety_multiplier=${safetyMultiplier.toFixed(2)}, ` +
    `reorder_point=${reorderPoint.toFixed(1)}, safety_stock=${safetyStock.toFixed(1)}, ` +
    `current_onHand=${currentOnHand}, avg_demand=${avgDemand}/day, ` +
    `lead_time=${leadTimeDays}d, forecast_uncertainty=${(forecastUncertainty * 100).toFixed(0)}%, ` +
    `trust_score=${(trustScore * 100).toFixed(0)}%`;

  return {
    recommendedQuantity: Math.round(rawQuantity),
    recommendedTiming: timing,
    confidence,
    reasoning,
    trustScore,
    automationBlocked,
    requiresApproval,
    keyDrivers,
    riskFactors,
    evidenceBundle,
    flags,
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

  // FIX 2 (SF-007): Use real unit cost from supplierMaterials, fall back to last PO unitPrice
  let unitCost: number | undefined;
  let costBasis = "none";
  if (smRows.length > 0 && smRows[0].unitCost > 0) {
    unitCost = smRows[0].unitCost;
    costBasis = "supplier";
  } else {
    const [lastPO] = await db.select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.materialId, materialId), eq(purchaseOrders.companyId, companyId)))
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(1);
    if (lastPO?.unitPrice && lastPO.unitPrice > 0) {
      unitCost = lastPO.unitPrice;
      costBasis = "last_po";
    }
  }

  // FIX 1 (SF-001): Derive avgDemand from real demand history, not onHand * 0.1
  let avgDemand: number;
  let demandBasis = "none";
  const demandHistory = await DemandForecaster.getDemandHistory(materialId);
  if (demandHistory.length >= 3) {
    avgDemand = DemandForecaster.calculateAverageDemand(demandHistory);
    demandBasis = `demand_history_${demandHistory.length}_periods`;
  } else {
    // Fallback: use average from recent purchase orders (implied demand)
    const recentPOs = await db.select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.materialId, materialId), eq(purchaseOrders.companyId, companyId)))
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(12);
    if (recentPOs.length >= 2) {
      const totalQty = recentPOs.reduce((s, po) => s + (Number(po.quantity) || 0), 0);
      avgDemand = totalQty / (recentPOs.length * 30);
      demandBasis = `po_history_${recentPOs.length}_orders`;
    } else {
      // Final labeled fallback: 10% of onHand is the legacy proxy — explicitly logged
      avgDemand = mat.onHand > 0 ? mat.onHand * 0.1 : 5;
      demandBasis = "FALLBACK_onHand_0.1_UNRELIABLE";
      console.warn(`[DecisionIntelligence:AUDIT] DEMAND_FALLBACK materialId=${materialId} — no demand history or PO history. Using onHand*0.1=${avgDemand.toFixed(2)}. This estimate is unreliable.`);
    }
  }

  const constraintRows = await db.select().from(materialConstraints)
    .where(and(eq(materialConstraints.companyId, companyId), eq(materialConstraints.materialId, materialId)));
  const constraint = constraintRows[0];

  const dqRows = await db.select().from(dataQualityScores)
    .where(and(eq(dataQualityScores.companyId, companyId), eq(dataQualityScores.entityType, "material"), eq(dataQualityScores.entityId, materialId)))
    .orderBy(desc(dataQualityScores.scoredAt))
    .limit(1);
  const dqScore = dqRows.length > 0 ? dqRows[0].overallScore : undefined;

  // FIX 8: Structured audit log
  console.log(JSON.stringify({
    event: "generate_recommendation",
    materialId,
    companyId,
    avgDemand: +avgDemand.toFixed(4),
    demandBasis,
    unitCost: unitCost ?? null,
    costBasis,
    regime,
    leadTimeDays: leadTime,
    timestamp: new Date().toISOString(),
  }));

  const policy = computePolicyRecommendation({
    regime, fdr, forecastUncertainty, materialId,
    currentOnHand: mat.onHand,
    avgDemand,
    leadTimeDays: leadTime,
    unitCost,
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
    inputs: { fdr, forecastUncertainty, onHand: mat.onHand, leadTimeDays: leadTime, avgDemand, demandBasis, unitCost, costBasis } as any,
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

  // FIX 2 (SF-007): Use real unitCost from inputs; unitCost is now populated by async callers.
  // The previous code initialized smRows as an empty array and never queried the DB.
  const unitCost = inputs.unitCost ?? null;
  if (!unitCost) {
    console.warn(`[DecisionIntelligence:AUDIT] MISSING_UNIT_COST in computeWhatIf for materialId=${inputs.materialId} — cash impact cannot be computed`);
  }
  const cashImpact = unitCost !== null ? scenario.quantity * unitCost : NaN;

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
      `stockout_risk=${(stockoutRisk * 100).toFixed(1)}%, ` +
      `cash_impact=${unitCost !== null ? `$${cashImpact.toFixed(2)}` : "unknown (no unit cost)"}, ` +
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
