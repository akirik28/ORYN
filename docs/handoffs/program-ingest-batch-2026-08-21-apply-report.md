# 20-file ingestion backlog — applied

Branch `oryn/program-ingest-batch`. Applied 2026-08-21, one `batch_id` per file (see dry-run
report for the full list). Full gate clean: lint 0, typecheck 0, test 1278/1278, build
succeeds.

## Result: landed exactly as predicted

`university_programs`: **5,342 → 7,657** (+2,315), distinct universities: **109 → 122** (+13).
All verified directly against the live database:

| Check | Result |
|---|---|
| Total `university_programs` rows | 7,657 |
| `program_research_queue` audit rows across all 20 batch_ids | 2,383 |
| Of those, `outcome = 'accepted'` | 2,315 |
| Dangling `promoted_program_id` values (anti-join) | 0 |

Matches the dry run's prediction exactly: 2,315 accepted, 61 duplicate, 2
`insufficient_evidence`, 5 `unresolved_university`. Zero divergence between predicted and
landed.

This run used the code as already dry-run-validated (the pre-0054, five-column key) — migration
0054 (degree_type) went live mid-run, applied by the coordination session while this run was
already partway through de_nl/independent_batch30-31. Decided not to interrupt an in-flight
database write to restart with updated code: the recovery path (finish, then replay the
residual) is proven (today's earlier 64-record replay), the interruption path (confirm a clean
kill, check for a half-processed file) is not. So the 61 duplicates (58 Durham/Southampton,
3 Istanbul University) landed as audited, not inserted, exactly as the dry run predicted —
recoverable via a follow-up replay now that 0054 is live, same pattern as the 0053 replay
earlier today.

## Next

Replaying the 58 Durham/Southampton records against the now-live 0054 key (separate report).
The 3 Istanbul University records stay audited and untouched, per instruction — no key shape
resolves them.

## Files

- `scripts/ingest-university-programs-batch.ts` — unchanged from the dry-run commit, run as-is
  with `--apply`.
- `docs/handoffs/program-ingest-batch-2026-08-21-dry-run-report.md` — prior commit.
- This file.
