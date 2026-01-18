import axios from 'axios';
import { storage } from '../storage';
import { CredentialService } from './credentialService';

export interface IntercomConversation {
  id: string;
  state: string;
  open: boolean;
  priority: string;
  assignee: { id: string; name: string } | null;
  user: { id: string; email: string; name: string } | null;
  createdAt: Date;
  updatedAt: Date;
  waitingSince: Date | null;
  tags: string[];
}

export interface IntercomContact {
  id: string;
  email: string;
  name: string;
  role: string;
  signedUpAt: Date | null;
  lastSeenAt: Date | null;
  browser: string | null;
  os: string | null;
  customAttributes: Record<string, any>;
}

export interface IntercomArticle {
  id: string;
  title: string;
  state: string;
  views: number;
  author: string;
  createdAt: Date;
  updatedAt: Date;
}

export class IntercomIntegration {
  private accessToken: string | null = null;
  private baseUrl = 'https://api.intercom.io';

  constructor(private companyId: string) {}

  async initialize(): Promise<boolean> {
    try {
      const credentials = await CredentialService.getDecryptedCredentials(this.companyId, 'intercom');
      if (!credentials?.accessToken) {
        console.log('[Intercom] No credentials found for company');
        return false;
      }
      this.accessToken = credentials.accessToken;
      console.log(`[Intercom] Initialized for company ${this.companyId}`);
      return true;
    } catch (error) {
      console.error('[Intercom] Failed to initialize:', error);
      return false;
    }
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Intercom-Version': '2.10'
    };
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      const initialized = await this.initialize();
      if (!initialized) {
        return { success: false, message: 'Intercom credentials not configured' };
      }

      const response = await axios.get(`${this.baseUrl}/me`, {
        headers: this.getHeaders(),
        timeout: 10000
      });

      if (response.data.type === 'admin') {
        console.log('[Intercom] Connection test successful');
        return { success: true, message: `Connected as ${response.data.name}` };
      }
      return { success: false, message: 'Unexpected response from Intercom' };
    } catch (error: any) {
      console.error('[Intercom] Connection test failed:', error.message);
      return { success: false, message: error.response?.data?.errors?.[0]?.message || error.message };
    }
  }

  async getConversations(open?: boolean): Promise<IntercomConversation[]> {
    try {
      if (!this.accessToken) await this.initialize();

      const response = await axios.get(`${this.baseUrl}/conversations`, {
        headers: this.getHeaders(),
        params: { open: open },
        timeout: 15000
      });

      return (response.data.conversations || []).map((conv: any) => ({
        id: conv.id,
        state: conv.state,
        open: conv.open,
        priority: conv.priority || 'not_priority',
        assignee: conv.assignee ? { id: conv.assignee.id, name: conv.assignee.name } : null,
        user: conv.source?.author ? {
          id: conv.source.author.id,
          email: conv.source.author.email || '',
          name: conv.source.author.name || ''
        } : null,
        createdAt: new Date(conv.created_at * 1000),
        updatedAt: new Date(conv.updated_at * 1000),
        waitingSince: conv.waiting_since ? new Date(conv.waiting_since * 1000) : null,
        tags: (conv.tags?.tags || []).map((t: any) => t.name)
      }));
    } catch (error: any) {
      console.error('[Intercom] Get conversations failed:', error.message);
      return [];
    }
  }

  async getContacts(email?: string): Promise<IntercomContact[]> {
    try {
      if (!this.accessToken) await this.initialize();

      let url = `${this.baseUrl}/contacts`;
      const params: Record<string, any> = {};
      
      if (email) {
        params.query = JSON.stringify({ field: 'email', operator: '=', value: email });
      }

      const response = await axios.get(url, {
        headers: this.getHeaders(),
        params,
        timeout: 15000
      });

      return (response.data.data || []).map((contact: any) => ({
        id: contact.id,
        email: contact.email || '',
        name: contact.name || '',
        role: contact.role || 'user',
        signedUpAt: contact.signed_up_at ? new Date(contact.signed_up_at * 1000) : null,
        lastSeenAt: contact.last_seen_at ? new Date(contact.last_seen_at * 1000) : null,
        browser: contact.browser || null,
        os: contact.os || null,
        customAttributes: contact.custom_attributes || {}
      }));
    } catch (error: any) {
      console.error('[Intercom] Get contacts failed:', error.message);
      return [];
    }
  }

  async getArticles(): Promise<IntercomArticle[]> {
    try {
      if (!this.accessToken) await this.initialize();

      const response = await axios.get(`${this.baseUrl}/articles`, {
        headers: this.getHeaders(),
        timeout: 15000
      });

      return (response.data.data || []).map((article: any) => ({
        id: article.id,
        title: article.title,
        state: article.state,
        views: article.statistics?.views || 0,
        author: article.author?.name || '',
        createdAt: new Date(article.created_at * 1000),
        updatedAt: new Date(article.updated_at * 1000)
      }));
    } catch (error: any) {
      console.error('[Intercom] Get articles failed:', error.message);
      return [];
    }
  }

  async syncConversationsAsDemandSignals(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const initialized = await this.initialize();
      if (!initialized) {
        return { synced: 0, errors: ['Intercom not initialized'] };
      }

      const conversations = await this.getConversations();

      for (const conv of conversations) {
        try {
          await storage.createDemandSignal({
            companyId: this.companyId,
            signalType: 'support_conversation',
            signalDate: conv.createdAt,
            quantity: 1,
            unit: 'conversation',
            channel: 'intercom',
            confidence: 80,
            priority: conv.priority === 'priority' ? 'high' : conv.open ? 'medium' : 'low',
            attributes: {
              source: 'intercom',
              conversationId: conv.id,
              state: conv.state,
              open: conv.open,
              userEmail: conv.user?.email,
              userName: conv.user?.name,
              assignee: conv.assignee?.name,
              tags: conv.tags
            }
          });
          synced++;
        } catch (err: any) {
          errors.push(`Conversation ${conv.id}: ${err.message}`);
        }
      }

      console.log(`[Intercom] Synced ${synced} conversations as demand signals`);
      return { synced, errors };
    } catch (error: any) {
      console.error('[Intercom] Sync failed:', error.message);
      return { synced: 0, errors: [error.message] };
    }
  }
}
