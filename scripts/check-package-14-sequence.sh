#!/usr/bin/env bash
# Tests data/morning/14-toplu-paket-2026-09-04.sql against a throwaway local Postgres:
# builds a baseline from every already-live migration, applies the package, then applies
# it a SECOND time to prove it's re-runnable (the Supabase SQL editor doesn't honour
# begin/commit as one atomic unit the way this script's own psql -f does, so a package
# that only works once in a real transaction can still fail the founder's actual tool).
#
# Baseline-setup block copied verbatim from check-morning-packages-sequence.sh (2026-09-04)
# rather than rewritten — same auth/storage schema stubs, same role creation.
set -uo pipefail

DB="${DB:-pkg14_$$}"
FIRST_UNAPPLIED=124
PACKAGE="data/morning/14-toplu-paket-2026-09-04.sql"

command -v psql >/dev/null || { echo "psql not on PATH"; exit 2; }
trap 'psql -q postgres -c "drop database if exists $DB" >/dev/null 2>&1' EXIT

# PROVENANCE CHECK (CEO, 2026-09-04: "aynı sağlamayı paket 14... de uygula" -- the exact risk
# that already fired here once. Package 14's D2 section was hand-assembled from these named
# source files; one of them (d2-visible-priority-additions-2026-09-04.sql) had its Interlochen
# Review country_eligibility_confirmed_open line withdrawn at its own source AFTER Package 14
# was already built and merged -- the withdrawal never propagated into this bundle, so the
# founder's copy still carried the withdrawn line until it was found and fixed here directly
# (2026-09-04, while preparing the 14-15-16 sequential integration test). Same bash-3.2-
# portable path:hash pattern as Package 15/16's own checks.
echo "── provenance check (source files vs. what this package was built from) ──"
EXPECTED_HASHES=(
  "supabase/migrations/0124_upgrade_interstitial_dismissal.sql:48e192d6f9aca35d13f70e7cf7c75df73fe1748a3403934c26cc6275424ba2a2"
  "supabase/migrations/0126_opportunity_age_grade_eligibility_confirmed_open.sql:6d8864f661b25e147d0b3a3f52424a7dc47ea12f0b26103d6d238cbec3e0e6fe"
  "supabase/migrations/0127_admission_rate_basis_not_published.sql:188c2c38a146c5391d59a9a76e20301c67fa98fe11b0a6e6bb9f0fc60dea8fd3"
  "docs/d2-batch2-additions-and-corrections-2026-09-04.sql:046c99b6a455dce7f46f460ab0f13b2af1ae5ac3a081413bb36e3f3369e6daa7"
  "docs/d2-visible-priority-additions-2026-09-04.sql:c78fff802e303756d74d00d9a37ce07bda4592a68f5d5f1120e8d51e9f339311"
  "docs/d2-visible-priority-requires-0126-2026-09-04.sql:72e1a72ffa89724ffdc79b036a5a05928cfdaae70e95b72fae901ab0d4693505"
  "data/research/sql-dry-runs/universities/d5-caltech-deadlines-2026-09-04.sql:e28a4ffd54c77a33f442276a715059c44a5bd5df8d4c3fc1aeabaf7366f6b377"
)
PROVENANCE_FAILED=0
for entry in "${EXPECTED_HASHES[@]}"; do
  f="${entry%%:*}"
  expected="${entry#*:}"
  if [ ! -f "$f" ]; then
    echo "  MISSING: $f (this package was built from a file that no longer exists here)"
    PROVENANCE_FAILED=1
    continue
  fi
  actual=$(shasum -a 256 "$f" | cut -d' ' -f1)
  if [ "$actual" != "$expected" ]; then
    echo "  DRIFTED: $f"
    echo "    package was built from: $expected"
    echo "    file on disk is now:    $actual"
    PROVENANCE_FAILED=1
  fi
done
if [ "$PROVENANCE_FAILED" -eq 1 ]; then
  echo
  echo "  FAILED: at least one source file has changed since this package was generated."
  echo "  Do not trust this package's content against the drifted file(s) above -- re-verify"
  echo "  data/morning/14-toplu-paket-2026-09-04.sql's own D2/D5 sections against current source"
  echo "  before testing further (D1/D8 sections have no single tracked .sql source -- they were"
  echo "  hand-written from docs/d1-qs-top100-fill-2026-09-04.md and docs/d8-target-universities-"
  echo "  stats-completeness-2026-09-04.md, research docs rather than SQL to diff against)."
  exit 1
fi
echo "  OK -- every tracked source file matches what this package was actually built from"
echo "  (D1/D8 sections are hand-written from research .md docs, not tracked here by hash --"
echo "  see the FAILED-branch note above for why those two are structurally different)"
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
  n=$(basename "$f" | cut -c1-4)
  [ "$n" -ge "$FIRST_UNAPPLIED" ] 2>/dev/null && continue
  psql -q "$DB" -v ON_ERROR_STOP=1 -f "$f" >/dev/null 2>&1 || {
    echo "  BASELINE FAILED at $(basename "$f")"; exit 1; }
done
echo "  baseline built: every migration below $FIRST_UNAPPLIED"
echo

# Real institution rows the package's UPDATE/INSERT statements target -- by NAME (D8's
# subqueries) and by hardcoded ID (D1's university_requirements inserts, which reference
# specific real university_ids directly, not by name lookup) -- don't exist in a
# from-scratch database. Real IDs pulled from the live project via execute_sql (read-only)
# so the package's own hardcoded references resolve exactly as they would against the
# real database, rather than testing against fixture identities that happen to have the
# right name but the wrong id.
psql -q "$DB" -v ON_ERROR_STOP=1 >/dev/null 2>&1 <<'SQL'
insert into public.universities (id, name, country, city)
values
  ('e5164eb3-88c1-4ecc-81d7-d591ea0c34ea', 'University of Oxford', 'United Kingdom', 'Oxford'),
  ('d6fe8e8f-749f-462d-88b3-b22dfdc11a4c', 'California Institute of Technology (Caltech)', 'United States', 'Pasadena, CA'),
  ('4e05164a-d824-4bc3-8bfe-676c89d809ab', 'University of Chicago', 'United States', 'Chicago, IL'),
  ('42a2cc3c-ee6b-42e7-8812-822718f68094', 'Princeton University', 'United States', 'Princeton, NJ'),
  ('1185e720-36d4-4bbc-b4bb-fced79b73532', 'University of Pennsylvania', 'United States', 'Philadelphia, PA'),
  ('52409036-32ff-47ff-9815-c96a4bc89125', 'Technical University of Munich', 'Germany', 'Munich'),
  ('42f43a53-b072-4734-8c22-6499b1254b04', 'Université PSL', 'France', 'Paris'),
  ('e2feb81c-1bda-4889-8aa9-37783b720901', 'The University of Edinburgh', 'United Kingdom', 'Edinburgh'),
  ('5b97d896-2a17-47ec-84ae-b544183bbd4f', 'King''s College London', 'United Kingdom', 'London'),
  ('b3e69141-b7fb-474a-a8df-44804aedd5f5', 'Delft University of Technology', 'Netherlands', 'Delft'),
  (gen_random_uuid(), 'London School of Economics and Political Science', 'United Kingdom', 'London'),
  (gen_random_uuid(), 'Erasmus University Rotterdam', 'Netherlands', 'Rotterdam'),
  (gen_random_uuid(), 'University of Amsterdam', 'Netherlands', 'Amsterdam'),
  (gen_random_uuid(), 'Boğaziçi University', 'Turkey', 'Istanbul'),
  (gen_random_uuid(), 'Bocconi University', 'Italy', 'Milan');
-- Oxford's seed matches the REAL live row exactly (checked via execute_sql: stat_year
-- 2025, source ox.ac.uk, medium confidence, retrieved_at midnight 2026-09-04) -- not a
-- generic placeholder. D1's own insert targets the identical (university_id, stat_year)
-- key, so this is what actually proves the real unique constraint catches it on a second
-- run; a NULL stat_year here would let D1's insert through uncaught and misreport a
-- duplication that can't happen against the real database.
insert into public.university_statistics (id, university_id, stat_year, admission_rate, admission_rate_basis, source, data_confidence, retrieved_at)
select gen_random_uuid(), id, 2025, null, 'not_researched', 'https://www.ox.ac.uk/about/facts-and-figures/admissions-statistics/undergraduate-students', 'medium', '2026-09-04T00:00:00Z'
from public.universities where name = 'University of Oxford';
insert into public.university_statistics (id, university_id, admission_rate, admission_rate_basis, source, data_confidence, retrieved_at)
select gen_random_uuid(), id, null, 'not_researched', 'seed', 'low', now() - interval '1 day'
from public.universities where name = 'California Institute of Technology (Caltech)';
update public.university_statistics set sat_range_low = null, sat_range_high = null
where university_id = (select id from public.universities where name = 'California Institute of Technology (Caltech)');
SQL
echo "  fixture rows seeded (15 universities: 10 with their real live IDs, 5 by name only; Oxford's stats row matches the real live row exactly)"
echo

echo "── first run ──"
if psql -q "$DB" -v ON_ERROR_STOP=1 -f "$PACKAGE" 2>/tmp/pkg14_run1.err; then
  echo "  OK"
else
  echo "  FAILED:"; cat /tmp/pkg14_run1.err; exit 1
fi

echo "── second run (re-runnability) ──"
if psql -q "$DB" -v ON_ERROR_STOP=1 -f "$PACKAGE" 2>/tmp/pkg14_run2.err; then
  echo "  OK"
else
  echo "  FAILED:"; cat /tmp/pkg14_run2.err; exit 1
fi

echo
echo "── duplicate-row check (INSERTs without a WHERE-NOT-EXISTS guard would double after run 2) ──"
psql -q "$DB" -t -c "
  select 'university_statistics rows for Oxford/LSE/Erasmus/UvA/Boğaziçi/Bocconi/Caltech: ' || count(*)
  from public.university_statistics us
  join public.universities u on u.id = us.university_id
  where u.name in ('University of Oxford','London School of Economics and Political Science','Erasmus University Rotterdam','University of Amsterdam','Boğaziçi University','Bocconi University','California Institute of Technology (Caltech)');
"

echo
echo "Package applied cleanly, twice, in one sitting. Nothing above is a live write."
