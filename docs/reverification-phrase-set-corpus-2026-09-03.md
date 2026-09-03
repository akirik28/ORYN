# Deriving the re-verification phrase set from real pages, not intuition

**Date:** 2026-09-03. **Author lane:** this session. **Assigned by CEO** after dry run #1
(design doc §10, run for real) found the design's own §5.1 literal phrase set produced zero
P1 outcomes across 20 real, successfully-fetched pages — a measured-high liveness-silent
rate, directly hitting Assumption A12. Explicit instruction: "derive the phrase set from
real pages instead of from intuition... pull a larger sample, deliberately spread across
categories and countries rather than whatever the priority ranking surfaces first... report
both directions... if the corpus says phrase matching can't be made reliable, that's a
finding."

## What was pulled and why

Priority-ranked due-set sampling (what the production job actually uses) skews toward a
narrow slice — `open`/`upcoming`, no deadline, highest-exposure rows, which is exactly right
for the job's own purpose but wrong for *this* purpose: deriving vocabulary needs to see
what a representative cross-section of real pages actually says, not just the highest-risk
ones.

Instead: a stratified sample, up to 5 rows per `category` (all 12 present categories:
`summer_program`, `competition`, `research`, `internship`, `scholarship`, `student_program`,
`online_program`, `volunteering`, `entrepreneurship`, `fellowship`, `conference`,
`academic_program`), random within category, `status='active'` with a real URL. 53 rows
selected, 49 fetched successfully via the same, already-tested `runFetchLadder` the
production job uses — no new fetch logic written for this. Spans 6 `cycle_status` values
(unverified/closed/date_not_announced/upcoming/open/historical — the full live distribution
except the empty `discontinued` bucket) and countries including the US, UK, Germany,
Netherlands, France, Türkiye, and several international/no-country rows.

Read in full, by hand — every one of the 49 fetched pages' content, not a sample of a
sample.

## What real pages actually say

Three findings, each traceable to specific rows:

**1. Word order and tense, not just missing vocabulary, is the dominant failure mode.** Not
one real "closed" example in the corpus matched the literal string `"applications now
closed"` verbatim. What real pages actually wrote: *"Registration for the 2026 Global Essay
Prize **is now closed**"* (JLI), *"The 2026 ASSIP Application **is now closed**"* (ASSIP),
*"The 2025 Project Award application **is now closed**"* (Girl Up), *"SIP 2026 **Has
Officially Concluded**"* (Science Internship Program). Every one differs from the hardcoded
phrase only in word order or tense — a literal-string list would need combinatorial variants
to cover ground a handful of short, tolerant patterns covers directly.

**2. Real vocabulary the original list never anticipated.** *"Apply Now"* is an extremely
common call-to-action (Wharton M&TSI, LaunchX, Case Western, UWC, UNO, Pioneer, Columbia NYC
Commuter Summer) that the original opening set (`"applications open"` / `"apply by"` /
`"deadline:"`) never matched at all. Also observed: *"APPLICATIONS FOR 2026 **ARE NOW
OPENED**!"* (Özyeğin, caps + past-participle), *"DELEGATE CALLS FOR ISTANBUL **ARE OPEN
NOW**"* (EYP Türkiye, "open" before "now" — the opposite order from Özyeğin), *"**Registration
open** for Summer 2026"* (Wall Street 101), *"The 2027 ... application **is available**
here!"* (Coca-Cola Scholars).

**3. `"check back"` is confirmed, a third time, as a false-positive source — never a
legitimate standalone trigger.** Dry run #1 already found it firing 2/2 times on unrelated
blog/photo-gallery "check back for updates" text. Comparing old vs. new classification on
this corpus found a *third* instance in the process: Boston University Tanglewood Institute's
"Season announcements. Alums in the news. Program updates. **Check back regularly** for
more!" — again nothing to do with application status. Its one genuinely legitimate observed
use, Interlochen Review's *"currently **not open for submissions**. **Check back** in
January, 2027"*, is still caught by a more specific pattern (`"not open for submissions"`)
that doesn't need the bare trigger at all.

## Two things measured, deliberately not fixed here

**A meaningful share of the sample carries no English signal at all.** Five Turkish-market
rows (İBB Genç Gönüllü Programı, GençBizzTech, Genç UPSHIFT, Gençlik Merkezleri, The Duke of
Edinburgh's Award — Türkiye) are entirely in Turkish. An English-only phrase matcher
structurally cannot classify these regardless of how the English list is tuned — this is not
a vocabulary gap the same fix closes, it's a different kind of gap. Given AGENTS.md's own
day-one Turkey market commitment and this codebase's own EN/TR bilingual discipline
elsewhere, this is worth a founder-level decision (a parallel Turkish phrase set, reviewed by
a Turkish speaker — not this session's own guess) rather than a quiet English-only expansion
that leaves the gap unnamed.

**A genuine false-positive trap exists and argues for staying conservative.** Columbia's own
course-browsing page contains, verbatim, `"Format - Any - Online In Person **Status - Any -
Open Closed**"` — a filter *control*, not a fact about any specific opportunity. A naive
expansion to bare, unanchored `"open"` / `"closed"` word matches would have caught this (and
likely many similar filter-UI patterns across program-browsing sites) as a false confirmation.
Every pattern added here stays anchored to an application/registration noun or an explicit
CTA phrase for exactly this reason — verified directly: neither `findOpeningPhrases` nor
`findClosurePhrases` fires on the Columbia filter text (see
`__tests__/opportunities/reverification/classify.test.ts`'s own test for this).

## The change

`lib/opportunities/reverification/classify.ts` — the original four closure phrases and three
opening phrases are unchanged (none were shown to cause a false positive); `"check back"` is
removed as a standalone closure trigger; eight new regex patterns are added (five opening,
three closure), each documented in the file with the specific real page that motivated it.
Implementation moved from pure substring matching to short, anchored regexes specifically
*because* word order was the dominant failure mode — a literal-string list cannot express
"open" and "now" in either order without an explosion of variants.

## Measured result — both directions, as asked

**A: classify-level, on the full 46-row sample that passed content guards under both phrase
sets** (same corpus, re-classified twice — old logic reconstructed verbatim from the
pre-this-session commit, new logic is the actual shipped code):

| | liveness-silent | agrees (would be P1) | disagreement (→ adjudication) |
|---|---|---|---|
| Old (design doc §5.1, as first built) | 39 (85%) | 4 | 3 |
| New (this pass) | 31 (67%) | 12 | 3 |

9 rows flipped from silent to classified; 1 flipped the other way (Tanglewood's "check back"
— see above, the intended fix, not a regression). **All 9 newly-classified rows were checked
by hand against their real page content**: 8 are unambiguous, verifiable-correct
confirmations (e.g. Coca-Cola's matched excerpt states the exact deadline already on file,
"September 30, 2026" against a stored deadline of `2026-09-30`); the 9th (LaunchX — an "Apply
Now" nav link against a stored `closed` status with a future-looking deadline) is a
genuinely ambiguous case correctly routed to LLM adjudication rather than either
auto-confirmed or left silent. **Zero false positives found in this sample.**

**B: an official re-run of dry run #1's exact same 20-row population, through the real
production pipeline** (`runReverificationPass`, `dryRun: true`, identical `max_rows`/
`budget_ms`), for a clean before/after on the number CEO already has:

| | p1_confirmed | p1_changed | p2_unreadable | transport_error | `source_verified_at` writes |
|---|---|---|---|---|---|
| Dry run #1 (old phrase set) | 0 | 0 | 16 (80%) | 2 | 0 |
| Dry run #2 (new phrase set) | 8 | 1 | 9 (45%) | 2 | 9 |

Corroboration reproduced identically (2/2 transport failures falsified by a healthy Wayback
capture, same two rows both times — nothing about corroboration changed in this pass, so
this is a consistency check, not a new measurement). One disagreement reached adjudication
and was confirmed changed — checked by hand: USC Pre-College's page reads *"Applications for
the 2026 Summer Programs are **now closed**"* against a stored state implying open — the
exact Stanford Anesthesia shape this whole job exists to catch, correctly identified,
correctly *not applied* (demotion stays off; `wouldProposeDemotion: 1`, nothing written).

## What this does and doesn't settle

This is a real, measured improvement, not a guess dressed as one — but it is not "solved."
On the broader 46-row stratified sample, **67% of successfully-fetched rows are still
liveness-silent even after this pass.** Design doc Assumption A12 asked whether the rate is
high enough that §7.6 (liveness-silent handling) is the job's primary value rather than a
safeguard — on this evidence, still yes: phrase matching, even meaningfully improved, closes
part of the gap, not most of it. A wider list tuned further against this same 49-row sample
would likely show more improvement on paper without necessarily generalizing — the honest
limit here is sample size (46-49 rows) and a single reading pass by one person, not
exhaustive coverage of how real pages phrase things globally.

**Not decided here, deliberately:** whether to invest further in phrase-set breadth, build a
non-English (starting with Turkish) parallel vocabulary, or accept §7.6 as the job's
primary mechanism and treat phrase confirmation as a bonus for the subset of pages where it
works. That's the founder-level call design doc §12 and A12 both flagged as open, and this
document's job was to bring real evidence to it, not make it.

## Gates

`npm run typecheck` / `npm run lint` — both green. Full suite green, 10 new tests directly
exercising every new pattern against the real page text that motivated it, plus the Columbia
filter-UI negative case. Both dry runs referenced above made real Tavily/browser-UA/Wayback/
Anthropic calls and wrote nothing (`dryRun: true` throughout) — see
`lib/opportunities/reverification/run-job.ts`'s own dry-run guarantee and its automated
proof test.
