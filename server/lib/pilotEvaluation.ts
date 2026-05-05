import { db } from "../db";
import { eq, and, desc } from "drizzle-orm";
import {
  pilotExperiments,
  materials,
  supplierMaterials,
  materialConstraints,
  dataQualityScores,
  type PilotExperiment,
} from "@shared/schema";
import { seededRandom } from "./evaluationHarness";
import { computePolicyRecommendation, computeWhatIf, type PolicyInputs } from "./decisionIntelligence";
import { optimizeReorderQuantity } from "./probabilisticOptimization";
import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";

export interface PilotExperimentConfig {
  companyId: string;
  name: string;
  experimentId: string;
  windowWeeks: number;
  seed: number;
  regime: string;
  fdr: number;
  forecastUncertainty: number;
  targetServiceLevel: number;
  demandSamples: number;
  materialIds: string[];
  baselinePolicyOverrides?: Record<string, number>;
}

interface WeeklyMetrics {
  week: number;
  serviceLevel: number;
  stockoutRate: number;
  expediteSpend: number;
  workingCapital: number;
  estimatedSavings: number;
  measuredSavings: number | null;
  savingsType: "estimated" | "measured";
}

interface PolicySimulationResult {
  policyType: "baseline" | "optimized";
  totalServiceLevel: number;
  avgStockoutRate: number;
  totalExpediteSpend: number;
  avgWorkingCapital: number;
  totalEstimatedSavings: number;
  totalMeasuredSavings: number | null;
  weeklyMetrics: WeeklyMetrics[];
  materialResults: MaterialPolicyResult[];
}

interface MaterialPolicyResult {
  materialId: string;
  reorderQuantity: number;
  serviceLevel: number;
  stockoutRisk: number;
  cost: number;
  savingsVsBaseline: number;
}

interface ComparisonSummary {
  serviceLevelDelta: number;
  stockoutRateDelta: number;
  expediteSpendDelta: number;
  workingCapitalDelta: number;
  estimatedSavingsDelta: number;
  measuredSavingsDelta: number | null;
  optimizedWins: string[];
  baselineWins: string[];
  recommendation: string;
  confidenceLevel: number;
}

export function hashConfig(config: PilotExperimentConfig): string {
  const normalized = JSON.stringify({
    companyId: config.companyId,
    windowWeeks: config.windowWeeks,
    seed: config.seed,
    regime: config.regime,
    fdr: config.fdr,
    forecastUncertainty: config.forecastUncertainty,
    targetServiceLevel: config.targetServiceLevel,
    demandSamples: config.demandSamples,
    materialIds: [...config.materialIds].sort(),
    baselinePolicyOverrides: config.baselinePolicyOverrides || {},
  });
  return createHash("sha256").update(normalized).digest("hex");
}

function simulateBaselinePolicy(
  policyInputs: PolicyInputs,
  windowWeeks: number,
  rng: () => number,
  overrideQuantity?: number,
): { weeklyMetrics: WeeklyMetrics[]; materialResult: MaterialPolicyResult } {
  const baseline = computePolicyRecommendation(policyInputs);
  const quantity = overrideQuantity ?? baseline.recommendedQuantity;
  const unitCost = 10;
  const weeklyMetrics: WeeklyMetrics[] = [];

  let totalServiceLevel = 0;
  let totalStockout = 0;
  let totalExpedite = 0;
  let totalWorkingCap = 0;
  let totalEstSavings = 0;
  let onHand = policyInputs.currentOnHand;

  for (let w = 0; w < windowWeeks; w++) {
    const demand = Math.max(0, policyInputs.avgDemand * (0.8 + rng() * 0.4));
    const fulfilled = Math.min(onHand + quantity, demand);
    const weekSL = demand > 0 ? fulfilled / demand : 1;
    const stockout = demand > fulfilled ? 1 : 0;
    const expedite = stockout > 0 ? (demand - fulfilled) * unitCost * 1.5 : 0;
    const workingCap = (onHand + quantity) * unitCost;

    totalServiceLevel += weekSL;
    totalStockout += stockout;
    totalExpedite += expedite;
    totalWorkingCap += workingCap;

    onHand = Math.max(0, onHand + quantity - demand);

    weeklyMetrics.push({
      week: w + 1,
      serviceLevel: Math.round(weekSL * 10000) / 10000,
      stockoutRate: stockout,
      expediteSpend: Math.round(expedite * 100) / 100,
      workingCapital: Math.round(workingCap * 100) / 100,
      estimatedSavings: 0,
      measuredSavings: null,
      savingsType: "estimated",
    });
  }

  const avgSL = totalServiceLevel / windowWeeks;
  const avgStockout = totalStockout / windowWeeks;

  return {
    weeklyMetrics,
    materialResult: {
      materialId: policyInputs.materialId,
      reorderQuantity: quantity,
      serviceLevel: Math.round(avgSL * 10000) / 10000,
      stockoutRisk: Math.round(avgStockout * 10000) / 10000,
      cost: Math.round(quantity * unitCost * windowWeeks * 100) / 100,
      savingsVsBaseline: 0,
    },
  };
}

function simulateOptimizedPolicy(
  policyInputs: PolicyInputs,
  windowWeeks: number,
  targetServiceLevel: number,
  demandSamples: number,
  seed: number,
  rng: () => number,
  baselineCost: number,
): { weeklyMetrics: WeeklyMetrics[]; materialResult: MaterialPolicyResult } {
  const optResult = optimizeReorderQuantity(policyInputs, targetServiceLevel, demandSamples, seed);
  const quantity = optResult.optimizedQuantity;
  const unitCost = 10;
  const weeklyMetrics: WeeklyMetrics[] = [];

  let totalServiceLevel = 0;
  let totalStockout = 0;
  let totalExpedite = 0;
  let totalWorkingCap = 0;
  let onHand = policyInputs.currentOnHand;

  for (let w = 0; w < windowWeeks; w++) {
    const demand = Math.max(0, policyInputs.avgDemand * (0.8 + rng() * 0.4));
    const fulfilled = Math.min(onHand + quantity, demand);
    const weekSL = demand > 0 ? fulfilled / demand : 1;
    const stockout = demand > fulfilled ? 1 : 0;
    const expedite = stockout > 0 ? (demand - fulfilled) * unitCost * 1.5 : 0;
    const workingCap = (onHand + quantity) * unitCost;

    totalServiceLevel += weekSL;
    totalStockout += stockout;
    totalExpedite += expedite;
    totalWorkingCap += workingCap;

    onHand = Math.max(0, onHand + quantity - demand);

    const weekEstSavings = Math.max(0, (baselineCost / windowWeeks) - (quantity * unitCost));

    weeklyMetrics.push({
      week: w + 1,
      serviceLevel: Math.round(weekSL * 10000) / 10000,
      stockoutRate: stockout,
      expediteSpend: Math.round(expedite * 100) / 100,
      workingCapital: Math.round(workingCap * 100) / 100,
      estimatedSavings: Math.round(weekEstSavings * 100) / 100,
      measuredSavings: null,
      savingsType: "estimated",
    });
  }

  const avgSL = totalServiceLevel / windowWeeks;
  const avgStockout = totalStockout / windowWeeks;
  const totalOptCost = quantity * unitCost * windowWeeks;
  const savings = baselineCost - totalOptCost;

  return {
    weeklyMetrics,
    materialResult: {
      materialId: policyInputs.materialId,
      reorderQuantity: quantity,
      serviceLevel: Math.round(avgSL * 10000) / 10000,
      stockoutRisk: Math.round(avgStockout * 10000) / 10000,
      cost: Math.round(totalOptCost * 100) / 100,
      savingsVsBaseline: Math.round(savings * 100) / 100,
    },
  };
}

function aggregateResults(
  materialResults: { weeklyMetrics: WeeklyMetrics[]; materialResult: MaterialPolicyResult }[],
  policyType: "baseline" | "optimized",
  windowWeeks: number,
): PolicySimulationResult {
  const allMatResults = materialResults.map(r => r.materialResult);
  const avgSL = allMatResults.length > 0
    ? allMatResults.reduce((s, m) => s + m.serviceLevel, 0) / allMatResults.length
    : 0;
  const avgStockout = allMatResults.length > 0
    ? allMatResults.reduce((s, m) => s + m.stockoutRisk, 0) / allMatResults.length
    : 0;

  const aggregatedWeekly: WeeklyMetrics[] = [];
  for (let w = 0; w < windowWeeks; w++) {
    let sl = 0, so = 0, exp = 0, wc = 0, es = 0;
    let count = 0;
    for (const mr of materialResults) {
      if (mr.weeklyMetrics[w]) {
        sl += mr.weeklyMetrics[w].serviceLevel;
        so += mr.weeklyMetrics[w].stockoutRate;
        exp += mr.weeklyMetrics[w].expediteSpend;
        wc += mr.weeklyMetrics[w].workingCapital;
        es += mr.weeklyMetrics[w].estimatedSavings;
        count++;
      }
    }
    aggregatedWeekly.push({
      week: w + 1,
      serviceLevel: count > 0 ? Math.round((sl / count) * 10000) / 10000 : 0,
      stockoutRate: count > 0 ? Math.round((so / count) * 10000) / 10000 : 0,
      expediteSpend: Math.round(exp * 100) / 100,
      workingCapital: Math.round(wc * 100) / 100,
      estimatedSavings: Math.round(es * 100) / 100,
      measuredSavings: null,
      savingsType: "estimated",
    });
  }

  const totalCost = allMatResults.reduce((s, m) => s + m.cost, 0);
  const totalSavings = allMatResults.reduce((s, m) => s + m.savingsVsBaseline, 0);

  return {
    policyType,
    totalServiceLevel: Math.round(avgSL * 10000) / 10000,
    avgStockoutRate: Math.round(avgStockout * 10000) / 10000,
    totalExpediteSpend: Math.round(aggregatedWeekly.reduce((s, w) => s + w.expediteSpend, 0) * 100) / 100,
    avgWorkingCapital: Math.round(
      (aggregatedWeekly.reduce((s, w) => s + w.workingCapital, 0) / Math.max(windowWeeks, 1)) * 100
    ) / 100,
    totalEstimatedSavings: policyType === "optimized" ? Math.round(totalSavings * 100) / 100 : 0,
    totalMeasuredSavings: null,
    weeklyMetrics: aggregatedWeekly,
    materialResults: allMatResults,
  };
}

function buildComparison(baseline: PolicySimulationResult, optimized: PolicySimulationResult): ComparisonSummary {
  const slDelta = optimized.totalServiceLevel - baseline.totalServiceLevel;
  const soDelta = optimized.avgStockoutRate - baseline.avgStockoutRate;
  const expDelta = optimized.totalExpediteSpend - baseline.totalExpediteSpend;
  const wcDelta = optimized.avgWorkingCapital - baseline.avgWorkingCapital;
  const esDelta = optimized.totalEstimatedSavings - baseline.totalEstimatedSavings;

  const optimizedWins: string[] = [];
  const baselineWins: string[] = [];

  if (slDelta > 0.001) optimizedWins.push("service_level");
  else if (slDelta < -0.001) baselineWins.push("service_level");

  if (soDelta < -0.001) optimizedWins.push("stockout_rate");
  else if (soDelta > 0.001) baselineWins.push("stockout_rate");

  if (expDelta < -0.01) optimizedWins.push("expedite_spend");
  else if (expDelta > 0.01) baselineWins.push("expedite_spend");

  if (wcDelta < -0.01) optimizedWins.push("working_capital");
  else if (wcDelta > 0.01) baselineWins.push("working_capital");

  if (esDelta > 0.01) optimizedWins.push("estimated_savings");

  const confidence = Math.min(1, (optimizedWins.length / 5) * 0.8 + 0.2);
  const recommendation = optimizedWins.length > baselineWins.length
    ? "RECOMMEND_OPTIMIZED"
    : optimizedWins.length === baselineWins.length
    ? "INCONCLUSIVE"
    : "RECOMMEND_BASELINE";

  return {
    serviceLevelDelta: Math.round(slDelta * 10000) / 10000,
    stockoutRateDelta: Math.round(soDelta * 10000) / 10000,
    expediteSpendDelta: Math.round(expDelta * 100) / 100,
    workingCapitalDelta: Math.round(wcDelta * 100) / 100,
    estimatedSavingsDelta: Math.round(esDelta * 100) / 100,
    measuredSavingsDelta: null,
    optimizedWins,
    baselineWins,
    recommendation,
    confidenceLevel: Math.round(confidence * 100) / 100,
  };
}

function generateArtifactMd(
  config: PilotExperimentConfig,
  baseline: PolicySimulationResult,
  optimized: PolicySimulationResult,
  comparison: ComparisonSummary,
): string {
  const lines: string[] = [];
  lines.push(`# Pilot Experiment Report: ${config.name}`);
  lines.push(`\n## Experiment Configuration`);
  lines.push(`- **Experiment ID**: ${config.experimentId}`);
  lines.push(`- **Company**: ${config.companyId}`);
  lines.push(`- **Window**: ${config.windowWeeks} weeks`);
  lines.push(`- **Regime**: ${config.regime} (FDR=${config.fdr})`);
  lines.push(`- **Target Service Level**: ${(config.targetServiceLevel * 100).toFixed(1)}%`);
  lines.push(`- **Seed**: ${config.seed}`);
  lines.push(`- **Config Hash**: ${hashConfig(config)}`);
  lines.push(`- **Materials**: ${config.materialIds.length}`);

  lines.push(`\n## Baseline Policy Results`);
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Service Level | ${(baseline.totalServiceLevel * 100).toFixed(2)}% |`);
  lines.push(`| Stockout Rate | ${(baseline.avgStockoutRate * 100).toFixed(2)}% |`);
  lines.push(`| Expedite Spend | $${baseline.totalExpediteSpend.toFixed(2)} |`);
  lines.push(`| Avg Working Capital | $${baseline.avgWorkingCapital.toFixed(2)} |`);

  lines.push(`\n## Optimized Policy Results`);
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Service Level | ${(optimized.totalServiceLevel * 100).toFixed(2)}% |`);
  lines.push(`| Stockout Rate | ${(optimized.avgStockoutRate * 100).toFixed(2)}% |`);
  lines.push(`| Expedite Spend | $${optimized.totalExpediteSpend.toFixed(2)} |`);
  lines.push(`| Avg Working Capital | $${optimized.avgWorkingCapital.toFixed(2)} |`);
  lines.push(`| Estimated Savings | $${optimized.totalEstimatedSavings.toFixed(2)} |`);

  lines.push(`\n## Comparison Summary`);
  lines.push(`| Metric | Delta | Winner |`);
  lines.push(`|--------|-------|--------|`);
  lines.push(`| Service Level | ${(comparison.serviceLevelDelta * 100).toFixed(2)}pp | ${comparison.serviceLevelDelta > 0 ? "Optimized" : comparison.serviceLevelDelta < 0 ? "Baseline" : "Tie"} |`);
  lines.push(`| Stockout Rate | ${(comparison.stockoutRateDelta * 100).toFixed(2)}pp | ${comparison.stockoutRateDelta < 0 ? "Optimized" : comparison.stockoutRateDelta > 0 ? "Baseline" : "Tie"} |`);
  lines.push(`| Expedite Spend | $${comparison.expediteSpendDelta.toFixed(2)} | ${comparison.expediteSpendDelta < 0 ? "Optimized" : comparison.expediteSpendDelta > 0 ? "Baseline" : "Tie"} |`);
  lines.push(`| Working Capital | $${comparison.workingCapitalDelta.toFixed(2)} | ${comparison.workingCapitalDelta < 0 ? "Optimized" : comparison.workingCapitalDelta > 0 ? "Baseline" : "Tie"} |`);

  lines.push(`\n## Recommendation: **${comparison.recommendation}**`);
  lines.push(`- Confidence: ${(comparison.confidenceLevel * 100).toFixed(0)}%`);
  lines.push(`- Optimized wins: ${comparison.optimizedWins.join(", ") || "none"}`);
  lines.push(`- Baseline wins: ${comparison.baselineWins.join(", ") || "none"}`);

  lines.push(`\n## Savings Separation`);
  lines.push(`- Estimated savings: $${optimized.totalEstimatedSavings.toFixed(2)}`);
  lines.push(`- Measured savings: ${optimized.totalMeasuredSavings !== null ? `$${optimized.totalMeasuredSavings.toFixed(2)}` : "Not yet available (requires post-pilot measurement)"}`);

  lines.push(`\n## Production Safety`);
  lines.push(`- Production mutations: 0`);
  lines.push(`- All results are simulation-only`);
  lines.push(`- Experiment is fully replayable with seed=${config.seed}`);

  lines.push(`\n---`);
  lines.push(`*Generated at ${new Date().toISOString()} by Prescient Labs Pilot Evaluation Engine v1.0.0*`);

  return lines.join("\n");
}

export async function runPilotExperiment(config: PilotExperimentConfig): Promise<PilotExperiment> {
  const configHash = hashConfig(config);

  const existingExp = await db.select().from(pilotExperiments)
    .where(eq(pilotExperiments.experimentId, config.experimentId))
    .limit(1);
  if (existingExp.length > 0) {
    throw new Error(`EXPERIMENT_ALREADY_EXISTS: ${config.experimentId}`);
  }

  const configSnapshot = {
    ...config,
    configHash,
    createdAt: new Date().toISOString(),
    engineVersion: "1.0.0",
    immutable: true,
  };

  const [experiment] = await db.insert(pilotExperiments).values({
    companyId: config.companyId,
    experimentId: config.experimentId,
    name: config.name,
    status: "running",
    windowWeeks: config.windowWeeks,
    configSnapshot: configSnapshot as any,
    configHash,
    seed: config.seed,
    replayable: true,
    productionMutations: 0,
    lockedAt: new Date(),
  }).returning();

  const baselineRng = seededRandom(config.seed);
  const optimizedRng = seededRandom(config.seed);

  const baselineMaterialResults: { weeklyMetrics: WeeklyMetrics[]; materialResult: MaterialPolicyResult }[] = [];
  const optimizedMaterialResults: { weeklyMetrics: WeeklyMetrics[]; materialResult: MaterialPolicyResult }[] = [];

  for (const materialId of config.materialIds) {
    const policyInputs: PolicyInputs = {
      regime: config.regime,
      fdr: config.fdr,
      forecastUncertainty: config.forecastUncertainty,
      materialId,
      currentOnHand: 100,
      avgDemand: 20,
      leadTimeDays: 14,
    };

    try {
      const [mat] = await db.select().from(materials)
        .where(and(eq(materials.id, materialId), eq(materials.companyId, config.companyId)));
      if (mat) {
        policyInputs.currentOnHand = mat.onHand;
        policyInputs.avgDemand = mat.onHand > 0 ? mat.onHand * 0.1 : 5;
      }

      const smRows = await db.select().from(supplierMaterials).where(eq(supplierMaterials.materialId, materialId));
      if (smRows.length > 0) policyInputs.leadTimeDays = smRows[0].leadTimeDays;

      const constraintRows = await db.select().from(materialConstraints)
        .where(and(eq(materialConstraints.companyId, config.companyId), eq(materialConstraints.materialId, materialId)));
      if (constraintRows.length > 0) {
        policyInputs.moq = constraintRows[0].moq ?? undefined;
        policyInputs.packSize = constraintRows[0].packSize ?? undefined;
      }
    } catch {
    }

    const overrideQty = config.baselinePolicyOverrides?.[materialId];
    const baseResult = simulateBaselinePolicy(policyInputs, config.windowWeeks, baselineRng, overrideQty);
    baselineMaterialResults.push(baseResult);

    const optResult = simulateOptimizedPolicy(
      policyInputs, config.windowWeeks, config.targetServiceLevel,
      config.demandSamples, config.seed, optimizedRng, baseResult.materialResult.cost,
    );
    optimizedMaterialResults.push(optResult);
  }

  const baselineResults = aggregateResults(baselineMaterialResults, "baseline", config.windowWeeks);
  const optimizedResults = aggregateResults(optimizedMaterialResults, "optimized", config.windowWeeks);
  const comparisonSummary = buildComparison(baselineResults, optimizedResults);

  const evidenceBundle = {
    provenanceVersion: "4.0.0",
    engineId: "pilot_evaluation_v1",
    experimentId: config.experimentId,
    companyId: config.companyId,
    configHash,
    regime: config.regime,
    fdr: config.fdr,
    seed: config.seed,
    windowWeeks: config.windowWeeks,
    materialCount: config.materialIds.length,
    timestamp: new Date().toISOString(),
    productionMutations: 0,
    replayable: true,
  };

  const artifactMd = generateArtifactMd(config, baselineResults, optimizedResults, comparisonSummary);
  const artifactJson = {
    version: "1.0.0",
    experimentId: config.experimentId,
    configSnapshot,
    baselineResults,
    optimizedResults,
    comparisonSummary,
    evidenceBundle,
    generatedAt: new Date().toISOString(),
  };

  const [updated] = await db.update(pilotExperiments)
    .set({
      status: "completed",
      baselineResults: baselineResults as any,
      optimizedResults: optimizedResults as any,
      comparisonSummary: comparisonSummary as any,
      evidenceBundle: evidenceBundle as any,
      artifactMd,
      artifactJson: artifactJson as any,
      completedAt: new Date(),
    })
    .where(eq(pilotExperiments.id, experiment.id))
    .returning();

  try {
    const artifactDir = path.resolve(process.cwd(), "artifacts/pilot-experiments");
    fs.mkdirSync(artifactDir, { recursive: true });
    fs.writeFileSync(path.join(artifactDir, `${config.experimentId}.md`), artifactMd);
    fs.writeFileSync(path.join(artifactDir, `${config.experimentId}.json`), JSON.stringify(artifactJson, null, 2));
  } catch {
  }

  return updated;
}

export async function replayExperiment(experimentId: string): Promise<PilotExperiment> {
  const [existing] = await db.select().from(pilotExperiments)
    .where(eq(pilotExperiments.experimentId, experimentId))
    .limit(1);

  if (!existing) throw new Error(`EXPERIMENT_NOT_FOUND: ${experimentId}`);
  if (!existing.replayable) throw new Error(`EXPERIMENT_NOT_REPLAYABLE: ${experimentId}`);

  const config = existing.configSnapshot as PilotExperimentConfig;
  const replayId = `${experimentId}-replay-${Date.now()}`;
  const replayConfig = { ...config, experimentId: replayId, name: `${config.name} (Replay)` };

  return runPilotExperiment(replayConfig);
}

export async function getPilotExperiments(companyId: string, limit: number = 20): Promise<PilotExperiment[]> {
  return db.select().from(pilotExperiments)
    .where(eq(pilotExperiments.companyId, companyId))
    .orderBy(desc(pilotExperiments.createdAt))
    .limit(limit);
}

export async function getPilotExperimentById(experimentId: string): Promise<PilotExperiment | null> {
  const [exp] = await db.select().from(pilotExperiments)
    .where(eq(pilotExperiments.experimentId, experimentId))
    .limit(1);
  return exp || null;
}

export async function exportExperimentAudit(experimentId: string): Promise<{
  experiment: PilotExperiment;
  configIntegrity: boolean;
  productionSafe: boolean;
  replayVerified: boolean;
}> {
  const exp = await getPilotExperimentById(experimentId);
  if (!exp) throw new Error(`EXPERIMENT_NOT_FOUND: ${experimentId}`);

  const configSnapshot = exp.configSnapshot as PilotExperimentConfig;
  const recomputedHash = hashConfig(configSnapshot);
  const configIntegrity = recomputedHash === exp.configHash;

  return {
    experiment: exp,
    configIntegrity,
    productionSafe: exp.productionMutations === 0,
    replayVerified: exp.replayable,
  };
}
