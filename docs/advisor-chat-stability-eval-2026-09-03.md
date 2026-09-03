# Advisor live chat: fact-grounding under repetition

**Date:** 2026-09-03. **Author lane:** this session. Offered, not assigned, by oryn-45 after
the retention-summary chain closed: the summary is what survives after raw messages are
deleted; the live chat reply is what the student actually reads in the moment. Nobody had
applied this session's own method — repeated reads of the same fixture, hand-checked against
known-true facts — to that surface. This pass does.

## Why this isn't a duplicate of the existing eval harness

`lib/ai/eval/` already exists, is real, and is well-built: two fixtures (`regression`,
`baseline`), a deterministic-check layer (raw enum leaks, unassessed-dimension-scored), and an
LLM judge scoring six tone criteria plus a discourage verdict. This pass reuses that harness's
real fixtures and real prompt-assembly (`buildAdvisorChatPrompt`) rather than inventing a
parallel copy — same reasoning as extracting `summarizeTranscript` earlier tonight.

What it does not do: **the judge's own system prompt states plainly, "you are grading the
reply's voice and judgment, not fact-checking it — assume the facts it states about the
student are accurate; that is not your job here."** Nothing in the existing harness checks
whether a reply's claims about the student's own scores, activities, or deadlines are actually
true. That is exactly this session's established competency from the retention-summary work,
and exactly the gap this pass targets.

## Method

The two real fixtures (`regression`, `baseline`), `advisor_chat` target, English locale, 3
reads each — 6 real calls through `buildAdvisorChatPrompt` + the real provider, the same
prompt assembly `generateAdvisorReply` uses in production (model: `claude-sonnet-5`, the
configured ceiling model, not Haiku — this is what a real student actually gets). Every claim
in every reply checked by hand against the fixture's own literal data in
`lib/ai/eval/fixtures.ts` — not against what sounds plausible, against the actual numbers.

## What held up, stable across all 6 reads

- **Discourage verdict, 3/3 correct on both fixtures.** Regression: every read said no to a
  second club, all three citing the same real reasoning (leadership/entrepreneurship already
  strong, research the actual gap) — the exact historical regression this harness's fixture
  was built to catch stays fixed under repetition, not just on a single read. Baseline:
  correctly discouraged nothing, in all 3 reads — matches `expectDiscourage: "no"`.
- **Every score cited was correct.** Leadership 88, entrepreneurship 82, research
  "unassessed"/0, execution/project depth 60, intellectual curiosity 55 (regression);
  academics 85, execution/project depth 55, awards 20 (baseline) — all checked against the
  fixture, all correct, every time.
- **Every deadline computed was correct.** The fellowship deadline (`inDays(30)` from the
  fixture's reference date = Oct 1, 2026) appeared correctly in all 3 regression reads, once
  as a full date, twice as "Oct 2026." The LSE personal-statement deadline (`inDays(21)` =
  Sept 22, 2026) appeared exactly right where a read cited a specific day. The Economics
  Challenge deadline (`inDays(6)` = Sept 7) and the busy-mode end date (`inDays(14)` = Sept
  15) were both exactly right in every baseline read.
- **Uncertainty correctly flagged, not invented.** Both fixtures' counselor recommendation has
  `costOnFile: null`. Every read that mentioned cost said so explicitly — "check the actual
  cost on their site," "I don't have a confirmed fee" — never invented a number. This is the
  single strongest result in the set: a live, real product surface, under real repetition,
  never fabricated a cost that isn't in the data.
- **Zero raw identifier leaks, zero unassessed-dimension-scored** across all 6 replies — the
  two regressions the existing harness's deterministic checks exist to catch. Confirmed stable
  under repetition, not just present on whichever single read someone last checked.

## What didn't hold up

**A real, reproducible ranking error — 3 of 3 baseline reads, not a hedging nuance.** All
three replies name the student's "two weakest dimensions" as Awards & Distinction (20) and
Career Exploration (40):

> Read 1: *"...targets your two weakest dimensions: Awards & Distinction (20/100) and Career
> Exploration (40/100)..."*
> Read 2: *"Awards & Distinction is your weakest dimension (20/100)... Career Exploration
> (40/100) is also weak..."*
> Read 3: *"...targets your two weakest dimensions: Awards & Distinction (20/100, your
> lowest) and Career Exploration (40/100)..."*

The fixture's actual scores, sorted: Awards & Distinction 20, **Entrepreneurship 30**, Career
Exploration 40, Leadership 45, Community Impact 50, Execution/Project Depth 55, Research 62,
Intellectual Curiosity 70, Academics 85. **Entrepreneurship (30) is the real second-lowest
dimension, and it does not appear in any of the three "two weakest" claims — Career
Exploration (40), objectively higher, is named instead, every time.**

This is not the summary chain's "flatten an open question into a resolved one" pattern — this
is a wrong analytical claim about numbers that were correctly cited elsewhere in the very same
reply (Execution/Project Depth 55 is quoted correctly in read 2, right alongside the wrong
ranking claim). The likely mechanism: Career Exploration connects narratively to the Economics
Challenge recommendation being made ("matches your stated interest in Economics") in a way
Entrepreneurship doesn't, and the model appears to have picked the dimension that makes its
own recommendation's justification read better, rather than the actually-lowest one. Whether
that's the real mechanism or not, the observable fact is: **a reproducible, 3-for-3 factual
error about the student's own profile, on the live surface the student reads directly** — more
consequential than anything found in the retention-summary work, because there's no
downstream retention job smoothing it out; this is what the student sees.

**A softer pattern, 2 of 3 baseline reads: inventing a cause for "busy mode."** The fixture
sets `busyMode: true, busyModeUntil: <Sept 15>` with no reason field at all. Two of three
reads say *"given the exam period"* / *"your exam period"* as the reason. The specific guess
is plausible and low-stakes (nothing in the recommendation changes based on why the student is
busy), but it's still asserting a cause the data never states — the same "inference stated as
fact" family the retention-summary chain spent all night characterizing, here manifesting as
an invented reason rather than an invented date.

**A minor omission, 2 of 3 regression reads.** The peer tutoring marketplace project's
`outcomeSummary` is *"40 active student users, self-funded"* — already on file. Two reads ask
the student to add *"user numbers"* or *"a concrete outcome (users...)"* as though that detail
is missing, when it's already recorded. Not a fabrication of something false; a real gap
between what's claimed missing and what's actually there.

**One likely invented quoted phrase, 1 of 3 regression reads.** Read 3: *"Execution/Project
Depth (60, 'good next area to strengthen')"* — the quotation marks imply a citation, but no
field in the fixture data contains that phrase or anything close to it. A single occurrence,
not established as a pattern the way the ranking error is.

## What this means

The two findings the existing harness was built to catch — the discourage regression, the raw
identifier leaks — are confirmed genuinely stable under repetition, not just correct on
whichever read someone happened to check last. That's real, useful confirmation.

The ranking error is the finding that matters most from this pass, precisely because the
existing judge explicitly doesn't check for it ("assume the facts it states... are accurate")
and the deterministic checks aren't built to either — nothing in the current pipeline would
have caught this on its own, on any number of runs, until someone actually cross-checked a
claim against the source numbers. 3-for-3 on the one fixture and one specific claim tested is
a real, reproducible signal, not a proven long-run rate — the honest claim is "reproducible
across 3 reads on this fixture," not "this happens on every reply, always." This wasn't
tested against the `regression` fixture's own ranking claims (it doesn't make an analogous
"two weakest" statement in any of the three reads) — whether the same mechanism appears
elsewhere in the product is an open, unmeasured question, not something this pass answers.

## What this pass does not do

No fix proposed or shipped. No new fixture added to `lib/ai/eval/fixtures.ts`. No verdict on
whether/how to close the ranking-error gap — a deterministic "state the two lowest scores
correctly" check would be straightforward to add to `deterministic-checks.ts` following the
existing file's own pattern, but that's a build decision for whoever owns this harness, not
this pass's call to make unilaterally.

## Spend

6 real `claude-sonnet-5` calls (the real configured ceiling model, not Haiku), maxTokens 8192
each — real spend, not `ai_usage`-logged (called the provider directly via the harness's own
pure `buildAdvisorChatPrompt`, the same technique `scripts/run-ai-eval.ts --live` itself uses,
bypassing per-student usage logging since there is no real student here). Roughly $0.10-0.20
based on actual reply lengths (none of the six replies approached the 8192-token ceiling).
Zero real student data touched — both fixtures are the harness's own existing synthetic
profiles.
