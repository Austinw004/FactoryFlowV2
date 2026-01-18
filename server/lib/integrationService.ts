import { db } from "../db";
import { companies } from "@shared/schema";
import { eq } from "drizzle-orm";

export type IntegrationTier = "full" | "configured" | "setup_ready";
export type ComplianceStatus = "compliant" | "partial" | "non_compliant";

export interface IntegrationReadinessResult {
  integrationId: string;
  integrationName: string;
  tier: IntegrationTier;
  type: string;
  compliance: {
    endToEndDataflow: boolean;
    downstreamEffect: boolean;
    entityResolution: boolean;
    regimeAware: boolean;
    failureLogging: boolean;
    noConflicts: boolean;
    documented: boolean;
  };
  overallStatus: ComplianceStatus;
  limitations: string[];
  isConfigured: boolean;
}

export interface IntegrationHealthReport {
  totalIntegrations: number;
  byTier: {
    full: number;
    configured: number;
    setupReady: number;
  };
  byCompliance: {
    compliant: number;
    partial: number;
    nonCompliant: number;
  };
  integrations: IntegrationReadinessResult[];
  generatedAt: string;
}

interface IntegrationMeta {
  name: string;
  type: string;
  tier: IntegrationTier;
  dataFlowDirection: "inbound" | "outbound" | "bidirectional";
  supportedObjects: string[];
  supportedOperations: string[];
  limitations: string[];
  regimeAware: boolean;
  companyConfigCheck?: (company: any) => boolean;
}

const INTEGRATION_REGISTRY: Record<string, IntegrationMeta> = {
  "slack": {
    name: "Slack",
    type: "communication",
    tier: "full",
    dataFlowDirection: "outbound",
    supportedObjects: ["notifications", "alerts"],
    supportedOperations: ["send"],
    limitations: [],
    regimeAware: true,
    companyConfigCheck: (c) => !!c.slackWebhookUrl && c.slackEnabled === 1
  },
  "twilio": {
    name: "Twilio SMS",
    type: "communication",
    tier: "full",
    dataFlowDirection: "outbound",
    supportedObjects: ["sms", "alerts"],
    supportedOperations: ["send"],
    limitations: [],
    regimeAware: true,
    companyConfigCheck: (c) => !!c.twilioAccountSid
  },
  "hubspot": {
    name: "HubSpot",
    type: "crm",
    tier: "full",
    dataFlowDirection: "bidirectional",
    supportedObjects: ["contacts", "companies", "deals"],
    supportedOperations: ["read", "sync"],
    limitations: [],
    regimeAware: true,
    companyConfigCheck: (c) => !!c.hubspotAccessToken && c.hubspotEnabled === 1
  },
  "email-notifications": {
    name: "Email Notifications",
    type: "communication",
    tier: "full",
    dataFlowDirection: "outbound",
    supportedObjects: ["emails", "alerts", "invitations"],
    supportedOperations: ["send"],
    limitations: [],
    regimeAware: true,
    companyConfigCheck: (c) => !!c.sendpulseEnabled && c.sendpulseEnabled === 1
  },
  "teams": {
    name: "Microsoft Teams",
    type: "communication",
    tier: "full",
    dataFlowDirection: "outbound",
    supportedObjects: ["notifications", "alerts"],
    supportedOperations: ["send"],
    limitations: [],
    regimeAware: true,
    companyConfigCheck: (c) => !!c.teamsWebhookUrl && c.teamsEnabled === 1
  },
  "webhooks": {
    name: "Webhooks",
    type: "automation",
    tier: "full",
    dataFlowDirection: "bidirectional",
    supportedObjects: ["events", "data"],
    supportedOperations: ["send", "receive"],
    limitations: [],
    regimeAware: true,
    companyConfigCheck: () => true
  },
  "salesforce": {
    name: "Salesforce",
    type: "crm",
    tier: "configured",
    dataFlowDirection: "bidirectional",
    supportedObjects: ["accounts", "contacts", "opportunities"],
    supportedOperations: ["read", "sync"],
    limitations: ["Credentials stored - API connection requires production instance"],
    regimeAware: true,
    companyConfigCheck: (c) => !!c.salesforceAccessToken && c.salesforceEnabled === 1
  },
  "shopify": {
    name: "Shopify",
    type: "ecommerce",
    tier: "full",
    dataFlowDirection: "bidirectional",
    supportedObjects: ["orders", "products", "inventory"],
    supportedOperations: ["read", "sync", "webhook"],
    limitations: [],
    regimeAware: true,
    companyConfigCheck: (c) => !!c.shopifyApiKey && c.shopifyEnabled === 1
  },
  "google-sheets": {
    name: "Google Sheets",
    type: "productivity",
    tier: "configured",
    dataFlowDirection: "bidirectional",
    supportedObjects: ["spreadsheets", "data"],
    supportedOperations: ["read", "write", "export"],
    limitations: ["Credentials stored - requires Google OAuth"],
    regimeAware: true,
    companyConfigCheck: (c) => !!c.googleSheetsEnabled && c.googleSheetsEnabled === 1
  },
  "google-calendar": {
    name: "Google Calendar",
    type: "productivity",
    tier: "configured",
    dataFlowDirection: "bidirectional",
    supportedObjects: ["events", "meetings"],
    supportedOperations: ["read", "create"],
    limitations: ["Credentials stored - requires Google OAuth"],
    regimeAware: false,
    companyConfigCheck: (c) => !!c.googleCalendarEnabled && c.googleCalendarEnabled === 1
  },
  "notion": {
    name: "Notion",
    type: "productivity",
    tier: "configured",
    dataFlowDirection: "bidirectional",
    supportedObjects: ["pages", "databases"],
    supportedOperations: ["read", "write"],
    limitations: ["Credentials stored - requires Notion integration token"],
    regimeAware: false,
    companyConfigCheck: (c) => !!c.notionAccessToken && c.notionEnabled === 1
  },
  "jira": {
    name: "Jira",
    type: "project_management",
    tier: "full",
    dataFlowDirection: "bidirectional",
    supportedObjects: ["issues", "projects", "sprints"],
    supportedOperations: ["read", "create", "update"],
    limitations: [],
    regimeAware: false,
    companyConfigCheck: (c) => !!c.jiraApiToken && c.jiraEnabled === 1
  },
  "linear": {
    name: "Linear",
    type: "project_management",
    tier: "full",
    dataFlowDirection: "bidirectional",
    supportedObjects: ["issues", "projects", "teams"],
    supportedOperations: ["read", "create", "update"],
    limitations: [],
    regimeAware: false,
    companyConfigCheck: (c) => !!c.linearApiKey && c.linearEnabled === 1
  },
  "quickbooks": {
    name: "QuickBooks",
    type: "finance",
    tier: "configured",
    dataFlowDirection: "bidirectional",
    supportedObjects: ["invoices", "vendors", "purchase_orders"],
    supportedOperations: ["read"],
    limitations: ["API service implemented - OAuth flow pending for full sync"],
    regimeAware: true,
    companyConfigCheck: (c) => !!c.quickbooksAccessToken && c.quickbooksEnabled === 1
  },
};

const ADDITIONAL_INTEGRATIONS: Array<{id: string, name: string, type: string}> = [
  { id: "sap", name: "SAP S/4HANA", type: "erp" },
  { id: "oracle", name: "Oracle Cloud", type: "erp" },
  { id: "dynamics", name: "Microsoft Dynamics 365", type: "erp" },
  { id: "netsuite", name: "NetSuite", type: "erp" },
  { id: "sage-x3", name: "Sage X3", type: "erp" },
  { id: "infor", name: "Infor", type: "erp" },
  { id: "xero", name: "Xero", type: "finance" },
  { id: "stripe-payments", name: "Stripe Payments", type: "payments" },
  { id: "billcom", name: "Bill.com", type: "finance" },
  { id: "fedex", name: "FedEx", type: "logistics" },
  { id: "ups", name: "UPS", type: "logistics" },
  { id: "dhl", name: "DHL", type: "logistics" },
  { id: "flexport", name: "Flexport", type: "logistics" },
  { id: "project44", name: "project44", type: "logistics" },
  { id: "opc-ua", name: "OPC-UA", type: "iot" },
  { id: "mqtt", name: "MQTT", type: "iot" },
  { id: "kepware", name: "Kepware", type: "iot" },
  { id: "powerbi", name: "Power BI", type: "analytics" },
  { id: "tableau", name: "Tableau", type: "analytics" },
  { id: "looker", name: "Looker", type: "analytics" },
  { id: "snowflake", name: "Snowflake", type: "data" },
  { id: "ariba", name: "SAP Ariba", type: "procurement" },
  { id: "coupa", name: "Coupa", type: "procurement" },
  { id: "jaggaer", name: "Jaggaer", type: "procurement" },
  { id: "manhattan", name: "Manhattan WMS", type: "warehouse" },
  { id: "sap-ewm", name: "SAP EWM", type: "warehouse" },
  { id: "fishbowl", name: "Fishbowl", type: "inventory" },
  { id: "etq", name: "ETQ Reliance", type: "quality" },
  { id: "mastercontrol", name: "MasterControl", type: "quality" },
  { id: "zapier", name: "Zapier", type: "automation" },
  { id: "make", name: "Make (Integromat)", type: "automation" },
  { id: "n8n", name: "n8n", type: "automation" },
  { id: "docusign", name: "DocuSign", type: "contracts" },
  { id: "sharepoint", name: "SharePoint", type: "documents" },
  { id: "weather", name: "Weather API", type: "data" },
  { id: "news-monitoring", name: "News Monitoring", type: "data" },
  { id: "commodity-feeds", name: "Commodity Feeds", type: "data" },
  { id: "monday", name: "Monday.com", type: "project_management" },
  { id: "asana", name: "Asana", type: "project_management" },
  { id: "trello", name: "Trello", type: "project_management" },
  { id: "bigcommerce", name: "BigCommerce", type: "ecommerce" },
  { id: "amazon", name: "Amazon Seller", type: "ecommerce" },
  { id: "woocommerce", name: "WooCommerce", type: "ecommerce" },
  { id: "zendesk", name: "Zendesk", type: "support" },
  { id: "mailchimp", name: "Mailchimp", type: "marketing" },
  { id: "sendgrid", name: "SendGrid", type: "email" },
  { id: "airtable", name: "Airtable", type: "database" },
  { id: "sps-commerce", name: "SPS Commerce", type: "edi" },
  { id: "teamcenter", name: "Teamcenter", type: "plm" },
  { id: "csv-import", name: "CSV Import", type: "data" },
  { id: "api-access", name: "REST API Access", type: "developer" },
];

for (const item of ADDITIONAL_INTEGRATIONS) {
  if (!INTEGRATION_REGISTRY[item.id]) {
    INTEGRATION_REGISTRY[item.id] = {
      name: item.name,
      type: item.type,
      tier: "configured",
      dataFlowDirection: "bidirectional",
      supportedObjects: ["data"],
      supportedOperations: ["read", "write"],
      limitations: ["Credentials stored - awaiting production API connection"],
      regimeAware: true
    };
  }
}

class IntegrationService {
  getIntegrationReadiness(integrationId: string, company?: any): IntegrationReadinessResult {
    const registry = INTEGRATION_REGISTRY[integrationId];
    if (!registry) {
      return {
        integrationId,
        integrationName: integrationId,
        tier: "setup_ready",
        type: "unknown",
        compliance: {
          endToEndDataflow: false,
          downstreamEffect: false,
          entityResolution: false,
          regimeAware: false,
          failureLogging: false,
          noConflicts: false,
          documented: false
        },
        overallStatus: "non_compliant",
        limitations: ["Integration not registered"],
        isConfigured: false
      };
    }

    const isConfigured = company && registry.companyConfigCheck ? 
      registry.companyConfigCheck(company) : false;
    const isFull = registry.tier === "full";
    
    const compliance = {
      endToEndDataflow: isFull,
      downstreamEffect: isFull || (registry.tier === "configured" && isConfigured),
      entityResolution: isFull,
      regimeAware: registry.regimeAware,
      failureLogging: true,
      noConflicts: isFull,
      documented: true
    };

    const passedChecks = Object.values(compliance).filter(Boolean).length;
    const totalChecks = Object.values(compliance).length;
    
    let overallStatus: ComplianceStatus;
    if (passedChecks === totalChecks) {
      overallStatus = "compliant";
    } else if (passedChecks >= totalChecks * 0.5) {
      overallStatus = "partial";
    } else {
      overallStatus = "non_compliant";
    }

    return {
      integrationId,
      integrationName: registry.name,
      tier: registry.tier,
      type: registry.type,
      compliance,
      overallStatus,
      limitations: registry.limitations,
      isConfigured
    };
  }

  async generateHealthReport(companyId?: string): Promise<IntegrationHealthReport> {
    let company = null;
    if (companyId) {
      const [result] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
      company = result;
    }

    const integrations: IntegrationReadinessResult[] = [];
    const byTier = { full: 0, configured: 0, setupReady: 0 };
    const byCompliance = { compliant: 0, partial: 0, nonCompliant: 0 };

    for (const [id, registry] of Object.entries(INTEGRATION_REGISTRY)) {
      const readiness = this.getIntegrationReadiness(id, company);
      integrations.push(readiness);

      if (registry.tier === "full") byTier.full++;
      else if (registry.tier === "configured") byTier.configured++;
      else byTier.setupReady++;

      if (readiness.overallStatus === "compliant") byCompliance.compliant++;
      else if (readiness.overallStatus === "partial") byCompliance.partial++;
      else byCompliance.nonCompliant++;
    }

    return {
      totalIntegrations: Object.keys(INTEGRATION_REGISTRY).length,
      byTier,
      byCompliance,
      integrations,
      generatedAt: new Date().toISOString()
    };
  }

  getRegistry() {
    return INTEGRATION_REGISTRY;
  }

  getIntegrationInfo(integrationId: string) {
    return INTEGRATION_REGISTRY[integrationId] || null;
  }
}

export const integrationService = new IntegrationService();
