-- Description/organization mismatch sweep — staged cleanup
-- 2026-09-03, oryn-bd, branch docs/description-org-mismatch-sweep-2026-09-03
--
-- STAGED ONLY. Not applied. Founder review required before running against the live DB
-- (qtcvcflzxbuagvvwahhu) — every write to this data is founder-gated per standing rule,
-- same as data/research/opportunities/description_contamination_cleanup_2026-09-02.sql.
--
-- ============================================================================================
-- BRIEF THIS ANSWERS
-- ============================================================================================
-- CEO (oryn-a7) assigned this after 6e's organization-fill pass found ~1-in-5 of 84 records
-- had a prestige-brand-vs-real-operator mismatch in the structured `organization` field
-- (ISSOS marketed under St Andrews/Cambridge/Yale but privately run; "Greenwich Olympiad"
-- with no Greenwich involvement; "UNAT" not the UN). Split: 6e owns `organization` and
-- `cycle_status`; this pass owns `description` — sweep prose for the SAME class of defect
-- (a description naming an organization that contradicts the record's real identity), fix
-- what's in-lane, flag what isn't.
--
-- ============================================================================================
-- METHOD
-- ============================================================================================
-- 216 of 282 active opportunities have organization filled. A word-boundary regex sweep for
-- ~35 well-known university/UN/Turkish-institution names, checked against organization NOT
-- containing that same name, returned ~24 hits -- almost all false positives on inspection
-- (same-entity abbreviations like "Caltech" vs "California Institute of Technology"; city/
-- neighborhood name collisions like "Cambridge, MA" and "Greenwich Village"; and legitimate,
-- already-accurate venue/partner mentions like Immerse Education's "held at Cambridge, Oxford
-- and London" -- true, since Immerse is the real operator and never claims otherwise). Zero
-- of those 24 were real description-side contradictions against a correctly-filled
-- organization. One (Marshall Society, flagged below, not fixed here) turned out to be the
-- INVERSE: description already correct, organization field is the one that's wrong.
--
-- A second, narrower sweep for the literal cross-institution-splice shape -- unrelated
-- program text concatenated into one description, the "student reads the sentence" case the
-- CEO's brief specifically warned about -- targeted the 35 active records whose description
-- still has the old raw pipe-delimited scrape format (regex '\|.*\|.*\|', never rewritten
-- into prose). That is where the real, fixable finds were: 4 records below.
--
-- All 4 were cross-checked against the existing 2026-09-02 organization-research files
-- first, since three of the four had already been independently identified and correctly
-- resolved there -- this pass only had to close the gap those files explicitly left open
-- (organization fixed or staged; description contamination never addressed by anyone).
--
-- Each UPDATE is guarded by the row's exact current `description` value, not a prefix, since
-- these are medium-length fields and a full match leaves zero ambiguity about what's being
-- overwritten. A CORRECT run prints `UPDATE 1` four times. `UPDATE 0` on any statement means
-- that row's description changed since 2026-09-03 -- stop, don't force it, re-derive fresh.
--
-- ============================================================================================

BEGIN;

-- 1. 'Pre-College Program' (id 3c4cbeb7-b625-45d0-a0b9-f34df979a3d8)
-- official_url is events.ie.edu -- IE University's own Madrid/Segovia pre-college page.
-- organization_research_verified_leads_2026-09-02.sql already confirmed this and staged
-- organization = 'IE University' (not yet applied). But nobody touched description: it ends
-- with a verbatim fragment from an unrelated Koç University program ("Pre-College Program |
-- Koç University | Finansal Muhasebe, İnsan Hakları, Siyaset Bilimine Giriş" -- Financial
-- Accounting, Human Rights, Intro to Political Science). Koç does run its own genuine research
-- program elsewhere in the catalog (id 2116709f, KUSRP) -- this fragment isn't that record's
-- own content going missing, just contamination that leaked into this one. Once organization
-- lands as 'IE University', an unfixed description naming Koç University would be exactly the
-- "right field, wrong sentence" case the brief warned is worse than a null. Truncated to the
-- IE-only content; nothing added, nothing about IE's own program touched.
UPDATE opportunities
SET description = 'Pre-College Summer Program | Applications open in November 2025 | Global Humanities and Critical Thinking | Good Design is Good Business | Innovation and Technology | International Finance | Marketing and Communication | International Business Law | World Politics and International Development | Entrepreneurship | Age group: 16-17 year-olds | The tuition fee of 4800€ covers the academic agenda and full-board accommodation. | Location: Madrid and Segovia | Dates: 1.intake: June 23rd - July 5th, 2.intake: June 30th - July 12th, 3.intake July 14th - July 26th 2026 | Please check the website for dates and info.'
WHERE id = '3c4cbeb7-b625-45d0-a0b9-f34df979a3d8'
  AND description = 'Pre-College Summer Program | Applications open in November 2025 | Global Humanities and Critical Thinking | Good Design is Good Business | Innovation and Technology | International Finance | Marketing and Communication | International Business Law | World Politics and International Development | Entrepreneurship | Age group: 16-17 year-olds | The tuition fee of 4800€ covers the academic agenda and full-board accommodation. | Location: Madrid and Segovia | Dates: 1.intake: June 23rd - July 5th, 2.intake: June 30th - July 12th, 3.intake July 14th - July 26th 2026 | Please check the website for dates and info. | Pre-College Program | Koç University | Finansal Muhasebe, İnsan Hakları, Siyaset Bilimine Giriş';

-- 2. 'Trinity College London, Ireland' (id f8fc69c2-e48f-48d1-9a5f-6323a7c10e34)
-- official_url is tcd.ie -- Trinity College Dublin. organization_research_verified_leads_
-- 2026-09-02.sql already confirmed this and staged organization = 'Trinity College Dublin'
-- (not yet applied), and its own note already flagged the title's "London" as wrong ("the
-- title itself may be worth a separate correction, outside this task's organization-only
-- scope") -- that title fix still hasn't landed anywhere as of this pass and isn't staged
-- here either (title is neither this task's lane nor 6e's; flagged in the companion doc so
-- it doesn't fall through a second time). What WAS in this task's lane: description splices
-- in a full paragraph of unrelated University of Amsterdam / UvA Summer School content after
-- the genuine Trinity Walton Club STEM-club text. Truncated to the Trinity-only content.
UPDATE opportunities
SET description = 'Trinity Walton Club Saturday STEM: July | For more information: | *Please see the websites for detailed information and requirements.'
WHERE id = 'f8fc69c2-e48f-48d1-9a5f-6323a7c10e34'
  AND description = 'Trinity Walton Club Saturday STEM: July | For more information: | *Please see the websites for detailed information and requirements. | University of Amsterdam: Amsterdam, Netherlands | UvA Summer School | Many of this year’s Summer School programmes offer students the unique chance to get to know Amsterdam from an academic perspective. International and local students can follow high-quality summer programmes that investigate thematic topics within the context of Amsterdam’s society, culture, architecture and infrastructure. More than 600 students from all over the world take part in our 27 English-taught summer courses each year. The courses take place from June to August and are between 1 and 4 weeks long. | Pre-University Honor programmes: | -Busi…';

-- 3. 'The Summer School of the Polytechnic University of Milan (POLIMI) 2026'
-- (id 8e5c10af-aebb-449c-9811-fed9dcc14039)
-- official_url is techcamp.polimi.it. organization_backfill_2026-09-02.sql already staged
-- organization = 'Politecnico di Milano' (not yet applied). Description's tail names two
-- unrelated institutions -- Modul University Vienna and the University of Sussex -- that
-- have nothing to do with POLIMI's own TECHCAMP; reads as scrape contamination from other
-- programs' pages, same shape as the IE/Trinity cases above. Truncated to the POLIMI-only
-- content (kept "Program details: (including Race car dynamics and cybersecurity and
-- hacking)" since that reads as elaborating POLIMI's own STEM course list, not a splice).
UPDATE opportunities
SET description = 'Aimed at students in their second year of high school (or their first year in four-year programs) | Plan your summer in the classrooms of Italy''s largest science-technological university | Discover the TECHCAMP courses and test yourself with the technology of tomorrow. | Dates: 15-19 June 2026, or, 22-26 June 2026 | 500 available places | 11 STEM courses on future themes: Coding | Robotics | Mobility | Cybersecurity | Green Energy | AI | Sport Engineering | Architecture | Design | Mathematics | Where: Campus Città Studi, Campus Bovisa, Campus Lecco | Program details: (including Race car dynamics and cybersecurity and hacking)'
WHERE id = '8e5c10af-aebb-449c-9811-fed9dcc14039'
  AND description = 'Aimed at students in their second year of high school (or their first year in four-year programs) | Plan your summer in the classrooms of Italy''s largest science-technological university | Discover the TECHCAMP courses and test yourself with the technology of tomorrow. | Dates: 15-19 June 2026, or, 22-26 June 2026 | 500 available places | 11 STEM courses on future themes: Coding | Robotics | Mobility | Cybersecurity | Green Energy | AI | Sport Engineering | Architecture | Design | Mathematics | Where: Campus Città Studi, Campus Bovisa, Campus Lecco | Program details: | (including Race car dynamics and cybersecurity and hacking) | Modul University, Vienna, Austria | 1 week long introductory program. | University of Sussex (Su…';

-- 4. 'Winchester College - Discover Summer Program' (id 483c0af4-92e1-4599-a4e9-8ac6eec69a57)
-- Different shape from the other three: not a splice of a DIFFERENT institution, but the
-- record's own content duplicated verbatim (the ingest scrape ran twice into one field), with
-- the second copy cut off mid-word. Organization is unresolved and contested between two
-- 2026-09-02 files, not this pass's call: official_url_provenance_fixes_2026-09-02.sql staged
-- organization = 'Winchester College' + a winchestercollegesummerprogramme.com URL, while
-- organization_backfill_2026-09-02.sql staged organization = 'Discovery Summer (independent
-- provider; Biltur is a Turkey-based enrollment agency, not the operator)' for the SAME row —
-- flagged for 6e/CEO in the companion doc, not resolved here. What's fixed here is purely the
-- description-side duplication: kept one copy, dropped the repeat and a stray orphaned "US"
-- token sitting right at the seam (undecipherable out of context -- not guessed at, just cut
-- along with the duplicate it introduces).
UPDATE opportunities
SET description = 'Pre-College Program (15-17 years) | Core subjects:Economics and Business, Filmmaking, International Relations, Advanced STEM, IELTS/Academic English, Technology and AI, | Additional subjects: Business Studies, Cultural English, Debate, Digital Photography, Filmmaking, GenAI, IELTS Listening and Speaking, STEM, Politics/Model UN, Philosophy | July-August 2024: 2-3-4 weeks options'
WHERE id = '483c0af4-92e1-4599-a4e9-8ac6eec69a57'
  AND description = 'Pre-College Program (15-17 years) | Core subjects:Economics and Business, Filmmaking, International Relations, Advanced STEM, IELTS/Academic English, Technology and AI, | Additional subjects: Business Studies, Cultural English, Debate, Digital Photography, Filmmaking, GenAI, IELTS Listening and Speaking, STEM, Politics/Model UN, Philosophy | July-August 2024: 2-3-4 weeks options | US | Winchester College - Discover Summer Program | Pre-College Program (15-17 years) | Core subjects:Economics and Business, Filmmaking, International Relations, Advanced STEM, IELTS/Academic English, Technology and AI, | Additional subjects: Business Studies, Cultural English, Debate, Digital Photography, Filmmaking, G…';

-- Review the four UPDATE 1 / UPDATE 0 results above, then:
-- COMMIT;
-- or, if any statement printed UPDATE 0:
-- ROLLBACK;
