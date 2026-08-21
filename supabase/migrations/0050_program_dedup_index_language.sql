-- ingest-fixes defect 6 (silent data loss in program ingestion) is fixed at the application
-- layer (lib/programs/ingest.ts's programDedupKey now includes language_of_instruction), but
-- the database's own unique indexes on university_programs never learned about language --
-- verified live via pg_indexes before writing this migration:
--   university_programs_dedup_idx: UNIQUE (university_id, normalized_name, COALESCE(degree_level, ''))
--   university_programs_university_name_idx: UNIQUE (university_id, lower(name))
-- Neither includes language_of_instruction. So a legitimate same-subject, different-language
-- track pair (Radboud's Dutch/English tracks, Sapienza's two distinct "Classics" degrees --
-- exactly the shape in the priority-country batch about to be ingested) now correctly passes
-- decideIngestion()'s widened application-level key, then fails at the database layer with a
-- real unique-constraint violation. Thanks to defect 7's fix this is no longer silent (it lands
-- as a `rejected` audit row in program_research_queue with the real DB error rather than
-- vanishing from both tables), but it is still loss of legitimate records that should never
-- have collided in the first place.
--
-- Pre-migration verification (2026-08-21, against the live oryn-qa-scratch project, all
-- read-only, zero rows changed):
--   - 726 of 4540 live university_programs rows have language_of_instruction IS NULL --
--     COALESCE(..., '') is required below, not optional: Postgres unique indexes treat NULL as
--     distinct from every other NULL, so without it two genuinely-duplicate NULL-language rows
--     would silently stop colliding instead of being caught.
--   - Zero existing (university_id, normalized_name) groups currently have more than one row
--     (checked directly with a GROUP BY ... HAVING count(*) > 1), so widening the index below
--     cannot admit anything that already exists live -- there is nothing for either change in
--     this migration to newly "let through".
--   - program_research_queue has exactly one rejected row total, and it is an unrelated
--     HTTP-404 case, not a constraint violation. This problem has not yet manifested in
--     practice, consistent with catalogues so far mostly using distinct programme names --
--     the priority-country batch is the first one expected to actually hit it.
--
-- university_programs_university_name_idx (migration 0028, UNIQUE on university_id+lower(name)
-- alone, no degree_level at all) is strictly cruder than university_programs_dedup_idx and,
-- left in place, is a live latent bug independent of language: it would incorrectly block a
-- legitimate same-name pair distinguished only by degree_level (a "Physics" BSc and a "Physics"
-- MSc at the same university) purely because it never considers degree_level. Dropped rather
-- than widened -- university_programs_dedup_idx already supersedes it for every case that
-- matters: normalized_name is a strictly coarser grouping of `name` than lower(name) is, since
-- normalizeProgramName() (lib/programs/normalize.ts) only ever removes/collapses characters
-- that lower() alone doesn't touch (punctuation, repeated whitespace), so any pair colliding on
-- lower(name) necessarily also collides on normalized_name. The fuller index's
-- normalized_name+degree_level+language check is therefore a strict refinement of the cruder
-- index's protection, not a different, disjoint one -- nothing the name-only index catches
-- today is lost by dropping it.
--
-- Deliberately NOT appending a disambiguating suffix to `name` (e.g. "Classics (Italian)") to
-- work around the constraint instead: name is a user-visible fact sourced from the
-- institution's own page, and corrupting a sourced field to satisfy a schema shortcoming is the
-- same class of mistake as stuffing justification text into language_of_instruction, which this
-- same batch's research lane already refused to do. The constraint should model reality, not
-- the other way round.

drop index if exists public.university_programs_university_name_idx;

drop index if exists public.university_programs_dedup_idx;
create unique index university_programs_dedup_idx
  on public.university_programs (university_id, normalized_name, coalesce(degree_level, ''), coalesce(language_of_instruction, ''));
