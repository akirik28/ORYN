# Netherlands — counselor knowledge

Evidence base: 313 requirements + 178 deadlines across 6 Dutch universities (TU Delft, Erasmus
Rotterdam, Tilburg, University of Amsterdam, Groningen, Vrije Universiteit Amsterdam — part of the
shared 991-record DE/NL corpus,
`data/research/university-requirements/de_nl_{requirements,deadlines}_*.jsonl`), plus
`docs/research/university-requirements/de-nl-requirements-deadlines-summary.md` (VERIFIED tier),
and `docs/research/admissions-systems/netherlands.md` (SYSTEM-LEVEL BACKGROUND tier). A dedicated
conflicts-verification pass has since checked every Dutch case originally flagged in this corpus
(Erasmus EUC, Groningen FEB, VU Amsterdam Law in Society) — **all three closed**, and none of them
were genuine disagreements between sources; see below for what each actually resolved to.

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

## Three cases that looked like conflicts and were not — closed by a dedicated verification pass

All three were originally recorded `CONFLICTING_EVIDENCE`. A conflicts-verification lane checked
each directly and closed all three — worth keeping as counselor rules, since two of them resolve
into a genuinely useful fact rather than dissolving into nothing.

- **Erasmus (EUC): both dates are correct, for the cycles they each name.** The page's intro
  paragraph (15 Jan / 1 May 2026) and its section headings/sidebar (2027 dates) are not stale-vs-
  current — they describe two different, sequential application rounds, corroborated by the same
  page's own "Applications for 2027/2028 open on 1 October." **The operative dates for the next
  round are 15 January 2027 and 1 May 2027, 23:59 CET.**
- **Groningen: the two pages agree exactly — this was a flattened-table misread, not a real
  conflict.** The hub page's FEB entry is a 2×2 table (prior education × start month): RUG
  bachelor's graduates get 1 August (September start) / 1 January (February start); **applicants
  with other prior education get 1 May (September start) / 15 October (February start)**. The
  original record flattened this into a list and compared "1 August" against "1 January" as
  competing answers for the same population — but those are two cells of the *same row* (RUG
  bachelor's), describing two different start months. The FEB international-diploma page's 1 May
  and 15 October are precisely the "other prior education" row — the row an international
  applicant actually falls into. The apparent ~16-month gap came from comparing a February-start
  date against a September-start date across rows, not from any real disagreement. **The useful
  counselor fact this leaves behind**: an international-diploma applicant to RUG's FEB faces 1 May
  for a September start and 15 October for a February start — the RUG-bachelor's dates (1 August /
  1 January) a student might find first on the same page **do not apply to them.**
- **VU Amsterdam (Law in Society): three dates for three different applicant populations, not
  three readings of one deadline.** 1 April for non-EU/EEA applicants (the earlier date reflects
  visa lead time), 1 May for Dutch and EU applicants, 15 December specifically for the 21+
  entrance-exam route. Two things in the original record that are not deadlines at all: the ten
  monthly Admission Board decision rounds are a decision-timing schedule, not an application
  deadline, and the entrance-exam timing referenced is advisory, not binding.

**The general lesson, worth applying to any future Dutch (or other) date table**: a table
flattened into a list is how a non-conflict becomes a recorded conflict. When two "competing"
values differ by an implausible interval — here, 16 months — suspect the comparison itself (wrong
row, wrong population, wrong cycle) before suspecting either source. This is a different failure
mode from Heidelberg's genuinely open uni-assist conflict in the Germany doc, where no comparison
error exists and the sources really do disagree.

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
