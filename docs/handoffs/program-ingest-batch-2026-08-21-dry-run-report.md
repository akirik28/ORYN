# 20-file ingestion backlog — dry run

Branch `oryn/program-ingest-batch`, forked from `origin/main@8be66f3`. Full gate clean: lint 0,
typecheck 0, test 1278/1278, build succeeds.

## File list and counts — independently verified

All 20 files exist and every claimed line count matches exactly (sum 2,383). Confirmed
un-ingested two ways: no matching `batch_id` in `program_research_queue` for any of the 20
filename stems, and zero substring matches for any of the 20 institution names (lmu, heidelberg,
tuberlin, bonn, delft, durham, nottingham, queen mary, bath, southampton, gebze, ankara,
istanbul, metu, sabancı, yıldız, itu, hacettepe, fu berlin, rwth/aachen) anywhere in the batch_id
history. Clear to proceed on that basis.

## A bug in my own dry-run tooling, caught before it mattered

First dry-run pass showed **zero** duplicates across all 2,383 records. That was wrong, not a
finding — `decideIngestion` was being called via `records.map(...)` over a static `existingKeys`
snapshot per file, so two records that collide *with each other* (not with existing live data)
were each decided independently against the same starting snapshot and both said "accepted."
`university_programs`'s own unique index would still have caught the real collision at insert
time — nothing would have been silently duplicated — but the dry run's predicted counts would
have been wrong, understating real collisions. Caught it because a direct check of
`independent_batch39`'s "İşletme" records (below) proved two of them produce an identical dedup
key, which the first dry run's "127 accepted, 0 duplicate" result contradicted. Fixed to
sequential decision computation (within a file and across files); re-ran. This is the same class
of bug already fixed for `requirements`/`deadlines` earlier today for a different reason (no DB
backstop there) — `university_programs` does have a backstop, so this was a prediction-accuracy
bug, not a data-safety one, but worth naming since it directly affects what's safe to report as
"clean."

## Corrected result

```
Outcome breakdown: { accepted: 2315, insufficient_evidence: 2, duplicate: 61, unresolved_university: 5 }
```

19 distinct universities gain at least one record.

**Correction to my own earlier read**: I initially told the coordination channel Southampton's
248 records looked clean based on the first (buggy) run. That was wrong. With the fix,
Southampton has 42 within-file collisions, Durham (a file not previously flagged as a risk) has
16. Stating that plainly rather than letting the earlier, incorrect read stand.

## All 61 duplicates characterized — zero are genuine re-submissions

Checked every collision group directly against the source records, not assumed:

- **58 (Durham 16, Southampton 42): same programme name, degree level, language, and URL —
  differ ONLY in `degree_type`.** Every single one: e.g. Durham's "Chemistry" MChem (Hons) vs
  BSc (Hons); Southampton's "Aeronautics and Astronautics" MEng vs BEng. These are genuinely
  distinct, separately-admitted UK degree programmes (the standard 3-year Bachelor's vs 4-year
  integrated Master's split), not duplicates — `degree_type` is a real field on every record
  (`Insert AcceptedProgramRow.degree_type`) but is **not part of `programDedupKey` at all**.
  Verified across every group in both files (not sampled): 100% of the 58 have distinct
  `degree_type` values within their collision group, 0% have a repeated value that would
  indicate a genuine duplicate.
- **3 (Istanbul University): the "İşletme" case named as a specific risk before this run.**
  Confirmed real: two "İşletme" (Business Administration) records — Faculty of Economics
  (quota 75, programme code 105610555) vs Faculty of Political Science (quota 60, code
  105690907) — are identical on every field `programDedupKey` checks, including
  `official_program_url`, because **YOK Atlas has no stable per-programme URL at all**
  (confirmed directly in the source's own `researcher_notes`: clicking a result opens a
  client-side-only modal, `window.location` never changes, so every YOK Atlas record in this
  entire backlog points at the same portal root, `https://yokatlas.yok.gov.tr/`). Migration
  0053's URL-based fix provides zero discrimination for this population — a structural
  difference from the fr_it_es_ch batch it was designed around. The third duplicate in this file
  is a second, same-shaped pair: two "Siyaset Bilimi ve Uluslararası İlişkiler" listings
  distinguished only by `faculty_or_school`.

**Population check on the candidate fix**: `degree_type` is populated on 2,343 of 2,383 records
across the whole backlog (98.3%) — no multi-value-list problem observed (unlike `campus` in the
fr_it_es_ch batch), no sparse-population problem (unlike `campus` at 78.7% or `faculty_or_school`
at 32.0% there). A meaningfully cleaner candidate than either field migration 0053 rejected.

## What this means, stated plainly rather than worked around

**If applied as currently designed, 61 real, distinct programmes will not land** — not silently:
every one lands in `program_research_queue` as an audited `duplicate`, exactly the "audited and
replayable" pattern used for the 64-record replay earlier today, recoverable the same way once
the key (or a targeted fix) is settled. But it is a real, bounded loss, and it is evidence of
the same underlying pattern found twice already today (too-coarse identity assumptions) arriving
a third time, in a new shape (`degree_type`, not campus or faculty).

**Not deciding this unilaterally** — this is a real fork:

1. **Apply as-is now.** Bounded (61/2,383 = 2.6%), fully audited, recoverable later exactly like
   today's replay. Matches the "occasional and visible beats systemic and silent" standard
   already applied to migration 0053's own accepted cost.
2. **Hold, widen the key with `degree_type` first**, given how clean this evidence is (98.3%
   population, zero false-attribution risk observed, unlike campus/faculty). Would need the same
   rigor as migration 0053 itself before touching the constraint again same-day.

Standing by for direction before running `--apply`.

## Files

- `scripts/ingest-university-programs-batch.ts` — new, multi-file wrapper reusing
  `decideIngestion`/`applyDecision`/`programDedupKey` unchanged; sequential decision computation
  within and across files.
- This file.
