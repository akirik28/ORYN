-- Security Gate 1 (2026-08-29 audit). Closes a self-forgery gap on the eight achievement
-- tables' own `evidence_status` column — distinct from `evidence_files.verification_status`,
-- which 0063 (UPDATE guard) and 0065 (INSERT-policy split) already protect. Found by
-- source-code analysis during this audit, not covered by any of 0061-0065. Full finding:
-- the 2026-08-29 engineering-readiness audit ("§3.9 Documents and evidence states" / "§2.1
-- cross-cutting"). No live exploit against `oryn-qa-scratch` was attempted (out of scope for
-- a read-only audit); written from the same reasoning 0063/0065 already established for the
-- sibling column on `evidence_files`, applied here to the achievement tables themselves.
--
-- THE TABLES, verified directly against `types/database.ts` and cross-checked against
-- `supabase/migrations/0004_achievements.sql`, `0005_evidence_and_goals.sql`, and
-- `0026_sports.sql` (the only migrations that ever add or reference this column) rather than
-- assumed from an earlier audit pass: `activities`, `awards`, `certifications`, `projects`,
-- `research_experiences`, `volunteering_experiences`, `work_experiences`,
-- `sports_experiences`. **`education_records` does NOT carry this column** — checked
-- directly against its full field list in `types/database.ts`; a prior audit note claiming
-- otherwise was incorrect and is superseded by this migration's own verification. No
-- verification-actor, timestamp, or rejection-reason column exists on any of the eight
-- tables beyond the single `evidence_status` enum itself (`self_reported` | `evidence_added`
-- | `verified` | `verification_rejected`, same `EvidenceStatus` type `evidence_files` uses) —
-- confirmed by reading every field of every one of the eight interfaces in
-- `types/database.ts`, not inferred from the column's existence alone.
--
-- THE GAP: all eight tables sit in migration 0014's `owner_tables` RLS loop (or, for
-- `sports_experiences`, 0026's identical own-copy of the same policy shape) — `for all using
-- (user_id = auth.uid()) with check (user_id = auth.uid())`. That policy is exactly right for
-- every other column on these tables (title, organization, description, dates, story_notes,
-- etc. are all genuinely student-authored and must stay freely editable — this migration does
-- not touch that), but constrains nothing about `evidence_status` specifically. Every column
-- default is `'self_reported'`; the only application code that ever sets it to anything else
-- is `app/(app)/documents/actions.ts::uploadEvidence`, which — checked directly, not assumed
-- — updates the linked achievement row's `evidence_status` to `'evidence_added'` via
-- `createClient()` (the caller's own RLS-scoped session), not the admin client it already
-- uses one line above for the `evidence_files` insert itself. So today, both an INSERT with an
-- explicit `evidence_status: 'verified'` payload and a direct UPDATE of an existing row's
-- `evidence_status` succeed unrestricted for a caller bypassing the Next.js app, defeating
-- AGENTS.md's Non-Negotiable #4 ("uploaded evidence does not equal independent verification")
-- at the one place a student could otherwise never reach it through the product's own UI (no
-- code path in this repo ever renders a control that sets this field to `verified` or
-- `verification_rejected` — the gap is a direct-client bypass of that absence, not a feature
-- of the app itself).
--
-- MECHANISM: identical shape and reasoning to 0066 (`target_universities`), for the identical
-- reason — these tables have extensive legitimate student INSERT/UPDATE traffic on their
-- other columns, so 0065's "remove the INSERT policy outright" approach does not apply here;
-- only one specific column needs guarding on both INSERT and UPDATE, so one combined `BEFORE
-- INSERT OR UPDATE OF evidence_status` trigger per table does it, forcing the column to
-- `'self_reported'` on INSERT (matching the column's own natural default — harmless to every
-- real `create*` Server Action, which never sets this field explicitly, and confirmed by
-- reading each of the twelve Zod schemas in `lib/validation/achievements.ts`: none of them
-- accept `evidence_status` as client input) and resetting to `OLD` on UPDATE (matching
-- 0062/0063 exactly). One function, `public.guard_achievement_evidence_status()`, is shared
-- across all eight tables rather than duplicated per-table: the guarded column has the
-- identical name and type on every one of them, so a single function body (`new.evidence_status
-- := ...`) is valid and correct when attached via eight separate `CREATE TRIGGER` statements —
-- this departs from 0063's one-function-per-table structure only because 0063's tables each
-- guarded a different column set, which this migration's do not. `set search_path = ''`,
-- qualified `pg_catalog.pg_trigger_depth() <= 1`, and `current_user <> 'service_role'` are
-- unchanged from every prior guard function in this package, for the same reasons.
--
-- PAIRED CODE CHANGE, in the same commit as this migration, same discipline as 0063/0065:
-- `app/(app)/documents/actions.ts::uploadEvidence`'s one `.update({ evidence_status:
-- "evidence_added" })` call against the linked achievement table now goes through
-- `tryCreateAdminClient()` (the same admin client the function already holds for the
-- `evidence_files` insert one line above — no new client is created) instead of the caller's
-- `createClient()`. The ownership check immediately before it (does `linked_id` in
-- `linked_table` actually belong to this user) stays on the RLS-scoped client, unchanged, and
-- still runs before the admin-client write — an attacker cannot use this path to mark evidence
-- against a row they do not own, since that check is what decides whether the update is even
-- attempted, not the RLS policy on the achievement table. Every other write in this file
-- (`deleteEvidence`) is untouched. Landing this migration without this code change would
-- silently freeze every achievement's `evidence_status` at `'self_reported'` forever, even
-- after a real, legitimate evidence upload — the same failure class 0066 avoids for
-- `target_universities`, applied to a second, independently-discovered instance of it.
--
-- WHAT THIS DOES NOT CLOSE, named rather than left implicit: this migration does not create
-- any new way for `evidence_status` to reach `'verified'` or `'verification_rejected'` — no
-- such workflow exists anywhere in this codebase today (see the audit's own finding on this),
-- and building one is a product decision outside a security-hardening migration's scope. It
-- also does not address the separate, already-known gap that `evidence_status` is never
-- rendered anywhere a student can see it — a UX gap, not a security one, out of scope here.
--
-- LOCAL-ONLY, PART OF SECURITY GATE 1'S REVIEWABLE PACKAGE: not applied to any remote
-- project by this change. Requires Codex's review and separate explicit authorization before
-- `supabase db push` against `oryn-qa-scratch` or any other environment.

create or replace function public.guard_achievement_evidence_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_catalog.pg_trigger_depth() <= 1 and current_user <> 'service_role' then
    if TG_OP = 'UPDATE' then
      new.evidence_status := old.evidence_status;
    else
      new.evidence_status := 'self_reported';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists activities_00_guard_evidence_status on public.activities;
create trigger activities_00_guard_evidence_status
  before insert or update of evidence_status on public.activities
  for each row execute function public.guard_achievement_evidence_status();

drop trigger if exists awards_00_guard_evidence_status on public.awards;
create trigger awards_00_guard_evidence_status
  before insert or update of evidence_status on public.awards
  for each row execute function public.guard_achievement_evidence_status();

drop trigger if exists certifications_00_guard_evidence_status on public.certifications;
create trigger certifications_00_guard_evidence_status
  before insert or update of evidence_status on public.certifications
  for each row execute function public.guard_achievement_evidence_status();

drop trigger if exists projects_00_guard_evidence_status on public.projects;
create trigger projects_00_guard_evidence_status
  before insert or update of evidence_status on public.projects
  for each row execute function public.guard_achievement_evidence_status();

drop trigger if exists research_experiences_00_guard_evidence_status on public.research_experiences;
create trigger research_experiences_00_guard_evidence_status
  before insert or update of evidence_status on public.research_experiences
  for each row execute function public.guard_achievement_evidence_status();

drop trigger if exists volunteering_experiences_00_guard_evidence_status on public.volunteering_experiences;
create trigger volunteering_experiences_00_guard_evidence_status
  before insert or update of evidence_status on public.volunteering_experiences
  for each row execute function public.guard_achievement_evidence_status();

drop trigger if exists work_experiences_00_guard_evidence_status on public.work_experiences;
create trigger work_experiences_00_guard_evidence_status
  before insert or update of evidence_status on public.work_experiences
  for each row execute function public.guard_achievement_evidence_status();

drop trigger if exists sports_experiences_00_guard_evidence_status on public.sports_experiences;
create trigger sports_experiences_00_guard_evidence_status
  before insert or update of evidence_status on public.sports_experiences
  for each row execute function public.guard_achievement_evidence_status();
