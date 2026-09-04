# `eligibility_notes` freezes a locale into a row — should it be stored at all, and if so, whose

CEO's brief, following her own trace of the walkthrough's locale finding: `eligibility_notes`
is computed prose, persisted per `(user_id, opportunity_id)`, and the language baked in at
write time doesn't reliably match the student's own preference by the time it's read back.
Two questions to argue, not assume; a backfill to stage if one is the honest interim answer;
and the 360-vs-366 mismatch to chase on the same pass. **Report only — no row written.**

## A correction to the measured numbers, worth stating before anything else

Re-ran the count directly rather than trusting either number blind. Using exact phrases from
`eligibilityMessages` (`matching.ts`) instead of a general language-detection guess: of 251
`tr`-preferred rows with notes, **69 read as English, 173 as Turkish, 9 unclassified by
either phrase set** — different from the 54/28 cited in the brief, because "English" and
"Turkish" were evidently measured by a different method there too (54+28=82, also short of
251). Neither count is wrong so much as neither is exhaustive; the real, robust finding both
methods agree on is **mixed languages exist inside the same `preferred_language` group**, and
that's what matters below.

**A sharper, more useful correction: all 69 English rows belong to one account.**
`e9eba798-195d-4859-960c-4b8968df7819` (`oryn.qa.b`, a QA persona, not a spread of real
students) carries every one of them. The mechanism is real and would hit any student who
lands in the same situation, but **today's actual footprint is one account, not "54 rows
across the student base."** Worth knowing before treating this as urgent-at-scale versus
urgent-in-mechanism — it's the second, not (yet) the first.

## The mechanism, traced past "the code is fine"

Confirmed independently: `eligibilityMessages` has complete Turkish strings for every case,
and all four `refreshOpportunityMatches` callers (dashboard, `/opportunities`,
`/opportunities/[id]`, the scheduled-job path in `lib/counselor/state.ts`) pass a real
`locale`. **But that locale isn't simple "request locale" either — `resolveLocale()`'s own
header comment states its design precisely: cookie first, `profiles.preferred_language`
second, English default third**, and calls the cookie-first order deliberate — *"a student
who switched to Turkish on their laptop would get English again on their phone"* is exactly
backwards from that comment's own intent, which is to let a **per-device** override win over
the durable preference, on purpose, for **rendering**.

**That design is right for a page render and wrong for a value that gets written once and
read back by a different render later.** `refreshOpportunityMatches` recomputes and
overwrites `eligibility_notes` on every page view that hits one of the four call sites — so
in principle the note should "self-heal" the next time the same student visits in the
locale that's actually current. The freeze happens because **not every page a student visits
re-triggers a refresh**, and because the cookie itself can differ by device — a session that
resolves to English once (a shared computer, a stale cookie, a QA pass) writes English into a
row that a later, correctly-Turkish-resolved page then reads back unchanged until something
re-triggers a recompute.

## Question 1 — should this be stored as prose at all

**No, and the codebase already proves the better pattern one column over.**
`opportunity_matches.reason_codes` — written by the same function, in the same row, at the
same instant as `eligibility_notes` — already stores **codes**
(`"matches_your_interests"`, `"addresses_a_current_gap"`, `"near_you"` — see
`buildReasonCodes`), translated at render time by whatever locale the *current* page
resolves to. `eligibility_notes` does the opposite: it bakes the translation in at write
time. Two columns, same row, same author, same moment — one locale-safe by construction, one
not. This isn't a new pattern to invent; it's making `eligibility_notes` consistent with what
`reason_codes` already does correctly, right next to it.

**Sized honestly, not just gestured at.** `eligibilityMessages` has ~11 message shapes, several
parameterized (`${restriction}`, `${studentCountry}`, `${eligibleGrades}`, `${currentGrade}`)
— a genuine step up from `reason_codes`' bare string array, since a code alone isn't enough;
the parameters need to travel too (a small JSON value per row, or a code plus 1-2 typed
columns). Three readers to update (`browse.ts`, `home-strip.ts`, `lib/counselor/evidence.ts`
per `matching.ts`'s own comment), a migration, and a backfill of the *shape* (not a
retranslation — see below on why that's not mechanically possible). **This is real, scoped
work — a focused session, not fifteen minutes — but it is not a redesign of anything else,
and it directly extends a pattern the codebase already has correct.** Not too big to spec;
too big to also build tonight alongside everything else in flight, and out of scope for a
report-only pass regardless.

## Question 2 — if it stays prose for now, which locale should win at write time

**Argued, and the honest answer is that neither request-locale nor `preferred_language`
actually closes the gap, because the real defect isn't "wrong locale chosen" — it's "a
persisted value can go stale relative to whatever locale the *next* render resolves to,"
and that's true regardless of which single source computed it.**

- **Keep using `resolveLocale()` (today's behavior).** Argument for: it's the same source
  that resolves the *rest of the page* the student is looking at in that same render, so the
  note matches its own surroundings at write time by construction. Argument against: exactly
  the mechanism above — a later render can resolve differently, and the note doesn't know.
- **Switch to `preferred_language`.** Argument for: durable, not per-device, so it drifts less
  often in practice. Argument against: it can *still* disagree with what `resolveLocale()`
  gives the *surrounding page* in the same render (a cookie-overridden visit would show a
  `preferred_language`-Turkish note inside an English-rendered page) — the identical failure
  shape, just flipped to a different pair of mismatched pages.

**Neither is a real fix; both are equally-sized band-aids for a design that persists a
render-time decision.** If forced to pick one for the interim, `preferred_language` is the
milder failure mode (drifts less often, since it doesn't change per device/session the way a
cookie can) — but say so as a mitigation, not a resolution, because Question 1's answer is
the one that actually closes this.

## The backfill — staged as what it actually is, not a text find-and-replace

**A stored English sentence cannot be mechanically retranslated into Turkish** — the finished
prose doesn't carry its own parameters (which restriction text, which country, which grade)
separately from the sentence, so there's no safe way to regenerate the Turkish equivalent
without re-running the real computation. The honest "backfill" is therefore: **identify the
affected rows (real SQL, below) and re-invoke the existing, already-correct
`refreshOpportunityMatches(userId, "tr")` for each** — not a data patch, a targeted re-run of
the function that already does this right when given the right locale.

```sql
-- Staged, not executed. Identifies every opportunity_matches row whose stored
-- eligibility_notes currently reads as English for a student whose preferred_language is
-- Turkish -- the actual affected population, re-verified live immediately before this file
-- was written. Today: 1 account (e9eba798-195d-4859-960c-4b8968df7819, oryn.qa.b QA
-- persona), 69 rows. This SELECT is the input to the real fix -- calling
-- refreshOpportunityMatches(userId, "tr") for each returned user_id -- not a value this file
-- writes itself; the note text cannot be safely regenerated by SQL alone (see above).
select distinct p.id as user_id, p.preferred_language
from public.opportunity_matches om
join public.profiles p on p.id = om.user_id
where p.preferred_language = 'tr'
  and (
    om.eligibility_notes ilike '%not automatically verified%' or
    om.eligibility_notes ilike '%not verified yet%' or
    om.eligibility_notes ilike '%add your%' or
    om.eligibility_notes ilike '%restricted by%' or
    om.eligibility_notes ilike '%requires a specific%' or
    om.eligibility_notes ilike '%not currently open to%'
  );
```

## The 360-vs-366 mismatch — fully diagnosed, a real and separate small bug

**Not a data problem, a hardcoded list one item short of the real enum.**
`lib/opportunities/browse.ts`'s `getOpportunityFacets()` sums the category-chip total from a
hand-written `ALL_CATEGORIES` array of 12 values. `types/database.ts`'s own
`OpportunityCategory` type has **13** — the array is missing `"online_program"`. Confirmed
directly: exactly 6 active rows carry `category = 'online_program'` (Coursera, Columbia
Pre-College Online Summer, Stanford ULO, Wall Street 101 Virtual, Inspirit AI Scholars Live
Online, UNO – United Nations Online) — 366 − 6 = 360, precisely the gap seen live. Nothing
in the type system catches this, since `ALL_CATEGORIES: OpportunityCategory[]` only needs to
be *a* valid array, not an exhaustive one.

**A second, real consequence beyond the visible count mismatch**: since there is no chip for
`online_program` at all, a student can never filter *to* that category specifically — those 6
rows are only reachable via "Tümü" (all) or a text search, never via the category picker.
Not chased further (browse-results filtering logic, not this report's scope) — flagged as
likely, not confirmed by reading that code path.

Small, precise, one-line fix (`ALL_CATEGORIES` gains `"online_program"`) — not staged as code
per this pass's own report-only scope, but unlike the locale question, this one has no
ambiguity to argue: the array is just short of the type it's supposed to enumerate.

## What this pass did not do

Did not fix the missing category, did not run the backfill's `refreshOpportunityMatches`
calls, did not design the code+parameters schema for Question 1's real answer beyond sizing
it. Did not audit `en`-preferred rows for the reverse mismatch (Turkish notes on an
English-preferring student) — the brief's own numbers and this pass's re-measurement both
focused on the `tr` side; the `en` side almost certainly has the same mechanism at a smaller
scale (5 Turkish-reading rows measured against 1,240 English-preferred rows, per the fresh
count above) but wasn't separately chased.
