-- education_records and test_scores are both listed in EVIDENCE_LINKABLE_TABLES
-- (lib/validation/evidence.ts) -- a student can already pick either one in the "this
-- supports" dropdown on Documents and successfully upload a file against it -- but
-- neither table was ever given the evidence_status column the other seven achievement
-- tables got in migration 0004. app/(app)/documents/actions.ts's uploadEvidence()
-- unconditionally tries to set it after every upload:
--
--   await supabase.from(linkedTable).update({ evidence_status: "evidence_added" })...
--
-- For these two tables that update has always failed with "column does not exist" --
-- confirmed live against oryn-qa-scratch, not just read from the migration files. The
-- evidence_files row and the storage upload both still succeed (they don't touch this
-- column), so a student attaching evidence to a transcript or test score sees a normal
-- success -- the failure is silent, on the one write this codebase's own established
-- pattern (completeOnboarding's secondary-writes comment) says should at least be
-- logged even when treated as best-effort. This migration is the half of the fix that
-- needs a schema change; app/(app)/documents/actions.ts now logs instead of swallowing
-- if this write ever fails again for a different reason.
--
-- Same type, same default, same not-null as every other achievement table -- this is
-- closing a gap in an existing, working pattern, not introducing a new one.
alter table public.education_records
  add column if not exists evidence_status evidence_status not null default 'self_reported';

alter table public.test_scores
  add column if not exists evidence_status evidence_status not null default 'self_reported';
