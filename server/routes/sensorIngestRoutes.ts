// Sensor ingest HTTP endpoint.
//
// Public API surface:
//   POST /api/sensors/ingest
//     headers:
//       Authorization: Bearer <company-api-key>   (or)
//       X-Api-Key: <company-api-key>
//     content-type: application/json
//     body: { "readings": [ { sensorExternalId, value, timestamp?, metadata?,
//                              clientReadingId? }, ... ] }   // up to 1000
//     responses:
//       200 { acceptedCount, rejectedCount, alertsCreated,
//             predictionsCreated, rejected: [ { index, reason } ] }
//       400 { error: "INVALID_BODY", details }
//       401 { error: "UNAUTHORIZED" }
//       413 { error: "BATCH_TOO_LARGE" }    // > 1000 readings per request
//       429 { error: "RATE_LIMITED" }       // soft per-key rate limit
//
// This endpoint MUST bypass the global session-auth middleware — it's
// designed to be called from headless edge gateways. Authentication is
// strictly via the per-company API key.

import type { Express, Request, Response } from "express";
import {
  authenticateByApiKey,
  ingestSensorBatch,
  sensorIngestBodySchema,
  MAX_BATCH,
} from "../lib/sensorIngest";

// Cheap in-memory rate limiter — per company key, per 60s window. Good
// enough for v1; replace with Redis if we go multi-pod.
const ingestWindow = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_PER_MINUTE = 60; // 60 batches/min = up to 60,000 readings/min

function checkRate(companyId: string): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const slot = ingestWindow.get(companyId);
  if (!slot || slot.resetAt < now) {
    ingestWindow.set(companyId, { count: 1, resetAt: now + 60_000 });
    return { ok: true };
  }
  if (slot.count >= RATE_LIMIT_PER_MINUTE) {
    return { ok: false, retryAfter: Math.ceil((slot.resetAt - now) / 1000) };
  }
  slot.count++;
  return { ok: true };
}

export function registerSensorIngestRoutes(app: Express) {
  app.post("/api/sensors/ingest", async (req: Request, res: Response) => {
    try {
      // 1. Auth.
      const headerKey =
        (req.headers["x-api-key"] as string | undefined) ??
        (req.headers["authorization"] as string | undefined);
      const companyId = await authenticateByApiKey(headerKey);
      if (!companyId) {
        return res.status(401).json({ error: "UNAUTHORIZED" });
      }

      // 2. Rate limit.
      const rl = checkRate(companyId);
      if (!rl.ok) {
        if (rl.retryAfter) res.setHeader("Retry-After", String(rl.retryAfter));
        return res.status(429).json({ error: "RATE_LIMITED" });
      }

      // 3. Body shape.
      const parsed = sensorIngestBodySchema.safeParse(req.body);
      if (!parsed.success) {
        const tooLarge =
          Array.isArray(req.body?.readings) &&
          req.body.readings.length > MAX_BATCH;
        if (tooLarge) {
          return res.status(413).json({ error: "BATCH_TOO_LARGE", maxBatch: MAX_BATCH });
        }
        return res.status(400).json({
          error: "INVALID_BODY",
          details: parsed.error.flatten(),
        });
      }

      // 4. Process.
      const result = await ingestSensorBatch(companyId, parsed.data);

      return res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "ingest failed";
      console.error("[sensors/ingest] error:", message);
      return res.status(500).json({ error: "INTERNAL", message });
    }
  });

  // Lightweight health probe so customers can verify connectivity + auth
  // without writing data. Returns 200 on valid key, 401 otherwise.
  app.get("/api/sensors/ingest/health", async (req: Request, res: Response) => {
    const headerKey =
      (req.headers["x-api-key"] as string | undefined) ??
      (req.headers["authorization"] as string | undefined);
    const companyId = await authenticateByApiKey(headerKey);
    if (!companyId) return res.status(401).json({ ok: false });
    return res.json({
      ok: true,
      companyId: companyId.slice(0, 8) + "…",
      maxBatch: MAX_BATCH,
      rateLimitPerMinute: RATE_LIMIT_PER_MINUTE,
    });
  });
}
