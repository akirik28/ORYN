# Replay of migration-0053-unblocked rejections — applied

Branch `oryn/program-replay`. Applied 2026-08-21 (`batch_id =
'replay-program-rejections-0053_2026-08-21'`). Full gate clean: lint 0, typecheck 0, test
1278/1278, build succeeds.

## Result: landed exactly as predicted

`university_programs`: **5,278 → 5,342** (+64), matching the predicted count exactly. All
verified directly against the live database, not taken from the script's own stdout:

| Check | Result |
|---|---|
| Total `university_programs` rows | 5,342 |
| `program_research_queue` rows under the new `batch_id` | 64 |
| Of those, `outcome = 'accepted'` | 64 |
| Rows missing a `promoted_program_id` | 0 |
| `promoted_program_id` values that don't resolve to a real row (dangling) | 0 |

64/64 landed, zero orphans, zero divergence from the dry run's prediction.

## A genuine finding surfaced while verifying the `research_program_id` linkage

Checking the specific traceability the brief asked for ("linked back to the original rejection
via `research_program_id`... makes the whole arc legible later") surfaced something worth
recording precisely, separate from the (successful) apply itself:

**For all 53 METU records, `research_program_id` is a clean 1:1 identifier** — each replayed
record's id is unique to it in the source corpus, confirmed by checking how many distinct
`official_program_url` values share each id (all = 1).

**For all 11 Bologna/Padua records, `research_program_id` is NOT 1:1 with a real-world
programme in the source corpus that produced them** (`fr_it_es_ch_combined_2026-08-21.jsonl`).
Every one of the 9 distinct ids underlying these 11 rows is shared with at least one other
record carrying a genuinely different `official_program_url` — 2 distinct URLs in most cases,
up to 4 for one id (`PRIO-2026-08-21-f51782be`, Bologna's "Medicine and Surgery": URLs ending
`/6264`, `/6731`, `/6732`, `/6733` all share this one id). Example traced end to end:
`PRIO-2026-08-21-aecae7bb` has two rows in the original batch — one accepted at
`.../6677` ("Mechanical Engineering", promoted to a live row already), one rejected at
`.../6680` (also "Mechanical Engineering", a different campus page) — both genuinely real,
distinct programmes, both now correctly present as separate `university_programs` rows.

**This is not a defect in the replay or in migration 0053** — `decideIngestion()` never reads
`research_program_id`; it keys on university + name + degree + language + url, so the id
collision never affected which rows were created or how they were distinguished. Both
verification queries above (orphan/dangling checks) came back clean. This is a
pre-existing characteristic of that research batch's own id-generation: it appears
`research_program_id` was assigned per programme-name-and-degree combination rather than per
physical instance, so the same campus-multiplicity that made the pre-0053 database key too
coarse (the whole reason this migration exists) made that batch's own `research_program_id`
scheme too coarse in exactly the same way, independently, in a different layer.

**Practical consequence, stated plainly:** a future reader querying "show me everything that
happened to `research_program_id = X`" for one of these 9 ids will see 2-4 different real
programmes' histories interleaved, not one programme's clean arc. Not fixed here — this is the
source research batch's own id scheme, a different lane's artifact, not something to patch
retroactively from this branch. Flagging it precisely rather than either silently working
around it or letting it pass unremarked, since it directly affects how legible the audit trail
the brief cared about actually is for this one population.

## Files

- `docs/handoffs/program-replay-0053-dry-run-report.md` — dry-run report (prior commit).
- This file.

No code changes in this step — `scripts/replay-program-rejections-0053.ts` was committed
unchanged in the dry-run commit and run as-is with `--apply`.
