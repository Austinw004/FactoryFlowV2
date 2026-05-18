/**
 * Custom ERP adapter — F2-FILED-011 sixth (and final) slice.
 *
 * Sentinel adapter for customers whose ERP system isn't one of the five
 * pre-built integrations (NetSuite, SAP S/4HANA, Dynamics 365 BC,
 * Oracle Fusion, Acumatica). When the customer selects "custom" in the
 * /api/erp-connections setup form, this adapter responds — instead of
 * the routes layer falling through to the generic "in beta" message —
 * with a more honest, contact-sales-routed response that tells the
 * customer (a) we don't yet have a connector for their system, (b) what
 * they need to send sales to scope a build, and (c) the typical
 * timeline.
 *
 * This is intentionally NOT a working integration. Custom ERPs require
 * per-engagement integration work — typically 2-4 weeks of scoping +
 * 6-12 weeks of build depending on the ERP's API surface and data
 * model. Hardcoding a generic adapter would set false expectations.
 *
 * What this adapter ships:
 *   - testConnection: returns a friendly "we'll build this for you,
 *     here's what we need" message instead of a generic failure
 *   - listSuppliers / listMaterials / listPurchaseOrders: same shape —
 *     "not implemented for custom ERPs; contact sales for a custom
 *     integration build"
 *
 * Why register an adapter at all (vs letting the route fall through):
 *   - Tells the routes layer "yes, we know about this ERP system; we
 *     just don't have a generic integration for it" — better signal
 *     than "ERP not recognized"
 *   - Gives the operator a single message to tune (contact email,
 *     timeline, what info to collect)
 *   - Matches the dispatch shape of the other 5 adapters so frontend
 *     UX is consistent
 */

import {
  registerAdapter,
  type ErpAdapter,
  type ErpCredentials,
  type TestConnectionResult,
  type ErpAdapterResult,
  type ListEntitiesOptions,
  type ListEntitiesResult,
} from "./adapter";

const CUSTOM_ERP_INTAKE_MESSAGE = [
  "Custom ERP integrations are scoped per-engagement.",
  "To start the conversation, email sales@prescient-labs.com with:",
  "  (1) ERP system name + version (e.g., \"Epicor Kinetic 2023.2\"),",
  "  (2) API documentation URL or sample API response payloads,",
  "  (3) Auth mechanism (REST + OAuth2 / SOAP / OData / database direct),",
  "  (4) Entity types you need synced (suppliers, materials, POs, invoices, etc.),",
  "  (5) Expected sync volume (records/day + total records).",
  "Typical timeline: 2-4 weeks scoping, then 6-12 weeks build, depending on API surface.",
].join(" ");

class CustomAdapter implements ErpAdapter {
  readonly system = "custom" as const;
  readonly displayName = "Custom ERP";

  async testConnection(_creds: ErpCredentials): Promise<TestConnectionResult> {
    return {
      ok: false,
      reason: CUSTOM_ERP_INTAKE_MESSAGE,
    };
  }

  async listSuppliers(_creds: ErpCredentials, _opts?: ListEntitiesOptions): Promise<ErpAdapterResult<ListEntitiesResult>> {
    return { ok: false, reason: CUSTOM_ERP_INTAKE_MESSAGE, retryable: false };
  }

  async listMaterials(_creds: ErpCredentials, _opts?: ListEntitiesOptions): Promise<ErpAdapterResult<ListEntitiesResult>> {
    return { ok: false, reason: CUSTOM_ERP_INTAKE_MESSAGE, retryable: false };
  }

  async listPurchaseOrders(_creds: ErpCredentials, _opts?: ListEntitiesOptions): Promise<ErpAdapterResult<ListEntitiesResult>> {
    return { ok: false, reason: CUSTOM_ERP_INTAKE_MESSAGE, retryable: false };
  }
}

const adapter = new CustomAdapter();
registerAdapter(adapter);

export { adapter as customAdapter };
