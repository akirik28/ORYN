-- Prepared, NOT applied. Read-only investigation per CEO brief (2026-09-03), the
-- founder applies. 59 of 74 live 'cycle_status=unverified, status=active' rows promoted
-- individually verified against each program's own official page, 2026-09-03.
-- 0 rows confirmed dead. 14 unresolvable (untouched, still cycle_status='unverified').
-- 1 deferred (University of Maastricht, already on oryn-d0's queue).

begin;

-- American University, Washington DC  (was org=None)
--   reused from org-research closeout
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', official_url = 'https://www.american.edu/summer/precollege/' where id = 'c4e113c2-6e64-40d0-8251-0031ca86c64a';

-- Hong Kong Baptist University (HKBU)  (was org=None)
--   reused from org-research closeout
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', official_url = 'https://hs-summer.hkbu.edu.hk' where id = '1d7aeeff-8ac6-417b-a257-46def5ec701f';

-- Lehigh University  (was org=None)
--   reused from org-research closeout
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', official_url = 'https://academicoutreach.lehigh.edu/pre-college-programs' where id = 'd12506f1-d77e-49c2-9dc8-55fe610da9b0';

-- Lehigh University: Bethlehem, PA  (was org=None)
--   reused from org-research closeout
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', official_url = 'https://academicoutreach.lehigh.edu/pre-college-programs' where id = 'a7a89e1e-a9e3-4a8e-9850-789c609a769d';

-- Pre-College Program  (was org=None)
--   reused from org-research closeout
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', official_url = 'https://www.ie.edu/ie-summer-school/pre-university/' where id = '3c4cbeb7-b625-45d0-a0b9-f34df979a3d8';

-- Purdue University  (was org=None)
--   reused from org-research closeout
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', official_url = 'https://www.purdue.edu/thinksummer/' where id = '16d56c3b-376b-4cf6-b8b1-12daaecf0068';

-- Sabancı University Nanotechnology Winter School  (was org=None)
--   reused from org-research closeout
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', official_url = 'https://sunum.sabanciuniv.edu/tr/egitim/kis-okulu-tr' where id = '4db17042-5487-4090-9212-0d7243acaa26';

-- The Hong Kong Polytechnic University (PolyU)  (was org=None)
--   reused from org-research closeout
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', official_url = 'https://www.polyu.edu.hk/summerinstitute/' where id = '255377bc-7564-452d-96e5-b25fb6902aa0';

-- Trinity College London, Ireland  (was org=None)
--   TITLE NOTE (not applied -- founder's call): Trinity College Dublin, not London -- title conflates two real institutions
--   reused from org-research closeout
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', official_url = 'https://www.tcd.ie/study/other-courses/summer-schools/' where id = 'f8fc69c2-e48f-48d1-9a5f-6323a7c10e34';

-- Nat Geo Slingshot  (was org=None)
--   reused from org-research closeout
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', official_url = 'https://www.nationalgeographic.org/society/projects/slingshot' where id = '2b1886f1-29dd-4014-8044-b6ae04d6fb41';

-- Sabancı University Summer School (Lise Yaz Okulu)  (was org='Sabancı Üniversitesi')
--   stored deadline 2026-08-01 already elapsed -- deadline gate already excludes this row regardless of cycle_status; closed is the honest match, not date_not_announced
update public.opportunities set cycle_status = 'closed', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z' where id = '1d4f5e60-8fe3-4b1a-a7d6-acb29b124e3c';

-- STEM Racing  (was org='STEM Racing')
--   global rolling competition circuit, active
update public.opportunities set cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'STEM Racing Global' where id = 'c12ce265-c6c4-454b-97f5-680d366813ec';

-- 67th London International Youth Science Forum (LIYSF) - 2026  (was org=None)
--   TITLE NOTE (not applied -- founder's call): 68th LIYSF (2027), not 67th (2026) -- 2026 cohort concluded
--   confirmed future cycle: 18-31 Jul 2027
update public.opportunities set cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'LIYSF CIC' where id = 'c7223aea-7bb9-4b29-b59d-a054d7bfa02c';

-- ACU BİLİM YAZ KAMPI PROGRAMI 2026  (was org='Acıbadem Mehmet Ali Aydınlar University (ACU)')
--   2026 cycle (29 Jun-10 Jul) concluded, no 2027 posted yet
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z' where id = '900b0a32-298f-4956-b933-3211e25b438b';

-- Andover Summer at Phillips Academy 2026  (was org=None)
--   TITLE NOTE (not applied -- founder's call): stale 2026 in title -- live cycle is Summer Session 2027
--   confirmed future cycle: 29 Jun-1 Aug 2027
update public.opportunities set cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Phillips Academy' where id = 'c14ee166-0d7a-4c6c-8b78-f92b501dccbb';

-- AwesomeMath Summer Program  (was org=None)
--   2026 cycle closed 26 May, no 2027 posted yet
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'AwesomeMath' where id = 'cfe42a66-3688-43aa-8e7e-61ffca68adb8';

-- Bocconi Summer School 2026  (was org=None)
--   2026 applications closed, no 2027 posted yet
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Bocconi University' where id = 'e6f4c6d8-3e1d-4762-a6be-dd299592ac0e';

-- Dive Into Engineering!  (was org=None)
--   TITLE NOTE (not applied -- founder's call): "Dive Into Engineering!" is not an official program name -- real program at this URL is "Discover Engineering"
--   no specific date confirmed
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'USC Viterbi School of Engineering (USC Pre-College Programs)', official_url = 'https://precollege.usc.edu/summer-programs/discover-engineering/' where id = '16b3d6ae-dfcf-4ac7-b1c8-4a038e552bec';

-- Downing College University of Cambridge - 2026  (was org=None)
--   TITLE NOTE (not applied -- founder's call): stale 2026 in title -- live cycle is 2027 (Programme B/C)
--   confirmed future cycle: Jul-Aug 2027
update public.opportunities set cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Downing College, University of Cambridge' where id = 'a5cf4328-7bc1-4ad7-9de5-8bc8b7df9220';

-- Early College Program (ECP) Courses for High School Students (Ages 14-18)  (was org=None)
--   rolling/open registration
update public.opportunities set cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'School of the Art Institute of Chicago (SAIC)' where id = 'e9c4cd39-b514-4975-b010-1c627d7231c8';

-- Earn college credit that may transfer to any college you attend  (was org=None)
--   TITLE NOTE (not applied -- founder's call): marketing tagline as title, not a program name (catalog-quality note, not a verification issue)
--   2026 session (15-26 Jun) and payment deadline (1 May) both elapsed, no 2027 posted
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'SAIC -- Continuing Studies' where id = '7f8281b0-7fc5-4a06-a03c-7c3f37bbc972';

-- For-Credit Fun-Sized Courses  (was org=None)
--   tentative 2026 dates elapsed, deadline lives on a separate portal not read
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Purdue University -- Lyles School of Civil and Construction Engineering' where id = '1d9d3901-b31f-44f8-9147-d6807b04ad3e';

-- Garcia Summer Scholars  (was org=None)
--   stored URL was a stale 2018 news article; real program page has no explicit deadline
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Stony Brook University -- Garcia Center for Polymers at Engineered Interfaces', official_url = 'https://www.stonybrook.edu/garcia/summer-program/' where id = 'd83d7048-537b-4450-8dfa-69e709cdb48f';

-- Harvard CURE Initiative to Eliminate Cancer Disparities  (was org=None)
--   TITLE NOTE (not applied -- founder's call): org corrected from bare "Harvard" -- DFHCC is a Harvard-affiliated consortium, not Harvard University itself
--   "Applications for 2027 will open in the Fall of 2026" -- season named, no exact date yet
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Dana-Farber/Harvard Cancer Center (DF/HCC)' where id = '9b93f1ce-9114-4a2e-96b7-2823f6145d21';

-- Inspirit AI + Healthcare and Medicine  (was org=None)
--   page explicitly self-discloses NOT an official Stanford program; rolling apply-now
update public.opportunities set cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Inspirit AI' where id = 'f54d2f62-6335-4f19-a05f-f03c3e47bc40';

-- İTÜ Tasarım Atölyesi (itüTA)  (was org=None)
--   stored URL was a dead 2024 blog post (404); 2026 cycle (27 Jun start, 1 Jun deadline) already elapsed, no 2027 posted
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'İTÜ SEM, Istanbul Technical University -- Faculty of Architecture', official_url = 'https://itusem.itu.edu.tr/haber-detay/2026/04/20/i-t%C3%BC-tasar%C4%B1m-at%C3%B6lyesi---it%C3%BCta-lise-yaz-okulu' where id = '6672d211-71e1-4667-b2eb-b266d4abc7b3';

-- John Locke Institute (JLI) Courses  (was org=None)
--   "Apply Now for 2026" live, no fixed deadline shown
update public.opportunities set cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'John Locke Institute' where id = 'cf169cf4-a589-4743-a70f-e1efd28fbcd2';

-- Kadir Has Kış Okulu  (was org='Kadir Has University')
--   dates (19-30 Jan 2026) already elapsed, no 2027 posted yet
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z' where id = '6bcef34b-bb53-427b-9907-0955d1862754';

-- Leangap  (was org=None)
--   2026 cycle (both sessions) elapsed and sold out; capacity/timing, not existence
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Leangap Education, Inc.' where id = 'b5d022aa-302a-4712-b960-a5f70386af17';

-- Lumiere Education  (was org=None)
--   2026 cohorts elapsed; page references "further cohorts through Winter 2026-2027" but no exact date given for that window
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Lumiere Education' where id = 'bc678344-c213-4ae8-a4f8-48af2856338f';

-- NYU High School Law Institute  (was org=None)
--   orientation Sept 13 2026 is a real near-future date; classes run through March 2027
update public.opportunities set cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'New York University School of Law (student-run organization)' where id = '6d62d570-533a-49a4-9f86-aecf5e316b58';

-- Oxford Royale  (was org=None)
--   2027 sessions marketed now; early-bird cutoff 15 Sept 2026 is 12 days from today
update public.opportunities set cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Oxford Royale / Oxford Programs Limited -- independent, NOT affiliated with University of Oxford' where id = '6f80e90f-7d85-4c93-b833-f47cbbf6b0c3';

-- Pre-College Summer Programs (Immersion/Stones and Bones/Summer Bridge/Summer College)  (was org=None)
--   TITLE NOTE (not applied -- founder's call): "Summer College" track name not independently re-confirmed as current -- suggest human spot-check
--   2026 applications closed, no 2027 posted
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'University of Chicago (Summer Session)' where id = '9f1b802e-cbc1-4af2-98f1-ffddfa06140b';

-- Student Science Training Program  (was org=None)
--   rolling admission; 2026 cycle elapsed, no 2027 posted -- NOTE: row already carries verified_at=2026-08-23 despite cycle_status='unverified', an existing data inconsistency independent of this finding
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'University of Florida (CPET)' where id = '142a6597-6083-45ba-b9ea-6b92e4a2ab55';

-- The Summer School of the Polytechnic University of Milan (POLIMI) 2026  (was org=None)
--   2026 sessions full ("al completo"), closed on capacity not cancellation
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Politecnico di Milano (POLIMI)' where id = '8e5c10af-aebb-449c-9811-fed9dcc14039';

-- The Wall Street 101 Summer Pre-College Program  (was org=None)
--   page now markets "Summer 2027" directly
update public.opportunities set cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Bentley University' where id = '12d06ccb-6b51-4ea2-8a9e-7c326fa97514';

-- Two-week UM Academies (non-credit)  (was org=None)
--   2026 dates elapsed, no next cycle stated in fetched content
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'University of Miami (Division of Continuing and International Education)' where id = '889c580c-dbb6-4490-9078-9faf2a2a2ed0';

-- UCSB Research Mentorship Programs  (was org=None)
--   page already posts 2027 cycle: dates + application window (Dec 2026-Mar 2027) both given
update public.opportunities set cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'University of California, Santa Barbara (Summer Sessions)' where id = '647eb8da-9cb8-46d4-8ded-b4c516f7ac90';

-- Universidad de Navarra - University of Navarra  (was org=None)
--   2026 deadlines elapsed, no 2027 posted
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'University of Navarra (School of Humanities and Social Sciences)' where id = 'fd105724-26cf-448f-a595-15b3db2d7f8d';

-- University of Applied Sciences and Arts of Western Switzerland  (was org=None)
--   TITLE NOTE (not applied -- founder's call): title names the parent system (HES-SO), not the operating school (HEIA-FR) -- soft org-mismatch, not wrong
--   2026 dates elapsed, first-come-first-served, no 2027 mentioned
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'HEIA-FR (School of Engineering and Architecture of Fribourg), part of HES-SO' where id = '0f7a1ef0-004a-4ce8-88a1-7161dbb6bc48';

-- University of California, Santa Barbara, CA, USA  (was org=None)
--   2026 window closed (Dec 2025-Mar 2026), next cycle not yet posted
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'UC Santa Barbara (UCSB) Summer Sessions' where id = 'ce7d618b-debf-4508-87e1-f6905540bf8d';

-- University of Edinburgh International Summer School  (was org=None)
--   TITLE NOTE (not applied -- founder's call): likely should read "Pre-University Summer School," not "International Summer School" -- Edinburgh has no under-18 program by that literal name; SUISS is a separate real consortium program the title could also plausibly mean -- flagged, not silently picked
--   2026 dates elapsed (29 Jun-10 Jul, deadline 19 May), no 2027 posted
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'University of Edinburgh (Centre for Open Learning)', official_url = 'https://study.ed.ac.uk/summer-school' where id = '30436a92-26fd-4972-a8b3-dce8ad454943';

-- University of the Arts London - The UAL International Summer School  (was org=None)
--   page says "Book now for Summer School 2026" as read on 2026-09-03, after the summer window -- plausibly a stale/unrefreshed page; flagged for a human sanity check rather than promoted to open/upcoming with false confidence
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'University of the Arts London (UAL)' where id = 'ae5e73f0-43ba-42be-baed-423d3087e7e1';

-- Venture & Tech Summer Program 2026  (was org=None)
--   TITLE NOTE (not applied -- founder's call): title's cycle year should bump to 2027
--   confirmed future cycles: Session I 8 Jun-16 Jul 2027, Session II 5 Jul-13 Aug 2027
update public.opportunities set cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Venture & Tech Summer Program (VTSP) -- independent, no longer formally Harvard-affiliated' where id = 'd1c24acc-a289-459f-a476-110a731e2eb8';

-- Wharton Global Youth Program  (was org=None)
--   2026 closed; recurring cycle (opens Nov, priority Jan, final March) but no 2027 dates posted yet
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'The Wharton School, University of Pennsylvania' where id = 'fad2bef3-80e8-4b7e-a4a5-f7021f34767f';

-- Winchester College - Discover Summer Program  (was org=None)
--   2026 dates (3-31 Jul) elapsed, no 2027 mentioned
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Discovery Summer (NOT Winchester College -- Winchester is only the venue)', official_url = 'https://discoverysummer.com/winchester/' where id = '483c0af4-92e1-4599-a4e9-8ac6eec69a57';

-- Major League Hacking  (was org=None)
--   live 2026-season schedule of hackathon events, ongoing roster -- org self-evident from title, no correction needed
update public.opportunities set cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z' where id = 'c8cd2706-7afd-45d9-83cd-f88cc514527d';

-- The Institute of Competition Sciences (ICS)  (was org=None)
--   TITLE NOTE (not applied -- founder's call): row describes an umbrella org, not one dated opportunity
--   hosts Build the Moon Challenge Fall 2026 -- imminent given today's date
update public.opportunities set cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Institute of Competition Sciences (ICS)' where id = 'f493d81f-1f4f-43dd-b0d7-ab6d72eef1d9';

-- Pre-College Program Virtual Fairs  (was org=None)
--   only concrete date (20 Nov 2025 fair) already elapsed, no next date posted
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Association for Pre-College Program Directors (APCPD)' where id = '7998c901-73b8-4355-8e0d-b1f2cdaf9c16';

-- Interlochen Review  (was org=None)
--   page explicitly states "check back in January, 2027" -- confirmed future reopen
update public.opportunities set cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Interlochen Arts Academy' where id = '95093e1a-fc13-4d9a-b4ed-5f0584252b44';

-- Georgia Tech Summer PEAKS (High School Programs)  (was org='Georgia Institute of Technology (CEISMC)')
--   page states "registration open" for Summer 2026 as read on 2026-09-03 -- odd timing (post-summer) but taken from the agent's direct page read rather than second-guessed; org already correct in DB
update public.opportunities set cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z' where id = '51701db6-f571-4ee9-9387-045eed7bb7d4';

-- Caltech Summer Research Connection (SRC)  (was org='California Institute of Technology')
--   rolling ("spots usually filled by early spring"); org already correct -- SEPARATE eligibility defect: eligible_countries=["United States"] is materially overbroad, program is Pasadena Unified School District (PUSD) students only. Flagging, not fixing here -- different field, different owner.
update public.opportunities set cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z' where id = '9b6aefb3-a33e-45a1-af06-5a770a92c45a';

-- Genesys Works  (was org='Genesys Works')
--   rolling, school-partner-based application; org already correct
update public.opportunities set cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z' where id = '4a1ef2dd-ab26-44e0-b6a5-2e49aca13dc0';

-- Partners for the Future  (was org='Cold Spring Harbor Laboratory')
--   nomination-based, current cycle closed, no specific reopen date; org already correct
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z' where id = '6005b354-84d0-486f-b9bf-9bc7dcc2ea6c';

-- CU Boulder Precollegiate Development Program (PCDP)  (was org='University of Colorado Boulder, Office of Precollege Outreach and Engagement')
--   no dates/deadlines anywhere -- continuous outreach program, no cycle structure; org already correct
update public.opportunities set cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z' where id = '995daf25-80ab-4e9a-bcd7-2cd2b2d9d18a';

-- Vanderbilt Programs for Talented Youth (PTY) - Summer Institutes & Summer Academy  (was org='Vanderbilt University, Peabody College (Programs for Talented Youth)')
--   multiple concurrent rolling program windows (e.g. Fall 2026 Mini Immersion opening Sept 2); org/Peabody affiliation already correct
update public.opportunities set cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z' where id = 'b23c2cf0-3c44-40f8-8b0b-67315a066c9f';

-- Washington University in St. Louis College Prep Program (CPP)  (was org='Washington University in St. Louis')
--   official_url correct and current; SEPARATE defect -- stored application_url (pathway.wustl.edu) redirects to a generic admissions page with zero CPP content, should be re-pointed/re-verified independently of this cycle_status change
update public.opportunities set cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z' where id = 'd38255f3-6ce2-440c-b302-c39ee6b17cde';

-- Emerging Engineers @ UVA  (was org='University of Virginia School of Engineering and Applied Science')
--   2026 cycle (27-31 Jul, deadline 15 Apr) elapsed, no 2027 posted; org already correct
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z' where id = 'adce9d5e-c138-49ed-b7ff-370c3828f80e';

-- Aggie STEM Overnight Camp  (was org='Texas A&M University (Aggie STEM)')
--   2026 cycle (31 May-27 Jun, reg closed 25 Apr) elapsed, no 2027 posted; org already correct; URL suggestion points to the specific overnight-camp subpage rather than the generic homepage
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', official_url = 'https://aggiestem.tamu.edu/overnight-camp/' where id = '43c0c707-3447-4863-8d0d-64c7354c113f';

commit;

-- Deliberately NOT touched (still cycle_status='unverified', no change):
-- UNRESOLVABLE -- tool/domain access blocked (11 of 14) -- absence of evidence, not evidence of a problem:
--   c83420f7-8d0d-48b4-9eee-3659fc39706e  iGEM High School Competition  -- igem.org/competition.igem.org/old.igem.org all empty/403; browser denied
--   570ba029-5c57-41e2-aaef-486777f4d8ea  Harvard-MIT Mathematics Tournament (HMMT)  -- hmmt.org 403 on homepage and /rg/info, connection reset on beta.hmmt.org
--   d224a324-b3c0-4a5f-a361-3805efc20a14  CTY: Intensive Studies for 7th Graders and Above  -- cty.jhu.edu 403 on stored page, grades7-12 index, and root
--   216c88aa-8950-4f45-aea9-62939682be0a  Nanoteknoloji ve Biyoteknoloji Lise Kış Kampı  -- ku.edu.tr 403 on all 5 attempted paths
--   2116709f-e222-43c7-95e0-f801053f8f2e  Research Program KUSRP 2026  -- ku.edu.tr 403, same domain-wide block
--   fd51d7f8-1408-4d58-9558-47520758df3d  PreCollege at Ringling College of Art and Design  -- ringling.edu 403 on stored URL and bare root
--   af30653c-94d1-4ce2-8781-b60e659d48ef  Northwestern University  -- my.ctd.northwestern.edu cert-verification error then socket hang-up (parent domain ctd.northwestern.edu loaded fine)
--   031502eb-7a60-43cd-a8c1-8d1c44cac6da  New York Times Audio Stories Podcast Contest  -- nytimes.com refused WebFetch and browser navigation by policy; web.archive.org snapshot also blocked
--   0f182854-87b1-449b-b76e-292acbc2a482  Princeton University Ten-Minute Play Contest  -- arts.princeton.edu 403 on stored URL and a more specific subpage; web.archive.org blocked too
--   aeeb130a-30f6-440f-867e-861cd723a6db  George Washington University: Washington, DC  -- summer.gwu.edu 403 on stored URL, root, and /apply-pre-college; browser navigation denied by the site itself
--   4f668b96-af7e-4595-a097-7447a230004c  Global Issues at Princeton: Grades 10-12  -- cty.jhu.edu 403 again (2nd row hitting this domain); browser denied too -- strong org-mismatch candidate (real operator looks like JHU CTY, not Princeton) but never confirmed on the page itself
-- UNRESOLVABLE -- genuine content-level ambiguity (3 of 14) -- page loaded, verdict still unclear:
--   d780bc55-41e0-444b-8bcc-3f927b28c4b7  Istanbul Bilgi University High School Summer School (Lise Yaz Okulu)  -- org and program both confirmed real and live, but the only dates found anywhere (site or web search) are from 2025 -- no 2026 cycle referenced despite it now being Sept 2026. Genuinely can't tell if unrefreshed, paused, or ran quietly.
--   f912de6d-7da6-4e21-811b-1da09b10c86c  Columbia Spring Immersion Program  -- stored URL resolves to a different real Columbia program ("Academic Year Weekend"), not the stored title ("Spring Immersion Program"). A plausible intended match ("Academic Year Immersion," Spring 2027 session) exists but a follow-up fetch to confirm it failed.
--   8f6e438f-0465-4744-b09b-d4d8b3a82f97  Hochschule Bremen (HSB) City University of Applied Sciences, Germany  -- stored URL loads fine (200) but describes a Master's degree requiring a completed bachelor's -- structurally wrong for a 14-18 audience. No HS-appropriate HSB program found anywhere in search. Distinct from the other 13: not absence of evidence, but confirmed evidence this specific link doesn't fit -- closer to 'wrong for purpose' than genuine 'couldn't tell.'
-- DEFERRED (not this task's to resolve):
--   14db7109-25fd-4cd9-bb70-73797588bec8  University of Maastricht, Netherlands  -- already on oryn-d0's queue as a confirmed official_url provenance defect, flagged for a founder call -- not re-touched here