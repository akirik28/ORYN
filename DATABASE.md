# Database

Postgres via Supabase. 44 tables across 25 migration files in `supabase/migrations/`,
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
| `0018_rate_limit_events.sql` | `rate_limit_events` (see SECURITY.md) |
| `0019_product_events.sql` | `product_events` (system-generated only — see SECURITY.md) |
| `0020_requirement_evaluation.sql` | Phase 69: adds `title`/`structured_rule`/`data_status`/`last_checked_at` to `university_requirements` and retypes its `requirement_type` from free text to the `requirement_category` enum; adds `student_requirement_evaluations` (per-student met/likely_met/not_met/unknown/needs_manual_review, see `lib/requirements/`) |
| `0021_benchmarking_indexes.sql` | Phase 19: `profiles(graduation_year)` / `profiles(curriculum)` partial indexes for cohort lookups (see `lib/benchmarking/`) — no new tables; peer benchmarking is computed on read, not persisted |
| `0022_missing_fk_indexes.sql` | Index audit: 9 foreign-key columns across 7 tables that had no covering index (see the migration's own header comment for the full list and reasoning) |
| `0023_social_v1.sql` | V1 social scope (Phase 4/Chat 2): adds `is_public`/`looking_for` to `profiles`, the `public_profiles` security-definer view (narrow column whitelist, never the raw row), and `connections` (mutual-consent request/accept, `pending`/`accepted`/`declined`) — see SECURITY.md's "Social / connections" section |
| `0024_fix_connection_privacy_leak.sql` | Chat 3: restricts `public_profiles`' connection carve-out to `accepted` (either direction) or `pending` where the caller is the recipient — closes a real privacy vulnerability, see `docs/known-issues.md` |
| `0025_function_search_path_hardening.sql` | Chat 3: pins `search_path` on `set_updated_at()` (a Supabase security-linter finding) — no new tables |

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

**Phase 69 (per-program requirement checklist)** follows the same principle. The operating
instructions for this pass suggested three new tables (`university_program_requirements`,
`requirement_sources`, `student_requirement_evaluations`). `university_requirements`
already exists as Phase 35's canonical entity for exactly this concept — creating a second,
near-identical table alongside it would be the same kind of fragmentation Phase 58
explicitly avoided elsewhere, so `0020_requirement_evaluation.sql` extends it (adds
`title`, `structured_rule`, `data_status`, `last_checked_at`; retypes `requirement_type` to
a real enum) instead. A separate `requirement_sources` table was also skipped —
`university_sources` already plays that role per-university, and `university_requirements`
already carries its own `source_url`/`retrieved_at`/`data_confidence` inline, so a third
source-tracking table would duplicate both without a clear independent purpose. Only
`student_requirement_evaluations` (the one genuinely new concept — a per-student
evaluation, which has no existing home) was added as a new table.

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
`0017_fix_missing_score_rls.sql`; re-run in this pass across all 43 tables including the
new `student_requirement_evaluations`, no further gaps found).

## Index coverage

Every foreign-key column across all 22 migrations was cross-checked against every index
(a table's leading column, not just an exact single-column match) in this pass — the same
method as the RLS audit, applied to indexes. Found 9 real gaps, closed in
`0022_missing_fk_indexes.sql`. Re-run this after adding any new FK column:

```bash
python3 -c "
import re, glob
files = sorted(glob.glob('supabase/migrations/*.sql'))
text = '\n'.join(open(f).read() for f in files)
tables = {}
for m in re.finditer(r'create table public\.(\w+)\s*\(', text):
    start = m.end(); depth = 1; i = start
    while depth > 0 and i < len(text):
        depth += 1 if text[i] == '(' else -1 if text[i] == ')' else 0
        i += 1
    tables[m.group(1)] = text[start:i]
fks = [(t, m.group(1)) for t, b in tables.items() for m in re.finditer(r'^\s*(\w+)\s+uuid(?:\s+not null)?\s+references\s+public\.\w+\(', b, re.M)]
covered = {}
for m in re.finditer(r'create(?:\s+unique)?\s+index\s+\S+\s+on\s+public\.(\w+)\s*\(([^)]*)\)', text, re.I):
    covered.setdefault(m.group(1), set()).add(m.group(2).split(',')[0].strip().split()[0])
for t, b in tables.items():
    for m in re.finditer(r'^\s*(\w+)\s+uuid\s+primary key', b, re.M):
        covered.setdefault(t, set()).add(m.group(1))
missing = [(t, c) for t, c in fks if c not in covered.get(t, set())]
print('Missing:', missing or 'none')
"
```

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
