#!/usr/bin/env bash
# Apply supabase/migrations/20260507_dedupe_customers_unique_phone.sql to Postgres.
#
# BEFORE RUNNING: backup your database (Supabase Dashboard → Database → Backups, or pg_dump).
#
# Usage:
#   export DATABASE_URL='postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres'
#   ./scripts/apply-customer-dedupe-migration.sh
#
# Find connection string: Supabase Project → Settings → Database → URI (use Session pooler or Direct).

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SQL="$ROOT/supabase/migrations/20260507_dedupe_customers_unique_phone.sql"

if [[ ! -f "$SQL" ]]; then
  echo "Missing migration file: $SQL" >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Set DATABASE_URL to your Supabase Postgres connection string, then re-run." >&2
  echo "Example: export DATABASE_URL='postgresql://postgres:YOUR_PASSWORD@db.xxxx.supabase.co:5432/postgres'" >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql not found. Install PostgreSQL client (e.g. brew install libpq && brew link --force libpq)." >&2
  exit 1
fi

echo "Applying: $SQL"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SQL"
echo "Migration finished."
echo ""
echo "Verify (should return 0 rows):"
echo "  SELECT store_id, phone_e164, count(*) FROM customers WHERE deleted_at IS NULL GROUP BY 1,2 HAVING count(*) > 1;"
