import axios from "axios";
import crypto from "crypto";
import { CredentialService } from "./credentialService";

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  redirectUri: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  scope?: string;
  instanceUrl?: string;
  tenantId?: string;
}

const OAUTH_CONFIGS: Record<string, Omit<OAuthConfig, "clientId" | "clientSecret" | "redirectUri">> = {
  salesforce: {
    authorizationUrl: "https://login.salesforce.com/services/oauth2/authorize",
    tokenUrl: "https://login.salesforce.com/services/oauth2/token",
    scopes: ["api", "refresh_token", "offline_access"],
  },
  google: {
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/drive.readonly",
    ],
  },
  xero: {
    authorizationUrl: "https://login.xero.com/identity/connect/authorize",
    tokenUrl: "https://identity.xero.com/connect/token",
    scopes: ["openid", "profile", "email", "accounting.transactions", "accounting.contacts", "offline_access"],
  },
  quickbooks: {
    authorizationUrl: "https://appcenter.intuit.com/connect/oauth2",
    tokenUrl: "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
    scopes: ["com.intuit.quickbooks.accounting", "openid", "profile", "email"],
  },
  docusign: {
    authorizationUrl: "https://account.docusign.com/oauth/auth",
    tokenUrl: "https://account.docusign.com/oauth/token",
    scopes: ["signature", "extended"],
  },
  hubspot: {
    authorizationUrl: "https://app.hubspot.com/oauth/authorize",
    tokenUrl: "https://api.hubapi.com/oauth/v1/token",
    scopes: ["crm.objects.contacts.read", "crm.objects.companies.read", "crm.objects.deals.read"],
  },
};

export class OAuthService {
  private static getBaseUrl(): string {
    return process.env.REPLIT_DOMAINS?.split(",")[0] 
      ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
      : "http://localhost:5000";
  }

  static getAuthorizationUrl(
    integrationId: string,
    companyId: string,
    state?: string
  ): string {
    const config = OAUTH_CONFIGS[integrationId];
    if (!config) {
      throw new Error(`OAuth not configured for integration: ${integrationId}`);
    }

    const clientId = this.getClientId(integrationId);
    if (!clientId) {
      throw new Error(`Client ID not configured for ${integrationId}`);
    }

    const redirectUri = `${this.getBaseUrl()}/api/oauth/callback/${integrationId}`;
    const nonce = state || crypto.randomBytes(16).toString("hex");
    const stateData = JSON.stringify({ companyId, integrationId, nonce, timestamp: Date.now() });
    const signature = crypto.createHmac("sha256", this.getStateSigningKey()).update(stateData).digest("hex");
    const encodedState = Buffer.from(`${stateData}|${signature}`).toString("base64");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: config.scopes.join(" "),
      state: encodedState,
      access_type: "offline",
      prompt: "consent",
    });

    console.log(`[OAuth] Generated auth URL for ${integrationId}`);
    return `${config.authorizationUrl}?${params.toString()}`;
  }

  static async exchangeCodeForTokens(
    integrationId: string,
    code: string,
    companyId: string
  ): Promise<TokenResponse> {
    const config = OAUTH_CONFIGS[integrationId];
    if (!config) {
      throw new Error(`OAuth not configured for integration: ${integrationId}`);
    }

    const clientId = this.getClientId(integrationId);
    const clientSecret = this.getClientSecret(integrationId);
    const redirectUri = `${this.getBaseUrl()}/api/oauth/callback/${integrationId}`;

    if (!clientId || !clientSecret) {
      throw new Error(`OAuth credentials not configured for ${integrationId}`);
    }

    try {
      const params = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      });

      const response = await axios.post(config.tokenUrl, params.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 30000,
      });

      const data = response.data;
      const tokenResponse: TokenResponse = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        tokenType: data.token_type,
        scope: data.scope,
        instanceUrl: data.instance_url,
      };

      const expiresAt = data.expires_in 
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined;

      await CredentialService.storeCredentials(
        companyId,
        integrationId,
        this.getIntegrationName(integrationId),
        "oauth2",
        {
          accessToken: tokenResponse.accessToken,
          refreshToken: tokenResponse.refreshToken,
          clientId,
          clientSecret,
          instanceUrl: tokenResponse.instanceUrl,
        }
      );

      if (expiresAt) {
        await CredentialService.updateTokenExpiry(companyId, integrationId, expiresAt);
      }

      console.log(`[OAuth] Token exchange successful for ${integrationId}`);
      return tokenResponse;
    } catch (error: any) {
      console.error(`[OAuth] Token exchange failed for ${integrationId}:`, error.response?.data || error.message);
      throw new Error(`OAuth token exchange failed: ${error.response?.data?.error_description || error.message}`);
    }
  }

  static async refreshAccessToken(
    companyId: string,
    integrationId: string
  ): Promise<TokenResponse | null> {
    const config = OAUTH_CONFIGS[integrationId];
    if (!config) {
      throw new Error(`OAuth not configured for integration: ${integrationId}`);
    }

    const credentials = await CredentialService.getDecryptedCredentials(companyId, integrationId);
    if (!credentials?.refreshToken) {
      console.error(`[OAuth] No refresh token available for ${integrationId}`);
      return null;
    }

    const clientId = credentials.clientId || this.getClientId(integrationId);
    const clientSecret = credentials.clientSecret || this.getClientSecret(integrationId);

    if (!clientId || !clientSecret) {
      throw new Error(`OAuth credentials not available for ${integrationId}`);
    }

    try {
      const params = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: credentials.refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      });

      const response = await axios.post(config.tokenUrl, params.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 30000,
      });

      const data = response.data;
      const expiresAt = data.expires_in 
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined;

      await CredentialService.updateAccessToken(
        companyId,
        integrationId,
        data.access_token,
        expiresAt
      );

      if (data.refresh_token && data.refresh_token !== credentials.refreshToken) {
        await CredentialService.storeCredentials(
          companyId,
          integrationId,
          this.getIntegrationName(integrationId),
          "oauth2",
          {
            ...credentials,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
          }
        );
      }

      console.log(`[OAuth] Token refresh successful for ${integrationId}`);
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || credentials.refreshToken,
        expiresIn: data.expires_in,
      };
    } catch (error: any) {
      console.error(`[OAuth] Token refresh failed for ${integrationId}:`, error.response?.data || error.message);
      await CredentialService.markAsExpired(companyId, integrationId);
      return null;
    }
  }

  static async refreshExpiringTokens(): Promise<{ refreshed: number; failed: number }> {
    let refreshed = 0;
    let failed = 0;

    const expiring = await CredentialService.getExpiringCredentials(30);
    
    for (const credential of expiring) {
      if (credential.credentialType !== "oauth2") continue;

      try {
        const result = await this.refreshAccessToken(credential.companyId, credential.integrationId);
        if (result) {
          refreshed++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`[OAuth] Failed to refresh ${credential.integrationId}:`, error);
        failed++;
      }
    }

    if (expiring.length > 0) {
      console.log(`[OAuth] Token refresh cycle: ${refreshed} refreshed, ${failed} failed`);
    }

    return { refreshed, failed };
  }

  private static getClientId(integrationId: string): string | undefined {
    const envKey = `${integrationId.toUpperCase().replace(/-/g, "_")}_CLIENT_ID`;
    return process.env[envKey];
  }

  private static getClientSecret(integrationId: string): string | undefined {
    const envKey = `${integrationId.toUpperCase().replace(/-/g, "_")}_CLIENT_SECRET`;
    return process.env[envKey];
  }

  private static getIntegrationName(integrationId: string): string {
    const names: Record<string, string> = {
      salesforce: "Salesforce",
      google: "Google",
      xero: "Xero",
      quickbooks: "QuickBooks",
      docusign: "DocuSign",
      hubspot: "HubSpot",
    };
    return names[integrationId] || integrationId;
  }

  static getSupportedIntegrations(): string[] {
    return Object.keys(OAUTH_CONFIGS);
  }

  static isOAuthIntegration(integrationId: string): boolean {
    return !!OAUTH_CONFIGS[integrationId];
  }

  static parseState(state: string): { companyId: string; integrationId: string; nonce: string; timestamp: number } | null {
    try {
      const decoded = Buffer.from(state, "base64").toString("utf8");
      const [stateDataStr, signature] = decoded.split("|");
      
      if (!stateDataStr || !signature) {
        console.error("[OAuth] Invalid state format - missing signature");
        return null;
      }
      
      const expectedSignature = crypto.createHmac("sha256", this.getStateSigningKey()).update(stateDataStr).digest("hex");
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        console.error("[OAuth] State signature verification failed");
        return null;
      }
      
      const stateData = JSON.parse(stateDataStr);
      
      const stateAge = Date.now() - stateData.timestamp;
      if (stateAge > 10 * 60 * 1000) {
        console.error("[OAuth] State expired (>10 minutes old)");
        return null;
      }
      
      return stateData;
    } catch (error) {
      console.error("[OAuth] Failed to parse state:", error);
      return null;
    }
  }

  private static getStateSigningKey(): string {
    const key = process.env.INTEGRATION_ENCRYPTION_KEY;
    if (!key) {
      throw new Error("[OAuth Security] INTEGRATION_ENCRYPTION_KEY is required for secure state signing - no fallback allowed");
    }
    return key;
  }
}

export const oauthService = OAuthService;
