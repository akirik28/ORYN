-- NOT APPLIED. Founder-gated like every migration in this repo's history -- write and leave
-- unapplied. CEO decision, 2026-09-02: CV extraction pulls skills and languages from an
-- uploaded resume (the same paid AI call that extracts every other category), but neither
-- review surface nor the save path has ever done anything with them -- both were extracted
-- and silently discarded, always. Wiring them into the same review-and-import flow every
-- other category already has means a skills/languages row saved from a CV needs the same
-- provenance tag every achievement table already carries (lib/profile/cv-import.ts's own
-- header comment: "so a student -- and Oryn's own scoring -- can tell an imported claim
-- from one typed by hand"). Migration 0004 created both tables without one, since neither
-- had an import path to distinguish from manual entry until now.
--
-- Same column, same type, same default as every achievement table's `source` column
-- (migration 0004) -- `not null default 'manual'` so every existing row (all manually
-- entered, since no import path existed before this) backfills correctly with zero
-- ambiguity, and every future manual insert (skills-actions.ts / languages-actions.ts,
-- neither of which sets `source` explicitly) keeps getting 'manual' from the same default
-- those files already rely on for every other column they don't set.
--
-- lib/profile/cv-import.ts's insertCvImportSkills/insertCvImportLanguages must keep working
-- with this column unapplied -- the identical defensive pattern lib/plan/persist.ts proved
-- out for weekly_actions.carried_forward (migration 0077) and lib/jobs/run-with-tracking.ts
-- repeated for external_sync_jobs.errors_encountered (migration 0083): Postgres validates an
-- INSERT's column list before it ever touches a row, so naming a column that doesn't exist
-- yet fails the whole statement regardless of what would have been written.
alter table public.skills
  add column if not exists source text not null default 'manual';

alter table public.languages
  add column if not exists source text not null default 'manual';

comment on column public.skills.source is
  'Distinguishes a CV-imported skill (''cv_import'') from one the student typed directly (''manual'', the default) -- same convention as every achievement table''s `source` column (migration 0004).';

comment on column public.languages.source is
  'Distinguishes a CV-imported language (''cv_import'') from one the student typed directly (''manual'', the default) -- same convention as every achievement table''s `source` column (migration 0004).';
