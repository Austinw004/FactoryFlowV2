import axios from 'axios';
import { storage } from '../storage';
import { CredentialService } from './credentialService';

export interface KlaviyoProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
  properties: Record<string, any>;
}

export interface KlaviyoCampaign {
  id: string;
  name: string;
  status: string;
  sendTime: Date | null;
  sentAt: Date | null;
  channel: string;
  recipients: number;
  opens: number;
  clicks: number;
  unsubscribes: number;
  bounces: number;
}

export interface KlaviyoFlow {
  id: string;
  name: string;
  status: string;
  triggerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface KlaviyoList {
  id: string;
  name: string;
  profileCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class KlaviyoIntegration {
  private apiKey: string | null = null;
  private baseUrl = 'https://a.klaviyo.com/api';
  private revision = '2024-02-15';

  constructor(private companyId: string) {}

  async initialize(): Promise<boolean> {
    try {
      const credentials = await CredentialService.getDecryptedCredentials(this.companyId, 'klaviyo');
      if (!credentials?.apiKey) {
        console.log('[Klaviyo] No credentials found for company');
        return false;
      }
      this.apiKey = credentials.apiKey;
      console.log(`[Klaviyo] Initialized for company ${this.companyId}`);
      return true;
    } catch (error) {
      console.error('[Klaviyo] Failed to initialize:', error);
      return false;
    }
  }

  private getHeaders() {
    return {
      Authorization: `Klaviyo-API-Key ${this.apiKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      revision: this.revision
    };
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      const initialized = await this.initialize();
      if (!initialized) {
        return { success: false, message: 'Klaviyo credentials not configured' };
      }

      const response = await axios.get(`${this.baseUrl}/accounts/`, {
        headers: this.getHeaders(),
        timeout: 10000
      });

      if (response.data.data) {
        console.log('[Klaviyo] Connection test successful');
        return { success: true, message: 'Klaviyo API connected successfully' };
      }
      return { success: false, message: 'Unexpected response from Klaviyo' };
    } catch (error: any) {
      console.error('[Klaviyo] Connection test failed:', error.message);
      return { success: false, message: error.response?.data?.errors?.[0]?.detail || error.message };
    }
  }

  async getLists(): Promise<KlaviyoList[]> {
    try {
      if (!this.apiKey) await this.initialize();

      const response = await axios.get(`${this.baseUrl}/lists/`, {
        headers: this.getHeaders(),
        timeout: 15000
      });

      return (response.data.data || []).map((list: any) => ({
        id: list.id,
        name: list.attributes?.name || '',
        profileCount: list.attributes?.profile_count || 0,
        createdAt: new Date(list.attributes?.created),
        updatedAt: new Date(list.attributes?.updated)
      }));
    } catch (error: any) {
      console.error('[Klaviyo] Get lists failed:', error.message);
      return [];
    }
  }

  async getCampaigns(status?: string): Promise<KlaviyoCampaign[]> {
    try {
      if (!this.apiKey) await this.initialize();

      const params: Record<string, any> = {};
      if (status) params['filter'] = `equals(status,"${status}")`;

      const response = await axios.get(`${this.baseUrl}/campaigns/`, {
        headers: this.getHeaders(),
        params,
        timeout: 15000
      });

      return (response.data.data || []).map((campaign: any) => ({
        id: campaign.id,
        name: campaign.attributes?.name || '',
        status: campaign.attributes?.status || '',
        sendTime: campaign.attributes?.send_time ? new Date(campaign.attributes.send_time) : null,
        sentAt: campaign.attributes?.sent_at ? new Date(campaign.attributes.sent_at) : null,
        channel: campaign.attributes?.channel || 'email',
        recipients: campaign.attributes?.audiences?.included?.length || 0,
        opens: 0,
        clicks: 0,
        unsubscribes: 0,
        bounces: 0
      }));
    } catch (error: any) {
      console.error('[Klaviyo] Get campaigns failed:', error.message);
      return [];
    }
  }

  async getFlows(): Promise<KlaviyoFlow[]> {
    try {
      if (!this.apiKey) await this.initialize();

      const response = await axios.get(`${this.baseUrl}/flows/`, {
        headers: this.getHeaders(),
        timeout: 15000
      });

      return (response.data.data || []).map((flow: any) => ({
        id: flow.id,
        name: flow.attributes?.name || '',
        status: flow.attributes?.status || '',
        triggerId: flow.relationships?.flow_trigger?.data?.id || null,
        createdAt: new Date(flow.attributes?.created),
        updatedAt: new Date(flow.attributes?.updated)
      }));
    } catch (error: any) {
      console.error('[Klaviyo] Get flows failed:', error.message);
      return [];
    }
  }

  async getProfiles(email?: string): Promise<KlaviyoProfile[]> {
    try {
      if (!this.apiKey) await this.initialize();

      const params: Record<string, any> = {};
      if (email) params['filter'] = `equals(email,"${email}")`;

      const response = await axios.get(`${this.baseUrl}/profiles/`, {
        headers: this.getHeaders(),
        params,
        timeout: 15000
      });

      return (response.data.data || []).map((profile: any) => ({
        id: profile.id,
        email: profile.attributes?.email || '',
        firstName: profile.attributes?.first_name,
        lastName: profile.attributes?.last_name,
        phoneNumber: profile.attributes?.phone_number,
        createdAt: new Date(profile.attributes?.created),
        updatedAt: new Date(profile.attributes?.updated),
        properties: profile.attributes?.properties || {}
      }));
    } catch (error: any) {
      console.error('[Klaviyo] Get profiles failed:', error.message);
      return [];
    }
  }

  async syncCampaignsAsDemandSignals(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const initialized = await this.initialize();
      if (!initialized) {
        return { synced: 0, errors: ['Klaviyo not initialized'] };
      }

      const campaigns = await this.getCampaigns('sent');

      for (const campaign of campaigns) {
        try {
          await storage.createDemandSignal({
            companyId: this.companyId,
            signalType: 'marketing_campaign',
            signalDate: campaign.sentAt || campaign.sendTime || new Date(),
            quantity: campaign.recipients,
            unit: 'recipients',
            channel: 'klaviyo',
            confidence: 90,
            priority: campaign.recipients > 10000 ? 'high' : campaign.recipients > 1000 ? 'medium' : 'low',
            attributes: {
              source: 'klaviyo',
              campaignId: campaign.id,
              campaignName: campaign.name,
              channel: campaign.channel,
              status: campaign.status
            }
          });
          synced++;
        } catch (err: any) {
          errors.push(`Campaign ${campaign.id}: ${err.message}`);
        }
      }

      console.log(`[Klaviyo] Synced ${synced} campaigns as demand signals`);
      return { synced, errors };
    } catch (error: any) {
      console.error('[Klaviyo] Sync failed:', error.message);
      return { synced: 0, errors: [error.message] };
    }
  }
}
