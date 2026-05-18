/**
 * Company-level integration secret encryption helper.
 *
 * Closes part of F0 #4 from the round-24 security audit. The `companies`
 * table has legacy plaintext columns for several integration credentials
 * (hubspotAccessToken, hubspotRefreshToken, twilioAuthToken,
 * shopifyApiKey/Secret, notionAccessToken, slackWebhookUrl, etc.) that
 * predate the proper integrationCredentials table + CredentialService
 * pattern. A DB dump or read-only SQL injection elsewhere would leak
 * every tenant's third-party tokens.
 *
 * Full remediation is a multi-week migration (drop the columns, backfill
 * to integrationCredentials, update ~30 consumer files). Until that's
 * done, this helper provides transparent at-rest encryption for the
 * legacy columns:
 *
 *   - encrypt(plaintext) → "v1:iv:ciphertext" format
 *   - decrypt(value) → returns plaintext, or returns the value AS-IS
 *     if it's not in our encrypted format (so legacy plaintext rows
 *     keep working until they're next rotated)
 *
 * This means a deploy with the helper wired in:
 *   - All NEW writes go through encrypt() → stored encrypted
 *   - All reads go through decryptIfNeeded() → handles both formats
 *   - Legacy plaintext rows stay readable until next write rotates
 *     them through the encrypt() path
 *
 * The "v1:" prefix is deliberate — lets us evolve the encryption
 * format (e.g., switch from AES-CBC to AES-GCM) without breaking old
 * rows. decryptIfNeeded() routes based on the prefix.
 */

import { EncryptionService } from "./securityHardening";

// Singleton — instantiated lazily so missing ENCRYPTION_KEY at module
// import time doesn't crash the process (it'll be caught at first use
// with a clearer error).
let _enc: EncryptionService | null = null;
function enc(): EncryptionService {
  if (!_enc) _enc = new EncryptionService();
  return _enc;
}

/**
 * Encrypt a sensitive value for storage in a legacy companies-table
 * column. Returns "v1:iv:ciphertext" format. Pass `null` / `undefined`
 * / empty string through unchanged so the column gets cleared properly
 * when the user removes an integration.
 */
export function encryptCompanySecret(plaintext: string | null | undefined): string | null {
  if (plaintext === null || plaintext === undefined || plaintext === "") return null;
  const ct = enc().encrypt(plaintext);
  return `v1:${ct}`;
}

/**
 * Decrypt a value read from a legacy companies-table column. Detects
 * format:
 *   - "v1:..." → decrypt the post-prefix portion
 *   - anything else → assume legacy plaintext, return as-is
 *
 * This dual-mode behavior lets the deploy roll out without a backfill;
 * legacy rows keep working, new writes are encrypted, and rotation
 * (e.g., user updates their HubSpot token) migrates each row at
 * natural-write time.
 *
 * Returns null if input is null/empty (caller treats as "not configured").
 */
export function decryptCompanySecret(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value.startsWith("v1:")) {
    try {
      return enc().decrypt(value.slice(3));
    } catch (err) {
      // Corrupted ciphertext (key rotated without re-encrypt, or DB
      // somehow got truncated). Log loudly and return null — the
      // integration just won't work until reconfigured, which is the
      // correct behavior vs. leaking a stack trace to the route layer.
      console.error("[CompanySecrets] Decryption failed for v1 value — integration needs reconfiguration:", err);
      return null;
    }
  }
  // Legacy plaintext — return as-is. Caller doesn't need to know
  // the format; this is transparent.
  return value;
}

/**
 * Helper for the common pattern: take a partial company-update object,
 * apply encryption to any of the known-sensitive fields that are
 * present. Idempotent — fields not in `input` are left alone.
 *
 * Usage:
 *   const safeUpdates = encryptCompanySecretFields({
 *     hubspotAccessToken: req.body.accessToken,
 *     hubspotEnabled: 1,
 *   });
 *   await storage.updateCompany(companyId, safeUpdates);
 */
const SENSITIVE_COMPANY_FIELDS = [
  "hubspotAccessToken",
  "hubspotRefreshToken",
  "shopifyApiKey",
  "shopifySecret",
  "twilioAuthToken",
  "notionAccessToken",
  "slackWebhookUrl",   // technically a URL not a token, but it grants posting access — treat as secret
  "intercomAccessToken",
  "salesforceAccessToken",
  "salesforceRefreshToken",
  "zendeskApiToken",
  "asanaAccessToken",
  "jiraApiToken",
  "githubAccessToken",
  "gitlabAccessToken",
] as const;

type SensitiveFieldName = typeof SENSITIVE_COMPANY_FIELDS[number];

export function encryptCompanySecretFields<T extends Partial<Record<SensitiveFieldName, string | null | undefined>>>(
  input: T,
): T {
  const out = { ...input } as any;
  for (const field of SENSITIVE_COMPANY_FIELDS) {
    if (field in out) {
      out[field] = encryptCompanySecret(out[field]);
    }
  }
  return out as T;
}

/**
 * Counterpart for reads: take a company row (or partial) and decrypt
 * any sensitive fields present. Same idempotency rule — fields not in
 * the input are untouched.
 */
export function decryptCompanySecretFields<T extends Partial<Record<SensitiveFieldName, string | null>>>(
  input: T,
): T {
  const out = { ...input } as any;
  for (const field of SENSITIVE_COMPANY_FIELDS) {
    if (field in out) {
      out[field] = decryptCompanySecret(out[field]);
    }
  }
  return out as T;
}
