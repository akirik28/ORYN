# Narrowing instruction for rank 2 — pre-registered criterion, then the result (2026-09-03)

CEO's call after reviewing both tagging passes (`85ceb3ac`): not the structural rewrite
tonight — one cheap, bounded test instead, opposite in kind to the compliance instruction both
prior passes explicitly rejected. Withhold the claim rather than try to force it correct.
**Pre-registering the scoring criterion below before writing or running anything else**, per
CEO's explicit warning that absence is easy to score generously after the fact.

## What counts as "made an ordinal claim" (decided before any code or live read)

A read **makes an ordinal claim** if it uses language that ranks or orders two or more of the
lower-scoring dimensions relative to each other — "second-weakest," "next weakest," "your two
weakest are X and Y," "Nth-weakest," "weaker than X but stronger than Y," or a list structure
implying relative order between named dimensions ("X, followed by Y").

A read does **not** make an ordinal claim if it: (a) names only the single weakest dimension by
rank ("Awards & Distinction is your weakest"), (b) mentions multiple low-scoring dimensions
without ranking them against each other ("Career Exploration, Entrepreneurship, and Leadership
are all early-stage"), or (c) doesn't discuss dimension rank at all.

Pass condition (CEO's framing): the ordinal claim **disappears** — not that it becomes correct.
Fail conditions, either one: the claim still appears and is still wrong at anything like 4/5, OR
replies get noticeably worse (hedged, stilted, refusing to compare dimensions the student
actually asked about). Hard stop either way — no further iteration tonight.

## The change

Reverted the rank-2 tag entirely (`secondWeakestScore`/`secondWeakestIsTied` and the
`— second-weakest` / `— tied for second-weakest` render, all of it) — keeping it while also
telling the model not to make ordinal claims would leave the tag itself asserting the exact
thing the instruction forbids. Rank-1 tagging (`— weakest` / `— tied for weakest`) is untouched:
confirmed live 7/7 then 5/5 (12/12 across two independent sessions), no reason to touch what
already works. Replaced the removed tag with an explicit withholding instruction in the same
header line the ordering instruction already lives in: *"Only the dimension(s) explicitly
tagged 'weakest' may be named by rank — do not claim which dimension is second-weakest,
third-weakest, or any other ordinal position; if discussing multiple lower-scoring dimensions,
describe them without ranking them against each other."*

6 test changes: removed the two assertions specific to the now-reverted second-weakest tag
text, removed the dedicated tie-at-second-place test outright (nothing left to test), added
one assertion confirming a would-have-been-second-weakest dimension now carries no ordinal tag
at all, and one new test confirming the header carries the withholding instruction verbatim.
83/83 pass in the file. Typecheck and lint clean. Confirmed the instruction reaches the model
correctly before running anything — printed the rendered dimension block for the `baseline`
fixture: Awards & Distinction still carries `— weakest`, every other dimension (including
Entrepreneurship, previously tagged `— second-weakest`) now carries no ordinal tag.

## Live result: 5 real `claude-sonnet-5` reads, same fixture and question as both prior passes

**Clean pass — 0/5 made an ordinal claim, under the criterion above, decided before running
this.** All 5 reads correctly name Awards & Distinction as "your weakest dimension" (single,
tagged, allowed). Three of five also mention Career Exploration by its real score (40/100)
in the same paragraph — but every one of those three states it as a second, independent gap
("Two gaps, one action," "another genuine gap," "which also feeds Career Exploration") rather
than ranking it relative to Awards, Entrepreneurship, or anything else. No read used
"second-weakest," "next weakest," or any comparable relative-order language for any dimension
but the tagged one. The exact claim this whole chain has been chasing — a specific, wrong
second-place assertion — did not appear once, matching CEO's framing exactly: the claim
disappeared rather than became correct.

**No quality degradation.** All 5 replies stay specific, fluent, and correctly grounded —
real numbers cited accurately (Awards 20, Career Exploration 40, Academics 85 all correct),
the swimming/exam time-budget math is right in every read, deadlines and after-exam
deferrals are handled the same way as every prior round. This fixture's question ("What
should I focus on this week?") never asks for a ranked dimension comparison, so there was no
compare-refusal to observe either way — but nothing reads hedged or stilted relative to the
pre-narrowing-instruction rounds.

**One separate, out-of-scope observation, not folded into the primary score**: Read 3 states
"[Regional Science Fair is] a legitimate match for Research (currently unassessed)" — but in
`BASELINE_CONTEXT`, Research is scored 62 and `state: "developing"`, which `isAssessed()`
treats as assessed. This is a real factual inaccuracy, but a different one from what this pass
was built to test (a wrong *assessment-status* claim, not a wrong *ordinal-rank* claim), and
folding it into the pre-registered criterion after the fact would be exactly the kind of
post-hoc redefinition CEO warned against. Flagging it as a distinct finding for whoever picks
this up next, not scoring it here.

## Verdict

Both of CEO's pass conditions hold: the ordinal claim disappeared (0/5, not 1/5 or a partial
rate), and reply quality did not degrade. Per CEO's explicit instruction, no further iteration
— this is the last pass on this function tonight regardless of outcome. Handing to oryn-80 for
independent verification, same as both prior passes.
