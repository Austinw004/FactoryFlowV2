import { db } from "../db";
import { structuredEventLog } from "@shared/schema";

type LogLevel = "debug" | "info" | "warn" | "error" | "critical";
type LogCategory = "automation" | "webhook" | "guardrail" | "regime" | "integration" | "auth" | "payment" | "health" | "system" | "sku_count" | "usage_event" | "stripe_meter_event" | "metering_job" | "metering_backfill";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  critical: 4,
};

const SENSITIVE_KEYS = new Set([
  "password", "secret", "token", "apiKey", "api_key", "accessToken", "access_token",
  "refreshToken", "refresh_token", "authorization", "credential", "credentials",
  "stripe_secret", "webhook_secret", "encryption_key", "session_secret",
  "private_key", "privateKey", "client_secret", "clientSecret",
]);

function sanitizeDetails(obj: any, depth = 0): any {
  if (depth > 5 || obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return obj.length > 500 ? obj.slice(0, 500) + "...[truncated]" : obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.slice(0, 20).map(item => sanitizeDetails(item, depth + 1));

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey) || SENSITIVE_KEYS.has(key)) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = sanitizeDetails(value, depth + 1);
    }
  }
  return sanitized;
}

interface LogEntry {
  level: LogLevel;
  category: LogCategory;
  event: string;
  companyId?: string;
  userId?: string;
  details?: Record<string, any>;
  durationMs?: number;
  success?: boolean;
  errorMessage?: string;
}

class StructuredLogger {
  private minConsoleLevel: LogLevel = "debug";
  private minPersistLevel: LogLevel = "warn";

  private formatForConsole(entry: LogEntry): string {
    const ts = new Date().toISOString();
    const sanitized = entry.details ? sanitizeDetails(entry.details) : undefined;
    const logObj: Record<string, any> = {
      ts,
      level: entry.level,
      cat: entry.category,
      event: entry.event,
    };
    if (entry.companyId) logObj.companyId = entry.companyId;
    if (entry.userId) logObj.userId = entry.userId;
    if (entry.durationMs !== undefined) logObj.durationMs = entry.durationMs;
    if (entry.success !== undefined) logObj.success = entry.success;
    if (entry.errorMessage) logObj.error = entry.errorMessage;
    if (sanitized) logObj.details = sanitized;
    return JSON.stringify(logObj);
  }

  private async persistToDb(entry: LogEntry): Promise<void> {
    try {
      await db.insert(structuredEventLog).values({
        level: entry.level,
        category: entry.category,
        event: entry.event,
        companyId: entry.companyId || null,
        userId: entry.userId || null,
        details: entry.details ? sanitizeDetails(entry.details) : null,
        durationMs: entry.durationMs || null,
        success: entry.success !== undefined ? (entry.success ? 1 : 0) : null,
        errorMessage: entry.errorMessage || null,
      });
    } catch (e) {
      // Don't let logging failures crash the application
    }
  }

  log(entry: LogEntry): void {
    if (LOG_LEVEL_PRIORITY[entry.level] >= LOG_LEVEL_PRIORITY[this.minConsoleLevel]) {
      const formatted = this.formatForConsole(entry);
      if (entry.level === "error" || entry.level === "critical") {
        console.error(formatted);
      } else if (entry.level === "warn") {
        console.warn(formatted);
      } else {
        console.log(formatted);
      }
    }

    if (LOG_LEVEL_PRIORITY[entry.level] >= LOG_LEVEL_PRIORITY[this.minPersistLevel]) {
      this.persistToDb(entry).catch(() => {});
    }
  }

  info(category: LogCategory, event: string, extra?: Partial<Omit<LogEntry, "level" | "category" | "event">> & Record<string, any>): void {
    this.log({ level: "info", category, event, ...extra });
  }

  warn(category: LogCategory, event: string, extra?: Partial<Omit<LogEntry, "level" | "category" | "event">> & Record<string, any>): void {
    this.log({ level: "warn", category, event, ...extra });
  }

  error(category: LogCategory, event: string, extra?: Partial<Omit<LogEntry, "level" | "category" | "event">> & Record<string, any>): void {
    this.log({ level: "error", category, event, ...extra });
  }

  critical(category: LogCategory, event: string, extra?: Partial<Omit<LogEntry, "level" | "category" | "event">> & Record<string, any>): void {
    this.log({ level: "critical", category, event, ...extra });
  }

  automation(event: string, extra?: Partial<Omit<LogEntry, "level" | "category" | "event">> & Record<string, any>): void {
    this.log({ level: "info", category: "automation", event, ...extra });
  }

  webhook(event: string, extra?: Partial<Omit<LogEntry, "level" | "category" | "event">> & Record<string, any>): void {
    this.log({ level: "info", category: "webhook", event, ...extra });
  }

  guardrail(event: string, extra?: Partial<Omit<LogEntry, "level" | "category" | "event">> & Record<string, any>): void {
    this.log({ level: "info", category: "guardrail", event, ...extra });
  }
}

export const logger = new StructuredLogger();
export { LogLevel, LogCategory, LogEntry, sanitizeDetails };
