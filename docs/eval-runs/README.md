# Raw eval run logs

Per-case output from `npm run eval:ai --live --confirm-spend --judge`, kept verbatim.

**Why these exist.** Until 2026-09-02 only summary prose survived a run — the per-case rubric
scores lived in a terminal buffer and were gone. That cost something concrete: a claim about
how `concise` varied by surface could not be checked against the runs it was drawn from, and
the person who tried was right to refuse to assert either way. The claim turned out to be
**backwards**, and the data that disproved it was sitting in a scratchpad nobody else could
reach.

So: raw logs land here. A comparison across runs is only possible if the runs are still
readable.

**What's in them.** Fixture students only — `lib/ai/eval/fixtures.ts` builds two synthetic
profiles. No real student data reaches these files, which is why they can live in the repo.

| file | model | notes |
|---|---|---|
| `2026-09-02-run1-sonnet.log` | claude-sonnet-5 | The 325/360 baseline every later run compares against. $0.3388. |
| `2026-09-02-run2-haiku.log` | claude-haiku-4-5 | 315/360. The free-tier feasibility question. $0.078. Its one deterministic "failure" was a checker bug, fixed in `b7c955b8`. |

A third run (`oryn/empty-slot-prompt`, 323/360) was reported in prose before this directory
existed; its raw log was not preserved. That gap is the reason for this README.

**Reading them.** `grep -E "concise=|\[ok\]|\[FAIL\]"` gets the per-case line. Rubric fields
are `specific`, `concise`, `analytical`, `calm`, `evidenceAware`, `actionOriented`, each 1–5,
plus `discourage` as one of `said_dont_do_this` / `missed_the_opening` / `n/a`.
