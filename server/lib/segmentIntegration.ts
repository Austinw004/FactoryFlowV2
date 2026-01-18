import axios from 'axios';
import { storage } from '../storage';
import { CredentialService } from './credentialService';

export interface SegmentSource {
  id: string;
  slug: string;
  name: string;
  workspaceId: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SegmentDestination {
  id: string;
  name: string;
  sourceId: string;
  enabled: boolean;
  connection: {
    mode: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface SegmentEvent {
  messageId: string;
  type: string;
  userId: string | null;
  anonymousId: string | null;
  event: string | null;
  properties: Record<string, any>;
  context: Record<string, any>;
  timestamp: Date;
}

export class SegmentIntegration {
  private writeKey: string | null = null;
  private accessToken: string | null = null;
  private workspaceSlug: string | null = null;
  private baseUrl = 'https://api.segmentapis.com';

  constructor(private companyId: string) {}

  async initialize(): Promise<boolean> {
    try {
      const credentials = await CredentialService.getDecryptedCredentials(this.companyId, 'segment') as any;
      if (!credentials?.writeKey) {
        console.log('[Segment] No credentials found for company');
        return false;
      }
      this.writeKey = credentials.writeKey;
      this.accessToken = credentials.accessToken;
      this.workspaceSlug = credentials.workspaceSlug;
      console.log(`[Segment] Initialized for company ${this.companyId}`);
      return true;
    } catch (error) {
      console.error('[Segment] Failed to initialize:', error);
      return false;
    }
  }

  private getTrackingHeaders() {
    return {
      Authorization: `Basic ${Buffer.from(`${this.writeKey}:`).toString('base64')}`,
      'Content-Type': 'application/json'
    };
  }

  private getApiHeaders() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      const initialized = await this.initialize();
      if (!initialized) {
        return { success: false, message: 'Segment credentials not configured' };
      }

      const response = await axios.post(
        'https://api.segment.io/v1/identify',
        {
          userId: 'connection-test',
          traits: { test: true }
        },
        {
          headers: this.getTrackingHeaders(),
          timeout: 10000
        }
      );

      if (response.data.success) {
        console.log('[Segment] Connection test successful');
        return { success: true, message: 'Segment API connected successfully' };
      }
      return { success: false, message: 'Unexpected response from Segment' };
    } catch (error: any) {
      console.error('[Segment] Connection test failed:', error.message);
      return { success: false, message: error.response?.data?.message || error.message };
    }
  }

  async trackEvent(event: string, userId: string, properties?: Record<string, any>): Promise<boolean> {
    try {
      if (!this.writeKey) await this.initialize();

      await axios.post(
        'https://api.segment.io/v1/track',
        {
          userId,
          event,
          properties: properties || {},
          timestamp: new Date().toISOString()
        },
        {
          headers: this.getTrackingHeaders(),
          timeout: 10000
        }
      );

      return true;
    } catch (error: any) {
      console.error('[Segment] Track event failed:', error.message);
      return false;
    }
  }

  async identifyUser(userId: string, traits: Record<string, any>): Promise<boolean> {
    try {
      if (!this.writeKey) await this.initialize();

      await axios.post(
        'https://api.segment.io/v1/identify',
        {
          userId,
          traits,
          timestamp: new Date().toISOString()
        },
        {
          headers: this.getTrackingHeaders(),
          timeout: 10000
        }
      );

      return true;
    } catch (error: any) {
      console.error('[Segment] Identify user failed:', error.message);
      return false;
    }
  }

  async getSources(): Promise<SegmentSource[]> {
    try {
      if (!this.accessToken) await this.initialize();
      if (!this.accessToken) return [];

      const response = await axios.get(`${this.baseUrl}/sources`, {
        headers: this.getApiHeaders(),
        timeout: 15000
      });

      return (response.data.data?.sources || []).map((source: any) => ({
        id: source.id,
        slug: source.slug,
        name: source.name,
        workspaceId: source.workspaceId,
        enabled: source.enabled,
        createdAt: new Date(source.createdAt),
        updatedAt: new Date(source.updatedAt)
      }));
    } catch (error: any) {
      console.error('[Segment] Get sources failed:', error.message);
      return [];
    }
  }

  async getDestinations(sourceId: string): Promise<SegmentDestination[]> {
    try {
      if (!this.accessToken) await this.initialize();
      if (!this.accessToken) return [];

      const response = await axios.get(`${this.baseUrl}/sources/${sourceId}/destinations`, {
        headers: this.getApiHeaders(),
        timeout: 15000
      });

      return (response.data.data?.destinations || []).map((dest: any) => ({
        id: dest.id,
        name: dest.name,
        sourceId: dest.sourceId,
        enabled: dest.enabled,
        connection: { mode: dest.connection?.mode || 'cloud' },
        createdAt: new Date(dest.createdAt),
        updatedAt: new Date(dest.updatedAt)
      }));
    } catch (error: any) {
      console.error('[Segment] Get destinations failed:', error.message);
      return [];
    }
  }

  async syncAnalyticsAsDemandSignals(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const initialized = await this.initialize();
      if (!initialized) {
        return { synced: 0, errors: ['Segment not initialized'] };
      }

      const sources = await this.getSources();

      for (const source of sources) {
        try {
          await storage.createDemandSignal({
            companyId: this.companyId,
            signalType: 'analytics_source',
            signalDate: source.updatedAt,
            quantity: 1,
            unit: 'source',
            channel: 'segment',
            confidence: 75,
            priority: source.enabled ? 'medium' : 'low',
            attributes: {
              source: 'segment',
              sourceId: source.id,
              sourceName: source.name,
              sourceSlug: source.slug,
              enabled: source.enabled
            }
          });
          synced++;
        } catch (err: any) {
          errors.push(`Source ${source.id}: ${err.message}`);
        }
      }

      console.log(`[Segment] Synced ${synced} sources as demand signals`);
      return { synced, errors };
    } catch (error: any) {
      console.error('[Segment] Sync failed:', error.message);
      return { synced: 0, errors: [error.message] };
    }
  }
}
