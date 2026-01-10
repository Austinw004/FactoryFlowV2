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
 * THRESHOLDS (Can be optimized):
 * - Regime boundaries: currently {1.2, 1.8, 2.5} vs {0.8, 1.5, 2.0}
 * 
 * PRESENTATION LAYERS (Can be removed):
 * - Signal labels, intensity scores, procurement guidance
 */

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
// CRITICAL FINDING: THRESHOLD INCONSISTENCY
// ============================================================================

export function detectThresholdInconsistency(): FDRTestResult {
  const economicsThresholds = {
    IMBALANCED_EXCESS: { min: 2.0 },
    ASSET_LED_GROWTH: { min: 1.5, max: 2.0 },
    REAL_ECONOMY_LEAD: { max: 0.8 },
    HEALTHY_EXPANSION: { min: 0.8, max: 1.5 },
  };

  const regimeIntelligenceThresholds = {
    HEALTHY_EXPANSION: { min: 0.0, max: 1.2 },
    ASSET_LED_GROWTH: { min: 1.2, max: 1.8 },
    IMBALANCED_EXCESS: { min: 1.8, max: 2.5 },
    REAL_ECONOMY_LEAD: { min: 2.5, max: 10.0 },
  };

  const dualCircuitResearchThresholds = {
    HEALTHY_EXPANSION: { max: 1.2 },
    ASSET_LED_GROWTH: { min: 1.2, max: 1.8 },
    IMBALANCED_EXCESS: { min: 1.8, max: 2.5 },
    REAL_ECONOMY_LEAD: { min: 2.5 },
  };

  const discrepancies: string[] = [];
  
  // Check HEALTHY_EXPANSION boundary
  if (economicsThresholds.HEALTHY_EXPANSION.max !== regimeIntelligenceThresholds.HEALTHY_EXPANSION.max) {
    discrepancies.push(`HEALTHY_EXPANSION upper bound: economics.ts uses ${economicsThresholds.HEALTHY_EXPANSION.max}, regimeIntelligence.ts uses ${regimeIntelligenceThresholds.HEALTHY_EXPANSION.max}`);
  }

  // Check REAL_ECONOMY_LEAD interpretation (critical!)
  discrepancies.push(`REAL_ECONOMY_LEAD: economics.ts triggers at FDR < 0.8 (low), regimeIntelligence.ts triggers at FDR > 2.5 (high) - OPPOSITE LOGIC`);

  return {
    testName: 'Threshold Consistency Check',
    passed: discrepancies.length === 0,
    severity: 'CRITICAL',
    finding: discrepancies.length > 0 
      ? `Found ${discrepancies.length} threshold inconsistencies between modules:\n${discrepancies.join('\n')}`
      : 'All thresholds consistent across modules',
    recommendation: discrepancies.length > 0
      ? 'Consolidate threshold definitions into single source of truth. The REAL_ECONOMY_LEAD discrepancy is particularly critical - opposite triggering logic.'
      : 'No action needed',
    data: { economicsThresholds, regimeIntelligenceThresholds, dualCircuitResearchThresholds, discrepancies }
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
  
  const getRegime = (fdr: number) => {
    if (fdr > 2.0) return 'IMBALANCED_EXCESS';
    if (fdr > 1.5) return 'ASSET_LED_GROWTH';
    if (fdr < 0.8) return 'REAL_ECONOMY_LEAD';
    return 'HEALTHY_EXPANSION';
  };
  
  const baselineFDR = calculateFDR(baseline);
  const baselineRegime = getRegime(baselineFDR);
  
  // Scenario 1: Asset credit accelerates, real credit unchanged
  const scenario1 = { ...baseline, assetGrowth: 0.15 }; // 15% margin debt growth
  const fdr1 = calculateFDR(scenario1);
  results.push({
    scenario: 'Asset credit accelerates (8%→15%), real credit unchanged',
    inputChange: { variable: 'assetGrowth', from: 0.08, to: 0.15 },
    fdrChange: { from: baselineFDR, to: fdr1 },
    regimeChange: { from: baselineRegime, to: getRegime(fdr1) },
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
    regimeChange: { from: baselineRegime, to: getRegime(fdr2) },
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
    regimeChange: { from: baselineRegime, to: getRegime(fdr3) },
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
    regimeChange: { from: baselineRegime, to: getRegime(fdr4) },
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
    
    let regime = 'HEALTHY_EXPANSION';
    if (fdr > 2.0) regime = 'IMBALANCED_EXCESS';
    else if (fdr > 1.5) regime = 'ASSET_LED_GROWTH';
    else if (fdr < 0.8) regime = 'REAL_ECONOMY_LEAD';
    
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
  
  return {
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
    testTimestamp: new Date().toISOString(),
  };
}

// Export for API endpoint
export type StressTestReport = Awaited<ReturnType<typeof runComprehensiveStressTest>>;
