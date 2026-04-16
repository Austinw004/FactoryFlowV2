import { Express } from "express";
import { orchestrator } from "./integrationOrchestrator";
import { registerAllConnectors } from "./connectors";
import { CredentialService } from "./credentialService";
import { db } from "../db";
import { integrationConnections, integrationEvents, syncJobs, deadLetterEvents, externalIdentities } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export function registerIntegrationOrchestratorRoutes(app: Express, isAuthenticated: any, rateLimiters: any) {
  registerAllConnectors();

  app.get("/api/orchestrator/connections", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(400).json({ error: "No company associated" });

      const connections = await orchestrator.getConnectionsForCompany(companyId);
      const registry = orchestrator.getRegistry().getAll();

      const enriched = Array.from(registry.entries()).map(([id, config]) => {
        const conn = connections.find((c) => c.integrationId === id);
        return {
          integrationId: id,
          displayName: config.displayName,
          category: config.category,
          capabilities: config.capabilities,
          requiresCredentials: config.requiresCredentials,
          regimeAware: config.regimeAware,
          paymentCritical: PAYMENT_CRITICAL_INTEGRATIONS.has(id),
          connection: conn ? {
            id: conn.id,
            status: conn.status,
            lastSyncAt: conn.lastSyncAt,
            lastSuccessfulSyncAt: conn.lastSuccessfulSyncAt,
            lastSyncStatus: conn.lastSyncStatus,
            lastErrorMessage: conn.lastErrorMessage,
            totalSyncs: conn.totalSyncs,
            totalErrors: conn.totalErrors,
            totalObjectsSynced: conn.totalObjectsSynced,
            isVerified: conn.isVerified === 1,
            syncFrequencyMinutes: conn.syncFrequencyMinutes,
            dataFreshness: conn.lastSuccessfulSyncAt
              ? calculateFreshness(conn.lastSuccessfulSyncAt)
              : "no_data",
          } : null,
        };
      });

      res.json(enriched);
    } catch (error: any) {
      console.error("[Orchestrator] Error fetching connections:", error);
      res.status(500).json({ error: "Failed to fetch connections" });
    }
  });

  app.post("/api/orchestrator/connections/:integrationId/connect", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(400).json({ error: "No company associated" });

      const { integrationId } = req.params;
      const config = orchestrator.getRegistry().getConfig(integrationId);
      if (!config) return res.status(404).json({ error: "Integration not found" });

      const connection = await orchestrator.upsertConnection({
        companyId,
        integrationId,
        displayName: config.displayName,
        status: "connected",
        capabilities: JSON.stringify(Object.entries(config.capabilities)
          .filter(([k, v]) => k.startsWith("can") && v === true)
          .map(([k]) => k.replace("can", "").toLowerCase())),
        supportedObjects: JSON.stringify(config.capabilities.supportedObjects),
        dataFlowDirection: config.capabilities.dataFlowDirection,
        configuredBy: req.user?.id,
      });

      await orchestrator.publishEvent({
        companyId,
        integrationId,
        connectionId: connection.id,
        eventType: "integration.connected",
        direction: "inbound",
        status: "processed",
        payload: JSON.stringify({ configuredBy: req.user?.id }),
      });

      res.json(connection);
    } catch (error: any) {
      console.error("[Orchestrator] Error connecting:", error);
      res.status(500).json({ error: "Failed to connect integration" });
    }
  });

  app.post("/api/orchestrator/connections/:integrationId/disconnect", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(400).json({ error: "No company associated" });

      const { integrationId } = req.params;
      await orchestrator.updateConnectionStatus(companyId, integrationId, "disabled");

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to disconnect" });
    }
  });

  app.post("/api/orchestrator/connections/:integrationId/health-check", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(400).json({ error: "No company associated" });

      const { integrationId } = req.params;
      const connector = orchestrator.getRegistry().get(integrationId);
      if (!connector) return res.status(404).json({ error: "Connector not found" });

      let credentials: Record<string, any> = {};
      try {
        const cred = await CredentialService.getCredentials(companyId, integrationId);
        if (cred) {
          credentials = JSON.parse(CredentialService.decrypt(cred.encryptedCredentials));
        }
      } catch (e) {
      }

      const result = await orchestrator.executeHealthCheck(companyId, integrationId, credentials);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: "Health check failed" });
    }
  });

  app.post("/api/orchestrator/connections/:integrationId/sync", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(400).json({ error: "No company associated" });

      const { integrationId } = req.params;
      const { objectTypes } = req.body;
      const connector = orchestrator.getRegistry().get(integrationId);
      if (!connector) return res.status(404).json({ error: "Connector not found" });

      let credentials: Record<string, any> = {};
      try {
        const cred = await CredentialService.getCredentials(companyId, integrationId);
        if (cred) {
          credentials = JSON.parse(CredentialService.decrypt(cred.encryptedCredentials));
        }
      } catch (e) {
      }

      const job = await orchestrator.executeSyncJob(
        companyId,
        integrationId,
        objectTypes || connector.config.capabilities.supportedObjects,
        credentials,
      );

      res.json(job);
    } catch (error: any) {
      console.error("[Orchestrator] Sync error:", error);
      res.status(500).json({ error: error.message || "Sync failed" });
    }
  });

  app.get("/api/orchestrator/events", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(400).json({ error: "No company associated" });

      const limit = parseInt(req.query.limit as string) || 50;
      const events = await orchestrator.getEvents(companyId, { limit });
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.get("/api/orchestrator/sync-jobs", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(400).json({ error: "No company associated" });

      const connectionId = req.query.connectionId as string;
      const jobs = await orchestrator.getSyncJobs(companyId, connectionId);
      res.json(jobs);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch sync jobs" });
    }
  });

  app.get("/api/orchestrator/dead-letter", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(400).json({ error: "No company associated" });

      const resolved = req.query.resolved === "true";
      const events = await orchestrator.getDeadLetterEvents(companyId, resolved);
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch dead letter events" });
    }
  });

  app.post("/api/orchestrator/dead-letter/:id/replay", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(400).json({ error: "No company associated" });
      const event = await orchestrator.replayDeadLetter(req.params.id, companyId);
      if (!event) return res.status(404).json({ error: "Dead letter not found or already resolved" });
      res.json(event);
    } catch (error: any) {
      res.status(500).json({ error: "Replay failed" });
    }
  });

  app.post("/api/orchestrator/dead-letter/:id/resolve", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(400).json({ error: "No company associated" });
      const { resolution } = req.body;
      await orchestrator.resolveDeadLetter(req.params.id, companyId, req.user?.id, resolution || "Manually resolved");
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Resolve failed" });
    }
  });

  app.get("/api/orchestrator/readiness-report", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(400).json({ error: "No company associated" });

      const report = await orchestrator.generateReadinessReport(companyId);
      res.json(report);
    } catch (error: any) {
      console.error("[Orchestrator] Readiness report error:", error);
      res.status(500).json({ error: "Failed to generate readiness report" });
    }
  });

  app.get("/api/orchestrator/dependency-graph", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(400).json({ error: "No company associated" });

      const report = await orchestrator.generateReadinessReport(companyId);
      res.json({
        graph: report.dependencyGraph,
        summary: report.summary,
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to generate dependency graph" });
    }
  });

  app.get("/api/orchestrator/identity-resolution", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(400).json({ error: "No company associated" });

      const identities = await db
        .select()
        .from(externalIdentities)
        .where(eq(externalIdentities.companyId, companyId))
        .orderBy(desc(externalIdentities.lastSyncedAt))
        .limit(100);

      res.json(identities);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch identities" });
    }
  });

  app.get("/api/orchestrator/security-audit", isAuthenticated, rateLimiters.api, async (req: any, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(400).json({ error: "No company associated" });

      const connections = await orchestrator.getConnectionsForCompany(companyId);
      const registry = orchestrator.getRegistry().getAll();

      const paymentCriticalIds = [
        "quickbooks", "xero", "stripe", "billcom",
        "netsuite-financials", "sap", "dynamics-365", "oracle-netsuite",
      ];

      let credentialStorageStatus: { verified: boolean; method: string; note: string };
      try {
        const testKey = CredentialService.getEncryptionKeyStatus();
        credentialStorageStatus = {
          verified: testKey.available,
          method: testKey.available ? "AES-256-CBC" : "not_configured",
          note: testKey.available
            ? "Encryption key present and credential service operational"
            : "Encryption key not configured - credentials cannot be stored securely",
        };
      } catch {
        credentialStorageStatus = {
          verified: false,
          method: "unknown",
          note: "Unable to verify credential storage status",
        };
      }

      const audit = {
        totalConnections: connections.length,
        credentialStorage: credentialStorageStatus,
        paymentCriticalConnections: connections
          .filter(c => paymentCriticalIds.includes(c.integrationId))
          .map(c => ({
            integrationId: c.integrationId,
            status: c.status,
            isVerified: c.isVerified === 1,
            requiresIdempotencyKey: true,
            lastSyncStatus: c.lastSyncStatus,
          })),
        regimeAwareConnections: Array.from(registry.entries())
          .filter(([, config]) => config.regimeAware)
          .map(([id, config]) => ({
            integrationId: id,
            displayName: config.displayName,
            connected: connections.some(c => c.integrationId === id),
          })),
        tenantIsolation: {
          method: "companyId column filter on all queries",
          note: "Enforced by application-layer query filters - not independently verified at database level",
        },
        auditTrail: {
          eventsTracked: ["integration.connected", "integration.disconnected", "sync.started", "sync.completed", "sync.failed"],
          note: "Event bus records integration lifecycle events with timestamps",
        },
      };

      res.json(audit);
    } catch (error: any) {
      res.status(500).json({ error: "Security audit failed" });
    }
  });

  console.log("[Orchestrator] Integration orchestrator routes registered");
}

const PAYMENT_CRITICAL_INTEGRATIONS = new Set([
  "quickbooks", "xero", "stripe", "billcom",
  "netsuite-financials", "sap", "dynamics-365", "oracle-netsuite",
]);

function calculateFreshness(lastSync: Date): string {
  const ageMs = Date.now() - lastSync.getTime();
  const ageMinutes = ageMs / 60000;
  if (ageMinutes < 5) return "fresh";
  if (ageMinutes < 60) return "recent";
  if (ageMinutes < 1440) return "stale";
  return "outdated";
}
