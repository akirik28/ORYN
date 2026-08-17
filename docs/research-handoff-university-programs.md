# University programs — research handoff & verification standard

How a parallel research process (a research Claude session, the founder's own Drive
corpus, or a future automated discovery job) hands off candidate degree-program records
for this pipeline to safely ingest into `public.university_programs`. Schema: migration
`0042_university_programs_enrichment.sql`. Ingestion: `scripts/ingest-university-programs.ts`
(logic in `lib/programs/`, tested in `__tests__/programs/`).

## Why a separate contract from the Drive corpus format

`scripts/drive-import/` already has a proven pattern for the founder's own historical Drive
corpus (Python, one-off SQL generation — see that directory's own README). This contract is
for *incremental* handoff between two independently-running sessions: a JSONL file, one
record per line, landing in `data/research/university-programs/*.jsonl`, git-committed so
both sides see the same history. `scripts/drive-import/parse.py`'s Drive-corpus output can
already be converted into this same shape 1:1 (see `generate_programs_sql.py`, which reads
the parsed corpus directly rather than round-tripping through JSONL) — this is one
ingestion pipeline with two possible input sources, not two pipelines.

## Record shape

```json
{
  "research_program_id": "RSRCH-2026-08-17-0001",
  "university_name": "Technical University of Munich",
  "university_country": "Germany",
  "university_official_domain": "tum.de",
  "program_name": "Data Engineering and Analytics",
  "degree_level": "Bachelor / first-cycle",
  "degree_type": "BSc",
  "faculty_or_school": "School of Computation, Information and Technology",
  "subject_hint": "computer_science",
  "official_program_url": "https://www.tum.de/en/studies/degree-programs/detail/data-engineering-and-analytics-bachelor-of-science-bsc",
  "admissions_url": null,
  "source_url": "https://www.tum.de/en/studies/degree-programs/detail/data-engineering-and-analytics-bachelor-of-science-bsc",
  "source_type": "official_primary",
  "verification_status": "Verified - official page fetched and read",
  "language_of_instruction": "English",
  "duration": "3 years",
  "campus": null,
  "delivery_mode": "in_person",
  "international_eligible": null,
  "researched_at": "2026-08-17",
  "researcher_notes": null,
  "evidence_excerpt": "The Bachelor's in Data Engineering and Analytics is a new English-taught program starting..."
}
```

Required: `university_name`, `university_country`, `program_name`, `official_program_url`,
`source_url`, `source_type`, `verification_status`, `researched_at`. Everything else is
optional — leave a field `null` rather than guessing; the ingestion pipeline never
interprets a missing field as a negative or default value.

`university_official_domain` is optional but resolves far more reliably than name+country
alone (see Entity linking below) — include it whenever the researcher has it.

`subject_hint` is advisory only. The ingestion pipeline independently re-derives
`subject_taxonomy` from `program_name` via `lib/programs/subject-taxonomy.ts` — a
transparent keyword classifier, not a black box — so two researchers' differing subject
judgment can never silently disagree with what actually lands in the product. A hint is
still useful signal when the program name alone is ambiguous.

`verification_status` is free text describing what the researcher actually did, not a
fixed enum — the ingestion pipeline pattern-matches it, currently on the presence/absence
of "page fetched"/"page retrieval blocked" language (ported from the Drive-corpus
vocabulary — see `lib/programs/ingest.ts`'s `looksConfirmed` check). A record whose
identity was found via search but whose actual page content was never read (e.g. "search
result only, page unfetched") is accepted into `program_research_queue` for audit but
never promoted to `university_programs` — a search snippet is discovery evidence, not
verification, per this product's own evidence rules (`AGENTS.md` Phase 3 /
non-negotiable #6).

## The verification gate — `VERIFIED_CURRENT`

A candidate is promoted into `university_programs` with `verification_state =
'verified_current'` only when **all** of the following hold:

1. **University identity resolves unambiguously** — see Entity linking below. A row that
   doesn't resolve is written to `program_research_queue` with `outcome =
   'unresolved_university'` and `university_id = NULL`. It is never inserted into
   `university_programs` with a guessed or null university — that table's `university_id`
   is `NOT NULL` at the schema level specifically to make this impossible.
2. **`official_program_url` and `source_url` are both present** and non-empty.
3. **`verification_status` indicates the source page was actually read**, not merely found
   via search (see above).
4. **Not a duplicate** — `(university_id, normalized_name, degree_level)` doesn't already
   exist in `university_programs` (enforced by both the ingestion logic and a DB unique
   index, so a race between two ingestion runs still can't double-insert).

Anything failing gate 2 or 3 lands in `program_research_queue` with `outcome =
'insufficient_evidence'`; gate 4 failures get `outcome = 'duplicate'`. Every queue row
carries its `research_program_id` and full input fields, so a later, better-evidenced
research pass can be re-submitted and re-ingested without losing the earlier attempt's
trail.

Tier-1 evidence only (per `AGENTS.md` Phase 3): the official university/department page,
official admissions page, or official catalog/programme-regulations page. QS subject
rankings, Wikipedia, Wikidata, educational directories, and AI-recalled knowledge are
discovery aids at best — never cited as `source_url` for a `verified_current` row.

## Entity linking — strict, alias-aware, never fuzzy

Resolution order (`lib/programs/ingest.ts`'s `resolveUniversity`):

1. Exact match on `universities.name` (case/whitespace-normalized) + `country` (with a
   small, explicit alias table for known label variants — e.g. `Türkiye` ↔ `Turkey` — see
   `COUNTRY_ALIASES`).
2. If `university_official_domain` is present, match against `universities.website_url`'s
   domain.
3. A short, explicit, hand-verified override table for well-known abbreviations/short
   forms the exact match can't bridge (`MANUAL_ALIAS_OVERRIDES` — e.g. `"EPFL"` →
   the live row whose full name is "EPFL – École polytechnique fédérale de Lausanne").
   Every entry here was independently confirmed as the single correct institution before
   being added — see the migration-batch commit for the confirmation trail. This table is
   deliberately small and reviewed by hand on every addition, not grown automatically.
4. Nothing else. No trigram/fuzzy matching, no "closest name wins." A university with two
   plausible candidates (e.g. "University of Edinburgh" text-matching both "The University
   of Edinburgh" and the unrelated "Edinburgh Napier University") resolves to neither
   automatically — it's either disambiguated by domain/override, or left unresolved.

If a future batch needs broader alias coverage than the override table gives, the correct
fix is a real `entity_aliases` row (see `lib/entities/`), reviewed the same way university
identity is reviewed everywhere else in this product — not a lower match threshold here.

## Producing a batch

1. Land the JSONL at `data/research/university-programs/<batch-name>.jsonl`, one record
   per line, commit it.
2. `npm run ingest:university-programs -- data/research/university-programs/<batch-name>.jsonl`
   — dry run, prints the accept/duplicate/unresolved/insufficient-evidence breakdown.
3. `... --apply` to write. Every row, whatever the outcome, gets a `program_research_queue`
   row; only `accepted` rows also get a `university_programs` row.
4. Spot-check a handful of newly-`accepted` rows against their own `official_program_url`
   in a browser before treating the batch as done — same discipline as
   `scripts/drive-import/README.md`'s step 4.
