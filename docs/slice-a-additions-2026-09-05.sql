-- Slice A (rows 1-95 of 190), part 1 (rows 1-38) — additions/corrections needing NO
-- migration. Prepared, not applied — CEO packages.
--
-- Evidentiary rule: explicit statement on the actual official page, fetched directly.
-- "Doesn't state" != "doesn't have." Foreign school-year/grade systems (UK Year/S-levels,
-- Hong Kong Secondary N) are deliberately NOT converted to this product's grade scale here
-- -- flagged instead, per the standing "a wrong value is worse than an empty one" rule:
-- getting an international conversion wrong would be exactly that.

-- Row 6 - DigiPen Academy: age + grade + country, all three explicit and clean.
-- "Participants must be at least 16, entering their Junior or Senior year of high school,
-- or have graduated high school within the last 18 months." + "Students from outside the
-- United States are welcome! There are no additional program prerequisites for
-- international students."
update public.opportunities
set minimum_age = 16,
    eligible_grades = array['11','12'],
    country_eligibility_confirmed_open = true,
    last_verified_at = now()
where id = '036f80e1-7ae5-46a9-8b68-6a890d50f8b8'
  and minimum_age is null and cardinality(eligible_grades) = 0 and not coalesce(country_eligibility_confirmed_open, false);

-- Row 9 - NYU Tandon ML: grade explicit ("ACCEPTING STUDENTS IN 9TH - 12TH GRADE"),
-- country explicit ("OPEN TO US RESIDENTS AND INTERNATIONAL STUDENTS"). Age not a general
-- floor -- the "15 years old" quote is a housing-only requirement, not a program-wide
-- minimum, so left unfilled rather than treated as a blanket age gate.
update public.opportunities
set eligible_grades = array['9','10','11','12'],
    country_eligibility_confirmed_open = true,
    last_verified_at = now()
where id = '08ee973d-9dce-485e-b2f2-51deeb48c2ff'
  and cardinality(eligible_grades) = 0 and not coalesce(country_eligibility_confirmed_open, false);

-- Row 15 - Mathematical Competition for Girls (UKMT): explicit, real country RESTRICTION
-- (not confirmed-open) -- "(UK Schools only)".
update public.opportunities
set eligible_countries = array['United Kingdom'],
    last_verified_at = now()
where id = '10fdad93-cb6f-41cc-8cf1-97baa55cf384'
  and cardinality(eligible_countries) = 0;

-- Row 24 - Senior Team Maths Challenge (UKMT): same real restriction shape as row 15 --
-- "Your institution must be in the UK."
update public.opportunities
set eligible_countries = array['United Kingdom'],
    last_verified_at = now()
where id = '1cd3d046-3101-4314-b068-4d946286512e'
  and cardinality(eligible_countries) = 0;

-- Row 25 - Hong Kong Baptist University: grade explicit -- "rising seniors who will begin
-- their final year of high school after the summer, or final-year high school students
-- graduating in late 2026 or early 2027" maps cleanly to grade 12 (US-equivalent final
-- year), unlike the HK/UK year-system rows this file deliberately doesn't convert -- this
-- one is phrased directly in "final year of high school" terms, not a foreign numbering
-- scheme.
update public.opportunities
set eligible_grades = array['12'],
    last_verified_at = now()
where id = '1d7aeeff-8ac6-417b-a257-46def5ec701f'
  and cardinality(eligible_grades) = 0;

-- Row 27 - PROMED Projects: age explicit and stated as an eligibility fact (not historical
-- attendee trivia) -- "students aged 14-18 worldwide." "Worldwide" here reads as part of
-- the same eligibility statement, not a separate descriptive claim about who happened to
-- attend -- treated as confirmed-open on that basis.
update public.opportunities
set minimum_age = 14,
    maximum_age = 18,
    country_eligibility_confirmed_open = true,
    last_verified_at = now()
where id = '1e0f59bd-2a96-4744-b5fd-90a9c0ba5801'
  and minimum_age is null and not coalesce(country_eligibility_confirmed_open, false);

-- Row 35 - Nat Geo Slingshot: age explicit -- "our community of 13- to 18-year-olds."
-- Flagged in the accompanying doc as a closer call than most (past-tense/community framing,
-- not a bare eligibility rule) but specific and quantified enough to treat as real.
update public.opportunities
set minimum_age = 13,
    maximum_age = 18,
    last_verified_at = now()
where id = '2b1886f1-29dd-4014-8044-b6ae04d6fb41'
  and minimum_age is null;

-- Row 37 - University of Edinburgh International Summer School: age explicit for the
-- Pre-University track ("Are you 16-18 years old...") and an affirmative inclusion
-- statement for country -- "irrespective of their national, religious, cultural or gender
-- differences" is a stated policy, not descriptive attendee history (the bar Immerse/BU
-- Tanglewood/Oxford Scholastica failed on in yesterday's classification pass).
update public.opportunities
set minimum_age = 16,
    maximum_age = 18,
    country_eligibility_confirmed_open = true,
    last_verified_at = now()
where id = '30436a92-26fd-4972-a8b3-dce8ad454943'
  and minimum_age is null and not coalesce(country_eligibility_confirmed_open, false);

-- Row 38 - Cayley Olympiad (UKMT): country only -- "England, Wales and Overseas" names
-- overseas participation as included, same shape as row 11 (Senior Mathematical
-- Challenge). Grade (UK Year system) deliberately not converted -- see doc.
update public.opportunities
set country_eligibility_confirmed_open = true,
    last_verified_at = now()
where id = '33d84605-403b-42b9-8f65-c38f16d86d9d'
  and not coalesce(country_eligibility_confirmed_open, false);

-- Row 11 - Senior Mathematical Challenge (UKMT): country only, same "Overseas" inclusion
-- as row 38. Grade (UK Year system) deliberately not converted -- see doc.
update public.opportunities
set country_eligibility_confirmed_open = true,
    last_verified_at = now()
where id = '0aee6460-9933-4983-b721-d88bcbfce76f'
  and not coalesce(country_eligibility_confirmed_open, false);

-- Row 33 - Hong Kong Polytechnic University: grade stated in Hong Kong's own Secondary N
-- system ("Secondary 4 and Secondary 5") -- deliberately NOT converted to this product's
-- grade scale here; see doc for why (same standard now applied to every foreign
-- school-year system found in this slice, not just the UK ones).
