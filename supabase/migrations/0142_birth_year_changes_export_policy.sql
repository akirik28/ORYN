-- Closes the birth_year_changes export gap (DATA_RIGHTS_AUDIT.md Part 3a;
-- docs/birth-year-changes-export-rls-proof-2026-09-05.md for the full measurement +
-- real-Postgres red/green proof). Migration 0072 enabled RLS on this table with zero
-- policies, deliberately, pending exactly this design decision: a plain select-own
-- policy, the same shape and same choice already made for the identical
-- feedback_reports case (lib/legal/content.ts's feedbackReportRetention flag) — keeps
-- the export route's defense-in-depth property (RLS still backstops the route even if
-- its own filter logic has a bug), at the accepted cost that this table becomes
-- readable by the student's own session through any future normal-client query too, not
-- only this one export route.
--
-- Deliberately select-only: birth_year_changes is append-only and system-written (the
-- profiles_log_birth_year_change trigger, migration 0072) — a student must never be
-- able to insert, update, or delete their own audit trail. Proved directly, not just
-- asserted: the proof doc's Phase 3 has a student attempting a direct INSERT into their
-- own row after this exact policy was added, and it is rejected
-- (insufficient_privilege) — this policy grants read access only.
--
-- Measured live before writing this (docs/birth-year-changes-export-rls-proof-2026-09-05.md
-- §1): 2 rows today, both previous_value is null (a first-time onboarding set, not yet a
-- real edit). Row count does not change the materiality analysis — see that doc for why
-- an empty-today table still carries this right, and why closing this while the product
-- has no real users is cheaper than closing it once birth-year edits are actually
-- happening and a silently-incomplete export would go unnoticed.
-- Re-runnable: the 0135-0142 sequence test (docs/migration-sequence-135-142-2026-09-05.md)
-- ran the whole chain twice and found this was the one statement that failed on the second
-- pass -- "policy already exists". Noisy, not silent, and it left the policy count at 1 rather
-- than duplicating anything, so nothing was corrupted; but a re-run of the range would stop
-- here. Distinct from the 0104 class (ADD COLUMN without IF NOT EXISTS, already applied, which
-- would silently create a second dead column).
drop policy if exists "select own birth year changes" on public.birth_year_changes;

create policy "select own birth year changes" on public.birth_year_changes
  for select using (user_id = auth.uid());
