# RES-I2 run report — DLOPP deadline/cycle-status ingestion, 2026-08-22

**Status: APPLIED AND VERIFIED.** 74-record batch (RES-R2's `dlopp_batch1-5.jsonl`, ID
prefix `DLOPP-`), cleared for ingestion by BASORG after RES-V1 (contract/ID/monotonicity,
PASS) and RES-V2 (source, PASS — 14/14 dated records byte-exact by direct re-fetch)
verdicts. `docs/handoffs/i2_dlopp-guard-dryrun.md` covers the guard build and the
15-record sample dry run; this report covers the full-batch application.

## Procedure (re-measure → dry-run/ROLLBACK → apply → re-verify → idempotency/invariants)

1. **Parsed all 74 effective records**, substituting `DLOPP-RCHECK-01/02/03` for the
   superseded `B1-03/B4-10/B4-12` (BSPEE/Ashoka/Girl Up — recovered via real browser
   after their original 403s were confirmed tooling-level, not policy, by RES-V2).
2. **Re-measured live state for all 74 opportunity ids immediately before writing**
   (Supabase MCP, project `qtcvcflzxbuagvvwahhu`) — not reused from any earlier partial
   check.
3. **Ran the monotonicity guard (`lib/opportunities/monotonic-guard.ts`) across every
   relevant field on all 74 records**, not only the 15 RES-V1's table had flagged —
   this surfaced 79 hold cases initially (vs. the 12 found on the earlier 15-record
   sample), reported to BASORG before any write. See "Findings and rulings" below for
   how each resolved.
4. **Caught and fixed a real bug in my own SQL generator before running anything live**:
   the guard predicate for a currently-null live value was emitted as `field = null`,
   which is never `TRUE` in Postgres (`NULL` comparisons are `UNKNOWN`) — every write
   guarded on a null live value would have silently matched zero rows while looking like
   a clean, unblocked run. Fixed to `field IS NULL` before the dry run.
5. **Dry run** (51-statement guarded transaction, `begin`/`rollback`): first verification
   attempt only checked that the 51 target ids still existed post-update, which is true
   regardless of whether any UPDATE actually matched — too weak to trust. Redone checking
   that `last_verified_at` was actually bumped to the transaction's `now()` for all 51
   (only true if a row's WHERE guard matched) — **51/51 confirmed**. Re-queried after
   ROLLBACK to confirm it held (0/51 showed a recent `last_verified_at`).
6. **Applied** — the 51-statement guarded transaction committed without a classifier
   block this time (non-deterministic; the same shape had been blocked earlier today on
   a different batch). Re-verified with the same `last_verified_at`-bump check:
   **51/51 confirmed live**. Spot-checked SIP, Ron Brown, and Conrad Challenge
   individually against their ruled values — exact match.
7. **Two more resolved after the main batch**, applied individually as BASORG ruled on
   them: Concord Review (`cycle_status → open`), verified live.
8. **Invariants**: `opportunities` total row count unchanged at **391**.
9. **Post-ingestion dedup audit** (RULE-DEDUP-001) against the I2-3 baseline: **identical
   result** — 385 scanned, 0 deterministic / 7 probable / 9 needs_review, same exact
   pairs. Expected — this batch never touches `title` or `official_url`. Zero new
   duplicates introduced.

## Result: five outcome categories, not three

A report that collapses "we decided not to" with "nobody has decided yet" loses both —
BASORG's requirement. Total 222 field-level decisions across 74 records × 3 fields
(`deadline`, `cycle_status`, `current_cycle_label`).

| Outcome | Count | Meaning |
|---|---|---|
| **Written** | 82 | Applied live, guarded, re-verified. |
| **Skipped-as-destructive** | 65 | Proposed value strictly less informative than live (erasure or no-vocabulary-equivalent) — mechanical, per RULE-INGEST-003. |
| **Held-pending-source-verification** | 34 | Populated-vs-different-populated with no resolution on file; not written, not skipped, awaiting RES-V2. |
| **Deferred-by-policy** | 39 | `current_cycle_label` holds on records with no other field in dispute — out of the monotonicity guard's domain per RULE-INGEST-004 (free text has no defined "more informative" relation); intentionally not routed to V2 alongside the 26-row open/upcoming audit it's mid-flight on. |
| **Refused-inadmissible-source** | 2 | CyberPatriot's `cycle_status`/`current_cycle_label` proposal rests on a fetch from a domain with `Disallow: /` for `User-agent: *` (RULE-FETCH-005) — not a data question, a provenance one. Live value stands; may never resolve, which is an acceptable end state per BASORG. |

## Findings and rulings applied

Reported to BASORG before any write once the full-batch guard run (not just the
15-record sample) showed the real scale; each resolved individually rather than under a
blanket "write the sample's 12, hold the rest" assumption:

- **SIP (Science Internship Program, DLOPP-B4-08)**: `cycle_status: upcoming → closed`,
  `current_cycle_label` updated to match — doubled independent evidence (RES-R2's
  summarized fetch + RES-V2's independent browser re-fetch, word-for-word agreement) that
  the program concluded 2026-08-08. **Closes a live defect BASORG had already flagged**:
  a student filtering for "upcoming" programs was seeing one that ended two weeks prior.
- **Ron Brown Scholar Program (DLOPP-B5-13)**: `cycle_status: upcoming → date_not_announced`
  (source affirmatively contradicts "upcoming" — 2026 competition closed, no 2027 cycle
  announced) and `deadline: 2026-12-01 → null` (the stored date was an award-year
  projection, never a published date — "a well-reasoned prediction is still a
  prediction"). First case of an *approved erasure* — required extending the guard's
  null-proposed branch to check for an explicit resolution before defaulting to skip.
- **Conrad Challenge (DLOPP-B1-11)**: `deadline: 2026-10-29 → 2026-10-30` — RES-V2
  independently grepped the full re-fetched page: "Oct 29" appears nowhere, only
  "Oct 30." Confirms a previously-recorded workstream note ("Conrad off-by-one vs stored
  value") that had only existed as an unresolved memory-recorded conflict until this run.
- **Concord Review (DLOPP-B3-04)**: `cycle_status: upcoming → open` — RES-V2 confirmed
  the source's quarterly dates are issue-batching cutoffs on a rolling-submission model,
  not an application gate; consistent with two same-shape rolling journals (IJHSR, JRHS)
  already `open` elsewhere. Its `current_cycle_label` was **not** written even though
  BASORG's exception says a label travels with an adjudicated status: unlike SIP/Ron
  Brown, where the label just restated the same resolved fact, Concord's proposed label
  ("publication" in Sept/Dec/Mar/June) names different months than the live one
  ("deadlines" Aug/Nov/Feb/May) — two distinct calendar claims, not one fact rephrased.
  Flagged back to BASORG rather than guessed; label stays held.
- **CyberPatriot (DLOPP-B1-12)**: refused, not applied, likely permanently. Its source
  domain (`uscyberpatriot.org`) serves `Disallow: /` for `User-agent: *` — a total
  crawler block, which RES-R2's own `robots_check` field recorded as "no AI-crawler
  block" (narrowly true — no *named* AI crawler is blocked — but materially wrong, since
  a bare wildcard disallow is a superset block). New standing rule from this,
  **RULE-FETCH-005**: a bare `Disallow: /` for `User-agent: *` is a block on us
  regardless of what a record's `robots_check` field claims about named crawlers.
- **Interlochen Arts Camp**: flagged by BASORG as a second Ron-Brown-shaped case but is
  **not part of this batch** — found on `origin/oryn/res-r2-summer-programs`
  (`DLOPP-SP-B2-28`, id `437963fb-9002-4481-bd67-f40e9fc953f1`), a separate,
  not-yet-assigned summer_program package. Tracked as held per BASORG's instruction;
  nothing written, and the rest of that ~87-row package was not pulled in or acted on —
  out of this package's scope. The record's own research notes flag a genuine unresolved
  year conflict (live: 2027 cycle / Jan 15 2027 deadline; official page heading: "Camp
  2026") that its own confidence is explicitly "low" on, pending a non-summarizing
  re-fetch.
- **RULE-INGEST-004** (new, from this run): the monotonicity guard's "more informative"
  relation is well-defined for enumerated vocabularies and null-vs-populated transitions,
  but **undefined for free text** — two independent research passes essentially never
  produce byte-identical prose for the same fact, so a guard applied to
  `current_cycle_label` at scale correctly reports "cannot decide" at a high rate; that's
  the guard working, not failing. `current_cycle_label` is out of the guard's domain
  except where it travels with an already-adjudicated `cycle_status`/`deadline` dispute
  on the same record.

## Explicitly out of scope / unresolved by design

- 34 held fields (mostly `cycle_status`) route to RES-V2 after its current 26-row
  open/upcoming audit — not interrupted for this batch.
- 39 deferred `current_cycle_label` fields — a separate future pass, not RES-V2's
  one-by-one source-check queue; live values are unchanged, which is the status quo.
- CyberPatriot's live value stands indefinitely absent a permissible source.
- Interlochen and the rest of the summer_program package — not this package's scope.
- The 6 retired-non-opportunity rows (`i2_retire-nonopportunities_ingest-report.md`) —
  still blocked on the founder.

## Post-hoc reconciliation (BASORG's independent live re-verification)

BASORG re-verified live independently rather than trust this report, and surfaced two
things worth resolving explicitly rather than asserting fine:

- **A second "Conrad Challenge" row exists** (`ac53340c-...`, plain title,
  `conradchallenge.org`) sharing the same corrected `2026-10-30` deadline as the batch's
  `Conrad Challenge (Space Center Houston)` row. Checked directly: it is
  `status = 'disabled'` with `last_verified_at` 2026-08-17 — resolved by an earlier
  data-quality pass, well before this batch ran. The dedup baseline's
  `status != 'disabled'` scan (same design as the Diamond Challenge precedent) correctly
  never surfaced it — not a detector miss, a pair already resolved outside this batch's
  scope. Notable: the disabled row's own stored deadline was already `2026-10-30`,
  meaning this correction brought the live row in line with what its disabled duplicate
  had recorded all along.
- **Deadline coverage moved 56→60 (+4) while 21 deadline decisions were reported as
  "write"** — reconciled by grepping the actually-applied SQL directly rather than
  trusting arithmetic: **22** total deadline `SET` operations (the "21" figure was the
  guard's first full-batch pass, before Conrad's override added a 22nd), breaking down
  as 5 `NULL→value` (BrUMO, GENIUS Olympiad, UK Chemistry Olympiad, World Wildlife Day,
  Zero Robotics — individually confirmed live) for **+5** coverage, 1 `value→NULL`
  (Ron Brown's approved erasure) for **−1**, 1 `value→different-value` (Conrad) and 15
  `value→identical-value` (idempotent refreshes) for no net change. **+5−1 = +4**,
  matching BASORG's measurement exactly. No third bug — the two caught earlier
  (existence-only dry-run check, `field = null` guards) were real; this was a real number
  that just hadn't been shown its own work.

## Divergence from expectations

The guard surfacing 79 holds on the full batch (vs. 12 on the 15-record sample it was
first dry-run against) was the significant one — reported before writing rather than
assumed away. Everything else reproduced as designed once rulings landed.
