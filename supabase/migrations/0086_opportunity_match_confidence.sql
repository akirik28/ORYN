-- Phase 12's spec lists seven match dimensions: eligibility, relevance, profile need,
-- prestige/value proxy, deadline urgency, effort, confidence. Relevance and profile need
-- were already real (lib/opportunities/matching.ts); this adds the fourth, confidence --
-- see the paired code change (lib/opportunities/persist-matches.ts) for the reasoning
-- and CEO's explicit instruction not to invent a second confidence vocabulary.
--
-- `match_confidence` stores one of `lib/scoring/signal.ts`'s own five `EvidenceState`
-- values verbatim -- reused, not reimplemented, via that file's exported
-- `evidenceStateFor()` -- or null. Null is the honest answer for a match that isn't
-- built on a specific profile-dimension claim (a relevance/interest/proximity-only
-- match): confidence only qualifies a claim Oryn is actually making, and "shares your
-- interest in X" is either true or it isn't -- there's no evidence-depth spectrum to
-- report on it the way there is for "this addresses your gap in research."
--
-- The prior scan (docs/performance.md-adjacent, opportunity-match audit) found the other
-- two named-but-unbuilt dimensions -- prestige, effort -- have no honest basis today:
-- selectivity_tier already serves prestige's role (evidence-backed, researcher-asserted,
-- already displayed) and a numeric prestige score would be false precision on top of an
-- existing honest field; application_requirements (the one plausible effort signal) is
-- unreliably populated -- confirmed live against two real, verified "highly_selective"
-- programs (Yale Young Global Scholars, Wharton M&TSI) both showing zero requirements
-- only because the field was never researched for them, not because there genuinely are
-- none. Neither gets a column here; see the code-side comment for the full account.
--
-- Same guard-trigger discipline as migration 0063 (opportunity_matches' other computed
-- columns): CREATE OR REPLACE restates the full protected-column list rather than only
-- adding the new one, since a bare trigger recreation would otherwise silently narrow
-- what's guarded if this file were ever read in isolation.

alter table public.opportunity_matches
  add column if not exists match_confidence text
    check (match_confidence is null or match_confidence in ('not_assessed', 'limited_evidence', 'emerging', 'developing', 'strong'));

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

drop trigger if exists opportunity_matches_00_guard_computed_columns on public.opportunity_matches;
create trigger opportunity_matches_00_guard_computed_columns
  before update of eligible, eligibility_notes, relevance_score, profile_need_score, match_score, effort_estimate, reason_codes, calculated_at, match_confidence on public.opportunity_matches
  for each row execute function public.opportunity_matches_guard_computed_columns();
