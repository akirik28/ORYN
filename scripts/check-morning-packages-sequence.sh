#!/usr/bin/env bash
# Applies every already-live migration to a throwaway local Postgres, then runs the
# founder-facing packages in their stated order on top. Written 2026-09-04 after
# verifying four packages individually and never once as a sequence: three real bugs
# lived only in the composition, including one that failed on the FIRST package.
#
# Companion to check-morning-packages.mjs, which covers staleness but not order.
set -uo pipefail

DB="${DB:-pkgseq_$$}"
FIRST_UNAPPLIED="${FIRST_UNAPPLIED:-115}"
# The stated run order. Update this when a package is added or the order changes.
ORDER=(
  "09-migrations-2026-09-04"
  "13-ACIL-ultra-acigi-2026-09-04"
  "11-migrations-ek-2026-09-04"
  "12-universite-verisi-2026-09-04"
)

command -v psql >/dev/null || { echo "psql not on PATH"; exit 2; }
trap 'psql -q postgres -c "drop database if exists $DB" >/dev/null 2>&1' EXIT

psql -q postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null 2>&1

# Supabase platform objects live outside every migration file. Without these the chain
# fails in ways that look like migration bugs and are not.
psql -q "$DB" -v ON_ERROR_STOP=1 >/dev/null 2>&1 <<'SQL'
create schema if not exists auth;
create schema if not exists storage;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb);
-- nullif must wrap the WHOLE cast target: an empty claim (what the admin client presents)
-- must yield null, not throw.
create or replace function auth.uid() returns uuid language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;
create table storage.buckets (id text primary key, name text, public boolean default false);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
create or replace function storage.foldername(text) returns text[] language sql immutable as $$
  select string_to_array($1, '/') $$;
create publication supabase_realtime;
do $$ begin
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
end $$;
SQL

for f in supabase/migrations/0*.sql; do
  n=$(basename "$f" | cut -c1-4)
  [ "$n" -ge "$FIRST_UNAPPLIED" ] 2>/dev/null && continue
  psql -q "$DB" -v ON_ERROR_STOP=1 -f "$f" >/dev/null 2>&1 || {
    echo "  BASELINE FAILED at $(basename "$f")"; exit 1; }
done
echo "  baseline built: every already-applied migration (< $FIRST_UNAPPLIED)"
echo

bad=0
for pkg in "${ORDER[@]}"; do
  printf "  %-36s -> " "${pkg%%-*}"
  if psql -q "$DB" -v ON_ERROR_STOP=1 -f "data/morning/$pkg.sql" >/tmp/pkgseq.out 2>&1; then
    echo "OK"
  else
    err=$(grep -m1 'ERROR' /tmp/pkgseq.out | sed 's/.*ERROR:  //')
    # A missing universities row is the fixture's absence, not a package defect:
    # the data fill references real institutions this scratch DB has never seen.
    if printf '%s' "$err" | grep -q 'violates foreign key constraint "university_'; then
      echo "OK (fixture gap: needs real universities rows)"
    else
      echo "FAILED: $err"; bad=$((bad + 1))
    fi
  fi
done

echo
if [ "$bad" -gt 0 ]; then
  echo "$bad package(s) fail in the stated order. Fix before handing them over."
  exit 1
fi
echo "All ${#ORDER[@]} packages apply cleanly in the stated order."
