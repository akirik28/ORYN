-- Deadline-coverage promotions, 2026-09-03
--
-- 5 rows out of a 112-row population (active + under_review opportunities with deadline IS NULL,
-- excluding the 3 non-actionable cycle_status values and everything already individually verified
-- in the two prior under_review verification tasks) were found to carry a real, specific, currently
-- correct deadline on their own official page today. Each UPDATE below sets deadline, plus a
-- cycle_status correction ONLY where the live source directly and explicitly contradicted the stored
-- value (never inferred), plus organization ONLY where it was null and the same source named the
-- operator unambiguously. verification_state/verified_at are refreshed for all 5 since all 5 were
-- personally checked against a live official source today, 2026-09-03.
--
-- A 6th candidate (Columbia Spring Immersion Program, id f912de6d-7da6-4e21-811b-1da09b10c86c) was
-- found tonight with an apparent deadline (2026-12-21) but is DELIBERATELY NOT staged here -- see
-- docs/opportunity-deadline-coverage-2026-09-03.md for why: an earlier task tonight already flagged
-- this exact row's official_url as resolving to a different, unconfirmed Columbia program, and
-- tonight's deadline finding doesn't resolve that ambiguity, just extracts a date from the same
-- questionable page.
--
-- Also NOT included: BMO Round 1 (f6dbce16-a6cb-4e8c-9ebd-01a57489879f), BMO Round 2
-- (e5a8555d-7e5b-4fd4-8406-812efbe1de91), and Senior Team Mathematical Challenge
-- (1cd3d046-3101-4314-b068-4d946286512e) -- all 3 already have deadline/cycle_status staged by
-- data/research/opportunities/under_review_promotions_2026-09-03.sql from earlier tonight, checked
-- against the same official pages; nothing new to add.
--
-- Dry-run validated live via begin/rollback before this file was written -- all 5 statements matched
-- expected values, confirmed rolled back after (deadline NULL again for all 5 post-rollback).
--
-- See docs/opportunity-deadline-coverage-2026-09-03.md for full findings, sourcing, and the 107 rows
-- that did NOT yield a stageable deadline.

-- Baltic Sea Philosophy Essay Event (BSPEE)
-- id 7d573141-bca6-459d-a206-43aebae178c4
-- Source: https://bspee.wordpress.com/2026/09/02/invitation-letter-2026/ (checked 2026-09-03)
-- Letter dated the day before this check: schools request essay topics from FETO by Sept 24;
-- submit selected papers by Oct 17. cycle_status was 'date_not_announced' -- stale by about a day;
-- the letter confirms an open, currently-running cycle.
update opportunities
set deadline = '2026-09-24',
    cycle_status = 'open',
    verification_state = 'verified_current',
    verified_at = now()
where id = '7d573141-bca6-459d-a206-43aebae178c4';

-- JAX Summer Student Program
-- id eb956520-51c2-43d1-a57b-ec29dd664315
-- Source: https://www.jax.org/education-and-learning/high-school-students-and-undergraduates/learn-earn-and-explore/admission (checked 2026-09-03)
-- Page states the 2027-cycle deadline explicitly: "January 25, 2027 at 5:00 p.m. ET." Application
-- portal itself doesn't open until November 2026. cycle_status was 'date_not_announced' -- stale,
-- since a specific date has in fact been announced even though the portal isn't open yet;
-- 'upcoming' fits this state better than either the old value or 'open'.
update opportunities
set deadline = '2027-01-25',
    cycle_status = 'upcoming',
    verification_state = 'verified_current',
    verified_at = now()
where id = 'eb956520-51c2-43d1-a57b-ec29dd664315';

-- Ron Brown Scholar Program
-- id abe62a46-56f4-449a-b008-d072b1be5dc4
-- Source: https://ronbrown.org/ron-brown-scholarship/ (checked 2026-09-03)
-- Page states verbatim "December 1: Final application submission deadline" alongside "APPLY NOW --
-- 2027 Application is now open!" -- the 2026-27 senior-year window just opened. Year inferred from
-- the page's own cycle-naming convention ("2027 Application" = entering college fall 2027), not
-- printed as a bare "December 1, 2026" string. cycle_status was 'date_not_announced' -- stale, since
-- the cycle is explicitly open now with a published deadline.
update opportunities
set deadline = '2026-12-01',
    cycle_status = 'open',
    verification_state = 'verified_current',
    verified_at = now()
where id = 'abe62a46-56f4-449a-b008-d072b1be5dc4';

-- NYC Commuter Summer -- Columbia University Pre-College Programs
-- id 3318dba7-e099-4de2-83db-f27d6697f1be
-- Source: https://precollege.sps.columbia.edu/admissions/dates-and-deadlines (checked 2026-09-03)
-- "General Application Deadline: April 1, 2027" for NYC Commuter Summer (all sessions). cycle_status
-- ('upcoming') and organization ('Columbia University') were already correct -- deadline only.
-- Unlike the Spring Immersion Program row above, this row's own official_url and title are
-- consistent with each other and with the dates-and-deadlines page reached -- no identity ambiguity.
update opportunities
set deadline = '2027-04-01',
    verification_state = 'verified_current',
    verified_at = now()
where id = '3318dba7-e099-4de2-83db-f27d6697f1be';

-- Columbia University Pre-College Online Summer
-- id 79117533-f7d0-4319-8636-16cbe9864673
-- Source: https://precollege.sps.columbia.edu/admissions/dates-and-deadlines (checked 2026-09-03)
-- Same shared source page, "Online Summer (all sessions)": "General Application Deadline: April 1,
-- 2027." cycle_status ('upcoming') and organization ('Columbia University') were already correct --
-- deadline only. Same identity-consistency note as the row above.
update opportunities
set deadline = '2027-04-01',
    verification_state = 'verified_current',
    verified_at = now()
where id = '79117533-f7d0-4319-8636-16cbe9864673';
