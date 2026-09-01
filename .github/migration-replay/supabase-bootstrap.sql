-- Minimal stand-in for the schemas, roles and publication that Supabase provisions on a
-- new project BEFORE any repo migration runs. Used only by
-- .github/workflows/migrations.yml to replay supabase/migrations/** against a bare
-- Postgres container.
--
-- This is NOT a Supabase replica. It creates exactly the platform-owned objects that
-- supabase/migrations/** actually reference, and nothing else — so if a future migration
-- starts depending on some other piece of Supabase (a new schema, an extension, a
-- GoTrue column), the replay job fails and tells us, which is the point. Resist the urge
-- to broaden it speculatively; add only what a real migration provably needs.
--
-- Verified dependency surface as of migration 0073: auth.users(id), auth.uid(),
-- storage.buckets, storage.objects, storage.foldername(), the anon/authenticated/
-- service_role roles, and the supabase_realtime publication. (0073 adds a policy using
-- auth.uid() on an existing table and needed nothing new here -- bumped anyway, because
-- the note below is about a header that was accurate when written and went stale in
-- silence, and "it didn't need anything" is exactly when that happens.)

create extension if not exists pgcrypto;

-- The three PostgREST roles that RLS policies are granted to.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin noinherit bypassrls; end if;
end $$;

create schema if not exists auth;
create schema if not exists storage;

-- Only `id` is referenced (profiles.id FKs to it, migration 0002); the rest of GoTrue's
-- column set is irrelevant to schema replay.
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  created_at timestamptz not null default now(),
  -- Real Supabase carries raw_user_meta_data (jsonb) and raw_app_meta_data on auth.users;
  -- verified against the live project rather than assumed. Migration 0072 reads
  -- raw_user_meta_data to backfill profiles.terms_accepted_at, and without the column here
  -- the replay failed on main with "column u.raw_user_meta_data does not exist" — a gap in
  -- this stub, not a defect in the migration.
  --
  -- Note the shape of that failure: this file's own header claims a "verified dependency
  -- surface as of migration 0067", so it was correct when written and silently went stale
  -- the moment a later migration reached for something new. Anything added here should be
  -- re-verified against the live project's information_schema, not copied from memory.
  raw_user_meta_data jsonb,
  raw_app_meta_data jsonb
);

-- On Supabase this reads the request JWT. Locally it reads a GUC, so a pgTAP-style test
-- can impersonate a user via set_config('request.jwt.claim.sub', <uuid>, true).
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid,
  created_at timestamptz not null default now()
);
alter table storage.objects enable row level security;

create or replace function storage.foldername(name text) returns text[] language sql immutable as $$
  select string_to_array(name, '/')
$$;

-- Migrations 0015 and 0058 create RLS policies on storage.objects for the per-user
-- evidence and post-media buckets.
grant usage on schema public, auth, storage to anon, authenticated, service_role;

-- Supabase ships Realtime enabled, so this publication exists on every new project.
-- Migration 0031 runs `alter publication supabase_realtime add table public.messages`
-- and hard-fails without it, taking every later migration down with it.
do $$ begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;
