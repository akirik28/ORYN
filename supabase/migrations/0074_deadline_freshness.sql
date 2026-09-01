-- Lets a deadline say when it was last checked, so staleness is visible rather than assumed.
--
-- WHY NOW: the founder asked whether to apply 85 verified requirement/deadline records
-- covering six new countries (Denmark, Finland, Belgium, Austria, Norway, Sweden). The data
-- is good -- every record verbatim-quoted from an official primary source, all 26 source URLs
-- re-checked live. The objection was never quality; it was that every country added is a
-- promise to keep current, and `university_deadlines` had no way to express whether a row
-- still holds.
--
-- `university_requirements` already carries `last_checked_at`, `data_status` and
-- `verification_state` (Phase 29). Deadlines carried none of the three, which is the wrong way
-- round: a deadline is the field that goes stale fastest and hurts most when it does. Eight UK
-- medicine/dentistry/veterinary targets showed students 13 January when the real date was
-- 15 October -- a year of a student's life, from a date nobody could tell was old.
--
-- Mirrors the requirements table exactly rather than inventing a second vocabulary: same
-- `data_status` enum from 0006, same nullable `last_checked_at`, same 'fresh' default. A
-- reader who knows one table now knows the other.
--
-- `last_checked_at` is deliberately NULL for existing rows rather than backfilled to now():
-- 470 deadlines exist and nobody has re-checked them, so writing a timestamp would assert a
-- check that never happened -- the exact confident-output-from-absent-input shape this
-- codebase has spent two days removing. NULL means "never checked", and it is the truth.
--
-- Default 'fresh' matches the requirements table and is a deliberate compromise: it is what
-- that table already claims about its own 1,303 never-checked rows, and diverging here would
-- make two sibling tables answer the same question differently. Making 'fresh' *earned* rather
-- than assumed is a separate change that should apply to both tables at once.

alter table public.university_deadlines
  add column if not exists last_checked_at timestamptz;

alter table public.university_deadlines
  add column if not exists data_status data_status not null default 'fresh';

comment on column public.university_deadlines.last_checked_at is
  'When this deadline was last verified against its source. NULL means never checked since ingestion -- not a failure, but not a check either. Never backfill this with now(): a timestamp asserts a verification that happened.';

comment on column public.university_deadlines.data_status is
  'fresh | stale | needs_review | unavailable (Phase 29), same enum and same meanings as university_requirements.data_status. Defaults to fresh on insert, matching that table; a row is only as fresh as its last_checked_at actually says.';

create index if not exists university_deadlines_staleness_idx
  on public.university_deadlines (last_checked_at nulls first)
  where data_status <> 'unavailable';
