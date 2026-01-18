import axios from "axios";
import crypto from "crypto";
import { storage } from "../storage";

export interface NetSuiteVendor {
  id: string;
  entityId: string;
  companyName: string;
  email?: string;
  phone?: string;
  terms?: string;
}

export interface NetSuiteItem {
  id: string;
  itemId: string;
  displayName: string;
  sku?: string;
  quantityOnHand: number;
  averageCost: number;
  lastPurchasePrice: number;
}

export interface NetSuitePurchaseOrder {
  id: string;
  tranId: string;
  entity: { id: string; refName: string };
  status: string;
  total: number;
  tranDate: string;
}

export class NetSuiteIntegration {
  private accountId: string;
  private consumerKey: string;
  private consumerSecret: string;
  private tokenId: string;
  private tokenSecret: string;
  private companyId: string;

  constructor(
    accountId: string,
    consumerKey: string,
    consumerSecret: string,
    tokenId: string,
    tokenSecret: string,
    companyId: string
  ) {
    this.accountId = accountId;
    this.consumerKey = consumerKey;
    this.consumerSecret = consumerSecret;
    this.tokenId = tokenId;
    this.tokenSecret = tokenSecret;
    this.companyId = companyId;
  }

  private generateOAuthHeader(method: string, url: string): string {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString("hex");

    const params: Record<string, string> = {
      oauth_consumer_key: this.consumerKey,
      oauth_nonce: nonce,
      oauth_signature_method: "HMAC-SHA256",
      oauth_timestamp: timestamp,
      oauth_token: this.tokenId,
      oauth_version: "1.0"
    };

    const sortedParams = Object.keys(params).sort().map(k => `${k}=${encodeURIComponent(params[k])}`).join("&");
    const baseString = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
    const signingKey = `${encodeURIComponent(this.consumerSecret)}&${encodeURIComponent(this.tokenSecret)}`;
    const signature = crypto.createHmac("sha256", signingKey).update(baseString).digest("base64");

    params.oauth_signature = signature;
    const realm = this.accountId.replace("-", "_").toUpperCase();
    
    return `OAuth realm="${realm}",${Object.entries(params).map(([k, v]) => `${k}="${encodeURIComponent(v)}"`).join(",")}`;
  }

  private get baseUrl(): string {
    const accountForUrl = this.accountId.toLowerCase().replace("_", "-");
    return `https://${accountForUrl}.suitetalk.api.netsuite.com/services/rest/record/v1`;
  }

  private async request<T>(endpoint: string, method: string = "GET", data?: any): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const authHeader = this.generateOAuthHeader(method, url);

    const response = await axios({
      method,
      url,
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      data,
      timeout: 30000
    });
    
    return response.data;
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      await this.request<any>("/vendor?limit=1");
      console.log(`[NetSuite] Connection test successful for company ${this.companyId}`);
      return { success: true, message: "NetSuite connection verified" };
    } catch (error: any) {
      console.error(`[NetSuite] Connection test failed:`, error.message);
      return { success: false, message: error.response?.data?.["o:errorDetails"]?.[0]?.detail || error.message };
    }
  }

  async fetchVendors(limit: number = 100): Promise<NetSuiteVendor[]> {
    try {
      const result = await this.request<{ items: any[] }>(`/vendor?limit=${limit}`);
      const vendors = (result.items || []).map(v => ({
        id: v.id,
        entityId: v.entityId,
        companyName: v.companyName || v.entityId,
        email: v.email,
        phone: v.phone,
        terms: v.terms?.refName
      }));

      console.log(`[NetSuite] Fetched ${vendors.length} vendors`);
      return vendors;
    } catch (error: any) {
      console.error("[NetSuite] Failed to fetch vendors:", error.message);
      throw error;
    }
  }

  async fetchInventoryItems(limit: number = 100): Promise<NetSuiteItem[]> {
    try {
      const result = await this.request<{ items: any[] }>(`/inventoryItem?limit=${limit}`);
      const items = (result.items || []).map(i => ({
        id: i.id,
        itemId: i.itemId,
        displayName: i.displayName || i.itemId,
        sku: i.upcCode || i.itemId,
        quantityOnHand: i.quantityOnHand || 0,
        averageCost: i.averageCost || 0,
        lastPurchasePrice: i.lastPurchasePrice || 0
      }));

      console.log(`[NetSuite] Fetched ${items.length} inventory items`);
      return items;
    } catch (error: any) {
      console.error("[NetSuite] Failed to fetch inventory items:", error.message);
      throw error;
    }
  }

  async fetchPurchaseOrders(limit: number = 100): Promise<NetSuitePurchaseOrder[]> {
    try {
      const result = await this.request<{ items: any[] }>(`/purchaseOrder?limit=${limit}`);
      const orders = (result.items || []).map(po => ({
        id: po.id,
        tranId: po.tranId,
        entity: { id: po.entity?.id, refName: po.entity?.refName },
        status: po.status?.refName || "Unknown",
        total: po.total || 0,
        tranDate: po.tranDate
      }));

      console.log(`[NetSuite] Fetched ${orders.length} purchase orders`);
      return orders;
    } catch (error: any) {
      console.error("[NetSuite] Failed to fetch purchase orders:", error.message);
      throw error;
    }
  }

  async syncVendorsAsSuppliers(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const vendors = await this.fetchVendors(200);
      
      for (const vendor of vendors) {
        try {
          const existingSuppliers = await storage.getSuppliers(this.companyId);
          const existing = existingSuppliers.find(s => s.externalId === vendor.id);
          
          if (!existing) {
            await storage.createSupplier({
              companyId: this.companyId,
              name: vendor.companyName,
              contactEmail: vendor.email || "",
              phone: vendor.phone || "",
              address: "",
              category: "NetSuite Vendor",
              riskScore: 50,
              tier: 1,
              leadTime: vendor.terms === "Net 30" ? 30 : 14,
              reliabilityScore: 85,
              externalId: vendor.id,
              externalSource: "netsuite"
            });
            synced++;
          }
        } catch (err: any) {
          errors.push(`Vendor ${vendor.companyName}: ${err.message}`);
        }
      }

      console.log(`[NetSuite] Synced ${synced} vendors as suppliers`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[NetSuite] Vendor sync failed:", error.message);
      throw error;
    }
  }

  async syncInventoryAsMaterials(): Promise<{ synced: number; updated: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;
    let updated = 0;

    try {
      const items = await this.fetchInventoryItems(200);
      
      for (const item of items) {
        try {
          const materials = await storage.getMaterials(this.companyId);
          const existing = materials.find(m => m.externalId === item.id);
          
          if (existing) {
            await storage.updateMaterial(existing.id, {
              currentStock: item.quantityOnHand,
              unitCost: item.averageCost || item.lastPurchasePrice
            });
            updated++;
          } else {
            await storage.createMaterial({
              companyId: this.companyId,
              name: item.displayName,
              sku: item.sku || item.itemId,
              category: "NetSuite Inventory",
              unit: "units",
              currentStock: item.quantityOnHand,
              reorderPoint: Math.ceil(item.quantityOnHand * 0.2),
              leadTimeDays: 14,
              unitCost: item.averageCost || item.lastPurchasePrice,
              externalId: item.id,
              externalSource: "netsuite"
            });
            synced++;
          }
        } catch (err: any) {
          errors.push(`Item ${item.displayName}: ${err.message}`);
        }
      }

      console.log(`[NetSuite] Synced ${synced} new items, updated ${updated} existing`);
      return { synced, updated, errors };
    } catch (error: any) {
      console.error("[NetSuite] Inventory sync failed:", error.message);
      throw error;
    }
  }

  async syncPurchaseOrdersAsRFQs(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const orders = await this.fetchPurchaseOrders(100);
      
      for (const po of orders) {
        try {
          await storage.createRFQ({
            companyId: this.companyId,
            title: `PO: ${po.tranId}`,
            description: `NetSuite Purchase Order from ${po.entity.refName}`,
            status: po.status === "Fully Billed" ? "closed" : "pending",
            priority: "medium",
            deadline: po.tranDate ? new Date(po.tranDate) : new Date(),
            items: [{
              description: `Purchase Order ${po.tranId}`,
              quantity: 1,
              unit: "order",
              targetPrice: po.total
            }],
            externalId: po.id,
            externalSource: "netsuite"
          });
          synced++;
        } catch (err: any) {
          errors.push(`PO ${po.tranId}: ${err.message}`);
        }
      }

      console.log(`[NetSuite] Created ${synced} RFQs from purchase orders`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[NetSuite] PO sync failed:", error.message);
      throw error;
    }
  }
}

export async function getNetSuiteIntegration(companyId: string): Promise<NetSuiteIntegration | null> {
  const company = await storage.getCompany(companyId);
  if (!company?.netsuiteAccountId || !company?.netsuiteConsumerKey || !company?.netsuiteTokenId) {
    return null;
  }
  return new NetSuiteIntegration(
    company.netsuiteAccountId,
    company.netsuiteConsumerKey,
    company.netsuiteConsumerSecret || "",
    company.netsuiteTokenId,
    company.netsuiteTokenSecret || "",
    companyId
  );
}
