-- Retire 6 opportunities rows that are wrong in kind, not merely low quality — identified
-- by BUG-1's live defect audit (data/audit/opportunities-description-defects-2026-08-22.md
-- on oryn/bug1-opportunity-data-defects), IDs confirmed directly by BUG-1, independently
-- re-resolved (3 were given only as truncated prefixes) and cross-checked against live
-- title/category/status by RES-I2 before this file was written. All 6 currently
-- status='active', category='summer_program'.
--
-- Five rows are titled with an institution's name rather than an opportunity name (Drive-
-- corpus import artifacts, not real program records). The sixth is a UCSC course-catalogue
-- class-detail page (base64-encoded query blob URL), not an opportunity at all.
--
-- Idempotent by construction — every UPDATE guarded by id AND status='active', so
-- re-running is a safe no-op once applied. Dry-run with ROLLBACK already performed and
-- confirmed exact-match by RES-I2 (2026-08-22); this file was NOT applied — the COMMIT was
-- blocked by the environment's safety classifier, escalated by ORYN-BASORG to the founder
-- as part of a combined capability decision (this batch + the ECW2 batch + RES-R2's
-- blocked force-push + RES-I2's blocked PR creation). Apply from the Supabase SQL editor,
-- or from a session with DB-write permission for this action, once the founder decides.
--
-- No reason/notes column exists on `opportunities` (schema-checked) — per-row reasons are
-- recorded here and in docs/handoffs/i2_ecw2_ingest-report.md's Priority 2 section, not in
-- the DB row itself.

begin;

-- King's College London (London, UK) — title is the institution's name, not a program.
update opportunities set status = 'disabled', updated_at = now()
where id = '1e907aad-2bd4-43e4-98c1-4d75b6413d7a' and status = 'active';

-- University of Southern California (CA, USA) — title is the institution's name, not a program.
update opportunities set status = 'disabled', updated_at = now()
where id = '4a54159a-58dd-4304-a139-2b76f2a9fe38' and status = 'active';

-- New York University (NY, USA) — title is the institution's name, not a program.
update opportunities set status = 'disabled', updated_at = now()
where id = '907e279d-bc2f-46b0-b970-9ed9c0abb261' and status = 'active';

-- Carnegie Mellon University (PA, USA) — title is the institution's name, not a program.
update opportunities set status = 'disabled', updated_at = now()
where id = 'b4091e25-c8ca-4042-9976-ee41ae4031d5' and status = 'active';

-- University of St. Andrews (Scotland, UK) — title is the institution's name, not a program.
update opportunities set status = 'disabled', updated_at = now()
where id = 'e0960bef-227f-4360-ad8f-d910e5e8dc2b' and status = 'active';

-- "ECON 1 - 01 Introductory Microeconomics..." — a UCSC course-catalogue class-detail page,
-- not an opportunity of any kind.
update opportunities set status = 'disabled', updated_at = now()
where id = '7aa517a3-64a4-4443-a2e9-14f2a46ba8a0' and status = 'active';

-- Expected after: all 6 rows status='disabled', updated_at bumped. Nothing else changed.
select id, title, status, updated_at
from opportunities
where id in (
  '1e907aad-2bd4-43e4-98c1-4d75b6413d7a','4a54159a-58dd-4304-a139-2b76f2a9fe38',
  '907e279d-bc2f-46b0-b970-9ed9c0abb261','b4091e25-c8ca-4042-9976-ee41ae4031d5',
  'e0960bef-227f-4360-ad8f-d910e5e8dc2b','7aa517a3-64a4-4443-a2e9-14f2a46ba8a0'
)
order by title;

commit;
