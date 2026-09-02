-- Opportunity description contamination — staged cleanup, first tranche
-- 2026-09-02, oryn-31, branch oryn/opportunity-description-contamination-2026-09-02
--
-- STAGED ONLY. Not applied. Founder review required before running against the live DB
-- (qtcvcflzxbuagvvwahhu) — every write to this data is founder-gated per standing rule.
--
-- ============================================================================================
-- HOW TO RUN THIS FILE AND WHAT A CORRECT RUN LOOKS LIKE
-- ============================================================================================
-- 35 UPDATE statements below (of the 37 total contaminated rows found, 2 -- BU and SAIC, near
-- the end of this file -- are flagged as founder dedup decisions instead of rewritten; see their
-- own note before COMMIT). Each UPDATE is guarded by a second WHERE condition checking the row's
-- first 70 characters (40 for one row, noted there) still match what was read on 2026-09-02,
-- exactly (`left(description, N) = '...'`). A CORRECT run prints `UPDATE 1` thirty-five times,
-- once per statement, inside one BEGIN/COMMIT transaction.
--
-- Every one of these 35 guards was dry-run verified against live data before this file was
-- finalized (a read-only SELECT simulating each WHERE clause, not the UPDATE itself) -- this
-- caught two real bugs before they could silently no-op: one guard was missing a trailing space,
-- and one (Ringling) compared against a straight apostrophe when the source text actually uses a
-- curly one (U+2019). Both are fixed below and re-verified true. This is why the guards are
-- exact-length-prefix equality rather than a hand-typed LIKE fragment -- Postgres generated every
-- prefix itself via quote_literal(left(description, N)), so the only failure mode left is the row
-- changing after this file was written, which is exactly what the guard exists to catch.
--
-- If any statement instead prints `UPDATE 0`: STOP and do not re-run it forced. UPDATE 0 means
-- that row's description no longer starts with the exact text this file was written against —
-- most likely another lane edited it between 2026-09-02 and whenever this runs. Silently
-- overwriting that edit would lose real work with no error and no trace. Note which id(s)
-- returned 0, leave that statement out, and re-derive its replacement text fresh against the
-- row's current content before writing a new UPDATE for it — the other 36 are unaffected and
-- safe to apply as-is (each statement is independent; a 0-row match on one does not roll back
-- the transaction unless you choose to, since Postgres doesn't error on an UPDATE matching zero
-- rows — it only skips that row).
--
-- The whole file runs inside one BEGIN/COMMIT. If you want to review the `UPDATE 1`/`UPDATE 0`
-- tally before it's final, run everything through the line before COMMIT, check the count of
-- `UPDATE 1` lines equals 37, then run COMMIT; separately (or ROLLBACK; to undo cleanly if
-- something looks wrong).
-- ============================================================================================
--
-- WHAT HAPPENED (best-supported finding, not a certainty):
-- A large number of opportunities.description rows were overwritten on the single night of
-- 2026-08-24 by what reads as an interactive cost/selectivity/eligibility verification pass
-- (or a tight sequence of them) that appended its own first-person research reasoning
-- directly into the public-facing description column, instead of to structured columns or a
-- separate audit-trail field. The shape is extremely consistent: original text, then a blank
-- line, then "[Category] (2026-08-24[, confidence/sourcing qualifier]): reasoning" — tool-call
-- outcomes ("blocked across 5 tool attempts this session", "redirect-looped on 3/3 direct-fetch
-- attempts"), confidence levels ("search-fallback sourced, not a primary direct fetch"),
-- cross-referencing of the session's own earlier assertions ("supersedes", "corroborates"), and
-- explicit schema-gap admissions ("selectivity_evidence has no column, a known schema gap" —
-- IE University's own row states this outright, which is likely *why* description got used as
-- the write target: no better field existed for this note at the time).
--
-- A second, rarer sub-pattern ("Retired 2026-08-24: true duplicate of <id>") shows the same
-- session also doing live deduplication and writing its closeout reasoning into description
-- rather than changing status. Two rows below (BU, SAIC) are this sub-pattern — flagged for a
-- status/dedup decision, not rewritten, since the row itself may be slated for removal.
--
-- Girls Who Code additionally traces to a second, independent defect: its ORIGINAL text (before
-- the 08-24 append) is a raw, unedited "N. Title | Description | URL" tuple fragment that
-- matches supabase/seed_drive_batch1.sql:845 verbatim — the seed corpus itself was already
-- malformed at import (import-opportunity-corpus.ts copies description through with zero
-- transformation by design; this is not a bug in that script, the source row was bad).
--
-- WHO WROTE IT — ruled out, not a currently-checked-in script:
--   scripts/acquire-opportunity-eligibility.ts — its own header explicitly excludes description
--   scripts/ingest-opportunities.ts            — zero references to "description" in the file
--   scripts/validate-research-records.ts       — read-only report generator, no DB writes at all
--   scripts/audit-opportunity-duplicates.ts    — no "Retired"/description-related text at all
--   git history                                 — no commit, on any branch, touches description
--                                                 with this phrasing; data/research/opportunities/
--                                                 *_2026-08-23.jsonl files contain similar research
--                                                 vocabulary (raw findings) but no script transforms
--                                                 them into description UPDATEs
-- Conclusion: this was very likely live, ad-hoc SQL run interactively (e.g. via the Supabase MCP
-- tool) during a research session, not a repeatable pipeline. There is no line of code to patch to
-- stop this from recurring — the durable fix is process (never write research reasoning to a
-- public-facing column) plus a machine-checkable guard (e.g. a CI/QA check that description never
-- matches dated-parenthetical / "this session" / raw-list-index patterns), not a code change.
--
-- SCOPE OF THIS FILE — 37 of 421 opportunities, THIS IS THE FINAL COUNT, NOT A FLOOR:
-- CEO's original regex buckets (8 process-phrase / 11 column-name / 43 date / 22 vocabulary, out
-- of 421 total) were explicitly a starting point. First pass: read 49 candidate rows by hand
-- (union of CEO's 4 patterns) and found 37 genuinely contaminated -- a ~75% hit rate. Several
-- confirmed rows (Girls Who Code, BU, SAIC) were not caught by any of the 4 original patterns at
-- all, only by reading -- so that first-pass 37 was reported as a floor, correctly.
--
-- Second pass, closing it out: re-ran against the FULL 421-row table (not a candidate subset) with
-- every distinct phrase actually observed across all 37 confirmed rows -- the "202X-08-2X" date
-- signature specifically, then independently a wider vocabulary sweep ("this session",
-- "search-fallback", "not primary-fetched", "true duplicate of", "redirect-loop", "blocked across",
-- "not yet resolved", "dedup-checked", "direct fetch", "direct source", "independently upgraded/
-- re-*") -- both sweeps run against the full table minus the 49 already read, both returned ZERO
-- additional rows. 37 is therefore the real, complete count for this specific defect (a
-- research-session note appended to description), not a floor. Also independently confirmed a
-- real false-positive rate inside the original buckets: every UK Maths Trust competition row
-- (Kangaroo/Olympiad/Challenge family, 10 rows checked) matched only on a legitimate program date
-- and is clean, well-written, unrelated to this incident.
--
-- Re-verified live 2026-09-02 (post-close) that all 37 rows are unchanged since first read:
-- length(description) matched exactly for all 37 against a fresh live query. One row (USC
-- Pre-College Summer Programs) shows a later updated_at than my original read despite identical
-- length -- possibly a no-op resave, possibly a same-length edit; its guard below will correctly
-- return UPDATE 0 if the latter, UPDATE 1 if the former.
--
-- TWO SEPARATE, PREVIOUSLY-UNCHARACTERIZED DEFECTS SURFACED WHILE CLOSING THIS OUT -- NOT part of
-- this cleanup, NOT touched by the UPDATEs below, flagged here only so they aren't lost. Turned
-- out both are already known: see docs/known-issues.md, "Needs founder decision — 85/271 live
-- opportunities (31%) have a defective description" (2026-08-22, updated 2026-09-01) -- same root
-- cause (verbatim in the source Drive spreadsheet, not a codebase transform), same ~899-900
-- truncation point, Tier 2 (~79 rows) already explicitly escalated to the founder: "do not
-- bulk-retire or bulk-rewrite this set without a founder decision." Not new, not touched here,
-- not re-investigated -- see [[feedback_check_known_issues_before_reporting_new]].
--
-- Each UPDATE below keeps only verifiable factual claims from the row's own current text (dates,
-- costs, requirements, program structure) and drops every sentence that is process narration,
-- tool-call self-reference, confidence hedging about *how* the fact was obtained, or cross-
-- references to the session's own prior work. Where the pre-append original was itself a raw,
-- truncated, or garbled import fragment, the replacement is a clean rewrite sourced from the
-- verified facts in the append (the append's facts are usually the more current/accurate ones —
-- that part of the incident was good research, just miswritten to the wrong field).
--
-- Not included here: full re-verification of every fact against a live source. This file corrects
-- the WRITING problem (process notes in a public field); it does not re-run the underlying
-- research. Cost/date/requirement figures are carried forward as this session's own research
-- already stated them, not independently re-checked by me tonight.

BEGIN;

UPDATE opportunities SET description =
'Girls Who Code is an international nonprofit that works to increase the number of women in computer science and close the gender gap in computing employment. Its primary offering, Clubs, is not self-service for students: it requires an existing school or library club, or an adult becoming a background-checked facilitator, and has no single student-facing application, deadline, or cost.'
WHERE id = '674f46f0-b71c-4d3a-bbff-20cfa9dcfdee' -- Girls Who Code (also: raw seed-import fragment, see header)
  AND left(description, 70) = '5. Girls Who Code | Girls Who Code is an international nonprofit organ';

UPDATE opportunities SET description =
'Wall Street 101 is a competitive experiential learning program for rising high school juniors and seniors interested in global finance and investing, including stocks, bonds, currencies and commodities, hosted by Bentley University. In small classes led by Bentley faculty with industry experience, students participate in lectures, case analyses, interactive trading simulations and presentations by Wall Street professionals. Selective, multi-part application; reported to be oversubscribed by roughly 100 applicants relative to available spots.'
WHERE id = '12d06ccb-6b51-4ea2-8a9e-7c326fa97514' -- Wall Street 101 Summer Pre-College Program
  AND left(description, 70) = 'Bentley University | Wall Street 101 is a competitive experiential lea';

UPDATE opportunities SET description =
'Two-week pre-university experience for students aged 15-17, week one in Segovia and week two at IE Tower in Madrid, taught by IE University faculty. Curriculum blends skill-building workshops (design thinking, sustainability/social-impact challenges, critical thinking in AI, a customer-discovery hackathon, presentation/pitch training) with campus-life immersion and university-admissions guidance; students receive an official certificate of completion. Six two-week intake editions are listed for Summer 2027 (13 June-25 June through 18 July-30 July 2027). Fee is EUR 5,900, described as including full-board accommodation (private en-suite bedroom, 3 meals/day), in-program transport, and airport transfers within specified hours; flights, laundry and personal spending are extra. Completing the program earns "IE Pre-University Alumni" an application-fee and admissions-test-fee waiver toward a future IE Bachelor''s application. Selection includes an interview assessing English proficiency and motivation; program materials describe admission as competitive (essays, interviews, motivation, leadership potential, international mindset and personal fit).'
WHERE id = '41db8ceb-16ea-4215-adc0-7fb7b152649d' -- IE University Pre-University Summer Program
  AND left(description, 70) = 'Two-week pre-university experience for students aged 15-17, week one i';

UPDATE opportunities SET description =
'Two-week non-credit summer academic program at Yale for rising high school juniors and seniors, across tracks including politics/law/economics, science/engineering, and society/culture. Open to students from over 150 countries. International students typically enter on ESTA or a B-2 visa (no F-1/I-20, since the program is non-credit), with YYGS providing a visa-support letter.'
WHERE id = 'c3a98c43-dcfb-42cc-a23f-02a8a8154358' -- Yale Young Global Scholars
  AND left(description, 70) = 'Two-week non-credit summer academic program at Yale for rising high sc';

UPDATE opportunities SET description =
'A five-week residential pre-college research program in which current high school juniors conduct hands-on STEM research (astrophysics, biochemistry, bacterial genomics, or cell biology) on a partner university campus, working in teams of three under scientist and TA mentorship. International application deadline is around January 30 — confirm the exact date on the official application page.'
WHERE id = 'ae174625-5ad8-41b7-9c9a-7f00710c168a' -- Summer Science Program (SSP)
  AND left(description, 70) = 'A five-week residential pre-college research program in which current ';

UPDATE opportunities SET description =
'Andover Summer courses are open to students in grades seven through twelve (ages 12-17), with extensive course offerings across the Lower School Institute and the Upper School, held on the Phillips Academy campus. Summer Session 2026 runs June 30-August 2, 2026. Selective admission: a real application (3 essays, 2 recommendations, transcript, $75 fee). Pricing follows a four-rung ladder, not one price: Day $3,150 / $6,300, Boarding $11,000 / $11,350, depending on session length and track.'
WHERE id = 'c14ee166-0d7a-4c6c-8b78-f92b501dccbb' -- Andover Summer at Phillips Academy 2026
  AND left(description, 70) = 'Andover Summer courses are accessible to students, grade levels seven ';

UPDATE opportunities SET description =
'Ringling College''s PreCollege program is a four-week intensive summer program for young emerging artists, held on campus with on-campus housing. Students follow core classes for fundamental skill building plus immersions based on the college''s 13 degree programs, with access to a co-curricular workshop series and Ringling''s facilities. First-time students who complete the program receive three elective college credits. Application requires a completed form, a $50 application fee (non-refundable), and a recommendation. Program cost is approximately $4,650.'
WHERE id = 'fd51d7f8-1408-4d58-9558-47520758df3d' -- PreCollege at Ringling College of Art and Design
  AND left(description, 70) = 'Ringling College’s PreCollege program is a transformational experience'; -- curly apostrophe (U+2019) in source text, not straight -- confirmed via dry-run

UPDATE opportunities SET description =
'Fordham''s Summer Leaders Academy is an immersive pre-college program combining academic courses and college-application preparation on Fordham''s campus, with activities in New York City. Students select one course, meeting daily in one- and two-week sessions. On-campus housing is available. For 2026, three immersion sessions are offered: Immersion 1, June 22-26; Immersion 2, a 1-week (July 6-10) or 2-week (July 6-16) option; Immersion 3, a 1-week (July 20-24) or 2-week (July 20-30) option.'
WHERE id = '76a53c74-ea3a-4951-84af-a3e108a62d2c' -- Fordham University: New York, NY
  AND left(description, 70) = 'Fordham University: New York, NY | https://www.fordham.edu/undergradua';

UPDATE opportunities SET description =
'Entry is not direct — self-registration is not possible. Students compete through their national selection process; in Turkiye this runs through TUBITAK Bilim Olimpiyatları, TUBITAK being IOAI''s accredited organization for the country. Open to secondary-education students, generally under 20. Turkiye has been a founding country since IOAI''s first edition (2024, Burgas). Most recent edition: IOAI 2026, Astana, Kazakhstan, 2-8 August 2026; next host and dates not yet published.'
WHERE id = '65c6464b-b14a-4436-8633-e36681564da6' -- International Olympiad in Artificial Intelligence (IOAI)
  AND left(description, 70) = 'Entry is not direct -- self-registration is not possible. Compete in T';

UPDATE opportunities SET description =
'USC Summer Programs offers high school students a range of four-week summer courses across Architecture, Business, Engineering & Information Technology, Global Studies, Communication & Journalism, Performing Arts & Music, Pre-Health & Science, Pre-Law, and Writing & Critical Thinking, with the option to earn college credit; online courses are also available. Rolling admission, no fixed deadline. Selective: requires an essay, one recommendation letter, transcript, and an $85 non-refundable application fee, plus an English-proficiency requirement. Cost is $11,570 residential or $8,130 commuter (commuter excludes international students).'
WHERE id = '4a54159a-58dd-4304-a139-2b76f2a9fe38' -- USC Pre-College Summer Programs -- updated_at moved since original read despite identical length, see header note; this guard will correctly no-op if content actually changed
  AND left(description, 70) = 'University of Southern California (CA, USA) | USC Pre-College - USC Su';

UPDATE opportunities SET description =
'Entry is not direct — self-registration is not possible. One national team per country is selected by an in-country partner; Turkiye is listed among 190+ countries on FIRST Global''s team map (first.global/fgc/#teams). Teams consist of 3-5 students aged 14-18, plus one adult technical mentor/coach and one team organizer. The 2026 event is in Incheon, South Korea, 7-10 October, themed on wildfire-resilience robotics. Cost is not stated by the organizer; FIRST Global events historically involve real travel costs to the host country.'
WHERE id = 'f2d65f7a-0927-4ff7-bcf2-d5f12d6385d4' -- FIRST Global Challenge
  AND left(description, 70) = 'Entry is not direct -- self-registration is not possible. One national';

UPDATE opportunities SET description =
'Sevenoaks School offers three summer programmes for students aged 11-16: an academic enrichment Summer Programme (four ten-hour modules — Critical Thinking, Social Leadership, Creativity, and Digital Skills) and English Language and Music tracks designed by Sevenoaks'' specialist teachers. Cost (GBP): Summer Programme £5,940; English Language and Music tracks £4,675 each.'
WHERE id = 'a17202b1-b8da-4ed4-8cf7-ee0506d01653' -- Sevenoaks School Summer Program
  AND left(description, 70) = 'Sevenoaks School Summer Program | https://www.sevenoakssummerprogramme';

UPDATE opportunities SET description =
'Emory''s Pre-College Program is a noncredit, two-week summer program (residential for about 90% of students, with a commuter option) offering college-level coursework taught by Emory faculty from the College of Arts & Sciences, the Nursing School, and the Rollins School of Public Health. Classes average around 14 students, graded satisfactory/unsatisfactory, with homework that can run several hours a day; students choose from 30+ two-week courses. The program also runs ''College 101'' workshops, degree-exploration sessions, and ''Eagle Excursions'' around Atlanta. Distinct from Emory''s separate credit-bearing ''Summer College'' program. Open to students at least 15 by orientation, in 10th or 11th grade, with a minimum 3.0 GPA. Pricing is a ladder, not one number: Noncredit 2-week Residential $5,510 / Commuter $3,925; Noncredit 3-week Institute Residential $8,264 / Commuter $5,874; Noncredit 4-week Residential $11,020 / Commuter $7,850; Summer College (credit-bearing, 6-week) Commuter $6,485-$8,581 / Online $6,493-$8,589. Financial aid exists for U.S. citizens/permanent residents only; even for eligible students, full-tuition scholarships are not awarded.'
WHERE id = 'a71a7c76-1635-4fff-8027-f9b4fd865549' -- Emory Pre-College Program
  AND left(description, 70) = 'Emory''s Pre-College Program is a noncredit, two-week summer program (r';

UPDATE opportunities SET description =
'The Mathworks Honors Summer Math Camp (HSMC), run by Texas State University, is an intensive multi-summer program for high school students, developing talented students of all socioeconomic backgrounds through immersive, in-depth math experiences. Application requires a teacher recommendation, transcript, and essay. Program cost is $6,600.'
WHERE id = 'ccc1ff13-8673-4ba0-95fc-17050eee4306' -- Mathworks (Honors Summer Math Camp)
  AND left(description, 70) = 'Mathworks (Honors Summer Math Camp) | Texas State University - San Mar';

UPDATE opportunities SET description =
'A three-week pre-college programme at the University of Maryland, College Park, for students from rising 10th graders through graduating seniors. Students enroll in one three-credit UMD course of their choice and earn transferable college credit, either in person on the College Park campus or fully online. Roughly three hours of class Monday-Friday plus homework, projects, exams and possible labs/discussions. Tuition is charged at the University-approved in-state undergraduate per-credit rate plus mandatory fees; exact total not published. Cost: Online $1,420, Campus (residential) $1,791. Selective: scholarship applications are only available after program admission, implying a real, non-automatic admissions gate; separate Domestic/International applicant paths exist.'
WHERE id = '416cc004-5687-4e9f-913e-7be55e697b93' -- Terp Young Scholars
  AND left(description, 70) = 'A three-week pre-college programme at the University of Maryland, Coll';

UPDATE opportunities SET description =
'The John Locke Institute offers courses in Philosophy, Politics, Economics, History, Psychology and Law, designed to present students with new ideas. Entry is competitive: a two-part selection process (written application, then admissions interview). Locations and dates vary — Singapore, Dubai, Oxford, Princeton, China, in winter or summer; check the official website for current offerings. Acceptance rate is approximately 33%. Financial aid: scholarships in the GBP 800-2,000 range are available for students of unusually high ability or those who would add to the Institute''s community. Base tuition/course cost is not published.'
WHERE id = 'cf169cf4-a589-4743-a70f-e1efd28fbcd2' -- John Locke Institute (JLI) Courses
  AND left(description, 70) = 'The Institute provides educational courses – in Philosophy, Politics, ';

UPDATE opportunities SET description =
'Polygence offers personalized, mentored research experiences — students choose the subject, research question, and outcome of their project, with flexible start dates throughout the year. Polygence does not use a strict acceptance-rate model (no GPA or recommendation letters required), but a real screening step exists (application, possible interview), so it is not fully open enrollment. Cost starts from $495 (Pods) or $3,000 (Core), depending on program track. Financial aid is available on a need basis.'
WHERE id = '0337369f-bb69-47e5-aa82-d4a0e92a674b' -- Polygence
  AND left(description, 70) = 'Polygence | https://www.polygence.org/ | Polygence offers the most per';

UPDATE opportunities SET description =
'Downing College welcomes students from around the world for a Cambridge summer-school experience with small-group teaching led by University of Cambridge academics. The Specialist Programme, for ages 15-17, is a four-week course: two weeks online (fundamental skills) plus two weeks'' subject-specific residential study at Downing College. Cost is GBP 9,000 for the residential portion. Selection includes a short interview assessing English proficiency and motivation; students who meet the required standard receive an unconditional offer. Downing College offers five programme tracks in total; this covers the Specialist Programme specifically.'
WHERE id = 'a5cf4328-7bc1-4ad7-9de5-8bc8b7df9220' -- Downing College University of Cambridge - 2026
  AND left(description, 70) = 'Downing College welcomes ambitious students from around the world to e';

UPDATE opportunities SET description =
'XLAB International Science Camp, in Göttingen, Germany, is open to students at least 17 years old interested in natural sciences and hands-on research. Students pick three week-long courses from topics including Physics in Life Sciences, Laser Physics, Molecular Medicine, Neurobiology, Light and Matter, and Plastics: Production and Sustainability, performing experiments in small groups. Cost is EUR 3,900. Open enrollment; no formal selection process identified.'
WHERE id = '9f611eed-7787-4d26-b1a5-7c9cda0439aa' -- XLAB International Science Camp, Germany
  AND left(description, 70) = 'XLAB International Science Camp, Germany | https://xlab-goettingen.de/';

UPDATE opportunities SET description =
'The Wharton Pre-Baccalaureate Program is a rigorous online, credit-bearing opportunity for exceptional high school juniors and seniors to enroll in Wharton Business courses and receive a Penn transcript, combining live weekly class meetings with independent coursework. Admission is highly selective: GPA 3.5+, two essays, transcript, and one recommendation letter. Cost is $4,390 per course. A tuition waiver is available for Philadelphia residents.'
WHERE id = 'bbb81017-3570-4a13-8e82-e4bf612b3436' -- Pre-Baccalaureate Program (Wharton)
  AND left(description, 70) = 'Pre-Baccalaureate Program: | https://globalyouth.wharton.upenn.edu/pre';

UPDATE opportunities SET description =
'The International Environmental Olympiad (IEnvO) covers five learning areas spanning hard science (Atmosphere, Water, Land, Biodiversity) and policy (Human Activity: sustainable development, environmental policy, green technology). Open to students in grades 9-12, currently enrolled, graduating 2027 or later. An advisor must register the student; it is not self-registrable. The organizer reports 50+ countries and 10,000+ students participating, with the Global Grand Test scheduled across three continental time-zone blocks. Check the event''s own current-cycle page for exact dates each year, as the homepage is not always kept in sync.'
WHERE id = '2b0f2e8a-7bbc-48d5-b492-647972c42190' -- International Environmental Olympiad (IEnvO)
  AND left(description, 70) = '2026 cycle closed (Global Grand Test was 8 August 2026); 2027 dates no';

UPDATE opportunities SET description =
'In the Lumiere Research Scholar Program, students work one-on-one with a scholar or researcher from a top university to produce an independent research project over 12 weeks, resulting in a research paper usable for university admissions or future studies. Founded by a Harvard & Oxford PhD. Lumiere has a credit partnership with UC San Diego Extended Studies: students who complete a program are eligible for 3 post-baccalaureate credits and a digital transcript from UCSD. Admission requires an application and interview; no published acceptance rate. Cost varies by program; check current pricing directly with Lumiere.'
WHERE id = 'bc678344-c213-4ae8-a4f8-48af2856338f' -- Lumiere Education
  AND left(description, 70) = 'In the Lumiere Research Scholar Program, students work 1-1 with a scho';

UPDATE opportunities SET description =
'Dive Into Engineering offers USC pre-college courses including Video Game Development (guided by USC faculty through building and implementing content in commercial game engines) and Discover Engineering (hands-on projects previewing engineering as a college major). Admissions and cost follow USC''s general Pre-College Summer Programs process (selective; cost $11,570 residential). USC also offers a separate self-paced online course track for ages 14+.'
WHERE id = '16b3d6ae-dfcf-4ac7-b1c8-4a038e552bec' -- Dive Into Engineering!
  AND left(description, 70) = 'Create your own video game: VIDEO GAME DEVELOPMENT | Do you see a futu';

UPDATE opportunities SET description =
'Stanford Summer Humanities Institute is a non-credit program encouraging participants to explore Stanford''s humanities and social-science strengths — reading texts and ideas at a profound level, writing college-level papers, and communicating complex arguments. Application requires an application form, academic records, a work sample in the humanities or social sciences (completed as a school assignment within the past year), a teacher recommendation (English, history, or social science teacher), an optional video essay, and a $65 application fee. Selective: full committee review of application materials. Cost is $8,850.'
WHERE id = 'cb2e1b38-c154-4cc7-9186-bb1aa4e724a7' -- Stanford Summer Humanities Institute
  AND left(description, 70) = 'Stanford Summer Humanities Institute | Stanford Univeristy | https://s';

UPDATE opportunities SET description =
'Columbia University''s Programs for High School Students include the NYC Residential Summer Program, open to students who will be 16 or older by the program''s start and currently enrolled in grades 9-12 (or graduating seniors). Courses include Art and Architecture, Character Design for Animation and Gaming, Creating Original Theater, Digital Filmmaking, Drawing, Introduction to Architectural Design and Theory, Introduction to Art Appreciation, Music Appreciation, Painting, and Understanding Cinema, among others. Application requires one recommendation from a subject teacher and one from a school counselor. Cost is $12,838 per session.'
WHERE id = '17d177de-6ca7-4754-ab15-3a9dd93f4893' -- Columbia University: New York, NY
  AND left(description, 70) = 'Columbia University: New York, NY | Columbia University Programs for H';

UPDATE opportunities SET description =
'IE University''s Junior Advisory Board (JAB) invites students to participate in workshops, conferences, interactive sessions, and team-building projects led by IE faculty, centered on sustainable design and social impact. Participants contribute ideas and develop tools aimed at addressing environmental and social challenges. The program is free of charge.'
WHERE id = '5eff8569-58f3-48fd-89ba-a320725b6321' -- IE JAB (Junior Advisory Board)
  AND left(description, 70) = 'IE JAB (Junior Advisory Board) | https://www.ie.edu/university/ieu-exp';

UPDATE opportunities SET description =
'A two-week, faculty-taught summer camp on Bilkent University''s Ankara campus for students who will have completed grades 9-12 by June 2026. Students select courses (grouped by subject track, one course per group) taught by Bilkent faculty, plus cultural, social, and sporting activities; an optional two-person dormitory stay is available. 2026 session: July 13-24, 2026. Fee is TRY 68,000 with accommodation or TRY 61,000 without (both including tuition, activities, and lunch), with a 10% sibling discount. No scholarships are offered. Instruction is in Turkish and/or English depending on the course.'
WHERE id = '96557dbb-7c60-4097-9925-35cbd5ad9a57' -- Bilkent University Summer Camp (Yaz Kampı)
  AND left(description, 70) = 'A two-week, faculty-taught summer camp on Bilkent University''s Ankara ';

UPDATE opportunities SET description =
'A fully online, two-week summer business program for high school students in grades 9-12 worldwide, run by the Wharton Global Youth Program. Each session pairs live daily instruction from Wharton faculty (two time-block options for global time zones) with independent work, small-group collaborative projects, and real-time business simulations covering innovation, design thinking, market research, scenario planning, and leadership communication. Culminates in a capstone project; participants who complete requirements earn a Wharton Global Youth Certificate of Completion, a digital badge, and access to the Wharton Youth Network alumni community. Selective: real application and admission process.'
WHERE id = '99acaf0b-1b1f-4fc1-bb34-69a729a01d0f' -- Wharton Global Youth Program: Future of the Business World (FBW)
  AND left(description, 70) = 'A fully online, two-week summer business program for high school stude';

UPDATE opportunities SET description =
'Engineering Summer Academy at Penn (ESAP) is open to students in grades 9-12. Programs include Artificial Intelligence, Biotechnology, Complex Networks, Computer Graphics, Computer Science, Nanotechnology, and Robotics. Selective: requires an essay, official transcript, one recommendation from a STEM teacher, and a $90 non-refundable application fee (standardized test scores optional). Program cost is $9,250.'
WHERE id = '0009f66d-9231-4dbd-938f-9eb1c9319309' -- University of Pennsylvania (PA, USA) — ESAP
  AND left(description, 70) = 'University of Pennsylvania (PA, USA) | Engineering Summer Academy at P';

UPDATE opportunities SET description =
'AI Scholars uses a holistic application review process, selecting participants based on a combination of factors rather than automatic admission. Cost is $0 (fully funded). Open only to US citizens and green card holders.'
WHERE id = '3f7170ba-9486-40b0-b450-42462471e88d' -- AI Scholars (original text was fragmentary/broken; full rewrite from verified facts; short guard below, its own text hits a real \n\n at char 57)
  AND left(description, 40) = 'CS Scholars: | General application info '; -- note trailing space, confirmed via dry-run against live text

UPDATE opportunities SET description =
'Pioneer Academics is an online, accredited research program in which high school students in grades 9-12 work one-on-one with university professors to design and complete an original, undergraduate-level research paper, earning 4 college credits through Oberlin College. Pioneer''s review process is described as "professor-blind" — evaluators do not see identifying applicant information during initial review.'
WHERE id = 'bdc4bdb5-5893-4e05-bf9c-e520d7da2817' -- Pioneer Research Institute
  AND left(description, 70) = 'An online, fully accredited research program in which high school stud';

UPDATE opportunities SET description =
'Global Achievers Academy is an English-language summer camp for young learners, run by EC Young Learners across sites including Boston, London, Singapore, and Cape Town. Registration-only enrollment (no selection process); requires a B2 English level. Cost information is not currently available from the organizer.'
WHERE id = 'df90d914-6d20-44f2-ae29-d195f629540a' -- Global Achievers Academy
  AND left(description, 70) = 'English-language summer camp programme for young learners, run by EC Y';

UPDATE opportunities SET description =
'The University of Edinburgh''s Pre-University Summer School is a non-credit-bearing, two-week program in Social Sciences, Humanities and Foundation Design. The 2026 session runs 29 June-10 July 2026, for students in their penultimate or final year of high school (ages 16-18), with an overall IELTS requirement of 6.5 (or equivalent). Application deadline: 19 May 2026.'
WHERE id = 'dc762fce-b83a-4217-a610-290ac2f65f17' -- University of Edinburgh Pre-University Summer School 2026
  AND left(description, 70) = 'Edinburgh Summer School 2024 | Non-credit bearing, 2 weeks program on ';

UPDATE opportunities SET description =
'PTY runs two flagship precollege summer programs on the Vanderbilt campus in Nashville. Vanderbilt Summer Institutes (VSI) is a two-week residential program for high school juniors and seniors covering accelerated, college-level topics (e.g. nanotechnology, biomedical ethics, philosophy), with roughly six hours of academic work daily, housed in first-year residence halls. Vanderbilt Summer Academy (VSA) is a shorter, five-day/five-night residential program open to grades 7-12. Domestic students may qualify for need-based financial assistance and monthly payment plans; PTY states it is unable to offer financial assistance to international students. Selective admission. Cost is $5,750.'
WHERE id = 'b23c2cf0-3c44-40f8-8b0b-67315a066c9f' -- Vanderbilt Programs for Talented Youth (PTY)
  AND left(description, 70) = 'PTY runs two flagship precollege summer offerings on the Vanderbilt ca';

UPDATE opportunities SET description =
'Live virtual classes on stock market fundamentals and investing for grades 9-12, run across five weekly sessions through Summer 2026, with morning, afternoon, and international time-zone options each week. A bundled 2-week program plus 8-week investing competition costs $100; standalone course pricing is not stated. Open enrollment; no selection process.'
WHERE id = '574ab33a-abc7-420e-893a-0b3b6f9d341e' -- Wall Street 101 - Virtual Wall Street Classes
  AND left(description, 70) = 'Live virtual classes on stock market fundamentals and investing for gr';

COMMIT;

-- NOT rewritten — flagged for a founder status/dedup decision instead, since the row itself
-- should likely be retired rather than kept with a cleaned description. Both duplicate claims
-- independently CONFIRMED below (re-checked against the id each one names, 2026-09-02) —
-- official_url matches exactly, and both rows in each pair are currently status='active'
-- simultaneously, meaning both programs really can show twice in a student's results right now:
--
--   e03e1172-cc32-4c92-8eff-668cd6ea6fe7  Summer High School Programs - at BU
--     duplicate of  4b9f3125-d8a7-4623-8c61-f4714063d152  "Boston University Summer Term —
--     High School Programs" -- both official_url = bu.edu/summer/high-school-programs/, both
--     status=active. Recommend retiring e03e1172 (the contaminated row) via the status column.
--
--   07504254-9004-4983-b149-4f783a1c32b8  School of the Art Institute of Chicago (SAIC)
--     duplicate of  e9c4cd39-b514-4975-b010-1c627d7231c8  "Early College Program (ECP) Courses
--     for High School Students (Ages 14-18)" -- both official_url = saic.edu/high-school-programs,
--     both status=active. Recommend retiring 07504254 (the contaminated row) via the status column.
--
-- Not included as UPDATEs here since a status/retirement change is a different, founder-level
-- decision from a description cleanup -- deliberately not bundled into the same statement.
--
-- FINAL STATUS: 37 of 421 opportunities confirmed contaminated by this specific defect (research-
-- session notes appended to description); 35 cleaned above, 2 held out as dedup flags. Verified
-- complete via two independent full-table sweeps beyond the original 49-row candidate pool, both
-- returning zero further matches -- see header. This defect is fully accounted for. The two
-- other patterns surfaced during closeout (truncation, raw-pipe formatting) are already known,
-- already escalated in docs/known-issues.md -- not new, not included in this count, not fixed here.
