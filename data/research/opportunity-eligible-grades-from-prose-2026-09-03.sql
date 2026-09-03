-- ORYN — eligible_grades sweep: fill only from prose already stored in the row
-- Built 2026-09-03, read-only against oryn-qa-scratch (qtcvcflzxbuagvvwahhu). No writes.
--
-- Scope, per CEO's own framing: rows whose OWN already-stored `description` states a grade
-- level in prose that never reached the structured `eligible_grades` field. ZERO new
-- research — no page was fetched for this pass. If a row's description doesn't state it,
-- the row is out of scope, full stop; it is not "researched further," it is left alone.
--
-- THE RULE (written here so it can be checked, not just followed):
-- FILL when the description names specific US grade levels or their standard equivalents
-- directly and unconditionally — "grades 9-12", "9th to 11th grade", "rising junior and
-- senior", "high school seniors", "10th or 11th grade" parenthetically confirmed. These are
-- closed, countable class-year names with one standard meaning; converting "rising junior"
-- to grade 11 is reading the word, not interpreting it.
-- REFUSE when the description would need a judgment call to reduce to one array: a
-- "typical"/"priority" distribution rather than a hard rule (a program whose stated
-- majority is juniors/seniors but explicitly still admits certain freshmen is not the same
-- claim as "juniors and seniors only"); an age-primary statement where a grade note only
-- covers one sub-track of a broader program; a catalog-level record describing several
-- different courses each with its own different range, with no single overall figure
-- stated. "High school students" alone, with no grade specificity, is the same failure
-- shape and is not filled from that phrase.
-- SEPARATE FINDING, not filled either way: a description that states a real, specific bound
-- in a non-US school-year vocabulary (UK "Year 13", Scottish "S5", Hong Kong "Form 4") that
-- this integer-array-of-US-grades field cannot hold without a silent, invented year-to-grade
-- mapping. This is not "unknown" and it is not "fillable" — it is a fourth thing: a real
-- fact the field's own shape refuses. Three of these six were already independently reached
-- and written into their own description by an earlier pass tonight, unprompted by this one
-- — see the Senior/Intermediate Mathematical Challenge and Cayley Olympiad rows on
-- origin/main for that reasoning in place, predating this file.
--
-- 22 filled below. 4 refused as needing interpretation, 6 flagged as stated-but-wrong-
-- vocabulary, 6 genuinely silent (a "Junior" in five of those six is the program's own
-- brand name, not a grade word) — all three groups listed in the closing comment, not
-- written as SQL, because none of them should change a stored value.

BEGIN;

-- Coca-Cola Scholars Program -- "graduating high school seniors"
update public.opportunities set eligible_grades = array['12']
where id = '690eba7f-0de9-4298-b746-c3456391b9b5' and (eligible_grades is null or eligible_grades = '{}');

-- QuestBridge National College Match -- "high school seniors"
update public.opportunities set eligible_grades = array['12']
where id = 'a2c63505-1481-4a1f-94cc-6ab86dc35405' and (eligible_grades is null or eligible_grades = '{}');

-- HSHSP -- "High school juniors" (own structured-field line)
update public.opportunities set eligible_grades = array['11']
where id = '7b6ebabf-dd0a-4da5-9155-381674f6d7f0' and (eligible_grades is null or eligible_grades = '{}');

-- Bentley University Pre-College Programs -- "rising juniors and seniors"; description also
-- notes younger students may register as commuter/online on a case-by-case basis -- that
-- exception isn't quantified to a grade, so it isn't folded into this array.
update public.opportunities set eligible_grades = array['11','12']
where id = '9e601648-0d30-462e-b9f0-8d069392f29f' and (eligible_grades is null or eligible_grades = '{}');

-- Cornell University -- "You must be a high school junior or senior ... at the time you apply"
update public.opportunities set eligible_grades = array['11','12']
where id = '9caff85d-6976-422e-8fa1-6893eaefa54c' and (eligible_grades is null or eligible_grades = '{}');

-- Frontiers Overview (WPI) -- "Audience: Rising 10, 11, and 12th graders"
update public.opportunities set eligible_grades = array['10','11','12']
where id = '9f0bb452-86ff-4f7b-93fd-9e23298c2d3b' and (eligible_grades is null or eligible_grades = '{}');

-- American University, Washington DC -- "designed for rising juniors and seniors"; a
-- case-by-case online-only exception for rising sophomores is noted but not quantified.
update public.opportunities set eligible_grades = array['11','12']
where id = 'c4e113c2-6e64-40d0-8251-0031ca86c64a' and (eligible_grades is null or eligible_grades = '{}');

-- George Washington University: Washington, DC -- "rising sophomores, juniors, and seniors"
update public.opportunities set eligible_grades = array['10','11','12']
where id = 'aeeb130a-30f6-440f-867e-861cd723a6db' and (eligible_grades is null or eligible_grades = '{}');

-- Pre-Baccalaureate Program (Wharton) -- "exceptional high school juniors and seniors"
update public.opportunities set eligible_grades = array['11','12']
where id = 'bbb81017-3570-4a13-8e82-e4bf612b3436' and (eligible_grades is null or eligible_grades = '{}');

-- Research in Biological Sciences (RIBS) -- "Current high school sophomores (10.grade) and
-- juniors (11.grades)" -- the record's own parenthetical already names the grade numbers.
update public.opportunities set eligible_grades = array['10','11']
where id = 'ea0a2569-e027-4d7c-b9b7-a858fb1359a8' and (eligible_grades is null or eligible_grades = '{}');

-- SPINWIP -- "High school students between 9th to 11th grade at the time of application"
update public.opportunities set eligible_grades = array['9','10','11']
where id = 'dc08474d-8363-4125-b94e-33460354903e' and (eligible_grades is null or eligible_grades = '{}');

-- Stanford Institutes of Medicine Summer Program (SIMR) -- "must currently be juniors or
-- seniors ... (no exceptions)"
update public.opportunities set eligible_grades = array['11','12']
where id = '8f0a8a3f-6c12-4277-91ca-7d120222b231' and (eligible_grades is null or eligible_grades = '{}');

-- Lehigh University (Iacocca) -- "high school sophomores and juniors"
update public.opportunities set eligible_grades = array['10','11']
where id = 'd12506f1-d77e-49c2-9dc8-55fe610da9b0' and (eligible_grades is null or eligible_grades = '{}');

-- Telluride Association Summer Seminar (TASS) -- "high school sophomores and juniors"
update public.opportunities set eligible_grades = array['10','11']
where id = '69b63aaa-2a5d-40d8-940c-b2dcbd2fbf1c' and (eligible_grades is null or eligible_grades = '{}');

-- The Wall Street 101 Summer Pre-College Program -- "rising high school juniors and
-- seniors" (stated twice in the record's own text)
update public.opportunities set eligible_grades = array['11','12']
where id = '12d06ccb-6b51-4ea2-8a9e-7c326fa97514' and (eligible_grades is null or eligible_grades = '{}');

-- Universidad de Navarra -- "rising sophomores (born in 2009) & rising juniors (born in 2008)"
update public.opportunities set eligible_grades = array['10','11']
where id = 'fd105724-26cf-448f-a595-15b3db2d7f8d' and (eligible_grades is null or eligible_grades = '{}');

-- Tulane University Pre-College, New Orleans -- two explicit sub-track statements in the
-- same record ("rising high school freshman, sophomore, junior or senior" for enrichment
-- courses; "rising high school junior or senior" for credit-bearing courses) -- filled as
-- their union, since every student eligible for either track falls in 9-12 and nobody
-- outside 9-12 is eligible for anything this record describes.
update public.opportunities set eligible_grades = array['9','10','11','12']
where id = 'f9421944-556f-46ed-b748-cfdce8ed8cf7' and (eligible_grades is null or eligible_grades = '{}');

-- UChicago College Pathway Program in Economics (Immersion) -- "introduces 9-10-11th grade students"
update public.opportunities set eligible_grades = array['9','10','11']
where id = '89117ca8-52f4-41fb-8674-dd23998e7281' and (eligible_grades is null or eligible_grades = '{}');

-- Summer at Stanford Program for High School 2025 -- "current sophomores, juniors, or seniors"
update public.opportunities set eligible_grades = array['10','11','12']
where id = 'ccd1cf71-219d-4ee2-b6c3-47903972f7cf' and (eligible_grades is null or eligible_grades = '{}');

-- The Rockefeller University Summer Science Research Program (SSRP) -- "current high
-- school juniors and seniors ... with no exceptions"
update public.opportunities set eligible_grades = array['11','12']
where id = '2bbea7da-09bb-4eca-b46b-c3b5363e3b92' and (eligible_grades is null or eligible_grades = '{}');

-- Two-week UM Academies (non-credit) -- "for high school freshmen, sophomores, and
-- juniors" -- note this one explicitly does NOT include seniors.
update public.opportunities set eligible_grades = array['9','10','11']
where id = '889c580c-dbb6-4490-9078-9faf2a2a2ed0' and (eligible_grades is null or eligible_grades = '{}');

-- UCSB Research Mentorship Programs -- "high school students (10th or 11th grade, minimum
-- 3.8 weighted GPA)"
update public.opportunities set eligible_grades = array['10','11']
where id = '647eb8da-9cb8-46d4-8ded-b4c516f7ac90' and (eligible_grades is null or eligible_grades = '{}');

-- Verification -- expect 22 rows, each eligible_grades matching the comment above it.
select id, title, eligible_grades from public.opportunities where id in (
  '690eba7f-0de9-4298-b746-c3456391b9b5','a2c63505-1481-4a1f-94cc-6ab86dc35405',
  '7b6ebabf-dd0a-4da5-9155-381674f6d7f0','9e601648-0d30-462e-b9f0-8d069392f29f',
  '9caff85d-6976-422e-8fa1-6893eaefa54c','9f0bb452-86ff-4f7b-93fd-9e23298c2d3b',
  'c4e113c2-6e64-40d0-8251-0031ca86c64a','aeeb130a-30f6-440f-867e-861cd723a6db',
  'bbb81017-3570-4a13-8e82-e4bf612b3436','ea0a2569-e027-4d7c-b9b7-a858fb1359a8',
  'dc08474d-8363-4125-b94e-33460354903e','8f0a8a3f-6c12-4277-91ca-7d120222b231',
  'd12506f1-d77e-49c2-9dc8-55fe610da9b0','69b63aaa-2a5d-40d8-940c-b2dcbd2fbf1c',
  '12d06ccb-6b51-4ea2-8a9e-7c326fa97514','fd105724-26cf-448f-a595-15b3db2d7f8d',
  'f9421944-556f-46ed-b748-cfdce8ed8cf7','89117ca8-52f4-41fb-8674-dd23998e7281',
  'ccd1cf71-219d-4ee2-b6c3-47903972f7cf','2bbea7da-09bb-4eca-b46b-c3b5363e3b92',
  '889c580c-dbb6-4490-9078-9faf2a2a2ed0','647eb8da-9cb8-46d4-8ded-b4c516f7ac90'
);

COMMIT;

-- ══════════════════════════════════════════════════════════════════
-- Refused as interpretation (4) -- not written above, left null
-- ══════════════════════════════════════════════════════════════════
-- Early College Program (ECP), SAIC (e9c4cd39) -- primary statement is age (14-18); the
--   only grade note ("completed sophomore year") is scoped to just the college-credit
--   sub-track, not the record's whole eligibility.
-- HKUST I·ELITE Pre-University Scholars Program (f3cda419) -- "Grade 10... or above" stated
--   across four school systems at once; "or above" is unbounded and the record is explicitly
--   multi-system, not a clean single US-grade statement.
-- Johns Hopkins Engineering Innovation Pre-College Programs (6d3a439a) -- "typical student is
--   a rising junior or senior... ninth-graders may be considered" is a distribution/priority
--   statement, not a hard eligibility rule -- converting "may be considered, but priority to
--   older students" into a fixed array invents a cutoff the text doesn't state.
-- Summer@Brown (47bc163d) -- one record standing in for a whole catalog of courses; the
--   description names two example courses with two different ranges (9-10 for one, 12-only
--   for the Pre-Bacc track) and says "there are a lot of courses" beyond those -- no single
--   overall figure stated for what this record actually represents.
--
-- ══════════════════════════════════════════════════════════════════
-- Stated, but in a vocabulary this field cannot hold (6) -- not written, this is itself
-- the finding
-- ══════════════════════════════════════════════════════════════════
-- Senior Mathematical Challenge (0aee6460), Intermediate Mathematical Challenge (ba4d814c),
--   Cayley Olympiad (33d84605) -- all three already carry their own comment on origin/main,
--   written by an earlier pass tonight, independently reaching the same call this file
--   reaches: "UK school-year gating, not US grade or age -- not converted... to avoid a
--   silent Year-to-grade mismatch."
-- Hamilton Olympiad (c406c406), Maclaurin Olympiad (e15c0e56) -- same UKMT "Year N" pattern,
--   same official page as Cayley, not yet carrying that same comment but the identical case.
-- Sutton Trust UK Summer Schools (27213610) -- "Year 12 (England/Wales) / Year 13 (Northern
--   Ireland) / S5 (Scotland)" -- three different national year-systems in one eligibility
--   line, none of them a US grade.
--
-- ══════════════════════════════════════════════════════════════════
-- Genuinely silent (6) -- no grade-eligibility language in the description at all
-- ══════════════════════════════════════════════════════════════════
-- Hampshire College Summer Studies in Mathematics / HCSSiM (1fe1537e) -- the only "junior" in
--   this record's text describes junior STAFF (grad/undergrad teaching staff), not student
--   eligibility.
-- Columbia Junior Science Journal / CJSJ (e0e1584c) -- "Junior" is the publication's own
--   name; the description says only "high school research journal", no grade specificity.
-- International Chemistry Olympiad / IChO (db06b920) -- states an age rule (under 20 on 1
--   July) and a citizenship rule, no grade language anywhere.
-- Stockholm Junior Water Prize (17aeb772) -- "Junior" is the competition's own name; states
--   an age range (15-20), no grade language.
-- IE JAB / Junior Advisory Board (5eff8569) -- "Junior" is the board's own name; no grade or
--   age eligibility text in the record at all.
-- The Blackstone Law Review Competition — Junior Division (e6bdef3f) -- "Junior Division" is
--   the competition's own structural name; states an age floor (13+), no grade language.
