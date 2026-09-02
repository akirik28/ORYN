# Dashboard verification badge + gate-tightening impact — 2026-09-02

CEO's split of the opportunity-catalog risk audit's #1 finding, addressed exactly as scoped: the
display half fixed now, the gate-tightening question quantified but not touched.

## 1. Display fix — `cycle_status` now reaches the dashboard homepage

**Bug:** `app/(app)/dashboard/page.tsx`'s opportunity preview built its own `{ title, matchScore,
deadline }` shape and dropped `cycle_status` entirely, even though the row already carried it and
Browse (`features/opportunities/opportunity-card.tsx`) already renders it correctly as a
"Verification pending" (etc.) descriptor. Not degraded — structurally absent; the homepage
preview component had no field to render a caveat from even in principle.

**Fix:**
- `lib/opportunities/lifecycle.ts` now exports `CYCLE_STATUSES_WORTH_A_DESCRIPTOR` (moved from
  `opportunity-card.tsx`, which now imports it) — one shared source for "which cycle_status
  values need a plain-text descriptor," reused by both surfaces instead of a second private copy.
- `app/(app)/dashboard/page.tsx` threads `cycleStatus: opportunity?.cycle_status ?? null` through
  the preview shape.
- `features/dashboard/dashboard-view.tsx` renders the same descriptor Browse renders, in the same
  quiet-metadata-row style, next to the match tier and deadline badge.
- Two `design-preview` fixture pages updated to pass the new field (caught by typecheck, not
  missed — `lib/dev/fixtures.ts`'s `FIXTURE_OPPORTUNITIES` already carried `cycle_status`, just
  wasn't threaded through by these two call sites).

Scope corrected during implementation: my original report said 74 opportunities exhibited this
shape; CEO independently re-verified and found 75 with a cleaner predicate (mine silently added
`AND deadline IS NULL`; CEO's was `cycle_status='unverified'` alone, and the 1-row gap is exactly
the one row with `cycle_status='unverified'` that does have a deadline). 75 is the number this
fix and the doc below both use going forward.

## 2. Gate-tightening impact — quantified, not implemented

Full analysis: `docs/opportunity-verification-gate-tightening-impact-2026-09-02.md`. Headline:
tightening `isOpportunitySufficientlyVerified` so a bare pipeline-lineage timestamp no longer
counts as sufficient evidence would drop the catalog from 205 to 131 recommendable active
opportunities — and `summer_program`, the single largest category (140 of 283 active rows, 49%
of the catalog), would lose two-thirds of its recommendable inventory (90 → 31). One category
(`academic_program`) would go to exactly zero. By CEO's own stated decision test ("if tightening
takes a student from twelve things to consider to two, we've traded a soft honesty problem for a
hard emptiness problem"), the shortfall is large, not small — supporting CEO's own hypothesis
that the real fix is a re-verification pass, not a gate change. No line of `lifecycle.ts`'s gating
logic was touched.

## Gates

`npm run typecheck` / `npm run lint` / `npm run test` (4,573 tests) / `npm run build` — all green.
Build required a real `npm ci` over this worktree's symlinked `node_modules` (documented Turbopack
limitation, not a code issue) under real disk pressure tonight (465Mi free system-wide after the
install) — completed successfully with disk holding stable through the build, but worth the
founder's awareness that shared disk space across the fleet's worktrees is genuinely tight right
now, independent of this package.
