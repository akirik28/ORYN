-- Defense-in-depth for a real dedup gap found during audit: the original
-- unique(user_id, university_id, program_id) constraint (0007) never actually prevents
-- duplicate rows when program_id is NULL, because Postgres treats NULL as distinct from
-- NULL for uniqueness purposes. Every "target a university without picking a program"
-- request (the common path — addTargetUniversity's programId defaults to null) could
-- insert a fresh duplicate row instead of colliding with an existing one. The app layer
-- now checks for an existing row before inserting (see addTargetUniversity in
-- app/(app)/universities/actions.ts), which closes the practical bug; this index closes
-- the remaining true-concurrent-request race at the database level. Purely additive —
-- the original constraint is left in place for the non-null case.
create unique index if not exists target_universities_user_university_no_program_idx
  on public.target_universities (user_id, university_id)
  where program_id is null;
