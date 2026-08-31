# Backfilling the 1,241 resolvable requirement rows — 2026-08-31

Second step of the CEO-assigned requirement `verification_state` backfill, kept on its
own branch from the 84-row decision ([[project_oryn_university_depth_lane]]) so the two
can be merged independently.

## Before / after, verified against the live DB

```
BEFORE: { unverified: 1325 }
AFTER:  { unverified: 88, verified_current: 1170, verified_historical: 67 }
```

1,237 rows changed (1,241 matched a research record minus 4 that already mapped to
`unverified`, so had nothing to change). 0 failures. Re-queried live after the write —
matches the projection exactly:

```sql
select verification_state, count(*) from university_requirements group by 1;
-- verified_current | 1170
-- unverified        |   88
-- verified_historical |  67
```

`88 unverified` = the 84 pre-migration-0056 rows decided in the companion branch
([[project_oryn_university_depth_lane]]) + 4 rows whose original research state maps to
`unverified` by `mapToRequirementVerificationState`'s own "anything unrecognized" rule —
neither group needed a write, both were already correct.

## Where the 67 historical rows are, as asked

**9 of 67 (13.4%) belong to the 40-institution pilot** from the earlier depth pass — and
even those are minor counts, 1–3 rows each: University of Amsterdam (3), University of
Groningen (2), Erasmus University Rotterdam (1), Tilburg University (1), Delft University
of Technology (1), University of Warwick (1).

**58 of 67 (86.6%) do not** — and they're not scattered evenly either. They concentrate
hard in one place:

| Country | Rows |
|---|---|
| Ireland | 43 (64.2%) |
| Netherlands | 8 |
| United Kingdom | 5 |
| United States | 5 |
| France | 4 |
| Germany | 1 |
| Canada | 1 |

Ireland alone accounts for nearly two-thirds of every historical row in the table, spread
across essentially its whole footprint in ORYN: Trinity College Dublin (12 — the single
largest cluster by a wide margin), University College Dublin (8), University of Galway
(5), Maynooth University (5), Technological University Dublin (4), Dublin City
University (4), University College Cork (3), University of Limerick (2) — 7 of the 7
Irish universities with any requirement data at all show up here.

Reading this together: it's neither "concentrated in the pilot" nor "scattered across
schools nobody is targeting" — it's a third shape, a specific non-pilot country whose
entire requirement corpus (from the `ie_requirements_*` research batch, dated
2026-08-21) looks substantially stale by its own original research's own assessment.
Worth a look on its own terms, separate from this backfill.

## What was done

`scripts/backfill-requirement-verification-state.ts` (kept in the repo — matches the
existing `apply-top5/next10/batch2-2026-08-23.ts` convention of keeping one-off apply
scripts as a record of what ran, not deleting them): matches every live row's
`research_record_id` against `data/research/university-requirements/*.jsonl`, reprocesses
the matched research record's own state through the same
`mapToRequirementVerificationState` the live ingestion pipeline uses, and updates only
the rows whose current value disagrees with that recomputation. Dry-run by default;
writes only with `--apply`. Every run — dry or applied — writes a full pre-image backup
(`id, from, to, university_id, requirement_type, title, researchState` for every row it
touches) to `data/audit/` before any write, so the prior state is recoverable without
re-deriving it: `data/audit/requirement-verification-state-backfill-backup-
2026-08-31T20-08-49-417Z.json`.

(One process note: the backup first wrote into
`data/research/university-requirements/` and broke
`__tests__/requirements/corpus-files.test.ts`, which asserts every entry in that specific
directory classifies as a requirements/deadlines `.jsonl` file — caught immediately by
the test suite, fixed by moving the backup to `data/audit/` instead and updating the
script.)

Spot-checked live in the running app: University of Amsterdam's detail page (3 of its
rows moved to `verified_historical`) no longer shows any of those three requirement
texts, while its still-current requirements render exactly as before.

## Verification

`npm run lint`, `npm run typecheck`, `npm run test` (2738/2738 passed, 183 files),
`npm run build` all green on branch `oryn/req-backfill-1241-2026-08-31`, branched from
`origin/main` post-merge (`fb1ba02a`).
