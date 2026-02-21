import { seededRandom } from "./evaluationHarness";
import { classifyRegimeFromFDR, CANONICAL_REGIME_THRESHOLDS, REGIME_ORDER, type Regime } from "./regimeConstants";
import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";

export const ADAPTIVE_ENGINE_VERSION = "1.0.0";

export interface AdaptiveForecastConfig {
  companyId: string;
  version: string;
  seed: number;
  fdrSeries: number[];
  forecastErrors: number[];
  actualDemand: number[];
  forecastedDemand: number[];
  leadingIndicators: LeadingIndicator[];
  toleranceThreshold?: number;
  rollingWindowSize?: number;
  demandSamples?: number;
  supplyDisruptionProbability?: number;
}

export interface LeadingIndicator {
  name: string;
  values: number[];
  category: "macro" | "internal";
  lagWeeks: number;
}

export interface ModelWeight {
  modelId: string;
  regime: string;
  weight: number;
  rollingError: number;
  sampleSize: number;
}

export interface VolatilityEstimate {
  regime: string;
  baseVolatility: number;
  adjustedVolatility: number;
  recentErrorVariance: number;
  expansionFactor: number;
  uncertaintyBand: { lower: number; upper: number };
  autoExpanded: boolean;
  expansionReason: string | null;
}

export interface TailRiskMetrics {
  demandCVaR95: number;
  demandCVaR99: number;
  demandExpectedShortfall: number;
  supplyCVaR95: number;
  supplyCVaR99: number;
  supplyExpectedShortfall: number;
  jointTailRisk: number;
  worstCaseScenario: { demand: number; supply: number; probability: number };
}

export interface TransitionPrediction {
  currentRegime: string;
  predictedNextRegime: string;
  transitionProbability: number;
  transitionScore: number;
  leadingSignals: { indicator: string; contribution: number; direction: string }[];
  expectedTransitionWindow: number;
  confidence: number;
}

export interface SignalStrength {
  indicatorName: string;
  category: string;
  forwardLift: number;
  baselineAccuracy: number;
  enhancedAccuracy: number;
  liftSignificance: number;
  sampleSize: number;
  lagWeeks: number;
  rank: number;
}

export interface LiftDecayPoint {
  horizonWeeks: number;
  lift: number;
  correlation: number;
  persistence: number;
}

export interface LiftDecayAnalysis {
  indicatorName: string;
  decayCurve: LiftDecayPoint[];
  halfLifeWeeks: number;
  persistenceScore: number;
  effectiveHorizon: number;
}

export interface UncertaintyExpansion {
  triggered: boolean;
  currentError: number;
  toleranceThreshold: number;
  expansionMultiplier: number;
  originalBand: { lower: number; upper: number };
  expandedBand: { lower: number; upper: number };
  reason: string;
}

export interface PredictiveStabilityReport {
  version: string;
  engineVersion: string;
  companyId: string;
  configHash: string;
  seed: number;
  generatedAt: string;
  modelWeights: ModelWeight[];
  volatilityEstimates: VolatilityEstimate[];
  tailRiskMetrics: TailRiskMetrics;
  transitionPrediction: TransitionPrediction;
  signalStrengths: SignalStrength[];
  liftDecayAnalyses: LiftDecayAnalysis[];
  uncertaintyExpansion: UncertaintyExpansion;
  productionMutations: number;
  replayable: boolean;
  evidenceBundle: AdaptiveEvidenceBundle;
}

export interface AdaptiveEvidenceBundle {
  provenanceVersion: string;
  engineId: string;
  engineVersion: string;
  companyId: string;
  configHash: string;
  seed: number;
  timestamp: string;
  fdrSeriesLength: number;
  forecastErrorsLength: number;
  indicatorCount: number;
  productionMutations: number;
  replayable: boolean;
}

export function hashAdaptiveConfig(config: AdaptiveForecastConfig): string {
  const normalized = JSON.stringify({
    companyId: config.companyId,
    version: config.version,
    seed: config.seed,
    fdrSeriesLength: config.fdrSeries.length,
    forecastErrorsLength: config.forecastErrors.length,
    actualDemandLength: config.actualDemand.length,
    forecastedDemandLength: config.forecastedDemand.length,
    indicatorNames: config.leadingIndicators.map(i => i.name).sort(),
    toleranceThreshold: config.toleranceThreshold ?? 0.15,
    rollingWindowSize: config.rollingWindowSize ?? 12,
    demandSamples: config.demandSamples ?? 500,
  });
  return createHash("sha256").update(normalized).digest("hex");
}

const MODEL_IDS = ["ema_short", "ema_long", "regime_adjusted"];

function computeEMAForecast(data: number[], alpha: number): number[] {
  if (data.length === 0) return [];
  const result: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

function computeModelForecasts(actualDemand: number[], fdrSeries: number[]): Record<string, number[]> {
  const emaShort = computeEMAForecast(actualDemand, 0.3);
  const emaLong = computeEMAForecast(actualDemand, 0.1);

  const regimeAdj: number[] = [];
  for (let i = 0; i < actualDemand.length; i++) {
    const fdr = i < fdrSeries.length ? fdrSeries[i] : fdrSeries[fdrSeries.length - 1] ?? 0.5;
    const regime = classifyRegimeFromFDR(fdr);
    let multiplier = 1.0;
    if (regime === "ASSET_LED_GROWTH") multiplier = 1.05;
    else if (regime === "IMBALANCED_EXCESS") multiplier = 0.95;
    else if (regime === "REAL_ECONOMY_LEAD") multiplier = 0.9;
    const base = 0.2 * actualDemand[i] + 0.8 * (emaShort[i] ?? actualDemand[i]);
    regimeAdj.push(base * multiplier);
  }

  return {
    ema_short: emaShort,
    ema_long: emaLong,
    regime_adjusted: regimeAdj,
  };
}

export function computeDynamicModelWeights(
  actualDemand: number[],
  fdrSeries: number[],
  rollingWindow: number,
  seed: number,
): ModelWeight[] {
  const modelForecasts = computeModelForecasts(actualDemand, fdrSeries);
  const regimes = fdrSeries.map(f => classifyRegimeFromFDR(f));
  const weights: ModelWeight[] = [];

  for (const regime of REGIME_ORDER) {
    const regimeIndices = regimes
      .map((r, i) => r === regime ? i : -1)
      .filter(i => i >= 0 && i >= actualDemand.length - rollingWindow);

    if (regimeIndices.length === 0) {
      for (const modelId of MODEL_IDS) {
        weights.push({
          modelId,
          regime,
          weight: Math.round((1 / MODEL_IDS.length) * 10000) / 10000,
          rollingError: 0,
          sampleSize: 0,
        });
      }
      continue;
    }

    const errors: Record<string, number> = {};
    for (const modelId of MODEL_IDS) {
      const forecasts = modelForecasts[modelId];
      let sumAbsError = 0;
      for (const idx of regimeIndices) {
        if (idx < forecasts.length && idx < actualDemand.length) {
          sumAbsError += Math.abs(forecasts[idx] - actualDemand[idx]);
        }
      }
      errors[modelId] = regimeIndices.length > 0 ? sumAbsError / regimeIndices.length : 1;
    }

    const inverseErrors = MODEL_IDS.map(m => 1 / Math.max(errors[m], 0.001));
    const totalInverse = inverseErrors.reduce((a, b) => a + b, 0);

    for (let i = 0; i < MODEL_IDS.length; i++) {
      const rawWeight = totalInverse > 0 ? inverseErrors[i] / totalInverse : 1 / MODEL_IDS.length;
      const cappedWeight = Math.max(0.05, Math.min(0.9, rawWeight));
      weights.push({
        modelId: MODEL_IDS[i],
        regime,
        weight: Math.round(cappedWeight * 10000) / 10000,
        rollingError: Math.round(errors[MODEL_IDS[i]] * 10000) / 10000,
        sampleSize: regimeIndices.length,
      });
    }

    const regimeWeights = weights.filter(w => w.regime === regime);
    const sumWeights = regimeWeights.reduce((a, w) => a + w.weight, 0);
    if (sumWeights > 0) {
      for (const w of regimeWeights) {
        w.weight = Math.round((w.weight / sumWeights) * 10000) / 10000;
      }
    }
  }

  return weights;
}

export function computeHeteroskedasticVolatility(
  forecastErrors: number[],
  fdrSeries: number[],
  rollingWindow: number,
  toleranceThreshold: number,
): VolatilityEstimate[] {
  const regimes = fdrSeries.map(f => classifyRegimeFromFDR(f));
  const estimates: VolatilityEstimate[] = [];

  const REGIME_BASE_VOLATILITY: Record<string, number> = {
    HEALTHY_EXPANSION: 0.10,
    ASSET_LED_GROWTH: 0.15,
    IMBALANCED_EXCESS: 0.25,
    REAL_ECONOMY_LEAD: 0.35,
  };

  for (const regime of REGIME_ORDER) {
    const regimeIndices = regimes
      .map((r, i) => r === regime ? i : -1)
      .filter(i => i >= 0);

    const recentIndices = regimeIndices.filter(i => i >= forecastErrors.length - rollingWindow);

    const baseVol = REGIME_BASE_VOLATILITY[regime] ?? 0.15;

    if (recentIndices.length === 0) {
      estimates.push({
        regime,
        baseVolatility: baseVol,
        adjustedVolatility: baseVol,
        recentErrorVariance: 0,
        expansionFactor: 1.0,
        uncertaintyBand: { lower: -baseVol * 1.96, upper: baseVol * 1.96 },
        autoExpanded: false,
        expansionReason: null,
      });
      continue;
    }

    const recentErrors = recentIndices
      .filter(i => i < forecastErrors.length)
      .map(i => forecastErrors[i]);

    const meanError = recentErrors.reduce((a, b) => a + b, 0) / recentErrors.length;
    const meanAbsError = recentErrors.reduce((a, b) => a + Math.abs(b), 0) / recentErrors.length;
    const variance = recentErrors.reduce((a, e) => a + (e - meanError) ** 2, 0) / recentErrors.length;
    const recentStd = Math.sqrt(variance);

    let expansionFactor = 1.0;
    let autoExpanded = false;
    let expansionReason: string | null = null;

    if (meanAbsError > toleranceThreshold) {
      expansionFactor = 1.0 + (meanAbsError - toleranceThreshold) / toleranceThreshold;
      expansionFactor = Math.min(expansionFactor, 3.0);
      autoExpanded = true;
      expansionReason = `Mean absolute error (${Math.round(meanAbsError * 10000) / 10000}) exceeds tolerance (${toleranceThreshold})`;
    } else if (recentStd > toleranceThreshold) {
      expansionFactor = 1.0 + (recentStd - toleranceThreshold) / toleranceThreshold;
      expansionFactor = Math.min(expansionFactor, 3.0);
      autoExpanded = true;
      expansionReason = `Recent error std (${Math.round(recentStd * 10000) / 10000}) exceeds tolerance (${toleranceThreshold})`;
    }

    const adjustedVol = baseVol * expansionFactor;
    const band = {
      lower: Math.round(-adjustedVol * 1.96 * 10000) / 10000,
      upper: Math.round(adjustedVol * 1.96 * 10000) / 10000,
    };

    estimates.push({
      regime,
      baseVolatility: Math.round(baseVol * 10000) / 10000,
      adjustedVolatility: Math.round(adjustedVol * 10000) / 10000,
      recentErrorVariance: Math.round(variance * 10000) / 10000,
      expansionFactor: Math.round(expansionFactor * 10000) / 10000,
      uncertaintyBand: band,
      autoExpanded,
      expansionReason,
    });
  }

  return estimates;
}

export function computeTailRiskMetrics(
  actualDemand: number[],
  forecastedDemand: number[],
  seed: number,
  demandSamples: number,
  supplyDisruptionProb: number,
): TailRiskMetrics {
  const rng = seededRandom(seed);

  const errors = actualDemand.map((a, i) =>
    i < forecastedDemand.length ? a - forecastedDemand[i] : 0
  );
  const meanError = errors.reduce((a, b) => a + b, 0) / Math.max(errors.length, 1);
  const stdError = Math.sqrt(
    errors.reduce((a, e) => a + (e - meanError) ** 2, 0) / Math.max(errors.length, 1)
  );

  const avgDemand = actualDemand.reduce((a, b) => a + b, 0) / Math.max(actualDemand.length, 1);

  const demandScenarios: number[] = [];
  for (let i = 0; i < demandSamples; i++) {
    const u1 = rng();
    const u2 = rng();
    const z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
    demandScenarios.push(avgDemand + z * stdError);
  }
  demandScenarios.sort((a, b) => b - a);

  const supplyScenarios: number[] = [];
  for (let i = 0; i < demandSamples; i++) {
    const disrupted = rng() < supplyDisruptionProb;
    const u1 = rng();
    const u2 = rng();
    const z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
    const baseSupply = avgDemand * (1 + z * 0.1);
    supplyScenarios.push(disrupted ? baseSupply * (0.3 + rng() * 0.4) : baseSupply);
  }
  supplyScenarios.sort((a, b) => a - b);

  function computeCVaR(sortedDescending: number[], alpha: number): number {
    const cutoff = Math.floor(sortedDescending.length * (1 - alpha));
    const tail = sortedDescending.slice(0, Math.max(cutoff, 1));
    return tail.reduce((a, b) => a + b, 0) / tail.length;
  }

  function computeSupplyCVaR(sortedAscending: number[], alpha: number): number {
    const cutoff = Math.floor(sortedAscending.length * (1 - alpha));
    const tail = sortedAscending.slice(0, Math.max(cutoff, 1));
    return tail.reduce((a, b) => a + b, 0) / tail.length;
  }

  const demandCVaR95 = computeCVaR(demandScenarios, 0.95);
  const demandCVaR99 = computeCVaR(demandScenarios, 0.99);
  const demandES = (demandCVaR95 + demandCVaR99) / 2;

  const supplyCVaR95 = computeSupplyCVaR(supplyScenarios, 0.95);
  const supplyCVaR99 = computeSupplyCVaR(supplyScenarios, 0.99);
  const supplyES = (supplyCVaR95 + supplyCVaR99) / 2;

  const worstDemand = demandScenarios[0];
  const worstSupply = supplyScenarios[0];
  const jointTailRisk = Math.max(0, Math.min(1,
    (Math.max(0, worstDemand - avgDemand) / Math.max(avgDemand, 1)) *
    (Math.max(0, avgDemand - worstSupply) / Math.max(avgDemand, 1))
  ));

  return {
    demandCVaR95: Math.round(demandCVaR95 * 100) / 100,
    demandCVaR99: Math.round(demandCVaR99 * 100) / 100,
    demandExpectedShortfall: Math.round(demandES * 100) / 100,
    supplyCVaR95: Math.round(supplyCVaR95 * 100) / 100,
    supplyCVaR99: Math.round(supplyCVaR99 * 100) / 100,
    supplyExpectedShortfall: Math.round(supplyES * 100) / 100,
    jointTailRisk: Math.round(jointTailRisk * 10000) / 10000,
    worstCaseScenario: {
      demand: Math.round(worstDemand * 100) / 100,
      supply: Math.round(worstSupply * 100) / 100,
      probability: Math.round((1 / demandSamples) * 10000) / 10000,
    },
  };
}

export function computeRegimeTransitionPrediction(
  fdrSeries: number[],
  leadingIndicators: LeadingIndicator[],
  seed: number,
): TransitionPrediction {
  if (fdrSeries.length === 0) {
    return {
      currentRegime: "HEALTHY_EXPANSION",
      predictedNextRegime: "HEALTHY_EXPANSION",
      transitionProbability: 0,
      transitionScore: 0,
      leadingSignals: [],
      expectedTransitionWindow: 52,
      confidence: 0,
    };
  }

  const currentFdr = fdrSeries[fdrSeries.length - 1];
  const currentRegime = classifyRegimeFromFDR(currentFdr);
  const currentIdx = REGIME_ORDER.indexOf(currentRegime);
  const thresholds = CANONICAL_REGIME_THRESHOLDS[currentRegime];

  const recentWindow = Math.min(12, fdrSeries.length);
  const recentFdrs = fdrSeries.slice(-recentWindow);
  const fdrTrend = recentFdrs.length >= 2
    ? (recentFdrs[recentFdrs.length - 1] - recentFdrs[0]) / recentFdrs.length
    : 0;

  const fdrMomentum = recentFdrs.length >= 4
    ? (recentFdrs.slice(-4).reduce((a, b) => a + b, 0) / 4) -
      (recentFdrs.slice(0, 4).reduce((a, b) => a + b, 0) / Math.min(4, recentFdrs.length))
    : 0;

  const distToUpper = thresholds.max - currentFdr;
  const distToLower = currentFdr - thresholds.min;
  const isMovingUp = fdrTrend > 0;
  const distToEdge = isMovingUp ? distToUpper : distToLower;

  let predictedNext: string;
  if (isMovingUp && currentIdx < REGIME_ORDER.length - 1) {
    predictedNext = REGIME_ORDER[currentIdx + 1];
  } else if (!isMovingUp && currentIdx > 0) {
    predictedNext = REGIME_ORDER[currentIdx - 1];
  } else {
    predictedNext = currentRegime;
  }

  const leadingSignals: { indicator: string; contribution: number; direction: string }[] = [];
  let indicatorScore = 0;

  for (const indicator of leadingIndicators) {
    if (indicator.values.length < 2) continue;
    const recentVals = indicator.values.slice(-Math.min(8, indicator.values.length));
    const indTrend = (recentVals[recentVals.length - 1] - recentVals[0]) / recentVals.length;

    const direction = indTrend > 0 ? "rising" : indTrend < 0 ? "falling" : "stable";
    const contribution = Math.min(1, Math.abs(indTrend) * indicator.lagWeeks * 0.1);

    const alignsWithFdrTrend = (indTrend > 0 && fdrTrend > 0) || (indTrend < 0 && fdrTrend < 0);
    if (alignsWithFdrTrend) indicatorScore += contribution;

    leadingSignals.push({
      indicator: indicator.name,
      contribution: Math.round(contribution * 10000) / 10000,
      direction,
    });
  }

  const trendMagnitude = Math.abs(fdrTrend);
  const momentumMagnitude = Math.abs(fdrMomentum);
  const proximityScore = distToEdge > 0 ? 1 / (1 + distToEdge * 2) : 0.9;

  const rawTransitionProb = Math.min(1, (trendMagnitude * 3 + momentumMagnitude * 2 + proximityScore * 0.3 + indicatorScore * 0.2));
  const transitionProb = Math.round(Math.min(0.95, rawTransitionProb) * 10000) / 10000;

  const transitionScore = Math.round(
    Math.min(1, trendMagnitude * 5 + momentumMagnitude * 3 + proximityScore * 0.4) * 10000
  ) / 10000;

  const expectedWindow = Math.max(1, Math.round(
    distToEdge > 0 && trendMagnitude > 0 ? distToEdge / Math.max(trendMagnitude, 0.001) : 52
  ));

  const confidence = Math.round(
    Math.min(1, (recentWindow / 12) * 0.4 + (leadingSignals.length > 0 ? 0.3 : 0) + (transitionProb > 0.1 ? 0.3 : 0.1)) * 10000
  ) / 10000;

  return {
    currentRegime,
    predictedNextRegime: predictedNext,
    transitionProbability: transitionProb,
    transitionScore,
    leadingSignals,
    expectedTransitionWindow: expectedWindow,
    confidence,
  };
}

export function computeSignalStrengths(
  actualDemand: number[],
  forecastedDemand: number[],
  leadingIndicators: LeadingIndicator[],
  rollingWindow: number,
): SignalStrength[] {
  const n = Math.min(actualDemand.length, forecastedDemand.length);
  if (n === 0) return [];

  const baselineErrors = actualDemand.slice(0, n).map((a, i) => Math.abs(a - forecastedDemand[i]));
  const avgDemand = actualDemand.reduce((a, b) => a + b, 0) / actualDemand.length;
  const baselineWAPE = baselineErrors.reduce((a, b) => a + b, 0) / Math.max(n * avgDemand, 1);
  const baselineAccuracy = Math.max(0, 1 - baselineWAPE);

  const strengths: SignalStrength[] = [];

  for (const indicator of leadingIndicators) {
    const laggedN = Math.min(n, indicator.values.length - indicator.lagWeeks);
    if (laggedN <= 0) {
      strengths.push({
        indicatorName: indicator.name,
        category: indicator.category,
        forwardLift: 0,
        baselineAccuracy: Math.round(baselineAccuracy * 10000) / 10000,
        enhancedAccuracy: Math.round(baselineAccuracy * 10000) / 10000,
        liftSignificance: 0,
        sampleSize: 0,
        lagWeeks: indicator.lagWeeks,
        rank: 0,
      });
      continue;
    }

    let enhancedSumError = 0;
    let count = 0;
    for (let i = 0; i < laggedN; i++) {
      const indIdx = i + indicator.lagWeeks;
      if (indIdx >= indicator.values.length) break;

      const indValue = indicator.values[indIdx];
      const indMean = indicator.values.slice(0, indIdx + 1).reduce((a, b) => a + b, 0) / (indIdx + 1);
      const indSignal = indMean > 0 ? indValue / indMean : 1;

      const adjustedForecast = forecastedDemand[i] * (0.7 + 0.3 * indSignal);
      enhancedSumError += Math.abs(actualDemand[i] - adjustedForecast);
      count++;
    }

    const enhancedWAPE = count > 0 ? enhancedSumError / Math.max(count * avgDemand, 1) : baselineWAPE;
    const enhancedAccuracy = Math.max(0, 1 - enhancedWAPE);
    const forwardLift = enhancedAccuracy - baselineAccuracy;
    const liftSignificance = count >= rollingWindow ? Math.min(1, Math.abs(forwardLift) * Math.sqrt(count) * 3) : 0;

    strengths.push({
      indicatorName: indicator.name,
      category: indicator.category,
      forwardLift: Math.round(forwardLift * 10000) / 10000,
      baselineAccuracy: Math.round(baselineAccuracy * 10000) / 10000,
      enhancedAccuracy: Math.round(enhancedAccuracy * 10000) / 10000,
      liftSignificance: Math.round(liftSignificance * 10000) / 10000,
      sampleSize: count,
      lagWeeks: indicator.lagWeeks,
      rank: 0,
    });
  }

  strengths.sort((a, b) => b.forwardLift - a.forwardLift);
  strengths.forEach((s, i) => { s.rank = i + 1; });

  return strengths;
}

export function computeLiftDecayAnalysis(
  actualDemand: number[],
  forecastedDemand: number[],
  indicator: LeadingIndicator,
  maxHorizon: number,
): LiftDecayAnalysis {
  const decayCurve: LiftDecayPoint[] = [];
  const n = Math.min(actualDemand.length, forecastedDemand.length);
  const avgDemand = actualDemand.reduce((a, b) => a + b, 0) / Math.max(actualDemand.length, 1);

  const baselineErrors = actualDemand.slice(0, n).map((a, i) => Math.abs(a - forecastedDemand[i]));
  const baselineWAPE = baselineErrors.reduce((a, b) => a + b, 0) / Math.max(n * avgDemand, 1);
  const baselineAccuracy = 1 - baselineWAPE;

  for (let h = 1; h <= maxHorizon; h++) {
    const effectiveLag = indicator.lagWeeks + h;
    const usableN = Math.min(n, indicator.values.length - effectiveLag);

    if (usableN <= 2) {
      decayCurve.push({ horizonWeeks: h, lift: 0, correlation: 0, persistence: 0 });
      continue;
    }

    let enhancedSumError = 0;
    let count = 0;
    const indVals: number[] = [];
    const actVals: number[] = [];

    for (let i = 0; i < usableN; i++) {
      const indIdx = i + effectiveLag;
      if (indIdx >= indicator.values.length) break;

      const indValue = indicator.values[indIdx];
      const indMean = indicator.values.slice(0, indIdx + 1).reduce((a, b) => a + b, 0) / (indIdx + 1);
      const indSignal = indMean > 0 ? indValue / indMean : 1;

      const adjustedForecast = forecastedDemand[i] * (0.7 + 0.3 * indSignal);
      enhancedSumError += Math.abs(actualDemand[i] - adjustedForecast);
      indVals.push(indValue);
      actVals.push(actualDemand[i]);
      count++;
    }

    const enhancedWAPE = count > 0 ? enhancedSumError / Math.max(count * avgDemand, 1) : baselineWAPE;
    const enhancedAccuracy = 1 - enhancedWAPE;
    const lift = enhancedAccuracy - baselineAccuracy;

    let correlation = 0;
    if (count >= 2) {
      const meanInd = indVals.reduce((a, b) => a + b, 0) / count;
      const meanAct = actVals.reduce((a, b) => a + b, 0) / count;
      let covSum = 0, varInd = 0, varAct = 0;
      for (let i = 0; i < count; i++) {
        covSum += (indVals[i] - meanInd) * (actVals[i] - meanAct);
        varInd += (indVals[i] - meanInd) ** 2;
        varAct += (actVals[i] - meanAct) ** 2;
      }
      const denom = Math.sqrt(varInd * varAct);
      correlation = denom > 0 ? covSum / denom : 0;
    }

    const persistence = decayCurve.length > 0 && decayCurve[0].lift > 0
      ? Math.max(0, lift / decayCurve[0].lift)
      : lift > 0 ? 1 : 0;

    decayCurve.push({
      horizonWeeks: h,
      lift: Math.round(lift * 10000) / 10000,
      correlation: Math.round(correlation * 10000) / 10000,
      persistence: Math.round(persistence * 10000) / 10000,
    });
  }

  let halfLifeWeeks = maxHorizon;
  const initialLift = decayCurve.length > 0 ? decayCurve[0].lift : 0;
  if (initialLift > 0) {
    for (const point of decayCurve) {
      if (point.lift <= initialLift / 2) {
        halfLifeWeeks = point.horizonWeeks;
        break;
      }
    }
  }

  const avgPersistence = decayCurve.length > 0
    ? decayCurve.reduce((a, p) => a + p.persistence, 0) / decayCurve.length
    : 0;

  let effectiveHorizon = 0;
  for (const point of decayCurve) {
    if (point.lift > 0.001) effectiveHorizon = point.horizonWeeks;
    else break;
  }

  return {
    indicatorName: indicator.name,
    decayCurve,
    halfLifeWeeks,
    persistenceScore: Math.round(avgPersistence * 10000) / 10000,
    effectiveHorizon,
  };
}

export function computeUncertaintyExpansion(
  forecastErrors: number[],
  toleranceThreshold: number,
  currentRegimeVolatility: number,
  rollingWindow: number,
): UncertaintyExpansion {
  const recentErrors = forecastErrors.slice(-rollingWindow);
  if (recentErrors.length === 0) {
    return {
      triggered: false,
      currentError: 0,
      toleranceThreshold,
      expansionMultiplier: 1.0,
      originalBand: { lower: -currentRegimeVolatility * 1.96, upper: currentRegimeVolatility * 1.96 },
      expandedBand: { lower: -currentRegimeVolatility * 1.96, upper: currentRegimeVolatility * 1.96 },
      reason: "No recent forecast errors available",
    };
  }

  const meanError = recentErrors.reduce((a, b) => a + Math.abs(b), 0) / recentErrors.length;
  const errorStd = Math.sqrt(
    recentErrors.reduce((a, e) => a + (Math.abs(e) - meanError) ** 2, 0) / recentErrors.length
  );

  const originalLower = -currentRegimeVolatility * 1.96;
  const originalUpper = currentRegimeVolatility * 1.96;

  let expansionMultiplier = 1.0;
  let triggered = false;
  let reason = "Forecast error within tolerance bounds";

  if (meanError > toleranceThreshold) {
    triggered = true;
    expansionMultiplier = 1.0 + (meanError - toleranceThreshold) / toleranceThreshold;
    expansionMultiplier = Math.min(expansionMultiplier, 3.0);
    reason = `Mean absolute error (${Math.round(meanError * 10000) / 10000}) exceeds tolerance (${toleranceThreshold}); bands expanded by ${Math.round(expansionMultiplier * 100) / 100}x`;
  }

  if (!triggered && errorStd > toleranceThreshold * 1.5) {
    triggered = true;
    expansionMultiplier = 1.0 + (errorStd - toleranceThreshold * 1.5) / (toleranceThreshold * 1.5);
    expansionMultiplier = Math.min(expansionMultiplier, 2.5);
    reason = `Error volatility (${Math.round(errorStd * 10000) / 10000}) exceeds 1.5x tolerance; bands expanded by ${Math.round(expansionMultiplier * 100) / 100}x`;
  }

  return {
    triggered,
    currentError: Math.round(meanError * 10000) / 10000,
    toleranceThreshold,
    expansionMultiplier: Math.round(expansionMultiplier * 10000) / 10000,
    originalBand: {
      lower: Math.round(originalLower * 10000) / 10000,
      upper: Math.round(originalUpper * 10000) / 10000,
    },
    expandedBand: {
      lower: Math.round(originalLower * expansionMultiplier * 10000) / 10000,
      upper: Math.round(originalUpper * expansionMultiplier * 10000) / 10000,
    },
    reason,
  };
}

export function runAdaptiveForecastAnalysis(config: AdaptiveForecastConfig): PredictiveStabilityReport {
  const {
    companyId, version, seed,
    fdrSeries, forecastErrors, actualDemand, forecastedDemand, leadingIndicators,
    toleranceThreshold = 0.15,
    rollingWindowSize = 12,
    demandSamples = 500,
    supplyDisruptionProbability = 0.05,
  } = config;

  const configHash = hashAdaptiveConfig(config);

  const modelWeights = computeDynamicModelWeights(actualDemand, fdrSeries, rollingWindowSize, seed);

  const volatilityEstimates = computeHeteroskedasticVolatility(forecastErrors, fdrSeries, rollingWindowSize, toleranceThreshold);

  const tailRiskMetrics = computeTailRiskMetrics(actualDemand, forecastedDemand, seed, demandSamples, supplyDisruptionProbability);

  const transitionPrediction = computeRegimeTransitionPrediction(fdrSeries, leadingIndicators, seed);

  const signalStrengths = computeSignalStrengths(actualDemand, forecastedDemand, leadingIndicators, rollingWindowSize);

  const liftDecayAnalyses = leadingIndicators.map(ind =>
    computeLiftDecayAnalysis(actualDemand, forecastedDemand, ind, Math.min(12, Math.floor(actualDemand.length / 3)))
  );

  const currentRegime = fdrSeries.length > 0 ? classifyRegimeFromFDR(fdrSeries[fdrSeries.length - 1]) : "HEALTHY_EXPANSION";
  const currentVol = volatilityEstimates.find(v => v.regime === currentRegime);
  const uncertaintyExpansion = computeUncertaintyExpansion(
    forecastErrors,
    toleranceThreshold,
    currentVol?.adjustedVolatility ?? 0.15,
    rollingWindowSize,
  );

  const evidenceBundle: AdaptiveEvidenceBundle = {
    provenanceVersion: "5.0.0",
    engineId: "adaptive_forecasting_v1",
    engineVersion: ADAPTIVE_ENGINE_VERSION,
    companyId,
    configHash,
    seed,
    timestamp: new Date().toISOString(),
    fdrSeriesLength: fdrSeries.length,
    forecastErrorsLength: forecastErrors.length,
    indicatorCount: leadingIndicators.length,
    productionMutations: 0,
    replayable: true,
  };

  return {
    version,
    engineVersion: ADAPTIVE_ENGINE_VERSION,
    companyId,
    configHash,
    seed,
    generatedAt: new Date().toISOString(),
    modelWeights,
    volatilityEstimates,
    tailRiskMetrics,
    transitionPrediction,
    signalStrengths,
    liftDecayAnalyses,
    uncertaintyExpansion,
    productionMutations: 0,
    replayable: true,
    evidenceBundle,
  };
}

export function generateStabilityReportMd(report: PredictiveStabilityReport): string {
  const lines: string[] = [];
  lines.push(`# Predictive Stability Report v${report.version}`);
  lines.push(`\n**Engine**: ${report.engineVersion}`);
  lines.push(`**Company**: ${report.companyId}`);
  lines.push(`**Config Hash**: ${report.configHash}`);
  lines.push(`**Seed**: ${report.seed}`);
  lines.push(`**Generated**: ${report.generatedAt}`);
  lines.push(`**Production Mutations**: ${report.productionMutations}`);

  lines.push(`\n## Dynamic Model Weights`);
  lines.push(`| Model | Regime | Weight | Rolling Error | Samples |`);
  lines.push(`|-------|--------|--------|---------------|---------|`);
  for (const w of report.modelWeights) {
    lines.push(`| ${w.modelId} | ${w.regime} | ${(w.weight * 100).toFixed(2)}% | ${w.rollingError.toFixed(4)} | ${w.sampleSize} |`);
  }

  lines.push(`\n## Volatility Estimates`);
  lines.push(`| Regime | Base Vol | Adjusted Vol | Expansion | Auto-Expanded |`);
  lines.push(`|--------|----------|--------------|-----------|---------------|`);
  for (const v of report.volatilityEstimates) {
    lines.push(`| ${v.regime} | ${v.baseVolatility.toFixed(4)} | ${v.adjustedVolatility.toFixed(4)} | ${v.expansionFactor.toFixed(2)}x | ${v.autoExpanded ? "Yes" : "No"} |`);
  }

  lines.push(`\n## Tail Risk Metrics`);
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Demand CVaR (95%) | ${report.tailRiskMetrics.demandCVaR95.toFixed(2)} |`);
  lines.push(`| Demand CVaR (99%) | ${report.tailRiskMetrics.demandCVaR99.toFixed(2)} |`);
  lines.push(`| Demand Expected Shortfall | ${report.tailRiskMetrics.demandExpectedShortfall.toFixed(2)} |`);
  lines.push(`| Supply CVaR (95%) | ${report.tailRiskMetrics.supplyCVaR95.toFixed(2)} |`);
  lines.push(`| Supply CVaR (99%) | ${report.tailRiskMetrics.supplyCVaR99.toFixed(2)} |`);
  lines.push(`| Supply Expected Shortfall | ${report.tailRiskMetrics.supplyExpectedShortfall.toFixed(2)} |`);
  lines.push(`| Joint Tail Risk | ${report.tailRiskMetrics.jointTailRisk.toFixed(4)} |`);

  lines.push(`\n## Regime Transition Prediction`);
  lines.push(`| Property | Value |`);
  lines.push(`|----------|-------|`);
  lines.push(`| Current Regime | ${report.transitionPrediction.currentRegime} |`);
  lines.push(`| Predicted Next | ${report.transitionPrediction.predictedNextRegime} |`);
  lines.push(`| Transition Probability | ${(report.transitionPrediction.transitionProbability * 100).toFixed(2)}% |`);
  lines.push(`| Transition Score | ${report.transitionPrediction.transitionScore.toFixed(4)} |`);
  lines.push(`| Expected Window | ${report.transitionPrediction.expectedTransitionWindow} weeks |`);
  lines.push(`| Confidence | ${(report.transitionPrediction.confidence * 100).toFixed(1)}% |`);

  if (report.signalStrengths.length > 0) {
    lines.push(`\n## Signal Strengths`);
    lines.push(`| Rank | Indicator | Category | Forward Lift | Significance | Lag |`);
    lines.push(`|------|-----------|----------|-------------|--------------|-----|`);
    for (const s of report.signalStrengths) {
      lines.push(`| ${s.rank} | ${s.indicatorName} | ${s.category} | ${(s.forwardLift * 100).toFixed(2)}% | ${s.liftSignificance.toFixed(4)} | ${s.lagWeeks}w |`);
    }
  }

  if (report.liftDecayAnalyses.length > 0) {
    lines.push(`\n## Lift Decay Analysis`);
    for (const lda of report.liftDecayAnalyses) {
      lines.push(`\n### ${lda.indicatorName}`);
      lines.push(`- Half-Life: ${lda.halfLifeWeeks} weeks`);
      lines.push(`- Persistence Score: ${lda.persistenceScore.toFixed(4)}`);
      lines.push(`- Effective Horizon: ${lda.effectiveHorizon} weeks`);
      if (lda.decayCurve.length > 0) {
        lines.push(`| Horizon | Lift | Correlation | Persistence |`);
        lines.push(`|---------|------|-------------|-------------|`);
        for (const p of lda.decayCurve) {
          lines.push(`| ${p.horizonWeeks}w | ${(p.lift * 100).toFixed(2)}% | ${p.correlation.toFixed(4)} | ${p.persistence.toFixed(4)} |`);
        }
      }
    }
  }

  lines.push(`\n## Uncertainty Expansion`);
  lines.push(`| Property | Value |`);
  lines.push(`|----------|-------|`);
  lines.push(`| Triggered | ${report.uncertaintyExpansion.triggered ? "Yes" : "No"} |`);
  lines.push(`| Current Error | ${report.uncertaintyExpansion.currentError.toFixed(4)} |`);
  lines.push(`| Tolerance Threshold | ${report.uncertaintyExpansion.toleranceThreshold} |`);
  lines.push(`| Expansion Multiplier | ${report.uncertaintyExpansion.expansionMultiplier.toFixed(2)}x |`);
  lines.push(`| Original Band | [${report.uncertaintyExpansion.originalBand.lower.toFixed(4)}, ${report.uncertaintyExpansion.originalBand.upper.toFixed(4)}] |`);
  lines.push(`| Expanded Band | [${report.uncertaintyExpansion.expandedBand.lower.toFixed(4)}, ${report.uncertaintyExpansion.expandedBand.upper.toFixed(4)}] |`);
  lines.push(`| Reason | ${report.uncertaintyExpansion.reason} |`);

  lines.push(`\n## Production Safety`);
  lines.push(`- Production mutations: ${report.productionMutations}`);
  lines.push(`- Replayable: ${report.replayable}`);
  lines.push(`- Config hash: ${report.configHash}`);

  lines.push(`\n---`);
  lines.push(`*Generated by Prescient Labs Adaptive Forecasting Engine v${report.engineVersion}*`);

  return lines.join("\n");
}
