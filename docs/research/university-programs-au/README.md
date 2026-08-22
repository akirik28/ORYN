# Australia Programme Catalogue — Sub-batch 1 (UNSW Sydney; Melbourne deferred)

## Why this lane exists

Live-measured 2026-08-22 (project `qtcvcflzxbuagvvwahhu`, read-only): **37 canonical Australian
universities, 0 `university_programs` rows** — against a DB-wide total of 16,114 programme rows,
a true zero, not an empty-table artifact. This corrects the assigning brief's stated 35; BASORG
independently re-measured the same 37 before confirming the assignment. Australia was the largest
untouched English-language coverage gap in the product at assignment time.

Package 1 targets the 8 highest-ranked Australian universities per the live `university_rankings`
table (QS 2027 edition, single publication date 2026-06-18, verified as internally comparable
before use — see the workstream claim commit for the full integrity check). BASORG made querying
the actual top 8 a hard requirement before extraction, rather than assuming the Group-of-Eight
name list — the two sets turned out to coincide, but for a reason worth recording: see "Adelaide
University" below.

**Actual top 8 (rank, QS 2027):** UNSW Sydney (19), Melbourne (22), Sydney (28), ANU (29), Monash
(31), Queensland (40), UWA (77), Adelaide University (79).

## Sub-batch 1 status

| University | Records | File | Status |
|---|---|---|---|
| UNSW Sydney | **217** | `au_programs_unsw_2026-08-22.jsonl` | Complete |
| Melbourne | 0 | — | **Deferred** — see below, escalated to BASORG |

## Method: UNSW Sydney (live_fetch, official primary source)

UNSW's handbook (`handbook.unsw.edu.au`) is a Next.js application backed by UNSW's Callista
student-system data. `robots.txt` on this subdomain is fully permissive (`User-agent: * /
Allow: /`) — checked before any crawling, distinct from `www.unsw.edu.au`'s separate, more
restrictive robots.txt (which was not used as a source here).

**Discovery:** the handbook's own `sitemap.xml` lists per-year, per-level program URLs
(`/undergraduate/programs/<year>/<code>`, going back to 2019). 2026 is the current edition (no
2027 folder exists yet, consistent with the Australian academic year already being in progress by
August; Australian handbooks typically don't open next year's edition until later in the year).
Filtering the sitemap to `undergraduate/programs/2026/*` across all 6 sitemap shards yielded
**217 unique URLs** — this is the package's full undergraduate scope for UNSW, not a sample.

**Extraction:** every one of UNSW's handbook pages embeds a `__NEXT_DATA__` script tag containing
the page's full server-rendered data as JSON (`props.pageProps.pageContent`) — the same
Callista-backed structured data driving the rendered page, not text scraped from HTML markup.
All 217 URLs were fetched live via direct HTTP (curl, HTTP 200 on every one; one transient
mid-batch read failure on program 4511 was manually re-fetched and confirmed to be a network
hiccup, not a structural or access difference — see "Negative findings" below) and parsed from
that JSON. Every record's `retrieval_method` is declared `"live_fetch"` (see
`lib/acquisition/retrieval-method.ts`, already on `main` at this branch's base) rather than left
for legacy prose-matching.

### Trap: `duration_full_time` is empty on every record; `full_time_duration` is the real field

`pageContent.duration_full_time`, `.duration_hb_display`, and `.duration_ft_std` were empty
(`""`/`"0 "`) on every single record checked, UNSW-wide — including plain, non-honours bachelor's
programs, ruling out "only embedded-honours programs lack duration" as the explanation. The
correctly-populated field is `pageContent.full_time_duration` (e.g. `"4 Year(s)"`), a
similarly-named but different key. Confirmed by direct inspection of the raw JSON on multiple
programs before committing to it as the mapping, not assumed from one sample. **For the next
lane touching a Callista-backed Australian handbook** (several other Group-of-Eight universities
likely share this platform family): check `full_time_duration` specifically, not the more
obviously-named duration fields, which are consistently empty.

### CRICOS code as the `international_eligible` signal — a new source-signal type, flagging for review

UNSW's handbook exposes a `cricos_code` field per program. CRICOS (Commonwealth Register of
Institutions and Courses for Overseas Students) registration is an Australian federal regulatory
requirement for any course to legally enrol international students on a student visa — this is
not marketing language, it is a compliance fact the university itself is required to publish
accurately. This lane used it as follows: **CRICOS code present → `international_eligible: true`**
(cited in `researcher_notes` per record, not silently asserted). **CRICOS code absent →
`international_eligible` left `null`, not `false`** — the field's absence is suggestive of
domestic-only status but was deliberately not asserted as a hard negative, consistent with
"a field the source omits stays null, never inferred." This is a genuinely new signal type
relative to the Canada/US/Europe corpus (none of those jurisdictions have an equivalent
single-field regulatory marker), so it is flagged here for BASORG/whoever owns eligibility-data
consumption to sanity-check the reasoning rather than silently trusting it. One useful
cross-check the data itself provided: UNSW Bengaluru's offshore programs (e.g. record for
"Business (Bengaluru)") correctly show no CRICOS code and were left `null` rather than `false` —
CRICOS governs study *in Australia*, so an offshore-delivered program is a third case (neither
domestic nor CRICOS-international), and forcing a boolean there would have been wrong in a
different direction. The conservative null-based design handled that case correctly without
being told to.

### AQF taxonomy mapping (UNSW's `hb_awards[0].award_aqf.value` → this corpus's `degree_level`)

| AQF value | Count | Mapped `degree_level` | Basis |
|---|---|---|---|
| `7_bachelor` | 125 | `Bachelor / first-cycle` | Existing corpus taxonomy (10,802 uses corpus-wide) |
| `8_bachelor_honours_embedded` | 49 | `Bachelor / first-cycle (Honours)` | Existing corpus taxonomy (657 uses) |
| `8_bachelor_honours_separate` | 25 | `Bachelor / first-cycle (Honours)` | Same label as embedded — AQF level (8) and the corpus's existing taxonomy granularity don't distinguish embedded vs. separate honours; both are AQF Level 8 Bachelor Honours. Embedded-vs-separate is recorded in `degree_type`/`researcher_notes` instead (`award_type` text: "Bachelor (Honours) (Embedded)" vs "(Separate)"), not lost. |
| `9_masters_extended` | 4 | `Bachelor / first-cycle (integrated master's)` | Existing corpus taxonomy (264 uses). Verified this is the right bucket, not a guess: all 4 records (Medicine; Nutrition/Dietetics and Food Innovation; Pharmaceutical Medicine/Pharmacy; Exercise Science/Physiotherapy and Exercise Physiology) are undergraduate-entry (UAC-coded, in the `/undergraduate/` sitemap section, school-leavers apply directly) extended-duration professional programs whose final award is master's-equivalent — exactly what "integrated master's" describes. |
| `5_Diploma` | 8 | `Undergraduate diploma / first-cycle (AQF Level 5, sub-bachelor pathway)` | **New taxonomy value** — no exact corpus precedent existed (the corpus's existing "Diploma" entries are all Canadian *graduate* diplomas, a different qualification level entirely). All 8 are "UNSW College" pathway diplomas (Science/Engineering/Computer Science/Business/Media and Communication/Architecture) — confirmed via `faculty_or_school` = "UNSW College — UNSW College Diplomas" on every one, not assumed from the title alone. |
| `not_applicable_uc` | 2 | `Undergraduate certificate / first-cycle` | Matched to existing corpus taxonomy (41 uses) after checking the actual record content: both (`UCEng`/Engineering, `UCCompSc`/Computer Science) declare `award_type_single: "Undergraduate Certificate"` explicitly — the `_uc` in the AQF value is UNSW's own shorthand for "undergraduate certificate", **not** "UNSW College" as this lane's first hypothesis assumed; verified against the raw page JSON before writing this table rather than committed on the first guess. |
| `not_applicable` (2) + `None` (1, no AQF value present at all) | 3 | `Non-award enabling/pathway program (pre-bachelor's)` | **New taxonomy value.** All 3 explicitly declare `award_type_single: "Non-award Program"` on the source page itself — University Preparation Program (mature-age entry, 20+), Humanities Pathway Program and Indigenous Preparatory Program (both Nura Gili Indigenous Programs, for Aboriginal and Torres Strait Islander students). Modelled on but distinct from the existing corpus's UBC "Foundation / pathway year (pre-bachelor's)" — not reused verbatim because these are not uniformly "year"-length (the Indigenous Preparatory Program is an explicitly stated four-week residential program) and UNSW's own "Non-award Program" language is more precise than importing UBC's phrasing. |

**Total: 125+49+25+4+8+2+3 = 216, +1 (the recovered 4511, `8_bachelor_honours_separate`) = 217.**

**Scope question for BASORG, not decided unilaterally:** the 13 non-bachelor's records (8 Diploma
+ 2 Undergraduate Certificate + 3 Non-award pathway) are all filed by UNSW itself under the same
`/undergraduate/programs/` sitemap namespace as the 204 genuine bachelor's-level records, and CA
lane precedent (UBC's Foundation/pathway year, Western's Undergraduate certificate/diploma) shows
sub-bachelor pathway records have been included in "undergraduate catalogue" packages before —
so this lane kept them in with distinct, honest `degree_level` labels rather than silently
dropping 13 real, correctly-sourced records. If the package's intent is bachelor's-degree-only,
these 13 are trivially filterable downstream by `degree_level`; no re-scrape needed either way.
Flagging for confirmation, not blocking on it.

## Negative finding: program 4511 (resolved, not a real block)

The batch run logged one `PARSE_FAIL` (`no_next_data`) for
`handbook.unsw.edu.au/undergraduate/programs/2026/4511`. Manually re-fetched afterward: clean
HTTP 200, full `__NEXT_DATA__` payload, no anomaly — "Bachelor of Arts (Honours)" at UNSW
Canberra. This was a transient read failure during the batch (network hiccup, not a structural
difference, not a block, not a discontinued program), confirmed before treating it either way —
added to the corpus from the successful re-fetch rather than left as a false gap. Recorded here
per the "negative findings are reported, not hidden" rule even though it resolved cleanly, so the
next reader doesn't have to wonder whether 216 vs. 217 was a silent short-count.

## Melbourne: deferred, full technical basis

Melbourne (`unimelb.edu.au`) is **domain-wide blocked by an active Cloudflare bot-mitigation
challenge**, not a `robots.txt` disallow — a materially different and stronger barrier than any
case in the prior CA/DE/NL/UK corpus. Confirmed, not assumed:

- `www.unimelb.edu.au/robots.txt` itself returns a Cloudflare "Just a moment..." JS-challenge
  page (HTTP-level, before any real content) — the block applies even to reading the block's own
  policy.
- **Every subdomain tested 403'd**, regardless of path: `www`, `study`, `handbook`, `science`,
  `arts`, `biomedicalsciences`.`unimelb.edu.au`. This is a domain-wide CDN-level posture, not a
  per-subdomain one (contrast McMaster in the CA corpus, where the marketing subdomain blocked
  and the calendar subdomain didn't — Melbourne offers no such split).
- **Not UA-based**: a standard desktop-browser UA string was 403'd identically to the bot UA —
  ruling out simple UA-string spoofing as a fix, which in any case this lane would not attempt
  (this org's standing rule is "find a permitted alternative, never route around a block," and
  the base operating rules separately prohibit bypassing or completing bot-detection/CAPTCHA
  challenges outright — this lane treated Melbourne's active JS challenge as squarely inside that
  prohibition, not just the softer robots.txt convention).
- `handbook.unimelb.edu.au`'s own **robots.txt is actually permissive** when reached indirectly
  (it 301-redirects to `uom-handbook.herokuapp.com/robots.allow.txt`, which explicitly allows all
  crawling) — but the branded subdomain in front of that Heroku origin is Imperva/Incapsula-gated
  with a JS challenge, so the permissive robots.txt is unreachable in practice. Hitting the Heroku
  origin directly redirects straight back to the gated branded domain.
- **Wayback Machine**: a fresh capture exists (2026-05-31, i.e. same-cycle, not stale) of the
  handbook's search page — but the captured page is a client-rendered SPA shell with zero course
  data in the raw HTML (confirmed: no `courseCode` or course-listing markers anywhere in the
  57KB capture). Wayback only archives what a non-JS crawler received, and Melbourne's search
  results are populated by client-side JS after load — so even an unrestricted archive doesn't
  help here, unlike McGill in the CA lane where Wayback held real server-rendered content.
- **Course Seeker** (`courseseeker.edu.au`) was investigated as a possible alternative: it is a
  genuine Australian Government + Tertiary Admission Centres joint initiative (confirmed via its
  own footer, not assumed from the name), `robots.txt` returns 404 (no crawl restriction
  declared), and it is explicitly scoped to undergraduate courses — a strong candidate on paper.
  In practice, both its `/courses` and `/institutions` search surfaces are AngularJS applications
  querying an Elasticsearch backend client-side (`ng-app="institutionApp"`,
  `elasticsearch.angular.min.js` loaded on the page) — the server-rendered HTML this lane could
  fetch contains the page shell only, not results. A direct Elasticsearch endpoint was searched
  for in the minified JS bundles within a reasonable time budget and not found. **This is not
  fully exhausted** — a browser-rendering tool (rather than plain HTTP) could plausibly extract
  Course Seeker's data cleanly, since Course Seeker itself has no bot-mitigation to navigate,
  only an SPA architecture. Flagging as a real option for a follow-up pass rather than a dead end.

**Recommendation, not a unilateral decision:** hold Melbourne for either (a) a retry with
browser-rendering tooling against Course Seeker specifically (no bot-mitigation there, just needs
JS execution), or (b) substitute the next-ranked university (Sydney, rank 28) into this sub-batch
to keep pace while Melbourne is investigated separately. Both options were put to BASORG; this
document will be updated with the resolution once decided.

## Validation performed

All 217 records schema-checked against the 21-field contract (plus the additive
`retrieval_method` field) and deduplicated by `research_program_id` — zero mismatches, zero
duplicate IDs, validated against the **entire** `data/research/**` corpus (not just this file),
per BASORG's standing rule. Zero duplicate `official_program_url` values across all 217 (each
program code is its own handbook page on this platform — no shared-URL bundling risk of the kind
seen elsewhere in the corpus). Zero null `duration`/`campus` fields UNSW-wide. 7 program-name
collisions spot-checked and confirmed genuine (e.g. three separate "Science" offerings — main
campus bachelor's, CDF variant, UNSW College diploma — each its own program code and URL, not a
misattribution).

## Remaining gaps, in priority order

1. **Melbourne (rank 22) not yet researched** — see deferral above, awaiting BASORG direction.
2. **Sydney, ANU, Monash, Queensland, UWA, Adelaide University (ranks 28/29/31/40/77/79) not yet
   started** — sub-batches 2+ of this package.
3. **Adelaide University identity question (rank 79) deliberately scheduled last** per BASORG's
   instruction — the DB holds a "Adelaide University" row (adelaide.edu.au) but no "The
   University of Adelaide" or "University of South Australia" row; whether this is the newly
   merged institution or a renamed legacy one is not yet resolved. Not part of this sub-batch.
4. **Scope question on the 13 non-bachelor's UNSW records** (Diploma/Certificate/Non-award) — see
   above, awaiting confirmation.
5. **No postgraduate or research-degree coverage** — out of scope for this package by the original
   brief (undergraduate only); UNSW's handbook sitemap also has `/postgraduate/` and `/research/`
   sections that were not touched here.
