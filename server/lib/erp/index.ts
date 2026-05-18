/**
 * ERP integration entry point — F2-FILED-011 scaffold dispatcher.
 *
 * Importing this module triggers the side-effect registration of every
 * implemented adapter. Routes that handle /api/erp-connections/* import
 * this module to ensure adapters are registered before lookup.
 *
 * Currently registered (5 of the 6 ErpSystem enum values):
 *   - NetSuite                       (OAuth1.0 / TBA           — netsuiteAdapter.ts)
 *   - SAP S/4HANA Cloud              (OAuth2 + OData v4        — sapAdapter.ts)
 *   - Dynamics 365 Business Central  (Azure AD OAuth2          — dynamicsAdapter.ts)
 *   - Oracle Fusion Cloud ERP        (Basic OR IDCS OAuth2     — oracleAdapter.ts)
 *   - Acumatica Cloud ERP            (session-cookie login     — acumaticaAdapter.ts)
 *
 * Not registered:
 *   - "custom" — by definition there's no adapter for an unspecified
 *     customer-built ERP; the routes layer falls through to the
 *     "in beta — contact sales" copy. Customers running custom ERPs
 *     typically need a per-engagement custom integration build.
 *
 * Each adapter short-circuits to `{ kind: "not_configured" }` until the
 * operator provisions a sandbox/production account for that ERP and
 * drops the required env vars. So importing all of them here is safe
 * even when only one is provisioned — unused ones return a friendly
 * "not configured, contact sales" message instead of crashing.
 */

import "./netsuiteAdapter";  // side-effect: registers NetSuite adapter
import "./sapAdapter";       // side-effect: registers SAP adapter
import "./dynamicsAdapter";  // side-effect: registers Dynamics 365 BC adapter
import "./oracleAdapter";    // side-effect: registers Oracle Fusion adapter
import "./acumaticaAdapter"; // side-effect: registers Acumatica adapter

export { getAdapter, listRegisteredAdapters, type ErpAdapter, type ErpCredentials, type ErpSystem } from "./adapter";
export { isNetSuiteConfigured } from "./netsuiteAdapter";
export { isSapConfigured } from "./sapAdapter";
export { isDynamicsConfigured } from "./dynamicsAdapter";
export { isOracleConfigured } from "./oracleAdapter";
export { isAcumaticaConfigured } from "./acumaticaAdapter";
