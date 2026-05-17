/**
 * ERP integration entry point — F2-FILED-011 scaffold dispatcher.
 *
 * Importing this module triggers the side-effect registration of every
 * implemented adapter (currently: NetSuite). Routes that handle
 * /api/erp-connections/* import this module to ensure adapters are
 * registered before lookup.
 *
 * Future adapters land here as new imports — `sapAdapter`, `dynamicsAdapter`,
 * `oracleAdapter`, etc. — each self-registers via registerAdapter() in
 * its own file (the side-effect pattern matches how Express middleware
 * commonly registers).
 */

import "./netsuiteAdapter"; // side-effect: registers the NetSuite adapter

export { getAdapter, listRegisteredAdapters, type ErpAdapter, type ErpCredentials, type ErpSystem } from "./adapter";
export { isNetSuiteConfigured } from "./netsuiteAdapter";
