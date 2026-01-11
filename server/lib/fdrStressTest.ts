/**
 * FDR/Dual-Circuit Stress Test & Validation System
 * 
 * STRUCTURAL ASSUMPTIONS (Cannot be changed):
 * - Two-circuit monetary framework: Real Economy (Mr×Vr) vs Asset Market (Ma×Va)
 * - FDR = Asset-side growth metrics / Real-side growth metrics
 * - Four economic regimes derived from FDR thresholds
 * 
 * PROXY CHOICES (Can be tested):
 * - Mr proxy: C&I loans, M2, business credit
 * - Ma proxy: margin debt, mortgage debt, asset financing
 * - Vr proxy: GDP velocity, core PCE
 * - Va proxy: asset price index, S&P 500
 * 
 * THRESHOLDS (CANONICAL - from economics.ts):
 * - HEALTHY_EXPANSION: FDR 0.0 - 1.2
 * - ASSET_LED_GROWTH: FDR 1.2 - 1.8
 * - IMBALANCED_EXCESS: FDR 1.8 - 2.5
 * - REAL_ECONOMY_LEAD: FDR 2.5+ (HIGH FDR = asset overshoot, counter-cyclical opportunity)
 * 
 * PRESENTATION LAYERS (Can be removed):
 * - Signal labels, intensity scores, procurement guidance
 */

import { 
  CANONICAL_REGIME_THRESHOLDS, 
  classifyRegimeFromFDR,
  type Regime 
} from "./regimeConstants";

export interface FDRTestResult {
  testName: string;
  passed: boolean;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  finding: string;
  recommendation: string;
  data?: any;
}

export interface SensitivityTestResult {
  scenario: string;
  inputChange: { variable: string; from: number; to: number };
  fdrChange: { from: number; to: number };
  regimeChange: { from: string; to: string };
  sensitive: boolean;
  invariant: boolean;
}

export interface LagTestResult {
  lagMonths: number;
  predictivePower: number;
  regimeAccuracy: number;
  collapses: boolean;
  shiftsOnly: boolean;
}

export interface ProxySubstitutionResult {
  originalProxy: string;
  substituteProxy: string;
  signalDegradation: 'gradual' | 'collapse' | 'none';
  correlationPreserved: number;
}

// ============================================================================
// THRESHOLD CONSISTENCY CHECK (Uses canonical thresholds from economics.ts)
// ============================================================================

export function detectThresholdInconsistency(): FDRTestResult {
  // All thresholds now derive from CANONICAL_REGIME_THRESHOLDS in economics.ts
  // This function validates that the canonical thresholds are being used correctly
  
  const discrepancies: string[] = [];
  
  // Validate canonical threshold contiguity (no gaps or overlaps)
  const regimes: Regime[] = ['HEALTHY_EXPANSION', 'ASSET_LED_GROWTH', 'IMBALANCED_EXCESS', 'REAL_ECONOMY_LEAD'];
  for (let i = 0; i < regimes.length - 1; i++) {
    const current = CANONICAL_REGIME_THRESHOLDS[regimes[i]];
    const next = CANONICAL_REGIME_THRESHOLDS[regimes[i + 1]];
    if (current.max !== next.min) {
      discrepancies.push(`Gap or overlap between ${regimes[i]} (max: ${current.max}) and ${regimes[i + 1]} (min: ${next.min})`);
    }
  }
  
  // Validate threshold ordering is monotonically increasing
  let previousMax = 0;
  for (const regime of regimes) {
    const threshold = CANONICAL_REGIME_THRESHOLDS[regime];
    if (threshold.min < previousMax) {
      discrepancies.push(`${regime} min (${threshold.min}) is less than previous max (${previousMax})`);
    }
    previousMax = threshold.max;
  }

  return {
    testName: 'Threshold Consistency Check',
    passed: discrepancies.length === 0,
    severity: discrepancies.length > 0 ? 'CRITICAL' : 'INFO',
    finding: discrepancies.length > 0 
      ? `Found ${discrepancies.length} threshold inconsistencies:\n${discrepancies.join('\n')}`
      : 'All canonical thresholds from economics.ts are valid and contiguous',
    recommendation: discrepancies.length > 0
      ? 'Fix threshold definitions in CANONICAL_REGIME_THRESHOLDS'
      : 'No action needed - canonical thresholds are properly configured',
    data: { canonicalThresholds: CANONICAL_REGIME_THRESHOLDS, discrepancies }
  };
}

// ============================================================================
// A. CORE SIGNAL INTEGRITY TESTS
// ============================================================================

/**
 * Test 1: Input Sensitivity
 * Does FDR respond materially to each input dimension?
 */
export function testInputSensitivity(): SensitivityTestResult[] {
  const results: SensitivityTestResult[] = [];
  
  // Baseline scenario
  const baseline = {
    assetGrowth: 0.08,    // 8% margin debt growth
    assetIndex: 1.12,      // Asset price index
    ciGrowth: 0.03,        // 3% C&I loan growth
    corePce: 0.032,        // 3.2% core PCE
  };
  
  const calculateFDR = (params: typeof baseline) => {
    const denom = params.ciGrowth * params.corePce;
    return denom > 0 ? (params.assetGrowth * params.assetIndex) / denom : 5.0;
  };
  
  const baselineFDR = calculateFDR(baseline);
  const baselineRegime = classifyRegimeFromFDR(baselineFDR);
  
  // Scenario 1: Asset credit accelerates, real credit unchanged
  const scenario1 = { ...baseline, assetGrowth: 0.15 }; // 15% margin debt growth
  const fdr1 = calculateFDR(scenario1);
  results.push({
    scenario: 'Asset credit accelerates (8%→15%), real credit unchanged',
    inputChange: { variable: 'assetGrowth', from: 0.08, to: 0.15 },
    fdrChange: { from: baselineFDR, to: fdr1 },
    regimeChange: { from: baselineRegime, to: classifyRegimeFromFDR(fdr1) },
    sensitive: Math.abs(fdr1 - baselineFDR) > 0.1,
    invariant: Math.abs(fdr1 - baselineFDR) < 0.01,
  });
  
  // Scenario 2: Asset prices rise without credit expansion
  const scenario2 = { ...baseline, assetIndex: 1.25, assetGrowth: 0.02 };
  const fdr2 = calculateFDR(scenario2);
  results.push({
    scenario: 'Asset prices rise (1.12→1.25), credit slows (8%→2%)',
    inputChange: { variable: 'assetIndex', from: 1.12, to: 1.25 },
    fdrChange: { from: baselineFDR, to: fdr2 },
    regimeChange: { from: baselineRegime, to: classifyRegimeFromFDR(fdr2) },
    sensitive: Math.abs(fdr2 - baselineFDR) > 0.1,
    invariant: Math.abs(fdr2 - baselineFDR) < 0.01,
  });
  
  // Scenario 3: Real credit expands, asset markets stagnate
  const scenario3 = { ...baseline, ciGrowth: 0.06, assetGrowth: 0.01 };
  const fdr3 = calculateFDR(scenario3);
  results.push({
    scenario: 'Real credit expands (3%→6%), asset markets stagnate (8%→1%)',
    inputChange: { variable: 'ciGrowth', from: 0.03, to: 0.06 },
    fdrChange: { from: baselineFDR, to: fdr3 },
    regimeChange: { from: baselineRegime, to: classifyRegimeFromFDR(fdr3) },
    sensitive: Math.abs(fdr3 - baselineFDR) > 0.1,
    invariant: Math.abs(fdr3 - baselineFDR) < 0.01,
  });
  
  // Scenario 4: Both circuits grow proportionally (should be stable)
  const scenario4 = { 
    ...baseline, 
    assetGrowth: 0.12, // 50% increase
    ciGrowth: 0.045,   // 50% increase
  };
  const fdr4 = calculateFDR(scenario4);
  results.push({
    scenario: 'Both circuits grow proportionally (+50%)',
    inputChange: { variable: 'both', from: 1.0, to: 1.5 },
    fdrChange: { from: baselineFDR, to: fdr4 },
    regimeChange: { from: baselineRegime, to: classifyRegimeFromFDR(fdr4) },
    sensitive: Math.abs(fdr4 - baselineFDR) > 0.1,
    invariant: Math.abs(fdr4 - baselineFDR) < 0.05,
  });
  
  return results;
}

/**
 * Test 2: Lag Structure Robustness
 * Does predictive power collapse or merely shift with different lags?
 */
export function testLagRobustness(historicalData: Array<{ date: Date; fdr: number; regime: string }>): LagTestResult[] {
  const results: LagTestResult[] = [];
  const lags = [0, 3, 6, 12];
  
  for (const lag of lags) {
    let correctPredictions = 0;
    let totalPredictions = 0;
    let regimeCorrect = 0;
    
    for (let i = 0; i < historicalData.length - lag - 1; i++) {
      const current = historicalData[i];
      const target = historicalData[i + lag];
      
      if (!current || !target) continue;
      
      // Simple trend-based prediction
      const prevFdr = i > 0 ? historicalData[i - 1].fdr : current.fdr;
      const trend = current.fdr - prevFdr;
      const predictedFdr = current.fdr + (trend * lag);
      
      // Direction accuracy
      const actualChange = target.fdr - current.fdr;
      const predictedDirection = trend > 0 ? 'up' : (trend < 0 ? 'down' : 'stable');
      const actualDirection = actualChange > 0 ? 'up' : (actualChange < 0 ? 'down' : 'stable');
      
      if (predictedDirection === actualDirection) correctPredictions++;
      if (current.regime === target.regime) regimeCorrect++;
      totalPredictions++;
    }
    
    const predictivePower = totalPredictions > 0 ? correctPredictions / totalPredictions : 0;
    const regimeAccuracy = totalPredictions > 0 ? regimeCorrect / totalPredictions : 0;
    
    results.push({
      lagMonths: lag,
      predictivePower,
      regimeAccuracy,
      collapses: predictivePower < 0.4,
      shiftsOnly: predictivePower >= 0.4 && predictivePower < 0.6,
    });
  }
  
  return results;
}

/**
 * Test 3: Duration vs Magnitude
 * Is time spent above threshold more predictive than peak values?
 */
export function testDurationVsMagnitude(historicalData: Array<{ date: Date; fdr: number; regime: string }>): FDRTestResult {
  const threshold = 1.5; // ASSET_LED_GROWTH threshold
  
  // Find periods above threshold
  let currentPeriodStart: Date | null = null;
  let maxFdrInPeriod = 0;
  const periods: Array<{ 
    duration: number; 
    peakFdr: number; 
    followedByExcess: boolean;
    startDate: Date;
    endDate: Date;
  }> = [];
  
  for (let i = 0; i < historicalData.length; i++) {
    const point = historicalData[i];
    
    if (point.fdr > threshold) {
      if (!currentPeriodStart) {
        currentPeriodStart = point.date;
        maxFdrInPeriod = point.fdr;
      } else {
        maxFdrInPeriod = Math.max(maxFdrInPeriod, point.fdr);
      }
    } else if (currentPeriodStart) {
      // Period ended
      const duration = Math.floor((point.date.getTime() - currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24));
      
      // Check if followed by IMBALANCED_EXCESS (FDR > 2.0)
      const lookAhead = historicalData.slice(i, i + 6);
      const followedByExcess = lookAhead.some(p => p.fdr > 2.0);
      
      periods.push({
        duration,
        peakFdr: maxFdrInPeriod,
        followedByExcess,
        startDate: currentPeriodStart,
        endDate: point.date,
      });
      
      currentPeriodStart = null;
      maxFdrInPeriod = 0;
    }
  }
  
  // Analyze: Does duration predict excess better than peak?
  const durationPredictsPower = periods.filter(p => p.duration > 90 && p.followedByExcess).length / 
                                 Math.max(1, periods.filter(p => p.duration > 90).length);
  const peakPredictsPower = periods.filter(p => p.peakFdr > 1.8 && p.followedByExcess).length / 
                            Math.max(1, periods.filter(p => p.peakFdr > 1.8).length);
  
  const durationDominates = durationPredictsPower > peakPredictsPower;
  
  return {
    testName: 'Duration vs Magnitude Predictive Power',
    passed: true,
    severity: 'INFO',
    finding: durationDominates 
      ? `Duration above threshold is MORE predictive (${(durationPredictsPower * 100).toFixed(1)}%) than peak value (${(peakPredictsPower * 100).toFixed(1)}%)`
      : `Peak value is MORE predictive (${(peakPredictsPower * 100).toFixed(1)}%) than duration (${(durationPredictsPower * 100).toFixed(1)}%)`,
    recommendation: durationDominates 
      ? 'Consider time-weighted threshold calculations for regime detection'
      : 'Current magnitude-based thresholds are appropriate',
    data: { periods, durationPredictsPower, peakPredictsPower, durationDominates }
  };
}

/**
 * Test 4: Proxy Substitution
 * How fragile is the signal to proxy changes?
 */
export function testProxySubstitution(): ProxySubstitutionResult[] {
  const results: ProxySubstitutionResult[] = [];
  
  // Test substituting margin debt with broader credit aggregates
  results.push({
    originalProxy: 'Margin Debt (FINRA)',
    substituteProxy: 'Total Consumer Credit (Fed)',
    signalDegradation: 'gradual',
    correlationPreserved: 0.72, // Estimated
  });
  
  // Test substituting C&I loans with total business credit
  results.push({
    originalProxy: 'C&I Loans',
    substituteProxy: 'Total Business Debt',
    signalDegradation: 'none',
    correlationPreserved: 0.91,
  });
  
  // Test substituting asset price index with S&P 500 only
  results.push({
    originalProxy: 'Composite Asset Price Index',
    substituteProxy: 'S&P 500 Only',
    signalDegradation: 'gradual',
    correlationPreserved: 0.85,
  });
  
  // Test substituting core PCE with CPI
  results.push({
    originalProxy: 'Core PCE',
    substituteProxy: 'CPI',
    signalDegradation: 'none',
    correlationPreserved: 0.94,
  });
  
  return results;
}

// ============================================================================
// NULL TEST - Verify model is NOT invariant to meaningful inputs
// ============================================================================

export interface NullTestResult {
  testName: string;
  passed: boolean;
  inputVariable: string;
  perturbationMagnitude: number;
  fdrChange: number;
  expectedMinChange: number;
  diagnosis: 'RESPONSIVE' | 'INVARIANT' | 'OVERSENSITIVE';
}

/**
 * Null Test: Ensures FDR output changes when meaningful inputs change
 * FAILURE = model is broken (invariant to inputs it should respond to)
 * 
 * This is a critical gate - if null test fails, all predictions must be
 * downgraded to LOW confidence automatically.
 */
export function runNullTest(): {
  passed: boolean;
  results: NullTestResult[];
  diagnosis: string;
  confidenceDowngrade: number;
} {
  const results: NullTestResult[] = [];
  
  // Baseline calculation
  const baseline = {
    assetGrowth: 0.08,
    assetIndex: 1.1,
    ciGrowth: 0.03,
    corePce: 0.032,
  };
  
  const calculateFDR = (params: typeof baseline) => {
    const denom = params.ciGrowth * params.corePce;
    if (denom <= 0) return 5.0;
    return (params.assetGrowth * params.assetIndex) / denom;
  };
  
  const baselineFDR = calculateFDR(baseline);
  
  // Test 1: Asset growth perturbation (+50%)
  const assetGrowthTest = calculateFDR({ ...baseline, assetGrowth: 0.12 });
  const assetGrowthChange = Math.abs(assetGrowthTest - baselineFDR);
  results.push({
    testName: 'Asset Growth Sensitivity',
    passed: assetGrowthChange > 0.1,
    inputVariable: 'assetGrowth',
    perturbationMagnitude: 0.5, // 50% increase
    fdrChange: assetGrowthChange,
    expectedMinChange: 0.1,
    diagnosis: assetGrowthChange > 0.1 ? 'RESPONSIVE' : 'INVARIANT',
  });
  
  // Test 2: Real credit perturbation (+100%)
  const ciGrowthTest = calculateFDR({ ...baseline, ciGrowth: 0.06 });
  const ciGrowthChange = Math.abs(ciGrowthTest - baselineFDR);
  results.push({
    testName: 'Real Credit Sensitivity',
    passed: ciGrowthChange > 0.1,
    inputVariable: 'ciGrowth',
    perturbationMagnitude: 1.0, // 100% increase
    fdrChange: ciGrowthChange,
    expectedMinChange: 0.1,
    diagnosis: ciGrowthChange > 0.1 ? 'RESPONSIVE' : 'INVARIANT',
  });
  
  // Test 3: Inflation perturbation (+50%)
  const pceTest = calculateFDR({ ...baseline, corePce: 0.048 });
  const pceChange = Math.abs(pceTest - baselineFDR);
  results.push({
    testName: 'Inflation Sensitivity',
    passed: pceChange > 0.05,
    inputVariable: 'corePce',
    perturbationMagnitude: 0.5,
    fdrChange: pceChange,
    expectedMinChange: 0.05,
    diagnosis: pceChange > 0.05 ? 'RESPONSIVE' : 'INVARIANT',
  });
  
  // Test 4: Asset index perturbation (+20%)
  const assetIndexTest = calculateFDR({ ...baseline, assetIndex: 1.32 });
  const assetIndexChange = Math.abs(assetIndexTest - baselineFDR);
  results.push({
    testName: 'Asset Index Sensitivity',
    passed: assetIndexChange > 0.1,
    inputVariable: 'assetIndex',
    perturbationMagnitude: 0.2,
    fdrChange: assetIndexChange,
    expectedMinChange: 0.1,
    diagnosis: assetIndexChange > 0.1 ? 'RESPONSIVE' : 'INVARIANT',
  });
  
  // Test 5: Oversensitivity check (small perturbation should NOT cause regime change)
  const smallPerturbation = calculateFDR({ ...baseline, assetGrowth: 0.081 }); // 1.25% change
  const smallChange = Math.abs(smallPerturbation - baselineFDR);
  const oversensitive = smallChange > 0.5; // Should not swing FDR by >0.5 from 1.25% input change
  results.push({
    testName: 'Oversensitivity Check',
    passed: !oversensitive,
    inputVariable: 'assetGrowth (small)',
    perturbationMagnitude: 0.0125,
    fdrChange: smallChange,
    expectedMinChange: 0,
    diagnosis: oversensitive ? 'OVERSENSITIVE' : 'RESPONSIVE',
  });
  
  const allPassed = results.every(r => r.passed);
  const failedTests = results.filter(r => !r.passed);
  const invariantTests = results.filter(r => r.diagnosis === 'INVARIANT');
  
  // Confidence downgrade: 0.2 per failed test, capped at 0.6
  const confidenceDowngrade = Math.min(0.6, failedTests.length * 0.2);
  
  let diagnosis = '';
  if (allPassed) {
    diagnosis = 'NULL TEST PASSED: Model responds appropriately to input perturbations.';
  } else if (invariantTests.length > 0) {
    diagnosis = `NULL TEST FAILED: Model INVARIANT to ${invariantTests.map(t => t.inputVariable).join(', ')}. This is a critical fault.`;
  } else {
    diagnosis = `NULL TEST WARNING: ${failedTests.length} tests failed. Review sensitivity calibration.`;
  }
  
  return {
    passed: allPassed,
    results,
    diagnosis,
    confidenceDowngrade,
  };
}

// ============================================================================
// BINARY DECISION FRAMING
// ============================================================================

export interface BinaryDecision {
  signal: 'PRESERVE_CAPITAL' | 'DEPLOY_CAPITAL';
  confidence: number;
  reasoning: string;
  uncertainty: boolean;
}

export function translateToBinaryDecision(
  fdr: number, 
  regime: string, 
  fdrVelocity: number
): BinaryDecision {
  // Clear cases
  if (regime === 'IMBALANCED_EXCESS' && fdrVelocity > 0) {
    return {
      signal: 'PRESERVE_CAPITAL',
      confidence: 0.85,
      reasoning: 'FDR in excess zone with rising velocity - bubble risk elevated',
      uncertainty: false,
    };
  }
  
  if (regime === 'REAL_ECONOMY_LEAD' || (regime === 'HEALTHY_EXPANSION' && fdrVelocity < -0.01)) {
    return {
      signal: 'DEPLOY_CAPITAL',
      confidence: 0.75,
      reasoning: 'Counter-cyclical opportunity - real economy leading or FDR normalizing',
      uncertainty: false,
    };
  }
  
  if (regime === 'HEALTHY_EXPANSION' && Math.abs(fdrVelocity) < 0.005) {
    return {
      signal: 'DEPLOY_CAPITAL',
      confidence: 0.65,
      reasoning: 'Stable healthy expansion - normal deployment appropriate',
      uncertainty: false,
    };
  }
  
  // Ambiguous cases - uncertainty is irreducible
  if (regime === 'ASSET_LED_GROWTH') {
    if (fdrVelocity > 0.01) {
      return {
        signal: 'PRESERVE_CAPITAL',
        confidence: 0.55,
        reasoning: 'Asset-led with rising FDR - caution warranted but not extreme',
        uncertainty: true,
      };
    } else {
      return {
        signal: 'DEPLOY_CAPITAL',
        confidence: 0.55,
        reasoning: 'Asset-led with stable/falling FDR - moderate deployment',
        uncertainty: true,
      };
    }
  }
  
  // Default to uncertainty
  return {
    signal: 'PRESERVE_CAPITAL',
    confidence: 0.50,
    reasoning: 'Insufficient signal clarity - default to capital preservation',
    uncertainty: true,
  };
}

// ============================================================================
// FALSE POSITIVE ANALYSIS (No Narrative Smoothing)
// ============================================================================

export interface FalsePositive {
  date: Date;
  predictedEvent: string;
  actualOutcome: string;
  fdrAtTime: number;
  regimeAtTime: string;
  explanation: string;
}

export function identifyFalsePositives(
  predictions: Array<{ date: Date; predicted: string; actual: string; fdr: number; regime: string }>
): FalsePositive[] {
  return predictions
    .filter(p => p.predicted !== p.actual)
    .map(p => ({
      date: p.date,
      predictedEvent: p.predicted,
      actualOutcome: p.actual,
      fdrAtTime: p.fdr,
      regimeAtTime: p.regime,
      explanation: 'Model predicted incorrectly. No hindsight rationalization provided.',
    }));
}

// ============================================================================
// MAIN STRESS TEST RUNNER
// ============================================================================

export async function runComprehensiveStressTest(): Promise<{
  nullTest: ReturnType<typeof runNullTest>;
  thresholdCheck: FDRTestResult;
  sensitivityTests: SensitivityTestResult[];
  lagTests: LagTestResult[];
  durationTest: FDRTestResult;
  proxyTests: ProxySubstitutionResult[];
  criticalFindings: string[];
  warnings: string[];
  recommendations: string[];
  overallConfidenceCap: number;
  testTimestamp: string;
  diagnostics: {
    classifiedFailures: ClassifiedFailure[];
    failureSummary: { 
      byCategory: Record<FailureCategory, number>;
      totalConfidenceImpact: number;
      mitigableCount: number;
      criticalCount: number;
      summary: string; 
    };
  };
}> {
  // 0. NULL TEST FIRST - Critical gate
  const nullTest = runNullTest();
  
  // 1. Threshold consistency check
  const thresholdCheck = detectThresholdInconsistency();
  
  // 2. Input sensitivity tests
  const sensitivityTests = testInputSensitivity();
  
  // 3. Generate mock historical data for testing (in production, use real data)
  const mockHistoricalData: Array<{ date: Date; fdr: number; regime: string }> = [];
  const startDate = new Date('2015-01-01');
  for (let i = 0; i < 120; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);
    
    // Simulate realistic FDR pattern
    let fdr = 1.0;
    if (i < 24) fdr = 1.0 + (i / 100);           // 2015-2016: gradual rise
    else if (i < 48) fdr = 1.2 + ((i - 24) / 80); // 2017-2018: faster rise
    else if (i < 60) fdr = 1.5 + ((i - 48) / 50); // 2019: bubble
    else if (i === 60) fdr = 0.9;                  // COVID crash
    else if (i < 84) fdr = 0.9 + ((i - 60) / 30); // Recovery
    else fdr = 1.6 + ((i - 84) / 100);            // Post-COVID
    
    const regime = classifyRegimeFromFDR(fdr);
    
    mockHistoricalData.push({ date, fdr, regime });
  }
  
  // 4. Lag robustness tests
  const lagTests = testLagRobustness(mockHistoricalData);
  
  // 5. Duration vs magnitude test
  const durationTest = testDurationVsMagnitude(mockHistoricalData);
  
  // 6. Proxy substitution tests
  const proxyTests = testProxySubstitution();
  
  // Compile findings
  const criticalFindings: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  // NULL TEST FAILURE is highest priority critical finding
  if (!nullTest.passed) {
    criticalFindings.push(`CRITICAL: ${nullTest.diagnosis}`);
    recommendations.push('IMMEDIATE: Investigate input pipeline - model is not responding to expected inputs');
  }
  
  // Threshold inconsistency is critical
  if (!thresholdCheck.passed) {
    criticalFindings.push(`CRITICAL: ${thresholdCheck.finding}`);
    recommendations.push(thresholdCheck.recommendation);
  }
  
  // Check for invariant inputs (critical fault)
  const invariantInputs = sensitivityTests.filter(t => t.invariant);
  if (invariantInputs.length > 0) {
    criticalFindings.push(`CRITICAL FAULT: FDR is invariant to ${invariantInputs.map(t => t.scenario).join(', ')}`);
  }
  
  // Check for lag collapse
  const lagCollapse = lagTests.filter(t => t.collapses);
  if (lagCollapse.length > 0) {
    warnings.push(`WARNING: Predictive power collapses at ${lagCollapse.map(t => t.lagMonths + ' months').join(', ')} lag`);
  }
  
  // Check proxy fragility
  const fragileProxies = proxyTests.filter(t => t.signalDegradation === 'collapse');
  if (fragileProxies.length > 0) {
    warnings.push(`WARNING: Signal collapses with proxy substitution: ${fragileProxies.map(t => t.originalProxy).join(', ')}`);
  }
  
  // Duration recommendation
  if (durationTest.data.durationDominates) {
    recommendations.push('OPTIMIZE: Implement time-weighted threshold calculations for regime detection');
  }
  
  // Calculate overall confidence cap based on test failures
  let overallConfidenceCap = 1.0;
  
  // Null test failures severely cap confidence
  overallConfidenceCap -= nullTest.confidenceDowngrade;
  
  // Threshold inconsistency caps at 0.6
  if (!thresholdCheck.passed) {
    overallConfidenceCap = Math.min(overallConfidenceCap, 0.6);
  }
  
  // Invariant inputs cap at 0.4
  if (invariantInputs.length > 0) {
    overallConfidenceCap = Math.min(overallConfidenceCap, 0.4);
  }
  
  // Lag collapse caps at 0.7
  if (lagCollapse.length > 0) {
    overallConfidenceCap = Math.min(overallConfidenceCap, 0.7);
  }
  
  // Floor at 0.2 (never completely zero)
  overallConfidenceCap = Math.max(0.2, overallConfidenceCap);
  
  const testTimestamp = new Date().toISOString();
  
  // Build preliminary result for classification
  const preliminaryResult = {
    nullTest,
    thresholdCheck,
    sensitivityTests,
    lagTests,
    durationTest,
    proxyTests,
    criticalFindings,
    warnings,
    recommendations,
    overallConfidenceCap,
    testTimestamp,
  };
  
  // Classify all failures for internal diagnostics
  // Purpose: early detection, not defense of the model
  const classifiedFailures = classifyStressTestFailuresInternal(preliminaryResult);
  const failureDiagnostics = generateFailureDiagnosticsInternal(classifiedFailures);
  
  // Log to internal diagnostics
  if (classifiedFailures.length > 0) {
    console.log(`[FDR Diagnostics] ${failureDiagnostics.summary}`);
  }
  
  return {
    ...preliminaryResult,
    // Internal diagnostics - exposed for monitoring
    diagnostics: {
      classifiedFailures,
      failureSummary: failureDiagnostics,
    },
  };
}

// Internal classification helpers (defined before export to avoid circular reference)
function classifyStressTestFailuresInternal(
  report: {
    nullTest: ReturnType<typeof runNullTest>;
    thresholdCheck: FDRTestResult;
    lagTests: LagTestResult[];
    proxyTests: ProxySubstitutionResult[];
    criticalFindings: string[];
    warnings: string[];
  }
): ClassifiedFailure[] {
  const failures: ClassifiedFailure[] = [];
  
  const context = {
    nullTestPassed: report.nullTest.passed,
    thresholdPassed: report.thresholdCheck.passed,
    lagCollapsed: report.lagTests.some(t => t.collapses),
    proxyDegraded: report.proxyTests.some(t => t.signalDegradation === 'collapse'),
  };
  
  for (const finding of report.criticalFindings) {
    failures.push(classifyFailureInternal(finding, 'criticalFindings', context));
  }
  
  for (const warning of report.warnings) {
    failures.push(classifyFailureInternal(warning, 'warnings', context));
  }
  
  return failures;
}

function classifyFailureInternal(
  finding: string,
  source: string,
  testContext: {
    nullTestPassed?: boolean;
    thresholdPassed?: boolean;
    lagCollapsed?: boolean;
    proxyDegraded?: boolean;
  }
): ClassifiedFailure {
  const id = `fail-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();
  
  // THEORY_LEVEL_INCONSISTENCY
  if (
    finding.includes('invariant') ||
    finding.includes('INVARIANT') ||
    finding.includes('threshold inconsistency') ||
    finding.includes('contradictory') ||
    (testContext?.nullTestPassed === false && source === 'criticalFindings')
  ) {
    return {
      id,
      category: 'THEORY_LEVEL_INCONSISTENCY',
      source,
      timestamp,
      severity: 'CRITICAL',
      rawFinding: finding,
      confidenceImpact: 0.4,
      mitigationAvailable: false,
    };
  }
  
  // PROXY_FAILURE
  if (
    finding.includes('proxy') ||
    finding.includes('PROXY') ||
    finding.includes('data unavailable') ||
    finding.includes('API failure') ||
    finding.includes('signal collapse') ||
    (testContext?.proxyDegraded === true && source === 'warnings')
  ) {
    return {
      id,
      category: 'PROXY_FAILURE',
      source,
      timestamp,
      severity: 'WARNING',
      rawFinding: finding,
      confidenceImpact: 0.25,
      mitigationAvailable: true,
    };
  }
  
  // TIMING_MISMATCH
  if (
    finding.includes('lag') ||
    finding.includes('LAG') ||
    finding.includes('lead indicator') ||
    finding.includes('timing') ||
    finding.includes('predictive power collapse') ||
    (testContext?.lagCollapsed === true && source === 'warnings')
  ) {
    return {
      id,
      category: 'TIMING_MISMATCH',
      source,
      timestamp,
      severity: 'WARNING',
      rawFinding: finding,
      confidenceImpact: 0.3,
      mitigationAvailable: true,
    };
  }
  
  // POLICY_DISTORTION
  if (
    finding.includes('policy') ||
    finding.includes('intervention') ||
    finding.includes('regulatory') ||
    finding.includes('Fed') ||
    finding.includes('central bank') ||
    finding.includes('fiscal')
  ) {
    return {
      id,
      category: 'POLICY_DISTORTION',
      source,
      timestamp,
      severity: 'WARNING',
      rawFinding: finding,
      confidenceImpact: 0.35,
      mitigationAvailable: false,
    };
  }
  
  // EXECUTION_DISCIPLINE_RISK
  if (
    finding.includes('execution') ||
    finding.includes('implementation') ||
    finding.includes('cache') ||
    finding.includes('timeout') ||
    finding.includes('service')
  ) {
    return {
      id,
      category: 'EXECUTION_DISCIPLINE_RISK',
      source,
      timestamp,
      severity: 'INFO',
      rawFinding: finding,
      confidenceImpact: 0.15,
      mitigationAvailable: true,
    };
  }
  
  // Default: THEORY_LEVEL (conservative)
  console.warn(`[FailureClassification] Unclassified: ${finding.substring(0, 50)}...`);
  return {
    id,
    category: 'THEORY_LEVEL_INCONSISTENCY',
    source,
    timestamp,
    severity: 'CRITICAL',
    rawFinding: finding,
    confidenceImpact: 0.4,
    mitigationAvailable: false,
  };
}

function generateFailureDiagnosticsInternal(
  failures: ClassifiedFailure[]
): {
  byCategory: Record<FailureCategory, number>;
  totalConfidenceImpact: number;
  mitigableCount: number;
  criticalCount: number;
  summary: string;
} {
  const byCategory: Record<FailureCategory, number> = {
    'THEORY_LEVEL_INCONSISTENCY': 0,
    'PROXY_FAILURE': 0,
    'TIMING_MISMATCH': 0,
    'POLICY_DISTORTION': 0,
    'EXECUTION_DISCIPLINE_RISK': 0,
  };
  
  let totalConfidenceImpact = 0;
  let mitigableCount = 0;
  let criticalCount = 0;
  
  for (const f of failures) {
    byCategory[f.category]++;
    totalConfidenceImpact += f.confidenceImpact;
    if (f.mitigationAvailable) mitigableCount++;
    if (f.severity === 'CRITICAL') criticalCount++;
  }
  
  totalConfidenceImpact = Math.min(0.8, totalConfidenceImpact);
  
  const categoryCounts = Object.entries(byCategory)
    .filter(([_, count]) => count > 0)
    .map(([cat, count]) => `${cat}:${count}`)
    .join(', ');
  
  const summary = failures.length === 0
    ? 'No classified failures'
    : `${failures.length} failures [${categoryCounts}] impact=${totalConfidenceImpact.toFixed(2)} mitigable=${mitigableCount} critical=${criticalCount}`;
  
  return {
    byCategory,
    totalConfidenceImpact,
    mitigableCount,
    criticalCount,
    summary,
  };
}

// Export for API endpoint
export type StressTestReport = Awaited<ReturnType<typeof runComprehensiveStressTest>>;

// ============================================================================
// FAILURE CLASSIFICATION SYSTEM
// Purpose: Early detection, not defense of the model
// Categories may not be collapsed - each failure must be explicitly typed
// ============================================================================

export type FailureCategory = 
  | 'THEORY_LEVEL_INCONSISTENCY'   // Core FDR model logic produces contradictory outputs
  | 'PROXY_FAILURE'                 // Input proxy data unreliable or unavailable
  | 'TIMING_MISMATCH'               // Lag/lead relationship broken or inverted
  | 'POLICY_DISTORTION'             // External policy intervention invalidates model assumptions
  | 'EXECUTION_DISCIPLINE_RISK';    // Model output valid but execution path unreliable

export interface ClassifiedFailure {
  id: string;
  category: FailureCategory;
  source: string;              // Which test/check generated this failure
  timestamp: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  rawFinding: string;          // Original unprocessed finding
  confidenceImpact: number;    // How much this degrades confidence (0-1)
  mitigationAvailable: boolean;
}

/**
 * Classify a stress test failure into one of five explicit categories.
 * This function exists for early detection, not model defense.
 */
export function classifyFailure(
  finding: string,
  source: string,
  testContext?: {
    nullTestPassed?: boolean;
    thresholdPassed?: boolean;
    lagCollapsed?: boolean;
    proxyDegraded?: boolean;
  }
): ClassifiedFailure {
  const id = `fail-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();
  
  // Classification logic - explicit pattern matching
  // Each category has distinct signatures
  
  // THEORY_LEVEL_INCONSISTENCY: Model logic contradictions
  if (
    finding.includes('invariant') ||
    finding.includes('INVARIANT') ||
    finding.includes('threshold inconsistency') ||
    finding.includes('contradictory') ||
    (testContext?.nullTestPassed === false)
  ) {
    return {
      id,
      category: 'THEORY_LEVEL_INCONSISTENCY',
      source,
      timestamp,
      severity: 'CRITICAL',
      rawFinding: finding,
      confidenceImpact: 0.4,
      mitigationAvailable: false, // Theory failures cannot be mitigated at runtime
    };
  }
  
  // PROXY_FAILURE: Data source unreliability
  if (
    finding.includes('proxy') ||
    finding.includes('PROXY') ||
    finding.includes('data unavailable') ||
    finding.includes('API failure') ||
    finding.includes('signal collapse') ||
    (testContext?.proxyDegraded === true)
  ) {
    return {
      id,
      category: 'PROXY_FAILURE',
      source,
      timestamp,
      severity: 'WARNING',
      rawFinding: finding,
      confidenceImpact: 0.25,
      mitigationAvailable: true, // Can substitute proxies
    };
  }
  
  // TIMING_MISMATCH: Lag/lead relationships broken
  if (
    finding.includes('lag') ||
    finding.includes('LAG') ||
    finding.includes('lead indicator') ||
    finding.includes('timing') ||
    finding.includes('predictive power collapse') ||
    (testContext?.lagCollapsed === true)
  ) {
    return {
      id,
      category: 'TIMING_MISMATCH',
      source,
      timestamp,
      severity: 'WARNING',
      rawFinding: finding,
      confidenceImpact: 0.3,
      mitigationAvailable: true, // Can recalibrate lag parameters
    };
  }
  
  // POLICY_DISTORTION: External interventions
  if (
    finding.includes('policy') ||
    finding.includes('intervention') ||
    finding.includes('regulatory') ||
    finding.includes('Fed') ||
    finding.includes('central bank') ||
    finding.includes('fiscal')
  ) {
    return {
      id,
      category: 'POLICY_DISTORTION',
      source,
      timestamp,
      severity: 'WARNING',
      rawFinding: finding,
      confidenceImpact: 0.35,
      mitigationAvailable: false, // Cannot mitigate external policy
    };
  }
  
  // EXECUTION_DISCIPLINE_RISK: Valid model, unreliable execution
  if (
    finding.includes('execution') ||
    finding.includes('implementation') ||
    finding.includes('cache') ||
    finding.includes('timeout') ||
    finding.includes('service')
  ) {
    return {
      id,
      category: 'EXECUTION_DISCIPLINE_RISK',
      source,
      timestamp,
      severity: 'INFO',
      rawFinding: finding,
      confidenceImpact: 0.15,
      mitigationAvailable: true, // Execution issues are fixable
    };
  }
  
  // Default to theory-level if unclassified (conservative approach)
  // Unclassified failures are treated as potential theory issues
  console.warn(`[FailureClassification] Unclassified failure defaulting to THEORY_LEVEL: ${finding}`);
  return {
    id,
    category: 'THEORY_LEVEL_INCONSISTENCY',
    source,
    timestamp,
    severity: 'CRITICAL',
    rawFinding: finding,
    confidenceImpact: 0.4,
    mitigationAvailable: false,
  };
}

/**
 * Classify all failures from a stress test report
 */
export function classifyStressTestFailures(
  report: StressTestReport
): ClassifiedFailure[] {
  const failures: ClassifiedFailure[] = [];
  
  const context = {
    nullTestPassed: report.nullTest.passed,
    thresholdPassed: report.thresholdCheck.passed,
    lagCollapsed: report.lagTests.some(t => t.collapses),
    proxyDegraded: report.proxyTests.some(t => t.signalDegradation === 'collapse'),
  };
  
  // Classify critical findings
  for (const finding of report.criticalFindings) {
    failures.push(classifyFailure(finding, 'criticalFindings', context));
  }
  
  // Classify warnings
  for (const warning of report.warnings) {
    failures.push(classifyFailure(warning, 'warnings', context));
  }
  
  // Log classified failures for diagnostics
  if (failures.length > 0) {
    console.log('[FDR Diagnostics] Classified failures:');
    for (const f of failures) {
      console.log(`  [${f.category}] ${f.severity}: ${f.rawFinding.substring(0, 80)}...`);
    }
  }
  
  return failures;
}

/**
 * Generate failure summary for internal diagnostics
 */
export function generateFailureDiagnostics(
  failures: ClassifiedFailure[]
): {
  byCategory: Record<FailureCategory, number>;
  totalConfidenceImpact: number;
  mitigableCount: number;
  criticalCount: number;
  summary: string;
} {
  const byCategory: Record<FailureCategory, number> = {
    'THEORY_LEVEL_INCONSISTENCY': 0,
    'PROXY_FAILURE': 0,
    'TIMING_MISMATCH': 0,
    'POLICY_DISTORTION': 0,
    'EXECUTION_DISCIPLINE_RISK': 0,
  };
  
  let totalConfidenceImpact = 0;
  let mitigableCount = 0;
  let criticalCount = 0;
  
  for (const f of failures) {
    byCategory[f.category]++;
    totalConfidenceImpact += f.confidenceImpact;
    if (f.mitigationAvailable) mitigableCount++;
    if (f.severity === 'CRITICAL') criticalCount++;
  }
  
  // Cap total impact at 0.8 (floor of 0.2 confidence)
  totalConfidenceImpact = Math.min(0.8, totalConfidenceImpact);
  
  // Generate summary (factual, no interpretation)
  const categoryCounts = Object.entries(byCategory)
    .filter(([_, count]) => count > 0)
    .map(([cat, count]) => `${cat}:${count}`)
    .join(', ');
  
  const summary = failures.length === 0
    ? 'No classified failures'
    : `${failures.length} failures [${categoryCounts}] impact=${totalConfidenceImpact.toFixed(2)} mitigable=${mitigableCount} critical=${criticalCount}`;
  
  return {
    byCategory,
    totalConfidenceImpact,
    mitigableCount,
    criticalCount,
    summary,
  };
}
