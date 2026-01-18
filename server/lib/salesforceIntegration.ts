import axios from "axios";
import { storage } from "../storage";
import { CredentialService } from "./credentialService";

export interface SalesforceAccount {
  Id: string;
  Name: string;
  Industry?: string;
  Website?: string;
  Phone?: string;
  BillingCity?: string;
  BillingCountry?: string;
}

export interface SalesforceContact {
  Id: string;
  FirstName: string;
  LastName: string;
  Email?: string;
  Phone?: string;
  AccountId?: string;
}

export interface SalesforceOpportunity {
  Id: string;
  Name: string;
  Amount?: number;
  StageName: string;
  CloseDate: string;
  AccountId?: string;
}

export class SalesforceIntegration {
  private accessToken: string;
  private instanceUrl: string;
  private companyId: string;

  constructor(accessToken: string, instanceUrl: string, companyId: string) {
    this.accessToken = accessToken;
    this.instanceUrl = instanceUrl;
    this.companyId = companyId;
  }

  private async request<T>(endpoint: string, method: string = "GET", data?: any): Promise<T> {
    const url = `${this.instanceUrl}/services/data/v58.0${endpoint}`;
    
    const response = await axios({
      method,
      url,
      headers: {
        "Authorization": `Bearer ${this.accessToken}`,
        "Content-Type": "application/json"
      },
      data,
      timeout: 30000
    });
    
    return response.data;
  }

  async testConnection(): Promise<{ success: boolean; message?: string; user?: string }> {
    try {
      const userInfo = await this.request<{ name: string; email: string }>("/chatter/users/me");
      console.log(`[Salesforce] Connection test successful for company ${this.companyId}`);
      return { success: true, message: "Salesforce connection verified", user: userInfo.name };
    } catch (error: any) {
      console.error(`[Salesforce] Connection test failed:`, error.message);
      return { success: false, message: error.response?.data?.message || error.message };
    }
  }

  async fetchAccounts(limit: number = 100): Promise<SalesforceAccount[]> {
    try {
      const query = encodeURIComponent(`SELECT Id, Name, Industry, Website, Phone, BillingCity, BillingCountry FROM Account LIMIT ${limit}`);
      const result = await this.request<{ records: SalesforceAccount[] }>(`/query?q=${query}`);
      console.log(`[Salesforce] Fetched ${result.records.length} accounts`);
      return result.records;
    } catch (error: any) {
      console.error("[Salesforce] Failed to fetch accounts:", error.message);
      throw error;
    }
  }

  async fetchContacts(limit: number = 100): Promise<SalesforceContact[]> {
    try {
      const query = encodeURIComponent(`SELECT Id, FirstName, LastName, Email, Phone, AccountId FROM Contact LIMIT ${limit}`);
      const result = await this.request<{ records: SalesforceContact[] }>(`/query?q=${query}`);
      console.log(`[Salesforce] Fetched ${result.records.length} contacts`);
      return result.records;
    } catch (error: any) {
      console.error("[Salesforce] Failed to fetch contacts:", error.message);
      throw error;
    }
  }

  async fetchOpportunities(limit: number = 100): Promise<SalesforceOpportunity[]> {
    try {
      const query = encodeURIComponent(`SELECT Id, Name, Amount, StageName, CloseDate, AccountId FROM Opportunity LIMIT ${limit}`);
      const result = await this.request<{ records: SalesforceOpportunity[] }>(`/query?q=${query}`);
      console.log(`[Salesforce] Fetched ${result.records.length} opportunities`);
      return result.records;
    } catch (error: any) {
      console.error("[Salesforce] Failed to fetch opportunities:", error.message);
      throw error;
    }
  }

  async syncAccountsAsSuppliers(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const accounts = await this.fetchAccounts(200);
      
      for (const account of accounts) {
        try {
          const existingSuppliers = await storage.getSuppliers(this.companyId);
          const existing = existingSuppliers.find(s => s.name === account.Name);
          
          if (!existing) {
            await storage.createSupplier({
              companyId: this.companyId,
              name: account.Name,
              contactEmail: ""
            });
            synced++;
          }
        } catch (err: any) {
          errors.push(`Account ${account.Name}: ${err.message}`);
        }
      }

      console.log(`[Salesforce] Synced ${synced} accounts as suppliers for company ${this.companyId}`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[Salesforce] Sync failed:", error.message);
      throw error;
    }
  }

  async syncOpportunitiesAsDemandSignals(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const opportunities = await this.fetchOpportunities(200);
      
      for (const opp of opportunities) {
        try {
          await storage.createDemandSignal({
            companyId: this.companyId,
            signalType: "opportunity",
            signalDate: new Date(opp.CloseDate),
            quantity: opp.Amount ? Math.round(opp.Amount / 100) : 1,
            unit: "USD",
            channel: "salesforce",
            confidence: opp.StageName === "Closed Won" ? 100 : 
                        opp.StageName === "Negotiation" ? 70 :
                        opp.StageName === "Proposal" ? 50 : 30,
            priority: "medium",
            attributes: {
              source: "salesforce",
              opportunityId: opp.Id,
              opportunityName: opp.Name,
              stageName: opp.StageName,
              accountId: opp.AccountId,
              amount: opp.Amount
            }
          });
          synced++;
        } catch (err: any) {
          errors.push(`Opportunity ${opp.Name}: ${err.message}`);
        }
      }

      console.log(`[Salesforce] Created ${synced} demand signals from opportunities`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[Salesforce] Demand signal sync failed:", error.message);
      throw error;
    }
  }
}

export async function getSalesforceIntegration(companyId: string): Promise<SalesforceIntegration | null> {
  try {
    const credentials = await CredentialService.getDecryptedCredentials(companyId, "salesforce");
    if (credentials?.accessToken && credentials?.instanceUrl) {
      console.log(`[Salesforce] Using centralized credential storage for company ${companyId}`);
      return new SalesforceIntegration(credentials.accessToken, credentials.instanceUrl, companyId);
    }
  } catch (error) {
    console.log(`[Salesforce] Credentials not available for company ${companyId}`);
  }
  return null;
}
