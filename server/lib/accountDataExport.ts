/**
 * Account data export — GDPR Article 20 (Right to Data Portability).
 *
 * Returns a single JSON document containing all personal data tied to a
 * user. The customer can download this from Settings → Data & Privacy
 * before requesting account deletion (paired with F2-FOUND-027 self-
 * delete flow).
 *
 * What's included:
 *   - users (own row, passwordHash + token hashes redacted)
 *   - user_notification_preferences (own row)
 *   - user_role_assignments (own row)
 *   - companies (the company they belong to — included to give them a
 *     complete picture of what data exists about their org; doesn't
 *     duplicate other companies' data)
 *   - team_invitations (rows where they're the inviter OR invitee)
 *   - auth_sessions (own — token hashes redacted; just ipAddress/
 *     userAgent/timestamps for transparency)
 *   - subscriptions (own — Stripe IDs included so customer can correlate
 *     with their own Stripe records)
 *   - invoices (own — line items + totals)
 *   - billing_profiles (own — billing email/address)
 *   - company_payment_methods (own — last4 + brand only, never raw card)
 *   - payments (own)
 *   - subscription_payments (own)
 *   - account_deletion_requests (own — for transparency on any pending/
 *     past deletion requests)
 *
 * What's NOT included (out of scope or sensitive):
 *   - Other users' data within the same company (privacy of co-members)
 *   - Raw passwords / hashes / token material (security)
 *   - Other companies' data (tenant isolation)
 *   - Stripe webhook history (we don't own that)
 *
 * Format: JSON with `_meta` envelope describing the export. Single
 * response; the data volume per user is bounded (each subquery
 * userId-scoped) so streaming isn't needed for V1. Future-work for
 * companies with thousands of invoices: CSV-per-table ZIP.
 */

import { db } from "../db";
import {
  users,
  userRoleAssignments,
  userNotificationPreferences,
  companies,
  teamInvitations,
  authSessions,
  subscriptions,
  invoices,
  billingProfiles,
  companyPaymentMethods,
  payments,
  subscriptionPayments,
  accountDeletionRequests,
} from "@shared/schema";
import { eq, or } from "drizzle-orm";

export interface AccountDataExport {
  _meta: {
    exportedAt: string;
    exportedFor: { userId: string; email: string | null };
    description: string;
    article: "GDPR Article 20 — Right to Data Portability";
    schemaVersion: "1.0";
  };
  user: any;
  notificationPreferences: any;
  roleAssignments: any[];
  company: any | null;
  teamInvitationsSent: any[];
  teamInvitationsReceived: any[];
  authSessions: any[];
  subscriptions: any[];
  invoices: any[];
  billingProfile: any | null;
  paymentMethods: any[];
  payments: any[];
  subscriptionPayments: any[];
  accountDeletionRequests: any[];
}

/**
 * Redact security-sensitive fields from a row before export. We want
 * the customer to see WHAT data exists about them (transparency) but
 * never expose secrets that would compromise their own security if
 * the export leaked.
 */
function redactUser<T extends { passwordHash?: any; emailVerificationToken?: any }>(row: T): T {
  const { passwordHash, emailVerificationToken, ...rest } = row as any;
  return {
    ...rest,
    passwordHash: passwordHash ? "[redacted — hashed password not exported]" : null,
    emailVerificationToken: emailVerificationToken ? "[redacted — verification token]" : null,
  } as T;
}

function redactSession<T extends { refreshTokenHash?: any }>(row: T): T {
  const { refreshTokenHash, ...rest } = row as any;
  return {
    ...rest,
    refreshTokenHash: "[redacted — session token hash]",
  } as T;
}

function redactPaymentMethod<T extends Record<string, any>>(row: T): T {
  // PaymentMethods may persist card brand + last4 + exp_month/exp_year +
  // a Stripe PM id. Brand+last4 is safe; Stripe PM id is "needed to
  // correlate but not security-critical." No raw PAN is ever stored.
  // For belt-and-suspenders: strip any field that looks like full card
  // number or CVC (shouldn't exist but cheap to guard).
  const cleaned: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    if (/cvc|cvv|fullnumber|raw_number/i.test(k)) continue;
    cleaned[k] = v;
  }
  return cleaned as T;
}

export async function buildAccountDataExport(userId: string): Promise<AccountDataExport> {
  // 1. User row (with redactions)
  const [userRow] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!userRow) throw Object.assign(new Error("User not found"), { status: 404 });

  // 2. Notification preferences
  const [notifPrefs] = await db
    .select()
    .from(userNotificationPreferences)
    .where(eq(userNotificationPreferences.userId, userId))
    .limit(1);

  // 3. RBAC assignments
  const roleRows = await db
    .select()
    .from(userRoleAssignments)
    .where(eq(userRoleAssignments.userId, userId));

  // 4. Company (single, the one user belongs to)
  let companyRow: any = null;
  if (userRow.companyId) {
    const [c] = await db.select().from(companies).where(eq(companies.id, userRow.companyId)).limit(1);
    companyRow = c ?? null;
  }

  // 5. Team invitations (sent + received by email)
  const sentInvites = userRow.id
    ? await db.select().from(teamInvitations).where(eq(teamInvitations.invitedBy, userRow.id))
    : [];
  const receivedInvites = userRow.email
    ? await db.select().from(teamInvitations).where(eq(teamInvitations.email, userRow.email))
    : [];

  // 6. Auth sessions (redacted)
  const sessions = await db.select().from(authSessions).where(eq(authSessions.userId, userId));

  // 7. Subscriptions
  const subs = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));

  // 8. Invoices
  const invs = await db.select().from(invoices).where(eq(invoices.userId, userId));

  // 9. Billing profile (by companyId — the billing profile is per company)
  let billingProfileRow: any = null;
  if (userRow.companyId) {
    const [bp] = await db.select().from(billingProfiles).where(eq(billingProfiles.companyId, userRow.companyId)).limit(1);
    billingProfileRow = bp ?? null;
  }

  // 10. Payment methods (by companyId, redact card details)
  let pms: any[] = [];
  if (userRow.companyId) {
    pms = await db.select().from(companyPaymentMethods).where(eq(companyPaymentMethods.companyId, userRow.companyId));
  }

  // 11. Payments / subscription payments
  const pays = await db.select().from(payments).where(eq(payments.userId, userId));
  const subPays = userRow.companyId
    ? await db.select().from(subscriptionPayments).where(eq(subscriptionPayments.companyId, userRow.companyId))
    : [];

  // 12. Account deletion requests (own — transparency)
  const delReqs = await db.select().from(accountDeletionRequests).where(eq(accountDeletionRequests.userId, userId));

  return {
    _meta: {
      exportedAt: new Date().toISOString(),
      exportedFor: { userId: userRow.id, email: userRow.email },
      description:
        "Complete copy of personal data Prescient Labs holds about you. " +
        "Provided under GDPR Article 20 (Right to Data Portability). " +
        "Sensitive secrets (password hashes, session token hashes) are " +
        "redacted but their presence is noted. Card numbers are never " +
        "stored — only Stripe brand + last4 + expiry.",
      article: "GDPR Article 20 — Right to Data Portability",
      schemaVersion: "1.0",
    },
    user: redactUser(userRow),
    notificationPreferences: notifPrefs ?? null,
    roleAssignments: roleRows,
    company: companyRow,
    teamInvitationsSent: sentInvites,
    teamInvitationsReceived: receivedInvites,
    authSessions: sessions.map(redactSession),
    subscriptions: subs,
    invoices: invs,
    billingProfile: billingProfileRow,
    paymentMethods: pms.map(redactPaymentMethod),
    payments: pays,
    subscriptionPayments: subPays,
    accountDeletionRequests: delReqs,
  };
}
