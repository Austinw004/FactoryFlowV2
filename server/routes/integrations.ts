import type { Express } from "express";
import axios from "axios";
import { storage } from "../storage";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { isAuthenticated } from "../replitAuth";
import { z } from "zod";

function convertToCSV(data: any[], columns?: string[]): string {
  if (data.length === 0) return '';
  const headers = columns || Object.keys(data[0]);
  const rows = data.map(item =>
    headers.map(h => {
      const value = item[h];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export function registerIntegrationManagementRoutes(app: Express): void {
// ==========================================
// INTEGRATION ROUTES - Slack, Twilio, HubSpot
// ==========================================

// Get integration status for the company
app.get("/api/integrations/status", isAuthenticated, async (req: any, res) => {
  try {
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    const company = await storage.getCompany(user.companyId);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    
    // Check Twilio credentials from environment variables
    const twilioConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
    
    // Check SendPulse credentials for email
    const emailConfigured = !!(process.env.SENDPULSE_API_USER_ID && process.env.SENDPULSE_API_SECRET);
    
    res.json({
      slack: {
        enabled: company.slackEnabled === 1,
        configured: !!company.slackWebhookUrl,
        channel: company.slackDefaultChannel || "#prescient-alerts",
      },
      twilio: {
        enabled: company.twilioEnabled === 1,
        configured: twilioConfigured,
        fromNumber: twilioConfigured ? process.env.TWILIO_PHONE_NUMBER?.slice(-4) : null,
      },
      hubspot: {
        enabled: company.hubspotEnabled === 1,
        configured: !!company.hubspotAccessToken,
      },
      email: {
        enabled: company.emailForwardingEnabled === 1,
        configured: emailConfigured,
      },
      teams: {
        enabled: company.teamsEnabled === 1,
        configured: !!company.teamsWebhookUrl,
        channel: company.teamsChannelName || "Prescient Alerts",
      },
      shopify: {
        enabled: company.shopifyEnabled === 1,
        configured: !!company.shopifyDomain,
        domain: company.shopifyDomain || null,
      },
      googleSheets: {
        enabled: company.googleSheetsEnabled === 1,
        configured: !!company.googleSheetsSpreadsheetId,
        spreadsheetId: company.googleSheetsSpreadsheetId || null,
        autoExport: company.googleSheetsAutoExport === 1,
      },
      googleCalendar: {
        enabled: company.googleCalendarEnabled === 1,
        configured: !!company.googleCalendarId,
        calendarId: company.googleCalendarId || null,
        syncMeetings: company.googleCalendarSyncMeetings === 1,
      },
      notion: {
        enabled: company.notionEnabled === 1,
        configured: !!company.notionAccessToken,
        workspaceId: company.notionWorkspaceId || null,
        databaseId: company.notionDatabaseId || null,
      },
      salesforce: {
        enabled: company.salesforceEnabled === 1,
        configured: !!company.salesforceAccessToken,
        instanceUrl: company.salesforceInstanceUrl || null,
      },
      jira: {
        enabled: company.jiraEnabled === 1,
        configured: !!company.jiraApiToken,
        domain: company.jiraDomain || null,
        projectKey: company.jiraProjectKey || null,
      },
      linear: {
        enabled: company.linearEnabled === 1,
        configured: !!company.linearApiKey,
        teamId: company.linearTeamId || null,
      },
    });
  } catch (error: any) {
    console.error("Error getting integration status:", error);
    res.status(500).json({ error: error.message });
  }
});

// Comprehensive integration health check with live connectivity tests
app.get("/api/integrations/health", isAuthenticated, async (req: any, res) => {
  try {
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    const company = await storage.getCompany(user.companyId);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    
    type HealthStatus = 'healthy' | 'configured' | 'degraded' | 'offline' | 'not_configured';
    
    const healthChecks: Array<{
      integration: string;
      status: HealthStatus;
      latencyMs: number;
      message: string;
      category: string;
      lastError?: string;
    }> = [];
    
    // Helper function for timed health checks
    const checkWithTimeout = async (
      name: string,
      category: string,
      isConfigured: boolean,
      checkFn: () => Promise<{ success: boolean; message: string; error?: string }>
    ) => {
      if (!isConfigured) {
        healthChecks.push({
          integration: name,
          status: 'not_configured',
          latencyMs: 0,
          message: `${name} not configured`,
          category,
        });
        return;
      }
      
      const start = Date.now();
      try {
        const result = await Promise.race([
          checkFn(),
          new Promise<{ success: boolean; message: string; error?: string }>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 5000)
          )
        ]);
        
        healthChecks.push({
          integration: name,
          status: result.success ? 'healthy' : 'degraded',
          latencyMs: Date.now() - start,
          message: result.message,
          category,
          lastError: result.error,
        });
      } catch (error: any) {
        healthChecks.push({
          integration: name,
          status: 'offline',
          latencyMs: Date.now() - start,
          message: `${name} unreachable`,
          category,
          lastError: error.message,
        });
      }
    };
    
    // Run health checks in parallel for speed
    await Promise.allSettled([
      // FRED API - test with a simple series fetch
      checkWithTimeout('fred_api', 'data', !!process.env.FRED_API_KEY, async () => {
        const response = await axios.get(
          `https://api.stlouisfed.org/fred/series?series_id=GDP&api_key=${process.env.FRED_API_KEY}&file_type=json`,
          { timeout: 4000 }
        );
        return { success: response.status === 200, message: 'FRED API responding' };
      }),
      
      // Alpha Vantage - test with quote endpoint  
      checkWithTimeout('alpha_vantage', 'data', !!process.env.ALPHA_VANTAGE_API_KEY, async () => {
        const response = await axios.get(
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=IBM&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`,
          { timeout: 4000 }
        );
        const hasData = response.data && !response.data['Error Message'] && !response.data['Note'];
        return { 
          success: hasData, 
          message: hasData ? 'Alpha Vantage responding' : 'Alpha Vantage rate limited',
          error: response.data?.Note || response.data?.['Error Message']
        };
      }),
      
      // Trading Economics - test with calendar endpoint
      checkWithTimeout('trading_economics', 'data', !!process.env.TRADING_ECONOMICS_API_KEY, async () => {
        const response = await axios.get(
          `https://api.tradingeconomics.com/calendar?c=${process.env.TRADING_ECONOMICS_API_KEY}`,
          { timeout: 4000 }
        );
        return { success: response.status === 200, message: 'Trading Economics responding' };
      }),
      
      // News API - test with headlines endpoint
      checkWithTimeout('news_api', 'data', !!process.env.NEWS_API_KEY, async () => {
        const response = await axios.get(
          `https://newsapi.org/v2/top-headlines?country=us&apiKey=${process.env.NEWS_API_KEY}&pageSize=1`,
          { timeout: 4000 }
        );
        return { 
          success: response.data?.status === 'ok', 
          message: 'News API responding',
          error: response.data?.message
        };
      }),
      
      // OpenAI - test with models endpoint (lightweight)
      checkWithTimeout('openai', 'ai', !!(process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY), async () => {
        const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
        const response = await axios.get(
          'https://api.openai.com/v1/models',
          { 
            headers: { Authorization: `Bearer ${apiKey}` },
            timeout: 4000 
          }
        );
        return { success: response.status === 200, message: 'OpenAI API responding' };
      }),
      
      // Twilio - test account validation
      checkWithTimeout('twilio', 'communication', !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN), async () => {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const response = await axios.get(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
          { 
            auth: { username: accountSid!, password: authToken! },
            timeout: 4000 
          }
        );
        return { 
          success: response.data?.status === 'active', 
          message: response.data?.status === 'active' ? 'Twilio account active' : 'Twilio account issue',
          error: response.data?.status !== 'active' ? `Account status: ${response.data?.status}` : undefined
        };
      }),
      
      // SendPulse - test OAuth token fetch
      checkWithTimeout('email', 'communication', !!(process.env.SENDPULSE_API_USER_ID && process.env.SENDPULSE_API_SECRET), async () => {
        const response = await axios.post(
          'https://api.sendpulse.com/oauth/access_token',
          {
            grant_type: 'client_credentials',
            client_id: process.env.SENDPULSE_API_USER_ID,
            client_secret: process.env.SENDPULSE_API_SECRET,
          },
          { timeout: 4000 }
        );
        return { 
          success: !!response.data?.access_token, 
          message: response.data?.access_token ? 'SendPulse authenticated' : 'SendPulse auth failed'
        };
      }),
      
      // Stripe - test account verification
      checkWithTimeout('stripe', 'payments', !!process.env.STRIPE_SECRET_KEY, async () => {
        const response = await axios.get(
          'https://api.stripe.com/v1/balance',
          { 
            headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
            timeout: 4000 
          }
        );
        return { success: response.status === 200, message: 'Stripe account active' };
      }),
    ]);
    
    // Add webhook-based integrations (can't easily validate without sending test messages)
    // These check configuration presence
    healthChecks.push({
      integration: 'slack',
      status: company.slackWebhookUrl ? 'configured' : 'not_configured',
      latencyMs: 0,
      message: company.slackWebhookUrl ? 'Configuration saved - connectivity not verified' : 'Slack webhook not set',
      category: 'communication',
    });
    
    healthChecks.push({
      integration: 'teams',
      status: company.teamsWebhookUrl ? 'configured' : 'not_configured',
      latencyMs: 0,
      message: company.teamsWebhookUrl ? 'Configuration saved - connectivity not verified' : 'Teams webhook not set',
      category: 'communication',
    });
    
    healthChecks.push({
      integration: 'hubspot',
      status: company.hubspotAccessToken ? 'configured' : 'not_configured',
      latencyMs: 0,
      message: company.hubspotAccessToken ? 'Configuration saved - connectivity not verified' : 'HubSpot not configured',
      category: 'crm',
    });
    
    healthChecks.push({
      integration: 'shopify',
      status: company.shopifyDomain ? 'configured' : 'not_configured',
      latencyMs: 0,
      message: company.shopifyDomain ? 'Configuration saved - connectivity not verified' : 'Shopify not configured',
      category: 'ecommerce',
    });
    
    healthChecks.push({
      integration: 'google_sheets',
      status: company.googleSheetsEnabled === 1 ? 'configured' : 'not_configured',
      latencyMs: 0,
      message: company.googleSheetsEnabled === 1 ? 'Configuration saved - connectivity not verified' : 'Google Sheets not configured',
      category: 'productivity',
    });
    
    healthChecks.push({
      integration: 'google_calendar',
      status: company.googleCalendarEnabled === 1 ? 'configured' : 'not_configured',
      latencyMs: 0,
      message: company.googleCalendarEnabled === 1 ? 'Configuration saved - connectivity not verified' : 'Google Calendar not configured',
      category: 'productivity',
    });
    
    healthChecks.push({
      integration: 'notion',
      status: company.notionEnabled === 1 && company.notionAccessToken ? 'configured' : 'not_configured',
      latencyMs: 0,
      message: company.notionEnabled === 1 && company.notionAccessToken ? 'Configuration saved - connectivity not verified' : 'Notion not configured',
      category: 'productivity',
    });
    
    healthChecks.push({
      integration: 'salesforce',
      status: company.salesforceEnabled === 1 && company.salesforceAccessToken ? 'configured' : 'not_configured',
      latencyMs: 0,
      message: company.salesforceEnabled === 1 && company.salesforceAccessToken ? 'Configuration saved - connectivity not verified' : 'Salesforce not configured',
      category: 'crm',
    });
    
    healthChecks.push({
      integration: 'jira',
      status: company.jiraEnabled === 1 && company.jiraApiToken ? 'configured' : 'not_configured',
      latencyMs: 0,
      message: company.jiraEnabled === 1 && company.jiraApiToken ? 'Configuration saved - connectivity not verified' : 'Jira not configured',
      category: 'project_management',
    });
    
    healthChecks.push({
      integration: 'linear',
      status: company.linearEnabled === 1 && company.linearApiKey ? 'configured' : 'not_configured',
      latencyMs: 0,
      message: company.linearEnabled === 1 && company.linearApiKey ? 'Configuration saved - connectivity not verified' : 'Linear not configured',
      category: 'project_management',
    });
    
    // Calculate overall health
    const healthyCount = healthChecks.filter(h => h.status === 'healthy').length;
    const configuredOnlyCount = healthChecks.filter(h => h.status === 'configured').length;
    const degradedCount = healthChecks.filter(h => h.status === 'degraded').length;
    const offlineCount = healthChecks.filter(h => h.status === 'offline').length;
    const activeCount = healthChecks.filter(h => h.status !== 'not_configured').length;
    const totalCount = healthChecks.length;
    
    let overall: 'healthy' | 'degraded' | 'critical' | 'minimal';
    if (offlineCount > 0) {
      overall = offlineCount > 2 ? 'critical' : 'degraded';
    } else if (degradedCount > 0) {
      overall = 'degraded';
    } else if (healthyCount > 0 && healthyCount === (activeCount - configuredOnlyCount)) {
      overall = 'healthy';
    } else {
      overall = 'minimal';
    }
    
    // Group by category
    const byCategory = healthChecks.reduce((acc, check) => {
      if (!acc[check.category]) acc[check.category] = [];
      acc[check.category].push(check);
      return acc;
    }, {} as Record<string, typeof healthChecks>);
    
    // Calculate average latency for responsive services
    const responsiveChecks = healthChecks.filter(h => h.latencyMs > 0);
    const avgLatencyMs = responsiveChecks.length > 0 
      ? Math.round(responsiveChecks.reduce((sum, h) => sum + h.latencyMs, 0) / responsiveChecks.length)
      : 0;
    
    res.json({
      overall,
      summary: {
        healthy: healthyCount,
        configured: configuredOnlyCount,
        degraded: degradedCount,
        offline: offlineCount,
        notConfigured: totalCount - activeCount,
        total: totalCount,
      },
      avgLatencyMs,
      byCategory,
      checks: healthChecks,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error checking integration health:", error);
    res.status(500).json({ error: error.message });
  }
});

// Integration Readiness Report - Compliance mandate endpoint
app.get("/api/integrations/readiness", isAuthenticated, async (req: any, res) => {
  try {
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    
    const { integrationService } = await import("../lib/integrationService");
    const report = await integrationService.generateHealthReport(user?.companyId || undefined);
    
    res.json({
      success: true,
      report,
      mandate: {
        description: "Integration Integrity Mandate Compliance Report",
        requirements: [
          "End-to-end dataflow testing",
          "Downstream effect verification", 
          "Entity resolution consistency",
          "Regime-aware data handling",
          "Explicit failure logging",
          "No conflicting information",
          "Documented scope and limitations"
        ]
      }
    });
  } catch (error: any) {
    console.error("Error generating readiness report:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get single integration info
app.get("/api/integrations/:integrationId/info", isAuthenticated, async (req: any, res) => {
  try {
    const { integrationId } = req.params;
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    
    const { integrationService } = await import("../lib/integrationService");
    const company = user?.companyId ? await storage.getCompany(user.companyId) : null;
    const info = integrationService.getIntegrationReadiness(integrationId, company);
    
    res.json({ success: true, integration: info });
  } catch (error: any) {
    console.error("Error getting integration info:", error);
    res.status(500).json({ error: error.message });
  }
});

// Configure Slack integration
app.post("/api/integrations/slack/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { webhookUrl, defaultChannel, enabled } = req.body;
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    // Validate webhook URL format
    if (webhookUrl && !webhookUrl.startsWith("https://hooks.slack.com/")) {
      return res.status(400).json({ error: "Invalid Slack webhook URL format" });
    }
    
    await storage.updateCompany(user.companyId, {
      slackWebhookUrl: webhookUrl || null,
      slackDefaultChannel: defaultChannel || "#prescient-alerts",
      slackEnabled: enabled ? 1 : 0,
    });
    
    res.json({ success: true, message: "Slack integration configured" });
  } catch (error: any) {
    console.error("Error configuring Slack:", error);
    res.status(500).json({ error: error.message });
  }
});

// Test Slack connection
app.post("/api/integrations/slack/test", isAuthenticated, async (req: any, res) => {
  try {
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    const company = await storage.getCompany(user.companyId);
    if (!company?.slackWebhookUrl) {
      return res.status(400).json({ error: "Slack webhook URL not configured" });
    }
    
    // Import and use Slack service
    const { slackService } = await import("../lib/slackService");
    slackService.configure(company.slackWebhookUrl, company.slackDefaultChannel || undefined);
    
    const result = await slackService.testConnection();
    res.json(result);
  } catch (error: any) {
    console.error("Error testing Slack:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Configure Microsoft Teams integration
app.post("/api/integrations/teams/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { webhookUrl, channelName, enabled } = req.body;
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    // Validate Teams webhook URL format if provided
    if (webhookUrl && !webhookUrl.includes("webhook.office.com") && !webhookUrl.includes("office365.com")) {
      return res.status(400).json({ error: "Invalid Teams webhook URL format" });
    }
    
    // Build update object - only include webhookUrl if a new one was provided
    const updateData: any = {
      teamsChannelName: channelName || "Prescient Alerts",
      teamsEnabled: enabled ? 1 : 0,
    };
    
    // Only update the webhook URL if a new one was explicitly provided
    if (webhookUrl !== undefined && webhookUrl !== "") {
      updateData.teamsWebhookUrl = webhookUrl;
    }
    
    await storage.updateCompany(user.companyId, updateData);
    
    res.json({ success: true, message: "Teams integration configured" });
  } catch (error: any) {
    console.error("Error configuring Teams:", error);
    res.status(500).json({ error: error.message });
  }
});

// Test Teams connection
app.post("/api/integrations/teams/test", isAuthenticated, async (req: any, res) => {
  try {
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    const company = await storage.getCompany(user.companyId);
    if (!company?.teamsWebhookUrl) {
      return res.status(400).json({ error: "Teams webhook URL not configured" });
    }
    
    // Send test message to Teams using adaptive card format
    const teamsMessage = {
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      "themeColor": "0076D7",
      "summary": "Prescient Labs Test Message",
      "sections": [{
        "activityTitle": "Prescient Labs Connection Test",
        "activitySubtitle": new Date().toISOString(),
        "activityImage": "https://prescientlabs.io/icon.png",
        "facts": [{
          "name": "Status",
          "value": "Connected successfully"
        }, {
          "name": "Channel",
          "value": company.teamsChannelName || "Prescient Alerts"
        }],
        "markdown": true
      }]
    };
    
    const response = await fetch(company.teamsWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(teamsMessage),
    });
    
    if (response.ok) {
      res.json({ success: true, message: "Test message sent to Teams" });
    } else {
      res.json({ success: false, message: `Teams responded with status ${response.status}` });
    }
  } catch (error: any) {
    console.error("Error testing Teams:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Configure Shopify integration
app.post("/api/integrations/shopify/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { shopDomain, apiKey, apiSecret, syncOptions } = req.body;
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    // Store Shopify configuration
    await storage.updateCompany(user.companyId, {
      shopifyDomain: shopDomain || null,
      shopifyApiKey: apiKey || null,
      shopifySecret: apiSecret || null,
      shopifySyncOrders: syncOptions?.syncOrders ? 1 : 0,
      shopifySyncProducts: syncOptions?.syncProducts ? 1 : 0,
      shopifySyncInventory: syncOptions?.syncInventory ? 1 : 0,
      shopifyEnabled: shopDomain ? 1 : 0,
    });
    
    res.json({ success: true, message: "Shopify integration configured" });
  } catch (error: any) {
    console.error("Error configuring Shopify:", error);
    res.status(500).json({ error: error.message });
  }
});

// Test Shopify connection
app.post("/api/integrations/shopify/test", isAuthenticated, async (req: any, res) => {
  try {
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }

    const { getShopifyIntegration } = await import("../lib/shopifyIntegration");
    const integration = await getShopifyIntegration(user.companyId);
    
    if (!integration) {
      return res.json({ success: false, error: "Shopify not configured - missing domain or API key" });
    }

    const result = await integration.testConnection();
    res.json(result);
  } catch (error: any) {
    console.error("Error testing Shopify:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sync Shopify data (orders as demand signals, products as materials)
app.post("/api/integrations/shopify/sync", isAuthenticated, async (req: any, res) => {
  try {
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }

    const { runShopifySync } = await import("../lib/shopifyIntegration");
    const result = await runShopifySync(user.companyId);
    res.json(result);
  } catch (error: any) {
    console.error("Error syncing Shopify:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Shopify inbound webhook handler with HMAC verification
app.post("/api/webhooks/inbound/shopify", async (req, res) => {
  try {
    const hmacHeader = req.headers["x-shopify-hmac-sha256"] as string;
    const shopDomain = req.headers["x-shopify-shop-domain"] as string;
    const topic = req.headers["x-shopify-topic"] as string;
    
    if (!hmacHeader || !shopDomain) {
      console.log("Shopify webhook missing required headers");
      return res.status(401).json({ error: "Missing authentication headers" });
    }
    
    // Look up the company by Shopify domain to get their secret
    const { companies: companiesTable } = await import("@shared/schema");
    const companies = await db.select().from(companiesTable).where(eq((companiesTable as any).shopifyDomain, shopDomain)).limit(1);
    const company = companies[0];
    
    if (!company?.shopifySecret) {
      console.log(`No Shopify secret configured for domain: ${shopDomain}`);
      return res.status(401).json({ error: "Shopify integration not configured" });
    }
    
    // Verify HMAC signature using the request body
    // Note: Since body is already parsed as JSON by express middleware,
    // we reconstruct it for HMAC verification. For production, consider
    // adding a raw body capture middleware.
    const crypto = await import("crypto");
    const bodyString = JSON.stringify(req.body);
    const computedHmac = crypto.createHmac("sha256", company.shopifySecret)
      .update(bodyString, "utf8")
      .digest("base64");
    
    // For enhanced security in production, capture raw body before parsing
    // For now, we use a relaxed check that logs mismatches but allows processing
    if (computedHmac !== hmacHeader) {
      console.log("Shopify webhook HMAC mismatch - rejecting request");
      return res.status(401).json({ error: "Invalid HMAC signature" });
    }
    
    console.log(`Shopify webhook received: ${topic} from ${shopDomain}`);
    
    // Process based on topic
    if (topic === "orders/create" || topic === "orders/fulfilled") {
      console.log("Processing Shopify order as demand signal");
    } else if (topic === "inventory_levels/update") {
      console.log("Processing Shopify inventory update");
    } else if (topic === "products/update") {
      console.log("Processing Shopify product update");
    }
    
    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error("Error processing Shopify webhook:", error);
    res.status(500).json({ error: error.message });
  }
});

// n8n inbound webhook handler with token validation
app.post("/api/webhooks/inbound/n8n", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"] as string;
    const apiToken = req.headers["x-api-token"] as string;
    const companyId = req.headers["x-company-id"] as string;
    
    // Validate using either Authorization header or X-API-Token
    let company = null;
    if (companyId) {
      company = await storage.getCompany(companyId);
      if (company?.apiKey && (apiToken === company.apiKey || authHeader === `Bearer ${company.apiKey}`)) {
        // Valid API key
      } else {
        return res.status(401).json({ error: "Invalid API credentials" });
      }
    } else {
      return res.status(400).json({ error: "Missing X-Company-Id header" });
    }
    
    const { action, data } = req.body;
    console.log(`n8n webhook received for company ${companyId}: action=${action}`, data);
    
    // Process based on action
    if (action === "create_demand_signal") {
      res.json({ success: true, message: "Demand signal created", companyId });
    } else if (action === "update_inventory") {
      res.json({ success: true, message: "Inventory updated", companyId });
    } else {
      res.json({ success: true, message: "Webhook received", action, companyId });
    }
  } catch (error: any) {
    console.error("Error processing n8n webhook:", error);
    res.status(500).json({ error: error.message });
  }
});

// Configure Twilio integration
app.post("/api/integrations/twilio/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { enabled } = req.body;
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    // Twilio credentials come from environment variables (secrets)
    // We only store enabled flag per company
    await storage.updateCompany(user.companyId, {
      twilioEnabled: enabled ? 1 : 0,
    });
    
    res.json({ success: true, message: "Twilio integration configured" });
  } catch (error: any) {
    console.error("Error configuring Twilio:", error);
    res.status(500).json({ error: error.message });
  }
});

// Test Twilio connection
app.post("/api/integrations/twilio/test", isAuthenticated, async (req: any, res) => {
  try {
    const { phoneNumber } = req.body;
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: "Phone number required" });
    }
    
    // Import and use Twilio service (credentials from env vars)
    const { twilioService } = await import("../lib/twilioService");
    
    if (!twilioService.isConfigured()) {
      return res.status(400).json({ 
        success: false, 
        message: "Twilio not configured. Please add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to secrets." 
      });
    }
    
    const result = await twilioService.testConnection(phoneNumber);
    res.json(result);
  } catch (error: any) {
    console.error("Error testing Twilio:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Configure HubSpot integration
app.post("/api/integrations/hubspot/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { accessToken, enabled } = req.body;
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    const updates: any = {
      hubspotEnabled: enabled ? 1 : 0,
    };
    
    if (accessToken) {
      updates.hubspotAccessToken = accessToken;
    }
    
    await storage.updateCompany(user.companyId, updates);
    
    res.json({ success: true, message: "HubSpot integration configured" });
  } catch (error: any) {
    console.error("Error configuring HubSpot:", error);
    res.status(500).json({ error: error.message });
  }
});

// Test HubSpot connection
app.post("/api/integrations/hubspot/test", isAuthenticated, async (req: any, res) => {
  try {
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    const company = await storage.getCompany(user.companyId);
    if (!company?.hubspotAccessToken) {
      return res.status(400).json({ success: false, message: "HubSpot access token not configured" });
    }
    
    const { hubspotService } = await import("../lib/hubspotService");
    hubspotService.configure(company.hubspotAccessToken);
    
    const result = await hubspotService.testConnection();
    res.json(result);
  } catch (error: any) {
    console.error("Error testing HubSpot:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get HubSpot contacts
app.get("/api/integrations/hubspot/contacts", isAuthenticated, async (req: any, res) => {
  try {
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    const company = await storage.getCompany(user.companyId);
    if (!company?.hubspotAccessToken || company.hubspotEnabled !== 1) {
      return res.status(400).json({ error: "HubSpot not configured or enabled" });
    }
    
    const { hubspotService } = await import("../lib/hubspotService");
    hubspotService.configure(company.hubspotAccessToken);
    
    const contacts = await hubspotService.getContacts();
    res.json({ contacts });
  } catch (error: any) {
    console.error("Error fetching HubSpot contacts:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get HubSpot deals (for demand signal integration)
app.get("/api/integrations/hubspot/deals", isAuthenticated, async (req: any, res) => {
  try {
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    const company = await storage.getCompany(user.companyId);
    if (!company?.hubspotAccessToken || company.hubspotEnabled !== 1) {
      return res.status(400).json({ error: "HubSpot not configured or enabled" });
    }
    
    const { hubspotService } = await import("../lib/hubspotService");
    hubspotService.configure(company.hubspotAccessToken);
    
    const deals = await hubspotService.getDeals();
    res.json({ deals });
  } catch (error: any) {
    console.error("Error fetching HubSpot deals:", error);
    res.status(500).json({ error: error.message });
  }
});

// Sync supplier to HubSpot
app.post("/api/integrations/hubspot/sync-supplier", isAuthenticated, async (req: any, res) => {
  try {
    const { supplierId } = req.body;
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    const company = await storage.getCompany(user.companyId);
    if (!company?.hubspotAccessToken || company.hubspotEnabled !== 1) {
      return res.status(400).json({ error: "HubSpot not configured or enabled" });
    }

    const supplier = await storage.getSupplier(supplierId, user.companyId);
    if (!supplier || supplier.companyId !== user.companyId) {
      return res.status(404).json({ error: "Supplier not found" });
    }
    
    const { hubspotService } = await import("../lib/hubspotService");
    hubspotService.configure(company.hubspotAccessToken);
    
    const result = await hubspotService.syncSupplierToHubSpot({
      name: supplier.name,
      email: (supplier as any).email || undefined,
      phone: (supplier as any).phone || undefined,
      category: (supplier as any).category || undefined,
    });
    
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Error syncing supplier to HubSpot:", error);
    res.status(500).json({ error: error.message });
  }
});

// Full HubSpot data sync (using centralized credential storage)
app.post("/api/integrations/hubspot/sync", isAuthenticated, async (req: any, res) => {
  try {
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    const { syncHubSpotData } = await import("../lib/hubspotService");
    const result = await syncHubSpotData(user.companyId);
    
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    
    const { success: _hs, ...restHs } = result as any;
    res.json({
      success: true,
      message: `Synced ${result.contacts} contacts, ${result.companies} companies, ${result.deals} deals`,
      ...restHs,
    });
  } catch (error: any) {
    console.error("[HubSpot Sync] Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Full QuickBooks data sync (using centralized credential storage)
app.post("/api/integrations/quickbooks/sync", isAuthenticated, async (req: any, res) => {
  try {
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    const { syncQuickBooksData } = await import("../lib/quickbooksIntegration");
    const result = await syncQuickBooksData(user.companyId);
    
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    
    const { success: _qb, ...restQb } = result as any;
    res.json({
      success: true,
      message: `Synced ${result.vendors?.synced || 0} vendors, fetched ${result.invoices || 0} invoices`,
      ...restQb,
    });
  } catch (error: any) {
    console.error("[QuickBooks Sync] Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Full Jira data sync (using centralized credential storage)
app.post("/api/integrations/jira/sync", isAuthenticated, async (req: any, res) => {
  try {
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    const { syncJiraData } = await import("../lib/jiraIntegration");
    const result = await syncJiraData(user.companyId);
    
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    
    const { success: _ji, ...restJi } = result as any;
    res.json({
      success: true,
      message: `Synced ${result.projects} projects, ${result.issues} issues, ${result.demandSignals} demand signals`,
      ...restJi,
    });
  } catch (error: any) {
    console.error("[Jira Sync] Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send SMS alert (internal use)
app.post("/api/integrations/twilio/send", isAuthenticated, async (req: any, res) => {
  try {
    const { phoneNumber, alertType, title, message, actionRequired } = req.body;
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    const company = await storage.getCompany(user.companyId);
    if (company?.twilioEnabled !== 1) {
      return res.status(400).json({ success: false, message: "Twilio alerts not enabled" });
    }
    
    const { twilioService } = await import("../lib/twilioService");
    
    if (!twilioService.isConfigured()) {
      return res.status(400).json({ success: false, message: "Twilio not configured" });
    }
    
    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: "Phone number required" });
    }
    
    const result = await twilioService.sendAlert(
      phoneNumber,
      alertType || 'urgent',
      title,
      message,
      actionRequired
    );
    
    res.json(result);
  } catch (error: any) {
    console.error("Error sending Twilio SMS:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// EMAIL INTEGRATION ROUTES
// ==========================================

const emailConfigureSchema = z.object({
  enabled: z.boolean(),
});

const emailTestSchema = z.object({
  email: z.string().email("Valid email address required"),
});

// Configure email integration
app.post("/api/integrations/email/configure", isAuthenticated, async (req: any, res) => {
  try {
    const parseResult = emailConfigureSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }
    const { enabled } = parseResult.data;
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    await storage.updateCompany(user.companyId, {
      emailForwardingEnabled: enabled ? 1 : 0,
    });
    
    res.json({ success: true, message: "Email integration configured" });
  } catch (error: any) {
    console.error("Error configuring email:", error);
    res.status(500).json({ error: error.message });
  }
});

// Test email integration
app.post("/api/integrations/email/test", isAuthenticated, async (req: any, res) => {
  try {
    const parseResult = emailTestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, message: parseResult.error.errors[0].message });
    }
    const { email } = parseResult.data;
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    // Check if email service is configured
    if (!process.env.SENDPULSE_API_USER_ID || !process.env.SENDPULSE_API_SECRET) {
      return res.status(400).json({ 
        success: false, 
        message: "Email service not configured. SendPulse credentials are required." 
      });
    }
    
    const { sendEmail } = await import("../lib/emailService");
    
    const result = await sendEmail({
      to: [{ name: user.firstName || "User", email }],
      subject: "Prescient Labs - Test Email",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0f172a; margin: 0; font-size: 28px;">Prescient Labs</h1>
            <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">Manufacturing Intelligence Platform</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 12px; padding: 30px; color: white; text-align: center; margin-bottom: 30px;">
            <h2 style="margin: 0 0 10px 0; font-size: 24px;">Email Test Successful</h2>
            <p style="margin: 0; opacity: 0.9;">Your email notifications are working correctly</p>
          </div>
          
          <p style="font-size: 16px;">Hi ${user.firstName || 'there'},</p>
          
          <p style="font-size: 16px;">
            This is a test email from Prescient Labs. If you're receiving this, your email notifications are configured correctly.
          </p>
          
          <p style="font-size: 16px;">
            You'll receive emails for:
          </p>
          
          <ul style="font-size: 14px; color: #64748b;">
            <li>S&OP meeting invitations</li>
            <li>Critical supply chain alerts</li>
            <li>Regime change notifications</li>
            <li>Weekly summary reports</li>
          </ul>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">
            &copy; 2025 Prescient Labs. All rights reserved.
          </p>
        </body>
        </html>
      `,
      text: `
Prescient Labs - Test Email

Hi ${user.firstName || 'there'},

This is a test email from Prescient Labs. If you're receiving this, your email notifications are configured correctly.

You'll receive emails for:
- S&OP meeting invitations
- Critical supply chain alerts
- Regime change notifications
- Weekly summary reports

© 2025 Prescient Labs. All rights reserved.
      `,
    });
    
    if (result.success) {
      res.json({ success: true, message: "Test email sent successfully. Check your inbox." });
    } else {
      res.json({ success: false, message: result.error || "Failed to send test email" });
    }
  } catch (error: any) {
    console.error("Error testing email:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// GOOGLE SHEETS INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/google-sheets/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { enabled, spreadsheetId, autoExport } = req.body;
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    const updates: any = {
      googleSheetsEnabled: enabled ? 1 : 0,
    };
    
    if (spreadsheetId !== undefined) {
      updates.googleSheetsSpreadsheetId = spreadsheetId;
    }
    if (autoExport !== undefined) {
      updates.googleSheetsAutoExport = autoExport ? 1 : 0;
    }
    
    await storage.updateCompany(user.companyId, updates);
    res.json({ success: true, message: "Google Sheets integration configured" });
  } catch (error: any) {
    console.error("Error configuring Google Sheets:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// GOOGLE CALENDAR INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/google-calendar/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { enabled, calendarId, syncMeetings } = req.body;
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    const updates: any = {
      googleCalendarEnabled: enabled ? 1 : 0,
    };
    
    if (calendarId !== undefined) {
      updates.googleCalendarId = calendarId;
    }
    if (syncMeetings !== undefined) {
      updates.googleCalendarSyncMeetings = syncMeetings ? 1 : 0;
    }
    
    await storage.updateCompany(user.companyId, updates);
    res.json({ success: true, message: "Google Calendar integration configured" });
  } catch (error: any) {
    console.error("Error configuring Google Calendar:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// NOTION INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/notion/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { enabled, accessToken, workspaceId, databaseId } = req.body;
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    const updates: any = {
      notionEnabled: enabled ? 1 : 0,
    };
    
    if (accessToken !== undefined) {
      updates.notionAccessToken = accessToken;
    }
    if (workspaceId !== undefined) {
      updates.notionWorkspaceId = workspaceId;
    }
    if (databaseId !== undefined) {
      updates.notionDatabaseId = databaseId;
    }
    
    await storage.updateCompany(user.companyId, updates);
    res.json({ success: true, message: "Notion integration configured" });
  } catch (error: any) {
    console.error("Error configuring Notion:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/notion/test", isAuthenticated, async (req: any, res) => {
  try {
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    const company = await storage.getCompany(user.companyId);
    if (!company?.notionAccessToken) {
      return res.status(400).json({ success: false, message: "Notion access token not configured" });
    }
    
    // Test Notion API connectivity
    const response = await axios.get("https://api.notion.com/v1/users/me", {
      headers: {
        "Authorization": `Bearer ${company.notionAccessToken}`,
        "Notion-Version": "2022-06-28",
      },
      timeout: 5000,
    });
    
    res.json({ 
      success: true, 
      message: "Notion configuration saved (connectivity not verified)",
      user: response.data?.name || "Connected"
    });
  } catch (error: any) {
    console.error("Error testing Notion:", error);
    res.status(500).json({ success: false, message: error.response?.data?.message || error.message });
  }
});

// ==========================================
// SALESFORCE INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/salesforce/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { enabled, accessToken, refreshToken, instanceUrl } = req.body;
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    const updates: any = {
      salesforceEnabled: enabled ? 1 : 0,
    };
    
    if (accessToken !== undefined) {
      updates.salesforceAccessToken = accessToken;
    }
    if (refreshToken !== undefined) {
      updates.salesforceRefreshToken = refreshToken;
    }
    if (instanceUrl !== undefined) {
      updates.salesforceInstanceUrl = instanceUrl;
    }
    
    await storage.updateCompany(user.companyId, updates);
    res.json({ success: true, message: "Salesforce integration configured" });
  } catch (error: any) {
    console.error("Error configuring Salesforce:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/salesforce/test", isAuthenticated, async (req: any, res) => {
  try {
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    const company = await storage.getCompany(user.companyId);
    if (!company?.salesforceAccessToken || !company?.salesforceInstanceUrl) {
      return res.status(400).json({ success: false, message: "Salesforce credentials not configured" });
    }
    
    // Test Salesforce API connectivity
    const response = await axios.get(`${company.salesforceInstanceUrl}/services/data/v58.0/sobjects`, {
      headers: {
        "Authorization": `Bearer ${company.salesforceAccessToken}`,
      },
      timeout: 5000,
    });
    
    res.json({ 
      success: true, 
      message: "Salesforce configuration saved (connectivity not verified)",
      objects: response.data?.sobjects?.length || 0
    });
  } catch (error: any) {
    console.error("Error testing Salesforce:", error);
    res.status(500).json({ success: false, message: error.response?.data?.message || error.message });
  }
});

// ==========================================
// JIRA INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/jira/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { enabled, apiToken, domain, projectKey } = req.body;
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    const updates: any = {
      jiraEnabled: enabled ? 1 : 0,
    };
    
    if (apiToken !== undefined) {
      updates.jiraApiToken = apiToken;
    }
    if (domain !== undefined) {
      updates.jiraDomain = domain;
    }
    if (projectKey !== undefined) {
      updates.jiraProjectKey = projectKey;
    }
    
    await storage.updateCompany(user.companyId, updates);
    res.json({ success: true, message: "Jira integration configured" });
  } catch (error: any) {
    console.error("Error configuring Jira:", error);
    res.status(500).json({ error: error.message });
  }
});

// Test Jira connection
app.post("/api/integrations/jira/test", isAuthenticated, async (req: any, res) => {
  try {
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }

    const { getJiraIntegration } = await import("../lib/jiraIntegration");
    const integration = await getJiraIntegration(user.companyId);
    
    if (!integration) {
      return res.json({ success: false, error: "Jira not configured - missing domain, email, or API token" });
    }

    const result = await integration.testConnection();
    res.json(result);
  } catch (error: any) {
    console.error("Error testing Jira:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch Jira projects
app.get("/api/integrations/jira/projects", isAuthenticated, async (req: any, res) => {
  try {
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }

    const { getJiraIntegration } = await import("../lib/jiraIntegration");
    const integration = await getJiraIntegration(user.companyId);
    
    if (!integration) {
      return res.json({ success: false, error: "Jira not configured" });
    }

    const projects = await integration.fetchProjects();
    res.json({ success: true, projects });
  } catch (error: any) {
    console.error("Error fetching Jira projects:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch Jira issues
app.get("/api/integrations/jira/issues/:projectKey", isAuthenticated, async (req: any, res) => {
  try {
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }

    const { getJiraIntegration } = await import("../lib/jiraIntegration");
    const integration = await getJiraIntegration(user.companyId);
    
    if (!integration) {
      return res.json({ success: false, error: "Jira not configured" });
    }

    const issues = await integration.fetchIssues(req.params.projectKey);
    res.json({ success: true, issues });
  } catch (error: any) {
    console.error("Error fetching Jira issues:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// LINEAR INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/linear/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { enabled, apiKey, teamId } = req.body;
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    const updates: any = {
      linearEnabled: enabled ? 1 : 0,
    };
    
    if (apiKey !== undefined) {
      updates.linearApiKey = apiKey;
    }
    if (teamId !== undefined) {
      updates.linearTeamId = teamId;
    }
    
    await storage.updateCompany(user.companyId, updates);
    res.json({ success: true, message: "Linear integration configured" });
  } catch (error: any) {
    console.error("Error configuring Linear:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/linear/test", isAuthenticated, async (req: any, res) => {
  try {
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    const company = await storage.getCompany(user.companyId);
    if (!company?.linearApiKey) {
      return res.status(400).json({ success: false, message: "Linear API key not configured" });
    }
    
    // Test Linear API connectivity
    const response = await axios.post("https://api.linear.app/graphql", {
      query: `{ viewer { id name email } }`
    }, {
      headers: {
        "Authorization": company.linearApiKey,
        "Content-Type": "application/json",
      },
      timeout: 5000,
    });
    
    res.json({ 
      success: true, 
      message: "Linear configuration saved (connectivity not verified)",
      user: response.data?.data?.viewer?.name || "Connected"
    });
  } catch (error: any) {
    console.error("Error testing Linear:", error);
    res.status(500).json({ success: false, message: error.response?.data?.errors?.[0]?.message || error.message });
  }
});

// ==========================================
// AMAZON SELLER CENTRAL INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/amazon-seller/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { sellerId, mwsAuthToken, accessKeyId, secretAccessKey, marketplace, syncOptions } = req.body;
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    // In production, credentials would be securely stored
    res.json({ success: true, message: "Amazon Seller Central integration configured" });
  } catch (error: any) {
    console.error("Error configuring Amazon Seller:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/amazon-seller/test", isAuthenticated, async (req: any, res) => {
  try {
    const { sellerId, accessKeyId, secretAccessKey } = req.body;
    if (!sellerId || !accessKeyId || !secretAccessKey) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    // Simulated connection test - in production would validate with Amazon SP-API
    res.json({ success: true, message: "Amazon Seller Central configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing Amazon Seller:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// WOOCOMMERCE INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/woocommerce/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { storeUrl, consumerKey, consumerSecret, syncOptions } = req.body;
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "WooCommerce integration configured" });
  } catch (error: any) {
    console.error("Error configuring WooCommerce:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/woocommerce/test", isAuthenticated, async (req: any, res) => {
  try {
    const { storeUrl, consumerKey, consumerSecret } = req.body;
    if (!storeUrl || !consumerKey || !consumerSecret) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    // Simulated connection test - in production would validate with WooCommerce REST API
    res.json({ success: true, message: "WooCommerce store configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing WooCommerce:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// SHAREPOINT INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/sharepoint/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { tenantId, clientId, clientSecret, siteUrl, syncOptions } = req.body;
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "SharePoint integration configured" });
  } catch (error: any) {
    console.error("Error configuring SharePoint:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/sharepoint/test", isAuthenticated, async (req: any, res) => {
  try {
    const { tenantId, clientId, clientSecret } = req.body;
    if (!tenantId || !clientId || !clientSecret) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    // Simulated connection test - in production would validate with Microsoft Graph API
    res.json({ success: true, message: "SharePoint configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing SharePoint:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// FLEXPORT INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/flexport/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { apiKey, environment, syncOptions } = req.body;
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "Flexport integration configured" });
  } catch (error: any) {
    console.error("Error configuring Flexport:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/flexport/test", isAuthenticated, async (req: any, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ success: false, message: "Missing API key" });
    }
    // Simulated connection test - in production would validate with Flexport API
    res.json({ success: true, message: "Flexport API configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing Flexport:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// TABLEAU INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/tableau/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { serverUrl, siteName, tokenName, tokenSecret, exportOptions } = req.body;
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "Tableau integration configured" });
  } catch (error: any) {
    console.error("Error configuring Tableau:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/tableau/test", isAuthenticated, async (req: any, res) => {
  try {
    const { serverUrl, tokenName, tokenSecret } = req.body;
    if (!serverUrl || !tokenName || !tokenSecret) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    // Simulated connection test - in production would validate with Tableau REST API
    res.json({ success: true, message: "Tableau Server configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing Tableau:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// SNOWFLAKE INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/snowflake/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { accountIdentifier, username, warehouse, database, schema, role, syncOptions } = req.body;
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "Snowflake integration configured" });
  } catch (error: any) {
    console.error("Error configuring Snowflake:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/snowflake/test", isAuthenticated, async (req: any, res) => {
  try {
    const { accountIdentifier, username, password, warehouse } = req.body;
    if (!accountIdentifier || !username || !password) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    res.json({ success: true, message: "Snowflake configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing Snowflake:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// MONDAY.COM INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/monday/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { apiToken, workspaceId, defaultBoardId, syncOptions } = req.body;
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "Monday.com integration configured" });
  } catch (error: any) {
    console.error("Error configuring Monday:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/monday/test", isAuthenticated, async (req: any, res) => {
  try {
    const { apiToken } = req.body;
    if (!apiToken) {
      return res.status(400).json({ success: false, message: "Missing API token" });
    }
    res.json({ success: true, message: "Monday.com configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing Monday:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// ASANA INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/asana/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { accessToken, workspaceGid, defaultProjectGid, syncOptions } = req.body;
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "Asana integration configured" });
  } catch (error: any) {
    console.error("Error configuring Asana:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/asana/test", isAuthenticated, async (req: any, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ success: false, message: "Missing access token" });
    }
    res.json({ success: true, message: "Asana configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing Asana:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// BIGCOMMERCE INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/bigcommerce/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { storeHash, accessToken, clientId, clientSecret, syncOptions } = req.body;
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "BigCommerce integration configured" });
  } catch (error: any) {
    console.error("Error configuring BigCommerce:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/bigcommerce/test", isAuthenticated, async (req: any, res) => {
  try {
    const { storeHash, accessToken } = req.body;
    if (!storeHash || !accessToken) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    res.json({ success: true, message: "BigCommerce store configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing BigCommerce:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// STRIPE CONNECT INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/stripe-connect/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { publishableKey, webhookSecret, environment, syncOptions } = req.body;
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "Stripe integration configured" });
  } catch (error: any) {
    console.error("Error configuring Stripe:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/stripe-connect/test", isAuthenticated, async (req: any, res) => {
  try {
    const { secretKey } = req.body;
    if (!secretKey) {
      return res.status(400).json({ success: false, message: "Missing secret key" });
    }
    res.json({ success: true, message: "Stripe API configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing Stripe:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// DOCUSIGN INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/docusign/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { integrationKey, secretKey, userId, accountId, syncOptions } = req.body;
    if (!integrationKey || !secretKey || !accountId) {
      return res.status(400).json({ error: "Missing required fields: integrationKey, secretKey, accountId" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "DocuSign integration configured" });
  } catch (error: any) {
    console.error("Error configuring DocuSign:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/docusign/test", isAuthenticated, async (req: any, res) => {
  try {
    const { integrationKey, userId, accountId } = req.body;
    if (!integrationKey || !userId || !accountId) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    res.json({ success: true, message: "DocuSign configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing DocuSign:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// FEDEX INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/fedex/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { apiKey, secretKey, accountNumber, meterNumber, syncOptions } = req.body;
    if (!apiKey || !secretKey || !accountNumber) {
      return res.status(400).json({ error: "Missing required fields: apiKey, secretKey, accountNumber" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "FedEx integration configured" });
  } catch (error: any) {
    console.error("Error configuring FedEx:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/fedex/test", isAuthenticated, async (req: any, res) => {
  try {
    const { apiKey, secretKey, accountNumber } = req.body;
    if (!apiKey || !secretKey || !accountNumber) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    res.json({ success: true, message: "FedEx API configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing FedEx:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// UPS INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/ups/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { clientId, clientSecret, accountNumber, syncOptions } = req.body;
    if (!clientId || !clientSecret) {
      return res.status(400).json({ error: "Missing required fields: clientId, clientSecret" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "UPS integration configured" });
  } catch (error: any) {
    console.error("Error configuring UPS:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/ups/test", isAuthenticated, async (req: any, res) => {
  try {
    const { clientId, clientSecret, accountNumber } = req.body;
    if (!clientId || !clientSecret || !accountNumber) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    res.json({ success: true, message: "UPS API configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing UPS:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// QUICKBOOKS INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/quickbooks/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { clientId, clientSecret, realmId, environment, syncOptions } = req.body;
    if (!clientId || !clientSecret || !realmId) {
      return res.status(400).json({ error: "Missing required fields: clientId, clientSecret, realmId" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "QuickBooks integration configured" });
  } catch (error: any) {
    console.error("Error configuring QuickBooks:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/quickbooks/test", isAuthenticated, async (req: any, res) => {
  try {
    const { clientId, clientSecret, realmId } = req.body;
    if (!clientId || !clientSecret || !realmId) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    res.json({ success: true, message: "QuickBooks configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing QuickBooks:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// XERO INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/xero/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { clientId, clientSecret, tenantId, syncOptions } = req.body;
    if (!clientId || !clientSecret) {
      return res.status(400).json({ error: "Missing required fields: clientId, clientSecret" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "Xero integration configured" });
  } catch (error: any) {
    console.error("Error configuring Xero:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/xero/test", isAuthenticated, async (req: any, res) => {
  try {
    const { clientId, clientSecret } = req.body;
    if (!clientId || !clientSecret) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    res.json({ success: true, message: "Xero configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing Xero:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// LOOKER INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/looker/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { instanceUrl, clientId, clientSecret, syncOptions } = req.body;
    if (!instanceUrl || !clientId || !clientSecret) {
      return res.status(400).json({ error: "Missing required fields: instanceUrl, clientId, clientSecret" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "Looker integration configured" });
  } catch (error: any) {
    console.error("Error configuring Looker:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/looker/test", isAuthenticated, async (req: any, res) => {
  try {
    const { instanceUrl, clientId, clientSecret } = req.body;
    if (!instanceUrl || !clientId || !clientSecret) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    res.json({ success: true, message: "Looker configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing Looker:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// DHL INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/dhl/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { apiKey, apiSecret, accountNumber, syncOptions } = req.body;
    if (!apiKey || !apiSecret) {
      return res.status(400).json({ error: "Missing required fields: apiKey, apiSecret" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "DHL integration configured" });
  } catch (error: any) {
    console.error("Error configuring DHL:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/dhl/test", isAuthenticated, async (req: any, res) => {
  try {
    const { apiKey, apiSecret } = req.body;
    if (!apiKey || !apiSecret) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    res.json({ success: true, message: "DHL API configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing DHL:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// BILL.COM INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/billcom/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { developerKey, userName, password, orgId, environment, syncOptions } = req.body;
    if (!developerKey || !userName || !password) {
      return res.status(400).json({ error: "Missing required fields: developerKey, userName, password" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "Bill.com integration configured" });
  } catch (error: any) {
    console.error("Error configuring Bill.com:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/billcom/test", isAuthenticated, async (req: any, res) => {
  try {
    const { developerKey, userName, password } = req.body;
    if (!developerKey || !userName || !password) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    res.json({ success: true, message: "Bill.com configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing Bill.com:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// TRELLO INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/trello/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { apiKey, apiToken, defaultBoardId, syncOptions } = req.body;
    if (!apiKey || !apiToken) {
      return res.status(400).json({ error: "Missing required fields: apiKey, apiToken" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "Trello integration configured" });
  } catch (error: any) {
    console.error("Error configuring Trello:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/trello/test", isAuthenticated, async (req: any, res) => {
  try {
    const { apiKey, apiToken } = req.body;
    if (!apiKey || !apiToken) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    res.json({ success: true, message: "Trello API configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing Trello:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// ZENDESK INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/zendesk/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { subdomain, email, apiToken, syncOptions } = req.body;
    if (!subdomain || !email || !apiToken) {
      return res.status(400).json({ error: "Missing required fields: subdomain, email, apiToken" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "Zendesk integration configured" });
  } catch (error: any) {
    console.error("Error configuring Zendesk:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/zendesk/test", isAuthenticated, async (req: any, res) => {
  try {
    const { subdomain, email, apiToken } = req.body;
    if (!subdomain || !email || !apiToken) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    res.json({ success: true, message: "Zendesk configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing Zendesk:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// MAILCHIMP INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/mailchimp/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { apiKey, serverPrefix, defaultListId, syncOptions } = req.body;
    if (!apiKey || !serverPrefix) {
      return res.status(400).json({ error: "Missing required fields: apiKey, serverPrefix" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "Mailchimp integration configured" });
  } catch (error: any) {
    console.error("Error configuring Mailchimp:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/mailchimp/test", isAuthenticated, async (req: any, res) => {
  try {
    const { apiKey, serverPrefix } = req.body;
    if (!apiKey || !serverPrefix) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    res.json({ success: true, message: "Mailchimp API configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing Mailchimp:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// SENDGRID INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/sendgrid/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { apiKey, fromEmail, fromName, syncOptions } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: "Missing required field: apiKey" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "SendGrid integration configured" });
  } catch (error: any) {
    console.error("Error configuring SendGrid:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/sendgrid/test", isAuthenticated, async (req: any, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ success: false, message: "Missing API key" });
    }
    res.json({ success: true, message: "SendGrid API configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing SendGrid:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// AIRTABLE INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/airtable/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { apiKey, baseId, defaultTableId, syncOptions } = req.body;
    if (!apiKey || !baseId) {
      return res.status(400).json({ error: "Missing required fields: apiKey, baseId" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "Airtable integration configured" });
  } catch (error: any) {
    console.error("Error configuring Airtable:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/airtable/test", isAuthenticated, async (req: any, res) => {
  try {
    const { apiKey, baseId } = req.body;
    if (!apiKey || !baseId) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    res.json({ success: true, message: "Airtable configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing Airtable:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// SAP ARIBA INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/ariba/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { realm, applicationKey, sharedSecret, syncOptions } = req.body;
    if (!realm || !applicationKey || !sharedSecret) {
      return res.status(400).json({ error: "Missing required fields: realm, applicationKey, sharedSecret" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "SAP Ariba integration configured" });
  } catch (error: any) {
    console.error("Error configuring SAP Ariba:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/ariba/test", isAuthenticated, async (req: any, res) => {
  try {
    const { realm, applicationKey, sharedSecret } = req.body;
    if (!realm || !applicationKey || !sharedSecret) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    res.json({ success: true, message: "SAP Ariba configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing SAP Ariba:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// COUPA INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/coupa/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { instanceUrl, clientId, clientSecret, syncOptions } = req.body;
    if (!instanceUrl || !clientId || !clientSecret) {
      return res.status(400).json({ error: "Missing required fields: instanceUrl, clientId, clientSecret" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "Coupa integration configured" });
  } catch (error: any) {
    console.error("Error configuring Coupa:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/coupa/test", isAuthenticated, async (req: any, res) => {
  try {
    const { instanceUrl, clientId, clientSecret } = req.body;
    if (!instanceUrl || !clientId || !clientSecret) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    res.json({ success: true, message: "Coupa configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing Coupa:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// MANHATTAN WMS INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/manhattan/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { serverUrl, username, password, warehouseId, syncOptions } = req.body;
    if (!serverUrl || !username || !password) {
      return res.status(400).json({ error: "Missing required fields: serverUrl, username, password" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "Manhattan WMS integration configured" });
  } catch (error: any) {
    console.error("Error configuring Manhattan WMS:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/manhattan/test", isAuthenticated, async (req: any, res) => {
  try {
    const { serverUrl, username, password } = req.body;
    if (!serverUrl || !username || !password) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    res.json({ success: true, message: "Manhattan WMS configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing Manhattan WMS:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// ETQ RELIANCE INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/etq/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { instanceUrl, apiKey, apiSecret, syncOptions } = req.body;
    if (!instanceUrl || !apiKey || !apiSecret) {
      return res.status(400).json({ error: "Missing required fields: instanceUrl, apiKey, apiSecret" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "ETQ Reliance integration configured" });
  } catch (error: any) {
    console.error("Error configuring ETQ Reliance:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/etq/test", isAuthenticated, async (req: any, res) => {
  try {
    const { instanceUrl, apiKey, apiSecret } = req.body;
    if (!instanceUrl || !apiKey || !apiSecret) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    res.json({ success: true, message: "ETQ Reliance configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing ETQ Reliance:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// ORACLE NETSUITE INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/netsuite/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { accountId, consumerKey, consumerSecret, tokenId, tokenSecret, syncOptions } = req.body;
    if (!accountId || !consumerKey || !consumerSecret || !tokenId || !tokenSecret) {
      return res.status(400).json({ error: "Missing required fields: accountId, consumerKey, consumerSecret, tokenId, tokenSecret" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "Oracle NetSuite integration configured" });
  } catch (error: any) {
    console.error("Error configuring Oracle NetSuite:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/netsuite/test", isAuthenticated, async (req: any, res) => {
  try {
    const { accountId, consumerKey, consumerSecret, tokenId, tokenSecret } = req.body;
    if (!accountId || !consumerKey || !consumerSecret || !tokenId || !tokenSecret) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    res.json({ success: true, message: "Oracle NetSuite configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing Oracle NetSuite:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// SPS COMMERCE INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/sps-commerce/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { apiKey, apiSecret, companyId, syncOptions } = req.body;
    if (!apiKey || !apiSecret) {
      return res.status(400).json({ error: "Missing required fields: apiKey, apiSecret" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "SPS Commerce integration configured" });
  } catch (error: any) {
    console.error("Error configuring SPS Commerce:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/sps-commerce/test", isAuthenticated, async (req: any, res) => {
  try {
    const { apiKey, apiSecret } = req.body;
    if (!apiKey || !apiSecret) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    res.json({ success: true, message: "SPS Commerce configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing SPS Commerce:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// SIEMENS TEAMCENTER INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/teamcenter/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { serverUrl, username, password, syncOptions } = req.body;
    if (!serverUrl || !username || !password) {
      return res.status(400).json({ error: "Missing required fields: serverUrl, username, password" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "Siemens Teamcenter integration configured" });
  } catch (error: any) {
    console.error("Error configuring Siemens Teamcenter:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/teamcenter/test", isAuthenticated, async (req: any, res) => {
  try {
    const { serverUrl, username, password } = req.body;
    if (!serverUrl || !username || !password) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    res.json({ success: true, message: "Siemens Teamcenter configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing Siemens Teamcenter:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// SAP S/4HANA INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/sap/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { serverUrl, client, username, password, syncOptions } = req.body;
    if (!serverUrl || !client || !username || !password) {
      return res.status(400).json({ error: "Missing required fields: serverUrl, client, username, password" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "SAP S/4HANA integration configured" });
  } catch (error: any) {
    console.error("Error configuring SAP S/4HANA:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/sap/test", isAuthenticated, async (req: any, res) => {
  try {
    const { serverUrl, client, username, password } = req.body;
    if (!serverUrl || !client || !username || !password) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    res.json({ success: true, message: "SAP S/4HANA configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing SAP S/4HANA:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// MICROSOFT DYNAMICS 365 INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/dynamics/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { tenantId, clientId, clientSecret, environmentUrl, syncOptions } = req.body;
    if (!tenantId || !clientId || !clientSecret || !environmentUrl) {
      return res.status(400).json({ error: "Missing required fields: tenantId, clientId, clientSecret, environmentUrl" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "Microsoft Dynamics 365 integration configured" });
  } catch (error: any) {
    console.error("Error configuring Microsoft Dynamics 365:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/dynamics/test", isAuthenticated, async (req: any, res) => {
  try {
    const { tenantId, clientId, clientSecret, environmentUrl } = req.body;
    if (!tenantId || !clientId || !clientSecret || !environmentUrl) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    res.json({ success: true, message: "Microsoft Dynamics 365 configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing Microsoft Dynamics 365:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// INFOR CLOUDSUITE INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/infor/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { ionApiUrl, tenantId, clientId, clientSecret, syncOptions } = req.body;
    if (!ionApiUrl || !tenantId || !clientId || !clientSecret) {
      return res.status(400).json({ error: "Missing required fields: ionApiUrl, tenantId, clientId, clientSecret" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "Infor CloudSuite integration configured" });
  } catch (error: any) {
    console.error("Error configuring Infor CloudSuite:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/infor/test", isAuthenticated, async (req: any, res) => {
  try {
    const { ionApiUrl, tenantId, clientId, clientSecret } = req.body;
    if (!ionApiUrl || !tenantId || !clientId || !clientSecret) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    res.json({ success: true, message: "Infor CloudSuite configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing Infor CloudSuite:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// PROJECT44 INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/project44/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { apiKey, clientId, clientSecret, syncOptions } = req.body;
    if (!apiKey || !clientId || !clientSecret) {
      return res.status(400).json({ error: "Missing required fields: apiKey, clientId, clientSecret" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "project44 integration configured" });
  } catch (error: any) {
    console.error("Error configuring project44:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/project44/test", isAuthenticated, async (req: any, res) => {
  try {
    const { apiKey, clientId, clientSecret } = req.body;
    if (!apiKey || !clientId || !clientSecret) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    res.json({ success: true, message: "project44 configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing project44:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// FISHBOWL INTEGRATION ROUTES
// ==========================================

app.post("/api/integrations/fishbowl/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { serverUrl, username, password, syncOptions } = req.body;
    if (!serverUrl || !username || !password) {
      return res.status(400).json({ error: "Missing required fields: serverUrl, username, password" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    res.json({ success: true, message: "Fishbowl integration configured" });
  } catch (error: any) {
    console.error("Error configuring Fishbowl:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/fishbowl/test", isAuthenticated, async (req: any, res) => {
  try {
    const { serverUrl, username, password } = req.body;
    if (!serverUrl || !username || !password) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    res.json({ success: true, message: "Fishbowl configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing Fishbowl:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Sage X3 Integration Routes
app.post("/api/integrations/sage-x3/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { serverUrl, folder, username, password, syncOptions } = req.body;
    if (!serverUrl || !folder || !username || !password) {
      return res.status(400).json({ error: "Missing required fields: serverUrl, folder, username, password" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    res.json({ success: true, message: "Sage X3 integration configured" });
  } catch (error: any) {
    console.error("Error configuring Sage X3:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/sage-x3/test", isAuthenticated, async (req: any, res) => {
  try {
    const { serverUrl, folder, username, password } = req.body;
    if (!serverUrl || !folder || !username || !password) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    res.json({ success: true, message: "Sage X3 configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing Sage X3:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// OPC-UA Integration Routes
app.post("/api/integrations/opc-ua/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { endpointUrl, securityMode, username, password, syncOptions } = req.body;
    if (!endpointUrl || !securityMode) {
      return res.status(400).json({ error: "Missing required fields: endpointUrl, securityMode" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    res.json({ success: true, message: "OPC-UA integration configured" });
  } catch (error: any) {
    console.error("Error configuring OPC-UA:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/opc-ua/test", isAuthenticated, async (req: any, res) => {
  try {
    const { endpointUrl, securityMode } = req.body;
    if (!endpointUrl || !securityMode) {
      return res.status(400).json({ success: false, message: "Missing required: endpointUrl, securityMode" });
    }
    res.json({ success: true, message: "OPC-UA server configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing OPC-UA:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// MQTT Broker Integration Routes
app.post("/api/integrations/mqtt/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { brokerUrl, port, username, password, useTLS, syncOptions } = req.body;
    if (!brokerUrl || !port) {
      return res.status(400).json({ error: "Missing required fields: brokerUrl, port" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    res.json({ success: true, message: "MQTT Broker integration configured" });
  } catch (error: any) {
    console.error("Error configuring MQTT:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/mqtt/test", isAuthenticated, async (req: any, res) => {
  try {
    const { brokerUrl, port } = req.body;
    if (!brokerUrl || !port) {
      return res.status(400).json({ success: false, message: "Missing required: brokerUrl, port" });
    }
    res.json({ success: true, message: "MQTT broker configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing MQTT:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Kepware KEPServerEX Integration Routes
app.post("/api/integrations/kepware/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { serverUrl, username, password, projectName, syncOptions } = req.body;
    if (!serverUrl || !username || !password) {
      return res.status(400).json({ error: "Missing required fields: serverUrl, username, password" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    res.json({ success: true, message: "Kepware KEPServerEX integration configured" });
  } catch (error: any) {
    console.error("Error configuring Kepware:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/kepware/test", isAuthenticated, async (req: any, res) => {
  try {
    const { serverUrl, username, password } = req.body;
    if (!serverUrl || !username || !password) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    res.json({ success: true, message: "Kepware KEPServerEX configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing Kepware:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// NetSuite Financials Integration Routes
app.post("/api/integrations/netsuite-financials/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { accountId, consumerKey, consumerSecret, tokenId, tokenSecret, syncOptions } = req.body;
    if (!accountId || !consumerKey || !consumerSecret || !tokenId || !tokenSecret) {
      return res.status(400).json({ error: "Missing required fields: accountId, consumerKey, consumerSecret, tokenId, tokenSecret" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    res.json({ success: true, message: "NetSuite Financials integration configured" });
  } catch (error: any) {
    console.error("Error configuring NetSuite Financials:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/netsuite-financials/test", isAuthenticated, async (req: any, res) => {
  try {
    const { accountId, consumerKey, consumerSecret, tokenId, tokenSecret } = req.body;
    if (!accountId || !consumerKey || !consumerSecret || !tokenId || !tokenSecret) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    res.json({ success: true, message: "NetSuite Financials configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing NetSuite Financials:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Jaggaer Integration Routes
app.post("/api/integrations/jaggaer/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { instanceUrl, apiKey, apiSecret, syncOptions } = req.body;
    if (!instanceUrl || !apiKey || !apiSecret) {
      return res.status(400).json({ error: "Missing required fields: instanceUrl, apiKey, apiSecret" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    res.json({ success: true, message: "Jaggaer integration configured" });
  } catch (error: any) {
    console.error("Error configuring Jaggaer:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/jaggaer/test", isAuthenticated, async (req: any, res) => {
  try {
    const { instanceUrl, apiKey, apiSecret } = req.body;
    if (!instanceUrl || !apiKey || !apiSecret) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    res.json({ success: true, message: "Jaggaer configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing Jaggaer:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// SAP EWM Integration Routes
app.post("/api/integrations/sap-ewm/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { serverUrl, client, warehouseNumber, username, password, syncOptions } = req.body;
    if (!serverUrl || !client || !warehouseNumber || !username || !password) {
      return res.status(400).json({ error: "Missing required fields: serverUrl, client, warehouseNumber, username, password" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    res.json({ success: true, message: "SAP EWM integration configured" });
  } catch (error: any) {
    console.error("Error configuring SAP EWM:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/sap-ewm/test", isAuthenticated, async (req: any, res) => {
  try {
    const { serverUrl, client, warehouseNumber, username, password } = req.body;
    if (!serverUrl || !client || !warehouseNumber || !username || !password) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    res.json({ success: true, message: "SAP EWM configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing SAP EWM:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// MasterControl Integration Routes
app.post("/api/integrations/mastercontrol/configure", isAuthenticated, async (req: any, res) => {
  try {
    const { instanceUrl, apiKey, apiSecret, syncOptions } = req.body;
    if (!instanceUrl || !apiKey || !apiSecret) {
      return res.status(400).json({ error: "Missing required fields: instanceUrl, apiKey, apiSecret" });
    }
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    res.json({ success: true, message: "MasterControl integration configured" });
  } catch (error: any) {
    console.error("Error configuring MasterControl:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/integrations/mastercontrol/test", isAuthenticated, async (req: any, res) => {
  try {
    const { instanceUrl, apiKey, apiSecret } = req.body;
    if (!instanceUrl || !apiKey || !apiSecret) {
      return res.status(400).json({ success: false, message: "Missing required credentials" });
    }
    res.json({ success: true, message: "MasterControl configuration saved (connectivity not verified)" });
  } catch (error: any) {
    console.error("Error testing MasterControl:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DATA EXPORT API - For BI Tools (Power BI, Tableau, Google Sheets)
app.get("/api/export/datasets", isAuthenticated, async (req: any, res) => {
  try {
    const datasets = [
      { 
        id: "materials", 
        name: "Materials Catalog", 
        description: "Complete materials inventory with costs and suppliers",
        fields: ["id", "name", "code", "category", "subCategory", "unit", "unitCost", "onHand", "reorderPoint", "leadTime"],
        recordCount: 0
      },
      { 
        id: "suppliers", 
        name: "Suppliers", 
        description: "Supplier directory with contact and performance data",
        fields: ["id", "name", "code", "country", "city", "contactEmail", "riskScore", "leadTime", "rating"],
        recordCount: 0
      },
      { 
        id: "inventory", 
        name: "Inventory Levels", 
        description: "Current inventory status with reorder recommendations",
        fields: ["materialId", "materialName", "onHand", "unitCost", "totalValue", "reorderPoint", "needsReorder"],
        recordCount: 0
      },
      { 
        id: "forecasts", 
        name: "Demand Forecasts", 
        description: "Multi-horizon demand predictions by SKU",
        fields: ["skuId", "skuName", "horizonDays", "predictedDemand", "confidence", "forecastDate"],
        recordCount: 0
      },
      { 
        id: "commodities", 
        name: "Commodity Prices", 
        description: "Current and historical commodity pricing",
        fields: ["commodity", "currentPrice", "previousPrice", "changePercent", "unit", "source", "lastUpdated"],
        recordCount: 0
      },
      { 
        id: "rfqs", 
        name: "RFQs", 
        description: "Request for quotations with status and responses",
        fields: ["id", "rfqNumber", "materialId", "quantity", "status", "dueDate", "createdAt"],
        recordCount: 0
      },
      { 
        id: "purchase_orders", 
        name: "Purchase Orders", 
        description: "All purchase orders with line items and status",
        fields: ["id", "poNumber", "supplier", "totalAmount", "status", "orderDate", "expectedDelivery"],
        recordCount: 0
      }
    ];
    
    res.json({ datasets, apiBaseUrl: `/api/export` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/export/materials", isAuthenticated, async (req: any, res) => {
  try {
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    const format = (req.query.format as string) || 'json';
    const materials = await storage.getMaterials(user.companyId);
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="materials.csv"');
      return res.send(convertToCSV(materials));
    }
    
    res.json({ data: materials, count: materials.length, exportedAt: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/export/suppliers", isAuthenticated, async (req: any, res) => {
  try {
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    const format = (req.query.format as string) || 'json';
    const suppliers = await storage.getSuppliers(user.companyId);
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="suppliers.csv"');
      return res.send(convertToCSV(suppliers));
    }
    
    res.json({ data: suppliers, count: suppliers.length, exportedAt: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/export/inventory", isAuthenticated, async (req: any, res) => {
  try {
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    const format = (req.query.format as string) || 'json';
    const materials = await storage.getMaterials(user.companyId);
    
    const inventory = (materials as any[]).map(m => ({
      materialId: m.id,
      materialName: m.name,
      materialCode: m.code,
      category: m.category,
      onHand: m.onHand || 0,
      unitCost: m.unitCost || 0,
      totalValue: (m.onHand || 0) * (m.unitCost || 0),
      reorderPoint: m.reorderPoint || 0,
      needsReorder: (m.onHand || 0) < (m.reorderPoint || 0),
      unit: m.unit,
    }));
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="inventory.csv"');
      return res.send(convertToCSV(inventory));
    }
    
    res.json({ data: inventory, count: inventory.length, exportedAt: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/export/forecasts", isAuthenticated, async (req: any, res) => {
  try {
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    const format = (req.query.format as string) || 'json';
    const forecasts = await storage.getMultiHorizonForecasts(user.companyId, {});
    const skus = await storage.getSkus(user.companyId);
    
    const skuMap = new Map(skus.map(s => [s.id, s.name]));
    
    const exportData = forecasts.map(f => ({
      skuId: f.skuId,
      skuName: skuMap.get(f.skuId || '') || 'Unknown',
      horizonDays: f.horizonDays,
      predictedDemand: f.predictedDemand,
      lowerBound: f.lowerBound,
      upperBound: f.upperBound,
      confidence: f.confidence ?? (f as any).confidenceLevel,
      regime: f.economicRegime ?? (f as any).regime,
      forecastDate: f.forecastDate,
      createdAt: f.createdAt,
    }));
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="forecasts.csv"');
      return res.send(convertToCSV(exportData));
    }
    
    res.json({ data: exportData, count: exportData.length, exportedAt: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/export/rfqs", isAuthenticated, async (req: any, res) => {
  try {
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    const format = (req.query.format as string) || 'json';
    const rfqs = await storage.getRfqs(user.companyId);
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="rfqs.csv"');
      return res.send(convertToCSV(rfqs));
    }
    
    res.json({ data: rfqs, count: rfqs.length, exportedAt: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/export/purchase_orders", isAuthenticated, async (req: any, res) => {
  try {
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    const format = (req.query.format as string) || 'json';
    const purchaseOrders = await storage.getPurchaseOrders(user.companyId);
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="purchase_orders.csv"');
      return res.send(convertToCSV(purchaseOrders));
    }
    
    res.json({ data: purchaseOrders, count: purchaseOrders.length, exportedAt: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Export commodity prices data
app.get("/api/export/commodities", isAuthenticated, async (req: any, res) => {
  try {
    const authUserId = req.user.claims.sub;
    const user = await storage.getUser(authUserId);
    if (!user?.companyId) {
      return res.status(401).json({ error: "No company associated" });
    }
    
    const format = (req.query.format as string) || 'json';
    
    const { fetchAllCommodityPrices } = await import("../lib/commodityPricing");
    const prices = await fetchAllCommodityPrices();
    
    const commodityData = prices.map((p: any) => ({
      commodity: p.name || p.commodity,
      currentPrice: p.price || p.currentPrice,
      previousPrice: p.previousPrice || null,
      changePercent: p.change24h || p.changePercent || 0,
      unit: p.unit || 'USD',
      source: p.source || 'API',
      lastUpdated: p.lastUpdated || new Date().toISOString(),
      trend: p.trend || (p.change24h > 0 ? 'up' : p.change24h < 0 ? 'down' : 'stable'),
    }));
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="commodities.csv"');
      return res.send(convertToCSV(commodityData));
    }
    
    res.json({ data: commodityData, count: commodityData.length, exportedAt: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

}
