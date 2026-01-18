import axios from 'axios';
import { storage } from '../storage';
import { CredentialService } from './credentialService';

export interface SquarePayment {
  id: string;
  status: string;
  sourceType: string;
  amountMoney: { amount: number; currency: string };
  tipMoney: { amount: number; currency: string } | null;
  totalMoney: { amount: number; currency: string };
  orderId: string | null;
  customerId: string | null;
  locationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SquareOrder {
  id: string;
  locationId: string;
  state: string;
  totalMoney: { amount: number; currency: string };
  totalTaxMoney: { amount: number; currency: string };
  totalDiscountMoney: { amount: number; currency: string };
  lineItems: Array<{
    name: string;
    quantity: string;
    basePriceMoney: { amount: number; currency: string };
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SquareCustomer {
  id: string;
  givenName: string | null;
  familyName: string | null;
  emailAddress: string | null;
  phoneNumber: string | null;
  companyName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SquareLocation {
  id: string;
  name: string;
  address: {
    addressLine1: string | null;
    locality: string | null;
    administrativeDistrictLevel1: string | null;
    postalCode: string | null;
    country: string | null;
  };
  timezone: string;
  status: string;
}

export class SquareIntegration {
  private accessToken: string | null = null;
  private sandbox: boolean = true;

  constructor(private companyId: string) {}

  private get baseUrl(): string {
    return this.sandbox
      ? 'https://connect.squareupsandbox.com/v2'
      : 'https://connect.squareup.com/v2';
  }

  async initialize(): Promise<boolean> {
    try {
      const credentials = await CredentialService.getDecryptedCredentials(this.companyId, 'square') as any;
      if (!credentials?.accessToken) {
        console.log('[Square] No credentials found for company');
        return false;
      }
      this.accessToken = credentials.accessToken;
      this.sandbox = credentials.sandbox !== false;
      console.log(`[Square] Initialized for company ${this.companyId} (sandbox: ${this.sandbox})`);
      return true;
    } catch (error) {
      console.error('[Square] Failed to initialize:', error);
      return false;
    }
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Square-Version': '2024-01-18'
    };
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      const initialized = await this.initialize();
      if (!initialized) {
        return { success: false, message: 'Square credentials not configured' };
      }

      const response = await axios.get(`${this.baseUrl}/locations`, {
        headers: this.getHeaders(),
        timeout: 10000
      });

      if (response.data.locations) {
        console.log('[Square] Connection test successful');
        return { success: true, message: `Connected with ${response.data.locations.length} locations` };
      }
      return { success: false, message: 'Unexpected response from Square' };
    } catch (error: any) {
      console.error('[Square] Connection test failed:', error.message);
      return { success: false, message: error.response?.data?.errors?.[0]?.detail || error.message };
    }
  }

  async getLocations(): Promise<SquareLocation[]> {
    try {
      if (!this.accessToken) await this.initialize();

      const response = await axios.get(`${this.baseUrl}/locations`, {
        headers: this.getHeaders(),
        timeout: 10000
      });

      return (response.data.locations || []).map((loc: any) => ({
        id: loc.id,
        name: loc.name,
        address: {
          addressLine1: loc.address?.address_line_1,
          locality: loc.address?.locality,
          administrativeDistrictLevel1: loc.address?.administrative_district_level_1,
          postalCode: loc.address?.postal_code,
          country: loc.address?.country
        },
        timezone: loc.timezone,
        status: loc.status
      }));
    } catch (error: any) {
      console.error('[Square] Get locations failed:', error.message);
      return [];
    }
  }

  async getPayments(locationId?: string, beginTime?: Date): Promise<SquarePayment[]> {
    try {
      if (!this.accessToken) await this.initialize();

      const params: Record<string, any> = { limit: 100 };
      if (locationId) params.location_id = locationId;
      if (beginTime) params.begin_time = beginTime.toISOString();

      const response = await axios.get(`${this.baseUrl}/payments`, {
        headers: this.getHeaders(),
        params,
        timeout: 15000
      });

      return (response.data.payments || []).map((payment: any) => ({
        id: payment.id,
        status: payment.status,
        sourceType: payment.source_type,
        amountMoney: {
          amount: payment.amount_money?.amount || 0,
          currency: payment.amount_money?.currency || 'USD'
        },
        tipMoney: payment.tip_money ? {
          amount: payment.tip_money.amount,
          currency: payment.tip_money.currency
        } : null,
        totalMoney: {
          amount: payment.total_money?.amount || 0,
          currency: payment.total_money?.currency || 'USD'
        },
        orderId: payment.order_id,
        customerId: payment.customer_id,
        locationId: payment.location_id,
        createdAt: new Date(payment.created_at),
        updatedAt: new Date(payment.updated_at)
      }));
    } catch (error: any) {
      console.error('[Square] Get payments failed:', error.message);
      return [];
    }
  }

  async getCustomers(): Promise<SquareCustomer[]> {
    try {
      if (!this.accessToken) await this.initialize();

      const response = await axios.get(`${this.baseUrl}/customers`, {
        headers: this.getHeaders(),
        params: { limit: 100 },
        timeout: 15000
      });

      return (response.data.customers || []).map((customer: any) => ({
        id: customer.id,
        givenName: customer.given_name,
        familyName: customer.family_name,
        emailAddress: customer.email_address,
        phoneNumber: customer.phone_number,
        companyName: customer.company_name,
        createdAt: new Date(customer.created_at),
        updatedAt: new Date(customer.updated_at)
      }));
    } catch (error: any) {
      console.error('[Square] Get customers failed:', error.message);
      return [];
    }
  }

  async syncPaymentsAsDemandSignals(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const initialized = await this.initialize();
      if (!initialized) {
        return { synced: 0, errors: ['Square not initialized'] };
      }

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const payments = await this.getPayments(undefined, thirtyDaysAgo);

      for (const payment of payments) {
        try {
          const amountInDollars = payment.totalMoney.amount / 100;
          
          await storage.createDemandSignal({
            companyId: this.companyId,
            signalType: 'payment',
            signalDate: payment.createdAt,
            quantity: amountInDollars,
            unit: payment.totalMoney.currency,
            channel: 'square',
            confidence: 100,
            priority: amountInDollars > 1000 ? 'high' : amountInDollars > 100 ? 'medium' : 'low',
            attributes: {
              source: 'square',
              paymentId: payment.id,
              status: payment.status,
              sourceType: payment.sourceType,
              locationId: payment.locationId,
              customerId: payment.customerId,
              orderId: payment.orderId
            }
          });
          synced++;
        } catch (err: any) {
          errors.push(`Payment ${payment.id}: ${err.message}`);
        }
      }

      console.log(`[Square] Synced ${synced} payments as demand signals`);
      return { synced, errors };
    } catch (error: any) {
      console.error('[Square] Sync failed:', error.message);
      return { synced: 0, errors: [error.message] };
    }
  }
}
