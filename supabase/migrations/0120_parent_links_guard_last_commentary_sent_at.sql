-- Guard-trigger column drift, found in a codebase-wide sweep (oryn/guard-trigger-column-
-- drift-2026-09-04): migration 0118 added parent_links.last_commentary_sent_at four hours
-- after 0116 defined parent_links_guard_immutable_columns(). The trigger is an unconditional
-- `before update` (no `of <column list>` restriction), so it already fires on every update to
-- this table -- it simply never learned this column exists, and silently let it through.
--
-- Same shape and same intent as this file's own header comment on 0116's original six: a
-- student's "confirm" UPDATE (`status -> 'active'`) or a parent's "revoke" UPDATE
-- (`status -> 'revoked'`) could smuggle an edit to `last_commentary_sent_at` in the same
-- statement, since neither UPDATE policy's WITH CHECK constrains this column (status is the
-- only thing either policy actually gates). Concretely: a parent could push their own clock
-- forward to suppress ever seeing weekly commentary about a child again, or null it to make
-- the (currently unarmed) batch job re-treat the child's whole history as "new this week."
--
-- Low current stakes, reported plainly rather than oversold: this codebase's only writer of
-- last_commentary_sent_at is lib/digest/parent-commentary.ts's future batch runner, which
-- migration 0118 itself documents as "BUILT, DELIBERATELY NOT ARMED" -- nothing reads or acts
-- on this column today, and parent_links (migration 0116) is itself still staged, not yet
-- applied to any live database. Fixed now, before either the job or the migration ships, which
-- is the cheap side of this bug -- the same drift found live on `profiles` (a separate,
-- higher-severity finding: plan_tier/ultra_gift_expires_at, reported not fixed here) is exactly
-- what this column looks like the day someone arms the job and stops checking.
--
-- CREATE OR REPLACE, not a new trigger: parent_links_00_guard_immutable_columns already fires
-- on every update to this table (0116 defined it as a blanket `before update`, not
-- `before update of <columns>`), so only the function body needs the new line -- the same
-- idiom already used three times in this codebase for the identical situation
-- (opportunity_matches_guard_computed_columns, redefined by 0086 and again by 0115 as its
-- table grew new computed columns).
create or replace function public.parent_links_guard_immutable_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.parent_user_id := old.parent_user_id;
  new.student_user_id := old.student_user_id;
  new.invited_email := old.invited_email;
  new.invited_at := old.invited_at;
  new.created_at := old.created_at;
  new.updated_at := now();
  new.last_commentary_sent_at := old.last_commentary_sent_at;
  -- confirmed_at records the moment the STUDENT confirmed the link -- only the student's own
  -- UPDATE (auth.uid() = student_user_id) may move it. Unchanged from 0116; restated here only
  -- because CREATE OR REPLACE replaces the whole function body, not just the new line.
  if auth.uid() is distinct from old.student_user_id then
    new.confirmed_at := old.confirmed_at;
  end if;
  return new;
end;
$$;

-- Named, not silently inherited from 0116: this function has no `current_user <> 'service_role'`
-- escape hatch at all, unlike every other guard trigger in this codebase (posts_guard_system_
-- columns, profiles_guard_protected_columns, and the rest all check it explicitly). That means
-- even a service-role/admin write can never move parent_user_id, student_user_id, invited_email,
-- invited_at, or created_at on an existing row -- plausibly intentional (this migration's own
-- comment on `status` calls a revoked link's replacement path "delete then re-invite," never
-- "correct in place"), but not a decision this migration makes explicitly, and worth a real
-- product decision before an admin correction tool is ever built against this table. Reported,
-- not resolved here -- resolving it either way is a policy call this migration doesn't own.
