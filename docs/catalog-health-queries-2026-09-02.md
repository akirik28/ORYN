# Catalog health — standing queries, shape and live numbers — 2026-09-02

CEO's ask: turn tonight's one-off audits into standing instrumentation. Six functions, all in
`lib/admin/queries.ts` (D1 — one module, docs/admin-panel-architecture-2026-09-02.md). Queries
only, per the original assignment — the section component waits on 4e's chart kit (now merged,
`99e19ea7`, `/design-preview/admin-charts`). Read-only on live throughout; every number below
was produced by actually running the shipped functions against `qtcvcflzxbuagvvwahhu` (via the
established `server-only`-stub `tsx` technique), not recomputed by hand.

**Deliberately not a single score.** Every return type is a structured breakdown — the
distinctions tonight's audits exist to draw (unverified ≠ closed, a lineage timestamp ≠ a
confirmation, an unreadable source is absence of evidence not evidence of absence) would be
exactly what a collapsed number hides.

## A real bug this pass caught, worth reporting precisely rather than quietly fixing

First draft's `passingGateToday` checked `isOpportunitySufficientlyVerified` alone and reported
**283 of 283** passing — because it implicitly assumed `status='active'` already implied
`isOpportunityActionable` (which also excludes a closed cycle or a passed deadline). Running it
against live immediately exposed the gap: the doc this replaces says 205, not 283. Fixed by
naming `passesLiveVerificationGate = isOpportunityActionable && isOpportunitySufficientlyVerified`
as its own function rather than inlining the combination — the exact "two checks required, never
silently narrowed to one" discipline D8 asks for. After the fix, every number below matches the
original hand-verified doc exactly, including the full 12-row category table.

## 1. `getVerificationReality`

```ts
interface VerificationReality {
  activeTotal: number;
  passingGateToday: number;
  unverifiedCycleTotal: number;
  unverifiedCycleWithVerifiedAt: number;      // independent existence counts, not partitioned
  unverifiedCycleWithLastVerifiedAt: number;
  unverifiedCycleVerificationInsufficient: number;  // the verification half alone, see its own doc comment
}
```

**Live now**: `{ activeTotal: 283, passingGateToday: 205, unverifiedCycleTotal: 75,
unverifiedCycleWithVerifiedAt: 16, unverifiedCycleWithLastVerifiedAt: 70,
unverifiedCycleVerificationInsufficient: 0 }` — matches
docs/opportunity-verification-gate-tightening-impact-2026-09-02.md exactly. That last field at 0
is CEO's single most important number: the gate currently excludes none of the 75, confirmed
live, not asserted from the doc.

## 2. `getGateTighteningImpactByCategory`

```ts
interface CategoryGateImpact {
  category: OpportunityCategory;
  totalActive: number;
  recommendableToday: number;
  ofWhichUnverifiedCycle: number;
  recommendableIfTightened: number;  // hypothetical — see wouldPassTightenedVerificationGate's own comment
}
```

Sorted by `totalActive` descending. **Live now, all 12 categories, matching the original doc row
for row**: summer_program 140/90/59/**31**, competition 80/67/8/59, research 15/9/3/6,
internship 8/6/3/3, scholarship 8/7/0/7, student_program 7/6/0/6, online_program 6/4/0/4,
volunteering 6/5/0/5, entrepreneurship 5/3/0/3, fellowship 5/5/0/5, conference 2/2/0/2,
academic_program 1/1/1/**0**. `wouldPassTightenedVerificationGate` is kept private to this file,
never exported — measurement only, per D8, never wired into the real gate.

## 3. `getDeadlineEligibilityCoverage`

```ts
interface DeadlineEligibilityCoverage {
  openWithNoDeadline: number;
  turkeyExcludedWithNoRestrictionText: number;  // a spot-check count, not a defect count
}
```

**Live now**: `{ openWithNoDeadline: 25, turkeyExcludedWithNoRestrictionText: 20 }` — both match
docs/opportunity-catalog-student-risk-2026-09-02.md exactly. One correction along the way: the
corpus only ever spells the country "Türkiye" (5 active rows); the English "Turkey" appears in
zero rows — checked both live before writing this so a future research batch introducing the
English spelling can't silently split the predicate unnoticed.

## 4. `getDataStatusDistribution`

```ts
interface DataStatusDistribution {
  table: "universities" | "university_requirements" | "university_deadlines";
  total: number;
  byStatus: Record<DataStatus, number>;  // fresh | stale | needs_review | unavailable
}
```

`opportunities` has no `data_status`/`last_checked_at` columns — checked directly, not assumed;
its own freshness signal is the verification timestamps in §1 above. **Live now**:
`universities`: 1019 total (285 fresh, 734 needs_review, 0 stale, 0 unavailable);
`university_requirements`: 1325 total (**1325 fresh, 0 in every other bucket**);
`university_deadlines`: 470 total (**470 fresh, 0 in every other bucket**). Worth flagging rather
than presenting flat: two of three tables show literally 100% "fresh" with zero rows ever having
transitioned to any other status. Plausibly genuine (both are newer, smaller-surface tables), but
also the exact shape a freshness mechanism that's wired but never actually re-evaluates anything
would produce — not confirmed either way this pass, flagged as worth a follow-up look at whatever
job is supposed to move rows out of "fresh."

## 5. `getMigrationReality`

```ts
type MigrationRealityStatus = "confirmed_live" | "confirmed_partially_live" | "confirmed_missing" | "unchecked" | "indeterminate";
interface MigrationRealityRow { file: string; columnArtifactsFound: number; columnArtifactsConfirmedLive: number; columnArtifactsIndeterminate: number; status: MigrationRealityStatus; }
```

Column-existence only — deliberately not `create table` or any other DDL shape (indexes,
constraints, triggers, policies, grants). Reason, found the hard way: this app's `admin` client
talks to Postgres through PostgREST, which doesn't expose `information_schema`/`pg_catalog` for
arbitrary introspection — a first draft tried exactly that (plus a nonexistent RPC) and would
have failed outright in the deployed app. The working mechanism reuses
`isUndefinedColumnError` (`lib/supabase/errors.ts`) via a real named `.select(column, {head:true})`
attempt — the identical check `categoryIsEnabled()` already relies on for a read, not a new
mechanism. Reads `supabase/migrations/*.sql` from disk — flagged explicitly as a new pattern for
`lib/` in this codebase; whoever wires this into the deployed route should confirm the migrations
directory is actually included in Vercel's file tracing before trusting it in production.

**Live now**: 55 unchecked (no column-add statements — table creations, indexes, RLS), 36
confirmed_live, 1 indeterminate, **0 confirmed_missing** — matching tonight's own finding that
0089-0092 are now genuinely applied. oryn-b9 was about to build a duplicate of this exact piece
for a different admin section (operational-health); flagged and redirected before any overlap
landed — see this branch's commit for the cross-session note.

## 6. `getNeverWrittenColumnChecks`

```ts
interface NeverWrittenColumnCheck { table: string; column: string; defaultDescription: string; totalRows: number; rowsAtDefault: number; percentAtDefault: number | null; }
```

An extensible watchlist (currently 3 entries), not a scan of all ~180 defaulted columns
docs/unwritten-columns-sweep-2026-09-02.md catalogued — adding an entry here turns a one-off
finding into a permanent, live check. **Live now, and it correctly discriminates three different
real states**: `ai_usage.degraded` — **100% at default** (133/133), the already-known, still-live
bug. `university_requirements.is_exclusion` — **98%** (1298/1325), *not* 100%, confirming
`lib/requirements/ingest.ts`'s fix is genuinely working on real data, not just in the code.
`opportunity_matches.eligible` — **88.3%** (1724/1953), confirming this column is genuinely
computed per-row rather than defaulted. The mechanism proves it can tell "still broken," "fixed,"
and "never broken" apart — not just find one shape.

## What this pass does not cover

Migration reality is columns only (see §5). Freshness is scoped to the three tables that carry
Phase 29's `data_status` enum — `opportunities` isn't stretched to fit a concept it doesn't have.
The never-written-column watchlist is 3 curated entries, not all ~180 candidates from the earlier
sweep. None of the six functions write anything — confirmed by running them read-only against
live; no code path in any of them calls `.update()`/`.insert()`/`.delete()`.
