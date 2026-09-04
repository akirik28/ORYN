#!/usr/bin/env bash
# Tests docs/opportunity-duplicate-consolidation-2026-09-04.sql against a throwaway local
# Postgres: builds a baseline from EVERY migration on disk (Package 16 has no new migration
# of its own -- pure data, and Package 15's 0129/0130/0132/0133 are confirmed merged/assumed
# applied by the time this runs), applies the consolidation twice, checks row states.
#
# Baseline-setup block copied verbatim from check-package-15-sequence.sh, which copied it from
# check-package-14-sequence.sh / check-morning-packages-sequence.sh -- not rewritten a fourth
# time.
set -uo pipefail

DB="${DB:-pkg16_$$}"
PACKAGE="docs/opportunity-duplicate-consolidation-2026-09-04.sql"

command -v psql >/dev/null || { echo "psql not on PATH"; exit 2; }
trap 'psql -q postgres -c "drop database if exists $DB" >/dev/null 2>&1' EXIT

# PROVENANCE CHECK (CEO, 2026-09-04: "aynı riski taşıyor" -- same mechanism added to Package
# 15 after its own source went stale twice unnoticed, extended here). Package 16's SQL content
# is self-authored, drawn from direct live-database measurement, not assembled from other
# evolving files the way Package 15 is -- so this is a WARNING, not a hard failure: the scan
# doc (docs/opportunity-duplicate-scan-2026-09-04.md) drifting doesn't make this package's own
# UPDATEs wrong, but it does mean the package's own comments (which cite that doc's claims,
# e.g. the WYSE section) were written against a specific version of it. Uses bash 3.2-portable
# path:hash pairs, not associative arrays -- same reason as Package 15's own check (this
# machine's default `bash` predates `declare -A`).
echo "── provenance check (scan doc vs. what this package's comments cite) ──"
EXPECTED_HASHES=(
  "docs/opportunity-duplicate-scan-2026-09-04.md:85464edb311472834d3fa40923b6ec74004328a1b23b3ed6e900ef1a9475a8fe"
)
for entry in "${EXPECTED_HASHES[@]}"; do
  f="${entry%%:*}"
  expected="${entry#*:}"
  if [ ! -f "$f" ]; then
    echo "  MISSING: $f (cited by this package's comments, but no longer exists here)"
    continue
  fi
  actual=$(shasum -a 256 "$f" | cut -d' ' -f1)
  if [ "$actual" != "$expected" ]; then
    echo "  DRIFTED (warning, not a failure): $f"
    echo "    package's comments cite:  $expected"
    echo "    file on disk is now:      $actual"
    echo "    This package's own SQL is still correct (it was verified against live data,"
    echo "    not this doc) -- but re-read the doc's current WYSE/Garcia sections before"
    echo "    trusting this package's OWN prose about them without a fresh look."
  else
    echo "  OK -- scan doc unchanged since this package's comments were written"
  fi
done
echo

psql -q postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null 2>&1

psql -q "$DB" -v ON_ERROR_STOP=1 >/dev/null 2>&1 <<'SQL'
create schema if not exists auth;
create schema if not exists storage;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb);
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
  psql -q "$DB" -v ON_ERROR_STOP=1 -f "$f" >/dev/null 2>&1 || {
    echo "  BASELINE FAILED at $(basename "$f")"; exit 1; }
done
echo "  baseline built: every migration on disk (no migration excluded -- Package 16 is pure data)"
echo

# Real fixture rows the consolidation's UPDATEs target, by hardcoded id -- pulled read-only
# from the live project so every WHERE guard (minimum_age is null / status = 'active')
# resolves exactly as it would live.
psql -q "$DB" -v ON_ERROR_STOP=1 >/dev/null 2>&1 <<'SQL'
insert into public.opportunities (id, title, organization, category, normalized_title, official_url, status)
values
  ('30436a92-26fd-4972-a8b3-dce8ad454943', 'University of Edinburgh International Summer School', 'University of Edinburgh (Centre for Open Learning)', 'summer_program', 'university of edinburgh international summer school', 'https://study.ed.ac.uk/summer-school', 'active'),
  ('dc762fce-b83a-4217-a610-290ac2f65f17', 'University of Edinburgh Pre-University Summer School 2026', 'University of Edinburgh, Centre for Open Learning', 'summer_program', 'university of edinburgh pre university summer school 2026', 'https://study.ed.ac.uk/summer-school', 'active'),
  ('d83d7048-537b-4450-8dfa-69e709cdb48f', 'Garcia Summer Scholars', 'Stony Brook University -- Garcia Center for Polymers at Engineered Interfaces', 'summer_program', 'garcia summer scholars', 'https://www.stonybrook.edu/garcia/summer-program/', 'active'),
  ('a37fa810-d142-4c07-b272-b3d58a6e6ea5', 'Garcia Summer Research Program', 'Stony Brook University (Garcia Center for Polymers at Engineered Interfaces)', 'research', 'garcia summer research program', 'https://www.stonybrook.edu/garcia/summer-program/', 'active'),
  ('d12506f1-d77e-49c2-9dc8-55fe610da9b0', 'Lehigh University', 'Lehigh University (Academic Outreach)', 'summer_program', 'lehigh university', 'https://academicoutreach.lehigh.edu/pre-college-programs', 'active'),
  ('a7a89e1e-a9e3-4a8e-9850-789c609a769d', 'Lehigh University: Bethlehem, PA', 'Lehigh University (Academic Outreach)', 'summer_program', 'lehigh university bethlehem pa', 'https://academicoutreach.lehigh.edu/pre-college-programs', 'active');
SQL
echo "  fixture rows seeded (6 real opportunities, all minimum_age null / status active, matching real live state)"
echo

echo "── first run ──"
if psql -q "$DB" -v ON_ERROR_STOP=1 -f "$PACKAGE" 2>/tmp/pkg16_run1.err; then
  echo "  OK"
else
  echo "  FAILED:"; cat /tmp/pkg16_run1.err; exit 1
fi

echo "── second run (re-runnability) ──"
if psql -q "$DB" -v ON_ERROR_STOP=1 -f "$PACKAGE" 2>/tmp/pkg16_run2.err; then
  echo "  OK"
else
  echo "  FAILED:"; cat /tmp/pkg16_run2.err; exit 1
fi

echo
echo "── row-state checks ──"
psql -q "$DB" -t -c "
  select 'Edinburgh survivor (30436a92) minimum_age/maximum_age/deadline: ' ||
    coalesce(minimum_age::text,'NULL') || '/' || coalesce(maximum_age::text,'NULL') || '/' || coalesce(deadline::text,'NULL')
  from opportunities where id = '30436a92-26fd-4972-a8b3-dce8ad454943';
"
psql -q "$DB" -t -c "
  select 'Edinburgh twin (dc762fce) status: ' || status
  from opportunities where id = 'dc762fce-b83a-4217-a610-290ac2f65f17';
"
psql -q "$DB" -t -c "
  select 'Garcia survivor (d83d7048) minimum_age/citizenship_restrictions set: ' ||
    coalesce(minimum_age::text,'NULL') || ' / ' || (citizenship_restrictions is not null)::text
  from opportunities where id = 'd83d7048-537b-4450-8dfa-69e709cdb48f';
"
psql -q "$DB" -t -c "
  select 'Garcia twin (a37fa810) status: ' || status
  from opportunities where id = 'a37fa810-d142-4c07-b272-b3d58a6e6ea5';
"
psql -q "$DB" -t -c "
  select 'Lehigh survivor (d12506f1) status: ' || status
  from opportunities where id = 'd12506f1-d77e-49c2-9dc8-55fe610da9b0';
"
psql -q "$DB" -t -c "
  select 'Lehigh retired (a7a89e1e) status: ' || status
  from opportunities where id = 'a7a89e1e-a9e3-4a8e-9850-789c609a769d';
"
psql -q "$DB" -t -c "
  select 'total active rows among these 6 (expect 3 -- one survivor per pair): ' || count(*)
  from opportunities
  where id in (
    '30436a92-26fd-4972-a8b3-dce8ad454943','dc762fce-b83a-4217-a610-290ac2f65f17',
    'd83d7048-537b-4450-8dfa-69e709cdb48f','a37fa810-d142-4c07-b272-b3d58a6e6ea5',
    'd12506f1-d77e-49c2-9dc8-55fe610da9b0','a7a89e1e-a9e3-4a8e-9850-789c609a769d'
  ) and status = 'active';
"

echo
echo "Package applied cleanly, twice, in one sitting. Nothing above is a live write."
