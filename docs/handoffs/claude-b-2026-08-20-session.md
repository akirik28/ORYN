# Claude B session — 2026-08-20

Workstream: **PROD-B — Computer B / PRODUCT-COUNSELOR-UX-INTEGRATION** per
`docs/MASTER-EXECUTION-STRATEGY.md` and `docs/ORYN_WORKSTREAMS.md` (both now merged onto this
branch — see Coordination below). Branch: `oryn/counselor-data-quality-v1`. This file is
rewritten in place each checkpoint, not appended to — see `docs/current-state.md` for the
shared operational snapshot; this file is this session's own narrower log.

## Coordination (updated this checkpoint)

Ran an isolated coordination-integration package this checkpoint, in its own worktree/branch
(`oryn/coordination-integration-2026-08-20`, based on `origin/main`) so as not to disturb the
background packages running in this branch's own working directory:

- Brought `docs/ORYN_WORKSTREAMS.md` in from `oryn/programs-pipeline-reconciled` as a single
  file (not a branch merge), corrected it against live branch/commit state.
- Rewrote `docs/current-state.md`'s semantics — every fact now carries its own measurement
  provenance (code commit / live-DB timestamp) instead of one implicit as-of-the-top date.
- Live-re-measured `oryn-qa-scratch` via Supabase MCP: migration 0043's DDL is actually live
  now (contrary to the "never applied" narrative still in `founder-blocked-backlog.md`), but
  its data backfill never ran (0 superseded rows) — still the JSON-file app-layer workaround
  doing the real work. Also found a **new regression**: Supabase secret-key auth is failing
  ("JWT issued at future") where it was previously OK — flagged as the top founder action in
  `docs/current-state.md`.
- Merged the coordination commit (`5c59115`) straight to `main` (true fast-forward, verified
  clean before pushing), then synced this branch with it (`247b4e2`). Both pushed.
- This branch now has `docs/MASTER-EXECUTION-STRATEGY.md` merged in directly (it wasn't
  before this checkpoint), superseding this file's earlier "read via `git show`, not merged"
  note.

## Completed this session (implemented, tested, committed, pushed)

1. **`cb630c5`** — `DynamicFormFields`'s `<Select>` no longer silently pre-selects
   `options[0]` for a nullable field with no matching DB default (`education_records.
   curriculum` was showing "AP" pre-highlighted regardless of the student's real curriculum).
   Also fixed `activities.category` defaulting to `"club"` instead of the DB's own `"other"`.
2. **`5cdf1bd`** — `/opportunities` eligibility: unknown-vs-confirmed distinction, citizenship/
   grade checks added to `computeEligibility` (previously only age/country). No migration
   needed, 8 new tests.
3. **`072313d`** — `profiles.completeness_percent` (feeds admission-outlook confidence + AI
   advisor context) was inflated by headline/bio/skills/contact-info. Split into
   `computeCounselingCompleteness` (10 core items, now what persists) vs. the unchanged
   `computeCompleteness`/`getCompletenessChecklist` (still 15, still powers Profile Strength
   UI — deliberately untouched).
4. **`6b715ac`** — `profile_views` INSERT RLS didn't gate on the viewed profile being
   public/connected. Migration `0048` written, reviewed, not yet applied live (same DDL-access
   pattern as 0043/0046 historically — though see the 0043 correction above, worth re-checking
   whether 0047/0048 can now actually be applied).
5. **`465ab7a`**, **`bb367d0`** — coordination handoff doc + `docs/current-product-capability-
   map.md` (all 5 domains: Student/Counseling/Opportunities/University/Social, audited
   straight from code/schema via 5 parallel agents + direct reads, not from prior docs).
6. **`88061d6`** — merged `origin/main`'s 3 commits into this branch (2 were byte-identical
   patches this branch already independently had; 1 was a pure new-file addition). Zero
   conflicts.
7. **`0c7e0d4`** — `docs/ui-feature-preservation-matrix.md` (B12): primary/secondary +
   progressive-disclosure + removal-risk judgment per capability, for the incoming UI redesign.
8. **`5c59115`** (on `main`, via the coordination branch) + **`247b4e2`** (synced onto this
   branch) — the coordination package above.

All: `npm run typecheck` / `npm run lint` / `npm test` clean before and after each commit
(1051/1051 as of the last full run this checkpoint). No `npm run build` yet this session.

## In progress — two background packages running concurrently in this branch's working directory

Launched as two separate Workflow runs (disjoint file sets, explicit avoid-lists given to the
second so it doesn't race the first):

- **Package 1** (B2, B4, B8, B9): student data contract audit, counselor dashboard view-model
  (including a new first-class "strengths" concept and wiring the dashboard to Counselor
  Core's deterministic output so it's not solely blocked on the AI weekly plan), entity-
  combobox regression tests, Turkish/international persona fixture + contract tests. Visibly
  in flight as of this checkpoint (uncommitted changes to `app/(app)/dashboard/page.tsx`,
  `features/dashboard/*`, `features/entities/entity-combobox.tsx`, `lib/counselor/types.ts`/
  `index.ts`, plus new `lib/counselor/strengths.ts`/`dashboard-contract.ts` and several new
  test files).
- **Package 2** (B6, B7, B10, B11): provenance/confidence contract audit, university
  counseling adapter (composing existing `computeAdmissionOutlook`/`evaluateRequirement`
  rather than a new scoring engine), shared UI primitives audit (conservative — explicitly
  told not to redesign, only de-duplicate zero-risk cases), empty/loading/error-state
  primitive audit (reuse the existing `EmptyState` component where pages hand-roll their own).

Not yet reviewed/committed — will verify each package's own reported typecheck/lint/test
results, spot-check for scope creep or accidental duplicate architecture, then commit each
piece atomically once both packages land.

## Blockers

None that block continued work. Two founder-actionable items surfaced this checkpoint (see
`docs/current-state.md`): the new Supabase secret-key regression, and the 0043 data-backfill
now being unblocked (DDL is live) rather than DDL-blocked.

## Next

Review and commit the two in-flight packages' output once they complete. Then: re-verify
`profile_views`/other pending migrations against the corrected 0043 finding (DDL access may no
longer be the blocker it was assumed to be), full `npm run build`, and continue any remaining
scope from the founder's B1-B12 brief that these two packages didn't fully close.
