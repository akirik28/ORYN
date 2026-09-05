-- Structural age/level mismatch audit, 2026-09-05 -- full catalog (367 active rows),
-- not just the 190/95-row eligibility-empty slices. Prepared, not applied -- CEO
-- packages, no live writes. Every disable is reversible (status = 'disabled', not a
-- delete) per CEO's explicit instruction: borderline cases exist and the founder may
-- want any of these back.

-- Row: Hochschule Bremen (HSB) City University of Applied Sciences, Germany
-- Confirmed via direct fetch of the stored official_url: this is a graduate M.Sc.
-- programme (Engineering and Management of Space Systems) requiring a completed
-- Bachelor's degree (or equivalent) and B2 English -- a realistic applicant is 21+.
-- All three eligibility columns are empty (minimum_age/maximum_age/eligible_grades),
-- which is exactly the failure mode flagged: with nothing populated, the matching
-- engine has no basis to exclude a 14-year-old, and this row is CURRENTLY in the
-- visible-289 set (cycle_status = 'unverified', not closed/historical/discontinued) --
-- a real student could be shown this today, not a hypothetical.
update public.opportunities
set status = 'disabled', last_verified_at = now()
where id = '8f6e438f-0465-4744-b09b-d4d8b3a82f97'
  and status = 'active';

-- Correction (not a mismatch, requested separately): AMC-AIME's stored official_url is
-- confirmed wrong for a second day running -- it pointed at an unrelated MAA MathFest
-- special-sessions page. Correct URL found via a live search of maa.org (not guessed):
-- https://maa.org/student-programs/amc/ -- MAA's own current AMC/AIME program page.
update public.opportunities
set official_url = 'https://maa.org/student-programs/amc/', last_verified_at = now()
where id = '4ce6fd8f-5a9b-4399-b168-e38c0f44c7b1'
  and official_url = 'https://maa.org/events/mathfest-program/special-sessions/';
