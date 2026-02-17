import { getStripeSync } from './stripeClient';
import { db } from './db';
import { users, stripeProcessedEvents } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { logger } from './lib/structuredLogger';

const VALID_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid'] as const;
type SubscriptionStatus = typeof VALID_SUBSCRIPTION_STATUSES[number];

const ALLOWED_TRANSITIONS: Record<string, { to: SubscriptionStatus; allowedFrom: SubscriptionStatus[]; requiredEvent: string }[]> = {
  'checkout.session.completed':          [{ to: 'active',    allowedFrom: ['incomplete', 'trialing'],                              requiredEvent: 'checkout.session.completed' }],
  'customer.subscription.created':       [{ to: 'active',    allowedFrom: ['incomplete', 'trialing'],                              requiredEvent: 'customer.subscription.created' },
                                           { to: 'trialing',  allowedFrom: ['incomplete'],                                         requiredEvent: 'customer.subscription.created' },
                                           { to: 'incomplete', allowedFrom: [],                                                    requiredEvent: 'customer.subscription.created' }],
  'customer.subscription.updated':       [{ to: 'active',    allowedFrom: ['incomplete', 'trialing', 'past_due'],                  requiredEvent: 'customer.subscription.updated' },
                                           { to: 'trialing',  allowedFrom: ['incomplete'],                                         requiredEvent: 'customer.subscription.updated' },
                                           { to: 'past_due',  allowedFrom: ['active', 'trialing'],                                 requiredEvent: 'customer.subscription.updated' },
                                           { to: 'unpaid',    allowedFrom: ['past_due'],                                           requiredEvent: 'customer.subscription.updated' }],
  'customer.subscription.deleted':       [{ to: 'canceled',  allowedFrom: ['active', 'trialing', 'past_due', 'incomplete', 'unpaid', 'incomplete_expired'], requiredEvent: 'customer.subscription.deleted' }],
  'invoice.paid':                        [{ to: 'active',    allowedFrom: ['past_due', 'incomplete'],                              requiredEvent: 'invoice.paid' }],
  'invoice.payment_failed':              [{ to: 'past_due',  allowedFrom: ['active', 'trialing'],                                  requiredEvent: 'invoice.payment_failed' }],
};

function isTransitionAllowed(currentStatus: string | null, newStatus: string, eventType: string): boolean {
  const rules = ALLOWED_TRANSITIONS[eventType];
  if (!rules) return false;

  const rule = rules.find(r => r.to === newStatus);
  if (!rule) return false;

  if (!currentStatus) return true;

  return rule.allowedFrom.includes(currentStatus as SubscriptionStatus);
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string, uuid: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature, uuid);

    let event: any;
    try {
      event = JSON.parse(payload.toString());
    } catch (parseError) {
      logger.error("webhook", "payload_parse_failed", {
        errorMessage: parseError instanceof Error ? parseError.message : String(parseError),
      });
      throw new Error('Invalid webhook payload: unparseable JSON');
    }

    if (!event.id || !event.type) {
      logger.error("webhook", "invalid_event_structure", {
        details: { hasId: !!event.id, hasType: !!event.type },
      });
      throw new Error('Invalid webhook event: missing id or type');
    }

    const eventId = event.id;
    const eventType = event.type;
    const data = event.data?.object;
    const customerId = data?.customer || null;
    const subscriptionId = data?.subscription || data?.id || null;

    const lockAcquired = await this.acquireEventLock(eventId, eventType, customerId, subscriptionId);
    if (!lockAcquired) {
      return;
    }

    try {
      await db.transaction(async (tx) => {
        await WebhookHandlers.handleSubscriptionEvents(event, tx);

        await tx.execute(
          sql`UPDATE stripe_processed_events 
              SET status = 'processed', processed_at = NOW()
              WHERE event_id = ${eventId} AND status = 'processing'`
        );
      });

      logger.webhook("event_processed", {
        details: { eventId, eventType, customerId, subscriptionId },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      try {
        await db.execute(
          sql`UPDATE stripe_processed_events 
              SET status = 'failed', 
                  error_message = ${errorMessage},
                  processed_at = NOW()
              WHERE event_id = ${eventId}`
        );
      } catch (markError) {
        logger.error("webhook", "failed_to_mark_event_failed", {
          errorMessage: markError instanceof Error ? markError.message : String(markError),
          details: { eventId, originalError: errorMessage },
        });
      }

      logger.error("webhook", "event_processing_failed", {
        errorMessage,
        details: { eventId, eventType, customerId, subscriptionId, stack: errorStack },
      });

      throw error;
    }
  }

  private static readonly STALE_LOCK_THRESHOLD_MINUTES = 5;

  private static async acquireEventLock(
    eventId: string, eventType: string, customerId: string | null, subscriptionId: string | null
  ): Promise<boolean> {
    try {
      await db.insert(stripeProcessedEvents).values({
        eventId,
        eventType,
        customerId,
        subscriptionId,
        status: "processing",
      });
      return true;
    } catch (e: any) {
      if (e.code !== '23505') throw e;
    }

    const existing = await db
      .select({
        status: stripeProcessedEvents.status,
        createdAt: stripeProcessedEvents.createdAt,
      })
      .from(stripeProcessedEvents)
      .where(eq(stripeProcessedEvents.eventId, eventId))
      .limit(1);

    const row = existing[0];
    if (!row) return false;

    if (row.status === 'processed') {
      logger.webhook("duplicate_skipped", {
        details: { eventId, eventType, reason: "already_processed" },
      });
      return false;
    }

    if (row.status === 'processing') {
      const ageMs = Date.now() - new Date(row.createdAt).getTime();
      const thresholdMs = this.STALE_LOCK_THRESHOLD_MINUTES * 60 * 1000;

      if (ageMs < thresholdMs) {
        logger.webhook("duplicate_skipped", {
          details: { eventId, eventType, reason: "concurrent_processing", ageMs },
        });
        return false;
      }

      const MAX_STALE_TAKEOVERS = 3;
      const takeoverCount = (row as any).error_message?.match(/Stale lock takeover/g)?.length || 0;
      if (takeoverCount >= MAX_STALE_TAKEOVERS) {
        await db.execute(
          sql`UPDATE stripe_processed_events
              SET status = 'failed',
                  error_message = ${'Permanent failure: exceeded max stale lock takeovers (' + MAX_STALE_TAKEOVERS + ')'},
                  processed_at = NOW()
              WHERE event_id = ${eventId} AND status = 'processing'
              RETURNING event_id`
        );
        logger.error("webhook", "max_stale_takeovers_exceeded", {
          details: { eventId, eventType, takeoverCount, maxTakeovers: MAX_STALE_TAKEOVERS },
        });
        return false;
      }

      const takeoverResult = await db.execute(
        sql`UPDATE stripe_processed_events 
            SET status = 'processing', 
                created_at = NOW(),
                error_message = COALESCE(error_message, '') || ${'\nStale lock takeover #' + (takeoverCount + 1) + ' after ' + Math.round(ageMs / 1000) + 's'},
                processed_at = NULL
            WHERE event_id = ${eventId} AND status = 'processing'
            RETURNING event_id`
      );
      if (takeoverResult.rows.length === 0) {
        logger.webhook("stale_lock_takeover_lost_race", {
          details: { eventId, eventType, ageMs },
        });
        return false;
      }
      logger.webhook("stale_lock_takeover", {
        details: { eventId, eventType, ageMs, thresholdMs, takeoverNumber: takeoverCount + 1 },
      });
      return true;
    }

    if (row.status === 'failed') {
      const retryResult = await db.execute(
        sql`UPDATE stripe_processed_events 
            SET status = 'processing', error_message = NULL, processed_at = NULL, created_at = NOW()
            WHERE event_id = ${eventId} AND status = 'failed'
            RETURNING event_id`
      );
      if (retryResult.rows.length === 0) {
        logger.webhook("retry_lock_contention", {
          details: { eventId, eventType },
        });
        return false;
      }
      logger.webhook("retry_failed_event", {
        details: { eventId, eventType },
      });
      return true;
    }

    return false;
  }

  static async handleSubscriptionEvents(event: any, tx: any): Promise<void> {
    const eventType = event.type;
    const data = event.data?.object;

    switch (eventType) {
      case 'checkout.session.completed':
        await this.handleCheckoutComplete(data, eventType, tx);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(data, eventType, tx);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(data, eventType, tx);
        break;
      case 'customer.subscription.trial_will_end':
        logger.webhook("trial_ending_soon", {
          details: { subscriptionId: data?.id, trialEnd: data?.trial_end },
        });
        break;
      case 'invoice.paid':
        await this.handleInvoicePaid(data, eventType, tx);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(data, eventType, tx);
        break;
      case 'charge.refunded':
        await this.handleChargeRefunded(data, tx);
        break;
    }
  }

  private static async executeGuardedTransition(
    customerId: string,
    newStatus: SubscriptionStatus,
    eventType: string,
    updateFields: Record<string, any>,
    auditContext: Record<string, any>,
    tx: any,
  ): Promise<{ userId: string | null; previousStatus: string | null; transitioned: boolean }> {
    const userRows = await tx
      .select({ id: users.id, subscriptionStatus: users.subscriptionStatus })
      .from(users)
      .where(eq(users.stripeCustomerId, customerId))
      .limit(1);

    if (userRows.length === 0) {
      logger.webhook("no_user_for_customer", {
        details: { customerId, eventType, ...auditContext },
      });
      return { userId: null, previousStatus: null, transitioned: false };
    }

    const user = userRows[0];
    const currentStatus = user.subscriptionStatus;

    if (currentStatus === newStatus) {
      logger.webhook("transition_noop", {
        details: { userId: user.id, customerId, currentStatus, newStatus, eventType, ...auditContext },
      });
      return { userId: user.id, previousStatus: currentStatus, transitioned: false };
    }

    if (!isTransitionAllowed(currentStatus, newStatus, eventType)) {
      logger.error("webhook", "transition_blocked", {
        errorMessage: `Illegal state transition: ${currentStatus} -> ${newStatus} via ${eventType}`,
        details: { userId: user.id, customerId, currentStatus, newStatus, eventType, ...auditContext },
      });
      return { userId: user.id, previousStatus: currentStatus, transitioned: false };
    }

    const subId = updateFields.stripe_subscription_id || null;
    const tier = updateFields.subscription_tier || null;
    const trialEndsAt = updateFields.trial_ends_at || null;

    let result;
    if (currentStatus) {
      if (tier && trialEndsAt) {
        result = await tx.execute(
          sql`UPDATE users SET 
            subscription_status = ${newStatus}, 
            stripe_subscription_id = COALESCE(${subId}, stripe_subscription_id),
            subscription_tier = ${tier},
            trial_ends_at = ${trialEndsAt},
            updated_at = NOW()
          WHERE stripe_customer_id = ${customerId} AND subscription_status = ${currentStatus}
          RETURNING id`
        );
      } else if (tier) {
        result = await tx.execute(
          sql`UPDATE users SET 
            subscription_status = ${newStatus}, 
            stripe_subscription_id = COALESCE(${subId}, stripe_subscription_id),
            subscription_tier = ${tier},
            updated_at = NOW()
          WHERE stripe_customer_id = ${customerId} AND subscription_status = ${currentStatus}
          RETURNING id`
        );
      } else if (trialEndsAt) {
        result = await tx.execute(
          sql`UPDATE users SET 
            subscription_status = ${newStatus}, 
            stripe_subscription_id = COALESCE(${subId}, stripe_subscription_id),
            trial_ends_at = ${trialEndsAt},
            updated_at = NOW()
          WHERE stripe_customer_id = ${customerId} AND subscription_status = ${currentStatus}
          RETURNING id`
        );
      } else {
        result = await tx.execute(
          sql`UPDATE users SET 
            subscription_status = ${newStatus}, 
            stripe_subscription_id = COALESCE(${subId}, stripe_subscription_id),
            updated_at = NOW()
          WHERE stripe_customer_id = ${customerId} AND subscription_status = ${currentStatus}
          RETURNING id`
        );
      }
    } else {
      if (tier && trialEndsAt) {
        result = await tx.execute(
          sql`UPDATE users SET 
            subscription_status = ${newStatus}, 
            stripe_subscription_id = COALESCE(${subId}, stripe_subscription_id),
            subscription_tier = ${tier},
            trial_ends_at = ${trialEndsAt},
            updated_at = NOW()
          WHERE stripe_customer_id = ${customerId}
          RETURNING id`
        );
      } else if (tier) {
        result = await tx.execute(
          sql`UPDATE users SET 
            subscription_status = ${newStatus}, 
            stripe_subscription_id = COALESCE(${subId}, stripe_subscription_id),
            subscription_tier = ${tier},
            updated_at = NOW()
          WHERE stripe_customer_id = ${customerId}
          RETURNING id`
        );
      } else if (trialEndsAt) {
        result = await tx.execute(
          sql`UPDATE users SET 
            subscription_status = ${newStatus}, 
            stripe_subscription_id = COALESCE(${subId}, stripe_subscription_id),
            trial_ends_at = ${trialEndsAt},
            updated_at = NOW()
          WHERE stripe_customer_id = ${customerId}
          RETURNING id`
        );
      } else {
        result = await tx.execute(
          sql`UPDATE users SET 
            subscription_status = ${newStatus}, 
            stripe_subscription_id = COALESCE(${subId}, stripe_subscription_id),
            updated_at = NOW()
          WHERE stripe_customer_id = ${customerId}
          RETURNING id`
        );
      }
    }

    if (result.rows.length > 0) {
      logger.webhook("transition_executed", {
        details: {
          userId: user.id,
          customerId,
          previousStatus: currentStatus,
          newStatus,
          eventType,
          ...auditContext,
        },
      });
      return { userId: user.id, previousStatus: currentStatus, transitioned: true };
    }

    logger.webhook("transition_lost_race", {
      details: { userId: user.id, customerId, currentStatus, newStatus, eventType, ...auditContext },
    });
    return { userId: user.id, previousStatus: currentStatus, transitioned: false };
  }

  static async handleCheckoutComplete(session: any, eventType: string, tx: any): Promise<void> {
    if (session.mode !== 'subscription') return;

    const customerId = session.customer;
    const subscriptionId = session.subscription;

    if (!customerId || !subscriptionId) return;

    await this.executeGuardedTransition(
      customerId,
      'active',
      eventType,
      { stripe_subscription_id: subscriptionId },
      { subscriptionId, sessionId: session.id },
      tx,
    );
  }

  static async handleSubscriptionUpdate(subscription: any, eventType: string, tx: any): Promise<void> {
    const customerId = subscription.customer;
    const subscriptionId = subscription.id;
    const newStatus = subscription.status as SubscriptionStatus;
    const trialEnd = subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : null;

    if (!VALID_SUBSCRIPTION_STATUSES.includes(newStatus)) {
      logger.error("webhook", "unknown_subscription_status", {
        errorMessage: `Unknown status from Stripe: ${newStatus}`,
        details: { customerId, subscriptionId, status: newStatus },
      });
      return;
    }

    let tier: string | null = null;
    if (subscription.items?.data?.[0]?.price?.product) {
      const productId = subscription.items.data[0].price.product;
      try {
        const productResult = await tx.execute(
          sql`SELECT metadata FROM stripe.products WHERE id = ${productId}`
        );
        if (productResult.rows[0]?.metadata) {
          tier = (productResult.rows[0].metadata as any)?.tier || null;
        }
      } catch {
        logger.webhook("product_lookup_failed", {
          details: { productId, subscriptionId },
        });
      }
    }

    const updateFields: Record<string, any> = {
      stripe_subscription_id: subscriptionId,
      trial_ends_at: trialEnd,
    };
    if (tier) {
      updateFields.subscription_tier = tier;
    }

    await this.executeGuardedTransition(
      customerId,
      newStatus,
      eventType,
      updateFields,
      { subscriptionId, tier: tier || "none" },
      tx,
    );
  }

  static async handleSubscriptionDeleted(subscription: any, eventType: string, tx: any): Promise<void> {
    const customerId = subscription.customer;
    const subscriptionId = subscription.id;

    if (!customerId) return;

    await this.executeGuardedTransition(
      customerId,
      'canceled',
      eventType,
      {},
      { subscriptionId },
      tx,
    );
  }

  static async handleInvoicePaid(invoice: any, eventType: string, tx: any): Promise<void> {
    const customerId = invoice.customer;
    const subscriptionId = invoice.subscription;

    if (!customerId) return;

    if (subscriptionId) {
      const result = await this.executeGuardedTransition(
        customerId,
        'active',
        eventType,
        { stripe_subscription_id: subscriptionId },
        { subscriptionId, invoiceId: invoice.id, amountPaid: invoice.amount_paid },
        tx,
      );

      if (!result.transitioned && result.userId) {
        logger.webhook("invoice_paid_no_transition", {
          details: {
            userId: result.userId,
            customerId,
            subscriptionId,
            invoiceId: invoice.id,
            amountPaid: invoice.amount_paid,
            currentStatus: result.previousStatus,
          },
        });
      }
    }
  }

  static async handleInvoicePaymentFailed(invoice: any, eventType: string, tx: any): Promise<void> {
    const customerId = invoice.customer;
    const subscriptionId = invoice.subscription;

    if (!customerId) return;

    if (subscriptionId) {
      await this.executeGuardedTransition(
        customerId,
        'past_due',
        eventType,
        {},
        { subscriptionId, invoiceId: invoice.id, attemptCount: invoice.attempt_count },
        tx,
      );
    }
  }

  static async handleChargeRefunded(charge: any, tx: any): Promise<void> {
    const customerId = charge.customer;
    const refundedAmount = charge.amount_refunded;
    const totalAmount = charge.amount;
    const isFullRefund = refundedAmount >= totalAmount;
    const currency = charge.currency;

    if (!customerId) return;

    logger.webhook("charge_refunded", {
      details: {
        chargeId: charge.id,
        customerId,
        amountRefunded: refundedAmount,
        totalAmount,
        currency,
        isFullRefund,
        refundIds: charge.refunds?.data?.map((r: any) => r.id) || [],
        invoiceId: charge.invoice || null,
        paymentIntentId: charge.payment_intent || null,
      },
    });

    if (isFullRefund) {
      const userRows = await tx
        .select({ id: users.id, subscriptionStatus: users.subscriptionStatus })
        .from(users)
        .where(eq(users.stripeCustomerId, customerId))
        .limit(1);

      if (userRows.length > 0) {
        logger.webhook("full_refund_alert", {
          details: {
            userId: userRows[0].id,
            customerId,
            chargeId: charge.id,
            currentSubscriptionStatus: userRows[0].subscriptionStatus,
            amountRefunded: refundedAmount,
            currency,
          },
        });
      }
    }
  }
}
