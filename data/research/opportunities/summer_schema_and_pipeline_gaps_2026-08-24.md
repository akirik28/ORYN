# Schema and ingestion-pipeline gaps — consolidated, 2026-08-24

Not a proposal. Every item below is a measurement — a real row this session hit the limit on —
not a recommendation to change anything; that call is DATA's/founder's. Two separate buckets on
purpose: **schema gaps** are things the database has no column for; **pipeline defects** are
things the database has a column for, but the ingestion process filled it with the wrong value.
Conflating them leads to fixing the wrong layer.

## Part 1 — Schema gaps (no column exists for this fact)

### 1. No currency column on `cost`
By far the widest-hitting gap. Every non-USD price this session touched shares one undifferentiated
numeric, and `lib/i18n/format.ts:16` defaults to USD when rendering:

| Row | Real price | Currency |
|---|---|---|
| LSE Summer School | 4,450 | GBP |
| Bocconi HS | 2,700 | EUR |
| ETH-adjacent (Hebbian) | — | CHF |
| Bilgi | "16000 TL + KDV" | TRY, tax-exclusive |
| ODTÜ | 60,000 | TRY |
| Koç University Summer Academy | 80,000 | TRY |
| King's College London | 3,195–9,375 (+65 fee) | GBP |
| HEIA-FR Swiss Summer Camp | 2,850 | CHF |
| St Andrews SAEC | 6,850 | GBP |
| Maastricht (Data Science) | 899 | EUR |
| KU Leuven | 380 (Flemish) / 430 (other) | EUR, nationality-conditional |

A Turkish family reading King's College London's £3,195 as "$3,195" understates it by roughly
25-30% at current rates — every one of these is wrong in the same direction, the same way ORYN-
RESEARCH found the Succeed aggregator to be.

### 2. `selectivity_evidence` has no column
`lib/opportunities/ingest.ts:187` requires it before accepting a tier above `open_enrollment` —
and then discards it. The evidence behind e.g. Rockefeller SSRP's proposed `highly_selective` (32
accepted/year, 4×8-10 teams, interview stage) exists only in this session's `findings.jsonl`, not
in the product. Nothing at read time can distinguish an evidence-backed tier from an asserted one,
and `commercial.ts`'s pay-to-enroll gate explicitly inherits this blind spot (see its own code
comment, lines 53-61).

### 3. No `deadline_mode` — rolling, windowed, and unresearched are all the same `NULL`
Distinct shapes this session actually hit:
- **Rolling admission**: UCSB RMP ("Admission decisions are made on a rolling basis"), Aggie STEM
  ("Registration is on a first-come basis").
- **A window to act, not a deadline**: AP's mid-November *ordering* deadline, PROMYS' January
  *opening* — the online-credentials workstream's B7 finding names this explicitly.
- **Genuinely unresearched**: the large majority of `NULL`s in the corpus.
All three currently look identical to any code that reads `deadline IS NULL`.

**A fourth shape, caught tonight on UPenn ESAP**: a deadline can be 100% correctly researched,
current-cycle, and non-stale on the source page, yet already ELAPSED by the time it's read — simply
because research happened after that cycle's application window closed. Read in isolation ("Priority
Deadline: January 31, 2026") the fact looked current because the page said "2026 session"; the miss
was not checking it against today's actual date (2026-08-24), where Jan/Feb 2026 is seven months
gone. Because most US/UK summer-program deadlines fall Nov-Feb for a following summer, **any research
pass run in the second half of the year will find the large majority of this corpus's deadlines
already in the past** — not a data defect, just the natural shape of the calendar, but a naive
`deadline IS NOT NULL AND deadline > NOW()` check would read a well-researched, fully current corpus
as almost entirely deadline-missing. A `deadline_mode` (or a paired `next_cycle_announced` boolean)
would let the product distinguish "this cycle closed, next one isn't posted yet" from "we don't know."

### 4. No way to express a price LADDER
A single numeric lands on whichever rung the ingestor happened to capture:
- Harvard SSP: $4,180 / $8,160 / $9,100 / $15,735 — we store $9,100.
- Wharton M&TSI: official page says $12,000; we store $9,000.
- UCSB RMP: $5,675 (commuter) vs $13,274 (residential) — we store NULL.
- King's College London: £3,195/6,180/9,375 by course count, plus a separate £1,970-11,685
  residential option.
- HEIA-FR: CHF 2,850 total vs CHF 2,700 "residential portion" — two numbers, one field.

### 5. No way to express nationality- or school-system-conditional values
KU Leuven charges €380 (Flemish students) vs €430 (everyone else) — not a range, a branch.
TechGirls' eligibility is a multi-clause AND/NOT structure (citizen AND resident of a participating
country, NOT a recent US-program alumnus, NOT a dual US citizen abroad) that no `eligible_countries`
array can express — it can produce false negatives (correctly-eligible students excluded by an
overly-blunt filter) as easily as false positives.

### 6. No way to express birth-year-based eligibility (as opposed to age)
Universidad de Navarra: "rising sophomores (born in 2009) & rising juniors (born in 2008)".
TechGirls: "Born on or between July 12, 2008 and July 11, 2011." A birth-year (or birth-window)
gate is not losslessly convertible to a plain `minimum_age`/`maximum_age` integer pair without a
reference date, and silently converting one to the other introduces off-by-one-year errors near
each cutoff.

### 7. No field for stipends / negative cost, and `cost=NULL` conflates three different facts
"Unknown", "verified free", and "the program pays the student" currently render identically.
RSI is explicitly "cost-free to students" (verified). Rockefeller SSRP's cost is genuinely
unestablished this session (not the same thing). Some research programs pay a stipend — a `cost`
field with no sign convention cannot represent that without a separate flag.

### 8. No field for timezone/attendability on online programs
SUMaC's two online session times (8-11am or 5-8pm Pacific) are explicitly *equal in content* to
its residential program per Stanford's own words — but for a student in Türkiye (UTC+3) one slot
is early evening and the other is the middle of the night. `location_mode='online'` says nothing
about whether "online" is actually attendable from a given timezone. This is a real eligibility
fact with nowhere to live.

### 9. No field for a *structural* access barrier that isn't a stated eligibility rule
American Legion Boys State states no citizenship/residency clause nationally, but selection runs
through nomination by a student's own US high school and the local Legion post — a real barrier
for an international applicant that no `citizenship_restrictions` text field currently captures
because there is nothing to write into it. Same shape as Caltech SRC's single-school-district
(PUSD) limit, found earlier this session. **A fourth, differently-shaped example:** HKBU's (free,
online, 18-programme) summer offering states plainly *"Only students from invited schools are
eligible to register"* — not a district, not a citizenship rule, not a socioeconomic program, but an
opaque school-invitation allowlist with no stated criteria for how a school gets invited. A
self-motivated student at a non-invited school cannot register regardless of merit, and nothing in
`citizenship_restrictions` or `residency_restrictions` is shaped to hold "your school has to have
been asked."

### 10. No field for a non-refundable pre-decision application fee, separate from program cost
UCSB ($75), Harvard SSP ($75), VTSP ($35), Premed Projects (£395), King's College London (£65) all
charge a fee before any admission decision — invisible in a single `cost` field, and materially
different from a program fee (charged only after acceptance).

## Part 2 — Ingestion pipeline defects (the column exists; the value is wrong)

### 11. `official_url` pointing at content unrelated to the described program
Found in 14+ `active` rows this session (5 fixed and merged by CEO tonight; see
`summer_url_fix_review_2026-08-24.md` for the rest). Not random noise — a specific, repeatable
failure: a faculty CV PDF, an unrelated master's-degree page, a different school's own website
entirely, a random research-portal profile. **In every fixable case, the correct URL was already
present as plain text inside that same row's own `description` field** — strongly suggesting the
extractor is choosing the wrong link from a multi-link source blob rather than failing to find one
at all.

**Confirmed present in `under_review` too, not just `active`** — a brief look at that bucket (90
rows, otherwise unexplored tonight) found the identical pattern within minutes: Fordham University's
row points at a Graduate School of Social Service faculty CV PDF (the correct Summer Leaders Academy
URL is in its own description, exactly like the CMU case), and Google's "Computer Science Institute"
row points at an unrelated Northeastern Illinois University Bachelor's-degree page instead of NEIU's
own specific page about hosting a CSSI extension. **This means the true scope of this defect is
likely proportional to the whole ~252-row table, not just the ~150 `active` rows searched
tonight** — worth a pipeline-level fix (re-extract every row's correct link from its own description
where one exists) rather than continuing to close it one row at a time.

### 12. `title` sometimes holds a scraped fragment instead of a program name
"Time: 4:30pm – 5:30pm (Hong Kong time) (time in your region)", "ECON 1 - 01 Introductory
Microeconomics...", "Earn college credit that may transfer to any college you attend" — page
fragments (a webinar time, a course-catalog row, a marketing subhead), not titles. Distinct from
#11: these rows' `description` doesn't rescue them either, because the underlying source isn't a
program page at all.

### 13. Aggregator-sourced rows can carry description text for the WRONG program
"Summer Programs in the Netherlands - 2025" is titled and URL-filtered for the Netherlands, but its
captured description text is about an unrelated Milan, Italy program — the aggregator source
(summerschoolsineurope.eu) itself warns "Should be examined in each link, not all of them are for
high school students," and that warning is sitting in our own stored description, unactioned.

### 14. Two-university-audience confusion in "summer school"-branded rows
Named already in `DRY_RUN_PACKAGE.md` §6 (Bocconi, CBS) — continental European "summer school"
frequently means a short course for enrolled university students, not a high-school program, and
nothing in title or domain distinguishes the two; only the eligibility text does.

### 15. `official_url` can be correct while `description` is independently stale
Distinct from #11 — the two fields can fail on separate axes. Oxford Royale's stored `description`
is 2024 essay-competition promo copy; its `official_url` (oxford-summer-school) is fine and
currently renders the real, current 2026 program with real 2026 prices. A row-level "is this good"
check needs to verify both fields separately — fixing the URL alone (or trusting a description
because the URL looks right) isn't sufficient. Caught by CEO cross-checking a proposed write
against the row's own stored description before applying it, not by either of us alone.

**A second confirmed instance, same night: Summer Discovery.** Its `official_url`
(summerdiscovery.com) already renders correct, current, multi-campus content — but its stored
`description` carried a stale, Dartmouth-specific tracking-parameter email link
(`.../apply/user/login?utm_source=email&...`) instead of the general current content. Same
verification discipline caught it the same way: CEO checked the proposed write against the row's
existing description before applying an `application_open_date`, found the mismatch, and asked
before writing rather than after. Two independent instances in one night is enough to call this a
real pipeline pattern, not a one-off — worth the same re-extraction consideration as #11.

**A third confirmed instance: USC Summer Programs.** `official_url` (precollege.usc.edu/summer-
programs/) is clean and resolves to genuinely current 2026 content — but the stored `description`
carries "Program dates: June 15 - July 12, 2025" plus a 2024-campaign tracking-parameter link
(`?utm_source=mailchimp&utm_campaign=november_2024_app_launch`) baked into its text. Same shape as
Oxford Royale and Summer Discovery: URL and description drift independently. Three confirmed
instances in one night moves this from "worth watching" to "worth the same pipeline-level
re-extraction fix considered for #11" — a script that regenerates `description` from each row's own
live `official_url` would close all three at once rather than requiring one-off fixes per row.

### 16. Some source domains block automated re-verification entirely — relevant to any future scheduled re-verification job (Phase 30)
Four confirmed, repeatable, site-level cases where a general-purpose fetch tool cannot read the
institution's own pages at all, distinct from a single dead link: **CTY** (cty.jhu.edu — 4 confirmed
dead/redirecting sub-paths, a URL-restructuring pattern rather than a fetch block, but functionally
the same "presume stale, verify via fallback" consequence), **ie.edu** (every page tried this session —
3 for 3 — hit a 10+-redirect loop, likely a cookie-consent gate the tool can't clear), **fordham.edu**
(every admissions/pre-college page tried — 2 for 2 — redirects to a CAS login gate), **summer.gwu.edu**
(2 for 2, hard 403 on every path tried). A few individual 403s elsewhere (ku.edu.tr, ei.jhu.edu's cost
page, bentley.edu's apply page, sevenoakssummerprogramme.co.uk transiently) may or may not be part of
a similar site-level pattern — only checked once or twice each, not confirmed as systemic the way the
four above are. **Consequence**:
research this session repeatedly fell back to WebSearch summaries for these domains rather than direct
verification — workable for a one-time research pass (search-fallback facts are recorded with explicit
lower-confidence flags throughout `findings.jsonl`), but a **scheduled** re-verification job hitting
these same domains on a cron would silently fail or silently under-verify every time, with no
error surfaced to a human unless someone builds domain-specific handling (a different fetch strategy,
a real browser session, or an allowlist of "known-blocked, treat search-fallback as sufficient").

### 17. A dumped-looking structured fragment in `description` is not automatically trustworthy data, even provisionally
Item #11 noted `description` sometimes contains a plausible-looking garbled fragment (e.g. Mathworks'
`"18.0 | Teacher Recommendation Transcript Essay | 4000.0"`) and speculated it might be a misparsed
age/requirements/cost triple worth treating as provisional. Now checked directly: Mathworks' real,
live-confirmed cost is **$6,600**, not the `4000.0` sitting in that fragment. The garbled data was not
just unstructured — it was wrong. Any future process that tries to auto-promote these fragments into
real columns (as item #11's speculation suggested might be tempting) should verify each one against a
live source first, not treat "the description contains something number-shaped" as evidence of that
number's accuracy.

---

*Every fact above is sourced in `findings.jsonl` / `findings_online.jsonl` (search by row title or
the section number referenced). This document exists so DATA/founder can prioritize schema work
from evidence density rather than from memory of individual findings.*
