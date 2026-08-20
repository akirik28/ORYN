# Türkiye / MEB Secondary Education (Ortaöğretim, Lise, grades 9-12)

Part of ORYN's R2.1 secondary-education-system research package. See
[`README.md`](./README.md) for the cross-system matrix and evidence-based ruleset, and
`data/research/academic-systems/secondary-systems-v1.json` for the machine-readable
version of everything below.

**Researched with extra care** as ORYN's immediate pilot-market system, per the research
brief. The primary source is the official **MEB Ortaöğretim Kurumları Yönetmeliği**
(Secondary Education Institutions Regulation), consolidated through amendment
RG-22/2/2025-32821 — obtained and parsed directly (article-numbered citations below are
"Madde nn" references into this text), not taken from secondary summaries.

## A. System identity

- **Owner/authority:** Millî Eğitim Bakanlığı (MEB), via the Ortaöğretim Kurumları
  Yönetmeliği, issued under Law 222 and Law 1739.
- **Contexts:** All official and private *örgün* (formal, in-person) secondary
  institutions affiliated with MEB inside Türkiye, plus MEB-affiliated schools abroad and
  students re-entering from schooling abroad (Madde 66 governs that re-entry conversion).
  Does **not** itself govern IB, Cambridge, or AP tracks — those run under Türkiye's
  separate private-education statute (Law 5580), layered on top of specific schools.
- **Qualification type:** Both a national curriculum *and* the diploma-granting
  framework combined. Completing it via a recognized school type (Fen Lisesi, Anadolu
  Lisesi, Sosyal Bilimler Lisesi, Anadolu İmam Hatip Lisesi, Mesleki ve Teknik Anadolu
  Lisesi, and others — Madde 6) results in an official **Lise Diploması** (Madde 69). Best
  modeled in ORYN as `curriculum='turkish_curriculum'` — not as a single "exam."

## B. Native grading model

**Numerical 0-100 at every level** — dönem puanı (term score) → yılsonu puanı (course
year-end score, mean of the two term scores) → yılsonu başarı puanı (year's overall
average, **weighted by each course's weekly-hour count** — a real credit-hour weighting,
not a flat mean) → **mezuniyet puanı / diploma notu** (diploma score: the unweighted
arithmetic mean of the four yearly averages, to 4 decimal places, printed on the diploma).

There is **no current 1-5 or letter-grade scale** at lise level (a 5-point scale existed
before 1 Feb 2007 and was formally abolished). Any source describing a current 1-5 Turkish
lise scale should be treated as stale.

**Passing threshold (Madde 56):** term-average ≥ 50, *or* second-term score ≥ 70
regardless of the first term. **Grade promotion (Madde 57-59):** direct pass (≤1 failed
course, average ≥50), conditional pass with makeup exams (2-3 failed courses, capped at 6
cumulative across the whole programme), or repeat the year (capped at once, prep year
excluded).

**No official MEB→foreign-GPA conversion exists.** The regulation's own Madde 66 conversion
runs in the *opposite* direction (foreign grades → Turkish 100-scale, for a returning
student) and must never be used in reverse. UK ENIC explicitly declines to certify
grade-level comparability (only qualification-*level*). The one legitimate, narrow
exception found: **University of Leeds Business School's own admissions page** treats an
85% final-year average (with a Mathematics condition) as AAA-at-A-Level-equivalent *for its
own direct-entry admissions only* — cite by name and purpose if ever used, never
generalize, and always retain the native 100-point figure alongside it. Generic
"Turkey→4.0 GPA" tables on sites like gpacalculator.net carry no issuing authority and are
not authoritative.

## C. Course / qualification structure

- **ders** (course) — weekly-hour allocation doubles as its weighting factor.
- **dönem puanı** → **yılsonu puanı** → **yılsonu başarı puanı** → **mezuniyet puanı** — the
  four-level rollup chain described above (Madde 51-55, 65).
- **sınıf geçme** (promotion): doğrudan geçme / sorumlu geçme / sınıf tekrarı, with
  **sorumluluk sınavı** (makeup exam) clearing a conditional pass.
- **hazırlık sınıfı** (prep year) — only at specific Ministry-approved,
  typically foreign-language-intensive, centrally-exam-admitted schools. Passed via a
  proficiency exam. **Its grades are explicitly excluded from the diploma score** (Madde
  60(1)) — most Turkish high schools have no prep year at all.
- **öğrenci gelişim dosyası** — a separate MEB-defined portfolio (interests, project
  participation, social-responsibility hours) closer in spirit to ORYN's own
  evidence/portfolio concept than to a grade record.
- **ortak dersler / alan-dal dersleri / seçmeli dersler** — common, field/branch
  (vocational), and elective course categories.

## D. Academic rigor signals (factual, not an ORYN-invented score)

- **Admission mechanism**: Fen Lisesi, Sosyal Bilimler Lisesi, and specific
  Anadolu/Teknik programs are admitted via **LGS**, a competitive central placement exam —
  more selective at entry than schools without one. This is retrievable per-school, not
  something to infer from a school's name.
- **hazırlık sınıfı presence** is a factual attribute of the specific school — evidence of
  extra language exposure, not of stronger/weaker diploma-year performance (its grades
  never enter the diploma score at all).
- **alan/dal track** — vocational/technical Anadolu Lisesi students follow a materially
  different course mix (including workplace internship components).
- **AP/IB/A-Level at the same school**: the 106-page regulation was full-text-searched and
  contains **zero mentions** of AP, IB, A-Level, or Cambridge — these are entirely
  privately-arranged add-ons a specific school may or may not offer, never something to
  assume from a school's reputation or type.

## E. Predicted grades

**No formal MEB predicted-grade construct exists** — confirmed by absence in the
regulation (only actually-earned scores are defined). What happens in practice when a
student applies abroad mid-12th-grade is **not verified against an authoritative source**
in this pass: general international-admissions practice suggests finalized 9th-11th-grade
data plus whatever of 12th grade's first semester is available gets submitted, sometimes
alongside an informal, non-standardized counselor estimate. ORYN should represent a MEB
senior year as **"in-progress official data through the most recently completed term,"**
never invent or request a formal "predicted grade" field, and never treat an informal
counselor estimate as equivalent in authority to a finalized yılsonu puanı.

## F. Class rank

**Structurally absent for essentially every student.** The only rank-like construct is
**okul birincisi** (single school-or-program top student, one per school/program, Madde
64) — an end-of-program honor with a defined tie-break cascade, determined by 4-year
mezuniyet puanı — and it is **not even one of the fields printed on the diploma** (the
exhaustive Madde 69(3)(a) field list has no rank field). For every student other than the
single okul birincisi, no numeric or percentile rank exists anywhere in the official
record. ORYN's "never infer class rank" rule applies with unusual force here: it isn't
just often-missing, it's structurally absent by design.

## G. Standardized / external assessment

Two entirely separate national exam systems, run by two different bodies, both distinct
from any AP/IB/A-Level a student might also hold:

- **LGS** (MEB's own ÖDSGM) — pre-high-school placement exam for competitive lise
  programs. Not mandatory. Happens *before* lise begins.
- **YKS** = TYT + AYT (+YDT for language programs) (**ÖSYM**, an autonomous body under
  YÖK — *not* MEB) — university entrance, taken near/after 12th grade. The diploma notu
  feeds in via **OBP** (scaled ×5, then ×0.12 coefficient added to the raw YKS score) — the
  0.12 coefficient is corroborated only via secondary/consultant sources, **not**
  independently verified against ÖSYM's own current kılavuzu; flagged medium confidence.
- **AP/IB/A-Level/SAT** — unrelated to LGS/YKS; a separate, parallel credential a specific
  school may offer, per ORYN's own Turkey school registry.

## H. Unsafe inferences

- Do not compute or display a class rank for a MEB student (except the single, evidence-
  pending, self-reported `okul birincisi`).
- Do not convert mezuniyet puanı / yılsonu başarı puanı / dönem puanı into a US GPA by
  default — no universal conversion exists; only a named institution's own narrow-purpose
  table (e.g. Leeds Business School) may be cited, and only alongside the native figure.
- Do not reuse the Madde 66 (foreign→Turkish) conversion in reverse or for any other
  purpose.
- Do not assume any Turkish school — even a famous private one — offers AP/IB/A-Level;
  MEB's own regulation never mentions them. Check the school's actual offerings.
- Do not assume a hazırlık sınıfı exists unless recorded, and never fold its grades into
  the diploma score if it does.
- Do not treat a lower numeric average as inherently "weak" without the issuing school's
  own grading norms — MEB scoring is school-administered, not centrally curve-normalized.
- Do not compute or estimate LGS/YKS scores from course grades.
- Do not treat AP/IB/A-Level results as part of, or a substitute for, MEB dönem/yılsonu/
  mezuniyet puanı, or vice versa.
- Do not fabricate an IB-style predicted grade for a MEB student.
- Do not assume the 2023-24 ortaokul (middle-school) Turkish-language-70/other-50
  threshold change applies at lise level — the lise-level threshold is a uniform 50 (Madde
  56), from a different regulation instrument.

## I. Counselor interpretation

**Should care about:** the 4-year yılsonu başarı puanı trend on its own 100-point scale,
read in the specific school's own context; which electives/alan-dal track/AP-IB-A-Level
courses the student actually took relative to what their specific school offered; whether
the school required competitive admission (LGS); LGS/YKS performance, reasoned about
separately from course grades; any AP/IB/A-Level/SAT results, reasoned about as
independent, foreign-university-facing evidence; hazırlık sınıfı presence, treated as
extra language preparation excluded from the diploma score by rule, not a bonus/wasted
year; self-reported `okul birincisi`, always flagged pending evidence.

**Should not care about:** any fabricated/converted GPA; any invented rank/percentile
beyond a self-reported, evidence-pending `okul birincisi`; assuming AP/IB from a school's
reputation; treating LGS/YKS as a proxy for course grades or vice versa; comparing raw
numeric averages across different Turkish schools without adjustment.

## J. Profile data-model implications (grounded against ORYN's actual schema)

A standard MEB-only enrollment fits cleanly into **one `education_records` row**
(`curriculum='turkish_curriculum'`, `stage='high_school'`, `overall_gpa`=diploma notu (or
latest yılsonu başarı puanı if not yet graduated) as a plain 0-100 number,
`gpa_scale=100`). Each course → a `courses` row with `level='regular'` (MEB has **no**
internal honors tier — selectivity lives at the *school* level, not the course level, so
`'regular'` is correct even at a selective Fen Lisesi). `grade_value` (TEXT) holds the
native 0-100 score exactly; `grade_scale='100'`. AP/IB/A-Level courses taken at the same
school map to the **same** education_record's `courses` rows with
`level='ap'`/`'ib_hl'`/`'ib_sl'`/`'a_level'` — correctly representing MEB-as-primary,
foreign-qualification-as-supplementary. LGS/YKS-TYT/YKS-AYT/YKS-YDT/AP/IB/SAT scores all
map cleanly to `test_scores` rows.

**Confirmed gaps, not prescriptions:**
- Nothing flags that a given `overall_gpa` **is** the ministry-computed diploma notu
  (Madde-65 formula) versus a self-reported/partial figure — recommend annotating via
  `notes` until/unless a dedicated status field exists.
- No entity for the intermediate **per-year** yılsonu başarı puanı if `education_records`
  is modeled as one row spanning all 4 years — only the final diploma notu fits
  `overall_gpa` today. If year-by-year trajectory matters to the advisor (plausible), one
  `education_records` row **per grade-year** at the same school is a real design option —
  not something this research prescribes.
- No exact `stage` enum match for `hazırlık sınıfı` (`pre_university` is the closest
  conceptual fit but could be misread).
- No field for `okul birincisi` — likely belongs in ORYN's separate `awards` entity, on
  the same self_reported → evidence_added → verified pipeline as any other award.
- No field for alan/dal / specific programme type — more naturally sourced from ORYN's own
  school registry than duplicated per-student.
- `test_scores`' generic shape comfortably fits LGS/YKS/AP/IB/SAT side by side — no gap
  there.

## Unresolved questions

- Exact current OBP→YKS coefficient (widely reported 0.12) — not independently confirmed
  against ÖSYM's own kılavuzu.
- Whether the lise-level 50-point uniform threshold has since been amended to differ by
  subject (mirroring the 2023-24 ortaokul change) — not found in the regulation version
  retrieved (consolidated through 22/2/2025).
- Real-world frequency/format of informal predicted-grade practice for Turkish students
  applying abroad mid-12th-grade — not verified against an authoritative source.
- Whether any additional MEB yönerge (directive) further modifies scoring mechanics for
  specific school types — not investigated; this covers the general Ortaöğretim Kurumları
  Yönetmeliği only.
- Whether any Türkiye school treats the full IB Diploma Programme itself (not just
  individual courses) as its *primary* credential — a per-school fact for ORYN's existing
  Turkey school registry to resolve, not this system-level research.

## Primary sources

- [MEB Ortaöğretim Kurumları Yönetmeliği](https://tut.meb.gov.tr/meb_iys_dosyalar/2025_03/07084037_mebortaogretimkurumlariyonetmeligi.pdf) — full regulation text, consolidated through RG-22/2/2025-32821; downloaded and parsed directly (article numbers above refer to this text).
- [mevzuat.gov.tr registry entry](https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=18812&MevzuatTur=7&MevzuatTertip=5) — confirms this is the current, correct instrument.
- [MEB ÖDSGM — Liselere Geçiş Sistemi (LGS)](https://odsgm.meb.gov.tr/www/liselere-gecis-sistemi/icerik/1012) — official LGS description.
- [UK ENIC — Statement of Comparability](https://www.enic.org.uk/individuals/statement-of-comparability) — confirms UK's own body does not certify grade-level comparability.
- [University of Leeds Business School — Turkey equivalency page](https://business.leeds.ac.uk/dir-record/lubs-qualifications/554/turkey) — the one narrow, named, purpose-specific conversion example found.
- Secondary/corroborating only: [Hürriyet on the 2007 5-point-scale abolition](https://www.hurriyet.com.tr/gundem/ortaogretimde-5lik-not-sistemi-kaldirildi-5874683); [WES Turkey overview](https://wenr.wes.org/2017/04/education-in-turkey) (dated 2017, pre-2018 exam names, context only); [Işık Üniversitesi OBP explainer](https://aday.isikun.edu.tr/blog/obp-nedir-nasil-hesaplanir-yksye-katkisi-ve-avantajlari) (not ÖSYM-primary).
