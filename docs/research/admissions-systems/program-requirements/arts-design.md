# Arts / Design — cross-country program-level requirements

Program-family research layered on top of ORYN's R3.1 country-level admissions-architecture
package (`../README.md` and each country's own `.md` file — see those for how each country's
*general* admissions system works; this document does not re-derive that). This document
asks a narrower question for **Arts/Design** specifically (visual arts, design,
music/conservatoire, performing arts): what is actually required, and — the point of this
research pass — where does the requirement mechanism *structurally diverge* from the
country's general admissions model, versus merely raising the bar within it. Machine-readable
version: [`data/research/admissions-systems/program-requirements/arts-design.json`](../../../../data/research/admissions-systems/program-requirements/arts-design.json).

Countries covered: the same 15 as the base package — United States, United Kingdom,
Netherlands, Italy, Germany, Canada, Switzerland, France, Spain, Ireland, Australia, New
Zealand, Hong Kong, Singapore, Turkey. Source standard matches the base package: official
institution/government pages first, secondary sources for discovery/corroboration only, every
claim sourced, time-sensitive facts flagged with the cycle they apply to.

## Overview

Arts/Design is the one program family across this whole 15-country package where a
non-academic gate — a portfolio, an audition, a talent/aptitude exam — is plausibly the
**primary** selection mechanism rather than a secondary factor layered on top of grades. That
turns out to be true, but unevenly, and the shape of "true" varies along a different axis
than country: mostly, it varies by which **institutional/qualification system** the specific
programme sits inside, not by which country the student is applying to.

Three genuinely distinct mechanism shapes recur throughout this research pass:

1. **Replaces** — the portfolio/audition/aptitude exam *is* the primary or dominant selection
   mechanism, and the underlying academic-qualification requirement is reduced to a soft or
   nominal floor, or in the sharpest cases can be waived outright for a sufficiently strong
   artistic result. Confirmed clearest at Germany's Kunsthochschulen/Musikhochschulen (a
   strong aptitude-exam result can literally substitute for the Abitur itself — the single
   sharpest "hard gate overrides the normal academic-score mechanism entirely" finding in this
   whole pass), and also confirmed at the Netherlands' HBO kunstvakonderwijs institutions
   (Rietveld Academie, conservatoria), Italy's AFAM sector, France's Beaux-Arts de Paris and
   Conservatoire de Paris, Spain's separate Enseñanzas Artísticas Superiores system, the UK's
   Conservatoires-scheme institutions, the US's dedicated conservatories (Juilliard), Canada's
   OCAD University, Australia's NIDA and VCA, and — precisely, per NCAD's own official
   admissions page — Ireland's own CAO-"Restricted" studio programmes at NCAD, which do not
   operate the Leaving Certificate/CAO points scheme at all for portfolio-required courses,
   making offers purely on portfolio score once a minimum academic floor is met (see the
   Ireland finding below; this corrects a too-broad "combined with, not replacing" reading of
   the base Ireland country doc for this specific institution).
2. **Adds a hard gate, does not replace** — the portfolio/audition is a real, separately
   assessed, sometimes-disqualifying requirement, but it sits *alongside* the country's normal
   score/points/ranking mechanism, which still fully applies; both must be cleared, neither
   alone suffices. Confirmed at New Zealand (Auckland's creative programmes), Hong Kong
   (HKAPA), parts of Singapore's Autonomous-University sector, and — narrowly — at two named
   *non-restricted* NCAD programmes in Ireland (Product Design, Interaction Design), where an
   optional portfolio adds up to 200 bonus points on top of, not instead of, ordinary CAO
   points.
3. **Same as general admission** — no portfolio, audition, or aptitude test at all; the
   discipline is evaluated by the identical mechanism as any other degree. Confirmed for
   Spain's Bellas Artes (Fine Arts) as an ordinary Grado at public universities, and for
   Architecture at ordinary Italian universities (TOLC-based, not AFAM).

**The single most important structural finding of this pass**: shape 1 vs. shape 3 within
Arts/Design does not track country — it tracks whether the specific programme sits inside the
country's ordinary university/degree system or inside a **parallel, separately governed
arts-education sector** with its own qualification track. Four independent countries in this
package show the identical shape (Germany's Kunsthochschule/Musikhochschule vs. Universität;
Italy's AFAM vs. MUR-university; France's Beaux-Arts/Conservatoire-national vs.
Parcoursup-Licence; Spain's Enseñanzas Artísticas Superiores vs. university Grado — Netherlands
shows a milder version of the same shape, WO vs. HBO kunstvakonderwijs). Turkey is the sharp
exception that proves the rule: its conservatory/fine-arts exception sits *inside* the same
unified YKS placement system as everything else, rather than in a separate parallel sector — a
genuinely different shape, not a variant of the other four. See "Institution-specific vs.
programme-specific vs. country-wide patterns" below for the full argument.

## Country-by-country findings

### United States

**Structurally different — institution-type-dependent.** The base country doc's holistic-review
framing already lists portfolios/auditions as one factor among several at ordinary
comprehensive universities — accurate for that population, and not revised here. Dedicated
single-discipline institutions are a different case entirely, not a stricter version of the
same case. **Juilliard**: SAT/ACT are not required for US or international applicants, and "in
most cases" no specific courses, GPA, standardized test scores, or class rank are required at
all — only completed secondary education (diploma or GED) and the audition itself
(discipline-specific: repertoire performance for Music, monologues/exercises for Drama). This
is close to a pure audition-only mechanism, a genuine, named override of the US's own
holistic-multi-factor framing for this institutional category. **RISD** sits in between: still
Common-App-routed, still requiring transcript and recommendation letters, but the portfolio
(12–20 work samples via SlideRoom, submitted alongside a $10 separate portfolio fee) functions
as the decisive discriminator layered onto — not replacing — the normal application file.

**Sources**: https://www.juilliard.edu/arm/music/college/piano/bachelor-music ;
https://www.collegevine.com/faq/47903/juilliard-admission-requirements ;
https://www.risd.edu/admissions/first-year/apply-risd ;
https://admissions.risd.edu/risd_app_tips_2025.pdf

### United Kingdom

**Structurally different.** UAL/Conservatoires-scheme institutions sit outside the ordinary
UCAS-Tariff-offer mechanic. **Central Saint Martins (UAL) BA Fine Art**: entry requires a
Level-3 qualification (Foundation Diploma in Art & Design, BTEC Extended Diploma at
Merit-Pass-Pass, or equivalent — A-levels/IB *alone* are explicitly not accepted without also
holding a Foundation Diploma or equivalent one-year art/design course) plus three GCSEs at
grade 4+, and states explicitly that "entry to this course will also be determined by
assessment of your portfolio" — both required, with a named exception pathway for applicants
who don't meet standard entry requirements but show strong portfolio/experience. **Royal
College of Music** (a UCAS Conservatoires-scheme institution — a genuinely separate
application service from mainstream UCAS Undergraduate, letting one application reach up to
six conservatoires while auditioning individually at each) sets an academic floor of just two
A-levels at grade E or above — the lowest passing UK grade — while stating outright that "the
main basis for admission... is your performance at audition." This is a sharper replace-shape
than UAL's: the academic bar is nominal, not competitive. **Royal College of Art** has
historically been graduate-only (no undergraduate provision at all) — the brief's "RCA if
undergraduate" lead resolves to *not applicable, historically*; this is changing, with RCA
jointly awarding undergraduate degrees with Norwich University of the Arts from September
2027 — a forward-looking fact, not yet operative.

**Sources**: https://www.arts.ac.uk/subjects/fine-art/undergraduate/ba-hons-fine-art-csm ;
https://www.rcm.ac.uk/apply/ ; https://www.ucas.com/conservatoires ;
https://conservatoiresuk.ac.uk/conservatoires-explained/admissions-process/ ;
https://www.rca.ac.uk/study/undergraduate-study/ ;
https://www.study.eu/article/how-to-get-into-the-royal-college-of-art-steps-tips

### Netherlands

**Structurally different — replaces, and this precisely confirms and corrects the brief's own
framing.** Nearly all Dutch Bachelor's-level art/design/conservatoire education (Gerrit
Rietveld Academie; Royal Conservatoire The Hague/KABK) sits in the **HBO** (kunstvakonderwijs
/ "hogeschool voor de kunsten") tier, not the WO (research-university) tier the base country
doc's VWO-equivalence baseline describes — so the precise finding is *not* that
VWO-equivalence is "waived" for a WO institution, but that arts education is structurally an
HBO-tier discipline to begin with, carrying that tier's own lower floor. Rietveld's own
admissions page confirms exactly this: the stated minimum is "EQF level 4 or higher
(equivalent to Dutch Havo or Mbo4)" — below VWO — with the deciding factor for the first
admission round being "a wide variety of visual work, as diverse as possible." **The real
structural break is not the lower floor itself** (ordinary HBO programmes also use a
Havo-equivalent floor) **but that, unlike ordinary HBO admission** (where meeting the
Havo-equivalent threshold functions the way VWO does for WO — eligible effectively equals
admitted) **arts-education admission stays competitive and portfolio/audition-driven above
that floor** — breaking the Dutch "eligible = admitted" pattern the same way numerus fixus
does elsewhere, just via a different selection tool (portfolio/audition, not the 2023 law's
lottery/qualitative-criteria menu). Royal Conservatoire The Hague confirms the audition is the
operative mechanism directly: a two-part (theoretical + practical) entrance exam, with
programme-specific requirements (e.g. Bachelor Vocal Studies: a 20-minute, ≥2-language
video/live audition programme, a separate poem recording, and a pass/fail online theory test),
assessed by a jury on "current vocal level... musical abilities and expressiveness" — not a
grades-based ranking.

**Sources**: https://rietveldacademie.nl/en/page/24307/admissions ;
https://rietveldacademie.nl/en/page/516/admissions-dutch-students ;
https://www.koncon.nl/en/programmes/bachelor/vocal/bachelor-vocalclassical/apply ;
https://www.koncon.nl/en/programmes/bachelor/vocal/bachelor-vocalclassical/entry-requirements

### Italy

**Structurally different — replaces, confirmed.** AFAM (Alta Formazione Artistica, Musicale e
Coreutica — Accademie di Belle Arti, Conservatori di Musica, related dance/performing-arts
academies) is a parallel higher-education sector, governed separately from the ordinary
MUR-university system the base Italy doc's TOLC/CEnT-S/IMAT/semestre-filtro findings describe.
AFAM admission requires a secondary diploma (or foreign-equivalent with an Italian embassy
declaration of value) as a floor, **plus a test di ammissione**, which is the operative
selection mechanism — with a named, narrower carve-out than Germany's: holders of specific
arts-track diplomas (Artistic Maturity/Liceo Artistico, Applied Arts diploma, Art Institute
License, Experimental Artistic High School) are exempt from the admission *interview*
specifically, not the whole process. **Worth flagging explicitly as a negative finding**:
Architecture — sometimes casually grouped with "creative" fields — is *not* part of AFAM; it
remains a TOLC-based, numero-chiuso University-sector programme like Engineering, with no
portfolio step confirmed in this or the base country-doc research pass.

**Sources**: https://open.accademiavenezia.it/ammissioni/ ;
https://www.accademia.firenze.it/it/albo/71-11-archivio-comunicazioni-studenti/requisiti-iscrizione ;
https://www.accademiabelleartiba.it/bacheca/182-iscrizioni/4614-test-di-ammissione-e-immatricolazioni-a-a-2025-2026.html

### Germany

**Structurally different — replaces; the sharpest, most unambiguous finding of this entire
research pass.** Kunsthochschulen (art academies) and Musikhochschulen (music academies) are
their own Hochschulart, institutionally and legally separate from the Land's ordinary
Universität sector the base country doc's NC/Abitur/Anabin framework describes. Muthesius
Kunsthochschule's own admissions guidance states directly: *"Bewerber\*innen ohne allgemeine
Hochschulreife (Abitur) können an der Muthesius Kunsthochschule studieren, wenn sie die
künstlerische Eignungsprüfung mit einer Note besser als 2,0 bestehen"* — applicants **without**
the Abitur can study there if they pass the artistic aptitude exam with a grade better than
2.0. This is not a supplementary pathway or partial credit — it is the **sole qualifying
pathway for non-Abitur applicants**: a sufficiently strong Eignungsprüfung result substitutes
for the general university-entrance qualification entirely, for this institutional category.
Even for applicants who *do* hold the Abitur, the Mappe (portfolio, typically ~15–30 work
samples) plus the Eignungsprüfung (portfolio review + practical tasks + colloquium) is the
dominant selection mechanism — Abitur grade is not used competitively here the way it is for
NC-Medicine's AdH quota. Musikhochschulen use the equivalent practical instrument: a live or
video-pre-selected Vorspiel (audition).

**Sources**: https://muthesius-kunsthochschule.de/der-weg-ins-studium/ ;
https://muthesius-kunsthochschule.de/faq-bewerberinnen/ ;
https://www.hgb-leipzig.de/en/study/application

### Canada

**Structurally different — institution/discipline-dependent within the country, the same
shape as the US finding.** OCAD University's own admissions page states plainly: **"The
primary basis for admission to OCAD University's studio-based degree programs (BDes or BFA)
is a portfolio submission"** — the academic side is reduced to a floor (Ontario Secondary
School Diploma, six 4U/M courses, 70% overall average, 70% minimum in 4U English) rather than
a competitive-ranking input; portfolio quality differentiates candidates above that floor.
This is a clean, primary-sourced *replace* finding, sharper than the base country doc's own
hedged "sometimes in place of a general personal statement" language — OCAD's portfolio
replaces a competitive-average mechanism generally, not merely a personal statement. Music
programmes at comprehensive universities (University of Toronto Faculty of Music, UBC Music)
sit closer to the *adds-a-hard-gate* shape instead: audition and typically an interview,
layered onto the university's general/faculty admission requirements, per the base country
doc — not independently re-verified as a full replacement this pass.

**Sources**: https://admissions.ocadu.ca/apply/academic-requirements ;
https://admissions.ocadu.ca/apply/preparing-portfolio ;
https://www.ouinfo.ca/universities/ocad-u/offers-of-admission

### Switzerland

**Structurally different, but materially less confirmed on the replace-vs-supplement axis than
Germany** — a genuine, worthwhile contrast within the DACH cluster rather than a parallel
finding. **ZHdK** (Zurich University of the Arts — a Fachhochschule/HES-tier institution, not
one of the ~12 core cantonal universities/ETHs the base Switzerland doc's general template
describes) requires *both* a secondary-education qualification equivalent to Swiss Matura (or
a recognised foreign equivalent) *and* a separate, discipline-specific entrance exam/portfolio.
ZHdK's own page frames these as sequential, additive requirements — "the academic qualification
appears to be a prerequisite for advancing to the audition stage" — rather than the academic
side being waivable for sufficiently strong artistic talent the way Muthesius confirms for
Germany. No Abitur-style substitution mechanism was found for ZHdK this pass — read as a
genuine, current-evidence-based *contrast* with Germany, not a confirmed structural absence
(ZHdK's full Regulatory Framework PDF, which likely holds the definitive answer, was not
independently fetched this session). The base doc's own gap ("portfolio-based Bachelor's
admission... not independently confirmed... fell outside this pass's scope") is now partly
closed: portfolio/audition at ZHdK is confirmed to exist and matter heavily; whether it can
ever fully replace the academic floor remains open.

**Sources**: https://www.zhdk.ch/en/application-and-admission-process-1153 ;
https://www.zhdk.ch/en/degree-programmes/design/bachelordesign/registration-and-admissions-process-2088

### France

**Structurally different — replaces, confirmed via two independent examples that both verify
the brief's lead.** **(1) Beaux-Arts de Paris** joined Parcoursup in 2023, but Parcoursup
functions here purely as the submission/routing *channel*, not the decision mechanism — actual
admission is the school's own 2-stage competition: an eligibility stage (digitised portfolio,
~2,000-character letter of intent, CV, optional video, all submitted via Parcoursup) followed
by an admission stage where an on-site jury selects candidates. Structurally this is the same
"Parcoursup-as-intake-channel-only" shape RULE-ADMISSIONS-002/010 already document for CPGE,
just compressed into the initial application rather than deferred to a later concours.
**(2) The Conservatoire de Paris (CNSMDP)** is confirmed **not** routed through Parcoursup at
all — admission is via the school's own competitive concours, open to French and foreign
candidates, with a reported ~22% overall admission rate (79% music / 21% dance candidates,
one cited cycle). A Sorbonne-Université partnership lets admitted 1st-cycle Conservatoire
students additionally earn an actual Bachelor's title (Music and Musicology) if they
separately also satisfy Sorbonne's own enrolment conditions — an optional add-on layered on
top of, not a substitute for, passing the concours itself.

**Sources**: https://beauxartsparis.fr/en/admission/presentation ;
https://beauxartsparis.fr/en/admission/entree-premiere-annee ;
https://www.conservatoiredeparis.fr/en/academics/study/choose-your-course/admission-requirements

### Spain

**Split within the country — one of the two most important within-country findings of this
whole pass** (with the Germany/Italy/France/Netherlands parallel-sector pattern being the
other), and it resolves a gap the base Spain doc explicitly flagged as unconfirmed.
**(a) Bellas Artes (Fine Arts) as an ordinary Grado at a public university** is confirmed, at
two independent institutions, to have **no** aptitude/portfolio test at all: Universidad
Complutense de Madrid's own Faculty of Fine Arts page states its earlier specific entrance
exam was abolished by Faculty Board agreement in 2008/09 "in favour of the
Selectividad/EBAU grade criterion," and Universidad de Barcelona is independently confirmed
the same way ("no hay prueba específica de aptitud para Bellas Artes en la UB") — both use the
ordinary nota de admisión / Distrito Único mechanism, identical to any other Spanish Grado.
This is genuinely **same as general admission**, not merely a numerically stricter version.
**(b) Music, dance, and dramatic art higher education** sit in an entirely separate
qualification system — "Enseñanzas Artísticas Superiores," governed under its own
arts-education legal framework rather than Real Decreto 534/2024's ordinary-university Grado
framework — and require a **prueba específica de acceso** as the operative mechanism.
Confirmed at the Real Conservatorio Superior de Música de Madrid (Bachillerato-or-equivalent
plus a specialty-specific access test; passing grants access only to that tested specialty, at
that institution, for that year) and at multiple Conservatorios Superiores de Danza, where the
access rules go further than any other finding in this pass: candidates may qualify via the
standard academic-diploma-plus-test route, **or** — in autonomous communities that authorise
it, with Ministry approval — via a "prueba excepcional para aspirantes sin requisitos
académicos," meaning the academic-diploma requirement itself can be waived entirely for
exceptional talent in some regions.

**Sources**: https://www.ucm.es/estudios/grado-bellasartes-acceso-informacion ;
https://notasdecorte.es/universidad-ub/grados/bellas-artes ;
https://rcsmm.eu/informacion-pruebas-acceso ; https://csdanza.es/prueba-especifica-de-acceso-2/ ;
https://www.csdma.es/alumnos/nuevos-alumnos/pruebas-de-acceso

### Ireland

**Structurally different — and more precisely a *replace* shape for NCAD's own restricted
studio programmes than the base country doc's own hedged phrasing suggested**, per this pass's
direct check of NCAD's official admissions pages. The base doc describes CAO's own
"Restricted" flag on Art & Design-type courses as portfolio assessment "combined with, not
replacing, the points mechanism" — accurate as a description of *some* Irish institutions'
general pattern, but NCAD's own current page is considerably sharper for its own restricted
programmes specifically: **"NCAD does not operate the Leaving Cert/CAO points scheme for
programmes requiring a portfolio submission. Offers are made based on portfolio score to
applicants who meet minimum academic entry requirements."** That is a genuine *replace*
mechanism — CAO points are not used as a ranking input at all for these courses, only as a
minimum-entry floor — structurally the same shape as the Netherlands/Germany pattern, not the
"both apply" shape. NCAD is also, usefully, an example of programme-level variation *within one
institution*: two named non-restricted programmes (Product Design, Interaction Design) treat
the portfolio as optional, adding up to 200 bonus points on top of ordinary CAO points (a
genuine "adds a gate," not a replacement); Visual Culture requires no portfolio at all (same as
general admission). Three different mechanisms, three named programmes, one institution — a
concrete, sourced illustration of this family's programme-level-not-country-level variation
principle (see "Institution-specific vs. programme-specific" below). The non-EU/direct route
shows a further, different pattern again (UCD's non-EU Medicine table layers an interview onto
its criteria with no mention of HPAT or points at all) — RULE-ADMISSIONS-014's "two systems,
not an override" shape once more, specific to applicant route rather than Arts/Design as such.

**Sources**: https://www.ncad.ie/study-at-ncad/undergrad-portfolio/submitting-your-portfolio ;
https://www.ncad.ie/study-at-ncad/frequently-asked-questions/ ;
https://www.ncad.ie/study-at-ncad/portfolio-guide/cao-year-1-portfolio-submission/

### Australia

**Structurally different — replaces; the country in this pack where that finding is most
surprising relative to the country's own general system** (see closing report). **NIDA**
(National Institute of Dramatic Art): confirmed directly that "ATAR is not required for NIDA
courses. NIDA does not use ATAR as a selection criteria when reviewing applicants" — the only
academic requirement is *holding* (not scoring competitively on) a Higher School Certificate
or equivalent; admission runs entirely on a two-round video/live audition process. **Victorian
College of the Arts (VCA, University of Melbourne) Bachelor of Fine Arts**: "There is no
minimum ATAR required" — applicants must meet the university's minimum completion-level
academic entry requirement (VCE-or-equivalent) and English-language requirement, and *only
then* are ranked purely by folio and interview/audition; ATAR plays no role in ranking once the
floor is cleared. Both are clean, official, primary-sourced confirmations of full replacement
— arguably the sharpest contrast with a country's own general mechanism found anywhere in this
15-country pass, because Australia's general system (ATAR/selection-rank) is otherwise one of
the most purely numeric, non-holistic ranking mechanisms documented in the whole package (no
essays, minimal recommendations, extracurriculars largely absent per the base country doc).
This corrects the base Australia doc's own hedge ("widely expected... not independently,
deeply source-verified... treat as lighter-sourced pattern-inference") to a confirmed finding
for these two institutions specifically.

**Sources**: https://www.nida.edu.au/study/ ;
https://vca.unimelb.edu.au/study/degrees/bachelor-of-fine-arts-theatre/entry-requirements ;
https://study.unimelb.edu.au/find/courses/undergraduate/bachelor-of-fine-arts-visual-art/entry-requirements/

### New Zealand

**Structurally different — adds-a-hard-gate shape, similar to NCAD's own non-restricted
programmes at Ireland's opposite extreme — confirmed but with weaker certainty than
Australia's neighbouring finding**, consistent with the base country doc's own hedging.
University of Auckland creative programmes (Elam School of Fine Arts' Bachelor of Fine Arts;
Music; Design; Dance Studies) require meeting University Entrance
*plus* the programme's own Rank Score threshold (these programmes cluster at the lower end of
Auckland's published Rank Score table, 150–180) — a real academic floor that, unlike NIDA/VCA,
is not bypassed. On top of that floor, "some programmes have additional requirements, such as
an interview, portfolio or references," per Auckland's own admissions guidance, though the
exact weighting of that additional layer relative to Rank Score was not confirmed by either the
base country doc or this session's follow-up search. Read as "very likely an added hard gate,
not a replacement" — a genuine, stated gap, not a confirmed shape.

**Sources**: https://www.auckland.ac.nz/en/study/study-options/find-a-study-option/bachelor-of-fine-arts-bfa.html ;
https://www.auckland.ac.nz/en/arts/study-with-us/study-options/fine-arts.html

### Hong Kong

**Structurally different — adds-a-hard-gate shape, confirmed specifically for HKAPA and left
as a genuine gap for visual-arts/design programmes at the comprehensive universities.** HKAPA
(Hong Kong Academy for Performing Arts) — a specialised, non-comprehensive institution, not one
of the 8 UGC-funded comprehensive universities the base country doc's JUPAS/non-JUPAS split
describes — uses its own "Recognition of Prior Learning" (RPL) admission process: applicants
must separately satisfy General Admission Requirements (HKDSE Level 3 in English and Chinese,
Level 2 in Mathematics, per HKAPA's own published requirements) **and** undergo "verification
through audition and/or interview and/or portfolio presentation and/or entry test,"
discipline-dependent (Dance, Drama, Music, Chinese Opera, Theatre & Entertainment Arts, Film &
TV each set their own specifics). Two genuine gaps remain, flagged rather than guessed at:
this session could not confirm whether HKAPA's local-student intake is itself channelled
through JUPAS or sits entirely outside it, and could not confirm the relative *weight* of the
academic floor versus the audition/portfolio outcome. The base doc's own "no confirmed
portfolio requirement for Art/Design/Architecture-type programmes... a genuine gap" finding is
now resolved for performing arts at HKAPA specifically, but remains open for visual-arts/design
at HKU/CUHK/HKUST themselves.

**Sources**: https://www.hkapa.edu/page/detail/48211 ; https://www.hkapa.edu/page/detail/48146

### Singapore

**Structurally different — institution-sector-dependent within the country**, a similar shape
to the US/Canada split, though here the axis is "specialist arts institution vs. Autonomous
University" rather than exactly "free-standing college vs. comprehensive university" — the
effect is the same. **NAFA** (Nanyang Academy of Fine Arts) and **LASALLE College of the Arts**
are Singapore's dedicated arts institutions, structurally distinct from the six Autonomous
Universities (NUS/NTU/SMU/SUTD/SIT/SUSS) the base country doc's restricted-programme and
nationality-quota findings describe. Both require completed O-Level/A-Level (or equivalent) as
a floor rather than a competitive-cutoff input, plus a portfolio as the clear discriminator:
LASALLE's BA (Hons) process requires 10–15 original portfolio pieces, an admissions workshop,
and an interview where applicants discuss "the content of your portfolio... inspirations and
influences"; NAFA similarly requires an updated art portfolio plus audition/interview for
music/dance/theatre programmes. Within the Autonomous University sector itself, the pattern is
closer to *adds-a-hard-gate-selectively*: SUTD is the most clearly confirmed portfolio-inclusive,
holistic AU (interviews for "selected candidates" as an explicit official part of its process);
NUS/NTU/SMU integrate interview/portfolio only for specific restricted-programme or
qualification-type categories (e.g. NUS Medicine/Dentistry alongside predicted IB grades; NTU
requiring an interview only for one named foreign-qualification category) rather than broadly
for Architecture/Industrial-Design-type programmes, where a portfolio requirement is plausible
but was not independently primary-verified this pass (consistent with the base doc's own
hedge).

**Sources**: https://www.lasalle.edu.sg/apply/ba-hons/ ;
https://www.lasalle.edu.sg/admissions/ba-hons-admissions/entry-requirements ;
https://www.nafa.edu.sg/docs/default-source/corp-docs/course-brochures/admissions-requirements-guide.pdf

### Turkey

**Structurally different — the one named non-exam-score exception inside an otherwise fully
algorithmic, zero-non-academic-evidence domestic placement system** (see `../turkey.md` in
full) — confirmed and deepened this pass, not merely re-stated. State conservatory,
fine-arts-faculty (graphic design, painting, sculpture, traditional Turkish arts, music
teaching), sports-sciences, and some education-faculty performance-linked programmes require a
**TYT raw-score threshold plus a talent/audition exam (özel yetenek sınavı)**, set
independently by each institution — genuinely different in *kind* from every other Turkish
domestic-pathway programme, which is placed by pure score-rank with zero interview/portfolio
step, including the most competitive fields (Medicine, Law, top Engineering).

This pass could not resolve the exact, single, national shape of the TYT threshold — two
different **split logics** recur across sourced secondary material without a clear primary
tiebreaker: some sources describe the split as by *programme* (Composition/Theatre/Opera/
Musicology at 180 vs. other conservatory programmes at 150, per the guides `turkey.md` already
cites), while at least one institution's own figures (Istanbul University Conservatory: 150 for
Fine-Arts-High-School graduates vs. 180 for other applicants) instead suggest a split by the
*applicant's own secondary-school background*. These may both be true simultaneously (an
institution could apply both axes at once), but this session could not confirm which framing
is the general pattern. At least one state conservatory (Giresun University) reportedly applies
**no** minimum TYT threshold at all for its Music, Turkish Folk Dances, and Traditional Turkish
Music departments — only requiring that TYT be sat and a score calculated — meaning "every
conservatory programme has a TYT floor" is not itself a safe generalisation.

On the brief's specific vakıf-vs-state question: secondary sources describe at least some
private/foundation conservatories as using purely talent-based selection with **no TYT floor at
all** — a genuinely more extreme replace-shape than the state hybrid, if accurate — but this
was **not** independently confirmed against any single named vakıf institution's own official
guide this session (the one vakıf conservatory PDF fetched, Bahçeşehir University's, did not
itself state a TYT policy either way). Recorded as a plausible, medium-confidence deepening
consistent with `turkey.md`'s own existing "Unresolved questions" entry on this exact point,
not a newly verified fact.

**Sources**: primary confirmation already established in `../turkey.md` (Anadolu University and
Dokuz Eylül University özel yetenek guides); this session's additional, lower-confidence
corroboration: https://konservatuvar.giresun.edu.tr/tr/news-detail/2026-2027-ozel-yetenek-sinavi-basvuru-kilavuzu/21862 ;
secondary-aggregator search results describing Istanbul University Conservatory's 150/180 split
and vakıf-conservatory talent-only patterns (not independently primary-verified).

## What determines eligibility

- **Holding** (not necessarily scoring competitively on) the country's normal secondary-leaving
  qualification, or a recognised equivalent — confirmed as a floor virtually everywhere, even
  in the strongest replace-shape cases (Juilliard still requires "completed secondary
  education... high school diploma or GED"; NIDA still requires "a Higher School Certificate or
  its equivalent"). The only confirmed full waivers of even this floor are Germany's
  Kunsthochschule non-Abitur pathway and Spain's regional "prueba excepcional para aspirantes
  sin requisitos académicos" for Enseñanzas Artísticas Superiores — both narrow, named, and not
  the norm.
- **Passing the discipline-specific evaluation itself** — portfolio review, live/video
  audition, practical exam, or a combination — wherever the programme sits in a *replaces* or
  *adds-a-hard-gate* country/institution. Graded on artistic/technical merit by faculty/jury,
  not by a formula; ORYN cannot predict or estimate this outcome the way it can estimate an
  EBAU or ATAR figure.
- **Meeting the country's ordinary competitive mechanism (grades/points/rank) in full**,
  wherever the programme sits inside the ordinary university/degree system with no arts-specific
  exception (Spain's Bellas Artes Grado; Italy's Architecture) — eligibility here is identical
  to any other degree in that country, and none of the Arts/Design-specific findings above
  apply.
- **Narrow, institution-specific age/attempt-limit rules** (e.g. CNSMDP's discipline-specific
  age limits and cap of three attempts per discipline) — real, but not a general Arts/Design
  pattern.
- **Which parallel qualification sector (if any) governs the specific programme** — the
  single highest-leverage eligibility fact in this family, checked before anything else, since
  it determines which of the three mechanism shapes even applies (see below).

## What genuinely strengthens an application

- A strong, disciplined, well-curated **portfolio** (12–30 pieces is the recurring range across
  RISD, German Kunsthochschulen, and LASALLE) showing range, technical skill, and a coherent
  point of view — the dominant, load-bearing lever wherever a *replaces* or *adds-a-hard-gate*
  shape applies, and the one true differentiator ORYN should coach toward for these programmes,
  ahead of grade optimisation.
- **Audition/repertoire preparation** matched to the specific discipline and institution's
  stated requirements (e.g. Royal Conservatoire The Hague's 4-song/2-language vocal programme;
  Juilliard's instrument-specific repertoire) — institution-specific, not transferable across
  schools without re-checking.
- For institutions that retain a real academic floor alongside the artistic evaluation (UAL,
  ZHdK, HKAPA, NIDA's HSC-completion requirement, New Zealand's Rank Score, Ireland's Leaving
  Certificate points for NCAD), **comfortably clearing that floor** — it will not be the
  deciding factor once cleared, but failing to clear it can disqualify a candidate regardless of
  artistic merit.
- Prior relevant training or a supporting foundation-year/Vorkurs-style credential (UAL's
  Foundation Diploma requirement; Germany's typical pre-Kunsthochschule Vorkurs) — referenced
  informally as something that measurably improves portfolio quality, though not itself a
  formal requirement in most countries researched.
- An **interview performance that demonstrates ability to discuss one's own work with insight**
  (explicitly named at LASALLE, HKAPA, and several UK/German institutions) — a distinct skill
  from the portfolio/audition itself, worth coaching separately.

## What is largely irrelevant

- Broad extracurricular breadth of the kind valued in general US/UK holistic review (unrelated
  clubs, generic leadership, generic community service) — no source reviewed in this pass names
  this as a factor for Arts/Design specifically, in any of the 15 countries; the discipline
  portfolio/audition IS the evidence that matters here, not a separate breadth-of-activity
  signal.
- **Standardized general-admissions tests** (SAT/ACT, and by strong analogy EBAU/ATAR/Rank-Score
  *as a ranking tool*) wherever the *replaces* shape applies — Juilliard and NIDA both confirm
  this explicitly; VCA confirms ATAR plays no ranking role once its floor is cleared.
- **General academic GPA/grade competitiveness beyond the stated floor**, in every confirmed
  *replaces* case — a candidate who clears the floor and presents a stronger portfolio than a
  higher-GPA competitor is not disadvantaged by the lower GPA in these specific mechanisms —
  the opposite of how the rest of each country's general system typically works, worth flagging
  to a counselor precisely because it inverts the country's usual logic.
- **Recommendation letters**, in most countries where they are not a general baseline
  requirement anyway (Netherlands, Germany, Italy, France, Spain per the base country docs) — no
  Arts/Design-specific exception to that absence was found; where recommendations *are* a
  general requirement (US, UK), Arts/Design programmes do not appear to weight them more heavily
  than the country's general baseline.

## What ORYN must never infer

- Do not infer that a strong portfolio/audition result at one arts institution transfers, or
  even predicts, success at another institution's own separate process — every confirmed case
  in this research (Juilliard, RCM, Rietveld, Beaux-Arts de Paris, CNSMDP, ZHdK, HKAPA, NIDA,
  VCA) runs its own independent, faculty/jury-judged evaluation with no shared national standard
  or scoring rubric; RULE-ADMISSIONS-002's "never present a university/programme-specific fact
  as national" applies with unusual force here because there is no numerus-fixus-style shared
  national mechanism to fall back on even within one country.
- Do not infer that "Arts/Design" is one mechanism-uniform family even within a single country
  — Spain is the sharpest confirmed proof (Bellas Artes-as-Grado has zero non-academic gate;
  Enseñanzas Artísticas Superiores has the strongest gate found in this entire pass, including a
  possible academic-diploma waiver), and Italy's Architecture-vs-AFAM split confirms the same
  danger from the opposite direction.
- Do not infer that a lower or waived academic floor (Rietveld's Havo-tier minimum; Muthesius's
  Abitur-substitution) signals the programme itself is academically undemanding — it reflects a
  different *selection* mechanism, not a different rigor level once enrolled; ORYN's UI must not
  conflate "low grade-floor requirement" with "easy programme" for this family, matching the
  caution the base package already applies to the Netherlands' HBO/WO tier distinction
  generally.
- Do not infer that meeting the stated academic floor for a *replaces*-shape institution
  constitutes meaningful competitiveness — the floor is a gate, not a ranking input; a
  candidate's real competitiveness is set almost entirely by the portfolio/audition outcome,
  which ORYN has no structured, verifiable way to estimate or score. This is a sharper version
  of RULE-ADMISSIONS-003's "never predict admission probability" caution, because even the
  *input evidence* — a jury's qualitative artistic judgment — is not something ORYN's own
  9-dimension profile-scoring architecture is built to model at all.
- Do not treat a private/foundation (vakıf) Turkish conservatory's admission mechanism as
  identical to a state conservatory's TYT-threshold-plus-talent-exam hybrid — the (medium-
  confidence, not fully primary-verified) evidence in this pass suggests at least some vakıf
  conservatories may waive the TYT floor entirely in favour of pure talent-based selection, a
  materially different, more extreme mechanism that must be confirmed per institution, not
  assumed from the state pattern `turkey.md` documents in depth.
- Do not assume HKAPA's relationship to JUPAS mirrors the 8 UGC-funded comprehensive
  universities' JUPAS/non-JUPAS split documented in the base Hong Kong doc — this was not
  confirmed either way this pass and must be checked directly with HKAPA before advising a local
  HKDSE-holding student on which application route applies.

## Institution-specific vs. programme-specific vs. country-wide patterns

This is where Arts/Design diverges most sharply from every other pattern documented in
`../README.md`'s cross-country matrix, and it is worth stating as its own finding rather than
folding it into the overview.

For most other program families — and for the base country-level admissions research generally
— the load-bearing variation axis is **country first, then university, then programme**
(RULE-ADMISSIONS-002/010). For Arts/Design, the load-bearing variation axis is, in order:
**(1) which qualification sector the specific programme belongs to** (ordinary university
degree vs. a parallel arts-conservatoire education system with its own legal/governance
framework), **(2) institution, (3) discipline/programme within that institution**, and only
then, distantly, **(4) country**. Four independent, confirmed within-country splits demonstrate
this:

- **Germany**: Universität (ordinary NC/Abitur system) vs. Kunsthochschule/Musikhochschule (own
  Hochschulart, Abitur-substitutable).
- **Italy**: MUR-university sector (TOLC/numero chiuso) vs. AFAM (own test di ammissione).
- **France**: Parcoursup-Licence sector vs. Beaux-Arts-de-Paris/Conservatoire-national sector
  (own concours; Parcoursup used at most as an intake channel).
- **Spain**: university Grado sector (Bellas Artes — no aptitude test at all) vs. Enseñanzas
  Artísticas Superiores sector (Conservatorio Superior/Danza — own prueba específica, possible
  diploma waiver).
- **Netherlands**, more mildly: WO sector vs. HBO kunstvakonderwijs sector — same shape,
  lower-contrast, because Dutch HBO already generally uses a lower floor than WO for non-arts
  reasons too, so the arts-specific break is the portfolio/audition itself, not the tier gap.

A US/Canada/Singapore/Australia-shaped version of the same underlying pattern also recurs, just
without a distinct national legal "sector": free-standing, single-discipline institutions
(Juilliard, RISD, OCAD U, NIDA, VCA, NAFA, LASALLE) behave structurally differently from
art/design/music *departments* embedded inside comprehensive universities, even within the same
country and even when both use the identical general national application architecture (Common
App, UCAS, OUAC).

**Ireland's NCAD shows the pattern operating at a third, even finer grain: within one
institution, by named programme.** NCAD's restricted studio programmes replace the CAO points
mechanism outright (portfolio-score-ranked, academic requirement as a floor only); two named
non-restricted programmes (Product Design, Interaction Design) instead treat an optional
portfolio as up-to-200 bonus points *added to* CAO points; Visual Culture uses no portfolio at
all, identical to a non-arts CAO course. Three mechanisms, three programmes, one institution,
one country, one shared national application platform (CAO) — the sharpest single illustration
in this pass that "programme," not "institution" and certainly not "country," is sometimes the
only safe unit of analysis for this family.

**Turkey is the deliberate outlier that sharpens this pattern rather than contradicting it**:
its conservatory/fine-arts exception is the one case in this entire 15-country pass where a
genuine portfolio/audition gate exists *without* a separate governing qualification sector — it
sits inside the same YKS/ÖSYM system as every other Turkish domestic programme, just with an
added TYT-threshold-plus-talent-exam admission path for specific programme codes. This confirms
the "parallel sector" pattern is a genuine, independent finding — not an artifact of how these
particular European countries happen to organise their bureaucracies — precisely because the
one country that does *not* have a parallel sector still finds a way to carve out a comparable
exception through a different structural means (a named exception to a shared placement
algorithm, rather than an entirely separate agency).

**Practical implication for ORYN's data model**: a `qualification_sector` (or equivalent) field
at the programme level — not just university or country — is likely necessary for this family
specifically, distinct from and more consequential than the university-vs-programme override
layers RULE-ADMISSIONS-002/010 already establish for every other family in this package.

## Unresolved questions

- The precise, single national shape (if one even exists) of Turkey's state-conservatory TYT
  threshold — programme-type split (180 vs. 150) vs. applicant-background split
  (Fine-Arts-HS-graduate vs. other) — was not resolved this pass; both framings recur in sourced
  secondary material without a clear primary-source tiebreaker, consistent with `turkey.md`'s
  own flagged uncertainty on this exact point, now with more, still-inconclusive, detail.
- Whether Turkish vakıf (foundation/private) conservatories genuinely and commonly waive the TYT
  floor entirely in favour of pure talent-based selection — reported by secondary sources, not
  confirmed against any single named vakıf institution's own official guide this session.
- Whether ZHdK (or Switzerland's arts/design sector generally) has any mechanism comparable to
  Germany's Kunsthochschule Abitur-substitution for exceptionally talented applicants without a
  Matura-equivalent qualification — ZHdK's own Regulatory Framework document, which likely
  contains the definitive answer, was not independently fetched this session.
- Whether HKAPA's local-student intake is channelled through JUPAS or sits entirely outside it,
  and the relative weight HKAPA places on its HKDSE-based academic floor versus
  audition/portfolio/interview outcome — neither was confirmed this pass.
- Whether a confirmed portfolio requirement exists for visual-arts/design programmes (as opposed
  to the performing-arts programmes confirmed at HKAPA) at Hong Kong's comprehensive
  universities (HKU/CUHK/HKUST) — the base country doc's own gap on this point was not closed
  this pass.
- The exact relative weighting Auckland (or other New Zealand universities) place on
  portfolio/interview versus Rank Score for creative programmes — confirmed to exist as an
  additional requirement, not confirmed as to how much it actually matters relative to the
  academic floor.
- Whether NUS/NTU's Architecture, Industrial Design, and Landscape Architecture programmes
  (named in the base Singapore doc as ranking-position-restricted) carry a confirmed portfolio
  requirement specifically — described as "plausible" by structural analogy in the base doc and
  not independently primary-verified in this pass either.
- Full current-cycle verification of several time-sensitive facts cited above (UAL/CSM's exact
  Level-3 entry combinations, RCM's exact A-level floor, HKAPA's exact GAR thresholds) against
  each institution's own live current-cycle admissions page — flag as cycle-specific and subject
  to annual revision, per this package's general convention, rather than as permanent facts.
