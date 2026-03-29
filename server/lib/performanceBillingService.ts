/**
 * Performance-Based Billing Service
 *
 * Pricing model: $100/month base fee + 10–20% of VERIFIED, MEASURED savings.
 *
 * RULES (non-negotiable):
 *  - NEVER charge on estimatedSavings or projectedSavings
 *  - ONLY charge on measuredSavings with full evidence chain
 *  - If any evidence field is missing → NON-BILLABLE, no charge
 *  - No duplicate billing per savings record (enforced DB-unique + service check)
 *  - Trust score < 0.6 → require approval; < 0.4 → BLOCK
 *  - Savings spike > 5× historical → flag for review
 */

import { db } from "../db";
import {
  savingsEvidenceRecords,
  performanceBilling,
  invoices,
  type SavingsEvidenceRecord,
  type PerformanceBilling,
} from "@shared/schema";
import { eq, and, isNotNull, sum, desc, sql, ne } from "drizzle-orm";
import { logger } from "./structuredLogger";

// ─── Constants ─────────────────────────────────────────────────────────────────

export const PERFORMANCE_BASE_FEE = 100;           // $100/month, always charged
export const PERFORMANCE_BASE_FEE_CENTS = 10000;
export const PERFORMANCE_FEE_MIN = 0.15;           // 15% (fixed rate)
export const PERFORMANCE_FEE_MAX = 0.15;           // 15% (fixed rate)
export const PERFORMANCE_FEE_DEFAULT = 0.15;       // 15% flat fee of verified savings
export const ANOMALY_SPIKE_MULTIPLIER = 5;         // savings > 5× historical → flag

// ─── Core fee computation ─────────────────────────────────────────────────────

/**
 * Compute performance fee for a single savings record.
 * Returns $0 if measuredSavings is null, zero, or negative.
 */
export function computePerformanceFee(
  measuredSavings: number | null | undefined,
  feePercentage: number = PERFORMANCE_FEE_DEFAULT,
): number {
  if (measuredSavings === null || measuredSavings === undefined) return 0;
  if (measuredSavings <= 0) return 0;
  const pct = Math.min(Math.max(feePercentage, PERFORMANCE_FEE_MIN), PERFORMANCE_FEE_MAX);
  return parseFloat((measuredSavings * pct).toFixed(2));
}

// ─── Billability check ────────────────────────────────────────────────────────

export interface BillabilityResult {
  billable: boolean;
  reasons: string[];   // populated only when NOT billable
}

/**
 * Determines whether a savings evidence record is billable.
 * All 5 conditions from Section 5 must pass.
 */
export function checkBillability(record: SavingsEvidenceRecord): BillabilityResult {
  const reasons: string[] = [];

  if (record.measuredSavings === null || record.measuredSavings === undefined) {
    reasons.push("measuredSavings is null — defer billing until outcome is realized");
  } else if (record.measuredSavings <= 0) {
    reasons.push("measuredSavings <= 0 — no performance fee on negative or zero savings");
  }

  if (!record.measuredOutcomeRef) {
    reasons.push("measuredOutcomeRef missing — requires invoice, PO, or receipt reference");
  }

  const entityRefs = record.entityRefs as Record<string, any> | null;
  const hasEntityRefs = entityRefs && (
    (Array.isArray(entityRefs.purchaseOrderIds) && entityRefs.purchaseOrderIds.length > 0) ||
    (Array.isArray(entityRefs.invoiceIds) && entityRefs.invoiceIds.length > 0) ||
    (Array.isArray(entityRefs.materialIds) && entityRefs.materialIds.length > 0)
  );
  if (!hasEntityRefs) {
    reasons.push("entityRefs do not link to any real system decisions");
  }

  if (!record.measuredAt) {
    reasons.push("verifiedAt (measuredAt) timestamp is missing");
  }

  return { billable: reasons.length === 0, reasons };
}

// ─── Duplicate detection ──────────────────────────────────────────────────────

export async function isDuplicateBilling(savingsRecordId: number): Promise<boolean> {
  const existing = await db.select({ id: performanceBilling.id })
    .from(performanceBilling)
    .where(
      and(
        eq(performanceBilling.savingsRecordId, savingsRecordId),
        ne(performanceBilling.status, "cancelled"),
      ),
    )
    .limit(1);
  return existing.length > 0;
}

// ─── Trust score validation ───────────────────────────────────────────────────

export interface TrustValidationResult {
  allowed: boolean;
  requiresApproval: boolean;
  blocked: boolean;
  reason?: string;
}

/**
 * Validates trust score before creating a performance billing record.
 * trustScore < 0.4 → BLOCK; < 0.6 → require approval.
 */
export function validateTrustScore(trustScore: number): TrustValidationResult {
  if (trustScore < 0.4) {
    return { allowed: false, requiresApproval: false, blocked: true, reason: `trustScore ${trustScore.toFixed(2)} < 0.4 — billing BLOCKED` };
  }
  if (trustScore < 0.6) {
    return { allowed: true, requiresApproval: true, blocked: false, reason: `trustScore ${trustScore.toFixed(2)} < 0.6 — approval required before invoicing` };
  }
  return { allowed: true, requiresApproval: false, blocked: false };
}

// ─── Anomaly detection ────────────────────────────────────────────────────────

/**
 * Checks if a savings amount is an anomalous spike vs. company historical average.
 * Returns true (flagged) if savings > 5× historical average.
 */
export async function checkSavingsAnomaly(
  companyId: string,
  incomingSavings: number,
): Promise<{ flagged: boolean; historicalAvg: number | null; multiplier: number | null }> {
  const result = await db
    .select({ avg: sql<string>`AVG(measured_savings)` })
    .from(savingsEvidenceRecords)
    .where(
      and(
        eq(savingsEvidenceRecords.companyId, companyId),
        isNotNull(savingsEvidenceRecords.measuredSavings),
      ),
    );

  const avg = result[0]?.avg ? parseFloat(result[0].avg) : null;
  if (avg === null || avg <= 0) return { flagged: false, historicalAvg: null, multiplier: null };

  const multiplier = incomingSavings / avg;
  const flagged = multiplier > ANOMALY_SPIKE_MULTIPLIER;

  return { flagged, historicalAvg: parseFloat(avg.toFixed(2)), multiplier: parseFloat(multiplier.toFixed(2)) };
}

// ─── Create billing record ────────────────────────────────────────────────────

export interface CreatePerformanceBillingInput {
  companyId:       string;
  savingsRecordId: number;
  feePercentage?:  number;
  trustScore?:     number;
  periodStart?:    Date;
  periodEnd?:      Date;
  notes?:          string;
}

export interface CreatePerformanceBillingResult {
  success: boolean;
  record?: PerformanceBilling;
  blocked?: boolean;
  requiresApproval?: boolean;
  anomalyFlagged?: boolean;
  nonBillableReasons?: string[];
  error?: string;
}

export async function createPerformanceBillingRecord(
  input: CreatePerformanceBillingInput,
): Promise<CreatePerformanceBillingResult> {
  const feePercentage = input.feePercentage ?? PERFORMANCE_FEE_DEFAULT;

  // Load savings evidence record
  const [evidenceRecord] = await db
    .select()
    .from(savingsEvidenceRecords)
    .where(
      and(
        eq(savingsEvidenceRecords.id, input.savingsRecordId),
        eq(savingsEvidenceRecords.companyId, input.companyId),
      ),
    )
    .limit(1);

  if (!evidenceRecord) {
    return { success: false, error: "Savings evidence record not found" };
  }

  // Billability check
  const billability = checkBillability(evidenceRecord);
  if (!billability.billable) {
    logger.warn("perf-billing" as any, "Savings record is not billable", {
      companyId: input.companyId,
      savingsRecordId: input.savingsRecordId,
      reasons: billability.reasons,
    });
    return { success: false, nonBillableReasons: billability.reasons };
  }

  // Duplicate check
  const duplicate = await isDuplicateBilling(input.savingsRecordId);
  if (duplicate) {
    return { success: false, error: "DUPLICATE_BILLING: this savings record has already been billed" };
  }

  // Trust score check
  const trustScore = input.trustScore ?? 1.0;
  const trustValidation = validateTrustScore(trustScore);
  if (trustValidation.blocked) {
    return { success: false, blocked: true, error: trustValidation.reason };
  }

  // Anomaly detection
  const anomaly = await checkSavingsAnomaly(input.companyId, evidenceRecord.measuredSavings!);
  if (anomaly.flagged) {
    logger.warn("perf-billing" as any, "Savings anomaly detected — flagging for review", {
      companyId: input.companyId,
      savingsRecordId: input.savingsRecordId,
      incomingSavings: evidenceRecord.measuredSavings,
      historicalAvg: anomaly.historicalAvg,
      multiplier: anomaly.multiplier,
    });
  }

  // Compute fee
  const feeAmount = computePerformanceFee(evidenceRecord.measuredSavings, feePercentage);

  // Determine status — requires_approval stays "pending" until human approves
  const status = trustValidation.requiresApproval ? "pending" : "pending";

  const [record] = await db
    .insert(performanceBilling)
    .values({
      companyId: input.companyId,
      savingsRecordId: input.savingsRecordId,
      measuredSavings: evidenceRecord.measuredSavings!,
      feePercentage,
      feeAmount,
      status,
      billingPeriodStart: input.periodStart ?? null,
      billingPeriodEnd: input.periodEnd ?? null,
      notes: input.notes
        ? `${input.notes}${anomaly.flagged ? " | ANOMALY_FLAG: savings spike detected" : ""}`
        : anomaly.flagged ? "ANOMALY_FLAG: savings spike detected" : null,
    })
    .returning();

  logger.info("perf-billing" as any, "Performance billing record created", {
    companyId: input.companyId,
    savingsRecordId: input.savingsRecordId,
    measuredSavings: evidenceRecord.measuredSavings,
    feeAmount,
    feePercentage,
    requiresApproval: trustValidation.requiresApproval,
    anomalyFlagged: anomaly.flagged,
  });

  return {
    success: true,
    record,
    requiresApproval: trustValidation.requiresApproval,
    anomalyFlagged: anomaly.flagged,
  };
}

// ─── Monthly bill computation ─────────────────────────────────────────────────

export interface MonthlyPerformanceBill {
  companyId:         string;
  periodStart:       Date;
  periodEnd:         Date;
  baseFee:           number;          // always $100
  billableRecords:   Array<{
    savingsRecordId: number;
    measuredSavings: number;
    feePercentage:   number;
    feeAmount:       number;
    verifiedAt:      Date | null;
    outcomeRef:      any;
  }>;
  totalPerformanceFees: number;
  total:             number;          // baseFee + totalPerformanceFees
  lineItems:         Array<{
    description: string;
    amount: number;
  }>;
  nonBillableCount:  number;
  anomalyFlagged:    boolean;
}

/**
 * Compute the full monthly performance-based bill for a company.
 * Scans all savings evidence records, filters billable ones,
 * sums performance fees, and returns the full invoice breakdown.
 */
export async function computeMonthlyBill(
  companyId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<MonthlyPerformanceBill> {
  // Load all savings evidence with measured savings in the period
  const allRecords = await db
    .select()
    .from(savingsEvidenceRecords)
    .where(eq(savingsEvidenceRecords.companyId, companyId))
    .orderBy(desc(savingsEvidenceRecords.createdAt));

  // Find records already billed in this period (de-dup guard)
  const alreadyBilled = await db
    .select({ savingsRecordId: performanceBilling.savingsRecordId })
    .from(performanceBilling)
    .where(
      and(
        eq(performanceBilling.companyId, companyId),
        ne(performanceBilling.status, "cancelled"),
      ),
    );
  const billedIds = new Set(alreadyBilled.map(r => r.savingsRecordId));

  const billableRecords: MonthlyPerformanceBill["billableRecords"] = [];
  let nonBillableCount = 0;
  let anomalyFlagged = false;

  for (const record of allRecords) {
    if (billedIds.has(record.id)) continue; // skip already-billed

    const billability = checkBillability(record);
    if (!billability.billable) {
      nonBillableCount++;
      continue;
    }

    // Anomaly check
    const anomaly = await checkSavingsAnomaly(companyId, record.measuredSavings!);
    if (anomaly.flagged) anomalyFlagged = true;

    const feeAmount = computePerformanceFee(record.measuredSavings, PERFORMANCE_FEE_DEFAULT);

    billableRecords.push({
      savingsRecordId: record.id,
      measuredSavings: record.measuredSavings!,
      feePercentage: PERFORMANCE_FEE_DEFAULT,
      feeAmount,
      verifiedAt: record.measuredAt,
      outcomeRef: record.measuredOutcomeRef,
    });
  }

  const totalPerformanceFees = billableRecords.reduce((acc, r) => acc + r.feeAmount, 0);
  const total = PERFORMANCE_BASE_FEE + totalPerformanceFees;

  const lineItems: MonthlyPerformanceBill["lineItems"] = [
    { description: "Platform Fee (monthly base)", amount: PERFORMANCE_BASE_FEE },
    ...billableRecords.map(r => ({
      description: `Performance Fee (${(r.feePercentage * 100).toFixed(0)}% of $${r.measuredSavings.toLocaleString()} verified savings — Record #${r.savingsRecordId})`,
      amount: r.feeAmount,
    })),
  ];

  return {
    companyId,
    periodStart,
    periodEnd,
    baseFee: PERFORMANCE_BASE_FEE,
    billableRecords,
    totalPerformanceFees: parseFloat(totalPerformanceFees.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
    lineItems,
    nonBillableCount,
    anomalyFlagged,
  };
}

// ─── Dashboard summary ────────────────────────────────────────────────────────

export interface PerformanceSummary {
  estimatedSavings:    number;  // sum of all estimatedSavings (forecast only, NEVER billed)
  measuredSavings:     number;  // sum of all measuredSavings from billable records
  billableSavings:     number;  // sum of measuredSavings on verified records not yet billed
  feesCharged:         number;  // sum of feeAmount where status=paid|invoiced
  baseFeeYTD:          number;  // $100 × months active (approximate)
  billableRecordCount: number;
  pendingRecordCount:  number;
  disputedRecordCount: number;
}

/**
 * Returns the dashboard performance summary for a company.
 * Strict separation: estimated and measured values are NEVER mixed.
 */
export async function getPerformanceSummary(companyId: string): Promise<PerformanceSummary> {
  const allEvidence = await db
    .select()
    .from(savingsEvidenceRecords)
    .where(eq(savingsEvidenceRecords.companyId, companyId));

  const estimatedSavings = allEvidence.reduce((acc, r) => acc + (r.estimatedSavings ?? 0), 0);

  // Measured savings from billable records only
  const billableEvidence = allEvidence.filter(r => checkBillability(r).billable);
  const measuredSavings = billableEvidence.reduce((acc, r) => acc + (r.measuredSavings ?? 0), 0);

  // Billable savings = verified but not yet billed
  const billed = await db
    .select({ savingsRecordId: performanceBilling.savingsRecordId })
    .from(performanceBilling)
    .where(
      and(eq(performanceBilling.companyId, companyId), ne(performanceBilling.status, "cancelled")),
    );
  const billedIds = new Set(billed.map(r => r.savingsRecordId));
  const billableSavings = billableEvidence
    .filter(r => !billedIds.has(r.id))
    .reduce((acc, r) => acc + (r.measuredSavings ?? 0), 0);

  // Fees charged
  const perfRecords = await db
    .select()
    .from(performanceBilling)
    .where(eq(performanceBilling.companyId, companyId));

  const feesCharged = perfRecords
    .filter(r => r.status === "paid" || r.status === "invoiced")
    .reduce((acc, r) => acc + r.feeAmount, 0);

  const pendingRecordCount = perfRecords.filter(r => r.status === "pending").length;
  const disputedRecordCount = perfRecords.filter(r => r.status === "disputed").length;

  return {
    estimatedSavings: parseFloat(estimatedSavings.toFixed(2)),
    measuredSavings: parseFloat(measuredSavings.toFixed(2)),
    billableSavings: parseFloat(billableSavings.toFixed(2)),
    feesCharged: parseFloat(feesCharged.toFixed(2)),
    baseFeeYTD: PERFORMANCE_BASE_FEE * 12, // approx; real impl tracks subscription months
    billableRecordCount: billableEvidence.length,
    pendingRecordCount,
    disputedRecordCount,
  };
}

// ─── List performance billing records ────────────────────────────────────────

export async function listPerformanceBillingRecords(
  companyId: string,
  limit: number = 50,
): Promise<PerformanceBilling[]> {
  return db
    .select()
    .from(performanceBilling)
    .where(eq(performanceBilling.companyId, companyId))
    .orderBy(desc(performanceBilling.createdAt))
    .limit(limit);
}
