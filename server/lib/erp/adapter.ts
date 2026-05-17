/**
 * ERP Adapter Interface — F2-FILED-011 scaffold.
 *
 * Defines the contract every ERP integration (NetSuite, SAP, Dynamics,
 * Oracle, Acumatica, custom) implements. The routes layer doesn't know
 * about specific ERPs; it dispatches to whichever adapter matches the
 * `erpSystem` field on the customer's erpConnection row.
 *
 * Why a dedicated adapter pattern: each ERP has its own auth flow
 * (NetSuite OAuth2 + account/realm IDs, SAP basic auth + custom domain,
 * Dynamics OAuth2 + tenant), entity model (NetSuite uses "Vendor" not
 * "Supplier", quantities can be fractional or integer-only, etc.), and
 * rate-limit budget. The adapter encapsulates ALL of that so the rest
 * of the platform never needs ERP-specific knowledge.
 *
 * Each adapter implements:
 *   testConnection(creds)       → did we successfully reach the ERP?
 *   listEntities(kind, opts)    → fetch products/suppliers/POs/etc.
 *   syncEntity(kind, payload)   → push back changes
 *
 * Returns are normalized to our own types (defined below) so the rest
 * of the platform never sees raw ERP payloads.
 *
 * Status: V1 has the NetSuite adapter scaffold + the dispatch layer.
 * Sandbox creds are environmental — the moment NETSUITE_* env vars
 * are present, the adapter activates. Without them, every method
 * returns `{ kind: "not_configured" }` and the routes layer surfaces
 * the same "ERP connector for X is in beta — contact sales" message
 * we ship today.
 */

export type ErpSystem =
  | "netsuite"
  | "sap"
  | "oracle"
  | "dynamics"
  | "acumatica"
  | "custom";

export type EntityKind = "supplier" | "material" | "purchase_order" | "invoice";

/**
 * Normalized credential shape. Different ERPs need different fields —
 * NetSuite needs accountId + consumerKey + token, SAP needs domain +
 * username, etc. Each adapter validates that the fields it needs are
 * present in the credentials blob and returns a friendly error if not.
 */
export interface ErpCredentials {
  // OAuth2 family (NetSuite, Dynamics)
  consumerKey?: string;
  consumerSecret?: string;
  tokenId?: string;
  tokenSecret?: string;
  // SAP family
  domain?: string;
  username?: string;
  password?: string;
  // Common
  accountId?: string;
  apiEndpoint?: string;
}

export type TestConnectionResult =
  | { ok: true; capabilities: AdapterCapabilities; ackedBy?: { entity: string; count: number } }
  | { ok: false; reason: string; details?: unknown };

export interface AdapterCapabilities {
  canReadInventory: boolean;
  canReadPOs: boolean;
  canCreatePOs: boolean;
  canUpdatePOs: boolean;
  canReadSuppliers: boolean;
  canReadInvoices: boolean;
}

export interface ListEntitiesOptions {
  limit?: number;
  offset?: number;
  since?: Date; // For incremental sync
}

export interface ListEntitiesResult<T = unknown> {
  ok: true;
  items: T[];
  hasMore: boolean;
  cursor?: string;
}

export type ErpAdapterResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; reason: string; retryable: boolean; details?: unknown }
  | { kind: "not_configured"; reason: string };

/** Each ERP system implements this. */
export interface ErpAdapter {
  readonly system: ErpSystem;
  readonly displayName: string;

  testConnection(creds: ErpCredentials): Promise<TestConnectionResult>;
  listSuppliers(creds: ErpCredentials, opts?: ListEntitiesOptions): Promise<ErpAdapterResult<ListEntitiesResult>>;
  listMaterials(creds: ErpCredentials, opts?: ListEntitiesOptions): Promise<ErpAdapterResult<ListEntitiesResult>>;
  listPurchaseOrders(creds: ErpCredentials, opts?: ListEntitiesOptions): Promise<ErpAdapterResult<ListEntitiesResult>>;
}

// Adapter registry — populated by individual adapter modules at import time.
const adapters = new Map<ErpSystem, ErpAdapter>();

export function registerAdapter(adapter: ErpAdapter): void {
  adapters.set(adapter.system, adapter);
}

export function getAdapter(system: ErpSystem): ErpAdapter | undefined {
  return adapters.get(system);
}

export function listRegisteredAdapters(): { system: ErpSystem; displayName: string }[] {
  return Array.from(adapters.values()).map(a => ({ system: a.system, displayName: a.displayName }));
}

/**
 * Standard "not yet implemented" result for adapters whose credentials
 * aren't configured in the environment. Surfaces a friendly message
 * to the route handler so it can pass through to the customer-facing
 * "in beta" copy.
 */
export function notConfigured(adapterName: string, envHint: string): ErpAdapterResult {
  return {
    kind: "not_configured",
    reason: `${adapterName} adapter requires ${envHint} environment variables. Contact sales@prescient-labs.com to provision a sandbox or production connection.`,
  };
}
