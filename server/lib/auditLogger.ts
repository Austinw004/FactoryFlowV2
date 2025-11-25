import { storage } from "../storage";
import type { Request } from "express";

/**
 * Audit Logger Helper
 * Simplifies adding audit logs to any mutation endpoint
 */

interface AuditContext {
  userId: string;
  companyId: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAudit(params: {
  action: "create" | "update" | "delete" | "export" | "import" | "login" | "logout" | "assign" | "remove";
  entityType: string;
  entityId?: string;
  changes?: any;
  notes?: string;
  req?: Request;
  companyId?: string;
  systemContext?: boolean;
}) {
  try {
    const { action, entityType, entityId, changes, notes, req, companyId: directCompanyId, systemContext } = params;
    
    let context: AuditContext;
    
    if (systemContext && directCompanyId) {
      context = {
        userId: "system",
        companyId: directCompanyId,
        ipAddress: "127.0.0.1",
        userAgent: "background-job",
      };
    } else if (req) {
      const user = (req as any).rbacUser || (req as any).user;
      if (!user) {
        console.warn("[Audit] No user context available for audit log");
        return;
      }

      context = {
        userId: user.id || user.claims?.sub,
        companyId: user.companyId,
        ipAddress: req.ip || req.headers["x-forwarded-for"] as string,
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

    await storage.createAuditLog({
      companyId: context.companyId,
      userId: context.userId,
      action,
      entityType,
      entityId,
      changes: changes || notes ? JSON.stringify({ ...changes, notes }) : null,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    
    console.log(`[Audit] ${action.toUpperCase()} ${entityType}${entityId ? ` (${entityId})` : ""} by ${context.userId}`);
  } catch (error) {
    console.error("[Audit] Failed to create audit log:", error);
  }
}

/**
 * Express middleware to automatically log audit trails
 * Usage: app.post("/api/skus", auditMiddleware("sku", "create"), async (req, res) => {...})
 */
export function auditMiddleware(
  entityType: string,
  action: "create" | "update" | "delete"
) {
  return async (req: Request, res: any, next: any) => {
    // Store original send function
    const originalSend = res.send;
    
    // Override send to capture successful responses
    res.send = function (data: any) {
      // Only log on successful responses (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Try to extract entity ID from response or params
        const entityId = req.params.id || (typeof data === "object" && data?.id);
        
        logAudit({
          action,
          entityType,
          entityId,
          changes: action === "delete" ? null : req.body,
          req,
        }).catch(console.error);
      }
      
      // Call original send
      return originalSend.call(this, data);
    };
    
    next();
  };
}
