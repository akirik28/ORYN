# Claude B session — 2026-08-20

Workstream: **Computer B — PRODUCT / COUNSELOR / UX / INTEGRATION** per `docs/MASTER-EXECUTION-STRATEGY.md`
(read via `origin/main` — not yet merged onto this branch; see Coordination note below).
Branch: `oryn/counselor-data-quality-v1`. Base task: product-integration/data-contracts/
counselor-surfacing/UI-foundation/QA prep for the incoming UI-simplification redesign, per
the founder's own per-session Claude-B brief (not itself a repo file — summarized here so it
has a durable trace).

## Coordination note

`docs/MASTER-EXECUTION-STRATEGY.md` exists on `origin/main` (added there, commit `9c06610`,
same day as this session) and on `origin/oryn/programs-pipeline-reconciled` (Claude A's
branch), but is **not yet present** on this branch, `oryn/counselor-core-v1`, or
`oryn/integration-2026-08-19` — read directly via `git show origin/main:...` rather than
merged in, to avoid pulling in main's unrelated QS-ranking-sort fixes mid-package. Treating
that file as the canonical master-plan/workstream-ownership doc and `docs/current-state.md`/
`docs/product-decisions.md` as the canonical status/decisions docs — all three already exist
and are shared; not duplicating them with new `ORYN_*.md` files. Main→branch integration is
deliberately deferred to an explicit integration step, not done reflexively mid-package.

## Completed this session (implemented, tested, committed, pushed)

1. **`cb630c5`** — `DynamicFormFields`'s `<Select>` no longer silently pre-selects
   `options[0]` for a nullable field with no matching DB default. Concretely:
   `education_records.curriculum` (nullable, no default) was visually pre-showing "AP" on
   every Add Education Record dialog regardless of the student's actual curriculum — the
   exact US-centric-default failure mode the international/Turkish-student correctness work
   is meant to prevent. Same fix covers `sports_experiences.level`. Also fixed
   `activities.category` defaulting to `"club"` in `app/(app)/profile/page.tsx` instead of
   the column's own DB default `"other"` — was silently miscategorizing any activity saved
   without the category dropdown touched.
2. **`5cdf1bd`** — `/opportunities` (For You + Browse + detail) eligibility was a plain
   boolean that silently treated "the fact needed to check a restriction isn't on file" as
   identical to "confirmed eligible," and never checked citizenship/grade despite
   `eligible_citizenships`/`eligible_grades` existing on `opportunities` since migrations
   0047/0041 — a citizenship- or grade-restricted opportunity could render as "Exceptional
   match" with zero caveat anywhere outside the separate, already-correct Counselor Core path
   (`lib/counselor/eligibility.ts`, untouched). `computeEligibility` now checks citizenship
   and grade too, and distinguishes known-ineligible (unchanged hard exclusion) from
   restriction-exists-but-fact-missing (stays `eligible: true`, now carries an explanatory
   note; card/detail page render a distinct "Eligibility unknown" badge). No migration
   needed — reuses the existing nullable `eligibility_notes` column. 8 new test cases added.

Both: `npm run typecheck` / `npm run lint` / `npm test` (1048/1048) clean before each commit,
re-run clean after both. No `npm run build` this session yet (queued before session end).

## In progress

Auditing real code/schema (not existing docs, which are 1-4 days stale in places — noted
per-domain below) to write `docs/current-product-capability-map.md`. Four of five domain
passes done (Student, Counseling, Opportunities, Social — each independently grounded in
migrations/lib/app/tests, not in prior docs); University domain audit stalled mid-run and is
being re-launched. Also queued: `docs/ui-feature-preservation-matrix.md`, a student data
contract audit, a counselor dashboard view-model contract, a Turkish/MEB persona fixture +
test, and two more low-severity confirmed bugs not yet fixed (`lib/scoring/completeness.ts`
weighting social-profile flourishes equally with counseling-relevant signal;
`profile_views` INSERT RLS not gated on public/connected profile — migration
`0036_profile_views.sql:30-33`).

## Blockers

None. (Historical env blockers — Anthropic billing, Tavily rate limit, DDL access for
migrations 0043/0046 — are unchanged from `docs/current-state.md` as far as this session
knows; not re-verified live here since this session did no DB-facing work.)

## Next

Finish the university-domain audit pass, write the capability map, then continue down the
B1-B12 package list from the founder's Claude-B brief (student data contract, counselor
dashboard contract, university counseling adapter, entity-combobox regression tests, Turkish
persona, shared UI primitives, empty-state primitives, feature-preservation matrix), fixing
confirmed correctness bugs found along the way rather than only documenting them, each as its
own small tested commit.
