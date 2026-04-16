/**
 * Billing Service — Enterprise SaaS Subscription + Usage-Based Billing
 *
 * 5 Plans (ALL features included on ALL plans — differences are billing mechanics ONLY):
 *   1. monthly_starter    — $299/month
 *   2. monthly_growth     — $799/month
 *   3. annual_starter     — $2,990/year  (~17% discount)
 *   4. annual_growth      — $7,990/year  (~17% discount)
 *   5. usage_based        — $199/month base + $0.02/unit OR 0.25% of procurement spend
 *
 * IMPORTANT: No feature gating anywhere. Plan type is stored for billing mechanics only.
 */
import { db } from "../db";
import {
  users, subscriptions, usageEvents, invoices,
  type Subscription, type UsageEvent, type Invoice,
} from "@shared/schema";
import { eq, and, sum, count, gte, lte, isNull } from "drizzle-orm";
import { getUncachableStripeClient } from "../stripeClient";
import { logger } from "./structuredLogger";

// ─── Plan Definitions ─────────────────────────────────────────────────────────
// All features are available on all plans. These are billing configurations only.

export const BILLING_PLANS = {
  monthly_starter: {
    id:          "monthly_starter",
    name:        "Monthly Starter",
    description: "Full platform access, billed monthly",
    priceCents:  29900,       // $299.00
    currency:    "usd",
    interval:    "month" as const,
    intervalCount: 1,
    type:        "subscription" as const,
    featureGating: false,     // All features included
  },
  monthly_growth: {
    id:          "monthly_growth",
    name:        "Monthly Growth",
    description: "Full platform access, billed monthly — higher tier billing",
    priceCents:  79900,       // $799.00
    currency:    "usd",
    interval:    "month" as const,
    intervalCount: 1,
    type:        "subscription" as const,
    featureGating: false,
  },
  annual_starter: {
    id:          "annual_starter",
    name:        "Annual Starter",
    description: "Full platform access, billed annually (~17% discount vs monthly)",
    priceCents:  299000,      // $2,990.00
    currency:    "usd",
    interval:    "year" as const,
    intervalCount: 1,
    type:        "subscription" as const,
    featureGating: false,
  },
  annual_growth: {
    id:          "annual_growth",
    name:        "Annual Growth",
    description: "Full platform access, billed annually (~17% discount vs monthly)",
    priceCents:  799000,      // $7,990.00
    currency:    "usd",
    interval:    "year" as const,
    intervalCount: 1,
    type:        "subscription" as const,
    featureGating: false,
  },
  usage_based: {
    id:           "usage_based",
    name:         "Usage-Based",
    description:  "Full platform access — $199/month base + $2/SKU overage (100 SKUs included, capped at $799/mo)",
    baseFeeCents: 19900,      // $199.00/month
    baseSkus:     100,        // First 100 SKUs included
    overageRate:  "2.00",    // $2.00 per additional SKU
    monthlyCapCents: 79900,  // $799.00 cap (then upgrade to Growth)
    currency:     "usd",
    interval:     "month" as const,
    type:         "usage" as const,
    featureGating: false,
  },
  performance: {
    id:              "performance",
    name:            "Performance-Based",
    description:     "$100/month + 10–20% of verified, realized savings. Only pay when value is delivered.",
    baseFeeCents:    10000,    // $100.00/month — always charged
    feePercentageMin: 0.10,    // 10% of verified savings
    feePercentageMax: 0.20,    // 20% of verified savings
    feePercentageDefault: 0.15, // 15% default
    currency:        "usd",
    interval:        "month" as const,
    type:            "performance" as const,
    featureGating:   false,
    disclaimer:      "Performance fees apply only to verified, realized savings",
    cta:             ["Start Pilot", "Talk to Sales"],
  },
} as const;

export type PlanId = keyof typeof BILLING_PLANS;

// ─── Platform fee configuration ───────────────────────────────────────────────
// Configurable via environment variable; default 2.5% of transaction amount.
export const PLATFORM_FEE_RATE = parseFloat(process.env.PLATFORM_FEE_RATE ?? "0.025");

export function computePlatformFee(amountCents: number): number {
  return Math.round(amountCents * PLATFORM_FEE_RATE);
}

// ─── Create or retrieve Stripe customer ───────────────────────────────────────

export async function ensureStripeCustomer(userId: string, email: string, name?: string | null): Promise<string> {
  const [user] = await db.select({ stripeCustomerId: users.stripeCustomerId })
    .from(users).where(eq(users.id, userId)).limit(1);

  if (user?.stripeCustomerId) return user.stripeCustomerId;

  const stripe = await getUncachableStripeClient();
  const customer = await stripe.customers.create({
    email,
    name: name ?? undefined,
    metadata: { userId },
  });

  await db.update(users).set({ stripeCustomerId: customer.id, updatedAt: new Date() }).where(eq(users.id, userId));
  logger.info("billing" as any, "Stripe customer created", { userId, details: { customerId: customer.id } });
  return customer.id;
}

// ─── Create subscription ──────────────────────────────────────────────────────

export interface CreateSubscriptionInput {
  userId:          string;
  companyId?:      string | null;
  planId:          PlanId;
  email:           string;
  name?:           string | null;
  paymentMethodId?: string;     // Stripe PaymentMethod ID to attach
  stripePriceId?:  string;     // Override Stripe price ID (from Stripe dashboard)
  trialDays?:      number;
}

export async function createSubscription(input: CreateSubscriptionInput): Promise<Subscription> {
  const plan = BILLING_PLANS[input.planId];
  if (!plan) throw Object.assign(new Error(`Unknown plan: ${input.planId}`), { code: "INVALID_PLAN", status: 400 });

  const stripeCustomerId = await ensureStripeCustomer(input.userId, input.email, input.name);
  const stripe = await getUncachableStripeClient();

  // Attach payment method if provided
  if (input.paymentMethodId) {
    await stripe.paymentMethods.attach(input.paymentMethodId, { customer: stripeCustomerId });
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: { default_payment_method: input.paymentMethodId },
    });
  }

  // Build Stripe subscription params
  let stripeSubId: string | undefined;
  let stripePriceId = input.stripePriceId;

  if (stripePriceId) {
    // Use explicit Stripe price (from dashboard)
    const sub = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: stripePriceId }],
      trial_period_days: input.trialDays,
      metadata: { userId: input.userId, planId: input.planId },
    });
    stripeSubId = sub.id;
  } else {
    // Stripe price not configured — log and proceed with DB record only
    // (Production: create matching Stripe products/prices in dashboard first)
    logger.warn("billing" as any, "stripePriceId not provided — subscription recorded in DB only", {
      userId: input.userId, details: { planId: input.planId }
    });
  }

  const now = new Date();
  const periodEnd = plan.type === "subscription"
    ? new Date(now.getTime() + (plan.interval === "year" ? 365 : 30) * 24 * 60 * 60 * 1000)
    : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [sub] = await db.insert(subscriptions).values({
    userId:              input.userId,
    companyId:           input.companyId ?? null,
    planId:              input.planId,
    status:              "active",
    stripeCustomerId,
    stripeSubscriptionId: stripeSubId ?? null,
    stripePriceId:       stripePriceId ?? null,
    currentPeriodStart:  now,
    currentPeriodEnd:    periodEnd,
    ...(plan.type === "usage" ? {
      usageBaseFeeCents: plan.baseFeeCents,
      usageRatePerUnit:  (plan as any).overageRate ?? null,
      usageRatePercent:  (plan as any).spendRate ?? null,
    } : {}),
  }).returning();

  logger.info("billing" as any, "Subscription created", { userId: input.userId, details: { planId: input.planId, subId: sub.id } });
  return sub;
}

// ─── Record usage event ───────────────────────────────────────────────────────

export interface RecordUsageInput {
  userId:         string;
  companyId?:     string | null;
  subscriptionId: string;
  metricType:     "units_processed" | "procurement_spend";
  quantity:       number;
  metadata?:      Record<string, unknown>;
}

export async function recordUsageEvent(input: RecordUsageInput): Promise<UsageEvent> {
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, input.subscriptionId)).limit(1);
  if (!sub) throw Object.assign(new Error("Subscription not found."), { code: "NOT_FOUND", status: 404 });

  let valueCents: number | null = null;
  if (sub.planId === "usage_based") {
    if (input.metricType === "units_processed" && sub.usageRatePerUnit) {
      valueCents = Math.round(input.quantity * parseFloat(sub.usageRatePerUnit) * 100);
    } else if (input.metricType === "procurement_spend" && sub.usageRatePercent) {
      valueCents = Math.round(input.quantity * parseFloat(sub.usageRatePercent));
    }
  }

  const [event] = await db.insert(usageEvents).values({
    userId:         input.userId,
    companyId:      input.companyId ?? null,
    subscriptionId: input.subscriptionId,
    metricType:     input.metricType,
    quantity:       String(input.quantity),
    valueCents:     valueCents ?? undefined,
    metadata:       input.metadata ?? null,
  }).returning();

  return event;
}

// ─── Report usage to Stripe ───────────────────────────────────────────────────
// Aggregates unreported usage events and sends to Stripe metered billing.

export async function reportUsageToStripe(subscriptionId: string): Promise<{ reported: number; totalQuantity: number }> {
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, subscriptionId)).limit(1);
  if (!sub?.stripeSubscriptionId) {
    return { reported: 0, totalQuantity: 0 };
  }

  const unreported = await db.select().from(usageEvents)
    .where(and(eq(usageEvents.subscriptionId, subscriptionId), eq(usageEvents.reportedToStripe, 0)));

  if (unreported.length === 0) return { reported: 0, totalQuantity: 0 };

  const totalQuantity = unreported.reduce((acc, e) => acc + parseFloat(e.quantity), 0);

  // Report to Stripe
  try {
    const stripe = await getUncachableStripeClient();
    const sub_item = await stripe.subscriptionItems.list({ subscription: sub.stripeSubscriptionId, limit: 1 });
    if (sub_item.data.length > 0) {
      const usageRecord = await (stripe.subscriptionItems as any).createUsageRecord(sub_item.data[0].id, {
        quantity: Math.ceil(totalQuantity),
        timestamp: Math.floor(Date.now() / 1000),
        action: "increment",
      });

      // Mark events as reported
      for (const ev of unreported) {
        await db.update(usageEvents)
          .set({ reportedToStripe: 1, stripeUsageRecordId: usageRecord.id })
          .where(eq(usageEvents.id, ev.id));
      }
    }
  } catch (err: any) {
    logger.warn("billing" as any, "Usage report to Stripe failed", { details: { subscriptionId }, errorMessage: err.message });
  }

  return { reported: unreported.length, totalQuantity };
}

// ─── Generate invoice record ──────────────────────────────────────────────────

export async function generateInvoice(input: {
  userId:         string;
  companyId?:     string | null;
  subscriptionId: string;
  periodStart:    Date;
  periodEnd:      Date;
  lineItems:      Array<{ description: string; quantity: number; unitAmount: number; amount: number }>;
  usageBreakdown?: Record<string, unknown>;
  stripeInvoiceId?: string;
}): Promise<Invoice> {
  const subtotal = input.lineItems.reduce((acc, li) => acc + li.amount, 0);
  const [inv] = await db.insert(invoices).values({
    userId:         input.userId,
    companyId:      input.companyId ?? null,
    subscriptionId: input.subscriptionId,
    stripeInvoiceId: input.stripeInvoiceId ?? null,
    status:         "open",
    total:          subtotal,
    subtotal,
    taxAmount:      0,
    lineItems:      input.lineItems,
    usageBreakdown: input.usageBreakdown ?? null,
    pdfUrl:         null, // set after PDF generation
    periodStart:    input.periodStart,
    periodEnd:      input.periodEnd,
    dueDate:        new Date(input.periodEnd.getTime() + 30 * 24 * 60 * 60 * 1000),
  }).returning();

  logger.info("billing" as any, "Invoice generated", { userId: input.userId, details: { invoiceId: inv.id, total: subtotal } });
  return inv;
}

// ─── Get subscription for user ────────────────────────────────────────────────

export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  const [sub] = await db.select().from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")))
    .limit(1);
  return sub ?? null;
}

// ─── Plan list (for frontend) ─────────────────────────────────────────────────

export function getPlans() {
  return Object.values(BILLING_PLANS).map(plan => ({
    ...plan,
    // Strip internal keys not needed by frontend
    featureGating: undefined,
  }));
}
