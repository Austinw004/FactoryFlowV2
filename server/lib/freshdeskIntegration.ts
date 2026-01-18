import axios from 'axios';
import { storage } from '../storage';
import { CredentialService } from './credentialService';

export interface FreshdeskTicket {
  id: number;
  subject: string;
  description: string;
  status: number;
  statusName: string;
  priority: number;
  priorityName: string;
  type: string | null;
  requesterEmail: string;
  requesterName: string;
  agentId: number | null;
  groupId: number | null;
  createdAt: Date;
  updatedAt: Date;
  dueBy: Date | null;
  tags: string[];
}

export interface FreshdeskContact {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  companyId: number | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FreshdeskAgent {
  id: number;
  email: string;
  name: string;
  active: boolean;
  ticketScope: number;
  groupIds: number[];
}

const STATUS_MAP: Record<number, string> = {
  2: 'Open',
  3: 'Pending',
  4: 'Resolved',
  5: 'Closed'
};

const PRIORITY_MAP: Record<number, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Urgent'
};

export class FreshdeskIntegration {
  private apiKey: string | null = null;
  private domain: string | null = null;

  constructor(private companyId: string) {}

  private get baseUrl(): string {
    return `https://${this.domain}.freshdesk.com/api/v2`;
  }

  async initialize(): Promise<boolean> {
    try {
      const credentials = await CredentialService.getDecryptedCredentials(this.companyId, 'freshdesk');
      if (!credentials?.apiKey || !credentials?.domain) {
        console.log('[Freshdesk] No credentials found for company');
        return false;
      }
      this.apiKey = credentials.apiKey;
      this.domain = credentials.domain;
      console.log(`[Freshdesk] Initialized for company ${this.companyId}`);
      return true;
    } catch (error) {
      console.error('[Freshdesk] Failed to initialize:', error);
      return false;
    }
  }

  private getAuthHeaders() {
    return {
      Authorization: `Basic ${Buffer.from(`${this.apiKey}:X`).toString('base64')}`,
      'Content-Type': 'application/json'
    };
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      const initialized = await this.initialize();
      if (!initialized) {
        return { success: false, message: 'Freshdesk credentials not configured' };
      }

      const response = await axios.get(`${this.baseUrl}/agents/me`, {
        headers: this.getAuthHeaders(),
        timeout: 10000
      });

      if (response.data.id) {
        console.log('[Freshdesk] Connection test successful');
        return { success: true, message: `Connected as ${response.data.contact?.name || 'Agent'}` };
      }
      return { success: false, message: 'Unexpected response from Freshdesk' };
    } catch (error: any) {
      console.error('[Freshdesk] Connection test failed:', error.message);
      return { success: false, message: error.response?.data?.description || error.message };
    }
  }

  async getTickets(status?: number, updatedSince?: Date): Promise<FreshdeskTicket[]> {
    try {
      if (!this.apiKey) await this.initialize();

      const params: Record<string, any> = { per_page: 100 };
      if (status) params.filter = `status:${status}`;
      if (updatedSince) params.updated_since = updatedSince.toISOString();

      const response = await axios.get(`${this.baseUrl}/tickets`, {
        headers: this.getAuthHeaders(),
        params,
        timeout: 15000
      });

      return (response.data || []).map((ticket: any) => ({
        id: ticket.id,
        subject: ticket.subject,
        description: ticket.description_text || '',
        status: ticket.status,
        statusName: STATUS_MAP[ticket.status] || 'Unknown',
        priority: ticket.priority,
        priorityName: PRIORITY_MAP[ticket.priority] || 'Unknown',
        type: ticket.type,
        requesterEmail: ticket.requester?.email || '',
        requesterName: ticket.requester?.name || '',
        agentId: ticket.responder_id,
        groupId: ticket.group_id,
        createdAt: new Date(ticket.created_at),
        updatedAt: new Date(ticket.updated_at),
        dueBy: ticket.due_by ? new Date(ticket.due_by) : null,
        tags: ticket.tags || []
      }));
    } catch (error: any) {
      console.error('[Freshdesk] Get tickets failed:', error.message);
      return [];
    }
  }

  async getContacts(): Promise<FreshdeskContact[]> {
    try {
      if (!this.apiKey) await this.initialize();

      const response = await axios.get(`${this.baseUrl}/contacts`, {
        headers: this.getAuthHeaders(),
        params: { per_page: 100 },
        timeout: 15000
      });

      return (response.data || []).map((contact: any) => ({
        id: contact.id,
        email: contact.email || '',
        name: contact.name || '',
        phone: contact.phone,
        companyId: contact.company_id,
        active: contact.active,
        createdAt: new Date(contact.created_at),
        updatedAt: new Date(contact.updated_at)
      }));
    } catch (error: any) {
      console.error('[Freshdesk] Get contacts failed:', error.message);
      return [];
    }
  }

  async getAgents(): Promise<FreshdeskAgent[]> {
    try {
      if (!this.apiKey) await this.initialize();

      const response = await axios.get(`${this.baseUrl}/agents`, {
        headers: this.getAuthHeaders(),
        timeout: 10000
      });

      return (response.data || []).map((agent: any) => ({
        id: agent.id,
        email: agent.contact?.email || '',
        name: agent.contact?.name || '',
        active: agent.active,
        ticketScope: agent.ticket_scope,
        groupIds: agent.group_ids || []
      }));
    } catch (error: any) {
      console.error('[Freshdesk] Get agents failed:', error.message);
      return [];
    }
  }

  async syncTicketsAsDemandSignals(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const initialized = await this.initialize();
      if (!initialized) {
        return { synced: 0, errors: ['Freshdesk not initialized'] };
      }

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const tickets = await this.getTickets(undefined, thirtyDaysAgo);

      for (const ticket of tickets) {
        try {
          await storage.createDemandSignal({
            companyId: this.companyId,
            signalType: 'support_ticket',
            signalDate: ticket.createdAt,
            quantity: 1,
            unit: 'ticket',
            channel: 'freshdesk',
            confidence: 85,
            priority: ticket.priority >= 3 ? 'high' : ticket.priority === 2 ? 'medium' : 'low',
            attributes: {
              source: 'freshdesk',
              ticketId: ticket.id,
              subject: ticket.subject,
              status: ticket.statusName,
              priorityName: ticket.priorityName,
              requesterEmail: ticket.requesterEmail,
              type: ticket.type,
              tags: ticket.tags
            }
          });
          synced++;
        } catch (err: any) {
          errors.push(`Ticket ${ticket.id}: ${err.message}`);
        }
      }

      console.log(`[Freshdesk] Synced ${synced} tickets as demand signals`);
      return { synced, errors };
    } catch (error: any) {
      console.error('[Freshdesk] Sync failed:', error.message);
      return { synced: 0, errors: [error.message] };
    }
  }
}
