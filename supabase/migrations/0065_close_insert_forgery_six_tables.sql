-- Closes the INSERT-forgery gap left open by migration 0063: a BEFORE UPDATE guard
-- trigger protects an EXISTING row from being overwritten, but does nothing for a
-- freshly INSERTed row carrying a fabricated value from the start, since there is no
-- prior row for the trigger's OF clause to intercept. Full design reasoning:
-- docs/handoffs/insert-forgery-design-proposal-2026-08-22.md (Option A, approved by
-- ORYN-CEO, 2026-08-22). Continues
-- docs/research/verification/insert-forgery-inventory-2026-08-22.md, which mapped this
-- gap across six tables and left it open pending this decision.
--
-- SIX TABLES, one shared root cause: profile_scores, profile_score_snapshots,
-- opportunity_matches, student_requirement_evaluations, evidence_files, and
-- ai_recommendations each carry a single "owner full access" policy (re-verified
-- against the migration each table's policy actually comes from, not assumed uniform:
-- profile_scores/profile_score_snapshots from 0017, opportunity_matches/evidence_files/
-- ai_recommendations from 0014's shared owner_tables loop, student_requirement_evaluations
-- from its own dedicated statement in 0020 -- three different origins, the identical
-- name and shape in every one: `for all using (user_id = auth.uid()) with check
-- (user_id = auth.uid())`). One policy bundles SELECT/INSERT/UPDATE/DELETE together.
-- The WITH CHECK pins ownership on INSERT but constrains no other column -- a
-- student's own RLS-scoped session can insert a brand-new row for any key the real
-- engine hasn't computed yet, with any value in every other column.
--
-- MECHANISM -- read this before "simplifying" it: the fix below is NOT a new policy
-- added on top of the existing one (e.g. `create policy "service role insert" ... for
-- insert to service_role with check (true)`, left alongside "owner full access").
-- Postgres evaluates multiple PERMISSIVE policies for the same command with OR, not
-- AND -- layering a service-role-only INSERT policy next to the existing owner policy
-- would add a second way to satisfy the insert check without removing the first. The
-- student's own INSERT path would still be independently permitted by the policy
-- already there, unchanged, behind a migration that reads as though it closed
-- something. This is the exact defect shape as the message_reports gap this same
-- package fixed a few hours earlier (migration 0064) -- a check that appears to
-- constrain while an alternative branch stays wide open. The fix has to EDIT the
-- existing policy, not supplement it: each table's single `for all` policy is dropped
-- and replaced with separate SELECT/UPDATE/DELETE policies carrying the identical
-- `user_id = auth.uid()` condition the original policy already enforced for those
-- three operations, and NO INSERT policy at all. RLS defaults to deny -- a role with
-- no permissive policy for an operation cannot perform it, regardless of the
-- table-level GRANT `authenticated` otherwise holds from this project's standing
-- default ACL. `service_role` bypasses RLS entirely regardless of any policy on the
-- table, so the admin client's writes are completely unaffected by any of this. This
-- is not a new pattern invented for this migration -- it is the exact shape `profiles`
-- already uses today (no INSERT policy exists on `profiles` at all; a row is created
-- only by the `handle_new_user()` trigger firing on signup), extended here to six more
-- tables rather than reinvented.
--
-- SELECT/UPDATE/DELETE are unchanged in substance for all six tables -- same
-- condition, same rows visible/updatable/deletable as before this migration. Only
-- INSERT capability for non-service-role sessions is removed. Migration 0063's
-- column-level UPDATE guard triggers are untouched and continue to apply on top of
-- this, on the tables that have them.
--
-- PAIRED CODE CHANGE, in the same PR as this migration, same discipline as 0063: four
-- of these six tables (profile_scores, profile_score_snapshots, opportunity_matches,
-- student_requirement_evaluations) already write through the service-role client as
-- of 0063 -- the RLS change costs them nothing at the code level. The other two --
-- evidence_files (app/(app)/documents/actions.ts's uploadEvidence) and
-- ai_recommendations (lib/plan/persist.ts's getOrCreateWeeklyPlan) -- still wrote
-- their one INSERT through the caller's own RLS-scoped client before this PR; both now
-- use the admin client for that one write, and nothing else in either file changes --
-- every read, and every other write (evidence deletion, the weekly_plans/weekly_actions
-- writes) stays on the RLS-scoped client, unchanged. Landing the RLS restriction
-- without this code change, or in the wrong order, breaks evidence upload and the
-- weekly-plan "avoid for now" recommendation outright -- the same regression shape
-- 0063 itself produced on its UPDATE paths, caught by ORYN-CEO before it reached a
-- real user. Not repeating it here, on the INSERT side, is the entire point of
-- landing both halves in one PR rather than sequencing them.
--
-- ai_recommendations was carried in 0063's own comment and docs/known-issues.md as a
-- separate, undecided design question ("should a student's RLS-scoped client be
-- inserting advisor output at all"). The design proposal linked above traces its
-- writer and answers that question rather than deferring it again: same shape as
-- evidence_files -- a trusted server-derived user_id at every call site, content that
-- is AI-generated or hardcoded, never caller input, and no legitimate student-authored
-- use of this table today or in the spec. Folded into this migration on that basis
-- rather than left open a third time.
--
-- WHAT THIS DOES NOT CLOSE, named rather than left implicit: rows already inserted
-- before this migration is applied are not retroactively validated -- this closes the
-- write path going forward, it is not a data cleanup, and no live adversarial testing
-- against a real project was performed for these six tables as part of this proposal.
-- See the design proposal's "What stays open regardless" section, including the
-- cross-user read of profile_scores in lib/benchmarking/cohort.ts (a forged row,
-- while it exists, skews the cohort percentile shown to OTHER students, not only the
-- forger's own dashboard) and the fact that a self-correcting-via-next-recompute
-- argument does not hold for a forged calculation_version, which no legitimate upsert
-- will ever target.
--
-- WRITTEN BUT NOT APPLIED, per BUG-1's standing package constraint and because this
-- is a security-critical, founder-gated change -- the sixth in this package's queue
-- alongside 0060-0064, presented as one coherent decision per ORYN-CEO's explicit
-- preference rather than a further trickle of individually-gated migrations. Do not
-- run against a live project without explicit review.

-- ---------------------------------------------------------------------------
-- profile_scores
-- ---------------------------------------------------------------------------
drop policy if exists "owner full access" on public.profile_scores;
create policy "select own profile_scores" on public.profile_scores for select using (user_id = auth.uid());
create policy "update own profile_scores" on public.profile_scores for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own profile_scores" on public.profile_scores for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- profile_score_snapshots
-- ---------------------------------------------------------------------------
drop policy if exists "owner full access" on public.profile_score_snapshots;
create policy "select own profile_score_snapshots" on public.profile_score_snapshots for select using (user_id = auth.uid());
create policy "update own profile_score_snapshots" on public.profile_score_snapshots for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own profile_score_snapshots" on public.profile_score_snapshots for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- opportunity_matches
-- ---------------------------------------------------------------------------
drop policy if exists "owner full access" on public.opportunity_matches;
create policy "select own opportunity_matches" on public.opportunity_matches for select using (user_id = auth.uid());
create policy "update own opportunity_matches" on public.opportunity_matches for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own opportunity_matches" on public.opportunity_matches for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- student_requirement_evaluations
-- ---------------------------------------------------------------------------
drop policy if exists "owner full access" on public.student_requirement_evaluations;
create policy "select own student_requirement_evaluations" on public.student_requirement_evaluations for select using (user_id = auth.uid());
create policy "update own student_requirement_evaluations" on public.student_requirement_evaluations for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own student_requirement_evaluations" on public.student_requirement_evaluations for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- evidence_files -- paired code change: app/(app)/documents/actions.ts's
-- uploadEvidence now inserts through the admin client (see header).
-- ---------------------------------------------------------------------------
drop policy if exists "owner full access" on public.evidence_files;
create policy "select own evidence_files" on public.evidence_files for select using (user_id = auth.uid());
create policy "update own evidence_files" on public.evidence_files for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own evidence_files" on public.evidence_files for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- ai_recommendations -- paired code change: lib/plan/persist.ts's
-- getOrCreateWeeklyPlan now inserts through the admin client (see header). Folded in
-- from its prior "separate design question" status -- see header.
-- ---------------------------------------------------------------------------
drop policy if exists "owner full access" on public.ai_recommendations;
create policy "select own ai_recommendations" on public.ai_recommendations for select using (user_id = auth.uid());
create policy "update own ai_recommendations" on public.ai_recommendations for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own ai_recommendations" on public.ai_recommendations for delete using (user_id = auth.uid());
