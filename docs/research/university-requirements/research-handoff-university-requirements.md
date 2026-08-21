# University requirements & deadlines — research handoff and record contract

How this research lane hands off admission-requirement and application-deadline records for
later ingestion into `public.university_requirements` and `public.university_deadlines`.
Deliberately mirrors `docs/research-handoff-university-programs.md`, which is the proven
precedent in this repo — same JSONL-per-line shape, same "leave it null rather than guess" rule,
same discovery-vs-verification distinction.

**This lane is research only.** It writes no code, no migrations, and nothing to Supabase.

## Why the row counts made this lane exist

Measured live 2026-08-21: `university_requirements` held 41 rows across 1,019 universities;
`university_deadlines` held 7. ORYN ships a Requirement Check feature (Phase 69) and a deadline
engine (Phase 23) against those numbers.

## Files

```
data/research/university-requirements/requirements_batch<N>_<date>.jsonl
data/research/university-requirements/deadlines_batch<N>_<date>.jsonl
```

## Requirement record

```json
{
  "research_requirement_id": "REQ-2026-08-21-0001",
  "university_name": "London School of Economics and Political Science",
  "university_country": "United Kingdom",
  "university_official_domain": "lse.ac.uk",
  "program_name": "BSc Economics",
  "category": "minimum_grade",
  "requirement_category_db": "minimum_grade",
  "requirement_text": "A*AA with an A* in Mathematics",
  "text_fidelity": "verbatim_quoted",
  "applies_to": "both",
  "scope": null,
  "source_url": "https://www.lse.ac.uk/study-at-lse/undergraduate/bsc-economics",
  "source_type": "official_primary",
  "source_authority_passes_gate": true,
  "source_authority_note": null,
  "retrieved_at": "2026-08-21",
  "cycle_year": 2027,
  "confidence": "high",
  "verification_state": "VERIFIED_CURRENT",
  "limitations": null,
  "researcher_notes": "Standard offer. Page states entry year 2027/28."
}
```

`program_name: null` means the requirement is university-wide.

### Two category fields, on purpose

`category` is the founder brief's taxonomy (`minimum_grade` / `coursework` / `language` /
`standardized_test` / `essay` / `recommendation` / `interview` / `portfolio` / `international` /
`other`). `requirement_category_db` is the value from the `requirement_category` enum that
migration `0020` actually created, which is a *different and finer* list (`curriculum`,
`required_subject`, `english_proficiency`, `language_proficiency`, `entrance_exam`,
`prerequisite_coursework`, `supplemental_requirement`, `international_requirement`, …).

Carrying both means the brief's taxonomy stays auditable while the record is still directly
ingestible. Collapsing to one would either break the brief's contract or force a lossy mapping at
ingestion time, where nobody would see it happen. Note the enum is a Postgres type: a value
outside it fails the insert, which is the correct behavior, so `requirement_category_db` must be
exactly one of the enum's values.

### `text_fidelity` — read this before treating a string as verbatim

- `verbatim_quoted` — the string appeared in quotation marks in the fetched page extract and can
  be treated as the source's own words.
- `extracted_summary` — the extraction step paraphrased, merged two statements, or flattened a
  table. **Not verbatim.** Re-read the source before ingesting.

This exists because pages were read through a summarising extraction step. Marking which strings
survived that step intact, rather than presenting all of them as quotations, is the difference
between a `requirement_text` a student can be shown and one that merely sounds official.

## Deadline record

```json
{
  "research_deadline_id": "DL-2026-08-21-0001",
  "university_name": "University of Cambridge",
  "university_country": "United Kingdom",
  "program_name": null,
  "deadline_type": "application",
  "deadline_date": "2026-10-15",
  "deadline_text_verbatim": "Deadline to submit your UCAS application",
  "deadline_time": "18:00 UK",
  "recurrence": "dated_specific",
  "cycle_year": 2027,
  "cycle_label": "2027 entry",
  "applies_to": "both",
  "source_url": "https://www.undergraduate.study.cam.ac.uk/applying/dates-and-deadlines",
  "source_type": "official_primary",
  "source_authority_passes_gate": true,
  "retrieved_at": "2026-08-21",
  "verification_state": "VERIFIED_CURRENT",
  "limitations": null
}
```

`deadline_type`: `application` / `early` / `scholarship` / `international` / `document`.

`cycle_year` is the **entry year** (2027 = entry September/Fall 2027), never the year the date
falls in — 15 October 2026 is a 2027-entry deadline.

### `recurrence` — the field this lane added, and why it is not optional

- `dated_specific` — the page binds the date to a named cycle. Ingestible as a date.
- `recurring_annual_undated` — the page states a day and month with **no year**.
- `not_published_centrally` — no deadline exists at this level to capture.

This is the most consequential finding of the lane. `university_deadlines.deadline_date` is a
`date` column, and a `date` cannot represent "15 January, every year." Roughly a third of the
deadlines found are published exactly that way:

- TU Delft: "apply via Studielink before 15 January"
- TUM: "before 15.07. (winter semester) or 15.01. (summer semester)"
- MIT: "November 1" / "January 4"
- University of Glasgow: "15 October", "14 January", "30 June"

Note that Glasgow is a UK institution — this is not purely a continental-Europe pattern, though
it is strongly concentrated there. Continental European deadlines are frequently *statutory*
(the Dutch numerus fixus date is national law), so they genuinely are recurring rules rather than
per-cycle announcements.

An ingestion pipeline facing these has exactly two options, and both are bad without a schema
change: drop them, or synthesise a year. Synthesising is what the founder brief forbids in the
same breath as "NEVER convert a 2025 date into a 2026/2027 date." Recording `deadline_date: null`
alongside the verbatim text keeps the fact without inventing the part that was never published.

**Recommended schema follow-up (engineering lane's call, not this lane's):** a nullable
`recurrence_rule` (month/day) beside `deadline_date`, so a recurring statutory deadline is stored
as what it is and the deadline engine can project it into the student's own cycle at read time —
where the projection is visible and revisable, instead of being baked irreversibly into a stored
date at ingestion.

## `verification_state`

| Value | Meaning |
|---|---|
| `VERIFIED_CURRENT` | Page binds the fact to a current, named cycle. |
| `VERIFIED_RECURRING_UNDATED` | Fetched and true, but stated as a recurring rule with no year. |
| `VERIFIED_UNDATED` | Fetched and true; page carries no cycle year (common for requirements, which change less often than deadlines). |
| `VERIFIED_HISTORICAL` | A real published date for a cycle that has closed. Kept deliberately. |
| `CURRENT_CYCLE_NOT_PUBLISHED` | Checked; the next cycle is genuinely not published yet. A correct answer, not a failure. |
| `CONFLICTING_EVIDENCE` | Two official sources disagree. Both recorded, neither chosen. |
| `NEEDS_REVIEW` | Fetched, but something about the extraction is not safe to ingest as-is. |

These map onto the DB's `verification_state` check constraint from migration `0042`
(`verified_current` / `verified_historical` / `verified_derived` / `unverified` / `conflicting`)
with deliberate extra resolution: the DB has no way to say "true but undated" or "correctly
absent", and flattening those into `unverified` would lose the distinction between *we did not
check* and *we checked and the answer is that nothing is published yet*.

`VERIFIED_HISTORICAL` rows are not noise. Erasmus Rotterdam's page still showed 15 January 2026
on 2026-08-21; holding that explicitly is what stops a later pass from rediscovering it and
mistaking it for the live date.

## Evidence rules this lane followed

1. **Official university pages or official application systems only.** No aggregators, no
   rankings sites, no AI recall.
2. **Search discovers; fetch verifies.** A search snippet never became a record. Several
   plausible claims that appeared only in search results — Trinity's non-EU deadlines, Sabancı's
   fee and exam rules, Edinburgh's qualification-age rule — were **excluded entirely** rather than
   recorded at low confidence, because the repo's own `looksConfirmed` standard treats a
   never-fetched page as discovery, not verification.
3. **The source must support the exact claim.** An admissions homepage proves the page exists.
4. **Grades stay on the source's own scale.** IB points as IB points, A-levels as letters,
   TR-YÖS as TR-YÖS. No cross-system conversion, ever — ORYN's code already refuses it.
5. **Conflicts are recorded, never silently resolved.**
6. **Unknown is a valid result.**

## Techniques and rules earned since this contract was written (digested 2026-08-22)

The contract above was written 2026-08-21, before the eight-lane push that took the requirements/
deadlines corpus from ~180 records to 2,018. Everything in this section was learned during that
push and exists only in commit messages and handoff docs until now. Each item names where it
happened so it stays checkable rather than becoming folklore.

### Extraction techniques

**A PDF that `WebFetch` reports as unparseable is not lost — it saved the binary.** `WebFetch`
returns "compressed/encoded PDF, cannot extract" for many university PDFs (confirmed on Turkish
and Swiss sources), but the binary lands on disk regardless, and `pypdf` extracts it cleanly.
Recovered 24 records across three Turkish PDFs in one pass — Hacettepe's admission directive (10),
Ankara's valid-exams table (7), METU's minimum application requirements (7) — and again for a
Swiss (UNIGE) admission-conditions PDF. `Read` cannot open these PDFs in this environment
(`pdftoppm` not installed); go straight to `pypdf`. Source:
`docs/research/university-requirements-uk-tr/blocked-and-partial-sources.md` ("Recovered: PDF,
after WebFetch could not parse it"); the UNIGE record in
`data/research/university-requirements/es_ch_requirements_unige_2026-08-21.jsonl` cites the same
technique independently.

**A PDF's own embedded `CreationDate` is an independent freshness signal `retrieved_at` does not
capture.** A Spanish admissions document extracted perfectly and read as current — but its
metadata showed `CreationDate: 2022`, four years stale against a 2026-27 cycle. `retrieved_at`
records when *we* fetched the page, not when the source last meant it; for a PDF, the document's
own metadata is a second, independent check worth reading before trusting the content as current.
Source: `docs/ORYN-DAY-REPORT-2026-08-21.md` ("Method" section).

**A JS-accordion page returns only section headings to a plain fetch — the real text does not
exist in the DOM until the control is clicked.** Confirmed at Bocconi and Politecnico di Torino.
Fix: run browser-tool JS that finds the button by its heading text, clicks it, waits ~800ms for
the panel to render, then reads `document.body.innerText`. Two rough edges, unsolved: exact
`===` string matching on button labels is fragile against embedded whitespace (fall back to
`.includes()` or a shorter distinctive substring), and some accordions are single-open — a second
click can collapse the first panel back down, so read and record one section fully before opening
the next rather than batching clicks. This is a third, distinct extraction failure mode alongside
the PDF case above and the case below — content that is genuinely client-rendered on interaction,
not just differently packaged. Source: `docs/handoffs/fr-it-requirements-handoff.md` ("A third
extraction technique this repo now has").

**A page whose real data lives behind a keyless JSON API can be found by reading the page's own
network calls, not by scraping its rendered HTML.** YÖK Atlas's "Tercih Sihirbazı" tool exposes a
public, unauthenticated JSON endpoint (`api/tercih-kilavuz/search`) discovered this way — 29
per-programme Ankara placement records (quota, score type, cut-off score, national rank) were
captured directly from it, the first per-programme admissions data of its kind anywhere in the
corpus, with a clear path to the other eleven Turkish universities. Source:
`docs/handoffs/yok-atlas-placement-schema-decision.md`,
`docs/handoffs/yok-atlas-placements-scale-12-universities.md`; corpus totals in
`docs/ORYN-DAY-REPORT-2026-08-21.md`.

### Identity and evidence discipline

**An exact identifier is evidence; rank, substring, and name similarity are leads, never
verification.** Seven near-misses in one day, every one caught by comparing the *returned entity's
own name* against the query rather than trusting a search rank or a substring match:
`ILIKE '%ITU%'` matched Georgia Tech for İTÜ; a ranked ROR search returned Uşak University first
for both "Anadolu" and "Afyon Kocatepe"; Sorbonne Université was returned for a Paris 1
Panthéon-Sorbonne query; Girne Üniversitesi was returned for Girne American University; Turgut
Özal was returned for Malatya Turgut Özal; and two unrelated programmes at two different
universities (Ankara Üniversitesi and a Ziraat Fakültesi programme) both display only as "Bitki
Koruma" with no distinguishing text beyond degree level and institution — a same-name collision a
naive dedup pass would silently merge. Source: `docs/ORYN-DAY-REPORT-2026-08-21.md` ("Method");
Bitki Koruma detail in `docs/handoffs/yok-atlas-placement-schema-decision.md` and
`docs/handoffs/yok-atlas-placements-scale-12-universities.md`. See also
[[feedback-verify-identity-not-pattern-match]] in project memory, which this generalizes.

**Assert a structured field only from the subject institution's own words — a contrastive quote
sitting in the same record is not a claim about the subject.** Southampton's own page names IELTS
"One Skill Retake" as an accepted test variant (`requirement_text`, verbatim, source:
`southampton.ac.uk/.../language.page`) — but the record's `researcher_notes` also quotes Edinburgh
verbatim ("We do not accept IELTS One Skill Retake...") for contrast, because the two UK
universities give opposite answers on the identical test variant. The contrast is genuinely useful
— it's the strongest evidence in the corpus that score provenance has to be stored per institution,
not treated as a global property of a test — but it means the record's own free text contains a
refusal sentence that belongs to a different university than the one the record is about. Nothing
in `requirement_text` or any structured field was ever wrong here; the risk is a downstream reader
or process treating text inside `researcher_notes` as if it describes the record's own subject.
The rule this earns: only the structured fields (`requirement_text`, `verification_state`, etc.)
carry the subject's asserted fact; a contrastive quote belongs in `researcher_notes` prose only,
never promoted into a structured field without re-attributing it to whichever institution actually
said it. Source: `data/research/university-requirements/uk_tr_requirements_batch3_2026-08-21.jsonl`,
record `REQ-2026-08-21-9211`.

### Coordination discipline

**Identifier and migration-number ranges must be explicitly claimed, never taken by incrementing
past the last number you happen to see — two lanes working from a stale view will independently
pick the same next number.** Three real collisions in about a day, all the same root cause:
- `RULE-COUNSEL-034` through `064` were independently minted by two branches with unrelated
  content at the same numbers; resolved by renumbering one side's range to `200-230` by mutual
  agreement rather than a unilateral edit (commit `9db459e`, with the full range correction in
  `b3cf993` after an initial fix under-scoped it to just one rule).
- Migration `0056` was independently claimed by both `kilavuz_kodu` (this requirements lane's
  ingestion work) and `0056_requirement_shape_representability`, already on `main`; the
  `kilavuz_kodu` migration was renumbered to `0057` (commit `c710acc`, whose own message names
  this "the same class as the RULE-COUNSEL-001 collision two lanes produced overnight").
- The requirements/deadlines record contract in this file was written with the same risk in mind
  from the start — `research_requirement_id`/`research_deadline_id` are date-plus-sequence, and
  every lane's closing summary explicitly re-checks its own IDs against the *entire* existing
  corpus (not just its own files) before calling a batch complete, which is the same "verify
  against the full live range, don't trust your last-seen number" discipline stated as a rule
  above, applied prophylactically. See `docs/research/university-requirements/us-requirements-deadlines-summary.md`
  and `de-nl-requirements-deadlines-summary.md`, "Validation performed."

### Deadline modeling

**Deadline dating is a per-institution property, not a per-country one — do not infer a whole
country's pattern from one university.** Within the UK alone, the University of Glasgow states
undated recurring deadlines ("15 October", "14 January", "30 June") while TU Berlin, in the same
DE/NL batch this rule was drawn from, dates every single deadline. The `recurring_annual_undated`
rate measured across the DE/NL lane's 16 universities ranged from 0% (TU Berlin) to 92%
(Heidelberg) — inside two countries usually treated as a single "continental Europe" pattern. This
is the reason `recurrence` (§ above) exists as a per-record field rather than a per-country
default. Source: `docs/research/university-requirements/de-nl-requirements-deadlines-summary.md`.

**A financial-aid subdomain frequently labels a cohort by *enrollment* year while the admissions
subdomain on the same site labels by *admissions cycle* year — the identical-looking label string
can mean two different years for the same entry class.** First flagged by the Columbia agent in
the DE/NL→US handoff, then independently confirmed live four separate times: Columbia itself,
Georgia Tech (financial aid's "2026-27" meant Fall 2026 entry; admissions' "2026-27 cycle" meant
Fall 2027 entry — a full year apart under the identical string), and UC Berkeley and UCLA
independently on the same UC-systemwide stale page (`ca-dream-act.html`). Four independent hits
across four institutions makes this a standing check for any future pass touching financial-aid
dates, not a one-off quirk. Source:
`docs/research/university-requirements/us-requirements-deadlines-summary.md`, "The
cross-institutional year-offset trap."

## Known gap in the ingestion path

27 of the 73 records in batches 1-2 cite official sources that
`lib/acquisition/source-authority.ts` would reject, because `looksOfficial()` recognises only
`.edu` / `.ac.` / `.gov` suffixes. Those records carry `source_authority_passes_gate: false` and a
note naming what they need. **They must not be ingested by relaxing the gate.** See
`source-authority-gap.md` in this directory for the full analysis and the recommended fix.
