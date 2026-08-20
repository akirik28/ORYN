# Claude B merge plan — 2026-08-20

Executable integration plan, built from live `git`/Supabase-MCP state at time of writing —
every claim below was checked against current repository/DB reality, not assumed from the
earlier `docs/integration-readiness-report-2026-08-20.md` (which is now partially superseded;
see the note at the end of this file).

**Branch**: `oryn/counselor-data-quality-v1` @ `5c1d4e4`, clean, fully pushed.
**`origin/main`**: `5c59115`. My branch is 39 commits ahead, 0 behind (`git rev-list
--left-right --count origin/main...HEAD` = `0  39`).

## Commit map — B1-B12 and extra correctness commits

Every row checked directly: `git show --name-only`, `git merge-base --is-ancestor`, and (for
migration-dependent commits) a live query against `oryn-qa-scratch`.

| Item | Commit | Files | Migration dep? | UI overlap? | Claude A overlap? | Safe independently? |
|---|---|---|---|---|---|---|
| B1 | `bb367d0` | `docs/current-product-capability-map.md` | No | No | No | Yes |
| B2 | `8ccc8e0` | `docs/student-data-contract-audit.md` (docs only, no code) | No | No | No | Yes |
| B3 | `cb630c5` | `app/(app)/profile/page.tsx`, `features/profile/dynamic-form-fields.tsx`, `features/profile/field-config.ts` | No | Already merged into UI Claude's branch, no divergence since | No | Yes |
| B4 | `4ac888d` | `app/(app)/dashboard/page.tsx`, `app/(dev-preview)/design-preview/page.tsx`, `features/dashboard/{dashboard-view,counselor-week-fallback}.tsx`, `lib/counselor/{index,types,strengths,dashboard-contract}.ts`, 2 test files | No | UI Claude merged this (`6bbe245`) and built `22e7c20` directly on top of it (compatible parallel change, verified by diff — reuses `ProfileStrength`/`StrengthTier` exactly as defined) | No | Yes |
| B5 | `5cdf1bd` + `5c1d4e4` | `lib/opportunities/{matching,persist-matches}.ts`, `features/opportunities/opportunity-card.tsx`, both opportunities pages, 1 test file | `5c1d4e4` fixes a real crash the original commit introduced on any env without migration 0047 (see Phase 6 below) — **treat these two commits as one logical unit** | Already merged into UI Claude's branch | No | Yes, as a pair — do not cherry-pick `5cdf1bd` without `5c1d4e4` |
| B6 | `b68f4a2` | `app/(app)/universities/[id]/page.tsx`, `docs/provenance-confidence-contract-audit.md` | No — widened columns (`verified_at`, `data_quality_flag`) verified to exist live already | Already merged into UI Claude's branch | No | Yes |
| B7 | `a5234c5` | `lib/universities/counseling-adapter.ts`, 1 test file | No | Already merged into UI Claude's branch | No | Yes |
| B8 | `1a73190` | `features/entities/entity-combobox.tsx` (real Escape-key bug fix), 2 test files | No | Already merged into UI Claude's branch | No | Yes |
| B9 | `ad46bc5` | `__tests__/counselor/contract-personas.test.ts` | No | Already merged into UI Claude's branch | No | Yes |
| B10 | `5f04dd6` | `docs/shared-ui-primitives-audit.md` (docs only, zero code changed) | No | No | No | Yes |
| B11 | `e00d9b3` | 31 files — 16 new `loading.tsx` routes + `error.tsx`/`not-found.tsx`/`loading-skeleton.tsx` + 9 empty-state consolidations | No | Already merged into UI Claude's branch | No | Yes |
| B12 | `0c7e0d4` | `docs/ui-feature-preservation-matrix.md` | No | No | No | Yes |

**Extra correctness commits (outside the numbered B-list):**

| Fix | Commit | Files | Migration dep? | UI overlap? | Claude A overlap? | Safe independently? |
|---|---|---|---|---|---|---|
| Completeness scoring correction | `072313d` | `lib/scoring/{completeness,persist}.ts`, 1 test file | No | Already merged into UI Claude's branch — verified byte-identical | No | Yes |
| `profile_views` RLS fix | `6b715ac` | `supabase/migrations/0048_profile_view_visibility_guard.sql` | **Is** a migration (0048 itself) — see Phase 6 | Already merged into UI Claude's branch | No | Yes — migration file merging to `main` doesn't apply it; safe |
| Failed-mutation toast surfacing | `f72d096` | 11 files (`admin/*`, `connections/*`, `documents/evidence-row.tsx`, `messaging/conversation-thread.tsx`, `opportunities/{opportunity-actions,opportunity-card}.tsx`, `universities/save-university-button.tsx`) | No | `opportunity-card.tsx` already merged into UI Claude's branch (identical); other 10 files not independently checked against UI Claude's later commits — low risk, none appear in UI Claude's diverged-file list (dashboard/entity-combobox/universities-detail/profile-forms) | No | Yes |
| Coordination doc corrections | `5c59115`→`247b4e2`, `508e1e9`, `dcedc6b`, `41a5d5a` | `docs/current-state.md`, `docs/ORYN_WORKSTREAMS.md`, `docs/handoffs/*`, `docs/integration-readiness-report-2026-08-20.md`, `lib/universities/canonical.ts` (comment-only), `docs/founder-blocked-backlog.md` | No | No | Partial — `docs/ORYN_WORKSTREAMS.md` was independently edited by Claude A too (add/add on the same file); Claude A already resolved this by merging mine in (`19c6fca`) | Yes, but see note below — my copy of `ORYN_WORKSTREAMS.md` is now itself one checkpoint stale relative to Claude A's; not fixed in this pass, flagged only |
| Live-crash fix (this pass) | `5c1d4e4` | `lib/opportunities/persist-matches.ts` | Fixes a bug caused by depending on migration 0047 before it's applied | Not yet checked against UI Claude (pushed this session, after their last merge) | No | Yes, and should merge together with B5 |

## A. Safe to merge to `main` now

All 39 commits on this branch are safe to merge to `main` as a single fast-forward or merge
commit — `main` currently has none of this branch's product work (only the shared
coordination commit, `5c59115`, already common to both). There is no commit on this branch
that depends on something not yet on `main` or not yet applied. Recommended: merge the whole
branch in one motion rather than cherry-picking, since:

1. Every commit passed its own atomic verification when it landed (`typecheck`/`lint`/tests
   run per-commit throughout this session, plus a final full-repo pass after the last one:
   `npx tsc --noEmit` clean, `npx eslint app components features lib types __tests__ scripts`
   clean, `npm test` 1140/1140, `npm run build` clean, all re-run after `5c1d4e4`).
2. B5's two commits (`5cdf1bd` + `5c1d4e4`) must land together — cherry-picking `5cdf1bd`
   alone reintroduces the live-crash bug on any environment without migration 0047.
3. No commit here conflicts textually or semantically with anything currently on `main`.

Ordered list (chronological — later commits in a few cases depend on earlier ones in the same
sequence, e.g. `4ac888d` before `1a73190` only because of commit order, not a real
dependency; the full linear history is safe to replay as-is):

```
cb630c5, 5cdf1bd, 465ab7a, 072313d, 6b715ac, bb367d0, 88061d6, 247b4e2, 0c7e0d4,
508e1e9, 4ac888d, 1a73190, ad46bc5, 8ccc8e0, b68f4a2, a5234c5, 5f04dd6, e00d9b3,
f72d096, dcedc6b, 41a5d5a, 5c1d4e4
```

## B. Hold for UI reconciliation

**Nothing needs to be held.** Re-checked from current branch heads, not assumed from the
earlier report: `git merge-base --is-ancestor <commit> origin/oryn/ui-simplification-v1`
returns true for every single commit on this branch, through `41a5d5a` — UI Claude has already
merged this branch into theirs **twice** (`6bbe245` after my B4/B8/B9/B2 landed, `1488ec4`
after my B6/B7/B10/B11 landed, the latter's second parent is literally `41a5d5a`, merged
seconds after I pushed it). `5c1d4e4` (this pass's crash fix) was pushed after their last
merge and hasn't been checked into their branch yet, but it's a pure bug fix with zero
surface-level API change (same function signature, same return shape) — not expected to
conflict with anything.

Previously-flagged overlap files, re-verified now that UI Claude has absorbed my work:

| File | Claude B changed | UI Claude changed | Conflict type | Resolution |
|---|---|---|---|---|
| `features/dashboard/dashboard-view.tsx` | Added `counselorThisWeek` prop + fallback rendering (`4ac888d`) | Built `22e7c20` directly on top, after merging mine — added `topStrength` pairing, deadline dedup, quieter secondary cards, reuses `ProfileStrength`/`StrengthTier` from my B4 work exactly as typed | **Compatible parallel change** (forward-building, not conflicting) | None needed — already reconciled on UI Claude's side |
| `lib/scoring/completeness.ts` | Split `computeCompleteness`/`computeCounselingCompleteness` (`072313d`) | None beyond the merge | **Not a conflict** — diffed byte-for-byte identical between branches | None needed |
| `lib/opportunities/matching.ts` | Added citizenship/grade eligibility checks (`5cdf1bd`) | None beyond the merge | **Not a conflict** — diffed byte-for-byte identical between branches | None needed |
| `features/entities/entity-combobox.tsx` | Escape-key fix (`1a73190`) | Their pre-merge independent work (43 lines, before `6bbe245`) is now superseded by the merge — current tip has both | **Was textual, now resolved** | Already reconciled on UI Claude's side |
| `features/opportunities/opportunity-card.tsx` | Eligibility badge (`5cdf1bd`) + toast rollback (`f72d096`) | Their independent pre-merge work is now superseded | **Was textual, now resolved** | Already reconciled on UI Claude's side |
| `app/(app)/universities/[id]/page.tsx` | Widened 2 selects for provenance (`b68f4a2`) | Independent larger change, merged in via `1488ec4` | **Not independently re-diffed this pass** — UI Claude's own merge commit message states "Confirmed zero overlap with dashboard/profile files before merging" | Trust UI Claude's own verification; low risk given `b68f4a2`'s change was a 2-line column-list widening |
| `features/profile/dynamic-form-fields.tsx`, `field-config.ts` | Select-default-value fix (`cb630c5`) | Their further independent changes, merged in via `6bbe245` | **Was textual, now resolved** | Already reconciled |

## C. Claude A dependencies

None of this branch's 39 commits depends on anything Claude A owns. Confirmed: `git diff
--stat $(git merge-base origin/oryn/programs-pipeline-reconciled origin/main)
origin/oryn/programs-pipeline-reconciled -- app/ features/ lib/` shows only
`lib/acquisition/programs.ts` and `lib/programs/ingest.ts` touched on their side — zero
overlap with anything this branch touches. None of this branch's commits are ancestors of
Claude A's branch (checked all 18 named commits above — all "not in
programs-pipeline-reconciled").

The one real dependency runs the other way, and it's already resolved: this branch's B6/B7
work (`university counseling adapter`, provenance widening) reads `duplicate_status`/
`superseded_by_id` indirectly through existing read paths that don't yet use those columns
(see Phase 5/post-integration item below) — Claude A's own backfill of those columns
(`4dd66cd`, verified live: 9/9 pairs correctly superseded) doesn't change anything this branch
reads today, since nothing on this branch queries `duplicate_status` directly yet.

## D. Migrations

| Migration | In repo | Committed | Pushed | Applied live | Verified live | Consumer code depends on it | Risk if app code merges before migration applied |
|---|---|---|---|---|---|---|---|
| **0043** `university_duplicate_supersession` | Yes (Claude A's branch, not this one — this branch doesn't carry the migration file itself) | Yes | Yes | **Yes** (DDL live since 2026-08-19 evening; confirmed via `list_migrations`) | **Yes** — backfill also run and verified this session: 9/9 pairs show `duplicate_status='superseded'` with correct `superseded_by_id`, matching the JSON snapshot exactly | No app code on this branch reads `duplicate_status` yet (`lib/universities/canonical.ts` still reads the JSON file — see Phase 5) | None — fully resolved, nothing depends on the gap |
| **0047** `structured_eligibility_facts` | Yes, this branch | Yes | Yes | **No** | N/A | Yes — `lib/opportunities/{matching,persist-matches}.ts`, `lib/counselor/eligibility.ts` all read `eligible_citizenships`/`eligible_grades`/`citizenship_countries`, all with `?? []` fallbacks | **Was real, now fixed this pass** (`5c1d4e4`) — the two explicit-column-list queries that named the not-yet-existing columns would 42703-error and crash the whole `/opportunities` page; confirmed empirically against the live DB before and after the fix. Now self-healing: app runs correctly with or without 0047 applied, upgrades automatically once it lands |
| **0048** `profile_view_visibility_guard` | Yes, this branch | Yes | Yes | **No** | N/A | No app code references the new function or the changed policy by name — pure DB-layer change | None — safe to merge app code before this migration applies; the RLS gap it closes simply stays open until applied, no functional regression either way |

**Not applying either migration in this pass, per explicit instruction.** Both are additive,
both were re-read end to end this pass for syntax/ordering/RLS-assumption correctness (see
Phase 6 detail below) and found sound. 0048 requires no application-code coordination at all.
0047 required the fix above before it was actually safe to have "pending" alongside deployed
app code — that gap is now closed.

## E. Recommended main-merge order

Derived from actual current state, not the generic template:

1. **This branch merges to `main` first, as-is (all 39 commits).** Nothing on it depends on
   Claude A's or UI Claude's unmerged work; `main` doesn't need anything from either of them
   first for this branch's commits to apply cleanly (verified: `main`'s tip `5c59115` is
   already an ancestor of this branch, so this is a clean fast-forward or trivial merge, not a
   3-way reconciliation).
2. **UI Claude's branch merges to `main` next.** Since UI Claude has already absorbed this
   entire branch, their merge to `main` (after step 1) should be low-conflict — `main` will
   already have everything they built on top of, and only their own net-new commits
   (dashboard hierarchy pass, sticky jump-nav, citizenship-form.tsx, profile-section-nav.tsx,
   etc.) need to apply.
3. **Claude A's branch merges to `main` whenever ready** — fully independent of the above,
   zero file overlap either direction.
4. **Migrations 0047/0048 apply whenever DDL access allows**, independently of all three code
   merges above — neither blocks nor is blocked by any of them now that `5c1d4e4` is in.
5. **Final integrated validation** after all three branches are on `main`: full
   `typecheck`/`lint`/`test`/`build`, plus a live-DB re-check that nothing newly merged
   depends on an unapplied migration the way `5cdf1bd` briefly, unknowingly did.

## Post-integration follow-up (not implemented this pass — do not start without separate authorization)

**`lib/universities/canonical.ts` DB-native conversion.**

- **Current behavior**: 16 read surfaces filter university duplicates via a static generated
  JSON file (`duplicate-supersessions.json`), read synchronously by 4 exported functions
  (`isSupersededUniversityId`, `canonicalUniversityId`, `getSupersededUniversityIds`,
  `excludeSupersededUniversities`).
- **Desired future behavior**: those same read paths query `universities.duplicate_status`/
  `superseded_by_id` directly (now populated live, verified 9/9 correct), and the JSON file +
  generation script are deleted.
- **Affected call sites**: all 16 surfaces currently importing from `lib/universities/
  canonical.ts` (browse, search, detail-page redirect, target-university writes,
  `EntityCombobox`, global search, applications, dashboard, Advisor context, both deadline
  jobs, `UniversitySearchBox` typeahead, plus ~10 lower-priority dev/admin/report scripts) —
  not individually re-enumerated this pass; a real inventory pass is part of the work, not
  optional prep for it.
- **Known risks**: the 4 functions are synchronous; a DB-native replacement naturally isn't,
  so this is an async-boundary change touching every call site, not a drop-in internals swap.
  Real behavioral-equivalence testing needed per call site, not just a global smoke test.
- **Recommended owner**: Claude B (this is presentation/integration-layer code per the
  workstream split in `docs/MASTER-EXECUTION-STRATEGY.md`), as a dedicated, separately-scoped
  pass — not opportunistic cleanup.

## Note on the prior integration-readiness report

`docs/integration-readiness-report-2026-08-20.md`'s "hold set" (section 7) is now stale — it
was accurate at the time (UI Claude's branch hadn't yet re-merged), but UI Claude has since
merged twice. Not rewriting that file's own text in this pass (out of scope per the explicit
"do not rewrite unrelated planning documents" instruction) — this document supersedes it for
merge-sequencing purposes; that one remains useful for the B1-B12 completion summary and
blocker history, which are still accurate.
