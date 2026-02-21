import { seededRandom } from "./evaluationHarness";
import { classifyRegimeFromFDR, REGIME_ORDER, type Regime } from "./regimeConstants";
import {
  computeDynamicModelWeights,
  computeHeteroskedasticVolatility,
  computeTailRiskMetrics,
  computeUncertaintyExpansion,
  type TailRiskMetrics,
  type VolatilityEstimate,
  type UncertaintyExpansion,
  type ModelWeight,
} from "./adaptiveForecasting";
import { createHash } from "crypto";

export const STRESS_ENGINE_VERSION = "1.0.0";

export type StressScenarioType =
  | "demand_spike"
  | "supplier_outage"
  | "price_shock"
  | "lead_time_disruption"
  | "compound";

export interface StressTestConfig {
  companyId: string;
  version: string;
  seed: number;
  baselineDemand: number[];
  baselineForecast: number[];
  baselineFdrSeries: number[];
  baselineForecastErrors: number[];
  toleranceThreshold?: number;
  rollingWindowSize?: number;
  demandSamples?: number;
  supplyDisruptionProbability?: number;
  scenarios?: StressScenarioSpec[];
}

export interface StressScenarioSpec {
  type: StressScenarioType;
  severity: "moderate" | "severe" | "extreme";
  label?: string;
}

interface StressMultipliers {
  demandMultiplier: number;
  supplyDisruptionProb: number;
  priceShockFactor: number;
  leadTimeMultiplier: number;
}

const SEVERITY_PARAMS: Record<string, { demandSpike: number; supplyOutageProb: number; priceShock: number; leadTimeMult: number }> = {
  moderate: { demandSpike: 1.5, supplyOutageProb: 0.15, priceShock: 1.3, leadTimeMult: 1.5 },
  severe: { demandSpike: 2.5, supplyOutageProb: 0.35, priceShock: 1.8, leadTimeMult: 2.5 },
  extreme: { demandSpike: 4.0, supplyOutageProb: 0.60, priceShock: 3.0, leadTimeMult: 4.0 },
};

const DEFAULT_SCENARIOS: StressScenarioSpec[] = [
  { type: "demand_spike", severity: "moderate", label: "Moderate demand surge" },
  { type: "demand_spike", severity: "extreme", label: "Extreme demand shock" },
  { type: "supplier_outage", severity: "severe", label: "Major supplier outage" },
  { type: "price_shock", severity: "severe", label: "Commodity price shock" },
  { type: "lead_time_disruption", severity: "extreme", label: "Critical lead-time disruption" },
  { type: "compound", severity: "extreme", label: "Compound crisis (all factors)" },
];

export interface StressScenarioResult {
  scenarioId: string;
  type: StressScenarioType;
  severity: string;
  label: string;
  stressedDemand: number[];
  stressedErrors: number[];
  multipliers: StressMultipliers;
  modelWeightsUnderStress: ModelWeight[];
  volatilityUnderStress: VolatilityEstimate[];
  tailRiskUnderStress: TailRiskMetrics;
  uncertaintyExpansionUnderStress: UncertaintyExpansion;
  optimizationStability: OptimizationStabilityMetrics;
  automationDowngrade: AutomationDowngradeAssessment;
  cvarDelta: CVaRDeltaMetrics;
}

export interface OptimizationStabilityMetrics {
  baselineServiceLevel: number;
  stressedServiceLevel: number;
  serviceLevelDegradation: number;
  baselineStockoutRisk: number;
  stressedStockoutRisk: number;
  stockoutRiskIncrease: number;
  quantityAdjustmentNeeded: number;
  stable: boolean;
  stabilityScore: number;
}

export interface AutomationDowngradeAssessment {
  shouldDowngrade: boolean;
  downgradeSeverity: "none" | "approval_required" | "manual_only" | "emergency_halt";
  triggerReasons: string[];
  riskScore: number;
  safeModeRecommended: boolean;
  escalationRequired: boolean;
}

export interface CVaRDeltaMetrics {
  baselineDemandCVaR95: number;
  stressedDemandCVaR95: number;
  demandCVaR95Delta: number;
  baselineDemandCVaR99: number;
  stressedDemandCVaR99: number;
  demandCVaR99Delta: number;
  baselineSupplyCVaR95: number;
  stressedSupplyCVaR95: number;
  supplyCVaR95Delta: number;
  baselineJointTailRisk: number;
  stressedJointTailRisk: number;
  jointTailRiskDelta: number;
  tailRiskAmplification: number;
}

export interface RobustnessReport {
  version: string;
  engineVersion: string;
  companyId: string;
  configHash: string;
  seed: number;
  generatedAt: string;
  baselineMetrics: {
    tailRisk: TailRiskMetrics;
    volatility: VolatilityEstimate[];
    uncertaintyExpansion: UncertaintyExpansion;
  };
  scenarioResults: StressScenarioResult[];
  aggregateSummary: AggregateSummary;
  productionMutations: number;
  replayable: boolean;
  evidenceBundle: StressTestEvidenceBundle;
}

export interface AggregateSummary {
  totalScenarios: number;
  scenariosPassed: number;
  scenariosFailed: number;
  worstCaseScenario: string;
  worstCaseCVaR99: number;
  maxServiceLevelDegradation: number;
  maxStockoutRiskIncrease: number;
  automationDowngradesTriggered: number;
  safeModeRecommendations: number;
  emergencyHalts: number;
  overallRobustnessScore: number;
  overallRating: "robust" | "acceptable" | "fragile" | "critical";
}

export interface StressTestEvidenceBundle {
  provenanceVersion: string;
  engineId: string;
  engineVersion: string;
  companyId: string;
  configHash: string;
  seed: number;
  timestamp: string;
  scenarioCount: number;
  baselineDemandLength: number;
  baselineFdrLength: number;
  productionMutations: number;
  replayable: boolean;
}

export function hashStressTestConfig(config: StressTestConfig): string {
  const normalized = JSON.stringify({
    companyId: config.companyId,
    version: config.version,
    seed: config.seed,
    baselineDemandLength: config.baselineDemand.length,
    baselineForecastLength: config.baselineForecast.length,
    baselineFdrLength: config.baselineFdrSeries.length,
    baselineErrorsLength: config.baselineForecastErrors.length,
    toleranceThreshold: config.toleranceThreshold ?? 0.15,
    rollingWindowSize: config.rollingWindowSize ?? 12,
    demandSamples: config.demandSamples ?? 500,
    scenarioTypes: (config.scenarios ?? DEFAULT_SCENARIOS).map(s => `${s.type}:${s.severity}`).sort(),
  });
  return createHash("sha256").update(normalized).digest("hex");
}

function getStressMultipliers(type: StressScenarioType, severity: string): StressMultipliers {
  const params = SEVERITY_PARAMS[severity] ?? SEVERITY_PARAMS.moderate;

  switch (type) {
    case "demand_spike":
      return { demandMultiplier: params.demandSpike, supplyDisruptionProb: 0.05, priceShockFactor: 1.0, leadTimeMultiplier: 1.0 };
    case "supplier_outage":
      return { demandMultiplier: 1.0, supplyDisruptionProb: params.supplyOutageProb, priceShockFactor: 1.1, leadTimeMultiplier: 1.3 };
    case "price_shock":
      return { demandMultiplier: 0.9, supplyDisruptionProb: 0.1, priceShockFactor: params.priceShock, leadTimeMultiplier: 1.1 };
    case "lead_time_disruption":
      return { demandMultiplier: 1.0, supplyDisruptionProb: 0.2, priceShockFactor: 1.2, leadTimeMultiplier: params.leadTimeMult };
    case "compound":
      return {
        demandMultiplier: params.demandSpike * 0.8,
        supplyDisruptionProb: params.supplyOutageProb * 0.9,
        priceShockFactor: params.priceShock * 0.7,
        leadTimeMultiplier: params.leadTimeMult * 0.7,
      };
    default:
      return { demandMultiplier: 1.0, supplyDisruptionProb: 0.05, priceShockFactor: 1.0, leadTimeMultiplier: 1.0 };
  }
}

function applyDemandStress(baseline: number[], multiplier: number, seed: number): number[] {
  const rng = seededRandom(seed);
  return baseline.map((d) => {
    const jitter = 1 + (rng() - 0.5) * 0.2;
    return Math.round(d * multiplier * jitter * 100) / 100;
  });
}

function computeStressedErrors(stressedDemand: number[], baselineForecast: number[]): number[] {
  return stressedDemand.map((d, i) => {
    const f = i < baselineForecast.length ? baselineForecast[i] : baselineForecast[baselineForecast.length - 1];
    return Math.abs(d - f) / Math.max(f, 1);
  });
}

function computeOptimizationStability(
  baselineDemand: number[],
  stressedDemand: number[],
  multipliers: StressMultipliers,
  seed: number,
): OptimizationStabilityMetrics {
  const rng = seededRandom(seed + 7777);

  const avgBaseline = baselineDemand.reduce((a, b) => a + b, 0) / baselineDemand.length;
  const avgStressed = stressedDemand.reduce((a, b) => a + b, 0) / stressedDemand.length;

  const baselineVar = baselineDemand.reduce((a, d) => a + (d - avgBaseline) ** 2, 0) / baselineDemand.length;
  const stressedVar = stressedDemand.reduce((a, d) => a + (d - avgStressed) ** 2, 0) / stressedDemand.length;

  const baselineServiceLevel = 0.95 - Math.sqrt(baselineVar) / avgBaseline * 0.1;
  const supplyPenalty = multipliers.supplyDisruptionProb * 0.3;
  const leadTimePenalty = (multipliers.leadTimeMultiplier - 1) * 0.1;
  const demandVolumePenalty = Math.max(0, (multipliers.demandMultiplier - 1) * 0.08);
  const stressedServiceLevel = Math.max(0.3, baselineServiceLevel - supplyPenalty - leadTimePenalty - demandVolumePenalty - Math.sqrt(stressedVar) / avgStressed * 0.15);

  const baselineStockout = 1 - baselineServiceLevel;
  const stressedStockout = 1 - stressedServiceLevel;

  const quantityAdj = avgStressed / avgBaseline - 1;

  const degradation = baselineServiceLevel - stressedServiceLevel;
  const stable = degradation < 0.15 && stressedStockout < 0.25;
  const stabilityScore = Math.max(0, Math.min(1, 1 - degradation * 2 - stressedStockout));

  return {
    baselineServiceLevel: r4(baselineServiceLevel),
    stressedServiceLevel: r4(stressedServiceLevel),
    serviceLevelDegradation: r4(degradation),
    baselineStockoutRisk: r4(baselineStockout),
    stressedStockoutRisk: r4(stressedStockout),
    stockoutRiskIncrease: r4(stressedStockout - baselineStockout),
    quantityAdjustmentNeeded: r4(quantityAdj),
    stable,
    stabilityScore: r4(stabilityScore),
  };
}

function assessAutomationDowngrade(
  stability: OptimizationStabilityMetrics,
  uncertaintyExpansion: UncertaintyExpansion,
  cvarDelta: CVaRDeltaMetrics,
  severity: string,
): AutomationDowngradeAssessment {
  const reasons: string[] = [];
  let riskScore = 0;

  if (stability.serviceLevelDegradation > 0.1) {
    reasons.push(`Service level degradation (${(stability.serviceLevelDegradation * 100).toFixed(1)}%) exceeds 10% threshold`);
    riskScore += stability.serviceLevelDegradation * 3;
  }

  if (stability.stressedStockoutRisk > 0.2) {
    reasons.push(`Stressed stockout risk (${(stability.stressedStockoutRisk * 100).toFixed(1)}%) exceeds 20% threshold`);
    riskScore += stability.stressedStockoutRisk * 2;
  }

  if (uncertaintyExpansion.triggered && uncertaintyExpansion.expansionMultiplier > 1.5) {
    reasons.push(`Uncertainty bands expanded ${uncertaintyExpansion.expansionMultiplier.toFixed(2)}x beyond tolerance`);
    riskScore += (uncertaintyExpansion.expansionMultiplier - 1) * 0.5;
  }

  if (cvarDelta.tailRiskAmplification > 2.0) {
    reasons.push(`Tail risk amplified ${cvarDelta.tailRiskAmplification.toFixed(2)}x under stress`);
    riskScore += cvarDelta.tailRiskAmplification * 0.3;
  }

  if (cvarDelta.demandCVaR99Delta > 0.5) {
    reasons.push(`Demand CVaR99 increased by ${(cvarDelta.demandCVaR99Delta * 100).toFixed(1)}% under stress`);
    riskScore += cvarDelta.demandCVaR99Delta;
  }

  riskScore = r4(Math.min(riskScore, 10));

  let downgradeSeverity: AutomationDowngradeAssessment["downgradeSeverity"] = "none";
  if (riskScore >= 5.0 || severity === "extreme") {
    downgradeSeverity = "emergency_halt";
  } else if (riskScore >= 3.0) {
    downgradeSeverity = "manual_only";
  } else if (riskScore >= 1.0) {
    downgradeSeverity = "approval_required";
  }

  const shouldDowngrade = downgradeSeverity !== "none";
  const safeModeRecommended = riskScore >= 3.0;
  const escalationRequired = riskScore >= 5.0;

  return {
    shouldDowngrade,
    downgradeSeverity,
    triggerReasons: reasons,
    riskScore,
    safeModeRecommended,
    escalationRequired,
  };
}

function computeCVaRDelta(baselineTail: TailRiskMetrics, stressedTail: TailRiskMetrics): CVaRDeltaMetrics {
  const amplification = stressedTail.jointTailRisk > 0 && baselineTail.jointTailRisk > 0
    ? stressedTail.jointTailRisk / baselineTail.jointTailRisk
    : stressedTail.jointTailRisk > 0 ? 10.0 : 1.0;

  return {
    baselineDemandCVaR95: r4(baselineTail.demandCVaR95),
    stressedDemandCVaR95: r4(stressedTail.demandCVaR95),
    demandCVaR95Delta: r4(stressedTail.demandCVaR95 - baselineTail.demandCVaR95),
    baselineDemandCVaR99: r4(baselineTail.demandCVaR99),
    stressedDemandCVaR99: r4(stressedTail.demandCVaR99),
    demandCVaR99Delta: r4(stressedTail.demandCVaR99 - baselineTail.demandCVaR99),
    baselineSupplyCVaR95: r4(baselineTail.supplyCVaR95),
    stressedSupplyCVaR95: r4(stressedTail.supplyCVaR95),
    supplyCVaR95Delta: r4(stressedTail.supplyCVaR95 - baselineTail.supplyCVaR95),
    baselineJointTailRisk: r4(baselineTail.jointTailRisk),
    stressedJointTailRisk: r4(stressedTail.jointTailRisk),
    jointTailRiskDelta: r4(stressedTail.jointTailRisk - baselineTail.jointTailRisk),
    tailRiskAmplification: r4(amplification),
  };
}

function r4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

export function runStressTest(config: StressTestConfig): RobustnessReport {
  const {
    companyId, version, seed,
    baselineDemand, baselineForecast, baselineFdrSeries, baselineForecastErrors,
    toleranceThreshold = 0.15,
    rollingWindowSize = 12,
    demandSamples = 500,
    supplyDisruptionProbability = 0.05,
    scenarios = DEFAULT_SCENARIOS,
  } = config;

  const configHash = hashStressTestConfig(config);

  const baselineTailRisk = computeTailRiskMetrics(
    baselineDemand, baselineForecast, seed, demandSamples, supplyDisruptionProbability,
  );
  const baselineVolatility = computeHeteroskedasticVolatility(
    baselineForecastErrors, baselineFdrSeries, rollingWindowSize, toleranceThreshold,
  );
  const baselineExpansion = computeUncertaintyExpansion(
    baselineForecastErrors, toleranceThreshold,
    baselineVolatility.find(v => v.regime === classifyRegimeFromFDR(baselineFdrSeries[baselineFdrSeries.length - 1] ?? 0.5))?.adjustedVolatility ?? 0.15,
    rollingWindowSize,
  );

  const scenarioResults: StressScenarioResult[] = [];

  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    const scenarioSeed = seed + (i + 1) * 1000;
    const scenarioId = `stress_${scenario.type}_${scenario.severity}_${i}`;
    const label = scenario.label ?? `${scenario.type} (${scenario.severity})`;

    const multipliers = getStressMultipliers(scenario.type, scenario.severity);
    const stressedDemand = applyDemandStress(baselineDemand, multipliers.demandMultiplier, scenarioSeed);
    const stressedErrors = computeStressedErrors(stressedDemand, baselineForecast);

    const modelWeightsUnderStress = computeDynamicModelWeights(
      stressedDemand, baselineFdrSeries, rollingWindowSize, scenarioSeed,
    );

    const volatilityUnderStress = computeHeteroskedasticVolatility(
      stressedErrors, baselineFdrSeries, rollingWindowSize, toleranceThreshold,
    );

    const stressedSupplyProb = Math.min(0.95, supplyDisruptionProbability + multipliers.supplyDisruptionProb);
    const tailRiskUnderStress = computeTailRiskMetrics(
      stressedDemand, baselineForecast, scenarioSeed, demandSamples, stressedSupplyProb,
    );

    const currentRegime = baselineFdrSeries.length > 0
      ? classifyRegimeFromFDR(baselineFdrSeries[baselineFdrSeries.length - 1])
      : "HEALTHY_EXPANSION";
    const currentVol = volatilityUnderStress.find(v => v.regime === currentRegime);
    const uncertaintyExpansionUnderStress = computeUncertaintyExpansion(
      stressedErrors, toleranceThreshold,
      currentVol?.adjustedVolatility ?? 0.15,
      rollingWindowSize,
    );

    const optimizationStability = computeOptimizationStability(
      baselineDemand, stressedDemand, multipliers, scenarioSeed,
    );

    const cvarDelta = computeCVaRDelta(baselineTailRisk, tailRiskUnderStress);

    const automationDowngrade = assessAutomationDowngrade(
      optimizationStability, uncertaintyExpansionUnderStress, cvarDelta, scenario.severity,
    );

    scenarioResults.push({
      scenarioId,
      type: scenario.type,
      severity: scenario.severity,
      label,
      stressedDemand,
      stressedErrors,
      multipliers,
      modelWeightsUnderStress,
      volatilityUnderStress,
      tailRiskUnderStress,
      uncertaintyExpansionUnderStress,
      optimizationStability,
      automationDowngrade,
      cvarDelta,
    });
  }

  const aggregateSummary = computeAggregateSummary(scenarioResults);

  const evidenceBundle: StressTestEvidenceBundle = {
    provenanceVersion: "6.0.0",
    engineId: "stress_testing_v1",
    engineVersion: STRESS_ENGINE_VERSION,
    companyId,
    configHash,
    seed,
    timestamp: new Date().toISOString(),
    scenarioCount: scenarioResults.length,
    baselineDemandLength: baselineDemand.length,
    baselineFdrLength: baselineFdrSeries.length,
    productionMutations: 0,
    replayable: true,
  };

  return {
    version,
    engineVersion: STRESS_ENGINE_VERSION,
    companyId,
    configHash,
    seed,
    generatedAt: new Date().toISOString(),
    baselineMetrics: {
      tailRisk: baselineTailRisk,
      volatility: baselineVolatility,
      uncertaintyExpansion: baselineExpansion,
    },
    scenarioResults,
    aggregateSummary,
    productionMutations: 0,
    replayable: true,
    evidenceBundle,
  };
}

function computeAggregateSummary(results: StressScenarioResult[]): AggregateSummary {
  let worstScenario = "";
  let worstCVaR99 = -Infinity;
  let maxDegradation = 0;
  let maxStockoutIncrease = 0;
  let downgrades = 0;
  let safeMode = 0;
  let halts = 0;
  let totalStabilityScore = 0;

  for (const r of results) {
    if (r.tailRiskUnderStress.demandCVaR99 > worstCVaR99) {
      worstCVaR99 = r.tailRiskUnderStress.demandCVaR99;
      worstScenario = r.label;
    }
    if (r.optimizationStability.serviceLevelDegradation > maxDegradation) {
      maxDegradation = r.optimizationStability.serviceLevelDegradation;
    }
    if (r.optimizationStability.stockoutRiskIncrease > maxStockoutIncrease) {
      maxStockoutIncrease = r.optimizationStability.stockoutRiskIncrease;
    }
    if (r.automationDowngrade.shouldDowngrade) downgrades++;
    if (r.automationDowngrade.safeModeRecommended) safeMode++;
    if (r.automationDowngrade.downgradeSeverity === "emergency_halt") halts++;
    totalStabilityScore += r.optimizationStability.stabilityScore;
  }

  const avgStability = results.length > 0 ? totalStabilityScore / results.length : 1;
  const passedCount = results.filter(r => r.optimizationStability.stable).length;

  const robustnessScore = r4(
    avgStability * 0.4 +
    (1 - maxDegradation) * 0.3 +
    (passedCount / Math.max(results.length, 1)) * 0.3
  );

  let rating: AggregateSummary["overallRating"];
  if (robustnessScore >= 0.8) rating = "robust";
  else if (robustnessScore >= 0.6) rating = "acceptable";
  else if (robustnessScore >= 0.35) rating = "fragile";
  else rating = "critical";

  return {
    totalScenarios: results.length,
    scenariosPassed: passedCount,
    scenariosFailed: results.length - passedCount,
    worstCaseScenario: worstScenario,
    worstCaseCVaR99: r4(worstCVaR99),
    maxServiceLevelDegradation: r4(maxDegradation),
    maxStockoutRiskIncrease: r4(maxStockoutIncrease),
    automationDowngradesTriggered: downgrades,
    safeModeRecommendations: safeMode,
    emergencyHalts: halts,
    overallRobustnessScore: robustnessScore,
    overallRating: rating,
  };
}

export function generateRobustnessReportMd(report: RobustnessReport): string {
  const lines: string[] = [];
  lines.push(`# Robustness & Stability Report v${report.version}`);
  lines.push(`\n**Engine**: ${report.engineVersion}`);
  lines.push(`**Company**: ${report.companyId}`);
  lines.push(`**Config Hash**: ${report.configHash}`);
  lines.push(`**Seed**: ${report.seed}`);
  lines.push(`**Generated**: ${report.generatedAt}`);
  lines.push(`**Production Mutations**: ${report.productionMutations}`);

  lines.push(`\n## Baseline Metrics`);
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Demand CVaR (95%) | ${report.baselineMetrics.tailRisk.demandCVaR95.toFixed(2)} |`);
  lines.push(`| Demand CVaR (99%) | ${report.baselineMetrics.tailRisk.demandCVaR99.toFixed(2)} |`);
  lines.push(`| Joint Tail Risk | ${report.baselineMetrics.tailRisk.jointTailRisk.toFixed(4)} |`);
  lines.push(`| Uncertainty Triggered | ${report.baselineMetrics.uncertaintyExpansion.triggered ? "Yes" : "No"} |`);

  lines.push(`\n## Stress Scenario Results`);
  for (const sr of report.scenarioResults) {
    lines.push(`\n### ${sr.label}`);
    lines.push(`- **Type**: ${sr.type}`);
    lines.push(`- **Severity**: ${sr.severity}`);
    lines.push(`- **Demand Multiplier**: ${sr.multipliers.demandMultiplier}x`);
    lines.push(`- **Supply Disruption Prob**: ${(sr.multipliers.supplyDisruptionProb * 100).toFixed(1)}%`);

    lines.push(`\n#### Optimization Stability`);
    lines.push(`| Metric | Baseline | Stressed | Delta |`);
    lines.push(`|--------|----------|----------|-------|`);
    lines.push(`| Service Level | ${(sr.optimizationStability.baselineServiceLevel * 100).toFixed(1)}% | ${(sr.optimizationStability.stressedServiceLevel * 100).toFixed(1)}% | -${(sr.optimizationStability.serviceLevelDegradation * 100).toFixed(1)}% |`);
    lines.push(`| Stockout Risk | ${(sr.optimizationStability.baselineStockoutRisk * 100).toFixed(1)}% | ${(sr.optimizationStability.stressedStockoutRisk * 100).toFixed(1)}% | +${(sr.optimizationStability.stockoutRiskIncrease * 100).toFixed(1)}% |`);
    lines.push(`| Stability Score | ${sr.optimizationStability.stabilityScore.toFixed(4)} | | ${sr.optimizationStability.stable ? "Stable" : "Unstable"} |`);

    lines.push(`\n#### CVaR Delta`);
    lines.push(`| Metric | Baseline | Stressed | Amplification |`);
    lines.push(`|--------|----------|----------|---------------|`);
    lines.push(`| Demand CVaR95 | ${sr.cvarDelta.baselineDemandCVaR95.toFixed(4)} | ${sr.cvarDelta.stressedDemandCVaR95.toFixed(4)} | ${sr.cvarDelta.demandCVaR95Delta > 0 ? "+" : ""}${sr.cvarDelta.demandCVaR95Delta.toFixed(4)} |`);
    lines.push(`| Demand CVaR99 | ${sr.cvarDelta.baselineDemandCVaR99.toFixed(4)} | ${sr.cvarDelta.stressedDemandCVaR99.toFixed(4)} | ${sr.cvarDelta.demandCVaR99Delta > 0 ? "+" : ""}${sr.cvarDelta.demandCVaR99Delta.toFixed(4)} |`);
    lines.push(`| Joint Tail Risk | ${sr.cvarDelta.baselineJointTailRisk.toFixed(4)} | ${sr.cvarDelta.stressedJointTailRisk.toFixed(4)} | ${sr.cvarDelta.tailRiskAmplification.toFixed(2)}x |`);

    lines.push(`\n#### Automation Downgrade`);
    lines.push(`- **Should Downgrade**: ${sr.automationDowngrade.shouldDowngrade ? "Yes" : "No"}`);
    lines.push(`- **Severity**: ${sr.automationDowngrade.downgradeSeverity}`);
    lines.push(`- **Risk Score**: ${sr.automationDowngrade.riskScore.toFixed(2)}`);
    lines.push(`- **Safe Mode Recommended**: ${sr.automationDowngrade.safeModeRecommended ? "Yes" : "No"}`);
    if (sr.automationDowngrade.triggerReasons.length > 0) {
      lines.push(`- **Trigger Reasons**:`);
      for (const reason of sr.automationDowngrade.triggerReasons) {
        lines.push(`  - ${reason}`);
      }
    }

    lines.push(`\n#### Uncertainty Expansion`);
    lines.push(`- **Triggered**: ${sr.uncertaintyExpansionUnderStress.triggered ? "Yes" : "No"}`);
    lines.push(`- **Multiplier**: ${sr.uncertaintyExpansionUnderStress.expansionMultiplier.toFixed(2)}x`);
  }

  lines.push(`\n## Aggregate Summary`);
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Scenarios | ${report.aggregateSummary.totalScenarios} |`);
  lines.push(`| Passed | ${report.aggregateSummary.scenariosPassed} |`);
  lines.push(`| Failed | ${report.aggregateSummary.scenariosFailed} |`);
  lines.push(`| Worst Case | ${report.aggregateSummary.worstCaseScenario} |`);
  lines.push(`| Worst CVaR99 | ${report.aggregateSummary.worstCaseCVaR99.toFixed(4)} |`);
  lines.push(`| Max Degradation | ${(report.aggregateSummary.maxServiceLevelDegradation * 100).toFixed(1)}% |`);
  lines.push(`| Automation Downgrades | ${report.aggregateSummary.automationDowngradesTriggered} |`);
  lines.push(`| Safe Mode Recommendations | ${report.aggregateSummary.safeModeRecommendations} |`);
  lines.push(`| Emergency Halts | ${report.aggregateSummary.emergencyHalts} |`);
  lines.push(`| Robustness Score | ${report.aggregateSummary.overallRobustnessScore.toFixed(4)} |`);
  lines.push(`| Overall Rating | ${report.aggregateSummary.overallRating.toUpperCase()} |`);

  lines.push(`\n## Production Safety`);
  lines.push(`- Production mutations: ${report.productionMutations}`);
  lines.push(`- Replayable: ${report.replayable}`);
  lines.push(`- Config hash: ${report.configHash}`);

  lines.push(`\n---`);
  lines.push(`*Generated by Prescient Labs Stress Testing Engine v${report.engineVersion}*`);

  return lines.join("\n");
}
