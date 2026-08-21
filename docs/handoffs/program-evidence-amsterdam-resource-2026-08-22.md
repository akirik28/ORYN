# The 489 Amsterdam records — re-sourced, attested, ingested

**Date:** 2026-08-22
**Scope:** `data/research/university-programs/de_nl_batch8_uva_2026-08-21.jsonl` and
`de_nl_batch10_vuamsterdam_2026-08-21.jsonl`; `university_programs`.
**Status:** complete. 489 programmes are live. **`looksPageConfirmed()` was not touched, and
no existing corpus file was edited.**

## Outcome in one line

The 489 records were **re-sourced against each programme's own official page** — 489 pages
fetched, 489 confirmed — and re-emitted as two new batch files whose `verification_status`
describes that fetch. They then passed the **unmodified** ingestion gate on their own merits.

| | before | after |
| --- | --- | --- |
| University of Amsterdam (`a3067896-f823-4ac6-a57f-aee7edb4f8e4`) | 4 | **330** |
| Vrije Universiteit Amsterdam (`1396b081-4f9a-40d6-8792-0c7f5590d63a`) | 0 | **163** |
| `university_programs` total | 9,423 | **9,912** |
| `program_research_queue` total | 10,670 | **11,159** |

## Every number in the assignment brief, re-measured

All four were verified against the live database (project ref `qtcvcflzxbuagvvwahhu`, taken
from `.env.local` — an exact identifier, not a project-name match) before any work began.

| Claim | Measured | Verdict |
| --- | --- | --- |
| UvA has 4 live programme rows | 4 | correct |
| against 326 researched | 326 lines in the UvA batch | correct |
| VU Amsterdam has 0 | 0 | correct |
| against 163 researched | 163 lines in the VU batch | correct |

All 489 were audited in `program_research_queue` as `insufficient_evidence` — confirming the
evidence gate, not identity resolution, was what held them back.

## The decision: re-source, don't re-word, don't re-tool

`docs/handoffs/program-evidence-gate-vocabulary-decision.md` concluded: do not widen the
vocabulary gate. **That conclusion is correct and was respected.** Its Finding 2 is the
decisive one and it reproduces exactly — in the UvA records the word `confirmed` modifies the
*page's rendering architecture* ("network-request inspection in-browser confirmed these
overview pages are client-rendered"), not the programme fact. A gate keying on that word
would accept these records for a reason unrelated to why they are trustworthy.

That decision offered two forward paths: **(2)** add a structured `verification_method` enum
to the research contract, or **(5)** an interim allowlist of four exact source URLs. I took
neither, because a third option turned out to be available and is strictly better than both:

**the records could simply be re-sourced for real.** Every one of the 489 carries its own
distinct `official_program_url` — 489 records, 489 distinct programme-page URLs. So the
evidence class the gate actually wants (*the programme's own page was fetched and read*) was
one fetch per record away. It was not necessary to change the contract, change the gate, or
grant an exception.

Why this was preferred to the enum (recommendation 2), which remains a good idea:

- A contract change plus a gate change plus a corpus-wide re-emission is a large, structural
  change to make unattended. Re-sourcing is additive and reversible: two new files, no
  existing file edited, no code touched.
- The enum's value is that it lets a *bulk API retrieval* be expressed as its own evidence
  class. That is still worth doing — but it is a change to how ORYN describes evidence, and
  it now blocks nothing urgent, so it is better made deliberately than at 3am by an agent.
- Re-sourcing produces genuinely stronger evidence than either alternative: not "trust the
  feed", but "the institution's own page for this exact programme was retrieved today and
  says it is this programme".

**What was explicitly not done:** no `verification_status` string was reworded to satisfy the
gate. The new attestation is true because the fetch actually happened, and it was written
*after* the fetch, from its results. The two original JSONL files are byte-for-byte unchanged.

## What the re-sourcing actually established

Both institutions' pages were fetched directly (489 requests; VU rate-limited the first pass
with HTTP 503 on 126 of them, which a slower serial retry cleared — those were throttling,
not missing pages).

| check | result |
| --- | --- |
| HTTP 200 on the programme's own page | **489 / 489** |
| page's own `<title>` names the expected programme **and** institution | **489 / 489** |
| final URL stayed on the institution's own domain | **489 / 489** (`www.uva.nl` 326, `vu.nl` 163) |
| `language_of_instruction` cross-checked against the page's own facts panel | **366 checked, 366 agreed, 0 disagreed** |

The 186 UvA redirects are the CMS's own path normalisation (`/en/programmes/…` →
`/shared-content/programmas/en/…`), all same-domain; identity was confirmed on the page that
was actually served.

**The original researcher's data was accurate.** Zero disagreements across 366 independently
checkable values. The 2026-08-21 pass was not wrong — it was unreadable to a machine gate
that reads prose. That is worth recording, because it means the corpus was never the problem.

## Ingestion discipline

Dry run → verify the prediction → apply → verify content landed, per the rule learned from
the run that reported 1,254 rows accepted with every qualifier column null.

Dry runs predicted `{ accepted: 326 }` and `{ accepted: 163 }` — no duplicates, no unresolved,
no malformed sources. Expected per-column non-null counts were computed from the batch files
*before* applying, then compared against the database afterwards:

| column | UvA expected / actual | VU expected / actual |
| --- | --- | --- |
| `language_of_instruction` | 324 / **324** | 163 / **163** |
| `degree_type` | 326 / **326** | 0 / **0** |
| `faculty_or_school` | 325 / **325** | 163 / **163** |
| `campus` | 298 / **298** | 0 / **0** |
| `admissions_url` | 225 / **225** | 163 / **163** |

Also verified: `distinct_urls` equals `rows_total` for both institutions (330/330 and
163/163) so nothing double-inserted; all 489 queue rows `accepted` with a
`promoted_program_id` that resolves to a real row (**0 orphans, 0 unpromoted**); totals
reconcile exactly (9,423 + 489 = 9,912; 10,670 + 489 = 11,159).

Two columns are intentionally empty and were predicted as such: `delivery_mode` is null for
all 489 because the source values are *modes of study* ("Full-time", "Part time") which the
pipeline's `online|in_person|hybrid` enum correctly refuses; and `duration` has no
destination column (`university_programs` has `duration_years numeric`, the corpus carries
text like "3 years (36 months)"). Both are pre-existing pipeline behaviour, not regressions.

## What stayed out, and why

**35 corpus records remain blocked** by the same gate, and inspection says they *should* be:

- Delft "Health and Technology" — "**NOT YET a live programme** … accreditation pending".
- Erasmus "Health Care Management (part-time)" — "**No structured factsheet could be
  retrieved**".
- Frankfurt School × 4 — "Verified - official programme result; **page retrieval blocked**".
- The rest are index/catalogue-listing evidence rather than the programme's own page.

The gate is doing its job on these. They need real re-sourcing, exactly as the 489 just got —
not vocabulary.

## Open items (unchanged or newly found)

1. **The `verification_method` enum (decision doc rec. 2) is still worth doing.** It no longer
   blocks anything, but "retrieved from the institution's own machine-readable endpoint" is a
   real evidence class the contract still cannot express.
2. **The UvA batch is incomplete relative to the feed it came from.** Its own status reports
   retrieving 64 bachelor's + 276 master's = 340 items, but the file holds 326. The 14-record
   gap includes at least Business Analytics and Economics & Business Economics — both real UvA
   bachelor programmes, and both already live from the Drive batch, which may be the
   explanation (the researcher excluding what was already in the product). Not resolved here;
   it is a completeness question, not a correctness one.
3. **"University of Warwick" / "The University of Warwick" duplicate** in the universities
   spine still needs a human merge decision (carried over from the decision doc).
4. **VU's 20 pre-master's/bridging records and 4 track/specialisation records landed.** They
   are real, enrollable, and VU lists them on its own programme pages, and `degree_level`
   states plainly what each one is. Flagging rather than hiding it: if the product should show
   only full degrees, that is a display filter on `degree_level`, not an ingestion question.
5. **62% of `university_programs` rows classify as `subject_taxonomy = 'other'`** — the new
   rows are 60.3%, versus 62.4% for everything else, so this is a long-standing property of the
   keyword classifier rather than anything these batches introduced. It does degrade
   subject-based discovery across the whole table and deserves its own pass.

## Gate

`npm run lint` clean, `npm run typecheck` clean, `npm run test` **1,574 passed / 110 files** —
exactly baseline. No application code was changed; the only additions are two data files and
this document. No migration was written or applied.
