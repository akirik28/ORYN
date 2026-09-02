# What actually determines advisor reply length — 2026-09-02

**This is a finding, not a diff.** No prompt, schema, or `lib/ai/eval/**` file was changed
to produce this document — everything below comes from reading the current codebase and
re-analyzing data that already existed (this session's own two live runs, plus the
published numbers in `docs/ai-quality-eval-2026-09-02.md`). Nothing here required a new
API call.

**Context:** three measured attempts to move the judge's `concise` rubric criterion have
now landed at the same number. oryn-4e's brevity instructions scored 307/360 (worse than
the 325 baseline, output tokens *rose*) and were reverted.
`docs/ai-quality-eval-2026-09-02.md`'s baseline scored `concise` 4.08/5, the weakest of
six criteria. This session's permission-to-say-less prompt change (merged, `main
42bbd09e`) scored `concise` **4.08 — identical to two decimal places.** Three runs, two
different instruction families, roughly a dollar of measurement, zero movement on the
target criterion. The brief was to find out why before writing a fourth prompt variant.

---

## The short answer

**The prompt is not the lever for the `concise` score, and the reason is legible directly
in code that's already shipped, not something that needed a new experiment to discover.**
Two of the four candidates below are settled by evidence already in this repository.
The other two are genuinely informative once measured against real data, and together they
explain all three flat results without requiring a fourth theory.

Separately, and worth keeping distinct: **raw output-token *volume* moved slightly, even
though the judge's *concise score* didn't.** These are not the same question, and
conflating them is part of why "make it more concise" reads as a single lever when it's
actually two.

---

## Candidate 1: `max_tokens` — ruled out, already benchmarked in-repo

Not a hypothesis to test; a fact already established and documented at the point of use.
`lib/ai/advisor-chat.ts:43-61`, verbatim: *"Lowering this does NOT make thinking shorter:
the model reasons however much the task needs regardless of the ceiling, so this number
only controls how much margin exists between that need and a truncated response. **It is
not a lever for reply length at all** -- there is no separate mechanism in this file that
is."* `lib/ai/anthropic-provider.ts:21-34` confirms the mechanism generally, not just for
this one caller: *"`max_tokens` is a ceiling, not a reservation... Current Claude models
run adaptive thinking when a request omits a `thinking` parameter (as every call here
does), and thinking is drawn from this same budget, so the floor has to clear the model's
reasoning before any of it is available for the answer."*

The 2026-08-23 benchmark cited there is concrete: 1024 tokens produced a thinking block
and *no visible text at all* (hard failure); 2048 truncated mid-answer; 4096 completed
cleanly with 1599-1736 thinking tokens actually observed. 8192 was tried alongside
oryn-4e's brevity prompt change and reverted the same day when that combination scored
worse — but the comment is explicit that **4096 stands on its own benchmark evidence,
independent of that reverted experiment.** Also confirmed directly:
`AnthropicProvider.generateText` (`anthropic-provider.ts:105`) locates the answer by
content-block type (`.find(block => block.type === "text")`), so thinking-block content is
never included in what the judge reads — the visible reply's length is the model's own
choice of how to phrase its answer, not thinking text leaking through, and not something
the ceiling shapes except by risking truncation if set too low.

**Conclusion: raising or lowering `max_tokens` within the safe range (above the ~4k
observed floor) will not change reply length or density. This was never the lever.**

## Candidate 2: context size — measured, no correlation found, but the test is weak

`formatContextForPrompt` (`lib/ai/student-context.ts:291+`) assembles a genuinely large,
itemized block — student summary, weekly time budget, career profile score, then every
dimension's state, described rather than numbered for unassessed ones (a deliberate
2026-09-01 fix, same file, so a model doesn't echo a raw `0/100` back at a 16-year-old for
a dimension nobody has scored).

Measured the two fixtures' actual assembled prompt sizes via the eval harness's own
dry-run cost table (`npm run eval:ai`, no `--live` — input-token counts are real,
per-request measurements, not the assumed output figures):

| target | locale | regression | baseline | diff |
|---|---|---:|---:|---:|
| advisor_chat | en | 1,739 | 1,817 | baseline **+78** |
| advisor_chat | tr | 1,870 | 1,955 | baseline **+85** |
| weekly_plan | en | 2,168 | 2,153 | regression +15 |
| weekly_plan | tr | 2,298 | 2,291 | regression +7 |
| counselor_explain | en | 471 | 396 | regression +75 |
| counselor_explain | tr | 606 | 531 | regression +75 |

**The two fixtures are not meaningfully different in size** — nowhere near the 2-3x
difference that would be needed to test whether a much bigger context produces a much
longer reply. If anything, `advisor_chat`'s *baseline* fixture (the one with nothing
dramatic to say) has a slightly **larger** prompt than its regression fixture (the one with
a clear gap to discuss) — the opposite direction "more context begets more echo" would
predict. And this session's own `concise` scores split almost the same way regardless of
fixture (regression mean 4.0, baseline mean 4.17 — see the full table below) — no visible
correlation with the small context-size differences that do exist between them.

**Conclusion: not ruled out in principle, but not demonstrated either, and the two
fixtures this harness has aren't different enough in size to test it properly.** A real
test would need a fixture with a genuinely thin profile and one with a genuinely dense one
(many activities, many dimensions, long evidence tags) — deliberately built for range, the
way the two fixtures were built for "regression vs. nothing to discourage," not for size
contrast. Worth naming as a real gap in the fixture set if this question matters enough to
answer properly later.

## Candidate 3: the output contract — real, but not the clean win it looked like

`weekly_plan` returns a Zod-validated object (`WeeklyPlanSchema`,
`lib/ai/weekly-plan.ts:29-36`): `summary` described as "one or two sentences," `actions`
capped at `.max(3)`, `avoidForNow` a single optional object. `advisor_chat` returns free
prose with no structural bound at all beyond the token ceiling. This is a real, code-level
difference in *quantity* — a schema that only has room for 1-3 actions and a two-sentence
summary cannot become five paragraphs the way free prose can.

**But this session's own complete rubric data (12 cases, all six criteria, gathered
2026-09-02) does not show `weekly_plan` beating `advisor_chat` on `concise`:**

| target | concise scores (4 cases) | mean |
|---|---|---:|
| advisor_chat | 4, 4, 4, 4 | **4.00** |
| weekly_plan | 4, 4, 4, 4 | **4.00** |
| counselor_explain | 4, 4, 5, 4 | 4.25 |

Tied, not ahead — and total score across all six criteria tells the same story:
`advisor_chat` 114/120, `weekly_plan` 114/120, exactly equal; `counselor_explain` 95/120,
clearly behind both (consistent with the original doc calling it "the weakest surface").
**I could not verify the specific claim that weekly_plan outscores advisor_chat on
`concise` "in every run"** — the original two runs' raw per-case scores aren't preserved
anywhere in the repo (only the summary prose in `ai-quality-eval-2026-09-02.md`, which
gives target-level *totals*, not a `concise`-specific breakdown), so that claim is
checkable only against this session's own run, and this session's own run doesn't show it.
Flagging the gap rather than asserting the broader claim either way.

**Why a length-bounding schema doesn't produce a clean density win: it bounds *quantity*
(how many sentences/fields exist), not *quality of density within each one* — and the
judge's own rubric (next section) is scoring the latter.** A schema field described as
"one or two sentences" can still be one dense, run-on, repetitive sentence. Structural
bounding is a real, useful constraint (see the cost data below), but it isn't the whole
mechanism, and it doesn't fully explain the flat `concise` scores by itself.

## Candidate 4: the judge's own rubric — this is the one that actually explains the flat scores

`lib/ai/eval/judge.ts:18`, the `concise` field's own schema description, verbatim: **"Short
sentences, no filler, vs. padded or repetitive."** That is two different things bolted
into one 1-5 score: sentence-level brevity, and freedom from repetition/padding. A reply
can get *shorter* in raw token count while staying exactly as repetitive per sentence — and
the judge would not reward that, because "shorter but still padded" is still padded. This
is consistent with, and suffices to explain, all three flat results without needing a
fourth mechanism:

- oryn-4e's brevity instruction made the model write less **and the judge scored it
  worse** (307 vs 325) — consistent with a model that, told to "be brief," compressed
  without necessarily becoming less repetitive per sentence, or cut content the other five
  criteria depended on (their own report: tokens rose despite the brevity instruction,
  meaning the instruction didn't even reliably produce shorter output, let alone denser
  prose).
- This session's permission-to-say-less bullets (`lib/ai/advisor-prompt.ts`,
  `lib/ai/weekly-plan.ts`, merged `main 42bbd09e`) target *whether* to add a sentence at
  all (an empty-slot/manufactured-content question — and that part measurably worked: the
  weekly_plan baseline cases that used to invent an `avoidForNow` 4 of 4 times across two
  models now don't, 0 of 2 in this session's run), not *how densely* an already-decided
  sentence is phrased. Zero effect on `concise` is exactly what a permission-to-omit
  instruction should produce if density-per-sentence, not sentence *count*, is what the
  judge is actually scoring.
- The original baseline's own judge notes, quoted directly in
  `ai-quality-eval-2026-09-02.md`: "slightly dense," "long compound sentences," "run-on" —
  every one of those phrases describes *density*, not *length*. Nobody has yet written an
  instruction that targets density specifically, as opposed to volume.

**This reframes the founder's actual question.** "Make replies more concise" has been
read as one problem; it's at least two: (a) how many output tokens a reply costs, and (b)
whether the judge's density rubric scores it well. Nothing tested so far has targeted (b)
directly — all three attempts (brevity instruction, permission-to-omit, and the schema
bound found in this pass) affect quantity or existence of content, not sentence-level
density. Whether a density-specific instruction ("prefer several short sentences to one
sentence carrying two ideas," or similar) would move the score is a genuinely untested
fourth hypothesis — flagged, not run, per the brief's instruction to bring a hypothesis
before spending, not spend to find one.

---

## The cost question, answered separately from the score question

The founder's actual constraint is money, not a rubric number: output is ~86% of an
advisor message's cost. Worth checking directly, since a flat `concise` *score* does not
necessarily mean a flat output-token *count* — these are correlated but not the same
measurement, and only one of them is what the budget cares about.

Comparing this session's run against the original baseline run's own published actuals
(both are full 12-case + 12-judge-call totals, so directly comparable):

| | original baseline run | this session's run | diff |
|---|---:|---:|---:|
| input tokens | 48,267 | 50,318 | **+2,051** |
| output tokens | 12,935 | 12,403 | **-532 (-4.1%)** |

Output tokens dropped about 4% — modest, but real, and it happened **without any
corresponding improvement in the judge's `concise` score.** The input increase is a
direct, mechanical cost of the added instructions themselves (more system-prompt text =
more input tokens every call, at $3/M vs output's $15/M — a real but much smaller cost per
token). Net effect across this measurement is close to a wash in dollars, slightly
favorable: roughly -$0.008 from the output reduction against roughly +$0.006 from the
input increase.

**This number should be read cautiously — it's one run against one prior run, both
including judge-call tokens that dilute any target-specific signal, and neither run was
designed to isolate output-token volume as its own measured quantity.** But it's suggestive
that *something* about the change reduced raw verbosity slightly even though the judge
didn't reward it — which fits the reframing above: quantity and density are different
things, and this pass's edits plausibly touched the former a little while leaving the
latter untouched.

---

## Answering the brief's actual question directly

**Is the prompt the lever?** For the specific `concise` rubric score: no clean instruction
family has moved it in three tries, and the reason is now legible — nobody has yet written
an instruction aimed at sentence-level density rather than content volume or content
existence. That's a real, specific, fourth thing to try, not evidence that prompting is
categorically powerless here — but it hasn't been tried, and per the brief, it isn't being
spent on until someone signs off on the hypothesis first.

**Is `max_tokens` the lever?** No — settled, in-repo, benchmarked, dated, not something
this investigation needed to re-test.

**Does the output contract (schema vs. prose) matter?** Partially — it bounds quantity by
construction, which is real and probably explains why `weekly_plan` and `advisor_chat` sit
in the same 114/120 tier while `counselor_explain` (also schema-bound, but far less richly
resourced with context — 396-606 input tokens vs. 1,739-2,298 for the other two) lags
behind on `analytical`/`actionOriented` instead. But it did not produce a `concise` score
advantage in the one dataset available to check it against.

**Is the 86%-output-cost figure addressable by prompt work at all?** Partially, and
differently than "make the judge happier" would suggest. This pass's edits moved raw
output-token volume a little (favorably) with zero effect on the density score that
motivated them — meaning the cost lever and the quality-score lever may not be the same
lever, contrary to how they've been treated together so far. **If the founder's actual
goal is the budget number, not the rubric number, the untested density-specific
instruction (candidate 4's fourth hypothesis) is worth one clean, hypothesis-first test.
If the goal is specifically the `concise` rubric score moving on a report, that may need a
change to what the rubric is graded against (i.e., is "padded/repetitive" actually the
right proxy for what the founder means by concise?) rather than another prompt attempt.**
Neither of those is a decision this document makes — it's the fork the evidence points to.

---

## What would make this more certain, not done here

- A fixture pair built deliberately for context-size contrast (thin profile vs. dense
  profile), to actually test candidate 2 rather than note that the existing two fixtures
  are too similar in size to test it.
- The harness printing (or saving) `responseText` per case, not just judge scores — this
  investigation could not do any direct word-count/sentence-length analysis of what was
  actually written in either run, because the raw text isn't preserved anywhere once a run
  finishes. That's a real observability gap, independent of anything the eval script's
  own output-formatting currently reports.
- A single, isolated, hypothesis-first test of a density-specific instruction (distinct
  from both "be brief" and "permission to omit") — the one candidate this document
  identifies as genuinely untested rather than already-settled or already-measured-flat.

---

## Update, same day: the density-specific test ran, and it's a null result too

Approved and run: `lib/ai/advisor-prompt.ts` got one new bullet, distinct in kind from
both prior attempts — *"One idea per sentence. A sentence joining two claims with 'and',
'while', or a comma reads as dense even when its word count is short — split it into two
sentences instead... If you're restating a point you already made earlier in this same
reply, even in different words, cut that sentence rather than let it stand."* This targets
sentence-level density directly, not volume (brevity) or existence (permission-to-omit) —
the one axis `judge.ts:18`'s "vs. padded or repetitive" language names that neither prior
attempt touched.

**Result: 317/360, `concise` mean 4.08 — identical to the baseline, and identical to the
permission-to-omit run, to two decimals.** Raw log:
`docs/eval-runs/2026-09-02-run4-sonnet-density-instruction.log`. Checked the judge notes
directly for any qualitative shift even without a score change — the same complaint
vocabulary appears at the same rate ("dense" x3, "repetitive" x2, "run-on" x1) as the prior
run's notes. No hidden improvement papered over by a flat number; the number and the notes
agree.

**Four candidates in this document, three of them now measured, all three landing on the
same score.** Brevity instruction (worse, 307). Permission-to-omit (flat, 323, real win on
a different criterion). Density instruction (flat, 317). The fourth candidate (context
size) remains untested for lack of a size-contrasted fixture pair. Three separate
instruction families is enough to say plainly what the brief asked for if this happened:
**`concise`, as `judge.ts` currently defines and scores it, does not appear to be
addressable by prompt-level instruction on this model.** The founder's cost options for
this specific number narrow to model choice and quota, not further prompt iteration —
unless someone changes what the rubric is graded against, which is a different, editorial
decision about the eval instrument, not a prompt question.

Recommendation on the code: revert the density bullet. Unlike the permission-to-omit
change, there's no offsetting win to weigh it against this time — clean null on the target
metric, no qualitative shift in the judge notes, and a small added cost (more input tokens
every call, forever, for an instruction that didn't do anything). Left in place on
`oryn/density-prompt-2026-09-02` pending confirmation rather than reverted unilaterally,
same as the disposition question on the permission-to-omit change.
