-- The admin panel's course correction, 2026-09-02: founder wants a control panel, not a report
-- ("ben bana yönetmede çok çok yardımcı olacak bir sayfa istiyorum"). The first two write-capable
-- actions this unblocks (disabling `3f7170ba` "AI Scholars", CEO's own decision) already landed
-- via manual SQL tonight, with zero record of who made the change or why -- the exact,
-- concretely-demonstrated gap this table exists to close. Not a general-purpose audit system:
-- scoped to the four catalog-health actions docs/catalog-health-actions-design-2026-09-02.md
-- designed (apply-cleanup, disable/flag an opportunity, queue-reverification), extensible to more
-- by adding a new `action` value, not a new table.
--
-- Written, NOT applied -- house pattern. Every one of the four actions this table exists to
-- record is itself unbuilt until this migration is live, so there is no code path anywhere that
-- can write to this table today; nothing degrades because nothing yet depends on it existing.
--
-- `admin_user_id` has no `on delete cascade`/`set null` decision made here on purpose -- an
-- admin's own account being deleted should not silently orphan or destroy the record of what
-- they did; `restrict` (the default) is the correct default until a real admin-offboarding
-- flow exists to make that call deliberately.
create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.profiles(id),
  action text not null,
  target_table text not null,
  target_id uuid not null,
  reason text,
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz not null default now()
);

comment on table public.admin_actions is
  'Field-level audit trail for admin-panel write actions (2026-09-02 course correction). Written by the same request that performs the mutation it records -- never a separate best-effort call after. See docs/catalog-health-actions-design-2026-09-02.md.';

create index if not exists admin_actions_target_idx on public.admin_actions (target_table, target_id);
create index if not exists admin_actions_admin_user_idx on public.admin_actions (admin_user_id);

alter table public.admin_actions enable row level security;

-- Admins can read the full log (accountability has to be visible to the people it's about);
-- nothing here grants a normal student row access, since RLS with no policy for a role denies
-- by default -- the same posture every other admin-only table in this schema already takes.
create policy "admins can read admin_actions" on public.admin_actions
  for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Insert only via the service-role client (every admin Server Action already uses
-- createAdminClient(), same as removeReportedPost/restoreReportedPost) -- no authenticated-role
-- INSERT policy at all, matching this schema's own established convention for system-written
-- tables (notifications, ai_usage) rather than trusting a client-side admin_user_id.
