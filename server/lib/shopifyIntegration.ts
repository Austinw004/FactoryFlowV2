import { db } from "../db";
import { companies, demandSignals, materials } from "@shared/schema";
import { eq } from "drizzle-orm";
import { CredentialService } from "./credentialService";

export interface ShopifyConfig {
  shopDomain: string;
  apiKey: string;
  apiSecret: string;
}

export interface ShopifyOrder {
  id: number;
  name: string;
  created_at: string;
  total_price: string;
  currency: string;
  line_items: Array<{
    id: number;
    product_id: number;
    variant_id: number;
    title: string;
    quantity: number;
    price: string;
    sku: string;
  }>;
  customer?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
}

export interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  status: string;
  variants: Array<{
    id: number;
    sku: string;
    price: string;
    inventory_quantity: number;
    inventory_item_id: number;
  }>;
}

export interface ShopifyInventoryLevel {
  inventory_item_id: number;
  location_id: number;
  available: number;
  updated_at: string;
}

export class ShopifyIntegration {
  private baseUrl: string;
  private accessToken: string;
  private companyId: string;

  constructor(config: { shopDomain: string; accessToken: string; companyId: string }) {
    this.baseUrl = `https://${config.shopDomain}/admin/api/2024-01`;
    this.accessToken = config.accessToken;
    this.companyId = config.companyId;
  }

  private async request<T>(endpoint: string, method = "GET", body?: any): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": this.accessToken,
    };

    const options: RequestInit = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Shopify] API error ${response.status}: ${errorText}`);
      throw new Error(`Shopify API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async testConnection(): Promise<{ success: boolean; shop?: any; error?: string }> {
    try {
      const data = await this.request<{ shop: any }>("/shop.json");
      console.log(`[Shopify] Connected to shop: ${data.shop.name}`);
      return { success: true, shop: data.shop };
    } catch (error: any) {
      console.error("[Shopify] Connection test failed:", error.message);
      return { success: false, error: error.message };
    }
  }

  async fetchOrders(limit = 50, since?: string): Promise<ShopifyOrder[]> {
    try {
      let endpoint = `/orders.json?status=any&limit=${limit}`;
      if (since) {
        endpoint += `&created_at_min=${since}`;
      }
      
      const data = await this.request<{ orders: ShopifyOrder[] }>(endpoint);
      console.log(`[Shopify] Fetched ${data.orders.length} orders`);
      return data.orders;
    } catch (error: any) {
      console.error("[Shopify] Failed to fetch orders:", error.message);
      throw error;
    }
  }

  async fetchProducts(limit = 50): Promise<ShopifyProduct[]> {
    try {
      const data = await this.request<{ products: ShopifyProduct[] }>(`/products.json?limit=${limit}`);
      console.log(`[Shopify] Fetched ${data.products.length} products`);
      return data.products;
    } catch (error: any) {
      console.error("[Shopify] Failed to fetch products:", error.message);
      throw error;
    }
  }

  async fetchInventoryLevels(locationId?: string): Promise<ShopifyInventoryLevel[]> {
    try {
      let endpoint = "/inventory_levels.json?limit=50";
      if (locationId) {
        endpoint += `&location_ids=${locationId}`;
      }
      
      const data = await this.request<{ inventory_levels: ShopifyInventoryLevel[] }>(endpoint);
      console.log(`[Shopify] Fetched ${data.inventory_levels.length} inventory levels`);
      return data.inventory_levels;
    } catch (error: any) {
      console.error("[Shopify] Failed to fetch inventory:", error.message);
      throw error;
    }
  }

  async syncOrdersAsDemandSignals(): Promise<{ synced: number; errors: number }> {
    let synced = 0;
    let errors = 0;

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const orders = await this.fetchOrders(100, thirtyDaysAgo.toISOString());

      for (const order of orders) {
        for (const item of order.line_items) {
          try {
            await db.insert(demandSignals).values({
              companyId: this.companyId,
              signalType: "order",
              signalDate: new Date(order.created_at),
              quantity: item.quantity,
              unit: "units",
              channel: "ecommerce",
              customer: order.customer?.email || undefined,
              confidence: 100,
              priority: "medium",
              attributes: {
                source: "shopify",
                orderId: order.id,
                orderName: order.name,
                lineItemId: item.id,
                productId: item.product_id,
                variantId: item.variant_id,
                productTitle: item.title,
                sku: item.sku,
                unitPrice: parseFloat(item.price),
                currency: order.currency,
                customerId: order.customer?.id,
              },
              isProcessed: false,
            }).onConflictDoNothing();
            synced++;
          } catch (err: any) {
            console.error(`[Shopify] Error syncing order item ${item.id}:`, err.message);
            errors++;
          }
        }
      }

      console.log(`[Shopify] Synced ${synced} demand signals from orders, ${errors} errors`);
    } catch (error: any) {
      console.error("[Shopify] Order sync failed:", error.message);
      throw error;
    }

    return { synced, errors };
  }

  async syncProducts(): Promise<{ synced: number; errors: number }> {
    let synced = 0;
    let errors = 0;

    try {
      const products = await this.fetchProducts(250);

      for (const product of products) {
        for (const variant of product.variants) {
          try {
            const productCode = variant.sku || `SHOP-${variant.id}`;
            const existingMaterial = await db
              .select()
              .from(materials)
              .where(eq(materials.code, productCode))
              .limit(1);

            if (existingMaterial.length === 0) {
              await db.insert(materials).values({
                companyId: this.companyId,
                code: productCode,
                name: `${product.title}${variant.sku ? ` - ${variant.sku}` : ""}`,
                unit: "units",
                onHand: variant.inventory_quantity || 0,
                inbound: 0,
              }).onConflictDoNothing();
              synced++;
            }
          } catch (err: any) {
            console.error(`[Shopify] Error syncing product ${product.id}:`, err.message);
            errors++;
          }
        }
      }

      console.log(`[Shopify] Synced ${synced} products as materials, ${errors} errors`);
    } catch (error: any) {
      console.error("[Shopify] Product sync failed:", error.message);
      throw error;
    }

    return { synced, errors };
  }
}

export async function getShopifyIntegration(companyId: string): Promise<ShopifyIntegration | null> {
  try {
    const credentials = await CredentialService.getDecryptedCredentials(companyId, 'shopify');
    if (credentials?.accessToken && credentials?.shopDomain) {
      console.log(`[Shopify] Using centralized credential storage for company ${companyId}`);
      return new ShopifyIntegration({
        shopDomain: credentials.shopDomain,
        accessToken: credentials.accessToken,
        companyId,
      });
    }
  } catch (error) {
    console.log(`[Shopify] Centralized credentials not available, falling back to company config`);
  }
  
  try {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!company?.shopifyDomain || !company?.shopifyApiKey) {
      return null;
    }

    return new ShopifyIntegration({
      shopDomain: company.shopifyDomain,
      accessToken: company.shopifyApiKey,
      companyId,
    });
  } catch (error) {
    console.error("[Shopify] Failed to get integration:", error);
    return null;
  }
}

export async function runShopifySync(companyId: string): Promise<{
  success: boolean;
  orders?: { synced: number; errors: number };
  products?: { synced: number; errors: number };
  error?: string;
}> {
  const integration = await getShopifyIntegration(companyId);
  if (!integration) {
    return { success: false, error: "Shopify integration not configured" };
  }

  const connectionTest = await integration.testConnection();
  if (!connectionTest.success) {
    return { success: false, error: connectionTest.error };
  }

  try {
    const orders = await integration.syncOrdersAsDemandSignals();
    const products = await integration.syncProducts();
    
    return {
      success: true,
      orders,
      products,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
