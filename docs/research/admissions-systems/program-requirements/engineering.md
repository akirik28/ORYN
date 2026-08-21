# Engineering — cross-country program-level requirements

Part of ORYN's R3.1 country-level admissions research package, layered on top of (not a
replacement for) each country's own admissions-architecture document in
[`../`](../). See [`../README.md`](../README.md) for the full ruleset (RULE-ADMISSIONS-001
through 017) and package context. Machine-readable version of everything below:
[`../../../../data/research/admissions-systems/program-requirements/engineering.json`](../../../../data/research/admissions-systems/program-requirements/engineering.json).
This document does not re-derive each country's general admissions architecture — it asks a
narrower question on top of it: for Engineering *specifically*, what changes, and is the change a
genuinely different decision mechanism or just a higher bar within the mechanism that country
already uses?

## Overview

Engineering is this package's clearest **counter-example to Medicine**. Where the sibling
Medicine research found a genuinely different decision architecture in 13 of 15 countries,
Engineering inverts that ratio: across the same 15 countries, Engineering runs through a
**structurally different mechanism from that country's own general admissions model in only 5
of 15 cases** (United States, United Kingdom, Canada, France, Germany); it is **numerically
stricter only** — same mechanism, a higher bar — in **7 of 15** (Italy, Spain, Ireland, Australia,
New Zealand, Hong Kong, Turkey); and in **3 of 15** it is functionally **indistinguishable from
general admission** (Netherlands, Switzerland, Singapore), a category Medicine never landed in
anywhere in this package. Engineering is a large, well-funded, high-enrollment field almost
everywhere it is offered — it does not carry Medicine's clinical-capacity constraint, its
government-funded-training-place logic, or its licensure-body oversight, and that absence shows
up directly in how rarely countries bother building a dedicated Engineering-specific selection
apparatus.

Where Engineering **does** turn up structurally different, the additions cluster into two
distinct kinds, not one. The first is a **dedicated admissions-test layer** absent from general
admission: the UK's ESAT (Engineering and Science Admissions Test, the direct successor to the
discontinued ENGAA and PAT), required at Cambridge, Oxford, Imperial College London and UCL, and
Germany's TUM-confirmed **Eignungsfeststellungsverfahren** (a university-run aptitude-and-file
assessment built around a mandatory written statement of motivation, escalating to interview) —
though the German case is real but genuinely not universal, coexisting with plainly open
(zulassungsfrei) Engineering admission at other technical universities including, currently,
RWTH Aachen's own core Maschinenbau programme. The second is a **separate application/decision
layer organizationally distinct from the general admissions track at the same institution**:
the United States' recurring "school-within-university" pattern (a student applies to a named
College/School of Engineering directly, with its own essays and sometimes a binding major
choice, distinct from a general liberal-arts application at the identical university), Canada's
matching pattern at two of the three major universities checked (Waterloo's Admission
Information Form, University of Toronto's Online Student Profile plus written-and-video Personal
Profile Questions — neither required by that same university's general Arts & Science track),
and France's genuinely dual-pathway system, detailed below, which is the single sharpest finding
in this document.

A second, compounding observation: in the 3 countries where Engineering lands on
"same as general admission" (Netherlands, Switzerland, Singapore), this is not merely an absence
of evidence — it is a **confirmed, sourced absence**, checked directly against the same
country's own Medicine or Architecture-adjacent findings elsewhere in this package to make sure
the contrast is real and not just under-researched. Singapore is the sharpest instance: NUS's own
published admission-requirements table shows, field by field, that every one of its ten core
Engineering majors requires no test and no interview, while Architecture, Landscape Architecture
and Industrial Design — housed in the identical College of Design and Engineering — all require
one.

## Country-by-country findings

### France — structurally different: two genuinely distinct pathways to the identical credential

This is the sharpest finding in this document, and it is new territory: `france.md` in this
package's country-architecture layer never mentions Geipi Polytech, Puissance Alpha, or any of
the CPGE-to-engineering-school concours banks by name. Both verified pathways lead to the same
**Diplôme d'Ingénieur**, a title the **CTI (Commission des Titres d'Ingénieur)** accredits and
protects nationally — CTI treats degrees from both pathways as carrying identical formal value —
but the two routes to it are temporally, organizationally, and evidentially unrelated.

**Pathway 1 — CPGE → Grande École concours.** Entry into a 2-year classe préparatoire aux
grandes écoles (CPGE) is itself an ordinary Parcoursup "vœu," dossier-reviewed, not
capacity-limited the way PASS/LAS is (per the existing country doc). The actual competitive
event does not happen at that point at all: it happens roughly **two years later**, via a
**"concours"** — a written-then-oral competitive examination run entirely **outside Parcoursup**
by one of several inter-school exam-bank consortia, confirmed directly this pass: **X-ENS**
(École Polytechnique/ENS/ESPCI, common written papers 13–17 April 2026 for MP/MPI/PC/PSI
candidates), **Centrale-Supélec** (~3,577 places, written papers 4–7 May 2026),
**Mines-Ponts/Mines-Télécom** (1,569 places at the 10 Mines-Ponts schools plus 2,237 at
Mines-Télécom, written papers 27–30 April 2026), and **CCINP/e3a-Polytech** (~4,000 and 2,300+
places respectively, written papers 20–24 April 2026, with several papers mutualized between the
two banks since 2020). Results are released in the second half of July 2026. This is a real
selective ranking process with dedicated exam consortia and named seat counts, structurally
unrelated to Parcoursup's own routing logic for ordinary Licences.

**Pathway 2 — direct post-bac entry.** A parallel, continuous **5-year** engineering programme
exists that a student enters straight from Terminale, via Parcoursup, with the actual
selectivity executed **immediately** by a dedicated multi-school concours network's own jury —
not deferred two years, and not run by CPGE's exam banks. Confirmed directly from both networks'
own sites this pass: **Geipi Polytech** (35 public, CTI-accredited engineering schools; 2026
places: 3,997 for Bac-général candidates, 245 for Bac-technologique STI2D/STL candidates;
mechanism differs by track — Bac-général candidates sit a mandatory 3-hour written test
(Mathematics plus two chosen subjects from Mathematics/Physics-Chemistry/Digital
Science/Biology-Ecology), while Bac-technologique candidates instead undergo dossier review then
a motivation interview, with no written test at all) and **Puissance Alpha** (19 major
CTI-accredited engineering schools across 35+ campuses; dossier review followed by a written
exam, with top-ranked "Grands Classés" candidates potentially exempted from the written stage
based on the initial file review alone). Selecting either concours corresponds to a single
Parcoursup vœu regardless of how many member schools within it a candidate lists — Parcoursup is
the submission/response layer, but the deciding evaluation is the concours network's own jury,
which then feeds its ranking back into Parcoursup for the offer.

**The structural contrast, stated plainly**: a CPGE-track applicant's Engineering-specific
selectivity is deferred two years and happens entirely outside Parcoursup; a post-bac-track
applicant's Engineering-specific selectivity happens immediately and nominally inside Parcoursup,
decided by a jury outside any individual university's own admissions office. Treating "French
engineering admission" as one pathway — or assuming CPGE is the only route, or that Parcoursup
entry into a CPGE class is itself the competitive event — would misdirect a counselor advising a
student on either track. Whether an AP/IB/A-Level-holding, Turkey-resident applicant (DAP track)
can access either post-bac concours network was **not confirmed** this pass — both networks'
public materials describe French/European-Bac eligibility; DAP-track access was not found stated
either way, a genuine gap distinct from the general DAP-track findings already in `france.md`.

### United Kingdom — structurally different: a dedicated multi-university consortium test

General UK admission runs on predicted-then-confirmed grades against a UCAS conditional offer,
one shared personal statement, one shared reference, and rarely an interview outside Oxbridge.
Engineering adds a real instrument absent from that baseline. **ENGAA is confirmed discontinued**
(Cambridge Engineering moved away from it starting with 2024 entry) and has been replaced by the
**ESAT (Engineering and Science Admissions Test)** — confirmed directly, for the current
2026-27/2027-entry cycle, as **mandatory** at **Cambridge** ("you must register in advance for
this test"), **Oxford** Engineering Science (A\*A\*A with required A\*s in Mathematics/Physics/
Further Mathematics, plus ESAT "required for everyone hoping to study Engineering Science"),
**Imperial College London**, and **UCL** (for its BEng/MEng Electronic & Electrical Engineering
from September 2027 entry) — a genuine shared consortium instrument, not a single university's
bespoke test. Two sittings exist for 2027 entry (October 2026, January 2027); Oxford and
Cambridge applicants must use the October sitting specifically. **TMUA does not extend to
Engineering** — it remains scoped to Mathematics/Computer Science/Economics/Statistics-adjacent
courses at the universities that use it, a different instrument for a different subject cluster,
and the two must never be conflated for an Engineering applicant. Where interviews exist
(confirmed at Cambridge, and generally at Oxford for shortlisted candidates), they are
subject-focused and structured: Cambridge Engineering candidates commonly sit **two** interviews,
one on mathematics/mathematical modelling and one on applied physics/mechanics, each roughly
25–40 minutes, built around unseen problems worked through in real time rather than a discussion
of the personal statement — the same "academic conversation, not biography" format this package
has already found for Oxbridge generally, applied here to Engineering-specific content.

### Germany — structurally different, confirmed at specific technical universities, not universal

Engineering (Maschinenbau, Elektrotechnik, and related fields) is **not** one of hochschulstart's
four nationally-coordinated NC subjects (Medicine, Dentistry, Veterinary Medicine, Pharmacy) —
this rules out a national-quota-style structural difference outright. But a real,
university-level structural addition exists at some technical universities: confirmed directly
this pass, **TU Munich's Bachelor of Science in Mechanical Engineering (Maschinenwesen)** runs
through its own **Eignungsfeststellungsverfahren** (aptitude assessment procedure) rather than a
plain Abiturnote threshold — after a formally correct application, candidates undergo an
assessment built around a mandatory written statement (in German, up to two pages) giving
reasons for choosing the programme and TUM specifically, covering abilities, talents, interests,
and career ambitions, explicitly framed as the basis for a possible follow-up interview; the
process runs mid-July through September, well after the general 15 July Wintersemester
application deadline. The same instrument (Eignungsfeststellungsverfahren) also governs several
of TUM's other competitive Bachelor's programmes (Informatik, Wirtschaftsinformatik, Management &
Technology) — it is a TUM-level selection instrument applied to a cluster of competitive
programmes, not something invented for Engineering uniquely, but its presence is nonetheless a
genuine, confirmed departure from the "essays and interviews are not standard" pattern the
general Germany doc establishes.

This is **not universal**: **RWTH Aachen's own core Maschinenbau Bachelor's programme is
currently (Wintersemester 2026/27) zulassungsfrei** — open admission, no selection procedure at
all beyond eligibility — though it was zulassungsbeschränkt (restricted) as recently as
Wintersemester 2017/18, a real example of an individual programme moving between mechanisms over
time, not a static fact. RWTH does require a mandatory subject-specific "Selbsttest"
(self-assessment) for enrollment in some programmes, but this functions as a mandatory,
non-selective, informational completion requirement, not a competitive filter. **Never assume one
German technical university's Engineering admission mechanism generalizes to another** — the
correct unit of description here is the individual university and programme, exactly as
RULE-ADMISSIONS-002 already establishes for this package generally.

### United States — structurally different: the "school-within-university" admissions layer

There is no single "US Engineering admissions mechanism" the way there might be for a
country with a national credential body — the structural fact is narrower and more concrete:
at a recurring set of major universities, applying to Engineering means applying to a **named
College/School of Engineering directly**, with its own supplemental essays and sometimes a
binding major choice, distinct from that same university's general liberal-arts admissions
track. Confirmed directly this pass at three universities, on two different application
platforms: **Cornell** (via Common App — an applicant selects one Cornell college and answers
only that college's prompts; the College of Engineering requires six essays specifically,
including "Why do you want to study engineering?" up to 200 words, plus four shorter responses
on activities, awards, and intended contribution to the Engineering community); **UC Berkeley**
(via the UC's own separate application, not Common App — admission is directly by college and
major, at least one of the four required UC essays must address "Why Engineering," the major
choice is binding at admission, and internal transfer from Letters & Science into Engineering
after enrollment is confirmed difficult, contingent on prerequisite-course performance and space,
while the reverse transfer is not); and **University of Michigan** (via Common App — Michigan
Engineering is one of seven separate freshman-admitting schools/colleges at the university, each
requiring its own 100–550-word supplemental essay on why that specific college fits the
applicant). This pattern is continuous with, not separate from, the country doc's own existing
finding that NYU Stern, Michigan Ross, and Cornell's Dyson (business) are similarly named
direct-admit schools — Engineering is simply one of the recurring fields where this layer
appears, confirmed at additional universities this pass. Where it applies, it functions as a
genuinely different evidentiary event from a general/undecided application at the identical
university, not a harder version of the same one.

### Canada — structurally different at two of three major universities checked, university-specific

Confirmed directly this pass, resolving the specific Waterloo lead: the **Admission Information
Form (AIF)** is **not** an Engineering-exclusive instrument — it is mandatory at Waterloo for all
Engineering programmes (excluding Architecture), all Faculty of Mathematics programmes, and
Computing and Financial Management, but explicitly **not** required for Waterloo's Arts,
Environment, Health, or Science admissions. Within that scope it is real and substantive: five
short-answer questions (a passion/strong interest and how it's been pursued; community
involvement including any leadership role; a prompt asking the applicant to reflect on
experiencing or witnessing unfair treatment; the applicant's primary goal for attending Waterloo;
and outside-of-studies activities logged with hours, in a chart format), each capped at 150 words
except the activities chart. **This confirms the lead's second question directly**: the pattern
recurs at another major Canadian engineering programme, via a different mechanism. **University
of Toronto Engineering** requires its own **Online Student Profile (OSP)** plus **written and
timed-video** Personal Profile Questions — a structural layer U of T's own general Arts &
Science admission does not have at all (transcript-only, no required essay, per the existing
country doc). **UBC Engineering**, by contrast, uses the same university-wide mandatory Personal
Profile that applies to nearly every UBC programme, not an Engineering-exclusive instrument, atop
its own Grade-12 Math/Physics/Chemistry subject prerequisites — the extra-evidence layer exists
at UBC too, but it is not what makes Engineering distinctive there. Net finding: at 2 of the 3
major Canadian universities checked in depth, Engineering specifically triggers a supplementary
evidence stack the same university's general/default admissions track does not require; at the
third, the extra layer is university-wide rather than Engineering-triggered. This is consistent
with, and sharpens, RULE-ADMISSIONS-008's existing finding that Canadian admissions practice is
genuinely university-dependent rather than nationally uniform.

### Netherlands — same as general admission, with a confirmed programme-level exception

Most Dutch Engineering Bachelor's programmes are **not** numerus fixus: a Natuur & Techniek
(N&T) VWO profiel (or the equivalent foreign-curriculum subject mapping) plus subject
prerequisites establishes eligibility, with no ranking — identical in kind to the general
threshold-based Dutch model this package has already documented, not something Engineering does
differently. The exception is real and confirmed at the programme level, not the field level:
**TU Delft's Computer Science & Engineering (CSE)** is numerus fixus and uses a mandatory
**Mathematics + Systematic Reasoning test** to stratify applicants into ranked bands before a
hybrid lottery-within-band draw; **TU Delft's Aerospace Engineering** is separately numerus
fixus (440 places confirmed for 2026-27) with its own decentralized selection procedure; by
contrast, **TU Delft's own Werktuigbouwkunde (Mechanical Engineering)** was confirmed this pass
as carrying **no** numerus fixus. This is the Netherlands' own general numerus-fixus/open
bifurcation (already documented in the country doc for Medicine, Psychology, and others) showing
up in specific popular Engineering programmes — Engineering as a field is not doing anything the
Dutch system doesn't already do elsewhere; it simply has instances landing in each of the two
existing buckets. Never describe "Dutch Engineering admission" as uniformly open or uniformly
numerus fixus — the correct unit is the individual programme.

### Switzerland — same as general admission, confirmed at ETH Zurich

Confirmed directly this pass: **ETH Zurich's Bachelor's programmes in Engineering (illustrated
via Mechanical Engineering)** use the **same general ETH-wide foreign-qualification framework**
already documented in the country doc for Architecture and for foreign qualifications generally
— a Swiss Matura or an automatically-recognized foreign diploma meeting the direct-admission bar
(commonly cited thresholds: IB 38+, Abitur/Bac ~70%+ / 16/20-equivalent) admits on a threshold
basis, exam-free; a diploma falling short of that bar instead requires ETH's own **Comprehensive
or Reduced Entrance Examination** (mathematics, physics, chemistry, biology). This is the general
ETH mechanism for *any* field where the applicant's diploma isn't automatically recognized — not
a dedicated Engineering instrument, and categorically different from the EMS aptitude test used
for Medicine/Dentistry/Veterinary Medicine/Chiropractic at most of the same institutions. No
EMS-equivalent, Engineering-specific test or interview was found for ETH Zurich or, by structural
analogy already established in the country doc, for EPFL's own single-tier entrance examination
route.

### Singapore — same as general admission, confirmed field-by-field via NUS's own published table

Confirmed directly this pass from NUS College of Design and Engineering's own official
admission-requirements table: of the **ten core Engineering majors** listed (Biomedical, Chemical,
Civil, Computer, Electrical, Engineering Science, Environmental, Industrial & Systems,
Infrastructure & Project Management, Materials Science, and Mechanical Engineering), **every
single one shows "Test or Interview: No."** Admission runs purely on the subject-prerequisite
gate (H2 Mathematics or Further Mathematics, plus for some majors one of H2 Physics/Chemistry/
Computing, or the IB/NUS High/polytechnic-diploma equivalent) feeding into NUS's ordinary
open-competition academic review — the same default mechanism the country doc already documents
for NUS generally, not something Engineering adds to. The contrast sits in the **same published
table**: **Architecture** and **Landscape Architecture** both show "Test or Interview: Yes,"
as does **Industrial Design** — three majors housed in the identical College of Design and
Engineering. NUS's own elite sub-tracks (**Engineering Scholars**, the **Engineering and
Medicine Track**) also show "Yes," confirming that where an interview does appear inside
Engineering at NUS, it is scoped to a specific honours sub-programme, not the ordinary major.
The same "ordinary major has no interview; an elite honours sub-track does" pattern recurs at
**NTU**: its **Renaissance Engineering Programme**, a premier scholar track, has used a Multiple
Mini Interview format since 2016, while ordinary NTU College of Engineering admission carries no
confirmed general interview requirement. **HKUST's** School of Engineering (Hong Kong, included
here for the direct parallel) states explicitly that "interview is not a requirement for the
School of Engineering," confirming the same pattern in a third system. This is a clean,
sharply-evidenced contrast with this package's own Singapore Medicine/Dentistry/Law/Architecture
findings, which do add ranking-position gates and mandatory tests. NTU's and SMU's ordinary
(non-honours) Engineering admission mechanisms were not independently verified to NUS's depth
this pass — treat as a probable but not fully confirmed extension.

### Italy — numerically stricter only

Engineering is not one of Italy's three nationally-restricted numero-chiuso fields (Medicine,
Dentistry, Veterinary Medicine, Italian-taught). It runs through the same **TOLC/TOL** instrument
family used broadly across many other Italian fields (Economics, Psychology, Communication,
Architecture, and others) — confirmed directly this pass at **Politecnico di Milano** for
2026/27: an online entrance test (TOL, or a recognized alternative — TOLC-I, CEnT-S, or SAT),
minimum threshold ≥30/100, with candidates ranked (graduatoria) for the capped places, and OFA
(the remedial catch-up module) removed for all subjects except English from 2024 onward. This is
the identical instrument and identical binding/non-binding toggle the country doc already
documents generally — Engineering becomes "restricted" purely through local, university-set
capacity limits at competitive institutions (Politecnico di Milano and Torino among the clearest
examples), the same local numero-chiuso mechanism popular Economics or Psychology programmes use,
not a dedicated Engineering process.

### Spain — numerically stricter only

Engineering runs through the identical **nota de admisión / EBAU / Distrito Único** mechanism as
any other Spanish public Grado. The only Engineering-relevant lever is Real Decreto 534/2024's
subject-weighting bonus — typically Mathematics II and Physics weighted at 0.2 each for
quantitative degrees, applied automatically from the student's best-scoring eligible subjects —
a scoring bonus, not a hard gate or separate instrument, identical in kind to the mechanism used
for Medicine or any other public degree. No SAT/ACT/AP role, no dedicated test, and no confirmed
interview or portfolio for public-university Engineering. Private-university Engineering may run
its own separate process entirely outside nota de corte/Distrito Único, but — exactly as this
package's Medicine research already concluded for Spain's private-Medicine sector — that reflects
Spain's general public/private admissions split, not something specific to Engineering.

### Ireland — numerically stricter only

Engineering is **not** one of CAO's "restricted-application course" categories (unlike Medicine,
Nursing, or Art & Design) — it runs through the ordinary Leaving Certificate points system.
The national Higher Level Mathematics +25-point bonus applies (not Engineering-exclusive — it
applies to any applicant with HL Maths among their best six subjects), and individual programmes
set their own point/subject minimums: UCD's own non-EU table, cited directly in the country doc,
shows "B3 3rd level" for Engineering against "C2 3rd level / 4.5 Lise" for Business/Computer
Science and "D1 3rd level / 2 Lise" for Economics/Social Science for the identical Turkish
diploma — real institution-level variation in bar height, using the identical points mechanism
throughout. No HPAT-style dedicated aptitude test, no mandatory interview, and no portfolio
requirement for standard Engineering admission.

### Australia — numerically stricter only

Engineering carries none of Medicine's specific structural additions: no Commonwealth Supported
Place government place-count exception (CSP funding for Engineering, as for most Australian
fields, is allocated to universities in dollars, not a fixed number of places), no UCAT ANZ/ISAT
requirement, and no mandatory interview. It runs through the same floating ATAR/selection-rank
mechanism used for most Australian programmes. Mathematics (and at some universities Physics) is
commonly a hard "prerequisite" — the country doc's documented, named distinction from softer
"assumed knowledge" — for Engineering at several universities, but this prerequisite/
assumed-knowledge toggle is a general Australian mechanism applied to any mathematics-dependent
degree, not something unique to Engineering.

### New Zealand — numerically stricter only

Auckland's BE(Hons) Rank Score threshold (250) is the **highest published figure in Auckland's
own comparison table** — above Nursing's 230 — but it is the same graduated, continuous,
NCEA-credit-based Rank Score mechanism used across most named NZ Bachelor's programmes, not a
separate instrument. No confirmed dedicated test, interview, or hard numerical place-cap was
found for Engineering this pass, unlike Medicine's confirmed two-stage gateway-then-UCAT-
ANZ-plus-MMI model at the same universities. Engineering is "restricted" here purely in the sense
that its Rank Score bar sits at the top of the published table, the numerically-stricter pattern.

### Hong Kong — numerically stricter only

For local/JUPAS applicants, Engineering is placed by the identical merit-order matching algorithm
used for every other JUPAS programme, with Mathematics at Advanced Level commonly required
(confirmed for HKUST's STEM-track admission in the country doc). For non-JUPAS/international
applicants — the pathway essentially all Turkish and other internationally-educated applicants
use, per RULE-ADMISSIONS-013 — confirmed directly this pass from **HKUST's** own School of
Engineering FAQ: **"Interview is not a requirement for the School of Engineering... conducted at
the discretion of individual programmes"** if the university finds it helpful for a specific
applicant. This is qualification/transcript review against a published minimum, the same general
non-JUPAS mechanism used for most other non-JUPAS fields, and a sharp contrast with this
package's own confirmed finding that HKU and CUHK Medicine require a mandatory MMI or panel
interview for the identical (non-JUPAS) applicant population.

### Turkey — numerically stricter only, confirmed

Engineering is placed entirely by YKS's **SAY** score type — the identical (TYT × 0.40) +
(AYT × 0.60) + (OBP × 0.12 or 0.06) formula and strict national rank-order placement used for
every other SAY-track programme, with no interview, test, or portfolio beyond YKS itself,
exactly as the country doc's own explicit statement already establishes ("Medicine, Law,
top Engineering programmes remain pure score-ranked placement with no interview or portfolio
step at all"). Top programmes require close to the maximum attainable score: illustrative,
cycle-specific 2026 figures found this pass put both **Boğaziçi University's** and **İstanbul
Technical University's (İTÜ)** Computer Engineering programmes at roughly 533 points (Boğaziçi
ranked around 1,448th nationally that cycle) — an extreme cutoff within the same formula, not a
different mechanism. Treat these specific figures as illustrative and cycle-specific only, to be
re-verified each admissions cycle, consistent with how this package treats every other
cycle-specific cutoff figure.

## What determines eligibility

Where Engineering is numerically-stricter-only or same-as-general (the 10 of 15 countries in
those categories), eligibility is the same fact that determines eligibility for any other
programme in that country — the underlying secondary qualification meeting the general
higher-education bar, plus a mathematics-heavy subject-prerequisite check that is common but not
Engineering-exclusive (found equally for many quantitative fields: Economics, Computer Science,
Physics). Where Engineering is structurally different, eligibility stacks in a way ordinary
programmes in that country do not require: a qualifying ESAT score sat months before the general
UK deadline; a completed, formally correct TUM application entering its own July–September
Eignungsfeststellungsverfahren window; a passed CPGE-to-Grande-École concours roughly two years
after initial enrollment, or a passed Geipi Polytech/Puissance Alpha written-exam-and-dossier
process at the point of first application, in France; a separate school-specific supplemental
application (with its own deadline structure layered onto, not replacing, the general
institutional one) at the US and Canadian universities documented above.

## What genuinely strengthens an application

Where a dedicated test exists (UK's ESAT), preparation for and performance on that specific
instrument is the highest-leverage lever, mirroring this package's Medicine/UCAT finding but for
a different subject-matter test. Where a written-statement-based selection procedure exists
(Germany's TUM Eignungsfeststellungsverfahren), a substantive, specific statement of motivation
matters as its own gate — generic enthusiasm is unlikely to satisfy a process explicitly built to
distinguish applicants by more than grades alone. Where a school-within-university layer exists
(US, Canada), a focused, Engineering-specific essay response — genuine reasons for choosing
Engineering, concrete evidence of preparation or relevant experience, a clear sense of intended
contribution — is a distinct, separately-evaluated lever from the general application's own
essay/profile content, not a duplicate of it; Waterloo's AIF explicitly rewards breadth (the
admissions committee is "not only looking for engineering-related extracurriculars," per its own
guidance) as much as depth. Where Engineering runs through the same mechanism as general
admission (the Netherlands' open programmes, Switzerland, Singapore, Turkey, Spain, Ireland,
Australia, New Zealand, Italy, most of Hong Kong), the levers are the same as for any other
programme in that country — a strong mathematics/physics academic record and, where a subject
bonus exists (Spain's weighted subjects, Ireland's HL Maths bonus), the specific subjects that
bonus rewards.

## What is largely irrelevant

General extracurricular breadth unconnected to mathematics/science/technical depth is not a
meaningful Engineering-specific lever anywhere this pass found evidence either way — even in the
structurally-different countries, what the added instrument evaluates is either subject-specific
aptitude (ESAT: mathematics, physics, chemistry, biology) or a targeted statement of motivation
for that specific field, not breadth. Personal statements/essays and recommendation letters are
absent as Engineering-specific levers everywhere the general country pattern already says they
are absent (Netherlands' open programmes, Germany outside the Eignungsfeststellungsverfahren
universities, Italy, Spain, Turkey's domestic pathway, Ireland's CAO route) — Engineering does
not reopen a channel the country doesn't otherwise have. Where a country's Engineering mechanism
is confirmed same-as-general (Singapore, Switzerland, most of the Netherlands), broader
non-academic achievement lists that matter for that same country's Medicine or Architecture
findings (Singapore's structured achievements list, for instance, still applies as part of NUS's
general holistic review, but does not unlock a test/interview stage the way it does for
Architecture) carry no Engineering-specific weight beyond their ordinary role in general review.

## What ORYN must never infer

Never present France's post-bac direct-entry engineering-school pathway (Geipi Polytech,
Puissance Alpha) and the CPGE→Grande École concours pathway as the same thing, or as one being a
"lesser" or "backup" version of the other — they are organizationally and temporally distinct
routes to an identically-accredited CTI credential, and a counselor defaulting to "prépa is the
real path, post-bac schools are the fallback" would misrepresent both. Never assume the UK's
ESAT is interchangeable with, or a variant of, TMUA — they serve different subject clusters and
a student preparing the wrong one loses real time. Never assume ENGAA is still current; it is
discontinued. Never assume a German technical university's Engineering admission mechanism
(TUM's Eignungsfeststellungsverfahren vs. RWTH Aachen's zulassungsfrei Maschinenbau)
generalizes to another university, or is stable over time at the same university — RWTH's own
Maschinenbau moved from restricted to open within the last decade. Never assume a Canadian
university's supplementary-application practice for Engineering (Waterloo's AIF, U of T's
OSP-plus-video) generalizes to another Canadian university, or to a different faculty at the
same one (Waterloo's own AIF explicitly excludes Arts/Environment/Health/Science). Never assume
that because a country's Medicine or Architecture admission is structurally different,
its Engineering admission must be too — Switzerland, the Netherlands, and Singapore are direct,
sourced counter-examples within this same package. Never assume a Turkish or other
foundation-university engineering cutoff figure is stable across cycles — Turkey's YKS cutoffs
and Germany's NC figures are explicitly cycle-specific and must be re-verified each admissions
cycle, consistent with RULE-ADMISSIONS-007's general warning about deadline/cutoff currency.

## Institution-specific vs. programme-specific vs. country-wide patterns

**Country-wide, uniform**: Turkey's YKS-SAY-only mechanism for domestic Engineering placement;
the structural fact (not the specific cutoff) that Spain's Engineering runs the identical
nota de admisión/Distrito Único formula as any public Grado; Ireland's absence of a CAO
"restricted-application" designation for Engineering; Singapore's system-wide MOE international-
undergraduate proportion ceiling (already documented generally in this package) applying to
Engineering exactly as it applies to every other field, independent of Engineering's own
programme-level "no test/interview" finding.

**Programme/track-specific within one country**: France's CPGE-vs-post-bac dual pathway (and,
within post-bac, the Geipi-Polytech-vs-Puissance-Alpha-vs-other-networks split, and within
Geipi Polytech itself, the Bac-général-written-test-vs-Bac-technologique-interview-only split);
Italy's binding-vs-non-binding TOLC toggle depending on whether a specific university's
Engineering programme is locally capped; the Netherlands' TU Delft CSE/Aerospace-numerus-fixus-
vs-Werktuigbouwkunde-open split within a single university's own Engineering offerings;
Singapore's ordinary-major-vs-honours-sub-track interview split, confirmed independently at both
NUS and NTU.

**Genuinely institution-specific, varying even within one field in one country**: Germany's
TUM-Eignungsfeststellungsverfahren-vs-RWTH-Aachen-zulassungsfrei split for the same nominal
field (Maschinenbau/Maschinenwesen) in the same country, the sharpest single-field institutional
split found in this document; the United States' school-within-university layer, which varies
not just by whether it exists but by its exact shape (Cornell's six-essay set; Berkeley's binding
UC-application major choice; Michigan's one-of-seven-colleges supplemental essay); Canada's
AIF-at-Waterloo-vs-OSP-and-video-at-U-of-T-vs-university-wide-Personal-Profile-at-UBC three-way
split for the identical field.

The practical implication for ORYN: an "Engineering requirement" data model needs, at minimum,
a country-level mechanism-type field that defaults toward "same as general admission" far more
often than Medicine's equivalent model would, a programme-level override for the France-style
dual-pathway case (which cannot be represented as a single mechanism per country at all), and an
institution-level override capturing whether a specific university adds its own test, essay, or
selection procedure beyond the country's baseline — collapsing the institution level away would
misrepresent Germany, the US, and Canada specifically.

## Unresolved questions

France: whether a DAP-track (foreign-diploma, non-French/European-Bac) applicant — the pathway a
Turkey-resident MEB-only applicant would generally use per the existing country doc — can access
either Geipi Polytech or Puissance Alpha at all was not confirmed either way this pass; both
networks' public materials describe French/European-Bac eligibility without an explicit
DAP-track statement. Exact mechanics of the reportedly-planned 2027 PASS/LAS-adjacent reforms
were already flagged as unconfirmed in the sibling Medicine document and were not re-examined
here since they do not appear to touch Engineering's own two pathways. Germany: whether TUM's
Eignungsfeststellungsverfahren pattern generalizes to other German technical universities beyond
TUM and (in its absence) RWTH Aachen was not exhaustively checked — a genuine gap, not a
confirmed two-university-only finding; and whether RWTH Aachen's other engineering fields
(Elektrotechnik, Bauingenieurwesen) share Maschinenbau's currently-zulassungsfrei status was not
independently verified. United States: the school-within-university pattern was confirmed at
three universities on two platforms; its prevalence across the "roughly half of top-100
universities" figure the country doc already cites for capacity-constrained CS/engineering
majors was not re-derived or exhaustively mapped this pass. Canada: whether any other major
Canadian university beyond Waterloo, University of Toronto, and UBC uses an Engineering-specific
supplementary-application layer was not checked. Singapore: NTU's and SMU's ordinary
(non-honours) Engineering admission mechanisms were confirmed only at the level of "no general
interview found," not researched to NUS's field-by-field table depth; SMU's Engineering-adjacent
programmes (e.g. Computing) were not separately checked at all this pass. Switzerland: whether
EPFL's own single-tier entrance examination for Engineering differs in any Engineering-specific
way from its treatment of other fields was not independently re-verified this pass, beyond the
general finding already in the country doc that EPFL's mechanism is field-agnostic. Turkey: the
illustrative 533-point cutoff figures for Boğaziçi/İTÜ Computer Engineering came from secondary
aggregator sources (kariyer.net, coderspace.io), not ÖSYM's own primary results publication, and
should be re-verified against a primary source before being presented to a student as
authoritative.
