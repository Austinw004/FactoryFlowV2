/**
 * Stripe Webhook Handler — legacy env-var-based endpoint.
 *
 * F1 fix from round-24 billing audit: this handler is registered at
 * /api/webhooks/stripe and is the SIMPLER of the two Stripe webhook
 * endpoints in the codebase. The other one, /api/stripe/webhook/:uuid
 * (in server/webhookHandlers.ts), is the canonical handler — it has
 * per-customer UUID secrets, an idempotency table, full refund
 * handling, and more event-type coverage.
 *
 * Both endpoints stay alive so that whichever URL Stripe was
 * configured against keeps working — but this one:
 *   (a) Logs a deprecation warning every time it's hit so the operator
 *       knows to migrate the Stripe dashboard config to the canonical
 *       endpoint.
 *   (b) Implements its own idempotency via event.id deduplication
 *       (in-memory Set) so duplicate-delivery from Stripe doesn't
 *       double-apply the side effects. This isn't as robust as the
 *       canonical handler's DB-backed table (won't survive a restart)
 *       but it closes the immediate-replay window.
 *
 * Once the Stripe dashboard config is confirmed pointed at the
 * canonical /api/stripe/webhook/:uuid endpoint, this handler can be
 * deleted in a follow-up commit. Until then, dual-handlers stay live
 * but consolidated under a single canonical source of truth (the
 * webhookHandlers.ts class).
 */
import type { Request, Response } from "express";
import { db } from "../db";
import { users, payments, supplierPayouts } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getUncachableStripeClient } from "../stripeClient";
import { logger } from "./structuredLogger";

const log = (level: "info" | "warn" | "error", msg: string) =>
  logger[level]("stripe_webhook" as any, msg, {});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// In-memory idempotency cache. Stripe webhooks can re-deliver the same
// event.id on retry; the canonical /api/stripe/webhook/:uuid handler
// uses a DB table for cross-restart idempotency. This in-memory Set is
// good enough for this legacy endpoint until it's deleted, since
// process restarts are infrequent and Stripe's retry window is short
// relative to typical uptime.
//
// Bounded at 10,000 most-recent event IDs (LRU-ish via insertion order;
// we evict the oldest when we hit the cap to prevent unbounded memory
// growth). 10k events covers a comfortable history for high-traffic
// tenants.
const PROCESSED_EVENT_CACHE_SIZE = 10_000;
const processedEvents = new Set<string>();
function markProcessed(eventId: string) {
  if (processedEvents.size >= PROCESSED_EVENT_CACHE_SIZE) {
    // Evict the oldest (Set preserves insertion order).
    const oldest = processedEvents.values().next().value;
    if (oldest !== undefined) processedEvents.delete(oldest);
  }
  processedEvents.add(eventId);
}

export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  // Deprecation signal — surfaces in logs so operators know to migrate
  // the Stripe dashboard webhook URL to /api/stripe/webhook/:uuid.
  // Bounded: only log once per minute per process to avoid flooding.
  warnDeprecatedOnce();

  if (!WEBHOOK_SECRET) {
    log("error", "STRIPE_WEBHOOK_SECRET is not configured — webhook rejected");
    res.status(500).json({ error: "Webhook secret not configured." });
    return;
  }

  const sig = req.headers["stripe-signature"];
  if (!sig) {
    res.status(400).json({ error: "Missing stripe-signature header." });
    return;
  }

  let event: any;
  try {
    const stripe = await getUncachableStripeClient();
    // req.body must be the raw buffer — ensure express.raw() is used for this route
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig as string, WEBHOOK_SECRET);
  } catch (err: any) {
    log("error", `Signature verification failed: ${err.message}`);
    res.status(400).json({ error: "Invalid webhook signature." });
    return;
  }

  // Idempotency check — return 200 for already-processed events so
  // Stripe stops retrying. Without this, a duplicate delivery could
  // double-apply side effects (e.g., 2 invoice.paid → 2 payment rows).
  if (processedEvents.has(event.id)) {
    log("info", `Duplicate event ${event.id} (${event.type}) — skipping`);
    res.json({ received: true, eventType: event.type, duplicate: true });
    return;
  }

  log("info", `Processing event: ${event.type} (${event.id})`);

  try {
    await routeEvent(event);
    markProcessed(event.id);
    res.json({ received: true, eventType: event.type });
  } catch (err: any) {
    log("error", `Handler error for ${event.type}: ${err.message}`);
    res.status(500).json({ error: "Webhook handler failed." });
  }
}

let lastDeprecationLog = 0;
function warnDeprecatedOnce() {
  const now = Date.now();
  if (now - lastDeprecationLog > 60_000) {
    log("warn", "DEPRECATED ENDPOINT HIT: /api/webhooks/stripe — please migrate Stripe dashboard config to /api/stripe/webhook/:uuid (the canonical handler with DB-backed idempotency and full event coverage).");
    lastDeprecationLog = now;
  }
}

async function routeEvent(event: any): Promise<void> {
  switch (event.type) {
    // ── Checkout completion ───────────────────────────────────────────────────
    // Fires the moment a customer finishes Stripe Checkout. Without this case,
    // the user's stripeCustomerId / stripeSubscriptionId are never set on
    // their user record, and every subsequent webhook (subscription.updated,
    // invoice.paid) silently no-ops because their WHERE clause filters by
    // stripeCustomerId — which is NULL.
    case "checkout.session.completed": {
      const session    = event.data.object;
      const customerId = (session.customer as string | null) ?? null;
      const subId      = (session.subscription as string | null) ?? null;
      const customerEmail = (session.customer_details?.email
        ?? session.customer_email
        ?? null) as string | null;

      if (!customerId) {
        log("warn", `checkout.session.completed had no customer (session=${session.id}) — skipped`);
        break;
      }

      // Try to attach stripeCustomerId / stripeSubscriptionId to the user.
      // We trust two link points in order:
      //   (1) metadata.userId set when we created the Checkout session
      //   (2) the email captured by Stripe Checkout
      const metaUserId = session.metadata?.userId as string | undefined;

      let updated = 0;
      if (metaUserId) {
        const r = await db
          .update(users)
          .set({
            stripeCustomerId:     customerId,
            stripeSubscriptionId: subId,
            subscriptionStatus:   "active",
            updatedAt:            new Date(),
          })
          .where(eq(users.id, metaUserId))
          .returning({ id: users.id });
        updated = r.length;
      }
      if (updated === 0 && customerEmail) {
        const r = await db
          .update(users)
          .set({
            stripeCustomerId:     customerId,
            stripeSubscriptionId: subId,
            subscriptionStatus:   "active",
            updatedAt:            new Date(),
          })
          .where(eq(users.email, customerEmail))
          .returning({ id: users.id });
        updated = r.length;
      }

      if (updated === 0) {
        log("warn", `checkout.session.completed couldn't find a user (customer=${customerId}, email=${customerEmail ?? "?"})`);
      } else {
        log("info", `checkout.session.completed — linked customer=${customerId} sub=${subId} → active`);
      }
      break;
    }

    // ── Subscription lifecycle ────────────────────────────────────────────────
    case "invoice.paid": {
      const invoice = event.data.object;
      const customerId = invoice.customer as string;
      await db
        .update(users)
        .set({
          subscriptionStatus: "active",
          updatedAt:          new Date(),
        })
        .where(eq(users.stripeCustomerId, customerId));

      // Record the payment
      await db.insert(payments).values({
        amount:                 invoice.amount_paid,
        currency:               invoice.currency,
        status:                 "succeeded",
        stripePaymentIntentId:  invoice.payment_intent as string | undefined ?? null,
        description:            `Subscription invoice ${invoice.id}`,
        metadata:               JSON.stringify({ invoiceId: invoice.id, customerId }),
      }).onConflictDoNothing();

      log("info", `invoice.paid — customer ${customerId} → active`);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const customerId = invoice.customer as string;
      await db
        .update(users)
        .set({ subscriptionStatus: "past_due", updatedAt: new Date() })
        .where(eq(users.stripeCustomerId, customerId));
      log("warn", `invoice.payment_failed — customer ${customerId} → past_due`);
      break;
    }

    case "customer.subscription.deleted": {
      const sub       = event.data.object;
      const customerId = sub.customer as string;
      await db
        .update(users)
        .set({
          subscriptionStatus:   "canceled",
          stripeSubscriptionId: null,
          updatedAt:            new Date(),
        })
        .where(eq(users.stripeCustomerId, customerId));
      log("info", `customer.subscription.deleted — customer ${customerId} → canceled`);
      break;
    }

    case "customer.subscription.updated": {
      const sub        = event.data.object;
      const customerId = sub.customer as string;
      await db
        .update(users)
        .set({
          subscriptionStatus: sub.status,
          updatedAt:          new Date(),
        })
        .where(eq(users.stripeCustomerId, customerId));
      log("info", `customer.subscription.updated — ${customerId} status=${sub.status}`);
      break;
    }

    // ── Payment intents ───────────────────────────────────────────────────────
    case "payment_intent.succeeded": {
      const pi = event.data.object;
      await db
        .update(payments)
        .set({ status: "succeeded", stripeChargeId: pi.latest_charge ?? null, updatedAt: new Date() })
        .where(eq(payments.stripePaymentIntentId, pi.id));
      log("info", `payment_intent.succeeded — ${pi.id}`);
      break;
    }

    case "payment_intent.payment_failed": {
      const pi = event.data.object;
      await db
        .update(payments)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(payments.stripePaymentIntentId, pi.id));
      log("warn", `payment_intent.payment_failed — ${pi.id}`);
      break;
    }

    // ── Stripe Connect transfers ──────────────────────────────────────────────
    case "transfer.created": {
      const transfer = event.data.object;
      await db
        .update(supplierPayouts)
        .set({ status: "sent", updatedAt: new Date() })
        .where(eq(supplierPayouts.stripeTransferId, transfer.id));
      log("info", `transfer.created — ${transfer.id}`);
      break;
    }

    case "transfer.failed": {
      const transfer = event.data.object;
      await db
        .update(supplierPayouts)
        .set({ status: "failed", failureReason: "Stripe transfer failed", updatedAt: new Date() })
        .where(eq(supplierPayouts.stripeTransferId, transfer.id));
      log("warn", `transfer.failed — ${transfer.id}`);
      break;
    }

    default:
      log("info", `Unhandled event type: ${event.type} — ignored`);
  }
}
