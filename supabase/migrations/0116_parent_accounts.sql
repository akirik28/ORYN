-- Parent accounts, P1 (schema + RLS) — 2026-09-04. NOT YET APPLIED, per this repo's own
-- standing discipline: the founder runs this by hand in the morning. Zero live writes were
-- made producing this file.
--
-- Spec: docs/veli-hesabi-spec-2026-09-04.md. Founder, verbatim: "veli hesabı bir karar
-- veremeyecek... asla ama asla bir şey değiştirememesi lazım" (a parent account can never
-- make a decision, can never, ever change anything). This migration is P1 of seven parallel
-- lanes — five others are blocked on the exact shape below, assigned by CEO as the shared
-- contract; the table/column names are intentionally exactly what the spec's own §5 already
-- settled, not re-derived here.
--
-- Migration number 0116 assigned by CEO (four number collisions happened earlier tonight).

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. profiles: which side of the relationship this account is on
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists account_role text not null default 'student'
  check (account_role in ('student', 'parent'));

comment on column public.profiles.account_role is
  'Which kind of account this is -- ''student'' (default, everyone today) or ''parent''. A
  parent account is created through the invite flow (P4), never by signing up directly as one
  -- nothing in this migration enforces that by itself; the signup/invite-acceptance code path
  -- is what must never set this to ''parent'' outside that flow. G7 (spec): a parent account
  -- requires a linked student account (see parent_links below); a student account never
  -- requires a parent one.';

alter table public.profiles
  add column if not exists parent_invite_email text;

comment on column public.profiles.parent_invite_email is
  'The parent/guardian email address a STUDENT gave at signup or in Settings (G12) -- never
  the parent''s own input, this column lives on the student''s row. Purely a mailing address
  for P4''s invite flow; the actual grant of access is parent_links below, and setting this
  column alone grants nothing. Nullable: collecting it is additive to existing accounts, not
  retroactively required.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. parent_links: the actual grant, double-confirmed
-- ═══════════════════════════════════════════════════════════════════════════
--
-- K3 (spec): a typo'd email must never hand a stranger a child's profile, and access without
-- the STUDENT's own consent sits in the middle of the open legal question in spec §4. So the
-- flow is two-sided and the student holds the final switch: they supply the address (P4
-- sends the invite), the invited person creates a parent account and a 'pending' row appears
-- -- data flows to nobody yet -- and only the STUDENT moving it to 'active' turns on any
-- access at all. A parent can revoke their own access; a parent can never self-activate one,
-- which is the one transition the RLS policies below are built specifically to prevent.

create table if not exists public.parent_links (
  id uuid primary key default gen_random_uuid(),
  parent_user_id uuid not null references auth.users(id) on delete cascade,
  student_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'revoked')),
  invited_email text,
  invited_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (parent_user_id, student_user_id)
);

comment on table public.parent_links is
  'One row per parent<->student relationship, K3''s double-confirmation state machine:
  pending (invited, no access) -> active (student confirmed, read access granted) -> revoked
  (either side ended it). No row, or a non-active row, must ever be treated as granting
  anything -- see is_active_parent_of() below, the single function every parent-read policy
  in this file goes through, so that check lives in exactly one place.';
comment on column public.parent_links.invited_email is
  'A copy of the address the invite was actually sent to, kept even if profiles.
  parent_invite_email is later edited -- this row is the historical record of THIS specific
  invite, not a live pointer to whatever the student''s settings currently say.';
comment on column public.parent_links.status is
  'pending: invited, zero access, the default. active: the student has confirmed -- the ONLY
  status that is_active_parent_of() treats as granting anything. revoked: access ended by
  either party; a revoked link is never reactivated by an UPDATE, a new invite creates a new
  row (unique(parent_user_id, student_user_id) means a revoked link must be deleted by an
  admin path before a genuine re-invite could reuse the same pair -- deliberately not
  something student-facing RLS allows; see the guard trigger below).';

create index if not exists parent_links_parent_user_id_idx on public.parent_links (parent_user_id);
create index if not exists parent_links_student_user_id_idx on public.parent_links (student_user_id);
create index if not exists parent_links_status_idx on public.parent_links (status);

alter table public.parent_links enable row level security;

-- Both sides of a relationship can see that it exists and its status -- this table holds no
-- data about the STUDENT beyond an email address and a state machine, so symmetric read
-- access here is not the privacy question; every other policy in this file is.
drop policy if exists "parties can view their own link" on public.parent_links;
create policy "parties can view their own link"
  on public.parent_links for select
  to authenticated
  using (parent_user_id = auth.uid() or student_user_id = auth.uid());

-- A student may create ONLY their own pending invite -- never pre-set to active (that would
-- skip their own confirmation step), never naming someone else as the student.
drop policy if exists "student can create their own pending invite" on public.parent_links;
create policy "student can create their own pending invite"
  on public.parent_links for insert
  to authenticated
  with check (student_user_id = auth.uid() and status = 'pending');

-- The student's own confirm-or-revoke switch. USING scopes which rows they can touch at all;
-- WITH CHECK scopes what the row is allowed to become -- pending is deliberately absent from
-- the allowed target list, so a student can move a link forward (to active) or end it (to
-- revoked), never back to pending.
drop policy if exists "student can confirm or revoke their own link" on public.parent_links;
create policy "student can confirm or revoke their own link"
  on public.parent_links for update
  to authenticated
  using (student_user_id = auth.uid())
  with check (student_user_id = auth.uid() and status in ('active', 'revoked'));

-- The parent's only write on this table, ever: give up their own access. Deliberately does
-- NOT allow a parent to move a row toward 'active' -- self-activation is exactly the
-- shortcut K3 exists to close, and this policy's own WITH CHECK is what closes it at the
-- database level, not just in whatever UI a later lane builds.
drop policy if exists "parent can revoke their own link" on public.parent_links;
create policy "parent can revoke their own link"
  on public.parent_links for update
  to authenticated
  using (parent_user_id = auth.uid())
  with check (parent_user_id = auth.uid() and status = 'revoked');

-- No delete policy anywhere on this table -- RLS defaults to deny, so nobody but the
-- service role can hard-delete a link. A relationship's history (it existed, it was revoked,
-- when) is worth keeping, the same append-over-delete posture admin_action_log (migration
-- 0097) already established for a different actor pair.

-- Defense in depth against the two UPDATE policies above being technically satisfiable while
-- also smuggling a change to an identity column in the same statement (e.g. a student's
-- "confirm" UPDATE also silently repointing parent_user_id at a different account). Same
-- shape as posts_guard_system_columns (migration 0058): restores every column an UPDATE
-- policy was never meant to let move, unconditionally, so the two policies above only ever
-- need to reason about `status`.
create or replace function public.parent_links_guard_immutable_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.parent_user_id := old.parent_user_id;
  new.student_user_id := old.student_user_id;
  new.invited_email := old.invited_email;
  new.invited_at := old.invited_at;
  new.created_at := old.created_at;
  new.updated_at := now();
  -- confirmed_at records the moment the STUDENT confirmed the link -- only the student's own
  -- UPDATE (auth.uid() = student_user_id) may move it. Without this guard, the parent's own
  -- "revoke my own access" UPDATE has nothing stopping it from also smuggling a confirmed_at
  -- edit in the same statement: neither UPDATE policy's WITH CHECK constrains this column,
  -- since it isn't part of what either policy actually gates (status is). confirmed_at has no
  -- bearing on is_active_parent_of() -- only status does -- so this closes a metadata-integrity
  -- gap, not an access-control one, but the founder's own wording ("asla ama asla bir şey
  -- değiştirememesi") reads broadly enough that a parent silently rewriting ANY column, even a
  -- cosmetic timestamp, is worth closing while this trigger is already open.
  if auth.uid() is distinct from old.student_user_id then
    new.confirmed_at := old.confirmed_at;
  end if;
  return new;
end;
$$;

drop trigger if exists parent_links_00_guard_immutable_columns on public.parent_links;
create trigger parent_links_00_guard_immutable_columns
  before update on public.parent_links
  for each row execute function public.parent_links_guard_immutable_columns();

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. is_active_parent_of() — the one gate every parent-read policy/function below uses
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Same pattern as is_blocked_between/is_profile_public (migration 0058): SECURITY DEFINER,
-- boolean-only, revoked from public, granted to authenticated. Centralizing "does the
-- calling user have real, confirmed access to this student" here is K2's whole point --
-- every policy and function past this line spends zero lines re-deriving what "active"
-- means, so there is exactly one place to get it right and exactly one place to test it.
create or replace function public.is_active_parent_of(p_student uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.parent_links
    where parent_user_id = auth.uid()
      and student_user_id = p_student
      and status = 'active'
  );
$$;
revoke all on function public.is_active_parent_of(uuid) from public;
grant execute on function public.is_active_parent_of(uuid) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Direct read-only RLS grants — tables with no student-authored free text
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Safe for a plain row-level policy on the real table: every column on these three tables is
-- either a foreign key, a system-computed score/label, or a system reason code (`unknown[]`
-- populated by the scoring engine, never typed by the student). G2's "fırsatlar" (fit-ranked
-- opportunities) and half of "neyi geliştirmeli" (what needs improving) map directly here.
-- Only ever SELECT -- no INSERT/UPDATE/DELETE policy for the parent role exists anywhere in
-- this file, on any table, which is G1 enforced the way K2 demands: an absent policy, not a
-- hidden button.

drop policy if exists "active parent can view child's opportunity matches" on public.opportunity_matches;
create policy "active parent can view child's opportunity matches"
  on public.opportunity_matches for select
  to authenticated
  using (public.is_active_parent_of(user_id));

drop policy if exists "active parent can view child's profile scores" on public.profile_scores;
create policy "active parent can view child's profile scores"
  on public.profile_scores for select
  to authenticated
  using (public.is_active_parent_of(user_id));

drop policy if exists "active parent can view child's profile score snapshots" on public.profile_score_snapshots;
create policy "active parent can view child's profile score snapshots"
  on public.profile_score_snapshots for select
  to authenticated
  using (public.is_active_parent_of(user_id));

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Curated read functions — tables/columns that DO carry the student's own words
-- ═══════════════════════════════════════════════════════════════════════════
--
-- K1, enforced structurally rather than by policy discipline alone: profiles carries
-- advisor_instructions (a free-text standing instruction to the advisor) alongside plain
-- identity fields, and target_universities/applications both carry a free-text `notes`
-- column alongside their status/date fields. A row-level policy cannot hide one column while
-- allowing another on the same table -- Postgres RLS filters ROWS, not columns, and this
-- product's "parent" and "student" are the same underlying `authenticated` role, so a
-- column-level GRANT (which is role-wide) can't tell them apart either. A SECURITY DEFINER,
-- table-returning function is the only mechanism here that makes column exposure structural:
-- its own SELECT list IS the whitelist, and a column added to the underlying table next
-- month cannot silently start flowing through a function that never mentions it -- unlike a
-- table-shaped RLS policy, which would leak it by default. Every function below checks
-- is_active_parent_of() itself, in its own WHERE clause; none of them is reachable through a
-- table-level policy, because none of the underlying tables gets one for the parent role.
--
-- `notes` on target_universities/applications, and advisor_instructions on profiles, are
-- accordingly never returned by anything in this file. This is a judgement call this
-- migration is making, not something spec.md's G2 names field-by-field -- flagged plainly:
-- G2 asks for status/fit/what-needs-improving, all structured; the excluded columns are the
-- ones a student typed in their own words about the same subject, and K1's own reasoning
-- (a 14-18-year-old writes differently when they know a parent can read it) does not
-- obviously stop at "advisor chat" specifically. Reversible in either direction if the
-- founder wants notes included.

create or replace function public.get_parent_child_profile(p_student uuid)
returns table (
  display_name text,
  graduation_year integer,
  curriculum text,
  country text,
  school_name text,
  plan_tier text,
  onboarding_completed boolean,
  completeness_percent integer,
  profile_strength_score integer
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.display_name,
    p.graduation_year,
    p.curriculum::text,
    p.country,
    p.school_name,
    p.plan_tier,
    p.onboarding_completed,
    p.completeness_percent,
    p.profile_strength_score
  from public.profiles p
  where p.id = p_student
    and public.is_active_parent_of(p_student);
$$;
revoke all on function public.get_parent_child_profile(uuid) from public;
grant execute on function public.get_parent_child_profile(uuid) to authenticated;

comment on function public.get_parent_child_profile(uuid) is
  'G2''s "durum" (status): identity/progress fields only. Deliberately excludes
  advisor_instructions (K1, explicit), birth_year (more precise than a parent needs and not
  requested by G2), first_name/last_name (display_name already answers "who is this"),
  citizenship_countries/city/*_entity_id (not requested), preferred_language/timezone/
  response_mode/ultra_gift_expires_at/ultra_welcome_seen_at/target_geographies/
  weekly_time_budget/busy_mode*/onboarding_step/is_admin/is_public/looking_for/headline/
  about/open_to (irrelevant to this feature). Returns zero rows, not an error, for a caller
  with no active link -- callers must treat empty as "not authorized or not found",
  indistinguishable on purpose (the same reasoning RLS itself uses everywhere else in this
  product: a denied row and a nonexistent row must look identical to the caller).';

create or replace function public.get_parent_child_target_universities(p_student uuid)
returns table (
  id uuid,
  university_id uuid,
  program_id uuid,
  status text,
  academic_fit_score integer,
  profile_fit_score integer,
  outlook text,
  estimate_range_low numeric(5,4),
  estimate_range_high numeric(5,4),
  outlook_confidence text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    t.id, t.university_id, t.program_id, t.status::text,
    t.academic_fit_score, t.profile_fit_score, t.outlook::text,
    t.estimate_range_low, t.estimate_range_high, t.outlook_confidence::text,
    t.created_at, t.updated_at
  from public.target_universities t
  where t.user_id = p_student
    and public.is_active_parent_of(p_student);
$$;
revoke all on function public.get_parent_child_target_universities(uuid) from public;
grant execute on function public.get_parent_child_target_universities(uuid) to authenticated;

comment on function public.get_parent_child_target_universities(uuid) is
  'G2''s "üniversiteler". Excludes target_universities.notes -- see this file''s §5 header for
  why a notes column never appears in any function here.';

create or replace function public.get_parent_child_applications(p_student uuid)
returns table (
  id uuid,
  target_university_id uuid,
  application_type text,
  deadline date,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    a.id, a.target_university_id, a.application_type::text, a.deadline,
    a.status::text, a.created_at, a.updated_at
  from public.applications a
  where a.user_id = p_student
    and public.is_active_parent_of(p_student);
$$;
revoke all on function public.get_parent_child_applications(uuid) from public;
grant execute on function public.get_parent_child_applications(uuid) to authenticated;

comment on function public.get_parent_child_applications(uuid) is
  'G2''s "son başvurular". Excludes applications.notes -- see this file''s §5 header.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Explicit non-grants — K1, written down so a future migration does not "complete
--    the picture" by accident
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Nothing below this line is a code change; it is the list K1 names, confirmed still true
-- after this migration, so the absence reads as a decision rather than an oversight:
--
--   advisor_conversations, advisor_messages  -- no parent policy anywhere; already
--     RLS-enabled, owner-only. A student's advisor chat is where spec §K1 says the hardest,
--     most honest writing happens, and it stays exactly as unreadable to a parent as it is
--     to any other student.
--   feedback_reports  -- already has no SELECT policy for `authenticated` at all (migration
--     0113, service-role/admin-read only) -- a parent gets nothing here by construction,
--     nothing new needed.
--   evidence_files  -- no parent policy on the table, and no function in §5 reads it. A
--     parent can see (via get_parent_child_target_universities/applications) THAT something
--     has a status, never the evidence file itself.
--   weekly_actions / weekly_plans  -- deliberately not given a parent-read function in this
--     pass. weekly_actions carries reflection_note/reflection_outcome on the same row as its
--     plan/status fields, the identical "can't hide one column via RLS" problem §5 solves
--     for profiles/target_universities/applications -- staged for P5 (spec: "haftalık AI
--     yorumu", which needs its own curated shape anyway) rather than built twice.
