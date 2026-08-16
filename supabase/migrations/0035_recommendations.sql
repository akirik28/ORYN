-- Professional Profile & Networking Pack, Batch D.

create type recommendation_relationship as enum ('teacher', 'mentor', 'teammate', 'project_collaborator', 'colleague', 'other');
create type recommendation_status as enum ('visible', 'hidden');

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  relationship recommendation_relationship not null,
  body text not null check (char_length(body) between 1 and 3000),
  status recommendation_status not null default 'visible',
  created_at timestamptz not null default now(),
  constraint recommendations_no_self check (author_id <> recipient_id)
);
create index recommendations_recipient_idx on public.recommendations(recipient_id, status);
create index recommendations_author_idx on public.recommendations(author_id);

alter table public.recommendations enable row level security;

create policy "select involved recommendations" on public.recommendations
  for select using (author_id = auth.uid() or recipient_id = auth.uid());

-- Same accepted-connection + not-blocked shape as messages (0027) and skill_endorsements
-- (0034) — the third and last place this exact authorization rule is needed in this
-- schema.
create policy "write recommendation for accepted connection" on public.recommendations
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.connections c
      where c.status = 'accepted'
        and ((c.requester_id = auth.uid() and c.recipient_id = recommendations.recipient_id)
          or (c.requester_id = recommendations.recipient_id and c.recipient_id = auth.uid()))
    )
    and not public.is_blocked_between(auth.uid(), recipient_id)
  );

-- RLS is row-level, not column-level: this policy allows the recipient to UPDATE a row
-- they're the recipient of, but cannot itself restrict *which columns* they touch in
-- that update. "Recipient can only toggle status, never edit body/relationship/author"
-- is enforced by the Server Action only ever sending { status } on this path
-- (app/(app)/profile/recommendation-actions.ts) — documented here so the gap between
-- what this policy technically permits and what the product guarantees is explicit, not
-- assumed.
create policy "recipient toggles visibility" on public.recommendations
  for update using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- No delete policy for the recipient at all — hiding is the only recipient-side removal
-- action, matching "recipient metni değiştiremesin" and giving the author the only real
-- delete path, same as how connections/messages already draw this kind of line.
create policy "author deletes own recommendation" on public.recommendations
  for delete using (author_id = auth.uid());

-- Reuse the existing moderation system (migration 0027/0030) rather than building a
-- parallel one for recommendations — message_reports already has an admin queue, a
-- review-state model, and RLS; message_id was already nullable (a report doesn't have
-- to reference a specific message), so a second, equally-nullable reference column is
-- the minimal extension. Table name is unchanged (a rename would touch the admin panel,
-- exports, and existing tests for no functional benefit) — it now means "a report about
-- a message or a recommendation", documented here rather than renamed.
alter table public.message_reports add column recommendation_id uuid references public.recommendations(id) on delete set null;
