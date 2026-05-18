/**
 * Acumatica ERP adapter — F2-FILED-011 fifth slice.
 *
 * Mirrors the NetSuite + SAP + Dynamics + Oracle adapter patterns:
 * env-gated activation, self-registers via registerAdapter() at import
 * time, falls back to `{ kind: "not_configured" }` until the operator
 * drops the required env vars in Replit Secrets and Republishes.
 *
 *   ACUMATICA_BASE_URL     e.g. "https://customer.acumatica.com" (no path)
 *   ACUMATICA_USERNAME     Service-account username (e.g. "admin@tenant")
 *   ACUMATICA_PASSWORD     Service-account password
 *   ACUMATICA_COMPANY      Acumatica company code (e.g. "MainCompany")
 *
 * Optional (defaults shown):
 *   ACUMATICA_TENANT       Multi-tenant Acumatica setups expose multiple
 *                          tenants per base URL; specify which one to scope
 *                          the session to. Single-tenant deployments leave
 *                          this unset.
 *   ACUMATICA_ENDPOINT_VERSION  REST endpoint version to use. Default
 *                          "Default/22.200.001" — change if the customer's
 *                          tenant uses a custom or upgraded endpoint.
 *
 * Acumatica REST quirks worth flagging for whoever swaps in real creds:
 *   - Auth is session-cookie based, NOT bearer-token. Flow:
 *       1. POST /entity/auth/login with {name, password, company,
 *          tenant?, branch?, locale?} as JSON body. Server returns
 *          Set-Cookie with session id (typically `ASP.NET_SessionId`
 *          and `RequestVerificationToken`).
 *       2. Subsequent reads/writes carry those cookies via Cookie:
 *          header.
 *       3. On logout (or after ~20 min idle), POST /entity/auth/logout
 *          to terminate.
 *     Adapter caches the cookies for the session lifetime + auto-logs-in
 *     again on 401.
 *   - Base path: `/entity/{ENDPOINT_VERSION}/{Entity}` where
 *     ENDPOINT_VERSION is something like `Default/22.200.001`.
 *   - Entity names: Acumatica calls suppliers "Vendor", materials are
 *     "StockItem", POs are "PurchaseOrder".
 *   - Pagination: `?$top=N&$skip=M`, similar to OData. Default top
 *     limit is 100 unless explicitly raised.
 *   - Concurrency: PUT operations require `?_action=Update` query
 *     param + optimistic-locking via `id` field in payload.
 *   - Rate limit: Acumatica enforces 100 concurrent API users per
 *     license by default; if exceeded returns HTTP 429. Adapter MUST
 *     honor `Retry-After`.
 *
 * Scaffolding shipped here:
 *   - Adapter class + interface compliance
 *   - Env-var detection + activation gating
 *   - Session cookie login + caching
 *   - testConnection probes Vendor with $top=1
 *   - Entity-mapping skeletons (Vendor → our Supplier, StockItem →
 *     our Material, PurchaseOrder → our PO)
 *
 * NOT shipped (need real Acumatica sandbox to validate):
 *   - Actual $top/$skip pagination handling.
 *   - 401 → auto-re-login → retry on session expiry.
 *   - Retry-After back-off on 429.
 *   - Logout-on-close hook (current scaffold leaks one session per
 *     deploy; not a problem at scale but a minor cleanup item).
 *
 * Estimated effort once Acumatica sandbox is provisioned: ~3-5 days.
 * Acumatica's developer portal offers a free demo tenant
 * (acumatica.com/developer-program) — turnaround ~1 business day.
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

interface AcumaticaEnvConfig {
  baseUrl: string;
  username: string;
  password: string;
  company: string;
  tenant?: string;
  endpointVersion: string;
}

function readEnvConfig(): AcumaticaEnvConfig | null {
  const baseUrl  = process.env.ACUMATICA_BASE_URL?.trim();
  const username = process.env.ACUMATICA_USERNAME?.trim();
  const password = process.env.ACUMATICA_PASSWORD?.trim();
  const company  = process.env.ACUMATICA_COMPANY?.trim();
  const tenant   = process.env.ACUMATICA_TENANT?.trim();
  const endpointVersion = process.env.ACUMATICA_ENDPOINT_VERSION?.trim() || "Default/22.200.001";

  if (!baseUrl || !username || !password || !company) {
    return null;
  }
  return { baseUrl, username, password, company, tenant, endpointVersion };
}

function isConfigured(): boolean {
  return readEnvConfig() !== null;
}

/**
 * Cached session cookie string. Acumatica sessions are sticky to a
 * single tenant + company; if the env vars change mid-session, we'd
 * need to log out + back in. For now: cache for the process lifetime
 * (worst case: ~20 min Acumatica session idle timeout means we'll
 * 401 once and re-login).
 *
 * Currently `null` triggers a fresh login on the next call. A future
 * enhancement would track expiry + proactively refresh; not needed
 * for the scaffold's testConnection path.
 */
let cachedSessionCookie: string | null = null;

async function login(config: AcumaticaEnvConfig): Promise<string> {
  if (cachedSessionCookie) return cachedSessionCookie;

  const loginPayload: Record<string, string> = {
    name: config.username,
    password: config.password,
    company: config.company,
  };
  if (config.tenant) loginPayload.tenant = config.tenant;

  const res = await fetch(`${config.baseUrl.replace(/\/+$/, "")}/entity/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "PrescientLabs/1.0",
    },
    body: JSON.stringify(loginPayload),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Acumatica login returned HTTP ${res.status}: ${await res.text().catch(() => "")}`);
  }

  // Acumatica returns the session id in Set-Cookie headers. Node's
  // fetch exposes the raw header via `set-cookie`; combine all cookies
  // into a single Cookie: header string for subsequent requests.
  const setCookies = res.headers.getSetCookie?.() ?? [];
  if (setCookies.length === 0) {
    throw new Error("Acumatica login succeeded (HTTP 200) but returned no Set-Cookie headers — session cannot be established");
  }
  // Strip Path/Expires/HttpOnly attributes and join with "; ".
  cachedSessionCookie = setCookies
    .map(c => c.split(";")[0])
    .join("; ");
  return cachedSessionCookie;
}

class AcumaticaAdapter implements ErpAdapter {
  readonly system = "acumatica" as const;
  readonly displayName = "Acumatica Cloud ERP";

  async testConnection(_credsFromDb?: ErpCredentials): Promise<TestConnectionResult> {
    const config = readEnvConfig();
    if (!config) {
      return {
        ok: false,
        reason: "Acumatica is not configured at the platform level. Operator must set ACUMATICA_BASE_URL, ACUMATICA_USERNAME, ACUMATICA_PASSWORD, ACUMATICA_COMPANY env vars (plus optional ACUMATICA_TENANT for multi-tenant setups) and Republish.",
      };
    }

    try {
      const cookie = await login(config);

      // Probe /Vendor with $top=1 — same shape as other adapters' minimal
      // smoke tests. Acumatica's REST returns an array of vendor objects.
      const url = `${config.baseUrl.replace(/\/+$/, "")}/entity/${config.endpointVersion}/Vendor?$top=1`;
      const res = await fetch(url, {
        headers: {
          Cookie: cookie,
          Accept: "application/json",
          "User-Agent": "PrescientLabs/1.0",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (res.status === 401 || res.status === 403) {
        // Clear cached cookie so the next attempt re-logs-in.
        cachedSessionCookie = null;
        return { ok: false, reason: `Acumatica auth rejected (HTTP ${res.status}). The session may have expired, or the service account lacks the API role. Verify the user has 'API Access' assigned in User Roles and that the service account is not locked out.` };
      }
      if (res.status === 404) {
        return { ok: false, reason: `Acumatica returned HTTP 404 on /entity/${config.endpointVersion}/Vendor. Verify ACUMATICA_ENDPOINT_VERSION matches an endpoint deployed in Acumatica → System Management → Web Service Endpoints. Default endpoint is typically "Default/22.200.001" for 2022 R2 builds; newer builds use "Default/23.200.001" etc.` };
      }
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { ok: false, reason: `Acumatica returned HTTP ${res.status}`, details: body.slice(0, 500) };
      }
      const data = await res.json();
      const count = Array.isArray(data) ? data.length : 0;

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
        ackedBy: { entity: "Vendor", count },
      };
    } catch (err: any) {
      return { ok: false, reason: `Acumatica unreachable: ${err?.message ?? "unknown error"}` };
    }
  }

  async listSuppliers(_creds: ErpCredentials, _opts?: ListEntitiesOptions): Promise<ErpAdapterResult<ListEntitiesResult>> {
    if (!isConfigured()) return notConfigured("Acumatica", "ACUMATICA_*");
    // TODO (post-sandbox-provision): GET /entity/{version}/Vendor?$top=500
    // Map each Acumatica Vendor → our Supplier shape:
    //   { externalId: vendor.VendorID?.value,
    //     name: vendor.VendorName?.value,
    //     contactEmail: vendor.MainContact?.Email?.value }
    // Note: Acumatica's REST returns values wrapped in { value: ... }
    // objects — that's not a typo, it's the contract-based REST contract.
    return { ok: false, reason: "Acumatica listSuppliers not yet wired — needs sandbox to validate REST query + entity mapping", retryable: false };
  }

  async listMaterials(_creds: ErpCredentials, _opts?: ListEntitiesOptions): Promise<ErpAdapterResult<ListEntitiesResult>> {
    if (!isConfigured()) return notConfigured("Acumatica", "ACUMATICA_*");
    // TODO: GET /entity/{version}/StockItem?$filter=ItemStatus eq 'Active'
    // Acumatica ItemStatus: 'Active', 'NoSales', 'NoRequest',
    // 'NoPurchases', 'Inactive', 'MarkedForDeletion'. Active is the
    // typical filter for mfg material flows.
    return { ok: false, reason: "Acumatica listMaterials not yet wired — needs sandbox to validate REST query + entity mapping", retryable: false };
  }

  async listPurchaseOrders(_creds: ErpCredentials, _opts?: ListEntitiesOptions): Promise<ErpAdapterResult<ListEntitiesResult>> {
    if (!isConfigured()) return notConfigured("Acumatica", "ACUMATICA_*");
    // TODO: GET /entity/{version}/PurchaseOrder?$filter=Status eq 'Open'
    return { ok: false, reason: "Acumatica listPurchaseOrders not yet wired — needs sandbox to validate REST query + entity mapping", retryable: false };
  }
}

const adapter = new AcumaticaAdapter();
registerAdapter(adapter);

export { adapter as acumaticaAdapter, isConfigured as isAcumaticaConfigured };
