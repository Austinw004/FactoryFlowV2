import axios from 'axios';
import { storage } from '../storage';
import { CredentialService } from './credentialService';

export interface BraintreeTransaction {
  id: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  merchantAccountId: string;
  customerId: string | null;
  customerEmail: string | null;
  paymentMethodType: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BraintreeCustomer {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BraintreeSubscription {
  id: string;
  planId: string;
  status: string;
  price: number;
  balance: number;
  billingPeriodStartDate: Date;
  billingPeriodEndDate: Date;
  nextBillingDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class BraintreeIntegration {
  private merchantId: string | null = null;
  private publicKey: string | null = null;
  private privateKey: string | null = null;
  private sandbox: boolean = true;

  constructor(private companyId: string) {}

  private get baseUrl(): string {
    return this.sandbox
      ? 'https://api.sandbox.braintreegateway.com'
      : 'https://api.braintreegateway.com';
  }

  async initialize(): Promise<boolean> {
    try {
      const credentials = await CredentialService.getDecryptedCredentials(this.companyId, 'braintree') as any;
      if (!credentials?.merchantId || !credentials?.publicKey || !credentials?.privateKey) {
        console.log('[Braintree] No credentials found for company');
        return false;
      }
      this.merchantId = credentials.merchantId;
      this.publicKey = credentials.publicKey;
      this.privateKey = credentials.privateKey;
      this.sandbox = credentials.sandbox !== false;
      console.log(`[Braintree] Initialized for company ${this.companyId} (sandbox: ${this.sandbox})`);
      return true;
    } catch (error) {
      console.error('[Braintree] Failed to initialize:', error);
      return false;
    }
  }

  private getAuthHeaders() {
    const auth = Buffer.from(`${this.publicKey}:${this.privateKey}`).toString('base64');
    return {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/xml',
      Accept: 'application/xml',
      'X-ApiVersion': '6'
    };
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      const initialized = await this.initialize();
      if (!initialized) {
        return { success: false, message: 'Braintree credentials not configured' };
      }

      const response = await axios.get(
        `${this.baseUrl}/merchants/${this.merchantId}/plans`,
        {
          headers: this.getAuthHeaders(),
          timeout: 10000
        }
      );

      if (response.status === 200) {
        console.log('[Braintree] Connection test successful');
        return { success: true, message: 'Braintree API connected successfully' };
      }
      return { success: false, message: 'Unexpected response from Braintree' };
    } catch (error: any) {
      console.error('[Braintree] Connection test failed:', error.message);
      return { success: false, message: error.response?.data || error.message };
    }
  }

  async getTransactions(startDate?: Date): Promise<BraintreeTransaction[]> {
    try {
      if (!this.merchantId) await this.initialize();

      const searchXml = `
        <search>
          ${startDate ? `<created-at><min>${startDate.toISOString()}</min></created-at>` : ''}
        </search>
      `;

      const response = await axios.post(
        `${this.baseUrl}/merchants/${this.merchantId}/transactions/advanced_search`,
        searchXml,
        {
          headers: this.getAuthHeaders(),
          timeout: 15000
        }
      );

      const transactions: BraintreeTransaction[] = [];
      const txMatches = response.data.match(/<transaction>[\s\S]*?<\/transaction>/g) || [];
      
      for (const txXml of txMatches) {
        const extract = (tag: string) => {
          const match = txXml.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`));
          return match ? match[1] : null;
        };

        transactions.push({
          id: extract('id') || '',
          type: extract('type') || '',
          status: extract('status') || '',
          amount: parseFloat(extract('amount') || '0'),
          currency: extract('currency-iso-code') || 'USD',
          merchantAccountId: extract('merchant-account-id') || '',
          customerId: extract('customer-id'),
          customerEmail: null,
          paymentMethodType: extract('payment-instrument-type') || '',
          createdAt: new Date(extract('created-at') || ''),
          updatedAt: new Date(extract('updated-at') || '')
        });
      }

      return transactions;
    } catch (error: any) {
      console.error('[Braintree] Get transactions failed:', error.message);
      return [];
    }
  }

  async getCustomers(): Promise<BraintreeCustomer[]> {
    try {
      if (!this.merchantId) await this.initialize();

      const response = await axios.post(
        `${this.baseUrl}/merchants/${this.merchantId}/customers/advanced_search`,
        '<search></search>',
        {
          headers: this.getAuthHeaders(),
          timeout: 15000
        }
      );

      const customers: BraintreeCustomer[] = [];
      const custMatches = response.data.match(/<customer>[\s\S]*?<\/customer>/g) || [];
      
      for (const custXml of custMatches) {
        const extract = (tag: string) => {
          const match = custXml.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`));
          return match ? match[1] : null;
        };

        customers.push({
          id: extract('id') || '',
          email: extract('email'),
          firstName: extract('first-name'),
          lastName: extract('last-name'),
          company: extract('company'),
          phone: extract('phone'),
          createdAt: new Date(extract('created-at') || ''),
          updatedAt: new Date(extract('updated-at') || '')
        });
      }

      return customers;
    } catch (error: any) {
      console.error('[Braintree] Get customers failed:', error.message);
      return [];
    }
  }

  async syncTransactionsAsDemandSignals(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const initialized = await this.initialize();
      if (!initialized) {
        return { synced: 0, errors: ['Braintree not initialized'] };
      }

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const transactions = await this.getTransactions(thirtyDaysAgo);

      for (const tx of transactions) {
        try {
          await storage.createDemandSignal({
            companyId: this.companyId,
            signalType: 'payment',
            signalDate: tx.createdAt,
            quantity: tx.amount,
            unit: tx.currency,
            channel: 'braintree',
            confidence: 100,
            priority: tx.amount > 1000 ? 'high' : tx.amount > 100 ? 'medium' : 'low',
            attributes: {
              source: 'braintree',
              transactionId: tx.id,
              type: tx.type,
              status: tx.status,
              paymentMethod: tx.paymentMethodType,
              customerId: tx.customerId
            }
          });
          synced++;
        } catch (err: any) {
          errors.push(`Transaction ${tx.id}: ${err.message}`);
        }
      }

      console.log(`[Braintree] Synced ${synced} transactions as demand signals`);
      return { synced, errors };
    } catch (error: any) {
      console.error('[Braintree] Sync failed:', error.message);
      return { synced: 0, errors: [error.message] };
    }
  }
}
