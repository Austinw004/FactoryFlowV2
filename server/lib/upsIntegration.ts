import axios from "axios";
import { storage } from "../storage";
import { CredentialService } from "./credentialService";

export interface UPSRate {
  serviceCode: string;
  serviceName: string;
  totalCharges: number;
  currency: string;
  transitDays: number;
  guaranteedDelivery: boolean;
}

export interface UPSTracking {
  trackingNumber: string;
  status: string;
  statusDescription: string;
  scheduledDelivery: string;
  events: Array<{
    timestamp: string;
    description: string;
    location: string;
  }>;
}

export class UPSIntegration {
  private clientId: string;
  private clientSecret: string;
  private accountNumber: string;
  private companyId: string;
  private baseUrl = "https://onlinetools.ups.com/api";
  private accessToken: string = "";

  constructor(clientId: string, clientSecret: string, accountNumber: string, companyId: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.accountNumber = accountNumber;
    this.companyId = companyId;
  }

  private async authenticate(): Promise<void> {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    const response = await axios.post(`${this.baseUrl}/security/v1/oauth/token`,
      new URLSearchParams({ grant_type: "client_credentials" }), {
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        timeout: 10000
      });
    this.accessToken = response.data.access_token;
  }

  private async request<T>(endpoint: string, method: string = "POST", data?: any): Promise<T> {
    if (!this.accessToken) {
      await this.authenticate();
    }

    const response = await axios({
      method,
      url: `${this.baseUrl}${endpoint}`,
      headers: {
        "Authorization": `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        "transId": `tx-${Date.now()}`,
        "transactionSrc": "prescient-labs"
      },
      data,
      timeout: 30000
    });
    
    return response.data;
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      await this.authenticate();
      console.log(`[UPS] Connection test successful for company ${this.companyId}`);
      return { success: true, message: "UPS connection verified" };
    } catch (error: any) {
      console.error(`[UPS] Connection test failed:`, error.message);
      return { success: false, message: error.response?.data?.response?.errors?.[0]?.message || error.message };
    }
  }

  async getRates(origin: any, destination: any, weight: number): Promise<UPSRate[]> {
    try {
      const result = await this.request<any>("/rating/v1/Rate", "POST", {
        RateRequest: {
          Request: { RequestOption: "Shop" },
          Shipment: {
            Shipper: {
              Address: origin,
              ShipperNumber: this.accountNumber
            },
            ShipTo: { Address: destination },
            Package: {
              PackagingType: { Code: "02" },
              PackageWeight: { UnitOfMeasurement: { Code: "LBS" }, Weight: String(weight) }
            }
          }
        }
      });

      const rates = result.RateResponse?.RatedShipment?.map((shipment: any) => ({
        serviceCode: shipment.Service?.Code || "",
        serviceName: getUPSServiceName(shipment.Service?.Code),
        totalCharges: parseFloat(shipment.TotalCharges?.MonetaryValue || "0"),
        currency: shipment.TotalCharges?.CurrencyCode || "USD",
        transitDays: parseInt(shipment.GuaranteedDelivery?.BusinessDaysInTransit || "5"),
        guaranteedDelivery: !!shipment.GuaranteedDelivery
      })) || [];

      console.log(`[UPS] Got ${rates.length} rate quotes`);
      return rates;
    } catch (error: any) {
      console.error("[UPS] Failed to get rates:", error.message);
      throw error;
    }
  }

  async trackShipment(trackingNumber: string): Promise<UPSTracking | null> {
    try {
      const result = await this.request<any>(`/track/v1/details/${trackingNumber}`, "GET");
      const pkg = result.trackResponse?.shipment?.[0]?.package?.[0];
      if (!pkg) return null;

      return {
        trackingNumber,
        status: pkg.currentStatus?.code || "Unknown",
        statusDescription: pkg.currentStatus?.description || "",
        scheduledDelivery: pkg.deliveryDate?.[0]?.date || "",
        events: pkg.activity?.map((a: any) => ({
          timestamp: `${a.date} ${a.time}`,
          description: a.status?.description || "",
          location: `${a.location?.address?.city}, ${a.location?.address?.stateProvince}`
        })) || []
      };
    } catch (error: any) {
      console.error("[UPS] Failed to track shipment:", error.message);
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
            channel: "ups",
            confidence: tracking.status === "D" ? 100 : tracking.status === "I" ? 70 : 50,
            priority: tracking.status === "X" || tracking.status === "RS" ? "high" : "medium",
            attributes: {
              source: "ups",
              trackingNumber,
              status: tracking.status,
              statusDescription: tracking.statusDescription,
              scheduledDelivery: tracking.scheduledDelivery,
              eventCount: tracking.events.length
            }
          });
          synced++;
        } catch (err: any) {
          errors.push(`Tracking ${trackingNumber}: ${err.message}`);
        }
      }

      console.log(`[UPS] Synced ${synced} shipment tracking records`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[UPS] Tracking sync failed:", error.message);
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
            quantity: rate.totalCharges,
            unit: rate.currency,
            channel: "ups",
            confidence: 85,
            priority: "low",
            attributes: {
              source: "ups",
              serviceCode: rate.serviceCode,
              serviceName: rate.serviceName,
              transitDays: rate.transitDays,
              guaranteedDelivery: rate.guaranteedDelivery
            }
          });
          synced++;
        } catch (err: any) {
          errors.push(`Rate ${rate.serviceCode}: ${err.message}`);
        }
      }

      console.log(`[UPS] Synced ${synced} rate quotes`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[UPS] Rate sync failed:", error.message);
      throw error;
    }
  }
}

function getUPSServiceName(code: string): string {
  const services: Record<string, string> = {
    "01": "UPS Next Day Air",
    "02": "UPS 2nd Day Air",
    "03": "UPS Ground",
    "12": "UPS 3 Day Select",
    "13": "UPS Next Day Air Saver",
    "14": "UPS Next Day Air Early",
    "59": "UPS 2nd Day Air A.M."
  };
  return services[code] || `UPS Service ${code}`;
}

export async function getUPSIntegration(companyId: string): Promise<UPSIntegration | null> {
  try {
    const credentials = await CredentialService.getDecryptedCredentials(companyId, 'ups');
    if (credentials?.clientId && credentials?.clientSecret && credentials?.accountNumber) {
      console.log(`[UPS] Using centralized credential storage for company ${companyId}`);
      return new UPSIntegration(credentials.clientId, credentials.clientSecret, credentials.accountNumber, companyId);
    }
  } catch (error) {
    console.log(`[UPS] Credentials not available for company ${companyId}`);
  }
  return null;
}
