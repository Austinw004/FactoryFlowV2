import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

export interface IntegrationCredentials {
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  apiSecret?: string;
  accountId?: string;
  instanceUrl?: string;
  tokenExpiry?: Date;
  additionalData?: Record<string, any>;
}

export interface IntegrationTestResult {
  success: boolean;
  message?: string;
  user?: string;
  account?: string;
  store?: string;
  org?: string;
}

export interface IntegrationSyncResult {
  synced: number;
  updated?: number;
  errors: string[];
}

export abstract class BaseIntegration {
  protected companyId: string;
  protected credentials: IntegrationCredentials;
  protected client: AxiosInstance;
  protected integrationName: string;
  protected rateLimitMs: number = 100;
  protected lastRequestTime: number = 0;

  constructor(companyId: string, credentials: IntegrationCredentials, integrationName: string) {
    this.companyId = companyId;
    this.credentials = credentials;
    this.integrationName = integrationName;
    this.client = axios.create({ timeout: 30000 });
  }

  protected async rateLimitedRequest<T>(config: AxiosRequestConfig): Promise<T> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitMs) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitMs - timeSinceLastRequest));
    }
    
    this.lastRequestTime = Date.now();
    
    try {
      const response = await this.client.request<T>(config);
      return response.data;
    } catch (error: any) {
      this.handleError(error);
      throw error;
    }
  }

  protected async requestWithRetry<T>(
    config: AxiosRequestConfig, 
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.rateLimitedRequest<T>(config);
      } catch (error: any) {
        lastError = error;
        
        if (error.response?.status === 429 || error.response?.status >= 500) {
          const delay = backoffMs * Math.pow(2, attempt - 1);
          console.log(`[${this.integrationName}] Retry ${attempt}/${maxRetries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
    
    throw lastError;
  }

  protected handleError(error: any): void {
    const status = error.response?.status;
    const message = error.response?.data?.message || 
                    error.response?.data?.error?.message ||
                    error.response?.data?.errors?.[0]?.message ||
                    error.message;
    
    console.error(`[${this.integrationName}] Error ${status || "unknown"}: ${message}`);
    
    if (status === 401) {
      console.error(`[${this.integrationName}] Authentication failed - token may be expired`);
    }
  }

  protected log(message: string): void {
    console.log(`[${this.integrationName}] ${message}`);
  }

  protected async isTokenExpired(): Promise<boolean> {
    if (!this.credentials.tokenExpiry) return false;
    const bufferMs = 5 * 60 * 1000;
    return new Date().getTime() > this.credentials.tokenExpiry.getTime() - bufferMs;
  }

  async refreshTokenIfNeeded(): Promise<boolean> {
    if (!this.credentials.refreshToken) return true;
    if (!await this.isTokenExpired()) return true;
    
    try {
      return await this.refreshToken();
    } catch (error) {
      console.error(`[${this.integrationName}] Token refresh failed:`, error);
      return false;
    }
  }

  protected async refreshToken(): Promise<boolean> {
    return true;
  }

  abstract testConnection(): Promise<IntegrationTestResult>;
}

export class IntegrationFactory {
  private static getEncryptionKey(): string {
    const key = process.env.INTEGRATION_ENCRYPTION_KEY;
    if (!key) {
      throw new Error("INTEGRATION_ENCRYPTION_KEY environment variable is required for credential encryption");
    }
    return key;
  }

  static encryptCredential(value: string): string {
    const crypto = require("crypto");
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key.padEnd(32).slice(0, 32)), iv);
    let encrypted = cipher.update(value, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
  }

  static decryptCredential(encrypted: string): string {
    try {
      const crypto = require("crypto");
      const key = this.getEncryptionKey();
      const [ivHex, encryptedHex] = encrypted.split(":");
      if (!ivHex || !encryptedHex) return encrypted;
      
      const iv = Buffer.from(ivHex, "hex");
      const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key.padEnd(32).slice(0, 32)), iv);
      let decrypted = decipher.update(encryptedHex, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch {
      console.error("[IntegrationFactory] Credential decryption failed - check INTEGRATION_ENCRYPTION_KEY");
      throw new Error("Credential decryption failed");
    }
  }

  static isEncryptionConfigured(): boolean {
    return !!process.env.INTEGRATION_ENCRYPTION_KEY;
  }
}

export function createIntegrationLogger(integrationName: string) {
  return {
    info: (message: string, data?: any) => {
      console.log(`[${integrationName}] ${message}`, data ? JSON.stringify(data).slice(0, 200) : "");
    },
    error: (message: string, error?: any) => {
      console.error(`[${integrationName}] ERROR: ${message}`, error?.message || "");
    },
    warn: (message: string) => {
      console.warn(`[${integrationName}] WARN: ${message}`);
    }
  };
}
