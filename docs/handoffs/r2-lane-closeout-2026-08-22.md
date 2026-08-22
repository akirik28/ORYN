# RES-R2 lane close-out (2026-08-22)

**Lane:** RES-R2 (opportunity deadlines & cycle status) · Reports to ORYN-BASORG.
**Status: closed out for this cycle**, not idle-pending-package — BASORG confirmed no further
research is the right call given the bottleneck this lane's own findings surfaced (see §3).
Reopens only on BASORG's message; this lane does not pick up new scope on its own initiative.

## 1. Full scope worked: 188 rows, three packages, one purge

The RES-R2 brief's complete scope order, all worked:

| package | scope | rows | prefix | branch | PR | status |
|---|---|---|---|---|---|---|
| 1 | competition/scholarship/research/internship/fellowship, `verified_current` | 74 | `DLOPP-` | `oryn/res-r2-opportunity-deadlines` | #13 | **merged**, RES-I2 ingesting |
| 2 | `summer_program`, `verified_current` | 87 | `DLOPP-SP-` | `oryn/res-r2-summer-programs` | #32 | open |
| 3 | remaining categories, `verified_current` | 27 | `DLOPP-P3-` | `oryn/res-r2-remaining-categories` | #41 | open |
| fix | purge, package-1 record on a wildcard-blocked domain | -1 | — | `oryn/res-r2-cyberpatriot-purge` | #40 | open |

Per-package outcome distributions (full detail in each package's own README under
`docs/research/opportunities-deadlines/`):

- **P1** (74): 14 dated_current_cycle, 8 undated_recurring, 21 closed_historical, 26
  nothing_published, 5 deferred (2 genuine robots.txt blocks; 3 turned out to be tooling
  403s, recovered mid-package — see `dlopp_rcheck1.jsonl`). 5 conflicts recorded, never
  resolved.
- **P2** (87): 2 dated_current_cycle, 48 closed_historical, 27 nothing_published, 9 deferred
  net (Koç University recovered mid-package the same way). 8 conflicts recorded.
- **P3** (27): 4 dated_current_cycle, 4 closed_historical, 15 nothing_published, 4 deferred.
  0 conflicts — genuinely zero, not a rounding artifact.

Live-recount at close of every package matched the count at open exactly (74/74, 87/87,
27/27) — no scope drift across the whole exercise.

## 2. The temporal-sanity finding — this lane's most transferable output

The dominant defect shape across all three packages, and the thing whoever researches
deadlines next needs to know before their first fetch: **official pages routinely present
their most-recently-concluded cycle's dates in present-tense "the deadline is X" language
without refreshing for the off-season.** A page saying "applications are open, deadline
March 5" is not evidence of a currently open cycle if March 5 is already months before the
retrieval date — it is a historical fact the page hasn't gotten around to updating.

The rule applied throughout: compare the source's own stated date against the retrieval date
(2026-08-22 for this whole exercise). If the source's date has already elapsed, the finding
is `closed_historical` regardless of the page's tense — this is a deduction from the source's
own stated facts, not synthesized information, and is distinct from (additive to) the
enrollment-year-vs-cycle-year check from the university-programs work.

**The concrete measure of how dominant this is: only 2 of package 2's 87 rows were
genuinely open, future-dated, actionable deadlines** (Tisch Summer High School, Notre Dame
Summer Scholars). Package 3 ran higher (4 of 27) simply because its categories skew toward
rolling/near-term models (volunteering, entrepreneurship) rather than annual academic
calendars. Package 1 found 7 of 74 genuinely open. Across all three packages combined:
**13 of 188 rows (7%) carry a deadline that is actually still actionable today.** The other
93% of `dated_current_cycle`-shaped findings, if taken at face value from source-page tense
alone, would have been wrong.

## 3. The staleness analysis and why it stops here

RES-V2's independent audit (different method: live-value sampling, not source re-fetching)
converged on the same conclusion from the opposite direction: corpus-wide defect rate ~7-8%,
**concentrated in the oldest `updated_at` tier**, not spread evenly. Two lanes, two methods,
one finding: **this is a re-check-cadence problem, not a research-quality problem.** The
research was correct when written; the calendar moved past it.

BASORG assigned a fourth package to re-verify the oldest-tier `deadline`-bearing rows.
Measured live before starting (per standing instruction): 60 rows corpus-wide carry a
populated `deadline`; a defensible tier boundary at `updated_at <= 2026-08-20` isolates 23
rows as "oldest" against the 37-row majority updated in the most recent two days.

**Cross-referencing those 23 IDs against this lane's own P2/P3 batch files — before drafting
a single new fetch — found 22 of the 23 already have fresh RES-R2 research sitting unmerged
in PR #32 and #41**, including the two highest-priority conflicts already flagged
(Yale Young Global Scholars, Interlochen Arts Camp — see §6). The staleness RES-V2 measured
IS the backlog sitting in those two PRs. Re-researching those 22 rows would not be an
independent re-check (independence requires a different session/method, which is RES-V2's
role, not this lane duplicating itself) and would produce nothing but natural-variance noise
between two same-day passes by the same lane.

**Conclusion, escalated by BASORG as a structural finding**: this lane's research output has
outpaced this org's merge-and-ingest throughput. More research does not fix live staleness
that already has a correction waiting — only merging PR #32/#41/#40 and RES-I2 ingesting
them does. That is not a lever this lane holds. Do not re-run this analysis; the 22-of-23
finding does not change until the PRs move.

## 4. Method artifacts (reusable beyond this lane)

- **RULE-FETCH-003** (defer-list gates the fetch call itself, never a post-hoc review):
  the fix for a repeated same-day error (two domains already known-blocked got fetched
  anyway while assembling a batch, twice). The mechanism: build a blocked-domain file from a
  sequential robots.txt pre-check (never interleaved with content fetches — see
  RULE-FETCH-001's ordering constraint), then compute the full fetch/defer dispatch as a
  printed artifact *before* drafting any `WebFetch` call. Package 3 applied this from its
  first fetch: 3 rows gated out with zero fetch attempts — nothing to discard because
  nothing was ever fetched. That is the actual difference between a gate and a review.
- **RULE-FETCH-005, `Host:`-scoping amendment**: a bare `User-agent: * / Disallow: /` regex
  match is a *candidate*, not a finding. `uwc.org`'s robots.txt contains such a match, but
  it's explicitly scoped `Host: uwcstaging.co.uk` — a staging-subdomain directive that says
  nothing about the production domain actually fetched. A mechanical purge on the regex hit
  alone would have destroyed a validly-sourced record. Confirming a wildcard-block finding
  requires reading the raw file for `Host:` scoping (and `Allow:` overrides) before any
  purge — a purge is irreversible destruction of sourced work and gets the same evidence bar
  as a live write.
- **RULE-FETCH-001's three shapes**, used throughout: (1) named-agent robots.txt disallow =
  policy block, defer, never route around; (2) 403/failure with clean robots.txt = tooling
  bot-detection, try a real rendered browser (`browser_render` is a passing retrieval
  method); (3) active challenge-response defense (Cloudflare "Just a moment...") that a real
  browser also hits = defer regardless of what robots.txt says, since solving/evading the
  challenge is the prohibited action, not a convention.
- **The temporal-sanity check** (§2) and the enrollment-year/cycle-year check (inherited from
  the university-programs work) are complementary, not substitutes — several rows across all
  three packages needed both applied simultaneously.

## 5. `academic_program` is empty at `verified_current` — negative finding

The brief named `academic_program` as one of package 3's six scope categories. It
contributes **zero rows**: all 3 `academic_program` rows in the corpus are
`verification_state='unverified'`, not `verified_current`. This was confirmed by direct
live query, not assumed from the brief's category list. Recording it so no successor spends
time hunting for `academic_program` records under `DLOPP-P3-` that were never going to exist.

## 6. Open items with owners (not this lane's to resolve further)

- **Habitat Derneği's Sustainable Livelihoods Train-the-Trainer Program**
  (`2833637b-82bf-459e-afee-3eb355aa3fd0`, `DLOPP-P3-01`): deadline 2026-08-26, four days
  from this handoff's date. Genuinely time-sensitive — needs PR #41 merged and RES-I2
  ingestion inside that window or the finding lapses. BASORG has already flagged this to
  RES-V2 as a single-record priority (slotted between sample batches, not mid-batch, to
  avoid compromising a clean measurement) rather than shortcutting the verification bar to
  meet the deadline pressure — the right call, stated explicitly by BASORG: an opportunity
  never surfaced is value missed, one surfaced with a wrong date sends a student to a closed
  door.
- **Yale Young Global Scholars** (`c3a98c43-dcfb-42cc-a23f-02a8a8154358`, `DLOPP-SP-B6-87`):
  live conflict — stored `cycle_status='open'` with a 2027-01-06 deadline, directly
  contradicted by the official page's "currently closed... anticipate late September."
  Flagged for RES-V2 in PR #32; among the oldest-tier rows analyzed in §3.
- **Interlochen Arts Camp** (`437963fb-9002-4481-bd67-f40e9fc953f1`, `DLOPP-SP-B2-28`): a
  full one-year discrepancy — stored deadline 2027-01-15 vs. the official page's own heading
  "Key dates for Camp 2026." Flagged for RES-V2 in PR #32; also among the oldest-tier rows.
- **Conrad Challenge** (`ac53340c-033b-4901-9e53-ecd3847966d1`): surfaced during the §3
  tier analysis as the one oldest-tier deadline-bearing row NOT covered by any RES-R2
  package, because its `verification_state='unverified'` — outside every package's scope
  (all three were `verified_current`-only by brief design). Note this is a **different row**
  from the `verified_current` "Conrad Challenge" already researched in package 1
  (`DLOPP-B1-11`, which recorded a conflict between the stored 2026-10-29 and the official
  page's "Oct 30" — still open, unrelated to this second row). Whether these two rows are a
  duplicate-entity pair or genuinely distinct programs was not determined — outside this
  lane's remit (entity deduplication belongs to the canonicalization/verification lanes, not
  research).

## 7. Reopening

This lane reopens only on ORYN-BASORG's message — e.g., if the founder's decision on the
~79 defective rows changes what's in scope, or PR #32/#40/#41 merge and create a genuinely
new oldest-tier once the current backlog clears. No self-directed pickup in the meantime,
per standing org rule 1.
