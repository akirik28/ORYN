-- Per-field "checked, not published" status for university_programs.language_of_instruction
-- and .degree_type — the same problem migration 0051/0056 already solved once for
-- university_deadlines.recurrence ('not_published_centrally': "a sourced finding that no
-- central date exists, which is different from 'not yet researched'"), extended to the two
-- program-catalogue fields the field-completeness audit (2026-08-22, US-PROGRAMS-W2 lane)
-- found have the identical shape: a bare null in either column means EITHER "checked, the
-- source genuinely doesn't publish this" (University of Toronto's programme pages state no
-- per-programme language for any of its 635 rows; Oxford's four Foundation Year pages have no
-- "Degree awarded" line at all) OR "nobody has looked yet" — and nothing distinguishes the two
-- today. That ambiguity is why the completeness audit exists in the first place: 78.0%/76.5%
-- populated answers "how much is filled" but not "how much is done".
--
-- DEDICATED COLUMNS, NOT A JSONB `field_provenance` BLOB — considered and rejected. A JSONB
-- bag of keys constrains nothing: a typo, a renamed field, or a second lane inventing a
-- parallel key convention all land silently and read as valid, and a wrong or misspelled key
-- is indistinguishable from an absent one until someone queries for it and finds nothing. This
-- codebase was bitten by exactly that shape the same night this migration was drafted —
-- 0056's own worked example uses `boundary_date` where RecencyRuleSchema expects
-- `boundaryDate`, and Zod strips unknown keys, so following the migration file's own
-- documented example silently drops the value with no error anywhere. A CHECK-constrained
-- column cannot fail that way: a wrong value is rejected at write time, by the database, not
-- discovered later by a query that finds nothing. Two dedicated columns are also cheap to
-- query and index directly, and self-documenting in \d output. When a third field earns this
-- treatment, add a third column — that is a migration, which is a feature here (it forces the
-- decision to stay visible), not a cost to avoid.
--
-- Vocabulary mirrors deadline_recurrence's three-way shape, collapsed to what these two value
-- columns actually need: the column itself already proves "stated" (a non-null value IS the
-- sourced value), so the status column only has to carry the one thing the value column
-- structurally cannot — "checked, confirmed absent". NULL status is therefore the default and
-- correct value for both untouched historical rows and any future row nobody has re-checked
-- yet; it is not a placeholder to be swept away, it means exactly "not yet researched for this
-- field" and should be read that way.
--
-- Drafted 2026-08-22 by the field-completeness lane, NOT applied — a schema change against a
-- populated 14,457-row table needs the founder's authorization, per standing instruction. Hold
-- until authorized; do not run this against the live project without that sign-off.

alter table university_programs
  add column if not exists language_of_instruction_status text,
  add column if not exists degree_type_status text;

alter table university_programs
  drop constraint if exists university_programs_language_status_check;
alter table university_programs
  add constraint university_programs_language_status_check
  check (language_of_instruction_status is null or language_of_instruction_status = 'not_stated_by_source');

alter table university_programs
  drop constraint if exists university_programs_degree_type_status_check;
alter table university_programs
  add constraint university_programs_degree_type_status_check
  check (degree_type_status is null or degree_type_status = 'not_stated_by_source');

-- Internal consistency: a field cannot simultaneously carry a real value and be marked as
-- confirmed-absent — that is a contradiction the database should reject outright rather than
-- one that surfaces later as "why does this row have both a language and a not-published
-- flag". Mirrors 0056's recurrence_shape_check for the same reason.
alter table university_programs
  drop constraint if exists university_programs_language_status_shape_check;
alter table university_programs
  add constraint university_programs_language_status_shape_check
  check (not (language_of_instruction_status = 'not_stated_by_source' and language_of_instruction is not null));

alter table university_programs
  drop constraint if exists university_programs_degree_type_status_shape_check;
alter table university_programs
  add constraint university_programs_degree_type_status_shape_check
  check (not (degree_type_status = 'not_stated_by_source' and degree_type is not null));

comment on column university_programs.language_of_instruction_status is
  'NULL (default): not yet researched for this field — the majority of existing rows, and the correct state for any row nobody has re-checked. ''not_stated_by_source'': a researcher checked the programme''s own page (and, where the programme page is silent, the faculty/department listing) and confirmed the source publishes no language of instruction for it — language_of_instruction is null and MUST STAY null; do not backfill a guessed value (e.g. "English" from the country) into a row carrying this status.';
comment on column university_programs.degree_type_status is
  'NULL (default): not yet researched for this field. ''not_stated_by_source'': a researcher checked the programme''s own page (and the faculty/department listing where relevant) and confirmed no degree type/abbreviation is published for it — degree_type is null and MUST STAY null; do not infer one from degree_level or from what most other rows at the same institution carry.';
