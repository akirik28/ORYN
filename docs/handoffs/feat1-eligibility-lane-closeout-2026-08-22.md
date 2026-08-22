# FEAT-1 eligibility-honesty lane close-out (2026-08-22)

**Lane:** FEAT-1 (`lib/counselor/**`, `lib/ai/**`, opportunity-matching) · Reports to ORYN-CEO.
**Status: last package of the session** (CEO's instruction — the founder's window is closing;
this is a close-out, not new investigation). Four packages this session shared one throughline:
**absence of a computed answer must never render as an affirmative one.** Written for a cold
session — the reasoning, not just the outcomes, is the expensive part to reconstruct.

## 1. The arc: four packages, one throughline

| package | scope | PR | status |
|---|---|---|---|
| 1 (pre-existing) | Honest empty-`eligible_countries` copy | #5 | merged |
| 6 | Live audit: does Package 1's fix actually hold end-to-end? | #98 | merged |
| 7 | Turn the audit's finding into one founder decision, priced | #105 | merged |
| 8 | Fix the two live defects item 37 carved out as founder-decision-free | #116 | merged |

Package 6 walked Package 1's fix on a real account and found two things: the fix itself holds,
but two *other* surfaces don't agree with it, and a third dimension (age/grade) has the identical
defect shape Package 1 fixed for country, just never built. Package 7 turned "five dimensions,
five behaviors" into `docs/founder-blocked-backlog.md` **item 37** — one principle, one priced
migration, with the two already-fixable defects explicitly carved out so the founder isn't asked
to decide something that didn't need deciding. Package 8 fixed both.

## 2. What item 37 asks now, and why it reads wider than it should

Item 37's actual, still-live ask is narrow: **decide whether to extend migration `0060`'s
tri-state-confirmation principle to age and grade**, and approve one new migration if so. That's
it. Everything else in the item's text describing live *code* defects is now stale, because
Package 8 shipped both fixes item 37 named as separate:

- **Item 37 §5** (the citizenship/residency-prose dimension) still describes
  `computeEligibility` as not consulting that prose at all. It does now (PR #116) — the two
  read paths emit byte-identical wording, verified by CEO independently.
- **Item 37's "Two live defects intentionally left out of this decision" section** still lists
  the prose disagreement and "the ~38-row Browse eligible-by-default gap" as open, unassigned
  work. Both are fixed. The `~38` figure was also already stale when item 37 restated it from
  `docs/handoffs/feat1-eligibility-live-audit-2026-08-22.md` (Package 6) — re-measured fresh for
  Package 8 against `oryn-qa-scratch`, the live number was 72, not 38 (PR #116's description has
  the full breakdown).

**I have not edited item 37 to reflect this** — CEO's instruction was to say so here rather than
edit it silently, since the item is a founder-facing decision record and I don't own deciding
what "fixed enough to reword" looks like in that document. Whoever next opens item 37 (CEO, or a
future FEAT-1 package) should either strike §5's live-defect framing and the two-defects list, or
add a dated note pointing at PR #116, before a founder reads it and wonders why a decision
document is describing bugs that no longer exist.

**What item 37 still correctly asks, unchanged**: dimensions 3–4 (age, grade) have no
confirmation marker, the fix is one new shared column following `0060`'s own precedent, and it
subsumes item 29 (applying `0060` alone would only half-answer the question). That part of the
item is accurate today and is the one real founder decision left in this territory.

## 3. What eligibility honesty still doesn't cover — re-verified today, not restated from Package 6

Re-ran Package 6's age/grade measurement against `oryn-qa-scratch` before writing this (not
trusted from memory — the Browse-gap count had already moved once today):

- **140 of 271 active opportunities (52%)** have no usable age *or* grade signal at all
  (`minimum_age`/`maximum_age` both null, `eligible_grades` empty) — unchanged from Package 6's
  count; this one held steady while the Browse-gap composition (§2) did not.
- Concentration by category, of those 140: **summer_program 87 (62%), competition 36 (26%)** —
  **88% combined**, matching Package 6's figure exactly. The remaining 8 categories split 17
  rows between them.

This is real signal, not noise from a young field: `eligible_grades` is populated correctly
elsewhere (Yale Young Global Scholars states "grades 11-12" in its own description and
`eligible_grades` captures it — sampled directly in Package 6), so the 140 is under-research
concentrated in two categories, not a structural gap in the schema's ability to hold the data.
**Nothing in Packages 6–8 touched this.** It stays exactly what item 37 says it is: unmarked,
silent, and waiting on the founder's decision plus one migration.

## 4. Verification boundary — read this before citing "merged" as "walked"

**Package 8 was tests-only.** Per CEO's explicit instruction and rule 29 (FEAT-2 holds the
shared Browser pane), no live browser verification happened for either fix in PR #116. What
stands behind "fixed": every new/changed assertion confirmed to fail against the pre-fix code,
then confirmed to pass against the fix (production files reverted with test changes kept in
place, not a blanket stash — see PR #116's own description for the process failure this caught
mid-package). Full gate green: lint, typecheck, 146 files/2189 tests, build.

**The last actual live walk in this territory was Package 6**, on account `oryn.qa.b`, before
either fix existed. Nobody has walked the *fixed* card/Advisor/Browse surfaces in a real browser
since PR #116 merged. If a future package needs to confirm the fix renders the way this handoff
assumes (a card showing "Citizenship restriction on file..." instead of nothing; a closed-cycle
row showing "Not eligible" instead of a match tier), that is unverified live, not just untested —
say so rather than assuming the test suite's green implies the pixel is right.

## 5. Where this leaves the territory

One founder decision remains open in eligibility: **item 37**, narrowed to age/grade per §2
above. No code defect is currently known and unfixed in this territory. `lib/opportunities/**`,
`lib/counselor/**`, and `lib/ai/**` have no other flagged issues from this session's work.

Next FEAT-1 package, whatever it is, does not need to re-derive any of this — re-read this file
and item 37 directly rather than the four individual package PRs, which describe process more
than they describe current state.
