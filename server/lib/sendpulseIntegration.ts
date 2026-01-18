import axios from 'axios';
import { storage } from '../storage';
import { CredentialService } from './credentialService';

export interface SendPulseCampaign {
  id: number;
  name: string;
  status: string;
  allEmailQty: number;
  sentEmailQty: number;
  openedEmailQty: number;
  clickedEmailQty: number;
  unsubscribedQty: number;
  sendDate: Date | null;
  createdAt: Date;
}

export interface SendPulseAddressBook {
  id: number;
  name: string;
  allEmailQty: number;
  activeEmailQty: number;
  inactiveEmailQty: number;
  createdAt: Date;
}

export interface SendPulseEmail {
  id: number;
  email: string;
  status: string;
  variables: Record<string, any>;
  addedAt: Date;
}

export class SendPulseIntegration {
  private apiUserId: string | null = null;
  private apiSecret: string | null = null;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private baseUrl = 'https://api.sendpulse.com';

  constructor(private companyId: string) {}

  async initialize(): Promise<boolean> {
    try {
      const credentials = await CredentialService.getDecryptedCredentials(this.companyId, 'sendpulse') as any;
      if (!credentials?.apiUserId || !credentials?.apiSecret) {
        console.log('[SendPulse] No credentials found for company');
        return false;
      }
      this.apiUserId = credentials.apiUserId;
      this.apiSecret = credentials.apiSecret;
      console.log(`[SendPulse] Initialized for company ${this.companyId}`);
      return true;
    } catch (error) {
      console.error('[SendPulse] Failed to initialize:', error);
      return false;
    }
  }

  private async getAccessToken(): Promise<string | null> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.apiUserId || !this.apiSecret) {
      return null;
    }

    try {
      const response = await axios.post(`${this.baseUrl}/oauth/access_token`, {
        grant_type: 'client_credentials',
        client_id: this.apiUserId,
        client_secret: this.apiSecret
      }, {
        timeout: 10000
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 60) * 1000);
      return this.accessToken;
    } catch (error: any) {
      console.error('[SendPulse] Failed to get access token:', error.message);
      return null;
    }
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      const initialized = await this.initialize();
      if (!initialized) {
        return { success: false, message: 'SendPulse credentials not configured' };
      }

      const token = await this.getAccessToken();
      if (!token) {
        return { success: false, message: 'Failed to authenticate with SendPulse' };
      }

      const response = await axios.get(`${this.baseUrl}/balance/detail/USD`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });

      if (response.data) {
        console.log('[SendPulse] Connection test successful');
        return { success: true, message: 'SendPulse API connected successfully' };
      }
      return { success: false, message: 'Unexpected response from SendPulse' };
    } catch (error: any) {
      console.error('[SendPulse] Connection test failed:', error.message);
      return { success: false, message: error.response?.data?.message || error.message };
    }
  }

  async getAddressBooks(): Promise<SendPulseAddressBook[]> {
    try {
      const token = await this.getAccessToken();
      if (!token) return [];

      const response = await axios.get(`${this.baseUrl}/addressbooks`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000
      });

      return (response.data || []).map((book: any) => ({
        id: book.id,
        name: book.name,
        allEmailQty: book.all_email_qty || 0,
        activeEmailQty: book.active_email_qty || 0,
        inactiveEmailQty: book.inactive_email_qty || 0,
        createdAt: new Date(book.creationdate)
      }));
    } catch (error: any) {
      console.error('[SendPulse] Get address books failed:', error.message);
      return [];
    }
  }

  async getCampaigns(): Promise<SendPulseCampaign[]> {
    try {
      const token = await this.getAccessToken();
      if (!token) return [];

      const response = await axios.get(`${this.baseUrl}/campaigns`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000
      });

      return (response.data || []).map((campaign: any) => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        allEmailQty: campaign.all_email_qty || 0,
        sentEmailQty: campaign.sent_email_qty || 0,
        openedEmailQty: campaign.opened_email_qty || 0,
        clickedEmailQty: campaign.clicked_email_qty || 0,
        unsubscribedQty: campaign.unsubscribed_qty || 0,
        sendDate: campaign.send_date ? new Date(campaign.send_date) : null,
        createdAt: new Date(campaign.created)
      }));
    } catch (error: any) {
      console.error('[SendPulse] Get campaigns failed:', error.message);
      return [];
    }
  }

  async getEmails(addressBookId: number): Promise<SendPulseEmail[]> {
    try {
      const token = await this.getAccessToken();
      if (!token) return [];

      const response = await axios.get(`${this.baseUrl}/addressbooks/${addressBookId}/emails`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000
      });

      return (response.data || []).map((email: any) => ({
        id: email.id,
        email: email.email,
        status: email.status,
        variables: email.variables || {},
        addedAt: new Date(email.add_date)
      }));
    } catch (error: any) {
      console.error('[SendPulse] Get emails failed:', error.message);
      return [];
    }
  }

  async syncCampaignsAsDemandSignals(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const initialized = await this.initialize();
      if (!initialized) {
        return { synced: 0, errors: ['SendPulse not initialized'] };
      }

      const campaigns = await this.getCampaigns();

      for (const campaign of campaigns) {
        try {
          const openRate = campaign.sentEmailQty > 0 
            ? (campaign.openedEmailQty / campaign.sentEmailQty) * 100 
            : 0;

          await storage.createDemandSignal({
            companyId: this.companyId,
            signalType: 'email_campaign',
            signalDate: campaign.sendDate || campaign.createdAt,
            quantity: campaign.sentEmailQty,
            unit: 'emails',
            channel: 'sendpulse',
            confidence: Math.min(100, 50 + openRate),
            priority: openRate > 30 ? 'high' : openRate > 15 ? 'medium' : 'low',
            attributes: {
              source: 'sendpulse',
              campaignId: campaign.id,
              campaignName: campaign.name,
              status: campaign.status,
              opens: campaign.openedEmailQty,
              clicks: campaign.clickedEmailQty,
              unsubscribes: campaign.unsubscribedQty,
              openRate: openRate.toFixed(2)
            }
          });
          synced++;
        } catch (err: any) {
          errors.push(`Campaign ${campaign.id}: ${err.message}`);
        }
      }

      console.log(`[SendPulse] Synced ${synced} campaigns as demand signals`);
      return { synced, errors };
    } catch (error: any) {
      console.error('[SendPulse] Sync failed:', error.message);
      return { synced: 0, errors: [error.message] };
    }
  }
}
