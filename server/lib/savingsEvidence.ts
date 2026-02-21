import { db } from "../db";
import { eq, and, sql, desc } from "drizzle-orm";
import {
  savingsEvidenceRecords,
  purchaseOrders,
  materials,
  type SavingsEvidenceRecord,
} from "@shared/schema";

export interface SavingsEvidenceInput {
  companyId: string;
  savingsType: string;
  actionContext: {
    actionType: string;
    triggeredBy: string;
    materialId?: string;
    supplierId?: string;
    quantity?: number;
    unitPrice?: number;
    regime?: string;
    timestamp: string;
  };
  counterfactualDefinition: string;
  assumptions: Record<string, any>;
  scenarioInputs?: Record<string, any>;
  computationMethod: string;
  estimatedSavings: number;
  entityRefs: {
    purchaseOrderIds?: string[];
    invoiceIds?: string[];
    materialIds?: string[];
    inventorySnapshotIds?: string[];
  };
  regime?: string;
  policyVersion?: string;
}

export interface MeasuredOutcomeInput {
  invoiceId?: string;
  receiptId?: string;
  actualPrice?: number;
  actualQuantity?: number;
  actualDate?: string;
  verifiedBy?: string;
}

export async function createSavingsEvidence(input: SavingsEvidenceInput): Promise<SavingsEvidenceRecord> {
  const [record] = await db.insert(savingsEvidenceRecords).values({
    companyId: input.companyId,
    savingsType: input.savingsType,
    actionContext: input.actionContext as any,
    counterfactualDefinition: input.counterfactualDefinition,
    assumptions: input.assumptions as any,
    scenarioInputs: input.scenarioInputs as any,
    computationMethod: input.computationMethod,
    estimatedSavings: input.estimatedSavings,
    measuredSavings: null,
    measuredOutcomeRef: null,
    entityRefs: input.entityRefs as any,
    regime: input.regime,
    policyVersion: input.policyVersion,
    immutable: true,
  }).returning();

  return record;
}

export async function recordMeasuredSavings(
  companyId: string,
  evidenceId: number,
  measuredSavings: number,
  outcomeRef: MeasuredOutcomeInput,
): Promise<SavingsEvidenceRecord | null> {
  const [existing] = await db.select().from(savingsEvidenceRecords)
    .where(and(eq(savingsEvidenceRecords.id, evidenceId), eq(savingsEvidenceRecords.companyId, companyId)));

  if (!existing) return null;

  if (!outcomeRef.invoiceId && !outcomeRef.receiptId && !outcomeRef.actualPrice) {
    throw new Error("MEASURED_SAVINGS_REQUIRES_OUTCOME_REF: measuredSavings must reference a realized outcome (invoice, receipt, or actual price)");
  }

  const [updated] = await db.update(savingsEvidenceRecords)
    .set({
      measuredSavings,
      measuredOutcomeRef: outcomeRef as any,
      measuredAt: new Date(),
    })
    .where(and(eq(savingsEvidenceRecords.id, evidenceId), eq(savingsEvidenceRecords.companyId, companyId)))
    .returning();

  return updated || null;
}

export async function getSavingsEvidence(companyId: string, limit: number = 50): Promise<SavingsEvidenceRecord[]> {
  return db.select().from(savingsEvidenceRecords)
    .where(eq(savingsEvidenceRecords.companyId, companyId))
    .orderBy(desc(savingsEvidenceRecords.createdAt))
    .limit(limit);
}

export async function getSavingsEvidenceById(companyId: string, id: number): Promise<SavingsEvidenceRecord | null> {
  const [record] = await db.select().from(savingsEvidenceRecords)
    .where(and(eq(savingsEvidenceRecords.id, id), eq(savingsEvidenceRecords.companyId, companyId)));
  return record || null;
}

export function computeCounterfactualSavings(
  actionPrice: number,
  counterfactualPrice: number,
  quantity: number,
  method: string = "price_difference",
): { estimatedSavings: number; computationMethod: string; assumptions: Record<string, any> } {
  let savings = 0;
  const assumptions: Record<string, any> = {
    actionPrice,
    counterfactualPrice,
    quantity,
    method,
  };

  if (method === "price_difference") {
    savings = (counterfactualPrice - actionPrice) * quantity;
    assumptions.formula = "(counterfactualPrice - actionPrice) * quantity";
  } else if (method === "timing_advantage") {
    savings = counterfactualPrice * quantity * 0.05;
    assumptions.formula = "counterfactualPrice * quantity * timing_discount(5%)";
    assumptions.timingDiscountPct = 5;
  } else if (method === "volume_discount") {
    savings = actionPrice * quantity * 0.03;
    assumptions.formula = "actionPrice * quantity * volume_discount(3%)";
    assumptions.volumeDiscountPct = 3;
  }

  return { estimatedSavings: Math.max(0, savings), computationMethod: method, assumptions };
}

export function validateSavingsRecord(record: SavingsEvidenceRecord): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!record.actionContext) issues.push("Missing actionContext");
  if (!record.counterfactualDefinition) issues.push("Missing counterfactualDefinition");
  if (!record.assumptions) issues.push("Missing assumptions");
  if (!record.computationMethod) issues.push("Missing computationMethod");
  if (!record.entityRefs) issues.push("Missing entityRefs");
  if (record.estimatedSavings < 0) issues.push("estimatedSavings cannot be negative");

  if (record.measuredSavings !== null && !record.measuredOutcomeRef) {
    issues.push("measuredSavings present but no measuredOutcomeRef");
  }
  if (record.measuredOutcomeRef && record.measuredSavings === null) {
    issues.push("measuredOutcomeRef present but measuredSavings is null");
  }

  return { valid: issues.length === 0, issues };
}
