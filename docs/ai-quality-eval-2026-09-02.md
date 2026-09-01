# The first AI output-quality measurement — 2026-09-02, 00:30

The eval harness (`lib/ai/eval/`, `npm run eval:ai`) was built, unit-tested and merged on
2026-09-01 and **had never been executed against the real API**. This is its first live run,
on founder-approved spend.

12 cases: 2 fixtures x 3 AI surfaces (`advisor_chat`, `weekly_plan`, `counselor_explain`)
x 2 locales (en, tr), plus a judge call per case. 24 real model calls, `claude-sonnet-5`.

**Cost: projected $0.3030, actual $0.3388** (48,267 input + 12,935 output tokens at
$3/$15 per M). The projection ran **12% under**. `cost-estimate.ts` says its output-token
figures are "documented assumptions, not measurements" — correct, and the assumption was
low. Anyone scaling this up should budget from the actual, not the projection.

---

## Deterministic checks: 0 findings in 12 cases

Both named regressions are confirmed fixed **against real model output for the first time**:

- No raw identifier ever appeared in a reply — not `extreme_reach`, not any of the 9
  snake_case `ProfileDimension`/`OutlookLabel` values.
- No reply quoted a numeric score for an unassessed dimension. The regression fixture is
  built to bait exactly this (`research` at `score: 0, state: not_assessed`), and every
  reply that mentioned Research described it as unassessed rather than as "0/100".

Until tonight, "the prompt-level fix works" was an assumption. It is now an observation.

---

## Rubric scores (judge, 1-5 across six criteria)

| criterion | mean | low |
|---|---|---|
| calm | 4.75 | 4 |
| specific | 4.67 | 4 |
| actionOriented | 4.58 | 3 |
| analytical | 4.50 | 3 |
| evidenceAware | 4.50 | 3 |
| **concise** | **4.08** | **3** |

**By locale: EN 4.64, TR 4.39.** Turkish is measurably weaker but not broken, and the gap
is concentrated in two cases (`weekly_plan/tr/baseline`, `counselor_explain/tr/baseline`)
rather than spread across the locale. This is the first evidence either way — the Turkish
counsel shipped on 2026-09-01 and nobody had read its output.

**Conciseness is the weakest criterion in both languages.** "Slightly dense", "long
compound sentences", "run-on" recur across nine of twelve cases. Spec Phase 57 asks for
short sentences. Minor, consistent, and the cheapest thing on this list to fix.

**`counselor_explain` is the weakest surface** (23/30, 24, 27, 23) against `advisor_chat`
(29-30) and `weekly_plan` (24-29). Its lowest single score in the run is
`evidenceAware=3` on the regression case: it called an opportunity a "high-impact fit"
without hedging, which the judge read as overstating certainty. This is the surface that
feeds the dashboard's gap block.

---

## The real finding: the plan can tell a student to avoid the one thing it was told to recommend

**Both** `weekly_plan` baseline cases — English and Turkish, independently — put
**"Regional Science Fair" in `avoidForNow`**, with invented-but-plausible reasons
("unconfirmed eligibility", "time split risk").

The Regional Science Fair is the baseline fixture's **only** recommendation, and Counselor
Core classes it **`do`** (`fixtures.ts:171`, via `rec()`'s default). The fixture's ruled-out
list is empty, so `formatCounselorGrounding` drops that section entirely and the model sees
one recommended item and the instruction to name something to avoid "if something stands
out". It reached for the only concrete thing in front of it and inverted it.

**The guard is asymmetric.** `lib/ai/weekly-plan.ts:106` tells the model, of ruled-out
items, *"Never put any of them in `actions`"*. There is no matching instruction forbidding
a **recommended** item from appearing in `avoidForNow`. The one code-level guard,
`namesSameActivity` (lines 208-215), fires only when the same activity appears in **both**
`actions` and `avoidForNow` — a collision. This is not a collision. The model put the item
in `avoidForNow` only, so nothing catches it.

`avoidForNow` is correctly `nullable()` and the prompt says "if something stands out", so
the escape hatch exists. The model does not take it.

**Student-facing harm:** the dashboard's "One thing not to do" block can tell a student to
skip the single highest-ranked opportunity Oryn found for them, with a confident reason
Oryn invented. That inverts the product's differentiating feature against its own engine.

**Not yet observed live, and the live data proves little either way.** All 110
`avoid_for_now` rows in `ai_recommendations` are the same "Oxbridge Academic Programs" text
— one student's plan, regenerated ~110 times (the duplication fixed separately on
2026-09-01). In that case Counselor Core *did* supply a ruled-out item and the model used it
correctly, citing "Counselor Core has deprioritized it". So the defect is **latent**: it
needs a student whose Counselor Core produces no ruled-out item, which is the ordinary case
for a well-rounded profile, not an edge case.

Reproduced 2 of 2 baseline `weekly_plan` cases. `advisor_chat/en/baseline` manufactured a
discouragement too ("No new clubs"), from prose rather than a schema field.
`advisor_chat/tr/baseline` got it right and abstained — the judge noted it "doesn't
manufacture one".

---

## Harness defect found by running it

`scripts/run-ai-eval.ts` never loads `.env.local`. Its sibling `check-integrations.ts`
calls `process.loadEnvFile(".env.local")` at line 13; the eval script has no equivalent, so
`isAIConfigured()` returns false and `--live` refuses even with a valid key on disk. Tonight's
run sourced the env in the shell as a workaround. Assigned to a lane to fix properly.

Built, tested, merged, never run — every test exercises the pure logic, nothing exercised
the entry point.

---

## What this measurement does not cover

Two fixtures, not the spec's four personas (Phase 49). One sample per case — the
manufactured-discouragement finding rests on n=2 agreeing across locales, which is
suggestive, not settled. The judge is itself an AI surface with the same failure modes as
the thing it grades; `judge.ts`'s own header says to read it as a signal to investigate,
not a certified score. The judge was explicitly told not to fact-check, so nothing here
speaks to whether the counsel's factual claims are true.

---

# Second run: haiku-4-5, same 12 cases — 2026-09-02, 00:45

Run to answer one question the tier design was blocked on: **is a free tier on Haiku
offerable, or does the counsel fall apart?** The founder's budget is $0.50/student/month
target, $1.00 ceiling. After weekly plans and counselor explanations, ~$0.37/month is left
for the advisor — about **10 Sonnet messages** or **~32 Haiku messages**. So the whole
shape of the free tier turns on this.

**Cost: $0.078** (38,314 input + 7,953 output at $1/$5 per M).

## Headline: 315/360 against Sonnet's 325/360

Three percent apart. That is much closer than the price ratio suggests, and on its own it
would say "ship Haiku on free". The aggregate is misleading, and the split is the finding.

| | Sonnet | Haiku |
|---|---|---|
| **regression fixture** (clear strengths, obvious gap, something genuinely worth discouraging) | 164 | **175** |
| **baseline fixture** (well-rounded profile, nothing sharp to say) | **161** | 140 |
| total | **325** | 315 |

**Haiku beats Sonnet on the hard case and collapses on the ordinary one.** Its worst case,
`weekly_plan/tr/baseline`, scored **16/30** — concise 2, analytical 2, calm 2 — with the
judge calling it "verbose and repetitive… the phrasing is often unclear or padded". Sonnet's
worst baseline case scored 23.

This matters more than the headline, because **the ordinary profile is the free tier's
typical user.** A student who just signed up has a thin, unremarkable profile and nothing
dramatic to be told. That is precisely where Haiku degrades.

By surface, the same story: `advisor_chat` is near-identical (115 vs 117) and
`counselor_explain` is near-identical in total (99 vs 97, differently distributed).
`weekly_plan` is where Haiku loses — 101 against 111 — and effectively all of the gap is
that one Turkish baseline case.

Both models are weaker in Turkish than English (Haiku 151/164, Sonnet 158/167), by a similar
margin. Turkish is not the problem; it is a consistent, small penalty in both.

## Deterministic: 0 findings, after fixing the check

The run initially reported 1 failure of 12. It was a false positive, and finding it was
worth the run on its own — see the commit for `lib/ai/eval/deterministic-checks.ts`. The
check split on sentence punctuation, which assumed prose; Haiku answered in a markdown
bullet list containing no `.!?` at all, so the whole list became one scope and a score
belonging to a *different* dimension was attributed to an unassessed one. The reply was
correct and the judge scored it 5/5 on evidence-awareness.

**Sonnet had passed the same case only because it happened to answer in prose.** The
instrument's reliability was a function of output formatting, and a lane is shortening these
prompts right now — which pushes models toward exactly that list shape. Fixed and pinned
with tests before it could start failing on better output.

So: **both models, 0 deterministic findings in 12.** No raw identifiers, no scores quoted
for unassessed dimensions.

## The manufactured-discouragement defect is structural, not model-specific

The single most useful thing this second run bought. From the Sonnet section above: three of
six baseline cases invented a "don't do this" where the fixture explicitly has nothing to
discourage (`expectDiscourage: "no"`).

Haiku's rate is **also 3 of 6.** And in both models, **both `weekly_plan` baseline cases
manufactured one** — 4 of 4 across two independent models. Haiku, like Sonnet, put the
fixture's only recommendation, the `do`-classed Regional Science Fair, into avoid territory.

That moves this from "one model's habit" to **a property of the prompt**, which is what the
asymmetric guard predicted: `lib/ai/weekly-plan.ts:106` forbids ruled-out items from
appearing in `actions` and says nothing about recommended items appearing in `avoidForNow`,
and `namesSameActivity` only catches the both-lists collision. Two models reaching the same
wrong answer through the same gap is about as clear as this gets without a fix to test
against.

## What this means for the free tier

**Haiku is viable, but not as a drop-in.** The evidence supports a free tier on Haiku at
~32 messages/month, on one condition: the padding failure has to be addressed at the prompt
level first. Both models fill space when there is nothing sharp to say — Sonnet mildly,
Haiku badly — and the instruction that is missing is not "be brief" but **permission to say
less when there is less to say.**

That work is already assigned. Until it lands, "free tier on Haiku" is a supported
direction, not a finished answer.
