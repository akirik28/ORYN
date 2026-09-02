# Closing the opportunity-catalog thread: the 19 unresolved rows, and the whole picture

Two things asked: a final judgment-call pass on the 19 rows that came out of four batches
of research with no organization at all, and one short paragraph tying together
everything this thread found. **Recommendations only below — nothing disabled, nothing
staged, no writes.** Disabling a row is a live write and the founder's call.

**Honesty note on this pass specifically**: partway through, the Browser tool stopped
responding (confirmed environmental — even `girlswhocode.com`, opened successfully
earlier this session, was denied). Everything through the sizing pass
(`title-organization-mismatch-sizing-2026-09-02.md`) was independently page-verified, per
this whole thread's own rule. **This pass could not be.** Every new lead below is
search-sourced, cross-checked against 2+ independent results converging on the same
program, but not independently opened. Marked per-row. Whoever applies any of these
should open the page first — the same standard every earlier row in this thread met.

## Per-row recommendations

**Real, findable programs — worth a recovery attempt, specific new source given:**

| Row | Recommended source (found this pass, not page-verified) | Why |
|---|---|---|
| American University, Washington DC | american.edu/summer/precollege/ — names 3 real programs (Eagle Summer, Community of Scholars, HS Summer Scholars) | Multiple independent results converge |
| Lehigh University (×2 rows) | academicoutreach.lehigh.edu/pre-college-programs — "2026 Summer Pre-College Camps," named tracks and dates | Same source resolves both bare-title Lehigh rows |
| Purdue University | purdue.edu/thinksummer/ — "Summer College for High School Students," 31 program options for 2026 | Distinct from the already-resolved Lyles-School row (batch 2) — this is Purdue's general pre-college hub |
| Hong Kong Baptist University | hs-summer.hkbu.edu.hk — dedicated HS page, replaces the stored PDF brochure link | Purpose-built page, better than the original source even if confirmed |
| The Hong Kong Polytechnic University (PolyU) | polyu.edu.hk/summerinstitute/ — "PolyU Summer Institute," named dates and structure | |
| Sabancı University Nanotechnology Winter School | sunum.sabanciuniv.edu/tr/egitim/kis-okulu-tr — SUNUM's own page, replaces the stored PDF | Organization: SUNUM (Sabancı Üniversitesi Nanoteknoloji Araştırma ve Uygulama Merkezi) |
| Pre-College Program (stored URL was an IE bachelor's-admissions event) | ie.edu/ie-summer-school/pre-university/ — "Pre-University Summer Program," ages 15–17 | The row's generic title now has a specific real match |
| King's College London | kcl.ac.uk/summer/summer-on-campus/pre-university-summer-school | Replaces the stored publications-portal link (defect class 3) entirely |
| University of St. Andrews | st-andrews.ac.uk/study/part-time/summer-courses/academic-experience/ — "Summer Academic Experience," ages 16–18 | Replaces the stored researcher-profile link |
| Trinity College London, Ireland | tcd.ie/study/other-courses/summer-schools/, or the more specific Trinity Walton Club STEM Program | Confirms Trinity College **Dublin** (not London) is right, as this thread already found — now with a specific program too, not just the bare institution |
| Nat Geo Slingshot | nationalgeographic.org/society/projects/slingshot — "Slingshot Challenge," a real, active, well-documented National Geographic Society competition | Replaces a stored image-CDN PDF link with the program's real page |

**Weaker lead, flag rather than recommend:**

- **University of Exeter, United Kingdom** — found exeter.ac.uk/study/internationalsummerschool/, but the search results themselves note this reads as a general/university-level summer-school hub rather than confirmed high-school-specific programming, unlike the St Andrews and King's College matches. Worth checking, lower confidence than the others in this list.

**Genuinely bad source data — recommend disable, not recover:**

- **"ECON 1 - 01 Introductory Microeconomics..."** — the stored URL is a UC Santa Cruz *course catalog* listing, not a youth opportunity page. The title is a course code, not a program name. This isn't a badly-sourced real opportunity; it's a scraping artifact that shouldn't be a catalog row at all.
- **"Time: 4:30pm – 5:30pm (Hong Kong time) (time in your region)"** — the title is a webinar's timestamp, not a program name. Same shape: not a recoverable opportunity, a data artifact.
- **"Summer Programs in the Netherlands - 2025"** — the stored URL is a third-party directory's *filtered search results page*, not any single program's page. There is no one organization to resolve here by design — the row itself represents a search, not an opportunity. Recommend disabling or, if the underlying intent was real, replacing with actual named Dutch programs rather than trying to attach one organization to a listings page.

**Genuinely ambiguous — real institution, but title too generic to know original intent, and this pass found no specific program to anchor it to:**

- **Google Computer Science Institute** — this thread's own earlier research found Google's own national CSSI program is reported discontinued since 2022 (multiple secondary sources, not independently confirmed against one primary source). Combined with the stored URL being entirely unrelated (a different university's CS degree page), recommend disabling *this specific row* rather than recovering it — but note a live, different, currently-real opportunity likely still exists (university-affiliated CSSI variants, per the earlier research) if someone wants to re-add it properly sourced, rather than patch this row.

**Deferred, not mine to resolve:**

- **University of Maastricht, Netherlands** — already on oryn-d0's queue as a confirmed `official_url` provenance defect, already flagged for a founder call. Not re-touched here.
- **Duke University Talent Identification Program 2024** — already determined dead/renamed in batch 1 (the successor program is run by a third party, EngageU, not Duke). Recommend disabling or retitling to reflect the successor, founder's call which.

## The whole picture, in one paragraph

Across four research batches (83 rows, 69 organizations resolved), one full-catalog
sizing pass (421 rows checked for a specific trust risk, zero live errors found), and
this closing pass (19 remaining rows, 12 with new specific leads, 3 genuine data-quality
junk, 1 already dead, 1 deferred to another queue, 1 ambiguous): **the `opportunities`
catalog's null-organization problem, which started at 47% of all 421 rows unable to be
deduplicated against, is now understood in full** — not just counted, but traced to its
single 2026-08-18 origin, characterized by three named defect classes, and resolved or
explicitly triaged for all but a genuine handful of rows. **What's fixed**: the code gap
that could have let it recur (`discover.ts`'s missing organization guard, already merged).
**What's staged, awaiting the founder's review gate**: 178 organization values (109 +
69) ready to apply as reviewed `UPDATE` statements. **What remains**: roughly 15-19 rows
that are either genuine data-quality junk worth disabling, one already-dead program worth
retitling, and a handful with strong new leads worth one more research pass by whoever
picks this up — none of it blocking, all of it named specifically rather than left as an
unlabeled gap.
