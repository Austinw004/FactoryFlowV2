/**
 * Standalone Calibration Script
 * Runs 10,000 model calibration tests with real FRED data
 */

import { ModelCalibrationEngine } from '../lib/modelCalibration';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('🚀 Starting Model Calibration: 10,000 iterations with real FRED data');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('Dual-Circuit Thesis: FDR = (Ma * Va) / (Mr * Vr)');
  console.log('Testing Parameter Optimization While Maintaining Thesis Integrity');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const engine = new ModelCalibrationEngine();
  const iterations = parseInt(process.env.ITERATIONS || '10000', 10);

  console.log(`\n📊 Running ${iterations} calibration tests...\n`);

  const report = await engine.runCalibration(iterations);

  console.log('\n\n📊 CALIBRATION REPORT');
  console.log('══════════════════════════════════════════════════════════════\n');
  console.log('Total Iterations:', report.totalIterations);
  console.log('\n🏆 BEST PERFORMANCE:');
  console.log('  Directional Accuracy:', report.bestPerformance.directionalAccuracy.toFixed(2) + '%');
  console.log('  Regime Accuracy:', report.bestPerformance.regimeAccuracy.toFixed(2) + '%');
  console.log('  Price MAPE:', report.bestPerformance.priceMAPE.toFixed(2) + '%');
  console.log('\n📈 AVERAGE PERFORMANCE:');
  console.log('  Directional Accuracy:', report.averagePerformance.directionalAccuracy.toFixed(2) + '%');
  console.log('  Regime Accuracy:', report.averagePerformance.regimeAccuracy.toFixed(2) + '%');
  console.log('  Price MAPE:', report.averagePerformance.priceMAPE.toFixed(2) + '%');
  console.log('\n🔬 THESIS VALIDATION:');
  console.log('  FDR Correlation:', (report.thesisValidation.fdrCorrelation * 100).toFixed(2) + '%');
  console.log('  Regime Stability:', (report.thesisValidation.regimeStability * 100).toFixed(2) + '%');
  console.log('  Counter-Cyclical Effectiveness:', (report.thesisValidation.counterCyclicalEffectiveness * 100).toFixed(2) + '%');
  console.log('  Thesis Supported:', report.thesisValidation.thesisSupported ? '✅ YES' : '⚠️ NEEDS REFINEMENT');
  console.log('\n💡 TOP 10 PARAMETER IMPACTS:');
  report.parameterSensitivity.slice(0, 10).forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.parameter}: ${(p.impact * 100).toFixed(2)}% impact`);
  });
  console.log('\n📋 RECOMMENDATIONS:');
  report.recommendations.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r}`);
  });

  if (report.thesisValidation.concerns.length > 0) {
    console.log('\n⚠️ CONCERNS:');
    report.thesisValidation.concerns.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c}`);
    });
  }

  console.log('\n══════════════════════════════════════════════════════════════\n');

  // Save report to file
  const reportPath = './CALIBRATION_REPORT.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Full report saved to: ${reportPath}\n`);

  console.log('✅ Calibration complete!\n');
}

main().catch(error => {
  console.error('\n❌ Calibration failed:', error);
  process.exit(1);
});
