-- PENDING MIGRATION NUMBER -- CEO assigns, per standing rule (5 numbering collisions
-- yesterday). Rename this file to 01XX_target_universities_guard.sql with the real number
-- before applying. Do not renumber it yourself. Depends on nothing above; can apply before or
-- after PENDING_evidence_status_guard.sql, CEO's stated order is evidence_status first.
--
-- docs/permissive-update-policy-sweep-2026-09-04.md §1: target_universities' 8 admission-
-- outlook columns (academic_fit_score, profile_fit_score, outlook, estimate_range_low,
-- estimate_range_high, outlook_confidence, outlook_model_version, outlook_calculated_at --
-- Phase 16/17's entire admission-outlook engine output) are unguarded -- no guard trigger
-- exists on this table at all (only target_universities_set_updated_at). The table's own
-- comment (migration 0007) already says it: "Cached admission_model_v1 output ... a cache,
-- never hand-edited" -- today, nothing stops a direct REST PATCH on the owner's own row from
-- hand-editing it anyway.
--
-- WHY THIS RANKS ABOVE plan_tier's own lower "financial" stakes: this exact data is served
-- verbatim to an ACTIVE PARENT via get_parent_child_target_universities() (migration 0116) --
-- academic_fit_score, profile_fit_score, outlook, both estimate-range bounds, and
-- outlook_confidence all pass through unchanged. A student has a concrete, plausible
-- incentive to fabricate their own outlook specifically to show a parent a falsely optimistic
-- picture -- not just a theoretical integrity concern.
--
-- MECHANISM: identical to every guard since 0062/0063/0121 -- reset to OLD on a
-- non-service-role UPDATE, pg_trigger_depth() <= 1 (direct top-level update only),
-- search_path pinned empty.
--
-- PAIRED CODE CHANGE, in the same PR: lib/admissions/persist.ts's refreshAdmissionOutlook is
-- the ONLY writer of these 8 columns. Its own doc comment already named the nuance this
-- migration depends on: every existing request-scoped caller (the save action, the
-- university detail page) used the caller's own createClient() session for this write, same
-- as is_admin/profile_scores were before 0062/0063 -- a guard alone, with no code change,
-- would silently break the real feature (the detail page's own refresh-on-view call runs as
-- the student, not service-role). The final write now goes through tryCreateAdminClient()'s
-- client -- reused directly when the caller already passed one (scanStaleOutlooks, the
-- background sweep, already did), created fresh otherwise. Every READ in that function is
-- unchanged -- this does not widen what a student can see, since `outlook` was already fully
-- computed, server-side, before this line, exactly the same reasoning 0063's own header gives
-- for profile_scores/opportunity_matches.
--
-- PROOF: docs/evidence-status-and-target-universities-rls-guard-proof-2026-09-05.md -- real
-- local Postgres 17, a same-user fabrication attempt (the concrete scenario above: outlook =
-- 'likely', academic_fit_score = 100) reproduced, guard confirmed blocking it, the
-- service_role path confirmed still producing a real refreshed outlook, and the proof itself
-- confirmed capable of failing (dropped the trigger, re-ran the attack, it succeeded).

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

-- STATUS: WRITTEN BUT NOT APPLIED. Prepared for CEO/founder to apply after assigning the
-- real migration number and reviewing. Do not run against the live project from here.
