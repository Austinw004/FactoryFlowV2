/**
 * auditLogger.ts — SOC2-Level Audit Logging
 *
 * Provides:
 * - logAudit()       — lightweight helper used throughout routes
 * - logAuditEvent()  — full SOC2-compliant event with success/errorMessage
 * - redact()         — sensitive key scrubbing
 * - auditMiddleware() — Express middleware for automatic audit trails
 *
 * Immutability guarantee: audit_logs rows are INSERT-only.
 * No UPDATE or DELETE is permitted at the application layer.
 */

import { storage } from "../storage";
import type { Request } from "express";

// ─── Section 3: Sensitive Data Redaction ─────────────────────────────────────

const SENSITIVE_KEYS = ["password", "token", "apiKey", "secret", "card"];

export function redact(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(redact);
  const copy: any = {};
  for (const key in obj) {
    const lk = key.toLowerCase();
    if (SENSITIVE_KEYS.some((s) => lk.includes(s.toLowerCase()))) {
      copy[key] = "[REDACTED]";
    } else {
      copy[key] = redact(obj[key]);
    }
  }
  return copy;
}

// ─── SOC2 Immutability Guard ──────────────────────────────────────────────────

/** Throws if any caller attempts to mutate audit logs at the app layer. */
export function immutabilityGuard(operation: "UPDATE" | "DELETE"): never {
  const msg = `AUDIT_IMMUTABILITY_VIOLATION: ${operation} on audit_logs is forbidden`;
  console.error(`[Audit:IMMUTABILITY] ${msg}`);
  throw new Error(msg);
}

// ─── Section 2: Full SOC2 logAuditEvent ──────────────────────────────────────

export interface AuditEventParams {
  companyId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Full SOC2 audit event. Stores success + errorMessage inside the `changes`
 * JSONB envelope alongside scrubbed metadata (schema already has `changes`).
 */
export async function logAuditEvent(params: AuditEventParams): Promise<void> {
  try {
    const sanitizedMeta = params.metadata ? redact(params.metadata) : undefined;
    const envelope: Record<string, unknown> = {
      success: params.success,
      ...(params.errorMessage ? { errorMessage: params.errorMessage } : {}),
      ...(sanitizedMeta ? { metadata: sanitizedMeta } : {}),
    };

    await storage.createAuditLog({
      companyId: params.companyId,
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      changes: envelope,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    const statusTag = params.success ? "OK" : `FAIL(${params.errorMessage ?? "unknown"})`;
    console.log(
      `[AuditSOC2] ${params.action.toUpperCase()} ${params.entityType}${params.entityId ? ` (${params.entityId})` : ""} — ${statusTag}`,
    );
  } catch (err: any) {
    console.error("[AuditSOC2] Failed to write audit event:", err.message);
  }
}

// ─── Section 4: Mandatory Logging Helpers ────────────────────────────────────

/**
 * Convenience wrapper for well-known SOC2 mandatory action types:
 * LOGIN_SUCCESS / LOGIN_FAILURE / PAYMENT_EXECUTED / SUBSCRIPTION_UPDATED /
 * POLICY_RECOMMENDATION_CREATED / OPTIMIZATION_RUN / PURCHASE_APPROVED /
 * PURCHASE_EXECUTED / ROLE_CHANGED / SETTINGS_UPDATED
 */
export async function logMandatoryEvent(
  action:
    | "LOGIN_SUCCESS"
    | "LOGIN_FAILURE"
    | "PAYMENT_EXECUTED"
    | "SUBSCRIPTION_UPDATED"
    | "POLICY_RECOMMENDATION_CREATED"
    | "OPTIMIZATION_RUN"
    | "PURCHASE_APPROVED"
    | "PURCHASE_EXECUTED"
    | "ROLE_CHANGED"
    | "SETTINGS_UPDATED",
  params: Omit<AuditEventParams, "action">,
): Promise<void> {
  return logAuditEvent({ ...params, action });
}

// ─── Legacy logAudit (backward-compatible) ─────────────────────────────────

interface AuditContext {
  userId: string;
  companyId: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAudit(params: {
  action:
    | "create"
    | "update"
    | "delete"
    | "export"
    | "import"
    | "login"
    | "logout"
    | "assign"
    | "remove"
    | "generate"
    | "aggregate"
    | "calculate"
    | "run"
    | "execute"
    | "view";
  entityType: string;
  entityId?: string;
  changes?: any;
  notes?: string;
  req?: Request;
  companyId?: string;
  systemContext?: boolean;
}): Promise<void> {
  try {
    const {
      action,
      entityType,
      entityId,
      changes,
      notes,
      req,
      companyId: directCompanyId,
      systemContext,
    } = params;

    let context: AuditContext;

    if (systemContext && directCompanyId) {
      console.log(`[Audit] Skipping audit log for system/background operation: ${action} ${entityType}`);
      return;
    } else if (req) {
      const user = (req as any).rbacUser || (req as any).user;
      if (!user) {
        console.warn("[Audit] No user context available for audit log");
        return;
      }

      context = {
        userId: user.id || user.claims?.sub,
        companyId: user.companyId,
        ipAddress: req.ip || (req.headers["x-forwarded-for"] as string),
        userAgent: req.headers["user-agent"],
      };
    } else {
      console.warn("[Audit] No request or system context provided for audit log");
      return;
    }

    if (!context.companyId) {
      console.warn("[Audit] No company context available for audit log");
      return;
    }

    const sanitizedChanges = redact(changes);

    await storage.createAuditLog({
      companyId: context.companyId,
      userId: context.userId,
      action,
      entityType,
      entityId,
      changes:
        sanitizedChanges || notes
          ? JSON.stringify({ ...sanitizedChanges, ...(notes ? { notes } : {}) })
          : null,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    console.log(
      `[Audit] ${action.toUpperCase()} ${entityType}${entityId ? ` (${entityId})` : ""} by ${context.userId}`,
    );
  } catch (error) {
    console.error("[Audit] Failed to create audit log:", error);
  }
}

// ─── Express middleware ───────────────────────────────────────────────────────

export function auditMiddleware(
  entityType: string,
  action: "create" | "update" | "delete",
) {
  return async (req: Request, res: any, next: any) => {
    const originalSend = res.send;

    res.send = function (data: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId = req.params.id || (typeof data === "object" && data?.id);
        logAudit({
          action,
          entityType,
          entityId,
          changes: action === "delete" ? null : req.body,
          req,
        }).catch(console.error);
      }
      return originalSend.call(this, data);
    };

    next();
  };
}
