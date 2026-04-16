import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ExternalLink, Plus, Trash2, Settings } from "lucide-react";

// Define integration categories and groupings
const integrationCategories = {
  "ERP & Finance": [
    { name: "SAP S/4HANA", id: "sap" },
    { name: "Oracle", id: "oracle" },
    { name: "Microsoft Dynamics", id: "dynamics" },
    { name: "Sage X3", id: "sage-x3" },
    { name: "Infor", id: "infor" },
    { name: "NetSuite", id: "netsuite-financials" },
    { name: "QuickBooks", id: "quickbooks" },
    { name: "Xero", id: "xero" },
    { name: "Stripe", id: "stripe-payments" },
    { name: "BillCom", id: "billcom" },
  ],
  "E-commerce": [
    { name: "Shopify", id: "shopify" },
    { name: "Amazon Seller Central", id: "amazon" },
    { name: "WooCommerce", id: "woocommerce" },
    { name: "BigCommerce", id: "bigcommerce" },
  ],
  "Shipping & Logistics": [
    { name: "FedEx", id: "fedex" },
    { name: "UPS", id: "ups" },
    { name: "DHL", id: "dhl" },
    { name: "Flexport", id: "flexport" },
    { name: "Project44", id: "project44" },
  ],
  "CRM & Sales": [
    { name: "Salesforce", id: "salesforce" },
    { name: "HubSpot", id: "hubspot" },
  ],
  "Work Management": [
    { name: "Jira", id: "jira" },
    { name: "Linear", id: "linear" },
    { name: "Asana", id: "asana" },
    { name: "Monday", id: "monday" },
    { name: "Trello", id: "trello" },
    { name: "Notion", id: "notion" },
  ],
  "Marketing": [
    { name: "Mailchimp", id: "mailchimp" },
    { name: "SendGrid", id: "sendgrid" },
  ],
  "Support": [
    { name: "Zendesk", id: "zendesk" },
  ],
  "Analytics & BI": [
    { name: "Power BI", id: "powerbi" },
    { name: "Tableau", id: "tableau" },
    { name: "Looker", id: "looker" },
    { name: "Snowflake", id: "snowflake" },
  ],
  "Productivity & Data": [
    { name: "Microsoft Teams", id: "teams" },
    { name: "Google Calendar", id: "google-calendar" },
    { name: "Google Sheets", id: "google-sheets" },
    { name: "Airtable", id: "airtable" },
    { name: "DocuSign", id: "docusign" },
    { name: "Email Notifications", id: "email-notifications" },
    { name: "Twilio SMS", id: "twilio" },
    { name: "Slack", id: "slack" },
    { name: "CSV Import", id: "csv-import" },
  ],
  "Procurement & Supply": [
    { name: "Ariba", id: "ariba" },
    { name: "Coupa", id: "coupa" },
    { name: "SPS Commerce", id: "sps-commerce" },
    { name: "Jaggaer", id: "jaggaer" },
  ],
  "Operations & Manufacturing": [
    { name: "Manhattan Associates", id: "manhattan" },
    { name: "SAP EWM", id: "sap-ewm" },
    { name: "Fishbowl", id: "fishbowl" },
    { name: "Teamcenter", id: "teamcenter" },
    { name: "ETQ", id: "etq" },
    { name: "MasterControl", id: "mastercontrol" },
    { name: "OPC-UA", id: "opc-ua" },
    { name: "MQTT", id: "mqtt" },
    { name: "Kepware", id: "kepware" },
  ],
  "Automations": [
    { name: "Zapier", id: "zapier" },
    { name: "Make", id: "make" },
    { name: "n8n", id: "n8n" },
    { name: "REST API", id: "api-access" },
    { name: "Webhooks", id: "webhooks" },
  ],
};

interface ConfiguredIntegration {
  id: string;
  integration_id: string;
  configuration: Record<string, any>;
  created_at: string;
}

export function Integrations() {
  const { toast } = useToast();
  const [expandedCategory, setExpandedCategory] = useState<string | null>("ERP & Finance");

  const { data: configuredIntegrations, isLoading } = useQuery<ConfiguredIntegration[]>({
    queryKey: ["/api/configured-integrations"],
  });

  const getIsConfigured = (integrationId: string): boolean => {
    return (configuredIntegrations || []).some(
      (config) => config.integration_id === integrationId
    );
  };

  const handleConnect = (integrationId: string) => {
    // Route to configuration dialog or page
    window.location.href = `/integrations/${integrationId}/configure`;
  };

  const handleRemove = async (integrationId: string) => {
    try {
      await apiRequest("DELETE", `/api/configured-integrations/${integrationId}`);
      queryClient.invalidateQueries({ queryKey: ["/api/configured-integrations"] });
      toast({
        description: "Integration removed successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Failed to remove integration",
      });
    }
  };

  return (
    <div className="min-h-screen bg-ink text-bone p-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="eyebrow mb-4">Integrations</div>
          <h1 className="hero text-5xl leading-tight mb-6">Connect your stack.</h1>
          <p className="text-soft text-base max-w-2xl leading-relaxed">
            Configure and manage connections to your business systems. All integrations sync data in real-time to power demand forecasting, supply chain visibility, and operational intelligence.
          </p>
        </div>

        {/* Integration Categories */}
        <div className="space-y-8">
          {Object.entries(integrationCategories).map(([category, integrations]) => (
            <div key={category} className="border-t border-line pt-8">
              <button
                onClick={() =>
                  setExpandedCategory(expandedCategory === category ? null : category)
                }
                className="flex items-center justify-between w-full mb-6 group"
              >
                <div className="eyebrow text-left">{category}</div>
                <div className="text-muted text-xs mono">
                  {integrations.filter((i) => getIsConfigured(i.id)).length} of{" "}
                  {integrations.length} connected
                </div>
              </button>

              {expandedCategory === category && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-line">
                  {integrations.map((integration) => {
                    const isConfigured = getIsConfigured(integration.id);
                    return (
                      <div
                        key={integration.id}
                        className="bg-ink p-6 flex items-start justify-between group hover:bg-panel transition-colors"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-bone mb-1">{integration.name}</div>
                          <div className="text-xs text-muted">
                            {isConfigured ? (
                              <span className="text-good">Connected</span>
                            ) : (
                              <span>Not connected</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {isConfigured && (
                            <button
                              onClick={() => handleRemove(integration.id)}
                              className="p-1.5 text-muted hover:text-bad hover:bg-bad/10 rounded transition-colors"
                              title="Remove integration"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleConnect(integration.id)}
                            className={`p-1.5 rounded transition-colors ${
                              isConfigured
                                ? "text-muted hover:text-bone hover:bg-line"
                                : "text-signal hover:text-bone hover:bg-signal/10"
                            }`}
                            title={isConfigured ? "Manage integration" : "Connect integration"}
                          >
                            {isConfigured ? (
                              <Settings className="w-4 h-4" />
                            ) : (
                              <Plus className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="border-t border-line mt-12 pt-8">
          <p className="mono text-xs text-muted">
            Plus custom webhooks and REST API for anything else. Configure authentication in integration settings.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Integrations;
