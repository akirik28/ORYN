# Final integration gate — 2026-08-20

Every claim below is proven from live `git`/Supabase-MCP state, gathered in this exact
session, including a real 3-way merge rehearsal (not simulated by inspection alone). Where
the prior `docs/handoffs/claude-b-merge-plan-2026-08-20.md` is corrected or superseded, that's
called out explicitly rather than silently.

## 0. Correction to the prior report's commit-count claim

The prior report said "Safe merge set (all 41 commits...)" but only enumerated 24 hashes.
**Both numbers were real, but conflated two different things — resolved here precisely:**

- **41** = every commit on `oryn/counselor-data-quality-v1` not on `main` (`git rev-list
  --count origin/main..HEAD`), i.e. this branch's **entire history** ahead of `main`.
- Of those 41: **24 are this session's own work** (`cb630c5`..`3c2e298`, first-parent chain —
  the B1-B12 items, extra correctness fixes, and coordination/merge-prep docs), and **17 are
  pre-session commits** already on this branch before this session started (`dcdde0e` through
  `036792f` — earlier opportunity/counselor/university data-quality work from a prior
  session).
- The prior report's hash list correctly enumerated the 24 session commits (that's what it
  meant by "safe merge set") but mislabeled the count as 41/39 in prose without also listing
  the 17 older ones. No hashes were wrong or fabricated — the list was accurate, the summary
  number attached to it wasn't. Full split, verified via `git rev-list`/`comm` set
  difference:

| | Count | Commits |
|---|---|---|
| Pre-session (already on branch, not this session's work) | 17 | `dcdde0e`, `816b57a`, `1a75cc0`, `8cfa80a`, `9dee292`, `e9cff8d`, `fdf258b`, `46db332`, `667f201`, `a99af49`, `5900121`, `cbee6a3`, `1ec229f`, `44bd13f`, `08ddf0f`, `f6c353f`, `036792f` |
| This session's own commits | 24 | `cb630c5`, `5cdf1bd`, `465ab7a`, `072313d`, `6b715ac`, `bb367d0`, `88061d6`, `247b4e2`, `0c7e0d4`, `508e1e9`, `4ac888d`, `1a73190`, `ad46bc5`, `8ccc8e0`, `b68f4a2`, `a5234c5`, `5f04dd6`, `e00d9b3`, `f72d096`, `dcedc6b`, `41a5d5a`, `5c1d4e4`, `cea997e`, `3c2e298` |
| **Total ahead of `main`** | **41** | — |

None are merge commits with conflicting content — the two merges in the list (`88061d6`,
`247b4e2`) were both `origin/main` merges that resolved with zero conflicts (verified when
they landed). None are documentation-only in a way that changes this conclusion — the docs
commits are real, atomic, already-pushed work, correctly part of the 24.

## 1. Current heads (re-fetched this session, most recent first)

| Branch | HEAD | Subject |
|---|---|---|
| `main` | `5c59115` | docs: coordination integration — workstreams map + re-measured current-state |
| Claude B (`oryn/counselor-data-quality-v1`) | `3c2e298` | docs(coordination): sync ORYN_WORKSTREAMS with Claude A's newer status + this session's fixes |
| Claude A (`oryn/programs-pipeline-reconciled`) | `afb973f` | data: remove 3 more junk opportunity rows found via group G dedup check |
| UI Claude (`oryn/ui-simplification-v1`) | `530a354` | docs(ui): document premium visual convergence pass in handoff |

UI Claude's branch moved twice more during this exact session (`aa7fb2b` → `040db49` → `530a354`,
picking up Claude B's `5c1d4e4`/`cea997e`/`3c2e298` and adding 2 of their own commits,
`233e944`/`5a174f1`, "premium visual convergence") — re-checked against this HEAD, not an
earlier snapshot.

## 2. Ancestry matrix

| Relationship | Result | Evidence |
|---|---|---|
| Claude B fully contained in UI Claude? | **YES** | `git merge-base --is-ancestor <c> origin/oryn/ui-simplification-v1` true for all 41 of Claude B's commits, including the newest 3 (`5c1d4e4`, `cea997e`, `3c2e298`) |
| Claude B fully contained in Claude A? | **NO** | Only `5c59115` is shared (via `main`, not a branch merge) — `merge-base(B, A) = 5c59115`, and `5c59115` is not an ancestor of any of Claude B's other 40 commits' effect on Claude A |
| UI Claude contained in Claude A? | **NO** | `git merge-base --is-ancestor origin/oryn/ui-simplification-v1 origin/oryn/programs-pipeline-reconciled` → false |
| Claude A contained in UI Claude? | **NO** | Reverse check also false. `merge-base(UI, A) = 5c59115` too — same shared point, no direct relationship |
| Newest version of Claude B's work | **UI Claude's branch** | Contains all 41 of Claude B's commits plus 2 more of their own on top |

**Merge commits verified directly (parents, not inferred from messages):**

| Commit | Parent 1 | Parent 2 | What it actually merged |
|---|---|---|---|
| `6bbe245` | `47aa83c` (UI Claude's own prior work) | `8ccc8e0` (Claude B's B2 commit) | Confirmed: brings in Claude B through B2/B4/B8/B9 |
| `1488ec4` | `22e7c20` (UI Claude's own dashboard hierarchy pass) | `41a5d5a` (Claude B's B6/B7/B10/B11 + docs) | Confirmed: brings in Claude B through `41a5d5a` |
| `040db49` | `5a174f1` (UI Claude's own visual pass) | `3c2e298` (Claude B's exact latest at merge time) | Confirmed: brings in the crash fix (`5c1d4e4`) and merge-plan docs |
| `19c6fca` | `29c2f97` (Claude A's own prior work) | `5c59115` (shared coordination commit, reached via `main`) | Confirmed: does NOT bring in Claude B's product branch — only the one shared docs commit that's also on `main` |

## 3. Should Claude B merge directly to `main`? **YES.**

Tested by rehearsal (Section 10), not asserted. Reasoning:

- Claude B's branch is a **strict, already-fast-forwardable ancestor of `main`** — `main`
  (`5c59115`) is literally one of Claude B's own ancestors, so `main` → Claude B is a trivial
  fast-forward with zero risk, proven in the rehearsal (Section 10, step 1).
- Path B (relying on UI Claude's branch to carry Claude B's work into `main` instead of
  merging Claude B directly) was considered and rejected: it would make Claude B's
  independently-tested, already-pushed work only reach `main` as a side effect of UI Claude's
  much larger, still-actively-changing branch (2 more commits landed on it during this exact
  session), coupling a stable release-ready set of commits to a moving target for no benefit —
  git recognizes identical commit hashes regardless of merge order, so there's no
  duplicate-history cost to merging Claude B directly first, and doing so gives `main` the
  tested, frozen state sooner and with a cleaner attribution/rollback boundary.

## 4. Recommended `main` integration order

Proven safe by rehearsal, in this exact order:

1. **Claude B → `main`** (fast-forward, `5c59115`→`3c2e298`, zero risk — literally the current
   state of `main` plus Claude B's 41 already-ancestor commits, nothing to merge in the
   3-way sense).
2. **Claude A → `main`** — one real conflict (`docs/ORYN_WORKSTREAMS.md`, resolved by taking
   Claude B's version, which already supersedes Claude A's as its own base — see Section 10);
   `package.json` auto-merges cleanly (different insertion points in the same scripts block,
   confirmed by direct inspection of both diffs before the rehearsal, then confirmed
   auto-merging with no conflict during it).
3. **UI Claude → `main`** — zero conflicts in rehearsal, `ort` strategy auto-merge.
4. **Migrations 0047/0048** apply independently, whenever DDL access allows — blocks nothing
   above (`5c1d4e4` already makes application code safe to deploy with or without them; see
   Section 9).

## 5. Required commits that must not be lost

- **`5c1d4e4`** (`fix(opportunities): refreshOpportunityMatches crashes on any environment
  missing migration 0047`) — **confirmed present** in Claude B's branch, in UI Claude's branch
  (`origin/oryn/ui-simplification-v1` @ `530a354`, verified via `is-ancestor`), and in the
  rehearsal's final merged state. Not at risk in any of the recommended paths.
- Other correctness/data-integrity fixes from this session, all confirmed present in the same
  three places: `cb630c5` (curriculum select-default bug), `5cdf1bd` (opportunity eligibility
  unknown-vs-confirmed), `072313d` (completeness scoring), `6b715ac` (`profile_views` RLS —
  migration `0048`), `1a73190` (EntityCombobox Escape-key bug).

## 6. Claude A dependencies

- **File-level**: two overlaps found on fresh re-check (the prior report only found
  `docs/ORYN_WORKSTREAMS.md`; this pass also found **`package.json`**, not previously
  flagged). Both are additive-only, non-overlapping line ranges, confirmed safe by direct
  diff inspection and then by the rehearsal actually merging them (one auto-merged, one had a
  textual conflict cleanly resolved — see Section 10).
- **Schema/runtime-level** (checked per the explicit instruction that zero file overlap
  doesn't mean zero dependency): Claude B's `lib/universities/counseling-adapter.ts` (B7)
  reads `university_programs`, a table Claude A's ingestion pipeline (`lib/acquisition/
  programs.ts`, `lib/programs/ingest.ts`) actively writes to. This is a normal
  producer/consumer relationship, not a coordination risk — B7 reads via the existing,
  stable `verification_state` contract that predates this session, not anything Claude A
  changed this session.
- **Migration 0043**: Claude A ran the backfill this session (`4dd66cd`) — re-verified live
  again this pass (9/9 pairs `duplicate_status='superseded'`, matching `superseded_by_id`).
  Claude B's code does not yet consume this column (still reads the JSON snapshot — see
  Section 9's follow-up note), so there is no active runtime dependency, only a stale
  application-layer implementation that should eventually catch up to what Claude A's data
  now supports.
- No dependency found on opportunity schema changes, program ingestion internals, or
  scoring/data contracts beyond the above.

## 7. UI Claude dependencies

None block integration — full detail and per-file conflict-type classification already in
`docs/handoffs/claude-b-merge-plan-2026-08-20.md` Section B (re-confirmed accurate this pass:
UI Claude's branch still contains 100% of Claude B's commits, now including the 3 that
landed after that document was written). The rehearsal found **zero conflicts** merging UI
Claude after Claude B and Claude A — clean `ort`-strategy auto-merge.

## 8. Migration deployment order

Independent of the code-merge order above — none of the three code merges wait on any
migration, and no migration waits on the code merges (after `5c1d4e4`).

| | 0043 | 0047 | 0048 |
|---|---|---|---|
| Committed/pushed | Yes (Claude A's branch, DDL) | Yes (Claude B) | Yes (Claude B) |
| Applied live | **Yes** | No | No |
| Backfill verified | **Yes**, 9/9, re-verified this pass | N/A | N/A |
| App can deploy before it applies | N/A (already applied) | **Yes**, now that `5c1d4e4` landed — self-healing `select("*")` | **Yes** — no app code references the new function/policy by name |
| What's degraded before it applies | N/A | Citizenship/grade eligibility checks silently skip (treated as unknown, not wrong — matches the "unknown ≠ ineligible" design) | The RLS gap it closes stays open (low-severity, pre-existing) |
| Silent data loss risk | None | **None** — confirmed: every consumer field access already uses `?? []`/optional chaining, verified again this pass | None |
| Can the migration deploy before app code? | N/A | Yes, no ordering requirement either direction | Yes, same |
| Recommended order | Already resolved | Apply whenever DDL access allows; no code-side blocker remains | Apply whenever DDL access allows |

Not applying any migration this pass, per explicit instruction.

## 9. Post-integration follow-up (not implemented, unchanged from the prior report)

`lib/universities/canonical.ts` DB-native conversion — still fully scoped, still not started,
per `docs/handoffs/claude-b-merge-plan-2026-08-20.md`'s dedicated section. No new information
this pass beyond confirming migration 0043's backfill (its prerequisite) remains verified
correct.

## 10. Rehearsal results

Performed in a disposable worktree (`.claude/worktrees/integration-rehearsal-2026-08-20`,
branch `integration/rehearsal-2026-08-20`, based on `origin/main`), **never pushed**, removed
after this report was written.

**Step 1 — merge Claude B** (`git merge origin/oryn/counselor-data-quality-v1`):
Fast-forward, `5c59115`→`3c2e298`, 112 files changed, **zero conflicts** (expected — `main`
is a direct ancestor).

**Step 2 — merge Claude A** (`git merge origin/oryn/programs-pipeline-reconciled`):
**One real textual conflict**: `docs/ORYN_WORKSTREAMS.md` (both sides had independently
edited the same table rows and cross-branch-facts section relative to their common ancestor).
`package.json` auto-merged cleanly with no conflict, confirming the pre-rehearsal diff
inspection. **Manual resolution**: took Claude B's (`HEAD`) version of `ORYN_WORKSTREAMS.md`
in full (`git checkout --ours`) — verified before resolving that Claude B's version already
incorporated Claude A's content as its own base (pulled in an earlier commit this session)
plus newer corrections on top, making Claude A's side a strict subset; no information lost.
Merge commit: `88679f3`.

**Step 3 — merge UI Claude** (`git merge origin/oryn/ui-simplification-v1`):
**Zero conflicts**, clean `ort`-strategy auto-merge, 13 files, 602 insertions. Merge commit:
`360a87b` (final rehearsal HEAD).

**Validation on the fully-merged rehearsal branch** (all three branches combined):
- `npx tsc --noEmit` — **clean**.
- `npx eslint app components features lib types __tests__ scripts` — **clean**.
- Targeted tests (`opportunities`, `universities`, `counselor`, `scoring`, `entities`,
  `profile`) — **532/532 passed**, 48 files.
- Full suite (`npm test`) — **1152/1152 passed**, 99 files.
- `npm run build` — first attempt failed with a Turbopack-specific error
  (`Symlink [project]/node_modules is invalid, it points out of the filesystem root`) caused
  by this rehearsal's dependency-sharing shortcut (a symlinked `node_modules`), **not a code
  defect** — `tsc`/`eslint`/`vitest` all already passed cleanly against the same merged
  source. Re-ran with a real `npm install` in the rehearsal worktree: **build succeeded
  cleanly, 39 routes, no errors**.

No manually-resolved file required inspecting more than the one conflict above — every other
file merged automatically with content git itself determined to be non-conflicting, matching
the file-level and schema-level analysis in Sections 6-7.

## 11. GO / NO-GO

```
GO — integration path is validated
```

Recommended order: **Claude B → `main`, then Claude A → `main`, then UI Claude → `main`**
(Section 4), migrations independent of all three (Section 8). Rehearsed end to end with real
merges (not simulated), one conflict found and resolved, full validation clean including a
real production build.
