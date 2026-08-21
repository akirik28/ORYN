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

## Known gap in the ingestion path

27 of the 73 records in batches 1-2 cite official sources that
`lib/acquisition/source-authority.ts` would reject, because `looksOfficial()` recognises only
`.edu` / `.ac.` / `.gov` suffixes. Those records carry `source_authority_passes_gate: false` and a
note naming what they need. **They must not be ingested by relaxing the gate.** See
`source-authority-gap.md` in this directory for the full analysis and the recommended fix.
