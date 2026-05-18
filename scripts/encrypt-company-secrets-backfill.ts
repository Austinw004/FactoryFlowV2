/**
 * One-time backfill: encrypt-in-place every legacy plaintext company-
 * integration secret column.
 *
 * Closes the round-24 audit F0 #4 finding. The
 * `encryptCompanySecret` / `decryptCompanySecret` helper supports both
 * v1-encrypted and legacy plaintext values transparently — this script
 * proactively flips every existing plaintext row to v1-encrypted so a
 * future DB dump leaks nothing.
 *
 * Idempotent: rows already in "v1:" format are skipped. Safe to re-run
 * any number of times without corrupting data.
 *
 * Usage:
 *   tsx scripts/encrypt-company-secrets-backfill.ts                # encrypts
 *   tsx scripts/encrypt-company-secrets-backfill.ts --dry-run      # report only
 *
 * Requirements:
 *   - ENCRYPTION_KEY env var set (64 hex chars; same key the live app
 *     uses, since decryptCompanySecret will need to be able to read
 *     these values back).
 *   - DATABASE_URL env var set.
 *
 * Recommended sequence:
 *   1. Take a Neon branch snapshot of production (rollback safety net).
 *   2. Run with --dry-run to see what would be touched.
 *   3. Run for real on a maintenance window or off-hours.
 *   4. Verify a sample row decrypts correctly via the app.
 *   5. Eventually drop the old columns from companies and migrate
 *      everything to integrationCredentials table (the proper pattern).
 */

import { db } from "../server/db";
import { companies } from "../shared/schema";
import { encryptCompanySecret } from "../server/lib/companySecrets";
import { eq } from "drizzle-orm";

// Columns covered. Keep in sync with companySecrets.ts's
// SENSITIVE_COMPANY_FIELDS list.
const SECRET_COLUMNS = [
  "hubspotAccessToken",
  "hubspotRefreshToken",
  "shopifyApiKey",
  "shopifySecret",
  "twilioAuthToken",
  "notionAccessToken",
  "slackWebhookUrl",
  "intercomAccessToken",
  "salesforceAccessToken",
  "salesforceRefreshToken",
  "zendeskApiToken",
  "asanaAccessToken",
  "jiraApiToken",
  "githubAccessToken",
  "gitlabAccessToken",
] as const;

const DRY_RUN = process.argv.includes("--dry-run");

interface Stats {
  scanned: number;
  alreadyEncrypted: number;
  encrypted: number;
  empty: number;
  byColumn: Record<string, { plaintextFound: number; encrypted: number }>;
}

async function main() {
  console.log(`\n[Backfill] Starting company-secrets encryption ${DRY_RUN ? "(DRY RUN — no writes)" : "(LIVE — will mutate DB)"}\n`);

  if (!process.env.ENCRYPTION_KEY) {
    console.error("[Backfill] FATAL: ENCRYPTION_KEY env var must be set");
    process.exit(1);
  }

  const stats: Stats = {
    scanned: 0,
    alreadyEncrypted: 0,
    encrypted: 0,
    empty: 0,
    byColumn: Object.fromEntries(
      SECRET_COLUMNS.map(c => [c, { plaintextFound: 0, encrypted: 0 }]),
    ),
  };

  // Iterate every company. Could be huge in production but each row is
  // small + no joins; pagination only matters at 100k+ rows.
  const allCompanies = await db.select().from(companies);

  for (const company of allCompanies) {
    stats.scanned++;
    const updates: Record<string, string | null> = {};

    for (const col of SECRET_COLUMNS) {
      const value = (company as any)[col];

      if (!value || typeof value !== "string") {
        // Column is null/undefined/empty — skip.
        continue;
      }

      if (value.startsWith("v1:")) {
        // Already encrypted — skip.
        stats.alreadyEncrypted++;
        continue;
      }

      // Plaintext value detected. Encrypt + queue for write.
      stats.byColumn[col].plaintextFound++;
      const encrypted = encryptCompanySecret(value);
      if (encrypted) {
        updates[col] = encrypted;
        stats.byColumn[col].encrypted++;
        stats.encrypted++;
      } else {
        stats.empty++;
      }
    }

    if (Object.keys(updates).length > 0) {
      if (DRY_RUN) {
        console.log(`[Backfill] Would encrypt ${Object.keys(updates).length} column(s) on company ${company.id}: ${Object.keys(updates).join(", ")}`);
      } else {
        await db.update(companies).set(updates as any).where(eq(companies.id, company.id));
        console.log(`[Backfill] Encrypted ${Object.keys(updates).length} column(s) on company ${company.id}: ${Object.keys(updates).join(", ")}`);
      }
    }
  }

  console.log(`\n[Backfill] Summary:`);
  console.log(`  Companies scanned:       ${stats.scanned}`);
  console.log(`  Already-encrypted vals:  ${stats.alreadyEncrypted}`);
  console.log(`  Plaintext vals ${DRY_RUN ? "found" : "encrypted"}: ${stats.encrypted}`);
  console.log(`  By column:`);
  for (const [col, breakdown] of Object.entries(stats.byColumn)) {
    if (breakdown.plaintextFound > 0) {
      console.log(`    ${col}: ${breakdown.plaintextFound} plaintext → ${breakdown.encrypted} encrypted`);
    }
  }
  if (DRY_RUN) {
    console.log(`\n[Backfill] DRY RUN complete — re-run without --dry-run to actually write.`);
  } else {
    console.log(`\n[Backfill] Complete. Run a sample app integration end-to-end to verify decryption works.`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error("[Backfill] FATAL:", err);
  process.exit(1);
});
