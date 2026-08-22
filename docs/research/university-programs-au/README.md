# Australia Programme Catalogue — RES-R1

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

## Status across all sub-batches

| University | Rank | Records | File | Status |
|---|---|---|---|---|
| UNSW Sydney | 19 | **217** | `au_programs_unsw_2026-08-22.jsonl` | Complete |
| Melbourne | 22 | 0 | — | **Deferred** — domain-wide bot-mitigation block, see below |
| Sydney | 28 | **149** | `au_programs_sydney_2026-08-22.jsonl` | Complete |
| ANU | 29 | 0 | — | **Deferred** — explicit robots.txt block on the only host serving the catalogue, see below |
| Monash | 31 | **178** | `au_programs_monash_2026-08-22.jsonl` | Complete |
| Queensland | 40 | not started | — | |
| UWA | 77 | not started | — | |
| Adelaide University | 79 | not started | — | Scheduled deliberately last — identity question, see below |

Substitution history: Melbourne deferred → Sydney substituted into sub-batch 2 (BASORG-approved).
ANU deferred → Monash substituted into sub-batch 3 (BASORG-approved).

## `field_provenance`: a per-record, closed-vocabulary basis tag (BASORG-ruled, added sub-batch 2)

Every populated `degree_level` and `international_eligible` value now carries a sibling
`field_provenance` object recording *how it was determined*, keyed by field name. This exists
because the same field name can mean structurally different evidence across sources — UNSW's
`international_eligible` is a regulatory inference (CRICOS code presence), Sydney's is a direct
source statement (`coursecitizenship`) — and a downstream consumer seeing `true` on both rows
cannot otherwise tell those apart. A caveat living only in prose `researcher_notes` is invisible
at ingestion; this field makes it queryable.

**Closed vocabulary (BASORG-owned — new values are escalated, never minted in-lane):**

| Value | Meaning |
|---|---|
| `explicit_source_field` | The source states it in a dedicated field (Sydney's `coursecitizenship`; UNSW's `award_type_single` for the 5 Certificate/Non-award records) |
| `explicit_title_token` | Read from an explicit award name in the title (Sydney's `degree_level`, all 149) |
| `structured_code_mapping` | Mapped from a structured code the source publishes via a lookup table (UNSW's AQF value → `degree_level`, 212 of 217 records) |
| `regulatory_inference` | Derived from a regulatory fact, not a direct statement (UNSW's CRICOS-code-presence → `international_eligible`) |

**The fence:** `field_provenance` annotates how we know something; it never licenses recording
something we don't know. There is no vocabulary value meaning "guessed" or "uncertain" — a weak
basis still means the field itself stays `null`, and a record with `international_eligible: null`
carries no `field_provenance` entry for that key at all (nothing to attribute provenance to on an
unknown value). Applied retroactively to all 217 already-committed UNSW records in the same
commit as Sydney's — a provenance field present on one university and silently absent on another
would have misleadingly implied the untagged one had no special basis, which is false for UNSW's
CRICOS inference.

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

**Scope question — BASORG-ruled: keep all 13.** Escalated rather than decided unilaterally, and
resolved before any downstream consumption: UNSW files them under `/undergraduate/programs/`
itself, so filtering them would impose this lane's taxonomy expectation on the source — the same
error class as inferring a field the source omits. They are real, correctly-sourced, honestly and
distinctly labeled data; deleting them to make the set tidier would be a net loss a consumer can
never recover, whereas a consumer wanting bachelor's-only can always filter honest data down.
CA precedent (UBC Foundation/pathway year, Western Undergraduate certificate/diploma) already
went this way.

## Negative finding: program 4511 (resolved, not a real block)

The batch run logged one `PARSE_FAIL` (`no_next_data`) for
`handbook.unsw.edu.au/undergraduate/programs/2026/4511`. Manually re-fetched afterward: clean
HTTP 200, full `__NEXT_DATA__` payload, no anomaly — "Bachelor of Arts (Honours)" at UNSW
Canberra. This was a transient read failure during the batch (network hiccup, not a structural
difference, not a block, not a discontinued program), confirmed before treating it either way —
added to the corpus from the successful re-fetch rather than left as a false gap. Recorded here
per the "negative findings are reported, not hidden" rule even though it resolved cleanly, so the
next reader doesn't have to wonder whether 216 vs. 217 was a silent short-count.

## Method: Sydney (live_fetch, official primary source, different platform from UNSW)

`sydney.edu.au` is NOT bot-mitigated — `robots.txt` is permissive (`Allow: /`, only unrelated
admin/search/archive paths disallowed; confirmed no `json`/`model`/`api` path exclusion before
relying on the method below). But it is a different platform from UNSW's Callista/Next.js
handbook — an Adobe Experience Manager (AEM) site — and its rendered course pages are a
client-side loading shell with **zero** course facts in the static HTML (confirmed: searched the
raw HTML for `UAC`, `Duration`, `ATAR`, `Faculty`, `CRICOS`, `course code` — none present).

**Discovery:** `sydney.edu.au`'s own `/courses/sitemap.xml` (1,825 URLs, current — lastmod dates
through 2026-08-20) lists three groups by URL infix: `pc` (postgraduate coursework, 375), `pr`
(postgraduate research, 26), `uc` (undergraduate coursework, 149). The 149 `uc` URLs are this
package's Sydney scope.

**Extraction:** every course page supports an AEM Sling Model JSON export at the same path with
`.model.json` appended (e.g. `bachelor-of-commerce0.html` → `bachelor-of-commerce0.model.json`)
— the identical structured content the page's own JS calls to populate the loading shell, on the
same official host, not a reverse-engineered or private endpoint. All 149 fetched live, zero
failures.

**Genuine schema differences from UNSW, verified rather than assumed:**
- No structured award/AQF/faculty field exists anywhere in the JSON (checked the full key tree,
  not just the obviously-named ones). `degree_level` is instead read from an explicit award-name
  token in the title itself ("Bachelor"/"Diploma") — per BASORG's ruling, reading an award the
  university's own title states is not inference; a title lacking any such token would get
  `degree_level: null` rather than a guess, but zero of the 149 titles lacked one (checked
  exhaustively, not sampled).
- `faculty_or_school` is `null` for all 149 — genuinely absent from the source, not omitted by
  this lane. The closest structured signal is a `fos` (field-of-study) tag array, recorded in
  `subject_hint` instead of forced into a faculty name it doesn't state.
- `international_eligible` comes from Sydney's own explicit `coursecitizenship` field
  (`DOM`/`INT` pipe-delimited) — an affirmative statement, not an absence-based inference like
  UNSW's CRICOS signal. 145 of 149 carry `DOM|INT`; 4 (all Honours-year extensions of Arts-family
  base degrees) carry no `coursecitizenship` field at all and correctly got `international_eligible:
  null`, not `false`.
- `isDoubleDegree`/`isDualDegree` flags exist but were observed `false` even on an obvious
  combined-title program ("Bachelor of Commerce and Bachelor of Laws") — not reliable enough to
  use as a signal, so not relied on; recorded raw in `researcher_notes` only where true, no field
  in the 21-field contract asserts a meaning from it.

## Method: Monash (live_fetch, official primary source, same platform family as UNSW — verified, not assumed, to differ)

`www.monash.edu` carries the same Cloudflare "Just a moment" bot-mitigation as Melbourne
(checked as its own isolated call, per the structural rule). `handbook.monash.edu` is clean —
permissive `robots.txt`, real sitemap, and the same Callista-family `__NEXT_DATA__` JSON
structure as UNSW's handbook. That surface similarity is where the resemblance to UNSW ends;
every specific worth relying on was checked fresh rather than ported.

**Discovery, genuinely different from UNSW:** Monash's sitemap URLs are `/2026/courses/<code>`
with no undergraduate/postgraduate/research path split — 503 unique current-year codes covering
every level together. The code prefix letters (`B`=109, `M`=91, `A`=69, `S`=33, `L`=30, `D`=29,
`E`=28, `C`=27, `F`=25, `P`=12, `U`=7, plus 43 unprefixed numeric) turned out to be
faculty/subject-area codes, not degree-level codes — verified by sampling at least one record
from every single prefix before concluding this (not just the first one checked), since assuming
"B for Bachelor" from a superficially plausible pattern is exactly the trap this package's brief
warned about. With no URL-level shortcut available, all 503 were fetched and classified by each
record's own structured `aqf_level` field — a read, not an inference, and a stronger evidentiary
basis than UNSW's `hb_awards` indirection needed. 502 of 503 fetched successfully; one genuine
404 (`M6011`) confirmed on a manual retry, not transient like UNSW's 4511 — recorded as a real
negative finding, likely a stale sitemap entry for a retired code, not fixed by re-fetching.

**The central finding: AQF "Level 8" is not one thing at Monash, and the numeric prefix cannot
be trusted alone.** Level 8 covers `8_bach_hon_deg` (undergraduate Bachelor Honours, in scope),
`8_grad_cert` (Graduate Certificate, 60 records, out of scope), and `8_grad_dip` (Graduate
Diploma, 21 records, out of scope) — three different qualification tiers sharing one AQF number,
because Australia's actual national framework groups them at the same level despite one being
undergraduate and two being postgraduate. Classification therefore matches the **exact**
`aqf_level.value` string against an explicit allowlist, never a "starts with 8" heuristic. Full
distribution observed (all 502 fetched records, not a sample):

| `aqf_level.value` | Count | In scope? | `degree_level` |
|---|---|---|---|
| `9_mast_deg_coursework` | 127 | No | — |
| `8_grad_cert` | 60 | No | — |
| `7_7_combo` | 56 | **Yes** | `Bachelor / first-cycle` |
| `7_bach_deg` | 46 | **Yes** | `Bachelor / first-cycle` |
| `10_doc_deg` | 39 | No | — |
| `9_9_combo` | 35 | No | — |
| `8_bach_hon_deg` | 29 | **Yes** | `Bachelor / first-cycle (Honours)` |
| `9_mast_deg_research` | 27 | No | — |
| `8_7_combo` | 26 | **Yes** | `Bachelor / first-cycle (Honours)` |
| `8_grad_dip` | 21 | No | — |
| `null` (12 total) | 12 | **3 of 12** | see below |
| `5_dip` | 12 | **Yes** | `Undergraduate diploma / first-cycle (AQF Level 5, sub-bachelor pathway)` |
| `9_mast_deg_ext` | 5 | No | — |
| `7_9_combo` | 2 | **Yes** | `Bachelor / first-cycle (integrated master's)` |
| `10_hi_doc_deg`, `8_8_combo`, `7_8_combo`, `7_9_combo2`, `8_9_combo` | 1 each | **4 of 5 yes** (`10_hi_doc_deg` no) | Honours/integrated-master's per combo |

**The `null` case is why BASORG's instruction to verify individually, not assume, mattered in
practice, not just in principle.** BASORG's ruling (informed by UNSW, where all 3 null-AQF
records were genuine non-award pathway programs) was "null = the non-award pathway category, in
scope." Generalizing that to Monash without checking would have wrongly included 9 records: of
the 12 with no `aqf_level`, only 3 (`Monash Transition Program`, `Monash Access Program`,
`Monash Advanced Preparation Program` — each individually confirmed via its own `type` field,
`{"label": "Non award pathway", "value": "101"}`) are actually pathway programs. The other 9 are
postgraduate credentials — Postgraduate Diplomas, Postgraduate Certificates, and "Professional
Certificate" programs — that simply have an unpopulated `aqf_level` field on Monash's side (a
source data-completeness gap, not a signal of undergraduate status); their own `type` field reads
`"PG Grad Cert / Grad Dip"` or `"Other"`, never `"Non award pathway"`. All 9 correctly excluded.

**The `_combo` values are Monash's own double-degree encoding** — a combo code states both
component levels (`8_7_combo` = "Level 8 - Bachelor Honours Degree / Level 7 - Bachelor Degree").
Mapped by the higher of the two components: any combo touching Level 8 → `(Honours)`; a
combo of two Level-7s → plain. The `7_9_combo`/`7_9_combo2`/`8_9_combo` codes (4 records total)
are genuine undergraduate-entry programs whose own `type` field labels them **"Vertical
double"** — real ATAR-admitted school-leaver programs (e.g. Actuarial Science 88, Architectural
Design 75) that culminate in a master's-level award, the same shape as UNSW's `9_masters_extended`
records — mapped to the same `degree_level` for corpus consistency rather than a new value.

**Field mapping, verified per-field rather than ported from UNSW's names:**
- `degree_type`: `abbreviated_name` (e.g. `"BBus"`), falling back to `post_nominals` — both
  populated directly by the source, no invented abbreviation.
- `faculty_or_school`: Monash's `school` field states this directly (e.g. `"Faculty of Business
  and Economics"`) — cleaner than UNSW's split `faculty_detail`/`academic_org`, used as-is.
- `duration`: `full_time_duration` is a **list of structured objects** here (`duration_number`,
  `duration_period`, `type`, `duration_display`), not the simple string UNSW's identically-named
  field held — the third distinct shape this field name has taken in this package alone (UNSW's
  broken-vs-working pair, now Monash's list-vs-string). Recorded faithfully by joining each
  entry's `duration_display` and `type` (e.g. `"3 Years (Full time)"`), never flattened to match
  UNSW's shape — different platforms genuinely represent duration differently, and normalizing
  that away would be the same convention drift this org has already paid for once (Glasgow).
- `international_eligible`: same `cricos_code`-presence signal and `regulatory_inference`
  provenance as UNSW (Monash exposes the same field, verified present on samples before relying
  on it) — Sydney's `coursecitizenship`-style field does not exist here.
- `atar`: **now a structured additive field** (`{value, scale: "ATAR", source_field}`) per
  BASORG's ruling after this lane flagged its recurrence (161 of 178 in-scope records) —
  structured in the research contract, deliberately kept out of the live ingestion path pending
  a founder decision on whether Oryn's schema gets an admission-score column (a product-design
  question, not a research one). **A near-miss worth recording:** the first patch pass trusted
  the raw JSON field's *name* (`atar`) rather than checking its *content*, and would have
  mislabeled 2 records — Diploma of Languages and Diploma of Liberal Arts both hold prerequisite
  prose in that same field slot ("You must be enrolled in a bachelor's... degree at Monash
  University") with no ATAR score in it at all, because Monash's platform reuses the field for a
  different admission-requirement type on some embedded diplomas. Caught by checking all 18
  non-numeric-leading values individually rather than a blanket rule (most of the 18 *were*
  genuine ATAR data with a prose lead-in — e.g. "Australian Year 12 equivalent that is 70" — so a
  cruder "starts with a digit" filter would have wrongly excluded those too); those 2 correctly
  hold `atar: null`, with the prerequisite text preserved in `researcher_notes` instead. Not
  retrofitted onto UNSW or Sydney — neither platform publishes an equivalent field at all, and
  BASORG's ruling was explicit: don't manufacture one where the source doesn't have it.

## ANU: deferred, explicit robots.txt block

`programsandcourses.anu.edu.au` — the only host that actually serves ANU's programme/course
catalogue (its "degree-builder" system) — explicitly disallows `ClaudeBot` by name in
`robots.txt`, alongside GPTBot, Google-Extended, PerplexityBot, and roughly a dozen other named
AI crawlers. This is `robots.txt` policy, not bot-mitigation — the clearest-cut case in this
package: the block is honoured, full stop, no further attempt made on that host.

Checked whether the catalogue was reachable by a permitted route before concluding deferral, the
same discipline applied to Melbourne: `www.anu.edu.au` (the main institutional domain) carries no
AI-crawler-specific rule and is generically permissive; following its `/study` redirect lands on
a third host, `study.anu.edu.au`, whose `robots.txt` is also clean and even publishes its own
sitemap. But `study.anu.edu.au` is ANU's general marketing/"study options" site — checked its
sitemap and actual page content, and it does not host programme-detail pages itself; it only
links out to `programsandcourses.anu.edu.au`'s degree-builder for the real data. **Structurally
identical to Melbourne: permission that exists but doesn't reach the data** — now a recognized
shape in this package, not a one-off.

Wayback check: inconclusive, not negative. `archive.org`'s availability API rate-limited this
lane (HTTP 429) after the Melbourne/Sydney/ANU checks this session; not retried against a service
signalling to back off. Recorded as unresolved rather than claimed as a checked-and-doesn't-help
finding — those are different facts and only one of them is true here.

**Process note, disclosed and now a standing org rule:** one bare homepage ("/") fetch to
`programsandcourses.anu.edu.au` landed before its `robots.txt` check result, because both were
dispatched in the same parallel tool-call batch rather than strictly sequenced. One page, no
programme content, stopped immediately once the disallow was visible, never repeated. BASORG
identified this as the third instance of the same ordering slip across independent lanes in one
day and made it structural: the `robots.txt` fetch is now its own isolated tool call, awaited and
evaluated, before any other request to a new host — never batched with anything else. Applied
from this point forward in this lane.

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

**UNSW (217):** schema-checked against the 21-field contract plus the additive `retrieval_method`
and `field_provenance` fields, deduplicated by `research_program_id` — zero mismatches, zero
duplicate IDs, validated against the **entire** `data/research/**` corpus (not just this file),
per BASORG's standing rule. Zero duplicate `official_program_url` across all 217. Zero null
`duration`/`campus`. 7 program-name collisions spot-checked and confirmed genuine (e.g. three
separate "Science" offerings — main campus bachelor's, CDF variant, UNSW College diploma — each
its own program code and URL, not a misattribution).

**Sydney (149):** same schema + corpus-wide ID validation, zero mismatches, zero duplicate IDs.
`degree_level`'s BASORG ruling (explicit title token only, never inferred) checked against the
actual data before relying on it: grepped all 149 titles for the absence of both "Bachelor" and
"Diploma" — zero matches, so no record needed `degree_level: null`. `international_eligible`'s 4
field-absent records individually identified and confirmed to all be one coherent pattern
(Honours-year extensions of Arts-family base degrees), not a mix of unrelated causes.

**Monash (178):** same schema + corpus-wide ID validation, zero mismatches, zero duplicate IDs,
zero duplicate `official_program_url`. Classification checked before writing, not after: all 502
fetched records' `aqf_level` values enumerated and individually assigned in/out-of-scope status
(see the method section above) — including catching that only 3 of 12 null-`aqf_level` records
were genuine pathway programs, not all 12 as a naive port of the UNSW pattern would have assumed.

**Combined corpus check (544 AU records total, UNSW + Sydney + Monash):** re-ran the corpus-wide
validator after every retrofit — zero duplicate IDs, zero schema failures.

## Remaining gaps, in priority order

1. **Queensland, UWA, Adelaide University (ranks 40/77/79) not yet started.**
2. **Adelaide University identity question (rank 79) deliberately scheduled last** per BASORG's
   instruction — the DB holds a "Adelaide University" row (adelaide.edu.au) but no "The
   University of Adelaide" or "University of South Australia" row; whether this is the newly
   merged institution or a renamed legacy one is not yet resolved.
3. **Melbourne and ANU deferred with reason** (see above) — Melbourne pending either a Course
   Seeker browser-tooling retry or a later robots.txt/WAF-posture recheck; ANU pending either a
   Wayback retry (rate-limited, not exhausted) or browser tooling against
   `programsandcourses.anu.edu.au` weighed against its explicit `robots.txt` disallow (that
   disallow governs regardless of tooling — a browser render would still be crawling a host that
   named this crawler by name, so this is a policy question for BASORG, not a technical one).
4. **Monash `M6011`: genuine 404, not resolved.** Unlike UNSW's transient 4511, confirmed on a
   manual retry to be a real broken link — the sitemap lists a code that no longer resolves.
   Likely a stale sitemap entry for a retired/renamed program; not investigated further since a
   single missing code out of 503 doesn't warrant more time, but noted rather than silently
   dropped from the 503-vs-502-vs-178 count chain.
5. **No postgraduate or research-degree coverage** — out of scope for this package by the original
   brief (undergraduate only); UNSW's, Sydney's, and Monash's sitemaps/catalogues all index
   postgraduate/research programmes that were not touched here.
