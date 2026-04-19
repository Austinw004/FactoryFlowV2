import { useState } from "react";
import { useLocation } from "wouter";
import { Check, ArrowUpRight, ExternalLink } from "lucide-react";

// Catalog of integration connectors. Each entry here is either "available now"
// (wired, configurable during onboarding) or "on request" (supported via our
// REST API / webhooks, but we set it up for you). We mark status honestly so
// customers know exactly what to expect.

type IntegrationStatus = "available" | "on-request";
interface Integration {
  name: string;
  id: string;
  status: IntegrationStatus;
}

const integrationCategories: Record<string, Integration[]> = {
  "ERP & Finance": [
    { name: "SAP S/4HANA", id: "sap", status: "on-request" },
    { name: "Oracle", id: "oracle", status: "on-request" },
    { name: "Microsoft Dynamics", id: "dynamics", status: "on-request" },
    { name: "Sage X3", id: "sage-x3", status: "on-request" },
    { name: "Infor", id: "infor", status: "on-request" },
    { name: "NetSuite", id: "netsuite-financials", status: "on-request" },
    { name: "QuickBooks", id: "quickbooks", status: "on-request" },
    { name: "Xero", id: "xero", status: "on-request" },
    { name: "Stripe", id: "stripe-payments", status: "available" },
  ],
  "E-commerce": [
    { name: "Shopify", id: "shopify", status: "on-request" },
    { name: "Amazon Seller Central", id: "amazon", status: "on-request" },
    { name: "WooCommerce", id: "woocommerce", status: "on-request" },
    { name: "BigCommerce", id: "bigcommerce", status: "on-request" },
  ],
  "Shipping & Logistics": [
    { name: "FedEx", id: "fedex", status: "on-request" },
    { name: "UPS", id: "ups", status: "on-request" },
    { name: "DHL", id: "dhl", status: "on-request" },
    { name: "Flexport", id: "flexport", status: "on-request" },
    { name: "Project44", id: "project44", status: "on-request" },
  ],
  "CRM & Sales": [
    { name: "Salesforce", id: "salesforce", status: "on-request" },
    { name: "HubSpot", id: "hubspot", status: "on-request" },
  ],
  "Work Management": [
    { name: "Jira", id: "jira", status: "on-request" },
    { name: "Linear", id: "linear", status: "on-request" },
    { name: "Asana", id: "asana", status: "on-request" },
    { name: "Monday", id: "monday", status: "on-request" },
    { name: "Notion", id: "notion", status: "on-request" },
  ],
  "Communication & Notifications": [
    { name: "Slack", id: "slack", status: "on-request" },
    { name: "Microsoft Teams", id: "teams", status: "on-request" },
    { name: "Email notifications", id: "email-notifications", status: "available" },
    { name: "SendGrid", id: "sendgrid", status: "on-request" },
    { name: "Twilio SMS", id: "twilio", status: "on-request" },
  ],
  "Analytics & BI": [
    { name: "Power BI", id: "powerbi", status: "on-request" },
    { name: "Tableau", id: "tableau", status: "on-request" },
    { name: "Looker", id: "looker", status: "on-request" },
    { name: "Snowflake", id: "snowflake", status: "on-request" },
  ],
  "Procurement & Supply": [
    { name: "Ariba", id: "ariba", status: "on-request" },
    { name: "Coupa", id: "coupa", status: "on-request" },
    { name: "SPS Commerce", id: "sps-commerce", status: "on-request" },
    { name: "Jaggaer", id: "jaggaer", status: "on-request" },
  ],
  "Operations & Manufacturing": [
    { name: "Manhattan Associates", id: "manhattan", status: "on-request" },
    { name: "SAP EWM", id: "sap-ewm", status: "on-request" },
    { name: "Fishbowl", id: "fishbowl", status: "on-request" },
    { name: "Teamcenter", id: "teamcenter", status: "on-request" },
    { name: "OPC-UA", id: "opc-ua", status: "on-request" },
    { name: "MQTT", id: "mqtt", status: "on-request" },
    { name: "Kepware", id: "kepware", status: "on-request" },
  ],
  "Productivity & Data": [
    { name: "Google Sheets", id: "google-sheets", status: "on-request" },
    { name: "Airtable", id: "airtable", status: "on-request" },
    { name: "DocuSign", id: "docusign", status: "on-request" },
    { name: "CSV Import", id: "csv-import", status: "available" },
  ],
  "Platform & Automation": [
    { name: "REST API", id: "api-access", status: "available" },
    { name: "Webhooks", id: "webhooks", status: "available" },
    { name: "Zapier", id: "zapier", status: "available" },
    { name: "Make", id: "make", status: "available" },
    { name: "n8n", id: "n8n", status: "available" },
    { name: "MuleSoft", id: "mulesoft", status: "available" },
    { name: "Boomi", id: "boomi", status: "available" },
    { name: "Workato", id: "workato", status: "available" },
  ],
};

export function Integrations() {
  const [, setLocation] = useLocation();
  const [expandedCategory, setExpandedCategory] = useState<string | null>("Platform & Automation");

  function handleRequest(name: string) {
    const subject = encodeURIComponent(`Integration request: ${name}`);
    const body = encodeURIComponent(
      `Hi Prescient Labs team,\n\nWe'd like to enable the ${name} integration on our account.\n\n— `
    );
    window.location.href = `mailto:info@prescient-labs.com?subject=${subject}&body=${body}`;
  }

  function handleConfigure(id: string) {
    // Two available self-serve integrations live elsewhere in the product.
    if (id === "webhooks") return setLocation("/webhook-integrations");
    if (id === "api-access") return setLocation("/api-docs");
    if (id === "stripe-payments") return setLocation("/billing");
    if (id === "email-notifications") return setLocation("/notification-settings");
    // For the rest, request-to-configure flow.
    handleRequest(id);
  }

  return (
    <div className="min-h-screen bg-background p-8 lg:p-12">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Integrations</div>
          <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight mb-4">Integrations</h1>
          <p className="text-muted-foreground text-sm lg:text-base max-w-3xl leading-relaxed">
            Prescient Labs ships with native webhooks, a REST API, and integration platform hooks for
            Zapier, Make, n8n, MuleSoft, Boomi, and Workato. Named systems below are supported through
            our API and onboarded with you during your pilot. Request the connectors you need and our
            team configures them on your tenant.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => setLocation("/webhook-integrations")}
              className="text-sm px-4 py-2 rounded-md border border-border bg-card hover:bg-muted transition-colors"
              data-testid="button-manage-webhooks"
            >
              Manage webhooks
            </button>
            <button
              onClick={() => setLocation("/api-docs")}
              className="text-sm px-4 py-2 rounded-md border border-border bg-card hover:bg-muted transition-colors"
              data-testid="button-api-docs"
            >
              API documentation
            </button>
            <button
              onClick={() => setLocation("/contact")}
              className="text-sm px-4 py-2 rounded-md bg-foreground text-background hover:opacity-90 transition-opacity"
              data-testid="button-contact-integrations"
            >
              Talk to integrations team
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {Object.entries(integrationCategories).map(([category, integrations]) => {
            const availableCount = integrations.filter((i) => i.status === "available").length;
            const isOpen = expandedCategory === category;
            return (
              <div key={category} className="border-t border-border pt-6">
                <button
                  onClick={() => setExpandedCategory(isOpen ? null : category)}
                  className="flex items-center justify-between w-full mb-4 group"
                  data-testid={`category-toggle-${category.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  <div className="text-sm font-medium tracking-tight">{category}</div>
                  <div className="text-xs text-muted-foreground">
                    {availableCount > 0
                      ? `${availableCount} self-serve · ${integrations.length - availableCount} on request`
                      : `${integrations.length} on request`}
                  </div>
                </button>

                {isOpen && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {integrations.map((integration) => (
                      <div
                        key={integration.id}
                        className="border border-border rounded-md p-4 flex items-start justify-between hover:bg-muted/30 transition-colors"
                        data-testid={`integration-card-${integration.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm mb-1 truncate">{integration.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                            {integration.status === "available" ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-600" />
                                <span>Self-serve</span>
                              </>
                            ) : (
                              <span>Available on request</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleConfigure(integration.id)}
                          className="text-xs px-3 py-1.5 rounded border border-border hover:bg-background ml-3 shrink-0 inline-flex items-center gap-1"
                          data-testid={`button-configure-${integration.id}`}
                        >
                          {integration.status === "available" ? "Configure" : "Request"}
                          <ArrowUpRight className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-border mt-12 pt-6">
          <p className="text-xs text-muted-foreground">
            Need a connector not listed here?{" "}
            <a
              href="mailto:info@prescient-labs.com?subject=Integration%20request"
              className="underline hover:text-foreground inline-flex items-center gap-1"
            >
              info@prescient-labs.com
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Integrations;
