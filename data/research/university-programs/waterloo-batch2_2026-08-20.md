# University of Waterloo — programme catalogue application (batch 2, 2026-08-20)

## Summary

Applied the University of Waterloo undergraduate programme catalogue research handoff
(`ACQ-PRG-2026-08-20-waterloo-*`, 106 candidate records) to `university_programs`, and backfilled
the corresponding `program_research_queue` audit trail for both this batch and a pre-existing
Edinburgh gap discovered during the same checkpoint.

- **Waterloo `university_programs` rows applied:** 105 (chunks 0–5, `university_id`
  `3f365c39-ccf8-487a-9c5f-60e276c0da44`). Final count for the university: 105.
- **Duplicates caught:** 1 — "Teaching" (`ACQ-PRG-2026-08-20-waterloo-103`,
  `/future-students/programs/education-teaching`) matched an already-accepted record,
  "Education (teaching)" (`ACQ-PRG-2026-08-20-waterloo-29`, same URL), by `official_program_url`
  within the same research batch. Excluded from the `university_programs` insert; recorded in
  `program_research_queue` with `outcome = 'duplicate'`.
- **Zero-duplicate check:** `group by official_program_url having count(*) > 1` on Waterloo's rows
  returns zero rows — no accidental double-insert.

## Catalogue rule fix: bachelor-of-arts / bachelor-of-science exclusion

While generating this batch, `scripts/acquire-programs.ts`'s Waterloo catalogue config was
extended to exclude two more hub/CTA-style pages that the catalogue's A-Z-shaped `hrefPattern`
was otherwise matching as if they were named degree programmes:

- `/programs/bachelor-of-arts`
- `/programs/bachelor-of-science`

Both were confirmed live (direct fetch) to be purely descriptive pages ("A Bachelor of Arts (BA)
is a university degree that focuses on…") with no admission-plan language and no apply
instruction — not programmes a student applies to.

By contrast, pages like `/programs/physical-sciences` were deliberately **kept** even though they
also lead to choosing a major, because Waterloo's own page for that catalogue entry reads "Apply
to Physical Sciences and choose one of these eight majors" — a real first-year admission plan,
confirmed by direct fetch before the decision to keep it. This is the same exclusion pattern
already applied to `/programs/themes`, `/programs/by-faculty`, `/programs/minors`,
`/programs/environmental-degrees`, and `/programs/exchange-programs` from the earlier batch.

## program_research_queue audit trail

### Waterloo (new)

`batch_id = 'acquire-programs-batch2-waterloo_2026-08-20'` — 106 rows total:

- 105 rows with `outcome = 'accepted'`, `raw_payload` set to the original research record for
  each program (from the acquisition run's batch JSONL), `promoted_program_id` backfilled to the
  matching `university_programs.id` by joining on `official_program_url`.
- 1 row with `outcome = 'duplicate'` ("Teaching") — `raw_payload` is the actual original research
  record for that candidate (recovered from the batch JSONL, not fabricated), `outcome_detail`
  explains the URL match against "Education (teaching)", `promoted_program_id` left `NULL` since
  it was never inserted into `university_programs`.

### Edinburgh (backfill)

A prior checkpoint found The University of Edinburgh had 95 rows in `university_programs` but
only 5 matching `program_research_queue` rows — a 90-row audit-trail gap from an earlier
acquisition run whose original queue entries are no longer accessible to this session.

`batch_id = 'edinburgh-audit-backfill_2026-08-20'` — 90 rows inserted, one per live
`university_programs` row lacking a matching queue entry (matched by `official_program_url` +
`university_id`), all with `outcome = 'accepted'` and `promoted_program_id` set directly to that
row's own `id`.

**Honest caveat:** these 90 rows are *not* a record of the original research decision. The
original `program_research_queue` entries for these rows (whatever research_program_id,
researched_at timestamp, source excerpt, etc. the original acquisition run produced) were not
available to this session. Rather than fabricate a plausible-looking original payload, each
backfilled row's `raw_payload` is reconstructed from the **live `university_programs` row itself**
(its own name, degree_level, field, source_url, notes, verification_state, etc. as jsonb), and
`outcome_detail` says explicitly:

> Audit-trail backfill: original program_research_queue entry from this row's actual acquisition
> run was not available to this session; raw_payload reconstructed from the live
> university_programs row itself, not the original research payload.

This documents the gap honestly instead of either fabricating false provenance or leaving the
Edinburgh rows permanently without any queue reference. A future session with access to the
original Edinburgh acquisition run's output could replace these rows with the real original
records if that data resurfaces.

## Verification

- `select count(*) from university_programs where university_id = '3f365c39-ccf8-487a-9c5f-60e276c0da44'` → 105
- `select official_program_url, count(*) ... having count(*) > 1` on Waterloo → 0 rows
- `select count(*) from program_research_queue where batch_id in ('acquire-programs-batch2-waterloo_2026-08-20', 'edinburgh-audit-backfill_2026-08-20')` → 196 (106 + 90)
- Edinburgh gap re-checked after backfill (`university_programs` rows with no matching
  `program_research_queue` row) → 0
- `npm run lint`, `npm run typecheck`, `npm run test` all clean (89 test files, 1006 tests passing)
