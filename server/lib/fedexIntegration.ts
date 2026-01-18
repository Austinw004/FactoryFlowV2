import axios from "axios";
import { storage } from "../storage";
import { CredentialService } from "./credentialService";

export interface FedExRate {
  serviceType: string;
  serviceName: string;
  totalNetCharge: number;
  currency: string;
  transitTime: string;
  deliveryDate: string;
}

export interface FedExTracking {
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

export class FedExIntegration {
  private apiKey: string;
  private secretKey: string;
  private accountNumber: string;
  private companyId: string;
  private baseUrl = "https://apis.fedex.com";
  private accessToken: string = "";

  constructor(apiKey: string, secretKey: string, accountNumber: string, companyId: string) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.accountNumber = accountNumber;
    this.companyId = companyId;
  }

  private async authenticate(): Promise<void> {
    const response = await axios.post(`${this.baseUrl}/oauth/token`, 
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.apiKey,
        client_secret: this.secretKey
      }), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
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
        "X-locale": "en_US"
      },
      data,
      timeout: 30000
    });
    
    return response.data;
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      await this.authenticate();
      console.log(`[FedEx] Connection test successful for company ${this.companyId}`);
      return { success: true, message: "FedEx connection verified" };
    } catch (error: any) {
      console.error(`[FedEx] Connection test failed:`, error.message);
      return { success: false, message: error.response?.data?.errors?.[0]?.message || error.message };
    }
  }

  async getRates(origin: any, destination: any, weight: number): Promise<FedExRate[]> {
    try {
      const result = await this.request<any>("/rate/v1/rates/quotes", "POST", {
        accountNumber: { value: this.accountNumber },
        requestedShipment: {
          shipper: { address: origin },
          recipient: { address: destination },
          requestedPackageLineItems: [{
            weight: { units: "LB", value: weight }
          }]
        }
      });

      const rates = result.output?.rateReplyDetails?.map((detail: any) => ({
        serviceType: detail.serviceType,
        serviceName: detail.serviceName,
        totalNetCharge: detail.ratedShipmentDetails?.[0]?.totalNetCharge || 0,
        currency: "USD",
        transitTime: detail.commit?.transitDays || "Unknown",
        deliveryDate: detail.commit?.dateDetail?.dayOfWeek || ""
      })) || [];

      console.log(`[FedEx] Got ${rates.length} rate quotes`);
      return rates;
    } catch (error: any) {
      console.error("[FedEx] Failed to get rates:", error.message);
      throw error;
    }
  }

  async trackShipment(trackingNumber: string): Promise<FedExTracking | null> {
    try {
      const result = await this.request<any>("/track/v1/trackingnumbers", "POST", {
        trackingInfo: [{ trackingNumberInfo: { trackingNumber } }],
        includeDetailedScans: true
      });

      const track = result.output?.completeTrackResults?.[0]?.trackResults?.[0];
      if (!track) return null;

      return {
        trackingNumber,
        status: track.latestStatusDetail?.code || "Unknown",
        statusDescription: track.latestStatusDetail?.description || "",
        estimatedDelivery: track.dateAndTimes?.find((d: any) => d.type === "ESTIMATED_DELIVERY")?.dateTime || "",
        events: track.scanEvents?.map((e: any) => ({
          timestamp: e.date,
          description: e.eventDescription,
          location: `${e.scanLocation?.city}, ${e.scanLocation?.stateOrProvinceCode}`
        })) || []
      };
    } catch (error: any) {
      console.error("[FedEx] Failed to track shipment:", error.message);
      throw error;
    }
  }
}

export async function getFedExIntegration(companyId: string): Promise<FedExIntegration | null> {
  try {
    const credentials = await CredentialService.getDecryptedCredentials(companyId, 'fedex');
    if (credentials?.apiKey && credentials?.clientSecret && credentials?.accountNumber) {
      console.log(`[FedEx] Using centralized credential storage for company ${companyId}`);
      return new FedExIntegration(credentials.apiKey, credentials.clientSecret, credentials.accountNumber, companyId);
    }
  } catch (error) {
    console.log(`[FedEx] Credentials not available for company ${companyId}`);
  }
  return null;
}
