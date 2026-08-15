-- Security fix: profile_scores and profile_score_snapshots were created in
-- 0009_scoring.sql but never picked up by 0014_row_level_security.sql's table lists —
-- found during a full-table RLS audit (every `create table` in supabase/migrations
-- cross-checked against every table covered by a policy). Without RLS enabled, these
-- would be readable — and writable — by any authenticated request, not just the owner.
-- New migration rather than editing 0014, per this repo's migration discipline (past
-- migrations are never silently rewritten).

alter table public.profile_scores enable row level security;
create policy "owner full access" on public.profile_scores for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.profile_score_snapshots enable row level security;
create policy "owner full access" on public.profile_score_snapshots for all using (user_id = auth.uid()) with check (user_id = auth.uid());
