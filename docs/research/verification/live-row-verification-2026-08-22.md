# Live row verification — 2026-08-22

Independent verification of the 2026-08-21 19:xx UTC ingest (1,170 `university_requirements`
rows + 370 `university_deadlines` rows, project `oryn-qa-scratch`) against the universities'
own live pages. No database writes were made; findings are recorded here only.

**Method.** Deliberate (not random) sample of ~55 rows weighted toward: rows a student
would act on (English thresholds, marquee deadlines), rows carrying an `evaluation_gate`,
and ≥5 `recurring_annual_undated` deadline rows where the specific claim is that the source
publishes a day+month with no year. For each row: fetch the stored `source_url`, compare the
live page against the stored text, record a verdict.

**Verdicts.**
- `VERIFIED` — the live page says what the row says.
- `CHANGED_SINCE` — the page has changed since retrieval; row was true at ingest.
- `SOURCE_UNREACHABLE` — the stored source URL could not be fetched.
- `MISMATCH` — the live page contradicts the row (or the row misleads by omission).

Status: IN PROGRESS — batches appended below as they are verified.

---

## Batch 1 — Turkey (METU, Hacettepe): 14 rows, 14 VERIFIED

### METU — HTML pages (fetched live 2026-08-22)

| Row | Claim | Verdict |
|---|---|---|
| `5663f898` english_proficiency | "IELTS exams taken on or after the 24th of December 2022 will not be anymore accepted" — gate `inverted_recency`, `recency_rule {not_valid_on_or_after, 2022-12-24}`, `is_exclusion=true` | **VERIFIED** — live page carries the sentence verbatim; the inverted direction survived ingestion intact. A naive "more recent = better" reading would be wrong, and the row correctly encodes the inversion. |
| `f4c56ed8` international_requirement | TR-YÖS/SAT/QUDURAT/TQDK valid two years; diplomas valid with any date | **VERIFIED** — verbatim on /en/application-requirements. |
| `97802ad4` supplemental_requirement | Minimums do not guarantee admission; holistic evaluation | **VERIFIED** — verbatim. |
| `2d688d87` deadline (international) | Application window opens 16:00 1 June, closes 23:59 12 July 2026 | **VERIFIED** — verbatim on /en/application-dates. |

### METU — requirements PDF (`odtu_iso_requirements.pdf`)

PDF `CreationDate: 2024-01-09`. **Freshness caveat:** the document METU currently serves
is 2.5 years old; the rows carry `data_confidence: high`, which is defensible (METU still
links it as current) but the underlying document predates two admission cycles.

| Row | Claim | Verdict |
|---|---|---|
| `188bad10` | SAT I min 1200, Math 700/800 for Engineering/Architecture/scientific programs | **VERIFIED** |
| `1db285d3` | A Levels ABB, two relevant subjects, non-English language subjects excluded | **VERIFIED** |
| `f9f5e200` | IB Diploma min 33, one relevant HL | **VERIFIED** |
| `56a1a5e3` | TR-YÖS first 5th percentile (gate `incomparable_scale`) | **VERIFIED** — the gate is right: this is a percentile rule, not comparable to Hacettepe's 400/500 points rule. |
| `fc6b3755` | 90% in Baccalaureate/Matura-type certificate | **VERIFIED** |
| `200e015b` | Türkiye/TRNC national-curriculum diplomas not covered in Category C | **VERIFIED** |

### Hacettepe — application directive PDF (`Ogrenciyurtdisindanbasvurukayit230525.pdf`)

PDF `CreationDate: 2025-03-27` — current directive.

| Row | Claim | Verdict |
|---|---|---|
| `0bbd65d1` | TR-YÖS: min 400 out of 500 | **VERIFIED** — with a scope nuance: the PDF's table has a second column for special-talent-exam programs where the floor is 300/500. The row states the general rule only; not misleading for regular programs, but a `scope` qualifier would be more faithful. |
| `0ffa8edd` | GCE A Level: average ≥ C; 3 A Levels or 2 A Levels + 1 AS in relevant subjects | **VERIFIED** — same nuance (special-talent column relaxes "relevant subjects" to "any 3 subjects"). |
| `e404902c` | Quota weighting TR-YÖS 60% / SAT 30% / GCE A Level 10% | **VERIFIED** — verbatim (Madde 9). |
| `21199fdc` | Accepted exams valid two years from exam date; diploma scores unlimited | **VERIFIED** — verbatim. |

Also spot-confirmed in the same PDF: the mavi-kart exclusion (`cb5d45be`), the
invalid-application rule (`6b0c4bd5`), the max-3-preferences rule (`74a6ef2e`), and the
no-language-certificate-at-application rule (`bb33e1f5`). All present.

---

## Batch 2 — University of Edinburgh (CS entry requirements): 11 rows — 1 MISMATCH (omission), 4 provenance defects, content otherwise verified

Live page fetched 2026-08-22: `study.ed.ac.uk/programmes/undergraduate/57-computer-science/entry-requirements`.

### Finding 1 — MISMATCH by omission: the One Skill Retake refusal is still missing

The live page says, in the English language requirements section, immediately adjacent to
the IELTS threshold:

> "We do not accept IELTS One Skill Retake to meet our English language requirements."

**None of Edinburgh's 12 live rows carry this sentence** — not as a standalone exclusion
row, not as a qualifier on the IELTS row (`a97ec7c8`, "IELTS Academic: total 6.5 with at
least 5.5 in each component", `evaluation_gate: null`, `is_exclusion: false`). The prior
audit pass found the refusal sentence was dropped by the corpus's own supersession chain;
this check confirms the omission shipped to the live table.

**Would a student be misled? Yes.** A student holding an IELTS One Skill Retake result of
6.5 would read Oryn's row and conclude they meet Edinburgh's requirement; Edinburgh would
refuse the certificate. The risk is sharpened by contrast: TU Delft's row (`38e85e0c`)
explicitly says "IELTS One Skill Retake will be accepted" — so the product affirms OSR
where it is accepted and is silent where it is refused, and silence reads as "no
restriction."

### Finding 2 — provenance defect on four English rows

Rows `a97ec7c8` (IELTS 6.5/5.5), `9ec26dfa` (CAE/CPE 176/162), `4564db58` (TOEFL before
2026-01-21: 92/20), `adf9f150` (TOEFL from 2026-01-21: 4.5/4.0) all store
`source_url = https://www.ets.org/toefl/institutions/ibt/score-scale-update.html`.
That ETS page describes the TOEFL score-scale change; it does not state Edinburgh's
requirements. The row *content* matches Edinburgh's own page exactly, but "View source"
would take a student to a page that does not support the claim. Requirement rows must cite
the university's page (spec Phase 36/71).

### Row-level results

| Row | Claim | Verdict |
|---|---|---|
| `a97ec7c8` | IELTS Academic 6.5, min 5.5 each | **VERIFIED** (content) — but see Findings 1 and 2. |
| `4564db58` | TOEFL iBT before 21 Jan 2026: 92, min 20 each | **VERIFIED** (content); wrong source_url. |
| `adf9f150` | TOEFL iBT from 21 Jan 2026: 4.5, min 4.0 each (new ETS band scale) | **VERIFIED** (content); wrong source_url. |
| `9ec26dfa` | CAE/CPE total 176, min 162 each | **VERIFIED** (content); wrong source_url. |
| `82ccbc37` | English tests max two years old from programme start | **VERIFIED** — verbatim on the Edinburgh page. |
| `4495e06f` | Mathematics quals max two academic years before entry | **VERIFIED** — verbatim. |
| `f3c0d581` | SQA AAAAA (by end of S5 preferred) | **VERIFIED**. |
| `702d99f2` | SQA AABB by end of S6 | **VERIFIED** — page lists it under widening-access; row does not mark that scope (minor). |
| `15468d62` | Mathematics at A | **VERIFIED** as page fragment — page distinguishes Higher vs A Level contexts; the row stores no qualification level (precision caveat). |
| `2c7fa3b8` | English at C | **VERIFIED** as page fragment — on the page this is a National 5 / GCSE requirement; a bare "English at C" could be misread as Higher/A Level English (precision caveat). |
| `641108db` | IB SL English 5; ab initio not accepted | **VERIFIED**. |

---
