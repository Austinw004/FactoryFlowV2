import { db } from "../db";
import {
  integrationConnections,
  integrationEvents,
  syncJobs,
  deadLetterEvents,
  externalIdentities,
  integrationHealthSnapshots,
  type IntegrationConnection,
  type InsertIntegrationConnection,
  type IntegrationEvent,
  type InsertIntegrationEvent,
  type SyncJob,
  type InsertSyncJob,
  type DeadLetterEvent,
  type InsertDeadLetterEvent,
  type ExternalIdentity,
  type InsertExternalIdentity,
  type IntegrationHealthSnapshot,
  type InsertIntegrationHealthSnapshot,
  type CanonicalObjectType,
  type IntegrationStatus,
  type IntegrationCapability,
  CANONICAL_OBJECT_TYPES,
  INTEGRATION_STATUSES,
} from "@shared/schema";
import { eq, and, desc, sql, lt, isNull } from "drizzle-orm";
import crypto from "crypto";

export interface ConnectorCapabilities {
  canImport: boolean;
  canExport: boolean;
  canWebhook: boolean;
  canBatch: boolean;
  canRealTime: boolean;
  supportedObjects: CanonicalObjectType[];
  dataFlowDirection: "inbound" | "outbound" | "bidirectional";
}

export interface ConnectorConfig {
  integrationId: string;
  displayName: string;
  category: string;
  capabilities: ConnectorCapabilities;
  requiresCredentials: boolean;
  credentialFields: string[];
  regimeAware: boolean;
}

export interface SyncResult {
  success: boolean;
  objectsProcessed: number;
  objectsFailed: number;
  errors: Array<{ objectId: string; error: string; category: string }>;
  checkpoint?: string;
}

export interface HealthCheckResult {
  status: IntegrationStatus;
  latencyMs: number;
  message: string;
  details?: Record<string, any>;
}

export interface CanonicalObject {
  type: CanonicalObjectType;
  id: string;
  externalId: string;
  data: Record<string, any>;
  source: string;
  timestamp: Date;
}

export type EventHandler = (event: IntegrationEvent) => Promise<void>;

export abstract class BaseConnector {
  abstract config: ConnectorConfig;

  abstract validateCredentials(credentials: Record<string, any>): Promise<{ valid: boolean; error?: string }>;

  abstract healthCheck(credentials: Record<string, any>): Promise<HealthCheckResult>;

  abstract pull(
    credentials: Record<string, any>,
    objectTypes: CanonicalObjectType[],
    checkpoint?: string,
  ): Promise<{ objects: CanonicalObject[]; nextCheckpoint?: string }>;

  abstract push(
    credentials: Record<string, any>,
    objects: CanonicalObject[],
  ): Promise<SyncResult>;

  generateIdempotencyKey(externalId: string, objectType: string, version?: string): string {
    const input = `${this.config.integrationId}:${externalId}:${objectType}:${version || ""}`;
    return crypto.createHash("sha256").update(input).digest("hex").slice(0, 32);
  }
}

class IntegrationEventBus {
  private subscribers: Map<string, EventHandler[]> = new Map();

  subscribe(eventPattern: string, handler: EventHandler): void {
    if (!this.subscribers.has(eventPattern)) {
      this.subscribers.set(eventPattern, []);
    }
    this.subscribers.get(eventPattern)!.push(handler);
  }

  async publish(event: IntegrationEvent): Promise<void> {
    const patterns = [
      event.eventType,
      `${event.canonicalObjectType}.*`,
      `${event.integrationId}.*`,
      "*",
    ];

    for (const pattern of patterns) {
      const handlers = this.subscribers.get(pattern) || [];
      for (const handler of handlers) {
        try {
          await handler(event);
        } catch (err) {
          console.error(`[EventBus] Handler error for ${pattern}:`, err);
        }
      }
    }
  }
}

class ConnectorRegistry {
  private connectors: Map<string, BaseConnector> = new Map();
  private configs: Map<string, ConnectorConfig> = new Map();

  register(connector: BaseConnector): void {
    this.connectors.set(connector.config.integrationId, connector);
    this.configs.set(connector.config.integrationId, connector.config);
  }

  get(integrationId: string): BaseConnector | undefined {
    return this.connectors.get(integrationId);
  }

  getConfig(integrationId: string): ConnectorConfig | undefined {
    return this.configs.get(integrationId);
  }

  getAll(): Map<string, ConnectorConfig> {
    return this.configs;
  }

  has(integrationId: string): boolean {
    return this.connectors.has(integrationId);
  }
}

export class IntegrationOrchestrator {
  private registry = new ConnectorRegistry();
  private eventBus = new IntegrationEventBus();
  private retryConfig = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
  };

  getRegistry(): ConnectorRegistry {
    return this.registry;
  }

  getEventBus(): IntegrationEventBus {
    return this.eventBus;
  }

  registerConnector(connector: BaseConnector): void {
    this.registry.register(connector);
  }

  subscribeToEvents(pattern: string, handler: EventHandler): void {
    this.eventBus.subscribe(pattern, handler);
  }

  async getConnection(companyId: string, integrationId: string): Promise<IntegrationConnection | null> {
    const [conn] = await db
      .select()
      .from(integrationConnections)
      .where(and(
        eq(integrationConnections.companyId, companyId),
        eq(integrationConnections.integrationId, integrationId),
      ))
      .limit(1);
    return conn || null;
  }

  async getConnectionsForCompany(companyId: string): Promise<IntegrationConnection[]> {
    return db
      .select()
      .from(integrationConnections)
      .where(eq(integrationConnections.companyId, companyId))
      .orderBy(integrationConnections.integrationId);
  }

  async upsertConnection(data: InsertIntegrationConnection): Promise<IntegrationConnection> {
    const existing = await this.getConnection(data.companyId, data.integrationId);
    if (existing) {
      const [updated] = await db
        .update(integrationConnections)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(integrationConnections.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(integrationConnections)
      .values(data)
      .returning();
    return created;
  }

  async updateConnectionStatus(
    companyId: string,
    integrationId: string,
    status: string,
    details?: Partial<IntegrationConnection>,
  ): Promise<void> {
    await db
      .update(integrationConnections)
      .set({ status, ...details, updatedAt: new Date() })
      .where(and(
        eq(integrationConnections.companyId, companyId),
        eq(integrationConnections.integrationId, integrationId),
      ));
  }

  async publishEvent(event: InsertIntegrationEvent): Promise<IntegrationEvent> {
    const existingKey = event.idempotencyKey
      ? await db
          .select()
          .from(integrationEvents)
          .where(eq(integrationEvents.idempotencyKey, event.idempotencyKey))
          .limit(1)
      : [];

    if (existingKey.length > 0) {
      return existingKey[0];
    }

    const [created] = await db
      .insert(integrationEvents)
      .values(event)
      .returning();

    await this.eventBus.publish(created);
    return created;
  }

  async getEvents(
    companyId: string,
    options?: { integrationId?: string; status?: string; limit?: number },
  ): Promise<IntegrationEvent[]> {
    let query = db
      .select()
      .from(integrationEvents)
      .where(eq(integrationEvents.companyId, companyId))
      .orderBy(desc(integrationEvents.createdAt))
      .limit(options?.limit || 50);

    return query;
  }

  async createSyncJob(data: InsertSyncJob): Promise<SyncJob> {
    const [job] = await db.insert(syncJobs).values(data).returning();
    return job;
  }

  async updateSyncJob(jobId: string, updates: Partial<SyncJob>): Promise<void> {
    await db.update(syncJobs).set(updates).where(eq(syncJobs.id, jobId));
  }

  async getSyncJobs(companyId: string, connectionId?: string, limit = 20): Promise<SyncJob[]> {
    const conditions = [eq(syncJobs.companyId, companyId)];
    if (connectionId) conditions.push(eq(syncJobs.connectionId, connectionId));

    return db
      .select()
      .from(syncJobs)
      .where(and(...conditions))
      .orderBy(desc(syncJobs.createdAt))
      .limit(limit);
  }

  async addToDeadLetter(data: InsertDeadLetterEvent): Promise<DeadLetterEvent> {
    const [dle] = await db.insert(deadLetterEvents).values(data).returning();
    return dle;
  }

  async getDeadLetterEvents(companyId: string, resolved = false, limit = 50): Promise<DeadLetterEvent[]> {
    return db
      .select()
      .from(deadLetterEvents)
      .where(and(
        eq(deadLetterEvents.companyId, companyId),
        eq(deadLetterEvents.isResolved, resolved ? 1 : 0),
      ))
      .orderBy(desc(deadLetterEvents.createdAt))
      .limit(limit);
  }

  async resolveDeadLetter(id: string, userId: string, resolution: string): Promise<void> {
    await db
      .update(deadLetterEvents)
      .set({
        isResolved: 1,
        resolvedAt: new Date(),
        resolvedBy: userId,
        resolution,
      })
      .where(eq(deadLetterEvents.id, id));
  }

  async replayDeadLetter(id: string): Promise<IntegrationEvent | null> {
    const [dle] = await db
      .select()
      .from(deadLetterEvents)
      .where(eq(deadLetterEvents.id, id))
      .limit(1);

    if (!dle || dle.isResolved === 1) return null;

    const newEvent = await this.publishEvent({
      companyId: dle.companyId,
      integrationId: dle.integrationId,
      connectionId: dle.connectionId,
      eventType: dle.eventType,
      canonicalObjectType: dle.canonicalObjectType,
      payload: dle.payload,
      direction: "inbound",
      status: "pending",
      retryCount: (dle.retryCount || 0) + 1,
    });

    await db
      .update(deadLetterEvents)
      .set({ retryCount: (dle.retryCount || 0) + 1 })
      .where(eq(deadLetterEvents.id, id));

    return newEvent;
  }

  async resolveExternalIdentity(
    companyId: string,
    integrationId: string,
    externalId: string,
    externalObjectType: string,
  ): Promise<ExternalIdentity | null> {
    const [identity] = await db
      .select()
      .from(externalIdentities)
      .where(and(
        eq(externalIdentities.companyId, companyId),
        eq(externalIdentities.integrationId, integrationId),
        eq(externalIdentities.externalId, externalId),
        eq(externalIdentities.externalObjectType, externalObjectType),
      ))
      .limit(1);
    return identity || null;
  }

  async upsertExternalIdentity(data: InsertExternalIdentity): Promise<ExternalIdentity> {
    const existing = await this.resolveExternalIdentity(
      data.companyId,
      data.integrationId,
      data.externalId,
      data.externalObjectType,
    );
    if (existing) {
      const [updated] = await db
        .update(externalIdentities)
        .set({ ...data, lastSyncedAt: new Date() })
        .where(eq(externalIdentities.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(externalIdentities).values(data).returning();
    return created;
  }

  async recordHealthSnapshot(data: InsertIntegrationHealthSnapshot): Promise<void> {
    await db.insert(integrationHealthSnapshots).values(data);
  }

  async getLatestHealthSnapshots(companyId: string): Promise<IntegrationHealthSnapshot[]> {
    return db
      .select()
      .from(integrationHealthSnapshots)
      .where(eq(integrationHealthSnapshots.companyId, companyId))
      .orderBy(desc(integrationHealthSnapshots.checkedAt))
      .limit(100);
  }

  async executeSyncJob(
    companyId: string,
    integrationId: string,
    objectTypes: CanonicalObjectType[],
    credentials: Record<string, any>,
    regimeContext?: string,
  ): Promise<SyncJob> {
    const connector = this.registry.get(integrationId);
    if (!connector) {
      throw new Error(`No connector registered for integration: ${integrationId}`);
    }

    const connection = await this.getConnection(companyId, integrationId);
    if (!connection) {
      throw new Error(`No connection found for ${integrationId} in company ${companyId}`);
    }

    const job = await this.createSyncJob({
      companyId,
      connectionId: connection.id,
      integrationId,
      jobType: "pull",
      status: "running",
      objectTypes: JSON.stringify(objectTypes),
      startedAt: new Date(),
    });

    await this.updateConnectionStatus(companyId, integrationId, "syncing");

    try {
      const lastJob = (await this.getSyncJobs(companyId, connection.id, 1))[0];
      const checkpoint = lastJob?.checkpointData || undefined;

      const result = await connector.pull(credentials, objectTypes, checkpoint);

      for (const obj of result.objects) {
        const idempotencyKey = connector.generateIdempotencyKey(obj.externalId, obj.type);

        await this.publishEvent({
          companyId,
          integrationId,
          connectionId: connection.id,
          eventType: `canonical.${obj.type}.synced`,
          canonicalObjectType: obj.type,
          canonicalObjectId: obj.id,
          externalObjectId: obj.externalId,
          direction: "inbound",
          status: "processed",
          payload: JSON.stringify(obj.data),
          idempotencyKey,
          processedAt: new Date(),
          regimeContext,
        });

        await this.upsertExternalIdentity({
          companyId,
          integrationId,
          externalId: obj.externalId,
          externalObjectType: obj.type,
          canonicalObjectType: obj.type,
          canonicalObjectId: obj.id,
        });
      }

      await this.updateSyncJob(job.id, {
        status: "completed",
        totalObjects: result.objects.length,
        processedObjects: result.objects.length,
        checkpointData: result.nextCheckpoint,
        completedAt: new Date(),
      });

      await this.updateConnectionStatus(companyId, integrationId, "healthy", {
        lastSyncAt: new Date(),
        lastSyncStatus: "success",
        lastSuccessfulSyncAt: new Date(),
        totalSyncs: (connection.totalSyncs || 0) + 1,
        totalObjectsSynced: (connection.totalObjectsSynced || 0) + result.objects.length,
      });

      return (await db.select().from(syncJobs).where(eq(syncJobs.id, job.id)).limit(1))[0];
    } catch (error: any) {
      const errorMessage = error.message || "Unknown sync error";

      await this.updateSyncJob(job.id, {
        status: "failed",
        errorMessage,
        completedAt: new Date(),
      });

      await this.updateConnectionStatus(companyId, integrationId, "failed", {
        lastSyncAt: new Date(),
        lastSyncStatus: "failed",
        lastErrorAt: new Date(),
        lastErrorMessage: errorMessage,
        totalErrors: (connection.totalErrors || 0) + 1,
      });

      await this.addToDeadLetter({
        companyId,
        integrationId,
        connectionId: connection.id,
        eventType: "sync.failed",
        errorMessage,
        errorCategory: this.categorizeError(error),
        payload: JSON.stringify({ objectTypes, checkpoint: null }),
      });

      return (await db.select().from(syncJobs).where(eq(syncJobs.id, job.id)).limit(1))[0];
    }
  }

  async executeHealthCheck(
    companyId: string,
    integrationId: string,
    credentials: Record<string, any>,
  ): Promise<HealthCheckResult> {
    const connector = this.registry.get(integrationId);
    if (!connector) {
      return { status: "not_configured", latencyMs: 0, message: "No connector registered" };
    }

    const connection = await this.getConnection(companyId, integrationId);
    if (!connection) {
      return { status: "not_configured", latencyMs: 0, message: "Integration not connected" };
    }

    try {
      const start = Date.now();
      const result = await connector.healthCheck(credentials);
      const latencyMs = Date.now() - start;

      await this.recordHealthSnapshot({
        companyId,
        connectionId: connection.id,
        integrationId,
        status: result.status,
        latencyMs,
        details: JSON.stringify(result.details),
      });

      await this.updateConnectionStatus(companyId, integrationId, result.status);

      return { ...result, latencyMs };
    } catch (error: any) {
      const result: HealthCheckResult = {
        status: "failed",
        latencyMs: 0,
        message: error.message || "Health check failed",
      };

      await this.updateConnectionStatus(companyId, integrationId, "failed", {
        lastErrorAt: new Date(),
        lastErrorMessage: result.message,
      });

      return result;
    }
  }

  async generateReadinessReport(companyId: string): Promise<IntegrationReadinessReport> {
    const connections = await this.getConnectionsForCompany(companyId);
    const allConfigs = this.registry.getAll();
    const recentEvents = await this.getEvents(companyId, { limit: 200 });
    const deadLetters = await this.getDeadLetterEvents(companyId, false, 100);

    const integrations: IntegrationReadinessEntry[] = [];

    for (const [id, config] of allConfigs) {
      const connection = connections.find((c) => c.integrationId === id);
      const events = recentEvents.filter((e) => e.integrationId === id);
      const dleCount = deadLetters.filter((d) => d.integrationId === id).length;

      const successEvents = events.filter((e) => e.status === "processed");
      const errorRate = events.length > 0
        ? (events.filter((e) => e.status === "failed").length / events.length)
        : 0;

      let status: IntegrationStatus = "not_configured";
      if (connection) {
        status = connection.status as IntegrationStatus;
      }

      const capabilities: IntegrationCapability[] = [];
      if (config.capabilities.canImport) capabilities.push("import");
      if (config.capabilities.canExport) capabilities.push("export");
      if (config.capabilities.canImport && config.capabilities.canExport) capabilities.push("bidirectional");
      if (config.capabilities.canWebhook) capabilities.push("webhooks");
      if (config.capabilities.canBatch) capabilities.push("batch");
      if (config.capabilities.canRealTime) capabilities.push("real_time");

      integrations.push({
        integrationId: id,
        displayName: config.displayName,
        category: config.category,
        status,
        capabilities,
        supportedObjects: config.capabilities.supportedObjects,
        isVerified: connection?.isVerified === 1,
        verifiedAt: connection?.verifiedAt || null,
        lastSyncAt: connection?.lastSyncAt || null,
        lastSuccessfulSyncAt: connection?.lastSuccessfulSyncAt || null,
        totalSyncs: connection?.totalSyncs || 0,
        totalObjectsSynced: connection?.totalObjectsSynced || 0,
        errorRate,
        deadLetterCount: dleCount,
        regimeAware: config.regimeAware,
        limitations: !connection ? ["Not connected — configure credentials to enable"] : [],
        dataFreshness: connection?.lastSuccessfulSyncAt
          ? this.calculateFreshness(connection.lastSuccessfulSyncAt)
          : "no_data",
      });
    }

    const summary = {
      total: integrations.length,
      connected: integrations.filter((i) => i.status !== "not_configured").length,
      healthy: integrations.filter((i) => i.status === "healthy").length,
      degraded: integrations.filter((i) => i.status === "degraded").length,
      failed: integrations.filter((i) => i.status === "failed").length,
      verified: integrations.filter((i) => i.isVerified).length,
      totalDeadLetters: deadLetters.length,
    };

    return {
      companyId,
      generatedAt: new Date().toISOString(),
      summary,
      integrations,
      dependencyGraph: this.buildDependencyGraph(integrations),
    };
  }

  private calculateFreshness(lastSync: Date): string {
    const ageMs = Date.now() - lastSync.getTime();
    const ageMinutes = ageMs / 60000;
    if (ageMinutes < 5) return "fresh";
    if (ageMinutes < 60) return "recent";
    if (ageMinutes < 1440) return "stale";
    return "outdated";
  }

  private categorizeError(error: any): string {
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("timeout") || msg.includes("econnreset")) return "transient";
    if (msg.includes("401") || msg.includes("unauthorized") || msg.includes("forbidden")) return "auth";
    if (msg.includes("429") || msg.includes("rate limit")) return "rate_limit";
    if (msg.includes("500") || msg.includes("internal server")) return "provider_error";
    if (msg.includes("not found") || msg.includes("404")) return "not_found";
    return "unknown";
  }

  private buildDependencyGraph(integrations: IntegrationReadinessEntry[]): DependencyGraphNode[] {
    const objectProviders: Record<string, string[]> = {};
    const objectConsumers: Record<string, string[]> = {};

    const moduleObjectDependencies: Record<string, CanonicalObjectType[]> = {
      "forecasting": ["sku", "material", "inventory_snapshot", "economic_snapshot"],
      "allocation": ["sku", "material", "supplier", "inventory_snapshot"],
      "procurement": ["supplier", "rfq", "purchase_order", "contract", "invoice"],
      "inventory": ["sku", "material", "inventory_snapshot", "shipment"],
      "production": ["production_run", "work_order", "quality_event"],
      "analytics": ["economic_snapshot", "commodity_price", "sku", "supplier"],
      "notifications": ["news_item", "economic_snapshot"],
      "payments": ["invoice", "payment"],
      "supply_chain": ["supplier", "shipment", "location"],
    };

    for (const integration of integrations) {
      for (const objType of integration.supportedObjects) {
        if (!objectProviders[objType]) objectProviders[objType] = [];
        objectProviders[objType].push(integration.integrationId);
      }
    }

    for (const [module, deps] of Object.entries(moduleObjectDependencies)) {
      for (const dep of deps) {
        if (!objectConsumers[dep]) objectConsumers[dep] = [];
        objectConsumers[dep].push(module);
      }
    }

    const nodes: DependencyGraphNode[] = [];

    for (const objType of CANONICAL_OBJECT_TYPES) {
      const providers = objectProviders[objType] || [];
      const consumers = objectConsumers[objType] || [];
      const connectedProviders = providers.filter((p) =>
        integrations.find((i) => i.integrationId === p && i.status !== "not_configured"),
      );

      nodes.push({
        objectType: objType,
        providers,
        consumers,
        hasActiveProvider: connectedProviders.length > 0,
        missingPrerequisite: connectedProviders.length === 0 && consumers.length > 0
          ? `Connect an integration that provides ${objType} data (e.g., ${providers.slice(0, 3).join(", ") || "ERP or CSV import"})`
          : null,
      });
    }

    return nodes;
  }
}

export interface IntegrationReadinessEntry {
  integrationId: string;
  displayName: string;
  category: string;
  status: IntegrationStatus;
  capabilities: IntegrationCapability[];
  supportedObjects: CanonicalObjectType[];
  isVerified: boolean;
  verifiedAt: Date | null;
  lastSyncAt: Date | null;
  lastSuccessfulSyncAt: Date | null;
  totalSyncs: number;
  totalObjectsSynced: number;
  errorRate: number;
  deadLetterCount: number;
  regimeAware: boolean;
  limitations: string[];
  dataFreshness: string;
}

export interface IntegrationReadinessReport {
  companyId: string;
  generatedAt: string;
  summary: {
    total: number;
    connected: number;
    healthy: number;
    degraded: number;
    failed: number;
    verified: number;
    totalDeadLetters: number;
  };
  integrations: IntegrationReadinessEntry[];
  dependencyGraph: DependencyGraphNode[];
}

export interface DependencyGraphNode {
  objectType: string;
  providers: string[];
  consumers: string[];
  hasActiveProvider: boolean;
  missingPrerequisite: string | null;
}

export const orchestrator = new IntegrationOrchestrator();
