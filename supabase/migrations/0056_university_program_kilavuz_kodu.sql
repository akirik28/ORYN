-- Adds YOK Atlas's own stable per-programme identifier (kilavuzKodu) to university_programs,
-- as a plain column -- NOT applied to any live database. Per the coordination session's
-- explicit instruction: 0055's authorization does not extend to this migration; do not apply
-- without asking the founder again. Written now so the proposal is concrete and reviewable,
-- not because it is cleared to run.
--
-- Why this now: every one of Oryn's 779 Turkish university_programs rows currently has
-- official_program_url = 'https://yokatlas.yok.gov.tr/' -- the bare portal root, not a
-- per-programme page, because YOK Atlas has no per-programme URL. That makes Turkey the
-- largest population in this schema with no usable per-programme source reference. kilavuz_kodu
-- (e.g. "203110477") is confirmed live, directly, as a real and stable per-programme identifier
-- in YOK Atlas's own api/tercih-kilavuz/search response -- not inferred from research prose. See
-- docs/handoffs/yok-atlas-placement-schema-decision.md (original finding) and
-- docs/handoffs/yok-atlas-placements-scale-12-universities.md (confirmed again at 12-university
-- scale: kilavuz_kodu was stored per placement-cycle row without incident across 456 real rows).
--
-- Why a plain column here, not an entity_external_ids row (the pattern this schema already
-- uses for every other external identifier -- WIKIDATA, ROR, GRID, ISNI, CROSSREF_FUNDER,
-- IB_SCHOOL_CODE, MEB_INSTITUTION_CODE): checked directly before deciding, not assumed.
-- entity_external_ids.entity_id is a foreign key to canonical_entities(id) -- confirmed via
-- information_schema.constraint_column_usage. university_programs rows have no
-- canonical_entities row of their own; only universities and schools do. Reusing that table
-- for a per-programme identifier would need either (a) a polymorphic foreign key -- two
-- mutually-exclusive nullable target columns plus a CHECK to enforce exactly one is set, a
-- real anti-pattern for one single-system fact -- or (b) making university_programs rows
-- canonical entities in their own right, which is a materially bigger architectural change
-- (alias tracking, merge workflow, verification queue -- everything canonical_entities exists
-- for) than a stable identifier column justifies. kilavuz_kodu is also, unlike ROR/WIKIDATA/etc,
-- a single-system fact with no second identifier scheme in play for programmes -- the same
-- shape official_program_url and admissions_url already are as plain columns on this table, not
-- entity_external_ids rows. A dedicated university_program_external_ids table would be the
-- right move if or when a second per-programme identifier system shows up; until then it is an
-- abstraction with no second user.
--
-- Why nullable, unindexed for uniqueness, and NOT added to the dedup key: unlike the placement
-- table (where kilavuz_kodu-per-cycle is populated at insert time from a live fetch),
-- backfilling this column for university_programs' existing 779 rows is real, separate work --
-- re-matching every row against the live API by name, the same collision-prone process
-- docs/handoffs/yok-atlas-placements-scale-12-universities.md just ran for placements, with the
-- same real risks (six universities' names are recorded in English, not Turkish -- see that
-- doc's Finding 1 -- and would need that gap closed first, not guessed through translation, to
-- backfill kilavuz_kodu safely). This migration adds the column only; it does not backfill, and
-- does not touch university_programs_dedup_idx or decideIngestion() in lib/programs/ingest.ts.
-- Wiring it into identity resolution or deduplication is exactly the kind of reactive schema
-- change migration 0054 already declined to make for three records -- a decision for whoever
-- next backfills this column with real, verified per-programme codes, once enough of the
-- population is covered to judge whether a uniqueness constraint would help or would reject
-- legitimate data (the same reasoning 0054 itself used to decline a kilavuz_kodu-based
-- constraint on day one).
--
-- The partial index (where kilavuz_kodu is not null) costs nothing while the column is empty
-- and pays for itself the moment a backfill pass starts checking "do I already have this
-- programme's code" before writing -- the same reason official_program_url already has one.

alter table public.university_programs add column kilavuz_kodu text;

create index university_programs_kilavuz_kodu_idx
  on public.university_programs (kilavuz_kodu)
  where kilavuz_kodu is not null;

comment on column public.university_programs.kilavuz_kodu is
  'YOK Atlas''s own official per-programme identifier (e.g. "203110477"), stored verbatim for traceability. Nullable and unbacked by any uniqueness constraint -- backfilling it for the existing 779 Turkish rows is separate, not-yet-done work (see docs/handoffs/yok-atlas-placements-scale-12-universities.md Finding 1 for why: six universities'' programme names are recorded in English, not Turkish, and would need that gap closed first). Not used for deduplication or identity resolution by this migration.';
