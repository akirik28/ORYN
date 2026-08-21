# DE/NL batches 6–16 (2,199 records) — dry run

Second and final wave of the DE/NL programme-catalogue lane. Batches 1–5 (890 records) were
ingested earlier today; these 11 files complete the lane at 3,089 records across 16
universities.

Run with `scripts/ingest-university-programs-batch.ts` (no `--apply`) against the live
project `qtcvcflzxbuagvvwahhu`.

## Pre-flight verification

The task list was verified rather than trusted, because the "already ingested" set had been
derived by filename stem:

| Check | Result |
|---|---|
| All 11 files exist | yes |
| Line counts match the stated 2,199 | yes, exactly (148/123/326/186/163/321/228/215/198/123/168) |
| `research_program_id` values distinct | 2,199 / 2,199 |
| Any of these 11 in `program_research_queue.batch_id` | none — only `de_nl_batch1`–`batch5` are present (180/271/142/257/40 = 890) |
| University-level re-check (not just filename) | 1:1 file→university, 11 distinct universities, none re-covered |
| Baseline live state | 7,715 programmes / 122 distinct universities / 7,905 queue rows |

**Correction to the brief:** the brief stated both ingestion scripts are "on `main` and
current with the live schema". `scripts/ingest-university-programs-batch.ts` does **not**
exist on `main`, and `lib/programs/ingest.ts` differs from `main` by 209 lines — `main`
predates the migration-0053 dedup-key change. The current code lives on the research branch
this worktree derives from (`HEAD` = `11fdabf`). Running "`main`'s version" would have used
the stale five-column key. This run used the worktree copy, verified as the newer one.

## Class counts

| File | Records | accepted | duplicate | unresolved_university | insufficient_evidence |
|---|---:|---:|---:|---:|---:|
| `de_nl_batch6_erasmus` | 148 | 147 | 0 | 0 | 1 |
| `de_nl_batch7_tilburg` | 123 | 123 | 0 | 0 | 0 |
| `de_nl_batch8_uva` | 326 | 0 | 0 | 0 | **326** |
| `de_nl_batch9_groningen` | 186 | 186 | 0 | 0 | 0 |
| `de_nl_batch10_vuamsterdam` | 163 | 0 | 0 | 0 | **163** |
| `de_nl_batch11_humboldt` | 321 | 321 | 0 | 0 | 0 |
| `de_nl_batch12_freiburg` | 228 | 0 | 0 | **228** | 0 |
| `de_nl_batch13_gottingen` | 215 | 0 | 0 | **215** | 0 |
| `de_nl_batch14_hamburg` | 198 | 197 | 0 | 0 | 1 |
| `de_nl_batch15_darmstadt` | 123 | 0 | 0 | **123** | 0 |
| `de_nl_batch16_stuttgart` | 168 | 168 | 0 | 0 | 0 |
| **Total** | **2,199** | **1,142** | **0** | **566** | **491** |

Distinct universities with at least one accepted record: **6**.

## Finding 1 — 566 unresolved: three universities exist under different names

Freiburg, Göttingen and Darmstadt are all present in `universities`, but under names that do
not match what the research files carry, and with **no `entity_aliases` rows**:

| Research file name | Live `universities` name | Records |
|---|---|---:|
| Albert-Ludwigs-Universität Freiburg | Albert-Ludwigs-Universitaet **Freiburg** | 228 |
| Georg-August-Universität Göttingen | **University of** Göttingen | 215 |
| Technische Universität Darmstadt (TU Darmstadt) | **Technical University of** Darmstadt | 123 |

`resolveIdentity` is deliberately strict: exact name → name variants → aliases, never fuzzy.
`nameKey()` strips diacritics but does **not** transliterate, so `Universität` → `universitat`
while the stored `Universitaet` → `universitaet`. Göttingen and Darmstadt are genuine
English/German name differences that no normalisation should paper over.

These are alias rows waiting to be created, not bad data. Creating them is canonical-entity
territory and explicitly out of scope for this lane, so all 566 records were left to land as
audited `unresolved_university`. Adding three aliases would recover all 566 in a replay.

## Finding 2 — 491 insufficient_evidence is a vocabulary mismatch, not weak evidence

489 of the 491 are two entire files (UvA 326, VU Amsterdam 163). Both were sourced from the
universities' **own official APIs** and are `source_type: official_primary`:

- **UvA** — `https://www.uva.nl/_restapi/list-json`, the REST feed that renders UvA's own
  programme-overview pages; full structured per-programme fields, cross-validated against 12+
  individual programme pages.
- **VU Amsterdam** — `https://vu.nl/api/search`, VU's own Azure-backed site-search endpoint,
  captured via an in-page network interceptor; per-programme language taken from the explicit
  `opleidingstaal--nl/--en` facet, `@odata.count` reconciled at 29/29.

The gate is `looksPageConfirmed()`, which requires the literal substring `"verified"` in
`verification_status`. These records say "confirmed", "cross-validated", "Retrieved directly"
— never the exact word. Every record has both URLs and a resolvable university; only the
wording fails.

Not fixed here, deliberately. Editing the research files is forbidden (sourced evidence), and
relaxing `looksPageConfirmed()` is an evidence-policy decision owned by whoever owns the
handoff contract — not something an ingestion lane should quietly widen to make 489 records
pass. They land as audited `insufficient_evidence` and are fully replayable once that call is
made. The remaining 2 (one Erasmus, one Hamburg) are genuine: both state outright that no
factsheet could be retrieved.

## Finding 3 — zero duplicates, and why that is correct

The brief expected a non-trivial duplicate count from partial earlier coverage. There is
none, and it is not an error. Five of these universities have 19 pre-existing rows between
them (Erasmus 4, Tilburg 4, UvA 4, Groningen 4, Humboldt 3). Checked directly: **zero** of
the 2,199 incoming records share an `official_program_url` with any of those 19. The research
lane excluded already-covered programmes as it went — Erasmus documents this per-record in
all 148 (`"checked against ORYN's 4 pre-existing … records"`), Groningen in 71.

Worth flagging separately: all 19 pre-existing rows have `language_of_instruction = NULL`
while incoming records carry real values. Since language is one of the six dedup-key columns,
a future re-research pass over those same 19 programmes would **not** collide and would land
a second copy. Untouched here — backfilling those nulls is a separate, deliberate decision.

## Not done, and why

- No `universities` rows or `entity_aliases` created (out of scope — canonical-entity work).
- No research file modified.
- No field normalised. `language_of_instruction` in particular was left exactly as researched
  — 11 honest nulls and a long tail of real multi-language values (`German and English`,
  `Dutch, French, English`, `German version: German; German-French version: …`) that are
  correct as written.
