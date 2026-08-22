# Package V2-9 — sampling design: independent source verification of RES-R1's UWA corpus

**Verifier lane:** RES-V2 · **Date:** 2026-08-22 · **Branch:** `oryn/res-v2-source-verification`
Assigned directly by BASORG: the last unverified corpus in the Australian set, and the one that
matters most — UWA passed RES-R1's own title-token validation *twice* while 182/289 records
(63%) were misclassified postgraduate-as-undergraduate, caught only on a third, full rebuild.
RES-V1's contract pass (V1-8) already confirmed the rebuilt file is internally consistent —
schema, ID discipline, corpus-wide duplicate map, and all three named defect classes re-checked
against the file's own title-token census at 0/0/0. **What hasn't been checked: whether the
file agrees with the live page**, as opposed to agreeing with itself. That gap is exactly the
shape of the original defect — both prior passes were "corpus-valid," not source-verified.

Source: `data/research/university-programs/au_programs_uwa_2026-08-22.jsonl` (107 in-scope
records) + `docs/research/university-programs-au/README.md`, both on
`origin/oryn/res-r1-au-programmes`, inspected read-only via a detached-HEAD worktree.

## Rule 27, applied explicitly rather than left implicit

BASORG adopted a standing rule from this package's own Adelaide finding, in force as of this
package: **"A consistency check between two values cannot detect a single-source origin"** — a
check comparing two derived values must first establish those values have independent origins,
or agreement is tautology. **RES-R1's own defect-class verification (re-running the token
census against the rebuild's own output) and RES-V1's contract pass are both checks of this
kind: the census and the output it checks came from the same classifier.** If the classifier is
wrong, both sides are wrong together and the check passes. Stating this plainly rather than
letting either verdict be read as a second confirmation of the other: **this package's source
pass — live page versus stored record — is the independent-origin check UWA has not yet had.**
Every instrument below is designed to answer that question specifically, not to re-confirm that
the file agrees with itself.

## Robots.txt and the redirect-path rule, checked before anything else

Fresh, independent fetch of `www.uwa.edu.au/robots.txt`: confirms BASORG's claim exactly —
`Disallow: /sitecore` (and `/Sitecore`) present; no rule disallows `/study/` or `/study/courses/`.
Fetched the documented sitemap chain directly: `/study/sitemap.xml` → 302 → `/study/-/media/
sitemaps/sitemap-future-students.xml` (200) — neither hop touches a disallowed path. **Every
fetch in this package requests the permitted `/study/courses/<slug>` form directly, built by
converting the sitemap's own published (disallowed) `/sitecore/content/uwafs/home/courses/<slug>`
form to its permitted equivalent before ever making a request** — the `/sitecore/` form is never
requested at any point in this package, consistent with the corrected methodology and the
standing rule (check the path actually requested, not just where a redirect would land).

## Reconciliation, from a fresh independent fetch — and it closes exactly, on genuinely independent numbers this time

The README's own account of BASORG's earlier reconciliation attempt on this same corpus is a
direct warning against trusting a total that merely closes (113 MJD-exclusions guessed to make
202+113+107=422 — wrong on three terms that cancelled; the real terms are 202 postgraduate +
106 MJD + 108 pre-dedup in-scope + 6 fetch-failures = 422). Not re-deriving that history — testing
today's live state fresh instead: sitemap yields **424 raw `/courses/` URLs → 422 unique after
slug-level dedup** (two slugs appeared twice in the raw sitemap and collapse on dedup — matches
R1's stated 422 exactly, no residual to explain, unlike Adelaide's 1-URL drift). **All 107
committed URLs found in this fresh candidate set — zero missing.** Excluded population: 315
(422 − 107), consistent with 202 postgraduate + 106 MJD + 6 fetch-failures + 1 deduplicated
alias = 315.

## Three instruments, weighted toward the historical defect classes, not a generic re-sample

Per BASORG's instruction: weight toward (1) null-`degree_level`-worthy records that should have
been excluded, (2) Graduate Diploma/Certificate mislabeled as undergraduate — "the worst class,
because a postgraduate credential presented as undergraduate looks correct" — and (3) standalone
Doctor/Master mislabeled as bachelor-integrated. All three were the exact shape of the original
63% defect. **Every check below reads the live page directly — never the stored `program_name`
or `degree_level` text as if it were the fact being tested**, since a title-text self-check is
exactly what RES-V1's contract pass (and RES-R1's own rebuild-verification) already did at
corpus-wide scale; repeating that would confirm the file agrees with itself again, not with the
source.

**1. Content-accuracy random arm, n=20/107, seed `20260822018`.** For each: fetch the live page,
confirm the page's own title and `Course Code` card are consistent with the recorded
`program_name`/`degree_level` — specifically checking for any live-page signal (a "Graduate"
qualifier, a standalone advanced-degree framing) that the title-token method's text-pattern
match on the stored string wouldn't itself reveal. IDs: `v2_9_content_random_arm.json`.

**2. Content-accuracy targeted arm, n=25 — every record in UWA's two highest-risk categories at
full coverage, plus a defect-class-3-focused sample of the largest one:**
- **All 13 Honours records** and **all 2 Associate Degree records** — full coverage, cheap
  populations, and the categories most likely to be quietly confused with a postgraduate
  Honours-adjacent or diploma-adjacent credential.
- **10 of the 25 "Bachelor / first-cycle (integrated master's)" records, seed `20260822019`** —
  this bucket is precisely where defect class 3 (standalone Master/Doctor promoted to
  bachelor-integrated) lived historically (~109 such records pre-rebuild). Checking the live
  page confirms the bachelor-plus-master combination is real and stated as such on the source,
  not inferred from a title string that merely contains both words.
IDs: `v2_9_content_targeted_arm.json`. 5-record overlap with the random arm, left as drawn.
**Unique content-arm total: 40.**

**3. Excluded-population random arm, n=25/315, seed `20260822020` — the sharper test, run in the
direction the historical defect actually pointed.** The original 63% failure was about content
wrongly kept *in* as undergraduate; a rebuild fixing that by excluding harder can just as
plausibly exclude something that should have stayed *in*. Every one of these 25 was excluded by
R1's rebuild for one of: postgraduate (Master/Doctor/Grad-Dip/Grad-Cert), MJD-major-prefix, or a
fetch failure. Checking each against its live page tests whether the exclusion is *actually*
correct — a genuine Bachelor-level degree hiding in the excluded 315 would be exactly the kind
of silent, invisible-to-any-title-census-of-the-output error this package exists to catch,
since it would never appear in a census that only reads the *committed* file. IDs:
`v2_9_excluded_sample.json`.

## URL cardinality (RULE-IDENTITY-001) — confirmed on UWA specifically, not ported from the other four

RES-V1 measured 1.000 URL cardinality corpus-wide; BASORG asked for it confirmed on UWA
specifically since it's post-rebuild. Piggybacked at zero extra fetch cost onto the content-arm
pages above: each of the 40 fetched pages is checked for whether it describes exactly one
program (a single `Course Code`/title pair) or shows signs of a shared listing (multiple codes,
a "this page covers" framing, a major-and-degree combination page of the kind already
identified and excluded elsewhere in this corpus).

## Totals

65 individual page fetches: 40 (content arms, random+targeted, post-overlap) + 25 (excluded
population). Read-only throughout; no researcher file edited; no live DB write.

Pushing this design and all three sample files now, before the first individual-page fetch.
