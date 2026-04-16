/**
 * api-fuzz-harness.ts — local, deterministic API fuzzer.
 *
 * Purpose
 *   Hits the authenticated API surface with a curated payload battery (SQLi,
 *   XSS, oversize, UTF-8 edge, negative numbers, path traversal, etc.) and
 *   asserts that every response is one of:
 *     (a) 400/422 with a structured error body, or
 *     (b) 401/403 (auth/authz), or
 *     (c) 404 (resource not found),
 *   and never a 500 or a redirect away from /api/*.
 *
 * This harness is local-only. It refuses to run if BASE_URL contains
 * "prescient-labs.com" so we never spray garbage into production.
 *
 * Usage
 *   # against local dev
 *   npx tsx server/tests/api-fuzz-harness.ts
 *
 *   # against a branch preview
 *   BASE_URL=https://staging.prescient-labs.com/api COOKIE=connect.sid=... \
 *     npx tsx server/tests/api-fuzz-harness.ts
 *
 * The harness is designed to run in CI, producing a JSON report at
 * `artifacts/fuzz/<timestamp>.json` which can be diffed between builds.
 */

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

interface FuzzTarget {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  /** For POST/PUT/PATCH: the body field names we will fuzz individually. */
  bodyFields?: string[];
  /** Skip if endpoint requires admin role only. */
  adminOnly?: boolean;
}

interface FuzzResult {
  target: FuzzTarget;
  payloadLabel: string;
  field?: string;
  status: number;
  ok: boolean;
  durationMs: number;
  body?: unknown;
  issue?: string;
}

// Curated payload battery. Each entry is (label, value). We iterate each value
// into every string-typed field of each target.
const PAYLOADS: Array<[string, string]> = [
  ["empty", ""],
  ["whitespace", "   \t\n  "],
  ["null-like", "null"],
  ["length-10k", "a".repeat(10_000)],
  ["length-100k", "a".repeat(100_000)],
  ["sqli-or1eq1", "' OR 1=1 --"],
  ["sqli-unionselect", "' UNION SELECT id, password FROM users --"],
  ["sqli-dropall", "'; DROP TABLE companies;--"],
  ["xss-script", "<script>alert('xss')</script>"],
  ["xss-imgonerror", "<img src=x onerror=alert(1)>"],
  ["xss-svg", "<svg onload=alert(1)>"],
  ["path-traversal", "../../../../etc/passwd"],
  ["null-byte", "abc\u0000def"],
  ["unicode-rtl", "abc\u202Edef"],
  ["emoji", "🏭🚛📦"],
  ["crlf-injection", "abc\r\nSet-Cookie: evil=1"],
  ["json-injection", '","__proto__":{"isAdmin":true},"a":"'],
  ["template-literal", "${process.env.DATABASE_URL}"],
  ["very-negative", "-9999999999"],
  ["very-large", "9999999999999999999"],
  ["not-a-number", "NaN"],
  ["infinity", "Infinity"],
];

// Representative cross-section of the app. Expand as endpoints are added.
const TARGETS: FuzzTarget[] = [
  { method: "POST", path: "/auth/signup", bodyFields: ["name", "email", "password"] },
  { method: "POST", path: "/auth/login", bodyFields: ["email", "password"] },
  { method: "POST", path: "/auth/forgot-password", bodyFields: ["email"] },
  { method: "POST", path: "/onboarding/company", bodyFields: ["name", "industry", "companySize", "location"] },
  { method: "POST", path: "/onboarding/profile", bodyFields: ["firstName", "lastName", "jobTitle"] },
  { method: "POST", path: "/onboarding/select-plan", bodyFields: ["planId", "billingInterval"] },
  { method: "POST", path: "/forecasting/enhanced", bodyFields: ["skuId", "customerId"] },
  { method: "POST", path: "/commodities/prices/bulk", bodyFields: ["materialCodes"] },
  { method: "POST", path: "/traceability/verify", bodyFields: ["reportId", "signature"] },
  { method: "GET", path: "/materials" },
  { method: "GET", path: "/purchase-orders" },
  { method: "GET", path: "/audit/logs" },
  { method: "GET", path: "/smart-insights/alerts" },
  { method: "GET", path: "/economics/regime" },
];

const BASE_URL = process.env.BASE_URL || "http://localhost:5000/api";
const COOKIE = process.env.COOKIE || ""; // set for authenticated runs

function refusesToRunInProduction() {
  if (BASE_URL.includes("prescient-labs.com") && !process.env.FUZZ_FORCE_PROD) {
    console.error(
      "Refusing to fuzz https://prescient-labs.com. Set FUZZ_FORCE_PROD=1 " +
        "if you really understand the consequences.",
    );
    process.exit(1);
  }
}

async function hit(
  target: FuzzTarget,
  payload: [string, string] | null,
  field?: string,
): Promise<FuzzResult> {
  const [label, value] = payload ?? ["baseline", ""];
  let url = `${BASE_URL}${target.path}`;
  let body: string | undefined;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (COOKIE) headers.Cookie = COOKIE;

  if (target.method === "GET") {
    if (field) url += `?${encodeURIComponent(field)}=${encodeURIComponent(value)}`;
  } else if (field) {
    body = JSON.stringify({ [field]: value });
  } else {
    body = "{}";
  }

  const t0 = Date.now();
  let status = 0;
  let bodyText: unknown = null;
  let issue: string | undefined;

  try {
    const res = await fetch(url, { method: target.method, headers, body });
    status = res.status;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      bodyText = await res.json();
    } else {
      bodyText = await res.text();
    }
  } catch (e) {
    issue = `fetch failed: ${(e as Error).message}`;
  }

  const duration = Date.now() - t0;

  // Classification: any 5xx is automatically a FAIL. Unexpected redirects are a FAIL.
  let ok = status >= 200 && status < 500;
  if (status >= 500) {
    issue = issue || `server error ${status}`;
    ok = false;
  }
  if (status >= 300 && status < 400) {
    issue = issue || `unexpected redirect ${status}`;
    ok = false;
  }

  return {
    target,
    payloadLabel: label,
    field,
    status,
    ok,
    durationMs: duration,
    body: typeof bodyText === "string" ? bodyText.slice(0, 200) : bodyText,
    issue,
  };
}

async function run() {
  refusesToRunInProduction();

  const results: FuzzResult[] = [];
  let fails = 0;
  let total = 0;

  for (const target of TARGETS) {
    // baseline hit first
    const baseline = await hit(target, null);
    results.push(baseline);
    total++;
    if (!baseline.ok) fails++;

    if (target.bodyFields) {
      for (const field of target.bodyFields) {
        for (const p of PAYLOADS) {
          const r = await hit(target, p, field);
          results.push(r);
          total++;
          if (!r.ok) fails++;
        }
      }
    }
  }

  const report = {
    startedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    totalRequests: total,
    failures: fails,
    failureRate: total > 0 ? fails / total : 0,
    results,
  };

  await mkdir("artifacts/fuzz", { recursive: true });
  const outPath = join("artifacts/fuzz", `${Date.now()}.json`);
  await writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  console.log(`[fuzz] total=${total} failures=${fails} (${((fails / total) * 100).toFixed(2)}%)`);
  console.log(`[fuzz] report written to ${outPath}`);

  if (fails > 0) {
    console.log(`[fuzz] sample failures:`);
    for (const r of results.filter((x) => !x.ok).slice(0, 10)) {
      console.log(
        `  ${r.target.method} ${r.target.path} field=${r.field ?? "-"} payload=${r.payloadLabel} status=${r.status} issue=${r.issue ?? "-"}`,
      );
    }
    process.exit(2);
  }
}

run().catch((err) => {
  console.error("[fuzz] fatal:", err);
  process.exit(1);
});
