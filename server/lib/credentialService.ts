import crypto from "crypto";
import { db } from "../db";
import { integrationCredentials, InsertIntegrationCredential, IntegrationCredential } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface DecryptedCredentials {
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  apiSecret?: string;
  clientId?: string;
  clientSecret?: string;
  accountId?: string;
  instanceUrl?: string;
  tenantId?: string;
  additionalData?: Record<string, any>;
}

export class CredentialService {
  private static getEncryptionKey(): string {
    const key = process.env.INTEGRATION_ENCRYPTION_KEY;
    if (!key) {
      throw new Error("INTEGRATION_ENCRYPTION_KEY environment variable is required");
    }
    return key.padEnd(32).slice(0, 32);
  }

  static encrypt(plaintext: string): string {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key), iv);
    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
  }

  static decrypt(encrypted: string): string {
    try {
      const key = this.getEncryptionKey();
      const [ivHex, encryptedHex] = encrypted.split(":");
      if (!ivHex || !encryptedHex) return encrypted;
      
      const iv = Buffer.from(ivHex, "hex");
      const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key), iv);
      let decrypted = decipher.update(encryptedHex, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (error) {
      console.error("[CredentialService] Decryption failed:", error);
      throw new Error("Failed to decrypt credentials");
    }
  }

  static isEncryptionConfigured(): boolean {
    return !!process.env.INTEGRATION_ENCRYPTION_KEY;
  }

  static async storeCredentials(
    companyId: string,
    integrationId: string,
    integrationName: string,
    credentialType: "oauth2" | "api_key" | "basic_auth" | "token",
    credentials: DecryptedCredentials,
    userId?: string
  ): Promise<IntegrationCredential> {
    const encryptedCredentials = this.encrypt(JSON.stringify(credentials));
    const encryptedAccessToken = credentials.accessToken ? this.encrypt(credentials.accessToken) : null;
    const encryptedRefreshToken = credentials.refreshToken ? this.encrypt(credentials.refreshToken) : null;

    const existing = await this.getCredentials(companyId, integrationId);

    if (existing) {
      const [updated] = await db
        .update(integrationCredentials)
        .set({
          encryptedCredentials,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          instanceUrl: credentials.instanceUrl,
          tenantId: credentials.tenantId,
          accountId: credentials.accountId,
          status: "active",
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(integrationCredentials.id, existing.id))
        .returning();
      
      console.log(`[CredentialService] Updated credentials for ${integrationId} (company: ${companyId})`);
      return updated;
    }

    const insertData: InsertIntegrationCredential = {
      companyId,
      integrationId,
      integrationName,
      credentialType,
      encryptedCredentials,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      instanceUrl: credentials.instanceUrl,
      tenantId: credentials.tenantId,
      accountId: credentials.accountId,
      status: "active",
      createdBy: userId,
    };

    const [created] = await db
      .insert(integrationCredentials)
      .values(insertData)
      .returning();
    
    console.log(`[CredentialService] Stored new credentials for ${integrationId} (company: ${companyId})`);
    return created;
  }

  static async getCredentials(companyId: string, integrationId: string): Promise<IntegrationCredential | null> {
    const [credential] = await db
      .select()
      .from(integrationCredentials)
      .where(
        and(
          eq(integrationCredentials.companyId, companyId),
          eq(integrationCredentials.integrationId, integrationId)
        )
      )
      .limit(1);
    
    return credential || null;
  }

  static async getDecryptedCredentials(companyId: string, integrationId: string): Promise<DecryptedCredentials | null> {
    const credential = await this.getCredentials(companyId, integrationId);
    if (!credential) return null;

    try {
      const decrypted = JSON.parse(this.decrypt(credential.encryptedCredentials));
      
      if (credential.accessToken) {
        decrypted.accessToken = this.decrypt(credential.accessToken);
      }
      if (credential.refreshToken) {
        decrypted.refreshToken = this.decrypt(credential.refreshToken);
      }
      if (credential.instanceUrl) {
        decrypted.instanceUrl = credential.instanceUrl;
      }
      if (credential.tenantId) {
        decrypted.tenantId = credential.tenantId;
      }
      if (credential.accountId) {
        decrypted.accountId = credential.accountId;
      }

      return decrypted;
    } catch (error) {
      console.error(`[CredentialService] Failed to decrypt credentials for ${integrationId}:`, error);
      return null;
    }
  }

  static async getAllCredentialsForCompany(companyId: string): Promise<IntegrationCredential[]> {
    return await db
      .select()
      .from(integrationCredentials)
      .where(eq(integrationCredentials.companyId, companyId));
  }

  static async updateTokenExpiry(
    companyId: string,
    integrationId: string,
    expiresAt: Date
  ): Promise<void> {
    await db
      .update(integrationCredentials)
      .set({
        tokenExpiresAt: expiresAt,
        tokenRefreshedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(integrationCredentials.companyId, companyId),
          eq(integrationCredentials.integrationId, integrationId)
        )
      );
  }

  static async updateAccessToken(
    companyId: string,
    integrationId: string,
    accessToken: string,
    expiresAt?: Date
  ): Promise<void> {
    const encryptedToken = this.encrypt(accessToken);
    
    await db
      .update(integrationCredentials)
      .set({
        accessToken: encryptedToken,
        tokenExpiresAt: expiresAt,
        tokenRefreshedAt: new Date(),
        status: "active",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(integrationCredentials.companyId, companyId),
          eq(integrationCredentials.integrationId, integrationId)
        )
      );
    
    console.log(`[CredentialService] Refreshed access token for ${integrationId}`);
  }

  static async markAsError(
    companyId: string,
    integrationId: string,
    errorMessage: string
  ): Promise<void> {
    await db
      .update(integrationCredentials)
      .set({
        status: "error",
        lastErrorAt: new Date(),
        lastErrorMessage: errorMessage,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(integrationCredentials.companyId, companyId),
          eq(integrationCredentials.integrationId, integrationId)
        )
      );
  }

  static async markAsExpired(companyId: string, integrationId: string): Promise<void> {
    await db
      .update(integrationCredentials)
      .set({
        status: "expired",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(integrationCredentials.companyId, companyId),
          eq(integrationCredentials.integrationId, integrationId)
        )
      );
  }

  static async updateConnectionTestStatus(
    companyId: string,
    integrationId: string,
    passed: boolean
  ): Promise<void> {
    await db
      .update(integrationCredentials)
      .set({
        connectionTestPassed: passed ? 1 : 0,
        lastUsedAt: new Date(),
        status: passed ? "active" : "error",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(integrationCredentials.companyId, companyId),
          eq(integrationCredentials.integrationId, integrationId)
        )
      );
  }

  static async deleteCredentials(companyId: string, integrationId: string): Promise<void> {
    await db
      .delete(integrationCredentials)
      .where(
        and(
          eq(integrationCredentials.companyId, companyId),
          eq(integrationCredentials.integrationId, integrationId)
        )
      );
    
    console.log(`[CredentialService] Deleted credentials for ${integrationId} (company: ${companyId})`);
  }

  static async isTokenExpiringSoon(
    companyId: string,
    integrationId: string,
    bufferMinutes: number = 10
  ): Promise<boolean> {
    const credential = await this.getCredentials(companyId, integrationId);
    if (!credential?.tokenExpiresAt) return false;

    const bufferMs = bufferMinutes * 60 * 1000;
    return new Date().getTime() > credential.tokenExpiresAt.getTime() - bufferMs;
  }

  static async getExpiringCredentials(bufferMinutes: number = 30): Promise<IntegrationCredential[]> {
    const threshold = new Date(Date.now() + bufferMinutes * 60 * 1000);
    
    const expiring = await db
      .select()
      .from(integrationCredentials)
      .where(eq(integrationCredentials.status, "active"));
    
    return expiring.filter(c => 
      c.tokenExpiresAt && c.tokenExpiresAt < threshold && c.refreshToken
    );
  }
}

export const credentialService = CredentialService;
