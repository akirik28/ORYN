# The shared main checkout is not safe for scratch work, even read-only-feeling work

Every lane in this fleet gets its own `git worktree` — a separate working tree and index off
the same `.git`. The one exception is `/Users/adasarpkirik/Desktop/Founder/ORYN` itself, the
main checkout: nobody has their own copy of it, because the integrator merges from it. That
makes it the one place in this repo's whole layout that is genuinely shared, mutable state
across concurrent sessions — and on 2026-09-03 it produced a real near-miss to `origin/main`.

## What happened

A lane was auditing a cross-branch interaction (does one feature's DELETE statement leave a
row another feature's COUNT query depends on) — pure read-only git work: `log`, `show`, `diff`
against `origin/*`, nothing that touches the working tree. To measure something adjacent, it
wrote a small throwaway TypeScript probe script directly into the main checkout, on the
reasoning that read-only investigation doesn't need worktree isolation. Ran it. Deleted it.

A routine `git status` immediately after showed the deleted script as `AD` — staged as Added,
then deleted in the working tree — sitting alongside four other modified files the lane had
never touched at all. Another session was concurrently using that same checkout for an
unrelated feature (an email-digest job, mid-commit) — not a different worktree, the literal
same working directory and the same git index. At some point that session ran its own
`git add -A` (or equivalent) to stage its own real work, and the throwaway script — sitting
untracked in the working directory at that exact moment — got swept in along with it. Deleting
the file afterward is what produced the `AD` signature: staged, then gone.

The fix was narrow and safe: `git restore --staged <path>` un-stages only that one path,
leaving the other session's real staged changes untouched. Confirmed with `git status`
afterward that nothing else had moved.

## Why this is worse than the equivalent `node_modules` hazard

This repo already has a documented version of "shared mutable resource, concurrent sessions,
silent corruption" for `node_modules` (symlinked across worktrees to save disk — see the fuller
write-up in this fleet's own operational memory). That failure mode is annoying and
recoverable: a bad `npm ci` empties the shared tree, everyone's build breaks, a fresh install
fixes it.

Git's index in the main checkout is a different order of risk, because the integrator merges
*from that exact checkout*, using `git add -A` in merge commits. Had the contaminated `AD`
state not been caught before the other session's next commit, the throwaway script would have
been pushed to `origin/main` — under a merge commit message that never mentioned it, describing
a completely unrelated feature. This fleet has already done exactly that once before, on a
different night: a leftover HTML file reached `origin/main` during a merge and had to be found,
removed, and gitignored after the fact. This incident is the same failure with a different file
extension, caught one step earlier by luck (a routine status check) rather than by anything
that reliably prevents it.

## Standing practice

**Write throwaway scratch files inside your own worktree, never the shared main checkout** —
even for work that feels purely read-only. The read commands (`log`, `show`, `diff` against
`origin/*` or another branch) are genuinely safe to run from the main checkout; they don't
touch the working tree or the index. Writing any file there, even one you plan to delete
seconds later, reopens this exact window regardless of how briefly the file exists — the other
session's `git add -A` doesn't know or care how long the file has been sitting there.

If a scratch write in the main checkout is genuinely unavoidable, run `git status --porcelain`
immediately before **and** after. This class of contamination is otherwise silent: nothing
errors, nothing warns, the file simply rides along into whichever session commits next.

**For whoever is integrating and merging from this checkout**: run `git status` before any
`git add -A`, and read the actual list of staged files in a merge commit — not just the
diffstat summary. A diffstat is exactly the view that makes one extra untracked file invisible
among dozens of real changes; the file list is what would have caught this one.
