-- Chat 4 founder scope update: 1:1 messaging, but ONLY between users with a currently
-- ACCEPTED connection. Not an open-DM network — the connection-privacy invariant this
-- product has already broken and fixed once (migration 0024) extends here: a pending,
-- declined, removed, or blocked relationship must never permit messaging, and the UI not
-- offering a "Message" button is not the security boundary — the same lesson
-- sendConnectionRequest's own comment already states.
--
-- `messages` denormalizes sender_id/recipient_id directly rather than referencing a
-- `conversations` row (or `connections.id` with `on delete cascade`) on purpose: this
-- product's own minor-safe requirement is "do not accidentally destroy evidence needed
-- for abuse reports" when a connection is later removed. `removeConnection`
-- (app/(app)/connections/actions.ts) hard-deletes the connections row — if messages
-- cascaded from that row, disconnecting would silently erase the exact conversation an
-- abuse report might need. Denormalizing means message history survives a deleted
-- connection or a block; only the ability to send a *new* message depends on a live,
-- accepted connection, checked fresh at insert time via the WITH CHECK below.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint messages_no_self check (sender_id <> recipient_id)
);
create index messages_pair_idx on public.messages(least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at);
create index messages_recipient_id_idx on public.messages(recipient_id);
create index messages_sender_id_idx on public.messages(sender_id);

create table public.blocked_users (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint blocked_users_no_self check (blocker_id <> blocked_id),
  constraint blocked_users_unique unique (blocker_id, blocked_id)
);
create index blocked_users_blocker_idx on public.blocked_users(blocker_id);
create index blocked_users_blocked_idx on public.blocked_users(blocked_id);

create table public.message_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  message_id uuid references public.messages(id) on delete set null,
  reason text not null,
  created_at timestamptz not null default now()
);
create index message_reports_reported_user_idx on public.message_reports(reported_user_id);

-- Security-definer, boolean-only helper: the messages INSERT policy needs to know "has
-- either party blocked the other", but blocked_users' own SELECT policy (below) only lets
-- a user see blocks *they* created — correctly, since being able to query "has user X
-- blocked me" would let a blocked user detect and route around the block, and would leak
-- who's blocked whom to a caller who isn't the blocker. A raw subquery in another table's
-- RLS policy is still subject to the referenced table's own RLS as the *caller*, so
-- checking "did the recipient block me" directly would silently evaluate to false no
-- matter what. This function runs as its owner (bypassing that RLS internally) but
-- returns only a boolean — the caller learns whether a block exists, never who blocked
-- whom or any other row content.
create or replace function public.is_blocked_between(user_a uuid, user_b uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.blocked_users
    where (blocker_id = user_a and blocked_id = user_b)
       or (blocker_id = user_b and blocked_id = user_a)
  );
$$;
revoke all on function public.is_blocked_between(uuid, uuid) from public;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;

alter table public.messages enable row level security;

-- Both participants can always read history — deliberately not conditioned on the
-- connection still being accepted or on a block, so old messages survive either (see
-- header comment). This is the one place that's intentional; everywhere else in this
-- file, "accepted and unblocked" gates the action.
create policy "select own messages" on public.messages
  for select using (sender_id = auth.uid() or recipient_id = auth.uid());

create policy "send message to accepted unblocked connection" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.connections c
      where c.status = 'accepted'
        and ((c.requester_id = auth.uid() and c.recipient_id = messages.recipient_id)
          or (c.requester_id = messages.recipient_id and c.recipient_id = auth.uid()))
    )
    and not public.is_blocked_between(auth.uid(), recipient_id)
  );

-- Recipient can mark a message read (the only mutation messages ever get). No update
-- policy exists for the sender, and no delete policy exists for anyone — a sent message
-- is permanent in V1, deliberately: message integrity matters for abuse review, and nothing
-- in the brief asked for edit/unsend.
create policy "recipient marks message read" on public.messages
  for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

alter table public.blocked_users enable row level security;
create policy "select own blocks" on public.blocked_users for select using (blocker_id = auth.uid());
create policy "create own block" on public.blocked_users for insert with check (blocker_id = auth.uid());
create policy "delete own block" on public.blocked_users for delete using (blocker_id = auth.uid());

alter table public.message_reports enable row level security;
-- Insert-only from the client's perspective — same "write-only, not readable back by the
-- reporter or anyone else without a dedicated admin surface" posture as product_events.
-- No admin UI reads this yet (see docs/known-issues.md); the table exists so reports
-- aren't lost while that's built.
create policy "create own report" on public.message_reports for insert with check (reporter_id = auth.uid());

alter type notification_category add value 'message';
