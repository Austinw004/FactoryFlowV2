/**
 * THIRTY-DAY OPERATIONAL SIMULATION
 * Prescient Labs Manufacturing Intelligence Platform
 *
 * Simulates 30 days of operations for a mid-market manufacturer
 * operating in volatile commodity markets.
 *
 * Uses real forecasting, optimization, and data quality algorithms.
 * Inventory state tracked purely in-memory for speed and reproducibility.
 *
 * Run: npx tsx server/tests/thirty-day-sim.ts
 */

import { DemandForecaster } from "../lib/forecasting.js";
import { optimizeReorderQuantity } from "../lib/probabilisticOptimization.js";
import { computePolicyRecommendation } from "../lib/decisionIntelligence.js";
import { runStressTest } from "../lib/stressTesting.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────
// SEEDED PRNG (fully deterministic replay)
// ─────────────────────────────────────────────
class SeededRNG {
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) & 0xffffffff;
    return (this.seed >>> 0) / 0x100000000;
  }
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  bool(prob: number): boolean { return this.next() < prob; }
  pick<T>(arr: T[]): T { return arr[Math.floor(this.next() * arr.length)]; }
  poisson(lambda: number): number {
    if (lambda <= 0) return 0;
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= this.next(); } while (p > L);
    return k - 1;
  }
  normal(mean: number, std: number): number {
    const u1 = this.next(), u2 = this.next();
    const z = Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
    return mean + z * std;
  }
}

const rng = new SeededRNG(0xDEADBEEF);

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type SKUCategory = "fast_mover" | "slow_mover" | "intermittent";
type RegimeType = "HEALTHY_EXPANSION" | "MILD_CONTRACTION" | "STRESS" | "RECOVERY";
type SupplierStatus = "healthy" | "delayed" | "outage";

interface SimSKU {
  id: string;
  name: string;
  category: SKUCategory;
  supplierId: string;
  avgDemand: number;       // units/day
  leadTimeDays: number;
  unitCost: number;
  moq: number;
  packSize: number;
  reorderPoint: number;
  safetyStock: number;
  onHand: number;
  onOrder: { qty: number; arrivalDay: number }[];
  demandHistory: number[]; // last 30 days
  fulfillmentHistory: boolean[];
  stockoutDays: number;
  backorderUnits: number;
  backorderAccum: number;
  dataQualityIssue: boolean;
  dataQualityDay: number;
  isCritical: boolean;     // marks high-revenue SKUs
}

interface SimSupplier {
  id: string;
  name: string;
  reliability: number;     // 0–1
  status: SupplierStatus;
  outageStartDay: number;
  outageEndDay: number;
  delayFactor: number;     // 1.0 = on time, 2.0 = double lead time
  baseUnitMultiplier: number;
}

interface DailySnapshot {
  day: number;
  regime: RegimeType;
  fdr: number;
  avgServiceLevel: number;
  stockoutsToday: number;
  newBackorderUnits: number;
  workingCapital: number;
  actionsProposed: number;
  actionsApproved: number;
  actionsRejected: number;
  supplierOutages: string[];
  priceEvent: boolean;
  priceChangePct: number;
  dataQualityIssues: number;
  dataQualityScore: number;
  forecastRun: boolean;
  optimizationRuns: number;
  unsafeFlags: string[];
}

interface PendingAction {
  id: string;
  day: number;
  type: "purchase_order" | "reorder" | "supplier_switch";
  skuId: string;
  qty: number;
  supplierId: string;
  estimatedCost: number;
  status: "draft" | "approved" | "rejected";
  approvedDay: number | null;
}

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const SIM_DAYS = 30;
const NUM_FAST_MOVERS = 40;
const NUM_SLOW_MOVERS = 35;
const NUM_INTERMITTENT = 25;
const NUM_SUPPLIERS = 8;

const WEEKDAY_FACTOR = [0.85, 1.05, 1.10, 1.08, 1.02, 0.60, 0.30]; // Mon–Sun

// Regime schedule: realistic 30-day arc
const REGIME_SCHEDULE: { day: number; regime: RegimeType; fdr: number }[] = [
  { day: 1,  regime: "HEALTHY_EXPANSION", fdr: -1.2 },
  { day: 8,  regime: "MILD_CONTRACTION",  fdr: -0.3 },
  { day: 15, regime: "STRESS",            fdr: 0.9 },
  { day: 22, regime: "RECOVERY",          fdr: -0.6 },
  { day: 28, regime: "HEALTHY_EXPANSION", fdr: -1.0 },
];

// Price volatility events (day, supplier, pct change)
const PRICE_EVENTS: { day: number; supplierId: string; pct: number }[] = [
  { day: 7,  supplierId: "SUP-3", pct: 0.18 },
  { day: 14, supplierId: "SUP-1", pct: -0.12 },
  { day: 21, supplierId: "SUP-5", pct: 0.24 },
  { day: 28, supplierId: "SUP-7", pct: -0.15 },
];

// Supplier disruption events
const SUPPLIER_EVENTS: { supplierId: string; startDay: number; endDay: number; type: SupplierStatus }[] = [
  { supplierId: "SUP-2", startDay: 8,  endDay: 11, type: "outage"  },
  { supplierId: "SUP-4", startDay: 15, endDay: 17, type: "delayed" },
  { supplierId: "SUP-6", startDay: 22, endDay: 24, type: "delayed" },
];

// ─────────────────────────────────────────────
// WORLD INITIALIZATION
// ─────────────────────────────────────────────
function makeSuppliers(): Map<string, SimSupplier> {
  const suppliers = new Map<string, SimSupplier>();
  for (let i = 1; i <= NUM_SUPPLIERS; i++) {
    const id = `SUP-${i}`;
    suppliers.set(id, {
      id,
      name: `Supplier ${i}`,
      reliability: rng.normal(0.90, 0.05),
      status: "healthy",
      outageStartDay: -1,
      outageEndDay: -1,
      delayFactor: 1.0,
      baseUnitMultiplier: 1.0,
    });
  }
  return suppliers;
}

function makeSKU(
  idx: number,
  cat: SKUCategory,
  suppliers: Map<string, SimSupplier>
): SimSKU {
  const supIds = Array.from(suppliers.keys());
  const supplierId = rng.pick(supIds);
  const sup = suppliers.get(supplierId)!;

  const avgDemand = cat === "fast_mover"
    ? rng.normal(80, 20)
    : cat === "slow_mover"
    ? rng.normal(15, 5)
    : rng.normal(3, 1.5);

  const leadTime = rng.int(3, 14);
  const unitCost = rng.normal(45, 25);
  const moq = rng.pick([10, 25, 50, 100]);
  const packSize = rng.pick([5, 10, 25]);
  const safetyStock = Math.ceil(avgDemand * (leadTime / 7) * 0.5);
  const reorderPoint = Math.ceil(avgDemand * (leadTime / 7) + safetyStock);
  // Start with ~3 weeks of stock
  const startStock = Math.ceil(avgDemand * 21 + rng.normal(0, avgDemand * 3));

  const id = `SKU-${cat.slice(0, 2).toUpperCase()}-${String(idx).padStart(3, "0")}`;

  return {
    id,
    name: `${cat === "fast_mover" ? "Component" : cat === "slow_mover" ? "Assembly" : "Specialty"} ${idx}`,
    category: cat,
    supplierId,
    avgDemand: Math.max(0.5, avgDemand),
    leadTimeDays: leadTime,
    unitCost: Math.max(5, unitCost),
    moq,
    packSize,
    reorderPoint,
    safetyStock,
    onHand: Math.max(0, startStock),
    onOrder: [],
    demandHistory: [],
    fulfillmentHistory: [],
    stockoutDays: 0,
    backorderUnits: 0,
    backorderAccum: 0,
    dataQualityIssue: false,
    dataQualityDay: -1,
    isCritical: idx % 10 === 0, // every 10th SKU is "critical"
  };
}

function initWorld() {
  const suppliers = makeSuppliers();
  const skus: SimSKU[] = [];

  for (let i = 0; i < NUM_FAST_MOVERS; i++) skus.push(makeSKU(i + 1, "fast_mover", suppliers));
  for (let i = 0; i < NUM_SLOW_MOVERS; i++) skus.push(makeSKU(NUM_FAST_MOVERS + i + 1, "slow_mover", suppliers));
  for (let i = 0; i < NUM_INTERMITTENT; i++) skus.push(makeSKU(NUM_FAST_MOVERS + NUM_SLOW_MOVERS + i + 1, "intermittent", suppliers));

  return { skus, suppliers };
}

// ─────────────────────────────────────────────
// REGIME HELPERS
// ─────────────────────────────────────────────
function getRegime(day: number): { regime: RegimeType; fdr: number } {
  let current = REGIME_SCHEDULE[0];
  for (const r of REGIME_SCHEDULE) {
    if (day >= r.day) current = r;
  }
  // Add some noise to FDR
  const fdr = current.fdr + rng.normal(0, 0.1);
  return { regime: current.regime, fdr };
}

function regimeToOptimizer(regime: RegimeType): "HEALTHY_EXPANSION" | "MILD_CONTRACTION" | "STRESS" | "RECOVERY" {
  return regime as any;
}

// ─────────────────────────────────────────────
// DEMAND GENERATION
// ─────────────────────────────────────────────
function generateDailyDemand(sku: SimSKU, day: number, regime: RegimeType): number {
  const dayOfWeek = (day - 1) % 7;
  const weeklyFactor = WEEKDAY_FACTOR[dayOfWeek];

  // Regime demand multiplier
  const regimeMult = regime === "STRESS" ? 1.3
    : regime === "MILD_CONTRACTION" ? 0.85
    : regime === "RECOVERY" ? 1.05
    : 1.0;

  const lambda = sku.avgDemand * weeklyFactor * regimeMult;

  // Intermittent: 60% chance of zero demand
  if (sku.category === "intermittent" && rng.bool(0.6)) return 0;

  return sku.category === "fast_mover"
    ? Math.round(rng.normal(lambda, lambda * 0.15))
    : rng.poisson(lambda);
}

// ─────────────────────────────────────────────
// SIMULATION STATE
// ─────────────────────────────────────────────
const dailySnapshots: DailySnapshot[] = [];
const allActions: PendingAction[] = [];
let actionIdCounter = 1;

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function computeWorkingCapital(skus: SimSKU[]): number {
  return skus.reduce((sum, sku) => {
    const onOrderValue = sku.onOrder.reduce((s, o) => s + o.qty * sku.unitCost, 0);
    return sum + sku.onHand * sku.unitCost + onOrderValue;
  }, 0);
}

function computeDataQualityScore(skus: SimSKU[], day: number): number {
  const withIssues = skus.filter(s => s.dataQualityIssue).length;
  const staleCount = skus.filter(s =>
    s.dataQualityDay > 0 && (day - s.dataQualityDay) > 3
  ).length;
  const totalIssues = withIssues + staleCount;
  const pct = totalIssues / skus.length;
  return Math.max(0, 1 - pct * 3);
}

function getSupplierStatusOnDay(
  suppliers: Map<string, SimSupplier>,
  day: number
): void {
  // Reset all to healthy first
  for (const sup of suppliers.values()) {
    sup.status = "healthy";
    sup.delayFactor = 1.0;
  }
  // Apply scheduled events
  for (const ev of SUPPLIER_EVENTS) {
    if (day >= ev.startDay && day <= ev.endDay) {
      const sup = suppliers.get(ev.supplierId);
      if (sup) {
        sup.status = ev.type;
        sup.delayFactor = ev.type === "outage" ? Infinity : 2.0;
      }
    }
  }
  // Random ad-hoc delays (1% chance per supplier per day)
  for (const sup of suppliers.values()) {
    if (sup.status === "healthy" && rng.bool(0.01)) {
      sup.status = "delayed";
      sup.delayFactor = rng.normal(1.5, 0.3);
    }
  }
}

function applyPriceEvent(day: number, suppliers: Map<string, SimSupplier>, skus: SimSKU[]): { triggered: boolean; pct: number } {
  const ev = PRICE_EVENTS.find(e => e.day === day);
  if (!ev) return { triggered: false, pct: 0 };

  // Apply price change to all SKUs sourced from this supplier
  for (const sku of skus) {
    if (sku.supplierId === ev.supplierId) {
      sku.unitCost *= (1 + ev.pct);
    }
  }
  return { triggered: true, pct: ev.pct };
}

function injectDataQualityIssues(skus: SimSKU[], day: number): number {
  let count = 0;
  for (const sku of skus) {
    // 3% daily chance of a data quality issue per SKU
    if (!sku.dataQualityIssue && rng.bool(0.03)) {
      sku.dataQualityIssue = true;
      sku.dataQualityDay = day;
      count++;
    }
    // Issues resolve after 2 days naturally with 70% probability
    if (sku.dataQualityIssue && (day - sku.dataQualityDay) >= 2 && rng.bool(0.70)) {
      sku.dataQualityIssue = false;
    }
  }
  return count;
}

function runForecastingEngine(skus: SimSKU[], regime: RegimeType): Map<string, number[]> {
  const forecaster = new DemandForecaster();
  const forecasts = new Map<string, number[]>();

  for (const sku of skus) {
    if (sku.demandHistory.length < 5) continue;
    try {
      const result = forecaster.forecast(sku.demandHistory, 7);
      forecasts.set(sku.id, result);
    } catch {
      // Graceful: use naive fallback
      const avg = sku.demandHistory.slice(-7).reduce((a, b) => a + b, 0) / 7;
      forecasts.set(sku.id, Array(7).fill(avg));
    }
  }
  return forecasts;
}

function runOptimizationAndProposals(
  skus: SimSKU[],
  suppliers: Map<string, SimSupplier>,
  forecasts: Map<string, number[]>,
  regime: RegimeType,
  fdr: number,
  day: number,
  snapshot: DailySnapshot
): void {
  const regimeFDR = {
    "HEALTHY_EXPANSION": -1.2,
    "MILD_CONTRACTION": -0.3,
    "STRESS": 0.9,
    "RECOVERY": -0.6,
  }[regime] + rng.normal(0, 0.05);

  for (const sku of skus) {
    // Only optimize SKUs at or below reorder point
    const onHandPlusOnOrder = sku.onHand + sku.onOrder.reduce((s, o) => s + o.qty, 0);
    if (onHandPlusOnOrder > sku.reorderPoint) continue;

    const sup = suppliers.get(sku.supplierId)!;

    // Data quality gate: skip if severe issue
    if (sku.dataQualityIssue && (day - sku.dataQualityDay) > 3) continue;

    const forecastedDemand = forecasts.get(sku.id);
    const avgForecast = forecastedDemand
      ? forecastedDemand.reduce((a, b) => a + b, 0) / forecastedDemand.length
      : sku.avgDemand;

    let optimResult: any;
    let unsafe = false;

    try {
      optimResult = optimizeReorderQuantity(
        {
          regime: regimeFDR > 0.5 ? "STRESS" : regimeFDR < -0.5 ? "HEALTHY_EXPANSION" : "MILD_CONTRACTION" as any,
          fdr: regimeFDR,
          forecastUncertainty: regime === "STRESS" ? 0.35 : regime === "MILD_CONTRACTION" ? 0.2 : 0.1,
          currentOnHand: sku.onHand,
          avgDemand: avgForecast,
          leadTimeDays: Math.ceil(sku.leadTimeDays * sup.delayFactor),
          moq: sku.moq,
          packSize: sku.packSize,
          reorderPoint: sku.reorderPoint,
          safetyStock: sku.safetyStock,
          unitCost: sku.unitCost,
          budget: 250_000,
        },
        0.95,
        500,
        rng.int(1, 999)
      );
    } catch {
      continue;
    }

    const qty = optimResult.quantity;

    // ── Unsafe flag: ordering from a supplier in full outage ──
    if (sup.status === "outage") {
      snapshot.unsafeFlags.push(
        `[Day ${day}] Proposed PO for ${sku.id} from ${sup.id} (${sup.name}) which is in FULL OUTAGE — order would fail`
      );
      unsafe = true;
    }

    // ── Unsafe flag: ordering an extreme quantity ──
    const maxReasonable = sku.avgDemand * 60;
    if (qty > maxReasonable) {
      snapshot.unsafeFlags.push(
        `[Day ${day}] Extreme order quantity for ${sku.id}: ${qty} units (${(qty / sku.avgDemand).toFixed(0)}× daily demand)`
      );
    }

    // Build action
    const action: PendingAction = {
      id: `ACT-${String(actionIdCounter++).padStart(5, "0")}`,
      day,
      type: "purchase_order",
      skuId: sku.id,
      qty,
      supplierId: sku.supplierId,
      estimatedCost: qty * sku.unitCost,
      status: "draft",
      approvedDay: null,
    };
    allActions.push(action);
    snapshot.actionsProposed++;

    // Approval workflow: approve ~65% of actions (lower in STRESS regime)
    const approveRate = regime === "STRESS" ? 0.45 : regime === "MILD_CONTRACTION" ? 0.55 : 0.72;
    if (!unsafe && rng.bool(approveRate)) {
      action.status = "approved";
      action.approvedDay = day;
      snapshot.actionsApproved++;

      // Register incoming order (accounting for lead time + delay)
      const effectiveLeadTime = sup.status === "delayed"
        ? Math.ceil(sku.leadTimeDays * sup.delayFactor)
        : sku.leadTimeDays;

      sku.onOrder.push({ qty, arrivalDay: day + effectiveLeadTime });
    } else if (unsafe || rng.bool(0.15)) {
      action.status = "rejected";
      snapshot.actionsRejected++;
    }
    // Remaining stay as draft
    snapshot.optimizationRuns++;
  }
}

// ─────────────────────────────────────────────
// MAIN SIMULATION LOOP
// ─────────────────────────────────────────────
async function runSimulation() {
  const { skus, suppliers } = initWorld();

  // Pre-fill one week of demand history so forecasting works from day 1
  for (const sku of skus) {
    for (let d = -14; d < 0; d++) {
      const { regime } = getRegime(1);
      const demand = generateDailyDemand(sku, d, regime);
      sku.demandHistory.push(demand);
    }
  }

  const workingCapitalBaseline = computeWorkingCapital(skus);
  let consecutiveStockoutsBySkuId = new Map<string, number>();
  const globalUnsafeFlags: string[] = [];

  console.log("═".repeat(72));
  console.log("  30-DAY OPERATIONAL SIMULATION");
  console.log("  Prescient Labs — Manufacturing Intelligence Platform");
  console.log(`  100 SKUs | 8 Suppliers | ${SIM_DAYS} Days | Seeded RNG`);
  console.log("═".repeat(72));
  console.log();
  console.log(
    "  Day | Regime             | SL%   | Stkout | WC $M  | Proposed/Approved | DQ%"
  );
  console.log("  " + "─".repeat(82));

  for (let day = 1; day <= SIM_DAYS; day++) {
    const { regime, fdr } = getRegime(day);

    const snapshot: DailySnapshot = {
      day,
      regime,
      fdr,
      avgServiceLevel: 0,
      stockoutsToday: 0,
      newBackorderUnits: 0,
      workingCapital: 0,
      actionsProposed: 0,
      actionsApproved: 0,
      actionsRejected: 0,
      supplierOutages: [],
      priceEvent: false,
      priceChangePct: 0,
      dataQualityIssues: 0,
      dataQualityScore: 1.0,
      forecastRun: false,
      optimizationRuns: 0,
      unsafeFlags: [],
    };

    // ── 1. Update supplier statuses ──
    getSupplierStatusOnDay(suppliers, day);
    for (const sup of suppliers.values()) {
      if (sup.status === "outage") snapshot.supplierOutages.push(sup.name);
    }

    // ── 2. Price events ──
    const priceEv = applyPriceEvent(day, suppliers, skus);
    snapshot.priceEvent = priceEv.triggered;
    snapshot.priceChangePct = priceEv.pct;

    // ── 3. Receive incoming POs ──
    for (const sku of skus) {
      const arriving: typeof sku.onOrder = [];
      const remaining: typeof sku.onOrder = [];
      for (const order of sku.onOrder) {
        if (order.arrivalDay <= day) {
          arriving.push(order);
        } else {
          remaining.push(order);
        }
      }
      for (const arr of arriving) {
        sku.onHand += arr.qty;
      }
      sku.onOrder = remaining;
    }

    // ── 4. Inject data quality issues ──
    const dqIssues = injectDataQualityIssues(skus, day);
    snapshot.dataQualityIssues = dqIssues;
    snapshot.dataQualityScore = computeDataQualityScore(skus, day);

    // ── 5. Generate & fulfill demand ──
    let totalDemand = 0;
    let totalFulfilled = 0;

    for (const sku of skus) {
      let demand = generateDailyDemand(sku, day, regime);
      demand = Math.max(0, Math.round(demand));
      sku.demandHistory.push(demand);
      if (sku.demandHistory.length > 60) sku.demandHistory.shift();

      totalDemand += demand;

      const fulfilled = Math.min(sku.onHand, demand);
      sku.onHand -= fulfilled;
      totalFulfilled += fulfilled;

      const shortfall = demand - fulfilled;
      if (shortfall > 0) {
        sku.stockoutDays++;
        sku.backorderUnits += shortfall;
        sku.backorderAccum += shortfall;
        snapshot.stockoutsToday++;
        snapshot.newBackorderUnits += shortfall;

        sku.fulfillmentHistory.push(false);

        // Track consecutive stockouts on critical SKUs
        const prev = consecutiveStockoutsBySkuId.get(sku.id) ?? 0;
        consecutiveStockoutsBySkuId.set(sku.id, prev + 1);

        // Unsafe: critical SKU stockout for 3+ consecutive days
        if (sku.isCritical) {
          const consec = consecutiveStockoutsBySkuId.get(sku.id)!;
          if (consec >= 3) {
            const flag = `[Day ${day}] CRITICAL SKU ${sku.id} has been in stockout for ${consec} consecutive days`;
            if (!globalUnsafeFlags.includes(flag)) {
              globalUnsafeFlags.push(flag);
              snapshot.unsafeFlags.push(flag);
            }
          }
        }
      } else {
        sku.fulfillmentHistory.push(true);
        consecutiveStockoutsBySkuId.set(sku.id, 0);
      }
    }

    snapshot.avgServiceLevel = totalDemand > 0
      ? totalFulfilled / totalDemand
      : 1.0;

    // ── 6. Run forecasting (every 7 days + day 1 & 2) ──
    const shouldForecast = day <= 2 || day % 7 === 0;
    let forecasts: Map<string, number[]> = new Map();
    if (shouldForecast) {
      forecasts = runForecastingEngine(skus, regime);
      snapshot.forecastRun = true;
    } else {
      // Use naive forecast (last 7-day average)
      for (const sku of skus) {
        const recent = sku.demandHistory.slice(-7);
        const avg = recent.length > 0 ? recent.reduce((a, b) => a + b, 0) / recent.length : sku.avgDemand;
        forecasts.set(sku.id, Array(7).fill(avg));
      }
    }

    // ── 7. Optimization + proposal generation ──
    runOptimizationAndProposals(skus, suppliers, forecasts, regime, fdr, day, snapshot);

    // ── 8. Compute working capital ──
    snapshot.workingCapital = computeWorkingCapital(skus);

    // Unsafe: working capital > 2× baseline
    if (snapshot.workingCapital > workingCapitalBaseline * 2.0) {
      snapshot.unsafeFlags.push(
        `[Day ${day}] Working capital ($${(snapshot.workingCapital / 1e6).toFixed(2)}M) exceeds 2× baseline ($${(workingCapitalBaseline / 1e6).toFixed(2)}M) — potential over-procurement`
      );
    }

    dailySnapshots.push(snapshot);
    globalUnsafeFlags.push(...snapshot.unsafeFlags);

    // ── Progress line ──
    const regimeLabel = regime.padEnd(18);
    const sl = (snapshot.avgServiceLevel * 100).toFixed(1).padStart(5);
    const st = String(snapshot.stockoutsToday).padStart(6);
    const wc = (snapshot.workingCapital / 1e6).toFixed(2).padStart(6);
    const prop = String(snapshot.actionsProposed).padStart(3);
    const appr = String(snapshot.actionsApproved).padStart(3);
    const dq = (snapshot.dataQualityScore * 100).toFixed(0).padStart(3);
    const flags = snapshot.unsafeFlags.length > 0 ? " ⚠" : "";
    const priceTag = snapshot.priceEvent ? " [PRICE]" : "";
    const outageTag = snapshot.supplierOutages.length > 0 ? ` [OUTAGE:${snapshot.supplierOutages.join(",")}]` : "";

    console.log(
      `  ${String(day).padStart(3)} | ${regimeLabel} | ${sl}% | ${st} | ${wc}M | ${prop}/${appr}            | ${dq}%${flags}${priceTag}${outageTag}`
    );
  }

  return { skus, suppliers, workingCapitalBaseline, globalUnsafeFlags };
}

// ─────────────────────────────────────────────
// ANALYSIS & REPORT
// ─────────────────────────────────────────────
function computeReport(
  skus: SimSKU[],
  workingCapitalBaseline: number,
  globalUnsafeFlags: string[]
): object {
  const totalActions = allActions.length;
  const approved = allActions.filter(a => a.status === "approved").length;
  const rejected = allActions.filter(a => a.status === "rejected").length;
  const draft = allActions.filter(a => a.status === "draft").length;
  const approvalRate = totalActions > 0 ? approved / totalActions : 0;

  // Service level per period
  const wk1 = dailySnapshots.filter(d => d.day <= 7);
  const wk2 = dailySnapshots.filter(d => d.day >= 8 && d.day <= 14);
  const wk3 = dailySnapshots.filter(d => d.day >= 15 && d.day <= 21);
  const wk4 = dailySnapshots.filter(d => d.day >= 22);

  const avgSL = (snaps: DailySnapshot[]) =>
    snaps.length > 0
      ? snaps.reduce((s, d) => s + d.avgServiceLevel, 0) / snaps.length
      : 0;

  const slByWeek = [avgSL(wk1), avgSL(wk2), avgSL(wk3), avgSL(wk4)];

  // Total stockouts and backlogs
  const totalStockouts = dailySnapshots.reduce((s, d) => s + d.stockoutsToday, 0);
  const totalBackorderUnits = skus.reduce((s, sku) => s + sku.backorderAccum, 0);
  const stockoutsPerDay = totalStockouts / SIM_DAYS;

  // SKU-level analysis
  const criticalSkus = skus.filter(s => s.isCritical);
  const criticalStockoutDays = criticalSkus.reduce((s, sku) => s + sku.stockoutDays, 0);
  const worstSkus = [...skus]
    .sort((a, b) => b.stockoutDays - a.stockoutDays)
    .slice(0, 5);

  // Working capital trend
  const wcStart = dailySnapshots[0]?.workingCapital ?? workingCapitalBaseline;
  const wcEnd = dailySnapshots[SIM_DAYS - 1]?.workingCapital ?? workingCapitalBaseline;
  const wcPeak = Math.max(...dailySnapshots.map(d => d.workingCapital));
  const wcTrough = Math.min(...dailySnapshots.map(d => d.workingCapital));

  // Data quality
  const avgDQ = dailySnapshots.reduce((s, d) => s + d.dataQualityScore, 0) / SIM_DAYS;
  const dqDips = dailySnapshots.filter(d => d.dataQualityScore < 0.8).length;

  // Automation efficiency
  const automationByRegime: Record<string, { proposed: number; approved: number }> = {};
  for (const snap of dailySnapshots) {
    if (!automationByRegime[snap.regime]) {
      automationByRegime[snap.regime] = { proposed: 0, approved: 0 };
    }
    automationByRegime[snap.regime].proposed += snap.actionsProposed;
    automationByRegime[snap.regime].approved += snap.actionsApproved;
  }

  // Unique unsafe flags
  const uniqueFlags = [...new Set(globalUnsafeFlags)];

  return {
    simulation: {
      days: SIM_DAYS,
      skuCount: skus.length,
      supplierCount: NUM_SUPPLIERS,
      replayHash: createHash("sha256")
        .update(`SIM-v1.0-SEED-DEADBEEF-${SIM_DAYS}-${skus.length}`)
        .digest("hex").slice(0, 16),
    },
    serviceLevelTrends: {
      week1: { regime: "HEALTHY_EXPANSION", serviceLevelPct: +(slByWeek[0] * 100).toFixed(2) },
      week2: { regime: "MILD_CONTRACTION",  serviceLevelPct: +(slByWeek[1] * 100).toFixed(2) },
      week3: { regime: "STRESS",            serviceLevelPct: +(slByWeek[2] * 100).toFixed(2) },
      week4: { regime: "RECOVERY",          serviceLevelPct: +(slByWeek[3] * 100).toFixed(2) },
      overall30DayAvg: +((slByWeek.reduce((a, b) => a + b, 0) / 4) * 100).toFixed(2),
    },
    stockoutAnalysis: {
      totalStockoutSkuDays: totalStockouts,
      stockoutsPerDay: +stockoutsPerDay.toFixed(1),
      totalBackorderUnits: Math.round(totalBackorderUnits),
      criticalSkuStockoutDays: criticalStockoutDays,
      worstPerformingSkus: worstSkus.map(s => ({
        id: s.id,
        category: s.category,
        stockoutDays: s.stockoutDays,
        backorderUnits: Math.round(s.backorderAccum),
        isCritical: s.isCritical,
      })),
    },
    workingCapital: {
      baselineMillion: +(workingCapitalBaseline / 1e6).toFixed(2),
      startMillion: +(wcStart / 1e6).toFixed(2),
      endMillion: +(wcEnd / 1e6).toFixed(2),
      peakMillion: +(wcPeak / 1e6).toFixed(2),
      troughMillion: +(wcTrough / 1e6).toFixed(2),
      peakVsBaselinePct: +((wcPeak / workingCapitalBaseline - 1) * 100).toFixed(1),
      endVsBaselinePct: +((wcEnd / workingCapitalBaseline - 1) * 100).toFixed(1),
    },
    automationActions: {
      totalProposed: totalActions,
      totalApproved: approved,
      totalRejected: rejected,
      pendingDraft: draft,
      approvalRatePct: +(approvalRate * 100).toFixed(1),
      byRegime: automationByRegime,
      avgDailyProposals: +(totalActions / SIM_DAYS).toFixed(1),
    },
    dataQuality: {
      averageScorePct: +(avgDQ * 100).toFixed(1),
      daysBelow80Pct: dqDips,
      totalIssueEvents: dailySnapshots.reduce((s, d) => s + d.dataQualityIssues, 0),
    },
    supplierDisruptions: {
      scheduledOutages: SUPPLIER_EVENTS.filter(e => e.type === "outage").map(e => ({
        supplier: e.supplierId,
        days: `${e.startDay}–${e.endDay}`,
        duration: e.endDay - e.startDay + 1,
      })),
      scheduledDelays: SUPPLIER_EVENTS.filter(e => e.type === "delayed").map(e => ({
        supplier: e.supplierId,
        days: `${e.startDay}–${e.endDay}`,
      })),
      priceVolatilityEvents: PRICE_EVENTS.map(e => ({
        day: e.day,
        supplier: e.supplierId,
        changePct: +(e.pct * 100).toFixed(0),
      })),
    },
    safetyAnalysis: {
      totalUnsafeFlags: uniqueFlags.length,
      flags: uniqueFlags,
    },
    dailySnapshots: dailySnapshots.map(d => ({
      day: d.day,
      regime: d.regime,
      serviceLevelPct: +(d.avgServiceLevel * 100).toFixed(2),
      stockouts: d.stockoutsToday,
      backorderUnits: d.newBackorderUnits,
      workingCapitalMillion: +(d.workingCapital / 1e6).toFixed(2),
      actionsProposed: d.actionsProposed,
      actionsApproved: d.actionsApproved,
      dataQualityScorePct: +(d.dataQualityScore * 100).toFixed(1),
      priceEvent: d.priceEvent,
      supplierOutages: d.supplierOutages,
      unsafeFlags: d.unsafeFlags.length,
    })),
  };
}

function printFinalReport(report: any, skus: SimSKU[], globalUnsafeFlags: string[]) {
  const r = report;
  console.log();
  console.log("═".repeat(72));
  console.log("  30-DAY SIMULATION — FINAL ANALYSIS REPORT");
  console.log("═".repeat(72));

  console.log("\n── SERVICE LEVEL TRENDS ──────────────────────────────────────────────");
  console.log(`  Week 1 (HEALTHY_EXPANSION): ${r.serviceLevelTrends.week1.serviceLevelPct}%`);
  console.log(`  Week 2 (MILD_CONTRACTION):  ${r.serviceLevelTrends.week2.serviceLevelPct}%`);
  console.log(`  Week 3 (STRESS):            ${r.serviceLevelTrends.week3.serviceLevelPct}%`);
  console.log(`  Week 4 (RECOVERY):          ${r.serviceLevelTrends.week4.serviceLevelPct}%`);
  console.log(`  30-Day Average:             ${r.serviceLevelTrends.overall30DayAvg}%`);

  console.log("\n── STOCKOUT & BACKORDER ANALYSIS ─────────────────────────────────────");
  console.log(`  Total stockout SKU-days:    ${r.stockoutAnalysis.totalStockoutSkuDays}`);
  console.log(`  Stockouts per day (avg):    ${r.stockoutAnalysis.stockoutsPerDay}`);
  console.log(`  Total backorder units:      ${r.stockoutAnalysis.totalBackorderUnits.toLocaleString()}`);
  console.log(`  Critical SKU stockout-days: ${r.stockoutAnalysis.criticalSkuStockoutDays}`);
  console.log(`  Worst-performing SKUs:`);
  for (const s of r.stockoutAnalysis.worstPerformingSkus) {
    const crit = s.isCritical ? " [CRITICAL]" : "";
    console.log(`    ${s.id} (${s.category}) — ${s.stockoutDays} stockout days, ${s.backorderUnits} units backordered${crit}`);
  }

  console.log("\n── WORKING CAPITAL USAGE ─────────────────────────────────────────────");
  console.log(`  Baseline:   $${r.workingCapital.baselineMillion}M`);
  console.log(`  Day 1:      $${r.workingCapital.startMillion}M`);
  console.log(`  Day 30:     $${r.workingCapital.endMillion}M  (${r.workingCapital.endVsBaselinePct > 0 ? "+" : ""}${r.workingCapital.endVsBaselinePct}% vs baseline)`);
  console.log(`  Peak:       $${r.workingCapital.peakMillion}M  (+${r.workingCapital.peakVsBaselinePct}% vs baseline)`);
  console.log(`  Trough:     $${r.workingCapital.troughMillion}M`);

  console.log("\n── AUTOMATION ACTIONS ────────────────────────────────────────────────");
  console.log(`  Total proposed:     ${r.automationActions.totalProposed}`);
  console.log(`  Approved:           ${r.automationActions.totalApproved} (${r.automationActions.approvalRatePct}%)`);
  console.log(`  Rejected:           ${r.automationActions.totalRejected}`);
  console.log(`  Pending (draft):    ${r.automationActions.pendingDraft}`);
  console.log(`  Avg daily proposals:${r.automationActions.avgDailyProposals}`);
  console.log(`  By regime:`);
  for (const [regime, stats] of Object.entries(r.automationActions.byRegime) as any) {
    const rate = stats.proposed > 0 ? ((stats.approved / stats.proposed) * 100).toFixed(0) : "0";
    console.log(`    ${regime.padEnd(22)} proposed=${stats.proposed}, approved=${stats.approved} (${rate}%)`);
  }

  console.log("\n── DATA QUALITY ──────────────────────────────────────────────────────");
  console.log(`  Average score:        ${r.dataQuality.averageScorePct}%`);
  console.log(`  Days below 80%:       ${r.dataQuality.daysBelow80Pct}`);
  console.log(`  Total issue events:   ${r.dataQuality.totalIssueEvents}`);

  console.log("\n── SUPPLIER DISRUPTIONS ──────────────────────────────────────────────");
  for (const ot of r.supplierDisruptions.scheduledOutages) {
    console.log(`  OUTAGE: ${ot.supplier} — days ${ot.days} (${ot.duration} days)`);
  }
  for (const dl of r.supplierDisruptions.scheduledDelays) {
    console.log(`  DELAY:  ${dl.supplier} — days ${dl.days}`);
  }
  for (const pv of r.supplierDisruptions.priceVolatilityEvents) {
    const dir = pv.changePct > 0 ? "+" : "";
    console.log(`  PRICE:  Day ${pv.day} — ${pv.supplier} ${dir}${pv.changePct}%`);
  }

  console.log("\n── SAFETY ANALYSIS ───────────────────────────────────────────────────");
  if (r.safetyAnalysis.totalUnsafeFlags === 0) {
    console.log("  No unsafe behaviors detected.");
  } else {
    console.log(`  Total unsafe flags: ${r.safetyAnalysis.totalUnsafeFlags}`);
    for (const f of r.safetyAnalysis.flags) {
      console.log(`  ⚠  ${f}`);
    }
  }

  // ── TRUST ASSESSMENT ──
  const sl30 = r.serviceLevelTrends.overall30DayAvg;
  const critStockouts = r.stockoutAnalysis.criticalSkuStockoutDays;
  const wcExcess = r.workingCapital.peakVsBaselinePct;
  const approvalRate = r.automationActions.approvalRatePct;
  const flags = r.safetyAnalysis.totalUnsafeFlags;
  const dqAvg = r.dataQuality.averageScorePct;

  const trustScore = computeTrustScore(sl30, critStockouts, wcExcess, approvalRate, flags, dqAvg);

  console.log("\n── TRUST ASSESSMENT ──────────────────────────────────────────────────");
  console.log(`  Composite Trust Score: ${trustScore.score}/100`);
  console.log(`  Verdict: ${trustScore.verdict}`);
  console.log();
  for (const line of trustScore.evidence) {
    console.log(`  ${line}`);
  }

  console.log("\n  CONCLUSION:");
  for (const line of trustScore.conclusion) {
    console.log(`  ${line}`);
  }

  console.log();
  console.log("═".repeat(72));
}

function computeTrustScore(
  sl30: number,
  critStockouts: number,
  wcExcess: number,
  approvalRate: number,
  flags: number,
  dqAvg: number
): { score: number; verdict: string; evidence: string[]; conclusion: string[] } {
  let score = 100;
  const evidence: string[] = [];
  const penaltyNotes: string[] = [];

  // Service level
  if (sl30 >= 97) {
    evidence.push(`[+] Service level ${sl30}% — excellent, exceeds 97% target`);
  } else if (sl30 >= 94) {
    evidence.push(`[+] Service level ${sl30}% — good, meets industry standard (~95%)`);
    score -= 3;
  } else if (sl30 >= 90) {
    evidence.push(`[~] Service level ${sl30}% — acceptable but below 94% threshold`);
    score -= 10;
    penaltyNotes.push("Service level degradation requires attention");
  } else {
    evidence.push(`[-] Service level ${sl30}% — critical underperformance`);
    score -= 25;
    penaltyNotes.push("Service level crisis — system cannot be trusted for full autonomous operation");
  }

  // Critical SKU stockouts
  if (critStockouts === 0) {
    evidence.push(`[+] Zero critical SKU stockout-days — high-priority items protected`);
  } else if (critStockouts <= 3) {
    evidence.push(`[~] ${critStockouts} critical SKU stockout-days — minor exposure`);
    score -= 5;
  } else {
    evidence.push(`[-] ${critStockouts} critical SKU stockout-days — unacceptable for a mid-market manufacturer`);
    score -= 15;
    penaltyNotes.push("Critical SKU exposure: operations team would notice and lose confidence");
  }

  // Working capital
  if (wcExcess <= 15) {
    evidence.push(`[+] Working capital peak +${wcExcess}% vs baseline — efficient procurement`);
  } else if (wcExcess <= 35) {
    evidence.push(`[~] Working capital peak +${wcExcess}% vs baseline — moderate buffer build`);
    score -= 5;
  } else {
    evidence.push(`[-] Working capital peak +${wcExcess}% vs baseline — possible over-procurement`);
    score -= 12;
    penaltyNotes.push("Finance team would flag elevated working capital tied to automated ordering");
  }

  // Approval rate
  if (approvalRate >= 55 && approvalRate <= 80) {
    evidence.push(`[+] Approval rate ${approvalRate}% — healthy balance of automation and human oversight`);
  } else if (approvalRate > 80) {
    evidence.push(`[~] Approval rate ${approvalRate}% — very high; verify approvals aren't rubber-stamped`);
    score -= 3;
  } else {
    evidence.push(`[~] Approval rate ${approvalRate}% — conservative; teams may be overriding system`);
    score -= 5;
    penaltyNotes.push("Low approval rate suggests team distrust or overly conservative risk posture");
  }

  // Unsafe flags
  if (flags === 0) {
    evidence.push(`[+] Zero safety flags — no harmful decision patterns detected`);
  } else if (flags <= 3) {
    evidence.push(`[~] ${flags} safety flags — edge cases detected, all recoverable`);
    score -= 8;
    penaltyNotes.push("Safety flags require process review before full autonomy");
  } else {
    evidence.push(`[-] ${flags} safety flags — system exhibiting patterns that would harm real operations`);
    score -= 20;
    penaltyNotes.push("Multiple safety flags: NOT safe for autonomous operation without guardrails");
  }

  // Data quality
  if (dqAvg >= 90) {
    evidence.push(`[+] Average data quality ${dqAvg}% — system maintaining data integrity`);
  } else if (dqAvg >= 80) {
    evidence.push(`[~] Average data quality ${dqAvg}% — acceptable but watch for degradation`);
    score -= 4;
  } else {
    evidence.push(`[-] Average data quality ${dqAvg}% — data issues are impacting decision quality`);
    score -= 10;
    penaltyNotes.push("Data quality below threshold compromises forecast and optimization accuracy");
  }

  score = Math.max(0, Math.min(100, score));

  const verdict =
    score >= 90 ? "TRUSTED — ready for supervised pilot with live operations team"
    : score >= 75 ? "CONDITIONALLY TRUSTED — deploy with human-in-the-loop for flagged scenarios"
    : score >= 60 ? "CAUTION — requires process fixes before broader rollout"
    : "NOT TRUSTED — significant issues must be resolved before any production use";

  const conclusion: string[] = [];
  if (score >= 90) {
    conclusion.push("After 30 days of simulated operations — including a STRESS regime (week 3),");
    conclusion.push("two supplier outages, four price volatility events, and continuous data quality");
    conclusion.push("noise — the system maintained strong service levels, kept working capital in");
    conclusion.push("bounds, and proposed sensible actions with a healthy approval rate.");
    conclusion.push("");
    conclusion.push("A real operations team would develop trust in this system over 30 days.");
    conclusion.push("The recommendation is supervised pilot deployment, with human approval");
    conclusion.push("required for high-value POs and all STRESS-regime actions.");
  } else if (score >= 75) {
    conclusion.push("The system performed acceptably across most conditions but showed weakness");
    conclusion.push("in specific scenarios. A real operations team would use it as a decision");
    conclusion.push("support tool while maintaining manual overrides for flagged situations.");
    conclusion.push("");
    for (const note of penaltyNotes) {
      conclusion.push(`• ${note}`);
    }
  } else {
    conclusion.push("Significant issues were detected that would undermine operational trust.");
    conclusion.push("The system requires remediation before pilot deployment.");
    conclusion.push("");
    for (const note of penaltyNotes) {
      conclusion.push(`• ${note}`);
    }
  }

  return { score, verdict, evidence, conclusion };
}

// ─────────────────────────────────────────────
// STRESS TEST INTEGRATION (real module)
// ─────────────────────────────────────────────
async function runStressTestIntegration() {
  console.log("\n── STRESS TEST INTEGRATION (Week 3 scenario replay) ──────────────────");
  const stressConfig = {
    seed: 42,
    historicDemand: [210, 225, 240, 220, 250, 230, 218, 260, 275, 280, 265, 290],
    baselineServiceLevel: 0.95,
    scenarios: [
      { type: "demand_spike" as const, severity: "severe" as const },
      { type: "supplier_outage" as const, severity: "extreme" as const },
      { type: "price_shock" as const, severity: "severe" as const },
      { type: "compound" as const, severity: "extreme" as const },
    ],
  };
  try {
    const stressReport = runStressTest(stressConfig);
    const sr = stressReport.scenarioResults;
    for (const s of sr) {
      const dg = s.automationDowngrade.downgradeSeverity;
      const sl = s.optimizationStability.stressedServiceLevel;
      const cvard = s.cvarDelta.tailRiskAmplification;
      console.log(
        `  ${s.type.padEnd(18)} severity=${s.severity.padEnd(8)} ` +
        `SL=${(sl * 100).toFixed(1)}% downgrade=${dg.padEnd(18)} cvar_amp=${cvard.toFixed(2)}×`
      );
    }
    const agg = stressReport.aggregateSummary;
    console.log(`  Aggregate: ${agg.scenariosPassed}/${sr.length} passed, ` +
      `max_SL_drop=${(agg.maxServiceLevelDegradation * 100).toFixed(1)}%`);
  } catch (e: any) {
    console.log(`  [WARN] Stress test integration failed: ${e.message}`);
  }
}

// ─────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────
async function main() {
  const { skus, suppliers, workingCapitalBaseline, globalUnsafeFlags } = await runSimulation();

  await runStressTestIntegration();

  const report = computeReport(skus, workingCapitalBaseline, globalUnsafeFlags);
  printFinalReport(report, skus, globalUnsafeFlags);

  // Write artifacts
  const artifactPath = path.join(__dirname, "thirty-day-sim-artifact.json");
  const reportPath = path.join(__dirname, "../../THIRTY_DAY_SIM_REPORT.md");

  fs.writeFileSync(artifactPath, JSON.stringify(report, null, 2));

  // Write markdown report
  const md = generateMarkdownReport(report as any);
  fs.writeFileSync(reportPath, md);

  console.log(`\n  Artifact: ${artifactPath}`);
  console.log(`  Report:   ${reportPath}`);
}

function generateMarkdownReport(r: any): string {
  const lines: string[] = [];
  lines.push("# 30-Day Operational Simulation Report");
  lines.push("**Prescient Labs Manufacturing Intelligence Platform**\n");
  lines.push(`Simulation: ${r.simulation.days} days | ${r.simulation.skuCount} SKUs | ${r.simulation.supplierCount} suppliers`);
  lines.push(`Replay Hash: \`${r.simulation.replayHash}\`\n`);

  lines.push("## Service Level Trends\n");
  lines.push("| Week | Regime | Service Level |");
  lines.push("|------|--------|--------------|");
  lines.push(`| 1 | HEALTHY_EXPANSION | ${r.serviceLevelTrends.week1.serviceLevelPct}% |`);
  lines.push(`| 2 | MILD_CONTRACTION  | ${r.serviceLevelTrends.week2.serviceLevelPct}% |`);
  lines.push(`| 3 | STRESS            | ${r.serviceLevelTrends.week3.serviceLevelPct}% |`);
  lines.push(`| 4 | RECOVERY          | ${r.serviceLevelTrends.week4.serviceLevelPct}% |`);
  lines.push(`| **30-Day Avg** | — | **${r.serviceLevelTrends.overall30DayAvg}%** |`);

  lines.push("\n## Stockout & Backorder Analysis\n");
  lines.push(`- Total stockout SKU-days: **${r.stockoutAnalysis.totalStockoutSkuDays}**`);
  lines.push(`- Avg stockouts per day: **${r.stockoutAnalysis.stockoutsPerDay}**`);
  lines.push(`- Total backorder units: **${r.stockoutAnalysis.totalBackorderUnits.toLocaleString()}**`);
  lines.push(`- Critical SKU stockout-days: **${r.stockoutAnalysis.criticalSkuStockoutDays}**`);

  lines.push("\n## Working Capital\n");
  lines.push(`- Baseline: $${r.workingCapital.baselineMillion}M`);
  lines.push(`- Peak: $${r.workingCapital.peakMillion}M (+${r.workingCapital.peakVsBaselinePct}%)`);
  lines.push(`- Day 30: $${r.workingCapital.endMillion}M (${r.workingCapital.endVsBaselinePct > 0 ? "+" : ""}${r.workingCapital.endVsBaselinePct}%)`);

  lines.push("\n## Automation Actions\n");
  lines.push(`- Proposed: **${r.automationActions.totalProposed}**`);
  lines.push(`- Approved: **${r.automationActions.totalApproved}** (${r.automationActions.approvalRatePct}%)`);
  lines.push(`- Rejected: **${r.automationActions.totalRejected}**`);

  lines.push("\n## Safety Flags\n");
  if (r.safetyAnalysis.flags.length === 0) {
    lines.push("_None detected._");
  } else {
    for (const f of r.safetyAnalysis.flags) {
      lines.push(`- ⚠️ ${f}`);
    }
  }

  lines.push("\n## Daily Snapshot\n");
  lines.push("| Day | Regime | SL% | Stockouts | WC $M | Proposed | Approved | DQ% |");
  lines.push("|-----|--------|-----|-----------|-------|----------|----------|-----|");
  for (const d of r.dailySnapshots) {
    lines.push(`| ${d.day} | ${d.regime} | ${d.serviceLevelPct} | ${d.stockouts} | ${d.workingCapitalMillion} | ${d.actionsProposed} | ${d.actionsApproved} | ${d.dataQualityScorePct} |`);
  }

  return lines.join("\n");
}

main().catch(err => {
  console.error("[FATAL]", err);
  process.exit(1);
});
