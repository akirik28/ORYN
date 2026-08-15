-- Database audit (Chat 1 functional pass): every FK column across all 21 prior migration
-- files, cross-checked against every index (a table's leading column, not just an exact
-- single-column match) — the same "verify, don't assume" method SECURITY.md's RLS audit
-- uses, applied to indexes instead of policies. Postgres never auto-indexes the referencing
-- side of a foreign key (only the referenced primary key), so an un-indexed FK column means
-- two real costs: a sequential scan on every query that filters by it, and — easy to
-- overlook — a sequential scan on the *child* table every time a row on the *parent* side
-- is deleted, so the `on delete cascade`/`on delete set null` can find the rows to touch.
--
-- Nine genuine gaps found, none catastrophic at today's near-zero row counts, all worth
-- closing before real usage makes them expensive to notice:
--   - target_universities.university_id — actively queried directly (university detail
--     page's "is this already targeted" lookup).
--   - advisor_messages.user_id — denormalized onto every row purely so its RLS policy
--     (user_id = auth.uid()) doesn't need to join through advisor_conversations; every read
--     of this table implicitly filters on it via RLS, indexed or not.
--   - The remaining six (courses.education_record_id, university_requirements.program_id,
--     university_deadlines.program_id, target_universities.program_id,
--     applications.target_university_id, opportunity_matches.opportunity_id,
--     saved_opportunities.opportunity_id) are primarily cascade-delete efficiency today,
--     with plausible direct-query use as those features grow.

create index courses_education_record_id_idx on public.courses(education_record_id);
create index university_requirements_program_id_idx on public.university_requirements(program_id);
create index university_deadlines_program_id_idx on public.university_deadlines(program_id);
create index target_universities_university_id_idx on public.target_universities(university_id);
create index target_universities_program_id_idx on public.target_universities(program_id);
create index applications_target_university_id_idx on public.applications(target_university_id);
create index opportunity_matches_opportunity_id_idx on public.opportunity_matches(opportunity_id);
create index saved_opportunities_opportunity_id_idx on public.saved_opportunities(opportunity_id);
create index advisor_messages_user_id_idx on public.advisor_messages(user_id);
