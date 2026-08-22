-- 0060 — university_programs.degree_level canonicalization (2026-08-22)
--
-- STATUS: NOT APPLIED TO PRODUCTION. Written to be reviewable and concrete, per the
-- coordination session's explicit instruction on this task ("write it, do not apply it") —
-- same posture as 0056/0057/0059 before their own authorization.
--
-- Full measurement this migration is built from: 14,457 university_programs rows, 42 distinct
-- degree_level values (8-478 characters), reported to the coordinator 2026-08-22 alongside a
-- separate, already-shipped render-path fix (lib/universities/program-format.ts, oryn/degree-
-- level-cleanup) that stops a long value from ever being displayed as a degree label regardless
-- of what this migration does. This migration is the data-side fix that render-path fix was
-- deliberately decoupled from.
--
-- Three distinct problems, confirmed via measurement, not assumed:
--
--   (a) Same concept, two encodings. 'Bachelor / first-cycle' (9,772 rows / 127 universities)
--       and "Bachelor's" (1,120 rows / 11 US universities) name the same thing. Confirmed zero
--       university uses both — a clean per-institution split, purely which acquisition batch
--       touched that school. Safe merge.
--
--   (b) Integrated master's, split by crawl batch, not by fact. 'Bachelor / first-cycle
--       (integrated master's)' is used by 10 universities (264 rows) to flag a UK integrated
--       master's (MEng/MSci/MChem/etc., undergraduate-entry). A wider sweep on degree_type
--       (MEng/MSci/MChem/MMath/MBiol/"Master of ___" patterns) found the SAME real-world
--       category sitting under the plain, untagged value at 15 universities (350 rows) —
--       including straggler rows at Manchester, Cambridge, Imperial and Sheffield, universities
--       that tag it correctly elsewhere in their own data. Per-crawl-batch, not per-university.
--
--       Decision (confirmed with the coordinator): do NOT give integrated master's its own
--       degree_level category. lib/requirements/program-linkage.ts already made and documented
--       this exact call for its own coarse comparison scale (programDegreeLevelSignal): "a
--       finer scheme would manufacture disagreements the sources themselves do not make."
--       Introducing a second taxonomy that disagrees with an existing, reasoned one is worse
--       than either alone. The distinction is not lost — it already lives in degree_type
--       (confirmed: Bath's 60 "hidden" integrated-master's rows already carry
--       degree_type = 'MEng (Hons)'). degree_level stays coarse; degree_type carries the award.
--       This migration only strips the qualifier from degree_level; it does not touch the 350
--       already-correct degree_type values.
--
--   (c) Prose in a categorical field. 17 distinct values exceed 60 characters (92 rows total) —
--       not a category at all in most cases, but a researcher's working note that got typed
--       into the level column: a citation, a caveat about a missing fact, meta-commentary about
--       which section of a university's site a programme was filed under. Toronto Medicine's
--       (478 chars) ends "...duration in years was not found stated in a citable form during
--       this research pass, so is left null rather than assumed" — that sentence is provenance,
--       not a degree level.
--
--       Decision: move the full original text to `notes` (appended, never overwriting existing
--       notes content — every one of these 92 rows already has a populated notes column with
--       ingestion-provenance text, e.g. "Research handoff, program_id ..., researched_at ...").
--       degree_level becomes NULL for all 92 — a real "we don't have a reliable category label
--       for this row" state, not a guess dressed up as one. degree_type is LEFT UNTOUCHED for
--       the 67 of these 92 rows that already have it populated (it already carries the real
--       answer, same principle as (b)). It is backfilled for exactly 2 of the 25 null-degree_type
--       rows in this group, and ONLY because the value is a verbatim substring already present
--       in that row's own stored text — never inferred, never a paraphrase:
--         - 20 Vrije Universiteit Amsterdam rows: degree_level literally begins "Pre-Master's /
--           bridging programme" before its explanatory parenthetical — that exact phrase moves
--           to degree_type verbatim.
--         - 5 University of Oxford rows (2 distinct degree_level strings, same underlying
--           programme type): degree_level literally contains the phrase "Foundation Year" —
--           that exact phrase moves to degree_type verbatim. Deliberately NOT merged into the
--           differently-worded existing "Foundation / pathway year (pre-bachelor's)" value used
--           by a different, unrelated university's 3 rows — that wording does not appear
--           anywhere in Oxford's own stored text, so using it here would be interpretation, not
--           extraction, even though the two describe the same real-world concept.
--
-- After this migration, 23 of the original 42 degree_level values remain (2 merged away, 17
-- nulled away), and degree_level becomes NULL on 92 rows for the first time (0 today). The CHECK
-- constraint at the end of this file is the exhaustive list of what's left — verify it against a
-- fresh measurement before applying, in case another lane's ingestion added a 43rd value between
-- this migration being written and being reviewed.
--
-- Deliberately OUT OF SCOPE: this migration does not touch the ingestion pipeline
-- (lib/programs/ingest.ts, scripts/ingest-university-programs*.ts) that WRITES degree_level —
-- without a corresponding change there, a future ingestion run can still insert a 43rd raw
-- value and violate the CHECK constraint below on its very first write. That is follow-up work,
-- not this migration's job (measuring and cleaning existing data vs. constraining future
-- writes are different problems, and conflating them here would make this file harder to review
-- for what it actually does).

begin;

-- ---------------------------------------------------------------------------------------
-- (a) Merge two encodings of the same concept. Confirmed zero university uses both values,
-- so this cannot silently blend two previously-distinct groups.
-- ---------------------------------------------------------------------------------------
update public.university_programs
set degree_level = 'Bachelor / first-cycle'
where degree_level = 'Bachelor''s';

-- ---------------------------------------------------------------------------------------
-- (b) Strip the integrated-master's qualifier — degree_type already carries the specific
-- award for 263 of these 264 rows (verified: e.g. Bath/Nottingham/Southampton's real MEng
-- rows already carry degree_type = 'MEng' family values under the PLAIN 'Bachelor / first-
-- cycle' value, proving degree_type is where this distinction is meant to live). The one
-- exception (Dublin City University, id ef45e785-567f-498b-bacd-b6fab0d4c5a9) has its own
-- program name literally containing "(Integrated MSc)" — that phrase is extracted verbatim
-- into degree_type, not invented.
-- ---------------------------------------------------------------------------------------
update public.university_programs
set degree_type = 'Integrated MSc'
where id = 'ef45e785-567f-498b-bacd-b6fab0d4c5a9' and degree_type is null;

update public.university_programs
set degree_level = 'Bachelor / first-cycle'
where degree_level = 'Bachelor / first-cycle (integrated master''s)';

-- ---------------------------------------------------------------------------------------
-- (c) Prose values: preserve verbatim in notes (appended, never overwriting the existing
-- ingestion-provenance text every one of these rows already carries), null degree_level.
-- Two exact-string groups get an evidenced degree_type backfill first, extracted verbatim
-- from their own degree_level text before it's cleared.
-- ---------------------------------------------------------------------------------------

-- Vrije Universiteit Amsterdam pre-master's (20 rows) — "Pre-Master's / bridging programme"
-- is the literal opening clause of the row's own degree_level text.
update public.university_programs
set
  degree_type = 'Pre-Master''s / bridging programme',
  notes = coalesce(notes, '') || ' | Former degree_level (migrated 0060): "' || degree_level || '"',
  degree_level = null
where degree_level = 'Pre-Master''s / bridging programme (not a full Master''s degree; prepares students to meet entry requirements for a named Master''s programme)'
  and degree_type is null;

-- University of Oxford foundation year, two distinct stored strings for the same underlying
-- programme type (5 rows) — "Foundation Year" is the literal substring of both.
update public.university_programs
set
  degree_type = 'Foundation Year',
  notes = coalesce(notes, '') || ' | Former degree_level (migrated 0060): "' || degree_level || '"',
  degree_level = null
where degree_level in (
    'Other / pre-degree (Foundation Year, not a Bachelor''s or Master''s in its own right; no ''Degree awarded'' stated on the course''s own page)',
    'Other / pre-degree (Foundation Year, not a Bachelor''s or Master''s in its own right)'
  )
  and degree_type is null;

-- Every remaining >60-character value (degree_type already populated on all of these — left
-- untouched). One statement per exact string, deliberately not a LIKE/regex sweep: this
-- table's own program-linkage module exists specifically because ranked/substring matching on
-- research text has produced real, silent wrong answers before (see lib/requirements/
-- program-linkage.ts's header). Listed longest-first, matching the measurement this migration
-- is built from.
update public.university_programs
set notes = coalesce(notes, '') || ' | Former degree_level (migrated 0060): "' || degree_level || '"', degree_level = null
where degree_level = 'Graduate-entry professional degree (Temerty Faculty of Medicine''s own page describes it as one of "the largest undergraduate medical education programs in Canada", the traditional Canadian label for first-entry-to-practice medical degrees; admission nonetheless requires a prior degree/university study, so it is not a direct-from-high-school Bachelor''s) -- duration in years was not found stated in a citable form during this research pass, so is left null rather than assumed.';

update public.university_programs
set notes = coalesce(notes, '') || ' | Former degree_level (migrated 0060): "' || degree_level || '"', degree_level = null
where degree_level = 'Bachelor / first-cycle, per the Faculty of Dentistry''s own site structure (filed under its ''undergraduate'' prospective-students section) -- though admission requires a minimum of 3 full years of prior university education, so in substance this is a second-entry professional degree despite the faculty''s ''undergraduate'' label; see researcher_notes for the exact eligibility text.';

update public.university_programs
set notes = coalesce(notes, '') || ' | Former degree_level (migrated 0060): "' || degree_level || '"', degree_level = null
where degree_level = 'Graduate-entry professional degree (Faculty of Law''s own site and program materials call it simply the ''JD Program''; Canadian JD/law admission requires prior undergraduate study, so this is not a direct-from-high-school Bachelor''s, despite historically being classed as a ''first professional degree'' in Canada) -- see researcher_notes for the exact eligibility text.';

update public.university_programs
set notes = coalesce(notes, '') || ' | Former degree_level (migrated 0060): "' || degree_level || '"', degree_level = null
where degree_level = 'Staatsexamen / integrated long-cycle (single continuous programme combining what is elsewhere split into separate Bachelor''s and Master''s stages; no intermediate Bachelor''s degree is awarded; used in Hesse for Lehramt an Gymnasien / academic-secondary-school teacher training)';

update public.university_programs
set notes = coalesce(notes, '') || ' | Former degree_level (migrated 0060): "' || degree_level || '"', degree_level = null
where degree_level = 'Teaching-subject extension / supplementary qualification (Erweiterungsfach; adds an additional teachable subject to an existing Lehramt qualification; not a standalone Bachelor''s or Master''s degree in its own right)';

update public.university_programs
set notes = coalesce(notes, '') || ' | Former degree_level (migrated 0060): "' || degree_level || '"', degree_level = null
where degree_level = 'Bachelor / first-cycle (professional/integrated) with optional intercalated PhD -- not a standalone programme, an add-on option for students already on the Medicine MBBS/BSc course';

update public.university_programs
set notes = coalesce(notes, '') || ' | Former degree_level (migrated 0060): "' || degree_level || '"', degree_level = null
where degree_level = 'Bachelor / first-cycle (accelerated, second-entry professional program -- admission requires prior university study, not direct entry from high school; see researcher_notes)';

update public.university_programs
set notes = coalesce(notes, '') || ' | Former degree_level (migrated 0060): "' || degree_level || '"', degree_level = null
where degree_level = 'Graduate-entry professional degree (accelerated route for applicants who already hold a first degree; not a first-cycle school-leaver admission)';

update public.university_programs
set notes = coalesce(notes, '') || ' | Former degree_level (migrated 0060): "' || degree_level || '"', degree_level = null
where degree_level = 'Intercalated BSc (one-year add-on for students already on a medical/dental/health programme, not a standalone first-cycle admission)';

update public.university_programs
set notes = coalesce(notes, '') || ' | Former degree_level (migrated 0060): "' || degree_level || '"', degree_level = null
where degree_level = 'Bachelor / first-cycle, combined with Master / second-cycle (BBA leads directly into the Master of Accounting & Finance)';

update public.university_programs
set notes = coalesce(notes, '') || ' | Former degree_level (migrated 0060): "' || degree_level || '"', degree_level = null
where degree_level = 'Professional / second-entry degree (admitted after a prior undergraduate degree, not directly from high school)';

update public.university_programs
set notes = coalesce(notes, '') || ' | Former degree_level (migrated 0060): "' || degree_level || '"', degree_level = null
where degree_level = 'Bachelor / first-cycle (Honours), combined with a Health Sciences Certificate';

update public.university_programs
set notes = coalesce(notes, '') || ' | Former degree_level (migrated 0060): "' || degree_level || '"', degree_level = null
where degree_level = 'Bachelor / first-cycle (BUT - Bachelor Universitaire de Technologie)';

update public.university_programs
set notes = coalesce(notes, '') || ' | Former degree_level (migrated 0060): "' || degree_level || '"', degree_level = null
where degree_level = 'Bachelor / first-cycle (combined double-degree: BBA + Honours BSc)';

-- ---------------------------------------------------------------------------------------
-- CHECK constraint — the 23 values that remain after the updates above, verified against a
-- fresh distribution measurement immediately before this line was written. Nullable: NULL is
-- now a legitimate "no reliable category label" state (92 rows), not an omission. Re-run the
-- distribution query in this migration's header comment before applying, in case another
-- lane's ingestion has added a value this list doesn't account for yet.
-- ---------------------------------------------------------------------------------------
alter table public.university_programs
  drop constraint if exists university_programs_degree_level_check;
alter table public.university_programs
  add constraint university_programs_degree_level_check
  check (degree_level is null or degree_level in (
    'Bachelor / first-cycle',
    'Master / second-cycle',
    'Doctoral',
    'Doctoral / first-professional',
    'Doctoral (first-professional degree)',
    'Associate / short-cycle',
    'Graduate Certificate',
    'Graduate Diploma',
    'Short-cycle (DEUST) - NOT a full first-cycle degree',
    'Single-cycle (laurea magistrale a ciclo unico)',
    'Foundation / pathway year (pre-bachelor''s)',
    'Combined bachelor''s / master''s',
    'Combined bachelor''s / graduate',
    'Bachelor / first-cycle (Honours)',
    'Bachelor / first-cycle (Licence)',
    'Bachelor / first-cycle (Grado)',
    'Bachelor / first-cycle (professional/integrated)',
    'Bachelor / first-cycle (Licence professionnelle)',
    'Bachelor / first-cycle (Licence Double-Diplome)',
    'Bachelor / first-cycle (combined-subject track)',
    'Bachelor / first-cycle (track/specialisation)',
    'Bachelor / first-cycle (transfer pathway)',
    'Bachelor / first-cycle (combined degrees)'
  ));

comment on column public.university_programs.degree_level is
  'Coarse degree category, canonicalized by migration 0060 to a closed list of 23 values (see that migration''s CHECK constraint for the exhaustive list) after merging two encodings of "bachelor''s" and stripping a UK integrated-master''s qualifier that duplicated what degree_type already carries. NULL means Oryn does not have a reliable category label for this row (92 rows as of 0060) -- the original text, when it existed, is preserved verbatim in notes, never discarded. Prefer degree_type for anything more specific than this coarse scale; see lib/requirements/program-linkage.ts''s programDegreeLevelSignal() for the even coarser undergraduate/graduate/sub_degree comparison signal derived FROM this column. Ingestion (lib/programs/ingest.ts and friends) is not yet updated to only write from this list -- see 0060''s header for why that is deliberately separate follow-up work.';

commit;
