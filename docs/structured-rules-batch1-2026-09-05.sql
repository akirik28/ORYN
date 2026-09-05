-- Structured-rule authoring, batch 1 of the targeted-university requirement set (CEO's
-- assignment following docs/requirement-evaluation-manual-review-audit-2026-09-05.md).
-- Step 1 (single end-to-end proof) already done and green: __tests__/requirements/
-- erasmus-ielts-end-to-end-proof.test.ts, row 94a53352 below, real student, real 7.5
-- IELTS score, needs_manual_review -> met, all 4 assertions passing.
--
-- Rule: every row here is a bare, single, unconditional numeric threshold on a named
-- test/GPA/subject, taken directly from the requirement's own quoted text. Per-section/
-- subscore floors, sub-population-conditional rules (a different threshold for American
-- HS Diploma vs IB on the same row), weighted formulas, letter grades (A*AA), and policy/
-- recommendation language ("should consider", "test optional") are NOT structured here --
-- see the companion doc for the full flagged list and why each one isn't safe to encode
-- in the current schema without risking a false "met".
--
-- TOEFL rows need BOTH structured_rule (testName/minScore) AND the test_scale qualifier
-- column (migration 0056, confirmed live) to ever leave needs_manual_review --
-- evaluateTestScore() refuses a bare TOEFL number with no scale (evaluate.ts's own
-- needsScaleQualifier check) regardless of how unambiguous the number looks. Both are set
-- together below, never structured_rule alone, so every UPDATE here either fully
-- completes a row or doesn't touch it.
--
-- Every statement guarded by `and structured_rule is null` -- safe to re-run, will not
-- overwrite a rule someone else adds first.

-- ============================================================
-- Erasmus University Rotterdam
-- ============================================================

-- Row 94a53352 -- "IELTS Academic: minimum 6.0". PROVEN end-to-end (see test file above):
-- real student 6e2f0ff1, real 7.5 score on file, flips needs_manual_review -> met.
update public.university_requirements
set structured_rule = '{"kind":"language_proficiency","testName":"IELTS Academic","minScore":6.0}'::jsonb
where id = '94a53352-4f5f-4a8e-a480-ce206b4ef34b' and structured_rule is null;

-- Row c09b2300 -- "IELTS Academic: minimum 7.0 overall band". Bare, no subscore mentioned.
update public.university_requirements
set structured_rule = '{"kind":"language_proficiency","testName":"IELTS Academic","minScore":7.0}'::jsonb
where id = 'c09b2300-427c-4d04-ab7a-38555ac39da4' and structured_rule is null;

-- Row 57023431 -- "IELTS Academic: 7,0 with minimum subscores of 6,0" -- HAS a per-section
-- floor (6.0 every subscore). NOT structured -- evaluator can't check subscores
-- (assembleRequirementFacts doesn't even read test_scores.subscores). Flagged, see doc.

-- Row d5ecd7f6 -- "Academic IELTS: 6.5 (both subscore and total)" -- explicit per-section
-- floor equal to the overall score. NOT structured, same reason as above.

-- Row 76ff519a -- "IELTS Academic: minimum 6.5 overall band score". Bare.
update public.university_requirements
set structured_rule = '{"kind":"language_proficiency","testName":"IELTS Academic","minScore":6.5}'::jsonb
where id = '76ff519a-4bc3-4723-889d-cb9339d572d0' and structured_rule is null;

-- Row dd0a3de1 -- "IELTS: 7.0 (minimum 6.0 per section)" -- per-section floor. NOT structured.

-- Row 164d193c -- Cambridge/LanguageCert/PTE, all bare overall thresholds, no subscore
-- mentioned, all three named as alternatives (any one suffices) -- structured as three
-- separate rows sharing the same requirement_id is not how this schema works (one
-- structured_rule per row); LanguageCert/PTE encoded here since Cambridge already has its
-- own dedicated rows elsewhere in this university's list (167049139, c13c6d4e, 0c553801,
-- 810e7795, af0f187a all cover Cambridge specifically) -- this specific row's own primary
-- named instrument, read in full context of the requirement group, is ambiguous about
-- which of the three is "the" rule for this row. Left unstructured rather than picking one
-- of three alternatives arbitrarily -- flagged as a multi-instrument-single-row case,
-- same shape as the opportunity multi-program bundling issue from Slice A.

-- Row af0f187a -- "C2 Proficiency/C1 Advanced: minimum overall score of 185; Pearson PTE:
-- 75 with minimum subscores of 65; LanguageCert: 75 with minimum subscores of 65." Same
-- multi-instrument-single-row shape as 164d193c, PLUS PTE/LanguageCert both carry a
-- per-subscore floor. Not structured.

-- Row 892c6aef -- "TOEFL iBT: minimum 90 total score." Bare threshold, pre-2026-rescale
-- scale (90 is only meaningful on the 0-120 scale). Sets test_scale alongside
-- structured_rule -- without it this stays needs_manual_review regardless (unstated_scale
-- gate, evaluate.ts's needsScaleQualifier check).
update public.university_requirements
set structured_rule = '{"kind":"language_proficiency","testName":"TOEFL","minScore":90}'::jsonb,
    test_scale = 'TOEFL_IBT_0_120_LEGACY'
where id = '892c6aef-7e4d-4464-b19d-5d9928bfa01a' and structured_rule is null and test_scale is null;

-- Row 07d6c851 -- "TOEFL iBT: minimum 80". Same treatment as 892c6aef.
update public.university_requirements
set structured_rule = '{"kind":"language_proficiency","testName":"TOEFL","minScore":80}'::jsonb,
    test_scale = 'TOEFL_IBT_0_120_LEGACY'
where id = '07d6c851-fbf0-4eb8-80fa-6b72485f0dda' and structured_rule is null and test_scale is null;

-- Row d43a8a54 -- "TOEFL iBT: minimum score of 90". Same treatment.
update public.university_requirements
set structured_rule = '{"kind":"language_proficiency","testName":"TOEFL","minScore":90}'::jsonb,
    test_scale = 'TOEFL_IBT_0_120_LEGACY'
where id = 'd43a8a54-f6ff-4ed9-b3ed-7aabe31dfcaa' and structured_rule is null and test_scale is null;

-- Row cca3b3a1 -- "TOEFL iBT: minimum score of 94". Same treatment.
update public.university_requirements
set structured_rule = '{"kind":"language_proficiency","testName":"TOEFL","minScore":94}'::jsonb,
    test_scale = 'TOEFL_IBT_0_120_LEGACY'
where id = 'cca3b3a1-38a1-414a-9bd3-007cc8b7236b' and structured_rule is null and test_scale is null;

-- Row 5e0c4c7f -- Cambridge B2 First 170 / C1 Advanced 170 / C2 Proficiency 180 / LanguageCert
-- 65 / PTE 61 -- five alternative instruments named in ONE row's own text, no single "the"
-- rule for this row. Same multi-instrument-single-row shape as 164d193c/af0f187a. Not
-- structured.

-- Row a2e154ce -- "Information about this study programme is only available in Dutch."
-- Not a requirement at all -- an access/language-of-the-page note, nothing to gate.
-- Row d55bf035 -- Dutch admission-article text about VWO profile + Dutch language
-- proficiency, itself a policy citation not a numeric threshold. Not structured.
-- Row 436599dc -- "submit original proof of your English proficiency" -- a document-
-- submission instruction, no threshold. Not structured.
-- Row 01e75376 -- "EUC does not accept Duolingo" -- an exclusion note about which tests
-- are NOT accepted, not itself a threshold on an accepted one. Not structured.
-- Row 10bc564f / 8d3f1ea1 -- exemption-eligibility text (native-speaker-equivalent
-- schooling history, IB English grade thresholds embedded in prose) -- genuinely a
-- different, more complex condition than a bare test threshold; not forced into this
-- schema. Not structured.

-- Curriculum / diploma-equivalence rows (daca85b7, 192c2ad9, 3a3231a1, 25354278, 6c8281dc,
-- e03da53b, 9d1bd450, 4addc7c8, 956e3eac, 9aefb850, b3d0bdfd, 1e861e72, 71df18dd, 304c29d7,
-- c6434bf1, 7a6832c4, 3b56ae56, f456083c) -- Dutch VWO/HBO-propedeuse/foreign-equivalence
-- language, subject-specific Dutch grade thresholds (Wiskunde A/B), IB point totals with
-- HL-subject-count conditions, or a Bachelor-degree prerequisite for a Master's programme.
-- None map cleanly onto this schema's CURRICULA enum (ap/ib/a_level/turkish_curriculum/
-- national_curriculum/other has no "VWO" or "HBO propedeuse" member, and mapping either to
-- "other" would make the rule match any student who happened to pick "other" as their own
-- curriculum type, not students who actually hold a VWO diploma) or onto minimum_grade's
-- flat {minGpa, scale} shape (Dutch subject-specific grades, IB HL-subject-count
-- conditions). Not structured -- flagged as a real, larger gap: this product's own
-- CURRICULA enum has no representation for the Dutch VWO/HBO system at all, which is a
-- separate, prior finding worth its own report, not something to force through here.

-- ============================================================
-- London School of Economics and Political Science
-- ============================================================

-- Row 316e4a75 -- "Mathematics A-level is mandatory" -- a clean single-subject requirement.
update public.university_requirements
set structured_rule = '{"kind":"coursework","subject":"Mathematics","minLevel":"a_level"}'::jsonb
where id = '316e4a75-1952-4240-97a3-7ed853699a9f' and structured_rule is null;

-- Row 8d47e877 -- "at least two traditional academic subjects at A-level... GCSE minimum
-- grade B (6) in English and Mathematics" -- two different conditions on two different
-- qualification types (A-level subject count + GCSE letter/number grades) in one row;
-- coursework's schema is one subject + one level, not expressible together. Not structured.

-- LSE's minimum_grade rows (84343aac, 1f0166d2, 28635ac9, 95382e92, 2104d341, bf8798bc,
-- 3cf248b9, f03a19a9) are ALL A-level LETTER grades (AAA, A*AA, A*AB) or IB POINT TOTALS
-- with a specific higher-level SUBJECT-SCORE breakdown (766, meaning 7-6-6 across three
-- named HL subjects) or a GCSE letter/number grade -- none is a bare {minGpa, scale}
-- number this schema can hold without inventing a numeric encoding for A-level letters
-- that doesn't exist anywhere else in this product. Not structured -- same real gap as
-- the Dutch curriculum rows above, a schema limitation worth its own report.

-- Row eb88eb0a "Test of Mathematics for University Admission (TMUA)" and a849801b "LNAT
-- required" -- name an exam but state no minimum score anywhere in this row's own text
-- (TMUA/LNAT results are typically used holistically at LSE, not against a published
-- cutoff). Nothing to threshold. Not structured.

-- Row 54dae9ab -- "IELTS Academic: 7.0 overall and 7.0 in each component" -- per-component
-- floor equal to the overall score (a stricter, all-sections-must-clear-7.0 case). Not
-- structured, same reasoning as the Erasmus per-section rows above.

-- Row 5364cf8c -- "TOEFL iBT: 100 overall, with a minimum of: 27 Writing, 25 Reading, 24
-- Listening, 24 Speaking" -- explicit per-section floors. Not structured.

-- Row 404a7075 -- "scores must be achieved from one sitting" -- a testing-conditions note,
-- not a threshold. Not structured.

-- ============================================================
-- Massachusetts Institute of Technology (this batch's MIT rows are all curriculum
-- recommendations, not admission gates -- MIT's own English-proficiency thresholds
-- appear later in the full result set, not reached in this first page)
-- ============================================================

-- Rows 7abad438, 50279bf2, 4e30d62d -- "much more likely to succeed... at least some
-- exposure...", "most students well-prepared will have taken...", "should be taking the
-- most challenging... available" -- all explicitly advisory/recommended, MIT's own
-- official language never states these as a hard admission gate. Not structured.

-- ============================================================
-- Bocconi University
-- ============================================================

-- Row c6d8c9a9 -- "TOEFL iBT with a minimum score of 88" (B2-level English requirement).
update public.university_requirements
set structured_rule = '{"kind":"language_proficiency","testName":"TOEFL","minScore":88}'::jsonb,
    test_scale = 'TOEFL_IBT_0_120_LEGACY'
where id = 'c6d8c9a9-6b25-47de-8fbc-2960fdb437bc' and structured_rule is null and test_scale is null;

-- Row 31105285 -- "Duolingo English Test with a minimum score of 110". Bare threshold.
update public.university_requirements
set structured_rule = '{"kind":"language_proficiency","testName":"Duolingo English Test","minScore":110}'::jsonb
where id = '31105285-6263-4b64-8067-665cfc3ea781' and structured_rule is null;

-- Row a3eb4845 -- "IELTS Academic and IELTS Online... minimum overall score of 6.5, with
-- at least 6.0 in every section" -- per-section floor. Not structured.

-- Row c21f7c95 -- "certification OR Bocconi's own proficiency test OR native-speaker
-- status OR citizenship from a majority-English country" -- four alternative satisfying
-- conditions in one row, no single numeric threshold. Not structured.

-- Row 4cb67698 -- Bocconi's own online test, "total score (penalties included) lower than
-- 17 will not be considered" -- a real, bare, single numeric floor on a specifically-named
-- test, even though virtually no student profile will have this exact test on file yet
-- (will honestly read "unknown" until one does -- not fabrication, this is exactly what
-- the requirement states).
update public.university_requirements
set structured_rule = '{"kind":"test_score","testName":"Bocconi Online Test","minScore":17}'::jsonb
where id = '4cb67698-729e-4463-a770-8454914f1add' and structured_rule is null;

-- Row 8562eec1 -- Bocconi test, AI-program-specific Mathematics-area subscore (11/24) --
-- a named sub-area score, same "no subscore facility" reason as the IELTS per-section
-- cases, plus program-specific. Not structured.
-- Row 13c9a987 -- describes the test's format/duration/section counts, no threshold at
-- all. Not structured.
-- Rows 21635b30, 86ab4c4c (curriculum recommendations/no-requirement), 3db82d35, 9d50c5b7,
-- 9fba77c1, 4f7b7ade (minimum_grade: diploma-conditional, formula-based, or fallback-only)
-- -- see the general reasoning above; none structured.

-- Row 227bd59c -- "must have already taken a selection test (Bocconi test/SAT-LSAT-ACT/etc)
-- and obtained a score" -- names four alternative acceptable exams with no threshold on
-- any of them in this row's own text (the actual thresholds are the separate rows above).
-- Not structured.

-- ============================================================
-- Boğaziçi University
-- ============================================================

-- Row 1d46d64c -- required_subject, GCE A-levels "A grade in three subjects relevant to
-- the program" -- "relevant to the program" is a department judgment call per this row's
-- own text, not a fixed subject list; coursework's schema needs one named subject. Not
-- structured.
-- Row ba5a0470 -- standardized_test "Minimum score: 450" -- which test this threshold
-- belongs to is not named anywhere in this row's own detail text (title truncated in this
-- pass's own read -- see the batch-2 follow-up to re-check the untruncated title before
-- deciding). Left unstructured this batch rather than guessing the instrument.
-- Row ad3fee96 -- standardized_test "Three A grades" -- duplicates 1d46d64c's own content
-- under a different requirement_type value; not a numeric test score at all. Not structured.

-- Row 7d2137dc -- "TOEFL iBT Minimum Total Score: 79. TWE (Writing): 22." -- per-section
-- floor (Writing 22) in addition to the total. Not structured, same reasoning as the
-- Erasmus/LSE per-section cases.

-- Row 6ff30cb8 -- describes the remedial program + exemption process, no threshold. Not
-- structured.

-- Row eefe3845 -- "IELTS Academic Overall Score: 6.5. Writing: 6.5." -- per-section floor
-- (Writing 6.5). Not structured.

-- Row a24680e0 -- names three alternative accepted tests (BUEPT/TOEFL/IELTS) with no
-- threshold stated in this row's own text (thresholds are the separate rows above). Not
-- structured.

-- ============================================================
-- California Institute of Technology (Caltech)
-- ============================================================

-- All 13 Caltech rows in this batch (curriculum recommendations for math/science/English/
-- history course-years, the holistic-review minimum_grade narrative text, the SAT/ACT
-- "bucket" ranges Caltech explicitly states have NO cutoff score, and the English-
-- proficiency rows naming no specific accepted-test threshold in this pass's own excerpt)
-- are, by Caltech's own stated policy, deliberately NOT threshold-based -- "Caltech faculty
-- did not decide to require a minimum score... there is no cut-off score" is the
-- institution's own explicit words, not an evaluation gap on this product's side. None
-- structured; this is the single cleanest example in the whole batch of a university
-- whose real, official policy is holistic review, not a checklist -- needs_manual_review
-- is the fully honest answer for every one of these, permanently, regardless of any
-- future admin pass.

-- ============================================================
-- Carnegie Mellon University
-- ============================================================

-- Row 3d327959 -- "TOEFL Essentials: at least an 11 overall... give consideration to
-- subscores of 11 and above" -- subscore mention is advisory ("give consideration to"),
-- not a hard per-section gate; TOEFL Essentials is a distinct instrument from TOEFL iBT
-- with a genuinely different, non-overlapping scale, so it does not need the
-- TOEFL_IBT_* scale-family treatment iBT does (needsScaleQualifier's regex matches on the
-- bare word "toefl", which would incorrectly demand a test_scale here too -- flagged as a
-- real, narrower code gap: the qualifier regex does not distinguish TOEFL Essentials from
-- TOEFL iBT, and SCALE_FAMILY has no entry for Essentials' own 8-16 per-section unified
-- scale at all. Setting test_scale to an iBT family value would be actively wrong for
-- Essentials. Not structured this batch -- a real, narrow gap worth its own follow-up,
-- not papered over with an incorrect scale value.

-- Row 84f2cebd -- "TOEFL iBT... before Jan. 21, 2026: minimum 102, subscores 25+ each" --
-- HAS a per-section floor (25 each) in addition to the overall. Not structured.
-- Row 42133b10 -- "TOEFL iBT... on/after Jan. 21, 2026: minimum 5, subscores 5+ each" --
-- same per-section floor issue, new-scale version. Not structured.

-- Row 78d6cbda -- "Cambridge English Assessment: at least a 191 overall... give
-- consideration to subscores of 191 and above" -- subscore mention is advisory (same
-- reasoning as 3d327959's TOEFL Essentials case); Cambridge doesn't need a scale
-- qualifier (not in SCALE_QUALIFIER_REQUIRED).
update public.university_requirements
set structured_rule = '{"kind":"language_proficiency","testName":"Cambridge English Assessment","minScore":191}'::jsonb
where id = '78d6cbda-4a35-4c3b-a9d7-a32dc9f6db8e' and structured_rule is null;

-- Row e9b2eedc -- "Duolingo English Test: at least a 135 overall... give consideration to
-- [four named subscores] 135 and above" -- advisory subscore mention, same shape as the
-- two rows above.
update public.university_requirements
set structured_rule = '{"kind":"language_proficiency","testName":"Duolingo English Test","minScore":135}'::jsonb
where id = 'e9b2eedc-a903-4ea5-8cae-4f4e8beb2a6d' and structured_rule is null;

-- Row f0a5df6e -- "IELTS (or IELTS Online): at least a 7.5 overall... give consideration
-- to subscores of 7.5 and above" -- advisory subscore mention, same shape.
update public.university_requirements
set structured_rule = '{"kind":"language_proficiency","testName":"IELTS","minScore":7.5}'::jsonb
where id = 'f0a5df6e-147d-4500-9629-49463de13556' and structured_rule is null;

-- Row 24d6c2c9 -- "The School of Computer Science requires an SAT or an ACT score" --
-- names two alternative tests with no minimum score anywhere in this row (CMU's own
-- stated policy for most colleges is bucketed/test-flexible per the rows below, not a
-- fixed cutoff). Not structured.
-- Rows ac80dcf8, bf55a0de, c4ead137 -- describe scoring-policy mechanics (Subject Tests
-- discontinued, superscoring rules, self-report vs official), no threshold. Not
-- structured.
-- Row 51ba305f -- "College of Fine Arts is test optional" -- explicitly no test
-- requirement. Not structured.
-- Row 87154291 -- "test flexible" colleges, students choose which test(s) to submit, no
-- fixed cutoff stated. Not structured.
-- Row ecb19345 -- "scores should be no more than two years old" -- a recency note (this IS
-- expressible via the recency_rule qualifier column, migration 0056 -- but recency_rule
-- needs a specific boundaryDate/anchor this row's own prose doesn't state numerically
-- ("two years old" relative to an unstated application date, not a fixed calendar
-- boundary) -- flagged as needing a qualifier this schema supports in principle but this
-- row's own text doesn't give a fixed date for. Not structured this batch.
-- Row 63dd2132 -- "we'll use your highest overall TOEFL score... don't use MyBest" -- a
-- score-selection/provenance-exclusion policy note (this maps to excluded_provenances,
-- a real migration-0056 column -- SCORE_PROVENANCES needs checking against exactly what
-- "MyBest" corresponds to as an enum value before writing this; deferred to a follow-up
-- pass specifically for provenance-exclusion rows across the whole batch, not mixed into
-- this structured_rule-only pass).

-- Carnegie Mellon's prerequisite_coursework rows (24c5f657, 1fc88cf7, 22ef20fe, 50252cd9,
-- 54a87300, a1556493, af55f6a9, 8dea6f1e) are all per-college, multi-subject YEAR-COUNT
-- checklists ("4 years English, 2 years Mathematics, ...") -- coursework's schema is one
-- subject + one minLevel, not a multi-subject bundle with year-counts; this product's own
-- `courses` facts table has no "years completed" concept per subject either (it has
-- subject/level/gradeValue per course, not a cumulative year count). Not structured --
-- a real, separate schema-shape mismatch (multi-subject bundles), not something to force
-- through as several single-subject rules that would misrepresent the actual requirement
-- (each of these rows IS one bundled requirement, not N independent ones).
