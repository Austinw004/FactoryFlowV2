// Schema self-heal — idempotent ALTER TABLE statements that run at boot
// to make the live Postgres tolerate a forward-rolled schema without an
// explicit `npm run db:push` step.
//
// Why this exists:
//   We use `drizzle-kit push` (no migration files) — the live Neon DB
//   is whatever was last manually pushed. When new columns are added to
//   shared/schema.ts and the deploy ships before someone runs db:push,
//   Drizzle's INSERTs reference columns that don't exist yet and every
//   write fails with "column \"foo\" of relation \"users\" does not
//   exist". The signup endpoint hit exactly this on 2026-05-07 with the
//   newly-added `nickname` and `data_preferences` columns.
//
// What it does:
//   Runs a small list of `ALTER TABLE … ADD COLUMN IF NOT EXISTS …`
//   statements on every boot. Each is idempotent — if the column is
//   already there (because db:push was run, or this hook ran on a
//   previous deploy), the statement is a no-op. New columns added to
//   the schema should also be added here so the next deploy heals
//   automatically.
//
// What it does NOT do:
//   - drop columns
//   - rename columns
//   - change types
//   - touch indexes or constraints
//   These are still drizzle-kit's job. This module is strictly a
//   safety net for the "added a nullable column, forgot to push"
//   class of mistake.

import { pool } from "../db";

interface ColumnAddition {
  table: string;
  column: string;
  type: string;
  // Optional — for `DEFAULT '{}'::jsonb` style backfill values. Most
  // additions are nullable with no default, in which case omit this.
  defaultExpr?: string;
}

// Keep this list in sync with shared/schema.ts. New columns go at the
// bottom with a comment noting when they were added — that way diffing
// this list against `git log shared/schema.ts` shows whether anything
// in the schema is unaccounted for.
//
// Cover the full set of user/company columns added in the last few
// quarters of feature work. Every entry is `IF NOT EXISTS` so listing
// columns that already exist is harmless — the cost is one cheap
// information_schema lookup per column at boot.
const ADDITIONS: ColumnAddition[] = [
  // ── users — Phase 12 (90-day trial + per-SKU metering)
  { table: "users", column: "stripe_customer_id", type: "text" },
  { table: "users", column: "stripe_subscription_id", type: "text" },
  { table: "users", column: "subscription_status", type: "text" },
  { table: "users", column: "subscription_tier", type: "text" },
  { table: "users", column: "trial_ends_at", type: "timestamp" },
  { table: "users", column: "onboarding_complete", type: "integer", defaultExpr: "0" },
  // ── users — email/password auth + lockout
  { table: "users", column: "password_hash", type: "text" },
  { table: "users", column: "username", type: "text" },
  { table: "users", column: "role", type: "text", defaultExpr: "'viewer'" },
  { table: "users", column: "google_id", type: "text" },
  { table: "users", column: "failed_login_attempts", type: "integer", defaultExpr: "0" },
  { table: "users", column: "locked_until", type: "timestamp" },
  { table: "users", column: "last_login_ip", type: "text" },
  { table: "users", column: "last_login_device", type: "text" },
  // ── users — 7-step onboarding profile fields
  { table: "users", column: "job_title", type: "text" },
  { table: "users", column: "phone", type: "text" },
  { table: "users", column: "department", type: "text" },
  { table: "users", column: "selected_plan_id", type: "text" },
  { table: "users", column: "selected_billing_interval", type: "text" },
  // ── users — personalization (2026-05)
  { table: "users", column: "nickname", type: "text" },
  // ── users — consent-based data preferences (Settings → Data tab, 2026-05).
  // Stored as a JSON object so we can add new opt-ins without another
  // schema bump. See client/src/pages/SettingsPage.tsx (DataTab).
  { table: "users", column: "data_preferences", type: "jsonb" },
  // ── companies — Phase 12 verified-savings counter (Performance plan)
  { table: "companies", column: "verified_savings_total_cents", type: "integer", defaultExpr: "0" },
  // ── users — email verification at signup (round-33, F1 fix from round-24 audit)
  { table: "users", column: "email_verified", type: "integer", defaultExpr: "0" },
  { table: "users", column: "email_verification_token", type: "text" },
  { table: "users", column: "email_verification_expires_at", type: "timestamp" },
];

export async function runSchemaSelfHeal(): Promise<void> {
  const start = Date.now();
  let added = 0;
  let alreadyPresent = 0;

  for (const a of ADDITIONS) {
    const sql = `ALTER TABLE "${a.table}" ADD COLUMN IF NOT EXISTS "${a.column}" ${a.type}${
      a.defaultExpr ? ` DEFAULT ${a.defaultExpr}` : ""
    };`;
    try {
      // Detect whether the ALTER actually added the column by checking
      // information_schema first. This is best-effort — the ADD COLUMN
      // IF NOT EXISTS is what actually keeps us safe.
      const { rows } = await pool.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2 LIMIT 1`,
        [a.table, a.column],
      );
      const wasPresent = rows.length > 0;

      await pool.query(sql);

      if (wasPresent) {
        alreadyPresent++;
      } else {
        added++;
        console.log(`[SchemaSelfHeal] Added ${a.table}.${a.column} (${a.type})`);
      }
    } catch (err: any) {
      // Non-fatal — log loudly and move on. A failure here means writes
      // touching the missing column will still error, but the rest of
      // the app keeps working and we get a clear signal in the logs.
      console.error(
        `[SchemaSelfHeal] Failed to ensure ${a.table}.${a.column}:`,
        err?.message || err,
      );
    }
  }

  const ms = Date.now() - start;
  console.log(
    `[SchemaSelfHeal] Done in ${ms}ms — ${added} added, ${alreadyPresent} already present, ${ADDITIONS.length} total checks.`,
  );
}
