# Package V2-8 — sampling design: independent source verification of RES-R1's Adelaide corpus

**Verifier lane:** RES-V2 · **Date:** 2026-08-22 · **Branch:** `oryn/res-v2-source-verification`
Assigned directly by BASORG, outside the usual RES-V1-first queue, because Adelaide currently
carries **zero independent verification** — ORYN-CEO instructed RES-R1 to self-verify and label
the result as self-verified rather than let it read as equivalent to a real pass, which is
honest but not a substitute for a second party, per today's UWA lesson (RES-R1's own validation
passed twice, 63% wrong; it took RES-V1's cross-university comparison to find the gap).

Source corpus: `data/research/university-programs/au_programs_adelaide_2026-08-22.jsonl` (119
in-scope records) + `docs/research/university-programs-au/README.md` (methodology), both on
`origin/oryn/res-r1-au-programmes`, inspected read-only via a detached-HEAD worktree — no
researcher file touched.

## Four independent questions, four small instruments — sized to the population, not ported from V2-5

Adelaide's in-scope population (119) is much smaller than the UNSW/Sydney/Monash corpus (544)
V2-5 checked, so this reuses that package's *method* (seeded, targeted+random, pre-registered)
without porting its *category weighting* — Adelaide's own load-bearing edge cases are different
(non-award pathways, plain undergraduate diplomas, on-campus/online duplicate-coded pairs, and
the domestic/international variant split), so the targeted arm is built from Adelaide's own
distribution, re-derived from the committed file, not from Monash's AQF-encoding concerns.

### 1. Reconciliation — the 560/559/119 funnel, checked against a fresh independent fetch, not the report

Per BASORG's explicit instruction (their own UWA reconciliation "closed perfectly on three wrong
terms that cancelled" — closure is not verification). Re-fetched `adelaide.edu.au/sitemap.xml`
directly (not from any RES-R1 artifact — the raw 559-title census itself was never committed,
so this is the only independent handle on the top of the funnel): **562 raw `/study/degrees/*`
URLs**, minus one identifiable pre-filter utility page (`/compare-degrees/`, a comparison tool,
not a program) = **561**. R1's stated stage-1 fetch was **560**. The one-URL residual is not
chased further — this is a live, actively-maintained sitemap (`lastmod` timestamps within the
last 24 hours on several entries, including a `master-of-philosophy/` page modified yesterday),
and a 1-URL drift between R1's fetch and mine hours-to-a-day later is ordinary site movement,
not investigated down to a specific URL since R1's own raw stage-1 URL list isn't a committed
artifact to diff against. **Both of R1's two individually-named exclusions independently
confirmed present in my fresh fetch**: `/study/degrees/2027/` (the stated 404/stray
year-navigation URL) and `/study/degrees/legacy/` (the stated single blank-title record) both
exist exactly as described. **All 119 committed `official_program_url` values are present in my
fresh sitemap fetch** — zero missing, no evidence of a stale or since-removed program page in
the committed set.

The remaining question — does the 215/126/98 internal split among the *excluded* 440 hold up —
can't be checked against a file (none exists), so it's tested by direct sampling instead:
**random classification sample, n=25/561 candidate URLs, seed `20260822014`.** For each: fetch,
read the page's own title and structure, classify into in-scope / majoring-variant /
standalone-postgrad / grad-dip-cert / blank using R1's own documented rules (title contains
"majoring in"; standalone Master/Doctor with no Bachelor; Graduate Diploma/Certificate; blank
title), and cross-check the classification against whether the URL is or isn't one of the
committed 119. IDs: `v2_8_classification_sample.json`.

### 2. Field-content accuracy on the 119 in-scope records

**Random arm, n=25/119 (21%), seed `20260822015`.** Standard field check (`program_name`,
`degree_level`, `degree_type`, `duration`) against the live international-variant page — same
method as V2-5. IDs: `v2_8_content_random_arm.json`.

**Targeted arm, n=19 — Adelaide's own edge categories, not Monash's:**
- **All 11 records in Adelaide's three smallest, newest-to-this-corpus categories**, checked at
  full coverage rather than sampled since the population is cheap: 3 non-award pathway
  (`AU-R1-adelaide-001` ATSIP, `085` CASM, `089` Foundation Studies), 5 plain undergraduate
  Diploma (`086`–`088`, `118`, `119` — a category the README notes UWA had zero of, so it has no
  precedent pass/fail base rate from elsewhere in this org), 3 Associate Degree (`090`–`092`).
- **4 of the 7 on-campus/online duplicate-title pairs (8 records)**, seed `20260822016`:
  Criminology, Construction Management, Construction Management (Honours), Information
  Technology. Checks two things at once: the field-accuracy question, and whether the pairs
  really are distinct offerings with different `Program code`s (as R1 claims) rather than an
  accidental duplicate that should have been deduplicated.
IDs: `v2_8_content_targeted_arm.json`. Total unique content-arm records after a 3-record overlap
between the random and targeted draws (`085`, `089`, `104` — left as drawn, not resampled, since
re-confirming a record from two independent draws is reinforcing, not wasted): **41**.

### 3. The domestic/international invariance claim, and whether the variant labels are accurate

This is the package's namesake question, and the one BASORG called "the assumption everything
else rests on." Two-part check, both requiring a direct fetch of both URL variants — the bare
`official_program_url` (documented as serving the international variant by default, to any
requester with no session state) and the same path with a `dom/` suffix appended (documented as
the domestic variant) — since Adelaide records both under one URL family, not two separately
tracked fields.

**Sub-sample of R1's own 18-programme domestic-sample, n=8, seed `20260822017`**: `007`, `013`,
`025`, `031`, `049`, `061`, `085`, `091`. For each, fetch both variants directly and check:
- **Invariance** (R1's claim: title/`Program code`/base duration identical across variants,
  0/18 mismatches) — re-confirm on this sub-sample by direct string comparison, not assumed to
  hold because the larger claim says so.
- **Label accuracy** — does the bare URL's own page content self-identify as
  "...Information for International students" and the `/dom/` URL as "...Information for
  Domestic students"? This is the specific risk BASORG named: a field recorded as international
  that actually came from the domestic page (or vice versa) would be invisible to any check that
  only compares the two variants' *content* to each other without checking what either one
  actually claims to be.
- **The genuine-difference claim** — spot-read the actual `entry_requirements`/`study_mode` text
  on both variants for at least 2–3 of the 8, confirming the recorded difference (international:
  full-time-only with explicit "part-time not available" prose and a country-equivalency table;
  domestic: full-time-or-part-time and an ATAR-cutoff scheme) is real prose on the page, not a
  categorical assumption.
IDs and R1's recorded values for comparison: `v2_8_dominvariance_sample.json`. 5 of these 8
records' bare-URL fetch is already covered by the content arms above (`025`, `031`, `085`,
`091`, `013`) — reused rather than re-fetched; 3 need a fresh bare fetch (`007`, `061`, `049`)
plus all 8 need the `/dom/` fetch, which no other arm covers.

**International-labeling check on non-domestic-sampled records**: piggybacked onto the content
arms above at zero extra cost — every one of the 41 content-arm fetches also gets its banner
text checked for "Information for International students," extending the labeling-accuracy
check beyond just the 18 R1 already flagged as domestic-sampled.

## Robots.txt and fetch-shape rules for this package specifically

- `adelaide.edu.au/robots.txt` re-verified fresh, independently, right now: `User-agent: * /
  Disallow:` (empty — fully permissive), matching BASORG's claim exactly. `www.adelaide.edu.au`
  301-redirects to the bare domain, so there is only one real host/robots.txt in play here, not
  two to reconcile.
- **Applying RES-V1's UWA finding directly**: a redirect-following fetch (`curl -L`) requests
  the *original* URL first. None of this package's URLs are known to redirect (unlike UWA's
  `/sitecore/` case), but every fetch in this package checks the path actually being requested
  against the empty-disallow robots.txt before following anything, not just the final
  destination, as a standing practice now rather than only when a redirect is already suspected.
- RULE-FETCH-001/005 shapes apply as always if anything unexpected turns up (a challenge page, a
  wildcard block on a differently-hosted asset) — not expected given the clean robots.txt, but
  not assumed absent either.

## Totals

77 individual page fetches: 25 (classification sample) + 41 (content arms, random+targeted,
post-overlap) + 3 (dom-sample bare URLs not already covered) + 8 (dom-sample `/dom/` URLs).
Read-only throughout; no researcher file edited; no live DB write.

Pushing this design and all four sample files now, before the first individual-page fetch.
