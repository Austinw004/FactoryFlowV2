/**
 * Microsoft Dynamics 365 Business Central ERP adapter — F2-FILED-011 third slice.
 *
 * Mirrors the NetSuite + SAP adapter patterns: env-gated activation, self-
 * registers via registerAdapter() at import time, falls back to
 * `{ kind: "not_configured" }` until the operator drops the four required
 * env vars in Replit Secrets and Republishes.
 *
 *   DYNAMICS_TENANT_ID         Azure AD tenant id (GUID)
 *   DYNAMICS_CLIENT_ID         Azure AD app registration client id (GUID)
 *   DYNAMICS_CLIENT_SECRET     Azure AD app registration client secret
 *   DYNAMICS_ENV_NAME          Business Central environment name
 *                              (e.g. "Production", "Sandbox") — typically
 *                              "Production" in production, "Sandbox" in dev
 *
 * Optional (defaults shown):
 *   DYNAMICS_BC_COMPANY_ID     If set, scopes queries to a specific company
 *                              (Business Central tenants can host multiple
 *                              companies). If unset, adapter lists all
 *                              companies the client app has access to.
 *
 * Dynamics REST quirks worth flagging for whoever swaps in real creds:
 *   - Auth: OAuth2 client_credentials grant against Azure AD's token
 *     endpoint:
 *       https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token
 *     Scope: `https://api.businesscentral.dynamics.com/.default`
 *     (the magic `.default` scope is required — without it the token won't
 *     work against BC APIs).
 *   - BC API base URL pattern:
 *       https://api.businesscentral.dynamics.com/v2.0/{TENANT_ID}/{ENV_NAME}/api/v2.0
 *     The TWO `v2.0`s in the path are not a typo — first is the auth flow
 *     version, second is the API contract version.
 *   - Entity names: BC calls suppliers "Vendor" (NOT "Supplier"), materials
 *     are "Item" (NOT "Material"), POs are "PurchaseOrder". OData v4.
 *   - The `companies` endpoint enumerates which companies your app has
 *     access to; subsequent reads are always scoped to one company via
 *     `/companies({companyId})/vendors` etc.
 *   - Rate limit: 100,000 calls / 24h on Production, much lower (10k/24h)
 *     on Sandbox. BC returns 429 with `Retry-After` header — adapter MUST
 *     honor.
 *
 * Scaffolding shipped here:
 *   - Adapter class + interface compliance
 *   - Env-var detection + activation gating
 *   - OAuth2 client_credentials token fetch + cache (mirrors SAP pattern)
 *   - testConnection: hits `companies` endpoint as smoke test
 *   - Entity-mapping skeletons (BC Vendor → our Supplier, etc.)
 *
 * NOT shipped (need real BC sandbox to validate):
 *   - Actual OData v4 query construction for vendors/items/purchaseOrders.
 *   - Company-scoping logic (DYNAMICS_BC_COMPANY_ID vs multi-company).
 *   - 429 + Retry-After back-off.
 *
 * Estimated effort once BC sandbox is provisioned: ~3-5 days. Setting up
 * the Azure AD app registration + service principal + BC service-to-service
 * auth is typically the slowest part (multiple Azure admin consents).
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

interface DynamicsEnvConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  envName: string;
  bcCompanyId?: string;
}

function readEnvConfig(): DynamicsEnvConfig | null {
  const tenantId     = process.env.DYNAMICS_TENANT_ID?.trim();
  const clientId     = process.env.DYNAMICS_CLIENT_ID?.trim();
  const clientSecret = process.env.DYNAMICS_CLIENT_SECRET?.trim();
  const envName      = process.env.DYNAMICS_ENV_NAME?.trim();
  const bcCompanyId  = process.env.DYNAMICS_BC_COMPANY_ID?.trim();

  if (!tenantId || !clientId || !clientSecret || !envName) {
    return null;
  }
  return { tenantId, clientId, clientSecret, envName, bcCompanyId };
}

function isConfigured(): boolean {
  return readEnvConfig() !== null;
}

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function fetchAccessToken(config: DynamicsEnvConfig): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }

  const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    // `.default` scope: tells Azure AD to issue a token for ALL static
    // permissions the app has been consented for on the BC resource.
    // Without `.default`, you'd have to enumerate every individual
    // permission — error-prone and rarely necessary for service-to-service.
    scope: "https://api.businesscentral.dynamics.com/.default",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Azure AD token endpoint returned HTTP ${res.status}: ${await res.text().catch(() => "")}`);
  }

  const data = await res.json() as { access_token?: string; expires_in?: number };
  if (!data.access_token) {
    throw new Error("Azure AD did not return an access_token");
  }

  // expires_in is in seconds; refresh slightly early to avoid 401s
  // (Azure AD client_credentials tokens are typically 3600s but the
  // server is authoritative).
  const ttlMs = ((data.expires_in ?? 3600) - 60) * 1000;
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + ttlMs,
  };
  return data.access_token;
}

function bcApiBase(config: DynamicsEnvConfig): string {
  return `https://api.businesscentral.dynamics.com/v2.0/${encodeURIComponent(config.tenantId)}/${encodeURIComponent(config.envName)}/api/v2.0`;
}

class DynamicsAdapter implements ErpAdapter {
  readonly system = "dynamics" as const;
  readonly displayName = "Microsoft Dynamics 365 Business Central";

  async testConnection(_credsFromDb?: ErpCredentials): Promise<TestConnectionResult> {
    const config = readEnvConfig();
    if (!config) {
      return {
        ok: false,
        reason: "Dynamics 365 BC is not configured at the platform level. Operator must set DYNAMICS_TENANT_ID, DYNAMICS_CLIENT_ID, DYNAMICS_CLIENT_SECRET, DYNAMICS_ENV_NAME env vars and Republish. Optionally set DYNAMICS_BC_COMPANY_ID to scope to a single BC company.",
      };
    }

    try {
      const token = await fetchAccessToken(config);

      // Probe with `companies` — the simplest BC endpoint that proves
      // both auth and the env-name path component. If our app's service
      // principal has been granted access to BC, this returns the list
      // of companies; if not, returns 403 with a helpful message.
      const url = `${bcApiBase(config)}/companies`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "User-Agent": "PrescientLabs/1.0",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (res.status === 401 || res.status === 403) {
        return { ok: false, reason: `Dynamics BC auth rejected (HTTP ${res.status}). Most common cause: the Azure AD app registration has client credentials but hasn't been granted BC API access. In Business Central admin center, go to Users → Microsoft Entra Applications → New, paste the client_id, grant 'D365 AUTOMATION' permission set.` };
      }
      if (res.status === 404) {
        return { ok: false, reason: `Dynamics BC environment "${config.envName}" not found (HTTP 404). Verify DYNAMICS_ENV_NAME matches the actual environment name (case-sensitive; usually "Production" or "Sandbox").` };
      }
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { ok: false, reason: `Dynamics BC returned HTTP ${res.status}`, details: body.slice(0, 500) };
      }
      const data = await res.json();
      const companies = (data as any)?.value ?? [];
      const count = Array.isArray(companies) ? companies.length : 0;

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
        ackedBy: { entity: "company", count },
      };
    } catch (err: any) {
      return { ok: false, reason: `Dynamics BC unreachable: ${err?.message ?? "unknown error"}` };
    }
  }

  async listSuppliers(_creds: ErpCredentials, _opts?: ListEntitiesOptions): Promise<ErpAdapterResult<ListEntitiesResult>> {
    if (!isConfigured()) return notConfigured("Dynamics 365 BC", "DYNAMICS_*");
    // TODO (post-sandbox-provision): GET /companies({companyId})/vendors
    // Map each BC Vendor → our Supplier shape:
    //   { externalId: vendor.id, name: vendor.displayName,
    //     contactEmail: vendor.email, materialCategories: undefined }
    // Multi-company: if DYNAMICS_BC_COMPANY_ID unset, iterate all companies
    // from testConnection's company list + merge results with company prefix
    // on externalId to keep them unique.
    return { ok: false, reason: "Dynamics BC listSuppliers not yet wired — needs sandbox to validate company scoping + entity mapping", retryable: false };
  }

  async listMaterials(_creds: ErpCredentials, _opts?: ListEntitiesOptions): Promise<ErpAdapterResult<ListEntitiesResult>> {
    if (!isConfigured()) return notConfigured("Dynamics 365 BC", "DYNAMICS_*");
    // TODO: GET /companies({companyId})/items
    // BC Item types: 'Inventory', 'Service', 'NonInventory'.
    // Filter to type='Inventory' for typical mfg material flows.
    return { ok: false, reason: "Dynamics BC listMaterials not yet wired — needs sandbox to validate company scoping + entity mapping", retryable: false };
  }

  async listPurchaseOrders(_creds: ErpCredentials, _opts?: ListEntitiesOptions): Promise<ErpAdapterResult<ListEntitiesResult>> {
    if (!isConfigured()) return notConfigured("Dynamics 365 BC", "DYNAMICS_*");
    // TODO: GET /companies({companyId})/purchaseOrders
    return { ok: false, reason: "Dynamics BC listPurchaseOrders not yet wired — needs sandbox to validate company scoping + entity mapping", retryable: false };
  }
}

const adapter = new DynamicsAdapter();
registerAdapter(adapter);

export { adapter as dynamicsAdapter, isConfigured as isDynamicsConfigured };
