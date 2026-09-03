-- Duplicate-pair resolution — staged cleanup
-- 2026-09-03, oryn-bd, branch docs/opportunity-duplicate-pairs-2026-09-03
--
-- STAGED ONLY. Not applied. Founder review required before running against the live DB
-- (qtcvcflzxbuagvvwahhu) — every write to this data is founder-gated per standing rule.
--
-- ============================================================================================
-- WHY lib/opportunities/dedup.ts AND lib/opportunities/duplicates.ts DIDN'T CATCH THESE
-- ============================================================================================
-- Two separate, real gaps, not one:
--
-- 1. dedup.ts's isDuplicateOpportunity() (the INGEST-time check, called from decideIngestion())
--    only matches on organization+title when BOTH organizations are non-empty:
--        const orgA = (a.organization ?? "").trim().toLowerCase();
--        if (orgA && orgA === orgB && titleSimilarity(...) >= 0.6) return true;
--    When both sides are null (the state of every raw-scrape record until organization gets
--    researched), `orgA` is `""`, which is falsy — so `orgA && ...` short-circuits to false and
--    the org+title path never fires, no matter how similar the titles are. All four pairs below
--    were null-organization on both sides at ingest time. This means the organization-fill work
--    landing now doesn't retroactively fix anything already ingested — it only lets the NEXT
--    ingestion (or a human audit pass, like this one) use org+title matching with confidence.
--    That's the actual shape of "organizations filled or staged for 190 records is the
--    precondition everyone kept deferring to": filling org doesn't dedupe by itself, it just
--    stops blocking the check.
--
-- 2. duplicates.ts's findDuplicateCandidates() (the AUDIT-time check, run via
--    scripts/audit-opportunity-duplicates.ts) groups candidates by exact hostname (stripping
--    only "www."), then only compares titles within a domain group. Real institutions routinely
--    split content across department- or service-specific subdomains — a news office, a
--    continuing-studies portal, a specific school within a university, a health-sciences site
--    unrelated to the actual program — so two pages describing the SAME programme on DIFFERENT
--    subdomains of the SAME institution are never even placed in the same comparison group,
--    regardless of title similarity. Confirmed for all four pairs below by re-deriving the
--    exact hostnames the live tool would compute:
--      global.lehigh.edu          vs  health.lehigh.edu
--      col.ed.ac.uk                vs  study.ed.ac.uk
--      saic.edu                    vs  continuingstudies.saic.edu
--      stonybrook.edu               vs  news.stonybrook.edu
--    None of these four pairs share an exact hostname, so none would ever appear in the tool's
--    output as currently written — this is a structural blind spot in the grouping key, not a
--    similarity-threshold problem. (Not fixed here — that's a code change to a shared module,
--    out of scope for a staged-data task; noted for whoever picks up the fix: grouping by
--    registrable domain (eTLD+1) instead of exact hostname would close it, at the cost of
--    needing a proper public-suffix list for multi-part TLDs like .ac.uk / .edu.tr.)
--
-- METHOD USED HERE: live SQL grouping by exact hostname AND by a registrable-domain heuristic
-- (last 2 labels, or last 3 when the second-to-last label is a short multi-part-TLD component
-- like ac/co/edu/gov and the last is a 2-letter country code), across all 282 active
-- opportunities with an official_url. The registrable-domain pass surfaced ~20 same-institution
-- clusters; each was read individually — most are genuinely distinct sibling programs from one
-- provider (MIT's BWSI/PRIMES/MITES/Zero Robotics; Columbia's Spring/Online/Commuter tracks;
-- UKMT's ten different competitions), which is exactly the false-positive shape
-- duplicates.ts's own code comments already warn about. Four survived as real duplicates.
--
-- ============================================================================================
-- SAFETY CHECK DONE BEFORE PROPOSING ANYTHING (per the brief: "establish what points at each
-- row before proposing anything")
-- ============================================================================================
-- Every id below (both survivor and retiree, all 8) was checked against every table with an
-- opportunity_id column: activities, opportunity_matches, opportunity_sources,
-- saved_opportunities.
--
--   activities: 0 rows for all 8 ids.
--   saved_opportunities: 0 rows for all 8 ids.
--   opportunity_sources: exactly 1 row for all 8 ids (routine provenance, not user data).
--   opportunity_matches: 9 rows for six of the eight ids, 4 for dc762fce, 9 for 30436a92.
--
-- No student has saved or logged an activity against any of these eight records — retiring the
-- losing row in each pair drops nothing a student put there. opportunity_matches rows are
-- computed by a batch job (persist-matches.ts), not authored by a student; they are left as-is
-- below rather than deleted, since a disabled opportunity should simply stop being matched or
-- surfaced by whatever query already filters on status, and the next scheduled match run will
-- naturally stop producing new match rows for a disabled id. If that filter doesn't already
-- exist on the read side, that's a real gap worth checking separately — not assumed here.
--
-- Retirement mechanism: status = 'disabled', matching this repo's own established convention
-- (scripts/audit-opportunity-duplicates.ts's own summary line: "Resolve deterministic/probable
-- pairs by hand (keep the more complete/current row, disable the other via status='disabled')").
-- Rows are never deleted.
--
-- ============================================================================================
-- ORDERING NOTE — two rows here are ALSO touched by an earlier, still-unapplied file
-- ============================================================================================
-- data/research/opportunities/scrape_description_prose_rewrite_2026-09-03.sql already staged a
-- standalone (non-merged) prose rewrite for d12506f1 and dc762fce's description (among others).
-- The two description UPDATEs below (#1 and #3) supersede that file's versions for JUST those
-- two ids — they carry the same prose-quality fix plus the fact merged in from the row being
-- retired. Guards below match the CURRENT LIVE raw-scrape text (verified 2026-09-03, matching
-- the prose-rewrite file's own og11/og25 guards exactly), since that file has not been applied
-- yet either. If the prose-rewrite file runs first, its own og11/og25-guarded statements will
-- flip these two rows to their standalone rewritten text, and the guards below will then
-- correctly no-op (UPDATE 0) rather than clobber anything — re-derive fresh against the
-- then-current text if that happens, same as any other UPDATE 0.
-- ============================================================================================

BEGIN;

-- PAIR 1: Lehigh University — Iacocca Global Entrepreneurship Intensive
-- Survivor: d12506f1 (official_url global.lehigh.edu — a plausible "global programs" page).
-- Retire:   a7a89e1e (official_url health.lehigh.edu/.../graduate-admissions-recruitment-
--           event-schedule — a health-sciences GRAD admissions event page, unrelated to an
--           undergraduate high-school programme; the wrong URL is very likely why this became
--           a second row instead of an update to the first).
-- Merge: a7a89e1e's only facts not already in d12506f1 — "more than 64 countries" and the
-- "four-week residential" structure — folded into the surviving description.
UPDATE opportunities SET description = $merged1$The Iacocca Global Entrepreneurship Intensive (IGEI) is a four-week residential programme at Lehigh University, bringing together American and international high school students from more than 64 countries to build entrepreneurship, leadership, and global-citizenship skills alongside an international network of peers. It's open to academically talented high school sophomores and juniors (U.S. and international, no older than 17 during the programme), and admission requires demonstrated academic achievement plus a record of leadership, service, and interest in entrepreneurship; an early-decision deadline is followed by rolling admission until the programme fills. The two source records merged into this one give inconsistent years for the programme dates (2023 and 2024 ranges both appear) -- check the official page for the current year's exact dates.$merged1$
WHERE id = 'd12506f1-d77e-49c2-9dc8-55fe610da9b0'
  AND description = $og1$Enhance your abilities in entrepreneurship, leadership, and global citizenship as part of an international network of emerging leaders from across the U.S. and around the world at the Iacocca Global Entrepreneurship Intensive. The 2023 program runs June 25 to July 22, 2023. | The early decision deadline is February 19, 2023. After that date, we will admit qualified applicants on a rolling basis until the program maximum is reached. | Academically talented U.S. and international high school students who are current sophomores or juniors at the time of the application deadline may apply. Participants may not be older than 17 during the program dates of June 25 - July 22, 2024 | Applicants must demonstrate academic achievement, an interest in entrepreneurship, and a record of leadership and service activities. Th…$og1$;

UPDATE opportunities SET status = 'disabled'
WHERE id = 'a7a89e1e-a9e3-4a8e-9850-789c609a769d' AND status = 'active';

-- PAIR 2: University of Edinburgh — Pre-University Summer School
-- Survivor: dc762fce (official_url study.ed.ac.uk/summer-school — the more specifically named
--           page, AND the one with an already-verified 2026-08-24 direct fetch confirming
--           current 2026 dates and deadline; live opportunity_matches is only 4 rows for this
--           id vs 9 for the loser, so match generation will need to catch up on the next run).
-- Retire:   30436a92 (official_url col.ed.ac.uk/our-programmes — a general programmes-listing
--           page, not verified as this specific programme's own page; stuck on stale 2025 text).
-- Merge: 30436a92's course example (Pre-University Social Sciences: politics/sociology/social
-- policy/economics via an "Equality" theme) and its "accommodation included in the fee" detail,
-- neither present in dc762fce's own text, folded into the surviving description.
UPDATE opportunities SET description = $merged2$The University of Edinburgh's Pre-University Summer School is a non-credit, two-week residential programme (accommodation included in the fee) covering Social Sciences, Humanities, Design, and the Sciences, for students in their penultimate or final year of high school (ages 16-18), requiring an IELTS score of 6.5 or equivalent. One example course, Pre-University Social Sciences, covers politics, sociology, social policy, and economics through the theme of equality. A 2026-08-24 direct source re-check confirmed the 2026 programme runs June 29-July 10, 2026, with an application deadline of May 19, 2026 (superseding stale 2023/2024/2025 dates that had appeared across the two source records merged into this one). Two related programmes on the same official page -- a Sutton Trust-funded summer school and SUISS -- are separate offerings not covered by this record.$merged2$
WHERE id = 'dc762fce-b83a-4217-a610-290ac2f65f17'
  AND description = $og2$Edinburgh Summer School 2024 | Non-credit bearing, 2 weeks program on Social Sciences, Humanities and Foundation Design btw 03 July-14 July 2023 | 17 May 2023 (17:00 - BST) | For students in their penultimate or final year of high school (age 16-18). Overall IELTS (or equal to) 6,5

Corrected 2026-08-24 (verbatim, study.ed.ac.uk/summer-school): title/year was stale (2024); the real programme runs 29 June - 10 July 2026, ages 16-18, deadline 19 May 2026. cycle_status was incorrectly historical -- the programme had simply not been re-checked, not actually run-and-closed. official_url was already correct, not changed. Two sibling programmes on the same source page (SUISS, a Sutton Trust date) are NOT covered by this row -- may deserve their own rows eventually, not folded in here.$og2$;

UPDATE opportunities SET status = 'disabled'
WHERE id = '30436a92-26fd-4972-a8b3-dce8ad454943' AND status = 'active';

-- PAIR 3: SAIC — Early College Program / Early College Program Summer Institute
-- Survivor: e9c4cd39 (official_url saic.edu/high-school-programs; complete, substantive
--           description already staged for prose rewrite in scrape_description_prose_
--           rewrite_2026-09-03.sql -- no further change needed here).
-- Retire:   7f8281b0 (title "Earn college credit that may transfer to any college you attend"
--           -- a marketing tagline, not a programme name; description is two orphaned
--           fragments, "Connect with visiting artists from around the globe" and a webinar
--           registration date, neither describing the programme itself; official_url is
--           continuingstudies.saic.edu/ecposi/overview -- "ecposi" names the same ECP+ECPSI
--           pairing e9c4cd39's own description already covers in full).
-- No unique fact worth merging: 7f8281b0 contributes nothing e9c4cd39 doesn't already have.
-- One thing worth a human glance rather than asserted here: 7f8281b0's official_url
-- (.../ecposi/overview) may be a more precisely-targeted page than e9c4cd39's
-- (/high-school-programs) -- not swapped in this file since neither was independently
-- re-fetched live to confirm which is actually the better canonical link.
UPDATE opportunities SET status = 'disabled'
WHERE id = '7f8281b0-7fc5-4a06-a03c-7c3f37bbc972' AND status = 'active';

-- PAIR 4: Stony Brook University — Garcia Center high-school research programme
-- Survivor: a37fa810 "Garcia Summer Research Program" (organization already filled: "Stony
--           Brook University (Garcia Center for Polymers at Engineered Interfaces)"; official
--           source is the programme's own page, stonybrook.edu/garcia/summer-program/; has a
--           cost figure ($4,116) and describes the specific 7-week, three-track structure).
-- Retire:   d83d7048 "Garcia Summer Scholars" (organization null; source is a Stony Brook NEWS
--           article ABOUT the programme, not the programme's own page; no cost figure; content
--           is a strict subset of what a37fa810 already states -- same research focus, same
--           center, same "publish or present" outcome, described in less specific terms
--           throughout, e.g. "national competitions" where a37fa810 names the actual venue,
--           the Materials Research Society Fall Meeting).
-- No unique fact worth merging: d83d7048 contributes nothing a37fa810 doesn't already have.
UPDATE opportunities SET status = 'disabled'
WHERE id = 'd83d7048-537b-4450-8dfa-69e709cdb48f' AND status = 'active';

-- Review the two UPDATE 1 / UPDATE 0 description results and the four status-change results
-- above, then:
-- COMMIT;
-- or, if any statement printed UPDATE 0:
-- ROLLBACK;
