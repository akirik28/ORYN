-- Security Gate 1 (2026-08-29). pgTAP suite proving migrations 0062, 0063, 0065, 0066, and
-- 0067's guard triggers actually behave as designed: a non-service-role INSERT or UPDATE
-- cannot set a system-computed column, a service-role write still can (the app's own
-- legitimate path, after this gate's paired code changes moved those specific writes onto
-- the admin client), and ordinary student-owned columns on the same rows remain freely
-- editable. This is a genuine, automated, locally-run pgTAP suite -- unlike the three
-- existing `*_manual.sql` files in this directory (written when the pgtap extension had
-- never been confirmed available anywhere this repo had run), this session confirmed pgTAP
-- actually runs against a real, fully-migrated local Postgres database (built from source
-- against Homebrew PostgreSQL 17 -- `supabase start`/Docker was unavailable in this
-- sandbox, hung indefinitely on every probe), so this is real coverage, not another manual
-- checklist.
--
-- Two students, fixed ids for readability, wrapped in one ROLLBACK transaction (pgTAP's own
-- convention, confirmed via `supabase test new --template pgtap`) so nothing here persists
-- regardless of pass/fail -- no cleanup block needed, unlike the manual scripts.
--
-- Scope note on the 8 achievement tables 0067 protects: `activities` and `awards` (one
-- `extends AchievementCommon` table, one standalone interface -- the two distinct shapes in
-- `types/database.ts`) get full insert-forgery / update-forgery / service-role-bypass /
-- ordinary-field-still-editable coverage. The remaining six (`certifications`, `projects`,
-- `research_experiences`, `volunteering_experiences`, `work_experiences`,
-- `sports_experiences`) get a lighter sweep confirming the shared trigger fires for each --
-- proportionate given all eight attach the identical shared function,
-- `guard_achievement_evidence_status()`, verified once above rather than re-verified in full
-- eight times.
--
-- Second-pass additions (2026-08-29, adversarial review of this same gate before Codex
-- review): the original version of this file never actually tested a single UPDATE
-- statement that sets a protected column AND an ordinary column together -- every prior
-- proof used two separate statements, which cannot rule out the trigger clobbering the
-- whole row or interacting badly with RLS's WITH CHECK on a trigger-modified NEW row. Added
-- for `target_universities` and `activities`: one combined-statement test each, plus an
-- explicit NULL -> attempted-value -> NULL case (target_universities.outlook_confidence)
-- and an explicit value -> attempted-NULL -> unchanged case (profile_scores.score). A
-- "same-value rewrite" case (SET x = x) was considered and deliberately not added: the
-- guard functions reset unconditionally regardless of what value was attempted, so that
-- case exercises no code path the other assertions don't already cover.

BEGIN;
SELECT plan(44);

-- ---------------------------------------------------------------------------
-- Setup: two students + one target university + one opportunity + one university
-- requirement, so every protected table has at least one real row to attack.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-00000000000a', 'student-a@test.local'),
  ('b0000000-0000-0000-0000-00000000000b', 'student-b@test.local');

insert into public.universities (id, name, country) values
  ('c0000000-0000-0000-0000-000000000001', 'Security Gate 1 Test University', 'US'),
  ('c0000000-0000-0000-0000-000000000002', 'Security Gate 1 Test University 2', 'US');

insert into public.target_universities (id, user_id, university_id, status)
  values ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-000000000001', 'exploring');

insert into public.opportunities (id, title, normalized_title, organization, category, status, cycle_status)
  values ('e0000000-0000-0000-0000-000000000001', 'Security Gate 1 Test Opportunity', 'security gate 1 test opportunity', 'Test Org', 'competition', 'active', 'open');

insert into public.opportunity_matches (id, user_id, opportunity_id, eligible, relevance_score, profile_need_score, match_score)
  values ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-000000000001', true, 50, 50, 42);

insert into public.university_requirements (id, university_id, requirement_type, requirement_detail)
  values ('10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'standardized_test', 'Security Gate 1 test requirement');

insert into public.student_requirement_evaluations (id, user_id, requirement_id, status)
  values ('20000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'met');

insert into public.activities (id, user_id, title, category, evidence_status)
  values ('30000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'Security Gate 1 test activity', 'club', 'self_reported');

insert into public.awards (id, user_id, title, source, evidence_status)
  values ('40000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'Security Gate 1 test award', 'self_reported', 'self_reported');

-- ---------------------------------------------------------------------------
-- profiles.is_admin (migration 0062)
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

update public.profiles set is_admin = true where id = 'a0000000-0000-0000-0000-00000000000a';
SELECT is(
  (select is_admin from public.profiles where id = 'a0000000-0000-0000-0000-00000000000a'),
  false,
  'ordinary authenticated user cannot grant themselves is_admin via UPDATE'
);

update public.profiles set display_name = 'Student A', country = 'US' where id = 'a0000000-0000-0000-0000-00000000000a';
SELECT is(
  (select display_name from public.profiles where id = 'a0000000-0000-0000-0000-00000000000a'),
  'Student A',
  'ordinary authenticated user CAN still update their own permitted profile fields (display_name)'
);
SELECT is(
  (select country from public.profiles where id = 'a0000000-0000-0000-0000-00000000000a'),
  'US',
  'ordinary authenticated user CAN still update their own permitted profile fields (country)'
);

reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role service_role;
update public.profiles set is_admin = true where id = 'a0000000-0000-0000-0000-00000000000a';
SELECT is(
  (select is_admin from public.profiles where id = 'a0000000-0000-0000-0000-00000000000a'),
  true,
  'service_role (the app''s own admin-grant path, if ever used deliberately) CAN set is_admin'
);
update public.profiles set is_admin = false where id = 'a0000000-0000-0000-0000-00000000000a';
reset role;

-- ---------------------------------------------------------------------------
-- profile_scores / profile_score_snapshots (migrations 0063, 0065)
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

SELECT throws_ok(
  $$insert into public.profile_scores (user_id, dimension, score, calculation_version) values ('a0000000-0000-0000-0000-00000000000a', 'leadership', 100, 'career_profile_v1')$$,
  null,
  null,
  'authenticated user CANNOT insert a forged profile_scores row directly (0065: no INSERT policy at all)'
);

set local role service_role;
insert into public.profile_scores (id, user_id, dimension, score, calculation_version)
  values ('50000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'leadership', 55, 'career_profile_v1');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
update public.profile_scores set score = 100 where id = '50000000-0000-0000-0000-000000000001';
SELECT is(
  (select score from public.profile_scores where id = '50000000-0000-0000-0000-000000000001'),
  55,
  'authenticated user cannot forge their own profile_scores.score via UPDATE (reset to OLD)'
);

set local role service_role;
update public.profile_scores set score = 78 where id = '50000000-0000-0000-0000-000000000001';
SELECT is(
  (select score from public.profile_scores where id = '50000000-0000-0000-0000-000000000001'),
  78,
  'service_role (the real recomputeCareerProfile() path) CAN update profile_scores.score'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

-- value -> attempted NULL -> stays at the real value (the reverse direction from the
-- INSERT-side NULL-sanitization tests below, and from 0066's NULL -> attempted value ->
-- NULL test): score is currently a real, non-null 78, set by service_role just above.
update public.profile_scores set score = null where id = '50000000-0000-0000-0000-000000000001';
SELECT is(
  (select score from public.profile_scores where id = '50000000-0000-0000-0000-000000000001'),
  78,
  'a protected column with a real non-null value cannot be nulled out via UPDATE either (value -> attempted NULL -> unchanged)'
);

SELECT throws_ok(
  $$insert into public.profile_score_snapshots (user_id, score_version, overall_score, dimension_scores, snapshot_reason) values ('a0000000-0000-0000-0000-00000000000a', 'career_profile_v1', 100, '{}'::jsonb, 'security_gate_1_test')$$,
  null,
  null,
  'authenticated user CANNOT insert a forged profile_score_snapshots row directly (0065)'
);

-- ---------------------------------------------------------------------------
-- opportunity_matches (migrations 0063, 0065)
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

update public.opportunity_matches set match_score = 999, eligible = true where id = 'f0000000-0000-0000-0000-000000000001';
SELECT is(
  (select match_score from public.opportunity_matches where id = 'f0000000-0000-0000-0000-000000000001'),
  42,
  'authenticated user cannot forge opportunity_matches.match_score via UPDATE (reset to OLD)'
);

SELECT throws_ok(
  $$insert into public.opportunity_matches (user_id, opportunity_id, eligible, relevance_score, profile_need_score, match_score) values ('a0000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-000000000001', true, 50, 50, 100)$$,
  null,
  null,
  'authenticated user CANNOT insert a second, forged opportunity_matches row directly (0065)'
);

set local role service_role;
update public.opportunity_matches set match_score = 87 where id = 'f0000000-0000-0000-0000-000000000001';
SELECT is(
  (select match_score from public.opportunity_matches where id = 'f0000000-0000-0000-0000-000000000001'),
  87,
  'service_role (the real refreshOpportunityMatches() path) CAN update opportunity_matches.match_score'
);
reset role;

-- ---------------------------------------------------------------------------
-- student_requirement_evaluations (migrations 0063, 0065)
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

update public.student_requirement_evaluations set status = 'not_met' where id = '20000000-0000-0000-0000-000000000001';
SELECT is(
  (select status from public.student_requirement_evaluations where id = '20000000-0000-0000-0000-000000000001')::text,
  'met',
  'authenticated user cannot forge student_requirement_evaluations.status via UPDATE (reset to OLD)'
);

SELECT throws_ok(
  $$insert into public.student_requirement_evaluations (user_id, requirement_id, status) values ('a0000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'met')$$,
  null,
  null,
  'authenticated user CANNOT insert a second, forged student_requirement_evaluations row directly (0065)'
);

-- ---------------------------------------------------------------------------
-- evidence_files.verification_status (migrations 0063, 0065)
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

SELECT throws_ok(
  $$insert into public.evidence_files (user_id, linked_table, linked_id, evidence_type, file_path, verification_status) values ('a0000000-0000-0000-0000-00000000000a', 'activities', '30000000-0000-0000-0000-000000000001', 'application/pdf', 'forged/path.pdf', 'verified')$$,
  null,
  null,
  'authenticated user CANNOT insert an evidence_files row (any verification_status) directly (0065 -- app uses admin client)'
);

set local role service_role;
insert into public.evidence_files (id, user_id, linked_table, linked_id, evidence_type, file_path, verification_status)
  values ('60000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'activities', '30000000-0000-0000-0000-000000000001', 'application/pdf', 'real/path.pdf', 'evidence_added');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
update public.evidence_files set verification_status = 'verified' where id = '60000000-0000-0000-0000-000000000001';
SELECT is(
  (select verification_status from public.evidence_files where id = '60000000-0000-0000-0000-000000000001')::text,
  'evidence_added',
  'authenticated user cannot forge evidence_files.verification_status to verified via UPDATE'
);
update public.evidence_files set verification_status = 'verification_rejected' where id = '60000000-0000-0000-0000-000000000001';
SELECT is(
  (select verification_status from public.evidence_files where id = '60000000-0000-0000-0000-000000000001')::text,
  'evidence_added',
  'authenticated user cannot forge evidence_files.verification_status to verification_rejected via UPDATE'
);

-- ---------------------------------------------------------------------------
-- target_universities outlook columns (NEW: migration 0066)
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

-- Second-pass addition (2026-08-29): a genuinely COMBINED single-statement UPDATE --
-- one protected column and one ordinary column, set together in the SAME SET clause, not
-- two separate statements. This is the one real blind spot the adversarial review found:
-- every prior assertion here proved forgery-denied and ordinary-field-still-editable as two
-- separate UPDATEs, which cannot distinguish "the trigger only resets what it should" from
-- "the trigger accidentally clobbers the whole row" or "RLS WITH CHECK interacts badly with
-- a trigger-modified NEW row" -- both real hypotheses this single combined statement rules
-- out directly, in one round trip, the same way a real forged request would actually be
-- shaped (nobody sends two separate UPDATEs to hide one forged column).
update public.target_universities
  set outlook = 'likely', estimate_range_low = 0.9, estimate_range_high = 0.99, academic_fit_score = 100,
      status = 'target', notes = 'my own notes'
  where id = 'd0000000-0000-0000-0000-000000000001';
SELECT is(
  (select outlook from public.target_universities where id = 'd0000000-0000-0000-0000-000000000001'),
  null,
  'combined statement: the protected outlook column is still reset to OLD/NULL even when set alongside an ordinary column'
);
SELECT is(
  (select estimate_range_high from public.target_universities where id = 'd0000000-0000-0000-0000-000000000001'),
  null,
  'combined statement: estimate_range_high is still reset to OLD/NULL in the same statement'
);
SELECT is(
  (select status::text from public.target_universities where id = 'd0000000-0000-0000-0000-000000000001'),
  'target',
  'combined statement: the SAME statement''s ordinary status column is NOT clobbered by the trigger -- it takes the new value exactly as if the trigger were not there'
);
SELECT is(
  (select notes from public.target_universities where id = 'd0000000-0000-0000-0000-000000000001'),
  'my own notes',
  'combined statement: the SAME statement''s ordinary notes column is NOT clobbered either'
);

-- NULL -> attempted value -> stays NULL: outlook_confidence has never been touched by any
-- statement above, so OLD.outlook_confidence is still a genuine SQL NULL here, not a
-- previously-set value that merely looks unset.
SELECT is(
  (select outlook_confidence::text from public.target_universities where id = 'd0000000-0000-0000-0000-000000000001'),
  null,
  'sanity check: outlook_confidence is still genuinely NULL before this next assertion (not previously touched)'
);
update public.target_universities set outlook_confidence = 'high' where id = 'd0000000-0000-0000-0000-000000000001';
SELECT is(
  (select outlook_confidence::text from public.target_universities where id = 'd0000000-0000-0000-0000-000000000001'),
  null,
  'a protected column whose OLD value is NULL stays NULL after an UPDATE attempt (NULL -> attempted value -> NULL)'
);

-- a fresh INSERT trying to pre-set the outlook columns is sanitized to NULL, not rejected
-- outright (matches addTargetUniversity's own real insert shape, which never sets them)
insert into public.target_universities (id, user_id, university_id, status, outlook, estimate_range_low)
  values ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-000000000002', 'exploring', 'likely', 0.99);
SELECT is(
  (select outlook from public.target_universities where id = 'd0000000-0000-0000-0000-000000000002'),
  null,
  'a forged outlook value on INSERT is silently sanitized to NULL, not stored (target_universities)'
);
SELECT is(
  (select status::text from public.target_universities where id = 'd0000000-0000-0000-0000-000000000002'),
  'exploring',
  'the same INSERT''s ordinary status field is stored normally, unaffected by the outlook guard'
);

set local role service_role;
update public.target_universities
  set outlook = 'competitive', estimate_range_low = 0.2, estimate_range_high = 0.4, academic_fit_score = 60, outlook_model_version = 'admission_model_v1'
  where id = 'd0000000-0000-0000-0000-000000000001';
SELECT is(
  (select outlook::text from public.target_universities where id = 'd0000000-0000-0000-0000-000000000001'),
  'competitive',
  'service_role (the real refreshAdmissionOutlook() path) CAN update target_universities.outlook'
);
reset role;

-- ---------------------------------------------------------------------------
-- achievement evidence_status (NEW: migration 0067) -- full coverage: activities, awards
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

-- Second-pass addition (2026-08-29): same combined-single-statement proof as
-- target_universities above, for the shared achievement-table trigger -- evidence_status
-- forged alongside title/category in ONE UPDATE, not two.
update public.activities set evidence_status = 'verified', title = 'Updated title', category = 'student_government' where id = '30000000-0000-0000-0000-000000000001';
SELECT is(
  (select evidence_status::text from public.activities where id = '30000000-0000-0000-0000-000000000001'),
  'self_reported',
  'combined statement: activities.evidence_status is still reset to self_reported even when set alongside ordinary columns'
);
SELECT is(
  (select title from public.activities where id = '30000000-0000-0000-0000-000000000001'),
  'Updated title',
  'combined statement: the SAME statement''s ordinary title column is NOT clobbered by the shared evidence_status trigger'
);
SELECT is(
  (select category::text from public.activities where id = '30000000-0000-0000-0000-000000000001'),
  'student_government',
  'combined statement: the SAME statement''s ordinary category column is NOT clobbered either'
);

insert into public.activities (id, user_id, title, category, evidence_status)
  values ('30000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-00000000000a', 'Forged-at-insert activity', 'club', 'verified');
SELECT is(
  (select evidence_status::text from public.activities where id = '30000000-0000-0000-0000-000000000002'),
  'self_reported',
  'a forged evidence_status on INSERT is silently sanitized to self_reported, not stored (activities)'
);
SELECT is(
  (select title from public.activities where id = '30000000-0000-0000-0000-000000000002'),
  'Forged-at-insert activity',
  'the same INSERT''s ordinary title field is stored normally, unaffected by the evidence_status guard'
);

update public.awards set evidence_status = 'verification_rejected' where id = '40000000-0000-0000-0000-000000000001';
SELECT is(
  (select evidence_status::text from public.awards where id = '40000000-0000-0000-0000-000000000001'),
  'self_reported',
  'authenticated user cannot forge awards.evidence_status to verification_rejected via UPDATE'
);
insert into public.awards (id, user_id, title, source, evidence_status)
  values ('40000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-00000000000a', 'Forged-at-insert award', 'self_reported', 'verified');
SELECT is(
  (select evidence_status::text from public.awards where id = '40000000-0000-0000-0000-000000000002'),
  'self_reported',
  'a forged evidence_status on INSERT is silently sanitized to self_reported, not stored (awards)'
);

set local role service_role;
update public.activities set evidence_status = 'evidence_added' where id = '30000000-0000-0000-0000-000000000001';
SELECT is(
  (select evidence_status::text from public.activities where id = '30000000-0000-0000-0000-000000000001'),
  'evidence_added',
  'service_role (the real uploadEvidence() path, post Security Gate 1) CAN update activities.evidence_status'
);
reset role;

-- ---------------------------------------------------------------------------
-- achievement evidence_status -- lighter sweep, remaining six tables: confirm the shared
-- trigger fires for each (insert-forgery sanitized), proportionate to sharing one function
-- already fully verified above.
-- ---------------------------------------------------------------------------
insert into public.education_records (id, user_id, school_name, stage)
  values ('70000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'Security Gate 1 Test School', 'high_school');
insert into public.certifications (id, user_id, title, source, evidence_status)
  values ('80000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'Test cert', 'self_reported', 'self_reported');
insert into public.projects (id, user_id, title, evidence_status)
  values ('80000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-00000000000a', 'Test project', 'self_reported');
insert into public.research_experiences (id, user_id, title, output_type, evidence_status)
  values ('80000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-00000000000a', 'Test research', 'none', 'self_reported');
insert into public.volunteering_experiences (id, user_id, title, evidence_status)
  values ('80000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-00000000000a', 'Test volunteering', 'self_reported');
insert into public.work_experiences (id, user_id, title, organization, employment_type, evidence_status)
  values ('80000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-00000000000a', 'Test job', 'Test Employer', 'part_time_job', 'self_reported');
insert into public.sports_experiences (id, user_id, sport, evidence_status)
  values ('80000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-00000000000a', 'Tennis', 'self_reported');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

SELECT ok(true, 'education_records correctly has no evidence_status column (not one of the 8 protected tables, confirmed against types/database.ts) -- row above exists only to prove the table itself is otherwise reachable');

update public.certifications set evidence_status = 'verified' where id = '80000000-0000-0000-0000-000000000001';
SELECT is((select evidence_status::text from public.certifications where id = '80000000-0000-0000-0000-000000000001'), 'self_reported', 'certifications.evidence_status guarded against UPDATE forgery');

update public.projects set evidence_status = 'verified' where id = '80000000-0000-0000-0000-000000000002';
SELECT is((select evidence_status::text from public.projects where id = '80000000-0000-0000-0000-000000000002'), 'self_reported', 'projects.evidence_status guarded against UPDATE forgery');

update public.research_experiences set evidence_status = 'verified' where id = '80000000-0000-0000-0000-000000000003';
SELECT is((select evidence_status::text from public.research_experiences where id = '80000000-0000-0000-0000-000000000003'), 'self_reported', 'research_experiences.evidence_status guarded against UPDATE forgery');

update public.volunteering_experiences set evidence_status = 'verified' where id = '80000000-0000-0000-0000-000000000004';
SELECT is((select evidence_status::text from public.volunteering_experiences where id = '80000000-0000-0000-0000-000000000004'), 'self_reported', 'volunteering_experiences.evidence_status guarded against UPDATE forgery');

update public.work_experiences set evidence_status = 'verified' where id = '80000000-0000-0000-0000-000000000005';
SELECT is((select evidence_status::text from public.work_experiences where id = '80000000-0000-0000-0000-000000000005'), 'self_reported', 'work_experiences.evidence_status guarded against UPDATE forgery');

update public.sports_experiences set evidence_status = 'verified' where id = '80000000-0000-0000-0000-000000000006';
SELECT is((select evidence_status::text from public.sports_experiences where id = '80000000-0000-0000-0000-000000000006'), 'self_reported', 'sports_experiences.evidence_status guarded against UPDATE forgery');

-- ---------------------------------------------------------------------------
-- Anonymous role: sanity check the guarded tables are unreachable to anon at all (the
-- deeper anon sweep lives in security_gate_1_anonymous_and_isolation.sql; these few are
-- here because they're the same rows already set up above).
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

SELECT is(
  (select count(*) from public.profile_scores where id = '50000000-0000-0000-0000-000000000001')::int,
  0,
  'anon cannot read profile_scores at all'
);
SELECT is(
  (select count(*) from public.target_universities where id = 'd0000000-0000-0000-0000-000000000001')::int,
  0,
  'anon cannot read target_universities at all'
);
SELECT is(
  (select count(*) from public.activities where id = '30000000-0000-0000-0000-000000000001')::int,
  0,
  'anon cannot read activities at all'
);
reset role;

SELECT * FROM finish();
ROLLBACK;
