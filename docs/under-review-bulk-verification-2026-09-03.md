# The 107-row under_review bulk population — individually verified

2026-09-03, oryn-6e (was oryn-4e), CEO's brief: verify the ~107-row bulk `under_review` population
individually, the same way the 74-row unverified-cycle package was done. Same rules — no writes to
live, SQL staged, founder applies. Same reframe CEO stated before this started, worth restating since
it shaped the work: `under_review` is `generate_sql.py`'s import-time default, not a quality
judgment — these rows have comparably good or better description length and source_confidence than
the rows from the same import that went live. This was a completion task, not triage.

## Method

8 parallel agents, ~13-14 rows each, same taxonomy and rules as the unverified-cycle package
(official page > official institutional page > secondary source > search snippet; cite the exact URL
and today's date; never force a verdict when the evidence doesn't support one). Given known-blocked
domains from the earlier pass, each agent was briefed with that list up front and told to record a
block as a block, not chase it. One batch (batch 2) needed a background retry after an unrelated host
restart — same infra hiccup class as the earlier package, not a task problem.

## The sort: 84 promotable, 7 dead, 16 unresolvable, out of 107

```
select count(*) from opportunities where status = 'under_review'
  and source = 'Founder school-counselor Drive corpus, cross-checked against official/provider pages 2026-08-15';
-- 107 (matches CEO's own figure exactly, unlike the two prior counts on this and the sibling
--  population that had drifted mid-session)
```

## Confirmed DEAD (7) — recommend disabling, founder's call

| Title | Why |
|---|---|
| Columbia Writing Academy | Multi-signal: login-gated dead URL, absent from Columbia's current program listing AND its dates-and-deadlines page (which names sibling programs individually), only trace is an archived Feb 2025 event page |
| Duke University Talent Identification Program 2024 | **Independently re-confirms an existing docs/known-issues.md finding.** Redirects to a Duke page that never says "TIP"; 2026 pre-college programming is now run by third-party EngageU |
| Harvard Alumni for Global Women's Empowerment Essay Contest | Org's own site frozen since 2022 (copyright), most recent content reference is 2021; own page already disclaims real Harvard ties |
| Microsoft Imagine Cup Junior | **Independently re-confirms an existing DB note from 2026-08-20.** "Junior" absent from the current Imagine Cup site/nav entirely |
| NEW! The Immerse Cambridge Experience: one-week taster | Immerse Education (the company) is alive and thriving; this specific one-week product is absent from an all-two-week-format current lineup — a discontinued product, not a discontinued org |
| Robomaster High School Summer Camp (Shenzhen) | Frozen at a 2020 page explicitly marked "cancelled" (COVID); no successor found; stored description is also a jumbled mix of unrelated programs |
| Vesalius College: Innovative Entrepreneurship Summer Programme | Vesalius merged into Brussels School of Governance in 2021; reviewed BSoG's full current catalog, no equivalent program exists |

**Zero of the 7 rest on a single failed fetch** — each has either a second, independently corroborating
signal (an existing DB/docs finding, a frozen-copyright site, an explicit "cancelled" notice, a
checked successor catalog) or multiple failed access paths to a confirmed-dead specific offering.

## Unresolvable (16) — broken down by why, since the raw count undersells it

**13 of 16 — tool/domain access blocked**, absence of evidence not evidence of a problem:

- Previously known blocks that reproduced again: cty.jhu.edu (×3 separate rows), ku.edu.tr family (×3)
- **New blocks found this pass, worth adding to the known list**: juilliard.edu (persistent Cloudflare
  bot-check, never cleared, two tools), universitycollege.tufts.edu (backend "not authorized," two
  tools), durham.ac.uk (403 + socket hang-up), **perimeterinstitute.ca / insidetheperimeter.ca** —
  this is the exact domain `docs/opportunity-reverification-job-design-2026-08-23.md` used to
  establish ISSYP was dead-since-2023 on 2026-08-23; it now 403s via both WebFetch and a direct
  browser navigation ("403 Access Denied" title), confirmed two independent ways — **access to this
  domain has gotten worse since that research, and its own finding can no longer be independently
  re-confirmed today**. Also: boun.edu.tr/bogazici.edu.tr subdomains fail on TLS certificate
  mismatches (a different failure mode than a deliberate block, equally blocking — hit twice, two
  different batches, two different BOUN101 rows)
- exeter.ac.uk behaved as a soft block: every plausible URL for the specific program (7+ attempts, 2
  tools, fresh tabs) returned a genuine university-branded 404 while sibling pages on the same domain
  loaded fine — couldn't rule out the page simply living somewhere unguessed

**3 of 16 — genuine content-level ambiguity**, page loaded, verdict still unclear:

- **Fordham University** — independently reproduces a block *already noted in the row's own stored
  description* ("login-gated every direct attempt"); treated as confirmed rather than retried
- **Google Computer Science Institute** — org-mismatch confirmed (really Northeastern Illinois
  University via El Centro, not Google), but the program's own dedicated page 404'd on 3 URL variants
  including the one NEIU's own hub page links to — no live source for current cycle dates
- **Lise Kış Tıp Okulu** — additionally, the row's own stored description already cited an elapsed
  cycle before this check even started; the live page itself just couldn't be reached (ku.edu.tr block)

## Cross-cutting patterns, not just a row list

**Org-mismatch is not rare — it showed up in roughly a fifth of the promotable rows.** Confirmed
instances, each checked on the operator's own page, never inferred from a title: ISSOS (St
Andrews/Cambridge/Yale named, real operator is a private Scottish company), Cambridge Future Scholars
Programme (same shape, different private company), UniHive ×2 rows (Cambridge programs, explicitly
disclaims Cambridge affiliation), International Greenwich Olympiad (entirely North London Grammar
School, no Greenwich institution), Stanley Prep/UNAT (not the UN, despite UN HQ venue and branding),
iD Tech (private company renting ~150 campuses), Horizon Inspires/Horizon Academic (private LLC
despite university-caliber mentors), Georgetown Pre-College (really Prelum/Kaplan Inc.), Columbia
Junior Science Journal (really CUSJ, a student publication, not Columbia the institution), Uygulamalı
Moleküler Biyoloji ve Genetik Kampı's own stored *description* names the wrong institution entirely
(Koç, not the actual operator Acıbadem). Two "soft" versions of the same pattern, title names the
parent system rather than the operating unit, not wrong just imprecise: PACT (title names no
institution, but the operating campus genuinely shifted from Princeton to UPenn since the corpus was
written — real drift, not a stale label).

**The dominant cycle_status by far is `date_not_announced` (52 of 84), not because programs are
struggling but because of when this population was imported and when this check ran.** The Aug 18
import is almost entirely Northern-Hemisphere summer programs; checking on Sept 3 means most recently
concluded their 2026 cycle with 2027 simply not posted yet. Several agents had to manually override
their own fetch tooling's date judgment, which repeatedly misjudged clearly-past 2026 dates as
"current" without knowing today's real date.

**Domain migrations and rebrands, found rather than assumed dead**: BETA Camp → Prequel, Inc.;
BRAND-ED → Edconic (still runs the NYT-linked program, now "NYC Summer Academy"); Columbia Junior
Science Journal's stored domain fully DNS-dead, real journal elsewhere; York's "Helix" renamed to
"Spark Lab Summer Program." All 4 promoted with corrected `official_url`.

**Two more URL-only defects, distinct from a rename**: Young Founders Lab's stored URL was a
third-party blog review, not the program's own site (found and corrected). Future Ready
(Waterloo)/Galatasaray both had a generic landing page stored where the real dates lived one click
deeper — same "extractor picked the wrong link" shape already named once tonight, confirmed as a
recurring pattern, not a one-off.

**One duplicate pair surfaced, not resolved here**: "Phillips Exeter Academy" and "Phillips Exeter
Academy - New Hampshire NH" (ids `7761f771…` / `f069afec…`) are the same program (Exeter Summer),
entered twice under different imprecise URLs. Both promoted individually below since both are real
and correctly described once fixed — dedup is a separate, deliberate step once organization exists,
same stance the org-research thread took earlier tonight on its own likely-duplicate pairs, not
re-litigated here.

**One trust flag surfaced and stated plainly rather than smoothed over**: RISE for the World
(Schmidt Futures + Rhodes Trust) had four straight annual cohorts 2021–2024, then silence — no 2025
or 2026 cohort announced anywhere. Real, well-funded, still promoted (`date_not_announced` is
accurate), but the two-year gap is worth someone's attention.

**One eligibility-adjacent note, unrelated to cycle_status, flagged not fixed**: The Diana Award's
own page states eligibility as ages 16-24 — above Oryn's core 14-18 band. Not this task's field to
correct.

**Browser-tool reliability was a real, repeated problem this session** — three separate agents
independently caught the browser pane returning content from a completely unrelated, previously-open
site instead of the page just navigated to (Exeter, Woodstock School India, York University), each
caught via a title/URL mismatch and re-verified on a fresh tab before trusting the read. No finding
above rests on a contaminated read, but this is a tooling issue worth someone's attention if verification
work continues to lean on the browser tool.

## What's not done, named rather than silently skipped

- **The 16 unresolvable rows were not retried with an alternate access path.** Several are plausibly
  resolvable with different tooling (a human browsing normally would likely clear most of the 13
  tool-blocks). Not attempted here — matches the standing rule not to force a verdict past what this
  pass's tools could support.
- **The Phillips Exeter duplicate was not merged.** Both rows promoted individually; a dedup pass is
  a distinct, deliberate step, not folded into this verification task.
- **Corrections found in row *descriptions* (as opposed to official_url/organization) were not
  rewritten** — e.g. Uygulamalı Moleküler Biyoloji ve Genetik Kampı's description still names Koç
  University even though its official_url/organization are now correctly Acıbadem. Flagged, not
  silently fixed — descriptions are prose, not structured fields, and out of this task's scope.

## Prepared SQL — staged, not applied

`data/research/opportunities/under_review_bulk_promotions_2026-09-03.sql` — 84 `UPDATE` statements,
one per promotable row, each preceded by a title comment. Sets `status='active'`, `cycle_status`
(per-row, from the actual finding), `verification_state='verified_current'`, `verified_at`=today,
`organization` (filled for essentially all 84 — this population was 106/107 null before), and
`deadline`/`official_url` where a specific correction was confirmed. Dry-run validated live
(`begin`/`rollback` via the connector) before being written — all 84 statements matched and applied
cleanly, confirmed rolled back after (`select count(*) where status='under_review' and source=...`
read 107 again post-rollback).

Cycle status distribution across the 84: 52 `date_not_announced`, 18 `upcoming` (10 with a specific
ISO deadline), 14 `open`.

The 7 confirmed-dead rows are listed as SQL comments at the end of the file (recommend
`status='disabled'`, a distinct action from promotion, founder's call) rather than included in the
transaction — disabling is a different judgment than promoting and this task's brief was about the
promotable/dead/unresolvable sort, not about executing the dead-row cleanup.
