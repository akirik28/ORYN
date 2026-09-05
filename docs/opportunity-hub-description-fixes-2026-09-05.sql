-- Hub-row description/title fixes + the Wharton duplicate retirement + one new stale-date
-- fix found while scanning for others, per CEO's explicit ask. NOT applied -- prepared for
-- CEO to review and package, same standing rule as every other file from today.
--
-- Priority order matches CEO's own: (a) misleading descriptions first (misinformation), then
-- (b) honest-but-vague titles (cheap clarity), then (c) the already-verified duplicate.

begin;

-- ============================================================================
-- (a) Three misleading descriptions -- each currently reads as ONE specific
-- sub-program's real facts, when the row represents 6-8 different programs.
-- No invented specifics below beyond what today's own research already verified.
-- ============================================================================

-- Brown: also fixes the stale-date-as-requirement bug CEO flagged directly
-- ("by June 16, 2024" was presented as a live cutoff with no disclaimer).
update opportunities
set description = 'Brown University''s pre-college hub lists multiple distinct programs for high school students, each with its own eligibility, dates, and cost -- among them Summer @ Brown, Brown Pre-College Online, BEE, BELL, the Leadership Institute, STEM for Rising 9th/10th Graders, the Pre-Baccalaureate Program, and Course-Based Research Experiences. This entry represents the hub, not one specific program -- check precollege.brown.edu/programs for which program fits and its own current eligibility and dates.',
    updated_at = now()
where id = 'c2444f7f-e137-411d-9a14-c1ba8052e217';

update opportunities
set description = 'American University''s precollege hub lists multiple distinct summer programs for high school students, each with its own eligibility and dates -- among them Community of Scholars, High School Summer Scholars, Discover the World of Communication, and the Summer Civics Institute. This entry represents the hub, not one specific program -- check american.edu/summer/precollege for which program fits and its own current eligibility and dates.',
    updated_at = now()
where id = 'c4e113c2-6e64-40d0-8251-0031ca86c64a';

update opportunities
set description = 'Cornell''s Precollege Studies hub lists several distinct summer/winter tracks for high school students, each with its own age range and format -- online (ages 15-19), on-campus commuter (16-19), and residential (16-18), plus a separate path for students who will have already graduated high school (under 18). All tracks require having completed at least grade 10 (or the international equivalent). This entry represents the hub, not one specific track -- check sce.cornell.edu/audience/precollege-studies for which track fits and its own current eligibility and dates.',
    updated_at = now()
where id = '9caff85d-6976-422e-8fa1-6893eaefa54c';

-- ============================================================================
-- (b) Six titles -- descriptions already read as honest/general, titles didn't
-- signal it. Cheap, no new facts asserted beyond what the existing description
-- (or, for UCSB/Northwestern, today's own verified research) already states.
-- ============================================================================

update opportunities set title = 'UC Santa Barbara Pre-College (RMP & SRA, two programs)', updated_at = now()
where id = 'ce7d618b-debf-4508-87e1-f6905540bf8d';

update opportunities set title = 'Northwestern CTD (multiple programs, ages 4-grade 12)', updated_at = now()
where id = 'af30653c-94d1-4ce2-8781-b60e659d48ef';

update opportunities set title = 'Oxbridge Academic Programs (multiple locations & programs)', updated_at = now()
where id = 'd49e827f-c66b-4112-8161-92209a6545ae';

update opportunities set title = 'Institute of Competition Sciences (hosts multiple competitions)', updated_at = now()
where id = 'f493d81f-1f4f-43dd-b0d7-ab6d72eef1d9';

update opportunities set title = 'Wharton Global Youth Program (multiple programs)', updated_at = now()
where id = 'fad2bef3-80e8-4b7e-a4a5-f7021f34767f';

update opportunities set title = 'UChicago Pre-College (multiple programs: Immersion, Stones & Bones, Summer Bridge, Summer College)', updated_at = now()
where id = '9f1b802e-cbc1-4af2-98f1-ffddfa06140b';

-- ============================================================================
-- New: a second real instance of the stale-date-as-requirement bug, found
-- scanning the full catalog for "by/before/deadline/due + past year" patterns
-- next to a real deadline shape (not just any year mention -- most of the 62
-- rows containing a 2019-2025 year turned out to be founding years or past-
-- success mentions, not deadline framing; narrowed to 3 real candidates,
-- checked each one's actual sentence).
--
-- Rockefeller SSRP (2bbea7da-09bb-4eca-b46b-c3b5363e3b92) ALSO has 2024 dates
-- but already handles them correctly -- "The source material's dates (...)
-- are from a past cycle -- check the official page for the current year's
-- schedule." That's the existing, established pattern this fix matches.
-- Phillips Exeter had the same 2024 dates with NO such disclaimer -- presented
-- as live. No new dates invented; same honest-disclaimer treatment as
-- Rockefeller's own row, not a guess at 2026/2027 dates I haven't verified.
-- ============================================================================

update opportunities
set description = 'Phillips Exeter Academy''s Exeter Summer program (Access Exeter for students who have completed grades 7-8, Upper School tracks for older students) runs 5 weeks with academic-cluster/course choices via two program catalogs. The source material''s dates (July 6-August 8, 2024; age cutoff September 1, 2024; application deadline May 1) are from a past cycle -- check exeter.edu/admissions for the current year''s schedule and deadlines.',
    updated_at = now()
where id = 'f069afec-005f-43a8-82f2-6869785ad6f1';

-- ============================================================================
-- (c) Wharton duplicate retirement -- already verified and proposed in
-- docs/opportunity-hub-rows-and-followups-2026-09-05.md, repeated here so
-- this file is the single complete package for today's three follow-ups.
-- ============================================================================

update opportunities
set status = 'disabled',
    updated_at = now()
where id = 'c35f002c-a4b2-4965-b07f-ba775eb0e31e'
  and status = 'active';

commit;

-- Re-run safety: every UPDATE above sets hardcoded literal values (title/description/status),
-- no dynamic values, no unique constraint at risk -- a second run produces the identical row
-- either way, same reasoning docs/opportunity-duplicate-consolidation-2026-09-04.sql's own
-- closing note gives for its own literal-value UPDATEs. The retirement UPDATE keeps its
-- status='active' guard for the same reason that file's retirements do -- not re-run safety
-- (there's nothing to violate), but so a second run doesn't silently re-assert 'disabled' over
-- a row someone has since reactivated by hand.
