/**
 * Oracle Fusion Cloud ERP adapter — F2-FILED-011 fourth slice.
 *
 * Mirrors the NetSuite + SAP + Dynamics adapter patterns: env-gated
 * activation, self-registers via registerAdapter() at import time, falls
 * back to `{ kind: "not_configured" }` until the operator drops the
 * required env vars in Replit Secrets and Republishes.
 *
 * Oracle Fusion supports two auth flavors depending on customer setup:
 *
 *   FLAVOR A (Basic Auth — common in sandboxes & smaller production
 *             tenants without IDCS / OCI IAM federation):
 *
 *     ORACLE_INSTANCE_URL    e.g. "https://abc123-test.fa.us2.oraclecloud.com"
 *                            (the tenant URL — found in Setup & Maintenance →
 *                             Manage Cloud Configurations)
 *     ORACLE_USERNAME        Service-account username (e.g. "INTEGRATION_USER")
 *     ORACLE_PASSWORD        Service-account password
 *
 *   FLAVOR B (OAuth2 via IDCS — enterprise tenants with federated identity):
 *
 *     ORACLE_INSTANCE_URL    Same as Flavor A
 *     ORACLE_OAUTH_TOKEN_URL e.g. "https://idcs-abc.identity.oraclecloud.com/oauth2/v1/token"
 *     ORACLE_CLIENT_ID       IDCS app client_id
 *     ORACLE_CLIENT_SECRET   IDCS app client_secret
 *     ORACLE_SCOPE           Resource scope, typically
 *                            "urn:opc:resource:fa:instanceid=..."
 *
 * Adapter auto-selects auth flavor based on which env vars are present —
 * OAuth2 takes precedence if both ORACLE_USERNAME and ORACLE_CLIENT_ID
 * exist (since OAuth is the more modern + secure path).
 *
 * Oracle Fusion REST quirks worth flagging for whoever swaps in real creds:
 *   - Base path: `/fscmRestApi/resources/11.13.18.05/`. The version
 *     segment (11.13.18.05) corresponds to Fusion Apps release 23B+ —
 *     tenants on older releases need a different version. Check via
 *     `Setup & Maintenance → Search → Run Diagnostic Tests → REST API`.
 *   - Pagination: cursor-based via `?offset=N&limit=M&onlyData=true`.
 *     Default limit = 25; max = 500. Response includes `hasMore: bool`
 *     to indicate next-page existence.
 *   - Entity names: Oracle calls suppliers "Supplier" (same as us!),
 *     materials are "Item" (in the Product Information Master),
 *     POs are "PurchaseOrder".
 *   - Etag-based concurrency: writes (POST/PATCH/DELETE) require
 *     fetching the resource's `@odata.etag` first and passing it in
 *     `If-Match` header. Read-only methods (this scaffold's
 *     listSuppliers etc.) don't need this.
 *   - Rate limit: Oracle Fusion enforces a per-tenant 100 req/sec
 *     soft limit + an absolute 500 req/sec hard cap. Adapter MUST
 *     honor `Retry-After` on 429.
 *
 * Scaffolding shipped here:
 *   - Adapter class + interface compliance
 *   - Env-var detection + dual-flavor auth (Basic + OAuth2)
 *   - OAuth2 token caching (when Flavor B is configured)
 *   - testConnection probes /suppliers with ?limit=1
 *   - Entity-mapping skeletons (Oracle Supplier → our Supplier, etc.)
 *
 * NOT shipped (need real Oracle Cloud sandbox to validate):
 *   - Actual pagination handling via the hasMore + offset pattern.
 *   - Etag fetch + If-Match header for the eventual write path.
 *   - Retry-After back-off on 429.
 *
 * Estimated effort once a Fusion sandbox is provisioned: ~3-5 days.
 * Provisioning is typically the slowest part for Oracle — they require
 * a sales call + approval cycle for sandbox access (no self-service
 * trial like SAP BTP or BC Sandbox).
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

type OracleAuthFlavor =
  | { kind: "basic"; instanceUrl: string; username: string; password: string }
  | { kind: "oauth2"; instanceUrl: string; tokenUrl: string; clientId: string; clientSecret: string; scope: string };

function readEnvConfig(): OracleAuthFlavor | null {
  const instanceUrl = process.env.ORACLE_INSTANCE_URL?.trim();
  if (!instanceUrl) return null;

  // OAuth2 path takes precedence when fully configured.
  const tokenUrl     = process.env.ORACLE_OAUTH_TOKEN_URL?.trim();
  const clientId     = process.env.ORACLE_CLIENT_ID?.trim();
  const clientSecret = process.env.ORACLE_CLIENT_SECRET?.trim();
  const scope        = process.env.ORACLE_SCOPE?.trim();
  if (tokenUrl && clientId && clientSecret && scope) {
    return { kind: "oauth2", instanceUrl, tokenUrl, clientId, clientSecret, scope };
  }

  // Basic auth fallback.
  const username = process.env.ORACLE_USERNAME?.trim();
  const password = process.env.ORACLE_PASSWORD?.trim();
  if (username && password) {
    return { kind: "basic", instanceUrl, username, password };
  }

  return null;
}

function isConfigured(): boolean {
  return readEnvConfig() !== null;
}

/**
 * Cached OAuth2 access token (Flavor B only). Oracle IDCS tokens
 * typically TTL ~3600s; refresh proactively ~60s before expiry.
 */
let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function fetchOAuthToken(config: Extract<OracleAuthFlavor, { kind: "oauth2" }>): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: config.scope,
  });

  // IDCS expects HTTP Basic auth on the token endpoint (client_id +
  // client_secret as the Basic-Auth user/pass) AND the grant_type +
  // scope in the form body. Not putting client_id/secret in the body
  // is intentional — IDCS rejects "client_secret_post" auth method;
  // it only accepts "client_secret_basic".
  const basic = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: body.toString(),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Oracle IDCS token endpoint returned HTTP ${res.status}: ${await res.text().catch(() => "")}`);
  }

  const data = await res.json() as { access_token?: string; expires_in?: number };
  if (!data.access_token) {
    throw new Error("Oracle IDCS did not return an access_token");
  }

  const ttlMs = ((data.expires_in ?? 3600) - 60) * 1000;
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + ttlMs,
  };
  return data.access_token;
}

async function authHeader(config: OracleAuthFlavor): Promise<string> {
  if (config.kind === "basic") {
    return `Basic ${Buffer.from(`${config.username}:${config.password}`).toString("base64")}`;
  }
  const token = await fetchOAuthToken(config);
  return `Bearer ${token}`;
}

class OracleAdapter implements ErpAdapter {
  readonly system = "oracle" as const;
  readonly displayName = "Oracle Fusion Cloud ERP";

  async testConnection(_credsFromDb?: ErpCredentials): Promise<TestConnectionResult> {
    const config = readEnvConfig();
    if (!config) {
      return {
        ok: false,
        reason: "Oracle Fusion is not configured at the platform level. Operator must set ORACLE_INSTANCE_URL plus EITHER ORACLE_USERNAME + ORACLE_PASSWORD (basic auth) OR ORACLE_OAUTH_TOKEN_URL + ORACLE_CLIENT_ID + ORACLE_CLIENT_SECRET + ORACLE_SCOPE (OAuth2 via IDCS) env vars and Republish.",
      };
    }

    try {
      const auth = await authHeader(config);

      // Probe /suppliers with limit=1 — minimal payload, proves both
      // auth and the REST endpoint version.
      const url = `${config.instanceUrl.replace(/\/+$/, "")}/fscmRestApi/resources/11.13.18.05/suppliers?limit=1&onlyData=true`;
      const res = await fetch(url, {
        headers: {
          Authorization: auth,
          Accept: "application/json",
          "User-Agent": "PrescientLabs/1.0",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (res.status === 401 || res.status === 403) {
        const flavorHint = config.kind === "basic"
          ? "Verify ORACLE_USERNAME / ORACLE_PASSWORD against the service account in Manage Users."
          : "Verify ORACLE_CLIENT_ID / ORACLE_CLIENT_SECRET / ORACLE_SCOPE against your IDCS app config.";
        return { ok: false, reason: `Oracle auth rejected (HTTP ${res.status}). ${flavorHint}` };
      }
      if (res.status === 404) {
        return { ok: false, reason: `Oracle returned HTTP 404 on /suppliers. Common cause: REST API version mismatch (scaffold targets 11.13.18.05 — Fusion release 23B+). Check Setup & Maintenance → REST API to confirm your tenant's API version.` };
      }
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { ok: false, reason: `Oracle returned HTTP ${res.status}`, details: body.slice(0, 500) };
      }
      const data = await res.json();
      const items = (data as any)?.items ?? [];
      const count = Array.isArray(items) ? items.length : 0;

      return {
        ok: true,
        capabilities: {
          canReadInventory:  true,
          canReadPOs:        true,
          canCreatePOs:      true, // requires Etag fetch + If-Match — not in scaffold
          canUpdatePOs:      true, // requires Etag fetch + If-Match — not in scaffold
          canReadSuppliers:  true,
          canReadInvoices:   true,
        },
        ackedBy: { entity: "Supplier", count },
      };
    } catch (err: any) {
      return { ok: false, reason: `Oracle unreachable: ${err?.message ?? "unknown error"}` };
    }
  }

  async listSuppliers(_creds: ErpCredentials, _opts?: ListEntitiesOptions): Promise<ErpAdapterResult<ListEntitiesResult>> {
    if (!isConfigured()) return notConfigured("Oracle Fusion", "ORACLE_*");
    // TODO (post-sandbox-provision): GET /fscmRestApi/resources/11.13.18.05/suppliers?onlyData=true&limit=500
    // Map each Oracle Supplier → our Supplier shape:
    //   { externalId: supplier.SupplierId, name: supplier.SupplierName,
    //     contactEmail: supplier.EmailAddress,
    //     materialCategories: supplier.CategoryName ? [supplier.CategoryName] : undefined }
    // Pagination: response.hasMore + response.count + ?offset=N for next page.
    return { ok: false, reason: "Oracle listSuppliers not yet wired — needs sandbox to validate REST query + entity mapping", retryable: false };
  }

  async listMaterials(_creds: ErpCredentials, _opts?: ListEntitiesOptions): Promise<ErpAdapterResult<ListEntitiesResult>> {
    if (!isConfigured()) return notConfigured("Oracle Fusion", "ORACLE_*");
    // TODO: GET /fscmRestApi/resources/11.13.18.05/itemsV2
    // Oracle Item types: filter by ItemClass / ItemStatus
    // ('Active' status is the typical workflow for mfg materials).
    return { ok: false, reason: "Oracle listMaterials not yet wired — needs sandbox to validate REST query + entity mapping", retryable: false };
  }

  async listPurchaseOrders(_creds: ErpCredentials, _opts?: ListEntitiesOptions): Promise<ErpAdapterResult<ListEntitiesResult>> {
    if (!isConfigured()) return notConfigured("Oracle Fusion", "ORACLE_*");
    // TODO: GET /fscmRestApi/resources/11.13.18.05/purchaseOrders
    return { ok: false, reason: "Oracle listPurchaseOrders not yet wired — needs sandbox to validate REST query + entity mapping", retryable: false };
  }
}

const adapter = new OracleAdapter();
registerAdapter(adapter);

export { adapter as oracleAdapter, isConfigured as isOracleConfigured };
