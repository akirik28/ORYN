# Product Decisions (Chat 1 pass)

Assumptions made autonomously this session, per the operating instructions' "choose the
most sensible decision, document it, implement it, keep it reversible" rule. Decisions from
earlier sessions are documented inline in `PHASE_STATUS.md` and `DATABASE.md`/`ARCHITECTURE.md`
comments — this file only covers what changed in this pass.

## Schema: extend `university_requirements`, don't fork it

The operating brief for this pass suggested three new tables
(`university_program_requirements`, `requirement_sources`, `student_requirement_evaluations`)
for the Phase 69 requirement checklist. `university_requirements` already exists as Phase
35's canonical entity for this exact concept. Creating a parallel table would fragment one
concept across two near-duplicate tables — exactly what `DATABASE.md` already documents this
codebase avoiding elsewhere (grades/coursework, leadership/activities). Decision: extend the
existing table (new columns: `title`, `structured_rule`, `data_status`, `last_checked_at`;
retyped `requirement_type` to a real enum) and add only the one genuinely new concept
(`student_requirement_evaluations`, a per-student result with no existing home). Full
reasoning in `DATABASE.md`.

## Requirement evaluation: five statuses, all deterministic, AI never invents

`met` / `likely_met` / `not_met` / `unknown` / `needs_manual_review`, computed by pure
functions in `lib/requirements/evaluate.ts` — never an AI judgment call. AI's only role
(`lib/ai/interpret-requirement.ts`) is turning an admin-pasted, already-sourced requirement
description into the structured comparison rule, and only for categories with a
machine-evaluable shape at all (curriculum, coursework, minimum grade, test score, language
proficiency). Essay/recommendation/interview/portfolio/supplemental/international
requirements always resolve to `needs_manual_review` — Oryn doesn't store or judge submitted
materials, and pretending otherwise would violate the founder spec's own "AI must not
silently invent official requirements" rule. `application_deadline` is informational only
(the canonical date record is `university_deadlines`), never scored.

## No fabricated seed data for requirements

Considered adding a few "real" requirement rows to `supabase/seed.sql` (matching the
existing university fixtures' pattern) so the checklist isn't empty in local dev. Decided
against it: an admissions requirement like "minimum GPA 3.5" is exactly the kind of
specific, checkable official fact this product's non-negotiables forbid stating without
verifying against an actual current official source in this session (no live web access to
verify a specific school's current stated policy). The feature's correct empty state (an
honest "no rows yet" list, or nothing rendered) is safer than a plausible-looking but
unverified number sitting in a file that will eventually get real data mixed in. Real rows
now come from the admin form.

## Peer benchmarking: gate on peer count, not overall cohort size

`evaluateBenchmarkDimension` requires ≥100 peers *who have a score for that specific
dimension*, not just ≥100 peers who share the cohort attributes. A student's dimension
scores aren't guaranteed uniform across a cohort (someone might have 8 of 9 dimensions
scored), so gating on cohort headcount alone could show a percentile computed from a much
smaller, silently-unstated sample. Slightly more conservative than the spec's literal
"minimum n=100" wording, in the direction the spec's own principles (never fabricate a
percentile, never misleading small samples) clearly favor.

## Search: no per-item detail routes invented

Global search links to a real per-item page only where one already exists (universities,
applications). Profile items, goals, and opportunities are all managed inline on their
owning list page in this codebase (no `/profile/activities/[id]`-style routes), so search
results for those link to that list page rather than fabricating a route that doesn't
exist. Chat 2 could reasonably decide these deserve their own detail views — if so, update
the `href` in `lib/search/index.ts` alongside adding the route, not before.

## Nav: search reachable via icon, not a new primary sidebar item

`AGENTS.md` Phase 42 explicitly enumerates the primary nav ("keep top-level navigation
small") and the current `PRIMARY_NAV` list matches it exactly (7 items). Adding "Search" as
an 8th primary item would contradict that instruction. Added a search icon next to the
notification bell in both the desktop sidebar header and mobile header instead — reachable
everywhere, doesn't touch the enumerated nav lists. Chat 2 owns whether this is the final
placement.
