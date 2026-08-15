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

## Chat 2 pass — V1 social/network scope (founder-approved, 2026-08-15)

The founder repositioned Oryn mid-build as a broader "Operating System for Ambitious
Students" — College Counseling + Career Guidance + Opportunity Discovery + Professional
Network + AI Next Best Action — while explicitly locking V1's social surface to a narrow
slice: **in** — an optionally-shareable profile, follow/connection architecture, a
"currently looking for" status, strong public/private presentation of projects,
achievements and skills; **not in V1** — feed, DMs, comments, likes/reactions, teammate
matching, mentor marketplace. This supersedes `founder-spec.md`'s original Phase 3 line
listing "a social network" under what Oryn is *not* — see that file's header for how the
supersession is marked without editing its verbatim body. The core loop (Profile → Gap
Analysis → Opportunities → Prioritization → Next Best Action) is unchanged and stays the
product's center of gravity; social is additive, not a pivot.

Implemented this pass: `supabase/migrations/0023_social_v1.sql`, `lib/social/`,
`app/(app)/connections/`, `app/(app)/u/[id]/`, a "Visibility" section on Settings. Not
run against a live Postgres in this sandbox (no Docker/Supabase here — same limitation
Chat 1 documented for its own migrations) — review + `supabase db reset` before trusting
in a shared environment, per this repo's migration discipline.

**Mutual-consent connections, not an open follow.** The brief said "follow / connection
architecture" without picking one; chosen: a LinkedIn-style request → accept model
(`connections` table, `connection_status` enum), not a Twitter/Instagram-style open
asymmetric follow. Reasoning: this product's primary audience is 14-18-year-olds, and
`AGENTS.md`'s minor-safe section is explicit and non-negotiable-adjacent ("avoid
public-by-default profiles", "do not build public student messaging in V1") — an
asymmetric follow lets any signed-in stranger attach themselves to a minor's profile with
no consent step; a mutual request doesn't. This is the one place this pass made a safety
call the founder's message didn't explicitly resolve, rather than defaulting to the more
social-network-typical (but higher-exposure) option.

**Public profile is a security-definer *view* over a fixed column whitelist, never a
broadened RLS policy on `profiles`.** `profiles` carries fields that must never go public
(`birth_year`, `school_name`, `city`, `is_admin`, `profile_strength_score`, `busy_mode*`,
`onboarding_*`, ...). An RLS carve-out on the raw table would depend on every future
column addition being re-audited for public-safety before it ships; the view instead
hard-codes both the safe column list and the `is_public = true` predicate once, in one
place. See the migration's own comments for the "why a view, not RLS" reasoning in full,
and the "continuity carve-out" clause that lets an existing connection still resolve a
counterpart's basic info after they go private again.

**Public profile requires an Oryn sign-in — not the open, unauthenticated web.** Read
literally, "optionally shareable" doesn't specify an audience. Chose the more
conservative of the two reasonable readings (shareable *within* Oryn's signed-in user
base, not a search-engine-indexable public URL) given the minor-safe stakes; the view is
granted to the `authenticated` role only, not `anon`. Reversible later — loosen the grant
and add `noindex` if the founder wants true logged-out sharing.

**No people-search / student directory.** Global search (`lib/search/`) only ever
searches *your own* data — it was not extended to search other students. Discovery in V1
is link-only: a student shares their own `/u/[id]` link (via Settings' "Copy link"), and
a "Connect" button appears only on an already-public profile page. Building an
open directory that lets any student look up any other student by name would reintroduce
exactly the "public student messaging in V1" surface `AGENTS.md` rules out — left for an
explicit future founder decision, not built implicitly under this broader mandate.

**Public portfolio omits the "education" category and all evidence file references.**
Reuses Chat 1's existing `buildPortfolio()` unchanged (it already never includes evidence
file paths/signed URLs — see `lib/portfolio/types.ts`), filtered to drop `education`
client-side: the founder's phrasing was "projects, achievements and skills", and a
public GPA/school-name toggle feels like a materially bigger disclosure than a friend
seeing "app is off by default" already covers — worth a deliberate look, not an
oversight, if the founder wants education included later.

**Nav: "Connections" is a secondary-nav item, not primary.** `AGENTS.md` Phase 42's
7-item primary list is an explicit spec requirement (see the "Nav: search reachable via
icon" decision below, which hit the same constraint first). Secondary nav already held
Documents/Settings; added as a third rather than inventing a new nav tier.

## Nav: search reachable via icon, not a new primary sidebar item

`AGENTS.md` Phase 42 explicitly enumerates the primary nav ("keep top-level navigation
small") and the current `PRIMARY_NAV` list matches it exactly (7 items). Adding "Search" as
an 8th primary item would contradict that instruction. Added a search icon next to the
notification bell in both the desktop sidebar header and mobile header instead — reachable
everywhere, doesn't touch the enumerated nav lists. Chat 2 owns whether this is the final
placement.
