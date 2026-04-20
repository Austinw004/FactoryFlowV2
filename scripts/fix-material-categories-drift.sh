#!/usr/bin/env bash
# Fix schema drift on the `material_categories` column.
#
# Symptom: drizzle-kit push bails or wants to drop/recreate the column
# on `suppliers` (and/or `supply_chain_nodes`) because the live DB has it
# as a scalar text type while shared/schema.ts declares it as `text[]`.
# Drizzle's auto-migration can't convert scalar → array without data loss,
# so this script does the conversion explicitly and idempotently:
#
#   - column missing       → ADD COLUMN ... text[]
#   - column is text       → ALTER COLUMN ... TYPE text[] USING array[col]::text[]
#   - column is text[]     → no-op
#
# Usage:
#   ./scripts/fix-material-categories-drift.sh            # dry-run, prints plan
#   ./scripts/fix-material-categories-drift.sh --apply    # actually apply
#
# Requires: psql on PATH and DATABASE_URL exported.

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set." >&2
  exit 1
fi

APPLY=""
if [ "${1:-}" = "--apply" ]; then
  APPLY="--apply"
fi

# Tables that own a `material_categories` column per shared/schema.ts.
# Add new ones here if the schema grows more of them.
TABLES=("suppliers" "supply_chain_nodes")

psql_q() { psql "$DATABASE_URL" -At -c "$1"; }
psql_x() { psql "$DATABASE_URL" -c "$1"; }

plan_total=0
declare -a plan_tbls=()
declare -a plan_acts=()

for tbl in "${TABLES[@]}"; do
  exists=$(psql_q "SELECT to_regclass('public.$tbl') IS NOT NULL;")
  if [ "$exists" != "t" ]; then
    printf "  %-24s table missing — skipping\n" "$tbl"
    continue
  fi

  udt=$(psql_q "
    SELECT COALESCE(
      (SELECT udt_name FROM information_schema.columns
        WHERE table_schema='public' AND table_name='$tbl'
          AND column_name='material_categories'),
      ''
    );
  ")
  data_type=$(psql_q "
    SELECT COALESCE(
      (SELECT data_type FROM information_schema.columns
        WHERE table_schema='public' AND table_name='$tbl'
          AND column_name='material_categories'),
      ''
    );
  ")

  if [ -z "$udt" ]; then
    printf "  %-24s material_categories MISSING  → add text[]\n" "$tbl"
    plan_tbls+=("$tbl"); plan_acts+=("add"); plan_total=$((plan_total+1))
  elif [ "$udt" = "_text" ]; then
    printf "  %-24s material_categories text[]    OK\n" "$tbl"
  elif [ "$udt" = "text" ] || [ "$data_type" = "text" ] || [ "$data_type" = "character varying" ]; then
    printf "  %-24s material_categories scalar    → convert to text[]\n" "$tbl"
    plan_tbls+=("$tbl"); plan_acts+=("convert"); plan_total=$((plan_total+1))
  else
    printf "  %-24s material_categories udt=%-12s data_type=%s (unexpected — skipping, fix manually)\n" \
      "$tbl" "$udt" "$data_type"
  fi
done

echo
echo "Actions to take: $plan_total"

if [ "$plan_total" -eq 0 ]; then
  echo "No drift. shared/schema.ts and DB agree. Safe to run: npm run db:push"
  exit 0
fi

if [ "$APPLY" != "--apply" ]; then
  echo
  echo "DRY RUN. Re-run with --apply to execute:"
  echo "    ./scripts/fix-material-categories-drift.sh --apply"
  exit 0
fi

echo
echo "Applying..."
for i in "${!plan_tbls[@]}"; do
  tbl="${plan_tbls[$i]}"
  act="${plan_acts[$i]}"
  case "$act" in
    add)
      echo "  ALTER TABLE $tbl ADD COLUMN material_categories text[];"
      psql_x "ALTER TABLE \"$tbl\" ADD COLUMN IF NOT EXISTS material_categories text[];" >/dev/null
      ;;
    convert)
      # Wrap the scalar value into a one-element array so no data is lost.
      # NULL stays NULL.
      echo "  ALTER TABLE $tbl ALTER COLUMN material_categories TYPE text[] USING (CASE WHEN material_categories IS NULL THEN NULL ELSE ARRAY[material_categories] END);"
      psql_x "
        ALTER TABLE \"$tbl\"
        ALTER COLUMN material_categories
        TYPE text[]
        USING (CASE WHEN material_categories IS NULL THEN NULL ELSE ARRAY[material_categories] END);
      " >/dev/null
      ;;
  esac
done

echo
echo "Done. Now safe to run: npm run db:push"
