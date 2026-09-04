-- 0126: opportunities.age_eligibility_confirmed_open / grade_eligibility_confirmed_open --
-- the same structured "research confirmed no gate here" home 0060 built for country/
-- citizenship eligibility, extended to the two other fields that carry the identical
-- absence-as-known-value shape: an empty age bound or an empty eligible_grades list has
-- always meant BOTH "confirmed no restriction" and "never researched" with no way to tell
-- them apart, and until now only country had a way out of that ambiguity.
--
-- Named and traced twice already, not discovered here:
-- docs/absence-as-known-value-inventory-2026-09-03.md (line ~21-24) documents the age/grade
-- half of this exact gap directly; docs/eligibility-boolean-refactor-notes-2026-09-03.md is
-- the deeper design note on the same shape, written up per CEO's own instruction rather than
-- fixed at the time. This migration is the narrow, additive piece CEO signed off on from
-- that backlog -- NOT the wider `eligible: boolean` -> three-state redesign that doc
-- explicitly reserves for founder sign-off; nothing here touches opportunity_matches.eligible
-- or any ranking/filtering call site.
--
-- *** NOT YET APPLIED *** -- prepared on oryn/d3-age-grade-eligibility-confirmed-open-
-- 2026-09-04, application is a separate explicit step (same posture 0060's own header
-- documents for itself).
--
-- Two independent flags, not one combined "eligibility_confirmed_open" -- an opportunity can
-- be genuinely gated by grade with no age floor/ceiling at all (Wharton Global Youth's Future
-- of the Business World: "grades 9-12," no stated age limit) or genuinely gated by age with
-- no grade requirement (George Mason's ASSIP: "15 years or older... no maximum age," no
-- grade language at all) -- both real, confirmed-during-D2 research examples, not
-- hypothetical. Collapsing them into one flag would force one to borrow the other's meaning.
--
-- Shape mirrors 0060 exactly, per CEO's explicit instruction not to invent a new pattern:
-- boolean not null default false (the honest default -- most rows are simply unresearched,
-- never "confirmed unrestricted"), plus a CHECK constraint preventing a row from
-- simultaneously claiming "confirmed no restriction" and carrying the structured bound that
-- would contradict it.

alter table public.opportunities
  add column age_eligibility_confirmed_open boolean not null default false,
  add column grade_eligibility_confirmed_open boolean not null default false;

comment on column public.opportunities.age_eligibility_confirmed_open is
  'Research-confirmed "no age floor or ceiling — genuinely open at any age," set only from an official-source statement. false = not confirmed (the honest default; most rows are simply unresearched), never "restricted." An actual age bound populates minimum_age/maximum_age instead — the check below keeps the two claims from ever being asserted together.';

comment on column public.opportunities.grade_eligibility_confirmed_open is
  'Research-confirmed "no grade-level restriction — genuinely open to any grade," set only from an official-source statement. false = not confirmed (the honest default; most rows are simply unresearched), never "restricted." A real grade restriction populates eligible_grades instead — the check below keeps the two claims from ever being asserted together.';

alter table public.opportunities
  add constraint opportunities_age_confirmed_open_no_structured_bound
  check (
    not (
      age_eligibility_confirmed_open
      and (minimum_age is not null or maximum_age is not null)
    )
  );

alter table public.opportunities
  add constraint opportunities_grade_confirmed_open_no_structured_restriction
  check (
    not (
      grade_eligibility_confirmed_open
      and cardinality(eligible_grades) > 0
    )
  );
