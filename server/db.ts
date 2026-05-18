import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

/**
 * F1 fix from round-24 audit: previously `new Pool({ connectionString })`
 * with zero overrides — Neon's defaults are very permissive. One slow
 * tenant query could starve the pool and stall every other tenant's
 * requests.
 *
 * Explicit knobs:
 *
 *   max — cap concurrent connections. Neon serverless tier permits up
 *     to ~100 connections per project; we leave headroom for the
 *     scheduled-jobs worker + admin tools + replays. 20 is conservative
 *     for a single Replit-deployed instance handling typical SaaS load
 *     (~5-10 RPS sustained). Tune up when measured pool waits exceed
 *     ~50ms p95 in production.
 *
 *   connectionTimeoutMillis — how long to wait for a free connection
 *     before failing the query. 5 seconds picked to fail fast on pool
 *     exhaustion (so the request returns a clean 503 instead of hanging
 *     for the client's full request timeout, which on most HTTP clients
 *     is 30-60s). Visibility into "pool exhausted" failures is much
 *     better than silent slowness.
 *
 *   idleTimeoutMillis — how long an idle connection stays in the pool
 *     before being closed. 10s matches Neon's serverless idle timeout;
 *     longer values risk holding zombie connections after Neon's side
 *     has already torn them down.
 *
 *   statement_timeout — Postgres-level kill switch for runaway queries.
 *     30s is generous for OLTP — any single query taking that long is
 *     either a missing index, a runaway COUNT/GROUP BY, or a real bug.
 *     Caps the blast radius of one bad tenant's pathological query
 *     against everyone else.
 *
 *   allowExitOnIdle — let the process exit cleanly during graceful
 *     shutdown without waiting for connections to time out naturally.
 */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX) || 20,
  connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS) || 5000,
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS) || 10000,
  statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT_MS) || 30000,
  allowExitOnIdle: true,
});

// Surface pool-level errors loudly. Without this, Neon-side disconnects
// during long-idle would only show up as cryptic per-query errors on the
// next use of the affected connection.
pool.on('error', (err) => {
  console.error('[DB Pool] Unexpected error on idle client:', err);
});

export const db = drizzle({ client: pool, schema });
