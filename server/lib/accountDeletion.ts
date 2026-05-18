/**
 * Account deletion service — GDPR Article 17 (Right to Erasure) +
 * CCPA right-to-delete backing.
 *
 * Soft-delete with 30-day grace period. See `accountDeletionRequests`
 * in shared/schema.ts for the persistence model.
 *
 * Cascade behavior on actual deletion:
 *   - users row deleted via DELETE (FK cascade chain handles dependent
 *     rows: auth_sessions, user_role_assignments, team_invitations,
 *     password_reset_tokens, subscriptions ownership, etc.)
 *   - If the user is the SOLE admin of a company that has other members,
 *     deletion is REFUSED at request time (returns 409). They must
 *     transfer admin to another user first.
 *   - If the user is the sole member of a company, the company is
 *     cascaded too — every users.companyId FK with `onDelete: cascade`
 *     handles its tables automatically.
 *
 * Future-work: a "data portability export" companion endpoint (GDPR
 * Article 20) should be paired with this — let the user download their
 * data before requesting deletion. Filed but not implemented in this
 * round.
 */

import { db } from "../db";
import { accountDeletionRequests, users, userRoleAssignments, roles, companies, subscriptions } from "@shared/schema";
import { and, eq, isNull, sql, lte } from "drizzle-orm";
import { getUncachableStripeClient } from "../stripeClient";

export const DELETION_GRACE_PERIOD_DAYS = 30;

export type DeletionStatus = "pending" | "cancelled" | "completed";

export interface DeletionRequestResult {
  status: "scheduled" | "already_pending" | "blocked";
  scheduledFor?: Date;
  requestId?: string;
  blockReason?: string;
}

/**
 * Look up whether the requesting user is the sole admin of a company
 * that has OTHER members. If yes, deletion is blocked — admin role must
 * be transferred first to prevent orphaning the company.
 *
 * Returns null if the user can safely delete (either not an admin, or
 * sole member of their company so cascade is correct).
 */
async function checkSoleAdminBlocker(userId: string, companyId: string | null): Promise<string | null> {
  if (!companyId) return null;

  // Count distinct users in this company.
  const memberCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.companyId, companyId));
  const totalMembers = Number(memberCount[0]?.count ?? 0);
  if (totalMembers <= 1) {
    // Sole member — cascade deletion of company is correct.
    return null;
  }

  // Does this user hold the Admin role for this company?
  const adminRole = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(eq(roles.companyId, companyId), eq(roles.name, "Admin")))
    .limit(1);
  if (!adminRole[0]) return null;

  const userIsAdmin = await db
    .select({ userId: userRoleAssignments.userId })
    .from(userRoleAssignments)
    .where(and(
      eq(userRoleAssignments.userId, userId),
      eq(userRoleAssignments.roleId, adminRole[0].id),
      eq(userRoleAssignments.companyId, companyId),
    ))
    .limit(1);
  if (!userIsAdmin[0]) return null;

  // Count other admins in the same company.
  const otherAdmins = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userRoleAssignments)
    .where(and(
      eq(userRoleAssignments.roleId, adminRole[0].id),
      eq(userRoleAssignments.companyId, companyId),
      sql`${userRoleAssignments.userId} != ${userId}`,
    ));
  const otherAdminCount = Number(otherAdmins[0]?.count ?? 0);

  if (otherAdminCount === 0) {
    return `You are the only admin of this company (${totalMembers - 1} other members exist). Transfer the Admin role to another user via Settings → Access Control before deleting your account.`;
  }
  return null;
}

export async function requestAccountDeletion(input: {
  userId: string;
  reason?: string;
  ipAddress?: string;
}): Promise<DeletionRequestResult> {
  const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
  if (!user) {
    return { status: "blocked", blockReason: "User not found" };
  }

  // Already a pending deletion?
  const [existing] = await db
    .select()
    .from(accountDeletionRequests)
    .where(and(
      eq(accountDeletionRequests.userId, input.userId),
      eq(accountDeletionRequests.status, "pending"),
    ))
    .limit(1);
  if (existing) {
    return {
      status: "already_pending",
      scheduledFor: existing.scheduledFor,
      requestId: existing.id,
    };
  }

  // Sole-admin gate.
  const blockReason = await checkSoleAdminBlocker(input.userId, user.companyId);
  if (blockReason) {
    return { status: "blocked", blockReason };
  }

  const scheduledFor = new Date(Date.now() + DELETION_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  const [row] = await db
    .insert(accountDeletionRequests)
    .values({
      userId: input.userId,
      scheduledFor,
      status: "pending",
      reason: input.reason ?? null,
      requestedFromIp: input.ipAddress ?? null,
    })
    .returning();

  return {
    status: "scheduled",
    scheduledFor: row.scheduledFor,
    requestId: row.id,
  };
}

export async function cancelAccountDeletion(userId: string): Promise<{ cancelled: boolean; previouslyScheduledFor?: Date }> {
  const [existing] = await db
    .select()
    .from(accountDeletionRequests)
    .where(and(
      eq(accountDeletionRequests.userId, userId),
      eq(accountDeletionRequests.status, "pending"),
    ))
    .limit(1);
  if (!existing) {
    return { cancelled: false };
  }

  await db
    .update(accountDeletionRequests)
    .set({ status: "cancelled", cancelledAt: new Date() })
    .where(eq(accountDeletionRequests.id, existing.id));

  return { cancelled: true, previouslyScheduledFor: existing.scheduledFor };
}

export async function getDeletionStatus(userId: string): Promise<{
  status: DeletionStatus | "none";
  requestedAt?: Date;
  scheduledFor?: Date;
  daysRemaining?: number;
}> {
  const [pending] = await db
    .select()
    .from(accountDeletionRequests)
    .where(and(
      eq(accountDeletionRequests.userId, userId),
      eq(accountDeletionRequests.status, "pending"),
    ))
    .orderBy(sql`${accountDeletionRequests.requestedAt} DESC`)
    .limit(1);

  if (pending) {
    const now = new Date();
    const msRemaining = pending.scheduledFor.getTime() - now.getTime();
    return {
      status: "pending",
      requestedAt: pending.requestedAt,
      scheduledFor: pending.scheduledFor,
      daysRemaining: Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24))),
    };
  }

  return { status: "none" };
}

/**
 * Cancel any active Stripe subscriptions associated with this user
 * BEFORE we delete the user row. Without this step, a user requests
 * deletion → 30-day grace period elapses → we cascade-delete the user →
 * but Stripe still has an active subscription → recurring monthly
 * charges continue indefinitely on a card belonging to someone who's
 * no longer a customer. That's a $299-$999/mo billing leak per deleted
 * user, plus a major reputation + refund-liability issue.
 *
 * Strategy:
 *   - Find all subscriptions with userId = this user.
 *   - For each one with a stripeSubscriptionId, call
 *     stripe.subscriptions.cancel() (immediate cancel — no grace; we're
 *     past the 30-day window already).
 *   - Update the local subscriptions.status = "canceled" so any
 *     remaining indices/queries see the truth before the user row
 *     disappears.
 *   - Errors during Stripe cancel are LOGGED but DON'T block the user
 *     deletion. Rationale: customer's primary right is data deletion
 *     (GDPR Article 17); a residual Stripe subscription is a billing
 *     ops issue that can be cleaned up manually from the Stripe
 *     dashboard. We surface the failure loudly so ops sees it.
 *
 * Returns the count of subscriptions successfully canceled vs failed.
 */
async function cancelStripeSubscriptionsForUser(userId: string): Promise<{ canceled: number; failed: number }> {
  let canceled = 0;
  let failed = 0;

  // Find every subscription owned by this user that's still in a
  // billable state. "canceled" / "past_due" / "incomplete_expired" are
  // already terminal so we skip them.
  const userSubs = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId));

  const billableSubs = userSubs.filter(s =>
    s.stripeSubscriptionId && (s.status === "active" || s.status === "trialing" || s.status === "past_due")
  );

  if (billableSubs.length === 0) {
    return { canceled, failed };
  }

  let stripe: Awaited<ReturnType<typeof getUncachableStripeClient>> | null = null;
  try {
    stripe = await getUncachableStripeClient();
  } catch (err) {
    // Stripe client not configured (e.g., STRIPE_SECRET_KEY missing in
    // dev). Log loudly so the operator notices, then continue with user
    // deletion — the user's right to erasure shouldn't be held hostage
    // to misconfigured infra.
    console.error(`[AccountDeletion] Cannot reach Stripe to cancel subs for user=${userId}; user will be deleted but ${billableSubs.length} Stripe subscription(s) need manual cleanup:`, err);
    return { canceled: 0, failed: billableSubs.length };
  }

  for (const sub of billableSubs) {
    try {
      await stripe.subscriptions.cancel(sub.stripeSubscriptionId!);
      await db
        .update(subscriptions)
        .set({ status: "canceled", updatedAt: new Date() })
        .where(eq(subscriptions.id, sub.id));
      canceled++;
      console.log(`[AccountDeletion] Canceled Stripe subscription ${sub.stripeSubscriptionId} for user=${userId}`);
    } catch (err: any) {
      // If Stripe says "No such subscription" (404), treat as already-
      // canceled — flip local row and move on.
      if (err?.statusCode === 404 || err?.code === "resource_missing") {
        await db
          .update(subscriptions)
          .set({ status: "canceled", updatedAt: new Date() })
          .where(eq(subscriptions.id, sub.id));
        canceled++;
        console.log(`[AccountDeletion] Stripe subscription ${sub.stripeSubscriptionId} already gone; marked canceled locally`);
        continue;
      }
      failed++;
      console.error(`[AccountDeletion] FAILED to cancel Stripe subscription ${sub.stripeSubscriptionId} for user=${userId} — MANUAL CLEANUP REQUIRED in Stripe dashboard:`, err);
    }
  }

  return { canceled, failed };
}

/**
 * Background sweep — runs once daily via backgroundJobs.ts.
 * Processes any deletion request whose scheduledFor has passed and is
 * still pending. Sequence:
 *   1. Cancel any active Stripe subscriptions for the user (so we stop
 *      billing them after we delete their account record).
 *   2. Mark the deletion request status=completed (audit trail before
 *      the cascade nukes the request row alongside the user).
 *   3. DELETE the user row. FKs handle dependents (auth_sessions,
 *      user_role_assignments, team_invitations, password_reset_tokens,
 *      etc.).
 *
 * Idempotent: if the deletion request row was already deleted by the
 * user cascade (FK on userId), we just skip.
 */
export async function processDueDeletions(): Promise<{ processed: number; errors: number; subscriptionsCanceled: number; subscriptionsFailed: number }> {
  const due = await db
    .select()
    .from(accountDeletionRequests)
    .where(and(
      eq(accountDeletionRequests.status, "pending"),
      lte(accountDeletionRequests.scheduledFor, new Date()),
    ));

  let processed = 0;
  let errors = 0;
  let subscriptionsCanceled = 0;
  let subscriptionsFailed = 0;

  for (const req of due) {
    try {
      // (1) Cancel Stripe subscriptions FIRST. If we delete the user
      // before this, the userId on subscriptions becomes null (FK
      // onDelete: set null) and we lose the link Stripe-side.
      const cancelResult = await cancelStripeSubscriptionsForUser(req.userId);
      subscriptionsCanceled += cancelResult.canceled;
      subscriptionsFailed += cancelResult.failed;

      // (2) Mark complete — the cascade below will delete this row
      // along with the user. Marking before guarantees the status
      // transition is logged even if the cascade fails partway.
      await db
        .update(accountDeletionRequests)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(accountDeletionRequests.id, req.id));

      // (3) Cascade-delete the user. FKs handle dependents.
      await db.delete(users).where(eq(users.id, req.userId));

      processed++;
      console.log(`[AccountDeletion] Completed deletion for user=${req.userId} (request=${req.id}); canceled ${cancelResult.canceled} Stripe subs, ${cancelResult.failed} cancel-failures`);
    } catch (err) {
      errors++;
      console.error(`[AccountDeletion] Failed deletion for user=${req.userId} (request=${req.id}):`, err);
    }
  }

  if (processed > 0 || errors > 0) {
    console.log(`[AccountDeletion] Sweep complete: ${processed} processed, ${errors} errors, ${subscriptionsCanceled} subs canceled, ${subscriptionsFailed} sub-cancel failures`);
  }
  return { processed, errors, subscriptionsCanceled, subscriptionsFailed };
}
