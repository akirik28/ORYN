# UI-simplification session — 2026-08-20

Workstream: **UI-simplification / IA** — downstream of Computer B
(`docs/MASTER-EXECUTION-STRATEGY.md` defines Computer A/Computer B only; this lane was
confirmed directly by the founder mid-session as a separate, isolated third lane, given
Computer B's own handoff already frames its work as "prep for the incoming UI-simplification
redesign"). Branch: `oryn/ui-simplification-v1`, in an isolated git worktree at
`.claude/worktrees/ui-simplification-v1` (created from Computer B's branch tip, not `main`,
so this lane builds on the real current schema/behavior rather than a stale base).

## Coordination note

A live Computer B session was found actively committing to `oryn/counselor-data-quality-v1`
in the same shared working directory this session started in — confirmed via its own handoff
doc (`docs/handoffs/claude-b-2026-08-20-session.md`) and two commits landing in real time
during this session's own investigation. Moved to an isolated worktree specifically to remove
any file-collision risk with that session rather than working in place. All 4 canonical
coordination docs (`MASTER-EXECUTION-STRATEGY.md`, `current-state.md`, `product-decisions.md`,
`ORYN_WORKSTREAMS.md`) already existed and were already correctly adopted by that session —
not duplicated here.

## Completed this session (implemented, tested, committed)

1. Dashboard's opportunity preview showed a bare `{matchScore}% match` (e.g. "91% match")
   instead of an explained categorical label — the one place on the dashboard using
   unexplained numeric precision, against the founder's own opportunity-fit guidance. Extracted
   the existing `tierFor()` categorical mapping out of `opportunity-card.tsx` (a `"use client"`
   module) into `lib/opportunities/match-tier.ts` so the Server Component dashboard can call it
   directly — a real RSC-boundary correctness fix, not just a copy-paste. Both call sites now
   share one source of truth. `npm run typecheck` / `npm run lint` / `npm test` (1051/1051)
   clean; confirmed live via this worktree's own dev server (port 3002) against
   `/design-preview` — "International Economics Challenge 2027" now reads "Exceptional match".
2. `docs/ui-simplification-analysis.md` — the "what should the student actually see" research
   pass, grounded in Computer B's `docs/current-product-capability-map.md`, `design-system.md`,
   and live rendering of everything renderable without a Supabase session in this sandbox
   (dashboard, landing, university explorer, both desktop and 375px). Verdict per screen:
   dashboard already strong (fix above), opportunities/universities no issue found, profile is
   the one real open IA question.

## In progress / proposed, not yet implemented

`docs/ui-simplification-analysis.md` §2 proposes a lightweight jump-navigation for the profile
page (18 regions across 13 achievement sections + 5 other blocks, one continuous scroll) —
grouping into About / Your standing / Academic record / Experience & achievements / Goals via
anchor links, deliberately *not* a tab rebuild (tabs would hide capability the product has
already decided not to hide, and would touch the same files Computer B's queued package list
also touches next). Held for an explicit founder go-ahead before starting, since it's the
first visible structural change from this lane and the one area with real overlap risk with
Computer B's active files.

## Blockers

None.

## Next

Pending founder direction: either (a) proceed with the profile jump-navigation package, or
(b) real visual references arrive and get folded in alongside it, or (c) redirect to a
different package. Not starting the profile change without one of those.
