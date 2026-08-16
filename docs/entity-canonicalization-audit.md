# Entity Canonicalization Audit

Every field in the schema/UI where a user types the name of a real-world entity
(school, university, employer, organization, program, ...), audited before any schema
change. Fields where the user types a *description, title, or personal text* are
explicitly out of scope (spec's own examples: job title, project title, recommendation
body, About) and are not touched.

## Classification legend

- **CANONICAL REQUIRED** — already backed by a canonical ID; no free-text alternative.
- **CANONICAL + CUSTOM FALLBACK** — gets a new nullable `*_id` column pointing at a
  canonical registry, alongside the existing text column kept for backward
  compatibility and as the free-text/custom path.
- **FREE TEXT REMAINS** — a real-world name, but not one this pass canonicalizes
  (documented reasoning below).
- **NORMALIZED FREE TEXT** — stays free text, but reuses the same normalization utility
  the entity system uses, so at least basic-variant differences (case, accents) don't
  fragment search/grouping. Not ID-backed; no canonical registry built for it.

## Findings

| Field | Table.column | Before | Classification |
|---|---|---|---|
| Current school (quick profile) | `profiles.school_name` | free text | CANONICAL + CUSTOM FALLBACK → `profiles.school_id` |
| Current/previous school (full history) | `education_records.school_name` | free text | CANONICAL + CUSTOM FALLBACK → `education_records.school_id` |
| Target/shortlisted university | `target_universities.university_id` | **already** FK to `universities.id` | **CANONICAL REQUIRED — already implemented**, no change needed. `universities` search (`lib/search/index.ts`, `app/(app)/universities/page.tsx`) gets alias support added (`universities.aliases`). |
| Employer / internship organization | `work_experiences.organization` | free text | CANONICAL + CUSTOM FALLBACK → `work_experiences.organization_id` |
| Volunteering organization | `volunteering_experiences.organization` | free text | CANONICAL + CUSTOM FALLBACK → `volunteering_experiences.organization_id` |
| Club / student organization (also summer/academic program host) | `activities.organization` | free text | CANONICAL + CUSTOM FALLBACK → `activities.organization_id` |
| Research institution / laboratory | `research_experiences.organization` | free text | CANONICAL + CUSTOM FALLBACK → `research_experiences.organization_id` |
| Research mentor | `research_experiences.mentor_name` | free text | **FREE TEXT REMAINS** — a person's name, not an institution. |
| Competition/award organizer | `awards.organization` | free text | CANONICAL + CUSTOM FALLBACK → `awards.organization_id` |
| Certification issuer | `certifications.organization` | free text | CANONICAL + CUSTOM FALLBACK → `certifications.organization_id` |
| Project organization | `projects.organization` | free text, nullable | CANONICAL + CUSTOM FALLBACK → `projects.organization_id` (still nullable — many projects are independent, with no organization at all) |
| Sports team / club / school | `sports_experiences.team_name` | free text | CANONICAL + CUSTOM FALLBACK → `sports_experiences.team_organization_id` |
| Program/opportunity participation | *(no link existed)* | n/a | NEW: `activities.opportunity_id` → existing `opportunities.id` (canonical registry already exists — reused, not duplicated). `opportunities.aliases` added so "YYGS" finds "Yale Young Global Scholars". |
| Opportunity organizer | `opportunities.organization` | free text | **out of scope** — not a field a *student* types; populated by the AI/admin discovery pipeline (`lib/opportunities/discover.ts`), not a user-entry surface this audit covers. |
| NGO / scholarship / summer-program-institution | same as "organization" above, wherever the achievement type applies | free text | covered by the relevant `*.organization_id` above — no separate table; one `institutions` category=`organization` registry serves employer/NGO/club/lab/program-provider alike (see `docs/product-decisions.md`-style rationale in the migration itself). |
| Job title, project title, activity title, award title, certification title, sport/discipline/position, goal title | various `.title`/`.sport`/etc | free text | **FREE TEXT REMAINS** — explicitly named as free text in the spec (job title, project title). |
| Recommendation body, About, every `description`/`story_notes` field | various | free text | **FREE TEXT REMAINS** — personal prose, explicitly named. |
| Achievement-level `location` (e.g. `activities.location`, `projects.location`, ...) | various `.location` text | free text | **FREE TEXT REMAINS** — an informal "City, Country" string per achievement, not a field the spec names with a worked example; canonicalizing 9 more free-text columns into a geo entity system is out of proportion to what was asked (spec section 12 explicitly limits location work to country/city normalization, and explicitly forbids building precise address autocomplete). |
| Country, city | `profiles.country`, `profiles.city` | free text | **NORMALIZED FREE TEXT** — no canonical city/country registry built (no alias worked example was given the way schools/universities were, and a full geo entity system is disproportionate); the same `normalizeEntitySearchText` utility the entity system uses is exported for reuse wherever country/city comparison already happens (e.g. benchmarking cohorts), so "Istanbul"/"İstanbul"/"istanbul" at least normalize consistently for matching. No schema change. |

## Table reused vs. new

- **`universities`** (existing, `supabase/migrations/0006`-era) stays the canonical
  university registry — already ID-linked from `target_universities`, already has
  admissions-relevant columns (`selectivity`, `student_size`, sync metadata) that don't
  belong on a generic institution table. Only `aliases text[]` is added to it.
- **`opportunities`** (existing) stays the canonical program/opportunity registry for
  the same reason — reused via a new `activities.opportunity_id`, only `aliases text[]`
  added.
- **`institutions`** (new, this pass) is the canonical registry for *everything else*
  named above — schools and organizations share an identical real-world shape (a named
  entity with a location, a website, aliases, and a verification status), so one table
  with a `category` (`school` | `organization`) column serves both rather than two
  near-duplicate tables. This is the one new table this pass adds; every other field
  above links to either it, `universities`, or `opportunities` — never a fourth registry.

## Implementation status (end of pass)

**Built and wired:**
- Migration `0038_canonical_institutions.sql` — `institutions` table + RLS,
  `aliases text[]` on `universities`/`opportunities`, nullable `*_id` linkage columns on
  `profiles`, `education_records`, `work_experiences`, `volunteering_experiences`,
  `activities`, `research_experiences`, `awards`, `certifications`, `projects`,
  `sports_experiences`.
- `lib/entities/{normalize,rank,types,search,resolve,validation,backfill}.ts` — the
  search/ranking engine (Turkish-aware normalization, tiered ranking with a soft
  country/city context boost, Levenshtein-based fuzzy fallback), server search/resolve/
  custom-creation actions, and pure backfill classification. Pure-vs-server-only split
  throughout (mirroring `lib/social/skills.ts`'s own convention) so every rule is unit
  tested without a database.
- `features/entities/entity-combobox.tsx` — the shared component (spec section 17),
  wired via a new `FieldConfig` "entity" variant into `education_records.school_name`
  and every `organization`/`team_name` field across the nine achievement tables above.
  `app/(app)/profile/actions.ts`'s shared `crudCreate`/`crudUpdate` re-verify any
  submitted `*_id` server-side (`resolveEntityLinkage`) before persisting, and sync the
  legacy text column to the linked entity's current canonical name.
- `scripts/entities-backfill-report.ts` — non-destructive backfill classification
  script (report-only, never writes a `*_id`), and `supabase/seed_institutions.sql` — one
  real, verified school row (Üsküdar American Academy — the founder's own school, not a
  fabricated example; see that file's header).
- `target_universities.university_id` was already fully canonical — confirmed via audit,
  no change needed.

**Deferred, explicitly (not silent gaps):**
- `profiles.school_name` (the onboarding "quick profile" mirror) stays plain free text —
  `school_id` column exists on it, but the onboarding wizard wasn't rewired to
  `EntityCombobox` this pass. `education_records.school_id` (the fuller structured
  record, one row per school attended) is the real source of truth going forward.
- `activities.opportunity_id` — schema and `opportunities.aliases` both exist, but no
  form field wires it yet: displaying the linked opportunity's title on re-edit needs a
  small additional resolve-on-load join this pass didn't build (activities has no
  existing text column to denormalize the title into, unlike every `organization_id`
  field above, which reuses an existing `organization` text column).
- The existing University Explorer's own search UI
  (`app/(app)/universities/page.tsx`) was not rewired to the new alias-aware engine —
  `target_universities` linkage was already fully ID-based (the actual integrity
  requirement of spec section 9), so this would be a search-quality improvement, not a
  data-integrity fix.
- `lib/social/people-you-may-know-query.ts`'s `sameSchool` signal still compares raw
  `profiles.school_name` text rather than `school_id` — a candidate follow-up once
  `profiles.school_id` itself is wired (see the first bullet above).
- No live-DB backfill was run (see docs/founder-blocked-backlog.md item 17) — this
  environment has no applied migrations for this table at all yet.
