# DE/NL batches 12/13/15 — alias replay

Replay of the 566 records that landed as `unresolved_university` in the batch 6–16 apply
(see `program-ingest-de-nl-batch6-16-apply-report.md`), after the coordinating lane added
four `entity_aliases` rows. Applied 2026-08-21 against project `qtcvcflzxbuagvvwahhu`.

## Pre-flight

Verified the aliases independently before running, rather than taking the handoff on trust:

| Check | Result |
|---|---|
| Four alias rows present, `verified = true` | yes, all created 15:05:58Z |
| Each attached to the right `canonical_entity_id` | yes — the join `universities.canonical_entity_id = entity_aliases.entity_id` returns the intended university for each |
| Alias strings match the files' `university_name` verbatim | yes, exactly |
| Domain evidence in the research files | `uni-freiburg.de` ×228, `uni-goettingen.de` ×215, `tu-darmstadt.de` ×123 — single value per file, no variation |
| Domain matches each live row's `website_url` | yes for all three |
| Live baseline before run | 9,423-precursor state: 8,857 programmes / 124 universities / 454 alias rows / **0** programmes at the three universities |

The `resolveIdentity` alias step is step 5, after exact and variant matching, and requires a
single candidate. Both Darmstadt aliases point at the same university row, so the extra bare
variant does not make the match ambiguous.

## Dry run: 566 accepted, nothing in any other class

| File | Records | accepted | duplicate | unresolved | insufficient |
|---|---:|---:|---:|---:|---:|
| `de_nl_batch12_freiburg` | 228 | 228 | 0 | 0 | 0 |
| `de_nl_batch13_gottingen` | 215 | 215 | 0 | 0 | 0 |
| `de_nl_batch15_darmstadt` | 123 | 123 | 0 | 0 | 0 |
| **Total** | **566** | **566** | **0** | **0** | **0** |

Worth recording because it was not a foregone conclusion: `decideIngestion` returns
`unresolved_university` **before** the evidence gates, so these 566 records had never been
evidence-checked at all. The replay ran them through source-authority resolution and
`looksPageConfirmed()` for the first time, and all 566 cleared both. Had they carried the same
prose vocabulary as UvA and VU Amsterdam, the aliases alone would not have been enough.

## Result: landed exactly as predicted

`university_programs`: **8,857 → 9,423** (+566). Distinct universities: **124 → 127** (+3).

Verified from the database, not the script's stdout:

| Check | Result |
|---|---|
| Total `university_programs` rows | 9,423 |
| Delta vs. pre-run baseline | +566 — exactly the accepted count |
| Distinct universities | 127 |
| Programmes at the three universities | 0 → **566** |
| `outcome = 'accepted'` in the replay | 566 |
| Any other outcome class | 0 |
| Distinct `research_program_id` | 566 — nothing processed twice |
| Distinct `promoted_program_id` | 566 — one programme row per accepted record |
| Dangling `promoted_program_id` (anti-join) | 0 |

| University (live name) | Before | After |
|---|---:|---:|
| Albert-Ludwigs-Universitaet Freiburg | 0 | 228 |
| University of Göttingen | 0 | 215 |
| Technical University of Darmstadt | 0 | 123 |

## One thing to know when reading the audit table

The replay ran on the same calendar day, and `batch_id` is `<filename>_<date>` — so the replay
wrote under the **same three `batch_id`s** as the original run. Those ids now hold **1,132**
rows: the 566 original `unresolved_university` rows plus 566 new `accepted` rows. Each of the
566 `research_program_id`s therefore appears twice, once per outcome.

That is the append-only audit log working as intended, not double-processing — the programme
rows are 566, `distinct promoted_program_id` is 566, and the table delta was exactly +566.
Anyone counting `program_research_queue` rows per `batch_id` against a file's line count will
see 2× for these three files and should read outcome, not row count.

## DE/NL lane, final state

All 16 files, 3,089 unique records:

| Outcome | Records |
|---|---:|
| accepted | **2,596** |
| insufficient_evidence | 493 |
| unresolved_university | 0 outstanding (566 rows retained as superseded history) |
| duplicate | 0 |

2,596 + 493 = 3,089 — every record in the lane has a final state and none was lost.

The 493 outstanding `insufficient_evidence` records (491 from batches 6–16, 2 from batches
1–5) are untouched by design: 489 are UvA and VU Amsterdam, blocked by the
`looksPageConfirmed()` vocabulary gate rather than by weak evidence, and that decision belongs
to the handoff-contract owner. The remaining 4 are genuine — those records state outright that
no factsheet could be retrieved.

## Not done

- No further aliases, university rows, or schema changes.
- No research file modified; no field normalised.
- `nameKey()`'s missing ä→ae transliteration was **not** fixed here — logged by the
  coordinating lane as a code item. It will recur for any German, Turkish or Scandinavian
  institution stored in one convention and researched in the other.
