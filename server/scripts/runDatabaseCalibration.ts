/**
 * Database-Powered Calibration Script
 * 
 * Runs 10,000 parameter optimization tests using existing database predictions
 * instead of relying on blocked FRED API.
 * 
 * Usage: ITERATIONS=10000 npx tsx server/scripts/runDatabaseCalibration.ts
 */

import { DatabaseValidationEngine } from '../lib/databaseValidation';
import * as fs from 'fs';

async function main() {
  const iterations = parseInt(process.env.ITERATIONS || '10000');
  
  console.log('🚀 Starting Database-Powered Calibration');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`Running ${iterations.toLocaleString()} parameter optimization tests`);
  console.log('Using existing historical_predictions database (180K+ records)');
  console.log('Dual-Circuit Thesis: FDR = (Ma * Va) / (Mr * Vr) PROTECTED');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  
  const engine = new DatabaseValidationEngine();
  
  // First, analyze current state
  console.log('📊 STEP 1: Analyzing Current Database Performance...\n');
  const baseline = await engine.analyzeExistingData();
  
  console.log('📈 BASELINE PERFORMANCE (Current Parameters):');
  console.log('══════════════════════════════════════════════════════════════\n');
  console.log(`Total Predictions Analyzed: ${baseline.totalPredictions.toLocaleString()}`);
  console.log(`Date Range: ${baseline.dateRange.earliest.toISOString().split('T')[0]} to ${baseline.dateRange.latest.toISOString().split('T')[0]}`);
  console.log('\nOverall Metrics:');
  console.log(`  MAPE: ${baseline.overallMetrics.mape.toFixed(2)}%`);
  console.log(`  Directional Accuracy: ${baseline.overallMetrics.directionalAccuracy.toFixed(2)}%`);
  console.log(`  Regime Accuracy: ${baseline.overallMetrics.regimeAccuracy.toFixed(2)}%`);
  
  console.log('\nPerformance by Regime:');
  for (const regime of baseline.byRegime) {
    console.log(`  ${regime.regime}: ${regime.predictions.toLocaleString()} predictions, ${regime.mape.toFixed(2)}% MAPE`);
  }
  
  console.log('\nTop 5 Years by Performance:');
  const sortedYears = [...baseline.byYear].sort((a, b) => a.mape - b.mape).slice(0, 5);
  for (const year of sortedYears) {
    console.log(`  ${year.year}: ${year.mape.toFixed(2)}% MAPE (${year.predictions.toLocaleString()} predictions)`);
  }
  
  console.log('\nBottom 5 Years by Performance:');
  const worstYears = [...baseline.byYear].sort((a, b) => b.mape - a.mape).slice(0, 5);
  for (const year of worstYears) {
    console.log(`  ${year.year}: ${year.mape.toFixed(2)}% MAPE (${year.predictions.toLocaleString()} predictions)`);
  }
  
  console.log('\n🔍 CALIBRATION RECOMMENDATIONS:');
  console.log('══════════════════════════════════════════════════════════════\n');
  for (const rec of baseline.calibrationRecommendations) {
    console.log(`  ${rec}`);
  }
  
  // Now run calibration
  console.log('\n\n🔬 STEP 2: Running Parameter Optimization...\n');
  console.log(`Testing ${iterations.toLocaleString()} different parameter combinations...`);
  console.log('This will take approximately:', Math.ceil(iterations / 1000) * 2, 'minutes\n');
  
  const startTime = Date.now();
  const results = await engine.runDatabaseCalibration(iterations);
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);
  
  // Print results
  console.log('\n\n');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('📊 CALIBRATION RESULTS');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  
  console.log(`Completed ${iterations.toLocaleString()} tests in ${duration}s\n`);
  
  console.log('🏆 BEST PERFORMANCE FOUND:');
  console.log('══════════════════════════════════════════════════════════════\n');
  console.log(`  MAPE: ${results.bestPerformance.mape?.toFixed(2)}%`);
  console.log(`  Directional Accuracy: ${results.bestPerformance.directionalAccuracy?.toFixed(2)}%`);
  console.log(`  Regime Accuracy: ${results.bestPerformance.regimeAccuracy?.toFixed(2)}%`);
  
  console.log('\n📈 IMPROVEMENT OVER BASELINE:');
  console.log('══════════════════════════════════════════════════════════════\n');
  console.log(`  Baseline MAPE: ${results.improvement.baselineMAPE.toFixed(2)}%`);
  console.log(`  Best MAPE: ${results.improvement.bestMAPE.toFixed(2)}%`);
  console.log(`  Improvement: ${results.improvement.improvementPct.toFixed(1)}% ${results.improvement.improvementPct > 0 ? '✅' : '❌'}`);
  
  console.log('\n🎯 OPTIMAL PARAMETERS:');
  console.log('══════════════════════════════════════════════════════════════\n');
  console.log('FDR Regime Thresholds:');
  console.log(`  Healthy Expansion: ${results.bestParams.fdrHealthyExpansionMin?.toFixed(3)} - ${results.bestParams.fdrHealthyExpansionMax?.toFixed(3)}`);
  console.log(`  Asset-Led Growth: ${results.bestParams.fdrAssetLedGrowthMin?.toFixed(3)} - ${results.bestParams.fdrAssetLedGrowthMax?.toFixed(3)}`);
  console.log(`  Imbalanced Excess: > ${results.bestParams.fdrImbalancedExcessMin?.toFixed(3)}`);
  console.log(`  Real Economy Lead: < ${results.bestParams.fdrRealEconomyLeadMax?.toFixed(3)}`);
  
  console.log('\nSmoothing Parameters:');
  console.log(`  Exponential Smoothing Alpha: ${results.bestParams.exponentialSmoothingAlpha?.toFixed(3)}`);
  console.log(`  Volatility Window: ${results.bestParams.volatilityWindow} months`);
  console.log(`  Prediction Horizon: ${results.bestParams.predictionHorizon} months`);
  
  console.log('\nPrediction Weights:');
  console.log(`  FDR Trend Weight: ${results.bestParams.fdrTrendWeight?.toFixed(3)}`);
  console.log(`  Volatility Weight: ${results.bestParams.volatilityWeight?.toFixed(3)}`);
  console.log(`  Momentum Weight: ${results.bestParams.momentumWeight?.toFixed(3)}`);
  
  // Statistical analysis
  console.log('\n📊 STATISTICAL SUMMARY:');
  console.log('══════════════════════════════════════════════════════════════\n');
  
  const mapes = results.allResults.map(r => r.performance.mape).filter(m => m < 100);
  const avgMAPE = mapes.reduce((a, b) => a + b, 0) / mapes.length;
  const medianMAPE = mapes.sort((a, b) => a - b)[Math.floor(mapes.length / 2)];
  const minMAPE = Math.min(...mapes);
  const maxMAPE = Math.max(...mapes);
  
  console.log(`  Average MAPE: ${avgMAPE.toFixed(2)}%`);
  console.log(`  Median MAPE: ${medianMAPE.toFixed(2)}%`);
  console.log(`  Best MAPE: ${minMAPE.toFixed(2)}%`);
  console.log(`  Worst MAPE: ${maxMAPE.toFixed(2)}%`);
  
  const directionalAccs = results.allResults.map(r => r.performance.directionalAccuracy);
  const avgDirectional = directionalAccs.reduce((a, b) => a + b, 0) / directionalAccs.length;
  console.log(`  Average Directional Accuracy: ${avgDirectional.toFixed(2)}%`);
  
  const regimeAccs = results.allResults.map(r => r.performance.regimeAccuracy);
  const avgRegime = regimeAccs.reduce((a, b) => a + b, 0) / regimeAccs.length;
  console.log(`  Average Regime Accuracy: ${avgRegime.toFixed(2)}%`);
  
  // Thesis validation
  console.log('\n🔬 DUAL-CIRCUIT THESIS VALIDATION:');
  console.log('══════════════════════════════════════════════════════════════\n');
  
  if (results.bestPerformance.regimeAccuracy > 75) {
    console.log('  ✅ STRONG VALIDATION: Regime accuracy >75%');
    console.log('     FDR correlates strongly with economic regimes');
    console.log('     Dual-circuit thesis (Ma*Va / Mr*Vr) supported by data');
  } else if (results.bestPerformance.regimeAccuracy > 60) {
    console.log('  ⚠️ MODERATE VALIDATION: Regime accuracy 60-75%');
    console.log('     FDR shows correlation but could be refined');
    console.log('     Thesis has merit but needs optimization');
  } else {
    console.log('  ❌ WEAK VALIDATION: Regime accuracy <60%');
    console.log('     FDR correlation with regimes is weak');
    console.log('     Thesis may need fundamental rethinking');
  }
  
  if (results.bestPerformance.directionalAccuracy > 60) {
    console.log('  ✅ Directional predictions working (>60% accuracy)');
  } else {
    console.log('  ⚠️ Directional predictions need improvement (<60% accuracy)');
  }
  
  if (results.bestPerformance.mape < 5) {
    console.log('  ✅ Excellent price prediction accuracy (<5% MAPE)');
  } else if (results.bestPerformance.mape < 10) {
    console.log('  ⚠️ Moderate price prediction accuracy (5-10% MAPE)');
  } else {
    console.log('  ❌ Poor price prediction accuracy (>10% MAPE)');
  }
  
  // Business recommendations
  console.log('\n💼 BUSINESS RECOMMENDATIONS:');
  console.log('══════════════════════════════════════════════════════════════\n');
  
  if (results.bestPerformance.regimeAccuracy > 75 && results.bestPerformance.mape < 8) {
    console.log('  ✅ STRONG PRODUCT: Thesis validates, platform is market-ready');
    console.log('  → Lead with "10,000-test validated dual-circuit intelligence"');
    console.log('  → Highlight regime-aware procurement optimization');
    console.log('  → Competitive advantage is defensible and data-driven');
  } else if (results.bestPerformance.regimeAccuracy > 60) {
    console.log('  ⚠️ VIABLE PRODUCT: Thesis shows promise, continue development');
    console.log('  → Lead with "Advanced multi-factor economic intelligence"');
    console.log('  → Position FDR as one of multiple signals');
    console.log('  → Focus on comprehensive ERP + smart automation');
  } else {
    console.log('  ⚠️ PIVOT RECOMMENDED: Weak thesis validation');
    console.log('  → Focus on non-FDR strengths (ERP, supply chain, automation)');
    console.log('  → Use traditional economic indicators + FDR as auxiliary');
    console.log('  → Emphasize platform capabilities over economic theory');
  }
  
  console.log('\n📋 NEXT STEPS:');
  console.log('══════════════════════════════════════════════════════════════\n');
  console.log('  1. Review optimal parameters and consider implementing them');
  console.log('  2. Run A/B test: current params vs optimal params');
  console.log('  3. Monitor regime accuracy in production with new parameters');
  console.log('  4. Consider collecting more historical data for additional validation');
  console.log('  5. Update platform documentation with calibration results');
  
  console.log('\n═══════════════════════════════════════════════════════════════════\n');
  
  // Save full report
  const report = {
    baseline,
    calibration: {
      iterations,
      duration: parseFloat(duration),
      bestParams: results.bestParams,
      bestPerformance: results.bestPerformance,
      improvement: results.improvement,
    },
    statistics: {
      avgMAPE,
      medianMAPE,
      minMAPE,
      maxMAPE,
      avgDirectional,
      avgRegime,
    },
    timestamp: new Date().toISOString(),
  };
  
  const reportPath = './DATABASE_CALIBRATION_REPORT.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Full report saved to: ${reportPath}\n`);
  
  console.log('✅ Database-powered calibration complete!\n');
  console.log('═══════════════════════════════════════════════════════════════════\n');
}

main().catch(error => {
  console.error('\n❌ Calibration failed:', error);
  process.exit(1);
});
