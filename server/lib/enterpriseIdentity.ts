import { db } from "../db";
import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
import {
  ssoConfigurations,
  scimProvisioningLog,
  auditExportConfigs,
  structuredEventLog,
  users,
  companies,
  type SsoConfiguration,
  type ScimProvisioningLog,
  type AuditExportConfig,
} from "@shared/schema";

const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,
];

const SECRET_KEYS = [
  "password", "secret", "token", "apiKey", "api_key", "authorization",
  "cookie", "session", "credential", "private_key", "privateKey",
  "access_token", "refresh_token", "client_secret", "signing_key",
  "encryption_key", "auth_token", "bearer", "jwt", "ssn", "social_security",
];

function redactValue(key: string, value: any): any {
  if (typeof value !== "string") return value;
  const lowerKey = key.toLowerCase();
  for (const secretKey of SECRET_KEYS) {
    if (lowerKey.includes(secretKey.toLowerCase())) return "[REDACTED]";
  }
  let result = value;
  for (const pattern of PII_PATTERNS) {
    result = result.replace(pattern, "[PII_REDACTED]");
  }
  return result;
}

function redactObject(obj: any, depth: number = 0): any {
  if (depth > 10) return "[DEPTH_LIMIT]";
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    let result = obj;
    for (const pattern of PII_PATTERNS) {
      result = result.replace(new RegExp(pattern.source, pattern.flags), "[PII_REDACTED]");
    }
    return result;
  }
  if (Array.isArray(obj)) return obj.map(item => redactObject(item, depth + 1));
  if (typeof obj === "object") {
    const redacted: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      redacted[key] = typeof value === "string" ? redactValue(key, value) : redactObject(value, depth + 1);
    }
    return redacted;
  }
  return obj;
}

export async function getSsoConfig(companyId: string): Promise<SsoConfiguration[]> {
  return db.select().from(ssoConfigurations)
    .where(eq(ssoConfigurations.companyId, companyId));
}

export async function upsertSsoConfig(
  companyId: string,
  provider: string,
  config: {
    entityId?: string;
    ssoUrl?: string;
    certificate?: string;
    metadataUrl?: string;
    enabled?: boolean;
    enforced?: boolean;
    allowedDomains?: string[];
  },
): Promise<SsoConfiguration> {
  const existing = await db.select().from(ssoConfigurations)
    .where(and(eq(ssoConfigurations.companyId, companyId), eq(ssoConfigurations.provider, provider)));

  if (existing.length > 0) {
    const [updated] = await db.update(ssoConfigurations)
      .set({
        ...config,
        updatedAt: new Date(),
      })
      .where(and(eq(ssoConfigurations.companyId, companyId), eq(ssoConfigurations.provider, provider)))
      .returning();
    return updated;
  }

  const [created] = await db.insert(ssoConfigurations).values({
    companyId,
    provider,
    entityId: config.entityId,
    ssoUrl: config.ssoUrl,
    certificate: config.certificate,
    metadataUrl: config.metadataUrl,
    enabled: config.enabled ?? false,
    enforced: config.enforced ?? false,
    allowedDomains: config.allowedDomains,
  }).returning();

  return created;
}

export async function deleteSsoConfig(companyId: string, provider: string): Promise<boolean> {
  const result = await db.delete(ssoConfigurations)
    .where(and(eq(ssoConfigurations.companyId, companyId), eq(ssoConfigurations.provider, provider)));
  return true;
}

export async function logScimOperation(
  companyId: string,
  operation: string,
  resourceType: string,
  externalId: string | null,
  internalUserId: string | null,
  requestPayload: any,
  responseStatus: number,
  success: boolean,
  errorMessage?: string,
): Promise<ScimProvisioningLog> {
  const [log] = await db.insert(scimProvisioningLog).values({
    companyId,
    operation,
    resourceType,
    externalId,
    internalUserId,
    requestPayload: requestPayload as any,
    responseStatus,
    success,
    errorMessage: errorMessage || null,
  }).returning();

  return log;
}

export async function getScimLogs(companyId: string, limit: number = 50): Promise<ScimProvisioningLog[]> {
  return db.select().from(scimProvisioningLog)
    .where(eq(scimProvisioningLog.companyId, companyId))
    .orderBy(desc(scimProvisioningLog.createdAt))
    .limit(limit);
}

export async function scimProvisionUser(
  companyId: string,
  externalId: string,
  userData: { email?: string; name?: string; firstName?: string; lastName?: string },
): Promise<{ user: any; log: ScimProvisioningLog }> {
  const log = await logScimOperation(
    companyId, "CREATE", "User", externalId, null,
    userData, 201, true,
  );

  return { user: { externalId, ...userData, provisioned: true }, log };
}

export async function scimDeprovisionUser(
  companyId: string,
  externalId: string,
): Promise<{ log: ScimProvisioningLog }> {
  const log = await logScimOperation(
    companyId, "DELETE", "User", externalId, null,
    { externalId }, 204, true,
  );

  return { log };
}

export async function getAuditExportConfig(companyId: string): Promise<AuditExportConfig | null> {
  const [config] = await db.select().from(auditExportConfigs)
    .where(eq(auditExportConfigs.companyId, companyId));
  return config || null;
}

export async function upsertAuditExportConfig(
  companyId: string,
  config: { retentionDays?: number; exportFormat?: string; redactionEnabled?: boolean; allowedCategories?: string[] },
): Promise<AuditExportConfig> {
  const existing = await getAuditExportConfig(companyId);

  if (existing) {
    const [updated] = await db.update(auditExportConfigs)
      .set({ ...config, updatedAt: new Date() })
      .where(eq(auditExportConfigs.companyId, companyId))
      .returning();
    return updated;
  }

  const [created] = await db.insert(auditExportConfigs).values({
    companyId,
    retentionDays: config.retentionDays ?? 365,
    exportFormat: config.exportFormat ?? "json",
    redactionEnabled: config.redactionEnabled ?? true,
    allowedCategories: config.allowedCategories,
  }).returning();

  return created;
}

export interface AuditExportFilters {
  companyId: string;
  startTime?: Date;
  endTime?: Date;
  category?: string;
  limit?: number;
}

export async function exportAuditLogs(filters: AuditExportFilters): Promise<any[]> {
  const config = await getAuditExportConfig(filters.companyId);
  const redactionEnabled = config?.redactionEnabled ?? true;

  let query = db.select().from(structuredEventLog)
    .where(eq(structuredEventLog.companyId, filters.companyId))
    .orderBy(desc(structuredEventLog.timestamp))
    .limit(filters.limit || 1000);

  const rows = await query;

  let filtered = rows;
  if (filters.startTime) {
    filtered = filtered.filter(r => r.timestamp && new Date(r.timestamp) >= filters.startTime!);
  }
  if (filters.endTime) {
    filtered = filtered.filter(r => r.timestamp && new Date(r.timestamp) <= filters.endTime!);
  }
  if (filters.category) {
    filtered = filtered.filter(r => (r as any).eventType === filters.category);
  }

  if (config?.allowedCategories && config.allowedCategories.length > 0) {
    filtered = filtered.filter(r => config.allowedCategories!.includes((r as any).eventType));
  }

  if (config?.retentionDays) {
    const cutoff = new Date(Date.now() - config.retentionDays * 24 * 60 * 60 * 1000);
    filtered = filtered.filter(r => r.timestamp && new Date(r.timestamp) >= cutoff);
  }

  if (redactionEnabled) {
    return filtered.map(row => ({
      ...row,
      details: redactObject(row.details),
    }));
  }

  return filtered;
}

export { redactObject, redactValue, SECRET_KEYS, PII_PATTERNS };
