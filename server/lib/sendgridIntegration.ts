import axios from "axios";
import { storage } from "../storage";
import { CredentialService } from "./credentialService";

export interface SendGridContact {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
}

export interface SendGridTemplate {
  id: string;
  name: string;
  generation: string;
  updatedAt: string;
}

export interface SendGridEmailResult {
  messageId: string;
  status: string;
}

export class SendGridIntegration {
  private apiKey: string;
  private companyId: string;
  private baseUrl = "https://api.sendgrid.com/v3";

  constructor(apiKey: string, companyId: string) {
    this.apiKey = apiKey;
    this.companyId = companyId;
  }

  private async request<T>(endpoint: string, method: string = "GET", data?: any): Promise<T> {
    const response = await axios({
      method,
      url: `${this.baseUrl}${endpoint}`,
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      data,
      timeout: 30000
    });
    
    return response.data;
  }

  async testConnection(): Promise<{ success: boolean; message?: string; email?: string }> {
    try {
      const user = await this.request<{ email: string }>("/user/profile");
      console.log(`[SendGrid] Connection test successful: ${user.email}`);
      return { success: true, message: "SendGrid connection verified", email: user.email };
    } catch (error: any) {
      console.error(`[SendGrid] Connection test failed:`, error.message);
      return { success: false, message: error.response?.data?.errors?.[0]?.message || error.message };
    }
  }

  async sendEmail(to: string, from: string, subject: string, content: string, isHtml: boolean = false): Promise<SendGridEmailResult> {
    try {
      const response = await axios.post(`${this.baseUrl}/mail/send`, {
        personalizations: [{ to: [{ email: to }] }],
        from: { email: from },
        subject,
        content: [{
          type: isHtml ? "text/html" : "text/plain",
          value: content
        }]
      }, {
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        }
      });

      console.log(`[SendGrid] Email sent to ${to}`);
      return {
        messageId: response.headers["x-message-id"] || "sent",
        status: "sent"
      };
    } catch (error: any) {
      console.error("[SendGrid] Failed to send email:", error.message);
      throw error;
    }
  }

  async sendTemplateEmail(to: string, from: string, templateId: string, dynamicData: Record<string, any>): Promise<SendGridEmailResult> {
    try {
      const response = await axios.post(`${this.baseUrl}/mail/send`, {
        personalizations: [{
          to: [{ email: to }],
          dynamic_template_data: dynamicData
        }],
        from: { email: from },
        template_id: templateId
      }, {
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        }
      });

      console.log(`[SendGrid] Template email sent to ${to}`);
      return {
        messageId: response.headers["x-message-id"] || "sent",
        status: "sent"
      };
    } catch (error: any) {
      console.error("[SendGrid] Failed to send template email:", error.message);
      throw error;
    }
  }

  async listTemplates(): Promise<SendGridTemplate[]> {
    try {
      const result = await this.request<{ templates: any[] }>("/templates?generations=dynamic");
      const templates = result.templates.map(t => ({
        id: t.id,
        name: t.name,
        generation: t.generation,
        updatedAt: t.updated_at
      }));
      console.log(`[SendGrid] Found ${templates.length} templates`);
      return templates;
    } catch (error: any) {
      console.error("[SendGrid] Failed to list templates:", error.message);
      throw error;
    }
  }

  async addContact(email: string, firstName?: string, lastName?: string): Promise<{ jobId: string }> {
    try {
      const result = await this.request<{ job_id: string }>("/marketing/contacts", "PUT", {
        contacts: [{
          email,
          first_name: firstName,
          last_name: lastName
        }]
      });
      console.log(`[SendGrid] Added contact ${email}`);
      return { jobId: result.job_id };
    } catch (error: any) {
      console.error("[SendGrid] Failed to add contact:", error.message);
      throw error;
    }
  }

  async listContacts(limit: number = 100): Promise<SendGridContact[]> {
    try {
      const result = await this.request<{ result: any[] }>(`/marketing/contacts?page_size=${limit}`);
      const contacts = result.result?.map(c => ({
        id: c.id,
        email: c.email,
        firstName: c.first_name,
        lastName: c.last_name,
        createdAt: c.created_at
      })) || [];
      console.log(`[SendGrid] Found ${contacts.length} contacts`);
      return contacts;
    } catch (error: any) {
      console.error("[SendGrid] Failed to list contacts:", error.message);
      throw error;
    }
  }

  async sendSupplierNotification(supplierId: string, subject: string, message: string): Promise<SendGridEmailResult | null> {
    try {
      const supplier = await storage.getSupplier(supplierId);
      if (!supplier?.contactEmail) {
        console.log(`[SendGrid] No email for supplier ${supplierId}`);
        return null;
      }

      const fromEmail = "info@prescient-labs.com";

      return await this.sendEmail(
        supplier.contactEmail,
        fromEmail,
        subject,
        message
      );
    } catch (error: any) {
      console.error("[SendGrid] Failed to send supplier notification:", error.message);
      throw error;
    }
  }

  async sendRFQNotification(rfqId: string): Promise<{ sent: number; errors: string[] }> {
    const errors: string[] = [];
    let sent = 0;

    try {
      const rfq = await storage.getRfq(rfqId);
      if (!rfq) {
        throw new Error("RFQ not found");
      }

      const suppliers = await storage.getSuppliers(this.companyId);
      const fromEmail = "info@prescient-labs.com";

      for (const supplier of suppliers.slice(0, 10)) {
        if (!supplier.contactEmail) continue;

        try {
          await this.sendEmail(
            supplier.contactEmail,
            fromEmail,
            `New RFQ: ${rfq.title}`,
            `You have been invited to respond to RFQ: ${rfq.title}\n\nDescription: ${rfq.description}\n\nDeadline: ${rfq.dueDate}\n\nPlease login to respond.`
          );
          sent++;
        } catch (err: any) {
          errors.push(`${supplier.name}: ${err.message}`);
        }
      }

      console.log(`[SendGrid] Sent ${sent} RFQ notifications`);
      return { sent, errors };
    } catch (error: any) {
      console.error("[SendGrid] RFQ notification failed:", error.message);
      throw error;
    }
  }

  async syncContactsAsSuppliers(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const contacts = await this.listContacts(500);
      
      for (const contact of contacts) {
        try {
          const existingSuppliers = await storage.getSuppliers(this.companyId);
          const existing = existingSuppliers.find(s => s.contactEmail === contact.email);
          
          if (!existing && contact.email) {
            await storage.createSupplier({
              companyId: this.companyId,
              name: `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || contact.email,
              contactEmail: contact.email
            });
            synced++;
          }
        } catch (err: any) {
          errors.push(`Contact ${contact.email}: ${err.message}`);
        }
      }

      console.log(`[SendGrid] Synced ${synced} contacts as suppliers`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[SendGrid] Contact sync failed:", error.message);
      throw error;
    }
  }

  async syncEmailActivityAsDemandSignals(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const contacts = await this.listContacts(100);
      
      for (const contact of contacts) {
        try {
          await storage.createDemandSignal({
            companyId: this.companyId,
            signalType: "email_contact",
            signalDate: new Date(contact.createdAt),
            quantity: 1,
            unit: "contact",
            channel: "sendgrid",
            customer: contact.email,
            confidence: 60,
            priority: "low",
            attributes: {
              source: "sendgrid",
              contactId: contact.id,
              firstName: contact.firstName,
              lastName: contact.lastName
            }
          });
          synced++;
        } catch (err: any) {
          errors.push(`Contact ${contact.email}: ${err.message}`);
        }
      }

      console.log(`[SendGrid] Created ${synced} demand signals from contacts`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[SendGrid] Email sync failed:", error.message);
      throw error;
    }
  }
}

export async function getSendGridIntegration(companyId: string): Promise<SendGridIntegration | null> {
  try {
    const credentials = await CredentialService.getDecryptedCredentials(companyId, 'sendgrid');
    if (credentials?.apiKey) {
      console.log(`[SendGrid] Using centralized credential storage for company ${companyId}`);
      return new SendGridIntegration(credentials.apiKey, companyId);
    }
  } catch (error) {
    console.log(`[SendGrid] Credentials not available for company ${companyId}`);
  }
  if (process.env.SENDGRID_API_KEY) {
    return new SendGridIntegration(process.env.SENDGRID_API_KEY, companyId);
  }
  return null;
}
