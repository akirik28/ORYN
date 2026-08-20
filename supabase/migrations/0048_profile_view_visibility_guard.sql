-- Fixes an RLS gap found during a Claude B audit (2026-08-20,
-- docs/handoffs/claude-b-2026-08-20-session.md): "record own view" (migration 0036) only
-- checked viewer_id = auth.uid(), never that the viewed profile is actually visible to the
-- viewer. Any authenticated user could directly call Supabase to insert a profile_views row
-- against an arbitrary private profile UUID, confirming its existence and writing a spam
-- view -- the app-layer notFound() in app/(app)/u/[id]/page.tsx was the only real gate,
-- inconsistent with this codebase's own defense-in-depth discipline everywhere else
-- (sendMessage, sendConnectionRequest, respondToConnectionRequest all re-check server-side
-- for the same reason -- a Server Action/RLS gap is directly callable). Low severity
-- (write/enumeration only, no row content is ever readable back -- profile_views' own
-- SELECT policy already restricts to viewed_user_id = auth.uid()) but real and previously
-- untested.
--
-- SECURITY DEFINER is required, not a plain subquery: profiles' own SELECT RLS is
-- self-only ("select own profile", migration 0014), so a plain
-- `exists(select 1 from profiles where id = viewed_user_id and is_public)` inside another
-- table's WITH CHECK would evaluate under the *viewer's* row-visibility rules and always
-- return no rows for anyone else's profile -- silently breaking every legitimate view of a
-- public stranger's profile, not just closing the gap. Same pattern as is_blocked_between
-- (migration 0027): runs as owner, returns only a boolean, never row content.
create or replace function public.can_record_profile_view(viewed uuid, viewer uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = viewed and is_public = true
  )
  or exists (
    select 1 from public.connections
    where status = 'accepted'
      and ((requester_id = viewer and recipient_id = viewed)
        or (requester_id = viewed and recipient_id = viewer))
  );
$$;
revoke all on function public.can_record_profile_view(uuid, uuid) from public;
grant execute on function public.can_record_profile_view(uuid, uuid) to authenticated;

drop policy "record own view" on public.profile_views;
create policy "record own view" on public.profile_views
  for insert with check (
    viewer_id = auth.uid()
    and public.can_record_profile_view(viewed_user_id, auth.uid())
  );
