import axios from "axios";
import { storage } from "../storage";
import { CredentialService } from "./credentialService";

export interface DHLRate {
  productCode: string;
  productName: string;
  totalPrice: number;
  currency: string;
  deliveryTime: string;
  deliveryDate: string;
}

export interface DHLTracking {
  trackingNumber: string;
  status: string;
  statusDescription: string;
  estimatedDelivery: string;
  events: Array<{
    timestamp: string;
    description: string;
    location: string;
  }>;
}

export interface DHLShipment {
  shipmentId: string;
  trackingNumber: string;
  status: string;
  origin: { city: string; country: string };
  destination: { city: string; country: string };
  createdAt: string;
}

export class DHLIntegration {
  private apiKey: string;
  private apiSecret: string;
  private accountNumber: string;
  private companyId: string;
  private baseUrl = "https://express.api.dhl.com";
  private accessToken: string = "";

  constructor(apiKey: string, apiSecret: string, accountNumber: string, companyId: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.accountNumber = accountNumber;
    this.companyId = companyId;
  }

  private async authenticate(): Promise<void> {
    const auth = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString("base64");
    const response = await axios.post(
      `${this.baseUrl}/oauth/token`,
      new URLSearchParams({ grant_type: "client_credentials" }),
      {
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        timeout: 10000
      }
    );
    this.accessToken = response.data.access_token;
  }

  private async request<T>(endpoint: string, method: string = "GET", data?: any): Promise<T> {
    if (!this.accessToken) {
      await this.authenticate();
    }

    const response = await axios({
      method,
      url: `${this.baseUrl}${endpoint}`,
      headers: {
        "Authorization": `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        "DHL-API-Key": this.apiKey
      },
      data,
      timeout: 30000
    });

    return response.data;
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      await this.authenticate();
      console.log(`[DHL] Connection test successful for company ${this.companyId}`);
      return { success: true, message: "DHL connection verified" };
    } catch (error: any) {
      console.error(`[DHL] Connection test failed:`, error.message);
      return { success: false, message: error.response?.data?.message || error.message };
    }
  }

  async getRates(origin: any, destination: any, weight: number): Promise<DHLRate[]> {
    try {
      const result = await this.request<any>("/rates", "POST", {
        customerDetails: { shipperDetails: origin, receiverDetails: destination },
        accounts: [{ typeCode: "shipper", number: this.accountNumber }],
        plannedShippingDateAndTime: new Date().toISOString(),
        packages: [{ weight: weight, dimensions: { length: 30, width: 20, height: 10 } }]
      });

      const rates = result.products?.map((product: any) => ({
        productCode: product.productCode,
        productName: product.productName,
        totalPrice: product.totalPrice?.[0]?.price || 0,
        currency: product.totalPrice?.[0]?.currency || "USD",
        deliveryTime: product.deliveryCapabilities?.estimatedDeliveryTime || "Unknown",
        deliveryDate: product.deliveryCapabilities?.estimatedDeliveryDate || ""
      })) || [];

      console.log(`[DHL] Got ${rates.length} rate quotes`);
      return rates;
    } catch (error: any) {
      console.error("[DHL] Failed to get rates:", error.message);
      throw error;
    }
  }

  async trackShipment(trackingNumber: string): Promise<DHLTracking | null> {
    try {
      const result = await this.request<any>(`/track/shipments?trackingNumber=${trackingNumber}`, "GET");
      const shipment = result.shipments?.[0];
      if (!shipment) return null;

      return {
        trackingNumber,
        status: shipment.status?.statusCode || "Unknown",
        statusDescription: shipment.status?.description || "",
        estimatedDelivery: shipment.estimatedTimeOfDelivery || "",
        events: shipment.events?.map((e: any) => ({
          timestamp: e.timestamp,
          description: e.description,
          location: `${e.location?.address?.addressLocality}, ${e.location?.address?.countryCode}`
        })) || []
      };
    } catch (error: any) {
      console.error("[DHL] Failed to track shipment:", error.message);
      throw error;
    }
  }

  async syncShipmentTrackingAsDemandSignals(trackingNumbers: string[]): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      for (const trackingNumber of trackingNumbers) {
        try {
          const tracking = await this.trackShipment(trackingNumber);
          if (!tracking) continue;

          await storage.createDemandSignal({
            companyId: this.companyId,
            signalType: "shipment_tracking",
            signalDate: new Date(),
            quantity: 1,
            unit: "shipment",
            channel: "dhl",
            confidence: tracking.status === "delivered" ? 100 : tracking.status === "in-transit" ? 70 : 50,
            priority: tracking.status === "exception" ? "high" : "medium",
            attributes: {
              source: "dhl",
              trackingNumber,
              status: tracking.status,
              statusDescription: tracking.statusDescription,
              estimatedDelivery: tracking.estimatedDelivery,
              eventCount: tracking.events.length
            }
          });
          synced++;
        } catch (err: any) {
          errors.push(`Tracking ${trackingNumber}: ${err.message}`);
        }
      }

      console.log(`[DHL] Synced ${synced} shipment tracking records`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[DHL] Tracking sync failed:", error.message);
      throw error;
    }
  }

  async syncRateQuotesAsDemandSignals(origin: any, destination: any, weight: number): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const rates = await this.getRates(origin, destination, weight);

      for (const rate of rates) {
        try {
          await storage.createDemandSignal({
            companyId: this.companyId,
            signalType: "shipping_rate",
            signalDate: new Date(),
            quantity: rate.totalPrice,
            unit: rate.currency,
            channel: "dhl",
            confidence: 85,
            priority: "low",
            attributes: {
              source: "dhl",
              productCode: rate.productCode,
              productName: rate.productName,
              deliveryTime: rate.deliveryTime,
              deliveryDate: rate.deliveryDate
            }
          });
          synced++;
        } catch (err: any) {
          errors.push(`Rate ${rate.productCode}: ${err.message}`);
        }
      }

      console.log(`[DHL] Synced ${synced} rate quotes`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[DHL] Rate sync failed:", error.message);
      throw error;
    }
  }
}

export async function getDHLIntegration(companyId: string): Promise<DHLIntegration | null> {
  try {
    const credentials = await CredentialService.getDecryptedCredentials(companyId, 'dhl');
    if (credentials?.apiKey && credentials?.clientSecret && credentials?.accountNumber) {
      console.log(`[DHL] Using centralized credential storage for company ${companyId}`);
      return new DHLIntegration(credentials.apiKey, credentials.clientSecret, credentials.accountNumber, companyId);
    }
  } catch (error) {
    console.log(`[DHL] Credentials not available for company ${companyId}`);
  }
  return null;
}
