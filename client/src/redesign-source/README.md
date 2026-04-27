# Redesign Source

This directory holds the standalone JSX prototypes Claude Design produced as a high-fidelity redesign reference for every surface of the Prescient Labs application. **Files here are NOT compiled into the production bundle.** They exist as a visual / structural reference for the porting work documented in `docs/REDESIGN_PORT.md`.

## What's expected to live here

When the `claude/redesign-source` branch is merged in, this directory will contain:

- `shell.jsx` — global shell (sidebar + topbar + brand mark + page wrappers)
- `dashboard.jsx` — Dashboard / Overview flagship page
- `procurement.jsx` — Procurement flagship page
- `advisor.jsx` — AI Advisor flagship page
- `batch1-overview.jsx` — DashboardHub, PilotRevenue, Impact, OpsHub, DemandHub
- `batch2-intelligence.jsx` — StrategyInsights, EventMonitoring, DemandSignalRepo, MAIntelligence, GeopoliticalRisk, IndustryConsortium
- `batch3-forecasting.jsx` — Forecasting, MultiHorizon, Accuracy, Commodity, Backtest, BulkTest
- `batch4-procurement.jsx` — AutomatedPO, Allocation, Inventory variants
- `batch5a-suppliers.jsx` — MultiTier mapping, etc.
- `batch5b-ops.jsx` — Machinery, PredictiveMaintenance, DigitalTwin
- `batch6-agents.jsx` — ActionPlaybooks, Automations, Settings tabs
- `batch7-misc.jsx` — auth pages, legal pages, status, not-found, marketing variants
- `batch8-fillgap.jsx` (if present) — surfaces that weren't in the original 84-page brief and got generated as a follow-up

## How to use

**Don't edit these files.** They're a snapshot of design intent. When you're porting a page:

1. Open the corresponding source file here as reference.
2. Edit the production page in `client/src/pages/` to match the visual structure, while replacing mock components with real ones, hardcoded data with React Query hooks, and plain `<a>` tags with Wouter `<Link>`.
3. Follow the per-page recipe in `docs/REDESIGN_PORT.md`.

## Why these aren't compiled

The Vite build only picks up files imported into the React tree. None of the production code imports `redesign-source/*`, so Vite ignores the directory. That means:

- A syntax error in one of these files will NOT break the production build.
- They can use loose JSX (e.g. inline mock data) without satisfying TypeScript strict mode.
- They're safe to keep checked in indefinitely as a design reference.

If you want to delete them after the port is complete, `git rm -r client/src/redesign-source/` is fine — the production app doesn't depend on them.
