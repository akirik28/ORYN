# Turkey — undergraduate admissions system

Part of ORYN's R3.1 country-level admissions research package. See
[`README.md`](./README.md) for the cross-country matrix and evidence-based ruleset, and
`data/research/admissions-systems/admissions-systems-v1.json` for the machine-readable
version of everything below. Builds on
[`docs/research/secondary-education-systems/`](../secondary-education-systems/) (R2.1).

**This is the 15th country in the package and the first that is not a holistic-review or
threshold-eligibility system.** Turkey is a centrally-allocated, algorithmic, exam-score
placement system. There is no application file for the standard domestic pathway — not a
thin one, not an optional one, none at all. Every section below should be read against
that structural fact rather than fitted to the "eligibility threshold" or "holistic review"
shapes the other 14 countries use.

## A. Admissions architecture

**A single national exam feeds a single national algorithm that places students directly
into programme seats — there is no application, and no university admissions office ever
reviews an individual domestic applicant's file.** Two bodies matter, with sharply
different roles. **ÖSYM** (Ölçme, Seçme ve Yerleştirme Merkezi — the Measuring, Selection
and Placement Center, a government body founded 1974, headquartered Ankara) administers
**YKS** (Yükseköğretim Kurumları Sınavı — Higher Education Institutions Exam), computes
every candidate's placement score from a published formula, and then **runs the actual
centralized placement algorithm** that assigns each candidate to one specific programme
seat. This is a genuinely different role from Studielink/UCAS/Universitaly, which register
and route but never decide — ÖSYM's placement step *is* the admission decision for the
domestic pathway, with no separate university sign-off. **YÖK** (Yükseköğretim Kurulu — the
Council of Higher Education) sits one layer up: it approves each programme's national quota
(kontenjan) through its Yükseköğretim Genel Kurulu, weighing university-submitted capacity
data, faculty numbers, and — per YÖK's own 2026 policy communication — labour-market/
employment-outlook data; it appoints rectors and supervises university performance. YÖK does
**not** itself decide individual student placements.

The mechanism, precisely: after sitting YKS, a candidate submits a single ranked preference
list — **tercih**, up to 24 programme codes, spanning associate (ön lisans) and Bachelor's
(lisans) programmes together, submitted once through ÖSYM's own portal (Aday İşlemleri
Sistemi), not to any university — and is not required to fill all 24 slots. ÖSYM's
placement run then processes **every candidate nationally in strict descending score order
within each programme's own applicant pool**: the highest-scoring candidate nationally is
placed into the highest programme on their own list that still has an open seat, is then
removed from further consideration, and the algorithm proceeds to the next-highest-scoring
candidate, continuing until every candidate is either placed or their list is exhausted. No
programme fills "first come, first served," no human ranks applicants, and preference *order*
only matters in the sense that a candidate is placed at their own most-preferred remaining
option — score, not preference order, determines who wins a contested seat. This is close in
shape to Ireland's CAO points-ranking engine (RULE-ADMISSIONS-012's own example of a
platform that computationally executes ranking) but goes further: Ireland's HEIs formally
retain admissions authority even though CAO computes the ranking, whereas in Turkey no
university-level admissions decision exists at all for a YKS-placed seat.

**Foundation (vakıf) and state (devlet) universities use the identical YKS mechanism for
their domestic-pathway seats.** The difference is financial, not procedural: a foundation
university's scholarship tiers (tam burs/full scholarship, %50, %25, or "İndirimli"/other
partial-discount bands) are encoded as **separate programme-quota codes** within the same
national tercih guide, each with its own cutoff score — a higher discount tier requires a
higher placement score to be filled — not a separate application or a separate committee
decision.

**A second, structurally separate system exists for genuinely foreign-schooled applicants
and is fully decentralized.** ÖSYM also administers **TR-YÖS** (Türkiye Yurt Dışından
Öğrenci Kabul Sınavı — the exam for students applying from abroad), offered in Turkish,
English, Arabic, French, German and Russian, roughly twice yearly, with on the order of
50,000 sitters annually — but for this population **ÖSYM's role stops at exam logistics**.
There is no centralized placement algorithm for TR-YÖS results: each university
independently sets which credentials it accepts (TR-YÖS, SAT, GCE A-Level, IB Diploma,
Abitur, or a diploma-score-only route common at many foundation universities), its own
minimum thresholds, and its own evaluation process. Boğaziçi University's own admissions
pages, for example, publish programme-specific SAT/TR-YÖS/A-Level minimums and state that
"additional criteria" including a statement of purpose may be considered — a genuinely
different, university-discretionary evidence model layered inside the *same* institution
that, for its YKS-placed domestic seats, has zero discretion at all. See the "Domestic MEB
applicant baseline" and "matrix_row" sections below for exactly who falls into which
pathway — the determining fact is *where secondary education was completed*, not
nationality.

**Scope**: national/platform (ÖSYM's exam-and-placement mechanism, YKS-exclusivity policy,
national quota approval) for the domestic pathway; university (credential acceptance,
thresholds, evaluation) for the foreign-national pathway.

## B. Qualification eligibility

**Eligibility to enter the domestic pathway is gated by registration/schooling location,
not by curriculum content or nationality.** Per YÖK's own current policy (confirmed
directly on YÖK's official education portal): **as of the 2026 cycle, every candidate who
is registered at or has graduated from a secondary institution in Turkey or the TRNC must
enter Turkish/TRNC higher education exclusively through YKS** — with three narrow, named
exceptions: (1) embassy-school students, (2) students at MOBİS-listed international private
educational institutions, and (3) foreign nationals brought to Turkey under a specific
Ministry of National Education (MEB) project. This applies regardless of which curriculum
the student actually followed inside Turkey — a Turkey-registered student who completed IB,
A-Level, or AP coursework at a Turkish school is **not**, on that basis alone, exempt from
YKS and does **not** gain access to YÖS or a diploma-equivalency bypass; they still sit and
are placed through the identical YKS mechanism as an MEB-curriculum student, with their
diploma grade feeding OBP (see below) the same way. This is a genuine, sourced finding
worth stating plainly because it runs counter to the pattern in nearly every other country
in this package, where holding IB/A-Level/AP *does* open an easier or separate track (see
Netherlands, Italy, Switzerland sections in their own docs) — in Turkey's domestic pathway
it does not.

**Genuinely foreign-schooled students access a separate, decentralized route.** A candidate
whose secondary education was completed **entirely outside Turkey/TRNC** — regardless of
citizenship — is eligible for the foreign-national quota via TR-YÖS or a university-accepted
alternative. This includes **dual Turkish/foreign citizens and Mavi Kart (Blue Card, former-
Turkish-citizen) holders**, for whom the decisive fact is identically "was secondary school
completed wholly abroad," not the presence of a Turkish passport — a dual citizen who
finished secondary school in Turkey cannot use the foreign quota and must sit YKS; one who
finished entirely abroad can use it without renouncing citizenship. The three named-exception
categories above (embassy/MOBİS/MEB-project students) remain foreign-pathway-eligible even
while physically resident and schooled in Turkey.

**University discretion over the domestic pathway's qualification-to-score conversion is
close to zero** — a structurally sharp contrast with every other country in this package.
ÖSYM's formula and algorithm apply uniformly nationwide; no university can set its own
grade threshold, request supplementary evidence, or override an algorithmic placement for a
YKS seat. Discretion re-enters only (a) in each university's own proposed quota/score-type
per programme (subject to YÖK approval), (b) in the narrow named talent-exam programmes
(see "Interviews / tests / portfolios"), and (c) fully, in the separate foreign-national
pathway.

**Scope**: national (YKS-exclusivity policy and its exceptions, set by YÖK) / platform
(ÖSYM's placement mechanism, uniform regardless of university) / university (foreign-
national pathway credential acceptance only).

## Domestic MEB applicant baseline

**Structural adaptation, stated explicitly so it is not mistaken for an oversight**: every
other document in this package titles this section "Applicant educated in Türkiye" and
evaluates a Turkish-educated student *against a foreign destination system*. That framing
is a category error for Turkey's own document — Turkey is the source/domestic system here,
not a destination evaluating an inbound Turkish applicant. This section instead describes
the **standard domestic case**: a student educated under Turkey's own MEB (Milli Eğitim
Bakanlığı) curriculum, entering Turkey's own universities.

A standard MEB lise diploması (or TRNC-equivalent) is not "sufficient" or "insufficient" for
direct entry the way a foreign diploma is judged against VWO- or Abitur-equivalence
thresholds elsewhere in this package — that framing does not apply, because there is no
university-level sufficiency judgment at all. The diploma's role is narrower and entirely
mechanical: (1) it gates eligibility to register for and sit YKS in the first place (the
student must hold, or be on track to receive, a recognized Turkey/TRNC secondary diploma),
and (2) its final numeric grade feeds directly, via a fixed national formula, into the
placement score (see "Academic evidence used"). No additional qualification is commonly
required beyond YKS itself for the standard route — this is a genuine structural difference
from every foreign-diploma-recognition system researched elsewhere in this package, where
"additional qualifications commonly required" is almost always non-empty.

- **ap_ib_a_level_impact**: Materially different from every other country in this package —
  holding IB, A-Level, or AP coursework *alongside* Turkish MEB registration does **not**
  create an alternate admission channel. A Turkey-registered student with an IB Diploma still
  sits YKS and is placed exactly like an MEB-curriculum peer; their diploma grade (whatever
  curriculum produced it) still feeds OBP the same way. The only route by which an IB/A-
  Level/AP background changes a student's pathway is if it was earned at a genuinely
  **foreign** school (secondary education completed entirely outside Turkey/TRNC) or at one
  of the three narrow named-exception institution types (embassy school, MOBİS-listed
  international institution, MEB-project-relocated) — in which case the student uses the
  separate foreign-national pathway (TR-YÖS or a university-accepted alternative) instead of
  YKS, not because of the curriculum itself but because of where it was delivered.
- **national_entrance_exam_relevance**: YKS is not one input among several — for the
  domestic baseline population it is effectively the entire admission mechanism, alongside
  the diploma-grade-derived OBP component it itself incorporates. YKS comprises three
  components: **TYT** (Temel Yeterlilik Testi — Basic Proficiency Test: 120 questions across
  Turkish, Social Sciences, Basic Mathematics and Science, 165 minutes, taken by every
  candidate), **AYT** (Alan Yeterlilik Testi — Field Proficiency Tests: subject-cluster
  tests taken according to the candidate's chosen score type, 180 minutes), and **YDT**
  (Yabancı Dil Testi — Foreign Language Test: reading comprehension/vocabulary/grammar/
  translation in a candidate-selected language — English, German, French, Arabic or Russian
  — required only for candidates targeting DİL-scored programmes such as Foreign Language
  Teaching, Translation and Interpretation, or Tourism Guidance). TYT and AYT are held on
  consecutive days (2026 cycle: TYT 20 June, AYT/YDT 21 June); the placement formula and
  score types are detailed under "Academic evidence used" and "Standardized tests" below.
- **foundation_year_common**: Not a common academic-eligibility bridge the way Germany's
  Studienkolleg or a UK foundation year is — Turkish lise is a direct 4-year secondary
  track and YKS-eligible on completion with no widespread bridge-year norm for domestic MEB
  graduates. A **different, non-analogous** "hazırlık" (preparatory) year is common:
  students placed into an English-medium programme who do not clear an English-proficiency
  exemption (commonly a YDS/YÖKDİL score, or a university's own placement/exemption exam)
  must complete a mandatory English preparatory year before starting first-year coursework.
  This sits **after** placement, gating when instruction begins, not whether admission
  happens — it must not be conflated with a foreign-system foundation year that affects
  admission itself.
- **recognition_centralized_or_university_specific**: Fully centralized for the domestic
  pathway — the sharpest "no university discretion" finding in this entire package (see
  "B. Qualification eligibility" above). University-specific discretion applies only to the
  separate foreign-national pathway and the narrow talent-exam exceptions.
- **standard_diploma_sufficient_for_direct_entry / additional_qualifications_commonly_required**:
  See narrative above — "sufficient for direct entry" is the wrong frame (there is no entry
  decision to be "sufficient" for outside the placement score itself); no additional
  qualification is commonly required beyond YKS.

**Sources**: https://egitim.yok.gov.tr/tr/page/493 ; https://osym.gov.tr/ ;
https://oner.av.tr/cifte-vatandas-universite-kayit/ ; https://oner.av.tr/yabanci-ogrenci-universite-kayit/ ;
https://studyinturkiye.com/yos-test/

## Academic evidence used

**No transcript is ever submitted to, or read by, a university admissions office in the
domestic pathway** — there is no admissions office act to read it. The only transcript-
derived figure that enters the process is a single number: **OBP** (Ortaöğretim Başarı
Puanı — Secondary School Achievement Score), computed as the student's final diploma grade
(0–100 MEB scale) × 5, giving a raw value commonly observed in roughly the 250–500 range
(reflecting that diploma averages rarely fall near zero). OBP is added into the placement
score as **OBP × 0.12** for a first-time candidate, or **OBP × 0.12** halved to **OBP ×
0.06** for a candidate who has been placed into a higher-education programme before — capping
its maximum contribution at roughly 60 points (first-time) or 30 points (previously placed)
on a placement score that runs into the hundreds. This is the **only** channel through which
a student's secondary-school record — as opposed to their exam-day performance — affects
placement, and it is a single deterministic multiplication, never a qualitative read.

**This must not be modeled as anything resembling a holistic-GPA review.** OBP is not read
in context, not weighed against course rigor or trajectory, not considered alongside any
narrative — it is a fixed-formula numeric input, structurally closer to a bonus-points
mechanism (compare Spain's ponderación or Ireland's Higher-Level-Maths bonus, both modest,
formula-bound add-ons) than to a US-style "holistic GPA" or even the Netherlands' native-
scale transcript read.

Native grades are not converted to any international scale for domestic placement purposes
— OBP is computed directly from the MEB diploma grade on its own scale. Predicted grades do
not apply (see next section). External exams — TYT, AYT, and where relevant YDT — are not
one evidence type alongside others; combined with OBP they constitute the entire evidence
base. Course-level rigor is not separately assessed via a transcript read; it operationalizes
entirely through the **score-type** a candidate prepares for and sits (see "Subject
prerequisites").

**Sources**: https://www.multibem.com.tr/obp-hesaplama-2026/ ;
https://unikazan.com/blog/2026-yks-obp-puani-diploma-notu-siralama-etkisi/ ;
https://www.milliyet.com.tr/galeri/yks-puani-otomatik-hesaplama-tytnin-katkisi-40-ayt-ve-ydt-60-obp-puani-yksye-nasil-eklenir-iste-yks-ve-obp-hesaplama-ekrani-7609364
(secondary/practitioner-consensus sources for the exact coefficients; ÖSYM's own domain
confirms it publishes such coefficient tables as standing practice but this session could
not retrieve the current-cycle primary PDF directly — see "Unresolved questions")

## Predicted grades

**Do not exist as a concept in the domestic pathway, and structurally cannot** — not "not
used" in the sense of an available-but-unused mechanism (contrast Germany/Italy, where the
concept is simply absent by choice), but genuinely inapplicable, because there is no
application timeline at which a forward-looking projection could be submitted to anyone.
Placement happens only after both inputs — the final MEB diploma grade (which produces OBP)
and the final TYT/AYT/YDT exam results — already exist as actual, completed values. Nothing
in the domestic pathway is ever prospective. This is the cleanest "not applicable" finding
in the whole package, more absolute than Germany's or Italy's, because those systems at
least have a hypothetical channel through which a prediction *could* enter (e.g. via a
foreign-diploma applicant's own predicted grades feeding a recognition decision); Turkey's
domestic pathway has no applicant-facing decision point at all where a prediction could be
read.

## Conditional vs. unconditional admission

**Does not exist as a meaningful concept for the domestic pathway**, for the same structural
reason predicted grades don't: conditional admission exists elsewhere to bridge the gap
between an early application deadline and a later final-results date. Turkey's domestic
placement happens *after* all final results are already known, so there is no gap to bridge.
A placed candidate's registration (kayıt) requires submitting proof-of-diploma and
identity documents by a stated deadline — a narrow, procedural, document-completeness
conditionality (closer to Italy's or Spain's narrow procedural sense than to the UK/
Netherlands' grade-target conditionality) — but nothing resembling a UK-style "offer
conditional on achieving predicted grades" exists, because the exam and diploma results
placement is computed from are never predictions.

## Subject prerequisites

**No named-subject checklist exists the way VWO profielen or Ireland's Higher-Level-
Mathematics requirement do.** Subject specialization is instead enforced entirely through
**score-type routing**: YKS placement scores come in four types — **SAY** (Sayısal/
Quantitative: AYT Mathematics + Physics/Chemistry/Biology-weighted — the science/engineering/
medicine/dentistry/pharmacy/architecture cluster), **EA** (Eşit Ağırlık/Equal-Weight: AYT
Mathematics + Turkish Language-Literature/History-weighted — law, economics, business,
psychology, social work), **SÖZ** (Sözel/Verbal: TYT plus AYT Literature, History-1/2,
Geography-1/2, the Philosophy-group courses, and Religious Culture — humanities, some
teacher-training fields), and **DİL** (Yabancı Dil/Foreign Language: open only to candidates
who also sit YDT — foreign-language teaching, translation/interpretation, tourism guidance).
Each programme code in the national tercih guide is tied to exactly one score type; a
candidate is ranked, and can only be placed, against other candidates competing in that same
score type for that same programme. This means "did the student prepare the right subjects"
is answered entirely by "did they sit and prepare for the correct AYT subject cluster" — a
mechanical, binary routing decision made well before results exist, not a transcript-based
prerequisite check performed by an admissions office. A candidate whose profile is
EA-track cannot be placed into a SAY-only-ranked Engineering programme regardless of any
other evidence, because no ranking pool exists for them there.

**Scope**: national/platform — the four score types and their AYT-subject composition are
uniform nationally, set by ÖSYM; the only programme-level variable is which single score
type a given programme code uses.

**Sources**: https://halic.edu.tr/tr/blog/yks-puan-turleri-nelerdir-say-ea-soz-ve-dil-ne-anlama-gelir ;
https://www.hurriyet.com.tr/gundem/yks-sonuclarinda-yer-alan-y-soz-y-ea-ve-y-say-puani-nedir-41276139

## Standardized tests

**This section is not describing a supplementary layer — for the domestic pathway, YKS is
the primary and near-exclusive admissions lever itself**, a structural inversion of every
other country doc in this package, where "standardized tests" describes something alongside
a transcript-driven or holistic evaluation. TYT (120 questions, 165 minutes: Turkish 40,
Social Sciences 20, Basic Mathematics 40, Science 20) is taken by every candidate and alone
determines associate-degree (ön lisans) and Y-TYT-ranked placements; AYT (180 minutes,
subject-cluster tests per score type, detailed above) is required for Bachelor's (lisans)
placement in SAY/EA/SÖZ score types; YDT (120 minutes) is required only for DİL-track
candidates. 2026-cycle exam dates: TYT 20 June 2026, AYT and YDT both 21 June 2026 (AYT
morning session, YDT afternoon session) — treat as cycle-specific and subject to annual
change.

**TR-YÖS is the equivalent instrument for the separate foreign-national pathway**, not used
by domestic candidates. SAT, GCE A-Level, IB Diploma, and Abitur scores appear **only**
within that same foreign-national pathway, evaluated independently by each university (see
"A. Admissions architecture") — never as an input into a domestic YKS placement score.

**Academic cycle**: 2026 (2026 YKS; TR-YÖS reflects its own separate 2025/2026 sitting
calendar, roughly twice yearly). **Sources**: https://osym.gov.tr/ ;
https://www.osym.gov.tr/TR,33018/2025-turkiye-yurt-disindan-ogrenci-kabul-sinavi-2025-tr-yos1-basvurularinin-alinmasiapplications-for-2025-exam-for-foreign-students-for-higher-education-in-turkiye-2025-tr-yos1-13022025.html ;
https://rehberpanda.com/en/blog/2026-tr-yos-30-faq-pillar/

## Language requirements

**Two genuinely separate mechanisms that must not be merged (the same discipline
RULE-ADMISSIONS-009 already establishes for other countries).** (1) **YDT**, a YKS
component, is relevant only to candidates targeting DİL-scored programmes (foreign-language
teaching, translation/interpretation, tourism guidance) — it is a subject-specific admission
input for a narrow set of programmes, not a general proficiency gate. (2) Separately, many
Turkish universities — especially long-established English-medium institutions (Boğaziçi,
METU/ODTÜ, Bilkent, Sabancı and others) and an increasing number of others offering
English-medium programmes — require English proficiency **for enrollment**, typically via
YDS or YÖKDİL (centrally administered, ÖSYM-run language exams; note YÖKDİL specifically is
commonly *not* accepted for the hazırlık-exemption purpose at some institutions even where
YDS is), or a university's own placement/exemption exam; foundation universities more
commonly also accept IELTS/TOEFL as alternatives, while state universities more often hold
to YDS/YÖKDİL. A student who does not clear the exemption threshold is placed into the
mandatory English preparatory year described above. **This is an instruction-medium/
enrollment-sequencing gate applied after placement, not an admission-eligibility gate** — a
student is still placed into the programme by YKS regardless of English level; the
preparatory year delays the start of first-year coursework, it does not affect whether
placement happens.

**Sources**: https://profdil.com/rehber/hazirlik-atlama/universite-hazirlik-raporu ;
https://www.ozyegin.edu.tr/tr/ogrenci-hizmetleri/basvuru-kabul/dil-yeterlik-kosulu

## Application timing

**2026 cycle** (explicitly cycle-specific; YKS dates, fees, and quotas shift year to year
and must be re-verified each cycle):

- YKS registration: 6 February – 2 March 2026 (late registration 10–12 March 2026, at a
  50% fee surcharge)
- Exam dates: TYT 20 June 2026; AYT and YDT 21 June 2026
- Exam score results announced: on the order of 22 July 2026
- Tercih (preference list) submission window: on the order of 29 July – 10 August 2026
- Placement (yerleştirme) results and university registration (kayıt): registration window
  reported as 24–28 August 2026 (electronic registration 24–26 August)
- Ek yerleştirme (additional placement, filling seats left empty after main registration):
  not yet officially dated as of this research pass — expected early-to-mid September 2026
  based on the pattern that ÖSYM only announces this round once main registration completes
  and empty-quota data is confirmed; treat as unconfirmed until ÖSYM publishes it
- Talent-exam programmes (conservatory, fine arts, sports sciences): separate,
  university-set audition/exam windows over the summer, after each university confirms its
  own TYT-threshold-qualified applicant pool

**Sources**: https://www.pervinkaplan.com/detay/2026-yks-basvuru-ucreti-3-oturum-2-bin-100-tl/33022 ;
https://www.dunya.com/egitim/2026-yks-tercih-sonuclari-aciklandi-osym-sonuc-sorgulama-universite-kayitlari-bos-kontenjanlar-ve-ek-tercih-tarihleri-haberi-836632 ;
https://cdn.osym.gov.tr/pdfdokuman/2026/YKS/TERCIH/kontkilavuz_yktd21072026.pdf (official
ÖSYM 2026 quota/preference guide — its existence and URL are confirmed; the full document
was too large to retrieve directly this session)

## Application strategy constraints

**One national list, not per-university choices.** A candidate may name up to **24**
programme-code preferences on a single ranked tercih list (spanning ön lisans and lisans
codes together), submitted once through ÖSYM's own portal — not 24 separate applications,
and not required to be filled completely (a candidate may list as few as one code). There is
no UCAS-style per-category sub-cap (nothing analogous to "4 for Medicine") and no
Netherlands-style numerus-fixus application-count cap — the only constraint is the flat
24-slot ceiling on the entire list regardless of how many institutions or fields those codes
span. Application fee for the 2026 cycle: 700 TL per session (TYT-only 700 TL; TYT+AYT 1,400
TL; TYT+AYT+YDT 2,100 TL; late applications at a 50% surcharge) — up roughly 52.5% from the
prior cycle's reported 450 TL per session, illustrative of how much this figure moves
year-to-year and why it must be re-verified each cycle rather than assumed stable.

**Sources**: https://sanayigazetesi.com.tr/yksde-kac-tercih-hakki-var-2026da-universite-tercihleri-kac-bolumden-olusacak/ ;
https://www.pervinkaplan.com/detay/2026-yks-basvuru-ucreti-3-oturum-2-bin-100-tl/33022

## Personal statement / essays

**Absent entirely from the domestic pathway.** No programme in the standard YKS-placed
route requests, reads, or has any mechanism to receive a personal statement, motivation
letter, or essay of any kind from a domestic candidate — there is no field for one anywhere
in the tercih process. This should be stated plainly, not hedged: it is not "de-emphasized,"
it is structurally absent. The only place anything resembling this appears in the entire
Turkish system is inside the separate, university-specific foreign-national pathway, where
some institutions (Boğaziçi's own admissions pages are a documented example) may consider a
statement of purpose as one *additional* criterion alongside SAT/TR-YÖS/A-Level scores for
their foreign-quota seats — a fact about that separate system, not a qualification of the
domestic-pathway finding.

## Recommendation letters

**Absent entirely from the domestic pathway**, for the identical structural reason as
essays — no submission mechanism exists. No source reviewed, official or secondary, surfaced
recommendation letters as a factor anywhere in Turkish undergraduate admission, domestic or
foreign-national.

## Extracurricular activities

**Absent entirely from the domestic pathway — zero channel, and this should be stated as
plainly as the brief for this research demands.** A domestic candidate's placement is
determined completely by (TYT × 0.40) + (AYT × 0.60) + (OBP × 0.12 or 0.06), compared in
strict rank order against other candidates who listed the same programme code. There is no
field, form, portal, or review step anywhere in this pathway into which leadership,
competitions, awards, research, volunteering, projects, or any other development-dimension
evidence could be entered, let alone weighted. This finding is independently confirmed by
this session's own primary-source research (ÖSYM's and YÖK's own domains, described above)
and by ORYN's counseling-intelligence research lane (`RULE-COUNSEL-057`, `RULE-COUNSEL-109`
— see "Unresolved questions" for the specific cross-check). **ORYN must never imply that
strengthening a domestic-YKS-track student's activity profile will move their placement
outcome** — doing so would not merely be unhelpful, it would be factually wrong about how
the mechanism works.

## Interviews / tests / portfolios

**Absent from the standard domestic pathway, with a small number of precisely named
exceptions where a genuine non-exam-score element enters.** State **conservatory**
admission is a confirmed hybrid: a minimum TYT raw-score threshold (commonly cited at 150
points for most conservatory programmes, and 180 for Composition, Theatre, Opera and
Musicology specifically; State Conservatory-affiliated high-school-division graduates are
exempt from even this TYT step) **plus** a talent/audition exam (özel yetenek sınavı)
administered by the specific institution — a genuine departure from pure score-ranked
placement, not decorative. The same TYT-threshold-plus-talent-exam shape applies to **fine
arts faculties** (graphic design, painting, sculpture, traditional Turkish arts, music
teaching), **sports sciences faculties** (physical education and sports teaching, coaching),
and some **education-faculty performance-linked programmes** — each university sets its own
specific TYT floor by senate decision, generally cited in the 150–200 raw-point range, so a
counselor should confirm the specific institution's current threshold rather than assume one
national figure. **These are the only named non-exam-score elements found anywhere in the
domestic system** — no equivalent exists for any other field, including the most
competitive ones (Medicine, Law, top Engineering programmes remain pure score-ranked
placement with no interview or portfolio step at all).

**Sources**: https://ozelyetenek.anadolu.edu.tr/Content/Documents/Devlet%20Konservatuvar%C4%B1%20%C3%96zel%20Yetenek%20S%C4%B1nav%20K%C4%B1lavuzu.pdf ;
https://konservatuvar.deu.edu.tr/wp-content/uploads/2025/07/2025-Ozel-Yetenek-Sinavlari-Tablosu-Kosullar-ve-Aciklamalar.pdf

## Restricted / selective programmes

**Universal, not exceptional — the opposite shape from every other country in this
package.** Every single lisans programme nationally operates under a hard, YÖK-approved
numeric quota and is filled entirely by score-rank order; there is no "open enrollment"
category equivalent to the Netherlands' non-numerus-fixus programmes or Germany's
zulassungsfrei fields. "Restriction," for Turkish counseling purposes, is therefore not a
binary programme-type flag but a **continuous, cycle-varying cutoff** — some programmes
(especially at less-established foundation universities) go unfilled even after main
registration (2026 cycle: roughly 35,706 of 176,080 foundation-university seats nationally
were reported still empty after main registration, feeding into the ek yerleştirme round),
while others (Medicine, Law, and top-university Engineering programmes specifically) require
close to the maximum attainable score. A programme's actual selectivity in a given cycle is
best represented by its prior-cycle cutoff score/rank (taban puanı/sıralama), not by a
static "restricted vs. open" label. The only named exceptions where a **non-score** element
also gates entry are conservatory, fine arts, sports sciences, and some education-faculty
performance programmes (see "Interviews / tests / portfolios").

**Sources**: https://www.turkiyegazetesi.com.tr/egitim/vakif-universitelerinde-sasirtan-sonuc-populer-bolumlerde-bile-kontenjanlar-bos-kaldi-1810326 ;
https://www.yok.gov.tr/tr/news/yuksekogretimde-yeni-donem-kontenjanlar-artik-istihdama-ve-gelecegin-mesleklerine-gore-belirleniyor-EJAzg

## Admissions decision model

**This is the single most important structural fact in this document, and it is not a
variant of any model already in this package — it is a different category of admissions
decision entirely.** Every other country researched so far resolves into either a
qualification-threshold model (Netherlands' non-numerus-fixus programmes, Germany's
zulassungsfrei fields: eligible effectively equals admitted, decided once, no ranking
against other candidates) or a genuinely competitive model that still routes through some
form of file review, formula-plus-officer judgment, or at minimum a university-facing
decision step (US holistic review, UK's UCAS-mediated offers, Spain's nota de admisión,
Ireland's CAO points). **Turkey's domestic pathway is neither**: it is a nationally
centralized **algorithmic placement** — a single computer process, run once per cycle by
ÖSYM, that assigns every candidate to at most one seat by strict descending-score processing
order against each candidate's own ranked preference list, with no human review step, no
university sign-off, and no application artifact of any kind to review. Ireland's CAO is the
closest analogue elsewhere in this package (RULE-ADMISSIONS-012 already notes CAO
"computationally executes ranking... on behalf of HEIs"), but even CAO leaves HEIs holding
formal legal admissions authority; Turkey's YKS placement **is** the admission decision,
full stop, for the domestic pathway. Meanwhile the *separate* foreign-national pathway, in
the same country, is fully decentralized and university-discretionary — closer to the US/UK
end of this package's spectrum, including room for a statement of purpose at some
institutions. **A country-level "how does Turkey decide admission" answer is meaningless
without first asking which of these two pathways the student is in** — this is not a
university/programme override layered on a shared baseline (RULE-ADMISSIONS-002's shape);
it is two independent systems from the ground up, the same pattern RULE-ADMISSIONS-014
identifies for Ireland's CAO/non-EU-direct split, expressed here in its sharpest form yet
found in the package (one side has literally zero evidence beyond a score; the other has
university-set holistic elements).

## Safe inferences

- It is safe to infer that a domestic (Turkey/TRNC-registered) candidate's placement outcome
  is determined completely by (TYT × 0.40) + (AYT × 0.60) + (OBP × 0.12, or 0.06 if
  previously placed) — compared in strict national rank order against other candidates who
  listed the same programme code — and by nothing else.
- It is safe to infer that additional time spent on extracurricular activities, leadership,
  competitions, research, or community-impact evidence will not itself move a domestic YKS
  placement outcome, because no mechanism exists through which that evidence could ever
  reach a decision-maker.
- It is safe to infer that a Turkey-registered student who studies IB, A-Level, or AP inside
  Turkey still must sit and be placed via YKS for domestic admission — that curriculum
  content does not, on its own, open the foreign-national pathway or any YKS-bypass route.
- It is safe to infer that conservatory, fine arts, sports sciences, and specific
  education-faculty performance programmes are the only domestic-pathway programmes where a
  talent/audition exam genuinely enters the admission decision alongside a TYT threshold.
- It is safe to infer that foundation (vakıf) and state (devlet) universities use the
  identical YKS placement mechanism for domestic seats — scholarship tiers are separate
  quota-coded programme lines within the same system, not a different admissions process or
  a separately-judged scholarship application.
- It is safe to infer that predicted grades and UK-style conditional offers do not apply to
  the domestic pathway, because placement only ever occurs once all final results already
  exist.

## Unsafe inferences

- Do not treat OBP as a holistic-GPA-style signal that reflects "character," "growth," or
  "trajectory" the way a US admissions reader might read a transcript — it is a single
  deterministic multiplication of the final diploma grade, never read qualitatively or in
  context by any person.
- Do not assume every Turkish undergraduate programme is equally selective, or that
  "restricted" is a fixed named category the way numerus fixus or NC is elsewhere — cutoff
  scores vary enormously by programme, university, and cycle (from thousands of unfilled
  foundation-university seats to near-perfect-score-required flagship programmes), and must
  be checked per programme per cycle.
- Do not assume the foreign-national/TR-YÖS pathway is centrally placed the way the domestic
  pathway is — ÖSYM administers the TR-YÖS exam itself but does not place foreign-national
  applicants; each university decides independently, with its own accepted credentials and
  thresholds.
- Do not assume a Turkish citizen or Turkey-resident student is automatically on the
  domestic YKS pathway, or that a foreign passport automatically means the foreign-national
  pathway — the operative fact is where secondary education was completed in full, checked
  per student, not inferred from nationality or current residence.
- Do not assume the 2026 "YKS-exclusive for Turkey/TRNC-registered candidates" policy and
  its three named exceptions are a permanent, unchanging structural constant — treat it as a
  confirmed, current, dated policy fact, consistent with how this package treats every other
  time-sensitive national rule (e.g. the Netherlands' 2023 numerus fixus lottery law).
- Do not treat the exact OBP coefficients (0.40 / 0.60 / 0.12 / 0.06) or the 24-preference
  tercih cap as verified against a primary ÖSYM document by this specific research session —
  they are high-confidence, multiply-convergent secondary-source figures (and, for the OBP
  coefficients, corroborated by the counseling-intelligence lane's own direct ÖSYM
  domain-structure fetch), not values this session itself quoted from ÖSYM's live kılavuzu
  PDF, which was too large to retrieve directly. Re-verify against the current-cycle ÖSYM
  guide before relying on the exact figures operationally.

## Eligibility, competitiveness, fit

**Eligibility** for the domestic pathway is binary and almost entirely procedural: hold or
be on track for a recognized Turkey/TRNC secondary diploma (or fall into one of the three
named exceptions), register for and sit YKS. Nothing else gates initial participation — in
particular, there is no minimum-grade eligibility floor separate from the placement score
itself (a very low OBP simply produces a very low placement score, rather than disqualifying
the candidate outright). **Competitiveness** is where essentially all of the real "does this
student get this seat" work happens, and it is where the bulk of a counselor's attention
belongs: a continuous, national, per-programme-code score competition, recomputed fresh each
cycle from that cycle's actual applicant pool — Turkey's cutoff scores, like Spain's nota de
corte, are an emergent function of that year's demand rather than a fixed pre-set bar, so a
prior cycle's cutoff is informative, never a guarantee. **Fit**, in the sense used elsewhere
in this package (does a student's profile suit a specific programme's culture or values),
essentially does not exist as an assessable concept in the domestic pathway, because no
qualitative evidence is ever submitted for anyone to judge fit against. The closest
structural analogue is the score-type/AYT-subject-cluster choice itself — a mechanical,
binary compatibility check (can this candidate even be ranked in this programme's pool),
not a judged fit.

## Counselor actions

- Never present additional leadership, community-impact, research, or general
  extracurricular investment as something that will improve a domestic-YKS-track student's
  admission odds — reserve ORYN's 9-dimension development coaching for this student's
  genuine personal growth, explicitly reframed as development guidance rather than
  admissions strategy for this specific target.
- Treat exam-preparation time budgeting (TYT/AYT/YDT content mastery, score-type/track
  selection, practice testing) as the dominant, near-exclusive lever for a domestic-YKS-track
  student's stated admission goal.
- Confirm, well before the exam, which score type (SAY/EA/SÖZ/DİL) the student's target
  fields require, since this locks in which AYT subject cluster they must prepare for — a
  wrong-track choice cannot be corrected after results are published.
- Determine precisely how a Turkey-resident student is actually schooled (MEB/Turkish-
  curriculum-registered vs. embassy/MOBİS-listed international school vs. genuinely
  foreign-schooled) before assuming which pathway — YKS or foreign-national — applies;
  nationality and passport alone do not determine this.
- For a target that is conservatory, fine arts, sports sciences, or an education-faculty
  performance programme, add a talent/audition-preparation workstream well ahead of the
  summer exam window, and confirm that specific institution's own current TYT threshold
  directly rather than assuming a single national figure.
- For a foundation-university target chosen partly for its scholarship tier, explain that
  tam burs/%50/%25/İndirimli tiers are separate quota-coded programme lines inside the same
  YKS tercih system requiring correspondingly higher placement scores — not a separate
  scholarship application or committee decision.
- For a student with a genuinely mixed target set (a Turkish YKS-track application running
  alongside a US/UK/other application in parallel — an explicitly normal case for ORYN's
  stated population), give Tier-appropriate guidance to each target separately rather than
  blending them: exam-focused for the Turkish target, holistic/evidence-based for the
  others. Never let a student's Turkish nationality or residence alone imply YKS-track
  counseling if their stated target lies elsewhere, and never let a non-Turkish target
  suppress the exam-prep urgency that a simultaneous Turkish target genuinely requires.
- Never frame OBP as something a counselor could help a student "build a stronger case" for
  beyond ordinary academic performance in lise — it is a fixed multiplication of the
  existing diploma grade, not a narrative a student constructs.

## Data model implications

ORYN's existing admissions-outlook and application-readiness data model — built around
evidence artifacts (essays, recommendations, activity lists) and conditional-offer states —
has **nothing to attach for a domestic-YKS-track student**, not because the model is
incomplete for Turkey but because that entire category of artifact does not exist in this
pathway. This needs a genuinely different admission-object type, not a sparser version of
the existing one. Specifically:

- **`pathway_type`** (domestic_yks vs. foreign_national) needs to be a first-class field at
  the student-target level, not inferred from country or nationality, mirroring
  RULE-ADMISSIONS-014's Ireland CAO/non-EU-direct split — the two Turkish pathways require
  entirely different evidence models within the same country.
- **Score-type** (SAY/EA/SÖZ/DİL) needs representing as a property of both the student
  (which AYT cluster they are preparing for) and the target programme (which score type it
  is ranked on); a mismatch here is a hard eligibility blocker, not a soft-fit signal, and
  should be modeled and surfaced as such rather than folded into a general "requirements".
- The **OBP coefficient** (0.12 default, halving to 0.06 for a previously-placed candidate)
  should be a versioned, cycle-specific numeric parameter — consistent with this package's
  own `admission_model_v1`-style versioning discipline — not a hardcoded constant, since
  ÖSYM's own published figures are confirmed to change (2025→2026 fee changes alone moved
  ~52.5% in one cycle; coefficients should be assumed similarly revisable).
- **Tercih** should be modeled as a single ordered array of up to 24 programme codes per
  student per cycle, submitted once nationally — not as N separate per-university
  application records the way every other country in this package structures applications.
- **Programme-level competitiveness** should be represented via actual prior-cycle
  cutoff-score/rank history (taban puanı/sıralama) where available, rather than the
  qualitative Reach/Competitive/Strong/Likely labels ORYN uses for holistic-review
  countries — while still respecting RULE-ADMISSIONS-003: a prior cutoff is informative,
  never a guaranteed threshold, since it is recomputed from each cycle's actual applicant
  pool.
- A distinct **named-exception program flag** is needed for conservatory/fine-arts/
  sports-science/education-performance programmes (TYT threshold + talent exam), separate
  from the standard pure-score placement object, so ORYN's counselor does not apply
  exam-only framing to a target where a portfolio/audition genuinely matters.

**Gaps**: the exact current-cycle OBP coefficients were not verified against ÖSYM's own
primary kılavuzu directly by this session (see "Unresolved questions"); a systematic,
per-university sweep of foreign-national-pathway credential/threshold tables (beyond the
Boğaziçi and Marmara examples checked here) was out of scope for this pass.

## System / university / programme override model

**Layer 1 (national/legal)**: YÖK approves each programme's national quota through its
Yükseköğretim Genel Kurulu; sets and can revise the YKS-exclusivity policy and its three
named exceptions; this layer cannot be varied by any individual university. **Layer 2
(national exam/placement mechanism)**: ÖSYM's TYT/AYT/YDT structure, the OBP formula, the
four score types, and the placement algorithm itself apply **uniformly** to every
domestic-pathway programme nationwide — no university can set its own weighting, request
supplementary evidence, or override an algorithmic assignment; this is the least
university-discretionary layer found anywhere in this package. **Layer 3 (university/
programme, domestic pathway)**: the only genuine per-university/per-programme discretion
here is (a) the proposed quota size and score-type for a given programme code, subject to
YÖK approval, and (b) for the narrow named talent-exam programmes, the specific institution's
own TYT threshold and audition/portfolio design. **Layer 4 (foreign-national pathway — a
separate system, not an override layer)**: each university independently sets its own
accepted credentials (TR-YÖS/SAT/A-Level/IB/Abitur/diploma-only), minimum thresholds, and
evaluation process — including, at some institutions, holistic elements such as a statement
of purpose — for its foreign-national quota. This layer has close to full university
discretion, the structural opposite of Layer 2/3's near-zero discretion, and — per the same
reasoning as RULE-ADMISSIONS-014 — should be modeled as a parallel system rather than an
override sitting on top of the domestic layers, since there is no shared domestic baseline
being modified for this population.

## Unresolved questions

- Whether the exact current-cycle OBP coefficients (0.40 TYT weight / 0.60 AYT weight /
  0.12 first-placement OBP coefficient / 0.06 previously-placed coefficient) match ÖSYM's
  own live kılavuzu precisely — this session could not retrieve the primary PDF directly
  (the confirmed official URL, `cdn.osym.gov.tr/pdfdokuman/2026/YKS/TERCIH/kontkilavuz_yktd21072026.pdf`,
  exceeded this session's fetch size limit) and relied on multiply-convergent independent
  secondary calculator sites, consistent with the confidence level the counseling-
  intelligence research lane itself assigned to the same figures (high for channel
  existence/rough size, medium for exact current coefficients).
- The precise effective floor of OBP's raw range — is a diploma grade near 0 genuinely
  possible, or does an MEB-mandated minimum passing average set a higher effective floor
  than the commonly-cited "~250" raw figure implies — was not confirmed against a primary
  MEB source this session.
- Whether any additional non-exam bonus coefficients exist for vocational-lise-branch-
  relevant placement (referenced only glancingly in sources reviewed, not verified) — more
  likely relevant to ön lisans/MYO (associate-degree) placement than to the lisans
  (Bachelor's) scope of this document regardless.
- Exact 2026 ek yerleştirme (additional placement round) dates — not yet officially
  published as of this research pass; expected early-to-mid September 2026 based on pattern,
  not confirmed.
- Whether the conservatory TYT threshold is genuinely fixed nationally at 150 (180 for
  Composition/Theatre/Opera/Musicology) or is set per-institution by senate decision within
  a 150–200 range — sources reviewed described both framings and this session did not
  resolve which is more accurate for the current cycle against a single primary source.
- Whether additional named non-exam-score exceptions exist beyond conservatory/fine-arts/
  sports-sciences/education-performance (e.g. disability-based alternative assessment,
  martyr/veteran-family placement provisions beyond simple quota reservation) — this session
  did not systematically search every quota-category variant.
- The precise division of labour between ÖSYM and YÖK specifically for TR-YÖS governance
  (which body approves which universities may rely on TR-YÖS versus running their own
  bespoke foreign-national exam) — not fully disambiguated from sources reviewed.

**Cross-check against the counseling-intelligence research lane's own Turkey findings**
(`origin/oryn/counseling-intelligence-research-013956`, per this task's brief): **no
substantive conflict found.** This session's independent research (direct fetches of
`osym.gov.tr` and `egitim.yok.gov.tr`, plus convergent secondary corroboration) confirms and
extends `RULE-COUNSEL-057` (YKS is exam-score-dominated; extracurricular/development
counseling is not admissions-strategically important for this pathway), `RULE-COUNSEL-109`
(the OBP formula and its structural ceiling), `RULE-COUNSEL-101` (the conservatory
audition/TYT-threshold exception), `RULE-COUNSEL-062` and `RULE-COUNSEL-064` (the same
exam/formula-driven shape holding for Germany and Italy respectively, cited there for
cross-country pattern support) without contradicting any of them. One process note, not a
substantive conflict: this task's brief also asked this session to check `RULE-COUNSEL-231`
and `RULE-COUNSEL-242` specifically. Neither ID exists in
`origin/oryn/counseling-intelligence-research-013956`'s `rules.json` as fetched — that
file's own rules run only from `RULE-COUNSEL-001` through `RULE-COUNSEL-123` (confirmed by
enumerating every ID in the file; the branch's own final commit message independently
states "123 rules/64 sources"). That same branch's own `11-geography-admissions-systems.md`
explicitly documents that a separate branch (`oryn/counseling-intelligence-research`,
referred to there as "the peer session") maintains its **own independent** `RULE-COUNSEL-*`
numbering that collides with this branch's numbering for at least one other ID
(`RULE-COUNSEL-056`, minted independently on both branches for two different rules, per that
document's own §4) — and that same doc cites "`RULE-COUNSEL-238`" as the *peer* branch's own
number for the conservatory finding this branch itself recorded as `RULE-COUNSEL-101`. It is
therefore plausible, though not verified by this session (this task's brief scoped the
cross-check specifically to the `-013956` branch, and this session did not fetch the
separate peer branch to check), that `RULE-COUNSEL-231`/`RULE-COUNSEL-242` exist under the
peer branch's independent numbering rather than being erroneous or missing outright. This is
recorded here rather than silently resolved either way, per this task's own instruction.
