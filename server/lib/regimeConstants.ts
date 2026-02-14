export type Regime = "HEALTHY_EXPANSION" | "ASSET_LED_GROWTH" | "IMBALANCED_EXCESS" | "REAL_ECONOMY_LEAD";

export const REGIME_ORDER: Regime[] = ["HEALTHY_EXPANSION", "ASSET_LED_GROWTH", "IMBALANCED_EXCESS", "REAL_ECONOMY_LEAD"];

export const CANONICAL_REGIME_THRESHOLDS: Record<Regime, { min: number; max: number }> = {
  HEALTHY_EXPANSION: { min: 0.0, max: 1.2 },
  ASSET_LED_GROWTH: { min: 1.2, max: 1.8 },
  IMBALANCED_EXCESS: { min: 1.8, max: 2.5 },
  REAL_ECONOMY_LEAD: { min: 2.5, max: 10.0 },
};

export const HYSTERESIS_BAND = 0.15;
export const REVERSION_PENALTY_MULTIPLIER = 2.0; // 2x threshold for reverting to previous regime
export const MIN_REGIME_DURATION_DAYS = 14;
export const CONFIRMATION_READINGS = 3;

export const TYPICAL_REGIME_DURATIONS: Record<Regime, number> = {
  HEALTHY_EXPANSION: 540,
  ASSET_LED_GROWTH: 270,
  IMBALANCED_EXCESS: 180,
  REAL_ECONOMY_LEAD: 120,
};

export function classifyRegimeFromFDR(fdr: number): Regime {
  if (!Number.isFinite(fdr) || fdr < 0) {
    return "HEALTHY_EXPANSION";
  }
  if (fdr >= CANONICAL_REGIME_THRESHOLDS.REAL_ECONOMY_LEAD.min) {
    return "REAL_ECONOMY_LEAD";
  } else if (fdr >= CANONICAL_REGIME_THRESHOLDS.IMBALANCED_EXCESS.min) {
    return "IMBALANCED_EXCESS";
  } else if (fdr >= CANONICAL_REGIME_THRESHOLDS.ASSET_LED_GROWTH.min) {
    return "ASSET_LED_GROWTH";
  } else {
    return "HEALTHY_EXPANSION";
  }
}

export function classifyRegimeWithHysteresis(
  fdr: number, 
  currentRegime: Regime,
  previousRegime?: Regime | null
): { regime: Regime; requiresConfirmation: boolean; isReversion: boolean } {
  if (!Number.isFinite(fdr) || fdr < 0) {
    return { regime: currentRegime, requiresConfirmation: false, isReversion: false };
  }
  const rawRegime = classifyRegimeFromFDR(fdr);
  
  if (rawRegime === currentRegime) {
    return { regime: currentRegime, requiresConfirmation: false, isReversion: false };
  }
  
  const currentThreshold = CANONICAL_REGIME_THRESHOLDS[currentRegime];
  const isMovingUp = REGIME_ORDER.indexOf(rawRegime) > REGIME_ORDER.indexOf(currentRegime);
  const isReversion = previousRegime ? rawRegime === previousRegime : false;
  
  // Apply 2x hysteresis band for reversions to prior regime
  const effectiveHysteresis = isReversion 
    ? HYSTERESIS_BAND * REVERSION_PENALTY_MULTIPLIER 
    : HYSTERESIS_BAND;
  
  if (isMovingUp) {
    const upperBound = currentThreshold.max;
    if (fdr >= upperBound + effectiveHysteresis) {
      return { regime: rawRegime, requiresConfirmation: true, isReversion };
    }
  } else {
    const lowerBound = currentThreshold.min;
    if (fdr <= lowerBound - effectiveHysteresis) {
      return { regime: rawRegime, requiresConfirmation: true, isReversion };
    }
  }
  
  return { regime: currentRegime, requiresConfirmation: false, isReversion: false };
}

const REGIME_ALIASES: Record<string, Regime> = {
  "HEALTHY_EXPANSION": "HEALTHY_EXPANSION",
  "ASSET_LED_GROWTH": "ASSET_LED_GROWTH",
  "IMBALANCED_EXCESS": "IMBALANCED_EXCESS",
  "REAL_ECONOMY_LEAD": "REAL_ECONOMY_LEAD",
  "Healthy Expansion": "HEALTHY_EXPANSION",
  "Asset Led Growth": "ASSET_LED_GROWTH",
  "Asset-Led Growth": "ASSET_LED_GROWTH",
  "Imbalanced Excess": "IMBALANCED_EXCESS",
  "Real Economy Lead": "REAL_ECONOMY_LEAD",
  "healthy_expansion": "HEALTHY_EXPANSION",
  "asset_led_growth": "ASSET_LED_GROWTH",
  "imbalanced_excess": "IMBALANCED_EXCESS",
  "real_economy_lead": "REAL_ECONOMY_LEAD",
};

export function normalizeRegimeName(input: string): Regime {
  const mapped = REGIME_ALIASES[input];
  if (mapped) return mapped;
  const upper = input.toUpperCase().replace(/[\s-]+/g, '_');
  if (REGIME_ORDER.includes(upper as Regime)) return upper as Regime;
  return "HEALTHY_EXPANSION";
}

export interface RegimeEvidence {
  fdr: number;
  regime: Regime;
  thresholds: { min: number; max: number };
  confidence: {
    overall: number;
    fdrStability: number;
    regimeMaturity: number;
    transitionRisk: number;
    dataQuality: number;
  };
  distanceToNextThreshold: number;
  regimeDurationDays: number;
  dataSource: string;
  timestamp: string;
}

export function buildRegimeEvidence(
  fdr: number,
  regime: Regime,
  confidence: { overall: number; fdrStability: number; regimeMaturity: number; transitionRisk: number; dataQuality: number },
  regimeDurationDays: number,
  dataSource: string
): RegimeEvidence {
  const thresholds = CANONICAL_REGIME_THRESHOLDS[regime];
  const idx = REGIME_ORDER.indexOf(regime);
  const nextThreshold = idx < REGIME_ORDER.length - 1
    ? CANONICAL_REGIME_THRESHOLDS[REGIME_ORDER[idx + 1]].min
    : thresholds.max;
  const distanceToNextThreshold = Math.abs(nextThreshold - fdr);

  return {
    fdr,
    regime,
    thresholds,
    confidence,
    distanceToNextThreshold: Math.round(distanceToNextThreshold * 100) / 100,
    regimeDurationDays,
    dataSource,
    timestamp: new Date().toISOString(),
  };
}

export function validateRegimeClassification(fdr: number, storedRegime: string): {
  isValid: boolean;
  canonicalRegime: Regime;
  storedRegime: string;
  fdr: number;
  violation?: string;
} {
  const canonicalRegime = classifyRegimeFromFDR(fdr);
  const isValid = storedRegime === canonicalRegime;
  
  return {
    isValid,
    canonicalRegime,
    storedRegime,
    fdr,
    violation: isValid ? undefined : `FDR ${fdr} should be ${canonicalRegime}, not ${storedRegime}`,
  };
}
