-- university_programs_dedup_idx widened to include official_program_url. Decision made after
-- measuring against program_research_queue's full audit history and the live table directly
-- (all read-only, zero rows changed) rather than reactively patching each new collision as it
-- was found — see docs/handoffs/program-dedup-key-decision.md for the full evidence, including
-- the two alternatives this rejected (widening on campus/faculty_or_school as raw text; keying
-- primarily on official_program_url instead of alongside the existing columns).
--
-- What this recovers: 11 real rows (University of Bologna, University of Padua) were rejected
-- by this exact index during the priority-country apply run -- decideIngestion's own snapshot
-- said "accepted" (genuinely distinct campus-specific programmes: Nursing at Bologna/Faenza/
-- Rimini, Educational Sciences at Padua/Rovigo, ...), but the database's stricter, URL-blind
-- index caught what the application-layer check couldn't see. Every one of the 11 has a
-- single-value campus AND its own distinct official_program_url per campus (verified directly
-- against program_research_queue's raw_payload, not assumed). None of the 11 are recoverable
-- purely by adding campus instead -- see the design doc for why campus text itself is not
-- reliable here (comma-joined multi-campus lists on some records, e.g. "Milano Leonardo,
-- Piacenza, Mantova" describing where ONE programme runs, not one row per campus).
--
-- Why official_program_url and not campus/faculty_or_school: official_program_url is populated
-- on 100% of the 5,278 live rows today (verified directly) AND is a code-enforced invariant --
-- decideIngestion() already rejects any record missing it, as insufficient_evidence, before a
-- dedup key is ever computed -- so widening with it needs no coalesce() and weakens the key for
-- nobody. campus is only 78.7% populated and, per the multi-value-list finding above, is not
-- even a reliable single-value fact when it IS populated. faculty_or_school is only 32.0%
-- populated, and every observed case where it differed between two colliding records (ETH
-- Zurich: D-MAVT/D-INFK/D-MATH/D-PHYS department codes) was the SAME underlying programme
-- captured with and without its administrative department code on different research passes,
-- not two distinct programmes -- widening on either as raw text would not have recovered
-- Bologna/Padua and would have risked new, spurious duplicate rows for programmes like these.
--
-- This migration also sets official_program_url NOT NULL, making the already-true invariant
-- (100% populated live, enforced in application code) real at the database level too, so a
-- future caller can't silently reintroduce a null and quietly weaken this index back to its
-- pre-migration shape.
--
-- lib/programs/ingest.ts's programDedupKey() and decideIngestion() were updated in the same
-- pass to match this shape, and the previously-separate application-layer "same
-- official_program_url anywhere at this university = duplicate, regardless of name" check
-- (programUrlKey) was removed from decideIngestion's automatic duplicate detection -- measured
-- against program_research_queue directly, it was wrong 53 times out of 54 real firings (every
-- other case: Middle East Technical University, whose entire catalogue -- Architecture,
-- Chemistry, History, an entire separate Northern Cyprus campus, 53 genuinely distinct
-- programmes -- shares one listing-page URL, silently rejected because "Computer Engineering"
-- happened to be accepted first at that same URL). See the design doc for the full breakdown
-- and the accepted residual cost (an occasional same-programme rename at the same URL, like the
-- one real case this check correctly caught, now inserts as two rows instead of being
-- auto-merged).
--
-- Verification performed before writing this migration (2026-08-21, oryn-qa-scratch,
-- read-only):
--   - 5,278 live university_programs rows; official_program_url populated on all 5,278 (100%).
--   - 48 (university_id, official_program_url) groups already have more than one live row
--     (2,781 rows total, the largest a single Manchester listing page with 294) -- confirming
--     widening the index is safe in the "can only split, never wrongly merge" sense: every one
--     of those groups is already distinguished by name today, so adding official_program_url
--     as an additional key column changes nothing for them.
--   - The 11 rows this migration recovers were independently confirmed via
--     program_research_queue's audit trail, not re-derived from memory.

alter table public.university_programs
  alter column official_program_url set not null;

drop index if exists public.university_programs_dedup_idx;
create unique index university_programs_dedup_idx
  on public.university_programs (university_id, normalized_name, coalesce(degree_level, ''), coalesce(language_of_instruction, ''), official_program_url);
