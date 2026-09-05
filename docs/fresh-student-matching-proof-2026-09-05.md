# Closing the one open loop from `first-experience-post-onboarding-2026-09-05.md`

That doc flagged one thing as "probable, not proven": whether a student who picked at least one
interest during onboarding gets a real Counselor Core / opportunity-match candidate, or whether
a zero-activity account effectively gets nothing to recommend. Same technique as that doc's own
hero-state check — see [docs/pure-function-direct-execution-2026-09-05.md](./pure-function-direct-execution-2026-09-05.md)
for the general method — applied one level deeper, to the actual matching engine.

## The real question, reframed by reading the function first

`computeOpportunityMatch` (`lib/opportunities/matching.ts`) sets `matchScore = eligible ? ... :
0` — eligibility, not interest overlap, is what gates whether a match exists at all. Interests
only affect *relevance* (ranking among eligible matches, plus which reason-code sentence
appears) — never eligibility itself. So the real open question wasn't "does picking an interest
matter" but "is a fresh account, with only what the required onboarding screens collect
(country, birth year, graduation year), *eligible* for anything in the live catalog at all."

## Proof, not argument

Called the real `computeOpportunityMatch` directly with two synthetic fresh-student profiles
(one with one interest, one with none — both otherwise identical: age 16, country Turkey,
graduation year 2028, all nine profile dimensions tied at `not_assessed`, matching this
morning's own confirmed fact about zero-activity scoring) against a real, live, currently-active
opportunity with zero eligibility data on every axis (Harvard-MIT Mathematics Tournament,
`570ba029-5c57-41e2-aaef-486777f4d8ea`, queried live 2026-09-05 — representative of the majority
shape in the 190-row slice today's other work targeted):

```
eligible: true
matchScore: 67
relevanceBasis: "opportunity_fields_missing"
matchedInterests: []
```

**Identical result with and without the interest.** Confirms the reframing: eligibility (built
from required onboarding fields every student has) is what determines whether a real,
non-trivial match exists — 67 is a genuine, substantial score, not a token minimum. A fresh
account is not gated on the optional interests screen for getting *any* recommendation at all.

## A second, unplanned finding from the same run

`matchScore` was NOT reduced by `NO_ELIGIBILITY_DATA_SCORE_CAP` (a real 39% ceiling this same
file applies to opportunities with zero eligibility data on every axis) — because HMMT carries
`country_eligibility_confirmed_open: true` from migration 0060, which counts as *having*
eligibility data even though age/grade are still unresearched. This is a direct, concrete link
to today's other work: once age/grade/country data lands for the 51 rows in
`docs/opportunity-fill-96-190-sql-2026-09-05.sql`, those specific opportunities stop being
subject to this 39% cap for every student they match — a real ranking-quality improvement, not
just a display-honesty one. Worth knowing when weighing that SQL's value.

## What this does and doesn't settle

Settles: a fresh, minimal-data account is eligible for real opportunities and gets a real,
substantial match score from the actual matching function, with or without picking interests.
Does not re-verify that `getCounselorState`'s full pipeline (query, filter, rank, build
`CounselorDashboardContract`) turns this into a visible "This Week" card end to end — that's the
wiring-vs-function distinction the technique doc itself names as this method's own limit. The
matching *engine* working on realistic input is now proven; the full page assembling it into
what a student actually sees is inferred from reading the call chain, not independently executed
here.
