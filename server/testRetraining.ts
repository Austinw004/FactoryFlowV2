/**
 * Test script for automated forecast retraining system
 * 
 * Usage: npx tsx server/testRetraining.ts
 */

import { storage } from './storage';
import { runAutomatedRetraining } from './lib/forecastRetraining';

async function testRetrainingSystem() {
  console.log('='.repeat(60));
  console.log('Testing Automated Forecast Retraining System');
  console.log('='.repeat(60));
  
  try {
    // Get all companies
    const companies = await storage.getAllCompanyIds();
    
    if (companies.length === 0) {
      console.log('\n❌ No companies found in database');
      console.log('Please create a company first before testing retraining');
      process.exit(1);
    }
    
    console.log(`\nFound ${companies.length} company(ies) to test\n`);
    
    for (const companyId of companies) {
      console.log(`\nTesting company: ${companyId.substring(0, 8)}...`);
      console.log('-'.repeat(60));
      
      // Check if company has any SKUs
      const skus = await storage.getSkus(companyId);
      console.log(`  SKUs in system: ${skus.length}`);
      
      if (skus.length === 0) {
        console.log('  ⚠️  No SKUs found - skipping this company');
        continue;
      }
      
      // Check which SKUs have demand history
      let skusWithHistory = 0;
      let totalHistoryPoints = 0;
      
      for (const sku of skus) {
        const history = await storage.getDemandHistory(sku.id);
        if (history.length > 0) {
          skusWithHistory++;
          totalHistoryPoints += history.length;
        }
      }
      
      console.log(`  SKUs with demand history: ${skusWithHistory}`);
      console.log(`  Total demand history points: ${totalHistoryPoints}`);
      
      if (skusWithHistory === 0) {
        console.log('  ⚠️  No demand history found - retraining needs historical data');
        console.log('  💡 Tip: Add demand history via the UI or import CSV data');
        continue;
      }
      
      // Run automated retraining
      console.log('\n  🚀 Running automated retraining...\n');
      const result = await runAutomatedRetraining(storage, companyId, 10);
      
      // Display results
      console.log('\n  📊 RETRAINING RESULTS:');
      console.log('  ' + '='.repeat(58));
      console.log(`  Total SKUs Evaluated: ${result.totalSkusEvaluated}`);
      console.log(`  SKUs Needing Retraining (MAPE > 10%): ${result.skusNeedingRetraining}`);
      console.log(`  SKUs Successfully Retrained: ${result.skusRetrained}`);
      
      if (result.totalSkusEvaluated > 0) {
        console.log(`  Average MAPE Before: ${result.averageMAPEBefore.toFixed(2)}%`);
        
        if (result.skusRetrained > 0) {
          console.log(`  Average MAPE After: ${result.averageMAPEAfter.toFixed(2)}%`);
          
          const improvement = result.averageMAPEBefore - result.averageMAPEAfter;
          const improvementPct = (improvement / result.averageMAPEBefore) * 100;
          
          if (improvement > 0) {
            console.log(`  🎉 Improvement: ${improvement.toFixed(2)}% (${improvementPct.toFixed(1)}% better)`);
          } else if (improvement < 0) {
            console.log(`  ⚠️  Warning: MAPE increased by ${Math.abs(improvement).toFixed(2)}%`);
          } else {
            console.log(`  ✅ MAPE remained stable`);
          }
        }
      }
      
      if (result.errors.length > 0) {
        console.log(`\n  ⚠️  Errors encountered: ${result.errors.length}`);
        result.errors.forEach((err, i) => {
          console.log(`    ${i + 1}. ${err}`);
        });
      }
      
      console.log('  ' + '='.repeat(58));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Retraining system test complete');
    console.log('='.repeat(60));
    console.log('\n💡 Next Steps:');
    console.log('  1. The retraining job runs automatically every 24 hours');
    console.log('  2. Add more demand history data to improve accuracy');
    console.log('  3. Monitor MAPE metrics in the forecasting dashboard');
    console.log('');
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testRetrainingSystem()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
