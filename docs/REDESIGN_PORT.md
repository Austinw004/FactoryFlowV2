# Redesign Port Playbook

Claude Design produced a high-fidelity redesign of the Prescient Labs application — 68+ surfaces across 13 sections (Overview, Intelligence, Forecasting, Procurement, Suppliers, Operations, Agents, Settings, Auth, Marketing, Admin, Misc). The source lives on the `claude/redesign-source` branch under `client/src/redesign-source/` as standalone JSX prototypes. This document is the recipe for adapting one of those prototypes into a production page on `main`.

## Why a port is needed (not a copy-paste)

The Claude Design files are excellent visual references but not drop-in production code:

- They have **inline mock components** (e.g. local `<KpiTile />` instead of importing `Card` from `@/components/ui/card`).
- They use **plain `<a>` tags for navigation**, not Wouter's `<Link>`.
- They use **hardcoded sample data** (Han Steel, Voestalpine, etc.) instead of React Query hooks against your real API.
- They don't import **shadcn/ui primitives** that exist in `client/src/components/ui/`.
- Their **prop shapes don't match Drizzle types** in `shared/schema.ts`.

A copy-paste push would brick the Vite build (one bad import kills the whole bundle) or render with no real data. The port is a guided rewrite, one page at a time, on feature branches with branch-deploy previews.

## Order of operations

Port in this order — earlier items unblock later items.

1. **Tokens.** Already aligned on `main`: `tailwind.config.ts` palette (ink/bone/signal/muted/soft, no rainbow), `client/src/index.css` Inter + JetBrains Mono, no drop shadows, scrollbar-gutter:stable. **Verify, don't change.**
2. **Shell.** `redesign-source/shell.jsx` → `client/src/components/layout/AppLayout.tsx` + `Sidebar.tsx` + `TopBar.tsx`. Visible on every page. Highest leverage. Port once, every page benefits.
3. **Flagship pages.** Dashboard, Procurement, AI Advisor. Each has a dedicated source file (`dashboard.jsx`, `procurement.jsx`, `advisor.jsx`). Each replaces an existing page in `client/src/pages/`.
4. **Section batches.** `batch1-overview.jsx` … `batch7-misc.jsx` each contain multiple page surfaces. Port one *section batch* per branch — that's a coherent reviewable PR.

## Per-page port recipe

For each surface in a Claude Design source file, walk these steps. Time per surface: 30–90 minutes depending on data wiring complexity.

### 1. Identify the target file

Map the design source to the existing page. Most are 1:1 by name; check `client/src/pages/` for the existing page with the closest name.

### 2. Strip the mock components

Inside the source file, you'll see things like:

```jsx
function KpiTile({ label, value, trend }) {
  return <div className="bg-panel ...">...</div>;
}
```

Replace those with imports from your real component library:

```tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
```

Keep the **layout / classes** verbatim — that's the design intent. Replace only the **wrapping component identity**.

### 3. Convert routing

```jsx
// Source (Claude Design):
<a href="/procurement">Procurement</a>

// Production:
import { Link } from "wouter";
<Link href="/procurement">Procurement</Link>
```

### 4. Wire the data

Find the hardcoded sample data and replace with React Query hooks. Common ones in this app:

```tsx
const { data: regime } = useQuery<{ regime: string; fdr: number }>({
  queryKey: ["/api/economics/regime"],
});
const { data: alerts = [] } = useQuery<MaintenanceAlert[]>({
  queryKey: ["/api/predictive-maintenance/alerts"],
});
```

When the source has 5 KPI tiles with sample numbers, those become 5 destructures from a `/api/dashboard/kpis` endpoint (or assemble from existing endpoints). If the endpoint doesn't exist yet, add it under `server/routes.ts` rather than hardcoding the values into the page.

### 5. Honest empty states

If the data hook returns `[]`, render the same kind of empty state we shipped on PredictiveMaintenance / RFQ / DemandSignalRepository / SupplierMapping: differentiate "no source connected" from "source connected, nothing to show", and link to the right Connect-Your-Data destination. Never display sample data masquerading as real.

### 6. Type-check + lint

```bash
npx tsc --noEmit 2>&1 | grep "client/src/pages/<your-page>" || echo "clean"
```

Pre-existing errors in unrelated files are noise; we only care about errors *introduced* by this port.

### 7. Build verify

```bash
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=/tmp/sb.mjs
# Then full client build:
npx vite build
```

If both pass, the page is shippable as a draft.

### 8. Branch + push + branch-deploy preview

```bash
git checkout -b claude/redesign-<page-name>
git add -A
git commit -m "feat(redesign): port <page-name> to new design system"
git push -u origin claude/redesign-<page-name>
```

Replit creates a branch deploy URL automatically. **Never merge to main without viewing that URL first.** Test the page renders, data loads, navigation works, and no console errors.

## Section-level ordering recommendation

If you're porting in time-boxed sessions, do them in this order:

| Session | Surfaces |
|---|---|
| 1 | Shell + Dashboard + Procurement + AI Advisor (the most-visited 4) |
| 2 | batch7-misc (auth, legal, status, not-found) — small, fast wins |
| 3 | batch1-overview (DashboardHub, PilotRevenue, Impact, OpsHub, DemandHub) |
| 4 | batch4-procurement (AutomatedPO, Allocation, Inventory*) |
| 5 | batch2-intelligence (StrategyInsights, EventMonitoring, DemandSignalRepo, etc.) |
| 6 | batch3-forecasting (Forecasting, MultiHorizon, Accuracy, Commodity, Backtest, BulkTest) |
| 7 | batch5a-suppliers + batch5b-ops (supplier mapping, machinery, predictive maintenance, digital twin) |
| 8 | batch6-agents (ActionPlaybooks, Automations) + Settings |

After session 1 ships, the visual identity is in place across the whole app via the shell. The remaining sections can ship at any cadence.

## What to do when you hit something the source file doesn't cover

If a page in `client/src/pages/` (e.g. some admin-only or rarely-visited route) doesn't have a corresponding surface in the design source files, **don't redesign it from scratch in this port.** Apply the new shell only — the page content keeps its current implementation. Open a follow-up issue to redesign that surface separately.

## Common pitfalls

- **Don't redesign the LandingPage.** The marketing landing page is already on-brand; the design source's landing variants are for in-app surface consistency, not the public marketing site. Verify before porting.
- **Don't strip data-testid props.** Existing tests reference them. When you replace a `<div>` with a `<Card>`, copy the `data-testid` over.
- **Watch for the FDR threshold leak.** Earlier `RegimeStatus.tsx` had hardcoded "FDR < 1.2" copy. If a design source file reintroduces that, strip it again per the IP-leak audit.
- **Keep the synthetic generators gated.** `server/backgroundJobs.ts` already gates synthetic data behind `DEMO_MODE=1`. If a redesigned page assumes data will always be present (e.g. demo screenshots showing fake metrics), make sure it falls through to the empty state when data is absent.

## Tracking

Each session opens a feature branch (e.g. `claude/redesign-shell-2026-05-01`). Each merges to `main` only after branch-deploy preview is reviewed. Track progress in GitHub project board or just by branch list — `git branch -r | grep redesign` shows what's in flight.
