# ORYN integration-readiness report — 2026-08-20

Compiled by Claude B at the close of the B1-B12 package. Live-checked against actual branch
state via `git fetch --all --prune` immediately before writing this, not copied from earlier
session notes.

## 1. Completed B1-B12 (founder's Claude-B brief)

| # | Item | Outcome | Commit(s) |
|---|---|---|---|
| B1 | Current product capability map | Written, code/schema-audited across all 5 domains | `bb367d0` |
| B2 | Student data contract audit | Confirmed sufficient — `ScoringFacts`/`StudentAdvisorContext` already serve this role. No new code | `8ccc8e0` |
| B3 | Native-grade/class-rank/curriculum semantics | Schema confirmed sound; found and fixed a real UI bug (Select silently defaulting to "AP") | `cb630c5` |
| B4 | Counselor dashboard contract | New `strengths` concept + `buildCounselorDashboardContract`, dashboard no longer solely blocked on AI weekly plan | `4ac888d` |
| B5 | Opportunity eligibility vs. fit | Fixed: unknown no longer silently reads as confirmed-eligible; citizenship/grade checks added | `5cdf1bd` |
| B6 | Provenance/confidence contract | One real narrowing gap found and fixed; opportunities surface already had zero gaps | `b68f4a2` |
| B7 | University counseling adapter | `buildUniversityCounselingView()` — composes existing outlook/requirement/tuition logic, no new scoring | `a5234c5` |
| B8 | Entity combobox regression tests | Found and fixed a real Escape-key bug; added component + search-layer test coverage | `1a73190` |
| B9 | Turkish/international persona | Persona F, verified against real scoring/eligibility math | `ad46bc5` |
| B10 | Shared UI primitives audit | Baseline already consistent; one flagged (not fixed) gap for the redesign pass | `5f04dd6` |
| B11 | Empty/loading/error primitives | Route-level infra + hand-rolled-state consolidation onto existing primitives | `e00d9b3` |
| B12 | Feature-preservation matrix | Written, for the incoming UI redesign to consult | `0c7e0d4` |

Plus 3 correctness fixes outside the numbered list, found during the audit: profile
completeness scoring (`072313d`), `profile_views` RLS gap (`6b715ac`), and an app-wide
surface-failed-mutations-via-toast pass (`f72d096`) — plus a coordination-protocol package
(workstreams doc, re-measured `current-state.md`, `5c59115`/`247b4e2`).

**Full-repo verification, last run this checkpoint**: `npx tsc --noEmit` clean, `npx eslint
app components features lib types __tests__ scripts` clean, `npm run test` 1140/1140,
`npm run build` clean (39 routes). All committed and pushed to
`origin/oryn/counselor-data-quality-v1`.

## 2. Remaining blockers

| Blocker | Status | Notes |
|---|---|---|
| Anthropic API | Blocked — insufficient credit (billing, not missing key) | Unchanged all session. Blocks Advisor, weekly plan, CV extraction, AI narration |
| Tavily | Blocked — HTTP 432, plan usage limit | Unchanged all session. Blocks opportunity/requirement discovery jobs |
| Supabase secret key | **New this checkpoint** — "JWT issued at future" | Was OK as of the prior checkpoint (2026-08-19). Breaks admin panel, account deletion, notification writes, moderation. Top founder action |
| Migration 0043 data backfill | **Resolved this session** by Claude A (`4dd66cd`, pushed after this report's data was gathered) | DDL was already live (found this checkpoint, corrected the "never applied" narrative in several docs); Claude A ran the backfill directly after |
| Migrations 0047/0048 (mine) | Written, reviewed, not yet applied to any live DB | Worth re-testing DDL access now that 0043 turned out to be applicable — the blocker may be smaller than previously assumed |

## 3. Migrations not applied live

- **0047** `structured_eligibility_facts.sql` — citizenship/grade fields (`opportunities.
  eligible_citizenships`/`eligible_grades`, `profiles.citizenship_countries`). Only on this
  branch.
- **0048** `profile_view_visibility_guard.sql` — RLS fix for `profile_views`. Only on this
  branch.
- Both syntactically reviewed, pattern-consistent with already-applied migrations. Numbering
  guidance recorded in `docs/ORYN_WORKSTREAMS.md`: **0049+ for the next new migration on any
  branch.**

## 4. Branch / commit inventory (live-checked just now)

| Branch | Tip | Since merge-base with `main` | Owner |
|---|---|---|---|
| `main` | `5c59115` | — | shared |
| `oryn/counselor-data-quality-v1` (this branch) | `f72d096` | 19 commits since `bb367d0` (this session) | Claude B |
| `oryn/programs-pipeline-reconciled` | `4dd66cd` | 23 commits | Claude A |
| `oryn/ui-simplification-v1` | `47aa83c` | 27 commits | UI-simplification Claude |
| `oryn/counselor-core-v1`, `oryn/university-intelligence-spine`, `oryn/integration-2026-08-19`, `oryn/recovery-pre-integration-2026-08-19` | — | — | Dormant/historical — no commits ahead of what's already in the active lineages, per `docs/ORYN_WORKSTREAMS.md` |

None of the three active branches (this one, Claude A's, UI Claude's) has merged into `main`
yet.

## 5. Conflicts / dependencies with Claude A and UI Claude

**Claude A — low risk.** Diffed their branch against `main`: only `lib/acquisition/
programs.ts` and `lib/programs/ingest.ts` touched in `app/`/`features/`/`lib/` — clean
separation matching their declared ownership (data acquisition). No migration-number
collision (they're still at 0046; guidance for 0049+ is recorded for when they add one).

**UI-simplification Claude — real, but already partly reconciled.** Their branch's merge-base
with mine is `bb367d0` — **they already merged my branch at that point**, so `cb630c5`,
`5cdf1bd`, `072313d`, `6b715ac`, and `bb367d0` are already in their history, byte-identical
(verified via `git diff` on the two highest-stakes files, `lib/scoring/completeness.ts` and
`lib/opportunities/matching.ts` — zero divergence). Their 27 commits since then are their own
independent work, and they've since touched several files I *also* modified in my
post-`bb367d0` commits, which they do **not** yet have:

- `features/dashboard/dashboard-view.tsx` — I added a `counselorThisWeek` fallback prop
  (`4ac888d`); they made independent dashboard changes on the pre-fallback version.
- `features/entities/entity-combobox.tsx` — I fixed the Escape-key bug (`1a73190`); their
  43-line diff is independent work on the pre-fix version.
- `features/opportunities/opportunity-card.tsx` — I added the "Eligibility unknown" badge
  (`5cdf1bd`, already in their history) but their branch has 15 more lines of independent
  change on top.
- `app/(app)/universities/[id]/page.tsx` — I widened two `select()`s for provenance (`b68f4a2`);
  they've made independent, larger changes (14 lines net, likely layout-related).
- `features/profile/dynamic-form-fields.tsx`, `features/profile/field-config.ts` — my
  curriculum-select fix (`cb630c5`) is already in their history; they have further
  independent changes on top of it.

**Not yet a conflict** — a real merge hasn't been attempted and neither branch has touched
`main` — but reconciling these two branches will need actual attention when either merges,
since both have kept moving on shared files since the last sync point.

## 6. Safe to merge to `main` now

Everything on `oryn/counselor-data-quality-v1` that does **not** touch a file UI Claude's
branch has independently modified since `bb367d0`:

- `b68f4a2` (B6), `a5234c5` (B7), `5f04dd6` (B10 docs), `8ccc8e0` (B2), `ad46bc5` (B9),
  `0c7e0d4`/`bb367d0` (docs), `6b715ac` (RLS fix, migration-only), `508e1e9`/`465ab7a`
  (handoffs), the coordination package (`5c59115`) — none of these touch a file UI Claude has
  since diverged on.
- `072313d` (completeness split) is **already identical** in both branches — mergeable with
  zero conflict regardless of order.

## 7. What should wait

- **`4ac888d` (B4), `1a73190` (B8), `5cdf1bd`'s opportunity-card.tsx hunk, `b68f4a2`'s
  universities/[id] hunk, `e00d9b3`/`f72d096`'s touches to dashboard-view.tsx/entity-combobox.tsx/
  opportunity-card.tsx** — these touch files UI Claude has since built further, independent
  work on top of. Merging either branch to `main` first is fine in isolation (no conflict with
  `main` itself, which hasn't touched these files); the real reconciliation work is
  **between this branch and UI Claude's branch**, not against `main`. Recommend: whichever of
  us merges to `main` second does a real 3-way merge/rebase against the other's branch first,
  not a blind sequential merge.
- **Migrations 0047/0048** — apply once DDL access is confirmed (worth re-testing given 0043
  turned out applicable).
- **Supabase secret-key regression** — founder action, blocks nothing in this branch's own
  work but blocks live QA of anything secret-key-dependent.

## 8. Next (non-overlapping correctness work only, per instruction to stop feature expansion)

Candidates that don't touch any file UI Claude's branch has diverged on: `docs/founder-
blocked-backlog.md` re-triage now that 0043 is resolved; re-verifying whether 0047/0048 can
now be applied; any correctness issue found in files neither Claude A nor UI Claude currently
owns.
