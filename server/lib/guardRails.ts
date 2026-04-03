/**
 * guardRails.ts — System-level protection layer
 *
 * Implements the 14-section hardening directive:
 *  S1  assertEconomicValidityStrict — NaN/Inf/null/negative guard
 *  S2  safeAsync                    — async failure capture wrapper
 *  S3  assertNonEmpty               — DB result emptiness guard
 *  S10 apiResponse                  — standardised envelope builder
 *  S12 sanitizeInput                — XSS/injection strip
 *  S13 logEvent                     — structured operational event logger
 */

import crypto from "crypto";

// ─── Section 1: Economic Validity Guard (strict) ─────────────────────────────

/**
 * Throws a descriptive Error for any field that is:
 *   • null or undefined
 *   • NaN or ±Infinity
 *   • negative (unless the key is "delta", "savings", or "costSavings" which
 *     may legitimately be negative)
 */
export function assertEconomicValidityStrict(
  obj: Record<string, number | null | undefined>,
): void {
  const ALLOW_NEGATIVE = new Set(["delta", "savings", "costSavings"]);

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      throw new Error(`INVALID_NULL_${key.toUpperCase()}`);
    }
    if (typeof value === "number") {
      if (Number.isNaN(value)) throw new Error(`NAN_${key.toUpperCase()}`);
      if (!Number.isFinite(value)) throw new Error(`NON_FINITE_${key.toUpperCase()}`);
      if (value < 0 && !ALLOW_NEGATIVE.has(key)) {
        throw new Error(`NEGATIVE_${key.toUpperCase()}: value=${value}`);
      }
    }
  }
}

// ─── Section 2: Async Safety Wrapper ─────────────────────────────────────────

/**
 * Wraps an async operation so that failures are always:
 *  1. Logged with context
 *  2. Re-thrown as a labelled error (never swallowed silently)
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  context: string,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[ASYNC_ERROR][${context}]`, err instanceof Error ? err.message : String(err));
    throw new Error(`SAFE_ASYNC_FAILURE_${context.toUpperCase().replace(/\s+/g, "_")}`);
  }
}

// ─── Section 3: Non-Empty Assertion ──────────────────────────────────────────

/**
 * Throws when a DB result array is empty.
 * Call after demand-history, supplier-material, and RFQ queries.
 */
export function assertNonEmpty<T>(data: T[], name: string): void {
  if (!data || data.length === 0) {
    throw new Error(`EMPTY_DATA_${name.toUpperCase()}`);
  }
}

// ─── Section 10: API Response Standardisation ─────────────────────────────────

export interface StandardApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  traceId: string;
  timestamp: string;
}

/**
 * Builds the standard API response envelope.
 * All API handlers should return this shape.
 */
export function apiResponse(
  success: boolean,
  data?: unknown,
  error?: string,
): StandardApiResponse {
  return {
    success,
    data,
    error,
    traceId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

// ─── Section 12: Input Sanitisation ──────────────────────────────────────────

/**
 * Strips < and > characters to prevent HTML/script injection.
 * Apply to all user-supplied string inputs and query params.
 */
export function sanitizeInput(str: string): string {
  if (typeof str !== "string") return str;
  return str.replace(/[<>]/g, "");
}

/**
 * Sanitises every string value in a flat or nested object (shallow pass).
 */
export function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    result[k] = typeof v === "string" ? sanitizeInput(v) : v;
  }
  return result;
}

// ─── Section 13: Structured Event Logger ─────────────────────────────────────

export interface OperationalEvent {
  type: string;
  companyId: string;
  userId?: string;
  action: string;
  payload?: Record<string, unknown>;
}

/**
 * Emits a structured JSON log line for operational events.
 * NEVER include passwords, tokens, card numbers, or PII in payload.
 */
export function logEvent(event: OperationalEvent): void {
  const entry = {
    ts: new Date().toISOString(),
    type: event.type,
    companyId: event.companyId,
    ...(event.userId ? { userId: event.userId } : {}),
    action: event.action,
    ...(event.payload ? { payload: event.payload } : {}),
  };
  console.log(`[EVENT] ${JSON.stringify(entry)}`);
}

// ─── Section 11: Cache TTL constant ──────────────────────────────────────────

/** Six-hour TTL for regime-aware caches. */
export const REGIME_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
