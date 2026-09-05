-- Migration number 0137, assigned by CEO (2026-09-05) after checking every remote branch.
-- Applies after 0136 (target_universities), per CEO's stated order: target_universities
-- (misleads a parent) before evidence_status (self-verification) before the sweep's
-- remaining lower-stakes findings.
--
-- docs/permissive-update-policy-sweep-2026-09-04.md §2: evidence_status is unguarded on 10
-- achievement tables -- the exact column evidence_files_guard_verification_status()
-- (migration 0063) already protects on the ONE table that trigger covers. AGENTS.md §11,
-- non-negotiable #4: "Uploaded evidence does not equal independent verification." Today, a
-- direct REST PATCH to any of these ten tables, on the owner's own row, with
-- {"evidence_status": "verified"}, is not stopped by RLS, GRANT, or any trigger -- a student
-- can mark their own achievement independently verified.
--
-- MECHANISM, identical to 0063/0121: reset the protected column to its OLD value on a
-- non-service-role UPDATE (never raise -- a silent no-op can't tell an attacker which column
-- is guarded, and doesn't fail an otherwise-legitimate multi-column write for one unrelated
-- field). `pg_trigger_depth() <= 1` guards the direct, top-level update only, matching every
-- prior guard in this codebase. `set search_path = ''` + schema-qualified
-- `pg_catalog.pg_trigger_depth()`, same as every guard since 0062/0063.
--
-- ONE shared function, not ten -- the column name (`evidence_status`) is identical across
-- every table it guards, so a single trigger function attached to ten different tables is
-- exactly as correct as ten near-duplicate functions and adds no complexity 0063's own
-- per-table convention was solving for (that convention exists because those functions guard
-- DIFFERENT column sets per table; here every table needs the identical single-column reset).
--
-- PAIRED CODE CHANGE, in the same PR: the one legitimate writer,
-- app/(app)/documents/actions.ts's uploadEvidence, always wrote the fixed literal
-- "evidence_added" via the caller's own createClient() (RLS-scoped) session -- same nuance
-- 0063's own header names for is_admin/profile_strength_score/etc: the guard alone would
-- silently break the real feature too, since the app's own legitimate write runs as the
-- student, not service-role. That write now goes through the `admin` client already created
-- in the same function for the evidence_files insert (migration 0065).
--
-- ON RLS-BYPASS OWNERSHIP (CEO's own catch, closed the same day for target_universities/0136
-- and confirmed already correct here): moving a write to the admin client removes RLS's
-- ownership guarantee for that write entirely -- unlike the original target_universities
-- write, THIS write was never scoped by id alone: `.update({ evidence_status: "evidence_added"
-- }).eq("id", linkedId).eq("user_id", userId)` already carries its own `user_id` filter,
-- independent of the ownership check performed just above it in the same function. Confirmed,
-- not assumed -- see the proof doc's Part 3, which reproduces this exact WHERE-clause shape
-- under service_role directly.
--
-- A REAL, NAMED LIMIT, not silently left out: this is a `BEFORE UPDATE OF evidence_status`
-- guard -- it protects an EXISTING row from being overwritten. A freshly INSERTed row with a
-- fabricated evidence_status from the start is not covered (same limit 0063's own header
-- names for every table there). Checked: the only INSERT path for any of these ten tables
-- (Server Actions backed by ActivitySchema and its nine siblings, lib/validation/
-- achievements.ts) never accepts evidence_status as a client-suppliable field -- Zod strips it
-- before .insert() is ever reached -- so this is defense-in-depth against the app's own
-- accidental exposure, not the sole mechanism; a determined direct-REST insert against the
-- owner's own row could still set an arbitrary evidence_status at creation time. That is the
-- same class of gap 0063's header names as unresolved for profile_score_snapshots and not
-- fixed here either -- named so it isn't silently assumed closed.
--
-- NOTE on `sports_experiences` specifically: this table is NOT in
-- lib/validation/evidence.ts's EVIDENCE_LINKABLE_TABLES allow-list, so the app has no
-- legitimate write path to its evidence_status at all today (same shape as evidence_files
-- itself per 0063's own note) -- no paired code change needed for this one table, guarded
-- here anyway for the same defense-in-depth reasoning 0063 applied to
-- profile_score_snapshots.
--
-- PROOF: docs/evidence-status-and-target-universities-rls-guard-proof-2026-09-05.md -- real
-- local Postgres 17. Part 1: same-user privilege-escalation attempt reproduced, guard
-- confirmed blocking it, service_role path confirmed still working, and the proof itself
-- confirmed capable of failing (dropped the trigger, re-ran the attack, it succeeded). Part 3:
-- the id+user_id WHERE-clause shape confirmed matching zero rows when scoped to a different,
-- real student's id under service_role.

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

drop trigger if exists test_scores_00_guard_evidence_status on public.test_scores;
create trigger test_scores_00_guard_evidence_status
  before update of evidence_status on public.test_scores
  for each row execute function public.achievement_guard_evidence_status();

drop trigger if exists activities_00_guard_evidence_status on public.activities;
create trigger activities_00_guard_evidence_status
  before update of evidence_status on public.activities
  for each row execute function public.achievement_guard_evidence_status();

drop trigger if exists awards_00_guard_evidence_status on public.awards;
create trigger awards_00_guard_evidence_status
  before update of evidence_status on public.awards
  for each row execute function public.achievement_guard_evidence_status();

drop trigger if exists certifications_00_guard_evidence_status on public.certifications;
create trigger certifications_00_guard_evidence_status
  before update of evidence_status on public.certifications
  for each row execute function public.achievement_guard_evidence_status();

drop trigger if exists projects_00_guard_evidence_status on public.projects;
create trigger projects_00_guard_evidence_status
  before update of evidence_status on public.projects
  for each row execute function public.achievement_guard_evidence_status();

drop trigger if exists research_experiences_00_guard_evidence_status on public.research_experiences;
create trigger research_experiences_00_guard_evidence_status
  before update of evidence_status on public.research_experiences
  for each row execute function public.achievement_guard_evidence_status();

drop trigger if exists sports_experiences_00_guard_evidence_status on public.sports_experiences;
create trigger sports_experiences_00_guard_evidence_status
  before update of evidence_status on public.sports_experiences
  for each row execute function public.achievement_guard_evidence_status();

drop trigger if exists volunteering_experiences_00_guard_evidence_status on public.volunteering_experiences;
create trigger volunteering_experiences_00_guard_evidence_status
  before update of evidence_status on public.volunteering_experiences
  for each row execute function public.achievement_guard_evidence_status();

drop trigger if exists work_experiences_00_guard_evidence_status on public.work_experiences;
create trigger work_experiences_00_guard_evidence_status
  before update of evidence_status on public.work_experiences
  for each row execute function public.achievement_guard_evidence_status();

-- STATUS: WRITTEN BUT NOT APPLIED. Prepared for CEO/founder to apply. Do not run against the
-- live project from here.
