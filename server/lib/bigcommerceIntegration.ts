import axios from "axios";
import { storage } from "../storage";
import { CredentialService } from "./credentialService";

export interface BigCommerceOrder {
  id: number;
  status: string;
  statusId: number;
  total: string;
  currency: string;
  dateCreated: string;
  customerId: number;
  billingAddress: { email: string; firstName: string; lastName: string };
}

export interface BigCommerceProduct {
  id: number;
  name: string;
  sku: string;
  price: string;
  inventoryLevel: number;
  inventoryTracking: string;
  categories: number[];
}

export class BigCommerceIntegration {
  private storeHash: string;
  private accessToken: string;
  private companyId: string;
  private baseUrl: string;

  constructor(storeHash: string, accessToken: string, companyId: string) {
    this.storeHash = storeHash;
    this.accessToken = accessToken;
    this.companyId = companyId;
    this.baseUrl = `https://api.bigcommerce.com/stores/${storeHash}/v3`;
  }

  private async request<T>(endpoint: string, method: string = "GET", data?: any): Promise<T> {
    const response = await axios({
      method,
      url: `${this.baseUrl}${endpoint}`,
      headers: {
        "X-Auth-Token": this.accessToken,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      data,
      timeout: 30000
    });
    
    return response.data.data || response.data;
  }

  async testConnection(): Promise<{ success: boolean; message?: string; store?: string }> {
    try {
      const store = await this.request<{ name: string }>("/store");
      console.log(`[BigCommerce] Connection test successful: ${store.name}`);
      return { success: true, message: "BigCommerce connection verified", store: store.name };
    } catch (error: any) {
      console.error(`[BigCommerce] Connection test failed:`, error.message);
      return { success: false, message: error.response?.data?.title || error.message };
    }
  }

  async fetchOrders(limit: number = 100): Promise<BigCommerceOrder[]> {
    try {
      const orders = await this.request<any[]>(`/orders?limit=${limit}&sort=date_created:desc`);
      console.log(`[BigCommerce] Fetched ${orders.length} orders`);
      return orders.map(o => ({
        id: o.id,
        status: o.status,
        statusId: o.status_id,
        total: o.total_inc_tax,
        currency: o.currency_code,
        dateCreated: o.date_created,
        customerId: o.customer_id,
        billingAddress: {
          email: o.billing_address?.email || "",
          firstName: o.billing_address?.first_name || "",
          lastName: o.billing_address?.last_name || ""
        }
      }));
    } catch (error: any) {
      console.error("[BigCommerce] Failed to fetch orders:", error.message);
      throw error;
    }
  }

  async fetchProducts(limit: number = 100): Promise<BigCommerceProduct[]> {
    try {
      const products = await this.request<any[]>(`/catalog/products?limit=${limit}&include=variants`);
      console.log(`[BigCommerce] Fetched ${products.length} products`);
      return products.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku || `BC-${p.id}`,
        price: p.price,
        inventoryLevel: p.inventory_level || 0,
        inventoryTracking: p.inventory_tracking,
        categories: p.categories || []
      }));
    } catch (error: any) {
      console.error("[BigCommerce] Failed to fetch products:", error.message);
      throw error;
    }
  }

  async syncOrdersAsDemandSignals(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const orders = await this.fetchOrders(200);
      
      for (const order of orders) {
        try {
          await storage.createDemandSignal({
            companyId: this.companyId,
            signalType: "order",
            signalDate: new Date(order.dateCreated),
            quantity: 1,
            unit: order.currency,
            channel: "bigcommerce",
            customer: `${order.billingAddress.firstName} ${order.billingAddress.lastName}`.trim() || order.billingAddress.email,
            confidence: order.statusId >= 10 ? 100 : 80,
            priority: "medium",
            attributes: {
              source: "bigcommerce",
              orderId: order.id,
              orderStatus: order.status,
              total: order.total,
              customerEmail: order.billingAddress.email
            }
          });
          synced++;
        } catch (err: any) {
          errors.push(`Order ${order.id}: ${err.message}`);
        }
      }

      console.log(`[BigCommerce] Created ${synced} demand signals`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[BigCommerce] Demand signal sync failed:", error.message);
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
          const existing = materials.find(m => m.code === product.sku);
          
          if (!existing) {
            await storage.createMaterial({
              companyId: this.companyId,
              name: product.name,
              code: product.sku,
              unit: "units",
              onHand: product.inventoryLevel
            });
            synced++;
          }
        } catch (err: any) {
          errors.push(`Product ${product.name}: ${err.message}`);
        }
      }

      console.log(`[BigCommerce] Synced ${synced} products as materials`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[BigCommerce] Product sync failed:", error.message);
      throw error;
    }
  }
}

export async function getBigCommerceIntegration(companyId: string): Promise<BigCommerceIntegration | null> {
  try {
    const credentials = await CredentialService.getDecryptedCredentials(companyId, 'bigcommerce');
    if (credentials?.storeHash && credentials?.accessToken) {
      console.log(`[BigCommerce] Using centralized credential storage for company ${companyId}`);
      return new BigCommerceIntegration(
        credentials.storeHash,
        credentials.accessToken,
        companyId
      );
    }
  } catch (error) {
    console.log(`[BigCommerce] Credentials not available for company ${companyId}`);
  }
  return null;
}

export async function syncBigCommerceData(companyId: string): Promise<{
  success: boolean;
  orders?: number;
  products?: number;
  demandSignals?: number;
  materials?: number;
  error?: string;
}> {
  const integration = await getBigCommerceIntegration(companyId);
  if (!integration) {
    return { success: false, error: 'BigCommerce not configured' };
  }

  try {
    const connectionTest = await integration.testConnection();
    if (!connectionTest.success) {
      return { success: false, error: connectionTest.message };
    }

    const orders = await integration.fetchOrders(100);
    const products = await integration.fetchProducts(100);
    const demandResult = await integration.syncOrdersAsDemandSignals();
    const materialsResult = await integration.syncProductsAsMaterials();

    console.log(`[BigCommerce] Full sync complete: ${orders.length} orders, ${products.length} products`);
    return {
      success: true,
      orders: orders.length,
      products: products.length,
      demandSignals: demandResult.synced,
      materials: materialsResult.synced
    };
  } catch (error: any) {
    console.error('[BigCommerce] Sync failed:', error.message);
    return { success: false, error: error.message };
  }
}
