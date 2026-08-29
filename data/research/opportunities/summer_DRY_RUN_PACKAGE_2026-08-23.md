# ORYN-RESEARCH-SUMMER — dry-run package

**Lane:** ORYN-RESEARCH-SUMMER · session `db38e14b` · 2026-08-23 through 2026-08-24, overnight, continuing
per founder's explicit "do not stop before 11am" instruction.
**Status:** research artifacts only. **Zero production writes by this lane** — CEO writes to production
after reviewing dry-run proposals; see `summer_CHECKPOINT_2026-08-23.md` for the live back-and-forth log.
**Scope:** (A) Selective Summer Programs. (B) Online courses & certificates for high school — added by the
founder mid-session.
**Holds honoured:** Koç University Summer Academy (`152b3822`) and Interlochen are founder-held. No proposal
is written against either, including cost.

**⚠️ This document's findings A1-A15/B1-B6 below reflect the state as of 2026-08-23 and are NOT all
re-verified against tonight's continuation.** Since then: 6 rows retired by CEO (2 dedup, 4 not-an-
opportunity), 5+ `official_url` fixes written, a major new pipeline-defect pattern found (10+ rows with
`official_url` pointing at unrelated content, fixable from the row's own `description`), and ~25 additional
rows individually verified with real cost/selectivity/eligibility facts. **For anything touching a specific
row, `summer_findings_2026-08-23.jsonl` (250 entries and growing) is the current source of truth, searchable
by row_id — this document is the narrative for the first half of the session, not a live index.** See
`summer_CHECKPOINT_2026-08-23.md` for the running log, `summer_url_fix_review_2026-08-24.md` for the URL-defect
batch, and `summer_schema_and_pipeline_gaps_2026-08-24.md` for the consolidated schema-gap analysis.

---

## 0. What this package is for

ORYN's `opportunities` table has a `selectivity_tier` column (migration 0041) and a rendered badge.
Two thirds of the summer corpus carries `unknown`, which renders **no badge at all** — deliberately, so
that "unknown" never reads as "not selective." The consequence is that the catalogue cannot currently
tell a student the difference between a programme that takes 100 students a year for free and one that
takes anyone with a credit card.

**One correction up front, because it changes what this package claims.** `selectivity_tier` is *not*
read anywhere in the recommendation path — not in `lib/counselor/*`, not in `lib/opportunities/matching.ts`,
not in `browse.ts`, not in `lib/ai/*`. I verified this by grep after ORYN-CEO flagged it. So filling this
column **does not change what ORYN recommends.** What it does change:

- the **Browse/catalogue listing** (`features/opportunities/opportunity-card.tsx:138`, rendered by
  `app/(app)/opportunities/page.tsx`) — a surface students actually move through, and
- the **detail page** (`app/(app)/opportunities/[id]/page.tsx:104`).

It also prepares the data layer for a policy decision the founder has not yet made (whether
non-selective commercial programmes are excluded from the core recommendation engine). An empty column
makes that decision unimplementable for months; a filled one makes it a day's work.

*(Correction to CEO's note, verified: `lib/admissions/outlook.ts` does not read this column — its own
`selectivityTier` is a local function over a university's `admissionRate`, unrelated.)*

---

## 1. Corpus map — `category='summer_program'`, measured live 2026-08-23

**Correction to my own baseline.** My first snapshot did not select `status`, so every headline number I
reported earlier in the night mixed live rows with already-suppressed ones. The corpus is **252 rows**, but only
**157 are `active`** (90 `under_review`, 4 `disabled`, 1 `expired`). Both columns below, because they answer
different questions — the left is "how much of this corpus is defective", the right is "how much of it can
reach a student".

| | all 252 | **`active` (157)** |
|---|---|---|
| `selectivity_tier='unknown'` | 189 | **94** |
| `verification_state='unverified'` | 164 | **69** |
| both unknown **and** unverified | 164 | **69** |
| has `deadline` | 26 | 26 |
| has `cost` | 44 | 44 |
| has `eligible_countries` | 12 | 11 |
| from the *"Founder school-counselor Drive corpus"* import | 165 | **70** |

Two things follow. **Every** row that carries a cost or a deadline is active — enrichment and survival went
together, so the enriched set is not a random sample of the corpus. And the Drive-import problem in §2 is a
**70-row** live problem, not a 165-row one; the moderation pipeline has already caught more than half of it.

Where I quote a corpus-wide figure below, I say so. Where a finding is about what a student can actually
reach, it is measured on `active`.

**URL liveness** (all 252 fetched with a browser user-agent, 2026-08-23): 227×200, 16×403 (bot blocks —
not evidence of anything), 5×404, 3 timeouts, 1×202. So the corpus is not broken at the HTTP level; the
defects are in *what the URLs point at*, not whether they resolve.

**Also corrected: two of the best programmes in the corpus are not reachable at all.**
`RSI (Research Science Institute) at MIT` is **`status='disabled'`**, and the `summer_program` row for
`TechGirls` is **`disabled`** too. My earlier framing — "RSI and iD Tech are presented identically" — was
wrong in a way that matters: iD Tech is `active`, RSI is not. RSI isn't badge-less next to a commercial camp;
**it is absent.** (TechGirls does reach students, but through a separate `fellowship`-category row that is
`verified_current` — it is currently rank 2 for one user.)

## 1a. How to read every "live" claim in this document — four gates, not one

I got this wrong once and CEO caught it: I called LSE Summer School a *"live rank-1 recommendation"* when
the lifecycle gate already filtered it out. The disproof was in my own earlier query, in a column I had
computed and then not read. So every reach claim below is now measured against **all four gates**, in one
pass, rather than reasoned about:

| Gate | Where it is enforced | Effect |
|---|---|---|
| `status` | moderation | `under_review` / `disabled` / `expired` reach nobody |
| `verification_state` | `lib/counselor/state.ts:143`, `eligibility.ts:45` | only `verified_current` reaches the **counselor/advisor** path |
| `cycle_status` | `lib/opportunities/lifecycle.ts` | `closed` / `historical` / `discontinued` are non-actionable |
| `deadline` | same | a past date is non-actionable |

**Three reach classes**, used consistently from here on:

- **counselor + dashboard** — `active` **and** `verified_current`. Reaches advisor recommendations, the
  homepage preview, and Browse.
- **browse + dashboard only** — `active` but *not* `verified_current`. The counselor filter excludes it.
- **suppressed** — reaches nobody.

**This shrinks several of my own claims.** Bocconi's wrong-audience row, the Trinity College conflation,
Purdue's bare-homepage row, the Garcia news article and the UCSB duplicate are all **browse-only** — they
are `active` but unverified. Browse is still a student-facing catalogue, so they are not harmless; but it is
a smaller claim than the one I first made.

**And it sharpens two.** The two narrowest eligibility walls found tonight — **Caltech SRC** (one school
district, 5 users) and **CU Boulder PCDP** (first-generation **+** partner-school list **+** 7th-grade cohort
entry, 4 users) — are both `verified_current`, so both reach the **counselor path**. Not Browse-only.

**Confirmed working:** after the founder-approved deadline writes, **İTÜ** (2026-07-16) and **Sabancı**
(2026-08-01) both now compute `recommendable = false` — the existing gate closed them with no `cycle_status`
edit, which is the self-healing path this package predicted. **İstanbul Bilgi did not close, and rose to rank 1
for two users as a result** — the harm concentrated rather than dispersed. Its site publishes no 2026 cycle
at all; see §8c.

---

## 2. FINDING A1 — the Drive-corpus import's provenance claim does not hold

165 rows assert they were *"cross-checked against official/provider pages."* Sampling contradicts that
claim outright. These are not missing URLs — a null would be honest. These are confident, wrong URLs.

| Stored title | What the URL actually is |
|---|---|
| **Oxford Royale Summer Schools** | **`https://www.ox.ac.uk/` — the University of Oxford homepage** |
| University of Exeter, United Kingdom | `experts.exeter.ac.uk/35701-fatima-naveed` — a named individual's staff profile |
| University of St. Andrews (Scotland, UK) | `research-portal.st-andrews.ac.uk/en/persons/zainab-teraif/` — a named individual's profile |
| Carnegie Mellon University (PA, USA) | `cmu.edu/physics/people/faculty/documents/cv_oct24.pdf` — a faculty CV |
| King's College London (London, UK) | a KCL Pure page for a journal article on randomised controlled trials |
| New York University (NY, USA) | `wp.nyu.edu/birdvox/news/` — a bird-audio research project blog |
| Summer High School Programs - at BU | `hasdhawks.org` — Hazleton Area School District, not Boston University |
| Winchester College - Discover Summer Program | `biltur.com` — a Turkish travel agency reselling it |
| Time: 4:30pm – 5:30pm (Hong Kong time) | a scraped fragment of a Vietnamese school's webinar page |
| ECON 1 - 01 Introductory Microeconomics | a UCSC class-search URL for one course section |
| Earn college credit that may transfer to any college you attend | an SAIC marketing sentence stored as a title |

**The Oxford Royale row is the worst one for this lane's brief.** Oxford Royale is a private commercial
operator. Pointing its record at `ox.ac.uk` tells a student the University of Oxford runs it. That is
exactly the "hosted at X presented as run by X" failure I was told to watch for — except here it is not a
vendor's marketing spin. **It is our own database making the claim.**

Two rows additionally surface *named private individuals* as though they were summer programmes.

### 2a. How much of this actually reaches a student — measured, and narrower than I first framed it

ORYN-CEO measured the live blast radius, and it corrects my emphasis. The provenance claim is false for
this batch, but **the `verified_current` gate already holds back most of the damage**: of 214 rows from this
source, 95 are `active` but only **19** are `verified_current`. The leakage that remains is in **Browse**.

**And the row actually reaching students is not the one I led with.** Across the whole corpus only *two*
rows point at a bare institutional homepage:

| Row | State | Reach |
|---|---|---|
| **Oxford Royale** (`ox.ac.uk`) | `under_review` / `unverified` | **0 eligible matches — reaches nobody** |
| **Purdue University** (`purdue.edu`) | **`active`** | **eligible to 7 of 7 users — live in Browse** |

So the two findings need to be stated separately rather than merged into one alarming number:

- **Oxford Royale is the worse misrepresentation** — our own database asserting a commercial operator is
  the University of Oxford — and it is currently inert.
- **Purdue is the live one** — a student today can see an opportunity card that says only
  "Purdue University."

And Purdue turns out to be **repairable, not junk**: its `description` already carries the correct identity
and URL — *"Purdue University | Summer College for High School Students | https://www.purdue.edu/summer-high-school/…"*.
Verified against Purdue's own page: the programme is **"Summer College for High School Students"**, for
**"high school students ages 16 and 17"**, and *"The application for the summer of 2026 is now closed. Check
in December for our 2027 course offerings."*

Note our stored description says **"age 15 and older"** — wrong in both directions against Purdue's current
page. The embedded URL also carries a Google Analytics `_ga` tracking parameter that must be stripped.

*(Caveat carried over from CEO's own measurement, because it applies to my §2 list too: the regex that
surfaces "title is just an institution name" over-catches. "BrUMO (Brown University Math Olympiad)",
"QuestBridge National College Match", "Boston University Tanglewood Institute" and "Princeton University
Ten-Minute Play Contest" are real opportunities caught only because "University" appears in the name. The
candidate list is a lead, not a verdict.)*

---

## 3. FINDING A2 — the best and the worst are presented identically

Because `unknown` renders no badge, these currently look the same in the catalogue:

**Genuinely selective, currently `unknown`:**
RSI at MIT · Stanford SIMR · ISSYP · UCSB RMP · TechGirls · Mathworks HSMC · UF SSTP · PACT ·
Stanford Summer Humanities · SPINWIP · Harvard CURE · Kode With Klossy · NYU Tandon ML · JHU
Engineering Innovation · UChicago RIBS · Terp Young Scholars · CU Boulder PCDP · York Helix

**Pay-to-enroll, also `unknown`:**
iD Tech · Summer Discovery · Oxford Royale · UniHive · Stanley Prep · BRAND-ED · Horizon Inspires ·
PROMED Projects · Sevenoaks · Cambridge Future Scholars · Polygence · Inspirit AI · Global Achievers ·
Summer Discovery · VTSP

**Corrected (see §1):** I first wrote that RSI and iD Tech "carry the identical absent signal today." They do
not, and the truth is worse for RSI. **iD Tech is `active`; RSI is `disabled`** — 100 students worldwide,
*"cost-free to students"* in CEE's own words, and it cannot be reached in ORYN at all. The lists above are
corpus-wide; on the `active` set the live version of this finding is **94 rows with no selectivity signal**,
among them Stanford SIMR, UCSB RMP, UChicago RIBS, NYU Tandon ML, Harvard CURE and JHU Engineering Innovation
on one side, and Oxford Royale, Summer Discovery, iD Tech, Polygence, Inspirit AI, UniHive, Lumiere and
Pioneer's duplicate row on the other.

---

## 4. FINDING A3 — the framework in the brief has one axis too few

I was asked to separate *selective* from *commercial*. Working through the corpus, that single axis
produces wrong answers, because **selectivity and cost are independent**:

| | Free / funded | Expensive |
|---|---|---|
| **Selective** | RSI (100 places, cost-free) · MITES · MIT PRIMES · Clark Scholars · TASS · Sutton Trust | **UCSB RMP $13,274** (GPA 3.80 floor) · SSTP $7,500 · Mathcamp $7,500 · Ross $7,500 |
| **Open** | Bath "Step into Bath" £365 · free MOOCs | **Summer Discovery $2,499–16,999 · iD Tech · Immerse · Oxford Royale** |

On a single axis, **UCSB RMP and Summer Discovery collapse into the same bucket** — one is a research
programme with a hard 3.80 GPA gate, the other admits anyone who pays. The bottom-right cell is the one
that costs families money for no differentiating signal; the top-right cell is real but cost-gated, and a
student on aid needs to know which they are looking at.

---

## 5. FINDING A4 — duplicates: real, but mostly already suppressed, and one of them isn't a duplicate at all

My structural scan (title + domain similarity) flagged ~16 duplicate pairs, several with a verified twin
and an `unknown` twin, and I wrote that "whichever twin a surface renders decides whether the student sees
*Extremely selective* or nothing." **Checking each pair against live `status` and reference counts, that
overstated the live problem.** Most twins are already suppressed, every one of them with **0
`opportunity_matches`**:

| Already handled | State |
|---|---|
| SSTP duplicate | `under_review` |
| Phillips Exeter ×2 | both `under_review` |
| Sabancı 2026 | `under_review` |
| RISD duplicate | `under_review` |
| UCSB "Research Mentorship Program" | `under_review` |
| Clark Scholars duplicate | `disabled` |

**What actually remains live is narrower and more specific — and in each case the row that *survived* is
the weaker one:**

- **UCSB "UCSB Research Mentorship Programs"** (`647eb8da`) — `active`, **7 matches**, but it is the
  *unverified* twin: `tier=unknown`, `cost=NULL`, `deadline=NULL`. It presents a **$13,274** programme with
  a hard 3.80 GPA gate as though nothing were known about it.
- **"Garcia Summer Scholars"** (`d83d7048`) — `active`, **7 matches**, and its `official_url` is a
  **Stony Brook news article** about the programme. The correct record already exists separately
  (`a37fa810`, `selective`, verified, cost 4116, official programme page). Nothing to repair — retire it.
- **"SSRP 2023"** (`a29d4ef0`) — `status='disabled'` yet still carrying **2 `opportunity_matches`**.
  #151 (merged tonight) makes Counselor Core honour `status`, so those stale rows should now be excluded at
  read time. Worth *confirming* rather than assuming.

### 5a. And the one that turned out not to be a duplicate is the worst of the group

**"Bocconi Summer School 2026"** (`e6f4c6d8`) is `active` with **7 matches**. I had it on the duplicate list
against "Bocconi Summer School for High School Students" — title overlap 1.00. They are different records,
and the difference is the whole point:

| Row | URL path |
|---|---|
| Bocconi Summer School **2026** | `/summer-school/summer-school-**bachelor-students**` |
| Bocconi Summer School **for High School Students** | `/summer-school/summer-school-**high-school-students**` |

The first is Bocconi's summer school for **university undergraduates**, sitting `active` in a catalogue for
14–18 year olds and matched to every user. Same defect class as the Vanderbilt **SAVY** case (a K–8
programme reached through a high-school-sounding umbrella) and the university-only "Hack-AI-thon" row
ORYN-RESEARCH found earlier.

**A title-similarity dedupe would have merged these two and hidden the wrong-audience record inside the
correct one.** Only reading the URL *path* separated them — "dedupe on the application, not the name,"
paying off in the *split* direction rather than the merge direction.

**Not duplicates — do not merge:** Wharton GYP sub-programmes (LBW / FBW / M&TSI / Sports Analytics) and
Stanford SPCS sub-programmes (SUMaC / Humanities / Summer Institutes) are *different applications with
different fees*. Only bare umbrella rows pointing at navigation pages are a problem.

## 6. FINDING A5 — `opportunities` has no currency column, and the UI prints everything as dollars

`opportunities.cost` is a bare `numeric`. There is no currency column beside it. `university_statistics.cost_currency`
and `university_programs.tuition_currency` both exist — the schema draws this distinction elsewhere and not here.

The detail page renders `formatCurrency(opportunity.cost)`, and `lib/i18n/format.ts:16` defaults to `currency = "USD"`.

Live rows sharing that one column today: LSE **4450** (GBP) · Bocconi **2700** (EUR) · Sciences Po **6000**
(EUR) · Bath **365** (GBP) · ETH Zurich **500** (CHF) · Cornell **9274** (USD) · Penn **15192** (USD).
Bath's £365 is displayed to a student as **"$365"**.

*(This finding is evidenced entirely on non-held rows. No claim is made about any founder-held row.)*

---

## 7. FINDING A6 — stale cycles still live

Eleven rows carry a stale year in the title: DigiPen 2025 · **Duke TIP 2024** · Edinburgh 2024 · Future
Ready 2025 · Summer at Stanford 2025 · Summer Discovery 2025 · Netherlands 2025 · **SSRP 2023** · UCL
Bartlett 2025 · U Toronto 2025 · USC Info Sessions 2025.

**Duke TIP is the sharp one:** the programme was discontinued, and Duke's own server now 301-redirects
`tip.duke.edu/resources/opportunity-guide` → `provost.duke.edu/pre-college-programs/` — i.e. straight onto a
*different* programme that ORYN already holds as its own separate row.

A second shape worth naming — **stale-open**: a page still advertising an intake that has already passed.
PACT's own page, read 2026-08-23, says *"We are still accepting applications for Summer 2026."*

---

## 8. Workstream B — online courses & certificates

The equivalent question here is not "is it selective" but **"who holds the gate, and is the credential
assessed by anyone other than the seller?"**

### B1. The best free item found — and ORYN files it under `volunteering`

**Schoolhouse.world certification.** Real gate, in the provider's words: *"Achieve at least a 90% on the
unit test while explaining your reasoning aloud"* on a recording showing screen and webcam, then *"peer
review two videos from students around the world."* Free platform. Minimum age 13.

**And the recognition is real, from the right authority.** Schoolhouse's own `/partnerships` page names
**no university at all** — only generic partnership options. The claim only stands up because **MIT
Admissions' own page** says it: *"MIT also accepts calculus certifications through Schoolhouse.world."*

> **Method note, recorded because I nearly got it wrong:** I recalled that MIT and Caltech accept this and
> was ready to write it down. The vendor's page does not support it. The university's page does. The
> authority on what a university accepts is the university.

Context kept, not stripped: MIT's sentence sits in a section addressed to students whose schools lack
advanced coursework — *"If your high school doesn't offer courses that help you prepare for MIT…"* MIT
attaches no condition to the acceptance sentence itself.

### B2. A dated, actionable route most students don't know exists

A student whose school offers no AP can still sit AP exams. College Board: *"Yes. You can't order AP
Exams directly, but you should be able to arrange to take exams at a nearby high school that administers
AP Exams."* Search the AP Course Ledger, then contact that school's AP coordinator.

**Hard date: *"The deadline for schools to submit AP Exam orders is mid-November."*** Read on 2026-08-23,
that is roughly three months of runway. Nothing in ORYN's catalogue carries this.

*Not established:* whether authorised international AP test centres exist for students with no local AP
school. A search summary asserted it; the official page I read says nothing about it. Recorded as an open
question, not a fact.

### B3. Cambridge International — the private candidate route

*"Candidates who do not attend our centres or who are studying at a Cambridge International school
registered as online may want to enter for exams. They are known as private candidates."* Route: *"Find a
centre or approved Cambridge exam provider in your country that accepts private candidates."*

*Not established on the page I read:* whether entry must go through a school, the coursework-component
restriction, which qualifications are open to private candidates, or what appears on the certificate. A
search summary asserted all four. None is recorded as fact.

### B4. The honesty constraint on UK "points"

UCAS, verbatim and complete — the second clause is the one that gets dropped: *"Some universities,
colleges, and conservatoires refer to UCAS Tariff points in their course entry requirements, **but
qualifications which do not receive Tariff points may be accepted too** – so make sure you check the
course entry requirements carefully."*

The Tariff is **not universal**. ORYN must never render "worth N UCAS points" as an admissions outcome.

### B5. Age gates are a real, under-known constraint

- **edX**: *"You must be at least 13 years old to use the Service."*
- **Coursera**: *"Any use or access by anyone under the age of 13 is strictly prohibited"* — **plus** a second,
  easily-missed clause: users must be *"over the age at which you can provide consent to data processing
  under the laws of your country."* GDPR lets member states set that anywhere from 13 to 16, and several
  of ORYN's target countries sit at 16. A 14-year-old there can be below Coursera's own bar while the
  headline number says 13. *Not verified country-by-country — flagged as a question.*
- **AWS Certification**: the route is **open**, with a condition — *"Candidates ages 13-17 are permitted to
  take AWS Certification exams with the consent of a parent or legal guardian."*

### B6. The $4,000 row in our catalogue right now

**"UNO — United Nations Online"** (`online_program`, org *Stanley Prep*, **cost 4000.00**,
`verification_state='verified_current'`, `cycle_status='open'`).

This is **not fraud**, and should not be described as such:
- The partnership is **real and bilaterally confirmed** — WFUNA's own site: *"Training Programs at the UN:
  Stanley Prep are developed by WFUNA and arranged through our educational partner, Stanley Prep,"* and it
  names the online product (UNO) explicitly.
- The gates are real: *"Rising 10th to 12th graders; Minimum high school GPA of 3.5"* and *"TOEFL 90 or above
  for non-US students."*

**But the attribution does not survive comparison.** WFUNA describes itself as *"a global nonprofit
organization representing and coordinating a membership of over 100 national United Nations Associations"* —
an independent NGO, not a UN organ. WFUNA says the credential is a *"Letter of Recommendation in Global
Leadership **from WFUNA**"* and an *"Official Certificate of Completion **from WFUNA**"*, and says nothing
about UN endorsement. Stanley Prep sells the same credential as *"an official recommendation letter **from
the United Nations**"*, *"issued by the United Nations"*, and a *"UN-endorsed recommendation letter."*

A family paying $4,000 reads the second version. **Recommendation:** keep the row, name WFUNA as the
developer in `organization`/description, and never let "from the United Nations" reach a student from our copy.

---

## 8a. FINDING A7 (CORRECTED) — the eligibility gap is real, but much smaller than I first reported

> **This section previously said that a set of elite programmes carried severe eligibility walls ORYN recorded
> "nothing" about. That was wrong for seven of the rows I named.** ORYN-CEO caught it by checking Sutton Trust
> against my claim. The cause: **my corpus snapshot never selected `citizenship_restrictions` or
> `residency_restrictions`**, so I was reading a projection that could not contain the answer — and I read
> absence-from-my-view as absence-from-the-database. That is the second column-omission error of the night
> (the first was `status`, §1).

### What is actually recorded — and it is good work by whoever wrote it

| Programme | What ORYN already holds |
|---|---|
| **Caltech SRC** | `residency_restrictions`: *"Limited to students currently enrolled in a Pasadena Unified School District (PUSD) high school; not open to students outside PUSD."* + `eligible_countries=['United States']` |
| **CU Boulder PCDP** | *"Limited to first-generation students recruited from targeted partner middle/high schools primarily in Adams County, Colorado, plus a smaller number of schools in Boulder County, Weld County, and Denver Public Schools; not open to general applicants outside these partner districts, and requires multi-year program participation beginning in 7th grade."* — **more precise than my own description of it** |
| **Stanford SIMR** | *"Must be a U.S. citizen or permanent resident with a green card; must currently live in and attend high school in the U.S. Not open to international applicants."* |
| **MITES Summer** | *"U.S. citizens or permanent residents."* + `eligible_countries` |
| **Clark Scholars** | *"U.S. citizen or permanent resident."* + `eligible_countries` |
| **Sutton Trust** | `eligible_countries=['United Kingdom']`, a full Year 12 / Year 13 / S5 residency clause, and a citizenship note that carefully separates what the source says from its effect: *"Not explicitly stated by citizenship on the fetched pages, but the school/residency criteria make it **de facto** restricted to students schooled in the UK."* |
| **Parsons** | already captures the nationality-dependent deadline, English-proficiency requirements and visa needs |

Eight rows carry the value ***"None stated on the fetched pages"*** — an honest-null pattern that distinguishes
*"we looked and the source is silent"* from *"nobody looked"*. That is exactly the discipline this lane has been
arguing for all night, already implemented, and I failed to notice it.

### The corrected measurement

| | count |
|---|---|
| `citizenship_restrictions` prose | **22** |
| `residency_restrictions` prose | **20** |
| `eligible_countries` non-empty | 12 |
| **rows with ANY eligibility signal** | **33** (31 of them `active`) |

My earlier framing counted only `eligible_countries` and so **understated recorded eligibility by nearly 3×**.
The real gap is **126 of 157 active rows with no signal at all** — still large, but a different and smaller
claim than the one I made.

### Where the gap genuinely is — verified as unrecorded

**LSE Summer School** (both prose fields read *"None stated on the fetched pages"*, so the university-offer
requirement really is absent) · **Bath International Summer School** (all null) · **TASS** (all null — the
*"International students… must be sophomores to apply"* asymmetry is unrecorded) · **TechGirls** (all null —
Türkiye eligibility, the US-dual-citizen exclusion and the prior-ECA-travel rule are unrecorded) ·
**UCSB RMP** (all null — *"TOEFL … NOT needed for International applicants"* unrecorded) · **Mathcamp** ·
**KU Leuven** (the €380/€430 nationality-dependent price unrecorded).

### The lesson that is worth more than the finding

**I sampled on salience.** The rows I picked as examples — RSI, MITES, SIMR, Clark — are the famous ones, and
therefore precisely the rows a previous researcher had already curated carefully. I generalised their supposed
emptiness to the corpus. **The genuinely undocumented rows are the boring ones I did not pick.**

*(The facts about the programmes themselves are unchanged and independently verified: SIMR really is
US-citizens-only, Caltech SRC really is PUSD-only, Sutton Trust really is UK-school-system-only. What was
wrong was the claim about ORYN's data, not about the world.)*

---

## 8b. FINDING A8 — `cost` lands on the cheapest rung, every time

| Programme | We store | What the source actually publishes |
|---|---|---|
| **Harvard SSP** | **9,100** | $4,180 / $8,160 online-commuting · **$9,100** 4-wk residential · **$15,735** 7-wk residential · +$75 app fee |
| **Wharton M&TSI** | **9,000** | *"On-Campus Program Fee: **$12,000**"* — a **$3,000** understatement on a verified row |
| **UCSB RMP** | *null* | $5,675 commuter · **$13,274** residential · +$75 non-refundable app fee |
| **Columbia NYC Commuter** | *null* | $2,882 (1-wk) · $6,380 (3-wk) |
| **UChicago RIBS** | *null* | **$15,200** |
| Summer Discovery | *null* | $2,499–$16,999 across campuses |

ORYN-RESEARCH's headline finding about the Succeed aggregator was that **its prices are understated in one
direction**. Our own column has the same property, for the same structural reason — a single numeric cannot
hold a ladder, so it holds the bottom rung.

Compounding it, all in the same column:
- **no currency** — LSE 4450 (GBP) · Bocconi 2700 (EUR) · ETH 500 (CHF) · Bilgi *"16000 TL + KDV"* · ODTÜ
  *"60.000 TL"* — and `formatCurrency` defaults to USD, so **Bath's £365 shows as "$365"**;
- **no tax handling** — *"+ KDV"* (Turkish VAT, ~20%) cannot be expressed at all;
- **no application fee** — UCSB $75, Harvard $75, VTSP $35, Premed Projects £395, all charged *before* any
  decision, all invisible.

*Not a schema proposal — that is DATA's and the founder's call. This is the measurement behind it.*

---

## 8c. FINDING A9 — after #153 landed, the homepage filled its slots with expired programmes

#153 (merged tonight, from this lane's report) fixed the ordering bug in §"live defect": the dashboard now
fetches a wide pool, filters, *then* takes 2. I re-measured afterwards.

**The risk I had flagged did not materialise** — I expected the wider pool might surface the 12 non-opportunity
rows, since all of them pass `isOpportunityRecommendable`. It did not: all 14 filled slots across 7 users are
`verified_current`. Recording that, because I raised the concern and checking it cleared it.

**What filled them instead:**

| User | Slot 1 | Slot 2 |
|---|---|---|
| `46dd6f7e` | **İstanbul Bilgi** — its own page serves the **2025** cycle, *"Son başvuru tarihi 12 Haziran 2025"* | **İTÜ** — *"SON KAYIT: 16 TEMMUZ"*, sessions concluded |
| `49de3083` | İstanbul Bilgi (same) | İTÜ (same) |
| `6e2f0ff1` | İTÜ (concluded) | **Sabancı** — *"Son Başvuru: 1 Ağustos 2026"*, 22 days past |

All three are `verified_current` + `active`, so every verification gate passes them. All three have
`deadline = NULL` in ORYN, so `isOpportunityActionable` has no date to test. Their `cycle_status` values sit
outside the non-actionable set. **They are invisible to every automated check we have, by construction.**

**#153 was right and I am not walking it back** — but it changed the failure *mode* rather than removing it.
Before: an empty or half-empty block. After: two confidently-presented expired programmes with a match
percentage beside them. An empty block is an absence; a confident wrong answer is worse. The code half is
fixed. **This is the data half, and the data half is mine.**

### The fix worked — and then concentrated the remaining harm

**Update, same night.** The founder approved the deadline writes. **İTÜ (2026-07-16)** and **Sabancı
(2026-08-01)** were written, and both now compute `recommendable = false`. The existing gate closed them with
no `cycle_status` edit and no new code — the self-healing path argued for above, now observed rather than
predicted. They left seven users' previews.

**But the harm did not disperse — it concentrated.** With İTÜ and Sabancı gone, **İstanbul Bilgi rose to
rank 1 for two users.** It was held pending verification of its current cycle, so it is still
`recommendable = true` with full counselor reach.

**Bilgi is now resolved, and the answer is that there is no current cycle.** The only year appearing anywhere
on its site is **2025**: *"Yaz Okulu **7-11 Temmuz 2025** tarihlerinde gerçekleşiyor"*, *"Son başvuru tarihi
**12 Haziran 2025**"* — fourteen months stale. A telling corroboration: the extracted page text contains the
fragment `Son Başvuru: 18 Haziran 2021 -->`, an HTML **comment close tag**, meaning a 2021 deadline sits
commented out in the source beside the live 2025 one. The site has carried stale markup across at least two
cycles.

**Proposal: write `deadline = 2025-06-12`** — the date the source itself publishes. It is factual, already
past, closes the row through the existing gate, and self-heals if Bilgi ever publishes a real next date.
`cycle_status` is deliberately left to a human: `lifecycle.ts` is explicit that `historical`/`discontinued`
are judgments about whether a programme still runs at all, and a stale page cannot establish that — Turkish
universities routinely leave these sites untouched until spring.

Scale: **45+** `summer_program` rows are `active`, `deadline IS NULL`, outside the non-actionable cycle set,
and carry a verification timestamp — i.e. recommendable and structurally un-demotable. Most are `unverified`
(Counselor excludes them); these three are `verified_current` and reach the homepage.

---

## 8d. FINDING A10 — "summer school" means something different in Europe, and two of those rows are live in a 14-18 catalogue

Checked two European university "summer schools" tonight. **Both turned out to be for university
students**, sitting in ORYN's `summer_program` category and matched to students aged 14-18:

| Row | Evidence, verbatim | Live state |
|---|---|---|
| **Bocconi Summer School 2026** | URL path is `/summer-school-**bachelor-students**`; the actual high-school programme exists as a *separate* row | `active`, **7 eligible matches** |
| **Copenhagen Business School Summer University** | *"international exchange students, freemovers, students from CBS and other Danish universities as well as professionals"*; offers *"bachelor and master-level courses"* | `active`, **3 eligible matches** |

A related but distinct case: **University of Bath International Summer School** is for *"international
students (as classified by overseas fee status) who will be starting university in September 2027"* — a
**pre-arrival bridging programme gated on already holding a university place**. The age overlaps ORYN's band;
the actual qualification does not. Age eligibility and real eligibility diverge, which is exactly why an
age-based match gets it wrong.

**Why this class is easy to miss:** in continental European higher education "summer school" usually means a
short course for *enrolled university students*. A corpus built by searching that phrase pulls them in, and
neither the title nor the domain distinguishes them — **only the eligibility section does.**

**Not swept.** Remaining candidates I did *not* check: **LSE Summer School** (which is **rank 1 at 91% match**
for user `e9eba798`, and whose page states no audience at all), Sorbonne Université Summer University,
Maastricht Summer Program, Edinburgh International Summer School, and "Summer Programs in the Netherlands"
(which points at `summerschoolsineurope.eu`, an aggregator listing rather than a programme). Two for two is a
reason to check the rest, not a licence to assume them.

---

## 8e. FINDING A11 — three places where the code is already written and the column is missing

Not a proposal — DATA and the founder own schema. This is the measurement behind three decisions, and they
share a shape: **the product already knows what it wants to express and has nowhere to put it.**

### 1. `selectivity_evidence` — required, validated, then discarded
`lib/opportunities/ingest.ts:187` refuses a tier above `open_enrollment` unless evidence is supplied, checks
it, and **does not write it** — there is no such column. So a tier can be stored; its justification cannot.

Consequences, both live:
- Every tier in this package is a conclusion whose evidence exists only in `summer_findings_2026-08-23.jsonl`.
  They must **not** be described in-product as "evidence-backed".
- `lib/opportunities/commercial.ts` says so itself: the pay-to-enroll exemption "trusts `selectivity_tier`
  alone, because the evidence behind it is **not stored**." That is how **Oxford Scholastica** — £7,495, no
  academic criterion, provider disclaims Oxford twice — sits exempt from #154 on a tier nobody can inspect.

### 2. No currency column on `cost`
`opportunities.cost` is a bare `numeric`. `university_statistics.cost_currency` and
`university_programs.tuition_currency` both exist — **the schema draws this distinction elsewhere and not
here.** The detail page renders `formatCurrency(opportunity.cost)` and `lib/i18n/format.ts:16` defaults to
`"USD"`.

Sharing that one column today: LSE **4450** (GBP) · Bocconi **2700** (EUR) · Sciences Po **6000** (EUR) ·
Bath **365** (GBP) · ETH Zurich **500** (CHF) · Cornell **9274** (USD) · Penn **15192** (USD). **Bath's £365
is shown to a student as "$365".**

And it now blocks work: **ODTÜ's verified price is "60.000 TL"**. Writing `60000` fires the pay-to-enroll gate
correctly *and* renders "$60,000" on the card — an order-of-magnitude error, arguably worse than NULL. Same
for **Bilgi** (16000 TL) and **LIYSF** (£3,450). The gate wants the write; the display cannot survive it.

**The row that settles the argument on its own: Woodstock School (Mussoorie, India).** Its page states *"The
total cost of the programme is **INR 236,000** (inclusive of GST) and non-refundable application fee of **INR
10,000**."* Written into a currency-less column, a student is shown **"$236,000"** for a programme costing a
few thousand US dollars — an error of nearly two orders of magnitude. And note the tax direction is the
*opposite* of Bilgi's: Woodstock's figure is *"inclusive of GST"*, Bilgi's is *"16000 TL **+ KDV**"*. One
numeric column cannot express price, currency, **or** which side of tax the number sits on.

It also cannot express **tax-exclusive** pricing (Bilgi: *"16000 TL **+ KDV**"*, ~20% VAT), **price ladders**
(Harvard $4,180→$15,735; we store the $9,100 rung), **nationality-dependent prices** (KU Leuven €380 Flemish /
€430 other), or **pre-decision application fees** (UCSB $75, Harvard $75, RISD $60, VTSP $35, Premed £395).

### 3. `deadline_mode` — the seam exists, the column does not
`lifecycle.ts` defines `DEADLINE_MODES_WITHOUT_A_FIXED_DATE` (`rolling`, `continuous`, `always_open`) and
reads it as an **optional** key precisely because there is no column, noting that without it "a genuinely
rolling programme would look identical to one nobody ever researched."

That case is now live and named. **Acıbadem's Lise Yaz Bilim Kampı** states *"Eğitim Tarihi **Kayıtlar
süreklidir**"* — registration is continuous by design. In our data it is `deadline = NULL`, indistinguishable
from a row nobody has touched. It is currently **rank 2 for one user**.

**The common thread:** each gap converts a fact the source states plainly into a fact ORYN cannot hold — and
in each case a downstream rule (the tier badge, the pay-to-enroll gate, the lifecycle demotion) is already
written and waiting for it.

---

## 8f-note. Edinburgh, corrected: the real programme exists at a third URL

Earlier I graded 'University of Edinburgh International Summer School' (`col.ed.ac.uk`) as pointing at a
one-year foundation programme, and separately the corpus holds a stale 'Edinburgh Summer School 2024'. Fetching
`study.ed.ac.uk/summer-school` directly surfaced the **real, current, correctly-aged programme**: *"**Pre-
University Summer School 2026** — Taking place: **29 June to 10 July 2026** — Application deadline: **19 May
2026**. Are you **16-18 years old**…"* — almost exactly ORYN's upper band. The same page also carries **SUISS**
and an Edinburgh **Sutton Trust** date, with SUISS supplying a fifth aid-deadline-earlier-than-general case
(*"Scholarship application deadline: 27 March 2026"* vs the general *"24 April 2026"*). Neither existing
Edinburgh row should be enriched from this — re-point or create a new row scoped to `study.ed.ac.uk`.

## 8f. FINDING A12 — the umbrella row is the corpus's most pervasive defect (~20 cases), and it is the root of several others

One row standing for a **family** of programmes whose facts genuinely differ — by age band, price, deadline,
format, cycle state, or country. The row must carry one value per column, so whatever is written is wrong for
the other members. This is a modelling mismatch, not a data-entry slip.

**The worst spreads found:**

| Row | What sits behind it |
|---|---|
| **MIT PRIMES** | **Yulia's Dream** — *"free… for exceptional high school students (grades 10-11) **from Ukraine**"* · **MathROOTS** — *"free two-week… **nationally selected**"* · **PRIMES STEP** — *"year-long… (grades 7-9) **from Greater Boston**"*. Three countries-worth of eligibility behind one row. |
| **Vanderbilt PTY** | SAVY is *"academically advanced **elementary and middle school** students"*; VSA is *"**7-12 grade**"*. The first path I followed led to the K-8 programme. |
| **York Helix** | *"Science Explorations Summer Camp (**Grade 3-8**)"* and *"Spark Lab Summer Program (**Grade 9-12**)"* — and the row's own name no longer appears among current offerings. |
| **Georgetown** | Two **opposite** live states at once: *"Hoya Summer High School Sessions are **full**, but our Pre-College Online Program is **wide open**."* No single `cycle_status` can be true. |
| **UC Berkeley B-BAY** | Five programmes, **four different application states simultaneously**, spanning middle school to a two-semester incubator. |
| **UWC Short Courses** | A directory by its own admission: *"Each one lists its own application process, timeline and selection criteria"*, *"for all ages"*. |
| **Idyllwild · Colorado Mines · Illinois Tech · SAIC** | Each sells to children **and** high-schoolers (and Idyllwild to adults) from one page — so an **18-year-old** ORYN user falls into Idyllwild's Adult product. |

**Why this is the root of other findings.** Several defects reported separately above are really this one:
Georgetown's wrong `cycle_status`; Vanderbilt's un-enrichable fields; and the **price ladders** at Georgetown,
Harvard, RISD, UCSB, NSLC and NYLF — a ladder *is* an umbrella priced per variant. Fixing the modelling would
dissolve a meaningful share of the rest.

**And ORYN already knows how to do this right.** The correct pattern is present in the corpus, just applied
unevenly: **NHSI** is scoped to *"The Cherubs"*, **Sciences Po** to its Pre-College programme, **Iowa Young
Writers** to the Residential programme, and **Wharton GYP**, **Stanford SPCS** and **Bath** are held as
separate rows per application. The failure is inconsistency, not ignorance.

**This is emphatically not an argument for merging.** A title-similarity merge would have folded Bocconi's
**bachelor-students** row into its high-school sibling and buried a wrong-audience record reaching 7 users. The
rule that works is the one already in use here: **dedupe on the application, not the name.**

---

## 8g. FINDING A13 — the financial-aid deadline is always earlier, and ORYN can only store the later one

Found four times tonight, independently, at four unrelated institutions — and in **every** case the aid
deadline is **earlier** than the general application deadline:

| Programme | General deadline | Aid deadline | Gap |
|---|---|---|---|
| **Harvard SSP** | *"Regular Application… **February 11, 2026**"* | *"Early Application & **Priority Financial Aid** Deadline: **January 7, 2026**"* | 5 weeks earlier |
| **University of St Andrews** | course deadline 25 Feb 2026 | *"**Scholarship applications close on the 25 February 2026**"* — and the awards are large: one full **£6,850**, two half **£3,425**, six partial **£1,141** | same day, separate process |
| **Rutgers Young Scholars** | application process (now closed) | *"Applications for **financial assistance** must be received by **April 15, 2026**"* | separate process |
| **PROMYS** | *"February 27, 2026"* | *"To be considered for **financial aid**… complete the financial aid form by **March 15**"* | separate form |

**This is not a scheduling coincidence.** Funded places have to be allocated before general admission closes,
so the deadline that binds hardest falls on the students with the least money. A catalogue that stores one
`deadline` per row stores the *later*, general one — and silently drops the date that actually governs the
students ORYN most needs to serve.

**What makes it worse:** three of these four also require a *separate form or process*, not merely an earlier
submission of the same application. A student who reads our single date and applies on time has not merely
missed a discount — they have often lost the ability to be considered for aid at all.

*(Related, from the same evidence: Harvard's own ladder shows why this bites — its 7-week residential option is
**$15,735**. The aid deadline is the difference between that number being a barrier and being negotiable.)*

---

## 8h. FINDING A14 — a distinct defect class: wrong KIND, not wrong audience

§8d catalogued rows that are the right *kind* of thing (a summer school) for the wrong *audience*
(university students in a 14-18 catalogue). This is different: rows whose source describes something
that is not a summer programme **at all**.

- **Universidad de Navarra** — our row is titled *"Universidad de Navarra - University of Navarra"* and
  categorised `summer_program`. Its stored URL describes a timed business-case **competition**: *"Stage 1 —
  the first two days, the teams will face two **3 hour cases**"*; *"Stage 2 — Teams will have exactly **12
  hours** to prepare a new case... this stage has **twice as much importance** in determining the finalists."*
- **The Hong Kong Polytechnic University** — stored URL is PolyU's own **Postgraduate** admissions path:
  *"PolyU Taught **Postgraduate** Programmes: Applications Open for 2027/28"*. Not merely a different
  audience than intended — graduate level, further from ORYN's band than any undergraduate row found tonight.
- **Downing College** (§8, found earlier) — a Cambridge college's institutional homepage, with a *"Book your
  event"* venue-hire section. No programme of any kind, high-school or otherwise, is described.

**Why the distinction matters for triage:** a wrong-audience row (Bocconi, CBS, LSE) can sometimes be
corrected by re-scoping to the right sibling page on the same site. A wrong-kind row cannot — there is no
summer-school version of a competition or a postgraduate admissions page to redirect to. These are pure
retire-or-resource-from-scratch cases.

---

## 8i. FINDING A15 — USC: the most complete cost record found, and a genuine visa-related financial risk

USC's own admission/tuition page is the most decision-grade cost record found in the entire corpus —
worth using as the template for what "done" looks like:

*"Total Estimated USC Cost for International Students* ***$12,208***." Broken down: *"Tuition **$7,401**"*
(both Residential and Commuter tracks), plus a *"nonrefundable **deposit of $1,000**"*, and — a category no
other row surfaced — *"Additional Fees Paid to U.S. Government — Visa Application Fee **$185**, SEVIS I-901
fee **$350**"*.

**A real structural restriction:** *"Residential | Commuter (**option not available to international
students**)"* — the cheaper track, open to domestic applicants, is closed to international ones.

**And a financial risk unique to this population:** *"The university will **not** refund tuition, room and
board, or any other program fees for participants... **unable to enter the country due to an improper
visa**."* A domestic student cannot lose $12,208+ to a visa problem. An international one can, and nothing
in ORYN's schema flags that this exists as a risk category at all.

**A fourth confirmed nationality-dependent deadline**, after Parsons, TASS and the general pattern: USC runs
*"Domestic Participant Application"* and *"International Applicants"* on separate deadline tracks.

---

## 9. What I did not do

- No production writes of any kind. No migration. No live-table mutation.
- No proposal touching the two founder-held rows.
- I did **not** re-research ORYN-RESEARCH's 488-candidate discovery corpus (Immerse, Oxford Royale,
  ISSOS, Reach Cambridge, NSLC, Envision, SBC, Bucksmore, InvestIN, Lumiere, Ladder). Their work stands;
  I checked overlap by name before starting and confined myself to the **live** table, which their corpus
  does not cover.
- I have **not** verified all 252 rows. 29 were verified to primary sources as of this section's
  original writing (2026-08-23); **that count is now well out of date — see §11 below.** The structural
  findings (§1–§7) still cover the whole corpus at the structural level.

## 9a. Continuation, 2026-08-24 — summary, not a re-narration

Full detail lives in `summer_findings_2026-08-23.jsonl` and the other synced docs; this section is
deliberately a summary so it doesn't duplicate 250+ JSONL entries into prose.

**New pipeline-defect pattern, the single biggest finding of this half of the session:** researching rows
titled as bare institution names ("Carnegie Mellon University (PA, USA)"), I first assumed — wrongly — these
were empty stubs. They weren't. `description` held real, specific program text; the defect was
`official_url` pointing at something unrelated to the program — a faculty's CV PDF, an unrelated
master's-degree page, a *different school entirely's* own website, a random research-portal profile. In
every fixable case, **the correct URL was already sitting in that row's own `description`** — a mechanical
fix, not new research. Found in 10+ rows; roughly half fixed and merged by CEO so far. A second, independent
variant surfaced later: `official_url` correct while `description` is separately stale (Oxford Royale) or
contaminated with an unrelated program's content (a "Trinity College London, Ireland" row whose description
mixed in University of Amsterdam text). See `summer_url_fix_review_2026-08-24.md` and
`summer_schema_and_pipeline_gaps_2026-08-24.md` §Part 2 for the full pattern writeup.

**Self-corrections this half (bringing the session total to 6+):** a "bare stub" hypothesis that was wrong
(above); a near-overclaim on CU Boulder PCDP caught before sending — its recruited-pipeline restriction was
already recorded, I nearly reported it as newly discovered; a search-summary date (Oxford Royale essay
competition) passed along as current without independent verification, caught by CEO.

**A genuine, repeated pattern worth naming as its own observation, not a per-row note:** Turkish-university-
run HS summer schools in this corpus (Koç, Sabancı, both checked live this session) cluster toward
`open_enrollment` rather than `selective` — both frame their credential as a participation certificate, not
a merit-selected admission, and neither describes an application-review process. Worth checking against any
further Turkish rows added, rather than assuming each is independently selective or not.

**Two rows found where a `selectivity_tier` is close to beside the point:** Caltech SRC (Pasadena Unified
School District only) and CU Boulder PCDP (a named, closed set of Colorado districts, recruited from 7th
grade). Both are gated by `residency_restrictions` so hard that almost no ORYN user could act on a tier
either way — the restriction field is what actually governs recommendability here, not the tier.

**New real facts of note:** Koç Summer Academy fee (TRY 80,000 — recorded in `description` per founder/CEO
decision, not written to `cost`, no currency column); Rockefeller SSRP real selectivity evidence (32
accepted/year, interview stage); PROMYS Europe's residency definition directly resolved for Türkiye
("ordinarily resident in Europe... all countries adjacent to the Mediterranean"); Google Cloud's official
18+ certification-age policy (a hard wall unlike AWS's 13-17-with-consent stance); Oxford Royale and Oxbridge
Academic Programs both confirmed as non-university-affiliated commercial operations with real 2026 prices,
the former with a dormant sibling row that had been pointing straight at ox.ac.uk before CEO fixed it.

Active-row individual-verification coverage: roughly 153-160 of ~151-157 active rows now have at least one
live-sourced finding, up from the 29 noted in §9 — see `summer_CHECKPOINT_2026-08-23.md` for the running
count, which moves as CEO's writes change what counts as "active."

## 10. Corrections I made to my own work

1. **Stanley Prep: D → B.** First-pass grade rested on "claims partnerships without naming an institution."
   False — WFUNA is named and confirms bilaterally. A wrongly-restrictive grade is the error class nobody
   ever complains about, so the correction is recorded in the data, not silently applied.
2. **The Cambridge Scholars quote** arrived with an internal ellipsis. Re-read in full via browser: the
   elided clause *strengthened* the disclaimer rather than reversing it. The check was still worth running.
3. **My framing of this package's value** was wrong until CEO corrected it — see §0.
4. **UCSB URL "repair": retracted.** I recorded that ORYN's stored UCSB URL 404s and needed fixing. It does
   not. The 404 came from a URL *I* constructed while probing (`/programs/research-mentorship-program`,
   without `/overview`). The stored values both return 200 — confirmed in my own bulk liveness check. I had
   attributed my own bad URL to the database.
5. **Duplicate scope: overstated, corrected in §5.** Most flagged twins are already `under_review`/`disabled`
   with zero matches. The residual is three specific live rows, not sixteen.
6. **Bocconi: reclassified from "duplicate" to "wrong audience."** Reading the URL path rather than the
   title showed one row is Bocconi's *bachelor-students* summer school. Merging them, as my first pass
   implied, would have buried that.
