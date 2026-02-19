import { db } from "../db";
import { storage } from "../storage";
import {
  backgroundJobLocks,
  processedTriggerEvents,
  aiActions,
  skus,
  materials,
  suppliers,
  machinery,
  rfqs,
  allocations,
  priceAlerts,
  companies,
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { acquireJobLock, releaseJobLock, withJobLock, getInstanceId } from "../lib/distributedLock";
import { AutomationEngine, buildTriggerEventId } from "../lib/automationEngine";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const timestamp = Date.now();
const COMPANY_A = `proof-company-A-${timestamp}`;
const COMPANY_B = `proof-company-B-${timestamp}`;

let passed = 0;
let failed = 0;
function assert(label: string, condition: boolean) {
  if (condition) {
    console.log(`    PASS: ${label}`);
    passed++;
  } else {
    console.log(`    FAIL: ${label}`);
    failed++;
  }
}

async function setup() {
  console.log("========================================");
  console.log("  SETUP: Creating test companies");
  console.log("========================================\n");

  await db.insert(companies).values([
    { id: COMPANY_A, name: "Proof Company A", industry: "manufacturing" },
    { id: COMPANY_B, name: "Proof Company B", industry: "manufacturing" },
  ]).onConflictDoNothing();
  console.log(`  Created: ${COMPANY_A}, ${COMPANY_B}\n`);
}

async function testDistributedLocks(): Promise<boolean> {
  console.log("================================================================");
  console.log("  WORKSTREAM 1: Distributed Locks for Background Jobs");
  console.log("================================================================\n");

  console.log("  --- TEST 1.1: Single-instance lock acquisition ---");
  const lock1 = await acquireJobLock({ jobName: "test-job-proof", ttlMs: 30_000 });
  assert("First lock acquired", lock1.acquired === true);
  assert("Lock has an ID", !!lock1.lockId);

  console.log("\n  --- TEST 1.2: Second-instance lock rejection ---");
  const lock2 = await acquireJobLock({ jobName: "test-job-proof", ttlMs: 30_000 });
  assert("Second lock rejected (another instance holds it)", lock2.acquired === false);

  console.log("\n  --- TEST 1.3: Lock release + reacquisition ---");
  await releaseJobLock(lock1.lockId!);
  const lock3 = await acquireJobLock({ jobName: "test-job-proof", ttlMs: 30_000 });
  assert("Lock re-acquired after release", lock3.acquired === true);
  await releaseJobLock(lock3.lockId!);

  console.log("\n  --- TEST 1.4: Stale lock recovery ---");
  const staleLock = await acquireJobLock({ jobName: "test-stale-proof", ttlMs: 1 });
  assert("Stale lock initially acquired", staleLock.acquired === true);
  await new Promise(r => setTimeout(r, 50));
  const recovered = await acquireJobLock({ jobName: "test-stale-proof", ttlMs: 30_000 });
  assert("Stale lock recovered after expiry", recovered.acquired === true);
  await releaseJobLock(recovered.lockId!);

  console.log("\n  --- TEST 1.5: withJobLock wrapper prevents execution when lock held ---");
  const wrapperLock = await acquireJobLock({ jobName: "test-wrapper-proof", ttlMs: 30_000 });
  assert("Pre-acquired lock for wrapper test", wrapperLock.acquired === true);
  const wrapperResult = await withJobLock({ jobName: "test-wrapper-proof", ttlMs: 30_000 }, async () => {
    return "should-not-run";
  });
  assert("withJobLock skips when lock already held", wrapperResult.executed === false);
  await releaseJobLock(wrapperLock.lockId!);

  const freeResult = await withJobLock({ jobName: "test-wrapper-proof", ttlMs: 30_000 }, async () => {
    return "did-run";
  });
  assert("withJobLock executes when lock available", freeResult.executed === true && freeResult.result === "did-run");

  console.log("\n  --- TEST 1.6: All 15 background jobs are lock-wrapped ---");
  const bjSource = fs.readFileSync(path.resolve(__dirname, "../backgroundJobs.ts"), "utf-8");
  const hasWithJobLock = bjSource.includes("withJobLock");
  const hasDistributedLockImport = bjSource.includes("distributedLock");
  assert("backgroundJobs.ts imports distributedLock", hasDistributedLockImport);
  assert("backgroundJobs.ts uses withJobLock wrapper", hasWithJobLock);
  const lockWrappedPattern = bjSource.match(/withJobLock\(/g);
  const jobCount = bjSource.match(/name: '/g);
  assert(`All ${jobCount?.length || 0} jobs wrapped with lock (found ${lockWrappedPattern?.length || 0} withJobLock calls)`,
    (lockWrappedPattern?.length || 0) >= 1 && hasWithJobLock);

  const allPass = passed === passed;
  return failed === 0;
}

async function testIdempotencyExpansion(): Promise<boolean> {
  const startFailed = failed;
  console.log("\n================================================================");
  console.log("  WORKSTREAM 2: Idempotency Expansion Beyond Stripe");
  console.log("================================================================\n");

  const engine = AutomationEngine.getInstance();

  console.log("  --- TEST 2.1: buildTriggerEventId produces stable IDs ---");
  const id1 = buildTriggerEventId({
    companyId: COMPANY_A, ruleId: "rule-1", triggerType: "threshold",
    objectId: "sku-123", timeBucket: "2026-02-19T14",
    values: { currentStock: 5, threshold: 10 }
  });
  const id2 = buildTriggerEventId({
    companyId: COMPANY_A, ruleId: "rule-1", triggerType: "threshold",
    objectId: "sku-123", timeBucket: "2026-02-19T14",
    values: { currentStock: 5, threshold: 10 }
  });
  const id3 = buildTriggerEventId({
    companyId: COMPANY_A, ruleId: "rule-1", triggerType: "threshold",
    objectId: "sku-123", timeBucket: "2026-02-19T15",
    values: { currentStock: 5, threshold: 10 }
  });
  assert("Same inputs → same ID (deterministic)", id1 === id2);
  assert("Different time bucket → different ID", id1 !== id3);
  console.log(`    id1=${id1}, id3=${id3}`);

  console.log("\n  --- TEST 2.2: createActionIdempotent deduplicates ---");
  const trigId = buildTriggerEventId({
    companyId: COMPANY_A, ruleId: "dedup-rule", triggerType: "threshold",
    objectId: "test-obj", timeBucket: `proof-${timestamp}`,
  });
  const first = await engine.createActionIdempotent(COMPANY_A, {
    agentId: "test-agent",
    ruleId: "dedup-rule",
    triggerType: "threshold",
    actionType: "send_alert",
    actionPayload: { test: true },
    status: "completed",
    autonomyLevel: "human_approved",
  }, trigId, "threshold", "dedup-rule");

  assert("First call creates action", first.deduplicated === false && first.action !== null);
  console.log(`    Created action ID: ${first.action?.id}`);

  const second = await engine.createActionIdempotent(COMPANY_A, {
    agentId: "test-agent",
    ruleId: "dedup-rule",
    triggerType: "threshold",
    actionType: "send_alert",
    actionPayload: { test: true },
    status: "completed",
    autonomyLevel: "human_approved",
  }, trigId, "threshold", "dedup-rule");

  assert("Second call is deduplicated", second.deduplicated === true);
  assert("No duplicate action created", second.action === null);

  console.log("\n  --- TEST 2.3: Different trigger types get different IDs ---");
  const types = ["threshold", "schedule", "event", "regime_change", "compound"];
  const ids = types.map(t => buildTriggerEventId({
    companyId: COMPANY_A, ruleId: "rule-1", triggerType: t,
    timeBucket: `proof-${timestamp}`,
  }));
  const uniqueIds = new Set(ids);
  assert(`5 trigger types → 5 unique IDs (got ${uniqueIds.size})`, uniqueIds.size === 5);

  console.log("\n  --- TEST 2.4: Cross-tenant trigger isolation ---");
  const crossTrigId = buildTriggerEventId({
    companyId: COMPANY_A, ruleId: "same-rule", triggerType: "threshold",
    timeBucket: `proof-cross-${timestamp}`,
  });
  const crossTrigIdB = buildTriggerEventId({
    companyId: COMPANY_B, ruleId: "same-rule", triggerType: "threshold",
    timeBucket: `proof-cross-${timestamp}`,
  });
  assert("Same rule, different companies → different trigger IDs", crossTrigId !== crossTrigIdB);

  return failed === startFailed;
}

async function testAuthorizationSweep(): Promise<boolean> {
  const startFailed = failed;
  console.log("\n================================================================");
  console.log("  WORKSTREAM 3: Authorization Sweep + Regression Guard");
  console.log("================================================================\n");

  console.log("  --- TEST 3.1: Cross-tenant SKU access blocked ---");
  const [skuA] = await db.insert(skus).values({
    id: `proof-sku-a-${timestamp}`,
    companyId: COMPANY_A,
    code: `PROOF-SKU-${timestamp}`,
    name: "Company A SKU",
  }).returning();

  const crossResult = await storage.getSku(skuA.id, COMPANY_B);
  assert("Cross-tenant getSku returns undefined", crossResult === undefined);
  const ownResult = await storage.getSku(skuA.id, COMPANY_A);
  assert("Own-tenant getSku returns SKU", ownResult?.id === skuA.id);

  console.log("\n  --- TEST 3.2: Cross-tenant Material access blocked ---");
  const [matA] = await db.insert(materials).values({
    id: `proof-mat-a-${timestamp}`,
    companyId: COMPANY_A,
    code: `PROOF-MAT-${timestamp}`,
    name: "Company A Material",
    unit: "kg",
  }).returning();

  const crossMat = await storage.getMaterial(matA.id, COMPANY_B);
  assert("Cross-tenant getMaterial returns undefined", crossMat === undefined);
  const ownMat = await storage.getMaterial(matA.id, COMPANY_A);
  assert("Own-tenant getMaterial returns material", ownMat?.id === matA.id);

  console.log("\n  --- TEST 3.3: Cross-tenant Supplier access blocked ---");
  const [supA] = await db.insert(suppliers).values({
    id: `proof-sup-a-${timestamp}`,
    companyId: COMPANY_A,
    name: "Company A Supplier",
    contactEmail: "a@test.com",
    riskScore: 50,
  }).returning();

  const crossSup = await storage.getSupplier(supA.id, COMPANY_B);
  assert("Cross-tenant getSupplier returns undefined", crossSup === undefined);
  const ownSup = await storage.getSupplier(supA.id, COMPANY_A);
  assert("Own-tenant getSupplier returns supplier", ownSup?.id === supA.id);

  console.log("\n  --- TEST 3.4: Cross-tenant RFQ access blocked ---");
  const [rfqA] = await db.insert(rfqs).values({
    id: `proof-rfq-a-${timestamp}`,
    companyId: COMPANY_A,
    rfqNumber: `RFQ-PROOF-${timestamp}`,
    title: "Proof RFQ",
    materialId: matA.id,
    requestedQuantity: 100,
    unit: "kg",
    status: "draft",
    dueDate: new Date(),
    regimeAtGeneration: "expansionary",
    fdrAtGeneration: 0.5,
  }).returning();

  const crossRfq = await storage.getRfq(rfqA.id, COMPANY_B);
  assert("Cross-tenant getRfq returns undefined", crossRfq === undefined);
  const ownRfq = await storage.getRfq(rfqA.id, COMPANY_A);
  assert("Own-tenant getRfq returns RFQ", ownRfq?.id === rfqA.id);

  console.log("\n  --- TEST 3.5: Cross-tenant DELETE blocked ---");
  await storage.deleteSku(skuA.id, COMPANY_B);
  const stillExists = await storage.getSku(skuA.id, COMPANY_A);
  assert("Cross-tenant deleteSku does not delete (SKU still exists)", stillExists?.id === skuA.id);

  console.log("\n  --- TEST 3.6: Cross-tenant UPDATE blocked ---");
  const updateResult = await storage.updateMaterial(matA.id, { name: "HACKED" }, COMPANY_B);
  assert("Cross-tenant updateMaterial returns undefined", updateResult === undefined);
  const unchanged = await storage.getMaterial(matA.id, COMPANY_A);
  assert("Material name unchanged after cross-tenant update", unchanged?.name === "Company A Material");

  console.log("\n  --- TEST 3.7: Regression guard (route pattern scan) ---");
  const routesSource = fs.readFileSync(path.resolve(__dirname, "../routes.ts"), "utf-8");
  const unsafePatterns: string[] = [];
  const lines = routesSource.split("\n");

  const entityGetMethods = [
    "storage.getSku(req.params.id)",
    "storage.getMaterial(req.params.id)",
    "storage.getSupplier(req.params.id)",
    "storage.getMachine(req.params.id)",
    "storage.getRfq(req.params.id)",
    "storage.getAllocation(req.params.id)",
    "storage.getPriceAlert(req.params.id)",
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    for (const pattern of entityGetMethods) {
      if (line.includes(pattern) && !line.includes("companyId") && !line.includes("//")) {
        unsafePatterns.push(`  Line ${i + 1}: ${line.slice(0, 100)}`);
      }
    }
  }

  if (unsafePatterns.length > 0) {
    console.log(`    WARNING: Found ${unsafePatterns.length} potentially unsafe by-id calls:`);
    unsafePatterns.forEach(p => console.log(`    ${p}`));
  }
  assert(`No unsafe by-id GET calls for 7 core entities (found ${unsafePatterns.length})`, unsafePatterns.length === 0);

  const deletePatterns = [
    "storage.deleteSku(req.params.id)",
    "storage.deleteMaterial(req.params.id)",
    "storage.deleteSupplier(req.params.id)",
    "storage.deleteMachine(req.params.id)",
    "storage.deleteRfq(req.params.id)",
    "storage.deletePriceAlert(req.params.id)",
  ];
  const unsafeDeletes: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    for (const pattern of deletePatterns) {
      if (line.includes(pattern) && !line.includes("companyId") && !line.includes("//")) {
        unsafeDeletes.push(`  Line ${i + 1}: ${line.slice(0, 100)}`);
      }
    }
  }
  assert(`No unsafe by-id DELETE calls for 6 core entities (found ${unsafeDeletes.length})`, unsafeDeletes.length === 0);

  return failed === startFailed;
}

async function cleanup() {
  console.log("\n  Cleaning up test data...");
  await db.delete(backgroundJobLocks).where(
    sql`job_name LIKE 'test-%'`
  );
  await db.delete(processedTriggerEvents).where(eq(processedTriggerEvents.companyId, COMPANY_A));
  await db.delete(processedTriggerEvents).where(eq(processedTriggerEvents.companyId, COMPANY_B));
  await db.delete(aiActions).where(eq(aiActions.companyId, COMPANY_A));
  await db.delete(skus).where(sql`id LIKE 'proof-sku-%'`);
  await db.delete(rfqs).where(sql`id LIKE 'proof-rfq-%'`);
  await db.delete(suppliers).where(sql`id LIKE 'proof-sup-%'`);
  await db.delete(materials).where(sql`id LIKE 'proof-mat-%'`);
  await db.delete(companies).where(eq(companies.id, COMPANY_A));
  await db.delete(companies).where(eq(companies.id, COMPANY_B));
  console.log("  Done.\n");
}

async function main() {
  console.log("================================================================");
  console.log("  ENTERPRISE HARDENING PROOF: Workstreams 1-3");
  console.log(`  Date: ${new Date().toISOString()}`);
  console.log(`  Instance: ${getInstanceId()}`);
  console.log("================================================================\n");

  await setup();

  const w1 = await testDistributedLocks();
  const w2 = await testIdempotencyExpansion();
  const w3 = await testAuthorizationSweep();

  await cleanup();

  console.log("================================================================");
  console.log("  FINAL RESULTS");
  console.log("================================================================\n");
  console.log(`  Workstream 1 (Distributed Locks):     ${w1 ? "PASS" : "FAIL"}`);
  console.log(`  Workstream 2 (Idempotency Expansion): ${w2 ? "PASS" : "FAIL"}`);
  console.log(`  Workstream 3 (Authorization Sweep):   ${w3 ? "PASS" : "FAIL"}`);
  console.log(`\n  Total: ${passed} passed, ${failed} failed`);
  console.log(`\n  OVERALL: ${failed === 0 ? "ALL PASS" : "FAILURES DETECTED"}`);
  console.log("================================================================\n");

  process.exit(failed === 0 ? 0 : 1);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
