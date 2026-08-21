# France — undergraduate admissions system

Part of ORYN's R3.1 country-level admissions research package. See
[`README.md`](./README.md) for the cross-country matrix and evidence-based ruleset, and
`data/research/admissions-systems/admissions-systems-v1.json` for the machine-readable
version of everything below. Builds on
[`docs/research/secondary-education-systems/`](../secondary-education-systems/) (R2.1),
specifically [`french-baccalaureate.md`](../secondary-education-systems/french-baccalaureate.md)
and [`turkiye-meb.md`](../secondary-education-systems/turkiye-meb.md).

## A. Admissions architecture

**There is no single national application platform for France — which platform even
applies is determined by the applicant's diploma track, and, for foreign-diploma holders,
their country of residence.** This is the single structural fact ORYN must encode
correctly, and it is a materially different shape from every other country in this
package. **Parcoursup** is the mandatory registration-and-routing platform for anyone
preparing or holding a French or European Baccalauréat — French nationals, foreign
nationals enrolled in a French lycée (in France or abroad, e.g. an AEFE-network school),
and EU/EEA/Swiss/Monaco/Andorra citizens generally, regardless of nationality. Like
Studielink, Parcoursup itself makes no admission decisions for "formations sélectives"
(CPGE, BTS, BUT, most Grande École and business/engineering-school "vœux," IFSI, PASS/LAS)
— each formation ranks candidates using its own confidential "algorithme local" or a
selection commission, and Parcoursup is the submission/routing/response layer, not the
decision-maker. For ordinary ("non sélective") university Licences, admission is closer to
a right once eligibility is met — but the 2018 "loi ORE" lets a université rank candidates
against the Licence mention's published "attendus" whenever demand exceeds capacity
("licence en tension"), even though the Licence is not formally classified sélective.

**Foreign-diploma holders (no French/European Bac) generally do not use Parcoursup for
ordinary Licence entry at all.** Instead they file a **DAP (Demande d'Admission
Préalable)** dossier for first-year Licence entry. Where that dossier is filed depends on
residence: candidates resident in one of **72 countries and territories with an "Espace
Campus France à procédure Études en France"** (Türkiye is explicitly on this list — see
below) must complete the DAP electronically through that country's Campus France portal,
as part of the parallel "Études en France" process; candidates resident elsewhere file a
paper DAP directly with the French embassy/consulate's cultural cooperation service. DAP
is capped at **3 university choices** (Article D.612-16, Code de l'éducation) — a
materially lower ceiling than Parcoursup's 10. A small number of elite institutions
(Sciences Po's Bachelor "voie internationale," École Polytechnique's Bachelor of Science)
run their own fully separate direct-application portal for foreign-diploma applicants,
bypassing both Parcoursup and, for the admissions decision itself, the DAP dossier —
though such an admitted student resident in an Études-en-France country would still likely
need Études en France separately for visa processing; this specific interaction was not
confirmed by a single source covering both steps together this session.

## B. Qualification eligibility

For French/European Bac holders there is no separate "equivalence" step: the Baccalauréat
(or a recognized European equivalent) simultaneously functions as secondary-school-leaving
diploma and higher-education access credential, and Parcoursup is the access mechanism.
For foreign-diploma holders, the operative test is **not** a centralized country-level
comparability ruling — France has no Nuffic- or Anabin-style national baseline that every
university consults before deciding. Instead, the **DAP form's own "Situation A/B/C"
framework** governs the dossier: does the applicant's diploma give *direct* access to
higher education *in their own country*? If yes (Situation A), only transcripts and the
diploma are required; if no (Situation B), the applicant must additionally supply an
"attestation d'accès à l'enseignement supérieur" from their home country's own authorities
(evidence of passing a competitive exam, special test, or interview). The admitting
université's own admissions commission then evaluates the full dossier against its
published "capacités d'accueil" (available capacity) — a case-by-case, university-level
judgment, not a centralized ruling.

**ENIC-NARIC France** (the French NARIC, operated by France Éducation International) does
exist and issues individualized "attestations de comparabilité" for foreign diplomas
(opinion-only, ~4-month turnaround, fee-based) — but the official DAP CERFA form's own
document checklist does **not** list an ENIC-NARIC attestation as a required input to
first-year Licence admission. This is a genuine, sourced structural difference from the
Netherlands (Nuffic) and Germany (Anabin): ORYN should not assume ENIC-NARIC plays the same
gatekeeping role in France that the equivalent body plays elsewhere, though this was not
independently confirmed as "never used" — only as "not listed as required" in the specific
document read.

## Applicant educated in Türkiye

**Türkiye is primary-source-confirmed** (the official 2026-2027 DAP "Dossier Blanc" CERFA
form, n° 50845#25, lists it explicitly) as one of the 72 "Études en France" procedure
countries, with Campus France offices in Ankara, Istanbul, and Izmir. A Turkish student
holding only a standard **MEB Lise Diploması**, with no French or European Baccalauréat,
resident in Türkiye, is very likely **not** on the Parcoursup track at all for ordinary
Licence entry — the applicable pathway is the DAP dossier, filed electronically via
`turquie.campusfrance.org`, capped at 3 university choices, with each chosen université's
own admissions commission deciding independently. This is a materially different
architecture from the Netherlands (single Nuffic baseline + per-university threshold) or
the UK (single UCAS platform for essentially everyone) — the *platform itself* changes for
a Turkish applicant, not just the threshold.

A Turkish DAP applicant must also generally pass the **TCF (Test de Connaissance du
Français)**, "tout public" version with a mandatory written-expression component — Turkey
does not appear on the DAP form's list of exclusively-French-official-language countries,
so exemption requires independent evidence (DELF/DALF B2+, or substantially French-medium
prior schooling). Whether a plain MEB Lise Diploması falls under DAP's "Situation A"
(direct access to Turkish higher education) or "Situation B" (does not, requiring a
supplementary access attestation) was **not confirmed by a source naming Turkey
specifically** in this session. Reasoning by combining the DAP form's own categories with
R2.1's established finding that Turkish higher-education placement requires the separate
national **YKS** exam (a MEB Lise Diploması alone does not itself grant a university place
in Türkiye), a Turkish applicant plausibly falls under Situation B and would likely need to
supply YKS-based evidence of access to Turkish higher education — **this is reasoned
inference, not a primary-confirmed finding, and should be flagged as such, not presented
to a student as settled fact.**

No ENIC-NARIC France page specifically addressing Turkish Lise Diploması comparability was
found or fetchable this session (`enic-naric.fr` failed with a certificate error) — a
genuine gap, not a confirmed "not needed" finding. Whether an AP/IB/A-Level qualification
layered on top of a Turkish MEB record materially eases DAP admission the way it clearly
does at Dutch universities (see `netherlands.md`) was **not confirmed either way** for
France this session — flag as unresolved, not assumed. If a Türkiye-resident student
instead prepares an actual French Baccalauréat or IB Diploma at a French/AEFE-network or IB
school in Türkiye, they follow the ordinary Parcoursup track like any other French/European
Bac holder — but whether AEFE schools in Türkiye run an identical spécialité list to
metropolitan France was already flagged as unverified in R2.1 and is carried forward here.
No France-specific foundation-year bridge mechanism (comparable to the Netherlands'
"one year of Turkish Lisans credits" route) was identified this session.

## Academic evidence used

For French-Bac/Parcoursup-track applicants, the substantive dossier is the **livret
scolaire** (actual première/terminale bulletin grades, 0-20 scale, submitted before final
Bac results exist) plus the **Fiche Avenir** — read in full from the Ministry's own
official PDF this session. The Fiche Avenir is vœu-specific and combines: (1) a common
appraisal from the professeur principal covering méthode de travail, autonomie, capacité à
s'investir, and engagements et responsabilités; (2) the chef d'établissement's opinion on
the candidate's "capacité à réussir" in the specific formation, plus an indication of class
level; (3) optional per-discipline teacher comments on post-Bac orientation. As of the 2025
platform change, numeric data (class rank, class average, cohort size) travels with the
bulletins themselves, not the Fiche Avenir. This dossier is examined by admissions
commissions well before final Bac results are published. For DAP-track (foreign-diploma)
applicants, the evidentiary picture is thinner and non-narrative: the diploma (or expected
diploma), the last two to three years of transcripts, and — where Situation B applies —
the home-country higher-education access attestation. No Fiche-Avenir-equivalent
qualitative teacher appraisal exists in the DAP dossier as read in the official CERFA form.

## Predicted grades

**No formal, UK-style numeric predicted grade exists nationally** — confirmed both by
R2.1's prior research and directly by the Ministry's own Fiche Avenir document read this
session. However, the combination of the livret scolaire's actual in-progress grades plus
the Fiche Avenir's qualitative "capacité à réussir" appraisal is **functionally close to a
predicted-grade mechanism without being labeled one**: both are submitted and read by
admissions commissions before final Bac results exist (Bac finals land in June/July;
Parcoursup's admission phase begins 2 June). The Fiche Avenir's appraisal is categorically
qualitative (per R2.1: a 4-point scale — très favorable/favorable/assez favorable/
réservé) and teacher-authored, never a numeric forecast. Whether DAP-track admissions
commissions read and rely on a foreign curriculum's own native predicted grades (e.g. IB
predicted grades submitted by a Türkiye-resident IB-school applicant) the way Dutch
universities operationally do was **not confirmed either way** this session — flag as
unresolved rather than assumed absent.

## Conditional vs. unconditional admission

Exists, but in a narrower and structurally different sense than the UK or Netherlands.
Parcoursup's **"oui, si"** response is a distinct, named mechanism: admission conditional
not on achieving a target final grade, but on the candidate accepting a mandatory
remediation/support pathway ("parcours de consolidation") attached to that place — a
genuinely France-specific conditional-offer flavor not documented in the other six
countries in this package. Final Bac attainment itself functions more like an implicit
assumption than a formally-labeled conditional artifact in the sources reviewed — no
explicit official statement of "what happens to a Parcoursup place if the Bac is not
obtained" was found this session; treat as a reasoned analogy to every other researched
system's handling of this, not a confirmed France-specific mechanism. The **DAP dossier**
carries an explicit, confirmed diploma-conditional structure: Situations A1/B1 (diploma
still "en préparation," not yet obtained) are built into the form itself, with the original
diploma required only "au moment de l'inscription définitive" (at final registration) —
functionally equivalent to Netherlands' diploma-conditional admission for that track.

## Subject prerequisites

The Ministry publishes a national reference framework — **"attendus nationaux"** — per
Licence "mention" (major) and separately for CPGE, describing expected competencies,
knowledge, and subject alignment (e.g. the Psychology mention's attendus emphasize written/
oral expression and strong performance in at least two humanities/social-science
disciplines). This framework is explicitly **non-exclusionary by design** — official
guidance states attendus "n'ont pas vocation à exclure automatiquement les candidats," a
materially softer instrument than the Netherlands' vakkeneisen or UK "essential" subject
requirements, though individual formations can and do layer their own binding local
specifics on top for sélective formations specifically ("chaque établissement définit ses
propres attentes"). For French-Bac-track students, the operative legible signal feeding
attendus-alignment is **which two of three spécialités were retained through terminale**
(per R2.1) — e.g. Mathématiques + Physique-Chimie for STEM-adjacent CPGE/Licences, SES +
Mathématiques or HGGSP for economics/social-science mentions. No equivalent nationally-
published mapping from foreign curricula (A-Level subjects, IB Higher Level subjects, MEB
coursework) onto French attendus was found this session — a genuine gap, unlike the
Netherlands' explicit foreign-equivalent subject tables.

## Standardized tests

**No SAT/ACT-equivalent exists for ordinary Licence entry, nationally or otherwise.** The
**TCF (Test de Connaissance du Français)** functions as a mandatory gate specifically for
most DAP-track (foreign-diploma) applicants — read in full from the official CERFA form:
76 multiple-choice questions (oral comprehension, language structures, written
comprehension) plus a mandatory written-expression component (three exercises), 2h25
total, fee-based, results valid 2 years, administered by France Éducation international
through embassy-designated centers. This is a language-proficiency test structurally, but
it is baked directly into the DAP admissions dossier as a gating requirement, not an
optional supplementary credential. Separately, **CPGE-to-Grande-École "concours"** (run by
inter-school consortia, two years after CPGE entry) and **PASS/LAS second-year "épreuves"**
(university-run written-then-oral exam groups) are real, high-stakes, competitive
assessments — but both are programme/track-specific, not baseline Licence-entry
requirements, and must not be described as a single national test.

## Language requirements

For DAP-track applicants: TCF as described above, required unless exempted. Confirmed
exemption categories (from the official CERFA form): nationals/residents of countries where
French is the exclusive official language and whose diploma is from such a country;
candidates whose secondary education was substantially conducted in French; holders of a
qualifying French-language diploma at CEFR B2 or above (DELF/DALF); candidates scoring
≥400/699 on the Paris-Île-de-France CCI's "Test d'évaluation de français." **Türkiye is not
on the exclusively-French-official-language exemption list**, so a Turkish DAP applicant
generally must sit the TCF unless independently DELF/DALF-B2-plus certified. French/
European-Bac/Parcoursup-track applicants face no general French-proficiency test (they are
already schooled in French). English-taught-programme language requirements (IELTS/TOEFL/
Duolingo, for the minority of programmes taught in English) are set at institution/
programme level, not nationally standardized — this pattern is consistent with general
practice but was **not independently re-verified with a France-specific source** this
session; treat as lower confidence than the TCF findings above.

## Application timing

Citing the 2026-2027 cycle (entry September 2026) as the most recently fully-documented
cycle, consistent with this package's other entries. **Parcoursup**: formation consultation
opens mid-December (17 December 2025 cited); wish formulation opens in January (19 January
2026 cited) and closes 12 March 2026 (up to 10 vœux, up to 20 sous-vœux, no ranking
required); the Fiche Avenir is finalized by lycée staff in early April; the admission phase
opens 2 June 2026, with response deadlines to individual proposals running 3-5 days early
in the phase, narrowing to about 2 days later — a missed deadline forfeits the offer,
though a 3-day grace window exists to request reinstatement via the platform's contact
channel. **DAP** (read from the official CERFA calendar): the dossier is available from 1
October 2025; deposit deadline 15 December 2025 (postmark date counts); TCF must be sat by
13 February 2026, ahead of university commissions beginning around 16 March 2026;
university decisions are communicated by 30 April 2026; the candidate must confirm a choice
by 31 May 2026. The 2027-2028 cycle (entry September 2027) is expected to follow a similar
pattern; exact dates were not published as of this research pass and should be re-verified
closer to that cycle.

## Application strategy constraints

**Parcoursup**: maximum 10 vœux, up to 20 sous-vœux across grouped establishments within
those vœux, with no required ranking/ordering of preferences (a deliberate post-2018
design choice, replacing the prior APB system's hierarchical ranking). **DAP**: maximum 3
university choices — a real, legally codified (Article D.612-16), materially lower ceiling
than Parcoursup's 10, meaning a foreign-diploma DAP-track applicant has structurally fewer
"shots" than a French-Bac/Parcoursup-track applicant applying in the same cycle. No cap was
found on Sciences Po's or École Polytechnique's separate direct-application portals (single-
institution applications, not multi-choice platforms, so not directly comparable). No
evidence was found of an overall cap spanning Parcoursup + DAP + a direct-institution
application together — in practice a given applicant is very unlikely to need more than one
track simultaneously, since the applicable track is generally determined by diploma type
rather than free choice.

## Personal statement / essays

**Parcoursup**: the **"projet de formation motivé"** is a per-vœu free-text field, capped
at 1,500 characters, no attachments or formatting, required "when the formation requests
it" — described in sources reviewed as very frequent for BTS, BUT, CPGE, IFSI, and by
extension most sélective and "en tension" vœux, but **not confirmed as strictly universal**
across every non-selective Licence vœu. This is a real, if short, motivation-narrative
mechanism attached to the vœu system itself — a materially different (more broadly present,
though much shorter) pattern than the Netherlands, where a motivation letter is essentially
confined to numerus fixus programmes only. **DAP dossier**: no essay or motivation-letter
field was identified in the official CERFA form read this session — a DAP-track applicant's
dossier is essentially non-narrative (diploma, transcripts, access attestation, TCF
result), a thinner evidentiary picture than the Parcoursup track's livret-plus-Fiche-Avenir-
plus-projet-motivé combination. Whether Sciences Po's separate international-track
application includes an essay component was not confirmed in the specific page fetched this
session (it covered eligible diplomas, deadlines, and fees, not essay requirements) — flag
as a gap rather than assume either way.

## Recommendation letters

**Not a Parcoursup platform mechanism** — multiple sources confirm no field exists on the
platform itself to submit one, structurally similar to the "not a baseline requirement"
pattern already established for the Netherlands, Germany, and Italy, and a real difference
from the US. Individual selective formations or schools may value or separately request a
recommendation outside the Parcoursup mechanism entirely, but this was not confirmed as
common or rare with precision this session. **Not listed** among the DAP dossier's required
documents in the official CERFA form. Not confirmed either way for Sciences Po's or École
Polytechnique's separate direct-application tracks this session.

## Extracurricular activities

Not an independently-weighted admissions factor for ordinary Licence entry. The Fiche
Avenir's brief "engagements et responsabilités" field is the closest structural analogue to
a US-style activities signal for French-Bac-track applicants — but it is teacher-authored
(part of the professeur principal's common appraisal), not a student-authored activities
list, a genuinely different mechanism and authorship model than the US Common App Activities
List. This extends RULE-ADMISSIONS-008's pattern (extracurricular weight is admissions-
system dependent) with another non-US/UK data point. For DAP-track applicants, no mechanism
for extracurricular evidence was identified in the CERFA dossier at all — activities appear
to play no structural role whatsoever in that track. For sélective Parcoursup vœux, activity
evidence can surface indirectly within the projet de formation motivé, similar in spirit to
the Netherlands' motivation-letter pattern for numerus fixus programmes.

## Interviews / tests / portfolios

**PASS/LAS second-year progression** includes a confirmed, mandatory oral-exam round (the
"2nd groupe d'épreuves") for candidates in the mid-ranking band — a subject-knowledge oral
exam, not a general admissions interview. **CPGE entry itself** is dossier-only in the
sources found, with no separate interview at the entry stage, though some individual
schools reportedly offer an interview as an alternative signal specifically for foreign-
schooled applicants whose bulletins are hard to interpret — programme-specific,
secondary-corroborated, not a general CPGE feature. **Sciences Po's** international
Bachelor track and **art/design/conservatoire-style** programmes plausibly involve
interviews and/or portfolio submission respectively, by strong structural analogy to the
pattern already confirmed for the Netherlands, Germany, and Italy — but neither was
independently re-verified with a France-specific source this session; treat as lower
confidence than the PASS/LAS finding. The TCF's written-expression component (DAP track)
is a language test, already covered above, not an interview.

## Restricted / selective programmes

**At least three independently-varying restriction mechanisms coexist and must not be
conflated.** (1) **PASS/LAS "numerus apertus"** for Medicine, Pharmacy, Dentistry,
Midwifery, and Physiotherapy (MMOPK): the old fixed national numerus clausus was replaced
in 2020 by a flexible, **per-university** capacity figure set jointly with the Regional
Health Agency (ARS), reflecting local training/internship capacity rather than a national
quota. First-year PASS or LAS entry is via ordinary Parcoursup registration; the actual
restriction bites at **second-year progression**, a separate, internal, competitive process
per university — two "groupes d'épreuves" (continuous assessment plus written exams, then
oral exams for the mid-ranking band), with final admission determined by **rank order**,
not raw average. A further reform reportedly planned for 2027 would replace the PASS/LAS
structure with a new single pathway; exact mechanics were not detailed in sources reviewed
this session — flag as forward-looking and unconfirmed. (2) **CPGE-to-Grande-École
"concours"**: CPGE entry itself (via Parcoursup, dossier-based) is not capacity-limited the
way PASS/LAS is; the real competitive bottleneck is a separate "concours" two years later,
run entirely outside Parcoursup by inter-school exam consortia, for entry to a specific
Grande École — conflating CPGE-entry selectivity with this later, much more consequential
concours would be a real error. (3) **"Licences en tension"**: nominally non-selective
Licences (Droit, STAPS, Psychologie, and Éco-gestion commonly cited) that a université may,
under the 2018 loi ORE, rank by attendus-fit when demand exceeds capacity — without the
Licence ever being formally reclassified "sélective."

## Admissions decision model

**Genuinely three-way, arguably richer than the two-way bifurcation found in the
Netherlands.** (1) Ordinary, non-oversubscribed Licences: closer to a threshold/right-based
model — Bac (or a DAP-recognized equivalent) plus available capacity equals admission, no
competitive ranking. (2) "Licences en tension": threshold-eligible pool then ranked against
the mention's attendus by the université's own commission once demand exceeds capacity — a
soft, administrative selection layer bolted onto a nominally open-access category. (3)
Formally "sélective" formations (CPGE, BTS, BUT, most Grande-École/business/engineering
vœux, IFSI, and PASS/LAS to an extent): explicitly competitive ranking via each formation's
own confidential selection process, submitted through Parcoursup as the routing layer only.
Layered independently on top: **DAP-track admission runs an entirely separate process** —
each of up to 3 chosen universities' own commission evaluates the dossier against its
"capacités d'accueil," outside the sélective/non-sélective Parcoursup taxonomy altogether,
since DAP-track applicants are not on Parcoursup for this purpose. No disclosed numeric
weighting formula exists at the national level for any of these tracks, consistent with
RULE-ADMISSIONS-003.

## Safe inferences

It is safe to infer that the applicable platform for a France-bound applicant is determined
by diploma track (French/European Bac vs. foreign diploma) and, for foreign-diploma
holders, country of residence — not by a single universal "the French application system."
It is safe to infer that Parcoursup registration alone never constitutes an admission
decision for sélective formations, mirroring Studielink's role in the Netherlands. It is
safe to infer that a Turkish MEB-only applicant resident in Türkiye is very likely on the
DAP/Études en France track, not Parcoursup, for ordinary Licence entry, capped at 3
university choices rather than 10. It is safe to infer that the DAP dossier's documentary
requirements (diploma, transcripts, conditional access attestation, TCF) are thinner and
more purely academic than the Parcoursup track's livret-plus-Fiche-Avenir-plus-motivation
combination — no essay, no teacher appraisal, no activities signal. It is safe to infer
that PASS/LAS first-year entry (via Parcoursup) and second-year progression (via a separate
internal ranked-exam process) are two different admissions events with two different
selection logics, not one continuous process. It is safe to infer that CPGE entry and
Grande École "concours" entry are two different, temporally separated events with different
mechanisms.

## Unsafe inferences

Do not assume Parcoursup is "the" French application platform for any student headed to
French higher education — a materially wrong assumption for most foreign-diploma
applicants. Do not assume ENIC-NARIC France's comparability attestation is a required
input to first-year DAP-track Licence admission; it was not listed as required in the
official CERFA form reviewed. Do not assume a Turkish MEB Lise Diploması's DAP "Situation
A" vs. "Situation B" classification without checking the YKS-access-attestation question
directly — this research reasoned toward Situation B by analogy to R2.1's YKS findings but
did not confirm it with a Turkey-specific source. Do not treat Parcoursup's "oui, si"
response as a rejection or as equivalent to the UK/Netherlands' grade-conditional offer — it
specifically conditions admission on accepting a remediation pathway. Do not assume
attendus function as a hard prerequisite gate the way Dutch vakkeneisen or UK "essential"
subjects can — official guidance explicitly frames them as non-exclusionary, though
individual sélective formations may bind their own local requirements more tightly. Do not
assume PASS/LAS's numerus apertus is a fixed national figure like the old numerus clausus —
it is set per-university with the regional health authority and can vary substantially. Do
not conflate CPGE-entry selectivity with the later, separate, and far more consequential
Grande École concours. Do not assume the DAP 3-choice cap applies to Parcoursup, or
vice versa. Do not assume recommendation letters and personal narrative are absent from
every French pathway — Parcoursup's projet de formation motivé is a real, if short,
motivation mechanism many formations do require, a meaningfully different picture from the
Netherlands' near-total absence of narrative motivation outside numerus fixus.

## Eligibility, competitiveness, fit

**Eligibility** splits by track: for French/European Bac holders it is largely a
qualification check (holding, or being on track to hold, the Bac) plus, for sélective
formations, meeting that formation's published attendus profile; for DAP-track applicants
it is governed by the Situation A/B/C framework plus the target université's own commission
judgment against stated capacity. **Competitiveness** varies sharply by category in a way
that requires at least three states, not two: largely absent for ordinary
non-oversubscribed Licences (closer to a right, once eligible); present but
administratively soft for "licences en tension" (ranked by attendus-fit only when
oversubscribed); and fully present, dossier-and-often-test-driven, for formally sélective
formations and for PASS/LAS second-year progression specifically. **Fit** is expressed
primarily through spécialité-to-mention alignment (does the retained coursework match the
target field) for French-Bac-track applicants, and — for sélective formations only —
through the short projet de formation motivé; no equivalent fit signal exists in the DAP
dossier beyond the diploma/transcript record itself.

## Counselor actions

Determine the applicable platform first, before anything else: is the student preparing a
French or European Baccalauréat (Parcoursup), or a foreign diploma (DAP via Études en
France/Campus France if resident in one of the ~72 listed countries — confirmed to include
Türkiye — or paper DAP via embassy otherwise)? For a Turkish MEB-only student: register via
`turquie.campusfrance.org`, plan around the materially lower 3-university DAP cap (vs.
Parcoursup's 10), and confirm the TCF French-language test requirement and timeline (sat by
mid-February for an April-decision cycle) unless an independent DELF/DALF B2+ exemption
applies. Do not assume ENIC-NARIC France pre-clears a Turkish diploma before DAP submission
— check directly with the target université's admissions office instead. For French-Bac-
track students targeting sélective or "en tension" formations, help prepare a substantive,
field-specific projet de formation motivé (1,500-character limit) and confirm which two
spécialités best align with the target mention's attendus. Determine early whether any
target formation is PASS/LAS (plan for a first-year Parcoursup entry followed by a genuinely
separate, ranked, internal second-year competitive process), a "licence en tension" (grades
and attendus-fit matter more than the "non sélective" label suggests), or CPGE (dossier-only
entry now; the real competitive event is a concours two years later, run outside Parcoursup,
for a different institution). For students considering Sciences Po's or École Polytechnique's
elite direct-application tracks, treat these as a third, separate architecture from both
Parcoursup and DAP, with their own deadlines and fees (Sciences Po's international track:
€150 application fee, confirmed).

## Data model implications

France requires ORYN's data model to represent, as a first-class fact, **which platform
even applies** — not just which threshold applies within one platform. This is a sharper
requirement than any of the other six countries in this package, where a single national
platform (or its absence) was the starting assumption. At minimum four scope levels are
needed: (1) national/legal (loi ORE, the DAP 3-choice cap under Article D.612-16, the TCF
exemption list, the ~72-country Études en France list), (2) platform (Parcoursup mechanics
vs. Études en France/DAP mechanics — genuinely different platforms with different
document requirements, choice caps, and decision-makers, not variations on one system),
(3) université (admissions-commission-level judgment on DAP dossiers and "en tension"
ranking thresholds), and (4) formation/programme (attendus, sélective-vs-non
classification, PASS/LAS numerus apertus quotas, spécialité requirements, CPGE-vs-concours
timing). A single "France requirement" record per qualification type would be actively
misleading — the model needs "which platform, which document set, which decision-maker"
to vary by diploma type and residence before any threshold-level comparison is even
meaningful.

## System / university / programme override model

**Layer 1 (national/legal)**: the loi ORE (2018) sets the Parcoursup/attendus/ranking
framework; Article D.612-16 sets the DAP 3-choice cap; the Études en France country list
and TCF exemption rules are set nationally — no university can waive these. **Layer 2
(platform)**: Parcoursup vs. Études en France/DAP are two structurally different platforms
with different document requirements and choice limits, selected by diploma track and
residence rather than by student preference. **Layer 3 (université)**: each institution's
admissions commission sets its own DAP-dossier judgment against its own stated capacités
d'accueil, and (for "en tension" Licences) its own attendus-ranking practice — where the
same input qualification can produce different outcomes at different universities, though
this research did not surface a Tilburg-vs-VU-style paired example for France specifically
this session. **Layer 4 (formation/programme)**: individual formations set their own
attendus emphasis, sélective-vs-non status, and (for PASS/LAS, CPGE, and most Grande-École
vœux) their own selection method and capacity ceiling — the mechanism that, as in every
other country in this package, converts an otherwise threshold-based picture into a
genuinely competitive one. ORYN should never present a Layer 3 or 4 fact (a specific
université's DAP judgment, or a specific formation's attendus or selection method) as if it
were a Layer 1 or 2 national fact.

## Unresolved questions

Whether a standard MEB Lise Diploması is classified DAP "Situation A" or "Situation B" for
Turkish applicants specifically, and what exact YKS-based evidence (if any) is expected —
reasoned toward Situation B by analogy to R2.1's findings, not confirmed by a
Turkey-naming source. Whether AP/IB/A-Level layered on a Turkish MEB record eases DAP
admission the way it clearly does at Dutch universities. Whether ENIC-NARIC France plays
any role, even an optional/supportive one, in Turkish-diploma DAP admissions (its own site
was unreachable this session — a certificate error, not a confirmed absence). Whether
AEFE-network or IB schools in Türkiye follow an identical spécialité list/curriculum to
metropolitan France (carried forward from R2.1, unresolved there too). The precise current
mechanics of the reported 2027 PASS/LAS reform. Whether Sciences Po's and École
Polytechnique's separate international tracks require an essay and/or recommendation
letter, and whether their admitted foreign-diploma students from Études-en-France countries
must separately complete Études en France afterward for visa purposes. Exact 2027-2028
Parcoursup and DAP calendar dates (not yet published as of this research pass). Whether the
"projet de formation motivé" field is in practice mandatory for literally every Parcoursup
vœu or only for those the formation flags as requiring it. Precise, current English-taught-
programme language-proficiency thresholds at a representative sample of French
institutions. Whether a numeric cap exists spanning Parcoursup, DAP, and direct-institution
applications combined for a single applicant in one cycle (no evidence of one was found,
but this was not exhaustively tested against an official source).
