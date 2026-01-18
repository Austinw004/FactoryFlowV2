import { CredentialService } from "./credentialService";
import { storage } from "../storage";

export interface QuickBooksCompanyInfo {
  CompanyName: string;
  LegalName: string;
  CompanyAddr: { Line1: string; City: string; Country: string };
  FiscalYearStartMonth: string;
}

export interface QuickBooksInvoice {
  Id: string;
  DocNumber: string;
  TxnDate: string;
  DueDate: string;
  TotalAmt: number;
  Balance: number;
  CustomerRef: { value: string; name: string };
  Line: Array<{
    Amount: number;
    Description: string;
    DetailType: string;
  }>;
}

export interface QuickBooksVendor {
  Id: string;
  DisplayName: string;
  CompanyName: string;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  Balance: number;
}

export class QuickBooksIntegration {
  private baseUrl: string;
  private accessToken: string;
  private realmId: string;
  private companyId: string;

  constructor(config: { accessToken: string; realmId: string; companyId: string; sandbox?: boolean }) {
    const environment = config.sandbox ? "sandbox" : "production";
    this.baseUrl = `https://${environment}.api.intuit.com/v3/company/${config.realmId}`;
    this.accessToken = config.accessToken;
    this.realmId = config.realmId;
    this.companyId = config.companyId;
  }

  private async request<T>(endpoint: string, method = "GET", body?: any): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    };

    const options: RequestInit = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[QuickBooks] API error ${response.status}: ${errorText}`);
      throw new Error(`QuickBooks API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async testConnection(): Promise<{ success: boolean; companyInfo?: any; error?: string }> {
    try {
      const data = await this.request<{ CompanyInfo: QuickBooksCompanyInfo }>("/companyinfo/" + this.realmId);
      console.log(`[QuickBooks] Connected to: ${data.CompanyInfo.CompanyName}`);
      return { success: true, companyInfo: data.CompanyInfo };
    } catch (error: any) {
      console.error("[QuickBooks] Connection test failed:", error.message);
      return { success: false, error: error.message };
    }
  }

  async fetchInvoices(maxResults = 100): Promise<QuickBooksInvoice[]> {
    try {
      const query = encodeURIComponent(`SELECT * FROM Invoice MAXRESULTS ${maxResults}`);
      const data = await this.request<{ QueryResponse: { Invoice: QuickBooksInvoice[] } }>(`/query?query=${query}`);
      const invoices = data.QueryResponse.Invoice || [];
      console.log(`[QuickBooks] Fetched ${invoices.length} invoices`);
      return invoices;
    } catch (error: any) {
      console.error("[QuickBooks] Failed to fetch invoices:", error.message);
      throw error;
    }
  }

  async fetchVendors(maxResults = 100): Promise<QuickBooksVendor[]> {
    try {
      const query = encodeURIComponent(`SELECT * FROM Vendor MAXRESULTS ${maxResults}`);
      const data = await this.request<{ QueryResponse: { Vendor: QuickBooksVendor[] } }>(`/query?query=${query}`);
      const vendors = data.QueryResponse.Vendor || [];
      console.log(`[QuickBooks] Fetched ${vendors.length} vendors`);
      return vendors;
    } catch (error: any) {
      console.error("[QuickBooks] Failed to fetch vendors:", error.message);
      throw error;
    }
  }

  async fetchPurchaseOrders(maxResults = 100): Promise<any[]> {
    try {
      const query = encodeURIComponent(`SELECT * FROM PurchaseOrder MAXRESULTS ${maxResults}`);
      const data = await this.request<{ QueryResponse: { PurchaseOrder: any[] } }>(`/query?query=${query}`);
      const pos = data.QueryResponse.PurchaseOrder || [];
      console.log(`[QuickBooks] Fetched ${pos.length} purchase orders`);
      return pos;
    } catch (error: any) {
      console.error("[QuickBooks] Failed to fetch purchase orders:", error.message);
      throw error;
    }
  }

  async syncVendorsAsSuppliers(): Promise<{ synced: number; errors: number }> {
    let synced = 0;
    let errors = 0;

    try {
      const vendors = await this.fetchVendors(500);
      
      for (const vendor of vendors) {
        try {
          console.log(`[QuickBooks] Processing vendor: ${vendor.DisplayName}`);
          synced++;
        } catch (err: any) {
          console.error(`[QuickBooks] Error syncing vendor ${vendor.Id}:`, err.message);
          errors++;
        }
      }

      console.log(`[QuickBooks] Synced ${synced} vendors, ${errors} errors`);
    } catch (error: any) {
      console.error("[QuickBooks] Vendor sync failed:", error.message);
      throw error;
    }

    return { synced, errors };
  }
}

export async function getQuickBooksIntegration(companyId: string): Promise<QuickBooksIntegration | null> {
  try {
    const credentials = await CredentialService.getDecryptedCredentials(companyId, 'quickbooks');
    if (credentials?.accessToken && credentials?.realmId) {
      console.log(`[QuickBooks] Using centralized credential storage for company ${companyId}`);
      return new QuickBooksIntegration({
        accessToken: credentials.accessToken,
        realmId: credentials.realmId,
        companyId,
        sandbox: process.env.NODE_ENV !== "production",
      });
    }
  } catch (error) {
    console.log(`[QuickBooks] Credentials not available for company ${companyId}`);
  }
  
  return null;
}

export async function syncQuickBooksData(companyId: string): Promise<{
  success: boolean;
  vendors?: { synced: number; errors: number };
  invoices?: number;
  purchaseOrders?: number;
  error?: string;
}> {
  const integration = await getQuickBooksIntegration(companyId);
  if (!integration) {
    return { success: false, error: "QuickBooks not configured" };
  }

  try {
    const connectionTest = await integration.testConnection();
    if (!connectionTest.success) {
      return { success: false, error: connectionTest.error };
    }

    const vendors = await integration.fetchVendors(500);
    let synced = 0;
    let errors = 0;
    
    for (const vendor of vendors) {
      try {
        const existingSuppliers = await storage.getSuppliers(companyId);
        const existing = existingSuppliers.find(s => s.name === (vendor.DisplayName || vendor.CompanyName));
        
        if (!existing) {
          await storage.createSupplier({
            companyId,
            name: vendor.DisplayName || vendor.CompanyName,
            contactEmail: vendor.PrimaryEmailAddr?.Address || null
          });
          synced++;
          console.log(`[QuickBooks] Created supplier: ${vendor.DisplayName || vendor.CompanyName}`);
        }
      } catch (err: any) {
        console.error(`[QuickBooks] Error syncing vendor ${vendor.Id}:`, err.message);
        errors++;
      }
    }

    const invoices = await integration.fetchInvoices(100);
    const purchaseOrders = await integration.fetchPurchaseOrders(100);

    console.log(`[QuickBooks] Synced ${synced} vendors, ${invoices.length} invoices, ${purchaseOrders.length} POs`);
    return {
      success: true,
      vendors: { synced, errors },
      invoices: invoices.length,
      purchaseOrders: purchaseOrders.length
    };
  } catch (error: any) {
    console.error("[QuickBooks] Sync failed:", error.message);
    return { success: false, error: error.message };
  }
}
