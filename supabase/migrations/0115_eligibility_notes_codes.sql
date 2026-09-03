-- Converts opportunity_matches.eligibility_notes from rendered prose (text) to codes+params
-- (jsonb), matching reason_codes' own established shape on this same table. The bug this
-- fixes: the prose was rendered once, in whatever locale was active at compute time, then
-- stored verbatim -- a Turkish-preference student could read an English sentence (or vice
-- versa) on a row nobody had recomputed since a different locale last triggered a refresh.
-- Live and confirmed, not hypothetical: 69 English rows against Turkish-preference students,
-- all in one QA account. See docs/eligibility-notes-codes-2026-09-03.md for the full account,
-- and lib/opportunities/matching.ts's EligibilityNote/renderEligibilityNotes for the new
-- shape and where it renders back to a display sentence.
--
-- Existing values are prose and cannot be parsed back into codes -- there is no reliable way
-- to recover which of computeEligibility's ~16 findings (several with parameters: a country
-- name, a citizenship list, a grade) produced a given sentence, especially once free-text
-- opportunity restriction prose is interpolated into it. Rule 4 (AGENTS.md) is explicit that
-- production functionality must never silently return fabricated data -- inventing a
-- best-guess code from old prose would be exactly that. Every existing row's eligibility_notes
-- is therefore discarded to '[]'::jsonb (the same "no notes currently known" value a fresh,
-- unresearched row already gets), not reconstructed. This is honest, not a data loss in any
-- claim-bearing sense: eligibility_notes has always been a snapshot recomputed on essentially
-- every real page view (refreshOpportunityMatches runs on every /opportunities,
-- /opportunities/[id], and dashboard render) -- the next such view recomputes it correctly, in
-- codes, for that student. No backfill script is run by this migration; recompute-on-read is
-- the existing, already-relied-upon mechanism, not a new one introduced to cover this gap.
--
-- Same guard-trigger discipline as migrations 0063/0086 (this table's other computed
-- columns): the trigger function itself is column-type-agnostic (`new.x := old.x` reassignment
-- works for any type), so it needs no change here -- only restated via CREATE OR REPLACE so a
-- reader of this file in isolation sees the full protected-column list, not a narrowed one.

-- MUST precede the ALTER below. Postgres tracks a catalog dependency between a trigger's
-- `before update OF <column list>` and each named column, and refuses ALTER COLUMN TYPE while
-- any trigger still depends on that column -- regardless of whether the trigger's own body
-- cares about the type. The comment above is right that the FUNCTION is type-agnostic; it is
-- the trigger DEFINITION that blocks this, which is a different object. Verified against a
-- real Postgres: with the drop after the ALTER, this file fails outright with
-- "cannot alter type of a column used in a trigger definition". The CREATE TRIGGER at the
-- bottom re-resolves the column by name afterwards, so it is unaffected by the type change.
drop trigger if exists opportunity_matches_00_guard_computed_columns on public.opportunity_matches;

alter table public.opportunity_matches
  alter column eligibility_notes type jsonb using '[]'::jsonb,
  alter column eligibility_notes set default '[]'::jsonb,
  alter column eligibility_notes set not null;

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
    new.match_confidence := old.match_confidence;
  end if;
  return new;
end;
$$;

create trigger opportunity_matches_00_guard_computed_columns
  before update of eligible, eligibility_notes, relevance_score, profile_need_score, match_score, effort_estimate, reason_codes, calculated_at, match_confidence on public.opportunity_matches
  for each row execute function public.opportunity_matches_guard_computed_columns();
