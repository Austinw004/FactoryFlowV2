import axios from 'axios';
import { storage } from '../storage';
import { CredentialService } from './credentialService';

export interface MixpanelEvent {
  event: string;
  distinctId: string;
  time: Date;
  properties: Record<string, any>;
}

export interface MixpanelProfile {
  distinctId: string;
  email: string | null;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  properties: Record<string, any>;
}

export interface MixpanelFunnel {
  funnelId: number;
  name: string;
  steps: Array<{
    event: string;
    count: number;
    conversionRate: number;
  }>;
}

export interface MixpanelRetention {
  date: string;
  cohortSize: number;
  retentionByDay: number[];
}

export class MixpanelIntegration {
  private projectToken: string | null = null;
  private apiSecret: string | null = null;
  private serviceAccountUser: string | null = null;
  private serviceAccountSecret: string | null = null;
  private projectId: string | null = null;

  constructor(private companyId: string) {}

  async initialize(): Promise<boolean> {
    try {
      const credentials = await CredentialService.getDecryptedCredentials(this.companyId, 'mixpanel') as any;
      if (!credentials?.projectToken) {
        console.log('[Mixpanel] No credentials found for company');
        return false;
      }
      this.projectToken = credentials.projectToken;
      this.apiSecret = credentials.apiSecret;
      this.serviceAccountUser = credentials.serviceAccountUser;
      this.serviceAccountSecret = credentials.serviceAccountSecret;
      this.projectId = credentials.projectId;
      console.log(`[Mixpanel] Initialized for company ${this.companyId}`);
      return true;
    } catch (error) {
      console.error('[Mixpanel] Failed to initialize:', error);
      return false;
    }
  }

  private getTrackingHeaders() {
    return {
      'Content-Type': 'application/json',
      Accept: 'text/plain'
    };
  }

  private getDataHeaders() {
    if (this.serviceAccountUser && this.serviceAccountSecret) {
      return {
        Authorization: `Basic ${Buffer.from(`${this.serviceAccountUser}:${this.serviceAccountSecret}`).toString('base64')}`,
        'Content-Type': 'application/json'
      };
    }
    return {
      Authorization: `Basic ${Buffer.from(`${this.apiSecret}:`).toString('base64')}`,
      'Content-Type': 'application/json'
    };
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      const initialized = await this.initialize();
      if (!initialized) {
        return { success: false, message: 'Mixpanel credentials not configured' };
      }

      const event = {
        event: 'Connection Test',
        properties: {
          token: this.projectToken,
          distinct_id: 'connection-test',
          time: Math.floor(Date.now() / 1000)
        }
      };

      const data = Buffer.from(JSON.stringify([event])).toString('base64');
      const response = await axios.get(`https://api.mixpanel.com/track?data=${data}`, {
        timeout: 10000
      });

      if (response.data === 1) {
        console.log('[Mixpanel] Connection test successful');
        return { success: true, message: 'Mixpanel API connected successfully' };
      }
      return { success: false, message: 'Unexpected response from Mixpanel' };
    } catch (error: any) {
      console.error('[Mixpanel] Connection test failed:', error.message);
      return { success: false, message: error.response?.data || error.message };
    }
  }

  async trackEvent(event: string, distinctId: string, properties?: Record<string, any>): Promise<boolean> {
    try {
      if (!this.projectToken) await this.initialize();

      const eventData = {
        event,
        properties: {
          token: this.projectToken,
          distinct_id: distinctId,
          time: Math.floor(Date.now() / 1000),
          ...(properties || {})
        }
      };

      const data = Buffer.from(JSON.stringify([eventData])).toString('base64');
      const response = await axios.get(`https://api.mixpanel.com/track?data=${data}`, {
        timeout: 10000
      });

      return response.data === 1;
    } catch (error: any) {
      console.error('[Mixpanel] Track event failed:', error.message);
      return false;
    }
  }

  async getTopEvents(fromDate: string, toDate: string, limit: number = 10): Promise<Array<{ event: string; count: number }>> {
    try {
      if (!this.projectToken) await this.initialize();

      const response = await axios.get('https://data.mixpanel.com/api/2.0/export', {
        headers: this.getDataHeaders(),
        params: {
          from_date: fromDate,
          to_date: toDate,
          project_id: this.projectId
        },
        timeout: 30000
      });

      const eventCounts: Record<string, number> = {};
      const lines = response.data.split('\n').filter((l: string) => l.trim());
      
      for (const line of lines) {
        try {
          const event = JSON.parse(line);
          eventCounts[event.event] = (eventCounts[event.event] || 0) + 1;
        } catch {
          continue;
        }
      }

      return Object.entries(eventCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([event, count]) => ({ event, count }));
    } catch (error: any) {
      console.error('[Mixpanel] Get top events failed:', error.message);
      return [];
    }
  }

  async getInsights(event: string, fromDate: string, toDate: string): Promise<any> {
    try {
      if (!this.projectToken) await this.initialize();

      const response = await axios.post(
        'https://mixpanel.com/api/2.0/insights',
        {
          project_id: this.projectId,
          bookmark: {
            sections: {
              show: [{
                event,
                eventType: 'total'
              }]
            }
          },
          time: {
            from: fromDate,
            to: toDate
          }
        },
        {
          headers: this.getDataHeaders(),
          timeout: 15000
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('[Mixpanel] Get insights failed:', error.message);
      return null;
    }
  }

  async syncEventMetricsAsDemandSignals(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const initialized = await this.initialize();
      if (!initialized) {
        return { synced: 0, errors: ['Mixpanel not initialized'] };
      }

      const today = new Date();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const fromDate = thirtyDaysAgo.toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      const topEvents = await this.getTopEvents(fromDate, toDate, 20);

      for (const eventData of topEvents) {
        try {
          await storage.createDemandSignal({
            companyId: this.companyId,
            signalType: 'analytics_event',
            signalDate: new Date(),
            quantity: eventData.count,
            unit: 'events',
            channel: 'mixpanel',
            confidence: 85,
            priority: eventData.count > 1000 ? 'high' : eventData.count > 100 ? 'medium' : 'low',
            attributes: {
              source: 'mixpanel',
              eventName: eventData.event,
              eventCount: eventData.count,
              periodStart: fromDate,
              periodEnd: toDate
            }
          });
          synced++;
        } catch (err: any) {
          errors.push(`Event ${eventData.event}: ${err.message}`);
        }
      }

      console.log(`[Mixpanel] Synced ${synced} event metrics as demand signals`);
      return { synced, errors };
    } catch (error: any) {
      console.error('[Mixpanel] Sync failed:', error.message);
      return { synced: 0, errors: [error.message] };
    }
  }
}
