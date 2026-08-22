-- Fixes a critical, live privilege-escalation gap found during BUG-1's RLS verification
-- package (2026-08-22, surface 2 — the admin gate). Full evidence:
-- docs/research/verification/rls-live-verification-2026-08-22.md.
--
-- THE GAP: `profiles` carries exactly two RLS policies (migration 0014), both row-scoped
-- only -- `"select own profile"` and `"update own profile"`, `USING (id = auth.uid())`,
-- `WITH CHECK (id = auth.uid())`. Neither restricts WHICH COLUMNS a caller may change on
-- a row they legitimately own; RLS in Postgres gates rows, not columns, unless something
-- else does. Verified live against `oryn-qa-scratch`: QA account B (`is_admin=false`,
-- ordinary student) issued `update profiles set is_admin = true where id = <own id>`
-- through a real authenticated session (real GoTrue sign-in, real anon-key client,
-- exactly the app's own client) and it succeeded -- no error, no rejection. Reverted in
-- the same test run; independently re-confirmed via admin access afterward. `is_admin`
-- is an entirely ordinary `boolean not null default false` column (migration 0002) with
-- no protective trigger and no column-level grant restriction -- checked both before
-- concluding this was exploitable, not assumed.
--
-- BLAST RADIUS: `is_admin` is the sole input to `isAdminProfile()`/`requireAdmin()`
-- (lib/security/is-admin.ts, lib/security/require-admin.ts), which gates `/admin` and
-- every export in `app/(app)/admin/actions.ts`. Every one of those, once past
-- `requireAdmin()`, switches to `createAdminClient()` -- the service-role client, which
-- bypasses RLS entirely. So this is not "an unauthenticated view of a whitelist" (this
-- package's other finding, migration 0061) -- it is full service-role-backed read/write
-- access to the whole schema, self-grantable by any existing account or new signup, with
-- a single API call and no UI. Confirmed live: exactly one admin exists today
-- (`oryn-qa-scratch`), granted deliberately by the founder.
--
-- THE CODEBASE ALREADY KNOWS THIS PATTERN AND HAS NEVER APPLIED IT TO THIS COLUMN.
-- `profiles` itself already carries three column-scoped `BEFORE UPDATE OF <col>` guard
-- triggers (migration 0038, `enforce_canonical_entity_type` on `school_entity_id` /
-- `country_entity_id` / `city_entity_id`) -- the exact mechanism this migration needs,
-- on the exact same table, never extended to the one column that actually matters for
-- privilege. `posts_guard_system_columns` (migration 0058) is the second, closer
-- precedent -- a reset-to-OLD guard for exactly this class of "client-writable in
-- appearance, service-role-owned in fact" column, on a different table. This migration
-- follows that one's shape directly rather than inventing a new one: RESET, not RAISE. A
-- silent no-op on the protected column is safer than an exception -- an error tells an
-- attacker precisely which column is guarded, and a legitimate client PATCHing a whole
-- profile object (most profile writes touch many columns in one request) should not fail
-- outright because one field among many was silently ignored.
--
-- PROTECTED COLUMNS, each justified individually (ORYN-CEO's explicit instruction: be
-- conservative, don't sweep in fields a user legitimately controls):
--
--   * `is_admin` -- unambiguous. Grants the service-role-backed admin surface above.
--
--   * `profile_strength_score` -- computed and written exclusively by
--     `lib/scoring/persist.ts` (`.update({ profile_strength_score: careerProfile.overallScore,
--     ... })`), never by any student-facing form. Displayed everywhere as an Oryn-computed
--     fact, not a self-reported one: the dashboard header, `MobileNav`'s score badge, the
--     monthly-delta calculation (`app/(app)/layout.tsx`, `app/(app)/dashboard/page.tsx`).
--     Also read cross-user by `lib/benchmarking/cohort.ts` for peer-comparison cohorts --
--     an unguarded write here would let one student's self-inflated score pollute another
--     student's benchmarking view, not just their own.
--
--   * `completeness_percent` -- same write-owner (`lib/scoring/persist.ts`), same "presented
--     as computed, not entered" shape. Directly gates a displayed trust signal:
--     `lib/admissions/persist.ts` sets `dataConfidence = completeness_percent >= 60 ?
--     "high" : "medium"` on a student's own admission outlook -- an unguarded write lets a
--     student force their own outlook to display artificial confidence.
--
-- Everything else on `profiles` (first_name through show_gpa, the entity-id fields
-- already guarded by migration 0038 for a different reason, busy_mode*, onboarding_*,
-- is_public, headline/about, ...) is genuinely meant to be student-writable via Settings
-- or onboarding and is deliberately left alone -- guarding a field nobody should have
-- guarded would just be a new bug of the opposite kind.
--
-- SERVICE-ROLE DETECTION: `current_user <> 'service_role'`, identical to
-- `posts_guard_system_columns`. This reads the actual Postgres role the connection
-- authenticated as -- set by PostgREST from the JWT's `role` claim after verifying that
-- JWT's signature against Supabase's own signing key. An ordinary user's session is
-- always signed by GoTrue as `role: authenticated`; only a caller possessing the actual
-- `SUPABASE_SECRET_KEY` can ever cause a connection to authenticate as `service_role`.
-- This is not a claim a client can set inside its own request -- it is which role the
-- database itself believes the connection to be, decided before this trigger ever runs.
-- `pg_trigger_depth() <= 1` is carried over from the same precedent: guards the direct,
-- top-level update only, so a service-role-initiated cascade or a future trigger that
-- itself updates `profiles` as a nested effect is not blocked by this one.
--
-- WRITTEN BUT NOT APPLIED, per BUG-1's standing package constraint and because this is a
-- security-critical, founder-gated change. Do not run against a live project without
-- explicit review.

create or replace function public.profiles_guard_protected_columns()
returns trigger
language plpgsql
as $$
begin
  if pg_trigger_depth() <= 1 and current_user <> 'service_role' then
    new.is_admin := old.is_admin;
    new.profile_strength_score := old.profile_strength_score;
    new.completeness_percent := old.completeness_percent;
  end if;
  return new;
end;
$$;

create trigger profiles_00_guard_protected_columns
  before update of is_admin, profile_strength_score, completeness_percent on public.profiles
  for each row execute function public.profiles_guard_protected_columns();
