import { db } from "../db";
import { eq, and, sql, desc, count } from "drizzle-orm";
import {
  copilotActionDrafts,
  copilotQueryLog,
  materials,
  suppliers,
  supplierMaterials,
  skus,
  purchaseOrders,
  rfqs,
  allocations,
  demandHistory,
  type CopilotActionDraft,
  type CopilotDraftStatus,
  type CopilotDraftType,
} from "@shared/schema";
import {
  computeWinRateMetrics,
  getRecentOutcomes,
  getConfidenceTrend,
} from "./decisionEvaluation";
import { getTopNews } from "./newsIngestion";

export interface EvidenceBundle {
  entityIds: string[];
  queryTimestamp: string;
  rowCounts: Record<string, number>;
  regimeSnapshot?: {
    regime: string;
    fdr: number;
    confidence: number;
    asOf: string;
  };
  policyInputs?: Record<string, any>;
  dataQualityScore?: number;
  provenanceVersion: string;
}

export interface CopilotNewsItem {
  title: string;
  source: string;
  date: string;           // ISO string
  link: string;
  relevanceExplanation: string;  // 1-line derived explanation
}

export interface CopilotQueryResult {
  answer: string;
  evidence: EvidenceRef[];
  evidenceBundle: EvidenceBundle;
  queryId: number;
  winRateContext: {
    globalWinRate: number;
    skuWinRate: number | null;
    confidenceTrend: "improving" | "degrading" | "stable";
    performanceFlag: string | null;
    recentOutcomes: Array<{
      decisionId: string;
      win: boolean;
      winType: string;
      deltaCost: number | null;
      deltaServiceLevel: number | null;
      deltaStockout: number | null;
    }>;
  };
  topNews: CopilotNewsItem[];   // top 3 relevant real news articles
}

export interface EvidenceRef {
  entityType: string;
  entityId: string;
  field?: string;
  value?: any;
  timestamp?: string;
}

export interface DraftCreateResult {
  draft: CopilotActionDraft;
  warnings: string[];
}

const DRAFT_NEVER_COMPLETED_GUARD = true;
const PROVENANCE_VERSION = "2.0.0";

function buildEvidenceBundle(entityIds: string[], rowCounts: Record<string, number>): EvidenceBundle {
  return {
    entityIds,
    queryTimestamp: new Date().toISOString(),
    rowCounts,
    provenanceVersion: PROVENANCE_VERSION,
  };
}

export async function queryCopilot(companyId: string, userId: string, query: string): Promise<CopilotQueryResult> {
  const startMs = Date.now();
  const lowerQuery = query.toLowerCase();

  let answer = "";
  const evidence: EvidenceRef[] = [];
  const entityIds: string[] = [];
  const rowCounts: Record<string, number> = {};

  if (lowerQuery.includes("material") || lowerQuery.includes("inventory") || lowerQuery.includes("stock")) {
    const mats = await db.select().from(materials).where(eq(materials.companyId, companyId));
    rowCounts.materials = mats.length;
    const lowStock = mats.filter(m => m.onHand < 10);
    answer = `Found ${mats.length} materials. ${lowStock.length} have low stock (below 10 units).`;
    for (const m of lowStock.slice(0, 10)) {
      evidence.push({ entityType: "material", entityId: m.id, field: "onHand", value: m.onHand, timestamp: m.createdAt?.toISOString() });
      entityIds.push(m.id);
    }
    if (mats.length > 0 && lowStock.length === 0) {
      evidence.push({ entityType: "material", entityId: mats[0].id, field: "count", value: mats.length });
      entityIds.push(mats[0].id);
    }
  } else if (lowerQuery.includes("supplier")) {
    const sups = await db.select().from(suppliers).where(eq(suppliers.companyId, companyId));
    rowCounts.suppliers = sups.length;
    answer = `Found ${sups.length} suppliers in your company.`;
    for (const s of sups.slice(0, 10)) {
      evidence.push({ entityType: "supplier", entityId: s.id, field: "name", value: s.name });
      entityIds.push(s.id);
    }
  } else if (lowerQuery.includes("sku") || lowerQuery.includes("product") || lowerQuery.includes("demand")) {
    const companySkus = await db.select().from(skus).where(eq(skus.companyId, companyId));
    rowCounts.skus = companySkus.length;
    answer = `Found ${companySkus.length} SKUs.`;
    for (const sku of companySkus.slice(0, 10)) {
      evidence.push({ entityType: "sku", entityId: sku.id, field: "name", value: sku.name });
      entityIds.push(sku.id);
    }
  } else if (lowerQuery.includes("order") || lowerQuery.includes("purchase") || lowerQuery.includes("po")) {
    const pos = await db.select().from(purchaseOrders).where(eq(purchaseOrders.companyId, companyId));
    rowCounts.purchaseOrders = pos.length;
    const totalValue = pos.reduce((a, po) => a + (po.totalAmount || 0), 0);
    answer = `Found ${pos.length} purchase orders with total value $${totalValue.toFixed(2)}.`;
    for (const po of pos.slice(0, 5)) {
      evidence.push({ entityType: "purchase_order", entityId: po.id, field: "totalAmount", value: po.totalAmount, timestamp: po.createdAt?.toISOString() });
      entityIds.push(po.id);
    }
  } else if (lowerQuery.includes("rfq") || lowerQuery.includes("quote")) {
    const companyRfqs = await db.select().from(rfqs).where(eq(rfqs.companyId, companyId));
    rowCounts.rfqs = companyRfqs.length;
    answer = `Found ${companyRfqs.length} RFQs.`;
    for (const rfq of companyRfqs.slice(0, 5)) {
      evidence.push({ entityType: "rfq", entityId: rfq.id, field: "title", value: rfq.title });
      entityIds.push(rfq.id);
    }
  } else {
    const matCount = await db.select({ count: count() }).from(materials).where(eq(materials.companyId, companyId));
    const supCount = await db.select({ count: count() }).from(suppliers).where(eq(suppliers.companyId, companyId));
    const skuCount = await db.select({ count: count() }).from(skus).where(eq(skus.companyId, companyId));
    rowCounts.materials = matCount[0]?.count || 0;
    rowCounts.suppliers = supCount[0]?.count || 0;
    rowCounts.skus = skuCount[0]?.count || 0;
    answer = `Your company has ${matCount[0]?.count || 0} materials, ${supCount[0]?.count || 0} suppliers, and ${skuCount[0]?.count || 0} SKUs. Ask about specific entities for detailed insights.`;
    evidence.push(
      { entityType: "summary", entityId: "materials", field: "count", value: matCount[0]?.count || 0 },
      { entityType: "summary", entityId: "suppliers", field: "count", value: supCount[0]?.count || 0 },
      { entityType: "summary", entityId: "skus", field: "count", value: skuCount[0]?.count || 0 },
    );
  }

  const evidenceBundle = buildEvidenceBundle(entityIds, rowCounts);

  // Win rate intelligence + top news — fetched in parallel with the log insert
  const [logEntry, winMetrics, recentRows, confidenceTrend, rawTopNews] = await Promise.all([
    db.insert(copilotQueryLog).values({
      companyId,
      userId,
      query,
      responseText: answer,
      evidenceRefs: evidence as any,
      evidenceBundle: evidenceBundle as any,
      durationMs: Date.now() - startMs,
    }).returning().then((rows) => rows[0]),
    computeWinRateMetrics(companyId).catch(() => null),
    getRecentOutcomes(companyId, 5).catch(() => []),
    getConfidenceTrend(companyId).catch(() => "stable" as const),
    getTopNews({ limit: 3 }).catch(() => [] as any[]),
  ]);

  // Derive SKU-specific win rate if the query mentions a specific SKU
  let skuWinRate: number | null = null;
  if (winMetrics) {
    for (const [skuId, rate] of Object.entries(winMetrics.winRateBySku)) {
      if (lowerQuery.includes(skuId.toLowerCase())) {
        skuWinRate = rate;
        break;
      }
    }
  }

  const winRateContext: CopilotQueryResult["winRateContext"] = {
    globalWinRate: winMetrics?.globalWinRate ?? 0,
    skuWinRate,
    confidenceTrend,
    performanceFlag: winMetrics?.performanceFlag ?? null,
    recentOutcomes: recentRows.map((r) => ({
      decisionId: r.decisionId,
      win: r.win,
      winType: r.winType,
      deltaCost: r.deltaCost ?? null,
      deltaServiceLevel: r.deltaServiceLevel ?? null,
      deltaStockout: r.deltaStockout ?? null,
    })),
  };

  // Map raw news into slim copilot-friendly shape
  const topNews: CopilotNewsItem[] = (rawTopNews ?? []).slice(0, 3).map((n: any) => ({
    title: n.title,
    source: n.source,
    date: (n.pubDate instanceof Date ? n.pubDate : new Date(n.pubDate)).toISOString(),
    link: n.link,
    relevanceExplanation: `${n.category ?? "news"} · ${n.sentiment ?? "neutral"} · relevance ${((n.relevanceScore ?? 0) * 100).toFixed(0)}%`,
  }));

  return { answer, evidence, evidenceBundle, queryId: logEntry.id, winRateContext, topNews };
}

export async function createDraft(
  companyId: string,
  userId: string,
  draftType: CopilotDraftType,
  title: string,
  payload: Record<string, any>,
  reasoning?: string,
): Promise<DraftCreateResult> {
  const warnings: string[] = [];

  const evidence: Record<string, any> = {};
  const entityIds: string[] = [];
  const rowCounts: Record<string, number> = {};

  if (draftType === "purchase_order" && payload.materialId) {
    const mat = await db.select().from(materials).where(and(eq(materials.id, payload.materialId), eq(materials.companyId, companyId)));
    rowCounts.materials = mat.length;
    if (mat.length > 0) {
      evidence.material = { id: mat[0].id, name: mat[0].name, onHand: mat[0].onHand };
      entityIds.push(mat[0].id);
    }
    if (payload.supplierId) {
      const sup = await db.select().from(suppliers).where(and(eq(suppliers.id, payload.supplierId), eq(suppliers.companyId, companyId)));
      rowCounts.suppliers = sup.length;
      if (sup.length > 0) {
        evidence.supplier = { id: sup[0].id, name: sup[0].name };
        entityIds.push(sup[0].id);
      }
    }
  }

  const evidenceBundle = buildEvidenceBundle(entityIds, rowCounts);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [draft] = await db.insert(copilotActionDrafts).values({
    companyId,
    draftType,
    status: "draft",
    title,
    reasoning: reasoning || null,
    evidence: evidence as any,
    evidenceBundle: evidenceBundle as any,
    draftPayload: payload as any,
    createdBy: userId,
    expiresAt,
  }).returning();

  return { draft, warnings };
}

export async function getDrafts(companyId: string, status?: CopilotDraftStatus): Promise<CopilotActionDraft[]> {
  if (status) {
    return db.select().from(copilotActionDrafts)
      .where(and(eq(copilotActionDrafts.companyId, companyId), eq(copilotActionDrafts.status, status)))
      .orderBy(desc(copilotActionDrafts.createdAt));
  }
  return db.select().from(copilotActionDrafts)
    .where(eq(copilotActionDrafts.companyId, companyId))
    .orderBy(desc(copilotActionDrafts.createdAt));
}

export async function getDraftById(companyId: string, draftId: number): Promise<CopilotActionDraft | null> {
  const [draft] = await db.select().from(copilotActionDrafts)
    .where(and(eq(copilotActionDrafts.id, draftId), eq(copilotActionDrafts.companyId, companyId)));
  return draft || null;
}

export async function approveDraft(companyId: string, draftId: number, userId: string): Promise<CopilotActionDraft | null> {
  const draft = await getDraftById(companyId, draftId);
  if (!draft) return null;
  if (draft.status !== "draft" && draft.status !== "pending_approval") return null;

  const [updated] = await db.update(copilotActionDrafts)
    .set({ status: "approved", approvedBy: userId, approvedAt: new Date() })
    .where(and(eq(copilotActionDrafts.id, draftId), eq(copilotActionDrafts.companyId, companyId)))
    .returning();
  return updated || null;
}

export async function rejectDraft(companyId: string, draftId: number, userId: string, reason?: string): Promise<CopilotActionDraft | null> {
  const draft = await getDraftById(companyId, draftId);
  if (!draft) return null;
  if (draft.status !== "draft" && draft.status !== "pending_approval") return null;

  const [updated] = await db.update(copilotActionDrafts)
    .set({ status: "rejected", rejectedBy: userId, rejectedAt: new Date(), rejectionReason: reason || null })
    .where(and(eq(copilotActionDrafts.id, draftId), eq(copilotActionDrafts.companyId, companyId)))
    .returning();
  return updated || null;
}

export function validateNeverCompleted(draft: CopilotActionDraft): boolean {
  if (!DRAFT_NEVER_COMPLETED_GUARD) return true;
  if (draft.executedAt !== null && draft.status !== "approved") {
    throw new Error("SAFETY_VIOLATION: Draft marked as executed without approval");
  }
  return true;
}

export async function canExecuteDraft(companyId: string, draftId: number): Promise<{ allowed: boolean; reason: string }> {
  const draft = await getDraftById(companyId, draftId);
  if (!draft) return { allowed: false, reason: "Draft not found" };
  if (draft.status !== "approved") return { allowed: false, reason: `Draft status is '${draft.status}', must be 'approved' to execute` };
  if (draft.executedAt) return { allowed: false, reason: "Draft already executed" };
  return { allowed: true, reason: "Draft approved and ready for execution" };
}

export function validateEvidenceBundle(bundle: any): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!bundle) {
    issues.push("evidenceBundle is null or undefined");
    return { valid: false, issues };
  }
  if (!Array.isArray(bundle.entityIds)) issues.push("Missing entityIds array");
  if (!bundle.queryTimestamp) issues.push("Missing queryTimestamp");
  if (!bundle.rowCounts || typeof bundle.rowCounts !== "object") issues.push("Missing rowCounts object");
  if (!bundle.provenanceVersion) issues.push("Missing provenanceVersion");
  return { valid: issues.length === 0, issues };
}
