import axios from "axios";
import { storage } from "../storage";
import { CredentialService } from "./credentialService";

export interface WooCommerceOrder {
  id: number;
  status: string;
  total: string;
  currency: string;
  date_created: string;
  customer_id: number;
  line_items: Array<{
    id: number;
    name: string;
    product_id: number;
    quantity: number;
    total: string;
  }>;
}

export interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  sku: string;
  price: string;
  regular_price: string;
  stock_quantity: number | null;
  stock_status: string;
  categories: Array<{ id: number; name: string }>;
}

export class WooCommerceIntegration {
  private storeUrl: string;
  private consumerKey: string;
  private consumerSecret: string;
  private companyId: string;

  constructor(storeUrl: string, consumerKey: string, consumerSecret: string, companyId: string) {
    this.storeUrl = storeUrl.replace(/\/$/, "");
    this.consumerKey = consumerKey;
    this.consumerSecret = consumerSecret;
    this.companyId = companyId;
  }

  private async request<T>(endpoint: string, method: string = "GET", params: any = {}): Promise<T> {
    const url = `${this.storeUrl}/wp-json/wc/v3${endpoint}`;
    
    const response = await axios({
      method,
      url,
      auth: {
        username: this.consumerKey,
        password: this.consumerSecret
      },
      params,
      timeout: 30000
    });
    
    return response.data;
  }

  async testConnection(): Promise<{ success: boolean; message?: string; store?: string }> {
    try {
      const store = await this.request<{ name: string }>("/");
      console.log(`[WooCommerce] Connection test successful for ${this.storeUrl}`);
      return { success: true, message: "WooCommerce connection verified", store: store.name };
    } catch (error: any) {
      console.error(`[WooCommerce] Connection test failed:`, error.message);
      return { success: false, message: error.response?.data?.message || error.message };
    }
  }

  async fetchOrders(status: string = "any", perPage: number = 100): Promise<WooCommerceOrder[]> {
    try {
      const orders = await this.request<WooCommerceOrder[]>("/orders", "GET", {
        status,
        per_page: perPage,
        orderby: "date",
        order: "desc"
      });
      console.log(`[WooCommerce] Fetched ${orders.length} orders`);
      return orders;
    } catch (error: any) {
      console.error("[WooCommerce] Failed to fetch orders:", error.message);
      throw error;
    }
  }

  async fetchProducts(perPage: number = 100): Promise<WooCommerceProduct[]> {
    try {
      const products = await this.request<WooCommerceProduct[]>("/products", "GET", {
        per_page: perPage
      });
      console.log(`[WooCommerce] Fetched ${products.length} products`);
      return products;
    } catch (error: any) {
      console.error("[WooCommerce] Failed to fetch products:", error.message);
      throw error;
    }
  }

  async syncOrdersAsDemandSignals(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const orders = await this.fetchOrders("processing,completed", 200);
      
      for (const order of orders) {
        try {
          const skus = order.line_items.map(item => item.name);
          
          await storage.createDemandSignal({
            companyId: this.companyId,
            signalType: "order",
            signalDate: new Date(order.date_created),
            quantity: order.line_items.reduce((sum, item) => sum + item.quantity, 0),
            unit: order.currency,
            channel: "woocommerce",
            customer: `Customer ${order.customer_id}`,
            confidence: order.status === "completed" ? 100 : 80,
            priority: "medium",
            attributes: {
              source: "woocommerce",
              orderId: order.id,
              orderStatus: order.status,
              total: order.total,
              lineItems: order.line_items.map(item => item.name)
            }
          });
          synced++;
        } catch (err: any) {
          errors.push(`Order ${order.id}: ${err.message}`);
        }
      }

      console.log(`[WooCommerce] Created ${synced} demand signals for company ${this.companyId}`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[WooCommerce] Demand signal sync failed:", error.message);
      throw error;
    }
  }

  async syncProductsAsMaterials(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const products = await this.fetchProducts(200);
      
      for (const product of products) {
        try {
          const materials = await storage.getMaterials(this.companyId);
          const existing = materials.find(m => m.code === (product.sku || `WOO-${product.id}`));
          
          if (!existing) {
            await storage.createMaterial({
              companyId: this.companyId,
              name: product.name,
              code: product.sku || `WOO-${product.id}`,
              unit: "units",
              onHand: product.stock_quantity || 0
            });
            synced++;
          }
        } catch (err: any) {
          errors.push(`Product ${product.name}: ${err.message}`);
        }
      }

      console.log(`[WooCommerce] Synced ${synced} products as materials`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[WooCommerce] Product sync failed:", error.message);
      throw error;
    }
  }
}

export async function getWooCommerceIntegration(companyId: string): Promise<WooCommerceIntegration | null> {
  try {
    const credentials = await CredentialService.getDecryptedCredentials(companyId, 'woocommerce');
    if (credentials?.storeUrl && credentials?.consumerKey && credentials?.consumerSecret) {
      console.log(`[WooCommerce] Using centralized credential storage for company ${companyId}`);
      return new WooCommerceIntegration(
        credentials.storeUrl,
        credentials.consumerKey,
        credentials.consumerSecret,
        companyId
      );
    }
  } catch (error) {
    console.log(`[WooCommerce] Credentials not available for company ${companyId}`);
  }
  return null;
}

export async function syncWooCommerceData(companyId: string): Promise<{
  success: boolean;
  orders?: number;
  products?: number;
  demandSignals?: number;
  materials?: number;
  error?: string;
}> {
  const integration = await getWooCommerceIntegration(companyId);
  if (!integration) {
    return { success: false, error: 'WooCommerce not configured' };
  }

  try {
    const connectionTest = await integration.testConnection();
    if (!connectionTest.success) {
      return { success: false, error: connectionTest.message };
    }

    const orders = await integration.fetchOrders('any', 100);
    const products = await integration.fetchProducts(100);
    const demandResult = await integration.syncOrdersAsDemandSignals();
    const materialsResult = await integration.syncProductsAsMaterials();

    console.log(`[WooCommerce] Full sync complete: ${orders.length} orders, ${products.length} products`);
    return {
      success: true,
      orders: orders.length,
      products: products.length,
      demandSignals: demandResult.synced,
      materials: materialsResult.synced
    };
  } catch (error: any) {
    console.error('[WooCommerce] Sync failed:', error.message);
    return { success: false, error: error.message };
  }
}
