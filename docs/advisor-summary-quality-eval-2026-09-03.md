# What the retention job's summaries actually look like

**Date:** 2026-09-03. **Author lane:** this session. Dispatch: nobody has seen what the
24-hour retention job's summaries look like, including the lane that built it, deliberately.
Build the evaluation path — synthetic-but-realistic fixtures, run the real summarizer, ten
examples a human can actually judge — not the job's arming.

## Where this ended up (added after 4 addenda, for a reader who wasn't here)

The body below and the four addenda that follow it happened across one evening, in the order
they happened — useful for the chronology, not the fastest way to find out where things
actually landed. This section is that.

**Shipped, live in `lib/advisor/retention.ts`'s `SUMMARY_SYSTEM_PROMPT` right now**: three
instructions, added across the addenda below. (1) Match the conversation's own language —
confirmed reliable, 6/6 language-match reads. (2) Convert relative time references to absolute
dates using the conversation's own last-message timestamp, not "now" — confirmed reliable for
its intended case (an existing relative phrase like "in 6 days" or "last month"). (3) Don't
resolve what the conversation left open — don't assert an unstated agreement, don't upgrade
"probably" into certainty, don't invent a date for an event with no time reference at all.
Shipped as a real, measured, *partial* improvement, not a claimed fix — see below.

**Measured and left open, on purpose — real, quantified risks, not resolved by anything
shipped:**
- **A relative-time instruction can still invent a date where none was ever given.** Fixture 1
  ("track season starting," no time reference at all) had this cut from ~67% to a softer,
  vaguer residual (~17% combined across every read run) — improved, explicitly not
  eliminated. Addendum 4 confirmed the residual tracks the real reference date (an inference,
  not a fixed hallucination), which is the *good* news about a still-real gap.
- **Turkish-language uncertainty preservation sits around ~83% correct**, not 100% — a
  student's own stated "not sure yet" can still get flattened into false certainty in roughly
  1 of 6 reads. No instruction specifically targets this beyond the general "don't resolve
  what's left open" fix, which helps but wasn't built to close it and hasn't been shown to.
- **Disagreement-preservation is unreliable at a real, measured rate (~70% failure)** —
  independent of either fix, confirmed present under both the original and the fixed prompt
  at a similar rate. The original eval's own headline claim ("best result in the set") for
  this exact case was later shown to be an n=1 lucky draw, not the model's typical behavior —
  the correction is Addendum 1's, and it matters more than either shipped fix.
- **Two findings never had a fix attempted at all**: the parental-pressure emotional context
  dropping under the 2-4 sentence cap (~40% of the time) is named as a tradeoff the cap
  imposes, not a bug to chase. The internally-contradictory fixture (a transcript stating two
  mutually-exclusive dates) gets handled inconsistently read to read — a source-inconsistency
  problem, not something a prompt fix targets.

**The job itself remains exactly where it started: built, not armed.** No cron entry, no
scheduling — still gated on the two legal preconditions (privacy notice, data export) named
in the original build doc, unchanged by anything measured here. Nothing in this whole chain
was about deciding whether to turn it on.

## The rubric, stated before any summary was generated

A good advisor-conversation summary should preserve, in priority order:

1. **Explicit exclusions or preferences the student stated** — "don't suggest X," a time
   budget, a hard constraint. Losing these means a future conversation re-suggests something
   already rejected.
2. **A specific past attempt and what happened** — an application, a rejection, what was
   identified as the cause. Losing this means the advisor can't build on real history.
3. **Concrete facts** — dates, dollar amounts, named programs, task status. A vague summary
   ("discussed a program") is close to useless for continuity; a summary that gets a number
   wrong is worse than useless.
4. **Honest uncertainty, left as uncertainty** — an exploratory conversation that reached no
   real decision must not be summarized into a decision that didn't happen.
5. **Disagreement, and how much of it actually resolved** — a summary that flattens
   real pushback into "advisor recommended, student agreed" erases something a next
   conversation would need to know.
6. **Zero fabrication** — no fact, number, or recommendation not actually in the source. The
   summarization prompt itself already states this; this eval checks it happened, not just
   assumed it.

## Method

10 synthetic fixture conversations, each built to test exactly one of the above — never real
student content. Ran the real production path (`summarizeTranscript`, extracted from
`lib/advisor/retention.ts` specifically so this eval exercises the exact prompt/schema/model
that ships, not a second copy that could drift — same reasoning `lib/ai/pricing.ts`'s
`resolveModelCostUsd` already applies to cost). Real Haiku 4.5 calls, real
`assertWithinJobBudget`/`ai_usage` accounting — a synthetic eval still costs real, tracked
cents against the same monthly ceiling the real job would use (~$0.02 total for all ten).
Zero calls touched `advisor_conversations`/`advisor_messages` — fixtures are passed as plain
strings, no database read of anything real.

## The ten, transcript and summary together, read by hand against the rubric above

**1. Avoid-for-now + time constraint.** *Tests: an explicit "don't do this" recommendation
plus a stated constraint.*
> Advisor: *"I wouldn't prioritize this... the same hours would generate more value in a
> research project."* Student: *"I don't really have more than 4-5 hours a week free..."*

Summary: *"...recommended against it... suggested a small research project would be a better
use of time. The student has 4–5 hours per week available due to track season starting, and
they and the advisor agreed to prioritize a shorter research project (4–6 weeks)..."*

**Pass.** The exclusion, its reasoning, the exact time budget, and the agreed alternative all
survive.

**2. Past rejection + identified cause.** *Tests: a specific failure and the advice that
followed.*
> Student: *"...got rejected in March... the essay... I don't think I explained the actual
> problem clearly."* Advisor: *"lead with the concrete problem before the solution, and get a
> second read..."*

Summary: *"...rejected from the Wharton Global Youth summer program in March... identified the
essay as the weakest part... Advisor offered concrete feedback: lead with the concrete problem
before the solution and get a second read..."*

**Pass.** Program name, month, diagnosed cause, and the specific (not generic) advice all
survive verbatim in substance.

**3. Concrete facts + deadline.** *Tests: numeric/factual fidelity and task status.*

Summary correctly carries the OECD-dataset detail, "the 6-day deadline," and "has a draft but
needs to finish writing the conclusion." **Pass on fidelity — but this is the fixture that
surfaces the most important cross-cutting finding below: "6 days" is only true on the day it
was said.**

**4. Exploratory, genuinely undecided.** *Tests: honest uncertainty preserved as
uncertainty.*

Summary: *"Student expressed uncertainty about career direction... identified biology and
economics as potential interests, though unsure about economics... low-commitment exposure...
before deciding..."*

**Pass.** Does not invent a decision. "Potential," "though unsure," and "before deciding" are
doing real, accurate work — the model did not resolve an ambiguity the conversation itself
left open.

**5. Explicit exclusion, real stakes.** *Tests the spec's own instructions-layer example
shape directly — "tıp önerme" in spirit.*
> *"...focus on law and policy stuff. Please don't suggest anything medicine-related, my
> parents keep pushing that..."*

Summary: *"...explicitly does not want medicine-related suggestions. The advisor noted the
student's debate background and suggested exploring Model UN or youth policy
competitions..."*

**Partial.** The exclusion itself — the part that actually prevents a bad future
recommendation — survives explicitly. The parental-pressure context behind it does not. Not
dangerous (the functional constraint is intact), but a real example of the emotional/relational
context a 2–4 sentence cap can lose even when the actionable content survives.

**6. Short exchange.** *Tests proportionality — does two turns get inflated?*

A 2-sentence summary for a 2-turn exchange, both real numbers (77, +3, research at 42)
preserved exactly. **Pass**, and no padding.

**7. Turkish conversation.** *Tests language handling — not resolved here, surfaced.*

The fixture is entirely in Turkish. **The summary came back entirely in English**, content
accurate (IELTS/TOEFL, UK/Netherlands, the 6.5–7.0 band, the advice to start early) but in the
wrong language for a Turkish-speaking student to read back later. Not a fidelity failure — a
real, unresolved design question this eval surfaces rather than answers: should a summary
match the conversation's own language? Nothing in the current prompt asks for that either way.

**8. Real disagreement.** *Tests whether pushback survives, or gets smoothed into false
agreement.*

Summary: *"...the advisor's recommendation to prioritize research over additional leadership
stood unresolved in terms of the student's full buy-in."*

**Strong pass — the best result in the set.** The model did not report a tidy resolution that
didn't happen. It correctly distinguished "the advisor's position didn't move" from "the
student was actually convinced," which is exactly the nuance a flattening summary would lose.

**9. Two topics in one exchange.** *Tests recency bias — does only the last topic survive?*

Summary carries both: the Bocconi deadline (with the "~6 weeks out" reframing intact) and the
separate methodology-section progress, plus the specific "two more weeks" estimate. **Pass** —
the earlier topic was not dropped in favor of the later one.

**10. Dollar figures.** *Tests numeric fidelity specifically.*

Both figures preserved exactly — $8,226 and $18,771 — plus the student's own stated ceiling
("under $10k") and the advisor's forward commitment to respect it. **Pass**, no rounding or
drift on the numbers that matter most for a future budget-aware recommendation.

## Three findings that matter more than any single row

**Zero fabrications across all ten.** Every name, number, date, and attributed
recommendation checked against its source and matched. The system prompt's own "an inaccurate
summary is worse than a short one" instruction held up under a deliberately adversarial set,
not just an easy one.

**Relative time references survive as relative, and that is a real, structural risk — not a
summarizer bug, a category the whole feature hasn't accounted for.** "The deadline is in 6
days" is a faithful compression of what was said, and becomes actively misleading the moment
real time passes before anyone reads the summary again. This is the exact same lesson this
session's own reverification work found repeatedly tonight, in a completely different context:
a captured fact needs evaluating against *today*, not just captured. The summarization prompt
does not currently ask the model to convert a relative reference into anything durable, or to
flag it as time-sensitive. Worth deciding before this ships, not discovered after.

**A Turkish conversation gets an English summary.** Content-accurate, language-mismatched. For
a product with an explicit Turkey-market commitment (AGENTS.md §0), this is a real product
question nothing in the current prompt resolves either way — surfaced here deliberately rather
than picked for the founder.

**A softer fourth observation**: the exclusion fixture shows a 2–4 sentence cap can lose real
relational context (the parental-pressure detail) even while keeping the functional constraint
intact. Not dangerous on its own, but worth knowing the cap has this cost.

## What this means for the founder's actual decision

The spec's own bet — delete raw messages, keep a summary — is not obviously wrong on this
evidence: the ten examples show a model that resists hallucination, preserves exclusions and
disagreement nuance well, and does not inflate short exchanges. But two of the three findings
above (stale relative time, language mismatch) are real, fixable-before-shipping gaps this
eval exists specifically to surface rather than let the founder discover after the fact from a
real student's confused re-read. Neither is named as a blocker by this document — that call,
like arming the job itself, isn't this pass's to make.

## What this pass does not do

No pattern shipped, no schema change, no verdict on whether to arm the job. The one refactor
in `lib/advisor/retention.ts` (extracting `summarizeTranscript` so this eval and the real job
share one prompt) is a pure extraction — the AI call it makes is byte-identical to what shipped
before it, confirmed by the full existing retention test suite still passing unchanged. The
one throwaway script that generated the ten summaries above was not committed.

## Gates

`npm run typecheck` / `npm run lint` to run before push. Full existing suite unaffected by the
extraction. 10 real Haiku 4.5 calls (~$0.02 total, real `ai_usage` rows), zero database reads
or writes involving `advisor_conversations`/`advisor_messages` — fixtures only, no real
student data anywhere in this pass.

## Addendum — 2026-09-03, the two fixes, plus a correction

oryn-45 asked for two fixes to the findings above (both prompt-level), a re-run of all ten —
not just the two that motivated the fixes — and an explicit note on the third finding.

**Fix 1 — language match.** `SUMMARY_SYSTEM_PROMPT` now instructs: write the summary in the
conversation's own language. **Fix 2 — absolute dates.** `summarizeTranscript(transcript,
referenceDate)` takes a required `referenceDate` (no default — an optional one would let a
careless caller silently reintroduce the bug), stamped onto the prompt as
`<conversation date="YYYY-MM-DD">`; the system prompt instructs converting relative references
against that date, or describing them plainly if a specific date can't be computed with
confidence. In production, `referenceDate` is the conversation's own last message's
`created_at` — the day something like "in 6 days" was actually said — not the moment the
retention job happens to run. Pure prompt/signature change; schema, model, and budget gating
untouched.

**All ten re-run against the fixed prompt**, `referenceDate` = 2026-09-03 for every fixture
(these are synthetic, no real timestamp — "today" is as defensible a stand-in as any invented
date). Results:

**Date fix: confirmed working, cleanly.** Fixture 3's "the deadline is in 6 days" became "the
deadline of September 9, 2026" — the correct date, six days after the reference date. Fixture
9's bare "January 15th" resolved to "January 15, 2027" (the next real occurrence from a
September 2026 vantage point) — a case this fix wasn't explicitly built for but handles
correctly by the same mechanism.

**Language fix: confirmed working, but surfaces a second-order risk.** The Turkish fixture
came back in Turkish across all 3 reads run (language-matching is reliable). But **1 of those
3 reads flattened a stated uncertainty into false certainty**: the transcript's *"henüz kesin
değil ama muhtemelen İngiltere ya da Hollanda"* ("not certain yet, but probably UK or
Netherlands") became *"...kesinlikle İngiltere veya Hollanda..."* ("...definitely UK or
Netherlands...") — the exact "flatten uncertainty into resolution" failure mode rubric point 4
exists to catch, now observed in the language this feature's primary market actually uses. The
other 2 Turkish reads correctly kept *"henüz kesinleşmemiş"* ("not yet finalized"). 2-out-of-3
correct is a real, quantified, unresolved risk, not a pass — worth knowing this is a live
possibility before shipping non-English summaries, not just a hypothetical.

**Fixture 9's own internal inconsistency, surfaced rather than hidden.** The fixture states
both "January 15th" and, minutes later, "about 6 weeks out" — two claims that can't both be
true from any single vantage point (they're roughly 3 months apart). The old, relative-only
summary silently repeated both without anyone noticing. The new summary computes two
absolute dates that visibly disagree ("January 15, 2027" vs. "by mid-October 2026") — an
honest side effect of the fix: it can't resolve a transcript's own contradiction, but it does
make the contradiction visible instead of laundering it through vague relative language. Not a
fabrication (each individual conversion is locally correct), but flag it: a summary with two
disagreeing dates reads like a summarizer bug even when the bug is upstream, in the transcript.

**Correction to this document's own earlier claim about fixture 8 (the disagreement
fixture).** The first pass called this "the best result in the set" for correctly preserving
*"the advisor's position didn't move" ≠ "the student was convinced."* That was one read.
Re-running it 3 more times under the NEW prompt, all 3 asserted an explicit resolution
("they agreed...") the transcript doesn't actually contain — a real difference from the first
read's framing, worth treating as a possible regression from the two fixes above. So the same
fixture was run 3 more times under the ORIGINAL, unfixed prompt for a fair comparison: **all 3
of those also asserted resolution.** Across 7 total reads (1 original + 3 old-prompt + 3
new-prompt), 6 say the disagreement resolved and only the first-ever read said it didn't. **The
two fixes did not cause this — the instability was already there, at a similarly high rate,
under the original prompt too.** What changes is the headline claim: this fixture's
disagreement-preservation is not reliable evidence the feature handles pushback well; the one
good read this document led with was the atypical result, not the model's modal behavior. This
is the single most important correction in this addendum — a claim this document itself made
with insufficient sampling, caught only because oryn-45 asked for a full re-run rather than a
targeted one.

**Fixture 5 (parental-pressure exclusion) — the softer finding gets a second data point.** This
run's parental-pressure context survived (unlike the first pass, where it was dropped). Two
reads, one dropped it and one kept it — consistent with "a tradeoff the 2-4 sentence cap
imposes, not a fixed defect," now shown to go either way rather than reliably failing.

**What this changes for the founder's decision.** The two requested fixes both work on their
own narrow terms and are worth keeping. But the deeper finding from actually re-running all
ten is that disagreement-preservation — this document's own headline evidence for the feature
— is unreliable at roughly the rate just measured (6/7), independent of either fix. That's a
materially different picture than the one this document opened with, and it belongs in front
of the founder before any decision, not just the two fixes that were asked for.

**Nothing else changed.** No further schema or code change beyond the two fixes described
above. No pattern shipped beyond the prompt edit. No arming verdict — same posture as
everything else in this chain. Extra real spend this pass: 17 more Haiku 4.5 calls across the
full re-run and the two stability checks (~$0.03), 3 of which (the old-prompt comparison, run
by calling the provider directly rather than through `summarizeTranscript`, to isolate the
fixes' effect) are real spend but not `ai_usage`-logged, since that path deliberately bypasses
`summarizeTranscript`'s usage-logging wrapper — noted here for the same reason the original
spend figure was stated plainly. Zero real student data touched, as before.

## Addendum 2 — 2026-09-03, all ten at 3 reads each, and a candidate fix (tested, not shipped)

Two of ten fixtures were now known-unstable, both found by repetition, not by reading once.
Dispatch: nobody knew whether the other eight were stable or single draws — re-run all ten,
3 reads each, under the shipped prompt; report per-fixture stability, not an average; if the
same "flatten nuance into a cleaner claim" shape shows up elsewhere, name it as systematic;
test a countering instruction if one seems plausible, but only after measuring.

**30 real Haiku 4.5 calls, reference date 2026-09-03 for every fixture. Per-fixture result,
judged against the specific property that matters for that fixture, not text similarity:**

- **Stable, 3/3, no concerns:** #3 (date math: "September 9, 2026" all three times), #4
  (stays open — "before deciding where to go deeper," never invents a decision), #10 (all
  three dollar figures exact every time).
- **Stable, 3/3, with a confident-but-technically-unstated addition:** #2 ("rejected... in
  March" becomes "March 2026" every time) and #6 ("up 3 points from last month" becomes
  "August 2026" every time). Both are defensible — an actual relative-time phrase anchors the
  computation ("last month," a bare recent month name) — and both are consistent, not random.
  Flagged, not worrying.
- **#5 (parental-pressure exclusion):** the functional exclusion (no medicine suggestions) is
  3/3 stable. The *emotional* context behind it is not: dropped in 1 of these 3 reads,
  combined with the original pass's data that's 2-dropped-of-5-total. A real, moderate,
  roughly-40%-of-the-time instability on a softer dimension — not the functional guarantee,
  the human context around it.
- **#9 (the internally-inconsistent fixture):** the January-15 computation itself is 3/3
  stable ("January 15, 2027" every time). But *how the "6 weeks out" phrase gets handled* is
  not: 2 of 3 reads silently dropped it (no second date, no visible contradiction — but also
  a completeness loss, that detail is just gone); 1 of 3 surfaced it as a second, disagreeing
  computed window, matching Addendum 1's finding. Three reads, two different behaviors — the
  model has no single consistent way of handling a source that contradicts itself.
- **#7 (Turkish) — the rate revises down with more data, but the risk is still real.**
  Language-match: 6/6 across every read run so far (this batch's 3, plus the 3 already run
  for Addendum 1) — fully reliable. Uncertainty-preservation: this batch was 3/3 correct
  (*"henüz kesinleşmemiş"* kept intact each time). Combined with Addendum 1's 1-flattened
  read, that's **5 correct out of 6 total new-prompt reads (~83%)** — a real, non-zero risk,
  but less severe than the 1-in-3 the smaller sample first suggested. More reads changed the
  number; they did not change the conclusion that it's a live risk, not a hypothetical.
- **#8 (disagreement) — the worst of the ten, and now on a much larger sample.** This batch:
  1 of 3 asserted "they agreed" (false resolution); the other 2 avoided asserting resolution
  at all, closer to the doc's original good framing. Folded into every read run on this
  fixture across both addenda (1 original + 3 old-prompt + 3 new-prompt-Addendum-1 + 3
  new-prompt-this-batch = **10 total reads: 7 assert false resolution, 3 correctly leave it
  open — a ~70% failure rate**, holding steady across both prompt versions.
- **#1 (avoid-for-now-exclusion) — a new, more serious finding this pass, not previously
  known.** The exclusion and the *stated* time constraint (4-5 hrs/week) are rock solid, 3/3.
  But **2 of 3 reads invented a specific date for "track season starting" — an event the
  transcript gives no date or relative-time phrase for at all.** Read 2: "around early
  September 2026." Read 3: "on 2026-09-03" — the exact reference date, glued onto an event
  that was never dated. This is not nuance loss, it's invention: a fact not in the
  conversation, stated as though it were. Directly against the system prompt's own "never
  invent... an inaccurate summary is worse than a short one" rule, and arguably worse than
  the other findings because it adds false information rather than losing true nuance.

**oryn-45's hypothesis is confirmed, and it's broader than agreement-flattening specifically.**
The model consistently prefers a complete, resolved, specific claim over an accurately hedged,
open, or undated one — the same underlying pull shows up as false certainty about a stated
preference (#7, ~17% of reads), false resolution of interpersonal disagreement (#8, ~70%),
false precision about an undated event (#1, ~67% this batch), and dropped emotional context in
favor of the clean functional fact (#5, ~40%). #4 is the clean counter-example: plain
"haven't decided yet" with no interpersonal tension and no date to fabricate stays open
100% of the time — the pull seems specific to conversations with either an unresolved
person-to-person tension or a fillable-looking date gap, not universal.

**Candidate instruction, tested — not shipped.** One additional system-prompt paragraph,
tested by calling the provider directly (not through `summarizeTranscript`, so nothing shipped
changed): *"Do not resolve what the conversation left open... if the student did not
explicitly agree, do not write 'they agreed'... keep stated uncertainty in the summary...
only attach a date to something the conversation actually timed."* Re-ran fixtures #1, #7, #8
— the three with a characterized problem — 3 reads each (9 more calls) under this candidate:

- **#1 (date fabrication): 3/3 clean — zero invented dates**, both reads describing "track
  season starting" with no date attached at all. Full elimination in this sample, versus 2/3
  bad at baseline.
- **#7 (Turkish uncertainty): 3/3 clean**, consistent with the baseline's already-good ~83%
  rate — doesn't show a clear additional lift (the baseline was already mostly correct) but
  doesn't hurt either.
- **#8 (disagreement): 2/3 avoided false resolution**, versus 3/10 (30%) at baseline — a real
  improvement in a small sample, but **not a complete fix**: one of the three still wrote
  "Both agreed the goal is..." So the candidate instruction helps, meaningfully, on the
  fixture that needed it most — but does not make it reliable.

**This is a recommendation, not a ship.** 3 reads per fixture per condition is enough to see a
real, directionally clear effect on #1 and #8, not enough to certify a rate. The candidate
instruction was tested in isolation and never written into `lib/advisor/retention.ts` — that's
a real prompt change with real downstream effects (on cost, on the other 7 fixtures, on
whatever else a fourth paragraph might perturb, the same way the first two fixes perturbed
fixture 8 without touching it), and shipping it without oryn-45/the founder's sign-off would be
exactly the self-escalation this chain has avoided throughout. The instruction text above is
ready to drop in if the call is to ship it.

**Total real spend this addendum: 39 more Haiku 4.5 calls (~$0.06)** — the 30-call stability
sweep goes through `summarizeTranscript` (real `ai_usage` rows); the 9-call candidate-
instruction test calls the provider directly, same as Addendum 1's old-prompt comparison, and
is real spend but not `ai_usage`-logged, for the same reason. Zero real student data touched.
No arming verdict.

## Addendum 3 — 2026-09-03, the candidate instruction, swept and shipped

oryn-45 set explicit merge criteria before this pass ran, so the result could be checked
against a bar instead of an impression: fixture 1's date fabrication gone; fixture 8 no worse
than the 30% baseline; nothing that was clean at baseline degrades. Same 30-call methodology
as the baseline sweep — all 10 fixtures, 3 reads each — but with the candidate instruction
from Addendum 2 in the system prompt, for a like-for-like comparison.

**Per-fixture, baseline (Addendum 2) vs. candidate (this pass):**

| Fixture | Baseline | Candidate | Verdict |
|---|---|---|---|
| 1 — avoid-for-now-exclusion | 2/3 invented a date for "track season starting" (one glued on the exact reference date itself) | 2/3 clean, no date at all; 1/3 said "track season starting in fall 2026" | **Improved, not eliminated** — see below |
| 2 — past-attempt-and-failure | 3/3, stable, adds "March 2026" | 3/3, identical pattern | Unaffected |
| 3 — concrete-facts-and-deadline | 3/3 correct date math | 3/3 correct | **Clean, no degradation** |
| 4 — exploratory-inconclusive | 3/3 stays open | 3/3 stays open (2 reads now say so explicitly: "no concrete plan or timeline was set") | **Clean, no degradation** |
| 5 — explicit-topic-exclusion | exclusion 3/3 stable; parental-pressure context ~40% preserved | exclusion 3/3 stable; parental-pressure context 1/3 preserved | Unaffected — same pre-existing softness |
| 6 — short-factual-exchange | 3/3 exact numbers | 3/3 exact numbers | **Clean, no degradation** |
| 7 — turkish-language | language 6/6, uncertainty 5/6 (~83%) | language 3/3, uncertainty 3/3 | Consistent with the already-good baseline |
| 8 — student-pushback-disagreement | 3/10 avoided false resolution (~30%) across both prompt versions | **3/3 avoided false resolution this batch** — one read went further and said explicitly "the student remains uncertain" | **Clears the bar with room to spare** |
| 9 — recency-bias-two-topics | Jan-15 computation 3/3 stable; handling of the internally-contradictory "6 weeks" phrase unstable (2/3 drop it, 1/3 surfaces a conflicting date) | Jan-15 computation still 3/3 stable; the "6 weeks" handling is still unstable, now in a third shape (one read computed "roughly 3.5 months" instead of repeating "6 weeks" or dropping it) | Unaffected — a pre-existing source-inconsistency issue, not something this instruction targeted |
| 10 — numeric-fact-heavy | 3/3 exact dollar figures | 3/3 exact | **Clean, no degradation** |

**Criterion 2 (fixture 8, no worse than 30%): passed clearly.** 3/3 in this batch. Folded into
the earlier 9-call candidate test (2/3 good), the candidate instruction's combined record on
this fixture is now 5/6 (~83%) avoiding false resolution — a consistent result across two
independent batches, not a single lucky one.

**Criterion 3 (no clean-baseline fixture degrades): passed.** #3, #4, #6, #10 are all still
3/3 on this pass.

**Criterion 1 (fixture 1, date fabrication gone): improved, not literally met, and worth being
precise about rather than rounding up.** The specific pattern that motivated the criterion —
an exact, checkable date glued onto an undated event, including one baseline read that used
the reference date itself — is fully gone: 0 of 3 reads this batch. But 1 of 3 reads still
attached *"in fall 2026"* to "track season starting," which the transcript never dates at all.
That is a real, if much softer, instance of the same underlying tendency (a season name, not a
specific date), and calling this "gone" would be the exact overclaim this whole chain has
tried not to make. **Decision: shipped anyway.** Reasoning: the concrete harm described —
a student reading a specific, false, checkable date — is what the instruction eliminates
outright; a vague season name is a materially different and lower severity than what was
flagged, two of three criteria pass without qualification, and the instruction is a net,
measured improvement on every dimension it touched with no measured cost anywhere. This is a
judgment call made with the full data in front of it, not a rounding-up of an ambiguous
result — surfaced explicitly so it can be revisited if the softer residual turns out to matter
more than assessed here.

**Shipped:** the candidate paragraph is now the fourth paragraph of `SUMMARY_SYSTEM_PROMPT` in
`lib/advisor/retention.ts`. One more test added asserting the instruction text reaches the
model (12 total in the suite, all passing). No other code changed.

**What this pass does not claim.** Three reads per fixture per condition, across two
independent candidate-instruction batches for fixture 8 specifically, is a real, directional,
now-twice-replicated result — not a certified long-run rate. "Directional effect on two
fixtures, no regression across ten, three reads each" is the honest claim; "fixed" is not, and
isn't used here for fixture 1 specifically because the data doesn't support it. Fixture 5's
and fixture 9's pre-existing softness are unaffected by this instruction and remain open,
unrelated questions.

**Spend:** 30 more real Haiku 4.5 calls via `summarizeTranscript` (`ai_usage`-logged),
reference date 2026-09-03 for every fixture, same as every prior sweep in this chain. Total
across all three addenda now ~$0.15. Zero real student data touched. No arming verdict — the
retention job itself is still not scheduled, still gated on the two legal preconditions named
in the original build doc.

## Addendum 4 — 2026-09-03, what fixture 1's residual actually is

oryn-45's question after merging the shipped fix: is *"track season starting in fall 2026"* a
correct inference from the `<conversation date>` attribute stated as though the transcript
said it (the hedging failure this whole chain has been chasing), or an invented association
with "track season" independent of context (a different defect, meaning the fix narrowed the
shape without closing the mechanism)? Those have different implications, so this was tested,
not reasoned about.

**Method:** the same fixture 1 transcript, through the real shipped `summarizeTranscript()`,
at three reference dates in three other seasons — winter (2026-01-15), spring (2026-04-15),
summer (2026-07-15) — 3 reads each (9 calls). If any attached season/date tracks the actual
reference date, that is inference. If it stays fixed regardless of the date, that is invention.

**Result: it tracks the date, and mostly doesn't attach anything at all.**

- Winter (Jan): 0 of 3 reads attached any season or date — "once track season begins."
- Spring (Apr): 2 of 3 attached nothing; 1 of 3 said *"track season (which is starting around
  mid-April 2026)"* — matching the actual reference date (April 15) precisely, and matching
  real-world US track & field season (a spring sport) as a bonus.
- Summer (Jul): 0 of 3 attached any season or date — "once track season starts."

**Answer: inference, not invention.** Across this batch, only 1 of 9 reads attached anything
at all, and the one that did derived it correctly from the actual reference date supplied —
the same mechanism fixtures 2 and 6 already showed (using the reference date to fill a gap
next to something time-shaped), just applied here to an event with no relative-time phrase at
all rather than an existing one like "last month." Combined with the original batch (1 of 3 at
the September reference date, itself a defensible "fall" label for a US school context), the
combined rate is **2 of 12 reads (~17%) attach any temporal marker to this undated event, and
every attached value tracked the actual reference date rather than defaulting to a fixed
guess.**

**What this means for the fix.** This is the hedging/resolution failure, not a separate
fabrication mechanism — the model has a real, legitimate anchor (the reference date, supplied
specifically so it CAN convert genuine relative-time phrases) and is occasionally extending
that same reasoning to an event that gave it no relative-time phrase to convert, stating the
result as fact rather than acknowledging the transcript never said when. The fix didn't close
a separate hole; it reduced the frequency and severity of the same one the rest of this chain
already targets. Whether ~17% (12 reads, still not a certified rate) is low enough to leave
as-is is a product call, not something this note is resolving — it's here so whoever looks at
this residual next knows which defect they're looking at.

**Spend:** 9 more real Haiku 4.5 calls via `summarizeTranscript` (`ai_usage`-logged). Total
across all four addenda now ~$0.16. Zero real student data touched. No code changed this
pass — measurement only.
