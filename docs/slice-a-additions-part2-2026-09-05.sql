-- Slice A (rows 1-95 of 190), part 2 (rows 39-95) — additions/corrections needing NO
-- migration. Prepared, not applied -- CEO packages.
--
-- Same evidentiary rule as part 1: explicit statement on the actual official page,
-- fetched directly. "Doesn't state" != "doesn't have." Foreign school-year systems
-- (UK Year/S-levels, Italian secondary numbering) deliberately NOT converted here --
-- flagged instead in the tracking doc.
--
-- Confirmed-open discriminator used throughout (the single trickiest judgment call in
-- this batch, named explicitly so it can be pushed back on): text that defines the
-- program/competition's OWN SCOPE ("we support X worldwide", "a competition for
-- students around the world", "open to any country") is treated as a real policy
-- statement. Text that just describes who happens to attend (a testimonial, a
-- "50 states and 87 countries" attendance stat, "meet classmates from around the
-- world") is treated as descriptive, not policy -- left as checked_not_stated in the
-- companion file instead, never as confirmed_open.

-- Row 39 - Journal of Emerging Investigators (JEI): age explicit ("Student authors must
-- be 13 years or older"), country explicit ("we also welcome teachers and students all
-- over the world" -- addressed directly to who's welcome, not a stray descriptive
-- aside).
update public.opportunities
set minimum_age = 13,
    country_eligibility_confirmed_open = true,
    last_verified_at = now()
where id = '35f7475c-2567-4dde-ab61-c427059ff180'
  and minimum_age is null and not coalesce(country_eligibility_confirmed_open, false);

-- Row 40 - USACO: country only -- "The USACO supports computing education in the USA
-- and worldwide" is a scope statement about the org's own mission, not a stray
-- attendance stat. Age/grade: "high-school computing students at all levels" -- "levels"
-- reads as skill divisions (Bronze/Silver/Gold/Platinum), not grade levels -- no fill.
update public.opportunities
set country_eligibility_confirmed_open = true,
    last_verified_at = now()
where id = '36fb08db-6f39-4d38-8094-1e37ac102917'
  and not coalesce(country_eligibility_confirmed_open, false);

-- Row 42 - Columbia College Edge Summer (distinct program from row 19's general
-- Pre-College Admissions and row 76's Online Summer): grade explicit -- "students in
-- grades 11-12 truly get the college experience by earning college credit."
update public.opportunities
set eligible_grades = array['11','12'],
    last_verified_at = now()
where id = '40ef389f-b58f-447d-87b4-b7deb3effe2a'
  and cardinality(eligible_grades) = 0;

-- Row 43 - UKMT Pink Kangaroo: real country RESTRICTION, same shape as rows 11/15/24/38
-- -- "Open to UK schools only." Grade stated only in UK Year/Scotland S-level terms
-- ("England and Wales: Year 10 and 11, Scotland: S3 and S4, Northern Ireland: Year 11 or
-- 12") -- deliberately not converted, see doc.
update public.opportunities
set eligible_countries = array['United Kingdom'],
    last_verified_at = now()
where id = '4525bda5-dd95-4047-8508-e41dfb02e3c5'
  and cardinality(eligible_countries) = 0;

-- Row 44 - Kode With Klossy: age explicit -- "ages 13-18." (Also gender/identity-scoped
-- -- "young women and gender expansive" -- not one of this product's three eligibility
-- columns, noted for context only, not represented in this SQL.)
update public.opportunities
set minimum_age = 13,
    maximum_age = 18,
    last_verified_at = now()
where id = '455e6fb3-7592-45d4-852a-602acd95bd81'
  and minimum_age is null;

-- Row 45 - CMIMC (Carnegie Mellon Informatics and Math Competition): country only --
-- "a competition for high school students around the world" (About page) is a scope
-- statement about the competition itself, same register as USACO's "worldwide."
update public.opportunities
set country_eligibility_confirmed_open = true,
    last_verified_at = now()
where id = '45770aad-075c-4411-8ee7-c86d21236276'
  and not coalesce(country_eligibility_confirmed_open, false);

-- Row 46 - Summer@Brown: age + grade both explicit and clean -- "Students completing
-- grades 9 to 12, ages 14 to 18 by June 14, 2026."
update public.opportunities
set minimum_age = 14,
    maximum_age = 18,
    eligible_grades = array['9','10','11','12'],
    last_verified_at = now()
where id = '47bc163d-65b1-4e72-94bd-ffc7fabe8a20'
  and minimum_age is null and cardinality(eligible_grades) = 0;

-- Row 47 - Horizon Academic Essay Prize: country only, explicit and direct -- "open to
-- all students from any country who will be enrolled in high school." "Enrolled in high
-- school" isn't specific enough to map to numbered grades (international prize, no
-- grade-array claim made), so grade is left for the checked_not_stated file instead.
update public.opportunities
set country_eligibility_confirmed_open = true,
    last_verified_at = now()
where id = '496ef7db-b8d4-4a72-8bcc-b7cb13208e40'
  and not coalesce(country_eligibility_confirmed_open, false);

-- Row 51 - Sabancı University Nanotechnology Winter School: grade explicit -- "Program
-- tüm lise öğrencilerine açıktır" ("The program IS OPEN to all high school students") --
-- a direct declarative policy statement, not marketing color (contrast row 64's Kadir
-- Has phrasing, judged differently -- see doc). Turkish lise numbers 9-12 the same as
-- this schema's array, unlike UK/Italian systems -- direct numeric mapping, not a
-- conversion.
update public.opportunities
set eligible_grades = array['9','10','11','12'],
    last_verified_at = now()
where id = '4db17042-5487-4090-9212-0d7243acaa26'
  and cardinality(eligible_grades) = 0;

-- Row 55 - Wharton Management & Technology Summer Institute (M&TSI): grade explicit --
-- "rising high school seniors" plus "a select number of rising high school juniors."
-- The "select number" qualifies how many are admitted, not who may apply -- both grades
-- are named as part of the applicant pool.
update public.opportunities
set eligible_grades = array['11','12'],
    last_verified_at = now()
where id = '56ca6900-4a53-4fb3-9158-90b1bdce7a80'
  and cardinality(eligible_grades) = 0;

-- Row 60 - UCSB Research Mentorship Program: country only -- "engages...high-achieving
-- high school students from all over the world" is a scope statement about who the
-- program engages, not a stray "from X places" attendance stat.
update public.opportunities
set country_eligibility_confirmed_open = true,
    last_verified_at = now()
where id = '647eb8da-9cb8-46d4-8ded-b4c516f7ac90'
  and not coalesce(country_eligibility_confirmed_open, false);

-- Row 68 - Oxford Royale (independent org, NOT affiliated with University of Oxford --
-- already correctly named that way in this row's own `organization` field): age
-- explicit -- "Ages 12-18 year olds."
update public.opportunities
set minimum_age = 12,
    maximum_age = 18,
    last_verified_at = now()
where id = '6f80e90f-7d85-4c93-b833-f47cbbf6b0c3'
  and minimum_age is null;

-- Row 69 - Cambridge Future Scholars Programme (private Cambridge Scholars Programme
-- Ltd, NOT University of Cambridge -- already correctly flagged in this row's own
-- `organization` field): age explicit -- "intelligent high school students aged 14-18."
update public.opportunities
set minimum_age = 14,
    maximum_age = 18,
    last_verified_at = now()
where id = '70519f22-f165-44cf-b954-a3ab864077e0'
  and minimum_age is null;

-- Row 77 - Bennington College Young Writers Awards: grade + country both explicit and
-- clean, the cleanest row in this half of the slice -- "Open to students in grades 9-12
-- worldwide" + "U.S. and international students are eligible to participate." No numeric
-- age given (only "have already graduated... not eligible", already captured by the
-- grade ceiling), so age is left for the checked_not_stated file.
update public.opportunities
set eligible_grades = array['9','10','11','12'],
    country_eligibility_confirmed_open = true,
    last_verified_at = now()
where id = '793f6cf1-5af8-413a-b15f-89e5f1f9e44f'
  and cardinality(eligible_grades) = 0 and not coalesce(country_eligibility_confirmed_open, false);

-- Row 81 - HSHSP (Michigan State): grade explicit -- "students...who are entering 12th
-- grade." Country left untouched (not confirmed_open, not a stated restriction either --
-- "from across the U.S. and territories" is ambiguous enough to be a closer call, see
-- doc, rather than a confident restriction fill).
update public.opportunities
set eligible_grades = array['12'],
    last_verified_at = now()
where id = '7b6ebabf-dd0a-4da5-9155-381674f6d7f0'
  and cardinality(eligible_grades) = 0;

-- Row 83 - SAIC ECPOSI: age + grade both explicit -- "Students must be 15-18 years of
-- age and have completed their sophomore year of high school by the start of the
-- program" (completed sophomore year = rising junior at earliest, so grades 11-12).
-- Country left for checked_not_stated -- "collaborate with students from...around the
-- world" is peer-group/experiential framing, not a stated admissions policy (same
-- register as Georgetown's "meet classmates," ruled descriptive there too).
update public.opportunities
set minimum_age = 15,
    maximum_age = 18,
    eligible_grades = array['11','12'],
    last_verified_at = now()
where id = '7f8281b0-7fc5-4a06-a03c-7c3f37bbc972'
  and minimum_age is null and cardinality(eligible_grades) = 0;

-- Row 90 - UChicago College Pathway Program in Economics (Immersion): grade explicit and
-- specific -- "9th Grade, 10th Grade, 11th Grade" plus "This course is open to high
-- school students only." Note this explicitly EXCLUDES 12th grade, unlike most rows in
-- this slice -- read the actual list, not a generic "high schoolers" assumption.
update public.opportunities
set eligible_grades = array['9','10','11'],
    last_verified_at = now()
where id = '89117ca8-52f4-41fb-8674-dd23998e7281'
  and cardinality(eligible_grades) = 0;

-- Row 93 - Stanford Institutes of Medicine Summer Research (SIMR): age + grade + a real
-- country RESTRICTION, all three explicit -- "must also be 16 years old or older,"
-- "currently be juniors or seniors (as of fall 2026)... graduating class of 2027 or
-- 2028," and critically "must currently be living in and attending high school in the
-- U.S. AND must be U.S. citizens or permanent residents" -- an explicit domestic-only
-- restriction, not confirmed-open, same shape as UKMT's "UK schools only" and PROMED's
-- inverse "worldwide."
update public.opportunities
set minimum_age = 16,
    eligible_grades = array['11','12'],
    eligible_countries = array['United States'],
    last_verified_at = now()
where id = '8f0a8a3f-6c12-4277-91ca-7d120222b231'
  and minimum_age is null and cardinality(eligible_grades) = 0 and cardinality(eligible_countries) = 0;
