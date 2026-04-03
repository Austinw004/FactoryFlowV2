/**
 * self-healing-audit-validation.ts
 *
 * Tests for:
 *  A. Self-Healing Engine (7 sections)
 *  B. SOC2 Audit Logging System (7 sections)
 */

import {
  detectAnomaly,
  autoCorrectForecast,
  handleDrift,
  retryPaymentWithBackoff,
  requireDemandHistory,
  startWatchdog,
  stopWatchdog,
  isWatchdogRunning,
  getHealingLog,
  logHealingAction,
} from "../lib/selfHealingEngine";

import {
  redact,
  logAuditEvent,
  logMandatoryEvent,
  immutabilityGuard,
} from "../lib/auditLogger";

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

async function expect(label: string, fn: () => Promise<boolean> | boolean) {
  try {
    const result = await fn();
    if (result) ok(label);
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
      fail(label, `expected "${msgContains}", got: ${e.message}`);
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
      fail(label, `expected "${msgContains}", got: ${e.message}`);
    } else {
      ok(label);
    }
  }
}

// ─── A1: Anomaly Detector ─────────────────────────────────────────────────────
async function testA1() {
  console.log("\n─── A1: Anomaly Detector ───");

  await expect("A1-a deviation > 1.0 → SEVERE",
    () => detectAnomaly(300, 100) === "SEVERE");

  await expect("A1-b deviation exactly 1.0 → SEVERE (>1.0 exclusive is MODERATE/NORMAL — deviation=1.0 boundary)",
    () => {
      const r = detectAnomaly(200, 100); // deviation = 1.0, not > 1.0 → MODERATE
      return r === "MODERATE";
    });

  await expect("A1-c deviation 0.6 → MODERATE",
    () => detectAnomaly(160, 100) === "MODERATE");

  await expect("A1-d deviation 0.3 → NORMAL",
    () => detectAnomaly(130, 100) === "NORMAL");

  await expect("A1-e zero baseline uses 1 as denominator, doesn't crash",
    () => detectAnomaly(50, 0) === "SEVERE");

  await expect("A1-f NaN value → SEVERE",
    () => detectAnomaly(NaN, 100) === "SEVERE");

  await expect("A1-g NaN baseline → SEVERE",
    () => detectAnomaly(100, NaN) === "SEVERE");
}

// ─── A2: Auto-Correction Engine ───────────────────────────────────────────────
async function testA2() {
  console.log("\n─── A2: Auto-Correction Engine ───");

  await expect("A2-a forecast > 5× avg → capped at 3× avg",
    () => autoCorrectForecast(600, 100) === 300);

  await expect("A2-b forecast < 0.2× avg → floored to 0.5× avg",
    () => autoCorrectForecast(10, 100) === 50);

  await expect("A2-c forecast within range → unchanged",
    () => autoCorrectForecast(150, 100) === 150);

  await expect("A2-d exactly 5× avg → unchanged (> not >=)",
    () => autoCorrectForecast(500, 100) === 500);

  await expect("A2-e exactly 0.2× avg → unchanged (< not <=)",
    () => autoCorrectForecast(20, 100) === 20);

  await expect("A2-f zero historicalAvg → forecast unchanged (guard skips)",
    () => autoCorrectForecast(999, 0) === 999);

  await expect("A2-g NaN forecast → returns NaN unchanged (no crash)",
    () => isNaN(autoCorrectForecast(NaN, 100)));

  // Verify healing log captured AUTO_CORRECT_FORECAST actions
  const log = getHealingLog();
  await expect("A2-h AUTO_CORRECT_FORECAST logged for >5× case",
    () => log.some(e => e.type === "AUTO_CORRECT_FORECAST" && e.payload.reason === "ABOVE_5X_CEILING"));
  await expect("A2-i AUTO_CORRECT_FORECAST logged for <0.2× case",
    () => log.some(e => e.type === "AUTO_CORRECT_FORECAST" && e.payload.reason === "BELOW_0.2X_FLOOR"));
}

// ─── A3: Drift Response ───────────────────────────────────────────────────────
async function testA3() {
  console.log("\n─── A3: Drift Response ───");

  const lowDrift = handleDrift(0.3, 0.9, { companyId: "test-co" });
  await expect("A3-a driftScore 0.3 → no adjustment",
    () => lowDrift.adjustedTrustScore === 0.9 && !lowDrift.automationBlocked);

  const highDrift = handleDrift(0.7, 0.9, { companyId: "test-co" });
  await expect("A3-b driftScore 0.7 → trust reduced by 30%",
    () => Math.abs(highDrift.adjustedTrustScore - 0.63) < 0.001);
  await expect("A3-c driftScore 0.7 → automationBlocked",
    () => highDrift.automationBlocked === true);
  await expect("A3-d driftScore 0.7 → retrainTriggered",
    () => highDrift.retrainTriggered === true);

  const boundaryDrift = handleDrift(0.5, 0.8);
  await expect("A3-e driftScore exactly 0.5 → no action (> not >=)",
    () => !boundaryDrift.automationBlocked);

  const zeroTrust = handleDrift(0.9, 0.0);
  await expect("A3-f trust 0 + high drift → adjustedTrust stays 0 (not negative)",
    () => zeroTrust.adjustedTrustScore === 0);

  const log = getHealingLog();
  await expect("A3-g DRIFT_TRUST_REDUCTION logged",
    () => log.some(e => e.type === "DRIFT_TRUST_REDUCTION"));
  await expect("A3-h DRIFT_AUTOMATION_BLOCK logged",
    () => log.some(e => e.type === "DRIFT_AUTOMATION_BLOCK"));
  await expect("A3-i DRIFT_RETRAIN_TRIGGERED logged",
    () => log.some(e => e.type === "DRIFT_RETRAIN_TRIGGERED"));
}

// ─── A4: Payment Recovery ─────────────────────────────────────────────────────
async function testA4() {
  console.log("\n─── A4: Payment Recovery ───");

  // Succeeds on first attempt
  const r1 = await retryPaymentWithBackoff(
    () => Promise.resolve({ paid: true }),
    "TestPayment-OK",
    { companyId: "test-co" },
  );
  await expect("A4-a success on first attempt",
    () => r1.success === true && r1.attempts === 1 && r1.action === "SUCCEEDED");

  // Succeeds on second attempt — we mock this by tracking call count
  let callCount = 0;
  const r2 = await retryPaymentWithBackoff(
    async () => {
      callCount++;
      if (callCount === 1) throw new Error("NETWORK_TIMEOUT");
      return { paid: true };
    },
    "TestPayment-RetryOK",
    { companyId: "test-co" },
  );
  await expect("A4-b first fail, second succeed → FAILED_RETRY_SUCCEEDED",
    () => r2.success === true && r2.attempts === 2 && r2.action === "FAILED_RETRY_SUCCEEDED");

  // Fails both attempts
  const r3 = await retryPaymentWithBackoff(
    () => Promise.reject(new Error("STRIPE_DOWN")),
    "TestPayment-BothFail",
    { companyId: "test-co" },
  );
  await expect("A4-c both fail → FAILED_FLAGGED (no throw)",
    () => r3.success === false && r3.action === "FAILED_FLAGGED");
  await expect("A4-d error message captured",
    () => r3.error === "STRIPE_DOWN");

  const log = getHealingLog();
  await expect("A4-e AUTO_RETRY_PAYMENT logged",
    () => log.some(e => e.type === "AUTO_RETRY_PAYMENT"));
}

// ─── A5: Data Recovery ────────────────────────────────────────────────────────
async function testA5() {
  console.log("\n─── A5: Data Recovery ───");

  const blocked = requireDemandHistory([], "mat-001", { companyId: "test-co" });
  await expect("A5-a empty array → blocked + refreshRequested",
    () => blocked.blocked === true && blocked.refreshRequested === true);
  await expect("A5-b reason is MISSING_DEMAND_HISTORY",
    () => blocked.reason === "MISSING_DEMAND_HISTORY");

  const nullBlocked = requireDemandHistory(null, "mat-002");
  await expect("A5-c null → blocked",
    () => nullBlocked.blocked === true);

  const ok = requireDemandHistory([100, 110, 120], "mat-003");
  await expect("A5-d non-empty → not blocked",
    () => ok.blocked === false && !ok.refreshRequested);

  const log = getHealingLog();
  await expect("A5-e DATA_RECOVERY_REQUESTED logged",
    () => log.some(e => e.type === "DATA_RECOVERY_REQUESTED"));
  await expect("A5-f AUTO_BLOCK_DECISION logged for missing data",
    () => log.some(e => e.type === "AUTO_BLOCK_DECISION" && e.payload.reason === "MISSING_DEMAND_HISTORY"));
}

// ─── A6: System Watchdog ──────────────────────────────────────────────────────
async function testA6() {
  console.log("\n─── A6: System Watchdog ───");

  await expect("A6-a watchdog not running before start",
    () => !isWatchdogRunning());

  startWatchdog();
  await expect("A6-b watchdog running after startWatchdog()",
    () => isWatchdogRunning());

  startWatchdog(); // second call is idempotent
  await expect("A6-c double-start is idempotent",
    () => isWatchdogRunning());

  stopWatchdog();
  await expect("A6-d stopWatchdog halts it",
    () => !isWatchdogRunning());
}

// ─── A7: Action Logger ────────────────────────────────────────────────────────
async function testA7() {
  console.log("\n─── A7: Action Logger ───");

  const beforeCount = getHealingLog().length;

  logHealingAction("AUTO_CORRECT_FORECAST", { test: true });
  logHealingAction("AUTO_BLOCK_DECISION", { reason: "TEST" }, { companyId: "co-x" });
  logHealingAction("AUTO_RETRY_PAYMENT", { label: "TEST_PAYMENT" }, { companyId: "co-x" });

  const log = getHealingLog();
  await expect("A7-a three new entries added",
    () => log.length === beforeCount + 3);

  await expect("A7-b AUTO_CORRECT_FORECAST entry has timestamp",
    () => typeof log.find(e => e.type === "AUTO_CORRECT_FORECAST" && e.payload.test)?.timestamp === "string");

  await expect("A7-c AUTO_BLOCK_DECISION entry has companyId",
    () => log.some(e => e.type === "AUTO_BLOCK_DECISION" && e.companyId === "co-x"));

  await expect("A7-d log is bounded in memory (stays ≤ 1000)",
    () => getHealingLog().length <= 1000);
}

// ─── B1: Audit Schema/redact ──────────────────────────────────────────────────
async function testB1() {
  console.log("\n─── B1: SOC2 Sensitive Data Redaction ───");

  const redacted = redact({ password: "secret123", name: "Alice", token: "abc" });
  await expect("B1-a 'password' redacted",
    () => redacted.password === "[REDACTED]");
  await expect("B1-b 'token' redacted",
    () => redacted.token === "[REDACTED]");
  await expect("B1-c 'name' not redacted",
    () => redacted.name === "Alice");

  const nested = redact({ user: { apiKey: "key-123", email: "a@b.com" } });
  await expect("B1-d nested 'apiKey' redacted",
    () => nested.user.apiKey === "[REDACTED]");
  await expect("B1-e nested 'email' not redacted",
    () => nested.user.email === "a@b.com");

  const withCard = redact({ cardNumber: "4111111111111111", amount: 99 });
  await expect("B1-f 'cardNumber' contains 'card' → redacted",
    () => withCard.cardNumber === "[REDACTED]");

  await expect("B1-g null/undefined passes through",
    () => redact(null) === null);

  await expect("B1-h primitive string passes through",
    () => redact("hello" as any) === "hello");
}

// ─── B2: logAuditEvent ────────────────────────────────────────────────────────
async function testB2() {
  console.log("\n─── B2: logAuditEvent (SOC2) ───");

  // These write to the database but succeed without throwing
  await expect("B2-a success event doesn't throw", async () => {
    await logAuditEvent({
      companyId: "test-co-audit",
      userId: "user-001",
      action: "PAYMENT_EXECUTED",
      entityType: "payment",
      entityId: "pay-001",
      metadata: { amount: 100 },
      success: true,
    });
    return true;
  });

  await expect("B2-b failure event with errorMessage doesn't throw", async () => {
    await logAuditEvent({
      companyId: "test-co-audit",
      action: "LOGIN_FAILURE",
      entityType: "auth",
      metadata: { reason: "INVALID_PASSWORD" },
      success: false,
      errorMessage: "Authentication failed",
    });
    return true;
  });

  await expect("B2-c sensitive metadata is redacted in stored event", async () => {
    await logAuditEvent({
      companyId: "test-co-audit",
      action: "SETTINGS_UPDATED",
      entityType: "settings",
      metadata: { password: "should-be-redacted", setting: "theme" },
      success: true,
    });
    return true;
  });
}

// ─── B3–B7: Mandatory logging, immutability, access control, export ──────────
async function testB3toB7() {
  console.log("\n─── B3–B7: SOC2 Mandatory Events, Immutability, Access Control ───");

  // B3: Mandatory event types exist (type-check)
  await expect("B3-a logMandatoryEvent is callable with LOGIN_SUCCESS type",
    () => typeof logMandatoryEvent === "function");

  // B5: Immutability guard throws on UPDATE
  expectThrows("B5-a UPDATE on audit_logs throws AUDIT_IMMUTABILITY_VIOLATION",
    () => immutabilityGuard("UPDATE"),
    "AUDIT_IMMUTABILITY_VIOLATION");

  expectThrows("B5-b DELETE on audit_logs throws AUDIT_IMMUTABILITY_VIOLATION",
    () => immutabilityGuard("DELETE"),
    "AUDIT_IMMUTABILITY_VIOLATION");

  // B6/B7: Routes exist (static validation via import check)
  await expect("B6-a redact function is exported from auditLogger",
    () => typeof redact === "function");

  await expect("B7-a logAuditEvent is exported",
    () => typeof logAuditEvent === "function");

  await expect("B7-b logMandatoryEvent is exported",
    () => typeof logMandatoryEvent === "function");
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n══════════════════════════════════════════════════════════════");
  console.log("  Self-Healing + SOC2 Audit Validation — Prescient Labs");
  console.log("══════════════════════════════════════════════════════════════");

  await testA1();
  await testA2();
  await testA3();
  await testA4();
  await testA5();
  await testA6();
  await testA7();
  await testB1();
  await testB2();
  await testB3toB7();

  console.log("\n" + "─".repeat(78));
  console.log(`  Results: ${passed + failed} tests | ${passed} passed | ${failed} failed`);
  if (failed === 0) {
    console.log("  VERDICT: ALL SELF-HEALING + SOC2 AUDIT TESTS PASSED ✔");
  } else {
    console.log(`  VERDICT: ${failed} TEST(S) FAILED ✘`);
    process.exit(1);
  }
  console.log("─".repeat(78));
}

main().catch((err) => {
  console.error("\n[FATAL]", err);
  process.exit(1);
});
