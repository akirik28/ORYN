-- DRY RUN ONLY -- data-quality remediation UPDATE batch, NOT executed against production.
-- 35 rows: fills previously-NULL country and/or deadline from official
-- sources, plus a cycle_status/current_cycle_label refinement using the same evidence.
-- Only ever sets a column that was NULL in the live row -- never overwrites an existing value.
BEGIN;
-- 120 Hours (competition) -- PARTIAL
UPDATE opportunities SET country = 'Norway', cycle_status = 'closed', current_cycle_label = '120 Hours 2026 deadline was March 14, 2026, 14:00 CET (already passed); 2027 dates not yet posted as of Aug 2026' WHERE id = '345f64dd-f6f4-4f29-9341-75743c39a7d1';
-- Baltic Sea Philosophy Essay Event (BSPEE) (competition) -- PARTIAL
UPDATE opportunities SET country = 'Finland', cycle_status = 'date_not_announced', current_cycle_label = '2025 cycle: essay topics ordered from FETO by Sept 25, papers due Oct 18, winners announced Nov 20, 2025 (all already past). No 2026 cycle invitation found yet as of Aug 21, 2026.' WHERE id = '7d573141-bca6-459d-a206-43aebae178c4';
-- Blue Ocean Competition (competition) -- FOUND
UPDATE opportunities SET country = 'United States', deadline = '2027-02-21'::date, cycle_status = 'upcoming', current_cycle_label = 'Blue Ocean Student Entrepreneur Competition 2027 cycle; pitch submissions due Feb 21, 2027, with Top 100/30/10 and final results announced through May 13, 2027.' WHERE id = 'cb4a1030-d035-4c1f-8579-37c458a88b0e';
-- Breakthrough Junior Challenge (competition) -- FOUND
UPDATE opportunities SET country = 'United States', cycle_status = 'upcoming', current_cycle_label = 'Deadline value was already present in input (2026-09-15); not re-verified since already non-null per instructions, and it is still upcoming relative to today.' WHERE id = '0412d94f-8b28-4f37-933c-cf6198914c12';
-- Conrad Challenge (Space Center Houston) (competition) -- FOUND
UPDATE opportunities SET country = 'United States', cycle_status = 'upcoming', current_cycle_label = 'Deadline value was already present in input (2026-10-29); not re-verified since already non-null per instructions.' WHERE id = '1f7b2e52-1900-4953-8271-63224c9e1fc0';
-- CyberPatriot - National Youth Cyber Defense Competition (competition) -- FOUND
UPDATE opportunities SET country = 'United States', cycle_status = 'upcoming', current_cycle_label = 'Deadline value was already present in input (2026-10-01); not re-verified since already non-null per instructions.' WHERE id = '4b9e2c29-c38d-479b-9987-c31501601950';
-- DNA Day Essay Contest (competition) -- FOUND
UPDATE opportunities SET country = 'United States', cycle_status = 'historical', current_cycle_label = 'Deadline value was already present in input (2026-03-08); per instructions not re-researched since already non-null. Note: this date has already passed relative to today (2026-08-21), so it reflects a prior/completed cycle rather than an open one; a future cycle''s deadline was not verified (out of scope for this row).' WHERE id = 'd3dc512f-ed1e-43f6-a85b-294a599df0da';
-- FIRST Robotics Competition (competition) -- FOUND
UPDATE opportunities SET deadline = '2026-11-17'::date, cycle_status = 'upcoming', current_cycle_label = '2026-2027 FRC season: kickoff-kit location selection/shipment window runs Sept 24, 2026 (noon ET) through Nov 17, 2026 (noon ET); season kickoff and BIOCORE game reveal is January 9, 2027.' WHERE id = 'db25d327-ee37-4414-9003-f5654f64d3aa';
-- International Philosophy Olympiad (IPO) (competition) -- PARTIAL
UPDATE opportunities SET country = 'Bulgaria', cycle_status = 'date_not_announced', current_cycle_label = 'IPO 2026 (34th edition) was held in Warsaw, Poland and already concluded (~May 2026). No host country or dates for a 2027 edition were found.' WHERE id = '838a79c1-151c-4aef-9622-42db328debb4';
-- International Public Policy Forum (IPPF) (competition) -- FOUND
UPDATE opportunities SET country = 'United States', deadline = '2026-10-13'::date, cycle_status = 'upcoming', current_cycle_label = '2026-27 IPPF cycle is open; qualifying round essays due October 13, 2026.' WHERE id = 'bc303473-ba94-41e4-9b3d-038804858a8c';
-- International Young Physicists' Tournament (IYPT) (competition) -- PARTIAL
UPDATE opportunities SET country = 'Switzerland', cycle_status = 'upcoming', current_cycle_label = '40th IYPT will be held in Auckland, New Zealand, July 5-12, 2027 (host country rotates annually; Switzerland is the association''s fixed legal seat, not the host). No registration deadline date was found on the official site.' WHERE id = 'b41bf5f5-d2cb-4f5d-84e5-8d9e8630af07';
-- JLI Global Essay Competition (competition) -- FOUND
UPDATE opportunities SET country = 'United Kingdom', cycle_status = 'closed', current_cycle_label = '2026 Global Essay Prize: regular deadline 31 May 2026 (already passed as of 2026-08-21); extended late deadlines to 7/21 June 2026 also passed. No 2027 cycle info on page yet.' WHERE id = '104c940f-f3fa-46c9-9e52-2abf69e360d4';
-- NFTE Youth Entrepreneurship Showcase Series (competition) -- PARTIAL
UPDATE opportunities SET country = 'United States', cycle_status = 'upcoming', current_cycle_label = '2026 Youth Entrepreneurship Showcase Series: regional showcases held through spring 2026 (mostly already passed), U.S. National Challenge Finals Nov 18 2026, World Finals Nov 19 2026. No single student application deadline found; progression is via regional NFTE program participation.' WHERE id = '718cc3c4-2165-49c2-9716-e1be2a0be482';
-- STEM Racing (competition) -- PARTIAL
UPDATE opportunities SET country = 'United Kingdom', cycle_status = 'unverified', current_cycle_label = 'STEM Racing is the schools-competition brand of the Greenpower Education Trust, a UK charity (East Sussex). Registration windows vary by country/National Coordinator; the UK STEM Racing 2025/26 season had Regional Finals from Nov 2025 and a UK National Final ~March 2026. No 2026/27 season deadline confirmed yet.' WHERE id = 'c12ce265-c6c4-454b-97f5-680d366813ec';
-- Technovation Girls (competition) -- PARTIAL
UPDATE opportunities SET country = 'United States', cycle_status = 'date_not_announced', current_cycle_label = '2025-2026 season registration ran Aug 13, 2025-Mar 18, 2026 (already closed). 2026-2027 season registration has not yet opened; site only offers a notification sign-up, with no announced dates as of fetch.' WHERE id = '35ddfc5e-1bed-4f28-9655-a1aa3422e554';
-- The Concord Review - Emerson Prize (competition) -- FOUND
UPDATE opportunities SET country = 'United States', cycle_status = 'upcoming', current_cycle_label = 'Emerson Prize deadline retained from existing record (Nov 1, 2026, which is upcoming relative to today). tcr.org homepage content fetched this pass did not itself re-state the deadline; only headquarters location was newly confirmed.' WHERE id = '93d45f34-4078-4d15-be6f-d6e157a21943';
-- The Diamond Challenge (competition) -- FOUND
UPDATE opportunities SET country = 'United States', cycle_status = 'upcoming', current_cycle_label = '2027 Diamond Challenge: Submission Deadline January 14, 2027, 5PM EST (independently reconfirmed on official page; matches existing record).' WHERE id = '30a605ab-8c51-4f06-9e66-60cc7347c5df';
-- The Earth Prize Competition (competition) -- PARTIAL
UPDATE opportunities SET country = 'Switzerland', cycle_status = 'open', current_cycle_label = 'The Earth Prize 2027 registrations are open per official site (''The Earth Prize 2027 registrations are open here!''); no specific closing/submission deadline date has been published yet.' WHERE id = '00aaf965-016f-42ef-a4a1-3a825f104a6d';
-- Upenn Wharton Hack-AI-thon (competition) -- FOUND
UPDATE opportunities SET country = 'United States', deadline = '2027-04-01'::date, cycle_status = 'upcoming', current_cycle_label = '2027 Wharton Hack-AI-thon: Registration opens Feb 2027, closes March 2027; Virtual Kick-Off/Prompt Release March 29 2027; Submissions due & finalists announced April 1 2027; in-person Finals April 2 2027.' WHERE id = '724a375c-fa54-439c-b8d2-c86869fed88d';
-- USA Computing Olympiad (USACO) (competition) -- PARTIAL
UPDATE opportunities SET country = 'United States', cycle_status = 'date_not_announced', current_cycle_label = '2025-2026 season contests already completed (final round: proctored US Open, March 28, 2026). 2026-2027 season exact contest dates not yet officially published; historical pattern suggests December/January/February online rounds plus a March/April US Open.' WHERE id = '36fb08db-6f39-4d38-8094-1e37ac102917';
-- Wharton Data Science Competition (competition) -- PARTIAL
UPDATE opportunities SET country = 'United States', cycle_status = 'date_not_announced', current_cycle_label = 'Registration for the 2026 Wharton High School Data Competition (presented by Google Gemini) is closed. No 2027 dates announced; interested students are directed to join an interest list.' WHERE id = 'cfb32772-6259-4e3a-9ead-bc289b463d08';
-- World Scholar's Cup (competition) -- PARTIAL
UPDATE opportunities SET country = 'United States', cycle_status = 'open', current_cycle_label = '2026-27 season in progress: Bangkok Global Round Aug 28-Sep 2 2026; Dubai Mini Global Round Sept 5-8 2026 (both upcoming relative to today). Per-round registration deadlines are not shown on the homepage; a separate calendar/registration page exists but was not fetched.' WHERE id = '89fa66fc-c7cf-4fa6-8b28-1a016e860484';
-- World Wildlife Day International Youth Art Contest (competition) -- PARTIAL
UPDATE opportunities SET country = 'United States', cycle_status = 'closed', current_cycle_label = '2026 contest closed; submission deadline was 1 February 2026 (already passed as of today). Winners were presented at the World Wildlife Day event on 3 March 2026. Next (2027) cycle not yet announced as of fetch.' WHERE id = '13d9416e-d2a7-4f55-b851-7d76acab2cb3';
-- American Journal of Student Research (AJSR) (research) -- PARTIAL
UPDATE opportunities SET country = 'United States', cycle_status = 'unverified' WHERE id = '19ebc71c-1997-41aa-aeb1-728ec5be176c';
-- International Journal of High School Research (IJHSR) (research) -- FOUND
UPDATE opportunities SET country = 'United States', cycle_status = 'open', current_cycle_label = 'Rolling submissions, monthly publication, no fixed deadline' WHERE id = '61558e02-0b11-4221-bbbb-fc98bc765da8';
-- Journal of Research High School (JRHS) (research) -- FOUND
UPDATE opportunities SET country = 'United States', cycle_status = 'open', current_cycle_label = 'Rolling submissions, no fixed deadline' WHERE id = '51ea0b34-7396-4a4b-89e7-fd4b776b79fa';
-- InvestIN - Immersive Career Experiences (internship) -- FOUND
UPDATE opportunities SET country = 'United Kingdom', cycle_status = 'open', current_cycle_label = 'Rolling registration; no formal application deadline by design' WHERE id = '8a7c89e4-e63a-4f64-a76d-4bae1b31e889';
-- MathILy-Er (summer_program) -- FOUND
UPDATE opportunities SET country = 'United States', cycle_status = 'closed', current_cycle_label = 'Program run by Mathematical Staircase, Inc. at Haverford College, PA. 2026 program ran Jun 28-Aug 1, 2026 with a priority deadline of Apr 28, 2026 (passed); 2027 not yet announced' WHERE id = '7bc45aeb-e1fa-429e-a1ba-05959ec3fc6c';
-- Oxbridge Academic Programs (summer_program) -- PARTIAL
UPDATE opportunities SET country = 'United States', cycle_status = 'date_not_announced', current_cycle_label = '2027 program information not yet published' WHERE id = 'd49e827f-c66b-4112-8161-92209a6545ae';
-- Telluride Association Summer Seminar (TASS) (summer_program) -- PARTIAL
UPDATE opportunities SET country = 'United States', cycle_status = 'closed', current_cycle_label = 'TASS 2026 application window was October 15-December 3, 2025 (already passed, and the program itself has likely concluded this summer); 2027 cycle not yet announced on the fetched page' WHERE id = '69b63aaa-2a5d-40d8-940c-b2dcbd2fbf1c';
-- University of Notre Dame Pre-College: Summer Scholars (summer_program) -- FOUND
UPDATE opportunities SET deadline = '2027-02-17'::date, cycle_status = 'upcoming', current_cycle_label = 'Summer Scholars 2027 cycle; standardized test scores also due Feb 28, 2027' WHERE id = '445f2003-1b9c-4cc9-bc63-22e65e7d8f85';
-- TechGirls (fellowship) -- PARTIAL
UPDATE opportunities SET country = 'United States', cycle_status = 'date_not_announced', current_cycle_label = '2026 cycle closed (deadline was Jan 20, 2026, noon ET); 2027 cycle not yet announced' WHERE id = '7081b03a-3e04-4843-8bc5-0078cfd040f2';
-- Coursera (online_program) -- PARTIAL
UPDATE opportunities SET country = 'United States', cycle_status = 'open', current_cycle_label = 'Rolling enrollment; individual courses have no fixed application deadline (online course marketplace)' WHERE id = '6c9d8973-1e81-45e5-b71b-fc6ad35fb274';
-- Inspirit AI Scholars Live Online (online_program) -- FOUND
UPDATE opportunities SET deadline = '2026-09-01'::date, cycle_status = 'upcoming', current_cycle_label = 'Fall 2026 cohort deadline; Winter 2026 cohort deadline is Oct 1, 2026 (rolling admission, limited seats)' WHERE id = 'bfd946b6-8cfb-4b2b-91b3-fd5523c7551b';
-- UNO - United Nations Online (online_program) -- PARTIAL
UPDATE opportunities SET country = 'United States', cycle_status = 'open', current_cycle_label = 'Rolling admission; deadlines vary by cohort, no single fixed date published (Early Bird discount mentioned but undated)' WHERE id = '31856863-be50-440d-8ccc-229812277425';

-- Not committed. ROLLBACK if ever run experimentally.
ROLLBACK;
