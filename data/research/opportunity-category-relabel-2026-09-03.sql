-- ORYN — opportunity category miscategorisation, one relabel
-- Built 2026-09-03, read-only against oryn-qa-scratch (qtcvcflzxbuagvvwahhu).
--
-- Full findings: docs/opportunity-category-audit-2026-09-03.md. Summary: this is the one
-- clean case the audit found, not a sample from a longer list. Everything else that shares
-- a category/content mismatch (JAX Summer Student Program, Nuffield Research Placements,
-- Partners for the Future, Simons Summer Research Program, Stanford SASI, Scholastic Art &
-- Writing Awards, Diamond Challenge) is genuinely dual-shaped -- the schema forces a single
-- category where the record legitimately fits two -- and none of them carry a live deadline
-- or hide money a student can't otherwise find. Recorded, not staged; see the doc.
--
-- Breakthrough Junior Challenge is different in kind, not degree: its own official rules
-- page names its prize "$250,000 Post-secondary scholarship" -- the noun IS scholarship, not
-- "prize" or "award" -- and a student searching this catalog under "scholarship" gets 8 rows
-- today, none of them this one. Deadline is 2026-09-15, twelve days from when this was
-- written. Category is a single column here (opportunities.category), not a tag set, so
-- this UPDATE is genuinely lossy: after it runs, the record stops appearing under
-- "competition" even though the entry mechanism (a submitted video) is still, honestly, a
-- competition. That tradeoff is real and is the founder's to accept, not something this
-- file resolves quietly -- see the doc for the second-axis/tag-set alternative.
--
-- NOT WRITTEN: no BEGIN/COMMIT, no --apply flag, nothing executed. Run only after reading
-- the doc and deciding the single-column tradeoff above is acceptable.

update public.opportunities
set category = 'scholarship'
where id = '0412d94f-8b28-4f37-933c-cf6198914c12'
  and title = 'Breakthrough Junior Challenge'
  and category = 'competition';

-- Verification -- expect exactly one row, category = 'scholarship'.
select id, title, category, deadline from public.opportunities
where id = '0412d94f-8b28-4f37-933c-cf6198914c12';
