-- university_programs_dedup_idx widened again, adding degree_type. Decided the same way as
-- migration 0053: measured before writing, not reacted to a single found case. See
-- docs/handoffs/program-degree-type-key-decision.md and the ingestion dry-run report it draws
-- on (docs/handoffs/program-ingest-batch-2026-08-21-dry-run-report.md) for the full evidence.
--
-- What this recovers: dry-running the 20-file, 2,383-record backlog (Germany/Netherlands
-- catalogues plus UK/Turkish independent batches) against the current (post-0053) key produced
-- 61 "duplicate" outcomes. Checked every one directly against source records, not sampled:
-- 58 (Durham, Southampton) are the standard UK three-year Bachelor's vs four-year integrated
-- Master's split of the same subject -- e.g. Durham's "Chemistry" as both "MChem (Hons)" and
-- "BSc (Hons)", Southampton's "Aeronautics and Astronautics" as both "MEng" and "BEng" --
-- separately admitted, separately applied-to, genuinely distinct programmes, identical on
-- every column the current key checks (name, degree_level, language_of_instruction,
-- official_program_url) and differing ONLY in degree_type. Zero of the 58 have a repeated
-- degree_type within their collision group -- the check that would have indicated a genuine
-- duplicate rather than a missing discriminator.
--
-- Why degree_type and not something else: this is the third "same name, missing discriminator"
-- pattern found in one day (after campus/faculty, rejected in migration 0053's own decision,
-- and official_program_url, added by that same migration). Measured against the same standard
-- 0053 used to reject campus/faculty:
--   - Population: 2,343 of 2,383 records in the new backlog (98.3%), and 2,346 of 5,342 rows
--     already live (43.9% -- lower here only because most already-live rows predate this
--     specific research pass; the population that actually collides is what matters, and that
--     population is 98.3% covered).
--   - No multi-value contamination observed (unlike campus in the fr_it_es_ch batch, which held
--     comma-joined multi-campus lists on some rows).
--   - No inconsistent-capture contamination observed (unlike faculty_or_school's ETH Zurich
--     department-code cases from 0053's own analysis).
--   - 58 of 58 checked collisions are genuinely distinct programmes; 0 are re-submissions.
-- Cleaner on every axis than either field 0053 rejected.
--
-- What this does NOT fix, deliberately: the same dry run found 3 further collisions at Istanbul
-- University -- two "Isletme" (Business Administration) listings, Iktisat Fakultesi (Faculty of
-- Economics, quota 75) vs Siyasal Bilgiler Fakultesi (Faculty of Political Science, quota 60),
-- identical on every column including official_program_url. Not addressed here, and not
-- addressable by any key shape: YOK Atlas (the source for this entire independent-batch30-44
-- Turkish population) has no stable per-programme URL at all -- confirmed directly in the
-- source's own researcher_notes, every record points at the same portal root because the
-- detail view is a client-side-only modal. Widening with faculty_or_school for three records,
-- on a field that is 32.0% populated and already shown (in 0053's own analysis) to carry
-- inconsistent-capture contamination, would be exactly the reactive, single-case patch this
-- project has avoided all day. These 3 stay audited in program_research_queue as duplicates,
-- replayable once (if ever) a real fix for URL-less sources exists -- not solved by guessing a
-- schema change to fit three records.
--
-- Pre-check performed before writing this migration (2026-08-21, oryn-qa-scratch, read-only):
--   - 5,342 live rows; 0 would violate the new six-column index -- expected by construction
--     (widening an already-unique key can only split existing groups further, never merge two
--     that are already distinct under the narrower key), confirmed directly rather than assumed.
--
-- degree_type has no reliable NOT NULL guarantee the way official_program_url did (that one is
-- gated by decideIngestion before a record is ever decided; degree_type is not) -- 98.3%/43.9%
-- populated, not 100%, so coalesce(degree_type, '') stays required, unlike 0053's bare column.

drop index if exists public.university_programs_dedup_idx;
create unique index university_programs_dedup_idx
  on public.university_programs (
    university_id, normalized_name, coalesce(degree_level, ''), coalesce(language_of_instruction, ''),
    official_program_url, coalesce(degree_type, '')
  );
