# Measuring the blast radius before adopting the counselor's student-side check — 2026-09-05

CEO's decision (from [[eligibility-confidence-consistency-audit-2026-09-05]]): the card should
adopt the counselor's `evaluateCandidateEligibility` logic — checking whether the STUDENT's own
age/country/grade/citizenship is known, not just whether the opportunity has real data — before
`hasAnyEligibilityDataAtAll` decides whether to cap a match score. CEO's own reasoning is sound
(the counselor is right that "unknown student data" shouldn't produce a confident "Exceptional"
claim), but asked for the second-order cost measured first: could this turn a fresh student's
whole Opportunities page uniformly grey, the same failure mode "this week's 3 jobs" hit earlier
today. Three questions, against real data (`oryn-qa-scratch`), read-only — nothing written, no
code changed.

## Headline: the cost is narrow, concentrated in a shrinking legacy population, not systemic

Onboarding (`lib/validation/onboarding.ts`'s `CompleteOnboardingSchema`) requires `country`,
`birthYear`, and `graduationYear` — none are optional, all three reject on empty. Measured
against the 8 real completed-onboarding accounts today: **0 of 8 have a null country, 0 of 8
have a null graduation_year.** Only `birthYear` shows a real gap — **2 of 8** — and that gap is
a known legacy issue, not a hole in today's flow: `birthYear`'s own migration comment already
documents it predating the mandatory requirement (5 of 11 accounts null, measured 2026-08-31,
before this field was collected anywhere). Every account created after that requirement landed
supplies it; the affected population only shrinks from here, it doesn't grow.

**Citizenship is the one dimension truly never asked at onboarding** (5 of 8 have no
`citizenship_countries` on file) — but this turns out to be irrelevant to the fix's actual cost:
**zero of the 367 currently-active opportunities carry any `eligible_citizenships` restriction
at all.** The one profile field onboarding doesn't collect is also the one eligibility dimension
that has no live data to trigger against — a fact worth knowing, not a coincidence to rely on
going forward if that changes.

## Question 1 — a genuinely fresh student (has country/age/grade, no activity yet)

**Zero opportunities would newly cap.** A student who filled in the three now-mandatory
onboarding fields has no null age/country/grade to trigger `age_unknown`/`country_unknown`/
`grade_unknown` in the first place — the counselor's own check produces no unknown-notes for
someone whose demographic data is simply complete. The feared "fresh student's page turns grey"
does not happen for anyone who actually completed today's onboarding.

**This also means CEO's own HMMT example doesn't hold up against HMMT's real row, checked
directly rather than taken on trust**: `minimum_age=null, maximum_age=null, eligible_grades=[],
eligible_countries=[], country_eligibility_confirmed_open=true, eligible_citizenships=[]`.
HMMT has no real per-dimension restriction on any axis to check a student against — country is
explicitly confirmed open, and none of age/grade/citizenship carry a restriction at all. Adding
the student-side check cannot change HMMT's score for any student, fresh or established, because
there is nothing for that check to evaluate in the first place. Worth flagging plainly: the
specific anecdote doesn't check out, whatever its origin — the underlying question it was
pointing at (does completing onboarding actually prevent this) is real and answered above, just
not by this particular example.

## Question 2 — the 8 real completed-onboarding accounts, measured individually

| birth_year | total matches | eligible+active matches | of those, age-restricted (would newly cap) |
|---|---|---|---|
| **null** | 272 | 215 | **68** |
| **null** | 285 | 224 | **73** |
| 2007 | 294 | 242 | 63 (unaffected — birth_year known) |
| 2009 | 298 | 262 | 46 (unaffected) |
| 2009 | 210 | 198 | 53 (unaffected) |
| 2009 | 272 | 229 | 75 (unaffected) |
| 2009 | 211 | 183 | 45 (unaffected) |
| 2010 | 197 | 157 | 42 (unaffected) |

**2 of 8 accounts (25%) see any change at all** — the two with a null birth_year, each losing
their uncapped status on roughly 68-73 opportunities, about 30-32% of that student's own
currently-eligible, active matches. **The other 6 of 8 (75%) are completely unaffected** — their
country/age/grade are all on file, so the added check never fires for them. This is a real,
uneven cost concentrated in a specific, shrinking population — not a uniform hit to every
student's page.

## Question 3 — what the mandatory fields actually save, stated precisely

Country and graduation year: **fully reliable, 0/8 null** — the mandatory requirement is doing
its job for both. Birth year: **a real, but legacy, 2/8 gap** that predates the requirement and
will not recur for any account created going forward. Citizenship: **never asked at onboarding,
and currently moot**, since no live opportunity has a citizenship restriction to trigger against
— but the one dimension worth watching if that ever changes (a future country/citizenship data
pass, similar to this session's own `country_eligibility_basis` work, could change this from
"moot" to "the next age-unknown-shaped gap" without any code change here needing to happen
first).

## What this measurement supports, without deciding it

CEO's own reasoning — the counselor's check is correct, onboarding being genuinely mandatory
would make the cost cheap — holds up against real data: the fix's cost is real but narrow (2 of
8 accounts today, shrinking over time, not the whole active catalogue for anyone). Whether that
cost is acceptable, and whether the 2 affected legacy accounts need a prompt to backfill
birth_year rather than just quietly losing "Exceptional" claims on ~70 opportunities each, is
the actual decision — this document measures the size of that decision, it doesn't make it.
