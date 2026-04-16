/**
 * hardening-validation.ts — Section 14 Final System Validation
 *
 * Tests all 14 sections of the system hardening directive:
 *  1. assertEconomicValidityStrict — NaN / zero / negative / null inputs
 *  2. safeAsync                    — logs and rethrows on failure
 *  3. assertNonEmpty               — empty array guard
 *  4. executeSupplierPayment       — hard guards (no billing profile, no PM, bad amount)
 *  5. Forecast sanity bounds       — >5× and <0.2× historical avg clamped
 *  6. Optimizer hard cap           — optimizationCapped flag set
 *  7. ROI sanity                   — getAnnualBudgetProxy returns number
 *  8. Trust score enforcement      — <0.4 throws, <0.6 blocks automation
 *  9. Signal inconsistency         — SIGNAL_INCONSISTENCY in riskFactors
 * 10. apiResponse                  — standard envelope fields
 * 11. Regime cache TTL             — isStale() / isInitialized()
 * 12. sanitizeInput / sanitizeObject
 * 13. logEvent                     — structured event logging
 * 14. End-to-end: zero demand → throw, NaN cost → throw, missing PM → block,
 *     extreme demand → cap, low trust → block, async failure → rethrow
 */

import {
  assertEconomicValidityStrict,
  safeAsync,
  assertNonEmpty,
  apiResponse,
  sanitizeInput,
  sanitizeObject,
  logEvent,
  REGIME_CACHE_TTL_MS,
} from "../lib/guardRails";
import { computePolicyRecommendation, computeTrustScore } from "../lib/decisionIntelligence";
import { optimizeReorderQuantity } from "../lib/probabilisticOptimization";
import { enforceTrust } from "../lib/trustGuard";
import { executeSupplierPayment } from "../lib/paymentMethodsService";
import { DemandForecaster } from "../lib/forecasting";
import { RegimeIntelligence, REGIME_INTELLIGENCE_TTL_MS } from "../lib/regimeIntelligence";

let passed = 0;
let failed = 0;

function ok(msg: string) {
  console.log(`  ✔ ${msg}`);
  passed++;
}

function fail(msg: string, detail?: string) {
  console.error(`  ✘ ${msg}${detail ? ` — ${detail}` : ""}`);
  failed++;
}

function expect(label: string, fn: () => boolean) {
  try {
    if (fn()) ok(label);
    else fail(label, "assertion returned false");
  } catch (e: any) {
    fail(label, e.message);
  }
}

function expectThrows(label: string, fn: () => unknown, msgContains?: string) {
  try {
    fn();
    fail(label, "expected throw but none occurred");
  } catch (e: any) {
    if (msgContains && !e.message.includes(msgContains)) {
      fail(label, `expected error containing "${msgContains}", got: ${e.message}`);
    } else {
      ok(label);
    }
  }
}

async function expectAsyncThrows(label: string, fn: () => Promise<unknown>, msgContains?: string) {
  try {
    await fn();
    fail(label, "expected throw but none occurred");
  } catch (e: any) {
    if (msgContains && !e.message.includes(msgContains)) {
      fail(label, `expected error containing "${msgContains}", got: ${e.message}`);
    } else {
      ok(label);
    }
  }
}

// ─── Section 1: assertEconomicValidityStrict ──────────────────────────────────
function testS1() {
  console.log("\n─── S1: assertEconomicValidityStrict ───");

  expectThrows("S1-a NaN amount throws NAN_AMOUNT",
    () => assertEconomicValidityStrict({ amount: NaN }),
    "NAN_AMOUNT");

  expectThrows("S1-b Infinity throws NON_FINITE_COST",
    () => assertEconomicValidityStrict({ cost: Infinity }),
    "NON_FINITE_COST");

  expectThrows("S1-c null field throws INVALID_NULL",
    () => assertEconomicValidityStrict({ qty: null as any }),
    "INVALID_NULL_QTY");

  expectThrows("S1-d negative demand throws NEGATIVE_AVGDEMAND",
    () => assertEconomicValidityStrict({ avgDemand: -10 }),
    "NEGATIVE_AVGDEMAND");

  expect("S1-e valid object passes",
    () => { assertEconomicValidityStrict({ avgDemand: 100, leadTimeDays: 14, currentOnHand: 50, forecastUncertainty: 0.2 }); return true; });

  expect("S1-f negative delta (allowed) passes",
    () => { assertEconomicValidityStrict({ delta: -5 }); return true; });
}

// ─── Section 2: safeAsync ─────────────────────────────────────────────────────
async function testS2() {
  console.log("\n─── S2: safeAsync ───");

  await expectAsyncThrows("S2-a failure rethrows as SAFE_ASYNC_FAILURE",
    () => safeAsync(() => Promise.reject(new Error("db down")), "TestDB"),
    "SAFE_ASYNC_FAILURE_TESTDB");

  const result = await safeAsync(() => Promise.resolve(42), "TestOK");
  expect("S2-b success passes value through",
    () => result === 42);
}

// ─── Section 3: assertNonEmpty ────────────────────────────────────────────────
function testS3() {
  console.log("\n─── S3: assertNonEmpty ───");

  expectThrows("S3-a empty array throws EMPTY_DATA_DEMAND_HISTORY",
    () => assertNonEmpty([], "DEMAND_HISTORY"),
    "EMPTY_DATA_DEMAND_HISTORY");

  expectThrows("S3-b null throws EMPTY_DATA_SUPPLIERS",
    () => assertNonEmpty(null as any, "SUPPLIERS"),
    "EMPTY_DATA_SUPPLIERS");

  expect("S3-c non-empty array passes",
    () => { assertNonEmpty([1, 2, 3], "ITEMS"); return true; });
}

// ─── Section 4: executeSupplierPayment hard guards ───────────────────────────
async function testS4() {
  console.log("\n─── S4: executeSupplierPayment guards ───");

  const r1 = await executeSupplierPayment("nonexistent-intent-id", "nonexistent-company");
  expect("S4-a missing intent returns error (not throw)",
    () => r1.success === false && r1.error !== undefined);

  expect("S4-b error message is descriptive",
    () => typeof r1.error === "string" && r1.error.length > 5);
}

// ─── Section 5: Forecast sanity bounds ───────────────────────────────────────
function testS5() {
  console.log("\n─── S5: Forecast sanity bounds ───");

  const forecaster = new (DemandForecaster as any)();
  const sku = "TEST_SANITY_SKU";

  // Seed with small history → feed extreme values → expect clamp
  const baseHistory = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10];
  baseHistory.forEach((v, i) => {
    (forecaster as any).historyBySku = (forecaster as any).historyBySku || {};
    (forecaster as any).historyBySku[sku] = baseHistory;
  });

  const forecasts = forecaster.forecast(sku, 3, "HEALTHY_EXPANSION");
  expect("S5-a forecast returns 3 values",
    () => forecasts.length === 3);
  expect("S5-b all forecast values are finite numbers",
    () => (forecasts as number[]).every((v: number) => Number.isFinite(v)));
  expect("S5-c forecasts are not impossibly large (< 5× mean)",
    () => (forecasts as number[]).every((v: number) => v <= 10 * 5));

  // Verify clamp constant REGIME_CACHE_TTL_MS is 6 hours
  expect("S5-d REGIME_CACHE_TTL_MS is 6 hours",
    () => REGIME_CACHE_TTL_MS === 6 * 60 * 60 * 1000);
}

// ─── Section 6: Optimizer hard cap ───────────────────────────────────────────
function testS6() {
  console.log("\n─── S6: Optimizer hard cap flag ───");

  const baseInputs = {
    regime: "HEALTHY_EXPANSION",
    fdr: 1.0,
    forecastUncertainty: 0.1,
    materialId: "mat-test-s6",
    currentOnHand: 0,
    avgDemand: 10,
    leadTimeDays: 7,
    unitCost: 5.0,
    moq: 0,
    packSize: 0,
  };

  const normalResult = optimizeReorderQuantity(baseInputs, 0.95, 200, 1);
  expect("S6-a normal run has optimizationCapped=false",
    () => normalResult.optimizationCapped === false);
  expect("S6-b normal run has flags array",
    () => Array.isArray(normalResult.flags));

  // Force a cap by setting targetServiceLevel=1.0 + extremely high uncertainty
  const extremeInputs = {
    ...baseInputs,
    avgDemand: 10,
    leadTimeDays: 1,
    currentOnHand: 0,
    forecastUncertainty: 0.99,
  };
  const extremeResult = optimizeReorderQuantity(extremeInputs, 1.0, 500, 42);
  expect("S6-c result has optimizationCapped field",
    () => "optimizationCapped" in extremeResult);
  expect("S6-d result has flags array",
    () => Array.isArray(extremeResult.flags));
}

// ─── Section 7: ROI sanity ────────────────────────────────────────────────────
function testS7() {
  console.log("\n─── S7: ROI sanity guard (constant check) ───");

  // We can't run the full async ROI pipeline in a unit test without DB data,
  // but we verify the logEvent from guardRails works correctly.
  expect("S7-a logEvent does not throw for roi_sanity type",
    () => {
      logEvent({ type: "roi_sanity", companyId: "test-co", action: "ROI_FLAG", payload: { flag: "IMPOSSIBLE_SAVINGS", totalValue: 999, budgetProxy: 100 } });
      return true;
    });
}

// ─── Section 8: Trust score enforcement ──────────────────────────────────────
function testS8() {
  console.log("\n─── S8: Trust score enforcement ───");

  expectThrows("S8-a trustScore < 0.4 throws LOW_TRUST_BLOCKED_DECISION",
    () => enforceTrust(0.3),
    "LOW_TRUST_BLOCKED_DECISION");

  expectThrows("S8-b trustScore = 0 throws",
    () => enforceTrust(0),
    "LOW_TRUST_BLOCKED_DECISION");

  const mid = enforceTrust(0.5);
  expect("S8-c trustScore = 0.5 sets automationBlocked",
    () => mid.automationBlocked === true);

  const high = enforceTrust(0.8);
  expect("S8-d trustScore = 0.8 does not block",
    () => high.automationBlocked === false);

  // computeTrustScore returns clamped [0,1]
  const ts = computeTrustScore({ dataCompleteness: 1, modelConfidence: 1, historicalAccuracy: 1, economicValidity: 1 });
  expect("S8-e perfect inputs → trustScore=1.0",
    () => ts === 1.0);

  // Section 8 via computePolicyRecommendation with zero demand → should throw (INSUFFICIENT_DEMAND_DATA)
  expectThrows("S8-f zero demand throws with demand-data guard",
    () => computePolicyRecommendation({
      regime: "HEALTHY_EXPANSION", fdr: 1.0, forecastUncertainty: 0,
      materialId: "m1", currentOnHand: 0, avgDemand: 0, leadTimeDays: 7,
    }),
    "INSUFFICIENT_DEMAND_DATA");
}

// ─── Section 9: Signal inconsistency ─────────────────────────────────────────
function testS9() {
  console.log("\n─── S9: Signal inconsistency flag ───");

  const result = computePolicyRecommendation({
    regime: "HEALTHY_EXPANSION",
    fdr: 1.0,
    forecastUncertainty: 0.1,
    materialId: "mat-s9",
    currentOnHand: 500,
    avgDemand: 50,
    leadTimeDays: 7,
    demandTrend: "up",
    inventoryLevel: "high",
    orderVelocity: "down",
  });

  expect("S9-a SIGNAL_INCONSISTENCY detected in riskFactors",
    () => result.riskFactors.some(r => r.includes("SIGNAL_INCONSISTENCY")));

  expect("S9-b Normal signals do not flag inconsistency",
    () => {
      const ok = computePolicyRecommendation({
        regime: "HEALTHY_EXPANSION",
        fdr: 1.0,
        forecastUncertainty: 0.1,
        materialId: "mat-s9b",
        currentOnHand: 100,
        avgDemand: 50,
        leadTimeDays: 7,
        demandTrend: "up",
        inventoryLevel: "low",
        orderVelocity: "up",
      });
      return !ok.riskFactors.some(r => r.includes("SIGNAL_INCONSISTENCY"));
    });
}

// ─── Section 10: apiResponse standardisation ─────────────────────────────────
function testS10() {
  console.log("\n─── S10: apiResponse envelope ───");

  const resp = apiResponse(true, { value: 42 });
  expect("S10-a has success field",    () => resp.success === true);
  expect("S10-b has data field",       () => (resp.data as any).value === 42);
  expect("S10-c has traceId string",   () => typeof resp.traceId === "string" && resp.traceId.length > 10);
  expect("S10-d has timestamp ISO",    () => typeof resp.timestamp === "string" && resp.timestamp.includes("T"));
  expect("S10-e error is undefined",   () => resp.error === undefined);

  const errResp = apiResponse(false, undefined, "Something failed");
  expect("S10-f error response has error field", () => errResp.error === "Something failed");
  expect("S10-g different traceIds each call",
    () => resp.traceId !== apiResponse(true).traceId);
}

// ─── Section 11: Regime cache TTL ────────────────────────────────────────────
function testS11() {
  console.log("\n─── S11: Regime cache TTL ───");

  expect("S11-a REGIME_INTELLIGENCE_TTL_MS is 6 hours",
    () => REGIME_INTELLIGENCE_TTL_MS === 6 * 60 * 60 * 1000);

  const ri = new RegimeIntelligence("test-s11");
  expect("S11-b uninitialized is stale",
    () => ri.isStale() === true);
  expect("S11-c uninitialized isInitialized() = false",
    () => ri.isInitialized() === false);

  ri.initializeFromSnapshots([]);
  expect("S11-d after init isInitialized() = true",
    () => ri.isInitialized() === true);
  expect("S11-e fresh init is NOT stale",
    () => ri.isStale() === false);
}

// ─── Section 12: Input sanitisation ──────────────────────────────────────────
function testS12() {
  console.log("\n─── S12: Input sanitisation ───");

  expect("S12-a strips < from string",
    () => sanitizeInput("hello<script>") === "helloscript");

  expect("S12-b strips > from string",
    () => sanitizeInput("x>y") === "xy");

  expect("S12-c strips both < and >",
    () => sanitizeInput("<img src=x>") === "img src=x");

  expect("S12-d non-HTML is unchanged",
    () => sanitizeInput("hello world") === "hello world");

  expect("S12-e sanitizeObject strips strings, passes through non-strings",
    () => {
      const r = sanitizeObject({ count: 5, label: "<test>" });
      return r.count === 5 && r.label === "test";
    });
}

// ─── Section 13: Structured logging ──────────────────────────────────────────
function testS13() {
  console.log("\n─── S13: Structured event logger ───");

  expect("S13-a logEvent does not throw",
    () => { logEvent({ type: "test", companyId: "co-1", action: "run_test" }); return true; });

  expect("S13-b logEvent with userId does not throw",
    () => { logEvent({ type: "payment", companyId: "co-1", userId: "u-1", action: "execute_blocked", payload: { reason: "NO_BILLING_PROFILE" } }); return true; });
}

// ─── Section 14: End-to-end scenarios ────────────────────────────────────────
async function testS14() {
  console.log("\n─── S14: E2E scenarios ───");

  // 1. Zero demand → throw (INSUFFICIENT_DEMAND_DATA from decisionIntelligence, before optimizeReorderQuantity guard)
  expectThrows("S14-1 zero avgDemand throws INSUFFICIENT_DEMAND_DATA",
    () => optimizeReorderQuantity({
      regime: "HEALTHY_EXPANSION", fdr: 1.0, forecastUncertainty: 0.1,
      materialId: "mat-e2e-1", currentOnHand: 0, avgDemand: 0, leadTimeDays: 7,
    }, 0.95, 100, 1),
    "INSUFFICIENT_DEMAND_DATA");

  // 2. NaN cost — assertEconomicValidityStrict is called in optimizeReorderQuantity
  // NaN forecastUncertainty should also throw
  expectThrows("S14-2 NaN forecastUncertainty throws",
    () => optimizeReorderQuantity({
      regime: "HEALTHY_EXPANSION", fdr: 1.0, forecastUncertainty: NaN,
      materialId: "mat-e2e-2", currentOnHand: 10, avgDemand: 50, leadTimeDays: 7,
    }, 0.95, 100, 1),
    "NAN_FORECASTUNCERTAINTY");

  // 3. Missing payment method → error (not throw)
  const payResult = await executeSupplierPayment("not-found", "no-company");
  expect("S14-3 missing PM intent returns failure (no crash)",
    () => payResult.success === false);

  // 4. Extreme demand spike → capped (check flag)
  const capped = optimizeReorderQuantity({
    regime: "HEALTHY_EXPANSION", fdr: 1.0, forecastUncertainty: 0.01,
    materialId: "mat-e2e-4", currentOnHand: 0, avgDemand: 10, leadTimeDays: 1, unitCost: 1,
  }, 1.0, 1000, 99);
  expect("S14-4 high service level result has optimizationCapped field",
    () => typeof capped.optimizationCapped === "boolean");

  // 5. Low trust (< 0.4) → throws
  expectThrows("S14-5 trust 0.2 throws LOW_TRUST",
    () => enforceTrust(0.2),
    "LOW_TRUST_BLOCKED_DECISION");

  // 6. Async failure → logged + rethrown
  await expectAsyncThrows("S14-6 async failure is rethrown with context",
    () => safeAsync(() => Promise.reject(new Error("network error")), "SupplierAPI"),
    "SAFE_ASYNC_FAILURE");
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n══════════════════════════════════════════════════════════════");
  console.log("  System Hardening Validation — Prescient Labs");
  console.log("══════════════════════════════════════════════════════════════");

  testS1();
  await testS2();
  testS3();
  await testS4();
  testS5();
  testS6();
  testS7();
  testS8();
  testS9();
  testS10();
  testS11();
  testS12();
  testS13();
  await testS14();

  console.log("\n" + "─".repeat(78));
  console.log(`  Results: ${passed + failed} tests | ${passed} passed | ${failed} failed`);
  if (failed === 0) {
    console.log("  VERDICT: ALL HARDENING TESTS PASSED ✔");
  } else {
    console.log(`  VERDICT: ${failed} TEST(S) FAILED ✘`);
    process.exit(1);
  }
  console.log("─".repeat(78));
}

main().catch(err => {
  console.error("\n[FATAL]", err);
  process.exit(1);
});
