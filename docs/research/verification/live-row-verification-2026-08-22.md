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
