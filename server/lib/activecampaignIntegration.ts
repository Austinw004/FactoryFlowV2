import axios from 'axios';
import { storage } from '../storage';
import { CredentialService } from './credentialService';

export interface ActiveCampaignContact {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  score: number | null;
  tags: string[];
  lists: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ActiveCampaignDeal {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  status: string;
  contactId: string;
  ownerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActiveCampaignCampaign {
  id: string;
  name: string;
  type: string;
  status: string;
  sendAmount: number;
  opens: number;
  clicks: number;
  unsubscribes: number;
  sentDate: Date | null;
}

export interface ActiveCampaignAutomation {
  id: string;
  name: string;
  status: string;
  enteredCount: number;
  exitedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class ActiveCampaignIntegration {
  private apiKey: string | null = null;
  private apiUrl: string | null = null;

  constructor(private companyId: string) {}

  async initialize(): Promise<boolean> {
    try {
      const credentials = await CredentialService.getDecryptedCredentials(this.companyId, 'activecampaign') as any;
      if (!credentials?.apiKey || !credentials?.apiUrl) {
        console.log('[ActiveCampaign] No credentials found for company');
        return false;
      }
      this.apiKey = credentials.apiKey;
      this.apiUrl = credentials.apiUrl.replace(/\/$/, '');
      console.log(`[ActiveCampaign] Initialized for company ${this.companyId}`);
      return true;
    } catch (error) {
      console.error('[ActiveCampaign] Failed to initialize:', error);
      return false;
    }
  }

  private getHeaders() {
    return {
      'Api-Token': this.apiKey!,
      'Content-Type': 'application/json'
    };
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      const initialized = await this.initialize();
      if (!initialized) {
        return { success: false, message: 'ActiveCampaign credentials not configured' };
      }

      const response = await axios.get(`${this.apiUrl}/api/3/users/me`, {
        headers: this.getHeaders(),
        timeout: 10000
      });

      if (response.data.user) {
        console.log('[ActiveCampaign] Connection test successful');
        return { success: true, message: `Connected as ${response.data.user.email}` };
      }
      return { success: false, message: 'Unexpected response from ActiveCampaign' };
    } catch (error: any) {
      console.error('[ActiveCampaign] Connection test failed:', error.message);
      return { success: false, message: error.response?.data?.message || error.message };
    }
  }

  async getContacts(): Promise<ActiveCampaignContact[]> {
    try {
      if (!this.apiKey) await this.initialize();

      const response = await axios.get(`${this.apiUrl}/api/3/contacts`, {
        headers: this.getHeaders(),
        params: { limit: 100 },
        timeout: 15000
      });

      return (response.data.contacts || []).map((contact: any) => ({
        id: contact.id,
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
        phone: contact.phone,
        score: contact.score_values?.[0]?.score ? parseInt(contact.score_values[0].score) : null,
        tags: [],
        lists: [],
        createdAt: new Date(contact.cdate),
        updatedAt: new Date(contact.udate)
      }));
    } catch (error: any) {
      console.error('[ActiveCampaign] Get contacts failed:', error.message);
      return [];
    }
  }

  async getDeals(): Promise<ActiveCampaignDeal[]> {
    try {
      if (!this.apiKey) await this.initialize();

      const response = await axios.get(`${this.apiUrl}/api/3/deals`, {
        headers: this.getHeaders(),
        params: { limit: 100 },
        timeout: 15000
      });

      return (response.data.deals || []).map((deal: any) => ({
        id: deal.id,
        title: deal.title,
        value: parseInt(deal.value) / 100,
        currency: deal.currency || 'USD',
        stage: deal.stage,
        status: deal.status === '0' ? 'open' : deal.status === '1' ? 'won' : 'lost',
        contactId: deal.contact,
        ownerId: deal.owner,
        createdAt: new Date(deal.cdate),
        updatedAt: new Date(deal.mdate)
      }));
    } catch (error: any) {
      console.error('[ActiveCampaign] Get deals failed:', error.message);
      return [];
    }
  }

  async getCampaigns(): Promise<ActiveCampaignCampaign[]> {
    try {
      if (!this.apiKey) await this.initialize();

      const response = await axios.get(`${this.apiUrl}/api/3/campaigns`, {
        headers: this.getHeaders(),
        params: { limit: 100 },
        timeout: 15000
      });

      return (response.data.campaigns || []).map((campaign: any) => ({
        id: campaign.id,
        name: campaign.name,
        type: campaign.type,
        status: campaign.status,
        sendAmount: parseInt(campaign.send_amt) || 0,
        opens: parseInt(campaign.opens) || 0,
        clicks: parseInt(campaign.clicks) || 0,
        unsubscribes: parseInt(campaign.unsubs) || 0,
        sentDate: campaign.sdate ? new Date(campaign.sdate) : null
      }));
    } catch (error: any) {
      console.error('[ActiveCampaign] Get campaigns failed:', error.message);
      return [];
    }
  }

  async getAutomations(): Promise<ActiveCampaignAutomation[]> {
    try {
      if (!this.apiKey) await this.initialize();

      const response = await axios.get(`${this.apiUrl}/api/3/automations`, {
        headers: this.getHeaders(),
        params: { limit: 100 },
        timeout: 15000
      });

      return (response.data.automations || []).map((auto: any) => ({
        id: auto.id,
        name: auto.name,
        status: auto.status === '1' ? 'active' : 'inactive',
        enteredCount: parseInt(auto.entered) || 0,
        exitedCount: parseInt(auto.exited) || 0,
        createdAt: new Date(auto.cdate),
        updatedAt: new Date(auto.mdate)
      }));
    } catch (error: any) {
      console.error('[ActiveCampaign] Get automations failed:', error.message);
      return [];
    }
  }

  async syncDealsAsDemandSignals(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const initialized = await this.initialize();
      if (!initialized) {
        return { synced: 0, errors: ['ActiveCampaign not initialized'] };
      }

      const deals = await this.getDeals();

      for (const deal of deals) {
        try {
          await storage.createDemandSignal({
            companyId: this.companyId,
            signalType: 'crm_deal',
            signalDate: deal.createdAt,
            quantity: deal.value,
            unit: deal.currency,
            channel: 'activecampaign',
            confidence: deal.status === 'won' ? 100 : deal.status === 'open' ? 70 : 50,
            priority: deal.value > 10000 ? 'high' : deal.value > 1000 ? 'medium' : 'low',
            attributes: {
              source: 'activecampaign',
              dealId: deal.id,
              title: deal.title,
              status: deal.status,
              stage: deal.stage,
              contactId: deal.contactId
            }
          });
          synced++;
        } catch (err: any) {
          errors.push(`Deal ${deal.id}: ${err.message}`);
        }
      }

      console.log(`[ActiveCampaign] Synced ${synced} deals as demand signals`);
      return { synced, errors };
    } catch (error: any) {
      console.error('[ActiveCampaign] Sync failed:', error.message);
      return { synced: 0, errors: [error.message] };
    }
  }
}
