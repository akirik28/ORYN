-- D5 (docs/PROXOLA-PLAN.md) -- university_deadlines fill, scoped to what a student actually
-- targets, not a random batch. Measured first: of the 12 distinct universities on any
-- student's real target_universities list (20 rows total across all students), exactly ONE
-- has zero university_deadlines rows -- California Institute of Technology (Caltech),
-- targeted twice. The other 11 already carry at least one row and are untouched here.
-- Checked against CEO's exclusion list (18 institutions another lane is already covering:
-- NUS, Tsinghua, Peking, HKU, CUHK, PolyU, KAIST, Kyoto, Seoul National, Melbourne, Sydney,
-- Tokyo, Monash, Toronto, NTU, UBC, Copenhagen, CityUHK) -- zero overlap, Caltech is not on
-- that list under any name.
--
-- Source: https://www.admissions.caltech.edu/apply/first-year-applicants/deadlines (Caltech's
-- own official undergraduate admissions site), fetched directly 2026-09-04, not from a search
-- snippet. Both dates and the supporting-materials sub-deadlines are stated explicitly on the
-- page with full years -- nothing here was inferred from an undated "November 1"-style
-- mention the way a stale cached page sometimes reads.
--
-- Shape/convention matched against Stanford's existing rows (same table, same recency,
-- queried live before writing this) rather than invented fresh: deadline_type/application_
-- cycle/cycle_label/binding_policy/recurrence='dated_specific'/verification_state=
-- 'VERIFIED_CURRENT'/source_type='official_primary'/data_status='fresh' all follow that
-- precedent exactly. cycle_year=2027 matches Stanford's own Fall-2026-deadline rows (tagged
-- by the enrollment year the cycle leads to, not the application year) -- Caltech's page
-- states the same relationship explicitly ("Fall 2026 entry cycle with enrollment in 2027").
--
-- NOT included: MIT (10 times targeted, second-most of the 12), found while researching this
-- -- its one existing row is "scholarship:undated" with no real application deadline at all,
-- a genuine gap even though university_deadlines isn't literally empty for it. Left out of
-- this file on purpose: MIT's own two official pages disagree on the Regular Action date
-- (mitadmissions.org/apply/firstyear/deadlines-requirements/ says January 4;
-- mitadmissions.org/help/faq/first-year-application-deadlines/ says January 5), and per this
-- pass's own rule -- a guessed date is worse than a blank one -- picking either without a
-- tie-breaking source would be exactly the guess this rule forbids. Flagged for whoever picks
-- this up next, not silently dropped.
--
-- RE-RUN SAFETY (2026-09-04, added while assembling Package 14): this table has no unique
-- constraint that would catch a second application, so the precondition this header already
-- asked a human to check by hand is now a real, executable guard instead -- running this
-- file twice inserts the four rows once, not eight. Content of the VALUES list below is
-- unchanged from the original.

do $$
begin
  if not exists (select 1 from public.university_deadlines where university_id = 'd6fe8e8f-749f-462d-88b3-b22dfdc11a4c') then
    insert into university_deadlines (
      university_id, deadline_type, deadline_date, application_cycle, recurrence, cycle_year,
      cycle_label, verification_state, source_type, binding_policy, data_status, source_url, retrieved_at
    ) values
-- Restrictive Early Action: application deadline November 1, 2026 ("Application Deadline:
-- November 1, 2026"), decisions by mid-December.
('d6fe8e8f-749f-462d-88b3-b22dfdc11a4c', 'early', '2026-11-01', 'Restrictive Early Action', 'dated_specific', 2027,
 'Restrictive Early Action', 'VERIFIED_CURRENT', 'official_primary', 'restrictive_single_choice', 'fresh',
 'https://www.admissions.caltech.edu/apply/first-year-applicants/deadlines', '2026-09-04T00:00:00Z'),
-- REA supporting materials: "you will have until November 6 to submit all required and
-- supplemental materials."
('d6fe8e8f-749f-462d-88b3-b22dfdc11a4c', 'document', '2026-11-06', 'Restrictive Early Action', 'dated_specific', 2027,
 'Restrictive Early Action', 'VERIFIED_CURRENT', 'official_primary', 'restrictive_single_choice', 'fresh',
 'https://www.admissions.caltech.edu/apply/first-year-applicants/deadlines', '2026-09-04T00:00:00Z'),
-- Regular Decision: application deadline January 4, 2027, decisions by mid-March.
('d6fe8e8f-749f-462d-88b3-b22dfdc11a4c', 'application', '2027-01-04', 'Regular Decision', 'dated_specific', 2027,
 'Regular Decision', 'VERIFIED_CURRENT', 'official_primary', null, 'fresh',
 'https://www.admissions.caltech.edu/apply/first-year-applicants/deadlines', '2026-09-04T00:00:00Z'),
-- RD supporting materials: "you will have until January 10 to submit all required and
-- supplemental materials."
('d6fe8e8f-749f-462d-88b3-b22dfdc11a4c', 'document', '2027-01-10', 'Regular Decision', 'dated_specific', 2027,
 'Regular Decision', 'VERIFIED_CURRENT', 'official_primary', null, 'fresh',
 'https://www.admissions.caltech.edu/apply/first-year-applicants/deadlines', '2026-09-04T00:00:00Z');
    raise notice 'D5: Caltech''s 4 deadline rows inserted.';
  else
    raise notice 'D5: Caltech already has university_deadlines rows -- skipped, not re-inserted.';
  end if;
end
$$;
