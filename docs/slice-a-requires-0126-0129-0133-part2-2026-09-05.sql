-- Slice A (rows 1-95 of 190), part 2 (rows 39-95) — REQUIRES MIGRATIONS 0126, 0129, AND
-- 0133 APPLIED FIRST. Every statement writes *_basis/*_confirmed_open columns that do not
-- exist on the live database as of 2026-09-05. Packaging order: migrations first, this
-- file second. Companion to slice-a-requires-0126-0129-0133-2026-09-05.sql (rows 1-38).
--
-- Rows deliberately absent from every section below, with the reason (full detail in
-- the tracking doc, not repeated per line here): 41 (IE Pre-University, inaccessible --
-- redirect loop), 50 (AMC-AIME, inaccessible + wrong stored URL), 52 (CTY, 403), 53
-- (JRHS, defers to unfetched submission pages), 56 (HMMT, 403), 57 (YGA, no eligibility
-- found + multi-program), 58 (IE JAB, inaccessible -- redirect loop), 59 (IBO,
-- national-team qualification structure), 61 (IOAI, same), 63 (RISE, no eligibility
-- found, dedicated page not locatable), 65 (Coursera, structural mismatch -- generic
-- platform, not a bounded program), 66 (JHU Engineering Innovation, 403), 70 (NFTE,
-- fetched quote belongs to a different NFTE sub-program, not this row), 74 (Phillips
-- Exeter, inaccessible), 76 (Columbia Pre-College Online, inaccessible), 78 (Battle Code
-- MIT, 5-tournament bundle, mostly college-level), 82 (Baltic Sea Philosophy Essay, thin
-- site, no eligibility content locatable), 84 (International Brain Bee, national-team
-- structure), 86 (iStar Class, this page section lacks it), 88 (York Helix,
-- inaccessible), 94 (Hochschule Bremen -- graduate Master's programme, not a high-school
-- opportunity at all, see doc), 95 (ACU, PDF unreadable).

-- age_eligibility_basis = 'checked_not_stated'
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '36fb08db-6f39-4d38-8094-1e37ac102917' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- USACO
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '40ef389f-b58f-447d-87b4-b7deb3effe2a' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- Columbia College Edge Summer
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '45770aad-075c-4411-8ee7-c86d21236276' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- CMIMC
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '496ef7db-b8d4-4a72-8bcc-b7cb13208e40' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- Horizon Academic Essay Prize ("enrolled in high school" -- not a number)
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '49fcb739-274c-416d-82d7-40b6a7797fdb' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- Georgetown Summer
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '4b9f3125-d8a7-4623-8c61-f4714063d152' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- BU Summer High School Programs (grade untouched -- multi-program conflict, see doc; age has no such conflict, genuinely unstated)
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '4db17042-5487-4090-9212-0d7243acaa26' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- Sabancı Nanotechnology Winter School
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '55dd21cd-859e-498a-a69d-56f45d777d8e' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- UniHive Research Proposal Competition
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '56ca6900-4a53-4fb3-9158-90b1bdce7a80' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- Wharton M&TSI
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '647eb8da-9cb8-46d4-8ded-b4c516f7ac90' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- UCSB Research Mentorship Program
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '6672d211-71e1-4667-b2eb-b266d4abc7b3' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- İTÜ Tasarım Atölyesi
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '6bcef34b-bb53-427b-9907-0955d1862754' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- Kadir Has Kış Okulu
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '6d62d570-533a-49a4-9f86-aecf5e316b58' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- NYU High School Law Institute
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '724a375c-fa54-439c-b8d2-c86869fed88d' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- Wharton Hack-AI-thon
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '72b66f92-1356-4827-9139-530db7c52c74' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- BRAND-ED / Edconic
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '74bf3eb7-6f04-4dbb-9b71-9175287ed4b8' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- Horizon Inspires
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '78c7c178-d6dd-4d50-a76f-b44ebd603784' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- Özyeğin University Summer School 2026
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '7998c901-73b8-4355-8e0d-b1f2cdaf9c16' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- Pre-College Program Virtual Fairs
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '7a2a2aea-af5f-4e06-ba12-104f08df7b8c' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- UC Berkeley Business Academy for Youth
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '823e79e6-3d59-48c4-a3cf-39bc9a670b98' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- BmMT (Berkeley Math Tournament)
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '868d4a6f-855d-48c9-b55d-3dd831178135' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- Summer Discovery (grade untouched -- 4-campus conflict incl. a middle-school-only track, see doc; age genuinely unstated across all)
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '889c580c-dbb6-4490-9078-9faf2a2a2ed0' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- UM Academies (Univ of Miami two-week)
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '89fa66fc-c7cf-4fa6-8b28-1a016e860484' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- World Scholar's Cup ("three age divisions" named, no numbers given)
update public.opportunities set age_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '8e5c10af-aebb-449c-9811-fed9dcc14039' and minimum_age is null and not coalesce(age_eligibility_confirmed_open, false); -- POLIMI Summer School (Techcamp) -- grade untouched, Italian year-system phrasing, see doc

-- grade_eligibility_basis = 'checked_not_stated'
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '35f7475c-2567-4dde-ab61-c427059ff180' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- JEI ("middle and high school students" -- not defined)
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '36fb08db-6f39-4d38-8094-1e37ac102917' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- USACO ("at all levels" reads as skill divisions, not grades)
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '455e6fb3-7592-45d4-852a-602acd95bd81' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- Kode With Klossy
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '45770aad-075c-4411-8ee7-c86d21236276' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- CMIMC
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '496ef7db-b8d4-4a72-8bcc-b7cb13208e40' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- Horizon Academic Essay Prize
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '49fcb739-274c-416d-82d7-40b6a7797fdb' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- Georgetown Summer
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '55dd21cd-859e-498a-a69d-56f45d777d8e' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- UniHive Research Proposal Competition
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '647eb8da-9cb8-46d4-8ded-b4c516f7ac90' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- UCSB Research Mentorship Program
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '6672d211-71e1-4667-b2eb-b266d4abc7b3' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- İTÜ Tasarım Atölyesi
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '6bcef34b-bb53-427b-9907-0955d1862754' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- Kadir Has Kış Okulu (closer call than Sabancı's -- see doc)
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '6d62d570-533a-49a4-9f86-aecf5e316b58' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- NYU High School Law Institute
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '724a375c-fa54-439c-b8d2-c86869fed88d' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- Wharton Hack-AI-thon
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '72b66f92-1356-4827-9139-530db7c52c74' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- BRAND-ED / Edconic
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '74bf3eb7-6f04-4dbb-9b71-9175287ed4b8' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- Horizon Inspires
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '78c7c178-d6dd-4d50-a76f-b44ebd603784' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- Özyeğin University Summer School 2026
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '7998c901-73b8-4355-8e0d-b1f2cdaf9c16' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- Pre-College Program Virtual Fairs
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '7a2a2aea-af5f-4e06-ba12-104f08df7b8c' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- UC Berkeley Business Academy for Youth ("middle and high school students")
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '823e79e6-3d59-48c4-a3cf-39bc9a670b98' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- BmMT ("high school and advanced middle school")
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '889c580c-dbb6-4490-9078-9faf2a2a2ed0' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- UM Academies
update public.opportunities set grade_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '89fa66fc-c7cf-4fa6-8b28-1a016e860484' and cardinality(eligible_grades) = 0 and not coalesce(grade_eligibility_confirmed_open, false); -- World Scholar's Cup

-- country_eligibility_basis = 'checked_not_stated'
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '40ef389f-b58f-447d-87b4-b7deb3effe2a' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- Columbia College Edge Summer
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '455e6fb3-7592-45d4-852a-602acd95bd81' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- Kode With Klossy
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '47bc163d-65b1-4e72-94bd-ffc7fabe8a20' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- Summer@Brown
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '49fcb739-274c-416d-82d7-40b6a7797fdb' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- Georgetown Summer ("meet classmates from around the world" -- descriptive, not policy)
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '4b9f3125-d8a7-4623-8c61-f4714063d152' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- BU Summer High School Programs ("50 states and 87 countries" -- attendance stat, not policy)
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '4db17042-5487-4090-9212-0d7243acaa26' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- Sabancı Nanotechnology Winter School
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '55dd21cd-859e-498a-a69d-56f45d777d8e' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- UniHive Research Proposal Competition ("secondary school students from around the world" -- descriptive)
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '56ca6900-4a53-4fb3-9158-90b1bdce7a80' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- Wharton M&TSI
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '6672d211-71e1-4667-b2eb-b266d4abc7b3' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- İTÜ Tasarım Atölyesi
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '6bcef34b-bb53-427b-9907-0955d1862754' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- Kadir Has Kış Okulu
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '6d62d570-533a-49a4-9f86-aecf5e316b58' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- NYU High School Law Institute ("throughout New York City" -- describes who the org serves, not a formal restriction)
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '724a375c-fa54-439c-b8d2-c86869fed88d' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- Wharton Hack-AI-thon
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '72b66f92-1356-4827-9139-530db7c52c74' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- BRAND-ED / Edconic
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '74bf3eb7-6f04-4dbb-9b71-9175287ed4b8' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- Horizon Inspires (alumni named from 4 countries -- descriptive, not policy)
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '78c7c178-d6dd-4d50-a76f-b44ebd603784' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- Özyeğin University Summer School 2026
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '7998c901-73b8-4355-8e0d-b1f2cdaf9c16' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- Pre-College Program Virtual Fairs
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '7a2a2aea-af5f-4e06-ba12-104f08df7b8c' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- UC Berkeley Business Academy for Youth ("25+ countries represented" -- attendance stat)
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '7b6ebabf-dd0a-4da5-9155-381674f6d7f0' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- HSHSP (Michigan State) -- "from across the U.S. and territories" is a closer call, not a confident restriction fill, see doc
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '7f8281b0-7fc5-4a06-a03c-7c3f37bbc972' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- SAIC ECPOSI ("collaborate with students...around the world" -- peer-group framing, not policy)
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '823e79e6-3d59-48c4-a3cf-39bc9a670b98' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- BmMT ("4,000 participants from all across the globe" -- attendance stat)
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '868d4a6f-855d-48c9-b55d-3dd831178135' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- Summer Discovery
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '889c580c-dbb6-4490-9078-9faf2a2a2ed0' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- UM Academies
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '89fa66fc-c7cf-4fa6-8b28-1a016e860484' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- World Scholar's Cup ("70 participating countries" -- attendance stat)
update public.opportunities set country_eligibility_basis = 'checked_not_stated', last_verified_at = now()
where id = '8e5c10af-aebb-449c-9811-fed9dcc14039' and cardinality(eligible_countries) = 0 and not coalesce(country_eligibility_confirmed_open, false); -- POLIMI Summer School (Techcamp)
