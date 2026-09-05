-- Opportunity eligibility fill, rows 96-190 (slice B of docs/opportunity-zero-eligibility-190-2026-09-05.md)
-- NOT APPLIED -- prepared for CEO to review and package, per standing instruction.
-- Live values re-checked immediately before compiling this file (2026-09-05): all 95 rows
-- below still have minimum_age/maximum_age NULL, eligible_grades/eligible_countries empty --
-- zero drift since research began. Full research trail with every quote/source/confidence
-- value: docs/opportunity-fill-96-190-progress-2026-09-05.md (same directory).
--
-- 51 of 95 rows get a real UPDATE below (counted directly off this file's own UPDATE
-- statements, not estimated). 44 are deliberately excluded -- listed at the bottom with the
-- reason, not silently dropped. Two exclusions matter most: Bocconi (171) and
-- Universidad de Navarra (188) both have a stored official_url pointing to the WRONG program
-- entirely (confirmed by me directly opening both pages) -- writing eligibility data under
-- either URL would attach a true fact to the wrong row. Nothing else in this file should be
-- read as more urgent than catching those two before any UPDATE runs.
--
-- Every array literal below is exactly what the cited source states, or (marked INFERRED in
-- the matching progress-doc entry) a disclosed mapping from a national-curriculum term ("lise"
-- -> grades 9-12) per the assignment's own explicit allowance for that. Nothing here is a
-- guess dressed up as a fact.

begin;

-- Batch 1 (96-114)
update opportunities set maximum_age = 19 where id = '9193db16-7a9e-42b1-95b6-74eda83a0ac9'; -- International Economics Olympiad (age is really "under 20 as of June 30" -- see progress doc)
update opportunities set minimum_age = 13 where id = '948b2e5f-1ec8-4838-9a0a-01c928b02a8c'; -- Georgetown Pre-College Online (Medicine track specifically)
update opportunities set eligible_grades = '{9,10,11,12}' where id = '95093e1a-fc13-4d9a-b4ed-5f0584252b44'; -- Interlochen Review
update opportunities set eligible_countries = '{"United Kingdom"}' where id = '97ff6f3d-665e-439a-b7b3-cde85267a90f'; -- Mathematical Olympiad for Girls
update opportunities set minimum_age = 16 where id = '9e601648-0d30-462e-b9f0-8d069392f29f'; -- Bentley (residential track floor; commuter/online have no stated minimum)
update opportunities set eligible_grades = '{10,11,12}' where id = '9f0bb452-86ff-4f7b-93fd-9e23298c2d3b'; -- WPI Frontiers
update opportunities set minimum_age = 17 where id = '9f611eed-7787-4d26-b1a5-7c9cda0439aa'; -- XLAB Germany
update opportunities set minimum_age = 11, maximum_age = 16 where id = 'a17202b1-b8da-4ed4-8cf7-ee0506d01653'; -- Sevenoaks
update opportunities set eligible_grades = '{9,10,11,12}' where id = 'a4451907-20af-43d3-8498-25a3829254c1'; -- Acıbadem Lise Yaz Programları (INFERRED from "lise")

-- Batch 2 (115-133)
update opportunities set minimum_age = 15, maximum_age = 17 where id = 'a5cf4328-7bc1-4ad7-9de5-8bc8b7df9220'; -- Downing College (verified directly)
update opportunities set minimum_age = 15 where id = 'a78975de-a35f-4030-b4fd-88a724b653ae'; -- Georgetown HOYA
update opportunities set minimum_age = 14, maximum_age = 17, eligible_grades = '{10,11,12}' where id = 'a7a89e1e-a9e3-4a8e-9850-789c609a769d'; -- Lehigh (academicoutreach page)
update opportunities set eligible_grades = '{9,10,11,12}' where id = 'aaf5b259-4e72-4cba-85a9-43be675384aa'; -- Sabancı (INFERRED)
update opportunities set minimum_age = 11, maximum_age = 18 where id = 'ae5e73f0-43ba-42be-baed-423d3087e7e1'; -- UAL International Summer School (verified directly; source headlines it as one 11-18 band)
update opportunities set minimum_age = 16, maximum_age = 24 where id = 'b399d24d-3606-4d3d-bb59-2b94623c58b2'; -- The Diana Award
update opportunities set eligible_grades = '{9,10,11,12}' where id = 'b3e40e31-a82d-4a34-bceb-b841f20d7296'; -- Galatasaray (INFERRED)
update opportunities set eligible_countries = '{"United Kingdom"}' where id = 'b8c1db11-44b7-43db-a79d-3ca5fbd10c45'; -- Andrew Jobbings Senior Kangaroo (verified directly)
update opportunities set eligible_grades = '{11,12}' where id = 'bbb81017-3570-4a13-8e82-e4bf612b3436'; -- Wharton Pre-Baccalaureate
update opportunities set eligible_grades = '{7,8,9,10,11,12}' where id = 'c14ee166-0d7a-4c6c-8b78-f92b501dccbb'; -- Andover Summer Session

-- Batch 3 (134-152)
update opportunities set minimum_age = 14, maximum_age = 18, eligible_grades = '{9,10,11,12}' where id = 'c35f002c-a4b2-4965-b07f-ba775eb0e31e'; -- Wharton Sports Analytics/Data Science Competition (see also row 150 -- likely duplicate catalog entries for the same real competition, flag for CEO separately from this data)
update opportunities set eligible_grades = '{9,10,11,12}' where id = 'c3a16d0e-55d1-4dd7-9c5e-d930a83b0460'; -- Kış Bilim Kampı (INFERRED)
update opportunities set maximum_age = 29 where id = 'c640746e-b7df-41df-88ca-31321a430d5b'; -- TISDC (real ceiling per source; also admits university students -- separate scope question, not a data error)
update opportunities set eligible_grades = '{11,12}' where id = 'c6b985f9-1a40-4e8a-a2fb-63408263e66e'; -- Stanley Prep UN Advanced Training (HS track)
update opportunities set minimum_age = 16, maximum_age = 21 where id = 'c7223aea-7bb9-4b29-b59d-a054d7bfa02c'; -- LIYSF
update opportunities set minimum_age = 13 where id = 'c83420f7-8d0d-48b4-9eee-3659fc39706e'; -- iGEM High School Competition
update opportunities set eligible_grades = '{9,10,11,12}' where id = 'c996443d-7360-4197-850a-339ef959d585'; -- Singularity AI Essay Contest
update opportunities set minimum_age = 15, maximum_age = 17, eligible_grades = '{10,11}' where id = 'cb2e1b38-c154-4cc7-9186-bb1aa4e724a7'; -- Stanford Summer Humanities Institute
update opportunities set minimum_age = 13, maximum_age = 18 where id = 'ce680bf5-d52a-444e-a7de-ed1789cfc6aa'; -- Immerse Education Essay Competition
update opportunities set minimum_age = 12, maximum_age = 19 where id = 'cf169cf4-a589-4743-a70f-e1efd28fbcd2'; -- John Locke Institute Courses
update opportunities set minimum_age = 14, maximum_age = 18, eligible_grades = '{9,10,11,12}' where id = 'cfb32772-6259-4e3a-9ead-bc289b463d08'; -- Wharton Data Science Competition (see row 135 note above)
update opportunities set minimum_age = 12, maximum_age = 18 where id = 'cfe42a66-3688-43aa-8e7e-61ffca68adb8'; -- AwesomeMath Summer Program
update opportunities set minimum_age = 14, maximum_age = 17, eligible_grades = '{10,11,12}' where id = 'd12506f1-d77e-49c2-9dc8-55fe610da9b0'; -- Lehigh (academicoutreach page, 2nd catalog row)

-- Batch 4 (153-171)
update opportunities set eligible_grades = '{9,10,11,12}' where id = 'd4450b97-5d23-4ab1-acf7-8f3908117fd6'; -- International Academic Marathon
update opportunities set eligible_grades = '{9,10,11}' where id = 'd70e5392-9f0d-4191-8c8d-4921dbaa3651'; -- BETA Camp / Prequel (rebranded, same org)
update opportunities set minimum_age = 16 where id = 'd83d7048-537b-4450-8dfa-69e709cdb48f'; -- Garcia Summer Scholars (HS track)
update opportunities set minimum_age = 15, maximum_age = 18 where id = 'd99d1a5c-2b77-4bc1-af84-e429410eef68'; -- InvestIN (age confirmed consistent across program-name confusion, see progress doc)
update opportunities set maximum_age = 20 where id = 'db06b920-a9fd-4967-af1a-a32f45db9327'; -- International Chemistry Olympiad
update opportunities set eligible_grades = '{9,10,11}' where id = 'dc08474d-8363-4125-b94e-33460354903e'; -- SPINWIP
update opportunities set eligible_grades = '{9,10,11,12}' where id = 'dc4343ec-4856-483f-a3b0-7e0de9e38a09'; -- Uygulamalı Moleküler Biyoloji ve Genetik Kampı (INFERRED)
update opportunities set eligible_grades = '{9,10,11,12}' where id = 'de7ab9aa-74a5-43d1-b02f-2730b2aed80f'; -- Bahçeşehir Üniversitesi Yaz Okulu (INFERRED)
update opportunities set minimum_age = 13, maximum_age = 17 where id = 'df90d914-6d20-44f2-ae29-d195f629540a'; -- Global Achievers Academy

-- Batch 5 (172-190)
update opportunities set minimum_age = 14, maximum_age = 18 where id = 'e9c4cd39-b514-4975-b010-1c627d7231c8'; -- SAIC Early College Program (title claim independently verified)
update opportunities set eligible_grades = '{10,11}' where id = 'ea0a2569-e027-4d7c-b9b7-a858fb1359a8'; -- UChicago RIBS
update opportunities set eligible_grades = '{9,10,11,12}' where id = 'ee5d3870-77a8-43e5-8800-8738f6318d5f'; -- Kadir Has Yaz Okulu (literal page numbers, NOT an inferred "lise" mapping)
update opportunities set minimum_age = 14, maximum_age = 17 where id = 'f05643c5-88fa-477c-ac16-8de0b0b547bc'; -- Illinois Institute of Technology Elevate College Prep (HS tier)
update opportunities set minimum_age = 13, maximum_age = 18 where id = 'f52db280-638a-49ec-a972-d1658b046234'; -- ISSOS
update opportunities set eligible_countries = '{"United Kingdom"}' where id = 'f635fad5-3c75-4ce2-b2da-3bc5d70b9554'; -- Grey Kangaroo (country only; grade is ceiling-only, deliberately left blank)
update opportunities set eligible_grades = '{9,10,11,12}' where id = 'f912de6d-7da6-4e21-811b-1da09b10c86c'; -- Columbia Spring Immersion / Academic Year Weekend (name/URL mismatch noted separately, data at the stored URL is accurate)
update opportunities set minimum_age = 14, eligible_grades = '{9,10,11,12}' where id = 'f9421944-556f-46ed-b748-cfdce8ed8cf7'; -- Tulane Pre-College (enrichment track)
update opportunities set minimum_age = 16, maximum_age = 18 where id = 'fd51d7f8-1408-4d58-9558-47520758df3d'; -- Ringling PreCollege (stored official_url is dead/403; age sourced from a working alternate Ringling domain, see progress doc)
update opportunities set minimum_age = 16, maximum_age = 17 where id = 'ff5d9710-80d3-47ae-959a-b8b40406f003'; -- Warwick Pre-University Summer Programme

commit;

-- ============================================================================
-- EXCLUDED -- 44 rows, deliberately not touched. Grouped by reason. (Every count in this
-- section was recounted directly against the id list, after an earlier draft of this same
-- comment block turned out to have miscounted 3 rows into no category at all -- fixed before
-- this file went anywhere, but the earlier draft's wrong numbers are exactly the kind of
-- unverified count this project's own standing rule says not to ship. Below is the corrected,
-- recounted version.)
-- ============================================================================

-- could_not_access (5) -- genuinely blocked, not silent. No data to write.
--   96  903962c1-... Girl Up Club            (girlup.org, known-blocked)
--   104 991e6bda-... Maastricht Summer Program (dreamapply.com portal, 403 x2)
--   121 aeeb130a-... George Washington University (summer.gwu.edu, domain-wide block)
--   126 b51bf24f-... STEM Fellowship Journal  (known-blocked)
--   154 d224a324-... CTY Intensive Studies    (stored URL dead/404, site restructured, no replacement found)

-- page_silent (26) -- real pages, genuinely no age/grade/country stated. No data to write.
--   98  93d45f34-... The Concord Review - Emerson Prize
--   101 960dcf4d-... THIMUN The Hague Conference (a ToS age-16 clause found, deliberately not used -- not a program eligibility rule)
--   102 97da3310-... Penn Apps (pre-launch placeholder)
--   105 9b93f1ce-... Harvard CURE  *** schema flag: real restriction is Massachusetts residency, no field can express this without overstating eligibility ***
--   107 9d4f568b-... PACT Program
--   114 a4a24425-... Harvard Pre-Collegiate Economics Challenge (2026-27 rules not yet posted)
--   118 aa64db8b-... HOSA Future Health Professionals
--   125 b41bf5f5-... International Young Physicists' Tournament (real restriction exists -- "secondary school" + team-nomination model -- just doesn't fit these 3 fields)
--   127 b5d022aa-... Leangap
--   129 ba4d814c-... Intermediate Mathematical Challenge (confirmed NOT UK-only, ceiling-only grade)
--   130 bb519c8f-... University of Bath International Summer School
--   132 bc678344-... Lumiere Education
--   145 cb4a1030-... Blue Ocean Competition
--   146 ccc1ff13-... Mathworks Honors Summer Math Camp
--   153 d1c24acc-... Venture & Tech Summer Program
--   155 d35cf54a-... European Youth Parliament Türkiye
--   166 dfd08c03-... Woodstock School (each of 7 sub-courses has its own age criterion, none published on this page)
--   167 e0e1584c-... Columbia Junior Science Journal (real restriction is "currently enrolled," not numeric)
--   168 e15c0e56-... Maclaurin Olympiad (UK Year-group terms, deliberately not auto-converted)
--   169 e5a8555d-... BMO Round 2 (ceiling-only, confirmed NOT UK-only -- "Overseas" is its own category)
--   170 e5dd5ce7-... Purple Comet! Math Meet
--   176 f069afec-... Phillips Exeter Academy (a grade claim existed only as a tool paraphrase, not a verbatim quote -- correctly withheld)
--   177 f3cda419-... HKUST I·ELITE (floor-only grade, nomination-only from invited schools)
--   180 f54d2f62-... Inspirit AI Healthcare and Medicine
--   182 f6dbce16-... BMO Round 1 (ceiling-only, confirmed NOT UK-only)
--   186 f9b261e6-... UniHive Summer Programmes

-- Bundled/hub pages -- no single honest value at this row's grain. Needs a split-into-rows
-- or pick-one-flagship decision before any of these can be filled accurately. (9)
--   106 9caff85d-... Cornell Precollege Studies (4 tracks, ages 15-19/16-19/16-18/<18)
--   110 9f1b802e-... UChicago Pre-College (4 named programs, site determines eligibility dynamically)
--   122 af30653c-... Northwestern University (CTD hub spans PreK-12 in multiple tiers, row doesn't identify which course)
--   134 c2444f7f-... Brown University (8 distinct programs)
--   138 c4e113c2-... American University Washington DC (6+ programs)
--   148 ce7d618b-... UCSB (RMP grades 10-11 + discretionary 9th vs. SRA grades 9-11 -- real difference, not just an envelope)
--   157 d49e827f-... Oxbridge Academic Programs (9 programs, union grades 8-12)
--   178 f493d81f-... The Institute of Competition Sciences (hosts 6 unrelated competitions)
--   187 fad2bef3-... Wharton Global Youth Program (eligibility fragmented across graduation-year cohorts, no single figure)

-- Real, sourced grade data exists but excluded for a specific accuracy concern (1)
--   137 c406c406-... Hamilton Olympiad -- UK Year10/S3/NI-Year11 is real and explicit, but
--       converting it to a single US grade ([9]) is a genuinely different kind of inference
--       than the other UK-olympiad rows in this set (those state a floor or ceiling; this
--       states one specific year-group per nation) -- excluded for consistency with how the
--       other UKMT rows were handled (128, 168, 169, 181, 182 all keep raw UK terms or omit
--       rather than convert), pending one policy decision from CEO on all of them together.
--       Also invitation-only (qualifying IMC score or discretionary entry), not open
--       application like the rest of this batch.

-- *** Wrong-program URL -- the single most important exclusion in this file. (2) ***
-- Stored official_url points to a program for a COMPLETELY DIFFERENT audience. Writing
-- eligibility data here would attach a true fact about the wrong program to this row. Both
-- confirmed by me directly opening the actual pages, not just trusting the research pass.
--   171 e6f4c6d8-... Bocconi Summer School -- stored URL is the Bachelor-enrolled-only program;
--       a separate, correct "Summer School for High School Students" page exists at a
--       different URL (unibocconi.it/en/programs/summer-school/summer-school-high-school-students).
--   188 fd105724-... Universidad de Navarra -- official_url is a high-school Camino de Santiago
--       program; source_url is UNICC, a university-TEAM business case competition. Two
--       unrelated programs under one catalog row.

-- Other data-quality flags, no fill possible/safe (1)
--   183 f8fc69c2-... Trinity College "London, Ireland" -- landing page shows a STEM club and an
--       undergraduate-only nursing program, neither matching a 14-18 audience; title itself is
--       internally inconsistent. Other plausible TCD programs exist but none confirmed.

-- ============================================================================
-- Not a research answer -- flagged for CEO regardless of the SQL above:
-- ============================================================================
-- 1. Rows 135 (c35f002c) and 150 (cfb32772) are very likely duplicate catalog entries for the
--    SAME real competition (Wharton High School Data Science / Sports Analytics). Both are
--    included above since the data itself is accurate for both URLs -- but worth deciding
--    whether one row should be retired/merged, separate from this fill.
-- 2. Harvard CURE (105) surfaced a schema gap: some opportunities are restricted by US STATE,
--    not country -- no existing field can express that without overstating eligibility to
--    ["United States"]. Worth checking whether this recurs in the other 190-row set.
