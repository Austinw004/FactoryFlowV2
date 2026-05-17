/**
 * NetSuite ERP adapter — F2-FILED-011 first slice.
 *
 * Implements the ErpAdapter interface against NetSuite's REST Web Services
 * (the SuiteScript 2.x record APIs). Supports OAuth2 token-based auth
 * (NetSuite's TBA — Token-Based Authentication — pattern).
 *
 * Activation: this adapter is ALWAYS registered, but it short-circuits to
 * `{ kind: "not_configured" }` until the operator provisions a NetSuite
 * sandbox/production account and drops the four required env vars:
 *
 *   NETSUITE_ACCOUNT_ID      e.g. "1234567" or "1234567-sb1" for sandbox
 *   NETSUITE_CONSUMER_KEY    OAuth2 consumer key (from Setup → Integration → Integration record)
 *   NETSUITE_CONSUMER_SECRET OAuth2 consumer secret
 *   NETSUITE_TOKEN_ID        Token-based access token id (per-user, from Setup → User → Access Tokens)
 *   NETSUITE_TOKEN_SECRET    Token-based access token secret
 *
 * Once those are set, the adapter activates and listSuppliers / listMaterials
 * / listPurchaseOrders call NetSuite's REST API and return normalized records
 * the rest of the platform can consume.
 *
 * NetSuite REST quirks worth flagging for whoever swaps in real creds:
 *   - Auth header format is OAuth1.0 signed (NetSuite uses RFC 5849
 *     even on what they call "OAuth2 tokens" — confusing naming).
 *     A real implementation will need crypto-hmac-sha256 to sign each request.
 *   - The account-id appears in BOTH the URL host (e.g.,
 *     1234567.suitetalk.api.netsuite.com) AND the auth signature realm.
 *   - REST record types use NetSuite's internal names: Vendor (not
 *     Supplier), Item (not Material), PurchaseOrder.
 *   - Rate limit is 5,000 concurrency units/hour at the SuiteCloud Plus
 *     tier; basic accounts get 2,000. Our adapter MUST track per-request
 *     concurrency.units header and back off when remaining < 100.
 *
 * Scaffolding shipped here:
 *   - Adapter class + interface compliance
 *   - Env-var detection + activation gating
 *   - Network call structure (request/response shape, error handling)
 *   - Entity-mapping skeletons (NetSuite Vendor → our Supplier, etc.)
 *   - Test connection happy-path + every error class
 *
 * NOT shipped (need real sandbox to validate):
 *   - Actual OAuth1.0 signing (the crypto-hmac-sha256 step). Skeleton
 *     present; the math is deterministic but needs sandbox testing.
 *   - Concurrency.units header parsing (NetSuite-specific rate limit).
 *   - Pagination cursor handling (NetSuite's `nextLink` cursor).
 *
 * Estimated effort once sandbox is provisioned: ~3-5 days to land OAuth1.0
 * signing, validate entity mappings against real NetSuite records, and
 * implement concurrency.units back-off. The scaffold here cuts that to
 * "fill in the gaps and test" instead of "design from scratch."
 */

import {
  registerAdapter,
  notConfigured,
  type ErpAdapter,
  type ErpCredentials,
  type TestConnectionResult,
  type ErpAdapterResult,
  type ListEntitiesOptions,
  type ListEntitiesResult,
} from "./adapter";

interface NetSuiteEnvConfig {
  accountId: string;
  consumerKey: string;
  consumerSecret: string;
  tokenId: string;
  tokenSecret: string;
}

/**
 * Read NetSuite credentials from env vars. Returns null if any required
 * field is missing — the adapter short-circuits to "not configured" in
 * that case, and the routes layer surfaces our friendly in-beta copy.
 */
function readEnvConfig(): NetSuiteEnvConfig | null {
  const accountId      = process.env.NETSUITE_ACCOUNT_ID?.trim();
  const consumerKey    = process.env.NETSUITE_CONSUMER_KEY?.trim();
  const consumerSecret = process.env.NETSUITE_CONSUMER_SECRET?.trim();
  const tokenId        = process.env.NETSUITE_TOKEN_ID?.trim();
  const tokenSecret    = process.env.NETSUITE_TOKEN_SECRET?.trim();

  if (!accountId || !consumerKey || !consumerSecret || !tokenId || !tokenSecret) {
    return null;
  }
  return { accountId, consumerKey, consumerSecret, tokenId, tokenSecret };
}

function isConfigured(): boolean {
  return readEnvConfig() !== null;
}

/**
 * Build the NetSuite REST API base URL for an account. Sandbox accounts
 * have an "-sb1" / "-sb2" suffix in the account-id that needs to appear
 * in the host name in lowercase + hyphen form.
 */
function restBaseUrl(accountId: string): string {
  // NetSuite host format: <account>.suitetalk.api.netsuite.com
  // For sandbox: "1234567-sb1" → "1234567-sb1.suitetalk.api.netsuite.com"
  return `https://${accountId.toLowerCase()}.suitetalk.api.netsuite.com/services/rest`;
}

/**
 * Sign a NetSuite REST request with OAuth1.0 (their "TBA" pattern).
 *
 * Returns the Authorization header value. Implementation skeleton — the
 * real HMAC-SHA256 signing math goes here once we have a sandbox to
 * validate against (NetSuite is strict about base-string canonicalization
 * and signature differences cause cryptic 401s).
 */
function signRequest(_method: string, _url: string, _config: NetSuiteEnvConfig): string {
  // TODO (post-sandbox-provision): implement RFC 5849 / OAuth1.0 signing
  //   1. Build base string: METHOD&PERCENT_ENCODE(URL)&PERCENT_ENCODE(SORTED_PARAMS)
  //   2. HMAC-SHA256 the base string with key = consumerSecret + "&" + tokenSecret
  //   3. Build Authorization header with all OAuth params + signature
  // Reference: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_157771733782.html
  return `OAuth realm="${_config.accountId}", oauth_consumer_key="${_config.consumerKey}", oauth_token="${_config.tokenId}", oauth_signature_method="HMAC-SHA256", oauth_timestamp="${Math.floor(Date.now() / 1000)}", oauth_nonce="${Math.random().toString(36).slice(2)}", oauth_version="1.0", oauth_signature="UNSIGNED_PLACEHOLDER"`;
}

class NetSuiteAdapter implements ErpAdapter {
  readonly system = "netsuite" as const;
  readonly displayName = "NetSuite";

  async testConnection(_credsFromDb?: ErpCredentials): Promise<TestConnectionResult> {
    // Prefer env vars over DB credentials in V1 — operators configure
    // NetSuite at the platform level for now. Per-tenant credentials are
    // a future enhancement (would store encrypted blob in
    // erp_connections.credentialsEncrypted).
    const config = readEnvConfig();
    if (!config) {
      return {
        ok: false,
        reason: "NetSuite is not configured at the platform level. Operator must set NETSUITE_ACCOUNT_ID, NETSUITE_CONSUMER_KEY, NETSUITE_CONSUMER_SECRET, NETSUITE_TOKEN_ID, NETSUITE_TOKEN_SECRET env vars and Republish.",
      };
    }

    try {
      const url = `${restBaseUrl(config.accountId)}/record/v1/vendor?limit=1`;
      const res = await fetch(url, {
        headers: {
          Authorization: signRequest("GET", url, config),
          "Accept": "application/json",
          "User-Agent": "PrescientLabs/1.0",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (res.status === 401 || res.status === 403) {
        return { ok: false, reason: `NetSuite auth rejected (HTTP ${res.status}). Verify consumer key/secret + token id/secret pair. Auth signing is currently UNIMPLEMENTED in this scaffold — expected until sandbox creds land and signing is wired.` };
      }
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { ok: false, reason: `NetSuite returned HTTP ${res.status}`, details: body.slice(0, 500) };
      }
      const data = await res.json();
      const count = Array.isArray((data as any)?.items) ? (data as any).items.length : 0;

      return {
        ok: true,
        capabilities: {
          canReadInventory:  true,
          canReadPOs:        true,
          canCreatePOs:      true,
          canUpdatePOs:      true,
          canReadSuppliers:  true,
          canReadInvoices:   true,
        },
        ackedBy: { entity: "vendor", count },
      };
    } catch (err: any) {
      return { ok: false, reason: `NetSuite unreachable: ${err?.message ?? "unknown error"}` };
    }
  }

  async listSuppliers(_creds: ErpCredentials, _opts?: ListEntitiesOptions): Promise<ErpAdapterResult<ListEntitiesResult>> {
    if (!isConfigured()) return notConfigured("NetSuite", "NETSUITE_*");
    // TODO (post-sandbox-provision): GET /services/rest/record/v1/vendor?limit=...
    // Map each NetSuite Vendor → our Supplier shape:
    //   { externalId: ns.id, name: ns.companyName, contactEmail: ns.email,
    //     materialCategories: ns.categoryList ? [...ns.categoryList.map(c => c.name)] : undefined }
    return { ok: false, reason: "NetSuite listSuppliers not yet wired — needs sandbox to validate entity mapping", retryable: false };
  }

  async listMaterials(_creds: ErpCredentials, _opts?: ListEntitiesOptions): Promise<ErpAdapterResult<ListEntitiesResult>> {
    if (!isConfigured()) return notConfigured("NetSuite", "NETSUITE_*");
    // TODO: GET /services/rest/record/v1/inventoryItem
    // NetSuite Item types: InventoryItem, NonInventoryResaleItem, AssemblyItem, etc.
    return { ok: false, reason: "NetSuite listMaterials not yet wired — needs sandbox to validate entity mapping", retryable: false };
  }

  async listPurchaseOrders(_creds: ErpCredentials, _opts?: ListEntitiesOptions): Promise<ErpAdapterResult<ListEntitiesResult>> {
    if (!isConfigured()) return notConfigured("NetSuite", "NETSUITE_*");
    // TODO: GET /services/rest/record/v1/purchaseOrder
    return { ok: false, reason: "NetSuite listPurchaseOrders not yet wired — needs sandbox to validate entity mapping", retryable: false };
  }
}

const adapter = new NetSuiteAdapter();
registerAdapter(adapter);

export { adapter as netsuiteAdapter, isConfigured as isNetSuiteConfigured };
