-- 0060: opportunities.country_eligibility_confirmed_open — a structured home for
-- "research confirmed this program has no country/citizenship gate" (FEAT-1 Package 1,
-- honest eligibility copy — strategy priority #1).
--
-- *** NOT YET APPLIED *** — written and reviewed on the oryn/feat1-eligibility-honesty
-- branch, application is a separate explicit step (same posture as 0057/0058/0059).
-- The application code reads the column defensively (`?? false`), so every environment
-- behaves identically — and honestly — whether or not this has been applied yet.
--
-- Why: `eligible_countries` (0008) is empty on ~352/391 live rows, and BOTH meanings of
-- empty are live today with no way to tell them apart:
--   (a) a research pass confirmed the program is genuinely open worldwide (wave 1's
--       deliberate "confirmed open stays empty" convention — populating a fabricated
--       "every country" list would be wrong, see docs/handoffs/
--       opportunities-eligible-countries-gap.md Key Finding 1), and
--   (b) nobody has researched the row at all — the overwhelmingly common case.
-- The read paths (lib/opportunities/matching.ts computeEligibility, lib/counselor/
-- eligibility.ts evaluateOpportunityEligibility) skip the country check entirely when the
-- array is empty, so an unresearched-but-possibly-restricted program renders as eligible
-- to every student with zero warning — a violation of AGENTS.md Phase 68 (know when you
-- don't know), Rule 4 (no fake production behavior), and non-negotiable #5.
--
-- This column is the minimal tri-state: array non-empty = restricted (unchanged);
-- empty + true = research-confirmed open (no warning, honestly); empty + false =
-- unverified (the read paths now surface an advisory "not verified yet" note).
-- Default false is the honest default — same principle as 0059's access_channel
-- ("null = not researched — NEVER assume `direct`"): absence of research is never
-- presented as absence of a restriction.
--
-- Deliberately NOT done here:
-- * No data backfill. The rows a research pass confirmed open (documented in
--   docs/research/opportunities-eligible-countries/README.md) are a data write for the
--   research org / coordinator to apply with their own per-row evidence — not something
--   a schema migration should assert wholesale.
-- * No reinterpretation of existing empty arrays. Empty stays "no structured restriction
--   on file" for the hard gate — nothing becomes ineligible because of this migration.

alter table public.opportunities
  add column country_eligibility_confirmed_open boolean not null default false;

comment on column public.opportunities.country_eligibility_confirmed_open is
  'Research-confirmed "no country/citizenship gate — genuinely open worldwide," set only from an official-source statement. false = not confirmed (the honest default; most rows are simply unresearched), never "restricted." Restricted programs populate eligible_countries/eligible_citizenships instead — the check below keeps the two claims from ever being asserted together.';

-- A row cannot simultaneously claim "confirmed open worldwide" and carry a structured
-- country/citizenship restriction — one of the two writes is wrong, and this surfaces it
-- at write time instead of letting the read paths silently pick a winner.
alter table public.opportunities
  add constraint opportunities_confirmed_open_no_structured_restriction
  check (
    not (
      country_eligibility_confirmed_open
      and (cardinality(eligible_countries) > 0 or cardinality(eligible_citizenships) > 0)
    )
  );
