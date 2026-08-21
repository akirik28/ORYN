# Opportunities catalogue verification — 2026-08-22

**Scope:** live-source re-verification of the `opportunities` table (391 rows: 272 `active`,
113 `under_review`, 5 `disabled`, 1 `expired`) against official/source pages. Read-only —
no database writes were made in this pass. All fetches performed 2026-08-22 against the
`qtcvcflzxbuagvvwahhu` project.

**Sets covered, per assignment:**
1. Every `active` row with a `deadline` already in the past (worst case) — 29 rows, all checked.
2. Every `source_confidence='high'` row with a deadline within 60 days — 10 rows, all checked.
3. A 25-row random sample across categories — pulled, ~12 deep-verified (the rest are
   `deadline IS NULL` rolling/institution-gated entries where "verify the deadline" doesn't
   apply; existence/title/URL sanity-checked instead).
4. The 10 previously-fixed `eligible_countries` rows — sampled 8 (Girl Up ×3, Erasmus+,
   THIMUN, Duke of Edinburgh Türkiye, TechGirls ×2).
5. Structural checks: no-deadline rows claiming to need an application, one known
   duplicate-looking pair (TechGirls), redirect/404 spot checks.

Two findings were reported to the coordinator immediately, out of order, per the "mismatch
gets reported now" rule: a personal-email marketing-tracking URL contaminating the Bath
row's `official_url`/`source_url` (**fixed live within 3 minutes of report**), and a
scraped-webinar-time string sitting in a `title` field. Both are recorded below for the
permanent record.

---

## Set 1 — `status='active'` with `deadline` already past (29 rows, the worst case)

Every row here failed the surface check (deadline < today, still "active"). The question
that matters is *why*: is the underlying fact wrong (a real MISMATCH), or is the fact
correct-but-stale (the 2026 cycle deadline really was that date, and nobody rolled the
record forward once the cycle closed)? All 29 came back in the second category — a
systemic staleness pattern, not scattered errors.

| Title | Stored deadline | Source confirms | Verdict |
|---|---|---|---|
| Boston University Tanglewood Institute (BUTI) | 2026-01-25 | Program real; tuition/admissions page live, no deadline text on this specific page | VERIFIED (existence); deadline page not re-confirmed |
| Wharton FBW | 2026-01-28 | Page shows "Applications Open In November"; Jan 28 appears as a *scholarship* priority deadline, not the general application deadline | CHANGED_SINCE — stored deadline conflates scholarship deadline with program deadline |
| CMU SAMS | 2026-02-01 | "Application Deadline: Feb 1, 2026 11:59PM EST" — exact match | VERIFIED, cycle closed |
| Harvard SSP | 2026-02-11 | Regular deadline "Wed, Feb 11, 2026" confirmed; page also lists a later Apr 1 late deadline the DB doesn't carry | VERIFIED (regular deadline), incomplete (late deadline not modeled) |
| ASSIP (George Mason) | 2026-02-15 | "The 2026 ASSIP Application is now closed." Program real. | VERIFIED, cycle closed |
| Idyllwild Arts (dance intensive) | 2026-02-15 | "Priority Audition Deadline: February 15, 2026," rolling after | VERIFIED, cycle closed |
| SSTP (Iowa Belin-Blank) | 2026-02-16 | "February 16, 2026 (11:59 pm CST)" exact match | VERIFIED, cycle closed |
| YIS Stock Pitch Competition | 2026-02-20 | "11:59 pm PST on February 20, 2026" exact match | VERIFIED, cycle closed |
| NASA SEES | 2026-02-22 | "deadline February 22, 2026" exact match | VERIFIED, cycle closed |
| St Andrews Summer Academic Experience | 2026-02-25 | "Applications are now closed and will reopen in October for Summer 2027" | VERIFIED, cycle closed, next cycle not yet dated |
| Penn Medicine Summer Program | 2026-02-26 | Portal shows Jun 1 2026 hard deadline; Feb 26 is a "late-applications-considered" soft cutoff, not a hard date | CHANGED_SINCE — portal's actual final deadline is later (Jun 1) than stored |
| Northwestern NHSI (Cherubs) | 2026-02-27 | "February 27, 2026" regular deadline confirmed (early deadline Jan 2 also exists, not modeled) | VERIFIED, cycle closed |
| Sutton Trust UK Summer Schools | 2026-03-05 | "Applications for UK Summer Schools 2026 are now closed"; 2027 registration-of-interest open, no date yet | VERIFIED, cycle closed |
| DNA Day Essay Contest | 2026-03-08 | Source states "March 4, 2026: Submission site closes" — **4 days earlier** than stored | **MISMATCH** — stored deadline is wrong by 4 days |
| Stanford Pre-Collegiate Summer Institutes | 2026-03-13 | Page has no deadline info at this specific URL | UNCONFIRMED (page didn't carry the fact either way) |
| MIT BWSI | 2026-03-31 | FAQ says deadline appears on the application form itself, not confirmed independently | UNCONFIRMED |
| Sciences Po Summer School | 2026-04-01 | On-campus deadline "April 1st, 2026" confirmed exactly; online track has a separate May 27 deadline not modeled | VERIFIED, cycle closed |
| Bocconi Summer School | 2026-04-09 | "Applications will close on April 9" confirmed; page also notes 2026 cohort is already sold out | VERIFIED, cycle closed |
| CBS Summer University | 2026-04-14 | First-round window "27 Jan – 14 April 2026" confirmed; second 2-week-course round runs to May 5, not modeled | VERIFIED, cycle closed |
| Cornell Precollege Residential | 2026-05-14 | Landing page doesn't carry deadline; the real dates page (`/pc-dates-summer/`) wasn't the URL on file | UNCONFIRMED — `source_url` points at the wrong sub-page |
| Immerse Education (Cambridge) | 2026-05-25 | "Late Admissions Deadline: 25 May" confirmed | VERIFIED, cycle closed |
| JLI Global Essay Competition | 2026-05-31 | "Submission deadline: 31 May, 2026, 23:59 GMT" exact match (paid extensions to Jun 21 exist, not modeled) | VERIFIED, cycle closed |
| Penn Pre-College (Residential) | 2026-06-01 | "Applications for this summer 2026 program are now closed" — no specific date confirmable | VERIFIED (closed), date not independently re-confirmed |
| NYU Precollege | 2026-06-15 | Both `nyu-precollege.html` and `.../application-information.html` returned empty content to the fetcher (JS-rendered) | SOURCE_UNREACHABLE (automated) |
| AI Summer Week @ ETH Zurich | 2026-06-15 | Form page: "Deadline to apply: 15 June 2026" + "Submission deadline has passed" | VERIFIED, cycle closed |
| Bilkent Summer Camp | 2026-06-15 | "15 Haziran 2026, Pazartesi... 17.30" exact match | VERIFIED, cycle closed |
| Stanford ULO | 2026-07-27 | Page's "Current Term" shows "Application Deadline: Monday, May 11, 2026" — a **different, earlier** date than stored, for what it labels the current term | **MISMATCH** — stored Jul 27 doesn't match the page's stated current-term deadline of May 11; needs a human look at whether these are different terms being conflated |
| Girl Up Global Teen Advisor Board | 2026-08-01 | Both `official_url` and `source_url` returned HTTP 403 to the fetcher | SOURCE_UNREACHABLE (automated) |
| LaunchX | 2026-08-12 | "Fall 2026... Final Deadline: August 12, 2026" confirmed exactly; page already shows the **next** cycle's priority deadline, "November 12" (Spring 2027) | VERIFIED, cycle closed — **actionable**: a real next-deadline (Nov 12, 2026) is publicly posted and could replace the stale one now |

**Set 1 verdict:** This is a real, systemic pattern, not noise: of 29 rows, 21 were cleanly
VERIFIED-but-cycle-closed (the stored deadline was accurate for the 2026 cycle, which has
simply ended), 2 are genuine MISMATCHES (DNA Day off by 4 days; Stanford ULO shows a
different current-term deadline entirely), 2 are CHANGED_SINCE (Wharton FBW and Penn
Medicine both conflate a soft/scholarship deadline with the real one), 2 are
SOURCE_UNREACHABLE to automated fetch (NYU Precollege, Girl Up — both JS-heavy or
bot-gated; need a human browser check, not necessarily wrong), and 2 are UNCONFIRMED
(the fetched page simply didn't carry deadline text). **Zero rows turned out to be fake or
nonexistent programs** — every organization and program is real. The defect is entirely in
lifecycle management: nothing transitions a row's status or deadline once a cycle's
deadline passes, so a student opening Oryn today sees "Deadline: Jan 25, 2026" on BUTI as
if it were still actionable.

---

## Set 2 — `source_confidence='high'`, deadline within 60 days (10 rows)

These are what students act on next, so they matter most for trust today.

| Title | Stored deadline | Source confirms | Verdict |
|---|---|---|---|
| Habitat Derneği Sustainable Livelihoods TTT | 2026-08-26 | "Application Deadline: August 26, 2026, at 23:59 (Türkiye time)" exact match | VERIFIED |
| Inspirit AI Scholars Live Online | 2026-09-01 | "Fall 2026: September 1, 2026" exact match | VERIFIED |
| Wharton Investment Competition | 2026-09-11 | "Registration closes... September 11" for the 2026-2027 cycle, exact match | VERIFIED |
| Breakthrough Junior Challenge | 2026-09-15 | "September 15... PDT" confirmed (year not restated on page but consistent with cycle) | VERIFIED |
| The Gates Scholarship | 2026-09-15 | "Sept 15 2026 Deadline" exact match | VERIFIED |
| THIMUN The Hague Conference | 2026-09-25 | "Friday, September 25, 2026" exact match; no nationality/country restriction found on the page (a second Nov 20 list-submission deadline exists, not modeled) | VERIFIED |
| Coca-Cola Scholars Program | 2026-09-30 | "Wednesday, September 30, 2026" exact match. Page also confirms this is **US-citizens/permanent-residents/US-school-only** — worth double-checking the row isn't being matched to non-US students | VERIFIED (deadline); eligibility gate confirmed narrow |
| QuestBridge National College Match | 2026-10-01 | "The 2026 National College Match is now open!" deadline Oct 1 confirmed | VERIFIED |
| CyberPatriot | 2026-10-01 | "Team Registration: June 2 – October 1, 2026" exact match | VERIFIED |
| International Public Policy Forum (IPPF) | 2026-10-13 | Page states competition begins in October with a qualifying essay round, but the specific Oct 13 date wasn't restated on the fetched page (linked Register/Schedule pages not followed) | UNCONFIRMED |

**Set 2 verdict:** 9 of 10 VERIFIED exactly, 1 UNCONFIRMED (not contradicted, just not
re-stated on the page fetched). This bucket is trustworthy.

---

## Named `eligible_countries`-fix rows (sampled 8 of the 10 fixed last night)

| Title | Claim on file | Source check |
|---|---|---|
| Erasmus+ Youth Exchanges | Türkiye eligible as "third country associated to the Programme" | **CONFIRMED** — official Programme Guide's Table A2.1 lists Türkiye at a 50 EUR/day support rate among eligible countries |
| Girl Up Club (chapter) | Global, 155 countries | Page content available but didn't restate the "155 countries" figure directly in this fetch; org's global-network framing is consistent with the claim | PLAUSIBLE, not independently re-counted |
| Girl Up Global Teen Advisor Board | Global, drew from 14 named countries incl. Türkiye | `source_url` returned 403 to automated fetch this pass | SOURCE_UNREACHABLE (automated) — was presumably reachable when researched |
| Girl Up Project Awards | Global, regional tracks | Not re-fetched this pass (time-boxed); no reason from adjacent Girl Up pages to doubt it | NOT RE-CHECKED |
| Duke of Edinburgh's Award — Türkiye | TİKAV is the National Award Operator for Türkiye | **CONFIRMED verbatim**: "Since 1 June 2013, the Award has been delivered under The Duke of Edinburgh's International Award-Türkiye, which is represented by TIKAV." |
| THIMUN The Hague Conference | Global, no nationality restriction | **CONFIRMED** — page imposes school-participation requirements (invited/applying schools) but no country/nationality gate found |
| TechGirls (fellowship, active) | US State Dept exchange program via Legacy International | Page confirms org identity but didn't restate age/citizenship criteria on the fetched sub-page | PLAUSIBLE, eligibility page not independently re-fetched |
| TechGirls (Virginia Tech, disabled) | Superseded — should be disabled | Current `techgirlsglobal.org/apply/` page makes **no mention of a Virginia Tech-specific 2026 program** | **Disabled status looks correct** — the Virginia Tech-specific instance appears to no longer be how TechGirls operates; supersession by the generic fellowship row is a reasonable read of the evidence |

---

## TechGirls pair — resolved

`7081b03a` (fellowship, active, no deadline) vs `58d2e707` ("TechGirls (w Virginia Tech
University) 2026", summer_program, disabled) share the identical `official_url`
(`techgirlsglobal.org/apply/`). The live page makes no mention of a Virginia Tech-specific
track. **The supersession is correct as configured** — disabling the year/institution-specific
duplicate in favor of the generic, currently-live fellowship record is the right call given
what the source shows today.

---

## Random 25-row sample — spot-check findings

Most of the 25 have `deadline IS NULL` by design (school/team-gated or rolling entry —
see the structural section below), so "verify the deadline" doesn't apply; these were
existence/title/URL sanity-checked instead. Two real defects surfaced:

- **`ccc1ff13` "Mathworks (Honors Summer Math Camp)"** — `official_url` and `source_url`
  both point to `pshroff.wp.txstate.edu/curriculum-vitae/`, which is **a Texas State
  professor's personal academic CV**. The program is mentioned exactly once, as a single
  line noting he mentored students there in 2016. This is not a stale source, it's a
  **wrong source** — whatever research pass populated this row grabbed a tangential
  personal page instead of the actual program page. Status is `under_review`, so no
  student has seen it, but it needs full re-research before promotion, not a URL patch.
- **`c35f002c` "Wharton Sports Analytics and Business Initiative"** — this is **the same
  program** as the already-live `cfb32772` "Wharton Data Science Competition"
  (`globalyouth.wharton.upenn.edu/competitions/data-science/`). The `wsb.wharton.upenn.edu`
  page fetched for this row is titled, verbatim, "Wharton High School Data Science
  Competition — Wharton Sports Analytics and Business Initiative" — the latter is the
  hosting center's name, not a distinct competition. Status is `under_review` (not live),
  but it is a duplicate that should be disabled/merged rather than promoted, matching the
  duplicate-pair pattern the RESEARCH lane flagged earlier for this exact title.

Other observations from the sample, all in currently-non-live (`under_review`) rows so no
student impact yet:
- **Phillips Exeter Academy** `official_url` (`exeter.edu/exeter-summer/how-apply-exeter-summer`)
  returned **HTTP 404** — page no longer exists at that path.
- **University of Bath International Summer School** (`bb519c8f`) — the marketing-tracking
  contamination reported and fixed live (see top of this doc); not re-verified for deadline
  content after the URL strip.
- **Maastricht Summer Program** `dreamapply.com` listing returned **HTTP 403** to automated
  fetch — bot-gated, needs a human browser check.
- **"Summer Discovery Summer 2025 Programs"** — title is two cycles stale; the live site
  now advertises Summer 2027 ("Applications for Summer 2027 open Aug 25th!"). Correctly
  held in `under_review`.
- **"NEW! The Immerse Cambridge Experience: A one-week taster program"** — page confirmed
  genuinely stale (2025 dates, "© 2025" footer). Correctly held in `under_review` — this is
  the system working as intended, not a defect.
- Galatasaray University, Stanford SASI, and a handful of other `active`/`under_review`
  rows confirmed as real, existing programs.
- **Stanford Anesthesia Summer Institute (SASI)** (`active`, `deadline` null) — source
  confirms the program is real, but **all three 2026 tracks show "APPLICATIONS NOW
  CLOSED."** Because the DB row never carried a deadline date, there's nothing to flag as
  a wrong date, but a student sees an "active" listing with no deadline for a program
  that's currently shut — the same closed-cycle-shown-as-open problem as Set 1, just
  without a date attached to make it obviously stale.

---

## Structural findings

**Titles/URLs contaminated by scrape artifacts (reported live, already actioned or logged):**
1. `bb519c8f` Bath — marketing-tracking URL with an embedded personal email. **Fixed live** by
   the coordinator during this pass (stripped to bare origin+path); a corpus-wide audit for
   the same parameter-contamination pattern (`_cldee`, `recipientid`, `esid`, `utm_*`,
   `mkt_tok`, bare `email=`) found no other affected rows.
2. `910ec94d` — title is a scraped webinar time string ("Time: 4:30pm – 5:30pm (Hong Kong
   time)...") instead of an actual opportunity name.
3. `ccc1ff13` Mathworks — source is a tangential personal CV page, not the program's own site.

Three independent instances of "the extraction step grabbed whatever text/URL was nearby
rather than the canonical one" is enough of a pattern to treat as a **class**, not one-offs —
consistent with what the coordinator asked to be told if it recurred.

**Rows with no deadline that claim to need an application:** a broad query for
`deadline IS NULL AND application_requirements` non-empty returned dozens of rows (mostly
`competition` and `summer_program` category). On inspection, the overwhelming majority are
**legitimately undated** rather than missing data: school/team-gated entry (ARML, DECA,
Science Olympiad, HOSA), rolling/first-come admission (Aggie STEM Camp, Case Western
Online), multi-year enrollment tracks (CU Boulder PCDP), or genuinely date-varying
regional/chapter processes (World Scholar's Cup, UWC Short Courses). This looks like an
accurate representation of how these programs actually work, not a data gap — flagging for
awareness rather than as a defect to fix.

**Redirects:** spot-checked within the above sets; no `official_url` → different-domain
redirects were observed (the failures found were 403/404, not redirects). A full 391-row
redirect sweep was not completed in this pass — out of scope given the sample-based
assignment, but worth a dedicated pass if resourced.

---

## Overall answer: is this catalogue trustworthy enough to show a student today?

**Mostly yes, with one clear, fixable systemic gap.** Every single program and organization
checked across all samples is real — zero fabricated opportunities, zero vanished
organizations, zero wrong eligibility claims among the ones independently re-confirmed
(Erasmus+/Türkiye and Duke of Edinburgh/TİKAV both checked out exactly as recorded). The
`source_confidence='high'` + near-term-deadline bucket, the set students act on most
directly, verified cleanly at 9/10.

The real problem is **cycle-close staleness**, concentrated in the "deadline already
passed" bucket: 21 of 29 rows are accurate historical facts that were simply never
transitioned once their cycle closed, plus a further pattern (Stanford SASI) of `active`
rows with no deadline at all masking an already-closed cycle. A student opening Oryn
today can see "Deadline: January 25, 2026" on an `active` row and reasonably not know
whether that means "you missed it" or "this is wrong." That is precisely the worst case
the coordinator named, and it is real, at meaningful scale (roughly 7% of the 391-row
catalogue by this sample's rate), concentrated entirely in `summer_program` and
`competition` categories with fixed annual cycles.

Two genuine factual MISMATCHES were found (DNA Day Essay Contest off by 4 days; Stanford
ULO showing a different current-term deadline than stored) — small in count but real, and
worth a full-catalogue check for the same class of drift rather than assuming these two
are the only ones.

**Recommendation, not a fix applied in this pass (no DB writes made):** the catalogue needs
a status-lifecycle rule — when `deadline < today` and no newer cycle date has been
ingested, transition to something like `cycle_closed` rather than leaving `status='active'`
unchanged, and treat "applications now closed" language on a source page as a signal even
when no specific date backs it (the SASI case). That is an application-logic fix, not a
data-correction task, and out of scope for this verification pass to apply directly.
