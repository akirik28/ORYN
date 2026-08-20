# German Abitur / DSD (Deutsches Sprachdiplom)

Part of ORYN's R2.1 secondary-education-system research package. See
[`README.md`](./README.md) for the cross-system matrix and evidence-based ruleset, and
`data/research/academic-systems/secondary-systems-v1.json` for the machine-readable
version of everything below.

**These are two distinct credentials issued by two distinct authorities — the single
highest-stakes distinction in this whole research package, per the original brief.** Do
not read this document as being about one system.

## A. System identity

- **Abitur (Allgemeine Hochschulreife):** Germany's general higher-education entrance
  qualification, earned via the *gymnasiale Oberstufe* (upper secondary) and the
  *Abiturprüfung*. Education is constitutionally a matter for the 16 individual
  Bundesländer — each state's Kultusministerium sets detailed rules; the
  **Kultusministerkonferenz (KMK)**, the standing conference of state ministers, issues
  nationwide framework agreements to keep the Abitur broadly comparable across states.
  **No single federal ministry "owns" the Abitur.**
- **DSD (Deutsches Sprachdiplom):** a German-as-a-foreign-language proficiency
  certificate — **not the Abitur**. Administered jointly by the **Zentralstelle für das
  Auslandsschulwesen (ZfA)** — part of the German Federal Office of
  Administration/Bundesverwaltungsamt, under the **Auswärtiges Amt** (Federal Foreign
  Office) — in coordination with the KMK's Central DSD Committee. A **different
  institutional pathway**: a foreign-affairs/schools-abroad program, not a domestic
  state-school-leaving qualification.
- **Contexts:** Abitur — Germany (all 16 states) and German schools abroad running a full
  Abitur track (including, per this research, **Deutsche Schule Istanbul**). DSD —
  1,000+ partner schools ("DSD-Schulen") in ~65 countries, including numerous Turkish
  schools (confirmed via the Auswärtiges Amt's own Türkiye-specific page).
- **Qualification types:** Abitur = school-leaving diploma + general higher-education
  entrance qualification. DSD I = language proficiency, CEFR A2-B1. DSD II = CEFR B2-C1.

## B. Native grading model

**Two genuinely separate scales — never treat them as the same system.**

- **Ordinary school grades: 1-6** (1 = *sehr gut*/best, 6 = *ungenügend*/fail) — used
  throughout secondary education generally, below the Oberstufe.
- **Oberstufe/Abiturprüfung: a separate 0-15 point scale ("Notenpunkte")**, uniformly
  KMK-regulated nationwide. Mapping: 15-13 pts = grade 1, 12-10 = grade 2, 9-7 = grade 3,
  6-4 = grade 4, 3-1 = grade 5, 0 = grade 6 (each of the six letter-grade bands further
  subdivided into three point values).
- **Final Abiturnote** (the familiar 1.0-4.0/6.0 scale) is computed from a **weighted
  combination** of accumulated Qualifikationsphase coursework points and Abiturprüfung
  final-exam results. Per a KMK March 2023 press release: **two-thirds** coursework, **one-
  third** exam results (a prior automated PDF-extraction attempt in this session produced
  a conflicting 40/60 figure that could not be verified against readable primary text and
  should be disregarded) — **medium-high confidence**, sourced from a press-release
  summary, not directly-read primary legal text; recommend a follow-up check against the
  KMK's actual *Vereinbarung* text if this ratio becomes product-critical.
- **No authoritative Abitur-to-US-GPA conversion exists.** Do not invent one. Preserve the
  1-6 and 0-15 scales natively — they are not simply linearly interchangeable at the
  granular level (each 1-6 band spans 3 point-values).

## C. Course / qualification structure

- **Leistungskurs (LK) vs. Grundkurs (GK):** advanced/elevated level vs. basic level in
  the Qualifikationsphase — **current terminology as of 2026.** Historically the number of
  required LKs varied by state (commonly 2, sometimes 3-4); a March 2023 KMK reform
  standardizes this nationwide to **2 or 3** (double-weighted if only 2), but only takes
  effect for students entering the Qualifikationsphase in **2027** (first affected Abitur:
  2030) — **the pre-reform, state-variable rules are what's actually in effect today (as
  of August 2026)** for currently-enrolled students.
- **Abiturprüfung:** written exams — increasingly drawn from a shared multi-state common
  item pool (50% for German/Maths/first foreign language since 2023, extended to sciences
  from 2025, improving cross-state comparability) — plus typically an oral component
  (Kolloquium) in at least one subject.
- **DSD structure — not a curriculum or credit system at all.** A stand-alone exam with 4
  equally-weighted components (Reading Comprehension, Listening Comprehension, Written
  Communication, Oral Communication), typically sat after a dedicated *Deutsch als
  Fremdsprache* (DaF) preparatory track, independent of whether the school also offers a
  German Abitur pathway.

### DSD vs. Abitur — the core distinction (high confidence, directly KMK-sourced)

Categorically different credentials, categorically different authorities; **one does not
imply the other.** Per the KMK's own English-language page: DSD I "is considered ... as
proof that the pupil has reached a level of ability in German that is required for entry
to a *Studienkolleg*," and DSD II "serves as proof of the German language proficiency
required for studying at a university in Germany." **Neither statement says DSD confers
the Abitur itself** or any academic secondary-leaving qualification — it proves language
readiness only, most commonly as a prerequisite to pursue German higher education. The
large majority of DSD candidates worldwide (~85,000/year across 65 countries) are at
schools with **no** German Abitur track at all — there, DSD functions like a language
certificate (e.g. TestDaF) alongside a wholly separate local diploma. A student could hold
DSD II *and* a standard Turkish Millî Eğitim diploma with **no** German Abitur involved.

**Turkey-specific nuance found in this research:** some schools run students through
**both** DSD II and a full Abitur or a recognized dual/hybrid pathway toward one —
**Deutsche Schule Istanbul** offers the DSD II exam alongside a separate **"Deutsches
Internationales Abitur" (DIA)**; some Anadolu Lisesi campuses (e.g. **ALKEV, İELEV**) use
**GIB** ("Gemischtsprachiges Internationales Baccalaureat"), a KMK/IB-co-developed
bilingual IB Diploma variant (at least one language course plus subjects like History or
Biology/TOK taught in German) treated as equivalent in effect to an Abitur for German
university access, per school-published descriptions. **GIB/DIA are themselves distinct
from both plain DSD and a plain domestic Abitur** — medium confidence, sourced from
school-published pages (ALKEV/İELEV/Deutsche Schule Istanbul) rather than a primary
KMK/Turkish MEB regulatory document; the core fact that they're distinct from plain DSD is
well corroborated, but exact formal-recognition status is not.

**A record showing "DSD II" alone means language proficiency only. A record showing "DSD
II + Abitur" or "DSD II + DIA" or "GIB Diploma" means a materially stronger, different
outcome — never treat these as interchangeable.**

## D. Academic rigor signals

**Primary signal:** which subjects a student chose as Leistungskurse relative to their
intended field — functionally analogous to spécialité choice in France or HL choice in
IB. **Secondary signal:** overall Abiturnote as a compressed native summary, always on its
native scale. No ORYN-internal rigor score proposed — a DSD level is an independent
language-proficiency data point, never merged into an academic-rigor score.

## E. Predicted grades

**No formal predicted-grade concept for German university admission itself** — German
public universities generally will not admit on predicted results; they expect the actual
Abiturzeugnis. Some limited conditional-admission provisions exist mainly for applicants
whose home-country diploma is academically shorter than the German 13-year track — a
different mechanism from a UK-style predicted offer. When Abitur students apply **outside**
Germany (UK/US, whose deadlines precede Abitur results), their school will informally
supply an estimated grade for that specific foreign application — an accommodation for the
receiving country's process, structurally parallel to the confirmed French finding
(medium confidence — general secondary discussion, not a primary KMK/university-consortium
document).

## F. Class rank

**Generally not a feature of German school culture or reporting** — no authoritative
source found stating German schools compute or publish a "Klassenrangliste" as a standard
element; general grading-culture sources describe individually norm-referenced grading
against fixed standards, not peer-ranking. A genuine, expected cross-cultural difference
from the US pattern — report honestly as "generally absent" rather than forced to fit a
US-style expectation (medium confidence — an absence-of-evidence finding, not an explicit
"prohibited" statement; individual schools could theoretically vary). **Never infer or
fabricate a German student's class rank** — its absence is normal/expected here, not a
data gap to fill.

## G. Standardized / external assessment

The **Abiturprüfung** is the external/standardized assessment — increasingly drawn from a
shared multi-state item pool (see C) plus an oral component. The **DSD exam is a
completely separate** external assessment (ZfA-appointed examiners, not classroom
teachers) measuring language proficiency only, not part of the Abiturprüfung even at
schools offering both.

## H. Unsafe inferences

- **Do NOT equate DSD (any level) with a German Abitur** — DSD certifies language
  proficiency only, issued by a different authority than the state Kultusministerien that
  issue the Abitur, and most DSD holders worldwide never earn an Abitur.
- Do not assume a school being "DSD-authorized" or a "Deutsche Schule" means a given
  student's diploma is a German Abitur — check what the individual student's record
  actually states (DSD only / DSD+Abitur / DSD+DIA / GIB Diploma / a plain Turkish
  diploma with a German elective, etc.), never infer from school name/reputation.
- Do not cross-convert the 1-6 or 0-15 scales into a US 4.0 GPA.
- Do not assume the pre-2023-reform LK/GK rules (what's actually in effect today) are
  already replaced — the new rules only bind cohorts entering the Qualifikationsphase in
  2027+.
- Do not infer or fabricate class rank — its typical absence reflects the system's
  culture, not missing data.
- Do not assume GIB is identical to either a plain IB Diploma or a plain German Abitur —
  treat as its own distinct hybrid credential pending primary-source confirmation.

## I. Counselor interpretation

**Should care about:** which Leistungskurse the student chose, relative to intended
field; the final Abiturnote on its native scale; a DSD level (I or II) as an independent,
genuinely useful language-readiness signal — reported and reasoned about **separately**
from academic/curriculum strength, never merged into one score; whether a student's
specific pathway is DSD-only, DSD+Abitur, DSD+DIA, or GIB Diploma, since these are
materially different outcomes.

**Should not do:** treat a DSD credential (any level) as equivalent to fluency-plus-
Abitur or as proof of a completed German secondary academic qualification; fabricate a GPA
conversion for either German scale; assume or infer class rank; assume a school's general
German-partnership reputation tells you an individual student's actual credential.

## J. Profile data-model implications (grounded against ORYN's actual schema)

`education_records.curriculum` has no `german_abitur` value — a plain Abitur record
currently falls into `'national_curriculum'` (reasonable — Germany has a state-coordinated,
KMK-harmonized national-level qualification even though administration is state-level) or
`'other'`, with "Abitur, Leistungskurse: X, Y" only in free-text `notes`.
`overall_gpa`/`gpa_scale` should hold the native Abiturnote with **one** native
representation chosen and documented consistently — not mixing the 1-6 and 0-15 scales
into the same field, since they are not simply linearly interchangeable at the granular
level. `courses.level` has no `leistungskurs`/`grundkurs` distinction — the closest
existing value ("honors") is a US-culture-specific label that doesn't map cleanly onto
German terminology and could mislead a counselor scanning course levels.

**DSD fit assessment — a genuinely good match already exists:** DSD does **not** belong in
`education_records` or as a `curriculum` value — it's not a curriculum, it's a proficiency
exam. `test_scores` is a strong fit: `test_name='DSD I'`/`'DSD II'`, `score`=the CEFR level
attained (e.g. "B1" or "B2/C1"), and **`subscores` (jsonb) cleanly holds the DSD's own 4
equally-weighted components** (e.g. `{"reading":"B1","listening":"B1","writing":"A2",
"speaking":"B1"}`), which maps naturally onto the DSD's actual structure. `test_date` = the
sitting date. A weaker alternative (a `courses` row with a CEFR-level `grade_value`) loses
the exam's external/standardized nature and is not recommended.

**Confirmed gaps:**
- No `german_abitur` curriculum value — indistinguishable from any other country's
  `national_curriculum` entry without free-text notes.
- No enum value distinguishing Leistungskurs from Grundkurs.
- No structured field to distinguish DSD-only vs. DSD+Abitur vs. DSD+DIA vs. GIB-Diploma
  pathways — since these are materially different outcomes and a school-registry lookup
  alone can't disambiguate them, this is a real interpretive risk if advisor logic ever
  tries to infer academic strength purely from "has a DSD record" without checking whether
  a corresponding Abitur/DIA/GIB `education_record` also exists for the same student.

## Unresolved questions

- Exact primary-source text of the KMK's two-thirds/one-third Gesamtqualifikation formula
  — could not be directly read this session (PDF-fetch limitation); sourced from a KMK
  press-release summary.
- Precise current (pre-2027-reform) number of required Leistungskurse in each of the 16
  Bundesländer — not enumerated state-by-state; only the general pattern and the 2027
  standardization plan confirmed.
- GIB's exact formal recognition status relative to the standard Abitur — sourced only
  from school-published pages, not a primary KMK/Turkish MEB document; recommend a
  dedicated follow-up if ORYN's Turkey school registry needs to certify GIB-Abitur-
  equivalence claims precisely.
- Whether German schools ever publish an informal internal rank (distinct from an official
  Klassenrangliste) — not exhaustively verified; the finding is "not a standard/expected
  feature," not "proven never to occur."

## Primary / corroborating sources

KMK's own English-language DSD page (core DSD≠Abitur distinction, directly sourced) — high
confidence. KMK March 2023 press release (Gesamtqualifikation split, LK/GK 2027 reform) —
press-release-summary sourced, not primary legal text. School-published pages (Deutsche
Schule Istanbul, ALKEV, İELEV) for the Turkey-specific DIA/GIB nuance — medium confidence,
recommend primary-source follow-up if this becomes product-critical.
