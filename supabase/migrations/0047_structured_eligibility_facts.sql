-- Counselor eligibility, structured (data-quality sprint 2). Closes the gap named directly
-- in the founder spec: citizenship and residency are different facts from "country" (a
-- Turkey-resident student is not automatically a Turkish citizen, a US-resident student is
-- not automatically a US citizen), and today ORYN has nowhere to store citizenship at all,
-- and no structured way for an opportunity to say "US citizens only" beyond free text that
-- lib/counselor/eligibility.ts deliberately never parses.
--
-- Additive only. `eligible_countries` (migration 0008) already IS the structured residency/
-- general-country-eligibility signal -- every existing read path (matching.ts's hard gate,
-- eligibility.ts's notes) already treats it that way, checked against the student's one
-- country-like profile field. Adding a second "residency countries" column would just
-- duplicate that exact check against that exact same field -- no new information, only
-- maintenance surface. Citizenship has no structured home at all today (only the free-text
-- `citizenship_restrictions`, migration 0008, which lib/counselor/eligibility.ts deliberately
-- never parses) -- that is the genuine, distinct gap this migration closes.
--
-- `citizenship_restrictions` is unchanged and stays the fallback evidence for any restriction
-- too complex or ambiguous to safely reduce to a flat country list ("US citizens, permanent
-- residents, or F-1 visa holders with 3+ years residence" is not one thing). The new column
-- is populated only when a source states an unambiguous, simple citizenship rule -- empty
-- means "no structured rule known," never "open to every citizenship," the same convention
-- `eligible_countries` already uses.

alter table public.opportunities
  add column eligible_citizenships text[] not null default '{}';

comment on column public.opportunities.eligible_citizenships is
  'Structured citizenship restriction, populated only from an unambiguous official statement. Empty = no structured rule on file (citizenship_restrictions free text may still carry unstructured evidence) -- never treat empty as "open to all citizenships."';

-- Citizenship is never inferred from `profiles.country` (residence/school location, already
-- in wide use for exactly that) -- a genuinely separate fact, multi-valued because dual
-- citizenship is common among ORYN's international student base. Empty array is the honest
-- "not stated" default; onboarding/settings never forces a value.
alter table public.profiles
  add column citizenship_countries text[] not null default '{}';

comment on column public.profiles.citizenship_countries is
  'Student-declared citizenship(s), distinct from profiles.country (residence/school location). Empty = not stated, never inferred from country.';
