-- 0059 — Schema gaps, consolidated (2026-08-22)
--
-- STATUS: NOT APPLIED TO PRODUCTION. Written to be reviewable and concrete, per the
-- coordination session's explicit instruction ("write migrations for what's forced, apply
-- nothing") — same posture as 0056 and 0057 before their own authorization.
--
-- Companion document: docs/handoffs/schema-gaps-design-2026-08-22.md. Read that first — this
-- file implements the items that document marks FORCED AND CONFIRMED (no product-policy
-- judgement required to write the column; several still have a judgement call attached about
-- how the new column is *surfaced*, which this migration does not decide). Every section below
-- maps to that document's own section numbering (A2, A3, A5, B3, C2, D2, D3).
--
-- All changes are additive: new nullable columns default null, CHECK-list widenings are
-- permissive (every existing row is null or already-valid and trivially satisfies a wider
-- list), and the one true Postgres enum widening (D3) cannot be used within this same
-- transaction per Postgres's own ALTER TYPE ... ADD VALUE rule, which this migration does not
-- need to — no row is updated here. Nothing existing is reinterpreted, dropped, or narrowed.
--
-- IMPORTANT PROVENANCE NOTE, read before trusting any comment below at face value: four of the
-- eleven findings originally briefed to the design-doc author (Ghent's "ijkingstoets", Brookes
-- Engage, Vienna's entrance exam, and Manchester's specific "American Studies, two UCAS codes"
-- framing) could not be confirmed against the actual research corpus after a dedicated search —
-- see the design doc's A4/A6/B3 sections for exactly what was searched and what, if anything,
-- was found instead. Those four are NOT in this migration. What follows is only what survived
-- that check: A2 and B3's *general shapes* are confirmed independent of their original
-- citations (verified directly against the live schema, not inferred from an example); A3 is
-- confirmed via a different, real citation (Switzerland's EMS, not Vienna); A5, C2, D2, D3 were
-- independently sourced and were never in doubt. B4 (Wisconsin) turned out to need NO migration
-- at all — already solved by 0054, see the design doc.

begin;

-- ---------------------------------------------------------------------------------------
-- A2. Deadlines have no applicant-scope column (forced — mirrors an existing, proven column)
-- ---------------------------------------------------------------------------------------
-- university_requirements.scope has existed since migration 0042 and is read/written today.
-- university_deadlines has no equivalent, so a genuinely NTNU-shaped pair -- two real deadlines
-- for the same programme, gated on the applicant's citizenship -- cannot currently be told
-- apart from a source conflict once both land, even though neither reading is wrong. Same
-- free-text convention as the existing column: prose like "EU/EEA citizens" / "non-EU citizens",
-- not a closed enum, because the vocabulary is applicant-category language sourced verbatim from
-- admissions pages, not a fixed list this schema should own.
alter table public.university_deadlines
  add column if not exists scope text;

comment on column public.university_deadlines.scope is
  'Applicant group this deadline applies to (e.g. "EU/EEA citizens", "non-EU citizens", "international_undergraduate"), same free-text convention as university_requirements.scope (migration 0042). Null means it applies to all applicants -- NOT "unknown". Two deadline rows for the same university_id+program_id with different, non-null scopes are not a conflict (see requirement_source_conflicts / conflict_group_id for that shape) -- they are two real dates for two real populations.';

-- ---------------------------------------------------------------------------------------
-- A3 / D2. Two CHECK-list widenings on existing text-based "enums"
-- ---------------------------------------------------------------------------------------
-- Both university_requirements.evaluation_gate and .verification_state are plain text columns
-- with a CHECK constraint standing in for an enum (the same pattern 0056 itself used for
-- evaluation_gate, and the same mechanism that migration used when 'binding_commitment' was
-- added to this exact list after the fact -- see 0056's own header addendum). Widening a CHECK
-- list is permissive by construction: every existing row's current value is still in the new,
-- longer list, so this cannot fail against live data.

-- A3: 'cycle_contingent' -- a requirement whose very existence, not just its threshold, depends
-- on a fact unknowable at research time. Confirmed case: Switzerland's EMS
-- (Eignungstest fuer das Medizinstudium), which "activates specifically when the number of
-- study-interested persons exceeds the number of available study places by more than 20 percent"
-- (swissuniversities' own published rule, data/research/admissions-systems/
-- admissions-systems-v1.json) -- already cited in docs/counselor-knowledge/switzerland.md.
-- Distinct from every existing gate reason:
-- those all answer "can THIS row be evaluated"; this one answers "does this row even apply this
-- cycle". Evaluates to needs_manual_review like every other gate -- the distinction is in the
-- reason surfaced to the student/advisor, not in the evaluator's control flow.
alter table public.university_requirements
  drop constraint if exists university_requirements_evaluation_gate_check;
alter table public.university_requirements
  add constraint university_requirements_evaluation_gate_check
  check (evaluation_gate is null or evaluation_gate in (
    'inverted_recency',
    'recency_window',
    'unstated_scale',
    'incomparable_scale',
    'named_exclusion',
    'eligibility_restriction',
    'age_bar',
    'source_conflict',
    'historical',
    'binding_commitment',
    'cycle_contingent'      -- new: requirement's applicability, not just its threshold, is contingent on an unobservable-in-advance fact (e.g. that cycle's applicant volume)
  ));

-- D2: 'staleness_suspected' -- a genuinely different shape from 'conflicting'. conflicting
-- (requirement_source_conflicts, migration 0056 SS8) models TWO OR MORE competing official
-- readings of one fact. Heidelberg's uni-assist question has exactly ONE live reading -- an
-- undated faculty page whose silence is the only counter-evidence -- and a THIRD source found
-- during research (a PDF presented as current 2026 guidance) that turned out to be dated
-- winter semester 2011/12. There is no second competing reading to link via conflict_group_id;
-- filing this as 'conflicting' would assert a disagreement that does not exist. This value
-- names the one-source, freshness-in-doubt case on its own terms.
alter table public.university_requirements
  drop constraint if exists university_requirements_verification_state_check;
alter table public.university_requirements
  add constraint university_requirements_verification_state_check
  check (verification_state = any (array[
    'verified_current', 'verified_historical', 'verified_derived', 'unverified', 'conflicting',
    'staleness_suspected'   -- new: single live source, no competing reading, but the source's own currency is genuinely in doubt (e.g. an undated page whose silence is the only evidence, alongside a dated-decades-old PDF presented elsewhere as current)
  ]));

comment on column public.university_requirements.evaluation_gate is
  'Non-null means lib/requirements/evaluate.ts MUST return needs_manual_review for this row regardless of what structured_rule says or how well the number matches. cycle_contingent (new, 0059): the requirement''s existence this cycle, not merely its threshold, is contingent on a fact unobservable at research time.';
comment on column public.university_requirements.verification_state is
  'verified_current | verified_historical | verified_derived | unverified | conflicting | staleness_suspected (new, 0059). staleness_suspected is a ONE-source state (a single live reading whose own currency is in doubt) -- distinct from conflicting, which requires two or more competing readings linked via requirement_source_conflicts. Do not use staleness_suspected where a genuine second reading exists; use conflicting for that.';

-- ---------------------------------------------------------------------------------------
-- A5. Institution-mediated access (forced column, product-policy call on advisor copy)
-- ---------------------------------------------------------------------------------------
-- opportunities' existing eligibility columns (eligible_countries, eligible_citizenships,
-- eligible_grades, minimum_age/maximum_age) are all personal-attribute checks against the
-- STUDENT's own profile -- confirmed directly against lib/counselor/eligibility.ts's
-- evaluateOpportunityEligibility(), every check in that function reads a student profile field.
-- None represent THIMUN's shape: a student who is personally eligible on every published
-- criterion still cannot apply directly if their own school does not independently run a
-- qualifying programme. This is a precondition on an INSTITUTION, not the student.
alter table public.opportunities
  add column if not exists access_channel text
    check (access_channel is null or access_channel in ('direct', 'institution_mediated'));

comment on column public.opportunities.access_channel is
  'How a student actually applies. direct: the student applies themselves. institution_mediated: the application channel runs through the student''s own school/institution independently choosing to participate (e.g. THIMUN registers through a school''s MUN programme) -- a student can be personally eligible on every other column and still have no path to apply if their institution does not participate. Null = not researched, NEVER assume direct.';

-- ---------------------------------------------------------------------------------------
-- C2. An instrument's consequence, distinct from whether it is met (forced column)
-- ---------------------------------------------------------------------------------------
-- Nothing on university_requirements today states what happens when a requirement is NOT met.
-- requirement_evaluation_status (met | likely_met | not_met | unknown | needs_manual_review,
-- migration 0020) is an evaluation OUTCOME; every part of this product implicitly assumes
-- not_met means "you will not be admitted" -- true almost everywhere, and false for Italy's OFA
-- (the same CISIA test is a binding gate at a restricted-access programme and a non-blocking
-- diagnostic at an open-access one, where a low score triggers a remedial obligation rather than
-- rejection). Sourced independently: docs/counselor-knowledge/italy.md and the underlying
-- fr_it_requirements_bologna_2026-08-21.jsonl / polimi records. (A second, hypothesised instance
-- of this shape -- a mandatory instrument with no pass mark at all -- was checked against the
-- corpus and could not be confirmed; this column's justification rests on the OFA evidence
-- alone, see the design doc's A4/C3 for the withdrawn citation.)
alter table public.university_requirements
  add column if not exists unmet_consequence text
    check (unmet_consequence is null or unmet_consequence in ('blocks_admission', 'triggers_remediation', 'advisory_only'));

comment on column public.university_requirements.unmet_consequence is
  'What actually happens if this requirement evaluates not_met. NULL MEANS blocks_admission -- the current, universal implicit assumption this product has always made, preserved for every existing row and every future row that does not explicitly say otherwise. triggers_remediation: not meeting this requirement does not block admission, it creates a separate downstream obligation (Italy''s OFA is the motivating case -- the same CISIA test is a hard gate at one programme and a remediation trigger at another, at the SAME university). advisory_only: informational, no admission consequence either way.';

-- ---------------------------------------------------------------------------------------
-- B3. UCAS course codes -- plain column only, deliberately NOT added to the dedup key
-- ---------------------------------------------------------------------------------------
-- Confirmed directly: no ucas_code column exists anywhere on university_programs today. UCAS
-- codes currently live only as free text inside researcher_notes on raw research records, never
-- promoted to schema -- the same gap kilavuz_kodu (migration 0057) closed for YOK Atlas.
--
-- Unlike kilavuz_kodu, two CONFIRMED real cases argue against treating a UCAS code as a clean
-- 1:1 programme discriminator, so this migration stops at storing it -- it does NOT widen
-- university_programs_dedup_idx the way 0053/0054 did for official_program_url/degree_type:
--   - Southampton: UCAS code F303 is listed identically for three DIFFERENT MPhys Physics
--     titles ("Physics", "Physics with Industrial Placement", "Physics with Year of
--     Experimental Research") -- one code covering three already-distinguished-by-title rows.
--   - Queen Mary University of London: a course's UCAS-code field is often a space-separated
--     LIST of several codes (full-time / foundation-year / study-abroad variants), not one code
--     per row -- not even a scalar value in every case.
-- Adding this column to the dedup key today, on this evidence, risks the same failure the
-- programmes lane has twice measured and avoided (0053's campus multi-value problem, 0054's
-- Istanbul three-record decision): guessing a schema change to fit an unmeasured population
-- instead of the column earning its place the way official_program_url and degree_type did.
alter table public.university_programs
  add column if not exists ucas_code text;

create index if not exists university_programs_ucas_code_idx
  on public.university_programs (ucas_code)
  where ucas_code is not null;

comment on column public.university_programs.ucas_code is
  'UCAS''s own course code, stored verbatim for traceability -- same posture as kilavuz_kodu (migration 0057): plain column, nullable, NOT backed by a uniqueness constraint, NOT part of university_programs_dedup_idx. Confirmed NOT a safe dedup-key candidate as-is: Southampton shows one code shared across three genuinely distinct titles, and QMUL shows a single row can carry a space-separated list of several codes -- widening the dedup key with this column would need that multi-value shape resolved at the application layer first, not guessed at the schema layer. Backfill and any future dedup-key role are separate, later, measured work.';

commit;
