/**
 * Sentry initialization wrapper — env-gated, defensive.
 *
 * Round-34 closes F0 #8 (no monitoring/error-tracking) from the
 * round-24 audit at the CODE level. To actually start receiving error
 * reports, set SENTRY_DSN in Replit Secrets — without it, every
 * function here is a no-op so the deploy works even without a Sentry
 * account.
 *
 * Round-40 fix: switched from `require("@sentry/node")` to a STATIC
 * ESM import. The production build is bundled by esbuild with
 * `--format=esm` — and in an ES module, `require` is NOT defined
 * (it's a CommonJS-only global). The old `const Sentry =
 * require("@sentry/node")` threw `ReferenceError: require is not
 * defined` at runtime, was swallowed by the try/catch, and getSentry()
 * returned null forever → sentryActive:false even with the package
 * installed + DSN set. (The workspace `node -e "require(...)"` test
 * passed only because that's plain CommonJS, not the ESM bundle.)
 *
 * The original lazy-require rationale ("package might not be installed
 * yet") no longer applies: @sentry/node is a committed dependency
 * (round-39), so a static import resolves at build time and works at
 * runtime in ESM. If the package were ever missing, the build would
 * fail loudly — which is better than a silent runtime null.
 *
 * Operator setup (when you're ready to turn on monitoring):
 *   1. Sign up at sentry.io (free tier covers 5k errors/month).
 *   2. Create a Node.js project, copy the DSN.
 *   3. Add SENTRY_DSN to Replit Secrets. Republish.
 *   4. Errors thrown anywhere in the request lifecycle will appear in
 *      the Sentry dashboard within seconds, with stack trace + request
 *      ID (the X-Request-Id added in round-27) + tenant ID if
 *      populated.
 *
 * Per-environment scrubbing: only sends in NODE_ENV=production by
 * default so dev errors don't pollute the Sentry feed.
 */

import * as SentryNode from "@sentry/node";

type SentryModule = typeof import("@sentry/node") | null;

let cachedSentry: SentryModule = null;
let isInitialized = false;
let initAttempted = false;

/**
 * Returns the @sentry/node module if it's installed AND SENTRY_DSN
 * is set, else null. Idempotent — safe to call from anywhere; only
 * does the work once.
 */
export function getSentry(): SentryModule {
  if (initAttempted) return cachedSentry;
  initAttempted = true;

  if (!process.env.SENTRY_DSN) {
    // No DSN configured — Sentry stays off. Common case until the
    // operator signs up + adds the env var.
    return null;
  }

  if (process.env.NODE_ENV !== "production" && process.env.SENTRY_ENABLE_DEV !== "1") {
    // Skip in dev unless explicitly opted in via SENTRY_ENABLE_DEV=1.
    return null;
  }

  try {
    // Static ESM import (see round-40 note in the file header). Works in
    // both the esbuild --format=esm production bundle and tsx dev.
    const Sentry = SentryNode;
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || "development",
      release: process.env.SENTRY_RELEASE || process.env.REPL_DEPLOYMENT_ID || undefined,
      // Sample 10% of normal traces (perf overhead) — plenty for typical
      // SaaS traffic shapes, well below Sentry's free-tier quota.
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1,
      // Capture ALL errors regardless of sampling.
      // PII handling: don't send headers (could include Authorization
      // bearer tokens), don't send full request bodies (could include
      // passwords). beforeSend can also redact on a per-event basis.
      sendDefaultPii: false,
      // Strip a few well-known noisy errors that aren't actionable.
      ignoreErrors: [
        "Non-Error promise rejection captured",     // benign Promise.reject(string) cases
        "ResizeObserver loop limit exceeded",       // frontend noise that shouldn't reach server
        "ECONNRESET",                                // routine connection drops
        "EPIPE",                                     // upstream client disconnect
      ],
      beforeSend(event, hint) {
        // Defensive: strip Authorization headers + cookies if they
        // slipped through. Belt-and-suspenders with sendDefaultPii:false.
        if (event.request?.headers) {
          delete (event.request.headers as any).authorization;
          delete (event.request.headers as any).cookie;
          delete (event.request.headers as any)["x-api-key"];
        }
        return event;
      },
    });
    cachedSentry = Sentry;
    isInitialized = true;
    console.log(`[Sentry] Initialized for environment "${process.env.NODE_ENV}"`);
    return Sentry;
  } catch (err) {
    // @sentry/node not installed or init failed. Log once + give up
    // gracefully.
    console.warn("[Sentry] Failed to initialize (package not installed or DSN invalid). Errors will NOT be reported. To fix: ensure @sentry/node is installed AND SENTRY_DSN is set. Original error:", err);
    return null;
  }
}

/**
 * Capture an exception to Sentry. No-op if Sentry isn't configured.
 * Returns the Sentry event ID when sent, undefined otherwise — caller
 * can include the ID in the customer-facing error message ("Please
 * contact support with this reference: <id>").
 */
export function captureException(error: unknown, context?: Record<string, any>): string | undefined {
  const Sentry = getSentry();
  if (!Sentry) return undefined;
  try {
    return Sentry.captureException(error, context ? { contexts: { extra: context } } : undefined);
  } catch {
    return undefined;
  }
}

/**
 * Capture a custom message (non-error event). Useful for "this
 * shouldn't happen" warnings that don't throw but are worth investigating.
 */
export function captureMessage(message: string, level: "info" | "warning" | "error" = "warning"): string | undefined {
  const Sentry = getSentry();
  if (!Sentry) return undefined;
  try {
    return Sentry.captureMessage(message, level as any);
  } catch {
    return undefined;
  }
}

/**
 * Set the active tenant context for subsequent error reports in this
 * request. Called from auth middleware once the JWT is resolved.
 * No-op if Sentry isn't configured.
 */
export function setTenantContext(userId: string, companyId?: string | null): void {
  const Sentry = getSentry();
  if (!Sentry) return;
  try {
    Sentry.setUser({ id: userId });
    if (companyId) {
      Sentry.setTag("companyId", companyId);
    }
  } catch {
    /* swallow — instrumentation must never break the request */
  }
}
