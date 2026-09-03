# Extending the weakest-dimension tag to rank 2 — live result (2026-09-03)

**Fix under test:** a second pass on top of `oryn/advisor-context-dimension-ranking-2026-09-03`
(commit `69cf702d`, not yet re-pushed as of this doc), following oryn-80's
`docs/advisor-chat-ranking-fix-verification-2026-09-03.md`: rank 1 ("weakest") was confirmed
live-fixed (6/6 across both fixtures), but the literal symptom that started this whole chain —
a "two weakest dimensions" claim naming the wrong second dimension — reproduced 3/3, unchanged,
because only rank 1 carried an inline tag. oryn-80 named the natural next move: extend an
explicit ordinal tag to rank 2, and left the decision to whoever owns the fix next.

## What changed

`formatContextForPrompt` now also computes the second-lowest distinct score among assessed
dimensions and tags it `— second-weakest` (or `— tied for second-weakest` if two or more share
that score), using the exact same filter-then-sort mechanism as the rank-1 tag. Only computed
when rank 1 isn't itself a tie — two dimensions already tied for weakest are already the answer
to "two weakest," so a third, higher-scoring dimension does not also get called second-weakest.
6 new/extended unit tests, 83/83 pass in the file, full suite 384 files / 5,850 pass (2
pre-existing expected-fail, unrelated). Typecheck and lint clean.

**Confirmed the tag actually reaches the model before drawing any conclusion from output** —
printed the exact dimension block `buildAdvisorChatPrompt` sends for the `baseline` fixture:

```
- Awards & Distinction: A good next area to strengthen (20/100, confidence: medium) — weakest
- Entrepreneurship: A good next area to strengthen (30/100, confidence: medium) — second-weakest
- Career Exploration: A good next area to strengthen (40/100, confidence: medium)
- Leadership: A good next area to strengthen (45/100, confidence: medium)
...
```

The tag is exactly where it should be, on exactly the right dimension. Whatever happens next is
not an implementation bug in this fix.

## Live re-check: 7 real `claude-sonnet-5` reads, same fixture and question oryn-80 used

`baseline` fixture, `"What should I focus on this week?"`, English, real `generateText` calls
through the real `buildAdvisorChatPrompt`. Classified only the reads that make a claim directly
comparable to the original bug — a "two weakest" or "second-weakest" style statement:

| Read | Claim made | Correct? |
|---|---|---|
| 1 | "Awards & Distinction is your weakest dimension (20/100) and Entrepreneurship close behind" | **Yes** |
| 2 | "your two weakest dimensions: Awards & Distinction (20/100) and, secondarily, Career Exploration (40/100)" | No |
| 3 | (no explicit two-weakest claim made) | n/a |
| 4 | "Career Exploration — your fourth-weakest dimension at 40/100" (true rank is third-weakest, not fourth — a different, adjacent error, see below) | n/a for this claim |
| 5 | "your two weakest dimensions: Awards & Distinction (20/100) and Career Exploration (40/100)" | No |
| 6 | "your two weakest dimensions at once — Awards & Distinction (20/100) and Career Exploration (40/100)" | No |
| 7 | "directly targets two of your weakest dimensions (Awards & Distinction at 20, Career Exploration at 40)" | No |

**Rank 1 holds perfectly**: all 7 reads that cite the weakest dimension name Awards &
Distinction, consistent with oryn-80's 3/3. **Rank 2 does not**: of the 5 reads that make a
directly comparable claim, 1 is correct and 4 reproduce the exact original error — Career
Exploration named instead of Entrepreneurship — at essentially the same rate as before this
pass (previously 3/3 wrong; now 4/5 wrong). The explicit inline tag measurably helped in at
least one read but did not close the symptom.

## Why an identically-shaped tag works at rank 1 and mostly doesn't at rank 2 — a real difference, not just variance

Every one of the 7 replies recommends the same thing: submitting the Economics Challenge
application. "Career Exploration" as a dimension name sits close, topically, to "explore your
interest via a competition" — a live, motivated reason to reach for that dimension when
justifying the recommendation being written in the same reply, independent of what the
pre-computed ranking says. "Awards & Distinction" has no comparable competing pull toward a
different, wrong dimension in this fixture, which may be a real part of why rank 1 tags so
reliably and rank 2 doesn't — this specific fixture may simply be a harder case for rank 2 than
for rank 1, not proof that inline tags are generally weaker at lower ranks. Read 4's own
mislabeling of Career Exploration as "fourth-weakest" (true rank: third) is a related but
distinct symptom worth naming — an untagged dimension still occasionally gets an invented
ordinal claim, which the rank-1/rank-2 tags don't cover and were never meant to.

## What I did not do, and why

Did not add a stronger instruction (e.g. "name exactly the tagged dimension(s), never another
one") to force compliance. That edges toward the same "tell the model to sort more carefully"
pattern this whole fix was built to avoid — the difference between "sort carefully" and "trust
the tag over your own reasoning" is real, but a 4/5 failure rate against an already-explicit,
correctly-placed tag is not obviously the kind of gap a phrasing change reliably closes, and
guessing at another prompt tweak without evidence it would work is exactly the overclaim this
chain has been careful not to make at every prior step.

## What this means for the merge decision

Keeping the rank-2 code: it is correct, tested, provably reaches the model, measurably helped in
1 of 5 comparable reads, and does not regress anything rank-1 already fixed (still 7/7 live). But
it should not be reported as closing the original "two weakest" symptom — it doesn't, at close to
the original rate. The honest summary across both passes: **rank-1 claims are reliably fixed
(6/6 then, 7/7 now). The literal "name your second-weakest dimension" symptom that started this
fix is not reliably fixed by tagging alone** — 1/5 this round, 0/3 before. Whether that's worth a
larger structural change (e.g. moving "your two weakest are X and Y" out of free-form prose
entirely, into its own deterministic line the model quotes rather than reasons about) is a bigger
design call than a follow-up pass should make unilaterally — flagging it rather than guessing.

## Spend

7 + 1 (prompt-text check, no model call) `claude-sonnet-5` calls, direct provider calls, roughly
$0.15-0.25. Zero real student data.

## Addendum — 2026-09-03, oryn-80's independent corroboration

05 flagged this for the harness owner's own read rather than asserting their hypothesis as
final. Verified independently rather than accepted: fresh worktree at 05's exact commit
(`dfe05642`, not a description), full gate re-run myself (typecheck/lint clean, 83/83 in the
touched file, full suite 384/5,852 green — matches 05's own numbers exactly), the rendered
prompt printed independently before trusting any output (identical to 05's own printed
snippet — Awards `— weakest`, Entrepreneurship `— second-weakest`, Career Exploration
untagged), then 5 more real `claude-sonnet-5` reads, same fixture and question, run fresh from
a different session.

**Result: corroborates 05's rate almost exactly.** Of 5 fresh reads, 1 correctly used the
tag verbatim on the right dimension (*"I'd leave Entrepreneurship alone for now too — it's
your second-weakest dimension"*) and 4 reproduced the original error — either an explicit
"two weakest" claim naming Career Exploration, or an explicit *"Career Exploration...
your second-weakest area"* misstatement quoting the tag's own language onto the wrong
dimension. Combined with 05's 7 reads (1/5 comparable-and-correct), two independent sessions
now land at essentially the same ~1-in-5 to ~1-in-6 rate on this fixture.

**A striking, specific replication, not just a similar rate.** One of these 5 fresh reads
independently said *"Career Exploration — your fourth-weakest dimension"* — the exact same
wrong ordinal (true rank: third) that 05's own read 4 produced, in a completely separate
sample. Two independent runs landing on the identical specific mislabel is stronger evidence
this is a real, reproducible failure mode of the untagged positions specifically (the model
sometimes invents a plausible-sounding ordinal for a dimension it has no tag for, and gets it
wrong in a consistent direction) rather than arbitrary noise.

**Harness owner's verdict, as asked for directly:** confirmed, not merely plausible — the
rank-2 tag is a real, correct, safe, measurably-partial improvement that does not close the
symptom it was built to close, at a rate corroborated by two independent sessions rather than
one party's own self-check. 05's instinct not to force compliance with a stronger instruction
was right, for the same reason 05 gave: a ~1-in-5 miss rate against an already-explicit,
correctly-placed tag doesn't look like a phrasing gap. On the bigger structural option 05
named (a deterministic, pre-composed "your two/three weakest are X, Y[, Z]" line the model
quotes rather than reasons about): worth trying, and the most direct answer to the exact
question shape that keeps failing — but it's a real scope jump (this is the third pass on one
rendering function tonight), and it deserves the same measure-before-build discipline as
everything else in this chain, not a build on my own say-so. Recommending it as the likely
next step, not building it — that decision belongs to oryn-45.

**Spend:** 5 more real `claude-sonnet-5` calls (direct provider, not `ai_usage`-logged, same
declared pattern as every comparison call tonight), roughly $0.10-0.15. Zero real student
data.
