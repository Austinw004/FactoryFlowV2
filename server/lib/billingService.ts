/**
 * Billing Service \u2014 Enterprise SaaS Subscription + Usage-Based Billing
 *
 * 4 Plans (ALL features included on ALL plans \u2014 differences are billing mechanics ONLY):
 *   1. monthly_growth     \u2014 $799/month                 (the monthly option)
 *   2. annual_growth      \u2014 $7,990/year  (~17% discount) (the annual option)
 *   3. usage_based        \u2014 $199/month base + $2/SKU overage (the meter-based option)
 *   4. performance        \u2014 $100/month + 10\u201320% of verified savings (the percentage option)
 *
 * The legacy "starter" tier ($299/mo, $2,990/yr) was retired 2026-05 \u2014 Growth is
 * now the single fixed-subscription tier (monthly or annual).
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

// Stripe price IDs sourced from the live Prescient Labs Stripe account
// (acct_1SZFrW9F4Ysa19m8) on 2026-04-25 via Stripe API. These are the
// authoritative IDs that /api/stripe/checkout uses to spin up Checkout
// sessions. If you create a new Price in Stripe (e.g. for a coupon or
// new tier) update the matching field here \u2014 the server side won't
// pick it up automatically.
//
// Override per-environment by setting STRIPE_PRICE_<KEY>_<INTERVAL> env
// vars (e.g. STRIPE_PRICE_STARTER_MONTHLY=price_xxxx) \u2014 useful if you
// keep separate test vs live prices and want to swap without a redeploy.

const stripePriceId = (key: string, fallback: string): string =>
  process.env[`STRIPE_PRICE_${key}`]?.trim() || fallback;

export const BILLING_PLANS = {
  monthly_growth: {
    id:          "monthly_growth",
    name:        "Monthly Growth",
    description: "Full platform access, billed monthly \u2014 higher tier billing",
    priceCents:  79900,       // $799.00
    currency:    "usd",
    interval:    "month" as const,
    intervalCount: 1,
    type:        "subscription" as const,
    featureGating: false,
    stripePriceId: stripePriceId("GROWTH_MONTHLY", "price_1TLvZj9F4Ysa19m86mw8fPZb"),
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
    stripePriceId: stripePriceId("GROWTH_ANNUAL", "price_1TLvZk9F4Ysa19m8idqygXcf"),
  },
  usage_based: {
    id:           "usage_based",
    name:         "Usage-Based",
    description:  "Full platform access \u2014 $199/month base + $2/SKU overage (100 SKUs included, capped at $799/mo)",
    baseFeeCents: 19900,      // $199.00/month
    baseSkus:     100,        // First 100 SKUs included
    overageRate:  "2.00",    // $2.00 per additional SKU
    monthlyCapCents: 79900,  // $799.00 cap (then upgrade to Growth)
    currency:     "usd",
    interval:     "month" as const,
    type:         "usage" as const,
    featureGating: false,
    stripePriceId: stripePriceId("USAGE_MONTHLY", "price_1TLvZl9F4Ysa19m8JUrRFfRo"),
  },
  performance: {
    id:              "performance",
    name:            "Performance-Based",
    description:     "$100/month platform fee + 10\u201320% of verified, realized savings. Beyond the base fee, you only pay when we measurably save you money.",
    baseFeeCents:    10000,    // $100.00/month \u2014 always charged (platform fee)
    feePercentageMin: 0.10,    // 10% of verified savings
    feePercentageMax: 0.20,    // 20% of verified savings
    feePercentageDefault: 0.15, // 15% default
    currency:        "usd",
    interval:        "month" as const,
    type:            "performance" as const,
    featureGating:   false,
    disclaimer:      "Beyond the $100/month platform fee, performance fees apply only to verified, realized savings \u2014 measured from your own operational data against a baseline locked jointly during onboarding, and reviewed with you before each invoice.",
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

// ─── Performance-plan fee computation ─────────────────────────────────────────
// The Performance plan bills two parts each period:
//   1. baseFeeCents — the fixed $100/month platform fee, ALWAYS charged.
//   2. appliedPercentage × verifiedSavingsCents — only on positive, VERIFIED savings.
//
// "Verified, realized savings" is a MEASURED quantity, never a model self-
// assertion: it is the reduction in the customer's own inventory-carrying +
// stockout/expedite + procurement cost over the period, computed from their
// operational data against a baseline locked jointly during onboarding, and
// reviewed with the customer before the invoice issues. A period with zero or
// negative verified savings bills ONLY the base fee — the customer is never
// charged a performance fee for value that wasn't measured and agreed. The
// negotiated rate is always clamped into the published 10–20% band.
export interface PerformanceFeeResult {
  baseFeeCents: number;          // always charged
  verifiedSavingsCents: number;  // agreed, measured savings (clamped to >= 0)
  appliedPercentage: number;     // clamped into [feePercentageMin, feePercentageMax]
  performanceFeeCents: number;   // appliedPercentage × verifiedSavingsCents
  totalCents: number;            // base + performance
}

export function computePerformanceFee(
  verifiedSavingsCents: number,
  feePercentage: number = BILLING_PLANS.performance.feePercentageDefault,
): PerformanceFeeResult {
  const plan = BILLING_PLANS.performance;
  const appliedPercentage = Math.max(
    plan.feePercentageMin,
    Math.min(plan.feePercentageMax, feePercentage),
  );
  const verified =
    Number.isFinite(verifiedSavingsCents) && verifiedSavingsCents > 0
      ? Math.round(verifiedSavingsCents)
      : 0;
  const performanceFeeCents = Math.round(verified * appliedPercentage);
  return {
    baseFeeCents: plan.baseFeeCents,
    verifiedSavingsCents: verified,
    appliedPercentage,
    performanceFeeCents,
    totalCents: plan.baseFeeCents + performanceFeeCents,
  };
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
  logger.info("billing" as any, "Stripe customer created", { userId, customerId: customer.id });
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

  // \u2500\u2500 Server-side authoritative Stripe price lookup \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  // Prior code took stripePriceId from the request body (input.stripePriceId).
  // That meant a malicious client could pass a $1 price ID and create a
  // subscription against the $299 plan. Always derive from BILLING_PLANS,
  // server-side. The client param is now ignored (and the schema-level field
  // remains optional so existing integrations don't 400 \u2014 we just don't
  // honor it).
  const planStripePriceId: string | undefined = (plan as any).stripePriceId;

  // \u2500\u2500 Payment-method gate \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  // For "subscription" and "usage" plans, recurring charges require a card
  // on file unless the caller is explicitly granting a trial. Prior code
  // happily created a DB record with status="active" + stripeSubscriptionId=
  // null whenever paymentMethodId was omitted, which gave the caller free
  // access to the service for the full period_end window. Block that.
  const requiresPaymentMethod =
    (plan.type === "subscription" || plan.type === "usage") &&
    !input.paymentMethodId &&
    !(input.trialDays && input.trialDays > 0);
  if (requiresPaymentMethod) {
    throw Object.assign(
      new Error("Payment method required. Provide paymentMethodId (or trialDays for sales-issued trials)."),
      { code: "PAYMENT_METHOD_REQUIRED", status: 400 },
    );
  }

  const stripeCustomerId = await ensureStripeCustomer(input.userId, input.email, input.name);
  const stripe = await getUncachableStripeClient();

  if (input.paymentMethodId) {
    await stripe.paymentMethods.attach(input.paymentMethodId, { customer: stripeCustomerId });
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: { default_payment_method: input.paymentMethodId },
    });
  }

  // \u2500\u2500 Stripe subscription creation \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  let stripeSubId: string | undefined;
  if (planStripePriceId) {
    try {
      const sub = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: planStripePriceId }],
        trial_period_days: input.trialDays,
        metadata: { userId: input.userId, planId: input.planId, companyId: input.companyId ?? "" },
      });
      stripeSubId = sub.id;
    } catch (stripeErr: any) {
      // Stripe rejected the subscription create (e.g., card declined, price
      // archived). Don't insert a DB record claiming active access to a
      // service the customer isn't being charged for.
      logger.error("billing" as any, "Stripe subscription create failed", {
        userId: input.userId, planId: input.planId, error: stripeErr?.message ?? String(stripeErr),
      });
      throw Object.assign(
        new Error(stripeErr?.message ?? "Stripe subscription creation failed."),
        { code: "STRIPE_ERROR", status: 502 },
      );
    }
  } else if (plan.type !== "performance") {
    // "performance" plans are intentionally manual (sales-provisioned, no
    // Stripe price). Everything else without a stripePriceId is a config
    // bug, not a free-tier case.
    logger.error("billing" as any, "Plan missing stripePriceId \u2014 refusing to create active sub", {
      userId: input.userId, planId: input.planId,
    });
    throw Object.assign(
      new Error(`Plan ${input.planId} is missing Stripe configuration. Contact support.`),
      { code: "PLAN_MISCONFIGURED", status: 500 },
    );
  }

  const now = new Date();
  const periodEnd = plan.type === "subscription"
    ? new Date(now.getTime() + ((plan as any).interval === "year" ? 365 : 30) * 24 * 60 * 60 * 1000)
    : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Status: "active" only when Stripe actually has a subscription on file
  // (or when trial was explicitly granted by sales). For the manual-billed
  // "performance" plan, mark as "pending_setup" so trial-check middleware
  // doesn't treat it as paid access until sales completes provisioning.
  let dbStatus: string;
  if (stripeSubId) {
    dbStatus = input.trialDays && input.trialDays > 0 ? "trialing" : "active";
  } else if (plan.type === "performance") {
    dbStatus = "pending_setup";
  } else {
    // Defensive \u2014 we shouldn't reach here given the gates above.
    dbStatus = "incomplete";
  }

  const [sub] = await db.insert(subscriptions).values({
    userId:              input.userId,
    companyId:           input.companyId ?? null,
    planId:              input.planId,
    status:              dbStatus,
    stripeCustomerId,
    stripeSubscriptionId: stripeSubId ?? null,
    stripePriceId:       planStripePriceId ?? null,
    currentPeriodStart:  now,
    currentPeriodEnd:    periodEnd,
    ...((plan as any).type === "usage" ? {
      usageBaseFeeCents: (plan as any).baseFeeCents,
      usageRatePerUnit:  (plan as any).perUnitRate,
      usageRatePercent:  (plan as any).spendRate,
    } : {}),
  }).returning();

  logger.info("billing" as any, "Subscription created", {
    userId: input.userId, planId: input.planId, subId: sub.id, status: dbStatus, stripeSubId: stripeSubId ?? null,
  });
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
    logger.warn("billing" as any, "Usage report to Stripe failed", { subscriptionId, error: err.message });
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

  logger.info("billing" as any, "Invoice generated", { invoiceId: inv.id, userId: input.userId, total: subtotal });
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
