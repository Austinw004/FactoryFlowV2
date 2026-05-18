# Ontology — FactoryFlowV2 World Model

This folder is the **shared object graph** that every Claude Code routine
reads from and writes to. It is the "Palantir layer" of FactoryFlowV2:
Customers, Pilots, Leads, Incidents, Code Health, Forecasts, Roadmap,
and Routines as first-class objects rather than scattered rows.

The Palantir meta-routine (see `docs/PALANTIR_META_ROUTINE.md`) is the
primary writer. Sub-routines write only the slices assigned to them.

## Files

| File                | Owner                        | Mutability |
| ------------------- | ---------------------------- | ---------- |
| `customers.json`    | Meta-routine (Phase 2.7)     | Append + merge by id |
| `leads.json`        | Meta-routine + Customer hat  | Append + merge by email/company |
| `incidents.json`    | Meta-routine + Engineer hat  | Append; close by status |
| `code_health.json`  | Meta-routine (Phase 2.9)     | Append daily |
| `roadmap.json`      | Meta-routine + Intel hat     | Edit by id; preserve history |
| `routines.json`     | Meta-routine (Phase 1.3)     | Merge; preserve last-run history |
| `forecasts.json`    | FDR pipeline                 | **READ-ONLY** to routines |
| `meta_runs.jsonl`   | Meta-routine (Phase 6.22)    | Append-only |
| `digests/<date>.md` | Meta-routine (Phase 8.29)    | Write once per run |
| `intel/<date>.md`   | Intelligence Analyst hat     | Write once per run |

## Rules

1. **Never hand-edit `forecasts.json`.** It is produced by the FDR
   pipeline. If it is stale (>7 days), the meta-routine flags it.
2. **Append, don't replace.** History is the value — preserve prior
   states wherever possible.
3. **One source of truth per concept.** If a sub-routine needs a new
   concept, add a new file here rather than duplicating an existing one.
4. **No PII in `intel/` or `digests/`.** These get committed to the
   repo and shared in PRs.
