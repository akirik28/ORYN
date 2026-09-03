-- Turkey-exclusion audit — finished, one fix staged
-- 2026-09-03, oryn-bd, branch docs/turkey-exclusion-audit-finished-2026-09-03
--
-- STAGED ONLY. Not applied. Founder review required before running against the live DB
-- (qtcvcflzxbuagvvwahhu) — every write to this data is founder-gated per standing rule.
--
-- Companion doc: docs/turkey-exclusion-audit-finished-2026-09-03.md. That doc covers all 13
-- records read this pass; only one needed a fix. This file exists mainly to properly stage a
-- fix from EARLIER tonight that was reported in chat but never actually committed to a branch
-- (per the standing rule that nothing gets applied without a reviewable, guarded file) — this
-- closes that gap alongside the new work.
--
-- ============================================================================================

BEGIN;

-- YIS Stock Pitch Competition (id d9b1f04e-5be4-44c1-9d34-c5979ad57689)
-- eligible_countries was ["United States"]. Re-verified live 2026-09-03 (yis.org and
-- corroborating secondary coverage): this is explicitly a GLOBAL competition with a
-- dedicated "International OPEN Stock Pitch Competition" track for any country not otherwise
-- listed, and its own recent-cycle summary cites participation "from 31 states and 20
-- countries." Not a curated allow-list situation -- set to an empty array (open to any
-- country), matching this catalog's own convention for genuinely globally-open records
-- (e.g. CS50x, Zooniverse, iNaturalist), rather than appending Turkey to a list that
-- shouldn't exist as a restriction at all.
UPDATE opportunities
SET eligible_countries = ARRAY[]::text[]
WHERE id = 'd9b1f04e-5be4-44c1-9d34-c5979ad57689'
  AND eligible_countries = ARRAY['United States']::text[];

-- Review the UPDATE 1 / UPDATE 0 result above, then:
-- COMMIT;
-- or, if it printed UPDATE 0:
-- ROLLBACK;
