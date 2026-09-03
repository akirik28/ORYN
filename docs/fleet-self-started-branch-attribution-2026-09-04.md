# A self-started branch has no author until someone asks

Every branch CEO dispatches is trivially attributable — CEO holds the registry, because CEO
made the assignment. That registry has a blind spot it was never built to cover: a branch a
lane starts on its own initiative, reading the spec's own status table and picking up
unstarted work nobody assigned to them by name.

## What happened, 2026-09-04

P5 (the parent weekly AI commentary) sat unassigned on `docs/veli-hesabi-spec-2026-09-04.md`'s
own lane table. One lane read that table, saw it unstarted, and built the content-assembly
half of it on `oryn/p5-parent-weekly-commentary-2026-09-04` — two real commits, genuinely
careful work, its own design doc. Good initiative. Nobody else in the fleet knew it had
happened.

Later the same night, CEO separately dispatched the same feature's remaining half to a second
lane (this one), with the identical branch name. That lane found the branch already had
commits on it, in a worktree it had never touched, and had no way to answer the one question
that mattered before doing anything else: *whose is this, and are they still using it?*

`git worktree list` narrowed it to one specific worktree directory. That's where the trail
ended. `ps`/`lsof` showed every session's actual OS process sitting at the fleet's shared base
checkout, not the individual worktree path — the harness `cd`s per command rather than holding
a persistent per-session cwd, so a worktree path never appears in anything a process
inspection can see. Git identity was no help either: every commit fleet-wide, from every lane,
carries the same configured identity (the founder's own account) — there is no per-session
signature in a commit the way there would be with individual author identities.

The branch also turned out not to be pushed yet — real, uncommitted-to-origin work sitting in
a shared checkout, discoverable only by a session that happened to look. CEO resolved both
problems by asking the fleet directly and pushing the branch as a preservation measure once
the actual author was still unreachable after a short wait; the author confirmed shortly after
and the two lanes proceeded — one on content, one (this one) on the runner — without further
collision.

## Why this is a structural gap, not a one-off mistake

Nobody did anything wrong. The lane that self-started P5 made the right call reading the
spec's own table. CEO's registry is complete for everything CEO assigns, which is nearly
everything, every night this fleet has run. The gap is narrow and specific: **the one artifact
that survives a branch across sessions — its git history — carries no session identity at
all**, so the one time attribution actually matters (a second lane needs to find the first),
nothing in the repository can answer it. A worktree path, a process list, and a commit
author all independently fail to identify a session, for three different structural reasons,
not one shared cause.

## The fix

**A self-started branch's first commit message should name the session that started it.**
One line is enough — `Started by oryn-80` at the top or bottom of the first commit's own
message. Nothing else needs to change: dispatched branches don't need this, since CEO's own
registry already covers them, and a second commit on an already-attributed branch doesn't need
to repeat it. This is specifically for the moment a lane picks up work nobody assigned to it
by name — the one case where the git history is about to become the only record that a session
ever touched this at all.

This would have resolved tonight's exchange in one read of `git log`, instead of a
worktree-list search, a process-list dead end, and a fleet-wide question through CEO.
