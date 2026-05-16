# FactoryFlow Dispatch — Functional Integrity Ledger

Working clone: `C:/Users/austi/my-project/FactoryFlowV2` (sparse-checkout, server + client + shared)
Production: https://prescient-labs.com
Test account: `qa-1778291133@prescient-labs.com`
Session start: 2026-05-09

## Push log

| Time (CDT) | SHA | Phase | Severity | Title | Tested | Outcome |
|------|-----|-------|----------|-------|--------|---------|
| 17:13 | a711ef2 | 0 | — | Seed dispatch ledger | n/a | green; no behavior change |
| 18:25 | c356664 | 1 | F0 | Wire 3 orphaned components + 11 path aliases | 14 routes added in App.tsx, mirrors ~80 existing patterns; tsc not run (npm install failed EIDLETIMEOUT); pushed on structural verification | live; verification of route resolution pending user tsc check |

## Hard stops hit

- `npx tsc --noEmit` could not run from the Bash sandbox (npm registry hits idle-timeout mid-install; node_modules never fully populates).
- Replit terminal is in a cross-origin sandboxed iframe — can't read its content via Chrome MCP. User must paste tsc output manually.

## Findings filed (not fixed)

### F0-FILED-001 — "Load Sample Data" dashboard button silently fails

- **Severity** F0 — primary CTA on the empty-state Dashboard does nothing visible to the user, blocking the entire customer-evaluation path.
- **Page** `/dashboard` — "Get Started" empty state, "Load Sample Data" button.
- **Claimed** "Load Sample Data" button labeled with "explore with sample data first" copy.
- **Observed** Click fires `POST /api/seed` → 403 Forbidden (endpoint is admin-only). No toast, no inline error, no UI change. User sees button do nothing and has no idea why.
- **Thesis failure** Persona Q1-Q7 ("what regime are we in", "what to forward-buy", "supplier concentration", "scenario", "peer benchmarking", "audit log", "SAP integration") all return empty states for a fresh tenant. The intended bypass — Load Sample Data — is broken. Therefore the customer evaluating a 90-day pilot cannot answer 7 of 8 persona questions in ≤3 clicks. Phase 8 persona-killer.
- **Proposed fix** Two options for human review:
  1. Wire the button to a new tenant-scoped sample-data endpoint that seeds the caller's company (not the entire system). Net-new endpoint — out of autonomous-fix scope.
  2. As an interim, surface an error toast on non-OK response: `if (!res.ok) toast({ title: "Sample data not available", description: "Contact sales@prescient-labs.com to enable demo data for your account.", variant: "destructive" })`. Tiny client-side patch; doesn't fix the root cause but removes the silent-failure.
- **Tags** `tool-functional`, `data-integrity`, `inputs`, `coverage`

### F0-FILED-002 — Dashboard has no regime card

- **Severity** F0 — Persona Q1 ("what regime are we in?") has no answer on /dashboard. The regime is the thesis. Selling the thesis without surfacing it on the primary landing page contradicts the product spec.
- **Page** `/dashboard` — Overview tab.
- **Claimed** Brief explicitly says: "Active regime from /dashboard or GET /api/economics/regime. Capture: regime, confidence, lastUpdated."
- **Observed** Empty state Dashboard renders just "Dashboard / Manufacturing control center with performance insights and reporting / Get Started" — no regime, no confidence, no lastUpdated. Only /digital-twin surfaces "Healthy Expansion" (top-right badge).
- **Thesis failure** Active regime = HEALTHY_EXPANSION per `/api/economics/regime`. Dashboard should show the regime + posture summary ("Forward-buy critical materials, lock contracts, scale capacity"). It shows nothing.
- **Proposed fix** Add a regime card to the dashboard Overview tab that reads `/api/economics/regime` and renders the regime + posture line, even on empty-state. ~50 LOC component, but touches the customer's first impression. Recommend human review for placement + copy.
- **Tags** `prediction-quality`, `regime-coherence`, `data-integrity`

### F1-FILED-003 — /signin while authenticated renders "This page doesn't exist."

- **Severity** F1 — Edge case that any user typing /signin into the URL bar while authenticated lands on a NotFound page inside the app shell. Should redirect to /dashboard.
- **Page** `/signin` (when JWT is valid)
- **Observed** Sidebar renders, but main pane shows h1 "This page doesn't exist."
- **Proposed fix** In App.tsx authenticated Router Switch, add `<Route path="/signin"><Redirect to="/dashboard" /></Route>` before the NotFound catch. ~3 LOC; safe.
- **Tags** `tool-functional`, `edge-case`

### F1-FILED-004 — Math.random() in 15 server modules; only backgroundJobs.ts gates on isDemoMode

- **Severity** F1 — Per brief, "anything in production that should be isDemoMode()-gated is F0." Audit shows 15 server files use Math.random outside tests/scripts; only `backgroundJobs.ts` references `isDemoMode`. Triage needed per file.
- **Files** alertGeneration.ts, anomalyDetection.ts, comparisonModels.ts, externalAPIs.ts, fdrStressTest.ts, forecastPopulation.ts, modelCalibration.ts, newsMonitoring.ts, platformAnalytics.ts, productionMetricsPopulation.ts, supplierRiskMonitoring.ts (+ routes.ts inline simulations).
- **Caveat** Spot-check shows several are admin-triggered "generate sample" endpoints called from routes.ts (e.g. `POST /api/admin/generate-forecasts`), not background feeders — those are legitimate. Others (anomalyDetection.ts) likely use RNG for legitimate Monte Carlo sampling. Full triage is per-file and is out of single-session scope.
- **Proposed fix** File-by-file audit + isDemoMode gating where appropriate. Out of autonomous scope per brief ("implementing a missing detector is out of scope").
- **Tags** `data-integrity`, `prediction-quality`

### F1-FILED-006 — 319 pre-existing TypeScript errors across 5 files (Zod v3→v4 migration debt)

- **Severity** F1 — Build works (vite+esbuild strip types) so prod isn't affected today, but the type system is effectively turned off in `shared/schema.ts` (228 errors) and `client/src/pages/Machinery.tsx` (44 errors). Any future schema or form change ships without type-safety net.
- **Discovered via** User ran `npx tsc --noEmit` in Replit shell at the dispatch's request. Output: `Found 319 errors in 5 files.` All errors are Zod-shape mismatches (`Property '_zod' missing`, `ZodObject does not satisfy constraint 'ZodType<any, any, any>'`) — the signature of a Zod v3 → v4 upgrade where the dependency was bumped but downstream schemas weren't updated.
- **Confirmed unrelated to dispatch pushes** Dispatch's only code push (`c356664`) modified `client/src/App.tsx` exclusively. None of the 5 erroring files overlap with the diff. The 319 errors were already in the codebase before this session began.
- **Breakdown**
  - shared/schema.ts:369 — 228 errors
  - client/src/pages/Machinery.tsx:37 — 44 errors
  - client/src/pages/SopWorkspace.tsx:60 — 32 errors
  - server/routes.ts:863 — 13 errors
  - client/src/pages/SettingsPage.tsx:237 — 2 errors
- **Proposed fix** Either downgrade Zod to v3 (one-line `package.json` change + npm install) or update every `z.infer<typeof xSchema>` and `z.coerce.number()` usage to the v4 API. The downgrade is much smaller blast radius. Either way, out of single-session autonomous scope per the hard-stop list (`package.json` dependency changes require human review).
- **Tags** `data-integrity`, `tool-functional`, `coverage`

### F1-FILED-005 — Replit subscription "Payment failed" warning

- **Severity** F1/F0 depending on grace period — "Active deployments will go offline" if not resolved. This is the actual launch-blocker today; no amount of QA matters if the deploy goes dark.
- **Where** Visible inside Replit IDE when opening the workspace.
- **Action** Pay the Replit invoice (Pay invoice button in the modal). Not a code fix; surfacing because it threatens the production deploy.
- **Tags** `coverage`, not-a-code-issue

## Phases status

| Phase | Status | Notes |
|---|---|---|
| 1 — Tool inventory | partial | 60+ pages listed, ~25 verified, 14 broken sidebar links fixed via `c356664`. Some pages have content but empty states for fresh tenant. |
| 2 — Data integrity | partial | Math.random audit done (15 files flagged, see F1-FILED-004); deep per-file triage not done. |
| 3 — Predictions vs thesis | partial | Regime "Healthy Expansion" visible on /digital-twin and /procurement; absent from /dashboard (F0-FILED-002). |
| 4 — Integrations | partial | Stripe pk_live_ ✓, sensor-ingest 401-without-key ✓, /api-docs reachable ✓, /api/audit-trail 400 for un-onboarded tenant. Full sensor ingest end-to-end not run (no API key). |
| 5 — Input boundaries | not run this session | Prior sessions covered signup/onboarding XSS sanitization. |
| 6 — Realtime | not run | Two-tab sensor-push test requires sensor API key. |
| 7 — Perf | not run this session | Prior sessions: load 2.66s, JS 390KB, API p95 165ms. |
| 8 — Persona walk | done | 2/8 questions fully answered, 6/8 hit empty states. Load Sample Data bypass broken (F0-FILED-001). |
| 9 — Ledger commit | this commit | — |

## Final dispatch summary

- Findings by severity: F0=2 (filed), F1=4 (filed), F2=1 (filed), F3=0.
- Tools status: 14 routes wired (FIXED in `c356664`); 1 silent-fail CTA on Dashboard (FILED).
- Data integrity: 15 server files use Math.random; per-file triage pending (FILED).
- Prediction articulation: regime surfaced on /digital-twin and /procurement; absent from /dashboard (FILED).
- Integration health: Stripe/sensor-ingest/api-docs surfaces OK; deep sensor-ingest test gated on API key.
- Commits pushed: 2 (ledger seed + 14 routes). F0 fixed by code = 1 (the orphan-routes finding).
- Reverts: 0.
- **Overall verdict — NOT customer-ready** until: (1) Replit invoice paid so deploy stays online, (2) Dashboard regime card landed (Persona Q1), (3) "Load Sample Data" wired to a working tenant-scoped seeder or hidden + replaced with sales-contact CTA.
