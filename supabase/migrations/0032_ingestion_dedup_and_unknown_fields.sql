-- Fixes three real data-ingestion gaps found auditing the sync/import pipeline
-- (2026-08-16, autonomous pass): university_statistics, university_sources, and
-- opportunity_sources have no unique constraint at all, so a re-run of
-- lib/universities/sync-us-universities.ts (or a re-applied seed file) duplicates rows
-- indefinitely instead of updating in place. All three tables are confirmed empty in the
-- live dev database (docs/data-readiness.md — the sync job has never run;
-- external_sync_jobs has 0 rows ever), so adding these now carries zero existing-
-- duplicate risk, same reasoning migration 0028 already used for university_programs/
-- university_requirements.
--
-- Plain column-list indexes (not expression-based like 0028's) deliberately, so
-- @supabase/supabase-js's .upsert(payload, { onConflict: "col1,col2" }) can target them
-- directly — PostgREST composes that option from a column-name list, not an arbitrary
-- expression.

create unique index if not exists university_statistics_university_year_idx
  on public.university_statistics (university_id, stat_year);

create unique index if not exists university_sources_university_url_idx
  on public.university_sources (university_id, source_url);

create unique index if not exists opportunity_sources_opportunity_url_idx
  on public.opportunity_sources (opportunity_id, source_url);

-- opportunities.remote_allowed/funding_available were `not null default false`, which
-- structurally forced the AI extraction step (lib/ai/opportunity-extraction.ts) to
-- assert a guessed true/false even when a source page states nothing about remote
-- availability or funding — directly contradicting that same file's own system prompt
-- ("leave the field null instead" of inventing a fact). Dropping both NOT NULL and the
-- default lets "the page didn't say" be represented honestly as unknown instead of
-- silently becoming "false", matching this product's stated data-honesty principle
-- (AGENTS.md: "never silently manufacture a value"). opportunities is confirmed empty
-- live, so no existing row needs backfilling or reinterpretation.
alter table public.opportunities alter column remote_allowed drop not null;
alter table public.opportunities alter column remote_allowed drop default;
alter table public.opportunities alter column funding_available drop not null;
alter table public.opportunities alter column funding_available drop default;
