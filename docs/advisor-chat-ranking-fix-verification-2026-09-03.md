# Verifying the dimension-ranking fix against a live model, not just its own test suite

**Date:** 2026-09-03. **Author lane:** this session (found the original bug in
`docs/advisor-chat-stability-eval-2026-09-03.md`). **Fix under review:** 05's
`oryn/advisor-context-dimension-ranking-2026-09-03`, commit `69cf702d`. **Why this session
verifies rather than 05:** oryn-45's explicit split — the author doesn't clear their own work,
and this session owns the harness that found the bug.

## What the fix does (read from the diff, not the description)

`lib/ai/student-context.ts`'s `formatContextForPrompt`: assessed dimensions are now filtered
via `isAssessed()` *before* sorting ascending by score, so an unassessed dimension's
placeholder score can never enter the ranking at all — structurally, not by convention. The
true minimum among assessed dimensions gets an explicit `— weakest` tag, or `— tied for
weakest` on every dimension sharing that minimum. The header instructs the model the order is
"already computed... do not re-rank by eye." 5 new unit tests reproduce the exact fixture
shape from the original finding, a sole-minimum case, a tie, and — the one that mattered most
to verify — an unassessed dimension with a numerically-lower hidden score than the true
weakest, confirming it never gets ranked or tagged.

## Independently confirmed, not relayed

Ran the gate myself in a fresh worktree at the exact pushed commit, not the described branch:
typecheck clean, lint clean, the 5 new tests plus the other 77 in that file all pass (82/82),
full suite 384 files / 5,851 tests green. 05's two root-caused softer findings both checked
directly against the code: the "exam period" line is genuinely `(e.g. exams)` in the prompt at
line 631 (confirmed independently before 05's message arrived, during prep); the marketplace
project line at line 750 genuinely only reads `title` and the ongoing/evidence tag —
`outcomeSummary` is never touched by that line. Both diagnoses are accurate.

## The live re-check: what fully closed, and what didn't

Same method as the original finding — the real fixtures, `advisor_chat`, English, 3 reads
each, through the real prompt assembly, against this exact commit. 6 more real
`claude-sonnet-5` calls.

**Fully closed, confirmed live, not just in the unit tests.** Every regression-fixture read
now says *"Intellectual Curiosity (55, weakest)"* — the correct single minimum among assessed
dimensions, using the new tag verbatim, 3/3. `Research` (unassessed, real score field hidden)
is correctly kept separate, described, never numbered, never called weakest, in every read —
the unassessed-exclusion holds under a real model, not only under a string-level unit test.
Every baseline read now correctly tags Awards & Distinction as *"your weakest"* using the same
verbatim mechanism. No tie was exercised (neither fixture has one), but the unit test covers
it directly and the mechanism (filter-then-sort-then-compare-to-min) has no dependency on
which specific fixture is used.

**Not closed — the exact symptom from the original finding reproduces 3 of 3, unchanged.**
The original bug's specific shape was a *"two weakest dimensions"* claim naming Career
Exploration (40) instead of the real second-lowest, Entrepreneurship (30). Post-fix:

> Read 1: *"...it lines up with two of your weakest dimensions — Awards & Distinction (20/100,
> your weakest) and Career Exploration (40/100)..."*
> Read 2: *"...Awards is your weakest dimension (20/100)... and Career Exploration is also
> weak (40/100)."*
> Read 3: *"It directly targets your two weakest dimensions: Awards & Distinction (20/100) and
> Career Exploration (40/100), both currently thin."*

**Entrepreneurship does not appear in the "two weakest" claim in any of the three reads** —
in two of them it's mentioned once, later, vaguely grouped with Leadership and Community
Impact as merely "weaker than Research or Academics," never connected back to correct the
specific claim made earlier in the same reply.

## Why the fix closes rank 1 but not rank 2 — a real, evidenced mechanism, not a guess

The tag mechanism is boundary-scoped by design (05's own comment: "scoped to the weakest
boundary specifically... not a general mid-list tie annotation"). Rank 1 gets an explicit,
hard-to-ignore inline string. Rank 2 gets nothing but its position in the pre-sorted list —
and the header's "use it directly... do not re-rank by eye" instruction is evidently not
strong enough, on its own, to make the model treat list position as authoritative for a
*second*-place claim the way an inline tag makes it authoritative for first place.

This isn't "the model can't read position 2" in general. The regression fixture's read 2 says
*"Execution/Project Depth (60)... your second-weakest area"* — correct: 60 genuinely is the
second-lowest assessed score there, and the model read it correctly off the pre-sorted list
with no explicit tag on it either. The difference: in the regression case, nothing else in
that reply has a motivated reason to prefer a different dimension for that slot. In the
baseline case, Career Exploration connects narratively to the very Economics Challenge
recommendation the reply is making — the same mechanism this session named for the original
bug, still operating, just now only able to win against an *unmarked* position instead of
against a `weakest`-tagged one. The fix removed the model's need to do arithmetic for rank 1;
it did not remove the incentive to substitute a narratively-convenient dimension for rank 2
when nothing marks rank 2 as decided.

## What this means for the merge decision

This is a real, well-tested, independently-confirmed improvement — not a non-fix. Two of three
concerns from the original dispatch are fully and verifiably closed: the unassessed-as-weakest
risk (structurally impossible now, confirmed live) and single-weakest reliability (confirmed
live, 6/6). It closes real risk and should not be held back on that basis.

But the literal symptom that motivated this whole fix — the specific "two weakest" claim —
is unchanged, 3/3, in the same fixture, for the same reason. Calling this "fixed" would be the
exact overclaim this whole chain has tried not to make. The honest claim is: **rank-1 claims
are now reliable; rank-2-and-beyond claims are not, and the mechanism suggests why.** A narrow,
well-motivated follow-up — extending an explicit ordinal signal (e.g. `— 2nd weakest`) to at
least the second position, not just the boundary — is a real option worth naming, not
something to build unilaterally here; that call belongs to whoever owns this fix next.

## Spend

6 more real `claude-sonnet-5` calls, direct provider calls (not `ai_usage`-logged, same
declared pattern as every comparison call tonight), roughly $0.10-0.20. Zero real student data.
