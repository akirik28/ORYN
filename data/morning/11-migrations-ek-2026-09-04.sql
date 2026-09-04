-- ═══════════════════════════════════════════════════════════════════════════
-- PROXOLA — 4 Eylül EK paketi
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⚠ ÖNCE 09'U ÇALIŞTIR. Bu dosya 09'un üzerine geliyor.
--   09 içinde 0116 var; buradaki sütun o migration'ın oluşturduğu
--   `parent_links` tablosuna ekleniyor. 09 çalışmadıysa bu dosya hata verir
--   ve hiçbir şey uygulanmaz — zararsız, ama sırayı takip et.
--
-- İÇİNDEKİLER
--   1. Migration 0117 — veli e-postası pop-up'ının kendi kapatma sayacı
--   2. Migration 0118 — veli haftalık yorumu için tarih sütunu
--   3. Doğrulama
--
-- Aynı kural: yeni sekme, Cmd+A, Delete, tamamını yapıştır, Run.
-- Dosya `commit;` ile biter.
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
-- 3. Doğrulama
-- ═══════════════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='parent_links'
      and column_name='last_commentary_sent_at') then
    raise exception E'\n\nEKSIK: parent_links.last_commentary_sent_at\nHicbir sey uygulanmadi.\n';
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='profiles'
      and column_name='parent_email_prompt_dismissed_forever') then
    raise exception E'\n\nEKSIK: profiles.parent_email_prompt_* sutunlari\nHicbir sey uygulanmadi.\n';
  end if;
  raise notice '─────────────────────────────────────────────';
  raise notice '0117 YERINDE — profiles.parent_email_prompt_* (4 sutun)';
  raise notice '0118 YERINDE — parent_links.last_commentary_sent_at';
  raise notice 'Gonderim hala KAPALI. Hicbir is zamanlanmadi.';
  raise notice '─────────────────────────────────────────────';
end $$;

commit;
