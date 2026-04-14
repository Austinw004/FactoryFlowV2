import axios from 'axios';
import { storage } from '../storage';
import { CredentialService } from './credentialService';

export interface DripSubscriber {
  id: string;
  email: string;
  status: string;
  firstName: string | null;
  lastName: string | null;
  tags: string[];
  customFields: Record<string, any>;
  createdAt: Date;
  lifetimeValue: number | null;
}

export interface DripCampaign {
  id: string;
  name: string;
  status: string;
  createdAt: Date;
  sentCount: number;
  openRate: number;
  clickRate: number;
}

export interface DripWorkflow {
  id: string;
  name: string;
  status: string;
  triggerType: string;
  createdAt: Date;
  activeSubscriberCount: number;
}

export class DripIntegration {
  private apiToken: string | null = null;
  private accountId: string | null = null;
  private baseUrl = 'https://api.getdrip.com/v2';

  constructor(private companyId: string) {}

  async initialize(): Promise<boolean> {
    try {
      const credentials = await CredentialService.getDecryptedCredentials(this.companyId, 'drip') as any;
      if (!credentials?.apiToken || !credentials?.accountId) {
        console.log('[Drip] No credentials found for company');
        return false;
      }
      this.apiToken = credentials.apiToken;
      this.accountId = credentials.accountId;
      console.log(`[Drip] Initialized for company ${this.companyId}`);
      return true;
    } catch (error) {
      console.error('[Drip] Failed to initialize:', error);
      return false;
    }
  }

  private getHeaders() {
    return {
      Authorization: `Basic ${Buffer.from(`${this.apiToken}:`).toString('base64')}`,
      'Content-Type': 'application/json'
    };
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      const initialized = await this.initialize();
      if (!initialized) {
        return { success: false, message: 'Drip credentials not configured' };
      }

      const response = await axios.get(`${this.baseUrl}/accounts`, {
        headers: this.getHeaders(),
        timeout: 10000
      });

      if (response.data.accounts) {
        console.log('[Drip] Connection test successful');
        return { success: true, message: 'Drip API connected successfully' };
      }
      return { success: false, message: 'Unexpected response from Drip' };
    } catch (error: any) {
      console.error('[Drip] Connection test failed:', error.message);
      return { success: false, message: error.response?.data?.errors?.[0] || error.message };
    }
  }

  async getSubscribers(status?: string): Promise<DripSubscriber[]> {
    try {
      if (!this.apiToken) await this.initialize();

      const params: Record<string, any> = { per_page: 100 };
      if (status) params.status = status;

      const response = await axios.get(`${this.baseUrl}/${this.accountId}/subscribers`, {
        headers: this.getHeaders(),
        params,
        timeout: 15000
      });

      return (response.data.subscribers || []).map((sub: any) => ({
        id: sub.id,
        email: sub.email,
        status: sub.status,
        firstName: sub.first_name,
        lastName: sub.last_name,
        tags: sub.tags || [],
        customFields: sub.custom_fields || {},
        createdAt: new Date(sub.created_at),
        lifetimeValue: sub.lifetime_value
      }));
    } catch (error: any) {
      console.error('[Drip] Get subscribers failed:', error.message);
      return [];
    }
  }

  async getCampaigns(): Promise<DripCampaign[]> {
    try {
      if (!this.apiToken) await this.initialize();

      const response = await axios.get(`${this.baseUrl}/${this.accountId}/campaigns`, {
        headers: this.getHeaders(),
        timeout: 15000
      });

      return (response.data.campaigns || []).map((campaign: any) => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        createdAt: new Date(campaign.created_at),
        sentCount: campaign.sent_count || 0,
        openRate: campaign.open_rate || 0,
        clickRate: campaign.click_rate || 0
      }));
    } catch (error: any) {
      console.error('[Drip] Get campaigns failed:', error.message);
      return [];
    }
  }

  async getWorkflows(): Promise<DripWorkflow[]> {
    try {
      if (!this.apiToken) await this.initialize();

      const response = await axios.get(`${this.baseUrl}/${this.accountId}/workflows`, {
        headers: this.getHeaders(),
        timeout: 15000
      });

      return (response.data.workflows || []).map((workflow: any) => ({
        id: workflow.id,
        name: workflow.name,
        status: workflow.status,
        triggerType: workflow.trigger_type || '',
        createdAt: new Date(workflow.created_at),
        activeSubscriberCount: workflow.active_count || 0
      }));
    } catch (error: any) {
      console.error('[Drip] Get workflows failed:', error.message);
      return [];
    }
  }

  async syncSubscribersAsDemandSignals(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const initialized = await this.initialize();
      if (!initialized) {
        return { synced: 0, errors: ['Drip not initialized'] };
      }

      const subscribers = await this.getSubscribers('active');

      for (const sub of subscribers.slice(0, 100)) {
        try {
          await storage.createDemandSignal({
            companyId: this.companyId,
            signalType: 'email_subscriber',
            signalDate: sub.createdAt,
            quantity: sub.lifetimeValue || 0,
            unit: 'USD',
            channel: 'drip',
            confidence: 85,
            priority: (sub.lifetimeValue || 0) > 500 ? 'high' : (sub.lifetimeValue || 0) > 100 ? 'medium' : 'low',
            attributes: {
              source: 'drip',
              subscriberId: sub.id,
              email: sub.email,
              status: sub.status,
              tags: sub.tags,
              lifetimeValue: sub.lifetimeValue
            }
          });
          synced++;
        } catch (err: any) {
          errors.push(`Subscriber ${sub.id}: ${err.message}`);
        }
      }

      console.log(`[Drip] Synced ${synced} subscribers as demand signals`);
      return { synced, errors };
    } catch (error: any) {
      console.error('[Drip] Sync failed:', error.message);
      return { synced: 0, errors: [error.message] };
    }
  }
}
