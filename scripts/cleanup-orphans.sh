#!/usr/bin/env bash
# Purge orphaned rows whose company_id points at a non-existent company.
#
# Why this exists: early test data + historical schema without ON DELETE CASCADE
# left behind rows that reference deleted companies. drizzle-kit push refuses
# to add FK constraints when orphans exist. This script sweeps every table that
# has a foreign key to companies.id and deletes the orphans in one pass.
#
# Usage:
#   ./scripts/cleanup-orphans.sh              # dry-run: counts only
#   ./scripts/cleanup-orphans.sh --apply      # actually delete

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set." >&2
  exit 1
fi

APPLY="${1:-}"

# Find every table + column that has a FK referencing companies.id
read -r -d '' DISCOVER_SQL <<'SQL' || true
SELECT
  tc.table_name AS child_table,
  kcu.column_name AS child_col
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema    = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
 AND ccu.table_schema    = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name     = 'companies'
  AND ccu.column_name    = 'id'
ORDER BY tc.table_name;
SQL

mapfile -t ROWS < <(psql "$DATABASE_URL" -At -F '|' -c "$DISCOVER_SQL")

if [ "${#ROWS[@]}" -eq 0 ]; then
  echo "No tables reference companies.id. Nothing to clean."
  exit 0
fi

echo "Scanning ${#ROWS[@]} tables for orphaned rows..."
echo

TOTAL=0
declare -a DIRTY_TABLES=()
declare -a DIRTY_COLS=()
declare -a DIRTY_COUNTS=()

for row in "${ROWS[@]}"; do
  tbl="${row%%|*}"
  col="${row##*|}"
  count=$(psql "$DATABASE_URL" -At -c "SELECT COUNT(*) FROM \"$tbl\" WHERE \"$col\" IS NOT NULL AND \"$col\" NOT IN (SELECT id FROM companies);")
  printf "  %-40s %s.%s = %s orphan(s)\n" "$tbl" "$tbl" "$col" "$count"
  if [ "$count" -gt 0 ]; then
    DIRTY_TABLES+=("$tbl")
    DIRTY_COLS+=("$col")
    DIRTY_COUNTS+=("$count")
    TOTAL=$((TOTAL + count))
  fi
done

echo
echo "Total orphans: $TOTAL across ${#DIRTY_TABLES[@]} table(s)."

if [ "$TOTAL" -eq 0 ]; then
  echo "Nothing to delete. Safe to run: npm run db:push"
  exit 0
fi

if [ "$APPLY" != "--apply" ]; then
  echo
  echo "This was a DRY RUN. Re-run with --apply to actually delete:"
  echo "    ./scripts/cleanup-orphans.sh --apply"
  exit 0
fi

echo
echo "Applying deletes..."
for i in "${!DIRTY_TABLES[@]}"; do
  tbl="${DIRTY_TABLES[$i]}"
  col="${DIRTY_COLS[$i]}"
  cnt="${DIRTY_COUNTS[$i]}"
  echo "  Deleting $cnt orphan(s) from $tbl..."
  psql "$DATABASE_URL" -c "DELETE FROM \"$tbl\" WHERE \"$col\" IS NOT NULL AND \"$col\" NOT IN (SELECT id FROM companies);" >/dev/null
done

echo
echo "Done. $TOTAL orphan row(s) removed. Now safe to run: npm run db:push"
