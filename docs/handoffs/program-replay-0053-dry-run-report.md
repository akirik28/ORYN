# Replay of migration-0053-unblocked rejections — dry run

Branch `oryn/program-replay`, forked from `origin/main@db2941b` (post-0053-merge). Full gate
clean: lint 0, typecheck 0, build succeeds (no test changes — this is a one-time operational
script, not library code; see `scripts/replay-program-rejections-0053.ts`'s own doc comment).

## Candidate identification (fresh, by outcome + outcome_detail, not from memory)

Re-queried `program_research_queue` directly:

- `outcome = 'duplicate'` + `outcome_detail = 'Same official_program_url already exists at this
  university under a different name.'`: **54 rows** — 53 Middle East Technical University, 1
  ETH Zürich. The ETH row is deliberately **excluded from replay**: it was a correct rejection
  (a genuine same-programme rename sharing a URL), and replaying it would create a real
  duplicate row under the new key, not recover a lost one. Confirmed excluded in the script's
  own output.
- `outcome = 'rejected'` + `outcome_detail` starting `Decided "accepted" but the
  university_programs insert failed: duplicate key value violates unique constraint
  "university_programs_dedup_idx"`: **11 rows** — 8 University of Bologna, 3 University of
  Padua.

**Replay set: 64 records** (53 + 11), matching the brief's own count exactly.

## Live state re-verified immediately before building the candidate pool

1,019 universities, 5,278 existing `university_programs` rows — re-fetched fresh in this run,
not reused from any earlier session's snapshot.

## Dry-run result

```
Outcome breakdown: { accepted: 64 }
```

**All 64 candidates resolve to `accepted` against current live state. Zero divergence, zero
collisions.** Specifically addressing the two things flagged to watch for:

- **Northern Cyprus vs. main-campus collisions**: none. Every Northern-Cyprus-suffixed METU
  record (e.g. "Aerospace Engineering (METU Northern Cyprus Campus)") normalizes to a name
  distinct from its main-campus counterpart ("Aerospace Engineering"), so they were never going
  to collide on name regardless of URL — confirmed empirically by the accepted:64 result, not
  just reasoned about in advance.
- **Collisions with rows other lanes have inserted since the original run**: none. The live
  `university_programs` count (5,278) matches this investigation's own measurement from earlier
  today, and every one of the 64 candidates cleared `decideIngestion()` against that current
  state.

No record stayed rejected for a different, correct reason this time — the result is a clean
64/64, not a partial recovery. Reporting that plainly rather than looking for a reason to
qualify it.

## What happens next

**Not yet applied.** Per procedure, standing by for explicit go-ahead before running
`scripts/replay-program-rejections-0053.ts -- --apply`, which will:

- Insert up to 64 new rows into `university_programs`.
- Write a full `program_research_queue` audit row for every replayed record under a new
  `batch_id` (`replay-program-rejections-0053_<date>`), linking back to the original rejection
  via the same `research_program_id` — two queue rows per record (original rejection, replay
  acceptance), never overwriting the first.

Will report landed-vs-predicted after applying, and investigate/report any divergence between
the dry run's prediction and the real insert (the DB's own constraints are the final word, the
same posture the original ingest run and this whole investigation have taken throughout).

## Files

- `scripts/replay-program-rejections-0053.ts` — new.
- This file.
