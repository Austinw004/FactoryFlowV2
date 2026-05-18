/**
 * ERP integration entry point — F2-FILED-011 scaffold dispatcher.
 *
 * Importing this module triggers the side-effect registration of every
 * implemented adapter. Routes that handle /api/erp-connections/* import
 * this module to ensure adapters are registered before lookup.
 *
 * Currently registered (all 6 ErpSystem enum values):
 *   - NetSuite                       (OAuth1.0 / TBA           — netsuiteAdapter.ts)
 *   - SAP S/4HANA Cloud              (OAuth2 + OData v4        — sapAdapter.ts)
 *   - Dynamics 365 Business Central  (Azure AD OAuth2          — dynamicsAdapter.ts)
 *   - Oracle Fusion Cloud ERP        (Basic OR IDCS OAuth2     — oracleAdapter.ts)
 *   - Acumatica Cloud ERP            (session-cookie login     — acumaticaAdapter.ts)
 *   - Custom                         (contact-sales sentinel   — customAdapter.ts)
 *
 * The five real adapters short-circuit to `{ kind: "not_configured" }`
 * until the operator provisions a sandbox/production account for that
 * ERP and drops the required env vars. The "custom" adapter is a
 * sentinel that returns a friendly intake message because per-engagement
 * custom-ERP builds are how that category is handled in practice.
 */

import "./netsuiteAdapter";  // side-effect: registers NetSuite adapter
import "./sapAdapter";       // side-effect: registers SAP adapter
import "./dynamicsAdapter";  // side-effect: registers Dynamics 365 BC adapter
import "./oracleAdapter";    // side-effect: registers Oracle Fusion adapter
import "./acumaticaAdapter"; // side-effect: registers Acumatica adapter
import "./customAdapter";    // side-effect: registers Custom sentinel adapter

export { getAdapter, listRegisteredAdapters, type ErpAdapter, type ErpCredentials, type ErpSystem } from "./adapter";
export { isNetSuiteConfigured } from "./netsuiteAdapter";
export { isSapConfigured } from "./sapAdapter";
export { isDynamicsConfigured } from "./dynamicsAdapter";
export { isOracleConfigured } from "./oracleAdapter";
export { isAcumaticaConfigured } from "./acumaticaAdapter";
