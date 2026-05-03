# `docs/ontology/` — Prescient Labs operational world model

This directory is the shared substrate for the **FactoryFlowV2 Palantir meta-routine** and the sub-routines it orchestrates. Every routine reads from and writes to this object graph; it is the single source of truth for the business state that the routines reason about.

The philosophy is borrowed from Palantir Foundry's ontology: instead of N disconnected reports, you get one navigable graph of business objects (customers, leads, incidents, code health, forecasts, roadmap) and every automation acts on that graph.

## Files

| File | Owner | Purpose |
| --- | --- | --- |
| `customers.json` | meta-routine (Phase 2.7) | Known + prospective customers, including pilots. |
| `leads.json` | meta-routine (Phase 2.7) | Mirror of `contact_inquiries`, enriched. Dedupe key: `lower(email) + lower(company)`. |
| `incidents.json` | meta-routine (Phase 2.8) | Production incidents, persistent CI failures (>24h), runtime errors, security advisories. |
| `code_health.json` | meta-routine (Phase 2.9) | Append-only history of typecheck / lint / test / build / bundle / deps / advisories. One row per run. |
| `forecasts.json` | **FDR pipeline** (`server/lib/fdr*`) | READ-ONLY for the meta-routine. Hand-edits forbidden. |
| `roadmap.json` | meta-routine (Phase 2.11, draft proposals only) | `now` / `next` / `later` lanes. Humans approve all changes. |
| `routines.json` | meta-routine (Phase 1) | Catalog of every routine + run history. |
| `meta_runs.jsonl` | meta-routine (Phase 6) | Append-only log of every meta-routine run. One JSON object per line. |
| `digests/<UTC-date>.md` | meta-routine (Phase 8) | Permanent archive of every daily digest. |
| `intel/<UTC-date>.md` | Three-Hat Intelligence Analyst | Per-day intel reports. |

## Rules

- **No hand-edits to `forecasts.json`.** The FDR pipeline owns it.
- **No hand-edits to `meta_runs.jsonl`.** Append-only via the meta-routine.
- **All ontology updates ship as draft PRs** on `palantir/ontology-<UTC-date>` branches so Austin has a reviewable history.
- **Sacred files are out of scope.** No ontology entry references or instructs edits to `server/lib/fdr*`, `server/lib/regime*`, `drizzle/migrations/*`, or `server/lib/securityHardening.ts`.

See the routine prompt in the project notes (`FactoryFlowV2 — Palantir meta-routine (daily)`) for the full operating contract.
