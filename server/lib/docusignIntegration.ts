import axios from "axios";
import { storage } from "../storage";
import { CredentialService } from "./credentialService";

export interface DocuSignEnvelope {
  envelopeId: string;
  status: string;
  emailSubject: string;
  sentDateTime?: string;
  completedDateTime?: string;
  recipients: Array<{
    email: string;
    name: string;
    status: string;
  }>;
}

export interface DocuSignTemplate {
  templateId: string;
  name: string;
  description?: string;
  created: string;
  lastModified: string;
}

export class DocuSignIntegration {
  private accessToken: string;
  private accountId: string;
  private companyId: string;
  private baseUrl: string;

  constructor(accessToken: string, accountId: string, baseUrl: string, companyId: string) {
    this.accessToken = accessToken;
    this.accountId = accountId;
    this.baseUrl = baseUrl;
    this.companyId = companyId;
  }

  private async request<T>(endpoint: string, method: string = "GET", data?: any): Promise<T> {
    const response = await axios({
      method,
      url: `${this.baseUrl}/restapi/v2.1/accounts/${this.accountId}${endpoint}`,
      headers: {
        "Authorization": `Bearer ${this.accessToken}`,
        "Content-Type": "application/json"
      },
      data,
      timeout: 30000
    });
    
    return response.data;
  }

  async testConnection(): Promise<{ success: boolean; message?: string; account?: string }> {
    try {
      const account = await this.request<{ accountName: string }>("");
      console.log(`[DocuSign] Connection test successful: ${account.accountName}`);
      return { success: true, message: "DocuSign connection verified", account: account.accountName };
    } catch (error: any) {
      console.error(`[DocuSign] Connection test failed:`, error.message);
      return { success: false, message: error.response?.data?.message || error.message };
    }
  }

  async listEnvelopes(status: string = "completed"): Promise<DocuSignEnvelope[]> {
    try {
      const fromDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const result = await this.request<{ envelopes: any[] }>(`/envelopes?from_date=${fromDate}&status=${status}`);
      
      const envelopes = (result.envelopes || []).map(e => ({
        envelopeId: e.envelopeId,
        status: e.status,
        emailSubject: e.emailSubject,
        sentDateTime: e.sentDateTime,
        completedDateTime: e.completedDateTime,
        recipients: []
      }));

      console.log(`[DocuSign] Fetched ${envelopes.length} envelopes`);
      return envelopes;
    } catch (error: any) {
      console.error("[DocuSign] Failed to list envelopes:", error.message);
      throw error;
    }
  }

  async getEnvelope(envelopeId: string): Promise<DocuSignEnvelope> {
    try {
      const result = await this.request<any>(`/envelopes/${envelopeId}?include=recipients`);
      return {
        envelopeId: result.envelopeId,
        status: result.status,
        emailSubject: result.emailSubject,
        sentDateTime: result.sentDateTime,
        completedDateTime: result.completedDateTime,
        recipients: result.recipients?.signers?.map((s: any) => ({
          email: s.email,
          name: s.name,
          status: s.status
        })) || []
      };
    } catch (error: any) {
      console.error("[DocuSign] Failed to get envelope:", error.message);
      throw error;
    }
  }

  async listTemplates(): Promise<DocuSignTemplate[]> {
    try {
      const result = await this.request<{ envelopeTemplates: any[] }>("/templates");
      
      const templates = (result.envelopeTemplates || []).map(t => ({
        templateId: t.templateId,
        name: t.name,
        description: t.description,
        created: t.created,
        lastModified: t.lastModified
      }));

      console.log(`[DocuSign] Fetched ${templates.length} templates`);
      return templates;
    } catch (error: any) {
      console.error("[DocuSign] Failed to list templates:", error.message);
      throw error;
    }
  }

  async createEnvelopeFromTemplate(templateId: string, signerEmail: string, signerName: string, emailSubject: string): Promise<DocuSignEnvelope> {
    try {
      const result = await this.request<any>("/envelopes", "POST", {
        templateId,
        status: "sent",
        emailSubject,
        templateRoles: [{
          email: signerEmail,
          name: signerName,
          roleName: "Signer"
        }]
      });

      console.log(`[DocuSign] Created envelope ${result.envelopeId}`);
      return {
        envelopeId: result.envelopeId,
        status: result.status,
        emailSubject,
        recipients: [{ email: signerEmail, name: signerName, status: "sent" }]
      };
    } catch (error: any) {
      console.error("[DocuSign] Failed to create envelope:", error.message);
      throw error;
    }
  }

  async sendSupplierContract(supplierId: string, templateId: string, contractDetails: Record<string, any>): Promise<DocuSignEnvelope | null> {
    try {
      const supplier = await storage.getSupplier(supplierId);
      if (!supplier?.contactEmail) {
        console.log(`[DocuSign] No email for supplier ${supplierId}`);
        return null;
      }

      return await this.createEnvelopeFromTemplate(
        templateId,
        supplier.contactEmail,
        supplier.name,
        `Contract for ${supplier.name} - ${contractDetails.title || "Agreement"}`
      );
    } catch (error: any) {
      console.error("[DocuSign] Failed to send supplier contract:", error.message);
      throw error;
    }
  }

  async syncCompletedContractsToRFQs(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const envelopes = await this.listEnvelopes("completed");
      
      for (const envelope of envelopes.slice(0, 50)) {
        try {
          await storage.createRfq({
            companyId: this.companyId,
            title: `Contract: ${envelope.emailSubject}`,
            description: `Completed DocuSign contract - Envelope ID: ${envelope.envelopeId}`,
            status: "closed",
            dueDate: envelope.completedDateTime ? new Date(envelope.completedDateTime) : new Date(),
            rfqNumber: `DS-${envelope.envelopeId.substring(0, 8)}`,
            materialId: "",
            requestedQuantity: 1,
            unit: "contract",
            regimeAtGeneration: "normal",
            fdrAtGeneration: 0
          });
          synced++;
        } catch (err: any) {
          errors.push(`Envelope ${envelope.envelopeId}: ${err.message}`);
        }
      }

      console.log(`[DocuSign] Synced ${synced} completed contracts`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[DocuSign] Contract sync failed:", error.message);
      throw error;
    }
  }
}

export async function getDocuSignIntegration(companyId: string): Promise<DocuSignIntegration | null> {
  try {
    const credentials = await CredentialService.getDecryptedCredentials(companyId, 'docusign');
    if (credentials?.accessToken && credentials?.accountId) {
      console.log(`[DocuSign] Using centralized credential storage for company ${companyId}`);
      const baseUrl = credentials.instanceUrl || "https://demo.docusign.net";
      return new DocuSignIntegration(credentials.accessToken, credentials.accountId, baseUrl, companyId);
    }
  } catch (error) {
    console.log(`[DocuSign] Credentials not available for company ${companyId}`);
  }
  return null;
}
