/**
 * Payment Methods Service
 * Manages multi-card storage per company, subscription creation,
 * and supplier payment execution.  Audit logging is performed
 * by the calling route handlers (which hold the req object).
 */

import { db } from "../db";
import {
  companyPaymentMethods,
  subscriptionPayments,
  purchaseTransactions,
  purchaseIntents,
  billingProfiles,
  type CompanyPaymentMethod,
  type InsertCompanyPaymentMethod,
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { getUncachableStripeClient } from "../stripeClient";

// ─── Plan → Stripe price ID map ────────────────────────────────────────────────
const PLAN_PRICE_IDS: Record<string, string> = {
  monthly_starter: process.env.STRIPE_PRICE_MONTHLY_STARTER || "price_monthly_starter",
  monthly_growth:  process.env.STRIPE_PRICE_MONTHLY_GROWTH  || "price_monthly_growth",
  annual_starter:  process.env.STRIPE_PRICE_ANNUAL_STARTER  || "price_annual_starter",
  annual_growth:   process.env.STRIPE_PRICE_ANNUAL_GROWTH   || "price_annual_growth",
  usage_based:     process.env.STRIPE_PRICE_USAGE_BASED     || "price_usage_based",
  performance:     process.env.STRIPE_PRICE_PERFORMANCE     || "price_performance",
};

// ─── List saved payment methods for a company ──────────────────────────────────
export async function listCompanyPaymentMethods(
  companyId: string,
): Promise<CompanyPaymentMethod[]> {
  return db
    .select()
    .from(companyPaymentMethods)
    .where(eq(companyPaymentMethods.companyId, companyId))
    .orderBy(companyPaymentMethods.createdAt);
}

// ─── Save an attached Stripe PM to DB ──────────────────────────────────────────
export async function addCompanyPaymentMethod(
  data: InsertCompanyPaymentMethod,
): Promise<CompanyPaymentMethod> {
  const [row] = await db
    .insert(companyPaymentMethods)
    .values(data)
    .onConflictDoUpdate({
      target: companyPaymentMethods.stripePaymentMethodId,
      set: {
        brand:    data.brand,
        last4:    data.last4,
        expMonth: data.expMonth,
        expYear:  data.expYear,
      },
    })
    .returning();
  return row;
}

// ─── Set a card as the default (unsets all others for the company) ────────────
export async function setDefaultPaymentMethod(
  companyId: string,
  pmRowId: string,
): Promise<CompanyPaymentMethod> {
  // Unset all defaults for this company
  await db
    .update(companyPaymentMethods)
    .set({ isDefault: false })
    .where(eq(companyPaymentMethods.companyId, companyId));

  // Set the target and return it
  const [row] = await db
    .update(companyPaymentMethods)
    .set({ isDefault: true })
    .where(
      and(
        eq(companyPaymentMethods.companyId, companyId),
        eq(companyPaymentMethods.id, pmRowId),
      ),
    )
    .returning();

  if (!row) throw new Error("Payment method not found");

  // Mirror to billing profile
  await db
    .update(billingProfiles)
    .set({
      defaultPaymentMethodId: row.stripePaymentMethodId,
      paymentMethodLast4: row.last4,
      paymentMethodBrand: row.brand,
    })
    .where(eq(billingProfiles.companyId, companyId));

  return row;
}

// ─── Remove a card from DB and detach from Stripe ─────────────────────────────
export async function removeCompanyPaymentMethod(
  companyId: string,
  pmRowId: string,
): Promise<void> {
  const [row] = await db
    .select()
    .from(companyPaymentMethods)
    .where(
      and(
        eq(companyPaymentMethods.companyId, companyId),
        eq(companyPaymentMethods.id, pmRowId),
      ),
    );

  if (!row) throw new Error("Payment method not found");

  const stripe = await getUncachableStripeClient();
  await stripe.paymentMethods.detach(row.stripePaymentMethodId);

  await db
    .delete(companyPaymentMethods)
    .where(eq(companyPaymentMethods.id, pmRowId));
}

// ─── Create or update a Stripe subscription for a company ────────────────────
export async function createOrUpdateSubscription(
  planId: string,
  stripeCustomerId: string,
): Promise<{ subscriptionId: string; status: string; clientSecret?: string }> {
  const priceId = PLAN_PRICE_IDS[planId];
  if (!priceId) throw new Error(`Unknown plan: ${planId}`);

  const stripe = await getUncachableStripeClient();

  // Check for existing active subscription to upgrade/downgrade
  const existing = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "active",
    limit: 1,
  });

  let subscription: any;

  if (existing.data.length > 0) {
    const sub = existing.data[0];
    subscription = await stripe.subscriptions.update(sub.id, {
      items: [{ id: sub.items.data[0].id, price: priceId }],
      proration_behavior: "create_prorations",
    });
  } else {
    subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
    });
  }

  const clientSecret =
    subscription.latest_invoice?.payment_intent?.client_secret ?? undefined;

  return { subscriptionId: subscription.id, status: subscription.status, clientSecret };
}

// ─── Execute a supplier payment for an approved purchase intent ───────────────
export async function executeSupplierPayment(
  purchaseIntentId: string,
  companyId: string,
): Promise<{ success: boolean; transactionId?: string; stripePaymentIntentId?: string; error?: string }> {
  const stripe = await getUncachableStripeClient();

  const [intent] = await db
    .select()
    .from(purchaseIntents)
    .where(
      and(
        eq(purchaseIntents.id, purchaseIntentId),
        eq(purchaseIntents.companyId, companyId),
      ),
    );

  if (!intent) return { success: false, error: "Purchase intent not found" };
  if (intent.status !== "approved" && intent.status !== "user_approved") {
    return { success: false, error: `Cannot execute intent in status: ${intent.status}` };
  }

  const [profile] = await db
    .select()
    .from(billingProfiles)
    .where(eq(billingProfiles.companyId, companyId));

  if (!profile?.stripeCustomerId) {
    return { success: false, error: "No Stripe customer on file — set up billing first" };
  }

  const amountCents = Math.round((intent.totalCost || 0) * 100);
  if (amountCents <= 0) return { success: false, error: "Invalid purchase amount" };

  try {
    const pi = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      customer: profile.stripeCustomerId,
      payment_method: profile.defaultPaymentMethodId || undefined,
      confirm: !!profile.defaultPaymentMethodId,
      off_session: true,
      metadata: { companyId, purchaseIntentId },
    });

    const [txRow] = await db
      .insert(purchaseTransactions)
      .values({
        companyId,
        purchaseIntentId,
        stripePaymentIntentId: pi.id,
        amount: amountCents,
        status: pi.status === "succeeded" ? "succeeded" : "pending",
      })
      .returning();

    await db
      .update(purchaseIntents)
      .set({
        stripePaymentIntentId: pi.id,
        executedAt: pi.status === "succeeded" ? new Date() : undefined,
      } as any)
      .where(eq(purchaseIntents.id, purchaseIntentId));

    return { success: true, transactionId: txRow.id, stripePaymentIntentId: pi.id };
  } catch (err: any) {
    const [txRow] = await db
      .insert(purchaseTransactions)
      .values({
        companyId,
        purchaseIntentId,
        amount: amountCents,
        status: "failed",
        failureReason: err.message,
      })
      .returning();

    return { success: false, transactionId: txRow.id, error: err.message };
  }
}

// ─── Record subscription invoice payment (called from webhook handler) ────────
export async function recordSubscriptionPayment(data: {
  companyId: string;
  stripeInvoiceId: string;
  amount: number;
  status: "paid" | "failed";
  billingPeriodStart?: Date;
  billingPeriodEnd?: Date;
}): Promise<void> {
  await db
    .insert(subscriptionPayments)
    .values({
      companyId:          data.companyId,
      stripeInvoiceId:    data.stripeInvoiceId,
      amount:             data.amount,
      status:             data.status,
      billingPeriodStart: data.billingPeriodStart,
      billingPeriodEnd:   data.billingPeriodEnd,
    })
    .onConflictDoUpdate({
      target: subscriptionPayments.stripeInvoiceId,
      set: { status: data.status },
    });
}
