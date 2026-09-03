-- Cost field hand-read pass, 2026-09-03 -- staged, NOT applied. Founder/CEO applies.
--
-- Follow-on to docs/opportunity-cost-field-measurement-2026-09-03.md (commit dc88b931), which
-- measured the null-cost population (258 active rows) and named two bounded, zero-new-research
-- fill targets: (A) rows whose own stored description explicitly states the programme is free,
-- found by hand-reading rather than keyword search because a keyword sweep of English-only
-- terms found 1 of 4 known cases in that doc's own 34-row sample; and (B) the aid-flagged
-- (financial_aid_available = true) cost-null rows, checking each for a price already sitting
-- in evidence that was never written back to `cost`.
--
-- This file covers: all 8 confirmed-free rows found across the full 258-row hand-read, plus
-- both Bucket B (aid-flagged) fills. A parallel pass by oryn-31 independently hand-read the
-- 227 rows outside the original 34-row sample and found the same 5 free rows plus the same
-- Iowa Young Writers' Studio price by coincidence of overlapping dispatch (CEO gave both
-- sessions the free-but-null population without namespacing); oryn-31 deferred all 6 to this
-- file rather than duplicate the writes -- see
-- data/research/opportunity-cost-handread-31-2026-09-03.sql for their independent 221-row
-- contribution (21 more foreign-currency/tiered rows the schema can't hold, plus a
-- keyword-vs-hand-read comparison on that pool).
--
-- Bucket B was re-queried live rather than trusted from the task brief: 32 rows today, not 28,
-- consistent with concurrent activity on this table tonight. Every fill below was re-checked
-- against the row's current stored `cost`/`status` immediately before writing this file.
--
-- Four-outcome discipline per row (matching this session's own established convention):
--   FILL             -- cost explicitly and unambiguously stated in the row's own text, as
--                        either a plain "free"/no-charge claim (unscoped, not hedged, not
--                        negated) or a single, non-tiered, all-students-pay-it figure.
--   DOCUMENTED       -- a real number/claim exists but reducing it to one column value would
--                        need a judgment call the source itself doesn't make (tiered, ranged,
--                        foreign-currency, mixed-free/paid, or scope-ambiguous). Not staged --
--                        see the accompanying .md's evidence-pile list. This is the founder's
--                        schema decision, not a fix here.
--   NOT APPLICABLE   -- the record pays the student (fellowship/scholarship stipend), so a
--                        null `cost` is already correct, not a gap.
--   SILENT           -- no cost-relevant language anywhere in the row's own text.
--
-- Every WHERE clause re-guards on status='active' and cost is null, so a row already changed
-- by another lane before this runs will simply no-op rather than overwrite.

-- ============================================================================
-- BUCKET A -- explicit, unscoped "this is free" statement in the row's own text
-- ============================================================================

update public.opportunities
set cost = 0
where id = '1d7aeeff-8ac6-417b-a257-46def5ec701f' -- Hong Kong Baptist University (HKBU): "nine free, online summer programmes"
  and status = 'active' and cost is null;

update public.opportunities
set cost = 0
where id = '455e6fb3-7592-45d4-852a-602acd95bd81' -- Kode With Klossy: "Our free (yep, free!) two-week summer program"
  and status = 'active' and cost is null;

update public.opportunities
set cost = 0
where id = '6d62d570-533a-49a4-9f86-aecf5e316b58' -- NYU High School Law Institute: "we offer free, yearlong academic programming"
  and status = 'active' and cost is null;

update public.opportunities
set cost = 0
where id = 'bb519c8f-71f8-4e89-83e2-3b7e7a7ebf1f' -- University of Bath International Summer School: "is a free, online programme (via Microsoft Teams)"
  and status = 'active' and cost is null;

update public.opportunities
set cost = 0
where id = 'c35f002c-a4b2-4965-b07f-ba775eb0e31e' -- Wharton HS Data Science Competition: "This free competition..." / "Free and open to all..."
  and status = 'active' and cost is null;

update public.opportunities
set cost = 0
where id = '7998c901-73b8-4355-8e0d-b1f2cdaf9c16' -- Pre-College Program Virtual Fairs: "Free virtual fairs connecting students/families..."
  and status = 'active' and cost is null;

update public.opportunities
set cost = 0
where id = '2116709f-e222-43c7-95e0-f801053f8f2e' -- Research Program KUSRP 2026: "...ücretsiz bir programdır" (Turkish, "...is a free program")
  and status = 'active' and cost is null;

update public.opportunities
set cost = 0
where id = 'dc08474d-8363-4125-b94e-33460354903e' -- SPINWIP (Stanford): "This 3-week program is completely free to participants"
  and status = 'active' and cost is null;

-- ============================================================================
-- BUCKET B -- single, clean, non-tiered price already stated in the row's own text
-- ============================================================================

update public.opportunities
set cost = 2500
where id = 'f3487103-c08f-4d56-8ec1-01f93a7eac94' -- Iowa Young Writers' Studio: "$2,500 per session" (2026 cycle; both sessions same price; 2027 not yet posted)
  and status = 'active' and cost is null;

update public.opportunities
set cost = 5875
where id = '692aaffc-b50c-4b9d-a91d-8769a7a46e5c' -- Parsons Summer Intensive Studies: "$5,610 tuition plus a $265 university fee" (2026 cycle), both mandatory; optional $2,180 housing excluded
  and status = 'active' and cost is null;

-- ============================================================================
-- 10 filled (8 Bucket A, 2 Bucket B). Every other row read across both buckets is
-- DOCUMENTED, NOT APPLICABLE, or SILENT -- see the accompanying .md for the full per-row
-- accounting, including one row (this task's own worked example, LaunchX) that turned out on
-- verification NOT to support the single price it was assigned with.
-- ============================================================================
