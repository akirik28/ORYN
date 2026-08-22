# Package V2-9 — results: independent source verification of RES-R1's UWA corpus

**Verifier lane:** RES-V2 · **Date:** 2026-08-22 · **Branch:** `oryn/res-v2-source-verification`
**Read-only throughout.** Design and seeds: `v2_9_uwa-source-verification-design.md` (pushed
before any individual-page fetch). All 65 fetches returned HTTP 200, every one via the permitted
`/study/courses/<slug>` form — the disallowed `/sitecore/...` path was never requested at any
point in this package.

## Headline: UWA holds up under the independent-origin check it hadn't had — 65/65 clean, both directions

**Content-accuracy arms (40 unique records — random + full coverage on Honours/Associate +
targeted integrated-master's): 0/40 flagged.** No live page shows a "Graduate Diploma"/"Graduate
Certificate" qualifier its stored record doesn't; no live page reads as a standalone Master/Doctor
with no Bachelor pairing; title/`Course Code` correspondence exact throughout; no page shows
signs of a shared, multi-program listing (RULE-IDENTITY-001, confirmed on UWA specifically, not
assumed from the corpus-wide 1.000 figure).

**Excluded-population arm (25 records drawn from the 315 URLs the rebuild did NOT keep) — the
sharper test, run in the direction the original 63% defect actually pointed: 25/25 confirmed
genuinely, correctly excluded.** 11 are real `MJD-`-prefixed major/specialisation pages (majors
within a parent Bachelor degree, same category UWA's method is built to exclude); 14 are genuine
postgraduate content (Graduate Diploma, Graduate Certificate, standalone Master, standalone
Doctor), each carrying a plain numeric course code distinct from both the `MJD-` prefix and any
undergraduate coding pattern seen in the 107. **Not one of the 25 is a Bachelor-level degree that
should have stayed in.** This is the check that matters most given the corpus's history — the
historical defect was UWA's `/study/courses/` namespace holding postgraduate content
*wrongly kept as undergraduate*; this arm tests the opposite failure a stricter rebuild could
just as easily introduce (a real undergraduate degree wrongly cut), and finds none.

## Rule 27, applied and stated explicitly rather than left implicit

Per the standing rule adopted from this lane's own Adelaide finding: **RES-R1's rebuild
verification (re-running its title-token census against its own output) and RES-V1's contract
pass are both checks of the same classifier against itself — no independent origin, and
structurally incapable of catching an error the classifier itself would produce identically on
both sides.** That is precisely the shape of the original 63% defect: both pre-rebuild passes
were internally consistent and both were wrong. **This package is the independent-origin check —
live page versus stored record — and it is not a second confirmation of what those two checks
already found.** Read this result as the first time that specific question has been asked of
this corpus, not as agreement with an existing answer.

## Reconciliation — confirmed exactly on fresh, independent data

Fresh sitemap fetch: 424 raw `/sitecore/content/uwafs/home/courses/<slug>` URLs → **422 unique
after slug-level dedup**, matching R1's stated figure exactly, no residual to explain (unlike
Adelaide's 1-URL drift). Converted every one to its permitted `/study/courses/<slug>` form before
any request — the sitemap's own published form is confirmed disallowed
(`www.uwa.edu.au/robots.txt`: `Disallow: /sitecore`, re-verified fresh, no rule against
`/study/`), and the documented sitemap-discovery chain itself (`/study/sitemap.xml` → 302 →
`/study/-/media/sitemaps/sitemap-future-students.xml`) touches neither disallowed path. **All
107 committed URLs found present in this fresh candidate set — zero missing.** Excluded
population: 315, consistent with the README's corrected reconciliation (202 postgraduate + 106
`MJD-` major + 6 fetch-failures + 1 deduplicated alias = 315) — not re-deriving that internal
split further, since the two arms above already tested it directly against live content rather
than re-counting the same categories from the outside.

## A tooling near-miss caught before it became a false "unclear" finding

One of the 25 excluded-sample records (`software-engineering`) initially returned no `Course
Code` match under my extraction regex, and showed no title-text signal either (`bachelor`,
`graduate diploma/certificate`, and `master/doctor` patterns all absent from its `<title>`) —
flagged internally as genuinely unclear rather than assumed clean. Reading the full page
directly resolved it immediately: the card renders as **`COURSE CODE MJD-ESOFT`** (all
uppercase), not the title-case `Course Code` label every other sampled page in this batch used —
a page-template variation UWA's own site carries, not a data defect. My first extraction regex
was case-sensitive and missed it. Re-ran with case-insensitivity across all 25: confirmed
`MJD-ESOFT` is a genuine major page (Software Engineering, a specialisation within "Bachelor of
Engineering (Honours)," CRICOS `106081B`), correctly excluded, same as the other 10 `MJD-`
records in this sample. Naming this plainly because it's the same shape as five earlier
near-misses this session (Southampton's shortened `<title>`, St Andrews' `</title >` trailing
space, Monash's nested `offering[].display_name`, the NYT 403 page's coincidental content-score
match, V2-4's `current_cycle_label` false-holds) — a case my own tooling would have silently
mis-scanned, caught by reading the actual page before concluding anything, not after.

## Bottom line

**UWA passes the check its history most needed** — not a repeat of the classifier's own
self-consistency (already done twice, both times wrong), but a live-source check in both
directions: every included record's live page agrees with what's stored (40/40), and every
excluded candidate sampled is genuinely not a Bachelor-level degree that should have been kept
(25/25). Combined with RES-V1's independent contract pass (schema, ID discipline, corpus-wide
duplicate map, taxonomy consistency) and RES-R1's own token-census rebuild verification, UWA now
has what it didn't have before this package: an independent-origin check that could have
disagreed and didn't.

**This closes source verification on the entire Australian corpus** — UNSW, Sydney, and Monash
verified in V2-5 (82/544 sampled, zero defects); Adelaide verified in V2-8 (one labeling-accuracy
defect found and routed to RES-R1, low practical impact, isolated to one category); UWA verified
here (0/65 defects, the historically riskiest of the five). 651 records, five universities, both
verifier lanes, three of the original eight AU universities deferred on policy grounds
(Melbourne, ANU, Queensland) rather than silently dropped.
