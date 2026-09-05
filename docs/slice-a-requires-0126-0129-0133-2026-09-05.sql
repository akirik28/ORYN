-- Slice A (rows 1-95 of 190), part 1 (rows 1-38) — REQUIRES MIGRATIONS 0126, 0129, AND
-- 0133 APPLIED FIRST. Every statement writes *_basis/*_confirmed_open columns that do not
-- exist on the live database as of 2026-09-05. Packaging order: migrations first, this
-- file second.

-- age_eligibility_basis = 'checked_not_stated'
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '0009f66d-9231-4dbd-938f-9eb1c9319309' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- UPenn ESAP
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '018f5962-6e43-4941-af90-ead024ebf8f3' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- U Toronto: multi-program page, see doc -- age genuinely unaddressed at the row's own general level regardless
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '0337369f-bb69-47e5-aa82-d4a0e92a674b' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- Polygence
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '053114c6-b049-4eab-b7e1-b081efe183c9' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- Waterloo/Renison Future Ready
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '09b42a46-cd61-4576-bc5a-565975c66d05' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- IRI-NC
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '0aee6460-9933-4983-b721-d88bcbfce76f' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- Senior Mathematical Challenge (UK Year system, not converted)
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '0cb2bd7c-9a36-44c5-9bbf-ecb9cbe586f4' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- RISD Pre-College
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '10a944b3-26de-4bcc-a408-baa5b57e6c81' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- UC San Diego Futures
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '1228cff1-265d-4cc2-aa49-95b1f3408250' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- Univ of Miami
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '17d177de-6ca7-4754-ab15-3a9dd93f4893' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- Columbia Pre-College (page defers to unfetched Application Materials -- borderline, see doc)
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '19ebc71c-1997-41aa-aeb1-728ec5be176c' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- AJSR
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '1ba4bf99-d36e-45d8-8dda-510587e52b05' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- International Greenwich Olympiad
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '1d9d3901-b31f-44f8-9147-d6807b04ad3e' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- Purdue Fun-Sized Courses
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '1fe1537e-87e1-46bd-93ef-e15705a83a87' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- HCSSiM
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '269c4d5e-bb27-4897-bfb8-9779fef57ee6' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- Young Founders Lab

-- grade_eligibility_basis = 'checked_not_stated'
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '0009f66d-9231-4dbd-938f-9eb1c9319309' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- UPenn ESAP
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '0337369f-bb69-47e5-aa82-d4a0e92a674b' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- Polygence ("middle or high school" -- descriptive, not a bound)
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '053114c6-b049-4eab-b7e1-b081efe183c9' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- Waterloo/Renison
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '09b42a46-cd61-4576-bc5a-565975c66d05' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- IRI-NC
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '0cb2bd7c-9a36-44c5-9bbf-ecb9cbe586f4' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- RISD Pre-College
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '10a944b3-26de-4bcc-a408-baa5b57e6c81' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- UC San Diego Futures
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '19ebc71c-1997-41aa-aeb1-728ec5be176c' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- AJSR ("high school and undergraduate" -- descriptive)
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '1ba4bf99-d36e-45d8-8dda-510587e52b05' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- International Greenwich Olympiad
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '1d9d3901-b31f-44f8-9147-d6807b04ad3e' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- Purdue Fun-Sized Courses
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '1e0f59bd-2a96-4744-b5fd-90a9c0ba5801' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- PROMED Projects
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '1fe1537e-87e1-46bd-93ef-e15705a83a87' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- HCSSiM
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '269c4d5e-bb27-4897-bfb8-9779fef57ee6' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- Young Founders Lab
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '2b1886f1-29dd-4014-8044-b6ae04d6fb41' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- Nat Geo Slingshot

-- country_eligibility_basis = 'checked_not_stated'
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '0337369f-bb69-47e5-aa82-d4a0e92a674b' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- Polygence
-- DigiPen (row 6) deliberately has no country entry here: it already gets
-- country_eligibility_confirmed_open = true in the additions file (a real affirmative
-- statement, not a checked_not_stated case) -- a duplicate line here was a drafting
-- mistake, caught rereading this file before finalizing, not left in.
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '053114c6-b049-4eab-b7e1-b081efe183c9' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- Waterloo/Renison
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '09b42a46-cd61-4576-bc5a-565975c66d05' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- IRI-NC
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '0cb2bd7c-9a36-44c5-9bbf-ecb9cbe586f4' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- RISD Pre-College
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '10a944b3-26de-4bcc-a408-baa5b57e6c81' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- UC San Diego Futures
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '1228cff1-265d-4cc2-aa49-95b1f3408250' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- Univ of Miami
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '19ebc71c-1997-41aa-aeb1-728ec5be176c' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- AJSR
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '1ba4bf99-d36e-45d8-8dda-510587e52b05' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- International Greenwich Olympiad
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '1d9d3901-b31f-44f8-9147-d6807b04ad3e' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- Purdue Fun-Sized Courses
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '1fe1537e-87e1-46bd-93ef-e15705a83a87' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- HCSSiM
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '269c4d5e-bb27-4897-bfb8-9779fef57ee6' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- Young Founders Lab
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '2b1886f1-29dd-4014-8044-b6ae04d6fb41' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- Nat Geo Slingshot
