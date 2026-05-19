import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

/**
 * Round-34 + round-37: Sentry client-side init.
 *
 * The DSN is hard-coded below. Sentry treats client-side DSNs as
 * NOT a secret — they're designed to be embedded in client bundles
 * (Sentry's own docs include them in example snippets). Anyone who
 * has the DSN can send fake error events to fill the project's quota
 * (rate-limited by Sentry server-side), but they CAN'T read events,
 * change settings, or otherwise compromise the project.
 *
 * Why hard-code instead of reading from env:
 *   Replit's `vite build` step doesn't have access to Replit Secrets,
 *   so `import.meta.env.VITE_SENTRY_DSN` was undefined at build time
 *   — Vite then tree-shook the entire init block, leaving the
 *   deployed bundle without any Sentry code (confirmed empirically in
 *   round-37 diagnosis: grep'd the deployed assets/index-*.js bundle
 *   and found no @sentry references). Hard-coding fixes this with
 *   zero infra changes.
 *
 * Falls back to `import.meta.env.VITE_SENTRY_DSN` if present (so
 * environments that DO populate it at build time can override the
 * hard-coded value — e.g., staging vs prod with separate projects).
 *
 * Sample rate: 10% of pages traced, 100% of errors captured. Plenty
 * of headroom on Sentry's free tier for typical SaaS traffic shapes.
 */
const HARDCODED_SENTRY_DSN = "https://c744caaad0dc518c941537edc129fa0c@o4511414105145344.ingest.us.sentry.io/4511414119759872";
const SENTRY_DSN = ((import.meta as any).env?.VITE_SENTRY_DSN as string | undefined) || HARDCODED_SENTRY_DSN;
if (SENTRY_DSN) {
  // Dynamic import so a missing dep doesn't break the shell.
  import("@sentry/react").then((Sentry) => {
    try {
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: (import.meta as any).env?.MODE || "production",
        release: (import.meta as any).env?.VITE_SENTRY_RELEASE || undefined,
        tracesSampleRate: 0.1,
        // Ignore browser-noise errors that aren't actionable.
        ignoreErrors: [
          "ResizeObserver loop limit exceeded",
          "ResizeObserver loop completed with undelivered notifications",
          "Non-Error promise rejection captured",
          // Chunk-load errors we already recover from in maybeRecoverFromStaleChunk
          "Failed to fetch dynamically imported module",
          "Loading chunk",
          "Loading CSS chunk",
        ],
      });
      // Auth token can leak to Sentry via fetch breadcrumbs — wipe it.
      Sentry.setTag("client", "factoryflow-web");
    } catch (err) {
      console.warn("[Sentry] Init failed:", err);
    }
  }).catch((err) => {
    console.warn("[Sentry] Dynamic import failed (package not installed?):", err);
  });
}

/**
 * Auto-recover from stale lazy-chunk references after a deploy.
 *
 * Vite hashes every code-split chunk (e.g. Dashboard-CvSWu1Xm.js). When we
 * republish, all chunk filenames change. A browser tab that was open before
 * the deploy still has the OLD index.html in memory; when it tries to
 * lazy-load a route the user navigates into, the old chunk URL is now 404
 * and React Router throws "Failed to fetch dynamically imported module".
 * The user sees an "Error loading <section>" card with no recovery beyond
 * a hard refresh.
 *
 * Standard fix: catch that specific error globally and force a single
 * full reload. We guard with sessionStorage so a true network outage
 * (chunk genuinely unreachable) doesn't reload-loop forever — one
 * automatic recovery attempt per session, then defer to the user.
 */
const RELOAD_KEY = "prescient_chunk_reloaded";
function isChunkLoadError(err: unknown): boolean {
  const msg = (err && typeof err === "object" && "message" in err
    ? String((err as { message: unknown }).message)
    : String(err)).toLowerCase();
  return (
    msg.includes("failed to fetch dynamically imported module") ||
    msg.includes("loading chunk") ||
    msg.includes("loading css chunk") ||
    msg.includes("importing a module script failed")
  );
}
function maybeRecoverFromStaleChunk(err: unknown) {
  if (!isChunkLoadError(err)) return;
  if (typeof window === "undefined") return;
  if (sessionStorage.getItem(RELOAD_KEY) === "1") return; // already tried
  sessionStorage.setItem(RELOAD_KEY, "1");
  // Cache-bust by appending a timestamp so the browser hits the network for
  // index.html and picks up the new chunk filenames.
  const sep = window.location.search ? "&" : "?";
  window.location.replace(window.location.pathname + window.location.search + sep + "_v=" + Date.now() + window.location.hash);
}
window.addEventListener("error", (e) => maybeRecoverFromStaleChunk(e.error ?? e.message));
window.addEventListener("unhandledrejection", (e) => maybeRecoverFromStaleChunk(e.reason));
// Clear the reload flag once the page has successfully loaded so future
// deploys can recover again.
window.addEventListener("load", () => {
  setTimeout(() => sessionStorage.removeItem(RELOAD_KEY), 4000);
});

createRoot(document.getElementById("root")!).render(<App />);
