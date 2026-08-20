# Implementation Readiness: A Prioritized Punch List

Answers: *of everything docs `00`-`12` (this branch) propose, what should an engineering session
actually do first, and what does each item actually require?* This document makes no schema or
code changes itself — it is a synthesis and prioritization of recommendations already made
throughout the package, organized for consumption rather than restated in full. Every item links
back to its full reasoning rather than re-arguing it here.

## Method: how items are ranked

Four tiers, by **what the item needs before it can be built** — not by importance alone, since
several high-importance items (geography-tier weighting) happen to also be immediately buildable,
while some smaller-sounding items (school-curriculum-availability) require real new data-collection
work. Within each tier, items are ordered by estimated impact, using this package's own existing
`impact`/`effort` vocabulary (`lib/counselor/types.ts`'s `BoundedLevel`) rather than inventing a new
scale.

## Tier 1 — Implementable today, no new data collection required

### 1. Geography-tier recommendation weighting (`11-geography-admissions-systems.md`) — highest priority

**Impact: high** (affects every recommendation shown to any student targeting a Tier-3 system —
plausibly a large share of ORYN's non-US users, per `AGENTS.md`'s own stated Turkey/Europe focus).
**Effort: medium** (new decision logic, but the input data already exists).

**Precise wiring, verified against the actual schema this session**: `profiles.target_geographies`
(`TargetGeography[]` = `"usa"|"uk"|"europe"|"canada"|"turkey"|"not_sure"`) is already collected at
onboarding (`AGENTS.md` Screen 4) — this alone is enough to apply the coarse Tier 1/2/3 default from
`11`. **Finer-grained signal already exists too**: `target_universities.university_id` links to a
`universities` row (which carries its own `country`), so once a student has added a specific target
university, the tier logic should prefer that country-specific signal over the generic
`target_geographies` value (e.g., a student whose `target_geographies` says `"europe"` but who has
added a specific German university as a target should get Germany-specific, not generic-Europe-
fallback, treatment). **Proposed precedence, most to least specific**: (1) country of an active
`target_universities` entry → look up its tier from `11`'s synthesis table; (2) `target_geographies`
value → apply the coarse per-region default (`usa`→Tier 1, `uk`/`canada`→Tier 2, `europe`→Tier 3
generic-fallback per `RULE-COUNSEL-075`, `turkey`→Tier 3); (3) `"not_sure"`/empty → no tier-specific
framing at all, present recommendations in the current geography-neutral style rather than guessing.
This precedence itself should be written down as the actual implementation contract, not
re-derived by whoever builds it.

### 2. Grade/stage derivation (peer's `03-recommendation-timing.md` §1, `yearsUntilGraduation`)

**Impact: high** (unblocks every timing-aware rule in both branches' packages — currently
`eligible_grades` always resolves to `unknown` per `docs/counselor-core.md`'s own documented gap).
**Effort: low** (a pure computation from `profiles.graduation_year`, already specified in full by
the peer branch — this session did not re-derive it, just confirms it belongs in this tier).

### 3. Fix the redundancy/timing composition bug found in `09-persona-testing.md`

**Impact: medium** (a real, demonstrated composition error, but only manifests for Phase-1
students being shown breadth-type candidates — a real but narrower slice of traffic than item 1).
**Effort: low** (a conditional in `lib/counselor/scoring.ts`'s redundancy-decay application:
exempt `career_exploration`/`intellectual_curiosity` candidates from `REDUNDANCY_DECAY` when the
student is in Phase 1). Depends on item 2 (needs a stage signal to know which phase a student is
in) — sequence after item 2, not before.

### 4. Recognize paid part-time work as `career_exploration` evidence (`RULE-COUNSEL-055`)

**Impact: low-medium** (affects a specific, real persona shape — access-constrained students with
work experience rather than an internship — not the general population). **Effort: low** (a small
addition to `career-exploration.ts`'s existing internship-detection logic, same pattern, different
`employment_type` value).

## Tier 2 — Needs a small, well-scoped schema addition

### 5. Achievement-tier field (`02-opportunity-development-mapping.md` Part A/C)

**Impact: high** (unblocks the evidence-state ladder, the tier-aware redundancy model in `05` §4,
and the "finalist ≠ winner" fix below — several other recommendations in this package are
downstream of this one). **Effort: medium** — the simplest version is not a full relational
redesign: an optional `achievement_tier` enum column on `activities`/`awards`
(`registered|participated|completed_project|finalist|award|winner|publication|leadership_role|
founder_role`, per `02`'s ladder), nullable/optional so it doesn't block existing entries. A fuller
version (linking a `saved_opportunities` record to its eventual outcome automatically) is Tier 3
(#10 below) — do not block the simple version on the harder one.

### 6. Award-level parsing: separate placement/outcome from geographic scope

**Impact: medium** (fixes a confirmed, present-tense scoring inaccuracy —
`02` Part C's worked example: "National Finalist" and "National" currently score identically).
**Effort: low-medium** (extend `awards.ts`'s `levelPoints()` regex to also detect placement words —
"finalist," "semifinalist," "honorable mention," "winner," "champion" — as a separate signal from
the existing geographic-scope detection, then combine the two rather than only reading scope).
Benefits from, but does not strictly require, item 5 — could ship as a text-parsing improvement
alone first.

### 7. Opportunity-level selectivity field (`02` Part B)

**Impact: medium** (lets a highly-selective program's mere participation be weighted appropriately
relative to an unselective program's win — currently conflated). **Effort: medium** (a new field
on `opportunities`, populated during acquisition/verification — this is squarely
`lib/acquisition/`'s territory, a different existing workstream, not something this research
package's own scope covers implementing).

## Tier 3 — Needs a larger data-collection effort or founder-level scoping

### 8. School-level curriculum-availability data (`04-profile-gap-framework.md` §2)

**Impact: high in principle** (the single biggest unsafe-inference risk this package identified —
"no AP ≠ no rigor if unavailable" — currently unexecutable) **but effort: high and the acquisition
strategy itself is an open, founder-level question**: is this self-reported by the student/school,
sourced from a licensed schools database, or crowd-built from ORYN's own user base over time? This
package does not resolve that question — it is out of scope for research to make a data-
acquisition-strategy call that has real cost/build implications.

### 9. First-class writing/communication and creative-production evidence types (`01` §4)

**Impact: medium** (closes a real gap for the literature/journalism/arts family docs' evidence to
be structurally scoreable rather than only descriptively documented). **Effort: medium-high** (a
genuine schema/scoring-dimension conversation, not a small addition — could plausibly become new
sub-facets of `execution_project_depth` rather than new top-level fields; a founder/engineering
product decision, not something this research package should pre-decide).

### 10. Structural link from application/interest to eventual outcome (`02` §1 Problem A)

**Impact: medium** (the fuller version of item 5 — would let achievement tier be inferred rather
than only self-reported). **Effort: high** (a real relational-design problem: linking
`saved_opportunities`/`opportunity_matches` rows to the `awards`/`activities` rows a student later
creates describing the outcome, which today are two entirely separate data-entry paths with no
enforced connection). Lower priority than item 5's simpler version — ship the simple self-reported
tier field first, revisit this only if self-reporting proves too unreliable in practice.

## Tier 4 — Content/copy work, not schema or scoring-logic changes

### 11. Populate `lib/counselor/evidence.ts`'s explanation templates with this package's reasoning

This is squarely the peer-owned `07-explainability-framework.md`'s territory — named here only to
close the loop: everything in docs `01`-`12` (this branch) and the peer's `01`-`09` family docs is
*raw reasoning content* a template author should draw from, not itself a set of ready-to-ship
strings. Someone doing this work should read `07` first for the *structure* the templates should
follow, then pull specific phrasing/reasoning from whichever of `01`-`12`'s worked examples matches
the recommendation being explained.

### 12. Major-family-specific explanation content (17 families now researched across both branches)

Each `06-major-family-evidence/*` document's "unsafe inferences specific to this family" section is
effectively a ready-made list of things a family-aware explanation template should actively avoid
saying — a straightforward mechanical pass once item 11's general template structure exists.

## What this document is not

Not a spec, not an estimate in engineering hours, not a claim that this session's priority
ordering is the only reasonable one — a founder or engineering lead may reasonably weight impact
differently than this document does (e.g., prioritizing item 8's data-acquisition question earlier
because it's a longer lead-time item, even though its "implement" step ranks lower here). This
document's contribution is making the *dependency structure* and *what each item actually requires*
explicit, so that prioritization is a real choice rather than a guess.

## Rules established in this document

- `RULE-COUNSEL-076` — Prioritize geography-tier recommendation weighting first among this
  package's proposals: it is simultaneously the highest-impact single item and requires no new
  data collection, using data already collected at onboarding. Confidence: high.
- `RULE-COUNSEL-077` — Prefer a specific target university's own country over a student's general
  `target_geographies` selection when both are available, since the former is strictly more
  specific information. Confidence: high (logical precedence, not an empirical claim).
- `RULE-COUNSEL-078` — Ship the simple, self-reported achievement-tier field before attempting the
  harder structural application-to-outcome linkage — do not let the harder version block the
  simpler one that captures most of the same value. Confidence: medium-high (a sequencing
  judgment, not a research finding).
