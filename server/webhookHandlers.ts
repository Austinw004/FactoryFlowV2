import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { db } from './db';
import { users, stripeProcessedEvents } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { logger } from './lib/structuredLogger';

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
    
    try {
      const event = JSON.parse(payload.toString());
      
      // Check if event was already processed using database deduplication
      if (event.id) {
        const existing = await db
          .select()
          .from(stripeProcessedEvents)
          .where(eq(stripeProcessedEvents.eventId, event.id))
          .limit(1);
        
        if (existing.length > 0) {
          logger.webhook("duplicate_skipped", { 
            details: { eventId: event.id, eventType: event.type } 
          });
          return;
        }
      }

      // Process the subscription event
      await WebhookHandlers.handleSubscriptionEvents(event);

      // Record as processed in database
      if (event.id) {
        try {
          await db.insert(stripeProcessedEvents).values({
            eventId: event.id,
            eventType: event.type,
            customerId: event.data?.object?.customer || null,
            subscriptionId: event.data?.object?.subscription || event.data?.object?.id || null,
            status: "processed",
          });
        } catch (e: any) {
          // Unique constraint violation = already processed (race condition)
          if (e.code === '23505') {
            logger.webhook("duplicate_race_condition", { 
              details: { eventId: event.id } 
            });
            return;
          }
          throw e;
        }
      }
    } catch (error) {
      logger.error("webhook", "subscription_webhook_error", { 
        errorMessage: error instanceof Error ? error.message : String(error),
        details: error instanceof Error ? { stack: error.stack } : {}
      });
    }
  }
  
  static async handleSubscriptionEvents(event: any): Promise<void> {
    const eventType = event.type;
    const data = event.data?.object;
    
    switch (eventType) {
      case 'checkout.session.completed':
        await this.handleCheckoutComplete(data);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(data);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(data);
        break;
      case 'customer.subscription.trial_will_end':
        logger.webhook("trial_ending_soon", { 
          details: { subscriptionId: data.id } 
        });
        break;
      case 'invoice.paid':
        await this.handleInvoicePaid(data);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(data);
        break;
      case 'charge.refunded':
        await this.handleChargeRefunded(data);
        break;
    }
  }
  
  static async handleCheckoutComplete(session: any): Promise<void> {
    if (session.mode !== 'subscription') return;
    
    const customerId = session.customer;
    const subscriptionId = session.subscription;
    
    if (!customerId || !subscriptionId) return;
    
    const result = await db.execute(
      sql`UPDATE users SET 
        stripe_subscription_id = ${subscriptionId},
        subscription_status = 'active',
        updated_at = NOW()
      WHERE stripe_customer_id = ${customerId}
        AND subscription_status != 'active'
      RETURNING id`
    );
    
    if (result.rows.length > 0) {
      logger.webhook("checkout_completed", { 
        details: { userId: result.rows[0].id, customerId, subscriptionId } 
      });
    }
  }
  
  static async handleSubscriptionUpdate(subscription: any): Promise<void> {
    const customerId = subscription.customer;
    const subscriptionId = subscription.id;
    const status = subscription.status;
    const trialEnd = subscription.trial_end 
      ? new Date(subscription.trial_end * 1000) 
      : null;
    
    let tier: string | null = null;
    if (subscription.items?.data?.[0]?.price?.product) {
      const productId = subscription.items.data[0].price.product;
      const productResult = await db.execute(
        sql`SELECT metadata FROM stripe.products WHERE id = ${productId}`
      );
      if (productResult.rows[0]?.metadata) {
        tier = (productResult.rows[0].metadata as any)?.tier || null;
      }
    }
    
    const updateQuery = tier 
      ? sql`UPDATE users SET 
          stripe_subscription_id = ${subscriptionId},
          subscription_status = ${status},
          subscription_tier = ${tier},
          trial_ends_at = ${trialEnd},
          updated_at = NOW()
        WHERE stripe_customer_id = ${customerId}
        RETURNING id`
      : sql`UPDATE users SET 
          stripe_subscription_id = ${subscriptionId},
          subscription_status = ${status},
          trial_ends_at = ${trialEnd},
          updated_at = NOW()
        WHERE stripe_customer_id = ${customerId}
        RETURNING id`;
    
    const result = await db.execute(updateQuery);
    
    if (result.rows.length > 0) {
      logger.webhook("subscription_updated", { 
        details: { 
          userId: result.rows[0].id, 
          customerId, 
          subscriptionId,
          status,
          tier: tier || "none"
        } 
      });
    }
  }
  
  static async handleSubscriptionDeleted(subscription: any): Promise<void> {
    const customerId = subscription.customer;
    
    const result = await db.execute(
      sql`UPDATE users SET 
        subscription_status = 'canceled',
        updated_at = NOW()
      WHERE stripe_customer_id = ${customerId}
        AND subscription_status != 'canceled'
      RETURNING id`
    );
    
    if (result.rows.length > 0) {
      logger.webhook("subscription_deleted", { 
        details: { userId: result.rows[0].id, customerId } 
      });
    }
  }

  static async handleInvoicePaid(invoice: any): Promise<void> {
    const customerId = invoice.customer;
    const subscriptionId = invoice.subscription;

    if (!customerId) return;

    if (subscriptionId) {
      const result = await db.execute(
        sql`UPDATE users SET 
          subscription_status = 'active',
          updated_at = NOW()
        WHERE stripe_customer_id = ${customerId}
          AND subscription_status IN ('past_due', 'incomplete')
        RETURNING id`
      );

      if (result.rows.length > 0) {
        logger.webhook("invoice_paid_reactivated", { 
          details: { 
            userId: result.rows[0].id, 
            customerId, 
            subscriptionId, 
            invoiceId: invoice.id,
            amountPaid: invoice.amount_paid
          } 
        });
      } else {
        logger.webhook("invoice_paid_no_update", { 
          details: { 
            customerId, 
            subscriptionId, 
            invoiceId: invoice.id,
            amountPaid: invoice.amount_paid
          } 
        });
      }
    }
  }

  static async handleInvoicePaymentFailed(invoice: any): Promise<void> {
    const customerId = invoice.customer;
    const subscriptionId = invoice.subscription;

    if (!customerId) return;

    if (subscriptionId) {
      const result = await db.execute(
        sql`UPDATE users SET 
          subscription_status = 'past_due',
          updated_at = NOW()
        WHERE stripe_customer_id = ${customerId}
          AND subscription_status = 'active'
        RETURNING id`
      );

      if (result.rows.length > 0) {
        logger.webhook("invoice_payment_failed", { 
          details: { 
            userId: result.rows[0].id, 
            customerId, 
            subscriptionId, 
            invoiceId: invoice.id
          } 
        });
      }
    }
  }

  static async handleChargeRefunded(charge: any): Promise<void> {
    const customerId = charge.customer;
    const refundedAmount = charge.amount_refunded;
    const totalAmount = charge.amount;
    const isFullRefund = refundedAmount >= totalAmount;

    if (!customerId) return;

    logger.webhook("charge_refunded", { 
      details: {
        chargeId: charge.id,
        customerId,
        amountRefunded: refundedAmount,
        totalAmount: totalAmount,
        isFullRefund
      }
    });
  }
}
