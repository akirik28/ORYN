-- advisor_conversations.summary/summarized_at are single-writer (lib/advisor/retention.ts's
-- admin client, the 24h inactivity retention job -- itself BUILT, DELIBERATELY NOT ARMED, see
-- that file's own header) but the table's own RLS (migration 0014's blanket "owner full
-- access", `for all using (user_id = auth.uid()) with check (user_id = auth.uid())`) has no
-- column scope. `title` is correctly user-editable through that same policy (renaming a
-- conversation -- and, as of this same night, lib/advisor/conversation-title.ts's own
-- first-message derivation writes it too) -- but nothing in RLS/GRANT stops a student's own
-- UPDATE from smuggling a rewrite of summary/summarized_at in the same statement. Found by the
-- permissive-update-policy sweep (docs/permissive-update-policy-sweep-2026-09-04.md §3),
-- flagged there as "the cheapest of these to close correctly" -- lower stakes than that sweep's
-- other findings (rewriting your own AI-generated summary doesn't grant privilege or mislead a
-- third party the way §1/§4 do), but the identical class, closed the same way this repo has
-- now closed it twice on parent_links (migrations 0116/0118).
--
-- No security definer here, unlike parent_links_guard_immutable_columns: this trigger never
-- needs to see another user's row, only the caller's own (RLS's owner policy already scopes
-- reads/writes to that), so there's no cross-user visibility need driving a role switch --
-- current_user correctly reflects the actual caller here, matching
-- opportunity_matches_guard_computed_columns' own original, uncomplicated pattern (migration
-- 0086) directly rather than needing parent_links' auth.uid()-based workaround.
create or replace function public.advisor_conversations_guard_admin_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if pg_catalog.pg_trigger_depth() <= 1 and current_user <> 'service_role' then
    new.summary := old.summary;
    new.summarized_at := old.summarized_at;
  end if;
  return new;
end;
$$;

-- Column-scoped (`update of summary, summarized_at`), matching opportunity_matches_guard_
-- computed_columns' own precedent rather than parent_links' blanket `before update` -- this
-- table has a THIRD column (title) that must never be touched by this trigger at all, so
-- scoping to exactly the two admin-only columns means an ordinary "rename my conversation"
-- UPDATE never even fires this function, rather than firing it and relying on the body to
-- leave title alone.
create trigger advisor_conversations_00_guard_admin_columns
  before update of summary, summarized_at on public.advisor_conversations
  for each row execute function public.advisor_conversations_guard_admin_columns();
