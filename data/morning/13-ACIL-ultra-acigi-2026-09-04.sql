-- ═══════════════════════════════════════════════════════════════════════════
-- PROXOLA — ACİL: Ultra şu an bedava alınabiliyor
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⚠ BUNU İLK ÇALIŞTIR. Diğer paketlerden (09, 11, 12) bağımsız, onları
--   beklemiyor, onlar da bunu beklemiyor. Sıra fark etmez ama bu en acil olan.
--
-- SORUN
--   Bir öğrenci kendi profil satırına doğrudan yazarak kendini Ultra
--   yapabiliyor. Tarayıcının geliştirici araçlarını açan herkes, Ultra'nın
--   bütün özelliklerine ücretsiz erişebilir. Şu an, canlıda.
--
-- SEBEBİ
--   `profiles` tablosunda hangi sütunların kullanıcıya kapalı olduğunu
--   belirleyen bir koruma var. O liste migration 0063'te yazıldı.
--   `plan_tier` ise 3 Eylül'de, Ultra ekonomisi kurulurken eklendi.
--   Koruma o sütunu hiç tanımadı.
--
-- NE DEĞİŞİYOR
--   Koruma artık `plan_tier`, `ultra_gift_expires_at` ve `account_role`
--   sütunlarını da donduruyor. Senin admin panelinden Ultra vermen
--   etkilenmiyor — servis rolü muafiyeti korundu.
--
-- NASIL DOĞRULANDI
--   Gerçek bir Postgres'te 120 migration'ın tamamı uygulandı, sonra aynı
--   yazma denemesi iki kez yapıldı: korumasız `ultra` oldu, korumayla
--   `standard` kaldı. Sonra korumanın dört taşıyıcı satırı tek tek bozuldu
--   ve dördünde de ilgili kontrolün kırmızıya döndüğü görüldü.
--
-- Canlı veritabanına hiçbir yazma yapılmadı.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- Live revenue bypass, found in the same guard-trigger column-drift sweep that produced
-- 0120 (oryn/guard-trigger-column-drift-2026-09-04), confirmed by CEO before this migration
-- was written: `profiles_guard_protected_columns()` (0062, redefined by 0063) still only
-- protects is_admin, profile_strength_score, completeness_percent -- unchanged since
-- 2026-08-22. `plan_tier` and `ultra_gift_expires_at` (added 2026-09-03, the Ultra
-- tier-economics build -- lib/admin/queries.ts's own comment dates them) were never folded
-- in. The "update own profile" RLS policy is a bare `using (id = auth.uid()) with check
-- (id = auth.uid())` -- zero column restriction, the exact permissive shape 0062/0063's own
-- header names as the reason this guard pattern exists at all. Net effect, live, on the only
-- database this product has: a student can PATCH their own profile row and set
-- plan_tier = 'ultra' directly, or push ultra_gift_expires_at into the future to get the same
-- access through the gift path -- either one is a free, self-granted Ultra upgrade. Every
-- legitimate writer of both columns is already `admin.from(...)` (service-role) in
-- app/(app)/admin/actions.ts, matching 0063's own "paired code change" convention -- the fix
-- is mechanically identical to is_admin's own guard, just later.
--
-- account_role (migration 0116) folded in alongside, per CEO: same shape (single writer,
-- already service-role, in lib/parent/links.ts), narrower blast radius (is_active_parent_of()
-- gates real cross-account data access on parent_links.status, never on account_role, so
-- self-setting it only misroutes UI into /parent's shell) but still "a user putting
-- themselves somewhere the product didn't put them," and one line while already here.
--
-- profiles.last_digest_sent_at (migration 0114) is DELIBERATELY NOT included here, per CEO:
-- inert today (the digest job is unarmed -- lib/digest/run.ts's own single writer is a batch
-- runner nothing schedules yet), so there is no current victim, but the reason to write this
-- down rather than silently skip it is that it starts mattering the day that job arms and
-- someone forgets this guard exists. If you are that someone: this column is the same shape
-- as plan_tier was tonight -- single service-role writer, permissive row-scoped RLS, no
-- column guard -- and belongs in a future redefinition of this same function the same way
-- plan_tier just was.
--
-- current_user <> 'service_role' is KEPT, unchanged from 0062/0063 -- and it is the RIGHT
-- check here specifically because this function is plain plpgsql, not security definer.
-- parent_links_guard_immutable_columns() (0116, redefined in 0118) had to use auth.uid()
-- instead, for a reason worth restating rather than assuming this pattern always transfers:
-- it IS security definer, so current_user inside it would read the function owner, never the
-- caller. This function has no such property, so current_user <> 'service_role' has correctly
-- gated every column here since 0062 and keeps doing so for the three added now. Separately,
-- parent_links' five ORIGINAL immutable columns (parent_user_id/student_user_id/invited_email/
-- invited_at/created_at) still have no escape hatch for ANY caller, service-role included --
-- flagged as a policy question by that migration, not fixed there or here. A guard that also
-- blocks app/(app)/admin/actions.ts's own admin.from(...) writes on THIS table is a different
-- bug that looks safe (CEO, 2026-09-04) -- removing or narrowing this check was never on the
-- table.
create or replace function public.profiles_guard_protected_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_catalog.pg_trigger_depth() <= 1 and current_user <> 'service_role' then
    new.is_admin := old.is_admin;
    new.profile_strength_score := old.profile_strength_score;
    new.completeness_percent := old.completeness_percent;
    new.plan_tier := old.plan_tier;
    new.ultra_gift_expires_at := old.ultra_gift_expires_at;
    new.account_role := old.account_role;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_00_guard_protected_columns on public.profiles;
create trigger profiles_00_guard_protected_columns
  before update of is_admin, profile_strength_score, completeness_percent, plan_tier, ultra_gift_expires_at, account_role on public.profiles
  for each row execute function public.profiles_guard_protected_columns();

-- NOT YET RUN against any live database by this migration's author, per this codebase's
-- standing "no writes to shared live state on your own authority" rule -- see
-- supabase/tests/profiles_guard_manual.sql for the both-directions proof (a student's own
-- smuggled write frozen, the admin path's write still landing) CEO asked for, written and
-- staged the same way 0116's own parent_links_rls_manual.sql was: ready to run against a
-- disposable branch, not run here. Applying this migration itself to `oryn-qa-scratch` is a
-- live DDL change to a table the whole product already depends on (unlike 0116/0117/0118/
-- 0119/0120, which are all still-unapplied new surface) -- CEO said to ship the fix now and
-- fold it into the founder's package; whether "ship" means apply it live tonight or hand it to
-- the founder's own morning run is his call to make, not this migration's to assume.

-- ═══════════════════════════════════════════════════════════════════════════
-- Doğrulama
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare korunan int;
begin
  select count(*) into korunan
  from pg_proc
  where proname = 'profiles_guard_protected_columns'
    and prosrc like '%plan_tier%'
    and prosrc like '%ultra_gift_expires_at%'
    and prosrc like '%account_role%';
  if korunan = 0 then
    raise exception E'\n\nKORUMA GUNCELLENMEDI. Hicbir sey uygulanmadi.\n';
  end if;

  if not exists (
    select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
    where c.relname = 'profiles' and t.tgname = 'profiles_00_guard_protected_columns'
  ) then
    raise exception E'\n\nTRIGGER YOK. Hicbir sey uygulanmadi.\n';
  end if;

  raise notice '─────────────────────────────────────────────';
  raise notice 'KORUMA GUNCELLENDI';
  raise notice '  plan_tier, ultra_gift_expires_at, account_role';
  raise notice '  artik kullanici tarafindan degistirilemiyor.';
  raise notice '  Admin panelinden Ultra vermen etkilenmedi.';
  raise notice '─────────────────────────────────────────────';
end $$;

commit;
