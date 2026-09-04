#!/usr/bin/env bash
# Tests data/morning/15-toplu-paket-2026-09-04.sql against a throwaway local Postgres:
# builds a baseline from every migration below 0129 (i.e. Package 14's own 0124/0126/0127
# are assumed already applied, since Package 15 lands after Package 14 per CEO's own
# sequencing), applies the package, then applies it a SECOND time to prove it's re-runnable.
#
# Baseline-setup block copied verbatim from check-package-14-sequence.sh, which copied it
# verbatim from check-morning-packages-sequence.sh (2026-09-04) -- same auth/storage schema
# stubs, same role creation, not rewritten a third time.
set -uo pipefail

DB="${DB:-pkg15_$$}"
FIRST_UNAPPLIED=129
PACKAGE="data/morning/15-toplu-paket-2026-09-04.sql"

command -v psql >/dev/null || { echo "psql not on PATH"; exit 2; }
trap 'psql -q postgres -c "drop database if exists $DB" >/dev/null 2>&1' EXIT

# PROVENANCE CHECK (CEO, 2026-09-04, after this package went stale TWICE the same night --
# once when Immerse's boolean/basis independence bug was found, once when a 6th classification
# row (Interlochen) was added to the source after this package had already been generated and
# merged). The package's own header records the exact SHA-256 of every source file at the
# moment it was last regenerated; this re-hashes each one NOW and fails loudly, before touching
# any database, if even one has drifted -- the whole point being that "the package still looks
# fine" is exactly what a stale package looks like right up until someone diffs it by hand.
echo "── provenance check (source files vs. what this package was built from) ──"
# Plain array of "path:sha256" pairs, not an associative array -- this machine's default
# `bash` resolves to macOS's bundled 3.2 (confirmed: `bash --version` -> 3.2.57), which
# predates `declare -A` entirely and fails with a confusing "unbound variable" parse error
# on one, rather than a clear "not supported." Portable across bash 3.x and later this way.
EXPECTED_HASHES=(
  "docs/citizenship-restrictions-boilerplate-cleanup-2026-09-04.sql:d06fe40a51461a6725e677acafccbb3e6917662c1046f6eb11ee18d241708238"
  "docs/citizenship-restrictions-classification-2026-09-04.sql:8bfab07eb76d952c1888bad0cf9ce9b276a677fd67c0c92bcb158b8ae012a99c"
  "docs/d2-country-checked-not-stated-requires-0133-2026-09-04.sql:54c52470f55c5b591f6399f8e292b65d160e05f5c4e2dd76a305d5cc198baa54"
  "docs/waterloo-cemc-split-execute-2026-09-04.sql:2ac66ec09bfa00fa5c64fe74a7c141a8def412c9778aef00ea98d6b19948ee81"
  "supabase/migrations/0129_age_grade_eligibility_basis.sql:a74113fd9cfd96bff2e1f59a62494ea05083ee385287f7c352944e4c9ac97569"
  "supabase/migrations/0130_parent_commentary_entries.sql:1fbd6a5b620f45d779de3f33190357e5e0b2d50944632af575978009312fb209"
  "supabase/migrations/0132_university_statistics_year_index_coalesce.sql:799ed30fff1c01206cb312baa7df1bf3eb70fd3bbe5a1f6b8f42d0fbb91fb0dd"
  "supabase/migrations/0133_country_eligibility_basis.sql:c96fc762d53851d5e8a47153bce06b77b2e23184921b8683a5f27f3415870907"
  "docs/edinburgh-duplicate-row-parity-fix-2026-09-04.sql:b3d2f0f723c66c0fd5f99caa2b2d1572e4dffdc269c49f1b891816fa8f070ad5"
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
  echo "  Do not trust this package's content against the drifted file(s) above -- regenerate"
  echo "  data/morning/15-toplu-paket-2026-09-04.sql from current source before testing further."
  exit 1
fi
echo "  OK -- every source file matches what this package was actually built from"
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
echo "  baseline built: every migration below $FIRST_UNAPPLIED (includes Package 14's own 0124/0126/0127)"
echo

# Real opportunity rows the package's UPDATE statements target, by hardcoded id -- 22 rows
# pulled from the live project via execute_sql (read-only) so every WHERE guard (exact
# citizenship_restrictions/residency_restrictions text, country_eligibility_confirmed_open,
# eligible_countries/eligible_citizenships = '{}') resolves exactly as it would against the
# real database, not a fixture that happens to share an id but not the guarded field values.
psql -q "$DB" -v ON_ERROR_STOP=1 -f /private/tmp/claude-501/-Users-adasarpkirik-Desktop-Founder-ORYN/83e8654c-3d70-4a04-99fe-95eb7912e888/scratchpad/pkg15-fixture-insert.sql >/dev/null 2>&1 || {
  echo "  FIXTURE SEED FAILED"; exit 1; }
# eligible_countries/eligible_citizenships default to '{}' per migration 0008, and none of
# these 22 rows have them set live (confirmed in the same execute_sql read) -- no separate
# UPDATE needed, the INSERT's own defaults already match.
echo "  fixture rows seeded (24 real opportunities, exact live field values -- 22 from the original build, Interlochen added with the classification source's 6th row, 30436a92/Edinburgh added with the newly-bundled parity-fix section)"
echo

echo "── first run ──"
if psql -q "$DB" -v ON_ERROR_STOP=1 -f "$PACKAGE" 2>/tmp/pkg15_run1.err; then
  echo "  OK"
else
  echo "  FAILED:"; cat /tmp/pkg15_run1.err; exit 1
fi

echo "── second run (re-runnability) ──"
if psql -q "$DB" -v ON_ERROR_STOP=1 -f "$PACKAGE" 2>/tmp/pkg15_run2.err; then
  echo "  OK"
else
  echo "  FAILED:"; cat /tmp/pkg15_run2.err; exit 1
fi

echo
echo "── row-count checks (would double after run 2 without a guard) ──"
psql -q "$DB" -t -c "
  select 'opportunities matching the 5 new CEMC titles: ' || count(*)
  from public.opportunities
  where normalized_title in (
    'cemc pascal, cayley and fermat contests',
    'cemc fryer, galois and hypatia contests',
    'cemc euclid contest',
    'canadian senior and intermediate mathematics contests (csmc/cimc)',
    'canadian team mathematics contest (ctmc)'
  );
"
psql -q "$DB" -t -c "
  select 'bundled Waterloo row status: ' || status
  from public.opportunities where id = '51c4b57b-7ea1-4503-b9e6-f1468dc9f3f8';
"

# PERMANENT CHECK (CEO, 2026-09-04, found reviewing before merge): the CHECK constraint 0129/
# 0133 add on *_basis only validates enum membership -- it does not, and structurally cannot,
# cross-check basis against *_confirmed_open. A row can silently end up with basis =
# 'checked_not_stated' (a careful reclassification) sitting right alongside
# confirmed_open = true (an earlier, less careful promotion from a DIFFERENT package) with no
# error at all -- and since lib/opportunities/matching.ts's computeEligibility reads the
# boolean FIRST, the newer, more careful classification becomes silently inert. Found live on
# Immerse Education (7f90019e): Package 14's own D2 fill set country_eligibility_confirmed_
# open = true, Package 15's classification file set country_eligibility_basis =
# 'checked_not_stated' for the same row without resetting the boolean. Fixed at the source
# (docs/citizenship-restrictions-classification-2026-09-04.sql now also sets
# country_eligibility_confirmed_open = false). This check makes the class of bug, not just
# the one instance, permanently visible -- across all three dimensions, since age/grade share
# the identical two-mechanism shape (0126's booleans, 0129/0133's basis columns).
CONTRADICTIONS=$(psql -q "$DB" -t -c "
  select count(*) from public.opportunities
  where (country_eligibility_confirmed_open = true and country_eligibility_basis = 'checked_not_stated')
     or (age_eligibility_confirmed_open = true and age_eligibility_basis = 'checked_not_stated')
     or (grade_eligibility_confirmed_open = true and grade_eligibility_basis = 'checked_not_stated');
" | tr -d ' ')
echo " contradictory rows (*_confirmed_open=true WITH *_basis='checked_not_stated', any dimension): $CONTRADICTIONS"
if [ "$CONTRADICTIONS" != "0" ]; then
  echo "  FAILED: found $CONTRADICTIONS row(s) with a confirmed-open boolean contradicting a checked-not-stated basis"
  psql -q "$DB" -c "
    select id, title,
      country_eligibility_confirmed_open, country_eligibility_basis,
      age_eligibility_confirmed_open, age_eligibility_basis,
      grade_eligibility_confirmed_open, grade_eligibility_basis
    from public.opportunities
    where (country_eligibility_confirmed_open = true and country_eligibility_basis = 'checked_not_stated')
       or (age_eligibility_confirmed_open = true and age_eligibility_basis = 'checked_not_stated')
       or (grade_eligibility_confirmed_open = true and grade_eligibility_basis = 'checked_not_stated');
  "
  exit 1
fi
psql -q "$DB" -t -c "
  select 'opportunities.age_eligibility_basis/grade_eligibility_basis/country_eligibility_basis columns exist: ' ||
    (select count(*) from information_schema.columns where table_name='opportunities' and column_name in ('age_eligibility_basis','grade_eligibility_basis','country_eligibility_basis'));
"
psql -q "$DB" -t -c "
  select 'parent_commentary_entries table exists: ' ||
    (select count(*) from information_schema.tables where table_name='parent_commentary_entries');
"
psql -q "$DB" -t -c "
  select 'university_statistics unique index is now coalesced: ' ||
    (select count(*) from pg_indexes where indexname='university_statistics_university_year_idx' and indexdef ilike '%coalesce%');
"
psql -q "$DB" -t -c "
  select 'rows with country_eligibility_basis = checked_not_stated (expect 16 -- 11 from D2 + Immerse/Interlochen/Oxford Scholastica/UCSB from classification + Edinburgh/30436a92 from the parity fix): ' ||
    count(*)
  from public.opportunities where country_eligibility_basis = 'checked_not_stated';
"
psql -q "$DB" -t -c "
  select 'rows promoted to confirmed_no_restriction by classification (expect 2 -- Bocconi, Wharton LBW): ' || count(*)
  from public.opportunities where id in ('0cbe26c6-c073-4ce5-9b9d-b928a3c0a7bc','c033f1e9-4642-4a5a-94da-739efadff477') and country_eligibility_basis = 'confirmed_no_restriction' and country_eligibility_confirmed_open = true;
"
psql -q "$DB" -t -c "
  select 'Lumiere citizenship_restrictions cleared (expect empty/null): ' || coalesce(citizenship_restrictions, '(null, correct)')
  from public.opportunities where id = 'bc678344-c213-4ae8-a4f8-48af2856338f';
"
psql -q "$DB" -t -c "
  select 'Interlochen Review (95093e1a) basis/confirmed_open (expect checked_not_stated / false -- the second row this same contradiction class hit, added to source after this package was first generated): ' ||
    coalesce(country_eligibility_basis, 'NULL') || ' / ' || country_eligibility_confirmed_open::text
  from public.opportunities where id = '95093e1a-fc13-4d9a-b4ed-5f0584252b44';
"
psql -q "$DB" -t -c "
  select 'Edinburgh survivor (30436a92) basis (expect checked_not_stated -- the parity-fix file that was found unbundled by NO package while preparing the 14-15-16 sequential integration test, bundled in here): ' ||
    coalesce(country_eligibility_basis, 'NULL')
  from public.opportunities where id = '30436a92-26fd-4972-a8b3-dce8ad454943';
"

echo
echo "Package applied cleanly, twice, in one sitting. Nothing above is a live write."
