-- D2 visible-priority batch -- REQUIRES MIGRATION 0126 TO BE APPLIED FIRST.
--
-- Do not run before 0126 (age_eligibility_confirmed_open / grade_eligibility_confirmed_open
-- columns) has been applied to this database. Kept in its own file, physically separate
-- from d2-visible-priority-additions-2026-09-04.sql, same discipline as batch 2's own two
-- files -- see that file's own header for why.
--
-- 1. TechGirls -- grade_eligibility_confirmed_open. Official eligibility page gives a
-- complete age-based criterion (15-17 at a specific date, a specific birth-date window,
-- plus "will attend at least one additional semester of secondary school upon return") and
-- names no grade requirement anywhere -- genuinely age-gated, not grade-gated, not silence
-- on an unstated grade rule.
update public.opportunities
set grade_eligibility_confirmed_open = true,
    last_verified_at = now()
where id = '7081b03a-3e04-4843-8bc5-0078cfd040f2';
