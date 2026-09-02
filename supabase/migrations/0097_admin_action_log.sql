-- Admin action log (2026-09-02): the shared "log it" infrastructure oryn-a7 asked to hold
-- every operational admin action to, starting with plan-tier changes and built to be reused
-- by every later action in the same package (trial grant/end, allowance reset, opportunity
-- disable, job trigger) rather than rebuilt per action.
--
-- The founder's own stated pain this exists to fix: they had to ask oryn-a7 to run raw SQL
-- twice to set their own plan_tier to 'ultra', and once it silently affected zero rows with
-- neither of them knowing why. A log entry that always gets written on success (never
-- inferred from "the row must have changed, probably") is the direct answer to that: an
-- admin can always see whether their own action actually did something, and later, who
-- changed what.
--
-- Generic on purpose -- one `action` text column plus a jsonb `detail`, not a table per
-- action type. The five actions on the roadmap (set_plan_tier, grant_trial, end_trial,
-- reset_ai_allowance, disable_opportunity, trigger_job) share nothing structurally beyond
-- "an admin did something, to something, with this detail" -- a table per action would mean
-- a migration for every future admin action just to gain an audit trail it should have had
-- from the first one.
--
-- admin_id/target_user_id both `on delete set null`, deliberately not `on delete restrict`:
-- spec Phase 12 requires real account deletion, and an audit log must never become the
-- reason a deletion request can't complete (the same principle migration 0058's own header
-- states for global data -- "do not create cascading deletion capable of unexpectedly
-- destroying data" applies here in the opposite direction: an unrelated table must not block
-- deletion either). admin_label/target_label are point-in-time snapshots (display name,
-- taken when the row is written) so the log stays human-readable after either account is
-- gone -- an audit trail that goes blank the moment the person it describes is deleted has
-- failed at the one job it exists for.
--
-- No RLS policy at all, matching provider_health/external_sync_jobs (migration 0014's own
-- comment: "ops tables get no policy at all -- service-role access only"). Every write goes
-- through createAdminClient() from inside a requireAdmin()-gated Server Action, same trust
-- boundary as every other admin write in app/(app)/admin/actions.ts; there is no path by
-- which a normal authenticated client should ever read or write this table.
create table if not exists public.admin_action_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  admin_label text not null,
  action text not null,
  target_user_id uuid references public.profiles(id) on delete set null,
  target_label text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.admin_action_log is
  'Append-only record of operational admin actions (2026-09-02) -- who did what, to whom, with what result. Written on every successful mutating admin action; never edited or deleted by the app. See this migration''s own header for why admin_id/target_user_id are nullable with a denormalized label alongside each.';
comment on column public.admin_action_log.action is
  'A short machine key, e.g. ''set_plan_tier'' -- not a free-text description. The UI/report layer is responsible for turning this plus `detail` into a readable sentence.';
comment on column public.admin_action_log.detail is
  'Action-specific structured detail, e.g. {"from":"standard","to":"ultra"} for set_plan_tier. Never a place for content that shouldn''t outlive the row it describes -- see spec Phase 76''s "avoid logging sensitive student document content."';

create index if not exists admin_action_log_created_at_idx on public.admin_action_log (created_at desc);
create index if not exists admin_action_log_target_user_id_idx on public.admin_action_log (target_user_id) where target_user_id is not null;

alter table public.admin_action_log enable row level security;
