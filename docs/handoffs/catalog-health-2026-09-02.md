# Catalog health — queries built, action-list designed — 2026-09-02

Two rounds in one branch. Round 1 (original ask): turn tonight's opportunity/migration/data
audits into standing instrumentation — six read-only functions in `lib/admin/queries.ts`, queries
only, waiting on 4e's chart kit for the UI. Round 2 (course correction, relayed mid-task): founder
rejected "report style" — wants a control panel. Four write-capable actions designed, nothing
built, per explicit instruction to report the action list and confirmation model first. Full
reports: `docs/catalog-health-queries-2026-09-02.md`, `docs/catalog-health-actions-design-2026-09-02.md`.

## Round 1 headline

Six functions, all live-verified by actually running them against `qtcvcflzxbuagvvwahhu` (not
just typechecked): `getVerificationReality`, `getGateTighteningImpactByCategory`,
`getDeadlineEligibilityCoverage`, `getDataStatusDistribution`, `getMigrationReality`,
`getNeverWrittenColumnChecks`. Every number matches the original hand-verified audits exactly,
including the full 12-category gate-tightening table — but only after live-running caught a real
bug first: `passingGateToday` initially checked verification alone and reported 283/283 passing
instead of 205, because `status='active'` doesn't imply `isOpportunityActionable`. Fixed by
naming the combined check as its own function rather than inlining it.

`getMigrationReality` needed a real redesign mid-build: PostgREST doesn't expose
`information_schema` to this app's client, so it reuses `isUndefinedColumnError` via a real named
select instead — the same mechanism `categoryIsEnabled()` already relies on. Caught and flagged
before oryn-b9 built a duplicate of this same piece for a different admin section.

## Round 2 headline

Four actions: apply the 35-row description cleanup (already staged, dry-run verified, blocked on
manual SQL all night), disable a flagged opportunity (`3f7170ba`, AI Scholars — confirmed still
live and unchanged), force re-verification of a record, mark/clear an under-review flag. Two
constraints held hardest: preview before commit, never silently partial. Confirmed the cleanup
file's own header already specifies the correctness bar as a UI spec, and that its guards are
plain prefix matches — expressible as a PostgREST `.like()` filter, no custom transaction needed.
Actions 2 and 4 turn out to be the same underlying mechanism (`OpportunityStatus` already has both
`disabled` and `under_review` as real values). Action 3 scoped honestly: the real verification
backend doesn't exist even at single-record scale, so V1 is a queue, not a fake check. Proposed
one shared `admin_actions` audit table, written in the same request as each mutation, answering
CEO's own flagged audit-trail gap.

## Gates

`npm run typecheck` / `npm run lint` / `npm run test` — see commit. No `next build` per current
policy. No `npm ci`/`npm install` in this worktree. Zero live writes anywhere in this branch —
the six functions are read-only (confirmed by running them), and the action design is exactly
that: a design, with nothing built yet per the explicit instruction.
