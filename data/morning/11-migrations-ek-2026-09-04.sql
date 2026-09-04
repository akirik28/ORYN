-- ═══════════════════════════════════════════════════════════════════════════
-- PROXOLA — 4 Eylül EK paketi
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⚠ ÖNCE 09'U ÇALIŞTIR. Bu dosya 09'un üzerine geliyor.
--   09 içinde 0116 var; buradaki değişiklikler o migration'ın oluşturduğu
--   tabloya dayanıyor. 09 çalışmadıysa bu dosya kendini durdurur ve hiçbir şey
--   uygulanmaz — zararsız, ama sırayı takip et.
--
-- İÇİNDEKİLER
--   1. Migration 0117 — veli e-postası pop-up'ının kendi kapatma sayacı
--   2. Migration 0118 — veli haftalık yorumu için tarih sütunu + koruma
--   3. Doğrulama
--
-- Aynı kural: yeni sekme, Cmd+A, Delete, tamamını yapıştır, Run.
-- Dosya `commit;` ile biter. İki kez çalıştırmak zararsız.
--
-- Canlı veritabanına hiçbir yazma yapılmadı.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ═══════════════════════════════════════════════════════════════════════════
-- 0. Ön koşul — 09 uygulandı mı?
-- ═══════════════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (select 1 from information_schema.tables
    where table_schema='public' and table_name='parent_links') then
    raise exception E'\n\n09 numarali paket henuz uygulanmamis.\nOnce 09-migrations-2026-09-04.sql calistir, sonra bunu.\nHicbir sey uygulanmadi.\n';
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Migration 0117
-- ═══════════════════════════════════════════════════════════════════════════

-- Dismissal state for the dashboard "add your parent's email" prompt (founder, verbatim,
-- docs/veli-hesabi-spec-2026-09-04.md §1: "loginlerde çocukların veli maillerini almamız
-- değer kazanıyor ... pop outlar burda da olsun" -- collecting a parent's email at login is
-- valuable, there should be pop-ups for this too). The collection mechanism itself (the
-- optional signup field, the Settings section) already shipped in P4 -- this is the missing
-- half: prompting a student who skipped it.
--
-- Four columns, not a reuse of upgrade_prompt_* (migration 0093) -- same shape, deliberately
-- separate storage. Reusing those columns would mean a student dismissing the advisor's
-- "upgrade to Ultra" prompt mid-chat silently suppresses this completely unrelated
-- "add your parent's email" prompt on the dashboard, and vice versa: two independent asks,
-- same person, same row, sharing one dismissal clock. CEO's own framing, 2026-09-04: "that's
-- a real bug, not untidiness" -- a dismissal of one prompt would quietly cost the product
-- the other, with no error anywhere to notice by. lib/parent/email-prompt.ts re-exports the
-- shared pure dismissal functions from lib/advisor/upgrade-prompt.ts (matching
-- lib/parent/upgrade-prompt.ts's own established re-export pattern for the P7 prompt) --
-- only the STORAGE is new here, not the policy mechanics.
--
-- Same three-tier policy as upgrade_prompt_* (soft/not-now/forever), same 7-day soft window,
-- same escalate-to-permanent-on-a-second-later-month-decline rule -- see that migration's
-- own header for the full policy reasoning, unchanged here.
--
-- Absence (unapplied) reads as "not yet dismissed," matching upgrade_prompt_*'s own choice
-- for the same reason: this prompt has an independent cap regardless of database state (a
-- client-side sessionStorage "shown once per browser session" guard, matching
-- features/advisor/advisor-chat.tsx's own UPGRADE_PROMPT_SESSION_KEY pattern), so
-- "absence -> can show" costs at most one bounded appearance per session while unapplied,
-- never an unbounded repeat.
alter table public.profiles
  add column if not exists parent_email_prompt_soft_dismissed_until timestamptz,
  add column if not exists parent_email_prompt_not_now_at timestamptz,
  add column if not exists parent_email_prompt_not_now_count integer not null default 0,
  add column if not exists parent_email_prompt_dismissed_forever boolean not null default false;

comment on column public.profiles.parent_email_prompt_soft_dismissed_until is
  'Parent-email dashboard prompt (2026-09-04). Set on a passive dismiss (the small close, no explicit choice) to now() + 7 days; suppressed until this time. NULL means no active soft suppression. Independent of upgrade_prompt_soft_dismissed_until (migration 0093) -- see this migration''s own header for why the two must not share storage.';
comment on column public.profiles.parent_email_prompt_not_now_at is
  'Timestamp of the most recent explicit "Not now" click on the parent-email prompt. NULL means never explicitly declined. Suppresses through the end of the calendar month this falls in.';
comment on column public.profiles.parent_email_prompt_not_now_count is
  'How many times "Not now" has been explicitly clicked on the parent-email prompt, ever. A second click in a genuinely later calendar month escalates to permanent (parent_email_prompt_dismissed_forever).';
comment on column public.profiles.parent_email_prompt_dismissed_forever is
  'Permanent opt-out of the parent-email dashboard prompt. Once true, nothing shows it again -- the way back is the existing Settings "Parent account" section, reachable regardless of this flag, not a toggle this column gates.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Migration 0118
-- ═══════════════════════════════════════════════════════════════════════════

-- One column for P5's windowing (docs/veli-hesabi-spec-2026-09-04.md — founder, verbatim:
-- "aiın her hafta çocuklarının gelişimini yorumlaması için premium almaları gereksin... o
-- hafta olan" — the AI should comment on their children's development every week, focused on
-- what's new that week). Schema half only; content assembly is lib/digest/parent-commentary.ts.
--
-- BUILT, DELIBERATELY NOT ARMED -- same posture as digest_email_enabled/last_digest_sent_at
-- (migration 0114), advisor_conversation_retention (migration 0112): the mechanism exists and
-- is inspectable, nothing sends. No email-sending infrastructure exists anywhere in this
-- codebase (same standing fact migration 0114 already recorded), and the same İYS/consent
-- question applies here with an extra dimension 0114 didn't have: this content is ABOUT a
-- minor, addressed to their guardian, not to the minor themselves -- one more reason sending
-- stays a founder decision made after counsel, not a default this migration enables.
--
-- WHY THIS COLUMN LIVES ON parent_links, NOT profiles (the digest's own last_digest_sent_at
-- lives on profiles, and that asymmetry is deliberate, not an oversight worth "simplifying"
-- later): a student gets exactly one digest, so one column on their own row is the whole
-- window. A PARENT'S commentary window is a property of ONE RELATIONSHIP, not one account --
-- §5's own unique(parent_user_id, student_user_id) already establishes that a parent can hold
-- more than one link (lib/tier/parent-tier.ts's header makes the identical point about
-- effective tier), so a parent linked to two children needs two independent clocks, one per
-- child. Putting this on profiles would force a single column to answer "since when" for
-- potentially several different parents watching the same student, or force a parent's two
-- children's commentary onto the same cadence -- neither is what "her hafta çocuklarının
-- gelişimini" (every week, [about] their children's development, plural) actually asks for.
-- A parent linked to a second child mid-week also must not inherit the first child's window
-- and read a month of backlog as "new this week" -- a fresh link starts at null, exactly like
-- a first link does, per this column's own null semantics below.
alter table public.parent_links add column if not exists last_commentary_sent_at timestamptz;

comment on column public.parent_links.last_commentary_sent_at is
  'When commentary about THIS student was last generated for THIS parent -- never written on a dry run (lib/digest/parent-commentary.ts''s future batch runner, matching lib/digest/run.ts''s own dryRun contract exactly). Null means never generated, which is every row today since nothing arms this job -- read by resolveParentWeeklyCommentary''s `since` parameter as "everything currently eligible counts as new," not as an error or a zero-width window. Deliberately per-link, not per-student (see this migration''s own header) -- a parent linked to more than one child gets an independent clock for each.';

-- ═══════════════════════════════════════════════════════════════════════════
-- The guard trigger (migration 0116) doesn't know this column exists -- it was written
-- before this migration did. Restated in full here (CEO, 2026-09-04, checking a question from
-- b9): the same "asla ama asla" hole this repo already closed once on confirmed_at, reopened
-- by adding a column after the trigger that was supposed to guard every column stopped being
-- the last word on the table's own shape. A parent's own legitimate revoke UPDATE has nothing
-- stopping it from also smuggling an edit to last_commentary_sent_at in the same statement --
-- neither UPDATE policy's WITH CHECK constrains this column, the identical gap confirmed_at
-- had before 0116 closed it. Set null, and the next run treats a month of backlog as new this
-- week; set far-future, and commentary is suppressed. Neither touches is_active_parent_of()
-- (only status does), so this is the same metadata-integrity class as confirmed_at's own gap,
-- not an access-control one -- closed for the same reason: the founder's "asla ama asla bir
-- şey değiştirememesi" reads broadly enough to cover a parent silently rewriting any column,
-- not just the ones that gate access.
--
-- The obvious copy of opportunity_matches_guard_computed_columns' own
-- `current_user <> 'service_role'` pattern (migration 0086) is wrong here, not merely
-- unnecessary -- and it matters that this is written down, not just fixed silently, because
-- the next person who needs this exact pattern will reach for that same precedent first.
-- That function has no `security definer`; this one does. Postgres's `current_user` reflects
-- whoever is CURRENTLY active for permission-checking, and a `security definer` function
-- runs as its OWNER for that purpose -- so `current_user` inside THIS function would read the
-- function owner (whoever ran this migration), never the caller, regardless of whether the
-- caller connected as `authenticated` or `service_role`. A naive copy would make the new
-- guard's condition permanently false, silently never firing on a parent's write, then also
-- never firing on the runner's own -- pure coincidence, not a correct check either way, and
-- exactly the kind of pattern-reuse-without-checking-the-precondition mistake this comment is
-- long enough to make sure the next reader doesn't repeat.
--
-- `session_user` isn't the fix either, for a different reason: Supabase's own PostgREST
-- connects once as a single fixed low-privilege role and does `SET ROLE`/`SET LOCAL ROLE` per
-- request -- session_user reflects the ORIGINAL connection role for the life of the session
-- (unaffected by SET ROLE), which is that one fixed role always, never `authenticated` or
-- `service_role` specifically, for any request.
--
-- `auth.uid()` sidesteps both problems, because it isn't a Postgres role-privilege primitive
-- at all -- it reads a transaction-local GUC (`request.jwt.claims`) via `current_setting`,
-- which `security definer`'s role-switch has no effect on, the exact reason this same
-- function's own existing confirmed_at guard already uses it safely. CEO's own message
-- confirms the empirical fact this leans on: the admin client (createAdminClient(), what the
-- batch runner uses) presents `auth.uid()` as null -- no per-user JWT, no `sub` claim. Every
-- genuine `authenticated` caller reaching this trigger at all already has a real `auth.uid()`
-- (every UPDATE policy on this table requires `to authenticated` with a real
-- parent_user_id/student_user_id match, which is impossible without one) -- so "null" and
-- "the runner" are the same case here, not two cases that happen to overlap today.
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
  -- last_commentary_sent_at (migration 0118): only a caller with NO auth.uid() at all -- the
  -- batch runner, via the admin client -- may move it. Every real authenticated caller
  -- (parent or student) is frozen out unconditionally; unlike confirmed_at, no session-scoped
  -- caller ever legitimately writes this column at all, so there's no identity to carve out
  -- for, only one to exclude.
  if auth.uid() is not null then
    new.last_commentary_sent_at := old.last_commentary_sent_at;
  end if;
  return new;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Migration 0122 — danışman sohbet özetini kullanıcı yazamasın
-- ═══════════════════════════════════════════════════════════════════════════

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


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Doğrulama
-- ═══════════════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='profiles'
      and column_name='parent_email_prompt_dismissed_forever') then
    raise exception E'\n\nEKSIK: profiles.parent_email_prompt_* sutunlari\nHicbir sey uygulanmadi.\n';
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='parent_links'
      and column_name='last_commentary_sent_at') then
    raise exception E'\n\nEKSIK: parent_links.last_commentary_sent_at\nHicbir sey uygulanmadi.\n';
  end if;
  -- Korumanin gercekten yeni sutunu de kapsadigini dogrula (0118, CEO 2026-09-04).
  if not exists (select 1 from pg_proc
    where proname='parent_links_guard_immutable_columns'
      and prosrc like '%last_commentary_sent_at%') then
    raise exception E'\n\nEKSIK: koruma yeni sutunu kapsamiyor.\nHicbir sey uygulanmadi.\n';
  end if;
  raise notice '─────────────────────────────────────────────';
  raise notice '0117 YERINDE — profiles.parent_email_prompt_* (4 sutun)';
  raise notice '0118 YERINDE — parent_links.last_commentary_sent_at';
  raise notice 'KORUMA  YERINDE — veli bu sutunu degistiremez';
  raise notice 'Gonderim hala KAPALI. Hicbir is zamanlanmadi.';
  raise notice '─────────────────────────────────────────────';
end $$;

commit;
