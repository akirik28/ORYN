# Netherlands — counselor knowledge

Evidence base: 313 requirements + 178 deadlines across 6 Dutch universities (TU Delft, Erasmus
Rotterdam, Tilburg, University of Amsterdam, Groningen, Vrije Universiteit Amsterdam — part of the
shared 991-record DE/NL corpus,
`data/research/university-requirements/de_nl_{requirements,deadlines}_*.jsonl`), plus
`docs/research/university-requirements/de-nl-requirements-deadlines-summary.md` (VERIFIED tier),
and `docs/research/admissions-systems/netherlands.md` (SYSTEM-LEVEL BACKGROUND tier). **A
conflicts-verification lane is currently working through the German/Dutch conflict set** — check
with the coordinator before presenting any conflict below (Erasmus EUC, Groningen FEB, VU
Amsterdam Law in Society) as still open.

## Studielink's 15 January numerus fixus date comes from Studielink, not the university, and carries no published year

This is the single cleanest finding in the entire DE/NL research pass, confirmed **independently
six separate times** — every one of the six Dutch universities in this corpus fetched Studielink's
own page directly and found the identical text: "until 23:59 on 15 January" for numerus fixus
programmes (e.g. DL-2026-08-21-DEL0001, DL-2026-08-21-VUA0001, DL-2026-08-21-GRO0001,
DL-2026-08-21-TIL0001, all `VERIFIED_RECURRING_UNDATED`) and "until 23:59 on 1 May" for
non-numerus-fixus programmes (DL-2026-08-21-DEL0002, DL-2026-08-21-VUA0002,
DL-2026-08-21-GRO0002, DL-2026-08-21-TIL0002) — **genuinely undated on Studielink's own page**,
never restated with a year even where a specific university's own page gives one for a specific
programme. This is Dutch statute, not a per-cycle announcement, which is why it is safe to state
as "15 January" without a year and why a downstream store must record `deadline_date: null` rather
than synthesize one. Per coordination DECISION 1, Studielink is HIGH authority for this fact
specifically because it is the platform that *operates* national registration, not merely a
university's own restatement of it.

**Real exception, found independently at two universities**: selective Bachelor's programmes run
their own later deadlines through their own selection procedure, distinct from the national
numerus fixus date — PPLE and Amsterdam University College at UvA, and University College /
several Erasmus majors at Erasmus. This is a genuine programme-level fact, not a restatement of
the national one — UvA's own agent confirmed this against official pages after a third-party blog
gave the wrong date for PPLE, worth remembering as a caution against trusting aggregator dates for
selective-programme deadlines specifically.

## Studielink registers; it does not decide — and every applicant applies twice

Studielink is enrolment/registration only, not a UCAS-style decision platform — it collects the
enrolment request and routes basic data, but the actual admission decision happens separately, at
each university, outside Studielink. The real pattern is **Studielink registration (platform
layer) + university-specific supplementary application (university layer)** — everyone registers
via Studielink, then *also* completes each university's own document/portal process. Never present
Studielink registration alone as a completed application.

## Turkish applicants: Nuffic's baseline says "insufficient," but real acceptance varies sharply by university and is not consistent even between two similar universities

Nuffic (Dutch NARIC) places a standard Turkish Lise Diploması at only **"at least HAVO"** — one
tier below the VWO baseline that WO (research-university) Bachelor's entry requires. That is a
system-level comparison, not a binding rule; each university applies its own admission regulations
(OER) on top, consulting but not bound by Nuffic. The real spread, university by university:

- **Tilburg** accepts a Genel Lise Diploması for direct entry **only if the Diploma Puanı clears
  85%** — and explicitly **excludes** Imam-Hatip/Meslek/Teknik Lisesi diplomas from this route
  entirely, regardless of score.
- **VU Amsterdam** instead requires **either an 80% GPA plus 4 qualifying AP exams scored 3-5, or
  at least one completed year of Turkish Lisans (university) credits** — a structurally different
  bar from Tilburg's single percentage threshold, for the identical input credential.

**A Turkish applicant cannot assume one Dutch university's acceptance criteria implies another's**
— Tilburg and VU Amsterdam, both mainstream Dutch research universities, apply genuinely different
mechanisms (a bare percentage vs. a percentage-plus-supplementary-exam combination) to the same
diploma. Holding AP/IB/A-Level on top materially changes the picture — such a student is generally
evaluated under that qualification's own, more standard criteria instead of the plain-Lise route,
typically without needing a bridge year. **"One year of completed Turkish Lisans credits" is a
real, independently documented bridge route**, distinct from a generic foundation-year program —
worth naming specifically to a student who has already started a Turkish university degree and is
considering a transfer. YKS's role in Dutch VWO-equivalence was not confirmed or ruled out in the
source research — a genuine open gap, not a confirmed-irrelevant finding; do not assert either way.

## Predicted grades don't exist natively — but Dutch universities read foreign ones operationally, for a structural timing reason

VWO (the Dutch pre-university track) has no native predicted-grade concept — VWO students apply
with actual in-progress grades (cijferlijst: a school-set schoolexamen component plus a nationally
standardized centraal examen), not a teacher-issued forward-looking prediction. But **where a
foreign curriculum natively produces predicted grades (IB, A-Level), Dutch universities read and
rely on them operationally for early eligibility** — because Studielink's 15 January/1 May
deadlines both fall well before VWO/IB/A-Level final results (May/June/July), predicted grades are
functionally necessary for any applicant, Dutch or foreign, to be evaluated on time. This connects
directly to conditional admission: a student admitted on predicted/in-progress grades receives
*voorwaardelijke toelating* (conditional), converted to *onvoorwaardelijke* (unconditional) only
once final results meeting the stated condition are submitted — Tilburg explicitly names both
stages on its own pages.

**Conditional admission operates at two nested levels, and they answer different questions.**
(1) **Diploma-conditional**: essentially every applicant, Dutch VWO students included, gets a
conditional offer pending the final diploma, converted once produced — this is universal, not a
signal of selectivity. (2) **Selection-conditional** (numerus fixus programmes only): meeting the
VWO-equivalent-plus-subject-prerequisite bar only earns entry into the *selection process* —
"eligible" and "admitted" are explicitly decoupled for capped programmes, which is a materially
different and stronger claim than diploma-conditional alone.

## Subject prerequisites are real and programme-specific, not decorative — VWO's four profielen

Every VWO student chooses one of four fixed profielen: Cultuur & Maatschappij (humanities/social/
creative), Economie & Maatschappij (economics/social-science), Natuur & Gezondheid
(biology/health/medical), Natuur & Techniek (most quantitative — tech, advanced maths, physics).
Many Bachelor's programmes publish a required profiel, or for foreign-curriculum applicants an
equivalent named subject/level requirement (e.g. "Mathematics B-level, Physics, Chemistry"), as a
hard admission gate **separate from** the general VWO-equivalence baseline — a student can clear
the baseline recognition and still fail the programme's specific subject gate. For non-VWO
applicants, universities don't literally assign a profiel label but publish the functional
equivalent subject requirement instead — translate, don't assume it doesn't apply.

## The TOEFL rescale trap recurs here too, including a same-day two-programme split

The DE/NL corpus's 124 test-scale-tagged records span both countries. TU Delft shows the same
"good handling on one page, bad on the sibling page" pattern documented in the Germany doc: its
MSc English-proficiency page handles the January 2026 rescale correctly and explicitly
(two cleanly dated records, before/after cutover); its BSc page, fetched the same day, shows zero
rescale awareness — a bare, unqualified score. **Groningen is the cleanest positive counter-example
in the whole DE/NL corpus**: all 7 subject-area groups checked republish both the legacy and new
TOEFL scale side by side, zero unqualified-legacy-scale records. Never assume "Netherlands
generally handles this well" from Groningen's clean record — check the specific university and
programme page.

## Two conflicts to check before presenting as open

- **Erasmus (EUC)**: one page's own intro paragraph shows stale 2026 dates while its section
  headings and sidebar show current 2027 dates, for the same deadline — reconfirmed via four
  independent fetches before being recorded as conflicting, not assumed resolved.
- **Groningen**: two official pages disagree on the current FEB Master's deadline for
  international-diploma applicants — one already rolled to 1 May 2027, the general hub (headed
  "2026/2027") still showing 1 January 2026 for the same population. **This is the case where the
  older-looking page is actually correct** — a "prefer the newer page" heuristic gets Erasmus right
  and Groningen wrong, which is exactly why neither was resolved by that heuristic and both need a
  human or the conflicts lane to adjudicate directly.
- **VU Amsterdam (Law in Society)**: three different official pages give three different dates
  across three different framings (test-registration guidance, general deadline, rolling-admission
  table) for what should be one application window.

## SYSTEM-LEVEL BACKGROUND: how the system works generally

- **Maximum 2 numerus fixus programme registrations per student per year** nationally; **just 1**
  for Medicine/Dentistry/Dental Hygiene/Physiotherapy/Midwifery specifically — no confirmed cap on
  open (non-fixus) programme applications.
- Standardized tests are not mandatory nationally — SAT/ACT surface only as supplementary evidence
  some universities accept to help establish VWO-equivalence (notably for US- or Turkish-diploma
  holders). Individual numerus fixus programmes run their own bespoke selection tests — e.g. TU
  Delft's CSE Bachelor uses a mandatory Mathematics + Systematic Reasoning test to stratify
  applicants into ranked bands.
- No personal statement for standard open programmes; numerus fixus/decentralized-selection
  programmes may require a motivation letter as one of at least two legally required qualitative
  selection criteria under the Netherlands' 2023 legal framework for numerus fixus selection
  methods.
- Recommendation letters are not identified as a baseline requirement anywhere reviewed, even at
  the numerus fixus Bachelor's level — a genuine structural difference from the US/UK pattern.
- **Dominant counselor risk (per the cross-country matrix)**: treating the Dutch system as either
  fully rules-based or fully US-style-competitive, when it is genuinely bifurcated by programme
  type — open programmes are close to "eligible functionally equals admitted" (RULE-ADMISSIONS-001)
  while numerus fixus programmes are a genuinely separate, competitive selection process on top of
  the same eligibility bar.
