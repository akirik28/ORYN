# Closing the opportunity-catalog thread: the 19 unresolved rows, and the whole picture

**Update, same day**: the 11 search-sourced leads below (everything except Exeter) have
since been individually opened and confirmed — see
`organization_research_verified_leads_2026-09-02.sql`. All 11 survived verification
unchanged from what's written below; the 12th (Exeter) did not — it turned out to be
Exeter's own students'-study-abroad page, not a program Exeter runs for outside high
schoolers, confirming the lower-confidence flag it already carried. The per-row table
below is left as originally written (the reasoning doesn't change), with the
verification outcome added as its own column rather than rewritten in place.

Two things asked: a final judgment-call pass on the 19 rows that came out of four batches
of research with no organization at all, and one short paragraph tying together
everything this thread found. **Recommendations only below — nothing disabled.**
Disabling a row is a live write and the founder's call.

**Honesty note on this pass specifically**: partway through, the Browser tool stopped
responding (confirmed environmental — even `girlswhocode.com`, opened successfully
earlier this session, was denied). Everything through the sizing pass
(`title-organization-mismatch-sizing-2026-09-02.md`) was independently page-verified, per
this whole thread's own rule. **This pass could not be, at the time it was written.**
Every new lead below was search-sourced only when first written, cross-checked against
2+ independent results converging on the same program, but not independently opened —
marked per-row at the time. The tool recovered later the same day (it needed the pane
stopped and reopened, not just retried) and all 11 recoverable leads were then opened
directly and confirmed — see the update note above and
`organization_research_verified_leads_2026-09-02.sql`.

## Per-row recommendations

**Real, findable programs — recovery attempted, specific new source given, now verified:**

| Row | Recommended source | Verified |
|---|---|---|
| American University, Washington DC | american.edu/summer/precollege/ — names 3 real programs (Eagle Summer, Community of Scholars, HS Summer Scholars) | ✅ opened directly, live |
| Lehigh University (×2 rows) | academicoutreach.lehigh.edu/pre-college-programs — "2027 Summer Pre-College Camps," named tracks and dates | ✅ opened directly, live |
| Purdue University | purdue.edu/thinksummer/ — Office of Summer and Winter Sessions | ✅ opened directly, live — distinct from the already-resolved Lyles-School row (batch 2) |
| Hong Kong Baptist University | hs-summer.hkbu.edu.hk — dedicated HS page, replaces the stored PDF brochure link | ✅ opened directly, live |
| The Hong Kong Polytechnic University (PolyU) | polyu.edu.hk/summerinstitute/ — "PolyU Summer Institute" | ✅ opened directly, live |
| Sabancı University Nanotechnology Winter School | sunum.sabanciuniv.edu/tr/egitim/kis-okulu-tr — SUNUM's own page, replaces the stored PDF | ✅ opened directly, live |
| Pre-College Program (stored URL was an IE bachelor's-admissions event) | ie.edu/ie-summer-school/pre-university/ — "Pre-University Summer Program," ages 15–17 | ✅ opened directly, live |
| King's College London | kcl.ac.uk/summer/summer-on-campus/pre-university-summer-school | ✅ opened directly, live — replaces the stored publications-portal link (defect class 3) |
| University of St. Andrews | st-andrews.ac.uk/study/part-time/summer-courses/academic-experience/ — ages 16–18 | ✅ opened directly, live — replaces the stored researcher-profile link (defect class 3) |
| Trinity College London, Ireland | tcd.ie/study/other-courses/summer-schools/ | ✅ opened directly, live — confirms Trinity College **Dublin** (not London), as this thread already found |
| Nat Geo Slingshot | nationalgeographic.org/society/projects/slingshot — "Slingshot Challenge" | ✅ opened directly, live — replaces a stored image-CDN PDF link |

All 11 are staged in `organization_research_verified_leads_2026-09-02.sql`.

**Weaker lead — flagged, then disproven on verification:**

- **University of Exeter, United Kingdom** — exeter.ac.uk/study/internationalsummerschool/, opened directly: it's Exeter's own "Go Abroad" page, listing summer schools at *other* universities for Exeter's own enrolled students — not a University of Exeter program for outside high schoolers at all. ❌ Not staged. Remains unresolvable without the original source, same as before this pass.

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
this closing pass (19 remaining rows: 11 recovered and verified, 1 lead disproven, 3
genuine data-quality junk, 1 already dead, 1 deferred to another queue, 1 ambiguous):
**the `opportunities` catalog's null-organization problem, which started at 47% of all
421 rows unable to be deduplicated against, is now understood in full** — not just
counted, but traced to its single 2026-08-18 origin, characterized by three named defect
classes, and resolved or explicitly triaged for all but a genuine handful of rows.
**What's fixed**: the code gap that could have let it recur (`discover.ts`'s missing
organization guard, already merged). **What's staged, awaiting the founder's review
gate**: 189 organization values (109 + 69 + 11) ready to apply as reviewed `UPDATE`
statements — 45% of the entire catalog, sourced from each program's own page. **What
remains**: 7 rows — 3 genuine data-quality junk worth disabling, 1 already-dead program
worth retitling, 1 deferred to oryn-d0's queue, 1 genuinely ambiguous, and 1 disproven
lead (Exeter) still needing its original source — none of it blocking, all of it named
specifically rather than left as an unlabeled gap.
