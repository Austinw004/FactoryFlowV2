import axios from "axios";
import { storage } from "../storage";
import { CredentialService } from "./credentialService";

export interface PowerBIDataset {
  id: string;
  name: string;
  configuredBy: string;
  isRefreshable: boolean;
  isOnPremGatewayRequired: boolean;
  targetStorageMode: string;
}

export interface PowerBIReport {
  id: string;
  name: string;
  datasetId: string;
  embedUrl: string;
  webUrl: string;
}

export interface PowerBIDashboard {
  id: string;
  displayName: string;
  embedUrl: string;
  webUrl: string;
  isReadOnly: boolean;
}

export interface PowerBIWorkspace {
  id: string;
  name: string;
  isReadOnly: boolean;
  isOnDedicatedCapacity: boolean;
}

export class PowerBIIntegration {
  private accessToken: string;
  private companyId: string;
  private baseUrl = "https://api.powerbi.com/v1.0/myorg";

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
      await this.request<any>("/groups?$top=1");
      console.log(`[PowerBI] Connection test successful for company ${this.companyId}`);
      return { success: true, message: "Power BI connection verified" };
    } catch (error: any) {
      console.error(`[PowerBI] Connection test failed:`, error.message);
      return { success: false, message: error.response?.data?.error?.message || error.message };
    }
  }

  async listWorkspaces(): Promise<PowerBIWorkspace[]> {
    try {
      const result = await this.request<any>("/groups");
      const workspaces = result.value?.map((ws: any) => ({
        id: ws.id,
        name: ws.name,
        isReadOnly: ws.isReadOnly || false,
        isOnDedicatedCapacity: ws.isOnDedicatedCapacity || false
      })) || [];
      console.log(`[PowerBI] Found ${workspaces.length} workspaces`);
      return workspaces;
    } catch (error: any) {
      console.error("[PowerBI] Failed to list workspaces:", error.message);
      throw error;
    }
  }

  async getDatasets(workspaceId?: string): Promise<PowerBIDataset[]> {
    try {
      const endpoint = workspaceId ? `/groups/${workspaceId}/datasets` : "/datasets";
      const result = await this.request<any>(endpoint);
      const datasets = result.value?.map((ds: any) => ({
        id: ds.id,
        name: ds.name,
        configuredBy: ds.configuredBy,
        isRefreshable: ds.isRefreshable || false,
        isOnPremGatewayRequired: ds.isOnPremGatewayRequired || false,
        targetStorageMode: ds.targetStorageMode
      })) || [];
      console.log(`[PowerBI] Found ${datasets.length} datasets`);
      return datasets;
    } catch (error: any) {
      console.error("[PowerBI] Failed to get datasets:", error.message);
      throw error;
    }
  }

  async getReports(workspaceId?: string): Promise<PowerBIReport[]> {
    try {
      const endpoint = workspaceId ? `/groups/${workspaceId}/reports` : "/reports";
      const result = await this.request<any>(endpoint);
      const reports = result.value?.map((r: any) => ({
        id: r.id,
        name: r.name,
        datasetId: r.datasetId,
        embedUrl: r.embedUrl,
        webUrl: r.webUrl
      })) || [];
      console.log(`[PowerBI] Found ${reports.length} reports`);
      return reports;
    } catch (error: any) {
      console.error("[PowerBI] Failed to get reports:", error.message);
      throw error;
    }
  }

  async getDashboards(workspaceId?: string): Promise<PowerBIDashboard[]> {
    try {
      const endpoint = workspaceId ? `/groups/${workspaceId}/dashboards` : "/dashboards";
      const result = await this.request<any>(endpoint);
      const dashboards = result.value?.map((d: any) => ({
        id: d.id,
        displayName: d.displayName,
        embedUrl: d.embedUrl,
        webUrl: d.webUrl,
        isReadOnly: d.isReadOnly || false
      })) || [];
      console.log(`[PowerBI] Found ${dashboards.length} dashboards`);
      return dashboards;
    } catch (error: any) {
      console.error("[PowerBI] Failed to get dashboards:", error.message);
      throw error;
    }
  }

  async refreshDataset(datasetId: string, workspaceId?: string): Promise<boolean> {
    try {
      const endpoint = workspaceId 
        ? `/groups/${workspaceId}/datasets/${datasetId}/refreshes`
        : `/datasets/${datasetId}/refreshes`;
      
      await this.request<any>(endpoint, "POST", {});
      console.log(`[PowerBI] Triggered refresh for dataset ${datasetId}`);
      return true;
    } catch (error: any) {
      console.error("[PowerBI] Failed to refresh dataset:", error.message);
      return false;
    }
  }

  async pushRowsToDataset(datasetId: string, tableName: string, rows: any[], workspaceId?: string): Promise<{ success: boolean; rowsPushed: number }> {
    try {
      const endpoint = workspaceId
        ? `/groups/${workspaceId}/datasets/${datasetId}/tables/${tableName}/rows`
        : `/datasets/${datasetId}/tables/${tableName}/rows`;

      await this.request<any>(endpoint, "POST", { rows });
      console.log(`[PowerBI] Pushed ${rows.length} rows to ${tableName}`);
      return { success: true, rowsPushed: rows.length };
    } catch (error: any) {
      console.error("[PowerBI] Failed to push rows:", error.message);
      return { success: false, rowsPushed: 0 };
    }
  }

  async syncDemandSignalsToPowerBI(datasetId: string, tableName: string = "DemandSignals"): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const signals = await storage.getDemandSignals(this.companyId);
      const rows = signals.slice(0, 1000).map(signal => ({
        signalId: signal.id,
        signalType: signal.signalType,
        signalDate: signal.signalDate,
        quantity: signal.quantity,
        unit: signal.unit,
        channel: signal.channel,
        customer: signal.customer,
        confidence: signal.confidence,
        priority: signal.priority,
        createdAt: new Date().toISOString()
      }));

      if (rows.length > 0) {
        const result = await this.pushRowsToDataset(datasetId, tableName, rows);
        if (result.success) {
          synced = result.rowsPushed;
        } else {
          errors.push("Failed to push rows to Power BI");
        }
      }

      console.log(`[PowerBI] Synced ${synced} demand signals`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[PowerBI] Demand signal sync failed:", error.message);
      return { synced: 0, errors: [error.message] };
    }
  }

  async syncMaterialsToPowerBI(datasetId: string, tableName: string = "Materials"): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const materials = await storage.getMaterials(this.companyId);
      const rows = materials.map(mat => ({
        materialId: mat.id,
        code: mat.code,
        name: mat.name,
        unit: mat.unit,
        onHand: mat.onHand,
        updatedAt: new Date().toISOString()
      }));

      if (rows.length > 0) {
        const result = await this.pushRowsToDataset(datasetId, tableName, rows);
        if (result.success) {
          synced = result.rowsPushed;
        } else {
          errors.push("Failed to push rows to Power BI");
        }
      }

      console.log(`[PowerBI] Synced ${synced} materials`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[PowerBI] Material sync failed:", error.message);
      return { synced: 0, errors: [error.message] };
    }
  }

  async syncSuppliersToPowerBI(datasetId: string, tableName: string = "Suppliers"): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const suppliers = await storage.getSuppliers(this.companyId);
      const rows = suppliers.map(sup => ({
        supplierId: sup.id,
        name: sup.name,
        contactEmail: sup.contactEmail,
        updatedAt: new Date().toISOString()
      }));

      if (rows.length > 0) {
        const result = await this.pushRowsToDataset(datasetId, tableName, rows);
        if (result.success) {
          synced = result.rowsPushed;
        } else {
          errors.push("Failed to push rows to Power BI");
        }
      }

      console.log(`[PowerBI] Synced ${synced} suppliers`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[PowerBI] Supplier sync failed:", error.message);
      return { synced: 0, errors: [error.message] };
    }
  }
}

export async function getPowerBIIntegration(companyId: string): Promise<PowerBIIntegration | null> {
  try {
    const credentials = await CredentialService.getDecryptedCredentials(companyId, 'powerbi');
    if (credentials?.accessToken) {
      console.log(`[PowerBI] Using centralized credential storage for company ${companyId}`);
      return new PowerBIIntegration(credentials.accessToken, companyId);
    }
  } catch (error) {
    console.log(`[PowerBI] Credentials not available for company ${companyId}`);
  }
  return null;
}
