# Workstream B — online courses & certificates for high school

**Lane:** ORYN-RESEARCH-SUMMER · added by the founder mid-session, 2026-08-23 (*"sen online course ve
sertifikaları da araştır lise için"*). Research only, no production writes.

---

## The question this workstream has to answer

For summer programmes the discriminating question was *selective or pay-to-enroll*. For online credentials
that question doesn't transfer — almost everything online is open enrollment, so "open" says nothing. The
question that actually separates value here is:

> **Who holds the gate, and is the credential assessed by anyone other than the seller?**

That yields four tiers, and they behave very differently in an application:

| Tier | Definition | Examples verified tonight |
|---|---|---|
| **A** | Externally examined by a body independent of the teacher, and named by a receiving institution | **Schoolhouse.world** (named by MIT) · **AP** via the private route · **Cambridge International** private candidate |
| **B** | Real assessed work, genuinely free, but no external assessment authority | **freeCodeCamp** · **CS50** (audit + assessed problem sets) |
| **C** | Real course from a real institution, but the *certificate* is a paid add-on with limited admissions weight | **CS50 verified certificate ($219)** · platform "verified certificates" generally |
| **D** | The credential's value rests on the seller's own claim about it | **"UNO — United Nations Online"** ($4,000) |

**The asymmetry that matters:** a student has limited hours. A Tier-A credential and a Tier-C certificate can
cost the same number of evenings and are marketed identically. Only one is independently checkable.

---

## B1. The highest-value free item found — and ORYN files it under `volunteering`

**Schoolhouse.world certification.**

- **A real gate**, in the provider's own words: *"Achieve at least a 90% on the unit test while explaining your
  reasoning aloud"* on a recording showing screen and webcam, then *"peer review two videos from students
  around the world."*
- **Free.** Minimum age **13**: *"For legal reasons, you must be at least 13 years old to learn and tutor on
  Schoolhouse.world."*
- **Recognised by name, by the right authority.** MIT Admissions' own page: ***"MIT also accepts calculus
  certifications through Schoolhouse.world."*** And: *"You can download and share your Schoolhouse
  certification transcript with us on your application."*

> **Method note, recorded because I nearly got it wrong.** I recalled that MIT and Caltech accept this and was
> ready to write it down from memory. **Schoolhouse's own `/partnerships` page names no university at all** —
> only generic partnership options (*"Accept Portfolios as part of an application"*). The claim only stands
> because MIT's page says it. **The authority on what a university accepts is the university, not the vendor.**
> That rule should apply to every future record claiming "recognised by X."

Context kept rather than trimmed: MIT's sentence sits in a section addressed to students whose schools lack
advanced coursework (*"If your high school doesn't offer courses that help you prepare for MIT…"*). MIT attaches
no condition to the acceptance sentence itself.

**Why this is the single best fit for ORYN's Turkish users:** free, open at 13+, no travel, no visa, and it
directly substitutes for the calculus access a student's school may not provide. **ORYN currently stores it as
`category='volunteering'`.**

---

## B2. A dated route most students don't know exists

**AP exams without an AP school.** College Board, verbatim: *"Yes. You can't order AP Exams directly, but you
should be able to arrange to take exams at a nearby high school that administers AP Exams."*
Process: *"Your first step is to search the AP Course Ledger"*, then *"call and ask to speak with the school's
AP coordinator to learn if the school is allowing students from other schools to test there this year."*

> **Hard date: *"The deadline for schools to submit AP Exam orders is mid-November."*** Read 2026-08-23 — about
> three months of runway. **Nothing in ORYN's catalogue carries this.**

*Not established:* whether authorised international AP test centres exist for students with no local AP school.
A search summary asserted it; the official page I read is silent. Recorded as an open question.

**Cambridge International private candidates — updated from the actual primary page** (found via browser
render after WebFetch failed twice with a socket hang-up). *"If you do not attend a Cambridge school or are
studying with a Cambridge International school registered as online, you can enter our exams as a private
candidate."* Route, confirmed: *"You must find a centre or approved Cambridge exam provider in your country
that accepts private candidates and register with them... You must make all your arrangements for taking
exams directly with the school not with Cambridge International."* Requirement: *"You must be able to meet
the full requirements of any assessment for which you are entered."*

**A Türkiye-specific finding.** Cambridge partners with the **British Council** to support private candidates
in a named list of countries — read in full this session: Australia, Bahrain, Bangladesh, Botswana, Bulgaria,
Cameroon, China, Colombia, Cyprus, Egypt, Ethiopia, Ghana, Greece, Indonesia, Iraq, Japan, Jordan, Kenya,
Kuwait, Lebanon, Libya, Lithuania, Malawi, Malaysia, Mozambique, Myanmar, Nepal, Nigeria, Oman, Pakistan,
Peru, Philippines, Qatar, Rwanda, Saudi Arabia, Singapore, South Africa, Spain, Sri Lanka, Sudan, Taiwan,
Tanzania, Thailand, Tunisia, Uganda, UAE, Vietnam, Zambia, Zimbabwe. **Türkiye is not on this list.** A
Turkish student's route runs through a general centre search, or the page's own named third-party alternative
— *"Tutors & Exams"* — with the page's own caution attached: *"Tutors & Exams is a third-party organisation
with no direct links to Cambridge. We do not quality assure its service."*

*Still not established this session* (the earlier search-summary claims are **not** restated as fact): the
coursework-component restriction, whether the school name appears on the certificate, which specific
qualifications are open to private candidates. These sit behind an FAQ accordion the browser could not expand
before the tab hung — a tool limitation, not evidence either way.

---

## B3. The honesty constraint on UK "points"

UCAS, quoted complete — **the second clause is the half that gets dropped in marketing**:

> *"Some universities, colleges, and conservatoires refer to UCAS Tariff points in their course entry
> requirements, **but qualifications which do not receive Tariff points may be accepted too** – so make sure you
> check the course entry requirements carefully."*

And: *"Not all qualifications are on the Tariff, so don't worry if you can't find your qualification, as a
university, college, or conservatoire may still accept it."*

**The Tariff is not universal.** ORYN must never render "worth N UCAS points" as an admissions outcome — that is
exactly the false precision the product spec forbids (non-negotiable #5). UCAS publishes *dated* tables (2026 and
2027 both downloadable), so any stored Tariff figure must carry a cycle year.

*Graded music-exam point values circulated in a search summary are **not** verified — abrsm.org and the UCAS
tables PDF both refused automated fetching. Do not publish those numbers without reading the official table.*

---

## B4. Age gates — the constraint nobody reads, in both directions

| Platform / credential | Verbatim | Effect on a 14-18 student |
|---|---|---|
| **edX** | *"You must be at least 13 years old to use the Service."* | open |
| **Coursera** | *"Any use or access by anyone under the age of 13 is strictly prohibited"* — **plus** users must be *"over the age at which you can provide consent to data processing under the laws of your country."* | **the second clause is the trap** — see below |
| **AWS Certification** | *"Candidates ages 13-17 are permitted to take AWS Certification exams with the consent of a parent or legal guardian."* | **open, with a consent step** |
| **IELTS Online** | *"IELTS Online is currently available to test takers aged 18 and above."* | **16-17 blocked** — must book a test centre |
| **IELTS (paper/computer, in-centre)** | No official ielts.org page reached states a minimum age directly (checked the Online page, the "ways to take IELTS" page, and two targeted searches for an FAQ/eligibility page — none surfaced a working primary source). Multiple independent secondary sources converge on "no hard minimum, not recommended under 16, minors need parental consent" — **still recorded as unverified**, convergence of secondary sources is not a primary source. | **likely open at in-centre formats, but genuinely unconfirmed** — do not assert |
| **TOEFL iBT** | ETS's own page, directly fetched: *"If you are age 15 or younger when you take the test, we suggest that you be accompanied by a parent or other authorized adult age 18 or older, who will be required to complete and sign a release form at the test center."* No stated minimum age at all. | **open, and more permissive than IELTS Online** — no hard age wall for 14-18 at any format |
| **Schoolhouse.world** | *"you must be at least 13 years old"* | open |
| **CompTIA** | **the Candidate Agreement is SILENT** — zero mentions of "age", "18", "parent" or "guardian" across the full 32,769-character document. The one FAQ article likely to answer this is **login-walled**, confirmed via two tools — not publicly obtainable at all, not just unchecked. | **unknowable without a CompTIA account** |
| **Google Cloud Platform Certification** (Associate/Professional) | *"you must be at least 18 years of age to be eligible for any Google Cloud Platform certification exam"* | **hard-blocked for the whole 14-18 range**, unlike AWS |
| **Google Workspace Certification** | *"you must be at least 13 years of age (except in countries with a higher minimum age)"* | open, same Coursera-style country-consent-age caveat |
| **Microsoft / Certiport (MOS)** | No age statement found on any official page reached (2 attempts now). "16+" for the general exam is consistently described in secondary sources as a *recommendation*, not a requirement — "no strict minimum age... anyone can take them." A separate, different age limit applies specifically to the MOS World Championship. | **moderate confidence: general exam likely has no hard floor; World Championship limit still genuinely unconfirmed** |
| **Duolingo English Test** | *"If you are under 13 years old (or below the cutoff age for requiring parental consent in your country), you will need a parent or guardian to provide their permission."* | **open, and the best-designed policy of this whole table** — see below |
| **Codecademy** | *"You must be 16 years or older to use the Services."* Parental consent required for 16-17. Under-13 access exists ONLY via school-mediated/COPPA-consented accounts, not individual signup. | **the HIGHEST hard floor in this table** — a self-directed 14-15 year old cannot sign up at all; a school-account pathway exists but requires institutional setup |
| **Brilliant.org** | *"Brilliant permits children under the age of 13 to use the Service, provided that Brilliant has obtained verifiable parental consent where required by COPPA."* | **open at any age with consent, no hard floor** — same permissive shape as edX/Coursera/Duolingo. Free for K-12 via "Brilliant for Educators" — but does NOT appear to issue any certificate/credential (confirmed by absence on its own pricing page, corroborated by multiple independent reviews) |
| **LinkedIn Learning** | *"Customer User must be at least 16 years of age."* (Service Terms 3.1) | **hard floor, 16+** — a 14-15 year old cannot access it under its own terms |

**A pattern worth naming: professional/career-oriented platforms sit noticeably higher than
general-education ones.** Codecademy and LinkedIn Learning — both closer to "build a resume" than
"learn a subject" — are the only two platforms in this table with a genuine 16+ hard floor. Every
general-education platform checked (edX, Coursera, Schoolhouse, Google Workspace, Duolingo,
Brilliant) sits at 13, permissively. For ORYN's 14-15-year-old users specifically, this means the
"become certificate-ready early" advice differs by category: general-education credentials are
reachable now, career-skills-platform credentials genuinely are not for another year or two.

**The Coursera clause is the one worth building around.** GDPR lets member states set the digital-consent age
anywhere from 13 to 16, and several of ORYN's target countries sit at 16. A 14-year-old there can be *below
Coursera's own stated bar* while the headline number says 13. This is the "structural rather than numeric"
eligibility shape — age, country and cost all read *eligible*, and a wall exists anyway.

**Now checked country-by-country for ORYN's actual target geography** (2026-08-24), resolving the flag above:

| Country | Digital consent age | Source strength |
|---|---|---|
| **Germany** | 16 | verbatim, GDPR-tracking source |
| **Netherlands** | 16 | verbatim, GDPR-tracking source |
| **France** | 15 | verbatim, GDPR-tracking source |
| **UK** | 13 (its own post-Brexit Data Protection Act) | verbatim — matches Coursera/edX's stated bar exactly, no gap for UK users |
| **Italy** | 14 | verbatim, GDPR-tracking source |
| **Türkiye (KVKK)** | **No self-consent age at all** — parent/guardian consent required for any minor under 18, regardless of platform | P2 — converges across multiple independent Turkish legal-compliance sources; KVKK's own guide is PDF-only and blocked this session |
| Switzerland | not established | genuinely unchecked |

**The Turkey line matters most for ORYN.** It's not just "the number is different" — Turkish law doesn't
recognize a minor's own consent as sufficient the way GDPR's country-by-country numbers do. A platform
saying "13+" is not actually clearing the bar for a Turkish family the way it is for a UK one; the
correct default guidance for ORYN's core market is "involve a parent in signup" regardless of which
platform's stated age a student technically clears.

**And the reverse error matters as much:** vendor IT certifications are widely assumed to be adults-only, and a
15-year-old is routinely told to wait. **AWS explicitly permits 13-17 with parental consent.** ORYN can surface
the consent step instead of silently excluding minors. *(Microsoft and CompTIA policies remain unverified —
see table above.)*

**Duolingo English Test is the model to point at, not just another row in the table.** Its policy folds both
of Coursera's separate clauses into one sentence — "under 13, *or* below your country's consent-age cutoff" —
so the exact trap this session spent real effort mapping (a flat "13" reading as cleared when a country's real
cutoff is higher) doesn't exist for a family reading Duolingo's own page. If ORYN ever needs to phrase its own
minor-consent copy, this is worth using as the reference wording rather than writing one from scratch.

**Now resolved in the other direction too: Google Cloud is genuinely adults-only, and this session confirmed
it rather than assumed it.** Google's own Exam Terms state a flat 18+ for GCP Associate/Professional
certifications — no parental-consent exception like AWS's. The two vendors that look interchangeable in
marketing ("get cloud-certified") have opposite minor-access policies, verified from each one's own terms
rather than inferred from one applying to the other. The lesson from B4 as a whole: **every one of these
policies had to be checked individually — no two vendors matched, and guessing from one would have been wrong
for at least three of the other five.**

---

## B5. What's already in ORYN, and what's wrong with it

The online/certificate corpus is thin and two rows are actively misleading.

**"Coursera" is stored as a single opportunity row** — `category='online_program'`, `verification_state='verified_current'`,
`cycle_status='open'`, no cost, no deadline. A marketplace of tens of thousands of courses is not an
opportunity; recommending "Coursera" to a student tells them nothing they can act on. It is the online analogue
of the *"Purdue University"* row. **Recommend retire or convert to a provider/platform entity.**

**"UNO — United Nations Online"** — `organization='Stanley Prep'`, **cost 4000.00**, `verified_current`, `open`.
This is **not fraud** and must not be described as such:

- The partnership is **real and bilaterally confirmed**. WFUNA's own site: *"Training Programs at the UN: Stanley
  Prep are developed by WFUNA and arranged through our educational partner, Stanley Prep,"* and it names the
  online product (UNO) explicitly.
- The gates are real: *"Rising 10th to 12th graders; Minimum high school GPA of 3.5"*, *"TOEFL 90 or above for
  non-US students."*

**But the attribution does not survive putting the two partners' pages side by side:**

| WFUNA — who develops it and issues the credential | Stanley Prep — who resells it |
|---|---|
| *"Letter of Recommendation in Global Leadership **from WFUNA**"* | *"an official recommendation letter **from the United Nations**"* |
| *"Official Certificate of Completion **from WFUNA**"* | *"issued by the United Nations"*, *"UN-endorsed recommendation letter"* |
| UN endorsement: **not stated anywhere on WFUNA's page** | |

And WFUNA describes itself as *"a global nonprofit organization representing and coordinating a membership of
over 100 national United Nations Associations"* — an independent NGO, **not a UN organ**.

A family paying $4,000 reads the right-hand column. **Recommendation:** keep the row, name WFUNA as the
developer in `organization`/description, and never let *"from the United Nations"* reach a student from our copy.

*Tier: do NOT assert above `open_enrollment`. A GPA/TOEFL floor is a real eligibility gate, but a floor is not a
selection rate, and "highly selective, only 50 chosen" is the vendor's own unverified claim.*

---

## B6. Verified, honest reads on the free options

- **freeCodeCamp** — *"Every aspect of freeCodeCamp is 100% free. The courses, the projects, even the
  certifications."* *"Each certification takes around 300 hours."* **No external accreditation is claimed** — the
  only external credential cited is its own 501(c)(3) status. Honest read: the value is the **portfolio of built
  projects**, not the certificate. Never present it as equivalent to an examined qualification.
- **CS50 (HarvardX)** — *"Free*"*, *"Audit for Free"*, *"Add a Verified Certificate for $219."* The assessment is
  substantial and real: *"Students who earn a satisfactory score on 9 problem sets (i.e., programming
  assignments) and a final project are eligible for a certificate."* Academic credit: **not stated** — do not
  claim it. Honest advice to a 16-year-old: **do the work, keep the projects, treat the $219 as optional.** The
  problem sets are the evidence; the PDF is not.

---

## B6b. The bridge between both workstreams: online routes into *selective* programmes

This is where Workstream A and Workstream B actually meet, and it is the most useful thing for ORYN's
international users. A selective US programme is normally unreachable from Türkiye — visa, flights,
accommodation, and often a citizenship rule. **An online track removes all four at once.**

| Programme | The online route | Why it matters |
|---|---|---|
| **SUMaC** (Stanford Mathematics Camp) | Two online sessions, **64 places** (vs 40 residential). Stanford's own words: *"The online experience and residential programs have **equal levels of academic rigor and content**."* | A top-tier selective mathematics programme, academically equivalent, with **no travel**. The difference is stated as social, not academic. ⚠️ Sessions run *"8:00am-11:00am **or** 5:00pm-8:00pm **PT**"* — for a student in Türkiye (UTC+3) the first slot is early evening and the second is the middle of the night. **Attendability is a time-zone question, and nothing in the schema holds it.** |
| **Stanford ULO** | Fully online, **$1,700 + $35** | *"All courses carry **three units of Stanford University Continuing Studies credit. Transcript Eligible.**"* A real university transcript, no visa. (Continuing Studies credit, not degree credit — keep the qualifier.) |
| **Case Western Online Pre-College** | Fully online, **$1,595**, **ages 13+**, year-round | No country clause anywhere, need-based scholarships offered, culminates in a final project. One of the most accessible US university offerings in the whole corpus. |
| **Georgetown Pre-College Online** | *"our Pre-College Online Program is **wide open**"* — while its residential sessions are full | The online track is the one still taking students. |
| **Columbia Pre-College Online Summer** | online (`location_mode='online'` in ORYN) | Not verified this session. |

**The pattern worth naming:** for a student who cannot travel, the online track is often not a lesser version
of the programme — at SUMaC it is explicitly the *same* content, and at ULO it carries the same transcript.
ORYN's `location_mode` column already exists to express this and is populated on only a handful of rows.

**And the constraint nobody records:** an online programme in a distant time zone can be *formally* open and
*practically* impossible. SUMaC's two session times are the difference between attendable and not for a
Turkish student. That is a genuine eligibility fact with no field to live in — a sixth item for the schema
list, alongside `selectivity_evidence`, currency, `deadline_mode`, language, and negative cost (stipends).

## B7. What ORYN would need to hold this properly

Recording as observation, **not** as a schema proposal (DATA's and the founder's call):

1. **A credential is not an opportunity with a deadline.** Most of Tier A/B is rolling or always-open; the
   `deadline`-shaped model fits summer programmes, not certificates. The *dated* facts here are different in
   kind — AP's **mid-November order deadline**, PROMYS' **January** opening — they are *windows to act*, not
   application deadlines.
2. **"Recognised by X" needs the receiving institution as its source**, not the provider. The Schoolhouse case
   is the template: vendor page useless, MIT page decisive.
3. **Age eligibility here is two-sided and platform-level** (IELTS Online 18+, Coursera's consent-age clause),
   not the programme-level `minimum_age`/`maximum_age` the summer corpus uses.
4. ORYN already has a `certifications` table (migration 0004) for what a student **holds**. It has almost no
   catalogue of **which credentials are worth holding**. That gap is what this workstream starts to fill.

---

## B8. Resolved this session (2026-08-24)

- **PROMYS Europe / Türkiye — RESOLVED.** Verbatim from PROMYS Europe's own 2026 application page: *"Students
  must be ordinarily resident in Europe; we include in this all countries adjacent to the Mediterranean."*
  Türkiye has a Mediterranean coastline — covered by the provider's own inclusive definition on a plain
  reading, not an inference. Age: *"at least 16 years old by the start of the programme."* This is the single
  most directly useful fact this workstream produced for ORYN's core market.
- **Google Career Certificates — reopened later with a different target and given a real, if structural,
  answer.** The Turkish-localised landing page genuinely had nothing (confirmed, not a tool failure). A later
  pass found the actual lever instead: Google's own materials link straight to "grow.google/certificates-coursera"
  — these certificates are DELIVERED VIA COURSERA, not run on Google's own enrollment system, so they most
  likely inherit Coursera's already-documented 13+/country-consent-age policy (B4) rather than a separate one.
  This also let us correct a wrong claim: some low-quality aggregators (scholarshipgoat.com, certification.guru)
  say "16 or 18 depending on region" — not corroborated by any Google source and likely confusion with a
  different Google product (the Ads/Analytics individual-qualification exams). What Google's own copy does say:
  "no eligibility criteria... though Google recommends Career Certificates for individuals who have minimally
  completed secondary education" — a soft recommendation, not a hard gate, the same shape as TOEFL's.
- **CompTIA age policy — narrowed, not resolved.** The specific FAQ article most likely to answer this
  (help.comptia.org, "Exam Prerequisites and Age Requirements") is behind a **login wall**, confirmed via two
  independent tools (403 via fetch, redirect-to-login via browser) — a real access control, not a bot-check.
  Combined with B4's finding that the Candidate Agreement itself is silent, the honest state is: **this fact is
  not publicly obtainable from CompTIA without an account**, not merely "not yet checked."
- **Microsoft / Certiport age policy — checked, still not established.** Certiport's own MOS certification page
  states no age requirement at all. A commonly-repeated "16 and up" figure and a separate, sourced "13+ to
  enter the MOS World Championship" rule both appear in secondary discussion, not on any official page reached
  — per this operation's own rule, a search summary is not a source. **Do not assert either number as fact.**

## B9. European language certifications — a whole category untouched until now, despite "Europe" being explicit target geography

- **DELF Junior (French)** — real, and unusually authoritative: *"an official qualification awarded by the
  FRENCH MINISTRY OF EDUCATION... recognised throughout the world and is valid for life."* Structured by
  age-appropriate exam version rather than one floor — DELF Prim (7-11), **DELF Junior (12-18, exactly ORYN's
  audience)**, adult DELF (18+), DALF (adult/university). No blocking age gap for this product's users.
- **Goethe-Zertifikat A1 "Fit in Deutsch 1" (German)** — real 2026 US dates and price found: *"a German exam
  for children and young people between the ages of 10 and 16"*, **USD 170.00** per sitting. Same
  by-age-band-version shape as DELF, but the age band itself is narrower (10-16) — an ORYN 17-18-year-old
  needs the separate adult-track exam, not this one. Worth remembering as the general shape for language
  certifications: age-appropriate VERSIONS, not a single age gate the way platform certifications work.
- **DELE Escolar (Spanish)** — completes the pattern: *"aimed at students between 11 and 17 years old"*,
  *"official credentials... which the Instituto Cervantes grants ON BEHALF OF SPAIN'S MINISTRY OF EDUCATION."*
  Three for three now — French, German, and Spanish youth language certifications are all
  government-or-quasi-government-authorized with a purpose-built age-banded exam track, not an adult exam a
  minor is merely allowed into. Worth treating as the default assumption for this category going forward
  rather than re-deriving it each time.
- **CELI Adolescenti (Italian) — completes the set of four, and has the cleanest age match of all of them.**
  Official Università per Stranieri di Perugia page: *"adolescenti di età compresa tra i 12 e i 18 anni"*
  (adolescents aged 12 to 18). Where Goethe A1 tops out at 16 and DELE Escolar at 17, CELI Adolescenti's
  12–18 band fully covers ORYN's 14-18 population with no gap at either end. Italian Ministry of Education
  reportedly recognizes CELI 3 for university enrollment in Italy (not independently re-verified this pass).
- The adult-track Goethe exams (for 17-18-year-olds who don't fit the youth band) remain genuinely unchecked.
- **DELF Junior cost has no single answer, structurally** — unlike TOEFL/IELTS/Duolingo's roughly-uniform
  global pricing, DELF/DALF is administered locally by each Alliance Française/test center, and each sets
  its own fee. A real official France table (EUR93-150 by level) and a real US-center table ($135-190 for
  the same levels) both exist and are both "correct" — for different students. Same shape as the "price is
  a formula, not a number" pattern already logged for Tufts/BU in Workstream A — not a research gap to close
  with one figure, a structural fact worth recording as such.

## B10. Khan Academy / College Board — a real gap this workstream hadn't covered, both closed with primary-source verification

- **Official SAT Practice** — verified from the College Board's OWN site (the receiving-institution discipline,
  not Khan Academy's side of the claim): *"The course content is developed in partnership with College
  Board... it's free!"* Genuinely integrated with the real Digital SAT: after a practice test in the actual
  Bluebook app, a student clicks straight from their own official scorecard into personalized Khan Academy
  practice. Free, no age requirement found. Directly relevant given how many of ORYN's US-bound users will
  sit the SAT.
- **AP courses** — verified from Khan Academy's own page: *"Khan Academy is now the official practice partner
  for AP."* 12 specific subjects confirmed (Calculus AB/BC, Statistics, US History, World History, Art
  History, Physics 1/2, Chemistry, Biology, Macro/Microeconomics) — not every AP subject, a real bounded list.
  **Precision worth keeping:** the review claim is *"External reviews by members of the AP community ensure
  all AP materials on Khan Academy align with the AP Program's rigorous academic standards"* — that is NOT
  the same claim as "College Board reviews and approves every lesson." Same discipline as the Stanford
  ULO/Lumiere "Extended Studies ≠ regular degree credit" qualifier elsewhere in this workstream — don't let
  "official partner" quietly upgrade into a stronger claim than the source actually makes.

## B11. SAT / ACT registration age — adjacent to "courses and certificates" but directly relevant to
this workstream's actual question ("can a 14-15 year old start now?"), and a genuine gap since
`test_scores` is a named core entity in ORYN's own product spec

**SAT: no age floor at all**, directly confirmed on College Board's own page for students under 13 —
*"a parent or guardian will need to complete and submit the Account Creation Consent form... a College
Board representative will contact your parent or guardian with next steps for creating your student
account."* More permissive than every platform in the B4 table, including the general-education 13+
tier.

**ACT:** a real dedicated parental-consent page exists (act.org/content/act/en/parental-consent.html)
confirming the mechanism, but not the exact age threshold — the commonly-cited numbers (no MyACT
account under 13, parental consent required under 16) are secondary-sourced, not independently
confirmed by a direct fetch. Recorded at moderate confidence.

**The practical answer for ORYN's advisor persona**: a 14-15 year old genuinely can register and sit
either test today, with a short parental-consent step. No age-gate blocks a decision to start early
the way one would for, say, Codecademy or LinkedIn Learning.

## Open questions I did not resolve

- ~~TOEFL iBT minimum age~~ — **RESOLVED, see B4**: no stated minimum, 15-and-under gets a suggested
  (not required) parental-accompaniment note, ETS's own page, direct fetch.
- TOEFL iBT score validity period — still not established, out of scope of the age question.
- IELTS paper/computer under-16 position — tried again (2 more pages + 2 more targeted searches, see
  B4), still no ielts.org primary source reachable. Secondary-source convergence improved (3
  independent summaries now agree on "not recommended under 16, no hard prohibition") but that is not
  the same as verified — still recorded as unverified, deliberately not upgraded on convergence alone.
- Graded music-exam UCAS point values — the real page was found this session (ucas.com's Tariff points page)
  but the actual values are PDF-only, and this session has no working PDF-text extraction. Primary source is
  now identified even though the numbers themselves remain unverified.
