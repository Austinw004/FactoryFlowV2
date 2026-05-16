import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Check, ArrowUpRight, ExternalLink, Zap, Webhook, Code2, Search, MessageSquare, Activity } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Shape returned by GET /api/integrations/health. Mirrors what the server
// already produces (server/lib/integrationOrchestrator + healthChecker).
interface IntegrationHealthResponse {
  overall: "healthy" | "degraded" | "critical" | "unknown";
  summary: {
    healthy: number;
    configured: number;
    degraded: number;
    offline: number;
    notConfigured: number;
    total: number;
  };
  avgLatencyMs?: number;
  byCategory?: Record<string, Array<{
    integration: string;
    status: "healthy" | "configured" | "degraded" | "offline" | "not_configured" | string;
    latencyMs?: number;
    message?: string;
    category?: string;
    lastError?: string;
  }>>;
}

/**
 * Integrations catalog.
 *
 * Status meanings (be honest with customers — never overstate "available"):
 *   - "self-serve" : Customer can connect it themselves in <5 minutes from
 *                    inside the app. Either OAuth, webhook URL paste, or
 *                    API key paste. No emails to our team required.
 *   - "managed"    : We set it up for you during onboarding using your
 *                    credentials. Common for enterprise systems where the
 *                    OAuth app needs admin-level provisioning anyway.
 *   - "platform"   : Build any integration yourself via this automation
 *                    platform. Wide reach for one customer click.
 */
type IntegrationStatus = "self-serve" | "managed" | "platform";
interface Integration {
  name: string;
  id: string;
  status: IntegrationStatus;
  description?: string;
  setupVia?: "oauth" | "webhook-url" | "api-key" | "csv" | "platform" | "in-app";
}

const integrationCategories: Record<string, Integration[]> = {
  "Communication & Notifications": [
    { name: "Slack", id: "slack", status: "self-serve", setupVia: "webhook-url", description: "Paste your Slack channel webhook URL — alerts arrive in seconds." },
    { name: "Microsoft Teams", id: "teams", status: "self-serve", setupVia: "webhook-url", description: "Paste your Teams Incoming Webhook URL — same flow as Slack." },
    { name: "Discord", id: "discord", status: "self-serve", setupVia: "webhook-url", description: "Paste your Discord webhook URL." },
    { name: "Email notifications", id: "email-notifications", status: "self-serve", setupVia: "in-app", description: "Configure who gets which alert from Settings → Notifications." },
    { name: "Twilio SMS", id: "twilio", status: "managed", description: "Paste your Twilio SID + token; we route alerts to phone numbers." },
    { name: "SendGrid", id: "sendgrid", status: "managed", description: "Custom branded transactional email." },
  ],
  "ERP & Finance": [
    { name: "QuickBooks", id: "quickbooks", status: "managed", description: "Pulls invoice / vendor history. We onboard during pilot." },
    { name: "NetSuite", id: "netsuite-financials", status: "managed" },
    { name: "Xero", id: "xero", status: "managed" },
    { name: "Stripe", id: "stripe-payments", status: "self-serve", setupVia: "in-app", description: "Manage subscription, invoices, payment method." },
    { name: "SAP S/4HANA", id: "sap", status: "managed" },
    { name: "Oracle", id: "oracle", status: "managed" },
    { name: "Microsoft Dynamics", id: "dynamics", status: "managed" },
    { name: "Sage X3", id: "sage-x3", status: "managed" },
    { name: "Infor", id: "infor", status: "managed" },
  ],
  "E-commerce": [
    { name: "Shopify", id: "shopify", status: "managed", description: "Order, inventory, and customer sync." },
    { name: "Amazon Seller Central", id: "amazon", status: "managed" },
    { name: "WooCommerce", id: "woocommerce", status: "managed" },
    { name: "BigCommerce", id: "bigcommerce", status: "managed" },
  ],
  "Shipping & Logistics": [
    { name: "FedEx", id: "fedex", status: "managed" },
    { name: "UPS", id: "ups", status: "managed" },
    { name: "DHL", id: "dhl", status: "managed" },
    { name: "Flexport", id: "flexport", status: "managed" },
    { name: "Project44", id: "project44", status: "managed" },
  ],
  "CRM & Sales": [
    { name: "Salesforce", id: "salesforce", status: "managed" },
    { name: "HubSpot", id: "hubspot", status: "managed" },
  ],
  "Work Management": [
    { name: "Jira", id: "jira", status: "managed" },
    { name: "Linear", id: "linear", status: "managed" },
    { name: "Asana", id: "asana", status: "managed" },
    { name: "Monday", id: "monday", status: "managed" },
    { name: "Notion", id: "notion", status: "managed" },
  ],
  "Analytics & BI": [
    { name: "Power BI", id: "powerbi", status: "managed" },
    { name: "Tableau", id: "tableau", status: "managed" },
    { name: "Looker", id: "looker", status: "managed" },
    { name: "Snowflake", id: "snowflake", status: "managed" },
  ],
  "Procurement & Supply": [
    { name: "Ariba", id: "ariba", status: "managed" },
    { name: "Coupa", id: "coupa", status: "managed" },
    { name: "SPS Commerce", id: "sps-commerce", status: "managed" },
    { name: "Jaggaer", id: "jaggaer", status: "managed" },
  ],
  "Operations & Manufacturing": [
    { name: "Manhattan Associates", id: "manhattan", status: "managed" },
    { name: "SAP EWM", id: "sap-ewm", status: "managed" },
    { name: "Fishbowl", id: "fishbowl", status: "managed" },
    { name: "Teamcenter", id: "teamcenter", status: "managed" },
    { name: "OPC-UA", id: "opc-ua", status: "managed", description: "Direct PLC / SCADA telemetry." },
    { name: "MQTT", id: "mqtt", status: "managed" },
    { name: "Kepware", id: "kepware", status: "managed" },
  ],
  "Productivity & Data": [
    { name: "Google Sheets", id: "google-sheets", status: "managed" },
    { name: "Airtable", id: "airtable", status: "managed" },
    { name: "DocuSign", id: "docusign", status: "managed" },
    { name: "CSV Import", id: "csv-import", status: "self-serve", setupVia: "csv", description: "Drag a CSV into any data table." },
  ],
};

// Integration platforms get top billing — one customer plugs into Zapier
// and they have access to literally every other SaaS in existence.
const platforms: { name: string; id: string; description: string; reach: string }[] = [
  { name: "Zapier", id: "zapier", description: "7,000+ apps. Trigger Prescient actions from anything, push our events anywhere.", reach: "7,000+ apps" },
  { name: "Make", id: "make", description: "Visual workflow builder. Lower per-task cost than Zapier for high-volume ops.", reach: "1,500+ apps" },
  { name: "n8n", id: "n8n", description: "Self-hostable, source-available. Ideal if your data can't leave your infrastructure.", reach: "400+ apps" },
  { name: "Workato", id: "workato", description: "Enterprise iPaaS — for IT teams that already have Workato seats.", reach: "1,000+ apps" },
  { name: "MuleSoft", id: "mulesoft", description: "Anypoint Platform connector for Salesforce-era enterprises.", reach: "Anypoint Exchange" },
  { name: "Boomi", id: "boomi", description: "Boomi AtomSphere connector for hybrid cloud environments.", reach: "AtomSphere" },
];

export function Integrations() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState("");
  const [showOnly, setShowOnly] = useState<"all" | "self-serve">("all");
  const [webhookModal, setWebhookModal] = useState<{ id: string; name: string } | null>(null);

  // Live health snapshot for the integrations this tenant actually has
  // wired up. Server already aggregates this at /api/integrations/health —
  // catalog was previously static so customers had no way to know which
  // integrations were live, degraded, or down without leaving the page.
  // 60s refetch keeps the surface near-real-time without hammering the
  // upstream health-check fan-out.
  const { data: health } = useQuery<IntegrationHealthResponse>({
    queryKey: ["/api/integrations/health"],
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const liveIntegrations = useMemo(() => {
    if (!health?.byCategory) return [] as Array<{ integration: string; status: string; latencyMs?: number; message?: string; lastError?: string; category?: string }>;
    return Object.values(health.byCategory)
      .flat()
      .filter((row) => row.status !== "not_configured");
  }, [health]);

  const filteredCategories = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return Object.entries(integrationCategories)
      .map(([category, items]) => {
        const matches = items.filter((i) => {
          if (showOnly === "self-serve" && i.status !== "self-serve") return false;
          if (!q) return true;
          return i.name.toLowerCase().includes(q) || category.toLowerCase().includes(q);
        });
        return [category, matches] as const;
      })
      .filter(([, items]) => items.length > 0);
  }, [filter, showOnly]);

  const totals = useMemo(() => {
    const all = Object.values(integrationCategories).flat();
    return {
      total: all.length,
      selfServe: all.filter((i) => i.status === "self-serve").length,
    };
  }, []);

  function handleConnect(integration: Integration) {
    if (integration.status === "self-serve") {
      if (integration.setupVia === "webhook-url") {
        setWebhookModal({ id: integration.id, name: integration.name });
        return;
      }
      if (integration.id === "stripe-payments") return setLocation("/billing");
      if (integration.id === "email-notifications") return setLocation("/settings/notifications");
      if (integration.id === "csv-import") return setLocation("/dashboard");
    }
    if (integration.status === "managed") {
      const subject = encodeURIComponent(`Integration: ${integration.name}`);
      const body = encodeURIComponent(
        `Hi Prescient Labs,\n\nWe'd like to enable the ${integration.name} integration. Our setup details:\n\n— `,
      );
      window.location.href = `mailto:info@prescient-labs.com?subject=${subject}&body=${body}`;
    }
  }

  function handlePlatformOpen(platformId: string) {
    setLocation("/webhook-integrations");
  }

  return (
    <div className="min-h-screen bg-background p-8 lg:p-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Integrations</div>
<p className="text-muted-foreground text-sm lg:text-base max-w-3xl leading-relaxed">
            {totals.selfServe} integrations are fully self-serve — connect in five minutes from this page.
            The rest connect via your data team or our API.
          </p>
        </div>

        {/* Live integration health — pulled from /api/integrations/health.
            Shows the tenant's actually-configured integrations with current
            status + latency, so customers don't have to leave this page to
            know what's working. Hidden when nothing is configured to avoid
            visual noise for brand-new tenants. */}
        {health && health.summary.total > 0 && liveIntegrations.length > 0 && (
          <div className="rounded-xl border bg-card p-6 lg:p-8 mb-8" data-testid="card-integration-health">
            <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
              <div className="flex items-start gap-4">
                <div className="rounded-lg p-2.5 bg-muted/50">
                  <Activity className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight mb-1.5">Live integration health</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {health.summary.healthy} healthy
                    {health.summary.degraded ? ` · ${health.summary.degraded} degraded` : ""}
                    {health.summary.offline ? ` · ${health.summary.offline} offline` : ""}
                    {health.summary.notConfigured ? ` · ${health.summary.notConfigured} not configured` : ""}
                    {typeof health.avgLatencyMs === "number" ? ` · ${health.avgLatencyMs}ms avg` : ""}
                  </p>
                </div>
              </div>
              <span
                className="text-xs uppercase tracking-wider px-2.5 py-1 rounded-full border"
                style={{
                  borderColor:
                    health.overall === "healthy"  ? "rgba(127,176,154,0.5)" :
                    health.overall === "degraded" ? "rgba(204,120,92,0.5)" :
                    health.overall === "critical" ? "rgba(196,122,110,0.6)" :
                                                    "rgba(255,255,255,0.15)",
                  color:
                    health.overall === "healthy"  ? "#7FB09A" :
                    health.overall === "degraded" ? "#CC785C" :
                    health.overall === "critical" ? "#C47A6E" :
                                                    "var(--muted-foreground)",
                }}
                data-testid="badge-integration-health"
              >
                {health.overall}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {liveIntegrations.slice(0, 12).map((row) => {
                const isOk = row.status === "healthy" || row.status === "configured";
                const isOff = row.status === "offline";
                const dot = isOk ? "#7FB09A" : isOff ? "#C47A6E" : "#CC785C";
                return (
                  <div
                    key={`${row.category ?? ""}:${row.integration}`}
                    className="rounded-md border bg-background p-3 flex items-center gap-3"
                    data-testid={`health-row-${row.integration}`}
                  >
                    <span
                      className="inline-block h-2 w-2 rounded-full shrink-0"
                      style={{ background: dot }}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {row.integration.replace(/[_-]/g, " ")}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {row.status}
                        {typeof row.latencyMs === "number" ? ` · ${row.latencyMs}ms` : ""}
                        {isOff && row.lastError ? ` · ${row.lastError.slice(0, 40)}` : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Universal connector hero — the platform path */}
        <div className="rounded-xl border bg-card p-6 lg:p-8 mb-8" style={{ borderColor: "rgba(204, 120, 92, 0.3)", background: "linear-gradient(180deg, rgba(204,120,92,0.04), transparent)" }}>
          <div className="flex items-start gap-4 mb-5">
            <div className="rounded-lg p-2.5" style={{ background: "rgba(204,120,92,0.12)" }}>
              <Zap className="h-5 w-5" style={{ color: "#CC785C" }} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold tracking-tight mb-1.5">Connect to anything via an automation platform</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Plug Prescient into Zapier, Make, n8n, Workato, MuleSoft, or Boomi and you can wire it to any
                of <strong className="text-foreground">10,000+ other apps</strong> without us writing custom
                integrations. Most useful when the system you need isn't on our list yet.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {platforms.map((p) => (
              <button
                key={p.id}
                onClick={() => handlePlatformOpen(p.id)}
                className="text-left rounded-lg border bg-background hover:bg-muted/40 transition-colors p-3.5"
                data-testid={`platform-card-${p.id}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="font-medium text-sm">{p.name}</div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.reach}</span>
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{p.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Quick-connect strip — webhooks / API / CSV */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-10">
          <button
            onClick={() => setLocation("/webhook-integrations")}
            className="rounded-lg border bg-card hover:bg-muted/40 transition-colors p-4 text-left"
            data-testid="quick-webhooks"
          >
            <Webhook className="h-4 w-4 mb-2 text-muted-foreground" />
            <div className="font-medium text-sm mb-1">Custom webhooks</div>
            <div className="text-xs text-muted-foreground">Send our events to any HTTPS URL you control.</div>
          </button>
          <button
            onClick={() => setLocation("/api-docs")}
            className="rounded-lg border bg-card hover:bg-muted/40 transition-colors p-4 text-left"
            data-testid="quick-api"
          >
            <Code2 className="h-4 w-4 mb-2 text-muted-foreground" />
            <div className="font-medium text-sm mb-1">REST API</div>
            <div className="text-xs text-muted-foreground">Pull data into anything that can speak HTTP.</div>
          </button>
          <button
            onClick={() => setLocation("/dashboard")}
            className="rounded-lg border bg-card hover:bg-muted/40 transition-colors p-4 text-left"
            data-testid="quick-csv"
          >
            <ArrowUpRight className="h-4 w-4 mb-2 text-muted-foreground" />
            <div className="font-medium text-sm mb-1">CSV import</div>
            <div className="text-xs text-muted-foreground">Drag a CSV into any data table to bulk-load.</div>
          </button>
        </div>

        {/* Search + filter */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or category…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-9"
              data-testid="integrations-search"
            />
          </div>
          <div className="flex items-center rounded-md border p-0.5 bg-muted/30">
            <button
              onClick={() => setShowOnly("all")}
              className={`px-3 py-1.5 text-xs rounded ${showOnly === "all" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
              data-testid="filter-all"
            >
              All ({totals.total})
            </button>
            <button
              onClick={() => setShowOnly("self-serve")}
              className={`px-3 py-1.5 text-xs rounded ${showOnly === "self-serve" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
              data-testid="filter-self-serve"
            >
              Self-serve ({totals.selfServe})
            </button>
          </div>
        </div>

        {/* Catalog */}
        <div className="space-y-8">
          {filteredCategories.map(([category, items]) => (
            <section key={category} data-testid={`category-${category.replace(/\s+/g, "-").toLowerCase()}`}>
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="text-sm font-medium tracking-tight">{category}</h3>
                <span className="text-xs text-muted-foreground">
                  {items.filter((i) => i.status === "self-serve").length} self-serve · {items.length} total
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((integration) => (
                  <div
                    key={integration.id}
                    className="border rounded-lg p-4 bg-card hover:bg-muted/30 transition-colors flex flex-col"
                    data-testid={`integration-card-${integration.id}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="font-medium text-sm">{integration.name}</div>
                      <StatusBadge status={integration.status} />
                    </div>
                    {integration.description && (
                      <div className="text-xs text-muted-foreground leading-relaxed mb-3 flex-1">
                        {integration.description}
                      </div>
                    )}
                    <button
                      onClick={() => handleConnect(integration)}
                      className="text-xs px-3 py-1.5 rounded border bg-background hover:bg-muted self-start inline-flex items-center gap-1"
                      data-testid={`button-connect-${integration.id}`}
                    >
                      {integration.status === "self-serve" ? "Connect" : "Request setup"}
                      <ArrowUpRight className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}
          {filteredCategories.length === 0 && (
            <div className="text-center py-16 text-sm text-muted-foreground border rounded-lg">
              No integrations match "{filter}". Try a different search or{" "}
              <a href="mailto:info@prescient-labs.com?subject=Integration%20request" className="underline">
                request one
              </a>.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t mt-12 pt-6 text-xs text-muted-foreground">
          Need a connector not listed?{" "}
          <a
            href="mailto:info@prescient-labs.com?subject=Integration%20request"
            className="underline hover:text-foreground inline-flex items-center gap-1"
          >
            info@prescient-labs.com
            <ExternalLink className="h-3 w-3" />
          </a>
          · Average new-integration turnaround: 5 business days for managed, immediate for self-serve.
        </div>
      </div>

      {/* Webhook URL paste modal — used for Slack / Teams / Discord. The
          form posts to /api/webhook-integrations which the customer can also
          manage from /webhook-integrations. Fully self-serve: no OAuth app
          credentials needed on our side, customer just pastes the URL their
          chat tool gave them. */}
      {webhookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setWebhookModal(null)}>
          <div className="bg-background rounded-xl border max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-5 w-5" style={{ color: "#CC785C" }} />
              <h3 className="font-semibold text-base">Connect {webhookModal.name}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Paste the webhook URL from your {webhookModal.name} workspace. We'll send alerts and digests to
              that channel. You can disconnect any time from{" "}
              <button
                className="underline"
                onClick={() => {
                  setWebhookModal(null);
                  setLocation("/webhook-integrations");
                }}
              >
                Webhook integrations
              </button>.
            </p>
            <div className="rounded-md bg-muted/40 p-3 mb-4 text-xs text-muted-foreground">
              <div className="font-medium text-foreground mb-1">How to get the URL</div>
              {webhookModal.id === "slack" && (
                <>Slack workspace → <code>Apps</code> → search "Incoming Webhooks" → pick a channel → copy URL.</>
              )}
              {webhookModal.id === "teams" && (
                <>Teams channel → <code>⋯</code> → <code>Manage channel</code> → <code>Connectors</code> → "Incoming Webhook" → copy URL.</>
              )}
              {webhookModal.id === "discord" && (
                <>Discord channel → <code>⚙ Edit Channel</code> → <code>Integrations</code> → <code>Webhooks</code> → "New Webhook" → copy URL.</>
              )}
            </div>
            <Button
              className="w-full"
              onClick={() => {
                setWebhookModal(null);
                setLocation("/webhook-integrations");
              }}
              data-testid="button-go-to-webhooks"
            >
              Open webhook configuration →
            </Button>
            <button
              className="w-full text-center text-xs text-muted-foreground mt-3 py-1"
              onClick={() => setWebhookModal(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: IntegrationStatus }) {
  if (status === "self-serve") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: "rgba(127,176,154,0.15)", color: "#5e8e7c" }}>
        <Check className="h-2.5 w-2.5" />
        Self-serve
      </span>
    );
  }
  if (status === "platform") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: "rgba(204,120,92,0.12)", color: "#CC785C" }}>
        Platform
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
      Managed
    </span>
  );
}

export default Integrations;
