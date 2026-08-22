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
  "retrieval_method": "live_fetch",
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
`source_url`, `source_type`, `verification_status`, `researched_at`, and — for records
researched after 2026-08-22 — `retrieval_method` (see below; legacy records without it
fall back to prose matching and must not be retro-labelled without evidence). Everything
else is optional — leave a field `null` rather than guessing; the ingestion pipeline never
interprets a missing field as a negative or default value.

`university_official_domain` is accepted in the contract for a researcher's own record-keeping
and possible future use, but is **not currently consulted by resolution** — see Entity linking
below for what actually decides a match today.

`subject_hint` is advisory only. The ingestion pipeline independently re-derives
`subject_taxonomy` from `program_name` via `lib/programs/subject-taxonomy.ts` — a
transparent keyword classifier, not a black box — so two researchers' differing subject
judgment can never silently disagree with what actually lands in the product. A hint is
still useful signal when the program name alone is ambiguous.

`retrieval_method` declares HOW the source page's content was actually obtained, as a
closed enum the gate validates (`lib/acquisition/retrieval-method.ts`):

- `live_fetch` — the page/endpoint was retrieved live from the origin host by a direct
  HTTP request (curl, fetch, an official JSON feed/API).
- `browser_render` — the page was retrieved live from the origin host in a browser
  session (JS-rendered pages, WAF/bot-mitigation challenges cleared by normal navigation).
- `archived_capture` — the content came from an archive service's capture (Wayback
  Machine etc.), not from the origin host live. Honest sourcing, but **never promoted**:
  an archive capture is not a live confirmed fetch of the current page.
- `search_summary` — only a search result/snippet was seen; the page itself was never
  read. Never promoted — discovery evidence is not verification.

**New records must declare `retrieval_method`.** The gate routes on this declared fact:
`live_fetch`/`browser_render` pass the evidence gate, `archived_capture`/`search_summary`
do not, and a present-but-unrecognized value fails closed (it is never forgiven by prose
matching). This replaced prose vocabulary-matching after it produced three independent
waves of false rejections on rigorously-sourced records whose attestations were worded
differently than the matcher expected — see
`docs/handoffs/evidence-gate-false-rejections-2026-08-22.md` and
`docs/handoffs/gate-fix-retrieval-method-2026-08-22.md`.

`verification_status` remains required free text describing what the researcher actually
did — it is the human-auditable attestation (host, HTTP status, robots.txt posture, how
the programme was enumerated), and the gate still reads it two ways: (1) **backward
compatibility** — a record WITHOUT `retrieval_method` (the pre-existing corpus) is judged
by the legacy prose matcher exactly as before, on the presence/absence of "verified"/
"page retrieval blocked" language, so the bar never drops for legacy records; (2) a
**contradiction guard** — a record declaring `live_fetch`/`browser_render` whose own
prose discloses a blocked or archived retrieval fails as internally inconsistent. A
record whose identity was found via search but whose actual page content was never read
is accepted into `program_research_queue` for audit but never promoted to
`university_programs` — a search snippet is discovery evidence, not verification, per
this product's own evidence rules (`AGENTS.md` Phase 3 / non-negotiable #6).

## The verification gate — `VERIFIED_CURRENT`

A candidate is promoted into `university_programs` with `verification_state =
'verified_current'` only when **all** of the following hold:

1. **University identity resolves unambiguously** — see Entity linking below. A row that
   doesn't resolve is written to `program_research_queue` with `outcome =
   'unresolved_university'` and `university_id = NULL`. It is never inserted into
   `university_programs` with a guessed or null university — that table's `university_id`
   is `NOT NULL` at the schema level specifically to make this impossible.
2. **`official_program_url` and `source_url` are both present**, and `source_url` resolves
   to an accepted authority for the `"programs"` fact class via
   `lib/acquisition/source-authority.ts`'s `sourceAuthority()` — in practice, the
   institution's own domain and nothing else (open registries and third-party-structured
   sources are accepted for *identity* and *population* facts respectively, never for
   programs). A record cannot self-certify `source_type: "official_primary"`; the URL has
   to actually earn it. Failing this is `outcome = 'malformed_source'`.
3. **The record's retrieval actually read the live source page** — `retrieval_method` is
   `live_fetch` or `browser_render` (with no contradicting disclosure in the record's own
   `verification_status`); or, for legacy records without the field, `verification_status`
   prose indicates the page was actually read, not merely found via search (see above).
   Failing this is `outcome = 'insufficient_evidence'`.
4. **Not a duplicate** — `(university_id, normalized_name, degree_level)` doesn't already
   exist in `university_programs` (enforced by both the ingestion logic and a DB unique
   index, so a race between two ingestion runs still can't double-insert). Failing this is
   `outcome = 'duplicate'`.

Every queue row carries its `research_program_id` and full input fields, so a later,
better-evidenced research pass can be re-submitted and re-ingested without losing the
earlier attempt's trail.

Tier-1 evidence only (per `AGENTS.md` Phase 3): the official university/department page,
official admissions page, or official catalog/programme-regulations page. QS subject
rankings, Wikipedia, Wikidata, educational directories, and AI-recalled knowledge are
discovery aids at best — never cited as `source_url` for a `verified_current` row, and
`sourceAuthority()` refuses them outright (see its `EXCLUDED_DOMAINS`).

## Entity linking — strict, alias-aware, never fuzzy, and shared platform-wide

University identity resolution is **not** program-specific logic. It calls
`lib/acquisition/identity.ts`'s `resolveIdentity()` — the one entity-matching
implementation this product has, also used by the university-facts acquisition pipeline
(`scripts/acquire-university-facts.ts`). Resolution order:

1. **External ids** (`entity_external_ids`, e.g. a shared Wikidata/GRID id) — decisive when
   present on both sides, ahead of any name comparison.
2. **Exact name match** (`nameKey`-normalized: accent-insensitive, leading-"The"-insensitive)
   within the same country (`sameCountry`, which knows label variants like `Türkiye`↔`Turkey`).
3. **Name-variant match** — parenthetical suffixes, trailing dash-acronyms, "X, University
   of" inversions (`nameVariants`) — still within the matching country.
4. **Registered alias match** (`entity_aliases`, attached to the university's
   `canonical_entity_id`) — the loosest signal, so it only decides when nothing stronger
   did, still country-scoped.

Nothing else. No trigram/fuzzy matching, no "closest name wins." A university with two
plausible candidates (e.g. "University of Edinburgh" text-matching both "The University of
Edinburgh" and the unrelated "Edinburgh Napier University") resolves via Edinburgh's
registered alias to the correct row, never to Napier — and if *neither* candidate had a
clear signal, both tiers 2–4 return every equally-plausible match and `resolveIdentity`
reports `unresolved`, not a guess.

**Well-known abbreviations belong in `entity_aliases`, not in this pipeline.** The first
batch (2026-08-17) needed seven such aliases (EPFL, Humboldt, NYU, Bologna, UC Berkeley,
Edinburgh, Mannheim); two (NYU, UC Berkeley) already existed in the registry from earlier
work, and the other five were added directly to `entity_aliases` as part of reconciling
this pipeline with the shared identity architecture — never as a program-pipeline-local
override table. Every future "well-known short form" gap is a registry gap to close the
same way, reviewed by hand on every addition, not a lower match threshold in this pipeline.

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
