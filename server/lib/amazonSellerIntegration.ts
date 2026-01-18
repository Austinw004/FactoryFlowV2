import axios from "axios";
import { storage } from "../storage";
import { CredentialService } from "./credentialService";

export interface AmazonOrder {
  AmazonOrderId: string;
  PurchaseDate: string;
  OrderStatus: string;
  OrderTotal?: { Amount: string; CurrencyCode: string };
  NumberOfItemsShipped: number;
  NumberOfItemsUnshipped: number;
  FulfillmentChannel: string;
}

export interface AmazonProduct {
  ASIN: string;
  SKU: string;
  ProductName: string;
  Price?: { Amount: number; CurrencyCode: string };
  Quantity?: number;
  FulfillmentChannel: string;
}

export interface AmazonInventory {
  ASIN: string;
  SKU: string;
  FnSku?: string;
  ProductName: string;
  Condition: string;
  TotalQuantity: number;
  InStockSupplyQuantity: number;
}

export class AmazonSellerIntegration {
  private accessToken: string;
  private refreshToken: string;
  private sellerId: string;
  private marketplaceId: string;
  private companyId: string;
  private baseUrl = "https://sellingpartnerapi-na.amazon.com";

  constructor(accessToken: string, refreshToken: string, sellerId: string, marketplaceId: string, companyId: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.sellerId = sellerId;
    this.marketplaceId = marketplaceId;
    this.companyId = companyId;
  }

  private async request<T>(endpoint: string, method: string = "GET", params: any = {}): Promise<T> {
    const response = await axios({
      method,
      url: `${this.baseUrl}${endpoint}`,
      headers: {
        "Authorization": `Bearer ${this.accessToken}`,
        "x-amz-access-token": this.accessToken,
        "Content-Type": "application/json"
      },
      params: { ...params, MarketplaceIds: this.marketplaceId },
      timeout: 30000
    });
    
    return response.data;
  }

  async testConnection(): Promise<{ success: boolean; message?: string; seller?: string }> {
    try {
      const sellers = await this.request<{ payload: { participations: Array<{ marketplace: { name: string } }> } }>("/sellers/v1/marketplaceParticipations");
      const marketplace = sellers.payload?.participations?.[0]?.marketplace?.name || "Connected";
      console.log(`[Amazon] Connection test successful: ${marketplace}`);
      return { success: true, message: "Amazon Seller connection verified", seller: marketplace };
    } catch (error: any) {
      console.error(`[Amazon] Connection test failed:`, error.message);
      return { success: false, message: error.response?.data?.errors?.[0]?.message || error.message };
    }
  }

  async fetchOrders(createdAfter?: string): Promise<AmazonOrder[]> {
    try {
      const afterDate = createdAfter || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const result = await this.request<{ payload: { Orders: AmazonOrder[] } }>("/orders/v0/orders", "GET", {
        CreatedAfter: afterDate,
        OrderStatuses: "Unshipped,PartiallyShipped,Shipped"
      });
      console.log(`[Amazon] Fetched ${result.payload.Orders.length} orders`);
      return result.payload.Orders;
    } catch (error: any) {
      console.error("[Amazon] Failed to fetch orders:", error.message);
      throw error;
    }
  }

  async fetchInventory(): Promise<AmazonInventory[]> {
    try {
      const result = await this.request<{ payload: { inventorySummaries: AmazonInventory[] } }>("/fba/inventory/v1/summaries", "GET", {
        details: true,
        granularityType: "Marketplace",
        granularityId: this.marketplaceId
      });
      console.log(`[Amazon] Fetched ${result.payload.inventorySummaries.length} inventory items`);
      return result.payload.inventorySummaries;
    } catch (error: any) {
      console.error("[Amazon] Failed to fetch inventory:", error.message);
      throw error;
    }
  }

  async syncOrdersAsDemandSignals(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const orders = await this.fetchOrders();
      
      for (const order of orders) {
        try {
          await storage.createDemandSignal({
            companyId: this.companyId,
            signalType: "order",
            signalDate: new Date(order.PurchaseDate),
            quantity: order.NumberOfItemsShipped + order.NumberOfItemsUnshipped,
            unit: order.OrderTotal?.CurrencyCode || "USD",
            channel: "amazon",
            customer: `Amazon Customer`,
            confidence: order.OrderStatus === "Shipped" ? 100 : 80,
            priority: "medium",
            attributes: {
              source: "amazon",
              orderId: order.AmazonOrderId,
              orderStatus: order.OrderStatus,
              fulfillmentChannel: order.FulfillmentChannel,
              total: order.OrderTotal?.Amount
            }
          });
          synced++;
        } catch (err: any) {
          errors.push(`Order ${order.AmazonOrderId}: ${err.message}`);
        }
      }

      console.log(`[Amazon] Created ${synced} demand signals for company ${this.companyId}`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[Amazon] Demand signal sync failed:", error.message);
      throw error;
    }
  }

  async syncInventoryAsMaterials(): Promise<{ synced: number; updated: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;
    let updated = 0;

    try {
      const inventory = await this.fetchInventory();
      
      for (const item of inventory) {
        try {
          const materials = await storage.getMaterials(this.companyId);
          const existing = materials.find(m => m.code === item.SKU);
          
          if (existing) {
            await storage.updateMaterial(existing.id, {
              onHand: item.TotalQuantity
            });
            updated++;
          } else {
            await storage.createMaterial({
              companyId: this.companyId,
              name: item.ProductName,
              code: item.SKU,
              unit: "units",
              onHand: item.TotalQuantity
            });
            synced++;
          }
        } catch (err: any) {
          errors.push(`Item ${item.SKU}: ${err.message}`);
        }
      }

      console.log(`[Amazon] Synced ${synced} new materials, updated ${updated} existing`);
      return { synced, updated, errors };
    } catch (error: any) {
      console.error("[Amazon] Inventory sync failed:", error.message);
      throw error;
    }
  }
}

export async function getAmazonSellerIntegration(companyId: string): Promise<AmazonSellerIntegration | null> {
  try {
    const credentials = await CredentialService.getDecryptedCredentials(companyId, 'amazon_seller');
    if (credentials?.accessToken && credentials?.sellerId) {
      console.log(`[Amazon] Using centralized credential storage for company ${companyId}`);
      return new AmazonSellerIntegration(
        credentials.accessToken,
        credentials.refreshToken || "",
        credentials.sellerId,
        credentials.marketplaceId || "ATVPDKIKX0DER",
        companyId
      );
    }
  } catch (error) {
    console.log(`[Amazon] Credentials not available for company ${companyId}`);
  }
  return null;
}
