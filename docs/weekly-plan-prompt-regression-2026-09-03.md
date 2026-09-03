# Weekly-plan prompt regression check — corrected result (2026-09-03)

`ADVISOR_SYSTEM_PROMPT` and the dimension-block header in `formatContextForPrompt` feed two
consumers: advisor chat and the weekly-plan generator (both files' own header comments say so).
Three prompt-affecting changes landed tonight — the Scope section (`002cc0ec`), the wellbeing
clause (`8eb17de3`), and the rank-2 narrowing instruction (mine) — and every live measurement
all night went through the chat path only. This checks the other consumer, per CEO's request.
**Doc only, no prompt changes.**

**Headline, after a correction described below: no regression found.** Schema-validation
reliability on true current main is as good as or better than before tonight's changes, and the
narrowing instruction's ordinal-claim compliance — clean in chat — is also clean here, 13/13. A
Turkish-locale spot-check (added mid-task at CEO's request) also holds. The Scope and wellbeing
hypotheses were never supported by evidence at any point in this investigation.

## A real error in my own first pass, corrected before it went out

CEO's task message named the current main tip as `994ed8b8`. I branched from it, built an "OLD
vs NEW" comparison, and got a stark result: NEW showing far more schema-validation retries and
failures than OLD, plus what looked like the narrowing instruction being ignored in the
weekly-plan `reason` field. I wrote that up as the finding.

**Before committing it, I checked which code was actually at `994ed8b8` — and it wasn't what I
assumed.** `git merge-base --is-ancestor` on my own narrowing-instruction commit against
`994ed8b8` came back false: the narrowing-instruction merge landed on main *after* CEO's message,
in the ordinary course of a fast-moving night, not before it. `994ed8b8`'s `student-context.ts`
was still on the intermediate rank-2-*tag* state (the `— second-weakest` string, from the pass
before the narrowing instruction superseded it) — not the narrowing instruction I was supposed
to be testing. Confirmed directly with `git show 994ed8b8:lib/ai/student-context.ts`, not
inferred.

**That single fact invalidated both headline findings from the first pass**: the "NEW" arm never
tested the narrowing instruction at all, and what I'd read as "the model naming
'second-weakest' despite being told not to" was the rank-2 tag correctly doing exactly what it
was built to do — there was no instruction being violated, because the instruction wasn't in the
prompt I was testing. Re-fetched true current main (moved twice more while writing this, now
`1ab2161b`), reran the comparison against the actual narrowing-instruction code, and got a
different, cleaner result — below. **Not deleting the wrong finding quietly and replacing it
silently**: stating the error plainly, because reporting the corrected number without saying the
first one was wrong would be exactly the kind of overclaim this whole night's chain of work has
tried not to make, just in the other direction.

## Method (corrected)

Real `provider.generateStructured` calls against `WeeklyPlanSchema` — the actual production
schema, actual retry logic (`lib/ai/anthropic-provider.ts`'s real 2-attempt loop), actual
post-processing (`resolvePlanSelfContradiction`, `enforceTimeBudget`) — through the eval
harness's fixture-based path, same convention as every measurement tonight. Two fixtures
(`REGRESSION_CONTEXT`, `BASELINE_CONTEXT`), English, then a Turkish spot-check.

**PRE** = `advisor-prompt.ts` at `c6160a84` (immediately before the Scope-section change — no
Scope, no wellbeing) + `student-context.ts` at `69cf702d` (my own first dimension-ranking
commit — rank-1 "weakest" tagging only, nothing past it). Genuinely "the last state anyone
actually weekly-plan-tested" — rank-1 tagging was itself never checked against this consumer
either, and it's already exhaustively live-verified elsewhere, so reverting past it would
re-litigate a settled question. Pulled via `git show <commit>:<path>`, not hand-retyped.

**CURRENT** = true current main (`1ab2161b`, re-confirmed via `git show ...:lib/ai/student-context.ts`
to actually contain the narrowing instruction's exact text before running anything), unmodified
imports.

**Detecting a silent retry without touching production code**: `generateStructured` sums
`accumulatedUsage.inputTokens` across both attempts before returning
(`anthropic-provider.ts:175,207`) — a first-try success reports exactly that attempt's input
cost; a retried-then-successful call reports roughly double. Confirmed directly from source, not
inferred, and no `cache_control` is set anywhere in the call (ruling out prompt-caching as an
alternative explanation for token-count clustering).

## Finding 1: no schema-validation regression

7 reads each, PRE and CURRENT, both fixtures (28 reads).

| Cell | Clean (1st try) | Retry (2nd try succeeded) | Failed (both exhausted) |
|---|---|---|---|
| regression / PRE | 4/7 (57%) | 3/7 (43%) | 0/7 (0%) |
| regression / CURRENT | 6/7 (86%) | 0/7 (0%) | 1/7 (14%) |
| baseline / PRE | 3/7 (43%) | 2/7 (29%) | 2/7 (29%) |
| baseline / CURRENT | 7/7 (100%) | 0/7 (0%) | 0/7 (0%) |

CURRENT's clean-first-try rate is higher than PRE's on both fixtures, and CURRENT shows zero
retries at all across 14 reads (PRE needed one on 5 of 14). The one CURRENT failure
(regression, read 4) has a different signature from anything PRE produced —
`actions: Invalid input: expected array, received string` — the model apparently emitted the
actions field as a string rather than an array on both attempts. n=1 for that specific error;
not enough to say whether it's elevated by tonight's changes or ordinary model noise, and it
didn't recur in 6 other regression/CURRENT reads or any of the 7 baseline/CURRENT reads. Worth
knowing about, not worth a conclusion from one instance.

**Net: no regression on this metric. If anything, current main looks more reliable than
pre-change**, though PRE vs CURRENT at n=7/cell isn't precise enough to certify an improvement,
only to rule out the large, stark degradation the first (incorrect) pass reported.

## Finding 2: the narrowing instruction holds here too — 13/13 clean

Checked every successful CURRENT read's `reason`/`summary` text against the same criterion used
for the chat-context check: does it claim which dimension is second-weakest, third-weakest, or
any other ordinal position beyond the one dimension explicitly tagged "weakest."

**Regression/CURRENT (6 successful reads): 6/6 clean.** Every read names Intellectual Curiosity
(55/100) as the sole weakest dimension — correctly, it's the true minimum among assessed
dimensions in this fixture — and discusses Execution/Project Depth (60/100, the true
second-lowest) only in plain, non-ordinal terms ("a real gap," "sits at 60/100"), never as
"second-weakest" or any numbered position. This directly contradicts the first pass's finding,
for the reason explained above: that finding was reading the rank-2 tag's own text, not a
violation of an instruction that wasn't present.

**Baseline/CURRENT (7/7 reads): 7/7 clean.** Every read names Awards & Distinction as sole
weakest, nothing else gets an ordinal claim. Consistent with the original narrowing-instruction
pass's chat-context result (0/5, corroborated 0/5 independently) and now extended cleanly to
weekly-plan.

**Combined with the chat-context results, this is 13/13 clean on true current main, across two
consumers and two fixtures.** The instruction generalizes.

## Turkish-locale spot-check (added mid-task, CEO's request)

oryn-80 correctly flagged, and correctly did not call a bug: the `— weakest` /
`— tied for weakest` tag text is hardcoded English regardless of locale — consistent with the
existing pattern where system-prompt instructions stay English and `withOutputLanguage` handles
reply language separately. Nobody had run this specific combination live in Turkish tonight
across roughly 45 English reads. Checked the two things CEO named directly worth checking.

**Dimension names localize correctly**: the rendered context shows "Ödüller ve Başarılar,"
"Girişimcilik," "Kariyer Keşfi," etc. — `dimensionLabel`'s real Turkish output, not English
leaking through. The `— weakest` tag itself does print in English inside the raw context text
(confirmed directly, matching oryn-80's flag exactly), but that's server-side context the
student never sees verbatim.

**3 live Turkish reads, baseline fixture, advisor_chat**: every read correctly names "Ödüller ve
Başarılar" as "en zayıf" ("weakest") — the model translates the English tag into natural Turkish
itself and pairs it with the correctly-localized name every time, 3/3. **Zero ordinal-position
claims for any other dimension in any read** — the withholding instruction, itself English
prose, held under Turkish composition, 3/3. It holds. One line, as asked: the mechanism survives
translation.

## What did not regress (unchanged from the original hypothesis, still true)

**Scope-section register bleed**: no evidence across any read in this investigation — English or
Turkish, PRE or CURRENT, either fixture. No `avoidForNow`/`reason` text reads as a conversational
decline. Structurally, weekly-plan generation has no student message to decline in the first
place — the Scope section's entire trigger condition can't occur here.

**Wellbeing-clause bleed**: same conclusion, same reasoning — the clause is keyed on "a student's
own message," and the weekly-plan prompt contains no such message at all.

**Plan quality when generation succeeds**: consistently specific, grounded in real numbers,
correctly prioritized, correctly built on existing projects over new ones, correctly
time-budget-aware, across every cell in both the original (mistaken) and corrected passes.

## Scope limitations, stated plainly

- n=7 per cell for the main comparison, n=3 for the Turkish spot-check (CEO explicitly asked for
  a couple of reads, not another full sweep). Large, stark differences are ruled out at this
  size; small ones (a few percentage points) are not.
- The one CURRENT failure's distinct error signature (`actions` as string, not array) was seen
  once — flagged, not concluded from.
- Used the eval harness's fixture-based path, not a live database-backed
  `generateWeeklyPlan(userId)` call — same convention as every measurement tonight.

## What this means

No fix needed on the evidence gathered here — the regression the first pass reported does not
exist against the actual current code. The one thing worth carrying forward is procedural, not
about the prompt: **verify which commit is actually checked out before trusting a "current main
is X" from a fast-moving night, especially across a `git checkout -b ... origin/main` done after
the message that stated it** — a few minutes' merge lag was enough to invalidate an entire
comparison here, caught only because the numbers looked stark enough to double-check the
premise before writing them up.

## Spend

28 (corrected PRE/CURRENT comparison) + 3 (Turkish spot-check) = 31 reads in the pass that
shipped, plus 33 reads in the withdrawn first pass (not wasted as a check on the method itself,
but not load-bearing for the conclusion above) — call it roughly 90 raw Anthropic requests
across the full investigation including retries, direct provider calls, not `ai_usage`-logged,
same declared pattern as every comparison call tonight. Zero real student data.
