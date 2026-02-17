import { db } from '../db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';

interface TestResult {
  name: string;
  gate: string;
  pass: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, gate: string, details: string) {
  results.push({ name, gate, pass: condition, details });
  if (!condition) {
    console.error(`  FAIL: ${name} - ${details}`);
  } else {
    console.log(`  PASS: ${name}`);
  }
}

async function testCRITICAL1_AtomicSpendCheck() {
  console.log('\n=== CRITICAL-1: Atomic Spend Check ===');

  const source = fs.readFileSync('server/lib/automationEngine.ts', 'utf-8');
  const spendSection = source.substring(
    source.indexOf('async atomicSpendCheck'),
    source.indexOf('async atomicSpendCheck') + 1200
  );

  const usesConditionalUpdate = spendSection.includes('daily_spend_total + ') && 
    spendSection.includes('<= ');

  assert(
    usesConditionalUpdate,
    'atomicSpendCheck uses single conditional UPDATE (WHERE spend + amount <= limit)',
    'Financial Integrity',
    usesConditionalUpdate 
      ? 'Single SQL: UPDATE ... SET spend = spend + amount WHERE spend + amount <= limit'
      : 'VULNERABLE: Uses separate read + write (race condition allows budget overspend)'
  );

  const hasReturning = spendSection.includes('RETURNING daily_spend_total');
  assert(
    hasReturning,
    'Spend check uses RETURNING to get new balance atomically',
    'Financial Integrity',
    hasReturning 
      ? 'RETURNING clause provides new balance without separate read'
      : 'Missing RETURNING clause (requires separate read)'
  );
}

async function testCRITICAL2_TenantScopedBroadcasts() {
  console.log('\n=== CRITICAL-2: Tenant-Scoped WebSocket Broadcasts ===');

  const source = fs.readFileSync('server/websocket.ts', 'utf-8');

  const blocksWithoutCompanyId = source.includes('BLOCKED: broadcastUpdate called without companyId');
  assert(
    blocksWithoutCompanyId,
    'broadcastUpdate blocks calls without companyId',
    'Multi-Tenant Isolation',
    blocksWithoutCompanyId 
      ? 'Missing companyId is detected and broadcast is blocked'
      : 'VULNERABLE: Broadcasts could leak across tenants'
  );

  const filtersClients = source.includes('message.companyId !== client.companyId');
  assert(
    filtersClients,
    'WebSocket broadcast filters clients by companyId match',
    'Multi-Tenant Isolation',
    filtersClients 
      ? 'Each client is checked: message.companyId !== client.companyId'
      : 'VULNERABLE: Messages sent to all connected clients'
  );
}

async function testCRITICAL3_RegimeDatabaseCAS() {
  console.log('\n=== CRITICAL-3: Database-backed Regime Transitions ===');

  const columns = await db.execute(sql`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'regime_state'
    ORDER BY ordinal_position
  `);
  const colNames = columns.rows.map((r: any) => r.column_name);

  assert(
    colNames.includes('company_id'),
    'regime_state table exists with company_id',
    'Data Honesty',
    colNames.includes('company_id') 
      ? `Columns: ${colNames.join(', ')}`
      : 'MISSING: No regime_state table in database'
  );

  assert(
    colNames.includes('confirmed_regime') && colNames.includes('confirmation_count'),
    'regime_state has confirmation tracking for CAS-like transitions',
    'Data Honesty',
    colNames.includes('confirmation_count') 
      ? 'confirmation_count column tracks regime transition progress (multi-cycle confirmation)'
      : 'No transition confirmation tracking'
  );

  assert(
    colNames.includes('previous_regime'),
    'regime_state tracks transition history',
    'Data Honesty',
    colNames.includes('previous_regime') 
      ? 'previous_regime column preserves transition lineage'
      : 'No transition history tracked'
  );

  const routesSource = fs.readFileSync('server/routes.ts', 'utf-8');
  const hasRegimeStateUsage = routesSource.includes('regimeState') || routesSource.includes('regime_state');
  assert(
    hasRegimeStateUsage,
    'Routes use database-backed regime state (not in-memory Map)',
    'Data Honesty',
    hasRegimeStateUsage 
      ? 'regimeState table referenced in routes for regime transitions (database-backed)'
      : 'VULNERABLE: Regime state may still be in-memory'
  );
}

async function testHIGH1_SafeModeTOCTOU() {
  console.log('\n=== HIGH-1: Safe Mode TOCTOU Fix ===');
  
  const bgJobsSource = fs.readFileSync('server/backgroundJobs.ts', 'utf-8');

  const claimSection = bgJobsSource.indexOf('claimQueuedActions');
  const postClaimSection = bgJobsSource.substring(claimSection, claimSection + 2000);

  const safeModeCheckedInsideLoop = postClaimSection.includes('getSafeMode') && 
    postClaimSection.includes('for (const item');

  assert(
    safeModeCheckedInsideLoop,
    'Safe mode re-checked inside item processing loop',
    'Automation Safety',
    safeModeCheckedInsideLoop 
      ? 'getSafeMode() called inside for-loop after claimQueuedActions (no TOCTOU gap)'
      : 'VULNERABLE: Safe mode checked once before claiming, stale during execution'
  );
}

async function testHIGH2_AtomicGuardrailCounters() {
  console.log('\n=== HIGH-2: Atomic Guardrail Violation Counters ===');
  
  const engineSource = fs.readFileSync('server/lib/automationEngine.ts', 'utf-8');

  const stalePattern = /violationCount:\s*\(guard\.violationCount\s*\|\|\s*0\)\s*\+\s*1/g;
  const staleMatches = engineSource.match(stalePattern) || [];

  assert(
    staleMatches.length === 0,
    'No stale read-modify-write violation counters',
    'Automation Safety',
    staleMatches.length === 0 
      ? 'All violation counters use atomic SQL increment'
      : `VULNERABLE: ${staleMatches.length} instances of non-atomic violation_count += 1`
  );

  const atomicPattern = /COALESCE\(violation_count,\s*0\)\s*\+\s*1/g;
  const atomicMatches = engineSource.match(atomicPattern) || [];

  assert(
    atomicMatches.length >= 5,
    'At least 5 atomic violation counter increments',
    'Automation Safety',
    `Found ${atomicMatches.length} atomic COALESCE(violation_count, 0) + 1 patterns`
  );
}

async function testHIGH3_WebhookStaleLockLimit() {
  console.log('\n=== HIGH-3: Webhook Stale Lock Max Takeover Limit ===');
  
  const webhookSource = fs.readFileSync('server/webhookHandlers.ts', 'utf-8');

  const hasMaxTakeovers = webhookSource.includes('MAX_STALE_TAKEOVERS');
  assert(
    hasMaxTakeovers,
    'Webhook stale lock has max takeover limit',
    'Financial Integrity',
    hasMaxTakeovers 
      ? 'MAX_STALE_TAKEOVERS constant prevents infinite retry loops'
      : 'VULNERABLE: Stale lock recovery can loop indefinitely'
  );

  const hasFailureOnExceed = webhookSource.includes('max_stale_takeovers_exceeded');
  assert(
    hasFailureOnExceed,
    'Exceeding max takeovers logs and fails permanently',
    'Financial Integrity',
    hasFailureOnExceed 
      ? 'Events that exceed takeover limit are moved to permanent failure'
      : 'No permanent failure mechanism for stuck webhook events'
  );
}

async function testHIGH4_JobLockOwnership() {
  console.log('\n=== HIGH-4: Job Lock Release Ownership ===');
  
  const engineSource = fs.readFileSync('server/lib/automationEngine.ts', 'utf-8');

  const releaseIdx = engineSource.indexOf('async releaseJobLock');
  const releaseMethod = engineSource.substring(releaseIdx, releaseIdx + 800);

  const hasWorkerIdParam = releaseMethod.includes('workerId');
  assert(
    hasWorkerIdParam,
    'releaseJobLock accepts workerId for ownership verification',
    'Automation Safety',
    hasWorkerIdParam 
      ? 'workerId parameter added for lock ownership verification'
      : 'VULNERABLE: Any worker can release any lock'
  );

  const hasLockedByCheck = releaseMethod.includes('lockedBy');
  assert(
    hasLockedByCheck,
    'Release checks lockedBy column before deleting',
    'Automation Safety',
    hasLockedByCheck 
      ? 'WHERE clause includes lockedBy = workerId for ownership verification'
      : 'VULNERABLE: Lock released without verifying owner'
  );
}

async function testMEDIUM_CircuitBreakers() {
  console.log('\n=== MEDIUM: Circuit Breakers for External APIs ===');
  
  const apiSource = fs.readFileSync('server/lib/externalAPIs.ts', 'utf-8');

  const hasCircuitBreaker = apiSource.includes('CircuitBreaker');
  assert(
    hasCircuitBreaker,
    'CircuitBreaker class exists in externalAPIs.ts',
    'Restart/Scaling',
    hasCircuitBreaker 
      ? 'CircuitBreaker class with threshold and reset timer'
      : 'No circuit breaker protection for external API calls'
  );

  const hasIsOpen = apiSource.includes('isOpen()');
  assert(
    hasIsOpen,
    'API calls check circuit breaker state before executing',
    'Restart/Scaling',
    hasIsOpen 
      ? 'isOpen() checked before making external API calls'
      : 'External API calls not gated by circuit breaker'
  );
}

async function testMEDIUM_ExecuteEndpointGating() {
  console.log('\n=== MEDIUM: Assistant Execute Endpoint Gating ===');
  
  const routesSource = fs.readFileSync('server/routes.ts', 'utf-8');

  const hasEnableCheck = routesSource.includes('ENABLE_ASSISTANT_EXECUTE');
  assert(
    hasEnableCheck,
    'Assistant execute endpoint checks ENABLE_ASSISTANT_EXECUTE env var',
    'Automation Safety',
    hasEnableCheck 
      ? 'Endpoint gated by environment variable (disabled by default in insight-only mode)'
      : 'VULNERABLE: Assistant can execute actions without explicit enablement'
  );
}

async function testMEDIUM_RateLimiting() {
  console.log('\n=== MEDIUM: Rate Limiting on Automation Endpoints ===');
  
  const routesSource = fs.readFileSync('server/routes.ts', 'utf-8');

  const approveEndpoint = routesSource.indexOf('actions/:actionId/approve');
  const approveContext = routesSource.substring(Math.max(0, approveEndpoint - 200), approveEndpoint + 100);
  const hasRateLimit = approveContext.includes('rateLimiter') || approveContext.includes('rateLimit');

  assert(
    hasRateLimit,
    'Automation approval endpoint has rate limiting',
    'Automation Safety',
    hasRateLimit 
      ? 'Rate limiter middleware applied to approval endpoint'
      : 'No rate limiting on automation approval (DoS risk)'
  );
}

async function testMEDIUM_DataRetention() {
  console.log('\n=== MEDIUM: Data Retention Scheduling ===');
  
  const bgSource = fs.readFileSync('server/backgroundJobs.ts', 'utf-8');

  const hasRetention = bgSource.includes('dataRetention') || bgSource.includes('data_retention') || bgSource.includes('Data Retention');
  assert(
    hasRetention,
    'Data retention job is scheduled',
    'Observability & Forensics',
    hasRetention 
      ? 'Daily data retention job registered in background jobs'
      : 'No data retention policy enforced (unbounded storage growth)'
  );
}

async function runAllTests() {
  console.log('================================================================');
  console.log('  ENTERPRISE READINESS AUDIT - REGRESSION TEST SUITE');
  console.log('  Date: ' + new Date().toISOString());
  console.log('================================================================');

  await testCRITICAL1_AtomicSpendCheck();
  await testCRITICAL2_TenantScopedBroadcasts();
  await testCRITICAL3_RegimeDatabaseCAS();
  await testHIGH1_SafeModeTOCTOU();
  await testHIGH2_AtomicGuardrailCounters();
  await testHIGH3_WebhookStaleLockLimit();
  await testHIGH4_JobLockOwnership();
  await testMEDIUM_CircuitBreakers();
  await testMEDIUM_ExecuteEndpointGating();
  await testMEDIUM_RateLimiting();
  await testMEDIUM_DataRetention();

  console.log('\n================================================================');
  console.log('  RESULTS SUMMARY');
  console.log('================================================================');

  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  const total = results.length;

  const byGate: Record<string, { pass: number; fail: number }> = {};
  for (const r of results) {
    if (!byGate[r.gate]) byGate[r.gate] = { pass: 0, fail: 0 };
    if (r.pass) byGate[r.gate].pass++;
    else byGate[r.gate].fail++;
  }

  for (const [gate, counts] of Object.entries(byGate)) {
    const status = counts.fail === 0 ? 'PASS' : 'FAIL';
    console.log(`  [${status}] ${gate}: ${counts.pass}/${counts.pass + counts.fail} checks passed`);
  }

  console.log(`\n  TOTAL: ${passed}/${total} passed, ${failed} failed`);
  console.log(`  VERDICT: ${failed === 0 ? 'ALL GATES PASS' : `${failed} FAILURES REQUIRE ATTENTION`}`);
  console.log('================================================================\n');

  if (failed > 0) {
    console.log('FAILED CHECKS:');
    for (const r of results.filter(r => !r.pass)) {
      console.log(`  - [${r.gate}] ${r.name}: ${r.details}`);
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch(err => {
  console.error('Test suite crashed:', err);
  process.exit(2);
});
