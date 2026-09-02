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
| `2026-09-02-run1-sonnet.log` | claude-sonnet-5 | **Referenced below but not actually present in this directory as of `oryn/density-prompt-2026-09-02` — see the note under this table before trusting the table.** The 325/360 baseline every later run compares against. $0.3388. |
| `2026-09-02-run2-haiku.log` | claude-haiku-4-5 | **Same gap as run1 — described here, not actually in the tree.** 315/360. The free-tier feasibility question. $0.078. Its one deterministic "failure" was a checker bug, fixed in `b7c955b8`. |
| `2026-09-02-run3-sonnet-empty-slot-permission.log` | claude-sonnet-5 | 323/360. Recovered from a session scratchpad and added here (`oryn/density-prompt-2026-09-02`) — this is the run this README's own "third run... raw log was not preserved" line used to describe; that line is now wrong and left below only as history. |
| `2026-09-02-run4-sonnet-density-instruction.log` | claude-sonnet-5 | 317/360. Tests a sentence-density-specific instruction (distinct from brevity and from permission-to-omit) against `concise` specifically — `concise` mean 4.08, identical to every prior run. See `docs/advisor-reply-length-investigation-2026-09-02.md`. |

**This table described run1/run2 as present from the moment this file was created
(`e5a59e9f`) — they were never actually committed.** `.gitignore:14` has a blanket `*.log`
rule with no carve-out for this directory; a plain `git add docs/eval-runs/` silently drops
ignored files inside a directory add rather than erroring (confirmed directly: the
equivalent `git add <explicit-file>.log` errors loudly instead — this looks like exactly
that difference), so the README shipped describing two files that don't exist in the
tracked tree. `git ls-tree -r origin/main -- docs/eval-runs/` before this commit showed
only this README. Run3 and run4 above are added with `git add -f` specifically to not
repeat that. **Run1 and run2 have since been recovered and force-added** by the session that ran
them — the logs were still in its own scratchpad, so "not recoverable" was true from where
it was written and false in general. Flagging it precisely rather than quietly re-adding two
placeholder rows was the right call either way: it was what made the recovery happen.

**The rule this leaves behind: `git add -f` for every file in this directory.** The blanket
`*.log` ignore stays, because build and dev-server logs genuinely should not be tracked.
Anything landing here is deliberate, so it should have to say so.

A third run (`oryn/empty-slot-prompt`, 323/360) was reported in prose before this directory
existed; its raw log was not preserved *by that point in time*. That specific gap is now
closed — see run3 above — this paragraph is kept only so the history reads honestly rather
than being quietly edited away.

**Reading them.** `grep -E "concise=|\[ok\]|\[FAIL\]"` gets the per-case line. Rubric fields
are `specific`, `concise`, `analytical`, `calm`, `evidenceAware`, `actionOriented`, each 1–5,
plus `discourage` as one of `said_dont_do_this` / `missed_the_opening` / `n/a`.
