# Database

Postgres via Supabase. 40 tables across 17 migration files in `supabase/migrations/`,
applied in filename order. UUIDs (`gen_random_uuid()`) everywhere, timestamps on every
table, foreign keys with deliberate `on delete` behavior (see "Cascade behavior" below).

## Entity groups

| Migration | Tables |
|---|---|
| `0002_profiles.sql` | `profiles` (mirrors `auth.users` 1:1; auto-created by trigger on signup) |
| `0003_academic_records.sql` | `education_records`, `courses`, `test_scores` |
| `0004_achievements.sql` | `activities`, `awards`, `certifications`, `projects`, `research_experiences`, `volunteering_experiences`, `work_experiences`, `skills`, `languages` |
| `0005_evidence_and_goals.sql` | `evidence_files`, `student_interests`, `career_goals` |
| `0006_universities.sql` | `universities`, `university_programs`, `university_requirements`, `university_statistics`, `university_deadlines`, `university_sources` — **global data, no `user_id`** |
| `0007_target_universities_and_applications.sql` | `target_universities`, `applications`, `application_requirements` |
| `0008_opportunities.sql` | `opportunities`, `opportunity_sources` (global), `opportunity_matches`, `saved_opportunities` (per-user) |
| `0009_scoring.sql` | `profile_scores` (current), `profile_score_snapshots` (append-only history) |
| `0010_planning.sql` | `weekly_plans`, `weekly_actions`, `ai_recommendations` |
| `0011_advisor.sql` | `advisor_conversations`, `advisor_messages` |
| `0012_notifications.sql` | `notifications` |
| `0013_ops.sql` | `provider_health`, `external_sync_jobs`, `ai_usage` |
| `0016_university_coordinates.sql` | adds `latitude`/`longitude` to `universities` |

## Assumptions and consolidations

The build spec's prose (Phase 4) describes a slightly richer set of concepts than its own
canonical schema list (Phase 58). Where they conflict, this database follows Phase 58 and
consolidates:

- **"Grades"** is not a separate table from **"coursework"** — a course row carries its
  own grade. A dedicated grades table would just duplicate the same row 1:1 with no
  independent lifecycle. Overall GPA lives on `education_records` (a property of an
  enrollment period, not of a single course).
- **"Leadership experiences"** and **"summer programs"** are not separate tables — they're
  attributes/categories on `activities` (`is_leadership_role`, `people_led`,
  `organization_scope`; `category = 'summer_program'`).
- **"Internships"** are not a separate table — `work_experiences.employment_type =
  'internship'`.

Each is a deliberate normalization decision, not an oversight — see the comment above
`create table public.activities` in `0004_achievements.sql` for the fuller rationale.

## Evidence is polymorphic

`evidence_files.linked_table` + `linked_id` can point at any of 9 achievement tables.
Postgres has no native polymorphic foreign key, so this isn't a DB-enforced FK — the
application validates `linked_table` against an allow-list
(`lib/validation/evidence.ts`) before every insert, and separately re-checks that the
target row's `user_id` matches the caller before attaching evidence to it
(`app/(app)/documents/actions.ts`).

## Cascade behavior

- `profiles.id references auth.users(id) on delete cascade` — deleting the auth user
  deletes the profile, which cascades to every user-owned table (`... references
  profiles(id) on delete cascade`). This is what makes account deletion
  (`deleteMyAccount` in `app/(app)/settings/actions.ts`) a single `auth.admin.deleteUser`
  call.
- Global reference tables (`universities`, `opportunities`, ...) have **no** `user_id` and
  are never touched by a cascade from a user deletion — deleting a student's account can
  never delete shared university/opportunity data.

## Row Level Security

See `SECURITY.md` for the full policy breakdown and the verification method (every table
cross-checked against every RLS policy — this caught a real gap during review, fixed in
`0017_fix_missing_score_rls.sql`).

## Types

`types/database.ts` is hand-authored to exactly match the migrations (no live Supabase
project in this environment to run `supabase gen types typescript --linked` against).
Once a project is linked, `npm run db:types` replaces it with the real generated file —
same shape (`Database.public.Tables.<table>.Row/Insert/Update`), nothing else changes.

**A non-obvious gotcha, in case this needs re-diagnosing:** every Row/Insert/Update type
in that file is wrapped in an `Identity<T>` mapped type before being handed to the
`Table<>` helper. Without it, every single table silently resolved to `never` in
Supabase's generic type inference — `interface`-declared types (as opposed to `type`
aliases) don't get TypeScript's implicit index-signature inference, so none of them
structurally satisfied `@supabase/postgrest-js`'s `Record<string, unknown>` constraint on
Row/Insert/Update. `Identity<T>` re-expresses an interface as a mapped type purely to
trigger that inference. See the comment directly above it in `types/database.ts`.

## Migrations

Run locally with the Supabase CLI (installed as a dev dependency, no global install
needed):

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push        # apply all migrations
npx supabase db reset       # local only: migrations + seed.sql fixtures
npm run db:types            # regenerate types/database.ts from the live schema
```
