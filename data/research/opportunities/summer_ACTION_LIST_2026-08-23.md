# ORYN-RESEARCH-SUMMER — ordered action list for DATA

Every item below is backed by a verbatim quote from an official page, recorded in
`summer_findings_2026-08-23.jsonl`. **Nothing here has been written to production.**
Ordered by ORYN-CEO's priority: **cost → deadline → selectivity_tier**, because #154's
pay-to-enroll gate reads `cost`, not tier.

**Founder-held rows — no proposal is written for either, including cost:**
Koç University Summer Academy (`152b3822`) · Interlochen. *(Separately: "Interlochen Review"
`interlochenreview.org/submit` sits at rank 2 for user `7722ebe9` and is `unverified` — I did
not touch it because I cannot tell whether the hold covers it. CEO has it as a founder item.)*

---

## TIER 1 — `cost` writes that immediately change recommendation behaviour

Each row below is `status='active'`, `verification_state='verified_current'`, `cost IS NULL`, and
**not** materially selective — so `isPayToEnroll` cannot see it. Writing the cost makes the gate
fire and drops the row out of core recommendations while leaving it in Browse with its price.

| Row | Verified price (verbatim source) | Note |
|---|---|---|
| **RISD Pre-College (On-Campus)** `5a583dbf` | *"Residential program: $12,495"* · *"Commuter program: $9,595"* | +$60 non-refundable application fee, +$1,100 non-refundable deposit. **Real outlay ≈$13,850–14,250** once mandatory health insurance ($259), supplies ($800–1000) and laptop ($300–500) are added. |
| **Parsons Summer Intensive Studies** `692aaffc` | *"Tuition and Fees $5,610 plus $265 university fees"* → **$5,875**; with housing *"$2,180 for three weeks"* → **$8,055** | Two figures answer two different questions — record which one. |
| **NSLC Business & Entrepreneurship** `60184ec3` | Columbia **$4,495** · Duke **$4,295** · Berkeley **$4,295** · Michigan **$4,195** | ⚠️ **Do not write $4,195.** Taking the cheapest campus is the exact error ORYN-RESEARCH found in the Succeed feed (49% understatement). Scope the row to a campus or record the range. |
| **NYLF Medicine & Health Care** `b0432a47` | Rice **$4,499** · Berkeley **$4,499** · Emory **$4,499** · UCLA **$4,599** · Michigan **$4,599** · Yale **$4,799** | ⚠️ The page's own *"Starting Price: $4,099.00"* is **below every campus price it lists.** Don't inherit the vendor's headline. |
| **ODTÜ (METU) Engineering Summer School** `0c8e00c1` | *"Kayıt ücreti 60.000 TL"* | **TRY.** No currency column — 60000 renders as "$60,000". See Tier 4. |
| **İstanbul Bilgi Lise Yaz Okulu** `d780bc55` | *"16000 TL + KDV"* (Law, Engineering) · *"20000 TL + KDV"* (Architecture) | **TRY, and tax-exclusive.** "+KDV" (~20% VAT) cannot be expressed at all. Also: this page is serving the **2025** cycle. |
| **Oxford Royale** `6f80e90f` | *"Residential - £6,995"* · *"Non-Residential - £4,995"* | **GBP.** |

### ⚠️ Three different reasons `cost` is NULL — only one of them is closable by research

The cost backfill cannot reach 100%, and the reasons are structurally different. Worth stating before anyone
scopes the work:

1. **Nobody looked yet.** Closable. This is what the table above closes.
2. **The seller does not publish a price.** Not closable by more research. **iD Tech** is the clearest case:
   across its homepage and summer-camps page the only figures are promotional — *"Save up to $60"*,
   *"as low as $375"* (a payment-plan entry point, not a rate). Also **Oxbridge Academic Programs**, **Aggie
   STEM**, **Global Achievers**, **Notre Dame Summer Scholars**, **FU Berlin SommerUNI**, **Terp Young Scholars**.
3. **There is no single price to publish** — the price is a *formula*, not a number:
   - **Boston University** prices per credit: *"Undergraduate Courses numbered 100 to 599, per credit **$845**"*,
     plus *"Student Services fee $75"* and *"Laboratory fee (per lab course) $200-$350"*. The total depends on
     how many credits the student takes.
   - **Tufts** redirects the question outright: *"If you're looking for tuition information for Pre-College
     Programs, select your program of interest from our Programs page."* Published non-degree rates are ranges
     (*"$250-$1,900"* per credit; audit *"$995-$1,300"* per course).
   - **Georgetown** publishes **at least eight** prices for one row, varying on three axes at once — see below.

**The consequence for #154:** the pay-to-enroll gate can never fire on categories 2 and 3, however much
research is done. That is a structural ceiling on the gate's coverage, not a backlog.

### Georgetown — the ladder problem in its purest form (recommend leaving `cost` NULL)

*"Application fee (non-refundable): $50"*, waived before the *"Early Bird Deadline: January 31"*. Then:

| | Residential (incl. housing + 19 meals/wk) | Commuter |
|---|---|---|
| 1-week, Medical | **$4,120** | **$3,490** |
| 1-week, Non-Medical | **$3,725** | **$3,095** |
| 2-week, Medical | **$6,800** | **$5,530** |
| 2-week, Non-Medical | **$6,465** | **$5,075** |
| 3-week | *listed on the page; truncated in my extraction — **not recorded, do not guess*** | |

Plus a *"Health insurance fee (international…)"* — **an extra cost borne only by international students**,
i.e. exactly ORYN's audience. Not fully captured; flagged.

**Recommendation: do not reduce this to one number.** Scope the row to one academy, or describe the range and
leave `cost` NULL. **This means the gate cannot fire on Georgetown** — a real cost of being honest here, and
it should be stated to the founder rather than quietly absorbed.

**Prices confirmed as NOT published by the seller** — these NULLs cannot be closed by more research,
and the gate can never fire on them. A distinct category, worth naming to the founder:
**iD Tech Camps** (only *"Save up to $60"*, *"as low as $375"* payment-plan copy — no base rate),
**Oxbridge Academic Programs**, **Aggie STEM**, **Global Achievers Academy**, **Georgetown**, **BU
Summer Term**, **Notre Dame Summer Scholars**, **FU Berlin SommerUNI**, **Terp Young Scholars**.

**⏰ Time-critical, and it is a `cost = 0` write:** **HKUST I·ELITE** (row titled only *"Hong Kong University
of Science and Technology (HKUST)"*). *"Membership Fee **Free**"*. Nomination window
**Sep 11 – Nov 20, 2026** — **opens in under three weeks**. Gates are real: *"by School Nomination Only!"* and
*"Ranked in the top 20% of the grade"* → propose `selectivity_tier = selective`. Also set
`application_open_date = 2026-09-11`, `deadline = 2026-11-20`, and rename the row to the programme.
**The student's action is to ask their school now**, because the nomination has to come from the school.

**Write `0`, not NULL, where free is verified** (CEO's rule — `0` means "we know", NULL means "we
didn't look"): **Kode With Klossy** — *"KODE WITH KLOSSY PROGRAMS ARE FREE"* (row `455e6fb3` is
currently `under_review`).

---

## TIER 2 — `deadline` writes that let the existing lifecycle gate close a stale row by itself

These need no `cycle_status` edit and no new code: `isOpportunityActionable` demotes them the moment
a past deadline is on file, and re-opens on its own when a new date is published.

| Row | Deadline to write | Source, verbatim | Why it matters now |
|---|---|---|---|
| **İTÜ Lise Yaz Okulu 2026** `973b3bdd` | **2026-07-16** | *"SON KAYIT: 16 TEMMUZ"*, sessions *"6-17 Temmuz 2026"* / *"20-31 Temmuz 2026"* | Currently `cycle_status='upcoming'` — false. **Occupies a dashboard slot for 3 of 7 users.** |
| **Sabancı Lise Yaz Okulu** `1d4f5e60` | **2026-08-01** | *"Son Başvuru: 1 Ağustos 2026"* | Passed 22 days ago. Slot 2 for user `6e2f0ff1`. |
| **İstanbul Bilgi** `d780bc55` | ⚠️ **do not write yet** | page serves *"Son başvuru tarihi 12 Haziran 2025"* | Its page is a cycle behind — we do not know whether a 2026 cycle exists. Re-establish the cycle first. Slot 1 for two users. |

**`cycle_status` corrections with verbatim evidence** (separate from deadline writes):
- **Boston University Summer Term** `4b9f3125`: `upcoming` → **`closed`**. *"The Summer 2026 Application is now closed."*
- **Tufts Pre-College** `310c976c`: `upcoming` → **`closed`**. Most programmes *"Enrollment Closed"* or *"Coming Soon"*; the only *"Available"* one ran 5–17 July 2026.
- **Georgetown** `49fcb739`: **do not pick a value.** *"Hoya Summer High School Sessions are full, but our Pre-College Online Program is wide open."* One row, two opposite states — split it or scope it.

**`application_open_date` — the column exists (0041) and is empty where it would matter most:**
- **Notre Dame Summer Scholars** `445f2003`: *"Application live October 19, 2026"* — under two months out.
- **Harvard SSP**: *"Application Opens: Monday, December 1, 2025"*; deadlines *"January 7, 2026"* (early + priority aid), *"February 11, 2026"* (regular — the one we store), *"April 1, 2026"* (late).
- **PROMYS**: *"the PROMYS 2027 application launches next January"*; 2026 deadline was *"February 27, 2026"*.
- **Mathcamp**: *"Application materials for our 2026 summer program will be available January 12"*, deadline *"February 23, 2026"* — and **not rolling**: *"all applications received by the deadline will receive equal consideration."*
- **SIMR**: opens **18 December 2026**, *"Applications will be due in late February 2027."*
- **UCSB RMP**: *"Application Window: December 15, 2025 – March 9, 2026."*

---

## TIER 3 — `selectivity_tier` (18 upgrades, 1 downgrade, 9 evidenced keeps)

> ⚠️ **`selectivity_evidence` has no column.** `ingest.ts:187` requires it, validates it, and **discards** it.
> A tier can be written; its justification cannot. Until that column exists, every tier below is a conclusion
> whose evidence lives only in `summer_findings_2026-08-23.jsonl`. **Do not present these in-product as
> "evidence-backed".** And remember tier does **not** change what ORYN recommends — it changes the Browse
> badge, the detail page, and (via the exemption) whether #154's pay-to-enroll gate fires.

### Upgrades — a real mechanism is stated on the source page

| Row | → | The mechanism, verbatim |
|---|---|---|
| **UC Berkeley B-BAY** | `highly_selective` | **A published acceptance rate: *"10% Acceptance rate for 2026 high school sessions"*** — the only numeric rate found in the entire corpus |
| **Wharton M&TSI** | `highly_selective` | *"M&TSI selects **75 participants**… Selections are based on academic achievement and leadership in extracurricular activities"* |
| **Stanford SIMR** | `highly_selective` | eligibility gate + *"The selection process will heavily favor local (Bay Area) students"* — see Tier 4, the citizenship clause matters more |
| **TechGirls** | `highly_selective` | *"Independent selection committees composed of industry leaders and regional experts review applications"* + semi-finalist stage with *"U.S. embassy personnel… conduct interviews"* |
| **RSI at MIT** | `extremely_selective` | *"Each summer, **100** of the world's most accomplished high school students…"*, *"cost-free to students"*. ⚠️ **Row is `status='disabled'` — this upgrade has no live effect until it is re-enabled.** |
| **AwesomeMath** | `selective` | *"Take the **admission test** – not timed or proctored, but must be submitted by the deadline."* |
| **HKUST I·ELITE** | `selective` | *"by **School Nomination Only!**"* + *"Ranked in the **top 20% of the grade**"* |
| **John Locke Institute** | `selective` | *"Admission is competitive. Candidates are selected following careful consideration of a **written application and an online interview**."* |
| **UCSB RMP** | `selective` | *"minimum **3.80** academic weighted GPA requirement"*, grades 10–11, *"a competitive summer program"* |
| **Aggie STEM** | `open_enrollment` | asserted, not inferred: *"**Registration is on a first-come basis.**"* |
| **Illinois Tech Elevate** | `open_enrollment` | *"**Most students who meet the eligibility requirements are accepted**, and the process is designed to be simple and accessible."* |
| **iD Tech** | `open_enrollment` | no gate anywhere; the page's own verbs are *"register"*, *"registration"*, *"get started"* |
| **Summer Discovery** | `open_enrollment` | no admission criteria stated; universities named only as locations |
| **Cambridge Future Scholars** | `open_enrollment` | the "application" form collects only name, email and Student/Parent; footer disclaims Cambridge |
| **Oxford Royale** | `open_enrollment` | no mechanism of any kind stated behind the Apply button |
| **Global Achievers Academy** | `open_enrollment` | *"Register"* / *"Enrol"*, no gatekeeping; disclaims affiliation with the venues |
| **PROMED Projects** | `open_enrollment` | *"We embrace equal opportunities in every course"*; access is payment-based |
| **NYU Tandon ML** | `open_enrollment` | a real **prerequisite** (*"Precalculus and programming experience"*) but no selection — recorded as open-enrollment-with-prerequisites, which is **not** `selective` |

### Downgrade — the only restrictive change proposed

| Row | → | Why | Live? |
|---|---|---|---|
| **Oxford Scholastica** | `selective` → **`open_enrollment`** | No academic criterion anywhere; scarcity is booking speed (*"fully booked early in the year"*); **£995 taken before the decision**; provider disclaims Oxford twice | `cycle_status='closed'` — **not competing now**. Fix while closed: when the cycle reopens, the unsupported tier exempts it from #154. |

### Evidenced keeps — verified tonight, do not change

**Clark Scholars** (`extremely_selective` — *"**twelve** highly qualified rising high school seniors"*) ·
**Simons SRP** (`extremely_selective`) · **PROMYS** (`highly_selective` — entrance *"problem set"*, ~80 places) ·
**Mathcamp** (`highly_selective` — *"Qualifying Quiz"*) · **MITES** (`highly_selective`) ·
**Pioneer Research Institute** (`selective` — **exemption tested and CLEARED**: *"Timed Writing (Proctored
Online)"* + video interview, payment follows conditional admission) · **NSLC**, **NYLF**, **Parsons**,
**RISD** (`open_enrollment`, all re-confirmed).

**Why the keeps are listed at all:** a screen that only ever downgrades is a policy, not a screen. Pioneer and
Oxford Scholastica were tested identically — commercial-looking, ~$7.5k, `selective`, exempt from the gate —
and returned **opposite** answers. That is what makes the one downgrade credible.

## TIER 4 (CORRECTED) — eligibility: the gap is real, but 7 of my 9 examples were already recorded

> ⚠️ **This tier previously listed seven programmes as having eligibility walls ORYN recorded "nothing" about.
> That was wrong.** My corpus snapshot never selected `citizenship_restrictions` or `residency_restrictions`,
> so I read absence-from-my-projection as absence-from-the-database. CEO caught it on Sutton Trust. Second
> column-omission error of the night (the first was `status`). **Do not action the old version of this tier.**

### Already recorded — no work needed, and the existing prose is good

**Caltech SRC** · **CU Boulder PCDP** · **Stanford SIMR** · **MITES** · **Clark Scholars** · **Sutton Trust** ·
**Parsons** all carry the restriction in `citizenship_restrictions` and/or `residency_restrictions`, several of
them more precisely than I described them. Eight rows in the corpus carry the value *"None stated on the
fetched pages"* — an honest-null that separates *"we looked, the source is silent"* from *"nobody looked"*.

### Corrected corpus measurement

`citizenship_restrictions` **22** · `residency_restrictions` **20** · `eligible_countries` **12** →
**33 rows with any eligibility signal** (31 active). My earlier "12" counted only `eligible_countries` and
understated it ~3×. **The real gap: 126 of 157 active rows.**

### The rows where the eligibility genuinely IS missing — verified

| Row | What is missing, verbatim from the source |
|---|---|
| **LSE Summer School** | *"The minimum requirement… is to have an **offer of a place at university**"* — and both prose fields read *"None stated on the fetched pages"*, so it really is absent |
| **TASS** | *"International students… must be **sophomores** to apply"* (US students may be sophomores **or** juniors) + a birthdate window a year narrower. All fields null. **Opens ~15 Oct — record before then.** |
| **TechGirls** | Türkiye **is** on the participating list; also *"U.S. dual citizens living abroad cannot participate"* and ineligibility if the student *"traveled to U.S. in last 3 years on ECA programs"*. All fields null. |
| **UCSB RMP** | *"TOEFL/English language proficiency exam scores are **NOT** needed for International applicants"* — a **permissive** fact worth recording, not just a restriction |
| **Bath International Summer School** | *"international students… who will be **starting university in September 2027**"* — gated on holding a university offer. All null. |
| **KU Leuven** | *"380 EUR for students at Flemish high schools, and **430 EUR for other students**"* — price varies by school system |
| **Mathcamp** | *"We do not require the TOEFL for non-native speakers"* — again permissive |

### The shape no column can hold: values that change with the applicant

Three cases found, all verified, none expressible in a scalar column:
**Parsons** — the *deadline* differs by nationality (*"May 8, 2026 (**April 1 for international students**)"*) ·
**KU Leuven** — the *price* differs by school system · **TASS** — the *eligible grade* differs by nationality.
This is a different schema argument from a missing field: here the field **type** is wrong.

### The actual target set — 27 rows, computed not sampled

Filtered on the complete 25-column snapshot: `status='active'` **AND** passes `isOpportunityRecommendable`
**AND** `verification_state='verified_current'` **AND** no `citizenship_restrictions`, no
`residency_restrictions`, no `eligible_countries`. These are the rows that **reach the counselor path and say
nothing about who may apply**:

Aggie STEM · Boston University Summer Term · **Canada/USA Mathcamp** · Case Western Online Pre-College ·
Emerging Engineers @ UVA · Georgetown · Georgia Tech PEAKS · Global Achievers Academy · **HCSSiM** ·
*Interlochen Arts Camp (founder-held — excluded from any proposal)* · Iowa Young Writers' Studio ·
İstanbul Bilgi · **JAX Summer Student Program** · NSLC · NYC Commuter Summer (Columbia) · NYLF Medicine ·
ODTÜ · Oxbridge Academic Programs · RISD Pre-College · Sabancı · **Summer Science Program (SSP)** ·
Tufts Pre-College · Notre Dame Summer Scholars · Vanderbilt PTY · **Wharton M&TSI** ·
**Yale Young Global Scholars** · İTÜ.

**Eleven of the 27 are already researched in `summer_findings_2026-08-23.jsonl`** — their eligibility facts are
sitting in the findings file waiting to be written. The remaining sixteen are the honest backlog.

**Scale check, so nobody over-reads this:** 126 active rows lack an eligibility signal, but only **89** are
recommendable and only **27** are also `verified_current`. The rest are Browse-only or already non-actionable.
**27 is the number worth working, not 126.**

### The lesson

**I sampled on salience.** RSI, MITES, SIMR, Clark are the famous rows — and therefore exactly the ones already
curated carefully. The genuinely undocumented rows are the boring ones nobody has looked at — and the list
above is what they actually are.

## TIER 5 — retire (the correct record already exists, or no real-world entity does)

| Row | Why |
|---|---|
| **Garcia Summer Scholars** `d83d7048` | `official_url` is a Stony Brook **news article**. Correct row exists: `a37fa810` (selective, verified, cost 4116, official page). `active`, 7 matches. |
| **The Pioneer Academics Research Program** `c581e99a` | `official_url` is the vendor's own *"is Pioneer Academics worth it?"* marketing review. Correct row exists: `bdc4bdb5`. |
| **Bocconi Summer School 2026** `e6f4c6d8` | Not a duplicate — it is Bocconi's **bachelor-students** summer school, `active` with 7 matches in a 14–18 catalogue. Do **not** merge into the high-school row; that would hide it. |
| **Copenhagen Business School Summer University** `2f3ba478` | Second confirmed wrong-audience row: *"international exchange students, freemovers, students from CBS and other Danish universities as well as professionals"*, *"bachelor and master-level courses"*. `active`, 3 matches. |
| **University of Bath International Summer School** | For *"international students... who will be starting university in September 2027"* — a pre-arrival bridging programme gated on holding a university offer. Distinct from the separate "Step into Bath" row; do not merge. |
| **Trinity College London, Ireland** `f8fc69c2` | Conflates Trinity College **London** (an English awarding body) with **tcd.ie** (Trinity College **Dublin**), and places it in Ireland. No single entity is being described. |
| **Coriell Institute** `eee7b96a` | Its own site describes no high-school programme; the education section offers *"College Internships"*. |
| **iStar Class Credit and Research Program** | Advertises an *"ADVANCED COLLEGE CREDIT PROGRAM"* naming **no** accreditor and **no** credit-granting institution. |
| **Duke TIP 2024** | Programme discontinued; Duke 301-redirects its URL to a *different* programme ORYN already holds separately. |

## TIER 6 — repair, don't retire

- **Purdue University** `16d56c3b` — `active`, eligible to **7/7**, title is just *"Purdue University"*, URL is the bare homepage. But its **`description` already holds the answer**: *"Purdue University | Summer College for High School Students | https://www.purdue.edu/summer-high-school/…"*. Verified: programme is *"Summer College for High School Students"*, *"high school students ages 16 and 17"*, *"The application for the summer of 2026 is now closed. Check in December for our 2027 course offerings."* **Our stored description says "age 15 and older" — wrong in both directions.** Strip the `_ga` tracking parameter.
- **TechGirls** — our title claims *"(w Virginia Tech University)"*. **No page I read mentions Virginia Tech.** Unverified; don't assert it in a title.


---

## TIER 7 — checks I did NOT do, ranked by what they would most likely change

1. **Sweep the remaining European "summer schools" for audience.** Two of two checked were university-level.
   Unchecked: **LSE Summer School** (rank 1, 91%, for user `e9eba798` — the highest-ranked unchecked row in
   the corpus), Sorbonne, Maastricht, Edinburgh, "Summer Programs in the Netherlands".
2. **Re-verify the remaining five pay-to-enroll exemptions.** Wharton LBW, SSP, HCSSiM, Garcia, NHSEB. I
   cleared Pioneer and failed Oxford Scholastica; the other five are assumed sound and were not tested.
3. **Confirm Pioneer's Oberlin College credit claim from Oberlin**, not from Pioneer. Same right-authority
   rule that decided Schoolhouse/MIT.
4. **Establish whether Türkiye counts as "ordinarily resident in Europe" for PROMYS Europe.** Their site
   states no definition, and this determines whether ORYN's Turkish users have a PROMYS route at all.
5. **Confirm TechGirls is fully funded** from an official page — I only have "competitively recruited".
6. **Re-establish İstanbul Bilgi's current cycle** before writing any deadline; its page serves 2025.
7. **Verify the Virginia Tech relationship** asserted in our TechGirls title — no page I read mentions it.
