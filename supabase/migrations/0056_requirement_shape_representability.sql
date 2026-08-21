-- 0056 — Requirement/deadline shape representability
--
-- STATUS: PROPOSED, NOT APPLIED. Written by the requirements-ingestion design pass and left
-- unapplied deliberately. Nothing in this file has run against any database. Sections 2, 5 and
-- 7 encode product policy decisions that are the founder's to make, not this lane's — see
-- docs/handoffs/requirements-ingestion-design.md, which lays out the options for each and says
-- which one this file assumes. Read that first; if a different option is chosen, this file
-- changes before it is applied.
--
-- WHAT THIS CHANGES AND WHY
--
-- A 1,296-record research corpus (53 files, UK/Ireland/Turkey/Germany/Netherlands, gathered
-- 2026-08-21) was dry-run against the live schema via
-- scripts/ingest-university-requirements-batch.ts. Measured, not estimated:
--
--   631 of 1,296 records (48.7%) carry a shape the current schema cannot hold.
--   160 of those would be ACCEPTED anyway — written as ordinary rows with the qualifier that
--       made them true silently discarded.
--   341 accepted requirement rows would be DESTROYED on insert by one unique index.
--   230 records (17.7%) would land clean.
--
-- The 341 is not a prediction. All 36 of the 36 rows already recorded as `rejected` in
-- requirement_research_queue are this same index firing, with the real Postgres error stored
-- alongside each one. Edinburgh lost 4 english_proficiency rows, Glasgow 5 minimum_grade,
-- Sabanci 7 international_requirement.
--
-- Each section below maps to one shape and states what the schema does today, in the same
-- order as the design doc's inventory.
--
-- WHY THE QUALIFIER COLUMNS MATTER MORE THAN THEY LOOK
--
-- Ingestion writes structured_rule = null on every row, so lib/requirements/evaluate.ts
-- returns needs_manual_review for everything it has ingested. No student is being told a wrong
-- "met" through the evaluator today. The damage these columns prevent is deferred, not absent:
-- the qualifier-stripped row is exactly what a later reviewer (or lib/ai/interpret-requirement.ts)
-- reads when authoring structured_rule. By then the scale version, the validity window and the
-- "we do not accept this variant" clause survive only in requirement_research_queue.raw_payload,
-- which that reviewer is not looking at. The wrong "met" gets authored later, from a row this
-- schema made look complete.

begin;

-- ---------------------------------------------------------------------------------------
-- 1. Score scale qualifiers  (forced — no policy judgement involved)
-- ---------------------------------------------------------------------------------------
-- 142 corpus records carry a test_scale the schema has nowhere to put; 44 more carry a scale
-- that is not merely unstored but incomparable. TR-YOS in a single cycle: Hacettepe 400 of 500
-- (scored, denominator published), Ankara "440 points" (no denominator published anywhere),
-- METU "first 5th percentile" (a rank, not a score). No numeric column holds all three and
-- comparing across them means nothing.
--
-- The deadline is real: ETS dual reporting for TOEFL ends January 2028. Until then a legacy
-- 0-120 threshold is ambiguous; after then it is unmeasurable, because the comparable score
-- disappears and nothing on the row records which scale the number was written against.
alter table university_requirements
  add column if not exists test_scale text,
  add column if not exists scale_ambiguity text;

comment on column university_requirements.test_scale is
  'Scale/version the threshold in requirement_detail is expressed against (e.g. TOEFL_IBT_1_6, TOEFL_IBT_0_120_LEGACY, IELTS_0_9, TR_YOS_0_500, TR_YOS_PERCENTILE_RANK). Null means unknown, NOT "the default scale" — an unqualified numeric threshold is not safely evaluable and must not be compared.';
comment on column university_requirements.scale_ambiguity is
  'Research-lane assessment of whether the scale could be pinned down: none | resolved_unambiguous | undated_scale_assumption | partially_unsatisfiable | possibly_discontinued_instrument. Anything other than the first two blocks automatic evaluation.';

-- ---------------------------------------------------------------------------------------
-- 2. Recency, with direction  (JUDGEMENT CALL — see design doc Finding 1)
-- ---------------------------------------------------------------------------------------
-- A max-age field alone is wrong, and wrong in the confident direction. METU does not accept
-- IELTS certificates taken ON OR AFTER 24 December 2022 — it is the freshness that
-- disqualifies. A "certificate must be at most N years old" model tells that student their
-- fresh certificate qualifies, which is the exact failure this product must never produce.
--
-- jsonb rather than typed columns because the anchor varies and is load-bearing: "no more than
-- two academic years prior to entry" and "within 2 years of the expected start of your course"
-- and "valid for 2 years from the exam date" are three different anchors, and picking one as
-- the column semantics would silently re-anchor the other two.
--
-- Shape (validated in application code, not by a CHECK — the vocabulary will grow):
--   {"direction": "max_age" | "not_valid_on_or_after" | "not_valid_before",
--    "value": 2, "unit": "years",
--    "anchor": "entry" | "programme_start" | "exam_date" | "application_date",
--    "boundary_date": "2022-12-24"}
alter table university_requirements
  add column if not exists recency_rule jsonb;

comment on column university_requirements.recency_rule is
  'Validity window for the qualification, INCLUDING its direction. direction=not_valid_on_or_after is a real published shape (METU/IELTS), not a data error — a max-age-only model inverts it. Null means no recency constraint is known, which is not the same as "no constraint exists".';

-- ---------------------------------------------------------------------------------------
-- 3. Score provenance  (forced)
-- ---------------------------------------------------------------------------------------
-- How a score was obtained is a per-institution acceptance decision, not a global property of
-- the test. Southampton accepts IELTS One Skill Retake; Edinburgh refuses it. Both official,
-- both current. A superscored 1300 and a single-sitting 1300 are the same number and only one
-- is accepted, so a threshold comparison answers "met" for both.
alter table university_requirements
  add column if not exists excluded_provenances text[];

comment on column university_requirements.excluded_provenances is
  'Score provenances this institution refuses despite a qualifying number (e.g. one_skill_retake, mybest, superscore, home_edition, indicator, multi_sitting_combination). Evaluation cannot resolve these until the student-side score carries a matching provenance flag; until then their presence forces manual review.';

-- ---------------------------------------------------------------------------------------
-- 4. The evaluation gate  (forced — this is what stops a confident wrong answer)
-- ---------------------------------------------------------------------------------------
-- Two already-open tasks against lib/requirements/evaluate.ts ask that recency rules and named
-- exclusions return needs_manual_review rather than a verdict. This column is the mechanism,
-- and it generalises to every shape in the inventory: one nullable, indexed reason code that
-- the evaluator checks BEFORE it looks at structured_rule.
--
-- age_bar is the case that can never be lifted by better data. TU Dublin requires applicants to
-- be 18 before 31 December; ORYN stores birth YEAR only, by deliberate minor-safe design
-- (AGENTS.md Phase 2). For a student born late in the year the answer is genuinely unknowable
-- from what this product stores, and collecting a full birth date to resolve it would trade a
-- privacy commitment for an edge case. It must return needs_manual_review permanently.
alter table university_requirements
  add column if not exists evaluation_gate text;

alter table university_requirements
  drop constraint if exists university_requirements_evaluation_gate_check;
alter table university_requirements
  add constraint university_requirements_evaluation_gate_check
  check (evaluation_gate is null or evaluation_gate in (
    'inverted_recency',      -- direction-bearing validity window
    'recency_window',        -- ordinary max-age; no date_achieved on the student fact yet
    'unstated_scale',        -- threshold with no resolvable scale
    'incomparable_scale',    -- rank vs score, or no published denominator
    'named_exclusion',       -- provenance the institution refuses
    'eligibility_restriction', -- rule expressed as an exclusion/heading, not a threshold
    'age_bar',               -- unevaluable from birth year alone; permanent
    'source_conflict',       -- competing official readings, unresolved
    'historical',            -- correct for a cycle that has closed
    'binding_commitment'     -- a legal commitment, not a condition; permanent (see §7)
  ));

comment on column university_requirements.evaluation_gate is
  'Non-null means lib/requirements/evaluate.ts MUST return needs_manual_review for this row regardless of what structured_rule says or how well the number matches. An honest "a human should check this" in place of a confident wrong verdict.';

-- binding_commitment was added to the list above after this file was first written, by the
-- evaluator lane. §7 below models binding rounds on university_deadlines, which is the right
-- home for the DATE; the companion REQUIREMENT record ("you are committing to enrol if
-- admitted") is what a student actually reads in the requirement check, and it needs a gate of
-- its own so no structured_rule can ever turn a legal commitment into a satisfied checkbox.
-- lib/requirements/evaluate.ts and lib/validation/requirements.ts both enforce it already, and
-- lib/requirements/shape-audit.ts's deriveEvaluationGate() is what populates it here.

create index if not exists university_requirements_evaluation_gate_idx
  on university_requirements (evaluation_gate) where evaluation_gate is not null;

-- ---------------------------------------------------------------------------------------
-- 5. The unique index that destroys 341 rows  (JUDGEMENT CALL — see design doc Finding 9)
-- ---------------------------------------------------------------------------------------
-- university_requirements_university_type_scope_idx is UNIQUE on
-- (university_id, requirement_type, COALESCE(scope,'')) WHERE program_id IS NULL. It permits
-- exactly ONE requirement per university+type+scope, so a university publishing four
-- alternative English-proficiency routes can store one of them. Migration 0052 built
-- requirement_groups precisely to model "any one of N alternatives satisfies this", and
-- evaluateRequirementGroup() already evaluates that shape — but requirement_groups holds 0 rows
-- because this index prevents the alternatives from ever landing.
--
-- Three options were considered; the design doc argues them in full.
--   (a) Drop uniqueness entirely, rely on application-level dedup. Rejected: removes the only
--       DB backstop, and the programs lane's history shows application dedup drifting from the
--       constraint is how silent loss starts.
--   (b) Widen the key with a content discriminator.  <-- assumed here
--   (c) Keep uniqueness but scope it to requirement_group_id. Rejected: makes the constraint
--       depend on a grouping decision made after ingestion, so it cannot protect the insert.
--
-- (b) folds a hash of the title into the key. Two genuinely different alternatives have
-- different titles and both survive; a true re-ingest of the same fact has the same title and
-- is still caught. The accepted cost, identical to the tradeoff migration 0053 took for
-- programmes: a reworded title inserts a second row rather than being auto-merged — occasional
-- and human-visible (both rows are factually true) rather than systemic and silent.
drop index if exists university_requirements_university_type_scope_idx;

create unique index if not exists university_requirements_university_type_scope_title_idx
  on university_requirements (university_id, requirement_type, coalesce(scope, ''), md5(coalesce(title, '')))
  where program_id is null;

-- The program-scoped index has the identical defect and is strictly worse: UNIQUE
-- (program_id, requirement_type) permits ONE requirement per type per programme, with no scope
-- term at all. It affects fewer rows only because programme linkage is rare today (85 of 1,296
-- corpus records resolve to a programme), which will change as linkage improves.
drop index if exists university_requirements_program_type_idx;

create unique index if not exists university_requirements_program_type_title_idx
  on university_requirements (program_id, requirement_type, coalesce(scope, ''), md5(coalesce(title, '')))
  where program_id is not null;

-- ---------------------------------------------------------------------------------------
-- 6. Deadlines: undated cycles, closed cycles, verbatim text  (forced)
-- ---------------------------------------------------------------------------------------
-- 243 of 466 deadline records carry no usable year. The convention is per-INSTITUTION, not
-- per-country, and the spread is total: TU Berlin publishes 0% undated, Heidelberg and
-- Stuttgart 100%, Oxford and Cambridge 0%, Bonn 88%. Studielink's national 15 Jan / 1 May dates
-- were confirmed undated six times independently against Studielink's own page. So neither a
-- NOT NULL year nor any inference rule is available: inferring a year for Heidelberg fabricates
-- a fact, and refusing to store undated dates discards the majority of German and Dutch
-- deadlines. The recurrence pair below stores what the source actually published.
--
-- 86 records are VERIFIED_HISTORICAL — correctly fetched dates for cycles that have closed. The
-- table has no column marking a row non-actionable, so a bare deadline_date sitting there reads
-- as a live deadline to the deadline engine.
alter table university_deadlines
  add column if not exists recurrence text not null default 'dated_specific',
  add column if not exists recurrence_month smallint,
  add column if not exists recurrence_day smallint,
  add column if not exists cycle_year integer,
  add column if not exists cycle_label text,
  add column if not exists verification_state text not null default 'unverified',
  add column if not exists deadline_text_verbatim text,
  add column if not exists source_type text;

alter table university_deadlines
  drop constraint if exists university_deadlines_recurrence_check;
alter table university_deadlines
  add constraint university_deadlines_recurrence_check
  check (recurrence in ('dated_specific', 'recurring_annual_undated', 'not_published_centrally'));

-- A recurring undated deadline has a month/day and no year; a dated one has a real date. This
-- is the constraint that stops "15 January, every year" being flattened into a specific 15
-- January that will be wrong for every other cycle.
alter table university_deadlines
  drop constraint if exists university_deadlines_recurrence_shape_check;
alter table university_deadlines
  add constraint university_deadlines_recurrence_shape_check
  check (
    (recurrence = 'dated_specific' and deadline_date is not null)
    or (recurrence = 'recurring_annual_undated' and recurrence_month is not null and recurrence_day is not null)
    or (recurrence = 'not_published_centrally')
  );

comment on column university_deadlines.recurrence is
  'dated_specific: deadline_date is a real, cycle-specific date. recurring_annual_undated: the source publishes a day and month with no year, and the year MUST NOT be inferred — the convention is per-institution (TU Berlin 0% undated, Heidelberg 100%). not_published_centrally: a sourced finding that no central date exists, which is different from "not yet researched".';
comment on column university_deadlines.verification_state is
  'VERIFIED_CURRENT | VERIFIED_RECURRING_UNDATED | VERIFIED_UNDATED | VERIFIED_HISTORICAL | NEEDS_REVIEW | CONFLICTING_EVIDENCE | CURRENT_CYCLE_NOT_PUBLISHED. VERIFIED_HISTORICAL rows are real and correctly sourced but describe a closed cycle; read paths must exclude them from anything that reads as actionable.';

create index if not exists university_deadlines_verification_state_idx
  on university_deadlines (verification_state);

-- ---------------------------------------------------------------------------------------
-- 7. Binding deadline semantics  (JUDGEMENT CALL — see design doc Finding 7)
-- ---------------------------------------------------------------------------------------
-- Designed now, populated when the US corpus arrives. The deadline TYPE carries eligibility
-- logic, not just a date: Early Decision is a binding contract, Restrictive Early Action forbids
-- applying early elsewhere. That is a constraint on a student's OTHER applications, which is
-- why it cannot live in free text on one row — the application tracker has to be able to ask
-- "does anything I have already committed to forbid this?".
--
-- 13 records in the current corpus already carry `early` semantics, so this is not purely
-- speculative. What is deferred, and is the founder's call, is whether ORYN actively WARNS a
-- student that a planned application conflicts with a binding commitment they have recorded, or
-- merely displays the restriction. The column supports either; nothing here decides it.
alter table university_deadlines
  add column if not exists binding_policy text;

alter table university_deadlines
  drop constraint if exists university_deadlines_binding_policy_check;
alter table university_deadlines
  add constraint university_deadlines_binding_policy_check
  check (binding_policy is null or binding_policy in ('non_binding', 'binding', 'restrictive_single_choice'));

comment on column university_deadlines.binding_policy is
  'binding: accepting obliges the applicant to withdraw other applications (Early Decision). restrictive_single_choice: applying forbids other EARLY applications but is not itself binding (Restrictive/Single-Choice Early Action). Null means unknown, not non_binding.';

-- ---------------------------------------------------------------------------------------
-- 8. Source conflicts survive as conflicts  (forced)
-- ---------------------------------------------------------------------------------------
-- 18 records in this corpus are CONFLICTING_EVIDENCE (7 requirements, 11 deadlines). There is
-- no policy that resolves them: at Groningen the older-looking page is correct, at Erasmus the
-- newer one is, so "trust the more recent page" gets one right and one wrong. Manchester's own
-- page binds "15 October 2026" to "September 2024 entry" — self-contradicting within one
-- official source, where no cross-source rule helps at all.
--
-- Silently picking a side publishes a date that may be a year wrong. Dropping the records
-- loses sourced research. Both readings are therefore stored, linked, and neither is presented
-- as settled fact.
create table if not exists requirement_source_conflicts (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references universities (id) on delete cascade,
  subject text not null,
  status text not null default 'unresolved',
  resolution_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint requirement_source_conflicts_status_check check (status in ('unresolved', 'resolved', 'superseded'))
);

comment on table requirement_source_conflicts is
  'Groups two or more competing official readings of the same fact. A conflict is a first-class state, not a defect to be silently resolved at ingestion time — see the Groningen/Erasmus pair, where the two correct answers point in opposite directions.';
comment on column requirement_source_conflicts.subject is
  'What the sources disagree about, in product language ("TOEFL threshold for Psychology", "Master application deadline"). Shown to students as the reason a value is withheld.';

alter table university_requirements
  add column if not exists conflict_group_id uuid references requirement_source_conflicts (id) on delete set null;
alter table university_deadlines
  add column if not exists conflict_group_id uuid references requirement_source_conflicts (id) on delete set null;

create index if not exists university_requirements_conflict_group_id_idx on university_requirements (conflict_group_id);
create index if not exists university_deadlines_conflict_group_id_idx on university_deadlines (conflict_group_id);
create index if not exists requirement_source_conflicts_university_id_idx on requirement_source_conflicts (university_id);

-- Matches the read policy every other global reference table uses (universities,
-- university_requirements, university_deadlines, requirement_groups): authenticated read, no
-- client write. Writes happen through the service role in ingestion/admin paths only.
alter table requirement_source_conflicts enable row level security;

drop policy if exists "authenticated read" on requirement_source_conflicts;
create policy "authenticated read" on requirement_source_conflicts
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------------------
-- 9. Traceability back to the research record  (forced)
-- ---------------------------------------------------------------------------------------
-- Today a live requirement row cannot be traced to the research record it came from except by
-- matching text against requirement_research_queue.raw_payload. That is precisely the lookup a
-- reviewer authoring structured_rule needs in order to recover a dropped qualifier, and it is
-- currently a full-text scan over jsonb rather than a key.
alter table university_requirements
  add column if not exists research_record_id text;
alter table university_deadlines
  add column if not exists research_record_id text;

create index if not exists university_requirements_research_record_id_idx on university_requirements (research_record_id);
create index if not exists university_deadlines_research_record_id_idx on university_deadlines (research_record_id);

commit;
