// Meta-routine: runs each of the six reporting background jobs in sequence,
// captures their outcomes, surfaces proposed changes for human review, and
// emails the user a digest they can confirm/reject from the email itself.
//
// Triggers
//   1. Scheduled weekly via backgroundJobs.ts
//   2. POST /api/routines/digest/run for ad-hoc runs (admin only)
//
// Confirmation flow
//   The email contains signed-link confirm/reject buttons per proposed change
//   (no re-auth required) plus a "reply with changes" link that points to a
//   prompt form. Tokens live in routine_digests.confirmToken.

import crypto from "node:crypto";
import { db } from "../db";
import {
  routineDigests,
  type RoutineResult,
  type ProposedChange,
  type RoutineDigest,
  users,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import {
  updateExternalEconomicData,
  generateSensorReadings,
  updateCommodityPrices,
  regenerateMLPredictions,
  updateSupplyChainRisk,
  updateWorkforceMetrics,
} from "../backgroundJobs";
import { sendDigestEmail } from "./digestEmail";
import { getApplyHandler, fallbackApplyHandler } from "./digestApplyHandlers";

// The six reporting routines that feed the digest. Order is preserved in the
// email so the user always sees them in the same sequence.
const ROUTINES: Array<{
  name: string;
  fn: () => Promise<unknown> | unknown;
}> = [
  { name: "Economic Data Updates", fn: updateExternalEconomicData },
  { name: "Sensor Readings Generation", fn: generateSensorReadings },
  { name: "Commodity Price Updates", fn: updateCommodityPrices },
  { name: "ML Predictions Regeneration", fn: regenerateMLPredictions },
  { name: "Supply Chain Risk Updates", fn: updateSupplyChainRisk },
  { name: "Workforce Metrics Updates", fn: updateWorkforceMetrics },
];

// A "change" we surface for human review. Routines can write to this list
// during their run via the global ChangeCollector; if none are recorded the
// digest still goes out, just without action items.
class ChangeCollector {
  private changes: ProposedChange[] = [];
  add(change: Omit<ProposedChange, "id" | "status">) {
    this.changes.push({
      id: crypto.randomUUID(),
      status: "pending",
      ...change,
    });
  }
  drain(): ProposedChange[] {
    const out = this.changes;
    this.changes = [];
    return out;
  }
}

// Module-level singleton so existing routines can call
// `import { proposedChanges } from "./digestRoutine"` and surface a change
// without us having to thread a parameter through every job. Routines that
// don't yet do this just contribute a status line — that's fine.
export const proposedChanges = new ChangeCollector();

interface DigestRunOptions {
  userId: string;
  companyId?: string | null;
  // When false the digest is built and persisted but no email is sent. Useful
  // for the API endpoint's dry-run mode.
  sendEmail?: boolean;
}

export async function runDigestRoutine(opts: DigestRunOptions): Promise<RoutineDigest> {
  const startedAt = Date.now();
  console.log(`[Digest] Starting digest run for user=${opts.userId}`);

  const results: RoutineResult[] = [];
  for (const routine of ROUTINES) {
    const t0 = Date.now();
    try {
      await routine.fn();
      results.push({
        name: routine.name,
        status: "ok",
        durationMs: Date.now() - t0,
      });
      console.log(`[Digest] OK ${routine.name} in ${Date.now() - t0}ms`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        name: routine.name,
        status: "error",
        durationMs: Date.now() - t0,
        error: message,
      });
      console.error(`[Digest] FAIL ${routine.name}: ${message}`);
    }
  }

  const changes = proposedChanges.drain();
  const confirmToken = crypto.randomBytes(32).toString("base64url");

  const [row] = await db
    .insert(routineDigests)
    .values({
      userId: opts.userId,
      companyId: opts.companyId ?? null,
      routineResults: results,
      proposedChanges: changes,
      confirmToken,
    })
    .returning();

  console.log(`[Digest] Persisted digest=${row.id} with ${changes.length} change(s)`);

  if (opts.sendEmail !== false) {
    const [user] = await db
      .select({ email: users.email, firstName: users.firstName })
      .from(users)
      .where(eq(users.id, opts.userId));
    if (user?.email) {
      const sendResult = await sendDigestEmail({
        digestId: row.id,
        recipientEmail: user.email,
        recipientName: user.firstName ?? "there",
        confirmToken,
        results,
        changes,
      });
      if (sendResult.success) {
        await db
          .update(routineDigests)
          .set({
            emailSentAt: new Date(),
            emailMessageId: sendResult.id ?? null,
            updatedAt: new Date(),
          })
          .where(eq(routineDigests.id, row.id));
        console.log(`[Digest] Email sent to ${user.email} for digest=${row.id}`);
      } else {
        console.error(`[Digest] Email send failed for digest=${row.id}: ${sendResult.error}`);
      }
    } else {
      console.warn(`[Digest] No email on file for user=${opts.userId}; skipping send`);
    }
  }

  console.log(
    `[Digest] Done. routines=${results.length} ok=${results.filter(r => r.status === "ok").length} ` +
      `errors=${results.filter(r => r.status === "error").length} totalMs=${Date.now() - startedAt}`,
  );

  return row;
}

// Resolve a single proposed change. Called by the GET token-link endpoints.
// On approval, runs the registered apply handler for the change's kind so
// the change is propagated to live application data, and stores the apply
// result on the digest row for audit. Rejections are recorded but never
// trigger a handler.
export async function resolveChange(opts: {
  confirmToken: string;
  changeId: string;
  decision: "approved" | "rejected";
}): Promise<{ ok: true; change: ProposedChange } | { ok: false; reason: string }> {
  const [digest] = await db
    .select()
    .from(routineDigests)
    .where(eq(routineDigests.confirmToken, opts.confirmToken));
  if (!digest) return { ok: false, reason: "Digest not found or expired" };

  const list = (digest.proposedChanges as ProposedChange[]) ?? [];
  const idx = list.findIndex(c => c.id === opts.changeId);
  if (idx === -1) return { ok: false, reason: "Change not found in this digest" };
  if (list[idx].status !== "pending") {
    return { ok: false, reason: `Already ${list[idx].status}` };
  }

  const change = list[idx];
  const nowIso = new Date().toISOString();

  if (opts.decision === "approved") {
    const handler = getApplyHandler(change.kind) ?? fallbackApplyHandler;
    let applyResult: ProposedChange["applyResult"];
    try {
      const result = await handler(change.applyPayload ?? {}, {
        digestId: digest.id,
        changeId: change.id,
        userId: digest.userId,
        companyId: digest.companyId ?? null,
      });
      applyResult = result.ok
        ? { ok: true, summary: result.summary }
        : { ok: false, error: result.error };
      console.log(
        `[Digest] Applied change=${change.id} kind=${change.kind} ok=${result.ok} ` +
          (result.ok ? `summary="${result.summary ?? ""}"` : `error="${result.error}"`),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Handler threw";
      applyResult = { ok: false, error: message };
      console.error(`[Digest] Apply handler crashed for kind=${change.kind}: ${message}`);
    }
    list[idx] = {
      ...change,
      status: "approved",
      resolvedAt: nowIso,
      appliedAt: nowIso,
      applyResult,
    };
  } else {
    list[idx] = {
      ...change,
      status: "rejected",
      resolvedAt: nowIso,
    };
  }

  await db
    .update(routineDigests)
    .set({ proposedChanges: list, updatedAt: new Date() })
    .where(eq(routineDigests.id, digest.id));

  return { ok: true, change: list[idx] };
}

// Capture a free-form follow-up prompt the user wrote in response to the
// digest. The actual action — making code/data changes from the prompt — is
// out of scope for this MVP; we persist the prompt and notify via log so
// the operator can act on it.
export async function recordPromptResponse(opts: {
  confirmToken: string;
  prompt: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const [digest] = await db
    .select()
    .from(routineDigests)
    .where(eq(routineDigests.confirmToken, opts.confirmToken));
  if (!digest) return { ok: false, reason: "Digest not found or expired" };
  if (digest.closedAt) return { ok: false, reason: "Digest is closed" };

  await db
    .update(routineDigests)
    .set({
      userPrompt: opts.prompt,
      promptRespondedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(routineDigests.id, digest.id));

  console.log(
    `[Digest] User prompt recorded for digest=${digest.id} ` +
      `(${opts.prompt.length} chars). Operator review required.`,
  );
  return { ok: true };
}
