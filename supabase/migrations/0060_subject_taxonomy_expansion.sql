-- 0060 — subject_taxonomy expansion (2026-08-22)
--
-- STATUS: NOT APPLIED TO PRODUCTION. Written to be reviewable and concrete; applying it is
-- the founder's authorization, not the coordination session's — same posture as 0056/0057/
-- 0059 before their own authorization.
--
-- Companion: lib/programs/subject-taxonomy.ts's own header comment has the full measurement
-- (qtcvcflzxbuagvvwahhu, 2026-08-22) — 63.3% of programmes (9,145/14,457) classified as
-- `other`. Sampling the failure directly (not guessing) found the dominant cause was a real
-- vocabulary gap: the original 16 categories mirror Phase 3's onboarding-interest list, not
-- a full academic ontology, so ordinary, commonly-searched subjects (Biology, History,
-- Education, Arts, Chemistry, Philosophy, ...) had nowhere to land even when correctly
-- English-named. This migration widens the CHECK constraint to add the 8 categories sized to
-- that measurement's actual volume: biology, chemistry, history, environmental_science,
-- education, arts_humanities (music/theatre/philosophy/religion/literature/linguistics/
-- classics bucketed together — each individually low-hundreds, six thin categories would
-- give a student six near-empty filters instead of one useful one), social_sciences
-- (sociology/anthropology/geography — one department at most real universities), and
-- health_sciences (nursing/pharmacy/public health — deliberately kept distinct from
-- `medicine`, which stays MD/clinical-track only; a separate audit lane independently found
-- rows like "Medical Anthropology" tagged `medicine` were burying the clinical-track results
-- a student filtering "Medicine" actually wants).
--
-- This is purely additive: the new value list is a superset of the old one, so every
-- existing row (already null or one of the original 17 values) trivially still satisfies
-- the widened constraint. No row is touched, no existing value's meaning changes. The
-- accompanying backfill (moving currently-`other` rows into the new/existing categories via
-- the updated classifier) is a separate, explicitly-authorized write — not part of this
-- migration, which only makes the new values legal to store.

alter table public.university_programs
  drop constraint university_programs_subject_taxonomy_check;

alter table public.university_programs
  add constraint university_programs_subject_taxonomy_check
    check (subject_taxonomy is null or subject_taxonomy = any (array[
      'economics', 'business', 'finance', 'computer_science', 'artificial_intelligence',
      'engineering', 'medicine', 'law', 'psychology', 'political_science',
      'international_relations', 'mathematics', 'physics', 'architecture', 'design',
      'entrepreneurship', 'biology', 'chemistry', 'history', 'environmental_science',
      'education', 'arts_humanities', 'social_sciences', 'health_sciences', 'other'
    ]));
