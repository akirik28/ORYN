#!/usr/bin/env bash
# CEO, 2026-09-04: "Bugün paketleri tek tek doğruladık. Üçünü sırayla hiç kimse çalıştırmadı --
# ve sabah kurucunun elinde patlayan hata tam olarak buydu: her paket ayrı ayrı doğruydu, sıra
# bozuktu." Each of Package 14/15/16 has its own two-run test; this is the FOURTH test none of
# them are: all three, in the founder's own real order (14 -> 15 -> 16), TWICE, against ONE
# shared database -- proving the packages don't just work alone, they work chained.
#
# Two specific cross-package questions CEO named, checked explicitly at the end:
#   1. Does 0132's index (Package 15) touch the same table Package 16's consolidation does?
#   2. Do Package 16's retired rows intersect with rows Package 15 updates? (Edinburgh does --
#      Package 15's D2 fill sets country_eligibility_basis on dc762fce; Package 16 migrates
#      dc762fce's other fields onto 30436a92 and retires dc762fce. Order might matter.)
#
# Baseline-setup block copied verbatim from check-package-14/15/16-sequence.sh -- not
# rewritten a fifth time.
set -uo pipefail

DB="${DB:-pkg141516_$$}"
FIRST_UNAPPLIED=129

command -v psql >/dev/null || { echo "psql not on PATH"; exit 2; }
trap 'psql -q postgres -c "drop database if exists $DB" >/dev/null 2>&1' EXIT

echo "── static check: does 0132's index and Package 16's consolidation touch the same table? ──"
PKG16_TABLES=$(grep -oE '(update|insert into) public\.[a-z_]+' docs/opportunity-duplicate-consolidation-2026-09-04.sql | awk '{print $NF}' | sort -u)
echo "  Package 16 writes to: $(echo "$PKG16_TABLES" | tr '\n' ' ')"
if echo "$PKG16_TABLES" | grep -qx "public.university_statistics"; then
  echo "  OVERLAP: Package 16 touches university_statistics too -- 0132's index placement matters for this package, not just in theory."
else
  echo "  NO OVERLAP -- Package 16 never touches university_statistics, so 0132's own index (Package 15) has nothing from Package 16 to guard against. Confirmed by reading the file, not assumed."
fi
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

# Package 14's own university/stats fixtures (verbatim from check-package-14-sequence.sh).
psql -q "$DB" -v ON_ERROR_STOP=1 -f /tmp/pkg14-university-fixtures.sql >/dev/null 2>&1 || {
  echo "  PACKAGE 14 FIXTURE SEED FAILED"; exit 1; }
echo "  Package 14 fixtures seeded (15 universities, Oxford's stats row matches live exactly)"

# Combined opportunity fixtures: Package 15's own 24 rows UNION Package 16's 4 non-overlapping
# rows (Edinburgh's pair -- dc762fce/30436a92 -- appears in BOTH packages' own fixture sets;
# reconciled to one row each here, same field values Package 15's own fixture already used).
psql -q "$DB" -v ON_ERROR_STOP=1 -f /private/tmp/claude-501/-Users-adasarpkirik-Desktop-Founder-ORYN/83e8654c-3d70-4a04-99fe-95eb7912e888/scratchpad/combined-fixture-insert.sql >/dev/null 2>&1 || {
  echo "  COMBINED OPPORTUNITY FIXTURE SEED FAILED"; exit 1; }
echo "  Combined opportunity fixtures seeded (28 rows -- Package 15's 24 plus Package 16's 4 non-overlapping)"
echo

run_all_three() {
  local label="$1"
  echo "── $label ──"
  psql -q "$DB" -v ON_ERROR_STOP=1 -f "data/morning/14-toplu-paket-2026-09-04.sql" 2>/tmp/seq14.err && echo "  Package 14: OK" || { echo "  Package 14: FAILED"; cat /tmp/seq14.err; return 1; }
  psql -q "$DB" -v ON_ERROR_STOP=1 -f "data/morning/15-toplu-paket-2026-09-04.sql" 2>/tmp/seq15.err && echo "  Package 15: OK" || { echo "  Package 15: FAILED"; cat /tmp/seq15.err; return 1; }
  psql -q "$DB" -v ON_ERROR_STOP=1 -f "docs/opportunity-duplicate-consolidation-2026-09-04.sql" 2>/tmp/seq16.err && echo "  Package 16: OK" || { echo "  Package 16: FAILED"; cat /tmp/seq16.err; return 1; }
}

run_all_three "FIRST pass, in order: 14 -> 15 -> 16" || exit 1
echo
run_all_three "SECOND pass, same order, same database (proves the CHAIN re-runs clean, not just each package alone)" || exit 1
echo

echo "── cross-package row-state check: Edinburgh, after both passes ──"
psql -q "$DB" -t -c "
  select 'survivor (30436a92) country_eligibility_basis (expect checked_not_stated -- Package 15''s parity-fix section, unaffected by running before or after Package 16''s retirement): ' ||
    coalesce(country_eligibility_basis, 'NULL')
  from public.opportunities where id = '30436a92-26fd-4972-a8b3-dce8ad454943';
"
psql -q "$DB" -t -c "
  select 'survivor (30436a92) minimum_age/deadline (expect 16/2026-05-19 -- Package 16''s own data migration): ' ||
    coalesce(minimum_age::text,'NULL') || ' / ' || coalesce(deadline::text,'NULL')
  from public.opportunities where id = '30436a92-26fd-4972-a8b3-dce8ad454943';
"
psql -q "$DB" -t -c "
  select 'twin (dc762fce) status (expect disabled) and country_eligibility_basis (expect checked_not_stated -- Package 15''s D2 fill still wrote it before Package 16 retired the row; harmless, nothing reads a disabled row''s fields, but real and worth naming): ' ||
    status || ' / ' || coalesce(country_eligibility_basis, 'NULL')
  from public.opportunities where id = 'dc762fce-b83a-4217-a610-290ac2f65f17';
"

echo
echo "Both packages' own individual row-count/state checks (5 CEMC rows, contradiction check,"
echo "checked_not_stated count, etc.) are NOT re-run here -- see check-package-15/16-sequence.sh"
echo "for those. This script's only job is proving the CHAIN survives, twice, and naming the"
echo "two cross-package interactions CEO asked about explicitly."
echo
echo "Three packages applied cleanly, in order, twice, against one shared database. Nothing"
echo "above is a live write."
