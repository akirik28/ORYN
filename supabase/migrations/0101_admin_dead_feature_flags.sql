-- Admin-recorded "confirmed dead" flags for product features (growth panel, 2026-09-02).
-- Record + display only, deliberately not enforcement -- docs/admin-panel-architecture-
-- 2026-09-02.md's own D8 draws this line: "the panel reads and renders... enforcement
-- lives in [the relevant library]... the rule that stops a call is never split between a
-- screen and a library." Marking a feature here is a documented decision (who, when, why)
-- that a human reads before building on top of that feature again -- it does not gate,
-- disable, or otherwise change any runtime behavior.
--
-- `feature_key` is free text, not a foreign key or enum, deliberately: today's candidates
-- are product_events.event_name values (e.g. "research_project_started"), but the same
-- table should hold a judgment about any admin-legible feature identifier without a
-- migration every time the candidate set changes.

create table public.admin_dead_feature_flags (
  feature_key text primary key,
  marked_by uuid references public.profiles(id) on delete set null,
  marked_at timestamptz not null default now(),
  note text
);

-- Ops/admin-decision data, not a student's own data -- same posture as provider_health and
-- external_sync_jobs (migration 0014): RLS enabled, zero policies, so only the admin
-- (service_role) client can read or write it. No authenticated-user policy is added here.
alter table public.admin_dead_feature_flags enable row level security;
