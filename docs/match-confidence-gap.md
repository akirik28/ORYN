# What our strongest recommendations don't know

Measured 2026-09-01 against `oryn-qa-scratch`, all `status='active'` opportunities.

Of **623** matches scoring 60+ — the two tiers the card headlines as "Strong match" and
"Exceptional match" — **325 (52%) carry an eligibility uncertainty**. Over half of the
recommendations ORYN presents most confidently are made without knowing whether the
student can actually apply.

| Why it's uncertain | Strong matches | Who can resolve it |
|---|---|---|
| Country eligibility never researched | 195 | research |
| Student hasn't given their birth year | 110 | the student, one field |
| Restriction text on file, not parsed | 19 | research |
| Another missing profile field | 1 | the student |

## This is not a deception bug

The card shows "Eligibility unknown" and the note names the specific reason, and
`lib/opportunities/matching.ts` documents in its own header that "unknown" and "confirmed
eligible" are not the same claim even though both persist as `eligible: true`. Nothing here
hides anything from a student who reads the card.

What it *is*: the headline tier (`tierFor()` in `features/opportunities/opportunity-card.tsx`)
is a pure function of `match_score`, so a confirmed-eligible opportunity and an
unknown-eligibility one get the same headline and the same rank. Phase 12 lists
**Confidence** as one of the seven fields a match should express and says explicitly not to
collapse them into one opaque score.

**And ORYN already does this correctly — on the other surface.** `lib/counselor/scoring.ts:70`:

```ts
const dataQuality = eligibility.verdict === "unknown" ? Math.round(dataQualityBase * 0.6) : dataQualityBase;
```

The Counselor damps data quality by 40% when eligibility is unknown, as its own weighted
factor alongside gapRelevance / fieldAlignment / urgency — so the dashboard's "This Week"
and the advisor's priorities already account for this. Browse reads the separate, undamped
`match_score` off `opportunity_matches` and never learned the same lesson. (Identified by
the opportunity-engine lane, verified here against the source.)

That makes this a smaller decision than it first looked: not "should we invent a confidence
adjustment," but "extend a pattern already trusted on one surface to a second one." The
shape to copy is Counselor's — add eligibility confidence as its own factor in whatever
decides tier and rank, and leave the persisted `match_score` alone as an honest fit number.
Phase 38 warns specifically against a blind multiply and asks for normalized factors; and
mutating a stored fit score to simulate a confidence adjustment would be the same
false-precision this codebase keeps having to undo.

Still the opportunity-engine lane's call to make and schedule, not a passing audit's diff.

## Two things this does settle

**The birth-year form pays for itself.** 110 of the 325 — a third — resolve the moment a
student fills in one field. The settings form and onboarding requirement added on
2026-09-01 exist for consent and age-gating reasons, but this is the product benefit:
a third of the uncertainty in our best recommendations is the student's to clear, in one
input, and the card already tells them so.

**The research budget question has a number attached.** "Should we spend more on
opportunity research?" now reads concretely: 195 of our strongest recommendations rest on
country eligibility nobody has researched. That is the specific thing the next research
pass would buy.
