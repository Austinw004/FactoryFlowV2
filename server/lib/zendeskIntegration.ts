import axios from "axios";
import { storage } from "../storage";
import { CredentialService } from "./credentialService";

export interface ZendeskTicket {
  id: number;
  subject: string;
  description: string;
  status: string;
  priority: string;
  requesterEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ZendeskUser {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface ZendeskOrganization {
  id: number;
  name: string;
  details?: string;
  createdAt: string;
}

export class ZendeskIntegration {
  private subdomain: string;
  private email: string;
  private apiToken: string;
  private companyId: string;

  constructor(subdomain: string, email: string, apiToken: string, companyId: string) {
    this.subdomain = subdomain;
    this.email = email;
    this.apiToken = apiToken;
    this.companyId = companyId;
  }

  private get baseUrl(): string {
    return `https://${this.subdomain}.zendesk.com/api/v2`;
  }

  private get authHeader(): string {
    return `Basic ${Buffer.from(`${this.email}/token:${this.apiToken}`).toString("base64")}`;
  }

  private async request<T>(endpoint: string, method: string = "GET", data?: any): Promise<T> {
    const response = await axios({
      method,
      url: `${this.baseUrl}${endpoint}`,
      headers: {
        "Authorization": this.authHeader,
        "Content-Type": "application/json"
      },
      data,
      timeout: 30000
    });
    
    return response.data;
  }

  async testConnection(): Promise<{ success: boolean; message?: string; user?: string }> {
    try {
      const user = await this.request<{ user: { name: string } }>("/users/me.json");
      console.log(`[Zendesk] Connection test successful: ${user.user.name}`);
      return { success: true, message: "Zendesk connection verified", user: user.user.name };
    } catch (error: any) {
      console.error(`[Zendesk] Connection test failed:`, error.message);
      return { success: false, message: error.response?.data?.error || error.message };
    }
  }

  async listTickets(status?: string): Promise<ZendeskTicket[]> {
    try {
      let endpoint = "/tickets.json?per_page=100";
      if (status) {
        endpoint = `/search.json?query=type:ticket status:${status}`;
      }
      
      const result = await this.request<{ tickets?: any[]; results?: any[] }>(endpoint);
      const tickets = (result.tickets || result.results || []).map((t: any) => ({
        id: t.id,
        subject: t.subject || t.raw_subject,
        description: t.description,
        status: t.status,
        priority: t.priority || "normal",
        requesterEmail: t.requester?.email,
        createdAt: t.created_at,
        updatedAt: t.updated_at
      }));

      console.log(`[Zendesk] Fetched ${tickets.length} tickets`);
      return tickets;
    } catch (error: any) {
      console.error("[Zendesk] Failed to list tickets:", error.message);
      throw error;
    }
  }

  async getTicket(ticketId: number): Promise<ZendeskTicket> {
    try {
      const result = await this.request<{ ticket: any }>(`/tickets/${ticketId}.json`);
      return {
        id: result.ticket.id,
        subject: result.ticket.subject,
        description: result.ticket.description,
        status: result.ticket.status,
        priority: result.ticket.priority || "normal",
        createdAt: result.ticket.created_at,
        updatedAt: result.ticket.updated_at
      };
    } catch (error: any) {
      console.error("[Zendesk] Failed to get ticket:", error.message);
      throw error;
    }
  }

  async createTicket(subject: string, description: string, priority: string = "normal", requesterEmail?: string): Promise<ZendeskTicket> {
    try {
      const ticketData: any = {
        ticket: {
          subject,
          description,
          priority
        }
      };

      if (requesterEmail) {
        ticketData.ticket.requester = { email: requesterEmail };
      }

      const result = await this.request<{ ticket: any }>("/tickets.json", "POST", ticketData);
      console.log(`[Zendesk] Created ticket ${result.ticket.id}`);
      return {
        id: result.ticket.id,
        subject: result.ticket.subject,
        description: result.ticket.description,
        status: result.ticket.status,
        priority: result.ticket.priority,
        createdAt: result.ticket.created_at,
        updatedAt: result.ticket.updated_at
      };
    } catch (error: any) {
      console.error("[Zendesk] Failed to create ticket:", error.message);
      throw error;
    }
  }

  async updateTicketStatus(ticketId: number, status: string): Promise<ZendeskTicket> {
    try {
      const result = await this.request<{ ticket: any }>(`/tickets/${ticketId}.json`, "PUT", {
        ticket: { status }
      });
      console.log(`[Zendesk] Updated ticket ${ticketId} status to ${status}`);
      return {
        id: result.ticket.id,
        subject: result.ticket.subject,
        description: result.ticket.description,
        status: result.ticket.status,
        priority: result.ticket.priority,
        createdAt: result.ticket.created_at,
        updatedAt: result.ticket.updated_at
      };
    } catch (error: any) {
      console.error("[Zendesk] Failed to update ticket:", error.message);
      throw error;
    }
  }

  async listOrganizations(): Promise<ZendeskOrganization[]> {
    try {
      const result = await this.request<{ organizations: any[] }>("/organizations.json");
      const orgs = result.organizations.map(o => ({
        id: o.id,
        name: o.name,
        details: o.details,
        createdAt: o.created_at
      }));
      console.log(`[Zendesk] Fetched ${orgs.length} organizations`);
      return orgs;
    } catch (error: any) {
      console.error("[Zendesk] Failed to list organizations:", error.message);
      throw error;
    }
  }

  async syncOrganizationsAsSuppliers(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const orgs = await this.listOrganizations();
      
      for (const org of orgs) {
        try {
          const existingSuppliers = await storage.getSuppliers(this.companyId);
          const existing = existingSuppliers.find(s => s.name === org.name);
          
          if (!existing) {
            await storage.createSupplier({
              companyId: this.companyId,
              name: org.name,
              contactEmail: ""
            });
            synced++;
          }
        } catch (err: any) {
          errors.push(`Org ${org.name}: ${err.message}`);
        }
      }

      console.log(`[Zendesk] Synced ${synced} organizations as suppliers`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[Zendesk] Org sync failed:", error.message);
      throw error;
    }
  }

  async createSupplierIssueTicket(supplierId: string, subject: string, description: string): Promise<ZendeskTicket | null> {
    try {
      const supplier = await storage.getSupplier(supplierId);
      if (!supplier) {
        console.log(`[Zendesk] Supplier ${supplierId} not found`);
        return null;
      }

      return await this.createTicket(
        `Supplier Issue: ${supplier.name} - ${subject}`,
        `Supplier: ${supplier.name}\n\n${description}`,
        "high",
        supplier.contactEmail || undefined
      );
    } catch (error: any) {
      console.error("[Zendesk] Failed to create supplier issue ticket:", error.message);
      throw error;
    }
  }
}

export async function getZendeskIntegration(companyId: string): Promise<ZendeskIntegration | null> {
  try {
    const credentials = await CredentialService.getDecryptedCredentials(companyId, 'zendesk');
    if (credentials?.domain && credentials?.username && credentials?.apiKey) {
      console.log(`[Zendesk] Using centralized credential storage for company ${companyId}`);
      return new ZendeskIntegration(credentials.domain, credentials.username, credentials.apiKey, companyId);
    }
  } catch (error) {
    console.log(`[Zendesk] Credentials not available for company ${companyId}`);
  }
  return null;
}
