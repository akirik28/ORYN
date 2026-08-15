-- Chat 4 autonomous pass: prerequisite for supabase/seed_drive_batch1.sql's ON CONFLICT
-- clauses. university_programs and university_requirements had no unique constraint at
-- all (unlike universities' own (lower(name), country) index from migration 0006), which
-- means a re-run of any future program/requirement import would silently duplicate rows.
-- Safe to add now specifically because docs/data-readiness.md's live audit (2026-08-15)
-- confirmed both tables are currently empty in the real dev database — zero rows means
-- zero chance of an existing duplicate violating the new constraint at creation time.
create unique index if not exists university_programs_university_name_idx
  on public.university_programs (university_id, lower(name));

create unique index if not exists university_requirements_program_type_idx
  on public.university_requirements (program_id, requirement_type)
  where program_id is not null;
