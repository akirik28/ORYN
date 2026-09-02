-- Continues BUG-1's RLS verification package (2026-08-22). Full evidence:
-- docs/research/verification/rls-live-verification-2026-08-22.md. Follow-up to migration
-- 0062 (`is_admin`): the same live-verified pattern -- a permissive row-scoped RLS policy
-- with no column-level restriction, on a column presented as system-computed -- swept
-- across every other table sharing that shape, per ORYN-CEO's explicit column list.
--
-- MECHANISM, identical to 0062 for every guard below: RESET the protected column(s) to
-- their `OLD` value on a non-service-role UPDATE, rather than RAISE (a silent no-op can't
-- tell an attacker which column is guarded, and doesn't fail an otherwise-legitimate
-- multi-column write for one unrelated field). Every function pins `set search_path = ''`
-- and calls `pg_catalog.pg_trigger_depth()` qualified -- not exploitable today (checked
-- live: `authenticated`/`anon` both lack `CREATE` on `public`), but it costs one line and
-- Supabase's own linter flags the unqualified form. `pg_trigger_depth() <= 1` guards the
-- direct, top-level update only, matching `posts_guard_system_columns` (migration 0058).
--
-- PAIRED CODE CHANGE, in the same PR as this migration: every column guarded below has
-- exactly one legitimate writer, and every one of those writers previously ran on
-- `createClient()` (the caller's own RLS-scoped session) -- which is why the guard alone
-- is not the fix. A guard keyed on `current_user <> 'service_role'` only works when the
-- legitimate write already authenticates as `service_role`; before this PR, none of them
-- did. `lib/scoring/persist.ts`, `lib/opportunities/persist-matches.ts`, and
-- `lib/requirements/persist.ts` now write their specific computed columns via
-- `createAdminClient()` -- and ONLY those specific writes; every read in all three files
-- stays on the RLS-scoped client, unchanged, so a student reading their own data is
-- unaffected and never gains visibility into anyone else's. This is not a privilege
-- widening for the student: every value written was already fully computed, server-side,
-- before either client was touched -- moving the write only changes which connection
-- carries an already-decided value the last few lines to the database.
--
-- A REAL, NAMED LIMIT OF THIS MIGRATION, not silently left out: a `BEFORE UPDATE OF <col>`
-- guard protects an EXISTING row from being overwritten. It does nothing for a freshly
-- INSERTed row with a fabricated value from the start -- on every table below except
-- `profiles` (where exactly one row per user already exists from signup, so there is no
-- INSERT path to a duplicate), a row for a given key may not yet exist (a dimension not
-- yet scored, an opportunity not yet matched, a requirement not yet evaluated), and a
-- direct INSERT bypasses this trigger entirely. This is most acute for
-- `profile_score_snapshots`, which has NO legitimate UPDATE path at all in this codebase
-- (pure append log, written only by `.insert()`) -- for that one table specifically, this
-- migration's guard is close to inert against the actual risk (a fabricated improvement
-- history), and is included here only because ORYN-CEO's column list named it, not because
-- it closes the gap. This is the same structural shape as `ai_recommendations`, which CEO
-- explicitly deferred (docs/known-issues.md) pending a design decision on whether that
-- table's RLS-scoped INSERT path should exist at all. The same question applies to every
-- table here and is NOT decided by this migration -- tracked in `docs/known-issues.md`,
-- not fixed, so this migration's real coverage isn't overstated.

-- ---------------------------------------------------------------------------
-- profiles: is_admin (0062) plus the two computed-score cache columns, now that their
-- writer uses the service-role client (see header). Re-declares the function 0062
-- created -- CREATE OR REPLACE fully replaces the body, so this restates is_admin's own
-- reset too, not just the two new columns.
-- ---------------------------------------------------------------------------

create or replace function public.profiles_guard_protected_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_catalog.pg_trigger_depth() <= 1 and current_user <> 'service_role' then
    new.is_admin := old.is_admin;
    new.profile_strength_score := old.profile_strength_score;
    new.completeness_percent := old.completeness_percent;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_00_guard_protected_columns on public.profiles;
create trigger profiles_00_guard_protected_columns
  before update of is_admin, profile_strength_score, completeness_percent on public.profiles
  for each row execute function public.profiles_guard_protected_columns();

-- ---------------------------------------------------------------------------
-- profile_scores: every non-identity column is computed by recomputeCareerProfile() in
-- one shot -- `dimension` stays unguarded (it's the row's identity within the
-- (user_id, dimension, calculation_version) upsert key, not a fact being asserted about
-- the student), everything else guarded together since they're never written
-- independently of each other by the legitimate path.
-- ---------------------------------------------------------------------------

create or replace function public.profile_scores_guard_computed_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_catalog.pg_trigger_depth() <= 1 and current_user <> 'service_role' then
    new.score := old.score;
    new.confidence := old.confidence;
    new.calculation_version := old.calculation_version;
    new.reason_codes := old.reason_codes;
    new.calculated_at := old.calculated_at;
  end if;
  return new;
end;
$$;

drop trigger if exists profile_scores_00_guard_computed_columns on public.profile_scores;
create trigger profile_scores_00_guard_computed_columns
  before update of score, confidence, calculation_version, reason_codes, calculated_at on public.profile_scores
  for each row execute function public.profile_scores_guard_computed_columns();

-- ---------------------------------------------------------------------------
-- profile_score_snapshots: see the header's named limit -- this table has no legitimate
-- UPDATE path at all (recomputeCareerProfile() only ever INSERTs a new snapshot), so this
-- guard has essentially nothing to defend against an UPDATE-based attack. Included per
-- ORYN-CEO's explicit column list and for the same defense-in-depth reasoning as the
-- others (a future code path that DOES start updating snapshots inherits the guard for
-- free), not because it closes the real risk here, which is a forged INSERT.
-- ---------------------------------------------------------------------------

create or replace function public.profile_score_snapshots_guard_computed_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_catalog.pg_trigger_depth() <= 1 and current_user <> 'service_role' then
    new.overall_score := old.overall_score;
    new.dimension_scores := old.dimension_scores;
    new.score_version := old.score_version;
    new.snapshot_reason := old.snapshot_reason;
  end if;
  return new;
end;
$$;

drop trigger if exists profile_score_snapshots_00_guard_computed_columns on public.profile_score_snapshots;
create trigger profile_score_snapshots_00_guard_computed_columns
  before update of overall_score, dimension_scores, score_version, snapshot_reason on public.profile_score_snapshots
  for each row execute function public.profile_score_snapshots_guard_computed_columns();

-- ---------------------------------------------------------------------------
-- opportunity_matches: named directly by ORYN-CEO as the highest-priority of these four --
-- FEAT-1's concurrent eligibility-honesty work makes `eligible`/`match_score` a live
-- product-trust surface, not just an internal cache. `user_id`/`opportunity_id`/`id` stay
-- unguarded (identity/key columns); everything computeOpportunityMatch() produces is
-- guarded together.
-- ---------------------------------------------------------------------------

create or replace function public.opportunity_matches_guard_computed_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_catalog.pg_trigger_depth() <= 1 and current_user <> 'service_role' then
    new.eligible := old.eligible;
    new.eligibility_notes := old.eligibility_notes;
    new.relevance_score := old.relevance_score;
    new.profile_need_score := old.profile_need_score;
    new.match_score := old.match_score;
    new.effort_estimate := old.effort_estimate;
    new.reason_codes := old.reason_codes;
    new.calculated_at := old.calculated_at;
  end if;
  return new;
end;
$$;

drop trigger if exists opportunity_matches_00_guard_computed_columns on public.opportunity_matches;
create trigger opportunity_matches_00_guard_computed_columns
  before update of eligible, eligibility_notes, relevance_score, profile_need_score, match_score, effort_estimate, reason_codes, calculated_at on public.opportunity_matches
  for each row execute function public.opportunity_matches_guard_computed_columns();

-- ---------------------------------------------------------------------------
-- student_requirement_evaluations: `status` only, per ORYN-CEO's explicit instruction --
-- narrower than the other tables here on purpose. `reasoning`/`evaluated_at` are left
-- unguarded; only the mechanical met/not_met/needs_manual_review verdict itself is
-- protected, since that's the one non-negotiable-#13-relevant fact ("application
-- readiness is not admission probability... purely mechanical").
-- ---------------------------------------------------------------------------

create or replace function public.student_requirement_evaluations_guard_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_catalog.pg_trigger_depth() <= 1 and current_user <> 'service_role' then
    new.status := old.status;
  end if;
  return new;
end;
$$;

drop trigger if exists student_requirement_evaluations_00_guard_status on public.student_requirement_evaluations;
create trigger student_requirement_evaluations_00_guard_status
  before update of status on public.student_requirement_evaluations
  for each row execute function public.student_requirement_evaluations_guard_status();

-- ---------------------------------------------------------------------------
-- evidence_files: `verification_status` only. Checked before including it (see
-- docs/research/verification/rls-live-verification-2026-08-22.md): no code path in this
-- application updates this column today -- the only write is `verification_status:
-- "evidence_added"` at row creation (app/(app)/documents/actions.ts), a fixed literal on
-- INSERT, so no companion code change is needed here the way the other four tables
-- needed one. Not yet displayed anywhere in the UI (grepped `features`/`app`: zero
-- renders), so this closes AGENTS.md non-negotiable #4 ("uploaded evidence does not
-- equal independent verification") before the verification UI exists, per ORYN-CEO's
-- explicit override of this session's own lower-priority read on timing.
-- ---------------------------------------------------------------------------

create or replace function public.evidence_files_guard_verification_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_catalog.pg_trigger_depth() <= 1 and current_user <> 'service_role' then
    new.verification_status := old.verification_status;
  end if;
  return new;
end;
$$;

drop trigger if exists evidence_files_00_guard_verification_status on public.evidence_files;
create trigger evidence_files_00_guard_verification_status
  before update of verification_status on public.evidence_files
  for each row execute function public.evidence_files_guard_verification_status();

-- ---------------------------------------------------------------------------
-- ai_recommendations: deliberately NOT included. See docs/known-issues.md -- the only
-- writer is a single INSERT site with no UPDATE path anywhere, so a column guard
-- (UPDATE-only, like every trigger above) provides no protection at all, and the real
-- question -- should a student's RLS-scoped client be inserting advisor output in the
-- first place, or should that path move to the service-role client entirely -- is a
-- design decision with its own blast radius, not a mechanical fix. Routed to whoever owns
-- the plan pipeline; not decided or acted on here.
-- ---------------------------------------------------------------------------

-- STATUS, corrected 2026-09-02 (docs/would-a-fresh-deploy-match-live-2026-09-02.md):
-- APPLIED, in full -- all six guard functions/triggers this migration defines (profiles,
-- profile_scores, profile_score_snapshots, opportunity_matches,
-- student_requirement_evaluations, evidence_files) confirmed live against
-- `oryn-qa-scratch`, `pg_get_functiondef` compared byte-for-byte against this file, not
-- just checked by name. This file originally read "WRITTEN BUT NOT APPLIED... founder-
-- gated... do not run against a live project without explicit review. Requires migration 0062
-- (amended) applied first" -- true when written; see 0062's own corrected header for the
-- same note and the reasoning it links to. Whether the founder's own review happened
-- out-of-band before this was applied is not something a schema diff can see; only that
-- live behavior matches what this file describes. Left as a historical record of the
-- process this migration passed through, not evidence that process can be skipped.
