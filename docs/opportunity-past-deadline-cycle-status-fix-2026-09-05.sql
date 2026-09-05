-- 6 active opportunities whose deadline has already passed but whose cycle_status still
-- reads as if the cycle were open/upcoming/unannounced -- found while measuring
-- past-deadline honesty (docs/past-deadline-honesty-measurement-2026-09-05.md). A separate,
-- smaller data-quality gap from the display fix in this same package: this doesn't cause a
-- false-honest render by itself (isOpportunityActionable's own deadline check is independent
-- of cycle_status and already excludes all of these from recommendation surfaces), but the
-- column is still wrong on its own terms and worth correcting directly. Prepared, not
-- applied -- CEO packages.
--
-- 'closed' chosen over 'historical'/'discontinued': these are ordinary past-deadline rows
-- with no evidence the program itself ended or was discontinued, matching how the other 29
-- of the 34 originally-past-and-correctly-marked opportunities already read (the live
-- majority shape for "deadline passed, program presumably continues next cycle").
--
-- Every WHERE clause re-guards on the exact current cycle_status and deadline, so this file
-- degrades to a safe no-op for any row a later pass has already corrected or extended before
-- this runs.

update public.opportunities set cycle_status = 'closed'
where id = '27274e04-50f4-4e82-9b7e-c5dbaace4bbe' -- GENIUS Olympiad
  and cycle_status = 'date_not_announced' and deadline = '2026-03-07';

update public.opportunities set cycle_status = 'closed'
where id = '2f0e0301-5dd4-4d25-91a4-8f73bf5584e9' -- Özyeğin University Summer Research Program
  and cycle_status = 'open' and deadline = '2026-05-15';

update public.opportunities set cycle_status = 'closed'
where id = 'dc762fce-b83a-4217-a610-290ac2f65f17' -- University of Edinburgh Pre-University Summer School 2026
  and cycle_status = 'upcoming' and deadline = '2026-05-19';

update public.opportunities set cycle_status = 'closed'
where id = '2833637b-82bf-459e-afee-3eb355aa3fd0' -- Geleceği Eşitle — Sustainable Livelihoods Train-the-Trainer Program
  and cycle_status = 'open' and deadline = '2026-08-26';

update public.opportunities set cycle_status = 'closed'
where id = '5f7ef5d4-44ef-4221-9303-334fd432962e' -- The Marshall Society Essay Competition 2026
  and cycle_status = 'open' and deadline = '2026-08-30';

update public.opportunities set cycle_status = 'closed'
where id = 'bfd946b6-8cfb-4b2b-91b3-fd5523c7551b' -- Inspirit AI Scholars Live Online
  and cycle_status = 'upcoming' and deadline = '2026-09-01';
