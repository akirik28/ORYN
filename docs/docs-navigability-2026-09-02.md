# docs/ navigability — 2026-09-02

**Status:** documentation only, three files touched, gates green (typecheck/lint/3791
tests). **Author lane:** oryn (this session), at oryn-a7's request. **Branch:**
`oryn/docs-navigability-2026-09-02`.

## The ask, and the honest answer

CEO's framing: `docs/` grew by roughly 30 files in one night; `FOUNDER-START-HERE.md` cannot
link to thirty documents; establish what a founder actually needs to reach and from where,
using the three real entry points (`FOUNDER-START-HERE.md`, `current-state.md`,
`known-issues.md`) as a spine — don't index everything, don't reorganize, don't move or
delete anything, and if the spine already covers it, say so and stop.

**It didn't fully cover it — two distinct, narrow gaps, both now closed. Nothing else
needed changing.**

## Gap 1: the spine wasn't actually a spine — `FOUNDER-START-HERE.md` never linked to `known-issues.md`

`current-state.md` already links to `known-issues.md` in three places. `known-issues.md` is
self-sufficient as a reference. But `FOUNDER-START-HERE.md`'s own "ordered path from just got
back to what needs me tonight" listed three docs (`current-state.md`,
`founder-blocked-backlog.md`, the morning runbook) and never mentioned `known-issues.md` at
all — a founder following that file's own stated path would never learn it exists. Added a
fourth bullet to that same list, positioned last since it's a reference, not an action item.

## Gap 2: three documents that exist specifically for a founder decision had no path from the front door

Checked all five categories CEO named against the three spine documents directly (`grep` for
each filename, not assumed):

| Document | Already linked from the spine? |
|---|---|
| Migration 0058 audit | Yes — `FOUNDER-START-HERE.md` item 2 |
| Migration list (`migration-state.md`) | Yes — `current-state.md`'s own measurement table |
| Premium/monetization decision set | **No — zero references anywhere in the spine** |
| AI cost at 100/1,000 students | Only as a citation inside `known-issues.md`'s prose, not a pointer from the front door |
| Staged opportunity research (~86 records) | Same — cited once inside `known-issues.md`, not surfaced |

Two of five were already covered. The other three (the premium decision set most acutely —
it had no path in at all) needed a real pointer, not just a citation buried inside a
findings document a founder has no reason to read start to finish.

**Fixed**: a new "Decisions waiting on you — not blocking deploy, but yours to make" section
in `FOUNDER-START-HERE.md`, positioned after the existing "Optional, any time" section and
before "What you do NOT need to do" — deliberately not folded into the urgent top-3 (admin
access / 0058 / deploy), since none of these three block anything. One line each on what the
document is and why it needs the founder specifically, not a summary of its contents.
`current-state.md`'s existing "Next phase" list (already a "what's next, and where to read
it" pattern) gets the same three as a fifth item, pointing back to
`FOUNDER-START-HERE.md`'s new section rather than duplicating the explanation — one place
owns the description, the other just confirms it exists and points there.

## A third thing, found while reading the spine for this task, fixed because it was already reported as done

`docs/known-issues.md`'s "reflection loop" entry (written by this same session, hours
earlier) claimed the product's core act→reflect→adjust loop had "never once been observed
working." A follow-up audit this exact entry triggered
(`docs/reflection-loop-audit-2026-09-02.md`, oryn-60) found that claim was accurate only for
`weekly_actions` — the table a since-fixed regenerate-delete bug had already emptied once.
`product_events` (append-only, nothing deletes it) shows the completion mechanic really did
work four times, 2026-08-22/23; the fix is merged; and the audit then drove the fixed path
live end to end on a QA account, confirming every link including the advisor's own read-back
of a reflection. Rewrote the entry to say what's actually true: **worked historically,
evidence erased by a bug that's now fixed, re-verified live 2026-09-02** — not "never
observed working." Left uncorrected, this would have been the single most misleading claim
in the file, about the product's own stated differentiator.

## What this deliberately did not do

- **No new `docs/README.md` or directory index.** CEO's own instruction was explicit: index
  what someone would go looking for, not everything. A 30-line addition across two existing
  files, each pointing at 3-4 documents, does that; a directory listing of 120+ top-level
  files plus 150+ handoffs plus 200+ research docs would be the "docs index nobody reads"
  failure mode named in the assignment, not navigation.
- **No file moved, renamed, or deleted.** Every citation elsewhere in the repo that points at
  a path by name still resolves.
- **No re-verification of `FOUNDER-START-HERE.md`'s or `current-state.md`'s own dated facts**
  (both are pinned to commits well behind current `main` by now). That's a staleness pass,
  a different task with a different, larger scope than "make it navigable" — not attempted
  here, and not silently smuggled in under this task's name.
- **`docs/founder-blocked-backlog.md` untouched** — CEO named three specific spine documents;
  this one is already well cross-linked from both and wasn't in scope.

## Verification

```
typecheck   clean
lint        clean
test        3791 passed (266 files)
```

Build not run — documentation-only change, nothing in it can affect the Next.js build output.
