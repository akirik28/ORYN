-- Manual live-verification script for migration 0121 (profiles_guard_protected_columns,
-- extended to plan_tier/ultra_gift_expires_at/account_role) -- same shape and same reason as
-- supabase/tests/parent_links_rls_manual.sql: not pgTAP (never confirmed present in any
-- environment this repo has run in), run each block by hand (psql, the Supabase SQL editor,
-- or the Supabase MCP's execute_sql) against a disposable project/branch. NOT YET RUN --
-- written and staged, matching 0121's own scope note: applying a guard-trigger change to a
-- table the whole product already depends on, and deciding where to run this proof, are both
-- calls for whoever is actually driving the live database, not this migration's author alone.
--
-- Method: `set local role authenticated` + `select set_config('request.jwt.claims', ...)`
-- simulates a real logged-in user for RLS purposes, scoped to one transaction/one simple-query
-- batch -- the same mechanism connection_privacy_manual.sql and parent_links_rls_manual.sql
-- already established, reused rather than reinvented. Every block below is an ATTEMPTED WRITE,
-- not a read of whether a button is hidden -- CEO's own standard, restated from
-- parent_links_rls_manual.sql's header because it applies unchanged here.
--
-- Threat model this proves, specifically: a student's own UPDATE to their profile is
-- legitimate on its face (e.g. changing display_name from Settings) -- the risk was never a
-- client with an obviously malicious payload, it's the same request shape as any real save,
-- with three extra fields appended. Block 2 below sends exactly that shape.

-- ---------------------------------------------------------------------------
-- 1. Setup: one disposable auth user, Erin -- a student on the free tier, about to attempt a
--    self-upgrade through her own "save profile" request.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('e1000000-0000-0000-0000-00000000e1e1', 'erin-p1@test.local');

update public.profiles
set display_name = 'Erin', account_role = 'student', plan_tier = 'standard', ultra_gift_expires_at = null
where id = 'e1000000-0000-0000-0000-00000000e1e1';

-- ---------------------------------------------------------------------------
-- 2. As Erin (an ordinary authenticated user, her own row) -- the smuggled self-upgrade.
--    A real, legitimate field change (display_name) in the SAME statement as three fields no
--    student-facing code path is ever supposed to send.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"e1000000-0000-0000-0000-00000000e1e1","role":"authenticated"}', true);

update public.profiles
set
  display_name = 'Erin Updated',
  plan_tier = 'ultra',
  ultra_gift_expires_at = '2099-01-01T00:00:00Z',
  account_role = 'parent'
where id = 'e1000000-0000-0000-0000-00000000e1e1';

select
  display_name as erins_legitimate_field_after_smuggle_attempt___expect_erin_updated,
  plan_tier as erins_plan_tier_after_smuggle_attempt___expect_standard_unchanged,
  ultra_gift_expires_at as erins_gift_expiry_after_smuggle_attempt___expect_null_unchanged,
  account_role as erins_account_role_after_smuggle_attempt___expect_student_unchanged
from public.profiles where id = 'e1000000-0000-0000-0000-00000000e1e1';
-- If the guard held: the legitimate field moved (proving this isn't a blanket freeze that
-- would also break normal profile edits -- the failure mode CEO named for parent_links, "a
-- trigger that blocks everyone is a different bug that looks safe," checked here in the
-- other direction) while all three protected fields did not move at all, not even partially.
-- Before this migration: this exact statement was a free Ultra upgrade -- plan_tier and
-- ultra_gift_expires_at would both have moved, either one alone sufficient for
-- resolvePlanTier() to return "ultra" (lib/tier/plan-tier.ts).

-- The other three protected columns from 0062/0063, confirmed untouched by the same guard,
-- same statement shape, so this migration's new columns aren't the only thing proven --
-- the pre-existing three still work exactly as before.
update public.profiles
set display_name = 'Erin Updated Again', is_admin = true, profile_strength_score = 999, completeness_percent = 999
where id = 'e1000000-0000-0000-0000-00000000e1e1';

select
  is_admin as erins_is_admin_after_smuggle_attempt___expect_false_unchanged,
  profile_strength_score as erins_strength_score_after_smuggle_attempt___expect_null_unchanged,
  completeness_percent as erins_completeness_after_smuggle_attempt___expect_0_unchanged
from public.profiles where id = 'e1000000-0000-0000-0000-00000000e1e1';

-- ---------------------------------------------------------------------------
-- 3. As the admin action path (service_role) -- the OTHER direction this guard has to prove:
--    app/(app)/admin/actions.ts's grantUltraGift/setPlanTier writers must still land. A guard
--    that blocks the founder from granting Ultra is a different bug that looks safe (CEO,
--    2026-09-04, said of this exact migration before it was written).
-- ---------------------------------------------------------------------------
-- Real Supabase grants service_role BYPASSRLS -- if this is being run against a hand-rolled
-- local role that doesn't have it yet, `alter role service_role bypassrls;` first, or this
-- block tests the wrong thing (RLS denying the row, not the trigger allowing the column).
reset role;
set local role service_role;
select set_config('request.jwt.claims', '{}', true); -- no sub claim at all -- auth.uid() is null, exactly what createAdminClient() presents.

update public.profiles
set plan_tier = 'ultra', ultra_gift_expires_at = '2099-01-01T00:00:00Z', account_role = 'parent'
where id = 'e1000000-0000-0000-0000-00000000e1e1';

select
  plan_tier as erins_plan_tier_after_admin_grant___expect_ultra,
  ultra_gift_expires_at as erins_gift_expiry_after_admin_grant___expect_2099,
  account_role as erins_account_role_after_admin_grant___expect_parent
from public.profiles where id = 'e1000000-0000-0000-0000-00000000e1e1';
-- true/landed here is the direction "the wall must not also block the legitimate writer" --
-- see block 2 above for the OTHER direction (an authenticated student's own smuggle attempt,
-- frozen). Both must pass for this migration to be correct; either one alone is a different
-- bug wearing this fix's clothes.

-- ---------------------------------------------------------------------------
-- 4. Cleanup. RESET ROLE first -- block 3 leaves the session as service_role, which can do
--    this cleanup fine, but do it explicitly rather than relying on session end, matching the
--    footgun parent_links_rls_manual.sql documents finding by actually running that script.
-- ---------------------------------------------------------------------------
reset role;

delete from auth.users where id = 'e1000000-0000-0000-0000-00000000e1e1';
select count(*) as remaining_test_profile___expect_0
from public.profiles where id = 'e1000000-0000-0000-0000-00000000e1e1';

-- ---------------------------------------------------------------------------
-- 5. Mutation map -- which line each block above actually depends on. Comment out the named
--    line, re-run only the listed block, confirm the expectation flips from PASS to FAIL. Not
--    "this looks right" but "this breaks when the thing protecting it is removed" (CEO's own
--    standard, restated from parent_links_rls_manual.sql because it applies unchanged here).
-- ---------------------------------------------------------------------------
-- Block 2 (Erin cannot smuggle plan_tier): remove `new.plan_tier := old.plan_tier;` from
--   profiles_guard_protected_columns -- erins_plan_tier_after_smuggle_attempt flips from
--   standard to ultra. This is the single highest-stakes mutation in this file: it is the
--   exact live state this migration replaces.
-- Block 2 (Erin cannot smuggle ultra_gift_expires_at): remove
--   `new.ultra_gift_expires_at := old.ultra_gift_expires_at;` -- erins_gift_expiry_after_
--   smuggle_attempt flips from null to 2099-01-01. Either this mutation or the one above alone
--   is sufficient to grant Erin Ultra (lib/tier/plan-tier.ts's resolvePlanTier() checks both),
--   which is why 0121 fixes them together rather than one at a time.
-- Block 2 (Erin cannot smuggle account_role): remove
--   `new.account_role := old.account_role;` -- erins_account_role_after_smuggle_attempt flips
--   from student to parent.
-- Block 2 (the pre-existing three still guarded): remove any of the three original
--   reassignments (is_admin/profile_strength_score/completeness_percent) -- the matching
--   assertion flips from unchanged to Erin's smuggled value. Regression check on 0062/0063,
--   not a new claim.
-- Block 3 (the admin path must still land): change
--   `current_user <> 'service_role'` to `current_user <> 'nobody'` (i.e. simulate the
--   "obvious but wrong" fix that freezes every column from everyone, including service_role)
--   -- every ___expect_* assertion in block 3 flips from landed to unchanged. This is the
--   failure mode CEO named explicitly for parent_links and warned against by name for this
--   migration before it was written: "a trigger that blocks everyone is a different bug that
--   looks safe."
