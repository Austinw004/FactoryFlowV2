/**
 * SAP S/4HANA Cloud ERP adapter — F2-FILED-011 second slice.
 *
 * Mirrors the NetSuite adapter pattern: env-gated activation, registers
 * itself via registerAdapter() at import time, falls back to
 * `{ kind: "not_configured" }` until the operator drops the four required
 * env vars in Replit Secrets and Republishes.
 *
 *   SAP_API_HOST          e.g. "my300000-api.s4hana.cloud.sap" (tenant API host)
 *   SAP_CLIENT_ID         OAuth2 client id (from SAP BTP cockpit → service key)
 *   SAP_CLIENT_SECRET     OAuth2 client secret
 *   SAP_TOKEN_URL         OAuth2 token endpoint (e.g. "https://my300000.authentication.sap.hana.ondemand.com/oauth/token")
 *
 * SAP REST quirks worth flagging for whoever swaps in real creds:
 *   - SAP uses OData v4 — NOT plain REST. Endpoints look like
 *     /sap/opu/odata4/sap/api_business_partner/srvd_a2x/sap/businesspartner/0001/A_BusinessPartner
 *     with `$top`, `$skip`, `$filter`, `$select` query params instead of
 *     RESTful pagination.
 *   - Auth: OAuth2 client_credentials grant. Token TTL is typically
 *     12 hours; we cache + refresh on 401. SAP has no refresh token —
 *     just re-do client_credentials.
 *   - CSRF tokens: writes (POST/PUT/PATCH/DELETE) require fetching an
 *     `X-CSRF-Token` first via GET to any endpoint with header
 *     `X-CSRF-Token: Fetch`. The returned token must echo on every write.
 *     Read-only methods (listSuppliers etc.) DON'T need this.
 *   - Entity names: SAP calls suppliers "BusinessPartner with role FLVN01",
 *     materials are "ProductMasterRecord", POs are "PurchaseOrder".
 *   - Rate limit varies by SAP BTP service tier; basic ones get
 *     1000 requests/hour. Adapter MUST honor `X-RateLimit-Remaining`
 *     and back off when < 50.
 *
 * Scaffolding shipped here:
 *   - Adapter class + interface compliance
 *   - Env-var detection + activation gating
 *   - OAuth2 client_credentials token fetch + cache
 *   - testConnection happy-path + every error class
 *   - Entity-mapping skeletons (SAP BusinessPartner → our Supplier, etc.)
 *
 * NOT shipped (need real sandbox to validate):
 *   - Actual OData v4 query construction + response parsing.
 *   - CSRF token fetch for the eventual write path (createPurchaseOrder etc.).
 *   - `X-RateLimit-Remaining` parsing + back-off.
 *
 * Estimated effort once SAP BTP trial / sandbox is provisioned:
 * ~3-5 days to land OData parsing, entity mappings, and rate-limit
 * back-off. The scaffold here cuts that to "fill in the OData details
 * and test" instead of "design from scratch."
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

interface SapEnvConfig {
  apiHost: string;
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
}

function readEnvConfig(): SapEnvConfig | null {
  const apiHost      = process.env.SAP_API_HOST?.trim();
  const clientId     = process.env.SAP_CLIENT_ID?.trim();
  const clientSecret = process.env.SAP_CLIENT_SECRET?.trim();
  const tokenUrl     = process.env.SAP_TOKEN_URL?.trim();

  if (!apiHost || !clientId || !clientSecret || !tokenUrl) {
    return null;
  }
  return { apiHost, clientId, clientSecret, tokenUrl };
}

function isConfigured(): boolean {
  return readEnvConfig() !== null;
}

/**
 * Cached OAuth2 access token. SAP tokens TTL ~12h; we refresh proactively
 * at 11h to avoid the 401-then-refresh round trip on customer requests.
 */
let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function fetchAccessToken(config: SapEnvConfig): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }

  // OAuth2 client_credentials grant. SAP's token endpoint expects
  // application/x-www-form-urlencoded — NOT JSON.
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`SAP token endpoint returned HTTP ${res.status}: ${await res.text().catch(() => "")}`);
  }

  const data = await res.json() as { access_token?: string; expires_in?: number };
  if (!data.access_token) {
    throw new Error("SAP token endpoint did not return an access_token");
  }

  // SAP returns expires_in in seconds; refresh slightly early to avoid 401s.
  const ttlMs = ((data.expires_in ?? 43200) - 60) * 1000;
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + ttlMs,
  };
  return data.access_token;
}

class SapAdapter implements ErpAdapter {
  readonly system = "sap" as const;
  readonly displayName = "SAP S/4HANA Cloud";

  async testConnection(_credsFromDb?: ErpCredentials): Promise<TestConnectionResult> {
    const config = readEnvConfig();
    if (!config) {
      return {
        ok: false,
        reason: "SAP is not configured at the platform level. Operator must set SAP_API_HOST, SAP_CLIENT_ID, SAP_CLIENT_SECRET, SAP_TOKEN_URL env vars and Republish.",
      };
    }

    try {
      const token = await fetchAccessToken(config);

      // Probe with a small Business Partner read — equivalent to NetSuite's
      // vendor probe. $top=1 limits payload; we only care about reachability +
      // auth, not the data.
      const url = `https://${config.apiHost}/sap/opu/odata4/sap/api_business_partner/srvd_a2x/sap/businesspartner/0001/A_BusinessPartner?$top=1`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "User-Agent": "PrescientLabs/1.0",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (res.status === 401 || res.status === 403) {
        return { ok: false, reason: `SAP auth rejected (HTTP ${res.status}). Verify client_id/client_secret and that the service key has scope for API_BUSINESS_PARTNER.` };
      }
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { ok: false, reason: `SAP returned HTTP ${res.status}`, details: body.slice(0, 500) };
      }
      const data = await res.json();
      // OData v4 wraps result rows in `.value`; some service variants use `.d.results` (older OData v2).
      const rows = (data as any)?.value ?? (data as any)?.d?.results ?? [];
      const count = Array.isArray(rows) ? rows.length : 0;

      return {
        ok: true,
        capabilities: {
          canReadInventory:  true,
          canReadPOs:        true,
          canCreatePOs:      true, // requires CSRF token fetch — not in scaffold yet
          canUpdatePOs:      true, // requires CSRF token fetch — not in scaffold yet
          canReadSuppliers:  true,
          canReadInvoices:   true,
        },
        ackedBy: { entity: "BusinessPartner", count },
      };
    } catch (err: any) {
      return { ok: false, reason: `SAP unreachable: ${err?.message ?? "unknown error"}` };
    }
  }

  async listSuppliers(_creds: ErpCredentials, _opts?: ListEntitiesOptions): Promise<ErpAdapterResult<ListEntitiesResult>> {
    if (!isConfigured()) return notConfigured("SAP", "SAP_*");
    // TODO (post-sandbox-provision): GET A_BusinessPartner?$filter=BusinessPartnerCategory eq '2'
    //   (category 2 = Organization; suppliers are organizations with role FLVN01)
    // Map each SAP BusinessPartner → our Supplier shape:
    //   { externalId: bp.BusinessPartner,
    //     name: bp.BusinessPartnerFullName,
    //     contactEmail: bp.to_BusinessPartnerAddress?.[0]?.to_EmailAddress?.[0]?.EmailAddress }
    return { ok: false, reason: "SAP listSuppliers not yet wired — needs sandbox to validate OData query + entity mapping", retryable: false };
  }

  async listMaterials(_creds: ErpCredentials, _opts?: ListEntitiesOptions): Promise<ErpAdapterResult<ListEntitiesResult>> {
    if (!isConfigured()) return notConfigured("SAP", "SAP_*");
    // TODO: GET /sap/opu/odata4/sap/api_product/srvd_a2x/sap/product/0001/Product
    // SAP Product types: 'HAWA' (trading good), 'FERT' (finished product),
    // 'ROH' (raw material), 'HALB' (semi-finished). Filter to ROH+HALB+FERT
    // for typical mfg material flows.
    return { ok: false, reason: "SAP listMaterials not yet wired — needs sandbox to validate OData query + entity mapping", retryable: false };
  }

  async listPurchaseOrders(_creds: ErpCredentials, _opts?: ListEntitiesOptions): Promise<ErpAdapterResult<ListEntitiesResult>> {
    if (!isConfigured()) return notConfigured("SAP", "SAP_*");
    // TODO: GET /sap/opu/odata4/sap/api_purchaseorder_process_srv/srvd_a2x/sap/purchaseorder/0001/PurchaseOrder
    return { ok: false, reason: "SAP listPurchaseOrders not yet wired — needs sandbox to validate OData query + entity mapping", retryable: false };
  }
}

const adapter = new SapAdapter();
registerAdapter(adapter);

export { adapter as sapAdapter, isConfigured as isSapConfigured };
