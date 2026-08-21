-- Social layer: posts, likes, reposts (LinkedIn-shaped). Founder-directed, 2026-08-21.
--
-- ============================================================================
-- NOT YET APPLIED. Deliberately.
-- ============================================================================
-- The entire feature ships switched OFF: no route, no navigation entry, no link from any
-- existing page, and a server-side kill switch (`ORYN_ENABLE_SOCIAL_FEED`, see
-- lib/social/posts-feature-flag.ts) that every data-layer entry point asserts before it
-- touches the database. This migration is written so the schema is reviewable and ready,
-- NOT so it can be run today. Applying it is a founder decision gated on the legal
-- review items recorded in docs/founder-blocked-backlog.md §"Social layer (posts /
-- likes / reposts)". Do not apply it as a side effect of applying an earlier backlog
-- migration.
--
-- Relationship to the existing 1:1 messaging code (lib/messaging/*, `connections`,
-- `messages`, `message_reports`): the social layer is a DIFFERENT SHAPE and is not bolted
-- onto it. What is reused, deliberately:
--   * `connections` as the graph. It is already mutual-consent (request -> accept,
--     migration 0023), which is the whole reason it is the right graph for a product
--     whose users are 14-18: an asymmetric follow graph would let an adult stranger
--     accumulate a minor audience with no consent step. No follow/follower table exists
--     here and none should be added without re-opening that decision.
--   * `is_blocked_between` (migration 0027) as the block predicate — symmetric,
--     security-definer, boolean-only, so a caller can never learn *who* blocked whom.
--   * `message_reports` as the moderation queue, extended with a `post_id` exactly the
--     way migration 0035 extended it with `recommendation_id`. A parallel reports table
--     would mean a second queue, a second review-state model, and a second thing to
--     forget to build an admin surface for.
-- What is NOT reused: nothing about the `messages` table's shape. A post is
-- one-author-to-an-audience with a stored visibility decision; a message is
-- two-participants-with-a-denormalized-pair. Modelling posts as messages-with-extra-nulls
-- would have made the visibility rules below impossible to express in RLS.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- Who can see a post. Note there is NO `world` / anonymous tier: the widest value,
-- `oryn_public`, means "any signed-in Oryn user", never an unauthenticated visitor and
-- never a search-engine-indexable page. That mirrors the deliberately conservative choice
-- migration 0023 already made for `public_profiles` (granted to `authenticated` only, not
-- `anon`) and follows AGENTS.md Phase 12's "avoid public-by-default profiles".
--
-- `posts.visibility` is `not null` WITH NO DEFAULT — on purpose, and this is the single
-- most important line in this file. Every insert must name a visibility, so a minor's
-- post can never become world-readable, or connections-readable, because nobody chose
-- otherwise. A default here (any default) would make the audience an implicit decision.
create type post_visibility as enum ('private', 'connections', 'oryn_public');

-- A repost is its own row referencing the original (LinkedIn's model), not a flag on the
-- original and not a copy of its text. `kind` is redundant with
-- `reposted_post_id is not null` and exists anyway so the two shapes can be constrained
-- separately and read at a glance in a query.
create type post_kind as enum ('original', 'repost');

-- One optional attachment per post. Not a `post_attachments` child table: the product is
-- one media item per post, and a 1:1 child table would buy nothing but a join. Not a
-- `link` kind either — a link is just text in the body.
create type post_attachment_kind as enum ('image', 'document');

-- ---------------------------------------------------------------------------
-- posts
-- ---------------------------------------------------------------------------

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  kind post_kind not null,
  visibility post_visibility not null, -- no default, see the enum comment above
  body text,

  -- ON DELETE CASCADE, and this is a product decision, not a convenience.
  -- When a student deletes a post, every repost of it is deleted too. The alternative
  -- (null out the reference, keep the reposter's commentary as an orphan) was rejected:
  -- a repost's entire visible payload IS the original's body and attachment, so an
  -- orphaned repost is a tombstone pointing at content a minor has explicitly asked to
  -- remove. "Provide deletion" (AGENTS.md Phase 12) has to mean the content stops being
  -- displayed everywhere, not just at its first location. The cost is real and accepted:
  -- a reposter's own commentary is destroyed along with it.
  --
  -- What a "deleted original" therefore renders as: nothing, because the repost is gone
  -- too. The one case the UI still has to handle is a repost whose original is present
  -- but NOT VISIBLE to this particular viewer — the author narrowed visibility after the
  -- repost, blocked the viewer, or a moderator removed it. That renders as a single
  -- neutral "unavailable" placeholder that does not distinguish deleted from
  -- not-visible-to-you, for the same reason `resolveBlockUiState` refuses to distinguish
  -- "they blocked you" from any other unavailability: the distinction is itself a
  -- disclosure. See resolveRepostRender in lib/social/posts-visibility.ts.
  reposted_post_id uuid references public.posts(id) on delete cascade,

  attachment_path text,
  attachment_kind post_attachment_kind,

  -- Denormalized counters. A `count(*)` over post_likes on every feed render is O(likes)
  -- per row per render; these are maintained by the AFTER INSERT/DELETE triggers below
  -- so a feed page is a single-table read. They are NOT client-writable: see
  -- posts_guard_system_columns — RLS is row-level, so the author's own UPDATE policy
  -- would otherwise let them set like_count to whatever they liked.
  like_count integer not null default 0 check (like_count >= 0),
  repost_count integer not null default 0 check (repost_count >= 0),

  -- Edit history. `edit_count`/`edited_at` are the visible "this was edited" marker; the
  -- superseded text itself lands in post_revisions via a trigger. Together these are what
  -- stops an edit from silently rewriting what other people already saw.
  edit_count integer not null default 0 check (edit_count >= 0),
  edited_at timestamptz,

  -- Moderator removal (the enforcement half of the report flow). A removed post stays
  -- visible to its own author — removal must not be silent — and to nobody else. Also
  -- not client-writable; see posts_guard_system_columns.
  removed_at timestamptz,
  removed_by uuid references public.profiles(id) on delete set null,
  removal_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- An original must carry text and must not point at another post.
  constraint posts_original_shape check (
    kind <> 'original'
    or (reposted_post_id is null and body is not null and char_length(btrim(body)) between 1 and 3000)
  ),
  -- A repost must point at another post, may carry commentary or not, and never carries
  -- its own attachment (it displays the original's).
  constraint posts_repost_shape check (
    kind <> 'repost'
    or (
      reposted_post_id is not null
      and (body is null or char_length(btrim(body)) between 1 and 3000)
      and attachment_path is null
      and attachment_kind is null
    )
  ),
  constraint posts_no_self_repost check (reposted_post_id is null or reposted_post_id <> id),
  constraint posts_attachment_shape check ((attachment_path is null) = (attachment_kind is null)),
  constraint posts_removal_shape check ((removed_at is null) = (removed_by is null))
);

-- The feed query is "authors in (me + my accepted connections) order by created_at desc,
-- id desc" with keyset pagination on that same (created_at, id) pair — this index serves
-- it directly. Ordering on created_at (never edited_at) is deliberate: editing an old
-- post must not resurface it at the top of anyone's feed.
create index posts_author_created_idx on public.posts(author_id, created_at desc, id desc);
create index posts_reposted_post_idx on public.posts(reposted_post_id) where reposted_post_id is not null;
create index posts_removed_by_idx on public.posts(removed_by) where removed_by is not null;

create trigger posts_30_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

comment on column public.posts.visibility is
  'Explicit, stored audience decision. NOT NULL with no default so it can never be an '
  'implicit one. private = author only; connections = accepted connections only; '
  'oryn_public = any signed-in Oryn user (never anonymous, never indexable).';

-- ---------------------------------------------------------------------------
-- post_likes
-- ---------------------------------------------------------------------------

-- Idempotency is the PRIMARY KEY, not application code. `(post_id, user_id)` means a
-- double-tap, a retried Server Action, and a replayed request all collapse to one row at
-- the database, so the counter trigger below can never double-count no matter what the
-- caller does. The write path pairs this with `on conflict do nothing` so a repeat like
-- is a success, not an error the UI has to interpret.
create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index post_likes_user_idx on public.post_likes(user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- post_revisions
-- ---------------------------------------------------------------------------

-- Append-only record of every superseded version of a post. Written ONLY by the
-- posts_10_record_revision trigger (there is no INSERT policy on this table at all), and
-- removed only by cascade when the post itself is deleted — so "deletion actually
-- deletes" still holds, edit history included.
--
-- `revision` is the post's edit_count at the moment the version was replaced, so
-- revision 0 is always the text the post was created with.
create table public.post_revisions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  revision integer not null check (revision >= 0),
  body text,
  visibility post_visibility not null,
  attachment_path text,
  attachment_kind post_attachment_kind,
  replaced_at timestamptz not null default now(),
  unique (post_id, revision)
);

-- ---------------------------------------------------------------------------
-- Boolean-only helper: is this profile opted in to being public
-- ---------------------------------------------------------------------------

-- Same rationale as `is_blocked_between` (migration 0027): the `oryn_public` branch of
-- the posts SELECT policy needs to know whether the AUTHOR has opted their profile
-- public, but `profiles` RLS is `select own profile` — a raw subquery on profiles inside
-- another table's policy is evaluated as the *caller*, so it would silently be false for
-- every author except yourself, and the oryn_public tier would never resolve for anyone.
-- This runs as its owner and returns only a boolean.
--
-- Why the double gate at all (post visibility AND profiles.is_public): a student who has
-- never opted into a shareable profile has not opted into an Oryn-wide audience either.
-- Choosing `oryn_public` on a single post should not be able to route around that.
create or replace function public.is_profile_public(p_user uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.profiles where id = p_user and is_public = true);
$$;
revoke all on function public.is_profile_public(uuid) from public;
grant execute on function public.is_profile_public(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Triggers: counters, revisions, system-column guard, nested-repost collapse
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER is required, not decorative. Liking someone else's post has to
-- increment a counter on a row the liker does not own; a trigger function running as the
-- invoking user is still subject to the `posts` UPDATE policy, which scopes updates to
-- the author's own rows. That would not error — it would update ZERO rows and leave the
-- counter permanently at 0 while the likes table filled up. The function runs as its
-- owner (bypassing RLS) and touches exactly one integer column, so the blast radius is
-- the counter and nothing else.
create or replace function public.posts_bump_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
    return new;
  end if;
  -- On DELETE the post may already be gone (a post delete cascades to its likes, and
  -- this AFTER trigger fires afterwards): the UPDATE is a later command in the same
  -- transaction, so the deleted parent row is simply not visible to it and zero rows are
  -- updated. That is the intended no-op, not a missed decrement.
  update public.posts set like_count = like_count - 1 where id = old.post_id;
  return old;
end;
$$;

create trigger post_likes_maintain_count
  after insert or delete on public.post_likes
  for each row execute function public.posts_bump_like_count();

-- Same reasoning as the like counter: reposting someone else's post increments a counter
-- on their row.
create or replace function public.posts_bump_repost_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.reposted_post_id is not null then
      update public.posts set repost_count = repost_count + 1 where id = new.reposted_post_id;
    end if;
    return new;
  end if;
  if old.reposted_post_id is not null then
    update public.posts set repost_count = repost_count - 1 where id = old.reposted_post_id;
  end if;
  return old;
end;
$$;

create trigger posts_maintain_repost_count
  after insert or delete on public.posts
  for each row execute function public.posts_bump_repost_count();

-- LinkedIn collapses a repost-of-a-repost to the root original, and so does this. Without
-- it, chains grow without bound: render depth is unbounded, `repost_count` stops meaning
-- "how many people reposted this", and the cascade-delete reasoning above has to account
-- for arbitrarily deep trees. SECURITY DEFINER so the collapse is guaranteed even if the
-- reposter cannot see the root (they can always see their immediate target — the INSERT
-- policy requires it — but the root may be narrower); it reads one uuid column and
-- nothing else. Pointing at a root the viewer cannot see is fine and expected: the embed
-- renders as the neutral "unavailable" placeholder.
create or replace function public.posts_collapse_nested_repost()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  root uuid;
begin
  if new.reposted_post_id is null then
    return new;
  end if;
  select p.reposted_post_id into root from public.posts p where p.id = new.reposted_post_id;
  if root is not null then
    new.reposted_post_id := root;
  end if;
  return new;
end;
$$;

create trigger posts_00_collapse_nested_repost
  before insert on public.posts
  for each row execute function public.posts_collapse_nested_repost();

-- RLS is row-level, never column-level. The `posts` UPDATE policy below lets an author
-- update their own row, which — without this trigger — would also let them PATCH
-- `like_count` to 9999 through PostgREST, or clear `removed_at` to undo a moderator's
-- removal. Migration 0035 documented this same gap on `recommendations` and left it to
-- the Server Action to send only the safe columns; that is not sufficient here, because
-- one of the columns at risk is the moderation enforcement itself.
--
-- The two escapes are deliberate and narrow:
--   * pg_trigger_depth() > 1 — the UPDATE came from inside another trigger, i.e. one of
--     the counter functions above. A direct client statement is always depth 1.
--   * current_user = 'service_role' — the moderation path. PostgREST does SET LOCAL ROLE
--     from the JWT, so an admin-client call arrives as `service_role`; a normal session
--     arrives as `authenticated`. Note this means a DBA connected as `postgres` is also
--     guarded — intentional; disable the trigger explicitly if you really mean to.
create or replace function public.posts_guard_system_columns()
returns trigger
language plpgsql
as $$
begin
  if pg_trigger_depth() <= 1 and current_user <> 'service_role' then
    new.like_count := old.like_count;
    new.repost_count := old.repost_count;
    new.edit_count := old.edit_count;
    new.edited_at := old.edited_at;
    new.removed_at := old.removed_at;
    new.removed_by := old.removed_by;
    new.removal_reason := old.removal_reason;
    new.author_id := old.author_id;
    new.kind := old.kind;
    new.reposted_post_id := old.reposted_post_id;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

-- Trigger names carry an explicit ordering prefix because Postgres fires same-timing
-- triggers in NAME order and these three are order-dependent: the guard restores
-- edit_count first, the revision trigger then increments it from the restored value, and
-- set_updated_at runs last. Renaming any of them changes behaviour.
create trigger posts_00_guard_system_columns
  before update on public.posts
  for each row execute function public.posts_guard_system_columns();

-- Retains the superseded version whenever the visible content or the audience changes.
-- Visibility changes are recorded too, not just body edits: "who could see this on the
-- day it was reported" is a moderation question, and narrowing visibility after the fact
-- would otherwise erase the answer. SECURITY DEFINER because post_revisions has no INSERT
-- policy for anyone — this trigger is the only writer.
create or replace function public.posts_record_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.body is distinct from old.body
     or new.visibility is distinct from old.visibility
     or new.attachment_path is distinct from old.attachment_path then
    insert into public.post_revisions (post_id, revision, body, visibility, attachment_path, attachment_kind)
    values (old.id, old.edit_count, old.body, old.visibility, old.attachment_path, old.attachment_kind);
    new.edit_count := old.edit_count + 1;
    new.edited_at := now();
  end if;
  return new;
end;
$$;

create trigger posts_10_record_revision
  before update on public.posts
  for each row execute function public.posts_record_revision();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.posts enable row level security;

-- Read. Written so that an unrecognised or `private` visibility falls through every
-- branch and resolves to author-only — fail-closed by construction, not by a final
-- `else false` someone could delete.
--
-- Blocking gates post visibility here, which is a DELIBERATE DIVERGENCE from how blocking
-- behaves on `/u/[id]`: lib/social/public-profile-authorization.ts states, correctly for
-- that surface, that a block scopes to messaging only and a public profile stays as
-- visible to a blocked party as to anyone else. A feed is a different exposure shape — it
-- is repeated and push-style rather than a one-off pull — so a block has to stop it in
-- both directions. The two comments are not in conflict; they describe two surfaces.
create policy "read visible posts" on public.posts
  for select using (
    author_id = auth.uid()
    or (
      removed_at is null
      and not public.is_blocked_between(auth.uid(), author_id)
      and (
        (
          visibility = 'connections'
          and exists (
            select 1 from public.connections c
            where c.status = 'accepted'
              and ((c.requester_id = auth.uid() and c.recipient_id = posts.author_id)
                or (c.requester_id = posts.author_id and c.recipient_id = auth.uid()))
          )
        )
        or (visibility = 'oryn_public' and public.is_profile_public(posts.author_id))
      )
    )
  );

-- Write. Three things are enforced here that application code must not be the only
-- guard for:
--   * counters and moderation state start clean (a forged insert cannot arrive with
--     like_count 500 or a pre-set removed_at);
--   * `oryn_public` requires the author's own profile to be public — the same double
--     gate the read policy applies, checked at write time so the choice fails loudly
--     rather than producing a post nobody can see;
--   * a repost's target must be a post the reposter can actually SEE. The EXISTS
--     subquery runs under this same table's RLS as the caller, so "you cannot repost
--     what you cannot see" is enforced by the read policy itself rather than restated.
create policy "create own post" on public.posts
  for insert with check (
    author_id = auth.uid()
    and like_count = 0
    and repost_count = 0
    and edit_count = 0
    and removed_at is null
    and (visibility <> 'oryn_public' or public.is_profile_public(auth.uid()))
    and (
      reposted_post_id is null
      or exists (select 1 from public.posts o where o.id = posts.reposted_post_id)
    )
  );

-- Author edits their own live post. `removed_at is null` in USING means a
-- moderator-removed post cannot be edited at all — belt and braces with the guard
-- trigger, which already prevents clearing removed_at.
create policy "author edits own post" on public.posts
  for update using (author_id = auth.uid() and removed_at is null)
  with check (author_id = auth.uid());

create policy "author deletes own post" on public.posts
  for delete using (author_id = auth.uid());

alter table public.post_likes enable row level security;

-- Who liked a post is deliberately narrower than the like COUNT, which every viewer of
-- the post sees via posts.like_count. Identities are readable by exactly two parties:
-- the liker (so the UI can render their own like state) and the post's author. A viewer
-- cannot enumerate which of their peers liked a given post — that is a social graph
-- inference this product has no reason to hand out, and AGENTS.md Phase 12's "minimize
-- data collection" cuts against it.
create policy "select own likes" on public.post_likes
  for select using (user_id = auth.uid());

create policy "post author sees its likes" on public.post_likes
  for select using (
    exists (select 1 from public.posts p where p.id = post_likes.post_id and p.author_id = auth.uid())
  );

-- Same "you can only act on what you can see" shape as the repost target check: the
-- EXISTS runs under posts' own read policy as the caller.
create policy "like a visible post" on public.post_likes
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.posts p where p.id = post_likes.post_id)
  );

-- Unlike. No UPDATE policy at all — a like has nothing to update.
create policy "remove own like" on public.post_likes
  for delete using (user_id = auth.uid());

alter table public.post_revisions enable row level security;

-- Author-only. Viewers see "Edited" on the post, not the diff (LinkedIn does the same);
-- moderators read revisions through the service-role client, which bypasses RLS. No
-- INSERT/UPDATE/DELETE policy exists for anyone: the revision trigger is the only writer
-- and cascade-from-posts is the only remover.
create policy "author reads own post revisions" on public.post_revisions
  for select using (
    exists (select 1 from public.posts p where p.id = post_revisions.post_id and p.author_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Moderation: extend the existing queue rather than forking a second one
-- ---------------------------------------------------------------------------

-- Exactly the extension migration 0035 made for recommendations. `message_reports` keeps
-- its name (renaming it would touch the admin panel, the export column allowlist, and
-- existing tests for no functional gain) and now means "a report about a message, a
-- recommendation, or a post".
--
-- ON DELETE SET NULL, matching message_id and recommendation_id: the report row — the
-- reporter's own words about something they saw — survives the reported content being
-- deleted. The moderator then sees "(reported post no longer available)" via
-- resolveReportedContentPreview. That is the deliberate trade: this schema keeps the
-- report and loses the evidence, rather than retaining a copy of a minor's deleted
-- content in a moderation table. Whether that is the right side of the line is one of
-- the legal-review questions recorded in docs/founder-blocked-backlog.md.
alter table public.message_reports add column post_id uuid references public.posts(id) on delete set null;
create index message_reports_post_idx on public.message_reports(post_id) where post_id is not null;

-- ---------------------------------------------------------------------------
-- Storage: post attachments
-- ---------------------------------------------------------------------------

-- Private bucket, same "{auth.uid()}/{filename}" path convention as `evidence` and
-- `cv-uploads` (migration 0015). Note the policies below are OWNER-ONLY for read as well
-- as write — a viewer who is legitimately allowed to see the post still cannot read the
-- object directly. Viewer access is a short-lived signed URL minted server-side by the
-- admin client, and only after the post itself came back from an RLS-filtered read (see
-- lib/social/posts.ts). Putting the audience check in one audited code path is safer than
-- trying to re-express "connections, unless blocked, unless removed" as a storage policy
-- over a path string — and it means no storage policy can ever be the thing that leaks.
insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', false)
on conflict (id) do nothing;

create policy "post-media owner read" on storage.objects for select to authenticated
  using (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "post-media owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "post-media owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);
