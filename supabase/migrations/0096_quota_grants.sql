-- Append-only admin top-up/reset ledger for a student's shared monthly AI allowance
-- (lib/ai/monthly-quota.ts's getMonthlyQuota, lib/ai/limits/budget.ts's selectModelForUser).
-- "A student who legitimately exhausted their month has no recourse today" (oryn-a7,
-- 2026-09-02) -- this is that recourse, without ever editing an ai_usage row. Editing usage
-- rows to "reset" someone would destroy the only honest record of what was actually spent,
-- and this project has spent tonight discovering places where the record and the reality
-- had drifted; a ledger keeps both facts instead. "Reset" and "grant" are the same
-- primitive at the application layer -- a reset is a grant equal to the student's current
-- month-to-date spend -- so there is exactly one table and one write path for both.
--
-- Read by BOTH selectModelForUser (the degrade decision) and getMonthlyQuota (the hard
-- monthly stop), never just one -- a grant relieves both, because a "reset" that still
-- leaves a student stuck on the degraded model would only be half a reset. See
-- lib/ai/limits/grants.ts's own comment.
--
-- Students can read their own grants -- same "select own X" shape as ai_usage
-- (0014_row_level_security.sql, "select own ai usage") -- there is no reason to hide from a
-- student that their allowance was topped up, and getMonthlyQuota itself reads this table
-- through the student's own request-scoped client (not an admin client), so the policy is
-- load-bearing for the feature working at all, not just a courtesy. Writes are service-role
-- only: the admin action goes through createAdminClient(), the same trust boundary as every
-- other admin-only write in this app -- no insert/update/delete policy exists for
-- authenticated users.

create table public.quota_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount_usd numeric(10,4) not null check (amount_usd > 0),
  reason text,
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index quota_grants_user_id_idx on public.quota_grants(user_id, created_at desc);

alter table public.quota_grants enable row level security;
create policy "select own quota grants" on public.quota_grants for select using (user_id = auth.uid());
