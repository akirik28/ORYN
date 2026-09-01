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
unknown-eligibility one get the same headline and the same rank. Phase 12 of the spec lists
**Confidence** as one of the seven fields a match should express and says explicitly not to
collapse them into one opaque score. Whether the tier should be damped by eligibility
confidence is a product decision, not a defect to quietly patch — and it sits in the
opportunity-engine territory, so it belongs to that lane and the founder, not to a passing
audit.

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
