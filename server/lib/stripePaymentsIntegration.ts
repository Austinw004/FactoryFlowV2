import Stripe from "stripe";
import { storage } from "../storage";

export interface StripeCustomer {
  id: string;
  email: string;
  name: string | null;
  created: number;
  balance: number;
}

export interface StripeInvoice {
  id: string;
  customer: string;
  status: string;
  total: number;
  amountDue: number;
  amountPaid: number;
  currency: string;
  dueDate: number | null;
  created: number;
}

export interface StripePaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  customer: string | null;
  created: number;
}

export class StripePaymentsIntegration {
  private stripe: Stripe;
  private companyId: string;

  constructor(secretKey: string, companyId: string) {
    this.stripe = new Stripe(secretKey, { apiVersion: "2025-01-27.acacia" });
    this.companyId = companyId;
  }

  async testConnection(): Promise<{ success: boolean; message?: string; account?: string }> {
    try {
      const account = await this.stripe.accounts.retrieve();
      console.log(`[Stripe] Connection test successful: ${account.business_profile?.name || account.id}`);
      return { success: true, message: "Stripe connection verified", account: account.business_profile?.name || account.id };
    } catch (error: any) {
      console.error(`[Stripe] Connection test failed:`, error.message);
      return { success: false, message: error.message };
    }
  }

  async listCustomers(limit: number = 100): Promise<StripeCustomer[]> {
    try {
      const result = await this.stripe.customers.list({ limit });
      const customers = result.data.map(c => ({
        id: c.id,
        email: c.email || "",
        name: c.name,
        created: c.created,
        balance: c.balance || 0
      }));
      console.log(`[Stripe] Fetched ${customers.length} customers`);
      return customers;
    } catch (error: any) {
      console.error("[Stripe] Failed to list customers:", error.message);
      throw error;
    }
  }

  async listInvoices(limit: number = 100): Promise<StripeInvoice[]> {
    try {
      const result = await this.stripe.invoices.list({ limit });
      const invoices = result.data.map(i => ({
        id: i.id,
        customer: typeof i.customer === "string" ? i.customer : i.customer?.id || "",
        status: i.status || "unknown",
        total: i.total,
        amountDue: i.amount_due,
        amountPaid: i.amount_paid,
        currency: i.currency,
        dueDate: i.due_date,
        created: i.created
      }));
      console.log(`[Stripe] Fetched ${invoices.length} invoices`);
      return invoices;
    } catch (error: any) {
      console.error("[Stripe] Failed to list invoices:", error.message);
      throw error;
    }
  }

  async listPaymentIntents(limit: number = 100): Promise<StripePaymentIntent[]> {
    try {
      const result = await this.stripe.paymentIntents.list({ limit });
      const payments = result.data.map(p => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        customer: typeof p.customer === "string" ? p.customer : p.customer?.id || null,
        created: p.created
      }));
      console.log(`[Stripe] Fetched ${payments.length} payment intents`);
      return payments;
    } catch (error: any) {
      console.error("[Stripe] Failed to list payment intents:", error.message);
      throw error;
    }
  }

  async createInvoice(customerId: string, items: Array<{ description: string; amount: number }>): Promise<StripeInvoice> {
    try {
      for (const item of items) {
        await this.stripe.invoiceItems.create({
          customer: customerId,
          amount: Math.round(item.amount * 100),
          currency: "usd",
          description: item.description
        });
      }

      const invoice = await this.stripe.invoices.create({
        customer: customerId,
        auto_advance: false
      });

      console.log(`[Stripe] Created invoice ${invoice.id}`);
      return {
        id: invoice.id,
        customer: customerId,
        status: invoice.status || "draft",
        total: invoice.total,
        amountDue: invoice.amount_due,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
        dueDate: invoice.due_date,
        created: invoice.created
      };
    } catch (error: any) {
      console.error("[Stripe] Failed to create invoice:", error.message);
      throw error;
    }
  }

  async syncCustomersAsSuppliers(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const customers = await this.listCustomers(200);
      
      for (const customer of customers) {
        try {
          const existingSuppliers = await storage.getSuppliers(this.companyId);
          const existing = existingSuppliers.find(s => s.externalId === customer.id);
          
          if (!existing && customer.email) {
            await storage.createSupplier({
              companyId: this.companyId,
              name: customer.name || customer.email,
              contactEmail: customer.email,
              phone: "",
              address: "",
              category: "Stripe Customer",
              riskScore: 30,
              tier: 1,
              leadTime: 7,
              reliabilityScore: 90,
              externalId: customer.id,
              externalSource: "stripe"
            });
            synced++;
          }
        } catch (err: any) {
          errors.push(`Customer ${customer.id}: ${err.message}`);
        }
      }

      console.log(`[Stripe] Synced ${synced} customers as suppliers`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[Stripe] Customer sync failed:", error.message);
      throw error;
    }
  }

  async syncInvoicesAsDemandSignals(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const invoices = await this.listInvoices(100);
      
      for (const invoice of invoices) {
        try {
          if (invoice.status === "paid" || invoice.status === "open") {
            await storage.createDemandSignal({
              companyId: this.companyId,
              source: "stripe",
              signalType: "invoice",
              rawData: invoice,
              confidence: invoice.status === "paid" ? 100 : 70,
              impactedSkus: [],
              forecastAdjustment: invoice.total / 100,
              expiresAt: invoice.dueDate ? new Date(invoice.dueDate * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });
            synced++;
          }
        } catch (err: any) {
          errors.push(`Invoice ${invoice.id}: ${err.message}`);
        }
      }

      console.log(`[Stripe] Created ${synced} demand signals from invoices`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[Stripe] Invoice sync failed:", error.message);
      throw error;
    }
  }
}

export async function getStripePaymentsIntegration(companyId: string): Promise<StripePaymentsIntegration | null> {
  const company = await storage.getCompany(companyId);
  if (!company?.stripeSecretKey) {
    if (!process.env.STRIPE_SECRET_KEY) {
      return null;
    }
    return new StripePaymentsIntegration(process.env.STRIPE_SECRET_KEY, companyId);
  }
  return new StripePaymentsIntegration(company.stripeSecretKey, companyId);
}
