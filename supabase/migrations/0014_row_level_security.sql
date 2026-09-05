-- Row Level Security. Default-deny: enabling RLS with no policy blocks every role except
-- the service_role key (used only by lib/supabase/admin.ts for background jobs/admin
-- routes), which bypasses RLS entirely. Every table that stores private student data gets
-- an owner-only policy; global reference tables (universities, opportunities, ...) get a
-- read-only policy for authenticated users; ops tables (provider_health,
-- external_sync_jobs) get no policy at all — service-role access only.

-- ---------- profiles ----------
alter table public.profiles enable row level security;
create policy "select own profile" on public.profiles for select using (id = auth.uid());
create policy "update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------- owner-only tables (user_id = auth.uid(), full CRUD) ----------
do $$
declare
  t text;
  owner_tables text[] := array[
    'education_records', 'courses', 'test_scores',
    'activities', 'awards', 'certifications', 'projects', 'research_experiences',
    'volunteering_experiences', 'work_experiences', 'skills', 'languages',
    'evidence_files', 'student_interests', 'career_goals',
    'target_universities', 'applications', 'application_requirements',
    'opportunity_matches', 'saved_opportunities',
    'weekly_plans', 'weekly_actions', 'ai_recommendations',
    'advisor_conversations', 'advisor_messages'
  ];
begin
  foreach t in array owner_tables loop
    execute format('alter table public.%I enable row level security;', t);
    execute format(
      'create policy "owner full access" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid());',
      t
    );
  end loop;
end $$;

-- ---------- notifications: system-generated, user can read/acknowledge but not create ----------
-- Corrected 2026-09-05 (migration 0135's own investigation): this comment previously also
-- said "delete." The delete policy two lines below is real and has always worked at this
-- layer -- but no Server Action, UI button, or any other application code anywhere in this
-- codebase has ever called it (grepped for any `.from("notifications").delete(`: zero
-- hits). Not a feature that regressed -- one that was never actually built, described here
-- as if it had been since the day this table was created. See migration 0135's own header
-- for the real, separate finding this file's UPDATE policy has (title/body/link/category
-- smuggleable) -- a different gap from this one.
alter table public.notifications enable row level security;
create policy "select own notifications" on public.notifications for select using (user_id = auth.uid());
create policy "update own notifications" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own notifications" on public.notifications for delete using (user_id = auth.uid());

-- ---------- ai_usage: user can view their own usage, never write directly ----------
alter table public.ai_usage enable row level security;
create policy "select own ai usage" on public.ai_usage for select using (user_id = auth.uid());

-- ---------- global reference data: readable by any signed-in user, writes are admin/service-role only ----------
do $$
declare
  t text;
  public_read_tables text[] := array[
    'universities', 'university_programs', 'university_requirements',
    'university_statistics', 'university_deadlines', 'university_sources',
    'opportunities', 'opportunity_sources'
  ];
begin
  foreach t in array public_read_tables loop
    execute format('alter table public.%I enable row level security;', t);
    execute format(
      'create policy "authenticated read" on public.%I for select to authenticated using (true);',
      t
    );
  end loop;
end $$;

-- ---------- ops tables: no policies at all — service_role (bypasses RLS) only ----------
alter table public.provider_health enable row level security;
alter table public.external_sync_jobs enable row level security;
