# Handoff — Counseling Intelligence Research

**Read this first if resuming this session cold.** This file is the live resumption state for
the `oryn/counseling-intelligence-research` branch/mandate. Update it at every checkpoint —
this exact scenario (a context compaction losing the in-conversation plan while the branch,
commits, and `docs/research/counseling-intelligence/00-overview.md` survived) already happened
once this session, and reconstructing intent from git archaeology cost real time. Don't let the
next resumption pay that cost again.

**Concurrent-session note (added by a second session sharing this working directory, checked in
without disturbing the progress table below — please don't re-sequence this note away):** this
mandate is being executed by more than one session at once against the same checkout — confirmed
directly (not assumed) by `git log` showing two independent, differently-authored commits for
`01-development-taxonomy.md` inside a five-minute window, plus this file and `02-*` already
existing, fully written, with `RULE-COUNSEL-` numbering through `033`, the first time this second
session went looking. To avoid a third rewrite-war on the same files: **this session is treating
`00-02` as owned by whichever session got there first (content verified good — full schema-level
grounding against actual migrations, not just types) and is picking up from `03-recommendation-
timing.md` onward, plus the entire `06-major-family-evidence/` tree**, minting new rules starting
at `RULE-COUNSEL-034` to avoid colliding with the existing sequence. If you are a session reading
this while `03` onward already shows progress below, **re-check `git log` before rewriting anything
this note claims — this note itself can go stale exactly the way the rest of this file can.**

**Update — this is genuinely a 3+ session situation, not 2 (confirmed via `git log`/`git branch -a`,
not assumed).** As of this checkpoint:

- `oryn/counseling-intelligence-research` (this branch, unsuffixed) has commits from **at least
  two** different sessions past the point above: `01`/`02` finalized + `rules.json`/`sources.json`
  (RULE-COUNSEL-001–033, then 901–902 added in a reconciliation pass against a *third* competing
  `01` draft at commit `51b1978` — see below) from the session writing this file, **and**
  `03-recommendation-timing.md` + `06-major-family-evidence/01`–`05` (computing,
  math/stats, physical sciences, life sciences, engineering) with `RULE-COUNSEL-034`–`044`+ from a
  *different* session (self-identified over cross-session messaging as socket `71534`, referred to
  here as "session 7" — never directly contacted by this session; observed only through commits
  landing on this shared branch). This branch also independently carries unrelated
  `docs/research/canonical-entity-intelligence/**` commits (`01`–`07`, a different mandate
  entirely, per `docs/ORYN_WORKSTREAMS.md`'s `Claude 1`/university-intelligence-spine
  ownership) — this branch is functioning as a shared scratch branch for multiple unrelated
  overnight research efforts tonight, not a single-purpose one.
- A **third** session (self-identified over cross-session messaging as socket `70081`, referred to
  here as "session 1") independently produced its own `01-development-taxonomy.md` at commit
  `51b1978` on this same branch before moving to an isolated worktree/branch,
  `oryn/counseling-intelligence-research-013956`, to write its own complete, independent set of
  the assigned docs — reachable at `RULE-COUNSEL-022` (branch-local, sequential, **not**
  coordinated with either this branch's `001-044+` sequence) as of session 1's last message to
  this session. Session 1 had, separately from this session, already agreed a "00–10 split" with
  session 7 that this session was not party to — the two agreements (this session's with session 1,
  and session 1's with session 7) were inconsistent with each other, discovered only because this
  session happened to notice session 7's commits landing on the shared branch.
- **No single session has full visibility into all the others.** This session has direct
  cross-session-message contact with session 1 only; session 7 is known only through its commits;
  there may be more parties neither this session nor session 1 is aware of. Do not trust this
  note's session count as exhaustive — verify current `git log`/`git branch -a`/`ListAgents` before
  relying on it.
- **Explicit, mutual decision (this session and session 1): do not attempt live cross-session
  numbering reconciliation.** Each session's `RULE-COUNSEL-###` sequence is internally consistent
  and sourced within its own branch/commits, but the sequences are **not** globally unique or
  ordered across branches (`001-033`+`901-902` here, `034-044`+ from session 7 on the same branch,
  `001-022`+ from session 1 on the `-013956` branch — three different numbering universes sharing
  a prefix). **Reconciling this into one global registry is real, non-trivial work explicitly
  deferred to a future integration pass** — do not assume it has been done, and do not attempt to
  silently renumber any session's existing rules to "fix" this.

## Mandate

Overnight, single-session, autonomous research task: design a semantic evidence taxonomy for
ORYN's student profiles (activity types, roles, recognition levels, output types, time/duration
semantics, evidence/provenance states, context model, unsafe-inference rules) so the counselor
engine reasons about what a student has *actually done*, not a pile of text fields. Docs-only —
no schema, migration, or `lib/counselor/**` changes. Timeboxed to 2026-08-21 11:00
Europe/Istanbul. Full mandate text lives in this session's own first user turn; the operative
plan is `docs/research/counseling-intelligence/00-overview.md`.

## Scope boundary (do not cross)

Only write to: `docs/research/counseling-intelligence/**`, `data/research/counseling-intelligence/**`,
`docs/handoffs/research-counseling-intelligence.md`, and this session's own row in
`docs/ORYN_WORKSTREAMS.md`. Never touch `lib/counselor/**`, any migration, or production
Supabase — this is reasoning substrate for the already-shipped counselor engine
(`docs/counselor-core.md` / `docs/counselor-core-plan.md`), not a parallel implementation.

## State as of this checkpoint (2026-08-21, resumption after compaction)

- Branch `oryn/counseling-intelligence-research` off `oryn/programs-pipeline-reconciled`, checked
  out in the main working directory (not a separate worktree).
- One commit on the branch so far: `148a2d6` "docs: scaffold counseling-intelligence research
  package" — added `docs/research/counseling-intelligence/00-overview.md` and this branch's row
  in `docs/ORYN_WORKSTREAMS.md`. Already pushed to origin.
- `00-overview.md` is the authoritative plan: 10 documents (`01`–`10`) plus two machine-readable
  companions (`data/research/counseling-intelligence/rules.json`, `sources.json`). Table of
  contents with each doc's exact question is in that file — do not redesign the structure, just
  execute it, unless a genuine problem is found (note it here if so).
- Confirmed via direct file reads (not memory) before any of this was planned: current schema
  (`supabase/migrations/0004_achievements.sql`, `0005_evidence_and_goals.sql`) already has
  `activities`/`awards`/`certifications`/`projects`/`research_experiences`/
  `volunteering_experiences`/`work_experiences`/`skills`/`languages`, a polymorphic
  `evidence_files` table, and `evidence_status` (`self_reported`/`evidence_added`/`verified`/
  `verification_rejected`). `lib/scoring/types.ts` and `lib/counselor/types.ts` already define
  `ProfileDimension` (9 values), `DataConfidence` (`high`/`medium`/`low`), `RecommendationClass`
  (`do`/`consider`/`deprioritize`/`avoid_for_now`), `ReasonCode`, gap/candidate/ranking pipeline
  types. This research reuses all of these rather than inventing parallel names.
- Documented gaps this research targets (verified by reading the actual shipped code, not
  assumed): `lib/counselor/config.ts`'s `REDUNDANCY_DECAY` is a single flat `0.75` constant, no
  grade-level computation exists anywhere (`eligible_grades` always evaluates to `unknown`),
  `CATEGORY_DIMENSIONS` in `lib/opportunities/matching.ts` is a flat 13-category→1-2-dimension
  table with no evidence-state distinction (entering a competition and winning it map to the
  same dimensions/strength), and there is no major-family evidence framework anywhere.

## Progress on the 10-document plan

*(Update this table at every checkpoint — this is the single source of truth for "what's done."
Do not trust a document's presence alone; note whether it's drafted, sourced, or still a stub.)*

| Doc | Status |
|---|---|
| 00-overview.md | Done, committed (`148a2d6`, other session) |
| 01-development-taxonomy.md | Done (this session's version), committed on top of the collision at a commit after `3bbedb3` — see git log for the exact hash; a competing version also exists at `51b1978` (other session) — **founder reconciliation needed, do not auto-merge**, see collision note above |
| 02-opportunity-development-mapping.md | Done (this session), same commit as 01 above |
| 03-recommendation-timing.md | **Correction — see the 3+ session update above**: done, but by "session 7" directly on this shared branch (`b20cdee`), not by session 1's worktree as originally assumed here. Good quality on inspection (grade/age portability across US/UK/IB, two-phase exploration/deepening model, explicit exceptions to avoid mechanical stage-penalizing) — one minor citation slip found: cites "`01-development-taxonomy.md` §2.2`" for the breadth-precedes-depth point, but this document has no §2.2 at any point in its history (closest match is §7.2 or the newer §8) — worth a light fix at integration time, not urgent. |
| 04-profile-gap-framework.md | Not started by anyone as of this checkpoint, as far as this session can observe |
| 05-redundancy-saturation.md | Not started by anyone as of this checkpoint, as far as this session can observe |
| 06-major-family-evidence/ (14 families) | In progress by "session 7" on this shared branch — 5 of 14 done as of this checkpoint (computing, math/stats, physical sciences, life sciences, engineering) |
| 07-explainability-framework.md | Owned by the other session's new worktree — not started by this session |
| 08-unsafe-inference-rules.md | Owned by the other session's new worktree — not started by this session |
| 09-persona-testing.md | Owned by the other session's new worktree — not started by this session |
| 10-open-questions.md | Owned by the other session's new worktree — not started by this session |
| `data/research/counseling-intelligence/rules.json` | Populated: RULE-COUNSEL-001 through 033, sourced from 01-02. The other session mints new rules from `034` onward in its own worktree to avoid collision — will need a merge pass at reconciliation time, not before. |
| `data/research/counseling-intelligence/sources.json` | Populated: SRC-001 through 006 (UCAS, Common App, IB CAS, NACAC, Turkey MEB/YKS, EPQ), all with retrieval method and confidence noted. |

## Working conventions established this session

- **Source discipline**: 5-tier priority (official admissions guidance → official program pages
  → official education authorities (NACAC/UCAS/Common App/national ministries) → reputable
  counseling orgs → high-quality empirical research). Blogs/listicles are discovery-only, never
  cited as evidentiary basis. No LLM output is ever a source. Every non-trivial claim gets a
  `confidence` (`high`/`medium`/`low`) and, where relevant, a `limitations` note.
- **Rule numbering**: `RULE-COUNSEL-###`, sequential, minted once per rule at first definition,
  never renumbered — cross-referenced by number from any later document rather than restated.
- **Binding design decision**: reuse the existing 9-value `ProfileDimension` as the only
  top-level taxonomy. New distinctions this research surfaces (e.g. research exposure vs.
  research output, leadership title vs. leadership substance) become sub-facets/evidence
  attributes *within* an existing dimension, never a proposed 10th dimension or schema change.
  Anything that genuinely seems to need a schema change goes in `10-open-questions.md`, flagged
  explicitly, never made silently.

## Next action

01 and 02 are done and committed by this session. 03 onward is owned by the other session's
isolated worktree per the collision note above — this session is not writing further into the
`0X-*.md` sequence. If resuming this session cold and 03+ already shows real content above, check
`git log`/`git branch -a` for the other session's worktree branch before assuming this session
should pick up where it left off — the split agreed here may already be stale. This session's own
remaining-time plan (see reply sent to the peer session): hold 00-02 stable, do a reconciliation
pass against the competing `51b1978` attempt at 01 to fold in anything genuinely additive, and act
as an integration/QA checkpoint for the combined package once the other session's 03-10 exist,
rather than duplicating 03-10 work in this same working directory.
