/**
 * ERP integration entry point — F2-FILED-011 scaffold dispatcher.
 *
 * Importing this module triggers the side-effect registration of every
 * implemented adapter. Routes that handle /api/erp-connections/* import
 * this module to ensure adapters are registered before lookup.
 *
 * Currently registered:
 *   - NetSuite (OAuth1.0 / TBA — netsuiteAdapter.ts)
 *   - SAP S/4HANA Cloud (OAuth2 + OData v4 — sapAdapter.ts)
 *   - Dynamics 365 Business Central (Azure AD OAuth2 — dynamicsAdapter.ts)
 *
 * Future adapters land here as new imports — `oracleAdapter`,
 * `acumaticaAdapter`, etc. — each self-registers via registerAdapter()
 * in its own file (the side-effect pattern matches how Express
 * middleware commonly registers).
 *
 * Each adapter short-circuits to `{ kind: "not_configured" }` until the
 * operator provisions a sandbox/production account for that ERP and
 * drops the required env vars. So importing all of them here is safe
 * even when only one is provisioned — unused ones return a friendly
 * "not configured, contact sales" message instead of crashing.
 */

import "./netsuiteAdapter"; // side-effect: registers the NetSuite adapter
import "./sapAdapter";      // side-effect: registers the SAP adapter
import "./dynamicsAdapter"; // side-effect: registers the Dynamics 365 BC adapter

export { getAdapter, listRegisteredAdapters, type ErpAdapter, type ErpCredentials, type ErpSystem } from "./adapter";
export { isNetSuiteConfigured } from "./netsuiteAdapter";
export { isSapConfigured } from "./sapAdapter";
export { isDynamicsConfigured } from "./dynamicsAdapter";
