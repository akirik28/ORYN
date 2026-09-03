# Drive corpus import

Turns the founder's Google Drive ORYN data corpus into ready-to-apply SQL for
`universities`, `university_programs`, `university_requirements`, and `opportunities`.
Two stages, both Python 3 standard library only (no `pip install` needed):

1. `parse.py` — reads raw Drive spreadsheet exports (see below) and produces clean,
   validated JSON in `parsed/`.
2. `generate_sql.py <output.sql>` — turns that JSON into a Postgres file matching Proxola's
   real schema, filtered to rows the corpus itself marked `Verified`/`2026 cycle confirmed`
   (rows it marked `Review` or `Rejected` are excluded, never silently included).

Neither script talks to Supabase directly — this session had no working
`SUPABASE_SECRET_KEY`, so the output is a plain `.sql` file for the founder (or a future
session with the key) to apply by hand via the Supabase SQL editor or `psql`/CLI. Requires
`supabase/migrations/0028_program_requirement_dedup_indexes.sql` applied first — the
generated file's `ON CONFLICT` clauses depend on those indexes existing.

## The corpus

Owned by the founder's school account (`akirik28@my.uaa.k12.tr`), in a Drive folder named
"ORYN Database" with subfolders `00_Data_Dictionary_and_Audit` / `01_Universities` /
`02_University_Programs` / `03_Program_Requirements` / `04_Opportunities` (six category
subfolders) / `05_UAA_Source_Files` (the original raw school-counselor PDFs/zips) /
`99_Archive`. Every structured sheet follows the same pattern: a `Verified_Records`
section (identity confirmed against an official institution/provider page or a
corroborating official-domain search result), a `Current_2026`/`2026 Cycle Confirmed`
section (a filtered *subset* of `Verified_Records` — not new data, `parse.py` already
slices past it), and an `Audit_Records`/`Candidate_Audit` section (identity not
sufficiently confirmed, or a wrong level/mismatch — always excluded). See
`00_Data_Dictionary_and_Audit`'s own file for the full verification-state vocabulary.

## Running it for a new batch

1. For each category spreadsheet, use the Drive MCP's `search_files` to find the file ID,
   then `read_file_content` on that ID. Save the raw JSON result
   (`{"fileContent": "..."}`) to `raw/<Name>.json` — filenames `parse.py` expects:
   `Universities.json`, `University_Programs.json`, `Program_Requirements.json`, and one
   per opportunity category (`Summer_Programs.json`, `Competitions_and_Awards.json`,
   `Online_Programs_and_Internships.json`, `Research_Publications.json`,
   `Social_Impact_and_Volunteering.json`, `Scholarships_and_Fellowships.json`). Large
   responses auto-save to a local tool-results file — copy that file's content into
   `raw/<Name>.json` rather than pasting a truncated inline preview.
2. `python3 scripts/drive-import/parse.py` — prints a row count per file; cross-check
   against that file's own README-stated "Verified identity records" count. A mismatch
   means the corpus's export format changed and `parse.py`'s section markers/ID-regex need
   updating before the output can be trusted.
3. `python3 scripts/drive-import/generate_sql.py supabase/seed_drive_batchN.sql`
4. Read the generated file before applying it — this is real content going into the live
   product, not a rubber-stamp step. Check a sample of rows, check the status/confidence
   breakdown the script prints, and update `EXISTING_SEED_UNIS` in `generate_sql.py` first
   if `supabase/seed.sql` or a prior batch has grown since this script was last run.
5. Apply the SQL, then `supabase/seed_drive_batch1.sql`'s own live-verification pattern:
   spot-check a handful of rows in the app (Universities explorer, Opportunities list)
   against the same official source URL the row cites.

## Entity batch (Canonical Entity Autocomplete System, 2026-08-16)

A second, separate pipeline for a different source: `10 ORYN Canonical App Data Pack —
Verified 2026-08-15`, one large merged-tabs Google Sheet export (not the six
per-category files above) covering canonical organizations (`PROV`), verified Turkish
schools (`TRSCH`) with their explicit aliases (`ALIA`), globally QS-ranked universities
(`GUNI`), and a small explicit opportunity-alias table (`ALIAS`). Do not use the
`99_SUPERSEDED_...` copy of this sheet.

1. `read_file_content` on the pack's file ID, save to
   `raw/canonical_app_data_pack.json`.
2. `python3 scripts/drive-import/parse_entities.py` — a different parser from
   `parse.py` above (this export is one physical line per row, pipe-delimited
   markdown-table format, not CSV-in-cells). Prints a row count per table; cross-check
   against a manual skim of the source (58 TRSCH, 126 ALIA, 19 PROV, 98 GUNI, 16
   "official-current" canonical opportunities, 7 opportunity aliases, as of this batch).
3. `python3 scripts/drive-import/generate_entities_sql.py` —
   `supabase/seed_entities_drive_batch1.sql`. Requires
   `supabase/migrations/0038_canonical_entity_registry.sql` applied first.
4. Read the generated file before applying it, same discipline as step 4 above. Update
   `existing_universities.json`'s source (the `existing` list `main()` builds from
   `supabase/seed.sql` + `seed_drive_batch1.sql`) first if either has grown since this
   script was last run — otherwise a university that already exists gets re-inserted as
   a duplicate row instead of alias-enriched (the unique index would reject it, not
   silently duplicate, but it's still the wrong SQL to generate).

Respects the corpus's own release/verification gates — see
`generate_entities_sql.py`'s own module docstring for exactly what gets excluded and
why (4 Turkish schools on `HOLD_*` release state, 2 of 7 opportunity aliases whose
canonical opportunity isn't in the 16-row current set).

## Known limitations (batch 1, 2026-08-15)

- `EXISTING_SEED_UNIS` is a hardcoded snapshot, not a live query — see the module
  docstring in `generate_sql.py`.
- No date is ever parsed out of free-text `current_cycle_details` into a real `deadline`
  column — deliberately, to avoid mis-parsing a month/day/year and presenting a wrong date
  with false confidence. `status` (`active`/`under_review`/`expired`) carries the coarse
  signal instead; the real date, if any, stays readable in `description`.
- `country`/`eligible_countries`/`minimum_age`/`maximum_age`/`cost` are left `NULL` on
  every imported opportunity — the corpus's free-text fields don't reliably map to these
  without guessing, and guessing eligibility is exactly what this product's own
  non-negotiables prohibit.
- Requirement rows never populate `structured_rule` — by design, see migration 0020's own
  comment on that column.
