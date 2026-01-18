import axios from "axios";
import { storage } from "../storage";
import { CredentialService } from "./credentialService";

export interface NotionPage {
  id: string;
  title: string;
  url: string;
  createdTime: string;
  lastEditedTime: string;
  parent: { type: string; pageId?: string; databaseId?: string };
}

export interface NotionDatabase {
  id: string;
  title: string;
  url: string;
  properties: Record<string, { type: string; name: string }>;
}

export interface NotionDatabaseEntry {
  id: string;
  properties: Record<string, any>;
  url: string;
}

export class NotionIntegration {
  private accessToken: string;
  private companyId: string;
  private baseUrl = "https://api.notion.com/v1";

  constructor(accessToken: string, companyId: string) {
    this.accessToken = accessToken;
    this.companyId = companyId;
  }

  private async request<T>(endpoint: string, method: string = "GET", data?: any): Promise<T> {
    const response = await axios({
      method,
      url: `${this.baseUrl}${endpoint}`,
      headers: {
        "Authorization": `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
      },
      data,
      timeout: 30000
    });
    
    return response.data;
  }

  async testConnection(): Promise<{ success: boolean; message?: string; user?: string }> {
    try {
      const user = await this.request<{ results: Array<{ name: string; type: string }> }>("/users");
      const botUser = user.results.find(u => u.type === "bot");
      console.log(`[Notion] Connection test successful for company ${this.companyId}`);
      return { success: true, message: "Notion connection verified", user: botUser?.name || "Connected" };
    } catch (error: any) {
      console.error(`[Notion] Connection test failed:`, error.message);
      return { success: false, message: error.response?.data?.message || error.message };
    }
  }

  async searchPages(query: string = ""): Promise<NotionPage[]> {
    try {
      const result = await this.request<{ results: any[] }>("/search", "POST", {
        query,
        filter: { property: "object", value: "page" },
        page_size: 100
      });

      const pages = result.results.map(p => ({
        id: p.id,
        title: this.extractTitle(p),
        url: p.url,
        createdTime: p.created_time,
        lastEditedTime: p.last_edited_time,
        parent: p.parent
      }));

      console.log(`[Notion] Found ${pages.length} pages`);
      return pages;
    } catch (error: any) {
      console.error("[Notion] Failed to search pages:", error.message);
      throw error;
    }
  }

  async searchDatabases(): Promise<NotionDatabase[]> {
    try {
      const result = await this.request<{ results: any[] }>("/search", "POST", {
        filter: { property: "object", value: "database" },
        page_size: 100
      });

      const databases = result.results.map(db => ({
        id: db.id,
        title: db.title?.[0]?.plain_text || "Untitled",
        url: db.url,
        properties: Object.fromEntries(
          Object.entries(db.properties || {}).map(([key, val]: [string, any]) => [
            key,
            { type: val.type, name: val.name || key }
          ])
        )
      }));

      console.log(`[Notion] Found ${databases.length} databases`);
      return databases;
    } catch (error: any) {
      console.error("[Notion] Failed to search databases:", error.message);
      throw error;
    }
  }

  async queryDatabase(databaseId: string, filter?: any): Promise<NotionDatabaseEntry[]> {
    try {
      const result = await this.request<{ results: any[] }>(`/databases/${databaseId}/query`, "POST", {
        filter,
        page_size: 100
      });

      const entries = result.results.map(entry => ({
        id: entry.id,
        properties: entry.properties,
        url: entry.url
      }));

      console.log(`[Notion] Queried ${entries.length} entries from database`);
      return entries;
    } catch (error: any) {
      console.error("[Notion] Failed to query database:", error.message);
      throw error;
    }
  }

  async createPage(parentId: string, title: string, content: string): Promise<NotionPage> {
    try {
      const result = await this.request<any>("/pages", "POST", {
        parent: { page_id: parentId },
        properties: {
          title: { title: [{ text: { content: title } }] }
        },
        children: [
          {
            object: "block",
            type: "paragraph",
            paragraph: { rich_text: [{ text: { content } }] }
          }
        ]
      });

      console.log(`[Notion] Created page: ${title}`);
      return {
        id: result.id,
        title,
        url: result.url,
        createdTime: result.created_time,
        lastEditedTime: result.last_edited_time,
        parent: result.parent
      };
    } catch (error: any) {
      console.error("[Notion] Failed to create page:", error.message);
      throw error;
    }
  }

  async syncSuppliersToDatabase(databaseId: string): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const suppliers = await storage.getSuppliers(this.companyId);
      
      for (const supplier of suppliers) {
        try {
          await this.request<any>("/pages", "POST", {
            parent: { database_id: databaseId },
            properties: {
              "Name": { title: [{ text: { content: supplier.name } }] },
              "Email": { email: supplier.contactEmail || null }
            }
          });
          synced++;
        } catch (err: any) {
          errors.push(`Supplier ${supplier.name}: ${err.message}`);
        }
      }

      console.log(`[Notion] Synced ${synced} suppliers to database`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[Notion] Supplier sync failed:", error.message);
      throw error;
    }
  }

  private extractTitle(page: any): string {
    const titleProp = page.properties?.title || page.properties?.Name;
    if (titleProp?.title?.[0]?.plain_text) {
      return titleProp.title[0].plain_text;
    }
    return "Untitled";
  }
}

export async function getNotionIntegration(companyId: string): Promise<NotionIntegration | null> {
  try {
    const credentials = await CredentialService.getDecryptedCredentials(companyId, 'notion');
    if (credentials?.accessToken) {
      console.log(`[Notion] Using centralized credential storage for company ${companyId}`);
      return new NotionIntegration(credentials.accessToken, companyId);
    }
  } catch (error) {
    console.log(`[Notion] Credentials not available for company ${companyId}`);
  }
  return null;
}

export async function syncNotionData(companyId: string): Promise<{
  success: boolean;
  pages?: number;
  databases?: number;
  error?: string;
}> {
  const integration = await getNotionIntegration(companyId);
  if (!integration) {
    return { success: false, error: 'Notion not configured' };
  }

  try {
    const connectionTest = await integration.testConnection();
    if (!connectionTest.success) {
      return { success: false, error: connectionTest.message };
    }

    const pages = await integration.searchPages();
    const databases = await integration.searchDatabases();

    console.log(`[Notion] Full sync complete: ${pages.length} pages, ${databases.length} databases`);
    return {
      success: true,
      pages: pages.length,
      databases: databases.length
    };
  } catch (error: any) {
    console.error('[Notion] Sync failed:', error.message);
    return { success: false, error: error.message };
  }
}
