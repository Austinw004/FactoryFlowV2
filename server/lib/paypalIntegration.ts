import axios from 'axios';
import { storage } from '../storage';
import { CredentialService } from './credentialService';

export interface PayPalPayment {
  id: string;
  status: string;
  amount: number;
  currency: string;
  payer: {
    email: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface PayPalOrder {
  id: string;
  status: string;
  intent: string;
  purchaseUnits: Array<{
    amount: { value: string; currency: string };
    description?: string;
  }>;
}

export class PayPalIntegration {
  private clientId: string | null = null;
  private clientSecret: string | null = null;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private sandbox: boolean = true;

  constructor(private companyId: string) {}

  private get baseUrl(): string {
    return this.sandbox 
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';
  }

  async initialize(): Promise<boolean> {
    try {
      const credentials = await CredentialService.getDecryptedCredentials(this.companyId, 'paypal') as any;
      if (!credentials?.clientId || !credentials?.clientSecret) {
        console.log('[PayPal] No credentials found for company');
        return false;
      }
      this.clientId = credentials.clientId;
      this.clientSecret = credentials.clientSecret;
      this.sandbox = credentials.sandbox !== false;
      console.log(`[PayPal] Initialized for company ${this.companyId} (sandbox: ${this.sandbox})`);
      return true;
    } catch (error) {
      console.error('[PayPal] Failed to initialize:', error);
      return false;
    }
  }

  private async getAccessToken(): Promise<string | null> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.clientId || !this.clientSecret) {
      return null;
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          auth: { username: this.clientId, password: this.clientSecret },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 10000
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 60) * 1000);
      return this.accessToken;
    } catch (error: any) {
      console.error('[PayPal] Failed to get access token:', error.message);
      return null;
    }
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      const initialized = await this.initialize();
      if (!initialized) {
        return { success: false, message: 'PayPal credentials not configured' };
      }

      const token = await this.getAccessToken();
      if (!token) {
        return { success: false, message: 'Failed to authenticate with PayPal' };
      }

      console.log('[PayPal] Connection test successful');
      return { success: true, message: 'PayPal API connected successfully' };
    } catch (error: any) {
      console.error('[PayPal] Connection test failed:', error.message);
      return { success: false, message: error.message };
    }
  }

  async createOrder(amount: number, currency: string = 'USD', description?: string): Promise<PayPalOrder | null> {
    try {
      const token = await this.getAccessToken();
      if (!token) return null;

      const response = await axios.post(
        `${this.baseUrl}/v2/checkout/orders`,
        {
          intent: 'CAPTURE',
          purchase_units: [{
            amount: { currency_code: currency, value: amount.toFixed(2) },
            description
          }]
        },
        {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          timeout: 10000
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('[PayPal] Create order failed:', error.message);
      return null;
    }
  }

  async captureOrder(orderId: string): Promise<PayPalPayment | null> {
    try {
      const token = await this.getAccessToken();
      if (!token) return null;

      const response = await axios.post(
        `${this.baseUrl}/v2/checkout/orders/${orderId}/capture`,
        {},
        {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          timeout: 10000
        }
      );

      const data = response.data;
      return {
        id: data.id,
        status: data.status,
        amount: parseFloat(data.purchase_units[0]?.payments?.captures?.[0]?.amount?.value || '0'),
        currency: data.purchase_units[0]?.payments?.captures?.[0]?.amount?.currency_code || 'USD',
        payer: {
          email: data.payer?.email_address || '',
          name: `${data.payer?.name?.given_name || ''} ${data.payer?.name?.surname || ''}`.trim()
        },
        createdAt: new Date(data.create_time),
        updatedAt: new Date(data.update_time)
      };
    } catch (error: any) {
      console.error('[PayPal] Capture order failed:', error.message);
      return null;
    }
  }

  async getPayments(startDate?: Date, endDate?: Date): Promise<PayPalPayment[]> {
    try {
      const token = await this.getAccessToken();
      if (!token) return [];

      const params: Record<string, string> = {
        page_size: '100',
        page: '1'
      };
      if (startDate) params.start_date = startDate.toISOString();
      if (endDate) params.end_date = endDate.toISOString();

      const response = await axios.get(
        `${this.baseUrl}/v1/reporting/transactions`,
        {
          params,
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000
        }
      );

      return (response.data.transaction_details || []).map((tx: any) => ({
        id: tx.transaction_info?.transaction_id,
        status: tx.transaction_info?.transaction_status,
        amount: parseFloat(tx.transaction_info?.transaction_amount?.value || '0'),
        currency: tx.transaction_info?.transaction_amount?.currency_code || 'USD',
        payer: {
          email: tx.payer_info?.email_address || '',
          name: tx.payer_info?.payer_name?.alternate_full_name || ''
        },
        createdAt: new Date(tx.transaction_info?.transaction_initiation_date),
        updatedAt: new Date(tx.transaction_info?.transaction_updated_date)
      }));
    } catch (error: any) {
      console.error('[PayPal] Get payments failed:', error.message);
      return [];
    }
  }

  async syncPaymentsAsDemandSignals(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const initialized = await this.initialize();
      if (!initialized) {
        return { synced: 0, errors: ['PayPal not initialized'] };
      }

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const payments = await this.getPayments(thirtyDaysAgo);

      for (const payment of payments) {
        try {
          await storage.createDemandSignal({
            companyId: this.companyId,
            signalType: 'payment',
            signalDate: payment.createdAt,
            quantity: payment.amount,
            unit: payment.currency,
            channel: 'paypal',
            confidence: 100,
            priority: payment.amount > 1000 ? 'high' : payment.amount > 100 ? 'medium' : 'low',
            attributes: {
              source: 'paypal',
              paymentId: payment.id,
              status: payment.status,
              payerEmail: payment.payer.email,
              payerName: payment.payer.name
            }
          });
          synced++;
        } catch (err: any) {
          errors.push(`Payment ${payment.id}: ${err.message}`);
        }
      }

      console.log(`[PayPal] Synced ${synced} payments as demand signals`);
      return { synced, errors };
    } catch (error: any) {
      console.error('[PayPal] Sync failed:', error.message);
      return { synced: 0, errors: [error.message] };
    }
  }
}
