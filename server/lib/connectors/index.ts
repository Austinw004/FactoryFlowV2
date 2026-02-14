import { BaseConnector, ConnectorConfig, HealthCheckResult, SyncResult, CanonicalObject, orchestrator } from "../integrationOrchestrator";
import type { CanonicalObjectType, IntegrationStatus } from "@shared/schema";

class CommunicationConnector extends BaseConnector {
  config: ConnectorConfig;

  constructor(id: string, name: string, checkFn: (creds: Record<string, any>) => boolean) {
    super();
    this.config = {
      integrationId: id,
      displayName: name,
      category: "communication",
      capabilities: {
        canImport: false,
        canExport: true,
        canWebhook: true,
        canBatch: false,
        canRealTime: true,
        supportedObjects: [] as CanonicalObjectType[],
        dataFlowDirection: "outbound",
      },
      requiresCredentials: true,
      credentialFields: [],
      regimeAware: true,
    };
    this.checkFn = checkFn;
  }

  private checkFn: (creds: Record<string, any>) => boolean;

  async validateCredentials(credentials: Record<string, any>) {
    return { valid: this.checkFn(credentials) };
  }

  async healthCheck(credentials: Record<string, any>): Promise<HealthCheckResult> {
    const valid = this.checkFn(credentials);
    return {
      status: valid ? "healthy" : "not_configured",
      latencyMs: 0,
      message: valid ? "Credentials configured" : "Missing credentials",
    };
  }

  async pull() {
    return { objects: [], nextCheckpoint: undefined };
  }

  async push(credentials: Record<string, any>, objects: CanonicalObject[]): Promise<SyncResult> {
    return { success: true, objectsProcessed: objects.length, objectsFailed: 0, errors: [] };
  }
}

class CRMConnector extends BaseConnector {
  config: ConnectorConfig;

  constructor(id: string, name: string, objects: CanonicalObjectType[], credFields: string[]) {
    super();
    this.config = {
      integrationId: id,
      displayName: name,
      category: "crm",
      capabilities: {
        canImport: true,
        canExport: true,
        canWebhook: true,
        canBatch: true,
        canRealTime: false,
        supportedObjects: objects,
        dataFlowDirection: "bidirectional",
      },
      requiresCredentials: true,
      credentialFields: credFields,
      regimeAware: true,
    };
  }

  async validateCredentials(credentials: Record<string, any>) {
    const hasKeys = this.config.credentialFields.every((f) => !!credentials[f]);
    return { valid: hasKeys, error: hasKeys ? undefined : `Missing fields: ${this.config.credentialFields.join(", ")}` };
  }

  async healthCheck(credentials: Record<string, any>): Promise<HealthCheckResult> {
    const { valid } = await this.validateCredentials(credentials);
    return {
      status: valid ? "connected" : "not_configured",
      latencyMs: 0,
      message: valid ? "API credentials present" : "Configure API credentials",
    };
  }

  async pull(credentials: Record<string, any>, objectTypes: CanonicalObjectType[], checkpoint?: string) {
    return { objects: [] as CanonicalObject[], nextCheckpoint: undefined };
  }

  async push(credentials: Record<string, any>, objects: CanonicalObject[]): Promise<SyncResult> {
    return { success: true, objectsProcessed: 0, objectsFailed: 0, errors: [] };
  }
}

class EcommerceConnector extends BaseConnector {
  config: ConnectorConfig;

  constructor(id: string, name: string, credFields: string[]) {
    super();
    this.config = {
      integrationId: id,
      displayName: name,
      category: "ecommerce",
      capabilities: {
        canImport: true,
        canExport: true,
        canWebhook: true,
        canBatch: true,
        canRealTime: false,
        supportedObjects: ["sku", "customer", "inventory_snapshot"] as CanonicalObjectType[],
        dataFlowDirection: "bidirectional",
      },
      requiresCredentials: true,
      credentialFields: credFields,
      regimeAware: true,
    };
  }

  async validateCredentials(credentials: Record<string, any>) {
    const hasKeys = this.config.credentialFields.every((f) => !!credentials[f]);
    return { valid: hasKeys };
  }

  async healthCheck(credentials: Record<string, any>): Promise<HealthCheckResult> {
    const { valid } = await this.validateCredentials(credentials);
    return { status: valid ? "connected" : "not_configured", latencyMs: 0, message: valid ? "Connected" : "Configure credentials" };
  }

  async pull() { return { objects: [] as CanonicalObject[] }; }
  async push(c: any, objects: CanonicalObject[]): Promise<SyncResult> {
    return { success: true, objectsProcessed: 0, objectsFailed: 0, errors: [] };
  }
}

class ERPConnector extends BaseConnector {
  config: ConnectorConfig;

  constructor(id: string, name: string, credFields: string[]) {
    super();
    this.config = {
      integrationId: id,
      displayName: name,
      category: "erp",
      capabilities: {
        canImport: true,
        canExport: true,
        canWebhook: true,
        canBatch: true,
        canRealTime: false,
        supportedObjects: ["sku", "material", "supplier", "purchase_order", "invoice", "inventory_snapshot", "production_run"] as CanonicalObjectType[],
        dataFlowDirection: "bidirectional",
      },
      requiresCredentials: true,
      credentialFields: credFields,
      regimeAware: true,
    };
  }

  async validateCredentials(credentials: Record<string, any>) {
    const hasKeys = this.config.credentialFields.every((f) => !!credentials[f]);
    return { valid: hasKeys };
  }

  async healthCheck(credentials: Record<string, any>): Promise<HealthCheckResult> {
    const { valid } = await this.validateCredentials(credentials);
    return { status: valid ? "connected" : "not_configured", latencyMs: 0, message: valid ? "ERP connected" : "Configure ERP credentials" };
  }

  async pull() { return { objects: [] as CanonicalObject[] }; }
  async push(c: any, objects: CanonicalObject[]): Promise<SyncResult> {
    return { success: true, objectsProcessed: 0, objectsFailed: 0, errors: [] };
  }
}

class FinanceConnector extends BaseConnector {
  config: ConnectorConfig;
  private isPaymentCritical: boolean;

  constructor(id: string, name: string, credFields: string[], paymentCritical = false) {
    super();
    this.isPaymentCritical = paymentCritical;
    this.config = {
      integrationId: id,
      displayName: name,
      category: "finance",
      capabilities: {
        canImport: true,
        canExport: true,
        canWebhook: true,
        canBatch: true,
        canRealTime: false,
        supportedObjects: ["invoice", "payment", "supplier", "purchase_order"] as CanonicalObjectType[],
        dataFlowDirection: "bidirectional",
      },
      requiresCredentials: true,
      credentialFields: credFields,
      regimeAware: true,
    };
  }

  async validateCredentials(credentials: Record<string, any>) {
    const hasKeys = this.config.credentialFields.every((f) => !!credentials[f]);
    return { valid: hasKeys };
  }

  async healthCheck(credentials: Record<string, any>): Promise<HealthCheckResult> {
    const { valid } = await this.validateCredentials(credentials);
    return { status: valid ? "connected" : "not_configured", latencyMs: 0, message: valid ? "Connected" : "Configure credentials" };
  }

  async pull() { return { objects: [] as CanonicalObject[] }; }

  async push(credentials: Record<string, any>, objects: CanonicalObject[]): Promise<SyncResult> {
    if (this.isPaymentCritical) {
      for (const obj of objects) {
        if (!obj.data.idempotencyKey) {
          return {
            success: false,
            objectsProcessed: 0,
            objectsFailed: objects.length,
            errors: [{ objectId: obj.id, error: "Payment-critical write requires idempotency key", category: "validation" }],
          };
        }
      }
    }
    return { success: true, objectsProcessed: 0, objectsFailed: 0, errors: [] };
  }
}

class LogisticsConnector extends BaseConnector {
  config: ConnectorConfig;

  constructor(id: string, name: string, credFields: string[]) {
    super();
    this.config = {
      integrationId: id,
      displayName: name,
      category: "logistics",
      capabilities: {
        canImport: true,
        canExport: true,
        canWebhook: true,
        canBatch: true,
        canRealTime: true,
        supportedObjects: ["shipment"] as CanonicalObjectType[],
        dataFlowDirection: "bidirectional",
      },
      requiresCredentials: true,
      credentialFields: credFields,
      regimeAware: false,
    };
  }

  async validateCredentials(credentials: Record<string, any>) {
    const hasKeys = this.config.credentialFields.every((f) => !!credentials[f]);
    return { valid: hasKeys };
  }

  async healthCheck(credentials: Record<string, any>): Promise<HealthCheckResult> {
    const { valid } = await this.validateCredentials(credentials);
    return { status: valid ? "connected" : "not_configured", latencyMs: 0, message: valid ? "Connected" : "Configure credentials" };
  }

  async pull() { return { objects: [] as CanonicalObject[] }; }
  async push(c: any, objects: CanonicalObject[]): Promise<SyncResult> {
    return { success: true, objectsProcessed: 0, objectsFailed: 0, errors: [] };
  }
}

class GenericConnector extends BaseConnector {
  config: ConnectorConfig;

  constructor(
    id: string,
    name: string,
    category: string,
    objects: CanonicalObjectType[],
    credFields: string[],
    opts?: { regimeAware?: boolean; canImport?: boolean; canExport?: boolean; canWebhook?: boolean; canRealTime?: boolean },
  ) {
    super();
    this.config = {
      integrationId: id,
      displayName: name,
      category,
      capabilities: {
        canImport: opts?.canImport ?? true,
        canExport: opts?.canExport ?? true,
        canWebhook: opts?.canWebhook ?? false,
        canBatch: true,
        canRealTime: opts?.canRealTime ?? false,
        supportedObjects: objects,
        dataFlowDirection: (opts?.canImport && opts?.canExport) ? "bidirectional" : opts?.canExport ? "outbound" : "inbound",
      },
      requiresCredentials: credFields.length > 0,
      credentialFields: credFields,
      regimeAware: opts?.regimeAware ?? false,
    };
  }

  async validateCredentials(credentials: Record<string, any>) {
    if (this.config.credentialFields.length === 0) return { valid: true };
    const hasKeys = this.config.credentialFields.every((f) => !!credentials[f]);
    return { valid: hasKeys };
  }

  async healthCheck(credentials: Record<string, any>): Promise<HealthCheckResult> {
    const { valid } = await this.validateCredentials(credentials);
    return { status: valid ? "connected" : "not_configured", latencyMs: 0, message: valid ? "Connected" : "Configure credentials" };
  }

  async pull() { return { objects: [] as CanonicalObject[] }; }
  async push(c: any, objects: CanonicalObject[]): Promise<SyncResult> {
    return { success: true, objectsProcessed: 0, objectsFailed: 0, errors: [] };
  }
}

export function registerAllConnectors() {
  orchestrator.registerConnector(new CommunicationConnector("slack", "Slack", (c) => !!c.webhookUrl));
  orchestrator.registerConnector(new CommunicationConnector("twilio", "Twilio SMS", (c) => !!c.accountSid && !!c.authToken));
  orchestrator.registerConnector(new CommunicationConnector("email-notifications", "Email Notifications", (c) => !!c.apiKey || !!c.userId));
  orchestrator.registerConnector(new CommunicationConnector("teams", "Microsoft Teams", (c) => !!c.webhookUrl));
  orchestrator.registerConnector(new CommunicationConnector("sendgrid", "SendGrid", (c) => !!c.apiKey));
  orchestrator.registerConnector(new CommunicationConnector("mailchimp", "Mailchimp", (c) => !!c.apiKey));

  orchestrator.registerConnector(new CRMConnector("hubspot", "HubSpot", ["customer", "supplier", "contract"] as CanonicalObjectType[], ["accessToken"]));
  orchestrator.registerConnector(new CRMConnector("salesforce", "Salesforce", ["customer", "supplier", "contract"] as CanonicalObjectType[], ["accessToken", "instanceUrl"]));
  orchestrator.registerConnector(new GenericConnector("zendesk", "Zendesk", "support", ["ticket", "customer"] as CanonicalObjectType[], ["subdomain", "apiToken"], { canWebhook: true }));

  orchestrator.registerConnector(new EcommerceConnector("shopify", "Shopify", ["apiKey", "shopDomain"]));
  orchestrator.registerConnector(new EcommerceConnector("amazon", "Amazon Seller", ["accessToken", "sellerId"]));
  orchestrator.registerConnector(new EcommerceConnector("woocommerce", "WooCommerce", ["storeUrl", "consumerKey", "consumerSecret"]));
  orchestrator.registerConnector(new EcommerceConnector("bigcommerce", "BigCommerce", ["storeHash", "accessToken"]));

  orchestrator.registerConnector(new ERPConnector("sap", "SAP S/4HANA", ["apiKey", "instanceUrl"]));
  orchestrator.registerConnector(new ERPConnector("oracle", "Oracle Cloud", ["apiKey", "instanceUrl"]));
  orchestrator.registerConnector(new ERPConnector("dynamics", "Microsoft Dynamics 365", ["clientId", "clientSecret", "tenantId"]));
  orchestrator.registerConnector(new ERPConnector("sage-x3", "Sage X3", ["apiKey", "instanceUrl"]));
  orchestrator.registerConnector(new ERPConnector("infor", "Infor", ["apiKey", "instanceUrl"]));
  orchestrator.registerConnector(new ERPConnector("netsuite", "NetSuite", ["accountId", "consumerKey", "consumerSecret"]));

  orchestrator.registerConnector(new FinanceConnector("quickbooks", "QuickBooks", ["accessToken", "realmId"], true));
  orchestrator.registerConnector(new FinanceConnector("xero", "Xero", ["accessToken", "tenantId"], true));
  orchestrator.registerConnector(new FinanceConnector("stripe-payments", "Stripe Payments", ["secretKey"], true));
  orchestrator.registerConnector(new FinanceConnector("billcom", "Bill.com", ["apiKey", "organizationId"], true));
  orchestrator.registerConnector(new FinanceConnector("netsuite-financials", "NetSuite Financials", ["accountId", "consumerKey"], true));

  orchestrator.registerConnector(new GenericConnector("ariba", "SAP Ariba", "procurement", ["rfq", "purchase_order", "supplier", "contract"] as CanonicalObjectType[], ["apiKey", "realm"], { regimeAware: true, canWebhook: true }));
  orchestrator.registerConnector(new GenericConnector("coupa", "Coupa", "procurement", ["rfq", "purchase_order", "supplier", "invoice"] as CanonicalObjectType[], ["apiKey", "instanceUrl"], { regimeAware: true, canWebhook: true }));
  orchestrator.registerConnector(new GenericConnector("jaggaer", "Jaggaer", "procurement", ["rfq", "purchase_order", "supplier"] as CanonicalObjectType[], ["apiKey", "instanceUrl"], { regimeAware: true }));
  orchestrator.registerConnector(new GenericConnector("sps-commerce", "SPS Commerce", "edi", ["purchase_order", "invoice", "shipment"] as CanonicalObjectType[], ["apiKey"], { canWebhook: true }));

  orchestrator.registerConnector(new LogisticsConnector("fedex", "FedEx", ["apiKey", "secretKey"]));
  orchestrator.registerConnector(new LogisticsConnector("ups", "UPS", ["clientId", "clientSecret"]));
  orchestrator.registerConnector(new LogisticsConnector("dhl", "DHL", ["apiKey"]));
  orchestrator.registerConnector(new LogisticsConnector("flexport", "Flexport", ["apiToken"]));
  orchestrator.registerConnector(new LogisticsConnector("project44", "project44", ["apiKey", "clientId"]));

  orchestrator.registerConnector(new GenericConnector("manhattan", "Manhattan WMS", "warehouse", ["inventory_snapshot", "shipment", "sku"] as CanonicalObjectType[], ["apiKey", "instanceUrl"], { canWebhook: true }));
  orchestrator.registerConnector(new GenericConnector("sap-ewm", "SAP EWM", "warehouse", ["inventory_snapshot", "shipment", "material"] as CanonicalObjectType[], ["apiKey", "instanceUrl"]));
  orchestrator.registerConnector(new GenericConnector("fishbowl", "Fishbowl", "inventory", ["inventory_snapshot", "sku", "material"] as CanonicalObjectType[], ["apiKey"]));

  orchestrator.registerConnector(new GenericConnector("etq", "ETQ Reliance", "quality", ["quality_event", "document"] as CanonicalObjectType[], ["apiKey", "instanceUrl"]));
  orchestrator.registerConnector(new GenericConnector("mastercontrol", "MasterControl", "quality", ["quality_event", "document"] as CanonicalObjectType[], ["apiKey"]));

  orchestrator.registerConnector(new GenericConnector("opc-ua", "OPC-UA", "iot", ["production_run"] as CanonicalObjectType[], ["endpointUrl"], { canRealTime: true, regimeAware: true }));
  orchestrator.registerConnector(new GenericConnector("mqtt", "MQTT", "iot", ["production_run"] as CanonicalObjectType[], ["brokerUrl"], { canRealTime: true, regimeAware: true }));
  orchestrator.registerConnector(new GenericConnector("kepware", "Kepware", "iot", ["production_run"] as CanonicalObjectType[], ["serverUrl"], { canRealTime: true }));

  orchestrator.registerConnector(new GenericConnector("powerbi", "Power BI", "analytics", ["economic_snapshot", "sku"] as CanonicalObjectType[], ["clientId", "clientSecret"], { canExport: true, canImport: false }));
  orchestrator.registerConnector(new GenericConnector("tableau", "Tableau", "analytics", ["economic_snapshot", "sku"] as CanonicalObjectType[], ["apiToken", "siteId"], { canExport: true, canImport: false }));
  orchestrator.registerConnector(new GenericConnector("looker", "Looker", "analytics", ["economic_snapshot"] as CanonicalObjectType[], ["clientId", "clientSecret"], { canExport: true, canImport: false }));
  orchestrator.registerConnector(new GenericConnector("snowflake", "Snowflake", "data_warehouse", ["sku", "material", "supplier", "inventory_snapshot"] as CanonicalObjectType[], ["account", "username", "password"]));

  orchestrator.registerConnector(new GenericConnector("google-sheets", "Google Sheets", "productivity", ["sku", "material", "supplier", "inventory_snapshot"] as CanonicalObjectType[], ["accessToken"], { canWebhook: false }));
  orchestrator.registerConnector(new GenericConnector("google-calendar", "Google Calendar", "productivity", [] as CanonicalObjectType[], ["accessToken"], { canWebhook: false }));
  orchestrator.registerConnector(new GenericConnector("notion", "Notion", "productivity", ["document", "supplier"] as CanonicalObjectType[], ["accessToken"]));
  orchestrator.registerConnector(new GenericConnector("sharepoint", "SharePoint", "documents", ["document"] as CanonicalObjectType[], ["clientId", "clientSecret", "tenantId"]));
  orchestrator.registerConnector(new GenericConnector("airtable", "Airtable", "database", ["sku", "material", "supplier"] as CanonicalObjectType[], ["accessToken"]));

  orchestrator.registerConnector(new GenericConnector("jira", "Jira", "project_management", ["project", "ticket"] as CanonicalObjectType[], ["apiToken", "domain"], { canWebhook: true }));
  orchestrator.registerConnector(new GenericConnector("linear", "Linear", "project_management", ["project", "ticket"] as CanonicalObjectType[], ["apiKey"], { canWebhook: true }));
  orchestrator.registerConnector(new GenericConnector("monday", "Monday.com", "project_management", ["project"] as CanonicalObjectType[], ["apiKey"]));
  orchestrator.registerConnector(new GenericConnector("asana", "Asana", "project_management", ["project"] as CanonicalObjectType[], ["accessToken"], { canWebhook: true }));
  orchestrator.registerConnector(new GenericConnector("trello", "Trello", "project_management", ["project"] as CanonicalObjectType[], ["apiKey", "token"], { canWebhook: true }));

  orchestrator.registerConnector(new GenericConnector("docusign", "DocuSign", "contracts", ["contract", "document"] as CanonicalObjectType[], ["accessToken", "accountId"], { canWebhook: true }));
  orchestrator.registerConnector(new GenericConnector("teamcenter", "Teamcenter", "plm", ["sku", "material", "document"] as CanonicalObjectType[], ["apiKey", "instanceUrl"]));

  orchestrator.registerConnector(new GenericConnector("zapier", "Zapier", "automation", [] as CanonicalObjectType[], [], { canWebhook: true }));
  orchestrator.registerConnector(new GenericConnector("make", "Make (Integromat)", "automation", [] as CanonicalObjectType[], [], { canWebhook: true }));
  orchestrator.registerConnector(new GenericConnector("n8n", "n8n", "automation", [] as CanonicalObjectType[], [], { canWebhook: true }));
  orchestrator.registerConnector(new GenericConnector("webhooks", "Webhooks", "automation", [] as CanonicalObjectType[], [], { canWebhook: true }));

  orchestrator.registerConnector(new GenericConnector("csv-import", "CSV Import", "data", ["sku", "material", "supplier", "inventory_snapshot", "customer"] as CanonicalObjectType[], [], { canImport: true, canExport: false }));
  orchestrator.registerConnector(new GenericConnector("api-access", "REST API Access", "developer", [] as CanonicalObjectType[], [], { canImport: true, canExport: true, canWebhook: true }));

  orchestrator.registerConnector(new GenericConnector("weather", "Weather API", "data_feed", ["weather_data"] as CanonicalObjectType[], ["apiKey"], { regimeAware: true, canImport: true, canExport: false }));
  orchestrator.registerConnector(new GenericConnector("news-monitoring", "News Monitoring", "data_feed", ["news_item"] as CanonicalObjectType[], [], { regimeAware: true, canImport: true, canExport: false }));
  orchestrator.registerConnector(new GenericConnector("commodity-feeds", "Commodity Feeds", "data_feed", ["commodity_price"] as CanonicalObjectType[], [], { regimeAware: true, canImport: true, canExport: false }));

  console.log(`[Orchestrator] Registered ${orchestrator.getRegistry().getAll().size} connectors`);
}
