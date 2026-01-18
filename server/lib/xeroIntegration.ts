import axios from "axios";
import { storage } from "../storage";
import { CredentialService } from "./credentialService";

export interface XeroInvoice {
  InvoiceID: string;
  InvoiceNumber: string;
  Type: "ACCREC" | "ACCPAY";
  Contact: { ContactID: string; Name: string };
  Status: string;
  Total: number;
  AmountDue: number;
  CurrencyCode: string;
  DueDate: string;
  DateString: string;
}

export interface XeroContact {
  ContactID: string;
  Name: string;
  EmailAddress?: string;
  Phones?: Array<{ PhoneNumber: string; PhoneType: string }>;
  Addresses?: Array<{ AddressType: string; City: string; Country: string }>;
  IsSupplier: boolean;
  IsCustomer: boolean;
}

export interface XeroBill {
  InvoiceID: string;
  InvoiceNumber: string;
  Contact: { ContactID: string; Name: string };
  Status: string;
  Total: number;
  AmountDue: number;
  DueDate: string;
}

export class XeroIntegration {
  private accessToken: string;
  private tenantId: string;
  private companyId: string;
  private baseUrl = "https://api.xero.com/api.xro/2.0";

  constructor(accessToken: string, tenantId: string, companyId: string) {
    this.accessToken = accessToken;
    this.tenantId = tenantId;
    this.companyId = companyId;
  }

  private async request<T>(endpoint: string, method: string = "GET"): Promise<T> {
    const response = await axios({
      method,
      url: `${this.baseUrl}${endpoint}`,
      headers: {
        "Authorization": `Bearer ${this.accessToken}`,
        "Xero-tenant-id": this.tenantId,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      timeout: 30000
    });
    
    return response.data;
  }

  async testConnection(): Promise<{ success: boolean; message?: string; org?: string }> {
    try {
      const org = await this.request<{ Organisations: Array<{ Name: string }> }>("/Organisation");
      const orgName = org.Organisations[0]?.Name || "Connected";
      console.log(`[Xero] Connection test successful: ${orgName}`);
      return { success: true, message: "Xero connection verified", org: orgName };
    } catch (error: any) {
      console.error(`[Xero] Connection test failed:`, error.message);
      return { success: false, message: error.response?.data?.Message || error.message };
    }
  }

  async fetchInvoices(): Promise<XeroInvoice[]> {
    try {
      const result = await this.request<{ Invoices: XeroInvoice[] }>("/Invoices?where=Type==\"ACCREC\"");
      console.log(`[Xero] Fetched ${result.Invoices.length} receivable invoices`);
      return result.Invoices;
    } catch (error: any) {
      console.error("[Xero] Failed to fetch invoices:", error.message);
      throw error;
    }
  }

  async fetchBills(): Promise<XeroBill[]> {
    try {
      const result = await this.request<{ Invoices: XeroBill[] }>("/Invoices?where=Type==\"ACCPAY\"");
      console.log(`[Xero] Fetched ${result.Invoices.length} payable bills`);
      return result.Invoices;
    } catch (error: any) {
      console.error("[Xero] Failed to fetch bills:", error.message);
      throw error;
    }
  }

  async fetchContacts(): Promise<XeroContact[]> {
    try {
      const result = await this.request<{ Contacts: XeroContact[] }>("/Contacts");
      console.log(`[Xero] Fetched ${result.Contacts.length} contacts`);
      return result.Contacts;
    } catch (error: any) {
      console.error("[Xero] Failed to fetch contacts:", error.message);
      throw error;
    }
  }

  async syncSuppliersFromContacts(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const contacts = await this.fetchContacts();
      const suppliers = contacts.filter(c => c.IsSupplier);
      const existingSuppliers = await storage.getSuppliers(this.companyId);
      
      for (const contact of suppliers) {
        try {
          const existing = existingSuppliers.find(s => s.name === contact.Name);
          
          if (!existing) {
            await storage.createSupplier({
              companyId: this.companyId,
              name: contact.Name,
              contactEmail: contact.EmailAddress || null
            });
            synced++;
            console.log(`[Xero] Created supplier: ${contact.Name}`);
          }
        } catch (err: any) {
          errors.push(`Contact ${contact.Name}: ${err.message}`);
        }
      }

      console.log(`[Xero] Synced ${synced} suppliers for company ${this.companyId}`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[Xero] Supplier sync failed:", error.message);
      throw error;
    }
  }

  async syncBillsAsRFQs(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const bills = await this.fetchBills();
      
      for (const bill of bills.slice(0, 50)) {
        try {
          await storage.createRfq({
            companyId: this.companyId,
            rfqNumber: `XERO-${bill.InvoiceNumber}`,
            title: `Bill: ${bill.InvoiceNumber}`,
            description: `Imported from Xero - ${bill.Contact.Name}`,
            status: bill.Status === "PAID" ? "closed" : "draft",
            priority: "medium",
            dueDate: bill.DueDate ? new Date(bill.DueDate) : new Date(),
            unit: "units",
            materialId: "",
            requestedQuantity: 1,
            regimeAtGeneration: "normal",
            fdrAtGeneration: 0
          });
          synced++;
          console.log(`[Xero] Created RFQ from bill: ${bill.InvoiceNumber}`);
        } catch (err: any) {
          errors.push(`Bill ${bill.InvoiceNumber}: ${err.message}`);
        }
      }

      console.log(`[Xero] Created ${synced} RFQs from bills`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[Xero] Bill sync failed:", error.message);
      throw error;
    }
  }
}

export async function getXeroIntegration(companyId: string): Promise<XeroIntegration | null> {
  try {
    const credentials = await CredentialService.getDecryptedCredentials(companyId, 'xero');
    if (credentials?.accessToken && credentials?.tenantId) {
      console.log(`[Xero] Using centralized credential storage for company ${companyId}`);
      return new XeroIntegration(credentials.accessToken, credentials.tenantId, companyId);
    }
  } catch (error) {
    console.log(`[Xero] Credentials not available for company ${companyId}`);
  }
  return null;
}

export async function syncXeroData(companyId: string): Promise<{
  success: boolean;
  suppliers?: number;
  invoices?: number;
  bills?: number;
  error?: string;
}> {
  const integration = await getXeroIntegration(companyId);
  if (!integration) {
    return { success: false, error: 'Xero not configured' };
  }

  try {
    const connectionTest = await integration.testConnection();
    if (!connectionTest.success) {
      return { success: false, error: connectionTest.message };
    }

    const supplierResult = await integration.syncSuppliersFromContacts();
    const invoices = await integration.fetchInvoices();
    const billResult = await integration.syncBillsAsRFQs();

    console.log(`[Xero] Full sync complete for company ${companyId}`);
    return {
      success: true,
      suppliers: supplierResult.synced,
      invoices: invoices.length,
      bills: billResult.synced
    };
  } catch (error: any) {
    console.error('[Xero] Sync failed:', error.message);
    return { success: false, error: error.message };
  }
}
