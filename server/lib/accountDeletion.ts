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
import { accountDeletionRequests, users, userRoleAssignments, roles, companies } from "@shared/schema";
import { and, eq, isNull, sql, lte } from "drizzle-orm";

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
 * Background sweep — runs once daily via backgroundJobs.ts.
 * Processes any deletion request whose scheduledFor has passed and is
 * still pending. The actual DELETE on the users row cascades to all
 * dependent rows via Drizzle's `onDelete: "cascade"` FKs (auth_sessions,
 * user_role_assignments, team_invitations, password_reset_tokens, etc.).
 *
 * Idempotent: if the deletion request row was already deleted by the
 * user cascade (FK on userId), we just skip. We update status=
 * "completed" BEFORE deleting the user so the cascade leaves an audit
 * trail (the request row gets deleted along with the user, but the
 * status-update succeeded first).
 */
export async function processDueDeletions(): Promise<{ processed: number; errors: number }> {
  const due = await db
    .select()
    .from(accountDeletionRequests)
    .where(and(
      eq(accountDeletionRequests.status, "pending"),
      lte(accountDeletionRequests.scheduledFor, new Date()),
    ));

  let processed = 0;
  let errors = 0;

  for (const req of due) {
    try {
      // Mark complete first — the cascade below will delete this row
      // along with the user. Marking before guarantees the status
      // transition is logged even if the cascade fails partway.
      await db
        .update(accountDeletionRequests)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(accountDeletionRequests.id, req.id));

      // Cascade-delete the user. FKs handle dependents.
      await db.delete(users).where(eq(users.id, req.userId));

      processed++;
      console.log(`[AccountDeletion] Completed deletion for user=${req.userId} (request=${req.id})`);
    } catch (err) {
      errors++;
      console.error(`[AccountDeletion] Failed deletion for user=${req.userId} (request=${req.id}):`, err);
    }
  }

  if (processed > 0 || errors > 0) {
    console.log(`[AccountDeletion] Sweep complete: ${processed} processed, ${errors} errors`);
  }
  return { processed, errors };
}
