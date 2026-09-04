-- Paket 15 — 2026-09-04
-- Migration 0129/0130/0132/0133 + Package 14'ten sonra hazırlanmış 4 veri dolgu dosyası.
-- CEO'nun dispatch'i: "Paket 14'ten sonra merge edilen ve hiçbir pakette olmayanlar."
--
-- SIRALAMA GEREKÇESİ:
--
-- 1) Dört migration ÖNCE gelir, tüm veri bölümlerinden önce -- 0132 özelinde bilinçli bir
--    karar: 0132 sadece university_statistics'e dokunuyor ve bu paketteki HİÇBİR veri bölümü
--    o tabloya yazmıyor (D1'in ikinci partisi -- QS top-100'ün geri kalanı -- hâlâ büyüyor,
--    14/19 kurumda, başka bir oturumda şu an canlı çalışıyor; Paket 14'te aynı gerekçeyle
--    aldığım karar burada da geçerli: bitmemiş bir dolguyu pakete almam). Yani BU paket için
--    index'in veri dolgusundan önce mi sonra mı geldiği pratikte fark etmiyor -- ama genel,
--    savunmacı ilke olarak indeksi en başa koydum: CREATE UNIQUE INDEX veride çift satır
--    varsa patlıyor (0132'nin kendi yorumu bunu açıkça söylüyor), o yüzden kısıtı erken
--    kurmak, bu paketten SONRA gelecek herhangi bir university_statistics yazımını da (bu
--    pakette olmasa bile) o andan itibaren korur. Kısıt erken kurulursa, ileride bir INSERT
--    çift satır üretmeye çalışırsa AÇIKÇA hata verir -- geç kurulursa, çift satır sessizce
--    girer ve index oluşturma AYRICA patlar, iki kat kötü. 0132'nin kendi ölçümü (canlı
--    veride 0 çift satır, 2026-09-04) bu sırada geçerliliğini koruyor çünkü aradaki hiçbir
--    bölüm o tabloya dokunmuyor.
-- 2) 0133 diğer üç veri dosyasının ikisinin (d2-country, citizenship-classification) doğrudan
--    bağımlısı -- her ikisi de country_eligibility_basis sütununu yazıyor, sütun 0133'ten
--    önce yok. Migration bölümünde olduğu için bu otomatik sağlanıyor.
-- 3) Dört veri dosyası birbirinden BAĞIMSIZ -- hiçbiri aynı opportunity satırının aynı
--    alanına yazmıyor (tek tek doğrulandı, ORYN-wt-package15-2026-09-04 içinde). Yazılış
--    sırasına göre bırakıldı: boilerplate-cleanup → classification → d2-country →
--    waterloo-cemc-split.
--
-- HARİÇ TUTULAN: D1'in ikinci partisi (QS top-100 kalanı, 14/19, bitmedi -- Paket 14'teki
-- aynı karar burada da geçerli).
--
-- DÜZELTME (bu paket hazırlanırken kaynağında yapıldı, kopyada değil): waterloo-cemc-split-
-- execute-2026-09-04.sql'deki 5 INSERT'in re-run guard'ı yoktu (gen_random_uuid() + ON
-- CONFLICT yok = ikinci çalıştırmada 5 satır sessizce çoğalırdı). Mevcut
-- opportunities_dedup_idx'i (migration 0008, normalized_title + organization) kullanan "on
-- conflict ... do nothing" eklendi -- yeni bir mekanizma değil, supabase/seed_drive_
-- batch1.sql'de zaten kanıtlanmış aynı desen. Dosyanın kendi başlığında da not var.
--
-- İKİNCİ DÜZELTME (CEO, merge öncesi inceleme, kaynağında yapıldı): citizenship-
-- restrictions-classification-2026-09-04.sql, Immerse Education (7f90019e) satırını
-- checked_not_stated'a taşırken country_eligibility_confirmed_open'ı geri almıyordu -- Paket
-- 14'ün D2 dolgusu bu satırı zaten true yapmıştı, TERS gerekçeyle. 0133'ün CHECK kısıtı
-- enum üyeliğini doğruluyor, boole ile çapraz kontrol etmiyor -- hata vermeden, true + 
-- checked_not_stated aynı satırda duruyordu, ve computeEligibility boole'yi önce okuduğu
-- için daha dikkatli yeni sınıflandırma sessizce etkisiz kalıyordu. Daha da inceliği:
-- ikinci koşuda 0133'ün kendi backfill'i (confirmed_open=true iken çalışan) satırı
-- confirmed_no_restriction'a GERİ yazıyordu -- checked_not_stated 13'e düşüyor, 
-- confirmed_no_restriction 3'e çıkıyordu, hiçbir çelişki görünmeden. Boole artık
-- basis'le birlikte sıfırlanıyor -- bu hem çelişkiyi hem ikinci koşudaki sessiz geri
-- yazmayı kapatıyor. Sistematik kontrol: Paket 14'ün confirmed_open=true yaptığı diğer
-- 4 satır (Penn Pre-College, Interlochen Review, TechGirls, bir sınıf-only satır) Paket
-- 15'in hiçbir dosyasında geçmiyor -- tek çakışma buydu. scripts/check-package-15-
-- sequence.sh'e kalıcı kontrol eklendi: iki koşu sonunda hiçbir satır confirmed_open=true
-- ile basis='checked_not_stated' birlikte taşımamalı, üç boyutta da.
--
-- İKİ KEZ ÇALIŞTIRILDI, satır sayıldı: scripts/check-package-15-sequence.sh.

begin;


-- ══════════════════════════════════════════════════════════
-- BÖLÜM 1/8 — Migration 0129: opportunity age/grade eligibility basis
-- ══════════════════════════════════════════════════════════
-- 0129: opportunities.age_eligibility_basis / grade_eligibility_basis -- the third state
-- 0126 didn't have, mirroring university_statistics.admission_rate_basis's own shape (0119)
-- from the same day, for the same underlying reason.
--
-- 0126 gave age/grade eligibility a two-state signal: not-confirmed-open (default) vs.
-- confirmed-open (a research pass found the official page explicitly says there's no gate).
-- D2's own visible-priority research pass (docs/opportunity-eligibility-d2-not-found-2026-
-- 09-04.md) surfaced a real third case that two-state signal can't represent: 24 of the 34
-- opportunities students actually see had their official page CHECKED, and that page simply
-- doesn't mention age or grade at all -- not "confirmed no restriction" (the page never
-- makes that positive claim) and not "unresearched" (a person genuinely looked, today, at
-- the cited URL). Collapsing this into "unresearched" means these 24 rows carry the exact
-- same "not verified yet" warning forever, indistinguishable from a row nobody has ever
-- looked at -- and a warning a student sees on every single row teaches them to stop
-- reading it, which is the failure mode CEO named directly: the one row where the warning
-- actually matters gets the same non-reaction as the 24 where it's genuinely moot.
--
-- Same shape as 0119's admission_rate_basis on purpose, per explicit instruction not to
-- invent a new pattern: a plain `text` column (not a real Postgres enum type, so no type-
-- alteration ceremony), a CHECK constraint enumerating the valid values, a default of the
-- honest "nobody's looked" state, and a deterministic backfill for the one case this
-- migration can already prove from data already on file.
--
-- Kept alongside 0126's booleans, not replacing them -- CEO's own dispatch names
-- age_eligibility_confirmed_open/grade_eligibility_confirmed_open as an existing, standing
-- fact ("0126'nın bayrağı"), not something to redesign. The two mechanisms describe the
-- same underlying "confirmed no restriction" state from two directions (a fast boolean
-- check application code already has, and a full account of every state including the new
-- one) -- kept in sync by the backfill below, and both remain independently readable.
--
-- *** NOT YET APPLIED *** -- prepared on oryn/0129-age-grade-eligibility-basis-2026-09-04.
-- 0126 itself, which this migration reads to backfill from, is ALSO still not applied to
-- this database as of this writing (confirmed directly against information_schema, not
-- assumed) -- this migration is written defensively regardless (`if not exists` on the
-- read of 0126's own columns is not possible in plain SQL, so application order matters:
-- apply 0126 before 0129, or the backfill UPDATE below simply has nothing to match and is a
-- safe no-op, never an error, since the WHERE clause degrades to matching zero rows on a
-- column that already defaults false).

alter table public.opportunities
  add column if not exists age_eligibility_basis text default 'not_researched'
  check (age_eligibility_basis is null or age_eligibility_basis in ('not_researched', 'checked_not_stated', 'confirmed_no_restriction')),
  add column if not exists grade_eligibility_basis text default 'not_researched'
  check (grade_eligibility_basis is null or grade_eligibility_basis in ('not_researched', 'checked_not_stated', 'confirmed_no_restriction'));

-- Deterministic, not a guess -- same reasoning as 0119's own backfill: a row already marked
-- age_eligibility_confirmed_open/grade_eligibility_confirmed_open true was, by definition,
-- research-confirmed open, so its basis is arithmetic on what 0126 already recorded, not a
-- new inference. Every other row keeps 'not_researched', the honest default, until a real
-- research pass (like D2's) upgrades a specific row to 'checked_not_stated' by hand.
update public.opportunities
  set age_eligibility_basis = 'confirmed_no_restriction'
  where age_eligibility_confirmed_open = true
    and age_eligibility_basis is distinct from 'confirmed_no_restriction';

update public.opportunities
  set grade_eligibility_basis = 'confirmed_no_restriction'
  where grade_eligibility_confirmed_open = true
    and grade_eligibility_basis is distinct from 'confirmed_no_restriction';

comment on column public.opportunities.age_eligibility_basis is
  'Why minimum_age/maximum_age are (or are not) set. ''not_researched'' (default): nobody has checked this row''s age eligibility yet. ''checked_not_stated'': a research pass read the official page (source_url, as of last_verified_at) and it does not state an age requirement either way -- distinct from unresearched, and distinct from a confirmed absence of a gate. ''confirmed_no_restriction'': the official page explicitly states there is no age limit -- kept in sync with age_eligibility_confirmed_open (0126), which remains the fast boolean check application code already uses. See docs/opportunity-eligibility-d2-not-found-2026-09-04.md for the D2 research this column answers.';

comment on column public.opportunities.grade_eligibility_basis is
  'Why eligible_grades is (or is not) set. ''not_researched'' (default): nobody has checked this row''s grade eligibility yet. ''checked_not_stated'': a research pass read the official page (source_url, as of last_verified_at) and it does not state a grade requirement either way. ''confirmed_no_restriction'': the official page explicitly states there is no grade restriction -- kept in sync with grade_eligibility_confirmed_open (0126). See docs/opportunity-eligibility-d2-not-found-2026-09-04.md for the D2 research this column answers.';

-- Re-run safe. `add column if not exists` and both UPDATEs (guarded by `is distinct from`)
-- are idempotent, same discipline 0119's own closing note documents -- applying this file
-- twice is a no-op, not an error.

-- ══════════════════════════════════════════════════════════
-- BÖLÜM 2/8 — Migration 0130: parent_commentary_entries tablosu
-- ══════════════════════════════════════════════════════════
-- Storage for the monthly parent commentary narrative (B3a's "gelişim" page, 2026-09-04).
-- NOT YET APPLIED, per this repo's own standing discipline: the founder runs this by hand.
-- Zero live writes were made producing this file.
--
-- lib/digest/parent-commentary.ts / parent-commentary-run.ts (P5, converted weekly->monthly
-- by B3b the same day) already COMPUTE this narrative, but never persisted it -- the batch
-- runner's only write is parent_links.last_commentary_sent_at, a timestamp; the generated
-- text itself was built in memory and discarded (confirmed by reading both files directly,
-- not assumed from either's own comments). CEO's own correction, same night: the instruction
-- to "show the recorded one" was ahead of what the schema actually recorded. This migration
-- closes that gap -- content storage was always the missing half, not a new feature.
--
-- A TABLE, not a column on parent_links (CEO's own framing): the page this feeds is named
-- "gelişim" (progress) specifically because a parent asking "what did it say last month" is
-- the point of the page, not an edge case a single latest-value column would serve. One row
-- per generation, append-only, same posture as admin_action_log (migration 0097) and
-- parent_links itself (no delete policy anywhere).
--
-- Migration number 0130 assigned by CEO.

create table if not exists public.parent_commentary_entries (
  id uuid primary key default gen_random_uuid(),
  parent_link_id uuid not null references public.parent_links(id) on delete cascade,
  generated_at timestamptz not null default now(),
  locale text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  narrative text not null,
  narrative_source text not null check (narrative_source in ('ai', 'no_activity', 'ai_unavailable')),
  created_at timestamptz not null default now(),
  unique (parent_link_id, period_start)
);

comment on table public.parent_commentary_entries is
  'One row per monthly commentary generation for one parent_links relationship -- the
  content half of P5/B3b''s mechanism, which until this migration computed a narrative and
  discarded it. Append-only (no update/delete policy for any role below), so a parent
  revisiting "gelişim" can see prior months, not just the latest. `parent_link_id` rather
  than `student_user_id` -- the same per-relationship (not per-student) scoping migration
  0118''s last_commentary_sent_at column already uses, and for the identical reason: a
  student linked to two parents must not have one parent''s cadence/history bleed into the
  other''s.
  `unique (parent_link_id, period_start)` (CEO, 2026-09-04, off a real same-night incident
  elsewhere: a package silently doubled rows because an ON CONFLICT constraint depended on a
  column that was never actually set, and NULL is never equal to NULL). Both columns here are
  NOT NULL by this same table''s own schema, so that specific trap cannot recur for this
  constraint. What it actually guards: two concurrent visits to the progress page (two tabs,
  a retry after a slow response) both concluding generation is due and both calling
  lib/parent/commentary-actions.ts''s Server Action before either write lands -- without this,
  that race would insert two entries for the same period. The action inserts via
  `.upsert(..., { onConflict: "parent_link_id,period_start", ignoreDuplicates: true })`, not a
  plain insert, so the second concurrent attempt silently no-ops instead of erroring or
  duplicating.';
comment on column public.parent_commentary_entries.locale is
  'The language this specific narrative was generated in -- a parent who switches language
  mid-series keeps every prior entry exactly as written, never silently re-rendered in a
  language the model never actually used.';
comment on column public.parent_commentary_entries.narrative_source is
  'Mirrors lib/digest/parent-commentary.ts''s own NarrativeSource exactly (''ai'' |
  ''no_activity'' | ''ai_unavailable'') -- stored so a reader of this table later can tell a
  genuinely quiet month from a month the AI provider was unreachable, without re-deriving it
  from narrative text.';

create index if not exists parent_commentary_entries_link_generated_idx
  on public.parent_commentary_entries (parent_link_id, generated_at desc);

alter table public.parent_commentary_entries enable row level security;

-- No policy for `authenticated` anywhere on this table, on purpose -- same structural
-- reasoning as migration 0116's §5 (get_parent_child_profile and neighbors): this table has
-- exactly one column (narrative) that is free-text model output about a specific student, the
-- same "can't hide it via a row-level policy, the whole row is the same shape" problem that
-- moved profiles/target_universities/applications behind curated functions instead of direct
-- grants. RLS enabled with zero policies denies all direct access to every non-owning role;
-- get_parent_child_commentary below (SECURITY DEFINER) is the only read path, and the batch
-- runner's admin client (service_role, RLS-exempt by Supabase's own convention) is the only
-- write path -- neither needs a policy here.
--
-- Whether a STUDENT may read their own commentary is explicitly NOT decided by this
-- migration -- CEO, 2026-09-04: "şimdilik hayır, kapsamı dar tut" (not for now, keep scope
-- narrow). No policy or function grants student access; adding one is a deliberate, separate
-- decision for whoever the founder routes it to, not an oversight this comment is covering for.

create or replace function public.get_parent_child_commentary(p_student uuid, p_limit integer default 12)
returns table (
  id uuid,
  generated_at timestamptz,
  locale text,
  period_start timestamptz,
  period_end timestamptz,
  narrative text,
  narrative_source text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    e.id, e.generated_at, e.locale, e.period_start, e.period_end, e.narrative, e.narrative_source
  from public.parent_commentary_entries e
  join public.parent_links l on l.id = e.parent_link_id
  where l.student_user_id = p_student
    and l.parent_user_id = auth.uid()
    and l.status = 'active'
  order by e.generated_at desc
  limit greatest(1, least(p_limit, 50));
$$;
revoke all on function public.get_parent_child_commentary(uuid, integer) from public;
grant execute on function public.get_parent_child_commentary(uuid, integer) to authenticated;

comment on function public.get_parent_child_commentary(uuid, integer) is
  'The read path for parent_commentary_entries -- same is_active_parent_of/SECURITY DEFINER
  shape as migration 0116''s get_parent_child_profile/_target_universities/_applications, but
  NOT a plain call to is_active_parent_of() as an existence gate -- this table is keyed per
  RELATIONSHIP (parent_link_id), unlike profiles/target_universities/applications which have
  exactly one row per student regardless of how many parents are linked. A caller-supplied
  p_student alone is not enough to scope the join: a student with two linked parents has two
  parent_links rows, each with their own commentary entries, and gating only on "is the
  caller an active parent of this student" (is_active_parent_of''s own question) would let
  either parent read BOTH relationships'' entries through the shared student_user_id join --
  confirmed as a real bug locally (2026-09-04) before this migration shipped: an active
  parent''s query returned a second, unrelated parent''s (in the test, a REVOKED parent''s)
  own entries, because the first version of this function checked only that gate. Fixed by
  joining and filtering on `l.parent_user_id = auth.uid() and l.status = ''active''`
  directly -- the same predicate is_active_parent_of() encapsulates, inlined here because
  this function needs it to scope a JOIN, not just gate a boolean. `p_limit` defaults to 12
  (a year of monthly entries) and is clamped 1-50 so a caller cannot force an unbounded scan.';

-- ══════════════════════════════════════════════════════════
-- BÖLÜM 3/8 — Migration 0132: university_statistics unique index coalesce düzeltmesi
-- (veri dolgusundan önce -- gerekçe dosyanın en üstünde)
-- ══════════════════════════════════════════════════════════
-- 0132: university_statistics_university_year_idx never actually fires -- same defect
-- migration 0056 already fixed once for university_requirements, not yet applied here.
--
-- The existing unique index is on (university_id, stat_year). In Postgres, NULL is never
-- equal to NULL, so the index cannot fire on any row where stat_year is null. Measured live
-- 2026-09-04 (project qtcvcflzxbuagvvwahhu): 133 rows, only 3 have stat_year set -- the
-- other 130 (97.7%) have carried no real uniqueness guarantee at all. Found the same day a
-- staged package re-run silently doubled five university_statistics rows for exactly this
-- reason -- a unique constraint over a column the insert never set.
--
-- Measured before writing this migration, per CEO's own explicit sequencing -- 0 duplicate
-- (university_id) rows exist on the live table today. This migration closes the gap before
-- it is exploited again, not cleaning up existing damage; if that measurement had come back
-- non-zero, a cleanup migration choosing which row to keep would have had to land first,
-- since CREATE UNIQUE INDEX fails outright over data that already violates it (confirmed
-- directly in this migration's own local proof, not assumed).
--
-- Same fix shape as 0056's university_requirements_university_type_scope_title_idx:
-- COALESCE(stat_year, <sentinel>) so every row participates in the uniqueness check, whether
-- or not stat_year is populated. -1 is never a real academic year and is never written to the
-- column by any application code path -- it exists only inside this index's own key
-- expression, never stored.
--
-- Reversible and re-runnable by construction: this migration only changes an index
-- definition, no data is read, written, or deleted. DROP INDEX IF EXISTS / CREATE UNIQUE
-- INDEX IF NOT EXISTS make a second run of this file a no-op, and rolling back is the mirror
-- image (drop the coalesced index, recreate the plain (university_id, stat_year) one) with
-- zero data-loss risk either direction.

drop index if exists university_statistics_university_year_idx;

create unique index if not exists university_statistics_university_year_idx
  on university_statistics (university_id, coalesce(stat_year, -1));

-- ══════════════════════════════════════════════════════════
-- BÖLÜM 4/8 — Migration 0133: opportunity country eligibility basis
-- (bu satırdan sonra country_eligibility_basis sütunu var -- 4 ve 5. bölümler buna bağımlı)
-- ══════════════════════════════════════════════════════════
-- 0133: opportunities.country_eligibility_basis -- the same third state 0129 gave age/grade,
-- for country. Mirrors 0129's own shape exactly, which itself mirrors
-- university_statistics.admission_rate_basis (0119/0127) -- per explicit instruction not to
-- invent a new pattern a third time.
--
-- D2's own re-measurement of the visible-34 set is the reason this exists, not a guess: after
-- 0129 applied 'checked_not_stated' to 13 rows' age/grade, the row-level "still shows some
-- warning" count did NOT move (29/34, unchanged) -- because country_eligibility_confirmed_open
-- (0060) only covers "confirmed no gate," and every row that gained the new age/grade state
-- still had an unresolved COUNTRY dimension keeping the whole row flagged. Several of those
-- rows were ALSO genuinely checked for country and found silent (Boston University Tanglewood,
-- WWF Youth Art Contest, Duke of Edinburgh Türkiye, METU, Lumiere Education, UM Academies,
-- UCSB Research Mentorship, HPEC, EYE, Wharton Data Science Competition, UAL, IEO) -- research
-- already done, with nowhere to record it until this column existed.
--
-- Kept alongside 0060's boolean, not replacing it -- same relationship 0129 has with 0126.
-- Backfilled deterministically from country_eligibility_confirmed_open, same discipline as
-- 0129's own backfill from age/grade_eligibility_confirmed_open.
--
-- Naming, deliberately NOT unified with university_statistics.admission_rate_basis's
-- 'not_published' value even though both are a "checked but the source is silent" case:
-- 'not_published' means the institution has a real rate and chooses to withhold it (NUS,
-- Tsinghua, Peking -- 0127's own finding). 'checked_not_stated' here means the official page
-- simply never raises the topic -- the far more common case for eligibility criteria, and one
-- where "probably no restriction" is the honest read, not "definitely exists, deliberately
-- hidden." Same distinction 0129's own migration comment already draws for age/grade; CEO's
-- own ruling on this exact question: keep the names apart because the claims are not the same,
-- and note the distinction in writing so a later pass doesn't "fix" it into false consistency.
--
-- *** NOT YET APPLIED *** -- prepared on oryn/0133-country-eligibility-basis-2026-09-04. 0060,
-- which this migration reads to backfill from, is applied live (confirmed directly against
-- information_schema, not assumed) -- the backfill UPDATE below will have real rows to match
-- once this migration itself is applied.
--
-- Renumbered from 0131 to 0133 on rebase: 0131 was assigned for this work, but by the time
-- this branch caught up with origin/main, 0131 had already been reserved and released for
-- unrelated work and permanently retired as a gap (see __tests__/social/posts-schema.test.ts's
-- "migration numbering" narrative) -- reusing it here would have made "0131" mean two
-- different things, which that narrative explicitly rules out.

alter table public.opportunities
  add column if not exists country_eligibility_basis text default 'not_researched'
  check (country_eligibility_basis is null or country_eligibility_basis in ('not_researched', 'checked_not_stated', 'confirmed_no_restriction'));

-- Deterministic, not a guess -- same reasoning as 0129's own backfill: a row already marked
-- country_eligibility_confirmed_open true was, by definition, research-confirmed open, so its
-- basis is arithmetic on what 0060 already recorded, not a new inference.
update public.opportunities
  set country_eligibility_basis = 'confirmed_no_restriction'
  where country_eligibility_confirmed_open = true
    and country_eligibility_basis is distinct from 'confirmed_no_restriction';

comment on column public.opportunities.country_eligibility_basis is
  'Why eligible_countries is (or is not) set. ''not_researched'' (default): nobody has checked this row''s country eligibility yet. ''checked_not_stated'': a research pass read the official page (source_url, as of last_verified_at) and it does not state a country/nationality restriction either way -- distinct from ''not_published'' (university_statistics.admission_rate_basis, 0127), which means a real value exists and is deliberately withheld; here the topic is simply never raised, which reads as "probably open," not "confirmed hidden." ''confirmed_no_restriction'': the official page explicitly states there is no country/nationality gate -- kept in sync with country_eligibility_confirmed_open (0060), which remains the fast boolean check application code already uses. See docs/opportunity-eligibility-d2-not-found-2026-09-04.md for the D2 research this column answers.';

-- Re-run safe. `add column if not exists` and the UPDATE (guarded by `is distinct from`) are
-- idempotent, same discipline 0119/0126/0129 all document -- applying this file twice is a
-- no-op, not an error.

-- ══════════════════════════════════════════════════════════
-- BÖLÜM 5/8 — citizenship_restrictions/residency_restrictions boilerplate temizliği
-- ══════════════════════════════════════════════════════════
-- Cleanup for the citizenship_restrictions/residency_restrictions leak CEO asked to be
-- measured properly rather than fixed as "2 rows": a research pass's own internal note
-- ("None stated on the fetched pages.", "None stated on official site or FAQ") was stored as
-- the column's actual value instead of left null when nothing was found. Confirmed live,
-- 2026-09-04, and re-read immediately before writing this file -- no drift since measurement.
--
-- Answers to CEO's four questions, in order:
--
-- 1. HOW MANY ROWS: 11 opportunities, 17 field-instances across citizenship_restrictions/
--    residency_restrictions (broader than the 2 originally spotted). Confirmed via a phrase
--    sweep AND a full read of every non-null value in both columns across all 78 opportunities
--    that have either populated, so this isn't an undercount from a narrow search.
--
-- 2. IS IT READ, AND WHAT HAPPENS: read in FOUR places, confirmed by grep, not assumed --
--    a. app/(app)/opportunities/[id]/page.tsx (the REAL student-facing detail page) renders
--       both fields VERBATIM AND UNCONDITIONALLY under an "Eligibility notes" section, labeled
--       "Citizenship: {text}" / "Residency: {text}" (messages/en.json, messages/tr.json) --
--       zero validation, the most direct exposure of the four.
--    b. lib/opportunities/matching.ts's computeEligibility surfaces either field verbatim as a
--       citizenship_restriction_on_file/residency_restriction_on_file note, which also
--       SUPPRESSES the calmer "not verified yet"/"checked, not stated" message that would
--       otherwise apply (hasUnstructuredRestrictionEvidence gate).
--    c. lib/counselor/eligibility.ts's evaluateOpportunityEligibility does the same, for the
--       Advisor/counselor surface.
--    d. lib/opportunities/readiness.ts treats mere non-null presence as "this row has
--       citizenship info," which means these 11 rows' own "no eligibility information at all"
--       quality warning stays silent -- ironically, the bug hides itself from this exact
--       internal quality check.
--    None of the four ever produce a hard "ineligible" exclusion (eligible stays true, verdict
--    stays "unknown", never known_ineligible/false) and nothing crashes -- the wrong thing
--    communicated is a CONFUSING or backwards-toned PRESENTATION, not a wrong hard verdict,
--    same distinction CEO drew ("varlik yanlis seyi anlatiyor" -- existence tells the wrong
--    thing, not absence telling two different things, which is what this whole arc spent today
--    on for a different reason).
--
-- 3. DOES THE STUDENT SEE IT: yes, today -- 2 of the 11 rows (Lumiere Education, UCSB Research
--    Mentorship Programs) are in the currently-visible-33 set (saved or a real student's actual
--    top-5), re-checked against the same live query this session's every other visible-set
--    measurement uses. Not a dormant data-quality nit.
--
-- 4. THE CLEANUP: only 10 of the 17 field-instances are touched below, not all 17 -- the other
--    7 (all on citizenship_restrictions) contain a real, substantive quote about the program's
--    actual international openness (e.g. Bocconi: "official page says applicants can be 'in
--    Italy or abroad'"; Wharton LBW: "official page says international applicants are
--    explicitly welcome") despite the misleading "None stated;" opener, and nulling them would
--    throw away real information rather than fix a defect. These are a SEPARATE, deliberate
--    research question -- flagged back to CEO, not decided here -- of whether the quoted
--    language actually meets this arc's own established bar for country_eligibility_basis =
--    'confirmed_no_restriction' (explicit no-gate statement) versus merely 'checked_not_stated'
--    (descriptive attendee diversity, the same distinction already drawn for EYE/BU Tanglewood
--    earlier tonight). Ross Mathematics Program's citizenship_restrictions is left completely
--    untouched and unflagged: its "None stated; international students are accepted (...B-2
--    tourist visa)" is genuinely informative, non-misleading prose despite the same opener --
--    reviewed and kept, not overlooked.
--
--    The 10 instances below are pure boilerplate with ZERO informational content beyond "we
--    checked, found nothing" (which NULL already means in this schema) or, for Lumiere, a
--    stray note about an unrelated field (cost) that landed in the wrong column entirely.
--    Every WHERE clause re-guards the exact current text so a stale statement degrades to a
--    safe no-op rather than clobbering a value someone else has since corrected.

-- LSE Summer School -- both fields are pure "we checked, nothing" boilerplate.
update public.opportunities
set citizenship_restrictions = null
where id = '0f466b31-5fc2-4722-8e61-1fd74187909e'
  and citizenship_restrictions = 'None stated on the fetched pages.';

update public.opportunities
set residency_restrictions = null
where id = '0f466b31-5fc2-4722-8e61-1fd74187909e'
  and residency_restrictions = 'None stated on the fetched pages.';

-- Sciences Po Summer School -- both fields, same boilerplate.
update public.opportunities
set citizenship_restrictions = null
where id = '32b43654-2a63-4135-a91a-b492d1f8b3dc'
  and citizenship_restrictions = 'None stated on the fetched pages.';

update public.opportunities
set residency_restrictions = null
where id = '32b43654-2a63-4135-a91a-b492d1f8b3dc'
  and residency_restrictions = 'None stated on the fetched pages.';

-- Bocconi Summer School for High School Students -- residency only; citizenship_restrictions
-- kept (real "in Italy or abroad" quote, see the research-question note above).
update public.opportunities
set residency_restrictions = null
where id = '0cbe26c6-c073-4ce5-9b9d-b928a3c0a7bc'
  and residency_restrictions = 'None stated on the fetched pages.';

-- IE University Pre-University Summer Program -- residency only; citizenship_restrictions kept
-- (real visa-applicability quote).
update public.opportunities
set residency_restrictions = null
where id = '41db8ceb-16ea-4215-adc0-7fb7b152649d'
  and residency_restrictions = 'None stated on the fetched pages.';

-- Immerse Education Summer School -- residency only; citizenship_restrictions kept (real
-- "from around the world" quote).
update public.opportunities
set residency_restrictions = null
where id = '7f90019e-05c7-4059-ae13-8e285ab3ea38'
  and residency_restrictions = 'None stated on the fetched pages.';

-- Oxford Scholastica Academy Summer School -- residency only; citizenship_restrictions kept
-- (real "over 85 different countries" quote).
update public.opportunities
set residency_restrictions = null
where id = '2080d194-88e9-4585-9a81-c99e9a19840b'
  and residency_restrictions = 'None stated on the fetched pages.';

-- Polygence -- citizenship_restrictions only field it has, pure boilerplate.
update public.opportunities
set citizenship_restrictions = null
where id = '0337369f-bb69-47e5-aa82-d4a0e92a674b'
  and citizenship_restrictions = 'None stated on official site or FAQ';

-- Lumiere Education -- a stray COST note landed in the CITIZENSHIP column entirely; the row is
-- in the currently-visible set (a real student sees this today). "cost genuinely unconfirmed
-- as of this research pass" describes cost, not citizenship, and belongs in neither column as
-- written -- correcting the cost field itself, if warranted, is a separate task.
update public.opportunities
set citizenship_restrictions = null
where id = 'bc678344-c213-4ae8-a4f8-48af2856338f'
  and citizenship_restrictions = 'None stated on official pages fetched; cost genuinely unconfirmed as of this research pass';

-- Follow-on, not done here: once this row's citizenship_restrictions is null, Lumiere becomes
-- a real candidate for 0133's own country_eligibility_basis = 'checked_not_stated' fill --
-- docs/d2-country-checked-not-stated-requires-0133-2026-09-04.sql explicitly excluded Lumiere
-- for exactly this reason (a dead write while restriction text sat in the way). Re-run that
-- exclusion's own re-check once this file lands, rather than assuming Lumiere now qualifies.

-- Re-run safe: every UPDATE re-guards on the exact current text via the WHERE clause, so
-- applying this file twice (or applying it after any one row has already changed) is a no-op
-- for that row, not an error or a wrong overwrite.
--
-- NOT touched here, deliberately (see point 4 above for the full reasoning): Bocconi/IE
-- University/Immerse/Oxford Scholastica/UCSB Research Mentorship/Wharton Global Youth (LBW)'s
-- own citizenship_restrictions, and Ross Mathematics Program's citizenship_restrictions.

-- ══════════════════════════════════════════════════════════
-- BÖLÜM 6/8 — CEO'nun 3'lü testiyle sınıflandırılan 7 satır (REQUIRES 0133)
-- ══════════════════════════════════════════════════════════
-- Classification of the 7 rows docs/citizenship-restrictions-boilerplate-cleanup-2026-09-04.sql
-- deliberately left untouched -- CEO's own three-way test, applied row by row with reasoning
-- named for each, per CEO's explicit request not to decide silently. REQUIRES MIGRATION 0133
-- (country_eligibility_basis) applied first for the two UPDATEs that set it.
--
-- THE TEST (CEO's own framing):
--   1. An explicit "no restriction" statement -- the page itself states the openness, not
--      just a description of who happens to attend -- -> country_eligibility_confirmed_open =
--      true AND country_eligibility_basis = 'confirmed_no_restriction' (0060/0133's own
--      shape). Same bar already applied to EYE/BU Tanglewood in 0129/0133 (both FAILED it --
--      "160 nationalities"/"from across the country and around the world" is attendee
--      history, not a policy statement -- which is exactly the line these 7 rows sit on
--      either side of).
--   2. Real, substantive PROCESS information useful to a student (a visa type, a language
--      requirement) -- not a restriction claim in either direction -- -> leave the column
--      completely untouched, no basis change, content stays.
--   3. Only "the page doesn't say anything" -- -> country_eligibility_basis =
--      'checked_not_stated', field cleared.
--
-- A FOURTH thing had to be checked before writing any UPDATE, not assumed: does clearing
-- citizenship_restrictions actually matter once confirmed_open/basis is set? Re-read
-- lib/opportunities/matching.ts and lib/counselor/eligibility.ts line by line -- the
-- "citizenship_restriction_on_file" note (both files) is gated ONLY on
-- `citizenshipRestrictions && !hasCitizenshipRestriction`, completely INDEPENDENT of
-- countryEligibilityConfirmedOpen. Setting confirmed_open=true while LEAVING the free-text
-- column populated would still fire that note, on both surfaces AND on the unconditional
-- detail-page render (app/(app)/opportunities/[id]/page.tsx) -- the exact bug this whole
-- package exists to fix, still live for these two rows specifically. So every row promoted to
-- confirmed_no_restriction below ALSO clears citizenship_restrictions -- the quote's evidence
-- has been promoted into the structured field, so the free-text copy is no longer needed and
-- would actively contradict the new structured answer if left in place.

-- Bocconi Summer School for High School Students -- CEO's own example: "official page says
-- applicants can be 'in Italy or abroad'" is the page itself stating openness (both
-- categories together cover everyone), not a description of who happens to attend.
update public.opportunities
set country_eligibility_confirmed_open = true,
    country_eligibility_basis = 'confirmed_no_restriction',
    citizenship_restrictions = null,
    last_verified_at = now()
where id = '0cbe26c6-c073-4ce5-9b9d-b928a3c0a7bc'
  and citizenship_restrictions = 'None stated; official page says applicants can be "in Italy or abroad."'
  and country_eligibility_confirmed_open = false;

-- Wharton Global Youth Program: Leadership in the Business World (LBW) -- CEO's own second
-- example: "international applicants are explicitly welcome" is a direct, affirmative
-- statement, not attendee-diversity trivia.
update public.opportunities
set country_eligibility_confirmed_open = true,
    country_eligibility_basis = 'confirmed_no_restriction',
    citizenship_restrictions = null,
    last_verified_at = now()
where id = 'c033f1e9-4642-4a5a-94da-739efadff477'
  and citizenship_restrictions = 'None stated - official page says international applicants are explicitly welcome'
  and country_eligibility_confirmed_open = false;

-- Immerse Education Summer School -- "applicants coming 'from around the world'" is
-- descriptive attendee makeup, not a policy statement -- the same shape as BU Tanglewood's own
-- "from across the country and around the world" (already judged NOT sufficient for
-- confirmed-open in the 0129/0133 pass). checked_not_stated, not confirmed_no_restriction.
--
-- CORRECTED 2026-09-04 (CEO, found reviewing before merging Package 15): Package 14's own
-- D2 fill (data/morning/14-toplu-paket-2026-09-04.sql, "students aged 13-18 from around the
-- world, plus a stated alumni base from 140+ countries -- an affirmative statement") already
-- set country_eligibility_confirmed_open = true for this exact row, reasoning the OPPOSITE
-- way about the same underlying fact. 0133's own CHECK constraint only validates basis
-- against its enum, never cross-checks it against the boolean, so this UPDATE as originally
-- written would have landed 'checked_not_stated' right alongside confirmed_open = true --
-- self-contradictory, no error, and inert: lib/opportunities/matching.ts's computeEligibility
-- reads the boolean first (`if (!(opportunity.countryEligibilityConfirmedOpen ?? false))`
-- gates whether country_eligibility_basis is even consulted), so the newer, more careful
-- checked_not_stated classification would have been silently overridden by the older,
-- less careful confirmed-open one. The boolean is now explicitly reset alongside the basis --
-- this UPDATE is the correction the reclassification actually requires, not a second,
-- independent fact. Systematic cross-check against every other Package 14
-- *_confirmed_open = true row (Penn Pre-College, Interlochen Review, TechGirls, and one
-- further grade-only row) found none of the other four touched by any Package 15 file --
-- this was the only overlap. Also enforced going forward: scripts/check-package-15-
-- sequence.sh now asserts, after both runs, that no row ever holds *_confirmed_open = true
-- together with *_basis = 'checked_not_stated', across all three dimensions.
--
-- SECOND, WORSE effect this same fix closes, found building that permanent check (not by
-- inspection): 0133's own backfill (`where country_eligibility_confirmed_open = true and
-- basis is distinct from 'confirmed_no_restriction'`) re-evaluates on every run, not once.
-- With the boolean left at true (the bug as originally written), a first run leaves the
-- contradictory-but-at-least-still-checked_not_stated state CEO found; a SECOND run --
-- exactly the scenario Package 14/15's own two-run re-runnability test exists to catch,
-- because the Supabase SQL Editor doesn't honor begin/commit as one atomic unit -- re-runs
-- 0133's backfill BEFORE this file's own guard (which by then only matches on the now-null
-- citizenship_restrictions, so it no longer fires), and 0133 overwrites the basis back to
-- 'confirmed_no_restriction'. So the failure mode across two runs isn't a contradiction
-- sitting quietly in the row -- it's the careful reclassification being silently REPLACED by
-- the wrong one, with a clean-looking (non-contradictory) final state that a snapshot check
-- alone would have missed entirely. Confirmed directly, two ways: reverting just this fix and
-- running the real two-run test dropped the checked_not_stated count from 14 to 13, and a
-- direct query of this row after both runs showed exactly the predicted wrong end state --
-- country_eligibility_basis = 'confirmed_no_restriction', country_eligibility_confirmed_open
-- = true -- not assumed. Clearing the boolean here removes the row from 0133's own backfill
-- match set for every future run, which is what actually makes the fix stable across a second
-- run, not just correct on the first one.
update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    country_eligibility_confirmed_open = false,
    citizenship_restrictions = null,
    last_verified_at = now()
where id = '7f90019e-05c7-4059-ae13-8e285ab3ea38'
  and citizenship_restrictions = 'None stated; official pages describe applicants coming "from around the world."';

-- Oxford Scholastica Academy Summer School -- "students come from 'over 85 different
-- countries'" is the same descriptive-attendee-history shape as EYE's own "160 nationalities"
-- (already judged NOT sufficient for confirmed-open).
update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    citizenship_restrictions = null,
    last_verified_at = now()
where id = '2080d194-88e9-4585-9a81-c99e9a19840b'
  and citizenship_restrictions = 'None stated; official FAQ says students come from "over 85 different countries."';

-- UCSB Research Mentorship Programs -- "engages ... students from all over the world" is the
-- same descriptive shape as BU Tanglewood/Immerse above, not an affirmative no-restriction
-- statement.
update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    citizenship_restrictions = null,
    last_verified_at = now()
where id = '647eb8da-9cb8-46d4-8ded-b4c516f7ac90'
  and citizenship_restrictions = 'None stated; official page: engages qualified, high-achieving high school students from all over the world';

-- NOT touched below -- content correctly stays, no basis change, per CEO's own instruction:
--
-- IE University Pre-University Summer Program (41db8ceb-16ea-4215-adc0-7fb7b152649d) --
-- "visas apply 'if applicable, for international students'" is real process information (a
-- visa contingency), not a restriction claim in either direction and not mere silence.
-- Setting country_eligibility_basis here would also be a dead write regardless -- the free
-- text stays populated, so hasUnstructuredRestrictionEvidence stays true and the basis branch
-- never executes (same reason Lumiere/UCSB were excluded from the ORIGINAL 0133 fill before
-- their own boilerplate was cleared).
--
-- Ross Mathematics Program (e0d9379f-294b-40cd-a406-e0cb08c92567) -- CEO's own example: the
-- B-2 tourist visa detail is a concrete, actionable fact a student can use, not a "nothing
-- found" placeholder. Same dead-write reasoning as IE University applies if basis were set
-- here, on top of CEO's own instruction to leave the content as-is.

-- Re-run safe: every UPDATE re-guards on the exact current citizenship_restrictions text (and,
-- for the confirmed-open pair, on country_eligibility_confirmed_open = false) via the WHERE
-- clause, so re-applying this file, or applying it after either row has already changed, is a
-- no-op for that row rather than an error or a wrong overwrite.

-- ══════════════════════════════════════════════════════════
-- BÖLÜM 7/8 — D2: country_eligibility_basis = checked_not_stated dolgusu, 11 satır (REQUIRES 0133)
-- ══════════════════════════════════════════════════════════
-- D2 -- applying migration 0133's new 'checked_not_stated' basis to the COUNTRY dimension of
-- research already gathered in batches 1-2 and the visible-priority batch
-- (docs/opportunity-eligibility-d2-not-found-2026-09-04.md), now that country_eligibility_basis
-- exists to hold it. REQUIRES MIGRATION 0133 TO BE APPLIED FIRST -- every statement below
-- writes country_eligibility_basis, which does not exist until then.
--
-- This is the country half `docs/d2-checked-not-stated-requires-0129-2026-09-04.sql` (0129,
-- age/grade only) explicitly left out of scope, per CEO's own dispatch at the time: "Boston
-- University Tanglewood, WWF Youth Art Contest, Duke of Edinburgh Türkiye, METU, plus the
-- country half of several multi-field rows ... there is no column to write that finding into
-- yet." Migration 0133 is that column; this file is what fills it.
--
-- Same qualification rule as 0129's own file, applied strictly per row to the country field
-- specifically: 'checked_not_stated' means the row's own official_url/source_url was actually
-- FETCHED (no 403/timeout/socket failure/empty response), real content came back, and that
-- content did NOT explicitly defer to a different, unfetched page as where the country/
-- citizenship answer lives. Excluded on that basis (country was "missing" in the doc but the
-- fetch was incomplete, not a confirmed silence): Northwestern NHSI, Sciences Po, Bocconi,
-- Copenhagen Business School (all defer to a separate, unfetched section), Zero Robotics,
-- NYU Precollege, Girl Up Global Teen Advisor Board, Girl Up Project Awards, Sabancı
-- University, LaunchX, AMC-AIME, YGA, KUSRP 2026, Wall Street 101 (fetch failures or explicit
-- deferrals), NYC Commuter Summer (the fetch that round only ever addressed grade, never
-- reached country), InvestIN (country-relevant "international students" section named but not
-- fetched), IYPT (defers to an unfetched official regulations document).
--
-- Re-read every candidate row's current live value immediately before writing this file
-- (2026-09-04, same pass) rather than trusting the doc's snapshot from when it was written --
-- two rows had already changed since:
--   * The Duke of Edinburgh's International Award -- Türkiye (cdb9da8a-3c8d-47ea-bcee-
--     6cf749738246) now has a real, populated eligible_countries (["Türkiye"]) and
--     citizenship_restrictions -- already resolved by a later pass, not a checked_not_stated
--     candidate anymore. Dropped from this file entirely; a fill here would silently
--     overwrite nothing (eligible_countries wins in computeEligibility regardless) but would
--     misrepresent this row as basis-driven when it's actually a real, structured answer.
--   * European Youth Event (1acee3b0-eaac-479a-996a-b0a2a0570351) now has a real, populated
--     citizenship_restrictions ("European Union and beyond -- EYE2025 drew participants
--     representing 160 nationalities"). Setting country_eligibility_basis on this row would
--     be a dead write: lib/opportunities/matching.ts's computeEligibility only reads
--     countryEligibilityBasis when hasUnstructuredRestrictionEvidence is false, and this row
--     now has restriction prose on file, so it already renders `citizenship_restriction_on_file`
--     instead. Dropped from this file for the same reason as Duke of Edinburgh above.
--
-- Two more rows are dropped for a different reason, found during that same re-check -- a live
-- data-quality bug, not a stale doc: Lumiere Education (bc678344-c213-4ae8-a4f8-48af2856338f)
-- and UCSB Research Mentorship Programs (647eb8da-9cb8-46d4-8ded-b4c516f7ac90) both have a
-- RESEARCH ANNOTATION stored in citizenship_restrictions instead of an actual restriction --
-- Lumiere's reads "None stated on official pages fetched; cost genuinely unconfirmed as of
-- this research pass" and UCSB's reads "None stated; official page: engages, qualified,
-- high-achieving high school students from all over the world". Both are non-null, so the
-- same dead-write gap as EYE above applies -- a fill here would never be read -- and worse,
-- the current live value is a real, live bug: a student opening either row's card is shown a
-- `citizenship_restriction_on_file` note quoting an internal research note (literally
-- "cost genuinely unconfirmed as of this research pass") as if it were the opportunity's own
-- eligibility text. Flagged separately as its own issue, not fixed here -- correcting it means
-- deciding what these two rows' citizenship_restrictions SHOULD say (most likely null), a
-- content decision outside this migration's scope, not a country_eligibility_basis question.
--
-- 11 opportunities qualify below (down from the doc's 15 country-missing candidates in this
-- set, once the two already-resolved rows and the two bug-blocked rows above are set aside).

-- Boston University Tanglewood Institute (BUTI, batch 1) -- "Landing page only describes
-- attendee diversity ('from across the country and around the world'), never states an
-- eligibility policy" (bu.edu/cfa/tanglewood/).
update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = 'c7c21f3f-fb33-4c6c-be76-66da4df0535d'
  and country_eligibility_confirmed_open = false
  and citizenship_restrictions is null
  and residency_restrictions is null
  and eligible_countries = '{}'
  and eligible_citizenships = '{}';

-- World Wildlife Day International Youth Art Contest (batch 1) -- "'International' in the
-- contest's own name only -- no explicit open/restricted statement on the page fetched"
-- (signup.ifaw.org/en-us/art-contest).
update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = '13d9416e-d2a7-4f55-b851-7d76acab2cb3'
  and country_eligibility_confirmed_open = false
  and citizenship_restrictions is null
  and residency_restrictions is null
  and eligible_countries = '{}'
  and eligible_citizenships = '{}';

-- University of Edinburgh Pre-University Summer School (batch 2) -- "Page repeats the age
-- range ... but has no grade or country statement at all" (study.ed.ac.uk/summer-school).
update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = 'dc762fce-b83a-4217-a610-290ac2f65f17'
  and country_eligibility_confirmed_open = false
  and citizenship_restrictions is null
  and residency_restrictions is null
  and eligible_countries = '{}'
  and eligible_citizenships = '{}';

-- Bilkent University Summer Camp (Yaz Kampı, batch 2) -- "FAQ page states the grade
-- requirement ... but never states a nationality/country policy either way"
-- (liseyazkampi.bilkent.edu.tr/sikca-sorulan-sorular/).
update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = '96557dbb-7c60-4097-9925-35cbd5ad9a57'
  and country_eligibility_confirmed_open = false
  and citizenship_restrictions is null
  and residency_restrictions is null
  and eligible_countries = '{}'
  and eligible_citizenships = '{}';

-- AI Summer Week @ ETH Zurich (batch 2) -- "country reads as 'appears open' only by
-- inference (hosted in Switzerland, no restriction mentioned) -- not an explicit statement"
-- (forms.hebbian.ch/r/OD1gjp).
update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = '1259aa77-0b5e-4c55-a384-51dbd47de3ec'
  and country_eligibility_confirmed_open = false
  and citizenship_restrictions is null
  and residency_restrictions is null
  and eligible_countries = '{}'
  and eligible_citizenships = '{}';

-- ODTÜ (METU) Engineering Summer School (visible-priority) -- "Page describes the program
-- for 'lise öğrencileri' (high school students) with no nationality/residency statement
-- either way" (metusummerschool.org).
update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = '0c8e00c1-b2b7-4039-8021-10a310de62e4'
  and country_eligibility_confirmed_open = false
  and citizenship_restrictions is null
  and residency_restrictions is null
  and eligible_countries = '{}'
  and eligible_citizenships = '{}';

-- Two-week UM Academies (non-credit, visible-priority) -- "Page states only dates ... no
-- eligibility criteria of any kind" (precollege.dcie.miami.edu).
update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = '889c580c-dbb6-4490-9078-9faf2a2a2ed0'
  and country_eligibility_confirmed_open = false
  and citizenship_restrictions is null
  and residency_restrictions is null
  and eligible_countries = '{}'
  and eligible_citizenships = '{}';

-- International Economics Olympiad (IEO, visible-priority) -- "participation is mediated
-- through 'official national organizers' across 74 countries -- a logistics structure, not a
-- stated open/restricted policy" (ieo-official.org).
update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = '9193db16-7a9e-42b1-95b6-74eda83a0ac9'
  and country_eligibility_confirmed_open = false
  and citizenship_restrictions is null
  and residency_restrictions is null
  and eligible_countries = '{}'
  and eligible_citizenships = '{}';

-- Harvard Pre-Collegiate Economics Challenge (HPEC, visible-priority) -- the official page
-- (thehuea.org) explicitly states the rules "will be posted when registration opens" -- a
-- genuinely stronger case than most rows here, same reasoning 0129's own file already applied
-- to this row's age/grade fields: the page affirmatively confirms there is nothing to find
-- yet, for every criterion including country, rather than just being silent.
update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = 'a4a24425-2a6f-4902-99a4-4fb43dc110dd'
  and country_eligibility_confirmed_open = false
  and citizenship_restrictions is null
  and residency_restrictions is null
  and eligible_countries = '{}'
  and eligible_citizenships = '{}';

-- Wharton Data Science Competition (visible-priority) -- "no statement found beyond 'all
-- current high school students'" (globalyouth.wharton.upenn.edu/competitions/data-science/).
update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = 'cfb32772-6259-4e3a-9ead-bc289b463d08'
  and country_eligibility_confirmed_open = false
  and citizenship_restrictions is null
  and residency_restrictions is null
  and eligible_countries = '{}'
  and eligible_citizenships = '{}';

-- University of the Arts London -- International Summer School (visible-priority) -- "Page
-- has no eligibility statement of any kind, just a program description" (arts.ac.uk).
update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = 'ae5e73f0-43ba-42be-baed-423d3087e7e1'
  and country_eligibility_confirmed_open = false
  and citizenship_restrictions is null
  and residency_restrictions is null
  and eligible_countries = '{}'
  and eligible_citizenships = '{}';

-- Every WHERE clause repeats the same four guards deliberately, not just id: country_
-- eligibility_confirmed_open = false (never downgrade a row a later pass already confirmed
-- open), citizenship_restrictions/residency_restrictions is null and eligible_countries/
-- eligible_citizenships = '{}' (the exact hasUnstructuredRestrictionEvidence/
-- hasCountryRestriction/hasCitizenshipRestriction gate lib/opportunities/matching.ts's
-- computeEligibility itself checks before ever reading country_eligibility_basis) -- so if
-- any of these 11 rows changes again before this file is actually applied, the guard turns
-- that one statement into a safe no-op instead of a silent, dead, or wrong write.

-- ══════════════════════════════════════════════════════════
-- BÖLÜM 8/8 — Waterloo/CEMC bölünmesi: 5 yeni satır + eski satırın kapatılması
-- (sıra dosyanın kendi içinde: 5 INSERT önce, retirement UPDATE sonra)
-- ══════════════════════════════════════════════════════════
-- Waterloo/CEMC split -- EXECUTION of the plan in docs/waterloo-cemc-split-plan-2026-09-04.md.
-- CEO's own instruction, in sequence: (1) create correctly-scoped new rows, (2) retire (not
-- delete) the bundled row, (3) migrate any matches/saves tied to the old identity. Prepared,
-- NOT applied -- same discipline as every other data-changing file in this pass.
--
-- ADDED 2026-09-04 while assembling Package 15 (data/morning/15-*.sql): each INSERT below
-- originally had no re-run guard -- `gen_random_uuid()` for id means a second run would have
-- created 5 duplicate rows silently, no error, exactly the failure class Package 14's own
-- two-run test found three times over. Fixed at the source, not just in the package copy, per
-- the same standard applied to 0126/D5/D8 earlier tonight. Each INSERT now ends with `on
-- conflict (normalized_title, coalesce(organization, '')) do nothing` -- reusing the EXISTING
-- opportunities_dedup_idx (migration 0008), the same established pattern already proven in
-- supabase/seed_drive_batch1.sql, not a new mechanism. A second run is now a clean no-op for
-- these 5 rows, verified by Package 15's own two-run test (scripts/check-package-15-
-- sequence.sh).
--
-- Re-measured immediately before writing this file (2026-09-04, same session that wrote the
-- plan), because the plan's own numbers are hours old and this arc's own standing rule is to
-- never trust a stale measurement: saved_opportunities is still 0 rows for the bundled id
-- (51c4b57b-7ea1-4503-b9e6-f1468dc9f3f8). The real top-5-per-student ranking (mirroring
-- home-strip.ts's own selection exactly) now shows ZERO students, not the plan's "1 student" --
-- the visible set has shifted since the plan was written, same "the set isn't static" finding
-- D2's own visible-priority work already documented. There are 8 raw opportunity_matches rows
-- referencing the bundled id (cached relevance/eligibility scores, computed regardless of
-- whether a row ranks into anyone's real top-5) -- see the closing note for why these need no
-- explicit migration.
--
-- THE SPLIT, researched fresh this pass (not reused from the plan's own summary, which named
-- grade bands but not exact sourced eligible_grades values or official subpage URLs) --
-- direct fetches of each contest's own official CEMC page, 2026-09-04:
--   * Pascal, Cayley and Fermat Contests (cemc.uwaterloo.ca/contests/pcf) -- "Students in
--     Grade 9 are eligible to write the Pascal Contest" / Grade 10 Cayley / Grade 11 Fermat.
--   * Fryer, Galois and Hypatia Contests (cemc.uwaterloo.ca/contests/fgh) -- same per-contest
--     grade pattern as PCF, full-solution format instead of multiple choice.
--   * Euclid Contest (cemc.uwaterloo.ca/contests/euclid) -- "Students in their final year of
--     secondary school or CEGEP students. Motivated students in lower grades are welcome" --
--     the one contest in this set genuinely narrower than 9-12, which is exactly why it gets
--     its own row rather than folding into PCF/FGH.
--   * Canadian Senior and Intermediate Mathematics Contests (cemc.uwaterloo.ca/contests/csimc)
--     -- CIMC "Students in Grades 9 and 10", CSMC "Students in Grades 11 and 12 and CEGEP
--     students". Kept as ONE row spanning grades 9-12, not split into CIMC/CSMC separately --
--     same treatment as PCF/FGH, where one official page bundles several single/narrow-grade
--     contests under one family and the row answers "is this student eligible for ONE of
--     this family's contests," not "for every contest on this page equally."
--   * Canadian Team Mathematics Contest (cemc.uwaterloo.ca/contests/ctmc) -- "Teams of six
--     secondary school students in any combination of Grades 9-12."
--
-- Deliberately excluded from this split, not silently dropped -- named here as a real gap:
--   * Canadian Computing Competition (cemc.uwaterloo.ca/contests/ccc) -- fetched, and its own
--     page explicitly states NO grade restriction ("each participant can choose the best
--     level for them, regardless of their grade"), gated instead by a birth-date cutoff for
--     "official" award-eligible status. A genuinely different eligibility SHAPE (age-cutoff,
--     not grade-based) that deserves its own researched row rather than being forced into
--     this grade-focused split -- left for a future pass rather than guessed at here.
--   * Beaver Computing Challenge (grades 5-10), Gauss (7-8), Team Up Challenge (6-8) -- the
--     original bundled row's own description says "9 different contests (grades 5-12)"; these
--     three are outside Proxola's stated 14-18 / grades-9-12 target audience (AGENTS.md Â§0),
--     so creating rows for them is out of scope for this platform, not merely undone here.
--
-- Fields NOT reused blindly from the bundled row: `fields` corrected from
-- ["mathematics","computer_science"] to ["mathematics"] -- none of the 5 contests below touch
-- computer science (that's CCC, excluded above). `deadline` is NOT copied onto every new row --
-- the bundled row's own description says its stored Oct-22 date belongs specifically to "the
-- Senior/Intermediate contest," so only the CSIMC row below carries it forward; the other four
-- are left null (unresearched) rather than given a deadline that would be wrong for them, per
-- this app's own "leave blank if not found, never fabricate" rule -- a future pass should fetch
-- each contest's own registration deadline specifically.
--
-- Fields carried forward from the bundled row as still-accurate, general CEMC facts, not
-- re-researched this pass: country ('Canada'), eligible_countries/country_eligibility_
-- confirmed_open (CEMC contests are written in 80+ countries; this predates and is independent
-- of the grade split), location_mode ('hybrid'), cost/funding_available/financial_aid_available
-- (null -- fees are not publicly published, per the bundled row's own note, and that fact is
-- about CEMC's registration process generally, not any one contest), selectivity_tier
-- ('unknown'), verification_state ('verified_current').
--
-- SEQUENCING: the five INSERTs run first. The retirement UPDATE runs last, after they exist --
-- CEO's own explicit requirement (a window with both old and new rows is safe; a window with
-- neither is not).

-- 1. Pascal, Cayley and Fermat Contests
insert into public.opportunities (
  id, title, organization, description, category, official_url, application_url, country,
  remote_allowed, minimum_age, maximum_age, eligible_countries, fields, cost,
  funding_available, deadline, start_date, end_date, source, source_url, source_confidence,
  last_verified_at, status, normalized_title, cycle_status, selectivity_tier,
  verification_state, application_open_date, eligible_grades, citizenship_restrictions,
  residency_restrictions, location_mode, financial_aid_available, application_requirements,
  current_cycle_label, eligible_citizenships, country_eligibility_confirmed_open,
  languages_of_instruction, created_at, updated_at
) values (
  gen_random_uuid(),
  'CEMC Pascal, Cayley and Fermat Contests',
  'Centre for Education in Mathematics and Computing (CEMC), University of Waterloo',
  'Multiple-choice contests: Pascal (Grade 9), Cayley (Grade 10), Fermat (Grade 11) -- each student writes the one contest matching their own grade. Split out of the former umbrella "Waterloo Mathematics and Computing Contests" record, which bundled nine distinct CEMC contests spanning grades 5-12 under one incompatible eligible_grades value.',
  'competition',
  'https://cemc.uwaterloo.ca/contests/pcf',
  null,
  'Canada',
  null,
  null,
  null,
  '{}',
  array['mathematics'],
  null,
  null,
  null,
  null,
  null,
  'Direct fetch of cemc.uwaterloo.ca/contests/pcf, 2026-09-04, confirming per-contest grade eligibility.',
  'https://cemc.uwaterloo.ca/contests/pcf',
  'high',
  now(),
  'active',
  'cemc pascal, cayley and fermat contests',
  'upcoming',
  'unknown',
  'verified_current',
  null,
  array['9','10','11'],
  null,
  null,
  'hybrid',
  null,
  '{}',
  '2026/27 contest year (orders accepted from September 2026)',
  '{}',
  true,
  '{}',
  now(),
  now()
)
on conflict (normalized_title, coalesce(organization, '')) do nothing;

-- 2. Fryer, Galois and Hypatia Contests
insert into public.opportunities (
  id, title, organization, description, category, official_url, application_url, country,
  remote_allowed, minimum_age, maximum_age, eligible_countries, fields, cost,
  funding_available, deadline, start_date, end_date, source, source_url, source_confidence,
  last_verified_at, status, normalized_title, cycle_status, selectivity_tier,
  verification_state, application_open_date, eligible_grades, citizenship_restrictions,
  residency_restrictions, location_mode, financial_aid_available, application_requirements,
  current_cycle_label, eligible_citizenships, country_eligibility_confirmed_open,
  languages_of_instruction, created_at, updated_at
) values (
  gen_random_uuid(),
  'CEMC Fryer, Galois and Hypatia Contests',
  'Centre for Education in Mathematics and Computing (CEMC), University of Waterloo',
  'Full-solution (written-response) contests: Fryer (Grade 9), Galois (Grade 10), Hypatia (Grade 11) -- companion contests to Pascal/Cayley/Fermat, each student writes the one matching their own grade. Split out of the former umbrella "Waterloo Mathematics and Computing Contests" record.',
  'competition',
  'https://cemc.uwaterloo.ca/contests/fgh',
  null,
  'Canada',
  null,
  null,
  null,
  '{}',
  array['mathematics'],
  null,
  null,
  null,
  null,
  null,
  'Direct fetch of cemc.uwaterloo.ca/contests/fgh, 2026-09-04, confirming per-contest grade eligibility.',
  'https://cemc.uwaterloo.ca/contests/fgh',
  'high',
  now(),
  'active',
  'cemc fryer, galois and hypatia contests',
  'upcoming',
  'unknown',
  'verified_current',
  null,
  array['9','10','11'],
  null,
  null,
  'hybrid',
  null,
  '{}',
  '2026/27 contest year (orders accepted from September 2026)',
  '{}',
  true,
  '{}',
  now(),
  now()
)
on conflict (normalized_title, coalesce(organization, '')) do nothing;

-- 3. Euclid Contest -- the one contest in this split genuinely narrower than 9-12.
insert into public.opportunities (
  id, title, organization, description, category, official_url, application_url, country,
  remote_allowed, minimum_age, maximum_age, eligible_countries, fields, cost,
  funding_available, deadline, start_date, end_date, source, source_url, source_confidence,
  last_verified_at, status, normalized_title, cycle_status, selectivity_tier,
  verification_state, application_open_date, eligible_grades, citizenship_restrictions,
  residency_restrictions, location_mode, financial_aid_available, application_requirements,
  current_cycle_label, eligible_citizenships, country_eligibility_confirmed_open,
  languages_of_instruction, created_at, updated_at
) values (
  gen_random_uuid(),
  'CEMC Euclid Contest',
  'Centre for Education in Mathematics and Computing (CEMC), University of Waterloo',
  'University-level mathematics contest for students in their final year of secondary school (CEGEP students also eligible); motivated students in lower grades are welcome. Widely used for Waterloo Faculty of Mathematics scholarship consideration. Split out of the former umbrella "Waterloo Mathematics and Computing Contests" record.',
  'competition',
  'https://cemc.uwaterloo.ca/contests/euclid',
  null,
  'Canada',
  null,
  null,
  null,
  '{}',
  array['mathematics'],
  null,
  null,
  null,
  null,
  null,
  'Direct fetch of cemc.uwaterloo.ca/contests/euclid, 2026-09-04: "Students in their final year of secondary school or CEGEP students."',
  'https://cemc.uwaterloo.ca/contests/euclid',
  'high',
  now(),
  'active',
  'cemc euclid contest',
  'upcoming',
  'unknown',
  'verified_current',
  null,
  array['12'],
  null,
  null,
  'hybrid',
  null,
  '{}',
  '2026/27 contest year (orders accepted from September 2026)',
  '{}',
  true,
  '{}',
  now(),
  now()
)
on conflict (normalized_title, coalesce(organization, '')) do nothing;

-- 4. Canadian Senior and Intermediate Mathematics Contests (CIMC + CSMC) -- kept as one row,
-- same treatment as PCF/FGH above: CIMC (grades 9-10) and CSMC (grades 11-12) share one
-- official page, and the row answers "eligible for one of this family's two contests."
insert into public.opportunities (
  id, title, organization, description, category, official_url, application_url, country,
  remote_allowed, minimum_age, maximum_age, eligible_countries, fields, cost,
  funding_available, deadline, start_date, end_date, source, source_url, source_confidence,
  last_verified_at, status, normalized_title, cycle_status, selectivity_tier,
  verification_state, application_open_date, eligible_grades, citizenship_restrictions,
  residency_restrictions, location_mode, financial_aid_available, application_requirements,
  current_cycle_label, eligible_citizenships, country_eligibility_confirmed_open,
  languages_of_instruction, created_at, updated_at
) values (
  gen_random_uuid(),
  'Canadian Senior and Intermediate Mathematics Contests (CSMC/CIMC)',
  'Centre for Education in Mathematics and Computing (CEMC), University of Waterloo',
  'Two full-solution contests on one registration: the Canadian Intermediate Mathematics Contest (Grades 9-10) and the Canadian Senior Mathematics Contest (Grades 11-12, CEGEP students also eligible) -- each student writes the one matching their own grade. Split out of the former umbrella "Waterloo Mathematics and Computing Contests" record; this contest carries that record''s own Nov-cycle registration deadline (the earliest of CEMC''s 2026/27 contest year), the others in this split do not.',
  'competition',
  'https://cemc.uwaterloo.ca/contests/csimc',
  null,
  'Canada',
  null,
  null,
  null,
  '{}',
  array['mathematics'],
  null,
  null,
  '2026-10-22',
  null,
  null,
  'Direct fetch of cemc.uwaterloo.ca/contests/csimc, 2026-09-04, confirming per-contest grade eligibility; deadline carried forward from the original umbrella record (its own description named this as the "Senior/Intermediate" contest''s deadline specifically).',
  'https://cemc.uwaterloo.ca/contests/csimc',
  'high',
  now(),
  'active',
  'canadian senior and intermediate mathematics contests (csmc/cimc)',
  'upcoming',
  'unknown',
  'verified_current',
  null,
  array['9','10','11','12'],
  null,
  null,
  'hybrid',
  null,
  '{}',
  '2026/27 contest year (orders accepted from September 2026)',
  '{}',
  true,
  '{}',
  now(),
  now()
)
on conflict (normalized_title, coalesce(organization, '')) do nothing;

-- 5. Canadian Team Mathematics Contest (CTMC)
insert into public.opportunities (
  id, title, organization, description, category, official_url, application_url, country,
  remote_allowed, minimum_age, maximum_age, eligible_countries, fields, cost,
  funding_available, deadline, start_date, end_date, source, source_url, source_confidence,
  last_verified_at, status, normalized_title, cycle_status, selectivity_tier,
  verification_state, application_open_date, eligible_grades, citizenship_restrictions,
  residency_restrictions, location_mode, financial_aid_available, application_requirements,
  current_cycle_label, eligible_citizenships, country_eligibility_confirmed_open,
  languages_of_instruction, created_at, updated_at
) values (
  gen_random_uuid(),
  'Canadian Team Mathematics Contest (CTMC)',
  'Centre for Education in Mathematics and Computing (CEMC), University of Waterloo',
  'Team-based contest (teams of six) with individual and team event portions, hosted at the student''s own school or, for selected teams, at the University of Waterloo. Split out of the former umbrella "Waterloo Mathematics and Computing Contests" record.',
  'competition',
  'https://cemc.uwaterloo.ca/contests/ctmc',
  null,
  'Canada',
  null,
  null,
  null,
  '{}',
  array['mathematics'],
  null,
  null,
  null,
  null,
  null,
  'Direct fetch of cemc.uwaterloo.ca/contests/ctmc, 2026-09-04: "Teams of six secondary school students in any combination of Grades 9-12."',
  'https://cemc.uwaterloo.ca/contests/ctmc',
  'high',
  now(),
  'active',
  'canadian team mathematics contest (ctmc)',
  'upcoming',
  'unknown',
  'verified_current',
  null,
  array['9','10','11','12'],
  null,
  null,
  'hybrid',
  null,
  '{}',
  '2026/27 contest year (orders accepted from September 2026)',
  '{}',
  true,
  '{}',
  now(),
  now()
)
on conflict (normalized_title, coalesce(organization, '')) do nothing;

-- 6. Retire the bundled row -- run only after the five INSERTs above have been applied and
-- confirmed present (CEO's own sequencing requirement). status = 'disabled', not deleted --
-- the same status this codebase already uses for exactly this kind of intentional moderation
-- removal (27 other live rows share it, e.g. Diamond Challenge, Stockholm Water Prize), which
-- isOpportunityActionable (lib/opportunities/lifecycle.ts) already excludes from every
-- recommendation surface. No foreign-key gap: opportunity_matches/saved_opportunities rows
-- that still reference this id remain valid rows pointing at a real (if disabled) opportunity.
update public.opportunities
set status = 'disabled',
    updated_at = now()
where id = '51c4b57b-7ea1-4503-b9e6-f1468dc9f3f8'
  and status = 'active';

-- CLOSING NOTE -- matches/saves tied to the old identity, per CEO's explicit request to
-- migrate them:
--   * saved_opportunities: 0 rows reference the bundled id (confirmed twice now, hours apart)
--     -- nothing to migrate.
--   * opportunity_matches: 8 rows reference the bundled id, but 0 students currently have it
--     in their real top-5 (re-measured this pass; the plan's earlier "1 student" has since
--     resolved to 0 on its own). No explicit data migration is written here, following the
--     plan's own point 3: `refreshOpportunityMatches` recomputes these rows from live
--     opportunities on its own schedule, and once this UPDATE takes the bundled row out of
--     `status = 'active'`, isOpportunityActionable excludes it from every recommendation
--     surface regardless of what its stale match rows say -- the same mechanism this
--     codebase already relies on for every other disabled row. The 8 stale rows are left in
--     place deliberately, not overlooked: deleting them isn't necessary for correctness (they
--     stop being shown the moment the row is disabled) and the five new rows above will pick
--     up their own fresh matches on the next recompute for any student whose profile fits.
--     Worth a live spot-check after this file is applied, per the plan's own closing point --
--     not assumed silently.

commit;
