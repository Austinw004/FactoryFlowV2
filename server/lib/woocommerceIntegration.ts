import axios from "axios";
import { storage } from "../storage";

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
            source: "woocommerce",
            signalType: "order",
            rawData: order,
            confidence: order.status === "completed" ? 100 : 80,
            impactedSkus: skus,
            forecastAdjustment: parseFloat(order.total) / 100,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
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
          const existing = materials.find(m => m.externalId === String(product.id));
          
          if (!existing) {
            await storage.createMaterial({
              companyId: this.companyId,
              name: product.name,
              sku: product.sku || `WOO-${product.id}`,
              category: product.categories[0]?.name || "WooCommerce Product",
              unit: "units",
              currentStock: product.stock_quantity || 0,
              reorderPoint: 10,
              leadTimeDays: 7,
              unitCost: parseFloat(product.price) || 0,
              externalId: String(product.id),
              externalSource: "woocommerce"
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
  const company = await storage.getCompany(companyId);
  if (!company?.woocommerceStoreUrl || !company?.woocommerceConsumerKey || !company?.woocommerceConsumerSecret) {
    return null;
  }
  return new WooCommerceIntegration(
    company.woocommerceStoreUrl,
    company.woocommerceConsumerKey,
    company.woocommerceConsumerSecret,
    companyId
  );
}
