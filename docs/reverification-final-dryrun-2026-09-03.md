# The final pre-arming dry run — real pipeline, representative sample

**Date:** 2026-09-03. **Author lane:** this session. **CEO dispatch**, after the Turkish
patterns + `unverified`/`date_not_announced` state-machine fix landed: "run it properly —
real pipeline, real calls, no writes — across a sample representative of the actual
catalogue rather than whatever the priority ranking surfaces first. Report the
classification distribution, the host-wall rate, how many reach adjudication, and how many
demotions it *would* propose if demotion were on."

Everything had changed since the last full run (design doc's 2026-09-03 implementation
notes): corpus-derived English patterns, Turkish patterns, and the state-machine fix that
unlocks `unverified`/`date_not_announced` classification. This is the first time all three
run together, for real, against a sample sized and shaped to answer the arm/no-arm question.

## The number the founder will decide on

**3 of 113 rows would have their `cycle_status` demoted to `closed`, if demotion were
armed.** All three checked by hand against their real excerpts:

| Opportunity | Matched excerpt | Verdict |
|---|---|---|
| Girl Up Project Awards | *"The 2025 Project Award application is now closed for youth in MENA, Canada, South Asia & the Pacific, and Europe"* | Genuine, unambiguous, dated closure |
| Interlochen Review | *"currently not open for submissions. Check back in January, 2027."* | Genuine, unambiguous closure |
| Partners for the Future | *"Applications are now closed."* | Genuine, unambiguous closure |

None look like a false positive. At this rate (2.7%), the design's own volume guard
(§9(5): block if ≥3 proposed *and* over 10% of the batch) would **not** trip — 3 clears the
floor but is nowhere near 10% of 113 — so these three would actually apply, not get
blocked, in a batch this size. Scaled loosely to the full 283-row active catalogue at the
same rate: roughly **6–8 demotions**, not three and not thirty. Stated as a rough
proportion from a 113-row sample, not a precise catalogue-wide count — see the
known-vs-fresh generalization gap below before treating this as exact.

## Classification distribution (113 rows attempted, 1 of 114 candidates skipped — no URL on file)

| Outcome | Count | Share |
|---|---|---|
| `p2_unreadable` | 63 | 55.8% |
| `p1_confirmed` | 21 | 18.6% |
| `p4_contradicted` | 13 | 11.5% |
| `transport_error` | 10 | 8.8% |
| `p1_changed` | 6 | 5.3% |

`p1_confirmed` + `p1_changed` = 27 rows (23.9%) would write `source_verified_at` today.

## The host-wall question, disaggregated — this is the actual correction to the old 80% number

The first dry run (20 rows, before any of the three fixes) reported "80% p2_unreadable" as
its headline, and that number has been sitting in the founder's own morning notes since.
It was never wrong, but it was never disaggregated either, and the two things it was
quietly blending are very different problems:

| | Count | Share of 113 |
|---|---|---|
| **Genuinely blocked** (fetch failed on every rung, AND an independent fetcher — Internet Archive or Tavily — also couldn't read it) | **2** | **1.8%** |
| Readable, but liveness-silent or fails a content guard (§7.6 — the page loads fine, it just doesn't say anything about cycle status) | 61 | 54.0% |
| `transport_error` (our own fetch failed this one time) | 10 | 8.8% |

**Only 2 of 113 real rows are an actual host wall.** Both checked by hand:

- **The Marshall Society Essay Competition 2026** — every rung failed, Wayback also
  couldn't produce a readable capture.
- **Johns Hopkins CTY Summer Residential Program** — same shape.

The other 61 "unreadable" rows are not a fetching problem at all — they're an *evidence*
problem: the page is readable, passed every content guard (it's about the right
opportunity, it has application-shaped vocabulary), and still says nothing a phrase match
can read as confirming or contradicting the stored cycle state. That's design doc §7.6's
mechanism exactly, and Assumption A12's answer stands: **liveness-silence, not blocking, is
this job's dominant failure mode.**

**And the 10 `transport_error` rows are not dead links.** All 10 were checked against the
Internet Archive, and all 10 came back `falsified: true` — Wayback has a recent, readable
capture, meaning the failure was on our end (a transient fetch issue this one run), not the
source's. Every one gets a retry via the normal backoff path; none needed to be written off.

## Adjudication — 19 of 113 (16.8%) reached it, right in the design's own assumed range

§5.1's own assumption was "15–25% of checks disagree initially... should be measured in the
dry run rather than trusted." 16.8% on a 113-row real sample is a direct, favorable
confirmation of that assumption — the first time it's been checked against a sample this
size.

**All 13 `p4_contradicted` (not-confirmed) reasoning strings were read by hand.** The
pattern is exactly what the design's own conservatism is supposed to produce, and it held
consistently, not just on the cases this session already knew to worry about:

- **Six were nav-menu "Apply Now" links** (LaunchX, Genesys Works, Lumiere Education, John
  Locke Institute, Leangap, GençBizzTech) — every one correctly declined with some version
  of *"navigation/menu text, not a status statement."* This is exactly the
  evergreen-CTA-isn't-proof-of-current-status shape this session flagged as a risk twice
  before (LaunchX in the English pass, GençBizzTech in the Turkish pass) — now confirmed at
  scale, not just on the two cases already known.
- **Four restated a deadline without asserting status** (Sabancı, Istanbul Bilgi, Stanford
  ULO, SEES) — correctly declined: *"only restates the same deadline already stored... gives
  no indication of whether the cycle is currently open or closed."*
- **Three were genuinely mixed/ambiguous** (BRI Student Fellowship, İTÜ Lise Yaz Okulu,
  UCSB Research Mentorship) — each declined with a specific, excerpt-grounded reason (a
  truncated button label, unclear whether a recurring vs. current cycle, conflicting date
  ranges).

Zero of the 13 read as the adjudicator being fooled or over-cautious for no reason — every
decline cites something real and specific in the excerpt it was given.

## Two secondary findings from this run, both bounded, neither blocking

**1. `findDateCandidates` scans the whole page, not the matched excerpt — so a correct
closure classification can carry a real but unrelated date.** Girl Up Project Awards was
correctly classified `p1_changed`/closed on *"The 2025 Project Award application is now
closed..."*, but `detectedDeadline` picked up *"Dec. 2 2022"* — a real, literal substring of
the page (satisfying §8.3's excerpt-or-nothing rule), just not connected to the 2025
closure being described. Checked what this can actually affect: `applyDemotion`
(`run-job.ts`) only ever writes `cycle_status`, never `deadline` — the mismatched date lands
in the `opportunity_verification_runs.proposed_change` audit blob, not on the live
`opportunities` row. Real noise in the audit trail a human reviewer would see; not a risk to
the data itself. Worth a future fix (scope date-candidate extraction to a window around the
matched excerpt, not the whole page) but not urgent.

**2. Two "open" confirmations sit next to a date that reads as stale, and the adjudicator
confirmed anyway.** ODTÜ/METU (*"Tarih: 30 Haziran - 11 Temmuz 2025 Şimdi Başvur"*) and EYP
Türkiye (*"...2026-05-25 DELEGATE CALLS FOR ISTANBUL ARE OPEN NOW"*) both carry a date
several months to over a year old, sitting inside the same 80-character excerpt window the
model saw. A defensible reading: "Tarih: 30 Haziran - 11 Temmuz 2025" is the *programme's
own running dates*, not an application deadline, so it says nothing about whether the
current cycle is open — the model may be reading it correctly, not ignoring a red flag. But
it's close enough to worth naming. Bounded regardless: both are `cycle_status: "open"`
proposals, and §9(2) makes promotion to open **never** automatic — nothing about this can
write a wrong `cycle_status`. Worst case is `source_verified_at` getting stamped a little
early on a row whose true current state is genuinely ambiguous.

Neither finding changes the headline numbers above or argues against arming; both are
worth a maintainer's attention at some point, not a blocker now.

## Sampling methodology — why these 113 rows, and what "representative" means here

**The concern this had to answer first:** the phrase patterns were *derived* by reading
part of this corpus. Running the classification distribution only against rows already read
would be measuring the mechanism against its own training set — a real methodological
problem this session has been explicit about since the English pass ("would likely show
more improvement on paper without necessarily generalizing").

**The fix: a combined sample, split and reported separately.**

- **65 already-known rows** — the deduplicated union of the English 49-page and Turkish
  21-page corpora this session already read in full by hand, while deriving the phrase
  sets. Reused deliberately: real, fresh fetches this run (not replayed cached content), so
  this still measures live host/content behavior, just on pages whose *language* the
  patterns were partly tuned against.
- **49 genuinely fresh rows** — never read by this session before this run. Pulled from the
  live catalogue, excluding every known id, stratified by `(category, cycle_status)` and
  weighted toward the two categories that actually dominate the real 282-row active
  catalogue: `summer_program` (139 rows, 49% of everything active) and `competition` (80
  rows, 28%). Equal-per-category sampling (this session's own earlier method, built for
  *reading diversity*) would have quietly under-represented the single largest, most
  consequential population — `summer_program` × `unverified` alone is 59 rows, 21% of the
  entire catalogue, and the exact population design doc §0 names as the reason this job
  exists.
- **Two categories are at 100% coverage, not sampled**: `academic_program` (1 active row,
  total) and `conference` (2 active rows, total) — both already fully read.
  `discontinued` has **zero** active rows catalogue-wide, confirmed by direct query, not
  assumed — nothing to sample there either.

**Known vs. fresh, reported separately — the generalization check:**

| | n | Reaches a verdict (P1/P1-changed/P4) | Silent or unreadable |
|---|---|---|---|
| Known corpus (already read) | 64 | 25 (39.1%) | 39 (60.9%) |
| **Fresh (never read before this run)** | **49** | **15 (30.6%)** | **34 (69.4%)** |
| Combined | 113 | 40 (35.4%) | 73 (64.6%) |

**Real, honest gap: the mechanism generalizes to genuinely new pages, but about 8.5 points
less classification reaches a verdict on them than on the corpus it was partly tuned
against.** Worth stating plainly rather than only reporting the blended number — this is
exactly the shape of result the English write-up predicted might exist and didn't have the
sample to check at the time. It is not a large gap, and every classified fresh row checked
above (the demotion candidates, the p1_confirmed spot-check, the p4_contradicted reads) held
up under manual review — but it's real, and the founder should see it rather than a single
number that happens to look better.

## What was NOT re-verified here

All 21 `p1_confirmed` excerpts were read by hand (the one path with no LLM review at all —
errors here are more consequential than in the adjudicated buckets). All read as genuine,
specific, dated confirmations; none looked like a stale evergreen match slipping through
uncontested. Not independently cross-checked against each opportunity's own page history
beyond that — a spot-check, not an audit of all 21 against external sources.

## Mechanism changes made to enable this run

`lib/opportunities/reverification/run-job.ts` gained one new, additive `RunOptions` field:
`candidateIds?: string[]` — restricts the pool to exactly the given ids and bypasses the
due-set filter, for a measurement that wants a specific, representative cross-section
instead of whatever the priority-ranked due-set would surface. Production callers (the
route, a future scheduler) never set it; default behavior is byte-for-byte unchanged when
omitted. `scripts/opportunity-reverification-dry-run.ts` gained a matching `--ids-file`
flag, accepting either a plain `string[]` or the phrase-corpus scripts' own `{id, ...}[]`
shape directly, no reformatting needed. 4 new tests in
`__tests__/opportunities/reverification/run-job-dry-run.test.ts` prove `candidateIds`
actually bypasses the due filter (not just narrows within it — a not-due second candidate is
attempted only when explicitly listed) and that an id matching no active opportunity is
silently absent, not an error.

## Gates

`npm run typecheck` / `npm run lint` — both green. Full suite green. Real Tavily/browser-UA/
Wayback/Anthropic calls throughout (113 rows, 19 reaching adjudication) — zero writes
(`dryRun: true`; see `run-job-dry-run.test.ts`'s own automated proof of the write-suppression
guarantee, unchanged by this pass). Run took 3m20s wall time for 113 rows.

## The answer to "arm or not"

Not this session's call to make — the founder's, per every prior note in this thread. What
this run adds that wasn't available before: a real, current, disaggregated number for every
question asked. The host wall is small (1.8%, not 80%). The mechanism's dominant limitation
is evidence, not access — most unreadable pages are readable pages with nothing to say.
Adjudication behaves conservatively and correctly on the exact ambiguous shapes this session
flagged as risks. And the number that actually matters for the demotion decision specifically
is small and, on manual review, correct: **3 of 113, all genuine.**
