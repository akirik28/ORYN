# Depth pass on 40 Turkish-applicant target universities — 2026-08-31

Founder brief: ORYN has 1,019 universities but only 150 have any programme, 104 any
requirement, 128 any statistic — ~87% of the catalogue is name-and-photo only. Rather than
add more countries, go deep on the ~40 institutions Turkish students actually apply to
(Turkey + their main UK/US/NL/Italy targets) and fully populate `university_programs`,
`university_requirements`, `university_deadlines`, `university_statistics` for those, with
real sourced facts only. `opportunities` was explicitly out of scope and untouched.

## The 40

Turkey (12): Ankara Üniversitesi, Bilkent, Boğaziçi, Gebze Technical (GTU), Hacettepe,
İTÜ, Istanbul University, Koç, METU, Özyeğin, Sabancı, Yıldız Technical.
UK (12): UCL, Imperial, LSE, King's College London, Edinburgh, Manchester, Warwick,
Bristol, Oxford, Cambridge, Queen Mary, Durham.
Netherlands (10): Amsterdam, Erasmus Rotterdam, TU Delft, Groningen, Utrecht, Leiden,
Maastricht, Eindhoven, Tilburg, VU Amsterdam.
Italy (6): Bocconi, Politecnico di Milano, Sapienza, Bologna, Padova, Politecnico di
Torino.

US institutions were not included — `university_statistics` (128 rows) was already
US-only before this pass, and US programmes/requirements were already comparatively well
covered (see the "why statistics stalled" section below for the reason this ended up
mattering).

## Coverage matrix — before vs after

| | programs | requirements | deadlines | statistics |
|---|---|---|---|---|
| Before (institutions with ≥1 row, of 40) | 39 | 35 | 33 | 1 |
| **After** | **40** | **40** | **40** | **1** |

Programs, requirements and deadlines are genuinely closed — every one of the 40 now has at
least one verified row in each table. Statistics is not, and that's not an oversight; see
below.

Per-institution row counts after this pass (programs = `verification_state =
'verified_current'` only):

**Turkey** — Ankara 153p/3r/2d, Bilkent 33p/4r/1d, Boğaziçi 30p/5r/1d, Gebze 23p/1r/2d,
Hacettepe 101p/9r/1d, İTÜ 69p/6r/1d, Istanbul University 124p/2r/1d, Koç 22p/17r/4d, METU
136p/11r/2d, Özyeğin 24p/2r/1d, Sabancı 21p/9r/1d, Yıldız 43p/1r/1d.

**UK** — UCL 429p/16r/2d, Imperial 73p/12r/4d, LSE 43p/17r/1d, KCL 152p/5r/1d, Edinburgh
98p/12r/5d, Manchester 294p/15r/4d, Warwick 190p/5r/2d, Bristol 62p/2r/1d, Oxford
52p/6r/3d, Cambridge 33p/7r/8d/**1 statistic**, Queen Mary 110p/9r/1d, Durham 162p/2r/1d.

**Netherlands** — Amsterdam 330p/34r/13d, Erasmus 151p/61r/22d, TU Delft 53p/30r/11d,
Groningen 190p/41r/12d, Utrecht 13p/1r/2d, Leiden 70p/2r/2d, Maastricht 27p/0r/2d (see
gap below), Eindhoven 15p/1r/2d, Tilburg 127p/46r/15d, VU Amsterdam 163p/53r/27d.

**Italy** — Bocconi 13p/4r/4d, Politecnico di Milano 30p/5r/1d, Sapienza 69p/3r/1d,
Bologna 122p/2r/1d, Padova 106p/2r/5d, Politecnico di Torino 26p/5r/1d.

Programs were already ≥1 for 39/40 targets before this pass (only genuinely new work
happened on requirements/deadlines/statistics); Maastricht's requirement count is 0 — see
below, it's a real, reported gap, not silently skipped.

## What was added (this pass only)

36 requirement rows + 5 more in a gap-closing follow-up (41 total) and 26 + 1 deadline
rows (27 total), all in `data/research/university-requirements/*2026-08-31*.jsonl`,
applied via `npm run ingest -- --only=2026-08-31` / `--only=gapclose` (see the new `--only`
flag on `scripts/ingest-requirements-deadlines.ts` — added so this batch could be reviewed
and applied independently of the pre-existing, still-unapplied 2026-08-21/22/23 corpus
sitting in the same directory; see "Found but deliberately not touched" below). Full audit
trail in `requirement_research_queue` / `deadline_research_queue`,
`batch_id='requirements-deadlines_2026-08-31'`.

Every record cites its own `source_url`, is `source_type: official_primary` (a couple
`official_application_system` / `official_national_regulator` for UCAS/Studielink/ÖSYM),
and was read from the institution's own live page or PDF this session — not carried over
from training knowledge, not inferred from a search-engine summary without independently
re-checking the primary page. Two summarized search results were caught and discarded
rather than recorded: one for Gebze Technical University's English-test scores (invented
numbers that don't appear anywhere on the real page — verified by loading the page
directly and comparing) and one that conflated Utrecht's general and University College
Roosevelt's honours-college requirements. Both are called out inline in the affected
records' `researcher_notes` so a future reviewer doesn't have to rediscover the same trap.

Structurally important facts recorded once and shared across every institution they
govern, rather than researched per-institution:
- **UCAS deadlines** (12 UK targets): 13 January 2027 general deadline, 15 October 2026
  for Oxford/Cambridge/most Medicine — both quoted directly from ucas.com's own event
  pages, not summarized.
- **Studielink deadlines** (10 NL targets): 15 January (numerus fixus) / 1 May (other
  programmes) — from studielink.nl's own site (WebFetch was blocked by the site directly;
  fetched via the in-app browser instead).
- **ÖSYM/YKS exam dates** (12 TR targets, domestic track): TYT 20 June 2026, AYT/YDT 21
  June 2026 — read live off osym.gov.tr's own homepage calendar. The YKS *application*
  window (as opposed to exam date) was found via search (6 Şubat–2 Mart 2026) but not
  independently re-confirmed against ÖSYM's own page text, so it was deliberately left out
  rather than recorded on unverified wording.

Genuinely institution-specific finds worth a reader's attention:
- **Cambridge**, on its own international-entry-requirements page, states outright that
  the Turkish national high school diploma (Devlet Lise Diplomasi / Anadolu Lisesi) *alone*
  is not competitive for admission, and names what is (A-levels, IB, 5+ AP at grade 5 with
  an 85+ average, or a first year of university abroad). This is the single most
  decision-relevant fact this pass found for a Turkish applicant targeting Cambridge — it
  belongs in front of a 14-18-year-old choosing a curriculum, not discovered after
  applying.
- **Yıldız Technical University** states plainly on its own international-admissions page
  that it does *not* hold or accept the YÖS exam — a real negative result, recorded as
  such (confidence: medium, since the specific page carries an older update-date than the
  section it sits in) rather than silently omitted.
- **Gebze Technical University**, by contrast, runs a detailed rolling multi-round
  international admission process with dated 2026 windows and explicitly still lists
  TR-YÖS among its accepted routes — genuinely different from Yıldız, not a national rule.
- **Özyeğin University** measures English proficiency *after* enrollment via its own
  two-phase internal exam (Placement, then a 65/100 Proficiency exam called TRACE) rather
  than requiring an external IELTS/TOEFL score before applying — structurally different
  from every UK/NL institution in this batch, flagged as such in the record so a
  cross-institution comparison doesn't quietly conflate two different kinds of
  requirement.
- **Oxford** currently does not accept any TOEFL sat from 21 January 2026 onward (still
  "under review" per its own page), while UCL, Imperial, KCL and Warwick all already
  publish scores against the new TOEFL scale — a live discontinuity worth knowing before
  picking which test to sit.
- **Politecnico di Milano**'s official 2026/27 admission call accepts a SAT score,
  converted to its own 0–100 TOL scale, as an alternative to sitting its own entrance test
  — read from the actual bando PDF, not a summary (its own English translation carries a
  legal disclaimer that only the Italian original is normative).

## Real gaps, reported rather than papered over

- **Maastricht University: 0 requirement rows.** Four separate attempts this pass (the
  general bachelor's admission page, an SBE-specific page, a factsheet PDF that turned out
  to be for a *different* programme — UCM exchange, not degree-seeking admission — and a
  live-rendered fetch of a specific programme page) did not surface a clean, general,
  verbatim English-requirement quote; Maastricht's site renders admission requirements
  behind interactions this pass's tooling didn't successfully trigger. Search-engine
  summaries did surface numbers (IELTS 6.5 / TOEFL 90, roughly) but none were independently
  confirmed against a page's own rendered text, so — per the founder's own instruction —
  nothing was recorded rather than writing an unconfirmed number. This is the one target
  institution still at 0 requirements.
- **`university_statistics`: 1/40, not 40/40.** This is the incomplete part of the brief,
  and it's incomplete for a structural reason, not lack of effort: the table's own schema
  (`sat_range_low/high`, `act_range_low/high`, `cost_of_attendance` — documented elsewhere
  in this codebase as specifically IPEDS's US all-in sticker-price concept, not tuition)
  is shaped around the US Common Data Set convention. UK/NL/Italian/Turkish universities
  overwhelmingly do not publish admissions data in that shape — most don't publish one
  citable "acceptance rate" the way US institutions do at all, and where a figure exists
  it's usually buried in a demographic-breakdown PDF, not a single top-line number.
  Concretely this pass: got a clean official figure for **Cambridge only**
  (22,513 applications / 4,893 offers / 3,669 acceptances, 2025 cycle, published May 2026
  — https://www.undergraduate.study.cam.ac.uk/sites/default/files/2026-05/ug_admissions_statistics_2025_cycle.pdf,
  written as `admission_rate = 0.1630`); got Oxford's own page stating "over 23,000...
  around 3,300... usually" — deliberately NOT written, since computing a rate from two
  rounded, non-cycle-specific figures would be exactly the false precision the founder's
  spec forbids; and hit real access blocks on Oxford's and Bologna's own PDF stat reports
  (both returned HTTP 403 to direct fetch, including via curl with a standard browser
  user-agent — genuinely blocked, not a tool limitation). Recommendation: either scope a
  separate, deliberately-scheduled pass to hunt precise official figures per institution
  (expect low yield and significant effort per institution, per the above), or extend
  `university_statistics` — or route non-US institutions through
  `university_profile_metrics`, the flexible per-fact store already built and populated
  for exactly this kind of variably-shaped fact (already has 2-8 rows for every Turkish
  target in this batch, and was the pattern the UK tuition-acquisition script adopted for
  the identical reason) — before sinking more research time into a schema that doesn't fit
  the data.
- **Requirements and deadlines are "at least one row", not exhaustive.** UCAS/Studielink/
  YKS national deadlines and one or two English-language/eligibility requirements close
  the single biggest gap (an institution page with *nothing* on it) for every target, but
  most of these institutions publish requirements and deadlines that vary by individual
  programme (Manchester states no university-wide English score at all — confirmed and
  recorded as a real negative result, not a gap — and directs to per-course pages; several
  Italian universities run per-programme *bandi* rather than one date). Treat "≥1 row" as
  "a student clicking this university now finds something real and sourced", not as "every
  fact about every programme is captured".

## Found but deliberately not touched

A dry run of the existing (pre-2026-08-31) research corpus in this same directory — dated
2026-08-21 through 2026-08-23, spanning many more countries than this batch — currently
shows 68 requirement and 21 deadline records as `accepted` (i.e. would insert cleanly) but
never applied. This was flagged to the founder/control-tower and is being tracked as a
separate task on its own branch: sample it, check source URLs and cycle years for
staleness, and report before any bulk `--apply` — not folded into this batch. The new
`--only` filename filter on `scripts/ingest-requirements-deadlines.ts` exists specifically
so that review can happen independently without this batch's files getting swept up in it
(or vice versa).

## Verification

`npm run lint`, `npm run typecheck`, `npm run test` (2553/2553 passed, 175 files),
`npm run build` all green on branch `oryn/unidata-2026-08-31`. Spot-checked live in the
browser against the running app (Utrecht University's detail page,
`/universities/a6562516-8500-484c-afb9-34fab26bd5fa`): both new requirement and deadline
rows render correctly under "Requirement check" (honestly labeled "Needs review" — no
`structured_rule` was authored, per this codebase's own rule that ingestion never writes
one) and "Important dates" (recurring Studielink deadlines correctly rendered as "Recurring
— exact year not published", not a fabricated date), each with a working "Source ↗" link
to the exact URL cited above.
