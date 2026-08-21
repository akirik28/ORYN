# Counseling Intelligence Research — Overview

**Status:** overnight research package, single session, started 2026-08-21 ~01:20 Europe/Istanbul,
timeboxed to 11:00 the same morning. Branch `oryn/counseling-intelligence-research`, off
`oryn/programs-pipeline-reconciled`. See `docs/handoffs/research-counseling-intelligence.md` for
exact session-resumption state.

## What this package is

This is a **knowledge layer**, not a feature. It answers the research question ORYN's counselor
needs answered underneath its code: *for a student with a given age/grade, academic system,
intended major, current profile, and constraints, what kinds of action are actually useful, why,
and when — and how do we know that without inventing certainty we don't have?*

It contains **no application code, no schema changes, no migrations, no production Supabase
writes**. It is designed to be read by a future engineering session (most likely continuing
`oryn/counselor-data-quality-v1`'s lineage) and used to refine the *reasoning content* of an
already-shipped, already-tested counselor pipeline — not to replace that pipeline's architecture.

## Why this is a distinct, non-duplicative contribution

Before writing anything, this session read `docs/counselor-core.md`, `docs/counselor-core-plan.md`,
`lib/counselor/**`, `lib/opportunities/matching.ts`, `lib/scoring/**`, and
`docs/MASTER-EXECUTION-STRATEGY.md` in full. Counselor Core (built on `oryn/counselor-core-v1`,
hardened on `oryn/counselor-data-quality-v1`) already ships:

- a deterministic 9-dimension scoring engine (`ProfileDimension`: `academics`,
  `intellectual_curiosity`, `leadership`, `research`, `entrepreneurship`, `community_impact`,
  `awards_distinction`, `career_exploration`, `execution_project_depth`);
- severity-ranked gap detection (`lib/counselor/gaps.ts`);
- three-state eligibility classification (`known_eligible` / `known_ineligible` / `unknown`,
  `lib/counselor/eligibility.ts`);
- weighted candidate ranking with a redundancy decay (`lib/counselor/scoring.ts`, `config.ts`);
- a template-based, structured-data-only explanation contract (`lib/counselor/evidence.ts`);
- a flat category→dimension opportunity mapping (`CATEGORY_DIMENSIONS` in
  `lib/opportunities/matching.ts`).

That code's own documentation is explicit about what it is *not*: `docs/counselor-core.md` states
plainly that `RANKING_THRESHOLDS`, `EFFORT_BY_CATEGORY`, and `REDUNDANCY_DECAY` (a single flat
`0.75` constant, `lib/counselor/config.ts:38`) are "product heuristics, not a validated model," and
lists **"no grade-level computation"** as a known limitation — `eligible_grades` restrictions are
always treated as `unknown` because nothing in the codebase derives a student's current grade or
reasons about grade-appropriate timing at all. The opportunity→dimension mapping is a static
13-category → 1-2-dimension lookup table with no evidence-state distinction (a student who merely
*entered* a competition and one who *won* it map to the same dimensions, at the same implied
strength). There is no major-family evidence framework anywhere in the codebase.

This package exists to fill exactly those documented gaps with sourced reasoning, not to
re-architect what already works. Where this research's conclusions could inform a future edit to
`lib/counselor/config.ts` or `lib/opportunities/matching.ts`'s `CATEGORY_DIMENSIONS`, that is
called out explicitly per-document — but making that edit is out of scope for this session (see
the mission's own non-negotiables: no production code changes).

## Documents in this package

| # | Document | Answers |
|---|---|---|
| 00 | `00-overview.md` (this file) | Scope, method, non-duplication rationale |
| 01 | `01-development-taxonomy.md` | What dimensions of student development are actually meaningful for counseling, and how do they map onto the 9 shipped `ProfileDimension` values? |
| 02 | `02-opportunity-development-mapping.md` | What does participating in a given opportunity type actually demonstrate or develop, and how does that differ by evidence state (participated vs. finalist vs. award vs. leadership role)? |
| 03 | `03-recommendation-timing.md` | When does a given recommendation type make sense, by grade/age, conditionally rather than universally? |
| 04 | `04-profile-gap-framework.md` | How do we tell a real developmental gap from a harmless, context-explained absence? |
| 05 | `05-redundancy-saturation.md` | When should ORYN *not* recommend more of an already-strong area? |
| 06 | `06-major-family-evidence/` | For each major family (a living, growing list — started as an initial 14-family estimate, reached 17 once both sessions' original assignments were complete, then grew further as each session kept finding genuine coverage gaps on review; see `06-major-family-evidence/00-family-taxonomy.md` §3 for the current authoritative list/count, never a specific number quoted elsewhere), what experiences legitimately demonstrate genuine interest/ability? |
| 07 | `07-explainability-framework.md` | How should a recommendation's "why" be constructed so it is honest, specific, and never a fake probability? |
| 08 | `08-unsafe-inference-rules.md` | Consolidated registry of inference patterns ORYN must never make, pulled from every other document |
| 09 | `09-persona-testing.md` | Do the frameworks above hold up against concrete hypothetical student profiles, including edge cases? |
| 10 | `10-open-questions.md` | What remains genuinely unresolved, and what data does ORYN not yet have to execute these rules? |

**Extended beyond this original 10-document plan** (per the mission brief's own "continue
broadening and deepening... do not stop because the first set is complete" instruction, and per the
concurrent-session split documented in `docs/handoffs/research-counseling-intelligence.md`): `11-
geography-admissions-systems.md` (how admissions logic itself varies by target country — the
single highest-leverage finding either session surfaced, see `03-recommendation-timing.md` §6 for
this session's own independent verification of the same finding), `12-activity-progression-
pathways.md`, and `13-implementation-readiness.md`, **all three written on the concurrent session's
own branch/worktree (`oryn/counseling-intelligence-research-013956`), not on this branch** — named
here only so this overview stays a complete map of the whole overnight effort across both branches;
see that branch's own commits for the actual files. This branch separately has its own
`14-field-opportunity-mapping.md` (answering the mission's deliverable #5 directly — opportunity
category → most-relevant fields, the reverse direction from `02`'s category → dimension mapping).
**Both branches have agreed new documents from here start at 14+, to avoid a third filename
collision** (the first was `01`/`02` content itself; this was the second, at the `13` slot
specifically). This table intentionally is not updated further per-document as
the package keeps growing overnight — check `docs/handoffs/research-counseling-intelligence.md` and
each branch's own git log for the current full file list rather than trusting this table as
exhaustive after this point.

Machine-readable companions live in `data/research/counseling-intelligence/`:

- `rules.json` — every `RULE-COUNSEL-###` rule, structured, cross-referenced to its source document
  section and its evidence.
- `sources.json` — the source registry (`source_url`, `source_title`, `source_type`, `retrieved_at`,
  `claim_supported`, `confidence`, `limitations`) referenced by rules.

## Method and source standard

Priority order, per the mission brief:

1. Official university admissions guidance (department/faculty pages, official admissions-office
   blogs and published guidance).
2. Official program/competition/organizer descriptions.
3. Official education authorities (e.g. NACAC, UCAS, Common App, national ministries of
   education).
4. Reputable institutional counseling/admissions guidance (established college-counseling
   organizations, university career-services offices).
5. High-quality empirical research (peer-reviewed or working-paper-with-credible-institution
   studies on admissions, extracurricular development, or youth skill-building) where it
   materially sharpens a claim.

Blogs, forums, and aggregator "best summer programs" listicles are used only as **discovery
context** (they helped find which official sources to go read), never cited as the evidentiary
basis for a claim. No LLM output — this session's own or any other's — is ever treated as a
source. Every non-trivial claim in this package carries a `confidence` (`high` / `medium` / `low`)
and, where relevant, an explicit `limitations` note. **Unknown is written down as unknown** — this
package follows the same discipline the shipped code already applies (`docs/counselor-core-plan.md`
§7's "unknown ≠ ineligible" is the direct analogue of this research package's own "no source ≠ no
claim").

## Relationship to the existing 9-dimension taxonomy — the one binding design decision

Every document in this package **reuses `ProfileDimension` as the outer taxonomy and never
proposes a 10th top-level dimension or a schema change.** Where research surfaces a distinction
the current 9 dimensions can't express on their own (e.g. "research exposure" vs. "research
output," or "leadership title" vs. "leadership substance"), this package expresses it as a
**sub-facet or evidence-attribute within an existing dimension**, scoped for a future scoring-logic
refinement, not a new column. This mirrors exactly how `lib/scoring/dimensions/leadership.ts`
already works today (role scope, people led, duration, selectivity, measurable impact all feed one
`leadership` score) — this research deepens the *evidence patterns* that should feed those
existing scorers, it does not contest the taxonomy shape itself. Any place this package genuinely
believes a schema-level change would be justified is flagged explicitly in
`10-open-questions.md`, never made silently.
