# French Baccalauréat

Part of ORYN's R2.1 secondary-education-system research package. See
[`README.md`](./README.md) for the cross-system matrix and evidence-based ruleset, and
`data/research/academic-systems/secondary-systems-v1.json` for the machine-readable
version of everything below.

Focuses on the **Baccalauréat Général** (the track relevant to competitive-university-
bound students; Baccalauréat Technologique and Professionnel tracks also exist but are
out of scope here). `education.gouv.fr`/`eduscol.education.gouv.fr` blocked direct fetch
(HTTP 403) this session — facts below are corroborated across multiple independent
secondary sources that explicitly cite the Ministry's own published coefficient tables,
plus confirmation the Ministry's own relevant page exists via search indexing. Confidence:
high, but secondary-source-corroborated rather than directly fetched.

## A. System identity

- **Owner/authority:** Ministère de l'Éducation nationale, via its DGESCO and éduscol. A
  single **national state exam** (`diplôme national`) — not administered by individual
  schools or private boards.
- **Contexts:** Metropolitan France and overseas territories, the French lycée network
  abroad (AEFE-accredited schools, including some in Türkiye — whether they run an
  identical spécialité list/coefficients to metropolitan France was **not verified** this
  session), and homeschooled/individual candidates (`candidats libres`) sitting the same
  national exam.
- **Qualification type:** Simultaneously a secondary school-leaving diploma **and** the
  standard gateway credential to French higher education.

## B. Native grading model

- **Scale: 0-20** (the standard French academic convention throughout primary, secondary,
  and higher education — not Bac-specific, but what the Bac uses).
- **Passing threshold:** 10/20 overall average.
- **Mention thresholds:** 10.00-11.99 = pass, no mention; 12.00-13.99 = *Assez Bien*;
  14.00-15.99 = *Bien*; 16.00-20 = *Très Bien* (a discretionary *"avec félicitations du
  jury"* sub-mention exists for the highest results, typically ≥18 — exact wording not
  independently verified against a primary Ministry document, medium confidence on that
  specific detail).
- **No authoritative conversion to a US-style 4.0 GPA exists.** Unofficial tables (e.g.
  GPA-converter marketing sites) are not authoritative and must not be treated as ground
  truth.

## C. Course / qualification structure

**Current structure, effective since the 2021 exam session** (reform announced 2018,
phased in from students entering *première* September 2019) — the **old filière S/ES/L
system was abolished and must never be described as current.**

- **Tronc commun (common core):** Français (via *épreuves anticipées de français*,
  written + oral, end of *première*), Histoire-Géographie, Langue Vivante A & B,
  Enseignement scientifique, EPS, Enseignement moral et civique, and Philosophie
  (*terminale* only, national written exam in June).
- **Spécialités:** students choose **3** (4h/week each) at the start of *première* from a
  Ministry-defined list (Mathématiques, Physique-Chimie, SVT, SES, HGGSP, Humanités/
  Littérature/Philosophie, Langues/Littératures/Cultures étrangères, Numérique et sciences
  informatiques, Arts, others depending on the lycée). One is dropped at end of
  *première*; the remaining **2** continue through *terminale* (6h/week each), examined
  via written national exams in **March** of *terminale*.
- **Grand oral:** a *terminale* oral exam (2021-reform addition) where the student
  presents/defends a project tied to their retained spécialités, before a jury.
- **Overall grade = 40% contrôle continu** (bulletin/livret-scolaire average across
  *première*/*terminale* — not standardized common tests; the 2019-2021 "E3C"
  standardized-common-test model was abandoned in favor of straight bulletin averages from
  session 2022) **+ 60% épreuves terminales** (French written+oral, philosophy, the two
  spécialité exams, grand oral).
- **Coefficients confirmed:** philosophie = 8; grand oral = 10 through session 2026,
  changing to 8 from session 2027 (alongside a new anticipated maths exam, coefficient 2,
  for students not taking a maths-related spécialité) — **medium confidence**, re-verify
  against the Ministry's session-specific table before relying on this for a 2027+ cohort.

## D. Academic rigor signals

**Primary signal:** spécialité choice relative to the student's intended field — e.g. an
engineering-bound student typically retains Mathématiques + Physique-Chimie; an economics/
social-science-bound student typically retains SES + Mathématiques or HGGSP. **Secondary
signal:** spécialité exam performance (externally graded, weighted heavily in épreuves
terminales) is a stronger rigor signal than contrôle continu bulletin averages alone,
since the latter is teacher-graded. No ORYN-internal numeric rigor score is proposed —
only which native signals matter.

## E. Predicted grades

**No formal, UK-style predicted-grade concept exists domestically.** Verified: Parcoursup
(the French university admissions platform) does not ask for or generate numeric predicted
final grades. It uses the **livret scolaire** (actual première/terminale bulletin grades,
including already-sat Bac component grades) plus a qualitative **Fiche Avenir** — the
lycée's class-council opinion on likely success in higher education, on a qualitative
4-point scale (*très favorable / favorable / assez favorable / réservé*), **not** a
numeric prediction. When French Bac students apply outside France (UK, US) before final
results are known, their lycée may informally supply an estimated grade for that specific
foreign application — an ad hoc accommodation for the receiving country's process, not a
formal Bac-system feature (this specific caveat reasoned by analogy to the confirmed German
pattern, medium confidence — not directly French-sourced).

## F. Class rank

**Not formally Ministry-mandated** as part of the diploma or national transcript, but
per-subject rank-in-class is commonly auto-generated and displayed on bulletins by school
software (e.g. Pronote), and some lycées surface it, including in connection with
Parcoursup dossiers — inconsistent, school-dependent, not a uniform national practice
(medium-confidence, sourced from teacher-forum/software-documentation discussion, not a
Ministry policy statement). **Never infer or fabricate a French student's class rank from
grades alone.** If "rang" isn't present, treat as unknown — not absent-therefore-
irrelevant, and not computable from a GPA-equivalent.

## G. Standardized / external assessment

The Bac exams themselves (spécialité writtens in March, French EAF end of première,
philosophy + grand oral in June of terminale) **are** the primary external assessment —
no separate national school-leaving test exists apart from the Bac. Some students
additionally sit TOEFL/IELTS or the SAT (for US applications) — optional, unrelated to the
Bac itself.

## H. Unsafe inferences

- Do not cross-convert a 0-20 average or bulletin grade into a US 4.0 GPA — no
  authoritative source supports one; only unofficial marketing-site tables exist.
- Do not assume a mention (Assez Bien/Bien/Très Bien) maps to a specific US GPA band —
  French grading is famously stringent; a 14/20 "Bien" reflects strong performance despite
  being 70% numerically.
- Do not assume a missing class rank means the school doesn't track it, and don't assume
  its absence means nothing either — treat as genuinely unknown unless present in source
  data.
- Do not treat the Fiche Avenir's qualitative opinion as a numeric predicted grade — a
  categorically different kind of information.
- Do not describe the pre-2019 filière S/ES/L system as current — replaced starting the
  2021 session.
- Do not assume every French secondary student abroad (AEFE lycées, including in Türkiye)
  follows an identical local implementation — verify which Bac track and spécialités a
  given school actually offers.

## I. Counselor interpretation

**Should care about:** which 2 spécialités the student retained through *terminale* and
alignment with their stated target field; spécialité exam results specifically
(externally graded, higher-signal than contrôle continu); the mention achieved, reported
as-is on its native scale, never converted; the qualitative Fiche Avenir/class-council
language if present, as native-context reference, not a number.

**Should not do:** fabricate a GPA-equivalent for the Bac average; assume or compute a
class rank when not explicitly present; treat contrôle continu averages as equivalent in
signal-strength to externally-graded spécialité exams; assume UK-style predicted grades
exist for Parcoursup admissions.

## J. Profile data-model implications (grounded against ORYN's actual schema)

`education_records.curriculum` has no `french_baccalaureate` value — a Bac record must
currently fall into `'national_curriculum'` (semantically the closest fit — France
genuinely has one unified national curriculum/exam, unlike the US), with "Baccalauréat
Général, spécialités: X, Y" detail placed in `notes` (free text). `overall_gpa`/
`gpa_scale` should either stay null (correctly reflecting no GPA concept exists) or, if
used, `gpa_scale=20` with `overall_gpa` as the native average — never coerced to 4.0,
consistent with ORYN's existing no-cross-conversion rule. `courses.grade_scale` (TEXT)
suits a native "/20" per course well.

**Confirmed gaps:**
- No explicit `french_baccalaureate` curriculum value — currently indistinguishable from
  any other country's generic `national_curriculum` entry without reading free-text notes.
- No `spécialité` (or generic "advanced/highest-track") value in `courses.level`, so a
  student's 2 retained spécialités can't be structurally distinguished from a regular
  tronc-commun course without notes — roughly analogous in significance to an AP/IB HL
  course, but the enum doesn't capture that equivalence.
- No field to record the "mention" as a distinct structured native-scale achievement
  separate from `overall_gpa` — currently would have to live in `notes` or be
  approximated numerically, risking conflation with a GPA-like number.

## Unresolved questions

- Exact wording/threshold for "mention Très Bien avec félicitations du jury" — not
  independently verified against a primary Ministry document.
- Whether the grand oral coefficient change to 8 (session 2027) and the new anticipated
  maths exam are finalized policy or still a proposal — re-check closer to that session.
- Whether AEFE lycées abroad (including any in Türkiye) implement the identical spécialité
  list/coefficients as metropolitan France, or a locally adapted subset — not verified.

## Primary / corroborating sources

`education.gouv.fr`/`eduscol.education.gouv.fr` blocked direct fetch this session (HTTP
403); facts above are corroborated across independent secondary sources that explicitly
cite/quote the Ministry's own published tables (L'Étudiant, digiSchool, Cours Legendre,
Capitaine Study), plus confirmation the Ministry's own "Comment calculer votre note au
baccalauréat" page exists via search indexing. Recommend a follow-up direct-fetch pass
against education.gouv.fr/eduscol before treating exact coefficient figures as
verbatim-quotable in product copy.
