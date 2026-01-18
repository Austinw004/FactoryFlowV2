import axios from "axios";
import { storage } from "../storage";

export interface SheetData {
  spreadsheetId: string;
  title: string;
  sheets: Array<{ sheetId: number; title: string }>;
}

export interface SheetValues {
  range: string;
  values: string[][];
}

export class GoogleSheetsIntegration {
  private accessToken: string;
  private companyId: string;
  private baseUrl = "https://sheets.googleapis.com/v4/spreadsheets";

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
        "Content-Type": "application/json"
      },
      data,
      timeout: 30000
    });
    
    return response.data;
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      await axios.get("https://www.googleapis.com/oauth2/v1/userinfo", {
        headers: { "Authorization": `Bearer ${this.accessToken}` }
      });
      console.log(`[GoogleSheets] Connection test successful for company ${this.companyId}`);
      return { success: true, message: "Google Sheets connection verified" };
    } catch (error: any) {
      console.error(`[GoogleSheets] Connection test failed:`, error.message);
      return { success: false, message: error.response?.data?.error?.message || error.message };
    }
  }

  async getSpreadsheet(spreadsheetId: string): Promise<SheetData> {
    try {
      const result = await this.request<any>(`/${spreadsheetId}`);
      console.log(`[GoogleSheets] Fetched spreadsheet: ${result.properties.title}`);
      return {
        spreadsheetId: result.spreadsheetId,
        title: result.properties.title,
        sheets: result.sheets.map((s: any) => ({
          sheetId: s.properties.sheetId,
          title: s.properties.title
        }))
      };
    } catch (error: any) {
      console.error("[GoogleSheets] Failed to get spreadsheet:", error.message);
      throw error;
    }
  }

  async readRange(spreadsheetId: string, range: string): Promise<SheetValues> {
    try {
      const result = await this.request<any>(`/${spreadsheetId}/values/${encodeURIComponent(range)}`);
      console.log(`[GoogleSheets] Read ${result.values?.length || 0} rows from ${range}`);
      return {
        range: result.range,
        values: result.values || []
      };
    } catch (error: any) {
      console.error("[GoogleSheets] Failed to read range:", error.message);
      throw error;
    }
  }

  async writeRange(spreadsheetId: string, range: string, values: string[][]): Promise<{ updatedCells: number }> {
    try {
      const result = await this.request<any>(
        `/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
        "PUT",
        { values }
      );
      console.log(`[GoogleSheets] Updated ${result.updatedCells} cells`);
      return { updatedCells: result.updatedCells };
    } catch (error: any) {
      console.error("[GoogleSheets] Failed to write range:", error.message);
      throw error;
    }
  }

  async appendRows(spreadsheetId: string, range: string, values: string[][]): Promise<{ updatedRows: number }> {
    try {
      const result = await this.request<any>(
        `/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        "POST",
        { values }
      );
      console.log(`[GoogleSheets] Appended ${values.length} rows`);
      return { updatedRows: values.length };
    } catch (error: any) {
      console.error("[GoogleSheets] Failed to append rows:", error.message);
      throw error;
    }
  }

  async exportInventoryToSheet(spreadsheetId: string): Promise<{ exported: number }> {
    try {
      const materials = await storage.getMaterials(this.companyId);
      
      const headers = ["SKU", "Name", "Category", "Current Stock", "Reorder Point", "Unit Cost", "Lead Time (Days)"];
      const rows = materials.map(m => [
        m.sku,
        m.name,
        m.category || "",
        String(m.currentStock || 0),
        String(m.reorderPoint || 0),
        String(m.unitCost || 0),
        String(m.leadTimeDays || 0)
      ]);

      await this.writeRange(spreadsheetId, "Inventory!A1:G1", [headers]);
      if (rows.length > 0) {
        await this.writeRange(spreadsheetId, `Inventory!A2:G${rows.length + 1}`, rows);
      }

      console.log(`[GoogleSheets] Exported ${rows.length} inventory items`);
      return { exported: rows.length };
    } catch (error: any) {
      console.error("[GoogleSheets] Inventory export failed:", error.message);
      throw error;
    }
  }

  async importMaterialsFromSheet(spreadsheetId: string, range: string): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    try {
      const data = await this.readRange(spreadsheetId, range);
      const rows = data.values.slice(1);

      for (const row of rows) {
        try {
          if (row.length < 2) continue;
          
          const [sku, name, category, currentStock, reorderPoint, unitCost, leadTime] = row;
          
          const materials = await storage.getMaterials(this.companyId);
          const existing = materials.find(m => m.sku === sku);
          
          if (!existing) {
            await storage.createMaterial({
              companyId: this.companyId,
              name: name || sku,
              sku,
              category: category || "Imported",
              unit: "units",
              currentStock: parseInt(currentStock) || 0,
              reorderPoint: parseInt(reorderPoint) || 10,
              leadTimeDays: parseInt(leadTime) || 7,
              unitCost: parseFloat(unitCost) || 0,
              externalId: `gsheet-${sku}`,
              externalSource: "google-sheets"
            });
            imported++;
          }
        } catch (err: any) {
          errors.push(`Row: ${err.message}`);
        }
      }

      console.log(`[GoogleSheets] Imported ${imported} materials`);
      return { imported, errors };
    } catch (error: any) {
      console.error("[GoogleSheets] Material import failed:", error.message);
      throw error;
    }
  }
}

export async function getGoogleSheetsIntegration(companyId: string): Promise<GoogleSheetsIntegration | null> {
  const company = await storage.getCompany(companyId);
  if (!company?.googleAccessToken) {
    return null;
  }
  return new GoogleSheetsIntegration(company.googleAccessToken, companyId);
}
