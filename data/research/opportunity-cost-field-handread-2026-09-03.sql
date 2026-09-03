-- Cost field hand-read pass, 2026-09-03 -- staged, NOT applied. Founder/CEO applies.
--
-- Follow-on to bd's docs/opportunity-cost-field-measurement-2026-09-03.md (commit dc88b931),
-- which hand-read a 34-row stratified sample of the 258 active/null-cost rows. This pass
-- hand-read the remaining ~227 (every active/null-cost row NOT in that sample), using the
-- same four-count discipline as oryn/eligible-grades-prose-sweep-2026-09-03:
--
--   FILL   -- cost explicitly and unambiguously stated in the row's own stored description,
--             as either a plain "free"/no-charge claim (not just "no tuition" or "funded" --
--             see refusals below) or a single, non-tiered, USD figure.
--   REFUSE -- a real number/claim is present but reducing it to one value needs a judgment
--             call the description itself doesn't make (not staged, see accompanying .md).
--   UNREPRESENTABLE -- a real, known price exists in the text, but in a foreign currency or
--             a genuine tiered/range structure the `numeric` cost column cannot hold without
--             fabricating a single figure the source never gave (not staged, see .md's
--             evidence-pile list -- this is the founder's schema decision, not a fix here).
--   SILENT -- no cost-relevant language anywhere in the row's own text (not staged).
--
-- Every WHERE clause below re-checks status='active' and cost is null at write time, matching
-- the live state re-verified immediately before this file was written (2026-09-03).

-- Free / no-cost claims, explicit and unscoped in the row's own text
update public.opportunities
set cost = 0
where id = '1d7aeeff-8ac6-417b-a257-46def5ec701f' -- Hong Kong Baptist University (HKBU)
  and status = 'active' and cost is null;

update public.opportunities
set cost = 0
where id = '455e6fb3-7592-45d4-852a-602acd95bd81' -- Kode With Klossy
  and status = 'active' and cost is null;

update public.opportunities
set cost = 0
where id = '6d62d570-533a-49a4-9f86-aecf5e316b58' -- NYU High School Law Institute
  and status = 'active' and cost is null;

update public.opportunities
set cost = 0
where id = 'bb519c8f-71f8-4e89-83e2-3b7e7a7ebf1f' -- University of Bath International Summer School
  and status = 'active' and cost is null;

update public.opportunities
set cost = 0
where id = 'c35f002c-a4b2-4965-b07f-ba775eb0e31e' -- Wharton Sports Analytics and Business Initiative
  and status = 'active' and cost is null;

-- Single, clean, non-tiered USD price stated in the row's own text
update public.opportunities
set cost = 2500
where id = 'f3487103-c08f-4d56-8ec1-01f93a7eac94' -- Iowa Young Writers' Studio: "cost $2,500 per session", both 2026 sessions same length/price
  and status = 'active' and cost is null;

-- 6 filled. 221 rows read and NOT staged (5 refused, 21 unrepresentable, 192 silent, 3
-- concept-not-applicable) -- see the accompanying findings doc for the full accounting and
-- the reasoning behind every non-fill.
