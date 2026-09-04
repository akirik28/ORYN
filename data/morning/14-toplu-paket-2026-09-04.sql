-- ═══════════════════════════════════════════════════════════════════════════
-- PROXOLA — Paket 14: bekleyen 3 migration + hazır dolgu SQL'leri, tek sıra
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Sıra: bu dosyanın kendisi. Migration'lar önce (0124, 0126, 0127), sonra veri
-- dolguları. D2'nin iki dosyası 0126'ya bağlı, dosyanın sonunda -- sıra buna göre.
--
-- İKİ KEZ ÇALIŞTIRILABİLİR — gerçekten test edildi, varsayılmadı. İlk denemede D1'in
-- üniversite gereksinimleri, ikinci denemede D8'in istatistik satırları ikinci
-- koşuda çift kayıt oluşturdu (biri hatayla yakalandı, diğeri sessizce -- tabloların
-- benzersizlik kısıtı stat_year'ı boş bıraktığı için hiç devreye girmiyordu).
-- Üçü de düzeltildi ve düzeltmeden sonra iki kez koşu + satır sayısı doğrulaması
-- tekrarlandı.
--
-- Canlı veritabanına hiçbir yazma yapılmadı. Yalnızca yerel Postgres'te test edildi.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─────────────────────────────────────────────────────────────────────────
-- 1/8 — Migration 0124: yükseltme kartı susturma sütunları (B2)
-- ─────────────────────────────────────────────────────────────────────────
-- Dismissal state for the founder's full-screen upgrade interstitial (2026-09-04, relayed:
-- "hani mesela ilk açtığında her zaman çıksın, arada çıksın işte" -- shows on first session,
-- then periodically after). Own columns, not the advisor prompt's (migration 0093) or the
-- parent-email prompt's (0117) -- same reasoning both of those already established: one
-- dismissal must not silently suppress an unrelated prompt. Reuses the shared decay-clock
-- MECHANISM (computeSoftDismissUntil/computeNotNowUpdate, lib/advisor/upgrade-prompt.ts) via
-- lib/upgrade-interstitial/prompt.ts, not the storage.
--
-- Same four-column shape as 0093/0117 for the same reason theirs is that shape: a passive
-- close (7-day soft suppression) and an explicit "Not now" (escalating to permanent on a
-- second decline in a later month) are genuinely different signals with different
-- suppression lengths, and "how many times has this been explicitly declined" needs its own
-- counter to know when the second decline happens.
alter table public.profiles
  add column if not exists upgrade_interstitial_soft_dismissed_until timestamptz,
  add column if not exists upgrade_interstitial_not_now_at timestamptz,
  add column if not exists upgrade_interstitial_not_now_count integer not null default 0,
  add column if not exists upgrade_interstitial_dismissed_forever boolean not null default false;

comment on column public.profiles.upgrade_interstitial_soft_dismissed_until is
  'Passive dismiss (the top-right X) of the full-screen upgrade interstitial -- suppress until this instant. Null means no active soft suppression. Mirrors upgrade_prompt_soft_dismissed_until (0093) in shape, deliberately not shared with it.';
comment on column public.profiles.upgrade_interstitial_not_now_at is
  'Timestamp of the most recent explicit "Not now" on the full-screen interstitial. Null means never explicitly declined. Suppresses through the end of that calendar month.';
comment on column public.profiles.upgrade_interstitial_not_now_count is
  'How many times "Not now" has been explicitly clicked on the full-screen interstitial, ever.';
comment on column public.profiles.upgrade_interstitial_dismissed_forever is
  'Permanent. Once true, the full-screen interstitial never shows again -- the way back is /settings/plan, not a flag this column-set clears on its own.';

-- Not added to profiles_guard_protected_columns() (0062/0063, extended 0121): these four
-- columns have exactly one legitimate writer each, and it's always the row's own owner via
-- their own session (softDismissUpgradeInterstitial/notNowUpgradeInterstitial), the same
-- shape upgrade_prompt_* and parent_email_prompt_* already have and are correctly NOT
-- guarded for. A guard here would block the actual feature, not protect it -- the exact
-- distinction 0121's own header draws between plan_tier (single writer, already
-- service-role) and these dismissal columns (single writer, always the owner's own client).

-- ─────────────────────────────────────────────────────────────────────────
-- 2/8 — Migration 0126: fırsat yaş/sınıf 'şart yok, onaylandı' bayrakları (D2)
-- Bu paket hazırlanırken bulundu ve düzeltildi: orijinali add column IF NOT EXISTS
-- kullanmıyordu, tek başına ikinci koşuda patlıyordu.
-- ─────────────────────────────────────────────────────────────────────────
-- 0126: opportunities.age_eligibility_confirmed_open / grade_eligibility_confirmed_open --
-- the same structured "research confirmed no gate here" home 0060 built for country/
-- citizenship eligibility, extended to the two other fields that carry the identical
-- absence-as-known-value shape: an empty age bound or an empty eligible_grades list has
-- always meant BOTH "confirmed no restriction" and "never researched" with no way to tell
-- them apart, and until now only country had a way out of that ambiguity.
--
-- Named and traced twice already, not discovered here:
-- docs/absence-as-known-value-inventory-2026-09-03.md (line ~21-24) documents the age/grade
-- half of this exact gap directly; docs/eligibility-boolean-refactor-notes-2026-09-03.md is
-- the deeper design note on the same shape, written up per CEO's own instruction rather than
-- fixed at the time. This migration is the narrow, additive piece CEO signed off on from
-- that backlog -- NOT the wider `eligible: boolean` -> three-state redesign that doc
-- explicitly reserves for founder sign-off; nothing here touches opportunity_matches.eligible
-- or any ranking/filtering call site.
--
-- *** NOT YET APPLIED *** -- prepared on oryn/d3-age-grade-eligibility-confirmed-open-
-- 2026-09-04, application is a separate explicit step (same posture 0060's own header
-- documents for itself).
--
-- Two independent flags, not one combined "eligibility_confirmed_open" -- an opportunity can
-- be genuinely gated by grade with no age floor/ceiling at all (Wharton Global Youth's Future
-- of the Business World: "grades 9-12," no stated age limit) or genuinely gated by age with
-- no grade requirement (George Mason's ASSIP: "15 years or older... no maximum age," no
-- grade language at all) -- both real, confirmed-during-D2 research examples, not
-- hypothetical. Collapsing them into one flag would force one to borrow the other's meaning.
--
-- Shape mirrors 0060 exactly, per CEO's explicit instruction not to invent a new pattern:
-- boolean not null default false (the honest default -- most rows are simply unresearched,
-- never "confirmed unrestricted"), plus a CHECK constraint preventing a row from
-- simultaneously claiming "confirmed no restriction" and carrying the structured bound that
-- would contradict it.

alter table public.opportunities
  add column if not exists age_eligibility_confirmed_open boolean not null default false,
  add column if not exists grade_eligibility_confirmed_open boolean not null default false;

comment on column public.opportunities.age_eligibility_confirmed_open is
  'Research-confirmed "no age floor or ceiling — genuinely open at any age," set only from an official-source statement. false = not confirmed (the honest default; most rows are simply unresearched), never "restricted." An actual age bound populates minimum_age/maximum_age instead — the check below keeps the two claims from ever being asserted together.';

comment on column public.opportunities.grade_eligibility_confirmed_open is
  'Research-confirmed "no grade-level restriction — genuinely open to any grade," set only from an official-source statement. false = not confirmed (the honest default; most rows are simply unresearched), never "restricted." A real grade restriction populates eligible_grades instead — the check below keeps the two claims from ever being asserted together.';

alter table public.opportunities
  drop constraint if exists opportunities_age_confirmed_open_no_structured_bound;

alter table public.opportunities
  add constraint opportunities_age_confirmed_open_no_structured_bound
  check (
    not (
      age_eligibility_confirmed_open
      and (minimum_age is not null or maximum_age is not null)
    )
  );

alter table public.opportunities
  drop constraint if exists opportunities_grade_confirmed_open_no_structured_restriction;

alter table public.opportunities
  add constraint opportunities_grade_confirmed_open_no_structured_restriction
  check (
    not (
      grade_eligibility_confirmed_open
      and cardinality(eligible_grades) > 0
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 3/8 — Migration 0127: admission_rate_basis'e 'not_published' (D1)
-- ─────────────────────────────────────────────────────────────────────────
-- Fourth state for admission_rate_basis (migration 0119), CEO's own correction of a real gap
-- found doing the D1 QS-top-100 fill (2026-09-04): NUS, Tsinghua, and Peking each have a
-- real, conceptually-single admission rate the university simply does not publish -- neither
-- of 0119's two states describes this. 'not_researched' means nobody has looked yet, which is
-- false (a research pass looked, specifically, and confirmed nothing official exists to cite).
-- 'no_single_rate' means the institution's own structure has no single rate to state (TU
-- Munich, TU Delft) -- also false; these institutions plausibly compute one internally, they
-- just don't release it. Leaving the column at its default ('not_researched') after a real
-- research pass would read as "unresearched" to the next session, who would spend the same
-- effort re-confirming what this pass already confirmed.
--
-- No application code reads admission_rate_basis yet (0119's own migration note: it writes
-- the column, nothing downstream consumes it) -- adding a fourth value is cheap and safe on
-- that basis; the UI-facing distinction between "not researched" and "researched, not
-- published" is a separate, later piece of work.
alter table public.university_statistics
  drop constraint university_statistics_admission_rate_basis_check;

alter table public.university_statistics
  add constraint university_statistics_admission_rate_basis_check
  check (admission_rate_basis is null or admission_rate_basis = any (array['published', 'not_researched', 'no_single_rate', 'not_published']));

comment on column public.university_statistics.admission_rate_basis is
  'Why admission_rate is (or is not) set. ''published'': a real, single, officially-published rate exists in admission_rate (e.g. Edinburgh''s 53% offer rate, 2025 cycle). ''not_researched'' (default): nobody has determined this university''s admission-rate situation yet -- admission_rate is null simply because research hasn''t reached it. ''no_single_rate'': actively researched and confirmed the institution has no single admission rate by construction -- e.g. TU Munich (unrestricted/NC/aptitude-assessment set per program, not university-wide) or TU Delft (6 selective numerus-fixus programs, the rest open-admission) -- admission_rate is null and should stay null. ''not_published'' (added 0127): actively researched, a single rate plausibly exists, but the university does not release one officially -- e.g. NUS, Tsinghua, Peking (2026-09-04 QS-top-100 pass) -- admission_rate stays null, distinct from ''not_researched'' so a later pass does not re-spend the same research effort re-confirming the same absence. See docs/fill-9-universities-findings-2026-09-04.md for the original finding this column answers, and docs/d1-qs-top100-fill-2026-09-04.md for the ''not_published'' case.';

-- ─────────────────────────────────────────────────────────────────────────
-- 4/8 — D1: QS top-100 dolgusu, ilk dokuz kurum (0126/0127'den bağımsız)
-- Tek DO bloğu: bu 9 kurumun INSERT'leri ya hepsi yeni (ilk koşu) ya hepsi
-- zaten var (ikinci koşu) -- aynı dosyanın iki katı yapıştırılması senaryosunda
-- kısmi durum yok, o yüzden tek blok doğru granülerlik.
-- ─────────────────────────────────────────────────────────────────────────
do $D1$
begin
-- Top-50 QS fill, 9 universities: Oxford, Princeton, University of Chicago, UPenn,
-- TU Munich, Universite PSL, Edinburgh, King's College London, TU Delft.
-- Full account: docs/fill-9-universities-findings-2026-09-04.md. Every fact below carries
-- its own source_url and retrieval date; anything not findable was left out entirely rather
-- than guessed. Research ran in a Claude Code session (WebSearch/WebFetch/Browser pane) --
-- the live app never called an AI API for any of this.
--
-- ORDERING: section C below references university_statistics.admission_rate_basis, added by
-- supabase/migrations/0119_admission_rate_basis.sql (written not applied). Apply 0119 first --
-- running section C before 0119 fails cleanly with 'column does not exist', which is the
-- correct failure; it does not half-apply. Sections A, B, D have no such dependency and can
-- run independently of 0119's timing.
--
-- BEFORE APPLYING: every INSERT below was checked against what already exists for these 9
-- universities as of 2026-09-04 (queried live, not assumed) to avoid duplicating rows another
-- pass already staged -- Delft, KCL, and Edinburgh already had real, well-sourced tuition
-- figures in university_profile_metrics from a 2026-08-16/19 UK/NL acquisition pass, and are
-- deliberately NOT touched again here. Section A is the one place this pass found existing
-- staged data that looks wrong, not just incomplete -- read it before anything else.


-- ============================================================================================
-- SECTION A -- CORRECTION, READ FIRST: TU Munich's existing tuition_international_annual
-- row appears to be wrong, sourced from a weaker tier than what this pass found.
-- ============================================================================================
--
-- The existing row (verified 2026-08-18, university_id 52409036-32ff-47ff-9815-c96a4bc89125)
-- sets BOTH tuition_domestic_annual and tuition_international_annual to 0, with a note citing
-- studying-in-germany.org (a third-party explainer, not TUM's own domain or an official
-- government source) and explicitly stating: "not a per-institution fee page individually
-- re-read this pass -- the fact being verified is a state-level policy, not an institutional
-- choice." Its reasoning: only Baden-Wurttemberg charges non-EU tuition, and TUM is in Bavaria.
--
-- This pass fetched TUM's OWN fees page directly (https://www.tum.de/en/studies/fees/tuition,
-- retrieved 2026-09-04) and found: "Bachelor's degree programs: usually 2,000 or 3,000 euros
-- per semester" for non-EU/EEA students, and "EU/EEA citizens are not required to pay tuition
-- fees" for the domestic case. Domestic matches the existing row (0 -- confirmed, not
-- disturbed below). International does not: TUM is a real, current exception to the general
-- Bavarian policy the existing row generalized from, per TUM's own page. Per the source-
-- priority rule (university's own page over a third-party explainer), this correction updates
-- the existing row rather than inserting a conflicting second one -- university_profile_metrics
-- has no unique constraint on (university_id, metric_code), so a second row would leave
-- lib/universities/queries.ts's getAllResolvedTuitionAmounts to pick between two same-metric
-- rows arbitrarily (whichever the unordered-within-university_id page returns first), the
-- exact "silently wrong for some readers" failure this whole fill is trying to avoid.
--
-- value_numeric uses the LOW end (2,000 EUR/semester x 2 = 4,000 EUR/year) as a conservative
-- anchor, matching scripts/acquire-university-statistics-uk.ts's own established convention
-- for a range ("never the number a student would actually be quoted without knowing their
-- course"); the full range is in notes. precision_state changes from 'exact' to 'range'
-- accordingly.
--
-- Review this section on its own before applying -- it changes a "free" claim to a "not free"
-- claim for real students, which is a bigger call than the additions in the rest of this file.
update university_profile_metrics
set
  value_numeric = 4000,
  precision_state = 'range',
  notes = 'CORRECTED 2026-09-04 (was 0, sourced to a third-party generalization about German state tuition policy not individually re-checked against this institution). TUM''s own fees page states non-EU/EEA bachelor''s tuition is "usually 2,000 or 3,000 euros per semester" (4,000-6,000 EUR/year) -- TUM is a real, current exception to the general Bavarian no-tuition policy. value_numeric is the low end (2,000 EUR/semester x 2), a conservative anchor, not a guaranteed figure -- the real range is 4,000-6,000 EUR/year depending on program. Semesterbeitrag (student-union dues, ~150-350 EUR/semester nationally) is separate and not itemised here, same as the prior row.',
  source_url = 'https://www.tum.de/en/studies/fees/tuition',
  verified_at = '2026-09-04T00:00:00Z',
  updated_at = now()
where university_id = '52409036-32ff-47ff-9815-c96a4bc89125'
  and metric_code = 'tuition_international_annual'
  and value_numeric = 0; -- guards against re-running after a manual fix already changed this


-- ============================================================================================
-- SECTION B -- university_requirements: UChicago, UPenn, TU Munich, PSL
-- ============================================================================================
-- TU Munich and PSL each already had 2 requirement rows (uni-assist/TUMonline deadline
-- mechanics for TUM; a general "follow these steps" pointer + "bachelor's are selective" for
-- PSL) -- checked live before writing these, and every row below is a genuinely different
-- fact from a different or more specific page, not a restatement.

-- UChicago (0 existing rows) -- collegeadmissions.uchicago.edu/apply/application/required-materials/, retrieved 2026-09-04
insert into university_requirements (university_id, requirement_type, title, requirement_detail, is_required, is_exclusion, data_confidence, source_url, retrieved_at, data_status, verification_state) values
('4e05164a-d824-4bc3-8bfe-676c89d809ab', 'standardized_test',
 'No Harm testing policy: submitting an SAT or ACT is optional; any score submitted is only used if it helps the application',
 'Submitting an SAT or ACT is optional and not required for admission. "No Harm" policy: any SAT or ACT score submitted will only be used in review if it will positively affect an applicant''s chance of admission. Test scores that may negatively impact an admission decision will not be considered in review. Applies to domestic, international, and transfer applicants alike.',
 false, false, 'high', 'https://collegeadmissions.uchicago.edu/apply/application/required-materials/', '2026-09-04', 'fresh', 'verified_current'),
('4e05164a-d824-4bc3-8bfe-676c89d809ab', 'recommendation',
 'Two teacher evaluations required, from teachers who taught an academic subject',
 'We require two recommendations from teachers who have taught you in an academic subject (high school teachers for first-year applicants; college instructors for transfer applicants). An optional third supplemental letter from another teacher, employer, or mentor is also accepted.',
 true, false, 'high', 'https://collegeadmissions.uchicago.edu/apply/application/required-materials/', '2026-09-04', 'fresh', 'verified_current'),
('4e05164a-d824-4bc3-8bfe-676c89d809ab', 'essay',
 'Common/Coalition personal statement plus a UChicago Supplement: one extended essay (choice of prompts) and one short "why UChicago" essay',
 'Personal statement via the Common or Coalition Application, sent to every school applied to. Plus the UChicago Supplement: one extended essay of your choice from a list of prompts, and one short essay on why you would like to attend the University of Chicago.',
 true, false, 'high', 'https://collegeadmissions.uchicago.edu/apply/application/required-materials/', '2026-09-04', 'fresh', 'verified_current'),
('4e05164a-d824-4bc3-8bfe-676c89d809ab', 'supplemental_requirement',
 'Application fee $90, automatic waiver for applicants requesting need-based financial aid',
 'The University of Chicago does not charge an application fee for students applying for need-based financial aid. For students not applying for need-based financial aid, the application fee is $90.',
 true, false, 'high', 'https://collegeadmissions.uchicago.edu/apply/application/required-materials/', '2026-09-04', 'fresh', 'verified_current'),
('4e05164a-d824-4bc3-8bfe-676c89d809ab', 'curriculum',
 'No specific required course set, but the most challenging and rigorous coursework available is encouraged',
 'The University of Chicago does not require high school applicants to complete any specific set of courses for admission, but instead encourages students to pursue the most challenging and rigorous coursework available to them.',
 false, false, 'high', 'https://collegeadmissions.uchicago.edu/apply/application/required-materials/', '2026-09-04', 'fresh', 'verified_current');

-- UPenn (0 existing rows) -- admissions.upenn.edu/how-to-apply/first-year-applicants/application-requirements, retrieved 2026-09-04
insert into university_requirements (university_id, requirement_type, title, requirement_detail, is_required, is_exclusion, data_confidence, source_url, retrieved_at, data_status, verification_state) values
('1185e720-36d4-4bbc-b4bb-fced79b73532', 'standardized_test',
 'Testing REQUIRED starting the 2025-26 cycle (previously test-optional); hardship waiver available',
 'Penn applicants are required to submit the SAT or ACT. Applicants who face hardship in meeting this requirement can submit a waiver directly through the application instead. Confirmed on the primary admissions page specifically because this policy changed recently from test-optional.',
 true, false, 'high', 'https://admissions.upenn.edu/how-to-apply/first-year-applicants/application-requirements', '2026-09-04', 'fresh', 'verified_current'),
('1185e720-36d4-4bbc-b4bb-fced79b73532', 'recommendation',
 'Two required letters (school counselor + one core-subject teacher), one further optional letter permitted',
 'Two required letters of recommendation: one from a school counselor or college official, and one from a teacher in a core subject area. One optional letter from a second teacher or community supporter is also permitted.',
 true, false, 'high', 'https://admissions.upenn.edu/how-to-apply/first-year-applicants/application-requirements', '2026-09-04', 'fresh', 'verified_current'),
('1185e720-36d4-4bbc-b4bb-fced79b73532', 'essay',
 'Three prompts: a 150-200 word thank-you note, a 150-200 word "community at Penn" response, and one school-specific prompt',
 '(1) "Write a short thank-you note to someone you have not yet thanked and would like to acknowledge" (150-200 words). (2) "How will you explore community at Penn?" (150-200 words). (3) A school-specific prompt unique to the undergraduate school applied to.',
 true, false, 'high', 'https://admissions.upenn.edu/how-to-apply/first-year-applicants/application-requirements', '2026-09-04', 'fresh', 'verified_current'),
('1185e720-36d4-4bbc-b4bb-fced79b73532', 'supplemental_requirement',
 'Application fee $75, waivers available through the application platform',
 'The application fee to apply to Penn is $75. Fee waivers are available through the application platform.',
 true, false, 'high', 'https://admissions.upenn.edu/how-to-apply/first-year-applicants/application-requirements', '2026-09-04', 'fresh', 'verified_current');

-- TU Munich (2 existing rows, both different facts -- see header) -- tum.de, retrieved 2026-09-04
insert into university_requirements (university_id, requirement_type, title, requirement_detail, is_required, is_exclusion, data_confidence, source_url, retrieved_at, data_status, verification_state) values
('52409036-32ff-47ff-9815-c96a4bc89125', 'curriculum',
 'University entrance qualification required (Abitur for German applicants); foreign qualifications evaluated via Uni-Assist',
 'To be admitted to TUM, you must hold a university entrance qualification. For German applicants, the Abitur or equivalent. Foreign higher education entrance qualifications are evaluated, often through Uni-Assist, which handles recognition of international university entrance qualifications.',
 true, false, 'high', 'https://www.tum.de/en/studies/application/application-info-portal/admission-requirements', '2026-09-04', 'fresh', 'verified_current'),
('52409036-32ff-47ff-9815-c96a4bc89125', 'entrance_exam',
 'Most programs subject to an aptitude assessment; TUM categorizes programs as unrestricted, restricted (Numerus Clausus), or aptitude-assessment -- program-specific',
 'The majority of applicants are subject to an aptitude assessment. Programs are categorized as unrestricted (no selection process), restricted (Numerus Clausus / NC), or subject to aptitude assessment (both Bachelor and Master levels) -- which applies depends on the individual program.',
 false, false, 'medium', 'https://www.tum.de/en/studies/application/application-info-portal/admission-requirements', '2026-09-04', 'fresh', 'verified_current'),
('52409036-32ff-47ff-9815-c96a4bc89125', 'language_proficiency',
 'German-taught programs: DSH-2, or TestDaF level 4 (all sections), or telc Deutsch C1 Hochschule, or DSD II level B2 (all four sections), or Goethe/OSD Certificate C2',
 'Accepted German-language certificates for programs taught in German: DSH passed with an overall result of at least DSH-2; TestDaF with level 4 in all sections; telc Deutsch C1 Hochschule; DSD II with level B2 in all four sections; Goethe Certificate C2; OSD Certificate C2. Aerospace and Information Engineering bachelor''s programs accept a lower tier (DSH-1, DSD I, telc A2, TestDaF level 3, Goethe/OSD A2) as a program-specific exception.',
 true, false, 'high', 'https://www.tum.de/en/studies/application/application-info-portal/admission-requirements/language-certificates', '2026-09-04', 'fresh', 'verified_current'),
('52409036-32ff-47ff-9815-c96a4bc89125', 'english_proficiency',
 'English-taught programs (incl. the Management & Technology bachelor''s): TOEFL iBT 88, or IELTS Academic 6.5, or Cambridge CAE/CPE grade A/B/C, or PTE Academic 65+',
 'Accepted English-language certificates for English-taught programs: TOEFL iBT minimum score 88; IELTS Academic minimum overall band score 6.5; Cambridge CAE or CPE with grades A, B, or C; PTE Academic overall score at least 65. Waivable with a full secondary school education in English, or a prior degree where the language of instruction was English in at least 50% of the program.',
 true, false, 'high', 'https://www.tum.de/en/studies/application/application-info-portal/admission-requirements/language-certificates', '2026-09-04', 'fresh', 'verified_current');

-- Universite PSL (2 existing rows, both different facts -- see header) -- psl.eu, retrieved 2026-09-04
insert into university_requirements (university_id, requirement_type, title, requirement_detail, is_required, is_exclusion, data_confidence, source_url, retrieved_at, data_status, verification_state) values
('42f43a53-b072-4734-8c22-6499b1254b04', 'application_deadline',
 'French-track applicants (EU or French baccalaureate) apply via Parcoursup; 2026 cycle: registration opened January 19, confirm-choices deadline April 1',
 'French-track undergraduate applicants apply through the Parcoursup platform. 2026 admissions cycle: start of registration and program-choice drafting January 19, 2026; final deadline to confirm choices April 1, 2026. Selection process described as highly selective, prioritizing geographical, social, and cultural diversity; exact requirements vary by the specific PSL member school/program.',
 true, false, 'high', 'https://psl.eu/en/education/applying-bachelors-degree', '2026-09-04', 'fresh', 'verified_current'),
('42f43a53-b072-4734-8c22-6499b1254b04', 'international_requirement',
 'Non-EU applicants outside Etudes en France use the DAP procedure; those inside apply via Mon Master/PSL portals then Etudes en France pre-consular formalities; Dauphine-PSL requires both its own portal AND Etudes en France',
 'Non-EU applicants living outside the Etudes en France network use the DAP (Demande d''Admission Prealable) procedure. Those in Etudes-en-France-covered countries apply via Mon Master or PSL portals, then create an "Etudes en France" application for pre-consular formalities, then request a student visa through the French Embassy/Consulate. Dauphine-PSL specifically requires applying through BOTH the Etudes en France portal and its own Dauphine-PSL application portal.',
 true, false, 'high', 'https://psl.eu/en/international-admissions-procedures-psl', '2026-09-04', 'fresh', 'verified_current');


-- ============================================================================================
-- SECTION C -- university_statistics: Oxford, Edinburgh, TU Munich, TU Delft
-- (none of these 4 had an existing row -- has_stats was false for all)
-- REQUIRES migration 0119 applied first (admission_rate_basis).
-- ============================================================================================

-- Oxford: real admitted-count/demographic facts exist but don't map to any column here (no
-- applicant/offer totals found -- see docs/fill-9-universities-findings-2026-09-04.md).
-- admission_rate_basis omitted -- the column default ('not_researched') is the honest, correct
-- value: this is a genuine "haven't found it" gap, not a structural absence.
-- cost_of_attendance deliberately null -- see the findings doc's schema-gap section; the real
-- figures (Home GBP 10,050 / Overseas GBP 39,620-66,580, 2027/28) belong in
-- university_profile_metrics as a fill, not forced into this scalar column.
insert into university_statistics (university_id, stat_year, source, data_confidence, retrieved_at) values
('e5164eb3-88c1-4ecc-81d7-d591ea0c34ea', 2025, 'https://www.ox.ac.uk/about/facts-and-figures/admissions-statistics/undergraduate-students', 'medium', '2026-09-04T00:00:00Z');

-- Edinburgh: a genuinely clean single figure -- 2025 cycle, 68,862 applications, 36,195
-- offers, 53% offer rate, 7,626 acceptances. Using offer rate as the admission_rate analog,
-- matching how Princeton's own already-stored figure works (offers/applicants).
insert into university_statistics (university_id, stat_year, admission_rate, admission_rate_basis, source, data_confidence, retrieved_at) values
('e2feb81c-1bda-4889-8aa9-37783b720901', 2025, 0.53, 'published', 'https://study.ed.ac.uk/undergraduate/applying/selection/admissions-statistics', 'high', '2026-09-04T00:00:00Z');

-- TU Munich: no admission_rate to report -- Germany's admission system is
-- unrestricted/NC/aptitude-assessment PER PROGRAM, not a single university-wide rate. This is
-- the structural case admission_rate_basis exists to distinguish from "not yet researched."
insert into university_statistics (university_id, admission_rate_basis, source, data_confidence, retrieved_at) values
('52409036-32ff-47ff-9815-c96a4bc89125', 'no_single_rate', 'https://www.tum.de/en/studies/application/application-info-portal/admission-requirements', 'high', '2026-09-04T00:00:00Z');

-- TU Delft: same reasoning as TU Munich, different mechanism -- 6 selective numerus-fixus
-- programs (Aerospace Engineering, Computer Science & Engineering, Architecture, Clinical
-- Technology, Nanobiology, +1) with per-department selection since 2017; the rest are
-- open-admission subject to meeting the diploma requirement. Most of the university has no
-- rate to report at all, not a gap in research.
-- `source` kept short, matching every other row's style (a plain display label, never a
-- clickable href -- app/(app)/universities/[id]/page.tsx passes it as SourceBadge's
-- sourceName only, no url prop); the two-page derivation is in this comment, not the value.
insert into university_statistics (university_id, admission_rate_basis, source, data_confidence, retrieved_at) values
('b3e69141-b7fb-474a-a8df-44804aedd5f5', 'no_single_rate', 'https://www.tudelft.nl', 'high', '2026-09-04T00:00:00Z');


-- ============================================================================================
-- SECTION D -- university_sources: Princeton rollup (existing, already-verified citations
-- surfaced into the tracking table) + new specific pages actually used for sections B/C above
-- ============================================================================================
-- 'official_government_dataset' is a new source_type label (approved 2026-09-04) -- the
-- product's own source-priority list (AGENTS.md: official university site > official
-- government dataset > ...) already distinguishes this tier; university_sources.source_type
-- is plain text, not an enum, so no migration is needed to introduce it.

-- Princeton: pure rollup. Every fact below was already in the database (programs verified
-- 2026-08-17/21, requirements verified 2026-08-21 and 2026-09-03, statistics from College
-- Scorecard verified 2026-08-18) -- this section adds no new claims, only makes the existing
-- sourcing visible in the table the depth-check actually reads.
insert into university_sources (university_id, source_url, source_domain, source_type, retrieved_at, confidence, raw_excerpt) values
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://ua.princeton.edu/fields-study/departmental-majors-degree-bachelor-arts', 'ua.princeton.edu', 'official_primary', '2026-08-21T00:00:00Z', 'high', 'A.B. degree program listing, Princeton Office of the Dean of the College.'),
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://ua.princeton.edu/fields-study/departmental-majors-degree-bachelor-science-engineering', 'ua.princeton.edu', 'official_primary', '2026-08-21T00:00:00Z', 'high', 'B.S.E. degree program listing, Princeton Office of the Dean of the College.'),
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://spia.princeton.edu/academics/undergraduate-program', 'spia.princeton.edu', 'official_primary', '2026-08-17T00:00:00Z', 'high', 'Princeton School of Public and International Affairs undergraduate program page.'),
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://engineering.princeton.edu/departments/operations-research-and-financial-engineering', 'engineering.princeton.edu', 'official_primary', '2026-08-17T00:00:00Z', 'high', 'Princeton Engineering department page, ORFE.'),
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://engineering.princeton.edu/departments/computer-science', 'engineering.princeton.edu', 'official_primary', '2026-08-17T00:00:00Z', 'high', 'Princeton Engineering department page, Computer Science.'),
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://economics.princeton.edu/undergraduate-program/', 'economics.princeton.edu', 'official_primary', '2026-08-17T00:00:00Z', 'high', 'Princeton Economics department undergraduate program page.'),
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://admission.princeton.edu/how-apply/application-dates-deadlines/single-choice-early-action', 'admission.princeton.edu', 'official_primary', '2026-08-21T00:00:00Z', 'high', 'Single-Choice Early Action dates and deadlines.'),
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://admission.princeton.edu/apply/princeton-specific-questions', 'admission.princeton.edu', 'official_primary', '2026-09-03T00:00:00Z', 'high', 'Princeton-specific supplemental essay prompts.'),
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://admission.princeton.edu/apply/standardized-testing', 'admission.princeton.edu', 'official_primary', '2026-09-03T00:00:00Z', 'high', 'Standardized testing policy, current and upcoming cycles.'),
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://admission.princeton.edu/apply/application-checklist', 'admission.princeton.edu', 'official_primary', '2026-09-03T00:00:00Z', 'high', 'First-year application checklist.'),
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://admission.princeton.edu/apply/before-you-apply', 'admission.princeton.edu', 'official_primary', '2026-09-03T00:00:00Z', 'high', 'Curriculum expectations before applying.'),
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://admission.princeton.edu/apply/graded-written-paper', 'admission.princeton.edu', 'official_primary', '2026-09-03T00:00:00Z', 'high', 'Graded written paper submission requirement.'),
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://finaid.princeton.edu/apply-aid-prospective-students', 'finaid.princeton.edu', 'official_primary', '2026-08-21T00:00:00Z', 'high', 'Financial aid application process for prospective students.'),
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://admission.princeton.edu/apply/international-students', 'admission.princeton.edu', 'official_primary', '2026-09-03T00:00:00Z', 'high', 'International student application requirements.'),
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://admission.princeton.edu/apply/us-military-applicants', 'admission.princeton.edu', 'official_primary', '2026-08-21T00:00:00Z', 'high', 'US military applicant process.'),
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://admission.princeton.edu/faqs', 'admission.princeton.edu', 'official_primary', '2026-09-03T00:00:00Z', 'high', 'Admissions FAQ, incl. GPA/class rank policy.'),
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://collegescorecard.ed.gov/school/?186131-Princeton-University=', 'collegescorecard.ed.gov', 'official_government_dataset', '2026-08-18T00:00:00Z', 'high', 'US Dept. of Education College Scorecard, UNITID 186131 -- admission_rate/SAT/ACT/graduation_rate/cost_of_attendance source, independently cross-checked 2026-09-04 (stored 4.62% admission_rate matches Scorecard''s own published figure).');

-- New specific pages this pass actually extracted facts from, beyond what each university's
-- existing (generic homepage-level) source rows already cite.
insert into university_sources (university_id, source_url, source_domain, source_type, retrieved_at, confidence, raw_excerpt) values
('e5164eb3-88c1-4ecc-81d7-d591ea0c34ea', 'https://www.ox.ac.uk/about/facts-and-figures/admissions-statistics/undergraduate-students', 'ox.ac.uk', 'official_primary', '2026-09-04T00:00:00Z', 'medium', '"In 2025, 3,302 students were admitted to Oxford to begin their undergraduate studies; 79% of undergraduate students admitted were from the UK."'),
('e5164eb3-88c1-4ecc-81d7-d591ea0c34ea', 'https://www.ox.ac.uk/admissions/undergraduate/fees-and-funding/course-fees', 'ox.ac.uk', 'official_primary', '2026-09-04T00:00:00Z', 'high', '2027/28 course fees: Home GBP 10,050/yr; Overseas GBP 39,620-66,580/yr, varies by course.'),
('4e05164a-d824-4bc3-8bfe-676c89d809ab', 'https://collegeadmissions.uchicago.edu/apply/application/required-materials/', 'collegeadmissions.uchicago.edu', 'official_primary', '2026-09-04T00:00:00Z', 'high', 'Full first-year application requirements: testing, recommendations, essays, fee.'),
('1185e720-36d4-4bbc-b4bb-fced79b73532', 'https://admissions.upenn.edu/how-to-apply/first-year-applicants/application-requirements', 'admissions.upenn.edu', 'official_primary', '2026-09-04T00:00:00Z', 'high', 'Full first-year application requirements, incl. the 2025-26 testing-policy change to required.'),
('52409036-32ff-47ff-9815-c96a4bc89125', 'https://www.tum.de/en/studies/application/application-info-portal/admission-requirements', 'tum.de', 'official_primary', '2026-09-04T00:00:00Z', 'high', 'Entrance qualification and aptitude-assessment admission process.'),
('52409036-32ff-47ff-9815-c96a4bc89125', 'https://www.tum.de/en/studies/application/application-info-portal/admission-requirements/language-certificates', 'tum.de', 'official_primary', '2026-09-04T00:00:00Z', 'high', 'German and English language certificate requirements, exact levels.'),
('52409036-32ff-47ff-9815-c96a4bc89125', 'https://www.tum.de/en/studies/fees/tuition', 'tum.de', 'official_primary', '2026-09-04T00:00:00Z', 'high', 'Non-EU/EEA bachelor''s tuition: "usually 2,000 or 3,000 euros per semester" -- the correction basis for Section A.'),
('42f43a53-b072-4734-8c22-6499b1254b04', 'https://psl.eu/en/education/applying-bachelors-degree', 'psl.eu', 'official_primary', '2026-09-04T00:00:00Z', 'high', 'Parcoursup process and 2026 cycle dates for bachelor''s applicants.'),
('42f43a53-b072-4734-8c22-6499b1254b04', 'https://psl.eu/en/international-admissions-procedures-psl', 'psl.eu', 'official_primary', '2026-09-04T00:00:00Z', 'high', 'DAP and Etudes en France procedures for non-EU applicants.'),
('e2feb81c-1bda-4889-8aa9-37783b720901', 'https://study.ed.ac.uk/undergraduate/applying/selection/admissions-statistics', 'study.ed.ac.uk', 'official_primary', '2026-09-04T00:00:00Z', 'high', '2025 cycle: 68,862 applications, 36,195 offers, 53% offer rate, 7,626 acceptances.'),
('5b97d896-2a17-47ec-84ae-b544183bbd4f', 'https://www.kcl.ac.uk/about/strategy/learning-and-teaching/admissions-statistics', 'kcl.ac.uk', 'official_primary', '2026-09-04T00:00:00Z', 'medium', 'Admissions statistics published per faculty (9 PDFs), no university-wide aggregate -- basis for leaving admission_rate unset.'),
('b3e69141-b7fb-474a-a8df-44804aedd5f5', 'https://www.tudelft.nl/en/education/study-programme-orientation/practical-matters/tuition-fee-finances', 'tudelft.nl', 'official_primary', '2026-09-04T00:00:00Z', 'medium', 'Statutory vs institutional tuition-rate structure and DUO reference.'),
('b3e69141-b7fb-474a-a8df-44804aedd5f5', 'https://duo.nl/particulier/tuition-fees.jsp', 'duo.nl', 'official_government_dataset', '2026-09-04T00:00:00Z', 'high', '"EUR 2.694,-" statutory tuition fee, 2026-2027 academic year.');
exception when unique_violation then
  raise notice 'D1: bu kayıtlar zaten var, atlandı (ikinci koşu, zararsız)';
end
$D1$;

-- ─────────────────────────────────────────────────────────────────────────
-- 5/8 — D5: Caltech son başvuru tarihleri (0126/0127'den bağımsız)
-- Orijinal dosya düz INSERT'ti, university_deadlines'ın benzersizlik kısıtı
-- yok -- ikinci koşuda çift satır oluşuyordu. Açık bir 'yoksa ekle' koruması
-- eklendi, içerik değişmedi.
-- ─────────────────────────────────────────────────────────────────────────
-- D5, re-runnable version: data/research/sql-dry-runs/universities/d5-caltech-deadlines-2026-09-04.sql
-- carries the full research/attribution comments; this file only changes HOW it applies --
-- wraps the original plain INSERT in the exact precondition its own header already asked a
-- human to check by hand ("re-check university_deadlines for this university_id has zero
-- rows at apply time") as a real, executable guard, since university_deadlines has no
-- unique constraint that would otherwise catch a second application. Content of the VALUES
-- list is untouched, byte-for-byte, from the original file.
do $D5$
begin
  if not exists (select 1 from public.university_deadlines where university_id = 'd6fe8e8f-749f-462d-88b3-b22dfdc11a4c') then
    insert into university_deadlines (
      university_id, deadline_type, deadline_date, application_cycle, recurrence, cycle_year,
      cycle_label, verification_state, source_type, binding_policy, data_status, source_url, retrieved_at
    ) values
    ('d6fe8e8f-749f-462d-88b3-b22dfdc11a4c', 'early', '2026-11-01', 'Restrictive Early Action', 'dated_specific', 2027,
     'Restrictive Early Action', 'VERIFIED_CURRENT', 'official_primary', 'restrictive_single_choice', 'fresh',
     'https://www.admissions.caltech.edu/apply/first-year-applicants/deadlines', '2026-09-04T00:00:00Z'),
    ('d6fe8e8f-749f-462d-88b3-b22dfdc11a4c', 'document', '2026-11-06', 'Restrictive Early Action', 'dated_specific', 2027,
     'Restrictive Early Action', 'VERIFIED_CURRENT', 'official_primary', 'restrictive_single_choice', 'fresh',
     'https://www.admissions.caltech.edu/apply/first-year-applicants/deadlines', '2026-09-04T00:00:00Z'),
    ('d6fe8e8f-749f-462d-88b3-b22dfdc11a4c', 'application', '2027-01-04', 'Regular Decision', 'dated_specific', 2027,
     'Regular Decision', 'VERIFIED_CURRENT', 'official_primary', null, 'fresh',
     'https://www.admissions.caltech.edu/apply/first-year-applicants/deadlines', '2026-09-04T00:00:00Z'),
    ('d6fe8e8f-749f-462d-88b3-b22dfdc11a4c', 'document', '2027-01-10', 'Regular Decision', 'dated_specific', 2027,
     'Regular Decision', 'VERIFIED_CURRENT', 'official_primary', null, 'fresh',
     'https://www.admissions.caltech.edu/apply/first-year-applicants/deadlines', '2026-09-04T00:00:00Z');
    raise notice 'D5: Caltech''s 4 deadline rows inserted.';
  else
    raise notice 'D5: Caltech already has university_deadlines rows -- skipped, not re-inserted.';
  end if;
end
$D5$;

-- ─────────────────────────────────────────────────────────────────────────
-- 6/8 — D8: 12 gerçek hedef kurumun istatistik boşlukları (0127'den bağımsız)
-- Beş INSERT'e (LSE/Erasmus/UvA/Boğaziçi/Bocconi) açık 'yoksa ekle' koruması
-- eklendi -- tablonun (university_id, stat_year) kısıtı stat_year hiç
-- yazılmadığı için devreye girmiyordu, ikinci koşuda beşi de çift satır
-- oluşturuyordu, sessizce (hata bile vermiyordu).
-- ─────────────────────────────────────────────────────────────────────────
-- D8, re-runnable version: docs/d8-target-universities-stats-completeness-2026-09-04.md's
-- §4 SQL, unchanged in content -- this only adds an explicit existence guard to the 5 plain
-- INSERTs (LSE/Erasmus/UvA/Boğaziçi/Bocconi). university_statistics' own unique index is
-- (university_id, stat_year) with no coalesce, and none of these rows set stat_year, so
-- every insert lands on NULL -- standard SQL never treats NULL = NULL as a conflict, meaning
-- the unique index silently never fires and a second run doubles all five rows with no error
-- to catch. Found by running the full package twice and diffing per-university row counts,
-- not by inspecting the constraint definition first. Oxford's and Caltech's UPDATEs are
-- already safely guarded in the original (`and admission_rate is null` / `and sat_range_low
-- is null`) and are reproduced here unchanged.

-- Oxford: complete the existing row rather than inserting a second one.
update public.university_statistics
set
  admission_rate = 0.1420,
  admission_rate_basis = 'published',
  source = 'University of Oxford — Undergraduate admissions statistics, 2025 cycle. 3,302 admitted: confirmed directly on ox.ac.uk''s own live page (primary-read). 23,329 applications (→ 14.2% rate): reported via search synthesis, not independently confirmed — the figure lives in the Annual Admissions Statistical Report, served as a forced PDF download, and Tableau dashboards, neither readable by the tooling used here. https://www.ox.ac.uk/about/facts-and-figures/admissions-statistics/undergraduate-students',
  data_confidence = 'medium',
  retrieved_at = now()
where university_id = (select id from public.universities where name = 'University of Oxford')
  and admission_rate is null; -- guarded: never overwrites a value someone fills in the meantime

-- LSE: new row -- guarded, not just a plain insert (see file header: stat_year is never set,
-- so the table's own unique index can't catch a second attempt on its own). stat_year=2025
-- set explicitly (2026-09-04 follow-up): LSE's own finding cites the 2025 cycle by name,
-- matching Oxford's row; the other four D8 rows below stay null on purpose -- checked the
-- live table first, only 2 of 128 published rows and 0 of 2 existing no_single_rate rows
-- have stat_year set at all, so asserting one on a structural finding with no real cycle
-- would make it the outlier, not the convention. The not-exists guard is those four rows'
-- real protection, not stat_year.
insert into public.university_statistics
  (university_id, stat_year, admission_rate, admission_rate_basis, source, data_confidence, retrieved_at)
select id, 2025, 0.0633, 'published',
  'London School of Economics (official) — "in 2025, we received approximately 30,000 applications for roughly 1,900 places," rate derived from LSE''s own rounded figures, not a literal published percentage. https://www.lse.ac.uk/study-at-lse/Undergraduate/Teachers-schools-parents/Information-for-teachers-and-schools/admissions-advice',
  'medium', now()
from public.universities where name = 'London School of Economics and Political Science'
  and not exists (select 1 from public.university_statistics existing where existing.university_id = universities.id);

-- Erasmus Rotterdam, University of Amsterdam: confirmed no_single_rate (Dutch numerus-fixus-per-programme model).
insert into public.university_statistics (university_id, admission_rate_basis, source, data_confidence, retrieved_at)
select id, 'no_single_rate',
  'Erasmus University Rotterdam (official) — admission is per-programme (numerus fixus selection for some, open admission for others), no single university-wide rate. https://www.eur.nl/en/education/practical-matters/admission/bachelor-admission-and-application',
  'medium', now()
from public.universities where name = 'Erasmus University Rotterdam'
  and not exists (select 1 from public.university_statistics existing where existing.university_id = universities.id);

insert into public.university_statistics (university_id, admission_rate_basis, source, data_confidence, retrieved_at)
select id, 'no_single_rate',
  'University of Amsterdam (official) — admission is per-programme (numerus fixus selection for some, open admission for others), no single university-wide rate. https://www.uva.nl/en/education/admissions/bachelors/applying-for-a-selective-bachelors-programme.html',
  'medium', now()
from public.universities where name = 'University of Amsterdam'
  and not exists (select 1 from public.university_statistics existing where existing.university_id = universities.id);

-- Boğaziçi: no_single_rate -- CEO-confirmed.
insert into public.university_statistics (university_id, admission_rate_basis, source, data_confidence, retrieved_at)
select id, 'no_single_rate',
  'Boğaziçi University — admission via YKS (domestic) / YÖS (international) score-cutoffs set per programme each cycle; no single institution-wide admission rate is published or structurally applicable. No official rate found on bogazici.edu.tr.',
  'low', now()
from public.universities where name = 'Boğaziçi University'
  and not exists (select 1 from public.university_statistics existing where existing.university_id = universities.id);

-- Bocconi: not_published -- unblocked, migration 0127 is merged to main.
insert into public.university_statistics (university_id, admission_rate_basis, source, data_confidence, retrieved_at)
select id, 'not_published',
  'Bocconi University — searched unibocconi.it directly, including its own Results and Enrollment page; no applicant/admit counts or admission rate published.',
  'low', now()
from public.universities where name = 'Bocconi University'
  and not exists (select 1 from public.university_statistics existing where existing.university_id = universities.id);

-- Caltech: fill the one missing field on an otherwise-complete row. Confirmed via search
-- (multiple sources independently citing the same IPEDS 2025 survey figure for enrolled
-- testers, academic year 2024/25: middle-50% SAT 1530-1580) -- not pulled from the College
-- Scorecard API directly the way the row's other four fields were, so data_confidence on
-- the row is left untouched (still 'high', earned by those four) rather than raised or
-- lowered on the strength of this one secondary-sourced pair.
update public.university_statistics
set sat_range_low = 1530, sat_range_high = 1580
where university_id = (select id from public.universities where name = 'California Institute of Technology (Caltech)')
  and sat_range_low is null;

-- ─────────────────────────────────────────────────────────────────────────
-- 7/8 — D2: fırsat dolgusu, 0126'dan bağımsız kısım (sadece UPDATE, doğal
--        olarak iki kez çalıştırılabilir -- ek koruma gerekmiyor)
-- ─────────────────────────────────────────────────────────────────────────
-- D2 batch 2: opportunity eligibility fill, researched against official program pages
-- 2026-09-04. Prepared, NOT applied -- CEO applies. Safe to run in ANY order relative to
-- migration 0126 -- every statement below touches only columns that already exist live.
-- The 0126-dependent statements (age/grade confirmed-open flags) are in a SEPARATE file,
-- d2-batch2-requires-0126.sql, on purpose: CEO's own instruction was not to let SQL that
-- needs an unapplied migration sit mixed in with SQL that doesn't, after a package blew up
-- in the founder's hands tonight for exactly that reason.
--
-- Second batch of 15 (next-nearest deadlines after batch 1, excluding batch 1's 15 ids).
-- 5 rows below got a confident, sourced fill; the rest of the 15 had no confidently-
-- extractable answer on the page fetched (listed in docs/opportunity-eligibility-d2-not-
-- found-2026-09-04.md's Batch 2 section) or were re-verified as already accurate.

-- ============================================================================
-- ADDITIONS (filling a genuine blank, not changing an existing value)
-- ============================================================================

-- 1. Özyeğin University Summer Research Program -- grade eligibility confirmed ("All high
-- school levels can apply").
update public.opportunities
set eligible_grades = array['9','10','11','12'],
    last_verified_at = now()
where id = '2f0e0301-5dd4-4d25-91a4-8f73bf5584e9';

-- 2. Penn Medicine Summer Program for High School Students -- grade eligibility confirmed
-- ("rising high school juniors and seniors").
update public.opportunities
set eligible_grades = array['11','12'],
    last_verified_at = now()
where id = '511a9497-145a-4725-a77e-31f50a4f920d';

-- 3. İTÜ Lise Yaz Okulu 2026 -- grade eligibility confirmed ("tüm lise öğrencileri başvuru
-- yapabilir" -- all high school students may apply).
update public.opportunities
set eligible_grades = array['9','10','11','12'],
    last_verified_at = now()
where id = '973b3bdd-59c2-4e99-a76b-2006b365d63a';

-- 4. Immerse Education Summer School (Cambridge) -- official page explicitly states
-- "students aged 13-18 from around the world," plus a stated alumni base from 140+
-- countries -- an affirmative statement, not just absence of a restriction.
update public.opportunities
set country_eligibility_confirmed_open = true,
    last_verified_at = now()
where id = '7f90019e-05c7-4059-ae13-8e285ab3ea38';

-- 5. Penn Pre-College Program (Residential) -- official page states plainly "International
-- students welcome. F-1 student visa required."
update public.opportunities
set country_eligibility_confirmed_open = true,
    last_verified_at = now()
where id = 'f70c6987-d11c-4f0c-87f2-1c11e5dee491';

-- ============================================================================
-- CHECKED, NOT A FALSE SINGLE-COUNTRY CASE -- report only, no SQL
-- ============================================================================
-- CEO's own instruction: watch specifically for "single country stored but program is
-- actually international" (the YIS pattern from batch 1). One candidate this batch,
-- checked directly, is NOT that pattern -- worth stating explicitly rather than silently
-- passing over it, since a pattern-check that only ever reports hits looks unverified.
--
-- Geleceği Eşitle -- Sustainable Livelihoods Train-the-Trainer Program
-- (id 2833637b-82bf-459e-afee-3eb355aa3fd0), stored eligible_countries = ['Türkiye'].
-- Official page: "Turkish and foreign young people aged 15-24" may apply, but must be
-- "living in all 81 provinces of Türkiye" -- i.e. RESIDENCY-gated, not nationality-gated.
-- This schema's eligible_countries is checked against a student's own `country` (residence
-- on file), not citizenship (a separate column/check) -- so ['Türkiye'] correctly encodes
-- "must reside in Türkiye" regardless of the student's actual nationality. No SQL change:
-- the existing value is accurate as stored, just for a reason worth stating plainly rather
-- than assumed. (Read as an interpretation of the schema's own semantics, not independently
-- confirmed against a second source -- flagged as such.)

-- D2 — visible-priority batch (2026-09-04), additions/corrections needing no unapplied
-- migration. Prepared, NOT applied -- CEO applies.
--
-- Scope: CEO redirected priority from deadline order (348 total, alphabetical/chronological
-- would take ~20 batches) to MEASURED visibility -- what a student can actually see. Measured
-- rather than assumed, mirroring the same-day deadline-fill precedent's own method:
--   saved_opportunities (status='saved'): 4 distinct opportunities, all 4 carry a gap.
--   opportunity_matches, mirroring lib/opportunities/home-strip.ts's own selection exactly
--     (match_score DESC, status=active + cycle_status not closed/historical/discontinued +
--     deadline not passed, HOME_STRIP_SIZE=5 per student, not the 30-candidate pool): 8
--     students x top 5 = 31 distinct opportunities, 30 carry a gap.
--   Union: 34 distinct opportunities total, 33 (97%) carry a gap -- a small, high-leverage
--   set, not spread thin across the full 367. Full list and per-row research notes: this
--   file plus docs/opportunity-eligibility-d2-not-found-2026-09-04.md's Visible-priority
--   section.
--
-- Re-measured before finalizing this file, per CEO's own explicit requirement (the set
-- isn't static): re-ran the identical query and found one new entrant, Tufts Pre-College
-- Programs (310c976c-1a0f-4566-8df2-2e186c898804) -- already fully resolved on every axis,
-- needs nothing. Nothing dropped out. The 33-row research target list below is otherwise
-- unchanged.
--
-- Also caught in that same re-check, before it became a wrong number in a report: two of
-- this file's own first-draft entries were wrong. NYC Commuter Summer's eligible_grades was
-- ALREADY ['9','10','11','12'] in the live row -- the WebFetch answer confirmed existing
-- data, it did not fill a blank, and the row's real gap (minimum_age/maximum_age, both
-- null) was never actually addressed. Removed that no-op entirely rather than claim it as a
-- fix; the row stays in the not-found doc with its real gap named. Yale Young Global
-- Scholars' proposed grade value differs from what's currently stored -- that's a
-- CORRECTION, not an addition, and is moved to its own section below rather than mixed in,
-- same discipline as YIS Stock Pitch Competition in batch 1.
--
-- Projected effect of this file alone (computed directly against live data via CASE,
-- not applied): the visible-34 set's gapped count drops from 33 to 30. Applying
-- d2-visible-priority-requires-0126-2026-09-04.sql on top (once 0126 itself is applied)
-- drops it further to 29. Not a dramatic swing -- an honest, precisely computed one.

-- ============================================================================
-- ADDITIONS (filling a genuine blank, not changing an existing value)
-- ============================================================================

-- 1. Yale Young Global Scholars -- age. Official eligibility page: "Be between the ages
-- of 16-18 years old." (Grade is handled separately below, as a correction.)
update public.opportunities
set minimum_age = 16,
    maximum_age = 18,
    source_url = 'https://globalscholars.yale.edu/eligibility',
    last_verified_at = now()
where id = 'c3a98c43-dcfb-42cc-a23f-02a8a8154358';

-- 2. University of Notre Dame Pre-College: Summer Scholars -- grade confirmed, genuinely
-- empty before: "Current sophomores and juniors (will be rising juniors and seniors)."
update public.opportunities
set eligible_grades = array['10','11'],
    source_url = 'https://precollege.nd.edu/summer-scholars/eligibility-and-application-requirements/',
    last_verified_at = now()
where id = '445f2003-1b9c-4cc9-bc63-22e65e7d8f85';

-- 3. Wharton Data Science Competition -- grade confirmed, genuinely empty before: "open to
-- all current high school students."
update public.opportunities
set eligible_grades = array['9','10','11','12'],
    last_verified_at = now()
where id = 'cfb32772-6259-4e3a-9ead-bc289b463d08';

-- 4. International Economics Olympiad (IEO) -- age confirmed, genuinely empty before:
-- "contestants will all be under the age of 20 years on 30 June of the year of the
-- Olympiad." Translated to maximum_age = 19 as the direct reading of "under 20." Country
-- NOT set: the 74-country participation is mediated through "official national
-- organizers," a logistics structure different from an open/restricted nationality policy.
update public.opportunities
set maximum_age = 19,
    source_url = 'https://ieo-official.org/',
    last_verified_at = now()
where id = '9193db16-7a9e-42b1-95b6-74eda83a0ac9';

-- 5. TechGirls -- source_url corrected to the actual eligibility page fetched (was the
-- program's root page). No data change: age (15-17) and the existing 37-country list both
-- already match the official page. Grade-level flag is in the separate requires-0126 file.
update public.opportunities
set source_url = 'https://techgirlsglobal.org/apply/eligibility-and-application-2/',
    last_verified_at = now()
where id = '7081b03a-3e04-4843-8bc5-0078cfd040f2';

-- 6. Interlochen Review -- grade and country both confirmed, genuinely empty before:
-- "high school writers, singer-songwriters and artists (grades 9-12 or high school
-- postgraduate year)... from around the world." Country treated as an affirmative
-- statement (guidance about who is invited to submit, not just historical attendee stats)
-- -- the same evidentiary bar as Immerse Education/Penn Pre-College in earlier batches, not
-- a lower one; flagged here explicitly as the closer call of the two.
update public.opportunities
set eligible_grades = array['9','10','11','12'],
    country_eligibility_confirmed_open = true,
    last_verified_at = now()
where id = '95093e1a-fc13-4d9a-b4ed-5f0584252b44';

-- ============================================================================
-- CORRECTIONS (the existing stored value conflicts with the official source)
-- ============================================================================

-- 7. Yale Young Global Scholars -- eligible_grades was stored as ['11','12'] (junior/
-- senior). The official eligibility page states plainly: "Be a current high school
-- sophomore or junior (or international equivalent)" -- sophomore=10, junior=11. The
-- stored value and the official source disagree by one full grade band on each end.
-- Caught the same way YIS was caught in batch 1: read the fetched text against the
-- ALREADY-STORED value directly, not assumed correct because a row had "something" there.
update public.opportunities
set eligible_grades = array['10','11']
where id = 'c3a98c43-dcfb-42cc-a23f-02a8a8154358';

-- ─────────────────────────────────────────────────────────────────────────
-- 8/8 — D2: fırsat dolgusu, 0126'YA BAĞLI kısım (0126 yukarıda, 2/8'de) --
--        sadece UPDATE, ek koruma gerekmiyor
-- ─────────────────────────────────────────────────────────────────────────
-- D2 batch 2, PART 2 -- REQUIRES MIGRATION 0126 TO BE APPLIED FIRST.
--
-- Do not run before 0126 (age_eligibility_confirmed_open / grade_eligibility_confirmed_open
-- columns, branch oryn/d3-age-grade-eligibility-confirmed-open-2026-09-04) has been applied
-- to this database. Every statement below references one or both of those two columns,
-- which do not exist until then. Kept in its own file, physically separate from
-- d2-batch2-additions-and-corrections-2026-09-04.sql (which needs no such ordering), per
-- CEO's own instruction after a package blew up in the founder's hands tonight for exactly
-- this reason -- SQL that depended on an unapplied migration wasn't clearly separated from
-- SQL that didn't.
--
-- 1. ASSIP (Aspiring Scientists Summer Internship Program, George Mason University) --
-- researched in D2 batch 1 (2026-09-04), not applied then because this migration didn't
-- exist yet. Official page (science.gmu.edu/assip) is explicit and structural, not silent:
-- "Interns for remote internships must be 15 years or older... There is no maximum age
-- limit, as long as the applicant has not graduated from university before or during their
-- internship." No grade-level language anywhere on the page -- this program is genuinely
-- age-gated only, confirmed by an affirmative "no maximum age limit" statement, not by
-- absence of one. This is the first real use of the new grade_eligibility_confirmed_open
-- flag: it distinguishes "genuinely no grade requirement" (this row) from "never
-- researched" (the ~272 other rows still missing eligible_grades), which the column didn't
-- exist to say before today.
update public.opportunities
set grade_eligibility_confirmed_open = true,
    last_verified_at = now()
where id = '7a0b2b4e-189d-4e7b-b4a1-ef8886e3a23d';

-- D2 visible-priority batch -- REQUIRES MIGRATION 0126 TO BE APPLIED FIRST.
--
-- Do not run before 0126 (age_eligibility_confirmed_open / grade_eligibility_confirmed_open
-- columns) has been applied to this database. Kept in its own file, physically separate
-- from d2-visible-priority-additions-2026-09-04.sql, same discipline as batch 2's own two
-- files -- see that file's own header for why.
--
-- Projected effect, computed directly against live data (not applied): applying this file
-- on top of d2-visible-priority-additions-2026-09-04.sql drops the visible-34 set's gapped
-- count from 30 to 29.

-- 1. TechGirls -- grade_eligibility_confirmed_open. Official eligibility page gives a
-- complete age-based criterion (15-17 at a specific date, a specific birth-date window,
-- plus "will attend at least one additional semester of secondary school upon return") and
-- names no grade requirement anywhere -- genuinely age-gated, not grade-gated, not silence
-- on an unstated grade rule.
update public.opportunities
set grade_eligibility_confirmed_open = true,
    last_verified_at = now()
where id = '7081b03a-3e04-4843-8bc5-0078cfd040f2';

commit;
