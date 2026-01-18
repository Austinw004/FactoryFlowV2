import axios from 'axios';
import { storage } from '../storage';
import { CredentialService } from './credentialService';

export interface MailchimpCampaign {
  id: string;
  webId: number;
  type: string;
  status: string;
  emailsSent: number;
  sendTime: Date | null;
  subject: string;
  listId: string;
  opens: number;
  clicks: number;
  unsubscribes: number;
}

export interface MailchimpList {
  id: string;
  name: string;
  memberCount: number;
  unsubscribeCount: number;
  openRate: number;
  clickRate: number;
}

export interface MailchimpMember {
  id: string;
  email: string;
  status: string;
  mergeFields: Record<string, any>;
  tags: string[];
  lastChanged: Date;
}

export class MailchimpIntegration {
  private apiKey: string | null = null;
  private serverPrefix: string | null = null;

  constructor(private companyId: string) {}

  private get baseUrl(): string {
    return `https://${this.serverPrefix}.api.mailchimp.com/3.0`;
  }

  async initialize(): Promise<boolean> {
    try {
      const credentials = await CredentialService.getDecryptedCredentials(this.companyId, 'mailchimp');
      if (!credentials?.apiKey) {
        console.log('[Mailchimp] No credentials found for company');
        return false;
      }
      this.apiKey = credentials.apiKey;
      this.serverPrefix = this.apiKey.split('-').pop() || 'us1';
      console.log(`[Mailchimp] Initialized for company ${this.companyId}`);
      return true;
    } catch (error) {
      console.error('[Mailchimp] Failed to initialize:', error);
      return false;
    }
  }

  private getAuthHeaders() {
    return {
      Authorization: `Basic ${Buffer.from(`anystring:${this.apiKey}`).toString('base64')}`,
      'Content-Type': 'application/json'
    };
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      const initialized = await this.initialize();
      if (!initialized) {
        return { success: false, message: 'Mailchimp credentials not configured' };
      }

      const response = await axios.get(`${this.baseUrl}/ping`, {
        headers: this.getAuthHeaders(),
        timeout: 10000
      });

      if (response.data.health_status === 'Everything\'s Chimpy!') {
        console.log('[Mailchimp] Connection test successful');
        return { success: true, message: 'Mailchimp API connected successfully' };
      }
      return { success: false, message: 'Unexpected response from Mailchimp' };
    } catch (error: any) {
      console.error('[Mailchimp] Connection test failed:', error.message);
      return { success: false, message: error.response?.data?.detail || error.message };
    }
  }

  async getLists(): Promise<MailchimpList[]> {
    try {
      if (!this.apiKey) await this.initialize();
      
      const response = await axios.get(`${this.baseUrl}/lists`, {
        headers: this.getAuthHeaders(),
        params: { count: 100 },
        timeout: 10000
      });

      return (response.data.lists || []).map((list: any) => ({
        id: list.id,
        name: list.name,
        memberCount: list.stats?.member_count || 0,
        unsubscribeCount: list.stats?.unsubscribe_count || 0,
        openRate: list.stats?.open_rate || 0,
        clickRate: list.stats?.click_rate || 0
      }));
    } catch (error: any) {
      console.error('[Mailchimp] Get lists failed:', error.message);
      return [];
    }
  }

  async getCampaigns(sinceDate?: Date): Promise<MailchimpCampaign[]> {
    try {
      if (!this.apiKey) await this.initialize();

      const params: Record<string, any> = { count: 100, status: 'sent' };
      if (sinceDate) {
        params.since_send_time = sinceDate.toISOString();
      }

      const response = await axios.get(`${this.baseUrl}/campaigns`, {
        headers: this.getAuthHeaders(),
        params,
        timeout: 15000
      });

      const campaigns: MailchimpCampaign[] = [];
      for (const campaign of response.data.campaigns || []) {
        const reportResponse = await axios.get(`${this.baseUrl}/reports/${campaign.id}`, {
          headers: this.getAuthHeaders(),
          timeout: 10000
        }).catch(() => ({ data: {} }));

        campaigns.push({
          id: campaign.id,
          webId: campaign.web_id,
          type: campaign.type,
          status: campaign.status,
          emailsSent: campaign.emails_sent || 0,
          sendTime: campaign.send_time ? new Date(campaign.send_time) : null,
          subject: campaign.settings?.subject_line || '',
          listId: campaign.recipients?.list_id || '',
          opens: reportResponse.data?.opens?.unique_opens || 0,
          clicks: reportResponse.data?.clicks?.unique_clicks || 0,
          unsubscribes: reportResponse.data?.unsubscribes || 0
        });
      }

      return campaigns;
    } catch (error: any) {
      console.error('[Mailchimp] Get campaigns failed:', error.message);
      return [];
    }
  }

  async getListMembers(listId: string, status?: string): Promise<MailchimpMember[]> {
    try {
      if (!this.apiKey) await this.initialize();

      const params: Record<string, any> = { count: 100 };
      if (status) params.status = status;

      const response = await axios.get(`${this.baseUrl}/lists/${listId}/members`, {
        headers: this.getAuthHeaders(),
        params,
        timeout: 15000
      });

      return (response.data.members || []).map((member: any) => ({
        id: member.id,
        email: member.email_address,
        status: member.status,
        mergeFields: member.merge_fields || {},
        tags: (member.tags || []).map((t: any) => t.name),
        lastChanged: new Date(member.last_changed)
      }));
    } catch (error: any) {
      console.error('[Mailchimp] Get members failed:', error.message);
      return [];
    }
  }

  async syncCampaignsAsDemandSignals(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const initialized = await this.initialize();
      if (!initialized) {
        return { synced: 0, errors: ['Mailchimp not initialized'] };
      }

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const campaigns = await this.getCampaigns(thirtyDaysAgo);

      for (const campaign of campaigns) {
        try {
          const engagementScore = Math.round((campaign.opens / Math.max(campaign.emailsSent, 1)) * 100);
          
          await storage.createDemandSignal({
            companyId: this.companyId,
            signalType: 'email_campaign',
            signalDate: campaign.sendTime || new Date(),
            quantity: campaign.emailsSent,
            unit: 'emails',
            channel: 'mailchimp',
            confidence: Math.min(100, engagementScore + 50),
            priority: engagementScore > 30 ? 'high' : engagementScore > 15 ? 'medium' : 'low',
            attributes: {
              source: 'mailchimp',
              campaignId: campaign.id,
              subject: campaign.subject,
              opens: campaign.opens,
              clicks: campaign.clicks,
              unsubscribes: campaign.unsubscribes,
              openRate: (campaign.opens / Math.max(campaign.emailsSent, 1) * 100).toFixed(2),
              clickRate: (campaign.clicks / Math.max(campaign.emailsSent, 1) * 100).toFixed(2)
            }
          });
          synced++;
        } catch (err: any) {
          errors.push(`Campaign ${campaign.id}: ${err.message}`);
        }
      }

      console.log(`[Mailchimp] Synced ${synced} campaigns as demand signals`);
      return { synced, errors };
    } catch (error: any) {
      console.error('[Mailchimp] Sync failed:', error.message);
      return { synced: 0, errors: [error.message] };
    }
  }
}
