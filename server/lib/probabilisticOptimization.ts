import { db } from "../db";
import { eq, and, desc } from "drizzle-orm";
import {
  optimizationRuns,
  materials,
  supplierMaterials,
  materialConstraints,
  dataQualityScores,
  purchaseOrders,
  type OptimizationRun,
} from "@shared/schema";
import { classifyRegimeFromFDR, CANONICAL_REGIME_THRESHOLDS, type Regime } from "./regimeConstants";
import { seededRandom } from "./evaluationHarness";
import { computePolicyRecommendation, computeWhatIf, assertEconomicValidity, type PolicyInputs, type WhatIfScenario } from "./decisionIntelligence";
import { DemandForecaster } from "./forecasting";

export interface OptimizationConfig {
  companyId: string;
  materialId: string;
  regime: string;
  fdr: number;
  forecastUncertainty: number;
  targetServiceLevel?: number;
  demandSamples?: number;
  seed?: number;
}

export interface OptimizationResult {
  optimizedQuantity: number;
  currentPolicyQuantity: number;
  expectedServiceLevel: number;
  expectedCost: number;
  stockoutRisk: number;
  costSavingsVsCurrent: number;
  serviceLevelDelta: number;
  confidenceInterval: { lower: number; upper: number; level: number };
  whatIfComparison: WhatIfComparisonEntry[];
  evidenceBundle: OptimizationEvidence;
}

interface WhatIfComparisonEntry {
  label: string;
  quantity: number;
  serviceLevel: number;
  stockoutRisk: number;
  cashImpact: number;
  reasoning: string;
}

interface OptimizationEvidence {
  provenanceVersion: string;
  optimizerId: string;
  regime: string;
  fdr: number;
  materialId: string;
  companyId: string;
  timestamp: string;
  demandSamples: number;
  seed: number;
  policyInputs: PolicyInputs;
  targetServiceLevel: number;
  unitCostBasis: string;
  demandBasis: string;
}

function generateDemandSamples(avgDemand: number, uncertainty: number, count: number, rng: () => number): number[] {
  const samples: number[] = [];
  for (let i = 0; i < count; i++) {
    const u1 = rng();
    const u2 = rng();
    const z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
    const stdDev = avgDemand * uncertainty;
    const sample = Math.max(0, avgDemand + z * stdDev);
    samples.push(sample);
  }
  return samples;
}

function computeServiceLevel(quantity: number, onHand: number, demandSamples: number[], leadTimeDays: number): number {
  let served = 0;
  for (const d of demandSamples) {
    const totalDemand = d * leadTimeDays;
    if (onHand + quantity >= totalDemand) served++;
  }
  return served / demandSamples.length;
}

function computeStockoutRisk(serviceLevel: number): number {
  return Math.max(0, Math.min(1, 1 - serviceLevel));
}

export function optimizeReorderQuantity(
  inputs: PolicyInputs,
  targetServiceLevel: number,
  demandSampleCount: number,
  seed: number,
): OptimizationResult {
  const rng = seededRandom(seed);
  const { regime, fdr, forecastUncertainty, currentOnHand, avgDemand, leadTimeDays, moq, packSize } = inputs;

  const demandSamples = generateDemandSamples(avgDemand, forecastUncertainty, demandSampleCount, rng);

  const currentPolicy = computePolicyRecommendation(inputs);
  const currentQuantity = currentPolicy.recommendedQuantity;

  const sortedDemands = [...demandSamples].sort((a, b) => a - b);
  const targetIdx = Math.ceil(targetServiceLevel * sortedDemands.length) - 1;
  const targetDemand = sortedDemands[Math.max(0, targetIdx)] * leadTimeDays;
  let rawOptimal = Math.max(0, targetDemand - currentOnHand);

  if (moq && rawOptimal > 0 && rawOptimal < moq) rawOptimal = moq;
  if (packSize && rawOptimal > 0) rawOptimal = Math.ceil(rawOptimal / packSize) * packSize;
  const optimizedQuantity = Math.round(rawOptimal);

  const optServiceLevel = computeServiceLevel(optimizedQuantity, currentOnHand, demandSamples, leadTimeDays);
  const curServiceLevel = computeServiceLevel(currentQuantity, currentOnHand, demandSamples, leadTimeDays);

  // FIX 2 (SF-006): Use real unitCost from inputs; never fallback to hardcoded $10.
  // If unitCost is missing, cost figures are explicitly NaN with a log warning.
  const unitCost = inputs.unitCost ?? null;
  if (!unitCost) {
    console.warn(`[Optimization:AUDIT] MISSING_UNIT_COST for materialId=${inputs.materialId} — expectedCost and costSavings will be NaN`);
  }
  const optCost = unitCost !== null ? optimizedQuantity * unitCost : NaN;
  const curCost = unitCost !== null ? currentQuantity * unitCost : NaN;
  const costSavings = unitCost !== null ? curCost - optCost : NaN;

  const bootstrapQuantities: number[] = [];
  for (let b = 0; b < 100; b++) {
    const resample = demandSamples.map(() => demandSamples[Math.floor(rng() * demandSamples.length)]);
    const sorted = [...resample].sort((a, b) => a - b);
    const idx = Math.ceil(targetServiceLevel * sorted.length) - 1;
    const demand = sorted[Math.max(0, idx)] * leadTimeDays;
    let q = Math.max(0, demand - currentOnHand);
    if (moq && q > 0 && q < moq) q = moq;
    if (packSize && q > 0) q = Math.ceil(q / packSize) * packSize;
    bootstrapQuantities.push(Math.round(q));
  }
  bootstrapQuantities.sort((a, b) => a - b);
  const ciLower = bootstrapQuantities[Math.floor(bootstrapQuantities.length * 0.025)];
  const ciUpper = bootstrapQuantities[Math.floor(bootstrapQuantities.length * 0.975)];

  const scenarios: WhatIfScenario[] = [
    { name: "optimized", quantity: optimizedQuantity, timing: "standard" },
    { name: "current_policy", quantity: currentQuantity, timing: currentPolicy.recommendedTiming },
    { name: "conservative", quantity: Math.round(optimizedQuantity * 1.2), timing: "standard" },
    { name: "aggressive", quantity: Math.round(optimizedQuantity * 0.8), timing: "accelerate" },
  ];

  const whatIfComparison: WhatIfComparisonEntry[] = scenarios.map(s => {
    const result = computeWhatIf(s, inputs);
    return {
      label: s.name,
      quantity: s.quantity,
      serviceLevel: result.projectedServiceLevel,
      stockoutRisk: result.stockoutRisk,
      cashImpact: result.cashImpact,
      reasoning: result.reasoning,
    };
  });

  const evidenceBundle: OptimizationEvidence = {
    provenanceVersion: "4.0.0",
    optimizerId: "probabilistic_reorder_v2",
    regime,
    fdr,
    materialId: inputs.materialId,
    companyId: "",
    timestamp: new Date().toISOString(),
    demandSamples: demandSampleCount,
    seed,
    policyInputs: inputs,
    targetServiceLevel,
    unitCostBasis: unitCost !== null ? "supplied" : "MISSING",
    demandBasis: "supplied_by_caller",
  };

  // FIX 8: Structured audit log
  console.log(JSON.stringify({
    event: "optimize_reorder_quantity",
    materialId: inputs.materialId,
    avgDemand: +avgDemand.toFixed(4),
    unitCost: unitCost ?? null,
    regime,
    safetyMultiplier: null,
    reorderPoint: null,
    optimalQuantity: optimizedQuantity,
    costBasis: unitCost !== null ? "supplied" : "MISSING",
    timestamp: new Date().toISOString(),
  }));

  return {
    optimizedQuantity,
    currentPolicyQuantity: currentQuantity,
    expectedServiceLevel: optServiceLevel,
    expectedCost: optCost,
    stockoutRisk: computeStockoutRisk(optServiceLevel),
    costSavingsVsCurrent: costSavings,
    serviceLevelDelta: optServiceLevel - curServiceLevel,
    confidenceInterval: { lower: ciLower, upper: ciUpper, level: 0.95 },
    whatIfComparison,
    evidenceBundle,
  };
}

export async function runOptimization(config: OptimizationConfig): Promise<OptimizationRun> {
  const { companyId, materialId, regime, fdr, forecastUncertainty, targetServiceLevel = 0.95, demandSamples = 500, seed = 42 } = config;

  const [mat] = await db.select().from(materials)
    .where(and(eq(materials.id, materialId), eq(materials.companyId, companyId)));
  if (!mat) throw new Error(`Material ${materialId} not found for company ${companyId}`);

  const smRows = await db.select().from(supplierMaterials).where(eq(supplierMaterials.materialId, materialId));
  const leadTime = smRows.length > 0 ? smRows[0].leadTimeDays : 14;

  const constraintRows = await db.select().from(materialConstraints)
    .where(and(eq(materialConstraints.companyId, companyId), eq(materialConstraints.materialId, materialId)));
  const constraint = constraintRows[0];

  const dqRows = await db.select().from(dataQualityScores)
    .where(and(eq(dataQualityScores.companyId, companyId), eq(dataQualityScores.entityType, "material"), eq(dataQualityScores.entityId, materialId)))
    .orderBy(desc(dataQualityScores.scoredAt))
    .limit(1);

  // FIX 2 (SF-006): Resolve unit cost from supplierMaterials, fall back to last PO unitPrice.
  let unitCost: number | undefined;
  let unitCostBasis = "none";
  if (smRows.length > 0 && smRows[0].unitCost > 0) {
    unitCost = smRows[0].unitCost;
    unitCostBasis = "supplier_materials";
  } else {
    const [lastPO] = await db.select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.materialId, materialId), eq(purchaseOrders.companyId, companyId)))
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(1);
    if (lastPO?.unitPrice && lastPO.unitPrice > 0) {
      unitCost = lastPO.unitPrice;
      unitCostBasis = "last_purchase_order";
    } else {
      unitCostBasis = "MISSING";
      console.warn(`[Optimization:AUDIT] MISSING_UNIT_COST materialId=${materialId} companyId=${companyId} — cost metrics will be NaN`);
    }
  }

  // FIX 1 (SF-001): Derive avgDemand from real demand history, not onHand * 0.1
  let avgDemand: number;
  let demandBasis = "none";
  const demandHistoryValues = await DemandForecaster.getDemandHistory(materialId);
  if (demandHistoryValues.length >= 3) {
    avgDemand = DemandForecaster.calculateAverageDemand(demandHistoryValues);
    demandBasis = `demand_history_${demandHistoryValues.length}_periods`;
  } else {
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
      avgDemand = mat.onHand > 0 ? mat.onHand * 0.1 : 5;
      demandBasis = "FALLBACK_onHand_0.1_UNRELIABLE";
      console.warn(`[Optimization:AUDIT] DEMAND_FALLBACK materialId=${materialId} — using onHand*0.1=${avgDemand.toFixed(2)}. This is unreliable.`);
    }
  }

  // FIX 8: Pre-computation audit log
  console.log(JSON.stringify({
    event: "run_optimization",
    materialId,
    companyId,
    avgDemand: +avgDemand.toFixed(4),
    demandBasis,
    unitCost: unitCost ?? null,
    costBasis: unitCostBasis,
    regime,
    leadTimeDays: leadTime,
    timestamp: new Date().toISOString(),
  }));

  const policyInputs: PolicyInputs = {
    regime,
    fdr,
    forecastUncertainty,
    materialId,
    currentOnHand: mat.onHand,
    avgDemand,
    leadTimeDays: leadTime,
    unitCost,
    moq: constraint?.moq ?? undefined,
    packSize: constraint?.packSize ?? undefined,
    maxCapacity: constraint?.maxCapacityPerPeriod ?? undefined,
    dataQualityScore: dqRows.length > 0 ? dqRows[0].overallScore : undefined,
  };

  const result = optimizeReorderQuantity(policyInputs, targetServiceLevel, demandSamples, seed);
  result.evidenceBundle.companyId = companyId;
  result.evidenceBundle.unitCostBasis = unitCostBasis;
  result.evidenceBundle.demandBasis = demandBasis;

  const [run] = await db.insert(optimizationRuns).values({
    companyId,
    materialId,
    regime,
    optimizedQuantity: result.optimizedQuantity,
    currentPolicyQuantity: result.currentPolicyQuantity,
    expectedServiceLevel: result.expectedServiceLevel,
    expectedCost: result.expectedCost,
    stockoutRisk: result.stockoutRisk,
    costSavingsVsCurrent: result.costSavingsVsCurrent,
    serviceLevelDelta: result.serviceLevelDelta,
    confidenceInterval: result.confidenceInterval as any,
    evidenceBundle: result.evidenceBundle as any,
    whatIfComparison: result.whatIfComparison as any,
    policyInputs: policyInputs as any,
  }).returning();

  return run;
}

export async function getOptimizationRuns(companyId: string, limit: number = 20): Promise<OptimizationRun[]> {
  return db.select().from(optimizationRuns)
    .where(eq(optimizationRuns.companyId, companyId))
    .orderBy(desc(optimizationRuns.createdAt))
    .limit(limit);
}
