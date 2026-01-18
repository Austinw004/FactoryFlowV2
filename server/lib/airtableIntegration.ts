import axios from "axios";
import { storage } from "../storage";

export interface AirtableBase {
  id: string;
  name: string;
  permissionLevel: string;
}

export interface AirtableTable {
  id: string;
  name: string;
  primaryFieldId: string;
  fields: Array<{ id: string; name: string; type: string }>;
}

export interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: Record<string, any>;
}

export class AirtableIntegration {
  private accessToken: string;
  private companyId: string;
  private baseUrl = "https://api.airtable.com/v0";

  constructor(accessToken: string, companyId: string) {
    this.accessToken = accessToken;
    this.companyId = companyId;
  }

  private async request<T>(endpoint: string, method: string = "GET", data?: any): Promise<T> {
    const response = await axios({
      method,
      url: endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`,
      headers: {
        "Authorization": `Bearer ${this.accessToken}`,
        "Content-Type": "application/json"
      },
      data,
      timeout: 30000
    });
    
    return response.data;
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      await this.request<{ bases: AirtableBase[] }>("https://api.airtable.com/v0/meta/bases");
      console.log(`[Airtable] Connection test successful for company ${this.companyId}`);
      return { success: true, message: "Airtable connection verified" };
    } catch (error: any) {
      console.error(`[Airtable] Connection test failed:`, error.message);
      return { success: false, message: error.response?.data?.error?.message || error.message };
    }
  }

  async listBases(): Promise<AirtableBase[]> {
    try {
      const result = await this.request<{ bases: AirtableBase[] }>("https://api.airtable.com/v0/meta/bases");
      console.log(`[Airtable] Found ${result.bases.length} bases`);
      return result.bases;
    } catch (error: any) {
      console.error("[Airtable] Failed to list bases:", error.message);
      throw error;
    }
  }

  async getBaseSchema(baseId: string): Promise<AirtableTable[]> {
    try {
      const result = await this.request<{ tables: AirtableTable[] }>(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`);
      console.log(`[Airtable] Found ${result.tables.length} tables in base ${baseId}`);
      return result.tables;
    } catch (error: any) {
      console.error("[Airtable] Failed to get base schema:", error.message);
      throw error;
    }
  }

  async listRecords(baseId: string, tableIdOrName: string, maxRecords: number = 100): Promise<AirtableRecord[]> {
    try {
      const result = await this.request<{ records: AirtableRecord[] }>(
        `/${baseId}/${encodeURIComponent(tableIdOrName)}?maxRecords=${maxRecords}`
      );
      console.log(`[Airtable] Fetched ${result.records.length} records from ${tableIdOrName}`);
      return result.records;
    } catch (error: any) {
      console.error("[Airtable] Failed to list records:", error.message);
      throw error;
    }
  }

  async createRecord(baseId: string, tableIdOrName: string, fields: Record<string, any>): Promise<AirtableRecord> {
    try {
      const result = await this.request<AirtableRecord>(
        `/${baseId}/${encodeURIComponent(tableIdOrName)}`,
        "POST",
        { fields }
      );
      console.log(`[Airtable] Created record in ${tableIdOrName}`);
      return result;
    } catch (error: any) {
      console.error("[Airtable] Failed to create record:", error.message);
      throw error;
    }
  }

  async updateRecord(baseId: string, tableIdOrName: string, recordId: string, fields: Record<string, any>): Promise<AirtableRecord> {
    try {
      const result = await this.request<AirtableRecord>(
        `/${baseId}/${encodeURIComponent(tableIdOrName)}/${recordId}`,
        "PATCH",
        { fields }
      );
      console.log(`[Airtable] Updated record ${recordId}`);
      return result;
    } catch (error: any) {
      console.error("[Airtable] Failed to update record:", error.message);
      throw error;
    }
  }

  async syncMaterialsToBase(baseId: string, tableName: string): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const materials = await storage.getMaterials(this.companyId);
      
      for (const material of materials) {
        try {
          await this.createRecord(baseId, tableName, {
            "SKU": material.sku,
            "Name": material.name,
            "Category": material.category || "",
            "Current Stock": material.currentStock || 0,
            "Reorder Point": material.reorderPoint || 0,
            "Unit Cost": material.unitCost || 0,
            "Lead Time (Days)": material.leadTimeDays || 0
          });
          synced++;
        } catch (err: any) {
          errors.push(`Material ${material.name}: ${err.message}`);
        }
      }

      console.log(`[Airtable] Synced ${synced} materials to base`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[Airtable] Material sync failed:", error.message);
      throw error;
    }
  }

  async importMaterialsFromBase(baseId: string, tableName: string): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    try {
      const records = await this.listRecords(baseId, tableName, 500);
      
      for (const record of records) {
        try {
          const fields = record.fields;
          const sku = fields["SKU"] || fields["sku"] || `AT-${record.id.slice(0, 8)}`;
          
          const materials = await storage.getMaterials(this.companyId);
          const existing = materials.find(m => m.sku === sku || m.externalId === record.id);
          
          if (!existing) {
            await storage.createMaterial({
              companyId: this.companyId,
              name: fields["Name"] || fields["name"] || sku,
              sku,
              category: fields["Category"] || fields["category"] || "Airtable Import",
              unit: "units",
              currentStock: parseInt(fields["Current Stock"] || fields["Stock"] || "0") || 0,
              reorderPoint: parseInt(fields["Reorder Point"] || "10") || 10,
              leadTimeDays: parseInt(fields["Lead Time (Days)"] || fields["Lead Time"] || "7") || 7,
              unitCost: parseFloat(fields["Unit Cost"] || fields["Cost"] || "0") || 0,
              externalId: record.id,
              externalSource: "airtable"
            });
            imported++;
          }
        } catch (err: any) {
          errors.push(`Record ${record.id}: ${err.message}`);
        }
      }

      console.log(`[Airtable] Imported ${imported} materials from base`);
      return { imported, errors };
    } catch (error: any) {
      console.error("[Airtable] Material import failed:", error.message);
      throw error;
    }
  }
}

export async function getAirtableIntegration(companyId: string): Promise<AirtableIntegration | null> {
  const company = await storage.getCompany(companyId);
  if (!company?.airtableAccessToken) {
    return null;
  }
  return new AirtableIntegration(company.airtableAccessToken, companyId);
}
