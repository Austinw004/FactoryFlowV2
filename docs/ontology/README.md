# `docs/ontology/` — the FactoryFlowV2 world model

This folder is the **single source of truth** the Palantir meta-routine
and every sub-routine read from and write to. It is to FactoryFlowV2
what Foundry's Ontology is to a Palantir customer: a small, navigable
object graph of the business — customers, leads, incidents, code
health, forecasts, roadmap, routines — that turns scattered signals
into a coherent operational picture.

The full routine spec lives at
[`docs/routines/palantir-meta-routine.md`](../routines/palantir-meta-routine.md).

## Files

| File                 | Owner                              | Mutability |
|----------------------|------------------------------------|------------|
| `customers.json`     | Customer hat + meta-routine fusion | append + edit by routine |
| `leads.json`         | Mirror of `contact_inquiries`      | append + edit by routine |
| `incidents.json`     | Engineer hat + security scans      | append-mostly |
| `code_health.json`   | Daily code-health fusion           | append-only (one row/day in `history`) |
| `roadmap.json`       | Intelligence Analyst hat (draft)   | draft-PR only |
| `routines.json`      | Meta-routine discovery (Phase 1)   | overwrite each run |
| `forecasts.json`     | FDR pipeline                       | **READ-ONLY** to routines |
| `meta_runs.jsonl`    | Meta-routine Phase 6               | append-only |
| `digests/<date>.md`  | Meta-routine Phase 8               | one file per run |
| `intel/<date>.md`    | Intelligence Analyst hat           | one file per finding |
| `inbox/`             | Hat routines drop reports here     | consumed by Phase 1 |

## Rules

1. **Forecasts are sacred.** Anything under `server/lib/fdr*` /
   `server/lib/regime*` owns `forecasts.json`. Routines may *read* it
   to ground decisions; they may not write to it.
2. **Append-only files stay append-only.** `meta_runs.jsonl` and the
   `history` array in `code_health.json` are time series — never
   rewrite history.
3. **No PII or secrets in the ontology.** `leads.json` reflects the
   `contact_inquiries` table but should never include free-text body
   fields verbatim — store a redacted summary and a row ID.
4. **Schema-light, evidence-heavy.** Every object should carry enough
   provenance (source URL, PR link, timestamp) that a human can audit
   any claim in tomorrow's digest back to the artifact that produced it.
