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
-- PROTECTED COLUMNS: `is_admin` only. NOT forgotten -- deliberately narrowed.
--
--   * `is_admin` -- unambiguous. Grants the service-role-backed admin surface above, and
--     has ZERO legitimate writers on the `authenticated` role: nothing in this codebase
--     ever sets it from a normal user session. `current_user <> 'service_role'` is
--     therefore exactly the right test -- it can never collide with a real write.
--
-- `profile_strength_score` and `completeness_percent` WERE included in an earlier version
-- of this migration and were REMOVED before merge -- this is a correction, not an
-- oversight, and the reasoning matters enough to state in full so nobody re-adds them the
-- same way. Both columns are written by `lib/scoring/persist.ts`'s
-- `recomputeCareerProfile()` -- the real, legitimate, runs-on-every-profile-edit
-- score-recompute path -- via `createClient()` (`lib/supabase/server.ts`, the
-- publishable-key client bound to the caller's own session), which authenticates as
-- Postgres role `authenticated`. That is NOT `service_role`. A guard using this
-- migration's role check would therefore reset those two columns on every legitimate
-- recompute too -- not just a forged write -- silently freezing every student's
-- displayed Career Profile score the moment this migration is applied, with no error
-- anywhere: the write "succeeds" (the guard doesn't reject, it resets), the app reports
-- success, and the score just never changes again. That is the exact "confident-sounding
-- claim with nothing behind it" failure class this whole verification package exists to
-- catch, and this migration would have been the one committing it, in the founder's own
-- backlog queue, ready to run. Caught before merge by tracing the actual writer instead
-- of re-reading this file's own reasoning about itself.
--
-- Those two columns are picked back up in migration 0063, paired with moving
-- `recomputeCareerProfile()`'s specific writes to `createAdminClient()` -- at that point
-- the role check becomes correct, for the same reason it already is for `is_admin`: the
-- legitimate path no longer arrives as `authenticated`. Guarding them here, alone, without
-- that companion change, would have been wrong regardless of how the column list read.
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
-- itself updates `profiles` as a nested effect is not blocked by this one. Called as
-- `pg_catalog.pg_trigger_depth()` and the function carries `set search_path = ''` --
-- added on amendment, not in the original merge: unqualified, a function created by a
-- role with `CREATE` on some earlier schema on the search path could shadow the real
-- `pg_trigger_depth()` and silently defeat the guard. Checked live that this is not
-- exploitable today (`has_schema_privilege('authenticated','public','CREATE')` = false,
-- same for `anon`), but the qualification costs one line and removes the class outright
-- rather than resting on today's grants staying that way. Supabase's own linter flags the
-- unqualified form as `function_search_path_mutable`.
--
-- WRITTEN BUT NOT APPLIED, per BUG-1's standing package constraint and because this is a
-- security-critical, founder-gated change. Do not run against a live project without
-- explicit review.

create or replace function public.profiles_guard_protected_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_catalog.pg_trigger_depth() <= 1 and current_user <> 'service_role' then
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;

create trigger profiles_00_guard_protected_columns
  before update of is_admin on public.profiles
  for each row execute function public.profiles_guard_protected_columns();
