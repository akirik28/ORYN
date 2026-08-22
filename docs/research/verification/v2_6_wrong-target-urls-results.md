# Package V2-6 — results: wrong-target `official_url`s in `opportunities`

**Verifier lane:** RES-V2 · **Date:** 2026-08-22 · **Branch:** `oryn/res-v2-source-verification`
**Read-only throughout.** Design and seeds: `v2_6_wrong-target-urls-design.md` (pushed before
any fetch). Every one of the 85 sampled rows (70 random + 15 targeted) has an individual
disposition below or in the linked data files — nothing was sampled and left unresolved.

## Headline: Type A/B combined rate in the random arm is 2/70 (2.9%) — well below BUG-1's 31% floor, not above it

This is the opposite of what the design doc's fail-threshold section was framed to detect.
That framing asked "does the combined rate land near 31%, or meaningfully above it (45%+)?"
— both readings assumed Type B adds *on top of* BUG-1's known 31%. It doesn't. **Only 1 Type A
and 1 Type B turned up in the random 70** (Wilson 95% CI on the strict 2/70: **0.8%–9.8%** —
even the upper bound of the interval sits well under 31%, let alone 45%).

Reconciling this against the design doc's own concern (§"Why random is the only instrument"):
BUG-1's 31% is a floor measured from **description-signature** defects — restated titles,
embedded URLs, mid-word truncation inside the free-text fields. That is a different failure
surface from "does `official_url` itself point at the right website," which is what this
package measures. The two turned out to be largely orthogonal: most of the population's
already-known 31% is a text-formatting problem, not a wrong-destination problem. **The
`official_url` field specifically is mostly trustworthy** — that's the finding, stated plainly
because it cuts against the direction BASORG's framing anticipated.

## Full random-arm disposition (n=70)

| Outcome | Count | Wilson 95% CI |
|---|---|---|
| Clean (URL resolves, page identifies as the named entity) | 63 | — |
| **Type A** (doesn't resolve) | 1 | — |
| **Type B** (resolves, wrong entity) | 1 | — |
| Ambiguous — named below, not forced into A or B | 2 | — |
| Deferred / unverifiable via this channel | 3 | — |
| **Combined A+B, strict** | **2/70 = 2.9%** | **0.8% – 9.8%** |
| A+B+ambiguous (conservative upper bound) | 4/70 = 5.7% | 2.2% – 13.8% |

Full per-record log: `v2_6_random_arm.json` (sample) cross-referenced with `verify_pass2.json`
(fetch results + automated overlap scoring) in the scratchpad — record IDs below for the ones
that needed a manual call.

**Type A** — `r7`, Koç University Turkish-language program page: browser-rendered redirect
lands on the generic institutional homepage; the specific program page is gone. Content gone,
same organization — a maintenance dead-link, not a misdirection.

**Type B** — `r48`, row title "AMC - AIME" (American Mathematics Competitions / American
Invitational Mathematics Examination), `official_url` → `maa.org/events/mathfest-program/
special-sessions/`. Fetched and read the actual page: it identifies itself as "Special
Sessions – Mathematical Association of America," and its content is entirely about **MAA
MathFest 2026**, a professional conference with undergraduate-research paper sessions. Right
parent organization (MAA runs both AMC/AIME and MathFest) but a completely different program —
a faculty/university conference substituted for a middle/high-school competition. Textbook
Type B: nothing about the page looks wrong until you read what it actually says.

**Ambiguous (2)** — named explicitly rather than forced into a bucket, per this session's
standing practice of disclosing classification edge cases (Garcia Summer Scholars precedent
below is the same shape): the URL resolves, on the *correct* organization's own domain, but
lands on a generic hub page rather than anything identifying the specific named program:
- `r53` "Global Issues at Princeton: Grades 10-12" → `cty.jhu.edu/cty-experience/courses`.
  Right organization (Johns Hopkins CTY, which does run residential courses at partner
  campuses including Princeton historically), but the URL is CTY's general, term-rotating
  course catalog, not a page for this specific course. Checked the catalog's own site search
  (broken — throws a client-side JS error on every query, a live bug on CTY's own site,
  unrelated to this record) and the first 3 pages of the unfiltered listing directly via DOM
  inspection: no match found by either method. Can't confirm current, can't call it wrong.
- `r66` "Dive Into Engineering!" → `precollege.usc.edu/usc-viterbi-pre-college-programs/`.
  Right organization (USC Viterbi Pre-College, confirmed), but the URL lands on the program's
  category-navigation hub (subjects: Architecture, Business, Engineering, ...), not a specific
  course page — "dive into engineering" does not appear anywhere in the fetched page's 145KB
  of text.

**Deferred / unverifiable (3)** — excluded from the rate, not counted as clean or defective:
- `r9` New York Times podcast contest → `nytimes.com` is blocked by this session's Browser
  pane policy; genuinely unreachable via any tool available to me, not a finding.
- `r13`, `r42` — both hit a live Cloudflare "Just a moment..." interstitial (shape 3 per
  RULE-FETCH-001: an active challenge-response defers regardless of robots.txt; solving or
  evading it is itself prohibited, not just impractical).

**Clean (63)** — 14 resolved individually after a curl-level 403 or an automated-script flag
(browser-confirmed exact-entity matches: `r8`/`r11`/`r14`/`r19`/`r26`/`r29`/`r32`/`r33`/`r46`/
`r56`/`r57`/`r61`, plus two genuine PDFs confirmed by file signature and self-describing
filenames, `r58` Sabancı, `r68` Nat Geo); the remaining 49 passed the automated title/body
check on the first pass, of which 3 were spot-checked by hand (`r16`, `r51`, `r62` — all
exact) as a sanity check on the script rather than a systematic re-check of all 49.

## The sharper number: the random arm's own internal Drive-vs-non-Drive split

This is the comparison BASORG flagged as likely "the most informative number in the package,"
and the random arm's own composition (unbiased by construction) makes it a clean, direct
measurement rather than an inference:

| Random-arm subset | n | Any flag (A+B+ambiguous+deferred) | Type A or B specifically |
|---|---|---|---|
| Drive-corpus-sourced | 26 | **6/26 = 23.1%** (CI 11.0–42.1%) | **2/26 = 7.7%** (CI 2.1–24.1%) |
| Non-Drive-sourced (`official_primary`) | 44 | 1/44 = 2.3% (CI 0.4–11.8%) | **0/44 = 0%** |

**Every single Type A, Type B, and ambiguous case in the entire random arm is Drive-corpus-
sourced.** The lone flagged non-Drive record (`r42`) is a Cloudflare-deferred case — genuinely
inconclusive, not a confirmed defect of any kind. Zero confirmed defects, and zero ambiguous
cases, turned up anywhere in the 44 non-Drive-sourced records. The confidence intervals are
wide at this sub-sample size and technically overlap, so this is not proof the non-Drive
population is defect-free — but a 10x point-estimate gap (23% vs 2.3% any-flag; 7.7% vs 0%
on strict A/B) landing perfectly on the Drive/non-Drive boundary, with no exceptions in either
direction, is a strong, consistent signal in a package that was specifically designed to have
no signature to target toward. It converges with the population-count finding from this
package's design phase (the Drive corpus splits ~96 active / 113 held-in-under_review) to the
same conclusion from a different angle: **the Drive corpus is where this population's real
risk is concentrated, on both the "did the ingestion gate let it through" axis and the
"does the URL actually point at the right place" axis.**

## Targeted arm (n=15, Drive-corpus characterization only — never blended into the rate above)

| Outcome | Count |
|---|---|
| Clean | 10 |
| Type A | 1 |
| Type B | 1 |
| Ambiguous | 2 |
| Deferred | 1 |

**Type A** — `t1` Hong Kong Baptist University, `official_url` a direct PDF link
(`HKBU_Summer_Programmes_2024-ProgDescription.pdf`): confirmed genuine 404 twice, once via
curl and once via browser (title literally "404 Not Found," not a bot-detection page). The
filename's own "2024" suggests a since-rotated program-year PDF that was never updated.

**Type B — the package's original seed example, independently re-verified with full identity
detail.** Row: "Summer High School Programs - at BU" (organization: Boston University).
`official_url`: `hasdhawks.org/o/hahs/page/summer-advanced-programs`. This one is worth
spelling out because the source data makes the failure mechanism visible: the record's own
**description field embeds the correct URL** (`bu.edu/summer/high-school-programs/...`)
verbatim, but the structured `official_url` column holds something else entirely. Fetched it:
the page identifies itself as **"Summer Advanced Programs | HAMBURG AREA HIGH SCHOOL"** —
HASD = Hamburg Area School District, Pennsylvania. Not a near-miss, not a different BU
program — a completely unrelated K-12 school district's own site, sharing no relationship to
Boston University beyond both pages using the generic phrase "summer... programs." This is
the clearest possible illustration of why Type B needs a human (or a full fetch-and-read) to
catch: title-level or domain-level pattern matching would have no reason to flag
`hasdhawks.org` as suspicious on its own.

**Ambiguous (2)** — same "right organization, wrong page-type" shape as the random arm's two:
- `t6` "The Pioneer Academics Research Program" → the fetched page's own `<title>` is
  literally **"Is Pioneer Academics Worth It? Review of a Former Research Scholar"** — a
  testimonial/review post, hosted on Pioneer Academics' own domain (so: right organization),
  but not the program's own descriptive page. Flagging this one specifically because it beat
  the automated overlap script: "pioneer," "academics," and "research" all appear in the
  review's title too, so it scored a perfect token-overlap match despite being the wrong page
  — the same "a pattern match is a candidate, not a finding" lesson BASORG drew from their own
  domain-heuristic misses, now confirmed from the opposite direction (a *correct*-looking
  score hiding a real ambiguity, not a low score hiding a false alarm).
- `t9` "Garcia Summer Scholars" → `news.stonybrook.edu/community-outreach/garcia-research-
  scholar-program-nurtures-young-talent/`. Right institution (Stony Brook), a real program
  (the URL slug names it directly), but the citation is a dated news/announcement article
  about the program rather than the program's own current page. Same automated-script miss as
  `t6` for the same reason (shared vocabulary scores as a match).

**Deferred** — `t5`, University of Maastricht via a third-party directory
(`summerschoolsineurope.eu`): robots.txt carries an explicit `User-agent: ClaudeBot /
Disallow: /` — a named block, not incidental bot-detection. Per standing rule this defers
absolutely; the Browser pane's own navigation attempt was independently denied by policy for
the same domain, consistent with the block rather than contradicting it. Not routed around.

**Clean (10)**: `t0` (MLH), `t3` (Leangap), `t4` (HES-SO/ChemTech — page's own `<title>` is
just "ChemTech - HEIA-FR," a member-institute's local branding, but the full parent-system
name appears verbatim in the body; spot-checked precisely because it scored zero title-token
overlap and I wanted to confirm the body-match saved it correctly rather than masking a real
miss), `t7` (Blue Ocean Competition), `t8` (SAIC continuing-studies page — SAIC/School of the
Art Institute of Chicago acronym, confirmed correct domain), `t10` (Ringling PreCollege,
browser-confirmed exact), `t11` (Waterloo's CEMC, confirmed exact), `t12` (Lehigh University
College of Health — see process note below), `t13` (Politecnico di Milano's "TechCamp,"
confirmed via body text: "The Summer School of the Polytechnic University of Milan... 9th
edition"), `t14` (Oxford Royale).

## Process notes — two live bugs found on target sites, and one near-miss in my own tooling

**JHU CTY's client-side course search is broken right now**: every query throws "Oops,
something went wrong. Check your browser's developer console for more details." on their own
site. Unrelated to `r53`'s classification (that record is ambiguous regardless, since the
search couldn't confirm or deny it either way), but worth flagging as a dated, live finding
for anyone who next touches a CTY-sourced record and reaches for their search box.

**Lehigh's College of Health page ships a malformed CMS title token**: the raw `<title>` tag
reads literally `[Recruitment &amp; Events Schedule | Lehigh College of Health**node:title**]
| Lehigh University College of Health` — an unresolved Drupal-style token leaking into
production markup. Confirmed by reading the raw response bytes directly, not a fetch artifact
on my side. Did not affect `t12`'s classification (the row's own title, "Lehigh University:
Bethlehem, PA," is generic enough that the page's real content — a genuine Lehigh graduate-
admissions events page — satisfies it regardless of the broken token), but it's a real,
dated bug on Lehigh's side worth naming.

**A false-negative in my own second-pass automated script, caught by cross-referencing fetch
status codes rather than trusting the content score alone**: `r9` (the NYT record) fetched a
403 block page titled "Not Authorized - The New York Times." Token overlap between that and
the row's title "New York Times Audio Stories Podcast Contest" scored 0.43 — comfortably above
my 0.35 flagging threshold, purely because "new," "york," and "times" are common to both
strings. The script would have silently called this clean. It didn't, only because I
cross-checked the independent list of curl's own non-200 status codes (14×403, 1×404) against
the content-flag list before finalizing, and `r9`'s 403 pulled it back in for a manual look —
which is how I already knew from the earlier browser-verification pass that this one is
genuinely unreachable, not clean. Naming this explicitly because it's the same shape as this
session's four earlier self-caught near-misses (Southampton title truncation, St Andrews'
`</title >` regex, Monash's nested campus field, and now this one): a coincidental score
covering for a page that plainly isn't the right content, caught before it became a false
"clean" in the report rather than after.

## Bottom line

The prevalence question this package was commissioned to answer has a clear, if unexpected,
answer: **wrong-target `official_url`s are not a large hidden problem in the general active
population** — 2/70 combined Type A+B in an unbiased draw, CI capped under 10% even at the
upper bound, is a small and largely maintenance-shaped issue (one dead link, one same-org
wrong-program mix-up), not a systemic misdirection problem. The real, load-bearing finding is
narrower and sharper than "the floor's ceiling" framing anticipated: **the risk is
concentrated almost entirely in the Drive-corpus-sourced subset** — 23% of Drive-sourced
random-arm rows needed any kind of manual adjudication versus 2.3% of non-Drive rows, and
100% of this package's confirmed Type A/B/ambiguous findings, across both arms combined, trace
back to Drive-corpus provenance. BUG-1's 31% floor and this package's ~3% floor are both true
at once because they're measuring different failure surfaces on data with the same origin.
