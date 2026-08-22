# Australia Programme Catalogue — RES-R1

**Resumability note (2026-08-22, mid-package): if this document is being read to pick up
unfinished work, start here.** Sessions in this org have been ending without warning; this file
is kept current after every sub-batch, not just at close-out, specifically so that's survivable.

- **Done, pushed, corpus-validated:** UNSW (217), Sydney (149, degree_level corrected — see fix
  note below), Monash (178), UWA (**107**, after two rounds of self-caught fixes — see below),
  Adelaide University (**119**) = **770 records across all 5 extracted universities. All 8 of
  this package's target universities are now resolved — 5 extracted, 3 deferred by policy.**
- **UWA went through two rounds of self-caught bugs before landing on a correct, comprehensively
  audited count. Both are recorded here because the first "fix" was itself incomplete, and that
  is the more important lesson than either bug individually.**
  - **Round 1 (self-caught):** the first extraction used "has a `Course Code` card" as its
    inclusion gate, wrongly excluding genuine top-level degree pages that simply don't publish
    that specific card (bare "Bachelor of Commerce", "Bachelor of Science" — real degrees,
    confirmed via their other cards: ATAR, CRICOS, duration). 93 of 422 wrongly excluded.
    "Fixed" by re-fetching those 93 specifically with a corrected title-token classifier,
    recovering 73 — but the corrected classifier was only ever applied to those 93 URLs, never
    back-applied to the original 217. Reported as "217 → 289, fixed" at the time.
  - **Round 2 (found while auditing UWA's title-token method before Adelaide, per BASORG's
    instruction not to port Sydney's method without checking it for the same class of gap):** a
    full 422-title token census found the *original 217* — never touched by round 1's fix — had
    three further defects: (a) 41 records with `degree_level: null` had been written to the
    output file at all (the original script never gated on null, only on a missing `Course Code`
    card or an `MJD-` prefix); (b) 28 genuine postgraduate "Graduate Diploma in X" titles were
    mislabeled as `Undergraduate diploma / first-cycle` (the diploma-branch matched the substring
    "diploma" without excluding "graduate diploma" — the single worst defect in this package,
    because a mislabeled record looks correct where a null one at least looks suspicious); (c)
    ~109 standalone "Master of X"/"Doctor of X" titles with no "Bachelor" were promoted to
    `Bachelor / first-cycle (integrated master's)` (the original rule matched "master" or "doctor"
    with no `has_bachelor` requirement at all).
  - **Root cause, named precisely: a fix applied at the boundary rather than to the population.**
    The classification *method* was corrected in round 1; the *data already produced by the old
    method* was left in place, because the fix was scoped to "the URLs I know are affected"
    rather than "everywhere this derivation was ever run." The same shape as this package's
    Glasgow-adjacent lesson on entity conventions: a correction has a scope, and its scope is not
    automatically the whole dataset.
  - **The actual fix: a full clean rebuild**, not a third patch. Built one classifier function,
    audited against the complete token census of all 422 titles *before* running (every
    capitalized word enumerated; every category — Bachelor, Honours, integrated-master's combo,
    Associate Degree, Diploma vs. Graduate Diploma, Graduate Certificate, standalone Master/
    Doctor, bare major/"Extended Major"/"Pathways" pages — explicitly assigned in or out), then
    re-fetched all 422 URLs fresh and rebuilt the file from nothing. Verified the same way the
    bugs were found: re-ran the token census against the actual output, confirmed zero null
    `degree_level`, zero Graduate Diploma/Certificate present, zero standalone Master/Doctor
    present.
  - **Post-rebuild count: 108, then 107 after one further duplicate.** The rebuild re-fetched
    fresh from the same sitemap, so the same "Bachelor of Human Sciences (Pharmaceutical Health)
    and Doctor of Pharmacy" alias pair round 1 had already found (two sitemap URL slugs that both
    301-redirect to the same canonical page) was naturally re-derived — checked rather than
    assumed still present, then deduplicated the same way, keeping the record matching the
    canonical slug. **Final: 107 — 67 plain Bachelor, 25 integrated-master's, 13 Honours, 2
    Associate Degree.** Genuinely lower than either prior number, because UWA's `/study/courses/`
    namespace turned out to hold far more postgraduate content (94 standalone Masters, 45
    Graduate Certificates, 28 Graduate Diplomas, 15 standalone Doctorates — 182 items) than
    undergraduate, and both earlier passes had been silently counting a large share of it as
    undergraduate.
- **A verification-caught bug in Sydney's degree_level, fixed:** RES-V1's cross-university
  consistency check found Sydney's title-token method checked only "Honours"/"Diploma", with no
  path to detect "Master of"/"Doctor of" — 10 combined-award titles (e.g. "Bachelor of Arts and
  Doctor of Medicine") landed one tier below where UNSW's/Monash's AQF-code methods correctly
  place the same real-world shape. Audited comprehensively (every capitalized token across all
  149 titles, not just the 10 flagged) before fixing — confirmed exactly 7 Master- + 3
  Doctor-titled records and no other missed category. All 10 reclassified to `Bachelor /
  first-cycle (integrated master's)`; UNSW and Monash untouched (their basis was already
  correct); `field_provenance` unchanged (`explicit_title_token` — a more complete read, not a
  different kind of evidence).
- **Adelaide University: complete, 119 records, corpus-wide validated.** Identity resolved
  (genuine 2026 merger via the institution's own official statement), dom/int page-variant
  structure mapped and re-verified on a fresh 18-programme sample (title/code/duration: 0
  mismatches, checked by direct comparison not assumed), the majoring-in grain exclusion designed
  in from the start this time rather than discovered mid-run — classified in two stages (raw
  fetch with zero classification decisions, then one classifier built and audited against the
  complete 559-title census before it ever ran), the same discipline the UWA rebuild established.
  Every exclusion category reconciled explicitly against the total (559 = 119 in-scope + 215
  majoring-in + 126 standalone-postgraduate + 98 Graduate Diploma/Certificate + 1 blank). See the
  Adelaide section below for the full account, including a genuine (non-duplicate) on-campus/
  online delivery-pathway finding.
- **This closes all 8 target universities: 5 extracted (UNSW, Sydney, Monash, UWA, Adelaide =
  770 records), 3 deferred by policy (Melbourne, ANU, Queensland) — a property of the web, not a
  gap in this lane's work. See the named deferral section below.**

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
| Queensland | 40 | 0 | — | **Deferred** — CAPTCHA gate on the catalogue host, see below |
| UWA | 77 | **107** | `au_programs_uwa_2026-08-22.jsonl` | Complete (two rounds of self-caught fixes — see resumability note above) |
| Adelaide University | 79 | **119** | `au_programs_adelaide_2026-08-22.jsonl` | Complete |

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

**Reproducibility caveat, added 2026-08-22 after RES-V2's independent verification pass:** the
`.model.json` method documented below extracted all 149 records successfully the morning this
lane ran it. Hours later the same day, RES-V2 attempting to source-verify a sample of those same
URLs got HTTP 400 on every one — ruled out the obvious explanations first (a fresh URL outside
the original sample also failed, robots.txt was unchanged, and it wasn't rate-limiting, since
varying user agent/headers/HTTP version made no difference) before concluding the endpoint itself
had broken intraday. V2 worked around it with rendered-DOM extraction (same underlying JS, same
facts, a different path in) rather than treating it as a data problem, and Sydney's 149 records
verified clean regardless. **Anyone re-running this method should verify the `.model.json`
endpoint is currently responding before assuming the steps below still work as documented** — a
documented method that has silently stopped working is worse than an undocumented one, since it
costs a debugging session before anyone thinks to question the method itself rather than their
own execution of it.

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

## Method: UWA (107 records, complete — see the resumability note at the top for the two-round classification-fix history, and the compliance correction immediately below for a third, different kind of fix)

`www.uwa.edu.au` is fully permissive at the domain level (no bot-mitigation on a live fetch) but
`robots.txt` disallows specific paths, including `Disallow: /sitecore` — a rule this lane
violated in its first two passes and corrected in a third, described in full below. Catalogue
discovered via `robots.txt`'s `Sitemap: https://www.uwa.edu.au/sitemap.xml` → `/study/sitemap.xml`
(302) → `/study/-/media/sitemaps/sitemap-future-students.xml` (637KB, 2,760 URLs), filtered to
422 URLs. **The sitemap itself publishes these 422 URLs in the disallowed
`/sitecore/content/uwafs/home/courses/<slug>` form** (not the permitted `/study/courses/<slug>`
form this document described them as until this correction) — the site's own sitemap and its own
robots.txt disagree about which form of the URL is the "real" one, a genuine site-configuration
inconsistency, not a sourcing error a careful crawl could have avoided by reading the sitemap
correctly.

**Robots.txt compliance correction (2026-08-22), found by RES-V1's independent verification,
not by this lane, and it matters that this is stated plainly:** every one of the 107 records was
originally fetched by requesting the sitemap-published `/sitecore/content/...` URL and following
its 301 redirect to `/study/courses/<slug>`, which served the actual content. **Robots.txt
governs the requested path, not the destination a redirect lands on** — the disallowed path was
genuinely requested, even though the content ultimately read came from a permitted one. RES-V1
found this unprompted while checking the fetch-method claim, verified it (3 samples, a full
`robots.txt` read, confirmed the permitted path is independently reachable, confirmed UNSW/
Sydney/Monash don't share this UWA-specific issue), and routed it to founder/CEO level rather
than resolving it itself, correctly, since a 107-record rewrite is not obviously reversible.
CEO approved this lane's proposed remediation after independently verifying both the violation
(`robots.txt` genuinely disallows `/sitecore`) and the fix (the permitted `/study/courses/<slug>`
form returns HTTP 200 with identical title and card structure, confirmed by direct fetch before
proposing it): **every one of the 107 records was re-fetched a second time, this time requesting
the permitted `/study/courses/<slug>` URL directly and never touching `/sitecore/` at all**,
`official_program_url` and `source_url` updated to the permitted form on every record, re-verified
(0 fetch failures, 0 title mismatches against the stored `program_name`), and corpus-wide
re-validated. The underlying data was never wrong — RES-V1 independently confirmed all three
named classification-defect classes at 0/0/0 against the actual file before finding this separate,
purely sourcing-compliance issue — only the URL fields and the path used to obtain them needed
correcting. `official_program_url` on every record now reads `https://www.uwa.edu.au/study/
courses/<slug>`, confirmed by direct field check across all 107, not sampled.

**Sixth platform, sixth structural wrinkle — verified, not assumed:** this URL namespace mixes
two entity types. Confirmed by fetching samples of both: major/specialisation pages (e.g.
"Accounting", `Course Code MJD-ACCTG`) and actual applyable degree programmes (e.g. "Bachelor of
Commerce (Integrated Professional)", `Course Code BW002`, CRICOS code present) — a major page
explicitly lists which degrees it combines with and links to the real degree page, which carries
a structurally different code pattern. **Consistent with the UNSW/Sydney/Monash grain (the
applyable degree, not the major within it) — majors excluded, BASORG-confirmed.** Named as its
own negative finding, not a silent omission: UWA publishes major/specialisation pages under
`/study/courses/` distinguished by an `MJD-` course-code prefix, excluded here as a different
entity type, available if the product ever wants majors as their own grain later. **Correction
(2026-08-22, caught by RES-V1's independent check, not by this lane): an earlier draft of this
paragraph stated "175 major pages alongside 247 degree programmes" — the round-1, pre-rebuild
figures, never updated here after the round-2 rebuild superseded them. The verified, current
figures are in the reconciliation table below (106 MJD-excluded of 422 total) — this paragraph's
own stale numbers are the defect, not the underlying data, which RES-V1 independently confirmed
clean against the actual file.**

**Final classification method (after the two-round fix history in the resumability note at the
top — read that first for the full account of what went wrong and why a patch wasn't enough).**
Exclusion is by each page's own `Course Code` prefix (`MJD-` = major) when a code exists at all —
verified against the URL slug as a sanity cross-check (3 non-degree-like slugs spot-fetched and
confirmed `MJD-`, same discipline as Monash's `aqf_level`), never trusted as the filter itself.
**Inclusion is by title-token read, never by `Course Code` card presence** (the round-1 bug):
`bachelor` required for every branch except Associate Degree and plain Diploma; `graduate
diploma`/`graduate certificate` explicitly excluded before the plain-diploma check ever runs, so
the substring "diploma" alone can't misfire on a postgraduate title (the round-2 bug); `master`/
`doctor` alone, without an accompanying `bachelor`, is never sufficient for any inclusion branch
(the round-2 bug's other half). This method was built and audited against the complete token
census of all 422 titles before the final rebuild ran, not assembled incrementally from
encountered cases.

**No JSON data blob on this platform** (no `__NEXT_DATA__`; a thin per-page schema.org
`ld+json` block exists with only name/description/courseCode, not enough for duration/ATAR/
CRICOS). Facts extracted via consistent labeled HTML card markup:
`<div class="card-details-label">LABEL</div><div class="card-details-value">...VALUE...</div>`.
Cards seen: `Minimum ATAR`, `Intake`, `Full time completion`, `Course Code`, `CRICOS CODE`,
`Annual course fee` (not captured — no fee field in this contract).

**Field mapping:** `degree_type`=null (no clean abbreviation field exists, unlike UNSW's
`abbreviated_name`/Monash's `post_nominals`/`abbreviated_name`); `faculty_or_school`=null and
`campus`=null (checked card fields, page prose, and breadcrumb navigation — neither is
structurally exposed on individual degree pages here, though UWA's separate major pages do carry
a `Locations` card, out of scope since majors are excluded); `degree_level` from explicit title
award-tokens (Bachelor/Honours/Master+Doctor-combo/Diploma), same method as Sydney;
`international_eligible` from CRICOS-code presence, same `regulatory_inference` basis as UNSW/
Monash; `atar` as the structured `{value, scale: "ATAR", source_field}` object BASORG ruled for
Monash, reused here since the field recurred a third time.

## Adelaide University (119 records, complete)

**Identity, resolved from the source's own statement, not from any prior-knowledge lead:**
`adelaide.edu.au`'s own homepage schema.org organization markup states directly: *"Adelaide
University is a public Australian university established in 2026 through the merger of the
University of Adelaide and the University of South Australia."* `foundingDate: 2026`. This
settles the DB question from this package's very first report — the "Adelaide University" row
is the genuine new merged entity, and the DB correctly holds no separate "The University of
Adelaide" or "University of South Australia" row because neither continues to exist. A prior
recollection that this merger had happened was flagged as a lead at package start and not acted
on until the source confirmed it independently.

**Catalogue state: settled, not a two-catalogue transition — a conclusion resting on absence of
signals, named as such rather than asserted bare.** Signals deliberately sought that would have
falsified this conclusion, and not found: no `unisa.edu.au` references on the homepage or study
landing page, no "former University of Adelaide" framing, no dual/parallel catalogue listing.
Positive signals for consolidation: one active `sitemap.xml` (1.27MB, current — lastmod through
2026-07-31), one unified `/study/degrees/*` namespace, 560 degree URLs including a full spread
of `bachelor-of-*` slugs. BASORG's record-both fallback (for a genuine two-catalogue transition)
does not apply — this is a single successor catalogue, not a coexistence.

**A domestic/international page-variant split exists and was mapped before any bulk extraction,
per BASORG's instruction — this is the trap-shaped finding of this university.** The plain
sitemap URL (no suffix) resolves to a page titled "...Information for International students" —
**a bot with no session state receives a variant, not a neutral default.** A parallel `/dom/`
path serves "...Information for Domestic students." Diffed both directly on 10 sample programmes
across different faculties (Arts, Agricultural Sciences, Biomedical/Health, Commerce,
Criminology, International Relations, Mathematics Honours, Pharmaceutical Science, Science
Honours, Science) rather than reasoning about what should differ:

- **Invariant, verified on all 10 samples:** `Program code` (e.g. "BARTS" on every Bachelor of
  Arts variant) and the base full-time `Duration` figure (e.g. "3 year(s) full-time" identical
  on both).
- **Genuinely different, not just differently phrased:** CRICOS code (present only on the
  international variant — structurally expected, since CRICOS is specifically the
  international-enrolment mechanism, not an inconsistency); study mode (international says
  "Full-time" only, with explicit prose "Part-time study is not available for international
  students"; domestic says "Full time or part time" — a real difference in what's actually
  offered, not a phrasing difference); entry requirements (international shows a country-by-
  country equivalency table; domestic shows a domestic ATAR-cutoff/guaranteed-entry scheme with
  different admission-cycle years referenced — the underlying Australia-citizen figure is
  consistent across both presentations, which is a good internal check, but the two are not
  reducible to one field).

**BASORG's ruling on how to record this: structure, not metadata.** `entry_requirements` and
`study_mode` are keyed by audience (`{"international": ..., "domestic": ...}`) rather than
tagged via `field_provenance` (which describes *how* a value was derived, not *which audience*
it describes — mixing those axes in one closed enum was explicitly rejected as the same
convention-drift risk that produced a Glasgow duplicate-detection defect elsewhere in this org).

**Cost decision, BASORG-ruled:** fetch the international variant for all ~560 in-scope URLs
(full coverage of the audience an Oryn user is almost certainly in); fetch the domestic variant
only for the same ~18-programme faculty-spread sample already used for invariance verification,
documented explicitly as a sample, not full coverage — a domestic student sees no data rather
than mislabeled international data, an honest, visible gap rather than a silent wrong one.

**A second majors-vs-degree grain problem, structured differently from UWA's, so a straight
ported fix would have missed it — designed around from the start rather than patched after.**
Adelaide represents each major as its own page but does NOT give it a different program code the
way UWA did: "Bachelor of Arts", "Bachelor of Arts majoring in Anthropology", "...majoring in
Aboriginal Studies", and every other Arts major variant all carry the identical `Program code
BARTS`. Filtering by course-code prefix (UWA's method) would not catch this — the code is the
same. **Detection method: the page's own title text contains "majoring in" for every variant
page and never for the base degree page** — a title-based exclusion, built into the classifier
before the first record was ever written this time, not discovered mid-run.

**Learning directly from the UWA rebuild: classification ran in two stages, and the classifier
was audited against the complete title census before it was ever applied.** Stage 1 fetched all
560 sitemap URLs (international variant, 559 succeeded — 1 genuine 404, a stray `/2027/`
year-navigation URL that shouldn't have been in the degree list) and saved raw facts with **zero
classification decisions**. Only then was every capitalized token across all 559 titles
enumerated and every category explicitly assigned before stage 2 ran. This caught a real category
UWA-style incremental classification would likely have missed until later: **3 genuine non-award
pathway programmes** — "Aboriginal and Torres Strait Islander Pathway" (code `ATSIP`), "Centre
for Aboriginal Studies in Music (CASM) Foundation Year" (`FCASM`), "Foundation Studies" (`FNDST`)
— each individually verified via its own real program code and duration (not assumed from title
alone), the same category and same verification standard as UNSW's and Monash's non-award
pathway programmes.

**Full exclusion reconciliation, every term stated (learning from the UWA reconciliation gap —
BASORG's own reconciliation of that gap fit perfectly and was still wrong, so a number that
closes is not by itself a verified number; every term here is read directly from the
classification script's own printed counts, not inferred):**

| Category | Count |
|---|---|
| In scope (written) | 119 |
| Excluded — "majoring in" major-variant pages | 215 |
| Excluded — standalone postgraduate (Master/Doctor with no Bachelor) | 126 |
| Excluded — Graduate Diploma/Graduate Certificate | 98 |
| Excluded — blank title (one `/legacy/` landing page, no real content) | 1 |
| **Total accounted for** | **559** |
| Stage-1 fetch failures (the `/2027/` 404) | 1 |
| **Grand total** | **560** |

**Final distribution:** 69 plain Bachelor, 39 Honours, 5 plain (non-graduate) Diploma
(`Undergraduate diploma / first-cycle`, a category UWA had zero of — Adelaide genuinely has it:
Diploma in Building Studies, Legal Studies, Mathematical Studies, Digital Business, Health), 3
Associate Degree, 3 Non-award pathway. **Zero integrated-master's records** — checked directly
against the raw fetch (searched for any title containing both "bachelor" and "master"/"doctor")
rather than assumed absent; Adelaide genuinely has no combined Bachelor+Master/Doctor titles in
its current undergraduate catalogue, unlike UNSW/Monash/UWA.

**A genuine non-duplicate finding, checked before being mistaken for one:** 7 program names each
appeared twice with zero duplicate URLs. Investigated each pair rather than assuming — every one
has a **different `Program code`** and a distinct URL path (`/study/degrees/X/` vs
`/study/degrees/online/X/`): Adelaide offers the same degree title via two separately-coded
delivery pathways, on-campus and online, e.g. "Bachelor of Construction Management" is `BCONM`
on-campus and `XBCMG` online. Not deduplicated — both are genuine, distinct offerings. The
`delivery_mode` card field didn't populate on either variant, so rather than leave this
distinction invisible, every one of the 30 records whose URL contains `/degrees/online/` carries
a `researcher_notes` annotation citing the URL path itself as the source's own structural signal
for the online-delivery variant.

**Dom/int variant structure, mapped and verified with real comparisons, not assumed —
BASORG explicitly required checking the domestic-sample title match rather than asserting it
"by construction," since that exact phrase preceded two of this package's earlier defects.**
The plain sitemap URL (no suffix) resolves to a page titled "...Information for International
students" — a bot with no session state receives a variant, not a neutral default. A parallel
`/dom/` path serves "...Information for Domestic students." Verified on **18 sample programmes**
spanning every category (plain Bachelor, Honours, Associate Degree, the non-award pathway
programmes) by fetching both variants and diffing directly:

- **Title, `Program code`, and base `Duration`: 0 mismatches across all 18** — checked by direct
  string comparison per record, not assumed from the earlier 10-programme check holding.
- **Genuinely different, not just differently phrased (confirmed again on this fresh sample):**
  CRICOS code (international-only, structurally expected — CRICOS is specifically the
  international-enrolment mechanism); study mode (international: "Full-time" only, with explicit
  prose "Part-time study is not available for international students"; domestic: "Full time or
  part time" — a real difference in what's actually offered); entry requirements (international:
  a country-by-country equivalency table; domestic: an ATAR-cutoff/guaranteed-entry scheme with
  different admission-cycle years referenced).

**BASORG's ruling on how to record the variant split: structure, not metadata.**
`entry_requirements` and `study_mode` are keyed by audience (`{"international": ...,
"domestic": ...}`) rather than tagged via `field_provenance` (which describes *how* a value was
derived, not *which audience* it describes — mixing those axes in one closed enum was rejected as
the same convention-drift risk that produced a Glasgow-adjacent defect elsewhere in this org).
Populated for all 119 records on the `international` key; the `domestic` key exists only on the
18 sampled records, documented explicitly as a sample rather than full coverage — a domestic
student sees no data rather than mislabeled international data, an honest, visible gap.

**No JSON data blob** (a site-wide organization-level `ld+json` block exists, not per-course);
facts extracted via labeled text anchors in the flattened page text: `Program code`, a
`\d+ year\(s\) full-time` duration pattern, `Campus <list> Duration More info` (campus, bounded
between those two anchors), `CRICOS code`, `Study as (Full-time|Full time or part time)`, and an
`Admission criteria`-anchored block for entry requirements (a best-effort verbatim capture of a
long multi-part admissions page, not a fully structured parse of every sub-component — documented
as such in each record's `researcher_notes` rather than presented as more complete than it is).

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

## Three of the top eight are structurally inaccessible — a property of the web, not a research gap

Melbourne, ANU, and Queensland — 3 of this package's 8 target universities — could not be
researched, each blocked by a genuinely different mechanism, and in every case the institution's
own general/marketing site stays open while the specific host that carries the programme
catalogue is the one that's gated:

| University | Mechanism | Detail |
|---|---|---|
| Melbourne | Domain-wide active bot-mitigation (Cloudflare JS challenge) | Every subdomain tested 403s, including on a standard browser UA — not UA-based, not per-path |
| ANU | Explicit `robots.txt` policy | `programsandcourses.anu.edu.au` names `ClaudeBot` by name alongside ~a dozen other AI crawlers |
| Queensland | Active CAPTCHA gate (AWS WAF) | `x-amzn-waf-action: captcha` on the catalogue host's own `robots.txt` response |

These are three different *shapes* of the same underlying fact, not the same block encountered
three times: a technical bot-mitigation wall (JS challenge — defer per this org's standing
policy, no tooling exception since routing around it is exactly what "don't route around a
block" prohibits), a stated crawling policy (robots.txt — honoured as policy, full stop), and an
explicit CAPTCHA (a harder line than either — solving it is the specifically prohibited act
itself, under the base operating rules directly, not merely this org's policy; no browser-tooling
exception exists here the way one might exist for a JS challenge, because a browser that solved a
CAPTCHA would be doing the forbidden thing more capably, not avoiding it).

Each was investigated for a permitted alternative before being marked deferred, not accepted at
the first block: main institutional domains checked and found open but not carrying the
catalogue (the same "permission that exists but doesn't reach the data" shape all three times),
Wayback checked where a specific page could be tested (Melbourne: a fresh capture exists but is a
client-rendered SPA shell with zero course data in the raw HTML; ANU: inconclusive due to a
rate limit, not negative — recorded as unresolved, not as checked-and-doesn't-help, since those
are different facts). Full technical detail for each is in its own section below.

**This is a real, reportable limit on what this package can deliver for Australia, not a
shortfall in how it was researched.** A future lane with different tooling will not open
Melbourne or Queensland — a CAPTCHA and an active bot-mitigation wall are not tooling gaps. Only
a different relationship with those institutions (a data-sharing agreement, an official API, or
the institution changing its own posture) would. ANU's case is closer to solvable in principle —
a `robots.txt`-permitted alternative host, if one is ever found, would be legitimate — but the
one checked (`study.anu.edu.au`) only links to the blocked host rather than carrying the data
itself.

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

**UWA (107, after the two-round fix history above):** schema + corpus-wide ID validation clean
on the final rebuilt file. Verified with the same method that found the original bugs, not a
different or lighter check: re-ran the full 422-title token census against the actual output
(not just the logic on paper) and confirmed zero null `degree_level`, zero Graduate Diploma/
Certificate present as undergraduate, zero standalone Master/Doctor present. One duplicate
program name found and resolved (not a schema/ID collision — same title reached via two sitemap
URL slugs that both redirect to the same canonical page; the alias removed, verified by following
both redirect chains to their shared final URL before deciding which to drop, not assumed from
the name match alone) — re-confirmed present after the rebuild rather than assumed carried over,
since the rebuild re-fetched from the same sitemap and could plausibly have reproduced it.

**Adelaide (119):** schema + corpus-wide ID validation clean. Verified with the token-census
method throughout, not corpus-wide validation alone: the classifier was built and audited against
the complete 559-title census *before* stage 2 ran (not after, unlike UWA's round 1), so there
was no incremental-discovery phase to retroactively check. Every exclusion category reconciled
explicitly against the total (559 = 119 + 215 + 126 + 98 + 1). The 7 duplicate-name pairs were
investigated individually rather than assumed duplicates and confirmed genuine (different program
codes, on-campus vs online delivery) — not deduplicated. The dom/int invariance claim was
re-verified on a fresh 18-programme sample by direct comparison (0 title/code/duration
mismatches), not re-asserted from the earlier 10-programme check.

**Combined corpus check (770 AU records total, UNSW + Sydney + Monash + UWA + Adelaide):**
re-ran the corpus-wide validator after every retrofit and fix in this package — zero duplicate
IDs, zero schema failures. Note this validator checks schema/ID uniqueness only, not semantic
correctness of field values — it would not have caught either UWA classification bug, both of
which produced well-formed, schema-valid, wrong records. That gap is exactly what the
token-census method exists to catch instead, and it's why that method (not just corpus-wide ID
validation) is now the standard this lane applies before calling any title-token-classified
university complete — applied to Adelaide from the start, not retrofitted after a defect.

## A verified-but-wrong reconciliation, worth naming next to the platform quirks above

Mid-package, BASORG independently proposed a reconciliation for the UWA exclusion counts (113
`MJD-` major exclusions, inferred to make 202 + 113 + 107 close to 422) that fit exactly — no
remainder — and was still wrong. The real terms were 106 major exclusions, 108 pre-dedup in-scope
(not 107, the post-dedup figure), and 6 fetch failures that weren't in the model at all; three
separate errors that happened to cancel arithmetically. **A number that fits is not a verified
number** — the same lesson as every platform-specific assumption in this package, just this time
applied to an inference about counts rather than about a field's meaning. Recorded here because
it's a distinct failure shape from the others: a reconciliation that *closes cleanly* is not more
trustworthy than one that doesn't; it just fails silently instead of loudly.

## Remaining gaps, in priority order

1. **Melbourne, ANU, Queensland deferred with reason** (see the named section above) — Melbourne
   pending either a Course Seeker browser-tooling retry or a later robots.txt/WAF-posture
   recheck; ANU pending either a Wayback retry (rate-limited, not exhausted) or a policy decision
   on `programsandcourses.anu.edu.au`'s explicit `robots.txt` disallow (which governs regardless
   of tooling); Queensland's CAPTCHA gate has no tooling exception at all under the base operating
   rules.
2. **Monash `M6011`: genuine 404, not resolved.** Unlike UNSW's transient 4511, confirmed on a
   manual retry to be a real broken link — the sitemap lists a code that no longer resolves.
   Likely a stale sitemap entry for a retired/renamed program; not investigated further since a
   single missing code out of 503 doesn't warrant more time, but noted rather than silently
   dropped from the count chain.
3. **Adelaide's domestic entry-requirements/study-mode coverage is a documented 18-programme
   sample, not full coverage** — a deliberate BASORG-ruled cost decision (see the Adelaide
   section above), not an oversight. Completing it to full coverage (a second ~560-URL fetch pass
   against the `/dom/` variant) would be the natural next increment if a future consumer needs
   domestic-specific data beyond the sample.
4. **No postgraduate or research-degree coverage** — out of scope for this package by the original
   brief (undergraduate only); every university's sitemap/catalogue in this package indexes
   postgraduate/research programmes that were not touched here.
5. **This package's original scope (the top 8 Australian universities by QS 2027 rank) is now
   fully resolved** — 5 extracted (770 records), 3 deferred by policy. Extending coverage further
   down the ranking (rank 9+) or to postgraduate levels would be new scope, not a gap in this
   package, and should come as a new assignment from BASORG rather than this lane's own
   extension.
