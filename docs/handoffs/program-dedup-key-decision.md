# university_programs dedup key — decision

Branch `oryn/program-dedup-key`, forked from `origin/main@85bf289` (post-0052-merge, 1276
tests). Migration `0053` written and committed, **not applied**. Full gate clean: lint 0,
typecheck 0, test 1278/1278 (floor 1276, +2 net new — 4 existing tests updated in place, 2
added), build succeeds.

## The decision

**Add `official_program_url` to `university_programs_dedup_idx`, alongside the existing
`(university_id, normalized_name, degree_level, language_of_instruction)` columns — not instead
of them. Do not add `campus` or `faculty_or_school`.** Also: remove the separate
application-layer `programUrlKey`-based duplicate check from `decideIngestion()` — measured
directly, it turned out to be the single most damaging thing this investigation found, wrong 53
times out of 54 real firings.

This is one deliberate decision, evidenced below, not three reactive patches — but it took
measuring four genuinely different failure populations, not one, to get there, and the
answer that came out is *not* "widen with the fields the brief asked about."

## Measured first (2026-08-21, oryn-qa-scratch, all read-only)

**Population, 5,278 live rows:**

| Column | Populated | % |
|---|---|---|
| `campus` | 4,154 | 78.7% |
| `faculty_or_school` | 1,689 | 32.0% |
| `official_program_url` | 5,278 | **100.0%** |

(The brief's own figure for campus was "~86%" — measured at 78.7%. Noting the correction rather
than silently using the brief's number.)

`official_program_url` isn't just empirically 100% populated — it's a **code-enforced
invariant**: `decideIngestion()` already rejects any record missing it, as
`insufficient_evidence`, before a dedup key is ever computed. Widening on it needs no
`coalesce()` and weakens the key for nobody. `campus` and `faculty_or_school` have no such
guarantee.

**48 `(university_id, official_program_url)` groups already have more than one live row — 2,781
rows, over half the table.** Manchester's undergraduate listing page alone accounts for 294;
Wisconsin 217, TU Dublin 200, Loughborough 124, Sheffield 111, and 43 more. This single number
rules out "key primarily on `official_program_url`" outright — the majority pattern in this
dataset is one shared catalogue page per institution, not one page per programme. Southampton
(248 rows, one listing page, no per-course pages — the case named in the brief) is representative
of roughly 20% of universities in this dataset, not an edge case.

**`program_research_queue`'s full collision history decomposes into four populations, not one:**

### A. 11 DB-constraint rejections — Bologna, Padua (recoverable, genuinely distinct)

`decideIngestion()`'s own snapshot said "accepted"; the database's `university_programs_dedup_idx`
rejected the insert anyway. All 11 are real: Nursing at Bologna/Faenza/Rimini, Educational
Sciences at Padua/Rovigo, Medicine at Bologna/Forlì, Law at Ravenna, and 5 more — same programme
name, same degree level, **single-value** campus (`"Rimini"`, `"Faenza"`, not a list), and
critically, a **distinct `official_program_url` per campus**. This is the shape the brief's own
Bologna/Padua evidence describes, independently confirmed here directly against
`program_research_queue`, not re-derived from memory.

### B. 11 application-layer full-key duplicates — PoliMi, ETH Zürich, EPFL, Sciences Po (NOT genuinely distinct)

Collided on today's full key (university + name + degree + language). Every one of these 11 is
the **same underlying programme**, re-submitted with inconsistent enrichment across two research
passes — not two distinct programmes:

- PoliMi's Architectural Design, Interaction Design, Civil Engineering: the incoming record's
  `campus` field was `"Milano Leonardo, Piacenza, Mantova"` — a **comma-joined list describing
  every campus one programme runs at**, not a single campus value distinguishing one row from
  another. Same `official_program_url` on both sides.
- Sciences Po's Bachelor of Arts: `campus` = `"Dijon, Le Havre, Menton, Nancy, Paris, Poitiers,
  Reims"` — the same multi-value-list shape, seven campuses in one field.
- ETH Zürich's Mechanical Engineering / Computer Science / Mathematics: `faculty_or_school` was
  `"D-MAVT"` / `"D-INFK"` / `"D-MATH"` on one submission and null on the other — an
  administrative department code attached inconsistently, not a second degree programme. Same
  `official_program_url` on both sides for all three.
- EPFL Computer Science, EPFL Mathematics, EPFL Life Sciences Engineering: no campus or faculty
  difference at all — plain exact duplicates.

**This directly rules out widening the key with raw `campus`/`faculty_or_school` text.** Doing
so would not recover a single genuinely-distinct programme in this population, and for the
multi-value-list cases would risk the opposite failure: creating a spurious second row for a
programme that's still just one programme.

### C. 54 application-layer URL-based duplicates — 53 METU, 1 ETH (the most damaging finding)

The **existing**, pre-this-change `programUrlKey` check: "same `official_program_url` anywhere
at this university → duplicate, regardless of name." Measured against every real row it ever
fired on:

- **53 of 54 are Middle East Technical University** — Architecture, Chemistry, History,
  Mathematics, Philosophy, Physics, Psychology, Sociology, Molecular Biology and Genetics, and
  15 more, **including an entire separate physical campus** ("METU Northern Cyprus Campus",
  `campus` = `"Guzelyurt, Northern Cyprus"`, correctly populated) — all silently rejected as
  "duplicate" because "Computer Engineering" happened to be the first METU programme accepted at
  METU's one shared catalogue-listing URL. Every one of these 53 is a real, distinct, currently
  **missing** programme from the live catalogue.
- **1 of 54 is a correct catch**: ETH Zürich's "Architecture" vs. the already-live "Bachelor's
  degree programme in Architecture" — genuinely the same programme, reworded.

A 53:1 false-positive ratio in the only real sample this check has ever fired on. This isn't
a rare edge case triggered by an unusual institution — it's the same shared-listing-page pattern
identified in the 2,781-row finding above, just caught this time as an active, ongoing rejection
rather than a passive non-collision.

### D. 116 historical duplicates — Trinity College Dublin (already resolved, not live)

All under the *pre-migration-0050* key wording (no language_of_instruction). Sampled: 113 of 116
join cleanly to a live row differing only by `language_of_instruction` — exactly the
already-fixed defect-6 pattern (the language fix, migration 0050, already covers these going
forward). Not a live problem; not weighted in this decision.

## Why this decision, against the two named alternatives

**Alternative 1 — widen with `campus`/`faculty_or_school` as raw text (what the brief asked
about directly):** Rejected. Zero of the 11 evidenced same-key collisions (population B) would
be correctly recovered by this — every single one is a same-programme enrichment artifact, and
`campus` in this dataset is not even reliably single-valued. The *only* genuinely-recoverable
population (A: Bologna/Padua) doesn't need campus text at all — it's already fully distinguished
by `official_program_url`, which has neither the format problem nor the 21%/68% missing-data
problem campus/faculty do.

**Alternative 2 — key primarily on `official_program_url`:** Rejected outright by the 2,781-row
/ 48-group shared-listing-page finding. A URL-primary key would incorrectly merge the majority
pattern in this dataset, not a minority one.

**Alternative 3 — accept that some pairs need application-layer resolution, not a DB
constraint:** Partially adopted, in the opposite direction from how it was framed. The
*existing* application-layer mechanism (the URL-based secondary check) turned out to be the
actively harmful piece, not a reasonable fallback — removing it and letting the composite DB key
do the discriminating is the safer application-layer resolution here, not building a
cleverer one.

**The decision made:** widen the DB unique index additively with `official_program_url`
(NOT NULL, no coalesce needed), and remove the separate application-layer URL-only check now
that the composite key covers what it was trying to do without its blind spot.

## What this cannot represent

Stated plainly, per instruction:

1. **A genuinely single programme with two different valid official pages now becomes two
   rows, not one — an accepted, known cost, not an oversight.** 3 of the 11 population-B pairs
   (ETH Zürich's Physics, EPFL's Computer Science, Sciences Po's Bachelor of Arts) have two
   real, both-true official URLs for what is the same programme. The old, now-removed
   URL-based check happened to merge these correctly as a side effect of a rule that was wrong
   53 other times. This shape (same programme, two official pages) is not attempted to be
   detected or merged going forward — it will insert as two factually-correct, mildly redundant
   rows. Chosen deliberately: occasional, human-visible duplication is a smaller problem than
   the systemic, silent data loss the old rule caused.
2. **A university that has not split its catalogue into per-programme pages still relies
   entirely on name + degree + language to distinguish programmes.** For the 48-group,
   2,781-row shared-listing-page population, this key shape provides exactly the same
   protection it did before (nothing regresses) but no more — if such a university genuinely
   offers two distinct campus-variant programmes under the *identical* name, degree level, and
   language on its one shared listing page, this key still cannot tell them apart. No evidence
   this has happened yet; named as a real, live gap rather than assumed away.
3. **The İstanbul Üniversitesi İşletme/faculty case named in the brief (two different faculties,
   different quotas, different YÖK Atlas cutoffs) is not evidenced in `program_research_queue`
   today** — it isn't from an ingested batch this investigation could directly verify, only
   cited. Not dismissed, but not built for either: today's evidence for faculty-driven splits
   (population B's ETH cases) argues *against* widening on faculty, and I'm not overriding
   direct, measured evidence with an unverified claim in either direction. If/when that batch is
   ingested and two identically-named/degreed/languaged/URLed rows genuinely need a
   faculty-based split, that's new evidence and should be revisited on its own, the same way
   this decision was made — not pre-built for now.
4. **This migration recovers nothing by itself.** Per instruction, nothing is backfilled or
   re-run. The 11 Bologna/Padua rows and 53 METU rows already lost remain fully audited in
   `program_research_queue` (`outcome: rejected` / `duplicate`) and are replayable against this
   new key shape once it's applied — that replay is a separate, future action.

## Code changes (schema-adjacent, made in the same pass)

- `lib/programs/ingest.ts`: `programDedupKey()` takes `officialProgramUrl` as a required 5th
  argument. `decideIngestion()` passes it through and no longer calls the separate
  `programUrlKey`-based check. `programUrlKey()` itself is kept exported (still used by
  `scripts/stage-programs-ingestion-dryrun.ts`, a completed historical batch's dry-run tool) but
  its doc comment now says plainly not to wire it back into automatic duplicate detection
  without re-reading this document.
- `scripts/ingest-university-programs.ts`: updated call sites to the new 5-arg key; stopped
  populating a `programUrlKey`-based half of `existingKeys` that nothing checks anymore.
- `__tests__/programs/ingest.test.ts`: updated 4 existing tests to the new signature; the
  former "TU Delft" test's *expectation* changed from `duplicate` to `accepted`, documented
  inline as an intentional, evidenced behavior change, not left silently broken. Added: a
  Bologna-shaped test (same name/degree/language, different URL → accepted as distinct), a
  METU-shaped test (two different names, same URL → both accepted independently — the actual
  defect this migration fixes), and a same-URL-repeat test confirming the core "already exists"
  case still correctly dedupes.

## Files

- `supabase/migrations/0053_program_dedup_index_url.sql` — new, **not applied**.
- `lib/programs/ingest.ts`, `scripts/ingest-university-programs.ts` — updated.
- `__tests__/programs/ingest.test.ts` — 4 existing tests updated in place, 2 new tests added
  (net +2 vs. the branch point).
- This file.
