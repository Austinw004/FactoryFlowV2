import axios, { AxiosError } from 'axios';
import crypto from 'crypto';
import type { IStorage } from '../storage';

export interface WebhookPayload {
  event: string;
  companyId: string;
  timestamp: string;
  data: Record<string, any>;
}

// ================================
// MIDDLEWARE WEBHOOK INTEGRATIONS
// For MuleSoft, Boomi, Zapier, etc.
// ================================

export interface MiddlewareWebhookConfig {
  id: string;
  companyId: string;
  name: string;
  platform: WebhookPlatform;
  inboundEnabled: boolean;
  inboundEndpoint: string;
  inboundSecret: string;
  inboundDataTypes: string[];
  outboundEnabled: boolean;
  outboundUrl: string | null;
  outboundSecret: string | null;
  outboundEvents: string[];
  outboundHeaders: Record<string, string>;
  status: 'active' | 'paused' | 'error' | 'pending_setup';
  fieldMappings: Record<string, FieldMapping[]>;
}

export interface FieldMapping {
  source: string;
  target: string;
  transform?: 'string' | 'number' | 'date' | 'boolean';
}

export const WEBHOOK_PLATFORMS = {
  mulesoft: { name: 'MuleSoft', description: 'Anypoint Platform integration' },
  boomi: { name: 'Dell Boomi', description: 'AtomSphere integration platform' },
  zapier: { name: 'Zapier', description: 'No-code automation platform' },
  make: { name: 'Make (Integromat)', description: 'Visual automation platform' },
  workato: { name: 'Workato', description: 'Enterprise automation platform' },
  custom: { name: 'Custom Webhook', description: 'Generic webhook endpoint' },
} as const;

export type WebhookPlatform = keyof typeof WEBHOOK_PLATFORMS;

export const WEBHOOK_EVENTS = {
  REGIME_CHANGE: 'regime_change',
  FORECAST_COMPLETE: 'forecast_complete',
  RFQ_GENERATED: 'rfq_generated',
  LOW_STOCK_ALERT: 'low_stock',
  PRICE_ALERT: 'price_alert',
  SUPPLIER_RISK_CHANGE: 'supplier_risk_change',
  PO_CREATED: 'po_created',
  ALLOCATION_UPDATED: 'allocation_updated',
  BUDGET_ALERT: 'budget_alert',
  MACHINERY_ALERT: 'machinery_alert',
} as const;

export function generateHmacSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function verifyHmacSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = generateHmacSignature(payload, secret);
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}

export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateInboundEndpoint(integrationId: string): string {
  return `/api/webhooks/inbound/${integrationId}`;
}

// Transform inbound data from external systems to Prescient Labs format
export function transformInboundData(
  data: any[],
  dataType: string,
  fieldMappings?: Record<string, FieldMapping[]>
): any[] {
  const defaultMappings: Record<string, FieldMapping[]> = {
    inventory: [
      { source: 'item_code', target: 'materialCode' },
      { source: 'sku', target: 'materialCode' },
      { source: 'quantity', target: 'quantity', transform: 'number' },
      { source: 'location', target: 'location' },
      { source: 'uom', target: 'unit' },
    ],
    purchase_orders: [
      { source: 'po_number', target: 'poNumber' },
      { source: 'vendor', target: 'supplier' },
      { source: 'order_date', target: 'creationDate', transform: 'date' },
      { source: 'total', target: 'totalAmount', transform: 'number' },
      { source: 'status', target: 'status' },
    ],
    sales_orders: [
      { source: 'order_number', target: 'orderNumber' },
      { source: 'customer', target: 'customer' },
      { source: 'total_amount', target: 'totalAmount', transform: 'number' },
    ],
    production: [
      { source: 'work_order', target: 'workOrderNumber' },
      { source: 'product', target: 'product' },
      { source: 'quantity', target: 'quantity', transform: 'number' },
    ],
    suppliers: [
      { source: 'vendor_id', target: 'id' },
      { source: 'vendor_name', target: 'name' },
      { source: 'country', target: 'country' },
    ],
    materials: [
      { source: 'item_code', target: 'code' },
      { source: 'description', target: 'name' },
      { source: 'category', target: 'category' },
    ],
  };

  const mappings = fieldMappings?.[dataType] || defaultMappings[dataType] || [];

  return data.map(item => {
    const transformed: any = { source: 'webhook', _raw: item };
    for (const mapping of mappings) {
      const value = item[mapping.source];
      if (value !== undefined) {
        transformed[mapping.target] = applyTransform(value, mapping.transform);
      }
    }
    return transformed;
  });
}

function applyTransform(value: any, transform?: string): any {
  if (!transform) return value;
  switch (transform) {
    case 'number': return parseFloat(value) || 0;
    case 'date': return new Date(value).toISOString();
    case 'boolean': return Boolean(value);
    default: return String(value);
  }
}

export class WebhookService {
  private middlewareIntegrations: Map<string, MiddlewareWebhookConfig> = new Map();

  constructor(private storage: IStorage) {}

  async fireWebhook(companyId: string, event: string, data: Record<string, any>): Promise<void> {
    try {
      const company = await this.storage.getCompany(companyId);
      if (!company) {
        return;
      }

      if (!company.webhookUrl) {
        return;
      }

      let enabledEvents: string[] = [];
      if (company.webhookEvents) {
        try {
          enabledEvents = JSON.parse(company.webhookEvents);
        } catch (e) {
          console.error('Failed to parse webhookEvents:', e);
          return;
        }
      }

      if (enabledEvents.length > 0 && !enabledEvents.includes(event)) {
        return;
      }

      const payload: WebhookPayload = {
        event,
        companyId,
        timestamp: new Date().toISOString(),
        data,
      };

      await axios.post(company.webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ManufacturingAI-Webhook/1.0',
        },
        timeout: 10000,
      });

      console.log(`Webhook fired successfully for company ${companyId}, event: ${event}`);
    } catch (error) {
      console.error(`Failed to fire webhook for company ${companyId}, event: ${event}`, error);
    }
  }

  async fireRegimeChange(companyId: string, oldRegime: string, newRegime: string, fdr: number): Promise<void> {
    await this.fireWebhook(companyId, 'regime_change', {
      oldRegime,
      newRegime,
      fdr,
      message: `Economic regime changed from ${oldRegime} to ${newRegime}`,
    });
  }

  async fireBudgetAlert(companyId: string, budgetUsed: number, budgetTotal: number, percentUsed: number): Promise<void> {
    await this.fireWebhook(companyId, 'budget_alert', {
      budgetUsed,
      budgetTotal,
      percentUsed,
      message: `Budget usage at ${percentUsed.toFixed(1)}%`,
    });
  }

  async fireAllocationComplete(
    companyId: string, 
    allocationId: number, 
    allocationName: string, 
    totalAllocationCost: number,
    budgetUtilization: number,
    totalProduction: number
  ): Promise<void> {
    await this.fireWebhook(companyId, 'allocation_complete', {
      allocationId,
      allocationName,
      totalAllocationCost,
      budgetUtilization,
      totalProduction,
      message: `Allocation "${allocationName}" completed: $${totalAllocationCost.toLocaleString()} (${budgetUtilization.toFixed(1)}% of budget)`,
    });
  }

  async firePriceAlert(companyId: string, commodity: string, oldPrice: number, newPrice: number, changePercent: number): Promise<void> {
    await this.fireWebhook(companyId, 'price_alert', {
      commodity,
      oldPrice,
      newPrice,
      changePercent,
      message: `Significant price change for ${commodity}: ${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`,
    });
  }

  async fireMachineryAlert(companyId: string, machineName: string, alertType: string, message: string): Promise<void> {
    await this.fireWebhook(companyId, 'machinery_alert', {
      machineName,
      alertType,
      message,
    });
  }

  // ================================
  // MIDDLEWARE INTEGRATION METHODS
  // ================================

  registerMiddlewareIntegration(config: MiddlewareWebhookConfig): void {
    this.middlewareIntegrations.set(config.id, config);
  }

  removeMiddlewareIntegration(integrationId: string): void {
    this.middlewareIntegrations.delete(integrationId);
  }

  getMiddlewareIntegration(integrationId: string): MiddlewareWebhookConfig | undefined {
    return this.middlewareIntegrations.get(integrationId);
  }

  getMiddlewareIntegrationsForCompany(companyId: string): MiddlewareWebhookConfig[] {
    return Array.from(this.middlewareIntegrations.values())
      .filter(i => i.companyId === companyId);
  }

  async processInboundMiddlewareWebhook(
    integrationId: string,
    eventType: string,
    data: any,
    signature?: string
  ): Promise<{ success: boolean; message: string; recordsProcessed?: number }> {
    const integration = this.middlewareIntegrations.get(integrationId);
    
    if (!integration) {
      return { success: false, message: 'Integration not found' };
    }

    if (integration.status !== 'active') {
      return { success: false, message: `Integration is ${integration.status}` };
    }

    if (!integration.inboundEnabled) {
      return { success: false, message: 'Inbound webhooks disabled for this integration' };
    }

    // Verify signature if secret is configured
    if (integration.inboundSecret && signature) {
      const payload = JSON.stringify(data);
      if (!verifyHmacSignature(payload, signature, integration.inboundSecret)) {
        return { success: false, message: 'Invalid signature' };
      }
    }

    // Check if event type is allowed
    if (integration.inboundDataTypes.length > 0 && !integration.inboundDataTypes.includes(eventType)) {
      return { success: false, message: `Event type '${eventType}' not allowed` };
    }

    // Transform data
    const dataArray = Array.isArray(data) ? data : [data];
    const transformed = transformInboundData(dataArray, eventType, integration.fieldMappings);

    console.log(`[Webhook] Processed ${transformed.length} ${eventType} records from ${integration.name}`);

    return { 
      success: true, 
      message: `Processed ${transformed.length} records`,
      recordsProcessed: transformed.length,
    };
  }

  async dispatchToMiddlewareIntegrations(
    companyId: string,
    event: string,
    data: Record<string, any>
  ): Promise<void> {
    const integrations = this.getMiddlewareIntegrationsForCompany(companyId)
      .filter(i => i.outboundEnabled && i.status === 'active');

    for (const integration of integrations) {
      // Check if this event is subscribed
      if (integration.outboundEvents.length > 0 && !integration.outboundEvents.includes(event)) {
        continue;
      }

      if (!integration.outboundUrl) {
        continue;
      }

      await this.sendMiddlewareWebhook(integration, event, data);
    }
  }

  private async sendMiddlewareWebhook(
    integration: MiddlewareWebhookConfig,
    event: string,
    data: Record<string, any>
  ): Promise<void> {
    const payload = {
      eventType: event,
      timestamp: new Date().toISOString(),
      data,
      metadata: {
        source: 'prescient_labs',
        version: '1.0',
        integrationId: integration.id,
      },
    };

    const payloadString = JSON.stringify(payload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Event': event,
      'X-Webhook-Timestamp': payload.timestamp,
    };

    // Add HMAC signature
    if (integration.outboundSecret) {
      headers['X-Webhook-Signature'] = generateHmacSignature(payloadString, integration.outboundSecret);
    }

    // Add custom headers
    if (integration.outboundHeaders) {
      Object.assign(headers, integration.outboundHeaders);
    }

    try {
      await axios.post(integration.outboundUrl!, payload, {
        headers,
        timeout: 30000,
      });
      console.log(`[Webhook] Sent ${event} to ${integration.name}`);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(`[Webhook] Failed to send to ${integration.name}:`, axiosError.message);
    }
  }
}
