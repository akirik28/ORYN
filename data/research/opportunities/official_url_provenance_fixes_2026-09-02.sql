-- Staged, NOT applied. The 3 rows oryn-d0 flagged as official_url provenance defects
-- (2 pointing at the same third-party directory, 1 at a Turkish resale agency two
-- removes from the source). Founder is applying this by hand tonight -- every value
-- below was opened directly this session, 2026-09-02. Only 2 of the 3 are a genuine
-- fix; the third is a disable recommendation, not forced into a fix it doesn't support.
-- Live current state confirmed immediately before writing this (organization was null
-- on all three, official_url exactly as noted per row).

-- 'University of Maastricht, Netherlands' (id 14db7109-25fd-4cd9-bb70-73797588bec8)
-- Stored URL was summerschoolsineurope.eu/destination/maastricht-summer-school/ -- a
-- third-party directory listing, not the university's own page. Real official page
-- found and opened directly: maastrichtuniversity.nl/education/courses/summer-programme-european-studies
-- -- "Summer Programme in European Studies," live, Summer 2027 dates already listed.
UPDATE opportunities SET
  organization = 'Maastricht University',
  official_url = 'https://www.maastrichtuniversity.nl/education/courses/summer-programme-european-studies'
WHERE id = '14db7109-25fd-4cd9-bb70-73797588bec8';

-- 'Winchester College - Discover Summer Program' (id 483c0af4-92e1-4599-a4e9-8ac6eec69a57)
-- Stored URL was biltur.com/programlar/discovery-summer-winchester-college/ -- a
-- Turkish agency reselling the programme, two removes from the source. Real official
-- page found and opened directly: winchestercollegesummerprogramme.com -- "Winchester
-- College Summer Programme," live, residential courses for ages 12-17. Note: the
-- programme's current course names are "CATALYST" and "English Language Coaching," not
-- "Discover" -- this row's title may be a dated or agency-specific name for the same
-- underlying programme; flagged, not corrected here, since this task is organization
-- and official_url, not title accuracy.
UPDATE opportunities SET
  organization = 'Winchester College',
  official_url = 'https://www.winchestercollegesummerprogramme.com'
WHERE id = '483c0af4-92e1-4599-a4e9-8ac6eec69a57';

-- NOT FIXED, DISABLE RECOMMENDATION — 'Summer Programs in the Netherlands - 2025'
-- (id b10444c7-6c36-463c-b240-3b48025a74b6)
-- Checked directly against the "two real programmes sharing one URL" framing before
-- writing anything -- it doesn't hold for this row. Searched specifically for a single
-- program called "Summer Programs in the Netherlands": none exists. What exists instead
-- is a genuine plurality of unrelated real Dutch summer programs (The Hague Summer
-- School, HAN Summer School, University of Amsterdam Summer Programmes, Utrecht Summer
-- School, and others) -- exactly what the row's own title describes: a category, not a
-- program. Writing any single one of these in as "the" organization would be a wrong
-- resolution wearing a right one's shape, the same failure mode this whole thread's
-- rule exists to prevent. This is a genuine disable candidate, not a fix -- the row
-- doesn't describe one recoverable programme, it describes a search.
