-- Professional Profile & Networking Pack, Batch C. `skills` already exists (migration
-- 0004) — adds only what's missing: a dedup constraint (none existed) and endorsements.

create unique index if not exists skills_user_name_idx on public.skills (user_id, lower(name));

-- Endorsement authorization mirrors messages' own INSERT policy exactly (migration
-- 0027): accepted connection required, neither party blocked, and — specific to
-- endorsements — the endorser can't be the skill's own owner. Same "the UI not offering
-- the button isn't the security boundary" reasoning; this is enforced in the database,
-- not just in the Server Action that also re-checks it for a friendly error.
create table public.skill_endorsements (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills(id) on delete cascade,
  endorser_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (skill_id, endorser_id)
);
create index skill_endorsements_skill_idx on public.skill_endorsements(skill_id);
create index skill_endorsements_endorser_idx on public.skill_endorsements(endorser_id);

alter table public.skill_endorsements enable row level security;

-- Row-level only, same reasoning as contact_info/featured_items: endorsement counts
-- need to be visible to anyone who can see the skill (public profile or self — the same
-- canViewPortfolio gate skills already use), which isn't a static per-row RLS predicate.
-- Cross-user reads for display go through a server-only function using the admin
-- client, gated by that same check. This policy is the real backstop for direct access:
-- an endorser can always see endorsements they personally gave, and anyone can see
-- endorsements on their own skills.
create policy "select own or given endorsements" on public.skill_endorsements
  for select using (
    endorser_id = auth.uid()
    or exists (select 1 from public.skills s where s.id = skill_id and s.user_id = auth.uid())
  );

create policy "endorse a connection's skill" on public.skill_endorsements
  for insert with check (
    endorser_id = auth.uid()
    and endorser_id <> (select user_id from public.skills where id = skill_id)
    and exists (
      select 1 from public.connections c
      join public.skills s on s.id = skill_id
      where c.status = 'accepted'
        and ((c.requester_id = auth.uid() and c.recipient_id = s.user_id)
          or (c.requester_id = s.user_id and c.recipient_id = auth.uid()))
    )
    and not public.is_blocked_between(auth.uid(), (select user_id from public.skills where id = skill_id))
  );

create policy "withdraw own endorsement" on public.skill_endorsements
  for delete using (endorser_id = auth.uid());
