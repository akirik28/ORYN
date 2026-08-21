# Law — cross-country program-level requirements

Part of ORYN's R3.1 country-level admissions research package, layered on top of the
15 country docs in [`../`](../) rather than replacing them — see
[`../README.md`](../README.md) for the ruleset (RULE-ADMISSIONS-001 through 017) and the
cross-country matrix this builds on. Machine-readable version:
[`data/research/admissions-systems/program-requirements/law.json`](../../../../data/research/admissions-systems/program-requirements/law.json).
This document does not re-derive each country's general admissions architecture — it
asks one narrower question per country: *for Law specifically, is the mechanism the same
as that country's general undergraduate admissions process, just harder to clear, or is
it genuinely a different kind of process?*

## Overview

**The single most important structural fact is not a matter of degree — it is a matter
of kind: in 13 of the 15 countries in this package, Law is a standard undergraduate
degree entered directly from secondary school, using (at minimum as a starting point)
that country's ordinary undergraduate admissions mechanism. In the United States it is
not an undergraduate degree at all.** The Juris Doctor (JD) — confirmed via the Law
School Admission Council's own program pages — is a graduate-entry-only professional
degree: every applicant must already hold a completed bachelor's degree, in *any* field,
before applying; there is no accredited "undergraduate law degree" pathway to US legal
practice, and no specific undergraduate major is required or preferred. A US-bound
"pre-law" student is, structurally, just a student completing an ordinary Bachelor's in
whatever subject interests them — "pre-law" describes an advising track, not a credential
or an admissions gate. This is the sharpest possible version of RULE-ADMISSIONS-016's
warning about vocabulary migrating across systems: "studying law" means something
categorically different for a 17-year-old choosing a UCAS course than for a 22-year-old
applying to a JD program, and ORYN must never collapse the two into one "Law" object.

**Canada complicates a simple "US = graduate-entry, everyone else = undergraduate"
summary rather than confirming it.** Outside Quebec, Canadian legal education mirrors the
US JD model almost exactly (completed prior bachelor's required, LSAT commonly required).
Quebec's civil-law tradition genuinely does allow direct entry from a CEGEP Diploma of
Collegial Studies (DCS), no prior degree, no LSAT — but this pass found, and confirms
directly against McGill's own published eligibility rules, that this route is available in
practice mainly to students schooled *within* Quebec's own CEGEP system. An international
applicant presenting an IB Diploma, A-Levels, or a foreign Baccalauréat — ORYN's actual
target population — must still complete a minimum of 60 university credits (roughly two
years of full-time study) before McGill's BCL/JD will even consider the application. For
the students ORYN actually serves, Canadian Law is best modeled as graduate-or-near-
graduate entry everywhere in the country, not as a second undergraduate-entry system
sitting alongside the US model.

**Australia adds a third variant on the same theme: a single university, not a national
policy, can independently arrive at the US/Canada structural shape.** Every Group of Eight
university except the University of Melbourne keeps a standard, direct-entry, ATAR-scored
undergraduate LLB (commonly a combined degree, e.g. LLB/Arts). Melbourne eliminated its
undergraduate LLB entirely in 2008 (the "Melbourne Model" restructuring); Melbourne Law
School's own page confirms its Juris Doctor is now the *only* degree leading to admission
to legal practice there, open only to holders of an already-completed non-law bachelor's
(or an overseas law degree). This is a genuine, sourced, institution-level exception, not
a confirmed-absent risk — a student targeting Melbourne specifically needs an entirely
different multi-year plan than one targeting Sydney, UNSW, ANU, Monash, UQ, or any other
Go8 Law programme, despite all being Australian, all being Go8, and most people's mental
model of "Australian Law" defaulting to the direct-entry ATAR shape.

**Among the (large majority of) countries where Law *is* a standard undergraduate degree,
a second-order split matters just as much for ORYN's purposes: does Law carry a bespoke
supplementary selection instrument the country's general admissions process doesn't use
at all, or does it simply use the general mechanism at a tougher competitive setting?**
Both patterns recur, independently, across multiple countries in this pass — which is
exactly the "found repeated, not asserted in the abstract" bar this package's existing
ruleset already applies. **Structurally-different-mechanism cases**: the UK's LNAT (a
dedicated national aptitude test, required at a defined, changing subset of universities,
plus an Oxbridge-specific interview); Hong Kong's HKU/CUHK Law interview, confirmed
required for *both* JUPAS/local and non-JUPAS/international applicants even though
interviews are not a general feature of the JUPAS pathway; Singapore's NUS Law, which
layers a ranking-priority choice-order rule and (secondary-sourced, medium confidence) a
written-test-plus-interview stage for shortlisted top-cohort applicants onto NUS's general
holistic default; New Zealand's Auckland and Otago, both of which admit broadly into
first-year Law but gate progression into the professional second year on a separate,
competitive result. **Numerically-stricter-only cases**: France's Droit, one of the
Licences named "en tension" — formally non-selective, no separate test or interview, yet
producing single-digit acceptance rates at Assas and Paris 1 through sheer demand;
Ireland's Law at Trinity and UCD, reached purely through ordinary CAO points with no
HPAT-style supplementary test; Turkey's Hukuk, which uses the identical centralized YKS
placement algorithm as every other programme, simply requiring a score close to the
national maximum. **Same-as-general-admission cases, where Law was not found to be
particularly distinctive even competitively**: the Netherlands (Rechtsgeleerdheid is now
open/non-numerus-fixus at most major universities researched), Italy (Giurisprudenza,
open access, non-binding orientation test only), Germany (Jura sits under the ordinary
local-NC-or-open mechanism, not one of the four national NC subjects), Switzerland
(outside EMS's four medical fields entirely), and Spain (Derecho, a standard Grado with no
Law-specific test found).

The remainder of this document works through each of the 15 countries in turn, then
extracts the cross-cutting eligibility/strengthening/irrelevance/inference findings.

## Country-by-country findings

### United States — not available at undergraduate level

**Confirmed, primary-sourced, and the anchor finding of this whole document.** The Law
School Admission Council's own JD program pages state plainly that a completed bachelor's
degree is required before applying to any JD program, and that most programs impose no
requirement on *which* undergraduate field was studied — law schools instead look for
demonstrated writing, analytical, and reading skill developed through whatever major the
applicant chose. There is no ABA-accredited path to US legal practice that begins directly
from high school. Practically, this means the entire remainder of ORYN's US undergraduate-
admissions research (Common App, holistic review, predicted-grade absence, etc., all
already documented in `united-states.md`) is the *actual* relevant admissions system for a
US-bound "law-interested" 16-to-18-year-old — Law-specific admissions logic simply does
not activate at the undergraduate stage in the US, and ORYN should represent a US-track
student's near-term goal as "a strong, subject-flexible Bachelor's," not as any kind of
Law-track admissions problem.

**Sources**: [LSAC — JD Degree Programs](https://www.lsac.org/discover-law/types-law-programs/jd-degree-programs).

### United Kingdom — structurally different

**LNAT (Law National Aptitude Test)**, a Pearson-administered, 2-hour-15-minute
computer-based reasoning test, is required by a defined, non-national, changing subset of
UK law schools — cross-verified this pass across LNAT's own site, Wikipedia's
LNAT-consortium page, university admissions pages, and multiple independent secondary
aggregators: **Oxford, Cambridge, UCL, LSE, Durham, King's College London, Bristol,
Glasgow, and SOAS** currently require it (9 UK institutions), alongside three non-UK
LNAT-consortium members found this pass (IE University in Spain, O.P. Jindal Global
University in India, Singapore University of Social Sciences) that illustrate the test's
reach beyond the UK. **Cambridge is newly required for the 2027-entry cycle**, replacing
the discontinued "Cambridge Law Test" — confirmed directly on Cambridge's own
undergraduate-study and BA Law pages. **Nottingham dropped the requirement starting with
2023 entry and remains LNAT-free for 2026-27** — a concrete, sourced illustration of
exactly the "verify the current list, don't assume a name from a prior cycle still
belongs" discipline this package's own README calls for; older secondary material (and,
candidly, this package's own `united-kingdom.md`, researched at an earlier pass) still
names Nottingham among LNAT universities, which is now stale. Warwick, Manchester, and
Edinburgh were also identified this pass as Law schools that do *not* require the LNAT.

At Oxford and Cambridge specifically, the LNAT sits *in addition to*, not instead of, the
general Oxbridge subject interview already documented in `united-kingdom.md` — Oxford's
own admissions-tests page confirms LNAT results feed both shortlisting and final
decisions; Cambridge's own pages confirm the LNAT is sat pre-interview and used partly to
determine interview invitations. Law does not get a *different* Oxbridge interview
mechanic, just an added pre-interview aptitude-test layer most other Oxbridge subjects
don't carry (Mathematics/CS/some sciences have their own separate admissions tests, but
the specific instrument and its role differ by subject). Critically, **LNAT is not a
national or UCAS-level mandate** — no government body or UCAS rule requires it; each
participating institution opted in independently, as a consortium, which is itself
consistent with `united-kingdom.md`'s general finding that the UK has no nationally
required admissions test — LNAT is a university-layer choice made by a fairly prominent,
overlapping cluster of institutions, not evidence against that general finding.

**Sources**: [LNAT official site](https://lnat.ac.uk/); [Wikipedia — National Admissions
Test for Law](https://en.wikipedia.org/wiki/National_Admissions_Test_for_Law) (secondary,
cross-checked against university pages); [Oxford — Admissions
tests](https://www.ox.ac.uk/admissions/undergraduate/applying/guide-for-applicants/admissions-tests);
[Cambridge — Law National Aptitude Test
(LNAT)](https://www.ba.law.cam.ac.uk/applying/law-national-aptitude-test-lnat);
[Cambridge — LNAT / law admission
test](https://www.undergraduate.study.cam.ac.uk/apply/how/law-admission-test);
[LawMint — Top UK Law Schools That DO NOT Require the LNAT in
2026](https://lawmint.uk/news-updates/top-uk-law-schools-that-do-not-require-the-lnat-in-2026/)
(secondary, Nottingham/Warwick/Manchester/Edinburgh); [LSE — LLB Bachelor of
Laws](https://www.lse.ac.uk/study-at-lse/undergraduate/llb-bachelor-of-laws).

### Netherlands — same as general admission (varies by university, not by field)

Rechtsgeleerdheid (Rechten) was placed under several universities' numerus fixus
frameworks in the early 2010s, but demand consistently fell short of, or only barely
exceeded, the caps — so the binding constraint rarely activated in practice — and the
confirmed trend since has run the other way: Utrecht dropped numerus fixus for Rechten,
and, as researched this pass, both UvA's and Leiden's own current admissions pages
describe Rechtsgeleerdheid as open (non-capped), using the same VWO-equivalence +
language-requirement mechanism as any other open Dutch Bachelor's. Maastricht is a
confirmed exception, described in secondary sources as using its own 100%
decentralized-selection process (not the historic central lottery) rather than open
admission. No Rechten-specific test, interview, or motivation-letter requirement was found
at any of the (now-majority) open universities researched. **The mechanism itself is not
Law-specific at all** — it is simply whichever of the Netherlands' two already-documented
general mechanisms (open threshold, or numerus fixus with decentralized selection) a given
university currently assigns to Rechten, the identical choice-space `netherlands.md`
already documents for Psychology or Medicine, not a bespoke Law process.

**Sources**: [UvA — Toelating en inschrijven,
Rechtsgeleerdheid](https://www.uva.nl/programmas/bachelors/rechtsgeleerdheid/toelating-en-inschrijven/toelating-en-inschrijven.html);
[DUB — Ook geen numerus fixus meer voor Rechten
Utrecht](https://dub.uu.nl/nl/nieuws/ook-geen-numerus-fixus-meer-voor-rechten-utrecht);
[Advocatie.nl — Numerus fixus rechtenstudies vaak niet
gehaald](https://www.advocatie.nl/nieuws/numerus-fixus-rechtenstudies-vaak-niet-gehaald/);
[Universiteit Leiden — Reglementen Selectie en Plaatsing
(Numerus Fixus)](https://www.organisatiegids.universiteitleiden.nl/reglementen/algemeen/numerus-fixus/reglementen-selectie).

### Italy — same as general admission

Giurisprudenza is not among Italy's nationally restricted numero chiuso fields (Medicine,
Dentistry, Veterinary Medicine), and was not named among `italy.md`'s own examples of
locally-capped programmes either. Confirmed this pass via Bologna's and Padova's own
admissions pages: open access, gated only by the standard non-binding TOLC-SU orientation
test (the CISIA TOLC family's humanities/social-science variant) — useful for self-
assessment and able to trigger the OFA remedial catch-up module already documented
generally in `italy.md`, but not a competitive filter and never grounds for denying
admission on its own. Same mechanism as Italy's other open-access programmes; no
Giurisprudenza-specific test, interview, or portfolio was found.

**Sources**: [Università di Bologna — TOLC SU, Giurisprudenza (Ravenna)](https://corsi.unibo.it/magistralecu/Giurisprudenza-Ravenna/tolc);
[Università di Bologna — TOLC SU, Giurisprudenza (Bologna)](https://corsi.unibo.it/magistralecu/Giurisprudenza-Bologna/tolc);
[Università di Padova — Avvisi di ammissione Giurisprudenza](https://www.unipd.it/ammissioni-giurisprudenza).

### Germany — same as general admission

Jura/Rechtswissenschaft is not one of the four hochschulstart-coordinated national NC
subjects (Humanmedizin, Zahnmedizin, Tiermedizin, Pharmazie). It commonly *is* subject to
local/örtlicher NC at high-demand universities — confirmed via Frankfurt's own
"Bewerbung und Numerus Clausus (NC), Rechtswissenschaft" page, and cross-referenced
against multiple German legal-education admissions aggregators — using the exact same
decentralized, semester-by-semester, self-set-cutoff mechanism `germany.md` already
documents for Psychology/BWL, not a Law-specific instrument. A meaningful number of German
universities admit Jura admission-free (zulassungsfrei) in semesters where demand does not
exceed capacity. No Jura-specific test, interview, or portfolio was found at any German
university reviewed this pass. Net: Law in Germany inherits the general local-NC-or-open
pattern wholesale, varying by university and by semester, never by a Law-specific rule.

**Sources**: [Goethe-Universität Frankfurt — Bewerbung und Numerus Clausus,
Rechtswissenschaft](https://www.jura.uni-frankfurt.de/55476524/Bewerbung_und_Numerus_Clausus__NC____Rechtswissenschaft___FB_01);
[iqb.de — NC Jura, alle Unis](https://iqb.de/karrieremagazin/jura/nc-jura-wo-gilt-welcher-numerus-clausus/)
(secondary aggregator, cross-checked).

### Canada — structurally different, and genuinely bifurcated within one country

Outside Quebec, Canadian legal education is graduate-entry only, mirroring the US JD model
closely: LSAC's own Canadian law-school directory confirms a completed prior degree is the
norm, and most English-language Canadian law schools require the LSAT. **Quebec's
civil-law tradition is a real, sourced, structurally different exception** — but a
narrower one for ORYN's actual applicant population than the general "Canada has a
Quebec-carve-out" framing suggests. McGill's combined BCL/JD (Bachelor of Civil Law /
Juris Doctor, integrating Quebec civil law, Canadian common law, and Indigenous legal
traditions in one programme) explicitly admits directly from a CEGEP Diploma of Collegial
Studies (DCS) or a Quebec French Baccalauréat, no prior degree, no LSAT required. **Directly
confirmed against McGill's own published eligibility page**, however: an applicant
presenting a foreign Baccalauréat, A-Levels, or an IB Diploma — i.e., a student who did not
attend a Quebec CEGEP, which describes essentially all of ORYN's actual international
users — must have *already completed a minimum of 60 university credits* (roughly two
years of full-time study) before McGill will consider a BCL/JD application. The
CEGEP-direct pathway that makes Quebec civil law look like a true undergraduate-entry
system is, in practice, available mainly to students schooled within Quebec's own CEGEP
system. For the students ORYN actually serves, Canadian Law is best modeled as
graduate-or-near-graduate entry everywhere in the country — the live variable is *how
much* prior post-secondary study is required (a full bachelor's outside Quebec vs.
roughly 60 credits for a foreign-schooled applicant even within Quebec's civil-law system)
and whether the LSAT applies (yes outside Quebec, no within Quebec's civil-law schools),
not whether a bachelor's-first structure applies at all.

**Sources**: [LSAC — Find Canadian Law
Schools](https://www.lsac.org/choosing-law-school/find-law-school/canadian-law-schools);
[McGill — General eligibility requirements, BCL/JD](https://www.mcgill.ca/law/bcl-jd/admissions-guide/eligibility);
[Canadian Lawyer — Law schools in Québec: Admission requirements, tuition fees, and legal
education](https://www.canadianlawyermag.com/resources/legal-education/law-schools-in-quebec-admission-requirements-tuition-fees-and-legal-education/392913).

### Switzerland — same as general admission

Law is not one of the four fields EMS (Switzerland's Medicine/Dentistry/Veterinary-
Medicine/Chiropractic aptitude test) covers, and no Law-specific entrance exam analogous
to ETHZ's or EPFL's own bespoke tests was found at any Swiss law faculty reviewed this
pass. The University of Zurich's Rechtswissenschaft Bachelor's uses the same
federally-recognized-Matura-or-equivalent-foreign-diploma threshold as most other UZH
Bachelor's programmes; UZH's own page notes only a narrow, Law-specific re-application bar
(a student finally rejected from Law at UZH or another Swiss law faculty cannot reapply to
study Law there) — an eligibility restriction, not a different admissions *mechanism*. HSG
(University of St. Gallen) is the one institution `switzerland.md`'s existing research
already names in connection with Law specifically: its Bachelor year-one Assessment Year
includes both a combined "Law and Economics" track (deliverable entirely in English or
entirely in German, per HSG's own page) and a standalone "Law" track (German-only) — but
the admission mechanism feeding either is HSG's general one (the standard Matura/
foreign-diploma threshold, plus, for foreign-certificate holders specifically, HSG's
25%-by-law foreign-student quota and its associated selection procedure) — a university-
wide constraint applying across all HSG fields, not something Law activates uniquely. No
sourced evidence of a Law-specific Swiss admissions mechanism distinct from the general
Bachelor's pattern was found.

**Sources**: [UZH — Zulassung zum
Bachelorstudium](https://www.uzh.ch/de/studies/application/bachelor.html); [UZH —
Rechtswissenschaft](https://www.degrees.uzh.ch/de/bachelor/50000002/51045870/51045871);
HSG Assessment Year finding as already sourced in `../switzerland.md`.

### France — numerically stricter only

`france.md`'s existing research already names Droit as one of the Licences commonly
described as "en tension" — nominally non-selective (an ordinary Parcoursup vœu, no
separate application, test, or interview requirement), yet rankable by attendus-fit under
the 2018 loi ORE when demand exceeds capacity, without the Licence ever being formally
reclassified "sélective." This pass's own research sharpens just how tense that can get in
practice: 2026-cycle reporting (L'Étudiant) names Université Paris-Panthéon-Assas and
Paris 1 Panthéon-Sorbonne as each receiving roughly 15,000 vœux for under 1,000 places, and
cites a Bordeaux "Parcours International Droit international et européen" with a
reported 2% access rate and an admitted-average baccalauréat score near 17/20 — figures
that, in aggregate, produce US/UK-grade selectivity through a formally non-selective
mechanism. The mechanism itself stays identical to any other Parcoursup Licence vœu
throughout: no Droit-specific test, interview, or supplementary dossier was found for the
French/European-Bac/Parcoursup track. DAP-track (foreign-diploma) applicants targeting
Droit were not found to follow any Droit-specific variant of the general DAP dossier/TCF
process already documented in `france.md` — a gap, not a confirmed absence.

**Sources**: [L'Étudiant — Parcoursup : quelles sont les facs de droit les plus
sélectives ?](https://www.letudiant.fr/etudes/parcoursup/parcoursup-les-licences-de-droit-les-plus-selectives.html);
"licences en tension (Droit, STAPS, Psychologie, Éco-gestion)" finding as already sourced
in `../france.md`.

### Spain — same as general admission

No Derecho-specific test, interview, or portfolio was found. Derecho is a standard Grado,
reached through the ordinary nota de admisión (EBAU, or UNEDasiss homologación/PCE for the
international track) plus the weighted-subject bonus mechanism and the regional Distrito
Único allocation process already documented generally in `spain.md`, resulting in its own
self-adjusting nota de corte per university per cycle — illustratively, cutoff-aggregator
reporting for 2025-26 shows figures as high as roughly 13.2 out of 14 for one Sevilla-area
combined Derecho-plus-International-Relations programme, reflecting demand rather than a
different mechanism. Which specific Bachillerato subjects a given university weights for
plain (non-combined) Derecho under Real Decreto 534/2024's ponderación system was not
independently confirmed for a representative sample of universities this pass — a genuine
gap, not a claim that no such weighting exists.

**Sources**: [NotasDeCorte.es —
Derecho](https://notasdecorte.es/derecho) (secondary, cutoff-score aggregator); Real
Decreto 534/2024 framework as already sourced in `../spain.md`.

### Ireland — numerically stricter only

No HPAT-style supplementary test, interview, or portfolio was found for Law at either
Trinity or UCD — both rely on the ordinary CAO Level 8 points mechanism already documented
as `ireland.md`'s national default. This directly extends, rather than qualifies,
`ireland.md`'s own general finding that the CAO/points route has no essay, interview, or
reference channel for any standard course: UCD's own general admissions guidance
explicitly confirms no personal statement or interview is required of any CAO applicant
outside Veterinary Medicine, and no source reviewed named Law as a CAO "Restricted"-flagged
course the way NCAD's portfolio-based courses or Medicine's HPAT-linked courses are
flagged. Law is, however, consistently reported as one of the more points-competitive
Level 8 courses at both Trinity and UCD in secondary admissions-consulting material — a
specific current-cycle points figure was not independently confirmed against a primary CAO
or university source this pass. The separate non-EU/direct route most Turkish/
international applicants actually use (per `ireland.md`'s own RULE-ADMISSIONS-014 finding)
presumably applies its usual essay/reference/predicted-grade evidentiary model to Law
applicants as it does generally, but this was not independently re-verified for Law
specifically this pass.

**Sources**: [TCD — Undergraduate Law
FAQs](https://www.tcd.ie/law/programmes/undergraduate/undergraduate-law-faqs/); [UCD —
General Requirements
(Undergraduate)](https://www.ucd.ie/registry/prospectivestudents/admissions/policiesandgeneralregulations/generalrequirements/generalrequirementsundergraduate/);
[UCD — Law (BCL)](https://www.ucd.ie/courses/bcl-law).

### Australia — numerically stricter only, with one confirmed structural exception

Every Group of Eight university except one offers a standard, direct-entry undergraduate
LLB — commonly a combined degree (LLB/Arts, LLB/Commerce, LLB/Science) — admitted purely
on ATAR/selection rank, no admissions test, no interview. Confirmed via UNSW's and
Sydney's own pages: reported 2026 combined-LLB ATAR figures run roughly 97.7 at UNSW and
approximately 99.5 at Sydney, among the highest cutoffs either university publishes, using
the identical ATAR mechanism `australia.md` already documents for any other competitive
course — genuinely just a very high bar on the same ladder. **The University of Melbourne
is the sharp, directly confirmed exception**: as part of the 2008 "Melbourne Model"
restructuring, Melbourne eliminated its undergraduate LLB entirely. Melbourne Law School's
own page states the Juris Doctor is now "the only degree offered by Melbourne Law School
that leads to admission to legal practice," open only to applicants who have already
completed an undergraduate degree in a field other than law (or hold an overseas law
degree). This is a genuine, sourced, single-institution structural exception inside a
country where every other researched university keeps Law as a standard school-leaver
degree — a student targeting Melbourne specifically needs a fundamentally different,
longer-horizon plan than one targeting any other Go8 Law programme, and ORYN must not
apply one "Australian Law" admissions model across every Australian university a student
might list.

**Sources**: [Melbourne Law School — The Melbourne
JD](https://law.unimelb.edu.au/centres/celrl/study-options/melbourne-jd); [Wikipedia —
Melbourne Model](https://en.wikipedia.org/wiki/Melbourne_Model) (secondary, background);
[UNSW — Bachelor of Arts/Law](https://www.unsw.edu.au/study/undergraduate/bachelor-of-arts-law);
[UNSW — Undergraduate entry
requirements](https://www.unsw.edu.au/study/how-to-apply/undergraduate/entry-requirements).

### New Zealand — structurally different

Both Auckland (already documented in this package's `new-zealand.md`) and Otago
(confirmed this pass via Otago's own Law pages) admit into *first-year* Law through the
ordinary New Zealand mechanism — Auckland via its general Rank Score system, Otago via a
standard University Entrance qualification with, Otago's own page states explicitly, "no
specific subjects that you need to study at school" for entry into first-year Law. What
genuinely differs from a normal admissions gate is what happens next: progression into the
*second*, professional year of the LLB is a separate, competitive step at both
universities. Auckland's LLB Part II (the professional stage) is competitive, based on
Part I results plus non-law grades (already sourced in `new-zealand.md`). Otago caps
second-year Law at roughly 250 places, selected predominantly on the mark achieved in the
compulsory first-year paper LAWS 101, alongside 4-6 other first-year papers. A student can
be validly, unconditionally admitted to a New Zealand university's Law programme and still
not continue past year one on entry-time credentials alone — a materially different shape
from a single admit/reject gate at the point of application, and confirmed independently
at two separate New Zealand universities rather than resting on one institution's
idiosyncrasy.

**Sources**: [University of Otago — Study Law at
Otago](https://www.otago.ac.nz/apply/laws); [University of Otago — Undergraduate study,
Faculty of Law](https://www.otago.ac.nz/law/study/undergraduate); Auckland LLB Part I/Part
II finding as already sourced in `../new-zealand.md`.

### Hong Kong — structurally different

Both HKU and CUHK require a Law-specific interview layered on top of their general
admission processes, for *both* of Hong Kong's two structurally separate applicant tracks.
**Directly confirmed against HKU's own Faculty of Law FAQ page**: for JUPAS/local
applicants, "the Faculty invites selected Band A applicants to attend interviews after the
release of HKDSE results"; for non-JUPAS/international applicants, "selected applicants
are invited to a panel interview," commonly held from December onward. CUHK's Faculty of
Law page similarly confirms interviews are required for LLB admission, for shortlisted
applicants in both JUPAS and Non-JUPAS categories. This is a genuine departure from Hong
Kong's general pattern: `hong-kong.md`'s own country-level research explicitly found
interviews "not documented as a primary factor in JUPAS's core merit-order mechanism" for
the ordinary local applicant, with interviews otherwise concentrated in non-JUPAS/
international programmes. Law is one of a small number of fields (alongside Medicine, and
at some institutions Business) where an interview reaches even the local JUPAS pathway,
which for most programmes runs on pure algorithmic merit-order matching with no human
interview step at all.

**Sources**: [HKU — Undergraduate Programme FAQ, Faculty of
Law](https://www.law.hku.hk/prospective-students/ug-faq/) (directly fetched and quoted
this pass); [CUHK — Bachelor of Laws
(LLB)](https://www.law.cuhk.edu.hk/app/study-with-us/bachelor-of-laws-llb/); [CUHK —
Non-JUPAS General Requirements](https://admission.cuhk.edu.hk/application/non-jupas/general-requirements/).

### Singapore — structurally different (and one framing correction)

NUS Law layers at least two Law-specific mechanisms onto NUS's general admission process.
**First** — already established in this package's `singapore.md` — a ranking-priority
gate: Law must be placed as an applicant's first, second, or (only if Medicine and
Dentistry occupy the first two slots) third programme choice to be considered for
shortlisting, a rule most other NUS programmes don't carry. **Second**, resolving what
`singapore.md` explicitly flagged as an open question ("the specific test/assessment
names used in NUS Law... shortlisting"): secondary reporting found this pass (medium
confidence — not independently primary-verified against a currently-live NUS Law
admissions page, since direct fetches of NUS's own domain returned empty content this
session) describes NUS reserving direct shortlisting eligibility for the top 5% of each
junior college/Millennia Institute cohort by A-Level or IB result (with Law as first
choice), with shortlisted candidates then sitting a written test and interview whose
performance, combined with academic results, determines admission. SMU's Bachelor of Laws
was not found to carry an equivalent bespoke test/interview layer in sources reviewed this
pass — its LLB admissions language (strong academic record, co-curricular record, holistic
review, reported illustrative benchmarks around 67.8 Rank Points/AAA/3.7 GPA) reads as
closer to SMU's general holistic default than to NUS's distinct Law-specific process,
though this was not checked to NUS's depth. **A structural correction to flag plainly**:
NTU does not appear to operate a Faculty of Law or offer an undergraduate LLB at all —
NTU's only law-adjacent teaching found this pass is a Business Law division within Nanyang
Business School, not a professional qualifying law degree. Singapore's three
Institute-recognized qualifying law degree providers, confirmed this pass, are NUS, SMU,
and the Singapore University of Social Sciences (SUSS) — not NTU. Any framing of
Singapore's undergraduate Law landscape as "NUS/NTU/SMU" should read "NUS/SMU/SUSS"
instead; NTU is a structural non-participant in undergraduate legal education, not merely
an under-researched one.

**Sources**: NUS Law ranking-priority-gate finding as already sourced in
`../singapore.md`; [SMU — Bachelor of
Laws](https://www.moe.gov.sg/coursefinder/coursedetail?course=smu-law-bachelor-of-laws);
[SUSS — Bachelor of Laws
(LLB)](https://www.suss.edu.sg/programmes/detail/bachelor-of-laws-lawllb); [Singapore
University of Social Sciences School of Law —
Wikipedia](https://en.wikipedia.org/wiki/Singapore_University_of_Social_Sciences_School_of_Law)
(secondary, on NUS/SMU/SUSS as the three local qualifying providers); NUS top-5%-cohort
written-test-and-interview claim is secondary-sourced this pass (search-synthesized from
NUS-affiliated pages, not independently primary-fetched — flagged as medium confidence
above).

### Turkey — numerically stricter only

Hukuk (Law) is placed under the **EA (Eşit Ağırlık/Equal-Weight)** YKS score type,
alongside Economics, Business, Psychology, and Social Work — **not**, as might be assumed
by pattern-matching "Law is a humanities/verbal field," the SÖZ (Sözel/Verbal) score type.
This is a direct, sourced correction worth flagging plainly rather than quietly folding in:
the intuitive guess is wrong, and `turkey.md`'s own primary research (ÖSYM-sourced) is
unambiguous on the score-type routing. Beyond that routing — itself a uniform,
nationally-set, platform-level mechanism applying identically to every EA-scored
programme, not a Law-specific rule — `turkey.md`'s existing research already names Law
explicitly (alongside Medicine and top-university Engineering) as one of the fields that
"require close to the maximum attainable score": the identical centralized-algorithmic-
placement mechanism as every other lisans programme, sitting at the extreme-competitive
end of that mechanism's range rather than using any different mechanism. No separate test,
interview, or portfolio of any kind was found, or would be structurally possible, within
the domestic YKS pathway for Law — consistent with, and not an exception to,
`turkey.md`'s own emphatic, independently-confirmed finding that zero non-score channel
exists anywhere in that pathway for any field.

**Sources**: EA score-type composition and Law's placement within it, and the
near-maximum-score finding, as already sourced in `../turkey.md` (ÖSYM-derived).

## What determines eligibility

**The first, threshold question is not academic at all — it is structural: does the
target country/institution even offer Law as an undergraduate degree?** For the US,
always no. For Canada, effectively no for ORYN's actual international applicants (Quebec's
CEGEP-direct route excepted, and even that route requires ~60 university credits for a
foreign-schooled applicant). For Australia, yes everywhere except the University of
Melbourne specifically. For the other 12 countries researched, yes, uniformly at the
country level. ORYN's eligibility logic must resolve this before evaluating anything about
a specific student's academic record — it is a property of the *country and institution*,
not of the applicant.

**Where undergraduate Law exists, it inherits — never replaces — that country's general
undergraduate eligibility gate**: the same secondary-qualification recognition/
equivalence threshold, the same language-proficiency requirement, the same subject-
prerequisite-if-any mechanism already documented for that country generally. Law does not
invent a new baseline eligibility test anywhere researched this pass; a student ineligible
for a country's general Bachelor's admission (e.g. a plain MEB Lise Diploması falling
short of a given Dutch university's threshold) is, on that basis alone, also ineligible for
that country's Law programme — Law is downstream of general eligibility, not a parallel
gate.

**Layered on top, in a confirmed subset of countries, one or more Law-specific
supplementary requirements determine whether an eligible applicant is actually admitted or
shortlisted**: a dedicated aptitude test (LNAT in the UK), a mandatory interview (Oxbridge,
HKU, CUHK, and — secondary-sourced — NUS's shortlisted top-5% cohort), a ranking-priority/
choice-order rule (NUS: Law must be ranked first, second, or third), or a post-first-year
competitive-progression requirement (Auckland's Part I→Part II, Otago's LAWS 101→
second-year cut). These determine outcome *among already-eligible* applicants — they are
not eligibility gates themselves, and conflating "did not clear the LNAT bar a given
university sets" with "ineligible to study Law" would misdescribe how the UK's own
admissions decision model works (LNAT feeds a competitive/holistic decision, per
`united-kingdom.md`'s own admissions-decision-model finding, not a pass/fail eligibility
line).

**For graduate-entry systems** (the US uniformly; Canada's common-law-province JD; the
University of Melbourne's JD specifically within Australia), eligibility is an entirely
different *object*: it concerns the prior bachelor's degree (completed, any field, with
GPA and — where required — an LSAT score as the typical inputs), and nothing about the
applicant's *secondary* schooling bears on Law eligibility directly at all. This is a
genuinely different eligibility question than every other country/field combination in
this package, and ORYN's data model must be able to represent "not yet eligible because no
qualifying prior degree exists" as a distinct, expected state for a 16-18-year-old
US/Melbourne/common-law-Canada Law-track student — not an error state, and not something
CV-import or profile-completeness logic should try to resolve prematurely.

## What genuinely strengthens an application

Where predicted/final secondary-school grades are the operative lever (the large majority
of the 12 undergraduate-entry-with-general-mechanism countries), strong performance in
that country's *existing* general admission signal — grades, EBAU/YKS/ATAR/Rank Score/CAO
points, whichever applies — is what strengthens a Law application; Law rides on the
country's existing academic-strength signal rather than introducing a separate one. Where
a bespoke Law test exists (LNAT, and secondary-sourced NUS's written test), the instrument
itself is explicitly designed and marketed (LNAT's own materials state this directly) to
measure verbal/inductive/deductive reasoning and argument comprehension — aptitude for
studying law, not existing legal knowledge a secondary-school student could not be expected
to have. Where interviews exist (Oxbridge, HKU, CUHK, NUS's shortlisted cohort), the
confirmed mechanism is a general academic/reasoning interview, not a legal-knowledge
examination; admissions-consulting sources commonly cite subject-adjacent "super-
curricular" engagement (debate, Model United Nations, mooting, relevant reading) as
plausibly helpful preparation, consistent with `united-kingdom.md`'s own general
super-curricular finding for UK admissions — but this is consulting-tier, discovery-level
material, not a documented formal admissions criterion at any institution reviewed this
pass, and ORYN should present it as plausible preparation, not a checklist requirement. For
graduate-entry JD systems, LSAC's own guidance is explicit that undergraduate GPA broadly,
LSAT performance (where required), and the general rigor of the completed prior degree
matter — not the specific choice of undergraduate major, which LSAC confirms is not
required or preferred to be any particular subject.

## What is largely irrelevant

A documented "law work experience," legal internship, or shadowing requirement was not
found as a formal admissions criterion anywhere in this pass, at any of the 15 countries —
unlike, for comparison, US medical-school admissions' well-known clinical-hours
expectation, Law has no equivalent confirmed norm; such experience may plausibly help as
context inside an interview-based system, but is not a documented checkbox anywhere
reviewed. General extracurricular breadth, specifically, remains a non-factor inside every
threshold/algorithmic system already documented as such at the country level (Turkey's
YKS, Ireland's CAO, Spain's EBAU/nota-de-admisión, Italy's open-access TOLC model, Germany's
local-NC-or-open pattern) — Law does not create a Law-specific exception to those
countries' own general "not a factor" findings. **The LSAT specifically, outside North
America, was not found to play any role in any of the other 13 countries' undergraduate
Law admission processes researched this pass** — the UK uses its own, unrelated LNAT, not
the LSAT; no LSAT role was found in undergraduate Law admission in the Netherlands, Italy,
Germany, Switzerland, France, Spain, Ireland, Australia (outside Melbourne's graduate-
entry JD, where GAMSAT rather than LSAT is the more commonly cited Australian graduate-
entry-law instrument, not independently verified this pass), New Zealand, Hong Kong, or
Singapore — a common pattern-matching error ("law school = LSAT") worth flagging
explicitly as a false generalization from the US/Canada case. Finally, where Law is
graduate-entry, a specific "pre-law" undergraduate major is irrelevant by LSAC's own
explicit statement — there is no preferred or required prior field of study.

## What ORYN must never infer

Never assume a country's Law degree is undergraduate just because most fields in that
country are — Australia's University of Melbourne is a directly confirmed, single-
institution counterexample inside an otherwise uniformly-undergraduate-entry country.
Never assume a country's Law degree is graduate-entry just because the US model is the
most globally familiar shape — 12 of the 15 countries researched offer direct-from-
secondary-school Law degrees with no prior-degree requirement at all. Never assume a
Law-specific test or interview requirement generalizes across every university within one
country — even inside the UK, a clear minority of law schools (9 of many dozens) require
the LNAT, and the list itself changes over time (Nottingham's confirmed 2023 drop is the
clean illustrative case; Cambridge's confirmed 2027-entry addition is the mirror-image
case). Never assume a Law-specific test or interview measures substantive legal knowledge
— LNAT's own materials and NUS's described process both position their instruments as
reasoning/aptitude assessments, not law-content exams a 17-year-old could not reasonably be
expected to pass. Never assume Quebec's CEGEP-direct civil-law pathway is available to a
non-Quebec-schooled international applicant on the same terms as a Quebec-educated one —
directly confirmed against McGill's own eligibility rules, it is not; a foreign IB/A-Level
applicant still needs a minimum of 60 prior university credits. Never assume meeting a
country's Law admission bar at the point of entry guarantees continuation through to the
professional/qualifying stage where a post-entry progression gate independently exists —
Auckland's and Otago's Part-I/first-year-then-competitive-cut structures mean genuine
attrition or re-selection can occur after enrollment, not only at the admissions gate; a
"successfully admitted to Law at a New Zealand university" state is not equivalent to "on
an uninterrupted path to qualifying as a lawyer" the way it would be, say, for the
Netherlands' open Rechten programmes. Never assume the LSAT is relevant outside North
America, or that its absence elsewhere signals a *less* rigorous process — the UK's LNAT,
NUS's written test, and Hong Kong's interview requirement are each rigorous in their own,
structurally distinct way. Above all, **never treat "Law" as one global admissions
category for matching, scoring, or readiness-percentage purposes** — this pass alone
surfaced four qualitatively different mechanism shapes (graduate-entry professional
degree; standard-threshold undergraduate degree; standard-threshold-but-numerically-
brutal undergraduate degree; undergraduate degree with a bespoke bolt-on test, interview,
or progression gate) plus at least one genuinely internal country-level bifurcation
(Canada's common-law/civil-law split); ORYN's eligibility and readiness logic must branch
on which shape applies to a specific student's specific target *before* reasoning about
that student's actual profile.

## Institution-specific vs. programme-specific vs. country-wide patterns

**Country-wide (national/platform-level facts)**: the undergraduate-vs-graduate-entry
structural split itself, for the US (always graduate) and for the 12 countries where
undergraduate Law is the uniform national norm; Turkey's EA score-type routing for Hukuk
(uniform, ÖSYM-set, applies identically at every Turkish university offering the
programme); the UK's absence of any *national* Law-admissions-test mandate (LNAT is a
voluntary, university-layer consortium, not a UCAS or government rule, even though a
prominent cluster of institutions has adopted it); Canada's common-law-vs-Quebec-civil-law
split, which tracks provincial legal tradition rather than any individual university's own
choice.

**University-specific facts (same field, different institution, different outcome)**:
precisely which UK universities currently require the LNAT, and that this list itself
changes over time (Nottingham's 2023 drop, Cambridge's 2027-entry addition); whether a
given Dutch university currently runs Rechten as open or numerus-fixus-with-decentral-
selection (UvA/Leiden/Utrecht open, Maastricht selective, as researched this pass); a
German university's current local-NC cutoff (or admission-free status) for Jura, reset
independently each semester; and, most starkly, the University of Melbourne's unilateral
2008 elimination of undergraduate Law entirely, a decision no other Australian university
researched this pass has mirrored.

**Programme-specific facts (one Law programme's own rule, inside a university that may
treat other programmes differently)**: NUS Law's ranking-priority-choice-order rule and
its (secondary-sourced) written-test-plus-interview layer for shortlisted applicants,
sitting inside NUS's otherwise holistic-review default that most other NUS programmes
follow without this specific overlay; HKU's and CUHK's Law-specific interview requirement,
confirmed to reach even the JUPAS/local pathway that most other programmes at both
universities do not gate with an interview at all; Auckland's and Otago's Law-specific
post-first-year competitive-progression requirement, a mechanism most other Bachelor's
programmes at either university do not impose in the same form.

## Unresolved questions

The exact current-cycle (2026-27) admission mechanism at Maastricht's Rechtsgeleerdheid —
found only via a secondary source describing "100% decentral selection," not independently
confirmed against Maastricht's own current admissions page this pass. Whether any
Australian university besides the University of Melbourne has moved, or is actively
considering moving, toward a JD-only model — checked only across the Group of Eight this
pass, not exhaustively across all Australian law schools. The precise, current, primary-
sourced format of NUS Law's written-test-plus-interview stage for shortlisted top-5%-
cohort applicants — described only via secondary reporting this pass; direct fetches of
NUS's own domain returned empty content this session and should be retried. Whether SMU
Law or SUSS Law carry any interview or supplementary-test layer comparable to NUS's — not
found in sources reviewed, but not checked to the same depth as NUS. The admission
mechanism for Rechtswissenschaft/Droit at Swiss cantonal law faculties beyond UZH and HSG
(Geneva, Fribourg, Basel, Bern, Lausanne, Neuchâtel) — inferred by extension from the
country-level EMS-exclusion finding, not independently re-verified per law faculty this
pass. A specific, current-cycle, primary-sourced CAO points figure for Law at Trinity and
UCD, and confirmation of whether Ireland's non-EU/direct Law admission route (Trinity,
UCD) applies any Law-specific evidentiary requirement beyond that route's already-
documented general essay/reference/predicted-grade model. Whether Université de Montréal's,
Laval's, and Sherbrooke's civil-law LLB/LLL programmes share an identical CEGEP-direct-
entry-plus-60-credits-for-outsiders structure to McGill's BCL/JD, or each sets its own
variant — only McGill was independently verified in detail this pass. Which specific
Bachillerato subjects a representative sample of Spanish universities weight for Derecho
under the Real Decreto 534/2024 ponderación system. Whether HKUST offers any undergraduate
Law programme at all (no evidence of one was found in this pass or in this package's
existing `hong-kong.md` research) — a gap, not a confirmed absence. Whether Australian
graduate-entry Law programmes (Melbourne's JD, and others some universities offer as an
optional career-change route alongside their standard undergraduate LLB) commonly use
GAMSAT, an LSAT-equivalent, or another instrument — mentioned only in passing this pass,
not independently verified.
