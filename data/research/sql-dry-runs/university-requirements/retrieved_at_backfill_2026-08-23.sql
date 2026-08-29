-- Backfill for 26 university_requirements rows with retrieved_at IS NULL.
-- Investigated 2026-08-23 by ORYN-DATA per ORYN-CEO's request. NOT YET APPLIED — dry-run only,
-- pending CEO's explicit approval to run.
--
-- ROOT CAUSE (confirmed, not guessed): all 26 rows share the identical created_at
-- (2026-08-18 14:54:46.048032+00) and research_record_id IS NULL — a single batch insert that
-- extracted requirement facts (minimum grade, required subject, standardized test, deadline,
-- portfolio, etc.) directly out of each program record's `evidence_excerpt` field in
-- data/research/university-programs/independent_batch{1,2}_2026-08-18.jsonl (commits c72b9b9 /
-- cb91f82, "+7 medicine/psychology at Cambridge, UCL, Edinburgh, KCL, Imperial") and
-- fr_it_es_ch_batch1_2026-08-21.jsonl's ETH Zurich record. That insert predates
-- lib/requirements/ingest.ts's research_record_id/retrieved_at contract (no committed script
-- for it was found in the repo — the extraction+insert appears to have been done as an ad-hoc
-- one-off, not through the standard pipeline) and never carried the source records' own
-- `researched_at` field forward into `retrieved_at`.
--
-- The source date was NOT lost — it is sitting right there on every source record
-- (`researched_at: "2026-08-18"`), and every one of the 26 DB rows' `source_url` matches
-- exactly one `official_program_url`/`source_url` in the source JSONL (verified 1:1, all 10
-- distinct URLs, all dated 2026-08-18 uniformly — no ambiguity, no date variance to resolve).
-- 26/26 are backfillable from a real source date. Zero are "genuinely unknown."
--
-- Recommendation on the genuinely-unknown case (none exists here, but for the general
-- question CEO asked): if a future gap like this has NO recoverable source date, leave
-- retrieved_at NULL rather than substituting created_at (the ingestion timestamp) or today's
-- date — both would silently manufacture a false freshness signal. NULL honestly says
-- "unknown," which is the same principle this corpus's own verification_state taxonomy
-- already applies (VERIFIED_UNDATED exists precisely so "true but no date" isn't confused
-- with "not verified"). retrieved_at should follow the same rule.
--
-- Idempotent by construction, same convention as ecw2/ecw3w4/top5: every UPDATE guarded by
-- source_url AND retrieved_at IS NULL, so re-running is a no-op.
--
-- Separate, related but OUT OF SCOPE finding, not touched here: all 26 rows also carry
-- verification_state='unverified' (the column default) despite data_confidence='high' and a
-- real official_primary source — CEO's request was retrieved_at specifically; flagging
-- verification_state as a related gap for a separate decision, not folding it into this batch.

begin;

update university_requirements
set retrieved_at = '2026-08-18'::date
where retrieved_at is null
  and source_url in (
    'https://www.undergraduate.study.cam.ac.uk/courses/medicine-mb-bchir',
    'https://www.undergraduate.study.cam.ac.uk/courses/psychological-behavioural-sciences-ba-hons',
    'https://www.ucl.ac.uk/study/prospective-students/undergraduate/courses/psychology-bsc',
    'https://www.ucl.ac.uk/study/prospective-students/undergraduate/courses/medicine-mbbs-bsc',
    'https://www.ucl.ac.uk/study/prospective-students/undergraduate/courses/architecture-bsc',
    'https://study.ed.ac.uk/programmes/undergraduate/370-psychology',
    'https://www.kcl.ac.uk/study/undergraduate/courses/medicine-mbbs',
    'https://www.imperial.ac.uk/study/courses/undergraduate/medicine/',
    'https://www.lse.ac.uk/study-at-lse/undergraduate/bsc-international-relations',
    'https://ethz.ch/en/studies/bachelor/bachelors-degree-programmes/architecture-and-civil-engineering/architecture.html'
  );

-- Expected after: 0 rows remain with retrieved_at IS NULL among these 10 source_urls.
select count(*) as still_null
from university_requirements
where retrieved_at is null
  and source_url in (
    'https://www.undergraduate.study.cam.ac.uk/courses/medicine-mb-bchir',
    'https://www.undergraduate.study.cam.ac.uk/courses/psychological-behavioural-sciences-ba-hons',
    'https://www.ucl.ac.uk/study/prospective-students/undergraduate/courses/psychology-bsc',
    'https://www.ucl.ac.uk/study/prospective-students/undergraduate/courses/medicine-mbbs-bsc',
    'https://www.ucl.ac.uk/study/prospective-students/undergraduate/courses/architecture-bsc',
    'https://study.ed.ac.uk/programmes/undergraduate/370-psychology',
    'https://www.kcl.ac.uk/study/undergraduate/courses/medicine-mbbs',
    'https://www.imperial.ac.uk/study/courses/undergraduate/medicine/',
    'https://www.lse.ac.uk/study-at-lse/undergraduate/bsc-international-relations',
    'https://ethz.ch/en/studies/bachelor/bachelors-degree-programmes/architecture-and-civil-engineering/architecture.html'
  );
-- Expect: still_null = 0.

commit;
