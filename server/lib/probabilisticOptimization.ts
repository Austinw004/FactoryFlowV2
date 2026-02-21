import { db } from "../db";
import { eq, and, desc } from "drizzle-orm";
import {
  optimizationRuns,
  materials,
  supplierMaterials,
  materialConstraints,
  dataQualityScores,
  type OptimizationRun,
} from "@shared/schema";
import { classifyRegimeFromFDR, CANONICAL_REGIME_THRESHOLDS, type Regime } from "./regimeConstants";
import { seededRandom } from "./evaluationHarness";
import { computePolicyRecommendation, computeWhatIf, type PolicyInputs, type WhatIfScenario } from "./decisionIntelligence";

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

  const unitCost = 10;
  const optCost = optimizedQuantity * unitCost;
  const curCost = currentQuantity * unitCost;
  const costSavings = curCost - optCost;

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
    provenanceVersion: "3.0.0",
    optimizerId: "probabilistic_reorder_v1",
    regime,
    fdr,
    materialId: inputs.materialId,
    companyId: "",
    timestamp: new Date().toISOString(),
    demandSamples: demandSampleCount,
    seed,
    policyInputs: inputs,
    targetServiceLevel,
  };

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

  const policyInputs: PolicyInputs = {
    regime,
    fdr,
    forecastUncertainty,
    materialId,
    currentOnHand: mat.onHand,
    avgDemand: mat.onHand > 0 ? mat.onHand * 0.1 : 5,
    leadTimeDays: leadTime,
    moq: constraint?.moq ?? undefined,
    packSize: constraint?.packSize ?? undefined,
    maxCapacity: constraint?.maxCapacityPerPeriod ?? undefined,
    dataQualityScore: dqRows.length > 0 ? dqRows[0].overallScore : undefined,
  };

  const result = optimizeReorderQuantity(policyInputs, targetServiceLevel, demandSamples, seed);
  result.evidenceBundle.companyId = companyId;

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
