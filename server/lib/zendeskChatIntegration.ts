import axios from 'axios';
import { storage } from '../storage';
import { CredentialService } from './credentialService';

export interface ZendeskChatConversation {
  id: string;
  status: string;
  channel: string;
  visitorId: string;
  visitorName: string | null;
  visitorEmail: string | null;
  agentId: string | null;
  agentName: string | null;
  departmentId: string | null;
  startedAt: Date;
  endedAt: Date | null;
  duration: number | null;
  rating: number | null;
  messageCount: number;
  tags: string[];
}

export interface ZendeskChatAgent {
  id: string;
  email: string;
  name: string;
  role: string;
  enabled: boolean;
  departments: string[];
}

export interface ZendeskChatDepartment {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  members: number;
}

export class ZendeskChatIntegration {
  private accessToken: string | null = null;
  private subdomain: string | null = null;
  private baseUrl = 'https://www.zopim.com/api/v2';

  constructor(private companyId: string) {}

  async initialize(): Promise<boolean> {
    try {
      const credentials = await CredentialService.getDecryptedCredentials(this.companyId, 'zendesk_chat') as any;
      if (!credentials?.accessToken) {
        console.log('[ZendeskChat] No credentials found for company');
        return false;
      }
      this.accessToken = credentials.accessToken;
      this.subdomain = credentials.subdomain;
      console.log(`[ZendeskChat] Initialized for company ${this.companyId}`);
      return true;
    } catch (error) {
      console.error('[ZendeskChat] Failed to initialize:', error);
      return false;
    }
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      const initialized = await this.initialize();
      if (!initialized) {
        return { success: false, message: 'Zendesk Chat credentials not configured' };
      }

      const response = await axios.get(`${this.baseUrl}/account`, {
        headers: this.getHeaders(),
        timeout: 10000
      });

      if (response.data.account_key) {
        console.log('[ZendeskChat] Connection test successful');
        return { success: true, message: 'Zendesk Chat API connected successfully' };
      }
      return { success: false, message: 'Unexpected response from Zendesk Chat' };
    } catch (error: any) {
      console.error('[ZendeskChat] Connection test failed:', error.message);
      return { success: false, message: error.response?.data?.description || error.message };
    }
  }

  async getChats(startTime?: Date): Promise<ZendeskChatConversation[]> {
    try {
      if (!this.accessToken) await this.initialize();

      const params: Record<string, any> = { limit: 100 };
      if (startTime) params.start_time = Math.floor(startTime.getTime() / 1000);

      const response = await axios.get(`${this.baseUrl}/chats`, {
        headers: this.getHeaders(),
        params,
        timeout: 15000
      });

      return (response.data.chats || []).map((chat: any) => ({
        id: chat.id,
        status: chat.session?.status || 'ended',
        channel: chat.type || 'chat',
        visitorId: chat.visitor?.id || '',
        visitorName: chat.visitor?.display_name,
        visitorEmail: chat.visitor?.email,
        agentId: chat.agent_ids?.[0] || null,
        agentName: null,
        departmentId: chat.department_id,
        startedAt: new Date(chat.timestamp * 1000),
        endedAt: chat.end_timestamp ? new Date(chat.end_timestamp * 1000) : null,
        duration: chat.duration,
        rating: chat.rating,
        messageCount: chat.count?.total || 0,
        tags: chat.tags || []
      }));
    } catch (error: any) {
      console.error('[ZendeskChat] Get chats failed:', error.message);
      return [];
    }
  }

  async getAgents(): Promise<ZendeskChatAgent[]> {
    try {
      if (!this.accessToken) await this.initialize();

      const response = await axios.get(`${this.baseUrl}/agents`, {
        headers: this.getHeaders(),
        timeout: 10000
      });

      return (response.data || []).map((agent: any) => ({
        id: agent.id,
        email: agent.email,
        name: agent.display_name || agent.name,
        role: agent.role,
        enabled: agent.enabled,
        departments: agent.departments || []
      }));
    } catch (error: any) {
      console.error('[ZendeskChat] Get agents failed:', error.message);
      return [];
    }
  }

  async getDepartments(): Promise<ZendeskChatDepartment[]> {
    try {
      if (!this.accessToken) await this.initialize();

      const response = await axios.get(`${this.baseUrl}/departments`, {
        headers: this.getHeaders(),
        timeout: 10000
      });

      return (response.data || []).map((dept: any) => ({
        id: dept.id,
        name: dept.name,
        description: dept.description || '',
        enabled: dept.enabled,
        members: dept.members?.length || 0
      }));
    } catch (error: any) {
      console.error('[ZendeskChat] Get departments failed:', error.message);
      return [];
    }
  }

  async syncChatsAsDemandSignals(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const initialized = await this.initialize();
      if (!initialized) {
        return { synced: 0, errors: ['Zendesk Chat not initialized'] };
      }

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const chats = await this.getChats(thirtyDaysAgo);

      for (const chat of chats) {
        try {
          await storage.createDemandSignal({
            companyId: this.companyId,
            signalType: 'live_chat',
            signalDate: chat.startedAt,
            quantity: chat.messageCount,
            unit: 'messages',
            channel: 'zendesk_chat',
            confidence: 80,
            priority: chat.rating && chat.rating < 3 ? 'high' : chat.duration && chat.duration > 600 ? 'medium' : 'low',
            attributes: {
              source: 'zendesk_chat',
              chatId: chat.id,
              visitorEmail: chat.visitorEmail,
              visitorName: chat.visitorName,
              duration: chat.duration,
              rating: chat.rating,
              tags: chat.tags
            }
          });
          synced++;
        } catch (err: any) {
          errors.push(`Chat ${chat.id}: ${err.message}`);
        }
      }

      console.log(`[ZendeskChat] Synced ${synced} chats as demand signals`);
      return { synced, errors };
    } catch (error: any) {
      console.error('[ZendeskChat] Sync failed:', error.message);
      return { synced: 0, errors: [error.message] };
    }
  }
}
