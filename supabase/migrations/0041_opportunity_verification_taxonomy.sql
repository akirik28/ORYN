-- Extends the Phase 8 opportunity model with the verification/selectivity taxonomy the
-- founder specified: opportunities.status (active/expired/under_review/disabled) is a
-- moderation/visibility flag, not the same thing as "does the 2026/2027 cycle currently
-- accept applications" or "how selective is this, factually" — those get their own
-- columns so a stale 2024 deadline is never presented as if it were current, and RSI
-- never reads the same as an open-enrollment summer course.
--
-- Text + CHECK rather than a Postgres enum (matching the migration 0038 canonical-entity
-- convention, not the older `create type ... as enum` style from migration 0008) — ALTER
-- TYPE ADD VALUE has transaction restrictions that make enums awkward to extend later,
-- and this taxonomy is exactly the kind of thing likely to grow a value or two over time.
alter table public.opportunities
  add column cycle_status text not null default 'unverified'
    check (cycle_status = any (array['open', 'upcoming', 'closed', 'date_not_announced', 'historical', 'discontinued', 'unverified'])),
  add column selectivity_tier text not null default 'unknown'
    check (selectivity_tier = any (array['extremely_selective', 'highly_selective', 'selective', 'competitive_award', 'open_enrollment', 'unknown'])),
  add column verification_state text not null default 'unverified'
    check (verification_state = any (array['verified_current', 'verified_historical', 'verified_derived', 'unverified', 'conflicting'])),
  add column application_open_date date,
  add column eligible_grades text[] not null default '{}',
  add column citizenship_restrictions text,
  add column residency_restrictions text,
  add column location_mode text
    check (location_mode is null or location_mode = any (array['online', 'in_person', 'hybrid'])),
  add column financial_aid_available boolean,
  -- Compact array instead of five-plus separate booleans (essay_required,
  -- recommendation_required, transcript_required, ...) — same information, queryable via
  -- `application_requirements @> ARRAY['essay']`, without a column per requirement type.
  add column application_requirements text[] not null default '{}',
  -- e.g. "2026-2027", "Summer 2026" — the specific cycle a cycle_status/deadline refers to,
  -- so "closed" unambiguously means *this* cycle closed, not that the program ended.
  add column current_cycle_label text,
  add column verified_at timestamptz;

create index opportunities_cycle_status_idx on public.opportunities(cycle_status);
create index opportunities_selectivity_tier_idx on public.opportunities(selectivity_tier);
