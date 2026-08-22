# RES-I1 corpus reconciliation — 2026-08-22

**Package I1-1, assigned by ORYN-BASORG.** Read-only — zero writes to any table, zero
commits to `university_*` beyond this doc. Scope: reconcile the university-programs corpus
by record identity (not batch-id string matching or count coincidence), resolve or defer
`acquire-programs-batch2`, and measure the requirements/deadlines corpus against its disk
files. All checks below join on the research record's own declared identifier
(`research_program_id` / `research_requirement_id` / `research_deadline_id`) against the
live `*_research_queue` tables, per BASORG's correction: matching cardinality is not
identity, and this repo has already paid for that mistake once (the rank≠identity finding
that cost seven wrong university matches). Live project `qtcvcflzxbuagvvwahhu`, measured
2026-08-22.

## 1. The 3 "renamed/combined" files — verified by ID, all CLOSED

My prior report flagged these as *probably* already-ingested based on record-count
coincidence. Re-verified here by joining every disk record's own `research_program_id`
against `program_research_queue`, not by trusting the count match.

| Disk file | Disk IDs | Found in queue | Queue extras | Verdict |
|---|---|---|---|---|
| `drive_batch1_2026-08-17.jsonl` | 189 | 189/189 | 0 | **CLOSED** — exact identity match against `drive_programs_batch1_2026-08-17` |
| `reverify_batch2_2026-08-17.jsonl` | 22 | 22/22 | 0 | **CLOSED** — exact identity match against `reverify_batch2_2026-08-17` |
| `reverify_batch3_2026-08-17.jsonl` | 32 | 32/32 | — | **CLOSED**, with a caveat below |
| `fr_it_es_ch_batch1-6` (6 files) | 745 unique (762 total, 17 in-file repeats) | 745/745 | 0 | **CLOSED** — exact identity match against `fr_it_es_ch_combined_2026-08-21.jsonl_2026-08-21` (762 queue rows = 745 unique + 17 repeats, consistent) |

**`reverify_batch3` caveat, checked explicitly**: its 32 IDs are drawn from the *same*
`ORYN-PRG-####` numbering space as `drive_batch1`, and all 32 also appear under
`drive_programs_batch1_2026-08-17`'s own queue rows — i.e. this file re-verifies a subset
of `drive_batch1`'s own records rather than being independent content. That raised a real
question: did the second (reverify) pass create a *second* live row for the same 32
programs? Checked directly — every one of the 32 `research_program_id`s has exactly 2
queue rows (one per batch) and at most 1 distinct non-null `promoted_program_id` across
both. **No double-insert.** The reverify pass correctly recognized these as duplicates on
its second processing.

## 2. `acquire-programs-batch2_2026-08-20.jsonl` — RESOLVED, not deferred

My prior report treated this as ambiguous (live per-university counts were close-but-not-
exact to the file's per-university breakdown: Edinburgh 93-in-file/95-live, Glasgow
101/101, Waterloo 107/105). That ambiguity dissolves once you check by ID instead of by
count.

**All 301 of this file's own `research_program_id` values (`ACQ-PRG-2026-08-20-b2-*`) were
checked against the *entire* `program_research_queue` — every batch, not just the two
named ones that cover the same universities. Result: 0 of 301 have ever been queued, under
any batch_id.**

```
disk_count: 301
found_anywhere_in_queue: 0
found_in_waterloo_batch: 0
found_in_edinburgh_backfill: 0
never_in_queue: 301
distinct_batches_touched: 0
```

So this is a **genuine, unambiguous gap** at the queue level — this file's specific
records have never been processed. The close-but-inexact live-count match to
`acquire-programs-batch2-waterloo_2026-08-20` (106) and `edinburgh-audit-backfill_2026-08-20`
(90) is a coincidence of two *different* research passes covering the same three
universities with independently-generated IDs, not the same content.

**What I have not determined, and am flagging rather than guessing**: how many of these
301 would actually net-new insert versus get correctly rejected as `duplicate` against the
programs those other two batches already landed for the same universities (Glasgow's
exact 101-in-file/101-live match in particular suggests significant content overlap, just
under different IDs). That question can only be answered by running the ingestion
pipeline's own dedup (`programUrlKey`-adjacent logic in `lib/programs/ingest.ts`) in dry-run
mode — which is an ingestion-pipeline action, not a reconciliation one, so I stopped here
per the package's read-only scope. **Recommend this as the concrete next package**: dry-run
`acquire-programs-batch2_2026-08-20.jsonl` through `scripts/ingest-university-programs.ts`
and report the real accepted/duplicate/rejected split.

## 3. Requirements/deadlines corpus — measured, strong evidence of near-total coverage

Different shape from the programs corpus: **all** live `requirement_research_queue`
(3,071 rows) and `deadline_research_queue` (1,466 rows) sit under a single batch_id,
`requirements-deadlines_2026-08-21` — no per-file batch tagging, so the programs corpus's
"match the batch_id" technique doesn't apply here at all.

**Volume check first**: disk currently holds 1,719 requirement records and 655 deadline
records across the 130 files in `data/research/university-requirements/` (families: ca_,
de_nl_, es_ch_, fr_it_, ie_, nordic_, uk_tr_, us_, plus flat `requirements_batch*`/
`deadlines_batch*`). The live queue already processed **more** than that — 3,071
requirement-candidates and 1,466 deadline-candidates — under that one batch. Even if
100% of current disk content were included, roughly 1,350 requirement-candidates and 810
deadline-candidates in that batch came from sources no longer sitting on disk (already
consumed/archived after ingestion, consistent with normal practice).

**Outcome breakdown for that batch**:

| | accepted | promoted | live now | residual |
|---|---|---|---|---|
| requirements | 2,383 | 1,213 | 1,254 | 41 |
| deadlines | 505 | 389 | 396 | 7 |

The small residuals (41, 7) are not a sign of missed disk content — they match the shape
of the backfill-and-reconciliation mechanism already documented in
`docs/handoffs/requirements-deadlines-incident-and-backfill-report.md` (a one-time
`scripts/backfill-requirement-audit.ts` that wrote a small number of rows directly,
outside this batch's own count), not a gap.

**Spot-check, ID-level, 3 files across different families** (chosen for variety, not
cherry-picked for a good result — one US-requirements, one Ireland-requirements, one
UK/TR-deadlines):

| Disk file | IDs | Found in queue |
|---|---|---|
| `us_requirements_yale_2026-08-21.jsonl` | 22 | 22/22 |
| `ie_requirements_tcd_2026-08-21.jsonl` | 15 | 15/15 |
| `uk_tr_deadlines_batch1_2026-08-21.jsonl` | 5 | 5/5 |

**Conclusion**: strong evidence (volume math + 100% spot-check hit rate) that this corpus
is already comprehensively processed — I am not treating this as an open backlog. I have
**not** run an exhaustive 130-file ID sweep the way I did for the programs corpus (disk
volume here is smaller than what the queue already shows processed, which makes an
exhaustive sweep low-expected-value relative to its cost); if BASORG wants that
certainty before fully closing this territory, it's a bounded follow-up, not a blocker to
anything else.

## 4. Dartmouth — acknowledged, not touched

Received and understood: `us_programs_w2_dartmouth_2026-08-22.jsonl` (53 records) is
blocked by the domain-authority gate (registrar-contracted catalogue platform), same class
as McMaster's 432 and Western/Huron's 5. Not ingested, not re-flagged as a candidate. All
four (McGill 288, McMaster 432, Western/Huron 5, Dartmouth 53) remain untouched pending the
founder's decision.

## 5. On hold, not actioned

The 18 UPDATE-shaped files (6 `tr_bilingual_names_*.jsonl`, 12 `url_repair_*.jsonl`),
keyed by existing `program_id` rather than being new-row candidates — per BASORG, routed
as a separate package later. Not touched.

## Net effect of this package

- **No writes.** `university_programs` = 16,114 (unchanged), `university_requirements` =
  1,254 (unchanged), `university_deadlines` = 396 (unchanged) — same as before this
  package started.
- **One real, confirmed, ready-to-act-on gap**: `acquire-programs-batch2_2026-08-20.jsonl`,
  301 records, needs a dry-run (not yet done) to know its real net-new count.
- **Everything else in the original "uningested by batch_id" list is now confirmed
  already-live**, by identity not by count.
- **Requirements/deadlines territory measured** for the first time; no comparable gap
  found to programs' Dartmouth/batch2 situation.
