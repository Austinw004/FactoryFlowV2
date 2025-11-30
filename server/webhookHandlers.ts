import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { db } from './db';
import { users } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

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
    
    // Additionally, process subscription events to update user records
    try {
      const stripe = await getUncachableStripeClient();
      const event = JSON.parse(payload.toString());
      
      await WebhookHandlers.handleSubscriptionEvents(event);
    } catch (error) {
      console.error('Error processing subscription webhook event:', error);
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
        console.log('[Webhook] Trial ending soon for subscription:', data.id);
        break;
    }
  }
  
  static async handleCheckoutComplete(session: any): Promise<void> {
    if (session.mode !== 'subscription') return;
    
    const customerId = session.customer;
    const subscriptionId = session.subscription;
    
    if (!customerId || !subscriptionId) return;
    
    // Find user by stripe customer ID and update subscription
    const result = await db.execute(
      sql`UPDATE users SET 
        stripe_subscription_id = ${subscriptionId},
        subscription_status = 'active',
        updated_at = NOW()
      WHERE stripe_customer_id = ${customerId}
      RETURNING id`
    );
    
    if (result.rows.length > 0) {
      console.log('[Webhook] Updated subscription for user after checkout:', result.rows[0].id);
    }
  }
  
  static async handleSubscriptionUpdate(subscription: any): Promise<void> {
    const customerId = subscription.customer;
    const subscriptionId = subscription.id;
    const status = subscription.status;
    const trialEnd = subscription.trial_end 
      ? new Date(subscription.trial_end * 1000) 
      : null;
    
    // Get tier from product metadata
    let tier: string | null = null;
    if (subscription.items?.data?.[0]?.price?.product) {
      const productId = subscription.items.data[0].price.product;
      // Query the stripe.products table for tier metadata
      const productResult = await db.execute(
        sql`SELECT metadata FROM stripe.products WHERE id = ${productId}`
      );
      if (productResult.rows[0]?.metadata) {
        tier = (productResult.rows[0].metadata as any)?.tier || null;
      }
    }
    
    // Update user record
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
      console.log(`[Webhook] Subscription ${status} for user:`, result.rows[0].id);
    }
  }
  
  static async handleSubscriptionDeleted(subscription: any): Promise<void> {
    const customerId = subscription.customer;
    
    const result = await db.execute(
      sql`UPDATE users SET 
        subscription_status = 'canceled',
        updated_at = NOW()
      WHERE stripe_customer_id = ${customerId}
      RETURNING id`
    );
    
    if (result.rows.length > 0) {
      console.log('[Webhook] Subscription canceled for user:', result.rows[0].id);
    }
  }
}
