-- Drops nine `_backup_*` tables: ad-hoc, un-migrated rollback snapshots taken directly
-- against the database by various sessions on 2026-08-21/22, before risky bulk writes to
-- university_requirements, university_deadlines, opportunities and university_programs.
-- None were ever created by a tracked migration (confirmed: none of the 68 migrations
-- prior to this one create any of them), none are referenced anywhere in application
-- code, scripts, or tests (repo-wide grep, zero hits beyond two docs that already
-- flagged this exact cleanup as outstanding — docs/current-state.md 2026-08-22,
-- docs/cleanup/ORYN-CLEANUP-REPORT-2026-08-29.md 2026-08-29). All nine carry
-- `rls_enabled_no_policy` in Supabase's own security advisors: RLS on, zero policies,
-- so nothing can read them via the API anyway — the problem this migration fixes is that
-- a fresh production project stood up from this schema would faithfully recreate all nine,
-- inheriting another team's scratch tables and the matching advisor noise on day one.
--
-- Evidence gathered per table (queried against oryn-qa-scratch directly, not inferred)
-- before writing this migration — every backed-up row's id still exists in its source
-- table today, and every observed difference traces to a specific, identifiable,
-- already-completed correction rather than data loss. Full detail in the branch's
-- handoff; summarized per table below.
--
-- IDENTICAL to the live table today (0 of N rows differ across every meaningful column):
--   _backup_university_requirements_2026_08_21  (84 rows -> university_requirements)
--   _backup_university_deadlines_2026_08_21     (26 rows -> university_deadlines)
--
-- DIVERGES from live, but the divergence is a verified, completed correction where the
-- live value is the better one — restoring from these would reintroduce already-fixed
-- problems, not recover anything:
--   _backup_eligible_countries_2026_08_21   (10 rows) and
--   _backup_eligible_countries_2026_08_22b  (3 rows)   -> opportunities. Backup holds a
--     paragraph-length description crammed into the `eligible_countries` array field;
--     live correctly holds that same text in `citizenship_restrictions` (free text) with
--     `eligible_countries` properly emptied or holding actual country names.
--   _backup_language_of_instruction_2026_08_21  (353 rows) and
--   _backup_language_metu_2026_08_21            (53 rows)  -> university_programs.
--     Backup holds a raw research-handoff annotation ("Turkish (source page does not
--     mark this specific program as English-medium; ...)"); live holds the same
--     underlying fact, normalized to the plain value ("Turkish"). Same fact, cleaner.
--   _backup_opportunity_fixes_2026_08_22 (4 rows) -> opportunities. Deadlines and
--     cycle_status corrected since the backup (e.g. one row's status advanced from
--     "upcoming" to "closed" as its cycle actually closed).
--   _backup_edinburgh_osr_2026_08_22 (1 row) -> university_requirements. The clearest
--     case: the live row's own `requirement_detail` text narrates its own repair --
--     "Restored 2026-08-22 after live verification found the corpus had dropped this
--     sentence during a supersession rewrite" -- and now carries evaluation_gate /
--     excluded_provenances the backup never had. The backup is the pre-fix, buggy state.
--   _backup_yokatlas_confidence_2026_08_22 (391 rows) -> university_programs. Every row's
--     data_confidence was uniformly recalibrated from 'high' to 'medium' (verification_
--     state, source_type and URL unchanged) -- a deliberate, conservative correction, not
--     a data loss.
--
-- Not dropped here, and out of scope for this migration: two tables also found during
-- this pass that are staging-shaped and worth naming but ARE referenced by tracked
-- migrations and application code (qs2027_import_staging, global_university_discovery_queue)
-- -- see the handoff for why these are a different category from the nine above.

drop table if exists public._backup_university_requirements_2026_08_21;
drop table if exists public._backup_university_deadlines_2026_08_21;
drop table if exists public._backup_eligible_countries_2026_08_21;
drop table if exists public._backup_eligible_countries_2026_08_22b;
drop table if exists public._backup_language_of_instruction_2026_08_21;
drop table if exists public._backup_language_metu_2026_08_21;
drop table if exists public._backup_opportunity_fixes_2026_08_22;
drop table if exists public._backup_edinburgh_osr_2026_08_22;
drop table if exists public._backup_yokatlas_confidence_2026_08_22;
