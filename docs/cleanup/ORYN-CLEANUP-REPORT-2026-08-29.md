# ORYN Git Cleanup & Integration Report — 2026-08-29

Executed by a dedicated cleanup/integration session, scoped narrowly: consolidate safe work,
lose nothing, touch nothing risky, hand a clean review surface to Codex (lead engineer). No
architecture decisions, no new features, no Supabase writes, no merges to `main`, no
force-anything, no remote branch deletions. This document is that session's full record,
**including a same-day correction pass**: Codex reviewed the integration branch independently,
found 8 issues (a leftover untracked artifact, stale report numbers, an imprecise "clean"
claim, an unbacked-up set of new commits, trailing-whitespace lint failures, an unreviewed
production-script change, and misleading conclusion-section language), and every one of them
is fixed below — see each numbered fix inline at the relevant section, and the final quality
gates in §4.

## 0. Backup verification (gate passed before any mutation)

`/Users/adasarpkirik/Desktop/Founder/ORYN-backups/2026-08-29-pre-cleanup` — all three files
present, SHA-256 verified byte-for-byte against the values supplied in the task brief before
any git mutation began:

| File | SHA-256 | Match |
|---|---|---|
| `oryn-all-refs.bundle` (16,239,115 bytes) | `9691e0e21a02280e564ec528c2eaf858bac452b05273afdbeda511c1638de8ff` | ✅ |
| `oryn-untracked-files.tar.gz` (978,479 bytes) | `44f3c8836e76be8b88dfafe9e77f7282733788031cfbc9ee065b3d5e6477e2de` | ✅ |
| `refs-manifest.txt` (51,675 bytes) | `62cd04942a8e09d1328181937768774c37e4b0d9e843d4f4583b6219d3d9fd9c` | ✅ |

Had any hash failed to match, or any file been missing, no deletion/removal/branch work would
have proceeded. All three matched, so the cleanup proceeded.

## 1. Git state — start and end

| | Start | End |
|---|---|---|
| `main` | `f7af9140f1255b2436217f1bf8d8fa5a80abd037` | `f7af9140f1255b2436217f1bf8d8fa5a80abd037` (**untouched**) |
| `origin/main` | `f7af9140…` | `f7af9140…` (**untouched**, never pushed to) |
| Local branches | 26 (incl. `main`) | 26 (**none deleted** — only worktrees removed; branches are the safety net) |
| Remote branches | 242 | 242 (**untouched** — none deleted, none pushed to) |
| Worktrees | 23 | 4 (`main` + 3 explicit founder-decision worktrees) |
| Untracked files in main worktree | 54 | **0** — all 54 committed or, for `output/`'s PDF, moved to a backup `artifacts/` folder (§3.4); `output/` no longer exists in the working tree at all |
| New branch | — | `oryn/cleanup-integration-2026-08-29`, 367 commits ahead of `main` as of this session's closing commit (exact SHA in the session's final chat message, not embedded here — a commit cannot contain its own hash) — **local only, never pushed to `origin`** (see the backed-up-on-origin correction in §2.3) |
| Open PRs | #150, #155, #157 | unchanged — not merged, not closed, not commented on; **design content not engineering-reviewed** (§2.4, §7) |

`git status --porcelain` is empty at the end of this session — genuinely clean, not "clean except one untracked thing" (an earlier draft of this report said the latter about `output/`; that was self-contradictory, since an untracked file by definition means the working tree isn't clean — see §3.4).

`main` was never checked out for writing during this session except to read it as the merge
base; every commit made lives on `oryn/cleanup-integration-2026-08-29` or on individual
feature branches (see §3).

## 2. Full inventory

### 2.1 Local branches (26) — classification

Classification method: **not** by branch name or commit message. Every branch was checked two
ways — three-dot ancestry diff (`main...branch`, for ahead/behind) **and** two-dot tip-content
diff (`main branch`, for "is the actual file content already the same," which is what
correctly detects squash-merged branches that ancestry alone would report as "unmerged").

| Branch | Ahead/Behind main | Class | Worktree | Reasoning |
|---|---|---|---|---|
| `main` | — | — | kept | current branch |
| `oryn/gate2-ai-counselor` | 23 / 6 | **merged-equivalent** | removed (was clean) | Its work was absorbed into `gate2-integration-2026-08-24`, which is byte-identical to `main`'s tip (see below) and matches `main`'s #167 commit. Residual tip-diff is pre-UI-Redesign-V3 staleness, not unmerged content — confirmed by tracing 5 files it shows as "added" (`score-ring.tsx`, `advisor-context-strip.tsx`, etc.) to their actual deletion commit, `01d1272` (#163), i.e. main deliberately renamed/restructured them after this branch's base point. |
| `oryn/gate2-integration-2026-08-24` | 3 / 1 | **merged-equivalent** | none existed | `git diff main oryn/gate2-integration-2026-08-24` — **zero files differ**. Byte-identical to `main`'s current tip. This is the branch PR #167 was squash-merged from. |
| `oryn/dashboard-hero-false-empty-state` | 1 / 2 | **merged-equivalent** | none existed | Its own last commit subject (`fix(dashboard): a rich profile could still see "nothing recorded"`) is a verbatim match to `main`'s #166 merge commit title. |
| `oryn/ui-redesign-v3` | 22 / 6 | **merged-equivalent** | dead worktree record only (pruned, §3.3) | Matches `main`'s #163 by scope and the same file-rename trace as gate2-ai-counselor above. |
| `oryn/ui-redesign-v3-followon` | 4 / 3 | **merged-equivalent** | none existed | Matches `main`'s #165 by scope (aggregate-score removal, scoring ceilings — exactly #165's stated theme). |
| `oryn/s1-university-photos` | 4 / 0 | **evidence-archive** | removed after merge | Pure research/verification data, 0 app-code files touched (verified via `--diff-filter=A` audit across all 17 fleet branches — zero hits under `app/`, `lib/`, `features/`, `components/`, `supabase/migrations/`). |
| `oryn/s2-crosscheck-official-tier` | 3 / 0 | **evidence-archive** | removed after merge | ditto |
| `oryn/s2-needs-review-crosscheck` | 1 / 0 | **evidence-archive** | removed after merge | ditto |
| `oryn/s3-photos-agent-a` | 9 / 0 | **evidence-archive** | removed after merge | ditto |
| `oryn/s3-photos-agent-b` | 16 / 0 | **evidence-archive** | removed after merge | ditto |
| `oryn/s3-review-of-a` | 6 / 0 | **evidence-archive** | removed after merge | ditto |
| `oryn/s3-review-of-b` | 9 / 0 | **evidence-archive** | removed after merge | ditto |
| `oryn/s3-university-photos` | 4 / 0 | **evidence-archive** | removed after merge | ditto |
| `oryn/s4-university-photos` | 4 / 0 | **evidence-archive** | removed after merge | ditto (worktree also had a stray `node_modules/`, discarded — see §3.2) |
| `oryn/s5a-summer-academic-enrichment` | 27 / 0 | **evidence-archive** | removed after merge | ditto |
| `oryn/s5b-research-mentored-internships` | 11 / 0 | **evidence-archive** | removed after merge | ditto |
| `oryn/s6-competitions-research` | 30 / 0 | **evidence-archive** | removed after merge | ditto |
| `oryn/s7-other-high-value-opportunities` | 14 / 0 | **evidence-archive** | removed after merge | ditto |
| `oryn/s8-qa-gate` | 8 / 0 | **evidence-archive** | removed after merge | ditto |
| `oryn/university-photos-s2` | 3 / 0 | **evidence-archive** | removed after merge | ditto |
| `oryn/research-freeze-ceo-control-tower` | 17 / 0 | **evidence-archive** | removed after merge | ditto |
| `oryn/research-freeze-cfo-throughput` | 178 / 0 | **evidence-archive** | removed after merge | ditto |
| `oryn/asia-programmes-research` | 1 / 261 | **founder-decision** | **kept** | 261 commits behind `main`. Its distinctive added content (`lib/universities/duplicate-supersessions.json`, `scripts/resolve-university-duplicates.ts`) implements a duplicate-resolution mechanism that `main` itself already solved differently and explicitly retired (`git log` shows these exact paths deleted by `main` commits `8247819 fix: product-visible duplicate universities (P0)` then `0b78387 refactor(universities): scripts/ consumers + retire the JSON generation step`). Whether this branch holds real unmerged Asia-region research data underneath that stale mechanism was not conclusively resolved — needs a human familiar with the ASIA-PROGRAMMES lane. |
| `oryn/subject-classification` | 3 / 261 | **founder-decision** | **kept** | Same retired shared mechanism as above, plus one distinct asset: `supabase/migrations/0060_subject_taxonomy_expansion.sql` (subject-taxonomy vocabulary-gap fix, "63.3% 'other'" per its own commit message) + a dry-run script. Real migration-number collision with `main`'s actual `0060` (different, unrelated migration) — defensively renumbered to `0061` in this branch only (commit `d0b7c8f`, not applied, not merged anywhere) purely to remove the filename collision; this does **not** decide whether the migration should ship or what number it should really take once reconciled with `main`'s current `0061`/`0062` (which are also different, unrelated migrations). |
| `oryn/superseded-programs-retirement` | 2 / 261 | **founder-decision** | **kept** | Same retired shared mechanism, plus `supabase/migrations/0060_university_programs_supersession.sql` (proposal to retire 160 superseded rows) and a handoff doc — also collides on `0060`, not renumbered (left for founder/Codex to decide together with subject-classification's collision). **Also**: this worktree had 23 files of *uncommitted* working-directory edits touching shared logic (`lib/universities/canonical.ts`, `lib/deadlines/scan.ts`/`upcoming.ts`, `lib/search/index.ts`, `lib/entities/resolve.ts`/`search.ts`, `lib/ai/student-context.ts`, several ingestion scripts, `types/database.ts`, and university/application page files) — committed only to prevent loss (`7769277`), **not reviewed, not verified correct**, looks like an incomplete attempt to reconcile 261 commits of drift. Treat this commit as raw material, not as reviewed work. |

### 2.2 Worktrees (23 examined)

Every worktree was checked individually for uncommitted/untracked changes before any removal
was considered — none were removed while dirty.

- **1 dead record**: `.../scratchpad/wt-ui-v3` (branch `oryn/ui-redesign-v3`) — `git worktree
  list --porcelain` flagged it `prunable: gitdir file points to non-existent location` (the
  directory, a prior session's temp scratchpad, no longer exists). Nothing to lose — the
  directory was already gone. Cleaned with `git worktree prune`. The branch itself is
  untouched (see gate2/ui-redesign-v3 rows above).
- **7 worktrees had real uncommitted content**, all found, all preserved by committing onto
  their own branch **before** any removal (see §3.1 for the exact commits):
  `asia-programmes` (1 untracked research file), `s1-university-photos` (2 review JSONs),
  `s2-needs-review-crosscheck` (4 crosscheck outputs), `s4-university-photos` (3 registry
  files — plus an untracked `node_modules/`, deliberately excluded, see §3.2),
  `s7-other-opportunities` (2 files), `s8-qa-gate` (4 files), `subject-classification` (1
  already-staged migration rename).
- **1 worktree had substantial uncommitted app-code edits**: `superseded-programs` (23
  files) — preserved via commit but explicitly flagged unverified (§2.1, §5).
- **14 worktrees were already clean** on inspection: `gate2-ai-counselor`,
  `s2-crosscheck-official`, `s3-photos-agent-a`, `s3-photos-agent-b`, `s3-review-of-a`,
  `s3-review-of-b`, `s3-university-photos`, `s5a-summer-academic-enrichment`,
  `s5b-research-mentored-internships`, `s6-competitions`, `university-photos-s2`,
  `cfo-throughput`, `research-ceo-control-tower`, and (after the safety-commits above)
  `s4-university-photos`.

**18 worktrees removed** (all merged-equivalent or evidence-archive branches, fully secured
first): `gate2-ai-counselor`, `s1-university-photos`, `s2-crosscheck-official`,
`s2-needs-review-crosscheck`, `s3-photos-agent-a`, `s3-photos-agent-b`, `s3-review-of-a`,
`s3-review-of-b`, `s3-university-photos`, `s4-university-photos`, `s5a-summer-academic-enrichment`,
`s5b-research-mentored-internships`, `s6-competitions`, `s7-other-opportunities`, `s8-qa-gate`,
`university-photos-s2`, `cfo-throughput`, `research-ceo-control-tower`. Each via plain
`git worktree remove <path>` (no `--force` on any branch/commit content — the one `--force`
situation, `s4-university-photos`'s stray `node_modules/`, was resolved by deleting just that
regenerable directory first, then removing the worktree cleanly — see §3.2).

**4 worktrees remain**: `main` (primary), `asia-programmes`, `subject-classification`,
`superseded-programs` — all three founder-decision, kept exactly as-is (uncommitted content
now safety-committed, nothing further changed).

**No local branches were deleted** — worktree removal only detaches the working-directory
checkout; every branch (including the 18 whose worktrees were removed) still exists and is
fully intact as a rollback point (see §8).

### 2.3 Remote branches (242) — inventory only, none touched

- **106 of 242** have an empty three-dot diff against `main` (fully ancestor-merged already —
  ordinary merge/fast-forward, not squash) — already safely reflected in `main`'s history,
  needed no action.
- **216 of 242** have no corresponding local branch or worktree in this repo at all — remote-only,
  never checked out here. Not deep-classified individually (out of this task's scope, and
  remote branches must not be modified regardless of classification) — inventoried by name,
  last-commit date, and ahead/behind only, in the working data this report was built from.
- **All 26 local branch names have a remote counterpart** — every local branch had been pushed
  to `origin` at least once *as of session start*. **Correction (Codex review):** this does
  **not** mean everything is backed up on `origin` right now. This session added new commits on
  top of 8 of those branches (§3.1) — including the 3 founder-decision safety-commits
  (`1caeb7e5`, `d0b7c8f0`, `77692771`) — and none of those new commits were pushed anywhere.
  Only each branch's **pre-session** tip is protected by being on `origin`; the new commits'
  only protection is local: the pre-cleanup bundle (§0) does not contain them (it was captured
  before this session started), so a dedicated **post-cleanup bundle** was made instead — see
  §3.4 and §8.
- **Zero remote branches were deleted, force-pushed, or otherwise modified.**

### 2.4 Open PRs — evaluation (not merged, not closed, not commented)

All three are small, single-commit, docs-only, and `mergeable: MERGEABLE` per `gh`:

| PR | Branch | Content | Verdict |
|---|---|---|---|
| [#150](https://github.com/akirik28/ORYN/pull/150) | `oryn/reverify-doc-refresh` | 1 commit, adds `docs/opportunity-reverification-job-design-2026-08-23.md` | **Usable as-is** — recommend merging independently via its own PR. |
| [#155](https://github.com/akirik28/ORYN/pull/155) | `oryn/currency-schema-package` | 1 commit, adds `docs/currency-schema-package-2026-08-24.md` | **Usable as-is** — ditto. |
| [#157](https://github.com/akirik28/ORYN/pull/157) | `oryn/publication-venue-package` | 1 commit, adds `docs/publication-venue-category-package-2026-08-23.md` | **Usable as-is** — ditto. |

None of the three were cherry-picked into the integration branch. Each is a clean, isolated,
mergeable unit already sitting in the normal PR-review path — duplicating their single commit
into the integration branch would just create two independent paths for the same content to
land, with no benefit. Recommend merging each PR directly, independently, whenever Codex/founder
reviews the design proposals inside them (this cleanup did not evaluate the *design* content of
those docs — only their git mechanics).

Their apparent large diff against current `main` (131–138 files) is the same staleness artifact
described in §2.1 (all three branch from a pre-UI-Redesign-V3 `main`) — each PR's **actual**
unique contribution is exactly one new doc file plus its own single commit; verified via
`git log --oneline main..<branch>` (one commit each) and `--diff-filter=A` (one new file each).

## 3. What was preserved / committed, in order

### 3.1 Worktree safety-commits (8, each on its own original branch — none touch `main` or the integration branch)

| Branch | Commit | What |
|---|---|---|
| `oryn/asia-programmes-research` | `1caeb7e` | 1 untracked HKU research file |
| `oryn/s1-university-photos` | `c72fc7e` | 2 untracked review registry JSONs |
| `oryn/s2-needs-review-crosscheck` | `bf67155` | 4 untracked crosscheck output files |
| `oryn/s4-university-photos` | `3af07cc` | 3 untracked registry gap-analysis files (`node_modules` excluded) |
| `oryn/s7-other-high-value-opportunities` | `83e71d6` | 2 untracked photo-corpus files |
| `oryn/s8-qa-gate` | `a988fdd` | 4 untracked QA continuation/gap-closure files |
| `oryn/subject-classification` | `d0b7c8f` | Already-staged migration rename `0060→0061` (collision-avoidance only, see §2.1) |
| `oryn/superseded-programs-retirement` | `7769277` | 23 files of uncommitted WIP edits — **preserved unverified**, see §2.1/§5 |

### 3.2 The one forced action, and why it wasn't `--force`

`s4-university-photos`'s worktree had a stray, untracked `node_modules/` (confirmed via
`git check-ignore` to not even match the repo's own `node_modules/` gitignore pattern in that
specific worktree — cause not investigated further, immaterial). `git worktree remove` refused
without `--force`. Rather than force a git operation the task explicitly disallows, the
directory was deleted directly (`rm -rf` on exactly `node_modules/`, nothing else — a
regenerable dependency cache, not user work, no different in kind from deleting a `.next/`
build directory) and the worktree removal then succeeded cleanly with no force flag.

### 3.3 Integration branch (`oryn/cleanup-integration-2026-08-29`, branched from `main` @ `f7af9140`)

**17 evidence-archive branches merged** with `git merge --no-ff` (preserves full commit
history/attribution rather than squashing):
`s1-university-photos`, `s2-crosscheck-official-tier`, `s2-needs-review-crosscheck`,
`s3-photos-agent-a`, `s3-photos-agent-b`, `s3-review-of-a`, `s3-review-of-b`,
`s3-university-photos`, `s4-university-photos`, `s5a-summer-academic-enrichment`,
`s5b-research-mentored-internships`, `s6-competitions-research`,
`s7-other-high-value-opportunities`, `s8-qa-gate`, `university-photos-s2`,
`research-freeze-ceo-control-tower`, `research-freeze-cfo-throughput`.

9 of the 17 conflicted — **always in exactly one place**, `docs/ORYN_WORKSTREAMS.md`, where each
research lane independently appended its own status row at the same insertion point in a shared
tracking table. Verified this was the actual shape every time (exactly one conflict region, in
exactly that one file, incoming side a clean new table row) before resolving; resolution was
always "keep both rows" (strip conflict markers, concatenate), never "pick one side" — confirmed
row-by-row afterward that both sides' content survived.

**Correction (Codex review):** "keep both rows" is correct when two *different* lanes each
contribute one row — true for 8 of the 9 conflicts. The 9th was different: `s3-university-photos`,
`s3-photos-agent-a`, and `s3-photos-agent-b` are one lane (a parent worktree + 2 sub-agents) that
updated its **own** `PHOTOS-S3` status row 3 times as its work progressed (setup → boundary
correction → final complete). Because each of those 3 branches conflicted against the integration
branch in turn, "keep both sides every time" mechanically accumulated all 3 sequential snapshots
as separate table rows instead of recognizing them as one row evolving over time — a real defect,
not a stylistic quibble (an intermediate 175-institution/`ACTIVE`/0-done snapshot sitting in the
table alongside the final 253-institution/`COMPLETE` one is actively misleading, not just
redundant). Fixed by re-inspecting all 3 `PHOTOS-S3` rows directly: confirmed the final row's own
prose already narrates the earlier boundary correction in full (nothing unique was only in the
dropped rows), then deleted the 2 superseded snapshots, keeping only the final `**COMPLETE.**` row.
Verified afterward: exactly 1 `PHOTOS-S3` row remains, lane-row count dropped from 75 to 73, and a
full re-scan of every other lane label in the table found no other multi-row duplication introduced
by any of the 9 conflict resolutions (`RES-V2` appears twice, but that duplication is byte-identical
and was **already present in `main` before this session touched the file** — confirmed via
`git show main:docs/ORYN_WORKSTREAMS.md`, out of scope here).

**4 commits added the 54 untracked files** from the main worktree, split by category (not one
giant commit):
- Research batches (`data/research/opportunities/*`, 39 files, cr1_*/summer_* series)
- The reviewed SQL dry-run (`data/research/sql-dry-runs/university-requirements/
  retrieved_at_backfill_2026-08-23.sql`) — read in full; well-sourced (26 rows traced 1:1 to
  source JSONL `researched_at` dates), explicitly idempotent, its own header states **not yet
  applied, pending CEO approval**. Preserved as a file only — not executed, Supabase untouched.
- 4 doc/report files (AI handoff report, CEO morning report, a JSON evidence export, a
  competitor product-inspiration audit)
- 8 scoped batch apply/diagnose scripts (`scripts/apply-*`, `scripts/diagnose-*`) — read the
  header of one in full to confirm intent; each requires `SUPABASE_SECRET_KEY` and writes to
  Supabase **only when a human runs it directly** — preserved as source, **none executed**.

**1 fix commit**, made necessary by the merges themselves (see §4): a research-data file that
happens to be `.ts` had a real `tsc` error and an unused-var lint warning; both come from the
same one-line cause (a type reference with no definition in scope). Fixed with a local,
self-contained type declaration — zero behavior change, doesn't touch the real production
script it mirrors.

### 3.4 Codex review corrections (same day, applied directly to the working tree before the final commit)

**`output/` — no longer left untracked.** The original session left `output/.DS_Store` and
`output/pdf/ORYN-Kapsamli-Durum-ve-AI-Devir-Raporu-2026-08-28.pdf` untracked, calling this
"deliberate" — Codex correctly rejected that framing: an untracked file *is* an unclean working
tree, full stop, regardless of intent. Fixed properly instead of hidden: the PDF (a real
handoff-report rendering, not throwaway) was moved to
`/Users/adasarpkirik/Desktop/Founder/ORYN-backups/2026-08-29-pre-cleanup/artifacts/`, its
SHA-256 recorded before and after the move (identical:
`1274ad2cb17e48760544e4b0b40deb098a15f9760ab4651fa01b65c273f333b8`, `artifacts/CHECKSUMS.txt`
alongside it), `.DS_Store` deleted (macOS junk, never worth keeping), and the now-empty
`output/` directory tree removed entirely — it doesn't exist in the working tree any more, so
there's nothing for `git status` to report and nothing added to `.gitignore` to hide it.

**`scripts/acquire-university-images.ts` — reverted out of the integration branch.** The
`oryn/s4-university-photos` merge (§3.3) turned out to modify this real, Supabase-writing
production script — a genuine gap in the original audit, which only checked *added* files
(`--diff-filter=A`) across the 17 evidence-archive branches, not *modified* ones, and so missed
this. The change itself (commit `b908f17` on `s4-university-photos`, still fully intact there)
adds an opt-in `--range` CLI flag so the research-freeze fleet's S1–S4 photo shards can be
defined by position in the script's own existing `id ASC` ordering — purely additive when
unused (new code lives inside an `if (rangeArg)` branch, default behavior is byte-identical),
type-safe, and was genuinely used to produce shard boundaries during the research week. But it
is not *required* for the already-merged evidence data to stand on its own — the shard-boundary
method is already documented in prose inside `docs/ORYN_WORKSTREAMS.md` (§3.3 above), which this
integration branch already carries — and shipping an unreviewed change to a script that writes
to Supabase isn't appropriate for a cleanup/consolidation session to wave through, however small
and well-written. Reverted with `git checkout main -- scripts/acquire-university-images.ts`, so
the file is now byte-identical to `main`; the capability isn't lost, it's exactly where it
belongs — sitting on `oryn/s4-university-photos`, available for Codex to review and merge
through a normal PR whenever wanted (also noted in §6).

**`docs/ORYN_WORKSTREAMS.md` — the 3-row `PHOTOS-S3` duplication described in §3.3 above.**

**`docs/ORYN-AI-DEVIR-RAPORU-2026-08-28.md` — trailing whitespace.** `git diff --check
main...HEAD` failed on 9 lines using Markdown's two-trailing-space hard-line-break convention.
Stripped mechanically. **First attempt was wrong and was caught before committing**: macOS's
BSD `sed` does not treat `\t` inside a `[ \t]` bracket expression as a tab character — it reads
it as the three literal characters space, backslash, and `t`, so `sed 's/[ \t]*$//'` silently
ate the trailing letter **`t`** off of every line ending in one (`` ```text `` →  `` ```tex ``,
"Deneyimi kaydet" → "Deneyimi kayde", "özel not" → "özel no", 8 words corrupted across the
file). Caught by reviewing the actual diff rather than trusting the command; reverted
(`git checkout HEAD -- docs/ORYN-AI-DEVIR-RAPORU-2026-08-28.md`) and redone with the portable
`sed 's/[[:space:]]*$//'`, then the diff was re-checked line-by-line to confirm every changed
line differs *only* in trailing whitespace. `git diff --check` against the working tree is now
clean (§4). One thing this document's own (untouched) text incidentally confirms: the
3 test failures it recorded from 2026-08-28 (`data/research/university-requirements/
retrieved_at_backfill_2026-08-23.sql` breaking `classifyCorpusFiles` by sitting inside a JSONL
corpus directory) are the exact defect the file's later move to
`data/research/sql-dry-runs/university-requirements/` — preserved by this session, §3.3 above —
fixes; independent confirmation that the move was correct, not incidental.

**Net result** (measured against the working tree immediately before the final correction
commit, i.e. what that commit's own diff represents): 264 files changed,
**+57,833 / −0** (263 new, 1 modified, 0 deleted) —
every substantive change against `main` is still purely additive; the only "modified" file
left is `docs/ORYN_WORKSTREAMS.md` (the dedup fix above), now that
`scripts/acquire-university-images.ts` has been reverted to match `main` exactly. Full-diff
secret scan (API key patterns, private key headers, raw JWTs, Supabase secret-key assignment)
re-run after every fix above, clean throughout.

### 3.5 Post-cleanup bundle (new, in addition to the §0 pre-cleanup bundle)

The original §0 bundle was captured *before this session started* — it does not, and cannot,
contain anything this session committed, including the 3 founder-decision safety-commits
(`1caeb7e5`, `d0b7c8f0`, `77692771`) that exist only on local branches and were never pushed
(§2.3). Codex flagged this as an unbacked-up gap. Fixed with a second, independent bundle taken
*after* this session's final commit:

`/Users/adasarpkirik/Desktop/Founder/ORYN-backups/2026-08-29-post-cleanup/oryn-post-cleanup-all-refs.bundle`
— `git bundle create ... --all` (same method as the original §0 bundle: every ref, not a
hand-picked subset), so it necessarily contains `main`, `oryn/cleanup-integration-2026-08-29`
at its final tip, all 26 pre-session local branches, and specifically the 3
founder-decision branches at their new (safety-committed) tips. Verified with `git bundle
verify` and by independently confirming, commit-by-commit, that `1caeb7e5`, `d0b7c8f0`, and
`77692771` are each reachable inside the bundle — not just that the branch names are listed.
Alongside the bundle in that same folder: the verification command's output, a refs manifest
(every ref + its SHA at bundle-creation time, same format as §0's `refs-manifest.txt`), a
SHA-256 manifest for every file in the folder, and a copy of the PDF artifact from §3.4 with
its checksum. Exact verification transcript and all hashes are in this session's final chat
message rather than duplicated here.

## 4. Quality gates — all green

Ran on `oryn/cleanup-integration-2026-08-29` after all merges/commits above, node via the
project's existing `fnm` toolchain:

**First pass** (before Codex's review):

| Gate | Result | Detail |
|---|---|---|
| `npm run lint` | ✅ 0 errors, 0 warnings | Found 1 warning first pass (unused const in a research-data `.ts` file introduced by the `s2-crosscheck-official-tier` merge) — fixed, re-ran clean. |
| `npm run typecheck` | ✅ 0 errors | Found 1 error first pass, same file/cause as above (`Cannot find name 'ManualOverride'`) — fixed, re-ran clean. |
| `npm run test` | ✅ **167 test files, 2,479 tests, all passed** | Matches the expected baseline exactly. 16.37s. |
| `npm run build` | ✅ succeeded | `next build`, Turbopack — the anticipated Turbopack port-binding environment limitation did not occur this run; build completed cleanly on the first attempt. **41 routes** (14 static, 27 dynamic). |
| Secret scan | ✅ clean | Full `main`→integration diff + every worktree's uncommitted content. |
| Git status | ⚠️ **not actually clean** | `?? output/` — reported as "deliberate" at the time, which Codex correctly called a contradiction (see §3.4). Fixed in the second pass. |

The typecheck error was caused by this cleanup's own merge, so it was this cleanup's
responsibility to fix, and it was — a minimal, isolated, one-file fix (commit `d104c95`).

**Second pass** (Codex's review corrections, §3.4, this same session's closing commit):

| Gate | Result | Detail |
|---|---|---|
| `git diff --check main...HEAD` | ✅ 0 errors | 9 trailing-whitespace lines in `docs/ORYN-AI-DEVIR-RAPORU-2026-08-28.md`, fixed (§3.4). |
| `npm run lint` | ✅ 0 errors, 0 warnings | Re-run after all fixes. |
| `npm run typecheck` | ✅ 0 errors | Re-run after all fixes. |
| `npm run test` | ✅ **167 test files, 2,479 tests, all passed** | Re-run after all fixes — unchanged. |
| `npm run build -- --webpack` | ✅ succeeded | Explicit Webpack production build (not Turbopack) run at Codex's request, to actually exercise the fallback path the original task anticipated rather than rely on Turbopack alone having worked. **41 routes**, same route list as the Turbopack build. |
| `git status --porcelain` | ✅ **empty** | Genuinely clean — no untracked files, nothing uncommitted, `output/` no longer exists. |
| Secret scan | ✅ clean | Re-run across every file touched in this correction pass. |
| Post-cleanup bundle verify | ✅ | §3.5 / §8. |
| 3 founder-decision commits present in bundle | ✅ `1caeb7e5`, `d0b7c8f0`, `77692771` | §3.5 / §8. |

## 5. Supabase — read-only report, nothing applied, nothing changed

Project `qtcvcflzxbuagvvwahhu`. Per the task's explicit boundary, no migration was applied, no
data written, no policy changed — everything below is `list_migrations`/`get_advisors` output,
read-only.

### 5.1 Migration drift (confirmed, with specifics — not previously itemized)

**66 local migration files** (`0001`–`0065`) vs **46 entries in the live tracked-migration
ledger**. Cross-referenced by name (not just count):

- `0001`–`0024` collapse into a single ledger baseline entry (`full_schema_through_0024`) —
  expected, a documented consolidation, not drift.
- `0025`–`0047` all match a live ledger entry by name. One pre-existing local numbering quirk
  noted in passing: `0020_requirement_evaluation.sql` and
  `0020_target_university_null_program_dedup.sql` share the number `0020` — harmless (both
  clearly applied), not something this cleanup touched.
- **`0048_profile_view_visibility_guard`, `0057_university_program_kilavuz_kodu`,
  `0058_social_posts`, `0059_schema_gaps_2026-08-22` — no matching ledger entry.** The ledger
  jumps straight from `0047_structured_eligibility_facts` to
  `0060_opportunity_country_eligibility_confirmed_open`, applied 27 seconds apart — these 4
  files were either applied through an untracked path (e.g. direct `execute_sql`, not the
  standard migration flow) or never applied at all. Worth Codex/founder confirming which,
  directly against the schema.
- **`0061`–`0065` (5 files) — no matching ledger entry at all**, and by name every one of them
  is security/integrity-guard-shaped: `public_profiles_require_authenticated`,
  `profiles_guard_protected_columns`, `guard_computed_score_columns`,
  `message_reports_verify_reported_user`, `close_insert_forgery_six_tables`. These read as the
  most recent local work and the most likely to be genuinely unapplied.
- **This directly correlates with a live advisor finding** (§5.2): `public.public_profiles` is
  flagged **ERROR**-level "Security Definer View" right now — `0061`'s name strongly suggests
  it was written to fix precisely that, but doesn't appear to have shipped.

### 5.2 Security advisors (as of this session, unfixed — separate work item per task scope)

- **1 ERROR**: `public.public_profiles` view has `SECURITY DEFINER` — enforces the view
  creator's permissions/RLS instead of the querying user's. (See migration-drift note above.)
- **22 INFO** (`rls_enabled_no_policy`): RLS is on but no policy exists. Split into two groups —
  9 are `_backup_*` tables (one-off backup snapshots from recent research passes, e.g.
  `_backup_edinburgh_osr_2026_08_22`) where "no policy" may be intentional (nothing should
  read them via the API) but is worth an explicit decision rather than silence; 13 are live
  tables (`canonical_entity_merges`, `entity_locations`, `entity_relationships`,
  `entity_verification_queue`, `deadline_research_queue`, `requirement_research_queue`,
  `program_research_queue`, `external_sync_jobs`, `global_university_discovery_queue`,
  `provider_health`, `product_events`, `qs2027_import_staging`,
  `university_profile_verification_queue`) — mostly internal/research-pipeline tables, but
  each should get either a real policy or a documented "intentionally admin-only" note.
- **3 WARN**: `pg_trgm`/`unaccent` extensions installed in the `public` schema (should move to
  a dedicated schema); `is_blocked_between()` is `SECURITY DEFINER` and callable by both `anon`
  and `authenticated` roles via RPC — worth confirming that's intentional.
- **1 WARN**: leaked-password protection (HaveIBeenPwned check) is disabled in Auth settings.

### 5.3 Performance advisors (112 total, unfixed — separate work item)

Dominated by **`auth_rls_initplan`** (~60 instances — RLS policies calling `auth.uid()`/similar
per-row instead of once per query, a standard Postgres RLS performance pattern), plus
**unindexed foreign keys** (~22), **unused indexes** (~21), and **tables with no primary key**
(~9). Full detail available via `get_advisors(type: "performance")` on this project — not
reproduced in full here since it's out of this cleanup's scope and the raw output is ~99K
characters.

## 6. Founder-decision items — explicit list

Nothing in this list was resolved by this session. Each needs a person who owns the relevant
lane or the schema.

1. **`oryn/asia-programmes-research`** — real work exists on this branch; whether any of it is
   still wanted (given its core mechanism is superseded, per §2.1) needs someone who knows the
   ASIA-PROGRAMMES lane's actual intent.
2. **`oryn/subject-classification`**'s migration `0061_subject_taxonomy_expansion.sql` — a
   plausibly-still-valuable fix (63.3% "other" vocabulary gap), defensively renumbered to avoid
   a filename collision, but not reconciled with 261 commits of drift or reviewed for
   correctness against the current schema.
3. **`oryn/superseded-programs-retirement`**'s migration
   `0060_university_programs_supersession.sql` (retire 160 rows) — same caveat, plus that
   branch's 23-file uncommitted-WIP commit (§2.1) needs real review, not just preservation.
4. **Migration ledger gaps**: `0048`, `0057`–`0059`, `0061`–`0065` (§5.1) — confirm applied,
   partially applied via an untracked path, or genuinely pending.
5. **`public_profiles` SECURITY DEFINER (ERROR-level)** and the broader security/performance
   advisor list (§5.2, §5.3) — a dedicated security/migration pass, not a cleanup-session fix.
6. **The 3 open PRs** (§2.4) — ready to merge independently; needs someone to actually review
   the *design* content (this session only checked their git mechanics).
7. **216 remote-only branches** (§2.3) — inventoried, not individually classified; if disk/list
   clutter matters, a separate pass could triage them the same way this session triaged the 26
   local ones.
8. **`scripts/acquire-university-images.ts`'s `--range` flag** (§3.4) — a small, working,
   already-used enhancement sitting on `oryn/s4-university-photos` (commit `b908f17`),
   deliberately kept out of the integration branch since it wasn't this session's call to ship
   an unreviewed change to a Supabase-writing script. Worth a normal PR if Codex wants it.

## 7. What to merge into `main`

Recommend, in this order:
1. **`oryn/cleanup-integration-2026-08-29`** (this branch) — 264 files, purely
   additive (+57,833/−0), all quality gates green (§4). **Not pushed to
   `origin`, not merged into `main`** — this session's boundary was explicit and both remain
   true after Codex's review corrections. Ready for Codex's own review and merge whenever
   convenient; a local post-cleanup bundle exists as a backup (§3.5, §8) but nothing is
   protected on `origin` until someone actually pushes it.
2. **PRs #150, #155, #157** — independently, whenever their design content is reviewed.
   **Explicitly**: this session evaluated only their *git mechanics* (clean, single-commit,
   `mergeable: MERGEABLE`) — nobody has engineering-reviewed what the 3 docs inside them
   actually propose. "Usable as-is" in §2.4 means "safe to merge without a git conflict," not
   "approved to ship."

Nothing else from this session needs a path into `main` — the 3 founder-decision branches
intentionally have no integration-branch presence pending the decisions in §6.

## 8. Rollback

- **Full pre-cleanup state** (before this session touched anything):
  `/Users/adasarpkirik/Desktop/Founder/ORYN-backups/2026-08-29-pre-cleanup`
  (`oryn-all-refs.bundle` + `oryn-untracked-files.tar.gz` + `refs-manifest.txt`, hashes in §0;
  the PDF artifact from §3.4 was added to an `artifacts/` subfolder there afterward, but the
  original 3 bundle/manifest files and their hashes are untouched).
- **Full post-cleanup state** (everything this session did, including the founder-decision
  safety-commits and the final correction commit): `/Users/adasarpkirik/Desktop/Founder/
  ORYN-backups/2026-08-29-post-cleanup/oryn-post-cleanup-all-refs.bundle` (§3.5) — this is the
  one to restore from if anything from *this session specifically* needs recovering, since the
  §0 bundle predates it entirely.
- **This session's integration branch** is local-only and was never pushed — to fully discard
  it: `git branch -D oryn/cleanup-integration-2026-08-29` (safe: `main`/`origin/main` were never
  touched, so this is a no-op on everything else). It also now exists inside the post-cleanup
  bundle above, independent of the branch ref itself.
- **Any individual worktree safety-commit** (§3.1) can be undone on its own branch without
  affecting anything else, back to its pre-cleanup tip:

  | Branch | Pre-cleanup tip |
  |---|---|
  | `oryn/asia-programmes-research` | `f453f7aa9c95e6d3c87ed36a351d860a86c818a6` |
  | `oryn/s1-university-photos` | `7587e65b331104bee214dbd5d1b525c3d0a84bf9` |
  | `oryn/s2-needs-review-crosscheck` | `1dc4c65095cf768772149a99a70f89932249023d` |
  | `oryn/s4-university-photos` | `325996efe63cb4521faf972ee5b5bc466f58bdb0` |
  | `oryn/s7-other-high-value-opportunities` | `8c52fd0e4eec9f0adc2ede2f005788e90b6bc22a` |
  | `oryn/s8-qa-gate` | `78008899054ce59110365fdb6fa5a2850e9705d4` |
  | `oryn/subject-classification` | `28a1822b07797db091956a6e045164f43ec1f294` |
  | `oryn/superseded-programs-retirement` | `3fe3d8fce73ad84ad0d6e26b6191690d5fc3850a` |

- **Any removed worktree** can be recreated instantly since its branch is fully intact:
  `git worktree add .claude/worktrees/<name> oryn/<branch>`.
- **The pruned dead worktree record** (`wt-ui-v3`) cannot be un-pruned, but it pointed at a
  directory that no longer existed — there was nothing there to restore.

---
Generated by the 2026-08-29 cleanup/integration session. Questions about any specific
classification or commit should reference the exact commit SHAs above, all inspectable with
`git show <sha>` or `git log -p <sha>`.
