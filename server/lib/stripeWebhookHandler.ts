/**
 * Stripe Webhook Handler
 * Verifies signature, routes events, updates DB atomically.
 * Fail-closed: rejects any webhook that cannot be signature-verified.
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

export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
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

  log("info", `Processing event: ${event.type} (${event.id})`);

  try {
    await routeEvent(event);
    res.json({ received: true, eventType: event.type });
  } catch (err: any) {
    log("error", `Handler error for ${event.type}: ${err.message}`);
    res.status(500).json({ error: "Webhook handler failed." });
  }
}

async function routeEvent(event: any): Promise<void> {
  switch (event.type) {
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
