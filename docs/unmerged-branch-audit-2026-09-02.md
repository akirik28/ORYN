# The 137 unmerged branches — what's actually in them

Assigned after [[the AI cost-at-scale model]]: 137 remote branches, pushed by earlier fleets
between 2026-08-18 and 2026-08-29, never merged into `main`. The question set was explicit and
narrower than "which are stale" — nearly all 137 will read as stale by any simple test. The
question that justifies the hours is **"is there work here that was reported finished and never
landed."** This document answers that, not a mergeability audit.

**No branch was merged, deleted, or modified.** Everything below is a *candidate* — code and
data that exists and was never landed, not a recommendation to land it. Some of it is stale
enough (migration numbers now collide with content added since; file paths have moved) that
landing it as-is isn't possible without rework regardless of value.

## Method

1. **`git branch -r --no-merged origin/main`** — confirmed the count: still 137 (one 2026-09-02
   branch in the raw list is today's normal in-flight work, out of scope for this backlog; the
   136 in scope span 08-18–08-29 as stated).
2. **Patch-ID elimination**: `git cherry origin/main <branch>` for all 137. A branch where every
   commit is patch-equivalent to something already in `main`'s history — landed via squash,
   rebase, or independent re-authoring — is closed regardless of what `--no-merged` says, with
   zero reading required. **74 of 137 (54%) eliminated this way.**
3. **Duplicate-survivor check**: several of the 63 remaining shared suspicious naming or exact
   commit hashes with each other. Direct ancestry/patch-id comparison between pairs found
   **5 more that are pure duplicates of another survivor** (see below) — 58 distinct remain.
4. **Manual triage of the 58**: diffstat shape (file extensions, insertion counts) to separate
   docs-only from real code/data; ancestry checks on branches that looked related; a live
   database spot-check for the opportunity-research cluster; and one direct main-vs-branch file
   comparison that caught a **false survivor** patch-ID elimination missed (below). Not all 58
   got this depth — the long tail of small, single-purpose branches is characterized by shape
   in §5 rather than individually narrated. That's a scope choice, stated rather than hidden.

## 1. The two branches named up front

**`research-freeze-cfo-throughput` (178 commits — the single largest branch by commit count)**:
**not a finding.** All 178 commits touch exactly one file,
`data/research/registry/CFO_THROUGHPUT.md`, net **58 lines** relative to `main`. Reading the
commits confirms what the diffstat implies — this is a CFO fleet-monitoring checkpoint log
("CFO checkpoint 172: oryn-d5 confirmed unreachable, flagged to CEO immediately" ×94, plus
doc-formatting commits), not code or research output. Flagged by size alone originally, and
correctly — that's what made it worth checking rather than assuming.

**The S5/S6/S7 opportunity-research cluster**: **confirmed real**, and confirmed live, not just
by git content. `s6-competitions-research`, `s5a-summer-academic-enrichment`,
`s5b-research-mentored-internships`, and `s7-other-high-value-opportunities` together carry
**83 `.jsonl` files, ~1,447 structured records** (verification-batch files, some are
process/dedup registries rather than opportunity candidates — not all 1,447 are proposable
records, see §5). Sampled three `canonical_name` values from a `PRODUCTION_READY`/
`propose_new` record in `s6a_berkeley_stanford_math.jsonl` and queried the live `opportunities`
table directly:

| Record | Live DB result |
|---|---|
| Berkeley Math Tournament (BMT), in-person | **Not present** |
| Stanford Math Tournament Online (SMT Online) | **Not present** |
| Berkeley mini Math Tournament (BmMT), online | Present as `823e79e6` — bare placeholder: `organization: null`, `status: under_review` |

The third result matches the record's **own `duplicate_check` field exactly** — the research
already self-documented "THIS record corresponds to the existing under_review placeholder row
823e79e6 ... this is an ENRICHMENT of that specific row, not a net-new proposal" before this
audit checked it. The research is accurate and the live row is still exactly as thin as the
research found it. This is real, verified, unlanded work — 2 of 2 genuinely-new samples absent,
1 of 1 enrichment sample matching its own claim precisely.

The same cluster extends to the S1–S4/S8 university-photo verification branches (below) — same
campaign, same shape, larger in aggregate.

## 2. Confirmed duplicates — eliminate, don't double-count

Naming patterns (`ceo-rebase-*`) and matching commit hashes flagged these; ancestry checks
confirmed:

| Duplicate branch | Is a strict ancestor-subset of | Verdict |
|---|---|---|
| `ceo-rebase-ecw4` | `res-r3-eligible-countries-w4` | same tip, redundant push under a second name |
| `ceo-rebase-i2` | `res-i2-opportunity-ingestion` | same |
| `ceo-rebase-merge-log-3` | `merge-log-3` | same, 1 commit each |
| `gate2-integration-2026-08-24` | `gate2-ai-counselor` | all 3 commits patch-equivalent to gate2-ai-counselor's final 3 (independently re-authored, same content) |
| `ui-redesign-v3-followon` | `ui-redesign-v3` | all 4 commits patch-equivalent to 4 of v3's 22 |

These 5 are folded into their originals everywhere else in this document.

## 3. A false survivor — caught by hand, not by the patch-ID pass

`ceo-rebase-res-v1` looked like a major independent finding: 11 files, **3,310 insertions**,
including two real tooling scripts (`scripts/validate-research-records.ts`,
`scripts/audit-dedup-convention-drift.ts` with a 53-test suite) and 7 research-verification
docs. Patch-ID comparison against both `main` and `res-v1-validation` (the similarly-named
branch) showed **zero equivalent commits either way** — by the method in §0 it should have
counted as a second, distinct, sizeable finding.

Reading it directly instead: **every file path it touches already exists in `main`, populated
with newer content.** `scripts/validate-research-records.ts` exists in `main` today at 1,252
lines against the branch's 1,027 — `main`'s version is a superset that grew past this branch's
point independently. Every one of the branch's `docs/research/verification/v1-*.md` filenames
(`v1-2` through `v1-8`, `v1-lane-closeout`) already exists in `main`, alongside five more
(`v1-9` through `v1-13`) that came later. **The work this branch represents was re-landed under
the same paths by different exact commits — not preserved by git ancestry, but not missing
either.**

**This is a real limitation of patch-ID elimination, named rather than papered over**: it
catches content landed via squash/rebase (identical diff, different commit), but misses content
re-landed via re-authoring under the same file path (same subject matter, different exact
diff). §5's large-branch entries were each individually cross-checked against `main`'s current
file contents for this specific failure mode before being reported as real — `ceo-rebase-res-v1`
is the one candidate that failed the check, not the pattern.

## 4. Confirmed real, still open — needs a landing decision

**`gate2-ai-counselor` (23 commits, 105 files, 6,258 insertions) and `ui-redesign-v3`
(22 commits, 107 files, 6,452 insertions) are not two independent findings — they share a
common base.** Direct ancestry check: their merge-base is `b9b8848d`
("feat(profile): languages, skills taxonomy, and a scoring model that can be reached"), itself
several commits into both branches past their shared fork from `main`. Past that point they
diverge: `ui-redesign-v3` adds 2 more UI-polish commits; `gate2-ai-counselor` adds a much larger,
independent tail — bug fixes ("a successful reply never reached the screen without a manual
reload"; "a dimension at 94/100 was ranked and described as a gap") plus a "final report:
architecture verified, 2 real defects found and fixed." **Landing one makes the other's unique
tail small** (2 commits for v3, the gate2 fix-pass for the other) — but the *shared base* itself
(a profile scoring/languages/skills-taxonomy redesign, the bulk of both branches' size) is
real and confirmed still absent from `main`: `grep` for any skills/languages taxonomy in
`lib/scoring` today returns nothing, matching [[project_oryn_cv_import_skills_languages]]'s
"extracted-but-dropped since day one" finding from earlier this session. This is the largest
confirmed-real code gap in the backlog.

**`ui-simplification-v1` (31 commits, 49 files, 4,151 insertions)** — checked against both of
the above, **zero overlap either direction**. A third, fully independent large frontend branch,
earliest-dated of the three (08-21). Touches map/dashboard/opportunities-explorer parity and a
dev-seed profile fixture per its commit subjects.

**`bug1-rls-surfaces-3-4` (2 commits, real code+SQL)** — "message_reports let a student name an
innocent user as the accused" and "0064 missed a second forgery path via recommendation_id."
Specific, small, security-shaped, plausibly still live — this is the kind of finding this
audit exists to surface, not a docs artifact.

**`security-rls-hardening-2026-08-29` (4 commits, 15 files, most recent of the whole backlog at
08-29)** — mixed verdict, checked directly rather than assumed: its Storage-cleanup-on-deletion
proposal is **already superseded** — `lib/account/delete-storage.ts` exists in `main` today via
a different implementation path this branch doesn't touch, matching
[[project_oryn_data_rights_audit]]'s closed finding. But the branch also touches
`rate-limit-config.ts`, `settings/actions.ts`, `documents/actions.ts`,
`recommendation-actions.ts`, `admissions/persist.ts`, and two migrations
(`0066_guard_target_university_outlook_columns.sql`,
`0067_guard_achievement_evidence_status.sql`) — unrelated to the storage question, not checked
individually here, and **its migration numbers now collide**: `main` today has different,
already-applied `0066`/`0067` migrations, and is up to `0085`. Anything here needs renumbering
before it could apply regardless of content value — named as the concrete instance of "months-
old code against a codebase that has moved enormously."

**`res-i2-opportunity-ingestion` (5 commits, real code)** — "RULE-INGEST-003 monotonicity guard
+ DLOPP dry-run proof + dedup baseline," touches `lib/` and two SQL files, not just docs.

**Two independent fixes for what looks like the same bug**: `deadline-upcoming-date-filter`
and `feat1-university-deadline-upcoming-fix` both claim "a passed/expired deadline no longer
renders under Upcoming" and both touch the same file
(`app/(app)/universities/[id]/page.tsx`) — but one fixes it via `lib/deadlines/ingest.ts`, the
other via `lib/deadlines/lifecycle.ts`. Same symptom, different unlanded mechanism, from two
sessions that apparently never saw each other's work. Whoever picks this up should read both
before landing either, not merge both.

**`subject-classification`, `degree-level-cleanup`, `superseded-programs-retirement`,
`feat1-advisor-substrate`, `feat1-eligibility-silence-fix`** — each real code (+SQL for the
first two), each a specific, narrow, plausible fix per its own commit message. Not deep-verified
individually beyond diffstat shape; listed here rather than folded into the long tail because
each is concrete enough to act on directly if picked up.

## 5. The long tail — characterized, not individually narrated

The remaining ~35 survivors are dominated by two shapes:

**University-photo and research-verification campaigns** (`s1`–`s4`, `s8-qa-gate`,
`university-photos-s2`, `s2-crosscheck-official-tier`, `s2-needs-review-crosscheck`,
`res-v1-validation`, `res-v2-source-verification`, `res-i1-ingestion`, `res-r1-au-programmes`,
`res-r2-opportunity-deadlines`, `res-r3-eligible-countries-w3`/`w4`, `top5-requirements-2026-08-23`,
`opportunities-thin-2026-08-22`, `programme-dup-audit`,
`university-program-url-repair-2026-08-22`): large real data payloads (`s1-university-photos`
alone is 15,703 insertions across 8 JSON files), verified pairwise as **not overlapping each
other** (checked the pairs most likely to collide — different waves/agents of the same
campaign, all confirmed distinct by patch-ID). Same shape and same likely disposition as §1's
S5/S6/S7 finding: real, structured, self-auditing research output that plausibly never got
ingested. Not spot-checked against the live DB individually — the §1 sample stands as
representative evidence for the pattern, not proof for every file in this list.

**Small (1–4 commit) branches, almost entirely `.md`**: `asia-programmes-research`,
`basorg-org-status` (776 lines, one file — substantial as a document, not as code),
`currency-schema-package`, `merge-log-3`, `opportunities-placement-knowledge-audit` (456 lines),
`publication-venue-package`, `requirement-programme-linking-2026-08-22`,
`feat1-eligibility-design`, `feat1-eligibility-lane-closeout`, `feat1-territory-audit`,
`feat1-achievement-save`, `feat2-mvp-checklist-audit` (contains a specific named audit finding,
"Finding C, onboarding step-desync saves wrong data" — worth a read if anyone owns FEAT-2 again),
`ui-1-state-audit`, `programs-field-completeness` (SQL, self-flagged **"NOT APPLIED"** by its
own commit message, same honest-labeling convention as `degree-level-cleanup`'s migration).
These are workstream-tracking docs, handoff notes, and small audit findings — real in the sense
that someone did the work and wrote it down, but not code or data that "landed" would mean
applying. Lowest urgency of everything in this document; a future reader who needs the specific
finding in one of them can read the single file directly rather than the branch.

## What this document did not do

Did not deep-verify all 58 survivors to the depth of §4 — timeboxed per the original ask,
against a candidate count (58) much closer to "report the shape" than "read all of it." Did not
attempt to land, merge, or delete anything — every item above is a candidate, stated as one. Did
not live-DB-verify the university-photo/research-verification cluster beyond the one
representative sample in §1 — a real check against `university_photos`/similar tables for those
specific records would strengthen §5's first bucket the same way §1 is now strengthened, and is
the highest-value next increment if this backlog gets picked up again. Did not check the ~35
long-tail branches against each other for the kind of overlap §2/§3 found in the larger ones —
plausible given how many share prefixes, not ruled out.
