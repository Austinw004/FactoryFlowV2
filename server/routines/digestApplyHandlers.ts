// Handler registry — when a user clicks Approve on a proposed change in the
// digest email, this is what runs against live application data.
//
// Adding a new applicable change:
//   1. The routine writes a ProposedChange via proposedChanges.add(...) with
//      `kind: "my-kind"` and an `applyPayload: { ... }` describing the action.
//   2. Register a handler for that kind in this file:
//        registerApplyHandler("my-kind", async (payload, ctx) => {
//          // talk to storage / db here
//          return { ok: true, summary: "..." };
//        });
//   3. Approval triggers it; the result is written back to the digest row
//      (status: "approved", appliedAt, applyResult) for audit.
//
// Why a registry instead of hardcoded calls: the six routines own different
// data domains and may grow over time. Centralizing the dispatch keeps the
// resolveChange() path simple and makes it obvious where to add a handler.

export interface ApplyContext {
  digestId: string;
  changeId: string;
  userId: string;
  companyId: string | null;
}

export type ApplyResult =
  | { ok: true; summary?: string }
  | { ok: false; error: string };

export type ApplyHandler = (
  payload: Record<string, unknown>,
  ctx: ApplyContext,
) => Promise<ApplyResult>;

const handlers = new Map<string, ApplyHandler>();

export function registerApplyHandler(kind: string, fn: ApplyHandler): void {
  if (handlers.has(kind)) {
    console.warn(`[Digest] Replacing apply handler for kind="${kind}"`);
  }
  handlers.set(kind, fn);
}

export function getApplyHandler(kind: string): ApplyHandler | undefined {
  return handlers.get(kind);
}

// ----------------------------------------------------------------------
// Built-in informational handler. Surfacing this kind in a digest does
// nothing destructive when approved — it just records the user's
// acknowledgement. Useful for routines whose proposed changes are alerts
// the user has seen rather than actions to take.
// ----------------------------------------------------------------------
registerApplyHandler("acknowledge", async (_payload, ctx) => {
  return {
    ok: true,
    summary: `Acknowledged by user (digest=${ctx.digestId.slice(0, 8)})`,
  };
});

// ----------------------------------------------------------------------
// Default fallback used by resolveChange when no handler is registered for
// a kind. It records the approval but does not modify any application
// state. This keeps the email flow working even before specific apply
// handlers have been wired up for every routine.
// ----------------------------------------------------------------------
export const fallbackApplyHandler: ApplyHandler = async (payload, ctx) => {
  console.log(
    `[Digest] No registered handler for change kind; recorded approval only. ` +
      `digest=${ctx.digestId} change=${ctx.changeId} payload=${JSON.stringify(payload)}`,
  );
  return {
    ok: true,
    summary: "Approval recorded. No registered apply handler for this kind yet.",
  };
};
