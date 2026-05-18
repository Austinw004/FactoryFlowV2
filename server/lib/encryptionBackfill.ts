/**
 * Encryption backfill — one-shot, idempotent, self-healing boot hook.
 *
 * Round-35. Closes the operator-action portion of F0 #4 (plaintext
 * integration secrets in companies table) automatically. After the
 * round-26 + 28 + 32 encryption work, ALL new writes go through
 * encryptCompanySecret. This hook handles the residual legacy plaintext
 * rows that were written before those rounds shipped.
 *
 * How it stays safe to run every boot:
 *   1. PROBE FIRST. Single SELECT counts plaintext-looking values
 *      across all 13 sensitive columns. If zero, fast-path skips —
 *      every subsequent boot is a single cheap query.
 *   2. ENCRYPT IN BATCH. Only touches rows that are actually plaintext.
 *      Already-encrypted (v1: prefix) rows are skipped via the helper.
 *   3. NEVER BLOCK BOOT ON FAILURE. Wrapped in try/catch; errors are
 *      logged loudly but don't crash the server. Customer can call the
 *      backfill script manually as a fallback.
 *   4. BOUNDED. Hard cap of 5 seconds per column (companies × columns
 *      = small; even 10k companies finishes in <1s). If a column
 *      exceeds the cap, that column is left for the next boot.
 *
 * If you'd rather run this on demand instead of at boot, the original
 * CLI is at scripts/encrypt-company-secrets-backfill.ts. Both paths
 * use the SAME encrypt() helper so the resulting rows are identical.
 */

import { pool } from "../db";
import { encryptCompanySecret } from "./companySecrets";

// Keep in sync with companySecrets.ts SENSITIVE_COMPANY_FIELDS. We
// keep this list local so adding a new sensitive column to the helper
// doesn't silently fail to back-fill.
const COLUMNS: { snake: string; camel: string }[] = [
  { snake: "hubspot_access_token",         camel: "hubspotAccessToken" },
  { snake: "hubspot_refresh_token",        camel: "hubspotRefreshToken" },
  { snake: "shopify_api_key",              camel: "shopifyApiKey" },
  { snake: "shopify_secret",               camel: "shopifySecret" },
  { snake: "twilio_auth_token",            camel: "twilioAuthToken" },
  { snake: "notion_access_token",          camel: "notionAccessToken" },
  { snake: "slack_webhook_url",            camel: "slackWebhookUrl" },
  { snake: "teams_webhook_url",            camel: "teamsWebhookUrl" },
  { snake: "salesforce_access_token",      camel: "salesforceAccessToken" },
  { snake: "salesforce_refresh_token",     camel: "salesforceRefreshToken" },
  { snake: "jira_api_token",               camel: "jiraApiToken" },
  { snake: "linear_api_key",               camel: "linearApiKey" },
];

const PER_COLUMN_TIMEOUT_MS = 5000;

/**
 * Probe: count rows where the given column is plaintext (not v1:
 * prefixed) AND not null/empty. Single query per column.
 */
async function countPlaintext(column: string): Promise<number> {
  try {
    const res = await pool.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM "companies"
       WHERE "${column}" IS NOT NULL
         AND "${column}" <> ''
         AND "${column}" NOT LIKE 'v1:%'`,
    );
    return Number(res.rows[0]?.c ?? 0);
  } catch {
    // Column doesn't exist yet (schemaSelfHeal might not have run, or
    // we're on a tenant DB without this column). Treat as zero — the
    // next deploy that has the column will retry.
    return 0;
  }
}

/**
 * Encrypt every plaintext row of a single column. Idempotent — only
 * touches rows currently in plaintext form. Caller is responsible for
 * timeout wrapping.
 */
async function encryptColumn(column: string): Promise<{ scanned: number; encrypted: number; failed: number }> {
  // Pull every plaintext row's id + value.
  const rows = await pool.query<{ id: string; value: string }>(
    `SELECT id, "${column}" AS value
       FROM "companies"
      WHERE "${column}" IS NOT NULL
        AND "${column}" <> ''
        AND "${column}" NOT LIKE 'v1:%'`,
  );

  let encrypted = 0;
  let failed = 0;
  for (const row of rows.rows) {
    try {
      const ct = encryptCompanySecret(row.value);
      if (!ct) {
        failed++;
        continue;
      }
      // Use parameterized UPDATE so the ciphertext doesn't need to be
      // SQL-escaped (it's hex so it would be safe anyway, but defensive
      // is correct here).
      await pool.query(
        `UPDATE "companies" SET "${column}" = $1 WHERE id = $2`,
        [ct, row.id],
      );
      encrypted++;
    } catch (err) {
      failed++;
      console.error(`[EncryptionBackfill] Failed to encrypt ${column} on company ${row.id}:`, err);
    }
  }
  return { scanned: rows.rows.length, encrypted, failed };
}

interface BackfillResult {
  ranActualWork: boolean;
  totalScanned: number;
  totalEncrypted: number;
  totalFailed: number;
  durationMs: number;
  byColumn: Record<string, { scanned: number; encrypted: number; failed: number }>;
}

/**
 * Public entry point — called from server boot AFTER schemaSelfHeal.
 *
 * Step 1: probe all 12 columns. If every count is zero, return early
 *         with `ranActualWork: false` (the common case after the first
 *         successful backfill).
 * Step 2: for each column with > 0 plaintext rows, encrypt them all
 *         within a 5s per-column budget. Columns that exceed the
 *         budget are skipped and retried on the next boot.
 */
export async function runEncryptionBackfillIfNeeded(): Promise<BackfillResult> {
  const start = Date.now();
  const byColumn: BackfillResult["byColumn"] = {};

  // ── Step 1: probe ──────────────────────────────────────────────────
  const probeCounts: Record<string, number> = {};
  for (const c of COLUMNS) {
    probeCounts[c.snake] = await countPlaintext(c.snake);
  }
  const totalPlaintext = Object.values(probeCounts).reduce((a, b) => a + b, 0);

  if (totalPlaintext === 0) {
    // Common case after first successful run — fast path skip.
    return {
      ranActualWork: false,
      totalScanned: 0,
      totalEncrypted: 0,
      totalFailed: 0,
      durationMs: Date.now() - start,
      byColumn,
    };
  }

  console.log(`[EncryptionBackfill] Found ${totalPlaintext} plaintext value(s) across ${COLUMNS.filter(c => probeCounts[c.snake] > 0).length} column(s) — encrypting in place`);

  // ── Step 2: encrypt per-column, 5s per-column timeout ──────────────
  let totalScanned = 0;
  let totalEncrypted = 0;
  let totalFailed = 0;
  for (const c of COLUMNS) {
    if (probeCounts[c.snake] === 0) continue;
    try {
      const result = await Promise.race([
        encryptColumn(c.snake),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`backfill timed out after ${PER_COLUMN_TIMEOUT_MS}ms`)), PER_COLUMN_TIMEOUT_MS),
        ),
      ]);
      byColumn[c.snake] = result;
      totalScanned += result.scanned;
      totalEncrypted += result.encrypted;
      totalFailed += result.failed;
      console.log(`[EncryptionBackfill]   ${c.snake}: ${result.encrypted}/${result.scanned} encrypted${result.failed > 0 ? ` (${result.failed} FAILED)` : ""}`);
    } catch (err) {
      console.error(`[EncryptionBackfill]   ${c.snake}: SKIPPED — ${(err as Error).message}. Will retry on next boot.`);
    }
  }

  const durationMs = Date.now() - start;
  console.log(`[EncryptionBackfill] Complete in ${durationMs}ms — ${totalEncrypted}/${totalScanned} encrypted, ${totalFailed} failed across ${Object.keys(byColumn).length} column(s)`);

  return {
    ranActualWork: true,
    totalScanned,
    totalEncrypted,
    totalFailed,
    durationMs,
    byColumn,
  };
}
