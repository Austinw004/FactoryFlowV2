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
const ADDITIONS: ColumnAddition[] = [
  // 2026-05 — nickname for AI-Advisor greetings (Settings → Profile)
  { table: "users", column: "nickname", type: "text" },
  // 2026-05 — consent-based data preferences (Settings → Data tab).
  // Stored as a JSON object so we can add new opt-ins without another
  // schema bump. See client/src/pages/SettingsPage.tsx (DataTab).
  { table: "users", column: "data_preferences", type: "jsonb" },
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
