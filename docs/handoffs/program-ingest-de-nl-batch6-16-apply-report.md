# DE/NL batches 6–16 (2,199 records) — applied

Applied 2026-08-21 against project `qtcvcflzxbuagvvwahhu`, one `batch_id` per file
(`<filename>_2026-08-21`). Completes the DE/NL programme-catalogue lane: 890 records
(batches 1–5, earlier today) + 2,199 (this wave) = 3,089 across 16 files.

See `program-ingest-de-nl-batch6-16-dry-run-report.md` for pre-flight verification and the
three findings; this report covers what actually landed.

## Result: landed exactly as predicted, well below the estimated volume

`university_programs`: **7,715 → 8,857** (+1,142). Distinct universities: **122 → 124** (+2).

All figures below read from the database directly, not from the script's stdout:

| Check | Result |
|---|---|
| Total `university_programs` rows | 8,857 |
| Delta vs. pre-run baseline | +1,142 — exactly the accepted count, so no other lane wrote during the window |
| Distinct universities with programmes | 124 |
| Audit rows across the 11 `batch_id`s | 2,199 — every input record audited, none lost |
| Distinct `research_program_id` in those rows | 2,199 — nothing processed twice |
| `outcome = 'accepted'` | 1,142 |
| `outcome = 'duplicate'` | 0 |
| `outcome = 'unresolved_university'` | 566 |
| `outcome = 'insufficient_evidence'` | 491 |
| Dangling `promoted_program_id` (anti-join) | 0 |
| Accepted rows missing a `promoted_program_id` | 0 |
| Distinct `promoted_program_id` per file | equals that file's accepted count, every file |

Per-file, verified from `program_research_queue`:

| File | Records | accepted | dup | unresolved | insufficient |
|---|---:|---:|---:|---:|---:|
| `de_nl_batch6_erasmus` | 148 | 147 | 0 | 0 | 1 |
| `de_nl_batch7_tilburg` | 123 | 123 | 0 | 0 | 0 |
| `de_nl_batch8_uva` | 326 | 0 | 0 | 0 | 326 |
| `de_nl_batch9_groningen` | 186 | 186 | 0 | 0 | 0 |
| `de_nl_batch10_vuamsterdam` | 163 | 0 | 0 | 0 | 163 |
| `de_nl_batch11_humboldt` | 321 | 321 | 0 | 0 | 0 |
| `de_nl_batch12_freiburg` | 228 | 0 | 0 | 228 | 0 |
| `de_nl_batch13_gottingen` | 215 | 0 | 0 | 215 | 0 |
| `de_nl_batch14_hamburg` | 198 | 197 | 0 | 0 | 1 |
| `de_nl_batch15_darmstadt` | 123 | 0 | 0 | 123 | 0 |
| `de_nl_batch16_stuttgart` | 168 | 168 | 0 | 0 | 0 |
| **Total** | **2,199** | **1,142** | **0** | **566** | **491** |

Zero divergence between the dry run's prediction and what landed.

## Divergence from the estimate — the real number is 8,857, not 9,500–9,900

The task estimated landing near 9,500–9,900 and adding roughly 10 universities. Actual:
**8,857 and +2**. The estimate assumed all 2,199 records would attach; 1,057 did not, for two
reasons already detailed in the dry-run report:

- **566 unresolved** — Freiburg, Göttingen and Darmstadt exist in `universities` under
  different names (`Albert-Ludwigs-Universitaet Freiburg`, `University of Göttingen`,
  `Technical University of Darmstadt`) with no alias rows. Three alias rows would recover all
  566 in a replay. Not created here: canonical-entity territory, explicitly out of scope.
- **491 insufficient_evidence** — 489 of them are UvA (326) and VU Amsterdam (163), both
  sourced from the universities' own official APIs but whose `verification_status` prose never
  uses the literal word "verified" that `looksPageConfirmed()` requires. A vocabulary
  mismatch, not weak evidence. Not worked around: editing research files is forbidden and
  widening the evidence gate is a policy decision for the handoff-contract owner.

The "+10 universities" half of the estimate was never reachable regardless: of the 11
universities in this wave, 8 were already in `universities` and 5 of those already had
programmes. Only **Universität Hamburg** (0 → 197) and **Universität Stuttgart** (0 → 168)
were previously uncovered.

Programme counts for the six universities that accepted records:

| University | Before | After |
|---|---:|---:|
| Humboldt-Universität zu Berlin | 3 | 324 |
| Universität Hamburg | 0 | **197** (new) |
| University of Groningen | 4 | 190 |
| Universität Stuttgart | 0 | **168** (new) |
| Erasmus University Rotterdam | 4 | 151 |
| Tilburg University | 4 | 127 |

## Incident: transient HTTP 401 aborted the first apply attempt, before any write

The first `--apply` run exited 1 during the initial load phase
(`fetchExactCount` on `university_programs`, HTTP 401) — after a dry run minutes earlier had
succeeded with the same credentials. Checked and ruled out credential rotation: the on-disk
`.env.local` was byte-identical to the main checkout's and unchanged since 11:13, and four
follow-up probes with the same key all returned HTTP 200.

Verified before retrying that the database was completely untouched — 7,715 / 122 / 7,905
queue rows, zero rows under any of the 11 batch ids. `fetchAllRowsVerified` fails fast during
the load phase, before the write loop, so the retry carried no risk of a partial or duplicated
apply. The retry succeeded end to end (exit 0, no insert errors, no orphaned rows).

Worth noting for whoever owns `lib/acquisition/paginate.ts`: `fetchExactCount` has no retry,
so a single transient 401 during the four concurrent load requests aborts an entire run. Safe,
but it costs a full restart.

## Not done, and why

- **No `universities` rows or `entity_aliases` created** — out of scope for this lane.
- **No research file modified** — sourced evidence.
- **No field normalised.** `language_of_instruction` was left exactly as researched: 11 honest
  nulls, plus real multi-language values (`German and English`, `Dutch, French, English`,
  `German version: German; German-French version: German and French`).
- **The 1,057 non-landed records were not forced through.** Each has an audit row carrying its
  real reason and is replayable.

## Recommended follow-ups (for the lanes that own them)

1. Three `entity_aliases` rows for Freiburg / Göttingen / Darmstadt → replay recovers 566.
2. A decision on whether official-API retrieval satisfies the evidence gate → replay recovers
   489.
3. The 19 pre-existing rows at Erasmus/Tilburg/UvA/Groningen/Humboldt have
   `language_of_instruction = NULL`. Since language is one of the six dedup-key columns, a
   future re-research of those same programmes would not collide and would land a second copy.
