-- D2 batch 2: opportunity eligibility fill, researched against official program pages
-- 2026-09-04. Prepared, NOT applied -- CEO applies. Safe to run in ANY order relative to
-- migration 0126 -- every statement below touches only columns that already exist live.
-- The 0126-dependent statements (age/grade confirmed-open flags) are in a SEPARATE file,
-- d2-batch2-requires-0126.sql, on purpose: CEO's own instruction was not to let SQL that
-- needs an unapplied migration sit mixed in with SQL that doesn't, after a package blew up
-- in the founder's hands tonight for exactly that reason.
--
-- Second batch of 15 (next-nearest deadlines after batch 1, excluding batch 1's 15 ids).
-- 5 rows originally got a confident, sourced fill below (now 4 real UPDATEs -- Immerse
-- Education's was withdrawn 2026-09-04, see that item's own note); the rest of the 15 had no
-- confidently-extractable answer on the page fetched (listed in docs/opportunity-eligibility-
-- d2-not-found-2026-09-04.md's Batch 2 section) or were re-verified as already accurate.

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

-- 4. Immerse Education Summer School (Cambridge) -- WITHDRAWN 2026-09-04, corrected at the
-- source rather than left for a later package to inherit. This UPDATE originally set
-- country_eligibility_confirmed_open = true on the strength of "students aged 13-18 from
-- around the world" plus a 140+-country alumni stat -- read at the time as an affirmative
-- statement. A later, more rigorous pass (docs/citizenship-restrictions-classification-
-- 2026-09-04.sql, CEO's own explicit ruling) drew the line this evidence actually sits on the
-- wrong side of: attendee/alumni-diversity language describes who happens to show up, not a
-- stated policy -- the same standard that kept EYE's "160 nationalities" and Oxford
-- Scholastica's "85 countries" at checked_not_stated rather than confirmed_no_restriction.
-- This row's real, correct classification is now in that file: country_eligibility_basis =
-- 'checked_not_stated', citizenship_restrictions cleared. Removing the UPDATE here rather
-- than leaving both in place -- applying both, in either order, would have left this row
-- confirmed-open regardless of the classification file's own explicit ruling, since
-- confirmed_open gates independently of basis (see that file's own "a fourth thing had to be
-- verified" note). No other row in this file is affected by this correction.

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
