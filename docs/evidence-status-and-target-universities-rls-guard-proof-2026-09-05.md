# Proving the evidence_status / target_universities RLS guards — 2026-09-05

CEO's own non-negotiable requirement, same shape as `docs/advisor-session-delete-rls-proof-
2026-09-05.md`: prove under a real Postgres engine, not just a mocked application-level test,
that (1) the vulnerability the sweep found (`docs/permissive-update-policy-sweep-2026-09-04.md`
§1/§2) is real, (2) the guard trigger actually blocks it, (3) the legitimate write path (moved
to the service-role client, the paired code change both findings needed) still works, and (4)
the proof itself is capable of failing — a check that always passes is worse than no check.

Priority order per CEO: §2 (`evidence_status`) first, §1 (`target_universities`) second — both
are covered here in that order.

## Method

A scratch local Postgres 17 cluster (Homebrew, `initdb`/`pg_ctl`, torn down after — nothing here
touches the real Supabase project), with a minimal but faithful reproduction of the real schema:
`education_records` (representative of all 10 evidence-linkable tables — the real migration
attaches the identical trigger function to all ten; this proof exercises the mechanism once,
since a per-table difference here would only be "did I remember to attach the trigger," a
mechanical check, not a behavioral one) and `target_universities`, both carrying the exact,
unmodified `0014_row_level_security.sql` policy: `for all using (user_id = auth.uid()) with
check (user_id = auth.uid())`. Real `authenticated`/`service_role` Postgres roles created so
`current_user <> 'service_role'` (the guard's own condition) is checked against real role
identity, not a stand-in. One student, A — this is a same-user privilege-escalation proof
(A attacking A's own row), not a cross-user proof like the advisor-session-delete one, since the
risk here is a student fabricating their own evidence/outlook, not reading someone else's.

`psql -1` (one transaction) for the same reason as the advisor-session-delete proof: `SET LOCAL
ROLE` only survives within a single transaction, so the whole proof runs as one `psql -1`
invocation with `ON_ERROR_ROLLBACK` so a later, independent assertion can still run and report
even if an earlier one fails.

## Part 1 — evidence_status

1. As A: insert an `education_records` row, `evidence_status = 'self_reported'`.
2. **Before any guard exists**, as A: `UPDATE education_records SET evidence_status =
   'verified' WHERE id = <own row>` — the exact shape of a direct REST PATCH to the student's
   own row, bypassing the app entirely. **Result: succeeds** — confirmed the value is now
   `'verified'`. This is the vulnerability, reproduced, not asserted.
3. Apply the real guard — `achievement_guard_evidence_status()`: `if
   pg_catalog.pg_trigger_depth() <= 1 and current_user <> 'service_role' then
   new.evidence_status := old.evidence_status; end if;` (identical mechanism to migration
   0063's `evidence_files_guard_verification_status()`), attached `before update of
   evidence_status`.
4. Reset the row, **as `service_role`** — not as the Postgres superuser connecting to this
   scratch cluster, which is a distinct identity from `service_role` and is NOT exempted by the
   guard's own `current_user <> 'service_role'` check. (This caught a real bug in this proof
   script's own first draft: the reset step used the default connection role, the guard
   silently blocked *that* reset too, and the next assertion failed for the wrong reason — not
   because the guard didn't work, but because the row was never actually reset. Fixed by
   running every administrative reset through `service_role` explicitly, same identity the
   legitimate app write now uses.)
5. As A, **with the guard in place**: repeat step 2's identical attack. **Result: the UPDATE
   reports success (a row was touched — a silent reset, not an error, matching 0063's own
   documented reasoning: "a silent no-op can't tell an attacker which column is guarded"), but
   the stored value is still `'self_reported'`.** The guard held.
6. As `service_role` (the paired code change's target — `app/(app)/documents/actions.ts`'s
   `admin` client, already created in that function for the `evidence_files` insert, now reused
   for this update too): `UPDATE education_records SET evidence_status = 'evidence_added'` —
   **succeeds, value actually changes.** The legitimate path is not broken by the guard.
7. **Proving the proof can fail**: dropped the guard trigger, repeated step 2's exact attack —
   **succeeds again** (value becomes `'verified'`). The check is not vacuous; it genuinely
   distinguishes guarded from unguarded.
8. Restored the real guard, re-ran the attack once more — **blocked again**, confirmed clean.

## Part 2 — target_universities (8 admission-outlook columns)

Same structure, extended to all 8 columns at once (`academic_fit_score`, `profile_fit_score`,
`outlook`, `estimate_range_low`, `estimate_range_high`, `outlook_confidence`,
`outlook_model_version`, `outlook_calculated_at`) and a more concrete attack scenario: a student
fabricating a glowing outlook (`outlook = 'likely'`, `academic_fit_score = 100`) specifically
because this exact data is served verbatim to an active parent via `get_parent_child_
target_universities()` (migration 0116) — the sweep's own reasoning for ranking this first
despite lower "financial" stakes than `plan_tier`.

1. As A: insert a `target_universities` row, all 8 columns null (a fresh, never-refreshed row).
2. **Before any guard**, as A: set all 8 columns to fabricated values (`outlook = 'likely'`,
   `academic_fit_score = 100`, etc.) — **succeeds.** Reproduced, not asserted.
3. Reset to null (as `service_role`).
4. Apply the real guard — `target_universities_guard_computed_columns()`, identical mechanism,
   all 8 columns reset to `OLD` on any non-service-role UPDATE.
5. As A, **with the guard**: repeat the identical fabrication attempt. **Result: reports
   success, but all 8 columns are still null — nothing changed.**
6. As `service_role` (`lib/admissions/persist.ts`'s `refreshAdmissionOutlook`, paired code
   change: the final write now goes through `tryCreateAdminClient()`'s client — reused directly
   when the caller already passed an admin client, as `scanStaleOutlooks` does; created fresh
   otherwise): write a real, moderate outlook (`outlook = 'competitive'`, `academic_fit_score =
   62`) — **succeeds**, values actually change. Legitimate refresh still works.
7. **Proving the proof can fail**: dropped the guard, repeated the fabrication attempt —
   **succeeds again**, all 8 columns take the fabricated values. Not vacuous.
8. Restored the guard, re-ran once more — **blocked again**, confirmed clean.

## Result

`ALL ASSERTIONS PASSED`. Full transcript below for reproducibility. Ephemeral instance torn
down after (`pg_ctl stop`, scratch dir removed); nothing here touched the real Supabase project.

## setup.sql

```sql
create schema if not exists auth;

create or replace function auth.uid() returns uuid language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;

create role authenticated nologin;
create role service_role nologin;

create table public.profiles (
  id uuid primary key
);

-- Part 1: evidence_status (education_records is the representative table -- the real
-- migration attaches the identical trigger function to all 10 evidence-linkable tables)

create type evidence_status as enum ('self_reported', 'evidence_added', 'verified', 'verification_rejected');

create table public.education_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  school_name text,
  evidence_status evidence_status not null default 'self_reported'
);

alter table public.education_records enable row level security;
create policy "owner full access" on public.education_records for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant usage on schema public to authenticated, service_role;
grant all on public.education_records to authenticated, service_role;
grant all on public.profiles to authenticated, service_role;

-- Part 2: target_universities (8 admission-outlook columns)

create type outlook_label as enum ('extreme_reach', 'reach', 'competitive', 'strong', 'likely');
create type data_confidence as enum ('high', 'medium', 'low');
create type target_status as enum ('exploring', 'target', 'applying', 'applied', 'accepted', 'waitlisted', 'rejected', 'withdrawn');

create table public.universities (
  id uuid primary key default gen_random_uuid()
);

create table public.target_universities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  university_id uuid not null references public.universities(id) on delete cascade,
  status target_status not null default 'exploring',
  notes text,
  academic_fit_score integer,
  profile_fit_score integer,
  outlook outlook_label,
  estimate_range_low numeric(5,4),
  estimate_range_high numeric(5,4),
  outlook_confidence data_confidence,
  outlook_model_version text,
  outlook_calculated_at timestamptz
);

alter table public.target_universities enable row level security;
create policy "owner full access" on public.target_universities for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant all on public.universities to authenticated, service_role;
grant all on public.target_universities to authenticated, service_role;
```

## proof.sql

```sql
\set ON_ERROR_ROLLBACK on

insert into public.profiles (id) values ('11111111-1111-1111-1111-111111111111'); -- student A
insert into public.universities (id) values ('55555555-5555-5555-5555-555555555555');

-- ===================== PART 1 -- evidence_status =====================

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);

insert into public.education_records (id, user_id, school_name, evidence_status) values
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'A''s school', 'self_reported');

-- 1a. BEFORE any guard: A self-escalates their own row's evidence_status
update public.education_records set evidence_status = 'verified' where id = '22222222-2222-2222-2222-222222222222';

do $$
declare
  v evidence_status;
begin
  select evidence_status into v from public.education_records where id = '22222222-2222-2222-2222-222222222222';
  if v <> 'verified' then
    raise exception 'SETUP CHECK FAILED: expected the pre-guard self-escalation to succeed, got %', v;
  end if;
  raise notice 'CONFIRMED VULNERABLE (pre-guard): A set their own evidence_status to verified directly, no guard exists yet.';
end $$;

reset role;
update public.education_records set evidence_status = 'self_reported' where id = '22222222-2222-2222-2222-222222222222';

-- 1b. Apply the real guard
create or replace function public.achievement_guard_evidence_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_catalog.pg_trigger_depth() <= 1 and current_user <> 'service_role' then
    new.evidence_status := old.evidence_status;
  end if;
  return new;
end;
$$;

drop trigger if exists education_records_00_guard_evidence_status on public.education_records;
create trigger education_records_00_guard_evidence_status
  before update of evidence_status on public.education_records
  for each row execute function public.achievement_guard_evidence_status();

-- 1c. AFTER the guard: A repeats the identical self-escalation attempt
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
update public.education_records set evidence_status = 'verified' where id = '22222222-2222-2222-2222-222222222222';

do $$
declare
  v evidence_status;
begin
  select evidence_status into v from public.education_records where id = '22222222-2222-2222-2222-222222222222';
  if v <> 'self_reported' then
    raise exception 'GUARD FAILED: A''s direct UPDATE set evidence_status to % -- the guard did not reset it.', v;
  end if;
  raise notice 'CONFIRMED GUARDED: A''s self-escalation attempt reported success but the stored value is still self_reported.';
end $$;

reset role;

-- 1d. The legitimate path (service_role) still works
set local role service_role;
update public.education_records set evidence_status = 'evidence_added' where id = '22222222-2222-2222-2222-222222222222';

do $$
declare
  v evidence_status;
begin
  select evidence_status into v from public.education_records where id = '22222222-2222-2222-2222-222222222222';
  if v <> 'evidence_added' then
    raise exception 'LEGITIMATE PATH BROKEN: service_role write did not take effect. Got %.', v;
  end if;
  raise notice 'CONFIRMED LEGITIMATE PATH STILL WORKS: service_role set evidence_status to evidence_added successfully.';
end $$;

reset role;

-- 1e. Proving the proof can fail: remove the guard, repeat the attack, must succeed
drop trigger if exists education_records_00_guard_evidence_status on public.education_records;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
update public.education_records set evidence_status = 'verified' where id = '22222222-2222-2222-2222-222222222222';

do $$
declare
  v evidence_status;
begin
  select evidence_status into v from public.education_records where id = '22222222-2222-2222-2222-222222222222';
  if v <> 'verified' then
    raise exception 'PROOF-CAN-FAIL CHECK ITSELF FAILED: expected the attack to succeed with the trigger removed, got %.', v;
  end if;
  raise notice 'CONFIRMED THE PROOF CAN FAIL: with the guard trigger removed, A''s self-escalation succeeds again -- the check is not vacuous.';
end $$;

reset role;

-- 1f. Restore and re-confirm clean -- reset via service_role, NOT the default/superuser
-- connection role, which is a distinct identity the guard does not exempt.
create trigger education_records_00_guard_evidence_status
  before update of evidence_status on public.education_records
  for each row execute function public.achievement_guard_evidence_status();

set local role service_role;
update public.education_records set evidence_status = 'self_reported' where id = '22222222-2222-2222-2222-222222222222';
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
update public.education_records set evidence_status = 'verified' where id = '22222222-2222-2222-2222-222222222222';

do $$
declare
  v evidence_status;
begin
  select evidence_status into v from public.education_records where id = '22222222-2222-2222-2222-222222222222';
  if v <> 'self_reported' then
    raise exception 'RESTORE CHECK FAILED: guard is back in place but did not block the attack. Got %.', v;
  end if;
  raise notice 'PART 1 COMPLETE, RESTORED CLEAN: guard back in place, blocks the attack again.';
end $$;

reset role;

-- ===================== PART 2 -- target_universities =====================

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);

insert into public.target_universities (id, user_id, university_id, status)
values ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'target');

-- 2a. BEFORE any guard: A fabricates a glowing outlook to show a parent
update public.target_universities set
  academic_fit_score = 100, profile_fit_score = 100, outlook = 'likely',
  estimate_range_low = 0.80, estimate_range_high = 0.95, outlook_confidence = 'high',
  outlook_model_version = 'fabricated_v99', outlook_calculated_at = now()
where id = '33333333-3333-3333-3333-333333333333';

do $$
declare
  r record;
begin
  select * into r from public.target_universities where id = '33333333-3333-3333-3333-333333333333';
  if r.outlook <> 'likely' or r.academic_fit_score <> 100 then
    raise exception 'SETUP CHECK FAILED: expected the pre-guard fabrication to succeed, got outlook=%, academic_fit_score=%', r.outlook, r.academic_fit_score;
  end if;
  raise notice 'CONFIRMED VULNERABLE (pre-guard): A fabricated their own admission outlook directly, no guard exists yet.';
end $$;

reset role;
update public.target_universities set
  academic_fit_score = null, profile_fit_score = null, outlook = null,
  estimate_range_low = null, estimate_range_high = null, outlook_confidence = null,
  outlook_model_version = null, outlook_calculated_at = null
where id = '33333333-3333-3333-3333-333333333333';

-- 2b. Apply the real guard
create or replace function public.target_universities_guard_computed_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_catalog.pg_trigger_depth() <= 1 and current_user <> 'service_role' then
    new.academic_fit_score := old.academic_fit_score;
    new.profile_fit_score := old.profile_fit_score;
    new.outlook := old.outlook;
    new.estimate_range_low := old.estimate_range_low;
    new.estimate_range_high := old.estimate_range_high;
    new.outlook_confidence := old.outlook_confidence;
    new.outlook_model_version := old.outlook_model_version;
    new.outlook_calculated_at := old.outlook_calculated_at;
  end if;
  return new;
end;
$$;

drop trigger if exists target_universities_00_guard_computed_columns on public.target_universities;
create trigger target_universities_00_guard_computed_columns
  before update of academic_fit_score, profile_fit_score, outlook, estimate_range_low,
    estimate_range_high, outlook_confidence, outlook_model_version, outlook_calculated_at
  on public.target_universities
  for each row execute function public.target_universities_guard_computed_columns();

-- 2c. AFTER the guard: A repeats the identical fabrication attempt
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
update public.target_universities set
  academic_fit_score = 100, profile_fit_score = 100, outlook = 'likely',
  estimate_range_low = 0.80, estimate_range_high = 0.95, outlook_confidence = 'high',
  outlook_model_version = 'fabricated_v99', outlook_calculated_at = now()
where id = '33333333-3333-3333-3333-333333333333';

do $$
declare
  r record;
begin
  select * into r from public.target_universities where id = '33333333-3333-3333-3333-333333333333';
  if r.outlook is not null or r.academic_fit_score is not null or r.outlook_model_version is not null then
    raise exception 'GUARD FAILED: A''s direct UPDATE changed at least one protected column -- outlook=%, academic_fit_score=%, model_version=%', r.outlook, r.academic_fit_score, r.outlook_model_version;
  end if;
  raise notice 'CONFIRMED GUARDED: A''s fabrication attempt reported success but all 8 columns are still null -- nothing changed.';
end $$;

reset role;

-- 2d. The legitimate path (service_role) still works
set local role service_role;
update public.target_universities set
  academic_fit_score = 62, profile_fit_score = 58, outlook = 'competitive',
  estimate_range_low = 0.30, estimate_range_high = 0.45, outlook_confidence = 'medium',
  outlook_model_version = 'admission_model_v1', outlook_calculated_at = now()
where id = '33333333-3333-3333-3333-333333333333';

do $$
declare
  r record;
begin
  select * into r from public.target_universities where id = '33333333-3333-3333-3333-333333333333';
  if r.outlook <> 'competitive' or r.academic_fit_score <> 62 then
    raise exception 'LEGITIMATE PATH BROKEN: service_role write did not take effect. Got outlook=%, academic_fit_score=%', r.outlook, r.academic_fit_score;
  end if;
  raise notice 'CONFIRMED LEGITIMATE PATH STILL WORKS: service_role wrote a real computed outlook successfully.';
end $$;

reset role;

-- 2e. Proving the proof can fail
drop trigger if exists target_universities_00_guard_computed_columns on public.target_universities;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
update public.target_universities set
  academic_fit_score = 100, profile_fit_score = 100, outlook = 'likely',
  estimate_range_low = 0.80, estimate_range_high = 0.95, outlook_confidence = 'high',
  outlook_model_version = 'fabricated_v99', outlook_calculated_at = now()
where id = '33333333-3333-3333-3333-333333333333';

do $$
declare
  r record;
begin
  select * into r from public.target_universities where id = '33333333-3333-3333-3333-333333333333';
  if r.outlook <> 'likely' or r.academic_fit_score <> 100 then
    raise exception 'PROOF-CAN-FAIL CHECK ITSELF FAILED: expected the attack to succeed with the trigger removed, got outlook=%, academic_fit_score=%.', r.outlook, r.academic_fit_score;
  end if;
  raise notice 'CONFIRMED THE PROOF CAN FAIL: with the guard trigger removed, A''s fabrication succeeds again -- the check is not vacuous.';
end $$;

reset role;

-- 2f. Restore and re-confirm clean -- via service_role, not the default connection role
create trigger target_universities_00_guard_computed_columns
  before update of academic_fit_score, profile_fit_score, outlook, estimate_range_low,
    estimate_range_high, outlook_confidence, outlook_model_version, outlook_calculated_at
  on public.target_universities
  for each row execute function public.target_universities_guard_computed_columns();

set local role service_role;
update public.target_universities set
  academic_fit_score = null, profile_fit_score = null, outlook = null,
  estimate_range_low = null, estimate_range_high = null, outlook_confidence = null,
  outlook_model_version = null, outlook_calculated_at = null
where id = '33333333-3333-3333-3333-333333333333';
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
update public.target_universities set academic_fit_score = 100, outlook = 'likely' where id = '33333333-3333-3333-3333-333333333333';

do $$
declare
  r record;
begin
  select * into r from public.target_universities where id = '33333333-3333-3333-3333-333333333333';
  if r.outlook is not null or r.academic_fit_score is not null then
    raise exception 'RESTORE CHECK FAILED: guard is back in place but did not block the attack. outlook=%, academic_fit_score=%', r.outlook, r.academic_fit_score;
  end if;
  raise notice 'PART 2 COMPLETE, RESTORED CLEAN: guard back in place, blocks the attack again.';
end $$;

reset role;

select 'ALL ASSERTIONS PASSED' as result;
```

**How to read a re-run**: look for any `ERROR:` line, not only the final `ALL ASSERTIONS
PASSED` row — `ON_ERROR_ROLLBACK` deliberately lets later, independent assertions keep running
after an earlier one throws, so the summary line can print even when one assertion earlier in
the script failed.
