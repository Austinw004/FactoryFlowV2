import { db } from "../db";
import { eq, and, desc } from "drizzle-orm";
import {
  pilotExperiments,
  executiveReports,
  stressTestReports,
  predictiveStabilityReports,
  type PilotExperiment,
  type ExecutiveReport,
} from "@shared/schema";
import { hashConfig } from "./pilotEvaluation";
import { createHash } from "crypto";

export interface RevenueDashboardMetrics {
  experimentId: string;
  experimentName: string;
  status: string;
  window: { weeks: number; lockedAt: string | null; completedAt: string | null };
  serviceLevelImprovement: {
    baselinePercent: number;
    optimizedPercent: number;
    deltaPercent: number;
    deltaPercentagePoints: number;
  };
  stockoutReduction: {
    baselinePercent: number;
    optimizedPercent: number;
    deltaPercent: number;
    deltaPercentagePoints: number;
  };
  expediteSpendReduction: {
    baselineDollars: number;
    optimizedDollars: number;
    deltaDollars: number;
    deltaPercent: number;
  };
  workingCapitalImpact: {
    baselineDollars: number;
    optimizedDollars: number;
    deltaDollars: number;
    deltaPercent: number;
  };
  realizedSavings: {
    estimatedDollars: number;
    estimatedLabel: "estimated";
    measuredDollars: number | null;
    measuredLabel: "measured" | "not_yet_available";
    hasMeasuredData: boolean;
  };
  configHash: string;
  productionMutations: number;
  evidenceBundlePresent: boolean;
}

export async function getPilotRevenueDashboard(
  companyId: string,
): Promise<RevenueDashboardMetrics[]> {
  const experiments = await db
    .select()
    .from(pilotExperiments)
    .where(eq(pilotExperiments.companyId, companyId))
    .orderBy(desc(pilotExperiments.createdAt))
    .limit(20);

  return experiments.map((exp) => buildRevenueDashboardFromExperiment(exp));
}

export async function getPilotRevenueDashboardByExperiment(
  companyId: string,
  experimentId: string,
): Promise<RevenueDashboardMetrics | null> {
  const [exp] = await db
    .select()
    .from(pilotExperiments)
    .where(
      and(
        eq(pilotExperiments.companyId, companyId),
        eq(pilotExperiments.experimentId, experimentId),
      ),
    )
    .limit(1);

  if (!exp) return null;
  return buildRevenueDashboardFromExperiment(exp);
}

function buildRevenueDashboardFromExperiment(
  exp: PilotExperiment,
): RevenueDashboardMetrics {
  const baseline = exp.baselineResults as any;
  const optimized = exp.optimizedResults as any;
  const comparison = exp.comparisonSummary as any;

  const bSL = baseline?.totalServiceLevel ?? 0;
  const oSL = optimized?.totalServiceLevel ?? 0;
  const bSO = baseline?.avgStockoutRate ?? 0;
  const oSO = optimized?.avgStockoutRate ?? 0;
  const bExp = baseline?.totalExpediteSpend ?? 0;
  const oExp = optimized?.totalExpediteSpend ?? 0;
  const bWC = baseline?.avgWorkingCapital ?? 0;
  const oWC = optimized?.avgWorkingCapital ?? 0;
  const estSavings = optimized?.totalEstimatedSavings ?? 0;
  const measSavings = optimized?.totalMeasuredSavings ?? null;

  return {
    experimentId: exp.experimentId,
    experimentName: exp.name,
    status: exp.status,
    window: {
      weeks: exp.windowWeeks,
      lockedAt: exp.lockedAt?.toISOString() ?? null,
      completedAt: exp.completedAt?.toISOString() ?? null,
    },
    serviceLevelImprovement: {
      baselinePercent: round4(bSL * 100),
      optimizedPercent: round4(oSL * 100),
      deltaPercent: round4((oSL - bSL) / (bSL || 1) * 100),
      deltaPercentagePoints: round4((oSL - bSL) * 100),
    },
    stockoutReduction: {
      baselinePercent: round4(bSO * 100),
      optimizedPercent: round4(oSO * 100),
      deltaPercent: round4(bSO > 0 ? ((bSO - oSO) / bSO) * 100 : 0),
      deltaPercentagePoints: round4((bSO - oSO) * 100),
    },
    expediteSpendReduction: {
      baselineDollars: round2(bExp),
      optimizedDollars: round2(oExp),
      deltaDollars: round2(bExp - oExp),
      deltaPercent: round4(bExp > 0 ? ((bExp - oExp) / bExp) * 100 : 0),
    },
    workingCapitalImpact: {
      baselineDollars: round2(bWC),
      optimizedDollars: round2(oWC),
      deltaDollars: round2(oWC - bWC),
      deltaPercent: round4(bWC > 0 ? ((oWC - bWC) / bWC) * 100 : 0),
    },
    realizedSavings: {
      estimatedDollars: round2(estSavings),
      estimatedLabel: "estimated",
      measuredDollars: measSavings !== null ? round2(measSavings) : null,
      measuredLabel: measSavings !== null ? "measured" : "not_yet_available",
      hasMeasuredData: measSavings !== null,
    },
    configHash: exp.configHash,
    productionMutations: exp.productionMutations,
    evidenceBundlePresent: !!exp.evidenceBundle,
  };
}

export interface ExecutiveReportOutput {
  reportId: number;
  experimentId: string;
  configHash: string;
  replayId: string;
  roiSummary: any;
  stressResilienceSummary: any;
  regimeExposureSummary: any;
  tailRiskMetrics: any;
  comparisonWindow: any;
  reportJson: any;
  reportMd: string;
  productionMutations: number;
}

export async function generateExecutiveReport(
  companyId: string,
  experimentId: string,
): Promise<ExecutiveReportOutput> {
  const [exp] = await db
    .select()
    .from(pilotExperiments)
    .where(
      and(
        eq(pilotExperiments.companyId, companyId),
        eq(pilotExperiments.experimentId, experimentId),
      ),
    )
    .limit(1);

  if (!exp) throw new Error("EXPERIMENT_NOT_FOUND");
  if (exp.status !== "completed") throw new Error("EXPERIMENT_NOT_COMPLETED");

  const baseline = exp.baselineResults as any;
  const optimized = exp.optimizedResults as any;
  const comparison = exp.comparisonSummary as any;
  const config = exp.configSnapshot as any;
  const evidence = exp.evidenceBundle as any;

  const comparisonWindow = {
    type: "baseline_vs_optimized",
    windowWeeks: exp.windowWeeks,
    lockedAt: exp.lockedAt?.toISOString(),
    completedAt: exp.completedAt?.toISOString(),
    regime: config?.regime,
    fdr: config?.fdr,
    seed: exp.seed,
    materialCount: config?.materialIds?.length ?? 0,
  };

  const roiSummary = {
    serviceLevelImprovement: {
      baseline: round4(baseline?.totalServiceLevel ?? 0),
      optimized: round4(optimized?.totalServiceLevel ?? 0),
      deltaPercentagePoints: round4(((optimized?.totalServiceLevel ?? 0) - (baseline?.totalServiceLevel ?? 0)) * 100),
    },
    stockoutReduction: {
      baseline: round4(baseline?.avgStockoutRate ?? 0),
      optimized: round4(optimized?.avgStockoutRate ?? 0),
      deltaPercentagePoints: round4(((baseline?.avgStockoutRate ?? 0) - (optimized?.avgStockoutRate ?? 0)) * 100),
    },
    expediteSpendReduction: {
      baselineDollars: round2(baseline?.totalExpediteSpend ?? 0),
      optimizedDollars: round2(optimized?.totalExpediteSpend ?? 0),
      deltaDollars: round2((baseline?.totalExpediteSpend ?? 0) - (optimized?.totalExpediteSpend ?? 0)),
      deltaPercent: round4(
        (baseline?.totalExpediteSpend ?? 0) > 0
          ? (((baseline?.totalExpediteSpend ?? 0) - (optimized?.totalExpediteSpend ?? 0)) / (baseline?.totalExpediteSpend ?? 1)) * 100
          : 0,
      ),
    },
    workingCapitalImpact: {
      baselineDollars: round2(baseline?.avgWorkingCapital ?? 0),
      optimizedDollars: round2(optimized?.avgWorkingCapital ?? 0),
      deltaDollars: round2((optimized?.avgWorkingCapital ?? 0) - (baseline?.avgWorkingCapital ?? 0)),
    },
    realizedSavings: {
      estimatedDollars: round2(optimized?.totalEstimatedSavings ?? 0),
      estimatedLabel: "estimated" as const,
      measuredDollars: optimized?.totalMeasuredSavings ?? null,
      measuredLabel: (optimized?.totalMeasuredSavings !== null ? "measured" : "not_yet_available") as const,
      hasMeasuredData: optimized?.totalMeasuredSavings !== null,
    },
    recommendation: comparison?.recommendation ?? "INCONCLUSIVE",
    confidenceLevel: comparison?.confidenceLevel ?? 0,
    optimizedWins: comparison?.optimizedWins ?? [],
    baselineWins: comparison?.baselineWins ?? [],
  };

  const stressReports = await db
    .select()
    .from(stressTestReports)
    .where(eq(stressTestReports.companyId, companyId))
    .orderBy(desc(stressTestReports.createdAt))
    .limit(1);

  let stressResilienceSummary: any = null;
  let tailRiskMetrics: any = null;

  if (stressReports.length > 0) {
    const stressData = stressReports[0].reportData as any;
    stressResilienceSummary = {
      overallRating: stressReports[0].overallRating,
      robustnessScore: stressReports[0].robustnessScore,
      scenarioCount: stressReports[0].scenarioCount,
      stressTestDate: stressReports[0].createdAt.toISOString(),
      topScenarios: (stressData?.scenarioResults || []).slice(0, 3).map((s: any) => ({
        type: s.scenario?.type,
        severity: s.scenario?.severity,
        stabilityScore: s.optimizationStability?.stabilityScore,
        serviceLevelDegradation: s.optimizationStability?.serviceLevelDegradation,
      })),
    };

    tailRiskMetrics = {
      scenarios: (stressData?.scenarioResults || []).map((s: any) => ({
        type: s.scenario?.type,
        severity: s.scenario?.severity,
        baselineCVaR95: s.cvarDelta?.baselineCVaR95,
        baselineCVaR99: s.cvarDelta?.baselineCVaR99,
        stressedCVaR95: s.cvarDelta?.stressedCVaR95,
        stressedCVaR99: s.cvarDelta?.stressedCVaR99,
        tailRiskAmplification: s.cvarDelta?.tailRiskAmplification,
      })),
    };
  }

  const stabilityReports = await db
    .select()
    .from(predictiveStabilityReports)
    .where(eq(predictiveStabilityReports.companyId, companyId))
    .orderBy(desc(predictiveStabilityReports.createdAt))
    .limit(1);

  let regimeExposureSummary: any = null;
  if (stabilityReports.length > 0) {
    const stabData = stabilityReports[0].reportData as any;
    regimeExposureSummary = {
      currentRegime: stabData?.regimeAnalysis?.currentRegime,
      regimeTransitionScore: stabData?.regimeAnalysis?.regimeTransitionScore,
      signalStrength: stabData?.signalStrength?.overallStrength,
      uncertaintyExpansion: stabData?.uncertaintyExpansion?.expanded,
      stabilityReportDate: stabilityReports[0].createdAt.toISOString(),
    };
  }

  const replayId = `exec-${experimentId}-${Date.now()}`;
  const configHash = exp.configHash;

  const reportJson = {
    version: "1.0.0",
    reportType: "pilot_conversion",
    experimentId,
    companyId,
    configHash,
    replayId,
    comparisonWindow,
    roiSummary,
    stressResilienceSummary,
    regimeExposureSummary,
    tailRiskMetrics,
    evidenceBundle: evidence,
    productionMutations: 0,
    generatedAt: new Date().toISOString(),
  };

  const reportMd = generateExecutiveReportMd(reportJson);

  const [saved] = await db
    .insert(executiveReports)
    .values({
      companyId,
      experimentId,
      reportType: "pilot_conversion",
      configHash,
      replayId,
      roiSummary: roiSummary as any,
      stressResilienceSummary: stressResilienceSummary as any,
      regimeExposureSummary: regimeExposureSummary as any,
      tailRiskMetrics: tailRiskMetrics as any,
      reportJson: reportJson as any,
      reportMd,
      productionMutations: 0,
    })
    .returning();

  return {
    reportId: saved.id,
    experimentId,
    configHash,
    replayId,
    roiSummary,
    stressResilienceSummary,
    regimeExposureSummary,
    tailRiskMetrics,
    comparisonWindow,
    reportJson,
    reportMd,
    productionMutations: 0,
  };
}

function generateExecutiveReportMd(report: any): string {
  const lines: string[] = [];
  const roi = report.roiSummary;
  const cw = report.comparisonWindow;
  const stress = report.stressResilienceSummary;
  const regime = report.regimeExposureSummary;
  const tail = report.tailRiskMetrics;

  lines.push(`# Executive Pilot Conversion Report`);
  lines.push(`\n## Experiment: ${report.experimentId}`);
  lines.push(`- **Report Type**: ${report.reportType}`);
  lines.push(`- **Config Hash**: ${report.configHash}`);
  lines.push(`- **Replay ID**: ${report.replayId}`);
  lines.push(`- **Generated**: ${report.generatedAt}`);

  lines.push(`\n## Comparison Window`);
  lines.push(`| Parameter | Value |`);
  lines.push(`|-----------|-------|`);
  lines.push(`| Window | ${cw.windowWeeks} weeks |`);
  lines.push(`| Regime | ${cw.regime} |`);
  lines.push(`| FDR | ${cw.fdr} |`);
  lines.push(`| Materials | ${cw.materialCount} |`);

  lines.push(`\n## ROI Summary`);
  lines.push(`\n### Service Level Improvement`);
  lines.push(`- Baseline: ${(roi.serviceLevelImprovement.baseline * 100).toFixed(2)}%`);
  lines.push(`- Optimized: ${(roi.serviceLevelImprovement.optimized * 100).toFixed(2)}%`);
  lines.push(`- Delta: +${roi.serviceLevelImprovement.deltaPercentagePoints.toFixed(2)} pp`);

  lines.push(`\n### Stockout Reduction`);
  lines.push(`- Baseline: ${(roi.stockoutReduction.baseline * 100).toFixed(2)}%`);
  lines.push(`- Optimized: ${(roi.stockoutReduction.optimized * 100).toFixed(2)}%`);
  lines.push(`- Reduction: ${roi.stockoutReduction.deltaPercentagePoints.toFixed(2)} pp`);

  lines.push(`\n### Expedite Spend Reduction`);
  lines.push(`- Baseline: $${roi.expediteSpendReduction.baselineDollars.toFixed(2)}`);
  lines.push(`- Optimized: $${roi.expediteSpendReduction.optimizedDollars.toFixed(2)}`);
  lines.push(`- Saved: $${roi.expediteSpendReduction.deltaDollars.toFixed(2)} (${roi.expediteSpendReduction.deltaPercent.toFixed(1)}%)`);

  lines.push(`\n### Working Capital Impact`);
  lines.push(`- Baseline: $${roi.workingCapitalImpact.baselineDollars.toFixed(2)}`);
  lines.push(`- Optimized: $${roi.workingCapitalImpact.optimizedDollars.toFixed(2)}`);
  lines.push(`- Change: $${roi.workingCapitalImpact.deltaDollars.toFixed(2)}`);

  lines.push(`\n### Realized Savings`);
  lines.push(`- **Estimated** (${roi.realizedSavings.estimatedLabel}): $${roi.realizedSavings.estimatedDollars.toFixed(2)}`);
  if (roi.realizedSavings.hasMeasuredData) {
    lines.push(`- **Measured** (${roi.realizedSavings.measuredLabel}): $${roi.realizedSavings.measuredDollars.toFixed(2)}`);
  } else {
    lines.push(`- **Measured**: Not yet available (requires post-pilot invoice/receipt verification)`);
  }

  lines.push(`\n### Recommendation: **${roi.recommendation}**`);
  lines.push(`- Confidence: ${(roi.confidenceLevel * 100).toFixed(0)}%`);

  if (stress) {
    lines.push(`\n## Stress Resilience Summary`);
    lines.push(`- Overall Rating: **${stress.overallRating}**`);
    lines.push(`- Robustness Score: ${(stress.robustnessScore * 100).toFixed(1)}%`);
    lines.push(`- Scenarios Tested: ${stress.scenarioCount}`);
  }

  if (tail && tail.scenarios?.length > 0) {
    lines.push(`\n## Tail-Risk Containment (CVaR)`);
    lines.push(`| Scenario | Severity | CVaR95 | CVaR99 | Amplification |`);
    lines.push(`|----------|----------|--------|--------|---------------|`);
    for (const s of tail.scenarios) {
      lines.push(`| ${s.type} | ${s.severity} | ${s.stressedCVaR95?.toFixed(4) ?? "N/A"} | ${s.stressedCVaR99?.toFixed(4) ?? "N/A"} | ${s.tailRiskAmplification?.toFixed(2) ?? "N/A"}x |`);
    }
  }

  if (regime) {
    lines.push(`\n## Regime Exposure Summary`);
    lines.push(`- Current Regime: **${regime.currentRegime}**`);
    lines.push(`- Transition Score: ${regime.regimeTransitionScore?.toFixed(4) ?? "N/A"}`);
    lines.push(`- Signal Strength: ${regime.signalStrength?.toFixed(4) ?? "N/A"}`);
    lines.push(`- Uncertainty Expanded: ${regime.uncertaintyExpansion ? "Yes" : "No"}`);
  }

  lines.push(`\n## Production Safety`);
  lines.push(`- Production mutations: 0`);
  lines.push(`- All results are simulation-only`);

  lines.push(`\n---`);
  lines.push(`*Generated by Prescient Labs Executive Report Engine v1.0.0*`);

  return lines.join("\n");
}

export async function getExecutiveReports(companyId: string): Promise<ExecutiveReport[]> {
  return db
    .select()
    .from(executiveReports)
    .where(eq(executiveReports.companyId, companyId))
    .orderBy(desc(executiveReports.createdAt))
    .limit(20);
}

export async function getExecutiveReportById(
  id: number,
  companyId: string,
): Promise<ExecutiveReport | null> {
  const [report] = await db
    .select()
    .from(executiveReports)
    .where(and(eq(executiveReports.id, id), eq(executiveReports.companyId, companyId)))
    .limit(1);
  return report || null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
