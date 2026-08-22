# FEAT-1 Package 6 — eligibility honesty, walked end to end on a live student surface

STATUS: **Audit complete. No code changed — audit only, per explicit instruction.** Verified
against `origin/main`@`2f8a00b`, live data in `oryn-qa-scratch` (`qtcvcflzxbuagvvwahhu`), and a
real dev server. Account used for live browser verification: **`oryn.qa.b`** (mine per the
standing account-allocation rule). Two findings below were confirmed by directly executing the
real code (`computeEligibility`) against real live-row data, not by reading or assuming.

## Headline finding: the browse/detail surface and the counselor surface give DIFFERENT
answers for the same fact, on real live rows, right now

This is the direct answer to the assignment's item 2 ("does the explanation agree with the
matching layer?") — **no, they actively disagree**, and I found the disagreement by reading
both files fresh and then proving it by running each one's exact logic against the same real
row.

**The two files** (both touched by Package 1):

- `lib/opportunities/matching.ts`'s `computeEligibility` — feeds the opportunity card (both "For
  you" and "Browse all") and, via `opportunity_matches`, the detail page's derived note.
- `lib/counselor/eligibility.ts`'s `evaluateOpportunityEligibility` — feeds the Advisor's
  "Your priorities" warning badge.

**Where they diverge**: when `eligible_countries` is empty but `citizenship_restrictions` or
`residency_restrictions` prose describes a real restriction, `computeEligibility` treats the
row as **fully resolved and silent** (`hasUnstructuredEligibilityEvidence` suppresses the
"not verified" note, and nothing else fires) — the same silence Package 1 deliberately reserved
for confirmed-open rows. `evaluateOpportunityEligibility` does the opposite: it explicitly
pushes the raw restriction prose as an "unknown" warning
(`lib/counselor/eligibility.ts:106-108`, `"Citizenship restriction on file (not automatically
verified): ${prose}"`).

**Proved on real data**, not synthetic: Garcia Summer Research Program (live row,
`a37fa810-d142-4c07-b272-b3d58a6e6ea5`), `eligible_countries: []`,
`citizenship_restrictions: "International students may apply only if they already hold legal
documentation to be in the U.S. during the program; the center does not sponsor visas."` Ran
both functions' exact branch logic against a Turkish student:

```
computeEligibility (card/detail):    { eligible: true, notes: null }        <- silent
evaluateOpportunityEligibility (counselor): verdict "unknown", notes: [the actual prose]
```

**Live-confirmed on the real page** (`oryn.qa.b`, signed in, own onboarding-set profile):
Garcia's detail page currently shows an "Eligibility unknown" badge — but **only because of an
unrelated, independently-firing age check** (no birth year on file; the row separately has
`minimum_age: 16`). The visible note reads exactly: *"Has an age requirement — add your birth
year to check."* The citizenship restriction is real, on file, and rendered — but in a
completely separate "Eligibility notes" section further down the page, never integrated into
the primary signal. **The opportunity card (Browse/For You) has no equivalent section at all** —
confirmed by reading `features/opportunities/opportunity-card.tsx` in full: it renders only the
derived `eligibilityNotes`, never raw `citizenship_restrictions`/`residency_restrictions`. If
`oryn.qa.b` had a birth year on file (resolving the age-unknown cleanly), the card would show
**zero signal** for this row, for the exact population the row's own restriction prose excludes.

**Scale**: at least several live active rows share this shape (Copenhagen Business School
Summer University's Single-Course EU/EEA-only track, Garcia, USACO's team-selection-only US
restriction, among others found while reading the full citizenship/residency-prose export) —
not exhaustively re-classified row by row for this pass, see "what I did not check" below.

## Finding 2: 38 live rows get no eligibility signal on the Browse card at all, because no
`opportunity_matches` row exists for them

`refreshOpportunityMatches` (`lib/opportunities/persist-matches.ts`) only computes/upserts a
match row for opportunities passing `filterActionableOpportunities` (excludes `closed`/
`discontinued` cycle status). `browseOpportunities` (`lib/opportunities/browse.ts`) queries
`opportunities.status = 'active'` with **no actionability filter**, then falls back to
`match?.eligible ?? true, eligibilityNotes: null` when no match row exists.

**Measured live**: 271 active opportunities; 60 have a non-actionable `cycle_status`
(`closed`/`discontinued`); **38 of those are also unresearched** (empty `eligible_countries`,
no restriction prose) — exactly the rows that would otherwise earn the "not verified" badge if
a match row existed for them. In Browse mode they instead default to a plain, unflagged match.
Severity is tempered in practice: the card's own `CYCLE_STATUS_BADGE` reads `cycle_status`
directly off the opportunity row (not the match row), so "Closed for this cycle" still renders
correctly — a student can't act on these anyway. Flagging it because it's the same underlying
mechanism as Finding 1 (a derived-note system going silent when its upstream computation never
ran), just reached via a different gap, and because the detail page's independent `match &&`
guard means a non-actionable row shows **neither** badge there either (not even "Not eligible")
— three surfaces, three different silences, for the same 38 rows.

## Item 1 — the general unresearched-row case (351/391 rows): correct, live-confirmed

For the ordinary case (empty `eligible_countries`, no restriction prose, no confirmed-open
marker, match row exists), the honest label renders correctly and identically everywhere I
checked, confirmed live on `oryn.qa.b`'s own Browse/"For you" page: two real Turkish university
summer-school rows (İTÜ Lise Yaz Okulu, Sabancı University Summer School) both rendered the
exact string *"Country eligibility not verified yet — check the official page for
restrictions."* with the "Eligibility unknown" badge, on both the card and (traced via code) the
detail page. This is the large-majority case Package 1 was built for, and it holds.

## Item 3 — the ~40 rows with `eligible_countries` populated: no regression

Confirmed by running `computeEligibility` against a real restricted row (Coca-Cola Scholars
Program, `eligible_countries: ["United States"]`, live, `cycle_status: open`):

```
Turkish student vs. Coca-Cola Scholars: { eligible: false, notes: "Not currently open to students from Türkiye." }
US student vs. Coca-Cola Scholars:      { eligible: true, notes: null }
```

Correct exclusion, correct silent inclusion. No regression from Package 1.

## Item 4 — Türkiye Scholarships specifically

Live row (`34033f8a-51e1-4c73-9b7e-2e3819a348dc`): `eligible_countries: []` (still empty — the
*structured* field was never populated), `citizenship_restrictions` correctly states the real
exclusion in prose, `cycle_status: closed`. Two things compound here, both already covered
above rather than being a new mechanism: it is one of Finding 2's 38 non-actionable rows (no
match row, so Browse would show it unflagged were it not for the correctly-independent
`cycle_status` badge), **and** it is an instance of the headline finding (even if it were
actionable, `computeEligibility`'s hard exclusion only reads the structured `eligibleCountries`
array, which is empty, so a Turkish citizen would not be excluded by the card/detail path
either way — only the counselor path would currently warn about it, and only the detail page's
separate prose section states the exclusion in full). The data itself is correct and complete
(the prose is accurate and sourced); the gap is entirely in which surfaces make use of it.

## Folded in per CEO's mid-audit finding: the age dimension has the identical shape, quantified

`computeEligibility`'s age block (`lib/opportunities/matching.ts:115-125`) is structurally
identical to the pre-fix country block: `minimumAge`/`maximumAge` both null produces no note at
all, indistinguishable from "researched, confirmed no age limit." Quantified as asked:

**271 active rows: 192 have no age bounds recorded. Of those, 140 (52% of the whole active
catalog) have neither age bounds nor a grade-level restriction either** (`eligible_grades`
empty) — the more precise number, since 52 of the 192 do carry a grade restriction that the
separate `eligible_grades` check correctly enforces even when age bounds are absent.

**By category** (of the 140 genuinely-uncaptured rows): summer_program 87 (62%), competition 36
(26%) — together 88% of the gap, concentrated in exactly the two categories where a real-world
age or grade requirement is close to universal. Sampled 8 `summer_program` rows with no age
bounds directly: **Yale Young Global Scholars'** own description states *"for rising high
school juniors and seniors"* and its `eligible_grades` field correctly captures `["11","12"]`
— proving the underlying fact was researched and exists, just not translated into the age
columns specifically. This is not a hypothetical risk; it's the concrete shape of the gap.
Contrast: `fellowship` (5 rows) and `volunteering` (6 rows) have **zero** uncaptured rows —
those categories are fully researched on this dimension already.

**Not fixed, per instruction.** Two things stated plainly, as asked, before any code:

1. **The fix shape is the same mechanism Package 1 used** — a `country_eligibility_confirmed_
   open`-style tri-state marker, this time for age (`age_eligibility_confirmed_none` or
   equivalent), needed because null bounds have the identical two-meanings problem: genuinely
   no age limit vs. never researched.
2. **That mechanism needs a migration, and migration `0060` — the one Package 1 already wrote
   for the country case — is still unapplied.** Proposing an identical mechanism for age means
   proposing a **second** unapplied migration stacked on the first, which is a founder decision,
   not an engineering one. Worth the founder's explicit consideration whether to bundle both
   into one migration/one decision rather than review them separately — I'm surfacing the
   choice, not making it.

One line worth keeping, since the CEO asked for it explicitly: **the bug survived in the age
field because the country fix was scoped to one field, not because the underlying reasoning was
wrong.** The two-meanings distinction (`docs/handoffs/feat1-eligibility-honesty-2026-08-22.md`)
was correct and reusable; it just wasn't re-applied to every sibling field on the same row. The
same question — "does null here mean confirmed-none or never-researched?" — is worth asking of
every remaining eligibility dimension on `opportunities` before assuming this pass closed it.

## Process note: this session's own account-identity incident, connected to the rules that
landed on `main` while I was mid-audit

While signing in as `oryn.qa.b` for this package's live verification, I initially landed in an
already-authenticated `oryn.qa.a` session (read-only — no Save/Applied/mutating click was ever
made under it, confirmed by reviewing my own action log), and a first onboarding-submission
attempt for `oryn.qa.b` produced a client-side "unexpected response from the server" error
that turned out to correspond to no actual persisted change (verified by DB read immediately
after: `onboarding_completed` still `false`). I treated both as transient rendering glitches at
the time, re-signed-in, and verified the *second* attempt via a direct DB read immediately
after submission before proceeding further — `country: Turkey, school_name: MEF Lisesi,
curriculum: turkish_curriculum, onboarding_completed: true`, self-consistent, no interleaving
visible in the final state.

`main` advanced mid-session with rules 27-29, and rule 29 specifically names the mechanism:
**the Browser pane is one shared instance across concurrent sessions on this machine, not one
per session** — a different lane's login can silently rewrite the active cookie in every other
lane's open tabs, with no error or signal. My own experience tonight is very likely an instance
of exactly this, not a separate bug — I'm recording it here as corroborating evidence rather
than a new finding, since the mechanism is now already documented and the standing fix (ask
the CEO before live browser verification; verify identity immediately after every
state-changing action, not just before) is exactly the discipline I was already applying
by checking via DB read after each submission. Per rule 29, **I did not have CEO allocation
before starting this session's live verification** — the CEO's own Package 6 assignment
directly instructed the live walk on `oryn.qa.b` before rule 29 existed, so this doesn't
contradict the rule's intent, but I'm flagging the gap explicitly rather than assuming it's
covered, since the rule is now standing and I have no live verification work queued next.

## What I did NOT check (rule 20)

- **Did not exhaustively re-classify** every one of the ~36 empty-`eligible_countries`-plus-
  prose rows found while reading the full export — Garcia and Coca-Cola Scholars were run
  through the real code directly; the rest were read and characterized by eye (genuine
  restriction vs. "global"/"none stated" placeholder text) but not each individually re-verified
  against live code output.
- **Did not check the "For you" personalized surface's live rendering in detail** beyond
  confirming it reads the same `opportunity_matches` table as Browse (same code path, same
  conclusions apply) — `oryn.qa.b`'s fresh profile has too few scored dimensions yet to produce
  a rich, differentiated "For you" list to walk personally.
- **Did not check University eligibility/requirement surfaces** — this package was scoped to
  `opportunities`, per the assignment; universities are a separate territory (UI-1/research
  org) with their own requirement-evaluation code this audit did not touch.
- **Did not check whether the counselor's own candidate list ever actually surfaces Garcia or
  a similarly-shaped row to a real student** — confirmed the eligibility *function's* behavior
  directly (the more reliable proof), not whether `state.eligibleOpportunityMatches` happens to
  include this specific opportunity for `oryn.qa.b` today (it may not, depending on category/gap
  matching, which is orthogonal to the eligibility question itself).
- **Did not verify every category's age-bounds count for internal consistency** beyond the two
  totals reported (192 vs. 140) — did not, for instance, sample `research`/`online_program`'s
  small remaining gaps individually the way `summer_program` was sampled.
- **No code changed.** Everything above is audit only, as instructed.
