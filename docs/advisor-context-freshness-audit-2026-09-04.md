# Does the advisor's context reflect today's data-model changes?

Look-and-report, no code changed. Checked source, live database schema, and existing test
coverage — not source alone.

## Headline: the code is ready; the database isn't, for one piece — and a second piece was
## never wired at all, predating today entirely

Not "old logic mistakenly kept." Two genuinely different findings, and they need different
responses.

## 1. Opportunity eligibility (age/country/grade) — code fully correct, migrations pending

Traced the full chain the advisor actually uses, not just where the logic lives:
`lib/ai/advisor-chat.ts` (confirmed live-called, not orphaned: `buildOpportunityContextText`
is actually invoked at line 70) → `lib/ai/opportunity-context.ts` → Counselor Core's
`evaluateCandidateEligibility` → `lib/counselor/eligibility.ts`'s
`evaluateOpportunityEligibility` → `lib/ai/eligibility-text.ts`'s `formatEligibilityCaveat`.

**The code already handles the third state, for all three dimensions** — not partially, all
three:

```ts
if (opportunity.age_eligibility_basis === "checked_not_stated") {
  notes.push(eligibilityMessages.ageEligibilityCheckedNotStated(...));
} else {
  notes.push(eligibilityMessages.ageEligibilityUnverified(...));
}
```

Same shape for `country_eligibility_basis` and `grade_eligibility_basis`. The
"checked_not_stated" message is a **word-for-word match** to the example CEO gave as the
correct answer — confirmed by reading the actual string, not paraphrased:

> "The official page doesn't state an age requirement — checked (date)."

`lib/counselor/state.ts`'s query is `.select("*")` on `opportunities` — the robust shape
against exactly this kind of drift, since a wide select picks up new columns automatically,
no manual column-list to remember to update. 152 tests across
`__tests__/counselor/eligibility.test.ts` and `__tests__/opportunities/matching.test.ts`
pass right now, confirming the logic itself (fixture-driven, independent of the live
database).

**But the live database doesn't have the columns this logic reads yet.** Checked directly,
not assumed:

```
opportunities.age_eligibility_basis        -- does not exist
opportunities.country_eligibility_basis    -- does not exist
opportunities.grade_eligibility_basis      -- does not exist
opportunities.age_eligibility_confirmed_open    -- does not exist
opportunities.grade_eligibility_confirmed_open  -- does not exist
opportunities.country_eligibility_confirmed_open -- EXISTS (older migration, 0060)
```

So right now, live, `opportunity.age_eligibility_basis` is `undefined` for every row —
`undefined === "checked_not_stated"` is false, so the code correctly (not accidentally) falls
through to the old two-state message, `"Age eligibility not verified yet..."`, for every
opportunity, regardless of whether a research pass has actually checked it. **This is not a
bug and needs no code fix.** The moment the pending migrations (0126, 0129, and the
country-eligibility-basis migration) are applied and a research pass sets a real
`opportunity.*_basis` value, the advisor starts saying the correct new sentence with zero
further code changes — the wiring is already there, waiting on data.

## 2. Admission rate (`not_published` vs. `not_researched`) — never reaches the advisor at all

Different shape of gap. Grepped every file under `lib/ai/` for `university_statistics` or
`admission_rate`: no matches (`fee-text.ts`'s one incidental hit is about opportunity cost,
not university admission rate). `lib/ai/student-context.ts`'s `buildStudentAdvisorContext`
queries `target_universities` (`id, status, outlook, university_id, program_id`) and
`universities` (`id, name`) only — no `university_statistics` join, no `admission_rate`,
no `admission_rate_basis`, at any point.

**This predates today and isn't a regression** — the advisor never had this axis, old logic
or new. `admission_rate_basis` itself is live and populated on `university_statistics`
(migration 0119, applied) — the gap is specifically that nothing in `lib/ai/*` reads it,
so the advisor cannot currently distinguish "no single rate exists" from "actively
researched, not officially published" from "nobody's looked" for a student's own target
universities, because it doesn't see the field at all. Worth a real decision — should the
advisor's context include this? — not a fix I made unilaterally.

**What the advisor does have** for a target university: the already-computed `outlook` label
(`target_universities.outlook` — e.g. "reach", "not_applicable"). What it does **not** have:
the *explanation* for that label. `refreshAdmissionOutlook`'s own comment (read in full
during tonight's B5 pass) states this is deliberate upstream — `notApplicableReason`/
`notApplicableKind` are recomputed live on each detail-page view and never persisted to
`target_universities`, so there is no column for the advisor to read even if it wanted to.
A student asking the advisor "why is Oxford not-applicable" gets an advisor with genuinely
no access to that reasoning today — a real, pre-existing gap, same shape as the admission-rate
one, not something today's changes broke.

## 3. "Target geography boost" / target-university countries

Checked whether this is something the advisor could say something *wrong* about, specifically
because that's the risk CEO's question was about — not just whether it exists. It's a
**ranking/scoring signal** in opportunity matching (`lib/opportunities/matching.ts`/
`lib/counselor/scoring.ts`), affecting which opportunities make it into the top-8 slice
`formatOpportunityContext` renders, not a claim the advisor states about any one opportunity.
`buildStudentAdvisorContext` doesn't read `universities.country` at all, so there's no path
for this to produce an incorrect sentence the way the eligibility messages could — a scoring
change can surface a different *set* of real, already-verified opportunities, never an
unverified or wrongly-described one. Lower risk than the other three items by construction;
not chased further.

## 4. Does it still reference something removed today?

Grepped `lib/ai/advisor-chat.ts` for hand-rolled eligibility text bypassing the shared
`eligibilityMessages`/`formatEligibilityCaveat` path: none found. Every eligibility sentence
the advisor can produce traces to the one shared source
`lib/ai/eligibility-text.ts` documents was extracted specifically to prevent two surfaces
disagreeing (its own header names a real, already-fixed prior incident: the advisor's context
once carried a country-eligibility caveat that the weekly-plan prompt, using a second
un-synced path, silently dropped). No orphaned old message found standing next to the new
ones in `lib/opportunities/matching.ts`'s `eligibilityMessages` object.

## What I didn't do

Didn't apply the pending migrations — that's the founder's own action, per this project's
standing pattern, and not something to do unilaterally against a database several concurrent
sessions are using. Didn't add `university_statistics`/`admission_rate_basis` to the
advisor's context — a real product decision (how much should the advisor say about a raw
admission rate, given the whole "career profile score ≠ admission probability"-style honesty
work elsewhere in this codebase), not mine to make unilaterally in a look-and-report pass.

---

## ✅ 2026-09-05 audit — closed

admission_rate/university_statistics never reaching the advisor → **Closed** — commit
`53d7f759` (2026-09-04), "B7: wire institution admission-rate facts into the advisor's
context", merged via `165425ae` (2026-09-04), "Merge B7 -- admission rates reach the advisor,
with the institution-not-you disclaimer in the text". Both verified as ancestors of
`origin/main` via `git merge-base --is-ancestor`.
