# Stale identity: measured, not fixed

**Date:** 2026-09-03. **Author lane:** this session. **oryn-a7's dispatch**, after the deadline
-coverage measurement's own aside (Summer at Stanford: stored `historical`/2025, live page
already shows a 2026 cycle): *"nobody has measured [this]... the question is how many there
are... not missing data, wrong data, which is worse."* Reuse the reverification fetch ladder,
active rows first, measurement only — nothing written, nothing fixed, quote rather than
manufacture a percentage where a percentage would be false precision.

## Scope, and why it excludes 74 rows already covered elsewhere

Grepped `docs/` before starting, per standing practice. Two documents matter directly:

- **`docs/unverified-cycle-verification-2026-09-03.md`** — every one of the 74 active,
  `cycle_status='unverified'` rows was individually checked against its own page *today*,
  hours before this pass started. That population is not re-touched here — re-checking it
  again would be measuring the same 74 rows twice, not extending coverage.
- **`docs/reverification-final-dryrun-2026-09-03.md`** — ran the real classification pipeline
  across a 113-row sample tonight (65 known + 49 fresh) and reported **3 of 113 rows would
  demote to `closed`**, all hand-verified genuine. That number answers a narrower question
  than this one (only the closure direction, only demotion-eligible rows) — see below for
  where this pass's own numbers sit next to it, and one row (Girl Up Project Awards) that
  both passes touched with a different result.

This pass's population: **208 active opportunities with `cycle_status` in
`{open, upcoming, closed, historical, date_not_announced}`** (282 active total, minus the 74
already-covered `unverified` rows; `discontinued` has zero active rows catalogue-wide).
`date_not_announced` is included deliberately — it's a confident-enough claim ("we know of
this program; nothing is scheduled yet") that a live page can just as easily contradict as
`closed` or `historical` can, unlike `unverified`, which claims nothing to begin with.

## Method: the real classifier, not a new script

`oryn-a7` asked to reuse the fetch ladder. Reusing the whole classification pipeline
(`runReverificationPass({ dryRun: true, candidateIds })`, via the already-built
`scripts/opportunity-reverification-dry-run.ts --ids-file` flag) was a better fit than reusing
only the fetch step and hand-rolling a second triage heuristic next to the one already built,
tested, and fixed earlier tonight (Turkish patterns, the `unverified`/`date_not_announced`
state-machine branch) — it answers the exact question asked (does live content agree or
disagree with the stored state) with machinery already reviewed, rather than a parallel
keyword scan of unknown precision. Checked the budget first: `ai_usage` showed 22 calls /
$0.14 spent on this feature in the last 24h against its $5/month cap — plenty of headroom for
a ~200-row pass. `dryRun: true` writes nothing at all, confirmed by reading `run-job.ts`
directly (`writeRun`/`claimLease`/`writeSourceVerifiedAt`/`applyDemotion` each check
`if (dryRun) return` before any Supabase call) — a real, useful correction to an assumption
this session almost carried over: the prior 113-row run's own audit rows (`proposed_change`
etc.) are **not** sitting in `opportunity_verification_runs` to query for free: `dryRun`
suppresses that insert too, not just the live `opportunities` write. That data no longer
exists anywhere; re-running was the only way to get it.

## The numbers, run fresh against all 208

```
attempted: 197, committed: 196, stoppedBy: exhausted, dueRemaining: 11, elapsedMs: 308004
```

**197 of 208 attempted** — the other 11 were skipped by the job's own per-domain cap (max 2
fetches per hostname per run, a deliberate site-protection property, not a gap in this pass).
**196 of 197 reached a verdict** — one (Harvard Secondary School Program, SSP) hit a genuine
Anthropic schema-validation failure on both the call and its retry (`cycleStateConfirmedChanged`
came back `undefined`) and was dropped with no verdict this run, logged, not silently lost —
no run record was written for it (the error fires before `writeRun`), so a real invocation
would simply retry it next time. Worth knowing as its own small reliability fact: adjudication
can fail in a way that isn't `p2`/`p4`, it just costs the row this pass.

| Outcome | Count | Share of 196 |
|---|---|---|
| `p2_unreadable` | 121 | 61.7% |
| `p1_confirmed` | 40 | 20.4% |
| `p4_contradicted` | 17 | 8.7% |
| **`p1_changed`** | **8** | **4.1%** |
| `transport_error` | 10 | 5.1% |

Host wall, disaggregated the same way as the prior run: 12 unreadable-fetch corroboration
checks, 10 falsified by Wayback (83.3% — our own fetch failure, not the source's), 2 genuine
host walls. Consistent with tonight's other passes: real blocking is rare.

## `p1_changed` = 8 — the number this pass exists to produce

Every one of the 8 read by hand, not trusted from the label:

| Opportunity | Stored | Excerpt | Proposed |
|---|---|---|---|
| USC Pre-College Summer Programs | `open` | *"Applications for the 2026 Summer Programs are now closed"* | → `closed` |
| UK Chemistry Olympiad | `upcoming` | *"Registration is now closed"* | → `closed` |
| Ron Brown Scholar Program | `date_not_announced` | *"APPLY NOW - 2027 Application is now open!"* | → `open` |
| Stanford Anesthesia Summer Institute (SASI) | `closed` | *"Summer 2027 · SASI Applications Now Open"* | → `open` |
| International Psychology Olympiad (IPsyO) | `closed` | *"Register for 2027 IPsyO... Qualification deadline: before June 30, 2027"* | → `open` |
| ODTÜ (METU) Engineering Summer School | `date_not_announced` | *"Tarih: 30 Haziran - 11 Temmuz 2025 Şimdi Başvur"* | → `open` |
| European Youth Parliament Türkiye | `date_not_announced` | *"2026-05-25 DELEGATE CALLS FOR ISTANBUL ARE OPEN NOW"* | → `open` |
| BRI Student Fellowship | `date_not_announced` | *"Applications Open October"* (no year given) | → `open` |

**Not all 8 carry the same confidence, and reporting them as one undifferentiated 8 would be
exactly the false precision this task warned against.** Five are dated, specific, and
unambiguous: USC and UK Chemistry Olympiad both name the current year and an explicit closure
statement; Ron Brown and Stanford SASI both name 2027 and an explicit opening statement; IPsyO
names a specific 2027 deadline — and this last one is independently corroborated, not just by
this run: it's the same row this session already hand-verified in
`docs/opportunity-deadline-coverage-measurement-2026-09-03.md` hours earlier, from a fetch run
for a completely different purpose. Two runs, two different questions, the same real fact.

**The other three are the excerpt itself carrying its own staleness, and deserve real
skepticism rather than being folded into the confident five:**
- ODTÜ/METU's matched date — *30 June–11 July **2025*** — is over a year old relative to today
  (2026-09-03). "Şimdi Başvur" ("Apply Now") sitting next to a year-old programme date is
  exactly the evergreen-button-next-to-stale-date shape `docs/reverification-final-dryrun-
  2026-09-03.md` already flagged as ambiguous on **this same row**, hours before this pass
  started — not a new finding, a repeat of a known open question.
- EYP Türkiye's matched date — **2026-05-25** — is itself now more than three months in the
  past. Also the identical row the prior dry run already named as ambiguous for the identical
  reason. Two ambiguous flags on the same row, on two different runs, is a real signal the row
  needs a human to actually open the page — not that the row is confirmed stale.
- BRI Student Fellowship's excerpt carries no year at all ("Applications Open October") — could
  be a specific announcement or could be evergreen copy true every year regardless of whether
  any 2026/2027 cycle is actually scheduled. `date_not_announced` may still be the more honest
  label here than `open`.

**So: 5 of 8 solid, 3 of 8 genuinely uncertain — not 8 confirmed staleness records.**

## The direction split is the actual finding, not the count

**2 of 8 are closure-direction** (stored implied still-live, page now says closed) — both
pass every existing eligibility check in `lib/opportunities/reverification/demotion.ts`
(P1 evidence, explicit closure phrase, no conflicting opening signal), matching this run's own
`wouldProposeDemotion: 2`. This is exactly the shape the job's design (§9) was already built
to catch and act on.

**6 of 8 are opening-direction** (stored said closed/historical/unknown, page now says live) —
and *none* of these can ever become a tracked "would propose" candidate under the current
design, structurally, regardless of evidence quality. Read `demotion.ts` directly:
`canAutoApplyPromotion()` returns a hardcoded `false`, and there is no
`isPromotionEligible`-shaped counterpart to `isDemotionEligible` at all — §9(2)'s "promotion to
open is never automatic" was written as a safety rule about *applying* a change, but its
practical effect on this measurement is that the opening direction isn't just unapplied, it's
**unmeasured by the job's own reporting.** The aggregate `wouldProposeDemotion` count that a
real run would surface has no sibling metric for the direction this sample shows is three times
more common. Six live-but-marked-closed records reading as more consequential than two
closed-but-marked-live ones (a stale-`closed` row just looks unavailable; a stale-`historical`
or stale-`date_not_announced` row that's actually accepting applications right now is invisible
to a student who'd otherwise apply) is exactly the asymmetry `oryn-a7`'s dispatch named as the
open question, now with a real number attached: not 50/50, **3:1 toward the direction the job
currently can't see at all.**

## Two things found in the process, both bigger than any single row

**1. The same excerpt, re-run, got a different verdict.** Girl Up Project Awards —
*"The 2025 Project Award application is now closed for youth in MENA, Canada, South Asia &
the Pacific, and Europe"* — was one of the **3 confirmed demotions** in tonight's earlier
113-row dry run, read by hand there and called "genuine, unambiguous, dated closure." This
run, the adjudicator saw what reads as the same underlying page content and returned
`p4_contradicted`, reasoning the "for youth in MENA... and Europe" qualifier implies the cycle
might still be open elsewhere. **Same opportunity, same kind of evidence, two different LLM
verdicts on two different calls tonight.** Neither reasoning is obviously wrong read in
isolation — the second read is arguably more careful — but a founder deciding whether to arm
demotion should know the one path with no deterministic backstop (`adjudicateDisagreement`)
is not guaranteed to return the same answer twice on the same input. This is a reliability
property of the mechanism itself, not a defect in either run.

**2. This run's own phrase-matcher missed the exact case that started this whole task.**
Summer at Stanford Program for High School 2025 — the row whose live-2026-cycle-vs-stored-
`historical` mismatch prompted `oryn-a7` to ask for this measurement in the first place — was
in this run's own 208-row population, was fetched successfully, and came back `p4_contradicted`,
**not** `p1_changed`. Why: this run's excerpt window landed on *"Summer Session 2024 Apply
Now"* — a different, weaker part of the same page than the *"program runs June 20–August 16,
2026"* sentence this session read by hand hours earlier, for a different purpose, on the same
URL. The adjudicator correctly declined to confirm a change given only the excerpt it was
actually shown — that reasoning is sound. **But it means the true, honest excerpt-matching
mechanism missed the seed case for this entire investigation**, for the same reason
`docs/opportunity-deadline-coverage-measurement-2026-09-03.md` already named at catalogue
scale: a regex-driven excerpt window over a large page is not guaranteed to land on the
strongest evidence the page actually contains. **The real, honest conclusion: 8 is a floor,
not a ceiling.** The true rate of live/stored mismatch in this 208-row population is very
likely higher than 4.1% — this pass demonstrably missed at least one confirmed case by its own
admitted mechanism, on top of its own already-conservative-by-design caution on ambiguous
excerpts (the 17 `p4_contradicted` reads, most of which — nav-menu links, a different
program's admissions cycle, a restated stored deadline — really were correctly inconclusive on
manual re-check, not silent misses; only Girl Up and Stanford stood out as genuinely worth
naming).

## What this measurement does not do

Nothing written, staged or otherwise — `dryRun: true` throughout, independently confirmed by
reading the write-suppression code path rather than trusting the flag name. No row's
`cycle_status` was changed. This is a census of the population `oryn-a7` asked about
(active, non-`unverified`), not a fix, and not a claim that 8 is the final number — the section
above explains directly why it isn't.

## Gates

`npm run typecheck` / `npm run lint` — both to be run before push. Real Tavily/browser-UA/
Wayback/Anthropic calls throughout (197 rows attempted, 25 reaching adjudication) — zero writes
to `opportunities` or `opportunity_verification_runs` (dry-run, verified by code read, not
assumed from the flag). Run took 5m8s wall time for 197 rows.
