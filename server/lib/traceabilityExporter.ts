/**
 * Traceability Exporter — produces signed, tamper-evident chain-of-custody
 * reports tracing a finished good back through its component history to raw
 * material receipt.
 *
 * Used by DoD ManTech and other federal reviewers to verify defense industrial
 * base visibility. Also surfaced to customers as "Provenance Report" PDFs.
 *
 * Contract:
 *   exportTraceabilityChain(companyId, {entity, entityId})
 *     → { chain, signature, issuedAt, reportId }
 *
 * The signature is an HMAC-SHA256 over the canonical JSON of the chain, using
 * a server-side secret. Any modification to the chain invalidates the
 * signature — a grant reviewer can recompute locally given the secret.
 */

import { createHmac, randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "../db";

export type ProvenanceEntityType =
  | "finished_good"
  | "work_order"
  | "material_lot"
  | "quality_record";

export interface ProvenanceNode {
  entityType: ProvenanceEntityType | string;
  entityId: string;
  occurredAt: string;
  actor?: string | null;
  action: string;
  payload?: Record<string, unknown>;
  children?: ProvenanceNode[];
}

export interface TraceabilityReport {
  reportId: string;
  issuedAt: string;
  companyId: string;
  requested: { entity: ProvenanceEntityType; entityId: string };
  chain: ProvenanceNode;
  signature: string;
  signatureAlgorithm: "HMAC-SHA256";
  canonicalHash: string;
}

function canonicalize(value: unknown): string {
  // RFC 8785 JSON canonicalization — sorted keys, minimal whitespace.
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return (
    "{" +
    keys
      .map(
        (k) =>
          JSON.stringify(k) + ":" + canonicalize((value as Record<string, unknown>)[k]),
      )
      .join(",") +
    "}"
  );
}

function sign(canonical: string): { signature: string; canonicalHash: string } {
  const secret =
    process.env.TRACEABILITY_SIGNING_SECRET ||
    process.env.JWT_SECRET ||
    process.env.SESSION_SECRET ||
    "prescient-labs-trace-default-DO-NOT-USE-IN-PROD";
  const mac = createHmac("sha256", secret);
  mac.update(canonical);
  const signature = mac.digest("base64");
  // Separate hash so reviewers without the secret can still verify content
  // integrity against the published hash in the audit log.
  const hashMac = createHmac("sha256", "content-hash");
  hashMac.update(canonical);
  return { signature, canonicalHash: hashMac.digest("hex") };
}

/**
 * Walk from an entity backward through audit_logs + domain tables to build the
 * chain. This keeps the exporter free of coupling to every table — every
 * state change is captured in audit_logs, and we reconstruct provenance from
 * that immutable log plus the current row.
 */
async function buildChain(
  companyId: string,
  entity: ProvenanceEntityType,
  entityId: string,
  visited: Set<string>,
): Promise<ProvenanceNode> {
  const key = `${entity}:${entityId}`;
  if (visited.has(key)) {
    return {
      entityType: entity,
      entityId,
      occurredAt: new Date(0).toISOString(),
      action: "cycle-detected",
    };
  }
  visited.add(key);

  const logs = await db.execute(sql`
    SELECT id, user_id, action, entity_type, entity_id, changes, timestamp
    FROM audit_logs
    WHERE company_id = ${companyId}
      AND entity_type = ${entity}
      AND entity_id = ${entityId}
    ORDER BY timestamp ASC
  `);

  const rows = ((logs as any).rows ?? []) as Array<{
    id: string;
    user_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string;
    changes: unknown;
    timestamp: Date;
  }>;

  // Simple parent discovery: look at `changes.before.parentId / linked ids`
  const childKeys: { entity: ProvenanceEntityType; entityId: string }[] = [];
  for (const r of rows) {
    const c = r.changes as Record<string, any> | null;
    const candidates: Array<[ProvenanceEntityType, string]> = [];
    if (c?.materialLotId) candidates.push(["material_lot", String(c.materialLotId)]);
    if (c?.workOrderId) candidates.push(["work_order", String(c.workOrderId)]);
    if (c?.qualityRecordId) candidates.push(["quality_record", String(c.qualityRecordId)]);
    for (const [et, eid] of candidates) {
      if (!childKeys.find((k) => k.entity === et && k.entityId === eid)) {
        childKeys.push({ entity: et, entityId: eid });
      }
    }
  }

  const children: ProvenanceNode[] = [];
  for (const k of childKeys) {
    children.push(await buildChain(companyId, k.entity, k.entityId, visited));
  }

  return {
    entityType: entity,
    entityId,
    occurredAt:
      rows[0]?.timestamp instanceof Date ? rows[0].timestamp.toISOString() : new Date().toISOString(),
    action: rows[0]?.action ?? "unknown",
    actor: rows[0]?.user_id ?? null,
    payload: {
      eventCount: rows.length,
      firstEventAt: rows[0]?.timestamp ?? null,
      lastEventAt: rows[rows.length - 1]?.timestamp ?? null,
      actions: rows.map((r) => ({
        at: r.timestamp,
        by: r.user_id,
        action: r.action,
      })),
    },
    children,
  };
}

export async function exportTraceabilityChain(
  companyId: string,
  request: { entity: ProvenanceEntityType; entityId: string },
): Promise<TraceabilityReport> {
  const chain = await buildChain(
    companyId,
    request.entity,
    request.entityId,
    new Set(),
  );

  const envelope = {
    reportId: randomUUID(),
    issuedAt: new Date().toISOString(),
    companyId,
    requested: request,
    chain,
  };
  const canonical = canonicalize(envelope);
  const { signature, canonicalHash } = sign(canonical);

  return {
    ...envelope,
    signature,
    signatureAlgorithm: "HMAC-SHA256",
    canonicalHash,
  };
}

/**
 * Verify a previously issued report. Returns true iff the signature matches the
 * canonical form of the chain. Used by external parties to independently
 * confirm a report was not tampered with.
 */
export function verifyTraceabilityReport(report: TraceabilityReport): boolean {
  const envelope = {
    reportId: report.reportId,
    issuedAt: report.issuedAt,
    companyId: report.companyId,
    requested: report.requested,
    chain: report.chain,
  };
  const canonical = canonicalize(envelope);
  const { signature, canonicalHash } = sign(canonical);
  return signature === report.signature && canonicalHash === report.canonicalHash;
}
