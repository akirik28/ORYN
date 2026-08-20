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
| 00-overview.md | Done, committed (`148a2d6`) |
| 01-development-taxonomy.md | Not started |
| 02-opportunity-development-mapping.md | Not started |
| 03-recommendation-timing.md | Not started |
| 04-profile-gap-framework.md | Not started |
| 05-redundancy-saturation.md | Not started |
| 06-major-family-evidence/ (14 families) | Not started |
| 07-explainability-framework.md | Not started |
| 08-unsafe-inference-rules.md | Not started (consolidation — write near the end) |
| 09-persona-testing.md | Not started (needs 01–08 to exist first) |
| 10-open-questions.md | Not started (write last) |
| `data/research/counseling-intelligence/rules.json` | Not started (populate incrementally as each doc mints `RULE-COUNSEL-###` entries) |
| `data/research/counseling-intelligence/sources.json` | Not started (populate incrementally as sources are actually fetched) |

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

Resume at whichever row in the progress table above is earliest and still "Not started." As of
this checkpoint, that's `01-development-taxonomy.md`.
