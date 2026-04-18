/**
 * In-memory probe history — drives the /status page's 30-day uptime bar.
 *
 * We chose an in-process ring buffer over a DB table because:
 *   - No migration required (respects the don't-touch-production-schema
 *     contract during a sales-readiness sprint).
 *   - Probe history is not tenant data — we're not at risk of losing
 *     customer-facing history on a deploy because we treat it as best-effort.
 *   - Upgrade path is trivial: swap recordProbe() to write to a table.
 *
 * For enterprise SLA reporting (post-SOC-2) we'll migrate to a `status_probes`
 * table with durable retention. For now the page is explicit that "history
 * since last deploy" is the scope.
 */

export type ProbeName = "api" | "app" | "db";
export type ProbeStatus = "ok" | "degraded" | "down";

export interface ProbeSample {
  ts: number; // epoch ms
  name: ProbeName;
  status: ProbeStatus;
  latencyMs: number | null;
}

// Retention: 30 days × 24 hours × 12 samples/hour (one every 5 min) = 8,640
// per probe. Three probes × 8,640 = 25,920 samples, ~2 MB at 80 bytes each.
const MAX_SAMPLES_PER_PROBE = 8_640;

const buffers: Record<ProbeName, ProbeSample[]> = {
  api: [],
  app: [],
  db: [],
};

let startedAt = Date.now();

export function recordProbe(sample: Omit<ProbeSample, "ts"> & { ts?: number }) {
  const s: ProbeSample = {
    ts: sample.ts ?? Date.now(),
    name: sample.name,
    status: sample.status,
    latencyMs: sample.latencyMs,
  };
  const buf = buffers[s.name];
  buf.push(s);
  if (buf.length > MAX_SAMPLES_PER_PROBE) {
    buf.splice(0, buf.length - MAX_SAMPLES_PER_PROBE);
  }
}

/**
 * Return the last N hourly buckets per probe, each bucket aggregating all
 * samples within the hour into a worst-case status + avg latency. This is
 * exactly what the /status page renders in its uptime bar.
 */
export function getHourlyBuckets(hoursBack = 24 * 30) {
  const now = Date.now();
  const msPerBucket = 60 * 60 * 1000;
  const earliest = now - hoursBack * msPerBucket;

  const out: Record<ProbeName, Array<{ ts: number; status: ProbeStatus | "unknown"; latencyMs: number | null }>> = {
    api: [],
    app: [],
    db: [],
  };

  for (const name of ["api", "app", "db"] as ProbeName[]) {
    const samples = buffers[name].filter((s) => s.ts >= earliest);
    for (let bucketStart = earliest; bucketStart < now; bucketStart += msPerBucket) {
      const bucketEnd = bucketStart + msPerBucket;
      const inBucket = samples.filter((s) => s.ts >= bucketStart && s.ts < bucketEnd);
      if (inBucket.length === 0) {
        out[name].push({ ts: bucketStart, status: "unknown", latencyMs: null });
        continue;
      }
      const worst: ProbeStatus = inBucket.some((s) => s.status === "down")
        ? "down"
        : inBucket.some((s) => s.status === "degraded")
          ? "degraded"
          : "ok";
      const valid = inBucket.filter((s) => s.latencyMs != null);
      const avgLatency = valid.length
        ? Math.round(valid.reduce((a, s) => a + (s.latencyMs || 0), 0) / valid.length)
        : null;
      out[name].push({ ts: bucketStart, status: worst, latencyMs: avgLatency });
    }
  }

  return out;
}

/**
 * Return per-probe uptime % over the given window.
 * Only counts buckets that have data; "unknown" buckets are excluded from
 * the denominator so we don't show 0% uptime for a freshly-deployed server.
 */
export function getUptimeSummary(hoursBack = 24 * 30): Record<ProbeName, {
  uptimePct: number | null;
  sampleCount: number;
  windowHours: number;
}> {
  const buckets = getHourlyBuckets(hoursBack);
  const out: any = {};
  for (const name of Object.keys(buckets) as ProbeName[]) {
    const known = buckets[name].filter((b) => b.status !== "unknown");
    const ok = known.filter((b) => b.status === "ok").length;
    out[name] = {
      uptimePct: known.length > 0 ? +(100 * ok / known.length).toFixed(3) : null,
      sampleCount: known.length,
      windowHours: hoursBack,
    };
  }
  return out;
}

export function getProbeMeta() {
  return {
    startedAt,
    storageKind: "in-memory ring buffer",
    retentionHours: MAX_SAMPLES_PER_PROBE / 12, // 5-min buckets
    note: "History since last server start. Durable retention ships with the Statuspage-replacement table post-SOC-2.",
  };
}

/** Reset for tests. Not called in production. */
export function _resetForTests() {
  buffers.api.length = 0;
  buffers.app.length = 0;
  buffers.db.length = 0;
  startedAt = Date.now();
}
