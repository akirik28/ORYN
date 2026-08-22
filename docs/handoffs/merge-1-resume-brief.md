# MERGE-1: read this before doing anything

**Written 2026-08-22 evening by ORYN-CEO, for whenever your session is un-hung.**

Your session stopped responding at **15:42** and stayed hung for over three hours. It was not
idle — it held `isRunning: true` the whole time, which is why nobody could reach you and why
four questions from two senders went unanswered. Only the founder can un-hang a session, at
its terminal.

**Your context predates the entire evening.** Roughly 80 PRs merged after you stopped. Do not
act on anything you remember about the PR queue, who owns what, or what `main` contains.

---

## 1. Merge authority changed while you were hung

The founder granted merge authority to ORYN-CEO, verbatim: *"merge 1 i uyandir merge
gerekiyorsa ben sana merge yetkisi de veriyorum gerekiyorsa her yetkin var tam yetki senin."*
It was a continuity measure — `main` had stopped moving with 27 PRs open while you were
unreachable.

**Do not start merging on resume.** Report to ORYN-CEO first and agree who holds the gate.
Two sessions merging independently is worse than one, and the queue is currently empty.
`docs/ORYN-ORG-STRUCTURE.md` §5 records the grant and states explicitly that the normal flow
should be restored once you are available — that restoration is a decision to make together,
not unilaterally.

## 2. Six of your queued PRs were carried by ORYN-CEO

Branches you had reviewed or queued could not be rebased by their owners — some lanes ended,
two are deliberately asleep, and you were unreachable. ORYN-CEO rebased and gated each, opened
a superseding PR, and said so in every PR body: **#67 (was #26, your own merge log), #68 (was
#39), #71 (was #52), #76 (was #22)**, plus rebases of #16 and #23 by their own lane.

**Your merge log survived because of #67.** It carries the permission-laundering precedent —
your refusal of an instruction from the CEO — which is now standing rule 16. That branch would
have died with your session.

## 3. Twelve new standing rules, 15 through 27

Read `docs/ORYN-ORG-STRUCTURE.md` §3 in full. The ones that change how you work:

- **18** — one fresh worktree per verification, never reuse-and-reset.
- **22** — a queued PR's branch is frozen; do not push to one you have already reviewed.
- **24** — select a merge target by the **head branch name**, never by a predicate over the
  open-PR list. The CEO's script picked "first open PR ≥ 73", raced another lane's PR created
  seconds earlier, and merged it through a gate that verified nothing.
- **25** — trace the callers, not the artifact, when reviewing anything that guards behaviour.
- **26** — a gate is not green until its worktree is gone. Twenty-one un-reclaimed verification
  worktrees took the machine to 143MB free and halted three lanes.
- **27** — after a squash-merge, compute the merge result; never read a diff. Both diff forms
  lie, in opposite directions.

Also: **bare `git merge-tree <base> <a> <b>` exits 0 whether or not there is a conflict.** Use
`git merge-tree --write-tree`. That false-clean cost one lane real time today.

## 4. State as of this writing

- `main` green: lint clean, typecheck clean, **139 files / 2,096 tests**, build compiles.
- **PR queue empty.**
- Migrations `0062` and `0063` merged, **written not applied** — founder-gated.
- `opportunities*` write territory is **deliberately vacant**; nobody writes to those tables.
- Two live issues under repair: a dashboard render-path dependency on `SUPABASE_SECRET_KEY`
  introduced by `0063`, and an onboarding step-desync that writes data the student never
  entered.

**Re-measure all of this before relying on it.** It was true when written and this document
has no way to know how long ago that was — which is the failure that produced rules 15 and 23,
and which caught three sessions today including the CEO twice.
