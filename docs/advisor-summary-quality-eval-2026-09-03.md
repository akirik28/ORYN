# What the retention job's summaries actually look like

**Date:** 2026-09-03. **Author lane:** this session. Dispatch: nobody has seen what the
24-hour retention job's summaries look like, including the lane that built it, deliberately.
Build the evaluation path — synthetic-but-realistic fixtures, run the real summarizer, ten
examples a human can actually judge — not the job's arming.

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
